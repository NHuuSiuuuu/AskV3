import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';

interface AdminUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData, title: string) => void;
}

/**
 * Modal upload và nhúng vector tài liệu mới vào hệ thống RAG
 */
export const AdminUploadModal: React.FC<AdminUploadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<string>('quy_che_dao_tao');
  const [issuedDate, setIssuedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      // Nếu chưa nhập tiêu đề, tự động điền theo tên file
      if (!title) {
        const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Vui lòng nhập tên tài liệu.');
      return;
    }

    if (!file) {
      setError('Vui lòng chọn file tài liệu (.pdf, .txt, .docx).');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('docType', docType);
    formData.append('issuedDate', issuedDate);
    formData.append('uploaded_by', '1'); // ID admin
    formData.append('filePath', file); // Multer nhận ở trường filePath

    const submittedTitle = title.trim();

    // Reset form fields
    setTitle('');
    setFile(null);
    setError(null);

    // Đóng modal ngay lập tức theo yêu cầu của user
    onClose();

    // Chuyển việc upload và xử lý vector chạy ngầm ở Dashboard
    onSubmit(formData, submittedTitle);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F2A4D]/10 text-[#0F2A4D] flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-slate-900 text-lg">Upload tài liệu mới</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Upload */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên / Tiêu đề tài liệu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Quy chế đào tạo đại học chính quy 2026"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-[#0F2A4D] focus:ring-2 focus:ring-[#0F2A4D]/15 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Loại tài liệu
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-[#0F2A4D] focus:ring-2 focus:ring-[#0F2A4D]/15 transition"
              >
                <option value="quy_che_dao_tao">Quy chế & Quản lý đào tạo</option>
                <option value="chuong_trinh_hoc">Chương trình đào tạo & Học phần</option>
                <option value="chuan_dau_ra">Chuẩn đầu ra (Ngoại ngữ / Tin học)</option>
                <option value="thuc_tap_do_an">Thực tập & Đồ án tốt nghiệp</option>
                <option value="hoc_bong_ren_luyen">Học bổng & Điểm rèn luyện</option>
                <option value="hoc_phi_che_do">Học phí & Chế độ chính sách</option>
                <option value="thu_tuc_khac">Thủ tục hành chính & Tài liệu khác</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Ngày ban hành
              </label>
              <input
                type="date"
                required
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-[#0F2A4D] focus:ring-2 focus:ring-[#0F2A4D]/15 transition"
              />
            </div>
          </div>

          {/* Vùng chọn file */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tệp tài liệu (PDF, TXT, DOCX) <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-[#CBD5E1] hover:border-[#D4AF7C] rounded-xl p-5 text-center bg-slate-50/50 transition-colors">
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.txt,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <FileText className="w-8 h-8 text-[#0F2A4D]" />
                {file ? (
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-semibold text-[#0F2A4D] hover:underline">
                      Chọn file
                    </span>{' '}
                    <span className="text-sm text-slate-500">hoặc kéo thả vào đây</span>
                    <p className="text-xs text-slate-400 mt-1">
                      Hỗ trợ PDF (tối đa 200 trang), TXT, DOCX (tối đa 50MB)
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Nút Submit */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold bg-[#0F2A4D] hover:bg-[#1E3A6B] active:bg-[#0A1D36] text-white rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Tải lên & Tạo Vector</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
