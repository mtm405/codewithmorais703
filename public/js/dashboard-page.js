import { ensureSignedInUser, getCurrentUser } from "./auth.js";
import { getBellRingerSubmission, saveBellRingerSubmission } from "./data-store.js";

const clockEl = document.getElementById("dashboard-clock");
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
const bellRingerDateEl = document.getElementById("bell-ringer-date");
const bellRingerFormEl = document.getElementById("bell-ringer-form");
const bellRingerQuestionsEl = document.getElementById("bell-ringer-questions");
const bellRingerStateEl = document.getElementById("bell-ringer-state");
const bellRingerSubmitEl = document.getElementById("bell-ringer-submit");
const BELL_RINGER_QUESTION_COUNT = 2;

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

const bellRingerBank = [
  {
    id: "bug-missing-doctype",
    prompt: "Bug Hunt: Which fix solves a page rendering in quirks mode?",
    options: [
      "Add <!DOCTYPE html> at the top",
      "Move <title> into <body>",
      "Remove the <head> tag",
      "Wrap everything in <div>"
    ],
    answer: "Add <!DOCTYPE html> at the top"
  },
  {
    id: "bug-css-width-typo",
    prompt: "Bug Hunt: In CSS, which typo breaks this rule: widht: 300px;",
    options: ["widht", "300px", ":", ";"],
    answer: "widht"
  },
  {
    id: "bug-missing-alt",
    prompt: "Bug Hunt: What is missing in <img src='logo.png'> for accessibility?",
    options: ["class", "alt", "id", "width"],
    answer: "alt"
  },
  {
    id: "bug-class-selector",
    prompt: "Bug Hunt: Which selector correctly targets class='card'?",
    options: ["#card", "card", ".card", "*card"],
    answer: ".card"
  },
  {
    id: "bug-display-flex",
    prompt: "Bug Hunt: Which line fixes a non-working flex layout on the parent?",
    options: ["position: flex;", "display: flex;", "float: flex;", "layout: flex;"],
    answer: "display: flex;"
  },
  {
    id: "bug-unclosed-tag",
    prompt: "Bug Hunt: Which closing tag is missing here: <p>Hello",
    options: [
      "</h1>",
      "</p>",
      "</main>",
      "</head>"
    ],
    answer: "</p>"
  },
  {
    id: "bug-link-tag",
    prompt: "Bug Hunt: Which tag correctly links styles.css in <head>?",
    options: [
      "<css href='styles.css'>",
      "<script src='styles.css'></script>",
      "<link rel='stylesheet' href='styles.css'>",
      "<style src='styles.css'></style>"
    ],
    answer: "<link rel='stylesheet' href='styles.css'>"
  },
  {
    id: "bug-semicolon",
    prompt: "Bug Hunt: Which missing character breaks this CSS line: color: red",
    options: [".", ",", ";", "#"],
    answer: ";"
  },
  {
    id: "bug-id-selector",
    prompt: "Bug Hunt: Which selector targets id='main-nav'?",
    options: [".main-nav", "#main-nav", "main-nav", "*main-nav"],
    answer: "#main-nav"
  },
  {
    id: "bug-css-comment",
    prompt: "Bug Hunt: Which is the correct CSS comment syntax?",
    options: [
      "// comment",
      "<!-- comment -->",
      "/* comment */",
      "** comment **"
    ],
    answer: "/* comment */"
  }
];

let currentVocab = 0;
let definitionRevealed = false;
let score = 0;
let asked = 0;
let activeQuestion = null;
let signedInUid = "";
let todayQuestions = [];

const randomIndex = (size) => Math.floor(Math.random() * size);

const dateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateDisplay = () => {
  return new Date().toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const seededQuestions = () => {
  const key = dateKey();
  const [year, month, day] = key.split("-").map((value) => Number(value));
  let seed = year * 372 + month * 31 + day;

  const pool = [...bellRingerBank];
  const picked = [];
  for (let i = 0; i < BELL_RINGER_QUESTION_COUNT && pool.length; i += 1) {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const index = seed % pool.length;
    picked.push(pool[index]);
    pool.splice(index, 1);
  }

  return picked;
};

const setBellRingerState = (text) => {
  if (bellRingerStateEl) bellRingerStateEl.textContent = text;
};

const renderBellRingerQuestions = (questions, existingSubmission = null) => {
  if (!bellRingerQuestionsEl) return;
  bellRingerQuestionsEl.innerHTML = "";

  questions.forEach((question, index) => {
    const card = document.createElement("article");
    card.className = "bell-ringer-question";

    const prompt = document.createElement("p");
    prompt.className = "widget-emphasis";
    prompt.textContent = `${index + 1}. ${question.prompt}`;
    card.appendChild(prompt);

    const answers = existingSubmission?.answers || [];
    const saved = answers.find((item) => item.questionId === question.id)?.selected || "";

    question.options.forEach((option) => {
      const label = document.createElement("label");
      label.className = "bell-ringer-option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = `bell-ringer-${question.id}`;
      input.value = option;
      if (saved && saved === option) input.checked = true;

      const span = document.createElement("span");
      span.textContent = option;

      label.appendChild(input);
      label.appendChild(span);
      card.appendChild(label);
    });

    bellRingerQuestionsEl.appendChild(card);
  });
};

const collectBellRingerAnswers = (questions) => {
  return questions.map((question) => {
    const selected = bellRingerFormEl?.querySelector(`input[name="bell-ringer-${question.id}"]:checked`);
    const selectedValue = selected instanceof HTMLInputElement ? selected.value : "";
    const isCorrect = selectedValue === question.answer;

    return {
      questionId: question.id,
      prompt: question.prompt,
      selected: selectedValue,
      correctAnswer: question.answer,
      isCorrect
    };
  });
};

const renderBellRinger = async () => {
  if (!bellRingerFormEl || !bellRingerQuestionsEl) return;

  if (bellRingerDateEl) {
    bellRingerDateEl.textContent = `Date: ${dateDisplay()}`;
  }

  todayQuestions = seededQuestions();
  const key = dateKey();
  const existing = signedInUid ? await getBellRingerSubmission(signedInUid, key) : null;
  renderBellRingerQuestions(todayQuestions, existing);

  if (existing) {
    setBellRingerState(`Saved today: ${existing.score}/${existing.total}. You can edit and submit again.`);
  } else {
    setBellRingerState("Today's Bell Ringer is ready.");
  }

  bellRingerFormEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!signedInUid) {
      setBellRingerState("Sign in first to submit Bell Ringer answers.");
      return;
    }

    const answers = collectBellRingerAnswers(todayQuestions);
    const unanswered = answers.filter((item) => !item.selected);
    if (unanswered.length) {
      setBellRingerState(`Answer all ${todayQuestions.length} questions before submitting.`);
      return;
    }

    const earned = answers.reduce((sum, item) => sum + (item.isCorrect ? 1 : 0), 0);

    try {
      if (bellRingerSubmitEl) bellRingerSubmitEl.disabled = true;
      setBellRingerState("Saving Bell Ringer...");

      await saveBellRingerSubmission({
        studentUid: signedInUid,
        dateKey: key,
        questionSetId: key,
        score: earned,
        total: todayQuestions.length,
        answers
      });

      setBellRingerState(`Saved: ${earned}/${todayQuestions.length}. Your teacher can review this submission.`);
    } catch (error) {
      console.error(error);
      setBellRingerState("Could not save Bell Ringer. Please try again.");
    } finally {
      if (bellRingerSubmitEl) bellRingerSubmitEl.disabled = false;
    }
  });
};

const updateClock = () => {
  if (!clockEl) return;
  const now = new Date();
  clockEl.textContent = `Time: ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
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

const boot = async () => {
  if (!clockEl && !vocabWordEl && !gameQuestionEl) {
    return;
  }

  await ensureSignedInUser();
  signedInUid = getCurrentUser()?.uid || "";

  updateClock();
  window.setInterval(updateClock, 1000);

  renderVocab();
  renderScore();
  renderGameQuestion();
  renderChallenge();
  await renderBellRinger();

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
};

boot();
