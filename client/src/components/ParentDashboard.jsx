import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Toast from './Toast';
import { 
  Users, Calendar, CheckSquare, Award, CreditCard, 
  Megaphone, ShieldAlert, CheckCircle, Clock, Loader2
} from 'lucide-react';

const ParentDashboard = ({ activeTab, setActiveTab }) => {
  const { apiFetch, settings } = useAuth();

  const formatCurrency = (amount) => {
    const sym = settings?.currency_symbol || '$';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: settings?.currency || 'USD' }).format(amount);
    } catch { return `${sym}${parseFloat(amount || 0).toFixed(2)}`; }
  };
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selection states
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('chappa');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const [toast, setToast] = useState({ type: 'success', message: '' });
  const showToast = useCallback((type, message) => setToast({ type, message }), []);
  const clearToast = useCallback(() => setToast({ type: 'success', message: '' }), []);

  const loadParentData = async () => {
    setLoading(true);
    try {
      const dbData = await apiFetch('/dashboard');
      setData(dbData);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch parent dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParentData();
  }, [activeTab]);

  const handlePayInvoiceClick = (invoice) => {
    setPayingInvoice(invoice);
    setSelectedPaymentMethod('chappa');
    if (setActiveTab) {
      setActiveTab('payments');
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    setPaymentSubmitting(true);
    
    try {
      // Call backend to initialize Chapa payment
      const response = await apiFetch(`/parent/fees/${payingInvoice.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ payment_method: selectedPaymentMethod })
      });

      if (response.checkout_url) {
        // Store payment info for callback handling
        localStorage.setItem('pendingPayment', JSON.stringify({
          feeId: payingInvoice.id,
          tx_ref: response.tx_ref,
          paymentMethod: selectedPaymentMethod
        }));
        
        // Redirect to Chapa checkout
        window.location.href = response.checkout_url;
      } else {
        showToast('error', 'Failed to initialize payment. Please try again.');
        setPaymentSubmitting(false);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to initiate payment. Please try again.');
      setPaymentSubmitting(false);
    }
  };

  if (loading && !data) return <div style={styles.loader}>Loading parent environment...</div>;
  if (!data || !data.children || data.children.length === 0) {
    return <div style={styles.loader}>No registered children linked to this parent account.</div>;
  }

  const currentChild = data.children[selectedChildIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <Toast type={toast.type} message={toast.message} onClose={clearToast} />
      {error && <div className="badge badge-danger" style={{ padding: '12px', fontSize: '0.9rem' }}>{error}</div>}

      {/* CHILDREN SELECTOR PANEL */}
      <div className="glass-card" style={styles.selectorCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Users size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>Select Child:</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {data.children.map((child, index) => (
              <button 
                key={child.id}
                className={`btn ${selectedChildIndex === index ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '7px 14px', fontSize: '0.82rem' }}
                onClick={() => setSelectedChildIndex(index)}
              >
                {child.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          {/* Child metrics overview */}
          <div className="grid-cols-3">
            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><CheckSquare size={24} color="#10b981" /></div>
              <div>
                <p style={styles.statTitle}>Overall Attendance</p>
                <h3 style={styles.statValue}>{currentChild.attendance?.percentage || 100}%</h3>
              </div>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><Award size={24} color="#6366f1" /></div>
              <div>
                <p style={styles.statTitle}>Academic average</p>
                <h3 style={styles.statValue}>{currentChild.gpaAverage || 90}%</h3>
              </div>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><Calendar size={24} color="#f59e0b" /></div>
              <div>
                <p style={styles.statTitle}>Assigned Class</p>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>
                  {currentChild.class_name || 'Unassigned'}
                </h3>
              </div>
            </div>
          </div>

          <div className="grid-cols-2">
            {/* Announcements Panel */}
            <div className="glass-card">
              <h3 style={styles.cardHeader}><Megaphone size={18} /> Parent Bulletins</h3>
              <div style={styles.announcementList}>
                {data.announcements?.map((ann) => (
                  <div key={ann.id} style={styles.announcementItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <h4 style={styles.annTitle}>{ann.title}</h4>
                      <span className="badge badge-info">{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={styles.annContent}>{ann.content}</p>
                    <div style={styles.annFooter}>
                      <span>Posted by {ann.author_name}</span>
                    </div>
                  </div>
                ))}
                {data.announcements?.length === 0 && <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No school bulletins.</p>}
              </div>
            </div>

            {/* Quick Invoice alerts */}
            <div className="glass-card">
              <h3 style={styles.cardHeader}><CreditCard size={18} /> Pending School Fees</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {currentChild.fees?.filter(f => f.status === 'pending').map(fee => (
                  <div key={fee.id} style={styles.feeAlertBox}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{fee.title}</span>
                      <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                        Due: {new Date(fee.due_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{formatCurrency(fee.amount)}</span>
                      <button 
                        className="btn btn-primary animate-fade-in" 
                        style={{ padding: '7px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        onClick={() => handlePayInvoiceClick(fee)}
                      >
                        Pay
                      </button>
                    </div>
                  </div>
                ))}
                {currentChild.fees?.filter(f => f.status === 'pending').length === 0 && (
                  <div style={styles.allPaidBox}>
                    <CheckCircle size={20} color="var(--success)" />
                    <span>All tuition fee invoices are fully paid.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* CHILDREN DETAILS & STATS TAB */}
      {activeTab === 'children' && (
        <div className="grid-cols-2">
          {/* Attendance sheet */}
          <div className="glass-card">
            <h3 style={styles.cardHeader}><CheckSquare size={18} /> Attendance Records</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentChild.attendance?.records?.map((att, idx) => (
                    <tr key={idx}>
                      <td>{new Date(att.date).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`badge ${
                          att.status === 'present' ? 'badge-success' : 
                          att.status === 'absent' ? 'badge-danger' : 'badge-warning'
                        }`}>{att.status}</span>
                      </td>
                    </tr>
                  ))}
                  {(!currentChild.attendance?.records || currentChild.attendance.records.length === 0) && (
                    <tr>
                      <td colSpan="2" style={{ textAlign: 'center', color: '#6b7280' }}>
                        No attendance records logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grades overview */}
          <div className="glass-card">
            <h3 style={styles.cardHeader}><Award size={18} /> Exam Grades Sheet</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Exam / Assignment</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {currentChild.grades?.map((g, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: '600' }}>{g.subject}</td>
                      <td>{g.exam_name}</td>
                      <td>
                        <span style={{ fontWeight: '700', color: (parseFloat(g.marks_obtained)/parseFloat(g.max_marks)) >= 0.8 ? 'var(--success)' : 'var(--warning)' }}>
                          {g.marks_obtained}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}> / {g.max_marks}</span>
                      </td>
                    </tr>
                  ))}
                  {(!currentChild.grades || currentChild.grades.length === 0) && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: '#6b7280' }}>
                        No academic exam grades recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TUITION PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <div className="grid-cols-2">
          {/* Invoice History */}
          <div className="glass-card">
            <h3 style={styles.cardHeader}><CreditCard size={18} /> Financial Invoice History</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice Detail</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentChild.fees?.map((fee) => (
                    <tr key={fee.id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{fee.title}</div>
                        {fee.paid_date && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--success)' }}>
                            Paid on: {new Date(fee.paid_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td>{formatCurrency(fee.amount)}</td>
                      <td>{new Date(fee.due_date).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`badge ${fee.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                            {fee.status === 'paid' ? <CheckCircle size={12} style={{ marginRight: '4px' }} /> : <Clock size={12} style={{ marginRight: '4px' }} />}
                            {fee.status}
                          </span>
                          {fee.status === 'pending' && (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                              onClick={() => handlePayInvoiceClick(fee)}
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!currentChild.fees || currentChild.fees.length === 0) && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: '#6b7280' }}>
                        No invoices generated.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Checkout Mockup Form */}
          {payingInvoice ? (
            <div className="glass-card animate-fade-in">
              <h3 style={styles.cardHeader}><CreditCard size={18} /> Payment Checkout</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                You are paying <strong>{formatCurrency(payingInvoice.amount)}</strong> for <strong>"{payingInvoice.title}"</strong>.
              </p>
              
              <form onSubmit={handleProcessPayment}>
                <div className="form-group">
                  <label className="form-label">Select Payment Method</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <button
                      type="button"
                      className={`btn ${selectedPaymentMethod === 'chappa' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                      onClick={() => setSelectedPaymentMethod('chappa')}
                    >
                      <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>Chappa</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Digital Payment</div>
                    </button>
                    <button
                      type="button"
                      className={`btn ${selectedPaymentMethod === 'telebirr' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                      onClick={() => setSelectedPaymentMethod('telebirr')}
                    >
                      <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>Tele Birr</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Mobile Money</div>
                    </button>
                    <button
                      type="button"
                      className={`btn ${selectedPaymentMethod === 'cbe' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                      onClick={() => setSelectedPaymentMethod('cbe')}
                    >
                      <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>CBE Birr</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Bank App</div>
                    </button>
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <strong>Payment Summary:</strong>
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85rem' }}>Invoice:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{payingInvoice.title}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.85rem' }}>Amount:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }}>{formatCurrency(payingInvoice.amount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem' }}>Payment Method:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>{selectedPaymentMethod}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={() => setPayingInvoice(null)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ flex: 2, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}
                    disabled={paymentSubmitting}
                  >
                    {paymentSubmitting
                      ? <><Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> Processing...</>
                      : `Pay with ${selectedPaymentMethod === 'chappa' ? 'Chapa' : selectedPaymentMethod === 'telebirr' ? 'Tele Birr' : 'CBE Birr'}`}
                  </button>
                </div>
              </form>
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : (
            <div className="glass-card" style={styles.selectInvoicePrompt}>
              <ShieldAlert size={36} color="var(--primary)" />
              <h4 style={{ margin: '14px 0 6px 0', fontWeight: '700' }}>Select Invoice for Payment</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '300px' }}>
                Please select an invoice from the "Pending School Fees" list in the Overview page or the history table on the left to begin your checkout mockup.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  loader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: '#9ca3af',
    fontSize: '1.1rem',
  },
  selectorCard: {
    padding: '14px 20px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  statIconContainer: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTitle: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
  },
  cardHeader: {
    fontSize: '1.05rem',
    fontWeight: '700',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--text-primary)',
  },
  announcementList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  announcementItem: {
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '14px',
  },
  annTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    marginBottom: '4px',
  },
  annContent: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    marginBottom: '8px',
  },
  annFooter: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  feeAlertBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '8px',
    padding: '14px',
  },
  allPaidBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '0.9rem',
    color: 'var(--success)',
  },
  selectInvoicePrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '40px 20px',
  }
};

export default ParentDashboard;
