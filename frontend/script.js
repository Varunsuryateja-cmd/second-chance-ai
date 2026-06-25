/* ═══════════════════════════════════════════
   SECOND CHANCE AI — script.js
   ═══════════════════════════════════════════ */

'use strict';

/* ── State ── */
let tasks = JSON.parse(localStorage.getItem('sca_tasks') || '[]');
let darkMode = localStorage.getItem('sca_dark') !== 'false'; // default dark
let activeFilter = 'all';

/* ── DOM refs ── */
const $ = id => document.getElementById(id);
const app         = $('app');
const dateDisplay = $('dateDisplay');
const focusHours  = $('focusHours');
const focusTime   = $('focusTime');
const atRiskCount = $('atRiskCount');
const completionProb = $('completionProb');
const urgentCount = $('urgentCount');
const taskList    = $('taskList');
const allTaskList = $('allTaskList');
const energyBars  = $('energyBars');
const brainInput  = $('brainInput');
const toast       = $('toast');
const coachMessage = $('coachMessage');
const completedCount = $('completedCount');

/* ── Init ── */
function init() {
  applyTheme();
  setDateDisplay();
  renderEnergyBars();
  renderDashboardTasks();
  renderAllTasks();
  renderInsightsChart();
  updateMetrics();
    updateInsights(); 
    generateEnergyForecast();
    const savedPage =
  localStorage.getItem('sca_page') ||
  'dashboard';

navigateTo(savedPage);
  bindEvents();
}
function generateEnergyForecast() {
  const hour = new Date().getHours();

  ENERGY_SLOTS.forEach(slot => {
    if (hour >= 9 && hour <= 12) {
      slot.pct += 10;
    }

    if (hour >= 14 && hour <= 16) {
      slot.pct -= 15;
    }
  });

  renderEnergyBars();
}

/* ── Theme ── */
function applyTheme() {
  document.body.classList.toggle('light', !darkMode);
}

