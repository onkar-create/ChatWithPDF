/* ============================================================
   ChatWithPDF — Frontend Logic + Three.js 3D Background
   ============================================================ */

const API_BASE = 'http://localhost:8000';

// Auth-aware fetch — automatically adds Bearer token to every request
function apiFetch(url, options = {}) {
  const t = localStorage.getItem('token');
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(t ? { 'Authorization': `Bearer ${t}` } : {}),
    },
  });
}

// ── Auth guard ──────────────────────────────────────────────
const token    = localStorage.getItem('token');
const username = localStorage.getItem('username');
if (!token) {
  window.location.href = 'auth.html';
} else {
  document.body.style.visibility = 'visible';
}
document.getElementById('usernameLabel').textContent = username ? `👤 ${username}` : '';
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'auth.html';
});

/* ============================================================
   THREE.JS — 3D ANIMATED BACKGROUND
   ============================================================ */
(function initThreeJS() {
  const canvas   = document.getElementById('bg-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 18;

  /* Lighting */
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const light1 = new THREE.PointLight(0x6366f1, 1.5, 50);
  light1.position.set(10, 10, 10);
  scene.add(light1);
  const light2 = new THREE.PointLight(0x4f46e5, 1.2, 50);
  light2.position.set(-10, -5, 5);
  scene.add(light2);
  const light3 = new THREE.PointLight(0x818cf8, 1.0, 50);
  light3.position.set(0, -10, 8);
  scene.add(light3);

  /* Colors palette — subtle indigo family only */
  const colors = [0x6366f1, 0x4f46e5, 0x818cf8, 0x3730a3, 0x4338ca, 0x6366f1, 0x4f46e5, 0xa5b4fc];

  const objects = [];

  /* Helper: random in range */
  const rnd  = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  /* Create floating geometric shapes */
  const geometries = [
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.OctahedronGeometry(1, 0),
    new THREE.TetrahedronGeometry(1, 0),
    new THREE.TorusGeometry(0.8, 0.3, 8, 12),
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.DodecahedronGeometry(0.9, 0),
  ];

  for (let i = 0; i < 38; i++) {
    const geo  = pick(geometries);
    const mat  = new THREE.MeshPhongMaterial({
      color:       pick(colors),
      wireframe:   Math.random() > 0.3,   // mostly wireframe = cleaner look
      transparent: true,
      opacity:     rnd(0.08, 0.30),       // more transparent = subtler
      shininess:   60,
    });

    const mesh = new THREE.Mesh(geo, mat);
    const scale = rnd(0.3, 1.2);
    mesh.scale.setScalar(scale);
    mesh.position.set(rnd(-22, 22), rnd(-14, 14), rnd(-12, 2));

    mesh.userData = {
      rotX:  rnd(-0.008, 0.008),
      rotY:  rnd(-0.012, 0.012),
      rotZ:  rnd(-0.005, 0.005),
      floatY: rnd(0.003, 0.008),
      floatX: rnd(-0.002, 0.002),
      phase:  rnd(0, Math.PI * 2),
      origY:  mesh.position.y,
      origX:  mesh.position.x,
    };

    scene.add(mesh);
    objects.push(mesh);
  }

  /* Particle field */
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3]     = rnd(-30, 30);
    positions[i * 3 + 1] = rnd(-20, 20);
    positions[i * 3 + 2] = rnd(-15, 0);
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xa78bfa,
    size: 0.08,
    transparent: true,
    opacity: 0.6,
  });
  scene.add(new THREE.Points(particleGeo, particleMat));

  /* Mouse parallax */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  document.addEventListener('mousemove', e => {
    mouse.tx = (e.clientX / window.innerWidth  - 0.5) * 1.5;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 1.0;
  });

  /* Animation loop */
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    /* Smooth mouse follow */
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    camera.position.x = mouse.x;
    camera.position.y = -mouse.y;
    camera.lookAt(scene.position);

    /* Animate each shape */
    objects.forEach(obj => {
      const d = obj.userData;
      obj.rotation.x += d.rotX;
      obj.rotation.y += d.rotY;
      obj.rotation.z += d.rotZ;
      obj.position.y  = d.origY + Math.sin(t * d.floatY * 60 + d.phase) * 1.2;
      obj.position.x  = d.origX + Math.cos(t * d.floatX * 60 + d.phase) * 0.6;
    });

    /* Pulse lights */
    light1.intensity = 1.5 + Math.sin(t * 1.2) * 0.8;
    light2.intensity = 1.5 + Math.cos(t * 0.9) * 0.8;

    renderer.render(scene, camera);
  }
  animate();

  /* Resize handler */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();


