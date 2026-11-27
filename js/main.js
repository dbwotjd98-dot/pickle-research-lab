import {
  $, $$, esc, relTime, hhmm, clockText, sanitizeRoom, roomLabel,
  storageGet, storageSet, copyText, uid, hash, shade,
} from './util.js';
import { createStore, isFirebaseConfigured } from './store.js';
import {
  characterSVG, faceSVG, PALETTE, STATES, STATE_ORDER, DEFAULT_ACCESSORIES,
} from './character.js';
import { backdropSVG } from './backdrop.js';

const LS_PROFILE = 'picklelab.profile.v1';
const LS_ROOM = 'picklelab.room.v1';
const LS_HIDE_DEMO = 'picklelab.hideDemo.v1';
const CID_KEY = 'picklelab.client.v1';

const TYPE_LABEL = { note: 'NOTE', todo: 'TO-DO', link: 'LINK', brief: 'BRIEF' };
const TYPE_NAME = { note: '노트', todo: '할 일', link: '링크', brief: '브리핑' };

const params = new URLSearchParams(location.search);
const room = sanitizeRoom(params.get('room') || storageGet(LS_ROOM, 'lab-1'));
const clientId = (() => {
  let id = null;
  try { id = sessionStorage.getItem(CID_KEY); } catch (err) { id = null; }
  if (!id) {
    id = uid('p_');
    try { sessionStorage.setItem(CID_KEY, id); } catch (err) { /* ignore */ }
  }
  return id;
})();

let profile = storageGet(LS_PROFILE, null);
let store = null;
let mode = 'demo';
let state = { presence: {}, board: {}, chat: {} };
let boardFilter = 'all';
let boardType = 'note';
let chatInitialized = false;
let lastChatTs = 0;
let selectedId = null;
let hideDemo = Boolean(storageGet(LS_HIDE_DEMO, false));
let storeErrorShown = false;
const pendingDelete = new Set();
const bubbleTimers = new Map();
const activeBubbles = new Map();
let lastPresenceSig = '';
let lastStationSig = '';
let lastBoardSig = '';
let lastChatSig = '';

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

function boot() {
  $('#room-backdrop').innerHTML = backdropSVG();
  $('#room-code').textContent = room.toUpperCase();
  $('#room-name').textContent = roomLabel(room);
  $('#chalk-room').textContent = roomLabel(room);
  $('#footer-room').textContent = room;
  document.title = `${roomLabel(room)} · 픽클 연구실`;

  if (!params.get('room')) {
    const url = new URL(location.href);
    url.searchParams.set('room', room);
    history.replaceState({}, '', url);
  }

  buildColorPicker();
  buildStatePicker();
  bindEvents();
  startClock();
  renderMode('connecting');
  renderAll();

  if (!profile) {
    window.setTimeout(() => openJoinDialog(false), 500);
  } else {
    joinRoom(profile, false);
  }
}

function startClock() {
  const tick = () => { $('#clock').textContent = clockText(); };
  tick();
  window.setInterval(tick, 1000);
}

/* ------------------------------------------------------------------ */
/* store                                                               */
/* ------------------------------------------------------------------ */

async function joinRoom(p, announce = true) {
  if (store) {
    store.destroy();
    store = null;
  }
  try {
    store = await createStore({
      room,
      clientId,
      profile: p,
      onState: (snapshot) => {
        state = snapshot;
        renderAll();
      },
      onMode: (m) => {
        mode = m;
        renderMode(m);
      },
      onError: (err) => {
        console.warn('[pickle-lab]', err);
        if (!storeErrorShown) {
          storeErrorShown = true;
          toast('실시간 연결에 문제가 있어요. 잠시 후 다시 시도해 주세요.');
        }
      },
    });
    if (announce) toast(`${p.name} 님, 연구실에 입장했어요.`);
  } catch (err) {
    console.error(err);
    mode = 'demo';
    renderMode('demo');
  }
}

function getMe() {
  return state.presence[clientId] || null;
}

/* ------------------------------------------------------------------ */
/* mode/status                                                         */
/* ------------------------------------------------------------------ */

