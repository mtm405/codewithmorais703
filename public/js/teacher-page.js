import { ensureSignedInUser, getCurrentUser } from "./auth.js";
import {
  getProjectFeedback,
  getStudentProjects,
  getTeacherStudentRows,
  listStudentProjectFeedback,
  saveProjectFeedback
} from "./data-store.js";

const rowsEl = document.getElementById("student-rows");
const studentProjectsTitleEl = document.getElementById("student-projects-title");
const studentProjectsStateEl = document.getElementById("student-projects-state");
const studentProjectRowsEl = document.getElementById("student-project-rows");
const reviewTitleEl = document.getElementById("review-title");
const reviewStateEl = document.getElementById("review-state");
const studentHtmlEl = document.getElementById("student-html");
const studentCssEl = document.getElementById("student-css");
const studentPreviewEl = document.getElementById("student-preview");
const feedbackStatusEl = document.getElementById("feedback-status");
const feedbackGradeEl = document.getElementById("feedback-grade");
const feedbackLateEl = document.getElementById("feedback-late");
const feedbackTextEl = document.getElementById("feedback-text");
const feedbackNextStepsEl = document.getElementById("feedback-next-steps");
const generateFeedbackBtn = document.getElementById("generate-feedback");
const saveFeedbackBtn = document.getElementById("save-feedback");
const feedbackStateEl = document.getElementById("feedback-state");

let selectedStudentName = "Student";
let selectedStudentProjects = [];
let selectedStudentUid = null;
let selectedProjectId = null;
let currentTeacherUid = null;

const TEACHER_EMAIL = "marco.morais@imaginenorthport.com";
const VIEW_MODE_KEY = "cwm_teacher_view_mode";

const escapeHtml = (value) => String(value || "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

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

const setFeedbackState = (message) => {
  if (feedbackStateEl) feedbackStateEl.textContent = message;
};

const setFeedbackFormDisabled = (disabled) => {
  [feedbackStatusEl, feedbackGradeEl, feedbackLateEl, feedbackTextEl, feedbackNextStepsEl, generateFeedbackBtn, saveFeedbackBtn].forEach((el) => {
    if (!el) return;
    el.disabled = disabled;
  });
};

const countMatches = (source, regex) => {
  if (!source) return 0;
  return (source.match(regex) || []).length;
};

const toLetterGrade = (score) => {
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 63) return "D";
  if (score >= 60) return "D-";
  return "F";
};

const findTagMisspellings = (html) => {
  const fixes = [];
  const typoMap = {
    htlm: "html",
    had: "head",
    hed: "head",
    titel: "title",
    tilte: "title",
    boddy: "body",
    heder: "header",
    fotter: "footer",
    secton: "section",
    articel: "article",
    maitn: "main",
    divv: "div",
    paragraf: "p",
    buton: "button",
    inpt: "input"
  };

  const tags = html.match(/<\/?\s*([a-zA-Z][a-zA-Z0-9-]*)\b/g) || [];
  const seen = new Set();

  tags.forEach((raw) => {
    const match = raw.match(/<\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/);
    const name = (match?.[1] || "").toLowerCase();
    const corrected = typoMap[name];
    if (!corrected || seen.has(name)) return;
    seen.add(name);
    fixes.push(`Possible tag spelling issue: <${name}> should probably be <${corrected}>.`);
  });

  return fixes;
};

const findCssPropertyMisspellings = (css) => {
  const typoMap = {
    colr: "color",
    bakground: "background",
    backgroud: "background",
    "background-colr": "background-color",
    margn: "margin",
    paddng: "padding",
    widht: "width",
    heigth: "height",
    bordr: "border",
    "font-szie": "font-size",
    "font-famly": "font-family",
    disply: "display",
    "justify-conent": "justify-content",
    "align-itmes": "align-items"
  };

  const fixes = [];
  const seen = new Set();
  const matches = css.match(/([a-zA-Z-]+)\s*:/g) || [];
  matches.forEach((token) => {
    const prop = token.replace(":", "").trim().toLowerCase();
    const corrected = typoMap[prop];
    if (!corrected || seen.has(prop)) return;
    seen.add(prop);
    fixes.push(`Possible CSS spelling issue: ${prop}: should probably be ${corrected}:`);
  });

  return fixes;
};

