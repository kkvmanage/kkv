import React, { useState, useEffect } from 'react';
import '../styles/LoanIssue.css';
import { useApp } from '../context/AppContext';
import { CustomerLocation } from '../components/common/CustomerLocation';
import { CustomerAutocomplete } from '../components/common/CustomerAutocomplete';
import { DobDatePicker } from '../components/common/DobDatePicker';
import { DatePicker } from '../components/common/DatePicker';
import { IDProofInputFields } from '../components/common/IDProofInputFields';
import { OtherSelectField, RELATION_OPTIONS, resolveRelation } from '../components/common/OtherSelectField';
import { DriveFileUpload, DriveFileItem } from '../components/common/DriveFileUpload';
import { CustomerPhotoUpload } from '../components/common/CustomerPhotoUpload';
import { FinancialTermsSection } from '../components/common/FinancialTermsSection';
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
  const [idProof, setIdProof] = useState<string>('Aadhaar');
  const [idNumber, setIdNumber] = useState<string>('');
  const [extraPan, setExtraPan] = useState<string>('');
  const [docName, setDocName] = useState<string>('');
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
  const [nomineeCustomRelation, setNomineeCustomRelation] = useState<string>('');
  const [nomineeAge, setNomineeAge] = useState<string>('');
  const [nomineePhone, setNomineePhone] = useState<string>('');
  const [nomineeIdNo, setNomineeIdNo] = useState<string>('');
  const [nomineeAddress, setNomineeAddress] = useState<string>('');

  // Guarantor Collapsible
  const [hasGuarantor, setHasGuarantor] = useState<boolean>(false);
  const [guarantorName, setGuarantorName] = useState<string>('');
  const [guarantorRelation, setGuarantorRelation] = useState<string>('-');
  const [guarantorCustomRelation, setGuarantorCustomRelation] = useState<string>('');
  const [guarantorAge, setGuarantorAge] = useState<string>('');
  const [guarantorPhone, setGuarantorPhone] = useState<string>('');
  const [guarantorIdNo, setGuarantorIdNo] = useState<string>('');
  const [guarantorAddress, setGuarantorAddress] = useState<string>('');

  // Financial details
  const [principal, setPrincipal] = useState<number | ''>(100000);
  const [disbursementMethod, setDisbursementMethod] = useState<'Cash' | 'Bank' | 'Cash + Bank'>('Cash');
  const [bankMode, setBankMode] = useState<string>('UPI');

  // Cash + Bank Split Details
  const [splitCashAmount, setSplitCashAmount] = useState<number | ''>(50000);
  const [splitBankAmount, setSplitBankAmount] = useState<number | ''>(50000);

  // Interest Rate (Admin Controlled)
  const getApplicableInterestRate = (principalAmount: number, type: string = 'GOLD LOAN'): number => {
    if (type === 'SILVER LOAN') {
      const bands = masterControlSettings?.silverAmountBands || [];
      if (bands.length > 0 && principalAmount > 0) {
        const sortedBands = [...bands].sort((a, b) => a.amount - b.amount);
        for (const band of sortedBands) {
          if (band.condition === 'Below' && principalAmount <= band.amount) return band.baseRateMonthly;
          if (band.condition === 'Above' && principalAmount > band.amount) return band.baseRateMonthly;
        }
        const match = sortedBands.find((b) => principalAmount <= b.amount) || sortedBands[sortedBands.length - 1];
        if (match) return match.baseRateMonthly;
      }
      return masterControlSettings?.silverLoanMonthlyRate || 2.0;
    }
    if (type === 'PRONOTE') {
      return masterControlSettings?.pronoteRate || masterControlSettings?.pronoteMonthlyRate || 1.0;
    }
    if (type === 'HIRE PURCHASE') {
      return masterControlSettings?.hirePurchaseMonthlyRate || 1.0;
    }
    // Default: GOLD LOAN
    const bands = masterControlSettings?.amountBands || [];
    if (bands.length > 0 && principalAmount > 0) {
      const sortedBands = [...bands].sort((a, b) => a.amount - b.amount);
      for (const band of sortedBands) {
        if (band.condition === 'Below' && principalAmount <= band.amount) return band.baseRateMonthly;
        if (band.condition === 'Above' && principalAmount > band.amount) return band.baseRateMonthly;
      }
      const match = sortedBands.find((b) => principalAmount <= b.amount) || sortedBands[sortedBands.length - 1];
      if (match) return match.baseRateMonthly;
    }
    return masterControlSettings?.goldLoanMonthlyRate || 1.5;
  };

  const numericPrincipal = typeof principal === 'number' ? principal : 0;
  const interestRate = getApplicableInterestRate(numericPrincipal, loanType);

  // Advance Interest
  const [deductAdvanceInterest, setDeductAdvanceInterest] = useState<boolean>(false);
  const [advanceDays, setAdvanceDays] = useState<number>(0);
  const [advanceReceivingMethod, setAdvanceReceivingMethod] = useState<'Cash' | 'Bank' | 'Cash + Bank'>('Cash');

  // Card Fee
  const [cardFeeEnabled, setCardFeeEnabled] = useState<boolean>(true);
  const [cardFeeAmount, setCardFeeAmount] = useState<number>(10);
  const [cardFeeMode, setCardFeeMode] = useState<'Cash' | 'Bank'>('Bank');
  const [cardFeeBankMode, setCardFeeBankMode] = useState<string>('UPI');

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
    setNomineeCustomRelation('');
    setNomineeAge('');
    setNomineePhone('');
    setNomineeIdNo('');
    setNomineeAddress('');
    setHasGuarantor(false);
    setGuarantorName('');
    setGuarantorRelation('-');
    setGuarantorCustomRelation('');
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

    if (disbursementMethod === 'Bank' && !bankMode) {
      showToast('Please select a Bank Mode.', 'error');
      return;
    }

    if (disbursementMethod === 'Cash + Bank') {
      const cAmt = Number(splitCashAmount) || 0;
      const bAmt = Number(splitBankAmount) || 0;
      if (cAmt <= 0 || bAmt <= 0 || cAmt + bAmt !== numericPrincipal) {
        showToast('Cash + Bank amount must equal the Principal Amount.', 'error');
        return;
      }
    }

    if (totalNetWeight <= 0) {
      showToast('Please specify ornament net weight.', 'error');
      return;
    }

    // Validate "Other" relation fields
    if (hasNominee && nomineeRelation === 'Other' && !nomineeCustomRelation.trim()) {
      showToast('Please specify the nominee relationship.', 'error');
      return;
    }
    if (hasGuarantor && guarantorRelation === 'Other' && !guarantorCustomRelation.trim()) {
      showToast('Please specify the guarantor relationship.', 'error');
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

    const effectiveCardFee = cardFeeEnabled ? cardFeeAmount : 0;
    const finalDisbursedAmount = Math.max(
      0,
      numericPrincipal - (deductAdvanceInterest ? advanceInterestAmount : 0) - effectiveCardFee
    );

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
          relationship: resolveRelation(nomineeRelation, nomineeCustomRelation),
          relation: nomineeRelation,
          customRelation: nomineeRelation === 'Other' ? nomineeCustomRelation.trim() || null : null,
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
          relationship: resolveRelation(guarantorRelation, guarantorCustomRelation),
          relation: guarantorRelation,
          customRelation: guarantorRelation === 'Other' ? guarantorCustomRelation.trim() || null : null,
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
      bankMode: disbursementMethod === 'Cash' ? 'Cash' : (disbursementMethod === 'Bank' ? (bankMode as any) : 'Split'),
      splitBankMode: disbursementMethod === 'Cash + Bank' ? bankMode : undefined,
      cashAmount: disbursementMethod === 'Cash' ? numericPrincipal : (disbursementMethod === 'Cash + Bank' ? Number(splitCashAmount) || 0 : 0),
      bankAmount: disbursementMethod === 'Bank' ? numericPrincipal : (disbursementMethod === 'Cash + Bank' ? Number(splitBankAmount) || 0 : 0),
      deductAdvanceInterest,
      advanceDays,
      advanceInterestAmount,
      advanceInterestReceivingMethod: deductAdvanceInterest ? advanceReceivingMethod : undefined,
      cardFee: effectiveCardFee,
      cardFeePaymentMode: cardFeeMode,
      cardFeeBankMode: cardFeeMode === 'Bank' ? cardFeeBankMode : undefined,
      items,
      totalGrossWeight,
      totalNetWeight,
      marketValue,
      ltv: Number(ltv),
      monthlyInterest,
      notes: additionalNotes,
      photos: ornamentPhotos,
      status: 'ACTIVE',
      disbursedAmount: finalDisbursedAmount,
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
    <div className="page-content fi-page">

      {/* PAGE HEADER */}
      <div className="fi-page-header">
        <div>
          <h1 className="fi-page-title">Loan Issue</h1>
          <p className="fi-page-subtitle">Issue new loans and manage top-ups.</p>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="fi-tab-bar">
        <button
          type="button"
          className={`fi-tab${activeTab === 'issue' ? ' fi-tab--active' : ''}`}
          onClick={() => setActiveTab('issue')}
        >
          Issue New Loan
        </button>
        <button
          type="button"
          className={`fi-tab${activeTab === 'topup' ? ' fi-tab--active' : ''}`}
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
        <form onSubmit={handleSubmitIssue} className="fi-rows fi-rows--lg">

          {/* SECTION 1 — LOAN CONFIGURATION */}
          <div className="fi-card">
            <div className="fi-section-header">
              <div className="fi-section-title-group">
                <span className="fi-section-icon">📋</span>
                <div>
                  <h2 className="fi-section-title">Loan Configuration</h2>
                  <p className="fi-section-desc">Reference numbers, type, and branch details</p>
                </div>
              </div>
              <button type="button" className="fi-btn-ghost" onClick={() => setShowVoiceModal(true)}>
                <Mic size={14} />
                Voice Fill
              </button>
            </div>

            <div className="fi-rows">
              <div className="fi-grid-3">
                <div className="fi-field">
                  <div className="fi-label-sub">
                    <label className="fi-label">Receipt / Bill No <span className="fi-req">*</span></label>
                    <span className="fi-label-badge">✓ Auto</span>
                  </div>
                  <input type="number" className="input-control" value={receiptBillNo}
                    onChange={(e) => setReceiptBillNo(Number(e.target.value) || 1)} />
                  <span className="fi-hint">Edit only to match a manual register</span>
                </div>

                <div className="fi-field">
                  <div className="fi-label-sub">
                    <label className="fi-label">Loan No <span className="fi-req">*</span></label>
                    <span className="fi-label-badge">✓ Auto</span>
                  </div>
                  <input type="text" className="input-control" value={loanNo}
                    onChange={(e) => setLoanNo(e.target.value)} />
                </div>

                <div className="fi-field">
                  <label className="fi-label">Loan Issue Date <span className="fi-req">*</span></label>
                  <DatePicker
                    isoValue={loanIssueDateIso}
                    displayValue={loanIssueDate}
                    onChange={(iso, display) => { setLoanIssueDateIso(iso); setLoanIssueDate(display); setLoanIssueDateError(''); }}
                    error={loanIssueDateError}
                    placeholder="DD-MM-YYYY"
                  />
                </div>
              </div>

              <div className="fi-grid-4">
                <div className="fi-field">
                  <label className="fi-label">Loan Type <span className="fi-req">*</span></label>
                  <select className="input-control" value={loanType} onChange={(e) => setLoanType(e.target.value as any)}>
                    <option value="GOLD LOAN">Gold Loan</option>
                    <option value="SILVER LOAN">Silver Loan</option>
                    <option value="PRONOTE">Pronote</option>
                    <option value="HIRE PURCHASE">Hire Purchase</option>
                  </select>
                </div>

                <div className="fi-field">
                  <label className="fi-label">Repayment System <span className="fi-req">*</span></label>
                  <select className="input-control" value={repaymentSystem} onChange={(e) => setRepaymentSystem(e.target.value as any)}>
                    <option value="Monthly interest only">Monthly Interest Only</option>
                    <option value="EMI">EMI</option>
                    <option value="Bullet Repayment">Bullet Repayment</option>
                  </select>
                </div>

                <div className="fi-field">
                  <label className="fi-label">Area</label>
                  <input type="text" className="input-control" placeholder="e.g. T. Nagar"
                    value={area} onChange={(e) => setArea(e.target.value)} />
                </div>

                <div className="fi-field">
                  <label className="fi-label">Showroom</label>
                  <input type="text" className="input-control" placeholder="e.g. Main Branch"
                    value={showroom} onChange={(e) => setShowroom(e.target.value)} />
                </div>
              </div>

              <div className="fi-grid-2">
                <div className="fi-field">
                  <CustomerAutocomplete
                    label="Existing Customer (by Name)"
                    value={customerSearchName}
                    onChange={setCustomerSearchName}
                    onSelectCustomer={handleSelectCustomer}
                    placeholder="Type customer name…"
                    searchBy="name"
                  />
                </div>
                <div className="fi-field">
                  <CustomerAutocomplete
                    label="Existing Customer (by Phone)"
                    value={customerSearchPhone}
                    onChange={setCustomerSearchPhone}
                    onSelectCustomer={handleSelectCustomer}
                    placeholder="Type phone number…"
                    searchBy="phone"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 2 — CUSTOMER / KYC DETAILS */}
          <div className="fi-card">
            <div className="fi-section-header">
              <div className="fi-section-title-group">
                <span className="fi-section-icon">👤</span>
                <div>
                  <h3 className="fi-section-title">Customer / KYC Details</h3>
                  <p className="fi-section-desc">Personal information, identity proof, and addresses</p>
                </div>
              </div>
            </div>

            {/* Photo + fields grid */}
            <div className="fi-kyc-layout">
              {/* Photo Column */}
              <CustomerPhotoUpload
                photoFile={customerPhotoFile}
                photoUrl={customerPhotoUrl}
                onChange={(file, url) => { setCustomerPhotoFile(file); setCustomerPhotoUrl(url); }}
                onToast={(msg, type) => showToast(msg, type)}
              />

              {/* Personal — col 2 */}
              <div className="fi-rows">
                <div className="fi-field">
                  <label className="fi-label">Full Name <span className="fi-req">*</span></label>
                  <input type="text" className="input-control" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="fi-field">
                  <label className="fi-label">Gender <span className="fi-req">*</span></label>
                  <select className="input-control" value={gender} onChange={(e) => setGender(e.target.value as any)}>
                    <option value="-">— Select —</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="fi-field">
                  <label className="fi-label">Occupation / Work</label>
                  <input type="text" className="input-control" placeholder="e.g. Farmer"
                    value={occupation} onChange={(e) => setOccupation(e.target.value)} />
                </div>
              </div>

              {/* Contact — col 3 */}
              <div className="fi-rows">
                <div className="fi-field">
                  <label className="fi-label">Phone <span className="fi-req">*</span></label>
                  <input type="text" className="input-control" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="fi-field">
                  <div className="fi-label-sub">
                    <label className="fi-label">Age / Date of Birth</label>
                    <div className="fi-dob-toggle">
                      <button type="button"
                        className={`fi-dob-btn ${dobMode === 'dob' ? 'fi-dob-btn--active' : 'fi-dob-btn--inactive'}`}
                        onClick={() => setDobMode('dob')}>DOB</button>
                      <button type="button"
                        className={`fi-dob-btn ${dobMode === 'age' ? 'fi-dob-btn--active' : 'fi-dob-btn--inactive'}`}
                        onClick={() => setDobMode('age')}>AGE</button>
                    </div>
                  </div>
                  {dobMode === 'dob' ? (
                    <DobDatePicker isoValue={dobIso} displayValue={dob} onChange={handleDobPickerChange} error={dobError} />
                  ) : (
                    <div>
                      <input type="number" className="input-control" placeholder="Age in years (1–120)"
                        min={1} max={120} value={age} onChange={(e) => handleAgeInputChange(e.target.value)} />
                      {dobError && <small className="fi-error">{dobError}</small>}
                    </div>
                  )}
                </div>
                <div className="fi-field">
                  <label className="fi-label">Email</label>
                  <input type="email" className="input-control" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
            </div>

            {/* ID Proof */}
            <div className="fi-divider" />
            <IDProofInputFields
              idProof={idProof}
              idNumber={idNumber}
              extraPan={extraPan}
              docName={docName}
              onChange={(payload) => {
                setIdProof(payload.idProof);
                setIdNumber(payload.idNumber);
                setExtraPan(payload.extraPan || '');
                setDocName(payload.docName || '');
              }}
            />

            {/* Addresses */}
            <div className="fi-grid-2">
              <div className="fi-field">
                <label className="fi-label">Current Address <span className="fi-req">*</span></label>
                <textarea className="input-control" rows={2} value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)} />
              </div>
              <div className="fi-field">
                <label className="fi-label">Permanent Address</label>
                <textarea className="input-control" rows={2}
                  placeholder="Leave blank if same as current address"
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)} />
              </div>
            </div>

            {/* Location */}
            <CustomerLocation
              location={customerLocationData}
              onChange={setCustomerLocationData}
              onToast={(msg, type) => showToast(msg, type)}
            />

            {/* Nominee & Guarantor */}
            <div className="fi-rows">

              {/* Nominee */}
              <div>
                <label className="fi-checkbox-row">
                  <input type="checkbox" checked={hasNominee} onChange={(e) => setHasNominee(e.target.checked)} />
                  <span className="fi-checkbox-label"><span className="fi-checkbox-label-icon">👤</span> Do you have a Nominee?</span>
                </label>
                {hasNominee && (
                  <div className="fi-sub-panel fi-rows">
                    <div className="fi-grid-2">
                      <div className="fi-field">
                        <label className="fi-label">Nominee Name</label>
                        <input type="text" className="input-control" placeholder="Full name"
                          value={nomineeName} onChange={(e) => setNomineeName(e.target.value)} />
                      </div>
                      <div className="fi-field">
                        <OtherSelectField label="Relation" value={nomineeRelation} customValue={nomineeCustomRelation}
                          options={RELATION_OPTIONS} customPlaceholder="e.g. Uncle, Aunt, Cousin, Guardian"
                          customLabel="Specify Relation"
                          onChange={(val, custom) => { setNomineeRelation(val); setNomineeCustomRelation(custom); }}
                        />
                      </div>
                    </div>
                    {nomineeRelation === 'Other' && nomineeCustomRelation && null /* already handled inside OtherSelectField */}
                    <div className="fi-grid-4">
                      <div className="fi-field">
                        <label className="fi-label">Age</label>
                        <input type="number" className="input-control" placeholder="yrs"
                          value={nomineeAge} onChange={(e) => setNomineeAge(e.target.value)} />
                      </div>
                      <div className="fi-field">
                        <label className="fi-label">Phone</label>
                        <input type="text" className="input-control" placeholder="10-digit mobile"
                          value={nomineePhone} onChange={(e) => setNomineePhone(e.target.value)} />
                      </div>
                      <div className="fi-field">
                        <label className="fi-label">Aadhaar / ID No.</label>
                        <input type="text" className="input-control" placeholder="ID number"
                          value={nomineeIdNo} onChange={(e) => setNomineeIdNo(e.target.value)} />
                      </div>
                      <div className="fi-field">
                        <label className="fi-label">Address</label>
                        <input type="text" className="input-control" placeholder="Nominee address"
                          value={nomineeAddress} onChange={(e) => setNomineeAddress(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Guarantor */}
              <div>
                <label className="fi-checkbox-row">
                  <input type="checkbox" checked={hasGuarantor} onChange={(e) => setHasGuarantor(e.target.checked)} />
                  <span className="fi-checkbox-label"><span className="fi-checkbox-label-icon">🤝</span> Do you have a Guarantor?</span>
                </label>
                {hasGuarantor && (
                  <div className="fi-sub-panel fi-rows">
                    <div className="fi-grid-2">
                      <div className="fi-field">
                        <label className="fi-label">Guarantor Name</label>
                        <input type="text" className="input-control" placeholder="Full name"
                          value={guarantorName} onChange={(e) => setGuarantorName(e.target.value)} />
                      </div>
                      <div className="fi-field">
                        <OtherSelectField label="Relation" value={guarantorRelation} customValue={guarantorCustomRelation}
                          options={RELATION_OPTIONS} customPlaceholder="e.g. Uncle, Aunt, Cousin, Guardian"
                          customLabel="Specify Relation"
                          onChange={(val, custom) => { setGuarantorRelation(val); setGuarantorCustomRelation(custom); }}
                        />
                      </div>
                    </div>
                    <div className="fi-grid-4">
                      <div className="fi-field">
                        <label className="fi-label">Age</label>
                        <input type="number" className="input-control" placeholder="yrs"
                          value={guarantorAge} onChange={(e) => setGuarantorAge(e.target.value)} />
                      </div>
                      <div className="fi-field">
                        <label className="fi-label">Phone</label>
                        <input type="text" className="input-control" placeholder="10-digit mobile"
                          value={guarantorPhone} onChange={(e) => setGuarantorPhone(e.target.value)} />
                      </div>
                      <div className="fi-field">
                        <label className="fi-label">Aadhaar / ID No.</label>
                        <input type="text" className="input-control" placeholder="ID number"
                          value={guarantorIdNo} onChange={(e) => setGuarantorIdNo(e.target.value)} />
                      </div>
                      <div className="fi-field">
                        <label className="fi-label">Address</label>
                        <input type="text" className="input-control" placeholder="Guarantor address"
                          value={guarantorAddress} onChange={(e) => setGuarantorAddress(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* KYC Documents */}
              <DriveFileUpload
                label="KYC Documents (Secure Google Drive Upload)"
                category="kyc"
                customerId={selectedCustomerId || undefined}
                onUploadSuccess={(item: DriveFileItem) => setKycDocs((prev) => [...prev, item.name])}
                onFileDeleted={() => setKycDocs((prev) => prev.slice(0, -1))}
              />
            </div>
          </div>

          {/* SECTION 3 — FINANCIAL TERMS & DISBURSEMENT */}
          <FinancialTermsSection
            principal={principal}
            onPrincipalChange={setPrincipal}
            disbursementMethod={disbursementMethod}
            onDisbursementMethodChange={setDisbursementMethod}
            bankMode={bankMode}
            onBankModeChange={setBankMode}
            splitCashAmount={splitCashAmount}
            onSplitCashAmountChange={setSplitCashAmount}
            splitBankAmount={splitBankAmount}
            onSplitBankAmountChange={setSplitBankAmount}
            interestRate={interestRate}
            deductAdvanceInterest={deductAdvanceInterest}
            onDeductAdvanceInterestChange={setDeductAdvanceInterest}
            advanceDays={advanceDays}
            onAdvanceDaysChange={setAdvanceDays}
            advanceInterestAmount={advanceInterestAmount}
            advanceReceivingMethod={advanceReceivingMethod}
            onAdvanceReceivingMethodChange={setAdvanceReceivingMethod}
            cardFeeEnabled={cardFeeEnabled}
            onCardFeeEnabledChange={setCardFeeEnabled}
            cardFeeAmount={cardFeeAmount}
            onCardFeeAmountChange={setCardFeeAmount}
            cardFeeMode={cardFeeMode}
            onCardFeeModeChange={setCardFeeMode}
            cardFeeBankMode={cardFeeBankMode}
            onCardFeeBankModeChange={setCardFeeBankMode}
          />

          {/* SECTION 4 — GOLD ORNAMENT DETAILS */}
          <div className="fi-card">
            <div className="fi-section-header">
              <div className="fi-section-title-group">
                <span className="fi-section-icon">🢙</span>
                <div>
                  <h3 className="fi-section-title">Gold Ornament Details</h3>
                  <p className="fi-section-desc">Items pledged as collateral, weights, and purity</p>
                </div>
              </div>
              <button type="button" className="fi-btn-ghost" onClick={handleAddItem}>
                <Plus size={14} />
                Add Item
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
            <div className="fi-grid-3">
              <div className="fi-field">
                <label className="fi-label">Total Weight (g)</label>
                <input type="text" className="input-control" readOnly
                  value={totalNetWeight > 0 ? `${totalNetWeight.toFixed(3)} g` : 'auto'} />
              </div>

              <div className="fi-field">
                <label className="fi-label">Market Value (₹)</label>
                <input type="text" className="input-control" readOnly
                  value={marketValue > 0 ? `Estimated ₹${marketValue.toLocaleString('en-IN')}` : 'Estimated'} />
              </div>

              <div className="fi-field">
                <label className="fi-label">LTV %</label>
                <input type="text" className="input-control" readOnly
                  value={numericPrincipal > 0 && marketValue > 0 ? `${ltv}%` : ''} />
              </div>
            </div>

            {/* Additional Notes Textarea */}
            <div className="fi-field">
              <label className="fi-label">Additional Notes (Optional)</label>
              <textarea
                className="input-control fi-textarea"
                rows={2}
                placeholder="Any extra remarks about the pledged items"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
              />
            </div>

            {/* Ornament Photos Uploader */}
            <div className="fi-field">
              <label className="fi-label">Ornament Photos (up to 6)</label>
              <span className="fi-hint">
                {ornamentPhotos.length > 0 ? `${ornamentPhotos.length} photo(s) uploaded.` : 'No photos uploaded yet.'}
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
                {ornamentPhotos.map((photo, idx) => (
                  <div key={idx} className="fi-photo-tag">
                    <ImageIcon size={14} color="var(--color-primary-dark)" />
                    <span>{photo}</span>
                    <button type="button" onClick={() => setOrnamentPhotos(prev => prev.filter((_, i) => i !== idx))} className="fi-btn-icon">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button type="button" className="fi-btn-ghost" onClick={handlePhotoUpload}>
                  <Plus size={14} />
                  Add Photo
                </button>
              </div>
            </div>

          </div>

          {/* SECTION 5 — MONTHLY INTEREST HIGHLIGHT BOX & BUTTONS */}
          <div className="fi-interest-highlight">
            <div className="fi-interest-label">Monthly Interest</div>
            <div className="fi-interest-amount">
              ₹{monthlyInterest.toLocaleString('en-IN')} <span style={{ fontSize: '20px', fontWeight: 600 }}>/ mo</span>
            </div>
            <div className="fi-interest-sub">
              {interestRate}%/month (30-day cycle) on ₹{numericPrincipal.toLocaleString('en-IN')} = ₹{monthlyInterest.toLocaleString('en-IN')}/mo (interest only) · Penalty after 3 months
            </div>
          </div>

          {/* Submit Action Buttons */}
          <div className="fi-actions">
            <button type="submit" className="fi-btn-primary">
              Issue Loan &amp; Generate Receipt
            </button>
            <button type="button" className="fi-btn-secondary" onClick={handleClearForm}>
              Clear Form
            </button>
          </div>

          {/* SECTION 6 — RECENT LOANS TABLE */}
          <div className="fi-card">
            <div className="fi-section-header">
              <div className="fi-section-title-group">
                <span className="fi-section-icon">📜</span>
                <div>
                  <h3 className="fi-section-title">Recent Loans</h3>
                  <p className="fi-section-desc">Last 10 issued loans</p>
                </div>
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
