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

const renderCourseCard = (item) =>
  cardShell("courses", item, `
    <div class="course-thumb">
      ${item.thumbnail ? `<img src="${escapeHtml(item.thumbnail)}" alt="" loading="lazy" />` : `<i data-lucide="graduation-cap"></i>`}
      ${statusPill(item.status)}
    </div>
    <div class="entity-copy">
      <p class="eyebrow">${escapeHtml(item.level || "Course")}</p>
      <h3>${escapeHtml(item.title || "Untitled course")}</h3>
      <p>${escapeHtml(compactText(item.shortDescription || item.description))}</p>
    </div>
    <div class="entity-meta">
      ${metaItem("Duration", `${Number(item.duration || 0)} min`)}
      ${metaItem("Students", item.enrolledUsers || item.students || item.learners || "-")}
      ${metaItem("Price", item.isFree ? "Free" : `Rs ${Number(item.price || 0)}`)}
      ${metaItem("Updated", formatDate(item.updatedAt || item.createdAt))}
    </div>
  `);

const renderCoursesTable = (items, isEmpty) => `
  <section class="card courses-table-card reveal">
    <div class="courses-table-wrap">
      <table class="courses-table">
        <thead>
          <tr>
            <th scope="col">Course</th>
            <th scope="col">Level</th>
            <th scope="col">Status</th>
            <th scope="col">Duration</th>
            <th scope="col">Students</th>
            <th scope="col">Price</th>
            <th scope="col">Updated</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              <td>
                <span class="courses-table-course">
                  <span class="course-table-thumb">
                    ${item.thumbnail ? `<img src="${escapeHtml(item.thumbnail)}" alt="" loading="lazy" />` : `<i data-lucide="graduation-cap"></i>`}
                  </span>
                  <span>
                    <b>${escapeHtml(item.title || "Untitled course")}</b>
                    <small>${escapeHtml(compactText(item.shortDescription || item.description, item.slug || "Managed course"))}</small>
                  </span>
                </span>
              </td>
              <td>${escapeHtml(item.level || "-")}</td>
              <td>${statusPill(item.status)}</td>
              <td>${escapeHtml(`${Number(item.duration || 0)} min`)}</td>
              <td>${escapeHtml(item.enrolledUsers || item.students || item.learners || "-")}</td>
              <td>${escapeHtml(item.isFree ? "Free" : `Rs ${Number(item.price || 0)}`)}</td>
              <td>${escapeHtml(formatDate(item.updatedAt || item.createdAt))}</td>
              <td><div class="entity-actions courses-table-actions">${renderActions("courses", item)}</div></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    ${isEmpty ? `
      <div class="empty-state">
        ${iconMarkup("inbox")}
        <h3>No courses found</h3>
        <p>Use Create or adjust the filters to add and manage records.</p>
      </div>
    ` : ""}
  </section>
`;

const renderModuleCard = (item) =>
  cardShell("modules", item, `
    <div class="entity-head">
      ${avatarMarkup(`M${item.order || ""}`, "", "avatar-module")}
      <div>
        <p class="eyebrow">Module ${escapeHtml(item.order || "-")}</p>
        <h3>${escapeHtml(item.title || "Untitled module")}</h3>
        <p>${escapeHtml(plainValue(item, "course.title", "No course linked"))}</p>
      </div>
      ${statusPill(item.status)}
    </div>
    <p class="entity-description">${escapeHtml(compactText(item.description))}</p>
    <div class="entity-meta">
      ${metaItem("Lessons", item.lessonCount || item.lessons?.length || "-")}
      ${metaItem("Duration", `${Number(item.duration || 0)} min`)}
      ${metaItem("Order", item.order || "-")}
    </div>
  `);

const renderModulesTable = (items, isEmpty) => `
  <section class="card modules-table-card reveal">
    <div class="modules-table-wrap">
      <table class="modules-table">
        <thead>
          <tr>
            <th scope="col">Module</th>
            <th scope="col">Course</th>
            <th scope="col">Status</th>
            <th scope="col">Lessons</th>
            <th scope="col">Duration</th>
            <th scope="col">Order</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              <td>
                <span class="modules-table-module">
                  ${avatarMarkup(`M${item.order || ""}`, "", "avatar-module")}
                  <span>
                    <b>${escapeHtml(item.title || "Untitled module")}</b>
                    <small>${escapeHtml(compactText(item.description, "Structured module content"))}</small>
                  </span>
                </span>
              </td>
              <td>${escapeHtml(plainValue(item, "course.title", "No course linked"))}</td>
              <td>${statusPill(item.status)}</td>
              <td>${escapeHtml(item.lessonCount || item.lessons?.length || "-")}</td>
              <td>${escapeHtml(`${Number(item.duration || 0)} min`)}</td>
              <td>${escapeHtml(item.order || "-")}</td>
              <td><div class="entity-actions modules-table-actions">${renderActions("modules", item)}</div></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    ${isEmpty ? `
      <div class="empty-state">
        ${iconMarkup("inbox")}
        <h3>No modules found</h3>
        <p>Use Create or adjust the filters to add and manage records.</p>
      </div>
    ` : ""}
  </section>
`;

