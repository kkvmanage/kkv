import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { OrnamentItem, Loan } from '../types';
import {
  Plus,
  Trash2,
  Camera,
  MapPin,
  Check,
  Search,
  ArrowRight
} from 'lucide-react';

export const LoanIssue: React.FC = () => {
  const { customers, loans, receipts, addLoan, topUpLoan, setCurrentPage, showToast } = useApp();

  // Active Top Tab: 'issue' | 'topup'
  const [activeTab, setActiveTab] = useState<'issue' | 'topup'>('issue');

  // Identification
  const nextReceiptNo = receipts.length > 0 ? Math.max(...receipts.map(r => r.receiptNo)) + 1 : 1;
  const [receiptBillNo] = useState<number>(nextReceiptNo);
  const [loanIssueDate] = useState<string>(
    new Date().toLocaleDateString('en-GB')
  );

  // Configuration
  const [loanType] = useState<'GOLD LOAN' | 'SILVER LOAN' | 'PRONOTE' | 'HIRE PURCHASE'>('GOLD LOAN');
  const [repaymentSystem] = useState<'Monthly interest only' | 'EMI' | 'Bullet Repayment'>('Monthly interest only');
  const [area] = useState<string>('T. Nagar Central');
  const [showroom] = useState<string>('Main Branch - Counter 1');

  // Customer Search & KYC
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dobMode, setDobMode] = useState<'age' | 'dob'>('age');
  const [age, setAge] = useState<number>(30);
  const [dob, setDob] = useState<string>('');
  const [occupation, setOccupation] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [idProof, setIdProof] = useState<string>('Aadhaar Card');
  const [idNumber, setIdNumber] = useState<string>('');
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [permanentAddress, setPermanentAddress] = useState<string>('');
  const [sameAddress, setSameAddress] = useState<boolean>(true);
  const [photoCaptured, setPhotoCaptured] = useState<boolean>(false);

  // Location
  const [locationCaptured, setLocationCaptured] = useState<boolean>(false);
  const [mapsLink, setMapsLink] = useState<string>('');

  // Nominee & Guarantor Collapsibles
  const [hasNominee, setHasNominee] = useState<boolean>(false);
  const [nomineeName, setNomineeName] = useState<string>('');
  const [nomineeRelation, setNomineeRelation] = useState<string>('');
  const [nomineePhone, setNomineePhone] = useState<string>('');
  const [nomineeAddress] = useState<string>('');

  const [hasGuarantor, setHasGuarantor] = useState<boolean>(false);
  const [guarantorName, setGuarantorName] = useState<string>('');
  const [guarantorPhone, setGuarantorPhone] = useState<string>('');
  const [guarantorIdProof, setGuarantorIdProof] = useState<string>('');
  const [guarantorAddress] = useState<string>('');

  // Financial details
  const [principal, setPrincipal] = useState<number>(100000);
  const [interestRate, setInterestRate] = useState<number>(1.5);
  const [bankMode, setBankMode] = useState<'UPI' | 'Cash' | 'Bank Transfer' | 'Split'>('Cash');

  // Advance interest
  const [deductAdvanceInterest, setDeductAdvanceInterest] = useState<boolean>(false);
  const [advanceDays] = useState<number>(30);

  // Card fee
  const [cardFeeEnabled, setCardFeeEnabled] = useState<boolean>(true);
  const [cardFee] = useState<number>(10);
  const [cardFeeMode, setCardFeeMode] = useState<'Cash' | 'Bank'>('Cash');

  // Ornament Items
  const [items, setItems] = useState<OrnamentItem[]>([
    {
      id: 'item-1',
      item: 'Gold Chain with Pendant',
      qty: 1,
      purity: '22ct',
      grossWeight: 24.5,
      netWeight: 23.2
    }
  ]);
  const [notes] = useState<string>('');
  const [photos] = useState<string[]>([]);

  // TOP UP TAB STATE
  const [topUpSearch, setTopUpSearch] = useState<string>('');
  const [selectedTopUpLoan, setSelectedTopUpLoan] = useState<Loan | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(20000);
  const [topUpDate, setTopUpDate] = useState<string>(new Date().toLocaleDateString('en-GB'));
  const [topUpNotes, setTopUpNotes] = useState<string>('');

  const goldRatePerGram22ct = 6400;

  // Auto Calculations
  const totalGrossWeight = items.reduce((sum, item) => sum + (Number(item.grossWeight) || 0), 0);
  const totalNetWeight = items.reduce((sum, item) => sum + (Number(item.netWeight) || 0), 0);
  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const marketValue = Math.round(totalNetWeight * goldRatePerGram22ct);
  const ltv = marketValue > 0 ? ((principal / marketValue) * 100).toFixed(2) : '0.00';
  const monthlyInterest = Math.round((principal * interestRate) / 100);
  const advanceInterestAmount = deductAdvanceInterest
    ? Math.round((monthlyInterest / 30) * advanceDays)
    : 0;

  // Search & fill customer
  const filteredCustomers = customerSearch.trim()
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone.includes(customerSearch)
      )
    : [];

  const handleSelectCustomer = (cust: typeof customers[0]) => {
    setSelectedCustomerId(cust.id);
    setName(cust.name);
    setPhone(cust.phone);
    setGender(cust.gender);
    setAge(cust.age || 32);
    setOccupation(cust.occupation);
    setEmail(cust.email || '');
    setIdProof(cust.idProof);
    setIdNumber(cust.idNumber);
    setCurrentAddress(cust.currentAddress);
    setPermanentAddress(cust.permanentAddress);
    setSameAddress(cust.currentAddress === cust.permanentAddress);
    setPhotoCaptured(true);
    setCustomerSearch('');
    showToast(`Loaded KYC details for ${cust.name}`, 'info');
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        item: '',
        qty: 1,
        purity: '22ct',
        grossWeight: 0,
        netWeight: 0
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      showToast('At least one ornament item is required.', 'warning');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof OrnamentItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'grossWeight' && (item.netWeight === 0 || item.netWeight === item.grossWeight)) {
            updated.netWeight = Number(value) || 0;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleUseMapsLink = () => {
    if (!mapsLink.trim()) {
      showToast('Please enter or paste a valid Maps link or coordinates.', 'warning');
      return;
    }
    setLocationCaptured(true);
    showToast('Location coordinates pinned successfully!', 'success');
  };

  const handleCaptureGPS = () => {
    setMapsLink('11.3410, 77.7172');
    setLocationCaptured(true);
    showToast('Current GPS coordinates captured: 11.3410° N, 77.7172° E', 'success');
  };

  const handleSubmitIssue = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim()) {
      showToast('Please provide borrower full name and phone number.', 'error');
      return;
    }

    if (!principal || principal <= 0) {
      showToast('Please enter a valid loan principal amount.', 'error');
      return;
    }

    if (totalNetWeight <= 0) {
      showToast('Please specify ornament net weight.', 'error');
      return;
    }

    addLoan({
      receiptBillNo,
      customerId: selectedCustomerId || `CUST-${Date.now().toString().slice(-3)}`,
      customerName: name,
      customerPhone: phone,
      customerGender: gender,
      customerAge: age,
      customerOccupation: occupation || 'Self Employed',
      customerEmail: email,
      customerCurrentAddress: currentAddress,
      customerPermanentAddress: sameAddress ? currentAddress : permanentAddress,
      customerLocation: locationCaptured
        ? {
            captured: true,
            coordinates: '11.3410, 77.7172',
            mapsUrl: mapsLink || 'https://maps.google.com/?q=11.3410,77.7172',
            addressSummary: currentAddress
          }
        : undefined,
      nominee: hasNominee
        ? {
            hasNominee: true,
            name: nomineeName,
            relationship: nomineeRelation,
            phone: nomineePhone,
            address: nomineeAddress
          }
        : undefined,
      guarantor: hasGuarantor
        ? {
            hasGuarantor: true,
            name: guarantorName,
            phone: guarantorPhone,
            idProof: guarantorIdProof,
            address: guarantorAddress
          }
        : undefined,
      date: loanIssueDate,
      loanType,
      repaymentSystem,
      area,
      showroom,
      principal,
      interestRate,
      bankMode,
      cashAmount: bankMode === 'Cash' ? principal : 0,
      bankAmount: bankMode === 'Bank Transfer' || bankMode === 'UPI' ? principal : 0,
      deductAdvanceInterest,
      advanceDays,
      advanceInterestAmount,
      cardFee: cardFeeEnabled ? cardFee : 0,
      cardFeePaymentMode: cardFeeMode,
      items,
      totalGrossWeight,
      totalNetWeight,
      marketValue,
      ltv: Number(ltv),
      monthlyInterest,
      notes,
      photos,
      status: 'ACTIVE',
      disbursedAmount: principal - advanceInterestAmount,
      outstandingPrincipal: principal,
      accruedInterest: 0,
      renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')
    });

    setCurrentPage('all-receipts');
  };

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopUpLoan) {
      showToast('Please search and select an active loan for top-up.', 'error');
      return;
    }
    if (!topUpAmount || topUpAmount <= 0) {
      showToast('Please enter a valid top-up amount.', 'error');
      return;
    }
    const success = topUpLoan(selectedTopUpLoan.loanNo, topUpAmount, topUpDate, topUpNotes);
    if (success) {
      setCurrentPage('all-receipts');
    }
  };

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Tab Bar: Issue New Loan | Loan Top-up */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '2px' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'issue' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0', padding: '10px 20px', fontWeight: 700 }}
          onClick={() => setActiveTab('issue')}
        >
          Issue New Loan
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'topup' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0', padding: '10px 20px', fontWeight: 700 }}
          onClick={() => setActiveTab('topup')}
        >
          Loan Top-up
        </button>
      </div>

      {activeTab === 'topup' ? (
        /* LOAN TOP-UP SECTION */
        <div className="card" style={{ padding: '24px' }}>
          <div className="card-header" style={{ marginBottom: '20px' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 800 }}>Loan Top-up</h2>
              <p className="card-description">Add extra money to a running loan — same loan number, same pledge, one due date</p>
            </div>
          </div>

          <form onSubmit={handleTopUpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="grid-2">
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label required">RECEIPT / BILL NO</label>
                  <span className="badge badge-success" style={{ fontSize: '11px' }}>✓ Available</span>
                </div>
                <input type="text" className="input-control readonly" readOnly value={receiptBillNo} />
              </div>

              <div className="form-group">
                <label className="form-label required">TOP-UP DATE</label>
                <input
                  type="text"
                  className="input-control"
                  value={topUpDate}
                  onChange={(e) => setTopUpDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">FIND THE LOAN</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Type loan no (GL-000) or customer name..."
                  value={topUpSearch}
                  onChange={(e) => {
                    setTopUpSearch(e.target.value);
                    const found = loans.find(l => l.loanNo.toLowerCase() === e.target.value.toLowerCase() || l.customerName.toLowerCase().includes(e.target.value.toLowerCase()));
                    if (found) setSelectedTopUpLoan(found);
                  }}
                />
                <Search size={16} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Quick Select Loan Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {loans.slice(0, 5).map(l => (
                <button
                  key={l.id}
                  type="button"
                  className={`badge ${selectedTopUpLoan?.id === l.id ? 'badge-success' : 'badge-info'}`}
                  style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '12px' }}
                  onClick={() => {
                    setSelectedTopUpLoan(l);
                    setTopUpSearch(l.loanNo);
                  }}
                >
                  {l.loanNo} - {l.customerName} (₹{l.outstandingPrincipal.toLocaleString('en-IN')})
                </button>
              ))}
            </div>

            {selectedTopUpLoan && (
              <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary-dark)' }}>Selected Loan: {selectedTopUpLoan.loanNo} ({selectedTopUpLoan.customerName})</h4>
                <div className="grid-3" style={{ fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Current Principal: </span>
                    <strong>₹{selectedTopUpLoan.principal.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Interest Rate: </span>
                    <strong>{selectedTopUpLoan.interestRate}% / mo</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Current Monthly Interest: </span>
                    <strong>₹{selectedTopUpLoan.monthlyInterest.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <div className="grid-2" style={{ marginTop: '8px' }}>
                  <div className="form-group">
                    <label className="form-label required">TOP-UP PRINCIPAL AMOUNT (₹)</label>
                    <input
                      type="number"
                      className="input-control"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(Number(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">REMARKS / NOTES</label>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="Optional top-up reason..."
                      value={topUpNotes}
                      onChange={(e) => setTopUpNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--color-light-accent)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>New Total Principal: </span>
                    <strong style={{ fontSize: '16px', color: 'var(--color-primary-dark)' }}>₹{(selectedTopUpLoan.principal + topUpAmount).toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>New Monthly Interest: </span>
                    <strong style={{ fontSize: '16px', color: 'var(--color-primary-dark)' }}>₹{Math.round(((selectedTopUpLoan.principal + topUpAmount) * selectedTopUpLoan.interestRate) / 100).toLocaleString('en-IN')} / mo</strong>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 700, alignSelf: 'flex-start', gap: '8px' }}>
              <span>Process Top-Up &amp; Generate Receipt</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      ) : (
        /* ISSUE NEW LOAN FORM */
        <form onSubmit={handleSubmitIssue} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Customer Search & KYC Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3 className="card-title" style={{ fontSize: '16px', fontWeight: 700 }}>Customer / KYC Details</h3>
            </div>

            {/* Quick Customer Search input */}
            <div className="form-group" style={{ marginBottom: '16px', position: 'relative' }}>
              <label className="form-label">SEARCH EXISTING CUSTOMER</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Type customer name or phone number..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                <Search size={16} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-muted)' }} />
              </div>
              {filteredCustomers.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', zIndex: 50, boxShadow: 'var(--shadow-md)', maxHeight: '180px', overflowY: 'auto' }}>
                  {filteredCustomers.map((c) => (
                    <div
                      key={c.id}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between' }}
                      onClick={() => handleSelectCustomer(c)}
                    >
                      <strong>{c.name} ({c.phone})</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.currentAddress}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="loan-issue-customer-grid">
              {/* Photo Box */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '140px', height: '160px', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-surface-subtle)', color: 'var(--text-muted)', fontSize: '12px' }}>
                  {photoCaptured ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-primary-dark)' }}>
                      <Check size={32} />
                      <p style={{ fontWeight: 700, marginTop: '4px' }}>Photo Attached</p>
                    </div>
                  ) : (
                    <>
                      <Camera size={28} />
                      <span style={{ marginTop: '6px' }}>No Photo</span>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setPhotoCaptured(true); showToast('Webcam photo captured', 'info'); }}>Webcam</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setPhotoCaptured(true); showToast('Photo uploaded', 'info'); }}>UPLOAD</button>
                </div>
              </div>

              {/* Middle Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label required">FULL NAME</label>
                  <input type="text" className="input-control" placeholder="e.g. Ramesh Kumar" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label required">GENDER</label>
                  <select className="input-control" value={gender} onChange={(e) => setGender(e.target.value as any)}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">OCCUPATION / WORK</label>
                  <input type="text" className="input-control" placeholder="e.g. Farmer, Business" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">ID PROOF TYPE</label>
                  <select className="input-control" value={idProof} onChange={(e) => setIdProof(e.target.value)}>
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Driving License">Driving License</option>
                  </select>
                </div>
              </div>

              {/* Right Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label required">PHONE</label>
                  <input type="text" className="input-control" placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">AGE / DATE OF BIRTH</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button type="button" className={`btn btn-sm ${dobMode === 'dob' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => setDobMode('dob')}>DOB</button>
                      <button type="button" className={`btn btn-sm ${dobMode === 'age' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => setDobMode('age')}>AGE</button>
                    </div>
                  </div>
                  {dobMode === 'dob' ? (
                    <input type="text" className="input-control" placeholder="dd-mm-yyyy" value={dob} onChange={(e) => setDob(e.target.value)} />
                  ) : (
                    <input type="number" className="input-control" value={age} onChange={(e) => setAge(Number(e.target.value))} />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">EMAIL</label>
                  <input type="email" className="input-control" placeholder="customer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">ID NUMBER</label>
                  <input type="text" className="input-control" placeholder="Id Proof Number" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="grid-2" style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label required">CURRENT ADDRESS</label>
                <textarea className="input-control" rows={2} placeholder="Full current address" value={currentAddress} onChange={(e) => setCurrentAddress(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">PERMANENT ADDRESS</label>
                <textarea className="input-control" rows={2} placeholder="If same as current address, leave blank" value={sameAddress ? currentAddress : permanentAddress} onChange={(e) => { setSameAddress(false); setPermanentAddress(e.target.value); }} />
              </div>
            </div>

            {/* Customer Location */}
            <div style={{ marginTop: '16px', padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CUSTOMER LOCATION (FOR VISITS &amp; COLLECTION)</span>
              <div className="location-capture-row">
                <button type="button" className="btn btn-secondary" style={{ gap: '6px' }} onClick={handleCaptureGPS}>
                  <MapPin size={15} color="#EF4444" />
                  <span>Capture Current Location</span>
                </button>
                <input
                  type="text"
                  className="input-control"
                  style={{ flex: 1 }}
                  placeholder="..or paste a Maps link / 11.3410, 77.7172"
                  value={mapsLink}
                  onChange={(e) => setMapsLink(e.target.value)}
                />
                <button type="button" className="btn btn-primary" onClick={handleUseMapsLink}>Use link</button>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Press Capture while you are AT the customer's place — It saves where this phone is right now. Any Google Maps link works too.
              </p>
            </div>

            {/* Nominee & Guarantor Collapsibles */}
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                <input type="checkbox" checked={hasNominee} onChange={(e) => setHasNominee(e.target.checked)} />
                <span>DO YOU HAVE A NOMINEE?</span>
              </label>

              {hasNominee && (
                <div className="grid-3" style={{ padding: '12px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <input type="text" className="input-control" placeholder="Nominee Name" value={nomineeName} onChange={(e) => setNomineeName(e.target.value)} />
                  <input type="text" className="input-control" placeholder="Relationship" value={nomineeRelation} onChange={(e) => setNomineeRelation(e.target.value)} />
                  <input type="text" className="input-control" placeholder="Phone" value={nomineePhone} onChange={(e) => setNomineePhone(e.target.value)} />
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                <input type="checkbox" checked={hasGuarantor} onChange={(e) => setHasGuarantor(e.target.checked)} />
                <span>DO YOU HAVE A GUARANTOR?</span>
              </label>

              {hasGuarantor && (
                <div className="grid-3" style={{ padding: '12px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <input type="text" className="input-control" placeholder="Guarantor Name" value={guarantorName} onChange={(e) => setGuarantorName(e.target.value)} />
                  <input type="text" className="input-control" placeholder="Phone" value={guarantorPhone} onChange={(e) => setGuarantorPhone(e.target.value)} />
                  <input type="text" className="input-control" placeholder="Id Proof" value={guarantorIdProof} onChange={(e) => setGuarantorIdProof(e.target.value)} />
                </div>
              )}
            </div>
          </div>

          {/* Financial & Terms Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3 className="card-title" style={{ fontSize: '16px', fontWeight: 700 }}>Loan Terms &amp; Financials</h3>
            </div>

            <div className="grid-2" style={{ gap: '16px' }}>
              <div className="form-group">
                <label className="form-label required">PRINCIPAL (INR)</label>
                <input type="number" className="input-control" value={principal} onChange={(e) => setPrincipal(Number(e.target.value) || 0)} />
              </div>

              <div className="form-group">
                <label className="form-label required">DISBURSEMENT METHOD</label>
                <select className="input-control" value={bankMode} onChange={(e) => setBankMode(e.target.value as any)}>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Split">Split (Cash + Bank)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">INTEREST RATE (% per month)</label>
                <input type="number" step="0.1" className="input-control" value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value) || 0)} />
              </div>

              <div className="form-group" style={{ justifyContent: 'center' }}>
                {/* Advance Interest Checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginTop: '24px' }}>
                  <input type="checkbox" checked={deductAdvanceInterest} onChange={(e) => setDeductAdvanceInterest(e.target.checked)} />
                  <span>DEDUCT ADVANCE INTEREST AT DISBURSEMENT</span>
                </label>
              </div>
            </div>

            {/* Card Fee Badge Pill Checkbox */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', backgroundColor: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', fontSize: '13px', fontWeight: 700 }}
              >
                <input type="checkbox" checked={cardFeeEnabled} onChange={(e) => setCardFeeEnabled(e.target.checked)} />
                <span>Card Fee</span>
                <span>|</span>
                <span>₹ {cardFee}</span>
                <select
                  value={cardFeeMode}
                  onChange={(e) => setCardFeeMode(e.target.value as any)}
                  style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 700, cursor: 'pointer' }}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>
            </div>
          </div>

          {/* Gold Ornaments Table Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3 className="card-title" style={{ fontSize: '16px', fontWeight: 700 }}>Gold Ornament Details</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddItem}>
                <Plus size={14} />
                <span>+ Add Item</span>
              </button>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>ITEM</th>
                    <th style={{ width: '80px' }}>QTY</th>
                    <th style={{ width: '110px' }}>PURITY</th>
                    <th style={{ width: '130px' }}>GROSS WT (G)</th>
                    <th style={{ width: '130px' }}>NET WT (G)</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <input
                          type="text"
                          className="input-control"
                          placeholder="e.g. Ring, Chain, Earring"
                          value={item.item}
                          onChange={(e) => handleItemChange(item.id, 'item', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="input-control"
                          value={item.qty}
                          onChange={(e) => handleItemChange(item.id, 'qty', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <select
                          className="input-control"
                          value={item.purity}
                          onChange={(e) => handleItemChange(item.id, 'purity', e.target.value)}
                        >
                          <option value="22ct">22ct</option>
                          <option value="24ct">24ct</option>
                          <option value="18ct">18ct</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="input-control"
                          value={item.grossWeight}
                          onChange={(e) => handleItemChange(item.id, 'grossWeight', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          className="input-control"
                          value={item.netWeight}
                          onChange={(e) => handleItemChange(item.id, 'netWeight', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <button type="button" style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }} onClick={() => handleRemoveItem(item.id)}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* TOTALS Row */}
                  <tr style={{ fontWeight: 700, backgroundColor: 'var(--bg-surface-subtle)' }}>
                    <td colSpan={2}>TOTALS</td>
                    <td>{totalQty}</td>
                    <td>-</td>
                    <td>{totalGrossWeight.toFixed(3)} g</td>
                    <td>{totalNetWeight.toFixed(3)} g</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Calculations Row */}
            <div className="grid-3" style={{ marginTop: '16px' }}>
              <div>
                <label className="form-label">TOTAL WEIGHT (G)</label>
                <input type="text" className="input-control readonly" readOnly value={`${totalNetWeight.toFixed(3)} g`} />
              </div>
              <div>
                <label className="form-label">MARKET VALUE (₹)</label>
                <input type="text" className="input-control readonly" readOnly value={`Estimated ₹${marketValue.toLocaleString('en-IN')}`} />
              </div>
              <div>
                <label className="form-label">LTV %</label>
                <input type="text" className="input-control readonly" readOnly value={`${ltv}%`} />
              </div>
            </div>

            {/* MONTHLY INTEREST Highlight Box */}
            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MONTHLY INTEREST</span>
              <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-primary-dark)', margin: '4px 0' }}>
                ₹{monthlyInterest.toLocaleString('en-IN')} / month
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {interestRate}%/month (30-day cycle) on ₹{principal.toLocaleString('en-IN')} = ₹{monthlyInterest.toLocaleString('en-IN')}/mo (interest only). Penalty after 3 months
              </p>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 700 }}>
                Issue Loan &amp; Generate Receipt
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => showToast('Form cleared', 'info')}>
                Clear Form
              </button>
            </div>
          </div>

          {/* Recent Loans Section */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '14px' }}>
              <div>
                <h3 className="card-title">Recent Loans</h3>
                <p className="card-description">Last 10 issued. See Total Loans for the full list.</p>
              </div>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>LOAN #</th>
                    <th>TYPE</th>
                    <th>CUSTOMER</th>
                    <th>PRINCIPAL</th>
                    <th>RATE</th>
                    <th>NEXT DUE</th>
                    <th>OUTSTANDING</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.slice(0, 5).map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{l.loanNo}</td>
                      <td>{l.loanType}</td>
                      <td style={{ fontWeight: 600 }}>{l.customerName}</td>
                      <td style={{ fontWeight: 700 }}>₹{l.principal.toLocaleString('en-IN')}</td>
                      <td>{l.interestRate}%</td>
                      <td>{l.nextDueDate || l.date}</td>
                      <td style={{ fontWeight: 700 }}>₹{l.outstandingPrincipal.toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`badge ${l.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
