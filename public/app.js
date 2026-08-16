const app = document.querySelector("#app");
const storageKey = "cwa_admin_token";
const sidebarScrollStorageKey = "cwa_admin_sidebar_scroll_top";

const readStoredSidebarScrollTop = () => {
  try {
    const value = Number(sessionStorage.getItem(sidebarScrollStorageKey) || 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
};

const state = {
  admin: null,
  token: localStorage.getItem(storageKey),
  view: "dashboard",
  sidebarScrollTop: readStoredSidebarScrollTop(),
  entitySearches: {},
  entityFilters: {},
  highlightRecord: null,
  accountMenuOpen: false,
  accountLogoutLoading: false,
  actionBusyKey: "",
  returnFocusToAccountButton: false,
  globalSearch: {
    query: "",
    status: "idle",
    isOpen: false,
    results: [],
    activeIndex: -1,
    error: "",
    focusInput: false,
  },
  workspaceTools: {
    status: "idle",
    error: "",
  },
  stats: null,
  analytics: null,
  settings: null,
  data: {},
  selectedIds: new Set(),
  auditSearch: "",
  auditType: "Admin.Login",
  auditPage: 1,
  auditLimit: 10,
  auditLoading: false,
  auditLoadingDirection: "",
  auditError: "",
  auditVisiblePage: 1,
  auditLoadedGroups: {},
  auditScrollTargetId: "",
  auditPagination: {
    page: 1,
    limit: 10,
    totalRecords: 0,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false,
    from: 0,
    to: 0,
  },
  settingsDraft: null,
  settingsSaveStatus: "",
  analyticsFilters: {
    userGrowthDays: 7,
    analyticsRange: 30,
    calendarMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    selectedCalendarDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
  },
  loading: false,
  message: "",
  error: "",
};

const animatedCountKeys = new Set();

const getSidebarElement = () => document.querySelector(".sidebar");

const persistSidebarScrollTop = (scrollTop) => {
  const safeScrollTop = Math.max(0, Math.round(Number(scrollTop) || 0));
  state.sidebarScrollTop = safeScrollTop;

  try {
    sessionStorage.setItem(sidebarScrollStorageKey, String(safeScrollTop));
  } catch {
    // Session storage can be unavailable in private or restricted contexts.
  }
};

const saveSidebarScrollPosition = () => {
  const sidebar = getSidebarElement();
  if (!sidebar) return;
  persistSidebarScrollTop(sidebar.scrollTop);
};

const restoreSidebarScrollPosition = () => {
  const sidebar = getSidebarElement();
  if (!sidebar) return;

  const applyScrollTop = () => {
    const maxScrollTop = Math.max(0, sidebar.scrollHeight - sidebar.clientHeight);
    sidebar.scrollTop = Math.min(state.sidebarScrollTop, maxScrollTop);
  };

  applyScrollTop();
  window.requestAnimationFrame?.(applyScrollTop);
};

const bindSidebarScrollPersistence = () => {
  const sidebar = getSidebarElement();
  if (!sidebar) return;

  sidebar.addEventListener("scroll", () => {
    persistSidebarScrollTop(sidebar.scrollTop);
  }, { passive: true });
};

const getRuntimeApiBaseUrl = () => {
  const configured = window.__CWA_ADMIN_CONFIG__?.apiBaseUrl;

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const { protocol, hostname, port } = window.location;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:3000/api`;
  }

  const normalizedHostname = hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  const appHostname = normalizedHostname.startsWith("admin.")
    ? normalizedHostname.slice("admin.".length)
    : normalizedHostname;
  const apiHostname = appHostname.startsWith("api.") ? appHostname : `api.${appHostname}`;
  const apiPort = port ? `:${port}` : "";

  return `${protocol}//${apiHostname}${apiPort}/api`;
};

const apiBaseUrl = getRuntimeApiBaseUrl();

const quizQuestionsExample = [
  {
    question: "What is the best first step when writing an AI prompt?",
    questionType: "single",
    options: ["Add clear context", "Use random words", "Hide the goal", "Skip examples"],
    correctAnswers: ["Add clear context"],
    marks: 1,
    explanation: "Clear context helps the model understand the task and produce a useful answer.",
  },
];

const navItems = [
  { key: "dashboard", label: "Dashboard", section: "Operate", icon: "home" },
  { key: "learning", label: "Learning", section: "Operate", icon: "monitor" },
  { key: "workspace", label: "AI Workspace", section: "Operate", icon: "bot" },
  { key: "users", label: "Users", section: "Admin", icon: "users" },
  { key: "admins", label: "Admins", section: "Admin", icon: "shield" },
  { key: "courses", label: "Courses", section: "Content", icon: "book-open" },
  { key: "modules", label: "Modules", section: "Content", icon: "layers" },
  { key: "lessons", label: "Lessons", section: "Content", icon: "play-square" },
  { key: "quizzes", label: "Quizzes", section: "Content", icon: "help-circle" },
  { key: "aiTools", label: "AI Tools", section: "Content", icon: "wand-2" },
  { key: "categories", label: "Categories", section: "Content", icon: "grid" },
  { key: "certificates", label: "Certificates", section: "Trust", icon: "award" },
  { key: "analytics", label: "Analytics", section: "Trust", icon: "bar-chart-3" },
  { key: "notifications", label: "Notifications", section: "Trust", icon: "bell" },
  { key: "settings", label: "Settings", section: "System", icon: "settings" },
  { key: "auditLogs", label: "Audit Logs", section: "System", icon: "file-text" },
  { key: "profile", label: "Profile", section: "System", icon: "user-circle" },
];

const entityConfigs = {
  users: {
    title: "Users",
    endpoint: "/admins/users",
    unwrap: (response) => response.data?.users || [],
    searchable: true,
    filters: [
      { name: "isActive", label: "Status", options: [["", "All"], ["true", "Active"], ["false", "Inactive"]] },
      { name: "isVerified", label: "Verification", options: [["", "All"], ["true", "Verified"], ["false", "Unverified"]] },
      { name: "isPremium", label: "Premium", options: [["", "All"], ["true", "Premium"], ["false", "Free"]] },
    ],
    columns: [
      { key: "fullName", label: "Name" },
      { key: "email", label: "Email" },
      { key: "isVerified", label: "Verified", type: "boolean" },
      { key: "isActive", label: "Active", type: "active" },
      { key: "isPremium", label: "Premium", type: "boolean" },
      { key: "lastLogin", label: "Entry Time", type: "date" },
      { key: "lastLoginDay", label: "Day" },
      { key: "lastLoginYear", label: "Year" },
      { key: "lastLoginIpAddress", label: "IP Address" },
      { key: "createdAt", label: "Created", type: "date" },
    ],
    fields: [
      { name: "fullName", label: "Full name", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Password", type: "password", createOnly: true, required: true },
      { name: "isVerified", label: "Verified", type: "checkbox" },
      { name: "isActive", label: "Active", type: "checkbox", defaultValue: true },
      { name: "isPremium", label: "Premium", type: "checkbox" },
    ],
    actions: ["view", "edit", "password", "premium", "status", "delete"],
    bulk: true,
  },
  admins: {
    title: "Admins",
    endpoint: "/admins",
    unwrap: (response) => response.data || [],
    columns: [
      { key: "fullName", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "isActive", label: "Active", type: "active" },
      { key: "lastLogin", label: "Last login", type: "date" },
    ],
    fields: [
      { name: "fullName", label: "Full name", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Password", type: "password", createOnly: true, required: true },
      { name: "role", label: "Role", type: "select", options: [["admin", "Admin"], ["superadmin", "Super admin"]] },
      { name: "isActive", label: "Active", type: "checkbox", defaultValue: true },
    ],
    actions: ["edit", "password", "status", "delete"],
  },
  courses: {
    title: "Courses",
    endpoint: "/auth/courses",
    unwrap: (response) => response.data || [],
    columns: [
      { key: "title", label: "Title" },
      { key: "level", label: "Level" },
      { key: "status", label: "Status", type: "status" },
      { key: "duration", label: "Minutes" },
      { key: "price", label: "Price", type: "money" },
      { key: "createdAt", label: "Created", type: "date" },
    ],
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "slug", label: "Slug", required: true },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "shortDescription", label: "Short description" },
      { name: "level", label: "Level", type: "select", options: [["beginner", "Beginner"], ["intermediate", "Intermediate"], ["advanced", "Advanced"]] },
      { name: "duration", label: "Duration minutes", type: "number", required: true },
      { name: "thumbnail", label: "Thumbnail URL" },
      { name: "price", label: "Price", type: "number" },
      { name: "isFree", label: "Free course", type: "checkbox", defaultValue: true },
      { name: "tags", label: "Tags", transform: "csv" },
      { name: "status", label: "Status", type: "select", options: [["draft", "Draft"], ["published", "Published"], ["archived", "Archived"]] },
    ],
    actions: ["edit", "publish", "archive", "duplicate", "delete"],
  },
  modules: {
    title: "Modules",
    endpoint: "/auth/modules",
    unwrap: (response) => response.data || [],
    columns: [
      { key: "title", label: "Title" },
      { key: "course.title", label: "Course" },
      { key: "order", label: "Order" },
      { key: "status", label: "Status", type: "status" },
      { key: "duration", label: "Minutes" },
    ],
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "slug", label: "Slug", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "course", label: "Course ID", required: true },
      { name: "order", label: "Order", type: "number", required: true },
      { name: "duration", label: "Duration minutes", type: "number" },
      { name: "status", label: "Status", type: "select", options: [["draft", "Draft"], ["published", "Published"], ["archived", "Archived"]] },
    ],
    actions: ["edit", "publish", "archive", "delete"],
  },
  lessons: {
    title: "Lessons",
    endpoint: "/auth/lessons",
    unwrap: (response) => response.data || [],
    columns: [
      { key: "title", label: "Title" },
      { key: "course.title", label: "Course" },
      { key: "module.title", label: "Module" },
      { key: "order", label: "Order" },
      { key: "status", label: "Status", type: "status" },
      { key: "isPreview", label: "Preview", type: "boolean" },
    ],
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "slug", label: "Slug", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "course", label: "Course ID", required: true },
      { name: "module", label: "Module ID" },
      { name: "content", label: "Text/code/AI lesson content", type: "textarea" },
      { name: "videoUrl", label: "Video URL" },
      { name: "resources", label: "Resource URLs", transform: "csv" },
      { name: "duration", label: "Duration minutes", type: "number" },
      { name: "order", label: "Order", type: "number", required: true },
      { name: "isPreview", label: "Preview lesson", type: "checkbox" },
      { name: "status", label: "Status", type: "select", options: [["draft", "Draft"], ["published", "Published"], ["archived", "Archived"]] },
    ],
    actions: ["edit", "publish", "archive", "delete"],
  },
  quizzes: {
    title: "Quizzes",
    endpoint: "/auth/quizzes",
    unwrap: (response) => response.data || [],
    filters: [
      { name: "status", label: "Status", options: [["", "All"], ["draft", "Draft"], ["published", "Published"], ["archived", "Archived"]] },
    ],
    columns: [
      { key: "title", label: "Title" },
      { key: "course.title", label: "Course" },
      { key: "module.title", label: "Module" },
      { key: "lesson.title", label: "Lesson" },
      { key: "questions", label: "Questions", type: "count" },
      { key: "totalMarks", label: "Marks" },
      { key: "passingMarks", label: "Pass" },
      { key: "status", label: "Status", type: "status" },
    ],
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "course", label: "Course ID", required: true },
      { name: "module", label: "Module ID" },
      { name: "lesson", label: "Lesson ID" },
      {
        name: "questions",
        label: "Questions, options, and correct answers JSON",
        type: "json",
        required: true,
        example: quizQuestionsExample,
        help: "Use an array. correctAnswers must match option text exactly. Supported questionType values: single, multiple, text.",
      },
      { name: "passingMarks", label: "Passing marks", type: "number" },
      { name: "timeLimit", label: "Time limit minutes", type: "number" },
      { name: "attemptsAllowed", label: "Attempts allowed", type: "number", defaultValue: 1 },
      { name: "status", label: "Status", type: "select", options: [["draft", "Draft"], ["published", "Published"], ["archived", "Archived"]] },
    ],
    actions: ["view", "edit", "publish", "archive", "delete"],
  },
  aiTools: {
    title: "AI Tools",
    endpoint: "/auth/aitools",
    unwrap: (response) => response.data || [],
    columns: [
      { key: "name", label: "Name" },
      { key: "flowType", label: "Flow" },
      { key: "pricingType", label: "Pricing" },
      { key: "status", label: "Status", type: "activeStatus" },
      { key: "isFeatured", label: "Featured", type: "boolean" },
    ],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "slug", label: "Slug", required: true },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "flowType", label: "Flow type", type: "select", options: [["ai-chat", "AI Chat"], ["ai-email-writer", "Email Writer"], ["ai-image-generator", "Image Generator"], ["ai-voice-generator", "Voice Generator"], ["ai-translator", "Translator"], ["ai-pdf-summarizer", "PDF Summarizer"], ["ai-code-generator", "Code Generator"]] },
      { name: "category", label: "Category ID" },
      { name: "tags", label: "Tags", transform: "csv" },
      { name: "logo", label: "Logo URL" },
      { name: "websiteUrl", label: "Website URL", required: true },
      { name: "apiEndpoint", label: "API endpoint" },
      { name: "pricingType", label: "Pricing", type: "select", options: [["free", "Free"], ["freemium", "Freemium"], ["paid", "Paid"]] },
      { name: "isFeatured", label: "Featured", type: "checkbox" },
      { name: "status", label: "Status", type: "select", options: [["active", "Active"], ["inactive", "Hidden"]] },
    ],
    actions: ["edit", "feature", "hide", "delete"],
  },
  categories: {
    title: "Categories",
    endpoint: "/auth/tool-categories",
    unwrap: (response) => response.data || [],
    columns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "order", label: "Order" },
      { key: "isActive", label: "Visible", type: "active" },
    ],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "slug", label: "Slug", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "icon", label: "Icon" },
      { name: "order", label: "Order", type: "number" },
      { name: "isActive", label: "Visible", type: "checkbox", defaultValue: true },
    ],
    actions: ["edit", "show", "delete"],
  },
  certificates: {
    title: "Certificates",
    endpoint: "/certificates",
    unwrap: (response) => response.data || [],
    columns: [
      { key: "certificateId", label: "Certificate ID" },
      { key: "recipientName", label: "Recipient" },
      { key: "user.email", label: "User" },
      { key: "courseName", label: "Course" },
      { key: "percentage", label: "Score" },
      { key: "status", label: "Status", type: "status" },
      { key: "issuedAt", label: "Issued", type: "date" },
    ],
    fields: [
      { name: "user", label: "User ID", required: true },
      { name: "course", label: "Course ID", required: true },
      { name: "status", label: "Status", type: "select", options: [["active", "Active"], ["revoked", "Revoked"]] },
    ],
    actions: ["view", "revoke"],
  },
  notifications: {
    title: "Notifications",
    endpoint: "/auth/notifications",
    unwrap: (response) => response.data || [],
    columns: [
      { key: "title", label: "Title" },
      { key: "user.email", label: "User" },
      { key: "type", label: "Type" },
      { key: "isRead", label: "Read", type: "boolean" },
      { key: "createdAt", label: "Created", type: "date" },
    ],
    fields: [
      { name: "targetAudience", label: "Target", type: "select", options: [["single", "Single user"], ["all", "Everyone"], ["selected", "Selected users"]] },
      { name: "user", label: "Single User ID" },
      { name: "targetUserIds", label: "Selected User IDs", transform: "csv" },
      { name: "title", label: "Title", required: true },
      { name: "message", label: "Message", type: "textarea", required: true },
      { name: "type", label: "Type", type: "select", options: [["system", "System"], ["course", "Course"], ["assignment", "Assignment"], ["certificate", "Certificate"], ["subscription", "Subscription"]] },
      { name: "actionUrl", label: "Action URL" },
    ],
    actions: ["edit", "delete"],
  },
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDate = (value) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const getValue = (item, path) =>
  path.split(".").reduce((current, key) => (current && current[key] !== undefined ? current[key] : undefined), item);

const formatCell = (item, column) => {
  const value = getValue(item, column.key);

  if (column.type === "date") return formatDate(value);
  if (column.type === "money") return `Rs ${Number(value || 0)}`;
  if (column.type === "boolean") return `<span class="pill ${value ? "ok" : "muted"}">${value ? "Yes" : "No"}</span>`;
  if (column.type === "active") return `<span class="pill ${value === false ? "danger" : "ok"}">${value === false ? "Inactive" : "Active"}</span>`;
  if (column.type === "status") return `<span class="pill ${["published", "active"].includes(String(value)) ? "ok" : "warn"}">${escapeHtml(value || "-")}</span>`;
  if (column.type === "activeStatus") return `<span class="pill ${value === "active" ? "ok" : "warn"}">${escapeHtml(value || "-")}</span>`;
  if (column.type === "count") return escapeHtml(Array.isArray(value) ? value.length : Number(value || 0));

  if (Array.isArray(value)) return escapeHtml(value.join(", "));
  if (value && typeof value === "object") return escapeHtml(value.title || value.name || value.email || value._id || "-");
  return escapeHtml(value || "-");
};

const plainValue = (item, path, fallback = "-") => {
  const value = getValue(item, path);

  if (Array.isArray(value)) return value.length ? value.join(", ") : fallback;
  if (value && typeof value === "object") return value.title || value.name || value.email || value.fullName || value._id || fallback;
  return value === undefined || value === null || value === "" ? fallback : value;
};

const compactText = (value, fallback = "No description added yet.", limit = 140) => {
  const text = String(value || fallback).trim();
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
};

const normalizeAssetKey = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const courseFallbackImages = [
  { keys: ["google-gemini-ai", "gemini"], src: "/assets/ai-courses/google-gemini-ai.svg" },
  { keys: ["claude-ai-professional", "claude"], src: "/assets/ai-courses/claude-ai-professional.svg" },
  { keys: ["midjourney-ai-image-creation", "midjourney"], src: "/assets/ai-courses/midjourney-ai-image-creation.svg" },
  { keys: ["nano-banana-ai", "nano-banana"], src: "/assets/ai-courses/nano-banana-ai.svg" },
  { keys: ["cursor-ai-coding-assistant", "cursor"], src: "/assets/ai-courses/cursor-ai-coding-assistant.svg" },
  { keys: ["github-copilot", "copilot"], src: "/assets/ai-courses/github-copilot.svg" },
  { keys: ["chatgpt-mastery", "chatgpt", "openai"], src: "/assets/ai-courses/chatgpt-mastery.svg" },
  { keys: ["perplexity-ai-research", "perplexity"], src: "/assets/ai-courses/perplexity-ai-research.svg" },
  { keys: ["notion-ai-productivity", "notion"], src: "/assets/ai-courses/notion-ai-productivity.svg" },
  { keys: ["runway-ai-video-generation", "runway"], src: "/assets/ai-courses/runway-ai-video-generation.svg" },
  { keys: ["pika-ai-video-creator", "pika"], src: "/assets/ai-courses/pika-ai-video-creator.svg" },
  { keys: ["zapier-ai-automation", "zapier"], src: "/assets/ai-courses/zapier-ai-automation.svg" },
  { keys: ["canva-ai-design", "canva"], src: "/assets/ai-courses/canva-ai-design.svg" },
  { keys: ["elevenlabs-ai-voice", "elevenlabs"], src: "/assets/ai-courses/elevenlabs-ai-voice.svg" },
  { keys: ["gamma-ai-presentation", "gamma"], src: "/assets/ai-courses/gamma-ai-presentation.svg" },
  { keys: ["bolt-ai", "bolt"], src: "/assets/ai-courses/bolt-ai.svg" },
  { keys: ["lovable-ai", "lovable"], src: "/assets/ai-courses/lovable-ai.svg" },
];

const objectTextValue = (value, fields = ["slug", "name", "title", "_id"]) => {
  if (!value || typeof value !== "object") return "";
  return fields.map((field) => value[field]).filter(Boolean).join(" ");
};

const getCourseFallbackImage = (course) => {
  const haystack = [
    course._id,
    course.slug,
    course.toolSlug,
    course.aiToolSlug,
    course.flowType,
    typeof course.aiTool === "string" ? course.aiTool : "",
    typeof course.tool === "string" ? course.tool : "",
    typeof course.relatedTool === "string" ? course.relatedTool : "",
    objectTextValue(course.aiTool),
    objectTextValue(course.tool),
    objectTextValue(course.relatedTool),
    course.title,
    course.name,
  ]
    .map(normalizeAssetKey)
    .filter(Boolean)
    .join(" ");
  const match = courseFallbackImages.find((entry) => entry.keys.some((key) => haystack.includes(key)));
  return match?.src || "/assets/ai-courses/default-ai-course.svg";
};

const getCourseImageSource = (course) => {
  const fallback = getCourseFallbackImage(course);
  const relatedTool = course.aiTool || course.tool || course.relatedTool || {};
  const primary = course.thumbnail || course.image || course.imageUrl || course.logo || course.iconUrl || "";
  const related = relatedTool.logo || relatedTool.thumbnail || relatedTool.image || relatedTool.imageUrl || relatedTool.iconUrl || "";

  return {
    src: primary || related || fallback,
    fallback,
    initials: initials(course.title || course.name || "AI"),
    fitClass: primary && primary === course.thumbnail ? "course-image-cover" : "course-image-contain",
  };
};

const initials = (value = "Admin") =>
  String(value || "Admin")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "A";

const recordTitle = (item) => item.title || item.name || item.fullName || item.email || "Untitled";

const statusClass = (value) => {
  const status = String(value ?? "").toLowerCase();
  if (["published", "active", "yes", "verified", "pass", "completed"].includes(status)) return "ok";
  if (["inactive", "archived", "revoked", "fail", "deleted", "error"].includes(status)) return "danger";
  if (["draft", "pending", "false", "not started"].includes(status)) return "warn";
  return "muted";
};

const statusPill = (value, fallback = "Draft") =>
  `<span class="pill ${statusClass(value || fallback)}">${escapeHtml(value || fallback)}</span>`;

const iconMarkup = (name, label = "") =>
  `<span class="ui-icon" aria-hidden="true"><i data-lucide="${escapeHtml(name)}"></i></span>${label ? `<span>${escapeHtml(label)}</span>` : ""}`;

const actionBusyKey = (...parts) => parts.map((part) => String(part ?? "")).join(":");

const searchResultLimit = 5;
let globalSearchTimer = null;
let globalSearchController = null;
let globalSearchDocumentEventsBound = false;
let accountMenuDocumentEventsBound = false;
let routeEventsBound = false;
const entitySearchTimers = {};
const entitySearchControllers = {};

const normalizeSearchQuery = (value = "") =>
  String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

const entitySearchKeys = () => [...Object.keys(entityConfigs), "auditLogs"];
const searchableEntityKeys = () => Object.keys(entityConfigs);
const isSearchableEntity = (key) => Object.prototype.hasOwnProperty.call(entityConfigs, key);
const recordDomId = (key, id) => `admin-record-${normalizeAssetKey(key)}-${normalizeAssetKey(id || "unknown")}`;

const adminDisplayName = () => {
  const admin = state.admin || {};
  const name = String(admin.fullName || admin.name || admin.username || "").trim();
  return name || String(admin.email || "").trim() || "Admin";
};

const adminProfileInitial = () => {
  const admin = state.admin || {};
  const source = [admin.fullName, admin.username, admin.email]
    .map((value) => String(value || "").trim())
    .find(Boolean) || "A";
  return source.charAt(0).toUpperCase() || "A";
};

