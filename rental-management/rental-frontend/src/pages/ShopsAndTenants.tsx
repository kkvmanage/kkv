import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Plus, Search, RotateCcw, Building2, User, CreditCard, Eye, Edit3 } from 'lucide-react';
import { rentalApi } from '../services/rentalApi.ts';
import { RentalShop, RentalComplex, RentalStatus } from '../types/rental.types.ts';
import { ShopModal } from '../components/ShopModal.tsx';
import { PaymentModal } from '../components/PaymentModal.tsx';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { SummaryCard } from '../components/common/SummaryCard.tsx';

export const ShopsAndTenants: React.FC = () => {
  const navigate = useNavigate();
  const [shops, setShops] = useState<RentalShop[]>([]);
  const [complexes, setComplexes] = useState<RentalComplex[]>([]);
  const [selectedComplexFilter, setSelectedComplexFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<RentalStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<RentalShop | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activePaymentShopId, setActivePaymentShopId] = useState<string | undefined>(undefined);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [shopsRes, compRes] = await Promise.all([
        rentalApi.getShops(
          selectedComplexFilter || undefined,
          (selectedStatusFilter as RentalStatus) || undefined
        ),
        rentalApi.getComplexes(),
      ]);

      if (shopsRes.success) setShops(shopsRes.data);
      if (compRes.success) setComplexes(compRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedComplexFilter, selectedStatusFilter]);

  const filteredShops = shops.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      s.shopNumber.toLowerCase().includes(q) ||
      (s.shopName && s.shopName.toLowerCase().includes(q)) ||
      s.tenantName.toLowerCase().includes(q) ||
      (s.mobileNumber && s.mobileNumber.toLowerCase().includes(q)) ||
      (s.complexName && s.complexName.toLowerCase().includes(q))
    );
  });

  const totalShops = filteredShops.length;
  const activeShops = filteredShops.filter((s) => s.status === 'ACTIVE').length;
  const inactiveShops = filteredShops.filter((s) => s.status === 'INACTIVE').length;
  const totalMonthlyRent = filteredShops.reduce((sum, s) => sum + (s.monthlyRent || 0), 0);
  const totalAdvance = filteredShops.reduce((sum, s) => sum + (s.availableAdvance || 0), 0);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedComplexFilter('');
    setSelectedStatusFilter('');
  };

  const hasActiveFilters = searchQuery || selectedComplexFilter || selectedStatusFilter;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Shops & Tenants
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Manage commercial shop units, tenant agreements, monthly rent terms, and advance credit.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setSelectedShop(null);
            setShopModalOpen(true);
          }}
        >
          <Plus size={16} />
          <span>New Shop Unit</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <SummaryCard
          label="Total Units"
          value={totalShops}
          subtext={`${activeShops} Active · ${inactiveShops} Inactive`}
          icon={Store}
          iconChipClass="icon-chip-green"
        />
        <SummaryCard
          label="Expected Rent"
          value={`₹${totalMonthlyRent.toLocaleString('en-IN')}`}
          subtext="Monthly contractual rent"
          icon={CreditCard}
          iconChipClass="icon-chip-teal"
        />
        <SummaryCard
          label="Total Advance Pool"
          value={`₹${totalAdvance.toLocaleString('en-IN')}`}
          subtext="Available tenant deposits"
          icon={User}
          iconChipClass="icon-chip-gold"
        />
        <SummaryCard
          label="Occupancy Rate"
          value={totalShops > 0 ? `${Math.round((activeShops / totalShops) * 100)}%` : '0%'}
          subtext="Active leased commercial spaces"
          icon={Building2}
          iconChipClass="icon-chip-blue"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by shop number, trade name, tenant, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={selectedComplexFilter}
          onChange={(e) => setSelectedComplexFilter(e.target.value)}
          title="Filter by Complex"
        >
          <option value="">All Complexes</option>
          {complexes.map((c) => (
            <option key={c.complexId} value={c.complexId}>
              {c.complexName}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={selectedStatusFilter}
          onChange={(e) => setSelectedStatusFilter(e.target.value as RentalStatus | '')}
          title="Filter by Status"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active / Occupied</option>
          <option value="INACTIVE">Inactive / Vacant</option>
        </select>

        {hasActiveFilters && (
          <button className="filter-clear-btn" onClick={handleClearFilters}>
            <RotateCcw size={13} />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Shop ID</th>
              <th style={{ width: '160px' }}>Complex</th>
              <th style={{ width: '140px' }}>Shop / Unit</th>
              <th style={{ width: '170px' }}>Tenant Details</th>
              <th className="text-right" style={{ width: '120px' }}>Monthly Rent</th>
              <th className="text-right" style={{ width: '120px' }}>Available Advance</th>
              <th className="text-center" style={{ width: '100px' }}>Status</th>
              <th className="text-center" style={{ width: '140px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '16px', height: '16px', border: '2px solid var(--color-primary-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Loading shops directory...</span>
                  </div>
                </td>
              </tr>
            ) : filteredShops.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    <Store size={32} style={{ strokeWidth: 1.5, opacity: 0.6 }} />
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No Shops Found</p>
                    <p style={{ fontSize: '12px' }}>
                      {hasActiveFilters ? 'Try adjusting your search query or filters.' : 'Click "+ New Shop Unit" to register a commercial shop.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredShops.map((shop) => (
                <tr key={shop.shopId}>
                  <td>
                    <span className="cell-mono-id">{shop.shopId}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {shop.complexName || shop.complexId}
                    </span>
                  </td>
                  <td>
                    <div className="cell-two-line">
                      <span className="cell-title">{shop.shopNumber}</span>
                      <span className="cell-sub">{shop.shopName || 'Commercial Unit'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="cell-two-line">
                      <span className="cell-title">{shop.tenantName || 'Unassigned'}</span>
                      <span className="cell-sub">{shop.mobileNumber || '-'}</span>
                    </div>
                  </td>
                  <td className="text-right">
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                      ₹{shop.monthlyRent.toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="text-right">
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: (shop.availableAdvance || 0) > 0 ? 700 : 500,
                        color: (shop.availableAdvance || 0) > 0 ? 'var(--color-gold-muted)' : 'var(--text-muted)',
                      }}
                    >
                      ₹{(shop.availableAdvance || 0).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="text-center">
                    <StatusBadge status={shop.status} />
                  </td>
                  <td className="text-center">
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        className="btn-view"
                        onClick={() => navigate(`/shops/${shop.shopId}`)}
                        title="View Ledger"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      <button
                        className="btn-view"
                        style={{ color: 'var(--text-secondary)' }}
                        onClick={() => {
                          setSelectedShop(shop);
                          setShopModalOpen(true);
                        }}
                        title="Edit Shop"
                      >
                        <Edit3 size={12} />
                      </button>
                      {shop.status === 'ACTIVE' && (
                        <button
                          className="btn-view"
                          style={{ backgroundColor: 'var(--badge-success-bg)', color: 'var(--color-primary-accent)', borderColor: 'var(--color-primary-accent)' }}
                          onClick={() => {
                            setActivePaymentShopId(shop.shopId);
                            setPaymentModalOpen(true);
                          }}
                          title="Record Payment"
                        >
                          <CreditCard size={12} />
                          <span>Pay</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Shop Modal */}
      <ShopModal
        isOpen={shopModalOpen}
        onClose={() => {
          setShopModalOpen(false);
          setSelectedShop(null);
        }}
        onSuccess={fetchData}
        complexes={complexes}
        shop={selectedShop}
      />

      {/* Record Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setActivePaymentShopId(undefined);
        }}
        onSuccess={fetchData}
        complexes={complexes}
        shops={shops}
        defaultShopId={activePaymentShopId}
      />
    </div>
  );
};
