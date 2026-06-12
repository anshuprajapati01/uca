import {
  Bookmark,
  BookOpen,
  FileText,
  LayoutDashboard,
  Megaphone,
  Upload,
  Users,
  UserCheck,
} from 'lucide-react';
import { ROUTES } from './constants.js';

/**
 * @typedef {Object} NavItem
 * @property {string} label
 * @property {string} path
 * @property {import('lucide-react').LucideIcon} icon
 * @property {boolean} [disabled]
 */

/** @type {NavItem[]} */
export const STUDENT_NAV_ITEMS = [
  { label: 'Overview', path: ROUTES.STUDENT_DASHBOARD, icon: LayoutDashboard },
  {
    label: 'My Subjects',
    path: `${ROUTES.STUDENT_DASHBOARD}/subjects`,
    icon: BookOpen,
  },
  {
    label: 'Resources',
    path: `${ROUTES.STUDENT_DASHBOARD}/resources`,
    icon: FileText,
  },
  {
    label: 'Bookmarks',
    path: `${ROUTES.STUDENT_DASHBOARD}/bookmarks`,
    icon: Bookmark,
  },
  {
    label: 'Announcements',
    path: `${ROUTES.STUDENT_DASHBOARD}/announcements`,
    icon: Megaphone,
  },
];

/** @type {NavItem[]} */
export const FACULTY_NAV_ITEMS = [
  { label: '🏠 Overview', path: ROUTES.FACULTY_DASHBOARD, icon: LayoutDashboard },
  {
    label: '📚 My Subjects',
    path: ROUTES.FACULTY_DASHBOARD,
    icon: BookOpen,
  },
  {
    label: '📤 Upload Materials',
    path: ROUTES.FACULTY_DASHBOARD,
    icon: Upload,
  },
];

/** @type {NavItem[]} */
export const ADMIN_NAV_ITEMS = [
  { label: 'Overview', path: ROUTES.ADMIN_DASHBOARD, icon: LayoutDashboard },
  {
    label: 'Subject Allocation',
    path: `${ROUTES.ADMIN_DASHBOARD}/subject-allocation`,
    icon: BookOpen,
  },
  {
    label: 'Manage Students',
    path: `${ROUTES.ADMIN_DASHBOARD}/students`,
    icon: Users,
  },
  {
    label: 'Manage Faculty',
    path: `${ROUTES.ADMIN_DASHBOARD}/faculty`,
    icon: UserCheck,
  },
  {
    label: 'Announcements',
    path: `${ROUTES.ADMIN_DASHBOARD}/announcements`,
    icon: Megaphone,
  },
  {
    label: 'Upload Materials',
    path: `${ROUTES.ADMIN_DASHBOARD}/upload-materials`,
    icon: Upload,
  },
];
