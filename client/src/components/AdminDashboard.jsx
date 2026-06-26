import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Toast from './Toast';
import {
  Users, BookOpen, GraduationCap, DollarSign, Plus, Settings, Globe, Building,
  Trash2, Megaphone, CheckCircle, Clock, Loader2, Search, Edit2, XCircle, BadgeCheck,
  TrendingUp, FileText, Calendar, CreditCard, AlertCircle, UserCheck, School, Award,
  ChevronDown, UserPlus, ClipboardList, ShieldAlert, ShieldCheck, Activity, Briefcase,
  Clock3, LayoutGrid, CheckSquare, BarChart3, UploadCloud, RefreshCw, Filter, ArrowRight
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
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Search/filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  // Form states
  const [admissionForm, setAdmissionForm] = useState({
    studentName: '', dob: '', gender: 'male', address: '', previousSchool: '', classId: '', rollNumber: '',
    parentType: 'father', parentName: '', parentPhone: '', parentEmail: '', parentOccupation: ''
  });

  const [teacherForm, setTeacherForm] = useState({
    name: '', email: '', password: 'password123', phone: '', gender: 'male',
    employee_id: '', qualification: '', department: '', class_id: ''
  });

  const [staffForm, setStaffForm] = useState({
    name: '', email: '', password: 'password123', phone: '',
    employee_id: '', department: '', position: 'accountant'
  });

  const [adminFormState, setAdminFormState] = useState({
    name: '', email: '', password: 'password123', phone: ''
  });

  const [classSectionForm, setClassSectionForm] = useState({
    name: '', teacher_id: '', academic_year_id: '', term_id: '', grade_id: '', section: ''
  });

  const [academicYearForm, setAcademicYearForm] = useState({ name: '', status: 'inactive' });
  const [termForm, setTermForm] = useState({ academic_year_id: '', name: '', status: 'inactive' });
  const [gradeLevelForm, setGradeLevelForm] = useState({ name: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '' });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', target_role: 'all' });
  const [settingsForm, setSettingsForm] = useState({
    school_name: '', currency: 'ETB', currency_symbol: 'Br', country: 'ET', timezone: 'Africa/Addis_Ababa'
  });
  const [feeInvoiceForm, setFeeInvoiceForm] = useState({ student_id: '', title: '', amount: '', due_date: '' });

  // Data lists
  const [usersList, setUsersList] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [feesList, setFeesList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [parentsList, setParentsList] = useState([]);
  const [announcementsList, setAnnouncementsList] = useState([]);
  
  // Academic lists
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [gradesList, setGradesList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  // Roles & Permissions state
  const [rolesPermissions, setRolesPermissions] = useState({});
  const [allPermissions, setAllPermissions] = useState([]);
  const [activeRoleConfig, setActiveRoleConfig] = useState('teacher');

  // Bulk Import state
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [parsedBulkStudents, setParsedBulkStudents] = useState([]);

  // Edit states (Modal/Inline)
  const [editingUser, setEditingUser] = useState(null);
  const [editingClass, setEditingClass] = useState(null);

  // Populate settings form
  useEffect(() => {
    if (settings) setSettingsForm(prev => ({ ...prev, ...settings }));
  }, [settings]);

  const formatCurrency = (amount) => {
    const sym = settings?.currency_symbol || '$';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: settings?.currency || 'USD' }).format(amount);
    } catch { return `${sym}${parseFloat(amount || 0).toFixed(2)}`; }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const summary = await apiFetch('/admin/reports/summary');
      setData(summary);

      // Fetch lists depending on the active tab or load essential ones
      const classes = await apiFetch('/admin/classes');
      setClassesList(classes);

      const yrs = await apiFetch('/admin/academic-years');
      setAcademicYears(yrs);

      const tms = await apiFetch('/admin/terms');
      setTerms(tms);

      const grds = await apiFetch('/admin/grades-list');
      setGradesList(grds);

      const subjs = await apiFetch('/admin/subjects');
      setSubjectsList(subjs);

      if (activeTab === 'overview') {
        const anns = await apiFetch('/admin/announcements');
        setAnnouncementsList(anns);
      } else if (activeTab.startsWith('users')) {
        const users = await apiFetch('/admin/users');
        setUsersList(users);
        setTeachersList(users.filter(u => u.role === 'teacher'));
        setStudentsList(users.filter(u => u.role === 'student'));
        setParentsList(users.filter(u => u.role === 'parent'));

        if (activeTab === 'users-roles') {
          const perms = await apiFetch('/admin/permissions');
          setAllPermissions(perms);
          const rps = await apiFetch('/admin/roles');
          setRolesPermissions(rps);
        } else if (activeTab === 'users-logs') {
          const logs = await apiFetch('/admin/activity-logs');
          setActivityLogs(logs);
        }
      } else if (activeTab === 'admission-list') {
        const users = await apiFetch('/admin/users?role=student');
        setStudentsList(users);
      } else if (activeTab === 'finances-invoice') {
        const [fees, students] = await Promise.all([
          apiFetch('/admin/fees'),
          apiFetch('/admin/users?role=student')
        ]);
        setFeesList(fees);
        setStudentsList(students);
      }
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch school system data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // ─── Admission Handlers ───
  const handleAdmissionSubmit = async (e) => {
    e.preventDefault();
    if (!admissionForm.studentName.trim()) { showToast('error', 'Student Name is required'); return; }
    if (!admissionForm.classId) { showToast('error', 'Please select a Class Section'); return; }
    if (!admissionForm.parentName.trim()) { showToast('error', 'Parent Name is required'); return; }
    if (!admissionForm.parentPhone.trim()) { showToast('error', 'Parent Phone number is required'); return; }

    setSubmitting(true);
    try {
      const res = await apiFetch('/admin/admissions', {
        method: 'POST',
        body: JSON.stringify(admissionForm)
      });
      showToast('success', `Student admitted! Email: ${res.studentEmail}. Parent Account Created.`);
      setAdmissionForm({
        studentName: '', dob: '', gender: 'male', address: '', previousSchool: '', classId: '', rollNumber: '',
        parentType: 'father', parentName: '', parentPhone: '', parentEmail: '', parentOccupation: ''
      });
      loadData();
    } catch (err) {
      showToast('error', err.message || 'Admission registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // CSV Bulk Admission parser
  const handleParseCsv = () => {
    if (!bulkCsvText.trim()) {
      showToast('error', 'Please paste CSV data first');
      return;
    }
    try {
      const lines = bulkCsvText.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        showToast('error', 'CSV must contain headers and at least one student row.');
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim());
      const students = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < headers.length) continue;
        
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx];
        });
        students.push(row);
      }

      if (students.length === 0) {
        showToast('error', 'No valid rows parsed');
        return;
      }

      setParsedBulkStudents(students);
      showToast('success', `Parsed ${students.length} student records successfully!`);
    } catch (err) {
      showToast('error', 'Failed to parse CSV. Please check formatting.');
    }
  };

  const handleBulkImportSubmit = async () => {
    if (parsedBulkStudents.length === 0) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/admin/import/students', {
        method: 'POST',
        body: JSON.stringify({ students: parsedBulkStudents })
      });
      showToast('success', res.message);
      setParsedBulkStudents([]);
      setBulkCsvText('');
      loadData();
    } catch (err) {
      showToast('error', err.message || 'Bulk import failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const loadSampleCsv = () => {
    const sample = `name,dob,gender,address,rollNumber,classId,previousSchool,parentName,parentEmail,parentPhone,parentOccupation
Arthur Pendragon,2012-05-10,male,10 Round Table St,R201,${classesList[0]?.id || 1},Camelot Academy,Uther Pendragon,uther@camelot.com,555-9001,King
Guinevere Shield,2013-09-12,female,20 Castle Ave,R202,${classesList[0]?.id || 1},Highland Prep,Leodegrance Shield,leodegrance@shield.com,555-9002,Knight`;
    setBulkCsvText(sample);
    showToast('success', 'Loaded sample CSV template');
  };

  // ─── Direct Teacher Registration ───
  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    if (!teacherForm.name.trim()) return showToast('error', 'Teacher Name required');
    if (!teacherForm.email.trim()) return showToast('error', 'Email is required');
    setSubmitting(true);
    try {
      const payload = {
        name: teacherForm.name,
        email: teacherForm.email,
        password: teacherForm.password,
        role: 'teacher',
        phone: teacherForm.phone,
        employee_id: teacherForm.employee_id,
        gender: teacherForm.gender,
        qualification: teacherForm.qualification,
        department: teacherForm.department,
        class_id: teacherForm.class_id
      };
      await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('success', 'Teacher account created successfully!');
      setTeacherForm({
        name: '', email: '', password: 'password123', phone: '', gender: 'male',
        employee_id: '', qualification: '', department: '', class_id: ''
      });
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Direct Staff Registration ───
  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    if (!staffForm.name.trim()) return showToast('error', 'Staff Name required');
    if (!staffForm.email.trim()) return showToast('error', 'Email is required');
    setSubmitting(true);
    try {
      const payload = {
        name: staffForm.name,
        email: staffForm.email,
        password: staffForm.password,
        role: staffForm.position, // e.g. accountant, librarian
        phone: staffForm.phone,
        employee_id: staffForm.employee_id,
        department: staffForm.department,
        position: staffForm.position
      };
      await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('success', 'Staff account created successfully!');
      setStaffForm({
        name: '', email: '', password: 'password123', phone: '',
        employee_id: '', department: '', position: 'accountant'
      });
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Admin Registration ───
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (!adminFormState.name.trim()) return showToast('error', 'Name is required');
    if (!adminFormState.email.trim()) return showToast('error', 'Email is required');
    setSubmitting(true);
    try {
      await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          ...adminFormState,
          role: 'admin'
        })
      });
      showToast('success', 'Admin account created successfully!');
      setAdminFormState({ name: '', email: '', password: 'password123', phone: '' });
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Class Section Handlers ───
  const handleClassSectionSubmit = async (e) => {
    e.preventDefault();
    if (!classSectionForm.name.trim()) return showToast('error', 'Class Section Name required');
    setSubmitting(true);
    try {
      await apiFetch('/admin/classes', {
        method: 'POST',
        body: JSON.stringify(classSectionForm)
      });
      showToast('success', 'Class section created successfully');
      setClassSectionForm({ name: '', teacher_id: '', academic_year_id: '', term_id: '', grade_id: '', section: '' });
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Academic Years CRUD ───
  const handleAcademicYearSubmit = async (e) => {
    e.preventDefault();
    if (!academicYearForm.name.trim()) return showToast('error', 'Name is required');
    setSubmitting(true);
    try {
      await apiFetch('/admin/academic-years', {
        method: 'POST',
        body: JSON.stringify(academicYearForm)
      });
      showToast('success', 'Academic Year created');
      setAcademicYearForm({ name: '', status: 'inactive' });
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAcademicYearStatus = async (id, name, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await apiFetch(`/admin/academic-years/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, status: newStatus })
      });
      showToast('success', `Academic Year status updated to ${newStatus}`);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleDeleteAcademicYear = async (id) => {
    if (!window.confirm('Delete Academic Year? This will clear its terms.')) return;
    try {
      await apiFetch(`/admin/academic-years/${id}`, { method: 'DELETE' });
      showToast('success', 'Academic Year deleted');
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // ─── Terms CRUD ───
  const handleTermSubmit = async (e) => {
    e.preventDefault();
    if (!termForm.academic_year_id || !termForm.name.trim()) return showToast('error', 'Fill all term fields');
    setSubmitting(true);
    try {
      await apiFetch('/admin/terms', {
        method: 'POST',
        body: JSON.stringify(termForm)
      });
      showToast('success', 'Term semester added successfully');
      setTermForm({ academic_year_id: '', name: '', status: 'inactive' });
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTerm = async (id) => {
    if (!window.confirm('Delete this Term?')) return;
    try {
      await apiFetch(`/admin/terms/${id}`, { method: 'DELETE' });
      showToast('success', 'Term deleted successfully');
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // ─── Grades CRUD ───
  const handleGradeLevelSubmit = async (e) => {
    e.preventDefault();
    if (!gradeLevelForm.name.trim()) return showToast('error', 'Name is required');
    setSubmitting(true);
    try {
      await apiFetch('/admin/grades-list', {
        method: 'POST',
        body: JSON.stringify(gradeLevelForm)
      });
      showToast('success', 'Grade Level Created');
      setGradeLevelForm({ name: '' });
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Subjects CRUD ───
  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    if (!subjectForm.name.trim() || !subjectForm.code.trim()) return showToast('error', 'Name and Code are required');
    setSubmitting(true);
    try {
      await apiFetch('/admin/subjects', {
        method: 'POST',
        body: JSON.stringify(subjectForm)
      });
      showToast('success', 'Subject created successfully');
      setSubjectForm({ name: '', code: '' });
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Fees Handlers ───
  const handleCreateFee = async (e) => {
    e.preventDefault();
    if (!feeInvoiceForm.student_id || !feeInvoiceForm.amount) {
      return showToast('error', 'Please fill all invoice fields.');
    }
    setSubmitting(true);
    try {
      await apiFetch('/admin/fees', {
        method: 'POST',
        body: JSON.stringify(feeInvoiceForm)
      });
      showToast('success', 'Invoice generated successfully');
      setFeeInvoiceForm({ student_id: '', title: '', amount: '', due_date: '' });
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFeeStatus = async (fee) => {
    const newStatus = fee.status === 'paid' ? 'pending' : 'paid';
    try {
      await apiFetch(`/admin/fees/${fee.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      showToast('success', `Invoice updated to ${newStatus}`);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleDeleteFee = async (id) => {
    if (!window.confirm('Delete this fee invoice?')) return;
    try {
      await apiFetch(`/admin/fees/${id}`, { method: 'DELETE' });
      showToast('success', 'Invoice deleted');
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // ─── Roles & Permissions mappings ───
  const handleTogglePermission = async (permId) => {
    const activePerms = rolesPermissions[activeRoleConfig] || [];
    const hasPerm = activePerms.some(p => p.id === permId);
    let newPermIds = [];
    
    if (hasPerm) {
      newPermIds = activePerms.filter(p => p.id !== permId).map(p => p.id);
    } else {
      newPermIds = [...activePerms.map(p => p.id), permId];
    }

    try {
      await apiFetch(`/admin/roles/${activeRoleConfig}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissionIds: newPermIds })
      });
      showToast('success', `Permissions updated for ${activeRoleConfig}`);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // ─── Announcement Creation ───
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      return showToast('error', 'Please fill announcement title and content');
    }
    setSubmitting(true);
    try {
      await apiFetch('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(announcementForm)
      });
      showToast('success', 'Notice posted successfully!');
      setAnnouncementForm({ title: '', content: '', target_role: 'all' });
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete announcement?')) return;
    try {
      await apiFetch(`/admin/announcements/${id}`, { method: 'DELETE' });
      showToast('success', 'Announcement removed');
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // ─── Settings Save ───
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsForm)
      });
      await refreshSettings();
      showToast('success', 'School settings saved successfully!');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // User Actions (Edit, Suspend, Activate, Delete)
  const handleEditUser = (user) => {
    setEditingUser(user);
  };

  const handleUpdateUserSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch(`/admin/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(editingUser)
      });
      showToast('success', 'User details updated successfully');
      setEditingUser(null);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await apiFetch(`/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      showToast('success', `User account status changed to ${newStatus}`);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Delete user account "${name}"? This is permanent.`)) return;
    try {
      await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
      showToast('success', 'User account deleted successfully');
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // Delete Class Section
  const handleDeleteClass = async (id) => {
    if (!window.confirm('Delete class section?')) return;
    try {
      await apiFetch(`/admin/classes/${id}`, { method: 'DELETE' });
      showToast('success', 'Class section removed');
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // Filter list helper
  const getFilteredUsers = (role) => {
    return usersList.filter(u => {
      const matchRole = role === 'all' || u.role === role || (role === 'staff' && ['accountant', 'librarian', 'receptionist', 'security', 'driver', 'cashier'].includes(u.role));
      const matchSearch = !searchQuery.trim() || 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.admission_number && u.admission_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.employee_id && u.employee_id.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchRole && matchSearch;
    });
  };

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: '8px' }}>
        <Loader2 className="animate-spin" size={24} color="var(--primary)" />
        <span style={{ color: 'var(--text-secondary)' }}>Loading administrative module...</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <Toast type={toast.type} message={toast.message} onClose={clearToast} />

      {/* ─────────────────────────────────────────────
          OVERVIEW TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'overview' && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Summary Stat Cards */}
          <div className="grid-cols-4">
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}>
                <GraduationCap size={28} color="var(--primary)" />
              </div>
              <div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Total Students</p>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{data.users?.students || 0}</h3>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px' }}>
                <Users size={28} color="var(--success)" />
              </div>
              <div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Total Teachers</p>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{data.users?.teachers || 0}</h3>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px' }}>
                <BookOpen size={28} color="var(--warning)" />
              </div>
              <div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Class Sections</p>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{data.classes || 0}</h3>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
                <DollarSign size={28} color="var(--danger)" />
              </div>
              <div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Fee Revenue</p>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{formatCurrency(data.finance?.collected || 0)}</h3>
              </div>
            </div>
          </div>

          <div className="grid-cols-2">
            {/* Announcement Board */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={18} color="var(--primary)" />
                <span>Noticeboard Announcements</span>
              </h3>
              
              <form onSubmit={handleCreateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Announcement Title"
                    value={announcementForm.title}
                    onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Notice details..."
                    value={announcementForm.content}
                    onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})}
                  ></textarea>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <select
                    className="form-control"
                    style={{ flex: 1 }}
                    value={announcementForm.target_role}
                    onChange={e => setAnnouncementForm({...announcementForm, target_role: e.target.value})}
                  >
                    <option value="all">Target: All Users</option>
                    <option value="teachers">Target: Teachers Only</option>
                    <option value="students">Target: Students Only</option>
                    <option value="parents">Target: Parents Only</option>
                  </select>
                  <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '0 24px' }}>
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                    <span>Post</span>
                  </button>
                </div>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                {announcementsList.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>No notices published yet.</p>
                ) : (
                  announcementsList.map(ann => (
                    <div key={ann.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{ann.title}</h4>
                        <span className="badge badge-info">{ann.target_role}</span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{ann.content}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>By {ann.author_name || 'System Admin'}</span>
                        <button onClick={() => handleDeleteAnnouncement(ann.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent activity audit list */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="var(--success)" />
                <span>Recent System Activities</span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto' }}>
                {activityLogs.slice(0, 10).map(log => (
                  <div key={log.id} style={{ display: 'flex', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ marginTop: '2px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{log.action}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{log.details}</p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>User: {log.user_name} ({log.user_role}) • IP: {log.ip_address || 'local'}</span>
                    </div>
                  </div>
                ))}
                {activityLogs.length === 0 && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>No recent activity records.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          NEW ADMISSION TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'new-admission' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* CSV Bulk Admissions paste zone */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UploadCloud size={20} color="var(--primary)" />
                  <span>Bulk Student Admissions & Enrollment (CSV Import)</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Paste standard CSV rows here to instantly register parent and student records in bulk.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={loadSampleCsv} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                  Load Sample Template
                </button>
                {parsedBulkStudents.length > 0 && (
                  <button onClick={handleBulkImportSubmit} disabled={submitting} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                    {submitting ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                    <span>Confirm Import ({parsedBulkStudents.length})</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              className="form-control"
              rows="4"
              style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
              placeholder="name,dob,gender,address,rollNumber,classId,previousSchool,parentName,parentEmail,parentPhone,parentOccupation..."
              value={bulkCsvText}
              onChange={e => setBulkCsvText(e.target.value)}
            ></textarea>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleParseCsv} className="btn btn-secondary">
                <span>Parse CSV Rows</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {parsedBulkStudents.length > 0 && (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Class ID</th>
                      <th>Roll Number</th>
                      <th>Parent Name</th>
                      <th>Parent Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedBulkStudents.map((st, i) => (
                      <tr key={i}>
                        <td>{st.name}</td>
                        <td>{st.classId}</td>
                        <td>{st.rollNumber}</td>
                        <td>{st.parentName}</td>
                        <td>{st.parentPhone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Standard Admission Form */}
          <form onSubmit={handleAdmissionSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={20} color="var(--success)" />
              <span>Standard New Student Admission Profile</span>
            </h3>

            {/* Student Info Group */}
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Student Particulars</h4>
              <div className="grid-cols-3">
                <div className="form-group">
                  <label className="form-label">Student Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={admissionForm.studentName}
                    onChange={e => setAdmissionForm({...admissionForm, studentName: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="form-control"
                    value={admissionForm.dob}
                    onChange={e => setAdmissionForm({...admissionForm, dob: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-control"
                    value={admissionForm.gender}
                    onChange={e => setAdmissionForm({...admissionForm, gender: e.target.value})}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid-cols-3">
                <div className="form-group">
                  <label className="form-label">Class / Section *</label>
                  <select
                    className="form-control"
                    required
                    value={admissionForm.classId}
                    onChange={e => setAdmissionForm({...admissionForm, classId: e.target.value})}
                  >
                    <option value="">-- Assign Class Section --</option>
                    {classesList.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. R-101"
                    value={admissionForm.rollNumber}
                    onChange={e => setAdmissionForm({...admissionForm, rollNumber: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Previous School</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. St. Mary Academy"
                    value={admissionForm.previousSchool}
                    onChange={e => setAdmissionForm({...admissionForm, previousSchool: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Home Address</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={admissionForm.address}
                  onChange={e => setAdmissionForm({...admissionForm, address: e.target.value})}
                ></textarea>
              </div>
            </div>

            {/* Parent Info Group */}
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Parent / Guardian Particulars</h4>
              <div className="grid-cols-3">
                <div className="form-group">
                  <label className="form-label">Relationship to Student</label>
                  <select
                    className="form-control"
                    value={admissionForm.parentType}
                    onChange={e => setAdmissionForm({...admissionForm, parentType: e.target.value})}
                  >
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="guardian">Guardian</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Parent Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={admissionForm.parentName}
                    onChange={e => setAdmissionForm({...admissionForm, parentName: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Parent Phone Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={admissionForm.parentPhone}
                    onChange={e => setAdmissionForm({...admissionForm, parentPhone: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Parent Email (Username Login)</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. parent@email.com (leaves auto-generate option if blank)"
                    value={admissionForm.parentEmail}
                    onChange={e => setAdmissionForm({...admissionForm, parentEmail: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Parent Occupation</label>
                  <input
                    type="text"
                    className="form-control"
                    value={admissionForm.parentOccupation}
                    onChange={e => setAdmissionForm({...admissionForm, parentOccupation: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '12px 28px' }}>
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <UserCheck size={16} />}
                <span>Admit and Setup Accounts</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          ADMISSION LIST TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'admission-list' && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Enrollment & Admissions Register</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '320px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                className="form-control"
                placeholder="Search student or admission number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Admission ID</th>
                  <th>Student Name</th>
                  <th>Class / Section</th>
                  <th>Roll Number</th>
                  <th>Gender</th>
                  <th>Admission Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredUsers('student').map(st => (
                  <tr key={st.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{st.admission_number || `STU-${st.id}`}</td>
                    <td>{st.name}</td>
                    <td>{st.class_name || <span style={{ color: 'var(--text-muted)' }}>Not Assigned</span>}</td>
                    <td>{st.roll_number || 'N/A'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{st.student_gender || 'N/A'}</td>
                    <td>{st.admission_date ? new Date(st.admission_date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <span className={`badge ${st.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {st.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {getFilteredUsers('student').length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No student admission records matching filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          STUDENTS TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'users-students' && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Student Management Directory</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '320px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                className="form-control"
                placeholder="Search students directory..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Admission Number</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Father Name</th>
                  <th>Parent Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredUsers('student').map(st => (
                  <tr key={st.id}>
                    <td>{st.roll_number || 'N/A'}</td>
                    <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{st.admission_number || 'N/A'}</td>
                    <td>{st.name}</td>
                    <td>{st.class_name || 'Unassigned'}</td>
                    <td>{st.father_name || st.guardian_name || 'N/A'}</td>
                    <td>{st.father_phone || st.guardian_phone || 'N/A'}</td>
                    <td>
                      <span className={`badge ${st.status === 'active' ? 'badge-success' : st.status === 'suspended' ? 'badge-warning' : 'badge-danger'}`}>
                        {st.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEditUser(st)} className="btn btn-secondary" style={{ padding: '6px' }} title="Edit Student">
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => handleToggleUserStatus(st.id, st.status)} className="btn btn-secondary" style={{ padding: '6px' }} title="Suspend / Activate">
                          <ShieldAlert size={12} />
                        </button>
                        <button onClick={() => handleDeleteUser(st.id, st.name)} className="btn btn-danger" style={{ padding: '6px' }} title="Delete Account">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          TEACHERS TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'users-teachers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          <form onSubmit={handleTeacherSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} color="var(--primary)" />
              <span>Create Teacher Account & Profile</span>
            </h3>

            <div className="grid-cols-4">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={teacherForm.name}
                  onChange={e => setTeacherForm({...teacherForm, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="form-control"
                  required
                  value={teacherForm.email}
                  onChange={e => setTeacherForm({...teacherForm, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="form-control"
                  required
                  value={teacherForm.password}
                  onChange={e => setTeacherForm({...teacherForm, password: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-control"
                  value={teacherForm.phone}
                  onChange={e => setTeacherForm({...teacherForm, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="grid-cols-4">
              <div className="form-group">
                <label className="form-label">Employee ID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. TCH-2026-003"
                  value={teacherForm.employee_id}
                  onChange={e => setTeacherForm({...teacherForm, employee_id: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Qualification</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ph.D. in Physics"
                  value={teacherForm.qualification}
                  onChange={e => setTeacherForm({...teacherForm, qualification: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Science"
                  value={teacherForm.department}
                  onChange={e => setTeacherForm({...teacherForm, department: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Class Teacher of</label>
                <select
                  className="form-control"
                  value={teacherForm.class_id}
                  onChange={e => setTeacherForm({...teacherForm, class_id: e.target.value})}
                >
                  <option value="">-- None --</option>
                  {classesList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                <span>Add Teacher</span>
              </button>
            </div>
          </form>

          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Teachers Register</h3>
            
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Emp ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Qualification</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredUsers('teacher').map(tc => (
                    <tr key={tc.id}>
                      <td style={{ fontWeight: 600 }}>{tc.teacher_employee_id || 'N/A'}</td>
                      <td>{tc.name}</td>
                      <td>{tc.email}</td>
                      <td>{tc.teacher_department || 'N/A'}</td>
                      <td>{tc.qualification || 'N/A'}</td>
                      <td>{tc.phone || 'N/A'}</td>
                      <td>
                        <span className={`badge ${tc.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {tc.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleEditUser(tc)} className="btn btn-secondary" style={{ padding: '6px' }}>
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleToggleUserStatus(tc.id, tc.status)} className="btn btn-secondary" style={{ padding: '6px' }}>
                            <ShieldAlert size={12} />
                          </button>
                          <button onClick={() => handleDeleteUser(tc.id, tc.name)} className="btn btn-danger" style={{ padding: '6px' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          PARENTS TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'users-parents' && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Parents & Guardians Directory</h3>
          
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Parent Name</th>
                  <th>Email</th>
                  <th>Phone Contact</th>
                  <th>Associated Children</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parentsList.map(pr => (
                  <tr key={pr.id}>
                    <td style={{ fontWeight: 600 }}>{pr.name}</td>
                    <td>{pr.email}</td>
                    <td>{pr.phone || 'N/A'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {pr.children && pr.children.length > 0 ? (
                          pr.children.map(ch => (
                            <span key={ch.id} style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
                              • {ch.name} ({ch.class || 'No Class'})
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No linked students</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${pr.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {pr.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEditUser(pr)} className="btn btn-secondary" style={{ padding: '6px' }}>
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => handleDeleteUser(pr.id, pr.name)} className="btn btn-danger" style={{ padding: '6px' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          STAFF TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'users-staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          <form onSubmit={handleStaffSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} color="var(--primary)" />
              <span>Create Staff Account & Profile</span>
            </h3>

            <div className="grid-cols-4">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={staffForm.name}
                  onChange={e => setStaffForm({...staffForm, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="form-control"
                  required
                  value={staffForm.email}
                  onChange={e => setStaffForm({...staffForm, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="form-control"
                  required
                  value={staffForm.password}
                  onChange={e => setStaffForm({...staffForm, password: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-control"
                  value={staffForm.phone}
                  onChange={e => setStaffForm({...staffForm, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="grid-cols-3">
              <div className="form-group">
                <label className="form-label">Employee ID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. STF-2026-004"
                  value={staffForm.employee_id}
                  onChange={e => setStaffForm({...staffForm, employee_id: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Finance / Library"
                  value={staffForm.department}
                  onChange={e => setStaffForm({...staffForm, department: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Position / Role</label>
                <select
                  className="form-control"
                  value={staffForm.position}
                  onChange={e => setStaffForm({...staffForm, position: e.target.value})}
                >
                  <option value="accountant">Accountant</option>
                  <option value="librarian">Librarian</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="security">Security Guard</option>
                  <option value="driver">Driver</option>
                  <option value="cashier">Cashier</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                <span>Add Staff Member</span>
              </button>
            </div>
          </form>

          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Staff Registry</h3>
            
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Emp ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredUsers('staff').map(sf => (
                    <tr key={sf.id}>
                      <td style={{ fontWeight: 600 }}>{sf.staff_employee_id || 'N/A'}</td>
                      <td>{sf.name}</td>
                      <td>{sf.email}</td>
                      <td style={{ textTransform: 'capitalize' }}>{sf.role}</td>
                      <td>{sf.staff_department || 'N/A'}</td>
                      <td>{sf.phone || 'N/A'}</td>
                      <td>
                        <span className={`badge ${sf.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {sf.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleEditUser(sf)} className="btn btn-secondary" style={{ padding: '6px' }}>
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleDeleteUser(sf.id, sf.name)} className="btn btn-danger" style={{ padding: '6px' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          ADMINISTRATORS TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'users-admins' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          <form onSubmit={handleAdminSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Create New Administrator</h3>
            <div className="grid-cols-4">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={adminFormState.name}
                  onChange={e => setAdminFormState({...adminFormState, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="form-control"
                  required
                  value={adminFormState.email}
                  onChange={e => setAdminFormState({...adminFormState, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="form-control"
                  required
                  value={adminFormState.password}
                  onChange={e => setAdminFormState({...adminFormState, password: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Contact</label>
                <input
                  type="text"
                  className="form-control"
                  value={adminFormState.phone}
                  onChange={e => setAdminFormState({...adminFormState, phone: e.target.value})}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                <span>Add Administrator</span>
              </button>
            </div>
          </form>

          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Administrators Register</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredUsers('admin').map(ad => (
                    <tr key={ad.id}>
                      <td style={{ fontWeight: 600 }}>{ad.name}</td>
                      <td>{ad.email}</td>
                      <td>{ad.phone || 'N/A'}</td>
                      <td>
                        <span className="badge badge-success">{ad.status}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleEditUser(ad)} className="btn btn-secondary" style={{ padding: '6px' }}>
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleDeleteUser(ad.id, ad.name)} className="btn btn-danger" style={{ padding: '6px' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          ROLES & PERMISSIONS TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'users-roles' && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Role-Based Access Control (RBAC)</h3>
          
          <div style={{ display: 'flex', gap: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', overflowX: 'auto' }}>
            {['admin', 'teacher', 'student', 'parent', 'accountant', 'librarian', 'receptionist'].map(role => (
              <button
                key={role}
                onClick={() => setActiveRoleConfig(role)}
                className={`btn ${activeRoleConfig === role ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textTransform: 'capitalize', padding: '6px 14px', fontSize: '0.82rem' }}
              >
                {role}
              </button>
            ))}
          </div>

          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '14px', color: 'var(--primary)' }}>
              Permissions assigned to: <span style={{ textTransform: 'capitalize', color: '#fff' }}>{activeRoleConfig}</span>
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {allPermissions.map(perm => {
                const isAssigned = (rolesPermissions[activeRoleConfig] || []).some(p => p.id === perm.id);
                return (
                  <div 
                    key={perm.id} 
                    onClick={() => handleTogglePermission(perm.id)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: '12px', 
                      background: isAssigned ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.01)', 
                      borderRadius: '8px', 
                      border: `1px solid ${isAssigned ? 'var(--primary)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isAssigned} 
                      readOnly 
                      style={{ cursor: 'pointer' }}
                    />
                    <div>
                      <p style={{ fontSize: '0.88rem', fontWeight: 600, color: isAssigned ? 'var(--primary)' : 'var(--text-primary)' }}>{perm.name}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{perm.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          USER LOGS TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'users-logs' && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>System Audit Logs</h3>
          
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{log.action}</td>
                    <td>{log.details}</td>
                    <td>{log.user_name || 'System'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{log.user_role || 'N/A'}</td>
                    <td>{log.ip_address || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          ACADEMIC YEARS TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'academic-years' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <form onSubmit={handleAcademicYearSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add Academic Year</h3>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
                <label className="form-label">Academic Year Name (e.g. 2026/2027)</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. 2026/2027"
                  value={academicYearForm.name}
                  onChange={e => setAcademicYearForm({...academicYearForm, name: e.target.value})}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0, width: '160px' }}>
                <label className="form-label">Initial Status</label>
                <select
                  className="form-control"
                  value={academicYearForm.status}
                  onChange={e => setAcademicYearForm({...academicYearForm, status: e.target.value})}
                >
                  <option value="inactive">Inactive</option>
                  <option value="active">Active (Deactivates current)</option>
                </select>
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ height: '45px' }}>
                <Plus size={16} />
                <span>Create</span>
              </button>
            </div>
          </form>

          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Academic Years List</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Academic Year</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {academicYears.map(ay => (
                    <tr key={ay.id}>
                      <td style={{ fontWeight: 600 }}>{ay.name}</td>
                      <td>
                        <span className={`badge ${ay.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {ay.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleToggleAcademicYearStatus(ay.id, ay.name, ay.status)} className="btn btn-secondary" style={{ padding: '6px' }}>
                            <RefreshCw size={12} />
                          </button>
                          <button onClick={() => handleDeleteAcademicYear(ay.id)} className="btn btn-danger" style={{ padding: '6px' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          TERMS TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'academic-terms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <form onSubmit={handleTermSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add Term / Semester</h3>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0, width: '220px' }}>
                <label className="form-label">Academic Year</label>
                <select
                  className="form-control"
                  required
                  value={termForm.academic_year_id}
                  onChange={e => setTermForm({...termForm, academic_year_id: e.target.value})}
                >
                  <option value="">Select Year</option>
                  {academicYears.map(ay => (
                    <option key={ay.id} value={ay.id}>{ay.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '180px' }}>
                <label className="form-label">Term Name</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Semester 1"
                  value={termForm.name}
                  onChange={e => setTermForm({...termForm, name: e.target.value})}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0, width: '160px' }}>
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  value={termForm.status}
                  onChange={e => setTermForm({...termForm, status: e.target.value})}
                >
                  <option value="inactive">Inactive</option>
                  <option value="active">Active (Deactivates others in year)</option>
                </select>
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ height: '45px' }}>
                <Plus size={16} />
                <span>Add Term</span>
              </button>
            </div>
          </form>

          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Terms Register</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Academic Year</th>
                    <th>Term Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {terms.map(tm => (
                    <tr key={tm.id}>
                      <td>{tm.academic_year_name}</td>
                      <td style={{ fontWeight: 600 }}>{tm.name}</td>
                      <td>
                        <span className={`badge ${tm.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {tm.status}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => handleDeleteTerm(tm.id)} className="btn btn-danger" style={{ padding: '6px' }}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          CLASSES / GRADES LIST TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'academic-grades' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <form onSubmit={handleGradeLevelSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add Grade Level / Course Class</h3>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label className="form-label">Grade Name</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Grade 7"
                  value={gradeLevelForm.name}
                  onChange={e => setGradeLevelForm({ name: e.target.value })}
                />
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ height: '45px' }}>
                <Plus size={16} />
                <span>Create Grade</span>
              </button>
            </div>
          </form>

          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Grade Levels</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Grade Level ID</th>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {gradesList.map(gr => (
                    <tr key={gr.id}>
                      <td>{gr.id}</td>
                      <td style={{ fontWeight: 600 }}>{gr.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          SECTIONS TAB (Classes / Sections map)
      ───────────────────────────────────────────── */}
      {activeTab === 'academic-sections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          <form onSubmit={handleClassSectionSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add New Class Section</h3>
            
            <div className="grid-cols-3">
              <div className="form-group">
                <label className="form-label">Class Name *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Grade 7 A"
                  value={classSectionForm.name}
                  onChange={e => setClassSectionForm({...classSectionForm, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Grade Level</label>
                <select
                  className="form-control"
                  value={classSectionForm.grade_id}
                  onChange={e => setClassSectionForm({...classSectionForm, grade_id: e.target.value})}
                >
                  <option value="">Select Grade</option>
                  {gradesList.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Section ID / Label</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. A"
                  value={classSectionForm.section}
                  onChange={e => setClassSectionForm({...classSectionForm, section: e.target.value})}
                />
              </div>
            </div>

            <div className="grid-cols-3">
              <div className="form-group">
                <label className="form-label">Class Teacher</label>
                <select
                  className="form-control"
                  value={classSectionForm.teacher_id}
                  onChange={e => setClassSectionForm({...classSectionForm, teacher_id: e.target.value})}
                >
                  <option value="">Select Teacher</option>
                  {teachersList.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Academic Year</label>
                <select
                  className="form-control"
                  value={classSectionForm.academic_year_id}
                  onChange={e => setClassSectionForm({...classSectionForm, academic_year_id: e.target.value})}
                >
                  <option value="">Select Year</option>
                  {academicYears.map(ay => (
                    <option key={ay.id} value={ay.id}>{ay.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Active Term</label>
                <select
                  className="form-control"
                  value={classSectionForm.term_id}
                  onChange={e => setClassSectionForm({...classSectionForm, term_id: e.target.value})}
                >
                  <option value="">Select Term</option>
                  {terms.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.academic_year_name})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={submitting} className="btn btn-primary">
                <Plus size={16} />
                <span>Create Section</span>
              </button>
            </div>
          </form>

          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Class Sections Register</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Class Section</th>
                    <th>Grade Level</th>
                    <th>Section</th>
                    <th>Teacher</th>
                    <th>Academic Year</th>
                    <th>Term</th>
                    <th>Enrollment Count</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classesList.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.grade_name || 'N/A'}</td>
                      <td>{c.section || 'N/A'}</td>
                      <td>{c.teacher_name || <span style={{ color: 'var(--text-muted)' }}>None</span>}</td>
                      <td>{c.academic_year_name || 'N/A'}</td>
                      <td>{c.term_name || 'N/A'}</td>
                      <td>{c.student_count || 0} students</td>
                      <td>
                        <button onClick={() => handleDeleteClass(c.id)} className="btn btn-danger" style={{ padding: '6px' }}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          SUBJECTS TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'academic-subjects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <form onSubmit={handleSubjectSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add Subject</h3>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
                <label className="form-label">Subject Name</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Mathematics"
                  value={subjectForm.name}
                  onChange={e => setSubjectForm({...subjectForm, name: e.target.value})}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label className="form-label">Subject Code</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. MATH101"
                  value={subjectForm.code}
                  onChange={e => setSubjectForm({...subjectForm, code: e.target.value})}
                />
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ height: '45px' }}>
                <Plus size={16} />
                <span>Create Subject</span>
              </button>
            </div>
          </form>

          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Subjects Register</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectsList.map(sub => (
                    <tr key={sub.id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{sub.code}</td>
                      <td>{sub.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          FINANCES TAB (Fee invoices list)
      ───────────────────────────────────────────── */}
      {activeTab === 'finances-invoice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          <form onSubmit={handleCreateFee} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Generate Fee Invoice</h3>
            
            <div className="grid-cols-4">
              <div className="form-group">
                <label className="form-label">Select Student *</label>
                <select
                  className="form-control"
                  required
                  value={feeInvoiceForm.student_id}
                  onChange={e => setFeeInvoiceForm({...feeInvoiceForm, student_id: e.target.value})}
                >
                  <option value="">-- Select Student --</option>
                  {studentsList.map(st => (
                    <option key={st.id} value={st.id}>{st.name} ({st.class_name || 'No Class'})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Invoice Title *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Tuition Fee Term 1"
                  value={feeInvoiceForm.title}
                  onChange={e => setFeeInvoiceForm({...feeInvoiceForm, title: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Amount ({settings?.currency_symbol || '$'}) *</label>
                <input
                  type="number"
                  className="form-control"
                  required
                  placeholder="e.g. 1500"
                  value={feeInvoiceForm.amount}
                  onChange={e => setFeeInvoiceForm({...feeInvoiceForm, amount: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date *</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={feeInvoiceForm.due_date}
                  onChange={e => setFeeInvoiceForm({...feeInvoiceForm, due_date: e.target.value})}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={submitting} className="btn btn-primary">
                <Plus size={16} />
                <span>Generate Invoice</span>
              </button>
            </div>
          </form>

          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Invoices Ledger</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Invoice Details</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feesList.map(fee => (
                    <tr key={fee.id}>
                      <td style={{ fontWeight: 600 }}>{fee.student_name}</td>
                      <td>{fee.class_name || 'N/A'}</td>
                      <td>{fee.title}</td>
                      <td>{formatCurrency(fee.amount)}</td>
                      <td>{new Date(fee.due_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${fee.status === 'paid' ? 'badge-success' : 'badge-danger'}`}>
                          {fee.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleToggleFeeStatus(fee)} className="btn btn-secondary" style={{ padding: '6px' }} title="Toggle status">
                            <RefreshCw size={12} />
                          </button>
                          <button onClick={() => handleDeleteFee(fee.id)} className="btn btn-danger" style={{ padding: '6px' }} title="Delete">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          ATTENDANCE TAB (Admin view)
      ───────────────────────────────────────────── */}
      {activeTab === 'attendance-admin' && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>School-Wide Attendance Stats</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Daily attendance logs recorded across classes.</p>
          
          <div className="grid-cols-3" style={{ marginTop: '10px' }}>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Today's Present Rate</p>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>
                {data?.attendance?.rate || 100}%
              </h2>
            </div>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Logs Today</p>
              <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>
                {data?.attendance?.total || 0}
              </h2>
            </div>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Absent Logs</p>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)' }}>
                {data?.attendance?.absent || 0}
              </h2>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          EXAMINATIONS TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'examinations-admin' && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} color="var(--primary)" />
            <span>Examinations & Gradebook Overview</span>
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Administrators review performance trends and exam scheduling records.</p>
          
          <div className="table-container" style={{ marginTop: '10px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Exam Name</th>
                  <th>Grade Average</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600 }}>Midterm Exam 2026</td>
                  <td>85.4%</td>
                  <td><span className="badge badge-success">Completed</span></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Final Term Exam 2026</td>
                  <td>--</td>
                  <td><span className="badge badge-warning">Pending Schedule</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          REPORTS TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'reports-admin' && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={20} color="var(--primary)" />
            <span>Analytics & Performance Reports</span>
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Visual summary of student statistics and revenue targets.</p>
          
          <div className="grid-cols-2" style={{ marginTop: '10px' }}>
            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '14px', color: 'var(--text-secondary)' }}>Revenue Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span>Collected Fees</span>
                    <span>{formatCurrency(data?.finance?.collected || 0)}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${data?.finance?.total > 0 ? (data.finance.collected / data.finance.total) * 100 : 100}%`, height: '100%', background: 'var(--success)' }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span>Pending Fees</span>
                    <span>{formatCurrency(data?.finance?.pending || 0)}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${data?.finance?.total > 0 ? (data.finance.pending / data.finance.total) * 100 : 0}%`, height: '100%', background: 'var(--danger)' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '14px', color: 'var(--text-secondary)' }}>User Enrolment Ratio</h4>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', height: '100%' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Students: {data?.users?.students || 0}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Teachers: {data?.users?.teachers || 0}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Parents: {data?.users?.parents || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          SETTINGS TAB
      ───────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} color="var(--primary)" />
            <span>School ERP Configuration Panel</span>
          </h3>

          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label">School Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={settingsForm.school_name}
                onChange={e => setSettingsForm({...settingsForm, school_name: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Local Currency ISO Code</label>
              <input
                type="text"
                className="form-control"
                value={settingsForm.currency}
                onChange={e => setSettingsForm({...settingsForm, currency: e.target.value})}
              />
            </div>
          </div>

          <div className="grid-cols-3">
            <div className="form-group">
              <label className="form-label">Currency Symbol</label>
              <input
                type="text"
                className="form-control"
                value={settingsForm.currency_symbol}
                onChange={e => setSettingsForm({...settingsForm, currency_symbol: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Country Code</label>
              <input
                type="text"
                className="form-control"
                value={settingsForm.country}
                onChange={e => setSettingsForm({...settingsForm, country: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Timezone</label>
              <input
                type="text"
                className="form-control"
                value={settingsForm.timezone}
                onChange={e => setSettingsForm({...settingsForm, timezone: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
              <span>Save System Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* ─────────────────────────────────────────────
          USER EDIT MODAL / DRAWER
      ───────────────────────────────────────────── */}
      {editingUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999, padding: '20px'
        }}>
          <form onSubmit={handleUpdateUserSubmit} className="glass-card" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Edit User Details</h3>
              <button type="button" onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <XCircle size={20} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                required
                value={editingUser.name || ''}
                onChange={e => setEditingUser({...editingUser, name: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                required
                value={editingUser.email || ''}
                onChange={e => setEditingUser({...editingUser, email: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Contact</label>
              <input
                type="text"
                className="form-control"
                value={editingUser.phone || ''}
                onChange={e => setEditingUser({...editingUser, phone: e.target.value})}
              />
            </div>

            {editingUser.role === 'student' && (
              <>
                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Roll Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingUser.roll_number || ''}
                      onChange={e => setEditingUser({...editingUser, roll_number: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Class Section</label>
                    <select
                      className="form-control"
                      value={editingUser.class_id || ''}
                      onChange={e => setEditingUser({...editingUser, class_id: e.target.value})}
                    >
                      <option value="">Select Class</option>
                      {classesList.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Father Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingUser.father_name || ''}
                    onChange={e => setEditingUser({...editingUser, father_name: e.target.value})}
                  />
                </div>
              </>
            )}

            {editingUser.role === 'teacher' && (
              <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingUser.teacher_department || ''}
                    onChange={e => setEditingUser({...editingUser, teacher_department: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Qualification</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingUser.qualification || ''}
                    onChange={e => setEditingUser({...editingUser, qualification: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setEditingUser(null)} className="btn btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