function toggleTheme() {
  darkMode = !darkMode;
  localStorage.setItem('sca_dark', darkMode);
  applyTheme();

  const frame = document.getElementById('calendarFrame');

  if (frame) {
    if (darkMode) {
      frame.src =
        'https://calendar.google.com/calendar/embed?mode=MONTH&bgcolor=%230B0D14';
    } else {
      frame.src =
        'https://calendar.google.com/calendar/embed?mode=MONTH';
    }
  }

  showToast(darkMode ? 'Dark mode on' : 'Light mode on');
}
function updateInsights() {
  const tasks =
    JSON.parse(localStorage.getItem('sca_tasks')) || [];

  const total = tasks.length;

  const completed =
    tasks.filter(task => task.done).length;

  const percent =
    total === 0
      ? 0
      : Math.round((completed / total) * 100);

  const insights =
    document.getElementById('insightsContent');

  if (!insights) return;

  insights.innerHTML = `
    <div class="metric-card">
      <h3>Tasks Completed</h3>
      <h1>${completed}/${total}</h1>
      <p>${percent}% completion rate</p>
    </div>
  `;
}
/* ── Date & Focus ── */
function setDateDisplay() {
  const now = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  dateDisplay.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()} · ${greeting}`;

  const endOfDay = new Date();
  endOfDay.setHours(22, 0, 0, 0);
  const diffMs = endOfDay - now;
  const hoursLeft = Math.max(0, Math.floor(diffMs / 36e5));
  const minsLeft  = Math.max(0, Math.floor((diffMs % 36e5) / 6e4));

  focusHours.textContent = `${hoursLeft}h ${minsLeft}m of focus`;
  focusTime.textContent  = `${hoursLeft}h ${minsLeft}m`;
}

/* ── Energy bars ── */
const ENERGY_SLOTS = [
  { time: '8 am',  level: 'mid',  pct: 55, label: 'mid'  },
  { time: '10 am', level: 'peak', pct: 95, label: 'peak' },
  { time: '12 pm', level: 'mid',  pct: 58, label: 'mid'  },
  { time: '2 pm',  level: 'low',  pct: 28, label: 'low'  },
  { time: '4 pm',  level: 'mid',  pct: 65, label: 'mid'  },
  { time: '6 pm',  level: 'low',  pct: 35, label: 'low'  },
];

const ENERGY_COLORS = { peak: 'var(--violet)', mid: '#9B7CFF88', low: 'var(--border-card)' };
const ENERGY_TEXT   = { peak: 'var(--violet)', mid: 'var(--violet-light)', low: 'var(--text-faint)' };

function renderEnergyBars() {
  energyBars.innerHTML = ENERGY_SLOTS.map(slot => `
    <div class="energy-row">
      <span class="energy-time">${slot.time}</span>
      <div class="energy-bar-bg">
        <div class="energy-bar-fill" style="width:${slot.pct}%;background:${ENERGY_COLORS[slot.level]};"></div>
      </div>
      <span class="energy-tag" style="color:${ENERGY_TEXT[slot.level]};">${slot.label}</span>
    </div>
  `).join('');
}

/* ── Tasks helpers ── */
function saveTasks() {
  localStorage.setItem('sca_tasks', JSON.stringify(tasks));
}

function priorityLevel(p) {
  return p === 'high' ? 0 : p === 'medium' ? 1 : 2;
}

function sortedTasks() {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (priorityLevel(a.priority) !== priorityLevel(b.priority))
      return priorityLevel(a.priority) - priorityLevel(b.priority);
    return new Date(a.deadline) - new Date(b.deadline);
  });
}

function filteredTasks() {
  const all = sortedTasks();
  if (activeFilter === 'all') return all;
  return all.filter(t => t.priority === activeFilter);
}

function deadlineLabel(deadline) {
  if (!deadline) return 'No deadline';
  const diff = new Date(deadline) - new Date();
  const h = Math.round(diff / 36e5);
  if (h < 0)   return 'Overdue';
  if (h < 1)   return 'Due < 1h';
  if (h < 24)  return `Due in ${h}h`;
  const d = Math.round(h / 24);
  return `Due in ${d}d`;
}

function dotClass(priority) {
  return priority === 'high' ? 'urgent' : priority === 'medium' ? 'medium' : 'low';
}

function badgeClass(priority) {
  return priority === 'high' ? 'badge-red' : priority === 'medium' ? 'badge-amber' : 'badge-violet';
}

/* ── Render dashboard task list (top 3) ── */
function renderDashboardTasks() {
  const top = sortedTasks().filter(t => !t.done).slice(0, 4);
  if (top.length === 0) {
    taskList.innerHTML = `
      <div style="text-align:center;padding:24px 0;color:var(--text-faint);font-size:13px;">
        No tasks yet — add one in the Tasks tab
      </div>`;
    return;
  }
  taskList.innerHTML = top.map(t => `
    <div class="task-item">
      <div class="task-dot ${dotClass(t.priority)}"></div>
      <div class="task-info">
        <div class="task-name ${t.done ? 'done' : ''}">${escHtml(t.title)}</div>
        <div class="task-meta">${deadlineLabel(t.deadline)}${t.hours ? ' · ' + t.hours + 'h est.' : ''}</div>
      </div>
      <span class="badge ${badgeClass(t.priority)}">${deadlineLabel(t.deadline)}</span>
    </div>
  `).join('');
}

/* ── Render full task list ── */
function renderAllTasks() {
  const list = filteredTasks();
  if (list.length === 0) {
    allTaskList.innerHTML = `
      <div style="text-align:center;padding:32px 0;color:var(--text-faint);font-size:13px;">
        No tasks here — add one above
      </div>`;
    return;
  }
  allTaskList.innerHTML = list.map(t => `
    <div class="task-item" data-id="${t.id}">
      <div class="task-dot ${dotClass(t.priority)}"></div>
      <div class="task-info">
        <div class="task-name ${t.done ? 'done' : ''}">${escHtml(t.title)}</div>
        <div class="task-meta">
          ${deadlineLabel(t.deadline)}${t.hours ? ' · ' + t.hours + 'h est.' : ''}
          ${t.priority ? ' · ' + t.priority : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn done-btn" data-id="${t.id}" title="${t.done ? 'Mark incomplete' : 'Mark done'}" aria-label="${t.done ? 'Mark incomplete' : 'Mark done'}">
          <i class="ti ${t.done ? 'ti-rotate-clockwise' : 'ti-check'}"></i>
        </button>
        <button class="task-action-btn del-btn" data-id="${t.id}" title="Delete task" aria-label="Delete task">
          <i class="ti ti-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

/* ── Metrics ── */
function updateMetrics() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const atRisk  = tasks.filter(t => !t.done && isAtRisk(t)).length;
  const prob    = total === 0 ? 0 : Math.round(((total - atRisk) / total) * 100);

  completionProb.textContent = total === 0 ? '—' : prob + '%';
  atRiskCount.textContent    = atRisk;
  urgentCount.textContent    = atRisk + ' urgent';
  if (completedCount) completedCount.textContent = done;

  const coachRisk = tasks.filter(t => !t.done && isAtRisk(t));
  if (coachRisk.length > 0) {
    coachMessage.textContent = `${coachRisk.length} task${coachRisk.length > 1 ? 's' : ''} at risk today. Your deadline window is tight — run Rescue Mode?`;
  } else if (total === 0) {
    coachMessage.textContent = 'No tasks yet. Add something to get started.';
  } else {
    coachMessage.textContent = "You're on track. Keep the momentum going!";
  }
}

