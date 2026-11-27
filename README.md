# 🧪 픽클 연구실 · Pickle Research Lab

다른 피클들과 함께 쓰는 **논문 연구실 테마의 합동 비서실** 정적 웹앱입니다.
빌드 도구 없이 순수 HTML/CSS/JS(ES Modules)로 동작하고, Firebase Realtime Database를 붙이면
방 링크 하나로 여러 피클이 같은 연구실에서 실시간으로 만납니다.

- 데모: <https://dbwotjd98-dot.github.io/pickle-research-lab/>
- 저장소: <https://github.com/dbwotjd98-dot/pickle-research-lab>

## 무엇이 있나요

**논문 연구실 공간**
- 어두운 원목 벽·칠판·밤 창문·책장·파일 캐비닛·스탠드 조명·러그로 꾸민 2D 연구실
- 칠판에는 방 이름과 가장 최근 **오늘의 브리핑**이 분필 글씨로 걸립니다.

**박사급 연구원 캐릭터 (SVG)**
- 하얀 연구실 가운, 안경, 학위모, 넥타이, 사원증, 커피 머그를 조합
- 숨쉬기, 눈 깜빡임, 고개 흔들림 같은 기본 모션
- 상태별 모션: 📖 논문 리딩(논문 들고 검토) · ⌨️ 타이핑(키보드) · 🧪 실험(플라스크 기포) · 🗂️ 자료 정리(폴더) · ☕ 휴식(머그 김, zZ)
- 상태가 바뀌면 연구원 카드에서 바로 교체할 수 있습니다.

**합동 비서실 기능**
- **실시간 접속(Presence)** — 지금 방에 있는 연구원과 각자의 상태·한 줄 메시지
- **공동 연구 보드** — 노트 / 할 일 / 링크 / 브리핑을 붙이고, 체크(완료)하고, 떼어내기. 최신 브리핑은 칠판에 반영
- **연구실 로그** — 실시간 채팅 + 입장·상태 변경·할 일 완료 시스템 로그, 새 메시지는 캐릭터 말풍선으로도 표시
- **방 코드** — `?room=lab-1`처럼 방을 나눠 링크만 공유하면 됨. 방마다 데이터가 완전히 분리됩니다.
- **연구원 등록** — 이름·이니셜(ㅂ, ㄱ, ㅇ…)·색상·연구 분야·현재 상태·소품을 고르고 입장. 브라우저에 저장되어 다음 방문엔 자동 입장.

**모드**
| 모드 | 언제 | 동작 |
| --- | --- | --- |
| 실시간 | `js/firebase-config.js`에 Firebase 설정이 채워짐 | Firebase Realtime Database로 모든 피클과 동기화 |
| 데모 | 설정이 비어 있음 (`YOUR_…`) | 이 브라우저(localStorage + BroadcastChannel)에서만 동작. 같은 브라우저의 여러 탭끼리는 동기화됨. 예시 연구원 3명이 표시됨 |

## 로컬에서 열기

ES Modules를 쓰므로 `file://`이 아니라 로컬 서버로 열어 주세요.

```bash
cd pickle-research-lab
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000/?room=lab-1
```

## Firebase Realtime Database 연결

1. <https://console.firebase.google.com>에서 프로젝트를 만듭니다(Spark 무료 플랜으로 충분).
2. **빌드 > Realtime Database > 데이터베이스 만들기** — 위치는 가까운 리전(예: `asia-southeast1`)을 고릅니다.
3. **규칙(Rules)** 탭에 [`firebase-database.rules.json`](./firebase-database.rules.json) 내용을 붙여 넣고 게시합니다.
   `rooms/{roomId}` 아래 `presence`·`board`·`chat`에 읽기/쓰기를 허용하는 규칙입니다.
4. **프로젝트 설정 > 일반 > 내 앱**에서 웹 앱(`</>`)을 등록하면 `firebaseConfig`가 나옵니다.
5. [`js/firebase-config.js`](./js/firebase-config.js)의 값을 그대로 바꿔 넣습니다.

