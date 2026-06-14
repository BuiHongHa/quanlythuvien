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
    address: '',
    date_of_birth: '',
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
      setErrorMessage('Mật khẩu nhập lại không khớp!');
      return;
    }

    // Kiểm tra fields bắt buộc
    if (!formData.username || !formData.password || !formData.full_name) {
      setErrorMessage('Vui lòng điền đầy đủ các thông tin bắt buộc!');
      return;
    }

    try {
      await axios.post('http://127.0.0.1:8000/api/core/auth/register/', {
        username: formData.username,
        password: formData.password,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        date_of_birth: formData.date_of_birth || null,
      });

      clearAuthStorage();
      setSuccessMessage('Đăng ký tài khoản thành công! Đang chuyển sang đăng nhập...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      const errorText = error.response?.status === 404
        ? 'Sai endpoint đăng ký hoặc backend chưa chạy.'
        : error.response?.status === 500
          ? 'Backend đang lỗi nội bộ. Vui lòng thử lại sau.'
          : error.response?.data?.detail ||
            error.response?.data?.error ||
            error.response?.data?.username?.[0] ||
            'Đăng ký thất bại!';
      setErrorMessage(errorText);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        <div className="auth-header-wrapper">
          <span className="auth-logo">📝</span>
          <h2 className="auth-heading">Đăng Ký Tài Khoản</h2>
          <p className="auth-subtitle">Tạo tài khoản độc giả thư viện PTIT</p>
        </div>

        {errorMessage && (
          <div className="auth-alert auth-alert-error">
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="auth-alert auth-alert-success">
            <span>✅ {successMessage}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="auth-form">
          <div className="auth-form-grid">
            
            {/* Tên đăng nhập */}
            <div className="auth-input-group">
              <label>👤 Tên đăng nhập <span style={{ color: '#b01e23' }}>*</span></label>
              <input
                type="text"
                name="username"
                placeholder="VD: nongmanhdung123"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            {/* Họ và tên */}
            <div className="auth-input-group">
              <label>👨 Họ và tên <span style={{ color: '#b01e23' }}>*</span></label>
              <input
                type="text"
                name="full_name"
                placeholder="VD: Nông Mạnh Dũng"
                value={formData.full_name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Email */}
            <div className="auth-input-group">
              <label>📧 Email</label>
              <input
                type="email"
                name="email"
                placeholder="VD: name@ptit.edu.vn"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Số điện thoại */}
            <div className="auth-input-group">
              <label>📱 Số điện thoại</label>
              <input
                type="tel"
                name="phone"
                placeholder="VD: 0123456789"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            {/* Ngày sinh */}
            <div className="auth-input-group">
              <label>🎂 Ngày sinh</label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
              />
            </div>

            {/* Địa chỉ */}
            <div className="auth-input-group">
              <label>🏠 Địa chỉ</label>
              <input
                type="text"
                name="address"
                placeholder="VD: Hà Nội"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            {/* Mật khẩu */}
            <div className="auth-input-group">
              <label>🔐 Mật khẩu (ít nhất 6 ký tự) <span style={{ color: '#b01e23' }}>*</span></label>
              <input
                type="password"
                name="password"
                placeholder="Nhập mật khẩu..."
                value={formData.password}
                onChange={handleChange}
                required
                minLength="6"
              />
            </div>

            {/* Xác nhận mật khẩu */}
            <div className="auth-input-group">
              <label>✅ Xác nhận mật khẩu <span style={{ color: '#b01e23' }}>*</span></label>
              <input
                type="password"
                name="password_confirm"
                placeholder="Nhập lại mật khẩu..."
                value={formData.password_confirm}
                onChange={handleChange}
                required
              />
            </div>

          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '12px' }}>
            Tạo Tài Khoản
          </button>
        </form>

        <p className="auth-footer">
          Đã có tài khoản? 
          <Link to="/login">Đăng nhập ngay</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
