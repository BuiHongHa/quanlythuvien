import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Công cụ gọi API
import { Link } from 'react-router-dom';
import './App.css'; 
import { clearAuthStorage, getAuthRole, isAdminRole } from './auth';
import { Icon } from './components/Icons';

function Profile() {
  const role = getAuthRole();
  const isAdmin = isAdminRole(role);

  // Biến chứa danh sách sách thật kéo từ Backend về
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [isReturning, setIsReturning] = useState(null); // Track which loan is being returned
  const [activeTab, setActiveTab] = useState(isAdmin ? 'profile' : 'loans'); // Tab: loans | profile | password
  
  // Tự động lấy tên tài khoản từ lúc Đăng nhập
  const username = localStorage.getItem('username') || 'Khách';

  // State cho cập nhật profile
  const [profileData, setProfileData] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: '',
    role: ''
  });

  // State cho đổi mật khẩu
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [message, setMessage] = useState({ type: '', text: '' });

  const logoutAndRedirect = () => {
    clearAuthStorage();
    window.location.href = '/login';
  };

  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return null;

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/token/refresh/', {
        refresh: refreshToken
      });
      const newAccessToken = response.data?.access;
      if (!newAccessToken) return null;
      localStorage.setItem('access_token', newAccessToken);
      return newAccessToken;
    } catch {
      return null;
    }
  };

  const authRequest = async (config) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      logoutAndRedirect();
      throw new Error('NO_ACCESS_TOKEN');
    }

    try {
      return await axios({
        ...config,
        headers: {
          ...(config.headers || {}),
          Authorization: `Bearer ${accessToken}`
        }
      });
    } catch (error) {
      const statusCode = error.response?.status;
      if (statusCode !== 401 && statusCode !== 403) throw error;

      const newAccessToken = await refreshAccessToken();
      if (!newAccessToken) {
        logoutAndRedirect();
        throw error;
      }

      return axios({
        ...config,
        headers: {
          ...(config.headers || {}),
          Authorization: `Bearer ${newAccessToken}`
        }
      });
    }
  };

  // ✅ Hàm tải lại danh sách sách
  const fetchMyBooks = async () => {
    try {
      const response = await authRequest({
        method: 'get',
        url: 'http://127.0.0.1:8000/api/loans/loans/'
      });
      setBorrowedBooks(response.data);
    } catch (error) {
      console.error("Lỗi khi kéo dữ liệu mượn sách:", error);
    }
  };

  const fetchMyProfile = async () => {
    try {
      const response = await authRequest({
        method: 'get',
        url: 'http://127.0.0.1:8000/api/core/users/profile/'
      });

      setProfileData({
        username: response.data?.username || localStorage.getItem('username') || '',
        full_name: response.data?.full_name || '',
        email: response.data?.email || '',
        phone: response.data?.phone || '',
        address: response.data?.address || '',
        date_of_birth: response.data?.date_of_birth || '',
        role: response.data?.role || ''
      });
    } catch (error) {
      console.error('Lỗi khi tải hồ sơ:', error);
    }
  };

  // useEffect sẽ tự động chạy 1 lần ngay khi mở trang Cá nhân
  useEffect(() => {
    if (!isAdmin) {
      fetchMyBooks();
    }
    fetchMyProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // ✅ Hàm xử lý trả sách
  const handleReturnBook = async (loanId) => {
    setIsReturning(loanId);
    try {
      await authRequest({
        method: 'patch',
        url: `http://127.0.0.1:8000/api/loans/loans/${loanId}/return_book/`,
        data: {}
      });
      
      // ✅ Reload data sau khi trả sách
      fetchMyBooks();
      alert('✅ Trả sách thành công!');
    } catch (error) {
      console.error('Lỗi khi trả sách:', error);
      alert('❌ Trả sách thất bại! ' + (error.response?.data?.error || ''));
    } finally {
      setIsReturning(null);
    }
  };

  // ✅ Hàm cập nhật hồ sơ
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    try {
      await authRequest({
        method: 'patch',
        url: 'http://127.0.0.1:8000/api/core/users/profile/',
        data: profileData
      });
      setMessage({ type: 'success', text: '✅ Cập nhật hồ sơ thành công!' });
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Cập nhật thất bại: ' + (error.response?.data?.detail || '') });
    }
  };

  // ✅ Hàm đổi mật khẩu
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: '❌ Mật khẩu mới không khớp!' });
      return;
    }

    try {
      await authRequest({
        method: 'post',
        url: 'http://127.0.0.1:8000/api/core/change-password/',
        data: {
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        }
      });
      setMessage({ type: 'success', text: '✅ Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' });
      setTimeout(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('isLoggedIn');
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Đổi mật khẩu thất bại: ' + (error.response?.data?.detail || '') });
    }
  };

  return (
    <div className="container">
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
        {!isAdmin && (
          <button 
            onClick={() => setActiveTab('loans')}
            style={{
              padding: '12px 20px',
              background: activeTab === 'loans' ? '#b01e23' : '#f0f0f0',
              color: activeTab === 'loans' ? 'white' : '#333',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              borderRadius: '4px 4px 0 0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Icon name="book" size={18} />Sách Đang Mượn
          </button>
        )}
        <button 
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '12px 20px',
            background: activeTab === 'profile' ? '#b01e23' : '#f0f0f0',
            color: activeTab === 'profile' ? 'white' : '#333',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            borderRadius: '4px 4px 0 0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isAdmin ? <><Icon name="admin" size={18} /> Thông Tin Quản Lý</> : <><Icon name="user" size={18} /> Cập Nhật Hồ Sơ</>}
        </button>
        <button 
          onClick={() => setActiveTab('password')}
          style={{
            padding: '12px 20px',
            background: activeTab === 'password' ? '#b01e23' : '#f0f0f0',
            color: activeTab === 'password' ? 'white' : '#333',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            borderRadius: '4px 4px 0 0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Icon name="lock" size={18} />Đổi Mật Khẩu
        </button>
      </div>

      {/* TAB 1: LOANS */}
      {activeTab === 'loans' && !isAdmin && (
        <>
          <h2 style={{ textAlign: 'left', borderBottom: '2px solid #b01e23', paddingBottom: '10px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="user" size={22} />Thông tin cá nhân
          </h2>
      
      <div className="profile-info" style={{ textAlign: 'left', margin: '20px 0', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <p><strong>Tên tài khoản:</strong> {profileData.username || username}</p>
        <p><strong>Họ và tên:</strong> {profileData.full_name || 'Chưa cập nhật'}</p>
        <p><strong>Email:</strong> {profileData.email || 'Chưa có'}</p>
        <p><strong>Số điện thoại:</strong> {profileData.phone || 'Chưa có'}</p>
        <p><strong>Địa chỉ:</strong> {profileData.address || 'Chưa có'}</p>
        <p><strong>Ngày sinh:</strong> {profileData.date_of_birth || 'Chưa có'}</p>
        <p><strong>Vai trò:</strong> {profileData.role || 'reader'}</p>
      </div>

      <h3 style={{ textAlign: 'left', marginTop: '40px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}><Icon name="book" size={20} />Sách đang mượn</h3>
      
      {borrowedBooks.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
          <thead>
            <tr style={{ background: '#b01e23', color: 'white' }}>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Tên sách</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Ngày mượn</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Hạn trả</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Trạng thái</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Tiền phạt</th>
              <th style={{ padding: '12px', border: '1px solid #ddd' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {borrowedBooks.map((loan) => (
              // ✓ FIX: Loop qua loan_details array để lấy book info
              loan.loan_details && loan.loan_details.length > 0 ? (
                loan.loan_details.map((detail, index) => (
                  <tr key={index} style={{ textAlign: 'center', background: '#fff' }}>
                    <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>
                      {detail.book?.title || "Tên sách"}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{loan.borrow_date || "N/A"}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{loan.due_date || "N/A"}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', color: loan.status === 'returned' ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>
                      {loan.status === 'borrowed' ? '📕 Đã mượn' : loan.status === 'returned' ? '✅ Đã trả' : '⚠️ Quá hạn'}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', color: Number(detail.fine_amounts || 0) > 0 ? '#c0392b' : '#2c3e50' }}>
                      {Number(detail.fine_amounts || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {loan.status === 'borrowed' ? (
                        <button 
                          onClick={() => handleReturnBook(loan.id)}
                          disabled={isReturning === loan.id}
                          style={{
                            background: isReturning === loan.id ? '#ccc' : '#27ae60',
                            color: 'white',
                            border: 'none',
                            padding: '8px 15px',
                            borderRadius: '4px',
                            cursor: isReturning === loan.id ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          {isReturning === loan.id ? '⏳ Đang xử lý...' : '📦 Trả sách'}
                        </button>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr key={loan.id} style={{ textAlign: 'center', background: '#fff' }}>
                  <td colSpan="6" style={{ padding: '12px', border: '1px solid #ddd' }}>Không có thông tin sách</td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ textAlign: 'left', color: '#666' }}>Bạn hiện không mượn cuốn sách nào hoặc chưa có dữ liệu từ hệ thống.</p>
      )}
        </>
      )}

      {activeTab === 'profile' && isAdmin && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#b01e23', marginBottom: '25px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="admin" size={26} />Thông Tin Quản Lý
          </h2>

          <div className="profile-info" style={{ textAlign: 'left', margin: '20px 0', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <p><strong>Tên tài khoản:</strong> {profileData.username || username}</p>
            <p><strong>Họ và tên:</strong> {profileData.full_name || 'Chưa cập nhật'}</p>
            <p><strong>Email:</strong> {profileData.email || 'Chưa có'}</p>
            <p><strong>Số điện thoại:</strong> {profileData.phone || 'Chưa có'}</p>
            <p><strong>Địa chỉ:</strong> {profileData.address || 'Chưa có'}</p>
            <p><strong>Ngày sinh:</strong> {profileData.date_of_birth || 'Chưa có'}</p>
            <p><strong>Vai trò:</strong> {profileData.role || 'reader'}</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <Link
              to="/admin"
              style={{
                padding: '12px 18px',
                background: '#b01e23',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Icon name="admin" size={18} />Đi tới trang quản lý
            </Link>
          </div>

          {message.text && (
            <div style={{
              background: message.type === 'success' ? '#e8f5e9' : '#ffebee',
              color: message.type === 'success' ? '#2e7d32' : '#c62828',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
                Họ và tên:
              </label>
              <input
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
                Email:
              </label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
                Số điện thoại:
              </label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
                Địa chỉ:
              </label>
              <input
                type="text"
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
                Ngày sinh:
              </label>
              <input
                type="date"
                value={profileData.date_of_birth}
                onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              style={{
                padding: '12px',
                background: '#b01e23',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Icon name="check" size={18} />Lưu Thay Đổi
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: PROFILE */}
      {activeTab === 'profile' && !isAdmin && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#b01e23', marginBottom: '25px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="user" size={24} />Cập Nhật Hồ Sơ
          </h2>

          {message.text && (
            <div style={{
              background: message.type === 'success' ? '#e8f5e9' : '#ffebee',
              color: message.type === 'success' ? '#2e7d32' : '#c62828',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
                Tên tài khoản:
              </label>
              <input
                type="text"
                value={profileData.username}
                disabled
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', background: '#f5f5f5' }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
                Họ và tên:
              </label>
              <input
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
                Email:
              </label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
                Số điện thoại:
              </label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
                Địa chỉ:
              </label>
              <input
                type="text"
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
                Ngày sinh:
              </label>
              <input
                type="date"
                value={profileData.date_of_birth}
                onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              style={{
                padding: '12px',
                background: '#b01e23',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Icon name="check" size={18} />Lưu Thay Đổi
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: PASSWORD */}
      {activeTab === 'password' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#b01e23', marginBottom: '25px' }}>
            🔐 Đổi Mật Khẩu
          </h2>

          {message.text && (
            <div style={{
              background: message.type === 'success' ? '#e8f5e9' : '#ffebee',
              color: message.type === 'success' ? '#2e7d32' : '#c62828',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
                Mật khẩu hiện tại:
              </label>
              <input
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                placeholder="Nhập mật khẩu hiện tại..."
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
                Mật khẩu mới:
              </label>
              <input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                placeholder="Nhập mật khẩu mới..."
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                required
                minLength="6"
              />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' }}>
                Xác nhận mật khẩu mới:
              </label>
              <input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                placeholder="Nhập lại mật khẩu mới..."
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                required
              />
            </div>

            <button
              type="submit"
              style={{
                padding: '12px',
                background: '#b01e23',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              ✅ Đổi Mật Khẩu
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Profile;