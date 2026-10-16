import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  LogOut,
  Search,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { AdminDocument } from '../types';
import { adminDocumentApi, adminAuthApi } from '../services/api';
import { AdminUploadModal } from '../components/AdminUploadModal';

/**
 * Trang bảng điều khiển quản trị viên: Quản lý danh sách tài liệu RAG
 */
export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Tải danh sách tài liệu từ backend
   */
  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminDocumentApi.getDocuments();
      setDocuments(data);
    } catch (err: any) {
      console.error('Lỗi nạp tài liệu:', err);
      setError(err.message || 'Không thể tải danh sách tài liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  /**
   * Đăng xuất quản trị viên
   */
  const handleLogout = () => {
    adminAuthApi.logout();
    navigate('/login', { replace: true });
  };

  /**
   * Xác nhận xóa tài liệu
   */
  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsDeleting(true);
      await adminDocumentApi.deleteDocument(deleteConfirmId);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error('Lỗi xóa tài liệu:', err);
      alert(err.message || 'Không thể xóa tài liệu này.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Lọc tài liệu theo từ khóa tìm kiếm và loại văn bản
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || doc.doc_type === filterType;
    return matchesSearch && matchesType;
  });

  // Thống kê nhanh
  const totalCount = documents.length;
  const activeCount = documents.filter((d) => d.status === 'active').length;
  const failedCount = documents.filter((d) => d.status === 'failed').length;

  return (
    <div className="min-h-screen bg-[#f8fafd] flex flex-col">
      {/* Top Admin Header */}
      <header className="bg-white border-b border-slate-200/90 h-16 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            H
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-none">
              H Ask Admin
            </h1>
            <p className="text-[11px] text-slate-500 mt-1">
              Quản trị cơ sở dữ liệu văn bản & Vector RAG
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Về trang Chat</span>
          </Link>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition"
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        {/* Banner tiêu đề & Nút hành động */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Quản lý tài liệu học vụ & quy chế
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Các tài liệu đang được lập chỉ mục vector để Gemini AI tra cứu và phản hồi người dùng.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadDocuments}
              className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition shadow-xs"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition"
            >
              <Upload className="w-4 h-4" />
              <span>Tải lên tài liệu mới</span>
            </button>
          </div>
        </div>

        {/* Thông báo lỗi nếu có */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
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

        {/* 4 Thẻ thống kê */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tổng tài liệu
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Đang hoạt động
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-0.5">{activeCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Thất bại
              </p>
              <p className="text-2xl font-bold text-red-600 mt-0.5">{failedCount}</p>
            </div>
          </div>
        </div>

        {/* Thanh tìm kiếm và bộ lọc */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm tài liệu theo tiêu đề..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Loại:
            </span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">Tất cả loại văn bản</option>
              <option value="regulation">Quy định / Quy chế</option>
              <option value="announcement">Thông báo</option>
              <option value="form">Biểu mẫu</option>
              <option value="guide">Hướng dẫn</option>
              <option value="other">Khác</option>
            </select>
          </div>
        </div>

        {/* Bảng danh sách tài liệu */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-sm font-medium">Đang tải danh sách tài liệu...</span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-800">Không tìm thấy tài liệu nào</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm
                  ? 'Không có kết quả khớp với tìm kiếm của bạn.'
                  : 'Chưa có tài liệu nào trong hệ thống. Hãy bấm nút "Tải lên tài liệu mới".'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Tiêu đề tài liệu</th>
                    <th className="py-3.5 px-4">Loại</th>
                    <th className="py-3.5 px-4">Ngày ban hành</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4">Ngày tạo</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredDocuments.map((doc) => {
                    const downloadUrl = adminDocumentApi.getDocumentFileUrl(doc.id);

                    // Badge màu sắc cho trạng thái
                    let statusBadge = (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Hoạt động
                      </span>
                    );
                    if (doc.status === 'processing') {
                      statusBadge = (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Đang xử lý
                        </span>
                      );
                    } else if (doc.status === 'failed') {
                      statusBadge = (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                          title={doc.error_message || 'Xử lý thất bại'}
                        >
                          Thất bại
                        </span>
                      );
                    } else if (doc.status === 'archived') {
                      statusBadge = (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          Lưu trữ
                        </span>
                      );
                    }

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-800 max-w-xs sm:max-w-md truncate">
                          {doc.title}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 capitalize">
                          {doc.doc_type}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {doc.issued_date ? new Date(doc.issued_date).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">{statusBadge}</td>
                        <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                          {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Xem / Tải file"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>

                            <button
                              onClick={() => setDeleteConfirmId(doc.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Xóa tài liệu"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Upload tài liệu */}
      <AdminUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={loadDocuments}
      />

      {/* Modal xác nhận xóa tài liệu */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Xóa tài liệu này?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Tài liệu và toàn bộ các vector embedding liên quan sẽ bị xóa khỏi cơ sở dữ liệu. AI sẽ không thể tham chiếu đến tài liệu này nữa.
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
    </div>
  );
};
