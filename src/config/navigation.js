import {
  BarChart3,
  Bookmark,
  BookOpen,
  Building2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Users,
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
    disabled: true,
  },
  {
    label: 'Resources',
    path: `${ROUTES.STUDENT_DASHBOARD}/resources`,
    icon: FileText,
    disabled: true,
  },
  {
    label: 'Bookmarks',
    path: `${ROUTES.STUDENT_DASHBOARD}/bookmarks`,
    icon: Bookmark,
    disabled: true,
  },
  {
    label: 'Announcements',
    path: `${ROUTES.STUDENT_DASHBOARD}/announcements`,
    icon: Megaphone,
    disabled: true,
  },
];

/** @type {NavItem[]} */
export const FACULTY_NAV_ITEMS = [
  { label: 'Overview', path: ROUTES.FACULTY_DASHBOARD, icon: LayoutDashboard },
  {
    label: 'My Subjects',
    path: `${ROUTES.FACULTY_DASHBOARD}/subjects`,
    icon: BookOpen,
    disabled: true,
  },
  {
    label: 'Resources',
    path: `${ROUTES.FACULTY_DASHBOARD}/resources`,
    icon: FileText,
    disabled: true,
  },
  {
    label: 'Announcements',
    path: `${ROUTES.FACULTY_DASHBOARD}/announcements`,
    icon: Megaphone,
    disabled: true,
  },
];

/** @type {NavItem[]} */
export const ADMIN_NAV_ITEMS = [
  { label: 'Overview', path: ROUTES.ADMIN_DASHBOARD, icon: LayoutDashboard },
  {
    label: 'Colleges',
    path: `${ROUTES.ADMIN_DASHBOARD}/colleges`,
    icon: Building2,
    disabled: true,
  },
  {
    label: 'Departments',
    path: `${ROUTES.ADMIN_DASHBOARD}/departments`,
    icon: GraduationCap,
    disabled: true,
  },
  {
    label: 'Users',
    path: `${ROUTES.ADMIN_DASHBOARD}/users`,
    icon: Users,
    disabled: true,
  },
  {
    label: 'Reports',
    path: `${ROUTES.ADMIN_DASHBOARD}/reports`,
    icon: BarChart3,
    disabled: true,
  },
];
