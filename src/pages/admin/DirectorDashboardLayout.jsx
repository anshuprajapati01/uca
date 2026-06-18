import { Outlet } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { DIRECTOR_NAV_ITEMS } from '../../config/navigation.js';

export default function DirectorDashboardLayout() {
  return (
    <DashboardLayout title="Director Portal" navItems={DIRECTOR_NAV_ITEMS}>
      <Outlet />
    </DashboardLayout>
  );
}