import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import ParentDashboard from './components/ParentDashboard';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Reset navigation sub-tabs when the user logs in or switches accounts
  useEffect(() => {
    setActiveTab('overview');
  }, [user]);

  if (loading) {
    return (
      <div style={styles.spinnerContainer}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '16px', color: '#9ca3af', fontSize: '0.95rem' }}>
          Loading EduPulse ERP Portal...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Render the correct dashboard depending on the user's role
  const renderDashboard = () => {
    switch (user.role) {
      case 'admin':
        return <AdminDashboard activeTab={activeTab} />;
      case 'teacher':
        return <TeacherDashboard activeTab={activeTab} />;
      case 'student':
        return <StudentDashboard activeTab={activeTab} />;
      case 'parent':
        return <ParentDashboard activeTab={activeTab} />;
      default:
        return <div>Invalid User Role configured. Please contact the IT admin.</div>;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderDashboard()}
    </Layout>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const styles = {
  spinnerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#0b0f19',
    fontFamily: "'Inter', sans-serif",
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(99, 102, 241, 0.1)',
    borderTop: '4px solid var(--primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  }
};

// Add standard keyframe spin for loading spinner
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  try {
    styleSheet.insertRule(`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `, styleSheet.cssRules.length);
  } catch (e) {
    // In case insertRule fails during initial compilation
  }
}

export default App;