const adminRoleLabel = () => {
  const role = String(state.admin?.role || "Administrator").trim();
  if (!role) return "Administrator";
  return role
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const renderAccountMenu = () => {
  if (!state.admin && state.token) {
    return `<span class="account-avatar-skeleton" aria-label="Loading admin profile"></span>`;
  }

  const isOpen = state.accountMenuOpen;
  const name = adminDisplayName();
  const email = String(state.admin?.email || "").trim();
  const role = adminRoleLabel();
  const busy = state.accountLogoutLoading ? "disabled aria-disabled=\"true\" aria-busy=\"true\"" : "";

  return `
    <div class="account-menu-shell">
      <button
        class="account-avatar-button"
        id="account-menu-button"
        type="button"
        aria-label="${escapeHtml(isOpen ? "Close admin account menu" : "Open admin account menu")}"
        aria-haspopup="menu"
        aria-expanded="${isOpen ? "true" : "false"}"
        aria-controls="account-menu-dropdown">
        <span aria-hidden="true">${escapeHtml(adminProfileInitial())}</span>
      </button>
      ${isOpen ? `
        <div class="account-menu-dropdown" id="account-menu-dropdown" role="menu" aria-labelledby="account-menu-button">
          <div class="account-menu-identity">
            <span class="account-menu-initial" aria-hidden="true">${escapeHtml(adminProfileInitial())}</span>
            <div>
              <strong>${escapeHtml(name)}</strong>
              ${email ? `<small>${escapeHtml(email)}</small>` : ""}
              <em>${escapeHtml(role)}</em>
            </div>
          </div>
          <button class="account-logout-button" id="account-logout" role="menuitem" type="button" ${busy}>
            ${iconMarkup(state.accountLogoutLoading ? "loader-2" : "log-out", state.accountLogoutLoading ? "Logging out..." : "Logout")}
          </button>
        </div>
      ` : ""}
    </div>
  `;
};

const isHighlightedRecord = (key, item) =>
  state.highlightRecord?.key === key && String(state.highlightRecord?.id || "") === String(item?._id || item?.id || "");

const auditLogRecordId = (log, index = 0) =>
  String(log?._id || log?.id || log?.entityId || log?.createdAt || `${log?.action || "audit"}-${index}`);

const auditGroupDomId = (page) => `audit-group-${Math.max(Number(page) || 1, 1)}`;

const recordDomAttributes = (key, item) => {
  const id = key === "auditLogs" ? auditLogRecordId(item) : item?._id || item?.id || "";
  const highlighted = isHighlightedRecord(key, item);
  return `id="${escapeHtml(recordDomId(key, id))}" data-record-key="${escapeHtml(key)}" data-record-id="${escapeHtml(id)}" ${highlighted ? 'data-highlighted-record="true"' : ""}`;
};

const getCurrentEntitySearch = (key) => normalizeSearchQuery(state.entitySearches[key] || "");

const searchParamsFromState = () => {
  const params = new URLSearchParams();
  if (state.view && state.view !== "dashboard") params.set("view", state.view);
  const search = getCurrentEntitySearch(state.view);
  if (isSearchableEntity(state.view) && search) params.set("search", search);
  if (state.view === "auditLogs" && state.auditSearch) params.set("search", normalizeSearchQuery(state.auditSearch));
  if (state.view === "auditLogs") {
    if (state.auditType) params.set("action", state.auditType);
    if (state.auditPage > 1) params.set("page", String(state.auditPage));
  }
  if (state.highlightRecord?.key === state.view && state.highlightRecord?.id) {
    params.set("highlight", state.highlightRecord.id);
  }
  return params;
};

const updateAdminUrl = ({ replace = false } = {}) => {
  if (!window.history?.pushState) return;
  const params = searchParamsFromState();
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash || ""}`;
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({ view: state.view }, "", nextUrl);
};

const applyUrlState = () => {
  const params = new URLSearchParams(window.location.search);
  const requestedView = params.get("view");
  const view = navItems.some((item) => item.key === requestedView) ? requestedView : "dashboard";
  const search = normalizeSearchQuery(params.get("search") || "");
  const highlight = normalizeSearchQuery(params.get("highlight") || "");

  state.view = view;
  if (isSearchableEntity(view) && search) state.entitySearches[view] = search;
  if (view === "auditLogs" && search) state.auditSearch = search;
  if (view === "auditLogs") {
    const actionParam = normalizeSearchQuery(params.get("action") || "");
    state.auditType = params.has("action")
      ? String(actionParam).toLowerCase() === "admin.login"
        ? "Admin.Login"
        : actionParam
      : "Admin.Login";
    state.auditPage = Math.max(Number.parseInt(params.get("page") || "1", 10) || 1, 1);
  }
  state.highlightRecord = highlight ? { key: view, id: highlight } : null;
};

const pageSearchHaystack = (item) =>
  [item.label, item.key, item.section]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const pageShortcutResults = (query) => {
  const normalized = query.toLowerCase();
  if (!normalized) return [];
  return navItems
    .filter((item) => pageSearchHaystack(item).includes(normalized))
    .slice(0, searchResultLimit)
    .map((item) => ({
      group: "Pages",
      type: "page",
      view: item.key,
      title: item.label,
      meta: `${item.section} page`,
      icon: item.icon || "circle",
      search: "",
    }));
};

const globalSearchEntities = [
  { key: "users", group: "Users", icon: "user", endpoint: "/admins/users" },
  { key: "admins", group: "Admins", icon: "shield", endpoint: "/admins" },
  { key: "courses", group: "Courses", icon: "book-open", endpoint: "/auth/courses" },
  { key: "modules", group: "Modules", icon: "layers", endpoint: "/auth/modules" },
  { key: "lessons", group: "Lessons", icon: "play-square", endpoint: "/auth/lessons" },
  { key: "quizzes", group: "Quizzes", icon: "help-circle", endpoint: "/auth/quizzes" },
  { key: "aiTools", group: "AI Tools", icon: "wand-2", endpoint: "/auth/aitools" },
  { key: "categories", group: "Categories", icon: "grid", endpoint: "/auth/tool-categories" },
  { key: "certificates", group: "Certificates", icon: "award", endpoint: "/certificates" },
  { key: "notifications", group: "Notifications", icon: "bell", endpoint: "/auth/notifications" },
  { key: "auditLogs", group: "Audit Logs", icon: "file-text", endpoint: "/admins/audit-logs" },
];

const unwrapSearchResponse = (key, response) => {
  if (key === "auditLogs") return response.data || response.logs || [];
  const config = entityConfigs[key];
  return config ? config.unwrap(response) : [];
};

const resultTitleForRecord = (key, item) => {
  if (key === "certificates") return item.certificateId || item.certificateNumber || item.recipientName || "Certificate";
  if (key === "auditLogs") return item.action || item.description || "Audit activity";
  return recordTitle(item);
};

const resultMetaForRecord = (key, item) => {
  if (key === "users" || key === "admins") return [item.email, item.role].filter(Boolean).join(" · ") || "Account record";
  if (key === "courses") return [item.level, item.status, compactText(item.description || item.shortDescription, "", 52)].filter(Boolean).join(" · ");
  if (key === "modules") return [plainValue(item, "course.title", ""), compactText(item.description, "", 52)].filter(Boolean).join(" · ") || "Module record";
  if (key === "lessons") return [plainValue(item, "course.title", ""), plainValue(item, "module.title", ""), getLessonType(item)].filter(Boolean).join(" · ");
  if (key === "quizzes") return [plainValue(item, "course.title", ""), compactText(item.description, "", 52)].filter(Boolean).join(" · ") || "Quiz record";
  if (key === "aiTools") return [item.slug, plainValue(item, "category.name", item.category || ""), item.flowType].filter(Boolean).join(" · ");
  if (key === "categories") return [item.slug, compactText(item.description, "", 52)].filter(Boolean).join(" · ") || "Category record";
  if (key === "certificates") return [item.recipientName, item.user?.email, item.courseName || plainValue(item, "course.title", "")].filter(Boolean).join(" · ");
  if (key === "notifications") return [item.type, item.user?.email || item.targetAudience, compactText(item.message, "", 52)].filter(Boolean).join(" · ");
  if (key === "auditLogs") return [item.entityType, item.admin?.email, formatDate(item.createdAt)].filter(Boolean).join(" · ");
  return compactText(item.description || item.message || item.email || item.slug || "", "Managed record", 64);
};

const searchableRecordHaystack = (key, item) => {
  const fieldSets = {
    users: [item.fullName, item.name, item.email, item.role],
    admins: [item.fullName, item.name, item.email, item.role],
    courses: [item.title, item.description, item.shortDescription, item.level, item.status, ...(Array.isArray(item.tags) ? item.tags : [])],
    modules: [item.title, item.description, plainValue(item, "course.title", ""), item.status],
    lessons: [item.title, item.description, plainValue(item, "course.title", ""), plainValue(item, "module.title", ""), getLessonType(item), item.status],
    quizzes: [item.title, item.description, plainValue(item, "course.title", ""), plainValue(item, "module.title", ""), plainValue(item, "lesson.title", ""), item.status],
    aiTools: [item.name, item.description, item.slug, item.flowType, plainValue(item, "category.name", item.category || ""), item.pricingType, item.status],
    categories: [item.name, item.slug, item.description],
    certificates: [item.certificateId, item.certificateNumber, item.recipientName, item.user?.email, item.courseName, plainValue(item, "course.title", ""), item.status],
    notifications: [item.title, item.message, item.type, item.user?.email, item.targetAudience, item.status],
    auditLogs: [item.action, item.description, item.entityType, item.entityId, item.admin?.email, item.ipAddress, item.device],
  };

  return (fieldSets[key] || Object.values(item || {}))
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase();
};

const recordMatchesQuery = (key, item, query) => {
  const normalized = normalizeSearchQuery(query).toLowerCase();
  return !normalized || searchableRecordHaystack(key, item).includes(normalized);
};

const recordSearchResult = (entry, item, query) => {
  const id = entry.key === "auditLogs" ? auditLogRecordId(item) : item._id || item.id || "";
  return {
    group: entry.group,
    type: "record",
    view: entry.key === "auditLogs" ? "auditLogs" : entry.key,
    recordId: String(id),
    title: resultTitleForRecord(entry.key, item),
    meta: resultMetaForRecord(entry.key, item),
    icon: entry.icon,
    search: query,
  };
};

const groupedSearchResults = () =>
  state.globalSearch.results.reduce((groups, result, index) => {
    const group = groups.find((item) => item.label === result.group);
    const option = { ...result, index };
    if (group) group.items.push(option);
    else groups.push({ label: result.group, items: [option] });
    return groups;
  }, []);

const renderGlobalSearchDropdown = () => {
  const search = state.globalSearch;
  if (!search.isOpen) return "";
  const groups = groupedSearchResults();
  const hasResults = groups.some((group) => group.items.length);
  const statusText = search.status === "loading"
    ? "Searching admin records..."
    : search.status === "error"
      ? search.error || "Search failed."
      : hasResults
        ? `${search.results.length} search results available.`
        : search.query
          ? "No results found."
          : "Type to search admin pages and records.";

  return `
    <div class="global-search-dropdown" id="global-search-results" role="listbox" aria-label="Admin search results">
      <p class="visually-hidden" aria-live="polite">${escapeHtml(statusText)}</p>
      ${search.status === "loading" ? `
        <div class="global-search-state">${iconMarkup("loader-2")}<span>Searching...</span></div>
      ` : ""}
      ${search.status === "error" ? `
        <div class="global-search-state search-error" role="alert">
          ${iconMarkup("circle-alert")}
          <span>${escapeHtml(search.error || "Unable to search right now.")}</span>
          <button type="button" data-search-retry>Retry</button>
        </div>
      ` : ""}
      ${!hasResults && search.status !== "loading" && search.status !== "error" ? `
        <div class="global-search-state">
          ${iconMarkup(search.query ? "search-x" : "search")}
          <span>${escapeHtml(search.query ? "No results found" : "Type something to start")}</span>
        </div>
      ` : ""}
      ${groups.map((group) => `
        <section class="global-search-group" aria-label="${escapeHtml(group.label)}">
          <div class="global-search-group-title">
            <span>${escapeHtml(group.label)}</span>
            ${group.items.length >= searchResultLimit ? `<button type="button" data-search-view-all="${escapeHtml(group.items[0].view)}">View all results</button>` : ""}
          </div>
          ${group.items.map((result) => `
            <button
              class="global-search-option ${result.index === search.activeIndex ? "is-active" : ""}"
              id="global-search-option-${escapeHtml(result.index)}"
              data-search-result="${escapeHtml(result.index)}"
              role="option"
              aria-selected="${result.index === search.activeIndex ? "true" : "false"}"
              type="button">
              ${iconMarkup(result.icon)}
              <span>
                <b>${escapeHtml(result.title)}</b>
                <small>${escapeHtml(result.meta || result.group)}</small>
              </span>
              <em>${escapeHtml(result.type === "page" ? "Page" : result.group)}</em>
            </button>
          `).join("")}
        </section>
      `).join("")}
    </div>
  `;
};

const renderGlobalSearch = () => {
  const query = state.globalSearch.query;
  const activeId = state.globalSearch.activeIndex >= 0 ? `global-search-option-${state.globalSearch.activeIndex}` : "";
  return `
    <div class="search global-search-shell" role="search">
      <label class="visually-hidden" for="global-search">Search admin panel</label>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <input
        id="global-search"
        type="search"
        value="${escapeHtml(query)}"
        placeholder="Search courses, users, tools..."
        role="combobox"
        autocomplete="off"
        aria-label="Search admin panel"
        aria-expanded="${state.globalSearch.isOpen ? "true" : "false"}"
        aria-controls="global-search-results"
        ${activeId ? `aria-activedescendant="${escapeHtml(activeId)}"` : ""}
      />
      ${query ? `<button class="global-search-clear" data-search-clear type="button" aria-label="Clear search">${iconMarkup("x")}</button>` : ""}
      ${renderGlobalSearchDropdown()}
    </div>
  `;
};

applyUrlState();

const learningCardAnimation = (type) => {
  const animations = {
    courses: `
      <svg viewBox="0 0 96 96" role="img" aria-label="Animated course books">
        <path class="learning-path" d="M21 68 C34 46 54 62 72 31" />
        <g class="course-book book-one">
          <rect x="20" y="44" width="28" height="34" rx="5" />
          <path d="M27 52h13M27 60h10" />
        </g>
        <g class="course-book book-two">
          <rect x="35" y="34" width="28" height="38" rx="5" />
          <path d="M42 44h13M42 52h10" />
        </g>
        <g class="course-book book-three">
          <rect x="50" y="24" width="28" height="40" rx="5" />
          <path d="M58 35h11M58 43h8" />
        </g>
        <circle class="progress-dot" cx="72" cy="31" r="8" />
        <path class="play-mark" d="M70 27l7 4-7 4z" />
      </svg>
    `,
    modules: `
      <svg viewBox="0 0 96 96" role="img" aria-label="Animated connected modules">
        <path class="module-line line-one" d="M31 35H52" />
        <path class="module-line line-two" d="M59 44v16" />
        <rect class="module-block module-a" x="16" y="22" width="28" height="24" rx="7" />
        <rect class="module-block module-b" x="52" y="28" width="28" height="24" rx="7" />
        <rect class="module-block module-c" x="34" y="58" width="28" height="24" rx="7" />
        <circle class="module-check-dot" cx="70" cy="62" r="9" />
        <path class="module-check" d="M66 62l3 3 6-7" />
      </svg>
    `,
    lessons: `
      <svg viewBox="0 0 96 96" role="img" aria-label="Animated lesson document">
        <rect class="lesson-doc" x="23" y="16" width="44" height="58" rx="8" />
        <path class="lesson-fold" d="M55 16v14h12" />
        <path class="lesson-line line-one" d="M32 36h24" />
        <path class="lesson-line line-two" d="M32 47h28" />
        <path class="lesson-line line-three" d="M32 58h20" />
        <circle class="lesson-play" cx="67" cy="64" r="13" />
        <path class="lesson-play-mark" d="M64 58l10 6-10 6z" />
        <path class="lesson-eye" d="M20 80c5-8 18-8 23 0-5 8-18 8-23 0z" />
        <circle class="lesson-eye-dot" cx="31.5" cy="80" r="3" />
      </svg>
    `,
    quizzes: `
      <svg viewBox="0 0 96 96" role="img" aria-label="Animated quiz paper">
        <rect class="quiz-paper" x="22" y="18" width="52" height="62" rx="9" />
        <path class="quiz-question" d="M46 31c0-6 10-6 10 0 0 5-6 5-6 10" />
        <circle class="quiz-question-dot" cx="50" cy="48" r="2" />
        <path class="quiz-option option-one" d="M33 58h24" />
        <path class="quiz-option option-two" d="M33 68h18" />
        <circle class="quiz-check-bg" cx="66" cy="66" r="9" />
        <path class="quiz-check" d="M62 66l3 3 6-7" />
        <text class="quiz-mark" x="72" y="31">?</text>
      </svg>
    `,
    certificates: `
      <svg viewBox="0 0 96 96" role="img" aria-label="Animated certificate">
        <rect class="certificate-doc" x="18" y="18" width="54" height="50" rx="8" />
        <path class="certificate-line line-one" d="M29 32h27" />
        <path class="certificate-line line-two" d="M29 43h33" />
        <path class="certificate-line line-three" d="M29 54h20" />
        <circle class="certificate-seal" cx="68" cy="66" r="13" />
        <path class="certificate-check" d="M62 66l4 4 8-10" />
        <path class="certificate-ribbon ribbon-one" d="M62 77l-3 10 9-5" />
        <path class="certificate-ribbon ribbon-two" d="M74 77l3 10-9-5" />
        <path class="certificate-lock" d="M27 76v-6c0-6 10-6 10 0v6" />
        <rect class="certificate-lock-body" x="25" y="75" width="14" height="10" rx="3" />
      </svg>
    `,
  };

  return `<span class="learning-animation learning-animation-${escapeHtml(type)}">${animations[type] || animations.courses}</span>`;
};

const clampPercent = (value) => Math.max(0, Math.min(100, Number(value || 0)));

const metricCardAnimation = (type, percentage = 0) => {
  const progress = clampPercent(percentage);
  const progressOffset = 100 - progress;
  const animations = {
    users: `
      <svg viewBox="0 0 64 64" role="img" aria-label="Animated user group">
        <circle class="metric-user-back user-left" cx="21" cy="25" r="7" />
        <path class="metric-user-back user-left" d="M10 43c2-8 19-8 22 0" />
        <circle class="metric-user-back user-right" cx="43" cy="25" r="7" />
        <path class="metric-user-back user-right" d="M32 43c2-8 19-8 22 0" />
        <circle class="metric-user-main" cx="32" cy="22" r="9" />
        <path class="metric-user-main" d="M17 49c4-12 26-12 30 0" />
        <circle class="metric-status-dot" cx="48" cy="17" r="4" />
      </svg>
    `,
    "daily-active": `
      <svg viewBox="0 0 64 64" role="img" aria-label="Animated active user">
        <circle class="metric-pulse-ring" cx="32" cy="32" r="21" />
        <circle class="metric-user-main" cx="32" cy="24" r="8" />
        <path class="metric-user-main" d="M19 48c4-11 22-11 26 0" />
        <path class="metric-activity-line" d="M14 21h7l5-8 7 18 5-10h12" />
        <circle class="metric-status-dot" cx="48" cy="17" r="4" />
      </svg>
    `,
    courses: `
      <svg viewBox="0 0 64 64" role="img" aria-label="Animated course books">
        <path class="metric-path-line" d="M13 46c12-18 28 2 39-22" />
        <rect class="metric-book book-a" x="13" y="30" width="16" height="23" rx="3" />
        <rect class="metric-book book-b" x="25" y="23" width="16" height="26" rx="3" />
        <rect class="metric-book book-c" x="37" y="16" width="16" height="27" rx="3" />
        <path class="metric-page-line" d="M18 37h7M30 31h7M42 25h7" />
        <circle class="metric-status-dot" cx="52" cy="24" r="4" />
      </svg>
    `,
    "ai-tools": `
      <svg viewBox="0 0 64 64" role="img" aria-label="Animated AI tool network">
        <path class="metric-node-line line-one" d="M32 32L18 18" />
        <path class="metric-node-line line-two" d="M32 32l15-12" />
        <path class="metric-node-line line-three" d="M32 32l15 14" />
        <path class="metric-node-line line-four" d="M32 32L17 47" />
        <circle class="metric-node" cx="18" cy="18" r="5" />
        <circle class="metric-node" cx="47" cy="20" r="5" />
        <circle class="metric-node" cx="47" cy="46" r="5" />
        <circle class="metric-node" cx="17" cy="47" r="5" />
        <path class="metric-ai-spark" d="M32 18l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
        <circle class="metric-status-dot" cx="49" cy="15" r="4" />
      </svg>
    `,
    certificates: `
      <svg viewBox="0 0 64 64" role="img" aria-label="Animated certificate">
        <rect class="metric-certificate-doc" x="13" y="14" width="34" height="33" rx="5" />
        <path class="metric-page-line" d="M20 24h18M20 32h21M20 40h12" />
        <circle class="metric-seal" cx="45" cy="45" r="9" />
        <path class="metric-check" d="M41 45l3 3 6-7" />
        <path class="metric-sparkle" d="M51 16l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
      </svg>
    `,
    registrations: `
      <svg viewBox="0 0 64 64" role="img" aria-label="Animated registration">
        <circle class="metric-user-main" cx="23" cy="23" r="8" />
        <path class="metric-user-main" d="M11 47c3-11 21-11 25 0" />
        <path class="metric-plus" d="M45 19v16M37 27h16" />
        <rect class="metric-form" x="35" y="39" width="17" height="13" rx="3" />
        <path class="metric-check" d="M39 45l3 3 6-7" />
      </svg>
    `,
    completion: `
      <svg viewBox="0 0 64 64" role="img" aria-label="Animated completion progress" style="--metric-progress-offset:${progressOffset};">
        <circle class="metric-progress-track" cx="32" cy="32" r="20" />
        <circle class="metric-progress-ring" cx="32" cy="32" r="20" pathLength="100" />
        <path class="metric-check progress-check" d="M24 33l6 6 11-14" />
      </svg>
    `,
    lessons: `
      <svg viewBox="0 0 64 64" role="img" aria-label="Animated lesson pages">
        <rect class="metric-lesson-page lesson-back" x="18" y="15" width="28" height="35" rx="5" />
        <rect class="metric-lesson-page lesson-front" x="13" y="20" width="32" height="35" rx="5" />
        <path class="metric-page-line" d="M21 30h16M21 38h18M21 46h11" />
        <circle class="metric-play" cx="47" cy="44" r="9" />
        <path class="metric-play-mark" d="M44 39l8 5-8 5z" />
      </svg>
    `,
  };

  return `<span class="platform-metric-animation platform-metric-animation-${escapeHtml(type)}">${animations[type] || animations.users}</span>`;
};

const avatarMarkup = (label, imageUrl = "", className = "") => {
  if (imageUrl) {
    return `<span class="avatar ${className}"><img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" /></span>`;
  }

  return `<span class="avatar ${className}" aria-hidden="true">${escapeHtml(initials(label))}</span>`;
};

const statChip = (label, value, icon = "circle") => `
  <div class="stat-chip">
    ${iconMarkup(icon)}
    <div>
      <span>${escapeHtml(label)}</span>
      <b>${escapeHtml(value)}</b>
    </div>
  </div>
`;

const lessonSummaryIllustration = (type) => {
  if (type === "records") {
    return `
      <span class="lesson-summary-visual visual-records" aria-hidden="true">
        <svg viewBox="0 0 76 76" focusable="false">
          <rect class="record-page record-page-one" x="20" y="15" width="28" height="34" rx="4"></rect>
          <rect class="record-page record-page-two" x="26" y="21" width="28" height="34" rx="4"></rect>
          <path class="database-rim" d="M18 49c0-5 9-9 20-9s20 4 20 9-9 9-20 9-20-4-20-9Z"></path>
          <path class="database-body" d="M18 49v10c0 5 9 9 20 9s20-4 20-9V49"></path>
        </svg>
      </span>
    `;
  }

  if (type === "create") {
    return `
      <span class="lesson-summary-visual visual-create" aria-hidden="true">
        <svg viewBox="0 0 76 76" focusable="false">
          <rect class="create-doc" x="20" y="14" width="34" height="46" rx="6"></rect>
          <path class="create-fold" d="M44 14v12h10"></path>
          <path class="create-line" d="M28 34h18M28 43h14"></path>
          <path class="create-plus" d="M54 42v18M45 51h18"></path>
        </svg>
      </span>
    `;
  }

  return `
    <span class="lesson-summary-visual visual-source" aria-hidden="true">
      <svg viewBox="0 0 76 76" focusable="false">
        <rect class="server-box" x="18" y="17" width="40" height="16" rx="5"></rect>
        <rect class="server-box server-box-two" x="18" y="43" width="40" height="16" rx="5"></rect>
        <path class="server-link" d="M38 33v10"></path>
        <circle class="server-dot" cx="27" cy="25" r="2.5"></circle>
        <circle class="server-dot packet-one" cx="48" cy="25" r="3"></circle>
        <circle class="server-dot packet-two" cx="28" cy="51" r="3"></circle>
      </svg>
    </span>
  `;
};

const lessonSummaryCard = (label, value, type) => `
  <div class="stat-chip lesson-summary-chip lesson-summary-${type}">
    ${lessonSummaryIllustration(type)}
    <div>
      <span>${escapeHtml(label)}</span>
      <b ${Number.isFinite(Number(value)) ? `data-count="${escapeHtml(value)}"` : ""}>${escapeHtml(value)}</b>
    </div>
  </div>
`;

const quizSummaryIllustration = (type) => {
  if (type === "records") {
    return `
      <span class="quiz-summary-visual quiz-visual-records" aria-hidden="true">
        <svg viewBox="0 0 112 82" focusable="false">
          <path class="quiz-page page-back" d="M25 26l46-10 9 43-46 10z"></path>
          <path class="quiz-page page-mid" d="M17 30l48-7 7 45-48 7z"></path>
          <rect class="quiz-page page-front" x="28" y="17" width="47" height="57" rx="8" transform="rotate(6 51.5 45.5)"></rect>
          <circle class="quiz-check" cx="41" cy="34" r="5"></circle>
          <circle class="quiz-check" cx="42" cy="48" r="5"></circle>
          <circle class="quiz-check" cx="44" cy="62" r="5"></circle>
          <path class="quiz-check-mark" d="M38 34l2 2 4-5M39 48l2 2 4-5M41 62l2 2 4-5"></path>
          <path class="quiz-line" d="M52 34h14M53 48h12M55 62h10"></path>
          <circle class="quiz-bubble" cx="82" cy="24" r="10"></circle>
          <path class="quiz-question" d="M80 21c0-3 6-3 6 1 0 4-4 3-4 7M82 33v1"></path>
          <path class="quiz-spark spark-one" d="M15 21v8M11 25h8"></path>
          <path class="quiz-spark spark-two" d="M88 56v8M84 60h8"></path>
        </svg>
      </span>
    `;
  }

  if (type === "create") {
    return `
      <span class="quiz-summary-visual quiz-visual-create" aria-hidden="true">
        <svg viewBox="0 0 112 82" focusable="false">
          <path class="quiz-orbit" d="M18 49c15-22 54-28 76-9"></path>
          <rect class="quiz-doc" x="37" y="15" width="35" height="50" rx="7"></rect>
          <path class="quiz-doc-fold" d="M62 15v13h10"></path>
          <path class="quiz-doc-line" d="M46 33h16M46 43h20M46 53h13"></path>
          <circle class="quiz-plus-disc" cx="74" cy="55" r="14"></circle>
          <path class="quiz-plus" d="M74 47v16M66 55h16"></path>
          <circle class="quiz-dot dot-one" cx="23" cy="48" r="3"></circle>
          <circle class="quiz-dot dot-two" cx="90" cy="38" r="3"></circle>
        </svg>
      </span>
    `;
  }

  return `
    <span class="quiz-summary-visual quiz-visual-source" aria-hidden="true">
      <svg viewBox="0 0 112 82" focusable="false">
        <rect class="quiz-server" x="23" y="15" width="36" height="52" rx="7"></rect>
        <path class="quiz-server-slot" d="M31 29h20M31 43h20M31 56h20"></path>
        <path class="quiz-api-path path-one" d="M60 28h25c7 0 7 10 14 10"></path>
        <path class="quiz-api-path path-two" d="M60 48h18c8 0 8 12 20 12"></path>
        <rect class="quiz-packet packet-one" x="92" y="33" width="8" height="8" rx="2"></rect>
        <rect class="quiz-packet packet-two" x="93" y="55" width="8" height="8" rx="2"></rect>
        <text x="31" y="25">API</text>
      </svg>
    </span>
  `;
};

const quizSummaryCard = (label, value, type) => {
  const content = `
    ${quizSummaryIllustration(type)}
    <div>
      <span>${escapeHtml(label)}</span>
      <b ${Number.isFinite(Number(value)) ? `data-count="${escapeHtml(value)}"` : ""}>${escapeHtml(value)}</b>
    </div>
  `;

  if (type === "create") {
    return `<button class="stat-chip quiz-summary-chip quiz-summary-${type}" data-open-form="quizzes" type="button" aria-label="Create quiz">${content}</button>`;
  }

  return `<div class="stat-chip quiz-summary-chip quiz-summary-${type}">${content}</div>`;
};

const aiToolSummaryIllustration = (type) => {
  if (type === "records") {
    return `
      <span class="ai-tool-summary-visual ai-tool-visual-records" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <rect class="tool-chip chip-back" x="18" y="21" width="40" height="40" rx="12"></rect>
          <rect class="tool-chip chip-front" x="30" y="27" width="40" height="40" rx="12"></rect>
          <path class="tool-pin pin-one" d="M20 34H9M20 48H9M70 40h9M70 54h9M42 27V16M56 67v9"></path>
          <path class="tool-spark spark-one" d="M18 67v8M14 71h8"></path>
          <path class="tool-spark spark-two" d="M67 16v8M63 20h8"></path>
          <text x="42" y="52">AI</text>
        </svg>
      </span>
    `;
  }

  if (type === "create") {
    return `
      <span class="ai-tool-summary-visual ai-tool-visual-create" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <rect class="tool-doc" x="25" y="17" width="34" height="48" rx="8"></rect>
          <path class="tool-doc-line" d="M34 34h16M34 44h12"></path>
          <circle class="tool-plus-disc" cx="61" cy="60" r="13"></circle>
          <path class="tool-plus" d="M61 52v16M53 60h16"></path>
          <path class="tool-orbit" d="M14 51c12-20 46-28 65-10"></path>
        </svg>
      </span>
    `;
  }

  return `
    <span class="ai-tool-summary-visual ai-tool-visual-source" aria-hidden="true">
      <svg viewBox="0 0 88 88" focusable="false">
        <rect class="tool-server" x="18" y="21" width="34" height="46" rx="9"></rect>
        <path class="tool-server-line" d="M27 35h16M27 47h16M27 58h12"></path>
        <path class="tool-link link-one" d="M53 35h14c6 0 6 10 12 10"></path>
        <path class="tool-link link-two" d="M53 55h11c7 0 7 11 15 11"></path>
        <circle class="tool-packet packet-one" cx="76" cy="45" r="4"></circle>
        <circle class="tool-packet packet-two" cx="76" cy="66" r="4"></circle>
      </svg>
    </span>
  `;
};

const aiToolSummaryCard = (label, value, type) => {
  const content = `
    ${aiToolSummaryIllustration(type)}
    <div>
      <span>${escapeHtml(label)}</span>
      <b ${Number.isFinite(Number(value)) ? `data-count="${escapeHtml(value)}"` : ""}>${escapeHtml(value)}</b>
    </div>
  `;

  if (type === "create") {
    return `<button class="stat-chip ai-tool-summary-chip ai-tool-summary-${type}" data-open-form="aiTools" type="button" aria-label="Create AI tool">${content}</button>`;
  }

  return `<div class="stat-chip ai-tool-summary-chip ai-tool-summary-${type}">${content}</div>`;
};

const certificateSummaryIllustration = (type) => {
  if (type === "records") {
    return `
      <span class="certificate-summary-visual certificate-visual-records" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <rect class="certificate-sheet sheet-back" x="20" y="18" width="42" height="52" rx="7"></rect>
          <rect class="certificate-sheet sheet-mid" x="26" y="22" width="42" height="52" rx="7"></rect>
          <rect class="certificate-sheet sheet-front" x="32" y="26" width="42" height="52" rx="7"></rect>
          <path class="certificate-line line-one" d="M41 42h23"></path>
          <path class="certificate-line line-two" d="M41 52h18"></path>
          <circle class="certificate-seal" cx="62" cy="63" r="8"></circle>
          <path class="certificate-ribbon" d="M58 70l-3 9 7-4 7 4-3-9"></path>
          <circle class="certificate-check-disc" cx="28" cy="28" r="10"></circle>
          <path class="certificate-check" d="M23 28l4 4 8-9"></path>
        </svg>
      </span>
    `;
  }

  if (type === "create") {
    return `
      <span class="certificate-summary-visual certificate-visual-create" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <rect class="certificate-create-doc" x="25" y="18" width="42" height="54" rx="8"></rect>
          <path class="certificate-create-fold" d="M56 18v13h11"></path>
          <path class="certificate-signature" d="M34 56c6-8 12 5 18-2 4-5 7-4 10-1"></path>
          <circle class="certificate-create-seal" cx="41" cy="39" r="8"></circle>
          <circle class="certificate-plus-disc" cx="64" cy="65" r="13"></circle>
          <path class="certificate-plus" d="M64 57v16M56 65h16"></path>
        </svg>
      </span>
    `;
  }

  return `
    <span class="certificate-summary-visual certificate-visual-source" aria-hidden="true">
      <svg viewBox="0 0 88 88" focusable="false">
        <rect class="certificate-server" x="16" y="20" width="34" height="48" rx="8"></rect>
        <path class="certificate-server-slot" d="M25 34h16M25 46h16M25 58h11"></path>
        <rect class="certificate-api-doc" x="59" y="28" width="18" height="24" rx="4"></rect>
        <path class="certificate-api-line" d="M64 39h8M64 46h6"></path>
        <path class="certificate-route route-one" d="M51 34h9"></path>
        <path class="certificate-route route-two" d="M51 56h18c5 0 5-8 10-8"></path>
        <circle class="certificate-packet packet-one" cx="55" cy="34" r="3"></circle>
        <circle class="certificate-packet packet-two" cx="66" cy="56" r="3"></circle>
        <circle class="certificate-api-check-disc" cx="72" cy="25" r="7"></circle>
        <path class="certificate-api-check" d="M68 25l3 3 6-7"></path>
      </svg>
    </span>
  `;
};

const certificateSummaryCard = (label, value, type) => {
  const content = `
    ${certificateSummaryIllustration(type)}
    <div>
      <span>${escapeHtml(label)}</span>
      <b ${Number.isFinite(Number(value)) ? `data-count="${escapeHtml(value)}" data-count-once="certificate-${type}"` : ""}>${escapeHtml(value)}</b>
    </div>
  `;

  if (type === "create") {
    return `<button class="stat-chip certificate-summary-chip certificate-summary-${type}" data-open-form="certificates" type="button" aria-label="Create certificate">${content}</button>`;
  }

  return `<div class="stat-chip certificate-summary-chip certificate-summary-${type}">${content}</div>`;
};

const adminSummaryIllustration = (type) => {
  if (type === "users-records") {
    return `
      <span class="admin-summary-visual users-visual-records" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <circle class="summary-user user-back left" cx="29" cy="32" r="8"></circle>
          <path class="summary-user user-back left" d="M17 58c3-10 21-10 24 0"></path>
          <circle class="summary-user user-back right" cx="55" cy="32" r="8"></circle>
          <path class="summary-user user-back right" d="M43 58c3-10 21-10 24 0"></path>
          <circle class="summary-user user-main" cx="42" cy="28" r="10"></circle>
          <path class="summary-user user-main" d="M25 64c5-14 29-14 34 0"></path>
          <circle class="summary-active-dot" cx="63" cy="22" r="6"></circle>
        </svg>
      </span>
    `;
  }

  if (type === "users-create") {
    return `
      <span class="admin-summary-visual users-visual-create" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <circle class="summary-add-user" cx="34" cy="30" r="12"></circle>
          <path class="summary-add-user" d="M16 66c5-17 31-17 36 0"></path>
          <circle class="summary-plus-disc" cx="63" cy="57" r="14"></circle>
          <path class="summary-plus" d="M63 48v18M54 57h18"></path>
        </svg>
      </span>
    `;
  }

  if (type === "users-api") {
    return `
      <span class="admin-summary-visual users-visual-api" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <rect class="summary-server" x="15" y="22" width="32" height="44" rx="8"></rect>
          <path class="summary-server-line" d="M24 36h14M24 48h14M24 59h10"></path>
          <rect class="summary-endpoint" x="61" y="31" width="16" height="26" rx="5"></rect>
          <path class="summary-route route-one" d="M48 36h12"></path>
          <path class="summary-route route-two" d="M48 55h12"></path>
          <circle class="summary-packet packet-one" cx="52" cy="36" r="3"></circle>
          <circle class="summary-packet packet-two" cx="55" cy="55" r="3"></circle>
        </svg>
      </span>
    `;
  }

  if (type === "admins-records") {
    return `
      <span class="admin-summary-visual admins-visual-records" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <circle class="summary-user user-back left" cx="31" cy="34" r="8"></circle>
          <path class="summary-user user-back left" d="M19 61c3-10 21-10 24 0"></path>
          <circle class="summary-user user-main" cx="43" cy="29" r="10"></circle>
          <path class="summary-user user-main" d="M26 65c5-14 29-14 34 0"></path>
          <path class="summary-shield" d="M63 26l12 4v10c0 9-5 15-12 18-7-3-12-9-12-18V30Z"></path>
          <path class="summary-shield-check" d="M58 42l4 4 8-10"></path>
        </svg>
      </span>
    `;
  }

  if (type === "admins-create") {
    return `
      <span class="admin-summary-visual admins-visual-create" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <circle class="summary-add-user" cx="32" cy="30" r="11"></circle>
          <path class="summary-add-user" d="M15 65c5-16 29-16 34 0"></path>
          <path class="summary-shield" d="M59 29l12 4v9c0 9-5 15-12 18-7-3-12-9-12-18v-9Z"></path>
          <circle class="summary-plus-disc" cx="64" cy="62" r="12"></circle>
          <path class="summary-plus" d="M64 55v14M57 62h14"></path>
        </svg>
      </span>
    `;
  }

  if (type === "admins-api") {
    return `
      <span class="admin-summary-visual admins-visual-api" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <rect class="summary-server" x="14" y="23" width="32" height="43" rx="8"></rect>
          <path class="summary-server-line" d="M23 36h14M23 48h14M23 59h10"></path>
          <path class="summary-shield api-shield" d="M65 28l11 4v9c0 8-5 14-11 17-7-3-11-9-11-17v-9Z"></path>
          <path class="summary-lock" d="M61 45v-5c0-5 8-5 8 0v5"></path>
          <rect class="summary-lock-body" x="59" y="44" width="12" height="10" rx="3"></rect>
          <path class="summary-route route-one" d="M47 37h9"></path>
          <path class="summary-route route-two" d="M47 56h13"></path>
          <circle class="summary-packet packet-one" cx="51" cy="37" r="3"></circle>
          <circle class="summary-packet packet-two" cx="55" cy="56" r="3"></circle>
        </svg>
      </span>
    `;
  }

  if (type === "courses-records") {
    return `
      <span class="admin-summary-visual courses-visual-records" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <rect class="summary-course-book book-one" x="18" y="45" width="18" height="25" rx="5"></rect>
          <rect class="summary-course-book book-two" x="35" y="35" width="18" height="35" rx="5"></rect>
          <rect class="summary-course-book book-three" x="52" y="25" width="18" height="45" rx="5"></rect>
          <path class="summary-course-line" d="M23 55h8M40 45h8M57 36h8"></path>
          <circle class="summary-active-dot" cx="68" cy="22" r="6"></circle>
        </svg>
      </span>
    `;
  }

  if (type === "courses-create") {
    return `
      <span class="admin-summary-visual courses-visual-create" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <rect class="summary-course-doc" x="23" y="17" width="39" height="54" rx="8"></rect>
          <path class="summary-course-fold" d="M52 17v13h10"></path>
          <path class="summary-course-line line-one" d="M32 40h20"></path>
          <path class="summary-course-line line-two" d="M32 51h15"></path>
          <circle class="summary-plus-disc" cx="64" cy="63" r="13"></circle>
          <path class="summary-plus" d="M64 55v16M56 63h16"></path>
        </svg>
      </span>
    `;
  }

  if (type === "courses-api" || type === "courses-source") {
    return `
      <span class="admin-summary-visual courses-visual-api" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <rect class="summary-server" x="14" y="21" width="32" height="46" rx="8"></rect>
          <path class="summary-server-line" d="M23 35h14M23 47h14M23 58h10"></path>
          <rect class="summary-course-api-card" x="60" y="28" width="17" height="29" rx="5"></rect>
          <path class="summary-course-api-line" d="M64 38h9M64 47h7"></path>
          <path class="summary-route route-one" d="M47 36h12"></path>
          <path class="summary-route route-two" d="M47 56h13"></path>
          <circle class="summary-packet packet-one" cx="52" cy="36" r="3"></circle>
          <circle class="summary-packet packet-two" cx="55" cy="56" r="3"></circle>
        </svg>
      </span>
    `;
  }

  if (type === "modules-records") {
    return `
      <span class="admin-summary-visual modules-visual-records" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <rect class="summary-module-block block-one" x="17" y="27" width="20" height="20" rx="6"></rect>
          <rect class="summary-module-block block-two" x="51" y="27" width="20" height="20" rx="6"></rect>
          <rect class="summary-module-block block-three" x="34" y="54" width="20" height="20" rx="6"></rect>
          <path class="summary-module-link" d="M37 37h14M31 47l9 8M57 47l-9 8"></path>
          <circle class="summary-active-dot" cx="67" cy="23" r="6"></circle>
        </svg>
      </span>
    `;
  }

  if (type === "modules-create") {
    return `
      <span class="admin-summary-visual modules-visual-create" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <rect class="summary-module-card card-one" x="19" y="35" width="27" height="21" rx="6"></rect>
          <rect class="summary-module-card card-two" x="29" y="22" width="27" height="21" rx="6"></rect>
          <rect class="summary-module-card card-three" x="39" y="48" width="27" height="21" rx="6"></rect>
          <path class="summary-module-line" d="M27 45h11M37 32h11M47 58h11"></path>
          <circle class="summary-plus-disc" cx="66" cy="61" r="13"></circle>
          <path class="summary-plus" d="M66 53v16M58 61h16"></path>
        </svg>
      </span>
    `;
  }

  if (type === "modules-api" || type === "modules-source") {
    return `
      <span class="admin-summary-visual modules-visual-api" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <rect class="summary-server" x="14" y="22" width="32" height="44" rx="8"></rect>
          <path class="summary-server-line" d="M23 36h14M23 48h14M23 59h10"></path>
          <rect class="summary-module-node node-one" x="61" y="26" width="15" height="15" rx="4"></rect>
          <rect class="summary-module-node node-two" x="61" y="51" width="15" height="15" rx="4"></rect>
          <path class="summary-route route-one" d="M47 35h14"></path>
          <path class="summary-route route-two" d="M47 57h14"></path>
          <circle class="summary-packet packet-one" cx="52" cy="35" r="3"></circle>
          <circle class="summary-packet packet-two" cx="55" cy="57" r="3"></circle>
        </svg>
      </span>
    `;
  }

  if (type === "category-records") {
    return `
      <span class="admin-summary-visual category-visual-records" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <rect class="category-tile tile-one" x="18" y="23" width="22" height="18" rx="5"></rect>
          <rect class="category-tile tile-two" x="48" y="23" width="22" height="18" rx="5"></rect>
          <rect class="category-tile tile-three" x="18" y="50" width="22" height="18" rx="5"></rect>
          <rect class="category-tile tile-four" x="48" y="50" width="22" height="18" rx="5"></rect>
          <path class="category-tag-line" d="M27 32h6M57 32h6M27 59h6M57 59h6"></path>
          <circle class="category-check-disc" cx="67" cy="21" r="9"></circle>
          <path class="category-check" d="M62 21l4 4 8-9"></path>
        </svg>
      </span>
    `;
  }

  if (type === "category-create") {
    return `
      <span class="admin-summary-visual category-visual-create" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <path class="category-folder" d="M16 31h23l6 8h27v29a7 7 0 0 1-7 7H23a7 7 0 0 1-7-7Z"></path>
          <path class="category-folder-lid" d="M16 31h22l6 8h28"></path>
          <path class="category-label" d="M28 53h18M28 62h13"></path>
          <circle class="summary-plus-disc" cx="64" cy="61" r="13"></circle>
          <path class="summary-plus" d="M64 53v16M56 61h16"></path>
        </svg>
      </span>
    `;
  }

  if (type === "category-api") {
    return `
      <span class="admin-summary-visual category-visual-api" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <rect class="summary-server" x="15" y="22" width="32" height="44" rx="8"></rect>
          <path class="summary-server-line" d="M24 36h14M24 48h14M24 59h10"></path>
          <rect class="category-node node-one" x="62" y="23" width="14" height="14" rx="4"></rect>
          <rect class="category-node node-two" x="60" y="52" width="16" height="16" rx="4"></rect>
          <path class="summary-route route-one" d="M48 35h13"></path>
          <path class="summary-route route-two" d="M48 56h12"></path>
          <circle class="summary-packet packet-one" cx="52" cy="35" r="3"></circle>
          <circle class="summary-packet packet-two" cx="55" cy="56" r="3"></circle>
        </svg>
      </span>
    `;
  }

  if (type === "notification-records") {
    return `
      <span class="admin-summary-visual notification-visual-records" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <path class="notification-bell" d="M29 55V42c0-9 6-16 15-16s15 7 15 16v13l7 8H22Z"></path>
          <path class="notification-clapper" d="M39 67c2 5 8 5 10 0"></path>
          <circle class="notification-badge badge-one" cx="61" cy="29" r="7"></circle>
          <circle class="notification-badge badge-two" cx="26" cy="36" r="4"></circle>
          <path class="notification-wave wave-one" d="M22 44c-3-4-3-9 0-13"></path>
          <path class="notification-wave wave-two" d="M66 44c3-4 3-9 0-13"></path>
        </svg>
      </span>
    `;
  }

  if (type === "notification-create") {
    return `
      <span class="admin-summary-visual notification-visual-create" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <rect class="notification-card" x="18" y="26" width="48" height="36" rx="8"></rect>
          <path class="notification-card-line" d="M29 39h24M29 49h17"></path>
          <circle class="summary-plus-disc" cx="64" cy="61" r="13"></circle>
          <path class="summary-plus" d="M64 53v16M56 61h16"></path>
          <path class="notification-send" d="M24 68l14-8-14-8 4 8Z"></path>
        </svg>
      </span>
    `;
  }

  if (type === "notification-api") {
    return `
      <span class="admin-summary-visual notification-visual-api" aria-hidden="true">
        <svg viewBox="0 0 88 88" focusable="false">
          <rect class="summary-server" x="15" y="22" width="32" height="44" rx="8"></rect>
          <path class="summary-server-line" d="M24 36h14M24 48h14M24 59h10"></path>
          <path class="notification-mini-bell" d="M65 50V39c0-5 4-9 9-9s9 4 9 9v11l4 6H61Z"></path>
          <path class="summary-route route-one" d="M48 37h14"></path>
          <path class="summary-route route-two" d="M48 56h13"></path>
          <circle class="summary-packet packet-one" cx="52" cy="37" r="3"></circle>
          <circle class="summary-packet packet-two" cx="55" cy="56" r="3"></circle>
        </svg>
      </span>
    `;
  }

  return iconMarkup("circle");
};

