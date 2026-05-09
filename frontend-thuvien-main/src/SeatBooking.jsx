import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './App.css';
import { getAuthHeaders } from './auth';

const API_BASE = 'http://127.0.0.1:8000/api/library';

function getUserIdFromToken() {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.user_id ?? payload?.id ?? null;
  } catch {
    return null;
  }
}

function SeatBooking() {
  const [seats, setSeats] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const userId = useMemo(() => getUserIdFromToken(), []);

  const [form, setForm] = useState({
    seat: '',
    date: '',
    start_time: '08:00',
    end_time: '10:00'
  });

  const myReservations = useMemo(() => {
    if (!userId) return [];
    return reservations.filter((item) => Number(item.user) === Number(userId));
  }, [reservations, userId]);

  const loadData = async () => {
    try {
      const seatPromise = axios.get(`${API_BASE}/seats/`);
      const authHeaders = await getAuthHeaders();
      const reservationPromise = authHeaders.headers.Authorization
        ? axios.get(`${API_BASE}/reservations/`, authHeaders)
        : Promise.resolve({ data: [] });
      const [seatRes, reservationRes] = await Promise.all([seatPromise, reservationPromise]);

      setSeats(Array.isArray(seatRes.data) ? seatRes.data : []);
      setReservations(Array.isArray(reservationRes.data) ? reservationRes.data : []);
    } catch {
      setMessage({ type: 'error', text: 'Không thể tải dữ liệu khu vực chỗ ngồi.' });
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!userId) {
      setMessage({ type: 'error', text: 'Bạn cần đăng nhập trước khi đặt chỗ.' });
      return;
    }

    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      if (!authHeaders.headers.Authorization) {
        setMessage({ type: 'error', text: 'Bạn cần đăng nhập trước khi đặt chỗ.' });
        setLoading(false);
        return;
      }

      await axios.post(`${API_BASE}/reservations/`, {
        seat: Number(form.seat),
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time
      }, {
        headers: authHeaders,
      });

      setMessage({ type: 'success', text: 'Đặt chỗ thành công.' });
      setForm((prev) => ({ ...prev, seat: '' }));
      await loadData();
    } catch (error) {
      const detail = error.response?.data?.non_field_errors?.[0]
        || error.response?.data?.detail
        || error.response?.data?.error
        || 'Đặt chỗ thất bại.';
      setMessage({ type: 'error', text: detail });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusAction = async (reservationId, action) => {
    try {
      const authHeaders = await getAuthHeaders();
      if (!authHeaders.headers.Authorization) {
        setMessage({ type: 'error', text: 'Bạn cần đăng nhập trước khi thực hiện thao tác này.' });
        return;
      }

      await axios.patch(`${API_BASE}/reservations/${reservationId}/${action}/`, {}, authHeaders);
      setMessage({ type: 'success', text: action === 'check_in' ? 'Check-in thành công.' : 'Check-out thành công.' });
      await loadData();
    } catch (error) {
      const detail = error.response?.data?.error || 'Cập nhật trạng thái thất bại.';
      setMessage({ type: 'error', text: detail });
    }
  };

  return (
    <div className="container">
      <h2 style={{ textAlign: 'left', borderBottom: '2px solid #b01e23', paddingBottom: '10px' }}>
        🪑 Check-in / Check-out Chỗ Ngồi
      </h2>

      {message.text && (
        <div className={`notice ${message.type === 'success' ? 'notice-success' : 'notice-error'}`}>
          {message.text}
        </div>
      )}

      <div className="panel-grid">
        <div className="panel-card">
          <h3>Đặt chỗ ngồi</h3>
          <form onSubmit={handleCreateReservation} className="stack-form">
            <label>Ghế</label>
            <select
              value={form.seat}
              onChange={(e) => setForm({ ...form, seat: e.target.value })}
              required
            >
              <option value="">-- Chọn ghế --</option>
              {seats.map((seat) => (
                <option key={seat.id} value={seat.id}>
                  Ghế {seat.seat_number} - Khu {seat.zone}
                </option>
              ))}
            </select>

            <label>Ngày</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />

            <label>Giờ bắt đầu</label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              required
            />

            <label>Giờ kết thúc</label>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              required
            />

            <button className="btn-primary" disabled={loading} type="submit">
              {loading ? 'Đang gửi...' : 'Gửi yêu cầu đặt chỗ'}
            </button>
          </form>
        </div>

        <div className="panel-card">
          <h3>Lịch sử đặt chỗ của bạn</h3>
          {myReservations.length === 0 ? (
            <p className="muted">Chưa có yêu cầu đặt chỗ nào.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '15px', fontSize: '14px', lineHeight: 1.5 }}>
              <thead>
                <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #ccc' }}>
                  <th style={{ padding:'12px', minWidth:'120px' }}>Ghế</th>
                  <th style={{ padding:'12px', minWidth:'120px' }}>Ngày đặt</th>
                  <th style={{ padding:'12px', minWidth:'140px' }}>Khung giờ</th>
                  <th style={{ padding:'12px', minWidth:'150px' }}>Trạng thái</th>
                  <th style={{ padding:'12px', minWidth:'120px', textAlign:'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {myReservations.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e6e6e6', background: index % 2 === 0 ? '#ffffff' : '#fbfbfb' }}>
                    <td style={{ padding:'12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.seat || 'N/A'}</td>
                    <td style={{ padding:'12px', whiteSpace: 'nowrap' }}>{item.date || '—'}</td>
                    <td style={{ padding:'12px', whiteSpace: 'nowrap' }}>{item.start_time || '—'} - {item.end_time || '—'}</td>
                    <td style={{ padding:'12px', whiteSpace: 'nowrap' }}>
                      {item.status === 'booked' && <span style={{ color: '#d39e00', fontWeight:'bold' }}>⏳ Chờ check-in</span>}
                      {item.status === 'checked_in' && <span style={{ color: '#28a745', fontWeight:'bold' }}>✅ Đang sử dụng</span>}
                      {item.status === 'completed' && <span style={{ color: '#6c757d', fontWeight:'bold' }}>🔒 Đã check-out</span>}
                      {![ 'booked', 'checked_in', 'completed' ].includes(item.status) && (
                        <span style={{ color: 'red', fontWeight: 'bold' }}>{item.status || 'Không xác định'}</span>
                      )}
                    </td>
                    <td style={{ padding:'12px', textAlign:'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {item.status === 'booked' && (
                          <button className="btn-inline" onClick={() => handleStatusAction(item.id, 'check_in')}>
                            Check-in
                          </button>
                        )}
                        {item.status === 'checked_in' && (
                          <button className="btn-inline" onClick={() => handleStatusAction(item.id, 'check_out')}>
                            Check-out
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default SeatBooking;
