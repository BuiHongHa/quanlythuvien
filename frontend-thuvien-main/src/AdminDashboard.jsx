import { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
// 1. Sửa cách import ở dòng trên cùng
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Thay vì import 'jspdf-autotable';
import { Icon } from './components/Icons';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('BOOKS');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  // Dữ liệu từ Backend
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [zones, setZones] = useState([]);
  const [seats, setSeats] = useState([]);
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [reservations, setReservations] = useState([]);
  
  // State cho thanh lọc tìm kiếm
  const [filterUser, setFilterUser] = useState('');
  const [filterBook, setFilterBook] = useState('');

  // Khởi tạo các Form
  const [categoryForm, setCategoryForm] = useState({ name: '', note: '' });
  const [bookForm, setBookForm] = useState({ title: '', pub_year: '', publisher: '', description: '', category: '', total_quantity: 1, available_quantity: 1 });
  const [coverImage, setCoverImage] = useState(null);
  const [zoneForm, setZoneForm] = useState({ name: '', description: '', is_active: true });
  const [seatForm, setSeatForm] = useState({ seat_number: '', zone: '', is_maintainance: false });

  // Lấy Token bảo mật
  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return {};
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Tải dữ liệu theo Tab
  const loadData = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setMessage({ type: 'error', text: 'Bạn cần đăng nhập để truy cập trang quản lý.' });
      return;
    }

    try {
      const config = getAuthHeaders();
      if (activeTab === 'BOOKS') {
        const [resBooks, resCats] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/books/books/', config),
          axios.get('http://127.0.0.1:8000/api/books/categories/', config).catch(() => ({ data: [] }))
        ]);
        setBooks(resBooks.data); setCategories(resCats.data);
      }
      if (activeTab === 'LIBRARY') {
        const [resZones, resSeats, resResv] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/library/zones/', config),
          axios.get('http://127.0.0.1:8000/api/library/seats/', config),
          axios.get('http://127.0.0.1:8000/api/library/reservations/', config)
        ]);
        setZones(resZones.data); setSeats(resSeats.data); setReservations(resResv.data);
      }
      if (activeTab === 'LOANS') {
        const res = await axios.get('http://127.0.0.1:8000/api/loans/loans/', config);
        setLoans(res.data);
      }
      if (activeTab === 'USERS') {
        const res = await axios.get('http://127.0.0.1:8000/api/core/users/', config);
        setUsers(res.data);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu", error);
      const errorMsg = error.response?.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : 'Lỗi tải dữ liệu từ server.';
      setMessage({ type: 'error', text: errorMsg });
    }
  };

  useEffect(() => { loadData(); }, [activeTab]);

  // --- HÀM XỬ LÝ API ---

  // Sửa lại hàm Thêm Thể loại
  const handleAddCategory = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await axios.post('http://127.0.0.1:8000/api/books/categories/', categoryForm, getAuthHeaders());
      setMessage({ type: 'success', text: 'Thêm Thể loại thành công!' });
      setCategoryForm({ name: '', note: '' });
      loadData();
    } catch (err) { 
      // Lấy lỗi chi tiết từ Backend
      const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMessage({ type: 'error', text: `Lỗi Thể loại: ${errorDetail}` }); 
    } finally { 
      setSaving(false); 
    }
  };

  // Sửa lại hàm Thêm Sách
  const handleAddBook = async (e) => {
    e.preventDefault(); setSaving(true);
    const formData = new FormData();
    Object.keys(bookForm).forEach(key => formData.append(key, bookForm[key]));
    if (coverImage) formData.append('cover_image', coverImage);

    try {
      await axios.post('http://127.0.0.1:8000/api/books/books/', formData, {
        headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' }
      });
      setMessage({ type: 'success', text: 'Thêm sách thành công!' });
      
      // Reset form sau khi thêm thành công cho đẹp
      setBookForm({ title: '', pub_year: '', publisher: '', description: '', category: '', total_quantity: 1, available_quantity: 1 });
      setCoverImage(null);
      loadData();
    } catch (err) { 
      // Lấy lỗi chi tiết từ Backend
      const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMessage({ type: 'error', text: `Lỗi thêm sách: ${errorDetail}` }); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleAddZone = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await axios.post('http://127.0.0.1:8000/api/library/zones/', zoneForm, getAuthHeaders());
      setMessage({ type: 'success', text: 'Thêm Khu vực thành công!' }); loadData();
    } catch (err) { setMessage({ type: 'error', text: 'Thêm Zone thất bại!' }); } finally { setSaving(false); }
  };

  const handleAddSeat = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await axios.post('http://127.0.0.1:8000/api/library/seats/', { ...seatForm, zone: Number(seatForm.zone) }, getAuthHeaders());
      setMessage({ type: 'success', text: 'Thêm Ghế thành công!' }); loadData();
    } catch (err) { setMessage({ type: 'error', text: 'Thêm Ghế thất bại!' }); } finally { setSaving(false); }
  };

  const handleUpdateReservation = async (id, actionType) => {
    try {
      const endpoint = actionType === 'check_in' ? 'check_in' : 'check_out';
      await axios.patch(`http://127.0.0.1:8000/api/library/reservations/${id}/${endpoint}/`, {}, getAuthHeaders());
      setMessage({ type: 'success', text: `Đã cập nhật trạng thái yêu cầu thành công!` });
      loadData();
    } catch (err) {
      const errorDetail = err.response?.data?.error || err.response?.data?.detail || err.message;
      setMessage({ type: 'error', text: `Cập nhật thất bại: ${errorDetail}` });
    }
  };

  const handleUpdateLoan = async (id) => {
    try {
      await axios.patch(`http://127.0.0.1:8000/api/loans/loans/${id}/return_book/`, {}, getAuthHeaders());
      setMessage({ type: 'success', text: 'Đã xác nhận trả sách và hoàn lại kho!' }); 
      
      const config = getAuthHeaders();
      const resLoans = await axios.get('http://127.0.0.1:8000/api/loans/loans/', config);
      setLoans(resLoans.data);

      const resBooks = await axios.get('http://127.0.0.1:8000/api/books/books/', config);
      setBooks(resBooks.data);
      
    } catch (err) { setMessage({ type: 'error', text: 'Lỗi cập nhật! Vui lòng thử lại.' }); }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    setSaving(true);
    try {
      const newStatus = !currentStatus;
      await axios.patch(`http://127.0.0.1:8000/api/core/users/${userId}/`, { is_active: newStatus }, getAuthHeaders());
      setMessage({ type: 'success', text: `Đã ${newStatus ? 'mở khóa' : 'khóa'} tài khoản thành công!` });
      loadData();
    } catch (err) {
      const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMessage({ type: 'error', text: `Lỗi cập nhật trạng thái: ${errorDetail}` });
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // HÀM XỬ LÝ LỌC & XUẤT FILE (Bắt buộc để TRƯỚC return)
  // ==========================================

  // Lọc dữ liệu dựa trên ô tìm kiếm
  // Lọc dữ liệu dựa trên ô tìm kiếm
  const filteredLoans = loans.filter(loan => {
    const userString = String(loan.user || '').toLowerCase();
    const fullNameString = String(loan.full_name || '').toLowerCase(); // Lấy thêm họ tên
    const bookString = String(loan.book_names || '').toLowerCase(); 
    
    // Tìm kiếm khớp với Username HOẶC Họ và tên
    const matchesUser = userString.includes(filterUser.toLowerCase()) || fullNameString.includes(filterUser.toLowerCase());
    const matchesBook = bookString.includes(filterBook.toLowerCase());

    return matchesUser && matchesBook;
  });

  // Xuất Excel
  const handleExportExcel = () => {
    const exportData = filteredLoans.map(loan => ({
      "Mã phiếu": `#${loan.id}`,
      "Username": loan.user,
      "Họ và tên": loan.full_name || 'N/A', // Thêm cột này
      "Sách mượn": loan.book_names || 'N/A',
      "Ngày mượn": loan.borrow_date,
      "Ngày trả": loan.return_date || 'Chưa trả',
      "Trạng thái": loan.status === 'returned' ? 'Đã trả' : 'Đang mượn'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bao_Cao_Muon_Tra");
    XLSX.writeFile(workbook, `Bao_Cao_Thu_Vien_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Xuất PDF
  const handleExportPDF = () => {
    // Hàm phụ trợ: Chuyển Tiếng Việt có dấu thành không dấu
    const removeVietnameseTones = (str) => {
      if (!str) return '';
      return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D');
    };

    const doc = new jsPDF();
    
    // Tiêu đề cũng phải viết không dấu
    doc.text("BAO CAO MUON TRA SACH - THU VIEN PTIT", 14, 15);
    
    // Cột tiêu đề
    const tableColumn = ["Ma phieu", "Username", "Ho va ten", "Sach muon", "Ngay muon", "Trang thai"];
    const tableRows = [];

    // Nạp dữ liệu (đã bọc qua hàm bỏ dấu)
    filteredLoans.forEach(loan => {
      const loanData = [
        `#${loan.id}`,
        removeVietnameseTones(loan.user),
        removeVietnameseTones(loan.full_name || 'N/A'),
        removeVietnameseTones(loan.book_names || 'N/A'),
        loan.borrow_date,
        loan.status === 'returned' ? 'Da tra' : 'Dang muon'
      ];
      tableRows.push(loanData);
    });

    // Tạo bảng
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
    });

    doc.save(`Bao_Cao_Thu_Vien_${new Date().toISOString().slice(0, 10)}.pdf`);
  };
  // ==========================================
  // RENDER GIAO DIỆN
  // ==========================================
  return (
    <div className="container">
      <h2 style={{ color: '#b01e23', borderBottom: '2px solid #ddd', paddingBottom: '10px' }}><Icon name="admin" size={24} className="heading-icon" />BẢNG ĐIỀU KHIỂN QUẢN TRỊ</h2>
      
      {/* TABS */}
      <div className="admin-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {['BOOKS', 'LIBRARY', 'LOANS', 'USERS'].map(tab => (
          <button key={tab} 
            onClick={() => { setActiveTab(tab); setMessage({type:'', text:''}); }}
            style={{
              padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '5px', fontWeight: 'bold',
              background: activeTab === tab ? '#b01e23' : '#e0e0e0', color: activeTab === tab ? 'white' : 'black', display: 'inline-flex', alignItems: 'center', gap: '8px'
            }}
          >
            {tab === 'BOOKS' ? <><Icon name="book" size={18} /> Sách</> : tab === 'LIBRARY' ? <><Icon name="seat" size={18} /> Chỗ ngồi</> : tab === 'LOANS' ? <><Icon name="search" size={18} /> Mượn trả</> : <><Icon name="user" size={18} /> Người dùng</>}
          </button>
        ))}
      </div>

      {message.text && <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '5px', background: message.type === 'success' ? '#d4edda' : '#f8d7da', color: message.type === 'success' ? '#155724' : '#721c24' }}>{message.text}</div>}

      {/* --- TAB SÁCH --- */}
      {activeTab === 'BOOKS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #0056b3' }}>
              <h3>1. Thêm Thể Loại</h3>
              <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input placeholder="Tên thể loại (VD: Giáo trình)..." required value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}/>
                <input   placeholder="Ghi chú (Note)..."   value={categoryForm.note}   onChange={e => setCategoryForm({...categoryForm, note: e.target.value})}   style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}/>
                <button type="submit" disabled={saving} style={{ padding: '10px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Tạo Thể Loại</button>
              </form>
            </div>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
              <h3>Danh sách Thể Loại</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#eee' }}><th style={{padding: '10px'}}>ID</th><th>Tên Thể Loại</th><th>Mô tả</th></tr></thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{padding: '10px'}}>{c.id}</td>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.note || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #b01e23', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h3>2. Thêm Sách Mới</h3>
              <form onSubmit={handleAddBook} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input placeholder="Tên sách..." required value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}/>
                <input type="number" placeholder="Năm XB..." value={bookForm.pub_year} onChange={e => setBookForm({...bookForm, pub_year: e.target.value})} style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}/>
                <input placeholder="Nhà XB..." value={bookForm.publisher} onChange={e => setBookForm({...bookForm, publisher: e.target.value})} style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}/>
                <select required value={bookForm.category} onChange={e => setBookForm({...bookForm, category: e.target.value})} style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}>
                  <option value="">-- Chọn thể loại --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="file" accept="image/*" onChange={e => setCoverImage(e.target.files[0])} />
                <div style={{display:'flex', gap:'10px'}}>
                  <input type="number" placeholder="Tổng SL" min="1" required value={bookForm.total_quantity} onChange={e => setBookForm({...bookForm, total_quantity: e.target.value})} style={{width:'50%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}/>
                  <input type="number" placeholder="SL sẵn có" min="0" required value={bookForm.available_quantity} onChange={e => setBookForm({...bookForm, available_quantity: e.target.value})} style={{width:'50%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}/>
                </div>
                <button type="submit" disabled={saving} style={{ padding: '10px', background: '#b01e23', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Lưu Sách</button>
              </form>
            </div>
            
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
              <h3>Danh sách Sách hiện có</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#eee' }}><th style={{padding: '10px'}}>ID</th><th>Tên sách</th><th>Tồn kho</th></tr></thead>
                <tbody>
                  {books.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{padding: '10px'}}>{b.id}</td>
                      <td style={{padding: '10px'}}><strong>{b.title}</strong></td>
                      <td style={{padding: '10px'}}>{b.available_quantity}/{b.total_quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CHỖ NGỒI (LIBRARY) --- */}
      {activeTab === 'LIBRARY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', borderTop: '4px solid #0056b3' }}>
              <h3>1. Quản lý Khu vực (Zone)</h3>
              <form onSubmit={handleAddZone} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input placeholder="Tên khu vực (VD: Tầng 1)" required value={zoneForm.name} onChange={e => setZoneForm({...zoneForm, name: e.target.value})} style={{flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius:'4px'}}/>
                <button type="submit" disabled={saving} style={{ padding: '8px 15px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Thêm</button>
              </form>
              <ul style={{ paddingLeft: '20px' }}>{zones.map(z => <li key={z.id}>ID: {z.id} - <strong>{z.name}</strong></li>)}</ul>
            </div>
            
            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', borderTop: '4px solid #0056b3' }}>
              <h3>2. Quản lý Ghế (Seat)</h3>
              <form onSubmit={handleAddSeat} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                <select required value={seatForm.zone} onChange={e => setSeatForm({...seatForm, zone: e.target.value})} style={{padding: '8px', border: '1px solid #ccc', borderRadius:'4px'}}>
                  <option value="">-- Chọn Khu vực --</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input placeholder="Mã ghế (VD: A1)" required value={seatForm.seat_number} onChange={e => setSeatForm({...seatForm, seat_number: e.target.value})} style={{flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius:'4px'}}/>
                  <button type="submit" disabled={saving} style={{ padding: '8px 15px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Thêm Ghế</button>
                </div>
              </form>
              <p>Tổng số ghế hệ thống: <strong>{seats.length}</strong></p>
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ marginBottom: '12px' }}>Danh sách Ghế</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#eee' }}>
                      <th style={{ padding: '10px' }}>Mã ghế</th>
                      <th style={{ padding: '10px' }}>Khu</th>
                      <th style={{ padding: '10px' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seats.map(seat => (
                      <tr key={seat.id} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '10px' }}>{seat.seat_number}</td>
                        <td style={{ padding: '10px' }}>{seat.zone?.name || seat.zone}</td>
                        <td style={{ padding: '10px' }}>{seat.is_maintainance ? 'Đang bảo trì' : 'Sẵn sàng'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ borderBottom: '2px solid #b01e23', paddingBottom: '10px', color: '#b01e23' }}>3. Duyệt Yêu Cầu Chỗ Ngồi (Check-in / Check-out)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '15px' }}>
              <thead>
                <tr style={{ background: '#eee' }}>
                  <th style={{padding:'10px'}}>Ghế (ID)</th>
                  <th>Độc giả (User ID)</th>
                  <th>Thời gian đăng ký</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {reservations.length === 0 ? (
                  <tr><td colSpan="5" style={{padding:'15px', textAlign:'center', color: '#777'}}>Hiện chưa có yêu cầu đặt chỗ nào.</td></tr>
                ) : (
                  reservations.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{padding:'10px', fontWeight: 'bold'}}>{r.seat?.seat_number || r.seat}</td>
                      <td>{r.user}</td>
                      <td>{r.date} <br/><small style={{color:'#666'}}>{r.start_time} - {r.end_time}</small></td>
                      <td>
                        {r.status === 'booked' && <span style={{color: '#d39e00', fontWeight:'bold'}}>⏳ Chờ Check-in</span>}
                        {r.status === 'checked_in' && <span style={{color: '#28a745', fontWeight:'bold'}}>✅ Đang sử dụng</span>}
                        {r.status === 'completed' && <span style={{color: '#6c757d', fontWeight:'bold'}}>🔒 Đã Check-out</span>}
                        {![ 'booked', 'checked_in', 'completed' ].includes(r.status) && (
                          <span style={{color: 'red', fontWeight: 'bold'}}>{r.status}</span>
                        )}
                      </td>
                      <td>
                        {r.status === 'booked' && (
                          <button onClick={() => handleUpdateReservation(r.id, 'check_in')} style={{background: '#28a745', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold'}}>
                            Duyệt Check-in
                          </button>
                        )}
                        {r.status === 'checked_in' && (
                          <button onClick={() => handleUpdateReservation(r.id, 'check_out')} style={{background: '#17a2b8', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold'}}>
                            Xác nhận Check-out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB MƯỢN TRẢ --- */}
      {activeTab === 'LOANS' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
          
          {/* HEADER & NÚT XUẤT BÁO CÁO */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, color: '#b01e23' }}>Danh sách Phiếu mượn</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleExportExcel} style={{ padding: '8px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                📊 Xuất Excel
              </button>
              <button onClick={handleExportPDF} style={{ padding: '8px 15px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                📄 Xuất PDF
              </button>
            </div>
          </div>

          {/* THANH LỌC (FILTER) */}
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
            <input 
              type="text" 
              placeholder="🔍 Lọc theo ID / Tên Độc giả..." 
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <input 
              type="text" 
              placeholder="🔍 Lọc theo Tên sách..." 
              value={filterBook}
              onChange={(e) => setFilterBook(e.target.value)}
              style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          {/* BẢNG DỮ LIỆU ĐÃ LỌC */}
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#eee' }}>
                <th style={{padding:'12px'}}>Mã phiếu</th>
                <th>Username</th>
                <th>Họ và tên</th> {/* THÊM CỘT NÀY */}
                <th>Sách mượn</th>
                <th>Ngày mượn</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.length > 0 ? filteredLoans.map(loan => (
                <tr key={loan.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{padding:'12px', fontWeight:'bold'}}>#{loan.id}</td>
                  <td>{loan.user}</td>
                  <td>{loan.full_name || 'N/A'}</td> {/* THÊM DỮ LIỆU NÀY */}
                  <td>{loan.book_names || <span style={{color:'#999', fontStyle:'italic'}}>Đang tải...</span>}</td>
                  <td>{loan.borrow_date}</td>
                  <td><strong style={{color: loan.status === 'returned' ? '#28a745' : '#ffc107'}}>{loan.status}</strong></td>
                  <td>
                    {loan.status !== 'returned' && (
                      <button 
                        onClick={() => handleUpdateLoan(loan.id)} 
                        style={{ padding: '6px 12px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor:'pointer', fontWeight:'bold' }}
                      >
                        Xác nhận Đã Trả
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    Không tìm thấy phiếu mượn nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- TAB NGƯỜI DÙNG --- */}
      {activeTab === 'USERS' && (
        <div>
          <h3>Danh sách Tài khoản (Core)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead><tr style={{ background: '#eee' }}><th style={{padding:'10px'}}>Username</th><th>Họ Tên</th><th>Role</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{padding:'10px'}}>{u.username}</td>
                  <td>{u.full_name}</td>
                  <td><strong>{u.role || (u.is_superuser ? 'Admin' : 'N/A')}</strong></td>
                  <td>{u.is_active ? '✅ Hoạt động' : '❌ Đã khóa'}</td>
                  <td>
                    <button 
                      className="btn-inline" 
                      onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                      disabled={saving}
                    >
                      {u.is_active ? 'Khóa' : 'Mở khóa'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

export default AdminDashboard;