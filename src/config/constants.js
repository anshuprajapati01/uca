/** Application-wide constants (routes, roles, labels). */

export const APP_NAME = 'Universal College App';
export const APP_SHORT_NAME = 'UCA';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  STUDENT_DASHBOARD: '/student',
  FACULTY_DASHBOARD: '/faculty',
  ADMIN_DASHBOARD: '/admin',
  NOT_FOUND: '*',
};

export const USER_ROLES = {
  STUDENT: 'student',
  FACULTY: 'faculty',
  ADMIN: 'admin',
};