/* ============================================================
   APP STATE
   ============================================================ */
const state = {
  activePdfId:   null,
  activePdfName: null,
  pdfs:          [],
  notes:         [],
};

/* ============================================================
   DOM REFERENCES
   ============================================================ */
const els = {
  startupSplash:      document.getElementById('startupSplash'),
  pdfInput:           document.getElementById('pdfInput'),
  uploadStatus:       document.getElementById('uploadStatus'),
  pdfList:            document.getElementById('pdfList'),
  activePdfLabel:     document.getElementById('activePdfLabel'),
  chatPdfLabel:       document.getElementById('chatPdfLabel'),
  summaryPdfLabel:    document.getElementById('summaryPdfLabel'),
  historyPdfLabel:    document.getElementById('historyPdfLabel'),

  chatWindow:         document.getElementById('chatWindow'),
  questionInput:      document.getElementById('questionInput'),
  askBtn:             document.getElementById('askBtn'),
  clearChatBtn:       document.getElementById('clearChatBtn'),

  generateSummaryBtn: document.getElementById('generateSummaryBtn'),
  summaryContent:     document.getElementById('summaryContent'),

  noteInput:          document.getElementById('noteInput'),
  saveNoteBtn:        document.getElementById('saveNoteBtn'),
  notesList:          document.getElementById('notesList'),
  exportNotesBtn:     document.getElementById('exportNotesBtn'),

  loadHistoryBtn:     document.getElementById('loadHistoryBtn'),
  historyContent:     document.getElementById('historyContent'),

  loadingOverlay:     document.getElementById('loadingOverlay'),
  loadingText:        document.getElementById('loadingText'),
  toast:              document.getElementById('toast'),
};

/* ============================================================
   STARTUP SPLASH
   ============================================================ */
function initStartupSplash(delayMs = 3000) {
  if (!els.startupSplash) return;
  window.setTimeout(() => {
    els.startupSplash.classList.add('hide');
  }, delayMs);
}

/* ============================================================
   TAB NAVIGATION
   ============================================================ */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'history' && state.activePdfId) loadHistory();
  });
});

/* ============================================================
   UTILITIES
   ============================================================ */
function showLoading(msg = 'Processing...') {
  els.loadingText.textContent = msg;
  els.loadingOverlay.classList.remove('hidden');
}
function hideLoading() {
  els.loadingOverlay.classList.add('hidden');
}

function showToast(message, type = 'info', duration = 3200) {
  const icons = { success: '✅', error: '❌', info: '💡' };
  els.toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
  els.toast.className = `toast ${type}`;
  clearTimeout(els.toast._timer);
  els.toast._timer = setTimeout(() => els.toast.classList.add('hidden'), duration);
}

