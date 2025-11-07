class EventData {
  constructor(name, number, location, start, end) {
    this.name = name;
    this.number = number || "";
    this.location = location || "";
    this.start = start; // Can be Date or formatted string
    this.end = end;
  }

  toString() {
    return `Event: ${this.name} (Number: ${this.number}), Location: ${this.location}, Start: ${this.start}, End: ${this.end}`;
  }
}

let user_schedule = undefined;


// ==================== FILE HANDLING ====================

function handleFileSelect(event) {
  const file = event.target.files[0];
  const modal = document.getElementById("parseReportModal");
  const body = document.querySelector("#parseReportModal .modal-body");
  const title = document.querySelector("#parseReportModal .modal-title");
  body.innerHTML = getLoadingSpinner();
  const parseReportModal = new bootstrap.Modal(modal);
  parseReportModal.show();

  if (!file) {
    title.textContent = "Error!";
    body.innerHTML = "Could not read your file correctly. Please try again.";
  } else {
    const reader = new FileReader();
    reader.onload = function (e) {
      const icsContent = e.target.result;
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

      // Refresh the display after a short delay
      setTimeout(() => {
        displayClasses();
        parseReportModal.hide();
      }, 2000);
    };

    reader.readAsText(file);
  }

  event.target.value = "";
}

function getLoadingSpinner() {
  return `
    <div class="text-center">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2">Processing your file...</p>
    </div>
  `;
}

// ==================== DISPLAY FUNCTIONS ====================

function displayClasses() {
  const list = document.getElementById("class-list");
  if (!list) return;

  list.innerHTML = ""; // Clear the list

  let schedule = user_schedule;

  // Load from localStorage if not in memory
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
            new Date(ev.end)
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

  // Get day index from URL hash
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
  const todayClasses = schedule[dayIndex];

  if (!todayClasses || todayClasses.length === 0) {
    // Show empty state message
    const li = document.createElement("li");
    li.innerHTML =
      '<p class="text-muted text-center py-4">No classes scheduled for this day</p>';
    list.appendChild(li);
    return;
  }

  todayClasses.forEach((event) => {
    /*
    const li = document.createElement("li");
    const form = document.createElement("form");

    const startTime24 = convertTo24Hour(event.start);
    const endTime24 = convertTo24Hour(event.end);

    form.innerHTML = `
      <input type="text" class="class-name" name="class-name" value="${escapeHtml(
        event.name
      )}" placeholder="Class name">
      <input type="text" class="prof-name" name="prof-name" placeholder="Professor">
      <input type="time" class="time" name="start-time" value="${startTime24}">
      <input type="time" class="time" name="end-time" value="${endTime24}">
      <input type="text" class="location" name="location" value="${escapeHtml(
        event.location
      )}" placeholder="Location">
      <button class="delete-class" type="button">-</button>
    `;
    li.appendChild(form);
    list.appendChild(li);
    */

    const li = document.createElement("li");

    const startTime24 = convertTo24Hour(event.start);
    const endTime24 = convertTo24Hour(event.end);

    li.innerHTML = `
      <div class="mode-duration-wrapper">
        <div class="mode-duration">Walk</div>
        <img src="../assets/Arrow.png">
        <div class="mode-duration">0 min</div>
      </div>
      <form>
        <input type="text" class="class-name" name="class-name" value="${escapeHtml(
          event.name
        )}" placeholder="Class name">
        <input type="text" class="prof-name" name="prof-name" placeholder="Professor">
        <input type="time" class="time" name="start-time" value="${startTime24}">
        <input type="time" class="time" name="end-time" value="${endTime24}">
        <input type="text" class="location" name="location" value="${escapeHtml(
          event.location
        )}" placeholder="Location">
        <button class="delete-class" type="button">-</button>
      </form>
    `;
    list.appendChild(li);

  });
}

// ==================== TIME CONVERSION FUNCTIONS ====================

function convertTo24Hour(time) {
  // Handle if time is already a Date object
  if (time instanceof Date) {
    const hours = String(time.getHours()).padStart(2, "0");
    const minutes = String(time.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  // Handle string format like "9:30 AM" or "2:45 PM"
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
    // If already formatted, return as-is
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
  // Handle Date objects
  if (time instanceof Date) {
    return time.getHours() * 60 + time.getMinutes();
  }

  // Handle string format "9:30 AM"
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
        end
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
      break; // Full week captured
    }

    seenClasses.add(classKey);
    weeklySchedule[dayOfWeek].push(event);
  }

  // Sort each day by start time
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

// Load classes on page load
window.addEventListener("DOMContentLoaded", () => {
  displayClasses();
});
