import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { ROUTES } from "../../config/constants.js";
import {
  Upload,
  UploadCloud,
  Link as LinkIcon,
  FileText,
  ChevronLeft,
  Eye,
} from "lucide-react";
import { uploadNewResource } from "../../services/resourceService.js";
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
    id: "bookmarks",
    label: "🔖 Bookmarks",
    icon: <IconBookmark filled={false} />,
  },
  {
    id: "announcements",
    label: "📢 Announcements",
    icon: <IconAnnouncement />,
  },
];

const UPLOAD_TYPES = ["Notes", "Lectures", "Assignments", "PYQs", "Syllabus"];

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

const THEORY_PRACTICAL_FILTERS = ["All", "Theory", "Practical"];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
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

  useEffect(() => {
    bookmarkedIdsRef.current = bookmarkedIds;
  }, [bookmarkedIds]);

  // CR FEATURE
  const [isCR, setIsCR] = useState(false);

  // UPLOAD TAB STATES
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccessUI, setUploadSuccessUI] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    subject_id: "",
    type: "Notes",
    uploadMethod: "file",
    file: null,
    url: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadStudentData() {
      setIsLoading(true);

      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!cancelled) setUser(authUser);
        if (!authUser) return;

        const { data: crData } = await supabase
          .from("cr_students")
          .select("user_id")
          .eq("user_id", authUser.id)
          .eq("is_active", true)
          .maybeSingle();

        if (!cancelled) setIsCR(!!crData);

        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("*, batches(*)")
          .eq("id", authUser.id)
          .single();

        if (profileError) throw profileError;
        if (!cancelled) {
          setProfile(profileData);
          setStudentProfile(profileData);
        }

        const { data: bookmarkData, error: bookmarkError } = await supabase
          .from("bookmarks")
          .select("resource_id")
          .eq("user_id", authUser.id);
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

        const studentSemester = profileData?.batches?.semester;
        if (!cancelled) setSemester(studentSemester ?? null);

        const studentBranch = profileData?.selected_branch || profileData?.batches?.branch;
        const studentYear = profileData?.selected_year || profileData?.batches?.year;

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
        if (liveSem !== null && !cancelled) {
          setSelectedSemester(liveSem);
        }

        const visibleSemesters = profileData.selected_year === '2nd Year'
          ? [3, 4]
          : (yearSemesterMap[profileData.selected_year] || []);

        if (!cancelled) {
          setAvailableSemesters(visibleSemesters);
        }
      } catch (err) {
        console.error("Failed to load student dashboard data:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadStudentData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "upload") {
      setSelectedSubject(null);
      setUploadSuccessUI(false);
    }
    setActiveFilter("All");
    setLibrarySearch("");
    setLibraryFilter("All");
    setBookmarkFilter("All");
  }, [activeTab]);

  useEffect(() => {
    if (profile && profile.selected_branch) {
      fetchSubjectsForGrid(profile);
    }
  }, [profile, selectedSemester]);

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

  async function fetchSubjectsForGrid(profileData) {
    if (!profileData?.selected_branch || selectedSemester === null) {
      setGridSubjects([]);
      return;
    }
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*, faculty:faculty_id(id, full_name, avatar_url, profile_image_url)')
      .eq('department', profileData.selected_branch)
      .eq('semester', `Semester ${selectedSemester}`);
    if (subjectsError) console.error("Error fetching subjects:", subjectsError);
    setGridSubjects(subjects || []);
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

  const handleViewFile = (url) => {
    if (!url) return alert("No file link available.");

    if (url.startsWith("local:") || !url.includes(".")) {
      return alert(
        `This is a local file placeholder: ${url.replace("local:", "")}\n\nNote: To view actual uploaded PDF/Doc files, we need to configure Supabase Storage Buckets. For now, Google Drive links will work perfectly!`,
      );
    }

    try {
      const finalUrl = url.startsWith("http") ? url : `https://${url}`;
      window.open(finalUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      alert("Invalid link format.");
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
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    } catch {
      // ignore sign-out network errors
    }
    navigate(ROUTES.LOGIN, { replace: true });
  }

  // --- UPLOAD LOGIC ---
  const handleUploadChange = (e) => {
    const { name, value, files } = e.target;
    setUploadForm((prev) => ({ ...prev, [name]: files ? files[0] : value }));
  };

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
        title: uploadForm.title, // Title ko wapas normal kar diya
        subject_id: uploadForm.subject_id,
        type: uploadForm.type,
        file_url: uploadForm.uploadMethod === "link" ? uploadForm.url : null,
        // 👇 YAHAN HAI ASLI MAGIC! Hum tera User ID bhej rahe hain 👇
        uploaded_by: user.id,
      };

      const fileToUpload =
        uploadForm.uploadMethod === "file" ? uploadForm.file : null;

      await uploadNewResource(payload, fileToUpload);

      const updatedMaterials = await fetchAllMaterials();
      if (updatedMaterials.length > 0) {
        setAllMaterials(updatedMaterials);
      }

      setUploadSuccessUI(true);

      setTimeout(() => {
        setUploadForm({
          title: "",
          description: "",
          subject_id: "",
          type: "Notes",
          uploadMethod: "file",
          file: null,
          url: "",
        });
        setUploadSuccessUI(false);
        setActiveTab("subjects");
      }, 2500);
    } catch (error) {
      console.error("Upload Error Details:", error);
      alert(`UPLOAD FAILED ERROR:\n\n${error.message}`);
    } finally {
      setUploadLoading(false);
    }
  };
  // ------------------------

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
    const iconType =
      item.iconType ||
      (item.type === "PYQ"
        ? "pyqs"
        : item.type === "Syllabus"
          ? "syllabus"
          : item.type === "Notes"
            ? "notes"
            : item.type === "Tutorial"
              ? "cheatsheet"
              : item.type === "Assignment"
                ? "notes"
                : "book");
    const badgeType = (item.category || item.type || "resource")
      .toLowerCase()
      .replace(/\s+/g, "-");
    return (
      <div key={item.id} className="student-material-card">
        <div className="student-material-card__left">
          {getLibIcon(iconType)}
        </div>
        <div className="student-material-card__center">
          <h4 className="student-material-card__title">
            {item.title}
          </h4>
          <span
            className={`student-material-card__badge student-material-card__badge--${badgeType}`}
          >
            {item.category || item.type || "Resource"}
          </span>
        </div>
        <div className="student-material-card__right">
          <button
            className="student-workspace__view-btn"
            onClick={() => handleViewFile(item.file_url)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View
          </button>
          <button
            className={`student-bookmark-btn ${bookmarkedIds.includes(item.id) ? "student-bookmark-btn--active" : ""}`}
            onClick={() => toggleBookmark(item.id)}
          >
            <IconBookmark filled={bookmarkedIds.includes(item.id)} />
          </button>
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

  if (isLoading) {
    return (
      <div className="student-dashboard-layout">
        <aside className="student-sidebar">
          <div className="student-sidebar__header">
            <h1 className="student-sidebar__brand">UCA</h1>
          </div>
          <nav className="student-sidebar__nav">
            {navItems.map(({ label }) => (
              <div
                key={label}
                className="student-sidebar__link skeleton-link"
              />
            ))}
          </nav>
        </aside>
        <main className="student-main">
          <header className="student-header">
            <div className="student-header__skeleton" />
          </header>
          <div className="student-content">
            <div className="student-skeleton-grid">
              <div className="student-skeleton-card student-skeleton-card--profile" />
            </div>
          </div>
        </main>
      </div>
    );
  }

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
                <span className="student-header__role">{displayRole}</span>
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
              <section className="student-section">
                <h3 className="student-section__title">Student Profile</h3>
                <div className="student-profile-card">
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

              <section className="student-section student-section--grow">
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

          {activeTab === "upload" && (
            <section className="student-section">
              <div
                style={{
                  maxWidth: "800px",
                  margin: "0 auto",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "24px",
                  }}
                >
                  <div>
                    <h3
                      className="student-section__title"
                      style={{ margin: 0, fontSize: "1.5rem" }}
                    >
                      Upload Study Material
                    </h3>
                    <p
                      style={{
                        color: "#94a3b8",
                        margin: "5px 0 0 0",
                        fontSize: "0.9rem",
                      }}
                    >
                      Share resources with your class
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("subjects")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      background: "#2d2d3f",
                      color: "#e2e8f0",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: "500",
                    }}
                  >
                    <ChevronLeft size={16} /> Cancel
                  </button>
                </div>

                <div
                  style={{
                    background: "#1e1e2d",
                    border: "1px solid #2d2d3f",
                    borderRadius: "16px",
                    padding: "32px",
                    boxSizing: "border-box",
                    position: "relative",
                  }}
                >
                  {uploadSuccessUI ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "40px 0",
                        animation: "fadeIn 0.5s",
                      }}
                    >
                      <div
                        style={{
                          background: "rgba(16, 185, 129, 0.15)",
                          padding: "24px",
                          borderRadius: "50%",
                          marginBottom: "24px",
                        }}
                      >
                        <svg
                          width="64"
                          height="64"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <h2
                        style={{
                          color: "white",
                          margin: "0 0 12px 0",
                          fontSize: "1.8rem",
                        }}
                      >
                        Upload Successful!
                      </h2>
                      <p
                        style={{
                          color: "#94a3b8",
                          margin: "0 0 20px 0",
                          fontSize: "1rem",
                        }}
                      >
                        Your material has been added to the library.
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          color: "#6366f1",
                          fontSize: "0.9rem",
                          fontWeight: "500",
                        }}
                      >
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
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                        </svg>
                        Redirecting to subjects...
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleUploadSubmit}>
                      <div
                        style={{
                          display: "flex",
                          gap: "24px",
                          marginBottom: "24px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            minWidth: "200px",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          <label
                            style={{
                              color: "#cbd5e1",
                              marginBottom: "8px",
                              fontSize: "0.9rem",
                              fontWeight: "500",
                            }}
                          >
                            Resource Title
                          </label>
                          <input
                            type="text"
                            name="title"
                            value={uploadForm.title}
                            onChange={handleUploadChange}
                            placeholder="e.g. OS Chapter 1 Notes"
                            required
                            style={{
                              boxSizing: "border-box",
                              background: "#13131a",
                              border: "1px solid #2d2d3f",
                              color: "white",
                              padding: "14px",
                              borderRadius: "10px",
                              width: "100%",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            flex: 1,
                            minWidth: "200px",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          <label
                            style={{
                              color: "#cbd5e1",
                              marginBottom: "8px",
                              fontSize: "0.9rem",
                              fontWeight: "500",
                            }}
                          >
                            Type
                          </label>
                          <select
                            name="type"
                            value={uploadForm.type}
                            onChange={handleUploadChange}
                            required
                            style={{
                              boxSizing: "border-box",
                              background: "#13131a",
                              border: "1px solid #2d2d3f",
                              color: "white",
                              padding: "14px",
                              borderRadius: "10px",
                              width: "100%",
                            }}
                          >
                            {UPLOAD_TYPES.map((t) => (
                              <option
                                key={t}
                                value={t}
                                style={{ background: "#1e1e2d" }}
                              >
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          marginBottom: "24px",
                        }}
                      >
                        <label
                          style={{
                            color: "#cbd5e1",
                            marginBottom: "8px",
                            fontSize: "0.9rem",
                            fontWeight: "500",
                          }}
                        >
                          Subject
                        </label>
                        <select
                          name="subject_id"
                          value={uploadForm.subject_id}
                          onChange={handleUploadChange}
                          required
                          style={{
                            boxSizing: "border-box",
                            background: "#13131a",
                            border: "1px solid #2d2d3f",
                            color: "white",
                            padding: "14px",
                            borderRadius: "10px",
                            width: "100%",
                          }}
                        >
                          <option value="" style={{ background: "#1e1e2d" }}>
                            -- Select Subject --
                          </option>
                          {gridSubjects.map((sub) => (
                            <option
                              key={sub.id}
                              value={sub.id}
                              style={{ background: "#1e1e2d" }}
                            >
                              {sub.name} ({sub.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          marginBottom: "32px",
                        }}
                      >
                        <label
                          style={{
                            color: "#cbd5e1",
                            marginBottom: "8px",
                            fontSize: "0.9rem",
                            fontWeight: "500",
                          }}
                        >
                          Description (Optional)
                        </label>
                        <textarea
                          name="description"
                          value={uploadForm.description}
                          onChange={handleUploadChange}
                          rows={3}
                          placeholder="Add details..."
                          style={{
                            boxSizing: "border-box",
                            background: "#13131a",
                            border: "1px solid #2d2d3f",
                            color: "white",
                            padding: "14px",
                            borderRadius: "10px",
                            resize: "vertical",
                            width: "100%",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          background: "#13131a",
                          border: "1px solid #2d2d3f",
                          borderRadius: "12px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            borderBottom: "1px solid #2d2d3f",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setUploadForm((p) => ({
                                ...p,
                                uploadMethod: "file",
                              }))
                            }
                            style={{
                              flex: 1,
                              padding: "16px",
                              background:
                                uploadForm.uploadMethod === "file"
                                  ? "rgba(139, 92, 246, 0.08)"
                                  : "transparent",
                              color:
                                uploadForm.uploadMethod === "file"
                                  ? "#8b5cf6"
                                  : "#94a3b8",
                              border: "none",
                              borderBottom:
                                uploadForm.uploadMethod === "file"
                                  ? "2px solid #8b5cf6"
                                  : "none",
                              cursor: "pointer",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              gap: "8px",
                              fontWeight: "500",
                              boxSizing: "border-box",
                            }}
                          >
                            <UploadCloud size={18} /> File
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setUploadForm((p) => ({
                                ...p,
                                uploadMethod: "link",
                              }))
                            }
                            style={{
                              flex: 1,
                              padding: "16px",
                              background:
                                uploadForm.uploadMethod === "link"
                                  ? "rgba(139, 92, 246, 0.08)"
                                  : "transparent",
                              color:
                                uploadForm.uploadMethod === "link"
                                  ? "#8b5cf6"
                                  : "#94a3b8",
                              border: "none",
                              borderBottom:
                                uploadForm.uploadMethod === "link"
                                  ? "2px solid #8b5cf6"
                                  : "none",
                              cursor: "pointer",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              gap: "8px",
                              fontWeight: "500",
                              boxSizing: "border-box",
                            }}
                          >
                            <LinkIcon size={18} /> Link
                          </button>
                        </div>

                        {uploadForm.uploadMethod === "file" ? (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              padding: "40px 20px",
                              textAlign: "center",
                              cursor: "pointer",
                              boxSizing: "border-box",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                            }}
                          >
                            <input
                              type="file"
                              ref={fileInputRef}
                              style={{ display: "none" }}
                              onChange={handleUploadChange}
                              name="file"
                            />
                            {uploadForm.file ? (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: "10px",
                                  wordBreak: "break-word",
                                  maxWidth: "100%",
                                }}
                              >
                                <FileText size={40} color="#10b981" />
                                <p
                                  style={{
                                    color: "white",
                                    margin: 0,
                                    fontWeight: "500",
                                    fontSize: "1rem",
                                    textAlign: "center",
                                  }}
                                >
                                  {uploadForm.file.name}
                                </p>
                                <p style={{ color: "#94a3b8", margin: 0 }}>
                                  {(uploadForm.file.size / 1024 / 1024).toFixed(
                                    2,
                                  )}{" "}
                                  MB
                                </p>
                              </div>
                            ) : (
                              <>
                                <UploadCloud
                                  size={40}
                                  color="#6366f1"
                                  style={{ marginBottom: "15px" }}
                                />
                                <p
                                  style={{
                                    color: "#cbd5e1",
                                    margin: "0 0 8px 0",
                                    fontSize: "1rem",
                                  }}
                                >
                                  Click to browse file
                                </p>
                                <p
                                  style={{
                                    color: "#64748b",
                                    margin: 0,
                                    fontSize: "0.85rem",
                                  }}
                                >
                                  PDF, DOCX, PPTX
                                </p>
                              </>
                            )}
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: "24px",
                              position: "relative",
                              boxSizing: "border-box",
                            }}
                          >
                            <LinkIcon
                              size={20}
                              style={{
                                position: "absolute",
                                left: "40px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#94a3b8",
                              }}
                            />
                            <input
                              type="url"
                              name="url"
                              value={uploadForm.url}
                              onChange={handleUploadChange}
                              placeholder="Paste Drive/YouTube link..."
                              style={{
                                width: "100%",
                                boxSizing: "border-box",
                                background: "#1e1e2d",
                                border: "1px dashed #475569",
                                color: "white",
                                padding: "16px 16px 16px 45px",
                                borderRadius: "8px",
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          marginTop: "30px",
                          paddingTop: "24px",
                          borderTop: "1px solid #2d2d3f",
                        }}
                      >
                        <button
                          type="submit"
                          disabled={uploadLoading}
                          style={{
                            background:
                              "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            color: "white",
                            padding: "12px 24px",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: "600",
                            cursor: uploadLoading ? "not-allowed" : "pointer",
                            opacity: uploadLoading ? 0.5 : 1,
                          }}
                        >
                          {uploadLoading ? "Uploading..." : "Publish Material"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
</section>
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
                    {isCR && (
                      <button
                        onClick={() => setActiveTab("upload")}
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
                      getFilteredMaterials().map((material) => (
                        <div
                          key={material.id}
                          className="student-material-card"
                        >
                          <div className="student-material-card__left">
                            {material.file_type === "pdf" ||
                            material.type === "PYQ" ||
                            material.type === "Syllabus" ? (
                              <IconPDF />
                            ) : (
                              <IconLink />
                            )}
                          </div>
                          <div className="student-material-card__center">
                            <h4 className="student-material-card__title">
                              {material.title || material.name || "Untitled"}
                            </h4>
                            <span
                              className={`student-material-card__badge student-material-card__badge--${(material.type || material.category || "resource").toLowerCase().replace(/\s+/g, "-")}`}
                            >
                              {material.type || material.category || "Resource"}
                            </span>
                          </div>
                          <div className="student-material-card__right">
                            <button
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 16px",
                                marginRight: "15px",
                                background: "#3b82f6",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "14px",
                                transition: "0.2s",
                              }}
                              onClick={() => handleViewFile(material.file_url)}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>{" "}
                              View
                            </button>
                            <button
                              className={`student-bookmark-btn ${bookmarkedIds.includes(material.id) ? "student-bookmark-btn--active" : ""}`}
                              onClick={() => toggleBookmark(material.id)}
                            >
                              <IconBookmark
                                filled={bookmarkedIds.includes(material.id)}
                              />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="student-material-empty">
                        <p>
                          No {activeFilter} uploaded for{" "}
                          {selectedSubject.subject_name ||
                            selectedSubject.name ||
                            selectedSubject.title ||
                            "this subject"}{" "}
                          yet.
                        </p>
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
                          className={`student-filter-pill student-type-filter ${activeFilter === f ? "student-filter-pill--active student-type-filter--active" : ""}`}
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
                    <div className="student-subjects-grid">
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
                          className="student-subject-card"
                          onClick={() => setSelectedSubject(subject)}
                        >
                          <h4 style={{ margin: 0, marginBottom: '8px', paddingLeft: '4px', fontSize: '1.25rem', fontWeight: '650', color: '#ffffff', letterSpacing: '-0.01em', lineHeight: '1.3' }}>
                            {subject.subject_name ||
                              subject.name ||
                              subject.title ||
                              "Unnamed Subject"}
                          </h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '4px' }}>
                            <span style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: '600', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}>
                              {subject.subject_code || subject.code || "No Code"}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#4ade80', fontWeight: '500' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 8 16" />
                              </svg>
                              {subject.credits || subject.credit_hours || 'N/A'} Credits
                            </span>
                          </div>
                          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(74, 222, 128, 0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={subject.faculty?.avatar_url || subject.faculty?.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(subject.faculty?.full_name || subject.faculty_name || 'Teacher')}&background=2d2d3f&color=8b5cf6`}
                              alt="Faculty"
                              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(34, 197, 94, 0.4)' }}
                            />
                            <span style={{ fontSize: '0.92rem', color: '#e2e8f0', fontWeight: '500', lineHeight: '1.4' }}>
                              {subject.faculty?.full_name || subject.faculty_name || 'Faculty TBA'}
                            </span>
                          </div>
                          {subject.is_live && (
                            <span style={{ position: 'absolute', top: '12px', right: '12px', background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: '700', padding: '4px 10px', borderRadius: '999px', letterSpacing: '0.05em' }}>
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
                        return (
                          <div
                            key={material.id}
                            className="student-material-card"
                          >
                            <div className="student-material-card__left">
                              {material.file_type === "pdf" ||
                              material.type === "PYQ" ||
                              material.type === "Syllabus" ? (
                                <IconPDF />
                              ) : (
                                <IconLink />
                              )}
                            </div>
                            <div className="student-material-card__center">
                              <h4 className="student-material-card__title">
                                {material.title || material.name || "Untitled"}
                              </h4>
                              {(material.subjects?.code ||
                                material.subject_code) && (
                                <span
                                  style={{
                                    fontSize: "0.72rem",
                                    color: "#8b5cf6",
                                    fontWeight: "600",
                                    letterSpacing: "0.03em",
                                  }}
                                >
                                  {material.subjects?.code ||
                                    material.subject_code}
                                </span>
                              )}
                              <span
                                className={`student-material-card__badge student-material-card__badge--${(material.type || material.category || "resource").toLowerCase().replace(/\s+/g, "-")}`}
                              >
                                {material.type ||
                                  material.category ||
                                  "Resource"}
                              </span>
                            </div>
                            <div className="student-material-card__right">
                              <button
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  padding: "8px 16px",
                                  marginRight: "15px",
                                  background: "#3b82f6",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                  fontWeight: "bold",
                                  fontSize: "14px",
                                  transition: "0.2s",
                                }}
                                onClick={() =>
                                  handleViewFile(material.file_url)
                                }
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>{" "}
                                View
                              </button>
                              <button
                                className={`student-bookmark-btn ${bookmarkedIds.includes(material.id) ? "student-bookmark-btn--active" : ""}`}
                                onClick={() => toggleBookmark(material.id)}
                              >
                                <IconBookmark
                                  filled={bookmarkedIds.includes(material.id)}
                                />
                              </button>
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
        </div>
      </main>
    </div>
  );
}
