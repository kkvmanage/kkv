import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Loan } from '../types';
import { Receipt, FileSpreadsheet, Eye, Edit3, CheckCircle2 } from 'lucide-react';
import { SearchInput } from '../components/common/SearchInput';

export const LoanDisplay: React.FC = () => {
  const { loans, setSelectedLoan, setCurrentPage, showToast } = useApp();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED' | 'OVERDUE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLoans = loans.filter((loan) => {
    const matchesFilter = filter === 'ALL' || loan.status === filter;
    const matchesSearch =
      loan.loanNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.customerPhone.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const handleInspect = (loan: Loan) => {
    setSelectedLoan(loan);
    setCurrentPage('loan-receipts');
  };

  const handleSettle = (loan: Loan) => {
    setSelectedLoan(loan);
    setCurrentPage('loan-receipts');
    showToast(`Opening settlement for ${loan.loanNo}`, 'info');
  };

  return (
    <div className="page-content">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">All Loan Records</h2>
            <p className="card-description">Inspect active pledges, collateral weight, interest, and closure status</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => showToast('Exporting active loan book...', 'info')}
            >
              <FileSpreadsheet size={14} />
              <span>Export Book</span>
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setCurrentPage('loan-issue')}
            >
              <span>+ Issue Loan</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['ALL', 'ACTIVE', 'CLOSED', 'OVERDUE'] as const).map((tab) => (
              <button
                key={tab}
                className={`btn btn-sm ${filter === tab ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ width: '280px' }}>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by loan #, customer..."
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>LOAN NO</th>
                <th>CUSTOMER</th>
                <th>LOAN TYPE</th>
                <th>PRINCIPAL</th>
                <th>INTEREST RATE</th>
                <th>ISSUE DATE</th>
                <th>OUTSTANDING AMOUNT</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'center', width: '130px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No loans found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => (
                  <tr key={loan.id}>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{loan.loanNo}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{loan.customerName}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{loan.customerPhone}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-gold">{loan.loanType}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{loan.principal.toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--badge-success-text)', fontWeight: 600 }}>
                      {loan.interestRate}% / mo
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{loan.date}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                      ₹{loan.outstandingPrincipal.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          loan.status === 'ACTIVE'
                            ? 'badge-success'
                            : loan.status === 'CLOSED'
                            ? 'badge-info'
                            : 'badge-danger'
                        }`}
                      >
                        {loan.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '5px' }}>
                        <button
                          className="icon-button"
                          style={{ width: '28px', height: '28px' }}
                          title="View Details"
                          onClick={() => handleInspect(loan)}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          className="icon-button"
                          style={{ width: '28px', height: '28px' }}
                          title="Edit Loan"
                          onClick={() => showToast(`Edit modal opened for ${loan.loanNo}`, 'info')}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          className="icon-button"
                          style={{ width: '28px', height: '28px' }}
                          title="Collect Repayment / Receipt"
                          onClick={() => handleInspect(loan)}
                        >
                          <Receipt size={13} />
                        </button>
                        <button
                          className="icon-button"
                          style={{ width: '28px', height: '28px', color: 'var(--badge-success-text)' }}
                          title="Close / Settle Pledge"
                          onClick={() => handleSettle(loan)}
                        >
                          <CheckCircle2 size={13} />
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
