import { ensureSignedInUser, getCurrentUser } from "./auth.js";
import {
  createAssignmentForAllStudents,
  deletePracticeLibraryItem,
  listPracticeLibrary,
  savePracticeLibraryItem
} from "./data-store.js";

const TEACHER_EMAIL = "marco.morais@imaginenorthport.com";
const VIEW_MODE_KEY = "cwm_teacher_view_mode";
const ASSIGNMENT_PREFILL_KEY = "cwm_assignment_prefill";

const stateEl = document.getElementById("practice-state");
const listEl = document.getElementById("practice-list");
const detailEl = document.getElementById("practice-detail");
const searchEl = document.getElementById("practice-search");
const resetBtn = document.getElementById("reset-practice-bank");
const seedBtn = document.getElementById("seed-practice-bank");
const refreshBtn = document.getElementById("refresh-practice-bank");
const saveBtn = document.getElementById("save-practice");

const idEl = document.getElementById("practice-id");
const titleEl = document.getElementById("practice-title");
const topicEl = document.getElementById("practice-topic");
const sequenceEl = document.getElementById("practice-sequence");
const studentPromptEl = document.getElementById("practice-student-prompt");
const guideTextEl = document.getElementById("practice-guide-text");
const starterHtmlEl = document.getElementById("practice-starter-html");
const starterCssEl = document.getElementById("practice-starter-css");
const teacherKeyEl = document.getElementById("practice-teacher-key");

let currentUser = null;
let practices = [];
let selectedPracticeId = "";

const defaultStarterHtml = [
  "<!DOCTYPE html>",
  "<html lang=\"en\">",
  "<head>",
  "  <title>CSS Basics Practice</title>",
  "</head>",
  "<body>",
  "  <h1>Practice Title</h1>",
  "  <p>Practice paragraph.</p>",
  "</body>",
  "</html>"
].join("\n");

const defaultStarterCss = [
  "body {",
  "  font-family: Verdana, sans-serif;",
  "  margin: 20px;",
  "}",
  "",
  "h1 {",
  "  color: #0f172a;",
  "}"
].join("\n");

