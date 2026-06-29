// --- Configuration Constants ---
const PRESET_COLORS = [
  { hex: '#6366f1', rgb: '99, 102, 241' },   // Indigo
  { hex: '#10b981', rgb: '16, 185, 129' },   // Emerald
  { hex: '#f59e0b', rgb: '245, 158, 11' },   // Amber
  { hex: '#ec4899', rgb: '236, 72, 153' },   // Pink
  { hex: '#3b82f6', rgb: '59, 130, 246' },   // Blue
  { hex: '#8b5cf6', rgb: '139, 92, 246' },   // Purple
  { hex: '#06b6d4', rgb: '6, 182, 212' },    // Cyan
  { hex: '#f43f5e', rgb: '244, 63, 94' },    // Rose
  { hex: '#14b8a6', rgb: '20, 184, 166' }    // Teal
];

const DEFAULT_SPEAKERS = [
  { id: 'sp-1', name: 'Alice', color: '#6366f1', rgb: '99, 102, 241', totalTime: 0, key: 1 },
  { id: 'sp-2', name: 'Bob', color: '#10b981', rgb: '16, 185, 129', totalTime: 0, key: 2 },
  { id: 'sp-3', name: 'Charlie', color: '#f59e0b', rgb: '245, 158, 11', totalTime: 0, key: 3 },
  { id: 'sp-4', name: 'Diana', color: '#ec4899', rgb: '236, 72, 153', totalTime: 0, key: 4 }
];

// --- App State ---
let state = {
  speakers: [...DEFAULT_SPEAKERS],
  speakerPool: [], // Pool of all 40+ potential speaker names
  activeSpeakerId: null, // null represents Dead Space / Silence
  sessionState: 'ready', // ready, running, paused
  totalDuration: 0, // ms
  deadSpaceDuration: 0, // ms
  turns: [], // array of { speakerId: string|null, name: string, duration: number }
  history: []
};

// Timing Variables
let timerInterval = null;
let lastTickTime = 0;
let selectedColorHex = PRESET_COLORS[0].hex;

// --- DOM Elements ---
const dom = {
  // Session Timers
  totalTime: document.getElementById('total-time'),
  currentTurnTime: document.getElementById('current-turn-time'),
  deadSpaceTimer: document.getElementById('dead-space-timer'),
  statusBadge: document.getElementById('status-badge'),
  sessionName: document.getElementById('session-name'),
  
  // Controls
  btnStartPause: document.getElementById('btn-start-pause'),
  btnReset: document.getElementById('btn-reset'),
  btnSaveSession: document.getElementById('btn-save-session'),
  
  // Grid / Content Areas
  speakerGrid: document.getElementById('speaker-grid-container'),
  btnDeadSpace: document.getElementById('btn-dead-space'),
  quickAddInput: document.getElementById('quick-add-input'),
  rosterSuggestions: document.getElementById('roster-suggestions'),
  
  // Side Panels / Modals
  btnSettingsToggle: document.getElementById('btn-settings-toggle'),
  btnHistoryToggle: document.getElementById('btn-history-toggle'),
  settingsPanel: document.getElementById('settings-panel'),
  historyPanel: document.getElementById('history-panel'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  btnCloseHistory: document.getElementById('btn-close-history'),
  dimmer: document.getElementById('dimmer'),
  
  // Add Speaker Elements
  addSpeakerForm: document.getElementById('add-speaker-form'),
  newSpeakerName: document.getElementById('new-speaker-name'),
  colorPresetsContainer: document.getElementById('color-presets-container'),
  managedSpeakersList: document.getElementById('managed-speakers-list'),
  bulkRosterInput: document.getElementById('bulk-roster-input'),
  btnImportRoster: document.getElementById('btn-import-roster'),
  
  // Stats
  statsDonutChart: document.getElementById('stats-donut-chart'),
  statTotalSpeakers: document.getElementById('stat-total-speakers'),
  statsBreakdownList: document.getElementById('stats-breakdown-list'),
  
  // Export Modal
  exportModal: document.getElementById('export-modal'),
  btnCloseExport: document.getElementById('btn-close-export'),
  btnExportCsv: document.getElementById('btn-export-csv'),
  btnExportJson: document.getElementById('btn-export-json'),
  btnCopyClipboard: document.getElementById('btn-copy-clipboard'),
  copyTextArea: document.getElementById('copy-text-area'),
  exportSessionMeta: document.getElementById('export-session-meta'),
  
  // History Container
  sessionHistoryContainer: document.getElementById('session-history-container'),
  btnClearHistory: document.getElementById('btn-clear-history')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  loadDataFromStorage();
  initUI();
  setupEventListeners();
  renderSpeakerGrid();
  renderSpeakerSettingsList();
  renderColorPresets();
  updateRosterSuggestions();
  updateStats();
  renderHistory();
});

