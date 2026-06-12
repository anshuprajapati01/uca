import { ROUTES, USER_ROLES } from '../config/constants.js';

/** Roles that share the admin dashboard. */
export const ADMIN_ACCESS_ROLES = [
  USER_ROLES.ADMIN,
  'hod',
  'director',
];

/** Roles that share the student dashboard. */
export const STUDENT_ACCESS_ROLES = [
  USER_ROLES.STUDENT,
  'CR',
];

/**
 * @param {string | null | undefined} role
 * @returns {string}
 */
export function getDashboardRouteForRole(role) {
  switch (role) {
    case USER_ROLES.STUDENT:
    case 'CR':
      return ROUTES.STUDENT_DASHBOARD;
    case USER_ROLES.FACULTY:
      return ROUTES.FACULTY_DASHBOARD;
    case USER_ROLES.ADMIN:
    case 'hod':
    case 'director':
      return ROUTES.ADMIN_DASHBOARD;
    default:
      return ROUTES.HOME;
  }
}

/**
 * @param {string} path
 * @returns {string[]}
 */
export function getAllowedRolesForDashboard(path) {
  switch (path) {
    case ROUTES.STUDENT_DASHBOARD:
      return STUDENT_ACCESS_ROLES;
    case ROUTES.FACULTY_DASHBOARD:
      return [USER_ROLES.FACULTY];
    case ROUTES.ADMIN_DASHBOARD:
      return ADMIN_ACCESS_ROLES;
    default:
      return [];
  }
}

/**
 * @param {string | null | undefined} role
 * @param {string} path
 * @returns {boolean}
 */
export function canAccessDashboard(role, path) {
  if (!role) {
    return false;
  }

  return getAllowedRolesForDashboard(path).includes(role);
}
