import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute.jsx';
import { ROUTES, USER_ROLES } from '../config/constants.js';
import { ADMIN_ACCESS_ROLES } from '../utils/roleRouting.js';
import LoginPage from '../pages/auth/LoginPage.jsx';
import AdminDashboard from '../pages/admin/AdminDashboard.jsx';
import FacultyDashboard from '../pages/faculty/FacultyDashboard.jsx';
import StudentDashboard from '../pages/student/StudentDashboard.jsx';
import LandingPage from '../pages/public/LandingPage.jsx';
import NotFoundPage from '../pages/public/NotFoundPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<LandingPage />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route
        path={ROUTES.STUDENT_DASHBOARD}
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.STUDENT]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.FACULTY_DASHBOARD}
        element={
          <ProtectedRoute allowedRoles={[USER_ROLES.FACULTY]}>
            <FacultyDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.ADMIN_DASHBOARD}
        element={
          <ProtectedRoute allowedRoles={ADMIN_ACCESS_ROLES}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
    </Routes>
  );
}
