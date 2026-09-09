import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Store, ArrowRight, Edit3, MapPin, Eye, Search, CreditCard, CheckCircle2 } from 'lucide-react';
import { rentalApi } from '../services/rentalApi.ts';
import { RentalComplex, RentalShop } from '../types/rental.types.ts';
import { ComplexModal } from '../components/ComplexModal.tsx';
import { ShopModal } from '../components/ShopModal.tsx';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { SummaryCard } from '../components/common/SummaryCard.tsx';

export const Complexes: React.FC = () => {
  const navigate = useNavigate();
  const [complexes, setComplexes] = useState<RentalComplex[]>([]);
  const [shops, setShops] = useState<RentalShop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedComplex, setSelectedComplex] = useState<RentalComplex | null>(null);

  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [activeComplexForShop, setActiveComplexForShop] = useState<string | undefined>(undefined);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [compRes, shopRes] = await Promise.all([
        rentalApi.getComplexes(),
        rentalApi.getShops(),
      ]);
      if (compRes.success) setComplexes(compRes.data);
      if (shopRes.success) setShops(shopRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredComplexes = complexes.filter((c) => {
    const q = searchQuery.toLowerCase();
    return !q || c.complexName.toLowerCase().includes(q) || c.location.toLowerCase().includes(q) || c.complexId.toLowerCase().includes(q);
  });

  const totalComplexes = complexes.length;
  const totalShops = shops.length;
  const totalExpectedRent = shops.reduce((sum, s) => sum + (s.monthlyRent || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Complexes
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Manage commercial properties, locations, unit rosters, and overall occupancy.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setSelectedComplex(null);
            setModalOpen(true);
          }}
        >
          <Plus size={16} />
          <span>New Complex</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <SummaryCard
          label="Total Complexes"
          value={totalComplexes}
          subtext="Active commercial buildings"
          icon={Building2}
          iconChipClass="icon-chip-green"
        />
        <SummaryCard
          label="Total Commercial Units"
          value={totalShops}
          subtext="Shops across all complexes"
          icon={Store}
          iconChipClass="icon-chip-teal"
        />
        <SummaryCard
          label="Expected Monthly Rent"
          value={`₹${totalExpectedRent.toLocaleString('en-IN')}`}
          subtext="Contractual rental yield"
          icon={CreditCard}
          iconChipClass="icon-chip-gold"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-search-box">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search complex by name, location, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Complexes Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '110px' }}>Complex ID</th>
              <th style={{ width: '220px' }}>Complex Name</th>
              <th style={{ width: '180px' }}>Location</th>
              <th className="text-center" style={{ width: '110px' }}>Total Shops</th>
              <th className="text-right" style={{ width: '130px' }}>Expected Rent</th>
              <th className="text-center" style={{ width: '100px' }}>Status</th>
              <th className="text-center" style={{ width: '160px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '16px', height: '16px', border: '2px solid var(--color-primary-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Loading commercial complexes...</span>
                  </div>
                </td>
              </tr>
            ) : filteredComplexes.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    <Building2 size={32} style={{ strokeWidth: 1.5, opacity: 0.6 }} />
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No Complexes Found</p>
                    <p style={{ fontSize: '12px' }}>Click "+ New Complex" to register a commercial property.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredComplexes.map((c) => {
                const compShops = shops.filter((s) => s.complexId === c.complexId);
                const compRent = compShops.reduce((sum, s) => sum + (s.monthlyRent || 0), 0);

                return (
                  <tr key={c.complexId}>
                    <td>
                      <span className="cell-mono-id">{c.complexId}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
                        {c.complexName}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                        <span>{c.location}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                        {compShops.length}
                      </span>
                    </td>
                    <td className="text-right">
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                        ₹{compRent.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="text-center">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="text-center">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          className="btn-view"
                          onClick={() => navigate(`/complexes/${c.complexId}`)}
                          title="View Complex Details"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                        <button
                          className="btn-view"
                          style={{ color: 'var(--text-secondary)' }}
                          onClick={() => {
                            setSelectedComplex(c);
                            setModalOpen(true);
                          }}
                          title="Edit Complex"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          className="btn-view"
                          style={{ backgroundColor: 'var(--badge-success-bg)', color: 'var(--color-primary-accent)', borderColor: 'var(--color-primary-accent)' }}
                          onClick={() => {
                            setActiveComplexForShop(c.complexId);
                            setShopModalOpen(true);
                          }}
                          title="Add Shop to Complex"
                        >
                          <Plus size={12} />
                          <span>Shop</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Complex Modal */}
      <ComplexModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedComplex(null);
        }}
        onSuccess={fetchData}
        complex={selectedComplex}
      />

      {/* Quick Add Shop Modal */}
      <ShopModal
        isOpen={shopModalOpen}
        onClose={() => {
          setShopModalOpen(false);
          setActiveComplexForShop(undefined);
        }}
        onSuccess={fetchData}
        complexes={complexes}
        defaultComplexId={activeComplexForShop}
      />
    </div>
  );
};
