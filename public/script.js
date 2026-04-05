let ui = {};
let socket = null;
let currentRoomId = null;
let isHost = false;
let myUsername = '';
let myColor = '';
let player = null;
let syncGuard = false;
let playerReady = false;

function getYouTubeId(url) {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// ----- Landing Page -----
function renderJoinScreen() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="join-overlay">
      <div class="join-card">
        <h2>WatchSync</h2>
        <p style="margin-bottom: 16px;">Watch YouTube together in sync</p>
        <div class="btn-group">
          <button class="primary-btn" id="createRoomBtn"> Create Room</button>
          <button class="primary-btn" id="joinRoomBtn"> Join Room</button>
        </div>
        <div class="join-footer">
          Made with care by <a href="https://github.com/Swarup113" target="_blank">Swarup Dewanjee</a>
        </div>
      </div>
    </div>
  `;
  document.getElementById('createRoomBtn').onclick = () => {
    const newRoomId = Math.random().toString(36).substring(2, 10);
    window.location.href = `/?room=${newRoomId}`;
  };
  document.getElementById('joinRoomBtn').onclick = () => {
    const roomId = prompt('Enter Room ID:');
    if (roomId && roomId.trim()) {
      window.location.href = `/?room=${roomId.trim()}`;
    }
  };
}

// ----- Name prompt for direct link or join -----
function promptForName(roomId, callback) {
  const modalDiv = document.createElement('div');
  modalDiv.className = 'name-modal';
  modalDiv.innerHTML = `
    <div class="modal-card">
      <h3>Join Room: ${roomId}</h3>
      <input type="text" id="nameModalInput" placeholder="Your name (optional)" autocomplete="off">
      <button id="nameModalSubmit">Join</button>
      <div class="join-footer" style="margin-top: 16px;">
        Made with care by <a href="https://github.com/Swarup113" target="_blank">Swarup Dewanjee</a>
      </div>
    </div>
  `;
  document.body.appendChild(modalDiv);
  const input = modalDiv.querySelector('#nameModalInput');
  const btn = modalDiv.querySelector('#nameModalSubmit');
  const handleSubmit = () => {
    const name = input.value.trim();
    modalDiv.remove();
    callback(name);
  };
  btn.onclick = handleSubmit;
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSubmit(); });
  input.focus();
}

function initFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room');
  if (!room) {
    renderJoinScreen();
    return false;
  }
  currentRoomId = room;
  let name = params.get('name');
  if (name) {
    startRoom(room, name);
  } else {
    promptForName(room, (enteredName) => {
      startRoom(room, enteredName || '');
    });
  }
  return true;
}

function startRoom(roomId, username) {
  myUsername = username;
  renderRoomUI();
  connectSocket(roomId);
}

function renderRoomUI() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="app-container">
      <div class="header">
        <div class="logo">WatchSync</div>
        <div class="room-info">
          <span><i class="fas fa-hashtag"></i> Room: <span id="roomIdDisplay"></span></span>
          <button class="copy-link-btn" id="copyInviteBtn"><i class="fas fa-link"></i> <span class="desktop-only-text">Copy link</span></button>
          <span id="hostBadgeSpan" class="badge host-badge" style="display: none;"><i class="fas fa-crown"></i> Host</span>
          <span id="guestBadgeSpan" class="badge guest-badge" style="display: none;"><i class="fas fa-user"></i> Guest</span>
        </div>
      </div>
      <div class="main-layout">
        <div class="video-section">
          <div class="video-wrapper">
            <div id="player-container"></div>
          </div>
          <div id="videoControlsPanel" class="video-controls">
            <button id="playPauseBtn" class="ctrl-btn"><i class="fas fa-play"></i></button>
            <input type="range" id="seekSlider" class="seek-slider" min="0" max="100" step="0.1" value="0">
            <span id="timeLabel">0:00 / 0:00</span>
          </div>
          <div class="url-input-group">
            <input type="text" id="videoUrlInput" class="url-input" placeholder="Paste YouTube URL" autocomplete="off">
            <button id="loadVideoBtn" class="load-vid-btn"><i class="fas fa-sync-alt"></i> Load</button>
          </div>
          <div class="helper-text"><i class="fas fa-info-circle"></i> Only host can control video.</div>
        </div>
        <div class="chat-panel">
          <div class="chat-header">
            <span><i class="fas fa-comment-dots"></i> Chat</span>
            <span id="participantsList" class="participants-list">👥 0</span>
          </div>
          <div id="chatMessages" class="messages-area"></div>
          <div class="chat-input-area">
            <input type="text" id="chatInput" class="chat-input" placeholder="Type a message..." autocomplete="off">
            <button id="sendChatBtn" class="send-msg"><i class="fas fa-paper-plane"></i></button>
          </div>
        </div>
      </div>
      <div class="app-footer">
        Made with care by <a href="https://github.com/Swarup113" target="_blank">Swarup Dewanjee</a>
      </div>
    </div>
  `;
  ui.roomIdSpan = document.getElementById('roomIdDisplay');
  ui.copyBtn = document.getElementById('copyInviteBtn');
  ui.hostBadge = document.getElementById('hostBadgeSpan');
  ui.guestBadge = document.getElementById('guestBadgeSpan');
  ui.playPauseBtn = document.getElementById('playPauseBtn');
  ui.seekSlider = document.getElementById('seekSlider');
  ui.timeLabel = document.getElementById('timeLabel');
  ui.videoUrlInput = document.getElementById('videoUrlInput');
  ui.loadVideoBtn = document.getElementById('loadVideoBtn');
  ui.chatMessagesDiv = document.getElementById('chatMessages');
  ui.chatInput = document.getElementById('chatInput');
  ui.sendChatBtn = document.getElementById('sendChatBtn');
  ui.participantsSpan = document.getElementById('participantsList');
  ui.videoControlsPanel = document.getElementById('videoControlsPanel');

  // Debug: log if chat elements exist
  console.log('Chat input element:', ui.chatInput);
  console.log('Send button element:', ui.sendChatBtn);

  if (ui.roomIdSpan) ui.roomIdSpan.innerText = currentRoomId;
  if (ui.copyBtn) {
    ui.copyBtn.onclick = () => {
      const link = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
      navigator.clipboard.writeText(link);
      alert('Invite link copied!');
    };
  }
}

