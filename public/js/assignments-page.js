import { ensureSignedInUser, getCurrentUser } from "./auth.js";
import { createAssignmentForAllStudents, listAssignments } from "./data-store.js";

const TEACHER_EMAIL = "marco.morais@imaginenorthport.com";
const VIEW_MODE_KEY = "cwm_teacher_view_mode";
const ASSIGNMENT_PREFILL_KEY = "cwm_assignment_prefill";

const titleEl = document.getElementById("assignment-title");
const htmlEl = document.getElementById("assignment-html");
const cssEl = document.getElementById("assignment-css");
const publishBtn = document.getElementById("publish-assignment");
const stateEl = document.getElementById("assignment-state");
const rowsEl = document.getElementById("assignment-rows");

const starterHtml = [
  "<!DOCTYPE html>",
  "<html lang=\"en\">",
  "<head>",
  "  <title>Assignment</title>",
  "</head>",
  "<body>",
  "  <main>",
  "    <h1>Assignment Starter</h1>",
  "    <p>Edit this code to complete your assignment.</p>",
  "  </main>",
  "</body>",
  "</html>"
].join("\n");

const starterCss = [
  "body {",
  "  font-family: Verdana, sans-serif;",
  "  margin: 24px;",
  "}",
  "",
  "h1 {",
  "  color: #d35400;",
  "}"
].join("\n");

const formatTimestamp = (value) => {
  if (!value || typeof value.toDate !== "function") return "-";
  return value.toDate().toLocaleString();
};

const setState = (text) => {
  if (stateEl) stateEl.textContent = text;
};

const renderAssignments = (assignments) => {
  if (!rowsEl) return;

  if (!assignments.length) {
    rowsEl.innerHTML = "<tr><td colspan=\"3\" class=\"muted\">No assignments yet.</td></tr>";
    return;
  }

  rowsEl.innerHTML = assignments
    .map((assignment) => [
      "<tr>",
      `<td>${assignment.title || "Untitled Assignment"}</td>`,
      `<td>${assignment.assignedCount || 0}</td>`,
      `<td>${formatTimestamp(assignment.createdAt)}</td>`,
      "</tr>"
    ].join(""))
    .join("");
};

const refreshAssignments = async () => {
  const rows = await listAssignments();
  renderAssignments(rows);
};

const boot = async () => {
  let prefill = null;
  try {
    const raw = window.localStorage.getItem(ASSIGNMENT_PREFILL_KEY);
    prefill = raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Invalid assignment prefill payload", error);
  }

  if (titleEl) titleEl.value = prefill?.title || "";
  if (htmlEl) htmlEl.value = prefill?.html || starterHtml;
  if (cssEl) cssEl.value = prefill?.css || starterCss;
  if (prefill) {
    window.localStorage.removeItem(ASSIGNMENT_PREFILL_KEY);
  }

  await ensureSignedInUser();
  const user = getCurrentUser();

  if (!user) {
    setState("Sign in first. Teacher access is required.");
    window.location.href = "/";
    return;
  }

  if ((user.email || "").toLowerCase() !== TEACHER_EMAIL) {
    setState("Access denied. Assignments are restricted to the teacher account.");
    window.location.href = "/dashboard";
    return;
  }

  const viewMode = window.localStorage.getItem(VIEW_MODE_KEY) || "admin";
  if (viewMode !== "admin") {
    setState("Switch to Admin View to manage assignments.");
    window.location.href = "/dashboard";
    return;
  }

  await refreshAssignments();
  setState(prefill ? "Template loaded from Practice Bank. Ready to publish assignment." : "Ready to publish assignment.");

  if (publishBtn) {
    publishBtn.addEventListener("click", async () => {
      const title = (titleEl?.value || "").trim();
      const html = (htmlEl?.value || "").trim();
      const css = (cssEl?.value || "").trim();

      if (!title) {
        setState("Assignment name is required.");
        return;
      }

      if (!html) {
        setState("Starter index.html is required.");
        return;
      }

      try {
        setState("Publishing assignment to all students...");
        publishBtn.disabled = true;
        const result = await createAssignmentForAllStudents({
          teacherUid: user.uid,
          title,
          html,
          css,
          studentPrompt: (prefill?.studentPrompt || "").trim(),
          goalHtml: (prefill?.goalHtml || "").trim(),
          goalCss: (prefill?.goalCss || "").trim()
        });
        await refreshAssignments();
        setState(`Published to ${result.assignedCount} student project${result.assignedCount === 1 ? "" : "s"}.`);
      } catch (error) {
        console.error(error);
        setState("Could not publish assignment.");
      } finally {
        publishBtn.disabled = false;
      }
    });
  }
};

boot();
