import { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
// 1. Sửa cách import ở dòng trên cùng
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Thay vì import 'jspdf-autotable';
import { Icon } from './components/Icons';
import { getAuthHeaders } from './auth';

const VIETNAMESE_FONT_URL = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
let vietnameseFontLoaded = false;

const loadVietnameseFont = async (doc) => {
  if (vietnameseFontLoaded) return;
  const response = await fetch(VIETNAMESE_FONT_URL);
  if (!response.ok) {
    throw new Error('Không tải được font tiếng Việt cho PDF.');
  }
  const buffer = await response.arrayBuffer();
  const uint8 = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  doc.addFileToVFS('NotoSans-Regular.ttf', binary);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  vietnameseFontLoaded = true;
};

function AdminDashboard() {
  const EMPTY_BOOK_FORM = {
    title: '',
    author: '',
    published_year: '',
    publisher: '',
    description: '',
    category_id: '',
    total_quantity: 1,
    available_quantity: 1
  };

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
  const [categoryFilter, setCategoryFilter] = useState('');
  const [bookFilter, setBookFilter] = useState('');
  const [bookCategoryFilter, setBookCategoryFilter] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterBook, setFilterBook] = useState('');

  // Khởi tạo các Form
  const [categoryForm, setCategoryForm] = useState({ name: '', note: '' });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [bookForm, setBookForm] = useState(EMPTY_BOOK_FORM);
  const [coverImage, setCoverImage] = useState(null);
  const [editingBookId, setEditingBookId] = useState(null);
  const [zoneForm, setZoneForm] = useState({ name: '', description: '', is_active: true });
  const [seatForm, setSeatForm] = useState({ seat_number: '', zone: '', is_maintainance: false });
  const [seatFilterZone, setSeatFilterZone] = useState('');
  const [seatFilterStatus, setSeatFilterStatus] = useState('all');
  const [seatFilterKeyword, setSeatFilterKeyword] = useState('');
  const [reservationSearch, setReservationSearch] = useState('');
  const [reservationStatusFilter, setReservationStatusFilter] = useState('all');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loanDetailFineMap, setLoanDetailFineMap] = useState({});
  const [loanDetailSaving, setLoanDetailSaving] = useState(false);

  // Lấy Token bảo mật
  // const getAuthHeaders = () => {
  //   const token = localStorage.getItem('access_token');
  //   if (!token) return {};
  //   return { headers: { Authorization: `Bearer ${token}` } };
  // };

  // Tải dữ liệu theo Tab
  const loadData = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setMessage({ type: 'error', text: 'Bạn cần đăng nhập để truy cập trang quản lý.' });
      return;
    }

    try {
      const config = await getAuthHeaders();
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
      const config = await getAuthHeaders();
      if (editingCategoryId) {
        await axios.patch(`http://127.0.0.1:8000/api/books/categories/${editingCategoryId}/`, categoryForm, config);
      } else {
        await axios.post('http://127.0.0.1:8000/api/books/categories/', categoryForm, config);
      }
      setMessage({ type: 'success', text: editingCategoryId ? 'Cập nhật Thể loại thành công!' : 'Thêm Thể loại thành công!' });
      setCategoryForm({ name: '', note: '' });
      setEditingCategoryId(null);
      loadData();
    } catch (err) { 
      // Lấy lỗi chi tiết từ Backend
      const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMessage({ type: 'error', text: editingCategoryId ? `Lỗi cập nhật Thể loại: ${errorDetail}` : `Lỗi Thể loại: ${errorDetail}` }); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name || '',
      note: category.note || ''
    });
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm({ name: '', note: '' });
  };

  const handleDeleteCategory = async (categoryId) => {
    const confirmed = window.confirm('Xóa thể loại sẽ không ảnh hưởng đến sách đã tồn tại. Bạn có chắc muốn tiếp tục?');
    if (!confirmed) return;
    setSaving(true);
    try {
      const config = await getAuthHeaders();
      await axios.delete(`http://127.0.0.1:8000/api/books/categories/${categoryId}/`, config);
      setMessage({ type: 'success', text: 'Đã xóa thể loại thành công!' });
      loadData();
    } catch (err) {
      const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMessage({ type: 'error', text: `Lỗi xóa thể loại: ${errorDetail}` });
    } finally {
      setSaving(false);
    }
  };

  // Sửa lại hàm Thêm Sách
  // Sửa lại hàm Thêm Sách (Đã dọn dẹp sạch sẽ và fix lỗi 400)
  const resetBookForm = () => {
    setBookForm(EMPTY_BOOK_FORM);
    setCoverImage(null);
    setEditingBookId(null);
    const fileInput = document.getElementById("cover_image_input");
    if (fileInput) fileInput.value = "";
  };

  const handleAddBook = async (e) => {
    e.preventDefault(); 
    setSaving(true);
    
    const formData = new FormData();
    
    // 1. Các trường Text và Number
    formData.append('title', bookForm.title);
    formData.append('author', bookForm.author);
    formData.append('publisher', bookForm.publisher);
    formData.append('description', bookForm.description);
    formData.append('category', bookForm.category_id);    // DRF thường đòi key là 'category'
    formData.append('total_quantity', bookForm.total_quantity);
    formData.append('available_quantity', bookForm.available_quantity);
    
    // 2. Xử lý riêng Năm xuất bản (Chỉ gửi khi có nhập số)
    if (bookForm.published_year !== '') {
        formData.append('published_year', bookForm.published_year); // Gọi đúng bookForm.published_year
    }
    
    // 3. Gắn file ảnh bìa (Chỉ gửi khi có file)
    if (coverImage) {
        formData.append('cover_image', coverImage); 
    }

    // Debug: Log FormData contents
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
            console.log(`${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
            console.log(`${key}: ${value}`);
        }
    }

    try {
      const authConfig = await getAuthHeaders();
      console.log('Auth headers:', authConfig);
      if (editingBookId) {
        console.log('PATCH to:', `http://127.0.0.1:8000/api/books/books/${editingBookId}/`);
        await axios.patch(`http://127.0.0.1:8000/api/books/books/${editingBookId}/`, formData, authConfig);
      } else {
        console.log('POST to:', 'http://127.0.0.1:8000/api/books/books/');
        await axios.post('http://127.0.0.1:8000/api/books/books/', formData, authConfig);
      }
      
      setMessage({ type: 'success', text: editingBookId ? 'Cập nhật sách thành công!' : 'Thêm sách thành công!' });
      
      // Reset form sau khi thêm/cập nhật thành công
      resetBookForm();
      
      loadData(); // Tải lại danh sách sách
    } catch (err) { 
      // Bắt lỗi chi tiết và in ra F12 để kiểm tra nếu còn lỗi
      console.log("CHI TIẾT LỖI TỪ DJANGO:", err);
      console.log("Response data:", err.response?.data);
      console.log("Response status:", err.response?.status);
      console.log("Response headers:", err.response?.headers);
      const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMessage({ type: 'error', text: editingBookId ? `Lỗi cập nhật sách: ${errorDetail}` : `Lỗi thêm sách: ${errorDetail}` }); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleEditBook = (book) => {
    setEditingBookId(book.id);
    setBookForm({
      title: book.title || '',
      author: book.author || '',
      published_year: book.published_year || '',
      publisher: book.publisher || '',
      description: book.description || '',
      category_id: book.category || '',
      total_quantity: book.total_quantity ?? 1,
      available_quantity: book.available_quantity ?? 1
    });
    setCoverImage(null);
    const fileInput = document.getElementById("cover_image_input");
    if (fileInput) fileInput.value = "";
  };

  const handleCancelEditBook = () => {
    resetBookForm();
  };
  

  const handleAddZone = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const config = await getAuthHeaders();
      await axios.post('http://127.0.0.1:8000/api/library/zones/', zoneForm, config);
      setMessage({ type: 'success', text: 'Thêm Khu vực thành công!' }); loadData();
    } catch (err) { setMessage({ type: 'error', text: 'Thêm Zone thất bại!' }); } finally { setSaving(false); }
  };

  const handleAddSeat = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const config = await getAuthHeaders();
      await axios.post('http://127.0.0.1:8000/api/library/seats/', { ...seatForm, zone: Number(seatForm.zone) }, config);
      setMessage({ type: 'success', text: 'Thêm Ghế thành công!' }); loadData();
    } catch (err) { setMessage({ type: 'error', text: 'Thêm Ghế thất bại!' }); } finally { setSaving(false); }
  };

  const handleDeleteSeat = async (seatId) => {
    const confirmed = window.confirm('Bạn có chắc chắn muốn xóa ghế này?');
    if (!confirmed) return;
    setSaving(true);
    try {
      const config = await getAuthHeaders();
      await axios.delete(`http://127.0.0.1:8000/api/library/seats/${seatId}/`, config);
      setMessage({ type: 'success', text: 'Xóa ghế thành công!' });
      loadData();
    } catch (err) {
      const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMessage({ type: 'error', text: `Lỗi xóa ghế: ${errorDetail}` });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateReservation = async (id, actionType) => {
    try {
      const config = await getAuthHeaders();
      const endpoint = actionType === 'check_in' ? 'check_in' : 'check_out';
      await axios.patch(`http://127.0.0.1:8000/api/library/reservations/${id}/${endpoint}/`, {}, config);
      setMessage({ type: 'success', text: `Đã cập nhật trạng thái yêu cầu thành công!` });
      loadData();
    } catch (err) {
      const errorDetail = err.response?.data?.error || err.response?.data?.detail || err.message;
      setMessage({ type: 'error', text: `Cập nhật thất bại: ${errorDetail}` });
    }
  };

  const handleUpdateLoan = async (id) => {
    try {
      const config = await getAuthHeaders();
      await axios.patch(`http://127.0.0.1:8000/api/loans/loans/${id}/return_book/`, {}, config);
      setMessage({ type: 'success', text: 'Đã xác nhận trả sách và hoàn lại kho!' }); 
      
      const resLoans = await axios.get('http://127.0.0.1:8000/api/loans/loans/', config);
      setLoans(resLoans.data);

      const resBooks = await axios.get('http://127.0.0.1:8000/api/books/books/', config);
      setBooks(resBooks.data);
      
    } catch (err) { setMessage({ type: 'error', text: 'Lỗi cập nhật! Vui lòng thử lại.' }); }
  };

  const handleDeleteLoan = async (id) => {
    const confirmed = window.confirm('Bạn có chắc chắn muốn xóa phiếu mượn này?');
    if (!confirmed) return;
    setSaving(true);
    try {
      const config = await getAuthHeaders();
      await axios.delete(`http://127.0.0.1:8000/api/loans/loans/${id}/`, config);
      setMessage({ type: 'success', text: 'Đã xóa phiếu mượn thành công!' });
      loadData();
    } catch (err) {
      const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMessage({ type: 'error', text: `Lỗi xóa phiếu mượn: ${errorDetail}` });
    } finally {
      setSaving(false);
    }
  };

  const openLoanDetailModal = (loan) => {
    const initialFineMap = {};
    (loan?.loan_details || []).forEach((detail) => {
      initialFineMap[detail.id] = detail?.fine_amounts ?? 0;
    });
    setLoanDetailFineMap(initialFineMap);
    setSelectedLoan(loan);
  };

  const closeLoanDetailModal = () => {
    setSelectedLoan(null);
    setLoanDetailFineMap({});
  };

  const handleSaveLoanDetails = async () => {
    if (!selectedLoan) return;
    setLoanDetailSaving(true);
    try {
      const config = await getAuthHeaders();
      const details = selectedLoan.loan_details || [];
      await Promise.all(details.map((detail) => {
        const nextFine = loanDetailFineMap[detail.id] ?? detail.fine_amounts ?? 0;
        return axios.patch(
          `http://127.0.0.1:8000/api/loans/loandetails/${detail.id}/`,
          { fine_amounts: Number(nextFine) || 0 },
          config
        );
      }));

      if (selectedLoan.status !== 'returned') {
        await axios.patch(`http://127.0.0.1:8000/api/loans/loans/${selectedLoan.id}/return_book/`, {}, config);
      }

      setMessage({ type: 'success', text: 'Đã cập nhật chi tiết phiếu mượn thành công!' });
      closeLoanDetailModal();
      loadData();
    } catch (err) {
      const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMessage({ type: 'error', text: `Lỗi cập nhật chi tiết phiếu: ${errorDetail}` });
    } finally {
      setLoanDetailSaving(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    setSaving(true);
    try {
      const config = await getAuthHeaders();
      const newStatus = !currentStatus;
      await axios.patch(`http://127.0.0.1:8000/api/core/users/${userId}/`, { is_active: newStatus }, config);
      setMessage({ type: 'success', text: `Đã ${newStatus ? 'mở khóa' : 'khóa'} tài khoản thành công!` });
      loadData();
    } catch (err) {
      const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMessage({ type: 'error', text: `Lỗi cập nhật trạng thái: ${errorDetail}` });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBook = async (bookId) => {
    const confirmed = window.confirm('Bạn có chắc chắn muốn xóa sách này?');
    if (!confirmed) return;
    setSaving(true);
    try {
      const config = await getAuthHeaders();
      await axios.delete(`http://127.0.0.1:8000/api/books/books/${bookId}/`, config);
      setMessage({ type: 'success', text: 'Xóa sách thành công!' });
      loadData();
    } catch (err) {
      const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setMessage({ type: 'error', text: `Lỗi xóa sách: ${errorDetail}` });
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

  const getLoanBookNames = (loan) => {
    if (loan?.book_names && String(loan.book_names).trim()) {
      return loan.book_names;
    }
    const detailTitles = (loan?.loan_details || [])
      .map((detail) => detail?.book?.title)
      .filter(Boolean);
    return detailTitles.length ? detailTitles.join(', ') : null;
  };

  const getLoanFineTotal = (loan) => {
    const total = (loan?.loan_details || []).reduce((sum, detail) => {
      const fine = Number(detail?.fine_amounts || 0);
      return sum + (Number.isNaN(fine) ? 0 : fine);
    }, 0);
    return total;
  };

  const occupiedSeatIds = new Set(
    reservations
      .filter((reservation) => reservation?.status === 'checked_in')
      .map((reservation) => Number(reservation?.seat?.id || reservation?.seat))
      .filter(Boolean)
  );

  const getSeatStatus = (seat) => {
    if (seat.is_maintainance) return 'maintenance';
    if (occupiedSeatIds.has(Number(seat.id))) return 'occupied';
    return 'available';
  };

  const getSeatStatusLabel = (seat) => {
    const status = getSeatStatus(seat);
    if (status === 'maintenance') return 'Đang bảo trì';
    if (status === 'occupied') return 'Đang được sử dụng';
    return 'Sẵn sàng';
  };

  const filteredSeats = seats.filter((seat) => {
    const seatZoneId = Number(seat?.zone?.id || seat?.zone || 0);
    const matchesZone = !seatFilterZone || seatZoneId === Number(seatFilterZone);
    const matchesKeyword = String(seat?.seat_number || '').toLowerCase().includes(seatFilterKeyword.toLowerCase());

    if (seatFilterStatus === 'all') return matchesZone && matchesKeyword;
    return matchesZone && matchesKeyword && getSeatStatus(seat) === seatFilterStatus;
  });

  const filteredReservations = reservations.filter((reservation) => {
    const keyword = reservationSearch.trim().toLowerCase();
    const seatLabel = String(reservation?.seat?.seat_number || reservation?.seat || '').toLowerCase();
    const userLabel = String(reservation?.user || '').toLowerCase();
    const matchesKeyword = !keyword || seatLabel.includes(keyword) || userLabel.includes(keyword);
    if (reservationStatusFilter === 'all') return matchesKeyword;
    return matchesKeyword && reservation.status === reservationStatusFilter;
  });

  const handleExportSeatsExcel = () => {
    const exportData = filteredSeats.map((seat) => ({
      "ID Ghế": seat.id,
      "Mã ghế": seat.seat_number,
      "Khu vực": seat.zone?.name || seat.zone || 'N/A',
      "Trạng thái": getSeatStatusLabel(seat)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bao_Cao_Ghe");
    XLSX.writeFile(workbook, `Bao_Cao_Ghe_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportSeatsPDF = async () => {
    try {
      const doc = new jsPDF();
      await loadVietnameseFont(doc);
      doc.setFont('NotoSans', 'normal');
      doc.setFontSize(12);
      doc.text("BÁO CÁO GHẾ NGỒI - THƯ VIỆN PTIT", 14, 15);

      const tableColumn = ["ID", "Mã ghế", "Khu vực", "Trạng thái"];
      const tableRows = filteredSeats.map((seat) => ([
        seat.id,
        seat.seat_number || 'N/A',
        seat.zone?.name || seat.zone || 'N/A',
        getSeatStatusLabel(seat)
      ]));

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
        styles: { font: 'NotoSans', fontStyle: 'normal' },
        headStyles: { font: 'NotoSans', fontStyle: 'normal' },
        bodyStyles: { font: 'NotoSans', fontStyle: 'normal' }
      });

      doc.save(`Bao_Cao_Ghe_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      const errorDetail = err?.message || 'Không thể xuất báo cáo ghế.';
      setMessage({ type: 'error', text: `Lỗi xuất PDF ghế: ${errorDetail}` });
    }
  };

  const handleExportBooksExcel = () => {
    const exportData = books.map((book, index) => ({
      "STT": index + 1,
      "ID sách": book.id,
      "Tên sách": book.title || 'N/A',
      "Tác giả": book.author || 'Chưa rõ',
      "Thể loại": book.category_name || categories.find((c) => Number(c.id) === Number(book.category))?.name || 'Chưa phân loại',
      "Năm xuất bản": book.published_year || 'N/A',
      "Nhà xuất bản": book.publisher || 'N/A',
      "Tồn kho": `${book.available_quantity}/${book.total_quantity}`
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bao_Cao_Sach");
    XLSX.writeFile(workbook, `Bao_Cao_Sach_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportBooksPDF = async () => {
    try {
      const doc = new jsPDF();
      await loadVietnameseFont(doc);
      doc.setFont('NotoSans', 'normal');
      doc.setFontSize(12);
      doc.text("BÁO CÁO DANH SÁCH SÁCH - THƯ VIỆN PTIT", 14, 15);

      const tableColumn = ["STT", "ID", "Tên sách", "Tác giả", "Thể loại", "Tồn kho"];
      const tableRows = books.map((book, index) => ([
        index + 1,
        book.id,
        book.title || 'N/A',
        book.author || 'Chưa rõ',
        book.category_name || categories.find((c) => Number(c.id) === Number(book.category))?.name || 'Chưa phân loại',
        `${book.available_quantity}/${book.total_quantity}`
      ]));

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
        styles: { font: 'NotoSans', fontStyle: 'normal' },
        headStyles: { font: 'NotoSans', fontStyle: 'normal' },
        bodyStyles: { font: 'NotoSans', fontStyle: 'normal' }
      });

      doc.save(`Bao_Cao_Sach_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      const errorDetail = err?.message || 'Không thể xuất báo cáo sách.';
      setMessage({ type: 'error', text: `Lỗi xuất PDF sách: ${errorDetail}` });
    }
  };

  // Xuất Excel
  const handleExportExcel = () => {
    const exportData = filteredLoans.map(loan => ({
      "Mã phiếu": `#${loan.id}`,
      "Username": loan.user,
      "Họ và tên": loan.full_name || 'N/A', // Thêm cột này
      "Sách mượn": loan.book_names || 'N/A',
      "Ngày mượn": loan.borrow_date,
      "Ngày trả": loan.return_date || 'Chưa trả',
      "Trạng thái": loan.status === 'returned' ? 'Đã trả' : 'Đang mượn',
      "Tiền phạt": Number(getLoanFineTotal(loan) || 0).toLocaleString('vi-VN')
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bao_Cao_Muon_Tra");
    XLSX.writeFile(workbook, `Bao_Cao_Thu_Vien_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Xuất PDF
  const handleExportPDF = async () => {
    try {
      const doc = new jsPDF();
      await loadVietnameseFont(doc);
      doc.setFont('NotoSans', 'normal');
      doc.setFontSize(12);
      doc.text("BÁO CÁO MƯỢN TRẢ SÁCH - THƯ VIỆN PTIT", 14, 15);

      const tableColumn = ["Mã phiếu", "Username", "Họ và tên", "Sách mượn", "Ngày mượn", "Trạng thái", "Tiền phạt"];
      const tableRows = [];

      filteredLoans.forEach(loan => {
        const loanData = [
          `#${loan.id}`,
          loan.user || 'N/A',
          loan.full_name || 'N/A',
          getLoanBookNames(loan) || 'N/A',
          loan.borrow_date,
          loan.status === 'returned' ? 'Đã trả' : 'Đang mượn',
          `${Number(getLoanFineTotal(loan) || 0).toLocaleString('vi-VN')} đ`
        ];
        tableRows.push(loanData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
        styles: { font: 'NotoSans', fontStyle: 'normal' },
        headStyles: { font: 'NotoSans', fontStyle: 'normal' },
        bodyStyles: { font: 'NotoSans', fontStyle: 'normal' }
      });

      doc.save(`Bao_Cao_Thu_Vien_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      const errorDetail = err?.message || 'Không thể xuất PDF tiếng Việt.';
      setMessage({ type: 'error', text: `Lỗi xuất PDF: ${errorDetail}` });
    }
  };

  const filteredCategories = categories.filter((c) => {
    const normalizedFilter = categoryFilter.trim().toLowerCase();
    if (!normalizedFilter) return true;
    return String(c.id).includes(normalizedFilter) || c.name.toLowerCase().includes(normalizedFilter);
  });

  const filteredBooks = books.filter((b) => {
    const normalizedFilter = bookFilter.trim().toLowerCase();
    const matchesText = !normalizedFilter || String(b.id).includes(normalizedFilter) || (b.title || '').toLowerCase().includes(normalizedFilter);
    const matchesCategory = !bookCategoryFilter || String(b.category || '').includes(bookCategoryFilter);
    return matchesText && matchesCategory;
  });
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
              <h3>{editingCategoryId ? `1. Sửa Thể Loại #${editingCategoryId}` : '1. Thêm Thể Loại'}</h3>
              <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input placeholder="Tên thể loại (VD: Giáo trình)..." required value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}/>
                <input   placeholder="Ghi chú (Note)..."   value={categoryForm.note}   onChange={e => setCategoryForm({...categoryForm, note: e.target.value})}   style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}/>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {editingCategoryId ? 'Cập nhật Thể Loại' : 'Tạo Thể Loại'}
                  </button>
                  {editingCategoryId && (
                    <button type="button" onClick={handleCancelEditCategory} disabled={saving} style={{ padding: '10px 12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Hủy
                    </button>
                  )}
                </div>
              </form>
            </div>
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <h3 style={{ margin: 0 }}>Danh sách Thể Loại</h3>
                <input
                  type="text"
                  placeholder="Tìm theo ID hoặc tên thể loại..."
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  style={{ flex: '1', minWidth: '220px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f1f1', borderBottom: '2px solid #ccc' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'center', minWidth: '60px' }}>STT</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', minWidth: '70px' }}>Mã TL</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Tên thể loại</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Ghi chú</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', minWidth: '130px' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((c, index) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #e5e5e5' }}>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{c.id}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'left' }}><strong>{c.name}</strong></td>
                      <td style={{ padding: '10px 12px', textAlign: 'left', color: '#555' }}>{c.note || 'Không có ghi chú'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleEditCategory(c)}
                            disabled={saving}
                            style={{ padding: '6px 12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(c.id)}
                            disabled={saving}
                            style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCategories.length === 0 && (
                    <tr><td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: '#666' }}>Không có thể loại phù hợp.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #b01e23', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h3>{editingBookId ? `2. Sửa Sách #${editingBookId}` : '2. Thêm Sách Mới'}</h3>
            <form onSubmit={handleAddBook} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input placeholder="Tên sách..." required value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}/>
              <input placeholder="Tác giả..." value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}/>
              
              {/* Đã sửa pub_year thành published_year */}
              <input type="number" placeholder="Năm XB..." value={bookForm.published_year} onChange={e => setBookForm({...bookForm, published_year: e.target.value})} style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}/>
              
              <input placeholder="Nhà XB..." value={bookForm.publisher} onChange={e => setBookForm({...bookForm, publisher: e.target.value})} style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}/>
              
              <textarea placeholder="Mô tả sách..." value={bookForm.description} onChange={e => setBookForm({...bookForm, description: e.target.value})} rows={4} style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px', resize: 'vertical'}} />
              
              {/* Đã sửa category thành category_id */}
              <select required value={bookForm.category_id} onChange={e => setBookForm({...bookForm, category_id: e.target.value})} style={{padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}>
                <option value="">-- Chọn thể loại --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              
              {/* Nút chọn ảnh vẫn giữ nguyên, gọi hàm setCoverImage rất chuẩn */}
              <input type="file" accept="image/*" onChange={e => setCoverImage(e.target.files[0])} id="cover_image_input" />
              
              <div style={{display:'flex', gap:'10px'}}>
                <input type="number" placeholder="Tổng SL" min="1" required value={bookForm.total_quantity} onChange={e => setBookForm({...bookForm, total_quantity: e.target.value})} style={{width:'50%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}/>
                <input type="number" placeholder="SL sẵn có" min="0" required value={bookForm.available_quantity} onChange={e => setBookForm({...bookForm, available_quantity: e.target.value})} style={{width:'50%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px'}}/>
              </div>
              <div style={{ display:'flex', gap:'10px' }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', background: '#b01e23', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {editingBookId ? 'Cập nhật Sách' : 'Lưu Sách'}
                </button>
                {editingBookId && (
                  <button type="button" onClick={handleCancelEditBook} disabled={saving} style={{ padding: '10px 14px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>
          
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Danh sách Sách hiện có</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-end' }}>
                <input
                  type="text"
                  placeholder="Tìm theo ID hoặc tên sách..."
                  value={bookFilter}
                  onChange={e => setBookFilter(e.target.value)}
                  style={{ minWidth: '220px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <select
                  value={bookCategoryFilter}
                  onChange={e => setBookCategoryFilter(e.target.value)}
                  style={{ minWidth: '220px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="">-- Lọc theo thể loại --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={handleExportBooksExcel} style={{ padding: '6px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold' }}>
                  Xuất Excel
                </button>
                <button onClick={handleExportBooksPDF} style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold' }}>
                  Xuất PDF
                </button>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f1f1', borderBottom: '2px solid #ccc' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'center', minWidth: '60px' }}>STT</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', minWidth: '70px' }}>Mã sách</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Tên sách</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', minWidth: '100px' }}>Ảnh bìa</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Thể loại</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Tác giả</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', minWidth: '120px' }}>Tồn kho</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', minWidth: '150px' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((b, index) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #e5e5e5' }}>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{b.id}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'left' }}><strong>{b.title}</strong></td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {b.cover_image ? (
                        <img 
                          src={b.cover_image} 
                          alt="Ảnh bìa" 
                          style={{ width: '60px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                      ) : (
                        <span style={{ color: '#999', fontSize: '12px' }}>Không có ảnh</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'left' }}>{b.category_name || 'Chưa chọn'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'left' }}>{b.author || 'Chưa rõ'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{b.available_quantity}/{b.total_quantity}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleEditBook(b)}
                          disabled={saving}
                          style={{ padding: '6px 12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor:'pointer', fontWeight:'bold' }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBook(b.id)}
                          disabled={saving}
                          style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor:'pointer', fontWeight:'bold' }}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredBooks.length === 0 && (
                  <tr><td colSpan="8" style={{ padding: '12px', textAlign: 'center', color: '#666' }}>Không có sách phù hợp với tiêu chí tìm kiếm.</td></tr>
                )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0 }}>Danh sách Ghế</h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleExportSeatsExcel} style={{ padding: '6px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold' }}>
                      Xuất Excel
                    </button>
                    <button onClick={handleExportSeatsPDF} style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold' }}>
                      Xuất PDF
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <input
                    placeholder="Lọc theo mã ghế..."
                    value={seatFilterKeyword}
                    onChange={(e) => setSeatFilterKeyword(e.target.value)}
                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius:'4px', minWidth: '180px' }}
                  />
                  <select
                    value={seatFilterZone}
                    onChange={(e) => setSeatFilterZone(e.target.value)}
                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius:'4px', minWidth: '170px' }}
                  >
                    <option value="">Tất cả khu vực</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                  <select
                    value={seatFilterStatus}
                    onChange={(e) => setSeatFilterStatus(e.target.value)}
                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius:'4px', minWidth: '170px' }}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="available">Sẵn sàng</option>
                    <option value="occupied">Đang được sử dụng</option>
                    <option value="maintenance">Đang bảo trì</option>
                  </select>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#eee' }}>
                      <th style={{ padding: '10px' }}>STT</th>
                      <th style={{ padding: '10px' }}>Mã ghế</th>
                      <th style={{ padding: '10px' }}>Khu</th>
                      <th style={{ padding: '10px' }}>Trạng thái</th>
                      <th style={{ padding: '10px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSeats.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '12px', color:'#666', textAlign:'center' }}>
                          Không có ghế phù hợp bộ lọc.
                        </td>
                      </tr>
                    ) : filteredSeats.map((seat, index) => (
                      <tr key={seat.id} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '10px' }}>{index + 1}</td>
                        <td style={{ padding: '10px' }}>{seat.seat_number}</td>
                        <td style={{ padding: '10px' }}>{seat.zone?.name || seat.zone}</td>
                        <td style={{ padding: '10px' }}>
                          {getSeatStatusLabel(seat)}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteSeat(seat.id)}
                            disabled={saving}
                            style={{ padding: '6px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor:'pointer', fontWeight:'bold' }}
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ borderBottom: '2px solid #b01e23', paddingBottom: '10px', color: '#b01e23' }}>3. Duyệt Yêu Cầu Chỗ Ngồi (Check-in / Check-out)</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <input
                placeholder="Tìm theo mã ghế hoặc user..."
                value={reservationSearch}
                onChange={(e) => setReservationSearch(e.target.value)}
                style={{ flex: 1, minWidth: '220px', padding: '8px', border: '1px solid #ccc', borderRadius:'4px' }}
              />
              <select
                value={reservationStatusFilter}
                onChange={(e) => setReservationStatusFilter(e.target.value)}
                style={{ minWidth: '200px', padding: '8px', border: '1px solid #ccc', borderRadius:'4px' }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="booked">Chờ check-in</option>
                <option value="checked_in">Đang sử dụng</option>
                <option value="completed">Đã check-out</option>
              </select>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '15px', fontSize: '14px', lineHeight: 1.5 }}>
              <thead>
                <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #ccc' }}>
                  <th style={{ padding:'12px', textAlign:'center', minWidth:'60px' }}>STT</th>
                  <th style={{ padding:'12px', minWidth:'120px' }}>Ghế</th>
                  <th style={{ padding:'12px', minWidth:'140px' }}>Người đặt</th>
                  <th style={{ padding:'12px', minWidth:'160px' }}>Ngày đặt</th>
                  <th style={{ padding:'12px', minWidth:'170px' }}>Giờ sử dụng</th>
                  <th style={{ padding:'12px', minWidth:'150px' }}>Trạng thái</th>
                  <th style={{ padding:'12px', minWidth:'160px', textAlign:'center' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.length === 0 ? (
                  <tr><td colSpan="7" style={{ padding:'18px', textAlign:'center', color: '#777' }}>Không có yêu cầu đặt chỗ phù hợp.</td></tr>
                ) : (
                  filteredReservations.map((r, index) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #e6e6e6', background: index % 2 === 0 ? '#ffffff' : '#fbfbfb' }}>
                      <td style={{ padding:'12px', textAlign:'center', whiteSpace: 'nowrap' }}>{index + 1}</td>
                      <td style={{ padding:'12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{r.seat?.seat_number || r.seat || 'N/A'}</td>
                      <td style={{ padding:'12px', whiteSpace: 'nowrap' }}>{r.user || 'N/A'}</td>
                      <td style={{ padding:'12px', whiteSpace: 'nowrap' }}>{r.date || '—'}</td>
                      <td style={{ padding:'12px', whiteSpace: 'nowrap' }}>{r.start_time || '—'} - {r.end_time || '—'}</td>
                      <td style={{ padding:'12px', whiteSpace: 'nowrap' }}>
                        {r.status === 'booked' && <span style={{ color: '#d39e00', fontWeight:'bold' }}>⏳ Chờ check-in</span>}
                        {r.status === 'checked_in' && <span style={{ color: '#28a745', fontWeight:'bold' }}>✅ Đang sử dụng</span>}
                        {r.status === 'completed' && <span style={{ color: '#6c757d', fontWeight:'bold' }}>🔒 Đã check-out</span>}
                        {![ 'booked', 'checked_in', 'completed' ].includes(r.status) && (
                          <span style={{ color: 'red', fontWeight: 'bold' }}>{r.status || 'Không xác định'}</span>
                        )}
                      </td>
                      <td style={{ padding:'12px', textAlign:'center' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {r.status === 'booked' && (
                            <button onClick={() => handleUpdateReservation(r.id, 'check_in')} style={{ background: '#28a745', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold' }}>
                              Duyệt check-in
                            </button>
                          )}
                          {r.status === 'checked_in' && (
                            <button onClick={() => handleUpdateReservation(r.id, 'check_out')} style={{ background: '#17a2b8', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold' }}>
                              Check-out
                            </button>
                          )}
                        </div>
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
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '15px', fontSize: '14px', lineHeight: 1.5 }}>
            <thead>
              <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #ccc' }}>
                <th style={{ padding:'12px', textAlign:'center', minWidth:'60px' }}>STT</th>
                <th style={{ padding:'12px', minWidth:'100px' }}>Mã phiếu</th>
                <th style={{ padding:'12px', minWidth:'120px' }}>Username</th>
                <th style={{ padding:'12px', minWidth:'140px' }}>Họ và tên</th>
                <th style={{ padding:'12px', minWidth:'200px' }}>Sách mượn</th>
                <th style={{ padding:'12px', minWidth:'120px' }}>Ngày mượn</th>
                <th style={{ padding:'12px', minWidth:'120px' }}>Trạng thái</th>
                <th style={{ padding:'12px', minWidth:'120px' }}>Tiền phạt</th>
                <th style={{ padding:'12px', minWidth:'180px', textAlign:'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.length > 0 ? filteredLoans.map((loan, index) => (
                <tr key={loan.id} style={{ borderBottom: '1px solid #e6e6e6', background: index % 2 === 0 ? '#ffffff' : '#fbfbfb' }}>
                  <td style={{ padding:'12px', textAlign:'center', whiteSpace: 'nowrap' }}>{index + 1}</td>
                  <td style={{ padding:'12px', fontWeight: 600, whiteSpace: 'nowrap' }}>#{loan.id}</td>
                  <td style={{ padding:'12px', whiteSpace: 'nowrap' }}>{loan.user || 'N/A'}</td>
                  <td style={{ padding:'12px', whiteSpace: 'nowrap' }}>{loan.full_name || 'N/A'}</td>
                  <td style={{ padding:'12px' }}>
                    <button
                      type="button"
                      onClick={() => openLoanDetailModal(loan)}
                      style={{ background: 'none', border: 'none', color: '#0056b3', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: '14px' }}
                    >
                      {getLoanBookNames(loan) || 'Xem chi tiết phiếu'}
                    </button>
                  </td>
                  <td style={{ padding:'12px', whiteSpace: 'nowrap' }}>{loan.borrow_date || '—'}</td>
                  <td style={{ padding:'12px', whiteSpace: 'nowrap' }}>
                    <strong style={{ color: loan.status === 'returned' ? '#28a745' : '#ffc107' }}>
                      {loan.status === 'returned' ? '✅ Đã trả' : loan.status === 'borrowed' ? '📖 Đang mượn' : loan.status}
                    </strong>
                  </td>
                  <td style={{ padding:'12px', fontWeight: 'bold', color: getLoanFineTotal(loan) > 0 ? '#c62828' : '#2e7d32', whiteSpace: 'nowrap' }}>
                    {Number(getLoanFineTotal(loan) || 0).toLocaleString('vi-VN')} đ
                  </td>
                  <td style={{ padding:'12px', textAlign:'center' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {loan.status !== 'returned' && (
                        <button
                          onClick={() => handleUpdateLoan(loan.id)}
                          style={{ padding: '6px 12px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor:'pointer', fontWeight:'bold' }}
                        >
                          Xác nhận Đã Trả
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteLoan(loan.id)}
                        disabled={saving}
                        style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor:'pointer', fontWeight:'bold' }}
                      >
                        Xóa phiếu
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '18px', color: '#777' }}>
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
            <thead><tr style={{ background: '#eee' }}><th style={{padding:'10px'}}>STT</th><th style={{padding:'10px'}}>Username</th><th>Họ Tên</th><th>Role</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {users.map((u, index) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{padding:'10px'}}>{index + 1}</td>
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

      {selectedLoan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ width: 'min(900px, 96vw)', maxHeight: '88vh', overflowY: 'auto', background: '#fff', borderRadius: '10px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#b01e23' }}>Chi tiết phiếu mượn #{selectedLoan.id}</h3>
              <button type="button" onClick={closeLoanDetailModal} style={{ border: 'none', background: '#f0f0f0', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer' }}>
                Đóng
              </button>
            </div>

            <div style={{ marginBottom: '16px', background: '#f9f9f9', padding: '12px', borderRadius: '6px' }}>
              <p><strong>Người mượn:</strong> {selectedLoan.full_name || 'N/A'} ({selectedLoan.user || 'N/A'})</p>
              <p><strong>Ngày mượn:</strong> {selectedLoan.borrow_date} | <strong>Hạn trả:</strong> {selectedLoan.due_date}</p>
              <p><strong>Trạng thái:</strong> {selectedLoan.status === 'returned' ? 'Đã trả' : 'Đang mượn'}</p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
              <thead>
                <tr style={{ background: '#eee' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>STT</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Sách</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>SL mượn</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Tiền phạt (đ)</th>
                </tr>
              </thead>
              <tbody>
                {(selectedLoan.loan_details || []).map((detail, index) => (
                  <tr key={detail.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '10px' }}>{index + 1}</td>
                    <td style={{ padding: '10px' }}>{detail.book?.title || 'N/A'}</td>
                    <td style={{ padding: '10px' }}>{detail.quantity || 1}</td>
                    <td style={{ padding: '10px' }}>
                      <input
                        type="number"
                        min="0"
                        value={loanDetailFineMap[detail.id] ?? 0}
                        onChange={(e) => setLoanDetailFineMap({ ...loanDetailFineMap, [detail.id]: e.target.value })}
                        style={{ width: '140px', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={closeLoanDetailModal} style={{ padding: '8px 12px', border: 'none', background: '#6c757d', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>
                Hủy
              </button>
              <button
                type="button"
                disabled={loanDetailSaving}
                onClick={handleSaveLoanDetails}
                style={{ padding: '8px 12px', border: 'none', background: '#b01e23', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {loanDetailSaving ? 'Đang lưu...' : (selectedLoan.status === 'returned' ? 'Lưu tiền phạt' : 'Lưu và xác nhận đã trả')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminDashboard;