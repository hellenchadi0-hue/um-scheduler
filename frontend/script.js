document.title = "Loaded " + new Date().toLocaleTimeString();
 const API_URL = "http://localhost:3000";

// ===== LECTURER SIDE =====

const loginForm = document.getElementById("loginForm");
const dashboard = document.getElementById("dashboard");
const welcomeMsg = document.getElementById("welcomeMsg");
const slotGrid = document.getElementById("slotGrid");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("lecturerName").value;
    const password = document.getElementById("lecturerPassword").value;

    try {
      const response = await fetch(`${API_URL}/api/lecturer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_email: email, password: password })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error);
        return;
      }

      localStorage.setItem("lecturerToken", data.token);
      localStorage.setItem("lecturerId", data.id);
      localStorage.setItem("lecturerName", data.name);

      loginForm.classList.add("hidden");
      dashboard.classList.remove("hidden");
      welcomeMsg.textContent = `Welcome, ${data.name}`;

      loadSlots();
      loadBookings();

    } catch (err) {
      alert("Could not reach the server. Is it running?");
    }
  });
}

async function loadSlots() {
  const lecturerId = localStorage.getItem("lecturerId");

  const response = await fetch(`${API_URL}/api/lecturer/${lecturerId}/slots`);
  const slots = await response.json();

  slotGrid.innerHTML = "";

  if (slots.length === 0) {
    slotGrid.innerHTML = "<p>No open slots yet. Create some below.</p>";
    return;
  }

  slots.forEach((slot) => {
    const slotDiv = document.createElement("div");
    slotDiv.classList.add("slot", "available");
    slotDiv.textContent = slot.day_time;
    slotGrid.appendChild(slotDiv);
  });
}

async function loadBookings() {
  const token = localStorage.getItem("lecturerToken");
  const bookingsList = document.getElementById("bookingsList");

  try {
    const response = await fetch(`${API_URL}/api/lecturer/bookings`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
      bookingsList.innerHTML = "<p>Could not load bookings.</p>";
      return;
    }

    const bookings = await response.json();

    bookingsList.innerHTML = "";

    if (bookings.length === 0) {
      bookingsList.innerHTML = "<p>No bookings yet.</p>";
      return;
    }

    bookings.forEach((b) => {
      const div = document.createElement("div");
      div.classList.add("slot", "booked");
      div.textContent = `${b.day_time} — ${b.student_name} (${b.student_number})`;
      bookingsList.appendChild(div);
    });

  } catch (err) {
    bookingsList.innerHTML = "<p>Error loading bookings — check server.</p>";
  }
}

const createSlotsForm = document.getElementById("createSlotsForm");

if (createSlotsForm) {
  createSlotsForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("lecturerToken");
    const day = document.getElementById("slotDay").value;
    const start = document.getElementById("slotStart").value;
    const end = document.getElementById("slotEnd").value;
    const durationMinutes = document.getElementById("slotDuration").value;

    const response = await fetch(`${API_URL}/api/lecturer/slots/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ day, start, end, durationMinutes: Number(durationMinutes) })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error);
      return;
    }

    alert(`Created ${data.created} slots.`);
    loadSlots();
  });
}

const registerForm = document.getElementById("registerForm");
const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");

if (showRegister) {
  showRegister.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
  });
}

if (showLogin) {
  showLogin.addEventListener("click", (e) => {
    e.preventDefault();
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("regName").value;
    const staff_email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;

    const response = await fetch(`${API_URL}/api/lecturer/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, staff_email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error);
      return;
    }

    alert("Account created! Please sign in.");
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    registerForm.reset();
  });
}

// ===== STUDENT SIDE =====

const studentLoginForm = document.getElementById("studentLoginForm");
const studentRegisterForm = document.getElementById("studentRegisterForm");
const studentDashboard = document.getElementById("studentDashboard");
const studentWelcomeMsg = document.getElementById("studentWelcomeMsg");
const lecturerPicker = document.getElementById("lecturerPicker");
const studentSlotGrid = document.getElementById("studentSlotGrid");

const showStudentRegister = document.getElementById("showStudentRegister");
const showStudentLogin = document.getElementById("showStudentLogin");

if (showStudentRegister) {
  showStudentRegister.addEventListener("click", (e) => {
    e.preventDefault();
    studentLoginForm.classList.add("hidden");
    studentRegisterForm.classList.remove("hidden");
  });
}

if (showStudentLogin) {
  showStudentLogin.addEventListener("click", (e) => {
    e.preventDefault();
    studentRegisterForm.classList.add("hidden");
    studentLoginForm.classList.remove("hidden");
  });
}

if (studentRegisterForm) {
  studentRegisterForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("regStudentName").value;
    const student_number = document.getElementById("regStudentNumber").value;
    const email = document.getElementById("regStudentEmail").value;
    const password = document.getElementById("regStudentPassword").value;

    const response = await fetch(`${API_URL}/api/student/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, student_number, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error);
      return;
    }

    alert("Account created! Please sign in.");
    studentRegisterForm.classList.add("hidden");
    studentLoginForm.classList.remove("hidden");
    studentRegisterForm.reset();
  });
}

if (studentLoginForm) {
  studentLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const student_number = document.getElementById("studentNumber").value;
    const password = document.getElementById("studentPassword").value;

    const response = await fetch(`${API_URL}/api/student/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_number, password })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error);
      return;
    }

    localStorage.setItem("studentToken", data.token);
    localStorage.setItem("studentName", data.name);

    studentLoginForm.classList.add("hidden");
    studentDashboard.classList.remove("hidden");
    studentWelcomeMsg.textContent = `Welcome, ${data.name}`;

    loadLecturerList();
  });
}

async function loadLecturerList() {
  const response = await fetch(`${API_URL}/api/lecturers`);
  const lecturers = await response.json();

  lecturers.forEach((lect) => {
    const option = document.createElement("option");
    option.value = lect.id;
    option.textContent = lect.name;
    lecturerPicker.appendChild(option);
  });
}

if (lecturerPicker) {
  lecturerPicker.addEventListener("change", async () => {
    const lecturerId = lecturerPicker.value;
    studentSlotGrid.innerHTML = "";

    if (!lecturerId) return;

    const response = await fetch(`${API_URL}/api/lecturer/${lecturerId}/slots`);
    const slots = await response.json();

    if (slots.length === 0) {
      studentSlotGrid.innerHTML = "<p>No open slots for this lecturer right now.</p>";
      return;
    }

    slots.forEach((slot) => {
      const slotDiv = document.createElement("div");
      slotDiv.classList.add("slot", "available");
      slotDiv.textContent = slot.day_time;

      slotDiv.addEventListener("click", () => bookSlot(slot.id, lecturerId));

      studentSlotGrid.appendChild(slotDiv);
    });
  });
}

async function bookSlot(slotId, lecturerId) {
  const token = localStorage.getItem("studentToken");

  const response = await fetch(`${API_URL}/api/slots/${slotId}/book`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` }
  });

  const data = await response.json();

  if (!response.ok) {
    alert(data.error);
    return;
  }

  alert("Slot booked successfully!");
  lecturerPicker.dispatchEvent(new Event("change"));
}