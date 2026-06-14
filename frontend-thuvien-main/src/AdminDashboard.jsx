import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Icon } from './components/Icons';
import PaginationBar from './components/PaginationBar';
import ExportButtons from './components/ExportButtons';
import { paginate } from './utils/pagination';
import { exportToExcel, exportToPDF } from './utils/exportReports';
import { getAuthHeaders } from './auth';

const roleLabelMap = {
  reader: 'Độc giả',
  librarian: 'Thủ thư',
  admin: 'Quản trị',
  staff: 'Nhân viên',
};

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('BOOKS');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  // Core data
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [zones, setZones] = useState([]);
  const [seats, setSeats] = useState([]);
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [reservations, setReservations] = useState([]);

  // UI state
  const [bookFilter, setBookFilter] = useState('');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [loanFilterText, setLoanFilterText] = useState('');
  const [loanFilterStatus, setLoanFilterStatus] = useState('all');
  const [seatFilterText, setSeatFilterText] = useState('');
  const [seatFilterZone, setSeatFilterZone] = useState('all');
  const [seatFilterStatus, setSeatFilterStatus] = useState('all');
  const [bookPage, setBookPage] = useState(1);
  const [bookPageSize, setBookPageSize] = useState(10);
  const [seatPage, setSeatPage] = useState(1);
  const [seatPageSize, setSeatPageSize] = useState(10);
  const [loanPage, setLoanPage] = useState(1);
  const [loanPageSize, setLoanPageSize] = useState(10);
  const [reservationFilterText, setReservationFilterText] = useState('');
  const [reservationFilterStatus, setReservationFilterStatus] = useState('all');
  const [reservationPage, setReservationPage] = useState(1);
  const [reservationPageSize, setReservationPageSize] = useState(10);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryPageSize, setCategoryPageSize] = useState(8);
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);
  const [userFilterText, setUserFilterText] = useState('');

  const [draggingSeatId, setDraggingSeatId] = useState(null);
  const [dragPosition, setDragPosition] = useState(null);
  const layoutContainerRef = useRef(null);

  // Forms
  const EMPTY_BOOK_FORM = { title: '', author: '', published_year: '', publisher: '', description: '', category: '', total_quantity: 1, available_quantity: 1 };
  const [bookForm, setBookForm] = useState(EMPTY_BOOK_FORM);
  const [coverImage, setCoverImage] = useState(null);
  const [editingBookId, setEditingBookId] = useState(null);

  const [categoryForm, setCategoryForm] = useState({ name: '', note: '' });
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loanDetailFineMap, setLoanDetailFineMap] = useState({});
  const [loanDetailSaving, setLoanDetailSaving] = useState(false);

  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [zoneForm, setZoneForm] = useState({ name: '', description: '', is_active: true });
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [zoneLayoutImage, setZoneLayoutImage] = useState(null);
  const [seatForm, setSeatForm] = useState({ seat_number: '', is_maintainance: false, x_position: '', y_position: '' });
  const [activeSeatId, setActiveSeatId] = useState(null);

  const getMediaUrl = (filePath) => {
    if (!filePath) return '';
    return filePath.startsWith('http') ? filePath : `http://127.0.0.1:8000${filePath}`;
  };

  const loanStatusLabelMap = {
    pending: 'Đang chờ duyệt',
    borrowed: 'Đang mượn',
    overdue: 'Quá hạn',
    return_pending: 'Chờ xác nhận trả',
    returned: 'Đã trả',
    cancelled: 'Đã hủy',
    rejected: 'Đã từ chối',
  };

  const reservationStatusLabelMap = {
    pending: 'Đang chờ',
    approved: 'Đã duyệt',
    checked_in: 'Đang ngồi',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy',
    rejected: 'Đã từ chối',
    booked: 'Đã đặt',
  };

  const loadData = async () => {
    try {
      const config = await getAuthHeaders();
      const [bRes, cRes, zRes, sRes, uRes, lRes, rRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/books/books/', config).catch(() => ({ data: [] })),
        axios.get('http://127.0.0.1:8000/api/books/categories/', config).catch(() => ({ data: [] })),
        axios.get('http://127.0.0.1:8000/api/library/zones/', config).catch(() => ({ data: [] })),
        axios.get('http://127.0.0.1:8000/api/library/seats/', config).catch(() => ({ data: [] })),
        axios.get('http://127.0.0.1:8000/api/core/users/', config).catch(() => ({ data: [] })),
        axios.get('http://127.0.0.1:8000/api/loans/loans/', config).catch(() => ({ data: [] })),
        axios.get('http://127.0.0.1:8000/api/library/reservations/', config).catch(() => ({ data: [] })),
      ]);

      setBooks(bRes.data || []);
      setCategories(cRes.data || []);
      setZones(zRes.data || []);
      setSeats(sRes.data || []);
      setUsers(uRes.data || []);
      setLoans(lRes.data || []);
      setReservations(rRes.data || []);
    } catch (err) {
      console.error('Load data error', err);
      setMessage({ type: 'error', text: 'Lỗi tải dữ liệu từ server.' });
    }
  };

  useEffect(() => { loadData(); }, []);

  // ======= Book handlers =======
  const handleAddCategory = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const config = await getAuthHeaders();
      if (editingCategoryId) {
        await axios.patch(`http://127.0.0.1:8000/api/books/categories/${editingCategoryId}/`, categoryForm, config);
        setMessage({ type: 'success', text: 'Cập nhật thể loại thành công.' });
      } else {
        await axios.post('http://127.0.0.1:8000/api/books/categories/', categoryForm, config);
        setMessage({ type: 'success', text: 'Tạo thể loại thành công.' });
      }
      setCategoryForm({ name: '', note: '' }); setEditingCategoryId(null);
      loadData();
    } catch (err) { console.error(err); setMessage({ type: 'error', text: 'Lỗi khi lưu thể loại.' }); }
    setSaving(false);
  };

  const handleEditCategory = (c) => { setCategoryForm({ name: c.name, note: c.note || '' }); setEditingCategoryId(c.id); };
  const handleDeleteCategory = async (id) => { if (!confirm('Xóa thể loại?')) return; const config = await getAuthHeaders(); await axios.delete(`http://127.0.0.1:8000/api/books/categories/${id}/`, config).catch(()=>{}); loadData(); };

  const handleAddBook = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const config = await getAuthHeaders();
      const form = new FormData();
      Object.keys(bookForm).forEach(k => form.append(k, bookForm[k]));
      if (coverImage) form.append('cover_image', coverImage);
      if (editingBookId) await axios.patch(`http://127.0.0.1:8000/api/books/books/${editingBookId}/`, form, { ...config, headers: { ...(config.headers||{}), 'Content-Type': 'multipart/form-data' } });
      else await axios.post('http://127.0.0.1:8000/api/books/books/', form, { ...config, headers: { ...(config.headers||{}), 'Content-Type': 'multipart/form-data' } });
      setMessage({ type: 'success', text: 'Lưu sách thành công.' });
      setBookForm(EMPTY_BOOK_FORM); setCoverImage(null); setEditingBookId(null); loadData();
    } catch (err) { console.error(err); setMessage({ type: 'error', text: 'Lỗi khi lưu sách.' }); }
    setSaving(false);
  };

  const handleEditBook = (b) => { setBookForm({ title: b.title || '', author: b.author || '', published_year: b.published_year || '', publisher: b.publisher || '', description: b.description || '', category: b.category || '', total_quantity: b.total_quantity || 1, available_quantity: b.available_quantity || 1 }); setEditingBookId(b.id); };
  const handleDeleteBook = async (id) => { if (!confirm('Xóa sách này?')) return; const config = await getAuthHeaders(); await axios.delete(`http://127.0.0.1:8000/api/books/books/${id}/`, config).catch(()=>{}); loadData(); };

  const handleAddZone = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const config = await getAuthHeaders();
      if (editingZoneId) {
        await axios.patch(`http://127.0.0.1:8000/api/library/zones/${editingZoneId}/`, zoneForm, config);
        setMessage({ type: 'success', text: 'Cập nhật khu vực thành công.' });
      } else {
        await axios.post('http://127.0.0.1:8000/api/library/zones/', zoneForm, config);
        setMessage({ type: 'success', text: 'Tạo khu vực thành công.' });
      }
      setZoneForm({ name: '', description: '', is_active: true });
      setEditingZoneId(null);
      setSelectedZoneId('');
      loadData();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Lỗi khi lưu khu vực.' });
    }
    setSaving(false);
  };

  const handleEditZone = (zone) => {
    setZoneForm({ name: zone.name || '', description: zone.description || '', is_active: zone.is_active });
    setEditingZoneId(zone.id);
  };

  const handleDeleteZone = async (id) => {
    if (!confirm('Xóa khu vực này?')) return;
    const config = await getAuthHeaders();
    await axios.delete(`http://127.0.0.1:8000/api/library/zones/${id}/`, config).catch(() => {});
    setSelectedZoneId((prev) => (String(prev) === String(id) ? '' : prev));
    loadData();
  };

  const handleZoneSelect = (id) => {
    setSelectedZoneId(id);
    setActiveSeatId(null);
    setSeatForm({ seat_number: '', is_maintainance: false, x_position: '', y_position: '' });
  };

  const handleReservationApprove = async (id) => {
    try {
      const config = await getAuthHeaders();
      await axios.patch(`http://127.0.0.1:8000/api/library/reservations/${id}/approve/`, {}, config);
      setMessage({ type: 'success', text: 'Đã duyệt đặt chỗ.' });
      loadData();
    } catch (err) {
      console.error('Approve reservation error:', err.response?.data || err.message || err);
      setMessage({ type: 'error', text: 'Lỗi khi duyệt đặt chỗ.' });
    }
  };

  const handleReservationReject = async (id) => {
    try {
      const config = await getAuthHeaders();
      await axios.patch(`http://127.0.0.1:8000/api/library/reservations/${id}/reject/`, {}, config);
      setMessage({ type: 'success', text: 'Đã từ chối đặt chỗ.' });
      loadData();
    } catch (err) {
      console.error('Reject reservation error:', err.response?.data || err.message || err);
      setMessage({ type: 'error', text: 'Lỗi khi từ chối đặt chỗ.' });
    }
  };

  const getAdminSeatStatus = (seat) => {
    if (seat.is_maintainance) return 'maintenance';
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentTime = now.toTimeString().slice(0, 5);
    const occupied = reservations.some((reservation) => {
      const rSeatId = reservation.seat?.id || reservation.seat;
      if (String(rSeatId) !== String(seat.id)) return false;
      if (!['approved', 'checked_in', 'booked'].includes(reservation.status)) return false;
      if (reservation.date !== today) return false;
      return reservation.start_time <= currentTime && reservation.end_time > currentTime;
    });
    if (occupied) return 'occupied';
    const reserved = reservations.some((reservation) => {
      const rSeatId = reservation.seat?.id || reservation.seat;
      if (String(rSeatId) !== String(seat.id)) return false;
      if (!['approved', 'booked'].includes(reservation.status)) return false;
      return reservation.date >= today;
    });
    return reserved ? 'reserved' : 'available';
  };

  const statusIconMap = {
    available: 'seat',
    reserved: 'check',
    occupied: 'close',
    maintenance: 'warning',
  };

  const saveSeatPosition = async (seatId, x, y) => {
    try {
      const authConfig = await getAuthHeaders();
      const headers = {
        ...(authConfig.headers || {}),
        'Content-Type': 'application/json',
      };
      const payload = {
        x_position: Number(x.toFixed(2)),
        y_position: Number(y.toFixed(2)),
      };
      await axios.patch(`http://127.0.0.1:8000/api/library/seats/${seatId}/`, payload, { headers });
      loadData();
      setMessage({ type: 'success', text: 'Đã cập nhật vị trí ghế.' });
    } catch (err) {
      console.error('Seat update error:', err.response?.data || err.message || err);
      const serverMessage = err.response?.data ?
        (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)) :
        'Lỗi khi cập nhật vị trí ghế.';
      setMessage({ type: 'error', text: `Lỗi cập nhật vị trí ghế: ${serverMessage}` });
    }
  };

  const handleMarkerPointerDown = (seat, event) => {
    event.preventDefault();
    event.stopPropagation();
    setDraggingSeatId(seat.id);
    setSelectedZoneId(String(seat.zone));
    setSelectedSeat(String(seat.id));
    setActiveSeatId(seat.id);
    setSeatForm({
      seat_number: seat.seat_number || '',
      is_maintainance: seat.is_maintainance || false,
      x_position: seat.x_position || '',
      y_position: seat.y_position || '',
    });
  };

  useEffect(() => {
    if (!draggingSeatId) return undefined;
    const handlePointerMove = (event) => {
      if (!layoutContainerRef.current) return;
      const rect = layoutContainerRef.current.getBoundingClientRect();
      let x = ((event.clientX - rect.left) / rect.width) * 100;
      let y = ((event.clientY - rect.top) / rect.height) * 100;
      x = Math.min(100, Math.max(0, x));
      y = Math.min(100, Math.max(0, y));
      setDragPosition({ x, y });
      setSeatForm((prev) => ({ ...prev, x_position: x.toFixed(1), y_position: y.toFixed(1) }));
    };
    const handlePointerUp = () => {
      if (dragPosition && draggingSeatId) {
        saveSeatPosition(draggingSeatId, dragPosition.x, dragPosition.y);
      }
      setDraggingSeatId(null);
      setDragPosition(null);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingSeatId, dragPosition]);

  const handleZoneLayoutUpload = async (e) => {
    e.preventDefault();
    if (!selectedZoneId || !zoneLayoutImage) {
      setMessage({ type: 'error', text: 'Chọn khu vực và file sơ đồ để tải lên.' });
      return;
    }

    setSaving(true);
    try {
      const config = await getAuthHeaders();
      const formData = new FormData();
      formData.append('layout_image', zoneLayoutImage);
      await axios.patch(`http://127.0.0.1:8000/api/library/zones/${selectedZoneId}/`, formData, {
        ...config,
        headers: {
          ...(config.headers || {}),
          'Content-Type': 'multipart/form-data',
        },
      });
      setZoneLayoutImage(null);
      setMessage({ type: 'success', text: 'Tải lên sơ đồ khu vực thành công.' });
      loadData();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Lỗi khi tải lên sơ đồ khu vực.' });
    }
    setSaving(false);
  };

  const handleSeatSelect = (seat) => {
    setActiveSeatId(seat.id);
    setSelectedZoneId(seat.zone);
    setSeatForm({
      seat_number: seat.seat_number || '',
      is_maintainance: seat.is_maintainance || false,
      x_position: seat.x_position || '',
      y_position: seat.y_position || '',
    });
  };

  const handleSeatFormSubmit = async (e) => {
    e.preventDefault();
    if (!selectedZoneId || !seatForm.seat_number) {
      setMessage({ type: 'error', text: 'Chọn khu vực và nhập mã ghế.' });
      return;
    }

    setSaving(true);
    try {
      const config = await getAuthHeaders();
      const payload = {
        zone: selectedZoneId,
        seat_number: seatForm.seat_number,
        is_maintainance: seatForm.is_maintainance,
        x_position: seatForm.x_position || null,
        y_position: seatForm.y_position || null,
      };

      if (activeSeatId) {
        await axios.patch(`http://127.0.0.1:8000/api/library/seats/${activeSeatId}/`, payload, config);
        setMessage({ type: 'success', text: 'Cập nhật ghế thành công.' });
      } else {
        await axios.post('http://127.0.0.1:8000/api/library/seats/', payload, config);
        setMessage({ type: 'success', text: 'Tạo ghế mới thành công.' });
      }
      setActiveSeatId(null);
      setSeatForm({ seat_number: '', is_maintainance: false, x_position: '', y_position: '' });
      loadData();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Lỗi khi lưu ghế.' });
    }
    setSaving(false);
  };

  const handleDeleteSeat = async (id) => {
    if (!confirm('Xóa ghế này?')) return;
    const config = await getAuthHeaders();
    await axios.delete(`http://127.0.0.1:8000/api/library/seats/${id}/`, config).catch(() => {});
    setActiveSeatId((prev) => (String(prev) === String(id) ? null : prev));
    loadData();
  };

  const handleLayoutClick = (event) => {
    if (!selectedZoneId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setSeatForm((prev) => ({ ...prev, x_position: x.toFixed(1), y_position: y.toFixed(1) }));
  };

  const zoneSeats = seats.filter((seat) => String(seat.zone) === String(selectedZoneId));

  const getSeatDisplayPosition = (seat, index, totalSeats) => {
    const hasCoordinates = seat.x_position != null && seat.y_position != null;
    if (hasCoordinates) {
      return { x: seat.x_position, y: seat.y_position };
    }

    const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(totalSeats))));
    const rows = Math.ceil(totalSeats / columns);
    const col = index % columns;
    const row = Math.floor(index / columns);
    const xStep = 90 / (columns - 1 || 1);
    const yStep = 86 / (rows - 1 || 1);

    return {
      x: 5 + col * xStep,
      y: 8 + row * yStep,
    };
  };

  // ======= Exports =======
  const bookExportColumns = [
    { key: 'id', label: 'Mã sách' },
    { key: 'title', label: 'Tên sách' },
    { key: 'author', label: 'Tác giả' },
    { key: 'category', label: 'Thể loại' },
    { key: 'publisher', label: 'Nhà xuất bản' },
    { key: 'stock', label: 'Tồn kho (còn/tổng)' },
  ];

  const handleExportBooksExcel = () => {
    const rows = filteredBooks.map((book) => ({
      id: book.id,
      title: book.title || '',
      author: book.author || '',
      category: book.category_name || '',
      publisher: book.publisher || '',
      stock: `${book.available_quantity || 0}/${book.total_quantity || 0}`,
    }));
    exportToExcel({
      title: 'Danh sách sách',
      sheetName: 'Danh sach sach',
      filePrefix: 'danh_sach_sach',
      columns: bookExportColumns,
      rows,
    });
  };

  const handleExportBooksPDF = async () => {
    try {
      await exportToPDF({
        title: 'BÁO CÁO DANH SÁCH SÁCH',
        subtitle: 'Thư viện PTIT',
        filePrefix: 'danh_sach_sach',
        columns: bookExportColumns,
        rows: filteredBooks.map((book) => ({
          id: book.id,
          title: book.title || '',
          author: book.author || '',
          category: book.category_name || '',
          publisher: book.publisher || '',
          stock: `${book.available_quantity || 0}/${book.total_quantity || 0}`,
        })),
      });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Lỗi xuất PDF danh sách sách.' });
    }
  };

  const seatExportColumns = [
    { key: 'id', label: 'Mã ghế' },
    { key: 'seat', label: 'Số ghế' },
    { key: 'zone', label: 'Khu vực' },
    { key: 'position', label: 'Vị trí trên sơ đồ' },
    { key: 'status', label: 'Trạng thái' },
  ];

  const buildSeatExportRows = () => filteredSeats.map((seat) => ({
    id: seat.id,
    seat: seat.seat_number || '',
    zone: zones.find((zone) => String(zone.id) === String(seat.zone))?.name || seat.zone,
    position: seat.x_position != null && seat.y_position != null ? `${seat.x_position}% / ${seat.y_position}%` : 'Chưa đặt',
    status: seat.is_maintainance ? 'Bảo trì' : 'Sẵn sàng',
  }));

  const handleExportSeatsExcel = () => {
    exportToExcel({
      title: 'Danh sách ghế',
      sheetName: 'Danh sach ghe',
      filePrefix: 'danh_sach_ghe',
      columns: seatExportColumns,
      rows: buildSeatExportRows(),
    });
  };

  const handleExportSeatsPDF = async () => {
    try {
      await exportToPDF({
        title: 'BÁO CÁO DANH SÁCH GHẾ',
        subtitle: 'Thư viện PTIT',
        filePrefix: 'danh_sach_ghe',
        columns: seatExportColumns,
        rows: buildSeatExportRows(),
      });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Lỗi xuất PDF danh sách ghế.' });
    }
  };

  const loanExportColumns = [
    { key: 'id', label: 'Mã phiếu' },
    { key: 'borrower', label: 'Người mượn' },
    { key: 'borrowDate', label: 'Ngày mượn' },
    { key: 'dueDate', label: 'Hạn trả' },
    { key: 'books', label: 'Sách mượn' },
    { key: 'status', label: 'Trạng thái' },
  ];

  const buildLoanExportRows = () => filteredLoans.map((loan) => ({
    id: `#${loan.id}`,
    borrower: loan.full_name || loan.user || '',
    borrowDate: loan.borrow_date || '',
    dueDate: loan.due_date || '',
    books: loan.book_names || '',
    status: loan.status_display || loanStatusLabelMap[loan.status] || loan.status,
  }));

  const handleExportLoansExcel = () => {
    exportToExcel({
      title: 'Danh sách phiếu mượn',
      sheetName: 'Phieu muon',
      filePrefix: 'danh_sach_phieu_muon',
      columns: loanExportColumns,
      rows: buildLoanExportRows(),
    });
  };

  const handleExportLoansPDF = async () => {
    try {
      await exportToPDF({
        title: 'BÁO CÁO PHIẾU MƯỢN SÁCH',
        subtitle: 'Thư viện PTIT',
        filePrefix: 'danh_sach_phieu_muon',
        columns: loanExportColumns,
        rows: buildLoanExportRows(),
      });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Lỗi xuất PDF phiếu mượn.' });
    }
  };

  const reservationExportColumns = [
    { key: 'id', label: 'Mã đặt chỗ' },
    { key: 'user', label: 'Người dùng' },
    { key: 'seat', label: 'Ghế' },
    { key: 'zone', label: 'Khu vực' },
    { key: 'date', label: 'Ngày' },
    { key: 'time', label: 'Khung giờ' },
    { key: 'status', label: 'Trạng thái' },
  ];

  const buildReservationExportRows = () => filteredReservations.map((reservation) => ({
    id: reservation.id,
    user: reservation.user?.full_name || reservation.user?.username || '',
    seat: reservation.seat?.seat_number || '',
    zone: reservation.seat?.zone?.name || '',
    date: reservation.date || '',
    time: `${reservation.start_time || ''} - ${reservation.end_time || ''}`,
    status: reservationStatusLabelMap[reservation.status] || reservation.status,
  }));

  const handleExportReservationsExcel = () => {
    exportToExcel({
      title: 'Danh sách đặt chỗ',
      sheetName: 'Dat cho',
      filePrefix: 'danh_sach_dat_cho',
      columns: reservationExportColumns,
      rows: buildReservationExportRows(),
    });
  };

  const handleExportReservationsPDF = async () => {
    try {
      await exportToPDF({
        title: 'BÁO CÁO ĐẶT CHỖ NGỒI',
        subtitle: 'Thư viện PTIT',
        filePrefix: 'danh_sach_dat_cho',
        columns: reservationExportColumns,
        rows: buildReservationExportRows(),
      });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Lỗi xuất PDF đặt chỗ.' });
    }
  };

  const userExportColumns = [
    { key: 'id', label: 'Mã người dùng' },
    { key: 'username', label: 'Tên đăng nhập' },
    { key: 'fullName', label: 'Họ và tên' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Vai trò' },
  ];

  const handleExportUsersExcel = () => {
    exportToExcel({
      title: 'Danh sách người dùng',
      sheetName: 'Nguoi dung',
      filePrefix: 'danh_sach_nguoi_dung',
      columns: userExportColumns,
      rows: filteredUsers.map((user) => ({
        id: user.id,
        username: user.username || '',
        fullName: user.full_name || '',
        email: user.email || '',
        role: roleLabelMap[user.role] || user.role || '',
      })),
    });
  };

  const handleExportUsersPDF = async () => {
    try {
      await exportToPDF({
        title: 'BÁO CÁO NGƯỜI DÙNG',
        subtitle: 'Thư viện PTIT',
        filePrefix: 'danh_sach_nguoi_dung',
        columns: userExportColumns,
        rows: filteredUsers.map((user) => ({
          id: user.id,
          username: user.username || '',
          fullName: user.full_name || '',
          email: user.email || '',
          role: roleLabelMap[user.role] || user.role || '',
        })),
      });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Lỗi xuất PDF người dùng.' });
    }
  };

  // ======= Loans modal =======
  const openLoanDetailModal = (loan) => { setSelectedLoan(loan); const map = {}; (loan.loan_details||[]).forEach(d=> map[d.id]=d.fine_amounts||0); setLoanDetailFineMap(map); };
  const closeLoanDetailModal = () => { setSelectedLoan(null); setLoanDetailFineMap({}); };
  const handleSaveLoanDetails = async () => {
    if (!selectedLoan) return;
    setLoanDetailSaving(true);
    try {
      const config = await getAuthHeaders();
      const updates = Object.entries(loanDetailFineMap).map(([detailId, fine]) =>
        axios.patch(
          `http://127.0.0.1:8000/api/loans/loandetails/${detailId}/`,
          { fine_amounts: Number(fine) || 0 },
          config
        )
      );
      await Promise.all(updates);

      if (selectedLoan.status === 'return_pending') {
        await axios.patch(
          `http://127.0.0.1:8000/api/loans/loans/${selectedLoan.id}/finalize_return/`,
          {},
          config
        );
        setMessage({ type: 'success', text: 'Đã xác nhận tiền phạt và hoàn tất phiếu trả.' });
      } else {
        setMessage({ type: 'success', text: 'Cập nhật phiếu mượn thành công.' });
      }

      loadData();
      closeLoanDetailModal();
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: e.response?.data?.error || 'Lỗi lưu chi tiết phiếu.' });
    }
    setLoanDetailSaving(false);
  };

  const handleLoanApprove = async (loanId) => {
    try {
      const config = await getAuthHeaders();
      await axios.patch(`http://127.0.0.1:8000/api/loans/loans/${loanId}/approve/`, {}, config);
      setMessage({ type: 'success', text: 'Phiếu mượn đã được duyệt.' });
      loadData();
    } catch (err) {
      console.error('Approve loan error:', err.response?.data || err.message || err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Lỗi khi duyệt phiếu mượn.' });
    }
  };

  const handleLoanReject = async (loanId) => {
    try {
      const config = await getAuthHeaders();
      await axios.patch(`http://127.0.0.1:8000/api/loans/loans/${loanId}/reject/`, {}, config);
      setMessage({ type: 'success', text: 'Phiếu mượn đã bị từ chối.' });
      loadData();
    } catch (err) {
      console.error('Reject loan error:', err.response?.data || err.message || err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Lỗi khi từ chối phiếu mượn.' });
    }
  };


  // Derived lists
  const filteredBooks = books.filter(b => { const q = bookFilter.trim().toLowerCase(); const matches = !q || `${b.title||''} ${b.author||''}`.toLowerCase().includes(q) || String(b.id).includes(q); if (showOnlyAvailable) return matches && (b.available_quantity||0) > 0; return matches; });
  const booksPageData = paginate(filteredBooks, bookPage, bookPageSize);
  const pagedBooks = booksPageData.items;
  const currentBookPage = booksPageData.currentPage;
  const bookPageCount = booksPageData.pageCount;

  const filteredSeats = seats.filter((seat) => {
    const text = seatFilterText.trim().toLowerCase();
    const matchesText = !text || `${seat.seat_number || ''} ${seat.id || ''}`.toLowerCase().includes(text);
    const matchesZone = seatFilterZone === 'all' || String(seat.zone) === String(seatFilterZone);
    const matchesStatus = seatFilterStatus === 'all' ||
      (seatFilterStatus === 'maintenance' ? !!seat.is_maintainance : !seat.is_maintainance);
    return matchesText && matchesZone && matchesStatus;
  });
  const seatsPageData = paginate(filteredSeats, seatPage, seatPageSize);
  const pagedSeats = seatsPageData.items;
  const currentSeatPage = seatsPageData.currentPage;
  const seatPageCount = seatsPageData.pageCount;

  const sortedLoans = [...loans].sort((a, b) => {
    if (a.borrow_date && b.borrow_date) {
      return String(b.borrow_date).localeCompare(String(a.borrow_date));
    }
    return (b.id || 0) - (a.id || 0);
  });

  const filteredLoans = sortedLoans.filter((loan) => {
    const text = loanFilterText.trim().toLowerCase();
    const matchesText = !text || `${loan.full_name || loan.user || ''}`.toLowerCase().includes(text) || String(loan.id).includes(text);
    const matchesStatus = loanFilterStatus === 'all' || String(loan.status) === loanFilterStatus;
    return matchesText && matchesStatus;
  });
  const loansPageData = paginate(filteredLoans, loanPage, loanPageSize);
  const pagedLoans = loansPageData.items;
  const currentLoanPage = loansPageData.currentPage;
  const loanPageCount = loansPageData.pageCount;

  const filteredReservations = reservations.filter((reservation) => {
    const text = reservationFilterText.trim().toLowerCase();
    const matchesText = !text || `${reservation.user?.full_name || reservation.user?.username || ''}`.toLowerCase().includes(text)
      || `${reservation.seat?.seat_number || ''}`.toLowerCase().includes(text)
      || `${reservation.seat?.zone?.name || ''}`.toLowerCase().includes(text);
    const matchesStatus = reservationFilterStatus === 'all' || reservation.status === reservationFilterStatus;
    return matchesText && matchesStatus;
  });
  const reservationsPageData = paginate(filteredReservations, reservationPage, reservationPageSize);
  const pagedReservations = reservationsPageData.items;
  const currentReservationPage = reservationsPageData.currentPage;
  const reservationPageCount = reservationsPageData.pageCount;

  const categoriesPageData = paginate(categories, categoryPage, categoryPageSize);
  const pagedCategories = categoriesPageData.items;
  const currentCategoryPage = categoriesPageData.currentPage;
  const categoryPageCount = categoriesPageData.pageCount;

  const filteredUsers = users.filter((user) => {
    const text = userFilterText.trim().toLowerCase();
    if (!text) return true;
    return `${user.username || ''} ${user.full_name || ''} ${user.email || ''} ${user.role || ''}`.toLowerCase().includes(text)
      || String(user.id).includes(text);
  });
  const usersPageData = paginate(filteredUsers, userPage, userPageSize);
  const pagedUsers = usersPageData.items;
  const currentUserPage = usersPageData.currentPage;
  const userPageCount = usersPageData.pageCount;

  // Quick stats feature (new)
  const stats = { books: books.length, users: users.length, seats: seats.length, reservations: reservations.length };

  const overdueLoansCount = loans.filter((l) => l.status === 'overdue').length;
  
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
    <div className="container admin-dashboard-container">
      <div className="admin-header">
        <div>
          <h2><Icon name="admin" size={24} className="heading-icon" /> BẢNG ĐIỀU KHIỂN QUẢN TRỊ</h2>
          <p className="dashboard-note">Quản lý sách, khu vực, ghế, phiếu mượn và người dùng trong hệ thống.</p>
        </div>
        <div className="admin-tabs">
          {['BOOKS','LIBRARY','RESERVATIONS','LOANS','USERS'].map((t) => (
            <button
              key={t}
              type="button"
              className={activeTab === t ? 'active' : ''}
              onClick={() => { setActiveTab(t); setMessage({ type:'', text:'' }); }}
            >
              {t === 'BOOKS' ? 'Sách' : t === 'LIBRARY' ? 'Khu vực' : t === 'RESERVATIONS' ? 'Đặt chỗ' : t === 'LOANS' ? 'Phiếu mượn' : 'Người dùng'}
            </button>
          ))}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-card-books"><span className="stat-label">Sách</span><strong>{stats.books}</strong></div>
        <div className="stat-card stat-card-users"><span className="stat-label">Người dùng</span><strong>{stats.users}</strong></div>
        <div className="stat-card stat-card-seats"><span className="stat-label">Ghế</span><strong>{stats.seats}</strong></div>
        <div className="stat-card stat-card-reservations"><span className="stat-label">Đặt chỗ</span><strong>{stats.reservations}</strong></div>
      </div>

      {(overdueLoansCount > 0 || overdueReservationsCount > 0) && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '24px',
          padding: '16px 20px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '14px',
          boxShadow: '0 4px 12px rgba(251, 191, 36, 0.08)'
        }}>
          <h4 style={{ margin: 0, color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span> Cảnh báo hệ thống cần xử lý:
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
            {overdueLoansCount > 0 && (
              <span style={{ color: '#d97706', fontWeight: 500 }}>
                • Có <strong>{overdueLoansCount}</strong> phiếu mượn sách đã quá hạn trả! 
                <button 
                  type="button" 
                  onClick={() => { setActiveTab('LOANS'); setLoanFilterStatus('overdue'); }} 
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#b45309',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    marginLeft: '8px',
                    padding: 0
                  }}
                >
                  Xem danh sách quá hạn
                </button>
              </span>
            )}
            {overdueReservationsCount > 0 && (
              <span style={{ color: '#d97706', fontWeight: 500 }}>
                • Có <strong>{overdueReservationsCount}</strong> phiếu đặt chỗ ngồi đã quá giờ quy định!
                <button 
                  type="button" 
                  onClick={() => { setActiveTab('RESERVATIONS'); setReservationFilterStatus('all'); setReservationFilterText(''); }} 
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#b45309',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    marginLeft: '8px',
                    padding: 0
                  }}
                >
                  Xem danh sách đặt chỗ
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {message.text && (
        <div className={`panel ${message.type === 'success' ? 'badge-success' : 'badge-danger'}`} style={{ marginBottom: 20 }}>
          {message.text}
        </div>
      )}

      {activeTab === 'BOOKS' && (
        <div className="split-grid" style={{ gridTemplateColumns: '1fr 1.8fr' }}>
          <div className="panel">
            <h3>{editingCategoryId ? `Sửa Thể Loại #${editingCategoryId}` : 'Thêm Thể Loại'}</h3>
            <form onSubmit={handleAddCategory} className="form-grid">
              <input
                className="input-rounded"
                required
                placeholder="Tên thể loại"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              />
              <input
                className="input-rounded"
                placeholder="Ghi chú"
                value={categoryForm.note}
                onChange={(e) => setCategoryForm({ ...categoryForm, note: e.target.value })}
              />
              <div className="form-row">
                <button type="submit" disabled={saving} className="btn-primary">
                  {editingCategoryId ? 'Cập nhật' : 'Tạo'}
                </button>
                {editingCategoryId && (
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => { setEditingCategoryId(null); setCategoryForm({ name:'', note:'' }); }}
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>

            <div className="section-block" style={{ marginTop: 24 }}>
              <div className="list-section-header">
                <div>
                  <h4>Danh sách thể loại ({categories.length})</h4>
                </div>
              </div>
              <PaginationBar
                total={categories.length}
                page={currentCategoryPage}
                pageSize={categoryPageSize}
                pageCount={categoryPageCount}
                onPageChange={setCategoryPage}
                onPageSizeChange={(size) => { setCategoryPageSize(size); setCategoryPage(1); }}
                pageSizeOptions={[5, 8, 15, 30]}
              />
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>ID</th>
                    <th>Tên</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCategories.length > 0 ? pagedCategories.map((c, i) => (
                    <tr key={c.id}>
                      <td>{(currentCategoryPage - 1) * categoryPageSize + i + 1}</td>
                      <td>{c.id}</td>
                      <td>{c.name}</td>
                      <td className="table-actions">
                        <button type="button" onClick={() => handleEditCategory(c)}>Sửa</button>
                        <button type="button" onClick={() => handleDeleteCategory(c.id)}>Xóa</button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="empty-row">Chưa có thể loại nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="section-title">Quản lý sách</div>
            <div className="form-row">
              <input
                className="input-rounded"
                placeholder="Tìm sách..."
                value={bookFilter}
                onChange={(e) => { setBookPage(1); setBookFilter(e.target.value); }}
              />
              <label className="action-pill" style={{ alignItems: 'center' }}>
                <input type="checkbox" checked={showOnlyAvailable} onChange={(e) => { setBookPage(1); setShowOnlyAvailable(e.target.checked); }} />
                Chỉ sách còn
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <ExportButtons onExportExcel={handleExportBooksExcel} onExportPDF={handleExportBooksPDF} disabled={filteredBooks.length === 0} />
              </div>
            </div>

            <div className="panel" style={{ padding: 20, marginTop: 20, marginBottom: 20 }}>
              <h4>{editingBookId ? `Sửa Sách #${editingBookId}` : 'Thêm Sách'}</h4>
              <form onSubmit={handleAddBook} className="form-grid">
                <div className="form-row">
                  <input
                    className="input-rounded"
                    placeholder="Tiêu đề"
                    required
                    value={bookForm.title}
                    onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  />
                  <input
                    className="input-rounded"
                    placeholder="Tác giả"
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <input
                    className="input-rounded"
                    placeholder="Nhà xuất bản"
                    value={bookForm.publisher}
                    onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                  />
                  <input
                    className="input-rounded"
                    type="number"
                    placeholder="Năm XB"
                    value={bookForm.published_year}
                    onChange={(e) => setBookForm({ ...bookForm, published_year: e.target.value })}
                  />
                </div>
                <div className="form-row" style={{ alignItems: 'center' }}>
                  <select
                    className="select-rounded"
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                  >
                    <option value="">-- Chọn thể loại --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                    <span className="dashboard-note" style={{ margin: 0, whiteSpace: 'nowrap' }}>Ảnh bìa:</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCoverImage(e.target.files[0])}
                      style={{ fontSize: 14 }}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <input
                    className="input-rounded"
                    type="number"
                    min="1"
                    value={bookForm.total_quantity}
                    onChange={(e) => setBookForm({ ...bookForm, total_quantity: e.target.value })}
                    placeholder="Số lượng"
                  />
                  <input
                    className="input-rounded"
                    type="number"
                    min="0"
                    value={bookForm.available_quantity}
                    onChange={(e) => setBookForm({ ...bookForm, available_quantity: e.target.value })}
                    placeholder="Còn lại"
                  />
                </div>
                <textarea
                  className="input-rounded"
                  placeholder="Mô tả sách"
                  rows={3}
                  value={bookForm.description}
                  onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                />
                <div className="form-row">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {editingBookId ? 'Cập nhật' : 'Lưu Sách'}
                  </button>
                  {editingBookId && (
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => { setEditingBookId(null); setBookForm(EMPTY_BOOK_FORM); setCoverImage(null); }}
                    >
                      Hủy
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="section-block">
              <div className="list-section-header">
                <div>
                  <h4>Danh sách sách ({filteredBooks.length})</h4>
                  <div className="dashboard-note">Lọc và phân trang danh sách sách trong thư viện.</div>
                </div>
              </div>
              <PaginationBar
                total={filteredBooks.length}
                page={currentBookPage}
                pageSize={bookPageSize}
                pageCount={bookPageCount}
                onPageChange={setBookPage}
                onPageSizeChange={(size) => { setBookPageSize(size); setBookPage(1); }}
              />
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>ID</th>
                    <th>Tiêu đề</th>
                    <th>Tác giả</th>
                    <th>Tồn kho</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedBooks.length > 0 ? pagedBooks.map((b, i) => (
                    <tr key={b.id}>
                      <td>{(currentBookPage - 1) * bookPageSize + i + 1}</td>
                      <td>{b.id}</td>
                      <td>{b.title}</td>
                      <td>{b.author}</td>
                      <td>{b.available_quantity}/{b.total_quantity}</td>
                      <td className="table-actions">
                        <button type="button" onClick={() => handleEditBook(b)}>Sửa</button>
                        <button type="button" onClick={() => handleDeleteBook(b.id)}>Xóa</button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="empty-row">Không tìm thấy sách phù hợp.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'LIBRARY' && (
        <div className="split-grid">
          <div className="panel">
            <h3>{editingZoneId ? `Sửa Khu vực #${editingZoneId}` : 'Thêm Khu vực'}</h3>
            <form onSubmit={handleAddZone} className="form-grid">
              <input
                className="input-rounded"
                required
                placeholder="Tên khu vực"
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
              />
              <textarea
                className="input-rounded"
                placeholder="Mô tả"
                value={zoneForm.description}
                onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                rows={4}
              />
              <label className="action-pill" style={{ padding: '12px 16px', margin: 0 }}>
                <input type="checkbox" checked={zoneForm.is_active} onChange={(e) => setZoneForm({ ...zoneForm, is_active: e.target.checked })} />
                Hoạt động
              </label>
              <div className="form-row">
                <button type="submit" disabled={saving} className="btn-primary">
                  {editingZoneId ? 'Cập nhật khu vực' : 'Tạo khu vực'}
                </button>
                {editingZoneId && (
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => { setEditingZoneId(null); setZoneForm({ name:'', description:'', is_active:true }); }}
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>

            <div className="section-block">
              <h4>Chọn khu vực để quản lý</h4>
              <select
                className="select-rounded"
                value={selectedZoneId}
                onChange={(e) => handleZoneSelect(e.target.value)}
              >
                <option value="">Chọn khu vực</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
            </div>

            {selectedZoneId && (
              <div className="section-block">
                <h4>Tải sơ đồ khu vực</h4>
                <form onSubmit={handleZoneLayoutUpload} className="form-row">
                  <input type="file" accept="image/*" onChange={(e) => setZoneLayoutImage(e.target.files?.[0] || null)} />
                  <button type="submit" disabled={saving} className="btn-primary">Tải lên</button>
                </form>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="admin-header" style={{ alignItems: 'flex-start' }}>
              <div>
                <h3>Quản lý ghế</h3>
                <p className="dashboard-note">Bạn có thể chỉnh sửa ghế, vị trí và sơ đồ khu vực ngay trong bảng điều khiển.</p>
              </div>
              <button type="button" className="button-secondary" onClick={loadData}>Tải lại dữ liệu</button>
            </div>

            <div className="split-grid" style={{ gap: 18 }}>
              <div className="panel" style={{ padding: 18 }}>
                <div className="section-header" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h4>Danh sách ghế ({filteredSeats.length})</h4>
                    <div className="dashboard-note">Lọc nhanh theo ghế, khu vực và trạng thái.</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <ExportButtons onExportExcel={handleExportSeatsExcel} onExportPDF={handleExportSeatsPDF} disabled={filteredSeats.length === 0} />
                  </div>
                </div>

                <div className="filter-row" style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <input
                    className="input-rounded"
                    placeholder="Tìm theo ghế hoặc ID..."
                    value={seatFilterText}
                    onChange={(e) => { setSeatPage(1); setSeatFilterText(e.target.value); }}
                    style={{ flex: 1, minWidth: '220px' }}
                  />
                  <select
                    className="select-rounded"
                    value={seatFilterZone}
                    onChange={(e) => { setSeatPage(1); setSeatFilterZone(e.target.value); }}
                    style={{ minWidth: '180px' }}
                  >
                    <option value="all">Tất cả khu vực</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>{zone.name}</option>
                    ))}
                  </select>
                  <select
                    className="select-rounded"
                    value={seatFilterStatus}
                    onChange={(e) => { setSeatPage(1); setSeatFilterStatus(e.target.value); }}
                    style={{ minWidth: '180px' }}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="available">Sẵn sàng</option>
                    <option value="maintenance">Bảo trì</option>
                  </select>
                </div>

                <PaginationBar
                  total={filteredSeats.length}
                  page={currentSeatPage}
                  pageSize={seatPageSize}
                  pageCount={seatPageCount}
                  onPageChange={setSeatPage}
                  onPageSizeChange={(size) => { setSeatPageSize(size); setSeatPage(1); }}
                />
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>ID</th>
                      <th>Ghế</th>
                      <th>Khu</th>
                      <th>Vị trí</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedSeats.length > 0 ? pagedSeats.map((seat, i) => {
                      const zoneName = zones.find((zone) => String(zone.id) === String(seat.zone))?.name || seat.zone;
                      return (
                        <tr key={seat.id}>
                          <td>{(currentSeatPage - 1) * seatPageSize + i + 1}</td>
                          <td>{seat.id}</td>
                          <td>{seat.seat_number}</td>
                          <td>{zoneName}</td>
                          <td>{seat.x_position != null && seat.y_position != null ? `${seat.x_position}% / ${seat.y_position}%` : '-'}</td>
                          <td>{seat.is_maintainance ? 'Bảo trì' : 'Sẵn sàng'}</td>
                          <td className="table-actions">
                            <button type="button" onClick={() => handleSeatSelect(seat)}>Sửa</button>
                            <button type="button" onClick={() => handleDeleteSeat(seat.id)}>Xóa</button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={6} className="empty-row">Không tìm thấy ghế phù hợp.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="panel" style={{ padding: 18 }}>
                <h4>{activeSeatId ? `Sửa ghế #${activeSeatId}` : 'Tạo / Chỉnh sửa ghế'}</h4>
                <form onSubmit={handleSeatFormSubmit} className="form-grid">
                  <select
                    className="select-rounded"
                    value={selectedZoneId}
                    onChange={(e) => handleZoneSelect(e.target.value)}
                    required
                  >
                    <option value="">Chọn khu vực</option>
                    {zones.map((zone) => (
                      <option key={zone.id} value={zone.id}>{zone.name}</option>
                    ))}
                  </select>
                  <input
                    className="input-rounded"
                    required
                    placeholder="Mã ghế"
                    value={seatForm.seat_number}
                    onChange={(e) => setSeatForm({ ...seatForm, seat_number: e.target.value })}
                  />
                  <label className="action-pill" style={{ padding: '12px 16px' }}>
                    <input type="checkbox" checked={seatForm.is_maintainance} onChange={(e) => setSeatForm({ ...seatForm, is_maintainance: e.target.checked })} />
                    Bảo trì
                  </label>
                  <div className="form-row">
                    <input
                      className="input-rounded"
                      placeholder="X tự động (kéo ghế)"
                      value={seatForm.x_position}
                      disabled
                    />
                    <input
                      className="input-rounded"
                      placeholder="Y tự động (kéo ghế)"
                      value={seatForm.y_position}
                      disabled
                    />
                  </div>
                  <div className="form-row">
                    <button type="submit" disabled={saving} className="btn-primary">
                      {activeSeatId ? 'Cập nhật ghế' : 'Tạo ghế'}
                    </button>
                    {activeSeatId && (
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => { setActiveSeatId(null); setSeatForm({ seat_number:'', is_maintainance:false, x_position:'', y_position:'' }); }}
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                </form>
                <p className="dashboard-note">Nếu khu vực có sơ đồ, nhập giá trị X/Y theo phần trăm để ghế nằm đúng vị trí.</p>
              </div>
            </div>

            {selectedZoneId && (
              <div className="section-block panel" style={{ padding: 20 }}>
                <h4>Sơ đồ khu vực đã chọn</h4>
                <p className="dashboard-note">Hệ thống sẽ tự động hiện sơ đồ ghế cho khu vực. Bạn có thể kéo thả ghế ngay cả khi chưa upload ảnh nền.</p>
                <div
                  className="panel"
                  style={{
                    padding: 0,
                    borderRadius: 18,
                    overflow: 'hidden',
                    position: 'relative',
                    minHeight: 420,
                    background: '#f8fafc',
                    border: '1px solid #e5e7eb',
                    cursor: 'crosshair',
                  }}
                  ref={layoutContainerRef}
                  onClick={handleLayoutClick}
                >
                  {zones.find((zone) => String(zone.id) === String(selectedZoneId))?.layout_image && (
                    <img
                      src={getMediaUrl(zones.find((zone) => String(zone.id) === String(selectedZoneId))?.layout_image)}
                      alt="Sơ đồ khu vực"
                      style={{ width: '100%', display: 'block', pointerEvents: 'none', userSelect: 'none' }}
                    />
                  )}
                  {zoneSeats.map((seat, index) => {
                    const status = getAdminSeatStatus(seat);
                    const dragPos = draggingSeatId === seat.id ? dragPosition : null;
                    const fallback = getSeatDisplayPosition(seat, index, zoneSeats.length);
                    const displayX = dragPos ? dragPos.x : (seat.x_position != null && seat.y_position != null ? seat.x_position : fallback.x);
                    const displayY = dragPos ? dragPos.y : (seat.x_position != null && seat.y_position != null ? seat.y_position : fallback.y);
                    return (
                      <button
                        key={seat.id}
                        type="button"
                        className={`seat-marker ${status} ${draggingSeatId === seat.id ? 'dragging' : ''}`}
                        style={{
                          position: 'absolute',
                          left: `${displayX}%`,
                          top: `${displayY}%`,
                          transform: 'translate(-50%, -50%)',
                          cursor: 'grab',
                        }}
                        onPointerDown={(e) => handleMarkerPointerDown(seat, e)}
                        onClick={(e) => { e.stopPropagation(); handleSeatSelect(seat); }}
                        title={`Ghế ${seat.seat_number} - ${status === 'maintenance' ? 'Bảo trì' : status === 'occupied' ? 'Đang dùng' : status === 'reserved' ? 'Đã đặt' : 'Khả dụng'}`}
                      >
                        <span className="seat-icon">
                          <Icon name={statusIconMap[status]} size={18} />
                        </span>
                        <span className="seat-label">{seat.seat_number}</span>
                      </button>
                    );
                  })}
                  <div className="seat-legend" style={{ position:'absolute', bottom: 14, left: 14, zIndex: 5, background:'rgba(255,255,255,0.92)', padding:'10px 14px', borderRadius: 16, boxShadow:'0 8px 22px rgba(0,0,0,0.1)' }}>
                    <div><span className="legend-badge available"></span> Trống</div>
                    <div><span className="legend-badge reserved"></span> Đang chọn</div>
                    <div><span className="legend-badge occupied"></span> Đang sử dụng</div>
                    <div><span className="legend-badge maintenance"></span> Bảo trì</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'LOANS' && (
        <div className="panel">
          <div className="admin-header" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h3>Danh sách Phiếu mượn ({filteredLoans.length})</h3>
              <p className="dashboard-note">
                Luồng xử lý: <strong>Chờ duyệt</strong> → Duyệt/Từ chối → <strong>Đang mượn</strong> → Người mượn trả sách → <strong>Chờ xác nhận</strong> → Thủ thư chỉnh tiền phạt và Lưu phiếu.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <ExportButtons onExportExcel={handleExportLoansExcel} onExportPDF={handleExportLoansPDF} disabled={filteredLoans.length === 0} />
            </div>
          </div>

          <div className="filter-row" style={{ marginBottom: '18px', gap: '12px', alignItems: 'center', display: 'flex', flexWrap: 'wrap' }}>
            <input
              className="input-rounded"
              type="text"
              placeholder="Tìm theo tên người mượn hoặc mã phiếu..."
              value={loanFilterText}
              onChange={(e) => { setLoanPage(1); setLoanFilterText(e.target.value); }}
              style={{ flex: 1, minWidth: '220px' }}
            />
            <select
              className="select-rounded"
              value={loanFilterStatus}
              onChange={(e) => { setLoanPage(1); setLoanFilterStatus(e.target.value); }}
              style={{ width: '200px' }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Đang chờ duyệt</option>
              <option value="borrowed">Đang mượn</option>
              <option value="overdue">Quá hạn</option>
              <option value="return_pending">Chờ xác nhận trả</option>
              <option value="returned">Đã trả</option>
              <option value="cancelled">Đã hủy</option>
              <option value="rejected">Đã từ chối</option>
            </select>
          </div>

          <PaginationBar
            total={filteredLoans.length}
            page={currentLoanPage}
            pageSize={loanPageSize}
            pageCount={loanPageCount}
            onPageChange={setLoanPage}
            onPageSizeChange={(size) => { setLoanPageSize(size); setLoanPage(1); }}
          />

          <table className="dashboard-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã phiếu</th>
                <th>Người mượn</th>
                <th>Sách</th>
                <th>Ngày mượn</th>
                <th>Hạn trả</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pagedLoans.length > 0 ? pagedLoans.map((loan, i) => (
                <tr key={loan.id}>
                  <td>{(currentLoanPage - 1) * loanPageSize + i + 1}</td>
                  <td>#{loan.id}</td>
                  <td>{loan.full_name || loan.user}</td>
                  <td>
                    <button type="button" className="button-secondary" onClick={() => openLoanDetailModal(loan)}>
                      Xem
                    </button>
                  </td>
                  <td>{loan.borrow_date || '-'}</td>
                  <td>{loan.due_date || '-'}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      background: loan.status === 'pending' ? '#fef5e7'
                        : loan.status === 'return_pending' ? '#f5eef8'
                        : loan.status === 'returned' ? '#eafaf1'
                        : loan.status === 'overdue' ? '#fdedec'
                        : '#ebf5fb',
                      color: loan.status === 'pending' ? '#e67e22'
                        : loan.status === 'return_pending' ? '#8e44ad'
                        : loan.status === 'returned' ? '#27ae60'
                        : loan.status === 'overdue' ? '#c0392b'
                        : '#2980b9',
                    }}>
                      {loan.status_display || loanStatusLabelMap[loan.status] || loan.status}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {loan.status === 'pending' && (
                      <>
                        <button type="button" className="btn-primary" onClick={() => handleLoanApprove(loan.id)}>Duyệt</button>
                        <button type="button" className="button-secondary" onClick={() => handleLoanReject(loan.id)}>Từ chối</button>
                      </>
                    )}
                    {loan.status === 'return_pending' && (
                      <button type="button" className="btn-primary" onClick={() => openLoanDetailModal(loan)}>
                        Xác nhận trả
                      </button>
                    )}
                    <button type="button" className="button-secondary" onClick={() => openLoanDetailModal(loan)}>
                      Chi tiết
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>Không tìm thấy phiếu mượn phù hợp với bộ lọc.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'RESERVATIONS' && (
        <div className="panel">
          <div className="list-section-header">
            <div>
              <h3>Đặt chỗ ({filteredReservations.length})</h3>
              <p className="dashboard-note">Quản lý và xuất báo cáo đặt chỗ ngồi trong thư viện.</p>
            </div>
            <ExportButtons
              onExportExcel={handleExportReservationsExcel}
              onExportPDF={handleExportReservationsPDF}
              disabled={filteredReservations.length === 0}
            />
          </div>
          <div className="form-row" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            <input
              className="input-rounded"
              placeholder="Tìm theo tên người dùng, ghế, khu vực..."
              value={reservationFilterText}
              onChange={(e) => { setReservationPage(1); setReservationFilterText(e.target.value); }}
            />
            <select
              className="select-rounded"
              value={reservationFilterStatus}
              onChange={(e) => { setReservationPage(1); setReservationFilterStatus(e.target.value); }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Đang chờ</option>
              <option value="approved">Đã duyệt</option>
              <option value="checked_in">Đang ngồi</option>
              <option value="completed">Hoàn tất</option>
              <option value="cancelled">Hủy</option>
              <option value="rejected">Từ chối</option>
              <option value="booked">Đã đặt</option>
            </select>
          </div>
          <PaginationBar
            total={filteredReservations.length}
            page={currentReservationPage}
            pageSize={reservationPageSize}
            pageCount={reservationPageCount}
            onPageChange={setReservationPage}
            onPageSizeChange={(size) => { setReservationPageSize(size); setReservationPage(1); }}
          />
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>ID</th>
                <th>Người dùng</th>
                <th>Ghế</th>
                <th>Khu vực</th>
                <th>Ngày</th>
                <th>Giờ</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pagedReservations.length > 0 ? pagedReservations.map((reservation, i) => (
                <tr key={reservation.id}>
                  <td>{(currentReservationPage - 1) * reservationPageSize + i + 1}</td>
                  <td>{reservation.id}</td>
                  <td>{reservation.user?.full_name || reservation.user?.username || '-'}</td>
                  <td>{reservation.seat?.seat_number || '-'}</td>
                  <td>{reservation.seat?.zone?.name || '-'}</td>
                  <td>{reservation.date}</td>
                  <td>{reservation.start_time} - {reservation.end_time}</td>
                  <td>{reservationStatusLabelMap[reservation.status] || reservation.status}</td>
                  <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {reservation.status === 'pending' && (
                      <>
                        <button type="button" className="btn-primary" onClick={() => handleReservationApprove(reservation.id)}>Duyệt</button>
                        <button type="button" className="button-secondary" onClick={() => handleReservationReject(reservation.id)}>Từ chối</button>
                      </>
                    )}
                    {reservation.status === 'approved' && (
                      <span className="badge badge-muted">Chờ đến giờ</span>
                    )}
                    {reservation.status === 'checked_in' && (
                      <span className="badge badge-success">Đang ngồi</span>
                    )}
                    {['completed','cancelled','rejected','booked'].includes(reservation.status) && (
                      <span className="badge badge-muted">{reservation.status}</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={9} className="empty-row">Không tìm thấy đặt chỗ phù hợp.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'USERS' && (
        <div className="panel">
          <div className="list-section-header">
            <div>
              <h3>Người dùng ({filteredUsers.length})</h3>
              <p className="dashboard-note">Danh sách tài khoản trong hệ thống thư viện.</p>
            </div>
            <ExportButtons
              onExportExcel={handleExportUsersExcel}
              onExportPDF={handleExportUsersPDF}
              disabled={filteredUsers.length === 0}
            />
          </div>
          <div className="filter-row" style={{ marginBottom: 16 }}>
            <input
              className="input-rounded"
              placeholder="Tìm theo tên, email, vai trò hoặc mã..."
              value={userFilterText}
              onChange={(e) => { setUserPage(1); setUserFilterText(e.target.value); }}
            />
          </div>
          <PaginationBar
            total={filteredUsers.length}
            page={currentUserPage}
            pageSize={userPageSize}
            pageCount={userPageCount}
            onPageChange={setUserPage}
            onPageSizeChange={(size) => { setUserPageSize(size); setUserPage(1); }}
          />
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>ID</th>
                <th>Tên đăng nhập</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Vai trò</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.length > 0 ? pagedUsers.map((u, i) => (
                <tr key={u.id}>
                  <td>{(currentUserPage - 1) * userPageSize + i + 1}</td>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>{u.full_name}</td>
                  <td>{u.email || '-'}</td>
                  <td><span className="role-badge">{roleLabelMap[u.role] || u.role}</span></td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="empty-row">Không tìm thấy người dùng phù hợp.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedLoan && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 720 }}>
            <header>
              <h3>Chi tiết phiếu mượn #{selectedLoan.id}</h3>
              <button type="button" className="modal-close" onClick={closeLoanDetailModal}>Đóng</button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
              <div><strong>Người mượn:</strong> {selectedLoan.full_name || selectedLoan.user}</div>
              <div><strong>Trạng thái:</strong> {selectedLoan.status_display || loanStatusLabelMap[selectedLoan.status] || selectedLoan.status}</div>
              <div><strong>Ngày mượn:</strong> {selectedLoan.borrow_date || '-'}</div>
              <div><strong>Hạn trả:</strong> {selectedLoan.due_date || '-'}</div>
              {selectedLoan.return_date && (
                <div><strong>Ngày trả:</strong> {selectedLoan.return_date}</div>
              )}
            </div>

            {selectedLoan.status === 'pending' && (
              <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#fef5e7', borderRadius: '8px', color: '#e67e22' }}>
                Phiếu đang chờ duyệt. Bấm <strong>Duyệt</strong> hoặc <strong>Từ chối</strong> ở danh sách.
              </div>
            )}
            {selectedLoan.status === 'return_pending' && (
              <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#f5eef8', borderRadius: '8px', color: '#8e44ad' }}>
                Người mượn đã trả sách. Vui lòng kiểm tra và điều chỉnh tiền phạt (gợi ý theo số ngày quá hạn), sau đó bấm <strong>Lưu phiếu</strong> để hoàn tất.
              </div>
            )}
            {['borrowed', 'overdue'].includes(selectedLoan.status) && (
              <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#ebf5fb', borderRadius: '8px', color: '#2980b9' }}>
                Phiếu đang mượn. Người mượn sẽ tự thao tác trả sách trên trang cá nhân.
              </div>
            )}

            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Sách</th>
                  <th>SL mượn</th>
                  <th>SL đã trả</th>
                  <th>Tiền phạt (VNĐ)</th>
                </tr>
              </thead>
              <tbody>
                {(selectedLoan.loan_details || []).map((d, idx) => (
                  <tr key={d.id}>
                    <td>{idx + 1}</td>
                    <td>{d.book?.title || ''}</td>
                    <td>{d.quantity}</td>
                    <td>{d.returned_quantity ?? 0}</td>
                    <td>
                      {selectedLoan.status === 'return_pending' || selectedLoan.status === 'returned' ? (
                        <input
                          className="input-rounded"
                          type="number"
                          min="0"
                          value={loanDetailFineMap[d.id] ?? d.fine_amounts ?? 0}
                          onChange={(e) => setLoanDetailFineMap({ ...loanDetailFineMap, [d.id]: e.target.value })}
                        />
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              {selectedLoan.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn-primary" onClick={() => { handleLoanApprove(selectedLoan.id); closeLoanDetailModal(); }}>Duyệt phiếu</button>
                  <button type="button" className="button-secondary" onClick={() => { handleLoanReject(selectedLoan.id); closeLoanDetailModal(); }}>Từ chối</button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                {selectedLoan.status === 'return_pending' && (
                  <button type="button" className="btn-primary" onClick={handleSaveLoanDetails} disabled={loanDetailSaving}>
                    {loanDetailSaving ? 'Đang lưu...' : 'Lưu phiếu'}
                  </button>
                )}
                {selectedLoan.status === 'returned' && (
                  <button type="button" className="btn-primary" onClick={handleSaveLoanDetails} disabled={loanDetailSaving}>
                    {loanDetailSaving ? 'Đang lưu...' : 'Cập nhật tiền phạt'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