function isAtRisk(task) {
  if (!task.deadline) return false;
  const diff = new Date(task.deadline) - new Date();
  const hoursLeft = diff / 36e5;
  return hoursLeft < (task.hours || 1) * 1.5;
}

/* ── Add task ── */
function addTask() {
  const title    = $('newTaskTitle').value.trim();
  const deadline = $('newTaskDeadline').value;
  const hours    = parseFloat($('newTaskHours').value) || null;
  const priority = $('newTaskPriority').value || 'medium';

  if (!title) { showToast('Please enter a task title'); return; }

  const task = {
    id:       Date.now(),
    title,
    deadline,
    hours,
    priority,
    done:     false,
    created:  new Date().toISOString(),
  };

  tasks.unshift(task);
  saveTasks();
  renderDashboardTasks();
  renderAllTasks();
  renderInsightsChart();
  updateMetrics();
  updateInsights(); 

  $('newTaskTitle').value    = '';
  $('newTaskDeadline').value = '';
  $('newTaskHours').value    = '';
  $('newTaskPriority').value = '';

  showToast('Task added');
}

/* ── Toggle done ── */
function toggleDone(id) {
  const t = tasks.find(t => t.id === Number(id));
  if (!t) return;
  t.done = !t.done;
  saveTasks();
  updateInsights();
  renderDashboardTasks();
  renderAllTasks();
  renderInsightsChart();
  updateMetrics();
  updateInsights();
  showToast(t.done ? 'Marked complete ✓' : 'Marked incomplete');
}
function startVoice() {
  if (!('webkitSpeechRecognition' in window)) {
    showToast('Voice recognition not supported');
    return;
  }

  const recognition =
    new webkitSpeechRecognition();

  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();

  recognition.onresult = function (event) {
    const text =
      event.results[0][0].transcript;

    brainInput.value = text;

    showToast('Voice captured!');
  };

  recognition.onerror = function () {
    showToast('Voice recognition failed');
  };
}

/* ── Delete task ── */
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== Number(id));
  saveTasks();
  renderDashboardTasks();
  renderAllTasks();
  updateMetrics();
  showToast('Task deleted');
}

