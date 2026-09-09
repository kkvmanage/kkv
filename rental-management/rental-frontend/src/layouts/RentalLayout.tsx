import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Store,
  CreditCard,
  Receipt,
  TrendingDown,
  BookOpen,
  HardDriveDownload,
  Settings,
  Bell,
  Search,
  Plus,
  Menu,
  X,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  User,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { KKVLogo } from '../components/common/KKVLogo.tsx';
import { rentalApi } from '../services/rentalApi.ts';
import { PaymentModal } from '../components/PaymentModal.tsx';
import { RentalComplex, RentalShop, SyncSummary } from '../types/rental.types.ts';

interface PageMetadata {
  title: string;
  subtitle: string;
}

const pageTitles: Record<string, PageMetadata> = {
  '/dashboard': {
    title: 'Rental Dashboard',
    subtitle: 'Manage complexes, shops, rent collections and expenses.',
  },
  '/complexes': {
    title: 'Complex Management',
    subtitle: 'Manage commercial properties, locations, active buildings, and total shops.',
  },
  '/shops': {
    title: 'Shops & Tenants',
    subtitle: 'Commercial shop directory, tenant contact information, monthly rents, and status.',
  },
  '/payments': {
    title: 'Rent Payments',
    subtitle: 'Record rent collections, partial payments, advance adjustments, Cash and GPay split.',
  },
  '/expenses': {
    title: 'Property Expenses',
    subtitle: 'Track building maintenance, utility bills, repairs, cleaning, and vendor payments.',
  },
  '/reports': {
    title: 'Reports & Statement',
    subtitle: 'Monthly rent statements, expense ledgers, Cash vs GPay collections, and property performance.',
  },
  '/sync': {
    title: 'Backup & Sync',
    subtitle: 'Google Drive & Google Sheets mirror synchronization status, queue metrics, and retry controls.',
  },
  '/staff-access': {
    title: 'Staff & Access Control',
    subtitle: 'Authorize and manage staff Google accounts permitted to log into the Rental Portal.',
  },
  '/settings': {
    title: 'Settings & Administration',
    subtitle: 'System configuration, authorized rental staff accounts, and immutable audit logs.',
  },
};

export const RentalLayout: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [complexes, setComplexes] = useState<RentalComplex[]>([]);
  const [shops, setShops] = useState<RentalShop[]>([]);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);

  const fetchGlobalData = async () => {
    try {
      const [compRes, shopRes, syncRes] = await Promise.all([
        rentalApi.getComplexes(),
        rentalApi.getShops(),
        rentalApi.getSyncStatus(),
      ]);
      if (compRes.success) setComplexes(compRes.data);
      if (shopRes.success) setShops(shopRes.data);
      if (syncRes.success) setSyncSummary(syncRes.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchGlobalData();
    const interval = setInterval(fetchGlobalData, 15000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const meta = pageTitles[location.pathname] || {
    title: 'Complex Rental Management',
    subtitle: 'KKV Gold Finance - Rental Staff System',
  };

  const navRental = [
    { to: '/dashboard', label: 'Rental Dashboard', icon: LayoutDashboard },
    { to: '/complexes', label: 'Complexes', icon: Building2 },
    { to: '/shops', label: 'Shops & Tenants', icon: Store },
    { to: '/payments', label: 'Rent Payments', icon: CreditCard },
    { to: '/expenses', label: 'Expenses', icon: TrendingDown },
    { to: '/reports', label: 'Reports & Statement', icon: BookOpen },
  ];

  const navData = [
    { to: '/sync', label: 'Backup & Sync', icon: HardDriveDownload },
    ...(isAdmin ? [{ to: '/staff-access', label: 'Staff & Access', icon: ShieldCheck }] : []),
    ...(isAdmin ? [{ to: '/settings', label: 'Settings', icon: Settings }] : []),
  ];

  return (
    <div className="app-layout">
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close menu"
        />
      )}

      {/* Official KKV Gold Finance Style Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand" onClick={() => navigate('/dashboard')}>
          <KKVLogo size={38} />
          <div className="sidebar-brand-text">
            <h2>KKV GOLD FINANCE</h2>
            <p>RENTAL MANAGEMENT</p>
          </div>
          <button
            className="mobile-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileMenuOpen(false);
            }}
            aria-label="Close Navigation Menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">RENTAL SYSTEM</div>
          {navRental.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="sidebar-section-label">DATA</div>
          {navData.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer with Sync Status & User Account */}
        <div className="sidebar-footer">
          {/* Google Sync Status Pill */}
          <div
            style={{
              padding: '8px 10px',
              backgroundColor: 'var(--bg-surface-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {syncSummary?.isConfigured ? (
                <CheckCircle2 size={13} style={{ color: 'var(--color-success)' }} />
              ) : (
                <AlertCircle size={13} style={{ color: 'var(--color-warning)' }} />
              )}
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Google Sync
              </span>
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: syncSummary?.pending ? 'var(--color-warning)' : 'var(--color-success)',
              }}
            >
              {syncSummary?.pending ? `${syncSummary.pending} Pending` : 'Synced'}
            </span>
          </div>

          {/* User Profile Bar */}
          <div
            style={{
              padding: '8px 10px',
              backgroundColor: 'var(--bg-surface-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user?.name || 'User'}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                    border: '1.5px solid var(--color-gold)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#176B52',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '11px',
                    flexShrink: 0,
                  }}
                >
                  {isAdmin ? <ShieldCheck size={16} /> : <User size={16} />}
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    margin: 0,
                  }}
                >
                  {user?.name || user?.displayName || user?.username || 'Staff'}
                </p>
                <p
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    margin: 0,
                  }}
                >
                  {user?.email}
                </p>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    color: '#B48909',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    display: 'inline-block',
                    marginTop: '2px',
                  }}
                >
                  {isAdmin ? 'RENTAL ADMIN' : 'RENTAL STAFF'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
              }}
              title="Sign Out"
              className="icon-button"
              style={{
                width: '30px',
                height: '30px',
                flexShrink: 0,
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Official KKV Gold Finance Topbar */}
        <header className="topbar">
          <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="mobile-hamburger-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu size={22} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <KKVLogo size={32} />
              <div>
                <h1 className="page-header-title">{meta.title}</h1>
                <p className="page-header-subtitle">{meta.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="topbar-right">
            {/* Global Search Bar */}
            <div className="topbar-search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search tenant, shop, or receipt..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    navigate(`/shops?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
                  }
                }}
              />
            </div>

            {/* Notification Bell */}
            <button
              className="topbar-action-btn"
              title="Notifications"
              onClick={() => navigate('/payments')}
            >
              <Bell size={17} />
              {syncSummary?.pending && syncSummary.pending > 0 ? (
                <span className="notification-badge">{syncSummary.pending}</span>
              ) : (
                <span className="notification-dot" style={{ opacity: 0.4 }}></span>
              )}
            </button>

            {/* + New Rent Payment Quick Action Button */}
            <button
              className="btn btn-primary topbar-new-loan-btn"
              onClick={() => setPaymentModalOpen(true)}
            >
              <Plus size={15} />
              <span className="btn-label-desktop">New Rent Payment</span>
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="page-content">
          <Outlet context={{ fetchGlobalData }} />
        </main>
      </div>

      {/* Global Quick Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={fetchGlobalData}
        complexes={complexes}
        shops={shops}
      />
    </div>
  );
};
