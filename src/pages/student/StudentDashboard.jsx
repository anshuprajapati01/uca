import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { STUDENT_NAV_ITEMS } from '../../config/navigation.js';

export default function StudentDashboard() {
  return (
    <DashboardLayout title="Student Dashboard" navItems={STUDENT_NAV_ITEMS}>
      <section className="dashboard-placeholder">
        <h2>Welcome, Student</h2>
        <p>Your subjects, resources, and progress will appear here.</p>
      </section>
    </DashboardLayout>
  );
}
