const app = document.querySelector("#app");
const storageKey = "cwa_admin_token";

const state = {
  admin: null,
  token: localStorage.getItem(storageKey),
  view: "dashboard",
  stats: null,
  analytics: null,
  settings: null,
  data: {},
  selectedIds: new Set(),
  auditSearch: "",
  auditType: "",
  analyticsFilters: {
    userGrowthDays: 7,
    calendarMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    selectedCalendarDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
  },
  loading: false,
  message: "",
  error: "",
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
];

const getCourseFallbackImage = (course) => {
  const haystack = [course.slug, course.title, course.name]
    .map(normalizeAssetKey)
    .filter(Boolean)
    .join(" ");
  const match = courseFallbackImages.find((entry) => entry.keys.some((key) => haystack.includes(key)));
  return match?.src || "/assets/ai-courses/default-ai-course.svg";
};

const getCourseImageSource = (course) => {
  const fallback = getCourseFallbackImage(course);
  const primary = course.thumbnail || course.image || course.logo || "";
  return {
    src: primary || fallback,
    fallback,
    fitClass: course.thumbnail ? "course-image-cover" : "course-image-contain",
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
  <article class="entity-card ${key}-card ${extraClass}">
    ${body}
    <div class="entity-actions">${renderActions(key, item)}</div>
  </article>
`;

const renderUserCard = (item) => {
  const progress = Number(item.progressPercentage || item.learningProgress || item.progress?.progressPercentage || 0);

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
      <div><span>Learning progress</span><b>${escapeHtml(progress)}%</b></div>
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

const userProgressValue = (item) =>
  Math.max(0, Math.min(100, Number(item.progressPercentage || item.learningProgress || item.progress?.progressPercentage || 0)));

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
  const stage = userPipelineStageKey(item);
  const stageIndex = userPipelineStages.findIndex((pipelineStage) => pipelineStage.key === stage);
  const joinedLabel = formatDate(item.createdAt);
  const verifiedLabel = item.isVerified ? "Verified" : "Unverified";
  const premiumLabel = item.isPremium ? "Premium" : "Free";
  const activeLabel = item.isActive === false ? "Inactive" : "Active";

  return `
    <article class="user-pipeline-row user-stage-${stage}">
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
          <div><span>${escapeHtml(item.role || "user")}</span><b>${escapeHtml(progress)}%</b></div>
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

  return `<article class="course-management-card">
    <div class="course-card-top">
      <span class="course-card-thumb ${image.fitClass === "course-image-cover" ? "is-cover" : ""}">
        <img
          class="${escapeHtml(image.fitClass)}"
          src="${escapeHtml(image.src)}"
          data-fallback-src="${escapeHtml(image.fallback)}"
          alt="${escapeHtml(item.title || "Course")} logo"
          loading="lazy"
          onerror="this.onerror=null;this.src=this.dataset.fallbackSrc;this.classList.remove('course-image-cover');this.classList.add('course-image-contain');this.parentElement.classList.remove('is-cover');"
        />
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

  return `<article class="module-management-card">
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

  return `<article class="lesson-management-card">
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

  return `<article class="quiz-management-card">
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

const aiToolLogoFallback = "/assets/ai-tools/default-ai-tool.svg";

const getAiToolLogoSource = (item) => item.logo || item.image || item.thumbnail || aiToolLogoFallback;

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

const aiToolLogoMarkup = (item) => {
  const name = item.name || "AI Tool";
  const src = getAiToolLogoSource(item);
  const fallback = aiToolLogoFallback;
  return `
    <span class="ai-tool-card-logo">
      <img
        src="${escapeHtml(src)}"
        data-fallback-src="${escapeHtml(fallback)}"
        alt="${escapeHtml(`${name} logo`)}"
        loading="lazy"
        onerror="if(this.dataset.fallbackSrc && !this.dataset.fallbackApplied){this.dataset.fallbackApplied='true';this.src=this.dataset.fallbackSrc;}else{this.hidden=true;this.nextElementSibling.hidden=false;}"
      />
      <span class="ai-tool-card-initials" hidden aria-hidden="true">${escapeHtml(initials(name))}</span>
    </span>
  `;
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

  return `<article class="ai-tool-management-card">
    <div class="ai-tool-card-head">
      ${aiToolLogoMarkup(item)}
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
            <span class="ai-tool-card-logo"></span>
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

const setBusy = (loading) => {
  state.loading = loading;
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

  try {
    const response = await request("/admins/me");
    state.admin = response.data;
    await loadDashboard();
    render();
  } catch {
    logout();
  }
};

const loadDashboard = async () => {
  const [statsResponse, analyticsResponse] = await Promise.all([
    request("/admins/stats"),
    request("/admins/analytics"),
  ]);

  state.stats = statsResponse.data;
  state.analytics = analyticsResponse.data;
  state.view = "dashboard";
};

const loadEntity = async (key) => {
  const config = entityConfigs[key];
  const search = document.querySelector(`#${key}-search`)?.value || "";
  const params = new URLSearchParams();

  if (config.searchable && search) params.set("search", search);
  (config.filters || []).forEach((filter) => {
    const value = document.querySelector(`#${key}-${filter.name}`)?.value || "";
    if (value) params.set(filter.name, value);
  });
  if (key === "users") params.set("limit", "100");

  const path = `${config.endpoint}${params.toString() ? `?${params.toString()}` : ""}`;
  state.loading = true;
  render();

  try {
    const response = await request(path);
    state.data[key] = config.unwrap(response);
    state.selectedIds = new Set();
    state.view = key;
    state.error = "";
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
};

const loadSettings = async () => {
  const response = await request("/admins/settings");
  state.settings = response.data;
  state.view = "settings";
  render();
};

const loadAuditLogs = async () => {
  const response = await request("/admins/audit-logs");
  state.data.auditLogs = response.data || [];
  state.view = "auditLogs";
  render();
};

const switchView = async (view) => {
  state.error = "";
  state.message = "";
  state.view = view;
  render();

  try {
    if (view === "dashboard") await loadDashboard();
    else if (view === "settings") await loadSettings();
    else if (view === "auditLogs") await loadAuditLogs();
    else if (entityConfigs[view]) await loadEntity(view);
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
              <i data-lucide="${escapeHtml(row.icon)}"></i>
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
    { label: "Total Users", value: users.total ?? 0, note: `${users.active ?? 0} active`, icon: "users", trend: "Live" },
    { label: "Daily Active", value: users.dailyActive ?? 0, note: `${users.weeklyActive ?? 0} weekly`, icon: "activity", trend: "Today" },
    { label: "Courses", value: courses.total ?? 0, note: `${courses.published ?? 0} published`, icon: "graduation-cap", trend: "Content" },
    { label: "AI Tools", value: aiTools.total ?? 0, note: `${aiTools.active ?? 0} active`, icon: "wand", trend: "Tools" },
    { label: "Certificates", value: certs.issued ?? 0, note: "issued", icon: "shield", trend: "Trust" },
    { label: "Registrations", value: users.newRegistrations ?? 0, note: "last 7 days", icon: "bar-chart-2", trend: "Growth" },
    { label: "Avg Completion", value: `${learning.averageProgress ?? 0}%`, note: `${learning.completedEnrollments ?? 0} complete`, icon: "pie-chart", trend: "Learning" },
    { label: "Lessons", value: modules.lessons ?? 0, note: `${modules.total ?? 0} modules`, icon: "book-open", trend: "Library" }
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
      ["courses", "Courses", "Published paths, pricing, levels, and thumbnails.", "book-open"],
      ["modules", "Modules", "Order course sections and map them to live courses.", "layers-3"],
      ["lessons", "Lessons", "Manage lesson content, videos, order, and visibility.", "play-square"],
      ["quizzes", "Quizzes", "Create API-backed questions, options, and answers.", "clipboard-check"],
      ["certificates", "Certificates", "Review issued and locked certificate records.", "award"],
    ].map(([view, title, copy, icon]) => `
      <button class="quick-card reveal" data-view="${view}" type="button">
        ${iconMarkup(icon)}
        <span>
          <b>${title}</b>
          <small>${copy}</small>
        </span>
      </button>
    `).join("")}
  </section>
`;

const renderWorkspace = () => `
  <section class="workspace-shell card reveal">
    <div>
      <p class="eyebrow">AI Workspace</p>
      <h2>Manage the AI tools that power learner workflows.</h2>
      <p>Keep tool cards, integrations, categories, featured status, and visibility organized from the admin side.</p>
    </div>
    <div class="chat-preview" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
      <b></b>
    </div>
    <div class="hero-actions">
      <button class="btn" data-view="aiTools" type="button">${iconMarkup("bot", "Manage AI tools")}</button>
      <button class="btn secondary" data-view="categories" type="button">${iconMarkup("folder-tree", "Manage categories")}</button>
    </div>
  </section>
`;

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
  const items = state.data[key] || [];
  const isEmpty = !items.length;
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
        ${config.searchable ? `<input id="${key}-search" placeholder="Search ${escapeHtml(config.title.toLowerCase())}" />` : ""}
        ${(config.filters || [])
          .map((filter) => `
            <select id="${key}-${filter.name}" aria-label="${escapeHtml(filter.label)}">
              ${filter.options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")}
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
        ${isEmpty ? `
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

const renderActions = (key, item) => {
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
  const analytics = state.analytics || {};
  return `
    <section class="page-hero card reveal">
      <div>
        <p class="eyebrow">Trust and analytics</p>
        <h2>Performance signals for the full CrackWithAI platform.</h2>
        <p>Charts and KPI blocks are loaded from the existing analytics API and styled for fast operational review.</p>
      </div>
    </section>
    <section class="analytics-kpis">
      ${metricCard("Daily active", analytics.activeUsers?.daily ?? 0, "active today", "sun")}
      ${metricCard("Weekly active", analytics.activeUsers?.weekly ?? 0, "active this week", "calendar-days")}
      ${metricCard("Monthly active", analytics.activeUsers?.monthly ?? 0, "active this month", "calendar-range")}
    </section>
    <div class="grid dashboard-panels analytics-layout">
      ${analyticsTableCard("User Growth", "New users by period", analytics.userGrowth)}
      ${analyticsTableCard("Course Completion", "Progress distribution", analytics.learningProgress, "_id", "count")}
      ${analyticsBarChartCard("Monthly Registrations", "Registration trend", "chart-monthly-registrations")}
      ${analyticsTableCard("Popular Courses", "Learner demand", analytics.popularCourses, "title", "learners")}
      ${analyticsTableCard("Top AI Tools", "Featured and active usage signals", (analytics.topAiTools || []).map((tool) => ({ title: tool.name, count: tool.count || (tool.isFeatured ? 2 : 1) })), "title", "count")}
    </div>
  `;
};

const renderSettings = () => {
  const settings = state.settings || {};
  const settingGroups = [
    {
      title: "General Settings",
      icon: "settings",
      fields: [["platformName", "Platform name"], ["logoUrl", "Logo URL"], ["contactEmail", "Contact email"]],
    },
    {
      title: "Account Settings",
      icon: "user-cog",
      fields: [["privacyPolicyUrl", "Privacy policy URL"], ["termsUrl", "Terms URL"]],
    },
    {
      title: "API Configuration",
      icon: "server-cog",
      fields: [["storageProvider", "Storage provider"]],
    },
  ];

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
              ${iconMarkup(group.icon)}
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
            ${iconMarkup("shield-check")}
            <h3>Security</h3>
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
            ${iconMarkup("mail-check")}
            <h3>Email and SMTP</h3>
          </div>
          <div class="config-flags stacked">
            <span class="pill ${settings.smtpConfigured ? "ok" : "warn"}">SMTP ${settings.smtpConfigured ? "configured" : "missing"}</span>
            <span class="pill muted">Contact: ${escapeHtml(settings.contactEmail || "-")}</span>
          </div>
        </section>
        <section class="settings-box card reveal">
          <div class="settings-box-head">
            ${iconMarkup("palette")}
            <h3>Appearance</h3>
          </div>
          <p class="muted-copy">Primary blue and secondary green are applied globally across cards, charts, focus states, and actions.</p>
        </section>
      </div>
      <div class="sticky-save">
        <button class="btn" type="submit">${iconMarkup("save", "Save settings")}</button>
      </div>
    </form>
  `;
};

const renderAuditLogs = () => {
  const logs = state.data.auditLogs || [];
  const search = state.auditSearch.trim().toLowerCase();
  const type = state.auditType.trim().toLowerCase();
  const filteredLogs = logs.filter((log) => {
    const haystack = [
      log.action,
      log.admin?.email,
      log.entityType,
      log.entityId,
      log.description,
      log.ipAddress,
      log.device,
    ].join(" ").toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesType = !type || String(log.action || "").toLowerCase().includes(type);
    return matchesSearch && matchesType;
  });

  return `
    <section class="toolbar card reveal">
      <div>
        <p class="eyebrow">Audit trail</p>
        <h2>Audit Logs</h2>
        <p>Review admin activity with a clean table view and status-coded actions.</p>
      </div>
      <div class="toolbar-controls">
        <input id="audit-search" placeholder="Search logs" value="${escapeHtml(state.auditSearch)}" />
        <select id="audit-type" aria-label="Filter audit action">
          ${[
            ["", "All actions"],
            ["login", "Login"],
            ["create", "Create"],
            ["update", "Update"],
            ["delete", "Delete"],
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
            ${filteredLogs.map((log) => `
              <tr>
                <td>${statusPill(log.action || "Activity")}</td>
                <td class="audit-description">${escapeHtml(log.description || log.action || "Admin activity")}</td>
                <td>${escapeHtml(log.admin?.email || "-")}</td>
                <td>${escapeHtml(log.entityType || "-")}</td>
                <td>${escapeHtml(log.entityId || "-")}</td>
                <td>${escapeHtml(log.ipAddress || log.device || "-")}</td>
                <td>${escapeHtml(formatDate(log.createdAt))}</td>
              </tr>
            `).join("") || `
              <tr>
                <td colspan="7" class="audit-empty">
                  ${iconMarkup("file-search")}
                  <span>No audit logs found</span>
                  <small>Platform actions will appear here when available from the API or when filters match.</small>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
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
  document.body.classList.toggle("modules-admin-page", state.view === "modules");
  document.body.classList.toggle("lessons-admin-page", state.view === "lessons");
  document.body.classList.toggle("quizzes-admin-page", state.view === "quizzes");
  document.body.classList.toggle("ai-tools-admin-page", state.view === "aiTools");

  const sections = [...new Set(navItems.map((item) => item.section))];
  app.innerHTML = `
    <section class="layout">
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">C</span>
          <span><b>CrackWithAI</b><small>Admin Panel</small></span>
        </div>
        <nav class="nav">
          ${sections
            .map((section) => `
              <p class="nav-section">${escapeHtml(section)}</p>
              ${navItems
                .filter((item) => item.section === section)
                .map((item) => `<button class="${state.view === item.key ? "active" : ""}" data-view="${item.key}" type="button">${iconMarkup(item.icon || "circle", item.label)}</button>`)
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
            <button id="sidebar-toggle" class="icon-btn" title="Toggle sidebar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <div>
              <h1>${escapeHtml(viewTitle())}</h1>
              <p class="breadcrumb">${escapeHtml(state.admin?.fullName || "")} · <span class="current-date">${new Date().toLocaleDateString()}</span></p>
            </div>
            <div class="search" role="search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <input id="global-search" placeholder="Search courses, users, tools..." />
            </div>
          </div>
          <div class="actions">
            <div class="profile"><span class="admin-name">${escapeHtml(state.admin?.fullName || "Admin")}</span></div>
            <button class="btn danger" id="logout" type="button">Logout</button>
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
  bindEvents();
  initCharts();
  initCountUps();
};

const initCharts = () => {
  if (typeof Chart === 'undefined') return;
  try {
    const makeDataset = (arr, valueKey='count') => ({labels:(arr||[]).map(a=>a._id||a.title||a.name||''),data:(arr||[]).map(a=>Number(a[valueKey]||0))});

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

    if (!Number.isFinite(numeric) || numeric <= 0 || rawValue.includes("%")) return;

    const start = performance.now();
    const duration = 650;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const current = Math.round(numeric * progress);
      node.textContent = rawValue.replace(/[0-9.]+/, current.toString());
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
};

const findItem = (key, id) => (state.data[key] || []).find((item) => String(item._id) === String(id));

const bindEvents = () => {
  document.querySelector("#sidebar-toggle")?.addEventListener("click", () => {
    document.querySelector('.layout')?.classList.toggle('sidebar-collapsed');
  });
  document.querySelector('#theme-toggle')?.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
  });
  document.querySelector('#global-search')?.addEventListener('input', (e) => {
    // lightweight client-side hinting: filter current list view if available
    const q = String(e.target.value || '').trim().toLowerCase();
    if (!q) return;
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });
  document.querySelector("[data-growth-range]")?.addEventListener("change", (event) => {
    state.analyticsFilters.userGrowthDays = Number(event.target.value || 7);
    render();
  });
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
  document.querySelector("#logout")?.addEventListener("click", () => logout());
  document.querySelectorAll("[data-refresh]").forEach((button) => {
    button.addEventListener("click", () => loadEntity(button.dataset.refresh));
  });
  document.querySelectorAll(".toolbar select[id*='-']").forEach((select) => {
    const key = select.id.split("-")[0];
    if (entityConfigs[key]) {
      select.addEventListener("change", () => loadEntity(key));
    }
  });
  Object.keys(entityConfigs).forEach((key) => {
    document.querySelector(`#${key}-search`)?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") loadEntity(key);
    });
  });
  document.querySelector("[data-refresh-logs]")?.addEventListener("click", loadAuditLogs);
  document.querySelector("#audit-search")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      state.auditSearch = event.target.value || "";
      render();
    }
  });
  document.querySelector("#audit-type")?.addEventListener("change", (event) => {
    state.auditType = event.target.value || "";
    render();
  });
  document.querySelectorAll("[data-open-form]").forEach((button) => {
    button.addEventListener("click", () => openForm(button.dataset.openForm));
  });
  document.querySelectorAll("[data-edit-record]").forEach((button) => {
    button.addEventListener("click", () => {
      const [key, id] = button.dataset.editRecord.split(":");
      openForm(key, findItem(key, id));
    });
  });
  document.querySelectorAll("[data-view-record]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [key, id] = button.dataset.viewRecord.split(":");
      await openDetail(key, id);
    });
  });
  document.querySelectorAll("[data-preview-lesson]").forEach((button) => {
    button.addEventListener("click", () => openLessonPreview(button.dataset.previewLesson));
  });
  document.querySelectorAll("[data-delete-record]").forEach((button) => {
    button.addEventListener("click", () => {
      const [key, id] = button.dataset.deleteRecord.split(":");
      deleteRecord(key, id);
    });
  });
  document.querySelectorAll("[data-password-record]").forEach((button) => {
    button.addEventListener("click", () => {
      const [key, id] = button.dataset.passwordRecord.split(":");
      resetPassword(key, id);
    });
  });
  document.querySelectorAll("[data-user-status]").forEach((button) => {
    button.addEventListener("click", () => {
      const [key, id, isActive] = button.dataset.userStatus.split(":");
      updateStatus(key, id, isActive === "true");
    });
  });
  document.querySelectorAll("[data-user-premium]").forEach((button) => {
    button.addEventListener("click", () => {
      const [id, isPremium] = button.dataset.userPremium.split(":");
      patchAndReload("/admins/users", id, { isPremium: isPremium === "true" }, "users");
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

const deleteRecord = async (key, id) => {
  if (!confirm("Delete this record?")) return;
  try {
    setBusy(true);
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

const updateStatus = async (key, id, isActive) => {
  try {
    setBusy(true);
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

const patchAndReload = async (base, id, payload, key, method = "PATCH") => {
  try {
    setBusy(true);
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

const saveSettings = async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = {
    platformName: String(form.get("platformName") || "").trim(),
    logoUrl: String(form.get("logoUrl") || "").trim(),
    contactEmail: String(form.get("contactEmail") || "").trim(),
    privacyPolicyUrl: String(form.get("privacyPolicyUrl") || "").trim(),
    termsUrl: String(form.get("termsUrl") || "").trim(),
    storageProvider: String(form.get("storageProvider") || "").trim(),
    maintenanceMode: form.get("maintenanceMode") === "on",
  };

  try {
    setBusy(true);
    const response = await request("/admins/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    state.settings = response.data;
    state.message = "Settings saved successfully.";
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
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