function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function scrollChatBottom() {
  els.chatWindow.scrollTop = els.chatWindow.scrollHeight;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

/* Auto-resize textarea */
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
els.questionInput.addEventListener('input', () => autoResize(els.questionInput));

/* ============================================================
   PDF UPLOAD
   ============================================================ */
async function uploadFiles(files) {
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast(`"${file.name}" is not a PDF`, 'error');
      continue;
    }

    showLoading(`Uploading "${file.name}"…`);
    els.uploadStatus.textContent = `⏳ Processing ${file.name}`;

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res  = await apiFetch(`${API_BASE}/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');

      state.pdfs.push({ pdf_id: data.pdf_id, file_name: data.file_name, page_count: data.page_count || 0 });
      renderPdfList();
      selectPdf(data.pdf_id, data.file_name);
      showToast(`"${file.name}" ready!`, 'success');
      els.uploadStatus.textContent = '';
    } catch (err) {
      showToast(`Upload error: ${err.message}`, 'error');
      els.uploadStatus.textContent = '❌ Upload failed';
    } finally {
      hideLoading();
    }
  }
}

els.pdfInput.addEventListener('change', async e => {
  const files = Array.from(e.target.files);
  if (files.length) await uploadFiles(files);
  els.pdfInput.value = '';
});

/* Drag & drop on the upload label */
const uploadArea = document.querySelector('.upload-btn');
uploadArea.addEventListener('dragover', e => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});
uploadArea.addEventListener('dragenter', e => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});
uploadArea.addEventListener('dragleave', e => {
  if (!uploadArea.contains(e.relatedTarget)) {
    uploadArea.classList.remove('drag-over');
  }
});
uploadArea.addEventListener('drop', async e => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files);
  if (files.length) await uploadFiles(files);
});

/* ============================================================
   PDF LIST
   ============================================================ */
function renderPdfList() {
  els.pdfList.innerHTML = '';

  // Update badge count
  const badge = document.getElementById('pdfCountBadge');
  if (badge) badge.textContent = state.pdfs.length || '';

  if (!state.pdfs.length) {
    els.pdfList.innerHTML = `<li class="pdf-list-empty"><i class="fa-solid fa-inbox"></i><span>No PDFs uploaded yet</span></li>`;
    return;
  }

  state.pdfs.forEach(({ pdf_id, file_name, page_count }) => {
    const li = document.createElement('li');
    li.className = 'pdf-list-item' + (pdf_id === state.activePdfId ? ' active' : '');
    li.innerHTML = `
      <i class="fa-solid fa-file-pdf"></i>
      <div class="pdf-info">
        <span class="pdf-name" title="${file_name}">${truncate(file_name, 22)}</span>
        ${page_count ? `<span class="pdf-pages">${page_count} pages</span>` : ''}
      </div>
      <div class="pdf-actions">
        <button class="pdf-rename-btn" title="Rename PDF"><i class="fa-solid fa-pen"></i></button>
        <button class="pdf-delete-btn" title="Delete PDF"><i class="fa-solid fa-trash-can"></i></button>
      </div>`;
    let clickTimer = null;
    li.addEventListener('click', (e) => {
      if (e.target.closest('.pdf-actions')) return;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => selectPdf(pdf_id, file_name), 220);
    });
    li.addEventListener('dblclick', (e) => {
      if (e.target.closest('.pdf-actions')) return;
      clearTimeout(clickTimer);
      if (state.activePdfId !== pdf_id) selectPdf(pdf_id, file_name);
      window.open(`${API_BASE}/pdf/${pdf_id}`, '_blank');
    });
    li.querySelector('.pdf-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deletePdf(pdf_id, file_name);
    });
    li.querySelector('.pdf-rename-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openRenameModal(pdf_id, file_name);
    });
    els.pdfList.appendChild(li);
  });
}

async function selectPdf(pdf_id, file_name) {
  state.activePdfId   = pdf_id;
  state.activePdfName = file_name;

  const label = `Active: ${file_name}`;
  els.activePdfLabel.textContent  = `📄 ${file_name}`;
  els.chatPdfLabel.textContent    = label;
  els.summaryPdfLabel.textContent = label;
  els.historyPdfLabel.textContent = label;

  document.querySelectorAll('.pdf-list-item').forEach(li => {
    li.classList.toggle('active', li.querySelector('span').title === file_name);
  });

  // Load previous chat history for this PDF
  try {
    const res  = await apiFetch(`${API_BASE}/chat/${pdf_id}`);
    const data = await res.json();
    const msgs = data.messages || [];

    if (msgs.length) {
      els.chatWindow.innerHTML = '';
      msgs.forEach(msg => {
        appendChatBubble('user', msg.question, msg.timestamp);
        appendChatBubble('ai',   msg.answer,   msg.timestamp);
      });
      scrollChatBottom();
    } else {
      resetChatWindow();
    }
  } catch {
    resetChatWindow();
  }
  showToast(`Switched to "${file_name}"`, 'info', 2000);
}

async function deletePdf(pdf_id, file_name) {
  if (!confirm(`Delete "${file_name}"? This cannot be undone.`)) return;
  try {
    await apiFetch(`${API_BASE}/pdf/${pdf_id}`, { method: 'DELETE' });
    state.pdfs = state.pdfs.filter(p => p.pdf_id !== pdf_id);
    if (state.activePdfId === pdf_id) {
      state.activePdfId   = null;
      state.activePdfName = null;
      els.activePdfLabel.textContent  = 'Upload a PDF to get started';
      els.chatPdfLabel.textContent    = 'No PDF selected';
      els.summaryPdfLabel.textContent = 'No PDF selected';
      els.historyPdfLabel.textContent = 'No PDF selected';
      els.chatWindow.innerHTML = `<div class="chat-welcome"><div class="welcome-icon"><i class="fa-solid fa-robot"></i></div><h3 class="welcome-title gradient-text">Hello, I'm your AI Assistant!</h3><p class="welcome-desc">Upload a PDF from the sidebar and ask me anything about it.</p></div>`;
    }
    renderPdfList();
    showToast(`"${file_name}" deleted`, 'info');
  } catch {
    showToast('Failed to delete PDF', 'error');
  }
}