function connectSocket(roomId) {
  socket = io();

  socket.on('connect', () => {
    socket.emit('join-room', { roomId, username: myUsername });
  });

  socket.on('room-joined', (data) => {
    isHost = data.isHost;
    myUsername = data.username;
    myColor = data.color;
    if (isHost) {
      ui.hostBadge.style.display = 'inline-flex';
      ui.guestBadge.style.display = 'none';
      enableHostControls(true);
    } else {
      ui.hostBadge.style.display = 'none';
      ui.guestBadge.style.display = 'inline-flex';
      enableHostControls(false);
    }
    updateParticipantsUI(data.participants);
    if (data.videoState && data.videoState.url) {
      loadVideo(data.videoState.url, data.videoState.currentTime, data.videoState.isPlaying);
    }
  });

  socket.on('participants-update', (participants) => {
    updateParticipantsUI(participants);
  });

  socket.on('sync-play', () => {
    if (!isHost && player && playerReady) {
      syncGuard = true;
      player.playVideo();
      setTimeout(() => { syncGuard = false; }, 200);
    }
  });

  socket.on('sync-pause', () => {
    if (!isHost && player && playerReady) {
      syncGuard = true;
      player.pauseVideo();
      setTimeout(() => { syncGuard = false; }, 200);
    }
  });

  socket.on('sync-seek', (time) => {
    if (!isHost && player && playerReady) {
      syncGuard = true;
      player.seekTo(time, true);
      setTimeout(() => { syncGuard = false; }, 200);
    }
  });

  socket.on('sync-loadvideo', ({ url, currentTime, isPlaying }) => {
    if (!isHost) {
      loadVideo(url, currentTime, isPlaying);
    }
  });

  socket.on('chat-message', ({ username, color, text }) => {
    appendChatMessage(username, color, text);
  });
}

function loadVideo(url, seekTo = 0, autoPlay = false) {
  const videoId = getYouTubeId(url);
  if (!videoId) {
    alert('Invalid YouTube URL. Use youtube.com/watch?v=... or youtu.be/...');
    return false;
  }
  if (player && player.destroy) player.destroy();
  playerReady = false;
  const container = document.getElementById('player-container');
  container.innerHTML = '';
  player = new YT.Player('player-container', {
    height: '100%',
    width: '100%',
    videoId: videoId,
    playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, start: Math.floor(seekTo), autoplay: autoPlay ? 1 : 0 },
    events: {
      onReady: (event) => {
        playerReady = true;
        if (seekTo > 0) event.target.seekTo(seekTo, true);
        if (autoPlay) event.target.playVideo();
        attachPlayerEvents();
      },
      onStateChange: (event) => {
        if (syncGuard) return;
        if (isHost && playerReady) {
          const state = event.data;
          if (state === YT.PlayerState.PLAYING) socket.emit('host-play', { roomId: currentRoomId });
          else if (state === YT.PlayerState.PAUSED) socket.emit('host-pause', { roomId: currentRoomId });
        }
        updateSliderFromPlayer();
      }
    }
  });
  return true;
}

