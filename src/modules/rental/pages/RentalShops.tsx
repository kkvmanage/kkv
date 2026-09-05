import React, { useState, useEffect } from 'react';
import {
  Store,
  Plus,
  Search,
  Edit2,
  Phone,
  CreditCard,
  Ban,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { rentalApi } from '../services/rentalApi';
import { RentalShop, RentalComplex, RentalStatus } from '../types/rental.types';
import { RentalHeader } from '../components/RentalHeader';
import { ShopModal } from '../components/ShopModal';
import { PaymentModal } from '../components/PaymentModal';

interface RentalShopsProps {
  onSelectShop?: (shopId: string) => void;
}

export const RentalShops: React.FC<RentalShopsProps> = ({ onSelectShop }) => {
  const { setCurrentPage, showToast } = useApp();

  const [shops, setShops] = useState<RentalShop[]>([]);
  const [complexes, setComplexes] = useState<RentalComplex[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedComplexFilter, setSelectedComplexFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RentalStatus>('ALL');

  // Modals
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<RentalShop | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [targetShopIdForPayment, setTargetShopIdForPayment] = useState<string | undefined>(undefined);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        rentalApi.getShops(),
        rentalApi.getComplexes()
      ]);
      if (sRes.success && sRes.data) setShops(sRes.data);
      if (cRes.success && cRes.data) setComplexes(cRes.data);
    } catch (err) {
      console.error('Error fetching shops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleSaveShop = async (data: any) => {
    if (editingShop) {
      const res = await rentalApi.updateShop(editingShop.shopId, data);
      if (res.success) {
        showToast(res.message || 'Shop updated', 'success');
        await fetchShops();
      } else {
        throw new Error(res.message || 'Failed to update shop');
      }
    } else {
      const res = await rentalApi.createShop(data);
      if (res.success) {
        showToast(res.message || 'Shop created', 'success');
        await fetchShops();
      } else {
        throw new Error(res.message || 'Failed to create shop');
      }
    }
  };

  const handleToggleStatus = async (shop: RentalShop) => {
    const newStatus: RentalStatus = shop.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await rentalApi.updateShop(shop.shopId, { status: newStatus });
      if (res.success) {
        showToast(`Shop ${shop.shopNumber} marked as ${newStatus}`, 'success');
        await fetchShops();
      } else {
        showToast(res.message || 'Status update failed', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error updating status', 'error');
    }
  };

  const filtered = shops.filter((s) => {
    const matchesSearch =
      s.shopNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.shopName.toLowerCase().includes(search.toLowerCase()) ||
      s.tenantName.toLowerCase().includes(search.toLowerCase()) ||
      s.mobileNumber.includes(search) ||
      (s.complexName && s.complexName.toLowerCase().includes(search.toLowerCase()));

    const matchesComplex = !selectedComplexFilter || s.complexId === selectedComplexFilter;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

    return matchesSearch && matchesComplex && matchesStatus;
  });

  return (
    <div className="page-content">
      <RentalHeader
        title="Commercial Shops & Tenants"
        subtitle="Manage shop units across complexes, tenant contact details, monthly rents, and advances"
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingShop(null);
              setIsShopModalOpen(true);
            }}
          >
            <Plus size={15} />
            <span>+ Add Shop</span>
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className="input-control"
            placeholder="Search by shop no., name, tenant, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="select-control"
            style={{ width: '180px', height: '34px', fontSize: '12px' }}
            value={selectedComplexFilter}
            onChange={(e) => setSelectedComplexFilter(e.target.value)}
          >
            <option value="">All Complexes</option>
            {complexes.map((c) => (
              <option key={c.complexId} value={c.complexId}>
                {c.complexName}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '4px' }}>
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
              <button
                key={st}
                type="button"
                className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(st)}
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={{ padding: '18px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading shops...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Store size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No shops found matching your criteria</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>SHOP NO.</th>
                  <th>COMPLEX</th>
                  <th>BUSINESS / SHOP NAME</th>
                  <th>TENANT NAME</th>
                  <th>MOBILE</th>
                  <th style={{ textAlign: 'right' }}>MONTHLY RENT</th>
                  <th style={{ textAlign: 'right' }}>AVAIL. ADVANCE</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((shop) => (
                  <tr key={shop.shopId}>
                    <td style={{ fontWeight: 800, color: 'var(--color-gold-light)' }}>
                      {shop.shopNumber}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{shop.complexName}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{shop.shopName}</td>
                    <td>{shop.tenantName}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                        <Phone size={11} />
                        {shop.mobileNumber}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#176B52' }}>
                      ₹{shop.monthlyRent.toLocaleString('en-IN')}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: shop.availableAdvance > 0 ? 700 : 400,
                        color: shop.availableAdvance > 0 ? '#2563eb' : 'var(--text-muted)'
                      }}
                    >
                      ₹{shop.availableAdvance.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '9.5px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          backgroundColor:
                            shop.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: shop.status === 'ACTIVE' ? '#16a34a' : '#dc2626'
                        }}
                      >
                        {shop.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          style={{ padding: '2px 8px', fontSize: '10.5px' }}
                          onClick={() => {
                            setTargetShopIdForPayment(shop.shopId);
                            setIsPaymentModalOpen(true);
                          }}
                          title="Record Rent Payment"
                        >
                          <CreditCard size={11} />
                          <span>Pay</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '10.5px' }}
                          onClick={() => {
                            if (onSelectShop) {
                              onSelectShop(shop.shopId);
                            } else {
                              (window as any).__selectedRentalShopId = shop.shopId;
                              setCurrentPage('rental-shop-detail' as any);
                            }
                          }}
                          title="View Payment History"
                        >
                          History
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '2px 6px' }}
                          onClick={() => {
                            setEditingShop(shop);
                            setIsShopModalOpen(true);
                          }}
                          title="Edit Shop"
                        >
                          <Edit2 size={11} />
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          style={{
                            padding: '2px 6px',
                            color: shop.status === 'ACTIVE' ? '#dc2626' : '#16a34a'
                          }}
                          onClick={() => handleToggleStatus(shop)}
                          title={shop.status === 'ACTIVE' ? 'Deactivate Shop' : 'Activate Shop'}
                        >
                          {shop.status === 'ACTIVE' ? <Ban size={11} /> : <CheckCircle2 size={11} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <ShopModal
        isOpen={isShopModalOpen}
        onClose={() => setIsShopModalOpen(false)}
        onSave={handleSaveShop}
        complexes={complexes}
        shopToEdit={editingShop}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setTargetShopIdForPayment(undefined);
        }}
        onSuccess={fetchShops}
        complexes={complexes}
        shops={shops}
        defaultShopId={targetShopIdForPayment}
      />
    </div>
  );
};