const renderLessonCard = (item) =>
  cardShell("lessons", item, `
    <div class="entity-head">
      ${avatarMarkup(`L${item.order || ""}`, "", "avatar-lesson")}
      <div>
        <p class="eyebrow">${escapeHtml(plainValue(item, "module.title", "Course lesson"))}</p>
        <h3>${escapeHtml(item.title || "Untitled lesson")}</h3>
        <p>${escapeHtml(plainValue(item, "course.title", "No course linked"))}</p>
      </div>
      ${statusPill(item.status)}
    </div>
    <div class="entity-meta">
      ${metaItem("Type", item.videoUrl ? "Video" : item.content ? "Reading" : "Lesson")}
      ${metaItem("Duration", `${Number(item.duration || 0)} min`)}
      ${metaItem("Order", item.order || "-")}
      ${metaItem("Preview", item.isPreview ? "Yes" : "No")}
    </div>
  `);

const renderLessonsTable = (items, isEmpty) => `
  <section class="card lessons-table-card reveal">
    <div class="lessons-table-wrap">
      <table class="lessons-table">
        <thead>
          <tr>
            <th scope="col">Lesson</th>
            <th scope="col">Course</th>
            <th scope="col">Module</th>
            <th scope="col">Status</th>
            <th scope="col">Type</th>
            <th scope="col">Duration</th>
            <th scope="col">Order</th>
            <th scope="col">Preview</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              <td>
                <span class="lessons-table-lesson">
                  ${avatarMarkup(`L${item.order || ""}`, "", "avatar-lesson")}
                  <span>
                    <b>${escapeHtml(item.title || "Untitled lesson")}</b>
                    <small>${escapeHtml(compactText(item.description || item.content, "Lesson content"))}</small>
                  </span>
                </span>
              </td>
              <td>${escapeHtml(plainValue(item, "course.title", "No course linked"))}</td>
              <td>${escapeHtml(plainValue(item, "module.title", "Course lesson"))}</td>
              <td>${statusPill(item.status)}</td>
              <td>${escapeHtml(item.videoUrl ? "Video" : item.content ? "Reading" : "Lesson")}</td>
              <td>${escapeHtml(`${Number(item.duration || 0)} min`)}</td>
              <td>${escapeHtml(item.order || "-")}</td>
              <td>${escapeHtml(item.isPreview ? "Yes" : "No")}</td>
              <td><div class="entity-actions lessons-table-actions">${renderActions("lessons", item)}</div></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    ${isEmpty ? `
      <div class="empty-state">
        ${iconMarkup("inbox")}
        <h3>No lessons found</h3>
        <p>Use Create or adjust the filters to add and manage records.</p>
      </div>
    ` : ""}
  </section>
`;

const renderQuizCard = (item) =>
  cardShell("quizzes", item, `
    <div class="entity-head">
      ${avatarMarkup("QZ", "", "avatar-quiz")}
      <div>
        <p class="eyebrow">${escapeHtml(plainValue(item, "course.title", "Course quiz"))}</p>
        <h3>${escapeHtml(item.title || "Untitled quiz")}</h3>
        <p>${escapeHtml(compactText(item.description, "Questions, options, and answers are stored from the quiz API."))}</p>
      </div>
      ${statusPill(item.status)}
    </div>
    <div class="entity-meta">
      ${metaItem("Questions", Array.isArray(item.questions) ? item.questions.length : 0)}
      ${metaItem("Marks", item.totalMarks || "-")}
      ${metaItem("Pass", item.passingMarks || "-")}
      ${metaItem("Time", item.timeLimit ? `${item.timeLimit} min` : "-")}
    </div>
  `);

const renderToolCard = (item) =>
  cardShell("aiTools", item, `
    <div class="entity-head">
      ${avatarMarkup(item.name, item.logo, "avatar-tool")}
      <div>
        <p class="eyebrow">${escapeHtml(item.flowType || "AI tool")}</p>
        <h3>${escapeHtml(item.name || "AI tool")}</h3>
        <p>${escapeHtml(compactText(item.description))}</p>
      </div>
      ${statusPill(item.status || "active")}
    </div>
    <div class="tool-integration">
      <span>${iconMarkup(item.apiEndpoint ? "plug-zap" : "plug", item.apiEndpoint ? "API connected" : "Manual launch")}</span>
      <b>${escapeHtml(item.pricingType || "free")}</b>
    </div>
    <div class="entity-meta">
      ${metaItem("Category", plainValue(item, "category.name", item.category || "-"))}
      ${metaItem("Featured", item.isFeatured ? "Yes" : "No")}
      ${metaItem("Website", item.websiteUrl ? "Ready" : "-")}
    </div>
  `);