// --- Local Storage Management ---
function saveDataToStorage() {
  localStorage.setItem('laptimer_speakers', JSON.stringify(state.speakers));
  localStorage.setItem('laptimer_history', JSON.stringify(state.history));
  localStorage.setItem('laptimer_speaker_pool', JSON.stringify(state.speakerPool));
}

function loadDataFromStorage() {
  const storedSpeakers = localStorage.getItem('laptimer_speakers');
  if (storedSpeakers) {
    state.speakers = JSON.parse(storedSpeakers);
  }
  
  const storedHistory = localStorage.getItem('laptimer_history');
  if (storedHistory) {
    state.history = JSON.parse(storedHistory);
  }

  const storedPool = localStorage.getItem('laptimer_speaker_pool');
  if (storedPool) {
    state.speakerPool = JSON.parse(storedPool);
  } else {
    // Default pool of names to get started
    state.speakerPool = ['Alice', 'Bob', 'Charlie', 'Diana', 'Emma', 'Frank', 'George', 'Hannah', 'Ian', 'Julia'];
  }
}

function updateRosterSuggestions() {
  dom.rosterSuggestions.innerHTML = '';
  // Suggest pool speakers that are not already active in the grid
  const activeNames = new Set(state.speakers.map(s => s.name.toLowerCase()));
  
  state.speakerPool.forEach(name => {
    if (!activeNames.has(name.toLowerCase())) {
      const option = document.createElement('option');
      option.value = name;
      dom.rosterSuggestions.appendChild(option);
    }
  });

  // Sync textarea value with current pool
  dom.bulkRosterInput.value = state.speakerPool.join(', ');
}

// --- UI / Component Setup ---
function initUI() {
  // Add touch classes if mobile
  if ('ontouchstart' in window) {
    document.body.classList.add('touch-device');
  }
}

function renderColorPresets() {
  dom.colorPresetsContainer.innerHTML = '';
  PRESET_COLORS.forEach((color, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `color-preset-btn ${color.hex === selectedColorHex ? 'selected' : ''}`;
    btn.style.backgroundColor = color.hex;
    btn.setAttribute('aria-label', `Select color preset ${index + 1}`);
    btn.addEventListener('click', () => {
      selectedColorHex = color.hex;
      document.querySelectorAll('.color-preset-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      triggerHaptic();
    });
    dom.colorPresetsContainer.appendChild(btn);
  });
}

function renderSpeakerGrid() {
  dom.speakerGrid.innerHTML = '';
  state.speakers.forEach(speaker => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `speaker-card ${state.activeSpeakerId === speaker.id ? 'active-speaker' : ''}`;
    card.style.setProperty('--speaker-color', speaker.color);
    card.style.setProperty('--speaker-rgb', speaker.rgb);
    card.setAttribute('data-id', speaker.id);
    
    // Check if active and session running
    const isThisActive = state.activeSpeakerId === speaker.id;
    
    card.innerHTML = `
      <div class="speaker-card-header">
        <span class="speaker-name">${escapeHTML(speaker.name)}</span>
        <span class="speaker-key">${speaker.key}</span>
      </div>
      <div class="speaker-timer">${formatTime(speaker.totalTime)}</div>
      <span class="active-pulse"></span>
    `;
    
    card.addEventListener('click', () => handleSpeakerSelection(speaker.id));
    dom.speakerGrid.appendChild(card);
  });
  
  // Update Dead Space button UI active state
  if (state.activeSpeakerId === null) {
    dom.btnDeadSpace.classList.add('active-speaker');
  } else {
    dom.btnDeadSpace.classList.remove('active-speaker');
  }
  dom.deadSpaceTimer.textContent = formatTime(state.deadSpaceDuration);
}

