import React, { useState } from 'react';
import '../styles/LoanIssue.css';
import { useApp } from '../context/AppContext';
import { DatePicker } from '../components/common/DatePicker';
import { OtherSelectField, RELATION_OPTIONS, resolveRelation } from '../components/common/OtherSelectField';
import { FinancialTermsSection } from '../components/common/FinancialTermsSection';
import { OrnamentItem, PurityOption, Customer } from '../types';
import { formatIdProofDisplay } from '../utils/kycValidation';
import { WebcamCapture } from '../components/common/WebcamCapture';
import {
  Plus,
  Camera,
  Search,
  X,
  User,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Upload,
  Trash2,
  MapPin
} from 'lucide-react';

export const LoanIssue: React.FC = () => {
  const { customers, loans, receipts, addLoan, setCurrentPage, showToast, masterControlSettings } = useApp();

  // File Upload Ref & Lightbox State
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);

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

  // Customer Selection & Preview State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [custSearchQuery, setCustSearchQuery] = useState<string>('');
  const [showCustSuggestions, setShowCustSuggestions] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);



  // Nominee Collapsible State
  const [hasNominee, setHasNominee] = useState<boolean>(false);
  const [nomineePhoto, setNomineePhoto] = useState<string | null>(null);
  const [isNomineeWebcamOpen, setIsNomineeWebcamOpen] = useState<boolean>(false);
  const [nomineeName, setNomineeName] = useState<string>('');
  const [nomineePhone, setNomineePhone] = useState<string>('');
  const [nomineeGender, setNomineeGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [nomineeAgeMode, setNomineeAgeMode] = useState<'DOB' | 'AGE'>('DOB');
  const [nomineeDob, setNomineeDob] = useState<string>('');
  const [nomineeAge, setNomineeAge] = useState<string>('');
  const [nomineeRelation, setNomineeRelation] = useState<string>('Spouse');
  const [nomineeCustomRelation, setNomineeCustomRelation] = useState<string>('');
  const [nomineeOccupation, setNomineeOccupation] = useState<string>('');
  const [nomineeEmail, setNomineeEmail] = useState<string>('');
  const [nomineeIdProofType, setNomineeIdProofType] = useState<string>('Aadhaar');
  const [nomineeAadhaarNo, setNomineeAadhaarNo] = useState<string>('');
  const [nomineePanNo, setNomineePanNo] = useState<string>('');
  const [nomineeOtherIdName, setNomineeOtherIdName] = useState<string>('');
  const [nomineeOtherIdNo, setNomineeOtherIdNo] = useState<string>('');
  const [nomineeIdNo, setNomineeIdNo] = useState<string>('');
  const [nomineeAddress, setNomineeAddress] = useState<string>('');
  const [nomineePermanentAddress, setNomineePermanentAddress] = useState<string>('');
  const [nomineeSameAsCustomerAddress, setNomineeSameAsCustomerAddress] = useState<boolean>(false);
  const [nomineeLocation, setNomineeLocation] = useState<any>(null);
  const [isCapturingNomineeGps, setIsCapturingNomineeGps] = useState<boolean>(false);
  const [nomineeGpsInputUrl, setNomineeGpsInputUrl] = useState<string>('');

  const calculateAgeFromDob = (dobStr: string): number => {
    if (!dobStr) return 0;
    const parts = dobStr.includes('-') ? dobStr.split('-') : dobStr.split('/');
    let birthDate: Date;
    if (parts[0].length === 4) {
      birthDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      birthDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(0, age);
  };

  const handleToggleSameAsCustomerAddress = (checked: boolean) => {
    setNomineeSameAsCustomerAddress(checked);
    if (checked && selectedCustomer) {
      setNomineeAddress(selectedCustomer.currentAddress || '');
      setNomineePermanentAddress(selectedCustomer.permanentAddress || selectedCustomer.currentAddress || '');
    }
  };

  const handleNomineePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Nominee photo size must be less than 5 MB.', 'error');
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Please select a valid image file (JPG, JPEG, PNG, WEBP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setNomineePhoto(event.target?.result as string);
      showToast('Nominee photo uploaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureNomineeGps = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    setIsCapturingNomineeGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setNomineeLocation({
          latitude,
          longitude,
          accuracy,
          capturedAt: new Date().toISOString(),
          googleMapsUrl: mapsUrl
        });
        setIsCapturingNomineeGps(false);
        showToast('Nominee GPS location captured successfully!', 'success');
      },
      (err) => {
        setIsCapturingNomineeGps(false);
        showToast(err.message || 'Unable to capture GPS location.', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleApplyNomineeGpsUrl = () => {
    if (!nomineeGpsInputUrl.trim()) return;
    const match = nomineeGpsInputUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || nomineeGpsInputUrl.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      setNomineeLocation({
        latitude: lat,
        longitude: lng,
        accuracy: 10,
        capturedAt: new Date().toISOString(),
        googleMapsUrl: nomineeGpsInputUrl.trim()
      });
      showToast('Google Maps location saved for Nominee!', 'success');
    } else {
      setNomineeLocation({
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        capturedAt: new Date().toISOString(),
        googleMapsUrl: nomineeGpsInputUrl.trim()
      });
      showToast('Google Maps URL saved for Nominee!', 'success');
    }
  };

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

  // Canvas Image Compression Utility
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Multi-File Selection & Validation Handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (ornamentPhotos.length + files.length > 6) {
      showToast('Maximum 6 ornament photos allowed.', 'warning');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const newCompressedPhotos: string[] = [];

    for (const file of files) {
      if (!validTypes.includes(file.type.toLowerCase())) {
        showToast(`Please select a JPG, PNG, or WEBP image (${file.name}).`, 'error');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast(`Image size must be less than 5 MB (${file.name}).`, 'error');
        continue;
      }

      try {
        const compressedBase64 = await compressImage(file);
        newCompressedPhotos.push(compressedBase64);
      } catch (err) {
        showToast(`Failed to process image ${file.name}`, 'error');
      }
    }

    if (newCompressedPhotos.length > 0) {
      setOrnamentPhotos((prev) => [...prev, ...newCompressedPhotos]);
      showToast(`Uploaded ${newCompressedPhotos.length} ornament photo(s)`, 'success');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove Photo Handler
  const handleRemovePhoto = (index: number) => {
    setOrnamentPhotos((prev) => prev.filter((_, i) => i !== index));
    showToast('Ornament photo removed', 'info');
  };

  // Clear Form Handler
  const handleClearForm = () => {
    setSelectedCustomer(null);
    setCustSearchQuery('');
    const tDateObj = new Date();
    const tIso = `${tDateObj.getFullYear()}-${String(tDateObj.getMonth() + 1).padStart(2, '0')}-${String(tDateObj.getDate()).padStart(2, '0')}`;
    const tDisplay = tDateObj.toLocaleDateString('en-GB').replace(/\//g, '-');
    setLoanIssueDateIso(tIso);
    setLoanIssueDate(tDisplay);
    setLoanIssueDateError('');
    setHasNominee(false);
    setNomineeName('');
    setNomineeRelation('-');
    setNomineeCustomRelation('');
    setNomineeAge('');
    setNomineePhone('');
    setNomineeIdProofType('Aadhaar');
    setNomineeAadhaarNo('');
    setNomineePanNo('');
    setNomineeOtherIdName('');
    setNomineeOtherIdNo('');
    setNomineeIdNo('');
    setNomineeAddress('');
    setNomineeSameAsCustomerAddress(false);
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

    if (isSubmitting) return;

    if (!selectedCustomer) {
      showToast('Customer not found. Please select an existing customer before issuing a loan.', 'error');
      return;
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

    // Validate Nominee details when hasNominee is checked
    if (hasNominee) {
      if (!nomineeName.trim()) {
        showToast('Please enter the Nominee Full Name.', 'error');
        return;
      }
      if (nomineeRelation === '-' || !nomineeRelation) {
        showToast('Please select the Nominee Relation.', 'error');
        return;
      }
      if (nomineeRelation === 'Other' && !nomineeCustomRelation.trim()) {
        showToast('Please specify the custom Nominee relationship.', 'error');
        return;
      }
      const cleanPhone = nomineePhone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length !== 10) {
        showToast('Please enter a valid 10-digit Nominee Phone Number.', 'error');
        return;
      }

      if (nomineeIdProofType === 'Aadhaar') {
        const cleanAadhaar = nomineeAadhaarNo.replace(/\D/g, '');
        if (cleanAadhaar.length !== 12) {
          showToast('Please enter a valid 12-digit Aadhaar number for Nominee.', 'error');
          return;
        }
      } else if (nomineeIdProofType === 'PAN') {
        const panUpper = nomineePanNo.trim().toUpperCase();
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panUpper)) {
          showToast('Please enter a valid 10-character PAN number (e.g. ABCDE1234F) for Nominee.', 'error');
          return;
        }
      } else if (nomineeIdProofType === 'Aadhaar + PAN') {
        const cleanAadhaar = nomineeAadhaarNo.replace(/\D/g, '');
        const panUpper = nomineePanNo.trim().toUpperCase();
        if (cleanAadhaar.length !== 12) {
          showToast('Please enter a valid 12-digit Aadhaar number for Nominee.', 'error');
          return;
        }
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panUpper)) {
          showToast('Please enter a valid 10-character PAN number for Nominee.', 'error');
          return;
        }
      } else if (nomineeIdProofType === 'Other') {
        if (!nomineeOtherIdName.trim()) {
          showToast('Please enter the Other ID Name for Nominee.', 'error');
          return;
        }
        if (!nomineeOtherIdNo.trim()) {
          showToast('Please enter the Other ID Number for Nominee.', 'error');
          return;
        }
      } else {
        if (!nomineeIdNo.trim()) {
          showToast(`Please enter the Nominee ${nomineeIdProofType} Number.`, 'error');
          return;
        }
      }

      if (!nomineeAddress.trim()) {
        showToast('Please enter the Nominee Address.', 'error');
        return;
      }
    }

    if (hasGuarantor && guarantorRelation === 'Other' && !guarantorCustomRelation.trim()) {
      showToast('Please specify the guarantor relationship.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const effectiveCardFee = cardFeeEnabled ? cardFeeAmount : 0;
      const finalDisbursedAmount = Math.max(
        0,
        numericPrincipal - (deductAdvanceInterest ? advanceInterestAmount : 0) - effectiveCardFee
      );

      const created = addLoan({
        receiptBillNo,
        loanNo,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerGender: (selectedCustomer.gender as any) || 'Male',
        customerAge: selectedCustomer.age || 30,
        customerOccupation: selectedCustomer.occupation || 'Self Employed',
        customerEmail: selectedCustomer.email,
        customerPhotoUrl: selectedCustomer.customerPhoto || undefined,
        customerCurrentAddress: selectedCustomer.currentAddress,
        customerPermanentAddress: selectedCustomer.permanentAddress || selectedCustomer.currentAddress,
        customerLocation: selectedCustomer.currentLocation
          ? {
              captured: true,
              coordinates: `${(selectedCustomer.currentLocation as any).latitude || ''}, ${(selectedCustomer.currentLocation as any).longitude || ''}`,
              mapsUrl: (selectedCustomer.currentLocation as any).googleMapsUrl || (selectedCustomer.currentLocation as any).mapsUrl || '',
              addressSummary: selectedCustomer.currentAddress
            }
          : undefined,
        nominee: hasNominee
          ? {
            hasNominee: true,
            enabled: true,
            name: nomineeName.trim(),
            fullName: nomineeName.trim(),
            relationship: resolveRelation(nomineeRelation, nomineeCustomRelation),
            relation: nomineeRelation,
            customRelation: nomineeRelation === 'Other' ? nomineeCustomRelation.trim() || null : null,
            phone: nomineePhone.trim(),
            gender: nomineeGender,
            ageMode: nomineeAgeMode,
            dateOfBirth: nomineeDob,
            age: Number(nomineeAge) || undefined,
            occupation: nomineeOccupation.trim() || undefined,
            email: nomineeEmail.trim() || undefined,
            photo: nomineePhoto || null,
            idProofType: nomineeIdProofType,
            idProofNumber: nomineeIdProofType === 'Aadhaar'
              ? nomineeAadhaarNo.replace(/\D/g, '')
              : nomineeIdProofType === 'PAN'
              ? nomineePanNo.trim().toUpperCase()
              : nomineeIdProofType === 'Aadhaar + PAN'
              ? `Aadhaar: ${nomineeAadhaarNo.replace(/\D/g, '')}, PAN: ${nomineePanNo.trim().toUpperCase()}`
              : nomineeIdProofType === 'Other'
              ? `${nomineeOtherIdName.trim()}: ${nomineeOtherIdNo.trim()}`
              : nomineeIdNo.trim(),
            aadhaarNumber: (nomineeIdProofType === 'Aadhaar' || nomineeIdProofType === 'Aadhaar + PAN') ? nomineeAadhaarNo.replace(/\D/g, '') : undefined,
            panNumber: (nomineeIdProofType === 'PAN' || nomineeIdProofType === 'Aadhaar + PAN') ? nomineePanNo.trim().toUpperCase() : undefined,
            otherIdName: nomineeIdProofType === 'Other' ? nomineeOtherIdName.trim() : undefined,
            otherIdNumber: nomineeIdProofType === 'Other' ? nomineeOtherIdNo.trim() : undefined,
            idProof: {
              type: nomineeIdProofType,
              aadhaarNumber: (nomineeIdProofType === 'Aadhaar' || nomineeIdProofType === 'Aadhaar + PAN') ? nomineeAadhaarNo.replace(/\D/g, '') : undefined,
              panNumber: (nomineeIdProofType === 'PAN' || nomineeIdProofType === 'Aadhaar + PAN') ? nomineePanNo.trim().toUpperCase() : undefined,
              otherIdName: nomineeIdProofType === 'Other' ? nomineeOtherIdName.trim() : undefined,
              otherIdNumber: nomineeIdProofType === 'Other' ? nomineeOtherIdNo.trim() : undefined,
              idNumber: nomineeIdNo.trim()
            },
            address: nomineeAddress.trim(),
            currentAddress: nomineeAddress.trim(),
            permanentAddress: nomineePermanentAddress.trim() || undefined,
            isSameAddress: nomineeSameAsCustomerAddress,
            location: nomineeLocation
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
        kycDocuments: selectedCustomer.kycDocumentDriveIds || [],
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

      if (created) {
        showToast(`Loan ${loanNo} issued successfully!`, 'success');
        setCurrentPage('all-receipts');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-content fi-page">

      {/* PAGE HEADER */}
      <div className="fi-page-header">
        <div>
          <h1 className="fi-page-title">Loan Issue</h1>
          <p className="fi-page-subtitle">Issue new loans and manage existing loan creation.</p>
        </div>
      </div>

      {/* ISSUE NEW LOAN FORM */}
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
            </div>
          </div>

          {/* SECTION 1 — CUSTOMER SELECTION & READ-ONLY PREVIEW */}
          <div className="fi-card">
            <div className="fi-section-header">
              <div className="fi-section-title-group">
                <span className="fi-section-icon">🔍</span>
                <div>
                  <h2 className="fi-section-title">Customer Selection</h2>
                  <p className="fi-section-desc">Search and select an existing borrower by Customer ID, Name, or Mobile Number</p>
                </div>
              </div>
            </div>

            <div className="fi-rows">
              <div className="fi-field" style={{ position: 'relative' }}>
                <label className="fi-label">Search Customer <span className="fi-req">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="input-control"
                    style={{ paddingLeft: '38px', height: '42px', fontSize: '13.5px' }}
                    placeholder="Search by Customer ID (e.g. CUST-0001), Name, or Mobile Number..."
                    value={custSearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustSearchQuery(val);
                      setShowCustSuggestions(true);

                      const normVal = val.trim().toLowerCase();
                      if (normVal) {
                        const match = customers.find(c => !c.isDeleted && (
                          c.id.toLowerCase() === normVal ||
                          (c.customerId && c.customerId.toString() === normVal) ||
                          (c.phone && c.phone.replace(/\D/g, '').slice(-10) === normVal.replace(/\D/g, '').slice(-10))
                        ));
                        if (match) {
                          setSelectedCustomer(match);
                        }
                      }
                    }}
                    onFocus={() => setShowCustSuggestions(true)}
                  />
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>

                {/* Auto Suggestions Dropdown */}
                {showCustSuggestions && custSearchQuery.trim() && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      backgroundColor: '#ffffff',
                      border: '1px solid var(--border-light, #cbd5e1)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      marginTop: '4px'
                    }}
                  >
                    {customers
                      .filter(c => !c.isDeleted)
                      .filter(c => {
                        const q = custSearchQuery.toLowerCase().trim();
                        return (
                          c.name.toLowerCase().includes(q) ||
                          c.phone.includes(q) ||
                          c.id.toLowerCase().includes(q) ||
                          (c.customerId && c.customerId.toString() === q)
                        );
                      })
                      .length === 0 ? (
                      <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-danger, #ef4444)', fontWeight: 600 }}>
                        ⚠ Customer not found. Please enter a valid Customer ID or search for an existing customer.
                      </div>
                    ) : (
                      customers
                        .filter(c => !c.isDeleted)
                        .filter(c => {
                          const q = custSearchQuery.toLowerCase().trim();
                          return (
                            c.name.toLowerCase().includes(q) ||
                            c.phone.includes(q) ||
                            c.id.toLowerCase().includes(q) ||
                            (c.customerId && c.customerId.toString() === q)
                          );
                        })
                        .map((c, idx) => (
                          <div
                            key={`sug-${c.id}-${idx}`}
                            style={{
                              padding: '10px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border-subtle, #f1f5f9)'
                            }}
                            onClick={() => {
                              setSelectedCustomer(c);
                              setCustSearchQuery(`${c.name} (${c.id})`);
                              setShowCustSuggestions(false);
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {c.customerPhoto ? (
                                <img src={c.customerPhoto} alt={c.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-light-accent)', color: 'var(--color-primary-dark)', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <strong style={{ fontSize: '13.5px', color: 'var(--text-dark)' }}>{c.name}</strong>
                                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block' }}>+91 {c.phone}</span>
                              </div>
                            </div>
                            <span className="badge badge-success" style={{ fontSize: '11px' }}>{c.id}</span>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>

              {/* Customer Not Found Warning Banner */}
              {!selectedCustomer && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', color: '#991b1b', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <span>⚠ Customer not found. Please enter a valid Customer ID or search for an existing customer.</span>
                </div>
              )}

              {/* READ-ONLY CUSTOMER PREVIEW CARD */}
              {selectedCustomer && (
                <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light, #cbd5e1)', backgroundColor: '#ffffff', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)', marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle, #e2e8f0)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(5, 150, 105, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-dark, #059669)' }}>
                        <User size={18} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-dark, #0f172a)' }}>
                            👤 CUSTOMER SELECTED
                          </h3>
                          <span className="badge badge-success" style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 700 }}>
                            ✓ Existing Customer Selected
                          </span>
                        </div>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>Read-Only Borrower KYC Profile linked by Customer ID</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11.5px', padding: '4px 12px', gap: '6px' }}
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustSearchQuery('');
                      }}
                    >
                      <X size={14} />
                      <span>Change Customer</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: '20px', alignItems: 'start' }}>
                    {/* Col 1: Photo & ID */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      {selectedCustomer.customerPhoto ? (
                        <img
                          src={selectedCustomer.customerPhoto}
                          alt={selectedCustomer.name}
                          style={{ width: '110px', height: '120px', borderRadius: '10px', objectFit: 'cover', border: '2px solid var(--color-primary-accent, #059669)', marginBottom: '8px' }}
                        />
                      ) : (
                        <div style={{ width: '110px', height: '120px', borderRadius: '10px', backgroundColor: 'var(--color-light-accent, #e6f4f1)', color: 'var(--color-primary-dark, #163f35)', fontSize: '36px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                          {selectedCustomer.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <strong style={{ fontSize: '15px', color: 'var(--text-dark, #0f172a)' }}>{selectedCustomer.name}</strong>
                      <span className="badge badge-success" style={{ marginTop: '4px', fontSize: '11.5px', fontWeight: 700 }}>
                        {selectedCustomer.id}
                      </span>
                    </div>

                    {/* Col 2: Personal Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted, #64748b)', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>📱 PHONE</span>
                        <strong style={{ fontSize: '13.5px', color: 'var(--text-dark)' }}>+91 {selectedCustomer.phone}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted, #64748b)', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>👤 GENDER</span>
                        <span className="badge badge-info" style={{ fontSize: '11px' }}>{selectedCustomer.gender || 'Male'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted, #64748b)', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>🎂 AGE / DATE OF BIRTH</span>
                        <strong style={{ color: 'var(--text-dark)' }}>
                          {selectedCustomer.dateOfBirth ? `DOB: ${selectedCustomer.dateOfBirth}` : `${selectedCustomer.age || 30} Years`}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted, #64748b)', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>💼 OCCUPATION</span>
                        <span>{selectedCustomer.occupation || 'Self Employed'}</span>
                      </div>
                    </div>

                    {/* Col 3: ID Proof, Addresses & Location */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted, #64748b)', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>🪪 ID PROOF</span>
                        <strong style={{ color: 'var(--color-primary-dark)' }}>{selectedCustomer.idProof}: </strong>
                        <span>{formatIdProofDisplay(selectedCustomer.idProof, selectedCustomer.idNumber)}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted, #64748b)', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>📍 CURRENT ADDRESS</span>
                        <span>{selectedCustomer.currentAddress || 'Saved Address'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted, #64748b)', display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>🏠 PERMANENT ADDRESS</span>
                        <span>{selectedCustomer.permanentAddress || selectedCustomer.currentAddress || 'Same as Current'}</span>
                      </div>
                      {((selectedCustomer.currentLocation as any)?.googleMapsUrl || (selectedCustomer.currentLocation as any)?.mapsUrl || (selectedCustomer.location as any)?.googleMapsUrl) && (
                        <div style={{ marginTop: '4px' }}>
                          <a
                            href={(selectedCustomer.currentLocation as any)?.googleMapsUrl || (selectedCustomer.currentLocation as any)?.mapsUrl || (selectedCustomer.location as any)?.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '4px 10px', gap: '6px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                          >
                            <span>🔗 View Saved Location on Map</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* NOMINEE & GUARANTOR SECTION */}
          <div className="fi-card">
            <div className="fi-section-header">
              <div className="fi-section-title-group">
                <span className="fi-section-icon">🤝</span>
                <div>
                  <h3 className="fi-section-title">Nominee &amp; Guarantor Details</h3>
                  <p className="fi-section-desc">Optional nominee &amp; guarantor information for the loan</p>
                </div>
              </div>
            </div>

            {/* Nominee & Guarantor */}
            <div className="fi-rows">

              {/* Nominee */}
              <div>
                <label className="fi-checkbox-row">
                  <input type="checkbox" checked={hasNominee} onChange={(e) => setHasNominee(e.target.checked)} />
                  <span className="fi-checkbox-label"><span className="fi-checkbox-label-icon">👤</span> Do you have a Nominee?</span>
                </label>
                {hasNominee && (
                  <div className="fi-sub-panel fi-rows" style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-light, #e2e8f0)', padding: '20px', borderRadius: '12px', marginTop: '12px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-primary-dark)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={16} /> 1. NOMINEE PHOTO &amp; PERSONAL INFORMATION
                    </div>

                    {/* ROW 1: NOMINEE PHOTO & BASIC DETAILS */}
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '16px' }}>
                      {/* NOMINEE PHOTO UPLOAD & WEBCAM */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '50%', border: '2px dashed var(--border-light, #cbd5e1)', overflow: 'hidden', backgroundColor: 'var(--bg-surface-secondary, #f8fafc)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {nomineePhoto ? (
                            <img src={nomineePhoto} alt="Nominee Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', padding: '4px' }}>
                              <Camera size={24} style={{ margin: '0 auto 4px auto', display: 'block', opacity: 0.5 }} />
                              <span>Nominee Photo</span>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', height: '28px', padding: '0 8px', gap: '4px' }}
                            onClick={() => setIsNomineeWebcamOpen(true)}
                          >
                            <Camera size={12} />
                            <span>Webcam</span>
                          </button>

                          <label className="btn btn-secondary btn-sm" style={{ fontSize: '11px', height: '28px', padding: '0 8px', gap: '4px', cursor: 'pointer', margin: 0 }}>
                            <Upload size={12} />
                            <span>Upload</span>
                            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: 'none' }} onChange={handleNomineePhotoFileUpload} />
                          </label>

                          {nomineePhoto && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '11px', height: '28px', padding: '0 6px', color: 'var(--color-danger, #ef4444)' }}
                              onClick={() => setNomineePhoto(null)}
                              title="Remove Photo"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* NAME & MOBILE NUMBER */}
                      <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div className="fi-grid-2">
                          <div className="fi-field">
                            <label className="fi-label">NOMINEE FULL NAME <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                            <input
                              type="text"
                              className="input-control"
                              placeholder="Enter nominee full name"
                              value={nomineeName}
                              onChange={(e) => setNomineeName(e.target.value)}
                            />
                          </div>

                          <div className="fi-field">
                            <label className="fi-label">MOBILE NUMBER <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <span className="input-control readonly" style={{ width: '50px', textAlign: 'center', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>
                                +91
                              </span>
                              <input
                                type="text"
                                className="input-control"
                                placeholder="10-digit mobile number"
                                maxLength={10}
                                value={nomineePhone}
                                onChange={(e) => setNomineePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              />
                            </div>
                          </div>
                        </div>

                        {/* GENDER & AGE / DOB */}
                        <div className="fi-grid-2">
                          <div className="fi-field">
                            <label className="fi-label">GENDER <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                            <select
                              className="select-control input-control"
                              value={nomineeGender}
                              onChange={(e) => setNomineeGender(e.target.value as any)}
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div className="fi-field">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <label className="fi-label" style={{ margin: 0 }}>AGE / DATE OF BIRTH</label>
                              <div style={{ display: 'inline-flex', backgroundColor: 'var(--bg-surface-secondary, #f1f5f9)', borderRadius: '6px', padding: '2px' }}>
                                <button
                                  type="button"
                                  style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', border: 'none', backgroundColor: nomineeAgeMode === 'DOB' ? 'var(--color-primary-dark, #047857)' : 'transparent', color: nomineeAgeMode === 'DOB' ? '#ffffff' : 'var(--text-muted)', cursor: 'pointer' }}
                                  onClick={() => setNomineeAgeMode('DOB')}
                                >
                                  DOB
                                </button>
                                <button
                                  type="button"
                                  style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', border: 'none', backgroundColor: nomineeAgeMode === 'AGE' ? 'var(--color-primary-dark, #047857)' : 'transparent', color: nomineeAgeMode === 'AGE' ? '#ffffff' : 'var(--text-muted)', cursor: 'pointer' }}
                                  onClick={() => setNomineeAgeMode('AGE')}
                                >
                                  AGE
                                </button>
                              </div>
                            </div>

                            {nomineeAgeMode === 'DOB' ? (
                              <div>
                                <input
                                  type="date"
                                  className="input-control"
                                  value={nomineeDob}
                                  onChange={(e) => {
                                    const dobVal = e.target.value;
                                    setNomineeDob(dobVal);
                                    if (dobVal) {
                                      const calculatedYears = calculateAgeFromDob(dobVal);
                                      setNomineeAge(calculatedYears ? calculatedYears.toString() : '');
                                    }
                                  }}
                                />
                                {nomineeAge && (
                                  <span style={{ fontSize: '11px', color: 'var(--color-primary-accent, #059669)', fontWeight: 700, marginTop: '2px', display: 'block' }}>
                                    Calculated Age: {nomineeAge} Years
                                  </span>
                                )}
                              </div>
                            ) : (
                              <input
                                type="number"
                                className="input-control"
                                placeholder="Enter age (1 - 120)"
                                min={1}
                                max={120}
                                value={nomineeAge}
                                onChange={(e) => setNomineeAge(e.target.value)}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ROW 2: RELATIONSHIP & OCCUPATION & EMAIL */}
                    <div className="fi-grid-2" style={{ marginBottom: '14px' }}>
                      <div className="fi-field">
                        <OtherSelectField
                          label="RELATIONSHIP WITH CUSTOMER *"
                          value={nomineeRelation}
                          customValue={nomineeCustomRelation}
                          options={RELATION_OPTIONS}
                          customPlaceholder="Specify relationship (e.g. Uncle, Aunt)"
                          customLabel="OTHER RELATIONSHIP *"
                          onChange={(val, custom) => { setNomineeRelation(val); setNomineeCustomRelation(custom); }}
                        />
                      </div>

                      <div className="fi-field">
                        <label className="fi-label">OCCUPATION</label>
                        <input
                          type="text"
                          className="input-control"
                          placeholder="e.g. Farmer, Student, Business"
                          value={nomineeOccupation}
                          onChange={(e) => setNomineeOccupation(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="fi-field" style={{ marginBottom: '16px' }}>
                      <label className="fi-label">EMAIL ADDRESS</label>
                      <input
                        type="email"
                        className="input-control"
                        placeholder="nominee@email.com"
                        value={nomineeEmail}
                        onChange={(e) => setNomineeEmail(e.target.value)}
                      />
                    </div>

                    {/* SECTION 2: IDENTITY VERIFICATION */}
                    <div style={{ borderTop: '1px solid var(--border-light, #e2e8f0)', paddingTop: '16px', marginTop: '16px' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-primary-dark)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
                        2. IDENTITY VERIFICATION / KYC
                      </div>

                      <div className="fi-grid-2" style={{ marginBottom: '14px' }}>
                        <div className="fi-field">
                          <label className="fi-label">ID PROOF TYPE <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                          <select
                            className="select-control input-control"
                            value={nomineeIdProofType}
                            onChange={(e) => setNomineeIdProofType(e.target.value)}
                          >
                            <option value="Aadhaar">Aadhaar</option>
                            <option value="PAN">PAN</option>
                            <option value="Aadhaar + PAN">Aadhaar + PAN</option>
                            <option value="Voter ID">Voter ID</option>
                            <option value="Driving Licence">Driving Licence</option>
                            <option value="Passport">Passport</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        {nomineeIdProofType === 'Aadhaar' && (
                          <div className="fi-field">
                            <label className="fi-label">AADHAAR NUMBER <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                            <input
                              type="text"
                              className="input-control"
                              placeholder="Enter 12-digit Aadhaar number"
                              maxLength={12}
                              value={nomineeAadhaarNo}
                              onChange={(e) => setNomineeAadhaarNo(e.target.value.replace(/\D/g, '').slice(0, 12))}
                            />
                          </div>
                        )}

                        {nomineeIdProofType === 'PAN' && (
                          <div className="fi-field">
                            <label className="fi-label">PAN NUMBER <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                            <input
                              type="text"
                              className="input-control"
                              placeholder="Enter PAN number (e.g. ABCDE1234F)"
                              maxLength={10}
                              style={{ textTransform: 'uppercase' }}
                              value={nomineePanNo}
                              onChange={(e) => setNomineePanNo(e.target.value.toUpperCase().slice(0, 10))}
                            />
                          </div>
                        )}

                        {(nomineeIdProofType === 'Voter ID' || nomineeIdProofType === 'Driving Licence' || nomineeIdProofType === 'Passport') && (
                          <div className="fi-field">
                            <label className="fi-label">{nomineeIdProofType.toUpperCase()} NUMBER <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                            <input
                              type="text"
                              className="input-control"
                              placeholder={`Enter ${nomineeIdProofType} number`}
                              value={nomineeIdNo}
                              onChange={(e) => setNomineeIdNo(e.target.value)}
                            />
                          </div>
                        )}
                      </div>

                      {nomineeIdProofType === 'Aadhaar + PAN' && (
                        <div className="fi-grid-2" style={{ marginBottom: '14px' }}>
                          <div className="fi-field">
                            <label className="fi-label">AADHAAR NUMBER <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                            <input
                              type="text"
                              className="input-control"
                              placeholder="Enter 12-digit Aadhaar number"
                              maxLength={12}
                              value={nomineeAadhaarNo}
                              onChange={(e) => setNomineeAadhaarNo(e.target.value.replace(/\D/g, '').slice(0, 12))}
                            />
                          </div>

                          <div className="fi-field">
                            <label className="fi-label">PAN NUMBER <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                            <input
                              type="text"
                              className="input-control"
                              placeholder="Enter PAN number (e.g. ABCDE1234F)"
                              maxLength={10}
                              style={{ textTransform: 'uppercase' }}
                              value={nomineePanNo}
                              onChange={(e) => setNomineePanNo(e.target.value.toUpperCase().slice(0, 10))}
                            />
                          </div>
                        </div>
                      )}

                      {nomineeIdProofType === 'Other' && (
                        <div className="fi-grid-2" style={{ marginBottom: '14px' }}>
                          <div className="fi-field">
                            <label className="fi-label">OTHER ID NAME <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                            <input
                              type="text"
                              className="input-control"
                              placeholder="e.g. Ration Card, Govt ID"
                              value={nomineeOtherIdName}
                              onChange={(e) => setNomineeOtherIdName(e.target.value)}
                            />
                          </div>

                          <div className="fi-field">
                            <label className="fi-label">OTHER ID NUMBER <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                            <input
                              type="text"
                              className="input-control"
                              placeholder="Enter ID number"
                              value={nomineeOtherIdNo}
                              onChange={(e) => setNomineeOtherIdNo(e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 3: ADDRESS DETAILS */}
                    <div style={{ borderTop: '1px solid var(--border-light, #e2e8f0)', paddingTop: '16px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-primary-dark)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          3. RESIDENTIAL ADDRESS
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--color-primary-dark)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={nomineeSameAsCustomerAddress}
                            onChange={(e) => handleToggleSameAsCustomerAddress(e.target.checked)}
                          />
                          <span>Same as Customer Current Address</span>
                        </label>
                      </div>

                      <div className="fi-field" style={{ marginBottom: '14px' }}>
                        <label className="fi-label">CURRENT ADDRESS <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                        <textarea
                          className="input-control"
                          rows={2}
                          placeholder="Enter nominee complete current residential address"
                          value={nomineeAddress}
                          onChange={(e) => setNomineeAddress(e.target.value)}
                        />
                      </div>

                      <div className="fi-field" style={{ marginBottom: '14px' }}>
                        <label className="fi-label">PERMANENT ADDRESS</label>
                        <textarea
                          className="input-control"
                          rows={2}
                          placeholder="Enter nominee permanent residential address"
                          value={nomineePermanentAddress}
                          onChange={(e) => setNomineePermanentAddress(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* SECTION 4: LOCATION / GPS */}
                    <div style={{ borderTop: '1px solid var(--border-light, #e2e8f0)', paddingTop: '16px', marginTop: '16px' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-primary-dark)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                        4. NOMINEE LOCATION (OPTIONAL)
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={isCapturingNomineeGps}
                          onClick={handleCaptureNomineeGps}
                          style={{ gap: '6px', fontSize: '12px', height: '34px', fontWeight: 700 }}
                        >
                          <MapPin size={14} />
                          <span>{isCapturingNomineeGps ? 'Capturing GPS...' : '📍 Capture GPS Location'}</span>
                        </button>

                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>OR</span>

                        <div style={{ flex: 1, minWidth: '240px', display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            className="input-control"
                            style={{ height: '34px', fontSize: '12px' }}
                            placeholder="Paste Google Maps URL"
                            value={nomineeGpsInputUrl}
                            onChange={(e) => setNomineeGpsInputUrl(e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ height: '34px', fontSize: '12px', flexShrink: 0 }}
                            onClick={handleApplyNomineeGpsUrl}
                          >
                            Save Map URL
                          </button>
                        </div>
                      </div>

                      {nomineeLocation && (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--color-primary-dark)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>✓ Nominee Location Saved (Lat: {nomineeLocation.latitude}, Lng: {nomineeLocation.longitude})</span>
                          {nomineeLocation.googleMapsUrl && (
                            <a href={nomineeLocation.googleMapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary-accent)', fontWeight: 700, textDecoration: 'underline' }}>
                              Open Map 🗺️
                            </a>
                          )}
                        </div>
                      )}
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

            {/* Hidden native file picker */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {/* Ornament Photos Uploader */}
            <div className="fi-field" style={{ marginTop: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="fi-label">ORNAMENT PHOTOS (UP TO 6)</label>
                <span className="badge badge-info" style={{ fontSize: '11px' }}>
                  {ornamentPhotos.length} / 6 Photos Uploaded
                </span>
              </div>
              <p className="fi-hint" style={{ margin: '0 0 12px 0' }}>
                Upload clear photos of the pledged gold/ornaments for verification and record keeping (JPG, PNG, WEBP - Max 5 MB each).
              </p>

              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {/* Photo Thumbnails */}
                {ornamentPhotos.map((photoUrl, idx) => (
                  <div
                    key={`ornament-photo-${idx}`}
                    style={{
                      position: 'relative',
                      width: '110px',
                      height: '110px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '2px solid var(--border-light, #e2e8f0)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <img
                      src={photoUrl}
                      alt={`Ornament Photo ${idx + 1}`}
                      onClick={() => setPreviewImageIndex(idx)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '3px 0',
                        textAlign: 'center'
                      }}
                    >
                      Photo {idx + 1}
                    </div>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePhoto(idx);
                      }}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(239, 68, 68, 0.9)',
                        color: '#ffffff',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                      title="Remove Photo"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {/* Add Photo Button */}
                {ornamentPhotos.length < 6 ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '110px',
                      height: '110px',
                      borderRadius: '10px',
                      border: '2px dashed var(--color-primary-accent, #059669)',
                      backgroundColor: 'var(--bg-surface-secondary, #f8fafc)',
                      color: 'var(--color-primary-dark, #163f35)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '12px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Camera size={22} color="var(--color-primary-accent)" />
                    <span>+ Add Photo</span>
                  </button>
                ) : (
                  <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
                    Maximum 6 photos allowed.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* LIGHTBOX PREVIEW MODAL */}
          {previewImageIndex !== null && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.88)',
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
              }}
              onClick={() => setPreviewImageIndex(null)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'relative',
                  maxWidth: '90vw',
                  maxHeight: '85vh',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <button
                  type="button"
                  onClick={() => setPreviewImageIndex(null)}
                  style={{
                    position: 'absolute',
                    top: '-40px',
                    right: 0,
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '24px',
                    cursor: 'pointer'
                  }}
                >
                  <X size={28} />
                </button>

                <img
                  src={ornamentPhotos[previewImageIndex]}
                  alt={`Preview ${previewImageIndex + 1}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '75vh',
                    borderRadius: '8px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                    objectFit: 'contain'
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '16px', color: '#ffffff' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={previewImageIndex === 0}
                    onClick={() => setPreviewImageIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
                    style={{ opacity: previewImageIndex === 0 ? 0.5 : 1 }}
                  >
                    <ChevronLeft size={16} />
                    <span>Previous</span>
                  </button>

                  <span style={{ fontSize: '13px', fontWeight: 700 }}>
                    Photo {previewImageIndex + 1} of {ornamentPhotos.length}
                  </span>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={previewImageIndex === ornamentPhotos.length - 1}
                    onClick={() => setPreviewImageIndex((prev) => (prev !== null && prev < ornamentPhotos.length - 1 ? prev + 1 : prev))}
                    style={{ opacity: previewImageIndex === ornamentPhotos.length - 1 ? 0.5 : 1 }}
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

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
            <button type="submit" className="fi-btn-primary" disabled={isSubmitting || !selectedCustomer}>
              {isSubmitting ? 'Processing Loan...' : 'Issue Loan & Generate Receipt'}
            </button>
            <button type="button" className="fi-btn-secondary" onClick={handleClearForm} disabled={isSubmitting}>
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
                    {loans.slice(0, 10).map((l, idx) => (
                      <tr key={`recent-loan-${l.id}-${idx}`}>
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

      {/* WEBCAM CAPTURE MODAL FOR NOMINEE */}
      <WebcamCapture
        isOpen={isNomineeWebcamOpen}
        onClose={() => setIsNomineeWebcamOpen(false)}
        onCapture={(_file, dataUrl) => {
          setNomineePhoto(dataUrl);
          setIsNomineeWebcamOpen(false);
          showToast('Nominee photo captured via webcam!', 'success');
        }}
      />
    </div>
  );
};