const renderAiToolsTable = (items, isEmpty) => `
  <section class="card ai-tools-table-card reveal">
    <div class="ai-tools-table-wrap">
      <table class="ai-tools-table">
        <thead>
          <tr>
            <th scope="col">AI Tool</th>
            <th scope="col">Flow</th>
            <th scope="col">Status</th>
            <th scope="col">API</th>
            <th scope="col">Pricing</th>
            <th scope="col">Category</th>
            <th scope="col">Featured</th>
            <th scope="col">Website</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              <td>
                <span class="ai-tools-table-tool">
                  ${avatarMarkup(item.name, item.logo, "avatar-tool")}
                  <span>
                    <b>${escapeHtml(item.name || "AI tool")}</b>
                    <small>${escapeHtml(compactText(item.description, item.slug || "Managed AI tool"))}</small>
                  </span>
                </span>
              </td>
              <td>${escapeHtml(item.flowType || "-")}</td>
              <td>${statusPill(item.status || "active")}</td>
              <td>${escapeHtml(item.apiEndpoint ? "Connected" : "Manual")}</td>
              <td>${escapeHtml(item.pricingType || "free")}</td>
              <td>${escapeHtml(plainValue(item, "category.name", item.category || "-"))}</td>
              <td>${escapeHtml(item.isFeatured ? "Yes" : "No")}</td>
              <td>${escapeHtml(item.websiteUrl ? "Ready" : "-")}</td>
              <td><div class="entity-actions ai-tools-table-actions">${renderActions("aiTools", item)}</div></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    ${isEmpty ? `
      <div class="empty-state">
        ${iconMarkup("inbox")}
        <h3>No AI tools found</h3>
        <p>Use Create or adjust the filters to add and manage records.</p>
      </div>
    ` : ""}
  </section>
`;

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
  const response = await request(path);

  state.data[key] = config.unwrap(response);
  state.selectedIds = new Set();
  state.view = key;
  render();
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
  const selected = cells.find((cell) => cell?.key === state.analyticsFilters.selectedCalendarDate) || highest;

  return {
    monthLabel: new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(monthDate),
    selectedMonth,
    cells,
    max,
    total,
    highest,
    average: Math.round(total / daysInMonth),
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

  return `
    <section class="card panel-small analytics-card registration-card reveal">
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
      <div class="calendar-title-row">
        <strong>${escapeHtml(model.monthLabel)}</strong>
        <span>${wholeNumber(model.total)} registrations</span>
      </div>
      <div class="registration-calendar" role="grid" aria-label="Monthly registration calendar for ${escapeHtml(model.monthLabel)}">
        ${weekdayLabels.map((day) => `<span class="calendar-weekday" role="columnheader">${day}</span>`).join("")}
        ${model.cells
          .map((cell) => {
            if (!cell) return `<span class="calendar-cell calendar-empty" aria-hidden="true"></span>`;
            const level = Math.min(5, Math.ceil((cell.count / model.max) * 5));
            const comparison = `${cell.comparison >= 0 ? "+" : ""}${percentLabel(cell.comparison)} vs previous day`;
            const report = `${longDateLabel(cell.key)}: ${wholeNumber(cell.count)} registrations, ${wholeNumber(cell.activeUsers)} active users, ${comparison}`;
            return `
              <button
                class="calendar-cell heat-${level} ${selected?.key === cell.key ? "selected" : ""}"
                data-calendar-date="${escapeHtml(cell.key)}"
                type="button"
                title="${escapeHtml(report)}"
                aria-label="${escapeHtml(report)}"
              >
                <span>${cell.day}</span>
                <b>${wholeNumber(cell.count)}</b>
              </button>
            `;
          })
          .join("")}
      </div>
      <div class="calendar-day-report" aria-live="polite">
        <span>${escapeHtml(selected ? longDateLabel(selected.key) : "No day selected")}</span>
        <strong>${wholeNumber(selected?.count || 0)} registrations</strong>
        <em>${wholeNumber(selected?.activeUsers || 0)} active users · ${(selected?.comparison || 0) >= 0 ? "+" : ""}${percentLabel(selected?.comparison || 0)} vs previous day</em>
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
          .map((course) => `
            <article class="course-usage-row">
              <div class="course-thumb" aria-hidden="true">${iconMarkup(course.icon)}</div>
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
    <section class="toolbar card reveal">
      <div>
        <p class="eyebrow">${escapeHtml(config.title)} management</p>
        <h2>${escapeHtml(config.title)}</h2>
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
        <button class="btn secondary" data-refresh="${key}" type="button">Refresh</button>
        <button class="btn" data-open-form="${key}" type="button">Create</button>
      </div>
    </section>
    ${config.bulk ? renderBulkActions() : ""}
    <section class="entity-summary">
      ${statChip("Loaded records", items.length, "database")}
      ${statChip("Primary action", "Create", "plus-circle")}
      ${statChip("Data source", config.endpoint, "route")}
    </section>
    ${key === "users" ? renderUsersTable(items, isEmpty) : key === "courses" ? renderCoursesTable(items, isEmpty) : key === "modules" ? renderModulesTable(items, isEmpty) : key === "lessons" ? renderLessonsTable(items, isEmpty) : key === "aiTools" ? renderAiToolsTable(items, isEmpty) : `
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
  const actionButton = (label, attributes, className = "mini", icon = "circle") =>
    `<button class="${className}" ${attributes} type="button">${iconMarkup(icon, label)}</button>`;

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
      ${analyticsTableCard("Monthly Registrations", "Registration trend", analytics.monthlyRegistrations)}
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