const buildAIDraftFeedback = (project) => {
  const html = project?.html || "";
  const css = project?.css || "";

  const hasDoctype = /<!doctype html>/i.test(html);
  const hasHtmlTag = /<html\b/i.test(html);
  const hasHead = /<head\b/i.test(html);
  const hasBody = /<body\b/i.test(html);
  const hasTitle = /<title>[^<]+<\/title>/i.test(html);
  const hasMain = /<main\b/i.test(html);
  const headingCount = countMatches(html, /<h[1-6]\b/gi);
  const paragraphCount = countMatches(html, /<p\b/gi);
  const imagesWithoutAlt = countMatches(html, /<img\b(?![^>]*\balt\s*=)[^>]*>/gi);
  const linksWithoutHref = countMatches(html, /<a\b(?![^>]*\bhref\s*=)[^>]*>/gi);
  const htmlOpenBrackets = countMatches(html, /</g);
  const htmlCloseBrackets = countMatches(html, />/g);
  const bracketMismatch = htmlOpenBrackets !== htmlCloseBrackets;
  const unclosedCommonTags = ["html", "head", "body", "main", "title", "p", "h1", "h2", "h3", "section", "div", "button"]
    .filter((tag) => {
      const opens = countMatches(html, new RegExp(`<${tag}\\b`, "gi"));
      const closes = countMatches(html, new RegExp(`</${tag}>`, "gi"));
      return opens > closes;
    });

  const cssRuleCount = countMatches(css, /\{[^}]*\}/g);
  const hasSpacingRule = /(margin|padding)\s*:/i.test(css);
  const hasColorRule = /(color|background|background-color)\s*:/i.test(css);
  const hasTextRule = /(font-size|font-family|text-align)\s*:/i.test(css);
  const openBraces = countMatches(css, /\{/g);
  const closeBraces = countMatches(css, /\}/g);
  const cssBraceMismatch = openBraces !== closeBraces;
  const missingSemicolonCount = countMatches(css, /:[^;{}\n]+\n/g);

  const tagSpellingFixes = findTagMisspellings(html);
  const cssSpellingFixes = findCssPropertyMisspellings(css);

  let score = 100;
  const strengths = [];
  const fixes = [];

  if (hasDoctype && hasHtmlTag && hasHead && hasBody && hasMain) {
    strengths.push("Basic page structure is present (doctype/html/head/body/main).");
  }

  if (!hasDoctype) {
    score -= 8;
    fixes.push("Add <!DOCTYPE html> at the top of the file.");
  }
  if (!hasHtmlTag) {
    score -= 8;
    fixes.push("Wrap the document content in <html> tags.");
  }
  if (!hasHead) {
    score -= 8;
    fixes.push("Add a <head> section.");
  }
  if (!hasBody) {
    score -= 8;
    fixes.push("Add a <body> section for visible page content.");
  }
  if (!hasMain) {
    score -= 6;
    fixes.push("Add a <main> tag to organize the page content.");
  }

  if (hasTitle) {
    strengths.push("Page includes a title element.");
  } else {
    score -= 6;
    fixes.push("Add a descriptive <title> in the head section.");
  }

  if (headingCount > 0) {
    strengths.push("Page includes heading tags.");
  } else {
    score -= 8;
    fixes.push("Add at least one heading tag like <h1>.");
  }

  if (paragraphCount > 0) {
    strengths.push("Page includes paragraph content.");
  } else {
    score -= 5;
    fixes.push("Add paragraph text using <p> tags.");
  }

  if (imagesWithoutAlt > 0) {
    score -= Math.min(15, imagesWithoutAlt * 4);
    fixes.push(`Add alt text for ${imagesWithoutAlt} image${imagesWithoutAlt === 1 ? "" : "s"}.`);
  } else if (/<img\b/i.test(html)) {
    strengths.push("Images include alt text for accessibility.");
  }

  if (linksWithoutHref > 0) {
    score -= Math.min(10, linksWithoutHref * 3);
    fixes.push(`Add href values for ${linksWithoutHref} link${linksWithoutHref === 1 ? "" : "s"}.`);
  }

  if (bracketMismatch) {
    score -= 10;
    fixes.push("HTML may have missing < or > characters.");
  }

  if (unclosedCommonTags.length) {
    score -= Math.min(16, unclosedCommonTags.length * 4);
    fixes.push(`Close missing tags: ${unclosedCommonTags.map((tag) => `</${tag}>`).join(", ")}.`);
  }

  if (cssRuleCount > 0) {
    strengths.push(`CSS includes ${cssRuleCount} style rule${cssRuleCount === 1 ? "" : "s"}.`);
  } else {
    score -= 20;
    fixes.push("Add CSS rules to style the page.");
  }

  if (hasSpacingRule) {
    strengths.push("Spacing styles (margin/padding) are present.");
  } else {
    score -= 6;
    fixes.push("Use margin or padding for better spacing.");
  }

  if (!hasColorRule) {
    score -= 5;
    fixes.push("Add color or background-color styling.");
  }

  if (!hasTextRule) {
    score -= 4;
    fixes.push("Add basic text styling such as font-size, font-family, or text-align.");
  }

  if (cssBraceMismatch) {
    score -= 12;
    fixes.push("Fix unmatched CSS braces to avoid broken styles.");
  }

  if (missingSemicolonCount > 0) {
    score -= Math.min(8, missingSemicolonCount * 2);
    fixes.push("Some CSS lines may be missing semicolons.");
  }

  if (tagSpellingFixes.length) {
    score -= Math.min(12, tagSpellingFixes.length * 3);
    fixes.push(...tagSpellingFixes);
  }

  if (cssSpellingFixes.length) {
    score -= Math.min(12, cssSpellingFixes.length * 3);
    fixes.push(...cssSpellingFixes);
  }

  score = Math.max(0, Math.min(100, score));
  const letter = toLetterGrade(score);
  const status = score >= 90 ? "complete" : (score >= 72 ? "resubmit" : "needs-fixes");

  const feedbackText = [
    `AI Draft Basics Review for ${project?.title || "Untitled Project"}`,
    "",
    "What is working:",
    ...(strengths.length ? strengths.map((item, index) => `${index + 1}. ${item}`) : ["1. Keep iterating on structure and styling."]),
    "",
    "Bugs, missing parts, or spelling fixes:",
    ...(fixes.length ? fixes.map((item, index) => `${index + 1}. ${item}`) : ["1. No major issues found in this draft."])
  ].join("\n");

  const nextSteps = [
    "1. Fix missing tags and spelling issues first.",
    "2. Re-run the page preview and check if styles are applied correctly.",
    "3. Save and resubmit for teacher approval."
  ].join("\n");

  return {
    status,
    grade: `${score} (${letter})`,
    feedback: feedbackText,
    nextSteps
  };
};