function renderMode(next) {
  if (next) mode = next;
  const badge = $('#conn-badge');
  const text = $('#conn-text');
  const dot = $('#caption-dot');
  badge.classList.remove('is-live', 'is-demo', 'is-error', 'is-connecting');
  dot.classList.remove('is-live', 'is-demo');

  if (mode === 'live') {
    badge.classList.add('is-live');
    text.textContent = '실시간 연결';
    dot.classList.add('is-live');
    $('#room-caption-text').textContent = 'Firebase Realtime DB · 같은 방 코드의 피클과 실시간으로 연결됨';
    $('#presence-note').innerHTML = 'Firebase Realtime Database 로 연결됨 · 방 코드를 공유하면 다른 피클과 함께 씁니다.';
    $('#board-live').textContent = '실시간 공유 중';
  } else if (mode === 'connecting') {
    badge.classList.add('is-connecting');
    text.textContent = '연결 중';
    $('#room-caption-text').textContent = '연구실 문을 여는 중…';
  } else {
    badge.classList.add('is-demo');
    text.textContent = '데모 모드';
    dot.classList.add('is-demo');
    $('#room-caption-text').textContent = '데모 모드 · 이 브라우저에만 저장됨';
    $('#presence-note').innerHTML = '데모 모드 · 이 브라우저에만 저장돼요. 칠판 앞 <b>예시 연구원</b>은 실제 접속자가 아닙니다.'
      + (Object.values(state.presence).some((p) => p.demo)
        ? ` <button type="button" class="link-btn" id="toggle-demo">${hideDemo ? '예시 다시 보기' : '예시 숨기기'}</button>`
        : '');
    $('#board-live').textContent = '이 브라우저에만 저장';
    const toggle = $('#toggle-demo');
    if (toggle) {
      toggle.addEventListener('click', () => {
        hideDemo = !hideDemo;
        storageSet(LS_HIDE_DEMO, hideDemo);
        renderMode();
        renderAll();
      });
    }
  }
  $('#help-mode').textContent = mode === 'live' ? '실시간 연결' : '데모';
}

/* ------------------------------------------------------------------ */
/* render                                                              */
/* ------------------------------------------------------------------ */

function presentEntries() {
  const now = Date.now();
  return Object.values(state.presence)
    .filter((p) => p && p.id && (!p.demo || !hideDemo))
    .filter((p) => p.demo || now - (p.lastSeen || now) < 120000)
    .sort((a, b) => {
      if (a.id === clientId) return -1;
      if (b.id === clientId) return 1;
      return (a.joinedAt || 0) - (b.joinedAt || 0);
    });
}

function renderAll() {
  const entries = presentEntries();
  renderHeader(entries);
  renderPresence(entries);
  renderStations(entries);
  renderBoard();
  renderChat();
  renderMode();
  renderChalkBrief();
}

function renderHeader(entries) {
  $('#headcount').textContent = `연구원 ${entries.length}명`;
  const me = getMe();
  const avatar = $('#header-avatar');
  const name = $('#header-name');
  if (me) {
    avatar.textContent = me.initial || '·';
    avatar.style.background = `linear-gradient(160deg, ${me.color}, #2a1c14 140%)`;
    avatar.style.color = '#1c1207';
    name.textContent = me.name;
  } else {
    avatar.textContent = 'ㅂ';
    avatar.style.background = '';
    avatar.style.color = '';
    name.textContent = '입장하기';
  }
}

function renderPresence(entries) {
  const sig = entries.map((p) => `${p.id}:${p.state}:${p.message}:${p.name}:${p.color}:${p.field}`).join('|');
  $('#presence-count').textContent = String(entries.length);
  if (sig === lastPresenceSig) return;
  lastPresenceSig = sig;

  const list = $('#presence-list');
  if (!entries.length) {
    list.innerHTML = '<li class="chat-empty">아직 아무도 없어요.<br />첫 연구원이 되어 보세요.</li>';
    return;
  }
  list.innerHTML = entries.map((p) => {
    const isMe = p.id === clientId;
    const st = STATES[p.state] || STATES.reading;
    return `<li class="person${isMe ? ' is-me' : ''}" data-id="${esc(p.id)}" style="--pickle:${esc(p.color || '#6f9cf5')}" tabindex="0" role="button" aria-label="${esc(p.name)} 연구원 정보">
      <div class="person-avatar">${faceSVG(p)}</div>
      <div class="person-main">
        <div class="person-line"><b>${esc(p.name)}</b>${isMe ? '<span class="tag me">나</span>' : ''}${p.demo ? '<span class="tag demo">예시</span>' : ''}</div>
        <div class="person-field">${esc(p.field || '연구실 비서')}</div>
        ${p.message ? `<div class="person-msg">${esc(p.message)}</div>` : ''}
      </div>
      <span class="person-state" style="--state-color:${st.color}"><i></i>${st.short}</span>
    </li>`;
  }).join('');
}

