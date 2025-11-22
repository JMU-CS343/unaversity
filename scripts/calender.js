class EventData {
  constructor(name, number, location, start, end, professor) {
    this.name = name;
    this.number = number || "";

    // Parse location into building + room
    if (typeof location === "string") {
      const parsed = parseLocation(location);
      this.building = parsed.building;
      this.room = parsed.room;
      this.locationUnrecognized = parsed.unrecognized || false;
    } else if (location && typeof location === "object") {
      this.building = location.building || "";
      this.room = location.room || "";
      this.locationUnrecognized = location.unrecognized || false;
    } else {
      this.building = "";
      this.room = "";
      this.locationUnrecognized = false;
    }

    this.start = start;
    this.end = end;
    this.professor = professor || "";
  }

  // Getter for display/storage
  get location() {
    return this.room ? `${this.building} - ${this.room}` : this.building;
  }

  toString() {
    return `Event: ${this.name} (Number: ${this.number}), Professor: ${this.professor}, Location: ${this.location}, Start: ${this.start}, End: ${this.end}`;
  }
}

// ==================== SCHEDULE HELPERS ====================

function getScheduleFromStorage() {
  const stored = localStorage.getItem("weeklySchedule");
  if (!stored) return null;

  try {
    const weeklyData = JSON.parse(stored);
    // Reconstruct EventData objects for each day
    return weeklyData.map((day) =>
      day.map(
        (ev) =>
          new EventData(
            ev.name,
            ev.number,
            {
              building: ev.building,
              room: ev.room,
              unrecognized: ev.locationUnrecognized,
            },
            new Date(ev.start),
            new Date(ev.end),
            ev.professor
          )
      )
    );
  } catch (e) {
    console.error("Error loading schedule from storage:", e);
    return null;
  }
}

function saveScheduleToStorage(schedule) {
  localStorage.setItem("weeklySchedule", JSON.stringify(schedule));
}

function generateQr() {
  const qrContainer = document.getElementById("qr-container");
  qrContainer.innerHTML = getLoadingSpinner();

  const json = localStorage.getItem("weeklySchedule");
  const shareUrl = `https://unaversity.netlify.app/?data=${json}`;

  console.log("URL length:", shareUrl.length);
  console.log(
    "QR API URL:",
    `https://quickchart.io/qr?text=${encodeURIComponent(shareUrl)}&size=600`
  );

  qrContainer.src = `https://quickchart.io/qr?text=${encodeURIComponent(
    shareUrl
  )}&size=300`;
  qrContainer.alt = "QR Code for Schedule";
}

// ==================== LOCATION PARSING ====================

function parseLocation(locationString) {
  if (!locationString || locationString.trim() === "") {
    return { building: "", room: "", unrecognized: false };
  }

  const trimmed = locationString.trim();

  // Check if format is "Building - Room" (user-entered format)
  if (trimmed.includes(" - ")) {
    const [building, room] = trimmed.split(" - ").map((s) => s.trim());
    const recognized = isBuildingRecognized(building);
    return { building, room, unrecognized: !recognized };
  }

  // Check if format is "Building Room" (ICS format like "King Hall 150")
  const parts = trimmed.split(/\s+/);
  const possibleRoom = parts[parts.length - 1];

  // If last part looks like a room number
  if (/^\d+[A-Z]?$/i.test(possibleRoom)) {
    const room = possibleRoom;
    const building = parts.slice(0, -1).join(" ");
    const recognized = isBuildingRecognized(building);
    return { building, room, unrecognized: !recognized };
  }

  // Entire string is the building name
  const recognized = isBuildingRecognized(trimmed);
  return { building: trimmed, room: "", unrecognized: !recognized };
}

function isBuildingRecognized(buildingName) {
  if (!buildingName) return false;

  // Exact match
  if (BUILDINGS[buildingName]) return true;

  // Case-insensitive match
  const upperBuilding = buildingName.toUpperCase();
  for (const knownBuilding in BUILDINGS) {
    if (knownBuilding.toUpperCase() === upperBuilding) {
      return true;
    }
  }

  return false;
}

