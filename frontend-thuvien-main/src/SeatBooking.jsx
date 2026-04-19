import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './App.css';

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

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const loadData = async () => {
    try {
      const seatPromise = axios.get(`${API_BASE}/seats/`);
      const authHeaders = getAuthHeaders();
      const reservationPromise = authHeaders
        ? axios.get(`${API_BASE}/reservations/`, { headers: authHeaders })
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
      const authHeaders = getAuthHeaders();
      if (!authHeaders) {
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
      const authHeaders = getAuthHeaders();
      if (!authHeaders) {
        setMessage({ type: 'error', text: 'Bạn cần đăng nhập trước khi thực hiện thao tác này.' });
        return;
      }

      await axios.patch(`${API_BASE}/reservations/${reservationId}/${action}/`, {}, {
        headers: authHeaders,
      });
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
            <table>
              <thead>
                <tr>
                  <th>Ghế</th>
                  <th>Ngày</th>
                  <th>Khung giờ</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {myReservations.map((item) => (
                  <tr key={item.id}>
                    <td>{item.seat}</td>
                    <td>{item.date}</td>
                    <td>{item.start_time} - {item.end_time}</td>
                    <td>{item.status}</td>
                    <td>
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
