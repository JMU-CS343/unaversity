let map;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 16,
    center: { lat: 38.43402431871841, lng: -78.8633940936242 }, // NYC coordinates
  });
}
// 38.43402431871841, -78.8633940936242

// Call initMap when page loads
window.addEventListener("load", initMap);
