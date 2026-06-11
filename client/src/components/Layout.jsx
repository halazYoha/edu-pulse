import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  School, LogOut, LayoutDashboard, Users, BookOpen, 
  CreditCard, Calendar, BarChart3, Bell, CheckSquare, Award, Menu, X
} from 'lucide-react';

const Layout = ({ activeTab, setActiveTab, children }) => {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) return null;

  // Define navigation menu items based on user role
  const getNavItems = () => {
    switch (user.role) {
      case 'admin':
        return [
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'users', label: 'Manage Users', icon: Users },
          { id: 'classes', label: 'Classes & Timetable', icon: BookOpen },
          { id: 'finances', label: 'Fee Invoices', icon: CreditCard },
        ];
      case 'teacher':
        return [
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'students', label: 'My Students', icon: Users },
          { id: 'attendance', label: 'Attendance', icon: CheckSquare },
          { id: 'gradebook', label: 'Gradebook', icon: Award },
        ];
      case 'student':
        return [
          { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'grades', label: 'Academic Grades', icon: BarChart3 },
          { id: 'timetable', label: 'Class Timetable', icon: Calendar },
        ];
      case 'parent':
        return [
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'children', label: 'Children Stats', icon: Users },
          { id: 'payments', label: 'Fee Payments', icon: CreditCard },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  const activeLabel = navItems.find(item => item.id === activeTab)?.label || 'Dashboard';

  const handleNavItemClick = (tabId) => {
    setActiveTab(tabId);
    setIsSidebarOpen(false); // Close sidebar on mobile after clicking
  };

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Backdrop for mobile drawer */}
      <div 
        className={`sidebar-backdrop ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <School size={24} color="#6366f1" />
          <span>EduPulse ERP</span>
          <button 
            className="menu-close-btn"
            style={styles.mobileOnlyBtn}
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        
        <ul className="sidebar-menu">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <li 
                key={item.id}
                className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => handleNavItemClick(item.id)}
              >
                <IconComponent size={20} />
                <span>{item.label}</span>
              </li>
            );
          })}
        </ul>

        {/* User Info & Logout */}
        <div className="sidebar-user">
          <span className="sidebar-username">{user.name}</span>
          <span className="sidebar-role">{user.role}</span>
          <button 
            className="btn btn-secondary" 
            onClick={logout} 
            style={{ 
              marginTop: '12px', 
              width: '100%', 
              justifyContent: 'center',
              padding: '8px 12px',
              fontSize: '0.8rem',
              gap: '6px'
            }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="main-wrapper">
        {/* Top Navbar */}
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              className="menu-toggle-btn"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h2 className="page-title">{activeLabel}</h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="header-date">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
            <div style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
              <Bell size={20} color="#9ca3af" />
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '8px',
                height: '8px',
                backgroundColor: 'var(--danger)',
                borderRadius: '50%'
              }}></span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="content-body">
          {children}
        </main>
      </div>
    </div>
  );
};

const styles = {
  mobileOnlyBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'none', // Overridden in media queries
    marginLeft: 'auto',
    padding: '4px'
  },
  headerDate: {
    fontSize: '0.85rem',
    color: '#9ca3af'
  }
};

export default Layout;
