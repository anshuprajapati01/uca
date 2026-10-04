import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { APP_SHORT_NAME } from '../../config/constants.js';
import './DashboardLayout.css';

export default function Sidebar({ navItems, isOpen, onClose, title }) {
  const location = useLocation();

  const isItemActive = (item) => {
    if (item.path.startsWith('/director')) {
      const currentTab = new URLSearchParams(location.search).get('tab') || 'overview';
      const itemTab = item.path.includes('?tab=')
        ? new URLSearchParams(item.path.split('?')[1]).get('tab')
        : 'overview';

      return currentTab === itemTab;
    }

    return location.pathname === item.path;
  };

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          className="dashboard-sidebar__overlay"
          aria-label="Close navigation menu"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`global-sidebar${!isOpen ? ' closed' : ''}`}
        aria-label="Dashboard navigation"
      >
        <div className="global-sidebar__header">
          <div className="brand-wrapper">
            <div className="global-sidebar__logo">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 2 6 3 6 3s6-1 6-3v-5" />
              </svg>
            </div>
            <h1 className="global-sidebar__brand">UCA</h1>
          </div>
        </div>

        <nav className="global-sidebar__nav">
          {navItems.map((item) => {
            if (item.disabled) {
              return (
                <span
                  key={item.path}
                  className="global-sidebar__link global-sidebar__link--disabled"
                  aria-disabled="true"
                >
                {item.icon && (() => {
                  const IconComponent = item.icon;
                  return React.isValidElement(item.icon)
                    ? item.icon
                    : <IconComponent className="sidebar-icon" size={18} />;
                })()}
                  <span className="global-sidebar__link-label">{item.label}</span>
                </span>
              );
            }

            const active = isItemActive(item);

            const handleLinkClick = () => {
              if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                onClose();
              }
            };

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`global-sidebar__link${active ? ' global-sidebar__link--active' : ''}`}
                onClick={handleLinkClick}
              >
                {item.icon && (() => {
                  const IconComponent = item.icon;
                  return React.isValidElement(item.icon)
                    ? item.icon
                    : <IconComponent className="sidebar-icon" size={18} />;
                })()}
                <span className="global-sidebar__link-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="global-sidebar__footer">
          <span>{(() => { const role = title ? title.split(' ')[0] : ''; return role ? `${role.toUpperCase()} PORTAL` : 'PORTAL'; })()} · V1.0</span>
        </div>
      </aside>
    </>
  );
}