function renderSpeakerSettingsList() {
  dom.managedSpeakersList.innerHTML = '';
  state.speakers.forEach(speaker => {
    const item = document.createElement('div');
    item.className = 'managed-speaker-item';
    item.innerHTML = `
      <div class="managed-speaker-info">
        <span class="managed-speaker-dot" style="background-color: ${speaker.color}"></span>
        <span class="managed-speaker-name">${escapeHTML(speaker.name)}</span>
      </div>
      <button class="btn-remove-speaker" data-id="${speaker.id}" title="Remove Speaker" aria-label="Remove speaker">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>
    `;
    
    item.querySelector('.btn-remove-speaker').addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      removeSpeaker(id);
    });
    
    dom.managedSpeakersList.appendChild(item);
  });
}

// --- Logic Operations ---

// Haptic vibration feedback
function triggerHaptic() {
  if (navigator.vibrate) {
    navigator.vibrate(30);
  }
}

// Speaker transitions
function handleSpeakerSelection(speakerId) {
  triggerHaptic();
  
  // If session has not started, start it immediately with this speaker
  if (state.sessionState === 'ready') {
    startSession();
    setActiveSpeaker(speakerId);
    return;
  }
  
  // If session is paused, resume it with this speaker
  if (state.sessionState === 'paused') {
    resumeSession();
    setActiveSpeaker(speakerId);
    return;
  }
  
  // If running, switch instantly
  if (state.sessionState === 'running') {
    setActiveSpeaker(speakerId);
  }
}

function setActiveSpeaker(speakerId) {
  if (state.sessionState !== 'running') return;
  
  const now = performance.now();
  const lastTurn = state.turns[state.turns.length - 1];
  
  // Finish the previous turn if exists
  if (lastTurn) {
    const elapsed = now - lastTickTime;
    lastTurn.duration += elapsed;
    
    // Add to specific speaker or dead space tally
    if (lastTurn.speakerId === null) {
      state.deadSpaceDuration += elapsed;
    } else {
      const sp = state.speakers.find(s => s.id === lastTurn.speakerId);
      if (sp) sp.totalTime += elapsed;
    }
    state.totalDuration += elapsed;
  }
  
  // Record transition
  state.activeSpeakerId = speakerId;
  lastTickTime = now;
  
  // Start new turn log
  const speakerName = speakerId === null ? 'Dead Space' : (state.speakers.find(s => s.id === speakerId)?.name || 'Unknown');
  state.turns.push({
    speakerId: speakerId,
    name: speakerName,
    duration: 0
  });
  
  // Refresh layout
  renderSpeakerGrid();
  updateStats();
}

// Session Timer Management
function startSession() {
  state.sessionState = 'running';
  lastTickTime = performance.now();
  
  // Push first turn (default is whatever is active - Dead Space by default)
  const speakerName = state.activeSpeakerId === null ? 'Dead Space' : (state.speakers.find(s => s.id === state.activeSpeakerId)?.name || 'Unknown');
  state.turns = [{
    speakerId: state.activeSpeakerId,
    name: speakerName,
    duration: 0
  }];
  
  // Launch timer interval
  timerInterval = setInterval(tick, 30);
  
  // Adjust UI
  dom.btnStartPause.querySelector('.btn-text').textContent = 'Pause';
  dom.btnStartPause.querySelector('.icon-play').classList.add('hidden');
  dom.btnStartPause.querySelector('.icon-pause').classList.remove('hidden');
  dom.btnReset.disabled = false;
  dom.btnSaveSession.disabled = true;
  dom.statusBadge.innerHTML = '<span class="pulse-dot"></span> Live';
  dom.statusBadge.className = 'status-indicator running';
  
  triggerHaptic();
}

