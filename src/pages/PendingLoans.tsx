import React from 'react';
import { useApp } from '../context/AppContext';
import { Clock, CheckCircle2, Eye, MessageSquare } from 'lucide-react';

export const PendingLoans: React.FC = () => {
  const { loans, setSelectedLoan, setCurrentPage, showToast, whatsAppTemplates, masterControlSettings } = useApp();

  const pendingList = loans;

  const handleApprove = (loanNo: string) => {
    showToast(`Loan ${loanNo} acknowledged for collection!`, 'success');
  };

  const handleInspect = (loan: typeof loans[0]) => {
    setSelectedLoan(loan);
    setCurrentPage('loan-receipts');
  };

  const handleSendWhatsApp = (loan: typeof loans[0]) => {
    const rawTemplate = whatsAppTemplates.dueReminderMessage;
    const formattedMsg = rawTemplate
      .replace(/{name}/g, loan.customerName)
      .replace(/{loanId}/g, loan.loanNo)
      .replace(/{principal}/g, loan.principal.toString())
      .replace(/{dueDate}/g, loan.nextDueDate || loan.date)
      .replace(/{amount}/g, loan.monthlyInterest.toString())
      .replace(/{upiId}/g, masterControlSettings.upiId)
      .replace(/{bankName}/g, 'KKV Gold Finance');

    const cleanPhone = loan.customerPhone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(formattedMsg)}`;
    window.open(waUrl, '_blank');
    showToast(`Opened WhatsApp reminder for ${loan.customerName}`, 'info');
  };

  return (
    <div className="page-content">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Clock size={18} color="var(--color-primary-accent)" />
              <span>Pending Loans &amp; Interest Reminders</span>
            </h2>
            <p className="card-description">Borrower pledge accounts due for monthly interest or principal collection</p>
          </div>
          <span className="badge badge-warning">{pendingList.length} Accounts Pending</span>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>LOAN NO</th>
                <th>CUSTOMER</th>
                <th>PHONE</th>
                <th>PRINCIPAL</th>
                <th>MONTHLY INT</th>
                <th>DUE DATE</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {pendingList.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{l.loanNo}</td>
                  <td style={{ fontWeight: 600 }}>{l.customerName}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{l.customerPhone}</td>
                  <td style={{ fontWeight: 600 }}>₹{l.principal.toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--badge-success-text)', fontWeight: 600 }}>
                    ₹{l.monthlyInterest.toLocaleString('en-IN')} ({l.interestRate}%)
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--badge-warning-text)' }}>
                    {l.nextDueDate || l.date}
                  </td>
                  <td>
                    <span className="badge badge-warning">
                      Pending Due
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#25D366', borderColor: '#25D366' }}
                        title="Send WhatsApp Reminder"
                        onClick={() => handleSendWhatsApp(l)}
                      >
                        <MessageSquare size={13} />
                        <span>WhatsApp</span>
                      </button>
                      <button
                        className="icon-button"
                        style={{ width: '28px', height: '28px' }}
                        title="Collect Payment"
                        onClick={() => handleInspect(l)}
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleApprove(l.loanNo)}
                      >
                        <CheckCircle2 size={13} />
                        <span>Ack</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
