import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { FACULTY_NAV_ITEMS } from '../../config/navigation.js';

export default function FacultyDashboard() {
  return (
    <DashboardLayout title="Faculty Dashboard" navItems={FACULTY_NAV_ITEMS}>
      <section className="dashboard-placeholder">
        <h2>Welcome, Faculty</h2>
        <p>Your subjects, resources, and announcements will appear here.</p>
      </section>
    </DashboardLayout>
  );
}
