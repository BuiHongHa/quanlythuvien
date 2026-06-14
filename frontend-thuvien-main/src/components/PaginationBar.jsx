import { getPageRange } from '../utils/pagination';

function PaginationBar({
  total,
  page,
  pageSize,
  pageCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  className = '',
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = getPageRange(page, pageCount);

  return (
    <div className={`pagination-bar ${className}`.trim()}>
      <div className="pagination-info">
        Hiển thị <strong>{start}–{end}</strong> / <strong>{total}</strong> mục
      </div>

      <div className="pagination-controls">
        <label className="pagination-size">
          <span>Số dòng/trang</span>
          <select
            className="select-rounded"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>

        <div className="pagination-nav">
          <button
            type="button"
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(1)}
            title="Trang đầu"
          >
            «
          </button>
          <button
            type="button"
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Trước
          </button>

          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`pagination-btn ${p === page ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            className="pagination-btn"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Sau
          </button>
          <button
            type="button"
            className="pagination-btn"
            disabled={page >= pageCount}
            onClick={() => onPageChange(pageCount)}
            title="Trang cuối"
          >
            »
          </button>
        </div>

        <span className="pagination-page-label">Trang {page}/{pageCount}</span>
      </div>
    </div>
  );
}

export default PaginationBar;
