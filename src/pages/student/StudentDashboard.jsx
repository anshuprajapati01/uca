import { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../../hooks/useAuth.js";
import { Upload, FileText, Eye, Trash2, Pencil } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import { uploadNewResource, deleteResource } from "../../services/resourceService.js";
import { signOut } from "../../services/authService.js";
import StudentAssignments from "./StudentAssignments.jsx";
import StudentResults from "./StudentResults.jsx";
import UploadResourceModal from "./UploadResourceModal.jsx";
import Attendance from "./Attendance.jsx";
import "./StudentDashboard.css";

const IconOverview = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);
const IconSubjects = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
const IconLibrary = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);
const IconSyllabus = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="url(#gSyllabus)"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="gSyllabus" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
    </defs>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const IconNotes = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="url(#gNotes)"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="gNotes" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
    </defs>
    <path d="M12 20h9" />
    <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
  </svg>
);
const IconPYQs = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="url(#gPYQs)"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="gPYQs" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
    </defs>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);
const IconBookmark = ({ filled }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21l-7-7-7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);
const IconAnnouncement = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconCalendar = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconAssignments = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);
const IconResults = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);
const IconPDF = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="12" x2="8" y2="12" />
    <line x1="12" y1="16" x2="8" y2="16" />
    <line x1="12" y1="20" x2="8" y2="20" />
  </svg>
);
const IconLink = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 0 0 7.54-.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
    <path d="M14 11a5 5 0 0 0-7.54.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" />
  </svg>
);
const IconSearch = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconStar = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="url(#gStar)"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="gStar" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IconCheatsheet = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="url(#gCheat)"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="gCheat" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
    </defs>
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="13" y2="17" />
  </svg>
);
const IconBook = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="url(#gBook)"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <defs>
      <linearGradient id="gBook" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const navItems = [
   { id: "overview", label: "🏠 Overview", icon: <IconOverview /> },
   { id: "subjects", label: "📚 My Subjects", icon: <IconSubjects /> },
   { id: "library", label: "📂 Mega Library", icon: <IconLibrary /> },
   {
     id: "assignments",
     label: "📋 Assignments",
     icon: <IconAssignments />,
   },
   {
     id: "bookmarks",
     label: "🔖 Bookmarks",
     icon: <IconBookmark filled={false} />,
   },
   {
     id: "announcements",
     label: "📢 Announcements",
     icon: <IconAnnouncement />,
   },
   {
     id: "attendance",
     label: "📅 Attendance",
     icon: <IconCalendar />,
    },
   {
     id: "results",
     label: "🏆 Results",
     icon: <IconResults />,
   },
 ];

const crNavItems = [
   { id: "my-uploads", label: "📁 My Uploads", icon: <FileText /> },
];

const MOCK_LIBRARY_ITEMS = [
  {
    id: "lib1",
    title: "Galvin - Operating Systems PDF",
    category: "Reference Books",
    iconType: "book",
  },
  {
    id: "lib2",
    title: "TOC Unit 1-5 Toppers Notes",
    category: "Toppers Notes",
    iconType: "star",
  },
  {
    id: "lib3",
    title: "Python 1-Shot Cheat Sheet",
    category: "Exam Cheatsheets",
    iconType: "cheatsheet",
  },
  {
    id: "lib4",
    title: "Data Structures Complete Syllabus",
    category: "Syllabus",
    iconType: "syllabus",
  },
  {
    id: "lib5",
    title: "DBMS Class Notes - Handwritten",
    category: "Class Notes",
    iconType: "notes",
  },
  {
    id: "lib6",
    title: "Software Engineering PYQs 2020-2024",
    category: "PYQs",
    iconType: "pyqs",
  },
];

const getLibIcon = (type) => {
  switch (type) {
    case "book":
      return <IconBook />;
    case "star":
      return <IconStar />;
    case "cheatsheet":
      return <IconCheatsheet />;
    case "syllabus":
      return <IconSyllabus />;
    case "notes":
      return <IconNotes />;
    case "pyqs":
      return <IconPYQs />;
    default:
      return <IconBook />;
  }
};

const getDynamicIcon = (item) => {
  // 1. Check explicit mock library icon types first
  if (item.iconType === 'book') return <IconBook />;
  if (item.iconType === 'star') return <IconStar />;
  if (item.iconType === 'cheatsheet') return <IconCheatsheet />;
  if (item.iconType === 'syllabus') return <IconSyllabus />;
  if (item.iconType === 'notes') return <IconNotes />;
  if (item.iconType === 'pyqs') return <IconPYQs />;

  // 2. Check dynamic DB types
  const t = String(item.type || item.category || '').toLowerCase();
  const u = String(item.file_url || item.link || '').toLowerCase();

  // Lectures / Videos / Links
  if (t.includes('lecture') || t.includes('video') || t.includes('link') || u.includes('youtube') || u.includes('drive.google')) {
    return <IconLink />;
  }
  
  // Notes
  if (t.includes('note')) return <IconNotes />;
  
  // Assignments / Tutorials
  if (t.includes('tutorial') || t.includes('assignment') || t.includes('cheat')) return <IconCheatsheet />;
  
  // Books / Reference
  if (t.includes('book') || t.includes('reference')) return <IconBook />;
  
  // PYQs & Exams
  if (t.includes('pyq') || t.includes('exam')) return <IconPYQs />;
  
  // Syllabus
  if (t.includes('syllabus')) return <IconSyllabus />;
  
  // File types
  if (u.includes('.pdf') || item.file_type === 'pdf') return <IconPDF />;

  // Ultimate Fallback
  return <IconPDF />;
};

const THEORY_PRACTICAL_FILTERS = ["All", "Theory", "Practical"];

