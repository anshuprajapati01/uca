import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute.jsx';
import { ROUTES, USER_ROLES } from '../config/constants.js';
// Updated imports to include HOD and DIRECTOR roles
import { ADMIN_ACCESS_ROLES, STUDENT_ACCESS_ROLES } from '../utils/roleRouting.js';
import LoginPage from '../pages/auth/LoginPage.jsx';
import AdminDashboard from '../pages/admin/AdminDashboard.jsx';
import AdminOverview from '../pages/admin/AdminOverview.jsx';
import SubjectAllocation from '../pages/admin/SubjectAllocation.jsx';
import ManageStudents from '../pages/admin/ManageStudents.jsx';
import ManageFaculty from '../pages/admin/ManageFaculty.jsx';
import ManageAnnouncements from '../pages/admin/ManageAnnouncements.jsx';
import UploadMaterials from '../pages/admin/UploadMaterials.jsx';
import FacultyDashboard from '../pages/faculty/FacultyDashboard.jsx';
import StudentDashboard from '../pages/student/StudentDashboard.jsx';
import StudentOverview from '../pages/student/StudentOverview.jsx';
import StudentResources from '../pages/student/StudentResources.jsx';
import StudentBookmarks from '../pages/student/StudentBookmarks.jsx';
import StudentAnnouncements from '../pages/student/StudentAnnouncements.jsx';
import StudentSubjects from '../pages/student/StudentSubjects.jsx';
import SubjectDetail from '../pages/student/SubjectDetail.jsx';
import LandingPage from '../pages/public/LandingPage.jsx';
import NotFoundPage from '../pages/public/NotFoundPage.jsx';

// NEW IMPORTS FOR DIRECTOR & HOD
import DirectorDashboard from '../pages/admin/DirectorDashboard.jsx';
import HodDashboard from '../pages/dashboard/HodDashboard.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<LandingPage />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      
      {/* STUDENT ROUTES */}
      <Route
        path={ROUTES.STUDENT_DASHBOARD}
        element={
          <ProtectedRoute allowedRoles={STUDENT_ACCESS_ROLES}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentOverview />} />
        <Route path="subjects" element={<StudentSubjects />} />
        <Route path="subjects/:subjectId" element={<SubjectDetail />} />
        <Route path="resources" element={<StudentResources />} />
        <Route path="bookmarks" element={<StudentBookmarks />} />
        <Route path="announcements" element={<StudentAnnouncements />} />
      </Route>

      {/* FACULTY ROUTES */}
      <Route
        path={ROUTES.FACULTY_DASHBOARD}
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.FACULTY]}>
            <FacultyDashboard />
          </ProtectedRoute>
        }
      />

      {/* NEW: HOD ROUTE */}
      <Route
        path={ROUTES.HOD_DASHBOARD || '/hod'}
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.HOD]}>
            <HodDashboard />
          </ProtectedRoute>
        }
      />

      {/* NEW: DIRECTOR ROUTE */}
      <Route
        path={ROUTES.DIRECTOR_DASHBOARD || '/director'}
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.DIRECTOR]}>
            <DirectorDashboard />
          </ProtectedRoute>
        }
      />

      {/* ADMIN ROUTES */}
      <Route
        path={ROUTES.ADMIN_DASHBOARD}
        element={
          <ProtectedRoute allowedRoles={ADMIN_ACCESS_ROLES}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="subject-allocation" element={<SubjectAllocation />} />
        <Route path="students" element={<ManageStudents />} />
        <Route path="faculty" element={<ManageFaculty />} />
        <Route path="announcements" element={<ManageAnnouncements />} />
        <Route path="upload-materials" element={<UploadMaterials />} />
      </Route>
      
      <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
    </Routes>
  );
}