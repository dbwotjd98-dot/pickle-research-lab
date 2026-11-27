// 실시간 저장소 — Firebase Realtime Database, 또는 브라우저 데모(BroadcastChannel).
// 방 하나의 상태는 { presence, board, chat } 세 갈래로 이루어집니다.

import { firebaseConfig } from './firebase-config.js';
import { uid } from './util.js';

const DEMO_PEERS = [
  {
    id: 'demo-moa', name: '모아', initial: 'ㄱ', color: '#57c6a4', field: '일정·캘린더',
    state: 'typing', message: '오후 일정 정리 중', demo: true,
    accessories: { glasses: true, cap: false, tie: false, mug: true },
  },
  {
    id: 'demo-luna', name: '루나', initial: 'ㄹ', color: '#a78bfa', field: '논문·리서치',
    state: 'reading', message: '인용 논문 검토 중', demo: true,
    accessories: { glasses: true, cap: false, tie: true, mug: true },
  },
  {
    id: 'demo-popo', name: '포포', initial: 'ㅍ', color: '#f0b04c', field: '코드·자동화',
    state: 'experiment', message: '새 자동화 실험 중', demo: true,
    accessories: { glasses: false, cap: true, tie: false, mug: true },
  },
];

function demoSeed() {
  const now = Date.now();
  const presence = {};
  DEMO_PEERS.forEach((p, i) => {
    presence[p.id] = { ...p, joinedAt: now - (i + 1) * 1000 * 60 * 42, lastSeen: now };
  });
  const moa = { name: '모아', initial: 'ㄱ', color: '#57c6a4' };
  const luna = { name: '루나', initial: 'ㄹ', color: '#a78bfa' };
  const popo = { name: '포포', initial: 'ㅍ', color: '#f0b04c' };
  const board = {
    'seed-brief': {
      id: 'seed-brief', type: 'brief', text: '오늘 15:00 연구실 회의 — 각자 진행 상황 한 줄씩 공유하기',
      author: moa, createdAt: now - 42 * 60 * 1000,
    },
    'seed-note': {
      id: 'seed-note', type: 'note', text: '이번 주 공동 목표 — 맡은 집안일 3개씩 정리해 두기',
      author: luna, createdAt: now - 96 * 60 * 1000,
    },
    'seed-todo': {
      id: 'seed-todo', type: 'todo', text: '픽클 연구실 초대 링크를 다른 피클들에게 보내기',
      author: moa, createdAt: now - 70 * 60 * 1000, done: false,
    },
    'seed-todo-done': {
      id: 'seed-todo-done', type: 'todo', text: '주간 브리핑 초안 다듬기',
      author: popo, createdAt: now - 130 * 60 * 1000, done: true, doneBy: '포포',
    },
    'seed-link': {
      id: 'seed-link', type: 'link', text: 'Firebase Realtime Database 문서',
      url: 'https://firebase.google.com/docs/database', author: popo, createdAt: now - 150 * 60 * 1000,
    },
  };
  const chat = {
    'seed-c1': {
      id: 'seed-c1', kind: 'system', text: '연구실이 문을 열었습니다 — 오늘도 좋은 연구 되세요.',
      createdAt: now - 180 * 60 * 1000,
    },
    'seed-c2': {
      id: 'seed-c2', kind: 'chat', ...moa, text: '오늘 오후 3시 회의, 화이트보드에 안건 올려뒀어요.',
      createdAt: now - 38 * 60 * 1000, clientId: 'demo-moa',
    },
    'seed-c3': {
      id: 'seed-c3', kind: 'chat', ...luna, text: '인용 논문 3편 리뷰 끝났습니다. 링크는 보드에!',
      createdAt: now - 26 * 60 * 1000, clientId: 'demo-luna',
    },
    'seed-c4': {
      id: 'seed-c4', kind: 'chat', ...popo, text: '자동화 실험 돌리는 중 — 결과 나오면 브리핑에 올릴게요.',
      createdAt: now - 12 * 60 * 1000, clientId: 'demo-popo',
    },
    'seed-c5': {
      id: 'seed-c5', kind: 'system', text: "포포 님이 상태를 '실험 중'으로 바꿨어요.",
      createdAt: now - 10 * 60 * 1000,
    },
  };
  return { presence, board, chat };
}

function normalizeState(raw) {
  return {
    presence: raw && raw.presence && typeof raw.presence === 'object' ? raw.presence : {},
    board: raw && raw.board && typeof raw.board === 'object' ? raw.board : {},
    chat: raw && raw.chat && typeof raw.chat === 'object' ? raw.chat : {},
  };
}

function trimChat(chat, max = 240) {
  const entries = Object.entries(chat)
    .sort((a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0));
  if (entries.length <= max) return chat;
  const kept = entries.slice(entries.length - max);
  const next = {};
  kept.forEach(([k, v]) => { next[k] = v; });
  return next;
}

