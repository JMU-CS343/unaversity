class EventData {
    constructor(name, number, location, start, end){
        this.name = name;
        this.number = number;
        this.location = location;
        this.start = start;
        this.end = end;
    }
}

function createEventHtml(eventData){
   const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
   
   
   
    const infoDiv = document.createElement("div");
    infoDiv.innerHTML = `
    <h6 class="mb-1">${eventData.name}</h6>
    <p class="mb-1">${eventData.number}</p>
    <small class="text-muted">${eventData.location}</small>`;

  // Right side (time badge)
  const timeDiv = document.createElement("div");
  timeDiv.innerHTML = `
    <span class="badge bg-primary rounded-pill">
      ${eventData.start} – ${eventData.end}
    </span>
  `;

  // Combine
  li.appendChild(infoDiv);
  li.appendChild(timeDiv);

  return li;
} 



function appendClass(eventData) {
    const eventsList = document.getElementById("events-list");
    const li = createEventListItem(eventData);
    eventsList.appendChild(li);
}

function debug(){
    
}