/* ============================================================
   CHAT
   ============================================================ */
document.getElementById('exportChatBtn').addEventListener('click', exportChat);

function exportChat() {
  const messages = els.chatWindow.querySelectorAll('.chat-message');
  if (!messages.length) { showToast('No chat to export', 'error'); return; }

  const lines = [];
  lines.push(`ChatWithPDF — Chat Export`);
  lines.push(`PDF: ${state.activePdfName || 'Unknown'}`);
  lines.push(`Exported: ${new Date().toLocaleString()}`);
  lines.push('='.repeat(50));

  messages.forEach(msg => {
    const isUser = msg.classList.contains('user');
    const bubble = msg.querySelector('.chat-bubble');
    if (!bubble || msg.classList.contains('typing-indicator')) return;
    const role = isUser ? 'You' : 'AI';
    lines.push(`\n[${role}]\n${bubble.textContent.trim()}`);
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `chat_${state.activePdfName || 'export'}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Chat exported!', 'success');
}

els.askBtn.addEventListener('click', askQuestion);
els.questionInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askQuestion(); }
});

async function askQuestion() {
  const question = els.questionInput.value.trim();

  if (!state.activePdfId) { showToast('Please upload and select a PDF first', 'error'); return; }
  if (!question)           { showToast('Please enter a question', 'error'); return; }

  /* Remove welcome screen */
  const welcome = els.chatWindow.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  appendChatBubble('user', question, new Date().toISOString());
  els.questionInput.value = '';
  els.questionInput.style.height = 'auto';

  const typing = appendTypingIndicator();
  scrollChatBottom();

  try {
    const res  = await apiFetch(`${API_BASE}/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ pdf_id: state.activePdfId, question }),
    });
    const data = await res.json();
    typing.remove();
    if (!res.ok) throw new Error(data.detail || 'Failed to get answer');
    appendChatBubble('ai', data.answer, data.timestamp, data.citations);
  } catch (err) {
    typing.remove();
    appendChatBubble('ai', `⚠️ ${err.message}`, new Date().toISOString());
    showToast('Error getting answer', 'error');
  }

  scrollChatBottom();
}

/* ============================================================
   CHAT BUBBLES
   ============================================================ */
