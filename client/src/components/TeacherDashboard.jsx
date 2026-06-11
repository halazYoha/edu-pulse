import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Toast from './Toast';
import { 
  Users, BookOpen, CheckSquare, Award, Plus, Calendar, 
  UserCheck, Loader2
} from 'lucide-react';

const TeacherDashboard = ({ activeTab }) => {
  const { apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [toast, setToast] = useState({ type: 'success', message: '' });
  const showToast = useCallback((type, message) => setToast({ type, message }), []);
  const clearToast = useCallback(() => setToast({ type: 'success', message: '' }), []);

  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingGrade, setSavingGrade]           = useState(false);

  // Dropdown filter selections
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Grade Form state
  const [gradeForm, setGradeForm] = useState({
    student_id: '', subject: 'Mathematics', exam_name: '', marks_obtained: '', max_marks: '100', date: new Date().toISOString().split('T')[0]
  });

  // Data lists
  const [studentsList, setStudentsList] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [gradesList, setGradesList] = useState([]);
  const [classList, setClassList] = useState([]);

  const loadTeacherData = async () => {
    setLoading(true);
    try {
      const dbData = await apiFetch('/dashboard');
      setData(dbData);
      setClassList(dbData.myClasses || []);

      if (dbData.myClasses && dbData.myClasses.length > 0 && !selectedClass) {
        setSelectedClass(dbData.myClasses[0].id.toString());
      }

      if (activeTab === 'students') {
        const students = await apiFetch('/teacher/students');
        setStudentsList(students);
      }
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load teacher workspace data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeacherData();
  }, [activeTab]);

  // Trigger loading attendance or grades when filters change
  useEffect(() => {
    if (selectedClass) {
      if (activeTab === 'attendance' && attendanceDate) {
        loadAttendance();
      } else if (activeTab === 'gradebook') {
        loadGrades();
      }
    }
  }, [selectedClass, attendanceDate, activeTab, selectedSubject]);

  const loadAttendance = async () => {
    try {
      const records = await apiFetch(`/teacher/attendance?class_id=${selectedClass}&date=${attendanceDate}`);
      // If records have status NULL, set default status to 'present' for easy marking
      const initialized = records.map(r => ({
        ...r,
        status: r.status || 'present'
      }));
      setAttendanceRecords(initialized);
    } catch (err) {
      console.error(err);
    }
  };

  const loadGrades = async () => {
    try {
      const grades = await apiFetch(`/teacher/grades?class_id=${selectedClass}&subject=${selectedSubject}`);
      setGradesList(grades);

      // Load class students for the grade entry form dropdown
      const students = await apiFetch('/teacher/students');
      setStudentsList(students.filter(s => s.class_id.toString() === selectedClass.toString()));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAttendance = (studentId) => {
    setAttendanceRecords(prev => 
      prev.map(r => {
        if (r.student_id === studentId) {
          const nextStatus = r.status === 'present' ? 'absent' : r.status === 'absent' ? 'late' : 'present';
          return { ...r, status: nextStatus };
        }
        return r;
      })
    );
  };

  const handleSaveAttendance = async () => {
    if (attendanceRecords.length === 0) { showToast('error', 'No attendance records to save.'); return; }
    setSavingAttendance(true);
    try {
      const recordsPayload = attendanceRecords.map(r => ({ student_id: r.student_id, status: r.status }));
      await apiFetch('/teacher/attendance', {
        method: 'POST',
        body: JSON.stringify({ class_id: selectedClass, date: attendanceDate, records: recordsPayload })
      });
      showToast('success', 'Attendance register saved successfully!');
      loadAttendance();
    } catch (err) {
      showToast('error', err.message || 'Failed to save attendance.');
    } finally { setSavingAttendance(false); }
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!gradeForm.student_id)     { showToast('error', 'Please select a student.'); return; }
    if (!gradeForm.exam_name.trim()){ showToast('error', 'Exam / assignment title is required.'); return; }
    if (!gradeForm.marks_obtained)  { showToast('error', 'Marks obtained is required.'); return; }
    if (parseFloat(gradeForm.marks_obtained) > parseFloat(gradeForm.max_marks)) {
      showToast('error', `Marks obtained cannot exceed maximum marks (${gradeForm.max_marks}).`); return;
    }
    setSavingGrade(true);
    try {
      await apiFetch('/teacher/grades', {
        method: 'POST',
        body: JSON.stringify({ ...gradeForm, marks_obtained: parseFloat(gradeForm.marks_obtained), max_marks: parseFloat(gradeForm.max_marks) })
      });
      setGradeForm({ student_id: '', subject: selectedSubject, exam_name: '', marks_obtained: '', max_marks: '100', date: new Date().toISOString().split('T')[0] });
      showToast('success', 'Student grade recorded successfully!');
      loadGrades();
    } catch (err) {
      showToast('error', err.message || 'Failed to save grade.');
    } finally { setSavingGrade(false); }
  };

  if (loading && !data) return <div style={styles.loader}>Loading teacher environment...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <Toast type={toast.type} message={toast.message} onClose={clearToast} />
      {error && <div style={{ display:'flex', alignItems:'center', gap:'8px', backgroundColor:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'8px', color:'#f87171', padding:'12px 14px', fontSize:'0.85rem' }}>{error}</div>}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && data && (
        <>
          {/* Metrics grid */}
          <div className="grid-cols-3">
            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><BookOpen size={24} color="var(--primary)" /></div>
              <div>
                <p style={styles.statTitle}>My Classes</p>
                <h3 style={styles.statValue}>{data.myClasses?.length || 0}</h3>
              </div>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><Users size={24} color="#10b981" /></div>
              <div>
                <p style={styles.statTitle}>Total Students</p>
                <h3 style={styles.statValue}>{data.totalMyStudents || 0}</h3>
              </div>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><Award size={24} color="#f59e0b" /></div>
              <div>
                <p style={styles.statTitle}>Exam Records</p>
                <h3 style={styles.statValue}>{data.recentGrades?.length || 0} entered</h3>
              </div>
            </div>
          </div>

          <div className="grid-cols-2">
            {/* Assigned Classes Timetable */}
            <div className="glass-card">
              <h3 style={styles.cardHeader}><Calendar size={18} /> Assigned Class Rooms</h3>
              <div style={styles.classList}>
                {data.myClasses?.map(cls => (
                  <div key={cls.id} style={styles.classItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--primary)' }}>{cls.name}</span>
                      <span className="badge badge-info">{cls.student_count} Students</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '4px' }}>Weekly Schedule Highlights:</p>
                    <div style={styles.scheduleTags}>
                      {Object.keys(cls.schedule || {}).slice(0, 3).map(day => (
                        <div key={day} style={styles.scheduleTag}>
                          <strong>{day.slice(0, 3)}:</strong> {cls.schedule[day].slice(0, 2).join(', ')}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* School Bulletins */}
            <div className="glass-card">
              <h3 style={styles.cardHeader}><Users size={18} /> Staff Bulletins</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {data.announcements?.map(ann => (
                  <div key={ann.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: '600' }}>{ann.title}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{ann.content}</p>
                  </div>
                ))}
                {data.announcements?.length === 0 && <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>No bulletins posted.</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* MY STUDENTS LIST */}
      {activeTab === 'students' && (
        <div className="glass-card">
          <h3 style={styles.cardHeader}><Users size={18} /> Student Registry</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Class</th>
                </tr>
              </thead>
              <tbody>
                {studentsList.map((stud) => (
                  <tr key={stud.id}>
                    <td>{stud.roll_number || 'N/A'}</td>
                    <td style={{ fontWeight: '600' }}>{stud.name}</td>
                    <td>{stud.email}</td>
                    <td><span className="badge badge-info">{stud.class_name}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ATTENDANCE REGISTER TAB */}
      {activeTab === 'attendance' && (
        <div className="glass-card">
          <div className="filter-bar">
            <div>
              <label className="form-label">Select Class</label>
              <select 
                className="form-control" 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                {classList.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Attendance Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={attendanceDate} 
                onChange={(e) => setAttendanceDate(e.target.value)} 
              />
            </div>
          </div>

          <h3 style={{ ...styles.cardHeader, marginTop: '24px' }}>
            <UserCheck size={18} /> Attendance Checklist (Click state badge to toggle status)
          </h3>
          
          <div className="table-container" style={{ marginBottom: '24px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th style={{ textAlign: 'right' }}>Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((rec) => (
                  <tr key={rec.student_id}>
                    <td>{rec.roll_number || 'N/A'}</td>
                    <td style={{ fontWeight: '600' }}>{rec.student_name}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span 
                        onClick={() => handleToggleAttendance(rec.student_id)}
                        className={`badge ${
                          rec.status === 'present' ? 'badge-success' : 
                          rec.status === 'absent' ? 'badge-danger' : 'badge-warning'
                        }`}
                        style={{ cursor: 'pointer', padding: '6px 12px', userSelect: 'none' }}
                      >
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {attendanceRecords.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', color: '#6b7280' }}>
                      No students registered in this class section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {attendanceRecords.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={handleSaveAttendance}
              disabled={savingAttendance}
              style={{ float: 'right', display:'flex', alignItems:'center', gap:'8px' }}
            >
              {savingAttendance
                ? <><Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> Saving...</>
                : 'Save Attendance Register'}
            </button>
          )}
        </div>
      )}

      {/* GRADEBOOK TAB */}
      {activeTab === 'gradebook' && (
        <div className="grid-cols-2">
          {/* List of Grades */}
          <div className="glass-card">
            <h3 style={styles.cardHeader}><Award size={18} /> Student Grades</h3>
            <div className="filter-bar" role="search">
              <div>
                <label className="form-label">Select Class</label>
                <select 
                  className="form-control" 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  {classList.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Subject</label>
                <select 
                  className="form-control" 
                  value={selectedSubject} 
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setGradeForm(prev => ({ ...prev, subject: e.target.value }));
                  }}
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="English">English</option>
                  <option value="History">History</option>
                </select>
              </div>
            </div>

            <div className="table-container" style={{ marginTop: '20px' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Exam Name</th>
                    <th>Score</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {gradesList.map((g) => (
                    <tr key={g.id}>
                      <td style={{ fontWeight: '600' }}>{g.student_name}</td>
                      <td>{g.exam_name}</td>
                      <td>
                        <span style={{ fontWeight: '700', color: (parseFloat(g.marks_obtained)/parseFloat(g.max_marks)) >= 0.8 ? 'var(--success)' : 'var(--warning)' }}>
                          {g.marks_obtained}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}> / {g.max_marks}</span>
                      </td>
                      <td>{new Date(g.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {gradesList.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: '#6b7280' }}>
                        No grades recorded for this subject class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Record Grade Form */}
          <div className="glass-card">
            <h3 style={styles.cardHeader}><Plus size={18} /> Record Student Exam Score</h3>
            <form onSubmit={handleSaveGrade}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={selectedSubject} 
                  disabled 
                  style={{ opacity: 0.6 }} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Student</label>
                <select 
                  className="form-control"
                  value={gradeForm.student_id}
                  onChange={(e) => setGradeForm({ ...gradeForm, student_id: e.target.value })}
                >
                  <option value="">-- Select student --</option>
                  {studentsList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.roll_number})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Exam / Assignment Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Midterm Test 1" 
                  value={gradeForm.exam_name}
                  onChange={(e) => setGradeForm({ ...gradeForm, exam_name: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Marks Obtained</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    className="form-control" 
                    placeholder="e.g. 85.5" 
                    value={gradeForm.marks_obtained}
                    onChange={(e) => setGradeForm({ ...gradeForm, marks_obtained: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Maximum Marks</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="100" 
                    value={gradeForm.max_marks}
                    onChange={(e) => setGradeForm({ ...gradeForm, max_marks: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Exam Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={gradeForm.date}
                  onChange={(e) => setGradeForm({ ...gradeForm, date: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width:'100%', marginTop:'10px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }} disabled={savingGrade}>
                {savingGrade
                  ? <><Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> Saving...</>
                  : 'Record Grade Entry'}
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
  classList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  classItem: {
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '14px',
  },
  scheduleTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '6px',
  },
  scheduleTag: {
    fontSize: '0.7rem',
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border-color)',
    padding: '4px 8px',
    borderRadius: '4px',
    color: 'var(--text-secondary)',
  },
  filterBar: {
    display: 'flex',
    gap: '20px',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
  }
};

export default TeacherDashboard;
