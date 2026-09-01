import { ensureSignedInUser, getCurrentUser } from "./auth.js";
import {
  getProjectFeedback,
  getProjectById,
  ensureWorkspace,
  listUserProjects,
  saveProject,
  saveWorkspace
} from "./data-store.js";

const saveStateEl = document.getElementById("save-state");
const assignmentOpenBtn = document.getElementById("open-assignment");
const feedbackOpenBtn = document.getElementById("open-feedback");
const feedbackDrawerEl = document.getElementById("feedback-drawer");
const feedbackCloseBtn = document.getElementById("feedback-close");
const fullscreenBtn = document.getElementById("toggle-fullscreen");
const saveNowBtn = document.getElementById("save-now");
const resetCodeBtn = document.getElementById("reset-code");
const previewFrame = document.getElementById("preview");
const tabHtmlBtn = document.getElementById("tab-html");
const tabCssBtn = document.getElementById("tab-css");
const ideLayoutEl = document.querySelector(".ide-layout");
const paneDividerEl = document.getElementById("pane-divider");
const feedbackStatusPillEl = document.getElementById("feedback-pill-status");
const feedbackGradePillEl = document.getElementById("feedback-pill-grade");
const feedbackLatePillEl = document.getElementById("feedback-pill-late");
const feedbackUpdatedEl = document.getElementById("feedback-updated");
const feedbackCommentsEl = document.getElementById("feedback-comments");
const feedbackNextEl = document.getElementById("feedback-next");
const assignmentBriefEl = document.getElementById("assignment-brief");
const assignmentBriefTitleEl = document.getElementById("assignment-brief-title");
const assignmentBriefTextEl = document.getElementById("assignment-brief-text");
const assignmentBriefCloseBtn = document.getElementById("assignment-brief-close");
const assignmentBriefCopyBtn = document.getElementById("assignment-brief-copy");
const assignmentTaskTrackerEl = document.getElementById("assignment-task-tracker");
const assignmentTaskProgressEl = document.getElementById("assignment-task-progress");
const assignmentTaskCurrentEl = document.getElementById("assignment-task-current");
const assignmentTaskStateEl = document.getElementById("assignment-task-state");
const assignmentTaskCheckBtn = document.getElementById("assignment-task-check");
const assignmentTaskDoneBtn = document.getElementById("assignment-task-done");
const assignmentTaskNextBtn = document.getElementById("assignment-task-next");

let editor;
let modelHtml;
let modelCss;
let autosaveTimer;
let usingMonaco = false;
let fallbackHtml;
let fallbackCss;
let currentUser = null;
let activeProjectId = null;

const LOCAL_HTML_KEY = "cwm_ide_html";
const LOCAL_CSS_KEY = "cwm_ide_css";
const LOCAL_PANE_RATIO_KEY = "cwm_ide_pane_ratio";
const LOCAL_FOCUS_MODE_KEY = "cwm_ide_focus_mode";
const LOCAL_TASK_INDEX_PREFIX = "cwm_ide_task_index_";
const LOCAL_TASK_DONE_PREFIX = "cwm_ide_task_done_";

let focusExitBtn;
let assignmentBriefText = "";
let assignmentTaskList = [];
let assignmentTaskIndex = 0;
let assignmentTaskDone = [];

const starterCode = {
  html: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <title>My Project</title>\n</head>\n<body>\n  <main>\n    <h1>Hello, web world!</h1>\n    <p>Start building your page here.</p>\n  </main>\n</body>\n</html>",
  css: "body {\n  font-family: Verdana, sans-serif;\n  margin: 24px;\n  color: #1e1f22;\n}\n\nh1 {\n  color: #d35400;\n}\n"
};

const setSaveState = (message) => {
  if (saveStateEl) saveStateEl.textContent = message;
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
};

const setAssignmentPanelOpen = (open) => {
  if (!assignmentBriefEl) return;
  assignmentBriefEl.classList.toggle("is-open", open);
  assignmentBriefEl.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.classList.toggle("assignment-panel-open", open);
  if (assignmentOpenBtn) {
    assignmentOpenBtn.textContent = open ? "Hide Assignment" : "Assignment";
  }
};

