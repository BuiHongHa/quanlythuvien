import { useEffect, useState } from 'react'
import axios from 'axios'
import { BrowserRouter, Routes, Route, Link, useParams, NavLink, Navigate } from 'react-router-dom'
import './App.css'
import Profile from './Profile';
import Login from './Login';
import Register from './Register';
import SeatBooking from './SeatBooking';
import AdminDashboard from './AdminDashboard';
import PaginationBar from './components/PaginationBar';
import { paginate } from './utils/pagination';
import { clearAuthStorage, getAuthRole, isAdminRole } from './auth';
import { Icon } from './components/Icons';

function RoleRoute({ isLoggedIn, role, allowedRoles, fallbackPath, children }) {
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={fallbackPath || (role === 'librarian' ? '/admin' : '/dashboard')} replace />;
  }

  return children;
}

const getMediaUrl = (coverImage) => {
  if (!coverImage) return null;
  if (coverImage.startsWith('http://') || coverImage.startsWith('https://')) return coverImage;
  if (coverImage.startsWith('/')) return `http://127.0.0.1:8000${coverImage}`;
  return `http://127.0.0.1:8000/${coverImage}`;
};

// ==========================================
// COMPONENT 1: TRANG CHỦ (Danh sách & Tìm kiếm)
// ==========================================
function Home() {
  const [books, setBooks] = useState([])
  const [categories, setCategories] = useState([])
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [borrowCart, setBorrowCart] = useState([])
  const [borrowDuration, setBorrowDuration] = useState(14)
  const [borrowMessage, setBorrowMessage] = useState({ type: '', text: '' })
  const [borrowing, setBorrowing] = useState(false)
  const [bookPage, setBookPage] = useState(1)
  const [bookPageSize, setBookPageSize] = useState(12)

  const loadHomeData = () => {
    return Promise.all([
      axios.get('http://127.0.0.1:8000/api/books/books/'),
      axios.get('http://127.0.0.1:8000/api/books/categories/')
    ])
      .then(([bookResponse, categoryResponse]) => {
        if (Array.isArray(bookResponse.data)) setBooks(bookResponse.data)
        else setError("Backend trả về dữ liệu không đúng định dạng.")

        if (Array.isArray(categoryResponse.data)) setCategories(categoryResponse.data)
      })
      .catch(() => setError("Không thể kết nối đến Backend."));
  };

  useEffect(() => {
    loadHomeData();
  }, [])

  const getCategoryName = (book) => {
    if (book?.category_name) return book.category_name;
    return categories.find((x) => Number(x.id) === Number(book?.category))?.name || 'Chưa phân loại';
  };

  const filteredBooks = books.filter(book => {
    // Chuyển về chữ thường, nếu không có dữ liệu thì mặc định là chuỗi trống ''
    const title = (book?.title || '').toLowerCase();
    const author = (book?.author || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = title.includes(search) || author.includes(search);
    const matchesCategory = !selectedCategory || Number(book?.category) === Number(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  const booksPageData = paginate(filteredBooks, bookPage, bookPageSize);
  const pagedBooks = booksPageData.items;

  useEffect(() => {
    setBookPage(1);
  }, [searchTerm, selectedCategory]);

  const addBookToCart = (book) => {
    if (!book?.is_available || Number(book?.available_quantity || 0) <= 0) {
      setBorrowMessage({ type: 'error', text: 'Sách này hiện không còn để mượn.' });
      return;
    }
    setBorrowMessage({ type: '', text: '' });
    setBorrowCart((prev) => {
      const found = prev.find((item) => Number(item.book) === Number(book.id));
      if (found) {
        const nextQty = Math.min(found.quantity + 1, Number(book.available_quantity || 1));
        return prev.map((item) => item.book === book.id ? { ...item, quantity: nextQty } : item);
      }
      return [...prev, { book: book.id, title: book.title, quantity: 1, max: Number(book.available_quantity || 1) }];
    });
  };

  const removeBookFromCart = (bookId) => {
    setBorrowCart((prev) => prev.filter((item) => Number(item.book) !== Number(bookId)));
  };

  const updateCartQuantity = (bookId, nextValue) => {
    const parsed = Number(nextValue);
    setBorrowCart((prev) => prev.map((item) => {
      if (Number(item.book) !== Number(bookId)) return item;
      const quantity = Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(parsed, item.max));
      return { ...item, quantity };
    }));
  };

  const handleBorrowManyBooks = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setBorrowMessage({ type: 'error', text: '⚠️ Vui lòng đăng nhập trước khi mượn sách.' });
      return;
    }
    if (borrowCart.length === 0) {
      setBorrowMessage({ type: 'error', text: 'Vui lòng thêm ít nhất 1 sách vào phiếu mượn.' });
      return;
    }

    setBorrowing(true);
    setBorrowMessage({ type: '', text: '' });
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/loans/loans/', {
        items: borrowCart.map((item) => ({ book: item.book, quantity: Number(item.quantity) || 1 })),
        borrow_duration: Number(borrowDuration) || 14
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setBorrowMessage({ type: 'success', text: `✅ ${response.data?.message || 'Yêu cầu mượn sách đã được gửi và đang chờ duyệt!'}` });
      setBorrowCart([]);
      await loadHomeData();
    } catch (borrowError) {
      const errorText = borrowError.response?.data?.error || borrowError.response?.data?.detail || 'Mượn sách thất bại!';
      setBorrowMessage({ type: 'error', text: `❌ ${errorText}` });
    } finally {
      setBorrowing(false);
    }
  };

  return (
    <div className="container">
      <div className="search-box">
        <input
          type="text"
          placeholder="Nhập tên sách hoặc tác giả để tìm kiếm..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="search-box" style={{ marginTop: '-20px', marginBottom: '28px' }}>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ width: '100%', maxWidth: '360px', padding: '12px 16px', borderRadius: '12px', border: '2px solid #ddd', fontSize: '15px' }}
        >
          <option value="">📚 Tất cả thể loại</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </div>
      
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

      <div style={{ marginBottom: '18px', background: '#fff', border: '1px solid #e6e6e6', borderRadius: '10px', padding: '14px' }}>
        <h3 style={{ marginTop: 0, color: '#b01e23' }}>Phiếu mượn nhanh ({borrowCart.length} sách)</h3>
        {borrowMessage.text && (
          <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '6px', background: borrowMessage.type === 'success' ? '#e8f5e9' : '#ffebee', color: borrowMessage.type === 'success' ? '#2e7d32' : '#c62828' }}>
            {borrowMessage.text}
          </div>
        )}
        {borrowCart.length === 0 ? (
          <p style={{ margin: 0, color: '#666' }}>Bấm "Thêm vào phiếu mượn" ở thẻ sách để gom nhiều sách vào một lần mượn.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {borrowCart.map((item, index) => (
              <div key={item.book} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ minWidth: '30px', color: '#666' }}>{index + 1}.</span>
                <span style={{ flex: 1, minWidth: '180px' }}>{item.title}</span>
                <input
                  type="number"
                  min="1"
                  max={item.max}
                  value={item.quantity}
                  onChange={(e) => updateCartQuantity(item.book, e.target.value)}
                  style={{ width: '74px', padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}
                />
                <button type="button" onClick={() => removeBookFromCart(item.book)} style={{ padding: '6px 10px', border: 'none', borderRadius: '6px', background: '#dc3545', color: '#fff', cursor: 'pointer' }}>
                  Bỏ
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <label><strong>Thời gian mượn:</strong></label>
          <select value={borrowDuration} onChange={(e) => setBorrowDuration(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
            <option value={7}>7 ngày</option>
            <option value={14}>14 ngày</option>
            <option value={21}>21 ngày</option>
            <option value={30}>30 ngày</option>
          </select>
          <button type="button" disabled={borrowing} onClick={handleBorrowManyBooks} style={{ padding: '10px 14px', border: 'none', borderRadius: '6px', background: '#b01e23', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
            {borrowing ? 'Đang gửi...' : 'Gửi yêu cầu mượn sách'}
          </button>
        </div>
      </div>
      
      {filteredBooks.length > 0 && (
        <PaginationBar
          total={filteredBooks.length}
          page={booksPageData.currentPage}
          pageSize={bookPageSize}
          pageCount={booksPageData.pageCount}
          onPageChange={setBookPage}
          onPageSizeChange={(size) => { setBookPageSize(size); setBookPage(1); }}
          pageSizeOptions={[8, 12, 16, 24]}
          className="home-pagination"
        />
      )}

      <div className="book-grid">
        {filteredBooks && filteredBooks.length > 0 ? (
          pagedBooks.map(book => (
            <Link to={`/book/${book.id}`} key={book.id} className="book-card-link">
              <div className="book-card">
                {book?.cover_image && (
                  <div style={{ marginBottom: '12px', textAlign: 'center', background: '#f5f5f5', border: '1px solid #eee', borderRadius: '8px', padding: '8px' }}>
                    <img
                      src={getMediaUrl(book.cover_image)}
                      alt={book?.title || 'Bia sach'}
                      style={{ width: '100%', height: '180px', objectFit: 'contain', borderRadius: '6px' }}
                    />
                  </div>
                )}
                {/* Thêm dấu ? sau book để an toàn tuyệt đối */}
                <h3>{book?.title || "Không có tên"}</h3>
                <p><strong>Thể loại:</strong> {getCategoryName(book)}</p>
                <p><strong>Tác giả:</strong> {book?.author || "Chưa rõ"}</p>
                <p><strong>Năm XB:</strong> {book?.published_year || "N/A"}</p>
                <span className={book?.is_available ? "status green" : "status red"}>
                  {book?.is_available ? "Còn sách" : "Đã cho mượn"}
                </span>
                <div style={{ marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); addBookToCart(book); }}
                    disabled={!book?.is_available}
                    style={{ padding: '8px 10px', borderRadius: '6px', border: 'none', background: book?.is_available ? '#0056b3' : '#9e9e9e', color: '#fff', fontWeight: 'bold', cursor: book?.is_available ? 'pointer' : 'not-allowed' }}
                  >
                    Thêm vào phiếu mượn
                  </button>
                </div>
              </div>
            </Link>
          ))
        ) : (
          !error && <p className="temp-page"><Icon name="search" size={18} className="temp-icon" />Không tìm thấy cuốn sách nào phù hợp với bộ lọc hiện tại</p>
        )}
      </div>
    </div>
  )
}

// ==========================================
// COMPONENT 2: TRANG CHI TIẾT SÁCH (NGHIỆP VỤ MƯỢN SÁCH)
// ==========================================
function BookDetail() {
  const { id } = useParams() // Lấy ID cuốn sách từ trên thanh địa chỉ URL
  const [book, setBook] = useState(null)
  const [showModal, setShowModal] = useState(false) // Hiển thị/ẩn modal mượn sách
  const [borrowForm, setBorrowForm] = useState({
    quantity: 1,
    borrow_duration: 14 // Mặc định mượn 14 ngày
  })
  const [message, setMessage] = useState({ type: '', text: '' }) // Thông báo thành công/lỗi
  const [isLoading, setIsLoading] = useState(false) // Trạng thái đang gửi request

  useEffect(() => {
    // Gọi Backend để lấy thông tin chi tiết của ĐÚNG cuốn sách có ID này
    axios.get(`http://127.0.0.1:8000/api/books/books/${id}/`)
      .then(response => setBook(response.data))
      .catch(err => console.error("Lỗi tải chi tiết sách:", err))
  }, [id])

  const handleOpenModal = () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setMessage({ type: 'error', text: '⚠️ Vui lòng đăng nhập trước khi mượn sách!' });
      return;
    }
    setShowModal(true);
    setMessage({ type: '', text: '' });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setBorrowForm({ quantity: 1, borrow_duration: 14 });
    setMessage({ type: '', text: '' });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setBorrowForm(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) : parseInt(value)
    }));
  };

  const handleBorrow = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('access_token');
      
      const borrowData = {
        book: id,
        quantity: borrowForm.quantity,
        borrow_duration: borrowForm.borrow_duration
      };

      // 1. Gửi request mượn sách lên Backend
      const response = await axios.post('http://127.0.0.1:8000/api/loans/loans/', borrowData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setMessage({ 
        type: 'success', 
        text: `✅ ${response.data?.message || 'Yêu cầu mượn sách đã được gửi và đang chờ thủ thư duyệt.'}` 
      });
      
      setTimeout(() => handleCloseModal(), 2000);

      // 2. CẬP NHẬT LẠI UI: Lấy lại thông tin sách mới nhất sau khi mượn để update số lượng
      try {
        const updatedBookResponse = await axios.get(`http://127.0.0.1:8000/api/books/books/${id}/`);
        setBook(updatedBookResponse.data); // Giao diện sẽ tự động đổi trạng thái "Đang được mượn" hoặc trừ số lượng
      } catch (refreshErr) {
        console.error("Không thể tự động làm mới thông tin sách", refreshErr);
      }

    } catch (error) {
      const errorText = error.response?.data?.message || error.response?.data?.detail || 'Mượn sách thất bại!';
      setMessage({ 
        type: 'error', 
        text: `❌ Lỗi: ${errorText}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!book) return <h2 className="temp-page">Đang tải thông tin sách...</h2>

  return (
    <div className="detail-container">
      <Link to="/" className="btn-back">⬅ Quay lại Trang chủ</Link>
      <div className="detail-card">
        {/* ĐOẠN HIỂN THỊ ẢNH */}
        {book.cover_image && (
          <div className="cover-wrapper">
            <img 
              src={getMediaUrl(book.cover_image)} 
              alt="Bìa sách" 
              className="detail-cover" 
            />
          </div>
        )}
        <h2 className="detail-title"><Icon name="book" size={24} className="heading-icon" />{book.title}</h2>
        <div className="detail-info">
          <p><strong>ID sách:</strong> {book.id}</p>
          <p><strong>Thể loại:</strong> {book.category_name || "Chưa phân loại"}</p>
          <p><strong>Năm xuất bản:</strong> {book.published_year || "Chưa rõ"}</p>
          <p><strong>Nhà xuất bản:</strong> {book.publisher || "Chưa rõ"}</p>
          <p><strong>Mô tả:</strong> {book.description || "Chưa có mô tả chi tiết cho cuốn sách này."}</p>
          <p><strong>Số lượng:</strong> {book.available_quantity}/{book.total_quantity}</p>
          <p><strong>Tình trạng:</strong> <span className={book.is_available ? "status green" : "status red"}>{book.is_available ? "Sẵn sàng cho mượn" : "Đang được mượn / Hết sách"}</span></p>
        </div>
        
        {message.text && (
          <div style={{ 
            padding: '12px', 
            borderRadius: '6px', 
            marginBottom: '15px',
            background: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {message.text}
          </div>
        )}
        
        <button className="btn-borrow" onClick={handleOpenModal} disabled={!book.is_available}>
          {book.is_available ? "Đăng ký mượn sách này" : "Không thể mượn"}
        </button>
      </div>

      {/* ========== MODAL MƯỢN SÁCH ========== */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mượn Sách: {book.title}</h3>
              <button className="modal-close" onClick={handleCloseModal}>✕</button>
            </div>
            
            <form onSubmit={handleBorrow} className="modal-form">
              <div className="form-group">
                <label htmlFor="quantity"><strong>Số lượng:</strong></label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  min="1"
                  max="5"
                  value={borrowForm.quantity}
                  onChange={handleFormChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="borrow_duration"><strong>Thời gian mượn (ngày):</strong></label>
                <select
                  id="borrow_duration"
                  name="borrow_duration"
                  value={borrowForm.borrow_duration}
                  onChange={handleFormChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value={7}>7 ngày</option>
                  <option value={14}>14 ngày</option>
                  <option value={21}>21 ngày</option>
                  <option value={30}>30 ngày</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-submit" disabled={isLoading}>
                  {isLoading ? 'Đang gửi...' : 'Gửi yêu cầu mượn'}
                </button>
                <button type="button" className="btn-cancel" onClick={handleCloseModal} disabled={isLoading}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ==========================================
// COMPONENT 3: LAYOUT CHUNG & ĐIỀU HƯỚNG
// ==========================================
function App() {
  // Đăng nhập dựa trên token để tránh sai lệch state sau khi refresh trang.
  const accessToken = localStorage.getItem('access_token');
  const role = getAuthRole();
  const isLoggedIn = Boolean(accessToken);
  const isAdmin = isAdminRole(role);

  const [overdueLoans, setOverdueLoans] = useState([]);
  const [overdueReservations, setOverdueReservations] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchNotifications = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        };

        const [loansRes, resRes] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/loans/loans/', config).catch(() => ({ data: [] })),
          axios.get('http://127.0.0.1:8000/api/library/reservations/', config).catch(() => ({ data: [] }))
        ]);

        const allLoans = loansRes.data || [];
        const allRes = resRes.data || [];

        const overdueL = allLoans.filter(l => l.status === 'overdue');
        setOverdueLoans(overdueL);

        const now = new Date();
        const todayStr = now.toLocaleDateString('sv-SE');
        const currentTimeStr = now.toTimeString().split(' ')[0].substring(0, 5);

        const overdueR = allRes.filter(r => {
          if (!['pending', 'approved', 'checked_in'].includes(r.status)) return false;
          if (r.date < todayStr) return true;
          if (r.date === todayStr && (r.end_time || '').substring(0, 5) < currentTimeStr) return true;
          return false;
        });
        setOverdueReservations(overdueR);

      } catch (err) {
        console.error("Lỗi khi tải thông báo quá hạn:", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, accessToken]);

  // Hàm xử lý khi bấm nút Đăng xuất
  const handleLogout = () => {
    clearAuthStorage();
    window.location.href = '/';            // Đá về trang chủ và tải lại trang
  };

  const totalNotifications = overdueLoans.length + overdueReservations.length;

  return (
    <BrowserRouter>
      <div className="app-container">
        <nav className="navbar">
          <div className="nav-logo"><Icon name="library" size={22} className="nav-icon" />Thư viện PTIT</div>
          <ul className="nav-links">
          <li>
            <NavLink 
              to="/" 
              style={({ isActive }) => ({
                color: 'white',
                textDecoration: 'none',
                paddingBottom: '5px',
                borderBottom: isActive ? '3px solid white' : 'none',
                fontWeight: isActive ? 'bold' : 'normal'
              })}
            >
              Trang chủ
            </NavLink>
          </li>

          {isLoggedIn && (
            <li className="nav-notification-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setNotificationOpen(!notificationOpen)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px',
                }}
                title="Thông báo quá hạn"
              >
                <Icon name="bell" size={20} />
                {totalNotifications > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 0 2px #b01e23'
                  }}>
                    {totalNotifications}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div style={{
                  position: 'absolute',
                  top: '40px',
                  right: '0',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0',
                  width: '320px',
                  padding: '16px',
                  zIndex: 1000,
                  color: '#1e293b',
                  textAlign: 'left'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    🔔 Thông báo quá hạn/quá giờ
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                    {totalNotifications === 0 ? (
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '10px' }}>
                        Tuyệt vời! Không có phiếu nào bị quá hạn.
                      </p>
                    ) : (
                      <>
                        {overdueLoans.length > 0 && (
                          <div style={{ padding: '8px 10px', backgroundColor: '#fff5f5', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: '500', color: '#991b1b' }}>
                              Có {overdueLoans.length} phiếu mượn sách quá hạn trả!
                            </p>
                            <Link 
                              to={isAdmin ? "/admin" : "/dashboard"} 
                              onClick={() => setNotificationOpen(false)}
                              style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 'bold', textDecoration: 'underline', marginTop: '4px', display: 'inline-block' }}
                            >
                              Xem và xử lý trả sách
                            </Link>
                          </div>
                        )}
                        {overdueReservations.length > 0 && (
                          <div style={{ padding: '8px 10px', backgroundColor: '#fffbeb', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: '500', color: '#92400e' }}>
                              Có {overdueReservations.length} phiếu đặt chỗ ngồi quá giờ!
                            </p>
                            <Link 
                              to={isAdmin ? "/admin" : "/seats"} 
                              onClick={() => setNotificationOpen(false)}
                              style={{ fontSize: '12px', color: '#d97706', fontWeight: 'bold', textDecoration: 'underline', marginTop: '4px', display: 'inline-block' }}
                            >
                              Xem và quản lý chỗ ngồi
                            </Link>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          )}
          
          {isLoggedIn ? (
            isAdmin ? (
              <>
                <li>
                  <NavLink 
                    to="/admin" 
                    style={({ isActive }) => ({
                      color: 'white',
                      textDecoration: 'none',
                      paddingBottom: '5px',
                      borderBottom: isActive ? '3px solid white' : 'none',
                      fontWeight: isActive ? 'bold' : 'normal'
                    })}
                  >
                    Quản lý
                  </NavLink>
                </li>
                <li>
                  <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '10px' }}>
                    Đăng xuất
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <NavLink 
                    to="/dashboard" 
                    style={({ isActive }) => ({
                      color: 'white',
                      textDecoration: 'none',
                      paddingBottom: '5px',
                      borderBottom: isActive ? '3px solid white' : 'none',
                      fontWeight: isActive ? 'bold' : 'normal'
                    })}
                  >
                    Cá nhân
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/seats"
                    style={({ isActive }) => ({
                      color: 'white',
                      textDecoration: 'none',
                      paddingBottom: '5px',
                      borderBottom: isActive ? '3px solid white' : 'none',
                      fontWeight: isActive ? 'bold' : 'normal'
                    })}
                  >
                    Chỗ ngồi
                  </NavLink>
                </li>
                <li>
                  <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '10px' }}>
                    Đăng xuất
                  </button>
                </li>
              </>
            )
          ) : (
            <>
              <li>
                <Link to="/register" style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '8px 15px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold' }}>
                  Đăng ký
                </Link>
              </li>
              <li>
                <Link to="/login" style={{ background: 'white', color: '#b01e23', padding: '8px 15px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold' }}>
                  Đăng nhập
                </Link>
              </li>
            </>
          )}
        </ul>
        </nav>

        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/book/:id" element={<BookDetail />} />
            <Route
              path="/dashboard"
              element={
                <RoleRoute isLoggedIn={isLoggedIn} role={role} allowedRoles={['reader']} fallbackPath="/admin">
                  <Profile />
                </RoleRoute>
              }
            />
            <Route
              path="/seats"
              element={
                <RoleRoute isLoggedIn={isLoggedIn} role={role} allowedRoles={['reader']} fallbackPath="/admin">
                  <SeatBooking />
                </RoleRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <RoleRoute isLoggedIn={isLoggedIn} role={role} allowedRoles={['librarian', 'admin', 'staff']} fallbackPath="/dashboard">
                  <AdminDashboard />
                </RoleRoute>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App