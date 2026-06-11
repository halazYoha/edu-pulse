import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  School, ArrowRight, Shield, BookOpen,
  GraduationCap, Users, Eye, EyeOff,
  Loader2, CheckCircle, AlertCircle
} from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [error, setError]           = useState('');
  const [errorShake, setErrorShake] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRole, setLoadingRole] = useState(null); // which quick-login button is spinning

  /* ── helpers ── */
  const triggerError = (msg) => {
    setError(msg);
    setErrorShake(false);
    // reset then re-trigger to allow re-animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setErrorShake(true));
    });
  };

  const doLogin = async (loginEmail, loginPassword, roleKey = null) => {
    setError('');
    setErrorShake(false);
    setSuccess(false);

    if (roleKey) setLoadingRole(roleKey);
    else setSubmitting(true);

    try {
      await login(loginEmail, loginPassword);
      setSuccess(true);
      // AuthContext handles redirect after login, so we just show brief success
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('email') || msg.toLowerCase().includes('password')) {
        triggerError('Incorrect email or password. Please try again.');
      } else if (msg.toLowerCase().includes('server') || msg.toLowerCase().includes('500')) {
        triggerError('Server error. Please try again in a moment.');
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
        triggerError('Cannot reach the server. Check your connection.');
      } else {
        triggerError(msg || 'Login failed. Please try again.');
      }
    } finally {
      if (roleKey) setLoadingRole(null);
      else setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { triggerError('Email address is required.'); return; }
    if (!password)     { triggerError('Password is required.'); return; }
    await doLogin(email.trim(), password);
  };

  const quickLogins = [
    { key: 'admin',   email: 'admin@edupulse.com',          label: 'Admin',   icon: <Shield size={15} />,        color: '#ef4444' },
    { key: 'teacher', email: 'teacher.smith@edupulse.com',  label: 'Teacher', icon: <BookOpen size={15} />,     color: '#10b981' },
    { key: 'student', email: 'student.alex@edupulse.com',   label: 'Student', icon: <GraduationCap size={15} />,color: '#6366f1' },
    { key: 'parent',  email: 'parent.john@edupulse.com',    label: 'Parent',  icon: <Users size={15} />,         color: '#f59e0b' },
  ];

  const isAnyLoading = submitting || loadingRole !== null;

  return (
    <div style={styles.loginContainer}>
      {/* animated background glow blobs */}
      <div style={styles.glowBlob1} />
      <div style={styles.glowBlob2} />

      <div style={styles.loginCard} className="glass-card animate-fade-in">

        {/* ── Header ── */}
        <div style={styles.header}>
          <div style={styles.logoIcon}>
            <School size={28} color="#6366f1" />
          </div>
          <h1 style={styles.title}>EduPulse ERP</h1>
          <p style={styles.subtitle}>Sign in to access the management portal</p>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div
            style={styles.errorBox}
            className={errorShake ? 'error-shake' : ''}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* ── Success Banner ── */}
        {success && (
          <div style={styles.successBox}>
            <CheckCircle size={15} style={{ flexShrink: 0 }} />
            <span>Authentication successful — redirecting…</span>
          </div>
        )}

        {/* ── Login Form ── */}
        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className="form-control"
              placeholder="e.g. admin@edupulse.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              disabled={isAnyLoading}
              autoComplete="email"
              style={styles.input}
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label" htmlFor="password">Password</label>
            <div style={styles.pwdWrapper}>
              <input
                type={showPwd ? 'text' : 'password'}
                id="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                disabled={isAnyLoading}
                autoComplete="current-password"
                style={{ ...styles.input, paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(p => !p)}
                style={styles.eyeBtn}
                tabIndex={-1}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd
                  ? <EyeOff size={17} color="#6b7280" />
                  : <Eye    size={17} color="#6b7280" />
                }
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={styles.submitBtn}
            disabled={isAnyLoading}
          >
            {submitting ? (
              <>
                <Loader2 size={17} style={styles.spinner} />
                Authenticating…
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* ── Divider ── */}
        <div style={styles.dividerRow}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>Demo Quick Login</span>
          <div style={styles.dividerLine} />
        </div>

        {/* ── Quick Login Buttons ── */}
        <div style={styles.quickLoginGrid}>
          {quickLogins.map(({ key, email: qEmail, label, icon, color }) => {
            const isThisLoading = loadingRole === key;
            return (
              <button
                key={key}
                onClick={() => doLogin(qEmail, 'password123', key)}
                className="btn btn-secondary"
                style={styles.quickBtn}
                disabled={isAnyLoading}
                title={`Demo login as ${label}`}
              >
                {isThisLoading ? (
                  <Loader2 size={15} style={{ ...styles.spinner, color }} />
                ) : (
                  <span style={{ color }}>{icon}</span>
                )}
                <span style={{ fontWeight: isThisLoading ? '400' : '600' }}>
                  {isThisLoading ? 'Signing in…' : label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Footer note ── */}
        <p style={styles.footerNote}>
          Demo password for all accounts: <code style={styles.code}>password123</code>
        </p>
      </div>

      {/* ── Shake + Spinner keyframes injected inline ── */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-7px); }
          30%       { transform: translateX(7px); }
          45%       { transform: translateX(-5px); }
          60%       { transform: translateX(5px); }
          75%       { transform: translateX(-3px); }
          90%       { transform: translateX(3px); }
        }
        .error-shake { animation: shake 0.5s ease; }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  loginContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    position: 'relative',
    background: 'linear-gradient(135deg, #070c18 0%, #0d1224 50%, #070c18 100%)',
    overflow: 'hidden',
    padding: '16px',
  },
  glowBlob1: {
    position: 'absolute',
    width: '700px',
    height: '700px',
    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.10) 0%, transparent 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-60%, -50%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  glowBlob2: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)',
    bottom: '10%',
    right: '10%',
    pointerEvents: 'none',
    zIndex: 0,
  },
  loginCard: {
    width: '100%',
    maxWidth: '440px',
    zIndex: 2,
    position: 'relative',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  logoIcon: {
    width: '56px',
    height: '56px',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
    border: '1px solid rgba(99, 102, 241, 0.30)',
    boxShadow: '0 0 20px rgba(99,102,241,0.15)',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '800',
    letterSpacing: '-0.5px',
    marginBottom: '6px',
    background: 'linear-gradient(to right, #ffffff, #a5b4fc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'inline-block',
  },
  subtitle: {
    fontSize: '0.83rem',
    color: '#6b7280',
  },

  /* Error / Success banners */
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    border: '1px solid rgba(239, 68, 68, 0.30)',
    borderRadius: '8px',
    color: '#f87171',
    padding: '11px 14px',
    fontSize: '0.84rem',
    marginBottom: '20px',
    lineHeight: '1.4',
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    border: '1px solid rgba(16, 185, 129, 0.30)',
    borderRadius: '8px',
    color: '#34d399',
    padding: '11px 14px',
    fontSize: '0.84rem',
    marginBottom: '20px',
  },

  form: { marginBottom: '20px' },

  input: {
    width: '100%',
    boxSizing: 'border-box',
  },

  /* Password field wrapper */
  pwdWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'background 0.2s',
  },

  submitBtn: {
    width: '100%',
    padding: '13px',
    fontSize: '0.95rem',
    fontWeight: '600',
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },

  spinner: {
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },

  /* Divider */
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '20px 0 16px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  dividerText: {
    fontSize: '0.7rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#4b5563',
    whiteSpace: 'nowrap',
  },

  /* Quick login grid */
  quickLoginGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
  },
  quickBtn: {
    fontSize: '0.83rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '8px',
    padding: '11px 14px',
    transition: 'all 0.2s',
    minHeight: '42px',
  },

  footerNote: {
    textAlign: 'center',
    fontSize: '0.72rem',
    color: '#4b5563',
    marginTop: '18px',
    marginBottom: '0',
  },
  code: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    color: '#a5b4fc',
    padding: '1px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
  },
};

export default Login;