const animatedSummaryCard = ({ key, label, value, type, accent = "black", createTarget = "" }) => {
  const valueTitle = typeof value === "string" && value.includes("/") ? ` title="${escapeHtml(value)}"` : "";
  const content = `
    ${adminSummaryIllustration(type)}
    <div>
      <span>${escapeHtml(label)}</span>
      <b${valueTitle} ${Number.isFinite(Number(value)) ? `data-count="${escapeHtml(value)}" data-count-once="${escapeHtml(key)}-${escapeHtml(type)}"` : ""}>${escapeHtml(value)}</b>
    </div>
  `;

  if (createTarget) {
    return `<button class="stat-chip animated-summary-card accent-${escapeHtml(accent)} ${escapeHtml(key)}-summary-${escapeHtml(type)}" data-open-form="${escapeHtml(createTarget)}" type="button" aria-label="Create ${escapeHtml(entityConfigs[createTarget]?.title?.slice(0, -1) || createTarget)}">${content}</button>`;
  }

  return `<div class="stat-chip animated-summary-card accent-${escapeHtml(accent)} ${escapeHtml(key)}-summary-${escapeHtml(type)}">${content}</div>`;
};

const adminEmptyStateIllustration = (key) => {
  if (key === "categories") {
    return `
      <span class="admin-empty-visual category-empty-visual" aria-hidden="true">
        <svg viewBox="0 0 140 120" focusable="false">
          <path class="empty-folder-back" d="M26 45h34l8 10h48v42a9 9 0 0 1-9 9H35a9 9 0 0 1-9-9Z"></path>
          <path class="empty-folder-front" d="M22 52h96l-10 50a8 8 0 0 1-8 6H36a8 8 0 0 1-8-6Z"></path>
          <rect class="empty-tag tag-one" x="34" y="26" width="30" height="18" rx="5"></rect>
          <rect class="empty-tag tag-two" x="79" y="29" width="28" height="18" rx="5"></rect>
          <circle class="empty-search" cx="94" cy="66" r="16"></circle>
          <path class="empty-search-handle" d="M106 78l11 11"></path>
          <path class="empty-check" d="M87 66l5 5 10-12"></path>
        </svg>
      </span>
    `;
  }

  return `
    <span class="admin-empty-visual notification-empty-visual" aria-hidden="true">
      <svg viewBox="0 0 140 120" focusable="false">
        <path class="empty-bell" d="M55 77V58c0-12 8-21 20-21s20 9 20 21v19l9 11H46Z"></path>
        <path class="empty-clapper" d="M68 92c3 7 11 7 14 0"></path>
        <rect class="empty-message message-one" x="22" y="32" width="34" height="22" rx="7"></rect>
        <rect class="empty-message message-two" x="93" y="38" width="32" height="22" rx="7"></rect>
        <path class="empty-message-line" d="M31 43h16M102 49h13"></path>
        <path class="empty-quiet-wave wave-one" d="M43 65c-5-8-5-16 0-24"></path>
        <path class="empty-quiet-wave wave-two" d="M107 65c5-8 5-16 0-24"></path>
        <circle class="empty-check-disc" cx="99" cy="30" r="10"></circle>
        <path class="empty-check" d="M94 30l4 4 8-9"></path>
      </svg>
    </span>
  `;
};

const renderAnimatedEntityEmptyState = (key) => {
  const title = key === "categories" ? "No categories found" : "No notifications found";
  const singular = key === "categories" ? "Category" : "Notification";

  return `
    <div class="empty-state card admin-animated-empty ${escapeHtml(key)}-empty-state">
      ${adminEmptyStateIllustration(key)}
      <h3>${escapeHtml(title)}</h3>
      <p>Use Create or adjust the filters to add and manage records.</p>
      <button class="btn" data-open-form="${escapeHtml(key)}" type="button">Create ${escapeHtml(singular)}</button>
    </div>
  `;
};

const renderAnimatedEntityLoadingState = (key) => `
  <div class="empty-state card admin-animated-empty admin-animated-loading">
    ${adminEmptyStateIllustration(key)}
    <h3>Loading ${escapeHtml(entityConfigs[key]?.title || "records")}</h3>
    <p>Fetching the latest records from the existing admin API.</p>
  </div>
`;

const aiToolAnimationTypes = [
  { type: "code", keys: ["ai-code-generator", "code", "coding", "developer"] },
  { type: "image", keys: ["ai-image-generator", "image", "art", "design"] },
  { type: "email", keys: ["ai-email-writer", "email", "writer", "writing"] },
  { type: "chat", keys: ["ai-chat", "chat", "conversation", "assistant"] },
  { type: "pdf", keys: ["ai-pdf-summarizer", "pdf", "summarizer", "summary"] },
  { type: "translator", keys: ["ai-translator", "translator", "translate", "language"] },
  { type: "voice", keys: ["ai-voice-generator", "voice", "audio", "speech"] },
];

const getAiToolAnimationType = (item) => {
  const haystack = [item.flowType, item.slug, item.name]
    .map(normalizeAssetKey)
    .filter(Boolean)
    .join(" ");
  const match = aiToolAnimationTypes.find((entry) => entry.keys.some((key) => haystack.includes(key)));
  return match?.type || "neural";
};

