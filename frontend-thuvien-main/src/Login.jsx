import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
      const role = response.data.role || (credentials.username === 'admin' ? 'LIBRARIAN' : 'STUDENT');
      localStorage.setItem('user_role', role);

      // 3. Chuyển hướng
      if (role === 'LIBRARIAN') {
        window.location.href = '/admin'; // Admin bay thẳng vào Dashboard
      } else {
        window.location.href = '/'; // Sinh viên về trang chủ tìm sách
      }
    } catch (err) {
      setError('Sai tài khoản hoặc mật khẩu!');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', background: 'white' }}>
      <h2 style={{ textAlign: 'center', color: '#b01e23' }}>Đăng Nhập Thư Viện</h2>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="text" placeholder="Tên đăng nhập" required 
          value={credentials.username} 
          onChange={(e) => setCredentials({...credentials, username: e.target.value})} 
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input 
          type="password" placeholder="Mật khẩu" required 
          value={credentials.password} 
          onChange={(e) => setCredentials({...credentials, password: e.target.value})} 
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '12px', background: '#b01e23', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Đăng Nhập
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '15px' }}>
        Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
      </p>
    </div>
  );
}
export default Login;