const renderAssignmentBrief = (workspace) => {
  if (!assignmentBriefEl || !assignmentBriefTitleEl || !assignmentBriefTextEl) return;

  const title = (workspace?.title || "Current Project").trim();
  const instructions = (workspace?.assignmentInstructions || "").trim();
  assignmentBriefText = instructions;

  assignmentBriefTitleEl.textContent = `Assignment: ${title}`;

  if (instructions) {
    assignmentBriefTextEl.textContent = instructions;
    assignmentBriefEl.classList.remove("is-empty");
    if (assignmentBriefCopyBtn) assignmentBriefCopyBtn.disabled = false;
  } else {
    assignmentBriefTextEl.textContent = "No assignment instructions provided for this project.";
    assignmentBriefEl.classList.add("is-empty");
    if (assignmentBriefCopyBtn) assignmentBriefCopyBtn.disabled = true;
  }
};

const getTaskIndexKey = () => `${LOCAL_TASK_INDEX_PREFIX}${activeProjectId || "default"}`;

const getTaskDoneKey = () => `${LOCAL_TASK_DONE_PREFIX}${activeProjectId || "default"}`;

const parseTasksFromInstructions = (instructions) => {
  const lines = (instructions || "").split("\n");
  const tasks = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    const numbered = trimmed.match(/^\d+\)\s+(.+)$/) || trimmed.match(/^\d+\.\s+(.+)$/);
    if (numbered?.[1]) {
      tasks.push(numbered[1].trim());
      return;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet?.[1] && /task|goal|set |change |add |style /i.test(bullet[1])) {
      tasks.push(bullet[1].trim());
    }
  });

  return tasks;
};

const cssRuleHasProperty = (css, selector, property) => {
  const pattern = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{[^}]*\\b${property}\\s*:`, "i");
  return pattern.test(css || "");
};

const cssHasSelector = (css, selector) => {
  const pattern = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`, "i");
  return pattern.test(css || "");
};

const taskPasses = (taskText, html, css) => {
  const task = (taskText || "").toLowerCase();

  if (task.includes("h1") && task.includes("color")) {
    return cssRuleHasProperty(css, "h1", "color");
  }

  if (task.includes("h2") && task.includes("color")) {
    return cssRuleHasProperty(css, "h2", "color");
  }

  if (task.includes("p") && task.includes("color")) {
    return cssRuleHasProperty(css, "p", "color");
  }

  if (task.includes("button") && task.includes("color")) {
    return cssRuleHasProperty(css, "button", "color") || cssRuleHasProperty(css, "button", "background-color");
  }

  if (task.includes("table") && task.includes("color")) {
    return (
      cssRuleHasProperty(css, "table", "color") ||
      cssRuleHasProperty(css, "table", "background-color") ||
      cssRuleHasProperty(css, "table", "border-color") ||
      cssRuleHasProperty(css, ".grade-table", "color") ||
      cssRuleHasProperty(css, ".grade-table", "background-color") ||
      cssRuleHasProperty(css, ".grade-table", "border-color") ||
      cssRuleHasProperty(css, ".grade-table th", "color") ||
      cssRuleHasProperty(css, ".grade-table th", "background-color") ||
      cssRuleHasProperty(css, "th", "color") ||
      cssRuleHasProperty(css, "th", "background-color")
    );
  }

  if (task.includes("body") && task.includes("background")) {
    return cssRuleHasProperty(css, "body", "background-color") || cssRuleHasProperty(css, "body", "background");
  }

  if (task.includes("line-height") && task.includes("p")) {
    return cssRuleHasProperty(css, "p", "line-height");
  }

  if (task.includes("font-size") && task.includes("h1")) {
    return cssRuleHasProperty(css, "h1", "font-size");
  }

  if (task.includes("font-size") && task.includes("h2")) {
    return cssRuleHasProperty(css, "h2", "font-size");
  }

  if (task.includes("font-size") && task.includes("paragraph")) {
    return cssRuleHasProperty(css, "p", "font-size");
  }

  if (task.includes("padding")) {
    return /\bpadding\s*:/i.test(css || "");
  }

  if (task.includes("margin")) {
    return /\bmargin\s*:/i.test(css || "") || /\bmargin-top\s*:/i.test(css || "");
  }

  if (task.includes("border-radius")) {
    return /\bborder-radius\s*:/i.test(css || "");
  }

  if (task.includes("border")) {
    return /\bborder\s*:/i.test(css || "");
  }

  if (task.includes("display") && task.includes("flex")) {
    return /\bdisplay\s*:\s*flex\b/i.test(css || "");
  }

  if (task.includes("justify-content")) {
    return /\bjustify-content\s*:/i.test(css || "");
  }

  if (task.includes("align-items")) {
    return /\balign-items\s*:/i.test(css || "");
  }

  if (task.includes("gap")) {
    return /\bgap\s*:/i.test(css || "");
  }

  if (task.includes("hover")) {
    return cssHasSelector(css, "button:hover") || /\.[a-z0-9_-]+:hover\s*\{/i.test(css || "");
  }

  if (task.includes("link") && task.includes("underline")) {
    return /text-decoration\s*:\s*none/i.test(css || "");
  }

  if (task.includes("class=")) {
    const classMatch = taskText.match(/class\s*=\s*"([a-zA-Z0-9_-]+)"/);
    if (classMatch?.[1]) {
      return cssHasSelector(css, `.${classMatch[1]}`);
    }
  }

  if (task.includes("add") && task.includes("class")) {
    return /class\s*=\s*"[^"]+"/i.test(html || "") && /\.[a-z0-9_-]+\s*\{/i.test(css || "");
  }

  return false;
};