export function isFirebaseConfigured() {
  const c = firebaseConfig || {};
  const looksReal = (v) => typeof v === 'string' && v.trim() && !v.includes('YOUR_');
  return Boolean(looksReal(c.apiKey) && looksReal(c.databaseURL) && looksReal(c.projectId));
}

/* ------------------------------------------------------------------ */
/* Demo store                                                          */
/* ------------------------------------------------------------------ */

function createDemoStore({ room, clientId, profile, onState, onMode, onError }) {
  const key = `picklelab.demo.v2.${room}`;
  let state = null;
  let channel = null;
  let heartbeat = 0;
  const listeners = new Set();

  const emit = () => {
    const snapshot = {
      presence: { ...state.presence },
      board: { ...state.board },
      chat: { ...state.chat },
    };
    listeners.forEach((fn) => fn(snapshot));
  };

  const persist = (broadcast = true) => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (err) { /* ignore */ }
    if (broadcast && channel) {
      try { channel.postMessage({ type: 'state', state, from: clientId }); } catch (err) { /* ignore */ }
    }
    emit();
  };

  const load = () => {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(key) || 'null'); } catch (err) { raw = null; }
    state = normalizeState(raw || demoSeed());
  };

  const prune = () => {
    const now = Date.now();
    let changed = false;
    Object.entries(state.presence).forEach(([id, p]) => {
      if (p.demo) return;
      if (id !== clientId && now - (p.lastSeen || 0) > 55 * 1000) {
        delete state.presence[id];
        changed = true;
      }
    });
    if (changed) persist();
  };

  const pushSystem = (text) => {
    const id = uid('sys-');
    state.chat[id] = { id, kind: 'system', text, createdAt: Date.now() };
    state.chat = trimChat(state.chat);
  };

  load();
  // keep demo peers fresh so they never look stale
  Object.values(state.presence).forEach((p) => {
    if (p.demo) p.lastSeen = Date.now();
  });

  try {
    channel = new BroadcastChannel(`picklelab-${room}`);
    channel.onmessage = (event) => {
      const msg = event.data || {};
      if (msg.type !== 'state' || msg.from === clientId) return;
      state = normalizeState(msg.state);
      emit();
    };
  } catch (err) {
    channel = null;
  }

  const onStorage = (event) => {
    if (event.key !== key || !event.newValue) return;
    try {
      state = normalizeState(JSON.parse(event.newValue));
      emit();
    } catch (err) { /* ignore */ }
  };
  window.addEventListener('storage', onStorage);

  if (profile) {
    state.presence[clientId] = {
      ...profile, id: clientId, joinedAt: Date.now(), lastSeen: Date.now(), demo: false,
    };
    pushSystem(`${profile.name} 님이 연구실에 들어왔습니다.`);
    persist();
  }

  heartbeat = window.setInterval(() => {
    const me = state.presence[clientId];
    if (me) {
      me.lastSeen = Date.now();
      Object.values(state.presence).forEach((p) => { if (p.demo) p.lastSeen = Date.now(); });
      persist();
    }
    prune();
  }, 15000);

  if (onMode) onMode('demo');

  return {
    mode: 'demo',
    subscribe(fn) {
      listeners.add(fn);
      fn(normalizeState(state));
      return () => listeners.delete(fn);
    },
    join(p) {
      state.presence[clientId] = {
        ...p, id: clientId, joinedAt: Date.now(), lastSeen: Date.now(), demo: false,
      };
      pushSystem(`${p.name} 님이 연구실에 들어왔습니다.`);
      persist();
    },
    updateProfile(p) {
      const prev = state.presence[clientId] || {};
      state.presence[clientId] = {
        ...prev, ...p, id: clientId, lastSeen: Date.now(), demo: false,
      };
      persist();
    },
    setState(nextState, message) {
      const me = state.presence[clientId];
      if (!me) return;
      me.state = nextState;
      if (typeof message === 'string') me.message = message;
      me.lastSeen = Date.now();
      persist();
    },
    leave() {
      const me = state.presence[clientId];
      if (me) pushSystem(`${me.name} 님이 자리를 비웠습니다.`);
      delete state.presence[clientId];
      persist();
    },
    addBoard(item) {
      state.board[item.id] = item;
      persist();
    },
    toggleBoard(id, done, byName) {
      const item = state.board[id];
      if (!item) return;
      item.done = Boolean(done);
      item.doneBy = done ? byName : '';
      item.doneAt = done ? Date.now() : 0;
      if (done) pushSystem(`${byName} 님이 할 일을 완료했어요 — ${item.text}`);
      persist();
    },
    deleteBoard(id) {
      delete state.board[id];
      persist();
    },
    sendChat(text) {
      const me = state.presence[clientId];
      if (!me) return;
      const id = uid('msg-');
      state.chat[id] = {
        id, kind: 'chat', name: me.name, initial: me.initial, color: me.color,
        text, createdAt: Date.now(), clientId,
      };
      state.chat = trimChat(state.chat);
      persist();
    },
    logEvent(text) {
      pushSystem(text);
      persist();
    },
    destroy() {
      window.clearInterval(heartbeat);
      window.removeEventListener('storage', onStorage);
      if (channel) channel.close();
      listeners.clear();
    },
    _persist: persist,
  };
}