const generateAIDraft = () => {
  if (!selectedProjectId) {
    setFeedbackState("Select a project before generating AI draft feedback.");
    return;
  }

  const project = selectedStudentProjects.find((item) => item.id === selectedProjectId);
  if (!project) {
    setFeedbackState("Project not found for AI draft.");
    return;
  }

  const draft = buildAIDraftFeedback(project);
  if (feedbackStatusEl) feedbackStatusEl.value = draft.status;
  if (feedbackGradeEl) feedbackGradeEl.value = draft.grade;
  if (feedbackTextEl) feedbackTextEl.value = draft.feedback;
  if (feedbackNextStepsEl) feedbackNextStepsEl.value = draft.nextSteps;
  setFeedbackState("AI draft generated. Review and edit before clicking Save Feedback.");
};

const clearFeedbackForm = () => {
  if (feedbackStatusEl) feedbackStatusEl.value = "needs-fixes";
  if (feedbackGradeEl) feedbackGradeEl.value = "";
  if (feedbackLateEl) feedbackLateEl.checked = false;
  if (feedbackTextEl) feedbackTextEl.value = "";
  if (feedbackNextStepsEl) feedbackNextStepsEl.value = "";
};

const renderProjectsMessage = (message) => {
  if (!studentProjectRowsEl) return;
  studentProjectRowsEl.innerHTML = `<tr><td colspan=\"6\" class=\"muted\">${escapeHtml(message)}</td></tr>`;
};

const renderMessage = (message) => {
  if (!rowsEl) return;
  rowsEl.innerHTML = `<tr><td colspan=\"7\" class=\"muted\">${escapeHtml(message)}</td></tr>`;
};

