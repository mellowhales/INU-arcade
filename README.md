# INU 아케이드 (INU Arcade)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

웹 브라우저에서 별도 설치 없이 링크 하나로 친구들과 함께 즐길 수 있는 인천대학교 실시간 멀티플레이 웹 아케이드 플랫폼입니다.

---

## 🎮 게임 및 플랫폼 라인업

1. **인천대 퀴즈 (INU Quiz)**
   - 인천대학교의 역사, 캠퍼스, 단과대학, 마스코트 등 다채로운 퀴즈를 선착순으로 가장 빠르게 맞히는 실시간 스피드 퀴즈 게임입니다.
2. **스터디룸 (INU Study)**
   - 방장 중심의 뽀모도로(Pomodoro) 집중/휴식 타이머와 실시간 개인 과목별 공부 시간을 동기화하여 함께 몰입하는 온라인 스터디 공간입니다.
3. **횃불이 그리기 (INU Draw Challenge)**
   - 인천대학교 공식 마스코트 "횃불이"를 30초 안에 관찰하고 따라 그리는 드로잉 챌린지입니다.
   - 외부 AI나 백엔드 없이 순수 브라우저 Canvas 2D와 128×128 거리 변환(Distance Transform) 영상 처리 알고리즘으로 정확도(%)를 정밀하게 채점합니다.

---

## 🛠️ 기술 스택

- **Client**: Vanilla JavaScript (ES6+), HTML5 Canvas 2D, CSS3, Web Audio API
- **Realtime / P2P**: WebRTC (PeerJS), Firebase Realtime Database
- **Backend / Auth**: Supabase (PostgreSQL, Authentication)

---

## 📁 프로젝트 구조

```text
├── index.html               # 메인 웹 애플리케이션 진입점
├── draw.html                # 횃불이 그리기 단독 실행 페이지
├── css/
│   ├── style.css            # 공통 테마, 레이아웃 및 버튼 스타일
│   └── games.css            # 인게임 전용 스타일 (퀴즈, 스터디룸, 횃불이 그리기)
├── js/
│   ├── app.js               # 메인 앱 컨트롤러 (로비, 방 관리, 라우팅)
│   ├── p2p.js               # WebRTC PeerJS 실시간 P2P 통신 모듈
│   ├── firebase.js          # Firebase 실시간 로비 및 방 목록 동기화
│   ├── supabase.js          # Supabase 인증 및 데이터 연동
│   ├── sound.js             # Web Audio API 기반 효과음(SFX) 합성기
│   ├── i18n.js              # 다국어(7개 언어) 번역 엔진
│   └── games/
│       ├── inu_quiz.js      # 인천대 퀴즈 게임 모듈
│       ├── inu_study.js     # 뽀모도로 스터디룸 모듈
│       └── inu_draw.js      # 횃불이 그리기 캔버스 게임 모듈
└── assets/
    └── draw/                # 횃불이 마스코트 그래픽 에셋
```

---

## 🚀 로컬 실행 방법

정적 웹 서버(Static HTTP Server) 환경에서 바로 실행할 수 있습니다.

```bash
# Python 내장 웹 서버 실행 (권장)
python -m http.server 8080
```

웹 브라우저에서 `http://localhost:8080`으로 접속하여 즉시 플레이할 수 있습니다.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
