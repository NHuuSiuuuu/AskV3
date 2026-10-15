import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { adminDocumentApi } from '../services/api';

interface AdminUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Modal upload và nhúng vector tài liệu mới vào hệ thống RAG
 */
export const AdminUploadModal: React.FC<AdminUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<string>('regulation');
  const [issuedDate, setIssuedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [file, setFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('docType', docType);
      formData.append('issuedDate', issuedDate);
      formData.append('uploaded_by', '1'); // ID admin
      formData.append('filePath', file); // Multer nhận ở trường filePath

      await adminDocumentApi.uploadDocument(formData);
      setIsSuccess(true);

      setTimeout(() => {
        setIsSuccess(false);
        onSuccess();
        onClose();
        // Reset form
        setTitle('');
        setFile(null);
      }, 1200);
    } catch (err: any) {
      console.error('Lỗi upload tài liệu:', err);
      setError(
        err.message ||
          'Không thể xử lý tài liệu. Vui lòng kiểm tra lại định dạng file hoặc kết nối API Gemini.'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-slate-900 text-lg">Upload tài liệu mới</h2>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
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

        {/* Thông báo thành công */}
        {isSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Tải lên và xử lý vector tài liệu thành công!</span>
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
              disabled={uploading}
              placeholder="Ví dụ: Quy chế đào tạo đại học chính quy 2026"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
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
                disabled={uploading}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              >
                <option value="regulation">Quy định / Quy chế</option>
                <option value="announcement">Thông báo</option>
                <option value="form">Biểu mẫu</option>
                <option value="guide">Hướng dẫn</option>
                <option value="other">Khác</option>
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
                disabled={uploading}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>

          {/* Vùng chọn file */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tệp tài liệu (PDF, TXT, DOCX) <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-5 text-center bg-slate-50/50 transition-colors">
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.txt,.docx"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <FileText className="w-8 h-8 text-blue-500" />
                {file ? (
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-semibold text-blue-600 hover:underline">
                      Chọn file
                    </span>{' '}
                    <span className="text-sm text-slate-500">hoặc kéo thả vào đây</span>
                    <p className="text-xs text-slate-400 mt-1">
                      Hỗ trợ PDF (tối đa 200 trang), TXT, DOCX (tối đa 20MB)
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
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={uploading || isSuccess}
              className="px-5 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý & nhúng Vector...</span>
                </>
              ) : (
                <span>Tải lên & Tạo Vector</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
