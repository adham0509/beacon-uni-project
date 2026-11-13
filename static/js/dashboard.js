// which status each stat card on the dashboard shows
const STATS = [
  { key: "Stored", countId: "stored-count" },
  { key: "Claimed", countId: "claimed-count" },
  { key: "Disposed", countId: "disposed-count" },
];

// greets the signed in user by name
function setWelcomeHeading() {
  const username = sessionStorage.getItem("username");
  if (username === null) {
    return;
  }
  const heading = document.getElementById("welcome-heading");
  heading.textContent = "Welcome, " + username;
}

// fills each stat card with its count
function showCounts(counts) {
  for (const stat of STATS) {
    document.getElementById(stat.countId).textContent = String(counts[stat.key] || 0);
  }
}

// hides the loading message and marks the grid ready
function finishLoading() {
  document.getElementById("stat-grid").removeAttribute("aria-busy");
  document.getElementById("stats-loading").hidden = true;
}

// loads the counts from the api and updates the cards
async function loadStats() {
  try {
    const response = await fetch("/api/stats");
    if (response.ok === false) {
      throw new Error("Could not load the statistics");
    }
    const counts = await response.json();
    showCounts(counts);
    finishLoading();
    announce("Statistics loaded");
  } catch (fetchError) {
    finishLoading();
    document.getElementById("stats-error").hidden = false;
  }
}

// sets the heading loads the stats and wires the sign out card
setWelcomeHeading();
loadStats();
document.getElementById("dashboard-sign-out").addEventListener("click", signOut);
