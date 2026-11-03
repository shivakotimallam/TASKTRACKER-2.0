// Initialize Supabase client
if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
  console.error('Supabase config not loaded! Check js/config.js');
  alert('Error: Supabase configuration not loaded. Please ensure js/config.js exists and is being loaded.');
} else {
  try {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
    alert('Error: Failed to initialize Supabase client. ' + error.message);
  }
}

// Global state
let currentUser = null;
let userProfile = null;
let tasks = [];
let taskCompletions = [];
let currentFilter = 'all';
let editingTaskId = null;
let calendarDate = new Date();
let selectedDate = localDateString(new Date());
let templates = [];
let templateTasks = [];
let userEmoji = localStorage.getItem('userEmoji') || '';
let userMessage = localStorage.getItem('userMessage') || '';
let currentTemplate = null;
let editingTemplateTaskId = null;
let goals = [];
let editingGoalId = null;

// Time picker state
let timePickerTarget = null; // 'start' or 'end'
let timePickerMode = 'hour'; // 'hour' or 'minute'
let selectedHour = 9;
let selectedMinute = 0;
let isPM = false;

// Utility functions
function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function escapeHtml(value='') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showAuthError(message) {
  const el = document.getElementById('authError');
  el.textContent = message;
  el.hidden = false;
  document.getElementById('authSuccess').hidden = true;
}

function showAuthSuccess(message) {
  const el = document.getElementById('authSuccess');
  el.textContent = message;
  el.hidden = false;
  document.getElementById('authError').hidden = true;
}

function clearAuthMessages() {
  document.getElementById('authError').hidden = true;
  document.getElementById('authSuccess').hidden = true;
}

function togglePasswordVisibility(inputId, button) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    button.textContent = '👁️';
  } else {
    input.type = 'password';
    button.textContent = '⏿';
  }
}

// Authentication functions
function showAuthMode(mode) {
  clearAuthMessages();
  const login = mode === 'login';
  document.getElementById('loginForm').hidden = !login;
  document.getElementById('signupForm').hidden = login;
  document.getElementById('loginTab').classList.toggle('active', login);
  document.getElementById('signupTab').classList.toggle('active', !login);
}

async function handleSignup(event) {
  
  event.preventDefault();
  clearAuthMessages();

  const fullName = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('signupConfirmPassword').value;

  

  if (!fullName || !email || password.length < 8) {
    return showAuthError('Please enter your name, a valid email, and a password with at least 8 characters.');
  }
  if (password !== confirmPassword) {
    return showAuthError('Passwords do not match.');
  }

  const submitBtn = event.target.querySelector('.auth-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';

  try {
    
    const { data, error } = await window.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    

    if (error) throw error;

    if (data.user && !data.session) {
      showAuthSuccess('Account created! Please check your email to confirm your account, then log in.');
      showAuthMode('login');
    } else if (data.session) {
      showAuthSuccess('Account created successfully!');
      await loadUserData();
      enterApp();
    }
  } catch (error) {
    console.error('Signup error:', error);
    showAuthError(error.message || 'Failed to create account. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
}
//--------------------------------------------------------------------login Page
async function handleLogin(event) {
  event.preventDefault();
  clearAuthMessages();

  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  const submitBtn = event.target.querySelector('.auth-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';

  try {
    const { data, error } = await window.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    showAuthSuccess('Login successful!');
    await loadUserData();
    enterApp();
  } catch (error) {
    showAuthError(error.message || 'Login failed. Please check your credentials.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
}
//-----------------------------------------------------------------------FORGOT PASSWORD
async function handleForgotPassword() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return showAuthError('Please enter your email address first.');
  }

  if (!confirm(`Send password reset link to ${email}?`)) {
    return;
  }

  try {
    const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });

    if (error) throw error;

    showAuthSuccess('Password reset link sent! Check your email to reset your password.');
  } catch (error) {
    showAuthError(error.message || 'Failed to send reset link. Please try again.');
  }
}

async function logout() {
  await window.supabase.auth.signOut();
  currentUser = null;
  userProfile = null;
  tasks = [];
  taskCompletions = [];
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('authScreen').hidden = false;
  showAuthMode('login');
  clearAuthMessages();
}

async function loadUserData() {
  const { data: { user } } = await window.supabase.auth.getUser();
  if (!user) return;

  currentUser = user;

  // Load profile
  const { data: profile } = await window.supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    // Create profile if it doesn't exist
    
    const { error: insertError } = await window.supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || ''
      });

    if (insertError) {
      console.error('Failed to create profile:', insertError);
    } else {
      
    }

    userProfile = {
      full_name: user.user_metadata?.full_name || '',
      email: user.email
    };
  } else {
    userProfile = profile;
  }

  // Load all data in parallel for faster loading
  const [tasksData, completionsData, templatesData, templateTasksData, goalsData] = await Promise.all([
    window.supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    window.supabase.from('task_completions').select('*').eq('user_id', user.id),
    window.supabase.from('templates').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    window.supabase.from('template_tasks').select('*').eq('user_id', user.id).order('start_time', { ascending: true }),
    window.supabase.from('goals').select('*').eq('user_id', user.id).order('deadline', { ascending: true })
  ]);

  tasks = tasksData.data || [];
  taskCompletions = completionsData.data || [];
  templates = templatesData.data || [];
  templateTasks = templateTasksData.data || [];
  goals = goalsData.data || [];

  // Load motivation settings
  loadMotivationSettings();
}

function enterApp() {
  document.getElementById('authScreen').hidden = true;
  document.getElementById('appContainer').style.display = 'flex';
  initializeApp();
}

// Recurrence logic
function taskAppliesOnDate(task, dateString) {
  const taskDate = new Date(dateString);
  const dayName = taskDate.toLocaleDateString('en-US', { weekday: 'long' });

  // Check if date is before start date
  if (dateString < task.start_date) return false;

  // Check if date is after due date
  if (task.due_date && dateString > task.due_date) return false;

  // Check recurrence type
  if (task.recurrence_type === 'daily') return true;
  if (task.recurrence_type === 'custom') {
    return (task.custom_days || []).includes(dayName);
  }
  // Once: only on start date
  return dateString === task.start_date;
}

function getDayTasks(dateString) {
  const applicableTasks = tasks.filter(t => taskAppliesOnDate(t, dateString));

  // Create a map for faster completion lookup (O(1) instead of O(n))
  const completionMap = new Map();
  taskCompletions.forEach(c => {
    if (c.completion_date === dateString) {
      completionMap.set(c.task_id, c.completed);
    }
  });

  const dayTasks = applicableTasks.map(task => {
    return {
      id: task.id,
      text: task.title,
      completed: completionMap.get(task.id) || false,
      priority: task.priority || 'medium',
      recurrence_type: task.recurrence_type,
      custom_days: task.custom_days,
      template_icon_snapshot: task.template_icon_snapshot,
      scheduled_start_time: task.scheduled_start_time,
      scheduled_end_time: task.scheduled_end_time
    };
  });

  // Sort by priority (high → medium → low) and then by time
  dayTasks.sort((a, b) => {
    // First sort by completion status (incomplete first)
    if (a.completed !== b.completed) {
      return Number(a.completed) - Number(b.completed);
    }

    // Then sort by priority (high → medium → low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority] ?? 1;
    const bPriority = priorityOrder[b.priority] ?? 1;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Finally sort by time (earliest first)
    const aTime = a.scheduled_start_time || '23:59';
    const bTime = b.scheduled_start_time || '23:59';
    return aTime.localeCompare(bTime);
  });

  return dayTasks;
}

function getDayStats(dateString) {
  const dayTasks = getDayTasks(dateString);
  const total = dayTasks.length;
  const completed = dayTasks.filter(t => t.completed).length;
  return {
    tasks: dayTasks,
    total,
    completed,
    percentage: total ? Math.round(completed / total * 100) : 0
  };
}

function completionClass(pct) {
  return pct > 75 ? 'green' : pct >= 50 ? 'yellow' : 'red';
}

