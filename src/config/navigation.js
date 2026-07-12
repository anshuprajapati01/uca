import {
  Bookmark,
  BookOpen,
  FileText,
  LayoutDashboard,
  Layers,
  Megaphone,
  Upload,
  Users,
  UserCheck,
  UserPlus,
  Tags,
  Calendar,
  Grid,
  ClipboardList,
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
  {
    label: 'Assignments',
    path: `${ROUTES.STUDENT_DASHBOARD}/assignments`,
    icon: ClipboardList,
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
  {
    id: 'assignments',
    label: 'Assignments',
    path: `${ROUTES.FACULTY_DASHBOARD}/assignments`,
    icon: ClipboardList,
  },
];

/** @type {NavItem[]} */
export const ADMIN_NAV_ITEMS = [
  { label: 'Overview', path: ROUTES.ADMIN_DASHBOARD, icon: LayoutDashboard },
  {
    label: 'Faculty Workload',
    path: `${ROUTES.ADMIN_DASHBOARD}/faculty-workload`,
    icon: Users,
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
  { id: 'overview', label: 'Overview', path: ROUTES.HOD_DASHBOARD, icon: LayoutDashboard },
  {
    id: 'faculty-workload',
    label: 'Faculty Workload',
    path: `${ROUTES.HOD_DASHBOARD}/faculty-workload`,
    icon: Users,
  },
  {
    id: 'manage-student',
    label: 'Manage Student',
    path: `${ROUTES.HOD_DASHBOARD}/manage-student`,
    icon: Users,
  },
  {
    id: 'manage-cr',
    label: 'Manage CRs',
    path: `${ROUTES.HOD_DASHBOARD}/manage-cr`,
    icon: UserCheck,
  },
  {
    id: 'upload-material',
    label: 'Upload Material',
    path: `${ROUTES.HOD_DASHBOARD}/upload-material`,
    icon: Upload,
  },
  {
    id: 'announcement',
    label: 'Announcement',
    path: `${ROUTES.HOD_DASHBOARD}/announcement`,
    icon: Megaphone,
  },
  {
    id: 'curriculum',
    label: 'Curriculum',
    path: `${ROUTES.HOD_DASHBOARD}/curriculum`,
    icon: BookOpen,
  },
  {
    id: 'categories',
    label: 'Categories',
    path: `${ROUTES.HOD_DASHBOARD}/categories`,
    icon: Tags,
  },
  {
    id: 'attendance',
    label: 'Attendance Analytics',
    path: `${ROUTES.HOD_DASHBOARD}/attendance`,
    icon: Calendar,
  },
  {
    id: 'manage-timetable',
    label: 'Manage Timetable',
    path: `${ROUTES.HOD_DASHBOARD}/manage-timetable`,
    icon: Grid,
  },
  {
    id: 'manage-results',
    label: 'Publish Results',
    path: `${ROUTES.HOD_DASHBOARD}/manage-results`,
    icon: FileText,
  },
];

/** @type {NavItem[]} */
export const DIRECTOR_NAV_ITEMS = [
  { label: 'Overview', path: ROUTES.DIRECTOR_DASHBOARD, icon: LayoutDashboard, tab: 'overview' },
  {
    label: 'Academic Hub',
    path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=academic`,
    icon: Layers,
    tab: 'academic',
  },
  {
    label: 'Manage Departments',
    path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=manage-departments`,
    icon: Layers,
    tab: 'manage-departments',
  },
  { label: 'Manage Faculty', path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=manage-faculty`, icon: UserPlus, tab: 'manage-faculty' },
  { label: 'HOD Management', path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=hod-management`, icon: UserCheck, tab: 'hod-management' },
  { label: 'Student Directory', path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=student-directory`, icon: Users, tab: 'student-directory' },
  {
    label: 'Announcements',
    path: `${ROUTES.DIRECTOR_DASHBOARD}?tab=announcements`,
    icon: Megaphone,
    tab: 'announcements',
  },
];