const aiToolAnimationSvg = (type) => {
  if (type === "code") {
    return `
      <svg viewBox="0 0 100 100" focusable="false">
        <rect class="anim-panel" x="15" y="18" width="70" height="58" rx="12"></rect>
        <path class="anim-bar" d="M15 34h70"></path>
        <circle class="anim-dot red" cx="27" cy="26" r="3"></circle>
        <circle class="anim-dot green" cx="38" cy="26" r="3"></circle>
        <path class="code-bracket left" d="M34 47l-8 8 8 8"></path>
        <path class="code-bracket right" d="M66 47l8 8-8 8"></path>
        <path class="code-line line-one" d="M43 45h17"></path>
        <path class="code-line line-two" d="M40 55h24"></path>
        <path class="code-line line-three" d="M44 65h12"></path>
        <path class="code-cursor" d="M60 63v8"></path>
      </svg>
    `;
  }

  if (type === "image") {
    return `
      <svg viewBox="0 0 100 100" focusable="false">
        <rect class="anim-panel image-frame" x="16" y="18" width="68" height="58" rx="12"></rect>
        <path class="image-mountain" d="M25 64l17-18 13 13 9-10 12 15"></path>
        <circle class="image-sun" cx="65" cy="38" r="7"></circle>
        <path class="image-scan" d="M24 30h52"></path>
        <path class="image-spark spark-a" d="M24 16v8M20 20h8"></path>
        <path class="image-spark spark-b" d="M82 72v8M78 76h8"></path>
      </svg>
    `;
  }

  if (type === "email") {
    return `
      <svg viewBox="0 0 100 100" focusable="false">
        <rect class="email-paper" x="31" y="22" width="38" height="42" rx="6"></rect>
        <path class="email-writing line-one" d="M39 36h22"></path>
        <path class="email-writing line-two" d="M39 46h17"></path>
        <rect class="anim-panel email-envelope" x="18" y="40" width="64" height="38" rx="9"></rect>
        <path class="email-flap" d="M20 43l30 22 30-22"></path>
        <circle class="typing-dot dot-one" cx="42" cy="68" r="3"></circle>
        <circle class="typing-dot dot-two" cx="50" cy="68" r="3"></circle>
        <circle class="typing-dot dot-three" cx="58" cy="68" r="3"></circle>
      </svg>
    `;
  }

  if (type === "chat") {
    return `
      <svg viewBox="0 0 100 100" focusable="false">
        <path class="chat-bubble bubble-one" d="M18 25h42a10 10 0 0 1 10 10v10a10 10 0 0 1-10 10H37l-12 10v-10h-7a10 10 0 0 1-10-10V35a10 10 0 0 1 10-10Z"></path>
        <path class="chat-bubble bubble-two" d="M39 49h35a9 9 0 0 1 9 9v9a9 9 0 0 1-9 9H58l-10 8v-8h-9a9 9 0 0 1-9-9v-9a9 9 0 0 1 9-9Z"></path>
        <circle class="typing-dot dot-one" cx="30" cy="42" r="3"></circle>
        <circle class="typing-dot dot-two" cx="40" cy="42" r="3"></circle>
        <circle class="typing-dot dot-three" cx="50" cy="42" r="3"></circle>
        <path class="chat-line" d="M48 62h18M48 69h12"></path>
      </svg>
    `;
  }

  if (type === "pdf") {
    return `
      <svg viewBox="0 0 100 100" focusable="false">
        <rect class="pdf-page page-back" x="25" y="18" width="40" height="54" rx="7"></rect>
        <rect class="pdf-page page-front" x="34" y="25" width="42" height="56" rx="7"></rect>
        <text class="pdf-label" x="43" y="43">PDF</text>
        <path class="pdf-long line-one" d="M42 54h25"></path>
        <path class="pdf-long line-two" d="M42 62h25"></path>
        <path class="pdf-short short-one" d="M42 70h14"></path>
        <path class="pdf-short short-two" d="M59 70h8"></path>
      </svg>
    `;
  }

  if (type === "translator") {
    return `
      <svg viewBox="0 0 100 100" focusable="false">
        <circle class="translate-globe" cx="50" cy="50" r="28"></circle>
        <path class="translate-lat" d="M25 50h50M50 22c9 8 13 17 13 28s-4 20-13 28M50 22c-9 8-13 17-13 28s4 20 13 28"></path>
        <path class="translate-arrow arrow-one" d="M25 25h24l-6-6M49 25l-6 6"></path>
        <path class="translate-arrow arrow-two" d="M75 75H51l6 6M51 75l6-6"></path>
        <text class="translate-char char-a" x="29" y="59">A</text>
        <text class="translate-char char-ka" x="60" y="48">あ</text>
      </svg>
    `;
  }

  if (type === "voice") {
    return `
      <svg viewBox="0 0 100 100" focusable="false">
        <rect class="voice-mic" x="39" y="17" width="22" height="44" rx="11"></rect>
        <path class="voice-stand" d="M28 46c0 14 9 23 22 23s22-9 22-23M50 69v12M39 81h22"></path>
        <path class="voice-wave wave-one" d="M72 36c5 6 5 18 0 24"></path>
        <path class="voice-wave wave-two" d="M80 29c10 12 10 27 0 39"></path>
        <path class="voice-bars" d="M22 52v-9M29 56V39M36 58V36"></path>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 100 100" focusable="false">
      <circle class="neural-node node-one" cx="30" cy="34" r="7"></circle>
      <circle class="neural-node node-two" cx="62" cy="26" r="7"></circle>
      <circle class="neural-node node-three" cx="72" cy="61" r="7"></circle>
      <circle class="neural-node node-four" cx="34" cy="70" r="7"></circle>
      <path class="neural-link link-one" d="M36 34l20-6M65 33l6 21M66 63l-25 7M36 64l23-32M39 39l27 19"></path>
      <path class="neural-pulse" d="M36 34l20-6"></path>
    </svg>
  `;
};

const renderAiToolAnimation = (item) => {
  const type = getAiToolAnimationType(item);
  const label = item.name || "AI tool";
  return `
    <span class="ai-tool-card-animation animation-${type}" aria-hidden="true">
      ${aiToolAnimationSvg(type)}
      <span class="ai-tool-card-initials" hidden>${escapeHtml(initials(label))}</span>
    </span>
  `;
};

const renderEntitySummary = (key, count, endpoint) => {
  if (key === "aiTools") {
    return `
      <section class="entity-summary ai-tool-summary-grid">
        ${aiToolSummaryCard("Loaded records", count, "records")}
        ${aiToolSummaryCard("Primary action", "Create", "create")}
        ${aiToolSummaryCard("Data source", endpoint, "source")}
      </section>
    `;
  }

  if (key === "quizzes") {
    return `
      <section class="entity-summary quiz-summary-grid">
        ${quizSummaryCard("Loaded records", count, "records")}
        ${quizSummaryCard("Primary action", "Create", "create")}
        ${quizSummaryCard("Data source", endpoint, "source")}
      </section>
    `;
  }

  if (key === "lessons") {
    return `
      <section class="entity-summary lesson-summary-grid">
        ${lessonSummaryCard("Loaded records", count, "records")}
        ${lessonSummaryCard("Primary action", "Create", "create")}
        ${lessonSummaryCard("Data source", endpoint, "source")}
      </section>
    `;
  }

  if (key === "certificates") {
    return `
      <section class="entity-summary certificate-summary-grid">
        ${certificateSummaryCard("Loaded records", count, "records")}
        ${certificateSummaryCard("Primary action", "Create", "create")}
        ${certificateSummaryCard("Data source", endpoint, "source")}
      </section>
    `;
  }

  if (key === "users" || key === "admins" || key === "courses" || key === "modules" || key === "categories" || key === "notifications") {
    const prefix = key === "categories" ? "category" : key === "notifications" ? "notification" : key;
    return `
      <section class="entity-summary animated-summary-grid ${escapeHtml(key)}-summary-grid">
        ${animatedSummaryCard({ key, label: "Loaded records", value: count, type: `${prefix}-records`, accent: "black" })}
        ${animatedSummaryCard({ key, label: "Primary action", value: "Create", type: `${prefix}-create`, accent: "green", createTarget: key })}
        ${animatedSummaryCard({ key, label: "Data source", value: endpoint, type: `${prefix}-api`, accent: "red" })}
      </section>
    `;
  }

  return `
    <section class="entity-summary">
      ${statChip("Loaded records", count, "database")}
      ${statChip("Primary action", "Create", "plus-circle")}
      ${statChip("Data source", endpoint, "route")}
    </section>
  `;
};

const metaItem = (label, value) => `
  <div class="meta-item">
    <span>${escapeHtml(label)}</span>
    <b>${escapeHtml(value)}</b>
  </div>
`;

const progressBar = (value = 0) => {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  return `
    <div class="progress-track" aria-label="Progress ${safeValue}%">
      <i style="width:${safeValue}%"></i>
    </div>
  `;
};

const cardShell = (key, item, body, extraClass = "") => `
  <article class="entity-card ${key}-card ${extraClass} ${isHighlightedRecord(key, item) ? "record-highlight" : ""}" ${recordDomAttributes(key, item)}>
    ${body}
    <div class="entity-actions">${renderActions(key, item)}</div>
  </article>
`;

const renderUserCard = (item) => {
  const progress = userProgressValue(item);
  const progressLabel = userProgressLabel(item);

  return cardShell("users", item, `
    <div class="entity-head">
      ${state.selectedIds ? `<input class="select-dot" type="checkbox" data-select-id="${escapeHtml(item._id)}" ${state.selectedIds.has(item._id) ? "checked" : ""} aria-label="Select ${escapeHtml(recordTitle(item))}" />` : ""}
      ${avatarMarkup(item.fullName || item.email, item.avatar || item.profileImage)}
      <div>
        <h3>${escapeHtml(item.fullName || "Learner")}</h3>
        <p>${escapeHtml(item.email || "-")}</p>
      </div>
      ${statusPill(item.isActive === false ? "Inactive" : "Active")}
    </div>
    <div class="entity-meta">
      ${metaItem("Role", item.role || "User")}
      ${metaItem("Joined", formatDate(item.createdAt))}
      ${metaItem("Verified", item.isVerified ? "Yes" : "No")}
      ${metaItem("Premium", item.isPremium ? "Yes" : "No")}
    </div>
    <div class="progress-block">
      <div><span>Learning progress</span><b>${escapeHtml(progressLabel)}</b></div>
      ${progressBar(progress)}
    </div>
  `);
};

const userPipelineStages = [
  { key: "new", label: "New", tone: "blue" },
  { key: "open", label: "Open", tone: "purple" },
  { key: "inProgress", label: "In-progress", tone: "green" },
  { key: "premium", label: "Premium", tone: "amber" },
  { key: "closed", label: "Closed", tone: "pink" },
];

const hasUserProgressData = (item) =>
  [item.progressPercentage, item.learningProgress, item.progress?.progressPercentage]
    .some((value) => value !== undefined && value !== null && value !== "");

const userProgressValue = (item) =>
  Math.max(0, Math.min(100, Number(item.progressPercentage || item.learningProgress || item.progress?.progressPercentage || 0)));

const userProgressLabel = (item) =>
  hasUserProgressData(item) ? `${userProgressValue(item)}%` : "No progress data";

const userPipelineStageKey = (item) => {
  const progress = userProgressValue(item);

  if (item.isActive === false) return "closed";
  if (progress >= 100) return "closed";
  if (item.isPremium) return "premium";
  if (progress > 0) return "inProgress";
  if (item.isVerified) return "open";
  return "new";
};

const renderUserPipelineRow = (item) => {
  const progress = userProgressValue(item);
  const progressLabel = userProgressLabel(item);
  const stage = userPipelineStageKey(item);
  const stageIndex = userPipelineStages.findIndex((pipelineStage) => pipelineStage.key === stage);
  const joinedLabel = formatDate(item.createdAt);
  const verifiedLabel = item.isVerified ? "Verified" : "Unverified";
  const premiumLabel = item.isPremium ? "Premium" : "Free";
  const activeLabel = item.isActive === false ? "Inactive" : "Active";

  return `
    <article class="user-pipeline-row user-stage-${stage} ${isHighlightedRecord("users", item) ? "record-highlight" : ""}" ${recordDomAttributes("users", item)}>
      <div class="user-pipeline-select">
        ${state.selectedIds ? `<input class="select-dot" type="checkbox" data-select-id="${escapeHtml(item._id)}" ${state.selectedIds.has(item._id) ? "checked" : ""} aria-label="Select ${escapeHtml(recordTitle(item))}" />` : ""}
      </div>
      <div class="user-pipeline-person">
        ${avatarMarkup(item.fullName || item.email, item.avatar || item.profileImage)}
        <div>
          <h3>${escapeHtml(item.fullName || "Learner")}</h3>
          <p>${iconMarkup("mail")}<span>${escapeHtml(item.email || "-")}</span></p>
          <small>${iconMarkup("calendar-days")}<span>${escapeHtml(joinedLabel)}</span></small>
        </div>
      </div>
      <div class="user-pipeline-line" aria-label="${escapeHtml(recordTitle(item))} pipeline stage ${escapeHtml(stage)}">
        ${userPipelineStages.map((pipelineStage, index) => `
          <span class="pipeline-step stage-${pipelineStage.tone} ${index < stageIndex ? "is-complete" : ""} ${index === stageIndex ? "is-active" : ""}">
            <i aria-hidden="true"></i>
            <b>${escapeHtml(pipelineStage.label)}</b>
          </span>
        `).join("")}
      </div>
      <div class="user-pipeline-meta">
        ${statusPill(activeLabel)}
        <span>${escapeHtml(verifiedLabel)}</span>
        <span>${escapeHtml(premiumLabel)}</span>
        <div class="user-pipeline-progress">
          <div><span>${escapeHtml(item.role || "User")}</span><b>${escapeHtml(progressLabel)}</b></div>
          ${progressBar(progress)}
        </div>
      </div>
      <div class="entity-actions user-pipeline-actions">${renderActions("users", item)}</div>
    </article>
  `;
};

const renderUsersTable = (items, isEmpty) => {
  const counts = userPipelineStages.map((stage) => ({
    ...stage,
    count: items.filter((item) => userPipelineStageKey(item) === stage.key).length,
  }));

  return `
  <section class="users-pipeline-section reveal">
    <div class="users-pipeline-toolbar">
      <div class="users-pipeline-summary">
        ${counts.map((stage) => `
          <span class="pipeline-summary-pill stage-${stage.tone}">
            <i aria-hidden="true"></i>
            ${escapeHtml(stage.label)}
            <b>${escapeHtml(stage.count)} USERS</b>
          </span>
        `).join("")}
      </div>
      <button class="btn secondary" data-open-form="users" type="button">${iconMarkup("plus", "Add user")}</button>
    </div>
    <div class="users-pipeline-rows">
      ${items.map(renderUserPipelineRow).join("") || `
        <div class="users-pipeline-empty">
          ${iconMarkup("user-plus")}
          <span>No users in this pipeline</span>
        </div>
      `}
    </div>
    ${isEmpty ? `
      <div class="empty-state">
        ${iconMarkup("inbox")}
        <h3>No users found</h3>
        <p>Use Create or adjust the filters to add and manage records.</p>
      </div>
    ` : ""}
  </section>
  `;
};

const renderAdminCard = (item) =>
  cardShell("admins", item, `
    <div class="entity-head">
      ${avatarMarkup(item.fullName || item.email, item.avatar || item.profileImage, "avatar-admin")}
      <div>
        <h3>${escapeHtml(item.fullName || "Admin")}</h3>
        <p>${escapeHtml(item.email || "-")}</p>
      </div>
      ${statusPill(item.isActive === false ? "Inactive" : "Active")}
    </div>
    <div class="permission-band">
      <span>${escapeHtml(item.role || "admin")}</span>
      <b>${escapeHtml(item.role === "superadmin" ? "Full workspace access" : "Operational access")}</b>
    </div>
    <div class="entity-meta">
      ${metaItem("Role", item.role || "admin")}
      ${metaItem("Last login", formatDate(item.lastLogin))}
      ${metaItem("Joined", formatDate(item.createdAt))}
    </div>
  `);

const renderCourseCard = (item) => {
  const image = getCourseImageSource(item);

  return `<article class="course-management-card ${isHighlightedRecord("courses", item) ? "record-highlight" : ""}" ${recordDomAttributes("courses", item)}>
    <div class="course-card-top">
      <span class="course-card-thumb ${image.fitClass === "course-image-cover" ? "is-cover" : ""}">
        <img
          class="${escapeHtml(image.fitClass)}"
          src="${escapeHtml(image.src)}"
          data-fallback-src="${escapeHtml(image.fallback)}"
          data-initials="${escapeHtml(image.initials)}"
          alt="${escapeHtml(item.title || "Course")} course image"
          loading="lazy"
          onload="this.classList.add('is-loaded');"
          onerror="if(this.dataset.errorStage==='fallback'){this.hidden=true;this.parentElement.classList.add('show-initials');return;}this.dataset.errorStage='fallback';this.src=this.dataset.fallbackSrc;this.classList.remove('course-image-cover');this.classList.add('course-image-contain');this.parentElement.classList.remove('is-cover');"
        />
        <span class="course-card-initials" aria-hidden="true">${escapeHtml(image.initials)}</span>
      </span>
      <div class="course-card-heading">
        <h3>${escapeHtml(item.title || "Untitled course")}</h3>
        <div class="course-card-badges" aria-label="Course state">
          <span class="pill muted">${escapeHtml(item.level || "Course")}</span>
          ${statusPill(item.status)}
        </div>
      </div>
    </div>

    <p class="course-card-description">${escapeHtml(compactText(item.shortDescription || item.description, item.slug || "Managed course"))}</p>

    <dl class="course-card-meta">
      <div>
        <dt>Duration</dt>
        <dd>${escapeHtml(`${Number(item.duration || 0)} min`)}</dd>
      </div>
      <div>
        <dt>Students</dt>
        <dd>${escapeHtml(item.enrolledUsers || item.students || item.learners || "-")}</dd>
      </div>
      <div>
        <dt>Price</dt>
        <dd>${escapeHtml(item.isFree ? "Free" : `Rs ${Number(item.price || 0)}`)}</dd>
      </div>
      <div>
        <dt>Updated</dt>
        <dd>${escapeHtml(formatDate(item.updatedAt || item.createdAt))}</dd>
      </div>
    </dl>

    <div class="course-card-actions">
      ${renderCourseCardActions(item)}
    </div>
  </article>`;
};

const renderCourseCardActions = (item) => {
  const id = escapeHtml(item._id);
  const busy = state.loading ? "disabled aria-disabled=\"true\" aria-busy=\"true\"" : "";
  const isPublished = String(item.status || "").toLowerCase() === "published";
  const publishLabel = isPublished ? "Unpublish" : "Publish";
  const nextStatus = isPublished ? "draft" : "published";
  const button = (label, attributes, className = "mini", icon = "circle") =>
    `<button class="${className}" ${attributes} ${busy} type="button">${iconMarkup(icon, label)}</button>`;

  return `
    ${button("Edit", `data-edit-record="courses:${id}" aria-label="Edit ${escapeHtml(item.title || "course")}"`, "mini secondary-action edit-action", "pencil")}
    ${button(publishLabel, `data-status-record="courses:${id}:${nextStatus}" aria-label="${publishLabel} ${escapeHtml(item.title || "course")}"`, "mini primary-action", isPublished ? "eye-off" : "send")}
    ${button("Archive", `data-status-record="courses:${id}:archived" aria-label="Archive ${escapeHtml(item.title || "course")}"`, "mini secondary-action", "archive")}
    ${button("Duplicate", `data-duplicate-record="courses:${id}" aria-label="Duplicate ${escapeHtml(item.title || "course")}"`, "mini secondary-action", "copy")}
    ${button("Delete", `data-delete-record="courses:${id}" aria-label="Delete ${escapeHtml(item.title || "course")}"`, "mini secondary-action danger-text", "trash-2")}
  `;
};

const renderCoursesSkeleton = () => `
  <section class="courses-grid-card card reveal" aria-label="Loading courses">
    <div class="course-card-grid">
      ${Array.from({ length: 6 }).map(() => `
        <article class="course-management-card course-card-skeleton" aria-hidden="true">
          <div class="course-card-top">
            <span class="course-skeleton-thumb"></span>
            <div class="course-skeleton-stack">
              <span></span>
              <span></span>
            </div>
          </div>
          <span class="course-skeleton-line wide"></span>
          <span class="course-skeleton-line"></span>
          <div class="course-skeleton-meta">
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="course-skeleton-actions">
            <span></span><span></span>
          </div>
        </article>
      `).join("")}
    </div>
  </section>
`;

const renderCoursesGrid = (items, isEmpty) => {
  if (state.loading && isEmpty) return renderCoursesSkeleton();

  if (state.error) {
    return `
      <section class="courses-grid-card card reveal">
        <div class="course-state-card" role="alert">
          ${iconMarkup("alert-circle")}
          <h3>Unable to load courses</h3>
          <p>${escapeHtml(state.error)}</p>
          <button class="btn" data-refresh="courses" type="button">Retry</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="courses-grid-card card reveal">
      <div class="course-card-grid">
        ${items.map((item) => renderCourseCard(item)).join("")}
      </div>
      ${isEmpty ? `
        <div class="course-state-card empty-state">
          ${iconMarkup("inbox")}
          <h3>No courses found</h3>
          <p>Use Create or adjust the filters to add and manage records.</p>
        </div>
      ` : ""}
    </section>
  `;
};

const moduleIconLabel = (item) => {
  const order = Number(item.order || 0);
  if (order > 0 && order < 100) return `M${String(order).padStart(2, "0")}`;
  return "M";
};

const renderModuleCard = (item) => {
  const title = item.title || "Untitled module";
  const description = compactText(item.description, "Structured module content");
  const courseTitle = plainValue(item, "course.title", "No course linked");

  return `<article class="module-management-card ${isHighlightedRecord("modules", item) ? "record-highlight" : ""}" ${recordDomAttributes("modules", item)}>
    <div class="module-card-top">
      <span class="module-card-icon" aria-hidden="true">${escapeHtml(moduleIconLabel(item))}</span>
      <div class="module-card-heading">
        <p class="module-card-kicker">Module ${escapeHtml(item.order || "-")}</p>
        <h3 title="${escapeHtml(title)}">${escapeHtml(title)}</h3>
      </div>
    </div>

    <p class="module-card-description" title="${escapeHtml(description)}">${escapeHtml(description)}</p>

    <div class="module-card-status">
      ${statusPill(item.status)}
    </div>

    <dl class="module-card-meta">
      <div>
        <dt>Course</dt>
        <dd title="${escapeHtml(courseTitle)}">${escapeHtml(courseTitle)}</dd>
      </div>
      <div>
        <dt>Lessons</dt>
        <dd>${escapeHtml(item.lessonCount || item.lessons?.length || "-")}</dd>
      </div>
      <div>
        <dt>Duration</dt>
        <dd>${escapeHtml(`${Number(item.duration || 0)} min`)}</dd>
      </div>
      <div>
        <dt>Order</dt>
        <dd>${escapeHtml(item.order || "-")}</dd>
      </div>
    </dl>

    <div class="module-card-actions">
      ${renderModuleCardActions(item)}
    </div>
  </article>`;
};

const renderModuleCardActions = (item) => {
  const id = escapeHtml(item._id);
  const status = String(item.status || "").toLowerCase();
  const isPublished = status === "published";
  const isArchived = status === "archived";
  const busy = state.loading ? "disabled aria-disabled=\"true\" aria-busy=\"true\"" : "";
  const loader = state.loading ? `<span class="module-button-loader" aria-hidden="true"></span>` : "";
  const button = (label, attributes, className = "mini", icon = "circle", disabled = false) =>
    `<button class="${className}" ${attributes} ${busy} ${disabled ? "disabled aria-disabled=\"true\"" : ""} type="button">${loader || iconMarkup(icon)}<span>${escapeHtml(label)}</span></button>`;

  const publishButton = isPublished
    ? button("Unpublish", `data-status-record="modules:${id}:draft" aria-label="Unpublish ${escapeHtml(item.title || "module")}"`, "mini module-action unpublish-action", "eye-off")
    : button("Publish", `data-status-record="modules:${id}:published" aria-label="Publish ${escapeHtml(item.title || "module")}" title="${isArchived ? "Archived modules can be restored from Edit before publishing." : ""}"`, "mini module-action publish-action", "send", isArchived);

  return `
    ${button("Edit", `data-edit-record="modules:${id}" aria-label="Edit ${escapeHtml(item.title || "module")}"`, "mini module-action edit-action", "pencil")}
    ${publishButton}
    ${button("Archive", `data-status-record="modules:${id}:archived" aria-label="Archive ${escapeHtml(item.title || "module")}"`, "mini module-action archive-action", "archive", isArchived)}
    ${button("Delete", `data-delete-record="modules:${id}" aria-label="Delete ${escapeHtml(item.title || "module")}"`, "mini module-action delete-action", "trash-2")}
  `;
};

const renderModulesSkeleton = () => `
  <section class="modules-grid-card card reveal" aria-label="Loading modules">
    <div class="module-card-grid">
      ${Array.from({ length: 6 }).map(() => `
        <article class="module-management-card module-card-skeleton" aria-hidden="true">
          <div class="module-card-top">
            <span class="module-skeleton-icon"></span>
            <div class="module-skeleton-stack">
              <span></span>
              <span></span>
            </div>
          </div>
          <span class="module-skeleton-line wide"></span>
          <span class="module-skeleton-line"></span>
          <div class="module-skeleton-meta">
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="module-skeleton-actions">
            <span></span><span></span><span></span><span></span>
          </div>
        </article>
      `).join("")}
    </div>
  </section>
`;

const renderModulesGrid = (items, isEmpty) => {
  if (state.loading && isEmpty) return renderModulesSkeleton();

  if (state.error) {
    return `
      <section class="modules-grid-card card reveal">
        <div class="module-state-card" role="alert">
          ${iconMarkup("alert-circle")}
          <h3>Unable to load modules</h3>
          <p>${escapeHtml(state.error)}</p>
          <button class="btn" data-refresh="modules" type="button">Retry</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="modules-grid-card card reveal">
      <div class="module-card-grid">
        ${items.map((item) => renderModuleCard(item)).join("")}
      </div>
      ${isEmpty ? `
        <div class="module-state-card empty-state">
          ${iconMarkup("inbox")}
          <h3>No modules found</h3>
          <p>Use Create or adjust the filters to add and manage records.</p>
        </div>
      ` : ""}
    </section>
  `;
};

const lessonIconLabel = (item) => {
  const order = Number(item.order || 0);
  if (order > 0 && order < 100) return `L${String(order).padStart(2, "0")}`;
  return "L";
};

const getLessonType = (item) => {
  const explicitType = item.contentType || item.lessonType || item.type;
  if (explicitType) return String(explicitType).replace(/[-_]+/g, " ");
  if (item.videoUrl) return "Video";
  if (item.quiz || item.quizId) return "Quiz";
  if (item.audioUrl) return "Audio";
  if (item.documentUrl || item.pdfUrl) return "Document";
  if (item.content) return "Reading";
  return "Lesson";
};

const hasLessonPreview = (item) => Boolean(item.isPreview);

const renderPreviewValue = (enabled) => `
  <span class="lesson-preview-value ${enabled ? "is-available" : "is-unavailable"}">
    <span aria-hidden="true"></span>${enabled ? "Yes" : "No"}
  </span>
`;

const renderLessonCard = (item) => {
  const title = item.title || "Untitled lesson";
  const description = compactText(item.description || item.content, "Lesson content");
  const courseTitle = plainValue(item, "course.title", "No course linked");
  const moduleTitle = plainValue(item, "module.title", "Course lesson");
  const lessonType = getLessonType(item);
  const previewEnabled = hasLessonPreview(item);

  return `<article class="lesson-management-card ${isHighlightedRecord("lessons", item) ? "record-highlight" : ""}" ${recordDomAttributes("lessons", item)}>
    <div class="lesson-card-top">
      <span class="lesson-card-icon" aria-hidden="true">${escapeHtml(lessonIconLabel(item))}</span>
      <div class="lesson-card-heading">
        <p class="lesson-card-kicker">${escapeHtml(lessonType)}</p>
        <h3 title="${escapeHtml(title)}">${escapeHtml(title)}</h3>
      </div>
    </div>

    <p class="lesson-card-description" title="${escapeHtml(description)}">${escapeHtml(description)}</p>

    <div class="lesson-card-badges">
      ${statusPill(item.status)}
      <span class="lesson-type-badge">${escapeHtml(lessonType)}</span>
    </div>

    <dl class="lesson-card-meta">
      <div>
        <dt>Course</dt>
        <dd title="${escapeHtml(courseTitle)}">${escapeHtml(courseTitle)}</dd>
      </div>
      <div>
        <dt>Module</dt>
        <dd title="${escapeHtml(moduleTitle)}">${escapeHtml(moduleTitle)}</dd>
      </div>
      <div>
        <dt>Duration</dt>
        <dd>${escapeHtml(`${Number(item.duration || 0)} min`)}</dd>
      </div>
      <div>
        <dt>Order</dt>
        <dd>${escapeHtml(item.order || "-")}</dd>
      </div>
      <div>
        <dt>Type</dt>
        <dd>${escapeHtml(lessonType)}</dd>
      </div>
      <div>
        <dt>Preview</dt>
        <dd>${renderPreviewValue(previewEnabled)}</dd>
      </div>
    </dl>

    <div class="lesson-card-actions">
      ${renderLessonCardActions(item)}
    </div>
  </article>`;
};

const renderLessonCardActions = (item) => {
  const id = escapeHtml(item._id);
  const status = String(item.status || "").toLowerCase();
  const isPublished = status === "published";
  const isArchived = status === "archived";
  const previewEnabled = hasLessonPreview(item);
  const busy = state.loading ? "disabled aria-disabled=\"true\" aria-busy=\"true\"" : "";
  const loader = state.loading ? `<span class="lesson-button-loader" aria-hidden="true"></span>` : "";
  const button = (label, attributes, className = "mini", icon = "circle", disabled = false) =>
    `<button class="${className}" ${attributes} ${busy} ${disabled ? "disabled aria-disabled=\"true\"" : ""} type="button">${loader || iconMarkup(icon)}<span>${escapeHtml(label)}</span></button>`;

  const publishButton = isPublished
    ? button("Unpublish", `data-status-record="lessons:${id}:draft" aria-label="Unpublish ${escapeHtml(item.title || "lesson")}"`, "mini lesson-action unpublish-action", "eye-off")
    : button("Publish", `data-status-record="lessons:${id}:published" aria-label="Publish ${escapeHtml(item.title || "lesson")}" title="${isArchived ? "Archived lessons can be restored from Edit before publishing." : ""}"`, "mini lesson-action publish-action", "send", isArchived);

  return `
    ${button("Edit", `data-edit-record="lessons:${id}" aria-label="Edit ${escapeHtml(item.title || "lesson")}"`, "mini lesson-action edit-action", "pencil")}
    ${button("Preview", `data-preview-lesson="${id}" aria-label="Preview ${escapeHtml(item.title || "lesson")}" title="${previewEnabled ? "Preview lesson" : "Preview is disabled for this lesson."}"`, "mini lesson-action preview-action", "eye", !previewEnabled)}
    ${publishButton}
    ${button("Archive", `data-status-record="lessons:${id}:archived" aria-label="Archive ${escapeHtml(item.title || "lesson")}"`, "mini lesson-action archive-action", "archive", isArchived)}
    ${button("Delete", `data-delete-record="lessons:${id}" aria-label="Delete ${escapeHtml(item.title || "lesson")}"`, "mini lesson-action delete-action", "trash-2")}
  `;
};

const renderLessonsSkeleton = () => `
  <section class="lessons-grid-card card reveal" aria-label="Loading lessons">
    <div class="lesson-card-grid">
      ${Array.from({ length: 6 }).map(() => `
        <article class="lesson-management-card lesson-card-skeleton" aria-hidden="true">
          <div class="lesson-card-top">
            <span class="lesson-skeleton-icon"></span>
            <div class="lesson-skeleton-stack">
              <span></span>
              <span></span>
            </div>
          </div>
          <span class="lesson-skeleton-line wide"></span>
          <span class="lesson-skeleton-line"></span>
          <div class="lesson-skeleton-meta">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
          <div class="lesson-skeleton-actions">
            <span></span><span></span><span></span><span></span>
          </div>
        </article>
      `).join("")}
    </div>
  </section>
`;

const renderLessonsGrid = (items, isEmpty) => {
  if (state.loading && isEmpty) return renderLessonsSkeleton();

  if (state.error) {
    return `
      <section class="lessons-grid-card card reveal">
        <div class="lesson-state-card" role="alert">
          ${iconMarkup("alert-circle")}
          <h3>Unable to load lessons</h3>
          <p>${escapeHtml(state.error)}</p>
          <button class="btn" data-refresh="lessons" type="button">Retry</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="lessons-grid-card card reveal">
      <div class="lesson-card-grid">
        ${items.map((item) => renderLessonCard(item)).join("")}
      </div>
      ${isEmpty ? `
        <div class="lesson-state-card empty-state">
          ${iconMarkup("inbox")}
          <h3>No lessons found</h3>
          <p>Use Create or adjust the filters to add and manage records.</p>
        </div>
      ` : ""}
    </section>
  `;
};

const hasValue = (value) => value !== undefined && value !== null && value !== "";

const quizQuestionCount = (item) => {
  if (Array.isArray(item.questions)) return item.questions.length;
  if (hasValue(item.questionCount)) return item.questionCount;
  if (hasValue(item.questionsCount)) return item.questionsCount;
  if (hasValue(item.totalQuestions)) return item.totalQuestions;
  return "—";
};

const quizTotalMarks = (item) => {
  if (hasValue(item.totalMarks)) return item.totalMarks;
  if (Array.isArray(item.questions)) {
    const total = item.questions.reduce((sum, question) => sum + Number(question?.marks || 0), 0);
    return total;
  }
  return "—";
};

const quizDuration = (item) => {
  const value = item.timeLimit ?? item.duration ?? item.durationMinutes;
  return hasValue(value) ? `${value} min` : "—";
};

const quizStatusDetails = (status) => {
  const normalized = String(status || "draft").toLowerCase();
  if (normalized === "published") return { label: "Published", className: "published", icon: "check-circle-2" };
  if (normalized === "archived") return { label: "Archived", className: "archived", icon: "archive" };
  if (normalized === "unpublished") return { label: "Unpublished", className: "archived", icon: "circle-off" };
  return { label: "Draft", className: "draft", icon: "circle" };
};

const quizStatBox = (label, value, icon) => `
  <div class="quiz-stat-box">
    <span class="quiz-stat-icon" aria-hidden="true">${iconMarkup(icon)}</span>
    <span>${escapeHtml(label)}</span>
    <b>${escapeHtml(value)}</b>
  </div>
`;

const renderQuizStatusPill = (status) => {
  const details = quizStatusDetails(status);
  return `
    <span class="quiz-status-pill ${details.className}">
      ${iconMarkup(details.icon)}
      <span>${escapeHtml(details.label)}</span>
    </span>
  `;
};

const renderQuizCardActions = (item) => {
  const status = String(item.status || "draft").toLowerCase();
  const isPublished = status === "published";
  const isArchived = status === "archived";
  const busy = state.loading ? "disabled aria-disabled=\"true\" aria-busy=\"true\"" : "";
  const id = escapeHtml(item._id);
  const publishLabel = isPublished ? "Unpublish" : "Publish";
  const publishStatus = isPublished ? "draft" : "published";
  const archiveLabel = isArchived ? "Restore" : "Archive";
  const archiveStatus = isArchived ? "draft" : "archived";
  const actionButton = (label, attributes, className, icon) => `
    <button class="quiz-action ${className}" ${attributes} ${busy} type="button" aria-label="${escapeHtml(`${label} ${item.title || "quiz"}`)}">
      ${iconMarkup(icon, label)}
    </button>
  `;

  return `
    <div class="quiz-card-actions">
      ${actionButton("View", `data-view-record="quizzes:${id}"`, "view-action", "eye")}
      ${actionButton("Edit", `data-edit-record="quizzes:${id}"`, "edit-action", "pencil")}
      ${actionButton(publishLabel, `data-status-record="quizzes:${id}:${publishStatus}"`, isPublished ? "unpublish-action" : "publish-action", isPublished ? "circle-off" : "upload")}
      ${actionButton(archiveLabel, `data-status-record="quizzes:${id}:${archiveStatus}"`, isArchived ? "restore-action" : "archive-action", isArchived ? "rotate-ccw" : "archive")}
      ${actionButton("Delete", `data-delete-record="quizzes:${id}"`, "delete-action", "trash-2")}
    </div>
  `;
};

const renderQuizCard = (item) => {
  const courseName = plainValue(item, "course.title", item.courseName || "Course quiz");
  const title = item.title || "Untitled quiz";
  const description = compactText(item.description, "Questions, options, and answers are stored from the quiz API.");

  return `<article class="quiz-management-card ${isHighlightedRecord("quizzes", item) ? "record-highlight" : ""}" ${recordDomAttributes("quizzes", item)}>
    <div class="quiz-card-head">
      <span class="quiz-card-icon" aria-hidden="true">Q</span>
      <div class="quiz-card-copy">
        <p class="quiz-card-course" title="${escapeHtml(courseName)}">${escapeHtml(courseName)}</p>
        <h3 title="${escapeHtml(title)}">${escapeHtml(title)}</h3>
        <p class="quiz-card-description" title="${escapeHtml(description)}">${escapeHtml(description)}</p>
      </div>
      ${renderQuizStatusPill(item.status)}
    </div>
    <div class="quiz-stat-grid">
      ${quizStatBox("Questions", quizQuestionCount(item), "circle-help")}
      ${quizStatBox("Marks", quizTotalMarks(item), "star")}
      ${quizStatBox("Pass", hasValue(item.passingMarks) ? item.passingMarks : "—", "target")}
      ${quizStatBox("Time", quizDuration(item), "clock")}
    </div>
    ${renderQuizCardActions(item)}
  </article>`;
};

const renderQuizzesSkeleton = () => `
  <section class="quizzes-grid-card card reveal" aria-label="Loading quizzes">
    <div class="quiz-card-grid">
      ${Array.from({ length: 4 }).map(() => `
        <article class="quiz-management-card quiz-card-skeleton" aria-hidden="true">
          <div class="quiz-card-head">
            <span class="quiz-card-icon"></span>
            <div class="quiz-card-copy">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <div class="quiz-stat-grid">
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="quiz-card-actions">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
        </article>
      `).join("")}
    </div>
  </section>
`;

const renderQuizzesGrid = (items, isEmpty) => {
  if (state.loading && isEmpty) return renderQuizzesSkeleton();
  if (state.error && isEmpty) {
    return `
      <section class="quizzes-grid-card card reveal">
        <div class="quiz-state-card" role="alert">
          ${iconMarkup("circle-alert")}
          <h3>Unable to load quizzes</h3>
          <p>${escapeHtml(state.error)}</p>
          <button class="btn secondary" data-refresh="quizzes" type="button">${iconMarkup("refresh-cw", "Retry")}</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="quizzes-grid-card card reveal">
      <div class="quiz-card-grid">
        ${items.map((item) => renderQuizCard(item)).join("")}
      </div>
      ${isEmpty ? `
        <div class="quiz-state-card empty-state">
          ${iconMarkup("inbox")}
          <h3>No quizzes found</h3>
          <p>Use Create or adjust the filters to add and manage records.</p>
        </div>
      ` : ""}
    </section>
  `;
};

const aiToolStatusDetails = (status) => {
  const normalized = String(status || "active").toLowerCase();
  if (normalized === "active") return { label: "Active", className: "active" };
  if (normalized === "draft") return { label: "Draft", className: "draft" };
  return { label: normalized === "inactive" ? "Inactive" : "Inactive", className: "inactive" };
};

const aiToolApiDetails = (item) => {
  if (hasValue(item.apiEndpoint)) return { label: "Connected", className: "connected" };
  return { label: "Disconnected", className: "disconnected" };
};

const formatAiToolWebsite = (item) => {
  const url = String(item.websiteUrl || "").trim();
  if (!url) return "Unavailable";
  return /^https?:\/\//i.test(url) ? "Ready" : url;
};

const aiToolBadge = (label, className) => `
  <span class="ai-tool-badge ${className}">
    <i aria-hidden="true"></i>
    <span>${escapeHtml(label)}</span>
  </span>
`;

const aiToolMetaBox = (label, value, className = "") => `
  <div class="ai-tool-meta-box ${className}">
    <dt>${escapeHtml(label)}</dt>
    <dd title="${escapeHtml(value)}">${escapeHtml(value)}</dd>
  </div>
`;

const renderAiToolCardActions = (item) => {
  const actions = entityConfigs.aiTools.actions || [];
  const status = String(item.status || "active").toLowerCase();
  const isActive = status === "active";
  const isFeatured = Boolean(item.isFeatured);
  const busy = state.loading ? "disabled aria-disabled=\"true\" aria-busy=\"true\"" : "";
  const id = escapeHtml(item._id);
  const title = item.name || "AI tool";
  const actionButton = (label, attributes, className, icon) => `
    <button class="ai-tool-action ${className}" ${attributes} ${busy} type="button" aria-label="${escapeHtml(`${label} ${title}`)}">
      ${iconMarkup(icon, label)}
    </button>
  `;

  return `
    <div class="ai-tool-card-actions">
      ${actions.includes("edit") ? actionButton("Edit", `data-edit-record="aiTools:${id}"`, "edit-action", "pencil") : ""}
      ${actions.includes("feature") ? actionButton(isFeatured ? "Unfeature" : "Feature", `data-tool-feature="${id}:${isFeatured ? "false" : "true"}"`, isFeatured ? "unfeature-action" : "feature-action", "star") : ""}
      ${actions.includes("hide") ? actionButton(isActive ? "Deactivate" : "Activate", `data-tool-hide="${id}:${isActive ? "inactive" : "active"}"`, isActive ? "deactivate-action" : "activate-action", isActive ? "eye-off" : "eye") : ""}
      ${actions.includes("delete") ? actionButton("Delete", `data-delete-record="aiTools:${id}"`, "delete-action", "trash-2") : ""}
    </div>
  `;
};

const renderToolCard = (item) => {
  const status = aiToolStatusDetails(item.status);
  const api = aiToolApiDetails(item);
  const name = item.name || "AI tool";
  const description = item.description || item.slug || "Managed AI tool";
  const flow = item.flowType || "—";
  const pricing = item.pricingType || "—";
  const category = plainValue(item, "category.name", item.category || "—");
  const featured = item.isFeatured ? "Yes" : "No";
  const website = formatAiToolWebsite(item);

  return `<article class="ai-tool-management-card ${isHighlightedRecord("aiTools", item) ? "record-highlight" : ""}" ${recordDomAttributes("aiTools", item)}>
    <div class="ai-tool-card-head">
      ${renderAiToolAnimation(item)}
      <div class="ai-tool-card-copy">
        <h3 title="${escapeHtml(name)}">${escapeHtml(name)}</h3>
        <p title="${escapeHtml(description)}">${escapeHtml(description)}</p>
      </div>
      ${aiToolBadge(status.label, status.className)}
    </div>

    <dl class="ai-tool-meta-grid">
      ${aiToolMetaBox("Flow", flow, "flow-value")}
      ${aiToolMetaBox("API", api.label, api.className)}
      ${aiToolMetaBox("Pricing", pricing)}
      ${aiToolMetaBox("Category", category)}
      ${aiToolMetaBox("Featured", featured, item.isFeatured ? "featured-yes" : "featured-no")}
      ${aiToolMetaBox("Website", website, website === "Ready" ? "website-ready" : "website-unavailable")}
    </dl>

    ${renderAiToolCardActions(item)}
  </article>`;
};

const renderAiToolsSkeleton = () => `
  <section class="ai-tools-grid-card card reveal" aria-label="Loading AI tools">
    <div class="ai-tool-card-grid">
      ${Array.from({ length: 6 }).map(() => `
        <article class="ai-tool-management-card ai-tool-card-skeleton" aria-hidden="true">
          <div class="ai-tool-card-head">
            <span class="ai-tool-card-animation"></span>
            <div class="ai-tool-card-copy"><span></span><span></span><span></span></div>
          </div>
          <dl class="ai-tool-meta-grid"><span></span><span></span><span></span><span></span><span></span><span></span></dl>
          <div class="ai-tool-card-actions"><span></span><span></span><span></span><span></span></div>
        </article>
      `).join("")}
    </div>
  </section>
`;

const renderAiToolsGrid = (items, isEmpty) => {
  if (state.loading && isEmpty) return renderAiToolsSkeleton();
  if (state.error && isEmpty) {
    return `
      <section class="ai-tools-grid-card card reveal">
        <div class="ai-tool-state-card" role="alert">
          ${iconMarkup("circle-alert")}
          <h3>Unable to load AI tools</h3>
          <p>${escapeHtml(state.error)}</p>
          <button class="btn secondary" data-refresh="aiTools" type="button">${iconMarkup("refresh-cw", "Retry")}</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="ai-tools-grid-card card reveal">
      <div class="ai-tool-card-grid">
        ${items.map((item) => renderToolCard(item)).join("")}
      </div>
      ${isEmpty ? `
        <div class="ai-tool-state-card empty-state">
          ${iconMarkup("inbox")}
          <h3>No AI tools found</h3>
          <p>Use Create or adjust the filters to add and manage records.</p>
        </div>
      ` : ""}
    </section>
  `;
};

const renderGenericCard = (key, item) => {
  const config = entityConfigs[key];
  return cardShell(key, item, `
    <div class="entity-head">
      ${avatarMarkup(recordTitle(item), "", `avatar-${key}`)}
      <div>
        <p class="eyebrow">${escapeHtml(config.title.slice(0, -1) || config.title)}</p>
        <h3>${escapeHtml(recordTitle(item))}</h3>
        <p>${escapeHtml(item.description || item.message || item.email || item.slug || "Managed record")}</p>
      </div>
      ${statusPill(item.status || (item.isActive === false ? "Inactive" : "Active"))}
    </div>
    <div class="entity-meta">
      ${config.columns.slice(0, 4).map((column) => metaItem(column.label, formatCell(item, column).replace(/<[^>]*>/g, ""))).join("")}
    </div>
  `);
};

const renderEntityCard = (key, item) => {
  if (key === "users") return renderUserCard(item);
  if (key === "admins") return renderAdminCard(item);
  if (key === "courses") return renderCourseCard(item);
  if (key === "modules") return renderModuleCard(item);
  if (key === "lessons") return renderLessonCard(item);
  if (key === "quizzes") return renderQuizCard(item);
  if (key === "aiTools") return renderToolCard(item);
  return renderGenericCard(key, item);
};

const request = async (path, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  if (options.raw) {
    if (!response.ok) throw new Error("Request failed");
    return response;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    if (response.status === 401) {
      logout(false);
    }
    throw new Error(data.message || "Request failed");
  }

  return data;
};

const buildSearchPath = (endpoint, query, limit = searchResultLimit) => {
  const params = new URLSearchParams();
  params.set("search", query);
  params.set("q", query);
  params.set("limit", String(limit));
  return `${endpoint}?${params.toString()}`;
};

const executeGlobalSearch = async (query) => {
  const safeQuery = normalizeSearchQuery(query);
  state.globalSearch.query = safeQuery;
  state.globalSearch.error = "";
  state.globalSearch.activeIndex = -1;

  if (globalSearchController) globalSearchController.abort();

  const pageResults = pageShortcutResults(safeQuery);
  if (!safeQuery) {
    state.globalSearch = {
      ...state.globalSearch,
      status: "idle",
      isOpen: false,
      results: [],
      activeIndex: -1,
      error: "",
    };
    render();
    return;
  }

  state.globalSearch.status = "loading";
  state.globalSearch.isOpen = true;
  state.globalSearch.results = pageResults;
  state.globalSearch.focusInput = true;
  render();

  const controller = new AbortController();
  globalSearchController = controller;

  try {
    const responses = await Promise.allSettled(
      globalSearchEntities.map(async (entry) => {
        const response = await request(buildSearchPath(entry.endpoint, safeQuery), { signal: controller.signal });
        return unwrapSearchResponse(entry.key, response)
          .filter((item) => recordMatchesQuery(entry.key, item, safeQuery))
          .slice(0, searchResultLimit)
          .map((item) => recordSearchResult(entry, item, safeQuery))
          .filter((item) => item.recordId || item.view === "auditLogs");
      })
    );

    if (controller.signal.aborted) return;

    const recordResults = responses
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value);
    const failures = responses.filter((result) => result.status === "rejected");

    state.globalSearch.results = [...pageResults, ...recordResults];
    state.globalSearch.status = failures.length === responses.length ? "error" : "success";
    state.globalSearch.error = failures.length === responses.length ? "Unable to search records. Please retry." : "";
    state.globalSearch.activeIndex = state.globalSearch.results.length ? 0 : -1;
    state.globalSearch.focusInput = true;
    render();
  } catch (error) {
    if (error.name === "AbortError") return;
    state.globalSearch.status = "error";
    state.globalSearch.error = error.message || "Unable to search records. Please retry.";
    state.globalSearch.focusInput = true;
    render();
  }
};

const queueGlobalSearch = (query) => {
  const safeQuery = normalizeSearchQuery(query);
  window.clearTimeout(globalSearchTimer);
  state.globalSearch.query = safeQuery;
  state.globalSearch.isOpen = Boolean(safeQuery);
  state.globalSearch.error = "";
  state.globalSearch.focusInput = true;

  if (!safeQuery) {
    if (globalSearchController) globalSearchController.abort();
    state.globalSearch.status = "idle";
    state.globalSearch.results = [];
    state.globalSearch.activeIndex = -1;
    render();
    return;
  }

  state.globalSearch.results = pageShortcutResults(safeQuery);
  state.globalSearch.status = "loading";
  state.globalSearch.activeIndex = state.globalSearch.results.length ? 0 : -1;
  render();
  globalSearchTimer = window.setTimeout(() => executeGlobalSearch(safeQuery), 300);
};

const closeGlobalSearch = () => {
  state.globalSearch.isOpen = false;
  state.globalSearch.activeIndex = -1;
  state.globalSearch.focusInput = false;
  render();
};

const closeAccountMenu = ({ returnFocus = false, rerender = true } = {}) => {
  if (!state.accountMenuOpen && !returnFocus) return;
  state.accountMenuOpen = false;
  state.returnFocusToAccountButton = Boolean(returnFocus);
  if (rerender) render();
};

const restoreAccountMenuFocus = () => {
  if (!state.returnFocusToAccountButton) return;
  state.returnFocusToAccountButton = false;
  document.querySelector("#account-menu-button")?.focus({ preventScroll: true });
};

const openGlobalSearch = () => {
  if (state.globalSearch.isOpen) {
    state.globalSearch.focusInput = true;
    return;
  }
  state.globalSearch.isOpen = true;
  state.globalSearch.focusInput = true;
  if (state.globalSearch.query && !state.globalSearch.results.length) {
    queueGlobalSearch(state.globalSearch.query);
    return;
  }
  render();
};

const activeGlobalSearchResult = () =>
  state.globalSearch.results[state.globalSearch.activeIndex] || null;

const restoreGlobalSearchFocus = () => {
  if (!state.globalSearch.focusInput) return;
  const input = document.querySelector("#global-search");
  if (!input) return;
  input.focus({ preventScroll: true });
  const length = input.value.length;
  try {
    input.setSelectionRange(length, length);
  } catch {
    // Search input selection can fail in older browsers.
  }
  state.globalSearch.focusInput = false;
};

const scrollHighlightedRecordIntoView = () => {
  if (!state.highlightRecord) return;
  const cssEscape = window.CSS?.escape || ((value) => String(value).replace(/["\\]/g, "\\$&"));
  const selector = `[data-record-key="${cssEscape(state.highlightRecord.key)}"][data-record-id="${cssEscape(state.highlightRecord.id)}"]`;
  const record = document.querySelector(selector);
  if (!record) return;
  record.scrollIntoView({ block: "nearest", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth" });
};

const selectGlobalSearchResult = async (result) => {
  if (!result) return;
  saveSidebarScrollPosition();
  state.globalSearch.isOpen = false;
  state.globalSearch.focusInput = false;

  if (result.type === "page") {
    state.highlightRecord = null;
    state.entitySearches[result.view] = "";
    await switchView(result.view, { search: "", replaceHistory: false });
    return;
  }

  state.highlightRecord = result.recordId ? { key: result.view, id: result.recordId } : null;
  state.entitySearches[result.view] = result.search || state.globalSearch.query;
  await switchView(result.view, {
    search: state.entitySearches[result.view],
    highlight: result.recordId,
    replaceHistory: false,
  });
};

const handleGlobalSearchKeydown = (event) => {
  const results = state.globalSearch.results;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeGlobalSearch();
    return;
  }

  if (!state.globalSearch.isOpen && ["ArrowDown", "ArrowUp"].includes(event.key)) {
    event.preventDefault();
    openGlobalSearch();
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    state.globalSearch.activeIndex = results.length ? (state.globalSearch.activeIndex + 1 + results.length) % results.length : -1;
    state.globalSearch.focusInput = true;
    render();
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    state.globalSearch.activeIndex = results.length ? (state.globalSearch.activeIndex - 1 + results.length) % results.length : -1;
    state.globalSearch.focusInput = true;
    render();
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    selectGlobalSearchResult(activeGlobalSearchResult());
  }
};

const queueEntitySearch = (key, query) => {
  const safeQuery = normalizeSearchQuery(query);
  state.entitySearches[key] = safeQuery;
  state.highlightRecord = null;
  window.clearTimeout(entitySearchTimers[key]);

  if (entitySearchControllers[key]) entitySearchControllers[key].abort();
  entitySearchTimers[key] = window.setTimeout(() => {
    const controller = new AbortController();
    entitySearchControllers[key] = controller;
    loadEntity(key, { signal: controller.signal, replaceHistory: true });
  }, 300);
};

const bindGlobalSearchEvents = () => {
  const input = document.querySelector("#global-search");
  input?.addEventListener("focus", openGlobalSearch);
  input?.addEventListener("input", (event) => queueGlobalSearch(event.target.value));
  input?.addEventListener("keydown", handleGlobalSearchKeydown);

  document.querySelector("[data-search-clear]")?.addEventListener("click", () => {
    if (globalSearchController) globalSearchController.abort();
    state.globalSearch.query = "";
    state.globalSearch.results = [];
    state.globalSearch.status = "idle";
    state.globalSearch.error = "";
    state.globalSearch.activeIndex = -1;
    state.globalSearch.isOpen = false;
    state.globalSearch.focusInput = true;
    render();
  });

  document.querySelector("[data-search-retry]")?.addEventListener("click", () => executeGlobalSearch(state.globalSearch.query));

  document.querySelectorAll("[data-search-result]").forEach((button) => {
    button.addEventListener("click", () => {
      const result = state.globalSearch.results[Number(button.dataset.searchResult)];
      selectGlobalSearchResult(result);
    });
  });

  document.querySelectorAll("[data-search-view-all]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.searchViewAll;
      const search = state.globalSearch.query;
      state.globalSearch.isOpen = false;
      state.globalSearch.focusInput = false;
      state.entitySearches[view] = search;
      switchView(view, { search });
    });
  });

  if (globalSearchDocumentEventsBound) return;
  globalSearchDocumentEventsBound = true;

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      state.globalSearch.focusInput = true;
      state.globalSearch.isOpen = true;
      render();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!state.globalSearch.isOpen) return;
    if (event.target.closest?.(".global-search-shell")) return;
    state.globalSearch.isOpen = false;
    state.globalSearch.activeIndex = -1;
    state.globalSearch.focusInput = false;
    render();
  });
};

const bindAccountMenuEvents = () => {
  document.querySelector("#account-menu-button")?.addEventListener("click", () => {
    state.accountMenuOpen = !state.accountMenuOpen;
    state.globalSearch.isOpen = false;
    state.globalSearch.focusInput = false;
    render();
  });

  document.querySelector("#account-logout")?.addEventListener("click", () => {
    if (state.accountLogoutLoading) return;
    state.accountLogoutLoading = true;
    state.accountMenuOpen = true;
    render();
    window.setTimeout(() => {
      state.accountMenuOpen = false;
      state.accountLogoutLoading = false;
      logout();
    }, 80);
  });

  if (accountMenuDocumentEventsBound) return;
  accountMenuDocumentEventsBound = true;

  document.addEventListener("pointerdown", (event) => {
    if (!state.accountMenuOpen) return;
    if (event.target.closest?.(".account-menu-shell")) return;
    closeAccountMenu({ rerender: true });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !state.accountMenuOpen) return;
    event.preventDefault();
    closeAccountMenu({ returnFocus: true });
  });
};

const bindRouteEvents = () => {
  if (routeEventsBound) return;
  routeEventsBound = true;

  window.addEventListener("popstate", () => {
    saveSidebarScrollPosition();
    applyUrlState();
    switchView(state.view, { skipHistory: true, replaceHistory: true });
  });
};

const setBusy = (loading, busyKey = "") => {
  state.loading = loading;
  state.actionBusyKey = loading ? busyKey : "";
  render();
};

const setMessage = (message, error = "") => {
  state.message = message;
  state.error = error;
  render();
};

const getPayloadFromForm = (form, fields, mode = "create") => {
  const payload = {};

  fields.forEach((field) => {
    if (field.createOnly && mode !== "create") return;

    if (field.type === "checkbox") {
      payload[field.name] = form.get(field.name) === "on";
      return;
    }

    const raw = form.get(field.name);
    const value = typeof raw === "string" ? raw.trim() : raw;

    if ((value === "" || value === null) && !field.required) return;

    if (field.type === "number") {
      payload[field.name] = Number(value || 0);
      return;
    }

    if (field.transform === "csv") {
      payload[field.name] = String(value || "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      return;
    }

    if (field.type === "json") {
      if (value === "" && field.required) {
        throw new Error(`${field.label} is required`);
      }

      try {
        payload[field.name] = JSON.parse(String(value || "null"));
      } catch {
        throw new Error(`${field.label} must be valid JSON`);
      }
      return;
    }

    payload[field.name] = value;
  });

  return payload;
};

const login = async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  setBusy(true);

  try {
    const response = await request("/admins/login", {
      method: "POST",
      body: JSON.stringify({
        email: String(form.get("email") || "").trim().toLowerCase(),
        password: String(form.get("password") || ""),
      }),
    });

    state.token = response.token;
    state.admin = response.admin;
    localStorage.setItem(storageKey, response.token);
    state.error = "";
    await loadDashboard();
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
};

const bootstrap = async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  setBusy(true);

  try {
    await request("/admins/bootstrap", {
      method: "POST",
      body: JSON.stringify({
        setupSecret: String(form.get("setupSecret") || ""),
        fullName: String(form.get("fullName") || "").trim(),
        email: String(form.get("email") || "").trim().toLowerCase(),
        password: String(form.get("password") || ""),
      }),
    });

    state.error = "";
    state.message = "First admin created. Login with that account.";
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
};

const logout = (shouldRender = true) => {
  state.token = null;
  state.admin = null;
  state.stats = null;
  state.analytics = null;
  state.settings = null;
  state.data = {};
  state.selectedIds = new Set();
  localStorage.removeItem(storageKey);
  if (shouldRender) render();
};

const loadSession = async () => {
  if (!state.token) {
    render();
    return;
  }

  renderSessionLoading();
  applyUrlState();
  const requestedView = state.view;

  try {
    const response = await request("/admins/me");
    state.admin = response.data;
    await loadDashboard({ setView: requestedView === "dashboard" });
    if (requestedView !== "dashboard") await switchView(requestedView, { replaceHistory: true });
    else {
      updateAdminUrl({ replace: true });
      render();
    }
  } catch {
    logout();
  }
};

const loadDashboard = async ({ setView = true } = {}) => {
  const [statsResponse, analyticsResponse] = await Promise.all([
    request("/admins/stats"),
    request("/admins/analytics"),
  ]);

  state.stats = statsResponse.data;
  state.analytics = analyticsResponse.data;
  if (setView) state.view = "dashboard";
};

const refreshAnalyticsOverview = async () => {
  state.loading = true;
  render();

  try {
    const [statsResponse, analyticsResponse] = await Promise.all([
      request("/admins/stats"),
      request("/admins/analytics"),
    ]);

    state.stats = statsResponse.data;
    state.analytics = analyticsResponse.data;
    state.view = "analytics";
    state.error = "";
    state.message = "Analytics refreshed.";
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
};

const loadEntity = async (key, options = {}) => {
  const config = entityConfigs[key];
  const search = normalizeSearchQuery(state.entitySearches[key] ?? document.querySelector(`#${key}-search`)?.value ?? "");
  const params = new URLSearchParams();

  if (search) params.set("search", search);
  (config.filters || []).forEach((filter) => {
    const filterElement = document.querySelector(`#${key}-${filter.name}`);
    const value = filterElement ? filterElement.value : state.entityFilters[key]?.[filter.name] || "";
    state.entityFilters[key] = { ...(state.entityFilters[key] || {}), [filter.name]: value };
    if (value) params.set(filter.name, value);
  });
  if (key === "users") params.set("limit", "100");

  const path = `${config.endpoint}${params.toString() ? `?${params.toString()}` : ""}`;
  state.loading = true;
  render();

  try {
    const response = await request(path, options.signal ? { signal: options.signal } : {});
    const records = config.unwrap(response);
    state.data[key] = search ? records.filter((item) => recordMatchesQuery(key, item, search)) : records;
    state.selectedIds = new Set();
    state.view = key;
    state.error = "";
    state.entitySearches[key] = search;
    updateAdminUrl({ replace: options.replaceHistory !== false });
  } catch (error) {
    if (error.name === "AbortError") return;
    state.error = error.message;
  } finally {
    if (options.signal?.aborted) return;
    state.loading = false;
    render();
  }
};

const activeAiTools = (items = state.data.aiTools || []) =>
  items.filter((item) => String(item?.status || "active").toLowerCase() === "active");

const loadWorkspaceTools = async ({ force = false } = {}) => {
  const config = entityConfigs.aiTools;
  const existingTools = Array.isArray(state.data.aiTools) ? state.data.aiTools : null;

  if (!force && existingTools && state.workspaceTools.status === "success") {
    state.workspaceTools = { status: "success", error: "" };
    if (state.view === "workspace") render();
    return;
  }

  state.workspaceTools = { status: "loading", error: "" };
  if (state.view === "workspace") render();

  try {
    const response = await request(config.endpoint);
    state.data.aiTools = config.unwrap(response);
    state.workspaceTools = { status: "success", error: "" };
  } catch (error) {
    state.workspaceTools = {
      status: "error",
      error: error.message || "Unable to load AI tools.",
    };
  } finally {
    if (state.view === "workspace") render();
  }
};

const loadSettings = async () => {
  const response = await request("/admins/settings");
  state.settings = response.data;
  state.view = "settings";
  render();
};

const loadAuditLogs = async (options = {}) => {
  if (state.auditLoading && !options.force) return;
  const mode = options.mode || "replace";
  if (!options.signal) {
    entitySearchControllers.auditLogs?.abort();
    entitySearchControllers.auditLogs = new AbortController();
    options.signal = entitySearchControllers.auditLogs.signal;
  }
  const params = new URLSearchParams();
  const search = normalizeSearchQuery(state.auditSearch);
  const page = Math.max(Number(options.page || state.auditPage || 1), 1);
  const action = auditActionParam();
  const previousPage = state.auditPagination?.page || state.auditPage || 1;
  const previousPagination = { ...(state.auditPagination || {}) };
  const previousLogs = Array.isArray(state.data.auditLogs) ? [...state.data.auditLogs] : [];
  const previousGroups = { ...(state.auditLoadedGroups || {}) };
  const previousVisiblePage = state.auditVisiblePage || 1;
  const previousScrollTargetId = state.auditScrollTargetId || "";
  state.auditPage = page;
  state.auditSearch = search;

  params.set("page", String(page));
  params.set("limit", String(state.auditLimit));
  params.set("sort", "-createdAt");
  if (action) params.set("action", action);
  if (search) params.set("search", search);
  state.auditLoading = true;
  state.auditLoadingDirection = options.direction || "";
  state.auditError = "";
  if (state.view === "auditLogs") render();

  try {
    const response = await request(`/admins/audit-logs${params.toString() ? `?${params.toString()}` : ""}`, options.signal ? { signal: options.signal } : {});
    const payload = response.data && typeof response.data === "object" && !Array.isArray(response.data)
      ? response.data
      : response;
    const records = Array.isArray(response.data)
      ? response.data
      : Array.isArray(payload.logs)
        ? payload.logs
        : Array.isArray(payload.records)
          ? payload.records
          : Array.isArray(payload.items)
            ? payload.items
      : Array.isArray(response.logs)
        ? response.logs
        : [];
    const fallbackTotal = records.length;
    const pagination = response.pagination || response.meta || payload.pagination || payload.meta || {};
    const metadataPage = Number(pagination.page || pagination.currentPage || pagination.current || page);
    const metadataTotalPages = Number(pagination.totalPages || pagination.pages || pagination.pageCount || Math.max(Math.ceil(fallbackTotal / state.auditLimit), 1));
    const metadataTotalRecords = Number(pagination.totalRecords || pagination.total || pagination.totalDocs || pagination.count || fallbackTotal);
    const currentLogs = mode === "append" ? previousLogs : [];
    const existingIds = new Set(currentLogs.map((log, index) => auditLogRecordId(log, index)));
    const uniqueRecords = records.filter((log, index) => {
      const id = auditLogRecordId(log, index);
      if (existingIds.has(id)) return false;
      existingIds.add(id);
      return true;
    });
    const mergedLogs = mode === "append" ? [...currentLogs, ...uniqueRecords] : records;
    state.data.auditLogs = mergedLogs;
    const groupStartIndex = mode === "append" ? currentLogs.length : 0;
    state.auditLoadedGroups = mode === "append"
      ? {
        ...previousGroups,
        [metadataPage]: {
          start: groupStartIndex,
          count: uniqueRecords.length,
        },
      }
      : {
        [metadataPage]: {
          start: 0,
          count: records.length,
        },
      };
    state.auditVisiblePage = metadataPage;
    state.auditScrollTargetId = mode === "append" && uniqueRecords.length ? auditGroupDomId(metadataPage) : "";
    state.auditPagination = {
      page: metadataPage,
      limit: Number(pagination.limit || pagination.pageSize || state.auditLimit),
      totalRecords: metadataTotalRecords,
      totalPages: Math.max(metadataTotalPages, 1),
      hasPrevPage: Boolean(pagination.hasPrevPage ?? pagination.hasPreviousPage ?? pagination.hasPrevious ?? metadataPage > 1),
      hasNextPage: Boolean(pagination.hasNextPage ?? pagination.hasMore ?? pagination.hasNext ?? metadataPage < Math.max(metadataTotalPages, 1)),
      from: Number(pagination.from || pagination.start || (fallbackTotal ? (page - 1) * state.auditLimit + 1 : 0)),
      to: Number(pagination.to || pagination.end || (fallbackTotal ? (page - 1) * state.auditLimit + records.length : 0)),
    };
    state.auditPage = state.auditPagination.page;
    state.view = "auditLogs";
    state.auditError = "";
    if (mode !== "append") updateAdminUrl({ replace: options.replaceHistory !== false });
  } catch (error) {
    if (error.name === "AbortError") return;
    state.auditError = error.message || "Unable to load audit logs.";
    if (options.keepRowsOnError) {
      state.data.auditLogs = previousLogs;
      state.auditLoadedGroups = previousGroups;
      state.auditVisiblePage = previousVisiblePage;
      state.auditScrollTargetId = previousScrollTargetId;
      state.auditPagination = previousPagination;
      state.auditPage = previousPage;
    }
  } finally {
    if (options.signal?.aborted) return;
    state.auditLoading = false;
    const focusDirection = options.restoreFocusDirection || state.auditLoadingDirection;
    state.auditLoadingDirection = "";
    render();
    const scrollTargetId = options.scrollTargetId || state.auditScrollTargetId || "";
    if (scrollTargetId) {
      window.requestAnimationFrame(() => {
        const scrollTarget = document.querySelector(`[data-audit-group-id="${escapeHtml(scrollTargetId)}"]`) || document.getElementById(scrollTargetId);
        scrollTarget?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth",
        });
        state.auditScrollTargetId = "";
      });
    } else if (options.scrollTable) {
      document.querySelector(".audit-table-card")?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth",
      });
    }
    if (focusDirection) {
      window.requestAnimationFrame(() => {
        document.querySelector(`[data-audit-direction="${focusDirection}"]`)?.focus?.();
      });
    }
  }
};

