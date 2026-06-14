import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getAuthHeaders } from './auth';
import PaginationBar from './components/PaginationBar';
import { paginate } from './utils/pagination';
import './SeatBooking.css';

function SeatBooking() {
  const [zones, setZones] = useState([]);
  const [seats, setSeats] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedSeat, setSelectedSeat] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [reservationFilterText, setReservationFilterText] = useState('');
  const [reservationStatusFilter, setReservationStatusFilter] = useState('all');
  const [reservationPage, setReservationPage] = useState(1);
  const [reservationPageSize, setReservationPageSize] = useState(8);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const config = await getAuthHeaders();
        const [zoneRes, seatRes, reservationRes] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/library/zones/', config),
          axios.get('http://127.0.0.1:8000/api/library/seats/', config),
          axios.get('http://127.0.0.1:8000/api/library/reservations/', config),
        ]);

        setZones(zoneRes.data || []);
        setSeats(seatRes.data || []);
        setReservations(reservationRes.data || []);
      } catch (error) {
        console.error(error);
        setMessage({ type: 'error', text: 'Đã xảy ra lỗi khi tải dữ liệu.' });
      }
    };

    fetchData();
  }, []);

  const selectedZoneObj = zones.find((zone) => String(zone.id) === String(selectedZone));
  const availableSeats = seats.filter((seat) => String(seat.zone) === String(selectedZone));
  const selectedSeatObj = seats.find((seat) => String(seat.id) === String(selectedSeat));

  const sortedReservations = [...reservations].sort((a, b) => {
    const aKey = `${a.date || ''} ${a.start_time || ''}`;
    const bKey = `${b.date || ''} ${b.start_time || ''}`;
    return bKey.localeCompare(aKey);
  });

  const filteredReservations = sortedReservations.filter((reservation) => {
    const text = reservationFilterText.trim().toLowerCase();
    const matchesText = !text || `${reservation.user?.full_name || reservation.user?.username || reservation.user || ''}`.toLowerCase().includes(text)
      || String(reservation.id).includes(text)
      || String(reservation.seat?.seat_number || reservation.seat || '').toLowerCase().includes(text);
    const matchesStatus = reservationStatusFilter === 'all' || String(reservation.status) === reservationStatusFilter;
    return matchesText && matchesStatus;
  });

  const reservationsPageData = paginate(filteredReservations, reservationPage, reservationPageSize);
  const pagedReservations = reservationsPageData.items;

  const reservationStatusLabelMap = {
    pending: 'Đang chờ',
    approved: 'Đã duyệt',
    checked_in: 'Đang ngồi',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy',
    rejected: 'Đã từ chối',
    booked: 'Đã đặt',
  };

  const getSeatStatus = (seat) => {
    if (seat.is_maintainance) return 'maintenance';
    if (!date || !startTime || !endTime) return 'available';

    const conflict = reservations.some((reservation) => {
      if (String(reservation.seat?.id || reservation.seat) !== String(seat.id)) return false;
      if (!['pending', 'approved', 'checked_in', 'booked'].includes(reservation.status)) return false;
      const rStart = reservation.start_time.substring(0, 5);
      const rEnd = reservation.end_time.substring(0, 5);
      const fStart = startTime.substring(0, 5);
      const fEnd = endTime.substring(0, 5);
      return (
        reservation.date === date &&
        rStart < fEnd &&
        rEnd > fStart
      );
    });

    return conflict ? 'occupied' : 'available';
  };

  const zoneLayoutSeats = availableSeats.filter(
    (seat) => seat.x_position != null && seat.y_position != null && selectedZoneObj?.layout_image,
  );

  const handleZoneChange = (e) => {
    setSelectedZone(e.target.value);
    setSelectedSeat('');
  };

  const handleSeatClick = (seat) => {
    if (getSeatStatus(seat) !== 'available') return;
    setSelectedSeat(String(seat.id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedZone || !selectedSeat || !date || !startTime || !endTime) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin trước khi đặt chỗ.' });
      return;
    }

    setLoading(true);

    try {
      const config = await getAuthHeaders();
      await axios.post(
        'http://127.0.0.1:8000/api/library/reservations/',
        {
          zone: selectedZone,
          seat: selectedSeat,
          date,
          start_time: startTime,
          end_time: endTime,
        },
        config,
      );
      setMessage({ type: 'success', text: 'Đặt chỗ thành công!' });
      setSelectedZone('');
      setSelectedSeat('');
      setDate('');
      setStartTime('');
      setEndTime('');
      const reservationRes = await axios.get('http://127.0.0.1:8000/api/library/reservations/', config);
      setReservations(reservationRes.data || []);
    } catch (error) {
      console.error(error);
      const detail = error?.response?.data?.error || error?.response?.data || 'Đặt chỗ thất bại. Vui lòng thử lại.';
      setMessage({ type: 'error', text: String(detail) });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đặt chỗ này không?')) return;
    try {
      const config = await getAuthHeaders();
      await axios.patch(`http://127.0.0.1:8000/api/library/reservations/${id}/cancel/`, {}, config);
      setMessage({ type: 'success', text: 'Hủy đặt chỗ thành công!' });
      const reservationRes = await axios.get('http://127.0.0.1:8000/api/library/reservations/', config);
      setReservations(reservationRes.data || []);
    } catch (error) {
      console.error(error);
      const detail = error?.response?.data?.error || error?.response?.data || 'Hủy đặt chỗ thất bại.';
      setMessage({ type: 'error', text: String(detail) });
    }
  };

  const renderSeatInstructions = () => {
    if (!selectedZone) return 'Chọn khu vực để xem sơ đồ và ghế.';
    if (!selectedZoneObj) return 'Khu vực chưa tồn tại.';
    if (!selectedZoneObj.layout_image) return 'Khu vực hiện chưa có sơ đồ. Chọn ghế qua danh sách.';
    if (zoneLayoutSeats.length === 0) return 'Sơ đồ khu vực đã có nhưng chưa có ghế được định vị. Chọn ghế qua danh sách.';
    return 'Nhấp vào ghế trên sơ đồ để chọn. Màu đỏ là đã đặt/bảo trì, xanh là khả dụng.';
  };

  return (
    <div className="seat-booking-container">
      <h1 className="page-title">Đặt chỗ ngồi</h1>
      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

      <form onSubmit={handleSubmit} className="seat-booking-form">
        <div className="form-group">
          <label>Chọn khu vực</label>
          <select value={selectedZone} onChange={handleZoneChange} required>
            <option value="">Chọn khu vực</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>{zone.name}</option>
            ))}
          </select>
        </div>

        {selectedZoneObj && (
          <div className="seat-summary-card">
            <h3>{selectedZoneObj.name}</h3>
            {selectedZoneObj.description && <p>{selectedZoneObj.description}</p>}
            <div className="seat-summary-row">
              <span>Ghế trong khu vực: <strong>{availableSeats.length}</strong></span>
              <span>Ghế được định vị: <strong>{zoneLayoutSeats.length}</strong></span>
              {selectedSeatObj && (
                <span>Ghế chọn: <strong>{selectedSeatObj.seat_number}</strong> ({selectedSeatObj.is_maintainance ? 'Bảo trì' : getSeatStatus(selectedSeatObj) === 'available' ? 'Khả dụng' : 'Đã đặt'})</span>
              )}
            </div>
          </div>
        )}

        <div className="layout-panel">
          <div className="column">
            <h3>Sơ đồ khu vực</h3>
            <p className="layout-hint">{renderSeatInstructions()}</p>
            {selectedZoneObj?.layout_image ? (
              <div className="layout-image-frame">
                <img src={selectedZoneObj.layout_image} alt={selectedZoneObj.name} />
                {zoneLayoutSeats.map((seat) => {
                  const status = getSeatStatus(seat);
                  return (
                    <button
                      key={seat.id}
                      type="button"
                      className={`seat-marker ${status} ${String(seat.id) === String(selectedSeat) ? 'selected' : ''}`}
                      style={{ left: `${seat.x_position}%`, top: `${seat.y_position}%` }}
                      onClick={() => handleSeatClick(seat)}
                      disabled={status !== 'available'}
                      title={`${seat.seat_number} - ${status === 'available' ? 'Khả dụng' : status === 'maintenance' ? 'Bảo trì' : 'Đã đặt'}`}
                    >
                      {seat.seat_number}
                    </button>
                  );
                })}
                <div className="seat-legend">
                  <div><span className="legend-badge available"></span> Khả dụng</div>
                  <div><span className="legend-badge occupied"></span> Đã đặt</div>
                  <div><span className="legend-badge maintenance"></span> Bảo trì</div>
                </div>
              </div>
            ) : (
              <div className="search-warning">Chưa có sơ đồ khu vực. Chọn ghế qua danh sách bên cạnh.</div>
            )}
          </div>

          <div className="column">
            <h3>Thông tin đặt chỗ</h3>
            <div className="form-group">
              <label>Chọn ghế</label>
              <select value={selectedSeat} onChange={(e) => setSelectedSeat(e.target.value)} required>
                <option value="">Chọn ghế</option>
                {availableSeats.map((seat) => {
                  const status = getSeatStatus(seat);
                  return (
                    <option key={seat.id} value={seat.id} disabled={status !== 'available'}>
                      {seat.seat_number} {status !== 'available' ? `(${status === 'maintenance' ? 'bảo trì' : 'đã đặt'})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-group">
              <label>Ngày</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Giờ bắt đầu</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Giờ kết thúc</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>

            <button type="submit" disabled={loading} className="search-btn">
              {loading ? 'Đang gửi...' : 'Đặt chỗ'}
            </button>
          </div>
        </div>
      </form>

      <div className="reservation-list">
        <h2>Danh sách đặt chỗ</h2>
        <div className="filter-row" style={{ marginBottom: '18px', gap: '12px', alignItems: 'center', display: 'flex', flexWrap: 'wrap' }}>
          <input
            className="input-rounded"
            type="text"
            placeholder="Tìm theo tên, mã đặt chỗ hoặc ghế..."
            value={reservationFilterText}
            onChange={(e) => { setReservationPage(1); setReservationFilterText(e.target.value); }}
            style={{ flex: 1, minWidth: '220px' }}
          />
          <select
            className="select-rounded"
            value={reservationStatusFilter}
            onChange={(e) => { setReservationPage(1); setReservationStatusFilter(e.target.value); }}
            style={{ width: '200px' }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Đang chờ</option>
            <option value="approved">Đã duyệt</option>
            <option value="checked_in">Check-in</option>
            <option value="booked">Đã đặt</option>
            <option value="cancelled">Hủy</option>
          </select>
        </div>
        <PaginationBar
          total={filteredReservations.length}
          page={reservationsPageData.currentPage}
          pageSize={reservationPageSize}
          pageCount={reservationsPageData.pageCount}
          onPageChange={setReservationPage}
          onPageSizeChange={(size) => { setReservationPageSize(size); setReservationPage(1); }}
          pageSizeOptions={[5, 8, 12, 20]}
        />
        <div className="table-responsive">
          <table className="booking-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã</th>
                <th>Ghế</th>
                <th>Khu vực</th>
                <th>Ngày</th>
                <th>Giờ bắt đầu</th>
                <th>Giờ kết thúc</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pagedReservations.length > 0 ? pagedReservations.map((reservation, i) => {
                const seat = seats.find((s) => String(s.id) === String(reservation.seat?.id || reservation.seat));
                const zone = zones.find((z) => String(z.id) === String(reservation.zone || seat?.zone || reservation.seat?.zone?.id));
                return (
                  <tr key={reservation.id}>
                    <td>{(reservationsPageData.currentPage - 1) * reservationPageSize + i + 1}</td>
                    <td>{reservation.id}</td>
                    <td>{seat?.seat_number || reservation.seat?.seat_number || reservation.seat}</td>
                    <td>{zone?.name || reservation.seat?.zone?.name || ''}</td>
                    <td>{reservation.date}</td>
                    <td>{reservation.start_time}</td>
                    <td>{reservation.end_time}</td>
                    <td>{reservationStatusLabelMap[reservation.status] || reservation.status}</td>
                    <td>
                      {['pending', 'approved'].includes(reservation.status) ? (
                        <button
                          type="button"
                          className="btn-cancel"
                          onClick={() => handleCancelReservation(reservation.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ff7675',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Hủy đặt
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} className="empty-row">Không có dữ liệu đặt chỗ phù hợp với bộ lọc.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SeatBooking;
