import { IonPage, IonContent } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  createHostAccount,
  listHostAccounts,
  getAdminStats,
} from '../../services/admin';
import type { AdminStats } from '../../services/admin';
import { logout, getUser } from '../../services/auth';
import type { ApiError } from '../../services/api';
import type { AuthUser } from '../../services/auth';
import './AdminDashboard.css';

type ModalView = 'form' | 'success';

const PER_PAGE = 10;

const AdminDashboard: React.FC = () => {
  const router = useIonRouter();
  const admin  = getUser();

  // ─── Stats ──────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<AdminStats | null>(null);

  const loadStats = async () => {
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch {
      // Non-fatal — the rest of the dashboard still works without stats
    }
  };

  // ─── Hosts list (search + pagination) ──────────────────────────────────
  const [hosts, setHosts] = useState<AuthUser[]>([]);
  const [hostsLoading, setHostsLoading] = useState(true);
  const [hostsError, setHostsError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadHosts = async (targetPage: number, targetSearch: string) => {
    setHostsLoading(true);
    setHostsError(null);
    try {
      const data = await listHostAccounts({
        search: targetSearch || undefined,
        page: targetPage,
        per_page: PER_PAGE,
      });
      setHosts(data.data);
      setPage(data.current_page);
      setLastPage(data.last_page || 1);
      setTotal(data.total);
    } catch {
      setHostsError('Could not load host accounts.');
    } finally {
      setHostsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadStats();
    loadHosts(1, '');
  }, []);

  // Debounce the search box — wait 400ms after typing stops, then reset to page 1
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput);
        loadHosts(1, searchInput);
      }
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const goToPage = (p: number) => {
    if (p < 1 || p > lastPage || p === page) return;
    loadHosts(p, search);
  };

  // ─── Modal state ────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen]   = useState(false);
  const [modalView, setModalView]   = useState<ModalView>('form');
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult]         = useState<{ email: string; mailSent: boolean } | null>(null);

  const openModal = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setFieldErrors({});
    setResult(null);
    setModalView('form');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    // Refresh the list + stats any time the modal closes after a successful create.
    if (modalView === 'success') {
      loadHosts(1, search);
      loadStats();
    }
  };

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim())  errs.name  = 'Name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password)                 errs.password = 'Password is required';
    else if (password.length < 8)  errs.password = 'Minimum 8 characters';
    if (!confirmPassword)          errs.password_confirmation = 'Please confirm the password';
    else if (password !== confirmPassword) errs.password_confirmation = 'Passwords do not match';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const handleCreateHost = async () => {
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await createHostAccount({
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: confirmPassword,
      });
      setResult({
        email: res.user.email,
        mailSent: res.mail_sent,
      });
      setModalView('success');
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const mapped: Record<string, string> = {};
        for (const [field, msgs] of Object.entries(apiErr.errors)) {
          mapped[field] = msgs[0];
        }
        setFieldErrors(mapped);
      } else {
        setError(apiErr.message ?? 'Could not create host account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login', 'root', 'replace');
  };

  const initials = (label: string) =>
    label.trim().slice(0, 2).toUpperCase();

  return (
    <IonPage>
      <IonContent fullscreen scrollY={true} className="adm-page">
        <div className="adm-container">

          {/* Header */}
          <div className="adm-header">
            <div>
              <h1 className="adm-h1">Admin Dashboard</h1>
              {admin && <p className="adm-subtext">Signed in as {admin.email}</p>}
            </div>
            <button className="adm-btn-ghost" onClick={handleLogout}>Log out</button>
          </div>

          {/* Stat cards */}
          <div className="adm-stats-row">
            <div className="adm-stat-card">
              <span className="adm-stat-label">Total Events</span>
              <span className="adm-stat-value">{stats ? stats.total_events : '—'}</span>
            </div>
            <div className="adm-stat-card">
              <span className="adm-stat-label">Total Hosts</span>
              <span className="adm-stat-value">{stats ? stats.total_hosts : '—'}</span>
            </div>
            <div className="adm-stat-card">
              <span className="adm-stat-label">Total Donors</span>
              <span className="adm-stat-value">{stats ? stats.total_donors : '—'}</span>
            </div>
          </div>

          {/* Hosts card */}
          <div className="adm-card">
            <div className="adm-card-header">
              <h2 className="adm-card-title">Host Accounts</h2>
              <button className="adm-btn-primary" onClick={openModal}>
                + Create Host Account
              </button>
            </div>

            {/* Search */}
            <div className="adm-search-box">
              <input
                type="text"
                placeholder="Search by name or email…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="adm-input"
              />
            </div>

            {hostsLoading ? (
              <p className="adm-muted">Loading…</p>
            ) : hostsError ? (
              <p className="adm-error-text">{hostsError}</p>
            ) : hosts.length === 0 ? (
              <p className="adm-muted">
                {search ? `No hosts match "${search}".` : 'No host accounts yet.'}
              </p>
            ) : (
              <>
                <ul className="adm-host-list">
                  {hosts.map((h) => (
                    <li key={h.id} className="adm-host-row">
                      <div className="adm-host-avatar">{initials(h.name || h.email)}</div>
                      <div className="adm-host-info">
                        <span className="adm-host-name">{h.name}</span>
                        <span className="adm-host-email">{h.email}</span>
                      </div>
                      <span className="adm-badge">Host</span>
                    </li>
                  ))}
                </ul>

                {/* Pagination */}
                {lastPage > 1 && (
                  <div className="adm-pagination">
                    <button
                      className="adm-btn-ghost"
                      onClick={() => goToPage(page - 1)}
                      disabled={page <= 1}
                    >
                      Prev
                    </button>
                    <span className="adm-page-info">
                      Page {page} of {lastPage} · {total} total
                    </span>
                    <button
                      className="adm-btn-ghost"
                      onClick={() => goToPage(page + 1)}
                      disabled={page >= lastPage}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>

        {/* ── Modal (portal, matches ViewEvent.tsx's established pattern) ── */}
        {modalOpen && createPortal(
          <div className="adm-modal-overlay" onClick={closeModal}>
            <div className="adm-modal" onClick={(e) => e.stopPropagation()}>

              {modalView === 'form' ? (
                <>
                  <div className="adm-modal-header">
                    <h3>Create Host Account</h3>
                    <button className="adm-modal-close" onClick={closeModal} aria-label="Close">×</button>
                  </div>

                  {error && <div className="adm-error-banner">{error}</div>}

                  <div className="adm-form">
                    <div className="adm-field">
                      <label>Full Name</label>
                      <input
                        type="text"
                        placeholder="Jane Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                        className={fieldErrors.name ? 'adm-input adm-input-error' : 'adm-input'}
                      />
                      {fieldErrors.name && <span className="adm-field-error">{fieldErrors.name}</span>}
                    </div>

                    <div className="adm-field">
                      <label>Email Address</label>
                      <input
                        type="email"
                        placeholder="host@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className={fieldErrors.email ? 'adm-input adm-input-error' : 'adm-input'}
                      />
                      {fieldErrors.email && <span className="adm-field-error">{fieldErrors.email}</span>}
                    </div>

                    <div className="adm-field">
                      <label>Password</label>
                      <div className="adm-input-with-icon">
                        <input
                          type={showPw ? 'text' : 'password'}
                          placeholder="Min 8 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={loading}
                          className={fieldErrors.password ? 'adm-input adm-input-error' : 'adm-input'}
                        />
                        <button
                          type="button"
                          className="adm-input-toggle"
                          onClick={() => setShowPw((v) => !v)}
                          tabIndex={-1}
                        >
                          {showPw ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {fieldErrors.password && <span className="adm-field-error">{fieldErrors.password}</span>}
                    </div>

                    <div className="adm-field">
                      <label>Confirm Password</label>
                      <div className="adm-input-with-icon">
                        <input
                          type={showConfirmPw ? 'text' : 'password'}
                          placeholder="Repeat password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={loading}
                          className={fieldErrors.password_confirmation ? 'adm-input adm-input-error' : 'adm-input'}
                        />
                        <button
                          type="button"
                          className="adm-input-toggle"
                          onClick={() => setShowConfirmPw((v) => !v)}
                          tabIndex={-1}
                        >
                          {showConfirmPw ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {fieldErrors.password_confirmation && (
                        <span className="adm-field-error">{fieldErrors.password_confirmation}</span>
                      )}
                    </div>
                  </div>

                  <div className="adm-modal-actions">
                    <button className="adm-btn-ghost" onClick={closeModal} disabled={loading}>
                      Cancel
                    </button>
                    <button className="adm-btn-primary" onClick={handleCreateHost} disabled={loading}>
                      {loading ? 'Creating…' : 'Create Account'}
                    </button>
                  </div>
                </>
              ) : (
                result && (
                  <>
                    <div className="adm-modal-header">
                      <h3>Host Account Created</h3>
                      <button className="adm-modal-close" onClick={closeModal} aria-label="Close">×</button>
                    </div>

                    <div className="adm-success-body">
                      <div className="adm-success-icon">✓</div>
                      <p>
                        <strong>{result.email}</strong> has been created as a host.
                      </p>
                      <p className="adm-mail-status">
                        {result.mailSent
                          ? 'The login details were also emailed to the host.'
                          : 'Email delivery isn\u2019t configured yet — please share the email and password you set with the host directly.'}
                      </p>
                    </div>

                    <div className="adm-modal-actions">
                      <button className="adm-btn-primary" onClick={closeModal}>
                        Done
                      </button>
                    </div>
                  </>
                )
              )}

            </div>
          </div>,
          document.body
        )}
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;