const renderRows = (rows) => {
  if (!rowsEl) return;
  if (!rows.length) {
    renderMessage("No student records yet.");
    return;
  }

  rowsEl.innerHTML = rows
    .map((row) => [
      "<tr>",
      `<td>${escapeHtml(row.displayName)}</td>`,
      `<td>${escapeHtml(row.email)}</td>`,
      `<td>${escapeHtml(row.role)}</td>`,
      `<td>${escapeHtml(row.projectCount || 0)}</td>`,
      `<td>${escapeHtml(row.objectives)}</td>`,
      `<td>${formatTimestamp(row.lastActive)}</td>`,
      `<td><button class=\"btn btn-secondary open-student-btn\" data-uid=\"${escapeHtml(row.uid)}\" data-name=\"${escapeHtml(row.displayName)}\">Open</button></td>`,
      "</tr>"
    ].join(""))
    .join("");
};

const renderStudentProjects = (projects, studentName, feedbackMap) => {
  if (studentProjectsTitleEl) {
    studentProjectsTitleEl.textContent = `${studentName}'s Saved Projects`;
  }

  if (!studentProjectRowsEl) return;
  if (!projects.length) {
    renderProjectsMessage("This student has no saved projects yet.");
    return;
  }

  studentProjectRowsEl.innerHTML = projects.map((project) => [
    "<tr>",
    `<td>${escapeHtml(project.title || "Untitled Project")}</td>`,
    `<td>${escapeHtml(project.saveCount || 0)}</td>`,
    `<td>${formatTimestamp(project.updatedAt)}</td>`,
    `<td>${escapeHtml(formatStatus(feedbackMap.get(project.id)?.status))}</td>`,
    `<td>${escapeHtml(feedbackMap.get(project.id)?.grade || "-")}</td>`,
    `<td><button class=\"btn btn-secondary review-project-btn\" data-project-id=\"${escapeHtml(project.id)}\" data-project-title=\"${escapeHtml(project.title || "Untitled Project")}\" data-student-name=\"${escapeHtml(studentName)}\">Review</button></td>`,
    "</tr>"
  ].join("")).join("");
};

const renderStudentPreview = (html, css) => {
  if (!studentPreviewEl) return;
  const src = [
    "<!DOCTYPE html>",
    "<html><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
    "<style>",
    css || "",
    "</style>",
    "</head><body>",
    html || "",
    "</body></html>"
  ].join("\n");
  studentPreviewEl.srcdoc = src;
};

const loadFeedbackForProject = async (projectId, studentUid) => {
  selectedProjectId = projectId;
  selectedStudentUid = studentUid;
  setFeedbackFormDisabled(false);
  setFeedbackState("Loading saved feedback...");

  try {
    const feedback = await getProjectFeedback(projectId);
    if (!feedback) {
      clearFeedbackForm();
      setFeedbackState("No feedback saved yet for this project.");
      return;
    }

    if (feedbackStatusEl) feedbackStatusEl.value = feedback.status || "needs-fixes";
    if (feedbackGradeEl) feedbackGradeEl.value = feedback.grade || "";
    if (feedbackLateEl) feedbackLateEl.checked = Boolean(feedback.isLate);
    if (feedbackTextEl) feedbackTextEl.value = feedback.feedback || "";
    if (feedbackNextStepsEl) feedbackNextStepsEl.value = feedback.nextSteps || "";
    setFeedbackState(`Feedback last updated: ${formatTimestamp(feedback.updatedAt)}`);
  } catch (error) {
    console.error(error);
    setFeedbackState("Could not load feedback.");
  }
};

const loadStudentProjects = async (uid, name) => {
  selectedStudentName = name || "Student";
  selectedStudentUid = uid;
  selectedProjectId = null;
  selectedStudentProjects = [];
  clearFeedbackForm();
  setFeedbackFormDisabled(true);
  setFeedbackState("Select a project to start grading.");

  if (studentProjectsStateEl) {
    studentProjectsStateEl.textContent = "Loading student projects...";
  }
  renderProjectsMessage("Loading...");

  try {
    const [projects, feedbackRows] = await Promise.all([
      getStudentProjects(uid),
      listStudentProjectFeedback(uid)
    ]);

    const feedbackMap = new Map(feedbackRows.map((row) => [row.projectId, row]));
    selectedStudentProjects = projects;
    renderStudentProjects(projects, name, feedbackMap);

    if (studentProjectsStateEl) {
      studentProjectsStateEl.textContent = `${projects.length} project${projects.length === 1 ? "" : "s"} found.`;
    }

    if (!projects.length) {
      if (studentHtmlEl) studentHtmlEl.textContent = "No project selected.";
      if (studentCssEl) studentCssEl.textContent = "No project selected.";
      renderStudentPreview("<p>No saved projects yet.</p>", "");
      if (reviewStateEl) reviewStateEl.textContent = "No project available to review.";
      setFeedbackState("No project selected.");
      return;
    }

    const firstProject = projects[0];
    await loadProjectReview(firstProject, selectedStudentName);
  } catch (error) {
    console.error(error);
    renderProjectsMessage("Failed to load student projects.");
    if (studentProjectsStateEl) {
      studentProjectsStateEl.textContent = "Could not load projects.";
    }
  }
};