const switchView = async (view, options = {}) => {
  state.error = "";
  state.message = "";
  state.view = view;
  state.accountMenuOpen = false;
  if (options.search !== undefined && isSearchableEntity(view)) {
    state.entitySearches[view] = normalizeSearchQuery(options.search);
  }
  if (options.search !== undefined && view === "auditLogs") {
    state.auditSearch = normalizeSearchQuery(options.search);
  }
  if (options.highlight) state.highlightRecord = { key: view, id: String(options.highlight) };
  if (!options.skipHistory) updateAdminUrl({ replace: Boolean(options.replaceHistory) });
  render();

  try {
    if (view === "dashboard") await loadDashboard();
    else if (view === "workspace") await loadWorkspaceTools();
    else if (view === "analytics" && !state.analytics) await refreshAnalyticsOverview();
    else if (view === "settings") await loadSettings();
    else if (view === "auditLogs") await loadAuditLogs();
    else if (entityConfigs[view]) await loadEntity(view, { replaceHistory: true });
  } catch (error) {
    setMessage("", error.message);
  }
};

const metricCard = (label, value, note = "", icon = "activity", trend = "") => `
  <section class="card metric-card reveal">
    <div class="metric-card-head">
      <div class="metric-icon"><i data-lucide="${escapeHtml(icon)}"></i></div>
      <div>
        <p class="metric-label">${escapeHtml(label)}</p>
        <p class="metric-value" data-count="${escapeHtml(value)}">${escapeHtml(value)}</p>
      </div>
    </div>
    <div class="metric-footer">
      ${note ? `<p class="metric-note">${escapeHtml(note)}</p>` : "<span></span>"}
      ${trend ? `<span class="trend-badge">${escapeHtml(trend)}</span>` : ""}
    </div>
  </section>
`;

const renderDashboardMetricsTable = (rows) => {
  const themes = [
    'theme-orange', 'theme-green', 'theme-purple', 'theme-blue',
    'theme-yellow', 'theme-pink', 'theme-cyan', 'theme-brown'
  ];
  return `
  <section class="platform-overview-container reveal">
    <div class="platform-overview-header">
      <div class="platform-overview-title">
        <p class="eyebrow">LIVE METRICS</p>
        <div class="platform-title-row">
          <h2>Platform overview</h2>
          <div class="platform-title-icon">
            <i data-lucide="trending-up"></i>
          </div>
        </div>
      </div>
      <div class="tracked-signals">
        <span class="signal-dot"></span>
        ${rows.length} tracked signals
      </div>
    </div>
    <div class="platform-metrics-grid">
      ${rows.map((row, index) => {
        const themeClass = themes[index % themes.length];
        return `
          <div class="platform-metric-card ${themeClass}">
            <div class="platform-metric-icon">
              ${metricCardAnimation(row.type || "users", row.percentage)}
            </div>
            <div class="platform-metric-content">
              <div class="platform-metric-top">
                <span class="platform-metric-label">${escapeHtml(row.label)}</span>
                ${row.trend ? `<span class="platform-metric-trend">${escapeHtml(row.trend)}</span>` : ''}
              </div>
              <div class="platform-metric-value" data-count="${escapeHtml(row.value)}">${escapeHtml(row.value)}</div>
              <div class="platform-metric-note">${escapeHtml(row.note || "-")}</div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  </section>
  `;
};

const bars = (items, labelKey = "_id", valueKey = "count") => {
  const list = items || [];
  const max = Math.max(...list.map((item) => Number(item[valueKey] || 0)), 1);

  return `
    <div class="bars">
      ${list
        .map((item) => {
          const value = Number(item[valueKey] || 0);
          const width = Math.max((value / max) * 100, value ? 6 : 0);
          return `
            <div class="bar-row">
              <span>${escapeHtml(item[labelKey] || item.title || "-")}</span>
              <div><i style="width:${width}%"></i></div>
              <b>${escapeHtml(value)}</b>
            </div>
          `;
        })
        .join("") || `<p class="empty">No data yet.</p>`}
    </div>
  `;
};

const analyticsBarChartCard = (title, subtitle, chartId) => {
  return `
    <section class="card analytics-card reveal">
      <div class="panel-header">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p class="chart-subtitle">${escapeHtml(subtitle)}</p>
        </div>
      </div>
      <div class="premium-chart-frame" style="height: 200px; margin-top: 1rem; border: none; box-shadow: none;">
        <canvas id="${chartId}" class="chart-canvas"></canvas>
      </div>
    </section>
  `;
};

const analyticsTableCard = (title, subtitle, items, labelKey = "_id", valueKey = "count") => {
  const list = items || [];
  const max = Math.max(...list.map((item) => Number(item[valueKey] || 0)), 1);

  return `
    <section class="card analytics-card analytics-table-card reveal">
      <div class="panel-header">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p class="chart-subtitle">${escapeHtml(subtitle)}</p>
        </div>
        <span class="analytics-table-count">${list.length} rows</span>
      </div>
      <div class="analytics-table-wrap">
        <table class="analytics-table">
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Value</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((item) => {
              const value = Number(item[valueKey] || 0);
              const width = Math.max((value / max) * 100, value ? 6 : 0);
              const label = item[labelKey] || item.title || item.name || "-";
              return `
                <tr>
                  <td>${escapeHtml(label)}</td>
                  <td><strong>${escapeHtml(value)}</strong></td>
                  <td>
                    <span class="analytics-share">
                      <i style="width:${width}%"></i>
                    </span>
                  </td>
                </tr>
              `;
            }).join("") || `
              <tr>
                <td colspan="3" class="analytics-empty">No data yet.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </section>
  `;
};

const numericValue = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const pickNumber = (item, keys, fallback = 0) => {
  for (const key of keys) {
    const value = getValue(item, key);
    if (value !== undefined && value !== null && value !== "") return numericValue(value, fallback);
  }
  return fallback;
};

const analyticsDateFromKey = (key) => {
  const raw = String(key || "").trim();
  if (!raw) return null;
  const normalized = raw.length === 7 ? `${raw}-01` : raw.slice(0, 10);
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const analyticsPeriodLabel = (key) => {
  const raw = String(key || "").trim();
  const parsed = analyticsDateFromKey(raw);

  if (!parsed) return raw || "-";
  if (/^\d{4}-\d{2}$/.test(raw)) return `${monthNames[parsed.getMonth()]} ${parsed.getFullYear()}`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed);
};

const normalizeAnalyticsSeries = (items = [], valueKeys = ["count", "value", "users", "learners", "registrations"]) =>
  (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const key = item?._id ?? item?.date ?? item?.day ?? item?.month ?? item?.period ?? item?.label ?? item?.title ?? item?.name ?? index;
      return {
        key: String(key),
        label: analyticsPeriodLabel(key),
        value: pickNumber(item, valueKeys),
        date: analyticsDateFromKey(key),
        source: item,
        index,
      };
    })
    .sort((a, b) => {
      if (a.date && b.date) return a.date - b.date;
      if (a.date) return -1;
      if (b.date) return 1;
      return a.index - b.index;
    });

const getAnalyticsRangeDays = () => numericValue(state.analyticsFilters.analyticsRange, 30);

const filterAnalyticsSeriesByRange = (series, rangeDays = getAnalyticsRangeDays()) => {
  if (!series.length) return [];
  const dated = series.filter((point) => point.date);

  if (!dated.length) return series.slice(-rangeDays);

  const newestTime = Math.max(...dated.map((point) => point.date.getTime()));
  const startTime = newestTime - (Math.max(rangeDays, 1) - 1) * 24 * 60 * 60 * 1000;
  return series.filter((point) => !point.date || point.date.getTime() >= startTime);
};

const getAnalyticsUserGrowthSeries = () =>
  filterAnalyticsSeriesByRange(
    normalizeAnalyticsSeries(state.analytics?.userGrowth || [], ["count", "newUsers", "users", "value"]),
    getAnalyticsRangeDays(),
  );

const getAnalyticsMonthlyRegistrations = () => {
  const rows = normalizeAnalyticsSeries(state.analytics?.monthlyRegistrations || [], ["count", "registrations", "newRegistrations", "value"]);
  return rows.map((row) => {
    const secondaryKeys = ["returningRegistrations", "returning", "repeatRegistrations", "returningCount"];
    const secondaryKey = secondaryKeys.find((key) => row.source?.[key] !== undefined && row.source?.[key] !== null);
    return {
      ...row,
      secondaryValue: secondaryKey ? numericValue(row.source[secondaryKey]) : null,
      secondaryLabel: secondaryKey ? "Returning registrations" : "",
    };
  });
};

const analyticsTrend = (series, periodLength) => {
  const count = Math.max(Number(periodLength || 1), 1);
  if (!series.length || series.length < count + 1) return null;

  const current = series.slice(-count).reduce((sum, point) => sum + point.value, 0);
  const previous = series.slice(-(count * 2), -count).reduce((sum, point) => sum + point.value, 0);

  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
};

const renderSparkline = (series = []) => {
  const values = series.length ? series.map((point) => point.value) : [0, 0, 0, 0, 0];
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 98 : (index / (values.length - 1)) * 196 + 2;
      const y = 58 - ((value - min) / range) * 48;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return `
    <svg class="analytics-sparkline" viewBox="0 0 200 64" aria-hidden="true" focusable="false">
      <polyline points="${points}" />
      <circle cx="198" cy="${values.length ? (58 - ((values[values.length - 1] - min) / range) * 48).toFixed(1) : 58}" r="4" />
    </svg>
  `;
};

const renderAnalyticsTrend = (trend) => {
  if (trend === null || trend === undefined || !Number.isFinite(Number(trend))) {
    return `<span class="analytics-trend neutral">No prior data</span>`;
  }

  const value = Number(trend);
  const tone = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
  const icon = value > 0 ? "arrow-up" : value < 0 ? "arrow-down" : "minus";
  return `
    <span class="analytics-trend ${tone}">
      <i data-lucide="${icon}"></i>
      ${escapeHtml(Math.abs(value))}% <em>vs previous period</em>
    </span>
  `;
};

const renderAnalyticsKpiCard = ({ title, value, note, icon, trendWindow }) => {
  const series = getAnalyticsUserGrowthSeries();
  const trend = analyticsTrend(series, trendWindow);

  return `
    <section class="analytics-kpi-card reveal">
      <div class="analytics-kpi-icon"><i data-lucide="${escapeHtml(icon)}"></i></div>
      <div class="analytics-kpi-copy">
        <p>${escapeHtml(title)}</p>
        <strong data-count="${escapeHtml(value)}">${escapeHtml(wholeNumber(value))}</strong>
        <span>${escapeHtml(note)}</span>
      </div>
      ${renderSparkline(series)}
      ${renderAnalyticsTrend(trend)}
    </section>
  `;
};

const completionLabel = (key) => {
  const raw = String(key ?? "").trim();
  const value = Number(raw);

  if (Number.isFinite(value)) {
    if (value <= 0) return "Not started";
    if (value >= 100) return "100% completed";
    return `${value}% completed`;
  }

  return raw || "Unknown";
};

const completionTone = (key) => {
  const value = Number(key);
  if (Number.isFinite(value) && value <= 0) return "danger";
  if (Number.isFinite(value) && value >= 100) return "success";
  return "partial";
};

const getCompletionRows = () => {
  const rows = (Array.isArray(state.analytics?.learningProgress) ? state.analytics.learningProgress : []).map((item, index) => {
    const key = item?._id ?? item?.progress ?? item?.label ?? index;
    return {
      key,
      label: completionLabel(key),
      value: pickNumber(item, ["count", "learners", "value"]),
      tone: completionTone(key),
    };
  });

  return rows.filter((row) => row.value >= 0);
};

const getPopularCourseRows = () =>
  (Array.isArray(state.analytics?.popularCourses) ? state.analytics.popularCourses : [])
    .map((course, index) => ({
      title: course?.title || course?.name || "Untitled course",
      learners: pickNumber(course, ["learners", "enrollments", "students", "count"]),
      index,
    }))
    .sort((a, b) => b.learners - a.learners || a.index - b.index);

const renderAnalyticsEmpty = (message) => `
  <div class="analytics-empty-state">
    <span>No data</span>
    <p>${escapeHtml(message)}</p>
  </div>
`;

const renderAnalyticsSkeleton = () => `
  <section class="analytics-overview-page">
    <div class="analytics-overview-header card reveal">
      <div>
        <span class="analytics-skeleton-line short"></span>
        <span class="analytics-skeleton-line"></span>
      </div>
      <span class="analytics-skeleton-button"></span>
    </div>
    <div class="analytics-kpi-grid">
      ${Array.from({ length: 3 }).map(() => `<section class="analytics-kpi-card analytics-page-skeleton"></section>`).join("")}
    </div>
    <div class="analytics-chart-grid">
      ${Array.from({ length: 4 }).map(() => `<section class="analytics-panel analytics-page-skeleton"></section>`).join("")}
    </div>
  </section>
`;

const renderCompletionLegend = (rows) => {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return `
    <div class="analytics-completion-legend">
      ${rows.map((row) => {
        const share = total ? (row.value / total) * 100 : 0;
        return `
          <div class="analytics-completion-row">
            <span class="analytics-legend-dot ${escapeHtml(row.tone)}"></span>
            <span>${escapeHtml(row.label)}</span>
            <strong>${escapeHtml(wholeNumber(row.value))}</strong>
            <em>${escapeHtml(percentLabel(share))}</em>
          </div>
        `;
      }).join("") || renderAnalyticsEmpty("Completion data is not available yet.")}
    </div>
  `;
};

const renderPopularCoursesOverview = () => {
  const courses = getPopularCourseRows();
  const total = courses.reduce((sum, course) => sum + course.learners, 0);
  const max = Math.max(...courses.map((course) => course.learners), 1);

  return `
    <section class="analytics-panel analytics-popular-panel reveal">
      <div class="analytics-panel-head">
        <div>
          <h2>Popular Courses</h2>
          <p>Learner demand</p>
        </div>
        <span class="analytics-count-pill">${escapeHtml(courses.length)} courses</span>
      </div>
      <div class="analytics-popular-list">
        ${courses.map((course, index) => {
          const share = total ? (course.learners / total) * 100 : 0;
          const width = Math.max((course.learners / max) * 100, course.learners ? 6 : 0);
          return `
            <div class="analytics-popular-row">
              <span class="analytics-rank">${index + 1}</span>
              <strong>${escapeHtml(course.title)}</strong>
              <span class="analytics-demand-bar"><i style="width:${width}%"></i></span>
              <b>${escapeHtml(wholeNumber(course.learners))}</b>
              <em>${escapeHtml(percentLabel(share))}</em>
            </div>
          `;
        }).join("") || renderAnalyticsEmpty("No popular courses were returned by the analytics API.")}
      </div>
    </section>
  `;
};

const renderAnalyticsOverview = () => {
  const analytics = state.analytics || {};
  const growthRows = getAnalyticsUserGrowthSeries();
  const completionRows = getCompletionRows();
  const completionTotal = completionRows.reduce((sum, row) => sum + row.value, 0);
  const monthlyRows = getAnalyticsMonthlyRegistrations();
  const range = getAnalyticsRangeDays();

  return `
    <section class="analytics-overview-page">
      <div class="analytics-overview-header reveal">
        <div>
          <h2>Analytics Overview</h2>
          <p>Learning activity and growth insights</p>
        </div>
        <div class="analytics-overview-actions">
          <label class="analytics-range-control">
            <i data-lucide="calendar-days"></i>
            <select data-analytics-range aria-label="Analytics date range">
              ${[[7, "Last 7 days"], [30, "Last 30 days"], [90, "Last 90 days"], [365, "Last 12 months"]].map(([value, label]) => `
                <option value="${value}" ${range === value ? "selected" : ""}>${label}</option>
              `).join("")}
            </select>
            <i data-lucide="chevron-down"></i>
          </label>
          <button class="analytics-action-btn" data-export-analytics type="button">
            <i data-lucide="download"></i>
            Export
          </button>
          <button class="analytics-action-btn icon-only ${state.loading ? "loading" : ""}" data-refresh-analytics type="button" aria-label="Refresh analytics" ${state.loading ? "disabled" : ""}>
            <i data-lucide="refresh-cw"></i>
          </button>
        </div>
      </div>

      <section class="analytics-kpi-grid" aria-label="Active user metrics">
        ${renderAnalyticsKpiCard({ title: "Daily Active", value: analytics.activeUsers?.daily ?? 0, note: "active today", icon: "user", trendWindow: 1 })}
        ${renderAnalyticsKpiCard({ title: "Weekly Active", value: analytics.activeUsers?.weekly ?? 0, note: "active this week", icon: "users", trendWindow: 7 })}
        ${renderAnalyticsKpiCard({ title: "Monthly Active", value: analytics.activeUsers?.monthly ?? 0, note: "active this month", icon: "calendar-days", trendWindow: 30 })}
      </section>

      <section class="analytics-chart-grid">
        <section class="analytics-panel analytics-growth-panel reveal">
          <div class="analytics-panel-head">
            <div>
              <h2>User Growth</h2>
              <p>New users by period</p>
            </div>
            <span class="analytics-count-pill">${escapeHtml(wholeNumber(growthRows.reduce((sum, row) => sum + row.value, 0)))} total</span>
          </div>
          <div class="analytics-chart-shell large">
            ${growthRows.length ? `<canvas id="analytics-user-growth-chart" class="chart-canvas"></canvas>` : renderAnalyticsEmpty("No user growth records are available for this range.")}
          </div>
        </section>

        <section class="analytics-panel analytics-completion-panel reveal">
          <div class="analytics-panel-head">
            <div>
              <h2>Course Completion</h2>
              <p>Progress distribution</p>
            </div>
          </div>
          <div class="analytics-completion-layout">
            <div class="analytics-donut-shell">
              ${completionRows.length ? `<canvas id="analytics-course-completion-chart" class="chart-canvas"></canvas>` : renderAnalyticsEmpty("No completion records are available yet.")}
              ${completionRows.length ? `<div class="analytics-donut-center"><strong>${escapeHtml(wholeNumber(completionTotal))}</strong><span>total learners</span></div>` : ""}
            </div>
            ${renderCompletionLegend(completionRows)}
          </div>
        </section>

        <section class="analytics-panel analytics-registrations-panel reveal">
          <div class="analytics-panel-head">
            <div>
              <h2>Monthly Registrations</h2>
              <p>Registration trend</p>
            </div>
          </div>
          <div class="analytics-chart-shell">
            ${monthlyRows.length ? `<canvas id="analytics-monthly-registrations-chart" class="chart-canvas"></canvas>` : renderAnalyticsEmpty("No monthly registrations were returned by the analytics API.")}
          </div>
        </section>

        ${renderPopularCoursesOverview()}
      </section>
    </section>
  `;
};

