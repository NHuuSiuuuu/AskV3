import React, { useState, useRef, useEffect } from "react";
import { SendHorizontal, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
  disabled?: boolean;
}

/**
 * Ô nhập câu hỏi cố định dưới đáy màn hình theo phong cách Gemini
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  loading,
  disabled = false,
}) => {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tự động co giãn chiều cao của ô nhập theo nội dung
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 160)}px`;
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
    // Bấm Enter để gửi, Shift + Enter để xuống dòng
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 sm:pb-6">
      <div className="relative bg-white border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 rounded-2xl shadow-sm transition-all duration-200">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading || disabled}
          placeholder="Nhập câu hỏi của bạn ..."
          rows={1}
          className="w-full resize-none px-4 py-3.5 pr-14 text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent max-h-40 leading-relaxed disabled:opacity-50"
        />

        <div className="absolute right-2.5 bottom-2.5">
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!content.trim() || loading || disabled}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              content.trim() && !loading && !disabled
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
            title="Gửi câu hỏi (Enter)"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <SendHorizontal className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
