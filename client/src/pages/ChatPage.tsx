import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sparkles, AlertCircle, PanelLeftOpen, Menu, Plus } from "lucide-react";
import type { Conversation, Message } from "../types";
import { sessionApi, conversationApi } from "../services/api";
import { getStoredSessionId, storeSessionId } from "../utils/session";
import { Sidebar } from "../components/Sidebar";
import { ChatMessage } from "../components/ChatMessage";
import { ChatInput } from "../components/ChatInput";
import { EmptyChat } from "../components/EmptyChat";
import bgTrongDong from "../assets/bg_trong_dong.png";

/**
 * Trang chat chính của hệ thống H Ask
 */
export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });

  // Model được chọn: "flash" hoặc "pro" (lưu vào localStorage để ghi nhớ)
  const [selectedModel, setSelectedModel] = useState<any>(() => {
    const saved = localStorage.getItem("preferred_chat_model");
    return saved || "gemini-3.5-flash";
  });

  const handleModelChange = (model: any) => {
    setSelectedModel(model);
    localStorage.setItem("preferred_chat_model", model);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Lưu ID cuộc trò chuyện vừa tạo để tránh gọi lại API nạp tin nhắn khi navigate cập nhật URL
  const justCreatedConvIdRef = useRef<string | null>(null);

  // Tự động cuộn xuống tin nhắn mới nhất
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  /**
   * Bước 1: Khởi tạo Session và nạp danh sách cuộc trò chuyện
   */
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        let currentSessionId = getStoredSessionId();

        // Nếu chưa có session, gọi API tạo session mới
        if (!currentSessionId) {
          const session = await sessionApi.createSession();
          currentSessionId = session.id;
          storeSessionId(currentSessionId);
        }

        if (isMounted) {
          setSessionId(currentSessionId);
        }

        // Lấy danh sách conversation thuộc session này
        const list = await conversationApi.getConversations(currentSessionId);
        if (isMounted) {
          setConversations(list);
        }
      } catch (err: any) {
        console.error("Lỗi khởi tạo session:", err);
        if (isMounted) {
          setError(err.message || "Không thể kết nối đến máy chủ.");
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Bước 2: Nạp tin nhắn khi chọn một conversation
   */
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    // Nếu vừa tạo conversation mới từ phản hồi AI và vừa navigate tới id này,
    // tin nhắn đã có sẵn trong state, không cần fetch lại gây giật/chớp nháy loading
    if (justCreatedConvIdRef.current === conversationId) {
      justCreatedConvIdRef.current = null;
      return;
    }

    let isMounted = true;
    async function loadMessages() {
      try {
        setLoadingMessages(true);
        setError(null);
        const data = await conversationApi.getMessages(conversationId!);
        if (isMounted) {
          setMessages(data);
          setTimeout(() => scrollToBottom("auto"), 50);
        }
      } catch (err: any) {
        console.error("Lỗi nạp tin nhắn:", err);
        if (isMounted) {
          setError("Không nạp được lịch sử tin nhắn của cuộc trò chuyện.");
        }
      } finally {
        if (isMounted) {
          setLoadingMessages(false);
        }
      }
    }

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [conversationId]);

  /**
   * Bước 3: Tạo cuộc trò chuyện mới (không tạo bản ghi DB ngay, chuyển về trang /)
   */
  const handleNewChat = () => {
    setError(null);
    if (conversationId) {
      navigate("/");
    } else {
      setMessages([]);
    }
  };

  /**
   * Bước 4: Xóa một cuộc trò chuyện
   */
  const handleDeleteConversation = async (id: string) => {
    try {
      await conversationApi.deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);

      // Nếu cuộc trò chuyện bị xóa là cuộc trò chuyện đang xem
      if (conversationId === id) {
        if (remaining.length > 0) {
          navigate(`/chat/${remaining[0].id}`, { replace: true });
        } else {
          // Nếu đã xóa hết thì chuyển về màn hình chat mới "/", không tạo rác trong DB
          navigate("/", { replace: true });
          setMessages([]);
        }
      }
    } catch (err: any) {
      console.error("Lỗi xóa conversation:", err);
      setError("Không thể xóa cuộc trò chuyện này.");
    }
  };

  /**
   * Bước 5: Gửi tin nhắn cho AI
   */
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || sending) return;

    const trimmedText = text.trim();
    const isNew = !conversationId;

    // Đảm bảo đã có sessionId trước khi gửi
    let currentSessionId = sessionId || getStoredSessionId();
    if (!currentSessionId) {
      try {
        const session = await sessionApi.createSession();
        currentSessionId = session.id;
        storeSessionId(currentSessionId);
        setSessionId(currentSessionId);
      } catch {
        setError("Không thể khởi tạo phiên trò chuyện.");
        return;
      }
    }

    // Optimistic update: Thêm câu hỏi của user vào danh sách ngay
    const userMsg: Message = {
      role: "user",
      content: trimmedText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setTimeout(() => scrollToBottom(), 50);

    try {
      setSending(true);
      setError(null);

      // Gọi API chat: gửi kèm sessionId và selectedModel
      const response = await conversationApi.sendMessage(
        conversationId,
        trimmedText,
        currentSessionId,
        selectedModel,
      );

      // Thêm câu trả lời của AI vào danh sách
      const assistantMsg: Message = {
        role: "assistant",
        content: response.answer,
        sources: response.sources,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setTimeout(() => scrollToBottom(), 100);

      // Khi có câu trả lời được trả về (phong cách Gemini):
      if (isNew) {
        const newConv = response.conversation || {
          id: response.conversationId,
          session_id: currentSessionId,
          title:
            trimmedText.length > 45
              ? trimmedText.slice(0, 42) + "..."
              : trimmedText,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Đánh dấu để useEffect([conversationId]) không nạp lại tin nhắn
        justCreatedConvIdRef.current = newConv.id;

        // Thêm cuộc trò chuyện mới vào danh sách hiển thị ở Sidebar
        setConversations((prev) => [newConv, ...prev]);

        // Cập nhật URL sang /chat/:newId
        navigate(`/chat/${newConv.id}`, { replace: true });
      } else {
        // Cập nhật lại tiêu đề ở sidebar nếu đây là câu hỏi đầu tiên của conversation cũ
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId && c.title === "Cuộc trò chuyện mới"
              ? {
                ...c,
                title:
                  trimmedText.length > 45
                    ? trimmedText.slice(0, 42) + "..."
                    : trimmedText,
              }
              : c,
          ),
        );
      }
    } catch (err: any) {
      console.error("Lỗi gửi tin nhắn:", err);
      setError(
        err.message || "Không nhận được phản hồi từ AI. Vui lòng thử lại.",
      );
    } finally {
      setSending(false);
    }
  };

  // Lấy tiêu đề hội thoại hiện tại
  const currentConversation = conversations.find(
    (c) => c.id === conversationId,
  );

  return (
    <div className="flex h-screen w-full overflow-hidden relative bg-[#f8fafd]">
      {/* Lớp nền Trống Đồng tinh tế phong cách văn hóa HUMG cho TOÀN BỘ TRANG */}
      <div
        className="absolute inset-0 pointer-events-none z-0 bg-center bg-no-repeat mix-blend-multiply opacity-35 transition-opacity duration-300"
        style={{
          backgroundImage: `url(${bgTrongDong})`,
          backgroundSize: "cover",
        }}
      />

      {/* Sidebar bên trái */}
      <Sidebar
        conversations={conversations}
        activeId={conversationId || null}
        onSelect={(id) => navigate(`/chat/${id}`)}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Khu vực chat chính */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-transparent z-10">
        {/* Top Navbar - Chỉ hiển thị trên màn hình nhỏ (mobile < md) */}
        <header className="md:hidden h-14 border-b border-slate-200/80 bg-white/80 backdrop-blur-md flex items-center justify-between px-3 z-20 flex-shrink-0 relative">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
              title="Mở danh sách hội thoại"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-slate-800 text-sm truncate max-w-[200px] sm:max-w-xs">
                {currentConversation?.title || "H Ask"}
              </span>
            </div>
          </div>
        </header>

        {/* Nút Logo ở góc trên bên trái khi thu gọn sidebar trên màn hình lớn (desktop md:) */}
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="hidden md:inline-flex rounded-lg absolute top-3.5 left-4 z-30 text-slate-800 transition-all duration-200 group cursor-pointer"
            title="Mở thanh bên (Sidebar)"
          >
            <div className="w-7 h-7 rounded-lg text-slate-600 flex items-center justify-center transition-transform">
              <PanelLeftOpen className="w-5 h-5 " />
            </div>
          </button>
        )}

        {/* Thông báo lỗi nếu có */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-center justify-between shadow-xs relative z-10">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-800 font-bold px-2 py-0.5"
            >
              ×
            </button>
          </div>
        )}

        {/* Khung tin nhắn cuộn */}
        <div
          className={`flex-1 overflow-y-auto px-4 sm:px-6 py-6 ${
            !sidebarOpen && messages.length > 0 ? "md:pt-16" : ""
          } relative z-10`}
        >
          {loadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <Sparkles className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-sm font-medium">
                Đang tải lịch sử trò chuyện...
              </span>
            </div>
          ) : messages.length === 0 ? (
            <EmptyChat onSelectPrompt={handleSendMessage} />
          ) : (
            <div className="max-w-4xl mx-auto w-full">
              {messages.map((msg, index) => (
                <ChatMessage key={msg.id || index} message={msg} />
              ))}

              {/* Trạng thái đang chờ AI trả lời */}
              {sending && (
                <div className="flex justify-start mb-8 animate-in fade-in duration-200">
                  <div className="flex gap-3.5 max-w-[85%] items-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5 animate-pulse">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-2 text-slate-600 text-sm">
                      <div className="flex gap-1.5 items-center">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></span>
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Khung nhập câu hỏi cố định phía dưới */}
        <div className="flex-shrink-0 bg-gradient-to-t from-[#f8fafd] via-[#f8fafd]/90 to-transparent pt-2 relative z-10">
          <ChatInput
            onSend={handleSendMessage}
            loading={sending}
            currentModel={selectedModel}
            onSelectModel={handleModelChange}
          />
        </div>
      </main>
    </div>
  );
};
