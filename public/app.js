const app = document.querySelector("#app");
const storageKey = "cwa_admin_token";
const state = {
  admin: null,
  token: localStorage.getItem(storageKey),
  view: "dashboard",
  stats: null,
  users: [],
  admins: [],
  pagination: null,
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
  const apiHostname = normalizedHostname.startsWith("api.")
    ? normalizedHostname
    : `api.${normalizedHostname}`;
  const apiPort = port ? `:${port}` : "";

  return `${protocol}//${apiHostname}${apiPort}/api`;
};

const apiBaseUrl = getRuntimeApiBaseUrl();

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
    state.message = "First super admin created. Login with that account.";
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
  state.users = [];
  state.admins = [];
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
  const response = await request("/admins/stats");
  state.stats = response.data;
  state.view = "dashboard";
};

const loadUsers = async () => {
  const search = document.querySelector("#user-search")?.value || "";
  const isVerified = document.querySelector("#user-status")?.value || "";
  const params = new URLSearchParams({ limit: "50" });

  if (search) params.set("search", search);
  if (isVerified) params.set("isVerified", isVerified);

  const response = await request(`/admins/users?${params.toString()}`);
  state.users = response.data.users || [];
  state.pagination = response.data.pagination || null;
  state.view = "users";
  render();
};

const loadAdmins = async () => {
  const response = await request("/admins");
  state.admins = response.data || [];
  state.view = "admins";
  render();
};

const switchView = async (view) => {
  state.error = "";
  state.message = "";
  state.view = view;
  render();

  try {
    if (view === "dashboard") await loadDashboard();
    if (view === "users") await loadUsers();
    if (view === "admins") await loadAdmins();
  } catch (error) {
    setMessage("", error.message);
  }
};

const metricCard = (label, value) => `
  <section class="card">
    <p class="metric-label">${escapeHtml(label)}</p>
    <p class="metric-value">${escapeHtml(value)}</p>
  </section>
`;

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
        <button class="link-btn" id="toggle-setup" type="button">Create first super admin</button>
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
          <button class="btn secondary" type="submit" ${state.loading ? "disabled" : ""}>Create super admin</button>
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
  const admins = stats.admins || {};
  const courses = stats.courses || {};
  const aiTools = stats.aiTools || {};
  const payments = stats.payments || {};

  return `
    <div class="grid metrics">
      ${metricCard("Total users", users.total ?? "-")}
      ${metricCard("Verified users", users.verified ?? "-")}
      ${metricCard("Admins", `${admins.active ?? "-"} active`)}
      ${metricCard("Revenue", `₹${payments.revenue ?? 0}`)}
      ${metricCard("Courses", `${courses.published ?? "-"} published`)}
      ${metricCard("AI tools", `${aiTools.active ?? "-"} active`)}
      ${metricCard("Unverified users", users.unverified ?? "-")}
      ${metricCard("Successful payments", payments.successful ?? "-")}
    </div>
  `;
};

const renderUsers = () => `
  <div class="toolbar">
    <h2>Users</h2>
    <div class="toolbar-controls">
      <input id="user-search" placeholder="Search users" />
      <select id="user-status">
        <option value="">All</option>
        <option value="true">Verified</option>
        <option value="false">Unverified</option>
      </select>
      <button class="btn secondary" id="user-filter" type="button">Filter</button>
    </div>
  </div>
  <section class="table-panel">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Status</th>
          <th>Premium</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        ${state.users
          .map(
            (user) => `
              <tr>
                <td>${escapeHtml(user.fullName)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td><span class="pill ${user.isVerified ? "ok" : "warn"}">${user.isVerified ? "Verified" : "Unverified"}</span></td>
                <td>${user.isPremium ? "Yes" : "No"}</td>
                <td>${formatDate(user.createdAt)}</td>
              </tr>
            `
          )
          .join("") || `<tr><td colspan="5">No users found.</td></tr>`}
      </tbody>
    </table>
  </section>
`;

const renderAdmins = () => `
  <div class="toolbar">
    <h2>Admins</h2>
  </div>
  <section class="table-panel">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          <th>Last login</th>
        </tr>
      </thead>
      <tbody>
        ${state.admins
          .map(
            (admin) => `
              <tr>
                <td>${escapeHtml(admin.fullName)}</td>
                <td>${escapeHtml(admin.email)}</td>
                <td>${escapeHtml(admin.role)}</td>
                <td><span class="pill ${admin.isActive ? "ok" : "warn"}">${admin.isActive ? "Active" : "Inactive"}</span></td>
                <td>${formatDate(admin.lastLogin)}</td>
              </tr>
            `
          )
          .join("") || `<tr><td colspan="5">No admins found.</td></tr>`}
      </tbody>
    </table>
  </section>
`;

const renderApp = () => {
  const viewTitle = state.view === "dashboard" ? "Dashboard" : state.view === "users" ? "Users" : "Admins";
  const content = state.view === "dashboard" ? renderDashboard() : state.view === "users" ? renderUsers() : renderAdmins();

  app.innerHTML = `
    <section class="layout">
      <aside class="sidebar">
        <p class="brand">CWA Admin</p>
        <nav class="nav">
          <button class="${state.view === "dashboard" ? "active" : ""}" data-view="dashboard">Dashboard</button>
          <button class="${state.view === "users" ? "active" : ""}" data-view="users">Users</button>
          <button class="${state.view === "admins" ? "active" : ""}" data-view="admins">Admins</button>
        </nav>
      </aside>
      <section class="main">
        <header class="topbar">
          <div>
            <h1>${viewTitle}</h1>
            <p class="admin-name">${escapeHtml(state.admin?.fullName || "")} · ${escapeHtml(state.admin?.role || "")}</p>
          </div>
          <button class="btn danger" id="logout" type="button">Logout</button>
        </header>
        ${state.error ? `<div class="alert error">${escapeHtml(state.error)}</div>` : ""}
        ${state.message ? `<div class="alert info">${escapeHtml(state.message)}</div>` : ""}
        ${content}
      </section>
    </section>
  `;

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });
  document.querySelector("#logout").addEventListener("click", () => logout());
  document.querySelector("#user-filter")?.addEventListener("click", loadUsers);
};

const render = () => {
  if (!state.token || !state.admin) {
    renderLogin();
    return;
  }

  renderApp();
};

loadSession();
