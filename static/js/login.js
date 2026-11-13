// how long the pretend signing in wait lasts in milliseconds
const SIGN_IN_WAIT = 1000;

// hides the nav and the sign out button on the login page
function hideSignedOutHeader() {
  const nav = document.querySelector(".site-nav");
  if (nav !== null) {
    nav.hidden = true;
  }
  const signOutButton = document.getElementById("sign-out");
  if (signOutButton !== null) {
    signOutButton.hidden = true;
  }
}

// checks both fields and collects what is missing
function getErrors(username, password) {
  const errors = [];
  if (username === "") {
    errors.push({ fieldId: "username", message: "Enter your username" });
  }
  if (password === "") {
    errors.push({ fieldId: "password", message: "Enter your password" });
  }
  return errors;
}

// removes every field error and hides the summary
function clearErrors() {
  const fieldIds = ["username", "password"];
  for (const fieldId of fieldIds) {
    document.getElementById(fieldId).removeAttribute("aria-invalid");
    document.getElementById(fieldId + "-error").hidden = true;
  }
  document.getElementById("error-summary").hidden = true;
  document.getElementById("error-summary-list").innerHTML = "";
}

// marks one field invalid and shows its message
function markFieldInvalid(fieldId) {
  document.getElementById(fieldId).setAttribute("aria-invalid", "true");
  document.getElementById(fieldId + "-error").hidden = false;
}

// builds the links inside the error summary
function fillErrorSummary(errors) {
  let listHtml = "";
  for (const error of errors) {
    listHtml += `<li><a href="#${error.fieldId}">${error.message}</a></li>`;
  }
  document.getElementById("error-summary-list").innerHTML = listHtml;
}

// marks the failed fields and moves focus to the summary
function showErrors(errors) {
  for (const error of errors) {
    markFieldInvalid(error.fieldId);
  }
  fillErrorSummary(errors);
  const summary = document.getElementById("error-summary");
  summary.hidden = false;
  summary.focus();
}

// waits for the given number of milliseconds
function sleep(ms) {
  return new Promise(function (resolve) {
    window.setTimeout(resolve, ms);
  });
}

// waits a moment then stores the user and opens the dashboard
async function signIn(username) {
  const button = document.getElementById("login-button");
  button.disabled = true;
  announce("Signing in");
  await sleep(SIGN_IN_WAIT);
  sessionStorage.setItem("username", username);
  sessionStorage.setItem("role", username === "supervisor" ? "supervisor" : "staff");
  window.location.href = "/dashboard";
}

// checks the form then signs the user in
function handleSubmit(event) {
  event.preventDefault();
  clearErrors();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errors = getErrors(username, password);
  if (errors.length > 0) {
    showErrors(errors);
    return;
  }
  signIn(username);
}

// runs the page set up and listens for the form being submitted
hideSignedOutHeader();
document.getElementById("login-form").addEventListener("submit", handleSubmit);
