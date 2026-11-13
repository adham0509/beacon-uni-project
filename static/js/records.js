// page size and the current state of the records table
const PAGE_SIZE = 10;

let allItems = [];
let searchTerm = "";
let categoryFilter = "All";
let statusFilter = "All";
let sortKey = "";
let sortDescending = false;
let pageNumber = 1;
let deleteTarget = null;
let deleteOpener = null;
let pendingMessage = "";

// makes text safe to place inside the table html
function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// checks whether the signed in user may delete items
function isSupervisor() {
  return sessionStorage.getItem("role") === "supervisor";
}

// hides the loading message and marks the table region ready
function finishLoading() {
  document.getElementById("loading-region").hidden = true;
  document.getElementById("table-region").removeAttribute("aria-busy");
}

// shows a blocking error message above the table
function showError(message) {
  document.getElementById("records-error-text").textContent = message;
  document.getElementById("records-error").hidden = false;
}

// returns the items that match the search and filters
function getFilteredItems() {
  const term = searchTerm.toLowerCase();
  return allItems.filter(function (item) {
    const matchesSearch =
      item.item_name.toLowerCase().includes(term) ||
      (item.description || "").toLowerCase().includes(term);
    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });
}

// returns the items in the current sort order
function sortItems(items) {
  if (sortKey === "") {
    return items;
  }
  const sorted = items.slice().sort(function (first, second) {
    const firstValue = String(first[sortKey]).toLowerCase();
    const secondValue = String(second[sortKey]).toLowerCase();
    if (firstValue < secondValue) {
      return -1;
    }
    if (firstValue > secondValue) {
      return 1;
    }
    return 0;
  });
  if (sortDescending) {
    sorted.reverse();
  }
  return sorted;
}

// builds one table row with its badge, logged by name and action buttons
function buildRow(item) {
  let actions = "";
  if (item.status === "Stored") {
    actions += `<button type="button" class="button button-secondary" data-claim="${item.id}" aria-label="Mark claimed, ${escapeHtml(item.item_name)}">Mark claimed</button> `;
  }
  if (isSupervisor()) {
    actions += `<button type="button" class="button button-danger" data-delete="${item.id}" aria-label="Delete ${escapeHtml(item.item_name)}">Delete</button>`;
  }
  const iconClass = "stat-icon stat-icon--" + item.status.toLowerCase();
  const loggedBy = item.logged_by ? escapeHtml(item.logged_by) : "Not recorded";
  return `<tr>
<th scope="row">${escapeHtml(item.item_name)}</th>
<td>${item.category}</td>
<td>${item.found_location}</td>
<td>${item.found_date}</td>
<td><span class="status-badge"><span class="${iconClass}" aria-hidden="true"></span>${item.status}</span></td>
<td>${loggedBy}</td>
<td>${actions}</td>
</tr>`;
}

// draws the current page of rows and updates the counts
function renderPage() {
  const filtered = sortItems(getFilteredItems());
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  pageNumber = Math.min(pageNumber, pageCount);
  const start = (pageNumber - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  document.getElementById("records-body").innerHTML = visible.map(buildRow).join("");
  let message = `Showing ${visible.length} of ${filtered.length} items, page ${pageNumber} of ${pageCount}`;
  if (pendingMessage !== "") {
    message = pendingMessage + ". " + message;
  }
  document.getElementById("results-count").textContent = message;
  pendingMessage = "";
  document.getElementById("page-label").textContent = `Page ${pageNumber} of ${pageCount}`;
  document.getElementById("records-table").hidden = filtered.length === 0;
  document.getElementById("pagination").hidden = filtered.length === 0;
  document.getElementById("empty-state").hidden = filtered.length > 0;
  document.getElementById("previous-page").disabled = pageNumber === 1;
  document.getElementById("next-page").disabled = pageNumber === pageCount;
}

// updates the state when a filter control changes
function handleFilterChange(event) {
  const control = event.target;
  if (control.id === "search-box") {
    searchTerm = control.value.trim();
  } else if (control.id === "category-filter") {
    categoryFilter = control.value;
  } else {
    statusFilter = control.value;
  }
  pageNumber = 1;
  renderPage();
}

// resets the search box and both filters
function clearFilters() {
  document.getElementById("search-box").value = "";
  document.getElementById("category-filter").value = "All";
  document.getElementById("status-filter").value = "All";
  searchTerm = "";
  categoryFilter = "All";
  statusFilter = "All";
  pageNumber = 1;
  renderPage();
}

// sorts by the clicked heading and announces the order
function handleSort(event) {
  const button = event.target.closest("button");
  if (button === null) {
    return;
  }
  sortDescending = sortKey === button.dataset.sortKey ? !sortDescending : false;
  sortKey = button.dataset.sortKey;
  const sortButtons = document.querySelectorAll("[data-sort-key]");
  for (const sortButton of sortButtons) {
    const direction = sortButton === button ? (sortDescending ? "descending" : "ascending") : "none";
    sortButton.closest("th").setAttribute("aria-sort", direction);
  }
  pageNumber = 1;
  renderPage();
  announce(`Sorted by ${button.textContent}, ${sortDescending ? "descending" : "ascending"}`);
}

// moves the table to the previous or next page
function changePage(step) {
  pageNumber = pageNumber + step;
  renderPage();
}

// marks one item as claimed then refreshes the table
async function markClaimed(itemId) {
  try {
    const response = await fetch("/api/items/" + itemId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Claimed" }),
    });
    if (response.ok === false) {
      throw new Error("Could not update the item");
    }
    const updatedItem = await response.json();
    const item = allItems.find(function (entry) {
      return entry.id === updatedItem.id;
    });
    item.status = "Claimed";
    pendingMessage = updatedItem.item_name + " marked as claimed";
    renderPage();
    document.getElementById("results-count").focus();
  } catch (fetchError) {
    showError("Could not mark the item as claimed. Try again.");
  }
}

