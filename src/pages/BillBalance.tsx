import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertCircle, DollarSign, CheckCircle2, Eye, Plus, X } from 'lucide-react';

interface BillBalanceEntry {
  id: string;
  billNo: string;
  loanNo: string;
  customerName: string;
  phone: string;
  date: string;
  balanceAmount: number;
  reason: string;
  status: 'OPEN' | 'CLEARED';
}

const initialBalances: BillBalanceEntry[] = [
  {
    id: 'bb-1',
    billNo: 'BILL-104',
    loanNo: 'GL-01',
    customerName: 'Thayba Begum',
    phone: '+91 98401 23456',
    date: '25-08-2026',
    balanceAmount: 250,
    reason: 'Rounded off change to be settled next visit',
    status: 'OPEN'
  }
];

export const BillBalance: React.FC = () => {
  const { showToast, setCurrentPage } = useApp();
  const [entries, setEntries] = useState<BillBalanceEntry[]>(initialBalances);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLoanNo, setNewLoanNo] = useState('GL-01');
  const [newCustomer, setNewCustomer] = useState('Thayba Begum');
  const [newAmount, setNewAmount] = useState<number>(100);
  const [newReason, setNewReason] = useState('Short balance on interest payment');

  const openEntries = entries.filter((e) => e.status === 'OPEN');
  const totalOwed = openEntries.reduce((sum, e) => sum + e.balanceAmount, 0);

  const handleClearBalance = (id: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'CLEARED' } : e))
    );
    showToast('Bill balance settled and cleared!', 'success');
  };

  const handleAddBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: BillBalanceEntry = {
      id: `bb-${Date.now()}`,
      billNo: `BILL-${Math.floor(100 + Math.random() * 900)}`,
      loanNo: newLoanNo,
      customerName: newCustomer,
      phone: '+91 98400 00000',
      date: new Date().toLocaleDateString('en-GB'),
      balanceAmount: newAmount,
      reason: newReason,
      status: 'OPEN'
    };
    setEntries((prev) => [newEntry, ...prev]);
    setShowAddModal(false);
    showToast('Bill balance entry tracked successfully!', 'success');
  };

  return (
    <div className="page-content">
      {/* Top 2 Stat Cards matching Demo3 Frame 5 */}
      <div className="grid-2" style={{ marginBottom: '18px' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">OPEN BALANCES</span>
            <AlertCircle size={16} color="var(--badge-warning-text)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--badge-warning-text)' }}>{openEntries.length}</div>
          <div className="stat-helper">Pending customer side-balances</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">TOTAL OWED</span>
            <DollarSign size={16} color="var(--color-primary-dark)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--color-primary-dark)' }}>
            ₹{totalOwed.toLocaleString('en-IN')}
          </div>
          <div className="stat-helper">Accumulated short payments</div>
        </div>
      </div>

      {/* Bill Balance Tracker Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Bill Balance Tracker</h2>
            <p className="card-description">
              Side balances from partial-payment bills. Customer pays these later.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <Plus size={14} />
            <span>+ Record Bill Balance</span>
          </button>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>BILL #</th>
                <th>LOAN NO</th>
                <th>CUSTOMER</th>
                <th>DATE</th>
                <th>REASON / NOTES</th>
                <th style={{ textAlign: 'right' }}>BALANCE (₹)</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No bill balance entries yet.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{e.billNo}</td>
                    <td style={{ fontWeight: 600 }}>{e.loanNo}</td>
                    <td style={{ fontWeight: 600 }}>{e.customerName}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{e.date}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>{e.reason}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: e.status === 'OPEN' ? 'var(--badge-danger-text)' : 'inherit' }}>
                      ₹{e.balanceAmount.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`badge ${e.status === 'OPEN' ? 'badge-warning' : 'badge-success'}`}>
                        {e.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {e.status === 'OPEN' ? (
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-primary btn-xs"
                            onClick={() => handleClearBalance(e.id)}
                          >
                            <CheckCircle2 size={12} />
                            <span>Clear</span>
                          </button>
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => setCurrentPage('loan-receipts')}
                          >
                            <Eye size={12} />
                            <span>Receipt</span>
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: 'var(--badge-success-text)', fontWeight: 600 }}>
                          Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(22, 63, 53, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(3px)'
          }}
        >
          <div className="card" style={{ width: '440px' }}>
            <div className="card-header">
              <h3 className="card-title">Record Side Bill Balance</h3>
              <button className="icon-button" onClick={() => setShowAddModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddBalance} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label required">Loan Reference</label>
                <input
                  type="text"
                  className="input-control"
                  value={newLoanNo}
                  onChange={(e) => setNewLoanNo(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Customer Name</label>
                <input
                  type="text"
                  className="input-control"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Short Balance Amount (₹)</label>
                <input
                  type="number"
                  className="input-control"
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reason / Particulars</label>
                <input
                  type="text"
                  className="input-control"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
