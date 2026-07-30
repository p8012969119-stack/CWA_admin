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
    return "http://localhost:3000/api";
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

const navItems = [
  { key: "dashboard", label: "Dashboard", section: "Operate" },
  { key: "learning", label: "Learning", section: "Operate" },
  { key: "workspace", label: "AI Workspace", section: "Operate" },
  { key: "users", label: "Users", section: "Admin" },
  { key: "admins", label: "Admins", section: "Admin" },
  { key: "courses", label: "Courses", section: "Content" },
  { key: "modules", label: "Modules", section: "Content" },
  { key: "lessons", label: "Lessons", section: "Content" },
  { key: "aiTools", label: "AI Tools", section: "Content" },
  { key: "categories", label: "Categories", section: "Content" },
  { key: "certificates", label: "Certificates", section: "Trust" },
  { key: "analytics", label: "Analytics", section: "Trust" },
  { key: "notifications", label: "Notifications", section: "Trust" },
  { key: "settings", label: "Settings", section: "System" },
  { key: "auditLogs", label: "Audit Logs", section: "System" },
  { key: "profile", label: "Profile", section: "System" },
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
    endpoint: "/auth/certificates",
    unwrap: (response) => response.data || [],
    columns: [
      { key: "title", label: "Title" },
      { key: "user.email", label: "User" },
      { key: "course.title", label: "Course" },
      { key: "status", label: "Status", type: "status" },
      { key: "issuedDate", label: "Issued", type: "date" },
    ],
    fields: [
      { name: "user", label: "User ID", required: true },
      { name: "course", label: "Course ID", required: true },
      { name: "title", label: "Title" },
      { name: "certificateUrl", label: "Certificate URL" },
      { name: "completionDate", label: "Completion date", type: "date" },
      { name: "status", label: "Status", type: "select", options: [["active", "Active"], ["revoked", "Revoked"]] },
    ],
    actions: ["edit", "revoke", "delete"],
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

  if (Array.isArray(value)) return escapeHtml(value.join(", "));
  if (value && typeof value === "object") return escapeHtml(value.title || value.name || value.email || value._id || "-");
  return escapeHtml(value || "-");
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

  try {
    const response = await request("/admins/me");
    state.admin = response.data;
    await loadDashboard();
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

const metricCard = (label, value, note = "") => `
  <section class="card metric-card">
    <p class="metric-label">${escapeHtml(label)}</p>
    <p class="metric-value">${escapeHtml(value)}</p>
    ${note ? `<p class="metric-note">${escapeHtml(note)}</p>` : ""}
  </section>
`;

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

const renderLogin = () => {
  app.innerHTML = `
    <section class="auth-view">
      <div class="auth-panel">
        <p class="brand">CrackWithAI Admin</p>
        <h1>Admin sign in</h1>
        <p class="subtitle">Use an admin account to manage CrackWithAI.</p>
        ${state.error ? `<div class="alert error">${escapeHtml(state.error)}</div>` : ""}
        ${state.message ? `<div class="alert info">${escapeHtml(state.message)}</div>` : ""}
        <form class="form" id="login-form">
          <label class="field">
            <span>Email</span>
            <input name="email" type="email" autocomplete="email" required />
          </label>
          <label class="field">
            <span>Password</span>
            <input name="password" type="password" autocomplete="current-password" required />
          </label>
          <button class="btn" type="submit" ${state.loading ? "disabled" : ""}>
            ${state.loading ? "Signing in..." : "Sign in"}
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
    </section>
  `;

  document.querySelector("#login-form").addEventListener("submit", login);
  document.querySelector("#setup-form").addEventListener("submit", bootstrap);
  document.querySelector("#toggle-setup").addEventListener("click", () => {
    document.querySelector("#setup-form").classList.toggle("hidden");
  });
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

  return `
    <div class="grid metrics">
      ${metricCard("Total Users", users.total ?? 0, `${users.active ?? 0} active`)}
      ${metricCard("Active Users", users.active ?? 0, `${users.dailyActive ?? 0} today`)}
      ${metricCard("Total Courses", courses.total ?? 0, `${courses.published ?? 0} published`)}
      ${metricCard("Total Modules", modules.total ?? 0, `${modules.lessons ?? 0} lessons`)}
      ${metricCard("Total AI Tools", aiTools.total ?? 0, `${aiTools.active ?? 0} active`)}
      ${metricCard("Certificates Issued", certs.issued ?? 0)}
      ${metricCard("New Registrations", users.newRegistrations ?? 0, "last 7 days")}
      ${metricCard("Course Completion", `${learning.averageProgress ?? 0}%`, `${learning.completedEnrollments ?? 0} complete`)}
      ${metricCard("Daily Active Users", users.dailyActive ?? 0)}
    </div>

    <div class="grid dashboard-panels">
      <section class="card">
        <h2>User Growth</h2>
        <div class="chart-wrap"><canvas id="chart-user-growth" class="chart-canvas" data-chart="userGrowth"></canvas></div>
      </section>
      <section class="card">
        <h2>Monthly Registrations</h2>
        <div class="chart-wrap"><canvas id="chart-monthly-registrations" class="chart-canvas" data-chart="monthlyRegistrations"></canvas></div>
      </section>
      <section class="card">
        <h2>Popular Courses</h2>
        <div class="chart-wrap"><canvas id="chart-popular-courses" class="chart-canvas" data-chart="popularCourses"></canvas></div>
      </section>
      <section class="card">
        <h2>AI Tool Usage</h2>
        <div class="chart-wrap"><canvas id="chart-ai-tool-usage" class="chart-canvas" data-chart="topAiTools"></canvas></div>
      </section>
    </div>
  `;
};

const renderLearning = () => `
  <section class="card feature-grid">
    <div>
      <h2>Learning modules</h2>
      <p>Admins can review courses, modules, lessons, progress, and certificates from the content management sections.</p>
    </div>
    <button class="btn secondary" data-view="courses" type="button">Manage courses</button>
    <button class="btn secondary" data-view="modules" type="button">Manage modules</button>
    <button class="btn secondary" data-view="lessons" type="button">Manage lessons</button>
    <button class="btn secondary" data-view="certificates" type="button">Manage certificates</button>
  </section>
`;

const renderWorkspace = () => `
  <section class="card feature-grid">
    <div>
      <h2>AI workspace and chat</h2>
      <p>Manage AI tools here, then use the main CrackWithAI app for the learner-facing workspace experience.</p>
    </div>
    <button class="btn secondary" data-view="aiTools" type="button">Manage AI tools</button>
    <button class="btn secondary" data-view="categories" type="button">Manage categories</button>
  </section>
`;

const renderFormFields = (config, item = {}, mode = "create") =>
  config.fields
    .filter((field) => !(field.createOnly && mode !== "create"))
    .map((field) => {
      const value = item[field.name] ?? field.defaultValue ?? "";
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

  return `
    <div class="toolbar">
      <div>
        <h2>${escapeHtml(config.title)}</h2>
        <p>${items.length} records loaded</p>
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
    </div>
    ${config.bulk ? renderBulkActions() : ""}
    <section class="table-panel">
      <table>
        <thead>
          <tr>
            ${config.bulk ? "<th></th>" : ""}
            ${config.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map((item) => `
              <tr>
                ${config.bulk ? `<td><input type="checkbox" data-select-id="${escapeHtml(item._id)}" ${state.selectedIds.has(item._id) ? "checked" : ""} /></td>` : ""}
                ${config.columns.map((column) => `<td>${formatCell(item, column)}</td>`).join("")}
                <td><div class="row-actions">${renderActions(key, item)}</div></td>
              </tr>
            `)
            .join("") || `<tr><td colspan="${config.columns.length + 2}">No records found.</td></tr>`}
        </tbody>
      </table>
    </section>
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
  return (config.actions || [])
    .map((action) => {
      if (action === "view") return `<button class="mini" data-view-record="${key}:${item._id}" type="button">View</button>`;
      if (action === "edit") return `<button class="mini" data-edit-record="${key}:${item._id}" type="button">Edit</button>`;
      if (action === "delete") {
        const isSelf = key === "admins" && String(item._id) === String(state.admin?._id);
        return `<button class="mini danger-text" data-delete-record="${key}:${item._id}" type="button" ${isSelf ? "disabled" : ""}>Delete</button>`;
      }
      if (action === "password") return `<button class="mini" data-password-record="${key}:${item._id}" type="button">Reset password</button>`;
      if (action === "premium") return `<button class="mini" data-user-premium="${item._id}:${item.isPremium ? "false" : "true"}" type="button">${item.isPremium ? "Remove premium" : "Assign premium"}</button>`;
      if (action === "status") return `<button class="mini" data-user-status="${key}:${item._id}:${item.isActive === false ? "true" : "false"}" type="button">${item.isActive === false ? "Activate" : "Deactivate"}</button>`;
      if (action === "publish") return `<button class="mini" data-status-record="${key}:${item._id}:published" type="button">Publish</button>`;
      if (action === "archive") return `<button class="mini" data-status-record="${key}:${item._id}:archived" type="button">Archive</button>`;
      if (action === "duplicate") return `<button class="mini" data-duplicate-record="${key}:${item._id}" type="button">Duplicate</button>`;
      if (action === "feature") return `<button class="mini" data-tool-feature="${item._id}:${item.isFeatured ? "false" : "true"}" type="button">${item.isFeatured ? "Unfeature" : "Feature"}</button>`;
      if (action === "hide") return `<button class="mini" data-tool-hide="${item._id}:${item.status === "active" ? "inactive" : "active"}" type="button">${item.status === "active" ? "Hide" : "Show"}</button>`;
      if (action === "show") return `<button class="mini" data-category-show="${item._id}:${item.isActive ? "false" : "true"}" type="button">${item.isActive ? "Hide" : "Show"}</button>`;
      if (action === "revoke") return `<button class="mini" data-revoke-cert="${item._id}" type="button">Revoke</button>`;
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
    <div class="grid dashboard-panels">
      <section class="card"><h2>User Growth</h2>${bars(analytics.userGrowth)}</section>
      <section class="card"><h2>Course Completion</h2>${bars(analytics.learningProgress, "_id", "count")}</section>
      <section class="card"><h2>Monthly Registrations</h2>${bars(analytics.monthlyRegistrations)}</section>
      <section class="card"><h2>Top Courses</h2>${bars(analytics.popularCourses, "title", "learners")}</section>
      <section class="card"><h2>Top AI Tools</h2>${bars((analytics.topAiTools || []).map((tool) => ({ title: tool.name, count: tool.isFeatured ? 2 : 1 })), "title", "count")}</section>
      <section class="card">
        <h2>Active Users</h2>
        <div class="activity-split">
          ${metricCard("Daily", analytics.activeUsers?.daily ?? 0)}
          ${metricCard("Weekly", analytics.activeUsers?.weekly ?? 0)}
          ${metricCard("Monthly", analytics.activeUsers?.monthly ?? 0)}
        </div>
      </section>
    </div>
  `;
};

const renderSettings = () => {
  const settings = state.settings || {};
  return `
    <section class="card settings-card">
      <h2>Platform Settings</h2>
      <form class="form settings-form" id="settings-form">
        ${[
          ["platformName", "Platform name"],
          ["logoUrl", "Logo URL"],
          ["contactEmail", "Contact email"],
          ["privacyPolicyUrl", "Privacy policy URL"],
          ["termsUrl", "Terms URL"],
          ["storageProvider", "Storage provider"],
        ]
          .map(([name, label]) => `
            <label class="field">
              <span>${label}</span>
              <input name="${name}" value="${escapeHtml(settings[name] || "")}" />
            </label>
          `)
          .join("")}
        <label class="check-field">
          <input name="maintenanceMode" type="checkbox" ${settings.maintenanceMode ? "checked" : ""} />
          <span>Maintenance mode</span>
        </label>
        <div class="config-flags">
          <span class="pill ${settings.smtpConfigured ? "ok" : "warn"}">SMTP ${settings.smtpConfigured ? "configured" : "missing"}</span>
          <span class="pill ${settings.jwtConfigured ? "ok" : "warn"}">JWT ${settings.jwtConfigured ? "configured" : "missing"}</span>
          <span class="pill muted">${escapeHtml(settings.environment || "development")}</span>
        </div>
        <button class="btn" type="submit">Save settings</button>
      </form>
    </section>
  `;
};

const renderAuditLogs = () => {
  const logs = state.data.auditLogs || [];
  return `
    <section class="table-panel">
      <table>
        <thead><tr><th>Action</th><th>Admin</th><th>Entity</th><th>Description</th><th>Time</th></tr></thead>
        <tbody>
          ${logs
            .map((log) => `
              <tr>
                <td>${escapeHtml(log.action)}</td>
                <td>${escapeHtml(log.admin?.email || "-")}</td>
                <td>${escapeHtml(log.entityType || "-")}</td>
                <td>${escapeHtml(log.description || "-")}</td>
                <td>${formatDate(log.createdAt)}</td>
              </tr>
            `)
            .join("") || `<tr><td colspan="5">No audit logs yet.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
};

const renderProfile = () => `
  <section class="card profile-card">
    <h2>${escapeHtml(state.admin?.fullName || "Admin")}</h2>
    <p>${escapeHtml(state.admin?.email || "")}</p>
    <span class="pill ok">${escapeHtml(state.admin?.role === "superadmin" ? "admin" : state.admin?.role || "admin")}</span>
    <div class="profile-grid">
      <p><b>Status</b><span>${state.admin?.isActive ? "Active" : "Inactive"}</span></p>
      <p><b>Last login</b><span>${formatDate(state.admin?.lastLogin)}</span></p>
      <p><b>Created</b><span>${formatDate(state.admin?.createdAt)}</span></p>
    </div>
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
        <p class="brand">CWA Admin</p>
        <nav class="nav">
          ${sections
            .map((section) => `
              <p class="nav-section">${escapeHtml(section)}</p>
              ${navItems
                .filter((item) => item.section === section)
                .map((item) => `<button class="${state.view === item.key ? "active" : ""}" data-view="${item.key}" type="button">${escapeHtml(item.label)}</button>`)
                .join("")}
            `)
            .join("")}
        </nav>
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
            <button id="notifications" class="icon-btn" title="Notifications">🔔</button>
            <button id="messages" class="icon-btn" title="Messages">✉️</button>
            <button id="theme-toggle" class="icon-btn" title="Toggle theme">🌓</button>
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
};

const initCharts = () => {
  if (typeof Chart === 'undefined') return;
  try {
    const makeDataset = (arr, valueKey='count') => ({labels:(arr||[]).map(a=>a._id||a.title||a.name||''),data:(arr||[]).map(a=>Number(a[valueKey]||0))});

    const userGrowth = makeDataset(state.analytics?.userGrowth||[],'count');
    const ctx1 = document.getElementById('chart-user-growth');
    if (ctx1 && userGrowth.labels.length) new Chart(ctx1.getContext('2d'),{type:'line',data:{labels:userGrowth.labels,datasets:[{label:'Users',data:userGrowth.data,backgroundColor:'rgba(16,185,129,0.12)',borderColor:'rgba(16,185,129,1)',tension:0.3,fill:true}]},options:{plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}}}});

    const monthly = makeDataset(state.analytics?.monthlyRegistrations||[],'count');
    const ctx2 = document.getElementById('chart-monthly-registrations');
    if (ctx2 && monthly.labels.length) new Chart(ctx2.getContext('2d'),{type:'bar',data:{labels:monthly.labels,datasets:[{label:'Regs',data:monthly.data,backgroundColor:'rgba(6,182,212,0.9)'}]},options:{plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}}}});

    const popular = makeDataset(state.analytics?.popularCourses||[],'learners');
    const ctx3 = document.getElementById('chart-popular-courses');
    if (ctx3 && popular.labels.length) new Chart(ctx3.getContext('2d'),{type:'bar',data:{labels:popular.labels,datasets:[{label:'Learners',data:popular.data,backgroundColor:'rgba(16,185,129,0.9)'}]},options:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{display:false},y:{display:false}}}});

    const tools = makeDataset((state.analytics?.topAiTools||[]).map(t=>({title:t.name,count:t.count||1})),'count');
    const ctx4 = document.getElementById('chart-ai-tool-usage');
    if (ctx4 && tools.labels.length) new Chart(ctx4.getContext('2d'),{type:'doughnut',data:{labels:tools.labels,datasets:[{data:tools.data,backgroundColor:[ 'rgba(16,185,129,0.9)','rgba(6,182,212,0.9)','rgba(52,211,153,0.9)','rgba(99,102,241,0.9)']}]},options:{plugins:{legend:{position:'right'}}}});
  } catch (e){console.warn('Chart init failed',e)}
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
  document.querySelector("#logout")?.addEventListener("click", () => logout());
  document.querySelectorAll("[data-refresh]").forEach((button) => {
    button.addEventListener("click", () => loadEntity(button.dataset.refresh));
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
    button.addEventListener("click", () => patchAndReload(`${entityConfigs.certificates.endpoint}/${button.dataset.revokeCert}`, "revoke", {}, "certificates", "PATCH"));
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
  const payload = getPayloadFromForm(new FormData(form), config.fields, id ? "edit" : "create");

  try {
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
