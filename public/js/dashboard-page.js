import { ensureSignedInUser, getCurrentUser } from "./auth.js";

const greetingEl = document.getElementById("dashboard-greeting");
const clockEl = document.getElementById("dashboard-clock");
const dateEl = document.getElementById("dashboard-date");
const focusEl = document.getElementById("dashboard-focus");
const vocabWordEl = document.getElementById("vocab-word");
const vocabDefEl = document.getElementById("vocab-definition");
const vocabExampleEl = document.getElementById("vocab-example");
const vocabRevealBtn = document.getElementById("vocab-reveal");
const vocabNextBtn = document.getElementById("vocab-next");
const gameQuestionEl = document.getElementById("css-game-question");
const gameOptionsEl = document.getElementById("css-game-options");
const gameStateEl = document.getElementById("css-game-state");
const gameScoreEl = document.getElementById("css-game-score");
const challengeEl = document.getElementById("coding-challenge");
const nextChallengeBtn = document.getElementById("next-challenge");
const bugSnippetEl = document.getElementById("bug-snippet");
const bugStateEl = document.getElementById("bug-state");
const bugAnswerEl = document.getElementById("bug-answer");
const bugRevealBtn = document.getElementById("bug-reveal");
const nextBugBtn = document.getElementById("next-bug");

const vocabWords = [
  {
    word: "Selector",
    definition: "The part of CSS that targets which HTML elements receive styles.",
    example: "Example: p { color: navy; } targets all paragraph tags."
  },
  {
    word: "Specificity",
    definition: "A priority system CSS uses to decide which style rule wins.",
    example: "Example: #card beats .card when both style the same property."
  },
  {
    word: "Semantic HTML",
    definition: "HTML that uses meaningful tags like header, main, and section.",
    example: "Example: Using <main> for primary page content improves clarity."
  },
  {
    word: "Class",
    definition: "A reusable HTML label used to style one or many elements with CSS.",
    example: "Example: <button class=\"primary\"> and .primary { ... }"
  },
  {
    word: "Box Model",
    definition: "Every element is a box made of content, padding, border, and margin.",
    example: "Example: padding adds inner space; margin adds outer space."
  },
  {
    word: "Responsive Design",
    definition: "Design approach where layout adapts to different screen sizes.",
    example: "Example: @media (max-width: 700px) { ... }"
  }
];

const gameQuestions = [
  {
    question: "Which property changes text color?",
    options: ["font-style", "color", "text-shadow"],
    answer: "color"
  },
  {
    question: "Which selector targets an element with id='hero'?",
    options: [".hero", "hero", "#hero"],
    answer: "#hero"
  },
  {
    question: "Which property adds space inside a border?",
    options: ["margin", "padding", "gap"],
    answer: "padding"
  },
  {
    question: "Which HTML tag is best for the largest page heading?",
    options: ["<h1>", "<header>", "<title>"],
    answer: "<h1>"
  },
  {
    question: "Which display value creates a flexible row/column layout?",
    options: ["display: inline", "display: flex", "display: block"],
    answer: "display: flex"
  }
];

const microChallenges = [
  "Create a profile card with an image, name, and button in under 10 minutes.",
  "Build a two-column layout where the right column collapses on mobile.",
  "Style a navigation bar with hover states and rounded pill links.",
  "Design a call-to-action section with one heading, one paragraph, and one button.",
  "Create a gallery of 6 boxes using CSS Grid with equal spacing."
];

const dailyFocusItems = [
  "Today: Improve HTML semantics",
  "Today: Clean up CSS spacing",
  "Today: Fix selector mistakes",
  "Today: Strengthen accessibility",
  "Today: Make layout responsive"
];

const bugSprintPrompts = [
  {
    snippet: "<img src=\"logo.png\">",
    fix: "Add alt text: <img src=\"logo.png\" alt=\"School logo\">."
  },
  {
    snippet: "<head>\n  <link rel=\"stylesheet\" href=\"styles.css\">\n</body>",
    fix: "Close head correctly with </head>, not </body>."
  },
  {
    snippet: "h1 {\n  color: #0a58ca\n  margin-bottom: 12px;\n}",
    fix: "Add the missing semicolon after color: #0a58ca;"
  },
  {
    snippet: ".card-title {\n  font-size: 20px;\n}\n\n<h2 class=\"cardtitle\">Project</h2>",
    fix: "Class names do not match. Use class=\"card-title\" in HTML."
  },
  {
    snippet: ".menu {\n  display: flex;\n  justify-content: center;\n}\n\n<div class=\"menue\"></div>",
    fix: "Fix typo in class name. Use class=\"menu\" to match the selector."
  }
];

