import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  School, LogOut, LayoutDashboard, Users, BookOpen, 
  CreditCard, Calendar, BarChart3, Bell, CheckSquare, Award, Menu, X, Settings,
  ChevronRight, UserPlus, ClipboardList, GraduationCap, ShieldAlert, ShieldCheck,
  Activity, Briefcase, Clock, LayoutGrid, DollarSign, ClipboardPenLine
} from 'lucide-react';

const Layout = ({ activeTab, setActiveTab, children }) => {
  const { user, logout, settings } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});

  // Define navigation menu items based on user role
  const getNavItems = () => {
    switch (user.role) {
      case 'admin':
      case 'super_admin':
        return [
          { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
          { 
            id: 'admissions', 
            label: 'Admissions', 
            icon: ClipboardPenLine, 
            subItems: [
              { id: 'new-admission', label: 'New Admission', icon: UserPlus },
              { id: 'admission-list', label: 'Admission List', icon: ClipboardList }
            ]
          },
          { 
            id: 'users', 
            label: 'User Management', 
            icon: Users, 
            subItems: [
              { id: 'users-students', label: 'Students', icon: GraduationCap },
              { id: 'users-teachers', label: 'Teachers', icon: Users },
              { id: 'users-parents', label: 'Parents', icon: Users },
              { id: 'users-staff', label: 'Staff', icon: Briefcase },
              { id: 'users-admins', label: 'Administrators', icon: ShieldAlert },
              { id: 'users-roles', label: 'Roles & Permissions', icon: ShieldCheck },
              { id: 'users-logs', label: 'User Activity Logs', icon: Activity }
            ]
          },
          { 
            id: 'academics', 
            label: 'Academics', 
            icon: BookOpen, 
            subItems: [
              { id: 'academic-years', label: 'Academic Year', icon: Calendar },
              { id: 'academic-terms', label: 'Terms / Semesters', icon: Clock },
              { id: 'academic-grades', label: 'Classes & Grades', icon: GraduationCap },
              { id: 'academic-sections', label: 'Sections', icon: LayoutGrid },
              { id: 'academic-subjects', label: 'Subjects', icon: BookOpen }
            ]
          },
          { 
            id: 'finances', 
            label: 'Finance', 
            icon: CreditCard, 
            subItems: [
              { id: 'finances-invoice', label: 'Fee Management', icon: DollarSign }
            ]
          },
          { id: 'attendance-admin', label: 'Attendance', icon: CheckSquare },
          { id: 'examinations-admin', label: 'Examinations', icon: Award },
          { id: 'reports-admin', label: 'Reports', icon: BarChart3 },
          { id: 'settings', label: 'Settings', icon: Settings },
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

  // Auto-expand menus that contain the active subItem
  useEffect(() => {
    navItems.forEach(item => {
      if (item.subItems && item.subItems.some(sub => sub.id === activeTab)) {
        setExpandedMenus(prev => ({ ...prev, [item.id]: true }));
      }
    });
  }, [activeTab]);

  if (!user) return null;

  // Resolve active label from hierarchy
  let activeLabel = 'Dashboard';
  navItems.forEach(item => {
    if (item.id === activeTab) {
      activeLabel = item.label;
    } else if (item.subItems) {
      const sub = item.subItems.find(s => s.id === activeTab);
      if (sub) {
        activeLabel = `${item.label} / ${sub.label}`;
      }
    }
  });

  const handleNavItemClick = (item) => {
    if (item.subItems) {
      // Toggle accordion expansion
      setExpandedMenus(prev => ({ ...prev, [item.id]: !prev[item.id] }));
    } else {
      setActiveTab(item.id);
      setIsSidebarOpen(false); // Close sidebar on mobile
    }
  };

  const handleSubItemClick = (subId, e) => {
    e.stopPropagation();
    setActiveTab(subId);
    setIsSidebarOpen(false);
  };

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Backdrop for mobile drawer */}
      <div 
        className={`sidebar-backdrop ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`} style={{ overflowY: 'hidden' }}>
        <div className="sidebar-logo">
          <School size={24} color="#6366f1" />
          <span>{settings.school_name || 'EduPulse ERP'}</span>
          <button 
            className="menu-close-btn"
            style={styles.mobileOnlyBtn}
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        
        <ul className="sidebar-menu" style={{ overflowY: 'auto' }}>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const hasSub = !!item.subItems;
            const isExpanded = !!expandedMenus[item.id];
            const isItemActive = activeTab === item.id || (hasSub && item.subItems.some(s => s.id === activeTab));

            return (
              <li 
                key={item.id}
                className={`sidebar-item-with-submenu`}
              >
                <div 
                  className={`sidebar-item ${isItemActive ? 'active' : ''}`}
                  onClick={() => handleNavItemClick(item)}
                >
                  <IconComponent size={20} />
                  <span className="sidebar-group-header">
                    {item.label}
                    {hasSub && (
                      <ChevronRight 
                        size={16} 
                        className={`sidebar-arrow ${isExpanded ? 'open' : ''}`} 
                      />
                    )}
                  </span>
                </div>

                {hasSub && (
                  <ul className={`sidebar-submenu ${isExpanded ? 'open' : ''}`}>
                    {item.subItems.map(sub => {
                      const SubIcon = sub.icon;
                      const isSubActive = activeTab === sub.id;
                      return (
                        <li 
                          key={sub.id}
                          className={`sidebar-subitem ${isSubActive ? 'active' : ''}`}
                          onClick={(e) => handleSubItemClick(sub.id, e)}
                        >
                          <SubIcon size={14} />
                          <span>{sub.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
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
