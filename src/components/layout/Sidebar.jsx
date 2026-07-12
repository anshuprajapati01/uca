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
        className={`faculty-sidebar dashboard-layout__sidebar${isOpen ? ' dashboard-layout__sidebar--open' : ''}`}
        aria-label="Dashboard navigation"
      >
        <div className="faculty-sidebar__header">
          <div className="faculty-sidebar__logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 2 6 3 6 3s6-1 6-3v-5" />
            </svg>
          </div>
          <h1 className="faculty-sidebar__brand">{APP_SHORT_NAME}</h1>
        </div>

        <nav className="faculty-sidebar__nav">
          {navItems.map((item) => {
            if (item.disabled) {
              return (
                <span
                  key={item.path}
                  className="faculty-sidebar__link faculty-sidebar__link--disabled"
                  aria-disabled="true"
                >
                  <span className="faculty-sidebar__link-label">{item.label}</span>
                </span>
              );
            }

            const active = isItemActive(item);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`faculty-sidebar__link${active ? ' faculty-sidebar__link--active' : ''}`}
                onClick={onClose}
              >
                <span className="faculty-sidebar__link-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="faculty-sidebar__footer">
          <span>{title ? `${title} · v1.0` : 'Portal · v1.0'}</span>
        </div>
      </aside>
    </>
  );
}
