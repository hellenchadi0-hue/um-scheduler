# OfficeHours — UMP Meeting Scheduler

A web app that lets students book private consultation times with their lecturers, so nobody has to wait outside an office door.

Lecturers publish the times they are free. Students pick a lecturer, choose a free slot and book it. Each slot can only be booked once, and both sides can see the bookings.

## Features

**Lecturers**
- Register and sign in with a staff email
- Create time slots for a day (for example Mon 09:00–10:00 in 15-minute slots)
- See all their slots, free and booked
- Delete free slots
- See which student booked which slot

**Students**
- Register and sign in with a student number
- Choose a lecturer and see their free slots
- Book a slot (a slot that was just taken is rejected, so there are no double bookings)
- See all their own bookings

**Security**
- Passwords are hashed with bcrypt
- Sign-in uses JSON Web Tokens (JWT)
- Passwords must be at least 8 characters with a letter and a number

## Built with

- Node.js and Express (backend)
- SQLite with `better-sqlite3` (database)
- HTML, CSS and JavaScript (frontend, no framework)

## Project structure

```
um-scheduler/
├── backend/
│   ├── server.js        API routes and web server
│   ├── db.js            database connection
│   └── package.json
└── frontend/
    ├── index.html       welcome page
    ├── lecturer.html    lecturer dashboard
    ├── student.html     student booking page
    ├── script.js        lecturer page logic
    ├── student.js       student page logic
    └── style.css
```

## How to run it

You need [Node.js](https://nodejs.org) installed.

```bash
git clone https://github.com/hellenchadi0-hue/um-scheduler.git
cd um-scheduler/backend
npm install
node server.js
```

Then open **http://localhost:3000** in your browser.

The backend also serves the `frontend` folder, so there is nothing else to start. Stop the server with `Ctrl + C`.

## API overview

| Method | Route | Who | What it does |
|--------|-------|-----|--------------|
| POST | `/api/lecturer/register` | Anyone | Create a lecturer account |
| POST | `/api/lecturer/login` | Anyone | Sign in as a lecturer |
| POST | `/api/student/register` | Anyone | Create a student account |
| POST | `/api/student/login` | Anyone | Sign in as a student |
| GET | `/api/lecturers` | Anyone | List lecturers |
| GET | `/api/lecturer/:id/slots` | Anyone | List a lecturer's free slots |
| POST | `/api/lecturer/slots/bulk` | Lecturer | Create slots for a time range |
| GET | `/api/lecturer/slots` | Lecturer | List my slots, free and booked |
| DELETE | `/api/lecturer/slots/:id` | Lecturer | Delete one of my free slots |
| GET | `/api/lecturer/bookings` | Lecturer | See who booked my slots |
| POST | `/api/slots/:id/book` | Student | Book a slot |
| GET | `/api/student/bookings` | Student | See my bookings |

## Current limitations

- The JWT secret in `server.js` is a development placeholder and must be replaced with a private value before real use.
- There is no email verification or password reset yet.
- There is no administrator role yet.

## Roadmap

- [ ] Administrator accounts
- [ ] Email verification for new accounts
- [ ] PINs
- [ ] Cancel a booking
- [ ] Move secrets into environment variables

