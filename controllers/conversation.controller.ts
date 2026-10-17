import { pool } from "../pool";
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import type { Request, Response } from "express";
import { TaskType } from "@google/generative-ai";
import { getChatModel } from "../config/geminiChat";
import { buildPromptRag } from "../prompts/rag.prompt"

export const createConversation = async (req: Request, res: Response) => {
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

export const chat = async (req: Request, res: Response) => {
  // Bộ tạo embedding
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
    apiKey: process.env.GEMINI_API_KEY,
    outputDimensionality: 768,
    taskType: TaskType.RETRIEVAL_QUERY,
  });

  try {
    const { conversationId } = req.params;
    const { question, model } = req.body;
    let sessionId = (req as any).cookies?.session_id;
    console.log("conversationId", conversationId);
    console.log("question", question);
    console.log("model", model);
    console.log("sessionId", req.cookies?.session_id);

    // Bước 1: Validate dữ liệu đầu vào
    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        message: "question là bắt buộc.",
      });
    }

    const cleanQuestion = question.trim();

    // Nếu không có conversationId, tạo conversation mới
    if (!conversationId) {
      if (!sessionId) {
        return res.status(400).json({
          message: "sessionId là bắt buộc để bắt đầu cuộc trò chuyện mới.",
        });
      }

      // Kiểm tra session có tồn tại không
      const sessionResult = await pool.query(
        `SELECT id FROM sessions WHERE id = $1`,
        [sessionId],
      );
      if (sessionResult.rows.length === 0) {
        return res.status(404).json({
          message: "Không tìm thấy session.",
        });
      }
    } else {
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
      sessionId = conversationResult.rows[0].session_id;

      // Bước 3: Lưu câu hỏi của user vào bảng messages cho conversation hiện có
      await pool.query(
        `
        INSERT INTO messages
          (conversation_id, role, content)
        VALUES
          ($1, 'user', $2)
        `,
        [conversationId, cleanQuestion],
      );

      // Tự động cập nhật tiêu đề theo câu hỏi đầu tiên và thời gian cập nhật
      await pool.query(
        `
        UPDATE conversations
        SET title = CASE WHEN title = 'Cuộc trò chuyện mới' THEN $1 ELSE title END,
            updated_at = NOW()
        WHERE id = $2
        `,
        [
          cleanQuestion.length > 45
            ? cleanQuestion.slice(0, 42) + "..."
            : cleanQuestion,
          conversationId,
        ],
      );
    }

    // Bước 4: Lấy lịch sử chat gần nhất (chỉ có khi cuộc trò chuyện đã tồn tại)
    let historyText = "";
    if (conversationId) {
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

      historyText = historyResult.rows
        .map((message: { role: string; content: string }) => {
          if (message.role === "user") {
            return `Người dùng: ${message.content}`;
          } else {
            return `Trợ lý: ${message.content}`;
          }
        })
        .join("\n");
    }
    // Tạo embedding cho câu hỏi hiện tại
    const queryVector = await embeddings.embedQuery(cleanQuestion);
    if (queryVector.length !== 768) {
      throw new Error("Vector câu hỏi không đúng 768 chiều.");
    }

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
    // console.log("keywordQuery", keywordQuery);

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
    console.log("keywordChunk", keywordChunk);

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
    const prompt = buildPromptRag({
      historyText,
      context,
      cleanQuestion
    })


    // Bước 10. Gọi gemini
    const geminiChat = getChatModel(model)
    const aiResponse = await geminiChat.invoke(prompt);
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
    // Bước 12: Lưu trữ vào database
    if (!conversationId) {
      // Khi AI đã trả lời thành công, tiến hành tạo conversation mới
      const title =
        cleanQuestion.length > 45
          ? cleanQuestion.slice(0, 42) + "..."
          : cleanQuestion;

      const newConvResult = await pool.query(
        `
        INSERT INTO conversations (session_id, title)
        VALUES ($1, $2)
        RETURNING *
        `,
        [sessionId, title],
      );
      const conversation = newConvResult.rows[0];

      // Lưu tin nhắn câu hỏi của user
      await pool.query(
        `
        INSERT INTO messages
          (conversation_id, role, content)
        VALUES
          ($1, 'user', $2)
        `,
        [conversation.id, cleanQuestion],
      );

      // Lưu câu trả lời của assistant
      await pool.query(
        `
        INSERT INTO messages
          (conversation_id, role, content, sources)
        VALUES
          ($1, 'assistant', $2, $3::jsonb)
        `,
        [conversation.id, answer, JSON.stringify(sources)],
      );

      // Cập nhật last_seen_at của session
      await pool.query(
        `
        UPDATE sessions
        SET last_seen_at = NOW()
        WHERE id = $1
        `,
        [sessionId],
      );

      return res.status(200).json({
        conversation,
        conversationId: conversation.id,
        answer,
        sources,
      });
    }

    // Cuộc trò chuyện cũ: Cập nhật updated_at và lưu tin nhắn assistant
    await pool.query(
      `
      UPDATE conversations
      SET updated_at = NOW()
      WHERE id = $1
      `,
      [conversationId],
    );

    await pool.query(
      `
      INSERT INTO messages
        (conversation_id, role, content, sources)
      VALUES
        ($1, 'assistant', $2, $3::jsonb)
      `,
      [conversationId, answer, JSON.stringify(sources)],
    );

    // Cập nhật last_seen_at của session
    await pool.query(
      `
      UPDATE sessions
      SET last_seen_at = NOW()
      WHERE id = $1
      `,
      [sessionId],
    );

    return res.status(200).json({
      conversationId,
      answer,
      sources,
    });
  } catch (error) {
    console.error("Lỗi chat conversation:", error);

    return res.status(500).json({
      message: "Không tạo được cuộc trò chuyện.",
    });
  }
};

