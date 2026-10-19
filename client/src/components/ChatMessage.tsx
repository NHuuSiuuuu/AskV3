import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Copy, Check } from 'lucide-react';
import type { Message } from '../types';
import faviLogo from '../assets/favi_light.png';

interface ChatMessageProps {
  message: Message;
}

/**
 * Component hiển thị một tin nhắn trong cuộc trò chuyện (User hoặc AI Assistant)
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div className="flex gap-3 max-w-[85%] md:max-w-[75%] items-start">
          <div className="bg-[#0F2A4D] text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-xs text-sm sm:text-base leading-relaxed break-words">
            {message.content}
          </div>
          <div className="w-8 h-8 rounded-full bg-[#0F2A4D]/10 text-[#0F2A4D] flex items-center justify-center flex-shrink-0 mt-0.5">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-8 group">
      <div className="flex gap-3.5 max-w-[95%] md:max-w-[85%] items-start">
        {/* H-Ask AI Avatar */}
        <div className="w-8 h-8 rounded-full bg-white border border-[#CBD5E1] p-1 flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
          <img
            src={faviLogo}
            alt="H-Ask"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Nội dung tin nhắn của AI */}
        <div className="flex-1 min-w-0">
          <div className="bg-white border border-[#CBD5E1]/90 rounded-2xl rounded-tl-sm p-4 sm:p-5 shadow-xs text-slate-800">
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Action buttons dưới tin nhắn */}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
              {/* Nguồn tài liệu (left) */}
              {message.sources && message.sources.length > 0 && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Trích dẫn:</span>
                  {message.sources
                    .filter((src, i, arr) => arr.findIndex(s => s.documentId === src.documentId) === i)
                    .map((src) => (
                      <a
                        key={src.documentId}
                        href={`/documents/${src.documentId}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-[#1E3A6B] hover:text-[#0F2A4D] font-medium underline underline-offset-2"
                      >
                        {src.title || `Document ${src.documentId}`}
                      </a>
                    ))}
                </div>
              )}
              {/* Nút sao chép (right) */}
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition"
                title="Sao chép nội dung"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-green-600">Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>

            </div>

          </div>
        </div>
      </div>
    // </div>
  );
};
