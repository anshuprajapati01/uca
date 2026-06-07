import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { ADMIN_NAV_ITEMS } from '../../config/navigation.js';

export default function AdminDashboard() {
  return (
    <DashboardLayout title="Admin Dashboard" navItems={ADMIN_NAV_ITEMS}>
      <section className="dashboard-placeholder">
        <h2>Welcome, Administrator</h2>
        <p>College management tools and reports will appear here.</p>
      </section>
    </DashboardLayout>
  );
}
