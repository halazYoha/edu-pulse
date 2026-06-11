import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Toast from './Toast';
import { 
  Users, BookOpen, GraduationCap, DollarSign, Plus, 
  Trash2, Megaphone, CheckCircle, Clock, Loader2
} from 'lucide-react';

const AdminDashboard = ({ activeTab }) => {
  const { apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Toast notification state
  const [toast, setToast] = useState({ type: 'success', message: '' });
  const showToast = useCallback((type, message) => setToast({ type, message }), []);
  const clearToast = useCallback(() => setToast({ type: 'success', message: '' }), []);

  // Per-form submitting states
  const [submittingUser, setSubmittingUser]           = useState(false);
  const [submittingClass, setSubmittingClass]         = useState(false);
  const [submittingFee, setSubmittingFee]             = useState(false);
  const [submittingAnn, setSubmittingAnn]             = useState(false);
  const [deletingUserId, setDeletingUserId]           = useState(null);

  // Form states
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: 'password123', role: 'student', phone: '',
    class_id: '', roll_number: '', date_of_birth: '', student_id: ''
  });
  const [classForm, setClassForm] = useState({ name: '', teacher_id: '' });
  const [feeForm, setFeeForm] = useState({ student_id: '', title: '', amount: '', due_date: '' });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', target_role: 'all' });

  // Data lists
  const [usersList, setUsersList] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [feesList, setFeesList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const dbData = await apiFetch('/dashboard');
      setData(dbData);

      // Load lists based on active view
      if (activeTab === 'users') {
        const users = await apiFetch('/admin/users');
        setUsersList(users);
        setTeachersList(users.filter(u => u.role === 'teacher'));
        setStudentsList(users.filter(u => u.role === 'student'));
      } else if (activeTab === 'classes') {
        const classes = await apiFetch('/admin/classes');
        setClassesList(classes);
        // Need teachers for assign dropdown
        const users = await apiFetch('/admin/users?role=teacher');
        setTeachersList(users);
      } else if (activeTab === 'finances') {
        const fees = await apiFetch('/admin/fees');
        setFeesList(fees);
        // Need students for invoicing
        const users = await apiFetch('/admin/users?role=student');
        setStudentsList(users);
      }
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve server data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [activeTab]);

  // Form Submissions
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!userForm.name.trim())  { showToast('error', 'Full name is required.'); return; }
    if (!userForm.email.trim()) { showToast('error', 'Email address is required.'); return; }
    if (!userForm.password)     { showToast('error', 'Password is required.'); return; }
    setSubmittingUser(true);
    try {
      const payload = { ...userForm };
      if (payload.role !== 'student') { delete payload.class_id; delete payload.roll_number; delete payload.date_of_birth; }
      if (payload.role !== 'parent')  { delete payload.student_id; }
      await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(payload) });
      setUserForm({ name: '', email: '', password: 'password123', role: 'student', phone: '', class_id: '', roll_number: '', date_of_birth: '', student_id: '' });
      showToast('success', 'User account created successfully!');
      loadDashboardData();
    } catch (err) {
      showToast('error', err.message || 'Failed to create user.');
    } finally { setSubmittingUser(false); }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    setDeletingUserId(userId);
    try {
      await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
      showToast('success', 'User account deleted.');
      loadDashboardData();
    } catch (err) {
      showToast('error', 'Failed to delete user.');
    } finally { setDeletingUserId(null); }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!classForm.name.trim()) { showToast('error', 'Class name is required.'); return; }
    setSubmittingClass(true);
    try {
      await apiFetch('/admin/classes', { method: 'POST', body: JSON.stringify(classForm) });
      setClassForm({ name: '', teacher_id: '' });
      showToast('success', 'New class section created successfully!');
      loadDashboardData();
    } catch (err) {
      showToast('error', err.message || 'Failed to create class.');
    } finally { setSubmittingClass(false); }
  };

  const handleCreateFee = async (e) => {
    e.preventDefault();
    if (!feeForm.student_id) { showToast('error', 'Please select a student.'); return; }
    if (!feeForm.title.trim()) { showToast('error', 'Invoice title is required.'); return; }
    if (!feeForm.amount || parseFloat(feeForm.amount) <= 0) { showToast('error', 'Enter a valid amount.'); return; }
    if (!feeForm.due_date) { showToast('error', 'Due date is required.'); return; }
    setSubmittingFee(true);
    try {
      await apiFetch('/admin/fees', { method: 'POST', body: JSON.stringify(feeForm) });
      setFeeForm({ student_id: '', title: '', amount: '', due_date: '' });
      showToast('success', 'Fee invoice generated successfully!');
      loadDashboardData();
    } catch (err) {
      showToast('error', err.message || 'Failed to generate invoice.');
    } finally { setSubmittingFee(false); }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementForm.title.trim())   { showToast('error', 'Announcement title is required.'); return; }
    if (!announcementForm.content.trim()) { showToast('error', 'Announcement message is required.'); return; }
    setSubmittingAnn(true);
    try {
      await apiFetch('/admin/announcements', { method: 'POST', body: JSON.stringify(announcementForm) });
      setAnnouncementForm({ title: '', content: '', target_role: 'all' });
      showToast('success', 'Announcement posted to school portal!');
      loadDashboardData();
    } catch (err) {
      showToast('error', err.message || 'Failed to post announcement.');
    } finally { setSubmittingAnn(false); }
  };

  if (loading && !data) return <div style={styles.loader}>Loading dashboard parameters...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <Toast type={toast.type} message={toast.message} onClose={clearToast} />
      {error && <div style={{ display:'flex', alignItems:'center', gap:'8px', backgroundColor:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'8px', color:'#f87171', padding:'12px 14px', fontSize:'0.85rem' }}>{error}</div>}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && data && (
        <>
          {/* Status Metrics Cards Grid */}
          <div className="grid-cols-4">
            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><GraduationCap size={24} color="var(--primary)" /></div>
              <div>
                <p style={styles.statTitle}>Total Students</p>
                <h3 style={styles.statValue}>{data.totalStudents}</h3>
              </div>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><Users size={24} color="#10b981" /></div>
              <div>
                <p style={styles.statTitle}>Total Teachers</p>
                <h3 style={styles.statValue}>{data.totalTeachers}</h3>
              </div>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><BookOpen size={24} color="#f59e0b" /></div>
              <div>
                <p style={styles.statTitle}>Active Classes</p>
                <h3 style={styles.statValue}>{data.totalClasses}</h3>
              </div>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><DollarSign size={24} color="#ef4444" /></div>
              <div>
                <p style={styles.statTitle}>Fees Collected</p>
                <h3 style={styles.statValue}>
                  ${data.finance?.collected?.toLocaleString() || '0'}
                </h3>
              </div>
            </div>
          </div>

          <div className="grid-cols-2">
            {/* Recent Announcements */}
            <div className="glass-card">
              <h3 style={styles.cardHeader}><Megaphone size={18} /> Recent Announcements</h3>
              <div style={styles.announcementList}>
                {data.announcements?.map((ann) => (
                  <div key={ann.id} style={styles.announcementItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={styles.annTitle}>{ann.title}</h4>
                      <span className="badge badge-info">{ann.target_role}</span>
                    </div>
                    <p style={styles.annContent}>{ann.content}</p>
                    <div style={styles.annFooter}>
                      <span>Posted by {ann.author_name}</span>
                      <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                {data.announcements?.length === 0 && <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No announcements posted.</p>}
              </div>
            </div>

            {/* Post Announcement Form */}
            <div className="glass-card">
              <h3 style={styles.cardHeader}><Plus size={18} /> Post School Alert</h3>
              <form onSubmit={handleCreateAnnouncement}>
                <div className="form-group">
                  <label className="form-label">Alert Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Winter Holiday Schedule"
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Alert Message</label>
                  <textarea
                    rows="3"
                    className="form-control"
                    style={{ resize: 'none' }}
                    placeholder="Provide full notice details here..."
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Audience</label>
                  <select
                    className="form-control"
                    value={announcementForm.target_role}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, target_role: e.target.value })}
                  >
                    <option value="all">Everyone</option>
                    <option value="teacher">Teachers Only</option>
                    <option value="student">Students Only</option>
                    <option value="parent">Parents Only</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }} disabled={submittingAnn}>
                  {submittingAnn ? <><Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> Posting...</> : 'Post Announcement'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* MANAGE USERS TAB */}
      {activeTab === 'users' && (
        <div className="grid-cols-2">
          {/* User Directory */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={styles.cardHeader}><Users size={18} /> User Accounts</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((usr) => (
                    <tr key={usr.id}>
                      <td>{usr.name}</td>
                      <td>{usr.email}</td>
                      <td>
                        <span className={`badge ${
                          usr.role === 'admin' ? 'badge-danger' : 
                          usr.role === 'teacher' ? 'badge-success' : 
                          usr.role === 'student' ? 'badge-info' : 'badge-warning'
                        }`}>{usr.role}</span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => handleDeleteUser(usr.id, usr.name)}
                          style={{ padding: '6px', borderRadius: '4px', backgroundColor: 'transparent', border: 'none' }}
                          title="Delete User"
                          disabled={deletingUserId === usr.id}
                        >
                          {deletingUserId === usr.id
                            ? <Loader2 size={16} color="var(--danger)" style={{ animation:'spin 0.8s linear infinite' }} />
                            : <Trash2 size={16} color="var(--danger)" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Registration Form */}
          <div className="glass-card">
            <h3 style={styles.cardHeader}><Plus size={18} /> Register User Account</h3>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. John Doe"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="e.g. john@edupulse.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-control"
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="parent">Parent</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 555-0199"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                />
              </div>

              {/* Student fields conditional */}
              {userForm.role === 'student' && (
                <div style={styles.condSection}>
                  <p style={styles.condHeader}>Student Academic Profile Info</p>
                  <div className="form-group">
                    <label className="form-label">Roll Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. R2004"
                      value={userForm.roll_number}
                      onChange={(e) => setUserForm({ ...userForm, roll_number: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input
                      type="date"
                      className="form-control"
                      value={userForm.date_of_birth}
                      onChange={(e) => setUserForm({ ...userForm, date_of_birth: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Parent fields conditional */}
              {userForm.role === 'parent' && (
                <div style={styles.condSection}>
                  <p style={styles.condHeader}>Link to Student Account</p>
                  <div className="form-group">
                    <label className="form-label">Select Child</label>
                    <select
                      className="form-control"
                      value={userForm.student_id}
                      onChange={(e) => setUserForm({ ...userForm, student_id: e.target.value })}
                    >
                      <option value="">-- Select student --</option>
                      {studentsList.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width:'100%', marginTop:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }} disabled={submittingUser}>
                {submittingUser ? <><Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> Creating...</> : 'Create User Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CLASSES TAB */}
      {activeTab === 'classes' && (
        <div className="grid-cols-2">
          {/* Classes List */}
          <div className="glass-card">
            <h3 style={styles.cardHeader}><BookOpen size={18} /> School Classes</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Class Name</th>
                    <th>Class Teacher</th>
                    <th>Students Count</th>
                  </tr>
                </thead>
                <tbody>
                  {classesList.map((cls) => (
                    <tr key={cls.id}>
                      <td style={{ fontWeight: '600' }}>{cls.name}</td>
                      <td>{cls.teacher_name || <span style={{ color: 'var(--text-muted)' }}>None assigned</span>}</td>
                      <td>{cls.student_count} Students</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create Class Form */}
          <div className="glass-card">
            <h3 style={styles.cardHeader}><Plus size={18} /> Create New Class Section</h3>
            <form onSubmit={handleCreateClass}>
              <div className="form-group">
                <label className="form-label">Class Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Grade 12-A"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Class Teacher</label>
                <select
                  className="form-control"
                  value={classForm.teacher_id}
                  onChange={(e) => setClassForm({ ...classForm, teacher_id: e.target.value })}
                >
                  <option value="">-- Select Teacher --</option>
                  {teachersList.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width:'100%', marginTop:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }} disabled={submittingClass}>
                {submittingClass ? <><Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> Creating...</> : 'Create Class Section'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FINANCES (FEE INVOICES) TAB */}
      {activeTab === 'finances' && (
        <div className="grid-cols-2">
          {/* Fees Invoices Table */}
          <div className="glass-card">
            <h3 style={styles.cardHeader}><DollarSign size={18} /> Student Invoices</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Invoice Title</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {feesList.map((fee) => (
                    <tr key={fee.id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{fee.student_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{fee.class_name}</div>
                      </td>
                      <td>{fee.title}</td>
                      <td>${parseFloat(fee.amount).toFixed(2)}</td>
                      <td>{new Date(fee.due_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${fee.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                          {fee.status === 'paid' ? <CheckCircle size={12} style={{ marginRight: '4px' }} /> : <Clock size={12} style={{ marginRight: '4px' }} />}
                          {fee.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create Invoice Form */}
          <div className="glass-card">
            <h3 style={styles.cardHeader}><Plus size={18} /> Generate Tuition Invoice</h3>
            <form onSubmit={handleCreateFee}>
              <div className="form-group">
                <label className="form-label">Select Student</label>
                <select
                  className="form-control"
                  value={feeForm.student_id}
                  onChange={(e) => setFeeForm({ ...feeForm, student_id: e.target.value })}
                >
                  <option value="">-- Select Student --</option>
                  {studentsList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Invoice Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Term 2 Tuition Fee"
                  value={feeForm.title}
                  onChange={(e) => setFeeForm({ ...feeForm, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  placeholder="e.g. 1500.00"
                  value={feeForm.amount}
                  onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={feeForm.due_date}
                  onChange={(e) => setFeeForm({ ...feeForm, due_date: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width:'100%', marginTop:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }} disabled={submittingFee}>
                {submittingFee ? <><Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> Generating...</> : 'Generate Invoice'}
              </button>
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </form>
          </div>
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
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  condSection: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px dashed var(--border-color)',
    borderRadius: '6px',
    padding: '16px 16px 4px 16px',
    marginBottom: '18px',
  },
  condHeader: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--primary)',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }
};

export default AdminDashboard;
