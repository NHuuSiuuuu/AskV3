const { pool } = require("../pool");
import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { z } from "zod";
import { createDocumentSchema } from "../validators/documentValidators";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { PDFParse } from "pdf-parse";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import mammoth from "mammoth";

module.exports.create = async (req: Request, res: Response) => {
  let documentId: number | undefined;
  let client: PoolClient | undefined;

  try {
    // Bước 1: Kiểm tra các trường Text gửi từ form-data bằng Zod.
    const validation = createDocumentSchema.safeParse(req.body);
    if (validation.success === false) {
      return res.status(400).json({
        message: "Dữ liệu tài liệu không hợp lệ.",
        errors: z.flattenError(validation.error),
      });
    }
    const { title, docType, uploaded_by, issuedDate } = validation.data;
    const file = req.file; // Multer nhận file ở trường filePath.
    if (!file) {
      return res
        .status(400)
        .json({ message: "Hãy gửi file trong trường filePath." });
    }

    // Bước 2: Đọc nội dung file.

    // Document này chứa văn bản + metadata, khác với bản ghi bảng documents.
    const docs: Document[] = [];
    const extension = path.extname(file.originalname).toLowerCase();
    if (extension === ".pdf") {
      // Nhận dữ liệu và đọc nội dung
      const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
      try {
        const info = await parser.getInfo(); // lấy thông tin pdf, số trang

        if (info.total > Number(process.env.MAX_PDF_PAGES || 200)) {
          // Kiểm tra tổng số trang
          return res
            .status(400)
            .json({ message: "PDF vượt quá số trang cho phép." });
        }
        const pdf = await parser.getText();
        for (const page of pdf.pages) {
          if (page.text.trim()) {
            // kiểm tra xem trang có text không, nếu có thì mới push
            docs.push(
              new Document({
                pageContent: page.text,
                metadata: { page: page.num },
              }),
            );
          }
        }
        // console.log("docs:", docs);
      } catch {
        return res
          .status(400)
          .json({ message: "Không đọc được nội dung PDF." });
      } finally {
        await parser.destroy(); // Giải phóng bộ nhớ của bộ đọc PDF.
      }
    } else if (extension === ".txt") {
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(file.buffer);
      } catch {
        return res
          .status(400)
          .json({ message: "File TXT phải dùng mã hóa UTF-8." });
      }
      docs.push(new Document({ pageContent: text, metadata: { page: null } }));
    } else if (extension === ".docx") {
      const parser = await mammoth.extractRawText({ buffer: file.buffer });
      const text = parser.value.trim();
      if (!text) {
        return res.status(400).json({
          message: "Không tìm thấy nội dung văn bản trong file DOCX.",
        });
      }
      docs.push(
        new Document({
          pageContent: text,
          metadata: { page: null },
        }),
      );
    } else {
      return res
        .status(400)
        .json({ message: "Hiện chỉ hỗ trợ file PDF/.TXT/.docx" });
    }

    // Bước 3: Chia văn bản thành chunk.
    // Ví dụ: chunk dài tối đa 2000 ký tự, lặp lại khoảng 300 ký tự với đoạn trước.
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: Number(process.env.CHUNK_SIZE_CHARS || 1000),
      chunkOverlap: Number(process.env.CHUNK_OVERLAP_CHARS || 120), //Overlap giúp giữ ngữ cảnh giữa hai đoạn.
    });
    const chunks = (await splitter.splitDocuments(docs)).filter((chunk) =>
      chunk.pageContent.trim(),
    );
    if (chunks.length === 0) {
      return res.status(400).json({
        message:
          "Không tìm thấy văn bản. PDF scan cần OCR trước khi tạo vector.",
      });
    }

    // Bước 4: Lưu file thật xuống ổ đĩa và tạo bản ghi documents.
    // file_path lưu đường dẫn dạng chuỗi, không lưu toàn bộ object req.file.
    const uploadDirectory = path.resolve(
      process.env.UPLOAD_DIR || "./storage/documents",
    );
    await mkdir(uploadDirectory, { recursive: true });
    const filePath = path.join(uploadDirectory, randomUUID() + extension);
    await writeFile(filePath, file.buffer, { flag: "wx" });
    try {
      const created = await pool.query(
        `INSERT INTO documents
      (title, doc_type, issued_date, status, file_path, uploaded_by)
     VALUES ($1, $2, $3, 'processing', $4, $5)
     RETURNING *`,
        [title, docType, issuedDate, filePath, uploaded_by],
      );

      documentId = created.rows[0].id;

      // console.log("documentId:", documentId);
    } catch (error) {
      console.error("LỖI INSERT:", error);

      return res.status(500).json({
        message: "Insert document thất bại",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Bước 4: Chuyển nội dung từng chunk thành vector

    // Bộ sinh embedding
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
      apiKey: process.env.GEMINI_API_KEY,
      outputDimensionality: 768,
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });

    const vectors: number[][] = []; // tạo mảng rỗng chứa toàn bộ vector

    // xử lý chunk theo từng nhóm 20 cái tránh gửi nhiều lên
    for (let i = 0; i < chunks.length; i += 20) {
      const batch = chunks.slice(i, i + 20);

      const batchVectors = await embeddings.embedDocuments(
        batch.map((chunk) => chunk.pageContent),
      );

      vectors.push(...batchVectors);
    }

    // console.log("Tổng chunk:", chunks.length);
    // console.log("Tổng vector:", vectors.length);
    // console.log("Số chiều vector:", vectors[0]?.length);
    // let index = 0
    // console.log("chunks[index].pageContent:", chunks[index]);

    // Bước 6: Lưu các chunk và vector trong cùng một transaction.
    // Nếu một INSERT lỗi, ROLLBACK sẽ tránh lưu thiếu một phần tài liệu.
    client = await pool.connect();
    await client.query("BEGIN");
    for (let index = 0; index < chunks.length; index++) {
      await client.query(
        "INSERT INTO chunks (document_id, chunk_index, content, page, embedding) VALUES ($1, $2, $3, $4, $5::vector)",
        [
          documentId,
          index,
          chunks[index].pageContent,
          chunks[index].metadata.page,
          JSON.stringify(vectors[index]),
        ],
      );
    }

    // Bước 7: Chỉ chuyển sang active khi tất cả chunk/vector đã lưu thành công.
    const updated = await client.query(
      "UPDATE documents SET status = 'active', error_message = NULL, updated_at = NOW() WHERE id = $1 RETURNING *",
      [documentId],
    );
    await client.query("COMMIT");
    client.release();
    client = undefined;
    return res.status(201).json({
      data: updated.rows[0],
      status: updated.rows[0].status,
      chunkCount: chunks.length,
    });
  } catch (error) {
    // Hoàn tác chunk đang lưu nếu có lỗi trong transaction.
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        console.error("Không rollback được transaction.");
      } finally {
        client.release();
      }
    }
    const message =
      "Không xử lý được tài liệu. Kiểm tra Gemini API và database.";

    // Nếu đã insert vào bảng document và có id rồi thì chuyển status bản ghi thành thất bại
    if (documentId !== undefined) {
      // Giữ lại tài liệu để biết lần xử lý này thất bại.
      await pool
        .query(
          "UPDATE documents SET status = 'failed', error_message = $2, updated_at = NOW() WHERE id = $1",
          [documentId, message],
        )
        .catch(() => console.error("Không cập nhật được trạng thái failed."));
    }
    return res.status(500).json({ message, documentId });
  }
};

