import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChatPage } from './pages/ChatPage';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang Chat chính dành cho sinh viên / người dùng (Không cần đăng nhập) */}
        <Route path="/" element={<ChatPage />} />
        <Route path="/chat/:conversationId" element={<ChatPage />} />

        {/* Trang đăng nhập quản trị viên */}
        <Route path="/login" element={<LoginPage />} />

        {/* Trang Dashboard Quản trị tài liệu (Được bảo vệ bởi ProtectedRoute) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Redirect mọi đường dẫn lạ về trang chủ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
