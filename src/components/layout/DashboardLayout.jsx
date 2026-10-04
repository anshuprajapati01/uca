import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import TopNavbar from './TopNavbar.jsx';
import { Menu } from 'lucide-react';
import './DashboardLayout.css';

/**
 * @typedef {import('../../config/navigation.js').NavItem} NavItem
 */

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {NavItem[]} props.navItems
 * @param {import('react').ReactNode} props.children
 */
export default function DashboardLayout({ title, navItems, children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  function toggleSidebar() {
    setIsSidebarOpen((prev) => !prev);
  }

  return (
    <div className="layout-root" style={{ height: '100vh', overflow: 'hidden', display: 'flex', background: 'var(--bg-app)' }}>
      <button
        type="button"
        className="global-hamburger-btn"
        onClick={toggleSidebar}
        aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-expanded={isSidebarOpen}
        style={{ background: 'transparent', border: 'none' }}
      >
        <Menu color="#0f172a" size={24} />
      </button>

      <Sidebar
        navItems={navItems}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        title={title}
      />

      <main style={{ flex: 1, height: '100vh', overflowY: 'auto' }}>
        <TopNavbar title={title} />
        {children}
      </main>
    </div>
  );
}