function pauseSession() {
  if (state.sessionState !== 'running') return;
  
  clearInterval(timerInterval);
  
  // Add final delta to current speaker
  const now = performance.now();
  const elapsed = now - lastTickTime;
  
  const lastTurn = state.turns[state.turns.length - 1];
  if (lastTurn) {
    lastTurn.duration += elapsed;
    if (lastTurn.speakerId === null) {
      state.deadSpaceDuration += elapsed;
    } else {
      const sp = state.speakers.find(s => s.id === lastTurn.speakerId);
      if (sp) sp.totalTime += elapsed;
    }
    state.totalDuration += elapsed;
  }
  
  state.sessionState = 'paused';
  
  // Update UI
  dom.btnStartPause.querySelector('.btn-text').textContent = 'Resume';
  dom.btnStartPause.querySelector('.icon-play').classList.remove('hidden');
  dom.btnStartPause.querySelector('.icon-pause').classList.add('hidden');
  dom.btnSaveSession.disabled = false;
  dom.statusBadge.innerHTML = '<span class="pulse-dot"></span> Paused';
  dom.statusBadge.className = 'status-indicator paused';
  
  renderSpeakerGrid();
  updateStats();
  triggerHaptic();
}

function resumeSession() {
  state.sessionState = 'running';
  lastTickTime = performance.now();
  
  // Add new turn marker continuing active speaker
  const speakerName = state.activeSpeakerId === null ? 'Dead Space' : (state.speakers.find(s => s.id === state.activeSpeakerId)?.name || 'Unknown');
  state.turns.push({
    speakerId: state.activeSpeakerId,
    name: speakerName,
    duration: 0
  });
  
  timerInterval = setInterval(tick, 30);
  
  // Update UI
  dom.btnStartPause.querySelector('.btn-text').textContent = 'Pause';
  dom.btnStartPause.querySelector('.icon-play').classList.add('hidden');
  dom.btnStartPause.querySelector('.icon-pause').classList.remove('hidden');
  dom.statusBadge.innerHTML = '<span class="pulse-dot"></span> Live';
  dom.statusBadge.className = 'status-indicator running';
  
  triggerHaptic();
}

function tick() {
  const now = performance.now();
  const elapsed = now - lastTickTime;
  lastTickTime = now;
  
  state.totalDuration += elapsed;
  
  // Add to active speaker or dead space
  const lastTurn = state.turns[state.turns.length - 1];
  if (lastTurn) {
    lastTurn.duration += elapsed;
    if (lastTurn.speakerId === null) {
      state.deadSpaceDuration += elapsed;
      dom.deadSpaceTimer.textContent = formatTime(state.deadSpaceDuration);
    } else {
      const sp = state.speakers.find(s => s.id === lastTurn.speakerId);
      if (sp) {
        sp.totalTime += elapsed;
        
        // Find and update specific speaker card time without full re-render for performance
        const card = dom.speakerGrid.querySelector(`[data-id="${sp.id}"]`);
        if (card) {
          card.querySelector('.speaker-timer').textContent = formatTime(sp.totalTime);
        }
      }
    }
    
    // Update turn timer display
    dom.currentTurnTime.textContent = formatTime(lastTurn.duration);
  }
  
  dom.totalTime.textContent = formatTime(state.totalDuration);
  
  // Throttle heavy layout/chart updates (every ~250ms is fine for donut stats)
  if (Math.floor(state.totalDuration / 250) % 2 === 0) {
    updateStats();
  }
}

