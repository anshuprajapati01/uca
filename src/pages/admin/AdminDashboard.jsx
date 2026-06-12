import { Outlet } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { ADMIN_NAV_ITEMS } from '../../config/navigation.js';

export default function AdminDashboard() {
  return (
    <DashboardLayout title="Admin Dashboard" navItems={ADMIN_NAV_ITEMS}>
      <Outlet />
    </DashboardLayout>
  );
}
