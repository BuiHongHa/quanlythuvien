import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Login() {
  const [mode, setMode] = useState('login'); // 'login' or 'forgot'
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  // Forgot password form state
  const [forgotData, setForgotData] = useState({
    username: '',
    email: '',
    phone: '',
    new_password: '',
    confirm_password: '',
  });
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/login/', credentials);
      
      // 1. Lưu JWT Token
      localStorage.setItem('access_token', response.data.access);
      if (response.data.refresh) localStorage.setItem('refresh_token', response.data.refresh);
      
      // 2. Lưu User Info
      localStorage.setItem('username', credentials.username);
      
      // Sử dụng role trả về trực tiếp từ API (hoặc fallback thủ thư cho tài khoản admin)
      const role = response.data.role || (credentials.username === 'admin' ? 'librarian' : 'reader');
      localStorage.setItem('role', role);

      // 3. Chuyển hướng
      const normalizedRole = role.toString().trim().toLowerCase();
      if (normalizedRole === 'librarian' || normalizedRole === 'admin' || normalizedRole === 'staff') {
        window.location.href = '/admin'; // Thủ thư/Admin bay thẳng vào Dashboard
      } else {
        window.location.href = '/'; // Độc giả về trang chủ
      }
    } catch (error) {
      console.error(error);
      setError('Sai tài khoản hoặc mật khẩu!');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (forgotData.new_password !== forgotData.confirm_password) {
      setForgotError('Mật khẩu nhập lại không khớp!');
      return;
    }

    if (forgotData.new_password.length < 6) {
      setForgotError('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/core/forgot-password/', {
        username: forgotData.username,
        email: forgotData.email,
        phone: forgotData.phone,
        new_password: forgotData.new_password,
      });

      setForgotSuccess(response.data.detail || 'Khôi phục mật khẩu thành công!');
      
      // Tự động chuyển về màn hình đăng nhập sau 2.5s
      setTimeout(() => {
        setCredentials({ username: forgotData.username, password: '' });
        setMode('login');
        // Reset dữ liệu forgot
        setForgotData({
          username: '',
          email: '',
          phone: '',
          new_password: '',
          confirm_password: '',
        });
        setForgotSuccess('');
      }, 2500);
    } catch (err) {
      console.error(err);
      setForgotError(err.response?.data?.detail || 'Thông tin xác thực không đúng. Vui lòng kiểm tra lại!');
    }
  };

  return (
    <div className="auth-container">
      {mode === 'login' ? (
        <div className="auth-card">
          <div className="auth-header-wrapper">
            <span className="auth-logo">📚</span>
            <h2 className="auth-heading">Đăng Nhập Thư Viện</h2>
            <p className="auth-subtitle">Chào mừng bạn quay trở lại với thư viện PTIT</p>
          </div>

          {error && (
            <div className="auth-alert auth-alert-error">
              <span>⚠️ {error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-input-group">
              <label>👤 Tên đăng nhập</label>
              <input
                type="text"
                placeholder="Nhập tên tài khoản..."
                required
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              />
            </div>

            <div className="auth-input-group">
              <label>🔑 Mật khẩu</label>
              <input
                type="password"
                placeholder="Nhập mật khẩu..."
                required
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              />
            </div>

            <div className="auth-action-row">
              <a
                href="#forgot-password"
                className="auth-link-forgot"
                onClick={(e) => {
                  e.preventDefault();
                  setMode('forgot');
                  setError('');
                }}
              >
                Quên mật khẩu?
              </a>
            </div>

            <button type="submit" className="btn-primary">
              Đăng Nhập
            </button>
          </form>

          <p className="auth-footer">
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </p>
        </div>
      ) : (
        <div className="auth-card">
          <div className="auth-header-wrapper">
            <span className="auth-logo">🔒</span>
            <h2 className="auth-heading">Quên Mật Khẩu</h2>
            <p className="auth-subtitle">Điền thông tin tài khoản để thiết lập lại mật khẩu</p>
          </div>

          {forgotError && (
            <div className="auth-alert auth-alert-error">
              <span>⚠️ {forgotError}</span>
            </div>
          )}

          {forgotSuccess && (
            <div className="auth-alert auth-alert-success">
              <span>✅ {forgotSuccess}</span>
            </div>
          )}

          <form onSubmit={handleForgotPassword} className="auth-form">
            <div className="auth-input-group">
              <label>👤 Tên đăng nhập</label>
              <input
                type="text"
                placeholder="Tên đăng nhập của bạn..."
                required
                value={forgotData.username}
                onChange={(e) => setForgotData({ ...forgotData, username: e.target.value })}
              />
            </div>

            <div className="auth-input-group">
              <label>📧 Email đăng ký</label>
              <input
                type="email"
                placeholder="Địa chỉ email đã đăng ký..."
                required
                value={forgotData.email}
                onChange={(e) => setForgotData({ ...forgotData, email: e.target.value })}
              />
            </div>

            <div className="auth-input-group">
              <label>📱 Số điện thoại</label>
              <input
                type="tel"
                placeholder="Số điện thoại đã đăng ký..."
                required
                value={forgotData.phone}
                onChange={(e) => setForgotData({ ...forgotData, phone: e.target.value })}
              />
            </div>

            <div className="auth-input-group">
              <label>🔑 Mật khẩu mới (ít nhất 6 ký tự)</label>
              <input
                type="password"
                placeholder="Thiết lập mật khẩu mới..."
                required
                value={forgotData.new_password}
                onChange={(e) => setForgotData({ ...forgotData, new_password: e.target.value })}
              />
            </div>

            <div className="auth-input-group">
              <label>✅ Xác nhận mật khẩu mới</label>
              <input
                type="password"
                placeholder="Nhập lại mật khẩu mới..."
                required
                value={forgotData.confirm_password}
                onChange={(e) => setForgotData({ ...forgotData, confirm_password: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
              Xác Nhận Đặt Lại Mật Khẩu
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setMode('login');
                setForgotError('');
                setForgotSuccess('');
              }}
            >
              Quay lại Đăng nhập
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Login;