/* ── Brain dump → tasks ── */
function convertBrainDump() {
  const text = brainInput.value.trim();
  if (!text) { showToast('Write something in the brain dump first'); return; }

  showToast('Parsing your brain dump...');

  const lines = text.split(/[.,\n]+/).map(s => s.trim()).filter(s => s.length > 4);
  const deadlineWords = { today: 0, tomorrow: 1, friday: daysUntil(5), thursday: daysUntil(4), wednesday: daysUntil(3), monday: daysUntil(1) };

  lines.forEach(line => {
    let deadline = '';
    let priority = 'medium';

    for (const [word, daysAhead] of Object.entries(deadlineWords)) {
      if (line.toLowerCase().includes(word)) {
        const d = new Date();
        d.setDate(d.getDate() + daysAhead);
        d.setHours(23, 59, 0, 0);
        deadline = d.toISOString().slice(0, 16);
        break;
      }
    }

    if (/urgent|asap|now|critical|submit|ship/i.test(line)) priority = 'high';
    else if (/maybe|someday|eventually/i.test(line)) priority = 'low';

    const task = {
      id:      Date.now() + Math.random(),
      title:   line.charAt(0).toUpperCase() + line.slice(1),
      deadline,
      hours:   null,
      priority,
      done:    false,
      created: new Date().toISOString(),
    };

    tasks.unshift(task);
  });

  saveTasks();
  brainInput.value = '';
  renderDashboardTasks();
  renderAllTasks();
  updateMetrics();
  showToast(`Added ${lines.length} task${lines.length > 1 ? 's' : ''} from brain dump`);
}

function daysUntil(targetDay) {
  const today = new Date().getDay();
  return ((targetDay - today + 7) % 7) || 7;
}

/* ── Page navigation ── */
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = $(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  localStorage.setItem('sca_page', page);
}
function renderInsightsChart() {
    const tasks =
        JSON.parse(
            localStorage.getItem('sca_tasks')
        ) || [];

    const completed =
        tasks.filter(t => t.done).length;

    const pending =
        tasks.length - completed;

    const ctx =
        document
        .getElementById('completionChart');

    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',

        data: {
            labels: [
                'Completed',
                'Pending'
            ],

            datasets: [{
                data: [
                    completed,
                    pending
                ],

                backgroundColor: [
                    '#8b5cf6',
                    '#ff6b35'
                ],

                borderWidth: 0
            }]
        },

        options: {
            plugins: {
                legend: {
                    labels: {
                        color: 'white'
                    }
                }
            }
        }
    });
}

/* ── Toast ── */
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ── Utility ── */
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Event bindings ── */
function bindEvents() {
  /* Nav links */
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  /* Theme toggles */
  $('darkToggle').addEventListener('click', toggleTheme);
  $('darkToggleSettings')?.addEventListener('click', toggleTheme);

  /* Brain dump */
  $('convertBtn').addEventListener('click', convertBrainDump);

 $('voiceBtn').addEventListener(
  'click',
  startVoice
);

  /* Rescue mode */
  $('rescueBtn').addEventListener('click', () => {
    const atRisk = tasks.filter(t => !t.done && isAtRisk(t));
    if (atRisk.length === 0) { showToast('No tasks at risk right now'); return; }
    atRisk.forEach(t => { t.priority = 'high'; });
    saveTasks();
    renderAllTasks();
    renderDashboardTasks();
    updateMetrics();
    showToast(`Rescue Mode: ${atRisk.length} task${atRisk.length > 1 ? 's' : ''} set to high priority`);
  });

  /* Add task button (Tasks page) */
  $('addTaskSubmit').addEventListener('click', addTask);
  $('newTaskTitle').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

  /* Add task shortcut from dashboard */
  $('addTaskBtn').addEventListener('click', () => navigateTo('tasks'));

  /* Task list delegation (allTaskList) */
  allTaskList.addEventListener('click', e => {
    const doneBtn = e.target.closest('.done-btn');
    const delBtn  = e.target.closest('.del-btn');
    if (doneBtn) toggleDone(doneBtn.dataset.id);
    if (delBtn)  deleteTask(delBtn.dataset.id);
  });

  /* Filter buttons */
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderAllTasks();
    });
  });

  /* Clear tasks */
  $('clearTasksBtn')?.addEventListener('click', () => {
    if (!confirm('Clear all tasks? This cannot be undone.')) return;
    tasks = [];
    saveTasks();
    renderDashboardTasks();
    renderAllTasks();
    updateMetrics();
    showToast('All tasks cleared');
  });

  /* Username save */
  $('usernameInput')?.addEventListener('change', e => {
    localStorage.setItem('sca_username', e.target.value);
    showToast('Name saved');
  });
}

/* ── Bootstrap ── */
document.addEventListener('DOMContentLoaded', init);