// Task operations
async function saveTask(taskData) {
  const { data, error } = await window.supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateTask(id, taskData) {
  const { data, error } = await window.supabase
    .from('tasks')
    .update(taskData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteTaskFromDB(id) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

async function saveTaskCompletion(taskId, dateString, completed) {
  const { data, error } = await supabase
    .from('task_completions')
    .upsert({
      task_id: taskId,
      user_id: currentUser.id,
      completion_date: dateString,
      completed
    }, {
      onConflict: 'task_id,completion_date'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// UI Functions
function updateStats() {
  const todays = getDayStats(localDateString());
  document.getElementById('totalTasks').textContent = todays.total;
  document.getElementById('completedTasks').textContent = todays.completed;
  document.getElementById('progressText').textContent = `${todays.percentage}%`;
  document.getElementById('progressFill').style.width = `${todays.percentage}%`;
  document.getElementById('totalStreak').textContent = calculateStreak();
  document.getElementById('totalGoals').textContent = goals.filter(g => !g.completed).length;
  renderConsistencyChart();
}

function calculateStreak() {
  let count = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  while (true) {
    const stats = getDayStats(localDateString(cursor));
    if (!stats.total || stats.percentage <= 75) break;
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function taskMarkup(task, showActions = true, dateString = null) {
  const dateStr = dateString || localDateString();
  const templateIcon = task.template_icon_snapshot || '';
  const scheduledTime = task.scheduled_start_time && task.scheduled_end_time
    ? `${formatTime(task.scheduled_start_time)} - ${formatTime(task.scheduled_end_time)}`
    : '';

  return `<li class="${task.completed ? 'completed' : ''}">
    <div class="task-info">
      <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask('${task.id}', '${dateStr}')" aria-label="Mark ${escapeHtml(task.text)} complete">
      <span class="priority-badge priority-${escapeHtml(task.priority || 'medium')}">${escapeHtml(task.priority || 'medium')}</span>
      ${templateIcon ? `<span class="template-icon-badge">${escapeHtml(templateIcon)}</span>` : ''}
      <span class="task-text">${escapeHtml(task.text)}</span>
      ${scheduledTime ? `<span class="template-time-badge">${escapeHtml(scheduledTime)}</span>` : ''}
      ${task.recurrence_type && task.recurrence_type !== 'once' ? `<span class="repetition-badge">${task.recurrence_type === 'daily' ? 'Daily' : (task.custom_days || []).map(d => d.slice(0, 3)).join(', ')}</span>` : ''}
    </div>
    ${showActions ? `<div class="task-actions">
      <button class="complete-btn" onclick="toggleTask('${task.id}', '${dateStr}')">${task.completed ? 'Undo' : 'Complete'}</button>
      <button class="edit-btn" onclick="openEditTaskModal('${task.id}')">Edit</button>
      <button class="delete-btn" onclick="deleteTask('${task.id}')">Delete</button>
    </div>` : ''}
  </li>`;
}

function renderTasks() {
  const search = (document.getElementById('taskSearch')?.value || '').toLowerCase();
  const dateFilter = document.getElementById('taskDateFilter')?.value || localDateString();
  const todayStr = localDateString();

  let visible = tasks.filter(t => {
    const appliesOnDate = taskAppliesOnDate(t, dateFilter);
    const matchesSearch = (t.title || '').toLowerCase().includes(search);
    const dayTasks = getDayTasks(dateFilter);
    const taskOnDate = dayTasks.find(dt => dt.id === t.id);
    const isCompleted = taskOnDate ? taskOnDate.completed : false;

    if (currentFilter === 'active') return appliesOnDate && matchesSearch && !isCompleted;
    if (currentFilter === 'completed') return matchesSearch && isCompleted;
    return appliesOnDate && matchesSearch;
  });

  visible.sort((a, b) => {
    const aTask = getDayTasks(dateFilter).find(dt => dt.id === a.id);
    const bTask = getDayTasks(dateFilter).find(dt => dt.id === b.id);
    const aCompleted = aTask ? aTask.completed : false;
    const bCompleted = bTask ? bTask.completed : false;

    // First sort by completion status (incomplete first)
    if (aCompleted !== bCompleted) {
      return Number(aCompleted) - Number(bCompleted);
    }

    // Then sort by priority (high → medium → low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority] ?? 1;
    const bPriority = priorityOrder[b.priority] ?? 1;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Finally sort by time (earliest first)
    const aTime = a.scheduled_start_time || '23:59';
    const bTime = b.scheduled_start_time || '23:59';
    return aTime.localeCompare(bTime);
  });

  document.getElementById('taskList').innerHTML = visible.length
    ? visible.map(t => {
        const dayTasks = getDayTasks(dateFilter);
        const task = dayTasks.find(dt => dt.id === t.id) || {
          id: t.id,
          text: t.title,
          completed: false,
          priority: t.priority,
          recurrence_type: t.recurrence_type,
          custom_days: t.custom_days,
          template_icon_snapshot: t.template_icon_snapshot,
          scheduled_start_time: t.scheduled_start_time,
          scheduled_end_time: t.scheduled_end_time
        };
        return taskMarkup(task, true, dateFilter);
      }).join('')
    : '<li class="empty">No tasks found for the selected date. Add a task to get started.</li>';

  const todayTasks = getDayTasks(todayStr);
  // Sort today's tasks by priority and time
  todayTasks.sort((a, b) => {
    // First sort by completion status (incomplete first)
    if (a.completed !== b.completed) {
      return Number(a.completed) - Number(b.completed);
    }

    // Then sort by priority (high → medium → low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority] ?? 1;
    const bPriority = priorityOrder[b.priority] ?? 1;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Finally sort by time (earliest first)
    const aTime = a.scheduled_start_time || '23:59';
    const bTime = b.scheduled_start_time || '23:59';
    return aTime.localeCompare(bTime);
  });

  document.getElementById('dashboardTaskList').innerHTML = todayTasks.length
    ? todayTasks.slice(0, 6).map(t => taskMarkup(t, false, todayStr)).join('')
    : '<li class="empty">No tasks scheduled for today.</li>';
}

function filterTasks(filter, button) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  button?.classList.add('active');
  renderTasks();
}

// Modal functions
function openTaskModal() {
  editingTaskId = null;
  document.getElementById('taskModalTitle').textContent = 'Add New Task';
  document.getElementById('modalTaskName').value = '';
  document.getElementById('modalTaskPriority').value = 'medium';
  document.getElementById('modalTaskRepetition').value = 'once';
  document.getElementById('modalTaskDueDate').value = '';
  document.querySelectorAll('.days-selector input').forEach(c => c.checked = false);
  toggleCustomDays();
  document.getElementById('taskModal').classList.add('show');
  document.getElementById('modalTaskName').focus();
}

function openEditTaskModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingTaskId = id;
  document.getElementById('taskModalTitle').textContent = 'Edit Task';
  document.getElementById('modalTaskName').value = task.title;
  document.getElementById('modalTaskPriority').value = task.priority || 'medium';
  document.getElementById('modalTaskRepetition').value = task.recurrence_type || 'once';
  document.getElementById('modalTaskDueDate').value = task.due_date || '';
  document.querySelectorAll('.days-selector input').forEach(c => c.checked = (task.custom_days || []).includes(c.value));
  toggleCustomDays();
  document.getElementById('taskModal').classList.add('show');
}

function closeTaskModal() {
  document.getElementById('taskModal').classList.remove('show');
}

function toggleCustomDays() {
  document.getElementById('customDaysGroup').hidden = document.getElementById('modalTaskRepetition').value !== 'custom';
}

async function saveTaskFromModal() {
  const text = document.getElementById('modalTaskName').value.trim();
  const priority = document.getElementById('modalTaskPriority').value;
  const recurrence = document.getElementById('modalTaskRepetition').value;
  const dueDate = document.getElementById('modalTaskDueDate').value || null;
  const customDays = [...document.querySelectorAll('.days-selector input:checked')].map(c => c.value);

  if (!text) return alert('Please enter a task name.');
  if (recurrence === 'custom' && !customDays.length) return alert('Please select at least one day.');

  const saveBtn = document.querySelector('#taskModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    // Ensure profile exists before saving task
    const { data: existingProfile } = await window.supabase
      .from('profiles')
      .select('id')
      .eq('id', currentUser.id)
      .single();

    if (!existingProfile) {
      
      const { error: insertError } = await window.supabase
        .from('profiles')
        .insert({
          id: currentUser.id,
          full_name: currentUser.user_metadata?.full_name || ''
        });

      if (insertError) {
        console.error('Failed to create profile:', insertError);
        // If insert fails due to RLS, try upsert
        const { error: upsertError } = await window.supabase
          .from('profiles')
          .upsert({
            id: currentUser.id,
            full_name: currentUser.user_metadata?.full_name || ''
          }, {
            onConflict: 'id'
          });

        if (upsertError) {
          console.error('Failed to upsert profile:', upsertError);
          throw new Error('Failed to create user profile. Please try logging out and back in.');
        }
      }
    }

    if (editingTaskId !== null) {
      const task = tasks.find(t => t.id === editingTaskId);
      if (task) {
        const updated = await updateTask(editingTaskId, {
          title: text,
          priority,
          recurrence_type: recurrence,
          custom_days: customDays,
          due_date: dueDate
        });
        Object.assign(task, updated);
      }
    } else {
      const newTask = await saveTask({
        user_id: currentUser.id,
        title: text,
        priority,
        recurrence_type: recurrence,
        custom_days: customDays,
        start_date: localDateString(),
        due_date: dueDate
      });
      tasks.unshift(newTask);
    }

    await loadUserData();
    renderTasks();
    updateStats();
    renderCalendar();
    closeTaskModal();
  } catch (error) {
    alert('Failed to save task: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Task';
  }
}

async function toggleTask(taskId, dateString) {
  const dayTasks = getDayTasks(dateString);
  const task = dayTasks.find(t => t.id === taskId);
  if (!task) return;

  try {
    await saveTaskCompletion(taskId, dateString, !task.completed);
    await loadUserData();
    renderTasks();
    updateStats();
    renderCalendar();
    if (selectedDate === dateString) {
      renderDaySummary(dateString);
    }
  } catch (error) {
    alert('Failed to update task: ' + error.message);
  }
}

async function deleteTask(taskId) {
  if (!confirm('Delete this task?')) return;

  try {
    await deleteTaskFromDB(taskId);
    await loadUserData();
    renderTasks();
    updateStats();
    renderCalendar();
  } catch (error) {
    alert('Failed to delete task: ' + error.message);
  }
}

// View switching
function switchView(view, button) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  button?.classList.add('active');
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));

  const viewElement = document.getElementById(`${view}View`);
  if (viewElement) {
    viewElement.classList.add('active');
  }

  const titles = {
    dashboard: ['Dashboard', 'Your daily progress at a glance.'],
    tasks: ['Tasks', 'Plan, manage, and complete your tasks.'],
    calendar: ['Calendar', 'Review your progress day by day.'],
    templates: ['Templates', 'Create and manage reusable timetable templates.'],
    settings: ['Settings', 'Manage your profile and account settings.']
  };

  if (titles[view]) {
    document.getElementById('viewTitle').textContent = titles[view][0];
    document.getElementById('viewSubtitle').textContent = titles[view][1];
  }

  if (view === 'calendar') renderCalendar();
  if (view === 'settings') renderProfile();
  if (view === 'templates') renderTemplates();
}

// Calendar functions
function changeMonth(offset) {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + offset, 1);
  renderCalendar();
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  document.getElementById('calendarMonth').textContent = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let markup = names.map(n => `<div class="weekday">${n}</div>`).join('');

  for (let i = 0; i < firstDay; i++) {
    markup += '<div class="calendar-empty"></div>';
  }

  for (let day = 1; day <= days; day++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const stats = getDayStats(date);
    const today = localDateString();
    const isTodayOrPast = date <= today;

    // Only show percentage for today and past dates
    const color = (isTodayOrPast && stats.total) ? completionClass(stats.percentage) : 'neutral';
    markup += `<button class="calendar-day ${color} ${date === selectedDate ? 'selected' : ''} ${date === today ? 'today' : ''}" onclick="selectCalendarDate('${date}')">
      <span>${day}</span>
      ${isTodayOrPast && stats.total ? `<small>${stats.percentage}%</small>` : ''}
    </button>`;
  }

  document.getElementById('calendarGrid').innerHTML = markup;

  if (selectedDate.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
    renderDaySummary(selectedDate);
  }
}

function selectCalendarDate(date) {
  selectedDate = date;
  renderCalendar();
  renderDaySummary(date);
}

function renderDaySummary(date) {
  const stats = getDayStats(date);
  document.getElementById('summaryTitle').textContent = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const pill = document.getElementById('summaryPercentage');
  pill.textContent = stats.total ? `${stats.percentage}% complete` : 'No activity';
  pill.className = `percentage-pill ${stats.total ? completionClass(stats.percentage) : 'neutral'}`;

  if (stats.total) {
    document.getElementById('summaryContent').innerHTML = `
      <div class="summary-stats">
        <span><strong>${stats.completed}</strong> Completed</span>
        <span><strong>${stats.total - stats.completed}</strong> Remaining</span>
        <span><strong>${stats.total}</strong> Total tasks</span>
      </div>
    `;
    document.getElementById('summaryTaskList').innerHTML = stats.tasks.map(t => {
      const templateIcon = t.template_icon_snapshot || '';
      const scheduledTime = t.scheduled_start_time && t.scheduled_end_time
        ? `${formatTime(t.scheduled_start_time)} - ${formatTime(t.scheduled_end_time)}`
        : '';

      return `
      <li class="${t.completed ? 'completed' : ''}">
        <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask('${t.id}', '${date}')" aria-label="Mark ${escapeHtml(t.text)} complete">
        <span>${escapeHtml(t.text)}</span>
        ${templateIcon ? `<span class="template-icon-badge">${escapeHtml(templateIcon)}</span>` : ''}
        ${scheduledTime ? `<span class="template-time-badge">${escapeHtml(scheduledTime)}</span>` : ''}
        <span class="priority-badge priority-${escapeHtml(t.priority || 'medium')}">${escapeHtml(t.priority || 'medium')}</span>
      </li>
    `;
    }).join('');
  } else {
    document.getElementById('summaryContent').innerHTML = '<p class="empty-summary">No tasks were recorded for this date.</p>';
    document.getElementById('summaryTaskList').innerHTML = '';
  }
}

// Profile/Settings functions
function renderProfile() {
  document.getElementById('profileName').textContent = userProfile?.full_name || currentUser?.user_metadata?.full_name || 'Not set';
  document.getElementById('profileEmail').textContent = userProfile?.email || currentUser?.email || 'Not set';
  document.getElementById('profilePassword').textContent = '••••••••';
}

function openEmailModal() {
  document.getElementById('newEmail').value = currentUser?.email || '';
  document.getElementById('emailConfirmPassword').value = '';
  document.getElementById('emailModal').classList.add('show');
}

function closeEmailModal() {
  document.getElementById('emailModal').classList.remove('show');
}

async function submitEmailChange() {
  const newEmail = document.getElementById('newEmail').value.trim().toLowerCase();
  const password = document.getElementById('emailConfirmPassword').value;

  if (!newEmail || !newEmail.includes('@')) return alert('Enter a valid email address.');
  if (!password) return alert('Please enter your current password for verification.');

  const saveBtn = document.querySelector('#emailModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Updating...';

  try {
    // Verify current password by re-authenticating
    const { error: signInError } = await window.supabase.auth.signInWithPassword({
      email: currentUser.email,
      password
    });

    if (signInError) throw new Error('Current password is incorrect.');

    // Update email
    const { error } = await window.supabase.auth.updateUser({
      email: newEmail
    });

    if (error) throw error;

    alert('Email updated! Please check your new email for verification.');
    closeEmailModal();
    await loadUserData();
    renderProfile();
  } catch (error) {
    alert(error.message || 'Failed to update email.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Email';
  }
}

function openPasswordModal() {
  ['newPassword', 'confirmPassword'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('passwordModal').classList.add('show');
}

function closePasswordModal() {
  document.getElementById('passwordModal').classList.remove('show');
}

function closeResetPasswordModal() {
  document.getElementById('resetPasswordModal').classList.remove('show');
  // Clear URL params
  window.history.replaceState({}, document.title, window.location.pathname);
}

async function submitPasswordReset() {
  const newPassword = document.getElementById('resetNewPassword').value;
  const confirmPassword = document.getElementById('resetConfirmPassword').value;

  if (!newPassword || !confirmPassword) {
    return alert('Please fill in all password fields.');
  }
  if (newPassword.length < 8) {
    return alert('New password must contain at least 8 characters.');
  }
  if (newPassword !== confirmPassword) {
    return alert('New password and confirmation do not match.');
  }

  const saveBtn = document.querySelector('#resetPasswordModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Resetting...';

  try {
    const { error } = await window.supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    alert('Password reset successfully! You can now log in with your new password.');
    closeResetPasswordModal();
    clearAuthMessages();
    showAuthMode('login');
  } catch (error) {
    alert(error.message || 'Failed to reset password. Please try again.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Reset Password';
  }
}

async function submitPasswordChange() {
  const next = document.getElementById('newPassword').value;
  const confirmValue = document.getElementById('confirmPassword').value;

  if (!next || !confirmValue) return alert('Please fill in all password fields.');
  if (next.length < 8) return alert('New password must contain at least 8 characters.');
  if (next !== confirmValue) return alert('New password and confirmation do not match.');

  const saveBtn = document.querySelector('#passwordModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Updating...';

  try {
    // Update password
    const { error } = await window.supabase.auth.updateUser({
      password: next
    });

    if (error) throw error;

    alert('Password updated successfully!');
    closePasswordModal();
  } catch (error) {
    alert(error.message || 'Failed to update password.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Password';
  }
}

// Consistency chart
function renderConsistencyChart() {
  const svg = document.getElementById('consistencyChart');
  if (!svg) return;

  const dates = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    dates.push(localDateString(d));
  }

  const values = dates.map(date => getDayStats(date).total ? getDayStats(date).percentage : null);

  const width = 640, height = 220, left = 45, right = 20, top = 30, bottom = 45;
  const plotW = width - left - right, plotH = height - top - bottom;
  const y = v => top + (100 - v) / 100 * plotH;
  const x = i => left + (dates.length === 1 ? plotW / 2 : i / (dates.length - 1) * plotW);

  let svgMarkup = '';

  // Simple horizontal grid lines
  [0, 50, 100].forEach(v => {
    if (v > 0) {
      svgMarkup += `<line class="gridline" x1="${left}" y1="${y(v)}" x2="${width - right}" y2="${y(v)}"></line>`;
    }
    svgMarkup += `<text x="${left - 10}" y="${y(v) + 4}" text-anchor="end" fill="#999" font-size="11">${v}%</text>`;
  });

  // Create smooth curve using bezier curves
  const points = values.map((v, i) => v === null ? null : [x(i), y(v)]);
  let svgPath = '';

  if (points.some(p => p !== null)) {
    // Fill area under the curve
    let fillPath = `M ${left} ${y(0)}`;
    let linePath = '';

    points.forEach((p, i) => {
      if (p !== null) {
        if (linePath === '') {
          linePath = `M ${p[0]} ${p[1]}`;
          fillPath += ` L ${p[0]} ${p[1]}`;
        } else {
          // Simple line for now (can be upgraded to bezier for smoother curves)
          linePath += ` L ${p[0]} ${p[1]}`;
          fillPath += ` L ${p[0]} ${p[1]}`;
        }
      }
    });

    const lastNonNull = points.filter(p => p !== null).pop();
    if (lastNonNull) {
      fillPath += ` L ${lastNonNull[0]} ${y(0)} Z`;
      svgMarkup += `<path d="${fillPath}" fill="url(#gradient)" opacity="0.3"></path>`;
    }

    svgMarkup += `<path d="${linePath}" class="chart-line" fill="none"></path>`;

    // Add points
    points.forEach((p, i) => {
      if (p) {
        const value = values[i];
        const color = value > 75 ? '#25D366' : value >= 50 ? '#ffc107' : '#dc3545';
        svgMarkup += `<circle class="chart-point" cx="${p[0]}" cy="${p[1]}" r="6" fill="${color}" stroke="white" stroke-width="2"><title>${dates[i]}: ${value}%</title></circle>`;
      }
    });
  }

  // Date labels
  dates.forEach((date, i) => {
    if (i % 3 === 0 || i === 13) {
      const label = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      svgMarkup += `<text x="${x(i)}" y="${height - 15}" text-anchor="middle" fill="#999" font-size="11">${label}</text>`;
    }
  });

  // Gradient definition
  svgMarkup += `
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#128C7E;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#128C7E;stop-opacity:0" />
      </linearGradient>
    </defs>
  `;

  if (values.every(v => v === null)) {
    svgMarkup += `<text class="empty-chart" x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#999" font-size="14">Complete tasks to start seeing your consistency trend.</text>`;
  }

  svg.innerHTML = svgMarkup;
}

// Template Functions
function renderTemplates() {
  const container = document.getElementById('templatesList');
  if (!templates.length) {
    container.innerHTML = '<div class="template-empty">No templates yet. Create your first template to get started!</div>';
    return;
  }

  container.innerHTML = templates.map(template => {
    const taskCount = templateTasks.filter(tt => tt.template_id === template.id).length;
    return `
      <div class="template-card" onclick="openTemplateDetail('${template.id}')">
        <div class="template-card-header">
          <span class="template-icon">${escapeHtml(template.icon)}</span>
          <span class="template-name">${escapeHtml(template.name)}</span>
        </div>
        <div class="template-meta">
          <span class="template-task-count">${taskCount} task${taskCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    `;
  }).join('');
}

function openTemplateDetail(templateId) {
  currentTemplate = templates.find(t => t.id === templateId);
  if (!currentTemplate) return;

  document.getElementById('templateDetailTitle').textContent = currentTemplate.icon + ' ' + currentTemplate.name;
  document.getElementById('templateDetailSubtitle').textContent = 'Manage your timetable tasks';

  // Hide all views
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  // Show template detail view
  document.getElementById('templateDetailView').classList.add('active');

  renderTemplateTasks();
}

function renderTemplateTasks() {
  if (!currentTemplate) return;

  const tasks = templateTasks.filter(tt => tt.template_id === currentTemplate.id);
  const container = document.getElementById('templateTasksList');

  if (!tasks.length) {
    container.innerHTML = '<div class="empty">No tasks in this template yet. Add your first task!</div>';
    return;
  }

  // Sort by start time
  tasks.sort((a, b) => a.start_time.localeCompare(b.start_time));

  container.innerHTML = tasks.map(task => {
    const priority = task.priority || 'medium';
    const priorityLabel = priority.charAt(0).toUpperCase();
    return `
    <li class="template-task-item">
      <div class="template-task-info">
        <div class="template-task-name">${escapeHtml(task.task_name)}</div>
        <div class="template-task-time">${formatTime(task.start_time)} - ${formatTime(task.end_time)}</div>
        <div class="template-task-days">${(task.selected_days || []).map(d => d.slice(0, 3)).join(', ')}</div>
      </div>
      <div class="template-task-actions">
        <span class="priority-badge priority-${priority}">${priorityLabel}</span>
        <button class="edit-btn" onclick="openEditTemplateTaskModal('${task.id}')">Edit</button>
        <button class="delete-btn" onclick="deleteTemplateTask('${task.id}')">Delete</button>
      </div>
    </li>
  `}).join('');
}

function formatTime(time) {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function openCreateTemplateModal() {
  document.getElementById('templateName').value = '';
  document.getElementById('selectedIcon').value = '📅';
  document.querySelectorAll('#iconPicker .icon-option').forEach(btn => btn.classList.remove('selected'));
  document.querySelector('#iconPicker .icon-option[data-icon="📅"]').classList.add('selected');
  document.getElementById('createTemplateModal').classList.add('show');
  document.getElementById('templateName').focus();
}

function closeCreateTemplateModal() {
  document.getElementById('createTemplateModal').classList.remove('show');
}

function selectIcon(icon) {
  document.getElementById('selectedIcon').value = icon;
  document.querySelectorAll('#iconPicker .icon-option').forEach(btn => btn.classList.remove('selected'));
  document.querySelector(`#iconPicker .icon-option[data-icon="${icon}"]`).classList.add('selected');
}

async function saveTemplate() {
  const name = document.getElementById('templateName').value.trim();
  const icon = document.getElementById('selectedIcon').value;

  if (!name) return alert('Please enter a template name.');

  const saveBtn = document.querySelector('#createTemplateModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Creating...';

  try {
    const { data, error } = await window.supabase
      .from('templates')
      .insert({
        user_id: currentUser.id,
        name,
        icon
      })
      .select()
      .single();

    if (error) throw error;

    templates.unshift(data);
    renderTemplates();
    closeCreateTemplateModal();
  } catch (error) {
    alert('Failed to create template: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Create Template';
  }
}

function openEditTemplateModal() {
  if (!currentTemplate) return;

  document.getElementById('editTemplateName').value = currentTemplate.name;
  document.getElementById('editSelectedIcon').value = currentTemplate.icon;
  document.querySelectorAll('#editIconPicker .icon-option').forEach(btn => btn.classList.remove('selected'));
  const selectedBtn = document.querySelector(`#editIconPicker .icon-option[data-icon="${currentTemplate.icon}"]`);
  if (selectedBtn) selectedBtn.classList.add('selected');
  document.getElementById('editTemplateModal').classList.add('show');
}

function closeEditTemplateModal() {
  document.getElementById('editTemplateModal').classList.remove('show');
}

function selectEditIcon(icon) {
  document.getElementById('editSelectedIcon').value = icon;
  document.querySelectorAll('#editIconPicker .icon-option').forEach(btn => btn.classList.remove('selected'));
  document.querySelector(`#editIconPicker .icon-option[data-icon="${icon}"]`).classList.add('selected');
}

async function updateTemplate() {
  if (!currentTemplate) return;

  const name = document.getElementById('editTemplateName').value.trim();
  const icon = document.getElementById('editSelectedIcon').value;

  if (!name) return alert('Please enter a template name.');

  const saveBtn = document.querySelector('#editTemplateModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const { data, error } = await window.supabase
      .from('templates')
      .update({
        name,
        icon
      })
      .eq('id', currentTemplate.id)
      .select()
      .single();

    if (error) throw error;

    Object.assign(currentTemplate, data);
    const index = templates.findIndex(t => t.id === currentTemplate.id);
    if (index !== -1) templates[index] = currentTemplate;

    document.getElementById('templateDetailTitle').textContent = currentTemplate.icon + ' ' + currentTemplate.name;
    renderTemplates();
    closeEditTemplateModal();
  } catch (error) {
    alert('Failed to update template: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
  }
}

async function deleteCurrentTemplate() {
  if (!currentTemplate) return;
  if (!confirm(`Delete template "${currentTemplate.name}"? This will also delete all tasks generated from this template.`)) return;

  try {
    // First, delete all tasks created from this template
    const { error: tasksError } = await window.supabase
      .from('tasks')
      .delete()
      .eq('source_template_id', currentTemplate.id);

    if (tasksError) {
      console.error('Failed to delete tasks from template:', tasksError);
      // Continue with template deletion even if task deletion fails
    }

    // Delete template tasks
    const { error: templateTasksError } = await window.supabase
      .from('template_tasks')
      .delete()
      .eq('template_id', currentTemplate.id);

    if (templateTasksError) {
      console.error('Failed to delete template tasks:', templateTasksError);
    }

    // Delete the template itself
    const { error } = await window.supabase
      .from('templates')
      .delete()
      .eq('id', currentTemplate.id);

    if (error) throw error;

    // Update local data
    tasks = tasks.filter(t => t.source_template_id !== currentTemplate.id);
    templates = templates.filter(t => t.id !== currentTemplate.id);
    templateTasks = templateTasks.filter(tt => tt.template_id !== currentTemplate.id);
    currentTemplate = null;

    // Refresh views
    renderTasks();
    switchView('templates', document.querySelector('[data-view=templates]'));
    renderTemplates();
  } catch (error) {
    alert('Failed to delete template: ' + error.message);
  }
}

function openAddTemplateTaskModal() {
  editingTemplateTaskId = null;
  document.getElementById('templateTaskModalTitle').textContent = 'Add Task to Template';
  document.getElementById('templateTaskName').value = '';
  document.getElementById('templateTaskPriority').value = 'medium';
  document.getElementById('templateTaskStartTime').value = '';
  document.getElementById('templateTaskEndTime').value = '';
  document.querySelectorAll('#addTemplateTaskModal .days-selector input').forEach(c => c.checked = false);
  document.getElementById('templateTaskError').hidden = true;
  document.getElementById('addTemplateTaskModal').classList.add('show');
  document.getElementById('templateTaskName').focus();
}

function closeAddTemplateTaskModal() {
  document.getElementById('addTemplateTaskModal').classList.remove('show');
}

function openEditTemplateTaskModal(taskId) {
  const task = templateTasks.find(tt => tt.id === taskId);
  if (!task) return;

  editingTemplateTaskId = taskId;
  document.getElementById('templateTaskModalTitle').textContent = 'Edit Task';
  document.getElementById('templateTaskName').value = task.task_name;
  document.getElementById('templateTaskPriority').value = task.priority || 'medium';
  document.getElementById('templateTaskStartTime').value = task.start_time;
  document.getElementById('templateTaskEndTime').value = task.end_time;
  document.querySelectorAll('#addTemplateTaskModal .days-selector input').forEach(c => {
    c.checked = (task.selected_days || []).includes(c.value);
  });
  document.getElementById('templateTaskError').hidden = true;
  document.getElementById('addTemplateTaskModal').classList.add('show');
}

async function saveTemplateTask() {
  if (!currentTemplate) return;

  const taskName = document.getElementById('templateTaskName').value.trim();
  const priority = document.getElementById('templateTaskPriority').value;
  const startTime = document.getElementById('templateTaskStartTime').value;
  const endTime = document.getElementById('templateTaskEndTime').value;
  const selectedDays = [...document.querySelectorAll('#addTemplateTaskModal .days-selector input:checked')].map(c => c.value);

  if (!taskName) return alert('Please enter a task name.');
  if (!startTime) return alert('Please select a start time.');
  if (!endTime) return alert('Please select an end time.');
  if (!selectedDays.length) return alert('Please select at least one day.');

  // Validate time range
  if (startTime >= endTime) {
    document.getElementById('templateTaskError').textContent = 'End time must be later than start time.';
    document.getElementById('templateTaskError').hidden = false;
    return;
  }

  // Check for overlapping tasks on the same days
  const existingTasks = templateTasks.filter(tt =>
    tt.template_id === currentTemplate.id &&
    tt.id !== editingTemplateTaskId
  );

  for (const existing of existingTasks) {
    if (!existing.selected_days || !Array.isArray(existing.selected_days)) continue;
    const overlappingDays = existing.selected_days.filter(day => selectedDays.includes(day));
    if (overlappingDays.length > 0) {
      // Check time overlap
      if (!(endTime <= existing.start_time || startTime >= existing.end_time)) {
        document.getElementById('templateTaskError').textContent = `This task overlaps with "${existing.task_name}" on ${overlappingDays.join(', ')}.`;
        document.getElementById('templateTaskError').hidden = false;
        return;
      }
    }
  }

  const saveBtn = document.querySelector('#addTemplateTaskModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    if (editingTemplateTaskId) {
      const { data, error } = await window.supabase
        .from('template_tasks')
        .update({
          task_name: taskName,
          priority: priority,
          start_time: startTime,
          end_time: endTime,
          selected_days: selectedDays
        })
        .eq('id', editingTemplateTaskId)
        .select()
        .single();

      if (error) throw error;

      const index = templateTasks.findIndex(tt => tt.id === editingTemplateTaskId);
      if (index !== -1) templateTasks[index] = data;
    } else {
      const { data, error } = await window.supabase
        .from('template_tasks')
        .insert({
          template_id: currentTemplate.id,
          user_id: currentUser.id,
          task_name: taskName,
          priority: priority,
          start_time: startTime,
          end_time: endTime,
          selected_days: selectedDays
        })
        .select()
        .single();

      if (error) throw error;

      templateTasks.push(data);
    }

    renderTemplateTasks();
    renderTemplates();
    closeAddTemplateTaskModal();
  } catch (error) {
    alert('Failed to save task: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Task';
  }
}

async function deleteTemplateTask(taskId) {
  if (!confirm('Delete this task from the template?')) return;

  try {
    const { error } = await window.supabase
      .from('template_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    templateTasks = templateTasks.filter(tt => tt.id !== taskId);
    renderTemplateTasks();
    renderTemplates();
  } catch (error) {
    alert('Failed to delete task: ' + error.message);
  }
}

function openApplyTemplateModal() {
  if (!currentTemplate) return;

  const today = localDateString();
  document.getElementById('applyStartDate').value = today;
  document.getElementById('applyEndDate').value = today;
  document.getElementById('applyRecurrenceType').value = 'once';
  document.getElementById('applyRepeatUntil').value = '';
  document.getElementById('applyTemplatePreview').innerHTML = '';
  document.getElementById('applyTemplateError').hidden = true;
  document.getElementById('applyTemplateModal').classList.add('show');

  toggleApplyRecurrenceOptions();
  // Generate initial preview
  generateApplyPreview();
}

function toggleApplyRecurrenceOptions() {
  const recurrence = document.getElementById('applyRecurrenceType').value;
  const repeatUntilGroup = document.getElementById('applyRepeatUntilGroup');

  if (recurrence === 'once') {
    repeatUntilGroup.hidden = true;
  } else {
    repeatUntilGroup.hidden = false;
  }

  generateApplyPreview();
}

function closeApplyTemplateModal() {
  document.getElementById('applyTemplateModal').classList.remove('show');
}

function openImportTemplateModal() {
  if (!currentTemplate) return;

  // Populate dropdown with other templates
  const select = document.getElementById('importTemplateSelect');
  select.innerHTML = '<option value="">-- Choose a template --</option>';

  templates.filter(t => t.id !== currentTemplate.id).forEach(template => {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = `${template.icon} ${template.name}`;
    select.appendChild(option);
  });

  document.getElementById('importTemplatePreview').innerHTML = '';
  document.getElementById('importTemplateError').hidden = true;
  document.getElementById('importTemplateModal').classList.add('show');

  // Add event listener for template selection
  select.onchange = generateImportPreview;
}

function closeImportTemplateModal() {
  document.getElementById('importTemplateModal').classList.remove('show');
}

function generateImportPreview() {
  const sourceTemplateId = document.getElementById('importTemplateSelect').value;
  if (!sourceTemplateId) {
    document.getElementById('importTemplatePreview').innerHTML = '';
    return;
  }

  const sourceTemplate = templates.find(t => t.id === sourceTemplateId);
  if (!sourceTemplate) return;

  const sourceTasks = templateTasks.filter(tt => tt.template_id === sourceTemplateId);

  if (!sourceTasks.length) {
    document.getElementById('importTemplatePreview').innerHTML = '<p class="empty-summary">This template has no tasks to import.</p>';
    return;
  }

  // Sort by start time
  sourceTasks.sort((a, b) => a.start_time.localeCompare(b.start_time));

  let html = '<h4>Tasks to Import</h4>';
  sourceTasks.forEach(task => {
    html += `<div class="import-preview-item">
      <div class="import-preview-task">
        <span class="import-preview-task-icon">${sourceTemplate.icon}</span>
        <span class="import-preview-task-name">${escapeHtml(task.task_name)}</span>
        <span class="import-preview-task-time">${formatTime(task.start_time)} - ${formatTime(task.end_time)}</span>
      </div>
      <div style="font-size:11px;color:#666;margin-top:4px;">${(task.selected_days || []).map(d => d.slice(0, 3)).join(', ')}</div>
    </div>`;
  });

  html += `<div class="import-summary">Total tasks to import: ${sourceTasks.length}</div>`;
  document.getElementById('importTemplatePreview').innerHTML = html;
}

async function importTemplateTasks() {
  if (!currentTemplate) return;

  const sourceTemplateId = document.getElementById('importTemplateSelect').value;
  if (!sourceTemplateId) return alert('Please select a template to import from.');

  const sourceTemplate = templates.find(t => t.id === sourceTemplateId);
  if (!sourceTemplate) return;

  const sourceTasks = templateTasks.filter(tt => tt.template_id === sourceTemplateId);
  if (!sourceTasks.length) return alert('The selected template has no tasks to import.');

  const saveBtn = document.querySelector('#importTemplateModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Importing...';

  try {
    let importedCount = 0;
    let skippedCount = 0;

    for (const task of sourceTasks) {
      // Check for overlapping tasks
      const existingTasks = templateTasks.filter(tt =>
        tt.template_id === currentTemplate.id
      );

      let hasOverlap = false;
      for (const existing of existingTasks) {
        if (!existing.selected_days || !Array.isArray(existing.selected_days)) continue;
        if (!task.selected_days || !Array.isArray(task.selected_days)) continue;
        const overlappingDays = existing.selected_days.filter(day => task.selected_days.includes(day));
        if (overlappingDays.length > 0) {
          if (!(task.end_time <= existing.start_time || task.start_time >= existing.end_time)) {
            hasOverlap = true;
            break;
          }
        }
      }

      if (hasOverlap) {
        skippedCount++;
        continue;
      }

      // Import the task
      const { data, error } = await window.supabase
        .from('template_tasks')
        .insert({
          template_id: currentTemplate.id,
          user_id: currentUser.id,
          task_name: task.task_name,
          priority: task.priority || 'medium',
          start_time: task.start_time,
          end_time: task.end_time,
          selected_days: task.selected_days
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to import task:', error);
        continue;
      }

      if (error) {
        console.error('Failed to import task:', error);
        continue;
      }

      templateTasks.push(data);
      importedCount++;
    }

    await loadUserData();
    renderTemplateTasks();
    renderTemplates();
    closeImportTemplateModal();

    if (skippedCount > 0) {
      alert(`Import complete! ${importedCount} tasks imported. ${skippedCount} tasks were skipped due to time overlaps.`);
    } else {
      alert(`Import complete! ${importedCount} tasks imported successfully.`);
    }
  } catch (error) {
    alert('Failed to import tasks: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Import Tasks';
  }
}

function generateApplyPreview() {
  if (!currentTemplate) return;

  const startDate = document.getElementById('applyStartDate').value;
  const endDate = document.getElementById('applyEndDate').value;

  if (!startDate || !endDate) return;

  if (startDate > endDate) {
    document.getElementById('applyTemplateError').textContent = 'Start date must be before or equal to end date.';
    document.getElementById('applyTemplateError').hidden = false;
    document.getElementById('applyTemplatePreview').innerHTML = '';
    return;
  }

  document.getElementById('applyTemplateError').hidden = true;

  const tasks = templateTasks.filter(tt => tt.template_id === currentTemplate.id);
  const dates = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    dates.push(localDateString(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const preview = {};
  let totalTasks = 0;

  dates.forEach(date => {
    const dayName = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
    const matchingTasks = tasks.filter(task => {
      // Tasks with recurrence_type "once" don't need selected_days
      if (task.recurrence_type === 'once') {
        return true;
      }
      if (!task.selected_days || !Array.isArray(task.selected_days)) {
        console.error('Task has invalid selected_days:', task);
        return false;
      }
      return task.selected_days.includes(dayName);
    });

    if (matchingTasks.length > 0) {
      preview[date] = matchingTasks;
      totalTasks += matchingTasks.length;
    }
  });

  if (totalTasks === 0) {
    document.getElementById('applyTemplatePreview').innerHTML = '<p class="empty-summary">No tasks match the selected dates based on the template schedule.</p>';
    return;
  }

  let html = '<h4>Preview</h4>';
  Object.entries(preview).forEach(([date, tasks]) => {
    const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
    html += `<div class="apply-preview-item">
      <div class="apply-preview-date">${formattedDate}</div>`;
    tasks.forEach(task => {
      html += `<div class="apply-preview-task">
        <span class="apply-preview-task-icon">${currentTemplate.icon}</span>
        <span class="apply-preview-task-name">${escapeHtml(task.task_name)}</span>
        <span class="apply-preview-task-time">${formatTime(task.start_time)} - ${formatTime(task.end_time)}</span>
      </div>`;
    });
    html += '</div>';
  });

  html += `<div class="apply-summary">Total tasks to generate: ${totalTasks}</div>`;
  document.getElementById('applyTemplatePreview').innerHTML = html;
}

// Helper function to check for time overlap
function hasTimeOverlap(newStartTime, newEndTime, existingTask) {
  if (!existingTask.scheduled_start_time || !existingTask.scheduled_end_time) return false;
  // No overlap if new task ends before existing starts or starts after existing ends
  return !(newEndTime <= existingTask.scheduled_start_time || newStartTime >= existingTask.scheduled_end_time);
}

async function applyTemplate() {
  if (!currentTemplate) return;

  const startDate = document.getElementById('applyStartDate').value;
  const endDate = document.getElementById('applyEndDate').value;
  const recurrenceType = document.getElementById('applyRecurrenceType').value;
  const repeatUntil = document.getElementById('applyRepeatUntil').value || null;

  if (!startDate || !endDate) return alert('Please select start and end dates.');
  if (startDate > endDate) return alert('Start date must be before or equal to end date.');

  const templateTasksList = templateTasks.filter(tt => tt.template_id === currentTemplate.id);
  if (!templateTasksList.length) return alert('This template has no tasks to apply.');

  const saveBtn = document.querySelector('#applyTemplateModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Checking for conflicts...';

  try {
    // First, check for all conflicts before creating any tasks
    const conflicts = [];

    for (const task of templateTasksList) {
      // Tasks with recurrence_type "once" don't need selected_days
      if (task.recurrence_type !== 'once' && (!task.selected_days || !Array.isArray(task.selected_days))) {
        console.error('Task has invalid selected_days:', task);
        continue;
      }

      if (recurrenceType === 'once') {
        // One-time: Check for overlaps on matching dates
        const dates = [];
        let currentDate = new Date(startDate);
        const end = new Date(endDate);

        while (currentDate <= end) {
          const dateStr = localDateString(currentDate);
          const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

          if (task.selected_days && task.selected_days.includes(dayName)) {
            dates.push(dateStr);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        for (const date of dates) {
          // Check if task already exists (from this template)
          const existingTask = tasks.find(t =>
            t.task_source === 'template' &&
            t.source_template_task_id === task.id &&
            t.start_date === date
          );

          if (existingTask) {
            conflicts.push({
              templateTask: task.task_name,
              existingTask: existingTask.title,
              time: task.start_time && task.end_time ? `${formatTime(task.start_time)} - ${formatTime(task.end_time)}` : 'N/A',
              date: date,
              type: 'already_exists'
            });
            continue;
          }

          // Check for duplicate task name on the same date
          const duplicateTask = tasks.find(t => {
            if (t.start_date !== date) return false;
            return t.title.toLowerCase() === task.task_name.toLowerCase();
          });

          if (duplicateTask) {
            conflicts.push({
              templateTask: task.task_name,
              existingTask: duplicateTask.title,
              time: task.start_time && task.end_time ? `${formatTime(task.start_time)} - ${formatTime(task.end_time)}` : 'N/A',
              date: date,
              type: 'duplicate'
            });
            continue;
          }

          const overlappingTask = tasks.find(t => {
            if (t.start_date !== date) return false;
            if (!t.scheduled_start_time || !t.scheduled_end_time) return false;
            if (!task.start_time || !task.end_time) return false;
            return hasTimeOverlap(task.start_time, task.end_time, t);
          });

          if (overlappingTask) {
            conflicts.push({
              templateTask: task.task_name,
              existingTask: overlappingTask.title,
              time: task.start_time && task.end_time ? `${formatTime(task.start_time)} - ${formatTime(task.end_time)}` : 'N/A',
              date: date
            });
          }
        }
      } else if (recurrenceType === 'daily') {
        // Daily: Check for duplicate task name
        const duplicateTask = tasks.find(t => {
          if (t.recurrence_type !== 'daily') return false;
          return t.title.toLowerCase() === task.task_name.toLowerCase();
        });

        if (duplicateTask) {
          conflicts.push({
            templateTask: task.task_name,
            existingTask: duplicateTask.title,
            time: task.start_time && task.end_time ? `${formatTime(task.start_time)} - ${formatTime(task.end_time)}` : 'N/A',
            type: 'duplicate'
          });
          continue;
        }

        // Daily: Check for overlap with existing daily tasks
        const overlappingTask = tasks.find(t => {
          if (t.recurrence_type !== 'daily') return false;
          if (!t.scheduled_start_time || !t.scheduled_end_time) return false;
          if (!task.start_time || !task.end_time) return false;
          return hasTimeOverlap(task.start_time, task.end_time, t);
        });

        if (overlappingTask) {
          conflicts.push({
            templateTask: task.task_name,
            existingTask: overlappingTask.title,
            time: task.start_time && task.end_time ? `${formatTime(task.start_time)} - ${formatTime(task.end_time)}` : 'N/A',
            type: 'daily'
          });
        }
      } else if (recurrenceType === 'custom') {
        // Custom: Check for duplicate task name
        const duplicateTask = tasks.find(t => {
          if (t.recurrence_type !== 'custom') return false;
          return t.title.toLowerCase() === task.task_name.toLowerCase();
        });

        if (duplicateTask) {
          conflicts.push({
            templateTask: task.task_name,
            existingTask: duplicateTask.title,
            time: task.start_time && task.end_time ? `${formatTime(task.start_time)} - ${formatTime(task.end_time)}` : 'N/A',
            type: 'duplicate'
          });
          continue;
        }

        // Custom: Check for overlap with existing custom tasks on same days
        const overlappingTask = tasks.find(t => {
          if (t.recurrence_type !== 'custom') return false;
          if (!t.custom_days || !Array.isArray(t.custom_days)) return false;
          if (!t.scheduled_start_time || !t.scheduled_end_time) return false;
          if (!task.selected_days || !Array.isArray(task.selected_days)) return false;
          if (!task.start_time || !task.end_time) return false;

          const sharedDays = task.selected_days.filter(day => t.custom_days.includes(day));
          if (sharedDays.length === 0) return false;

          return hasTimeOverlap(task.start_time, task.end_time, t);
        });

        if (overlappingTask) {
          conflicts.push({
            templateTask: task.task_name,
            existingTask: overlappingTask.title,
            time: task.start_time && task.end_time ? `${formatTime(task.start_time)} - ${formatTime(task.end_time)}` : 'N/A',
            type: 'custom'
          });
        }
      }
    }

    // If there are conflicts, show error and don't create any tasks
    if (conflicts.length > 0) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Apply Template';
      
      let conflictMessage = 'Template application failed due to conflicts:\n\n';
      conflicts.forEach((conflict, index) => {
        if (conflict.type === 'already_exists') {
          conflictMessage += `${index + 1}. "${conflict.templateTask}" was already generated from this template on ${conflict.date}\n`;
        } else if (conflict.type === 'duplicate') {
          if (conflict.date) {
            conflictMessage += `${index + 1}. "${conflict.templateTask}" already exists on ${conflict.date}\n`;
          } else {
            conflictMessage += `${index + 1}. "${conflict.templateTask}" already exists as a recurring task\n`;
          }
        } else {
          if (conflict.date) {
            conflictMessage += `${index + 1}. "${conflict.templateTask}" (${conflict.time} on ${conflict.date}) conflicts with "${conflict.existingTask}"\n`;
          } else {
            conflictMessage += `${index + 1}. "${conflict.templateTask}" (${conflict.time}) conflicts with "${conflict.existingTask}"\n`;
          }
        }
      });
      conflictMessage += '\nPlease resolve these conflicts and try again.';
      alert(conflictMessage);
      return;
    }

    // No conflicts, proceed to create tasks
    saveBtn.textContent = 'Applying...';
    let tasksCreated = 0;

    // For each template task, create a task in the tasks table
    for (const task of templateTasksList) {
      // Tasks with recurrence_type "once" don't need selected_days
      if (task.recurrence_type !== 'once' && (!task.selected_days || !Array.isArray(task.selected_days))) {
        console.error('Task has invalid selected_days:', task);
        continue;
      }

      // Determine recurrence type and custom_days based on user selection
      let finalRecurrenceType = recurrenceType;
      let finalCustomDays = task.selected_days;

      if (recurrenceType === 'once') {
        // One-time: Only create tasks for matching dates in the selected range
        const dates = [];
        let currentDate = new Date(startDate);
        const end = new Date(endDate);

        while (currentDate <= end) {
          const dateStr = localDateString(currentDate);
          const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

          if (task.selected_days && task.selected_days.includes(dayName)) {
            dates.push(dateStr);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        for (const date of dates) {
          const { data, error } = await window.supabase
            .from('tasks')
            .insert({
              user_id: currentUser.id,
              title: task.task_name,
              priority: task.priority || 'medium',
              recurrence_type: 'once',
              start_date: date,
              task_source: 'template',
              source_template_id: currentTemplate.id,
              source_template_task_id: task.id,
              template_icon_snapshot: currentTemplate.icon,
              scheduled_start_time: task.start_time,
              scheduled_end_time: task.end_time
            })
            .select()
            .single();

          if (error) {
            console.error('Failed to create task:', error);
            continue;
          }

          tasks.unshift(data);
          tasksCreated++;
        }
      } else if (recurrenceType === 'daily') {
        // Daily: Create one task that repeats daily
        const { data, error } = await window.supabase
          .from('tasks')
          .insert({
            user_id: currentUser.id,
            title: task.task_name,
            priority: task.priority || 'medium',
            recurrence_type: 'daily',
            start_date: startDate,
            due_date: repeatUntil,
            task_source: 'template',
            source_template_id: currentTemplate.id,
            source_template_task_id: task.id,
            template_icon_snapshot: currentTemplate.icon,
            scheduled_start_time: task.start_time,
            scheduled_end_time: task.end_time
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create task:', error);
          continue;
        }

        tasks.unshift(data);
        tasksCreated++;
      } else if (recurrenceType === 'custom') {
        // Custom: Create one task that repeats on the template's selected days
        const { data, error } = await window.supabase
          .from('tasks')
          .insert({
            user_id: currentUser.id,
            title: task.task_name,
            priority: task.priority || 'medium',
            recurrence_type: 'custom',
            custom_days: task.selected_days || [],
            start_date: startDate,
            due_date: repeatUntil,
            task_source: 'template',
            source_template_id: currentTemplate.id,
            source_template_task_id: task.id,
            template_icon_snapshot: currentTemplate.icon,
            scheduled_start_time: task.start_time,
            scheduled_end_time: task.end_time
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create task:', error);
          continue;
        }

        tasks.unshift(data);
        tasksCreated++;
      }
    }

    await loadUserData();
    renderTasks();
    updateStats();
    renderCalendar();
    closeApplyTemplateModal();

    alert(`Template applied! ${tasksCreated} tasks created successfully.`);
  } catch (error) {
    alert('Failed to apply template: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Apply Template';
  }
}

// Initialize app
function initializeApp() {
  document.getElementById('todayLabel').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  // Initialize date filter to today
  const dateFilter = document.getElementById('taskDateFilter');
  if (dateFilter) {
    dateFilter.value = localDateString();
  }

  renderTasks();
  updateStats();
  renderCalendar();
  renderProfile();

  document.getElementById('modalTaskName').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveTaskFromModal();
  });

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.classList.remove('show');
        // If it's the reset password modal, clear URL params
        if (modal.id === 'resetPasswordModal') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    });
  });

  // Add event listeners for apply template modal dates
  const applyStartDate = document.getElementById('applyStartDate');
  const applyEndDate = document.getElementById('applyEndDate');
  if (applyStartDate) applyStartDate.addEventListener('change', generateApplyPreview);
  if (applyEndDate) applyEndDate.addEventListener('change', generateApplyPreview);
}

// Goals Functions
function openGoalsModal() {
  editingGoalId = null;
  document.getElementById('goalName').value = '';
  document.getElementById('goalDeadline').value = '';
  document.getElementById('goalDescription').value = '';
  document.getElementById('goalError').hidden = true;
  hideGoalForm();
  renderGoals();
  document.getElementById('goalsModal').classList.add('show');
}

function closeGoalsModal() {
  document.getElementById('goalsModal').classList.remove('show');
}

function showGoalForm() {
  document.getElementById('goalFormContainer').hidden = false;
  document.getElementById('addGoalBtn').hidden = true;
  document.getElementById('cancelGoalBtn').hidden = false;
  document.getElementById('saveGoalBtn').hidden = false;
  document.getElementById('goalName').focus();
}

function hideGoalForm() {
  document.getElementById('goalFormContainer').hidden = true;
  document.getElementById('addGoalBtn').hidden = false;
  document.getElementById('cancelGoalBtn').hidden = true;
  document.getElementById('saveGoalBtn').hidden = true;
  document.getElementById('goalName').value = '';
  document.getElementById('goalDeadline').value = '';
  document.getElementById('goalDescription').value = '';
  editingGoalId = null;
}

function renderGoals() {
  const container = document.getElementById('goalsList');
  if (!goals.length) {
    container.innerHTML = '<li class="empty">No long-term goals yet. Add your first goal!</li>';
    return;
  }

  const today = localDateString();
  container.innerHTML = goals.map(goal => {
    const isOverdue = goal.deadline < today && !goal.completed;
    const isUrgent = !isOverdue && goal.deadline <= localDateString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) && !goal.completed;
    const statusClass = isOverdue ? 'goal-overdue' : (isUrgent ? 'goal-urgent' : (goal.completed ? 'goal-completed' : ''));

    const celebrationHtml = goal.completed ? '<span class="goal-celebration">❤️‍🔥</span>' : '';
    const goalName = goal.name || 'Unnamed Goal';

    return `
      <li class="${statusClass}" data-goal-id="${goal.id}">
        <div class="goal-info">
          <div class="goal-name">${escapeHtml(goalName)}${celebrationHtml}</div>
          <div class="goal-deadline">Deadline: ${new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          ${goal.description ? `<div class="goal-description">${escapeHtml(goal.description)}</div>` : ''}
        </div>
        <div class="goal-actions">
          <button class="complete-btn" onclick="toggleGoal('${goal.id}')">${goal.completed ? 'Undo' : 'Complete'}</button>
          <button class="delete-btn" onclick="deleteGoal('${goal.id}')">Delete</button>
        </div>
      </li>
    `;
  }).join('');
}

async function saveGoal() {
  const name = document.getElementById('goalName').value.trim();
  const deadline = document.getElementById('goalDeadline').value;
  const description = document.getElementById('goalDescription').value.trim();

  if (!name) return alert('Please enter a goal name.');
  if (!deadline) return alert('Please select a deadline.');

  const saveBtn = document.querySelector('#goalsModal .save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    if (editingGoalId) {
      const { data, error } = await window.supabase
        .from('goals')
        .update({
          name,
          deadline,
          description
        })
        .eq('id', editingGoalId)
        .select()
        .single();

      if (error) throw error;

      const index = goals.findIndex(g => g.id === editingGoalId);
      if (index !== -1) goals[index] = data;
    } else {
      const { data, error } = await window.supabase
        .from('goals')
        .insert({
          user_id: currentUser.id,
          name,
          deadline,
          description,
          completed: false
        })
        .select()
        .single();

      if (error) throw error;

      goals.push(data);
    }

    renderGoals();
    updateStats();
    document.getElementById('goalName').value = '';
    document.getElementById('goalDeadline').value = '';
    document.getElementById('goalDescription').value = '';
    document.getElementById('goalName').focus();
  } catch (error) {
    alert('Failed to save goal: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Add Goal';
  }
}

async function toggleGoal(goalId) {
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;

  try {
    const { data, error } = await window.supabase
      .from('goals')
      .update({ completed: !goal.completed })
      .eq('id', goalId)
      .eq('user_id', currentUser.id)
      .select()
      .single();

    if (error) throw error;

    // Update local state
    goal.completed = data.completed;

    // Reload goals from database to ensure we have the correct state
    const { data: goalsData } = await window.supabase
      .from('goals')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('deadline', { ascending: true });

    goals = goalsData || [];

    renderGoals();
    updateStats();
  } catch (error) {
    console.error('Failed to update goal:', error);
    alert('Failed to update goal: ' + error.message);
  }
}

function showConfettiCelebration(goalId) {
  const goalElement = document.querySelector(`[data-goal-id="${goalId}"]`);
  if (!goalElement) {
    console.error('Goal element not found for ID:', goalId);
    return;
  }

  const goalNameElement = goalElement.querySelector('.goal-name');
  if (!goalNameElement) {
    console.error('Goal name element not found');
    return;
  }

  // Remove existing celebration if any
  const existingCelebration = goalNameElement.querySelector('.goal-celebration');
  if (existingCelebration) {
    existingCelebration.remove();
  }

  // Add celebration emoji
  const celebration = document.createElement('span');
  celebration.className = 'goal-celebration';
  celebration.textContent = '❤️‍🔥';
  goalNameElement.appendChild(celebration);
}

async function deleteGoal(goalId) {
  if (!confirm('Delete this goal?')) return;

  try {
    const { error } = await window.supabase
      .from('goals')
      .delete()
      .eq('id', goalId);

    if (error) throw error;

    goals = goals.filter(g => g.id !== goalId);
    renderGoals();
    updateStats();
  } catch (error) {
    alert('Failed to delete goal: ' + error.message);
  }
}

// Motivation Settings Functions
function saveMotivationSettings() {
  const emoji = document.getElementById('userEmoji').value.trim();
  const message = document.getElementById('userMessage').value.trim();

  if (emoji && message) {
    userEmoji = emoji;
    userMessage = message;
    localStorage.setItem('userEmoji', emoji);
    localStorage.setItem('userMessage', message);

    // Update header emoji
    const headerEmoji = document.getElementById('headerEmoji');
    headerEmoji.textContent = emoji;
    headerEmoji.style.display = 'inline-block';

    alert('Motivation settings saved!');
  } else {
    alert('Please enter both emoji and message');
  }
}

function showMotivationPopup() {
  if (!userEmoji || !userMessage) {
    alert('Please set your emoji and message in Settings first');
    return;
  }

  const popup = document.getElementById('motivationPopup');
  const popupMessage = document.getElementById('popupMessage');
  const headerEmoji = document.getElementById('headerEmoji');

  popupMessage.textContent = userMessage;

  // Add pop animation to header emoji
  headerEmoji.classList.add('pop');
  setTimeout(() => headerEmoji.classList.remove('pop'), 500);

  // Show popup
  popup.style.display = 'block';

  // Hide popup after 3 seconds
  setTimeout(() => {
    popup.style.display = 'none';
  }, 3000);
}

function loadMotivationSettings() {
  const headerEmoji = document.getElementById('headerEmoji');
  const userEmojiInput = document.getElementById('userEmoji');
  const userMessageInput = document.getElementById('userMessage');

  if (userEmoji && userMessage) {
    headerEmoji.textContent = userEmoji;
    headerEmoji.style.display = 'inline-block';
    userEmojiInput.value = userEmoji;
    userMessageInput.value = userMessage;
  }
}

// Time Picker Functions
function openTimePicker(target) {
  timePickerTarget = target;
  timePickerMode = 'hour';

  // Get current value from the input
  const inputId = target === 'start' ? 'templateTaskStartTime' : 'templateTaskEndTime';
  const currentValue = document.getElementById(inputId).value;

  if (currentValue) {
    const [hours, minutes] = currentValue.split(':');
    selectedHour = parseInt(hours);
    selectedMinute = parseInt(minutes);
    isPM = selectedHour >= 12;
    if (selectedHour > 12) selectedHour -= 12;
    if (selectedHour === 0) selectedHour = 12;
  } else {
    selectedHour = 9;
    selectedMinute = 0;
    isPM = false;
  }

  renderClockFace();
  updateTimeDisplay();
  document.getElementById('timePickerModal').classList.add('show');
}

function closeTimePicker() {
  document.getElementById('timePickerModal').classList.remove('show');
}

function renderClockFace() {
  const clockFace = document.getElementById('clockFace');
  const radius = 42; // percentage

  let html = '';

  if (timePickerMode === 'hour') {
    // Render hours (1-12)
    for (let i = 1; i <= 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const x = 50 + radius * Math.cos(angle);
      const y = 50 + radius * Math.sin(angle);
      const isSelected = i === selectedHour;
      html += `<div class="clock-number ${isSelected ? 'selected' : ''}" style="left:${x}%;top:${y}%" onclick="selectHour(${i})">${i}</div>`;
    }
  } else {
    // Render minutes (0, 5, 10, ..., 55)
    for (let i = 0; i < 12; i++) {
      const minute = i * 5;
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const x = 50 + radius * Math.cos(angle);
      const y = 50 + radius * Math.sin(angle);
      const isSelected = minute === selectedMinute;
      html += `<div class="clock-number ${isSelected ? 'selected' : ''}" style="left:${x}%;top:${y}%" onclick="selectMinute(${minute})">${minute === 0 ? '00' : minute}</div>`;
    }
  }

  // Add clock hand
  const handAngle = timePickerMode === 'hour'
    ? (selectedHour * 30 - 90)
    : (selectedMinute * 6 - 90);
  html += `<div class="clock-hand" style="transform:rotate(${handAngle}deg)"></div>`;
  html += `<div class="clock-center"></div>`;

  clockFace.innerHTML = html;
}

function selectHour(hour) {
  selectedHour = hour;
  renderClockFace();
  updateTimeDisplay();
}

function selectMinute(minute) {
  selectedMinute = minute;
  renderClockFace();
  updateTimeDisplay();
}

function togglePeriod() {
  isPM = !isPM;
  updateTimeDisplay();
}

function setTimePickerMode(mode) {
  timePickerMode = mode;
  renderClockFace();
}

function updateTimeDisplay() {
  document.getElementById('selectedHour').textContent = String(selectedHour).padStart(2, '0');
  document.getElementById('selectedMinute').textContent = String(selectedMinute).padStart(2, '0');
  document.getElementById('selectedPeriod').textContent = isPM ? 'PM' : 'AM';
}

function confirmTimeSelection() {
  let hour24 = selectedHour;
  if (isPM && selectedHour !== 12) hour24 += 12;
  if (!isPM && selectedHour === 12) hour24 = 0;

  const timeString = `${String(hour24).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
  const inputId = timePickerTarget === 'start' ? 'templateTaskStartTime' : 'templateTaskEndTime';
  document.getElementById(inputId).value = timeString;

  closeTimePicker();
}

// Auth state listener
if (window.supabase && window.supabase.auth) {
  window.supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      await loadUserData();
      if (!document.getElementById('authScreen').hidden) {
        enterApp();
      }
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      userProfile = null;
      tasks = [];
      taskCompletions = [];
    }
  });
} else {
  console.error('Supabase auth not available!');
}

// On DOM load
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('appContainer').style.display = 'none';

  if (!window.supabase || !window.supabase.auth) {
    console.error('Supabase not initialized!');
    document.getElementById('authScreen').hidden = false;
    showAuthMode('login');
    return;
  }

  // Check for password reset in URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('type') === 'recovery') {
    // Show auth screen if not already visible
    document.getElementById('authScreen').hidden = false;
    document.getElementById('appContainer').style.display = 'none';
    showAuthMode('login');
    // Open reset password modal
    document.getElementById('resetPasswordModal').classList.add('show');
    showAuthSuccess('Password reset link detected. Please enter your new password.');
  }

  const { data: { session } } = await window.supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
    await loadUserData();
    enterApp();
  } else {
    document.getElementById('authScreen').hidden = false;
    showAuthMode('login');
  }
});