function stationMarkup(p, isMe) {
  const st = STATES[p.state] || STATES.reading;
  return `<div class="station${isMe ? ' is-me' : ''}" data-id="${esc(p.id)}" style="--pickle:${esc(p.color || '#6f9cf5')}">
    <div class="bubble" data-bubble></div>
    <div class="researcher" role="button" tabindex="0" aria-label="${esc(p.name)} 연구원">${characterSVG(p, { state: p.state })}</div>
    <div class="desk">
      <div class="desk-paper"></div>
      <div class="desk-mug" style="background:linear-gradient(180deg, ${shade(p.color || '#6f9cf5', 0.6)}, ${shade(p.color || '#6f9cf5', 0.18)})"></div>
      <div class="nameplate" role="button" tabindex="0"><b>${esc(p.initial || '·')}</b><span>${esc(p.name)}</span>${p.demo ? '<span class="demo-mark">DEMO</span>' : ''}</div>
    </div>
    <span class="state-chip" style="--state-color:${st.color}"><i></i>${st.label}</span>
  </div>`;
}

function emptyStationMarkup() {
  return `<div class="station is-empty" data-empty="1">
    <div class="empty-chair"></div>
    <div class="desk">
      <div class="desk-paper"></div>
      <div class="desk-mug"></div>
      <div class="nameplate" role="button" tabindex="0"><b>+</b><span>빈 자리 · 초대</span></div>
    </div>
  </div>`;
}

function renderStations(entries) {
  const slots = Math.min(6, Math.max(2, entries.length + Math.max(0, 3 - entries.length)));
  const sig = `${entries.map((p) => `${p.id}:${p.state}:${p.color}:${p.name}:${p.initial}:${JSON.stringify(p.accessories || {})}`).join('|')}#${slots}#${hideDemo}`;
  if (sig === lastStationSig) return;
  lastStationSig = sig;

  const wrap = $('#stations');
  const html = entries.map((p) => stationMarkup(p, p.id === clientId)).join('');
  const empties = Math.max(0, slots - entries.length);
  wrap.innerHTML = html + Array.from({ length: empties }, emptyStationMarkup).join('');
  $('#room-empty').hidden = entries.length > 0;

  // keep active speech bubbles attached after re-render
  activeBubbles.forEach((info, id) => {
    if (info.until < Date.now()) { activeBubbles.delete(id); return; }
    const bubble = wrap.querySelector(`.station[data-id="${cssEscape(id)}"] .bubble`);
    if (!bubble) return;
    bubble.textContent = info.text;
    bubble.classList.add('show');
  });
}

function cssEscape(value) {
  if (window.CSS && CSS.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, '\\$&');
}

function renderChalkBrief() {
  const briefs = Object.values(state.board)
    .filter((b) => b && b.type === 'brief')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const latest = briefs[0];
  $('#chalk-brief').textContent = latest
    ? latest.text
    : '화이트보드에 첫 연구 노트를 남겨 보세요.';
}

function noteRotation(id) {
  const n = hash(id) % 7;
  return (n - 3) * 0.55;
}

