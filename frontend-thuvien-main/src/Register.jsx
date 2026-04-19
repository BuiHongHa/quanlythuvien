import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './App.css';
import { clearAuthStorage } from './auth';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    password_confirm: '',
    full_name: '',
    email: '',
    phone: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Kiểm tra password khớp
    if (formData.password !== formData.password_confirm) {
      setErrorMessage('Mật khẩu không khớp!');
      return;
    }

    // Kiểm tra fields bắt buộc
    if (!formData.username || !formData.password || !formData.full_name) {
      setErrorMessage('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    try {
      await axios.post('http://127.0.0.1:8000/api/core/auth/register/', {
        username: formData.username,
        password: formData.password,
        full_name: formData.full_name,
        email: formData.email,
      });

      clearAuthStorage();
      setSuccessMessage('✅ Đăng ký thành công! Chuyển sang đăng nhập...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      const errorText = error.response?.status === 404
        ? 'Sai endpoint đăng ký hoặc backend chưa chạy.'
        : error.response?.status === 500
          ? 'Backend đang lỗi nội bộ (AssertionError). Vui lòng báo nhóm backend sửa serializer đăng ký.'
          : error.response?.data?.detail ||
            error.response?.data?.error ||
            error.response?.data?.username?.[0] ||
            'Đăng ký thất bại!';
      setErrorMessage('❌ ' + errorText);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '500px', marginTop: '40px' }}>
      <div style={{ padding: '30px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', color: '#b01e23', marginBottom: '25px' }}>
          📝 Đăng Ký Tài Khoản
        </h2>

        {errorMessage && (
          <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '6px', marginBottom: '15px', textAlign: 'center' }}>
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '12px', borderRadius: '6px', marginBottom: '15px', textAlign: 'center' }}>
            {successMessage}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* Username */}
          <div>
            <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
              👤 Tên đăng nhập:
            </label>
            <input
              type="text"
              name="username"
              placeholder="VD: nongmanhdung123"
              value={formData.username}
              onChange={handleChange}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          {/* Full Name */}
          <div>
            <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
              👨 Họ và tên: <span style={{ color: '#999' }}>(bắt buộc)</span>
            </label>
            <input
              type="text"
              name="full_name"
              placeholder="VD: Nông Mạnh Dũng"
              value={formData.full_name}
              onChange={handleChange}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          {/* Email */}
          <div>
            <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
              📧 Email: <span style={{ color: '#999' }}>(tuỳ chọn)</span>
            </label>
            <input
              type="email"
              name="email"
              placeholder="VD: nongmanhdung@ptit.edu.vn"
              value={formData.email}
              onChange={handleChange}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* Phone */}
          <div>
            <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
              📱 Số điện thoại: <span style={{ color: '#999' }}>(tuỳ chọn)</span>
            </label>
            <input
              type="tel"
              name="phone"
              placeholder="VD: 0123456789"
              value={formData.phone}
              onChange={handleChange}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
              🔐 Mật khẩu: <span style={{ color: '#999' }}>(6+ ký tự)</span>
            </label>
            <input
              type="password"
              name="password"
              placeholder="Nhập mật khẩu..."
              value={formData.password}
              onChange={handleChange}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
              required
              minLength="6"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
              ✅ Xác nhận mật khẩu:
            </label>
            <input
              type="password"
              name="password_confirm"
              placeholder="Nhập lại mật khẩu..."
              value={formData.password_confirm}
              onChange={handleChange}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            style={{ 
              padding: '14px', 
              background: '#b01e23', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '1.1rem', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              marginTop: '10px',
              transition: '0.3s'
            }}
            onMouseOver={(e) => e.target.style.background = '#8b1619'}
            onMouseOut={(e) => e.target.style.background = '#b01e23'}
          >
            Tạo Tài Khoản
          </button>
        </form>

        {/* Link to Login */}
        <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
          Đã có tài khoản? 
          <Link to="/login" style={{ color: '#b01e23', textDecoration: 'none', fontWeight: 'bold', marginLeft: '5px' }}>
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
