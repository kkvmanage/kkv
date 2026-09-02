import React from 'react';
import { useApp } from '../context/AppContext';
import { Printer, ArrowLeft } from 'lucide-react';

import { KKVLogo } from '../components/common/KKVLogo';

export const ReceiptDisplay: React.FC = () => {
  const { selectedReceipt, receipts, loans, setCurrentPage, whatsAppTemplates } = useApp();

  const receipt = selectedReceipt || receipts[0];
  const associatedLoan = loans.find((l) => l.loanNo === receipt?.loanNo);

  const handlePrint = () => {
    window.print();
  };

  if (!receipt) {
    return (
      <div className="page-content">
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No receipt selected.</p>
          <button
            className="btn btn-secondary"
            style={{ marginTop: '12px' }}
            onClick={() => setCurrentPage('all-receipts')}
          >
            Back to All Receipts
          </button>
        </div>
      </div>
    );
  }

  const handleWhatsAppShare = () => {
    const rawTemplate = whatsAppTemplates.receiptMessage;
    const msg = rawTemplate
      .replace(/{name}/g, receipt.customerName)
      .replace(/{billNo}/g, receipt.receiptNo.toString())
      .replace(/{loanId}/g, receipt.loanNo)
      .replace(/{amount}/g, receipt.amount.toString())
      .replace(/{date}/g, receipt.date)
      .replace(/{bankName}/g, 'KKV Gold Finance');
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="page-content">
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setCurrentPage('all-receipts')}
        >
          <ArrowLeft size={14} />
          <span>Back to Receipts</span>
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" style={{ color: '#25D366', borderColor: '#25D366' }} onClick={handleWhatsAppShare}>
            <span>WhatsApp Voucher</span>
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={15} />
            <span>Print Voucher</span>
          </button>
        </div>
      </div>

      {/* Official Printable Voucher Card */}
      <div
        className="card"
        style={{
          maxWidth: '740px',
          margin: '0 auto',
          padding: '36px',
          border: '1.5px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-md)',
          backgroundColor: '#FFFFFF'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingBottom: '20px',
            borderBottom: '2px solid var(--color-primary-dark)'
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <KKVLogo size={58} />
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary-dark)', margin: 0, letterSpacing: '0.5px' }}>
                KKV GOLD FINANCE
              </h1>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                MAIN BRANCH &mdash; 104 G.S.T Road, Chennai - 600045 | Ph: +91 44 2233 4455
              </p>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                Reg No: TN-CHE-2018-GF492 | GSTIN: 33AAAAA0000A1Z5
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                display: 'inline-block',
                backgroundColor: 'var(--color-light-accent)',
                color: 'var(--color-primary-dark)',
                fontWeight: 800,
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              OFFICIAL PAYMENT VOUCHER
            </span>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: '6px' }}>
              RECEIPT #{receipt.receiptNo}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Date: <strong>{receipt.date}</strong>
            </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            padding: '20px 0',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>
              Received From / Customer Details
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: '4px' }}>
              {receipt.customerName}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Customer ID: {receipt.customerId}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>
              Loan Reference &amp; Type
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: '4px' }}>
              {receipt.loanNo} &mdash; {receipt.loanType}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Transaction Kind: <strong>{receipt.kind}</strong>
            </div>
          </div>
        </div>

        {/* Amount Breakdown Table */}
        <div style={{ padding: '20px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--color-primary-dark)' }}>DESCRIPTION</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--color-primary-dark)' }}>PAYMENT MODE</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--color-primary-dark)' }}>AMOUNT (INR)</th>
              </tr>
            </thead>
            <tbody>
              {receipt.principalComponent > 0 && (
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600 }}>Principal Repayment Component</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Direct reduction of outstanding loan balance</div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span className="badge badge-info">{receipt.paymentMode}</span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>
                    ₹{receipt.principalComponent.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}

              {receipt.interestComponent > 0 && (
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600 }}>Monthly Interest Payment</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Pledge interest cleared for the period</div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span className="badge badge-info">{receipt.paymentMode}</span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>
                    ₹{receipt.interestComponent.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}

              {receipt.principalComponent === 0 && receipt.interestComponent === 0 && (
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600 }}>{receipt.kind} Disbursement / Settlement</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{receipt.notes || 'Gold pledge transaction'}</div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span className="badge badge-info">{receipt.paymentMode}</span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>
                    ₹{receipt.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}

              {/* Total Row */}
              <tr style={{ backgroundColor: 'var(--color-light-accent)', fontWeight: 800 }}>
                <td colSpan={2} style={{ padding: '14px', color: 'var(--color-primary-dark)', fontSize: '14px' }}>
                  NET RECEIVED TOTAL
                </td>
                <td style={{ padding: '14px', textAlign: 'right', color: 'var(--color-primary-dark)', fontSize: '17px' }}>
                  ₹{receipt.amount.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Reference Details */}
        {(receipt.transactionReference || receipt.bankName || receipt.upiId) && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--bg-surface-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '16px',
              fontSize: '12px',
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap'
            }}
          >
            {receipt.bankName && (
              <span>
                <strong>Bank:</strong> {receipt.bankName}
              </span>
            )}
            {receipt.transactionReference && (
              <span>
                <strong>Ref / UTR:</strong> {receipt.transactionReference}
              </span>
            )}
            {receipt.upiId && (
              <span>
                <strong>UPI ID:</strong> {receipt.upiId}
              </span>
            )}
            {receipt.processedBy && (
              <span>
                <strong>Processed By:</strong> {receipt.processedBy}
              </span>
            )}
          </div>
        )}

        {/* Collateral & Balance Details if available */}
        {associatedLoan && (
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-surface-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span>
                <strong>Pledged Gold Collateral:</strong> {associatedLoan.items.map((i) => i.item).join(', ')}
              </span>
              <span>
                <strong>Net Wt:</strong> {associatedLoan.totalNetWeight.toFixed(3)} g
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '8px',
                borderTop: '1px dashed var(--border-subtle)',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              {receipt.outstandingBefore !== undefined && (
                <span>
                  Balance Before: <strong>₹{receipt.outstandingBefore.toLocaleString('en-IN')}</strong>
                </span>
              )}
              <span>
                Amount Paid: <strong style={{ color: 'var(--color-primary-dark)' }}>₹{receipt.amount.toLocaleString('en-IN')}</strong>
              </span>
              <span>
                Remaining Balance: <strong style={{ color: 'var(--color-primary-dark)' }}>₹{(receipt.outstandingAfter ?? associatedLoan.outstandingPrincipal).toLocaleString('en-IN')}</strong>
              </span>
            </div>

            {/* Pledged Gold Photos Gallery on Voucher */}
            {associatedLoan.photos && associatedLoan.photos.length > 0 && (
              <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px dashed var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Pledged Collateral Photos ({associatedLoan.photos.length})
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {associatedLoan.photos.map((url, idx) => (
                    <div
                      key={`gold-photo-${idx}`}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      <img
                        src={url}
                        alt={`Pledged Gold ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Signature Area */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '48px', paddingTop: '20px' }}>
          <div style={{ textAlign: 'center', width: '180px' }}>
            <div style={{ borderTop: '1px solid var(--color-primary-dark)', paddingTop: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
              Customer's Signature
            </div>
          </div>

          <div style={{ textAlign: 'center', width: '220px' }}>
            <div style={{ borderTop: '1px solid var(--color-primary-dark)', paddingTop: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
              For KKV GOLD FINANCE
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>Authorized Signatory &amp; Seal</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
