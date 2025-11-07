class EventData {
  constructor(name, number, location, start, end, professor) {
    this.name = name;
    this.number = number || "";
    this.location = location || "";
    this.start = start;
    this.end = end;
    this.professor = professor || "";
  }

  toString() {
    return `Event: ${this.name} (Number: ${this.number}), Professor: ${this.professor}, Location: ${this.location}, Start: ${this.start}, End: ${this.end}`;
  }
}

let user_schedule = undefined;

// ==================== FILE HANDLING ====================

function handleFileSelect(event) {
  console.log("handleFileSelect called", event.target.files); // DEBUG
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
      console.log("ICS content loaded, length:", icsContent.length); // DEBUG
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

  let schedule = user_schedule;

  if (!schedule) {
    const stored = localStorage.getItem("parsedEvents");
    if (stored) {
      try {
        const events = JSON.parse(stored).map((ev) => {
          return new EventData(
            ev.name,
            ev.number,
            ev.location,
            new Date(ev.start),
            new Date(ev.end),
            ev.professor || ""
          );
        });
        schedule = convertToWeeklySchedule(events);
        user_schedule = schedule;
      } catch (e) {
        console.error("Error loading schedule from storage:", e);
        return;
      }
    }
  }

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
        <img src="../assets/Arrow.png">
        <div class="mode-duration">0 min</div>
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
        <input type="text" class="location" name="location" value="${escapeHtml(
          event.location
        )}" placeholder="Location">
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
    if (
      e.target.matches(
        "input.class-name, input.prof-name, input.location, input.time"
      )
    ) {
      saveScheduleChanges();
    }
  });
}

function saveScheduleChanges() {
  const list = document.getElementById("class-list");
  if (!list || !user_schedule) return;

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
    const location = form.querySelector(".location").value;
    const startTime = form.querySelector('input[name="start-time"]').value;
    const endTime = form.querySelector('input[name="end-time"]').value;

    // Convert time inputs back to Date objects
    const startDate = convertTimeToDate(startTime, dayIndex);
    const endDate = convertTimeToDate(endTime, dayIndex);

    updatedClasses.push(
      new EventData(
        className,
        user_schedule[dayIndex][index]?.number || "",
        location,
        startDate,
        endDate,
        profName
      )
    );
  });

  // Update the schedule
  user_schedule[dayIndex] = updatedClasses;

  // Flatten and save to localStorage
  const allEvents = [];
  user_schedule.forEach((day) => {
    allEvents.push(...day);
  });

  localStorage.setItem("parsedEvents", JSON.stringify(allEvents));
  console.log("Schedule saved to localStorage"); // DEBUG
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
        "" // Professor field empty from ICS import
      );
      events.push(ev);
    }
  });

  localStorage.setItem("parsedEvents", JSON.stringify(events));
  user_schedule = convertToWeeklySchedule(events);
  return user_schedule;
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

  events.sort((a, b) => a.start - b.start);

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
  }

  weeklySchedule.forEach((dayEvents) => {
    dayEvents.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  });

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

// ==================== EVENT LISTENERS ====================

window.addEventListener("hashchange", displayClasses);

window.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, displaying classes"); // DEBUG
  displayClasses();
});