function renderBoard() {
  const items = Object.values(state.board).filter(Boolean);
  const sig = `${boardFilter}#${items.map((b) => `${b.id}:${b.done ? 1 : 0}:${b.text}:${b.url || ''}`).sort().join('|')}`;
  if (sig === lastBoardSig) return;
  lastBoardSig = sig;

  const notes = $('#notes');
  const filtered = items
    .filter((b) => boardFilter === 'all' || b.type === boardFilter)
    .sort((a, b) => {
      if (a.type === 'brief' && b.type !== 'brief') return -1;
      if (b.type === 'brief' && a.type !== 'brief') return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  const counts = {
    note: items.filter((b) => b.type === 'note').length,
    todo: items.filter((b) => b.type === 'todo').length,
    link: items.filter((b) => b.type === 'link').length,
    brief: items.filter((b) => b.type === 'brief').length,
  };
  $('#board-summary').textContent = `노트 ${counts.note} · 할 일 ${counts.todo} · 링크 ${counts.link}`;
  $('#board-empty').hidden = filtered.length > 0;

  notes.innerHTML = filtered.map((b) => {
    const type = TYPE_LABEL[b.type] ? b.type : 'note';
    const author = b.author || { name: '연구원', initial: '·', color: '#6f9cf5' };
    const rot = noteRotation(b.id || b.text || 'x');
    const safeUrl = b.url ? normalizeUrl(b.url) : '';
    return `<article class="note type-${type}${b.done ? ' is-done' : ''}" data-id="${esc(b.id)}" style="--rot:${rot}deg; --tape-rot:${-rot * 0.6}deg">
      <div class="note-top">
        <span class="note-type">${TYPE_LABEL[type]}</span>
        <button type="button" class="note-del" data-del="${esc(b.id)}" title="떼어내기" aria-label="삭제">×</button>
      </div>
      <p class="note-text">${esc(b.text || '')}</p>
      ${safeUrl ? `<a class="note-link" href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer">${esc(safeUrl.replace(/^https?:\/\//, '').slice(0, 52))}</a>` : ''}
      <div class="note-foot">
        <span class="note-author" style="--pickle:${esc(author.color || '#6f9cf5')}"><i>${esc(author.initial || '·')}</i>${esc(author.name || '연구원')}</span>
        ${b.done && b.doneBy ? `<span class="note-done-by">✓ ${esc(b.doneBy)}</span>` : ''}
        <time>${relTime(b.createdAt)}</time>
        ${type === 'todo' ? `<label class="note-check"><input type="checkbox" data-check="${esc(b.id)}" ${b.done ? 'checked' : ''}/> 완료</label>` : ''}
      </div>
    </article>`;
  }).join('');
}

function normalizeUrl(raw) {
  let value = String(raw || '').trim();
  if (!value) return '';
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.href;
  } catch (err) {
    return '';
  }
}

function renderChat() {
  const items = Object.values(state.chat).filter(Boolean)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    .slice(-200);
  const sig = items.map((m) => `${m.id}:${m.createdAt}`).join('|');
  if (sig === lastChatSig) return;
  lastChatSig = sig;

  const feed = $('#chat-feed');
  const nearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 90;

  if (!items.length) {
    feed.innerHTML = '<p class="chat-empty">아직 로그가 없어요.<br />첫인사를 남겨 보세요.</p>';
  } else {
    feed.innerHTML = items.map((m) => {
      if (m.kind === 'system') {
        return `<div class="chat-sys"><span>${esc(m.text || '')}</span><time>${hhmm(m.createdAt)}</time></div>`;
      }
      const isMe = m.clientId && m.clientId === clientId;
      return `<div class="chat-item${isMe ? ' is-me' : ''}">
        <div class="chat-head" style="--pickle:${esc(m.color || '#6f9cf5')}">
          <i>${esc(m.initial || '·')}</i><b>${esc(m.name || '연구원')}</b><time>${hhmm(m.createdAt)}</time>
        </div>
        <p class="chat-bubble">${esc(m.text || '')}</p>
      </div>`;
    }).join('');
  }

  if (nearBottom) feed.scrollTop = feed.scrollHeight;

  // speech bubbles for newly arrived chat messages
  const newOnes = items.filter((m) => m.kind === 'chat' && (m.createdAt || 0) > lastChatTs);
  if (chatInitialized && newOnes.length) {
    const bySender = new Map();
    newOnes.forEach((m) => bySender.set(m.clientId || m.name, m));
    bySender.forEach((m) => {
      const id = m.clientId;
      if (!id) return;
      const target = state.presence[id];
      if (target) showBubble(id, m.text);
    });
  }
  const newest = items.length ? Math.max(...items.map((m) => m.createdAt || 0)) : 0;
  lastChatTs = Math.max(lastChatTs, newest);
  chatInitialized = true;
}

function showBubble(id, text) {
  const station = document.querySelector(`.station[data-id="${cssEscape(id)}"]`);
  if (!station) return;
  const bubble = station.querySelector('.bubble');
  if (!bubble) return;
  const shortText = text.length > 70 ? `${text.slice(0, 70)}…` : text;
  activeBubbles.set(id, { text: shortText, until: Date.now() + 6500 });
  bubble.textContent = shortText;
  bubble.classList.add('show');
  const prev = bubbleTimers.get(id);
  if (prev) window.clearTimeout(prev);
  const timer = window.setTimeout(() => {
    bubble.classList.remove('show');
    activeBubbles.delete(id);
    bubbleTimers.delete(id);
  }, 6500);
  bubbleTimers.set(id, timer);
}

/* ------------------------------------------------------------------ */
/* join dialog                                                         */
/* ------------------------------------------------------------------ */

let draft = null;

function defaultDraft(source) {
  const me = getMe();
  const base = source || me || profile || {};
  return {
    name: base.name || '제이슨',
    initial: base.initial || 'ㅂ',
    color: base.color || PALETTE[0].hex,
    field: base.field || '청약·자산',
    state: STATES[base.state] ? base.state : 'reading',
    message: base.message || '오후 청약 공고 살피는 중',
    accessories: { ...DEFAULT_ACCESSORIES, ...(base.accessories || {}) },
  };
}

function openJoinDialog(edit) {
  draft = defaultDraft(edit ? null : (getMe() || profile));
  fillJoinForm(draft);
  const dialog = $('#join-dialog');
  $('#join-title').textContent = edit ? '연구원 정보 수정' : '연구실 입장 등록';
  $('#join-sub').textContent = edit
    ? '이름표와 연구복을 바꾸면 연구실에 바로 반영됩니다.'
    : '이름표를 만들고 연구실 문을 열어 보세요. 다른 피클들과 실시간으로 만납니다.';
  $('#join-submit').textContent = edit ? '저장하기 →' : '연구실 입장 →';
  if (!dialog.open) dialog.showModal();
}

function fillJoinForm(d) {
  $('#join-name').value = d.name;
  $('#join-initial').value = d.initial;
  $('#join-field').value = d.field;
  $('#join-message').value = d.message;
  $$('#color-picker .swatch').forEach((b) => b.classList.toggle('is-active', b.dataset.color === d.color));
  $$('#state-picker .state-opt').forEach((b) => b.classList.toggle('is-active', b.dataset.state === d.state));
  ['glasses', 'cap', 'tie', 'mug'].forEach((key) => {
    const input = $(`#join-form input[name="${key}"]`);
    if (input) input.checked = Boolean(d.accessories[key]);
  });
  const activeChip = $(`#field-chips .chip[data-field="${d.field}"]`);
  $$('#field-chips .chip').forEach((c) => c.classList.remove('is-active'));
  if (activeChip) activeChip.classList.add('is-active');
  updateJoinPreview();
}

function buildColorPicker() {
  const wrap = $('#color-picker');
  wrap.innerHTML = PALETTE.map((c) => `<button type="button" class="swatch" data-color="${c.hex}" title="${c.name}" aria-label="${c.name}" role="radio" style="background:${c.hex}"></button>`).join('');
}

function buildStatePicker() {
  const wrap = $('#state-picker');
  wrap.innerHTML = STATE_ORDER.map((key) => {
    const s = STATES[key];
    return `<button type="button" class="state-opt" data-state="${key}" role="radio" aria-label="${s.label}"><b>${s.icon}</b>${s.label}</button>`;
  }).join('');
}

function readDraftFromForm() {
  return {
    name: $('#join-name').value.trim().slice(0, 12) || '연구원',
    initial: $('#join-initial').value.trim().slice(0, 2) || '·',
    field: $('#join-field').value.trim().slice(0, 20) || '연구실 비서',
    message: $('#join-message').value.trim().slice(0, 40),
    color: draft.color,
    state: draft.state,
    accessories: {
      glasses: $('#join-form input[name="glasses"]').checked,
      cap: $('#join-form input[name="cap"]').checked,
      tie: $('#join-form input[name="tie"]').checked,
      mug: $('#join-form input[name="mug"]').checked,
    },
  };
}

function updateJoinPreview() {
  if (!draft) return;
  const preview = { ...draft, ...readDraftFromForm() };
  $('#join-preview').innerHTML = characterSVG(preview, { state: preview.state });
  $('#preview-name').textContent = preview.name;
  const st = STATES[preview.state] || STATES.reading;
  $('#preview-field').textContent = `${preview.field} · ${st.label}`;
}

async function submitJoin(event) {
  event.preventDefault();
  const next = { ...readDraftFromForm() };
  if (!next.name) {
    toast('이름을 입력해 주세요.');
    return;
  }
  const wasJoined = Boolean(getMe());
  const prevState = getMe() ? getMe().state : null;
  profile = next;
  storageSet(LS_PROFILE, profile);

  if (!store) {
    await joinRoom(profile);
  } else if (!wasJoined) {
    store.join(profile);
  } else {
    store.updateProfile({ ...profile, joinedAt: getMe()?.joinedAt });
    if (prevState && prevState !== next.state) {
      store.logEvent(`${profile.name} 님이 상태를 '${STATES[next.state].label}'으로 바꿨어요.`);
    } else {
      store.logEvent(`${profile.name} 님이 연구원 정보를 다듬었어요.`);
    }
  }

  draft = null;
  $('#join-dialog').close();
  lastStationSig = '';
  lastPresenceSig = '';
  renderAll();
  toast(wasJoined ? '연구원 정보를 저장했어요.' : `${profile.name} 님, 입장 완료!`);
}

/* ------------------------------------------------------------------ */
/* person card                                                         */
/* ------------------------------------------------------------------ */

function openPerson(id) {
  const p = state.presence[id];
  if (!p) return;
  selectedId = id;
  renderPersonCard();
  const dialog = $('#person-dialog');
  if (!dialog.open) dialog.showModal();
}

function renderPersonCard() {
  if (!selectedId) return;
  const p = state.presence[selectedId];
  if (!p) {
    $('#person-dialog').close();
    return;
  }
  const isMe = selectedId === clientId;
  const st = STATES[p.state] || STATES.reading;
  const body = $('#person-body');
  body.innerHTML = `<div class="person-card" style="--pickle:${esc(p.color || '#6f9cf5')}">
    <div class="person-stage">
      ${characterSVG(p, { state: p.state })}
      <button type="button" class="icon-btn close-float" data-close aria-label="닫기">✕</button>
    </div>
    <div class="person-info">
      <div class="person-title">
        <span class="person-badge">${esc(p.initial || '·')}</span>
        <h2>${esc(p.name)}</h2>
        ${isMe ? '<span class="tag me">나</span>' : ''}
        ${p.demo ? '<span class="tag demo">예시 연구원</span>' : ''}
      </div>
      <div class="person-meta">
        <span class="meta-chip">${esc(p.field || '연구실 비서')}</span>
        <span class="meta-chip">${st.icon} ${st.label}</span>
        <span class="meta-chip">${relTime(p.joinedAt)} 입장</span>
      </div>
      ${p.message ? `<p class="person-message">${esc(p.message)}</p>` : ''}
      ${isMe ? `<div class="person-state-grid">
        ${STATE_ORDER.map((key) => `<button type="button" data-state-set="${key}" class="${key === p.state ? 'is-active' : ''}"><b>${STATES[key].icon}</b>${STATES[key].short}</button>`).join('')}
      </div>
      <div class="person-actions">
        <button type="button" class="btn" data-act="edit">프로필 수정</button>
        <button type="button" class="btn danger" data-act="leave">자리 비우기</button>
      </div>`
      : `<div class="person-actions">
        <button type="button" class="btn primary" data-act="talk">말 걸기</button>
        <button type="button" class="btn ghost" data-close>닫기</button>
      </div>`}
    </div>
  </div>`;

  body.querySelector('.close-float')?.addEventListener('click', () => $('#person-dialog').close());
  body.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => $('#person-dialog').close()));
  body.querySelectorAll('[data-state-set]').forEach((b) => {
    b.addEventListener('click', () => changeState(b.dataset.stateSet));
  });
  const edit = body.querySelector('[data-act="edit"]');
  if (edit) edit.addEventListener('click', () => { $('#person-dialog').close(); openJoinDialog(true); });
  const leave = body.querySelector('[data-act="leave"]');
  if (leave) leave.addEventListener('click', leaveRoom);
  const talk = body.querySelector('[data-act="talk"]');
  if (talk) {
    talk.addEventListener('click', () => {
      $('#person-dialog').close();
      const input = $('#chat-input');
      input.value = `@${p.name} `;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }
}

function changeState(next) {
  if (!STATES[next]) return;
  const me = getMe();
  if (!me || !store) {
    openJoinDialog(false);
    return;
  }
  store.setState(next, me.message || '');
  store.logEvent(`${me.name} 님이 상태를 '${STATES[next].label}'으로 바꿨어요.`);
  profile = { ...(profile || me), state: next };
  storageSet(LS_PROFILE, profile);
  const p = state.presence[clientId];
  if (p) p.state = next;
  lastStationSig = '';
  lastPresenceSig = '';
  renderAll();
  renderPersonCard();
  toast(`상태를 '${STATES[next].label}'으로 바꿨어요.`);
}

function leaveRoom() {
  const me = getMe();
  if (!me) return;
  if (!window.confirm('자리를 비우시겠어요? 다시 들어오면 새로 인사할 수 있어요.')) return;
  store?.leave();
  delete state.presence[clientId];
  $('#person-dialog').close();
  selectedId = null;
  lastStationSig = '';
  lastPresenceSig = '';
  renderAll();
  toast('자리를 비웠습니다. 다시 들어오면 이어서 함께해요.');
}

/* ------------------------------------------------------------------ */
/* board & chat actions                                                */
/* ------------------------------------------------------------------ */

function requireJoin() {
  if (getMe()) return true;
  toast('먼저 연구실에 입장해 주세요.');
  openJoinDialog(false);
  return false;
}

function addBoardItem(event) {
  event.preventDefault();
  if (!requireJoin()) return;
  const text = $('#board-text').value.trim();
  if (!text) {
    $('#board-text').focus();
    toast('내용을 한 줄 적어 주세요.');
    return;
  }
  let url = '';
  if (boardType === 'link') {
    url = normalizeUrl($('#board-url').value);
    if (!url) {
      $('#board-url').focus();
      toast('링크 주소를 확인해 주세요.');
      return;
    }
  }
  const me = getMe();
  const item = {
    id: uid('b_'),
    type: boardType,
    text: text.slice(0, 160),
    url,
    author: { name: me.name, initial: me.initial, color: me.color },
    createdAt: Date.now(),
    done: false,
  };
  store.addBoard(item);
  $('#board-text').value = '';
  $('#board-url').value = '';
  lastBoardSig = '';
  toast(`보드에 ${TYPE_NAME[boardType]}을 붙였어요.`);
}

function submitChat(event) {
  event.preventDefault();
  if (!requireJoin()) return;
  const input = $('#chat-input');
  const text = input.value.trim();
  if (!text) return;
  const me = getMe();
  store.sendChat(text.slice(0, 280));
  input.value = '';
  input.style.height = 'auto';
  $('#chat-feed').scrollTop = $('#chat-feed').scrollHeight;
}

/* ------------------------------------------------------------------ */
/* room switching                                                      */
/* ------------------------------------------------------------------ */

function shareUrl() {
  return `${location.origin}${location.pathname}?room=${encodeURIComponent(room)}`;
}

async function copyInvite(showToast = true) {
  const ok = await copyText(shareUrl());
  if (showToast) toast(ok ? '초대 링크를 복사했어요. 다른 피클에게 보내 보세요.' : '링크를 복사하지 못했어요.');
  if (!ok) {
    const link = $('#room-link');
    if (link) { link.value = shareUrl(); link.select(); }
  }
}

function openRoomDialog() {
  $('#room-input').value = room;
  $('#room-link').value = shareUrl();
  $('#room-mode-note').innerHTML = mode === 'live'
    ? '지금 <b>Firebase Realtime Database</b>에 연결되어 있어요. 이 링크를 연 피클과 실시간으로 같은 방을 씁니다.'
    : '지금은 <b>데모 모드</b>예요. 배포 후 firebase-config.js에 설정을 넣으면 링크를 연 피클과 실시간으로 이어집니다.';
  const dialog = $('#room-dialog');
  if (!dialog.open) dialog.showModal();
}

function moveRoom(next) {
  const clean = sanitizeRoom(next);
  storageSet(LS_ROOM, clean);
  store?.destroy();
  store = null;
  const url = new URL(location.href);
  url.searchParams.set('room', clean);
  location.href = url.toString();
}

/* ------------------------------------------------------------------ */
/* events                                                              */
/* ------------------------------------------------------------------ */

function bindEvents() {
  $('#join-form').addEventListener('submit', submitJoin);

  $('#join-form').addEventListener('input', (event) => {
    if (!draft) return;
    const name = $('#join-name').value.trim();
    const initial = $('#join-initial').value.trim();
    if (event.target.id === 'join-name' && name && !initial) {
      $('#join-initial').value = name.slice(0, 1);
    }
    updateJoinPreview();
  });
  $('#join-form').addEventListener('change', updateJoinPreview);

  $$('#color-picker').forEach((wrap) => wrap.addEventListener('click', (event) => {
    const btn = event.target.closest('.swatch');
    if (!btn) return;
    draft.color = btn.dataset.color;
    $$('#color-picker .swatch').forEach((b) => b.classList.toggle('is-active', b === btn));
    updateJoinPreview();
  }));

  $('#state-picker').addEventListener('click', (event) => {
    const btn = event.target.closest('.state-opt');
    if (!btn) return;
    draft.state = btn.dataset.state;
    $$('#state-picker .state-opt').forEach((b) => b.classList.toggle('is-active', b === btn));
    updateJoinPreview();
  });

  $('#field-chips').addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    $('#join-field').value = chip.dataset.field;
    $$('#field-chips .chip').forEach((c) => c.classList.toggle('is-active', c === chip));
    updateJoinPreview();
  });

  $('#btn-me').addEventListener('click', () => {
    if (getMe()) openPerson(clientId);
    else openJoinDialog(false);
  });
  $('#empty-join-btn').addEventListener('click', () => openJoinDialog(false));
  $('#btn-share').addEventListener('click', () => copyInvite(true));
  $('#room-chip').addEventListener('click', openRoomDialog);
  $('#footer-help').addEventListener('click', () => $('#help-dialog').showModal());

  $('#room-copy').addEventListener('click', () => copyInvite(true));
  $('#room-move').addEventListener('click', () => moveRoom($('#room-input').value));
  $('#room-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); moveRoom($('#room-input').value); }
  });
  $('#quick-rooms').addEventListener('click', (event) => {
    const chip = event.target.closest('[data-room]');
    if (!chip) return;
    moveRoom(chip.dataset.room);
  });

  $('#stations').addEventListener('click', (event) => {
    const empty = event.target.closest('.station[data-empty]');
    if (empty) { copyInvite(true); return; }
    const station = event.target.closest('.station[data-id]');
    if (station) openPerson(station.dataset.id);
  });
  $('#stations').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const station = event.target.closest('.station[data-id]');
    if (station) { event.preventDefault(); openPerson(station.dataset.id); }
  });

  $('#presence-list').addEventListener('click', (event) => {
    const li = event.target.closest('[data-id]');
    if (li) openPerson(li.dataset.id);
  });
  $('#presence-list').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const li = event.target.closest('[data-id]');
    if (li) { event.preventDefault(); openPerson(li.dataset.id); }
  });

  $$('#board-form .type-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      boardType = tab.dataset.type;
      $$('#board-form .type-tab').forEach((t) => {
        t.classList.toggle('is-active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      const isLink = boardType === 'link';
      $('#board-url').hidden = !isLink;
      $('#board-text').placeholder = {
        note: '연구실 모두에게 남길 연구 노트…',
        todo: '같이 해야 할 일을 적어 주세요…',
        link: '자료 제목 (예: 인용 논문 모음)',
        brief: '오늘의 한 줄 브리핑…',
      }[boardType];
      $('#composer-hint').textContent = isLink
        ? '제목과 https:// 주소를 함께 붙이면 링크 카드가 됩니다.'
        : 'Enter 로 바로 붙일 수 있어요 · 최대 160자';
      (isLink ? $('#board-url') : $('#board-text')).focus();
    });
  });

  $('#board-form').addEventListener('submit', addBoardItem);

  $('#board-filters').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-filter]');
    if (!btn) return;
    boardFilter = btn.dataset.filter;
    $$('#board-filters .filter').forEach((b) => b.classList.toggle('is-active', b === btn));
    lastBoardSig = '';
    renderBoard();
  });

  $('#notes').addEventListener('click', (event) => {
    const del = event.target.closest('[data-del]');
    if (del) {
      const id = del.dataset.del;
      if (pendingDelete.has(id)) {
        store?.deleteBoard(id);
        delete state.board[id];
        pendingDelete.delete(id);
        lastBoardSig = '';
        renderBoard();
        renderChalkBrief();
        toast('보드에서 떼어냈어요.');
      } else {
        pendingDelete.add(id);
        del.classList.add('confirm');
        del.textContent = '!';
        del.title = '한 번 더 누르면 삭제';
        window.setTimeout(() => {
          pendingDelete.delete(id);
          del.classList.remove('confirm');
          del.textContent = '×';
          del.title = '떼어내기';
        }, 2800);
      }
      return;
    }
    const check = event.target.closest('[data-check]');
    if (check) {
      const id = check.dataset.check;
      const item = state.board[id];
      if (!item) return;
      const me = getMe();
      if (!me) { check.checked = !check.checked; requireJoin(); return; }
      store?.toggleBoard(id, check.checked, me.name, item.text);
      item.done = check.checked;
      item.doneBy = check.checked ? me.name : '';
      lastBoardSig = '';
      renderBoard();
      toast(check.checked ? '할 일을 완료했어요. 👏' : '다시 할 일로 돌려놨어요.');
    }
  });

  $('#chat-form').addEventListener('submit', submitChat);
  $('#chat-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      submitChat(event);
    }
  });
  $('#chat-input').addEventListener('input', (event) => {
    const el = event.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  });

  $$('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => dialog.close());
    });
  });

  $('#join-dialog').addEventListener('close', () => { draft = null; });
  $('#person-dialog').addEventListener('close', () => { selectedId = null; });
}

function toast(text, ms = 2800) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  $('#toasts').appendChild(el);
  window.setTimeout(() => {
    el.classList.add('is-leaving');
    window.setTimeout(() => el.remove(), 260);
  }, ms);
}

window.addEventListener('error', (event) => {
  console.error('[pickle-lab] uncaught', event.error || event.message);
});

boot();
