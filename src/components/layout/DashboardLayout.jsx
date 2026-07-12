import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import TopNavbar from './TopNavbar.jsx';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  return (
    <div className="dashboard-layout">
      <Sidebar
        navItems={navItems}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        title={title}
      />

      <div className="dashboard-layout__main">
        <TopNavbar
          title={title}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="dashboard-layout__content">{children}</main>
      </div>
    </div>
  );
}
