import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { STUDENT_NAV_ITEMS } from '../../config/navigation.js';

import { useStudentProfile } from '../../hooks/useStudentProfile.js';
import ProfileCard from '../../components/common/ProfileCard.jsx';

export default function StudentDashboard() {
  const { profile, isLoading } = useStudentProfile();

  const fields = [
    { label: 'Full Name', value: profile?.full_name },
    { label: 'Role', value: profile?.role },
    { label: 'Roll Number', value: profile?.roll_number },
    { label: 'Phone', value: profile?.phone },
    { label: 'College ID', value: profile?.college_id },
  ];

  return (
    <DashboardLayout title="Student Dashboard" navItems={STUDENT_NAV_ITEMS}>
      <section className="dashboard-profile">
        {isLoading ? (
          <p className="dashboard-profile__status">Loading profile…</p>
        ) : (
          <ProfileCard items={fields} />
        )}
      </section>
    </DashboardLayout>
  );
}
