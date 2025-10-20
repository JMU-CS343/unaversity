let map;
let directionsService;
let directionsRenderer;

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

  document.getElementById("debug-button").addEventListener("click", () => {
    console.log("Debug button clicked");
    route(
      { lat: 38.43402431871841, lng: -78.8633940936242 },
      { lat: 38.431346433308136, lng: -78.86144245742665 },
      google.maps.TravelMode.WALKING
    );
  });
}
// 38.43402431871841, -78.8633940936242 -KING
// 38.431346433308136, -78.86144245742665 -E-hALL

//from and to should be formatted as {lat, long} how is google.maps.TravelMode DRIVING, WALKING, BICYCLING, TRANSIT
function route(from, to, how) {
  const time = document.getElementById("route-time");
  const dist = document.getElementById("route-dist");
  spin(time);
  spin(dist);
  // Define your route request
  const request = {
    origin: from,
    destination: to,
    travelMode: how, // DRIVING, WALKING, BICYCLING, TRANSIT
  };

  // Request and display the route
  directionsService.route(request, (result, status) => {
    if (status === "OK") {
      directionsRenderer.setDirections(result);
      const route = result.routes[0].legs[0];
      const distance = route.distance.text; // e.g., "1.2 mi"
      const duration = route.duration.text; // e.g., "5 mins"
      time.textContent = `Total Time: ${duration}`;
      dist.textContent = `Total Distance: ${distance}`;

      const distanceInMeters = route.distance.value; // e.g., 1932
      const durationInSeconds = route.duration.value; // e.g., 300
      console.log("Distance:", distance);
      console.log("Duration:", duration);
    } else {
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