const exportAnalyticsCsv = () => {
  const growthRows = getAnalyticsUserGrowthSeries();
  const completionRows = getCompletionRows();
  const monthlyRows = getAnalyticsMonthlyRegistrations();
  const popularRows = getPopularCourseRows();
  const activeUsers = state.analytics?.activeUsers || {};
  const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["Section", "Label", "Value", "Secondary"],
    ["Active users", "Daily Active", activeUsers.daily ?? 0, "active today"],
    ["Active users", "Weekly Active", activeUsers.weekly ?? 0, "active this week"],
    ["Active users", "Monthly Active", activeUsers.monthly ?? 0, "active this month"],
    ...growthRows.map((row) => ["User Growth", row.key, row.value, ""]),
    ...completionRows.map((row) => ["Course Completion", row.label, row.value, ""]),
    ...monthlyRows.map((row) => ["Monthly Registrations", row.key, row.value, row.secondaryValue ?? ""]),
    ...popularRows.map((row, index) => ["Popular Courses", `${index + 1}. ${row.title}`, row.learners, ""]),
  ];
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `analytics-overview-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setMessage("Analytics export downloaded.");
};

const compactNumber = (value) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0));
const wholeNumber = (value) => new Intl.NumberFormat().format(Math.round(Number(value || 0)));
const percentLabel = (value) => `${Number(value || 0).toFixed(Number(value || 0) >= 10 ? 0 : 1)}%`;
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const padDatePart = (value) => String(value).padStart(2, "0");
const dateKey = (date) => `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
const monthKey = (date) => `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}`;
const parseDateKey = (key) => {
  const [year, month, day] = String(key || "").split("-").map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1);
};
const parseMonthKey = (key) => {
  const [year, month] = String(key || "").split("-").map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, 1);
};
const shiftMonthKey = (key, amount) => {
  const date = parseMonthKey(key);
  date.setMonth(date.getMonth() + amount);
  return monthKey(date);
};
const shortDateLabel = (key) => {
  const date = parseDateKey(key);
  return `${monthNames[date.getMonth()]} ${date.getDate()}`;
};
const longDateLabel = (key) => {
  const date = parseDateKey(key);
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(date);
};
const normalizeDailyCounts = (items = []) =>
  (items || []).reduce((map, item) => {
    if (!item?._id) return map;
    map.set(String(item._id).slice(0, 10), Number(item.count || item.registrations || 0));
    return map;
  }, new Map());

const previewDailyCounts = () => {
  const counts = new Map();
  const today = new Date();
  const values = [8, 11, 9, 16, 14, 21, 26, 18, 24, 29, 25, 33, 31, 38, 42, 36, 45, 52, 47, 56, 61, 58, 66, 71, 68, 76, 82, 79, 88, 94];
  values.forEach((value, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (values.length - 1 - index));
    counts.set(dateKey(day), value);
  });
  return counts;
};

const getLastDateKeys = (days) => {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (days - 1 - index));
    return dateKey(day);
  });
};

const getDailyCountSource = (analytics) => {
  const daily = normalizeDailyCounts(analytics?.userGrowth || []);
  return {
    counts: daily.size ? daily : previewDailyCounts(),
    isFallback: !daily.size,
  };
};

const getUserGrowthModel = (analytics, stats) => {
  const days = Number(state.analyticsFilters.userGrowthDays || 7);
  const dates = getLastDateKeys(days);
  const source = getDailyCountSource(analytics);
  const totalFromStats = Number(stats?.users?.total || 0);
  const dailyValues = dates.map((key) => Number(source.counts.get(key) || 0));
  const newUsers = dailyValues.reduce((sum, value) => sum + value, 0);
  const fallbackEndingTotal = 1820 + newUsers;
  const endingTotal = source.isFallback && !totalFromStats ? fallbackEndingTotal : Math.max(totalFromStats, newUsers);
  let runningTotal = Math.max(endingTotal - newUsers, 0);

  const points = dates.map((key, index) => {
    const previousTotal = runningTotal || Math.max(endingTotal - newUsers, 1);
    runningTotal += dailyValues[index];
    const growth = previousTotal ? ((runningTotal - previousTotal) / previousTotal) * 100 : 0;
    return {
      date: key,
      label: shortDateLabel(key),
      total: runningTotal,
      newUsers: dailyValues[index],
      growth,
    };
  });

  return {
    days,
    points,
    isFallback: source.isFallback,
    totalUsers: endingTotal,
    newUsers,
    growthRate: points.length ? points[points.length - 1].growth : 0,
  };
};