function resetSession() {
  if (confirm('Are you sure you want to reset the current session? Unsaved timers will be lost.')) {
    clearInterval(timerInterval);
    
    state.sessionState = 'ready';
    state.totalDuration = 0;
    state.deadSpaceDuration = 0;
    state.turns = [];
    state.activeSpeakerId = null;
    
    state.speakers.forEach(s => s.totalTime = 0);
    
    // UI resets
    dom.totalTime.textContent = '00:00.00';
    dom.currentTurnTime.textContent = '00:00.00';
    dom.deadSpaceTimer.textContent = '00:00.00';
    
    dom.btnStartPause.querySelector('.btn-text').textContent = 'Start';
    dom.btnStartPause.querySelector('.icon-play').classList.remove('hidden');
    dom.btnStartPause.querySelector('.icon-pause').classList.add('hidden');
    dom.btnReset.disabled = true;
    dom.btnSaveSession.disabled = true;
    dom.statusBadge.innerHTML = '<span class="pulse-dot"></span> Ready';
    dom.statusBadge.className = 'status-indicator';
    
    renderSpeakerGrid();
    updateStats();
    triggerHaptic();
  }
}

// Speakers Add/Remove Config
function addSpeaker(name, setActive = false) {
  const usedKeys = state.speakers.map(s => s.key).filter(k => k !== null);
  let availableKey = null;
  for (let k = 1; k <= 9; k++) {
    if (!usedKeys.includes(k)) {
      availableKey = k;
      break;
    }
  }
  
  const id = `sp-${Date.now()}`;
  
  // Dynamic color selection based on preset list to ensure beauty
  const colorIndex = state.speakers.length % PRESET_COLORS.length;
  const colorObj = PRESET_COLORS[colorIndex];
  
  state.speakers.push({
    id: id,
    name: name,
    color: colorObj.hex,
    rgb: colorObj.rgb,
    totalTime: 0,
    key: availableKey
  });
  
  saveDataToStorage();
  renderSpeakerGrid();
  renderSpeakerSettingsList();
  updateRosterSuggestions();
  updateStats();
  
  if (setActive) {
    handleSpeakerSelection(id);
  }
}

function removeSpeaker(id) {
  // Check if session running
  if (state.sessionState !== 'ready') {
    alert('Cannot remove speakers during a session. Reset the session first.');
    return;
  }
  
  state.speakers = state.speakers.filter(s => s.id !== id);
  
  // Re-assign keyboard shortcuts sequentially (1-9)
  state.speakers.forEach((s, idx) => {
    s.key = idx < 9 ? idx + 1 : null;
  });
  
  saveDataToStorage();
  renderSpeakerGrid();
  renderSpeakerSettingsList();
  updateRosterSuggestions();
  updateStats();
}

// --- Live Stats & Chart Processing ---
function updateStats() {
  const total = state.totalDuration || 0;
  
  // Calculate active speaker count
  const nonZeroSpeakers = state.speakers.filter(s => s.totalTime > 0).length;
  dom.statTotalSpeakers.textContent = nonZeroSpeakers;
  
  // Prepare breakdown elements
  dom.statsBreakdownList.innerHTML = '';
  
  // Sort items: Dead Space first, then speakers by longest speak time
  const items = [
    { name: 'Dead Space', color: '#374151', time: state.deadSpaceDuration }
  ];
  
  state.speakers.forEach(s => {
    items.push({ name: s.name, color: s.color, time: s.totalTime });
  });
  
  // Sort speaking slots by time descending (excluding Dead Space which always stays on top)
  const deadSpaceItem = items[0];
  const sortedSpeakers = items.slice(1).sort((a, b) => b.time - a.time);
  const finalSortedItems = [deadSpaceItem, ...sortedSpeakers];
  
  let conicSegments = [];
  let cumulativePercentage = 0;
  
  finalSortedItems.forEach(item => {
    const percentage = total > 0 ? (item.time / total) * 100 : 0;
    
    // Create UI Row
    const row = document.createElement('div');
    row.className = 'stats-row';
    row.innerHTML = `
      <div class="stats-row-label-group">
        <span class="stats-color-dot" style="background-color: ${item.color}"></span>
        <span class="stats-row-name">${escapeHTML(item.name)}</span>
      </div>
      <div class="stats-row-values">
        <span class="stats-row-time">${formatTime(item.time, true)}</span>
        <span class="stats-row-percentage">${percentage.toFixed(0)}%</span>
      </div>
    `;
    dom.statsBreakdownList.appendChild(row);
    
    // Build Gradient segment
    if (percentage > 0) {
      const nextPercentage = cumulativePercentage + percentage;
      conicSegments.push(`${item.color} ${cumulativePercentage.toFixed(1)}% ${nextPercentage.toFixed(1)}%`);
      cumulativePercentage = nextPercentage;
    }
  });
  
  // Set conic-gradient chart background
  if (conicSegments.length > 0) {
    dom.statsDonutChart.style.background = `conic-gradient(${conicSegments.join(', ')})`;
  } else {
    dom.statsDonutChart.style.background = 'conic-gradient(#374151 0% 100%)';
  }
}

