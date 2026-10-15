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

const ADMIN_TOKEN_KEY = 'h_ask_admin_token';

/**
 * Hàm gọi API chung với cấu hình credentials và headers tự động
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Đính kèm token admin nếu có
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
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
    sessionId?: string | null
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
      body: JSON.stringify({ question, sessionId }),
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
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await request<LoginResponse>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, res.token);
    }
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
   * Đăng xuất quản trị viên
   */
  logout(): void {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  },

  /**
   * Kiểm tra xem có token admin trong storage không
   */
  isAuthenticated(): boolean {
    return Boolean(localStorage.getItem(ADMIN_TOKEN_KEY));
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
   * Lấy đường dẫn xem / tải file công khai (không lộ đường dẫn ổ đĩa)
   */
  getDocumentFileUrl(id: number): string {
    return `${API_BASE}/documents/${id}/file`;
  },
};
