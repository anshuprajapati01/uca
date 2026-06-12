import { NavLink } from 'react-router-dom';
import { APP_SHORT_NAME } from '../../config/constants.js';
import './DashboardLayout.css';

export default function Sidebar({ navItems, isOpen, onClose }) {
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

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === navItems[0]?.path}
                className={({ isActive }) =>
                  `dashboard-sidebar__link${isActive ? ' dashboard-sidebar__link--active' : ''}`
                }
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
