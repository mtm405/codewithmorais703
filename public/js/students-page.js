import { ensureSignedInUser, getCurrentUser } from "./auth.js";
import {
  createProject,
  deleteProject,
  ensureWorkspace,
  listStudentProjectFeedback,
  listUserProjects,
  renameProject
} from "./data-store.js";

const rowsEl = document.getElementById("project-rows");
const stateEl = document.getElementById("projects-state");
const createBtn = document.getElementById("create-project");
const titleInput = document.getElementById("project-title");

const formatTimestamp = (value) => {
  if (!value || typeof value.toDate !== "function") return "-";
  return value.toDate().toLocaleString();
};

const formatStatus = (status) => {
  if (!status) return "Not Reviewed";
  if (status === "complete") return "Complete";
  if (status === "resubmit") return "Resubmit";
  return "Needs Fixes";
};

const setState = (text) => {
  if (stateEl) stateEl.textContent = text;
};

const showFeedbackPopup = (projectTitle, feedback) => {
  if (!feedback) {
    window.alert("No feedback yet for this project.");
    return;
  }

  const lines = [
    `Project: ${projectTitle || "Untitled Project"}`,
    `Status: ${formatStatus(feedback.status)}`,
    `Grade: ${feedback.grade || "-"}`,
    `Late: ${feedback.isLate ? "Yes" : "No"}`,
    "",
    "Comments:",
    feedback.feedback || "No comments yet.",
    "",
    "Next Steps:",
    feedback.nextSteps || "No next steps listed."
  ];

  window.alert(lines.join("\n"));
};

const renderRows = (projects, feedbackMap) => {
  if (!rowsEl) return;

  if (!projects.length) {
    rowsEl.innerHTML = "<tr><td colspan=\"9\" class=\"muted\">No projects yet. Click Create Program.</td></tr>";
    return;
  }

  rowsEl.innerHTML = projects
    .map((project) => {
      const feedback = feedbackMap.get(project.id);
      const statusCell = feedback
        ? `<button class=\"btn btn-secondary review-btn view-feedback-btn\" data-project-id=\"${project.id}\" data-project-title=\"${(project.title || "Untitled Project").replaceAll('"', "&quot;")}\">View Feedback</button>`
        : "No feedback";
      const gradeCell = feedback?.grade || "-";
      const lateCell = feedback ? (feedback.isLate ? "Yes" : "No") : "-";

      return [
        "<tr>",
        `<td>${project.title || "Untitled Project"}</td>`,
        `<td>${project.saveCount || 0}</td>`,
        `<td>${formatTimestamp(project.updatedAt)}</td>`,
        `<td>${statusCell}</td>`,
        `<td>${gradeCell}</td>`,
        `<td>${lateCell}</td>`,
        `<td><a class=\"btn btn-secondary review-btn\" href=\"/ide?project=${project.id}\">Open</a></td>`,
        `<td><button class=\"btn btn-secondary review-btn rename-project-btn\" data-project-id=\"${project.id}\" data-project-title=\"${(project.title || "Untitled Project").replaceAll('"', "&quot;")}\">Rename</button></td>`,
        `<td><button class=\"btn btn-secondary review-btn delete-project-btn\" data-project-id=\"${project.id}\">Delete</button></td>`,
        "</tr>"
      ].join("");
    })
    .join("");
};

const refresh = async (uid) => {
  const [projects, feedbackRows] = await Promise.all([
    listUserProjects(uid),
    listStudentProjectFeedback(uid)
  ]);
  const feedbackMap = new Map(feedbackRows.map((row) => [row.projectId, row]));
  renderRows(projects, feedbackMap);
  setState(`${projects.length} project${projects.length === 1 ? "" : "s"} loaded`);
};

const boot = async () => {
  try {
    await ensureSignedInUser();
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "/";
      return;
    }

    await ensureWorkspace(user.uid);
    await refresh(user.uid);

    if (createBtn) {
      createBtn.addEventListener("click", async () => {
        const title = (titleInput?.value || "").trim() || `HTML Project ${new Date().toLocaleDateString()}`;

        setState("Creating project...");
        const project = await createProject(user.uid, title);
        await refresh(user.uid);
        if (titleInput) titleInput.value = "";
        window.location.href = `/ide?project=${project.id}`;
      });
    }

    if (rowsEl) {
      rowsEl.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.classList.contains("view-feedback-btn")) {
          const projectId = target.dataset.projectId;
          if (!projectId) return;

          const title = target.dataset.projectTitle || "Untitled Project";
          const feedbackRows = await listStudentProjectFeedback(user.uid);
          const feedback = feedbackRows.find((row) => row.projectId === projectId) || null;
          showFeedbackPopup(title, feedback);
          return;
        }

        if (target.classList.contains("rename-project-btn")) {
          const projectId = target.dataset.projectId;
          if (!projectId) return;

          const currentTitle = target.dataset.projectTitle || "Untitled Project";
          const nextTitle = window.prompt("Rename project:", currentTitle);
          if (nextTitle === null) return;

          const cleanTitle = nextTitle.trim();
          if (!cleanTitle) {
            setState("Project name cannot be empty.");
            return;
          }

          try {
            setState("Renaming project...");
            await renameProject(projectId, user.uid, cleanTitle);
            await refresh(user.uid);
          } catch (error) {
            console.error(error);
            setState("Could not rename project.");
          }
          return;
        }

        if (!target.classList.contains("delete-project-btn")) return;

        const projectId = target.dataset.projectId;
        if (!projectId) return;

        const confirmed = window.confirm("Delete this project? This cannot be undone.");
        if (!confirmed) return;

        try {
          setState("Deleting project...");
          await deleteProject(projectId, user.uid);
          await refresh(user.uid);
        } catch (error) {
          console.error(error);
          setState("Could not delete project.");
        }
      });
    }
  } catch (error) {
    console.error(error);
    setState("Could not load projects. Please refresh and try again.");
  }
};

boot();
