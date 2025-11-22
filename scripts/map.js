let map;
let directionsService;
let directionsRenderer;

function arrowClick(event) {
  // Get the current arrow element (the one that was clicked)
  const arrow = event.target;

  // Get the parent <li> element of the arrow (the wrapper that holds the forms)
  const listItem = arrow.closest("li");

  // Find the previous and next <form> elements (forms surrounding the arrow)
  const previousForm = listItem.previousElementSibling.querySelector("form");
  const nextForm = listItem;

  //DEBUG
  if (previousForm) {
    console.log("Previous Form:", previousForm);
  }

  if (nextForm) {
    console.log("Next Form:", nextForm);
  }

  const from = getBuildingCoords(previousForm.querySelector(".location").value);
  console.log(
    "from: " +
      previousForm.querySelector(".location").value +
      previousForm.querySelector(".class-name").value
  );
  const to = getBuildingCoords(nextForm.querySelector(".location").value);
  console.log("to: " + nextForm.querySelector(".location").value);

  const select = listItem.querySelector(".mode-duration-wrapper select");
  const travelMode = getTravelMode(select);
  route(from, to, travelMode, listItem.querySelector(".output-time"));
}

function getBuildingCoords(locationInput) {
  for (const building in BUILDINGS) {
    // Check if the location starts with the building name
    if (locationInput.trim().toLowerCase().startsWith(building.toLowerCase())) {
      return BUILDINGS[building];
    }
  }
  return null; // no match
}

function getTravelMode(selectElement) {
  // Get the selected numeric value from the <select>
  const value = selectElement.value;

  switch (value) {
    case "1":
      return google.maps.TravelMode.WALKING;
    case "2":
      return google.maps.TravelMode.BICYCLING;
    case "3":
      return google.maps.TravelMode.DRIVING;
    default:
      console.warn("Unknown travel mode value:", value);
      return google.maps.TravelMode.WALKING;
  }
}

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 16,
    center: { lat: 38.43402431871841, lng: -78.8633940936242 }, // King Hall Coordnates
  });

  // Initialize the Directions Service and Renderer
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();

  // Attach the renderer to your existing map
  directionsRenderer.setMap(map);
}

// 38.43402431871841, -78.8633940936242 -KING
// 38.431346433308136, -78.86144245742665 -E-hALL

//from and to should be formatted as {lat, long} how is google.maps.TravelMode DRIVING, WALKING, BICYCLING, TRANSIT
function route(from, to, how, elem = undefined) {
  const time = document.getElementById("route-time");
  const dist = document.getElementById("route-dist");

  if (elem != undefined) {
    spin(elem);
  }
  spin(time);
  spin(dist);

  // Set a timeout to handle non-responsive API
  const timeoutId = setTimeout(() => {
    // Stop spinners and show error message
    if (elem != undefined) {
      elem.textContent = "Unable to calculate";
    }
    time.textContent = "Google Maps is not responding. Please try again later.";
    dist.textContent = "Route information unavailable";
    console.error("Google Maps API request timed out");
  }, 10000); // 10 second timeout

  // Define your route request
  const request = {
    origin: from,
    destination: to,
    travelMode: how, // DRIVING, WALKING, BICYCLING, TRANSIT
  };

  // Request and display the route
  directionsService.route(request, (result, status) => {
    // Clear the timeout since we got a response
    clearTimeout(timeoutId);

    if (status === "OK") {
      directionsRenderer.setDirections(result);
      const route = result.routes[0].legs[0];
      const distance = route.distance.text; // e.g., "1.2 mi"
      const duration = route.duration.text; // e.g., "5 mins"

      time.textContent = `Total Time: ${duration}`;
      if (elem != undefined) {
        elem.textContent = `${duration}`;
      }
      dist.textContent = `Total Dist: ${distance}`;

      const distanceInMeters = route.distance.value; // e.g., 1932
      const durationInSeconds = route.duration.value; // e.g., 300

      console.log("Distance:", distance);
      console.log("Duration:", duration);
    } else {
      // Handle API errors
      if (elem != undefined) {
        elem.textContent = "0 min";
      }
      time.textContent = `Total Time: 0 min`;
      dist.textContent = `Total Distance: 0 mi`;
      alert("Google Maps appears to not be responding");
      console.error("Directions request failed due to " + status);
    }
  });
}

function getLoadingSpinner() {
  return `
    <div class="spinner-container">
      <div class="spinner"></div>
    </div>

    <style>
      .spinner-container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 10px;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
}

function spin(elem) {
  console.log("spin");
  elem.innerHTML = getLoadingSpinner();
}
// Call initMap when page loads
//window.addEventListener("load",));
