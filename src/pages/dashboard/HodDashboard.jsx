import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { HOD_NAV_ITEMS } from '../../config/navigation.js';
import AdminOverview from '../admin/AdminOverview.jsx';
import FacultyWorkload from '../admin/FacultyWorkload.jsx';
import ManageStudents from '../admin/ManageStudents.jsx';
import UploadMaterials from '../admin/UploadMaterials.jsx';
import ManageAnnouncements from '../admin/ManageAnnouncements.jsx';
import CurriculumManager from '../admin/CurriculumManager.jsx';
import ManageCategories from './ManageCategories.jsx';

const HOD_TAB_COMPONENTS = {
  overview: AdminOverview,
  'faculty-workload': FacultyWorkload,
  'manage-student': ManageStudents,
  'upload-material': UploadMaterials,
  announcement: ManageAnnouncements,
  curriculum: CurriculumManager,
  categories: ManageCategories,
};

function getActiveTabId(pathname) {
  const normalizedPath = pathname.endsWith('/') && pathname !== '/'
    ? pathname.slice(0, -1)
    : pathname;

  return HOD_NAV_ITEMS.find((item) => item.path === normalizedPath)?.id || 'overview';
}

export default function HodDashboard() {
  const location = useLocation();
  const activeTab = getActiveTabId(location.pathname);

  const ActiveComponent = HOD_TAB_COMPONENTS[activeTab] || AdminOverview;

  return (
    <DashboardLayout title="HOD Portal" navItems={HOD_NAV_ITEMS}>
      <section className="hod-dashboard" aria-label={`${activeTab} section`}>
        <ActiveComponent />
      </section>
    </DashboardLayout>
  );
}