// Lấy danh sách cuộc trò chuyện theo session
export const getConversationsBySession = async (
  req: Request,
  res: Response,
) => {
  try {
    const sessionId =
      req.params.sessionId ||
      req.query.sessionId ||
      (req as any).cookies?.session_id;

    if (!sessionId) {
      return res.status(400).json({
        message: "sessionId là bắt buộc.",
      });
    }

    const result = await pool.query(
      `
      SELECT id, session_id, title, created_at, updated_at
      FROM conversations
      WHERE session_id = $1
      ORDER BY updated_at DESC, created_at DESC
      `,
      [sessionId],
    );

    return res.status(200).json({
      data: result.rows,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách conversation:", error);
    return res.status(500).json({
      message: "Không lấy được danh sách cuộc trò chuyện.",
    });
  }
};

// Lấy toàn bộ tin nhắn của một cuộc trò chuyện
export const getMessages = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    if (!conversationId) {
      return res.status(400).json({
        message: "conversationId là bắt buộc.",
      });
    }

    const result = await pool.query(
      `
      SELECT id, conversation_id, role, content, sources, created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC, id ASC
      `,
      [conversationId],
    );

    return res.status(200).json({
      data: result.rows,
    });
  } catch (error) {
    console.error("Lỗi lấy tin nhắn:", error);
    return res.status(500).json({
      message: "Không lấy được tin nhắn.",
    });
  }
};

// Xóa cuộc trò chuyện
export const deleteConversation = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    if (!conversationId) {
      return res.status(400).json({
        message: "conversationId là bắt buộc.",
      });
    }

    await pool.query("DELETE FROM messages WHERE conversation_id = $1", [
      conversationId,
    ]);

    const deleted = await pool.query(
      "DELETE FROM conversations WHERE id = $1 RETURNING id",
      [conversationId],
    );

    if (deleted.rows.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy cuộc trò chuyện để xóa.",
      });
    }

    return res.status(200).json({
      message: "Đã xóa cuộc trò chuyện thành công.",
      id: conversationId,
    });
  } catch (error) {
    console.error("Lỗi xóa cuộc trò chuyện:", error);
    return res.status(500).json({
      message: "Không xóa được cuộc trò chuyện.",
    });
  }
};

