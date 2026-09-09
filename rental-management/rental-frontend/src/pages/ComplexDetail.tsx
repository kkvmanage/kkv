import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Store,
  MapPin,
  ArrowLeft,
  Plus,
  Receipt,
  Edit3,
} from 'lucide-react';
import { rentalApi } from '../services/rentalApi.ts';
import { RentalComplex, RentalShop, RentalPayment, RentalExpense } from '../types/rental.types.ts';
import { ShopModal } from '../components/ShopModal.tsx';
import { PaymentModal } from '../components/PaymentModal.tsx';
import { ComplexModal } from '../components/ComplexModal.tsx';

export const ComplexDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [complex, setComplex] = useState<RentalComplex | null>(null);
  const [shops, setShops] = useState<RentalShop[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [expenses, setExpenses] = useState<RentalExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<RentalShop | null>(null);
  const [complexModalOpen, setComplexModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentShopId, setPaymentShopId] = useState<string | undefined>(undefined);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [compRes, shopsRes, paymentsRes, expensesRes] = await Promise.all([
        rentalApi.getComplexById(id),
        rentalApi.getShops(id),
        rentalApi.getPayments({ complexId: id }),
        rentalApi.getExpenses({ complexId: id }),
      ]);

      if (compRes.success) setComplex(compRes.data);
      if (shopsRes.success) setShops(shopsRes.data);
      if (paymentsRes.success) setPayments(paymentsRes.data);
      if (expensesRes.success) setExpenses(expensesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
        Loading complex details...
      </div>
    );
  }

  if (!complex) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <h3 style={{ color: 'var(--text-primary)' }}>Complex Not Found</h3>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/complexes')} style={{ marginTop: '12px' }}>
          &larr; Back to Complexes
        </button>
      </div>
    );
  }

  const activeShops = shops.filter((s) => s.status === 'ACTIVE');
  const expectedMonthlyRent = activeShops.reduce((sum, s) => sum + s.monthlyRent, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amountReceived, 0);
  const totalAdvanceHeld = shops.reduce((sum, s) => sum + (s.availableAdvance || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Top Details Card */}
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
          <button className="icon-button" onClick={() => navigate('/complexes')}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-gold)' }}>
                {complex.complexId}
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {complex.complexName}
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <MapPin size={13} />
              <span>{complex.location}</span>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setComplexModalOpen(true)}>
            <Edit3 size={14} />
            <span>Edit Complex</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSelectedShop(null);
              setShopModalOpen(true);
            }}
          >
            <Plus size={14} />
            <span>Add Shop</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Total Units</span>
            <span className="stat-card-value">{shops.length}</span>
            <span className="stat-card-sub">{activeShops.length} Active Leases</span>
          </div>
          <div className="stat-card-icon icon-chip-green">
            <Store size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Monthly Target</span>
            <span className="stat-card-value">₹{expectedMonthlyRent.toLocaleString('en-IN')}</span>
            <span className="stat-card-sub">Expected Rent</span>
          </div>
          <div className="stat-card-icon icon-chip-gold">
            <Receipt size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Advance Held</span>
            <span className="stat-card-value" style={{ color: 'var(--color-info)' }}>
              ₹{totalAdvanceHeld.toLocaleString('en-IN')}
            </span>
            <span className="stat-card-sub">Deposit balance</span>
          </div>
          <div className="stat-card-icon icon-chip-blue">
            <Building2 size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <span className="stat-card-label">Total Collected</span>
            <span className="stat-card-value" style={{ color: 'var(--color-success)' }}>
              ₹{totalCollected.toLocaleString('en-IN')}
            </span>
            <span className="stat-card-sub">All-time receipts</span>
          </div>
          <div className="stat-card-icon icon-chip-teal">
            <Receipt size={20} />
          </div>
        </div>
      </div>

      {/* Shops in Complex Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="card-title">Commercial Units & Tenant Roster</h3>
            <p className="card-description">Shops registered inside {complex.complexName}</p>
          </div>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Shop Number</th>
                <th>Tenant Name</th>
                <th>Mobile</th>
                <th style={{ textAlign: 'right' }}>Monthly Rent</th>
                <th style={{ textAlign: 'right' }}>Advance Credit</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shops.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No shops added to this complex yet. Click &quot;Add Shop&quot; above.
                  </td>
                </tr>
              ) : (
                shops.map((shop) => (
                  <tr
                    key={shop.shopId}
                    onClick={() => navigate(`/shops/${shop.shopId}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                      {shop.shopNumber}
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block', fontFamily: 'monospace' }}>
                        {shop.shopId}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{shop.tenantName}</span>
                      {shop.shopName && shop.shopName !== shop.shopNumber && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                          {shop.shopName}
                        </span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {shop.mobileNumber || '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary-accent)' }}>
                      ₹{shop.monthlyRent.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-info)' }}>
                      ₹{(shop.availableAdvance || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${shop.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                        {shop.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setPaymentShopId(shop.shopId);
                            setPaymentModalOpen(true);
                          }}
                        >
                          <span>Collect</span>
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedShop(shop);
                            setShopModalOpen(true);
                          }}
                        >
                          <span>Edit</span>
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

      {/* Modals */}
      <ShopModal
        isOpen={shopModalOpen}
        onClose={() => setShopModalOpen(false)}
        onSuccess={fetchData}
        shop={selectedShop}
        complexes={[complex]}
        defaultComplexId={complex.complexId}
      />
      <ComplexModal
        isOpen={complexModalOpen}
        onClose={() => setComplexModalOpen(false)}
        onSuccess={fetchData}
        complex={complex}
      />
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={fetchData}
        complexes={[complex]}
        shops={shops}
        defaultComplexId={complex.complexId}
        defaultShopId={paymentShopId}
      />
    </div>
  );
};
