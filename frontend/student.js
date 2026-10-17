/* OfficeHours — student page (talks to the backend API) */
(function () {
  const $ = id => document.getElementById(id);
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const TOKEN_KEY = 'oh_student_token';
  const NAME_KEY = 'oh_student_name';

  const loginForm = $('studentLoginForm');
  const registerForm = $('studentRegisterForm');
  const dashboard = $('studentDashboard');

  /* ---------- helpers ---------- */
  function el(tag, attrs, text) {
    const n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => (k === 'class' ? (n.className = attrs[k]) : n.setAttribute(k, attrs[k])));
    if (text !== undefined) n.textContent = text;
    return n;
  }

  async function api(path, options) {
    const opts = options || {};
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers.Authorization = 'Bearer ' + token;
    let res;
    try {
      res = await fetch(path, Object.assign({}, opts, { headers }));
    } catch (e) {
      throw new Error('Cannot reach the server. Is it running at http://localhost:3000 ?');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Request failed (' + res.status + ').');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function say(id, text, ok) {
    const p = $(id);
    p.textContent = text;
    p.className = 'msg ' + (ok ? 'ok' : 'err');
  }

  function show(view) {
    loginForm.classList.toggle('hidden', view !== 'login');
    registerForm.classList.toggle('hidden', view !== 'register');
    dashboard.classList.toggle('hidden', view !== 'dashboard');
  }

  function splitSlot(s) {
    const parts = s.day_time.split(' ');
    return { day: parts[0], time: parts[1] || '' };
  }
  function sortByDayTime(list) {
    return list.slice().sort((a, b) => {
      const x = splitSlot(a), y = splitSlot(b);
      return DAYS.indexOf(x.day) - DAYS.indexOf(y.day) || x.time.localeCompare(y.time);
    });
  }

  function logout(message) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NAME_KEY);
    show('login');
    if (message) say('studentLoginMsg', message);
  }

  function handleError(msgId, err) {
    if (err.status === 401 && !dashboard.classList.contains('hidden')) {
      return logout('Your session expired. Please sign in again.');
    }
    say(msgId, err.message);
  }

  /* ---------- auth ---------- */
  $('showStudentRegister').addEventListener('click', e => { e.preventDefault(); show('register'); });
  $('showStudentLogin').addEventListener('click', e => { e.preventDefault(); show('login'); });

  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const body = {
      name: $('regStuName').value.trim(),
      student_number: $('regStuNumber').value.trim(),
      email: $('regStuEmail').value.trim().toLowerCase(),
      password: $('regStuPassword').value
    };
    if (body.password.length < 6) return say('studentRegisterMsg', 'Password must be at least 6 characters.');
    try {
      await api('/api/student/register', { method: 'POST', body: JSON.stringify(body) });
      registerForm.reset();
      say('studentLoginMsg', 'Account created. Please sign in.', true);
      show('login');
    } catch (err) {
      say('studentRegisterMsg', err.message);
    }
  });

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const body = {
      student_number: $('loginNumber').value.trim(),
      password: $('loginPassword').value
    };
    try {
      const data = await api('/api/student/login', { method: 'POST', body: JSON.stringify(body) });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(NAME_KEY, data.name);
      loginForm.reset();
      $('studentLoginMsg').textContent = '';
      enter();
    } catch (err) {
      say('studentLoginMsg', err.message);
    }
  });

  $('studentLogout').addEventListener('click', () => logout());

  async function enter() {
    $('studentWelcome').textContent = 'Welcome, ' + (localStorage.getItem(NAME_KEY) || 'Student');
    show('dashboard');
    await loadLecturers();
    loadMyBookings();
  }

  /* ---------- lecturers + slots ---------- */
  async function loadLecturers() {
    const sel = $('lecturerSelect');
    sel.textContent = '';
    try {
      const list = await api('/api/lecturers');
      if (!list.length) {
        $('noLecturers').textContent = 'No lecturers have registered yet.';
        $('studentSlots').textContent = '';
        return;
      }
      $('noLecturers').textContent = '';
      list.forEach(l => sel.appendChild(el('option', { value: String(l.id) }, l.name)));
      loadSlots();
    } catch (err) {
      handleError('bookMsg', err);
    }
  }

  async function loadSlots() {
    const grid = $('studentSlots');
    grid.textContent = '';
    const id = $('lecturerSelect').value;
    if (!id) return;
    try {
      const slots = sortByDayTime(await api('/api/lecturer/' + id + '/slots'));
      if (!slots.length) {
        grid.appendChild(el('p', { class: 'hint' }, 'No free slots for this lecturer right now.'));
        return;
      }
      DAYS.forEach(day => {
        const daySlots = slots.filter(s => splitSlot(s).day === day);
        if (!daySlots.length) return;
        const col = el('div', { class: 'day-col' });
        col.appendChild(el('h4', null, day));
        daySlots.forEach(s => {
          const time = splitSlot(s).time;
          const b = el('button', { type: 'button', class: 'slot free' }, time);
          b.addEventListener('click', () => book(s, day, time));
          col.appendChild(b);
        });
        grid.appendChild(col);
      });
    } catch (err) {
      handleError('bookMsg', err);
    }
  }

  $('lecturerSelect').addEventListener('change', () => {
    $('bookMsg').textContent = '';
    loadSlots();
  });

  async function book(slot, day, time) {
    const lecturerName = $('lecturerSelect').selectedOptions[0].textContent;
    if (!confirm('Book ' + day + ' ' + time + ' with ' + lecturerName + '?')) return;
    try {
      await api('/api/slots/' + slot.id + '/book', { method: 'POST' });
      say('bookMsg', 'Booked! ' + day + ' ' + time + ' with ' + lecturerName + '.', true);
    } catch (err) {
      handleError('bookMsg', err);
    }
    loadSlots();
    loadMyBookings();
  }

  /* ---------- my bookings ---------- */
  async function loadMyBookings() {
    const box = $('myBookings');
    box.textContent = '';
    try {
      const list = sortByDayTime(await api('/api/student/bookings'));
      if (!list.length) {
        box.appendChild(el('p', { class: 'hint' }, 'You have no bookings yet.'));
        return;
      }
      const table = el('table');
      const head = el('tr');
      ['Lecturer', 'Day', 'Time'].forEach(h => head.appendChild(el('th', null, h)));
      table.appendChild(head);
      list.forEach(b => {
        const p = splitSlot(b);
        const tr = el('tr');
        [b.lecturer_name, p.day, p.time].forEach(v => tr.appendChild(el('td', null, v)));
        table.appendChild(tr);
      });
      box.appendChild(table);
    } catch (err) {
      handleError('bookMsg', err);
    }
  }

  /* ---------- init ---------- */
  if (localStorage.getItem(TOKEN_KEY)) enter(); else show('login');
})();