/* ------------------------------------------------------------------ */
/* Firebase store                                                      */
/* ------------------------------------------------------------------ */

async function createFirebaseStore({ room, clientId, profile, onState, onMode, onError }) {
  const appMod = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js');
  const dbMod = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js');
  const { initializeApp } = appMod;
  const {
    getDatabase, ref, child, onValue, set, update, remove, push, onDisconnect, query, limitToLast,
  } = dbMod;

  const app = initializeApp(firebaseConfig, `pickle-lab-${room}`);
  const db = getDatabase(app);
  const root = `rooms/${room}`;
  const meRef = ref(db, `${root}/presence/${clientId}`);
  const unsubs = [];
  const listeners = new Set();
  const state = { presence: {}, board: {}, chat: {} };

  const emit = () => {
    const snapshot = normalizeState(state);
    if (onState) onState(snapshot);
    listeners.forEach((fn) => fn(snapshot));
  };

  const watch = (path, apply, q) => {
    const target = q ? q(ref(db, path)) : ref(db, path);
    const unsub = onValue(target, (snap) => {
      apply(snap.val() || {});
      emit();
    }, (err) => {
      if (onError) onError(err);
    });
    unsubs.push(unsub);
  };

  watch(`${root}/presence`, (val) => { state.presence = val; });
  watch(`${root}/board`, (val) => { state.board = val; });
  watch(`${root}/chat`, (val) => { state.chat = val; }, (r) => query(r, limitToLast(240)));

  const presencePayload = (p) => ({
    id: clientId,
    name: p.name,
    initial: p.initial,
    color: p.color,
    field: p.field,
    state: p.state,
    message: p.message || '',
    accessories: p.accessories || {},
    joinedAt: p.joinedAt || Date.now(),
    lastSeen: Date.now(),
  });

  const join = (p) => {
    try { onDisconnect(meRef).remove(); } catch (err) { /* ignore */ }
    set(meRef, presencePayload(p)).catch((err) => onError && onError(err));
    push(ref(db, `${root}/chat`), {
      kind: 'system', text: `${p.name} 님이 연구실에 들어왔습니다.`, createdAt: Date.now(),
    }).catch(() => {});
  };

  if (profile) join(profile);

  const heartbeat = window.setInterval(() => {
    update(meRef, { lastSeen: Date.now() }).catch(() => {});
  }, 20000);

  if (onMode) onMode('live');

  return {
    mode: 'live',
    subscribe(fn) {
      listeners.add(fn);
      fn(normalizeState(state));
      return () => listeners.delete(fn);
    },
    join,
    updateProfile(p) {
      update(meRef, {
        ...presencePayload(p), joinedAt: p.joinedAt || Date.now(),
      }).catch((err) => onError && onError(err));
    },
    setState(nextState, message) {
      const payload = { state: nextState, lastSeen: Date.now() };
      if (typeof message === 'string') payload.message = message;
      update(meRef, payload).catch((err) => onError && onError(err));
    },
    leave() {
      remove(meRef).catch(() => {});
    },
    addBoard(item) {
      push(ref(db, `${root}/board`), item).catch((err) => onError && onError(err));
    },
    toggleBoard(id, done, byName, text) {
      const target = ref(db, `${root}/board/${id}`);
      update(target, { done: Boolean(done), doneBy: done ? byName : '', doneAt: done ? Date.now() : 0 })
        .catch((err) => onError && onError(err));
      if (done) {
        push(ref(db, `${root}/chat`), {
          kind: 'system', text: `${byName} 님이 할 일을 완료했어요 — ${text || ''}`, createdAt: Date.now(),
        }).catch(() => {});
      }
    },
    deleteBoard(id) {
      remove(ref(db, `${root}/board/${id}`)).catch((err) => onError && onError(err));
    },
    sendChat(text) {
      const me = state.presence[clientId];
      if (!me) return;
      push(ref(db, `${root}/chat`), {
        kind: 'chat', name: me.name, initial: me.initial, color: me.color,
        text, createdAt: Date.now(), clientId,
      }).catch((err) => onError && onError(err));
    },
    logEvent(text) {
      push(ref(db, `${root}/chat`), { kind: 'system', text, createdAt: Date.now() }).catch(() => {});
    },
    destroy() {
      window.clearInterval(heartbeat);
      unsubs.forEach((fn) => { try { fn(); } catch (err) { /* ignore */ } });
      listeners.clear();
    },
  };
}

/* ------------------------------------------------------------------ */

export async function createStore({ room, clientId, profile, onState, onMode, onError }) {
  if (isFirebaseConfigured()) {
    try {
      return await createFirebaseStore({ room, clientId, profile, onState, onMode, onError });
    } catch (err) {
      if (onError) onError(err);
      return createDemoStore({ room, clientId, profile, onState, onMode, onError });
    }
  }
  return createDemoStore({ room, clientId, profile, onState, onMode, onError });
}
