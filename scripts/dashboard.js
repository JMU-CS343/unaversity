const nameInput = document.getElementById("name");
const yearInput = document.getElementById("year");
const majorInput = document.getElementById("major");

const profilePicture = document.getElementById("profile-picture");
const pfpInput = document.getElementById("pfp-input");

window.addEventListener('DOMContentLoaded', () => {
    let savedValue = localStorage.getItem('name');
    if (savedValue) {
        nameInput.value = savedValue;
    }
    savedValue = localStorage.getItem('year');
    if (savedValue) {
        yearInput.value = savedValue;
    }
    savedValue = localStorage.getItem('major');
    if (savedValue) {
        majorInput.value = savedValue;
    }
    savedValue = localStorage.getItem('pfp-input');
    if (savedValue) {
        profilePicture.src = savedValue;
    }
});

nameInput.addEventListener('input', () => {
    localStorage.setItem('name', nameInput.value);
});
yearInput.addEventListener('input', () => {
    localStorage.setItem('year', yearInput.value);
});
majorInput.addEventListener('input', () => {
    localStorage.setItem('major', majorInput.value);
});

pfpInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const dataURL = reader.result;
        profilePicture.src = dataURL;
        localStorage.setItem('pfp-input', dataURL);
    };
    reader.readAsDataURL(file);
});


// Countdown
const targetTime = new Date("2026-03-06T00:00:00").getTime();
const countdown = document.getElementById("countdown");

function updateCountdown() {
    const curTime = Date.now();
    const diff = targetTime - curTime;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const isPhone = window.matchMedia("(max-width: 768px)").matches;

    if (isPhone) {
        // Phone view: only show days
        countdown.textContent = `${days}`;
    } else {
        // Larger screens: show full breakdown
        countdown.textContent = `${days}:${hours}:${minutes}:${seconds}`;
    }
}

setInterval(updateCountdown, 1000);
updateCountdown();