const getCalendarModel = (analytics) => {
  const selectedMonth = state.analyticsFilters.calendarMonth || monthKey(new Date());
  const monthDate = parseMonthKey(selectedMonth);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startsOn = new Date(year, month, 1).getDay();
  const dailySource = getDailyCountSource(analytics);
  const monthlyRow = (analytics?.monthlyRegistrations || []).find((item) => String(item._id) === selectedMonth);
  const cells = [];

  for (let index = 0; index < startsOn; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${padDatePart(month + 1)}-${padDatePart(day)}`;
    const previousDate = new Date(year, month, day - 1);
    const count = Number(dailySource.counts.get(key) || 0);
    const previous = Number(dailySource.counts.get(dateKey(previousDate)) || 0);
    const comparison = previous ? ((count - previous) / previous) * 100 : count ? 100 : 0;
    const activeUsers = Math.round(count * (count > 15 ? 0.76 : 0.68));

    cells.push({
      key,
      day,
      count,
      activeUsers,
      comparison,
    });
  }

  const realMonthlyTotal = Number(monthlyRow?.count || 0);
  const summedTotal = cells.reduce((sum, cell) => sum + (cell?.count || 0), 0);
  const total = realMonthlyTotal || summedTotal;
  const max = Math.max(...cells.map((cell) => cell?.count || 0), 1);
  const highest = cells.filter(Boolean).reduce((best, cell) => (!best || cell.count > best.count ? cell : best), null);
  const todayKey = dateKey(new Date());
  const defaultSelected = selectedMonth === monthKey(new Date()) ? cells.find((cell) => cell?.key === todayKey) : highest;
  const selected = cells.find((cell) => cell?.key === state.analyticsFilters.selectedCalendarDate) || defaultSelected || highest;

  return {
    monthLabel: new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(monthDate),
    selectedMonth,
    cells,
    max,
    total,
    highest,
    average: total / daysInMonth,
    selected,
    isFallback: dailySource.isFallback,
  };
};

const fallbackCourses = [
  { title: "AI Prompt Engineering Mastery", learners: 1240, averageProgress: 78, category: "AI Skills", level: "Advanced", trend: "+18% this week" },
  { title: "No-Code Automation Systems", learners: 980, averageProgress: 71, category: "Automation", level: "Intermediate", trend: "+14% this week" },
  { title: "Generative Design Workflow", learners: 760, averageProgress: 64, category: "Design", level: "Beginner", trend: "+11% this week" },
  { title: "AI Content Strategy", learners: 640, averageProgress: 69, category: "Marketing", level: "Intermediate", trend: "+9% this week" },
  { title: "Data Analysis With AI", learners: 580, averageProgress: 74, category: "Analytics", level: "Advanced", trend: "+7% this week" },
];

const sparklineValues = (seed, index) => {
  const base = Math.max(Number(seed || 0), 10);
  return Array.from({ length: 7 }, (_, point) => Math.round(base * (0.5 + point * 0.075 + ((index + point) % 3) * 0.045)));
};

const sparklineSvg = (values, label) => {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const spread = Math.max(max - min, 1);
  const points = values.map((value, index) => {
    const x = 6 + index * 16;
    const y = 34 - ((value - min) / spread) * 24;
    return `${x},${y}`;
  });
  const area = `6,38 ${points.join(" ")} 102,38`;

  return `
    <svg class="course-sparkline" viewBox="0 0 108 42" role="img" aria-label="${escapeHtml(label)}">
      <polygon points="${area}" />
      <polyline points="${points.join(" ")}" />
    </svg>
  `;
};

const aiToolVisualThemes = [
  { bg: "#111111", accent: "#dc2626", glow: "#fee2e2", label: "AI" },
  { bg: "#18181b", accent: "#737373", glow: "#e5e5e5", label: "ML" },
  { bg: "#0a0a0a", accent: "#ef4444", glow: "#fee2e2", label: "GPT" },
  { bg: "#262626", accent: "#a3a3a3", glow: "#f5f5f5", label: "BOT" },
];

const svgDataUri = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const aiToolVisualLabel = (course, index = 0) => {
  const title = String(course.title || course.name || "").toLowerCase();
  if (title.includes("gemini")) return "G";
  if (title.includes("claude")) return "C";
  if (title.includes("chatgpt") || title.includes("openai")) return "GPT";
  if (title.includes("design")) return "IMG";
  if (title.includes("content")) return "AI";
  if (title.includes("data")) return "DB";
  return aiToolVisualThemes[index % aiToolVisualThemes.length].label;
};

const getAiToolVisualUrl = (course, index = 0) => {
  const theme = aiToolVisualThemes[index % aiToolVisualThemes.length];
  const label = aiToolVisualLabel(course, index);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${theme.bg}" />
          <stop offset="1" stop-color="${theme.accent}" />
        </linearGradient>
        <radialGradient id="glow" cx="28%" cy="24%" r="70%">
          <stop offset="0" stop-color="${theme.glow}" stop-opacity="0.42" />
          <stop offset="1" stop-color="${theme.glow}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="96" height="96" rx="28" fill="url(#bg)" />
      <rect width="96" height="96" rx="28" fill="url(#glow)" />
      <path d="M24 58c8-24 16-24 24 0 8-24 16-24 24 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.9" />
      <circle cx="28" cy="28" r="5" fill="#fff" opacity="0.95" />
      <circle cx="68" cy="28" r="5" fill="#fff" opacity="0.72" />
      <text x="48" y="78" fill="#fff" font-family="Arial, sans-serif" font-size="${label.length > 2 ? 17 : 24}" font-weight="900" text-anchor="middle">${label}</text>
    </svg>
  `;

  return svgDataUri(svg);
};

const getProvidedAiToolImageUrl = (course) => course.logo || course.thumbnail || course.image || course.imageUrl || course.iconUrl || "";

const courseThumbMarkup = (course, index = 0) => {
  const providedUrl = getProvidedAiToolImageUrl(course);
  const fallbackUrl = getAiToolVisualUrl(course, index);
  const logoUrl = providedUrl || fallbackUrl;
  const label = course.title || "AI";

  return `
    <div class="course-thumb has-logo" aria-hidden="true">
      <img src="${escapeHtml(logoUrl)}" data-fallback-src="${escapeHtml(fallbackUrl)}" alt="" loading="lazy" onerror="this.onerror=null; this.src=this.dataset.fallbackSrc;" />
      <span>${escapeHtml(initials(label))}</span>
    </div>
  `;
};

const getPopularCoursesModel = (analytics) => {
  const apiRows = analytics?.popularCourses || [];
  const rows = (apiRows.length ? apiRows : fallbackCourses).slice(0, 5);

  return {
    isFallback: !apiRows.length,
    courses: rows.map((course, index) => {
      const learners = Number(course.learners || course.totalEnrolledUsers || course.enrolledUsers || 0);
      const completion = Math.max(0, Math.min(100, Number(course.averageProgress ?? course.completionPercentage ?? 0)));
      const activeLearners = Number(course.activeLearners || Math.round(learners * (0.48 + completion / 220)));
      const category = course.category || course.level || ["AI Skills", "Automation", "Design", "Marketing", "Analytics"][index] || "Course";
      const level = course.level || ["Advanced", "Intermediate", "Beginner", "Intermediate", "Advanced"][index] || "Live";
      const trend = course.trend || `+${Math.max(6, Math.round((learners % 17) + 5))}% this week`;
      const weekly = Array.isArray(course.weeklyUsage) ? course.weeklyUsage.map(Number) : sparklineValues(learners, index);

      return {
        title: course.title || `Course ${index + 1}`,
        category,
        level,
        learners,
        activeLearners,
        completion,
        trend,
        weekly,
        logo: getProvidedAiToolImageUrl(course),
        icon: ["book-open", "workflow", "palette", "megaphone", "bar-chart-3"][index] || "book-open",
      };
    }),
  };
};

const analyticsSkeleton = () => `
  <div class="analytics-skeleton-grid" aria-label="Loading analytics">
    <div class="skeleton-card skeleton-large"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  </div>
`;

const renderUserGrowthCard = (analytics, stats) => {
  const model = getUserGrowthModel(analytics, stats);

  return `
    <section class="card panel-large analytics-card analytics-growth-card reveal">
      <div class="panel-header analytics-card-header">
        <div>
          <h2>User Growth</h2>
          <p class="chart-subtitle">Tracking new users over the past week</p>
        </div>
        <div class="chart-actions">
          <label class="visually-hidden" for="user-growth-range">User growth range</label>
          <select id="user-growth-range" data-growth-range aria-label="Filter user growth range">
            <option value="7" ${model.days === 7 ? "selected" : ""}>Last 7 Days</option>
            <option value="14" ${model.days === 14 ? "selected" : ""}>Last 14 Days</option>
            <option value="30" ${model.days === 30 ? "selected" : ""}>Last 30 Days</option>
          </select>
        </div>
      </div>
      ${model.isFallback ? `<p class="analytics-preview-note">Preview data only. Connect analytics API rows to replace it.</p>` : ""}
      <div class="growth-summary" aria-label="User growth summary">
        <div><span>Total Users</span><strong>${wholeNumber(model.totalUsers)}</strong></div>
        <div><span>New Users This Week</span><strong>${wholeNumber(model.newUsers)}</strong></div>
        <div><span>Growth Rate</span><strong>${percentLabel(model.growthRate)}</strong></div>
      </div>
      <div class="premium-chart-frame growth-chart-frame">
        <canvas id="chart-user-growth" class="chart-canvas growth-canvas" data-chart="userGrowth"></canvas>
      </div>
    </section>
  `;
};

const renderCalendarCard = (analytics) => {
  const model = getCalendarModel(analytics);
  const selected = model.selected;
  const selectedComparison = `${(selected?.comparison || 0) >= 0 ? "+" : ""}${percentLabel(selected?.comparison || 0)} vs previous day`;

  return `
    <section class="card panel-small analytics-card registration-card monthly-registration-card reveal">
      <div class="panel-header analytics-card-header">
        <div>
          <h2>Monthly Registrations</h2>
          <p class="chart-subtitle">Daily signup density and movement</p>
        </div>
        <div class="calendar-actions" aria-label="Calendar month controls">
          <button class="icon-btn" data-calendar-month="prev" type="button" aria-label="Previous month">${iconMarkup("chevron-left")}</button>
          <button class="mini" data-calendar-month="this" type="button">This Month</button>
          <button class="icon-btn" data-calendar-month="next" type="button" aria-label="Next month">${iconMarkup("chevron-right")}</button>
        </div>
      </div>
      ${model.isFallback ? `<p class="analytics-preview-note">Preview heatmap data. API rows will replace this automatically.</p>` : ""}
      <div class="registration-dashboard">
        <div class="registration-month-panel">
          <div class="calendar-title-row">
            <div class="registration-month-title">
              <strong>${escapeHtml(model.monthLabel)}</strong>
            </div>
            <span>${wholeNumber(model.total)} registrations</span>
          </div>
          <div class="registration-calendar" role="grid" aria-label="Monthly registration calendar for ${escapeHtml(model.monthLabel)}">
            ${weekdayLabels.map((day) => `<span class="calendar-weekday" role="columnheader">${day}</span>`).join("")}
            ${model.cells
              .map((cell) => {
                if (!cell) return `<span class="calendar-cell calendar-empty" aria-hidden="true"></span>`;
                const level = cell.count <= 0 ? 0 : cell.count === 1 ? 1 : cell.count === 2 ? 2 : Math.min(5, Math.ceil((cell.count / model.max) * 5));
                const comparison = `${cell.comparison >= 0 ? "+" : ""}${percentLabel(cell.comparison)} vs previous day`;
                const report = `${longDateLabel(cell.key)}: ${wholeNumber(cell.count)} registrations, ${wholeNumber(cell.activeUsers)} active users, ${comparison}`;
                return `
                  <button
                    class="calendar-cell heat-${level} ${selected?.key === cell.key ? "selected" : ""}"
                    data-calendar-date="${escapeHtml(cell.key)}"
                    type="button"
                    aria-label="${escapeHtml(report)}"
                  >
                    <span>${cell.day}</span>
                    <b>${wholeNumber(cell.count)}</b>
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>
      </div>
      <div class="calendar-day-report" aria-live="polite">
        <span>${escapeHtml(selected ? longDateLabel(selected.key) : "No day selected")}</span>
        <strong>${wholeNumber(selected?.count || 0)} registrations</strong>
        <em>${wholeNumber(selected?.activeUsers || 0)} active users · ${selectedComparison}</em>
      </div>
      <div class="registration-summary">
        <div><span>Total registrations this month</span><strong>${wholeNumber(model.total)}</strong></div>
        <div><span>Highest registration day</span><strong>${model.highest ? `${shortDateLabel(model.highest.key)} · ${wholeNumber(model.highest.count)}` : "-"}</strong></div>
        <div><span>Average registrations per day</span><strong>${wholeNumber(model.average)}</strong></div>
      </div>
    </section>
  `;
};

const renderPopularCoursesCard = (analytics) => {
  const model = getPopularCoursesModel(analytics);

  return `
    <section class="card panel-small analytics-card courses-usage-card reveal">
      <div class="panel-header analytics-card-header">
        <div>
          <h2>Popular Courses</h2>
          <p class="chart-subtitle">Course usage analytics this week</p>
        </div>
        <div class="chart-actions">
          <button type="button" data-view="courses">View All</button>
        </div>
      </div>
      ${model.isFallback ? `<p class="analytics-preview-note">Preview courses only. Live course usage will appear when available.</p>` : ""}
      <div class="course-usage-list">
        ${model.courses
          .map((course, index) => `
            <article class="course-usage-row">
              ${courseThumbMarkup(course, index)}
              <div class="course-usage-main">
                <div class="course-usage-topline">
                  <div>
                    <h3>${escapeHtml(course.title)}</h3>
                    <p>${escapeHtml(course.category)} · ${escapeHtml(course.level)}</p>
                  </div>
                  <span class="trend-badge">${escapeHtml(course.trend)}</span>
                </div>
                <div class="course-usage-metrics">
                  <span><b>${compactNumber(course.learners)}</b> enrolled</span>
                  <span><b>${compactNumber(course.activeLearners)}</b> active</span>
                  <span><b>${percentLabel(course.completion)}</b> complete</span>
                </div>
                <div class="course-progress-line" aria-label="${escapeHtml(course.title)} completion ${percentLabel(course.completion)}">
                  <i style="width:${course.completion}%"></i>
                </div>
              </div>
              ${sparklineSvg(course.weekly, `${course.title} weekly enrollments`)}
            </article>
          `)
          .join("")}
      </div>
    </section>
  `;
};

const renderLogin = () => {
  app.innerHTML = `
    <section class="auth-view">
      <div class="auth-panel">
        <div class="auth-panel-inner">
          <p class="brand">CrackWithAI Admin</p>
          <div class="login-hero">
            <h1>Login to your account</h1>
            <p class="subtitle">Enter your credentials to access the admin dashboard.</p>
          </div>
          ${state.error ? `<div class="alert error">${escapeHtml(state.error)}</div>` : ""}
          ${state.message ? `<div class="alert info">${escapeHtml(state.message)}</div>` : ""}
          <form class="form login-form" id="login-form">
            <label class="field">
              <span>Email</span>
              <input name="email" type="email" autocomplete="email" required />
            </label>
            <label class="field">
              <span>Password</span>
              <input name="password" type="password" autocomplete="current-password" required />
            </label>
            <div class="form-row">
              <label class="check-field">
                <input name="remember" type="checkbox" />
                <span>Remember me</span>
              </label>
              <button class="link-btn forgot-link" type="button">Forgot password?</button>
            </div>
            <button class="btn login-btn" type="submit" ${state.loading ? "disabled" : ""}>
              ${state.loading ? "Signing in..." : "Login"}
            </button>
          </form>
          <div class="setup-divider"></div>
          <button class="link-btn" id="toggle-setup" type="button">Create first admin</button>
          <form class="form hidden" id="setup-form">
            <label class="field">
              <span>Setup secret</span>
              <input name="setupSecret" type="password" autocomplete="off" required />
            </label>
            <label class="field">
              <span>Full name</span>
              <input name="fullName" autocomplete="name" required />
            </label>
            <label class="field">
              <span>Email</span>
              <input name="email" type="email" autocomplete="email" required />
            </label>
            <label class="field">
              <span>Password</span>
              <input name="password" type="password" autocomplete="new-password" minlength="6" required />
            </label>
            <button class="btn secondary" type="submit" ${state.loading ? "disabled" : ""}>Create admin</button>
          </form>
        </div>
      </div>
    </section>
  `;

  document.querySelector("#login-form").addEventListener("submit", login);
  document.querySelector("#setup-form").addEventListener("submit", bootstrap);
  document.querySelector("#toggle-setup").addEventListener("click", () => {
    document.querySelector("#setup-form").classList.toggle("hidden");
  });
};

const renderSessionLoading = () => {
  app.innerHTML = `
    <section class="auth-view">
      <div class="auth-panel session-panel">
        <p class="brand">CrackWithAI Admin</p>
        <h1>Opening admin panel</h1>
        <p class="subtitle">Checking your secure session...</p>
        <div class="loading-line"></div>
        <button class="link-btn" id="reset-session" type="button">Return to login</button>
      </div>
    </section>
  `;

  document.querySelector("#reset-session")?.addEventListener("click", () => logout());
};

const renderDashboard = () => {
  const stats = state.stats || {};
  const users = stats.users || {};
  const courses = stats.courses || {};
  const modules = stats.modules || {};
  const aiTools = stats.aiTools || {};
  const certs = stats.certificates || {};
  const learning = stats.learning || {};
  const analytics = state.analytics || {};
  const dashboardMetrics = [
    { label: "Total Users", value: users.total ?? 0, note: `${users.active ?? 0} active`, icon: "users", trend: "Live", type: "users" },
    { label: "Daily Active", value: users.dailyActive ?? 0, note: `${users.weeklyActive ?? 0} weekly`, icon: "activity", trend: "Today", type: "daily-active" },
    { label: "Courses", value: courses.total ?? 0, note: `${courses.published ?? 0} published`, icon: "graduation-cap", trend: "Content", type: "courses" },
    { label: "AI Tools", value: aiTools.total ?? 0, note: `${aiTools.active ?? 0} active`, icon: "wand", trend: "Tools", type: "ai-tools" },
    { label: "Certificates", value: certs.issued ?? 0, note: "issued", icon: "shield", trend: "Trust", type: "certificates" },
    { label: "Registrations", value: users.newRegistrations ?? 0, note: "last 7 days", icon: "bar-chart-2", trend: "Growth", type: "registrations" },
    { label: "Avg Completion", value: `${learning.averageProgress ?? 0}%`, note: `${learning.completedEnrollments ?? 0} complete`, icon: "pie-chart", trend: "Learning", type: "completion", percentage: learning.averageProgress ?? 0 },
    { label: "Lessons", value: modules.lessons ?? 0, note: `${modules.total ?? 0} modules`, icon: "book-open", trend: "Library", type: "lessons" }
  ];

  return `
    <section class="hero-card card reveal">
      <div>
        <p class="eyebrow">Command center</p>
        <h2>Good morning, ${escapeHtml(state.admin?.fullName || "Admin")}</h2>
        <p class="hero-copy">Live platform health, learning performance, users, and AI tool activity in one focused admin workspace.</p>
      </div>
      <div class="hero-actions">
        <button class="btn" data-view="courses" type="button">${iconMarkup("plus", "Add course")}</button>
        <button class="btn secondary" data-view="aiTools" type="button">${iconMarkup("sparkles", "Review AI tools")}</button>
      </div>
    </section>

    ${renderDashboardMetricsTable(dashboardMetrics)}

    ${!state.analytics && state.loading ? analyticsSkeleton() : `
    <div class="grid dashboard-panels premium-analytics-grid">
      ${renderUserGrowthCard(analytics, stats)}
      ${renderCalendarCard(analytics)}
      ${renderPopularCoursesCard(analytics)}
    </div>
    `}
    <div class="grid dashboard-panels dashboard-secondary-panels">
      <section class="card panel-small analytics-card reveal">
        <div class="panel-header">
          <div>
            <h2>AI Tool Usage</h2>
            <p class="chart-subtitle">Usage share across top tools</p>
          </div>
          <div class="chart-actions">
            <button type="button">Top 5</button>
          </div>
        </div>
        <div class="chart-wrap"><canvas id="chart-ai-tool-usage" class="chart-canvas" data-chart="topAiTools"></canvas></div>
      </section>
    </div>
  `;
};

const renderLearning = () => `
  <section class="page-hero card reveal">
    <div>
      <p class="eyebrow">Learning operations</p>
      <h2>Build and maintain every course path from one clean control room.</h2>
      <p>Review courses, modules, lessons, quizzes, progress, and certificates without leaving the admin portal.</p>
    </div>
    <button class="btn" data-view="courses" type="button">${iconMarkup("plus", "Create content")}</button>
  </section>
  <section class="quick-grid">
    ${[
      ["courses", "Courses", "Published paths, pricing, levels, and thumbnails.", "courses"],
      ["modules", "Modules", "Order course sections and map them to live courses.", "modules"],
      ["lessons", "Lessons", "Manage lesson content, videos, order, and visibility.", "lessons"],
      ["quizzes", "Quizzes", "Create API-backed questions, options, and answers.", "quizzes"],
      ["certificates", "Certificates", "Review issued and locked certificate records.", "certificates"],
    ].map(([view, title, copy, animation]) => `
      <button class="quick-card reveal" data-view="${view}" type="button">
        ${learningCardAnimation(animation)}
        <span>
          <b>${title}</b>
          <small>${copy}</small>
        </span>
        <span class="learning-card-arrow" aria-hidden="true"><i data-lucide="arrow-right"></i></span>
      </button>
    `).join("")}
  </section>
`;

const renderWorkspaceToolShortcut = (tool) => {
  const id = tool?._id || tool?.id || "";
  const name = tool?.name || tool?.title || "AI Tool";
  const flow = tool?.flowType || tool?.slug || "workspace";
  return `
    <button class="workspace-tool-shortcut" data-workspace-tool="${escapeHtml(id)}" type="button" aria-selected="false" aria-label="Open ${escapeHtml(name)} in AI tools">
      <span class="workspace-tool-icon">${renderAiToolAnimation(tool)}</span>
      <span class="workspace-tool-copy">
        <strong>${escapeHtml(name)}</strong>
        <small><i aria-hidden="true"></i>${escapeHtml(flow)}</small>
      </span>
    </button>
  `;
};

const renderWorkspaceQuickStart = () => {
  const status = state.workspaceTools.status;

  if (status === "idle" || status === "loading") {
    return `
      <aside class="workspace-quick-card is-loading" aria-live="polite" aria-busy="true">
        <div class="workspace-skeleton" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
          <b></b>
        </div>
        <p class="visually-hidden">Loading workspace tools</p>
      </aside>
    `;
  }

  if (status === "error") {
    return `
      <aside class="workspace-quick-card is-error" role="alert" aria-live="polite">
        <p class="workspace-quick-label">WORKSPACE DISCONNECTED</p>
        <h3>Unable to load workspace tools.</h3>
        <p class="workspace-quick-copy">${escapeHtml(state.workspaceTools.error || "Check the connection and try again.")}</p>
        <button class="btn secondary workspace-retry-button" data-workspace-retry type="button">
          ${iconMarkup("refresh-cw", "Retry")}
        </button>
      </aside>
    `;
  }

  const tools = activeAiTools();
  const previewTools = tools.slice(0, 3);

  if (!tools.length) {
    return `
      <aside class="workspace-quick-card is-empty" aria-live="polite">
        <p class="workspace-quick-label">WORKSPACE READY</p>
        <h3>Start with an AI tool</h3>
        <p class="workspace-quick-copy">No active AI tools are available.</p>
        <button class="btn secondary workspace-open-button" data-view="aiTools" type="button">
          ${iconMarkup("settings-2", "Manage AI Tools")}
        </button>
      </aside>
    `;
  }

  return `
    <aside class="workspace-quick-card is-ready" aria-live="polite">
      <p class="workspace-quick-label">WORKSPACE READY</p>
      <h3>Start with an AI tool</h3>
      <p class="workspace-quick-copy">Pick an active tool to continue through the existing AI Tools workspace.</p>
      <div class="workspace-tool-list">
        ${previewTools.map(renderWorkspaceToolShortcut).join("")}
      </div>
      <div class="workspace-tool-footer">
        <span>${tools.length} active ${tools.length === 1 ? "tool" : "tools"} available</span>
        <button class="btn workspace-open-button" data-view="aiTools" type="button">
          ${iconMarkup("arrow-right", "Open Workspace")}
        </button>
      </div>
    </aside>
  `;
};

const renderWorkspace = () => `
  <section class="workspace-shell card reveal">
    <div class="workspace-copy">
      <p class="eyebrow">AI WORKSPACE</p>
      <h2>One workspace. Every AI task.</h2>
      <p class="workspace-description">Chat with AI, write emails, generate images, create code, summarize PDFs, translate content, and produce voice, all from one intelligent workspace.</p>
      <p class="workspace-support">Choose a tool, enter your prompt, and continue your recent work anytime.</p>
    </div>
    ${renderWorkspaceQuickStart()}
    <div class="hero-actions">
      <button class="btn workspace-primary-cta" data-view="aiTools" type="button" aria-label="Start creating in AI Workspace">${iconMarkup("sparkles", "Start Creating")}</button>
      <button class="btn secondary" data-view="categories" type="button">${iconMarkup("folder-tree", "Manage categories")}</button>
    </div>
  </section>
`;

const auditCell = (value, className = "") => {
  const safeValue = String(value || "-");
  return `<td class="${escapeHtml(className)}" title="${escapeHtml(safeValue)}">${escapeHtml(safeValue)}</td>`;
};

const auditActionParam = () => {
  const action = String(state.auditType || "").trim();
  if (action === "Admin.Login") return "admin.login";
  return action;
};

const auditActionSubject = () => {
  if (state.auditType === "Admin.Login") return "login records";
  return state.auditType ? `${state.auditType} records` : "audit records";
};

const renderAuditSkeletonRows = () =>
  Array.from({ length: state.auditLimit }, (_, index) => `
    <tr class="audit-skeleton-row" aria-hidden="true">
      <td><span></span></td>
      <td><span></span></td>
      <td><span></span></td>
      <td><span></span></td>
      <td><span></span></td>
      <td><span></span></td>
      <td><span></span></td>
    </tr>
  `).join("");

const renderAuditPagination = () => {
  const pagination = state.auditPagination || {};
  const total = Number(pagination.totalRecords || 0);
  const page = Number(pagination.page || state.auditPage || 1);
  const totalPages = Math.max(Number(pagination.totalPages || 1), 1);
  const loadedCount = Array.isArray(state.data.auditLogs) ? state.data.auditLogs.length : 0;
  const from = loadedCount ? 1 : Number(pagination.from || 0);
  const to = loadedCount || Number(pagination.to || 0);
  const visiblePage = Number(state.auditVisiblePage || page || 1);
  const previousGroupPage = Math.max(visiblePage - 1, 1);
  const nextGroupPage = visiblePage + 1;
  const hasLoadedNextGroup = Boolean(state.auditLoadedGroups?.[nextGroupPage]);
  const subject = auditActionSubject();
  const previousDisabled = state.auditLoading || visiblePage <= 1 || !state.auditLoadedGroups?.[previousGroupPage];
  const nextDisabled = state.auditLoading || (!hasLoadedNextGroup && !pagination.hasNextPage);
  const previousIcon = state.auditLoading && state.auditLoadingDirection === "previous" ? "loader-2" : "chevron-up";
  const nextIcon = state.auditLoading && state.auditLoadingDirection === "next" ? "loader-2" : "chevron-down";
  const previousBusy = state.auditLoading && state.auditLoadingDirection === "previous" ? " aria-busy=\"true\"" : "";
  const nextBusy = state.auditLoading && state.auditLoadingDirection === "next" ? " aria-busy=\"true\"" : "";
  const nextTitle = state.auditLoading && state.auditLoadingDirection === "next" ? "Loading older records..." : "↓ Show next 10";

  return `
    <div class="audit-pagination" aria-live="polite">
      <p class="audit-pagination-summary">
        <strong>Showing ${escapeHtml(from)}-${escapeHtml(to)} of ${escapeHtml(total)} ${escapeHtml(subject)}</strong>
        <span aria-current="page">Viewing group ${escapeHtml(visiblePage)} · Loaded through page ${escapeHtml(page)} of ${escapeHtml(totalPages)}</span>
      </p>
      <div class="audit-pagination-controls">
        <button class="audit-page-btn" data-audit-page="${escapeHtml(previousGroupPage)}" data-audit-direction="previous" data-audit-scroll-group="${escapeHtml(auditGroupDomId(previousGroupPage))}" type="button" ${previousDisabled ? "disabled" : ""}${previousBusy} aria-label="Show previous 10 newer login records">
          ${iconMarkup(previousIcon)}
          <span class="audit-page-btn-text">
            <strong>↑ Show previous 10</strong>
            <small>View newer login records</small>
          </span>
        </button>
        <button class="audit-page-btn" data-audit-page="${escapeHtml(hasLoadedNextGroup ? nextGroupPage : page + 1)}" data-audit-direction="next" ${hasLoadedNextGroup ? `data-audit-scroll-group="${escapeHtml(auditGroupDomId(nextGroupPage))}"` : ""} type="button" ${nextDisabled ? "disabled" : ""}${nextBusy} aria-label="Show next 10 older login records">
          ${iconMarkup(nextIcon)}
          <span class="audit-page-btn-text">
            <strong>${escapeHtml(nextTitle)}</strong>
            <small>View older login records</small>
          </span>
        </button>
      </div>
    </div>
  `;
};

const renderFormFields = (config, item = {}, mode = "create") =>
  config.fields
    .filter((field) => !(field.createOnly && mode !== "create"))
    .map((field) => {
      const value = item[field.name] ?? field.defaultValue ?? "";
      if (field.type === "json") {
        const jsonValue = value
          ? JSON.stringify(value, null, 2)
          : field.example
            ? JSON.stringify(field.example, null, 2)
            : "";

        return `
          <label class="field field-wide">
            <span>${escapeHtml(field.label)}</span>
            ${field.help ? `<small>${escapeHtml(field.help)}</small>` : ""}
            <textarea class="json-field" name="${field.name}" spellcheck="false" ${field.required ? "required" : ""}>${escapeHtml(jsonValue)}</textarea>
          </label>
        `;
      }
      if (field.type === "textarea") {
        return `
          <label class="field">
            <span>${escapeHtml(field.label)}</span>
            <textarea name="${field.name}" ${field.required ? "required" : ""}>${escapeHtml(Array.isArray(value) ? value.join(", ") : value)}</textarea>
          </label>
        `;
      }
      if (field.type === "select") {
        return `
          <label class="field">
            <span>${escapeHtml(field.label)}</span>
            <select name="${field.name}" ${field.required ? "required" : ""}>
              ${(field.options || [])
                .map(([optionValue, optionLabel]) => `<option value="${escapeHtml(optionValue)}" ${String(value) === String(optionValue) ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`)
                .join("")}
            </select>
          </label>
        `;
      }
      if (field.type === "checkbox") {
        return `
          <label class="check-field">
            <input name="${field.name}" type="checkbox" ${value ? "checked" : ""} />
            <span>${escapeHtml(field.label)}</span>
          </label>
        `;
      }
      return `
        <label class="field">
          <span>${escapeHtml(field.label)}</span>
          <input name="${field.name}" type="${field.type || "text"}" value="${escapeHtml(Array.isArray(value) ? value.join(", ") : value)}" ${field.required ? "required" : ""} />
        </label>
      `;
    })
    .join("");

const renderEntity = (key) => {
  const config = entityConfigs[key];
  const hasLoaded = Object.prototype.hasOwnProperty.call(state.data, key);
  const items = state.data[key] || [];
  const searchValue = getCurrentEntitySearch(key);
  const usesAnimatedEmpty = key === "categories" || key === "notifications";
  const isEmpty = hasLoaded && !items.length;
  const shouldShowInitialLoading = usesAnimatedEmpty && !hasLoaded;
  const isQuizzes = key === "quizzes";
  const isAiTools = key === "aiTools";
  const hasSpecialToolbar = isQuizzes || isAiTools;
  const toolbarBusy = state.loading ? "disabled aria-disabled=\"true\" aria-busy=\"true\"" : "";
  const pageCopy = {
    users: "Registered learner accounts, premium access, verification, and lifecycle controls.",
    admins: "Operator profiles, permissions, login status, and secure management actions.",
    courses: "Course cards with status, pricing, thumbnails, duration, and publishing tools.",
    modules: "Structured module boxes mapped to courses with ordering and lesson metadata.",
    lessons: "Lesson inventory with course relation, module, duration, content type, and visibility.",
    quizzes: "MongoDB-backed quiz records with questions, options, answers, marks, and status.",
    aiTools: "AI tool library with logos, pricing, integrations, categories, and visibility controls.",
    categories: "Tool category organization, ordering, and visibility.",
    certificates: "Certificate records, issue state, course relation, and revocation controls.",
    notifications: "Audience messaging records and delivery metadata.",
  };

  return `
    <section class="toolbar card reveal ${isQuizzes ? "quiz-toolbar" : ""} ${isAiTools ? "ai-tool-toolbar" : ""}">
      <div>
        <p class="eyebrow">${escapeHtml(config.title)} management</p>
        <h2>${hasSpecialToolbar ? `<span class="${isAiTools ? "ai-tool-title-wrap" : "quiz-title-wrap"}">${escapeHtml(config.title)}${isQuizzes ? `<i aria-hidden="true"></i>` : ""}</span>` : escapeHtml(config.title)}</h2>
        <p>${escapeHtml(pageCopy[key] || "Create, review, and manage records with the existing admin API.")}</p>
      </div>
      <div class="toolbar-controls">
        <div class="toolbar-search">
          <label class="visually-hidden" for="${escapeHtml(key)}-search">Search ${escapeHtml(config.title.toLowerCase())}</label>
          <input id="${escapeHtml(key)}-search" value="${escapeHtml(searchValue)}" placeholder="Search ${escapeHtml(config.title.toLowerCase())}" type="search" autocomplete="off" />
          ${searchValue ? `<button class="toolbar-search-clear" data-clear-entity-search="${escapeHtml(key)}" type="button" aria-label="Clear ${escapeHtml(config.title)} search">${iconMarkup("x")}</button>` : ""}
        </div>
        ${(config.filters || [])
          .map((filter) => `
            <select id="${key}-${filter.name}" aria-label="${escapeHtml(filter.label)}">
              ${filter.options.map(([value, label]) => `<option value="${escapeHtml(value)}" ${String(state.entityFilters[key]?.[filter.name] || "") === String(value) ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
            </select>
          `)
          .join("")}
        <button class="btn secondary ${isQuizzes ? "quiz-refresh-button" : ""} ${isAiTools ? "ai-tool-refresh-button" : ""}" data-refresh="${key}" ${hasSpecialToolbar ? toolbarBusy : ""} type="button">${hasSpecialToolbar ? iconMarkup(state.loading ? "loader-2" : "refresh-cw", "Refresh") : "Refresh"}</button>
        <button class="btn ${isQuizzes ? "quiz-create-button" : ""} ${isAiTools ? "ai-tool-create-button" : ""}" data-open-form="${key}" ${hasSpecialToolbar ? toolbarBusy : ""} type="button">${hasSpecialToolbar ? iconMarkup("plus-circle", "Create") : "Create"}</button>
      </div>
    </section>
    ${config.bulk ? renderBulkActions() : ""}
    ${renderEntitySummary(key, items.length, config.endpoint)}
    ${key === "users" ? renderUsersTable(items, isEmpty) : key === "courses" ? renderCoursesGrid(items, isEmpty) : key === "modules" ? renderModulesGrid(items, isEmpty) : key === "lessons" ? renderLessonsGrid(items, isEmpty) : key === "quizzes" ? renderQuizzesGrid(items, isEmpty) : key === "aiTools" ? renderAiToolsGrid(items, isEmpty) : `
      <section class="entity-grid ${key}-grid">
        ${items.map((item) => renderEntityCard(key, item)).join("")}
        ${shouldShowInitialLoading ? renderAnimatedEntityLoadingState(key) : ""}
        ${usesAnimatedEmpty && isEmpty ? renderAnimatedEntityEmptyState(key) : ""}
        ${isEmpty && !usesAnimatedEmpty ? `
          <div class="empty-state card">
            ${iconMarkup("inbox")}
            <h3>No ${escapeHtml(config.title.toLowerCase())} found</h3>
            <p>Use Create or adjust the filters to add and manage records.</p>
          </div>
        ` : ""}
      </section>
    `}
  `;
};

const renderBulkActions = () => `
  <div class="bulkbar">
    <span>${state.selectedIds.size} selected</span>
    <button class="mini" data-bulk-action="activate" type="button">Activate</button>
    <button class="mini" data-bulk-action="deactivate" type="button">Deactivate</button>
    <button class="mini" data-bulk-action="premium" type="button">Assign premium</button>
    <button class="mini" data-bulk-action="removePremium" type="button">Remove premium</button>
    <button class="mini danger-text" data-bulk-action="delete" type="button">Delete</button>
    <button class="mini" id="export-users" type="button">Export users</button>
  </div>
`;

const renderUserActionButton = ({ item, action, label, tooltip, icon, attributes, tone = "neutral" }) => {
  const key = actionBusyKey("users", item._id, action);
  const isBusy = state.actionBusyKey === key;
  const isUserActionBusy = Boolean(state.actionBusyKey && state.actionBusyKey.startsWith(actionBusyKey("users", item._id, "")));
  const disabled = state.loading || (isUserActionBusy && !isBusy) ? "disabled aria-disabled=\"true\"" : "";
  const busy = isBusy ? "aria-busy=\"true\"" : "";
  const safeTooltip = escapeHtml(tooltip || label);
  const buttonLabel = isBusy ? "Working..." : label;

  return `
    <button
      class="mini user-action-button ${escapeHtml(tone)}-action"
      ${attributes}
      data-user-action-key="${escapeHtml(key)}"
      data-tooltip="${safeTooltip}"
      aria-label="${safeTooltip}"
      title="${safeTooltip}"
      ${disabled}
      ${busy}
      type="button"
    >
      <span class="user-action-icon" aria-hidden="true">${iconMarkup(isBusy ? "loader-2" : icon)}</span>
      <span class="user-action-label">${escapeHtml(buttonLabel)}</span>
    </button>
  `;
};

const renderUserActions = (item) => {
  const isActive = item.isActive !== false;
  const isPremium = Boolean(item.isPremium);
  const isVerified = Boolean(item.isVerified);

  return [
    renderUserActionButton({
      item,
      action: "view",
      label: "View",
      tooltip: "View user details",
      icon: "eye",
      attributes: `data-view-record="users:${item._id}"`,
      tone: "neutral",
    }),
    renderUserActionButton({
      item,
      action: "edit",
      label: "Edit",
      tooltip: "Edit user",
      icon: "pencil",
      attributes: `data-edit-record="users:${item._id}"`,
      tone: "primary",
    }),
    renderUserActionButton({
      item,
      action: "status",
      label: isActive ? "Deactivate" : "Activate",
      tooltip: isActive ? "Deactivate user" : "Activate user",
      icon: isActive ? "user-x" : "user-check",
      attributes: `data-user-status="users:${item._id}:${isActive ? "false" : "true"}"`,
      tone: isActive ? "danger" : "success",
    }),
    renderUserActionButton({
      item,
      action: "verification",
      label: isVerified ? "Unverify" : "Verify",
      tooltip: isVerified ? "Remove user verification" : "Verify user",
      icon: isVerified ? "shield-x" : "badge-check",
      attributes: `data-user-verification="${item._id}:${isVerified ? "false" : "true"}"`,
      tone: isVerified ? "danger" : "success",
    }),
    renderUserActionButton({
      item,
      action: "premium",
      label: isPremium ? "Remove Premium" : "Assign Premium",
      tooltip: isPremium ? "Remove premium access" : "Assign premium access",
      icon: "badge-dollar-sign",
      attributes: `data-user-premium="${item._id}:${isPremium ? "false" : "true"}"`,
      tone: isPremium ? "danger" : "success",
    }),
    renderUserActionButton({
      item,
      action: "delete",
      label: "Delete",
      tooltip: "Delete user",
      icon: "trash-2",
      attributes: `data-delete-record="users:${item._id}"`,
      tone: "danger",
    }),
  ].join("");
};

const renderActions = (key, item) => {
  if (key === "users") return renderUserActions(item);

  const config = entityConfigs[key];
  const busy = state.loading ? "disabled aria-disabled=\"true\" aria-busy=\"true\"" : "";
  const actionButton = (label, attributes, className = "mini", icon = "circle") =>
    `<button class="${className}" ${attributes} ${busy} type="button">${iconMarkup(icon, label)}</button>`;

  return (config.actions || [])
    .map((action) => {
      if (action === "view") return actionButton("View", `data-view-record="${key}:${item._id}"`, "mini", "eye");
      if (action === "edit") return actionButton("Edit", `data-edit-record="${key}:${item._id}"`, "mini", "pencil");
      if (action === "delete") {
        const isSelf = key === "admins" && String(item._id) === String(state.admin?._id);
        return actionButton("Delete", `data-delete-record="${key}:${item._id}" ${isSelf ? "disabled" : ""}`, "mini danger-text", "trash-2");
      }
      if (action === "password") return actionButton("Reset password", `data-password-record="${key}:${item._id}"`, "mini", "key-round");
      if (action === "premium") return actionButton(item.isPremium ? "Remove premium" : "Assign premium", `data-user-premium="${item._id}:${item.isPremium ? "false" : "true"}"`, "mini", "badge-dollar-sign");
      if (action === "status") return actionButton(item.isActive === false ? "Activate" : "Deactivate", `data-user-status="${key}:${item._id}:${item.isActive === false ? "true" : "false"}"`, "mini", item.isActive === false ? "user-check" : "user-x");
      if (action === "publish") return actionButton("Publish", `data-status-record="${key}:${item._id}:published"`, "mini", "send");
      if (action === "archive") return actionButton("Archive", `data-status-record="${key}:${item._id}:archived"`, "mini", "archive");
      if (action === "duplicate") return actionButton("Duplicate", `data-duplicate-record="${key}:${item._id}"`, "mini", "copy");
      if (action === "feature") return actionButton(item.isFeatured ? "Unfeature" : "Feature", `data-tool-feature="${item._id}:${item.isFeatured ? "false" : "true"}"`, "mini", "star");
      if (action === "hide") return actionButton(item.status === "active" ? "Hide" : "Show", `data-tool-hide="${item._id}:${item.status === "active" ? "inactive" : "active"}"`, "mini", item.status === "active" ? "eye-off" : "eye");
      if (action === "show") return actionButton(item.isActive ? "Hide" : "Show", `data-category-show="${item._id}:${item.isActive ? "false" : "true"}"`, "mini", item.isActive ? "eye-off" : "eye");
      if (action === "revoke") return actionButton("Revoke", `data-revoke-cert="${item._id}"`, "mini danger-text", "ban");
      return "";
    })
    .join("");
};

const renderModal = (key, item = null) => {
  const config = entityConfigs[key];
  const mode = item ? "edit" : "create";
  const title = `${mode === "create" ? "Create" : "Edit"} ${config.title.slice(0, -1) || config.title}`;

  return `
    <dialog class="modal" open>
      <form class="modal-panel form" id="entity-form" data-entity="${key}" data-id="${item?._id || ""}">
        <div class="modal-head">
          <h2>${escapeHtml(title)}</h2>
          <button class="icon-btn" data-close-modal type="button">x</button>
        </div>
        ${renderFormFields(config, item || {}, mode)}
        <div class="modal-actions">
          <button class="btn secondary" data-close-modal type="button">Cancel</button>
          <button class="btn" type="submit">${mode === "create" ? "Create" : "Save"}</button>
        </div>
      </form>
    </dialog>
  `;
};

const renderDetailModal = (key, item) => `
  <dialog class="modal" open>
    <section class="modal-panel">
      <div class="modal-head">
        <h2>${escapeHtml(item.fullName || item.title || item.name || "Record")}</h2>
        <button class="icon-btn" data-close-modal type="button">x</button>
      </div>
      <pre>${escapeHtml(JSON.stringify(item, null, 2))}</pre>
    </section>
  </dialog>
`;

const renderLessonPreviewModal = (item) => {
  const resources = Array.isArray(item.resources) ? item.resources.filter(Boolean) : [];
  const previewBody = item.videoUrl
    ? `<p><a href="${escapeHtml(item.videoUrl)}" target="_blank" rel="noreferrer">Open video lesson</a></p>`
    : item.content
      ? `<pre>${escapeHtml(String(item.content))}</pre>`
      : resources.length
        ? `<ul class="lesson-preview-resources">${resources.map((resource) => `<li><a href="${escapeHtml(resource)}" target="_blank" rel="noreferrer">${escapeHtml(resource)}</a></li>`).join("")}</ul>`
        : `<p class="muted-copy">This lesson is marked as preview, but no video, content, or resource URL is available from the API.</p>`;

  return `
    <dialog class="modal" open>
      <section class="modal-panel lesson-preview-modal">
        <div class="modal-head">
          <div>
            <p class="eyebrow">Lesson preview</p>
            <h2>${escapeHtml(item.title || "Untitled lesson")}</h2>
          </div>
          <button class="icon-btn" data-close-modal type="button">x</button>
        </div>
        <div class="lesson-preview-meta">
          <span>${escapeHtml(getLessonType(item))}</span>
          <span>${escapeHtml(`${Number(item.duration || 0)} min`)}</span>
          <span>${escapeHtml(plainValue(item, "module.title", "Course lesson"))}</span>
        </div>
        ${previewBody}
      </section>
    </dialog>
  `;
};

const renderAnalytics = () => {
  if (state.loading && !state.analytics) return renderAnalyticsSkeleton();
  return renderAnalyticsOverview();
};

const settingsCardAnimation = (type, isActive = true) => {
  const activeClass = isActive ? "is-active" : "is-warning";

  if (type === "general") {
    return `
      <span class="settings-card-animation settings-animation-general ${activeClass}" aria-hidden="true">
        <svg viewBox="0 0 84 84" focusable="false">
          <circle class="settings-gear" cx="28" cy="30" r="12"></circle>
          <path class="settings-gear-teeth" d="M28 12v7M28 41v7M10 30h7M39 30h7M15 17l5 5M36 38l5 5M41 17l-5 5M20 38l-5 5"></path>
          <path class="settings-slider slider-one" d="M44 25h22"></path>
          <path class="settings-slider slider-two" d="M44 42h22"></path>
          <path class="settings-slider slider-three" d="M20 60h46"></path>
          <circle class="settings-knob knob-one" cx="54" cy="25" r="4"></circle>
          <circle class="settings-knob knob-two" cx="61" cy="42" r="4"></circle>
          <circle class="settings-knob knob-three" cx="37" cy="60" r="4"></circle>
          <circle class="settings-status-dot" cx="68" cy="18" r="5"></circle>
        </svg>
      </span>
    `;
  }

  if (type === "account") {
    return `
      <span class="settings-card-animation settings-animation-account ${activeClass}" aria-hidden="true">
        <svg viewBox="0 0 84 84" focusable="false">
          <circle class="account-head" cx="28" cy="27" r="10"></circle>
          <path class="account-body" d="M13 59c3-13 27-13 30 0"></path>
          <rect class="account-doc doc-one" x="45" y="18" width="24" height="34" rx="5"></rect>
          <rect class="account-doc doc-two" x="50" y="28" width="24" height="34" rx="5"></rect>
          <path class="account-doc-line" d="M56 42h12M56 50h9"></path>
          <circle class="account-check-disc" cx="49" cy="60" r="8"></circle>
          <path class="account-check" d="M45 60l3 3 7-8"></path>
        </svg>
      </span>
    `;
  }

  if (type === "api") {
    return `
      <span class="settings-card-animation settings-animation-api ${activeClass}" aria-hidden="true">
        <svg viewBox="0 0 84 84" focusable="false">
          <rect class="api-server" x="15" y="22" width="30" height="40" rx="8"></rect>
          <path class="api-slot" d="M24 34h12M24 45h12M24 55h8"></path>
          <circle class="api-node node-one" cx="65" cy="26" r="8"></circle>
          <circle class="api-node node-two" cx="65" cy="58" r="8"></circle>
          <path class="api-route route-one" d="M46 33h12"></path>
          <path class="api-route route-two" d="M46 52h12"></path>
          <circle class="api-packet packet-one" cx="50" cy="33" r="3"></circle>
          <circle class="api-packet packet-two" cx="54" cy="52" r="3"></circle>
          <circle class="api-check-disc" cx="70" cy="17" r="6"></circle>
        </svg>
      </span>
    `;
  }

  if (type === "security") {
    return `
      <span class="settings-card-animation settings-animation-security ${activeClass}" aria-hidden="true">
        <svg viewBox="0 0 84 84" focusable="false">
          <path class="security-shield" d="M42 12l25 10v18c0 17-10 27-25 34-15-7-25-17-25-34V22Z"></path>
          <path class="security-lock-body" d="M29 41h26v19H29Z"></path>
          <path class="security-lock-shackle" d="M35 41v-8c0-9 14-9 14 0v8"></path>
          <circle class="security-pulse" cx="42" cy="51" r="4"></circle>
        </svg>
      </span>
    `;
  }

  if (type === "smtp") {
    return `
      <span class="settings-card-animation settings-animation-smtp ${activeClass}" aria-hidden="true">
        <svg viewBox="0 0 84 84" focusable="false">
          <rect class="smtp-envelope" x="13" y="30" width="40" height="28" rx="7"></rect>
          <path class="smtp-flap" d="M15 33l18 15 18-15"></path>
          <rect class="smtp-server" x="58" y="25" width="14" height="38" rx="5"></rect>
          <path class="smtp-route" d="M53 42h10"></path>
          <circle class="smtp-message" cx="55" cy="42" r="3"></circle>
          <path class="smtp-signal signal-one" d="M23 24c7-5 15-5 22 0"></path>
          <path class="smtp-signal signal-two" d="M27 20c5-3 10-3 15 0"></path>
          <circle class="smtp-check-disc" cx="68" cy="19" r="6"></circle>
        </svg>
      </span>
    `;
  }

  return `
    <span class="settings-card-animation settings-animation-appearance ${activeClass}" aria-hidden="true">
      <svg viewBox="0 0 84 84" focusable="false">
        <rect class="appearance-panel panel-one" x="14" y="18" width="26" height="22" rx="6"></rect>
        <rect class="appearance-panel panel-two" x="44" y="18" width="26" height="22" rx="6"></rect>
        <rect class="appearance-panel panel-three" x="14" y="47" width="56" height="18" rx="6"></rect>
        <circle class="appearance-dot dot-black" cx="24" cy="56" r="4"></circle>
        <circle class="appearance-dot dot-green" cx="38" cy="56" r="4"></circle>
        <circle class="appearance-dot dot-red" cx="52" cy="56" r="4"></circle>
        <path class="appearance-brush" d="M63 46l7 7-11 11-7-7Z"></path>
        <path class="appearance-sweep" d="M21 28h12M51 28h12"></path>
      </svg>
    </span>
  `;
};

const renderSettings = () => {
  const settings = state.settingsDraft || state.settings || {};
  const settingGroups = [
    {
      title: "General Settings",
      type: "general",
      fields: [["platformName", "Platform name"], ["logoUrl", "Logo URL"], ["contactEmail", "Contact email"]],
    },
    {
      title: "Account Settings",
      type: "account",
      fields: [["privacyPolicyUrl", "Privacy policy URL"], ["termsUrl", "Terms URL"]],
    },
    {
      title: "API Configuration",
      type: "api",
      fields: [["storageProvider", "Storage provider"]],
    },
  ];
  const saveIcon = state.settingsSaveStatus === "success"
    ? "check"
    : state.settingsSaveStatus === "error"
      ? "alert-circle"
      : state.loading
        ? "loader-2"
        : "save";
  const saveLabel = state.settingsSaveStatus === "success"
    ? "Saved"
    : state.settingsSaveStatus === "error"
      ? "Retry save"
      : state.loading
        ? "Saving"
        : "Save settings";

  return `
    <section class="page-hero card reveal">
      <div>
        <p class="eyebrow">System controls</p>
        <h2>Settings built for confident operations.</h2>
        <p>Grouped configuration cards use the same settings payload and save endpoint already in the portal.</p>
      </div>
    </section>
    <form class="settings-form" id="settings-form">
      <div class="settings-grid">
        ${settingGroups.map((group) => `
          <section class="settings-box card reveal">
            <div class="settings-box-head">
              ${settingsCardAnimation(group.type, true)}
              <h3>${escapeHtml(group.title)}</h3>
            </div>
            ${group.fields.map(([name, label]) => `
              <label class="field">
                <span>${escapeHtml(label)}</span>
                <input name="${name}" value="${escapeHtml(settings[name] || "")}" />
              </label>
            `).join("")}
          </section>
        `).join("")}
        <section class="settings-box card reveal">
          <div class="settings-box-head">
            ${settingsCardAnimation("security", Boolean(settings.jwtConfigured))}
            <h3>Security</h3>
            <span class="settings-card-status ${settings.maintenanceMode ? "warning" : "ok"}">${settings.maintenanceMode ? "Maintenance" : "Protected"}</span>
          </div>
          <label class="switch-field">
            <input name="maintenanceMode" type="checkbox" ${settings.maintenanceMode ? "checked" : ""} />
            <span></span>
            <b>Maintenance mode</b>
          </label>
          <div class="config-flags">
            <span class="pill ${settings.jwtConfigured ? "ok" : "warn"}">JWT ${settings.jwtConfigured ? "configured" : "missing"}</span>
            <span class="pill muted">${escapeHtml(settings.environment || "development")}</span>
          </div>
        </section>
        <section class="settings-box card reveal">
          <div class="settings-box-head">
            ${settingsCardAnimation("smtp", Boolean(settings.smtpConfigured))}
            <h3>Email and SMTP</h3>
            <span class="settings-card-status ${settings.smtpConfigured ? "ok" : "warning"}">${settings.smtpConfigured ? "Ready" : "Needs setup"}</span>
          </div>
          <div class="config-flags stacked">
            <span class="pill ${settings.smtpConfigured ? "ok" : "warn"}">SMTP ${settings.smtpConfigured ? "configured" : "missing"}</span>
            <span class="pill muted">Contact: ${escapeHtml(settings.contactEmail || "-")}</span>
          </div>
        </section>
        <section class="settings-box card reveal">
          <div class="settings-box-head">
            ${settingsCardAnimation("appearance", true)}
            <h3>Appearance</h3>
          </div>
          <p class="muted-copy">Black, green, and red accents keep cards, charts, focus states, and actions clear across the admin experience.</p>
        </section>
      </div>
      <div class="sticky-save">
        <button class="btn settings-save-btn ${state.settingsSaveStatus ? `save-${state.settingsSaveStatus}` : ""}" type="submit" ${state.loading ? "disabled aria-busy=\"true\"" : ""}>${iconMarkup(saveIcon, saveLabel)}</button>
      </div>
    </form>
  `;
};

const renderAuditLogs = () => {
  const logs = state.data.auditLogs || [];
  const isLoading = state.auditLoading;
  const isError = Boolean(state.auditError);
  const showTableError = isError && !logs.length;

  return `
    <section class="toolbar card reveal">
      <div>
        <p class="eyebrow">Audit trail</p>
        <h2>Audit Logs</h2>
        <p>Review admin activity with a clean table view and status-coded actions.</p>
      </div>
      <div class="toolbar-controls">
        <div class="toolbar-search">
          <label class="visually-hidden" for="audit-search">Search audit logs</label>
          <input id="audit-search" placeholder="Search logs" value="${escapeHtml(state.auditSearch)}" type="search" autocomplete="off" />
          ${state.auditSearch ? `<button class="toolbar-search-clear" data-clear-audit-search type="button" aria-label="Clear audit search">${iconMarkup("x")}</button>` : ""}
        </div>
        <select id="audit-type" aria-label="Filter audit action">
          ${[
            ["", "All actions"],
            ["Admin.Login", "Admin Login"],
            ["created", "Create"],
            ["updated", "Update"],
            ["deleted", "Delete"],
          ].map(([value, label]) => `<option value="${value}" ${state.auditType === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
        <button class="btn secondary" data-refresh-logs type="button">Refresh</button>
      </div>
    </section>
    <section class="card audit-table-card reveal">
      <div class="audit-table-wrap">
        <table class="audit-table">
          <thead>
            <tr>
              <th scope="col">Action</th>
              <th scope="col">Activity</th>
              <th scope="col">Admin</th>
              <th scope="col">Entity</th>
              <th scope="col">Record</th>
              <th scope="col">IP / Device</th>
              <th scope="col">Time</th>
            </tr>
          </thead>
          <tbody>
            ${isLoading && !logs.length ? renderAuditSkeletonRows() : showTableError ? `
              <tr>
                <td colspan="7" class="audit-empty audit-error">
                  ${iconMarkup("circle-alert")}
                  <span>Unable to load audit logs</span>
                  <small>${escapeHtml(state.auditError)}</small>
                  <button class="btn secondary audit-retry-btn" data-refresh-logs type="button">Retry</button>
                </td>
              </tr>
            ` : logs.map((log, index) => {
              const rowRecord = { ...log, _id: auditLogRecordId(log, index) };
              const device = [log.ipAddress, log.device || log.userAgent].filter(Boolean).join(" / ") || "-";
              const groupEntry = Object.entries(state.auditLoadedGroups || {}).find(([, group]) => Number(group.start) === index);
              const groupPage = groupEntry ? Number(groupEntry[0]) : 0;
              const groupAttributes = groupPage ? ` data-audit-group-id="${escapeHtml(auditGroupDomId(groupPage))}" data-audit-group-page="${escapeHtml(groupPage)}"` : "";
              return `
                <tr class="${isHighlightedRecord("auditLogs", rowRecord) ? "record-highlight" : ""}" ${groupAttributes} ${recordDomAttributes("auditLogs", rowRecord)}>
                  <td>${statusPill(log.action || "Activity")}</td>
                  ${auditCell(log.description || log.action || "Admin activity", "audit-description")}
                  ${auditCell(log.admin?.email || "-")}
                  ${auditCell(log.entityType || "-")}
                  ${auditCell(log.entityId || "-")}
                  ${auditCell(device)}
                  ${auditCell(formatDate(log.createdAt))}
                </tr>
              `;
            }).join("") || `
              <tr>
                <td colspan="7" class="audit-empty">
                  ${iconMarkup("file-search")}
                  <span>No ${escapeHtml(state.auditType || "audit")} logs found</span>
                  <small>Try another action filter, clear the search, or refresh the current page.</small>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
      ${isError && logs.length ? `
        <div class="audit-inline-error" role="alert">
          ${iconMarkup("circle-alert")}
          <span>${escapeHtml(state.auditError)}</span>
          <button class="audit-inline-retry" data-refresh-logs type="button">Retry</button>
        </div>
      ` : ""}
      ${renderAuditPagination()}
    </section>
  `;
};

const renderProfile = () => `
  <section class="profile-hero card reveal">
    ${avatarMarkup(state.admin?.fullName || state.admin?.email, state.admin?.avatar || state.admin?.profileImage, "avatar-profile")}
    <div>
      <p class="eyebrow">Admin profile</p>
      <h2>${escapeHtml(state.admin?.fullName || "Admin")}</h2>
      <p>${escapeHtml(state.admin?.email || "")}</p>
    </div>
    ${statusPill(state.admin?.isActive ? "Active" : "Inactive")}
  </section>
  <section class="profile-dashboard">
    <article class="card reveal">
      <h3>Personal details</h3>
      <div class="profile-table-wrap">
        <table class="profile-table">
          <tbody>
            <tr><th scope="row">Role</th><td>${escapeHtml(state.admin?.role || "admin")}</td></tr>
            <tr><th scope="row">Email</th><td>${escapeHtml(state.admin?.email || "-")}</td></tr>
            <tr><th scope="row">Joined</th><td>${escapeHtml(formatDate(state.admin?.createdAt))}</td></tr>
            <tr><th scope="row">Last login</th><td>${escapeHtml(formatDate(state.admin?.lastLogin))}</td></tr>
          </tbody>
        </table>
      </div>
    </article>
    <article class="card reveal">
      <h3>Account security</h3>
      <div class="profile-table-wrap">
        <table class="profile-table security-table">
          <tbody>
            <tr><th scope="row">${iconMarkup("shield-check", "Session")}</th><td>Authenticated admin session</td></tr>
            <tr><th scope="row">${iconMarkup("key-round", "Password")}</th><td>Password reset is available from Admins page</td></tr>
            <tr><th scope="row">${iconMarkup("activity", "Audit")}</th><td>Audit events are tracked in Audit Logs</td></tr>
          </tbody>
        </table>
      </div>
    </article>
    <article class="card reveal profile-form-card">
      <h3>Edit profile</h3>
      <p class="muted-copy">Profile editing continues through the existing admin management action flow.</p>
      <button class="btn secondary" data-view="admins" type="button">${iconMarkup("users", "Open admins")}</button>
    </article>
  </section>
`;

const viewTitle = () => {
  if (entityConfigs[state.view]) return entityConfigs[state.view].title;
  const item = navItems.find((nav) => nav.key === state.view);
  return item?.label || "Dashboard";
};

const renderApp = () => {
  saveSidebarScrollPosition();

  let content = "";
  if (state.view === "dashboard") content = renderDashboard();
  else if (state.view === "learning") content = renderLearning();
  else if (state.view === "workspace") content = renderWorkspace();
  else if (state.view === "analytics") content = renderAnalytics();
  else if (state.view === "settings") content = renderSettings();
  else if (state.view === "auditLogs") content = renderAuditLogs();
  else if (state.view === "profile") content = renderProfile();
  else if (entityConfigs[state.view]) content = renderEntity(state.view);

  document.body.classList.toggle("courses-admin-page", state.view === "courses");
  document.body.classList.toggle("learning-admin-page", state.view === "learning");
  document.body.classList.toggle("modules-admin-page", state.view === "modules");
  document.body.classList.toggle("lessons-admin-page", state.view === "lessons");
  document.body.classList.toggle("quizzes-admin-page", state.view === "quizzes");
  document.body.classList.toggle("ai-tools-admin-page", state.view === "aiTools");
  document.body.classList.toggle("analytics-admin-page", state.view === "analytics");
  document.body.classList.toggle("certificates-admin-page", state.view === "certificates");
  document.body.classList.toggle("categories-admin-page", state.view === "categories");
  document.body.classList.toggle("notifications-admin-page", state.view === "notifications");
  document.body.classList.toggle("settings-admin-page", state.view === "settings");

  const sections = [...new Set(navItems.map((item) => item.section))];
  app.innerHTML = `
    <section class="layout">
      <aside class="sidebar">
        <a class="brand brand-link" href="?view=dashboard" data-view="dashboard" aria-label="Go to Admin Dashboard">
          <span class="brand-logo-shell" aria-hidden="true">
            <img
              class="brand-logo"
              src="/assets/brand/crackwithai-admin-logo.svg"
              alt=""
              width="56"
              height="56"
              draggable="false"
              decoding="async"
              fetchpriority="high"
              onerror="this.hidden=true; this.nextElementSibling.hidden=false;"
            />
            <span class="brand-mark brand-fallback" hidden>C</span>
          </span>
          <span class="brand-copy"><b>CrackWithAI</b><small>Admin Panel</small></span>
        </a>
        <nav class="nav">
          ${sections
            .map((section) => `
              <p class="nav-section">${escapeHtml(section)}</p>
              ${navItems
                .filter((item) => item.section === section)
                .map((item) => {
                  const isActive = state.view === item.key;
                  return `<button class="${isActive ? "active" : ""}" data-view="${item.key}" type="button" ${isActive ? 'aria-current="page"' : ""}>${iconMarkup(item.icon || "circle", item.label)}</button>`;
                })
                .join("")}
            `)
            .join("")}
        </nav>
        <div class="sidebar-upgrade">
          <b>${iconMarkup("crown", "Go Premium")}</b>
          <p>Unlock all premium features & tools</p>
          <button class="btn" data-view="settings" type="button">Upgrade Now</button>
        </div>
        <p class="sidebar-copy">© 2026 CrackWithAI<br />All rights reserved.</p>
      </aside>
      <section class="main">
        <header class="topbar">
          <div class="left">
            <div>
              <h1>${escapeHtml(viewTitle())}</h1>
              <p class="breadcrumb">Admin Panel · <span class="current-date">${new Date().toLocaleDateString()}</span></p>
            </div>
            ${renderGlobalSearch()}
          </div>
          <div class="actions">
            ${renderAccountMenu()}
          </div>
        </header>
        ${state.error ? `<div class="alert error">${escapeHtml(state.error)}</div>` : ""}
        ${state.message ? `<div class="alert info">${escapeHtml(state.message)}</div>` : ""}
        ${state.loading ? `<div class="loading-line"></div>` : ""}
        ${content}
      </section>
    </section>
  `;

  if (window.lucide && typeof lucide.replace === 'function') try{ lucide.replace(); }catch(e){}
  restoreSidebarScrollPosition();
  bindEvents();
  bindSidebarScrollPersistence();
  bindRouteEvents();
  restoreGlobalSearchFocus();
  restoreAccountMenuFocus();
  scrollHighlightedRecordIntoView();
  initCharts();
  initCountUps();
  initCertificateSummaryAnimations();
  initSettingsAnimations();
};

const initCharts = () => {
  if (typeof Chart === 'undefined') return;
  try {
    const makeDataset = (arr, valueKey='count') => ({labels:(arr||[]).map(a=>a._id||a.title||a.name||''),data:(arr||[]).map(a=>Number(a[valueKey]||0))});
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const analyticsAnimation = prefersReducedMotion ? false : { duration: 850, easing: 'easeOutQuart' };
    const analyticsGridColor = 'rgba(11, 15, 12, 0.08)';
    const analyticsGrowthRows = getAnalyticsUserGrowthSeries();
    const analyticsGrowthCtx = document.getElementById('analytics-user-growth-chart');

    if (analyticsGrowthCtx && analyticsGrowthRows.length) {
      const chartContext = analyticsGrowthCtx.getContext('2d');
      const gradient = chartContext.createLinearGradient(0, 0, 0, 280);
      gradient.addColorStop(0, 'rgba(22, 163, 74, 0.24)');
      gradient.addColorStop(1, 'rgba(22, 163, 74, 0)');

      new Chart(chartContext, {
        type: 'line',
        data: {
          labels: analyticsGrowthRows.map((row) => row.label),
          datasets: [{
            label: 'New users',
            data: analyticsGrowthRows.map((row) => row.value),
            borderColor: '#15803D',
            backgroundColor: gradient,
            borderWidth: 3,
            pointBackgroundColor: '#15803D',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 3,
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: true,
            tension: 0.42,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: analyticsAnimation,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: { display: false },
            tooltip: {
              displayColors: false,
              callbacks: {
                title: (items) => analyticsGrowthRows[items[0].dataIndex]?.key || "",
                label: (item) => `New users: ${wholeNumber(item.raw)}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#4b5563', maxRotation: 0, autoSkip: true },
              border: { display: false },
            },
            y: {
              beginAtZero: true,
              grid: { color: analyticsGridColor, borderDash: [4, 4] },
              ticks: { color: '#4b5563', precision: 0 },
              border: { display: false },
            },
          },
        },
      });
    }

    const completionRows = getCompletionRows();
    const completionCtx = document.getElementById('analytics-course-completion-chart');
    if (completionCtx && completionRows.length) {
      new Chart(completionCtx.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: completionRows.map((row) => row.label),
          datasets: [{
            data: completionRows.map((row) => row.value),
            backgroundColor: completionRows.map((row) => (
              row.tone === 'danger' ? '#E3262E' : row.tone === 'success' ? '#15803D' : '#86EFAC'
            )),
            borderColor: '#FFFFFF',
            borderWidth: 4,
            hoverOffset: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          animation: analyticsAnimation,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (item) => `${item.label}: ${wholeNumber(item.raw)}`,
              },
            },
          },
        },
      });
    }

    const monthlyRows = getAnalyticsMonthlyRegistrations();
    const monthlyCtx = document.getElementById('analytics-monthly-registrations-chart');
    if (monthlyCtx && monthlyRows.length) {
      const hasSecondary = monthlyRows.some((row) => row.secondaryValue !== null && row.secondaryValue !== undefined);
      const datasets = [{
        label: 'Registrations',
        data: monthlyRows.map((row) => row.value),
        backgroundColor: '#15803D',
        borderRadius: 8,
        borderSkipped: false,
        barPercentage: hasSecondary ? 0.72 : 0.52,
        categoryPercentage: 0.72,
      }];

      if (hasSecondary) {
        datasets.push({
          label: monthlyRows.find((row) => row.secondaryLabel)?.secondaryLabel || 'Comparison',
          data: monthlyRows.map((row) => row.secondaryValue || 0),
          backgroundColor: '#E3262E',
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.72,
          categoryPercentage: 0.72,
        });
      }

      new Chart(monthlyCtx.getContext('2d'), {
        type: 'bar',
        data: {
          labels: monthlyRows.map((row) => row.label),
          datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: analyticsAnimation,
          plugins: {
            legend: { display: hasSecondary, position: 'top', labels: { color: '#4b5563', boxWidth: 12, usePointStyle: true } },
            tooltip: {
              callbacks: {
                title: (items) => monthlyRows[items[0].dataIndex]?.key || "",
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#4b5563', maxRotation: 0 },
              border: { display: false },
            },
            y: {
              beginAtZero: true,
              grid: { color: analyticsGridColor, borderDash: [4, 4] },
              ticks: { color: '#4b5563', precision: 0 },
              border: { display: false },
            },
          },
        },
      });
    }

    const growthModel = getUserGrowthModel(state.analytics || {}, state.stats || {});
    const ctx1 = document.getElementById('chart-user-growth');
    if (ctx1 && growthModel.points.length) {
      const chartContext = ctx1.getContext('2d');
      const gradientOrange = chartContext.createLinearGradient(0, 0, 0, 280);
      gradientOrange.addColorStop(0, 'rgba(242, 140, 115, 0.35)');
      gradientOrange.addColorStop(1, 'rgba(242, 140, 115, 0)');

      const gradientTeal = chartContext.createLinearGradient(0, 0, 0, 280);
      gradientTeal.addColorStop(0, 'rgba(88, 195, 170, 0.35)');
      gradientTeal.addColorStop(1, 'rgba(88, 195, 170, 0)');

      new Chart(chartContext, {
        type: 'line',
        data: {
          labels: growthModel.points.map((point) => point.label),
          datasets: [
            {
              label: 'Total users',
              data: growthModel.points.map((point) => point.total),
              yAxisID: 'y',
              backgroundColor: gradientOrange,
              borderColor: 'rgba(242, 140, 115, 1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 5,
              fill: true,
            },
            {
              label: 'New users',
              data: growthModel.points.map((point) => point.newUsers),
              yAxisID: 'y1',
              backgroundColor: gradientTeal,
              borderColor: 'rgba(88, 195, 170, 1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 5,
              fill: true,
            }
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 900, easing: 'easeOutQuart' },
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: { display: false },
            tooltip: {
              displayColors: false,
              callbacks: {
                title: (items) => longDateLabel(growthModel.points[items[0].dataIndex]?.date),
                label: (item) => {
                  const point = growthModel.points[item.dataIndex];
                  return `Total users: ${wholeNumber(point.total)}`;
                },
                afterLabel: (item) => {
                  const point = growthModel.points[item.dataIndex];
                  return [`New users: ${wholeNumber(point.newUsers)}`, `Growth: ${percentLabel(point.growth)}`];
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#64748b', font: { weight: 500 } },
            },
            y: {
              beginAtZero: false,
              grid: { color: '#f1f5f9', drawBorder: false },
              ticks: { display: false },
            },
            y1: {
              beginAtZero: true,
              position: 'right',
              grid: { display: false },
              ticks: { display: false },
            }
          },
        },
      });
    }

    const ctxMonthlyReg = document.getElementById('chart-monthly-registrations');
    if (ctxMonthlyReg && state.analytics?.monthlyRegistrations?.length) {
      const regData = state.analytics.monthlyRegistrations;
      new Chart(ctxMonthlyReg.getContext('2d'), {
        type: 'bar',
        data: {
          labels: regData.map(d => d._id),
          datasets: [
            {
              label: 'Registrations',
              data: regData.map(d => Number(d.count || 0)),
              backgroundColor: '#e67357',
              borderRadius: 6,
              borderSkipped: false,
              barPercentage: 0.75,
              categoryPercentage: 0.85
            },
            {
              label: 'Active Users',
              data: regData.map(d => Math.round(Number(d.count || 0) * 0.76)),
              backgroundColor: '#35a794',
              borderRadius: 6,
              borderSkipped: false,
              barPercentage: 0.75,
              categoryPercentage: 0.85
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false, drawBorder: false }, ticks: { display: false }, border: { display: false } },
            y: { grid: { display: false, drawBorder: false }, ticks: { display: false }, border: { display: false } }
          }
        }
      });
    }

    const tools = makeDataset((state.analytics?.topAiTools||[]).map(t=>({title:t.name,count:t.count||1})),'count');
    const ctx4 = document.getElementById('chart-ai-tool-usage');
    if (ctx4 && tools.labels.length) {
      new Chart(ctx4.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: tools.labels,
          datasets: [{
            data: tools.data,
            backgroundColor: tools.labels.map((_, index) => (index % 2 === 0 ? 'rgba(91,45,16,0.94)' : 'rgba(184,123,56,0.88)'))
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: { position: 'right' }
          }
        }
      });
    }
  } catch (e) { console.warn('Chart init failed', e); }
};

const initCountUps = () => {
  document.querySelectorAll("[data-count]").forEach((node) => {
    const rawValue = String(node.dataset.count || "");
    const numeric = Number(rawValue.replace(/[^0-9.]/g, ""));
    const onceKey = node.dataset.countOnce;

    if (!Number.isFinite(numeric) || numeric <= 0 || rawValue.includes("%")) return;
    if (onceKey && animatedCountKeys.has(onceKey)) return;

    const start = performance.now();
    const duration = 650;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const current = Math.round(numeric * progress);
      node.textContent = rawValue.replace(/[0-9.]+/, current.toString());
      if (progress < 1) requestAnimationFrame(tick);
      else if (onceKey) animatedCountKeys.add(onceKey);
    };

    requestAnimationFrame(tick);
  });
};

const initCertificateSummaryAnimations = () => {
  const visuals = document.querySelectorAll(".certificate-summary-visual, .admin-summary-visual, .admin-empty-visual");
  if (!visuals.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-paused", !entry.isIntersecting);
    });
  }, { threshold: 0.1 });

  visuals.forEach((visual) => observer.observe(visual));
};

const initSettingsAnimations = () => {
  const visuals = document.querySelectorAll(".settings-card-animation");
  if (!visuals.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-paused", !entry.isIntersecting);
    });
  }, { threshold: 0.1 });

  visuals.forEach((visual) => observer.observe(visual));
};

const findItem = (key, id) => (state.data[key] || []).find((item) => String(item._id) === String(id));

const bindEvents = () => {
  document.querySelector('#theme-toggle')?.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
  });
  bindGlobalSearchEvents();
  bindAccountMenuEvents();
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      saveSidebarScrollPosition();
      switchView(button.dataset.view);
    });
  });
  document.querySelector("[data-workspace-retry]")?.addEventListener("click", () => {
    loadWorkspaceTools({ force: true });
  });
  document.querySelectorAll("[data-workspace-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.workspaceTool;
      if (!id) {
        switchView("aiTools");
        return;
      }
      switchView("aiTools", { highlight: id });
    });
  });
  document.querySelector("[data-growth-range]")?.addEventListener("change", (event) => {
    state.analyticsFilters.userGrowthDays = Number(event.target.value || 7);
    render();
  });
  document.querySelector("[data-analytics-range]")?.addEventListener("change", (event) => {
    state.analyticsFilters.analyticsRange = Number(event.target.value || 30);
    render();
  });
  document.querySelector("[data-refresh-analytics]")?.addEventListener("click", refreshAnalyticsOverview);
  document.querySelector("[data-export-analytics]")?.addEventListener("click", exportAnalyticsCsv);
  document.querySelectorAll("[data-calendar-month]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.calendarMonth;
      if (action === "prev") state.analyticsFilters.calendarMonth = shiftMonthKey(state.analyticsFilters.calendarMonth, -1);
      if (action === "next") state.analyticsFilters.calendarMonth = shiftMonthKey(state.analyticsFilters.calendarMonth, 1);
      if (action === "this") state.analyticsFilters.calendarMonth = monthKey(new Date());
      state.analyticsFilters.selectedCalendarDate = `${state.analyticsFilters.calendarMonth}-${padDatePart(Math.min(new Date().getDate(), new Date(parseMonthKey(state.analyticsFilters.calendarMonth).getFullYear(), parseMonthKey(state.analyticsFilters.calendarMonth).getMonth() + 1, 0).getDate()))}`;
      render();
    });
  });
  document.querySelectorAll("[data-calendar-date]").forEach((button) => {
    button.addEventListener("click", () => {
      state.analyticsFilters.selectedCalendarDate = button.dataset.calendarDate;
      render();
    });
  });
  document.querySelectorAll("[data-refresh]").forEach((button) => {
    button.addEventListener("click", () => loadEntity(button.dataset.refresh));
  });
  document.querySelectorAll(".toolbar select[id*='-']").forEach((select) => {
    const key = select.id.split("-")[0];
    if (entityConfigs[key]) {
      select.addEventListener("change", () => {
        state.highlightRecord = null;
        loadEntity(key);
      });
    }
  });
  Object.keys(entityConfigs).forEach((key) => {
    document.querySelector(`#${key}-search`)?.addEventListener("input", (event) => {
      queueEntitySearch(key, event.target.value || "");
    });
    document.querySelector(`#${key}-search`)?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        window.clearTimeout(entitySearchTimers[key]);
        loadEntity(key, { replaceHistory: true });
      }
    });
  });
  document.querySelectorAll("[data-clear-entity-search]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.clearEntitySearch;
      state.entitySearches[key] = "";
      state.highlightRecord = null;
      loadEntity(key, { replaceHistory: true });
    });
  });
  document.querySelectorAll("[data-refresh-logs]").forEach((button) => {
    button.addEventListener("click", () => loadAuditLogs({ force: true, replaceHistory: true }));
  });
  document.querySelector("#audit-search")?.addEventListener("input", (event) => {
    state.auditSearch = normalizeSearchQuery(event.target.value || "");
    state.auditPage = 1;
    window.clearTimeout(entitySearchTimers.auditLogs);
    entitySearchTimers.auditLogs = window.setTimeout(() => loadAuditLogs({ replaceHistory: true, force: true }), 300);
  });
  document.querySelector("#audit-search")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      window.clearTimeout(entitySearchTimers.auditLogs);
      state.auditSearch = normalizeSearchQuery(event.target.value || "");
      state.auditPage = 1;
      loadAuditLogs({ replaceHistory: true, force: true });
    }
  });
  document.querySelector("[data-clear-audit-search]")?.addEventListener("click", () => {
    state.auditSearch = "";
    state.auditPage = 1;
    loadAuditLogs({ replaceHistory: true, force: true });
  });
  document.querySelector("#audit-type")?.addEventListener("change", (event) => {
    state.auditType = event.target.value || "";
    state.auditPage = 1;
    loadAuditLogs({ replaceHistory: true, force: true });
  });
  document.querySelector(".audit-pagination")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-audit-page]");
    if (!button || button.disabled || state.auditLoading) return;
    const page = Math.max(Number(button.dataset.auditPage || 1), 1);
    const scrollGroup = button.dataset.auditScrollGroup || "";
    const direction = button.dataset.auditDirection || "";
    if (scrollGroup) {
      state.auditVisiblePage = page;
      state.auditScrollTargetId = "";
      render();
      window.requestAnimationFrame(() => {
        document.querySelector(`[data-audit-group-id="${scrollGroup}"]`)?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth",
        });
        document.querySelector(`[data-audit-direction="${direction}"]`)?.focus?.();
      });
      return;
    }
    loadAuditLogs({
      page,
      replaceHistory: direction !== "next",
      force: true,
      mode: direction === "next" ? "append" : "replace",
      direction,
      restoreFocusDirection: direction,
      keepRowsOnError: true,
    });
  });
  document.querySelectorAll("[data-open-form]").forEach((button) => {
    button.addEventListener("click", () => openForm(button.dataset.openForm));
  });
  document.querySelectorAll("[data-edit-record]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const [key, id] = button.dataset.editRecord.split(":");
      openForm(key, findItem(key, id));
    });
  });
  document.querySelectorAll("[data-view-record]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const [key, id] = button.dataset.viewRecord.split(":");
      await openDetail(key, id);
    });
  });
  document.querySelectorAll("[data-preview-lesson]").forEach((button) => {
    button.addEventListener("click", () => openLessonPreview(button.dataset.previewLesson));
  });
  document.querySelectorAll("[data-delete-record]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const [key, id] = button.dataset.deleteRecord.split(":");
      deleteRecord(key, id, button.dataset.userActionKey || "");
    });
  });
  document.querySelectorAll("[data-password-record]").forEach((button) => {
    button.addEventListener("click", () => {
      const [key, id] = button.dataset.passwordRecord.split(":");
      resetPassword(key, id);
    });
  });
  document.querySelectorAll("[data-user-status]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const [key, id, isActive] = button.dataset.userStatus.split(":");
      updateStatus(key, id, isActive === "true", button.dataset.userActionKey || "");
    });
  });
  document.querySelectorAll("[data-user-premium]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const [id, isPremium] = button.dataset.userPremium.split(":");
      updateUserPremium(id, isPremium === "true", button.dataset.userActionKey || "");
    });
  });
  document.querySelectorAll("[data-user-verification]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const [id, isVerified] = button.dataset.userVerification.split(":");
      updateUserVerification(id, isVerified === "true", button.dataset.userActionKey || "");
    });
  });
  document.querySelectorAll("[data-export-user]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      exportUser(button.dataset.exportUser);
    });
  });
  document.querySelectorAll("[data-status-record]").forEach((button) => {
    button.addEventListener("click", () => {
      const [key, id, status] = button.dataset.statusRecord.split(":");
      patchAndReload(entityConfigs[key].endpoint, id, { status }, key);
    });
  });
  document.querySelectorAll("[data-tool-feature]").forEach((button) => {
    button.addEventListener("click", () => {
      const [id, isFeatured] = button.dataset.toolFeature.split(":");
      patchAndReload(entityConfigs.aiTools.endpoint, id, { isFeatured: isFeatured === "true" }, "aiTools");
    });
  });
  document.querySelectorAll("[data-tool-hide]").forEach((button) => {
    button.addEventListener("click", () => {
      const [id, status] = button.dataset.toolHide.split(":");
      patchAndReload(entityConfigs.aiTools.endpoint, id, { status }, "aiTools");
    });
  });
  document.querySelectorAll("[data-category-show]").forEach((button) => {
    button.addEventListener("click", () => {
      const [id, isActive] = button.dataset.categoryShow.split(":");
      patchAndReload(entityConfigs.categories.endpoint, id, { isActive: isActive === "true" }, "categories");
    });
  });
  document.querySelectorAll("[data-revoke-cert]").forEach((button) => {
    button.addEventListener("click", () => {
      const reason = prompt("Enter revoke reason for this certificate:");
      if (reason === null) return;
      patchAndReload(`${entityConfigs.certificates.endpoint}/${button.dataset.revokeCert}`, "revoke", { reason: reason.trim() }, "certificates", "PATCH");
    });
  });
  document.querySelectorAll("[data-duplicate-record]").forEach((button) => {
    button.addEventListener("click", () => duplicateRecord(button.dataset.duplicateRecord));
  });
  document.querySelectorAll("[data-select-id]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.selectedIds.add(checkbox.dataset.selectId);
      else state.selectedIds.delete(checkbox.dataset.selectId);
      render();
    });
  });
  document.querySelectorAll("[data-bulk-action]").forEach((button) => {
    button.addEventListener("click", () => bulkUsers(button.dataset.bulkAction));
  });
  document.querySelector("#export-users")?.addEventListener("click", exportUsers);
  document.querySelector("#settings-form")?.addEventListener("input", trackSettingsDraft);
  document.querySelector("#settings-form")?.addEventListener("change", trackSettingsDraft);
  document.querySelector("#settings-form")?.addEventListener("submit", saveSettings);
};

