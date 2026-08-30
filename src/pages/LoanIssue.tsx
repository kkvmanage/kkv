import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CustomerLocation } from '../components/common/CustomerLocation';
import { CustomerAutocomplete } from '../components/common/CustomerAutocomplete';
import { DobDatePicker } from '../components/common/DobDatePicker';
import { DatePicker } from '../components/common/DatePicker';
import { DriveFileUpload, DriveFileItem } from '../components/common/DriveFileUpload';
import { CustomerPhotoUpload } from '../components/common/CustomerPhotoUpload';
import { CustomerLocationData, OrnamentItem, PurityOption } from '../types';
import { apiService } from '../services/api';
import {
  Plus,
  Camera,
  Search,
  ArrowRight,
  Mic,
  X,
  Image as ImageIcon
} from 'lucide-react';

export const LoanIssue: React.FC = () => {
  const { customers, loans, receipts, addLoan, topUpLoan, setCurrentPage, showToast, masterControlSettings } = useApp();

  // Active Top Tab: 'issue' | 'topup'
  const [activeTab, setActiveTab] = useState<'issue' | 'topup'>('issue');

  // Voice Fill Modal
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);

  // Top Section: Identification & Configuration
  const nextReceiptNo = receipts.length > 0 ? Math.max(...receipts.map(r => r.receiptNo)) + 1 : 1;
  const [receiptBillNo, setReceiptBillNo] = useState<number>(nextReceiptNo);
  const [loanNo, setLoanNo] = useState<string>(`GL-${String(loans.length + 1).padStart(2, '0')}`);
  const todayDateObj = new Date();
  const [loanIssueDateIso, setLoanIssueDateIso] = useState<string>(
    `${todayDateObj.getFullYear()}-${String(todayDateObj.getMonth() + 1).padStart(2, '0')}-${String(todayDateObj.getDate()).padStart(2, '0')}`
  );
  const [loanIssueDate, setLoanIssueDate] = useState<string>(
    todayDateObj.toLocaleDateString('en-GB').replace(/\//g, '-')
  );
  const [loanIssueDateError, setLoanIssueDateError] = useState<string>('');

  const [loanType, setLoanType] = useState<'GOLD LOAN' | 'SILVER LOAN' | 'PRONOTE' | 'HIRE PURCHASE'>('GOLD LOAN');
  const [repaymentSystem, setRepaymentSystem] = useState<'Monthly interest only' | 'EMI' | 'Bullet Repayment'>('Monthly interest only');
  const [area, setArea] = useState<string>('');
  const [showroom, setShowroom] = useState<string>('');

  // Customer Search & KYC
  const [customerSearchName, setCustomerSearchName] = useState<string>('');
  const [customerSearchPhone, setCustomerSearchPhone] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | '-'>('-');
  const [dobMode, setDobMode] = useState<'age' | 'dob'>('age');
  const [age, setAge] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [dobIso, setDobIso] = useState<string>('');
  const [dobError, setDobError] = useState<string>('');
  const [occupation, setOccupation] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [idProof, setIdProof] = useState<string>('-');
  const [idNumber, setIdNumber] = useState<string>('');
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [permanentAddress, setPermanentAddress] = useState<string>('');
  const [customerPhotoFile, setCustomerPhotoFile] = useState<File | null>(null);
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState<string | null>(null);

  // KYC Documents
  const [kycDocs, setKycDocs] = useState<string[]>([]);

  // Customer Location
  const [customerLocationData, setCustomerLocationData] = useState<CustomerLocationData | null>(null);

  // Nominee Collapsible
  const [hasNominee, setHasNominee] = useState<boolean>(false);
  const [nomineeName, setNomineeName] = useState<string>('');
  const [nomineeRelation, setNomineeRelation] = useState<string>('-');
  const [nomineeAge, setNomineeAge] = useState<string>('');
  const [nomineePhone, setNomineePhone] = useState<string>('');
  const [nomineeIdNo, setNomineeIdNo] = useState<string>('');
  const [nomineeAddress, setNomineeAddress] = useState<string>('');

  // Guarantor Collapsible
  const [hasGuarantor, setHasGuarantor] = useState<boolean>(false);
  const [guarantorName, setGuarantorName] = useState<string>('');
  const [guarantorRelation, setGuarantorRelation] = useState<string>('-');
  const [guarantorAge, setGuarantorAge] = useState<string>('');
  const [guarantorPhone, setGuarantorPhone] = useState<string>('');
  const [guarantorIdNo, setGuarantorIdNo] = useState<string>('');
  const [guarantorAddress, setGuarantorAddress] = useState<string>('');

  // Financial details
  const [principal, setPrincipal] = useState<number | ''>(100000);
  const [disbursementMethod, setDisbursementMethod] = useState<'Cash' | 'Bank' | 'Cash + Bank'>('Cash');

  // Cash + Bank Split Details
  const [splitBankMode, setSplitBankMode] = useState<string>('UPI');
  const [splitCashAmount, setSplitCashAmount] = useState<number | ''>(50000);
  const [splitBankAmount, setSplitBankAmount] = useState<number | ''>(50000);

  // Interest Rate
  const getApplicableInterestRate = (principalAmount: number): number => {
    const bands = masterControlSettings?.amountBands || [];
    if (bands.length > 0 && principalAmount > 0) {
      const sortedBands = [...bands].sort((a, b) => a.amount - b.amount);
      for (const band of sortedBands) {
        if (band.condition === 'Below' && principalAmount <= band.amount) {
          return band.baseRateMonthly;
        }
        if (band.condition === 'Above' && principalAmount > band.amount) {
          return band.baseRateMonthly;
        }
      }
      const match = sortedBands.find((b) => principalAmount <= b.amount) || sortedBands[sortedBands.length - 1];
      if (match) return match.baseRateMonthly;
    }
    return masterControlSettings?.goldLoanMonthlyRate || 1.5;
  };

  const numericPrincipal = typeof principal === 'number' ? principal : 0;
  const interestRate = getApplicableInterestRate(numericPrincipal);

  // Advance Interest
  const [deductAdvanceInterest, setDeductAdvanceInterest] = useState<boolean>(false);
  const [advanceDays, setAdvanceDays] = useState<number>(0);
  const [advanceReceivingMethod, setAdvanceReceivingMethod] = useState<'Cash' | 'Bank' | 'Cash + Bank'>('Cash');

  // Card Fee Pill
  const [cardFeeEnabled, setCardFeeEnabled] = useState<boolean>(true);
  const [cardFeeAmount, setCardFeeAmount] = useState<number>(10);
  const [cardFeeMode, setCardFeeMode] = useState<'Cash' | 'Bank'>('Bank');
  const [cardFeePaymentType, setCardFeePaymentType] = useState<'UPI' | 'Cash' | 'Bank Transfer'>('UPI');

  // Ornament Items
  const [items, setItems] = useState<OrnamentItem[]>([
    {
      id: 'item-1',
      item: '',
      qty: 1,
      purity: '22ct',
      grossWeight: 0,
      netWeight: 0
    }
  ]);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [ornamentPhotos, setOrnamentPhotos] = useState<string[]>([]);

  // TOP UP TAB STATE
  const [topUpSearch, setTopUpSearch] = useState<string>('');
  const [selectedTopUpLoan, setSelectedTopUpLoan] = useState<any | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number | ''>(20000);
  const [topUpDate, setTopUpDate] = useState<string>(new Date().toLocaleDateString('en-GB').replace(/\//g, '-'));
  const [topUpNotes, setTopUpNotes] = useState<string>('');

  const goldRatePerGram22ct = 6400;

  // Auto Calculations
  const totalGrossWeight = items.reduce((sum, item) => sum + (Number(item.grossWeight) || 0), 0);
  const totalNetWeight = items.reduce((sum, item) => sum + (Number(item.netWeight) || 0), 0);
  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const marketValue = Math.round(totalNetWeight * goldRatePerGram22ct);
  const ltv = marketValue > 0 ? ((numericPrincipal / marketValue) * 100).toFixed(2) : '0.00';
  const monthlyInterest = Math.round((numericPrincipal * interestRate) / 100);
  const advanceInterestAmount = deductAdvanceInterest
    ? Math.round((monthlyInterest / 30) * (advanceDays || 30))
    : 0;

  // Voice fill Alt+V Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        setShowVoiceModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Bi-directional DOB <-> Age Sync with DobDatePicker
  const handleDobPickerChange = (isoDate: string, formattedDisplay: string, calculatedAge: number) => {
    setDobIso(isoDate);
    setDob(formattedDisplay);
    setAge(String(calculatedAge));
    setDobError('');
  };

  const handleAgeInputChange = (val: string) => {
    setAge(val);
    const numericAge = parseInt(val, 10);
    if (!isNaN(numericAge) && numericAge >= 1 && numericAge <= 120) {
      const birthYear = new Date().getFullYear() - numericAge;
      const iso = `${birthYear}-01-01`;
      const display = `01-01-${birthYear}`;
      setDobIso(iso);
      setDob(display);
      setDobError('');
    } else if (val === '') {
      setDobError('Age is required');
    } else {
      setDobError('Age must be between 1 and 120');
    }
  };

  // Search & fill customer logic


  const handleSelectCustomer = (cust: typeof customers[0]) => {
    setSelectedCustomerId(cust.id);
    setName(cust.name);
    setPhone(cust.phone);
    setGender(cust.gender || 'Male');
    setAge(cust.age ? String(cust.age) : '30');
    if (cust.age) {
      const birthYear = new Date().getFullYear() - cust.age;
      setDob(`01-01-${birthYear}`);
    }
    setOccupation(cust.occupation || '');
    setEmail(cust.email || '');
    setIdProof(cust.idProof || 'Aadhaar + PAN');
    setIdNumber(cust.idNumber || '');
    setCurrentAddress(cust.currentAddress || '');
    setPermanentAddress(cust.permanentAddress || '');
    if ((cust as any).customerPhotoUrl) setCustomerPhotoUrl((cust as any).customerPhotoUrl);
    setCustomerSearchName('');
    setCustomerSearchPhone('');
    showToast(`Loaded KYC details for ${cust.name}`, 'info');
  };

  // Items Handlers
  const handleAddItem = () => {
    setItems(prev => [
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
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof OrnamentItem, value: any) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'grossWeight') {
            const numVal = Number(value) || 0;
            if (item.netWeight === 0 || item.netWeight === item.grossWeight) {
              updated.netWeight = numVal;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };





  // Ornament Photos upload mock
  const handlePhotoUpload = () => {
    if (ornamentPhotos.length >= 6) {
      showToast('Maximum 6 ornament photos allowed.', 'warning');
      return;
    }
    const mockPhoto = `Photo_${ornamentPhotos.length + 1}.jpg`;
    setOrnamentPhotos(prev => [...prev, mockPhoto]);
    showToast('Ornament photo uploaded', 'info');
  };

  // Clear Form Handler
  const handleClearForm = () => {
    setName('');
    setPhone('');
    setGender('-');
    setAge('');
    setDob('');
    setDobIso('');
    setDobError('');
    const tDateObj = new Date();
    const tIso = `${tDateObj.getFullYear()}-${String(tDateObj.getMonth() + 1).padStart(2, '0')}-${String(tDateObj.getDate()).padStart(2, '0')}`;
    const tDisplay = tDateObj.toLocaleDateString('en-GB').replace(/\//g, '-');
    setLoanIssueDateIso(tIso);
    setLoanIssueDate(tDisplay);
    setLoanIssueDateError('');
    setOccupation('');
    setEmail('');
    setIdProof('-');
    setIdNumber('');
    setCurrentAddress('');
    setPermanentAddress('');
    setCustomerPhotoFile(null);
    setCustomerPhotoUrl(null);
    setKycDocs([]);
    setCustomerLocationData(null);
    setHasNominee(false);
    setNomineeName('');
    setNomineeRelation('-');
    setNomineeAge('');
    setNomineePhone('');
    setNomineeIdNo('');
    setNomineeAddress('');
    setHasGuarantor(false);
    setGuarantorName('');
    setGuarantorRelation('-');
    setGuarantorAge('');
    setGuarantorPhone('');
    setGuarantorIdNo('');
    setGuarantorAddress('');
    setPrincipal(100000);
    setDisbursementMethod('Cash');
    setDeductAdvanceInterest(false);
    setAdvanceDays(0);
    setCardFeeEnabled(true);
    setCardFeeAmount(10);
    setItems([
      {
        id: 'item-1',
        item: '',
        qty: 1,
        purity: '22ct',
        grossWeight: 0,
        netWeight: 0
      }
    ]);
    setAdditionalNotes('');
    setOrnamentPhotos([]);
    showToast('Form cleared', 'info');
  };

  // Submit Issue Loan
  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loanIssueDateIso || !loanIssueDate) {
      setLoanIssueDateError('Loan Issue Date is required.');
      showToast('Please select a valid Loan Issue Date.', 'error');
      return;
    }

    if (!name.trim() || !phone.trim()) {
      showToast('Please provide borrower full name and phone number.', 'error');
      return;
    }

    if (dobMode === 'dob') {
      if (!dobIso || !dob) {
        setDobError('Date of Birth is required.');
        showToast('Please select a valid Date of Birth.', 'error');
        return;
      }
      const numAge = Number(age);
      if (isNaN(numAge) || numAge < 1 || numAge > 120) {
        setDobError('Age must be between 1 and 120.');
        showToast('Selected Date of Birth results in invalid age (1-120).', 'error');
        return;
      }
    } else {
      const numAge = Number(age);
      if (!age || isNaN(numAge) || numAge < 1 || numAge > 120) {
        setDobError('Age must be between 1 and 120.');
        showToast('Please enter a valid age between 1 and 120.', 'error');
        return;
      }
    }

    if (!numericPrincipal || numericPrincipal <= 0) {
      showToast('Please enter a valid loan principal amount.', 'error');
      return;
    }

    if (disbursementMethod === 'Cash + Bank') {
      const cAmt = Number(splitCashAmount) || 0;
      const bAmt = Number(splitBankAmount) || 0;
      if (cAmt <= 0 || bAmt <= 0 || cAmt + bAmt !== numericPrincipal) {
        showToast('Cash + Bank split amounts must both be > 0 and sum exactly to full loan amount.', 'error');
        return;
      }
    }

    if (totalNetWeight <= 0) {
      showToast('Please specify ornament net weight.', 'error');
      return;
    }

    const targetCustomerId = selectedCustomerId || `CUST-${Date.now().toString().slice(-4)}`;
    let finalPhotoUrl: string | undefined = customerPhotoUrl || undefined;

    if (customerPhotoFile) {
      try {
        const uploadRes = await apiService.uploadCustomerDocument(targetCustomerId, customerPhotoFile, 'profile');
        if (uploadRes.success && uploadRes.data) {
          const driveFile = uploadRes.data.driveFile || uploadRes.data;
          finalPhotoUrl = driveFile.webViewLink || driveFile.fileId;
          showToast('Customer profile photo uploaded to Google Drive', 'success');
        }
      } catch (err) {
        console.warn('[Photo Upload] Drive upload error:', err);
      }
    }

    addLoan({
      receiptBillNo,
      loanNo,
      customerId: targetCustomerId,
      customerName: name,
      customerPhone: phone,
      customerGender: gender === '-' ? 'Male' : (gender as any),
      customerAge: Number(age) || 30,
      customerOccupation: occupation || 'Self Employed',
      customerEmail: email,
      customerPhotoUrl: finalPhotoUrl,
      customerCurrentAddress: currentAddress,
      customerPermanentAddress: permanentAddress || currentAddress,
      customerLocation: customerLocationData
        ? {
            captured: true,
            coordinates: `${customerLocationData.latitude}, ${customerLocationData.longitude}`,
            mapsUrl: customerLocationData.googleMapsUrl,
            addressSummary: currentAddress
          }
        : undefined,
      nominee: hasNominee
        ? {
          hasNominee: true,
          name: nomineeName,
          relationship: nomineeRelation,
          age: Number(nomineeAge) || undefined,
          phone: nomineePhone,
          idProofNumber: nomineeIdNo,
          address: nomineeAddress
        }
        : undefined,
      guarantor: hasGuarantor
        ? {
          hasGuarantor: true,
          name: guarantorName,
          relationship: guarantorRelation,
          age: Number(guarantorAge) || undefined,
          phone: guarantorPhone,
          idProof: guarantorIdNo,
          address: guarantorAddress
        }
        : undefined,
      kycDocuments: kycDocs,
      date: loanIssueDate,
      loanType,
      repaymentSystem,
      area: area || 'T. Nagar Central',
      showroom: showroom || 'Main Branch - Counter 1',
      principal: numericPrincipal,
      interestRate,
      bankMode: disbursementMethod === 'Cash + Bank' ? 'Split' : (disbursementMethod as any),
      splitBankMode: disbursementMethod === 'Cash + Bank' ? splitBankMode : undefined,
      cashAmount: disbursementMethod === 'Cash' ? numericPrincipal : (disbursementMethod === 'Cash + Bank' ? Number(splitCashAmount) || 0 : 0),
      bankAmount: disbursementMethod === 'Bank' ? numericPrincipal : (disbursementMethod === 'Cash + Bank' ? Number(splitBankAmount) || 0 : 0),
      deductAdvanceInterest,
      advanceDays,
      advanceInterestAmount,
      advanceInterestReceivingMethod: deductAdvanceInterest ? advanceReceivingMethod : undefined,
      cardFee: cardFeeEnabled ? cardFeeAmount : 0,
      cardFeePaymentMode: cardFeeMode,
      items,
      totalGrossWeight,
      totalNetWeight,
      marketValue,
      ltv: Number(ltv),
      monthlyInterest,
      notes: additionalNotes,
      photos: ornamentPhotos,
      status: 'ACTIVE',
      disbursedAmount: numericPrincipal - advanceInterestAmount,
      outstandingPrincipal: numericPrincipal,
      accruedInterest: 0,
      renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB').replace(/\//g, '-')
    });

    showToast(`Loan ${loanNo} issued successfully!`, 'success');
    setCurrentPage('all-receipts');
  };

  // Submit Top-Up
  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopUpLoan) {
      showToast('Please search and select an active loan for top-up.', 'error');
      return;
    }
    const numTopUp = typeof topUpAmount === 'number' ? topUpAmount : 0;
    if (!numTopUp || numTopUp <= 0) {
      showToast('Please enter a valid top-up amount.', 'error');
      return;
    }
    const success = topUpLoan(selectedTopUpLoan.loanNo, numTopUp, topUpDate, topUpNotes);
    if (success) {
      showToast(`Top-up of ₹${numTopUp.toLocaleString('en-IN')} added to ${selectedTopUpLoan.loanNo}`, 'success');
      setCurrentPage('all-receipts');
    }
  };

  // Dynamic ID field label & subtext
  const getIdFieldConfig = () => {
    if (idProof.includes('Aadhaar') && idProof.includes('PAN')) {
      return { label: 'AADHAAR NUMBER', placeholder: 'XXXX XXXX XXXX', subtext: '12 digits, as printed on the card.' };
    }
    if (idProof.includes('Aadhaar')) {
      return { label: 'AADHAAR NUMBER', placeholder: 'XXXX XXXX XXXX', subtext: '12 digits, as printed on the card.' };
    }
    if (idProof.includes('PAN')) {
      return { label: 'PAN NUMBER', placeholder: 'ABCDE1234F', subtext: '10-character alphanumeric PAN.' };
    }
    return { label: 'ID NUMBER', placeholder: 'ID proof number', subtext: 'Enter official document ID number.' };
  };

  const idConfig = getIdFieldConfig();

  // Simulated Voice Fill
  const handleSimulateVoice = () => {
    setIsListening(true);
    setTimeout(() => {
      setName('Rajesh Kumar');
      setPhone('9876543210');
      setGender('Male');
      setAge('35');
      setDobIso('1991-08-15');
      setDob('15-08-1991');
      setDobError('');
      setOccupation('Business');
      setIdProof('Aadhaar + PAN');
      setIdNumber('9876 5432 1098');
      setCurrentAddress('No 45, Gandhi Road, T. Nagar, Chennai');
      setPrincipal(150000);
      setItems([
        {
          id: 'item-1',
          item: 'Gold Chain (22ct)',
          qty: 1,
          purity: '22ct',
          grossWeight: 28.5,
          netWeight: 26.8
        }
      ]);
      setIsListening(false);
      setShowVoiceModal(false);
      showToast('Voice command parsed & form auto-filled!', 'success');
    }, 1500);
  };

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Loan Issue</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Issue new loans and view recent loan list.
          </p>
        </div>
      </div>

      {/* SUB-TABS BAR */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '2px' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'issue' ? 'btn-primary' : 'btn-secondary'}`}
          style={{
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            padding: '10px 24px',
            fontWeight: 700,
            backgroundColor: activeTab === 'issue' ? 'var(--color-primary-accent)' : 'transparent',
            color: activeTab === 'issue' ? '#fff' : 'var(--text-secondary)'
          }}
          onClick={() => setActiveTab('issue')}
        >
          Issue New Loan
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'topup' ? 'btn-primary' : 'btn-secondary'}`}
          style={{
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            padding: '10px 24px',
            fontWeight: 700,
            backgroundColor: activeTab === 'topup' ? 'var(--color-primary-accent)' : 'transparent',
            color: activeTab === 'topup' ? '#fff' : 'var(--text-secondary)'
          }}
          onClick={() => setActiveTab('topup')}
        >
          Loan Top-up
        </button>
      </div>

      {/* VOICE FILL MODAL */}
      {showVoiceModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            width: '420px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mic size={20} color="var(--color-primary-dark)" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Voice Fill Assistant (Alt+V)</h3>
              </div>
              <button type="button" onClick={() => setShowVoiceModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Speak loan details (e.g. <i>"Name Ramesh, Phone 9876543210, Principal 1 lakh, 26g Gold Chain"</i>) to auto-fill the form.
            </p>

            <div style={{
              height: '100px',
              backgroundColor: 'var(--bg-surface-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px'
            }}>
              {isListening ? (
                <>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EF4444', animation: 'pulse 1s infinite' }} />
                  <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: 700 }}>Listening... Speak now</span>
                </>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Click button below to start voice recognition</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowVoiceModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSimulateVoice} disabled={isListening}>
                {isListening ? 'Processing...' : 'Start Speaking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'topup' ? (
        /* LOAN TOP-UP TAB */
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

            {/* Quick Loan Select Pills */}
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
                      onChange={(e) => setTopUpAmount(Number(e.target.value) || '')}
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
                    <strong style={{ fontSize: '16px', color: 'var(--color-primary-dark)' }}>₹{(selectedTopUpLoan.principal + (Number(topUpAmount) || 0)).toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>New Monthly Interest: </span>
                    <strong style={{ fontSize: '16px', color: 'var(--color-primary-dark)' }}>₹{Math.round(((selectedTopUpLoan.principal + (Number(topUpAmount) || 0)) * selectedTopUpLoan.interestRate) / 100).toLocaleString('en-IN')} / mo</strong>
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

          {/* SECTION 1: ISSUE NEW LOAN TOP CARD */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Issue New Loan</h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fill in the details below and click Issue Loan</span>
            </div>

            {/* Voice Fill Button */}
            <div style={{ marginBottom: '20px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: '1px solid var(--border-light)'
                }}
                onClick={() => setShowVoiceModal(true)}
              >
                <Mic size={16} color="var(--color-primary-dark)" />
                <span>Voice Fill (Alt+V)</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Row 1: Receipt / Bill No | Loan No | Loan Issue Date */}
              <div className="grid-3" style={{ gap: '16px' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label required">RECEIPT / BILL NO</label>
                    <span style={{ color: 'var(--color-success)', fontSize: '11px', fontWeight: 700 }}>✓ Available</span>
                  </div>
                  <input
                    type="number"
                    className="input-control"
                    value={receiptBillNo}
                    onChange={(e) => setReceiptBillNo(Number(e.target.value) || 1)}
                  />
                  <small style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Auto-filled - edit only to match a manual register.
                  </small>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label required">LOAN NO</label>
                    <span style={{ color: 'var(--color-success)', fontSize: '11px', fontWeight: 700 }}>✓ Available</span>
                  </div>
                  <input
                    type="text"
                    className="input-control"
                    value={loanNo}
                    onChange={(e) => setLoanNo(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">LOAN ISSUE DATE</label>
                  <DatePicker
                    isoValue={loanIssueDateIso}
                    displayValue={loanIssueDate}
                    onChange={(iso, display) => {
                      setLoanIssueDateIso(iso);
                      setLoanIssueDate(display);
                      setLoanIssueDateError('');
                    }}
                    error={loanIssueDateError}
                    placeholder="DD-MM-YYYY"
                  />
                </div>
              </div>

              {/* Row 2: Loan Type | Repayment System */}
              <div className="grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label required">LOAN TYPE</label>
                  <select className="input-control" value={loanType} onChange={(e) => setLoanType(e.target.value as any)}>
                    <option value="GOLD LOAN">Gold Loan</option>
                    <option value="SILVER LOAN">Silver Loan</option>
                    <option value="PRONOTE">Pronote</option>
                    <option value="HIRE PURCHASE">Hire Purchase</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label required">REPAYMENT SYSTEM</label>
                  <select className="input-control" value={repaymentSystem} onChange={(e) => setRepaymentSystem(e.target.value as any)}>
                    <option value="Monthly interest only">Monthly Interest only</option>
                    <option value="EMI">EMI</option>
                    <option value="Bullet Repayment">Bullet Repayment</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Area | Showroom */}
              <div className="grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">AREA</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Type to search..."
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SHOWROOM</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Type to search..."
                    value={showroom}
                    onChange={(e) => setShowroom(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 4: Existing Customer By Name | By Phone */}
              <div className="grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <CustomerAutocomplete
                    label="EXISTING CUSTOMER (BY NAME)"
                    value={customerSearchName}
                    onChange={setCustomerSearchName}
                    onSelectCustomer={handleSelectCustomer}
                    placeholder="Type customer name..."
                    searchBy="name"
                  />
                </div>

                <div className="form-group">
                  <CustomerAutocomplete
                    label="EXISTING CUSTOMER (BY PHONE)"
                    value={customerSearchPhone}
                    onChange={setCustomerSearchPhone}
                    onSelectCustomer={handleSelectCustomer}
                    placeholder="Type phone number..."
                    searchBy="phone"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 2: CUSTOMER / KYC DETAILS CARD */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3 className="card-title" style={{ fontSize: '16px', fontWeight: 700 }}>Customer / KYC Details</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 1fr', gap: '20px', alignItems: 'start' }}>
              {/* Photo Box Column */}
              <CustomerPhotoUpload
                photoFile={customerPhotoFile}
                photoUrl={customerPhotoUrl}
                onChange={(file, url) => {
                  setCustomerPhotoFile(file);
                  setCustomerPhotoUrl(url);
                }}
                onToast={(msg, type) => showToast(msg, type)}
              />

              {/* Middle Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label required">FULL NAME</label>
                  <input type="text" className="input-control" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label required">GENDER</label>
                  <select className="input-control" value={gender} onChange={(e) => setGender(e.target.value as any)}>
                    <option value="-">-</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">OCCUPATION / WORK</label>
                  <input type="text" className="input-control" placeholder="e.g. Farmer" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">ID PROOF TYPE</label>
                  <select className="input-control" value={idProof} onChange={(e) => setIdProof(e.target.value)}>
                    <option value="-">-</option>
                    <option value="Aadhaar">Aadhaar</option>
                    <option value="PAN">PAN</option>
                    <option value="Aadhaar + PAN">Aadhaar + PAN</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Driving Licence">Driving Licence</option>
                    <option value="Passport">Passport</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label required">PHONE</label>
                  <input type="text" className="input-control" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="form-label">AGE / DATE OF BIRTH</label>
                    <div style={{ display: 'flex', gap: '2px', backgroundColor: 'var(--bg-surface-secondary)', padding: '2px', borderRadius: 'var(--radius-sm)' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${dobMode === 'dob' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '2px 8px', fontSize: '10px', height: '22px' }}
                        onClick={() => setDobMode('dob')}
                      >
                        DOB
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${dobMode === 'age' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '2px 8px', fontSize: '10px', height: '22px' }}
                        onClick={() => setDobMode('age')}
                      >
                        AGE
                      </button>
                    </div>
                  </div>
                  {dobMode === 'dob' ? (
                    <DobDatePicker
                      isoValue={dobIso}
                      displayValue={dob}
                      onChange={handleDobPickerChange}
                      error={dobError}
                    />
                  ) : (
                    <div>
                      <input
                        type="number"
                        className="input-control"
                        placeholder="Age in years (1 - 120)"
                        min={1}
                        max={120}
                        value={age}
                        onChange={(e) => handleAgeInputChange(e.target.value)}
                      />
                      {dobError && (
                        <small style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                          {dobError}
                        </small>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">EMAIL</label>
                  <input type="email" className="input-control" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">{idConfig.label}</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder={idConfig.placeholder}
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                  />
                  <small style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {idConfig.subtext}
                  </small>
                </div>
              </div>
            </div>

            {/* Addresses Row */}
            <div className="grid-2" style={{ marginTop: '16px', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label required">CURRENT ADDRESS</label>
                <textarea className="input-control" rows={2} value={currentAddress} onChange={(e) => setCurrentAddress(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">PERMANENT ADDRESS</label>
                <textarea
                  className="input-control"
                  rows={2}
                  placeholder="If same as current address, leave blank"
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                />
              </div>
            </div>

            {/* Customer Location Container */}
            <div style={{ marginTop: '16px' }}>
              <CustomerLocation
                location={customerLocationData}
                onChange={setCustomerLocationData}
                onToast={(msg, type) => showToast(msg, type)}
              />
            </div>

            {/* Nominee & Guarantor Collapsibles */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Nominee Checkbox */}
              <div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                  <input type="checkbox" checked={hasNominee} onChange={(e) => setHasNominee(e.target.checked)} />
                  <span>👤 DO YOU HAVE A NOMINEE?</span>
                </label>

                {hasNominee && (
                  <div style={{ marginTop: '10px', padding: '16px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border-subtle)' }}>
                    <div className="grid-4" style={{ gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">NOMINEE NAME</label>
                        <input type="text" className="input-control" placeholder="Full name" value={nomineeName} onChange={(e) => setNomineeName(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">RELATION</label>
                        <select className="input-control" value={nomineeRelation} onChange={(e) => setNomineeRelation(e.target.value)}>
                          <option value="-">- Select -</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Son">Son</option>
                          <option value="Daughter">Daughter</option>
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Brother">Brother</option>
                          <option value="Sister">Sister</option>
                          <option value="Friend">Friend</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">AGE</label>
                        <input type="number" className="input-control" placeholder="yrs" value={nomineeAge} onChange={(e) => setNomineeAge(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">PHONE</label>
                        <input type="text" className="input-control" placeholder="10-digit mobile" value={nomineePhone} onChange={(e) => setNomineePhone(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid-2" style={{ gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">AADHAAR / ID NO.</label>
                        <input type="text" className="input-control" placeholder="Aadhaar / PAN / other" value={nomineeIdNo} onChange={(e) => setNomineeIdNo(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">ADDRESS</label>
                        <input type="text" className="input-control" placeholder="Nominee address" value={nomineeAddress} onChange={(e) => setNomineeAddress(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Guarantor Checkbox */}
              <div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                  <input type="checkbox" checked={hasGuarantor} onChange={(e) => setHasGuarantor(e.target.checked)} />
                  <span>👤 DO YOU HAVE A GUARANTOR?</span>
                </label>

                {hasGuarantor && (
                  <div style={{ marginTop: '10px', padding: '16px', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border-subtle)' }}>
                    <div className="grid-4" style={{ gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">GUARANTOR NAME</label>
                        <input type="text" className="input-control" placeholder="Full name" value={guarantorName} onChange={(e) => setGuarantorName(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">RELATION</label>
                        <select className="input-control" value={guarantorRelation} onChange={(e) => setGuarantorRelation(e.target.value)}>
                          <option value="-">- Select -</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Son">Son</option>
                          <option value="Daughter">Daughter</option>
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Brother">Brother</option>
                          <option value="Sister">Sister</option>
                          <option value="Friend">Friend</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">AGE</label>
                        <input type="number" className="input-control" placeholder="yrs" value={guarantorAge} onChange={(e) => setGuarantorAge(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">PHONE</label>
                        <input type="text" className="input-control" placeholder="10-digit mobile" value={guarantorPhone} onChange={(e) => setGuarantorPhone(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid-2" style={{ gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">AADHAAR / ID NO.</label>
                        <input type="text" className="input-control" placeholder="Aadhaar / PAN / other" value={guarantorIdNo} onChange={(e) => setGuarantorIdNo(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">ADDRESS</label>
                        <input type="text" className="input-control" placeholder="Guarantor address" value={guarantorAddress} onChange={(e) => setGuarantorAddress(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* KYC Documents Uploader */}
              <div style={{ marginTop: '4px' }}>
                <DriveFileUpload
                  label="KYC DOCUMENTS (SECURE GOOGLE DRIVE UPLOAD)"
                  category="kyc"
                  customerId={selectedCustomerId || undefined}
                  onUploadSuccess={(item: DriveFileItem) => {
                    setKycDocs((prev) => [...prev, item.name]);
                  }}
                  onFileDeleted={() => {
                    setKycDocs((prev) => prev.slice(0, -1));
                  }}
                />
              </div>

            </div>
          </div>

          {/* SECTION 3: FINANCIAL TERMS & DISBURSEMENT */}
          <div className="card" style={{ padding: '24px' }}>

            <div className="grid-2" style={{ gap: '16px' }}>
              <div className="form-group">
                <label className="form-label required">PRINCIPAL (INR)</label>
                <input
                  type="number"
                  className="input-control"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">DISBURSEMENT METHOD</label>
                <select className="input-control" value={disbursementMethod} onChange={(e) => setDisbursementMethod(e.target.value as any)}>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                  <option value="Cash + Bank">Cash + Bank</option>
                </select>
              </div>
            </div>

            {/* Split Cash + Bank Box */}
            {disbursementMethod === 'Cash + Bank' && (
              <div style={{ marginTop: '14px', padding: '16px', backgroundColor: 'rgba(79, 175, 134, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(79, 175, 134, 0.25)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Cash + Bank split - both must be &gt; 0 and sum to full loan amount.
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', alignItems: 'flex-end' }}>
                  <div className="form-group">
                    <label className="form-label">BANK MODE</label>
                    <select className="input-control" value={splitBankMode} onChange={(e) => setSplitBankMode(e.target.value)}>
                      <option value="UPI">UPI</option>
                      <option value="NEFT/RTGS/IMPS">NEFT/RTGS/IMPS</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">CASH (₹)</label>
                    <input
                      type="number"
                      className="input-control"
                      value={splitCashAmount}
                      onChange={(e) => setSplitCashAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">BANK (₹)</label>
                    <input
                      type="number"
                      className="input-control"
                      value={splitBankAmount}
                      onChange={(e) => setSplitBankAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">TOTAL</label>
                    <div className="input-control readonly" style={{ fontWeight: 800, color: (Number(splitCashAmount) || 0) + (Number(splitBankAmount) || 0) === numericPrincipal ? 'var(--color-success)' : '#EF4444' }}>
                      ₹{((Number(splitCashAmount) || 0) + (Number(splitBankAmount) || 0)).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid-2" style={{ gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label required">INTEREST RATE</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.1"
                    className="input-control"
                    value={interestRate}
                    readOnly
                    disabled
                    style={{ backgroundColor: 'var(--bg-surface-secondary)', fontWeight: 700 }}
                  />
                </div>
                <small style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  % per month (auto)
                </small>
              </div>
            </div>

            {/* Deduct Advance Interest Container */}
            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'rgba(210, 168, 74, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(210, 168, 74, 0.2)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={deductAdvanceInterest}
                  onChange={(e) => {
                    setDeductAdvanceInterest(e.target.checked);
                    if (e.target.checked && advanceDays === 0) setAdvanceDays(30);
                  }}
                />
                <span>DEDUCT ADVANCE INTEREST AT DISBURSEMENT</span>
              </label>

              <div className="grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">DAYS OF ADVANCE INTEREST</label>
                  <input
                    type="number"
                    className="input-control"
                    value={advanceDays}
                    onChange={(e) => setAdvanceDays(Number(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ADVANCE INTEREST AMOUNT</label>
                  <input
                    type="text"
                    className="input-control readonly"
                    readOnly
                    value={deductAdvanceInterest ? `₹${advanceInterestAmount.toLocaleString('en-IN')}` : 'auto'}
                  />
                </div>
              </div>

              {deductAdvanceInterest && (
                <div className="form-group" style={{ marginTop: '4px' }}>
                  <label className="form-label">RECEIVING METHOD</label>
                  <select className="input-control" value={advanceReceivingMethod} onChange={(e) => setAdvanceReceivingMethod(e.target.value as any)}>
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="Cash + Bank">Cash + Bank</option>
                  </select>
                  <small style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    All-cash receipt of advance interest.
                  </small>
                </div>
              )}
            </div>

            {/* Card Fee Green Badge Pill */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                backgroundColor: 'var(--badge-success-bg)',
                color: 'var(--badge-success-text)',
                borderRadius: 'var(--radius-full)',
                border: '1px solid rgba(79, 175, 134, 0.3)',
                fontSize: '13px',
                fontWeight: 700
              }}>
                <input
                  type="checkbox"
                  checked={cardFeeEnabled}
                  onChange={(e) => setCardFeeEnabled(e.target.checked)}
                />
                <span>💳 Card Fee</span>
                <span style={{ color: 'var(--badge-success-text)' }}>₹</span>
                <input
                  type="number"
                  style={{
                    width: '45px',
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    fontWeight: 800,
                    textAlign: 'center',
                    borderBottom: '1px solid currentColor'
                  }}
                  value={cardFeeAmount}
                  onChange={(e) => setCardFeeAmount(Number(e.target.value) || 0)}
                />
                <select
                  value={cardFeeMode}
                  onChange={(e) => setCardFeeMode(e.target.value as any)}
                  style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 700, cursor: 'pointer' }}
                >
                  <option value="Bank" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>Bank</option>
                  <option value="Cash" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>Cash</option>
                </select>
                <select
                  value={cardFeePaymentType}
                  onChange={(e) => setCardFeePaymentType(e.target.value as any)}
                  style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 700, cursor: 'pointer' }}
                >
                  <option value="UPI" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>UPI</option>
                  <option value="Cash" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>Cash</option>
                  <option value="Bank Transfer" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>Bank Transfer</option>
                </select>
              </div>
            </div>

          </div>

          {/* SECTION 4: GOLD ORNAMENT DETAILS CARD */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="card-title" style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Gold Ornament Details</h3>
              <button type="button" className="btn btn-secondary btn-sm" style={{ gap: '6px' }} onClick={handleAddItem}>
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
                    <th style={{ width: '130px' }}>PURITY</th>
                    <th style={{ width: '150px' }}>GROSS WT (G)</th>
                    <th style={{ width: '150px' }}>NET WT (G)</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{idx + 1}</td>
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
                          onChange={(e) => handleItemChange(item.id, 'purity', e.target.value as PurityOption)}
                        >
                          <option value="22ct">22ct</option>
                          <option value="24ct">24ct</option>
                          <option value="20ct">20ct</option>
                          <option value="18ct">18ct</option>
                          <option value="14ct">14ct</option>
                          <option value="Silver 925">Silver 925</option>
                          <option value="Silver 999">Silver 999</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.001"
                          className="input-control"
                          value={item.grossWeight || ''}
                          placeholder="0.000"
                          onChange={(e) => handleItemChange(item.id, 'grossWeight', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.001"
                          className="input-control"
                          value={item.netWeight || ''}
                          placeholder="0.000"
                          onChange={(e) => handleItemChange(item.id, 'netWeight', Number(e.target.value))}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button type="button" style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }} onClick={() => handleRemoveItem(item.id)}>
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* TOTALS Row */}
                  <tr style={{ fontWeight: 800, backgroundColor: 'var(--bg-surface-subtle)' }}>
                    <td colSpan={2} style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOTALS</td>
                    <td>{totalQty}</td>
                    <td>-</td>
                    <td style={{ color: 'var(--color-primary-dark)' }}>{totalGrossWeight.toFixed(3)} g</td>
                    <td style={{ color: 'var(--color-primary-dark)' }}>{totalNetWeight.toFixed(3)} g</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Calculations Row */}
            <div className="grid-3" style={{ marginTop: '16px', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">TOTAL WEIGHT (G)</label>
                <input
                  type="text"
                  className="input-control readonly"
                  readOnly
                  value={totalNetWeight > 0 ? `${totalNetWeight.toFixed(3)} g` : 'auto'}
                />
              </div>

              <div className="form-group">
                <label className="form-label">MARKET VALUE (₹)</label>
                <input
                  type="text"
                  className="input-control readonly"
                  readOnly
                  value={marketValue > 0 ? `Estimated ₹${marketValue.toLocaleString('en-IN')}` : 'Estimated'}
                />
              </div>

              <div className="form-group">
                <label className="form-label">LTV %</label>
                <input
                  type="text"
                  className="input-control readonly"
                  readOnly
                  value={numericPrincipal > 0 && marketValue > 0 ? `${ltv}%` : ''}
                />
              </div>
            </div>

            {/* Additional Notes Textarea */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">ADDITIONAL NOTES (OPTIONAL)</label>
              <textarea
                className="input-control"
                rows={2}
                placeholder="Any extra remarks about the pledged items"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
              />
            </div>

            {/* Ornament Photos Uploader */}
            <div style={{ marginTop: '16px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ORNAMENT PHOTOS (UP TO 6)
              </span>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 8px 0' }}>
                {ornamentPhotos.length > 0 ? `${ornamentPhotos.length} photo(s) uploaded.` : 'No photos uploaded yet.'}
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {ornamentPhotos.map((photo, idx) => (
                  <div key={idx} style={{ padding: '4px 10px', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ImageIcon size={14} color="var(--color-primary-dark)" />
                    <span>{photo}</span>
                    <button type="button" onClick={() => setOrnamentPhotos(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0 }}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" style={{ gap: '6px', fontSize: '12px' }} onClick={handlePhotoUpload}>
                  <Plus size={14} />
                  <span>+ ADD PHOTO</span>
                </button>
              </div>
            </div>

          </div>

          {/* SECTION 5: MONTHLY INTEREST HIGHLIGHT BOX & BUTTONS */}
          <div style={{
            padding: '24px',
            backgroundColor: 'var(--bg-surface-secondary)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              MONTHLY INTEREST
            </span>
            <h1 style={{ fontSize: '36px', fontWeight: 900, color: 'var(--color-primary-dark)', margin: 0 }}>
              ₹{monthlyInterest.toLocaleString('en-IN')} / month
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              {interestRate}%/month (30-day cycle) on ₹{numericPrincipal.toLocaleString('en-IN')} = ₹{monthlyInterest.toLocaleString('en-IN')}/mo (interest only) . Penalty after 3 months
            </p>
          </div>

          {/* Submit Action Buttons */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: '12px 28px',
                fontSize: '15px',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary-accent)',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              Issue Loan &amp; Generate Receipt
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)'
              }}
              onClick={handleClearForm}
            >
              Clear Form
            </button>
          </div>

          {/* SECTION 6: RECENT LOANS TABLE */}
          <div className="card" style={{ padding: '24px', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 className="card-title" style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Recent Loans</h3>
                <p className="card-description" style={{ margin: '2px 0 0 0' }}>Last 10 issued. See Total Loans for the full list.</p>
              </div>
            </div>

            <div className="table-container">
              {loans.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-subtle)', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginBottom: '12px' }}>
                    <Camera size={24} color="var(--text-muted)" />
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No loans issued yet.</p>
                </div>
              ) : (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>LOAN #</th>
                      <th>TYPE</th>
                      <th>CUSTOMER</th>
                      <th>PRINCIPAL</th>
                      <th>RATE</th>
                      <th>TENURE</th>
                      <th>NEXT DUE</th>
                      <th>OUTSTANDING</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.slice(0, 10).map((l) => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{l.loanNo}</td>
                        <td>{l.loanType}</td>
                        <td style={{ fontWeight: 600 }}>{l.customerName}</td>
                        <td style={{ fontWeight: 700 }}>₹{l.principal.toLocaleString('en-IN')}</td>
                        <td>{l.interestRate}%</td>
                        <td>12 mos</td>
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
              )}
            </div>
          </div>

        </form>
      )}

    </div>
  );
};
