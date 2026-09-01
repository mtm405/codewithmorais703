import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  where
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { db } from "./firebase-init.js";

const TEACHER_EMAIL = "marco.morais@imaginenorthport.com";

const workspaceIdFor = (uid) => `${uid}_starter`;

const defaultWorkspace = {
  html: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <title>My Project</title>\n</head>\n<body>\n  <main>\n    <h1>Hello, web world!</h1>\n    <p>Start building your page here.</p>\n  </main>\n</body>\n</html>",
  css: "body {\n  font-family: Verdana, sans-serif;\n  margin: 24px;\n  color: #1e1f22;\n}\n\nh1 {\n  color: #d35400;\n}\n"
};

export const ensureWorkspace = async (uid) => {
  const workspaceId = workspaceIdFor(uid);
  const workspaceRef = doc(db, "workspaces", workspaceId);
  const snap = await getDoc(workspaceRef);

  if (!snap.exists()) {
    await setDoc(workspaceRef, {
      ownerId: uid,
      title: "Starter Project",
      html: defaultWorkspace.html,
      css: defaultWorkspace.css,
      saveCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: workspaceId, ...defaultWorkspace, saveCount: 0 };
  }

  return { id: workspaceId, ...snap.data() };
};

export const createProject = async (uid, title = "Untitled Project") => {
  const project = {
    ownerId: uid,
    title,
    html: defaultWorkspace.html,
    css: defaultWorkspace.css,
    saveCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(collection(db, "workspaces"), project);
  return { id: ref.id, ...project };
};

export const listUserProjects = async (uid) => {
  const q = query(collection(db, "workspaces"), where("ownerId", "==", uid));
  const snap = await getDocs(q);

  const rows = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
  rows.sort((a, b) => {
    const at = a.updatedAt && typeof a.updatedAt.toMillis === "function" ? a.updatedAt.toMillis() : 0;
    const bt = b.updatedAt && typeof b.updatedAt.toMillis === "function" ? b.updatedAt.toMillis() : 0;
    return bt - at;
  });

  return rows;
};

export const getProjectById = async (projectId) => {
  const snap = await getDoc(doc(db, "workspaces", projectId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const saveProject = async (projectId, html, css) => {
  const ref = doc(db, "workspaces", projectId);
  const current = await getDoc(ref);
  if (!current.exists()) {
    throw new Error("Project not found.");
  }

  await setDoc(ref, {
    html,
    css,
    saveCount: (current.data().saveCount || 0) + 1,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const deleteProject = async (projectId, uid) => {
  const ref = doc(db, "workspaces", projectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Project not found.");
  }

  if (snap.data().ownerId !== uid) {
    throw new Error("Not authorized to delete this project.");
  }

  await deleteDoc(ref);
};

export const renameProject = async (projectId, uid, title) => {
  const ref = doc(db, "workspaces", projectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Project not found.");
  }

  if (snap.data().ownerId !== uid) {
    throw new Error("Not authorized to rename this project.");
  }

  await setDoc(ref, {
    title,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const saveWorkspace = async (uid, html, css) => {
  const projects = await listUserProjects(uid);
  const active = projects[0] || await ensureWorkspace(uid);

  await saveProject(active.id, html, css);
  return active.id;
};

export const ensureProgress = async (uid) => {
  const progressRef = doc(db, "userProgress", uid);
  const snap = await getDoc(progressRef);

  if (!snap.exists()) {
    await setDoc(progressRef, {
      ownerId: uid,
      completedObjectiveIds: [],
      completedCount: 0,
      lastActive: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return {
      completedObjectiveIds: [],
      completedCount: 0,
      ownerId: uid
    };
  }

  return snap.data();
};

export const markObjectiveComplete = async (uid, objectiveId) => {
  const progressRef = doc(db, "userProgress", uid);
  const snap = await getDoc(progressRef);
  const data = snap.exists() ? snap.data() : { completedObjectiveIds: [] };
  const completed = Array.isArray(data.completedObjectiveIds) ? data.completedObjectiveIds : [];

  if (!completed.includes(objectiveId)) {
    completed.push(objectiveId);
  }

  await setDoc(progressRef, {
    ownerId: uid,
    completedObjectiveIds: completed,
    completedCount: completed.length,
    lastActive: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const getStudentSnapshot = async (uid) => {
  const [progressSnap, projects] = await Promise.all([
    getDoc(doc(db, "userProgress", uid)),
    listUserProjects(uid)
  ]);

  return {
    progress: progressSnap.exists() ? progressSnap.data() : null,
    workspace: projects[0] || null,
    projects
  };
};

export const getTeacherStudentRows = async () => {
  const usersSnap = await getDocs(collection(db, "users"));
  const rows = [];

  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    const uid = userDoc.id;
    const [progressSnap] = await Promise.all([
      getDoc(doc(db, "userProgress", uid))
    ]);

    const projects = await listUserProjects(uid);

    rows.push({
      uid,
      displayName: user.displayName || "Student",
      email: user.email || "",
      role: user.role || "student",
      objectives: progressSnap.exists() ? (progressSnap.data().completedCount || 0) : 0,
      lastActive: progressSnap.exists() ? progressSnap.data().lastActive || null : null,
      projectCount: projects.length
    });
  }

  rows.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return rows;
};

export const getStudentWorkspace = async (uid) => {
  const projects = await listUserProjects(uid);
  if (!projects.length) {
    return null;
  }

  return projects[0];
};

export const getStudentProjects = async (uid) => {
  return listUserProjects(uid);
};

export const listAssignments = async () => {
  const q = query(
    collection(db, "assignments"),
    orderBy("createdAt", "desc"),
    limit(25)
  );
  const snap = await getDocs(q);
  const rows = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
  return rows;
};

export const listPracticeLibrary = async () => {
  const snap = await getDocs(collection(db, "practiceLibrary"));
  const rows = snap.docs.map((item) => ({ id: item.id, ...item.data() }));

  rows.sort((a, b) => {
    const seqA = Number.isFinite(a.sequence) ? a.sequence : 9999;
    const seqB = Number.isFinite(b.sequence) ? b.sequence : 9999;
    if (seqA !== seqB) return seqA - seqB;

    const aTime = a.updatedAt && typeof a.updatedAt.toMillis === "function" ? a.updatedAt.toMillis() : 0;
    const bTime = b.updatedAt && typeof b.updatedAt.toMillis === "function" ? b.updatedAt.toMillis() : 0;
    if (aTime !== bTime) return bTime - aTime;

    return (a.title || "").localeCompare(b.title || "");
  });

  return rows;
};

export const savePracticeLibraryItem = async ({
  id,
  teacherUid,
  title,
  topic,
  level,
  studentPrompt,
  guideText,
  starterHtml,
  starterCss,
  teacherKey,
  sequence
}) => {
  const ref = id ? doc(db, "practiceLibrary", id) : doc(collection(db, "practiceLibrary"));
  const existing = await getDoc(ref);

  const payload = {
    title: title || "Untitled Practice",
    topic: topic || "CSS Basics",
    level: level || "beginner",
    studentPrompt: studentPrompt || "",
    guideText: guideText || "",
    starterHtml: starterHtml || defaultWorkspace.html,
    starterCss: starterCss || "",
    teacherKey: teacherKey || "",
    sequence: Number.isFinite(sequence) ? sequence : null,
    updatedAt: serverTimestamp(),
    updatedBy: teacherUid || ""
  };

  if (!existing.exists()) {
    await setDoc(ref, {
      ...payload,
      createdAt: serverTimestamp(),
      createdBy: teacherUid || ""
    });
  } else {
    await setDoc(ref, payload, { merge: true });
  }

  return { id: ref.id, ...payload };
};

export const deletePracticeLibraryItem = async (id) => {
  if (!id) throw new Error("Practice id is required.");
  await deleteDoc(doc(db, "practiceLibrary", id));
};

export const createAssignmentForAllStudents = async ({
  teacherUid,
  title,
  html,
  css,
  studentPrompt = "",
  goalHtml = "",
  goalCss = ""
}) => {
  const assignment = {
    title,
    html,
    css,
    studentPrompt,
    goalHtml,
    goalCss,
    createdBy: teacherUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const assignmentRef = await addDoc(collection(db, "assignments"), assignment);
  const usersSnap = await getDocs(collection(db, "users"));

  const studentIds = usersSnap.docs
    .map((item) => ({ uid: item.id, ...item.data() }))
    .filter((user) => (user.email || "").toLowerCase() !== TEACHER_EMAIL)
    .map((user) => user.uid);

  for (let i = 0; i < studentIds.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = studentIds.slice(i, i + 400);

    chunk.forEach((uid) => {
      const projectRef = doc(collection(db, "workspaces"));
      batch.set(projectRef, {
        ownerId: uid,
        title,
        html,
        css,
        assignmentInstructions: studentPrompt,
        assignmentGoalHtml: goalHtml,
        assignmentGoalCss: goalCss,
        saveCount: 0,
        assignmentId: assignmentRef.id,
        isAssignment: true,
        assignedBy: teacherUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
  }

  return {
    assignmentId: assignmentRef.id,
    assignedCount: studentIds.length
  };
};

export const saveProjectFeedback = async ({
  projectId,
  studentUid,
  teacherUid,
  status,
  grade,
  isLate,
  feedback,
  nextSteps
}) => {
  const ref = doc(db, "projectFeedback", projectId);
  const snap = await getDoc(ref);

  const payload = {
    projectId,
    studentUid,
    teacherUid,
    status: status || "needs-fixes",
    grade: grade || "",
    isLate: Boolean(isLate),
    feedback: feedback || "",
    nextSteps: nextSteps || "",
    updatedAt: serverTimestamp()
  };

  if (!snap.exists()) {
    await setDoc(ref, {
      ...payload,
      createdAt: serverTimestamp()
    });
    return;
  }

  await setDoc(ref, payload, { merge: true });
};

export const getProjectFeedback = async (projectId) => {
  const snap = await getDoc(doc(db, "projectFeedback", projectId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const listStudentProjectFeedback = async (uid) => {
  const q = query(collection(db, "projectFeedback"), where("studentUid", "==", uid));
  const snap = await getDocs(q);
  const rows = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
  rows.sort((a, b) => {
    const at = a.updatedAt && typeof a.updatedAt.toMillis === "function" ? a.updatedAt.toMillis() : 0;
    const bt = b.updatedAt && typeof b.updatedAt.toMillis === "function" ? b.updatedAt.toMillis() : 0;
    return bt - at;
  });
  return rows;
};

export const saveBellRingerSubmission = async ({
  studentUid,
  dateKey,
  questionSetId,
  score,
  total,
  answers
}) => {
  if (!studentUid) throw new Error("Student uid is required.");
  if (!dateKey) throw new Error("dateKey is required.");

  const ref = doc(db, "bellRingers", `${studentUid}_${dateKey}`);
  const snap = await getDoc(ref);
  const payload = {
    studentUid,
    dateKey,
    questionSetId: questionSetId || dateKey,
    score: Number.isFinite(score) ? score : 0,
    total: Number.isFinite(total) ? total : 0,
    answers: Array.isArray(answers) ? answers : [],
    updatedAt: serverTimestamp()
  };

  if (!snap.exists()) {
    await setDoc(ref, {
      ...payload,
      createdAt: serverTimestamp()
    });
    return;
  }

  await setDoc(ref, payload, { merge: true });
};

export const getBellRingerSubmission = async (studentUid, dateKey) => {
  if (!studentUid || !dateKey) return null;
  const snap = await getDoc(doc(db, "bellRingers", `${studentUid}_${dateKey}`));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const listStudentBellRingerSubmissions = async (studentUid, maxRows = 15) => {
  if (!studentUid) return [];

  const q = query(
    collection(db, "bellRingers"),
    where("studentUid", "==", studentUid),
    orderBy("dateKey", "desc"),
    limit(Math.max(1, Math.min(maxRows, 40)))
  );

  const snap = await getDocs(q);
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
};