// Lấy danh sách tài liệu cho admin
module.exports.list = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `
      SELECT id, title, doc_type, issued_date, status, error_message, uploaded_by, created_at, updated_at
      FROM documents
      ORDER BY created_at DESC
      `,
    );

    return res.status(200).json({
      data: result.rows,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách tài liệu:", error);
    return res.status(500).json({
      message: "Không lấy được danh sách tài liệu.",
    });
  }
};

// Xóa tài liệu
module.exports.deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "ID tài liệu là bắt buộc." });
    }

    await pool.query("DELETE FROM chunks WHERE document_id = $1", [id]);
    const deleted = await pool.query(
      "DELETE FROM documents WHERE id = $1 RETURNING *",
      [id],
    );

    if (deleted.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy tài liệu để xóa." });
    }

    return res.status(200).json({
      message: "Đã xóa tài liệu thành công.",
      id: Number(id),
    });
  } catch (error) {
    console.error("Lỗi xóa tài liệu:", error);
    return res.status(500).json({ message: "Không xóa được tài liệu." });
  }
};

// Xem / tải file tài liệu
module.exports.getFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT file_path, title FROM documents WHERE id = $1",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy tài liệu." });
    }
    const doc = result.rows[0];
    const absolutePath = path.resolve(doc.file_path);

    // Gửi file tài liệu đến client
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error("Lỗi tải file tài liệu:", error);
    return res.status(500).json({ message: "Không tải được file tài liệu." });
  }
};

