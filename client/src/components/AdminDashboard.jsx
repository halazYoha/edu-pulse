import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Toast from './Toast';
import {
  Users, BookOpen, GraduationCap, DollarSign, Plus, Settings, Globe, Building,
  Trash2, Megaphone, CheckCircle, Clock, Loader2, Search, Edit2, XCircle, BadgeCheck,
  TrendingUp, FileText, Calendar, CreditCard, AlertCircle, UserCheck, School, Award
} from 'lucide-react';

const AdminDashboard = ({ activeTab }) => {
  const { apiFetch, settings, refreshSettings } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [toast, setToast] = useState({ type: 'success', message: '' });
  const showToast = useCallback((type, message) => setToast({ type, message }), []);
  const clearToast = useCallback(() => setToast({ type: 'success', message: '' }), []);

  // Loading/action states
  const [submittingUser, setSubmittingUser]         = useState(false);
  const [submittingClass, setSubmittingClass]       = useState(false);
  const [submittingFee, setSubmittingFee]           = useState(false);
  const [submittingAnn, setSubmittingAnn]           = useState(false);
  const [submittingSettings, setSubmittingSettings] = useState(false);
  const [deletingUserId, setDeletingUserId]         = useState(null);
  const [deletingClassId, setDeletingClassId]       = useState(null);
  const [deletingAnnId, setDeletingAnnId]           = useState(null);
  const [deletingFeeId, setDeletingFeeId]           = useState(null);
  const [togglingFeeId, setTogglingFeeId]           = useState(null);

  // Search/filter
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [feeStatusFilter, setFeeStatusFilter] = useState('all');

  // Form states
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: 'password123', role: 'student', phone: '',
    class_id: '', roll_number: '', date_of_birth: '', student_id: ''
  });
  // subjects is a comma-separated list stored per day in schedule
  const [classForm, setClassForm] = useState({ name: '', teacher_id: '', subjects: '' });
  const [feeForm, setFeeForm] = useState({ student_id: '', title: '', amount: '', due_date: '', payment_method: 'chappa' });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', target_role: 'all' });
  const [settingsForm, setSettingsForm] = useState({
    school_name: '', currency: 'ETB', currency_symbol: 'Br', country: 'ET', timezone: 'Africa/Addis_Ababa'
  });

  // Data lists
  const [usersList, setUsersList]     = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [feesList, setFeesList]       = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [announcementsList, setAnnouncementsList] = useState([]);

  // Populate settings form when context loads
  useEffect(() => {
    if (settings) setSettingsForm(prev => ({ ...prev, ...settings }));
  }, [settings]);

  const formatCurrency = (amount) => {
    const sym = settings?.currency_symbol || '$';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: settings?.currency || 'USD' }).format(amount);
    } catch { return `${sym}${parseFloat(amount || 0).toFixed(2)}`; }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const dbData = await apiFetch('/dashboard');
      setData(dbData);
      if (activeTab === 'users') {
        const users = await apiFetch('/admin/users');
        setUsersList(users);
        setTeachersList(users.filter(u => u.role === 'teacher'));
        setStudentsList(users.filter(u => u.role === 'student'));
      } else if (activeTab === 'classes') {
        const [classes, teachers] = await Promise.all([
          apiFetch('/admin/classes'),
          apiFetch('/admin/users?role=teacher')
        ]);
        setClassesList(classes);
        setTeachersList(teachers);
        // Also need students for class tab (for student count display)
        const students = await apiFetch('/admin/users?role=student');
        setStudentsList(students);
      } else if (activeTab === 'finances') {
        const [fees, students] = await Promise.all([
          apiFetch('/admin/fees'),
          apiFetch('/admin/users?role=student')
        ]);
        setFeesList(fees);
        setStudentsList(students);
      } else if (activeTab === 'overview') {
        const anns = await apiFetch('/admin/announcements');
        setAnnouncementsList(anns);
      }
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve server data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboardData(); }, [activeTab]);

  // ─── User handlers ───
  const handleCreateUser = async (e) => {
    e.preventDefault();
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!userForm.name.trim())               { showToast('error', 'Full name is required.'); return; }
    if (!userForm.email.trim())              { showToast('error', 'Email is required.'); return; }
    if (!emailRx.test(userForm.email))       { showToast('error', 'Enter a valid email address.'); return; }
    if (!userForm.password)                  { showToast('error', 'Password is required.'); return; }
    if (userForm.password.length < 6)        { showToast('error', 'Password must be at least 6 characters.'); return; }
    setSubmittingUser(true);
    try {
      const payload = { ...userForm };
      if (payload.role !== 'student') { delete payload.class_id; delete payload.roll_number; delete payload.date_of_birth; }
      if (payload.role !== 'parent')  { delete payload.student_id; }
      await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(payload) });
      setUserForm({ name: '', email: '', password: 'password123', role: 'student', phone: '', class_id: '', roll_number: '', date_of_birth: '', student_id: '' });
      showToast('success', 'User account created successfully!');
      loadDashboardData();
    } catch (err) { showToast('error', err.message || 'Failed to create user.'); }
    finally { setSubmittingUser(false); }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete "${userName}"? This cannot be undone.`)) return;
    setDeletingUserId(userId);
    try {
      await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
      showToast('success', 'User deleted.');
      loadDashboardData();
    } catch (err) { showToast('error', err.message || 'Failed to delete user.'); }
    finally { setDeletingUserId(null); }
  };

  // ─── Class handlers ───
  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!classForm.name.trim()) { showToast('error', 'Class name is required.'); return; }
    if (classForm.name.trim().length < 2) { showToast('error', 'Class name must be at least 2 characters.'); return; }
    setSubmittingClass(true);
    try {
      // Build schedule with subjects for each day
      const subjectList = classForm.subjects.split(',').map(s => s.trim()).filter(Boolean);
      const schedule = { Monday: subjectList, Tuesday: subjectList, Wednesday: subjectList, Thursday: subjectList, Friday: subjectList };
      await apiFetch('/admin/classes', { method: 'POST', body: JSON.stringify({ name: classForm.name, teacher_id: classForm.teacher_id, schedule }) });
      setClassForm({ name: '', teacher_id: '', subjects: '' });
      showToast('success', 'Class created successfully!');
      loadDashboardData();
    } catch (err) { showToast('error', err.message || 'Failed to create class.'); }
    finally { setSubmittingClass(false); }
  };

  const handleDeleteClass = async (classId, className) => {
    if (!window.confirm(`Delete class "${className}"? Students will be unassigned.`)) return;
    setDeletingClassId(classId);
    try {
      await apiFetch(`/admin/classes/${classId}`, { method: 'DELETE' });
      showToast('success', 'Class deleted.');
      loadDashboardData();
    } catch (err) { showToast('error', err.message || 'Failed to delete class.'); }
    finally { setDeletingClassId(null); }
  };

  // ─── Fee handlers ───
  const handleCreateFee = async (e) => {
    e.preventDefault();
    if (!feeForm.student_id)                          { showToast('error', 'Please select a student.'); return; }
    if (!feeForm.title.trim())                        { showToast('error', 'Invoice title is required.'); return; }
    if (!feeForm.amount || parseFloat(feeForm.amount) <= 0) { showToast('error', 'Enter a valid amount greater than 0.'); return; }
    if (parseFloat(feeForm.amount) > 1000000)         { showToast('error', 'Amount cannot exceed 1,000,000.'); return; }
    if (!feeForm.due_date)                            { showToast('error', 'Due date is required.'); return; }
    setSubmittingFee(true);
    try {
      await apiFetch('/admin/fees', { method: 'POST', body: JSON.stringify(feeForm) });
      setFeeForm({ student_id: '', title: '', amount: '', due_date: '', payment_method: 'chappa' });
      showToast('success', 'Invoice generated!');
      loadDashboardData();
    } catch (err) { showToast('error', err.message || 'Failed to generate invoice.'); }
    finally { setSubmittingFee(false); }
  };

  const handleToggleFeeStatus = async (fee) => {
    setTogglingFeeId(fee.id);
    const newStatus = fee.status === 'paid' ? 'pending' : 'paid';
    try {
      await apiFetch(`/admin/fees/${fee.id}/status`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
      showToast('success', `Invoice marked as ${newStatus}.`);
      loadDashboardData();
    } catch (err) { showToast('error', err.message || 'Failed to update status.'); }
    finally { setTogglingFeeId(null); }
  };

  const handleDeleteFee = async (feeId) => {
    if (!window.confirm('Delete this invoice? This cannot be undone.')) return;
    setDeletingFeeId(feeId);
    try {
      await apiFetch(`/admin/fees/${feeId}`, { method: 'DELETE' });
      showToast('success', 'Invoice deleted.');
      loadDashboardData();
    } catch (err) { showToast('error', err.message || 'Failed to delete invoice.'); }
    finally { setDeletingFeeId(null); }
  };

  // ─── Announcement handlers ───
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementForm.title.trim())   { showToast('error', 'Title is required.'); return; }
    if (announcementForm.title.trim().length < 3) { showToast('error', 'Title must be at least 3 characters.'); return; }
    if (!announcementForm.content.trim()) { showToast('error', 'Message is required.'); return; }
    if (announcementForm.content.trim().length < 10) { showToast('error', 'Message must be at least 10 characters.'); return; }
    setSubmittingAnn(true);
    try {
      await apiFetch('/admin/announcements', { method: 'POST', body: JSON.stringify(announcementForm) });
      setAnnouncementForm({ title: '', content: '', target_role: 'all' });
      showToast('success', 'Announcement posted!');
      loadDashboardData();
    } catch (err) { showToast('error', err.message || 'Failed to post announcement.'); }
    finally { setSubmittingAnn(false); }
  };

  const handleDeleteAnnouncement = async (annId) => {
    if (!window.confirm('Delete this announcement?')) return;
    setDeletingAnnId(annId);
    try {
      await apiFetch(`/admin/announcements/${annId}`, { method: 'DELETE' });
      showToast('success', 'Announcement deleted.');
      loadDashboardData();
    } catch (err) { showToast('error', err.message || 'Failed to delete announcement.'); }
    finally { setDeletingAnnId(null); }
  };

  // ─── Settings handler ───
  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    if (!settingsForm.school_name.trim()) { showToast('error', 'School name is required.'); return; }
    setSubmittingSettings(true);
    try {
      await apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(settingsForm) });
      await refreshSettings();
      showToast('success', 'Settings saved!');
    } catch (err) { showToast('error', err.message || 'Failed to save settings.'); }
    finally { setSubmittingSettings(false); }
  };

  // ─── Filtered lists ───
  const filteredUsers = usersList.filter(u => {
    const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchSearch = !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
    return matchRole && matchSearch;
  });
  const filteredFees = feesList.filter(f => feeStatusFilter === 'all' || f.status === feeStatusFilter);

  if (loading && !data) return <div style={styles.loader}>Loading dashboard parameters...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <Toast type={toast.type} message={toast.message} onClose={clearToast} />
      {error && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', padding: '12px 14px', fontSize: '0.85rem' }}>{error}</div>}

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
                <p style={{fontSize:'0.72rem',color:'#10b981',marginTop:'2px'}}>Enrolled</p>
              </div>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><Users size={24} color="#10b981" /></div>
              <div>
                <p style={styles.statTitle}>Total Teachers</p>
                <h3 style={styles.statValue}>{data.totalTeachers}</h3>
                <p style={{fontSize:'0.72rem',color:'#10b981',marginTop:'2px'}}>Active Staff</p>
              </div>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><BookOpen size={24} color="#f59e0b" /></div>
              <div>
                <p style={styles.statTitle}>Active Classes</p>
                <h3 style={styles.statValue}>{data.totalClasses}</h3>
                <p style={{fontSize:'0.72rem',color:'#10b981',marginTop:'2px'}}>Sections</p>
              </div>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><DollarSign size={24} color="#ef4444" /></div>
              <div>
                <p style={styles.statTitle}>Revenue</p>
                <h3 style={styles.statValue}>{formatCurrency(data.finance?.collected || 0)}</h3>
                <p style={{fontSize:'0.72rem',color:'#f87171',marginTop:'2px'}}>{formatCurrency(data.finance?.pending || 0)} pending</p>
              </div>
            </div>
          </div>

          {/* Additional Metrics Row */}
          <div className="grid-cols-3">
            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><School size={20} color="#8b5cf6" /></div>
              <div>
                <p style={styles.statTitle}>School Name</p>
                <h4 style={{fontSize:'1rem',fontWeight:'600',color:'var(--text-primary)'}}>{settings?.school_name || 'EduPulse Academy'}</h4>
              </div>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><Calendar size={20} color="#06b6d4" /></div>
              <div>
                <p style={styles.statTitle}>Academic Year</p>
                <h4 style={{fontSize:'1rem',fontWeight:'600',color:'var(--text-primary)'}}>2025-2026</h4>
              </div>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><Award size={20} color="#ec4899" /></div>
              <div>
                <p style={styles.statTitle}>System Status</p>
                <h4 style={{fontSize:'1rem',fontWeight:'600',color:'#10b981'}}>● Operational</h4>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="glass-card">
            <h3 style={styles.cardHeader}><CreditCard size={18} /> Financial Overview</h3>
            <div className="grid-cols-3" style={{gap:'16px'}}>
              <div style={{textAlign:'center',padding:'16px',backgroundColor:'rgba(16,185,129,0.1)',borderRadius:'8px',border:'1px solid rgba(16,185,129,0.2)'}}>
                <p style={{fontSize:'0.8rem',color:'#10b981',marginBottom:'4px'}}>Total Collected</p>
                <h3 style={{fontSize:'1.5rem',fontWeight:'700',color:'#10b981'}}>{formatCurrency(data.finance?.collected || 0)}</h3>
              </div>
              <div style={{textAlign:'center',padding:'16px',backgroundColor:'rgba(245,158,11,0.1)',borderRadius:'8px',border:'1px solid rgba(245,158,11,0.2)'}}>
                <p style={{fontSize:'0.8rem',color:'#f59e0b',marginBottom:'4px'}}>Pending Collection</p>
                <h3 style={{fontSize:'1.5rem',fontWeight:'700',color:'#f59e0b'}}>{formatCurrency(data.finance?.pending || 0)}</h3>
              </div>
              <div style={{textAlign:'center',padding:'16px',backgroundColor:'rgba(99,102,241,0.1)',borderRadius:'8px',border:'1px solid rgba(99,102,241,0.2)'}}>
                <p style={{fontSize:'0.8rem',color:'var(--primary)',marginBottom:'4px'}}>Total Revenue</p>
                <h3 style={{fontSize:'1.5rem',fontWeight:'700',color:'var(--primary)'}}>{formatCurrency((data.finance?.collected || 0) + (data.finance?.pending || 0))}</h3>
              </div>
            </div>
          </div>

          <div className="grid-cols-2">
            {/* Recent Announcements */}
            <div className="glass-card">
              <h3 style={styles.cardHeader}><Megaphone size={18} /> Recent Announcements</h3>
              <div style={styles.announcementList}>
                {(announcementsList.length ? announcementsList : data.announcements || []).map((ann) => (
                  <div key={ann.id} style={styles.announcementItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={styles.annTitle}>{ann.title}</h4>
                        <span className="badge badge-info" style={{marginBottom:'6px'}}>{ann.target_role}</span>
                      </div>
                      <button onClick={() => handleDeleteAnnouncement(ann.id)} disabled={deletingAnnId === ann.id}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', flexShrink: 0 }} title="Delete">
                        {deletingAnnId === ann.id ? <Loader2 size={14} color="#f87171" style={{animation:'spin 0.8s linear infinite'}} /> : <Trash2 size={14} color="#f87171" />}
                      </button>
                    </div>
                    <p style={styles.annContent}>{ann.content}</p>
                    <div style={styles.annFooter}>
                      <span>Posted by {ann.author_name}</span>
                      <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                {!announcementsList.length && !data.announcements?.length && <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No announcements posted.</p>}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="glass-card">
              <h3 style={styles.cardHeader}><TrendingUp size={18} /> Quick Actions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button 
                  onClick={() => {/* Navigate to user creation */}}
                  style={styles.quickActionButton}
                  className="btn btn-outline"
                >
                  <UserCheck size={20} />
                  <span>Add Student</span>
                </button>
                <button 
                  onClick={() => {/* Navigate to class creation */}}
                  style={styles.quickActionButton}
                  className="btn btn-outline"
                >
                  <BookOpen size={20} />
                  <span>Create Class</span>
                </button>
                <button 
                  onClick={() => {/* Navigate to fee creation */}}
                  style={styles.quickActionButton}
                  className="btn btn-outline"
                >
                  <CreditCard size={20} />
                  <span>Generate Invoice</span>
                </button>
                <button 
                  onClick={() => {/* Navigate to settings */}}
                  style={styles.quickActionButton}
                  className="btn btn-outline"
                >
                  <Settings size={20} />
                  <span>Settings</span>
                </button>
              </div>
              
              {/* Post Announcement Form */}
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>Post School Alert</h4>
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
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={submittingAnn}>
                    {submittingAnn ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Posting...</> : 'Post Announcement'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MANAGE USERS TAB */}
      {activeTab === 'users' && (
        <div className="grid-cols-2">
          {/* User Directory */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{...styles.cardHeader, marginBottom: '4px'}}><Users size={18} /> User Management <span style={{fontSize:'0.8rem',color:'var(--text-muted)',fontWeight:'400'}}>({filteredUsers.length})</span></h3>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',paddingBottom:'12px',borderBottom:'1px solid var(--border-color)',marginBottom:'12px'}}>
              <div style={{display:'flex',gap:'6px'}}>
                <span className="badge badge-success">{usersList.filter(u=>u.role==='student').length} Students</span>
                <span className="badge badge-info">{usersList.filter(u=>u.role==='teacher').length} Teachers</span>
                <span className="badge badge-warning">{usersList.filter(u=>u.role==='parent').length} Parents</span>
                <span className="badge badge-danger">{usersList.filter(u=>u.role==='admin').length} Admins</span>
              </div>
            </div>
            {/* Search + Filter */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '140px' }}>
                <Search size={14} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#6b7280' }} />
                <input className="form-control" placeholder="Search name or email..." value={userSearch}
                  onChange={e => setUserSearch(e.target.value)} style={{ paddingLeft: '32px', marginBottom: 0 }} />
              </div>
              <select className="form-control" style={{ width: 'auto', marginBottom: 0 }} value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}>
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
                <option value="parent">Parent</option>
              </select>
            </div>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr></thead>
                <tbody>
                  {filteredUsers.map((usr) => (
                    <tr key={usr.id}>
                      <td style={{fontWeight:'600'}}>{usr.name}</td>
                      <td style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}>{usr.email}</td>
                      <td><span className={`badge ${ usr.role==='admin'?'badge-danger': usr.role==='teacher'?'badge-success': usr.role==='student'?'badge-info':'badge-warning'}`}>{usr.role}</span></td>
                      <td style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{new Date(usr.created_at).toLocaleDateString()}</td>
                      <td>
                        <button onClick={() => handleDeleteUser(usr.id, usr.name)} disabled={deletingUserId === usr.id}
                          style={{ background:'none', border:'none', cursor:'pointer', padding:'4px' }} title="Delete">
                          {deletingUserId === usr.id ? <Loader2 size={15} color="var(--danger)" style={{animation:'spin 0.8s linear infinite'}} /> : <Trash2 size={15} color="var(--danger)" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && <tr><td colSpan="5" style={{textAlign:'center',color:'#6b7280',padding:'20px'}}>No users found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Registration Form */}
          <div className="glass-card">
            <h3 style={styles.cardHeader}><UserCheck size={18} /> Register New User</h3>
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

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={submittingUser}>
                {submittingUser ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Creating...</> : 'Create User Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CLASSES TAB */}
      {activeTab === 'classes' && (
        <div className="grid-cols-2">
          <div className="glass-card">
            <h3 style={{...styles.cardHeader,marginBottom:'16px'}}><BookOpen size={18} /> Class Management <span style={{fontSize:'0.8rem',color:'var(--text-muted)',fontWeight:'400'}}>({classesList.length})</span></h3>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Class</th><th>Teacher</th><th>Students</th><th>Subjects</th><th></th></tr></thead>
                <tbody>
                  {classesList.map((cls) => {
                    const allSubjects = cls.schedule ? [...new Set(Object.values(cls.schedule).flat())] : [];
                    return (
                      <tr key={cls.id}>
                        <td style={{fontWeight:'600'}}>{cls.name}</td>
                        <td>{cls.teacher_name || <span style={{color:'var(--text-muted)'}}>—</span>}</td>
                        <td><span className="badge badge-info">{cls.student_count}</span></td>
                        <td style={{fontSize:'0.72rem',color:'var(--text-secondary)',maxWidth:'130px',whiteSpace:'normal'}}>
                          {allSubjects.length ? allSubjects.slice(0,4).join(', ') + (allSubjects.length > 4 ? '...' : '') : <span style={{color:'var(--text-muted)'}}>—</span>}
                        </td>
                        <td>
                          <button onClick={() => handleDeleteClass(cls.id, cls.name)} disabled={deletingClassId === cls.id}
                            style={{background:'none',border:'none',cursor:'pointer',padding:'4px'}}>
                            {deletingClassId === cls.id ? <Loader2 size={14} color="var(--danger)" style={{animation:'spin 0.8s linear infinite'}}/> : <Trash2 size={14} color="var(--danger)"/>}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {classesList.length === 0 && <tr><td colSpan="5" style={{textAlign:'center',color:'#6b7280',padding:'20px'}}>No classes yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card">
            <h3 style={styles.cardHeader}><Plus size={18} /> Create New Class</h3>
            <form onSubmit={handleCreateClass}>
              <div className="form-group">
                <label className="form-label">Class Name <span style={{color:'#f87171'}}>*</span></label>
                <input type="text" className="form-control" placeholder="e.g. Grade 10-A"
                  value={classForm.name} onChange={(e) => setClassForm({...classForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Subjects <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>(comma-separated)</span></label>
                <input type="text" className="form-control" placeholder="e.g. Math, Science, English, History"
                  value={classForm.subjects} onChange={(e) => setClassForm({...classForm, subjects: e.target.value})} />
                <p style={{fontSize:'0.71rem',color:'var(--text-muted)',marginTop:'4px'}}>Applied to all weekdays for this class.</p>
              </div>
              <div className="form-group">
                <label className="form-label">Assign Teacher</label>
                <select className="form-control" value={classForm.teacher_id} onChange={(e) => setClassForm({...classForm, teacher_id: e.target.value})}>
                  <option value="">-- Select Teacher --</option>
                  {teachersList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',marginTop:'10px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}} disabled={submittingClass}>
                {submittingClass ? <><Loader2 size={15} style={{animation:'spin 0.8s linear infinite'}}/> Creating...</> : 'Create Class'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FINANCES TAB */}
      {activeTab === 'finances' && (
        <div className="grid-cols-2">
          <div className="glass-card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px',gap:'8px',flexWrap:'wrap'}}>
              <h3 style={{...styles.cardHeader,marginBottom:0}}><DollarSign size={18} /> Invoices</h3>
              <select className="form-control" style={{width:'auto',marginBottom:0}} value={feeStatusFilter} onChange={e => setFeeStatusFilter(e.target.value)}>
                <option value="all">All</option><option value="paid">Paid</option><option value="pending">Pending</option>
              </select>
            </div>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Student</th><th>Title</th><th>Amount</th><th>Payment Method</th><th>Due</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {filteredFees.map((fee) => (
                    <tr key={fee.id}>
                      <td><div style={{fontWeight:'600'}}>{fee.student_name}</div><div style={{fontSize:'0.72rem',color:'var(--text-secondary)'}}>{fee.class_name}</div></td>
                      <td style={{fontSize:'0.85rem'}}>{fee.title}</td>
                      <td style={{fontWeight:'600'}}>{formatCurrency(fee.amount)}</td>
                      <td><span className="badge badge-info" style={{fontSize:'0.75rem'}}>{fee.payment_method || 'N/A'}</span></td>
                      <td style={{fontSize:'0.8rem'}}>{new Date(fee.due_date).toLocaleDateString()}</td>
                      <td>
                        <button onClick={() => handleToggleFeeStatus(fee)} disabled={togglingFeeId === fee.id}
                          style={{background:'none',border:'none',cursor:'pointer',padding:'2px'}} title="Toggle paid/pending">
                          {togglingFeeId === fee.id
                            ? <Loader2 size={14} style={{animation:'spin 0.8s linear infinite',color:'#9ca3af'}}/>
                            : <span className={`badge ${fee.status==='paid'?'badge-success':'badge-warning'}`} style={{cursor:'pointer'}}>
                                {fee.status==='paid'?<CheckCircle size={11} style={{marginRight:'3px'}}/>:<Clock size={11} style={{marginRight:'3px'}}/>}{fee.status}</span>}
                        </button>
                      </td>
                      <td>
                        <button onClick={() => handleDeleteFee(fee.id)} disabled={deletingFeeId === fee.id}
                          style={{background:'none',border:'none',cursor:'pointer',padding:'4px'}}>
                          {deletingFeeId === fee.id ? <Loader2 size={14} color="var(--danger)" style={{animation:'spin 0.8s linear infinite'}}/> : <Trash2 size={14} color="var(--danger)"/>}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredFees.length === 0 && <tr><td colSpan="7" style={{textAlign:'center',color:'#6b7280',padding:'20px'}}>No invoices found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card">
            <h3 style={styles.cardHeader}><FileText size={18} /> Create New Invoice</h3>
            <form onSubmit={handleCreateFee}>
              <div className="form-group">
                <label className="form-label">Student <span style={{color:'#f87171'}}>*</span></label>
                <select className="form-control" value={feeForm.student_id} onChange={(e) => setFeeForm({...feeForm, student_id: e.target.value})}>
                  <option value="">-- Select Student --</option>
                  {studentsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Invoice Title <span style={{color:'#f87171'}}>*</span></label>
                <input type="text" className="form-control" placeholder="e.g. Term 2 Tuition Fee"
                  value={feeForm.title} onChange={(e) => setFeeForm({...feeForm, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Amount ({settings?.currency_symbol || '$'}) <span style={{color:'#f87171'}}>*</span></label>
                <input type="number" step="0.01" min="0.01" className="form-control" placeholder="e.g. 1500.00"
                  value={feeForm.amount} onChange={(e) => setFeeForm({...feeForm, amount: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date <span style={{color:'#f87171'}}>*</span></label>
                <input type="date" className="form-control" value={feeForm.due_date}
                  onChange={(e) => setFeeForm({...feeForm, due_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method <span style={{color:'#f87171'}}>*</span></label>
                <select className="form-control" value={feeForm.payment_method} onChange={(e) => setFeeForm({...feeForm, payment_method: e.target.value})}>
                  <option value="chappa">Chappa</option>
                  <option value="telebirr">Tele Birr</option>
                  <option value="cbe">CBE Birr</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',marginTop:'10px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}} disabled={submittingFee}>
                {submittingFee ? <><Loader2 size={15} style={{animation:'spin 0.8s linear infinite'}}/> Generating...</> : 'Generate Invoice'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SYSTEM SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div style={{maxWidth:'680px',margin:'0 auto',width:'100%'}}>
          <div className="glass-card">
            <h3 style={styles.cardHeader}><Settings size={18} /> System Settings</h3>
            <p style={{color:'#9ca3af',fontSize:'0.85rem',marginBottom:'24px'}}>Configure branding, currency and regional preferences across all portals.</p>
            <form onSubmit={handleUpdateSettings}>
              <div style={{borderBottom:'1px solid rgba(255,255,255,0.06)',paddingBottom:'20px',marginBottom:'20px'}}>
                <p style={styles.condHeader}><Building size={13} style={{marginRight:'6px',verticalAlign:'middle'}}/>School Profile</p>
                <div className="form-group">
                  <label className="form-label">School Name <span style={{color:'#f87171'}}>*</span></label>
                  <input type="text" className="form-control" placeholder="e.g. EduPulse International Academy"
                    value={settingsForm.school_name} onChange={(e) => setSettingsForm({...settingsForm, school_name: e.target.value})} />
                </div>
              </div>
              <div>
                <p style={styles.condHeader}><Globe size={13} style={{marginRight:'6px',verticalAlign:'middle'}}/>Localization &amp; Currency</p>
                <div className="grid-cols-2" style={{gap:'14px'}}>
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <select className="form-control" value={settingsForm.country} onChange={(e) => setSettingsForm({...settingsForm, country: e.target.value})}>
                      {[['ET','Ethiopia'],['US','United States'],['GB','United Kingdom'],['EU','Eurozone'],['CA','Canada'],['AU','Australia'],['IN','India'],['JP','Japan'],['ZA','South Africa'],['AE','UAE'],['SA','Saudi Arabia'],['SG','Singapore'],['KE','Kenya'],['NG','Nigeria'],['PK','Pakistan'],['BD','Bangladesh'],['PH','Philippines'],['BR','Brazil'],['MX','Mexico'],['TR','Turkey'],['EG','Egypt']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Timezone</label>
                    <select className="form-control" value={settingsForm.timezone} onChange={(e) => setSettingsForm({...settingsForm, timezone: e.target.value})}>
                      {[['Africa/Addis_Ababa','East Africa Time (EAT)'],['America/New_York','Eastern (ET)'],['America/Chicago','Central (CT)'],['America/Los_Angeles','Pacific (PT)'],['Europe/London','London (GMT)'],['Europe/Paris','Central Europe (CET)'],['Asia/Kolkata','India (IST)'],['Asia/Tokyo','Japan (JST)'],['Asia/Dubai','Gulf (GST)'],['Asia/Riyadh','Saudi Arabia'],['Asia/Singapore','Singapore (SGT)'],['Asia/Karachi','Pakistan (PKT)'],['Africa/Nairobi','East Africa (EAT)'],['Africa/Lagos','West Africa (WAT)'],['Africa/Johannesburg','South Africa (SAST)'],['Asia/Dhaka','Bangladesh (BST)'],['Asia/Manila','Philippines (PHT)'],['America/Sao_Paulo','Brazil (BRT)'],['UTC','UTC']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid-cols-2" style={{gap:'14px',marginTop:'4px'}}>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select className="form-control" value={settingsForm.currency} onChange={(e) => {
                      const code = e.target.value;
                      const sym = {ETB:'Br',USD:'$',EUR:'€',GBP:'£',CAD:'$',AUD:'$',INR:'₹',JPY:'¥',ZAR:'R',AED:'د.إ',SAR:'ر.س',SGD:'$',KES:'KSh',NGN:'₦',PKR:'₨',BDT:'৳',PHP:'₱',BRL:'R$',MXN:'$',TRY:'₺',EGP:'E£'}[code] || code;
                      setSettingsForm({...settingsForm, currency: code, currency_symbol: sym});
                    }}>
                      {[['ETB','Ethiopian Birr'],['USD','US Dollar'],['EUR','Euro'],['GBP','British Pound'],['CAD','Canadian Dollar'],['AUD','Australian Dollar'],['INR','Indian Rupee'],['JPY','Japanese Yen'],['ZAR','South African Rand'],['AED','UAE Dirham'],['SAR','Saudi Riyal'],['SGD','Singapore Dollar'],['KES','Kenyan Shilling'],['NGN','Nigerian Naira'],['PKR','Pakistani Rupee'],['BDT','Bangladeshi Taka'],['PHP','Philippine Peso'],['BRL','Brazilian Real'],['MXN','Mexican Peso'],['TRY','Turkish Lira'],['EGP','Egyptian Pound']].map(([v,l]) => <option key={v} value={v}>{v} — {l}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency Symbol</label>
                    <input type="text" className="form-control" value={settingsForm.currency_symbol}
                      onChange={(e) => setSettingsForm({...settingsForm, currency_symbol: e.target.value})} />
                  </div>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{width:'100%',marginTop:'20px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}} disabled={submittingSettings}>
                {submittingSettings ? <><Loader2 size={15} style={{animation:'spin 0.8s linear infinite'}}/> Saving...</> : 'Save Settings'}
              </button>
            </form>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
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
  },
  quickActionButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: 'var(--text-primary)',
  },
  quickActionButtonHover: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'var(--primary)',
    transform: 'translateY(-2px)',
  }
};

export default AdminDashboard;