function attachPlayerEvents() {
  if (!player) return;
  const interval = setInterval(() => {
    if (player && player.getCurrentTime && isHost && playerReady && !syncGuard) {
      updateSliderFromPlayer();
    }
  }, 500);
  if (ui.seekSlider && isHost) {
    ui.seekSlider.oninput = (e) => {
      if (!isHost || !player || !playerReady) return;
      const percent = e.target.value / 100;
      const duration = player.getDuration();
      const seekTime = percent * duration;
      player.seekTo(seekTime, true);
      socket.emit('host-seek', { roomId: currentRoomId, time: seekTime });
    };
  }
}

function updateSliderFromPlayer() {
  if (!player || !player.getCurrentTime) return;
  const current = player.getCurrentTime();
  const duration = player.getDuration();
  if (duration && !isNaN(duration) && duration > 0) {
    ui.seekSlider.value = (current / duration) * 100;
    ui.timeLabel.innerText = `${formatTime(current)} / ${formatTime(duration)}`;
  }
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function appendChatMessage(username, color, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message';
  msgDiv.style.borderLeftColor = color;
  msgDiv.innerHTML = `<div class="author" style="color: ${color};">${escapeHtml(username)}</div><div class="text">${escapeHtml(text)}</div>`;
  ui.chatMessagesDiv.appendChild(msgDiv);
  msgDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateParticipantsUI(participants) {
  if (ui.participantsSpan) ui.participantsSpan.innerText = `👥 ${participants.length}`;
  const me = participants.find(p => p.username === myUsername);
  if (me && me.isHost !== isHost) {
    isHost = me.isHost;
    if (isHost) {
      ui.hostBadge.style.display = 'inline-flex';
      ui.guestBadge.style.display = 'none';
      enableHostControls(true);
    } else {
      ui.hostBadge.style.display = 'none';
      ui.guestBadge.style.display = 'inline-flex';
      enableHostControls(false);
    }
  }
}

function enableHostControls(enabled) {
  if (!ui.videoControlsPanel) return;
  if (enabled) {
    ui.videoControlsPanel.classList.remove('disabled-ctrl');
    ui.loadVideoBtn.disabled = false;
    ui.videoUrlInput.disabled = false;
    ui.playPauseBtn.disabled = false;
    ui.seekSlider.disabled = false;
  } else {
    ui.videoControlsPanel.classList.add('disabled-ctrl');
    ui.loadVideoBtn.disabled = true;
    ui.videoUrlInput.disabled = true;
    ui.playPauseBtn.disabled = true;
    ui.seekSlider.disabled = true;
  }
}

function bindUIEvents() {
  if (!ui.playPauseBtn) return;
  
  ui.playPauseBtn.onclick = () => {
    if (!isHost || !player || !playerReady) return;
    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) player.pauseVideo();
    else player.playVideo();
  };
  
  ui.loadVideoBtn.onclick = () => {
    if (!isHost) return;
    const url = ui.videoUrlInput.value.trim();
    if (!url) return;
    if (loadVideo(url, 0, false)) {
      socket.emit('host-change-video', { roomId: currentRoomId, url, currentTime: 0, isPlaying: false });
    }
  };
  
  // Mobile chat send: ensure button and input work
  if (ui.sendChatBtn) {
    const sendHandler = (e) => {
      e.preventDefault();
      sendMessage();
    };
    ui.sendChatBtn.addEventListener('click', sendHandler);
    ui.sendChatBtn.addEventListener('touchstart', sendHandler);
  }
  
  if (ui.chatInput) {
    ui.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });
    ui.chatInput.disabled = false;
    ui.chatInput.readOnly = false;
  }
}

function sendMessage() {
  if (!ui.chatInput) {
    console.error('Chat input not found');
    return;
  }
  const text = ui.chatInput.value.trim();
  if (!text || !socket) {
    console.log('No message or socket not ready');
    return;
  }
  console.log('Sending message:', text);
  socket.emit('chat-message', { roomId: currentRoomId, text });
  ui.chatInput.value = '';
  ui.chatInput.focus();
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Start the app
if (initFromUrl()) {
  const observer = new MutationObserver(() => {
    if (document.getElementById('playPauseBtn')) {
      bindUIEvents();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => { if (document.getElementById('playPauseBtn')) bindUIEvents(); }, 500);
}