// --- History Storage Operations ---
function saveSession() {
  if (state.totalDuration === 0) return;
  
  const title = dom.sessionName.value.trim() || 'Timed Session';
  
  const sessionRecord = {
    id: `session-${Date.now()}`,
    title: title,
    date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    totalDuration: state.totalDuration,
    deadSpaceDuration: state.deadSpaceDuration,
    speakers: state.speakers.map(s => ({ name: s.name, color: s.color, totalTime: s.totalTime })),
    turns: state.turns.map(t => ({ name: t.name, duration: t.duration }))
  };
  
  state.history.unshift(sessionRecord);
  saveDataToStorage();
  renderHistory();
  
  alert('Session saved successfully!');
  
  // Show history overlay
  openPanel(dom.historyPanel);
}

function renderHistory() {
  dom.sessionHistoryContainer.innerHTML = '';
  
  if (state.history.length === 0) {
    dom.sessionHistoryContainer.innerHTML = '<div class="empty-state">No saved sessions yet. Record one above!</div>';
    return;
  }
  
  state.history.forEach(session => {
    const item = document.createElement('div');
    item.className = 'history-item';
    
    // Build brief breakdown list
    const talkBreakdown = session.speakers
      .filter(s => s.totalTime > 0)
      .map(s => `${escapeHTML(s.name)} (${Math.round((s.totalTime / session.totalDuration) * 100)}%)`)
      .join(', ');
      
    item.innerHTML = `
      <div class="history-item-header">
        <span class="history-item-title">${escapeHTML(session.title)}</span>
        <span class="history-item-date">${session.date}</span>
      </div>
      <div class="history-item-meta">
        <span>Dur: <strong>${formatTime(session.totalDuration, true)}</strong></span>
        <span>Dead space: <strong>${Math.round((session.deadSpaceDuration / session.totalDuration) * 100)}%</strong></span>
      </div>
      <div class="history-item-meta" style="font-size:0.75rem; color: var(--text-muted);">
        ${talkBreakdown || 'Only silence recorded.'}
      </div>
      <div class="history-item-actions">
        <button class="btn btn-secondary btn-history-action btn-load-session" data-id="${session.id}">Open Stats</button>
        <button class="btn btn-secondary btn-history-action btn-delete-history" style="color:var(--danger)" data-id="${session.id}">Delete</button>
      </div>
    `;
    
    item.querySelector('.btn-load-session').addEventListener('click', () => loadHistoricalSession(session.id));
    item.querySelector('.btn-delete-history').addEventListener('click', () => deleteHistoricalSession(session.id));
    
    dom.sessionHistoryContainer.appendChild(item);
  });
}

function deleteHistoricalSession(sessionId) {
  if (confirm('Delete this session log permanently?')) {
    state.history = state.history.filter(s => s.id !== sessionId);
    saveDataToStorage();
    renderHistory();
    triggerHaptic();
  }
}