const formatTime12h = (timeString) => {
  if (!timeString) return '';
  const [hourStr, minuteStr] = timeString.split(':');
  let hour = parseInt(hourStr, 10);
  
  if (hour >= 1 && hour <= 6) {
    hour += 12;
  }
  
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${hour}:${minuteStr} ${ampm}`;
};

export default function StudentDashboard() {
   const navigate = useNavigate();
    const { user } = useAuth();
   const [profile, setProfile] = useState(null);
   const [studentProfile, setStudentProfile] = useState(null);
   const [announcements, setAnnouncements] = useState([]);
   const [allMaterials, setAllMaterials] = useState([]);
   const [semester, setSemester] = useState(null);
const [gridSubjects, setGridSubjects] = useState([]);
    const [activeTab, setActiveTab] = useState("overview");
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [activeFilter, setActiveFilter] = useState("All");
    const [bookmarkedIds, setBookmarkedIds] = useState([]);
    const bookmarkedIdsRef = useRef([]);
    const [bookmarkFilter, setBookmarkFilter] = useState("All");
    const [isLoading, setIsLoading] = useState(true);
    const [librarySearch, setLibrarySearch] = useState("");
    const [libraryFilter, setLibraryFilter] = useState("All");
    const [selectedSemester, setSelectedSemester] = useState(null);
    const [liveSemester, setLiveSemester] = useState(null);
    const [availableSemesters, setAvailableSemesters] = useState([]);
    const [subjectMaterials, setSubjectMaterials] = useState([]);
    const [dynamicCategories, setDynamicCategories] = useState(["All"]);
    const [crDetails, setCrDetails] = useState(null);
    const [crSubjects, setCrSubjects] = useState([]);
    const [attendanceStats, setAttendanceStats] = useState({ total: 0, present: 0, percentage: 0 });
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [todayClasses, setTodayClasses] = useState([]);
    const [globalAcademicTotal, setGlobalAcademicTotal] = useState(null);
    const liveCardRef = useRef(null);

    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const subjectWiseStats = attendanceRecords.reduce((acc, record) => {
      const subjectName = record.attendance_sessions?.subjects?.name || 'Unknown';
      if (!acc[subjectName]) {
        acc[subjectName] = { total: 0, present: 0 };
      }
      acc[subjectName].total += 1;
      if (String(record.status).toUpperCase() === 'P') {
        acc[subjectName].present += 1;
      }
      return acc;
    }, {});

    const subjectWiseData = Object.entries(subjectWiseStats).map(([name, stats]) => ({
      name,
      total: stats.total,
      present: stats.present,
      percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
    }));

    const recentRecords = [...attendanceRecords]
      .sort((a, b) => new Date(b.marked_at || 0) - new Date(a.marked_at || 0))
      .slice(0, 5);

    // Build the full subject list (every enrolled subject) merged with
    // attendance stats. This ensures a pill is rendered for ALL subjects,
    // even those the student hasn't been marked for yet (0% / no history).
    const attendanceSubjects = (
      gridSubjects.length > 0 ? gridSubjects : subjectWiseData
    ).map((sub) => {
      const subName = sub.subject_name || sub.name || sub.title || "";
      const subCode = sub.subject_code || sub.code || "";
      const subType =
        sub.type ||
        (String(subName).toLowerCase().includes("lab") ? "Lab" : "Theory");
      const match = subjectWiseData.find(
        (sw) =>
          (subName && sw.name && sw.name.toLowerCase() === subName.toLowerCase()) ||
          (subCode && sw.name && sw.name.includes(subCode))
      );
      return {
        name: subName,
        code: subCode,
        type: subType,
        present: match?.present ?? 0,
        total: match?.total ?? 0,
        percentage: match?.percentage ?? 0,
      };
    });

   useEffect(() => {
     bookmarkedIdsRef.current = bookmarkedIds;
   }, [bookmarkedIds]);

   useEffect(() => {
     if (!gridSubjects || gridSubjects.length === 0) {
       setGlobalAcademicTotal(null);
       return;
     }
     let cancelled = false;
     async function computeGlobalAcademicTotal() {
       const subjectIds = gridSubjects.map(s => s.id);
       const { data: sessionsData } = await supabase
         .from('attendance_sessions')
         .select('id')
         .in('subject_id', subjectIds);
       if (!cancelled) {
         const uniqueSessionIds = new Set((sessionsData || []).map(s => s.id));
         setGlobalAcademicTotal(uniqueSessionIds.size);
       }
     }
     computeGlobalAcademicTotal();
     return () => { cancelled = true; };
   }, [gridSubjects]);

const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadForm, setUploadForm] = useState({
      title: "",
      description: "",
      subject_id: "",
      type: "Notes",
      uploadMethod: "file",
      file: null,
      url: "",
      duration: "",
    });
const [myUploads, setMyUploads] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadModalSubject, setUploadModalSubject] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [activeProfileTab, setActiveProfileTab] = useState("general");
    const [editPhone, setEditPhone] = useState("");
    const [editAvatarFile, setEditAvatarFile] = useState(null);
    const [editAvatarPreview, setEditAvatarPreview] = useState("");
    const [editNewPassword, setEditNewPassword] = useState("");
    const [editConfirmPassword, setEditConfirmPassword] = useState("");
    const [profileSaving, setProfileSaving] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const editAvatarPreviewRef = useRef("");

    const showToast = (message, type = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3500);
    };

    const openProfileModal = () => {
      setEditPhone(studentProfile?.phone || profile?.phone || "");
      setEditAvatarFile(null);
      if (editAvatarPreviewRef.current) {
        URL.revokeObjectURL(editAvatarPreviewRef.current);
        editAvatarPreviewRef.current = "";
      }
      setEditAvatarPreview("");
      setEditNewPassword("");
      setEditConfirmPassword("");
      setActiveProfileTab("general");
      setIsProfileModalOpen(true);
    };

    const closeProfileModal = () => {
      if (editAvatarPreviewRef.current) {
        URL.revokeObjectURL(editAvatarPreviewRef.current);
        editAvatarPreviewRef.current = "";
      }
      setEditAvatarPreview("");
      setEditNewPassword("");
      setEditConfirmPassword("");
      setIsProfileModalOpen(false);
    };

useEffect(() => {
      let cancelled = false;

      async function loadStudentData() {
        setIsLoading(true);
        try {
           if (!user) return;

           const { data: crData, error: crError } = await supabase
             .from("class_representatives")
             .select("branch, year, semester")
             .eq("student_id", user.id)
             .maybeSingle();

           if (crError) {
             console.error("Failed to fetch CR details:", crError);
           } else if (!cancelled) {
             setCrDetails(crData);
           }

const { data: profileData, error: profileError } = await supabase
              .from("user_profiles")
              .select("*, batches(*)")
              .eq("id", user.id)
              .single();

            if (profileError) throw profileError;
            if (!cancelled) {
              setProfile(profileData);
              setStudentProfile(profileData);
            }

            const { data: bookmarkData, error: bookmarkError } = await supabase
              .from("bookmarks")
              .select("resource_id")
              .eq("user_id", user.id);
            if (bookmarkError) console.error("Failed to fetch bookmarks:", bookmarkError);
            if (!cancelled) {
              setBookmarkedIds((bookmarkData || []).map((b) => b.resource_id));
            }

           const { data: announcementData } = await supabase
             .from("announcements")
             .select("*")
             .order("created_at", { ascending: false })
             .limit(5);

           if (!cancelled) setAnnouncements(announcementData || []);

            // Strict fetch: attendance_sessions!inner REQUIRES the parent session
            // to still exist. If the faculty portal deleted a session (and its
            // records), those rows are dropped here, so orphaned attendance for
            // deleted dates (e.g. July 4th / July 8th) never reaches the UI.
            // No stale/cached data is used — every load re-queries Supabase fresh.
            const { data: attendanceData, error: attendanceError } = await supabase
              .from('attendance_records')
              .select(`
                *,
                attendance_sessions!inner (
                  *,
                  subjects ( name, code )
                )
              `)
              .eq('student_id', user.id)
              .order('marked_at', { ascending: false });
            if (attendanceError) console.error("Failed to fetch attendance:", attendanceError);
            if (!cancelled && attendanceData) {
             const total = attendanceData.length;
              const present = attendanceData.filter((r) => String(r.status).toUpperCase() === 'P').length;
             const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
             setAttendanceStats({ total, present, percentage });
             setAttendanceRecords(attendanceData);
           }

           const studentSemester = profileData?.batches?.semester;
           if (!cancelled) setSemester(studentSemester ?? null);

           const studentBranch =
             profileData?.selected_branch ||
             profileData?.branch ||
             profileData?.branch_id ||
             profileData?.department ||
             profileData?.batches?.department ||
             profileData?.batches?.branch ||
             null;
           const studentYear =
             profileData?.selected_year ||
             profileData?.year ||
             profileData?.batches?.year ||
             profileData?.batches?.academic_year ||
             null;

           const { data: deptData } = await supabase
             .from("departments")
             .select("is_sem1_live, is_sem2_live, is_sem3_live, is_sem4_live, is_sem5_live, is_sem6_live, is_sem7_live, is_sem8_live")
             .eq("code", studentBranch)
             .eq("description", studentYear)
             .maybeSingle();

           const yearSemesterMap = {
             '1st Year': [1, 2],
             '2nd Year': [3, 4],
             '3rd Year': [5, 6],
             '4th Year': [7, 8],
           };

           let liveSem = null;
           if (deptData) {
             for (let i = 1; i <= 8; i++) {
               if (deptData[`is_sem${i}_live`]) {
                 liveSem = i;
                 break;
               }
             }
           }

           if (!cancelled) setLiveSemester(liveSem);

           let defaultSemester = null;
           if (liveSem !== null) {
             defaultSemester = liveSem;
           } else if (studentYear && yearSemesterMap[studentYear]) {
             defaultSemester = yearSemesterMap[studentYear][yearSemesterMap[studentYear].length - 1];
           }

if (!cancelled && defaultSemester !== null) {
              setSelectedSemester(defaultSemester);
            }

            const visibleSemesters = studentYear === '2nd Year'
              ? [3, 4]
              : (yearSemesterMap[studentYear] || []);

            if (!cancelled) {
              setAvailableSemesters(visibleSemesters);
            }
          } catch (err) {
            console.error("Failed to load student dashboard data:", err);
          } finally {
            if (!cancelled) setIsLoading(false);
          }
        }

        if (user?.id) {
          loadStudentData();
        } else {
          setIsLoading(false);
        }
        return () => {
          cancelled = true;
        };
    }, [user?.id]);

  async function fetchSubjectsForGrid() {
    const branch = studentProfile?.selected_branch;
    if (!branch || selectedSemester === null) {
      setGridSubjects([]);
      return;
    }
    const { data, error } = await supabase
      .from('subjects')
      .select('*, faculty:faculty_id(id, full_name, avatar_url, profile_image_url)')
      .eq('department', branch)
      .eq('semester', `Semester ${selectedSemester}`);

    console.log("Debug Fetch:", { branch, semester: selectedSemester, data, error });

    if (error) {
      console.error("Error fetching subjects:", error);
      return;
    }

    setGridSubjects(data || []);
  }

    useEffect(() => {
      if (!user?.id) return;
      let cancelled = false;
      async function loadUserProfile() {
        const { data } = await supabase.auth.getUser();
        const authUser = data?.user;
        if (!cancelled && authUser) {
          const { data: prof } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();
          if (!cancelled && prof) {
            setStudentProfile((prev) => ({ ...prev, ...prof }));
          }
        }
      }
      loadUserProfile();
      return () => { cancelled = true; };
    }, [user?.id]);

  useEffect(() => {
      if (activeTab !== "my-uploads") {
        setSelectedSubject(null);
      }
      setShowUploadModal(false);
      setActiveFilter("All");
      setLibrarySearch("");
      setLibraryFilter("All");
      setBookmarkFilter("All");
    }, [activeTab]);

  useEffect(() => {
    if (!studentProfile) return;
    let cancelled = false;

    const myBatch = String(
      studentProfile?.section ||
      studentProfile?.batch ||
      studentProfile?.selected_section ||
      studentProfile?.batches?.section ||
      ''
    ).trim().toLowerCase();

    const branch =
      studentProfile?.selected_branch ||
      studentProfile?.branch ||
      studentProfile?.branch_id ||
      studentProfile?.department ||
      studentProfile?.batches?.department ||
      studentProfile?.batches?.branch ||
      null;

    const studentSemester = parseInt(
      String(
        studentProfile?.batches?.semester ||
        studentProfile?.selected_semester ||
        ''
      ).replace(/\D/g, ''),
      10
    );

    const fetchTodayClasses = async () => {
        try {
            const stuBranch = studentProfile?.branch || 'IT';
            const stuSemester = studentProfile?.semester || 4;

            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            let currentDay = days[new Date().getDay()];
            if (currentDay === 'Sunday') currentDay = 'Tuesday';

            const { data: rawSlots, error } = await supabase
                .from('timetable_slots')
                .select('*')
                .eq('branch', stuBranch)
                .eq('semester', stuSemester)
                .eq('day_of_week', currentDay);

            if (error) throw error;
            if (!rawSlots || rawSlots.length === 0) {
                setTodayClasses([]);
                return;
            }

            const subjectIds = [...new Set(rawSlots.map((s) => s.subject_id).filter(Boolean))];
            const facultyIds = [...new Set(rawSlots.map((s) => s.faculty_id).filter(Boolean))];

            const [subjectsRes, facultiesRes] = await Promise.all([
                subjectIds.length
                    ? supabase.from('subjects').select('id, name, code').in('id', subjectIds)
                    : Promise.resolve({ data: [] }),
                facultyIds.length
                    ? supabase.from('user_profiles').select('id, full_name').in('id', facultyIds)
                    : Promise.resolve({ data: [] }),
            ]);

            const subjectMap = new Map((subjectsRes.data || []).map((s) => [s.id, s]));
            const facultyMap = new Map((facultiesRes.data || []).map((f) => [f.id, f]));

            const data = rawSlots.map((slot) => ({
                ...slot,
                subjects: subjectMap.get(slot.subject_id) || null,
                user_profiles: facultyMap.get(slot.faculty_id) || null,
            }));

            data.push({
                id: 'short-break-static',
                type: 'break',
                start_time: '11:00:00',
                end_time: '11:15:00',
                subject_name: '☕ Short Break',
                faculty_name: 'Relax & Recharge',
                room_no: 'Campus'
            });
            
            data.push({
                id: 'lunch-break-static',
                type: 'break',
                start_time: '13:05:00',
                end_time: '13:45:00',
                subject_name: '🍱 Lunch Break',
                faculty_name: 'Enjoy your meal!',
                room_no: 'Cafeteria'
            });

            try {
                const sortedSlots = data.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

                console.log("FINAL RENDER SLOTS (Bypassed Filter):", sortedSlots);

                setTodayClasses(sortedSlots);
            } catch (err) {
                console.error("Sorting/Rendering Error:", err);
                setTodayClasses(data || []);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
            setTodayClasses([]);
        }
    };

    fetchTodayClasses();
    return () => { cancelled = true; };
  }, [studentProfile]);

   useEffect(() => {
       if (liveCardRef && liveCardRef.current) {
           setTimeout(() => {
               if (liveCardRef && liveCardRef.current) {
                   liveCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
               }
           }, 300);
       }
   }, [todayClasses]);

   useEffect(() => {
    if (activeTab !== "my-uploads") return;
    let cancelled = false;
    async function fetchMyUploads() {
      let materials = [];
      if (user?.id) {
        const { data } = await supabase
          .from("study_materials")
          .select("*")
          .eq("uploaded_by", user.id)
          .order("created_at", { ascending: false });
        materials = data || [];
      }
      const { data: subjectsData } = await supabase.from("subjects").select("*");
      const merged = (materials || []).map((m) => ({
        ...m,
        subjects: (subjectsData || []).find((s) => s.id === m.subject_id) || {
          name: "Unknown Subject",
          code: "N/A",
        },
      }));
      if (!cancelled) setMyUploads(merged);
    }
    fetchMyUploads();
    return () => { cancelled = true; };
  }, [activeTab, user?.id]);

useEffect(() => {
      if (!studentProfile?.selected_branch) return;
       fetchSubjectsForGrid();
    }, [studentProfile?.selected_branch, selectedSemester]);

    useEffect(() => {
      if (crDetails && crDetails.branch && crDetails.semester) {
        async function fetchCRSubjects() {
          const { data: subjects } = await supabase
            .from('subjects')
            .select('*, faculty:faculty_id(id, full_name, avatar_url, profile_image_url)')
            .eq('department', crDetails.branch)
            .eq('semester', `Semester ${crDetails.semester}`);
          setCrSubjects(subjects || []);
        }
        fetchCRSubjects();
      }
    }, [crDetails]);

    useEffect(() => {
      let cancelled = false;

      async function refreshOnTabChange() {
        if (activeTab === "library" || activeTab === "bookmarks") {
          const data = await fetchAllMaterials();
          if (!cancelled) setAllMaterials(data);
        }
      }

    refreshOnTabChange();
    return () => {
      cancelled = true;
    };
}, [activeTab]);

  const toggleBookmark = async (resourceId) => {
    if (!user) return;
    const isCurrentlyBookmarked = bookmarkedIdsRef.current.includes(resourceId);
    try {
      if (isCurrentlyBookmarked) {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("resource_id", resourceId);
        if (error) throw error;
        setBookmarkedIds((prev) => prev.filter((id) => id !== resourceId));
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .insert([{ user_id: user.id, resource_id: resourceId }]);
        if (error) throw error;
        setBookmarkedIds((prev) => [...prev, resourceId]);
      }
    } catch (error) {
      console.error("Bookmark operation failed:", error);
      alert("Failed to update bookmark. Please try again.");
    }
  };

async function fetchAllMaterials() {
    const { data: materials, error: materialsError } = await supabase
      .from("study_materials")
      .select("*")
      .order("id", { ascending: true });

    if (materialsError) {
      console.error("Failed to fetch materials:", materialsError);
      return [];
    }

    const { data: subjectsData } = await supabase.from("subjects").select("*");

    const mergedMaterials = (materials || []).map((m) => ({
      ...m,
      subjects: (subjectsData || []).find((s) => s.id === m.subject_id) || {
        name: "Unknown Subject",
        code: "N/A",
      },
    }));

    return mergedMaterials;
  }

  useEffect(() => {
    if (!selectedSubject) return;
    let cancelled = false;
    async function fetchSubjectData() {
      const { data } = await supabase
        .from('study_materials')
        .select('*')
        .eq('subject_id', selectedSubject.id);
      if (!cancelled) setSubjectMaterials(data || []);

      const { data: catData } = await supabase
        .from('material_categories')
        .select('name')
        .eq('is_active', true)
        .order('priority', { ascending: true });
      if (!cancelled && catData) {
        setDynamicCategories(['All', ...catData.map(c => c.name)]);
      }
    }
    fetchSubjectData();
    return () => { cancelled = true; };
  }, [selectedSubject]);

  useEffect(() => {
    if (activeTab !== "library" && activeTab !== "bookmarks") return;
    let cancelled = false;
    async function fetchCategories() {
      const { data: catData } = await supabase
        .from('material_categories')
        .select('name')
        .eq('is_active', true)
        .order('priority', { ascending: true });
      if (!cancelled && catData) {
        setDynamicCategories(['All', ...catData.map(c => c.name)]);
      }
    }
    fetchCategories();
    return () => { cancelled = true; };
}, [activeTab]);

  const handleView = (material) => {
    // Universal check: Look for the link in every possible database field
    const link = material.file_url || material.link || material.external_url || material.url;
    
    if (link) {
      // If it looks like a valid URL, open it
      if (link.startsWith('http')) {
        window.open(link, '_blank');
      } else {
        alert("Invalid link format: " + link);
      }
    } else {
      alert("No file or link found in the database for this item.");
    }
  };

  const getFilteredMaterials = () => {
    if (!selectedSubject) return [];
    if (activeFilter === "All") return subjectMaterials;
    return subjectMaterials.filter((m) => {
      const type = (m.type || m.category || "").toLowerCase();
      return (
        type === activeFilter.toLowerCase() ||
        type.includes(activeFilter.toLowerCase())
      );
    });
  };

  async function handleSignOut() {
    await signOut();
  }

  // --- UPLOAD LOGIC ---
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (uploadForm.uploadMethod === "file" && !uploadForm.file) {
      return alert("Please select a file to upload.");
    }
    if (uploadForm.uploadMethod === "link" && !uploadForm.url) {
      return alert("Please provide a URL.");
    }

    setUploadLoading(true);
    try {
      const payload = {
        title: uploadForm.title,
        subject_id: uploadForm.subject_id,
        type: uploadForm.type,
        file_url: uploadForm.uploadMethod === "link" ? uploadForm.url : null,
        uploaded_by: user.id,
        duration: uploadForm.duration || null,
      };

      const fileToUpload =
        uploadForm.uploadMethod === "file" ? uploadForm.file : null;

      await uploadNewResource(payload, fileToUpload);
      closeUploadModal();

      setToast({ message: "Material uploaded successfully!", type: "success" });
      setTimeout(() => setToast(null), 3500);

      if (selectedSubject) {
        const { data } = await supabase
          .from("study_materials")
          .select("*")
          .eq("subject_id", selectedSubject.id);
        if (data) setSubjectMaterials(data);
      }

      if (activeTab === "my-uploads") {
        const { data: myData } = await supabase
          .from("study_materials")
          .select("*")
          .eq("uploaded_by", user.id)
          .order("created_at", { ascending: false });
        const { data: subjectsData } = await supabase
          .from("subjects")
          .select("*");
        const merged = (myData || []).map((m) => ({
          ...m,
          subjects: (subjectsData || []).find((s) => s.id === m.subject_id) || {
            name: "Unknown Subject",
            code: "N/A",
          },
        }));
        setMyUploads(merged);
      }
    } catch (error) {
      console.error("Upload Error Details:", error);
      alert(`UPLOAD FAILED ERROR:\n\n${error.message}`);
    } finally {
      setUploadLoading(false);
      setUploadForm({
        title: "",
        description: "",
        subject_id: "",
        type: "Notes",
        uploadMethod: "file",
        file: null,
        url: "",
        duration: "",
      });
    }
  };
  // ------------------------
   const openUploadModal = (subject) => {
     setUploadModalSubject(subject);
     setUploadForm({
       title: "",
       description: "",
       subject_id: subject.id,
       type: "Notes",
       uploadMethod: "file",
       file: null,
       url: "",
       duration: "",
     });
     setShowUploadModal(true);
   };

     const closeUploadModal = () => {
       setShowUploadModal(false);
       setUploadModalSubject(null);
       setUploadForm({
        title: "",
        description: "",
        subject_id: "",
        type: "Notes",
        uploadMethod: "file",
        file: null,
        url: "",
        duration: "",
      });
    };

  const handleDeleteResource = (id) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    setDeleteLoading(true);
    try {
      await deleteResource(id);
      setMyUploads((prev) => prev.filter((m) => m.id !== id));
      setSubjectMaterials((prev) => prev.filter((m) => m.id !== id));
      setToast({ message: "Material deleted successfully.", type: "error" });
      setTimeout(() => setToast(null), 3500);
    } catch (error) {
      console.error("Delete error:", error);
      setToast({ message: "Failed to delete material. Please try again.", type: "error" });
      setTimeout(() => setToast(null), 3500);
    } finally {
      setDeleteLoading(false);
    }
  };

  const displayName =
    studentProfile?.full_name ||
    profile?.full_name ||
    user?.email?.split("@")[0] ||
    "Student";
  const displayRole = profile?.role || "student";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const filteredLibraryItems = allMaterials.filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(librarySearch.toLowerCase()) ||
      (item.category &&
        item.category.toLowerCase().includes(librarySearch.toLowerCase()));
    const matchesFilter =
      libraryFilter === "All" ||
      item.type === libraryFilter ||
      (item.category && item.category === libraryFilter);
    return matchesSearch && matchesFilter;
  });

  const libraryPills = dynamicCategories.map((cat) => (
    <button
      key={cat}
      className={`student-lib-filter-pill ${libraryFilter === cat ? "student-lib-filter-pill--active" : ""}`}
      onClick={() => setLibraryFilter(cat)}
    >
      {cat}
    </button>
  ));

  const libraryCards = filteredLibraryItems.map((item) => {
    const isLecture = (item.type || '').toLowerCase() === 'lecture';
    if (isLecture) {
      const matchedSubject = gridSubjects?.find(s => s.id === item.subject_id) || {};
      const facultyFullName = item.faculty_name || matchedSubject?.faculty?.full_name || 'Susheela Verma';
      const shortFacultyName = facultyFullName.length > 15 ? facultyFullName.split(' ')[0] : facultyFullName;
      const avatarUrl = item.faculty_avatar || matchedSubject?.faculty?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(facultyFullName)}&background=1e1e2d&color=fff`;

      return (
        <div key={item.id} className="pw-lecture-card">
          {/* Top Gradient Section */}
          <div className="pw-card-top">
            <div className="pw-card-top-left">
              <span className="pw-subject-badge">{item.subject_name || matchedSubject?.subject_name || "Lecture"}</span>
              <div className="pw-subject-line"></div>
              <p className="pw-card-desc" title={item.title}>{item.title || 'Untitled Lecture'}</p>
              <span className="pw-teacher-name" title={facultyFullName}>By {shortFacultyName}</span>
            </div>
            <div className="pw-card-top-right">
              <div className="pw-avatar-container" onClick={() => handleView && handleView(item)}>
                <img src={avatarUrl} alt="Faculty" />
                <div className="pw-play-btn">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom White Section */}
          <div className="pw-card-bottom">
            <div className="pw-card-meta">
              <span className="pw-date">
                {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="pw-duration">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                {item.duration || '00:00'}
              </span>
            </div>
            
            <h3 className="pw-card-title">{item.description || 'No description provided'}</h3>
            
            <div className="pw-card-actions" style={{ position: 'relative' }}>
              <svg onClick={(e) => { e.stopPropagation(); handleView && handleView(item); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" stroke="#6b7280" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="View Material"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path></svg>
              
              <svg onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" stroke="#6b7280" fill="none" strokeWidth="2" title="More Options"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>

              {/* Dropdown Menu & Invisible Click-Outside Overlay */}
              {openMenuId === item.id && (
                <>
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, cursor: 'default' }}
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                  ></div>
                  
                  <div className="pw-dropdown-menu" style={{ zIndex: 50 }}>
                    <div 
                      className="pw-dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        if(typeof toggleBookmark === 'function') toggleBookmark(item.id);
                        setOpenMenuId(null);
                      }}
                    >
                      {bookmarkedIds.includes(item.id) ? '★ Remove Bookmark' : '☆ Bookmark'}
                    </div>
                    <div 
                      className="pw-dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert('Download feature coming soon in My Downloads!');
                        setOpenMenuId(null);
                      }}
                    >
                      ↓ Download
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }
    const facultyFullName = item.faculty_name || gridSubjects?.find(s => s.id === item.subject_id)?.faculty?.full_name || 'Susheela Verma';
    const shortFacultyName = facultyFullName.length > 15 ? facultyFullName.split(' ')[0] : facultyFullName;
    const avatarUrl = item.faculty_avatar || gridSubjects?.find(s => s.id === item.subject_id)?.faculty?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(facultyFullName)}&background=1e1e2d&color=fff`;

    return (
      <div key={item.id} className="pw-lecture-card" onClick={() => handleView(item)}>
        <div className="pw-card-top">
          <div className="pw-card-top-left">
            <span className="pw-subject-badge" style={{ color: '#38bdf8' }}>{item.type ? item.type.toUpperCase() : "DOCUMENT"}</span>
            <div className="pw-subject-line" style={{ background: '#38bdf8' }}></div>
            <p className="pw-card-desc" title={item.title}>{item.title || 'Untitled Document'}</p>
            <span className="pw-teacher-name" title={facultyFullName}>By {shortFacultyName}</span>
          </div>
          <div className="pw-card-top-right">
            <div className="pw-avatar-container">
              <img src={avatarUrl} alt="Faculty" />
              <div className="pw-play-btn" style={{ background: '#0284c7' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pw-card-bottom">
          <div className="pw-card-meta">
            <span className="pw-date">
              {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="pw-duration" style={{ color: '#38bdf8' }}>
              📄 {item.type === 'Class Notes' ? 'PDF Note' : 'Document'}
            </span>
          </div>
          
          <h3 className="pw-card-title">{item.description || 'No description provided'}</h3>
          
          <div className="pw-card-actions" style={{ position: 'relative' }}>
            <svg onClick={(e) => { e.stopPropagation(); handleView(item); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" stroke="#6b7280" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="View Material"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            
            <svg onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" stroke="#6b7280" fill="none" strokeWidth="2" title="More Options"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>

            {openMenuId === item.id && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, cursor: 'default' }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}></div>
                <div className="pw-dropdown-menu" style={{ zIndex: 50 }}>
                  <div className="pw-dropdown-item" onClick={(e) => { e.stopPropagation(); toggleBookmark(item.id); setOpenMenuId(null); }}>
                    {bookmarkedIds.includes(item.id) ? '★ Remove Bookmark' : '☆ Bookmark'}
                  </div>
                  <div className="pw-dropdown-item" onClick={(e) => { e.stopPropagation(); alert('Download feature coming soon!'); setOpenMenuId(null); }}>
                    ↓ Download
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  });

  const libraryEmptyState = (
    <div className="student-lib-empty">
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <p>No materials found for your search.</p>
    </div>
  );

  return (
    <div className="student-dashboard-layout">
      <aside className="student-sidebar">
        <div className="student-sidebar__header">
          <div className="student-sidebar__logo">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 2 6 3 6 3s6-1 6-3v-5" />
            </svg>
          </div>
          <h1 className="student-sidebar__brand">UCA</h1>
        </div>

<nav className="student-sidebar__nav">
           {navItems.map(({ id, label, icon }) => (
             <button
               key={id}
               className={`student-sidebar__link ${activeTab === id ? "student-sidebar__link--active" : ""}`}
               onClick={() => setActiveTab(id)}
             >
               <span className="student-sidebar__link-icon">{icon}</span>
               <span className="student-sidebar__link-label">{label}</span>
             </button>
           ))}
           {crDetails && crNavItems.map(({ id, label, icon }) => (
             <button
               key={id}
               className={`student-sidebar__link ${activeTab === id ? "student-sidebar__link--active" : ""}`}
               onClick={() => setActiveTab(id)}
             >
               <span className="student-sidebar__link-icon">{icon}</span>
               <span className="student-sidebar__link-label">{label}</span>
             </button>
           ))}
         </nav>

         <div className="student-sidebar__footer">
           <span>Student Portal · v1.0</span>
         </div>
       </aside>

       <main className="student-main">
         <header className="student-header">
           <div className="student-header__title-wrap">
             <h2 className="student-header__title">Student Dashboard</h2>
             <span className="student-header__welcome">
               Welcome back, {displayName.split(" ")[0]}
             </span>
           </div>

           <div className="student-header__right">
             <div className="student-header__user">
               <div className="student-header__avatar">{initials}</div>
                <div className="student-header__meta">
                  <span className="student-header__name">{displayName}</span>
                  <div className="student-header__meta-row">
                    {crDetails && (
                      <span className="student-header__cr-badge">CR Mode</span>
                    )}
                    <span className="student-header__role">{displayRole}</span>
                  </div>
                </div>
             </div>
             <button className="student-header__signout" onClick={handleSignOut}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>{" "}
              Sign Out
            </button>
          </div>
        </header>

        <div className="student-content">
          {activeTab === "overview" && (
            <div className="student-grid">
              <section className="student-section student-section--grow student-section--full">
                <h3 className="student-section__title">📅 Today's Classes <span className="st-header-sub">({todayClasses[0]?.day_of_week || 'Today'})</span></h3>
                {todayClasses.length === 0 ? (
                  <div className="student-empty-box">
                    <p>No classes today! Enjoy your day off. 🎉</p>
                  </div>
                ) : (
                  <div className="st-timeline-container">
                    {todayClasses.map((slot) => {
                      const now = new Date();
                      const currentTime = now.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Kolkata' });
                      const isLive = currentTime >= slot.start_time && currentTime <= slot.end_time;

                       return (
                         <div
                           key={slot.id}
                           ref={isLive ? liveCardRef : null}
                           className={`st-class-card st-type-${slot.type?.toLowerCase() || 'theory'}`}
                         >
                          <div className="st-time-col">
                            <span className="st-time-badge">{formatTime12h(slot.start_time)} - {formatTime12h(slot.end_time)}</span>
                            {isLive && <span className="student-schedule-card__live">🟢 LIVE</span>}
                          </div>
                          <div className="st-info-col">
                            <h4>{slot.subjects?.name || slot.name || slot.subject_name || 'Unknown Subject'} <span className="st-sub-code">({slot.subjects?.code || slot.code || 'N/A'})</span></h4>
                            <p className="st-faculty">{slot.user_profiles?.full_name || slot.faculty?.full_name || 'Assigned Faculty'}</p>
                          </div>
                          <div className="st-room-col">
                            <span className="st-room-badge">{slot.room_no ? `Room ${slot.room_no}` : 'TBA'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="student-section student-section--profile">
                <h3 className="student-section__title">Student Profile</h3>
                <div className="student-profile-card">
                  {studentProfile?.avatar_url ? (
                    <img
                      src={studentProfile.avatar_url}
                      alt="Avatar"
                      className="student-profile-avatar-img"
                    />
                  ) : (
                    <div className="student-profile__icon">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                  <button
                    className="student-profile-card__edit-btn"
                    onClick={() => openProfileModal()}
                  >
                    <Pencil size={14} />
                    <span>Edit Profile</span>
                  </button>
                  <div className="student-profile__body">
                    <div className="student-profile__row">
                      <span className="student-profile__label">Name</span>
                      <span className="student-profile__value">
                        {studentProfile?.full_name || profile?.full_name || "—"}
                      </span>
                    </div>
                    <div className="student-profile__row">
                      <span className="student-profile__label">Roll No</span>
                      <span className="student-profile__value">
                        {studentProfile?.roll_number ||
                          profile?.roll_number ||
                          "—"}
                      </span>
                    </div>
                    <div className="student-profile__row">
                      <span className="student-profile__label">Phone</span>
                      <span className="student-profile__value">
                        {studentProfile?.phone || profile?.phone || "—"}
                      </span>
                    </div>
                    <div className="student-profile__row">
                      <span className="student-profile__label">College ID</span>
                      <span className="student-profile__value">
                        {studentProfile?.college_id ||
                          profile?.college_id ||
                          "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="student-section student-section--grow student-section--notices">
                <h3 className="student-section__title">Notice Board</h3>
                {announcements.length === 0 ? (
                  <div className="student-empty-box">
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <p>No announcements yet.</p>
                  </div>
                ) : (
                  <div className="student-announcements">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} style={{ backgroundColor: 'rgba(31, 41, 55, 0.4)', border: '1px solid rgba(55, 65, 81, 0.5)', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
  
  {/* TOP: Title on Left, Badge & Date on Right */}
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#ffffff', margin: 0, textAlign: 'left' }}>
      {announcement.title}
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <span style={{ padding: '4px 12px', backgroundColor: 'rgba(55, 65, 81, 0.5)', color: '#60a5fa', fontSize: '0.75rem', fontWeight: '600', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {announcement.type}
      </span>
      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
        {new Date(announcement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </span>
    </div>
  </div>

  {/* MIDDLE: Left-aligned content */}
  <p style={{ color: '#d1d5db', fontSize: '0.875rem', textAlign: 'left', marginBottom: '24px', whiteSpace: 'pre-wrap', marginTop: 0 }}>
    {announcement.content}
  </p>

  {/* BOTTOM: View Button */}
  {(announcement.file_url || announcement.link) && (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <a
        href={announcement.file_url || announcement.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'rgba(30, 58, 138, 0.4)', color: '#bfdbfe', fontSize: '0.875rem', fontWeight: '500', borderRadius: '9999px', textDecoration: 'none' }}
      >
        <span style={{ fontSize: '1rem' }}>🔗</span> View
      </a>
    </div>
  )}
</div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}


            {activeTab === "assignments" && (
              <StudentAssignments user={user} />
            )}

            {activeTab === "my-uploads" && crDetails && (
             <section className="student-section" style={{ animation: "fadeIn 0.25s ease" }}>
               <div style={{ width: "100%", boxSizing: "border-box" }}>
                 <h3 className="student-section__title" style={{ margin: 0, fontSize: "1.5rem" }}>My Uploads</h3>
                 <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>Manage your uploaded study materials</p>

                 {myUploads.length === 0 ? (
                   <div className="student-material-empty">
                     <p>You haven't uploaded any materials yet.</p>
                   </div>
                 ) : (
                   <div className="student-uploads-table-wrap">
                     <table className="student-uploads-table">
                       <thead>
                         <tr>
                           <th>Title</th>
                           <th>Subject</th>
                           <th>Type</th>
                           <th>Date</th>
                           <th>Actions</th>
                         </tr>
                       </thead>
                       <tbody>
                         {myUploads.map((material) => (
                           <tr key={material.id}>
                             <td className="student-uploads-title">{material.title}</td>
                             <td className="student-uploads-subject">
                               {material.subjects?.name || "Unknown"} ({material.subjects?.code || "—"})
                             </td>
                             <td>
                               <span className={`student-material-card__badge student-material-card__badge--${(material.type || material.category || "resource").toLowerCase().replace(/\s+/g, "-")}`}>
                                 {material.type || material.category || "Resource"}
                               </span>
                             </td>
                             <td className="student-uploads-date">
                               {new Date(material.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                             </td>
                             <td>
                               <button className="student-uploads-delete-btn" onClick={() => handleDeleteResource(material.id)} disabled={deleteLoading}>
                                 <Trash2 size={16} /> Delete
                               </button>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}
               </div>
             </section>
           )}

            {showUploadModal && (
              <UploadResourceModal
                formData={uploadForm}
                setFormData={setUploadForm}
                onClose={closeUploadModal}
                onSubmit={handleUploadSubmit}
                uploadLoading={uploadLoading}
                subject={uploadModalSubject}
              />
            )}



           {activeTab === "subjects" && (
             <section className="student-section">
               {selectedSubject ? (
                <>
                  <div
                    className="student-subject-detail-header"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <button
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 16px",
                          borderRadius: "20px",
                          background: "rgba(255, 255, 255, 0.1)",
                          backdropFilter: "blur(10px)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          color: "#e2e8f0",
                          cursor: "pointer",
                          fontWeight: "500",
                          fontSize: "13px",
                          transition: "all 0.2s ease",
                        }}
                        onClick={() => setSelectedSubject(null)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(139, 92, 246, 0.25)";
                          e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.5)";
                          e.currentTarget.style.boxShadow = "0 0 15px rgba(139, 92, 246, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="19" y1="12" x2="5" y2="12" />
                          <polyline points="12 19 5 12 12 5" />
                        </svg>
                        Back to Subjects
                      </button>
                      <h3
                        className="student-section__title"
                        style={{ marginTop: 0, marginLeft: "10px" }}
                      >
                        {selectedSubject.subject_name ||
                          selectedSubject.name ||
                          selectedSubject.title ||
                          "Unnamed Subject"}
                        <span
                          style={{
                            color: "#8b5cf6",
                            fontWeight: "bold",
                            marginLeft: "0.5rem",
                          }}
                        >
                          {selectedSubject.subject_code ||
                            selectedSubject.code ||
                            "No Code"}
                        </span>
                      </h3>
                    </div>
                    {crDetails && (
                       <button
                        onClick={() => openUploadModal(selectedSubject)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          background:
                            "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                          color: "white",
                          padding: "10px 20px",
                          borderRadius: "8px",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "14px",
                        }}
                      >
                        <Upload size={18} /> Upload Material
                      </button>
                    )}
                  </div>

                  <div className="student-material-filters">
                    {dynamicCategories.map((f) => (
                      <button
                        key={f}
                        className={`student-filter-pill ${activeFilter === f ? "student-filter-pill--active" : ""}`}
                        onClick={() => setActiveFilter(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="student-materials-list">
                     {getFilteredMaterials().length > 0 ? (
  getFilteredMaterials().map((material) => {
    const isLecture = (material.type || '').toLowerCase() === 'lecture';
    if (isLecture) {
      // 1. Get exact faculty name or fallback
      const facultyFullName = material.faculty_name || selectedSubject?.faculty?.full_name || 'Susheela Verma';
      
      // 2. Truncate long names (e.g., 'Shrawan kumar pandey' -> 'Shrawan')
      const shortFacultyName = facultyFullName.length > 15 ? facultyFullName.split(' ')[0] : facultyFullName;
      
      // 3. Use actual avatar or generate one with their initials
      const avatarUrl = material.faculty_avatar || selectedSubject?.faculty?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(facultyFullName)}&background=random&color=fff`;

      return (
        <div key={material.id} className="pw-lecture-card">
          {/* Top Gradient Section */}
          <div className="pw-card-top">
            <div className="pw-card-top-left">
              <span className="pw-subject-badge">{selectedSubject?.subject_name || "Lecture"}</span>
              <div className="pw-subject-line"></div>
              {/* Swapped: Title is now at the top */}
              <p className="pw-card-desc" title={material.title}>{material.title || 'Untitled Lecture'}</p>
              <span className="pw-teacher-name" title={facultyFullName}>By {shortFacultyName}</span>
            </div>
            <div className="pw-card-top-right">
              <div className="pw-avatar-container" onClick={() => handleView(material)}>
                <img src={avatarUrl} alt="Faculty" />
                <div className="pw-play-btn">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom White Section */}
          <div className="pw-card-bottom">
            <div className="pw-card-meta">
              <span className="pw-date">
                {new Date(material.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="pw-duration">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                {material.duration || '00:00'}
              </span>
            </div>
            
            {/* Swapped: Description is now at the bottom */}
            <h3 className="pw-card-title">{material.description || 'No description provided'}</h3>
            
            <div className="pw-card-actions" style={{ position: 'relative' }}>
              <svg onClick={(e) => { e.stopPropagation(); handleView(material); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" stroke="#6b7280" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="View Material"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path></svg>
              
              <svg onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === material.id ? null : material.id); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" stroke="#6b7280" fill="none" strokeWidth="2" title="More Options"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>

              {/* Dropdown Menu & Invisible Click-Outside Overlay */}
              {openMenuId === material.id && (
                <>
                  {/* Invisible overlay that catches outside clicks to close the menu */}
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, cursor: 'default' }}
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                  ></div>
                  
                  {/* The actual dropdown menu */}
                  <div className="pw-dropdown-menu" style={{ zIndex: 50 }}>
                    <div 
                      className="pw-dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(material.id);
                        setOpenMenuId(null);
                      }}
                    >
                      {bookmarkedIds.includes(material.id) ? '★ Remove Bookmark' : '☆ Bookmark'}
                    </div>
                    <div 
                      className="pw-dropdown-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert('Download feature coming soon in My Downloads!');
                        setOpenMenuId(null);
                      }}
                    >
                      ↓ Download
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }
    const facultyFullName = material.faculty_name || selectedSubject?.faculty?.full_name || 'Susheela Verma';
    const shortFacultyName = facultyFullName.length > 15 ? facultyFullName.split(' ')[0] : facultyFullName;
    const avatarUrl = material.faculty_avatar || selectedSubject?.faculty?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(facultyFullName)}&background=1e1e2d&color=fff`;

    return (
      <div key={material.id} className="pw-lecture-card" onClick={() => handleView(material)}>
        <div className="pw-card-top">
          <div className="pw-card-top-left">
            <span className="pw-subject-badge" style={{ color: '#38bdf8' }}>{material.type ? material.type.toUpperCase() : "DOCUMENT"}</span>
            <div className="pw-subject-line" style={{ background: '#38bdf8' }}></div>
            <p className="pw-card-desc" title={material.title}>{material.title || material.name || 'Untitled Document'}</p>
            <span className="pw-teacher-name" title={facultyFullName}>By {shortFacultyName}</span>
          </div>
          <div className="pw-card-top-right">
            <div className="pw-avatar-container">
              <img src={avatarUrl} alt="Faculty" />
              <div className="pw-play-btn" style={{ background: '#0284c7' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pw-card-bottom">
          <div className="pw-card-meta">
            <span className="pw-date">
              {new Date(material.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="pw-duration" style={{ color: '#38bdf8' }}>
              📄 {material.type === 'Class Notes' ? 'PDF Note' : 'Document'}
            </span>
          </div>
          
          <h3 className="pw-card-title">{material.description || 'No description provided'}</h3>
          
          <div className="pw-card-actions" style={{ position: 'relative' }}>
            <svg onClick={(e) => { e.stopPropagation(); handleView(material); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" stroke="#6b7280" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="View Material"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            
            <svg onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === material.id ? null : material.id); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" stroke="#6b7280" fill="none" strokeWidth="2" title="More Options"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>

            {openMenuId === material.id && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, cursor: 'default' }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}></div>
                <div className="pw-dropdown-menu" style={{ zIndex: 50 }}>
                  <div className="pw-dropdown-item" onClick={(e) => { e.stopPropagation(); toggleBookmark(material.id); setOpenMenuId(null); }}>
                    {bookmarkedIds.includes(material.id) ? '★ Remove Bookmark' : '☆ Bookmark'}
                  </div>
                  <div className="pw-dropdown-item" onClick={(e) => { e.stopPropagation(); alert('Download feature coming soon in My Downloads!'); setOpenMenuId(null); }}>
                    ↓ Download
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  })
) : (
  <div className="student-material-empty">
    <p>No {activeFilter} uploaded yet.</p>
  </div>
)}
                  </div>
                </>
) : (
                <>
                  <h3 className="student-section__title">
                    My Subjects{" "}
                    {selectedSemester != null && (
                      <span className="student-section__badge">
                        Semester {selectedSemester}
                      </span>
                    )}
                  </h3>
                  <div className="student-subject-filters-row">
                    <div className="student-semester-filters">
                      <span className="student-filter-label">Semester:</span>
                      {availableSemesters.map((sem) => {
                        const isLive = sem === liveSemester;
                        return (
                          <button
                            key={sem}
                            className={`student-filter-pill ${selectedSemester === sem ? "student-filter-pill--active" : ""} ${isLive ? "student-semester-filter--live" : ""}`}
                            onClick={() => setSelectedSemester(sem)}
                          >
                            <span>Semester {sem}</span>
                            {isLive && <span className="student-semester-live-badge">LIVE</span>}
                          </button>
                        );
                      })}
                    </div>
                    <div className="student-type-filters">
                      {THEORY_PRACTICAL_FILTERS.map((f) => (
                        <button
                          key={f}
                          className={`student-filter-pill student-type-filter ${activeFilter === f ? `student-filter-pill--active ${activeFilter === 'Extra' ? 'student-type-filter--extra-active' : 'student-type-filter--active'}` : ""}`}
                          onClick={() => setActiveFilter(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  {gridSubjects.length === 0 ? (
                    <div className="student-empty-box">
                      <svg
                        width="44"
                        height="44"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      >
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                      <p>No subjects assigned for your semester yet.</p>
                    </div>
                    ) : (
                      <div className="subjects-grid">
                        {gridSubjects.filter(sub => {
                          if (activeFilter === 'All') return true;
                          const type = sub.type?.toLowerCase() || '';
                          const name = sub.name?.toLowerCase() || '';
                          if (activeFilter === 'Theory') return type !== 'practical' && !name.includes('lab');
                          if (activeFilter === 'Practical') return type === 'practical' || name.includes('lab');
                          return true;
                        }).map((subject) => (
                          <div
                            key={subject.id}
                            className="subject-card"
                            onClick={() => setSelectedSubject(subject)}
                          >
                            <div>
                              <h4>
                                {subject.subject_name || subject.name || subject.title || "Unnamed Subject"}
                              </h4>
                              <div className="premium-card-meta">
                                <span className="premium-card-code">
                                  {subject.subject_code || subject.code || "No Code"}
                                </span>
                                <span className="premium-card-credits">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 8 16" />
                                  </svg>
                                  Credit {subject.credits || subject.credit_hours || 'N/A'}
                                </span>
                              </div>
                            </div>

                            <div className="premium-card-faculty">
                              <img
                                src={subject.faculty?.avatar_url || subject.faculty?.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(subject.faculty?.full_name || subject.faculty_name || 'Teacher')}&background=2d2d3f&color=8b5cf6`}
                                alt="Faculty"
                              />
                              <span>
                                {subject.faculty?.full_name || subject.faculty_name || 'Faculty TBA'}
                              </span>
                            </div>

                            {subject.is_live && (
                              <span className="premium-live-badge">
                                LIVE
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                </>
              )}
            </section>
          )}

          {activeTab === "library" && (
            <section className="student-section student-section--library">
              <div className="student-lib-header-row">
                <h3 className="student-section__title">Mega Library</h3>
              </div>
              <div className="student-lib-search-wrap">
                <span className="student-lib-search-icon">
                  <IconSearch />
                </span>
                <input
                  type="text"
                  className="student-lib-search-input"
                  placeholder="Search resources, books, notes..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                />
              </div>
              <div className="student-lib-filter-row">{libraryPills}</div>
              <div className="student-materials-list">
                {filteredLibraryItems.length > 0
                  ? libraryCards
                  : libraryEmptyState}
              </div>
            </section>
          )}

          {activeTab === "bookmarks" && (
            <section className="student-section">
              <h3 className="student-section__title">
                Your Bookmarks{" "}
                {bookmarkedIds.length > 0 && (
                  <span className="student-section__badge">
                    {bookmarkedIds.length} saved
                  </span>
                )}
              </h3>
              <div className="student-material-filters">
                {dynamicCategories.map((cat) => (
                  <button
                    key={cat}
                    className={`student-filter-pill ${bookmarkFilter === cat ? "student-filter-pill--active" : ""}`}
                    onClick={() => setBookmarkFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {bookmarkedIds.length === 0 ? (
                <div className="student-material-empty">
                  <p>
                    No materials bookmarked yet. Explore My Subjects or Mega
                    Library to save resources.
                  </p>
                </div>
              ) : (
                (() => {
                  const filteredBookmarks = allMaterials
                    .filter((m) => bookmarkedIds.includes(m.id))
                    .filter((m) => {
                      if (bookmarkFilter === "All") return true;
                      const type = (m.type || m.category || "").toLowerCase();
                      const filterLower = bookmarkFilter.toLowerCase();
                      return type === filterLower || type.includes(filterLower);
                    });

                  if (filteredBookmarks.length === 0) {
                    return (
                      <div className="student-material-empty">
                        <p>No materials found for this filter.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="student-materials-list">
                      {filteredBookmarks.map((material) => {
                        const isLecture = (material.type || '').toLowerCase() === 'lecture';
                        if (isLecture) {
                          const matchedSubject = gridSubjects?.find(s => s.id === material.subject_id) || {};
                          const facultyFullName = material.faculty_name || matchedSubject?.faculty?.full_name || 'Susheela Verma';
                          const shortFacultyName = facultyFullName.length > 15 ? facultyFullName.split(' ')[0] : facultyFullName;
                          const avatarUrl = material.faculty_avatar || matchedSubject?.faculty?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(facultyFullName)}&background=1e1e2d&color=fff`;

                          return (
                            <div key={material.id} className="pw-lecture-card">
                              {/* Top Gradient Section */}
                              <div className="pw-card-top">
                                <div className="pw-card-top-left">
                                  <span className="pw-subject-badge">{material.subject_name || matchedSubject?.subject_name || "Lecture"}</span>
                                  <div className="pw-subject-line"></div>
                                  <p className="pw-card-desc" title={material.title}>{material.title || 'Untitled Lecture'}</p>
                                  <span className="pw-teacher-name" title={facultyFullName}>By {shortFacultyName}</span>
                                </div>
                                <div className="pw-card-top-right">
                                  <div className="pw-avatar-container" onClick={() => handleView && handleView(material)}>
                                    <img src={avatarUrl} alt="Faculty" />
                                    <div className="pw-play-btn">
                                      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Bottom White Section */}
                              <div className="pw-card-bottom">
                                <div className="pw-card-meta">
                                  <span className="pw-date">
                                    {new Date(material.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                  <span className="pw-duration">
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    {material.duration || '00:00'}
                                  </span>
                                </div>
                                
                                <h3 className="pw-card-title">{material.description || 'No description provided'}</h3>
                                
                                <div className="pw-card-actions" style={{ position: 'relative' }}>
                                  <svg onClick={(e) => { e.stopPropagation(); handleView && handleView(material); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" stroke="#6b7280" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="View Material"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path></svg>
                                  
                                  <svg onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === material.id ? null : material.id); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" stroke="#6b7280" fill="none" strokeWidth="2" title="More Options"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>

                                  {/* Dropdown Menu & Invisible Click-Outside Overlay */}
                                  {openMenuId === material.id && (
                                    <>
                                      <div 
                                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, cursor: 'default' }}
                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                                      ></div>
                                      
                                      <div className="pw-dropdown-menu" style={{ zIndex: 50 }}>
                                        <div 
                                          className="pw-dropdown-item"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if(typeof toggleBookmark === 'function') toggleBookmark(material.id);
                                            setOpenMenuId(null);
                                          }}
                                        >
                                          {bookmarkedIds.includes(material.id) ? '★ Remove Bookmark' : '☆ Bookmark'}
                                        </div>
                                        <div 
                                          className="pw-dropdown-item"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            alert('Download feature coming soon!');
                                            setOpenMenuId(null);
                                          }}
                                        >
                                          ↓ Download
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        const facultyFullName = material.faculty_name || gridSubjects?.find(s => s.id === material.subject_id)?.faculty?.full_name || 'Susheela Verma';
                        const shortFacultyName = facultyFullName.length > 15 ? facultyFullName.split(' ')[0] : facultyFullName;
                        const avatarUrl = material.faculty_avatar || gridSubjects?.find(s => s.id === material.subject_id)?.faculty?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(facultyFullName)}&background=1e1e2d&color=fff`;

                        return (
                          <div key={material.id} className="pw-lecture-card" onClick={() => handleView(material)}>
                            <div className="pw-card-top">
                              <div className="pw-card-top-left">
                                <span className="pw-subject-badge" style={{ color: '#38bdf8' }}>{material.type ? material.type.toUpperCase() : "DOCUMENT"}</span>
                                <div className="pw-subject-line" style={{ background: '#38bdf8' }}></div>
                                <p className="pw-card-desc" title={material.title}>{material.title || material.name || 'Untitled Document'}</p>
                                <span className="pw-teacher-name" title={facultyFullName}>By {shortFacultyName}</span>
                              </div>
                              <div className="pw-card-top-right">
                                <div className="pw-avatar-container">
                                  <img src={avatarUrl} alt="Faculty" />
                                  <div className="pw-play-btn" style={{ background: '#0284c7' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="pw-card-bottom">
                              <div className="pw-card-meta">
                                <span className="pw-date">
                                  {new Date(material.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                <span className="pw-duration" style={{ color: '#38bdf8' }}>
                                  📄 {material.type === 'Class Notes' ? 'PDF Note' : 'Document'}
                                </span>
                              </div>
                              
                              <h3 className="pw-card-title">{material.description || 'No description provided'}</h3>
                              
                              <div className="pw-card-actions" style={{ position: 'relative' }}>
                                <svg onClick={(e) => { e.stopPropagation(); handleView(material); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" stroke="#6b7280" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title="View Material"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                                
                                <svg onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === material.id ? null : material.id); }} className="pw-action-icon" viewBox="0 0 24 24" width="22" height="22" stroke="#6b7280" fill="none" strokeWidth="2" title="More Options"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>

                                {openMenuId === material.id && (
                                  <>
                                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, cursor: 'default' }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}></div>
                                    <div className="pw-dropdown-menu" style={{ zIndex: 50 }}>
                                      <div className="pw-dropdown-item" onClick={(e) => { e.stopPropagation(); toggleBookmark(material.id); setOpenMenuId(null); }}>
                                        {bookmarkedIds.includes(material.id) ? '★ Remove Bookmark' : '☆ Bookmark'}
                                      </div>
                                      <div className="pw-dropdown-item" onClick={(e) => { e.stopPropagation(); alert('Download feature coming soon!'); setOpenMenuId(null); }}>
                                        ↓ Download
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </section>
          )}

          {activeTab === "announcements" && (
            <section className="student-section student-section--grow">
              <h3 className="student-section__title">All Announcements</h3>
              {announcements.length === 0 ? (
                <div className="student-empty-box">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <p>No announcements yet.</p>
                </div>
              ) : (
                <div className="student-announcements">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} style={{ backgroundColor: 'rgba(31, 41, 55, 0.4)', border: '1px solid rgba(55, 65, 81, 0.5)', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
  
  {/* TOP: Title on Left, Badge & Date on Right */}
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#ffffff', margin: 0, textAlign: 'left' }}>
      {announcement.title}
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <span style={{ padding: '4px 12px', backgroundColor: 'rgba(55, 65, 81, 0.5)', color: '#60a5fa', fontSize: '0.75rem', fontWeight: '600', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {announcement.type}
      </span>
      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
        {new Date(announcement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </span>
    </div>
  </div>

  {/* MIDDLE: Left-aligned content */}
  <p style={{ color: '#d1d5db', fontSize: '0.875rem', textAlign: 'left', marginBottom: '24px', whiteSpace: 'pre-wrap', marginTop: 0 }}>
    {announcement.content}
  </p>

  {/* BOTTOM: View Button */}
  {(announcement.file_url || announcement.link) && (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <a
        href={announcement.file_url || announcement.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'rgba(30, 58, 138, 0.4)', color: '#bfdbfe', fontSize: '0.875rem', fontWeight: '500', borderRadius: '9999px', textDecoration: 'none' }}
      >
        <span style={{ fontSize: '1rem' }}>🔗</span> View
      </a>
    </div>
  )}
</div>
                   ))}
                 </div>
               )}
             </section>
           )}

             {activeTab === "attendance" && (
               <Attendance
                 overall={attendanceStats}
                 subjects={attendanceSubjects}
                 records={attendanceRecords}
                 loading={isLoading && attendanceRecords.length === 0}
                 studentRoll={studentProfile?.roll_number || profile?.roll_number}
                 studentData={studentProfile}
                 section={
                   studentProfile?.section ||
                   studentProfile?.batch ||
                   studentProfile?.selected_section ||
                   studentProfile?.batches?.section ||
                   null
                 }
                 globalAcademicTotal={globalAcademicTotal}
               />
             )}

            {activeTab === "results" && <StudentResults />}
          </div>
       </main>

      {toast && (
        <div
          style={{
            position: "fixed",
            top: "1.5rem",
            right: "1.5rem",
            zIndex: 999999,
            background: toast.type === "success"
              ? "rgba(22, 101, 52, 0.95)"
              : "rgba(127, 29, 29, 0.95)",
            border: `1px solid ${toast.type === "success" ? "#22c55e" : "#ef4444"}`,
            borderLeft: toast.type === "success" ? "4px solid #22c55e" : "4px solid #ef4444",
            color: "#fff",
            padding: "0.9rem 1.25rem",
            borderRadius: "12px",
            fontSize: "0.9rem",
            fontWeight: "600",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
            animation: "toast-slide-in 0.3s ease",
            maxWidth: "360px",
          }}
        >
          {toast.message}
        </div>
      )}

      {isProfileModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999997,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(6px)",
            animation: "upload-modal-fade-in 0.2s ease",
          }}
          onClick={() => closeProfileModal()}
        >
          <div
            style={{
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "20px",
              padding: "2rem",
              maxWidth: "460px",
              width: "92%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              color: "#e2e8f0",
              fontFamily: "inherit",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700", color: "#f1f5f9" }}>
                Edit Profile
              </h3>
              <button
                onClick={() => closeProfileModal()}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#cbd5e1",
                  cursor: "pointer",
                  padding: "0.35rem 0.6rem",
                  fontSize: "0.8rem",
                  fontFamily: "inherit",
                }}
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", background: "rgba(255,255,255,0.04)", padding: "0.35rem", borderRadius: "12px" }}>
              <button
                onClick={() => setActiveProfileTab("general")}
                style={{
                  flex: 1,
                  padding: "0.55rem",
                  borderRadius: "10px",
                  border: "none",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  background: activeProfileTab === "general" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
                  color: activeProfileTab === "general" ? "#fff" : "#94a3b8",
                  transition: "all 0.2s ease",
                }}
              >
                General Details
              </button>
              <button
                onClick={() => setActiveProfileTab("security")}
                style={{
                  flex: 1,
                  padding: "0.55rem",
                  borderRadius: "10px",
                  border: "none",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  background: activeProfileTab === "security" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
                  color: activeProfileTab === "security" ? "#fff" : "#94a3b8",
                  transition: "all 0.2s ease",
                }}
              >
                Security
              </button>
            </div>

            {activeProfileTab === "general" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Avatar Upload */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ position: "relative", width: "96px", height: "96px", borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(99,102,241,0.3)", background: "rgba(20,20,40,0.6)" }}>
                    {editAvatarPreview || studentProfile?.avatar_url ? (
                      <img
                        src={editAvatarPreview || studentProfile?.avatar_url}
                        alt="Avatar preview"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#6366f1" }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "10px",
                      background: "rgba(99,102,241,0.15)",
                      border: "1px dashed rgba(99,102,241,0.4)",
                      color: "#a5b4fc",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {editAvatarFile ? editAvatarFile.name : "Choose Avatar Image"}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setEditAvatarFile(file);
                        if (editAvatarPreviewRef.current) URL.revokeObjectURL(editAvatarPreviewRef.current);
                        const url = URL.createObjectURL(file);
                        editAvatarPreviewRef.current = url;
                        setEditAvatarPreview(url);
                      }
                    }}
                  />
                </div>

                {/* Phone */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: "600", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Enter phone number"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(20,20,40,0.5)",
                      color: "#f1f5f9",
                      fontSize: "0.9rem",
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Read-only fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Roll Number</span>
                    <input
                      type="text"
                      value={studentProfile?.roll_number || profile?.roll_number || "—"}
                      disabled
                      style={{
                        width: "60%",
                        padding: "0.4rem 0.6rem",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(255,255,255,0.03)",
                        color: "#64748b",
                        fontSize: "0.85rem",
                        fontFamily: "'JetBrains Mono', monospace",
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>College ID</span>
                    <input
                      type="text"
                      value={studentProfile?.college_id || profile?.college_id || "—"}
                      disabled
                      style={{
                        width: "60%",
                        padding: "0.4rem 0.6rem",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(255,255,255,0.03)",
                        color: "#64748b",
                        fontSize: "0.85rem",
                        fontFamily: "'JetBrains Mono', monospace",
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setProfileSaving(true);
                    try {
                      if (!user) throw new Error("No user found");
                      let avatarUrl = studentProfile?.avatar_url || profile?.avatar_url;

                      if (editAvatarFile) {
                         const filePath = `${user.id}/${Date.now()}-${editAvatarFile.name}`;
                        const { error: uploadError } = await supabase.storage
                          .from("avatars")
                          .upload(filePath, editAvatarFile, { upsert: true });

                        if (uploadError) throw uploadError;

                        const { data: publicUrlData } = supabase.storage
                          .from("avatars")
                          .getPublicUrl(filePath);

                        avatarUrl = publicUrlData.publicUrl;
                      }

                      const updates = {
                        phone: editPhone,
                        ...(avatarUrl && avatarUrl !== (studentProfile?.avatar_url || profile?.avatar_url) ? { avatar_url: avatarUrl } : {}),
                      };

                      const { error: updateError } = await supabase
                        .from("user_profiles")
                        .update(updates)
                        .eq("id", user.id);

                      if (updateError) throw updateError;

                      setStudentProfile((prev) => ({ ...prev, ...updates }));
                      setProfile((prev) => ({ ...prev, ...updates }));
                      showToast("Profile updated successfully!");
                      closeProfileModal();
                      setEditAvatarFile(null);
                      setEditAvatarPreview("");
                    } catch (err) {
                      console.error("Profile update error:", err);
                      showToast(err.message || "Failed to update profile", "error");
                    } finally {
                      setProfileSaving(false);
                    }
                  }}
                  disabled={profileSaving}
                  style={{
                    width: "100%",
                    padding: "0.7rem",
                    borderRadius: "12px",
                    border: "none",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    cursor: profileSaving ? "not-allowed" : "pointer",
                    background: profileSaving
                      ? "rgba(99,102,241,0.4)"
                      : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color: "#fff",
                    fontFamily: "inherit",
                    opacity: profileSaving ? 0.7 : 1,
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)",
                  }}
                >
                  {profileSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}

            {activeProfileTab === "security" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: "600", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(20,20,40,0.5)",
                      color: "#f1f5f9",
                      fontSize: "0.9rem",
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: "600", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={editConfirmPassword}
                    onChange={(e) => setEditConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "10px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(20,20,40,0.5)",
                      color: "#f1f5f9",
                      fontSize: "0.9rem",
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                </div>

                <button
                  onClick={async () => {
                    if (!editNewPassword || !editConfirmPassword) {
                      showToast("Please fill in both password fields", "error");
                      return;
                    }
                    if (editNewPassword !== editConfirmPassword) {
                      showToast("Passwords do not match", "error");
                      return;
                    }
                    if (editNewPassword.length < 6) {
                      showToast("Password must be at least 6 characters", "error");
                      return;
                    }
                    setPasswordSaving(true);
                    try {
                      const { error } = await supabase.auth.updateUser({
                        password: editNewPassword,
                      });
                      if (error) throw error;
                      showToast("Password updated successfully!");
                      setEditNewPassword("");
                      setEditConfirmPassword("");
                    } catch (err) {
                      console.error("Password update error:", err);
                      showToast(err.message || "Failed to update password", "error");
                    } finally {
                      setPasswordSaving(false);
                    }
                  }}
                  disabled={passwordSaving}
                  style={{
                    width: "100%",
                    padding: "0.7rem",
                    borderRadius: "12px",
                    border: "none",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    cursor: passwordSaving ? "not-allowed" : "pointer",
                    background: passwordSaving
                      ? "rgba(99,102,241,0.4)"
                      : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color: "#fff",
                    fontFamily: "inherit",
                    opacity: passwordSaving ? 0.7 : 1,
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)",
                  }}
                >
                  {passwordSaving ? "Updating..." : "Change Password"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteTargetId !== null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(6px)",
            animation: "upload-modal-fade-in 0.2s ease",
          }}
          onClick={() => setDeleteTargetId(null)}
        >
          <div
            style={{
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "20px",
              padding: "2rem",
              maxWidth: "420px",
              width: "90%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                margin: "0 0 0.5rem",
                fontSize: "1.2rem",
                fontWeight: "700",
                color: "#fca5a5",
              }}
            >
              Are you sure you want to delete?
            </h3>
            <p
              style={{
                margin: "0 0 1.75rem",
                fontSize: "0.9rem",
                color: "#94a3b8",
              }}
            >
              This action cannot be undone.
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => setDeleteTargetId(null)}
                style={{
                  padding: "0.65rem 1.5rem",
                  borderRadius: "12px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#cbd5e1",
                  fontFamily: "inherit",
                  transition: "all 0.2s ease",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteLoading}
                style={{
                  padding: "0.65rem 1.5rem",
                  borderRadius: "12px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  cursor: deleteLoading ? "not-allowed" : "pointer",
                  border: "none",
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  color: "#fff",
                  fontFamily: "inherit",
                  opacity: deleteLoading ? 0.6 : 1,
                  boxShadow: "0 4px 14px rgba(239, 68, 68, 0.35)",
                  transition: "all 0.2s ease",
                }}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
