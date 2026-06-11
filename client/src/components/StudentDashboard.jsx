import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Award, Calendar, CheckSquare, DollarSign, Megaphone, 
  TrendingUp, BookOpen, Clock, RefreshCw
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

const StudentDashboard = ({ activeTab }) => {
  const { apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStudentData = async () => {
    setLoading(true);
    try {
      const dbData = await apiFetch('/dashboard');
      setData(dbData);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch student profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [activeTab]);

  if (loading && !data) return <div style={styles.loader}>Loading student records...</div>;
  if (!data) return <div style={styles.loader}>No student workspace records found.</div>;

  // Format chart data
  const chartData = data.grades?.map(g => ({
    name: g.exam_name,
    score: Math.round((parseFloat(g.marks_obtained) / parseFloat(g.max_marks)) * 100),
    subject: g.subject
  })).reverse() || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {error && <div className="badge badge-danger" style={{ padding: '12px', fontSize: '0.9rem' }}>{error}</div>}

      {/* DASHBOARD OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          {/* Dashboard quick-stat cards */}
          <div className="grid-cols-4">
            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><CheckSquare size={24} color="#10b981" /></div>
              <div>
                <p style={styles.statTitle}>Attendance</p>
                <h3 style={styles.statValue}>{data.attendance?.percentage || 0}%</h3>
              </div>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><Award size={24} color="#6366f1" /></div>
              <div>
                <p style={styles.statTitle}>Average Grade</p>
                <h3 style={styles.statValue}>{data.gpaAverage || 0}%</h3>
              </div>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><BookOpen size={24} color="#f59e0b" /></div>
              <div>
                <p style={styles.statTitle}>My Class</p>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>
                  {data.profile?.class_name || 'Unassigned'}
                </h3>
              </div>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <div style={styles.statIconContainer}><DollarSign size={24} color="#ef4444" /></div>
              <div>
                <p style={styles.statTitle}>Pending Invoices</p>
                <h3 style={styles.statValue}>
                  {data.fees?.filter(f => f.status === 'pending').length || 0}
                </h3>
              </div>
            </div>
          </div>

          <div className="grid-cols-2">
            {/* Announcements Panel */}
            <div className="glass-card">
              <h3 style={styles.cardHeader}><Megaphone size={18} /> Class Bulletins</h3>
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
                {data.announcements?.length === 0 && <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No class bulletins.</p>}
              </div>
            </div>

            {/* Quick Timetable Highlights */}
            <div className="glass-card">
              <h3 style={styles.cardHeader}><Calendar size={18} /> Today's Schedule</h3>
              {data.profile?.schedule ? (
                <div style={styles.scheduleList}>
                  {Object.keys(data.profile.schedule).map(day => (
                    <div key={day} style={styles.scheduleRow}>
                      <div style={styles.scheduleDay}>{day}</div>
                      <div style={styles.scheduleSubjects}>
                        {data.profile.schedule[day].map((sub, index) => (
                          <span key={index} style={styles.subjectTag}>{sub}</span>
                        ))}
                        {data.profile.schedule[day].length === 0 && <span style={{ color: '#6b7280' }}>No lectures</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No timetable schedule assigned to your class section.</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* GRADES TAB */}
      {activeTab === 'grades' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Performance chart */}
          {chartData.length > 0 && (
            <div className="glass-card">
              <h3 style={styles.cardHeader}><TrendingUp size={18} /> Grade Progress Analytics</h3>
              <div style={{ width: '100%', height: 260, marginTop: '20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" domain={[0, 100]} fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: '#fff' }}
                      formatter={(value, name, props) => [`${value}%`, `Score (${props.payload.subject})`]}
                    />
                    <Area type="monotone" dataKey="score" stroke="var(--primary)" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Grades List Table */}
          <div className="glass-card">
            <h3 style={styles.cardHeader}><Award size={18} /> Completed Tests & Grades</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Exam / Assignment</th>
                    <th>Date</th>
                    <th>Score</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.grades?.map((g, idx) => {
                    const percentage = Math.round((parseFloat(g.marks_obtained) / parseFloat(g.max_marks)) * 100);
                    return (
                      <tr key={g.id || idx}>
                        <td style={{ fontWeight: '600' }}>{g.subject}</td>
                        <td>{g.exam_name}</td>
                        <td>{new Date(g.date).toLocaleDateString()}</td>
                        <td>{g.marks_obtained} <span style={{ color: 'var(--text-muted)' }}>/ {g.max_marks}</span></td>
                        <td>
                          <span className={`badge ${percentage >= 80 ? 'badge-success' : percentage >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                            {percentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {data.grades?.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: '#6b7280' }}>
                        No academic exam grades recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TIMETABLE TAB */}
      {activeTab === 'timetable' && (
        <div className="glass-card">
          <h3 style={styles.cardHeader}><Calendar size={18} /> Full Class Schedule Grid</h3>
          {data.profile?.schedule ? (
            <div className="timetable-week-grid" style={styles.timetableGrid}>
              {Object.keys(data.profile.schedule).map(day => (
                <div key={day} style={styles.timetableCol}>
                  <div style={styles.timetableColHeader}>{day}</div>
                  <div style={styles.timetableLectures}>
                    {data.profile.schedule[day].map((lecture, idx) => (
                      <div key={idx} style={styles.timetableLectureItem}>
                        <div style={styles.lectureIcon}><BookOpen size={12} /></div>
                        <div>
                          <div style={styles.lectureName}>{lecture}</div>
                          <div style={styles.lectureTime}>Period {idx + 1} (1 hr)</div>
                        </div>
                      </div>
                    ))}
                    {data.profile.schedule[day].length === 0 && (
                      <div style={styles.emptyTimetable}>No Classes</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No timetable schedule assigned to your class section.</p>
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
  scheduleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  scheduleRow: {
    display: 'flex',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '10px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  scheduleDay: {
    width: '100px',
    fontWeight: '700',
    fontSize: '0.9rem',
    color: 'var(--primary)',
  },
  scheduleSubjects: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  subjectTag: {
    fontSize: '0.75rem',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    color: 'var(--primary)',
    padding: '4px 10px',
    borderRadius: '4px',
    fontWeight: '500',
  },
  timetableGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '15px',
  },
  timetableCol: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  timetableColHeader: {
    fontWeight: '700',
    fontSize: '0.9rem',
    textAlign: 'center',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--primary)',
  },
  timetableLectures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  timetableLectureItem: {
    backgroundColor: 'var(--bg-tertiary)',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  lectureIcon: {
    width: '20px',
    height: '20px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lectureName: {
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  lectureTime: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
  },
  emptyTimetable: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '20px 0',
  }
};

export default StudentDashboard;