const openForm = (key, item = null) => {
  app.insertAdjacentHTML("beforeend", renderModal(key, item));
  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
  document.querySelector("#entity-form").addEventListener("submit", saveRecord);
};

const openDetail = async (key, id) => {
  let item = findItem(key, id);

  if (key === "users") {
    const [profile, progress, certificates, activity] = await Promise.all([
      request(`/admins/users/${id}`),
      request(`/admins/users/${id}/progress`),
      request(`/admins/users/${id}/certificates`),
      request(`/admins/users/${id}/activity`),
    ]);
    item = {
      ...profile.data,
      progress: progress.data,
      certificates: certificates.data,
      activity: activity.data,
    };
  }

  app.insertAdjacentHTML("beforeend", renderDetailModal(key, item));
  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
};

const openLessonPreview = (id) => {
  const item = findItem("lessons", id);
  if (!item || !hasLessonPreview(item)) return;
  app.insertAdjacentHTML("beforeend", renderLessonPreviewModal(item));
  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
};

const closeModal = () => document.querySelector(".modal")?.remove();

const saveRecord = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const key = form.dataset.entity;
  const id = form.dataset.id;
  const config = entityConfigs[key];

  try {
    const payload = getPayloadFromForm(new FormData(form), config.fields, id ? "edit" : "create");
    setBusy(true);
    await request(id ? `${config.endpoint}/${id}` : config.endpoint, {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    closeModal();
    state.message = id ? "Record updated successfully." : "Record created successfully.";
    await loadEntity(key);
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
};

const deleteRecord = async (key, id, busyKey = "") => {
  const item = findItem(key, id) || {};
  const label = key === "users" ? `user ${recordTitle(item)}` : `record ${recordTitle(item)}`;

  if (!confirm(`Delete ${label}? This cannot be undone.`)) return;

  try {
    setBusy(true, busyKey);
    await request(`${entityConfigs[key].endpoint}/${id}`, { method: "DELETE" });
    state.message = "Record deleted successfully.";
    await loadEntity(key);
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
};

const resetPassword = async (key, id) => {
  const password = prompt("Enter new password, minimum 6 characters");
  if (!password) return;

  const endpoint = key === "admins" ? `/admins/${id}/reset-password` : `/admins/users/${id}/reset-password`;
  try {
    setBusy(true);
    await request(endpoint, {
      method: "PATCH",
      body: JSON.stringify({ password }),
    });
    state.message = "Password reset successfully.";
    await loadEntity(key);
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
};

const updateStatus = async (key, id, isActive, busyKey = "") => {
  const item = findItem(key, id) || {};
  if (key === "users" && !isActive && !confirm(`Deactivate ${recordTitle(item)}?`)) return;

  try {
    setBusy(true, busyKey);
    const endpoint = key === "admins" ? `/admins/${id}` : `/admins/users/${id}/status`;
    await request(endpoint, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
    state.message = "Status updated successfully.";
    await loadEntity(key);
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
};

const patchAndReload = async (base, id, payload, key, method = "PATCH", busyKey = "") => {
  try {
    setBusy(true, busyKey);
    await request(id === "revoke" ? `${base}/revoke` : `${base}/${id}`, {
      method,
      body: JSON.stringify(payload),
    });
    state.message = "Action completed successfully.";
    if (entityConfigs[key]) await loadEntity(key);
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
};

const updateUserPremium = async (id, isPremium, busyKey = "") => {
  const item = findItem("users", id) || {};
  if (!isPremium && !confirm(`Remove premium access for ${recordTitle(item)}?`)) return;

  await patchAndReload("/admins/users", id, { isPremium }, "users", "PATCH", busyKey);
};

const updateUserVerification = async (id, isVerified, busyKey = "") => {
  const item = findItem("users", id) || {};
  if (!isVerified && !confirm(`Remove verification for ${recordTitle(item)}?`)) return;

  await patchAndReload("/admins/users", id, { isVerified }, "users", "PATCH", busyKey);
};

const duplicateRecord = async (encoded) => {
  const [key, id] = encoded.split(":");
  const item = findItem(key, id);
  if (!item) return;

  const copy = { ...item };
  delete copy._id;
  delete copy.createdAt;
  delete copy.updatedAt;
  delete copy.__v;
  delete copy.instructor;
  copy.title = `${copy.title || "Copy"} Copy`;
  copy.slug = `${copy.slug || copy.title.toLowerCase().replace(/\s+/g, "-")}-copy-${Date.now().toString(36)}`;

  try {
    setBusy(true);
    await request(entityConfigs[key].endpoint, {
      method: "POST",
      body: JSON.stringify(copy),
    });
    state.message = "Course duplicated successfully.";
    await loadEntity(key);
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
};

const bulkUsers = async (action) => {
  if (!state.selectedIds.size) {
    setMessage("", "Select users first.");
    return;
  }

  if (action === "delete" && !confirm("Delete selected users?")) return;

  try {
    setBusy(true);
    await request("/admins/users/bulk", {
      method: "POST",
      body: JSON.stringify({ action, ids: [...state.selectedIds] }),
    });
    state.message = "Bulk action completed successfully.";
    await loadEntity("users");
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
};

const csvCell = (value) => {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadCsv = (filename, rows) => {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const exportUser = (id) => {
  const item = findItem("users", id);
  if (!item) {
    setMessage("", "User not found for export.");
    return;
  }

  const rows = [
    ["Full name", "Email", "Role", "Status", "Verified", "Premium", "Joined", "Updated"],
    [
      item.fullName || item.name || "",
      item.email || "",
      item.role || "user",
      item.isActive === false ? "Inactive" : "Active",
      item.isVerified ? "Yes" : "No",
      item.isPremium ? "Yes" : "No",
      formatDate(item.createdAt),
      formatDate(item.updatedAt),
    ],
  ];
  const safeName = normalizeAssetKey(item.email || item.fullName || item._id || "user");
  downloadCsv(`crackwithai-user-${safeName}.csv`, rows);
  setMessage("User export downloaded.");
};

const exportUsers = async () => {
  try {
    const response = await request("/admins/users/export", { raw: true });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "crackwithai-users.csv";
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    setMessage("", error.message);
  }
};

const getSettingsPayloadFromForm = (form) => ({
  platformName: String(form.get("platformName") || "").trim(),
  logoUrl: String(form.get("logoUrl") || "").trim(),
  contactEmail: String(form.get("contactEmail") || "").trim(),
  privacyPolicyUrl: String(form.get("privacyPolicyUrl") || "").trim(),
  termsUrl: String(form.get("termsUrl") || "").trim(),
  storageProvider: String(form.get("storageProvider") || "").trim(),
  maintenanceMode: form.get("maintenanceMode") === "on",
});

const trackSettingsDraft = (event) => {
  const form = event.currentTarget;
  state.settingsDraft = {
    ...(state.settings || {}),
    ...getSettingsPayloadFromForm(new FormData(form)),
  };
  if (state.settingsSaveStatus) state.settingsSaveStatus = "";
};

const saveSettings = async (event) => {
  event.preventDefault();
  if (state.loading) return;

  const form = event.currentTarget;
  const payload = getSettingsPayloadFromForm(new FormData(form));
  state.settingsDraft = {
    ...(state.settings || {}),
    ...payload,
  };
  state.settingsSaveStatus = "saving";
  state.loading = true;
  render();

  try {
    const response = await request("/admins/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    state.settings = response.data;
    state.settingsDraft = null;
    state.settingsSaveStatus = "success";
    state.message = "Settings saved successfully.";
    state.error = "";
  } catch (error) {
    state.settingsDraft = {
      ...(state.settings || {}),
      ...payload,
    };
    state.settingsSaveStatus = "error";
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
    window.clearTimeout(saveSettings.statusTimer);
    saveSettings.statusTimer = window.setTimeout(() => {
      if (state.view !== "settings") return;
      state.settingsSaveStatus = "";
      render();
    }, 1800);
  }
};

const render = () => {
  if (!state.token || !state.admin) {
    renderLogin();
    return;
  }

  renderApp();
};

loadSession();