const loadProjectReview = async (project, studentName) => {
  const projectTitle = project.title || "Untitled Project";
  if (reviewTitleEl) {
    reviewTitleEl.textContent = `Reviewing ${studentName}: ${projectTitle}`;
  }
  if (studentHtmlEl) studentHtmlEl.textContent = project.html || "";
  if (studentCssEl) studentCssEl.textContent = project.css || "";
  renderStudentPreview(project.html || "", project.css || "");
  if (reviewStateEl) {
    reviewStateEl.textContent = "Loaded selected project files.";
  }

  await loadFeedbackForProject(project.id, project.ownerId || selectedStudentUid);
};

const saveSelectedProjectFeedback = async () => {
  if (!selectedProjectId || !selectedStudentUid || !currentTeacherUid) {
    setFeedbackState("Select a project before saving feedback.");
    return;
  }

  const payload = {
    projectId: selectedProjectId,
    studentUid: selectedStudentUid,
    teacherUid: currentTeacherUid,
    status: feedbackStatusEl?.value || "needs-fixes",
    grade: (feedbackGradeEl?.value || "").trim(),
    isLate: Boolean(feedbackLateEl?.checked),
    feedback: (feedbackTextEl?.value || "").trim(),
    nextSteps: (feedbackNextStepsEl?.value || "").trim()
  };

  try {
    setFeedbackState("Saving feedback...");
    if (saveFeedbackBtn) saveFeedbackBtn.disabled = true;
    await saveProjectFeedback(payload);
    setFeedbackState(`Feedback saved at ${new Date().toLocaleTimeString()}.`);
  } catch (error) {
    console.error(error);
    setFeedbackState("Could not save feedback.");
  } finally {
    if (saveFeedbackBtn) saveFeedbackBtn.disabled = false;
  }
};

const boot = async () => {
  await ensureSignedInUser();
  const user = getCurrentUser();
  if (!user) {
    renderMessage("Sign in first. Teacher view requires authentication.");
    return;
  }

  if ((user.email || "").toLowerCase() !== TEACHER_EMAIL) {
    renderMessage("Access denied. Teacher page is restricted to marco.morais@imaginenorthport.com.");
    return;
  }

  const viewMode = window.localStorage.getItem(VIEW_MODE_KEY) || "admin";
  if (viewMode !== "admin") {
    renderMessage("You are in Student View. Switch to Admin View to access Teacher tools.");
    return;
  }

  currentTeacherUid = user.uid;
  setFeedbackFormDisabled(true);
  clearFeedbackForm();

  const rows = await getTeacherStudentRows();
  renderRows(rows);

  if (rowsEl) {
    rowsEl.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains("open-student-btn")) return;

      const uid = target.dataset.uid;
      const name = target.dataset.name || "Student";
      if (!uid) return;
      await loadStudentProjects(uid, name);
    });
  }

  if (studentProjectRowsEl) {
    studentProjectRowsEl.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains("review-project-btn")) return;

      const projectId = target.dataset.projectId;
      const studentName = target.dataset.studentName || "Student";
      if (!projectId) return;

      const project = selectedStudentProjects.find((item) => item.id === projectId);
      if (!project) {
        if (reviewStateEl) reviewStateEl.textContent = "Project not found.";
        return;
      }

      const resolvedStudentName = studentName || selectedStudentName;
      await loadProjectReview(project, resolvedStudentName);
    });
  }

  if (saveFeedbackBtn) {
    saveFeedbackBtn.addEventListener("click", saveSelectedProjectFeedback);
  }

  if (generateFeedbackBtn) {
    generateFeedbackBtn.addEventListener("click", generateAIDraft);
  }
};

boot();