```js
export const firebaseConfig = {
  apiKey: '...',
  authDomain: 'pickle-research-lab.firebaseapp.com',
  databaseURL: 'https://pickle-research-lab-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'pickle-research-lab',
  storageBucket: 'pickle-research-lab.appspot.com',
  messagingSenderId: '...',
  appId: '...',
};
```

새로고침하면 상단 배지가 **실시간 연결**로 바뀝니다.

> ⚠️ 이 앱은 로그인 없이 방 코드만 아는 사람이 읽고 쓸 수 있는 구조입니다.
> 가족·친구 피클끼리 쓰는 가벼운 연구실에 맞춘 것이고, 민감한 정보는 올리지 마세요.
> 필요하면 Firebase Authentication(익명 로그인)과 규칙을 추가해 잠글 수 있습니다.

## GitHub Pages 배포

```bash
git init
git add .
git commit -m "Pickle Research Lab"
git branch -M main
gh repo create <owner>/pickle-research-lab --public --source=. --remote=origin --push
```

저장소 **Settings > Pages > Build and deployment**에서
Source를 `Deploy from a branch`, Branch를 `main` / `/ (root)`로 저장하면
`https://<owner>.github.io/pickle-research-lab/` 에서 열립니다.
(`.nojekyll` 파일이 포함되어 있어 `js/` 폴더가 그대로 서빙됩니다.)

## 방 나누기 / 초대

- 주소 끝에 `?room=내방코드`를 붙이면 그 방으로 들어갑니다. 예: `?room=lab-2`
- 상단 **초대** 버튼 또는 `방 설정`에서 링크를 복사해 다른 피클에게 보내면 됩니다.
- 방 코드는 영문 소문자·숫자·하이픈 32자까지.

## 파일 구조

```
pickle-research-lab/
├── index.html                  # 화면 뼈대 (헤더·연구실·보드·사이드바·모달)
├── css/style.css               # 원목·칠판 테마, 캐릭터 모션, 반응형
├── js/
│   ├── main.js                 # 상태·이벤트·렌더링 (앱의 두뇌)
│   ├── store.js                # Firebase / 데모 저장소 (presence·board·chat)
│   ├── character.js            # 박사급 연구원 SVG 생성기 + 상태 모션
│   ├── backdrop.js             # 연구실 배경 SVG
│   ├── firebase-config.js      # ← Firebase 설정을 넣는 곳
│   └── util.js                 # 색 계산·시간·방 코드 등 유틸
├── assets/favicon.svg
├── firebase-database.rules.json
└── .nojekyll
```

## 데이터 구조

```
rooms/{roomId}/
  presence/{clientId}/  { name, initial, color, field, state, message, accessories, joinedAt, lastSeen }
  board/{itemId}/       { type: note|todo|link|brief, text, url, author, createdAt, done, doneBy }
  chat/{messageId}/     { kind: chat|system, name, initial, color, text, createdAt, clientId }
```

- 접속 종료 시 `onDisconnect().remove()`로 presence를 지웁니다.
- 채팅은 최근 240개만 유지합니다.
- 읽기는 채팅만 `limitToLast(240)`으로 제한합니다.

## 커스터마이징

- **색상 팔레트**: `js/character.js`의 `PALETTE`
- **상태 종류/라벨**: `js/character.js`의 `STATES`, `STATE_ORDER`
- **방 이름**: `js/util.js`의 `roomLabel` (임의 방은 코드가 그대로 표시됨)
- **기본 방**: `js/firebase-config.js`의 `DEFAULT_ROOM` 및 `js/main.js`의 초기값

## 브라우저

Chrome / Edge / Safari / Firefox 최신 버전. `BroadcastChannel`, ES Modules, CSS Container Queries를 사용합니다.
(구형 브라우저에서는 데모 탭 간 동기화가 안 될 수 있습니다.)
