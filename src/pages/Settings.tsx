import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Save, Percent, Building, Shield, Printer } from 'lucide-react';

export const Settings: React.FC = () => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'branch' | 'financial' | 'security' | 'printer'>('branch');

  const [branchName, setBranchName] = useState('KKV GOLD FINANCE - MAIN BRANCH');
  const [address, setAddress] = useState('104 G.S.T Road, Chennai - 600045');
  const [phone, setPhone] = useState('+91 44 2233 4455');
  const [gstin, setGstin] = useState('33AAAAA0000A1Z5');
  const [goldRate22ct, setGoldRate22ct] = useState('6400');
  const [defaultInterestRate, setDefaultInterestRate] = useState('2.0');
  const [cardFeeAmount, setCardFeeAmount] = useState('10');
  const [printerFormat, setPrinterFormat] = useState('A4 Laser Standard');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Branch settings saved successfully!', 'success');
  };

  return (
    <div className="page-content">
      {/* Settings Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
        <button
          className={`btn btn-sm ${activeTab === 'branch' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('branch')}
        >
          <Building size={14} />
          <span>Branch Profile</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'financial' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('financial')}
        >
          <Percent size={14} />
          <span>Gold Rates &amp; Rates</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'printer' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('printer')}
        >
          <Printer size={14} />
          <span>Voucher Printer</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'security' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('security')}
        >
          <Shield size={14} />
          <span>Security &amp; Staff</span>
        </button>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {activeTab === 'branch' && (
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <Building size={18} color="var(--color-primary-accent)" />
                  <span>Branch &amp; Company Profile</span>
                </h2>
                <p className="card-description">Official header details displayed on disbursement receipts and FD certificates</p>
              </div>
              <span className="badge badge-success">Branch #01 Active</span>
            </div>

            <div className="grid-2" style={{ marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label required">Branch Business Title</label>
                <input
                  type="text"
                  className="input-control"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Official Phone</label>
                <input
                  type="text"
                  className="input-control"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">Branch Address &amp; Pincode</label>
                <input
                  type="text"
                  className="input-control"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">GSTIN / Registration No</label>
                <input
                  type="text"
                  className="input-control"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <Percent size={18} color="var(--color-primary-accent)" />
                  <span>Gold Rate &amp; Default Lending Parameters</span>
                </h2>
                <p className="card-description">Live reference valuation per gram, interest rates, and loan processing fees</p>
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label required">22ct Gold Rate (₹ / Gram)</label>
                <input
                  type="number"
                  className="input-control"
                  value={goldRate22ct}
                  onChange={(e) => setGoldRate22ct(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Default Monthly Interest (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input-control"
                  value={defaultInterestRate}
                  onChange={(e) => setDefaultInterestRate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Card Processing Fee (₹)</label>
                <input
                  type="number"
                  className="input-control"
                  value={cardFeeAmount}
                  onChange={(e) => setCardFeeAmount(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'printer' && (
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <Printer size={18} color="var(--color-primary-accent)" />
                  <span>Receipt Voucher &amp; Certificate Template</span>
                </h2>
                <p className="card-description">Configure print paper format and signature labels</p>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Default Printer Layout</label>
                <select
                  className="select-control"
                  value={printerFormat}
                  onChange={(e) => setPrinterFormat(e.target.value)}
                >
                  <option value="A4 Laser Standard">A4 Laser Standard (Dual Copy)</option>
                  <option value="Thermal Roll 80mm">Thermal Roll 80mm</option>
                  <option value="Dot Matrix Continuous">Dot Matrix Continuous Slip</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Auto-Print On Disbursement</label>
                <select className="select-control">
                  <option value="yes">Yes (Immediate Print Dialog)</option>
                  <option value="no">No (Manual Print Click)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <Shield size={18} color="var(--color-primary-accent)" />
                  <span>Branch Security &amp; Access Controls</span>
                </h2>
                <p className="card-description">Manager PIN authorization and audit trails</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--color-primary-accent)', width: '16px', height: '16px' }} />
                <span>Require Manager Sign-off for loans above ₹1,00,000</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--color-primary-accent)', width: '16px', height: '16px' }} />
                <span>Log GPS coordinates on borrower address capture</span>
              </label>
            </div>
          </div>
        )}

        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            All settings apply across all branch cash counters and appraisal desks.
          </span>
          <button type="submit" className="btn btn-primary btn-lg">
            <Save size={16} />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
