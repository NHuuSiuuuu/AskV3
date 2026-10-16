/**
 * Kiểu dữ liệu mô hình AI hỗ trợ (có thể mở rộng thêm nhiều model)
 */

/**
 * Kiểu dữ liệu đại diện cho một Session người dùng
 */
export interface Session {
  id: string;
  created_at: string;
  last_seen_at: string;
}

/**
 * Nguồn tài liệu tham khảo cho câu trả lời của AI
 */
export interface DocumentSource {
  documentId: number;
  title: string;
  page: number | null;
  similarity: number;
}

/**
 * Tin nhắn trong cuộc hội thoại (User hoặc Assistant)
 */
export interface Message {
  id?: number | string;
  conversation_id?: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: DocumentSource[];
  created_at?: string;
}

/**
 * Cuộc trò chuyện của session
 */
export interface Conversation {
  id: string;
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/**
 * Tài liệu quản trị viên quản lý
 */
export interface AdminDocument {
  id: number;
  title: string;
  doc_type: 'regulation' | 'announcement' | 'form' | 'guide' | 'other' | string;
  issued_date: string | null;
  status: 'processing' | 'active' | 'archived' | 'failed' | string;
  error_message: string | null;
  uploaded_by: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Thông tin quản trị viên đăng nhập
 */
export interface AdminUser {
  id: number;
  email: string;
  created_at?: string;
}

/**
 * Kết quả trả về khi admin đăng nhập thành công
 */
export interface LoginResponse {
  message: string;
  token: string;
  admin: AdminUser;
}