function appendChatBubble(role, text, timestamp, citations = []) {
  const wrapper = document.createElement('div');
  wrapper.className = `chat-message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';
  avatar.innerHTML = role === 'user'
    ? '<i class="fa-solid fa-user"></i>'
    : '<i class="fa-solid fa-robot"></i>';

  const wrap = document.createElement('div');
  wrap.className = 'chat-bubble-wrap';

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  if (role === 'ai') {
    bubble.innerHTML = marked.parse(text);
  } else {
    bubble.textContent = text;
  }
  wrap.appendChild(bubble);

  /* Copy button (both user and AI) */
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      setTimeout(() => { copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy'; }, 2000);
    });
  });
  wrap.appendChild(copyBtn);

  /* Citations */
  if (role === 'ai' && citations && citations.length) {
    const cit = document.createElement('div');
    cit.className = 'citation-block';
    cit.innerHTML = `<strong><i class="fa-solid fa-quote-left"></i> Source Citations</strong>`;
    citations.forEach(c => {
      const p = document.createElement('p');
      p.textContent = `Page ${c.page}: "${c.text}"`;
      p.style.marginTop = '4px';
      cit.appendChild(p);
    });
    wrap.appendChild(cit);
  }

  /* Timestamp */
  const ts = document.createElement('span');
  ts.className = 'chat-timestamp';
  ts.textContent = formatTime(timestamp);
  wrap.appendChild(ts);

  /* Save as Note (AI only) */
  if (role === 'ai') {
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-ghost btn-sm save-response-btn';
    saveBtn.innerHTML = '<i class="fa-solid fa-bookmark"></i> Save as Note';
    saveBtn.addEventListener('click', () => saveNoteFromAI(text));
    wrap.appendChild(saveBtn);
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(wrap);
  els.chatWindow.appendChild(wrapper);
  return wrapper;
}

function appendTypingIndicator() {
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-message ai typing-indicator';
  wrapper.innerHTML = `
    <div class="chat-avatar"><i class="fa-solid fa-robot"></i></div>
    <div class="chat-bubble-wrap">
      <div class="chat-bubble">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </div>`;
  els.chatWindow.appendChild(wrapper);
  return wrapper;
}

function resetChatWindow() {
  els.chatWindow.innerHTML = `
    <div class="chat-welcome">
      <div class="welcome-icon">
        <i class="fa-solid fa-robot"></i>
      </div>
      <h3 class="welcome-title gradient-text">PDF Loaded!</h3>
      <p class="welcome-desc">I'm ready to answer questions about <strong>${escapeHtml(state.activePdfName)}</strong>. Ask me anything!</p>
      <div class="welcome-chips">
        <span class="chip"><i class="fa-solid fa-search"></i> Semantic Search</span>
        <span class="chip"><i class="fa-solid fa-quote-left"></i> Citations</span>
        <span class="chip"><i class="fa-solid fa-history"></i> Chat History</span>
      </div>
    </div>`;
}

/* ============================================================
   CLEAR CHAT
   ============================================================ */
els.clearChatBtn.addEventListener('click', async () => {
  if (!state.activePdfId) { showToast('No PDF selected', 'error'); return; }
  if (!confirm('Clear entire chat history for this PDF?')) return;

  try {
    await apiFetch(`${API_BASE}/chat/${state.activePdfId}`, { method: 'DELETE' });
    resetChatWindow();
    showToast('Chat cleared', 'success');
  } catch {
    showToast('Failed to clear chat', 'error');
  }
});

/* ============================================================
   SUMMARY
   ============================================================ */
els.generateSummaryBtn.addEventListener('click', () => fetchSummary(false));
document.getElementById('refreshSummaryBtn').addEventListener('click', () => fetchSummary(true));

document.getElementById('copySummaryBtn').addEventListener('click', () => {
  const items = els.summaryContent.querySelectorAll('.summary-list li span:last-child');
  const text  = Array.from(items).map(el => `• ${el.textContent}`).join('\n');
  navigator.clipboard.writeText(text).then(() => showToast('Summary copied!', 'success'));
});

document.getElementById('exportSummaryBtn').addEventListener('click', () => {
  const items = els.summaryContent.querySelectorAll('.summary-list li span:last-child');
  if (!items.length) return;
  const lines = [
    `ChatWithPDF — Summary`,
    `PDF: ${state.activePdfName || 'Unknown'}`,
    `Exported: ${new Date().toLocaleString()}`,
    '='.repeat(40),
    '',
    ...Array.from(items).map(el => `• ${el.textContent}`)
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `summary_${state.activePdfName || 'export'}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Summary exported!', 'success');
});

async function fetchSummary(refresh = false) {
  if (!state.activePdfId) { showToast('Please select a PDF first', 'error'); return; }

  showLoading(refresh ? 'Regenerating summary…' : 'Generating AI summary…');

  try {
    const url  = `${API_BASE}/summary/${state.activePdfId}${refresh ? '?refresh=true' : ''}`;
    const res  = await apiFetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Summary failed');
    renderSummary(data.summary);
    // Show action buttons
    document.getElementById('copySummaryBtn').style.display    = '';
    document.getElementById('exportSummaryBtn').style.display  = '';
    document.getElementById('refreshSummaryBtn').style.display = '';
    showToast(refresh ? 'Summary regenerated!' : 'Summary ready!', 'success');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    hideLoading();
  }
}

