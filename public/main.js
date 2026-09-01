import { ensureSignedInUser, getCurrentUser, signIn, signOutUser } from "./js/auth.js";

const authSlot = document.getElementById("auth-slot");
const navLinks = document.querySelector(".nav-links");
const heroLoginBtn = document.getElementById("hero-login-btn");
const heroProjectsLink = document.getElementById("hero-projects-link");
const heroIdeLink = document.getElementById("hero-ide-link");
const TEACHER_EMAIL = "marco.morais@imaginenorthport.com";
const VIEW_MODE_KEY = "cwm_teacher_view_mode";

const isTeacherUser = (user) => {
  if (!user || !user.email) return false;
  return user.email.toLowerCase() === TEACHER_EMAIL;
};

const getViewMode = (user) => {
  if (!isTeacherUser(user)) return "student";
  const saved = window.localStorage.getItem(VIEW_MODE_KEY);
  if (saved === "student" || saved === "admin") return saved;
  return "admin";
};

const setViewMode = (mode) => {
  window.localStorage.setItem(VIEW_MODE_KEY, mode);
};

const setTabVisibility = (user) => {
  if (!navLinks) return;
  const signedIn = Boolean(user);
  navLinks.classList.toggle("is-visible", signedIn);
  if (!signedIn) return;

  const mode = getViewMode(user);
  navLinks.querySelectorAll("a").forEach((link) => {
    const scopeRaw = link.dataset.scope || "student admin";
    const scopes = scopeRaw.split(" ").filter(Boolean);
    const showInStudent = scopes.includes("student");
    const showInAdmin = scopes.includes("admin");
    const visible = mode === "admin" ? showInAdmin : showInStudent;
    link.classList.toggle("is-hidden", !visible);
  });
};

const syncHomeActions = (user) => {
  const signedIn = Boolean(user);
  if (heroLoginBtn) {
    heroLoginBtn.hidden = signedIn;
    heroLoginBtn.onclick = signedIn ? null : signIn;
  }
  if (heroProjectsLink) {
    heroProjectsLink.hidden = !signedIn;
  }
  if (heroIdeLink) {
    heroIdeLink.hidden = !signedIn;
  }
};

const renderSignedOut = () => {
  if (!authSlot) return;
  authSlot.innerHTML = "<button id=\"login-btn\" class=\"btn btn-primary\">Student Login</button>";
  const loginBtn = document.getElementById("login-btn");
  if (loginBtn) loginBtn.addEventListener("click", signIn);
};

const renderSignedIn = (user) => {
  if (!authSlot) return;
  const mode = getViewMode(user);
  const teacherControls = isTeacherUser(user)
    ? [
      `<button id=\"toggle-view-btn\" class=\"btn btn-secondary\">Switch to ${mode === "admin" ? "Student" : "Admin"} View</button>`,
      `<span class=\"status-chip\">Mode: ${mode === "admin" ? "Admin" : "Student"}</span>`
    ].join("")
    : "";

  authSlot.innerHTML = [
    "<span class=\"status-chip\">",
    `Signed in: ${user.displayName || user.email || "Student"}`,
    "</span>",
    teacherControls,
    "<button id=\"logout-btn\" class=\"btn btn-secondary\">Log Out</button>"
  ].join("");

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", signOutUser);

  if (isTeacherUser(user)) {
    const toggleBtn = document.getElementById("toggle-view-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const current = getViewMode(user);
        const next = current === "admin" ? "student" : "admin";
        setViewMode(next);
        setTabVisibility(user);
        renderSignedIn(user);
        activateNav();

        if (
          next === "student"
          && (
            window.location.pathname === "/teacher"
            || window.location.pathname === "/assignments"
            || window.location.pathname === "/practice-bank"
          )
        ) {
          window.location.href = "/dashboard";
        }
      });
    }
  }
};

const activateNav = () => {
  const path = window.location.pathname === "/" ? "/" : window.location.pathname.replace(/\/$/, "");
  document.querySelectorAll(".nav-links a").forEach((link) => {
    if (link.classList.contains("is-hidden")) {
      link.classList.remove("active");
      return;
    }
    const href = link.getAttribute("href");
    if (!href) return;
    const cleanHref = href === "/" ? "/" : href.replace(/\/$/, "");
    if (cleanHref === path) {
      link.classList.add("active");
    }
  });
};

const boot = async () => {
  try {
    await ensureSignedInUser();
    const user = getCurrentUser();
    setTabVisibility(user);
    syncHomeActions(user);
    if (user) {
      renderSignedIn(user);

      const atHome = window.location.pathname === "/" || window.location.pathname === "/index.html";
      if (atHome && !isTeacherUser(user)) {
        window.location.href = "/dashboard";
        return;
      }
    } else {
      renderSignedOut();
    }
    activateNav();
  } catch (error) {
    console.error("Auth bootstrap error", error);
    setTabVisibility(null);
    syncHomeActions(null);
    renderSignedOut();
  }
};

boot();
