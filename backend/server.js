const path = require('path');
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve the website (../frontend) from the same server, so http://localhost:3000 opens it.
app.use(express.static(path.join(__dirname, "..", "frontend")));

const JWT_SECRET = "dev-secret-change-this-later";

app.get("/api/health", (req, res) => {
  res.json({ status: "OfficeHours backend is running" });
});

// LECTURER REGISTRATION

app.post("/api/lecturer/register", (req, res) => {
  const { name, staff_email, password } = req.body;

  if (!name || !staff_email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const password_hash = bcrypt.hashSync(password, 10);

  try {
    const stmt = db.prepare(
      `INSERT INTO lecturers (name, staff_email, password_hash) VALUES (?, ?, ?)`
    );
    const result = stmt.run(name, staff_email, password_hash);
    res.status(201).json({ id: result.lastInsertRowid, name, staff_email });
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "That staff email is already registered." });
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// LECTURER LOGIN

app.post("/api/lecturer/login", (req, res) => {
  const { staff_email, password } = req.body;

  if (!staff_email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const lecturer = db.prepare("SELECT * FROM lecturers WHERE staff_email = ?").get(staff_email);

  if (!lecturer) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const passwordMatches = bcrypt.compareSync(password, lecturer.password_hash);

  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = jwt.sign({ id: lecturer.id, name: lecturer.name }, JWT_SECRET, { expiresIn: "8h" });

  res.json({ token, name: lecturer.name });
});

// STUDENT REGISTRATION

app.post("/api/student/register", (req, res) => {
  const { name, student_number, email, password } = req.body;

  if (!name || !student_number || !email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const password_hash = bcrypt.hashSync(password, 10);

  try {
    const stmt = db.prepare(
      `INSERT INTO students (name, student_number, email, password_hash) VALUES (?, ?, ?, ?)`
    );
    const result = stmt.run(name, student_number, email, password_hash);
    res.status(201).json({ id: result.lastInsertRowid, name, student_number, email });
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "That student number is already registered." });
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// STUDENT LOGIN

app.post("/api/student/login", (req, res) => {
  const { student_number, password } = req.body;

  if (!student_number || !password) {
    return res.status(400).json({ error: "Student number and password are required." });
  }

  const student = db.prepare("SELECT * FROM students WHERE student_number = ?").get(student_number);

  if (!student) {
    return res.status(401).json({ error: "Invalid student number or password." });
  }

  const passwordMatches = bcrypt.compareSync(password, student.password_hash);

  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid student number or password." });
  }

  const token = jwt.sign({ id: student.id, name: student.name }, JWT_SECRET, { expiresIn: "8h" });

  res.json({ token, name: student.name });
});

// LECTURER AUTH MIDDLEWARE

function requireLecturerAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not logged in." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.lecturer = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// STUDENT AUTH MIDDLEWARE

function requireStudentAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not logged in." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.student = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

app.post("/api/lecturer/slots/bulk", requireLecturerAuth, (req, res) => {
  const { day, start, end, durationMinutes } = req.body;
  const lecturerId = req.lecturer.id;

  if (!day || !start || !end || !durationMinutes) {
    return res.status(400).json({ error: "day, start, end, and durationMinutes are required." });
  }

  const toMinutes = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  const duration = Number(durationMinutes);

  if (!Number.isFinite(duration) || duration < 5) {
    return res.status(400).json({ error: "Slot length must be at least 5 minutes." });
  }
  if (!(endMin > startMin)) {
    return res.status(400).json({ error: "End time must be after start time." });
  }

  // don't create the same slot twice
  const existing = new Set(
    db.prepare("SELECT day_time FROM slots WHERE lecturer_id = ?").all(lecturerId).map((r) => r.day_time)
  );

  const insertStmt = db.prepare(
    "INSERT INTO slots (lecturer_id, day_time, status) VALUES (?, ?, 'open')"
  );

  const createdSlots = [];
  let skipped = 0;

  for (let t = startMin; t + duration <= endMin; t += duration) {
    const hours = Math.floor(t / 60).toString().padStart(2, "0");
    const mins = (t % 60).toString().padStart(2, "0");
    const day_time = `${day} ${hours}:${mins}`;

    if (existing.has(day_time)) {
      skipped++;
      continue;
    }

    const result = insertStmt.run(lecturerId, day_time);
    createdSlots.push({ id: result.lastInsertRowid, day_time });
  }

  res.status(201).json({ created: createdSlots.length, skipped, slots: createdSlots });
});

// LIST ALL LECTURERS (public — students pick one to book with)
app.get("/api/lecturers", (req, res) => {
  const lecturers = db.prepare("SELECT id, name FROM lecturers ORDER BY name").all();
  res.json(lecturers);
});

// VIEW OPEN SLOTS FOR A LECTURER (public — no login needed to browse)
app.get("/api/lecturer/:lecturerId/slots", (req, res) => {
  const { lecturerId } = req.params;

  const slots = db
    .prepare("SELECT id, day_time, status FROM slots WHERE lecturer_id = ? AND status = 'open'")
    .all(lecturerId);

  res.json(slots);
});

// VIEW ALL OF MY OWN SLOTS, open and booked (lecturer only)
app.get("/api/lecturer/slots", requireLecturerAuth, (req, res) => {
  const slots = db.prepare(`
    SELECT slots.id, slots.day_time, slots.status,
           students.name AS student_name, students.student_number
    FROM slots
    LEFT JOIN bookings ON bookings.slot_id = slots.id
    LEFT JOIN students ON bookings.student_id = students.id
    WHERE slots.lecturer_id = ?
  `).all(req.lecturer.id);

  res.json(slots);
});

// DELETE ONE OF MY OPEN SLOTS (lecturer only; booked slots can't be deleted)
app.delete("/api/lecturer/slots/:slotId", requireLecturerAuth, (req, res) => {
  const result = db
    .prepare("DELETE FROM slots WHERE id = ? AND lecturer_id = ? AND status = 'open'")
    .run(req.params.slotId, req.lecturer.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Slot not found, or it is already booked." });
  }
  res.json({ message: "Slot deleted." });
});

// BOOK A SLOT (student only, must be logged in)
app.post("/api/slots/:slotId/book", requireStudentAuth, (req, res) => {
  const { slotId } = req.params;
  const studentId = req.student.id;

  const updateResult = db
    .prepare("UPDATE slots SET status = 'booked' WHERE id = ? AND status = 'open'")
    .run(slotId);

  if (updateResult.changes === 0) {
    return res.status(409).json({ error: "Sorry, that slot was just taken." });
  }

  const bookingStmt = db.prepare("INSERT INTO bookings (slot_id, student_id) VALUES (?, ?)");
  bookingStmt.run(slotId, studentId);

  res.status(201).json({ message: "Slot booked successfully." });
});

// VIEW MY BOOKINGS (student only)
app.get("/api/student/bookings", requireStudentAuth, (req, res) => {
  const bookings = db.prepare(`
    SELECT slots.day_time, lecturers.name AS lecturer_name
    FROM bookings
    JOIN slots ON bookings.slot_id = slots.id
    JOIN lecturers ON slots.lecturer_id = lecturers.id
    WHERE bookings.student_id = ?
  `).all(req.student.id);

  res.json(bookings);
});

// VIEW BOOKINGS FOR A LECTURER (lecturer only, must be logged in)
app.get("/api/lecturer/bookings", requireLecturerAuth, (req, res) => {
  const lecturerId = req.lecturer.id;

  const bookings = db.prepare(`
    SELECT slots.day_time, students.name AS student_name, students.student_number
    FROM bookings
    JOIN slots ON bookings.slot_id = slots.id
    JOIN students ON bookings.student_id = students.id
    WHERE slots.lecturer_id = ?
    ORDER BY slots.day_time
  `).all(lecturerId);

  res.json(bookings);
});
// START SERVER

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});