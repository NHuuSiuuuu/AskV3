/**
 * Tiện ích quản lý Session cho người dùng khách (không cần đăng nhập)
 */

const SESSION_STORAGE_KEY = 'h_ask_session_id';

/**
 * Đọc cookie theo tên
 */
function getCookie(name: string): string | null {
  const matches = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)')
  );
  return matches ? decodeURIComponent(matches[1]) : null;
}

/**
 * Ghi cookie
 */
function setCookie(name: string, value: string, days = 30) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${date.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Lấy session_id hiện tại từ cookie hoặc localStorage dự phòng
 */
export function getStoredSessionId(): string | null {
  // Ưu tiên đọc từ cookie
  const cookieSession = getCookie('session_id');
  if (cookieSession) {
    return cookieSession;
  }
  // Dự phòng từ localStorage
  return localStorage.getItem(SESSION_STORAGE_KEY);
}

/**
 * Lưu session_id vào cả cookie và localStorage
 */
export function storeSessionId(sessionId: string): void {
  setCookie('session_id', sessionId, 30);
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
}
