import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Receipt } from '../types';
import { SearchInput } from '../components/common/SearchInput';
import { FileSpreadsheet, FileText, Printer, Edit3, Copy } from 'lucide-react';

export const AllReceipts: React.FC = () => {
  const { receipts, setSelectedReceipt, setCurrentPage, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReceipts = receipts.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.receiptNo.toString().includes(term) ||
      r.loanNo.toLowerCase().includes(term) ||
      r.customerName.toLowerCase().includes(term) ||
      r.kind.toLowerCase().includes(term)
    );
  });

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setCurrentPage('receipt-display');
  };

  const handleExportExcel = () => {
    showToast('Exporting receipts to Excel spreadsheet (.XLSX)...', 'info');
  };

  const handleExportPDF = () => {
    showToast('Compiling receipts report PDF document...', 'info');
  };

  const handleCopy = (receipt: Receipt) => {
    navigator.clipboard.writeText(`Receipt #${receipt.receiptNo} | Loan: ${receipt.loanNo} | Customer: ${receipt.customerName} | Amount: ₹${receipt.amount}`);
    showToast(`Copied details for Receipt #${receipt.receiptNo}`, 'success');
  };

  return (
    <div className="page-content">
      <div className="card">
        {/* Card Header matching Screenshot 174044 */}
        <div className="card-header">
          <div>
            <h2 className="card-title">All Receipts</h2>
            <p className="card-description">Loan disbursements and payment receipts only.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} />
              <span>Export Excel</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleExportPDF}>
              <FileText size={14} />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '18px', maxWidth: '420px' }}>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search receipt, loan, or customer..."
          />
        </div>

        {/* Receipts Table */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>RECEIPT #</th>
                <th style={{ width: '130px' }}>KIND</th>
                <th style={{ width: '130px' }}>LOAN TYPE</th>
                <th>CUSTOMER</th>
                <th>LOAN</th>
                <th style={{ textAlign: 'right' }}>AMOUNT</th>
                <th style={{ width: '110px' }}>DATE</th>
                <th style={{ width: '130px', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No receipts found matching your search.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((r, idx) => (
                  <tr key={`all-rcpt-${r.id}-${idx}`}>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                      #{r.receiptNo}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          r.kind === 'NEW LOAN'
                            ? 'badge-info'
                            : r.kind === 'REPAYMENT'
                            ? 'badge-success'
                            : 'badge-gold'
                        }`}
                      >
                        {r.kind}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-gold">{r.loanType}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.customerName}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>{r.loanNo}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                      ₹{r.amount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.date}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '5px' }}>
                        <button
                          className="icon-button"
                          style={{ width: '28px', height: '28px' }}
                          title="View & Print Official Receipt"
                          onClick={() => handleViewReceipt(r)}
                        >
                          <Printer size={13} />
                        </button>
                        <button
                          className="icon-button"
                          style={{ width: '28px', height: '28px' }}
                          title="Edit Receipt"
                          onClick={() => showToast(`Edit receipt #${r.receiptNo}`, 'info')}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          className="icon-button"
                          style={{ width: '28px', height: '28px' }}
                          title="Copy Receipt Summary"
                          onClick={() => handleCopy(r)}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