const saveTaskProgress = () => {
  window.localStorage.setItem(getTaskIndexKey(), String(assignmentTaskIndex));
  window.localStorage.setItem(getTaskDoneKey(), JSON.stringify(assignmentTaskDone));
};

const renderTaskTracker = () => {
  if (!assignmentTaskTrackerEl || !assignmentTaskProgressEl || !assignmentTaskCurrentEl || !assignmentTaskStateEl || !assignmentTaskNextBtn) return;

  if (!assignmentTaskList.length) {
    assignmentTaskTrackerEl.hidden = true;
    setAssignmentPanelOpen(false);
    return;
  }

  assignmentTaskTrackerEl.hidden = false;
  const completedCount = assignmentTaskDone.filter(Boolean).length;
  assignmentTaskProgressEl.textContent = `Task Progress: ${completedCount}/${assignmentTaskList.length}`;

  if (assignmentTaskIndex >= assignmentTaskList.length) {
    assignmentTaskCurrentEl.textContent = "All tasks complete. Great work.";
    assignmentTaskStateEl.textContent = "You can keep improving your design or ask your teacher for review.";
    assignmentTaskNextBtn.disabled = true;
    if (assignmentTaskCheckBtn) assignmentTaskCheckBtn.disabled = true;
    if (assignmentTaskDoneBtn) assignmentTaskDoneBtn.disabled = true;
    return;
  }

  assignmentTaskCurrentEl.textContent = `Current Task ${assignmentTaskIndex + 1}: ${assignmentTaskList[assignmentTaskIndex]}`;
  assignmentTaskStateEl.textContent = assignmentTaskDone[assignmentTaskIndex]
    ? "Task complete. Click Next Task."
    : "Check your code to unlock the next task.";
  assignmentTaskNextBtn.disabled = !assignmentTaskDone[assignmentTaskIndex];
  if (assignmentTaskCheckBtn) assignmentTaskCheckBtn.disabled = false;
  if (assignmentTaskDoneBtn) assignmentTaskDoneBtn.disabled = false;
};

