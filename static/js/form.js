// storage key for the last used found location
const LOCATION_KEY = "beaconLastLocation";

// gives the current date as a year month day string
function getTodayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

// checks whether the chosen category is electronics
function isElectronics() {
  return document.getElementById("category").value === "Electronics";
}

// checks whether the valuable box is ticked
function isValuable() {
  return document.getElementById("valuable").checked;
}

// clears the error state from one field
function clearFieldError(inputId) {
  document.getElementById(inputId).removeAttribute("aria-invalid");
  document.getElementById(inputId + "-error").hidden = true;
}

// shows or hides a form section and announces the change
function setSectionHidden(sectionId, inputId, hidden, message) {
  const section = document.getElementById(sectionId);
  if (section.hidden === hidden) {
    return;
  }
  section.hidden = hidden;
  clearFieldError(inputId);
  announce(message);
}

// shows the serial number field only for electronics
function updateSerialSection() {
  if (isElectronics()) {
    setSectionHidden("serial-field", "serial-number", false, "Serial number field shown");
  } else {
    setSectionHidden("serial-field", "serial-number", true, "Serial number field hidden");
  }
}

// shows the shelf code field only when valuable is ticked
function updateShelfSection() {
  if (isValuable()) {
    setSectionHidden("shelf-field", "shelf-code", false, "Shelf code field shown");
  } else {
    setSectionHidden("shelf-field", "shelf-code", true, "Shelf code field hidden");
  }
}

// checks every field and collects the problems
function getErrors() {
  const errors = [];
  if (document.getElementById("item-name").value.trim() === "") {
    errors.push({ inputId: "item-name", message: "Enter the item name" });
  }
  if (document.getElementById("category").value === "") {
    errors.push({ inputId: "category", message: "Choose a category" });
  }
  if (document.getElementById("found-location").value === "") {
    errors.push({ inputId: "found-location", message: "Choose where the item was found" });
  }
  const dateValue = document.getElementById("found-date").value;
  if (dateValue === "") {
    errors.push({ inputId: "found-date", message: "Enter the date the item was found" });
  } else if (dateValue > getTodayIso()) {
    errors.push({ inputId: "found-date", message: "The date cannot be in the future" });
  }
  if (isElectronics() && document.getElementById("serial-number").value.trim() === "") {
    errors.push({ inputId: "serial-number", message: "Enter the serial number" });
  }
  if (isValuable() && document.getElementById("shelf-code").value.trim() === "") {
    errors.push({ inputId: "shelf-code", message: "Enter the shelf code" });
  }
  return errors;
}

// marks the failed fields and focuses the error summary
function showErrors(errors) {
  for (const error of errors) {
    document.getElementById(error.inputId).setAttribute("aria-invalid", "true");
    const message = document.getElementById(error.inputId + "-error");
    document.getElementById(error.inputId + "-error-text").textContent = error.message;
    message.hidden = false;
  }
  let listHtml = "";
  for (const error of errors) {
    listHtml += `<li><a href="#${error.inputId}">${error.message}</a></li>`;
  }
  document.getElementById("error-summary-list").innerHTML = listHtml;
  const summary = document.getElementById("error-summary");
  summary.hidden = false;
  summary.focus();
}

// removes every field error and hides the summary
function clearAllErrors() {
  const inputIds = ["item-name", "category", "found-location", "found-date", "serial-number", "shelf-code"];
  for (const inputId of inputIds) {
    clearFieldError(inputId);
  }
  document.getElementById("error-summary").hidden = true;
  document.getElementById("error-summary-list").innerHTML = "";
}

// gathers the field values ready to send
function getFormData() {
  const checkedCondition = document.querySelector("input[name='condition']:checked");
  return {
    item_name: document.getElementById("item-name").value.trim(),
    category: document.getElementById("category").value,
    found_location: document.getElementById("found-location").value,
    found_date: document.getElementById("found-date").value,
    description: document.getElementById("description").value.trim(),
    condition: checkedCondition === null ? "Good" : checkedCondition.value,
    is_fragile: document.getElementById("fragile").checked,
    is_valuable: document.getElementById("valuable").checked,
    is_sealed: document.getElementById("sealed").checked,
    serial_number: isElectronics() ? document.getElementById("serial-number").value.trim() : null,
    shelf_code: isValuable() ? document.getElementById("shelf-code").value.trim() : null,
    logged_by: sessionStorage.getItem("username") || "",
  };
}

// clears the form and makes it ready for the next item
function resetForm() {
  document.getElementById("item-form").reset();
  document.getElementById("found-date").value = getTodayIso();
  const remembered = localStorage.getItem(LOCATION_KEY);
  if (remembered !== null) {
    document.getElementById("found-location").value = remembered;
  }
  updateSerialSection();
  updateShelfSection();
  clearAllErrors();
  document.getElementById("save-button").setAttribute("aria-disabled", "false");
}

// sends the new item to the api and reports the result
async function saveItem() {
  const button = document.getElementById("save-button");
  const status = document.getElementById("form-status");
  button.setAttribute("aria-disabled", "true");
  status.textContent = "Saving";
  try {
    const response = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getFormData()),
    });
    if (response.ok === false) {
      throw new Error("Could not save the item");
    }
    localStorage.setItem(LOCATION_KEY, document.getElementById("found-location").value);
    resetForm();
    status.textContent = "Item logged. Ready for the next one.";
    window.setTimeout(function () {
      document.getElementById("page-heading").focus();
    }, 300);
  } catch (fetchError) {
    button.setAttribute("aria-disabled", "false");
    status.textContent = "";
    document.getElementById("form-error-text").textContent = "Could not save the item. Please try again.";
    document.getElementById("form-error").hidden = false;
  }
}

// checks the form then saves it when no errors remain
function handleSubmit(event) {
  event.preventDefault();
  if (document.getElementById("save-button").getAttribute("aria-disabled") === "true") {
    return;
  }
  document.getElementById("form-error").hidden = true;
  clearAllErrors();
  const errors = getErrors();
  if (errors.length > 0) {
    showErrors(errors);
    return;
  }
  saveItem();
}

// sets the default date and remembered location then binds events
document.getElementById("found-date").value = getTodayIso();
const savedLocation = localStorage.getItem(LOCATION_KEY);
if (savedLocation !== null) {
  document.getElementById("found-location").value = savedLocation;
}
document.getElementById("category").addEventListener("change", updateSerialSection);
document.getElementById("valuable").addEventListener("change", updateShelfSection);
document.getElementById("item-form").addEventListener("submit", handleSubmit);
