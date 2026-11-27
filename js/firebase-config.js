/**
 * Firebase Realtime Database 설정
 * ------------------------------------------------------------
 * 아래 값을 Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹) 의 firebaseConfig 로 바꾸면
 * 새로고침하는 순간부터 이 방은 실제 실시간 동기화 모드로 동작합니다.
 *
 * 값이 비어 있거나 YOUR_ 로 시작하면 자동으로 "데모 모드"(이 브라우저 안에서만
 * 동작 + BroadcastChannel 로 같은 브라우저의 여러 탭끼리 동기화)로 실행됩니다.
 *
 * databaseURL 은 Realtime Database 를 만든 뒤 콘솔 상단에 나오는
 * https://<project>-default-rtdb.<region>.firebasedatabase.app 형식의 주소입니다.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyBkRTSUJinL9otensYXicDteCVh-jZB_-4',
  authDomain: 'pickle-research-lab.firebaseapp.com',
  databaseURL: 'https://pickle-research-lab-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'pickle-research-lab',
  storageBucket: 'pickle-research-lab.firebasestorage.app',
  messagingSenderId: '78903782119',
  appId: '1:78903782119:web:1403c26d07052095809042',
};

/** 처음 열었을 때 사용할 방 코드 (?room=... 이 없을 때) */
export const DEFAULT_ROOM = 'lab-1';

/** 앱에 보이는 이름 */
export const APP_NAME = 'Pickle Research Lab';
