import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Copy, Check, ExternalLink } from 'lucide-react';
import type { Message } from '../types';
import faviLogo from '../assets/favi_light.png';

interface ChatMessageProps {
  message: Message;
}

/**
 * Chuẩn hóa tiêu đề trích dẫn:
 * - Khắc phục tình trạng VIẾT HOA TOÀN BỘ (ALL CAPS): chuyển thành Sentence Case đồng bộ font
 * - Giữ nguyên viết hoa cho các mã học thuật / từ viết tắt quy chuẩn (HUMG, ĐHMĐC, QĐ, ...)
 * - Loại bỏ phần mở rộng file nếu có (.pdf, .docx, ...)
 */
function formatCitationTitle(rawTitle?: string): string {
  if (!rawTitle) return '';
  let title = rawTitle.trim();

  // Bỏ extension file nếu có
  title = title.replace(/\.(pdf|docx|doc|txt)$/i, '').trim();

  // Kiểm tra nếu tất cả ký tự chữ cái tiếng Việt/Latin đều đang bị VIẾT HOA
  const letters = title.replace(/[^a-zA-ZÀ-ỹ]/g, '');
  const isAllCaps = letters.length > 0 && letters === letters.toUpperCase();

  if (isAllCaps) {
    const lower = title.toLowerCase();
    // Viết hoa chữ cái đầu tiên trong chuỗi
    title = lower.replace(/^([^\p{L}]*)(\p{L})/u, (_, prefix, firstChar) => {
      return prefix + firstChar.toUpperCase();
    });

    // Giữ viết hoa cho các từ viết tắt phổ biến
    const acronyms = [
      'HUMG',
      'ĐHMĐC',
      'BGDĐT',
      'UBND',
      'QĐ',
      'TT',
      'NQ',
      'CTĐT',
      'CNTT',
      'TCNH',
      'QTKD',
      'K60', 'K61', 'K62', 'K63', 'K64', 'K65', 'K66', 'K67', 'K68', 'K69', 'K70'
    ];
    for (const ac of acronyms) {
      const reg = new RegExp(`(?<=^[\\s/(_\\-–—])${ac}(?=$[\\s/.,;:!?_\\-–—)]|\\b)`, 'gi');
      title = title.replace(reg, ac);
    }
  }

  return title;
}

/**
 * Component hiển thị một tin nhắn trong cuộc trò chuyện (User hoặc AI Assistant)
 * Nguồn trích dẫn:
 * - Mỗi tài liệu nằm trên 1 dòng riêng biệt (xuống dòng giữa các tài liệu)
 * - Mỗi dòng tự động rút gọn bằng dấu ... khi dài, không bị rớt dòng lộn xộn
 * - Không dùng background xám, dùng gạch chân dạng link rõ ràng để người dùng biết là link và ấn vào được
 * - Chuẩn hóa font chữ, khắc phục triệt để lỗi viết hoa tất cả
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Gom nhóm nguồn trích dẫn theo documentId (loại bỏ trùng lặp)
  const uniqueSources = useMemo(() => {
    if (!message.sources || message.sources.length === 0) return [];

    const map = new Map<number, {
      documentId: number;
      title: string;
    }>();

    for (const src of message.sources) {
      if (!src || !src.documentId) continue;
      if (!map.has(src.documentId)) {
        map.set(src.documentId, {
          documentId: src.documentId,
          title: formatCitationTitle(src.title) || `Tài liệu #${src.documentId}`,
        });
      }
    }

    return Array.from(map.values());
  }, [message.sources]);

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div className="flex gap-3 max-w-[85%] md:max-w-[75%] items-start">
          <div className="bg-[#0F2A4D] text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-xs text-sm sm:text-base leading-relaxed break-words">
            {message.content}
          </div>
          <div className="w-8 h-8 rounded-full bg-[#0F2A4D]/10 text-[#0F2A4D] flex items-center justify-center shrink-0 mt-0.5">
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
        <div className="w-8 h-8 rounded-full bg-white border border-[#CBD5E1] p-1 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
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

            {/* Khối trích dẫn: Mỗi tài liệu 1 dòng riêng biệt, dùng dấu ... nếu dài */}
            {uniqueSources.length > 0 && (
              <div className="mt-3.5 pt-2.5 border-t border-slate-100 text-sm">
                <div className="font-semibold text-slate-700 mb-1.5 select-none">
                  Trích dẫn:
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  {uniqueSources.map((src) => (
                    <div key={src.documentId} className="flex items-center gap-2 min-w-0">
                      <span className="text-slate-400 select-none shrink-0">•</span>
                      <a
                        href={`/documents/${src.documentId}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`${src.title} - Bấm để xem tài liệu gốc`}
                        className="group/link inline-flex items-center gap-1.5 min-w-0 max-w-full text-[#1E3A6B] hover:text-[#0F2A4D] font-medium underline underline-offset-4 decoration-[#1E3A6B]/50 hover:decoration-[#0F2A4D] transition-colors cursor-pointer"
                      >
                        <span className="truncate whitespace-nowrap">{src.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#1E3A6B]/50 group-hover/link:text-[#0F2A4D] shrink-0 no-underline transition-colors" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Thanh tác vụ dưới cùng: nút Sao chép */}
            <div className="mt-2.5 flex items-center justify-end border-t border-slate-100/80 pt-1.5">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100/80 transition-colors cursor-pointer"
                title="Sao chép nội dung"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">Đã sao chép</span>
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
  );
};
