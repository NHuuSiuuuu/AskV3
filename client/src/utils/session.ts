/**
 * Tiện ích quản lý Session cho người dùng khách (không cần đăng nhập)
 * Session ID được lưu trong cookie, tự động gửi kèm mỗi request qua credentials: 'include'
 */

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
 * Lấy session_id hiện tại từ cookie
 */
export function getStoredSessionId(): string | null {
  return getCookie('session_id');
}

/**
 * Lưu session_id vào cookie
 */
export function storeSessionId(sessionId: string): void {
  setCookie('session_id', sessionId, 30);
}