function getBuildingCoordinates(buildingName) {
  if (BUILDINGS[buildingName]) {
    return BUILDINGS[buildingName];
  }

  // Try case-insensitive match
  const upperBuilding = buildingName.toUpperCase();
  for (const knownBuilding in BUILDINGS) {
    if (knownBuilding.toUpperCase() === upperBuilding) {
      return BUILDINGS[knownBuilding];
    }
  }

  return null;
}

// ==================== FILE HANDLING ====================

function handleFileSelect(event) {
  console.log("handleFileSelect called", event.target.files);
  const file = event.target.files[0];
  const modal = document.getElementById("parseReportModal");
  const body = document.querySelector("#parseReportModal .modal-body");
  const title = document.querySelector("#parseReportModal .modal-title");

  if (!modal || !body || !title) {
    console.error("Modal elements not found!");
    return;
  }

  body.innerHTML = getLoadingSpinner();
  const parseReportModal = new bootstrap.Modal(modal);
  parseReportModal.show();

  if (!file) {
    title.textContent = "Error!";
    body.innerHTML = "Could not read your file correctly. Please try again.";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const icsContent = e.target.result;
      console.log("ICS content loaded, length:", icsContent.length);
      const week = parseICSForWeeklySchedule(icsContent);

      title.textContent = "Import Successful!";
      let result =
        "<div class='alert alert-success'>Your schedule has been imported!</div>";

      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      week.forEach((day, dayIndex) => {
        if (day.length > 0) {
          result += `<strong>${dayNames[dayIndex]}:</strong><br>`;
          day.forEach((event) => {
            const startTime = formatTime(event.start);
            result += `&nbsp;&nbsp;• ${event.name} ${
              event.number ? "(#" + event.number + ")" : ""
            } at ${startTime}<br>`;
          });
        }
      });

      body.innerHTML = result;

      setTimeout(() => {
        displayClasses();
        parseReportModal.hide();
      }, 2000);
    } catch (error) {
      console.error("Error processing ICS file:", error);
      title.textContent = "Error!";
      body.innerHTML = `<div class='alert alert-danger'>Failed to parse file: ${error.message}</div>`;
    }
  };

  reader.onerror = function (error) {
    console.error("FileReader error:", error);
    title.textContent = "Error!";
    body.innerHTML =
      "<div class='alert alert-danger'>Failed to read file.</div>";
  };

  reader.readAsText(file);
  event.target.value = "";
}

function getLoadingSpinner() {
  return `
    <div class="text-center">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2">Processing your file...</p>
    </div>`;
}

// ==================== DISPLAY FUNCTIONS ====================

function displayClasses() {
  const list = document.getElementById("class-list");
  if (!list) {
    console.error("class-list element not found!");
    return;
  }

  list.innerHTML = "";

  const schedule = getScheduleFromStorage();
  if (!schedule) return;

  const dayMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  const hash = window.location.hash.slice(1).toLowerCase();
  const dayIndex = dayMap[hash] || new Date().getDay();
  const todayClasses = schedule[dayIndex];

  if (!todayClasses || todayClasses.length === 0) {
    const li = document.createElement("li");
    li.id = "class-placeholder-text";
    li.innerHTML =
      '<p class="text-muted text-center py-4">No classes scheduled for this day</p>';
    list.appendChild(li);
    return;
  }

  todayClasses.forEach((event, index) => {
    const li = document.createElement("li");
    const startTime24 = convertTo24Hour(event.start);
    const endTime24 = convertTo24Hour(event.end);
    const isFirst = list.children.length === 0;

    // Add warning class if building is unrecognized
    const locationClass = event.locationUnrecognized
      ? "location location-warning"
      : "location";
    const warningMessage = event.locationUnrecognized
      ? '<div class="location-warning-message">⚠️ Building not recognized!</div>'
      : "";

    li.innerHTML = `
      ${
        isFirst
          ? ""
          : `
      <div class="mode-duration-wrapper">
        <select class="form-select mode-duration" aria-label="Select mode">
          <option class="mode-option" value="1">Walk</option>
          <option class="mode-option" value="2">Bike</option>
          <option class="mode-option" value="3">Drive</option>
        </select>
        <img class="route-arrow" onclick="arrowClick(event)" src="../assets/Arrow.png">
        <div class="mode-duration output-time">0 min</div>
      </div>
      `
      }
      <form data-event-index="${index}">
        <input type="text" class="class-name" name="class-name" value="${escapeHtml(
          event.name
        )}" placeholder="Class name">
        <input type="text" class="prof-name" name="prof-name" value="${escapeHtml(
          event.professor
        )}" placeholder="Professor">
        <input type="time" class="time" name="start-time" value="${startTime24}">
        <input type="time" class="time" name="end-time" value="${endTime24}">
        <div class="location-wrapper">
          <input type="text" class="${locationClass}" name="location" value="${escapeHtml(
      event.location
    )}" placeholder="Location" list="buildings">
          ${warningMessage}
        </div>
        <button class="delete-class" type="button">-</button>
      </form>`;
    list.appendChild(li);
  });

  // Add event listeners for form changes
  attachFormListeners();
}

