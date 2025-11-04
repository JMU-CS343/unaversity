class EventData {
  constructor(name, number, location, start, end) {
    this.name = name;
    this.number = number || "";
    this.location = location || "";
    // start / end may be Date objects initially, later replaced with formatted strings
    this.start = start;
    this.end = end;
  }

  // Convert stored Date start/end to formatted strings in-place (no new object)
  ensureFormattedTimes() {
    if (this.start instanceof Date && this.end instanceof Date) {
      this.start = formatTime(this.start);
      this.end = formatTime(this.end);
    }
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

    // this calls onload function we set for the reader
    reader.readAsText(file);
  }

  // Reset file input so same file can be selected again
  event.target.value = "";
}

function parseICSForWeeklySchedule(icsText) {
  const events = [];
  const eventBlocks = icsText.split("BEGIN:VEVENT");

  eventBlocks.slice(1).forEach((block) => {
    // normalize line endings and split
    const lines = block.split(/\r?\n/);
    let title = "";
    let start = null;
    let end = null;
    let location = "";
    let rrule = "";

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

    // only keep events that at least have a start
    if (start) {
      const courseNumber = extractCourseNumber(title);
      // Store Date objects in EventData; times will be formatted later in convertToWeeklySchedule
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

  // Sort events by date (events have start as Date)
  events.sort((a, b) => a.start - b.start);

  for (const event of events) {
    // we require both start and end for a proper time slot
    if (!event.start || !event.end) continue;

    // day of week from Date
    const dayOfWeek = event.start.getDay();
    const startTime = formatTime(event.start);
    const endTime = formatTime(event.end);

    // Create unique key for this class slot
    const classKey = `${dayOfWeek}-${startTime}-${event.name}`;

    // If we've seen this exact class before, we've completed the loop!
    if (seenClasses.has(classKey)) {
      break; // EXIT - we have a full week
    }

    seenClasses.add(classKey);

    // update its start/end to formatted strings (in-place) so UI can read them
    if (event.start instanceof Date) {
      event.start = startTime;
      event.end = endTime;
    }

    weeklySchedule[dayOfWeek].push(event);
  }

  // Sort classes by start time for each day (start is now a formatted string like "9:30 AM")
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
    // 12:xx AM is 0:xx
    totalMinutes += 0;
  } else {
    totalMinutes += hours * 60;
  }

  return totalMinutes;
}
