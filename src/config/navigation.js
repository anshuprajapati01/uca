import {
  BarChart3,
  Bookmark,
  BookOpen,
  FileText,
  LayoutDashboard,
  Layers,
  Megaphone,
  Upload,
  Users,
  UserCheck,
} from 'lucide-react';
import { ROUTES } from './constants.js';

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
    path: `${ROUTES.FACULTY_DASHBOARD}/subjects`, 
    icon: BookOpen,
  },
  {
    label: '📤 Upload Materials',
    path: `${ROUTES.FACULTY_DASHBOARD}/resources`,
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
    label: 'Curriculum Manager',
    path: `${ROUTES.ADMIN_DASHBOARD}/curriculum`,
    icon: BookOpen,
  },
  {
    label: 'Manage Students',
    path: `${ROUTES.ADMIN_DASHBOARD}/students`,
    icon: Users,
  },
  { label: 'Manage Faculty', path: `${ROUTES.ADMIN_DASHBOARD}/faculty`, icon: UserCheck },
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

/** @type {NavItem[]} */
export const HOD_NAV_ITEMS = [
  { label: 'Faculty Management', path: ROUTES.HOD_DASHBOARD, icon: Users },
  { label: 'Reports & Analytics', path: ROUTES.HOD_DASHBOARD, icon: BarChart3 },
  { label: 'Subject Allocation', path: ROUTES.HOD_DASHBOARD, icon: BookOpen },
];

/** @type {NavItem[]} */
export const DIRECTOR_NAV_ITEMS = [
  { label: 'Overview', path: ROUTES.DIRECTOR_DASHBOARD, icon: LayoutDashboard },
  {
    label: 'Academic Hub',
    path: `${ROUTES.DIRECTOR_DASHBOARD}/departments`,
    icon: Layers,
  },
  {
    label: 'Announcements',
    path: `${ROUTES.DIRECTOR_DASHBOARD}/announcements`,
    icon: Megaphone,
  },
];