function loadHistoricalSession(sessionId) {
  const session = state.history.find(s => s.id === sessionId);
  if (!session) return;
  
  // Open Export/Stats Modal & configure content
  dom.exportSessionMeta.textContent = `Stats breakdown for "${session.title}" (Recorded ${session.date})`;
  
  // Format quick summaries
  let summary = `LapTimer Session Summary\n`;
  summary += `Title: ${session.title}\n`;
  summary += `Date: ${session.date}\n`;
  summary += `Total Duration: ${formatTime(session.totalDuration, true)}\n`;
  summary += `Dead Space: ${formatTime(session.deadSpaceDuration, true)} (${Math.round((session.deadSpaceDuration / session.totalDuration) * 100)}%)\n`;
  summary += `-------------------------------\n`;
  
  session.speakers.forEach(s => {
    if (s.totalTime > 0) {
      summary += `${s.name}: ${formatTime(s.totalTime, true)} (${Math.round((s.totalTime / session.totalDuration) * 100)}%)\n`;
    }
  });
  
  dom.copyTextArea.value = summary;
  
  // Configure export buttons listeners specifically for this historic item
  dom.btnExportCsv.onclick = () => downloadCSV(session);
  dom.btnExportJson.onclick = () => downloadJSON(session);
  
  closeAllPanels();
  dom.exportModal.classList.remove('hidden');
}

