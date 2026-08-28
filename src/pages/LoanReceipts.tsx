import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Mic, Printer, Eye, Plus, Calculator, FileText } from 'lucide-react';
import { Receipt } from '../types';

export const LoanReceipts: React.FC = () => {
  const { loans, receipts, selectedLoan, setSelectedLoan, setSelectedReceipt, addReceipt, setCurrentPage, showToast } = useApp();

  const [loanId, setLoanId] = useState<string>(selectedLoan?.id || loans[0]?.id || '');
  const [receiptType, setReceiptType] = useState<'INTEREST PAYMENT' | 'REPAYMENT' | 'PART PAYMENT' | 'LOAN CLOSURE'>('INTEREST PAYMENT');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(1500);
  const [currentDueDate, setCurrentDueDate] = useState<string>('25-08-2026');
  const [noOfDays, setNoOfDays] = useState<number>(30);
  const [nextDueDate, setNextDueDate] = useState<string>('25-09-2026');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'UPI'>('Cash');
  
  // Additional charges
  const [daysLate, setDaysLate] = useState<number>(0);
  const [odCharge, setOdCharge] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [tdsAmount, setTdsAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('Monthly interest payment');

  const currentLoan = loans.find((l) => l.id === loanId) || loans[0];
  const nextReceiptNo = receipts.length > 0 ? Math.max(...receipts.map((r) => r.receiptNo)) + 1 : 1;

  useEffect(() => {
    if (currentLoan) {
      const monthlyInt = currentLoan.monthlyInterest || Math.round((currentLoan.principal * currentLoan.interestRate) / 100);
      if (receiptType === 'INTEREST PAYMENT') {
        setAmount(monthlyInt);
        setNotes('Monthly interest payment');
      } else if (receiptType === 'LOAN CLOSURE') {
        setAmount(currentLoan.outstandingPrincipal + monthlyInt);
        setNotes('Full pledge closure & gold release');
      } else if (receiptType === 'REPAYMENT' || receiptType === 'PART PAYMENT') {
        setAmount(1500);
        setNotes('Part principal repayment');
      }
    }
  }, [loanId, receiptType, currentLoan]);

  const netAmount = Math.max(0, amount + odCharge + otherCharges - discount);

  const handleLoanChange = (id: string) => {
    setLoanId(id);
    const l = loans.find((item) => item.id === id);
    if (l) {
      setSelectedLoan(l);
      if (l.nextDueDate) setCurrentDueDate(l.nextDueDate);
    }
  };

  const handleUseDueAmount = () => {
    if (currentLoan) {
      const due = currentLoan.monthlyInterest || 1500;
      setAmount(due);
      showToast(`Set amount to monthly interest due: ₹${due.toLocaleString('en-IN')}`, 'info');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || amount <= 0) {
      showToast('Please enter a valid receipt amount.', 'error');
      return;
    }

    const principalComp = receiptType === 'INTEREST PAYMENT' ? 0 : receiptType === 'LOAN CLOSURE' ? currentLoan.outstandingPrincipal : amount;
    const interestComp = receiptType === 'INTEREST PAYMENT' ? amount : receiptType === 'LOAN CLOSURE' ? currentLoan.monthlyInterest : 0;

    const newReceipt = addReceipt({
      loanId: currentLoan.id,
      loanNo: currentLoan.loanNo,
      customerId: currentLoan.customerId,
      customerName: currentLoan.customerName,
      kind: receiptType,
      loanType: 'GOLD LOAN',
      amount: netAmount,
      principalComponent: principalComp,
      interestComponent: interestComp,
      odCharges: odCharge,
      otherCharges,
      discount,
      tdsAmount,
      paymentMode: paymentMethod,
      date: new Date().toLocaleDateString('en-GB'),
      currentDueDate,
      nextDueDate,
      daysLate,
      notes
    });

    setSelectedReceipt(newReceipt);
    setCurrentPage('receipt-display');
  };

  const handleViewReceipt = (r: Receipt) => {
    setSelectedReceipt(r);
    setCurrentPage('receipt-display');
  };

  return (
    <div className="page-content">
      {/* Voice Fill Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--color-light-accent)',
          padding: '10px 18px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '18px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
          <Mic size={16} color="var(--color-primary-accent)" />
          <span>Voice Fill (Alt+V) &mdash; Speak: "GL-01 received 1500 cash for interest"</span>
        </div>
        <span className="badge badge-success">Live Smart Assistant Active</span>
      </div>

      <div className="grid-3" style={{ alignItems: 'start' }}>
        {/* Record Loan Receipt Form */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Record Loan Receipt</h2>
              <p className="card-description">Receive interest, EMI, part payment or principal loan closure</p>
            </div>
            <span className="badge badge-info">VOUCHER #{nextReceiptNo}</span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Row 1: Receipt / Bill No + Date */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">RECEIPT / BILL NO</label>
                <input
                  type="text"
                  className="input-control"
                  value={nextReceiptNo}
                  readOnly
                  style={{ backgroundColor: 'var(--bg-surface-secondary)', fontWeight: 700 }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Auto-filled with the next available bill number.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label required">DATE</label>
                <input
                  type="date"
                  className="input-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: Receipt Type + Loan Search */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">RECEIPT TYPE</label>
                <select
                  className="select-control"
                  value={receiptType}
                  onChange={(e) => setReceiptType(e.target.value as any)}
                >
                  <option value="INTEREST PAYMENT">Interest Payment</option>
                  <option value="REPAYMENT">Principal Repayment</option>
                  <option value="PART PAYMENT">Part Payment</option>
                  <option value="LOAN CLOSURE">Loan Closure (Full Release)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">LOAN</label>
                <select
                  className="select-control"
                  value={loanId}
                  onChange={(e) => handleLoanChange(e.target.value)}
                >
                  {loans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.loanNo} &mdash; {l.customerName} (Bal: ₹{l.outstandingPrincipal.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Amount + Current Due Date */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">AMOUNT (INR)</label>
                <input
                  type="number"
                  className="input-control"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary-dark)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">CURRENT DUE DATE (INTEREST CALCULATED FROM)</label>
                <input
                  type="text"
                  className="input-control"
                  value={currentDueDate}
                  onChange={(e) => setCurrentDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Row 4: No. of Days + Next Due Date */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">NO. OF DAYS (EDITABLE - CHANGES NEXT DUE DATE)</label>
                <input
                  type="number"
                  className="input-control"
                  value={noOfDays}
                  onChange={(e) => setNoOfDays(Number(e.target.value))}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>1 month = 30 days standard</span>
              </div>

              <div className="form-group">
                <label className="form-label">NEXT DUE DATE (EDITABLE)</label>
                <input
                  type="text"
                  className="input-control"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Row 5: Payment Method */}
            <div className="form-group">
              <label className="form-label required">PAYMENT METHOD</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {(['Cash', 'Bank', 'UPI'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`btn btn-sm ${paymentMethod === m ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPaymentMethod(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Charges Section */}
            <div style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '10px' }}>
                ADDITIONAL CHARGES <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional &mdash; added to receipt total, do not change loan principal/interest)</span>
              </div>

              <div className="grid-2" style={{ marginBottom: '10px' }}>
                <div className="form-group">
                  <label className="form-label">DAYS LATE (AUTO FROM DATES)</label>
                  <input
                    type="number"
                    className="input-control"
                    value={daysLate}
                    onChange={(e) => setDaysLate(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">OD / OVERDUE CHARGE (₹)</label>
                  <input
                    type="number"
                    className="input-control"
                    value={odCharge}
                    onChange={(e) => setOdCharge(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">OTHER CHARGES (₹)</label>
                  <input
                    type="number"
                    className="input-control"
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">DISCOUNT (₹) (REDUCES TOTAL)</label>
                  <input
                    type="number"
                    className="input-control"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* TDS Section */}
            <div className="form-group">
              <label className="form-label">
                TDS AMOUNT (₹) <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(tracked for your claim only &mdash; does NOT change this receipt or Day Book)</span>
              </label>
              <input
                type="number"
                className="input-control"
                value={tdsAmount}
                onChange={(e) => setTdsAmount(Number(e.target.value))}
              />
            </div>

            {/* Net Amount Received Preview */}
            <div
              style={{
                backgroundColor: 'var(--color-light-accent)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1.5px solid var(--border-subtle)'
              }}
            >
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--color-primary-dark)', letterSpacing: '0.5px' }}>
                  NET AMOUNT RECEIVED
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Total inflow recorded to branch {paymentMethod} ledger
                </div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-primary-dark)' }}>
                ₹{netAmount.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Submission Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleUseDueAmount}
                >
                  <Calculator size={13} />
                  <span>Use due amount</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentPage('bill-balance')}
                >
                  <Plus size={13} />
                  <span>+ Bill Balance</span>
                </button>
              </div>

              <button type="submit" className="btn btn-primary btn-lg">
                <Printer size={16} />
                <span>Record &amp; Print Receipt</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Collateral & Info Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Pledge Information</h3>
            <span className="badge badge-gold">COLLATERAL</span>
          </div>

          {currentLoan && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Borrower</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary-dark)', marginTop: '2px' }}>
                  {currentLoan.customerName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{currentLoan.customerPhone}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Loan Number:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{currentLoan.loanNo}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Disbursed Principal:</span>
                <span style={{ fontWeight: 600 }}>₹{currentLoan.principal.toLocaleString('en-IN')}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Current Outstanding:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                  ₹{currentLoan.outstandingPrincipal.toLocaleString('en-IN')}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Monthly Rate:</span>
                <span style={{ fontWeight: 600 }}>{currentLoan.interestRate}% / month</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Monthly Interest Due:</span>
                <span style={{ fontWeight: 700, color: 'var(--badge-success-text)' }}>
                  ₹{currentLoan.monthlyInterest.toLocaleString('en-IN')}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Pledged Gold:</span>
                <span style={{ fontWeight: 600 }}>{currentLoan.totalNetWeight.toFixed(3)} g</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Pledged Ornaments:
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                  {currentLoan.items.map((i) => `${i.item} (${i.qty})`).join(', ')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Receipts Table */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Recent Payment Receipts</h2>
            <p className="card-description">All historical receipts issued for this branch</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentPage('all-receipts')}>
            <FileText size={13} />
            <span>View Full Ledger</span>
          </button>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>RECEIPT NO</th>
                <th>LOAN NO</th>
                <th>CUSTOMER</th>
                <th>PAYMENT DATE</th>
                <th>PRINCIPAL</th>
                <th>INTEREST</th>
                <th>TOTAL PAID</th>
                <th>METHOD</th>
                <th style={{ textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>#{r.receiptNo}</td>
                  <td style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>{r.loanNo}</td>
                  <td style={{ fontWeight: 600 }}>{r.customerName}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{r.date}</td>
                  <td style={{ fontWeight: 600 }}>₹{r.principalComponent.toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--badge-success-text)', fontWeight: 600 }}>
                    ₹{r.interestComponent.toLocaleString('en-IN')}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                    ₹{r.amount.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className="badge badge-info">{r.paymentMode}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="icon-button"
                        style={{ width: '28px', height: '28px' }}
                        title="View Receipt"
                        onClick={() => handleViewReceipt(r)}
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        className="icon-button"
                        style={{ width: '28px', height: '28px' }}
                        title="Print Receipt Voucher"
                        onClick={() => handleViewReceipt(r)}
                      >
                        <Printer size={13} />
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
