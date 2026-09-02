import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, RotateCcw, Edit3, Eye } from 'lucide-react';
import { EditCustomerModal } from '../components/common/EditCustomerModal';
import { ViewCustomerModal } from '../components/common/ViewCustomerModal';
import { Customer } from '../types';
import { formatIdProofDisplay } from '../utils/kycValidation';

export const SearchCustomer: React.FC = () => {
  const { customers, loans, updateCustomer, setSelectedProfileCustomerId, setCurrentPage } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');

  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchTerm);
  };

  const handleClear = () => {
    setSearchTerm('');
    setActiveQuery('');
    setStatusFilter('ALL');
  };

  const activeCustomers = customers.filter((c) => !c.isDeleted);

  const filteredCustomers = activeCustomers.filter((c) => {
    const query = (activeQuery || searchTerm).toLowerCase().trim();
    const matchesSearch =
      !query ||
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      c.id.toLowerCase().includes(query) ||
      (c.idNumber && c.idNumber.toLowerCase().includes(query)) ||
      (c.occupation && c.occupation.toLowerCase().includes(query));
    const matchesFilter = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="page-content">
      {/* PAGE HEADER */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)' }}>
          Search Customers
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
          Find and manage registered borrower records.
        </p>
      </div>

      {/* LARGE SEARCH BAR CARD */}
      <div
        className="card"
        style={{
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid var(--border-light, #e2e8f0)',
          borderRadius: 'var(--radius-lg, 12px)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary-dark)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            SEARCH BORROWER RECORDS
          </label>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
              <input
                type="text"
                className="input-control"
                style={{
                  height: '46px',
                  paddingLeft: '44px',
                  paddingRight: '16px',
                  fontSize: '14px',
                  borderRadius: 'var(--radius-md, 8px)'
                }}
                placeholder="Search by customer name, phone number, customer ID or ID proof..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search
                size={20}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none'
                }}
              />
            </div>

            <select
              className="select-control"
              style={{ width: '170px', height: '46px', fontSize: '13.5px', borderRadius: 'var(--radius-md, 8px)' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All Statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING">Pending KYC</option>
            </select>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ height: '46px', padding: '0 24px', fontSize: '14px', fontWeight: 700, gap: '8px' }}
            >
              <Search size={16} />
              <span>Search</span>
            </button>

            {(searchTerm || activeQuery || statusFilter !== 'ALL') && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '46px', padding: '0 18px' }}
                onClick={handleClear}
              >
                <RotateCcw size={15} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* SEARCH RESULTS TABLE CARD */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-surface-secondary, #f8fafc)'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)' }}>
              Search Results
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Found {filteredCustomers.length} matching borrower profiles
            </span>
          </div>

          <span className="badge badge-info" style={{ fontSize: '12px' }}>
            Total Customers: {activeCustomers.length}
          </span>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>PROFILE PHOTO / AVATAR</th>
                <th>PHONE</th>
                <th>GENDER</th>
                <th>OCCUPATION</th>
                <th>ID PROOF</th>
                <th>LOANS</th>
                <th style={{ textAlign: 'center', width: '140px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No borrower records found matching your search query.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const loanCount = loans.filter((l) => l.customerId === c.id || (c.customerId && l.customerId === c.customerId.toString())).length;
                  return (
                    <tr key={`search-cust-${c.id}`}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {c.customerPhoto ? (
                            <img
                              src={c.customerPhoto}
                              alt={c.name}
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1.5px solid var(--color-primary-accent, #059669)',
                                flexShrink: 0
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-light-accent, #e6f4f1)',
                                color: 'var(--color-primary-dark, #163f35)',
                                fontWeight: 700,
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{c.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.id}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>+91 {c.phone}</td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: '11px' }}>
                          {c.gender}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{c.occupation || 'Self Employed'}</td>
                      <td>
                        <div style={{ fontSize: '12px' }}>
                          <strong style={{ color: 'var(--color-primary-dark)' }}>{c.idProof}:</strong>{' '}
                          <span>{formatIdProofDisplay(c.idProof, c.idNumber)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-success">
                          {loanCount} {loanCount === 1 ? 'LOAN' : 'LOANS'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ height: '30px', padding: '0 8px', fontSize: '11.5px', gap: '4px' }}
                            title="View Customer Profile"
                            onClick={() => {
                              setSelectedProfileCustomerId(c.id);
                              setCurrentPage('customer-profile');
                            }}
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ height: '30px', padding: '0 8px', fontSize: '11.5px', gap: '4px' }}
                            title="Edit Customer"
                            onClick={() => setEditingCustomer(c)}
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
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
      </div>

      {/* View Customer Modal */}
      <ViewCustomerModal
        isOpen={!!viewingCustomer}
        customer={viewingCustomer}
        onClose={() => setViewingCustomer(null)}
        onEdit={(cust) => setEditingCustomer(cust)}
      />

      {/* Edit Customer Modal */}
      <EditCustomerModal
        isOpen={!!editingCustomer}
        customer={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onSave={(id, updates) => {
          updateCustomer(id, updates);
        }}
      />
    </div>
  );
};
