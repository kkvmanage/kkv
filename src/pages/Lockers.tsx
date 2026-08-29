import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, HardDrive, Key, UserCheck, Trash2, IndianRupee } from 'lucide-react';

interface LockerData {
    id: string; // e.g. A-1, B-5
    cabinet: 'A' | 'B';
    number: number;
    status: 'Available' | 'Occupied';
    customerName?: string;
    customerPhone?: string;
    issueDate?: string;
    annualRent?: number;
    notes?: string;
}

export const Lockers: React.FC = () => {
    const { customers, addDayBookEntry, showToast } = useApp();
    const [activeCabinet, setActiveCabinet] = useState<'A' | 'B'>('A');
    const [selectedLocker, setSelectedLocker] = useState<LockerData | null>(null);

    // Initialize 61 lockers: Cabinet A (30) and Cabinet B (31)
    const [lockers, setLockers] = useState<LockerData[]>(() => {
        const stored = localStorage.getItem('kkv_lockers_data');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error(e);
            }
        }

        const initial: LockerData[] = [];
        // Cabinet A: 30 lockers
        for (let i = 1; i <= 30; i++) {
            initial.push({
                id: `A-${i}`,
                cabinet: 'A',
                number: i,
                status: i % 7 === 0 ? 'Occupied' : 'Available',
                customerName: i % 7 === 0 ? 'Ramesh Kumar' : undefined,
                customerPhone: i % 7 === 0 ? '9876543210' : undefined,
                issueDate: i % 7 === 0 ? '2026-08-01' : undefined,
                annualRent: i % 7 === 0 ? 1200 : undefined,
                notes: i % 7 === 0 ? 'Primary gold custody' : undefined,
            });
        }
        // Cabinet B: 31 lockers
        for (let i = 1; i <= 31; i++) {
            initial.push({
                id: `B-${i}`,
                cabinet: 'B',
                number: i,
                status: i % 9 === 0 ? 'Occupied' : 'Available',
                customerName: i % 9 === 0 ? 'Thayba Begum' : undefined,
                customerPhone: i % 9 === 0 ? '9812345678' : undefined,
                issueDate: i % 9 === 0 ? '2026-08-11' : undefined,
                annualRent: i % 9 === 0 ? 1500 : undefined,
                notes: i % 9 === 0 ? 'Secure documents envelope' : undefined,
            });
        }
        return initial;
    });

    useEffect(() => {
        localStorage.setItem('kkv_lockers_data', JSON.stringify(lockers));
    }, [lockers]);

    // Allocation Form State
    const [custName, setCustName] = useState('');
    const [custPhone, setCustPhone] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [rent, setRent] = useState(1200);
    const [noteText, setNoteText] = useState('');

    // Rent payment state
    const [payAmount, setPayAmount] = useState(1200);
    const [payMode, setPayMode] = useState<'Cash' | 'Bank' | 'UPI'>('Cash');

    const handleLockerClick = (locker: LockerData) => {
        setSelectedLocker(locker);
        if (locker.status === 'Occupied') {
            setCustName(locker.customerName || '');
            setCustPhone(locker.customerPhone || '');
            setIssueDate(locker.issueDate || '');
            setRent(locker.annualRent || 1200);
            setNoteText(locker.notes || '');
        } else {
            setCustName('');
            setCustPhone('');
            setIssueDate(new Date().toISOString().split('T')[0]);
            setRent(1200);
            setNoteText('');
        }
    };

    const handleIssueLocker = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLocker) return;

        if (!custName) {
            showToast('Please specify a holder name', 'error');
            return;
        }

        const updated = lockers.map(l => {
            if (l.id === selectedLocker.id) {
                return {
                    ...l,
                    status: 'Occupied' as const,
                    customerName: custName,
                    customerPhone: custPhone,
                    issueDate,
                    annualRent: rent,
                    notes: noteText
                };
            }
            return l;
        });

        setLockers(updated);
        setSelectedLocker(null);
        showToast(`Locker ${selectedLocker.id} successfully allocated to ${custName}`, 'success');
    };

    const handleVacateLocker = () => {
        if (!selectedLocker) return;

        const confirmVacate = window.confirm(`Are you sure you want to vacate Locker ${selectedLocker.id}?`);
        if (!confirmVacate) return;

        const updated = lockers.map(l => {
            if (l.id === selectedLocker.id) {
                return {
                    ...l,
                    status: 'Available' as const,
                    customerName: undefined,
                    customerPhone: undefined,
                    issueDate: undefined,
                    annualRent: undefined,
                    notes: undefined
                };
            }
            return l;
        });

        setLockers(updated);
        setSelectedLocker(null);
        showToast(`Locker ${selectedLocker.id} vacated successfully.`, 'info');
    };

    const handlePayRent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLocker) return;

        // Record to Daybook
        addDayBookEntry({
            particulars: `Locker Rent Collection (${selectedLocker.id}) - ${selectedLocker.customerName}`,
            accountHead: 'Locker Rental Revenue',
            mode: payMode,
            cashIn: payMode === 'Cash' ? payAmount : 0,
            cashOut: 0,
            bankIn: payMode !== 'Cash' ? payAmount : 0,
            bankOut: 0,
            date: new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
            customerName: selectedLocker.customerName || '',
            loanNo: `LOCKER-${selectedLocker.id}`,
            billNo: `LR-${Date.now().toString().slice(-4)}`
        });

        showToast(`Recorded rent payment of ₹${payAmount} for Locker ${selectedLocker.id}`, 'success');
        setSelectedLocker(null);
    };

    const cabinetLockers = lockers.filter(l => l.cabinet === activeCabinet);
    const occupiedCount = lockers.filter(l => l.status === 'Occupied').length;
    const availableCount = lockers.length - occupiedCount;

    return (
        <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* KPI Info Widgets */}
            <div className="dashboard-kpis grid-3" style={{ gap: '15px' }}>
                <div className="kpi-card" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '16px 20px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                    <div style={{ backgroundColor: 'var(--color-primary-accent-op)', padding: '10px', borderRadius: '10px', color: 'var(--color-primary-dark)' }}>
                        <HardDrive size={22} />
                    </div>
                    <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>Total Cabinets</p>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>2 Cabinets (61 total)</h3>
                    </div>
                </div>

                <div className="kpi-card" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '16px 20px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                    <div style={{ backgroundColor: 'rgba(235, 94, 40, 0.1)', padding: '10px', borderRadius: '10px', color: '#EB5E28' }}>
                        <Key size={22} />
                    </div>
                    <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>Occupied Lockers</p>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '2px 0 0 0', color: '#EB5E28' }}>{occupiedCount} Allocated</h3>
                    </div>
                </div>

                <div className="kpi-card" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '16px 20px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                    <div style={{ backgroundColor: 'rgba(79, 175, 134, 0.1)', padding: '10px', borderRadius: '10px', color: '#4FAF86' }}>
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>Available Lockers</p>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '2px 0 0 0', color: '#4FAF86' }}>{availableCount} Empty</h3>
                    </div>
                </div>
            </div>

            {/* Main Panel Content Grid */}
            <div style={{ display: 'flex', gap: '20px' }}>

                {/* Locker Grid View */}
                <div className="card" style={{ flex: 1, padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                        <div>
                            <h2 className="card-title" style={{ fontSize: '16px', fontWeight: 800 }}>Locker Grid View</h2>
                            <p className="card-description">Select cabinet &amp; click any locker to inspect allocations</p>
                        </div>

                        <div className="subchip-container" style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-surface-secondary)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
                            <button
                                className={`subchip-btn ${activeCabinet === 'A' ? 'active' : ''}`}
                                onClick={() => setActiveCabinet('A')}
                                style={{ padding: '6px 12px', fontSize: '11.5px', fontWeight: 700, border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', backgroundColor: activeCabinet === 'A' ? 'var(--bg-card)' : 'transparent', color: activeCabinet === 'A' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                            >
                                Cabinet A (30 Lockers)
                            </button>
                            <button
                                className={`subchip-btn ${activeCabinet === 'B' ? 'active' : ''}`}
                                onClick={() => setActiveCabinet('B')}
                                style={{ padding: '6px 12px', fontSize: '11.5px', fontWeight: 700, border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', backgroundColor: activeCabinet === 'B' ? 'var(--bg-card)' : 'transparent', color: activeCabinet === 'B' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                            >
                                Cabinet B (31 Lockers)
                            </button>
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
                            gap: '12px',
                            padding: '10px 0'
                        }}
                    >
                        {cabinetLockers.map(l => (
                            <button
                                key={l.id}
                                onClick={() => handleLockerClick(l)}
                                style={{
                                    height: '60px',
                                    borderRadius: 'var(--radius-md)',
                                    border: selectedLocker?.id === l.id ? '2px solid var(--color-primary-dark)' : '1px solid var(--border-subtle)',
                                    backgroundColor: l.status === 'Occupied' ? 'rgba(235, 94, 40, 0.08)' : 'var(--bg-surface-secondary)',
                                    color: l.status === 'Occupied' ? '#EB5E28' : 'var(--text-primary)',
                                    fontWeight: 800,
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            >
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>#{l.number}</span>
                                <span>{l.id}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Locker Detail Inspector */}
                <div className="card" style={{ width: '380px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <h2 className="card-title" style={{ fontSize: '16px', fontWeight: 800 }}>Locker Inspector</h2>
                        <p className="card-description">Manage operations for locker selection</p>
                    </div>

                    {selectedLocker ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', padding: '12px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', alignItems: 'center', gap: '10px' }}>
                                <Key size={18} color="var(--color-primary-dark)" />
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800 }}>Locker {selectedLocker.id}</h4>
                                    <span style={{ fontSize: '11px', color: selectedLocker.status === 'Occupied' ? '#EB5E28' : '#4FAF86', fontWeight: 700 }}>
                                        {selectedLocker.status === 'Occupied' ? 'ALLOCATED / OCCUPIED' : 'VACANT / AVAILABLE'}
                                    </span>
                                </div>
                            </div>

                            {selectedLocker.status === 'Available' ? (
                                /* Issue Locker Form */
                                <form onSubmit={handleIssueLocker} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div className="form-group">
                                        <label className="form-label required">Customer Name</label>
                                        <input
                                            type="text"
                                            className="input-control"
                                            list="customer-list"
                                            placeholder="Type name or select borrower..."
                                            value={custName}
                                            onChange={(e) => {
                                                setCustName(e.target.value);
                                                // Auto-fill phone matching customer
                                                const matched = customers.find(c => c.name.toLowerCase() === e.target.value.toLowerCase());
                                                if (matched) setCustPhone(matched.phone);
                                            }}
                                            required
                                        />
                                        <datalist id="customer-list">
                                            {customers.map(c => <option key={c.id} value={c.name} />)}
                                        </datalist>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Phone Number</label>
                                        <input
                                            type="tel"
                                            className="input-control"
                                            placeholder="e.g. 9876543210"
                                            value={custPhone}
                                            onChange={e => setCustPhone(e.target.value)}
                                        />
                                    </div>

                                    <div className="form-groupGrid grid-2" style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label className="form-label">Issue Date</label>
                                            <input
                                                type="date"
                                                className="input-control"
                                                value={issueDate}
                                                onChange={e => setIssueDate(e.target.value)}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label className="form-label">Annual Rent (₹)</label>
                                            <input
                                                type="number"
                                                className="input-control"
                                                value={rent}
                                                onChange={e => setRent(Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Notes</label>
                                        <textarea
                                            className="input-control"
                                            rows={2}
                                            placeholder="Item tags, security key details..."
                                            value={noteText}
                                            onChange={e => setNoteText(e.target.value)}
                                        />
                                    </div>

                                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}>
                                        <UserCheck size={14} />
                                        <span>Issue Locker Key</span>
                                    </button>
                                </form>
                            ) : (
                                /* Occupied Actions (Record Rent / Vacate) */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '6px', fontSize: '12px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Holder:</span>
                                        <strong style={{ color: 'var(--text-primary)' }}>{selectedLocker.customerName}</strong>
                                        <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
                                        <span style={{ color: 'var(--text-primary)' }}>{selectedLocker.customerPhone || 'N/A'}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>Issued:</span>
                                        <span style={{ color: 'var(--text-primary)' }}>{selectedLocker.issueDate}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>Annual Rent:</span>
                                        <strong style={{ color: 'var(--text-primary)' }}>₹{selectedLocker.annualRent}</strong>
                                        <span style={{ color: 'var(--text-muted)' }}>Notes:</span>
                                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>{selectedLocker.notes || 'None'}</p>
                                    </div>

                                    {/* Record Rent Payout Form */}
                                    <form onSubmit={handlePayRent} style={{ borderTop: '1px solid var(--border-light)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>Record Rent Receipt</h4>

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="number"
                                                className="input-control"
                                                style={{ width: '90px' }}
                                                value={payAmount}
                                                onChange={e => setPayAmount(Number(e.target.value))}
                                            />
                                            <select
                                                className="input-control"
                                                style={{ flex: 1 }}
                                                value={payMode}
                                                onChange={e => setPayMode(e.target.value as any)}
                                            >
                                                <option value="Cash">Cash Counter</option>
                                                <option value="Bank">Bank Deposit</option>
                                                <option value="UPI">Business UPI</option>
                                            </select>
                                        </div>

                                        <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                                            <IndianRupee size={12} />
                                            <span>Collect Rent Voucher</span>
                                        </button>
                                    </form>

                                    {/* Vacate Call */}
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--color-primary-dark)', color: 'var(--color-primary-dark)' }}
                                        onClick={handleVacateLocker}
                                    >
                                        <Trash2 size={12} />
                                        <span>Vacate &amp; Release Locker</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Key size={30} style={{ opacity: 0.3, marginBottom: '8px' }} />
                            <p style={{ fontSize: '12px', margin: 0 }}>Select any cabinet cell to inspect accounts, register handovers, or terminate locker leases.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