const initTaskTracker = (workspace) => {
  const instructions = (workspace?.assignmentInstructions || "").trim();
  assignmentTaskList = parseTasksFromInstructions(instructions);

  const savedIndex = Number(window.localStorage.getItem(getTaskIndexKey()));
  assignmentTaskIndex = Number.isFinite(savedIndex) && savedIndex >= 0 ? savedIndex : 0;

  try {
    const savedDone = JSON.parse(window.localStorage.getItem(getTaskDoneKey()) || "[]");
    assignmentTaskDone = Array.isArray(savedDone) ? savedDone : [];
  } catch {
    assignmentTaskDone = [];
  }

  assignmentTaskDone = assignmentTaskList.map((_, index) => Boolean(assignmentTaskDone[index]));
  if (assignmentTaskIndex > assignmentTaskList.length) {
    assignmentTaskIndex = assignmentTaskList.length;
  }
  saveTaskProgress();
  renderTaskTracker();
};

const setFeedbackDrawerOpen = (open) => {
  if (!feedbackDrawerEl) return;
  feedbackDrawerEl.classList.toggle("is-open", open);
  feedbackDrawerEl.setAttribute("aria-hidden", open ? "false" : "true");
};

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

const renderFeedback = (feedback) => {
  if (!feedback) {
    if (feedbackStatusPillEl) feedbackStatusPillEl.textContent = "Status: Not Reviewed";
    if (feedbackGradePillEl) feedbackGradePillEl.textContent = "Grade: -";
    if (feedbackLatePillEl) feedbackLatePillEl.textContent = "Late: No";
    if (feedbackUpdatedEl) feedbackUpdatedEl.textContent = "Last updated: -";
    if (feedbackCommentsEl) feedbackCommentsEl.textContent = "No feedback from teacher yet for this project.";
    if (feedbackNextEl) feedbackNextEl.textContent = "Keep working and save your progress.";
    return;
  }

  if (feedbackStatusPillEl) feedbackStatusPillEl.textContent = `Status: ${formatStatus(feedback.status)}`;
  if (feedbackGradePillEl) feedbackGradePillEl.textContent = `Grade: ${feedback.grade || "-"}`;
  if (feedbackLatePillEl) feedbackLatePillEl.textContent = `Late: ${feedback.isLate ? "Yes" : "No"}`;
  if (feedbackUpdatedEl) feedbackUpdatedEl.textContent = `Last updated: ${formatTimestamp(feedback.updatedAt)}`;
  if (feedbackCommentsEl) feedbackCommentsEl.textContent = feedback.feedback || "No comments yet.";
  if (feedbackNextEl) feedbackNextEl.textContent = feedback.nextSteps || "No next steps listed.";
};

const loadStudentFeedback = async (uid, projectId) => {
  if (!uid || !projectId) {
    renderFeedback(null);
    return;
  }

  try {
    const feedback = await getProjectFeedback(projectId);
    renderFeedback(feedback);
  } catch (error) {
    console.error(error);
    renderFeedback(null);
  }
};

const setFullscreenButtonState = () => {
  if (!fullscreenBtn) return;
  const active = document.body.classList.contains("ide-focus-mode");
  fullscreenBtn.textContent = active ? "Exit IDE Only" : "IDE Only";
};

const toggleFullscreen = async () => {
  const next = !document.body.classList.contains("ide-focus-mode");
  document.body.classList.toggle("ide-focus-mode", next);
  window.localStorage.setItem(LOCAL_FOCUS_MODE_KEY, next ? "1" : "0");

  if (focusExitBtn) {
    focusExitBtn.hidden = !next;
  }

  try {
    if (next && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }

    if (!next && document.fullscreenElement) {
      await document.exitFullscreen();
    }
  } catch (error) {
    console.error("Fullscreen toggle failed", error);
  }

  if (editor && typeof editor.layout === "function") {
    window.requestAnimationFrame(() => editor.layout());
  }

  setFullscreenButtonState();
};

const mountFocusExitButton = () => {
  focusExitBtn = document.createElement("button");
  focusExitBtn.type = "button";
  focusExitBtn.id = "focus-exit-btn";
  focusExitBtn.className = "btn btn-secondary focus-exit-btn";
  focusExitBtn.textContent = "Exit IDE Only";
  focusExitBtn.hidden = true;
  focusExitBtn.addEventListener("click", toggleFullscreen);
  document.body.appendChild(focusExitBtn);
};

