const host = window.location.hostname.toLowerCase();
const useCustomAuthDomain = host === "codewithmorais.com" || host === "www.codewithmorais.com";

export const firebaseConfig = {
  apiKey: "AIzaSyAIwwM2V2qfPCB3TLVVeb8IW3FGxdNDhiY",
  authDomain: useCustomAuthDomain ? "codewithmorais.com" : "code-with-morais-405.firebaseapp.com",
  projectId: "code-with-morais-405",
  storageBucket: "code-with-morais-405.firebasestorage.app",
  messagingSenderId: "208072504611",
  appId: "1:208072504611:web:8ebd20260a9e16ceff8896",
  measurementId: "G-JLH66GJNFL"
};