const beginnerPracticePack = [
  {
    id: "css-master-playground-class-project",
    sequence: 1,
    title: "Master CSS Playground (One Project for Whole Class)",
    topic: "HTML + CSS Fundamentals",
    level: "beginner",
    studentPrompt: [
      "Goal: Use one page to practice many CSS basics.",
      "",
      "Directions:",
      "- Work in this same project for all tasks.",
      "- Do not delete HTML sections.",
      "- Keep your CSS organized by section comments.",
      "",
      "Tasks:",
      "1. Change the page background color on body.",
      "2. Change h1 color.",
      "3. Change h1 font-size.",
      "4. Change body font-family.",
      "5. Add padding to .hero-card.",
      "6. Add margin-bottom to .hero-card.",
      "7. Change link color in .quick-links a.",
      "8. Remove underline from .quick-links a.",
      "9. Style button background color and text color.",
      "10. Add button:hover effect.",
      "11. Change table header color in .grade-table th.",
      "12. Change table border color in .grade-table, th, td.",
      "13. Add border-radius to .notice-box.",
      "14. Add a class called highlight to exactly one paragraph.",
      "15. Style .highlight with new color and font-size.",
      "16. Make .card-row a flex row.",
      "17. Add gap to .card-row.",
      "18. Add justify-content to .card-row.",
      "19. Add align-items to .card-row.",
      "20. Keep all text readable and save your work."
    ].join("\n"),
    guideText: [
      "Teacher Guide:",
      "- This is one reusable class project for everyone.",
      "- Students should complete tasks in order on the same file.",
      "- Fast checks: selectors match, semicolons, braces, readable colors.",
      "",
      "Suggested grading:",
      "4 = 16-20 tasks complete, clean syntax",
      "3 = 11-15 tasks complete, minor errors",
      "2 = 6-10 tasks complete, several errors",
      "1 = 0-5 tasks complete or major syntax issues"
    ].join("\n"),
    starterHtml: [
      "<!DOCTYPE html>",
      "<html lang=\"en\">",
      "<head>",
      "  <title>Master CSS Playground</title>",
      "</head>",
      "<body>",
      "  <header class=\"hero-card\">",
      "    <h1>HTML and CSS Playground</h1>",
      "    <p class=\"intro\">Use this one page to practice many CSS skills.</p>",
      "    <nav class=\"quick-links\">",
      "      <a href=\"#text\">Text</a>",
      "      <a href=\"#table\">Table</a>",
      "      <a href=\"#form\">Form</a>",
      "      <a href=\"#cards\">Cards</a>",
      "    </nav>",
      "    <button class=\"action-btn\">Click Me</button>",
      "  </header>",
      "",
      "  <main>",
      "    <section id=\"text\" class=\"panel\">",
      "      <h2>Text Tags</h2>",
      "      <p>This paragraph is normal text for comparison.</p>",
      "      <p>This paragraph will be your special paragraph target.</p>",
      "      <p>Use <strong>strong</strong>, <em>emphasis</em>, and <mark>mark</mark> tags too.</p>",
      "      <blockquote>Learning CSS is like decorating a room after building it.</blockquote>",
      "      <code>color: #1f2937;</code>",
      "    </section>",
      "",
      "    <section id=\"table\" class=\"panel\">",
      "      <h2>Table Tags</h2>",
      "      <table class=\"grade-table\">",
      "        <thead>",
      "          <tr>",
      "            <th>Student</th>",
      "            <th>Task</th>",
      "            <th>Status</th>",
      "          </tr>",
      "        </thead>",
      "        <tbody>",
      "          <tr>",
      "            <td>Alex</td>",
      "            <td>Font</td>",
      "            <td>Done</td>",
      "          </tr>",
      "          <tr>",
      "            <td>Riley</td>",
      "            <td>Color</td>",
      "            <td>In Progress</td>",
      "          </tr>",
      "        </tbody>",
      "      </table>",
      "    </section>",
      "",
      "    <section id=\"form\" class=\"panel notice-box\">",
      "      <h2>Form Tags</h2>",
      "      <label for=\"student-name\">Name</label>",
      "      <input id=\"student-name\" type=\"text\" placeholder=\"Type your name\">",
      "      <label for=\"student-note\">Short Note</label>",
      "      <textarea id=\"student-note\" rows=\"3\" placeholder=\"Write one sentence\"></textarea>",
      "    </section>",
      "",
      "    <section id=\"cards\" class=\"panel\">",
      "      <h2>Layout Tags</h2>",
      "      <div class=\"card-row\">",
      "        <article class=\"mini-card\">Card One</article>",
      "        <article class=\"mini-card\">Card Two</article>",
      "        <article class=\"mini-card\">Card Three</article>",
      "      </div>",
      "      <ul>",
      "        <li>List item one</li>",
      "        <li>List item two</li>",
      "      </ul>",
      "      <ol>",
      "        <li>Ordered item one</li>",
      "        <li>Ordered item two</li>",
      "      </ol>",
      "    </section>",
      "  </main>",
      "",
      "  <footer class=\"panel\">",
      "    <small>Practice page footer with basic semantic tag.</small>",
      "  </footer>",
      "</body>",
      "</html>"
    ].join("\n"),
    starterCss: [
      "/* Base styles */",
      "body {",
      "  margin: 20px;",
      "  font-family: Verdana, sans-serif;",
      "  background-color: #f4f7fb;",
      "  color: #1f2937;",
      "}",
      "",
      "h1 {",
      "  font-size: 36px;",
      "  color: #0f172a;",
      "}",
      "",
      "/* Header card */",
      ".hero-card {",
      "  border: 2px solid #1f3a5f;",
      "  padding: 16px;",
      "  margin-bottom: 16px;",
      "  background-color: #ffffff;",
      "}",
      "",
      ".intro {",
      "  font-size: 18px;",
      "}",
      "",
      "/* Links */",
      ".quick-links a {",
      "  color: #1d4ed8;",
      "  text-decoration: none;",
      "  margin-right: 12px;",
      "}",
      "",
      "/* Buttons */",
      ".action-btn {",
      "  margin-top: 10px;",
      "  border: 0;",
      "  padding: 10px 14px;",
      "  background-color: #2563eb;",
      "  color: #ffffff;",
      "}",
      "",
      ".action-btn:hover {",
      "  opacity: 0.9;",
      "}",
      "",
      "/* Shared panel */",
      ".panel {",
      "  border: 1px solid #94a3b8;",
      "  padding: 12px;",
      "  margin-bottom: 14px;",
      "  background-color: #ffffff;",
      "}",
      "",
      "/* Table */",
      ".grade-table {",
      "  width: 100%;",
      "  border-collapse: collapse;",
      "}",
      "",
      ".grade-table,",
      ".grade-table th,",
      ".grade-table td {",
      "  border: 1px solid #94a3b8;",
      "}",
      "",
      ".grade-table th,",
      ".grade-table td {",
      "  padding: 8px;",
      "}",
      "",
      ".grade-table th {",
      "  background-color: #e2e8f0;",
      "}",
      "",
      "/* Form */",
      "input,",
      "textarea {",
      "  width: 100%;",
      "  padding: 8px;",
      "  margin-top: 4px;",
      "  margin-bottom: 10px;",
      "  border: 1px solid #94a3b8;",
      "}",
      "",
      ".notice-box {",
      "  border-radius: 8px;",
      "}",
      "",
      "/* Layout row */",
      ".card-row {",
      "  display: flex;",
      "  gap: 10px;",
      "  justify-content: flex-start;",
      "  align-items: center;",
      "}",
      "",
      ".mini-card {",
      "  border: 1px solid #94a3b8;",
      "  border-radius: 6px;",
      "  padding: 10px;",
      "  background-color: #f8fafc;",
      "}",
      "",
      "/* Student will add: .highlight */"
    ].join("\n"),
    teacherKey: [
      "Expected basics:",
      "- Student modifies color, font-size, font-family, padding.",
      "- Student styles table header and table border colors.",
      "- Student applies .highlight to one paragraph only.",
      "- Student adds hover, border-radius, and flex layout properties.",
      "- No major syntax issues (missing ; or })."
    ].join("\n")
  }
];

