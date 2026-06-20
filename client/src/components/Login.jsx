import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  School, ArrowRight, Shield, BookOpen,
  GraduationCap, Users, Eye, EyeOff,
  Loader2, CheckCircle, AlertCircle
} from 'lucide-react';

const Login = () => {
  const { login, setAuthSession, settings } = useAuth();
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPwd, setShowPwd]         = useState(false);
  const [error, setError]             = useState('');
  const [errorShake, setErrorShake]   = useState(false);
  const [success, setSuccess]         = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [selectedRole, setSelectedRole] = useState('admin');
  const [redirecting, setRedirecting] = useState(false);
  const [redirectStatus, setRedirectStatus] = useState('');

  const roles = [
    { key: 'admin',   label: 'Admin',   color: '#ef4444', glow: 'rgba(239, 68, 68, 0.08)', borderGlow: 'rgba(239, 68, 68, 0.3)' },
    { key: 'teacher', label: 'Teacher', color: '#10b981', glow: 'rgba(16, 185, 129, 0.08)', borderGlow: 'rgba(16, 185, 129, 0.3)' },
    { key: 'student', label: 'Student', color: '#6366f1', glow: 'rgba(99, 102, 241, 0.08)', borderGlow: 'rgba(99, 102, 241, 0.3)' },
    { key: 'parent',  label: 'Parent',  color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.08)', borderGlow: 'rgba(245, 158, 11, 0.3)' },
  ];

  /* ── helpers ── */
  const triggerError = (msg) => {
    setError(msg);
    setErrorShake(false);
    // reset then re-trigger to allow re-animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setErrorShake(true));
    });
  };

  const renderRoleIcon = (roleKey, size = 18) => {
    switch (roleKey) {
      case 'admin':   return <Shield size={size} />;
      case 'teacher': return <BookOpen size={size} />;
      case 'student': return <GraduationCap size={size} />;
      case 'parent':  return <Users size={size} />;
      default:        return null;
    }
  };

  const doLogin = async (loginEmail, loginPassword) => {
    setError('');
    setErrorShake(false);
    setSuccess(false);
    setSubmitting(true);

    try {
      const data = await login(loginEmail, loginPassword, selectedRole);
      
      // Perform role verification
      if (data.user.role !== selectedRole) {
        throw new Error(`Access denied: The credentials provided do not belong to the ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} portal.`);
      }

      setSuccess(true);
      setRedirecting(true);
      setRedirectStatus('Verifying credentials...');

      setTimeout(() => {
        setRedirectStatus('Authorizing portal role...');
      }, 700);

      setTimeout(() => {
        setRedirectStatus('Loading workspace modules...');
      }, 1400);

      setTimeout(() => {
        setAuthSession(data.token, data.user);
      }, 2000);

    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('email') || msg.toLowerCase().includes('password')) {
        triggerError('Incorrect email or password. Please try again.');
      } else if (msg.toLowerCase().includes('access denied')) {
        triggerError(msg);
      } else if (msg.toLowerCase().includes('server') || msg.toLowerCase().includes('500')) {
        triggerError('Server error. Please try again in a moment.');
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
        triggerError('Cannot reach the server. Check your connection.');
      } else {
        triggerError(msg || 'Login failed. Please try again.');
      }
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { triggerError('Email address is required.'); return; }
    if (!password)     { triggerError('Password is required.'); return; }
    await doLogin(email.trim(), password);
  };

  const emailPlaceholder = `e.g. ${selectedRole}@school.com`;

  return (
    <div style={styles.loginContainer}>
      {/* animated background glow blobs */}
      <div style={styles.glowBlob1} />
      <div style={styles.glowBlob2} />

      {redirecting ? (
        /* ── Fullscreen circular progress loading screen ── */
        <div style={styles.fullscreenLoader}>
          <div style={styles.spinnerWrapperLarge}>
            <svg style={styles.svgRingLarge} width="120" height="120" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="52"
                stroke="rgba(255, 255, 255, 0.03)"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                stroke={roles.find(r => r.key === selectedRole)?.color || '#6366f1'}
                strokeWidth="6"
                fill="transparent"
                strokeDasharray="326.72"
                strokeDashoffset="326.72"
                className="animate-progress-fill"
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: '50% 50%',
                }}
              />
            </svg>
            <div style={{
              ...styles.spinnerCenterIconLarge,
              color: roles.find(r => r.key === selectedRole)?.color || '#6366f1'
            }}>
              {renderRoleIcon(selectedRole, 32)}
            </div>
          </div>
          
          <h2 style={styles.redirectTitleLarge}>Loading {settings.school_name || 'EduPulse ERP'} Portal...</h2>
          <p style={styles.redirectSubLarge}>{redirectStatus}</p>
        </div>
      ) : (
        <div style={styles.loginCard} className="glass-card animate-fade-in">
          {/* ── Header ── */}
          <div style={styles.header}>
            <div style={styles.logoIcon}>
              <School size={28} color="#6366f1" />
            </div>
            <h1 style={styles.title}>{settings.school_name || 'EduPulse ERP'}</h1>
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
                placeholder={emailPlaceholder}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                disabled={submitting}
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
                  disabled={submitting}
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
              disabled={submitting}
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
            <span style={styles.dividerText}>Portal Selection</span>
            <div style={styles.dividerLine} />
          </div>

          {/* ── Role Selection Grid (Second Section) ── */}
          <div style={styles.roleGrid}>
            {roles.map(({ key, label, color, glow, borderGlow }) => {
              const isSelected = selectedRole === key;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => { setSelectedRole(key); setError(''); }}
                  style={{
                    ...styles.roleBtn,
                    borderColor: isSelected ? color : 'rgba(75, 85, 99, 0.25)',
                    backgroundColor: isSelected ? glow : 'rgba(17, 24, 39, 0.4)',
                    boxShadow: isSelected ? `0 0 12px ${glow}` : 'none',
                  }}
                  disabled={submitting}
                >
                  <span style={{ color: isSelected ? color : '#6b7280', transition: 'color 0.2s', display: 'flex', alignItems: 'center' }}>
                    {renderRoleIcon(key, 16)}
                  </span>
                  <span style={{
                    fontWeight: isSelected ? '700' : '500',
                    color: isSelected ? '#ffffff' : '#9ca3af',
                    fontSize: '0.82rem',
                    transition: 'all 0.2s',
                  }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
        @keyframes progressFill {
          0% { stroke-dashoffset: 326.72; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-progress-fill {
          animation: progressFill 2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
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
    marginBottom: '24px',
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

  form: { marginBottom: '0px' },

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
    marginTop: '12px',
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
    margin: '24px 0 16px',
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

  /* Role Selection */
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
  },
  roleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '11px 14px',
    borderRadius: '8px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    minHeight: '42px',
  },

  /* Fullscreen Loader */
  fullscreenLoader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: '#0b0f19',
    zIndex: 1000,
    fontFamily: "'Inter', sans-serif",
  },
  spinnerWrapperLarge: {
    position: 'relative',
    width: '120px',
    height: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '28px',
  },
  svgRingLarge: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  spinnerCenterIconLarge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  redirectTitleLarge: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '8px',
    letterSpacing: '-0.3px',
  },
  redirectSubLarge: {
    fontSize: '0.95rem',
    color: '#9ca3af',
    minHeight: '24px',
  },
};

export default Login;
