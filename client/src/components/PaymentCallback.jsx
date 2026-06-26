import React, { useEffect, useState } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { CheckCircle, XCircle, Loader2, ArrowLeft, CreditCard, AlertCircle } from 'lucide-react';

const PaymentCallback = ({ onGoBack }) => {
  const { token } = useAuth();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'failed' | 'error'
  const [paymentData, setPaymentData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      // Read tx_ref from URL query string (Chapa appends it to return_url)
      const params = new URLSearchParams(window.location.search);
      const tx_ref = params.get('tx_ref') || params.get('trx_ref');

      if (!tx_ref) {
        setStatus('error');
        setErrorMsg('No transaction reference found in the URL. Please check your payment history.');
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/parent/payment/verify/${tx_ref}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Verification request failed');
        }

        setPaymentData(data);

        if (data.status === 'success') {
          setStatus('success');
        } else if (data.status === 'failed' || data.status === 'abandoned') {
          setStatus('failed');
        } else {
          // 'pending' or unknown
          setStatus('pending');
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg(err.message || 'Could not verify payment status.');
      }
    };

    verifyPayment();
  }, [token]);

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div style={styles.stateWrapper}>
            <div style={styles.iconRing('#6366f1')}>
              <Loader2 size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <h2 style={styles.title}>Verifying Payment…</h2>
            <p style={styles.subtitle}>Please wait while we confirm your transaction with Chapa.</p>
          </div>
        );

      case 'success':
        return (
          <div style={styles.stateWrapper}>
            <div style={styles.iconRing('#10b981')}>
              <CheckCircle size={40} color="#10b981" />
            </div>
            <h2 style={{ ...styles.title, color: '#10b981' }}>Payment Successful!</h2>
            <p style={styles.subtitle}>
              Your fee has been paid and your records have been updated.
            </p>

            {paymentData?.fee && (
              <div style={styles.receiptCard}>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Invoice</span>
                  <span style={styles.receiptValue}>{paymentData.fee.title}</span>
                </div>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Student</span>
                  <span style={styles.receiptValue}>{paymentData.fee.student_name}</span>
                </div>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Amount</span>
                  <span style={{ ...styles.receiptValue, color: '#10b981', fontWeight: '700' }}>
                    ETB {parseFloat(paymentData.fee.amount).toLocaleString()}
                  </span>
                </div>
                {paymentData.transaction?.ref_id && (
                  <div style={styles.receiptRow}>
                    <span style={styles.receiptLabel}>Chapa Ref</span>
                    <span style={{ ...styles.receiptValue, fontSize: '0.75rem', color: '#9ca3af' }}>
                      {paymentData.transaction.ref_id}
                    </span>
                  </div>
                )}
                {paymentData.tx_ref && (
                  <div style={styles.receiptRow}>
                    <span style={styles.receiptLabel}>Tx Ref</span>
                    <span style={{ ...styles.receiptValue, fontSize: '0.72rem', color: '#9ca3af', wordBreak: 'break-all' }}>
                      {paymentData.tx_ref}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              className="btn btn-primary"
              style={styles.backBtn}
              onClick={onGoBack}
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
          </div>
        );

      case 'failed':
        return (
          <div style={styles.stateWrapper}>
            <div style={styles.iconRing('#ef4444')}>
              <XCircle size={40} color="#ef4444" />
            </div>
            <h2 style={{ ...styles.title, color: '#ef4444' }}>Payment Failed</h2>
            <p style={styles.subtitle}>
              Your payment was not completed. No amount has been deducted. Please try again.
            </p>
            <button
              className="btn btn-secondary"
              style={styles.backBtn}
              onClick={onGoBack}
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
          </div>
        );

      case 'pending':
        return (
          <div style={styles.stateWrapper}>
            <div style={styles.iconRing('#f59e0b')}>
              <CreditCard size={36} color="#f59e0b" />
            </div>
            <h2 style={{ ...styles.title, color: '#f59e0b' }}>Payment Pending</h2>
            <p style={styles.subtitle}>
              Your payment is still being processed. Please check back in a few minutes.
              If funds were deducted, contact your school finance office with your reference number.
            </p>
            {paymentData?.tx_ref && (
              <div style={{ ...styles.receiptCard, marginBottom: '20px' }}>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Reference</span>
                  <span style={{ ...styles.receiptValue, fontSize: '0.75rem', wordBreak: 'break-all' }}>
                    {paymentData.tx_ref}
                  </span>
                </div>
              </div>
            )}
            <button className="btn btn-secondary" style={styles.backBtn} onClick={onGoBack}>
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
          </div>
        );

      case 'error':
      default:
        return (
          <div style={styles.stateWrapper}>
            <div style={styles.iconRing('#f59e0b')}>
              <AlertCircle size={36} color="#f59e0b" />
            </div>
            <h2 style={{ ...styles.title, color: '#f59e0b' }}>Verification Error</h2>
            <p style={styles.subtitle}>{errorMsg}</p>
            <button className="btn btn-secondary" style={styles.backBtn} onClick={onGoBack}>
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
          </div>
        );
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.glowBlob} />
      <div className="glass-card" style={styles.card}>
        <div style={styles.chapaHeader}>
          <CreditCard size={20} color="#6366f1" />
          <span style={styles.chapaLabel}>Chapa Payment Gateway</span>
        </div>
        {renderContent()}
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #070c18 0%, #0d1224 50%, #070c18 100%)',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  glowBlob: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    padding: '32px',
    position: 'relative',
    zIndex: 1,
  },
  chapaHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '28px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  chapaLabel: {
    fontSize: '0.8rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#9ca3af',
  },
  stateWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  iconRing: (color) => ({
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: `${color}15`,
    border: `2px solid ${color}40`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    boxShadow: `0 0 30px ${color}20`,
  }),
  title: {
    fontSize: '1.5rem',
    fontWeight: '800',
    marginBottom: '10px',
    color: '#ffffff',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: '0.88rem',
    color: '#9ca3af',
    lineHeight: '1.6',
    maxWidth: '360px',
    marginBottom: '24px',
  },
  receiptCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '16px 20px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  receiptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  receiptLabel: {
    fontSize: '0.78rem',
    color: '#6b7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    flexShrink: 0,
  },
  receiptValue: {
    fontSize: '0.88rem',
    color: '#e5e7eb',
    fontWeight: '600',
    textAlign: 'right',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '11px 24px',
    width: '100%',
    justifyContent: 'center',
  },
};

export default PaymentCallback;
