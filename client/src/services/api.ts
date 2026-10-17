import type {
  Session,
  Conversation,
  Message,
  DocumentSource,
  AdminDocument,
  AdminUser,
  LoginResponse,
} from '../types';

// URL backend được cấu hình qua biến môi trường VITE_API_URL hoặc mặc định dùng http://localhost:3001
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ADMIN_COOKIE_NAME = 'admin_token';

/**
 * Tiện ích quản lý Cookie phía Client
 */
export const cookieUtils = {
  get(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  },

  set(name: string, value: string, days = 7): void {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  },

  remove(name: string): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  },
};

/**
 * Hàm gọi API chung với cấu hình credentials và headers tự động
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Đính kèm token admin nếu có trong Cookie (không dùng localStorage)
  const token = cookieUtils.get(ADMIN_COOKIE_NAME)
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Nếu body không phải FormData thì mặc định là JSON
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Luôn gửi kèm cookie session
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage =
      typeof data === 'object' && data?.message
        ? data.message
        : `Lỗi kết nối máy chủ (${response.status})`;
    throw new Error(errorMessage);
  }

  return data as T;
}

/**
 * ========================================================
 * 1. API DÀNH CHO SESSION (Người dùng thông thường)
 * ========================================================
 */
export const sessionApi = {
  /**
   * Tạo session mới trong database và nhận cookie session
   */
  async createSession(): Promise<Session> {
    try {
      const res = await request<{ data: Session }>('/session/create', {
        method: 'POST',
      });
      return res.data;
    } catch {
      // Hỗ trợ route dự phòng /admin/sessions/create
      const res = await request<{ data: Session }>('/admin/sessions/create', {
        method: 'POST',
      });
      return res.data;
    }
  },
};

/**
 * ========================================================
 * 2. API DÀNH CHO CONVERSATION & CHAT
 * ========================================================
 */
export const conversationApi = {
  /**
   * Lấy danh sách cuộc trò chuyện theo session_id
   */
  async getConversations(sessionId: string): Promise<Conversation[]> {
    const res = await request<{ data: Conversation[] }>(
      `/conversation/session/${encodeURIComponent(sessionId)}`,
      { method: 'GET' }
    );
    return res.data || [];
  },

  /**
   * Tạo cuộc trò chuyện mới thuộc session_id
   */
  async createConversation(sessionId: string): Promise<Conversation> {
    const res = await request<{ data: Conversation }>('/conversation/create', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
    return res.data;
  },

  /**
   * Lấy toàn bộ lịch sử tin nhắn của một cuộc trò chuyện
   */
  async getMessages(conversationId: string): Promise<Message[]> {
    const res = await request<{ data: Message[] }>(
      `/conversation/${encodeURIComponent(conversationId)}/messages`,
      { method: 'GET' }
    );
    return res.data || [];
  },

  /**
   * Gửi câu hỏi cho Gemini AI và nhận câu trả lời cùng nguồn trích dẫn.
   * Nếu chưa có conversationId (cuộc trò chuyện mới), gửi kèm sessionId để backend
   * tự động tạo conversation mới sau khi AI sinh xong câu trả lời.
   */
  async sendMessage(
    conversationId: string | null | undefined,
    question: string,
    sessionId?: string | null,
    model?: string
  ): Promise<{
    conversation?: Conversation;
    conversationId: string;
    answer: string;
    sources: DocumentSource[];
  }> {
    const endpoint =
      conversationId && conversationId !== 'new'
        ? `/conversation/${encodeURIComponent(conversationId)}/messages`
        : `/conversation/messages`;

    return await request<{
      conversation?: Conversation;
      conversationId: string;
      answer: string;
      sources: DocumentSource[];
    }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ question, sessionId, model }),
    });
  },

  /**
   * Xóa một cuộc trò chuyện
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await request(`/conversation/${encodeURIComponent(conversationId)}`, {
      method: 'DELETE',
    });
  },
};

/**
 * ========================================================
 * 3. API DÀNH CHO ADMIN AUTH
 * ========================================================
 */
export const adminAuthApi = {
  /**
   * Đăng nhập quản trị viên bằng email và password
   * Token được lưu vào Cookie, không lưu trong localStorage
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await request<LoginResponse>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
   
    return res;   
  },

  /**
   * Lấy thông tin tài khoản admin hiện tại
   */
  async getMe(): Promise<AdminUser> {
    const res = await request<{ data: AdminUser }>('/admin/me', {
      method: 'GET',
    });
    return res.data;
  },

  /**
   * Đăng xuất quản trị viên: Xoá Cookie và báo backend huỷ session cookie
   */
  logout(): void {
    cookieUtils.remove(ADMIN_COOKIE_NAME);
    try {
      localStorage.removeItem(ADMIN_COOKIE_NAME);
    } catch {
      // Bỏ qua
    }
    // Gửi yêu cầu đăng xuất tới backend để xoá Cookie máy chủ
    request('/admin/logout', { method: 'POST' }).catch(() => {
      // Bỏ qua nếu lỗi mạng
    });
  },

  /**
   * Kiểm tra xem có token admin trong Cookie không (không lưu/đọc ở localStorage)
   */
  isAuthenticated(): boolean {
    const token = cookieUtils.get(ADMIN_COOKIE_NAME) 
    return Boolean(token);
  },
};

/**
 * ========================================================
 * 4. API QUẢN TRỊ TÀI LIỆU (ADMIN DOCUMENTS)
 * ========================================================
 */
export const adminDocumentApi = {
  /**
   * Lấy danh sách tài liệu hiện có
   */
  async getDocuments(): Promise<AdminDocument[]> {
    const res = await request<{ data: AdminDocument[] }>('/admin/documents', {
      method: 'GET',
    });
    return res.data || [];
  },

  /**
   * Upload tài liệu mới (PDF / TXT / DOCX) và sinh vector embedding
   */
  async uploadDocument(formData: FormData): Promise<any> {
    return await request('/admin/documents/create', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Xóa tài liệu khỏi database và các chunk vector
   */
  async deleteDocument(id: number): Promise<void> {
    await request(`/admin/documents/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Cập nhật trạng thái tài liệu: 'processing' | 'active' | 'archived' | 'failed'
   */
  async updateStatus(
    id: number,
    status: 'processing' | 'active' | 'archived' | 'failed'
  ): Promise<any> {
    return await request(`/admin/documents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  /**
   * Lấy đường dẫn xem / tải file công khai (không lộ đường dẫn ổ đĩa)
   */
  getDocumentFileUrl(id: number): string {
    return `${API_BASE}/documents/${id}/file`;
  },
};