// claims an item or opens the delete dialog from a row
function handleRowClick(event) {
  const claimButton = event.target.closest("[data-claim]");
  if (claimButton !== null) {
    markClaimed(claimButton.dataset.claim);
    return;
  }
  const deleteButton = event.target.closest("[data-delete]");
  if (deleteButton === null) {
    return;
  }
  deleteTarget = allItems.find(function (entry) {
    return entry.id === Number(deleteButton.dataset.delete);
  });
  deleteOpener = deleteButton;
  const dialogText = document.getElementById("delete-dialog-text");
  dialogText.textContent = `Delete ${deleteTarget.item_name}? This cannot be undone.`;
  document.getElementById("delete-dialog").showModal();
}

// deletes the item when the dialog confirms it
async function handleDialogClose() {
  const dialog = document.getElementById("delete-dialog");
  const wantsDelete = dialog.returnValue === "delete";
  dialog.returnValue = "";
  const item = deleteTarget;
  deleteTarget = null;
  if (deleteOpener !== null && document.contains(deleteOpener)) {
    deleteOpener.focus();
  }
  deleteOpener = null;
  if (wantsDelete === false || item === null) {
    return;
  }
  try {
    const response = await fetch("/api/items/" + item.id, { method: "DELETE" });
    if (response.ok === false) {
      throw new Error("Could not delete the item");
    }
    allItems = allItems.filter(function (entry) {
      return entry.id !== item.id;
    });
    pendingMessage = item.item_name + " deleted";
    renderPage();
    document.getElementById("results-count").focus();
  } catch (fetchError) {
    showError("Could not delete the item. Try again.");
  }
}

// loads every item from the api and shows the table
async function loadItems() {
  try {
    const response = await fetch("/api/items");
    if (response.ok === false) {
      throw new Error("Could not load the items");
    }
    allItems = await response.json();
    finishLoading();
    renderPage();
  } catch (fetchError) {
    finishLoading();
    showError("Could not load the items. Refresh the page to try again.");
  }
}

// connects every control on the page to its handler
function bindEvents() {
  document.getElementById("search-box").addEventListener("input", handleFilterChange);
  document.getElementById("category-filter").addEventListener("change", handleFilterChange);
  document.getElementById("status-filter").addEventListener("change", handleFilterChange);
  const clearButtons = document.querySelectorAll(".clear-filters");
  for (const clearButton of clearButtons) {
    clearButton.addEventListener("click", clearFilters);
  }
  document.getElementById("records-head").addEventListener("click", handleSort);
  document.getElementById("records-body").addEventListener("click", handleRowClick);
  document.getElementById("previous-page").addEventListener("click", function () {
    changePage(-1);
  });
  document.getElementById("next-page").addEventListener("click", function () {
    changePage(1);
  });
  document.getElementById("delete-dialog").addEventListener("close", handleDialogClose);
}

// starts the page by binding events and loading the items
bindEvents();
loadItems();
