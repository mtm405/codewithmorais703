import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const CANONICAL_HOST = "codewithmorais.com";
const LEGACY_HOSTS = new Set([
	"code-with-morais-405.firebaseapp.com",
	"code-with-morais-405.web.app"
]);

if (LEGACY_HOSTS.has(window.location.hostname.toLowerCase())) {
	const target = `${window.location.protocol}//${CANONICAL_HOST}${window.location.pathname}${window.location.search}${window.location.hash}`;
	window.location.replace(target);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export { app, auth, db, provider };
