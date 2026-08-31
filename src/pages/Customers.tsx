import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserPlus, RotateCcw, Edit3, Trash2, ShieldCheck } from 'lucide-react';
import { SearchInput } from '../components/common/SearchInput';
import { EditCustomerModal } from '../components/common/EditCustomerModal';
import { IDProofInputFields } from '../components/common/IDProofInputFields';
import { Customer } from '../types';
import {
  validatePhone,
  validateIDProof,
  formatPhoneInput,
  formatIdProofDisplay
} from '../utils/kycValidation';

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
  const [phoneError, setPhoneError] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);

  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [age, setAge] = useState<number>(30);
  const [occupation, setOccupation] = useState('');
  const [email, setEmail] = useState('');

  const [idProof, setIdProof] = useState('Aadhaar');
  const [idNumber, setIdNumber] = useState('');
  const [extraPan, setExtraPan] = useState('');
  const [docName, setDocName] = useState('');
  const [idProofValid, setIdProofValid] = useState(false);

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

  const handlePhoneChange = (val: string) => {
    const formatted = formatPhoneInput(val);
    setPhone(formatted);
    setPhoneTouched(true);
    const res = validatePhone(formatted);
    setPhoneError(res.isValid ? '' : (res.error || ''));
  };

  const handleIdProofChange = (payload: {
    idProof: string;
    idNumber: string;
    extraPan?: string;
    docName?: string;
    isValid: boolean;
    error?: string;
    structured?: any;
  }) => {
    setIdProof(payload.idProof);
    setIdNumber(payload.idNumber);
    setExtraPan(payload.extraPan || '');
    setDocName(payload.docName || '');
    setIdProofValid(payload.isValid);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();

    setPhoneTouched(true);

    const phoneRes = validatePhone(phone);
    const idRes = validateIDProof(idProof, idNumber, extraPan, docName);

    setPhoneError(phoneRes.isValid ? '' : (phoneRes.error || ''));

    if (!name.trim()) {
      showToast('Please enter customer full name.', 'error');
      return;
    }

    if (!phoneRes.isValid) {
      showToast(phoneRes.error || 'Please enter a valid 10-digit Indian mobile number.', 'error');
      return;
    }

    if (!idRes.isValid) {
      showToast(idRes.error || 'Please enter a valid ID proof number.', 'error');
      return;
    }

    if (!currentAddress.trim()) {
      showToast('Please enter customer current address.', 'error');
      return;
    }

    addCustomer({
      name: name.trim(),
      phone: phoneRes.normalizedValue || phone.trim(),
      gender,
      age: Number(age),
      occupation: occupation.trim() || 'Self Employed',
      email: email.trim(),
      currentAddress: currentAddress.trim(),
      permanentAddress: sameAddress ? currentAddress.trim() : permanentAddress.trim(),
      idProof,
      idNumber: idRes.formattedValue || idNumber.trim(),
      status: 'VERIFIED'
    });

    showToast('Borrower KYC Profile created and verified successfully!', 'success');

    // Reset Form
    setName('');
    setPhone('');
    setPhoneError('');
    setPhoneTouched(false);
    setGender('Male');
    setAge(30);
    setOccupation('');
    setEmail('');
    setIdProof('Aadhaar');
    setIdNumber('');
    setExtraPan('');
    setDocName('');
    setIdProofValid(false);
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
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>+91 {c.phone}</td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '11px' }}>
                        {c.gender}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{c.occupation}</td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        <strong style={{ color: 'var(--color-primary-dark)' }}>{c.idProof}:</strong>{' '}
                        <span>{formatIdProofDisplay(c.idProof, c.idNumber)}</span>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        padding: '0 10px',
                        height: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        background: 'var(--bg-surface-secondary, #f1f5f9)',
                        border: '1px solid var(--border-light, #cbd5e1)',
                        borderRadius: 'var(--radius-md, 6px)',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--text-secondary)'
                      }}
                    >
                      +91
                    </span>
                    <input
                      type="text"
                      className="input-control"
                      style={{
                        flex: 1,
                        borderColor: phoneTouched && phoneError ? 'var(--color-danger, #ef4444)' : undefined
                      }}
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onBlur={() => {
                        setPhoneTouched(true);
                        const res = validatePhone(phone);
                        setPhoneError(res.isValid ? '' : (res.error || ''));
                      }}
                    />
                  </div>
                  {phoneTouched && phoneError && (
                    <small style={{ color: 'var(--color-danger, #ef4444)', fontSize: '11px', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                      {phoneError}
                    </small>
                  )}
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
              </div>

              {/* Dynamic ID Proof System */}
              <IDProofInputFields
                idProof={idProof}
                idNumber={idNumber}
                extraPan={extraPan}
                docName={docName}
                onChange={handleIdProofChange}
              />

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
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!!phoneError || !idProofValid}
                  style={{ opacity: (phoneError || !idProofValid) ? 0.65 : 1, gap: '6px' }}
                >
                  <ShieldCheck size={16} />
                  <span>Save Customer &amp; Verify KYC</span>
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
              gap: '16px',
              boxShadow: 'var(--shadow-xl)'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)' }}>
              Confirm Customer Deletion
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Are you sure you want to delete borrower profile <strong>{deletingCustomer.name}</strong> ({deletingCustomer.id})? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setDeletingCustomer(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleConfirmDelete}>
                Delete Borrower Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
