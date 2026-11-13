// storage key for the effects choice and pages that need no sign in
const EFFECTS_KEY = "beaconEffects";
const PUBLIC_PAGES = ["/", "/login", "/login.html"];

// writes a message into the live status region for screen readers
function announce(message) {
  const status = document.getElementById("live-status");
  if (status === null) {
    return;
  }
  status.textContent = "";
  window.setTimeout(function () {
    status.textContent = message;
  }, 50);
}

// sends the user to the login page when nobody is signed in
function guardSignIn() {
  const username = sessionStorage.getItem("username");
  const path = window.location.pathname;
  if (username === null && PUBLIC_PAGES.includes(path) === false) {
    window.location.href = "/login";
  }
}

// hides the nav and the sign out button when nobody is signed in
function applySignedInVisibility() {
  const signedIn = sessionStorage.getItem("username") !== null;
  const nav = document.querySelector(".site-nav");
  if (nav !== null) {
    nav.hidden = signedIn === false;
  }
  const signOutButton = document.getElementById("sign-out");
  if (signOutButton !== null) {
    signOutButton.hidden = signedIn === false;
  }
}

// turns the effects on or off and updates the toggle button state word
function applyEffects(isOn) {
  document.body.classList.toggle("calm", isOn === false);
  const toggleButton = document.getElementById("effects-toggle");
  if (toggleButton === null) {
    return;
  }
  toggleButton.setAttribute("aria-pressed", String(isOn));
  const stateWord = document.getElementById("effects-state");
  if (stateWord !== null) {
    stateWord.textContent = isOn ? "on" : "off";
  }
}

// flips the effects state and saves the new choice
function toggleEffects() {
  const isOn = document.body.classList.contains("calm") === false;
  const nextState = isOn === false;
  localStorage.setItem(EFFECTS_KEY, nextState ? "on" : "off");
  applyEffects(nextState);
}

// applies the saved effects choice when the page loads
function loadEffects() {
  const saved = localStorage.getItem(EFFECTS_KEY);
  applyEffects(saved !== "off");
}

// clears the sign in details and returns to the login page
function signOut() {
  sessionStorage.removeItem("username");
  sessionStorage.removeItem("role");
  window.location.href = "/login";
}

// adds the floating log item link inside main
function createFloatingLogButton() {
  if (window.location.pathname === "/records/new") {
    return;
  }
  if (sessionStorage.getItem("username") === null) {
    return;
  }
  const main = document.getElementById("main");
  if (main === null) {
    return;
  }
  const link = document.createElement("a");
  link.href = "/records/new";
  link.className = "floating-log-button";
  link.textContent = "Log item";
  main.appendChild(link);
}

// tracks the pointer so cards can show a soft glow
function setupCardSpotlight() {
  const cards = document.querySelectorAll(".stat-card, .action-card");
  for (const card of cards) {
    card.addEventListener("mousemove", function (event) {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty("--spotlight-x", event.clientX - bounds.left + "px");
      card.style.setProperty("--spotlight-y", event.clientY - bounds.top + "px");
    });
  }
}

// runs the shared set up on every page
guardSignIn();
applySignedInVisibility();
loadEffects();
createFloatingLogButton();
setupCardSpotlight();

// wires the header buttons when they are present
const effectsToggle = document.getElementById("effects-toggle");
if (effectsToggle !== null) {
  effectsToggle.addEventListener("click", toggleEffects);
}

const signOutButton = document.getElementById("sign-out");
if (signOutButton !== null) {
  signOutButton.addEventListener("click", signOut);
}