const applySavedFocusMode = () => {
  const enabled = window.localStorage.getItem(LOCAL_FOCUS_MODE_KEY) === "1";
  if (!enabled) {
    setFullscreenButtonState();
    return;
  }

  document.body.classList.add("ide-focus-mode");
  if (focusExitBtn) {
    focusExitBtn.hidden = false;
  }
  setFullscreenButtonState();
};

const applyPaneRatio = (ratio) => {
  if (!ideLayoutEl || Number.isNaN(ratio)) return;
  const clamped = Math.min(0.8, Math.max(0.2, ratio));
  ideLayoutEl.style.setProperty("--editor-pane", `${Math.round(clamped * 1000) / 10}%`);
  window.localStorage.setItem(LOCAL_PANE_RATIO_KEY, String(clamped));
};

const initResizablePane = () => {
  if (!ideLayoutEl || !paneDividerEl) return;
  const saved = Number(window.localStorage.getItem(LOCAL_PANE_RATIO_KEY));
  applyPaneRatio(Number.isFinite(saved) ? saved : 0.5);

  let dragging = false;

  const onPointerMove = (event) => {
    if (!dragging) return;
    const rect = ideLayoutEl.getBoundingClientRect();
    if (!rect.width) return;

    const px = event.clientX - rect.left;
    const ratio = px / rect.width;
    applyPaneRatio(ratio);
    if (editor && typeof editor.layout === "function") {
      editor.layout();
    }
  };

  const stopDragging = () => {
    dragging = false;
    document.body.classList.remove("pane-resizing");
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDragging);
  };

  paneDividerEl.addEventListener("pointerdown", (event) => {
    if (window.matchMedia("(max-width: 900px)").matches) return;
    dragging = true;
    document.body.classList.add("pane-resizing");
    paneDividerEl.setPointerCapture(event.pointerId);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
  });
};

const getRequestedProjectId = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("project");
};

const readLocal = () => ({
  html: window.localStorage.getItem(LOCAL_HTML_KEY) || starterCode.html,
  css: window.localStorage.getItem(LOCAL_CSS_KEY) || starterCode.css
});

const writeLocal = (html, css) => {
  window.localStorage.setItem(LOCAL_HTML_KEY, html);
  window.localStorage.setItem(LOCAL_CSS_KEY, css);
};

const getHtml = () => {
  if (usingMonaco) return modelHtml?.getValue() || "";
  return fallbackHtml?.value || "";
};

const getCss = () => {
  if (usingMonaco) return modelCss?.getValue() || "";
  return fallbackCss?.value || "";
};

const updatePreview = () => {
  if (!previewFrame) return;
  const html = getHtml();
  const css = getCss();
  const src = [
    "<!DOCTYPE html>",
    "<html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
    "<style>",
    css,
    "</style>",
    "</head><body>",
    html,
    "</body></html>"
  ].join("\n");

  previewFrame.srcdoc = src;
};

const setActiveTab = (tab) => {
  const htmlActive = tab === "html";
  if (usingMonaco && editor && modelHtml && modelCss) {
    editor.setModel(htmlActive ? modelHtml : modelCss);
  }

  if (!usingMonaco && fallbackHtml && fallbackCss) {
    fallbackHtml.style.display = htmlActive ? "block" : "none";
    fallbackCss.style.display = htmlActive ? "none" : "block";
  }

  tabHtmlBtn.classList.toggle("active", htmlActive);
  tabCssBtn.classList.toggle("active", !htmlActive);
};

const mountMonaco = (workspace) => {
  return new Promise((resolve) => {
    if (!window.require) {
      resolve(false);
      return;
    }

    // Monaco AMD loader is available from script include in ide.html
    window.require.config({
      paths: {
        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs"
      }
    });

    window.require(["vs/editor/editor.main"], () => {
      usingMonaco = true;
      modelHtml = window.monaco.editor.createModel(workspace.html || "", "html");
      modelCss = window.monaco.editor.createModel(workspace.css || "", "css");

      editor = window.monaco.editor.create(document.getElementById("editor"), {
        model: modelHtml,
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14
      });

      modelHtml.onDidChangeContent(updatePreview);
      modelCss.onDidChangeContent(updatePreview);
      updatePreview();
      resolve(true);
    }, () => resolve(false));
  });
};

