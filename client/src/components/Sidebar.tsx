import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  MessageSquare,
  MoreVertical,
  Trash2,
  AlertTriangle,
  PanelLeftClose,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Conversation } from '../types';
import logoNgang from '../assets/logo.png';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

/**
 * Sidebar bên trái hiển thị lịch sử cuộc trò chuyện và điều hướng
 * Hỗ trợ thu gọn/mở rộng trượt mượt mà phong cách Gemini, không giật layout
 */
export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  isOpen,
  onClose,
  onToggle,
}) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Đóng menu tùy chọn khi người dùng bấm ra ngoài
  useEffect(() => {
    if (!menuOpenId) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setMenuOpenId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpenId]);

  const handleOpenMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsDeleting(true);
      await onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
      setMenuOpenId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar Container với hiệu ứng trượt mượt mà (smooth sliding transition) */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-50 h-full bg-[#f0f4f9]/90 backdrop-blur-md border-r border-slate-200/90
          flex flex-col flex-shrink-0 overflow-hidden
          transition-all duration-300 ease-in-out
          ${
            isOpen
              ? 'w-72 opacity-100 translate-x-0'
              : 'w-0 opacity-0 -translate-x-full md:translate-x-0 border-r-0 pointer-events-none'
          }
        `}
      >
        {/* Inner container giữ chiều rộng cố định w-72 để nội dung KHÔNG BAO GIỜ bị co rúm hay nhảy chữ khi trượt */}
        <div className="w-72 h-full flex flex-col flex-shrink-0 select-none">
          {/* Header: Logo ở bên trái & Nút thu gọn sidebar ở bên phải */}
          <div className="h-14 px-3.5 flex items-center justify-between border-b border-slate-200/60 flex-shrink-0">
            <Link
              to="/"
              className="flex items-center hover:opacity-90 transition-opacity py-0.5"
            >
              <img
                src={logoNgang}
                alt="H-Ask"
                className="h-11 w-auto object-contain"
              />
            </Link>

            {/* Nút đóng / thu gọn sidebar nằm ở bên phải */}
            <button
              type="button"
              onClick={onToggle}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Thu gọn menu bên"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

        {/* Nút Cuộc trò chuyện mới */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-[#0F2A4D] hover:bg-[#1E3A6B] text-white font-medium text-sm rounded-xl shadow-xs transition-all duration-150 group cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#fffff] group-hover:scale-110 transition-transform" />
            <span>Cuộc trò chuyện mới</span>
          </button>
        </div>

        {/* Danh sách các cuộc trò chuyện */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Gần đây
          </div>

          {conversations.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-slate-500">
              Chưa có lịch sử hội thoại
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeId;
              const isMenuOpen = menuOpenId === conv.id;

              return (
                <div
                  key={conv.id}
                  className={`relative group ${isMenuOpen ? 'z-30' : 'z-0'}`}
                >
                  <button
                    onClick={() => {
                      onSelect(conv.id);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left rounded-xl text-sm transition-all relative pr-9 cursor-pointer ${
                      isActive
                        ? 'bg-[#0F2A4D]/10 text-[#0F2A4D] font-semibold border-l-2 border-[#D4AF7C] shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-200/60'
                    }`}
                  >
                    <MessageSquare
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? 'text-[#0F2A4D]' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span className="truncate">{conv.title || 'Cuộc trò chuyện mới'}</span>
                  </button>

                  {/* Nút 3 chấm hover - không làm giật layout */}
                  <div
                    ref={isMenuOpen ? menuContainerRef : null}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2"
                  >
                    <button
                      type="button"
                      onClick={(e) => handleOpenMenu(e, conv.id)}
                      className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-300/50 transition-opacity ${
                        isMenuOpen ? 'opacity-100 bg-slate-300/60 text-slate-700' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      title="Tùy chọn"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {/* Menu nhỏ khi bấm nút 3 chấm */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(conv.id);
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 text-left font-medium transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa cuộc trò chuyện</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>
      </aside>

      {/* Modal xác nhận xóa cuộc trò chuyện */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Xóa cuộc trò chuyện?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Toàn bộ tin nhắn trong cuộc trò chuyện này sẽ bị xóa vĩnh viễn và không thể khôi phục lại.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition"
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