// ==================== SAVE CHANGES TO LOCALSTORAGE ====================

function attachFormListeners() {
  const list = document.getElementById("class-list");
  if (!list) return;

  list.addEventListener("input", function (e) {
    if (e.target.matches("input.class-name, input.prof-name, input.time")) {
      saveScheduleChanges();
    }

    // Validate location on input
    if (e.target.matches("input.location")) {
      validateLocationInput(e.target);
      saveScheduleChanges();
    }
  });

  // Also validate on blur
  list.addEventListener(
    "blur",
    function (e) {
      if (e.target.matches("input.location")) {
        validateLocationInput(e.target);
      }
    },
    true
  );
}

function validateLocationInput(input) {
  const value = input.value.trim();
  const wrapper = input.closest(".location-wrapper") || input.parentElement;
  let warningMsg = wrapper.querySelector(".location-warning-message");

  if (!value) {
    input.classList.remove("location-warning");
    if (warningMsg) warningMsg.remove();
    return;
  }

  const parsed = parseLocation(value);

  if (parsed.unrecognized) {
    input.classList.add("location-warning");

    // Add warning message if it doesn't exist
    if (!warningMsg) {
      warningMsg = document.createElement("div");
      warningMsg.className = "location-warning-message";
      warningMsg.textContent = "⚠️ Building not recognized!";
      wrapper.appendChild(warningMsg);
    }
  } else {
    input.classList.remove("location-warning");
    if (warningMsg) warningMsg.remove();

    // Normalize the format
    if (parsed.room) {
      input.value = `${parsed.building} - ${parsed.room}`;
    }
  }
}

function saveScheduleChanges() {
  const list = document.getElementById("class-list");
  let schedule = getScheduleFromStorage();

  // Initialize empty schedule if none exists
  if (!schedule) {
    schedule = [[], [], [], [], [], [], []];
  }

  if (!list) return;

  const dayMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  const hash = window.location.hash.slice(1).toLowerCase();
  const dayIndex = dayMap[hash] ?? new Date().getDay();

  const forms = list.querySelectorAll("form");
  const updatedClasses = [];

  forms.forEach((form, index) => {
    const className = form.querySelector(".class-name").value;
    const profName = form.querySelector(".prof-name").value;
    const locationInput = form.querySelector(".location");
    const location = locationInput.value;
    const startTime = form.querySelector('input[name="start-time"]').value;
    const endTime = form.querySelector('input[name="end-time"]').value;

    const startDate = convertTimeToDate(startTime, dayIndex);
    const endDate = convertTimeToDate(endTime, dayIndex);

    updatedClasses.push(
      new EventData(
        className,
        schedule[dayIndex][index]?.number || "",
        location,
        startDate,
        endDate,
        profName
      )
    );
  });

  schedule[dayIndex] = updatedClasses;
  saveScheduleToStorage(schedule);
  console.log("Schedule saved to localStorage");
}

function convertTimeToDate(timeString, dayOfWeek) {
  // Create a date for the given day of week with the specified time
  const today = new Date();
  const currentDay = today.getDay();
  const diff = dayOfWeek - currentDay;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);

  const [hours, minutes] = timeString.split(":");
  targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  return targetDate;
}