const mountFallbackEditor = (workspace) => {
  const editorHost = document.getElementById("editor");
  if (!editorHost) return;

  editorHost.innerHTML = "";
  fallbackHtml = document.createElement("textarea");
  fallbackCss = document.createElement("textarea");

  [fallbackHtml, fallbackCss].forEach((ta) => {
    ta.style.width = "100%";
    ta.style.height = "500px";
    ta.style.resize = "none";
    ta.style.border = "0";
    ta.style.outline = "none";
    ta.style.padding = "14px";
    ta.style.fontFamily = "JetBrains Mono, Consolas, monospace";
    ta.style.fontSize = "14px";
    ta.style.background = "#0c1422";
    ta.style.color = "#e6edf7";
  });

  fallbackHtml.value = workspace.html || "";
  fallbackCss.value = workspace.css || "";
  fallbackCss.style.display = "none";

  fallbackHtml.addEventListener("input", updatePreview);
  fallbackCss.addEventListener("input", updatePreview);

  editorHost.appendChild(fallbackHtml);
  editorHost.appendChild(fallbackCss);
  usingMonaco = false;
  updatePreview();
};

const persistWorkspace = async () => {
  const html = getHtml();
  const css = getCss();
  writeLocal(html, css);

  try {
    if (currentUser) {
      setSaveState("Saving to cloud...");
      if (activeProjectId) {
        await saveProject(activeProjectId, html, css);
      } else {
        activeProjectId = await saveWorkspace(currentUser.uid, html, css);
      }
      setSaveState(`Saved locally + cloud at ${new Date().toLocaleTimeString()}`);
    } else {
      setSaveState(`Saved locally at ${new Date().toLocaleTimeString()}`);
    }
  } catch (error) {
    console.error(error);
    setSaveState("Saved locally. Cloud save failed.");
  }
};

const resetStarter = async () => {
  if (usingMonaco && modelHtml && modelCss) {
    modelHtml.setValue(starterCode.html);
    modelCss.setValue(starterCode.css);
  } else if (fallbackHtml && fallbackCss) {
    fallbackHtml.value = starterCode.html;
    fallbackCss.value = starterCode.css;
  }

  updatePreview();
  await persistWorkspace();
};