// --- Data Export Mechanisms ---
function downloadCSV(session) {
  let csv = 'Turn #,Speaker,Duration (ms),Duration (Formatted),Percentage of Session\n';
  
  session.turns.forEach((turn, idx) => {
    const pct = (turn.duration / session.totalDuration) * 100;
    csv += `${idx + 1},"${turn.name.replace(/"/g, '""')}",${Math.round(turn.duration)},"${formatTime(turn.duration, true)}",${pct.toFixed(1)}%\n`;
  });
  
  csv += `\nSummary Stats\n`;
  csv += `Total Session Time,,${Math.round(session.totalDuration)},"${formatTime(session.totalDuration, true)}",100%\n`;
  csv += `Dead Space/Silence,,${Math.round(session.deadSpaceDuration)},"${formatTime(session.deadSpaceDuration, true)}",${((session.deadSpaceDuration / session.totalDuration) * 100).toFixed(1)}%\n`;
  
  session.speakers.forEach(s => {
    csv += `Speaker: ${s.name},,${Math.round(s.totalTime)},"${formatTime(s.totalTime, true)}",${((s.totalTime / session.totalDuration) * 100).toFixed(1)}%\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `LapTimer_${session.title.replace(/\s+/g, '_')}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadJSON(session) {
  const jsonStr = JSON.stringify(session, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `LapTimer_${session.title.replace(/\s+/g, '_')}_${Date.now()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- Helper Functions ---
function formatTime(ms, omitCentiseconds = false) {
  if (ms < 0) ms = 0;
  
  const totalSecs = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSecs / 60);
  const seconds = totalSecs % 60;
  
  const pad = (n) => String(n).padStart(2, '0');
  
  if (omitCentiseconds) {
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}:${pad(minutes % 60)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }
  
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// --- Side Drawer Panel Animations ---
function openPanel(panel) {
  panel.classList.add('open');
  dom.dimmer.classList.add('active');
}

function closeAllPanels() {
  dom.settingsPanel.classList.remove('open');
  dom.historyPanel.classList.remove('open');
  dom.dimmer.classList.remove('active');
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Session Controls
  dom.btnStartPause.addEventListener('click', () => {
    if (state.sessionState === 'running') {
      pauseSession();
    } else if (state.sessionState === 'paused') {
      resumeSession();
    } else {
      startSession();
    }
  });
  
  dom.btnReset.addEventListener('click', resetSession);
  
  dom.btnSaveSession.addEventListener('click', () => {
    saveSession();
  });
  
  dom.btnDeadSpace.addEventListener('click', () => handleSpeakerSelection(null));
  
  // Navigation / Panels Toggle
  dom.btnSettingsToggle.addEventListener('click', () => openPanel(dom.settingsPanel));
  dom.btnHistoryToggle.addEventListener('click', () => openPanel(dom.historyPanel));
  dom.btnCloseSettings.addEventListener('click', closeAllPanels);
  dom.btnCloseHistory.addEventListener('click', closeAllPanels);
  dom.dimmer.addEventListener('click', closeAllPanels);
  
  // Modals Export
  dom.btnCloseExport.addEventListener('click', () => {
    dom.exportModal.classList.add('hidden');
  });
  
  dom.btnCopyClipboard.addEventListener('click', () => {
    dom.copyTextArea.select();
    document.execCommand('copy');
    dom.btnCopyClipboard.textContent = 'Copied!';
    setTimeout(() => {
      dom.btnCopyClipboard.textContent = 'Copy Summary';
    }, 1500);
  });
  
  // Add Speaker Form Submit
  dom.addSpeakerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = dom.newSpeakerName.value.trim();
    if (name) {
      addSpeaker(name);
      dom.newSpeakerName.value = '';
    }
  });

  // Quick Add / Quick Switch Input Handling
  dom.quickAddInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = dom.quickAddInput.value.trim();
      if (!val) return;

      // Check if speaker already active in the grid (case-insensitive)
      const existing = state.speakers.find(s => s.name.toLowerCase() === val.toLowerCase());
      
      if (existing) {
        // Just switch to them
        handleSpeakerSelection(existing.id);
      } else {
        // Add as a new active speaker and switch to them immediately
        addSpeaker(val, true);

        // Also add to pool if not present, so they are saved for future autocomplete suggestions
        const inPool = state.speakerPool.some(name => name.toLowerCase() === val.toLowerCase());
        if (!inPool) {
          state.speakerPool.push(val);
          saveDataToStorage();
        }
      }
      
      dom.quickAddInput.value = '';
      updateRosterSuggestions();
    } else if (e.key === 'Escape') {
      // Blur the input to re-enable general keyboard hotkeys
      dom.quickAddInput.blur();
    }
  });

  // Bulk Import Pool
  dom.btnImportRoster.addEventListener('click', () => {
    const rawVal = dom.bulkRosterInput.value;
    const names = rawVal
      .split(/[,\n]/)
      .map(name => name.trim())
      .filter(name => name.length > 0);

    // Filter out duplicates (case-insensitive deduplication)
    const seen = new Set();
    const uniqueNames = [];
    names.forEach(name => {
      const lower = name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueNames.push(name);
      }
    });

    state.speakerPool = uniqueNames;
    saveDataToStorage();
    updateRosterSuggestions();
    triggerHaptic();
    alert(`Successfully saved speaker pool with ${uniqueNames.length} names!`);
  });
  
  // History Actions
  dom.btnClearHistory.addEventListener('click', () => {
    if (confirm('Clear all session history permanently? This action is irreversible.')) {
      state.history = [];
      saveDataToStorage();
      renderHistory();
      triggerHaptic();
    }
  });
  
  // Keyboard Hotkeys
  window.addEventListener('keydown', (e) => {
    // Exclude keyboard inputs to prevent typing inside text boxes from triggering events
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      // Allow Escape key to blur active text areas/inputs
      if (e.key === 'Escape') {
        document.activeElement.blur();
      }
      return;
    }
    
    // Spacebar starts/pauses session
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      dom.btnStartPause.click();
      return;
    }
    
    // 0 toggles to dead space
    if (e.key === '0') {
      e.preventDefault();
      handleSpeakerSelection(null);
      return;
    }
    
    // 1-9 keys map to speakers by key value
    const numericKey = parseInt(e.key);
    if (numericKey >= 1 && numericKey <= 9) {
      e.preventDefault();
      const speaker = state.speakers.find(s => s.key === numericKey);
      if (speaker) {
        handleSpeakerSelection(speaker.id);
      }
    }
  });
}