function renderSummary(points) {
  const items = Array.isArray(points)
    ? points
    : String(points).split('\n').filter(p => p.trim());

  els.summaryContent.innerHTML = '';
  const ul = document.createElement('ul');
  ul.className = 'summary-list';

  items.forEach((point, i) => {
    const clean = point.replace(/^[-•*\d.]+\s*/, '').trim();
    if (!clean) return;
    const li = document.createElement('li');
    li.innerHTML = `<span class="summary-bullet">${i + 1}</span><span>${escapeHtml(clean)}</span>`;
    ul.appendChild(li);
  });

  els.summaryContent.appendChild(ul);
}

/* ============================================================
   NOTES
   ============================================================ */
document.getElementById('noteSearch').addEventListener('input', e => renderNotes(e.target.value));

els.saveNoteBtn.addEventListener('click', () => {
  const content = els.noteInput.value.trim();
  if (!content) { showToast('Note is empty', 'error'); return; }
  saveNote(content, 'user');
  els.noteInput.value = '';
});

async function saveNote(content, source = 'user') {
  try {
    const res  = await apiFetch(`${API_BASE}/notes`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        content, source,
        pdf_id:   state.activePdfId   || null,
        pdf_name: state.activePdfName || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Save failed');

    state.notes.unshift(data);
    renderNotes();
    showToast('Note saved!', 'success');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

function saveNoteFromAI(text) {
  saveNote(text, 'ai');
  document.querySelector('[data-tab="notes"]').click();
}

async function loadNotes() {
  try {
    const res  = await apiFetch(`${API_BASE}/notes`);
    const data = await res.json();
    state.notes = data;
    renderNotes();
  } catch {
    /* Backend not running — silent during frontend dev */
  }
}

function renderNotes(filter = '') {
  els.notesList.innerHTML = '';

  let notes = state.notes;
  if (filter) {
    const q = filter.toLowerCase();
    notes = notes.filter(n =>
      n.content.toLowerCase().includes(q) ||
      (n.pdf_name && n.pdf_name.toLowerCase().includes(q))
    );
  }

  if (!notes.length) {
    els.notesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon-wrap"><i class="fa-solid fa-note-sticky"></i></div>
        <h3>${filter ? 'No matching notes' : 'No Notes Yet'}</h3>
        <p>${filter ? 'Try a different search term.' : 'Write a note above or save any AI response as a note.'}</p>
      </div>`;
    return;
  }

  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = 'note-card' + (note.pinned ? ' pinned' : '');
    card.dataset.id = note.note_id;

    card.innerHTML = `
      <div class="note-card-header">
        <span class="note-source-badge ${note.source === 'ai' ? 'badge-ai' : 'badge-user'}">
          ${note.source === 'ai' ? '🤖 AI Response' : '✏️ My Note'}
        </span>
        ${note.pdf_name ? `<span class="note-pdf-tag"><i class="fa-solid fa-file-pdf"></i> ${truncate(note.pdf_name, 20)}</span>` : ''}
        <button class="pin-note-btn ${note.pinned ? 'pinned' : ''}" title="${note.pinned ? 'Unpin' : 'Pin'}">
          <i class="fa-${note.pinned ? 'solid' : 'regular'} fa-star"></i>
        </button>
      </div>
      <div class="note-card-content" id="content-${note.note_id}">${escapeHtml(note.content)}</div>
      <div class="note-card-footer">
        <span class="note-timestamp"><i class="fa-regular fa-clock"></i> ${formatTime(note.created_at)}</span>
        <div style="display:flex;gap:6px;">
          <button class="edit-note-btn" data-id="${note.note_id}"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="delete-note-btn" data-id="${note.note_id}"><i class="fa-solid fa-trash-can"></i> Delete</button>
        </div>
      </div>`;

    card.querySelector('.pin-note-btn').addEventListener('click', () => togglePin(note.note_id));
    card.querySelector('.edit-note-btn').addEventListener('click', () => startEditNote(note));
    card.querySelector('.delete-note-btn').addEventListener('click', () => deleteNote(note.note_id));
    els.notesList.appendChild(card);
  });
}

async function togglePin(noteId) {
  try {
    const res  = await apiFetch(`${API_BASE}/notes/${noteId}/pin`, { method: 'PATCH' });
    const data = await res.json();
    const idx  = state.notes.findIndex(n => n.note_id === noteId);
    if (idx !== -1) state.notes[idx] = data;
    renderNotes(document.getElementById('noteSearch').value);
    showToast(data.pinned ? 'Note pinned!' : 'Note unpinned', 'info', 1500);
  } catch { showToast('Failed to pin note', 'error'); }
}

function startEditNote(note) {
  const contentEl = document.getElementById(`content-${note.note_id}`);
  if (!contentEl) return;
  const original = note.content;
  contentEl.innerHTML = `<textarea class="note-edit-textarea">${escapeHtml(original)}</textarea>
    <div style="display:flex;gap:6px;margin-top:6px;">
      <button class="btn btn-primary btn-sm save-edit-btn">Save</button>
      <button class="btn btn-ghost btn-sm cancel-edit-btn">Cancel</button>
    </div>`;
  contentEl.querySelector('.save-edit-btn').addEventListener('click', async () => {
    const newContent = contentEl.querySelector('textarea').value.trim();
    if (!newContent) return;
    try {
      const res  = await apiFetch(`${API_BASE}/notes/${note.note_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });
      const data = await res.json();
      const idx  = state.notes.findIndex(n => n.note_id === note.note_id);
      if (idx !== -1) state.notes[idx] = data;
      renderNotes(document.getElementById('noteSearch').value);
      showToast('Note updated!', 'success');
    } catch { showToast('Failed to update note', 'error'); }
  });
  contentEl.querySelector('.cancel-edit-btn').addEventListener('click', () =>
    renderNotes(document.getElementById('noteSearch').value)
  );
}

