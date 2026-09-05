import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Store,
  Building2,
  Phone,
  User,
  ArrowLeft,
  Receipt,
  Calendar,
  Edit3,
} from 'lucide-react';
import { rentalApi } from '../services/rentalApi.ts';
import { RentalShop, RentalPayment, ShopMonthlyStatus, RentalComplex } from '../types/rental.types.ts';
import { PaymentModal } from '../components/PaymentModal.tsx';
import { ShopModal } from '../components/ShopModal.tsx';

export const ShopDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shop, setShop] = useState<RentalShop | null>(null);
  const [complex, setComplex] = useState<RentalComplex | null>(null);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [currentMonthStatus, setCurrentMonthStatus] = useState<ShopMonthlyStatus | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [isLoading, setIsLoading] = useState(true);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [shopModalOpen, setShopModalOpen] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [shopRes, paymentsRes, statusRes] = await Promise.all([
        rentalApi.getShopById(id),
        rentalApi.getPayments({ shopId: id }),
        rentalApi.getShopMonthlyStatus(id, selectedMonth),
      ]);

      if (shopRes.success) {
        setShop(shopRes.data);
        const compRes = await rentalApi.getComplexById(shopRes.data.complexId);
        if (compRes.success) setComplex(compRes.data);
      }
      if (paymentsRes.success) setPayments(paymentsRes.data);
      if (statusRes.success) setCurrentMonthStatus(statusRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, selectedMonth]);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
        Loading unit ledger and tenant records...
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <h3 style={{ color: 'var(--text-primary)' }}>Shop Unit Not Found</h3>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/shops')} style={{ marginTop: '12px' }}>
          &larr; Back to Shops
        </button>
      </div>
    );
  }

  const totalPaidEver = payments.reduce((sum, p) => sum + p.amountReceived, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Top Banner */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button className="icon-button" onClick={() => navigate('/shops')}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-gold)' }}>
                {shop.shopId}
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Unit {shop.shopNumber}
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <Building2 size={13} />
              <span>{shop.complexName || complex?.complexName}</span>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setShopModalOpen(true)}>
            <Edit3 size={14} />
            <span>Edit Unit</span>
          </button>
          <button className="btn btn-primary" onClick={() => setPaymentModalOpen(true)}>
            <Receipt size={14} />
            <span>Record Rent Payment</span>
          </button>
        </div>
      </div>

      {/* Row: Tenant Details & Current Month Rent Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        {/* Tenant Profile Box */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Tenant KYC & Lease Contract</h3>
              <p className="card-description">Occupant contact and agreed terms</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tenant Name:</span>
              <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{shop.tenantName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Trade / Business:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{shop.shopName || shop.shopNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Phone Number:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                {shop.mobileNumber || '-'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Agreed Monthly Rent:</span>
              <span style={{ fontWeight: 800, color: 'var(--color-primary-accent)' }}>
                ₹{shop.monthlyRent.toLocaleString('en-IN')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Advance Deposit Held:</span>
              <span style={{ fontWeight: 800, color: 'var(--color-info)' }}>
                ₹{(shop.availableAdvance || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Selected Month Status Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} style={{ color: 'var(--color-gold)' }} />
              <div>
                <h3 className="card-title">Rent Status for Month</h3>
                <p className="card-description">Dues and coverage for selected period</p>
              </div>
            </div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input-control"
              style={{ width: '150px', height: '32px', fontSize: '12px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', margin: '8px 0' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rent Due</span>
              <span style={{ display: 'block', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                ₹{shop.monthlyRent.toLocaleString('en-IN')}
              </span>
            </div>
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount Paid</span>
              <span style={{ display: 'block', fontSize: '16px', fontWeight: 800, color: 'var(--color-success)', marginTop: '4px' }}>
                ₹{(currentMonthStatus?.amountPaid || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Balance Due</span>
              <span style={{ display: 'block', fontSize: '16px', fontWeight: 800, color: (currentMonthStatus?.outstandingBalance || 0) > 0 ? 'var(--color-warning)' : 'var(--color-success)', marginTop: '4px' }}>
                ₹{(currentMonthStatus?.outstandingBalance || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px' }}>
            <span>
              Payment Status: <span className={`badge ${currentMonthStatus?.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                {currentMonthStatus?.paymentStatus || 'PENDING'}
              </span>
            </span>
            {currentMonthStatus?.advanceUsed ? (
              <span style={{ color: 'var(--color-info)', fontWeight: 700 }}>
                Advance Used: ₹{currentMonthStatus.advanceUsed.toLocaleString('en-IN')}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Historical Ledger Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="card-title">Tenant Payment Ledger & History</h3>
            <p className="card-description">All historical payments recorded for Unit {shop.shopNumber}</p>
          </div>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Lifetime Paid: <span style={{ color: 'var(--color-success)', fontWeight: 800 }}>₹{totalPaidEver.toLocaleString('en-IN')}</span>
          </span>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Date</th>
                <th>Rent Month</th>
                <th style={{ textAlign: 'right' }}>Amount Received</th>
                <th>Payment Mode</th>
                <th style={{ textAlign: 'right' }}>Advance Used</th>
                <th style={{ textAlign: 'right' }}>Advance Generated</th>
                <th style={{ textAlign: 'right' }}>Balance Due</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No payment transactions recorded for this unit yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.paymentId}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-gold)' }}>
                      {p.paymentId}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.paymentDate}</td>
                    <td style={{ fontWeight: 600 }}>{p.paymentMonth}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-success)' }}>
                      ₹{p.amountReceived.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{p.paymentMode}</span>
                      {p.paymentMode === 'BOTH' && (
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>
                          Cash: ₹{p.cashAmount} / GPay: ₹{p.gpayAmount}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--color-info)', fontWeight: 600 }}>
                      {p.advanceUsed > 0 ? `₹${p.advanceUsed.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 700 }}>
                      {p.advanceGenerated > 0 ? `+ ₹${p.advanceGenerated.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-warning)' }}>
                      ₹{p.balanceAfterPayment.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${p.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                        {p.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={fetchData}
        complexes={complex ? [complex] : []}
        shops={[shop]}
        defaultShopId={shop.shopId}
        defaultComplexId={shop.complexId}
      />
      <ShopModal
        isOpen={shopModalOpen}
        onClose={() => setShopModalOpen(false)}
        onSuccess={fetchData}
        shop={shop}
        complexes={complex ? [complex] : []}
      />
    </div>
  );
};