const setState = (text) => {
  if (stateEl) stateEl.textContent = text;
};

const sanitizeStarterHtml = (html) => {
  const lines = (html || "").split("\n");
  const cleaned = lines.filter((line) => {
    const normalized = line.trim().toLowerCase();
    if (normalized === "<meta charset=\"utf-8\">") return false;
    if (normalized === "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">") return false;
    if (normalized === "<link rel=\"stylesheet\" href=\"styles.css\">") return false;
    if (normalized === "<link rel=\"stylesheet\" href=\"style.css\">") return false;
    return true;
  });
  return cleaned.join("\n");
};

const sanitizePractice = (practice) => ({
  ...practice,
  starterHtml: sanitizeStarterHtml(practice?.starterHtml || "")
});

const isTeacher = (user) => (user?.email || "").toLowerCase() === TEACHER_EMAIL;

const getViewMode = () => window.localStorage.getItem(VIEW_MODE_KEY) || "admin";

const escapeHtml = (value) => (value || "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const nlToBr = (value) => escapeHtml(value).replaceAll("\n", "<br>");

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
};

const formatPracticeForCopyPaste = (practice) => [
  `ASSIGNMENT TITLE: ${practice.title || "Untitled Practice"}`,
  "",
  "STUDENT PROMPT:",
  practice.studentPrompt || "",
  "",
  "STARTER index.html:",
  practice.starterHtml || "",
  "",
  "STARTER styles.css:",
  practice.starterCss || "",
  "",
  "TEACHER KEY:",
  practice.teacherKey || ""
].join("\n");

const printGuide = (practice, includeKey = false) => {
  const guideWindow = window.open("", "_blank", "noopener,noreferrer,width=940,height=1080");
  if (!guideWindow) {
    setState("Pop-up blocked. Allow pop-ups to print the guide.");
    return;
  }

  const content = [
    "<!DOCTYPE html>",
    "<html>",
    "<head>",
    "  <meta charset=\"UTF-8\">",
    `  <title>${escapeHtml(practice.title || "Practice Guide")}</title>`,
    "  <style>",
    "    body { font-family: Georgia, 'Times New Roman', serif; color: #000; background: #fff; margin: 0; }",
    "    main { max-width: 780px; margin: 0 auto; padding: 24px; }",
    "    h1, h2 { margin: 0 0 10px; }",
    "    h1 { font-size: 28px; }",
    "    h2 { margin-top: 20px; font-size: 20px; border-bottom: 1px solid #000; padding-bottom: 4px; }",
    "    p { line-height: 1.5; margin: 0 0 10px; }",
    "    .block { border: 1px solid #000; padding: 10px; margin-bottom: 14px; white-space: pre-wrap; }",
    "    .small { font-size: 13px; }",
    "    @media print { .no-print { display: none; } main { padding: 0; } }",
    "  </style>",
    "</head>",
    "<body>",
    "  <main>",
    `    <h1>${escapeHtml(practice.title || "Practice Guide")}</h1>`,
    `    <p><strong>Topic:</strong> ${escapeHtml(practice.topic || "CSS Basics")}</p>`,
    "    <h2>Student Assignment</h2>",
    `    <div class=\"block\">${nlToBr(practice.studentPrompt || "")}</div>`,
    "    <h2>Detailed Guide</h2>",
    `    <div class=\"block\">${nlToBr(practice.guideText || "")}</div>`,
    "    <h2>Starter Code</h2>",
    "    <p><strong>index.html</strong></p>",
    `    <div class=\"block small\">${nlToBr(practice.starterHtml || "")}</div>`,
    "    <p><strong>styles.css</strong></p>",
    `    <div class=\"block small\">${nlToBr(practice.starterCss || "")}</div>`
  ];

  if (includeKey) {
    content.push(
      "    <h2>Teacher Key</h2>",
      `    <div class=\"block\">${nlToBr(practice.teacherKey || "")}</div>`
    );
  }

  content.push(
    "    <p class=\"no-print\"><button onclick=\"window.print()\">Print / Save as PDF</button></p>",
    "  </main>",
    "</body>",
    "</html>"
  );

  guideWindow.document.open();
  guideWindow.document.write(content.join("\n"));
  guideWindow.document.close();
  guideWindow.focus();
};

const getFilteredPractices = () => {
  const query = (searchEl?.value || "").trim().toLowerCase();
  if (!query) return practices;

  return practices.filter((practice) => {
    const blob = [
      practice.title,
      practice.topic,
      practice.studentPrompt,
      practice.guideText,
      practice.teacherKey
    ].join(" ").toLowerCase();
    return blob.includes(query);
  });
};

const migrateExistingPractices = async (rows) => {
  if (!currentUser || !rows.length) return rows;

  const updates = [];
  const sanitizedRows = rows.map((practice) => {
    const cleaned = sanitizePractice(practice);
    if ((practice.starterHtml || "") !== (cleaned.starterHtml || "")) {
      updates.push(cleaned);
    }
    return cleaned;
  });

  if (!updates.length) return sanitizedRows;

  for (const item of updates) {
    await savePracticeLibraryItem({
      id: item.id,
      teacherUid: currentUser.uid,
      title: item.title,
      topic: item.topic,
      level: item.level,
      studentPrompt: item.studentPrompt,
      guideText: item.guideText,
      starterHtml: item.starterHtml,
      starterCss: item.starterCss,
      teacherKey: item.teacherKey,
      sequence: item.sequence
    });
  }

  setState(`Cleaned ${updates.length} saved activit${updates.length === 1 ? "y" : "ies"}.`);
  return sanitizedRows;
};

const renderPracticeDetail = () => {
  if (!detailEl) return;

  const selected = practices.find((item) => item.id === selectedPracticeId);
  if (!selected) {
    detailEl.innerHTML = [
      "<h3>No activity selected</h3>",
      "<p class=\"muted\">Pick one activity from the left to view tools.</p>"
    ].join("");
    return;
  }

  detailEl.innerHTML = [
    `<p class=\"eyebrow\">${escapeHtml(selected.topic || "CSS Basics")}</p>`,
    `<h3>${escapeHtml(selected.title || "Untitled Practice")}</h3>`,
    `<p class=\"muted\"><strong>Level:</strong> ${escapeHtml(selected.level || "beginner")}</p>`,
    "<div class=\"actions\">",
    "  <button class=\"btn btn-primary\" data-action=\"publish\" type=\"button\">Publish to All Students Now</button>",
    "  <button class=\"btn btn-primary\" data-action=\"use\" type=\"button\">Send to Assignments Page</button>",
    "  <button class=\"btn btn-secondary\" data-action=\"copy\" type=\"button\">Copy Full Assignment Pack</button>",
    "  <button class=\"btn btn-secondary\" data-action=\"print\" type=\"button\">Print B/W Guide</button>",
    "  <button class=\"btn btn-secondary\" data-action=\"print-key\" type=\"button\">Print B/W + Key</button>",
    "  <button class=\"btn btn-secondary\" data-action=\"edit\" type=\"button\">Load into Advanced Editor</button>",
    "  <button class=\"btn btn-secondary\" data-action=\"delete\" type=\"button\">Delete Activity</button>",
    "</div>",
    "<div class=\"practice-panels stack\">",
    "  <section class=\"practice-panel stack\">",
    "    <div class=\"practice-panel-head\">",
    "      <h4>Student Instructions</h4>",
    "      <button class=\"btn btn-secondary\" data-action=\"copy-student\" type=\"button\">Copy</button>",
    "    </div>",
    `    <div class=\"code-block practice-code\">${escapeHtml(selected.studentPrompt || "")}</div>`,
    "  </section>",
    "  <section class=\"practice-panel stack\">",
    "    <div class=\"practice-panel-head\">",
    "      <h4>Starter index.html</h4>",
    "      <button class=\"btn btn-secondary\" data-action=\"copy-html\" type=\"button\">Copy</button>",
    "    </div>",
    `    <div class=\"code-block practice-code\">${escapeHtml(selected.starterHtml || "")}</div>`,
    "  </section>",
    "  <section class=\"practice-panel stack\">",
    "    <div class=\"practice-panel-head\">",
    "      <h4>Starter styles.css</h4>",
    "      <button class=\"btn btn-secondary\" data-action=\"copy-css\" type=\"button\">Copy</button>",
    "    </div>",
    `    <div class=\"code-block practice-code\">${escapeHtml(selected.starterCss || "")}</div>`,
    "  </section>",
    "  <section class=\"practice-panel stack\">",
    "    <div class=\"practice-panel-head\">",
    "      <h4>Detailed Teacher Guide</h4>",
    "      <button class=\"btn btn-secondary\" data-action=\"copy-guide\" type=\"button\">Copy</button>",
    "    </div>",
    `    <div class=\"code-block practice-code\">${escapeHtml(selected.guideText || "")}</div>`,
    "  </section>",
    "  <section class=\"practice-panel stack\">",
    "    <div class=\"practice-panel-head\">",
    "      <h4>Teacher Key</h4>",
    "      <button class=\"btn btn-secondary\" data-action=\"copy-key\" type=\"button\">Copy</button>",
    "    </div>",
    `    <div class=\"code-block practice-code\">${escapeHtml(selected.teacherKey || "No key added yet.")}</div>`,
    "  </section>",
    "</div>"
  ].join("\n");
};

const renderPracticeList = () => {
  if (!listEl) return;

  const filtered = getFilteredPractices();
  if (!filtered.length) {
    listEl.innerHTML = "<p class=\"muted\">No activities match your search.</p>";
    selectedPracticeId = "";
    renderPracticeDetail();
    return;
  }

  if (!selectedPracticeId || !filtered.some((item) => item.id === selectedPracticeId)) {
    selectedPracticeId = filtered[0].id;
  }

  listEl.innerHTML = filtered
    .map((practice) => {
      const active = practice.id === selectedPracticeId;
      return [
        `<button class=\"practice-list-item${active ? " is-active" : ""}\" type=\"button\" data-action=\"select\" data-id=\"${practice.id}\">`,
        `  <span class=\"practice-list-title\">${escapeHtml(practice.title || "Untitled Practice")}</span>`,
        `  <span class=\"practice-list-meta\">${escapeHtml(practice.topic || "CSS Basics")}</span>`,
        "</button>"
      ].join("\n");
    })
    .join("\n");

  renderPracticeDetail();
};

const refreshPracticeLibrary = async () => {
  const rows = await listPracticeLibrary();
  practices = await migrateExistingPractices(rows);
  renderPracticeList();
};

const clearPracticeLibrary = async () => {
  const rows = await listPracticeLibrary();
  for (const row of rows) {
    await deletePracticeLibraryItem(row.id);
  }
  return rows.length;
};

const findPractice = (id) => practices.find((item) => item.id === id);

const loadPracticeInForm = (practice) => {
  if (!practice) return;
  if (idEl) idEl.value = practice.id || "";
  if (titleEl) titleEl.value = practice.title || "";
  if (topicEl) topicEl.value = practice.topic || "";
  if (sequenceEl) sequenceEl.value = Number.isFinite(practice.sequence) ? String(practice.sequence) : "";
  if (studentPromptEl) studentPromptEl.value = practice.studentPrompt || "";
  if (guideTextEl) guideTextEl.value = practice.guideText || "";
  if (starterHtmlEl) starterHtmlEl.value = practice.starterHtml || "";
  if (starterCssEl) starterCssEl.value = practice.starterCss || "";
  if (teacherKeyEl) teacherKeyEl.value = practice.teacherKey || "";
};

const handleCardAction = async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id || selectedPracticeId;

  if (action === "select") {
    selectedPracticeId = id;
    renderPracticeList();
    return;
  }

  const practice = findPractice(id);
  if (!practice) return;
  const safePractice = sanitizePractice(practice);

  if (action === "publish") {
    if (!currentUser) return;
    const confirmed = window.confirm(`Publish \"${practice.title || "Untitled Assignment"}\" to all students now?`);
    if (!confirmed) return;

    try {
      setState("Publishing to all students...");
      button.disabled = true;
      const result = await createAssignmentForAllStudents({
        teacherUid: currentUser.uid,
        title: safePractice.title || "Untitled Assignment",
        html: safePractice.starterHtml || "",
        css: safePractice.starterCss || "",
        studentPrompt: safePractice.studentPrompt || "",
        goalHtml: safePractice.goalHtml || "",
        goalCss: safePractice.goalCss || ""
      });
      setState(`Published to ${result.assignedCount} student project${result.assignedCount === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error(error);
      setState("Could not publish assignment.");
    } finally {
      button.disabled = false;
    }
    return;
  }

  if (action === "use") {
    window.localStorage.setItem(ASSIGNMENT_PREFILL_KEY, JSON.stringify({
      title: safePractice.title || "Untitled Assignment",
      html: safePractice.starterHtml || "",
      css: safePractice.starterCss || "",
      studentPrompt: safePractice.studentPrompt || "",
      goalHtml: safePractice.goalHtml || "",
      goalCss: safePractice.goalCss || ""
    }));
    window.location.href = "/assignments";
    return;
  }

  if (action === "copy") {
    const ok = await copyText(formatPracticeForCopyPaste(safePractice));
    setState(ok ? "Assignment pack copied to clipboard." : "Could not copy to clipboard.");
    return;
  }

  if (action === "copy-student") {
    const ok = await copyText(safePractice.studentPrompt || "");
    setState(ok ? "Student instructions copied." : "Could not copy student instructions.");
    return;
  }

  if (action === "copy-html") {
    const ok = await copyText(safePractice.starterHtml || "");
    setState(ok ? "Starter index.html copied." : "Could not copy starter HTML.");
    return;
  }

  if (action === "copy-css") {
    const ok = await copyText(safePractice.starterCss || "");
    setState(ok ? "Starter styles.css copied." : "Could not copy starter CSS.");
    return;
  }

  if (action === "copy-guide") {
    const ok = await copyText(safePractice.guideText || "");
    setState(ok ? "Detailed guide copied." : "Could not copy detailed guide.");
    return;
  }

  if (action === "copy-key") {
    const ok = await copyText(safePractice.teacherKey || "");
    setState(ok ? "Teacher key copied." : "Could not copy teacher key.");
    return;
  }

  if (action === "print") {
    printGuide(safePractice, false);
    setState("Opened black-and-white guide preview.");
    return;
  }

  if (action === "print-key") {
    printGuide(safePractice, true);
    setState("Opened black-and-white guide with teacher key.");
    return;
  }

  if (action === "edit") {
    loadPracticeInForm(safePractice);
    setState("Practice loaded into the form for editing.");
    return;
  }

  if (action === "delete") {
    const confirmed = window.confirm("Delete this practice from the bank?");
    if (!confirmed) return;

    try {
      await deletePracticeLibraryItem(practice.id);
      await refreshPracticeLibrary();
      setState("Practice deleted.");
    } catch (error) {
      console.error(error);
      setState("Could not delete practice.");
    }
  }
};

const setSeedButtonsDisabled = (disabled) => {
  if (resetBtn) resetBtn.disabled = disabled;
  if (seedBtn) seedBtn.disabled = disabled;
};

const seedFromPack = async (pack, loadingMessage, successMessage) => {
  if (!currentUser) return;
  setState(loadingMessage);

  setSeedButtonsDisabled(true);
  try {
    for (const item of pack) {
      await savePracticeLibraryItem({
        id: item.id,
        teacherUid: currentUser.uid,
        title: item.title,
        topic: item.topic,
        level: item.level,
        studentPrompt: item.studentPrompt,
        guideText: item.guideText,
        starterHtml: item.starterHtml,
        starterCss: item.starterCss,
        teacherKey: item.teacherKey,
        sequence: item.sequence
      });
    }

    await refreshPracticeLibrary();
    setState(successMessage);
  } catch (error) {
    console.error(error);
    setState("Could not load beginner pack.");
  } finally {
    setSeedButtonsDisabled(false);
  }
};

const seedPack = async () => seedFromPack(
  beginnerPracticePack,
  "Loading beginner practice set...",
  "Beginner practice set loaded."
);

const resetPracticeBank = async () => {
  if (!currentUser) return;

  const confirmed = window.confirm("Delete ALL current bank activities and rebuild from beginner set?");
  if (!confirmed) return;

  setSeedButtonsDisabled(true);
  try {
    setState("Deleting all existing activities from Practice Bank...");
    const removed = await clearPracticeLibrary();
    setState(`Deleted ${removed} activit${removed === 1 ? "y" : "ies"}. Rebuilding...`);

    for (const item of beginnerPracticePack) {
      await savePracticeLibraryItem({
        id: item.id,
        teacherUid: currentUser.uid,
        title: item.title,
        topic: item.topic,
        level: item.level,
        studentPrompt: item.studentPrompt,
        guideText: item.guideText,
        starterHtml: item.starterHtml,
        starterCss: item.starterCss,
        teacherKey: item.teacherKey,
        sequence: item.sequence
      });
    }

    await refreshPracticeLibrary();
    setState("Practice Bank reset complete. Beginner activities are now active.");
  } catch (error) {
    console.error(error);
    setState("Could not reset Practice Bank.");
  } finally {
    setSeedButtonsDisabled(false);
  }
};

const saveFromForm = async () => {
  if (!currentUser) return;

  const title = (titleEl?.value || "").trim();
  const studentPrompt = (studentPromptEl?.value || "").trim();
  const starterHtml = (starterHtmlEl?.value || "").trim();

  if (!title) {
    setState("Title is required.");
    return;
  }

  if (!studentPrompt) {
    setState("Student prompt is required.");
    return;
  }

  if (!starterHtml) {
    setState("Starter index.html is required.");
    return;
  }

  const sequenceRaw = (sequenceEl?.value || "").trim();
  const sequence = sequenceRaw ? Number(sequenceRaw) : null;

  saveBtn.disabled = true;
  setState("Saving practice to database...");

  try {
    await savePracticeLibraryItem({
      id: (idEl?.value || "").trim() || undefined,
      teacherUid: currentUser.uid,
      title,
      topic: (topicEl?.value || "CSS Basics").trim(),
      level: "beginner",
      studentPrompt,
      guideText: (guideTextEl?.value || "").trim(),
      starterHtml,
      starterCss: (starterCssEl?.value || "").trim(),
      teacherKey: (teacherKeyEl?.value || "").trim(),
      sequence: Number.isFinite(sequence) ? sequence : null
    });

    await refreshPracticeLibrary();
    setState("Practice saved.");
  } catch (error) {
    console.error(error);
    setState("Could not save practice.");
  } finally {
    saveBtn.disabled = false;
  }
};

const boot = async () => {
  await ensureSignedInUser();
  currentUser = getCurrentUser();

  if (!currentUser) {
    setState("Sign in first. Teacher access is required.");
    window.location.href = "/";
    return;
  }

  if (!isTeacher(currentUser)) {
    setState("Access denied. Practice Bank is restricted to the teacher account.");
    window.location.href = "/dashboard";
    return;
  }

  if (getViewMode() !== "admin") {
    setState("Switch to Admin View to access the Practice Bank.");
    window.location.href = "/dashboard";
    return;
  }

  if (starterHtmlEl && !starterHtmlEl.value.trim()) starterHtmlEl.value = defaultStarterHtml;
  if (starterCssEl && !starterCssEl.value.trim()) starterCssEl.value = defaultStarterCss;

  await refreshPracticeLibrary();
  setState("Practice Bank ready.");

  if (resetBtn) resetBtn.addEventListener("click", resetPracticeBank);
  if (seedBtn) seedBtn.addEventListener("click", seedPack);
  if (refreshBtn) refreshBtn.addEventListener("click", refreshPracticeLibrary);
  if (searchEl) searchEl.addEventListener("input", renderPracticeList);
  if (saveBtn) saveBtn.addEventListener("click", saveFromForm);
  if (listEl) listEl.addEventListener("click", handleCardAction);
  if (detailEl) detailEl.addEventListener("click", handleCardAction);
};

boot();
