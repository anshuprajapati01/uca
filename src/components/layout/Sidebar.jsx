import { NavLink, useLocation } from 'react-router-dom';
import { APP_SHORT_NAME } from '../../config/constants.js';
import './DashboardLayout.css';

export default function Sidebar({ navItems, isOpen, onClose }) {
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
        className={`dashboard-layout__sidebar${isOpen ? ' dashboard-layout__sidebar--open' : ''}`}
        aria-label="Dashboard navigation"
      >
        <div className="dashboard-sidebar__header">
          <p className="dashboard-sidebar__brand">{APP_SHORT_NAME}</p>
        </div>

        <nav className="dashboard-sidebar__nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            if (item.disabled) {
              return (
                <span
                  key={item.path}
                  className="dashboard-sidebar__link dashboard-sidebar__link--disabled"
                  aria-disabled="true"
                >
                  <Icon className="dashboard-sidebar__icon" aria-hidden="true" />
                  {item.label}
                </span>
              );
            }

            const active = isItemActive(item);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`dashboard-sidebar__link${active ? ' dashboard-sidebar__link--active' : ''}`}
                onClick={onClose}
              >
                <Icon className="dashboard-sidebar__icon" aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
