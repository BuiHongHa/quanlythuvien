function ExportButtons({ onExportExcel, onExportPDF, disabled = false, excelLabel = 'Xuất Excel', pdfLabel = 'Xuất PDF' }) {
  return (
    <div className="export-buttons">
      <button
        type="button"
        className="export-btn export-btn-excel"
        disabled={disabled}
        onClick={onExportExcel}
        title="Tải file Excel (.xlsx)"
      >
        <span className="export-btn-icon">XLS</span>
        {excelLabel}
      </button>
      <button
        type="button"
        className="export-btn export-btn-pdf"
        disabled={disabled}
        onClick={onExportPDF}
        title="Tải file PDF"
      >
        <span className="export-btn-icon">PDF</span>
        {pdfLabel}
      </button>
    </div>
  );
}

export default ExportButtons;
