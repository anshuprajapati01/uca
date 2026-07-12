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
  TAKE_ATTENDANCE: '/faculty/take-attendance',
  ADMIN_DASHBOARD: '/admin',
  DIRECTOR_DASHBOARD: '/director',
  HOD_DASHBOARD: '/hod-dashboard',
  NOT_FOUND: '*',
};

export const USER_ROLES = {
  STUDENT: 'student',
  FACULTY: 'faculty',
  ADMIN: 'admin',
  DIRECTOR: 'director',
  HOD: 'hod',
};

export const AGGREGATE_DEPARTMENTS = {
  'ASH 1': ['CSE A', 'CSE B', 'CSE C', 'CS', 'ECE'],
  'ASH 2': ['AI ML', 'DS', 'IT', 'ME', 'CE', 'VLSI'],
  'CS & IT': ['CS', 'IT'],
  'CSE & ECE': ['CSE', 'ECE'],
  'AI ML & DS': ['AI ML', 'DS'],
  'ME & CE': ['ME', 'CE'],
};
