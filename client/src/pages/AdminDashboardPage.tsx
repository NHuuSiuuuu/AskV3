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
  Layers,
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { AdminDocument } from '../types';
import { adminDocumentApi, adminAuthApi } from '../services/api';
import { AdminUploadModal } from '../components/AdminUploadModal';
import logoNgang from '../assets/logo.png';

interface UploadTaskNotification {
  id: string;
  title: string;
  status: 'uploading' | 'success' | 'error';
  message?: string;
}

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
  const [uploadTasks, setUploadTasks] = useState<UploadTaskNotification[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

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
   * Mở công cụ PDF24 OCR trong cửa sổ riêng biệt chuẩn kích thước
   */
  const openOcrWindow = (url: string) => {
    const width = 1150;
    const height = 820;
    const left = Math.max(0, (window.screen.width - width) / 2);
    const top = Math.max(0, (window.screen.height - height) / 2);
    window.open(
      url,
      'ocr_tool_window',
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
    );
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

  /**
   * Thay đổi trạng thái tài liệu: 'processing' | 'active' | 'archived' | 'failed'
   */
  const handleStatusChange = async (
    id: number,
    newStatus: 'processing' | 'active' | 'archived' | 'failed'
  ) => {
    try {
      setUpdatingStatusId(id);
      await adminDocumentApi.updateStatus(id, newStatus);
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === id ? { ...doc, status: newStatus } : doc))
      );
    } catch (err: any) {
      console.error('Lỗi cập nhật trạng thái:', err);
      alert(err.message || 'Không thể cập nhật trạng thái tài liệu.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  /**
   * Bắt đầu xử lý tải lên tài liệu và tạo vector ngầm
   */
  const handleUploadSubmit = async (formData: FormData, title: string) => {
    const taskId = Date.now().toString() + Math.random().toString(36).slice(2, 6);

    // Thêm task đang chạy vào danh sách thông báo
    setUploadTasks((prev) => [
      ...prev,
      { id: taskId, title, status: 'uploading' },
    ]);

    try {
      await adminDocumentApi.uploadDocument(formData);

      // Cập nhật trạng thái thành công
      setUploadTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
              ...t,
              status: 'success',
              message: 'Tải lên & phân đoạn tạo vector nhúng thành công!',
            }
            : t
        )
      );

      // Cập nhật lại bảng dữ liệu
      loadDocuments();

      // Tự động ẩn thông báo thành công sau 4 giây
      setTimeout(() => {
        setUploadTasks((prev) => prev.filter((t) => t.id !== taskId));
      }, 4000);
    } catch (err: any) {
      console.error('Lỗi tải lên tài liệu:', err);
      // Cập nhật trạng thái lỗi
      setUploadTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
              ...t,
              status: 'error',
              message:
                err.message ||
                'Không thể xử lý tài liệu. Vui lòng kiểm tra định dạng hoặc kết nối API Gemini.',
            }
            : t
        )
      );
    }
  };

  /**
   * Đóng thông báo tiến trình upload
   */
  const removeUploadTask = (taskId: string) => {
    setUploadTasks((prev) => prev.filter((t) => t.id !== taskId));
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
  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0);

  return (
    <div className="min-h-screen bg-[#F6F8FB] flex flex-col">
      {/* Top Admin Header */}
      <header className="bg-white border-b border-[#CBD5E1]/80 h-16 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <img
              src={logoNgang}
              alt="H-Ask"
              className="h-7 w-auto object-contain"
            />
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#0F2A4D]/10 text-[#0F2A4D] border border-[#0F2A4D]/20">
              Admin
            </span>
          </Link>
          <div className="hidden md:block h-5 w-px bg-slate-200" />
          <p className="hidden md:block text-[11px] text-slate-500">
            Quản trị cơ sở dữ liệu văn bản & Vector RAG
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openOcrWindow('https://tools.pdf24.org/vi/ocr-pdf')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F2A4D] bg-[#F0F4F9] hover:bg-[#E1E9F3] border border-[#CBD5E1] rounded-lg transition shadow-2xs cursor-pointer"
            title="Mở công cụ PDF24 OCR trong cửa sổ riêng để quét tài liệu scan/chụp ảnh"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF7C]" />
            <span>Mở cửa sổ PDF24 OCR</span>
            <ArrowUpRight className="w-3 h-3 text-[#0F2A4D]" />
          </button>

          <Link
            to="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-[#0F2A4D] hover:bg-slate-50 border border-slate-200 rounded-lg transition"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Về trang Chat</span>
          </Link>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition cursor-pointer"
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
              onClick={() => openOcrWindow('https://tools.pdf24.org/vi/ocr-pdf')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-[#F0F4F9] hover:bg-[#E1E9F3] active:bg-[#C3D4E7] text-[#0F2A4D] border border-[#CBD5E1] font-semibold text-xs sm:text-sm rounded-xl transition shadow-xs cursor-pointer"
              title="Mở công cụ PDF24 OCR trong cửa sổ riêng để quét tài liệu scan/chụp ảnh"
            >
              <Sparkles className="w-4 h-4 text-[#D4AF7C]" />
              <span>Mở cửa sổ PDF24 OCR</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#0F2A4D]" />
            </button>

            <button
              onClick={loadDocuments}
              className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition shadow-xs cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F2A4D]' : ''}`} />
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F2A4D] hover:bg-[#1E3A6B] active:bg-[#0A1D36] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer"
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
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#CBD5E1]/80 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#0F2A4D]/10 text-[#0F2A4D] flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tổng tài liệu
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#CBD5E1]/80 shadow-xs flex items-center gap-4">
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

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#CBD5E1]/80 shadow-xs flex items-center gap-4">
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

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#CBD5E1]/80 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#D4AF7C]/20 text-[#0F2A4D] flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tổng Vector Chunks
              </p>
              <p className="text-2xl font-bold text-[#0F2A4D] mt-0.5">{totalChunks}</p>
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
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-[#0F2A4D] focus:ring-2 focus:ring-[#0F2A4D]/15 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Loại:
            </span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-[#0F2A4D] transition"
            >
              <option value="quy_che_dao_tao">Quy chế & Quản lý đào tạo</option>
              <option value="chuong_trinh_hoc">Chương trình đào tạo & Học phần</option>
              <option value="chuan_dau_ra">Chuẩn đầu ra (Ngoại ngữ / Tin học)</option>
              <option value="thuc_tap_do_an">Thực tập & Đồ án tốt nghiệp</option>
              <option value="hoc_bong_ren_luyen">Học bổng & Điểm rèn luyện</option>
              <option value="hoc_phi_che_do">Học phí & Chế độ chính sách</option>
              <option value="thu_tuc_khac">Thủ tục hành chính & Tài liệu khác</option>
              <option value="khac">Khác</option>
            </select>
          </div>
        </div>

        {/* Bảng danh sách tài liệu */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#0F2A4D]" />
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
                    <th className="py-3.5 px-4">Định dạng</th>
                    <th className="py-3.5 px-4 text-center">Vector Chunks</th>
                    <th className="py-3.5 px-4">Ngày ban hành</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4">Ngày tạo</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredDocuments.map((doc) => {
                    const downloadUrl = adminDocumentApi.getDocumentFileUrl(doc.id);

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-800 max-w-xs sm:max-w-md truncate">
                          {doc.title}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 capitalize">
                          {doc.doc_type}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 text-xs font-semibold uppercase rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {doc.file_type || doc.file_extension || 'FILE'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#0F2A4D]/10 text-[#0F2A4D] border border-[#0F2A4D]/15">
                            {doc.chunk_count || 0} chunks
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {doc.issued_date ? new Date(doc.issued_date).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <select
                            value={doc.status}
                            onChange={(e) =>
                              handleStatusChange(
                                doc.id,
                                e.target.value as 'processing' | 'active' | 'archived' | 'failed'
                              )
                            }
                            disabled={updatingStatusId === doc.id}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none transition-all ${doc.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : doc.status === 'processing'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  : doc.status === 'failed'
                                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                    : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                              } ${updatingStatusId === doc.id ? 'opacity-50 cursor-wait' : ''}`}
                            title="Bấm để chuyển đổi trạng thái tài liệu"
                          >
                            <option value="active">Hoạt động</option>
                            <option value="archived">Lưu trữ</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                          {new Date(doc.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-[#0F2A4D] hover:bg-[#0F2A4D]/5 rounded-lg transition"
                              title="Xem / Tải file"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>

                            <button
                              onClick={() => setDeleteConfirmId(doc.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
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
        onSubmit={handleUploadSubmit}
      />

      {/* Floating Upload Notifications */}
      {uploadTasks.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm sm:max-w-md w-full px-4 sm:px-0 pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-200">
          {uploadTasks.map((task) => (
            <div
              key={task.id}
              className={`pointer-events-auto p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all flex items-start gap-3 ${task.status === 'uploading'
                  ? 'bg-white/95 border-[#CBD5E1] text-slate-800 shadow-[#0F2A4D]/10'
                  : task.status === 'success'
                    ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900 shadow-emerald-500/10'
                    : 'bg-red-50/95 border-red-200 text-red-900 shadow-red-500/10'
                }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {task.status === 'uploading' && (
                  <Loader2 className="w-5 h-5 text-[#0F2A4D] animate-spin" />
                )}
                {task.status === 'success' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
                {task.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5 opacity-75">
                  {task.status === 'uploading'
                    ? 'Đang xử lý tài liệu'
                    : task.status === 'success'
                      ? 'Hoàn tất'
                      : 'Thao tác thất bại'}
                </p>
                <p className="text-sm font-semibold truncate" title={task.title}>
                  {task.title}
                </p>
                <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
                  {task.status === 'uploading'
                    ? 'Đang tải file, phân đoạn & tạo vector nhúng (Gemini)...'
                    : task.message}
                </p>
              </div>

              <button
                onClick={() => removeUploadTask(task.id)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition -mr-1 -mt-1 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

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