const boot = async () => {
  await ensureSignedInUser();
  currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = "/";
    return;
  }

  const requestedProjectId = getRequestedProjectId();

  let workspace = readLocal();
  try {
    let cloudWorkspace = null;
    if (requestedProjectId) {
      const found = await getProjectById(requestedProjectId);
      if (found && found.ownerId === currentUser.uid) {
        cloudWorkspace = found;
        activeProjectId = found.id;
      }
    }

    if (!cloudWorkspace) {
      const projects = await listUserProjects(currentUser.uid);
      if (projects.length) {
        cloudWorkspace = projects[0];
        activeProjectId = projects[0].id;
      } else {
        cloudWorkspace = await ensureWorkspace(currentUser.uid);
        activeProjectId = cloudWorkspace.id;
      }
    }

    workspace = {
      html: cloudWorkspace.html || workspace.html,
      css: cloudWorkspace.css || workspace.css
    };
    renderAssignmentBrief(cloudWorkspace);
    initTaskTracker(cloudWorkspace);
    writeLocal(workspace.html, workspace.css);
  } catch (error) {
    console.error(error);
    setSaveState("Cloud workspace unavailable. Using local workspace.");
    const fallbackAssignment = { title: "Current Project", assignmentInstructions: "" };
    renderAssignmentBrief(fallbackAssignment);
    initTaskTracker(fallbackAssignment);
  }

  const monacoReady = await mountMonaco(workspace);
  if (!monacoReady) {
    mountFallbackEditor(workspace);
    setSaveState("Fallback editor loaded. Monaco unavailable.");
  }

  await loadStudentFeedback(currentUser.uid, activeProjectId);

  tabHtmlBtn.addEventListener("click", () => setActiveTab("html"));
  tabCssBtn.addEventListener("click", () => setActiveTab("css"));
  setActiveTab("html");

  if (saveNowBtn) {
    saveNowBtn.addEventListener("click", persistWorkspace);
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", toggleFullscreen);
  }

  if (feedbackOpenBtn) {
    feedbackOpenBtn.addEventListener("click", () => setFeedbackDrawerOpen(true));
  }

  if (feedbackCloseBtn) {
    feedbackCloseBtn.addEventListener("click", () => setFeedbackDrawerOpen(false));
  }

  if (assignmentOpenBtn) {
    assignmentOpenBtn.addEventListener("click", () => {
      const isOpen = assignmentBriefEl?.classList.contains("is-open");
      setAssignmentPanelOpen(!isOpen);
    });
  }

  if (assignmentBriefCloseBtn) {
    assignmentBriefCloseBtn.addEventListener("click", () => setAssignmentPanelOpen(false));
  }

  if (assignmentBriefCopyBtn) {
    assignmentBriefCopyBtn.addEventListener("click", async () => {
      if (!assignmentBriefText) return;
      const ok = await copyText(assignmentBriefText);
      setSaveState(ok ? "Assignment instructions copied." : "Could not copy instructions.");
    });
  }

  if (assignmentTaskCheckBtn) {
    assignmentTaskCheckBtn.addEventListener("click", () => {
      if (!assignmentTaskList.length || assignmentTaskIndex >= assignmentTaskList.length) return;
      const passed = taskPasses(assignmentTaskList[assignmentTaskIndex], getHtml(), getCss());
      if (passed) {
        assignmentTaskDone[assignmentTaskIndex] = true;
        saveTaskProgress();
        renderTaskTracker();
        setSaveState("Task check passed.");
      } else {
        if (assignmentTaskStateEl) assignmentTaskStateEl.textContent = "Not complete yet. Check selector names and required CSS property.";
      }
    });
  }

  if (assignmentTaskDoneBtn) {
    assignmentTaskDoneBtn.addEventListener("click", () => {
      if (!assignmentTaskList.length || assignmentTaskIndex >= assignmentTaskList.length) return;
      assignmentTaskDone[assignmentTaskIndex] = true;
      saveTaskProgress();
      renderTaskTracker();
      setSaveState("Task marked as done.");
    });
  }

  if (assignmentTaskNextBtn) {
    assignmentTaskNextBtn.addEventListener("click", () => {
      if (!assignmentTaskList.length || assignmentTaskIndex >= assignmentTaskList.length) return;
      if (!assignmentTaskDone[assignmentTaskIndex]) {
        if (assignmentTaskStateEl) assignmentTaskStateEl.textContent = "Complete the current task first.";
        return;
      }
      assignmentTaskIndex += 1;
      saveTaskProgress();
      renderTaskTracker();
    });
  }

  mountFocusExitButton();
  applySavedFocusMode();
  setAssignmentPanelOpen(false);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && assignmentBriefEl?.classList.contains("is-open")) {
      setAssignmentPanelOpen(false);
      return;
    }

    if (event.key === "Escape" && feedbackDrawerEl?.classList.contains("is-open")) {
      setFeedbackDrawerOpen(false);
      return;
    }

    if (event.key === "Escape" && document.body.classList.contains("ide-focus-mode")) {
      toggleFullscreen();
    }
  });

  if (resetCodeBtn) {
    resetCodeBtn.addEventListener("click", resetStarter);
  }

  initResizablePane();

  autosaveTimer = window.setInterval(persistWorkspace, 15000);
  window.addEventListener("beforeunload", () => {
    if (autosaveTimer) window.clearInterval(autosaveTimer);
  });

  setSaveState("IDE ready. Autosave to local + cloud every 15 seconds.");
};

boot();