async function deleteNote(noteId) {
  try {
    await apiFetch(`${API_BASE}/notes/${noteId}`, { method: 'DELETE' });
    state.notes = state.notes.filter(n => n.note_id !== noteId);
    renderNotes();
    showToast('Note deleted', 'info');
  } catch {
    showToast('Failed to delete note', 'error');
  }
}

/* ============================================================
   EXPORT NOTES
   ============================================================ */
els.exportNotesBtn.addEventListener('click', () => {
  if (!state.notes.length) { showToast('No notes to export', 'error'); return; }

  const lines = state.notes.map((n, i) =>
    `[${i + 1}] [${n.source.toUpperCase()}] ${formatTime(n.created_at)}\n${n.content}`
  );
  const blob = new Blob([lines.join('\n\n---\n\n')], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'ChatWithPDF_Notes.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Notes exported!', 'success');
});

/* ============================================================
   HISTORY
   ============================================================ */
els.loadHistoryBtn.addEventListener('click', loadHistory);

document.getElementById('exportHistoryBtn').addEventListener('click', exportHistory);

function exportHistory() {
  if (!state._historyMessages || !state._historyMessages.length) {
    showToast('No history to export', 'error'); return;
  }
  const lines = [
    `ChatWithPDF — Chat History`,
    `PDF: ${state.activePdfName || 'Unknown'}`,
    `Exported: ${new Date().toLocaleString()}`,
    '='.repeat(40),
  ];
  state._historyMessages.forEach((msg, i) => {
    lines.push(`\n[${i + 1}] ${formatTime(msg.timestamp)}`);
    lines.push(`Q: ${msg.question}`);
    lines.push(`A: ${msg.answer}`);
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `history_${state.activePdfName || 'export'}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('History exported!', 'success');
}

async function loadHistory() {
  if (!state.activePdfId) { showToast('Please select a PDF first', 'error'); return; }

  showLoading('Loading history…');

  try {
    const res  = await apiFetch(`${API_BASE}/chat/${state.activePdfId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed');
    state._historyMessages = data.messages || [];
    renderHistory(state._historyMessages);
    showToast('History loaded', 'success');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    hideLoading();
  }
}

function renderHistory(messages, filter = '') {
  els.historyContent.innerHTML = '';

  let filtered = messages;
  if (filter) {
    const q = filter.toLowerCase();
    filtered = messages.filter(m =>
      m.question.toLowerCase().includes(q) || m.answer.toLowerCase().includes(q)
    );
  }

  if (!filtered.length) {
    els.historyContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon-wrap"><i class="fa-solid fa-clock-rotate-left"></i></div>
        <h3>${filter ? 'No matching results' : 'No History'}</h3>
        <p>${filter ? 'Try a different search term.' : 'Select a PDF and click Load History.'}</p>
      </div>`;
    return;
  }

  // Search bar
  const searchWrap = document.createElement('div');
  searchWrap.className = 'note-search-wrap';
  searchWrap.style.marginBottom = '12px';
  searchWrap.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i>
    <input type="text" class="note-search" placeholder="Search history..." value="${escapeHtml(filter)}"/>`;
  searchWrap.querySelector('input').addEventListener('input', e =>
    renderHistory(state._historyMessages || [], e.target.value)
  );
  els.historyContent.appendChild(searchWrap);

  filtered.forEach(msg => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div class="history-question">
        <i class="fa-solid fa-circle-question"></i>
        <span>${escapeHtml(msg.question)}</span>
      </div>
      <div class="history-answer">${escapeHtml(msg.answer)}</div>
      <div class="history-time"><i class="fa-regular fa-clock"></i> ${formatTime(msg.timestamp)}</div>`;
    els.historyContent.appendChild(card);
  });
}

/* ============================================================
   MOBILE SIDEBAR TOGGLE
   ============================================================ */
const sidebarToggle  = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebar        = document.querySelector('.sidebar');

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('active');
});
sidebarOverlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
});

/* ============================================================
   INIT
   ============================================================ */
async function loadPdfs() {
  try {
    const res  = await apiFetch(`${API_BASE}/pdfs`);
    const data = await res.json();
    state.pdfs = data.pdfs || [];
    renderPdfList();
  } catch {
    // silently fail — user will just see empty list
  }
}

/* ============================================================
   CHAR COUNTER
   ============================================================ */
const noteCharCount = document.getElementById('noteCharCount');
els.noteInput.addEventListener('input', () => {
  const len = els.noteInput.value.length;
  noteCharCount.textContent = `${len} / 1000`;
  noteCharCount.style.color = len > 900 ? '#ef4444' : '';
});

/* ============================================================
   DARK / LIGHT MODE TOGGLE
   ============================================================ */
const themeBtn = document.getElementById('themeToggleBtn');
const savedTheme = localStorage.getItem('theme') || 'dark';
if (savedTheme === 'light') document.body.classList.add('light-mode');
themeBtn.innerHTML = savedTheme === 'light'
  ? '<i class="fa-solid fa-sun"></i>'
  : '<i class="fa-solid fa-moon"></i>';

themeBtn.addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  themeBtn.innerHTML = isLight
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';
});

/* ============================================================
   HELP MODAL
   ============================================================ */
document.getElementById('helpBtn').addEventListener('click', () => {
  document.getElementById('helpModal').style.display = 'flex';
});
document.getElementById('helpModalClose').addEventListener('click', () => {
  document.getElementById('helpModal').style.display = 'none';
});
document.getElementById('helpModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('helpModal'))
    document.getElementById('helpModal').style.display = 'none';
});

/* ============================================================
   RENAME PDF MODAL
   ============================================================ */
let _renamePdfId = null;

function openRenameModal(pdf_id, file_name) {
  _renamePdfId = pdf_id;
  document.getElementById('renameInput').value = file_name.replace(/\.pdf$/i, '');
  document.getElementById('renameModal').style.display = 'flex';
  document.getElementById('renameInput').focus();
}

document.getElementById('renameModalClose').addEventListener('click', () => {
  document.getElementById('renameModal').style.display = 'none';
});
document.getElementById('renameModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('renameModal'))
    document.getElementById('renameModal').style.display = 'none';
});
document.getElementById('renameConfirmBtn').addEventListener('click', () => {
  const newName = document.getElementById('renameInput').value.trim();
  if (!newName || !_renamePdfId) return;
  const fullName = newName.endsWith('.pdf') ? newName : newName + '.pdf';
  const pdf = state.pdfs.find(p => p.pdf_id === _renamePdfId);
  if (pdf) {
    pdf.file_name = fullName;
    renderPdfList();
    if (state.activePdfId === _renamePdfId) {
      els.activePdfLabel.textContent = `📄 ${fullName}`;
    }
    showToast('PDF renamed', 'success');
  }
  document.getElementById('renameModal').style.display = 'none';
});
document.getElementById('renameInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('renameConfirmBtn').click();
});

loadPdfs();
loadNotes();
initStartupSplash();
