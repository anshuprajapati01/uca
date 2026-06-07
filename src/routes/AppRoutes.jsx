import { Route, Routes } from 'react-router-dom';
import { ROUTES } from '../config/constants.js';
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
      <Route path={ROUTES.STUDENT_DASHBOARD} element={<StudentDashboard />} />
      <Route path={ROUTES.FACULTY_DASHBOARD} element={<FacultyDashboard />} />
      <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboard />} />
      <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
    </Routes>
  );
}
