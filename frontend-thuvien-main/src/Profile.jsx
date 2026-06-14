import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './App.css'; 
import { clearAuthStorage, getAuthRole, isAdminRole } from './auth';
import { Icon } from './components/Icons';
import PaginationBar from './components/PaginationBar';
import { paginate } from './utils/pagination';

function Profile() {
  const role = getAuthRole();
  const isAdmin = isAdminRole(role);

  // Biến chứa danh sách sách thật kéo từ Backend về
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [reservations, setReservations] = useState([]);
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
  const [loanPage, setLoanPage] = useState(1);
  const [loanPageSize, setLoanPageSize] = useState(8);

  const loanStatusLabelMap = {
    pending: 'Đang chờ duyệt',
    borrowed: 'Đang mượn',
    overdue: 'Quá hạn',
    return_pending: 'Chờ xác nhận trả',
    returned: 'Đã trả',
    cancelled: 'Đã hủy',
    rejected: 'Đã từ chối',
  };

  const getLoanStatusStyle = (status) => {
    const styles = {
      pending: { color: '#e67e22', bg: '#fef5e7' },
      borrowed: { color: '#2980b9', bg: '#ebf5fb' },
      overdue: { color: '#c0392b', bg: '#fdedec' },
      return_pending: { color: '#8e44ad', bg: '#f5eef8' },
      returned: { color: '#27ae60', bg: '#eafaf1' },
      rejected: { color: '#7f8c8d', bg: '#f4f6f7' },
      cancelled: { color: '#7f8c8d', bg: '#f4f6f7' },
    };
    return styles[status] || { color: '#333', bg: '#f9f9f9' };
  };

  const canReturnLoan = (status) => ['borrowed', 'overdue'].includes(status);

  const sortedLoans = [...borrowedBooks].sort((a, b) => String(b.borrow_date || '').localeCompare(String(a.borrow_date || '')) || (b.id || 0) - (a.id || 0));
  const loansPageData = paginate(sortedLoans, loanPage, loanPageSize);
  const pagedLoans = loansPageData.items;

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

  const fetchMyReservations = async () => {
    try {
      const response = await authRequest({
        method: 'get',
        url: 'http://127.0.0.1:8000/api/library/reservations/'
      });
      setReservations(response.data || []);
    } catch (error) {
      console.error("Lỗi khi kéo dữ liệu đặt chỗ:", error);
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
      fetchMyReservations();
    }
    fetchMyProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // ✅ Hàm xử lý trả sách
  const handleReturnBook = async (loanId) => {
    if (!window.confirm('Bạn xác nhận đã trả sách cho thư viện? Thủ thư sẽ xác nhận tiền phạt (nếu có) sau.')) return;
    setIsReturning(loanId);
    try {
      const response = await authRequest({
        method: 'patch',
        url: `http://127.0.0.1:8000/api/loans/loans/${loanId}/return_book/`,
        data: {}
      });
      
      fetchMyBooks();
      alert(response.data?.message || '✅ Đã gửi yêu cầu trả sách. Vui lòng chờ thủ thư xác nhận.');
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

  const overdueLoansCount = borrowedBooks.filter((l) => l.status === 'overdue').length;

  const overdueReservationsCount = reservations.filter((r) => {
    if (!['pending', 'approved', 'checked_in'].includes(r.status)) return false;
    const now = new Date();
    const todayStr = now.toLocaleDateString('sv-SE');
    const currentTimeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    if (r.date < todayStr) return true;
    if (r.date === todayStr && (r.end_time || '').substring(0, 5) < currentTimeStr) return true;
    return false;
  }).length;

  return (
    <div className="container">
      {!isAdmin && (overdueLoansCount > 0 || overdueReservationsCount > 0) && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginBottom: '20px',
          padding: '14px 18px',
          backgroundColor: '#fff5f5',
          border: '1px solid #feb2b2',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(254, 178, 178, 0.15)',
          textAlign: 'left'
        }}>
          <h4 style={{ margin: 0, color: '#c53030', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span> Bạn có thông báo quan trọng cần xử lý:
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
            {overdueLoansCount > 0 && (
              <span style={{ color: '#9b2c2c', fontWeight: 500 }}>
                • Bạn đang có <strong>{overdueLoansCount}</strong> phiếu mượn sách quá hạn trả. Vui lòng hoàn trả sách sớm để tránh tích lũy tiền phạt!
              </span>
            )}
            {overdueReservationsCount > 0 && (
              <span style={{ color: '#9b2c2c', fontWeight: 500 }}>
                • Bạn có <strong>{overdueReservationsCount}</strong> phiếu đặt chỗ ngồi đã quá giờ sử dụng chưa được hoàn tất/check-out! 
                <Link to="/seats" style={{ color: '#c53030', fontWeight: 'bold', marginLeft: '8px', textDecoration: 'underline' }}>
                  Quản lý đặt chỗ
                </Link>
              </span>
            )}
          </div>
        </div>
      )}

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
            <Icon name="book" size={18} />Phiếu mượn
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

      <h3 style={{ textAlign: 'left', marginTop: '40px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}><Icon name="book" size={20} />Phiếu mượn của tôi</h3>
      <p style={{ textAlign: 'left', color: '#666', marginTop: '8px' }}>
        Luồng mượn trả: <strong>Chờ duyệt</strong> → <strong>Đang mượn</strong> → <strong>Trả sách</strong> → Thủ thư xác nhận tiền phạt
      </p>
      
      {borrowedBooks.length > 0 ? (
        <>
          <PaginationBar
            total={sortedLoans.length}
            page={loansPageData.currentPage}
            pageSize={loanPageSize}
            pageCount={loansPageData.pageCount}
            onPageChange={setLoanPage}
            onPageSizeChange={(size) => { setLoanPageSize(size); setLoanPage(1); }}
            pageSizeOptions={[5, 8, 12, 20]}
          />
        <table className="profile-table">
          <thead>
            <tr>
              <th>Mã phiếu</th>
              <th>Sách</th>
              <th>Ngày mượn</th>
              <th>Hạn trả</th>
              <th>Trạng thái</th>
              <th>Tiền phạt</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pagedLoans.map((loan) => {
              const statusStyle = getLoanStatusStyle(loan.status);
              const bookTitles = (loan.loan_details || [])
                .map((d) => `${d.book?.title || 'Sách'} (x${d.quantity})`)
                .join(', ') || 'Không có sách';
              const totalFine = (loan.loan_details || []).reduce(
                (sum, d) => sum + Number(d.fine_amounts || 0), 0
              );

              return (
                <tr key={loan.id} style={{ textAlign: 'center', background: '#fff' }}>
                  <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>#{loan.id}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>{bookTitles}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{loan.borrow_date || 'N/A'}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{loan.due_date || 'N/A'}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      color: statusStyle.color,
                      background: statusStyle.bg,
                    }}>
                      {loan.status_display || loanStatusLabelMap[loan.status] || loan.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold', color: totalFine > 0 ? '#c0392b' : '#2c3e50' }}>
                    {loan.status === 'return_pending' || loan.status === 'returned'
                      ? `${totalFine.toLocaleString('vi-VN')} đ`
                      : loan.status === 'overdue' ? 'Chưa trả' : '-'}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    {canReturnLoan(loan.status) ? (
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
                        {isReturning === loan.id ? '⏳ Đang gửi...' : '📦 Trả sách'}
                      </button>
                    ) : loan.status === 'pending' ? (
                      <span style={{ color: '#e67e22', fontSize: '13px' }}>Chờ thủ thư duyệt</span>
                    ) : loan.status === 'return_pending' ? (
                      <span style={{ color: '#8e44ad', fontSize: '13px' }}>Chờ thủ thư xác nhận</span>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </>
      ) : (
        <p style={{ textAlign: 'left', color: '#666' }}>Bạn chưa có phiếu mượn nào.</p>
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