let currentVocab = 0;
let definitionRevealed = false;
let score = 0;
let asked = 0;
let activeQuestion = null;
let currentBugIndex = 0;

const randomIndex = (size) => Math.floor(Math.random() * size);
const updateDateTime = () => {
  if (!clockEl) return;
  const now = new Date();
  clockEl.textContent = `Time: ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }
};

const setGreeting = (user) => {
  if (!greetingEl) return;
  const rawName = user?.displayName || user?.email?.split("@")[0] || "Coder";
  const firstName = rawName.split(" ")[0] || rawName;
  greetingEl.textContent = `Welcome back, ${firstName}`;
};

const setDailyFocus = () => {
  if (!focusEl) return;
  const day = new Date().getDay();
  focusEl.textContent = dailyFocusItems[day % dailyFocusItems.length];
};

const renderVocab = () => {
  if (!vocabWordEl || !vocabDefEl || !vocabExampleEl) return;
  const item = vocabWords[currentVocab];
  vocabWordEl.textContent = item.word;
  vocabDefEl.textContent = definitionRevealed ? item.definition : "Click Reveal Definition.";
  vocabExampleEl.textContent = definitionRevealed ? item.example : "Example: -";
};

const nextVocab = () => {
  let next = randomIndex(vocabWords.length);
  if (next === currentVocab) {
    next = (next + 1) % vocabWords.length;
  }
  currentVocab = next;
  definitionRevealed = false;
  renderVocab();
};

const renderScore = () => {
  if (gameScoreEl) {
    gameScoreEl.textContent = `Score: ${score}/${asked}`;
  }
};

const renderGameQuestion = () => {
  if (!gameQuestionEl || !gameOptionsEl) return;

  activeQuestion = gameQuestions[randomIndex(gameQuestions.length)];
  gameQuestionEl.textContent = activeQuestion.question;
  gameOptionsEl.innerHTML = "";

  activeQuestion.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-secondary game-option-btn";
    button.textContent = option;
    button.addEventListener("click", () => {
      asked += 1;
      if (option === activeQuestion.answer) {
        score += 1;
        if (gameStateEl) gameStateEl.textContent = "Correct. Nice work.";
      } else if (gameStateEl) {
        gameStateEl.textContent = `Not quite. Correct answer: ${activeQuestion.answer}`;
      }
      renderScore();
      renderGameQuestion();
    });
    gameOptionsEl.appendChild(button);
  });
};

const renderChallenge = () => {
  if (!challengeEl) return;
  challengeEl.textContent = microChallenges[randomIndex(microChallenges.length)];
};

const renderBugPrompt = () => {
  if (!bugSnippetEl || !bugAnswerEl) return;
  const item = bugSprintPrompts[currentBugIndex];
  bugSnippetEl.textContent = item.snippet;
  bugAnswerEl.textContent = "";
  if (bugStateEl) bugStateEl.textContent = "Find the bug and explain the fix before revealing.";
};

const showBugFix = () => {
  if (!bugAnswerEl) return;
  const item = bugSprintPrompts[currentBugIndex];
  bugAnswerEl.textContent = item.fix;
  if (bugStateEl) bugStateEl.textContent = "Compare your answer with the fix and move to the next bug.";
};

const nextBug = () => {
  currentBugIndex = (currentBugIndex + 1) % bugSprintPrompts.length;
  renderBugPrompt();
};

const boot = async () => {
  if (!clockEl && !vocabWordEl && !gameQuestionEl && !bugSnippetEl) {
    return;
  }

  await ensureSignedInUser();
  const user = getCurrentUser();
  setGreeting(user);
  setDailyFocus();

  updateDateTime();
  window.setInterval(updateDateTime, 1000);

  renderVocab();
  renderScore();
  renderGameQuestion();
  renderChallenge();
  renderBugPrompt();

  if (vocabRevealBtn) {
    vocabRevealBtn.addEventListener("click", () => {
      definitionRevealed = true;
      renderVocab();
    });
  }

  if (vocabNextBtn) {
    vocabNextBtn.addEventListener("click", nextVocab);
  }

  if (nextChallengeBtn) {
    nextChallengeBtn.addEventListener("click", renderChallenge);
  }

  if (bugRevealBtn) {
    bugRevealBtn.addEventListener("click", showBugFix);
  }

  if (nextBugBtn) {
    nextBugBtn.addEventListener("click", nextBug);
  }
};

boot();
