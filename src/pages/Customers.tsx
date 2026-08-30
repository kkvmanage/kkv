import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserPlus, RotateCcw, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { SearchInput } from '../components/common/SearchInput';
import { EditCustomerModal } from '../components/common/EditCustomerModal';
import { Customer } from '../types';

export const Customers: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, showToast } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');

  // Form State for Add Customer
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [age, setAge] = useState<number>(30);
  const [occupation, setOccupation] = useState('');
  const [email, setEmail] = useState('');
  const [idProof, setIdProof] = useState('Aadhaar Card');
  const [idNumber, setIdNumber] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [sameAddress, setSameAddress] = useState(true);

  const filteredCustomers = customers.filter((c) => {
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !query ||
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      c.id.toLowerCase().includes(query) ||
      c.idNumber.toLowerCase().includes(query) ||
      c.occupation.toLowerCase().includes(query);
    const matchesFilter = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const handleClear = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showToast('Please enter customer full name and phone number.', 'error');
      return;
    }

    addCustomer({
      name: name.trim(),
      phone: phone.trim(),
      gender,
      age: Number(age),
      occupation: occupation.trim() || 'Self Employed',
      email: email.trim(),
      currentAddress: currentAddress.trim(),
      permanentAddress: sameAddress ? currentAddress.trim() : permanentAddress.trim(),
      idProof,
      idNumber: idNumber.trim() || 'DOC-VERIFIED',
      status: 'VERIFIED'
    });

    // Reset Form
    setName('');
    setPhone('');
    setGender('Male');
    setAge(30);
    setOccupation('');
    setEmail('');
    setIdNumber('');
    setCurrentAddress('');
    setPermanentAddress('');
    setShowAddModal(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingCustomer) return;
    const success = deleteCustomer(deletingCustomer.id);
    if (success) {
      setDeletingCustomer(null);
    }
  };

  return (
    <div className="page-content">
      {/* Toolbar Card */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          {/* Left: Add Customer Button */}
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={16} />
            <span>Add Customer</span>
          </button>

          {/* Center Search & Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '600px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search name, phone, ID..."
              />
            </div>

            <select
              className="select-control"
              style={{ width: '150px', height: '38px', fontSize: '13px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All customers</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING">Pending KYC</option>
            </select>

            <button className="btn btn-secondary btn-sm" style={{ height: '38px' }} onClick={handleClear}>
              <RotateCcw size={14} />
              <span>Clear</span>
            </button>
          </div>

          {/* Right Side: Total Count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Total: <strong style={{ color: 'var(--color-primary-dark)', fontSize: '14px' }}>{customers.length} Customers</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Customers Table Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Customers</h2>
            <p className="card-description">Registered borrowers with KYC verification status and active loans</p>
          </div>
          <span className="badge badge-success">KYC Verified Base</span>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>CUSTOMER</th>
                <th>PHONE</th>
                <th>GENDER</th>
                <th>OCCUPATION</th>
                <th>ID PROOF</th>
                <th>LOANS</th>
                <th style={{ textAlign: 'center', width: '100px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No customers found matching the search criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-light-accent)',
                            color: 'var(--color-primary-dark)',
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
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{c.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.id}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.phone}</td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '11px' }}>
                        {c.gender}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{c.occupation}</td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        <strong style={{ color: 'var(--color-primary-dark)' }}>{c.idProof}:</strong> {c.idNumber}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-success">
                        {c.activeLoansCount} Loans
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="icon-button"
                          style={{ width: '28px', height: '28px' }}
                          title="Edit Customer"
                          onClick={() => setEditingCustomer(c)}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          className="icon-button"
                          style={{ width: '28px', height: '28px', color: 'var(--badge-danger-text)' }}
                          title="Delete Customer"
                          onClick={() => setDeletingCustomer(c)}
                        >
                          <Trash2 size={13} />
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

      {/* Add Customer KYC Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(22, 63, 53, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}
          >
            <div className="card-header">
              <div>
                <h3 className="card-title">Add New Borrower KYC Profile</h3>
                <p className="card-description">Create verified customer record for loan disbursement</p>
              </div>
              <button className="icon-button" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label required">Customer Full Name</label>
                  <input
                    type="text"
                    className="input-control"
                    required
                    placeholder="e.g. S. Meenakshi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Phone Number</label>
                  <input
                    type="text"
                    className="input-control"
                    required
                    placeholder="+91 98401 XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label required">Gender</label>
                  <select
                    className="select-control"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    className="input-control"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Occupation</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="e.g. Trader, Govt"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Email (Optional)</label>
                  <input
                    type="email"
                    className="input-control"
                    placeholder="customer@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">ID Proof Type</label>
                  <select
                    className="select-control"
                    value={idProof}
                    onChange={(e) => setIdProof(e.target.value)}
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label required">ID Proof Number</label>
                <input
                  type="text"
                  className="input-control"
                  required
                  placeholder="e.g. XXXX-XXXX-1234"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Current Address</label>
                <textarea
                  className="textarea-control"
                  style={{ minHeight: '60px' }}
                  required
                  placeholder="Door no, Street, Locality, City, Pincode"
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                  <input
                    type="checkbox"
                    checked={sameAddress}
                    onChange={(e) => setSameAddress(e.target.checked)}
                    style={{ accentColor: 'var(--color-primary-accent)', width: '16px', height: '16px' }}
                  />
                  <span>Permanent address same as current address</span>
                </label>
              </div>

              {!sameAddress && (
                <div className="form-group">
                  <label className="form-label">Permanent Address</label>
                  <textarea
                    className="textarea-control"
                    style={{ minHeight: '60px' }}
                    placeholder="Permanent residential address"
                    value={permanentAddress}
                    onChange={(e) => setPermanentAddress(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Customer &amp; Verify KYC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      <EditCustomerModal
        isOpen={!!editingCustomer}
        customer={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onSave={(id, updates) => updateCustomer(id, updates)}
      />

      {/* Delete Customer Confirmation Modal */}
      {deletingCustomer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '440px',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)' }}>
                  Delete Customer Record?
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                  ID: <strong>{deletingCustomer.id}</strong>
                </p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-dark)', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete customer <strong>{deletingCustomer.name}</strong>? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingCustomer(null)}
                style={{ height: '38px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmDelete}
                style={{
                  height: '38px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  padding: '0 16px',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