// ==================== TIME CONVERSION FUNCTIONS ====================

function convertTo24Hour(time) {
  if (time instanceof Date) {
    const hours = String(time.getHours()).padStart(2, "0");
    const minutes = String(time.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  if (typeof time === "string") {
    const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return "00:00";

    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  return "00:00";
}

function formatTime(date) {
  if (!(date instanceof Date)) {
    if (typeof date === "string" && date.match(/\d{1,2}:\d{2}\s*(AM|PM)/i)) {
      return date;
    }
    return "12:00 AM";
  }

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours ? hours : 12;

  const minutesStr = minutes < 10 ? "0" + minutes : minutes;

  return `${hours}:${minutesStr} ${ampm}`;
}

function timeToMinutes(time) {
  if (time instanceof Date) {
    return time.getHours() * 60 + time.getMinutes();
  }

  const timeStr = typeof time === "string" ? time : formatTime(time);
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) {
    hours += 12;
  } else if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

// ==================== ICS PARSING ====================

function parseICSForWeeklySchedule(icsText) {
  const events = [];
  const eventBlocks = icsText.split("BEGIN:VEVENT");

  eventBlocks.slice(1).forEach((block) => {
    const lines = block.split(/\r?\n/);
    let title = "";
    let start = null;
    let end = null;
    let location = "";

    lines.forEach((lineRaw) => {
      const line = lineRaw.trim();
      if (!line) return;

      if (line.startsWith("SUMMARY:")) {
        title = line.replace("SUMMARY:", "").trim();
      } else if (line.startsWith("DTSTART")) {
        start = parseICSDate(line);
      } else if (line.startsWith("DTEND")) {
        end = parseICSDate(line);
      } else if (line.startsWith("LOCATION:")) {
        location = line.replace("LOCATION:", "").trim();
      }
    });

    if (start) {
      const courseNumber = extractCourseNumber(title);
      const ev = new EventData(
        title || "Untitled Event",
        courseNumber,
        location || "",
        start,
        end,
        ""
      );
      events.push(ev);
    }
  });

  events.sort((a, b) => a.start - b.start);
  localStorage.setItem("lastClass", JSON.stringify(events[events.length - 1]));

  const weeklySchedule = convertToWeeklySchedule(events);
  saveScheduleToStorage(weeklySchedule);

  return weeklySchedule;
}

function parseICSDate(line) {
  const match = line.match(/(\d{8}T\d{6})/);
  if (match) {
    const dateStr = match[1];
    const year = dateStr.substr(0, 4);
    const month = dateStr.substr(4, 2);
    const day = dateStr.substr(6, 2);
    const hour = dateStr.substr(9, 2);
    const minute = dateStr.substr(11, 2);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
  }
  return null;
}

function convertToWeeklySchedule(events) {
  const weeklySchedule = [[], [], [], [], [], [], []];
  const seenClasses = new Set();
  let count = 0;

  for (const event of events) {
    if (!event.start || !event.end) continue;

    const dayOfWeek = event.start.getDay();
    const startTime = formatTime(event.start);
    const classKey = `${dayOfWeek}-${startTime}-${event.name}`;

    if (seenClasses.has(classKey)) {
      break;
    }

    seenClasses.add(classKey);
    weeklySchedule[dayOfWeek].push(event);
    count++;
  }

  weeklySchedule.forEach((dayEvents) => {
    dayEvents.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  });
  localStorage.setItem("classCount", count);
  return weeklySchedule;
}

function extractCourseNumber(title) {
  const match = title.match(/([A-Z]{2,4})\s*(\d{3})/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return "";
}

// ==================== UTILITY FUNCTIONS ====================

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==================== INITIALIZATION ====================

window.addEventListener("hashchange", displayClasses);

window.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, displaying classes");

  // Create datalist for building autocomplete
  if (!document.getElementById("buildings")) {
    const datalist = document.createElement("datalist");
    datalist.id = "buildings";
    Object.keys(BUILDINGS)
      .sort()
      .forEach((building) => {
        const option = document.createElement("option");
        option.value = building;
        datalist.appendChild(option);
      });
    document.body.appendChild(datalist);
  }

  displayClasses();
});
