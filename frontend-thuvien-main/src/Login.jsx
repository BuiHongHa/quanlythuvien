import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Login() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/login/', credentials);
      
      // 1. Lưu JWT Token
      localStorage.setItem('access_token', response.data.access);
      if (response.data.refresh) localStorage.setItem('refresh_token', response.data.refresh);
      
      // 2. Lưu User Info (Để Navbar biết là ai)
      localStorage.setItem('username', credentials.username);
      // Giả sử API login của bạn trả về role. Nếu không, ta check cứng theo tên (Tạm thời)
      const role = response.data.role || (credentials.username === 'admin' ? 'librarian' : 'reader');
      localStorage.setItem('role', role);

      // 3. Chuyển hướng
      const normalizedRole = role.toString().trim().toLowerCase();
      if (normalizedRole === 'librarian' || normalizedRole === 'admin' || normalizedRole === 'manager' || normalizedRole === 'staff') {
        window.location.href = '/admin'; // Admin bay thẳng vào Dashboard
      } else {
        window.location.href = '/'; // Sinh viên về trang chủ tìm sách
      }
    } catch (error) {
      console.error(error);
      setError('Sai tài khoản hoặc mật khẩu!');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-heading">Đăng Nhập Thư Viện</h2>
        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleLogin} className="auth-form">
          <input
            type="text"
            placeholder="Tên đăng nhập"
            required
            value={credentials.username}
            onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            required
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
          />
          <button type="submit" className="btn-primary">
            Đăng Nhập
          </button>
        </form>

        <p className="auth-footer">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}
export default Login;