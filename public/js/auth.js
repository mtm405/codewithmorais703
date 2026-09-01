import {
  onAuthStateChanged,
  signInWithRedirect,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { auth, db, provider } from "./firebase-init.js";

let currentUser = null;
let authReadyResolver = null;
const authReady = new Promise((resolve) => {
  authReadyResolver = resolve;
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;
  if (user) {
    await ensureUserDocument(user);
  }
  if (authReadyResolver) {
    authReadyResolver();
    authReadyResolver = null;
  }
});

export const ensureSignedInUser = async () => {
  await authReady;
  return currentUser;
};

export const getCurrentUser = () => currentUser;

export const signIn = async () => {
  await signInWithRedirect(auth, provider);
};

export const signOutUser = async () => {
  await signOut(auth);
  window.location.href = "/";
};

const ensureUserDocument = async (user) => {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  const baseData = {
    email: user.email || "",
    displayName: user.displayName || "Student",
    photoURL: user.photoURL || "",
    updatedAt: serverTimestamp()
  };

  if (!snap.exists()) {
    await setDoc(userRef, {
      ...baseData,
      role: "student",
      createdAt: serverTimestamp()
    });
  } else {
    await setDoc(userRef, baseData, { merge: true });
  }
};
