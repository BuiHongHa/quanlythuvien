import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const VIETNAMESE_FONT_URL = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
let vietnameseFontLoaded = false;

export function formatVietnameseDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatVietnameseDateTime(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${formatVietnameseDate(d)} ${hours}:${minutes}`;
}

function buildFileName(prefix) {
  const stamp = formatVietnameseDate().replace(/\//g, '-');
  return `${prefix}_${stamp}`;
}

async function loadVietnameseFont(doc) {
  if (vietnameseFontLoaded) return true;
  try {
    const response = await fetch(VIETNAMESE_FONT_URL);
    if (!response.ok) return false;
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
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {{ title: string, sheetName?: string, filePrefix: string, columns: {key:string, label:string}[], rows: object[] }} options
 */
export function exportToExcel({ title, sheetName = 'Danh sach', filePrefix, columns, rows }) {
  const exportRows = rows.map((row, index) => {
    const mapped = { 'STT': index + 1 };
    columns.forEach((col) => {
      mapped[col.label] = row[col.key] ?? '';
    });
    return mapped;
  });

  const ws = XLSX.utils.json_to_sheet(exportRows);
  ws['!cols'] = columns.map(() => ({ wch: 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${buildFileName(filePrefix)}.xlsx`);
}

/**
 * @param {{ title: string, subtitle?: string, filePrefix: string, columns: {key:string, label:string}[], rows: object[] }} options
 */
export async function exportToPDF({ title, subtitle, filePrefix, columns, rows }) {
  const doc = new jsPDF({ orientation: columns.length > 5 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const hasFont = await loadVietnameseFont(doc);
  doc.setFont(hasFont ? 'NotoSans' : 'helvetica');

  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(subtitle || `Ngày xuất: ${formatVietnameseDateTime()}`, 14, 23);
  doc.text(`Tổng số bản ghi: ${rows.length}`, 14, 29);
  doc.setTextColor(0, 0, 0);

  const head = [['STT', ...columns.map((c) => c.label)]];
  const body = rows.map((row, index) => [
    index + 1,
    ...columns.map((col) => String(row[col.key] ?? '')),
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 34,
    styles: {
      font: hasFont ? 'NotoSans' : 'helvetica',
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [176, 30, 35],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${buildFileName(filePrefix)}.pdf`);
}
