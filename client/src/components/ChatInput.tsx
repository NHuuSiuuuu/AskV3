import React, { useState, useRef, useEffect } from "react";
import { SendHorizontal, Loader2, ChevronDown, Check } from "lucide-react";

export interface ModelOption {
  id: string;
  name: string;
  shortName: string;
  badge?: string;
  description?: string;
}
export const DEFAULT_CHAT_MODELS: ModelOption[] = [
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    shortName: "3.8 Flash",
    description: "Cân bằng tốc độ và chất lượng, phù hợp tra cứu tài liệu.",
  },
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    shortName: "3.7 Flash",
    description: "Hỗ trợ phân tích và tổng hợp thông tin từ tài liệu.",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    shortName: "3.5 Flash",
    description: "Phù hợp với các câu hỏi và tác vụ tra cứu thông thường.",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    shortName: "3.1 Lite",
    description: "Ưu tiên phản hồi nhanh cho những câu hỏi đơn giản.",
  },
];

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
  disabled?: boolean;
  currentModel?: any;
  onSelectModel?: (model: any) => void;
  models?: ModelOption[];
}

/**
 * Ô nhập câu hỏi dạng pill phong cách Google Gemini
 * Hỗ trợ chọn option model ngay trong input (như Flash ⌵ / Argon ⌵)
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  loading,
  disabled = false,
  currentModel = "gemini-3.1-flash-lite",
  onSelectModel,
  models = DEFAULT_CHAT_MODELS,
}) => {
  const [content, setContent] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Tìm model đang chọn
  const activeModel =
    models.find((m) => m.id === currentModel) ||
    models[0] || {
      id: currentModel,
      name: currentModel,
      shortName: currentModel,
    };

  // Đóng menu khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  // Tự động co giãn chiều cao của ô nhập theo nội dung
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 140)}px`;
    }
  }, [content]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || loading || disabled) return;

    onSend(content.trim());
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 sm:pb-6">
      <div className="relative flex items-center gap-2 bg-[#f0f4f9] hover:bg-[#e9eef6] focus-within:bg-white
      border border-slate-200/80  rounded-full px-3 py-2 sm:px-4 sm:py-2.5 shadow-xs transition-all duration-200">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading || disabled}
          placeholder="Nhập câu hỏi..."
          rows={1}
          className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-slate-800 
          placeholder-slate-500 text-sm sm:text-base resize-none py-1.5 px-1 leading-normal max-h-36 disabled:opacity-50"
        />

        {/* Cụm công cụ bên phải: Chọn Option Model + Nút Send/Mic */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Menu chọn Option Model nằm ngay bên trong input giống ảnh */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => !loading && !disabled && setIsMenuOpen((prev) => !prev)}
              disabled={loading || disabled}
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer select-none ${isMenuOpen
                ? "bg-slate-200 text-slate-900"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              title="Chọn mô hình AI"
            >
              <span>{activeModel.shortName}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isMenuOpen ? "rotate-180 text-[#0F2A4D]" : ""
                  }`}
              />
            </button>

            {/* Menu thả nổi lên trên (pop-up upwards) với danh sách options */}
            {isMenuOpen && (
              <div className="absolute right-0 bottom-full mb-3 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-1.5 space-y-1">
                  {models.map((m) => {
                    const isSelected = m.id === currentModel;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onSelectModel?.(m.id);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all duration-150 flex items-start gap-2.5 cursor-pointer hover:bg-[#F6F8FB]`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className={`text-sm font-semibold ${isSelected ? "text-[#0F2A4D]" : "text-slate-800"}`}
                            >
                              {m.name}
                            </span>
                          </div>
                          {m.description && (
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {m.description}
                            </p>
                          )}
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#0F2A4D] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Nút gửi câu hỏi */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!content.trim() || loading || disabled}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${content.trim() && !loading && !disabled
              ? "bg-[#0F2A4D] hover:bg-[#1E3A6B] text-white shadow-xs cursor-pointer"
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer"
              }`}
            title="Gửi câu hỏi (Enter)"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#0F2A4D]" />
            ) : (
              <SendHorizontal className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-center text-slate-400 mt-2">
        H-Ask có thể đưa ra câu trả lời chưa hoàn hảo. Vui lòng đối chiếu với văn bản gốc nếu cần.
      </p>
    </div>
  );
};
