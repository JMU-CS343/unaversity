class EventData {
  constructor(name, number, location, start, end) {
    this.name = name;
    this.number = number;
    this.location = location;
    this.start = start;
    this.end = end;
  }

  toString() {
    return `Event: ${this.name} (Number: ${this.number}), Location: ${this.location}, Start: ${this.start}, End: ${this.end}`;
  }
}

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
    body.innerHTML = "Could Not Read your file correctly please try again";
  } else {
    const reader = new FileReader();
    reader.onload = function (e) {
      const icsContent = e.target.result;
      const week = parseICSForWeeklySchedule(icsContent);

      // Set modal body content
      title.textContent = "Success!";
      let result = "";

      week.forEach((day, dayIndex) => {
        result += `Day ${dayIndex + 1}:<br>`;
        if (day.length === 0) {
          result += "&nbsp;&nbsp;No events<br>";
        } else {
          day.forEach((event) => {
            result += `&nbsp;&nbsp;${event.name} (#${event.number}) at ${event.start}<br>`;
          });
        }
      });

      body.innerHTML = result;
    };

    //this calls onload function we set for the reader
    reader.readAsText(file);
  }

  // Reset file input so same file can be selected again
  event.target.value = "";
}

function parseICSForWeeklySchedule(icsText) {
  const events = [];
  const eventBlocks = icsText.split("BEGIN:VEVENT");

  eventBlocks.slice(1).forEach((block) => {
    const lines = block.split("\n");
    const event = {};

    lines.forEach((line) => {
      if (line.startsWith("SUMMARY:")) {
        event.title = line.replace("SUMMARY:", "").trim();
      }
      if (line.startsWith("DTSTART")) {
        event.start = parseICSDate(line);
      }
      if (line.startsWith("DTEND")) {
        event.end = parseICSDate(line);
      }
      if (line.startsWith("LOCATION:")) {
        event.location = line.replace("LOCATION:", "").trim();
      }
      if (line.startsWith("RRULE:")) {
        event.rrule = line.replace("RRULE:", "").trim();
      }
    });

    if (event.start) events.push(event);
  });

  return convertToWeeklySchedule(events);
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
  // Initialize 7-day array (Sunday=0 to Saturday=6)
  const weeklySchedule = [[], [], [], [], [], [], []];
  const seenClasses = new Set();

  // Sort events by date
  events.sort((a, b) => a.start - b.start);

  for (const event of events) {
    if (!event.start || !event.end) continue;

    const dayOfWeek = event.start.getDay();
    const startTime = formatTime(event.start);
    const endTime = formatTime(event.end);

    // Create unique key for this class slot
    const classKey = `${dayOfWeek}-${startTime}-${event.title}`;

    // If we've seen this exact class before, we've completed the loop!
    if (seenClasses.has(classKey)) {
      break; // EXIT - we have a full week
    }

    seenClasses.add(classKey);

    // Extract course number from title if it exists (e.g., "CS 240" from "CS 240 - Data Structures")
    const courseNumber = extractCourseNumber(event.title);

    // Create EventData object
    const eventData = new EventData(
      event.title || "Untitled Event",
      courseNumber,
      event.location || "",
      startTime,
      endTime
    );

    weeklySchedule[dayOfWeek].push(eventData);
  }

  // Sort classes by start time for each day
  weeklySchedule.forEach((dayEvents) => {
    dayEvents.sort((a, b) => {
      return timeToMinutes(a.start) - timeToMinutes(b.start);
    });
  });

  return weeklySchedule;
}

function extractCourseNumber(title) {
  // Try to extract course number patterns like "CS 240", "MATH 231", etc.
  const match = title.match(/([A-Z]{2,4})\s*(\d{3})/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return "";
}

function formatTime(date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12

  const minutesStr = minutes < 10 ? "0" + minutes : minutes;

  return `${hours}:${minutesStr} ${ampm}`;
}

function timeToMinutes(timeStr) {
  // Convert "9:30 AM" to minutes since midnight for sorting
  const [time, period] = timeStr.split(" ");
  const [hours, minutes] = time.split(":").map(Number);

  let totalMinutes = minutes;
  if (period === "PM" && hours !== 12) {
    totalMinutes += (hours + 12) * 60;
  } else if (period === "AM" && hours === 12) {
    totalMinutes += 0;
  } else {
    totalMinutes += hours * 60;
  }

  return totalMinutes;
}
