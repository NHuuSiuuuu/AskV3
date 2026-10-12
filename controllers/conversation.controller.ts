const { pool } = require("../pool");
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import type { Request, Response } from "express";
import { TaskType } from "@google/generative-ai";

module.exports.createConversation = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    console.log("sessionId", sessionId);
    if (!sessionId) {
      return res.status(400).json({
        message: "sessionId là bắt buộc.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO conversations (session_id)
      VALUES ($1)
      RETURNING *
      `,
      [sessionId],
    );

    return res.status(201).json({
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Lỗi tạo conversation:", error);

    return res.status(500).json({
      message: "Không tạo được cuộc trò chuyện.",
    });
  }
};

module.exports.chat = async (req: Request, res: Response) => {
  // Bộ tạo embedding
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
    apiKey: process.env.GEMINI_API_KEY,
    outputDimensionality: 768,
    taskType: TaskType.RETRIEVAL_QUERY,
  });

  // Bộ tạo chat Gemini
  const model = new ChatGoogleGenerativeAI({
    model: process.env.GEMINI_CHAT_MODEL || "gemini-3.8-flash",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.2,
  });

  try {
    const { conversationId } = req.params;
    const { question } = req.body;
    console.log("conversationId", conversationId);

    // Bước 1: Validate dữ liệu đầu vào
    if (!conversationId) {
      return res.status(400).json({
        message: "conversationId là bắt buộc.",
      });
    }

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        message: "question là bắt buộc.",
      });
    }

    // Bước 2: Kiểm tra conversation có tồn tại không
    const conversationResult = await pool.query(
      `
      SELECT id, session_id
      FROM conversations
      WHERE id = $1
      `,
      [conversationId],
    );
    if (conversationResult.rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy cuộc trò chuyện.",
      });
    }

    // Bước 3: Lưu câu hỏi của user vào bảng messages
    const cleanQuestion = question.trim();
    await pool.query(
      `
      INSERT INTO messages
        (conversation_id, role, content)
      VALUES
        ($1, 'user', $2)
      `,
      [conversationId, cleanQuestion],
    );

    // Bước 4: Lấy lịch sử chat gần nhất
    const historyResult = await pool.query(
      `
      SELECT role, content
      FROM (
        SELECT
          id,
          role,
          content,
          created_at
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 10
      ) AS recent_messages
      ORDER BY created_at ASC, id ASC
      `,
      [conversationId],
    );

    const historyText = historyResult.rows
      .map((message: { role: string; content: string }) => {
        if (message.role === "user") {
          return `Người dùng: ${message.content}`;
        } else {
          return `Trợ lý: ${message.content}`;
        }
      })
      .join("\n");
    // Tạo embedding cho câu hỏi hiện tại
    const queryVector = await embeddings.embedQuery(cleanQuestion);
    if (queryVector.length !== 768) {
      throw new Error("Vector câu hỏi không đúng 768 chiều.");
    }
    // console.log("queryVector", queryVector);

    // Bước 6: semantic search (tìm mục tiêu theo ngữ nghĩa) theo kỹ thuật vector search
    const semanticResult = await pool.query(
      `
      SELECT
        c.id,
        c.document_id,
        c.content,
        c.page,
        d.title,
        d.doc_type,
        d.issued_date,
        1 - (c.embedding <=> $1::vector) AS similarity
      FROM chunks c
      JOIN documents d
        ON d.id = c.document_id
      WHERE d.status = 'active'
      ORDER BY c.embedding <=> $1::vector
      LIMIT 10
      `,
      [JSON.stringify(queryVector)],
    );

    const semanticChunks = semanticResult.rows;

    // Bước 6.1 retrieved bằng full text search
    // Tạo tsquery
    const keywordQueryResult = await pool.query(
      `
      SELECT replace(
        plainto_tsquery('simple', $1)::text,
        ' & ',
        ' | '
      )::tsquery AS query
  `,
      [cleanQuestion],
    );

    const keywordQuery = keywordQueryResult.rows[0].query;

    const keywordResult = await pool.query(
      `
        SELECT
          c.id,
          c.document_id,
          c.content,
          c.page,
          d.title,
          d.doc_type,
          d.issued_date,

          ts_rank_cd(
            to_tsvector('simple', c.content),
            $1::tsquery
          ) AS keyword_score

        FROM chunks c

        JOIN documents d
          ON d.id = c.document_id

        WHERE d.status = 'active'

          AND to_tsvector('simple', c.content)
              @@ $1::tsquery

        ORDER BY keyword_score DESC

        LIMIT 10
  `,
      [keywordQuery],
    );

    const keywordChunk = keywordResult.rows;

    const RRF_K = 60;
    const chunkMap = new Map<number, any>();

    // Lưu kết quả semantic seach vào Map
    for (let i = 0; i < semanticChunks.length; i++) {
      const chunk = semanticChunks[i];
      const semanticRank = i + 1;
      const semanticScore = 1 / (RRF_K + semanticRank);
      chunkMap.set(chunk.id, {
        ...chunk,

        hybridScore: semanticScore,
      });
    }

    // Lưu kết quả keyword seach vào Map
    for (let i = 0; i < keywordChunk.length; i++) {
      const chunk = keywordChunk[i];
      const keywordRank = i + 1;
      const keywordScore = 1 / (RRF_K + keywordRank);

      // Kiểm tra chunk cũ đã có chưa nếu có thì chỉ cộng thêm điểm hybrid vào là được
      const existingChunk = chunkMap.get(chunk.id);
      if (existingChunk) {
        existingChunk.hybridScore += keywordScore;
        console.log("đã tồn tại rồi");
      } else {
        chunkMap.set(chunk.id, {
          ...chunk,
          hybridScore: keywordScore,
        });
      }
    }

    // Láy ra 5 chunk tốt nhất Sắp xếp giảm dần
    const retrievedChunks = [...chunkMap.values()]
      .sort(
        (a, b) =>
          b.hybridScore - a.hybridScore ||
          Number(b.similarity) - Number(a.similarity),
      )
      .slice(0, 5);

    // Bước 7: Ghép các chunk thành context
    const context = retrievedChunks
      .map(
        (chunk: {
          title: string;
          content: string;
          page: number | null;
          doc_type: string;
        }) => {
          return `
            Tên tài liệu: ${chunk.title}
            Loại tài liệu: ${chunk.doc_type}
            Trang: ${chunk.page ?? "Không xác định"}

            Nội dung:
            ${chunk.content}
          `.trim();
        },
      )
      .join("\n\n");
    // Bước 9: Prompt gồm history + context + câu hỏi hiện tại
    const prompt = `
        Bạn là trợ lý hỏi đáp thông tin.

        Yêu cầu:
        - Trả lời bằng tiếng Việt.
        - Với thông tin mang tính dữ kiện, chỉ sử dụng dữ liệu có trong phần TÀI LIỆU THAM KHẢO.
        - Không tự bịa thông tin.
        - Có thể sử dụng LỊCH SỬ HỘI THOẠI để hiểu ngữ cảnh câu hỏi.
        - Nếu tài liệu không đủ thông tin để trả lời, hãy nói:
          "Tôi chưa tìm thấy thông tin này trong tài liệu hiện có."
        - Trả lời rõ ràng, dễ hiểu, không cần đưa đường dẫn file PDF.

        LỊCH SỬ HỘI THOẠI:
        ${historyText || "Chưa có lịch sử hội thoại."}

        TÀI LIỆU THAM KHẢO:
        ${context || "Không tìm thấy tài liệu liên quan."}

        CÂU HỎI HIỆN TẠI:
        ${cleanQuestion}

        TRẢ LỜI:
      `;

    // Bước 10. Gọi gemini
    const aiResponse = await model.invoke(prompt);
    let answer: string;
    if (typeof aiResponse.content === "string") {
      answer = aiResponse.content;
    } else {
      answer = JSON.stringify(aiResponse.content);
    }
    // Bước 11: Mảng sources để làm nguồn lưu cùng message assistant
    const sources = retrievedChunks.map(
      (chunk: {
        document_id: number;
        title: string;
        page: number | null;
        similarity: string | number;
      }) => ({
        documentId: chunk.document_id,
        title: chunk.title,
        page: chunk.page,
        similarity: Number(chunk.similarity),
      }),
    );
    // Bước 12: Lưu câu trả lời của assistant
    await pool.query(
      `
      INSERT INTO messages
        (conversation_id, role, content, sources)
      VALUES
        ($1, 'assistant', $2, $3::jsonb)
      `,
      [conversationId, answer, JSON.stringify(sources)],
    );

    // Bước 13: Cập nhật thời gian conversation
    const conversation = await pool.query(
      `
        SELECT session_id
        FROM conversations
        WHERE id = $1
        `,
      [conversationId],
    );

    const sessionId = conversation.rows[0].session_id;

    // Bước 14: Cập nhật last_seen_at của session
    await pool.query(
      `
        UPDATE sessions
        SET last_seen_at = NOW()
        WHERE id = $1
        `,
      [sessionId],
    );

    // Bước 15: Trả kết quả
    return res.status(200).json({
      answer,
      sources,
    });
  } catch (error) {
    console.error("Lỗi tạo conversation:", error);

    return res.status(500).json({
      message: "Không tạo được cuộc trò chuyện.",
    });
  }
};
