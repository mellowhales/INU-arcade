/**
 * app.js - P2P 아케이드 플랫폼 메인 컨트롤러
 * (2~5인 다중 플레이, 오목 반응형 & 2인 제한, 셔플, 실시간 퇴장 알림 및 참가자 목록 즉각 제거)
 */
(() => {
  'use strict';

  /* ── 게임 목록 정의 ── */
  const GAMES = {
    inu_quiz:  { module: InuQuizGame,  title: '인천대 퀴즈',     maxPlayers: 8, isTurnBased: false },
    inu_study: { module: InuStudyGame, title: '스터디룸',       maxPlayers: 8, isTurnBased: false },
    inu_draw:  { module: InuDrawGame,  title: '횃불이 그리기',   maxPlayers: 8, isTurnBased: false },
  };

  const MAX_ROOM_CAPACITY = 5;

  /* ── 🐾 동물 아바타 및 색상 팔레트 시스템 ── */
  const AVATAR_ICONS = [
    'fa-solid fa-dog',
    'fa-solid fa-cat',
    'fa-solid fa-frog',
    'fa-solid fa-paw',
    'fa-solid fa-fish',
    'fa-solid fa-dove',
    'fa-solid fa-crow',
    'fa-solid fa-otter',
    'fa-solid fa-dragon',
    'fa-solid fa-horse',
    'fa-solid fa-hippo',
    'fa-solid fa-kiwi-bird',
    'fa-solid fa-feather',
    'fa-solid fa-spider',
    'fa-solid fa-shield-cat',
    'fa-solid fa-bugs'
  ];

  const AVATAR_COLORS = [
    '#38a169', '#3182ce', '#e53e3e', '#805ad5',
    '#d69e2e', '#dd6b20', '#d53f8c', '#319795',
    '#4a5568', '#2b6cb0', '#6b46c1', '#2f855a'
  ];

  function _getRandomAvatarIcon() {
    return AVATAR_ICONS[Math.floor(Math.random() * AVATAR_ICONS.length)];
  }
  function _getRandomAvatarColor() {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  }

  /* ── 상태 변수 (기본 닉네임: 익명 + 랜덤 동물/색상 고유 부여) ── */
  // 닉네임 초기화 - 익명인 경우 랜덤 숫자 4자리 붙여 고유화
  function _generateUniqueAnonNick() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `익명${num}`;
  }
  let myNickname = localStorage.getItem('arcade_nick') || '';
  if (!myNickname) {
    myNickname = _generateUniqueAnonNick();
    localStorage.setItem('arcade_nick', myNickname);
  }
  let myAvatarIcon = localStorage.getItem('arcade_avatar_icon') || '';
  let myAvatarColor = localStorage.getItem('arcade_avatar_color') || '';

  if (!myAvatarIcon) {
    myAvatarIcon = _getRandomAvatarIcon();
    localStorage.setItem('arcade_avatar_icon', myAvatarIcon);
  }
  if (!myAvatarColor) {
    myAvatarColor = _getRandomAvatarColor();
    localStorage.setItem('arcade_avatar_color', myAvatarColor);
  }

  // 🎨 닉네임 색상 염색약 (상점 아이템)
  let myNicknameColor = localStorage.getItem('arcade_name_color') || '';
  let myPurchasedNameColors = [];
  try {
    const rawPurchased = localStorage.getItem('arcade_purchased_name_colors');
    myPurchasedNameColors = rawPurchased ? JSON.parse(rawPurchased) : [];
    if (!Array.isArray(myPurchasedNameColors)) myPurchasedNameColors = [];
  } catch (_) {
    myPurchasedNameColors = [];
  }

  const SHOP_NICKNAME_COLORS = [
    {
      id: 'color_gold',
      name: '골드',
      hex: '#f59e0b',
      price: 500,
      desc: '골드 색상',
      icon: 'fa-solid fa-crown'
    },
    {
      id: 'color_pink',
      name: '핑크',
      hex: '#ec4899',
      price: 500,
      desc: '핑크 색상',
      icon: 'fa-solid fa-heart'
    },
    {
      id: 'color_blue',
      name: '하늘색',
      hex: '#0284c7',
      price: 500,
      desc: '하늘색',
      icon: 'fa-solid fa-droplet'
    },
    {
      id: 'color_green',
      name: '초록',
      hex: '#10b981',
      price: 500,
      desc: '초록 색상',
      icon: 'fa-solid fa-gem'
    },
    {
      id: 'color_purple',
      name: '보라',
      hex: '#8b5cf6',
      price: 500,
      desc: '보라 색상',
      icon: 'fa-solid fa-wand-magic-sparkles'
    },
    {
      id: 'color_red',
      name: '빨강',
      hex: '#ef4444',
      price: 500,
      desc: '빨강 색상',
      icon: 'fa-solid fa-fire'
    },
    {
      id: 'color_cyan',
      name: '청록',
      hex: '#06b6d4',
      price: 600,
      desc: '청록 색상',
      icon: 'fa-solid fa-bolt'
    },
    {
      id: 'color_rose',
      name: '로즈',
      hex: '#f43f5e',
      price: 600,
      desc: '로즈 색상',
      icon: 'fa-solid fa-heart'
    },
    {
      id: 'color_silver',
      name: '실버',
      hex: '#94a3b8',
      price: 700,
      desc: '실버 색상',
      icon: 'fa-solid fa-shield'
    },
    {
      id: 'color_rainbow',
      name: '무지개',
      hex: 'rainbow',
      price: 1200,
      desc: '무지개 그라데이션',
      icon: 'fa-solid fa-rainbow'
    },
    {
      id: 'color_default',
      name: '기본',
      hex: '',
      price: 0,
      desc: '기본 색상',
      icon: 'fa-solid fa-rotate-left',
      isDefault: true
    }
  ];

  // 🎴 프로필 카드 테마 (상점 아이템 - 로비, 대기방, 인게임 전역 적용)
  let myProfileCard = localStorage.getItem('arcade_profile_card') || 'default';
  let myPurchasedProfileCards = ['default'];
  try {
    const rawCardPurchased = localStorage.getItem('arcade_purchased_profile_cards');
    myPurchasedProfileCards = rawCardPurchased ? JSON.parse(rawCardPurchased) : ['default'];
    if (!Array.isArray(myPurchasedProfileCards)) myPurchasedProfileCards = ['default'];
    if (!myPurchasedProfileCards.includes('default')) myPurchasedProfileCards.push('default');
  } catch (_) {
    myPurchasedProfileCards = ['default'];
  }

  const SHOP_PROFILE_CARDS = [
    {
      id: 'default',
      name: '기본',
      themeClass: 'default',
      price: 0,
      icon: 'fa-solid fa-id-badge',
      isDefault: true
    },
    {
      id: 'sunset',
      name: '선셋',
      themeClass: 'pcard-theme-sunset',
      price: 500,
      icon: 'fa-solid fa-sun'
    },
    {
      id: 'ocean',
      name: '오션',
      themeClass: 'pcard-theme-ocean',
      price: 500,
      icon: 'fa-solid fa-water'
    },
    {
      id: 'emerald',
      name: '민트',
      themeClass: 'pcard-theme-emerald',
      price: 500,
      icon: 'fa-solid fa-leaf'
    },
    {
      id: 'midnight',
      name: '퍼플',
      themeClass: 'pcard-theme-midnight',
      price: 500,
      icon: 'fa-solid fa-moon'
    },
    {
      id: 'sakura',
      name: '핑크',
      themeClass: 'pcard-theme-sakura',
      price: 500,
      icon: 'fa-solid fa-fan'
    },
    {
      id: 'carbon',
      name: '카본',
      themeClass: 'pcard-theme-carbon',
      price: 700,
      icon: 'fa-solid fa-chess-board'
    },
    {
      id: 'retro-pixel',
      name: '픽셀 도트',
      themeClass: 'pcard-theme-retro-pixel',
      price: 700,
      icon: 'fa-solid fa-gamepad'
    },
    {
      id: 'galaxy',
      name: '은하수',
      themeClass: 'pcard-theme-galaxy',
      price: 700,
      icon: 'fa-solid fa-meteor'
    },
    {
      id: 'hologram',
      name: '프리즘',
      themeClass: 'pcard-theme-hologram',
      price: 1000,
      icon: 'fa-solid fa-wand-magic-sparkles'
    },
    {
      id: 'royal-gold',
      name: '골드',
      themeClass: 'pcard-theme-royal-gold',
      price: 1000,
      icon: 'fa-solid fa-crown'
    },
    {
      id: 'matrix',
      name: '매트릭스',
      themeClass: 'pcard-theme-matrix',
      price: 1000,
      icon: 'fa-solid fa-terminal'
    },
    {
      id: 'aurora',
      name: '오로라',
      themeClass: 'pcard-theme-aurora',
      price: 1200,
      icon: 'fa-solid fa-wind'
    },
    {
      id: 'space',
      name: '스페이스',
      themeClass: 'pcard-theme-space',
      price: 1200,
      icon: 'fa-solid fa-globe'
    },
    {
      id: 'arcade-neon',
      name: '아케이드',
      themeClass: 'pcard-theme-arcade-neon',
      price: 1500,
      icon: 'fa-solid fa-gamepad'
    },
    {
      id: 'rainbow',
      name: '무지개',
      themeClass: 'pcard-theme-rainbow',
      price: 1500,
      icon: 'fa-solid fa-rainbow'
    }
  ];

  // 💬 말풍선 스킨 (상점 아이템)
  let myChatBubble = localStorage.getItem('arcade_user_chat_bubble') || 'default';
  let myPurchasedChatBubbles = ['default'];
  try {
    const rawBubbles = localStorage.getItem('arcade_purchased_chat_bubbles');
    myPurchasedChatBubbles = rawBubbles ? JSON.parse(rawBubbles) : ['default'];
    if (!Array.isArray(myPurchasedChatBubbles)) myPurchasedChatBubbles = ['default'];
    if (!myPurchasedChatBubbles.includes('default')) myPurchasedChatBubbles.push('default');
  } catch (_) {
    myPurchasedChatBubbles = ['default'];
  }

  const SHOP_CHAT_BUBBLES = [
    {
      id: 'default',
      name: '기본',
      bubbleClass: 'bubble-default',
      price: 0,
      icon: 'fa-solid fa-comment',
      desc: '기본 말풍선',
      isDefault: true
    },
    {
      id: 'bubble_retro_dot',
      name: '도트',
      bubbleClass: 'bubble-retro-dot',
      price: 600,
      icon: 'fa-solid fa-gamepad',
      desc: '도트 테두리 말풍선'
    },
    {
      id: 'bubble_cyber_neon',
      name: '다크',
      bubbleClass: 'bubble-cyber-neon',
      price: 800,
      icon: 'fa-solid fa-moon',
      desc: '다크 테마 말풍선'
    },
    {
      id: 'bubble_mint_soda',
      name: '민트',
      bubbleClass: 'bubble-mint-soda',
      price: 500,
      icon: 'fa-solid fa-glass-water',
      desc: '민트색 말풍선'
    },
    {
      id: 'bubble_cozy_peach',
      name: '피치',
      bubbleClass: 'bubble-cozy-peach',
      price: 500,
      icon: 'fa-solid fa-heart',
      desc: '피치색 말풍선'
    },
    {
      id: 'bubble_pop_comic',
      name: '코믹',
      bubbleClass: 'bubble-pop-comic',
      price: 700,
      icon: 'fa-solid fa-comment-dots',
      desc: '만화 스타일 말풍선'
    },
    {
      id: 'bubble_royal_velvet',
      name: '와인',
      bubbleClass: 'bubble-royal-velvet',
      price: 1000,
      icon: 'fa-solid fa-crown',
      desc: '와인색 말풍선'
    },
    {
      id: 'bubble_rainbow',
      name: '무지개',
      bubbleClass: 'bubble-rainbow',
      price: 1200,
      icon: 'fa-solid fa-rainbow',
      desc: '무지개 말풍선'
    }
  ];

  // 🖼️ 아바타 테두리 (상점 아이템)
  let myAvatarFrame = localStorage.getItem('arcade_user_avatar_frame') || 'default';
  let myPurchasedAvatarFrames = ['default'];
  try {
    const rawFrames = localStorage.getItem('arcade_purchased_avatar_frames');
    myPurchasedAvatarFrames = rawFrames ? JSON.parse(rawFrames) : ['default'];
    if (!Array.isArray(myPurchasedAvatarFrames)) myPurchasedAvatarFrames = ['default'];
    if (!myPurchasedAvatarFrames.includes('default')) myPurchasedAvatarFrames.push('default');
  } catch (_) {
    myPurchasedAvatarFrames = ['default'];
  }

  const SHOP_AVATAR_FRAMES = [
    {
      id: 'default',
      name: '기본',
      frameClass: 'frame-default',
      price: 0,
      icon: 'fa-regular fa-circle',
      desc: '기본 테두리',
      isDefault: true
    },
    // 🔲 네모난 레트로 픽셀 테두리 라인업
    {
      id: 'frame_retro_pixel',
      name: '픽셀 보라',
      frameClass: 'frame-retro-pixel',
      price: 600,
      icon: 'fa-solid fa-square',
      desc: '보라색 네모 픽셀'
    },
    {
      id: 'frame_pixel_black',
      name: '픽셀 블랙',
      frameClass: 'frame-pixel-black',
      price: 500,
      icon: 'fa-solid fa-square',
      desc: '검은색 네모 픽셀'
    },
    {
      id: 'frame_pixel_gold',
      name: '픽셀 골드',
      frameClass: 'frame-pixel-gold',
      price: 800,
      icon: 'fa-solid fa-square',
      desc: '황금색 네모 픽셀'
    },
    {
      id: 'frame_pixel_mint',
      name: '픽셀 민트',
      frameClass: 'frame-pixel-mint',
      price: 600,
      icon: 'fa-solid fa-square',
      desc: '민트색 네모 픽셀'
    },
    {
      id: 'frame_pixel_red',
      name: '픽셀 레드',
      frameClass: 'frame-pixel-red',
      price: 600,
      icon: 'fa-solid fa-square',
      desc: '빨간색 네모 픽셀'
    },
    {
      id: 'frame_pixel_blue',
      name: '픽셀 블루',
      frameClass: 'frame-pixel-blue',
      price: 600,
      icon: 'fa-solid fa-square',
      desc: '파란색 네모 픽셀'
    },
    {
      id: 'frame_pixel_gameboy',
      name: '게임보이',
      frameClass: 'frame-pixel-gameboy',
      price: 700,
      icon: 'fa-solid fa-gamepad',
      desc: '게임보이 네모 픽셀'
    },
    {
      id: 'frame_pixel_rainbow',
      name: '픽셀 무지개',
      frameClass: 'frame-pixel-rainbow',
      price: 1000,
      icon: 'fa-solid fa-rainbow',
      desc: '무지개 네모 픽셀'
    },
    // 🌟 프리미엄 원형 테두리 (이름 심플화)
    {
      id: 'frame_gold_wreath',
      name: '월계관',
      frameClass: 'frame-gold-wreath',
      price: 800,
      icon: 'fa-solid fa-award',
      desc: '황금 월계관'
    },
    {
      id: 'frame_cyber_pulse',
      name: '블루',
      frameClass: 'frame-cyber-pulse',
      price: 700,
      icon: 'fa-solid fa-vector-square',
      desc: '블루 사각 테두리'
    },
    {
      id: 'frame_ice_crystal',
      name: '크리스탈',
      frameClass: 'frame-ice-crystal',
      price: 900,
      icon: 'fa-solid fa-snowflake',
      desc: '얼음 크리스탈'
    },
    {
      id: 'frame_fire_flame',
      name: '불꽃',
      frameClass: 'frame-fire-flame',
      price: 1000,
      icon: 'fa-solid fa-fire',
      desc: '불꽃 테두리'
    },
    {
      id: 'frame_royal_crown',
      name: '왕관',
      frameClass: 'frame-royal-crown',
      price: 1500,
      icon: 'fa-solid fa-crown',
      desc: '황금 왕관'
    }
  ];

  // 🎆 승리 세레머니 연출 (상점 아이템)
  let myVictoryEffect = localStorage.getItem('arcade_user_victory_effect') || 'default';
  let myPurchasedVictoryEffects = ['default'];
  try {
    const rawEffects = localStorage.getItem('arcade_purchased_victory_effects');
    myPurchasedVictoryEffects = rawEffects ? JSON.parse(rawEffects) : ['default'];
    if (!Array.isArray(myPurchasedVictoryEffects)) myPurchasedVictoryEffects = ['default'];
    if (!myPurchasedVictoryEffects.includes('default')) myPurchasedVictoryEffects.push('default');
  } catch (_) {
    myPurchasedVictoryEffects = ['default'];
  }

  const SHOP_VICTORY_EFFECTS = [
    {
      id: 'default',
      name: '기본',
      effectKey: 'default',
      price: 0,
      icon: 'fa-solid fa-wand-magic-sparkles',
      desc: '기본 폭죽',
      isDefault: true
    },
    {
      id: 'fx_pixel_fireworks',
      name: '도트 폭죽',
      effectKey: 'pixel_fireworks',
      price: 800,
      icon: 'fa-solid fa-bomb',
      desc: '도트 사각 폭죽'
    },
    {
      id: 'fx_neon_sparks',
      name: '스파크',
      effectKey: 'neon_sparks',
      price: 1000,
      icon: 'fa-solid fa-bolt',
      desc: '빛나는 스파크'
    },
    {
      id: 'fx_heart_star',
      name: '하트',
      effectKey: 'heart_star',
      price: 700,
      icon: 'fa-solid fa-heart',
      desc: '하트와 별'
    },
    {
      id: 'fx_grand_festival',
      name: '불꽃축제',
      effectKey: 'grand_festival',
      price: 1800,
      icon: 'fa-solid fa-champagne-glasses',
      desc: '대형 불꽃'
    },
    {
      id: 'fx_rainbow_blast',
      name: '무지개',
      effectKey: 'rainbow_blast',
      price: 1500,
      icon: 'fa-solid fa-rainbow',
      desc: '무지개 폭죽'
    }
  ];

  // 🪙 코인 시스템 완전 제거 (불필요한 잔여 캐시 정리)
  try { localStorage.removeItem('arcade_user_coins'); } catch (_) {}

  // 🌟 1~300 레벨 및 경험치 시스템 (로컬 & 클라우드 연동)
  const MAX_LEVEL = 300;
  let myLevel = parseInt(localStorage.getItem('arcade_user_level') || '1', 10);
  let myExp = parseInt(localStorage.getItem('arcade_user_exp') || '0', 10);
  if (isNaN(myLevel) || myLevel < 1) myLevel = 1;
  if (myLevel > MAX_LEVEL) myLevel = MAX_LEVEL;
  if (isNaN(myExp) || myExp < 0) myExp = 0;

  let pendingAction = null;
  let pendingJoinCode = '';

  let currentRoomCode = '';
  let selectedGameKey = 'inu_quiz';
  let currentGameModule = null;

  // 방 설정 옵션 상태
  let createRoomCapacity = 5;
  let currentRoomMaxPlayers = 5;
  let currentRoomPassword = '';
  let pendingJoinRoomCode = '';

  // 🎮 게임별 세부 설정 (목표 라운드 1~8회, 오목/체스 진영 셔플/흑/백)
  let selectedGameRounds = 3;
  let selectedGameSideMode = 'shuffle'; // 'shuffle' | 'host_black' | 'host_white'

  // 룸 참가자 목록
  let roomPlayers = [];
  let isHostPlayer = false;
  let isMyReady = false;
  let isDevMode = false;
  let isRoomGameActive = false;
  let _isMigratingHost = false; // 방장 위임/인계 마이그레이션 진행 플래그

  // 현재 게임 중인 참가자 목록 (셔플된 순서)
  let activeGamePlayers = [];

  // 방장 관리 액션 대상 플레이어
  let selectedTargetPlayer = null;
  let lastKnownTurnPlayerIdOrIdx = null; // 🌟 현재 턴 인덱스/ID 영구 기억 변수
  // 활성화된 프로필 이모지 상태 저장 객체
 const activeProfileEmojis = {}; // { playerId: { emojiSrc, timeoutId } }

  /* ── DOM 헬퍼 ── */
  const $ = (id) => document.getElementById(id);

  const screens = {
    home:     $('screen-home'),
    room:     $('screen-room'),
    game:     $('screen-game'),
  };

  function _pushHistory(state, hash) {
    if (window.history && typeof window.history.pushState === 'function') {
      try {
        const url = hash ? hash : ((window.location && window.location.pathname) ? window.location.pathname : '');
        window.history.pushState(state, '', url);
      } catch (e) {}
    }
  }

  function _replaceHistory(state) {
    if (window.history && typeof window.history.replaceState === 'function') {
      try {
        const url = (window.location && window.location.pathname) ? window.location.pathname : '';
        window.history.replaceState(state, '', url);
      } catch (e) {}
    }
  }

  function _backHistoryIfModal(modalName) {
    if (window.history && window.history.state && window.history.state.modal === modalName) {
      if (typeof window.history.back === 'function') {
        try {
          window.history.back();
          return true;
        } catch (e) {}
      }
    }
    return false;
  }

  function showScreen(name, pushState = true) {
    const t = screens[name];
    if (!t) return;
    if (t.classList.contains('active')) {
      if (name === 'home') _updateHomeUserBar();
      if (name === 'room') {
        if (typeof _scrollRoomChatToBottom === 'function') _scrollRoomChatToBottom();
      }
      return;
    }

    if (pushState) {
      if (name === 'home') {
        _pushHistory({ screen: 'home' });
      } else {
        _pushHistory({ screen: name }, '#' + name);
      }
    }

    Object.values(screens).forEach(s => s && s.classList.remove('active'));
    t.classList.add('active');
    try { window.scrollTo(0, 0); } catch (e) {}

    if (name === 'home') {
      _updateHomeUserBar();
    } else if (name === 'room') {
      if (typeof _scrollRoomChatToBottom === 'function') _scrollRoomChatToBottom();
    } else {
    }
  }

  /* ── 로딩 오버레이 & 토스트 ── */
  let _isJoinCancelled = false;

  function showLoading(text = '처리 중...') {
    const translated = (typeof I18N !== 'undefined') ? I18N.t(text) : text;
    $('loading-text').textContent = translated;
    $('overlay-loading').classList.remove('hidden');
  }
  function hideLoading() {
    $('overlay-loading').classList.add('hidden');
  }

  // 방 접속 중 취소 버튼
  if ($('btn-cancel-loading')) {
    $('btn-cancel-loading').addEventListener('click', () => {
      _cancelPendingConnection();
    });
  }

  function _cancelPendingConnection() {
    _isJoinCancelled = true;
    try {
      P2P.destroy();
    } catch (_) {}
    hideLoading();
    if ($('btn-join-room')) $('btn-join-room').disabled = false;
    currentRoomCode = '';
    showToast('방 접속이 취소되었습니다.', 'info');
    showScreen('home');
  }

  let _toastTimer = null;
  function showToast(msg, type = '') {
    const el = $('toast');
    const translated = (typeof I18N !== 'undefined') ? I18N.t(msg) : msg;
    el.textContent = translated;
    el.className = 'toast ' + type;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
  }

  /* ── 인게임 좌측 미니 알림 ── */
  function _showInGameAlert(msg) {
    const container = $('gsp-alert-container');
    if (!container) return;
    const alertEl = document.createElement('div');
    alertEl.className = 'gsp-alert-item';
    alertEl.innerHTML = `<i class="fa-solid fa-arrow-right-from-bracket"></i> <span>${_escapeHtml(msg)}</span>`;
    container.appendChild(alertEl);

    setTimeout(() => {
      alertEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      alertEl.style.opacity = '0';
      alertEl.style.transform = 'translateY(-6px)';
      setTimeout(() => {
        if (alertEl.parentNode) alertEl.parentNode.removeChild(alertEl);
      }, 300);
    }, 3800);
  }

  /* ── 화면 테마 (다크/라이트 모드) 시스템 ── */
  let currentTheme = localStorage.getItem('kr_arcade_theme') || 'light';

  /* ── 🎨 포인트 색상 (액센트 테마) 시스템 ── */
  const ACCENT_PRESETS = {
    navy: {
      name: '인천대 블루',
      color: '#0A4A9B',
      light: {
        '--green': '#0A4A9B',
        '--green-hover': '#083b7c',
        '--green-deep': '#052752',
        '--green-tint': 'rgba(10, 74, 155, 0.08)',
        '--green-tint-hi': 'rgba(10, 74, 155, 0.16)',
        '--green-border': 'rgba(10, 74, 155, 0.28)',
        '--shadow-green': '0 2px 8px rgba(10, 74, 155, 0.25)',
      },
      dark: {
        '--green': '#60a5fa',
        '--green-hover': '#93c5fd',
        '--green-deep': '#bfdbfe',
        '--green-tint': 'rgba(96, 165, 250, 0.16)',
        '--green-tint-hi': 'rgba(96, 165, 250, 0.25)',
        '--green-border': 'rgba(96, 165, 250, 0.35)',
        '--shadow-green': '0 2px 8px rgba(96, 165, 250, 0.3)',
      }
    },
    inu_gold: {
      name: '인천대 골드',
      color: '#FCAF15',
      light: {
        '--green': '#FCAF15',
        '--green-hover': '#e59b0a',
        '--green-deep': '#b47300',
        '--green-tint': 'rgba(252, 175, 21, 0.12)',
        '--green-tint-hi': 'rgba(252, 175, 21, 0.22)',
        '--green-border': 'rgba(252, 175, 21, 0.38)',
        '--shadow-green': '0 2px 8px rgba(252, 175, 21, 0.3)',
      },
      dark: {
        '--green': '#fbbf24',
        '--green-hover': '#fcd34d',
        '--green-deep': '#fef3c7',
        '--green-tint': 'rgba(251, 191, 36, 0.18)',
        '--green-tint-hi': 'rgba(251, 191, 36, 0.28)',
        '--green-border': 'rgba(251, 191, 36, 0.4)',
        '--shadow-green': '0 2px 8px rgba(251, 191, 36, 0.35)',
      }
    },
    classic: {
      name: '클래식 에메랄드',
      color: '#10b981',
      light: {
        '--green': '#10b981',
        '--green-hover': '#059669',
        '--green-deep': '#047857',
        '--green-tint': 'rgba(16, 185, 129, 0.08)',
        '--green-tint-hi': 'rgba(16, 185, 129, 0.16)',
        '--green-border': 'rgba(16, 185, 129, 0.28)',
        '--shadow-green': '0 2px 6px rgba(16, 185, 129, 0.25)',
      },
      dark: {
        '--green': '#10b981',
        '--green-hover': '#34d399',
        '--green-deep': '#6ee7b7',
        '--green-tint': 'rgba(16, 185, 129, 0.16)',
        '--green-tint-hi': 'rgba(16, 185, 129, 0.25)',
        '--green-border': 'rgba(16, 185, 129, 0.35)',
        '--shadow-green': '0 2px 8px rgba(16, 185, 129, 0.3)',
      }
    },
    apple: {
      name: '애플 연두',
      color: '#83c774',
      light: {
        '--green': '#83c774',
        '--green-hover': '#72b863',
        '--green-deep': '#509941',
        '--green-tint': 'rgba(131, 199, 116, 0.12)',
        '--green-tint-hi': 'rgba(131, 199, 116, 0.22)',
        '--green-border': 'rgba(131, 199, 116, 0.35)',
        '--shadow-green': '0 2px 6px rgba(131, 199, 116, 0.25)',
      },
      dark: {
        '--green': '#83c774',
        '--green-hover': '#9ae08c',
        '--green-deep': '#a5e897',
        '--green-tint': 'rgba(131, 199, 116, 0.18)',
        '--green-tint-hi': 'rgba(131, 199, 116, 0.28)',
        '--green-border': 'rgba(131, 199, 116, 0.38)',
        '--shadow-green': '0 2px 8px rgba(131, 199, 116, 0.3)',
      }
    },
    blue: {
      name: '오션 블루',
      color: '#2563eb',
      light: {
        '--green': '#2563eb',
        '--green-hover': '#1d4ed8',
        '--green-deep': '#1e40af',
        '--green-tint': 'rgba(37, 99, 235, 0.08)',
        '--green-tint-hi': 'rgba(37, 99, 235, 0.16)',
        '--green-border': 'rgba(37, 99, 235, 0.28)',
        '--shadow-green': '0 2px 6px rgba(37, 99, 235, 0.25)',
      },
      dark: {
        '--green': '#3b82f6',
        '--green-hover': '#60a5fa',
        '--green-deep': '#93c5fd',
        '--green-tint': 'rgba(59, 130, 246, 0.16)',
        '--green-tint-hi': 'rgba(59, 130, 246, 0.25)',
        '--green-border': 'rgba(59, 130, 246, 0.35)',
        '--shadow-green': '0 2px 8px rgba(59, 130, 246, 0.3)',
      }
    },
    purple: {
      name: '네온 바이올렛',
      color: '#8b5cf6',
      light: {
        '--green': '#8b5cf6',
        '--green-hover': '#7c3aed',
        '--green-deep': '#6d28d9',
        '--green-tint': 'rgba(139, 92, 246, 0.08)',
        '--green-tint-hi': 'rgba(139, 92, 246, 0.16)',
        '--green-border': 'rgba(139, 92, 246, 0.28)',
        '--shadow-green': '0 2px 6px rgba(139, 92, 246, 0.25)',
      },
      dark: {
        '--green': '#a78bfa',
        '--green-hover': '#c4b5fd',
        '--green-deep': '#ddd6fe',
        '--green-tint': 'rgba(167, 139, 250, 0.16)',
        '--green-tint-hi': 'rgba(167, 139, 250, 0.25)',
        '--green-border': 'rgba(167, 139, 250, 0.35)',
        '--shadow-green': '0 2px 8px rgba(167, 139, 250, 0.3)',
      }
    },
    rose: {
      name: '코랄 로즈',
      color: '#f43f5e',
      light: {
        '--green': '#f43f5e',
        '--green-hover': '#e11d48',
        '--green-deep': '#be123c',
        '--green-tint': 'rgba(244, 63, 94, 0.08)',
        '--green-tint-hi': 'rgba(244, 63, 94, 0.16)',
        '--green-border': 'rgba(244, 63, 94, 0.28)',
        '--shadow-green': '0 2px 6px rgba(244, 63, 94, 0.25)',
      },
      dark: {
        '--green': '#fb7185',
        '--green-hover': '#fda4af',
        '--green-deep': '#fecdd3',
        '--green-tint': 'rgba(251, 113, 133, 0.16)',
        '--green-tint-hi': 'rgba(251, 113, 133, 0.25)',
        '--green-border': 'rgba(251, 113, 133, 0.35)',
        '--shadow-green': '0 2px 8px rgba(251, 113, 133, 0.3)',
      }
    },
    amber: {
      name: '선셋 오렌지',
      color: '#f59e0b',
      light: {
        '--green': '#f59e0b',
        '--green-hover': '#d97706',
        '--green-deep': '#b45309',
        '--green-tint': 'rgba(245, 158, 11, 0.08)',
        '--green-tint-hi': 'rgba(245, 158, 11, 0.16)',
        '--green-border': 'rgba(245, 158, 11, 0.28)',
        '--shadow-green': '0 2px 6px rgba(245, 158, 11, 0.25)',
      },
      dark: {
        '--green': '#fbbf24',
        '--green-hover': '#fcd34d',
        '--green-deep': '#fef08a',
        '--green-tint': 'rgba(251, 191, 36, 0.16)',
        '--green-tint-hi': 'rgba(251, 191, 36, 0.25)',
        '--green-border': 'rgba(251, 191, 36, 0.35)',
        '--shadow-green': '0 2px 8px rgba(251, 191, 36, 0.3)',
      }
    }
  };

  let currentAccentColor = localStorage.getItem('kr_arcade_accent');
  if (!currentAccentColor || currentAccentColor === 'classic') {
    currentAccentColor = 'navy';
  }

  function _applyAccentColor(accentKey) {
    if (!ACCENT_PRESETS[accentKey]) accentKey = 'navy';
    currentAccentColor = accentKey;
    localStorage.setItem('kr_arcade_accent', accentKey);
    document.documentElement.setAttribute('data-accent', accentKey);

    const preset = ACCENT_PRESETS[accentKey];
    const mode = (currentTheme === 'dark') ? 'dark' : 'light';
    const vars = preset[mode];

    for (const [key, val] of Object.entries(vars)) {
      document.documentElement.style.setProperty(key, val);
    }

    const nameEl = $('accent-color-name');
    if (nameEl) {
      nameEl.textContent = preset.name;
      nameEl.style.color = vars['--green'];
    }

    const paletteEl = $('accent-color-palette');
    if (paletteEl) {
      paletteEl.querySelectorAll('.accent-chip').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-accent') === accentKey);
      });
    }
  }

  function _applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('kr_arcade_theme', theme);
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.removeAttribute('data-theme');
    }

    _applyAccentColor(currentAccentColor);

    const targetColor = theme === 'dark' ? '#0f172a' : '#f6f8f7';
    document.querySelectorAll('meta[name="theme-color"]').forEach(el => {
      el.setAttribute('content', targetColor);
    });
    const msNavColor = document.querySelector('meta[name="msapplication-navbutton-color"]');
    if (msNavColor) msNavColor.setAttribute('content', targetColor);

    const btnLight = $('btn-theme-light');
    const btnDark = $('btn-theme-dark');
    if (btnLight && btnDark) {
      if (theme === 'dark') {
        btnLight.classList.remove('active');
        btnDark.classList.add('active');
      } else {
        btnLight.classList.add('active');
        btnDark.classList.remove('active');
      }
    }
  }

  function _initAccentColors() {
    _applyAccentColor(currentAccentColor);
    const paletteEl = $('accent-color-palette');
    if (paletteEl) {
      paletteEl.addEventListener('click', (e) => {
        const chip = e.target.closest('.accent-chip');
        if (!chip) return;
        const accent = chip.getAttribute('data-accent');
        if (accent && ACCENT_PRESETS[accent]) {
          _applyAccentColor(accent);
          if (typeof Sound !== 'undefined' && Sound.playPop) Sound.playPop();
        }
      });
    }
  }

  function _initTheme() {
    _applyTheme(currentTheme);
    _initAccentColors();
    const btnLight = $('btn-theme-light');
    const btnDark = $('btn-theme-dark');
    if (btnLight) {
      btnLight.addEventListener('click', () => {
        _applyTheme('light');
        if (typeof Sound !== 'undefined' && Sound.playPop) Sound.playPop();
      });
    }
    if (btnDark) {
      btnDark.addEventListener('click', () => {
        _applyTheme('dark');
        if (typeof Sound !== 'undefined' && Sound.playPop) Sound.playPop();
      });
    }
  }

  /* ── ⚙️ 환경 설정 대개편 시스템 (v1.0.0 — 5개 탭 & 버그 제보 DB) ── */
  function _applyGlobalSettings() {
    const fontScale = localStorage.getItem('arcade_font_scale') || 'normal';
    document.documentElement.classList.toggle('large-text-scale', fontScale === 'large');

    const animEnabled = localStorage.getItem('arcade_anim_enabled') !== 'false';
    document.documentElement.classList.toggle('reduce-motion', !animEnabled);
  }

  function _syncSettingsUI() {
    const isBgmMuted = Sound.isBgmMuted();
    const isSfxMuted = Sound.isSfxMuted();
    const bgmVol = Math.round(Sound.getBgmVolume() * 100);
    const sfxVol = Math.round(Sound.getSfxVolume() * 100);

    _applyTheme(currentTheme);

    if ($('slider-bgm-vol')) $('slider-bgm-vol').value = bgmVol;
    if ($('slider-sfx-vol')) $('slider-sfx-vol').value = sfxVol;
    if ($('text-bgm-vol')) $('text-bgm-vol').textContent = `${bgmVol}%`;
    if ($('text-sfx-vol')) $('text-sfx-vol').textContent = `${sfxVol}%`;

    // [화면 탭] 옵션 복원
    if ($('chk-anim-enabled')) {
      $('chk-anim-enabled').checked = (localStorage.getItem('arcade_anim_enabled') !== 'false');
    }
    if ($('chk-shake-enabled')) {
      $('chk-shake-enabled').checked = (localStorage.getItem('arcade_shake_enabled') !== 'false');
    }
    if ($('select-font-scale')) {
      $('select-font-scale').value = localStorage.getItem('arcade_font_scale') || 'normal';
    }

    // [게임 편의 탭] 옵션 복원
    if ($('chk-auto-ready')) {
      $('chk-auto-ready').checked = (localStorage.getItem('arcade_auto_ready') === 'true');
    }
    if ($('chk-dnd-mode')) {
      $('chk-dnd-mode').checked = (localStorage.getItem('arcade_dnd_mode') === 'true');
    }
    if ($('chk-show-emojis')) {
      $('chk-show-emojis').checked = (localStorage.getItem('arcade_show_emojis') !== 'false');
    }
    if ($('chk-chat-notify')) {
      $('chk-chat-notify').checked = (localStorage.getItem('arcade_chat_notify') !== 'false');
    }

    _updateSettingsMuteButtons(isBgmMuted, isSfxMuted);
  }

  function _openSettingsModal() {
    _pushHistory({ modal: 'settings' }, '#settings');
    _syncSettingsUI();
    if (typeof I18N !== 'undefined') I18N.applyToDocument();

    if ($('overlay-settings')) $('overlay-settings').classList.remove('hidden');
  }

  function _closeSettingsModal() {
    // 설정값 로컬 저장
    if ($('chk-auto-ready')) {
      localStorage.setItem('arcade_auto_ready', $('chk-auto-ready').checked ? 'true' : 'false');
    }
    if ($('chk-anim-enabled')) {
      localStorage.setItem('arcade_anim_enabled', $('chk-anim-enabled').checked ? 'true' : 'false');
    }
    if ($('chk-shake-enabled')) {
      localStorage.setItem('arcade_shake_enabled', $('chk-shake-enabled').checked ? 'true' : 'false');
    }
    if ($('select-font-scale')) {
      localStorage.setItem('arcade_font_scale', $('select-font-scale').value);
    }
    if ($('chk-dnd-mode')) {
      localStorage.setItem('arcade_dnd_mode', $('chk-dnd-mode').checked ? 'true' : 'false');
    }
    if ($('chk-show-emojis')) {
      localStorage.setItem('arcade_show_emojis', $('chk-show-emojis').checked ? 'true' : 'false');
    }
    if ($('chk-chat-notify')) {
      localStorage.setItem('arcade_chat_notify', $('chk-chat-notify').checked ? 'true' : 'false');
    }

    _applyGlobalSettings();

    // 모달 즉시 닫기
    if ($('overlay-settings')) $('overlay-settings').classList.add('hidden');
    _backHistoryIfModal('settings');
  }

  function _updateSettingsMuteButtons(isBgmMuted, isSfxMuted) {
    const bgmBtn = $('btn-toggle-bgm-mute');
    const sfxBtn = $('btn-toggle-sfx-mute');
    if (bgmBtn) {
      bgmBtn.innerHTML = isBgmMuted
        ? '<i class="fa-solid fa-volume-xmark" style="color:var(--coral);"></i>'
        : '<i class="fa-solid fa-volume-high" style="color:var(--sky);"></i>';
    }
    if (sfxBtn) {
      sfxBtn.innerHTML = isSfxMuted
        ? '<i class="fa-solid fa-volume-xmark" style="color:var(--coral);"></i>'
        : '<i class="fa-solid fa-volume-high" style="color:var(--green);"></i>';
    }

    const masterMuteStatus = $('text-master-mute-status');
    const masterMuteBtn = $('btn-master-mute-toggle');
    const allMuted = (isBgmMuted && isSfxMuted);
    if (masterMuteStatus) {
      masterMuteStatus.textContent = allMuted ? '소리 꺼짐 (음소거)' : '소리 켜짐';
    }
    if (masterMuteBtn) {
      masterMuteBtn.innerHTML = allMuted
        ? '<i class="fa-solid fa-volume-xmark" style="color:var(--coral); margin-right:4px;"></i> <span>소리 켜기</span>'
        : '<i class="fa-solid fa-volume-high" style="color:var(--green); margin-right:4px;"></i> <span>전체 끄기</span>';
    }

    const mainSoundIcon = $('sound-icon');
    const soundStatusText = $('sound-status-text');
    if (mainSoundIcon) {
      mainSoundIcon.className = allMuted
        ? 'fa-solid fa-volume-xmark'
        : 'fa-solid fa-volume-high';
    }
    if (soundStatusText) {
      soundStatusText.textContent = allMuted ? '소리 꺼짐' : '소리 설정';
    }
  }

  // ── 환경 설정 탭 전환 핸들러 ──
  function _initSettingsTabs() {
    const tabBtns = document.querySelectorAll('.settings-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (!targetTab) return;

        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.settings-tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });

        const targetPane = $(`pane-settings-${targetTab}`);
        if (targetPane) targetPane.classList.add('active');

        if (typeof Sound !== 'undefined' && Sound.playClick) Sound.playClick();
      });
    });
  }

  // ── 🌐 언어 탭 초기화 & 언어 버튼 그리드 렌더링 ──
  function _initLanguageTab() {
    if (typeof I18N === 'undefined') return;

    const grid = $('lang-choice-grid');
    if (!grid) return;

    const langs = I18N.getLanguages();
    const currentLang = I18N.getCurrentLang();

    grid.innerHTML = langs.map(l => `
      <button type="button" class="lang-choice-btn${l.code === currentLang ? ' active' : ''}" data-lang="${l.code}">
        <span class="lang-flag">${l.flag}</span>
        <span class="lang-label">${l.label}</span>
        ${l.code === currentLang ? '<i class="fa-solid fa-check lang-check"></i>' : ''}
      </button>
    `).join('');

    grid.querySelectorAll('.lang-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.lang;
        if (!code) return;
        I18N.setLanguage(code);
        // 체크마크 갱신
        grid.querySelectorAll('.lang-choice-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.lang === code);
          const existingCheck = b.querySelector('.lang-check');
          if (b.dataset.lang === code) {
            if (!existingCheck) {
              const chk = document.createElement('i');
              chk.className = 'fa-solid fa-check lang-check';
              b.appendChild(chk);
            }
          } else {
            if (existingCheck) existingCheck.remove();
          }
        });
        if (typeof Sound !== 'undefined' && Sound.playPop) Sound.playPop();
      });
    });
  }

  // ── 버그 문의 폼 실시간 접수 핸들러 ──
  function _initBugReportForm() {
    const bugContent = $('bug-content');
    const charCount = $('bug-char-count');
    if (bugContent && charCount) {
      bugContent.addEventListener('input', () => {
        const len = bugContent.value.length;
        charCount.textContent = `${len} / 500자`;
      });
    }

    const submitBtn = $('btn-submit-bug');
    const form = $('form-bug-report');

    async function doSubmit() {
      const titleEl = $('bug-title');
      const contentEl = $('bug-content');
      const typeEl = $('bug-type');
      const gameEl = $('bug-game');

      if (!titleEl || !contentEl) return;
      const title = titleEl.value.trim();
      const content = contentEl.value.trim();

      if (title.length < 2) {
        showToast('문의 제목을 2자 이상 입력해주세요.', 'warn');
        titleEl.focus();
        return;
      }
      if (content.length < 5) {
        showToast('상세 내용을 5자 이상 작성해주세요.', 'warn');
        contentEl.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>접수 중...</span>';
      }

      try {
        const reportData = {
          userId: myPeerId || '',
          userNickname: myNickname || '익명',
          type: typeEl ? typeEl.value : 'bug',
          game: gameEl ? gameEl.value : 'all',
          title: title,
          content: content,
          deviceInfo: `${navigator.platform || ''} / ${navigator.userAgent || ''} (${window.innerWidth}x${window.innerHeight})`
        };

        let res = null;
        if (typeof FirebaseLobby !== 'undefined' && typeof FirebaseLobby.submitBugReport === 'function') {
          res = await FirebaseLobby.submitBugReport(reportData);
        } else {
          // Firebase가 준비되지 않은 경우 로컬 스토리지에 백업
          try {
            const raw = localStorage.getItem('arcade_saved_inquiries') || '[]';
            const list = JSON.parse(raw);
            list.push({ ...reportData, savedAt: Date.now() });
            localStorage.setItem('arcade_saved_inquiries', JSON.stringify(list));
          } catch (_) {}
          res = { success: true };
        }

        if (res && res.success) {
          showToast('문의가 정상적으로 접수되었습니다. 소중한 의견 감사합니다!', 'success');
          if (typeof Sound !== 'undefined' && Sound.playWordSubmit) Sound.playWordSubmit();
          titleEl.value = '';
          contentEl.value = '';
          if (charCount) charCount.textContent = '0 / 500자';
        } else {
          // 전송 실패 시에도 사용자 입력 내용이 유실되지 않도록 로컬 백업 후 안내
          try {
            const raw = localStorage.getItem('arcade_saved_inquiries') || '[]';
            const list = JSON.parse(raw);
            list.push({ ...reportData, savedAt: Date.now() });
            localStorage.setItem('arcade_saved_inquiries', JSON.stringify(list));
            showToast('문의가 안전하게 접수되었습니다. (네트워크 지연으로 임시 보관됨)', 'success');
            titleEl.value = '';
            contentEl.value = '';
            if (charCount) charCount.textContent = '0 / 500자';
          } catch (_) {
            showToast(res?.message || '접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'warn');
          }
        }
      } catch (err) {
        console.error('[Inquiry] 접수 처리 중 오류:', err);
        try {
          const raw = localStorage.getItem('arcade_saved_inquiries') || '[]';
          const list = JSON.parse(raw);
          list.push({
            userId: myPeerId || '',
            userNickname: myNickname || '익명',
            type: typeEl ? typeEl.value : 'bug',
            game: gameEl ? gameEl.value : 'all',
            title: title,
            content: content,
            savedAt: Date.now()
          });
          localStorage.setItem('arcade_saved_inquiries', JSON.stringify(list));
          showToast('문의가 안전하게 접수되었습니다. 감사합니다!', 'success');
          titleEl.value = '';
          contentEl.value = '';
          if (charCount) charCount.textContent = '0 / 500자';
        } catch (_) {
          showToast('일시적인 네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'warn');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>문의 접수</span>';
        }
      }
    }

    if (submitBtn) submitBtn.addEventListener('click', doSubmit);
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); doSubmit(); });
  }

  // ── 환경 설정 초기화 핸들러 ──
  function _initSettingsReset() {
    const resetBtn = $('btn-reset-settings');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        showConfirmModal('환경 설정을 기본값으로 초기화하시겠습니까?', () => {
          localStorage.removeItem('arcade_auto_ready');
          localStorage.removeItem('arcade_anim_enabled');
          localStorage.removeItem('arcade_shake_enabled');
          localStorage.removeItem('arcade_font_scale');
          localStorage.removeItem('arcade_dnd_mode');
          localStorage.removeItem('arcade_show_emojis');
          localStorage.removeItem('arcade_chat_notify');

          Sound.setBgmVolume(0.35);
          Sound.setSfxVolume(0.70);
          if (Sound.isBgmMuted()) Sound.toggleBgmMute();
          if (Sound.isSfxMuted()) Sound.toggleSfxMute();

          _applyGlobalSettings();
          _syncSettingsUI();
          showToast('환경 설정이 기본값으로 초기화되었습니다.', 'success');
        });
      });
    }

    // 마스터 음소거 토글
    const masterBtn = $('btn-master-mute-toggle');
    if (masterBtn) {
      masterBtn.addEventListener('click', () => {
        const bothMuted = Sound.isBgmMuted() && Sound.isSfxMuted();
        if (bothMuted) {
          if (Sound.isBgmMuted()) Sound.toggleBgmMute();
          if (Sound.isSfxMuted()) Sound.toggleSfxMute();
          showToast('모든 사운드가 켜졌습니다.', 'info');
        } else {
          if (!Sound.isBgmMuted()) Sound.toggleBgmMute();
          if (!Sound.isSfxMuted()) Sound.toggleSfxMute();
          showToast('모든 사운드가 음소거되었습니다.', 'info');
        }
        _updateSettingsMuteButtons(Sound.isBgmMuted(), Sound.isSfxMuted());
      });
    }

    // 사운드 테스트 청취
    const testSoundBtn = $('btn-test-sound');
    if (testSoundBtn) {
      testSoundBtn.addEventListener('click', () => {
        if (Sound.isSfxMuted()) {
          showToast('효과음이 음소거되어 있습니다. 음소거를 해제해주세요.', 'warn');
        } else {
          Sound.playClick();
          showToast('효과음 테스트 재생 완료', 'info');
        }
      });
    }

    // 폰트 스케일 즉시 반영
    const fontScaleSelect = $('select-font-scale');
    if (fontScaleSelect) {
      fontScaleSelect.addEventListener('change', () => {
        localStorage.setItem('arcade_font_scale', fontScaleSelect.value);
        _applyGlobalSettings();
      });
    }

    // 애니메이션 토글 즉시 반영
    const animToggle = $('chk-anim-enabled');
    if (animToggle) {
      animToggle.addEventListener('change', () => {
        localStorage.setItem('arcade_anim_enabled', animToggle.checked ? 'true' : 'false');
        _applyGlobalSettings();
      });
    }
  }

  // 🌐 다국어(i18n) 시스템 초기화 — DOM 준비 후 즉시 번역 적용
  if (typeof I18N !== 'undefined') {
    I18N.init();
    _initLanguageTab();

    const globalLangSelect = $('select-global-language');
    if (globalLangSelect) {
      globalLangSelect.addEventListener('change', (e) => {
        const lang = e.target.value;
        if (lang) {
          I18N.setLanguage(lang);
          if (typeof Sound !== 'undefined' && Sound.playPop) Sound.playPop();
        }
      });
    }
  }

  // 설정 열기 버튼들
  if ($('btn-open-settings')) $('btn-open-settings').addEventListener('click', _openSettingsModal);
  if ($('btn-toggle-sound')) $('btn-toggle-sound').addEventListener('click', _openSettingsModal);
  if ($('btn-room-settings')) $('btn-room-settings').addEventListener('click', _openSettingsModal);
  if ($('btn-game-settings')) $('btn-game-settings').addEventListener('click', _openSettingsModal);
  if ($('btn-close-settings')) $('btn-close-settings').addEventListener('click', _closeSettingsModal);
  if ($('btn-confirm-settings')) $('btn-confirm-settings').addEventListener('click', _closeSettingsModal);

  // 모달 바깥 배경 터치 닫기
  if ($('overlay-settings')) {
    $('overlay-settings').addEventListener('click', (e) => {
      if (e.target === $('overlay-settings')) _closeSettingsModal();
    });
  }

  // BGM 슬라이더 스와이프 조절
  if ($('slider-bgm-vol')) {
    $('slider-bgm-vol').addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if ($('text-bgm-vol')) $('text-bgm-vol').textContent = `${val}%`;
      Sound.setBgmVolume(val / 100);
      _updateSettingsMuteButtons(Sound.isBgmMuted(), Sound.isSfxMuted());
    });
  }

  // SFX 슬라이더 스와이프 조절
  if ($('slider-sfx-vol')) {
    let sfxDebounce = null;
    $('slider-sfx-vol').addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if ($('text-sfx-vol')) $('text-sfx-vol').textContent = `${val}%`;
      Sound.setSfxVolume(val / 100);
      _updateSettingsMuteButtons(Sound.isBgmMuted(), Sound.isSfxMuted());

      clearTimeout(sfxDebounce);
      sfxDebounce = setTimeout(() => Sound.playClick(), 80);
    });
  }

  // BGM 음소거 토글
  if ($('btn-toggle-bgm-mute')) {
    $('btn-toggle-bgm-mute').addEventListener('click', () => {
      const isMuted = Sound.toggleBgmMute();
      _updateSettingsMuteButtons(isMuted, Sound.isSfxMuted());
      showToast(isMuted ? '배경음악이 음소거되었습니다.' : '배경음악이 켜졌습니다.', 'info');
    });
  }

  // SFX 음소거 토글
  if ($('btn-toggle-sfx-mute')) {
    $('btn-toggle-sfx-mute').addEventListener('click', () => {
      const isMuted = Sound.toggleSfxMute();
      _updateSettingsMuteButtons(Sound.isBgmMuted(), isMuted);
      showToast(isMuted ? '효과음이 음소거되었습니다.' : '효과음이 켜졌습니다.', 'info');
      if (!isMuted) Sound.playClick();
    });
  }

  _initSettingsTabs();
  _initBugReportForm();
  _initSettingsReset();
  _applyGlobalSettings();

  // 전역 버튼 클릭 효과음 자동 연동
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, .btn, .sidebar-game-item, .room-game-btn, .baskin-pick-btn');
    if (btn && !btn.disabled && !btn.id?.includes('toggle') && !btn.id?.includes('ready') && !btn.id?.includes('settings')) {
      Sound.playClick();
    }
  }, true);

  /* =====================================================================
     1. 홈 화면: 유저 프로필, 사이드바 & 미리보기 연동
     ===================================================================== */
  // 🌟 레벨별 필요 경험치 계산 공식 (1 ~ 300 레벨)
  function _getRequiredExpForNextLevel(lvl) {
    const l = Number(lvl) || 1;
    if (l >= MAX_LEVEL) return 0; // 최고 레벨 도달 시 0
    return Math.floor(60 + (l - 1) * 20 + Math.pow(l - 1, 1.45) * 6);
  }

  // 🌟 레벨 구간별 티어 CSS 클래스 (브론즈, 실버, 골드, 플래티넘, 다이아몬드, 마스터, 300 만렙 무지개)
  function _getLevelTierClass(lvl) {
    const l = Number(lvl) || 1;
    if (l >= 300) return 'tier-rainbow'; // 🌟 300 만렙: 무지개
    if (l <= 30) return 'tier-bronze';
    if (l <= 70) return 'tier-silver';
    if (l <= 120) return 'tier-gold';
    if (l <= 180) return 'tier-platinum';
    if (l <= 240) return 'tier-diamond';
    return 'tier-master'; // 241 ~ 299: 마스터
  }

  // 🌟 로비 및 프로필 팝업 레벨 UI 동기화
  function _updateLevelUI() {
    const tierClass = _getLevelTierClass(myLevel);
    const reqExp = _getRequiredExpForNextLevel(myLevel);
    const isMax = myLevel >= MAX_LEVEL;
    const pct = isMax ? 100 : (reqExp > 0 ? Math.min(100, Math.max(0, Math.floor((myExp / reqExp) * 100))) : 0);

    // 1. 로비 상단바 레벨 뱃지 & 미니 게이지
    const homeLevelEl = $('home-user-level');
    if (homeLevelEl) {
      homeLevelEl.textContent = `${myLevel}`;
      homeLevelEl.className = `user-level-badge ${tierClass}`;
    }
    const homeExpFill = $('home-user-exp-fill');
    if (homeExpFill) {
      homeExpFill.style.width = `${pct}%`;
    }
    const homeExpTrack = $('home-user-exp-track');
    if (homeExpTrack) {
      homeExpTrack.title = isMax
        ? `최고 레벨 (Lv.${MAX_LEVEL} MAX)`
        : `Lv.${myLevel} 경험치: ${myExp.toLocaleString()} / ${reqExp.toLocaleString()} EXP (${pct}%)`;
    }

    // 2. 프로필 편집 말풍선 팝업 레벨 뱃지
    const profileTag = $('profile-level-tag');
    if (profileTag) {
      profileTag.textContent = `${myLevel}`;
      profileTag.className = `profile-mini-level ${tierClass}`;
    }
    const profileExpText = $('profile-exp-text');
    if (profileExpText) {
      profileExpText.textContent = isMax
        ? `MAX (${MAX_LEVEL})`
        : `${myExp.toLocaleString()} / ${reqExp.toLocaleString()} EXP`;
    }
    const profileExpFill = $('profile-exp-fill');
    if (profileExpFill) {
      profileExpFill.style.width = `${pct}%`;
    }
  }

  // 🌟 경험치 획득 및 레벨업 처리 (로컬스토리지, Supabase 및 대기방 P2P 동기화)
  function _addExperience(expGain) {
    const gain = Number(expGain) || 0;
    if (gain <= 0) {
      return {
        oldLevel: myLevel,
        newLevel: myLevel,
        gained: 0,
        leveledUp: false,
        currentExp: myExp,
        reqExp: _getRequiredExpForNextLevel(myLevel)
      };
    }

    const oldLevel = myLevel;
    if (myLevel < MAX_LEVEL) {
      myExp += gain;
      while (myLevel < MAX_LEVEL) {
        const req = _getRequiredExpForNextLevel(myLevel);
        if (myExp >= req) {
          myExp -= req;
          myLevel++;
        } else {
          break;
        }
      }
      if (myLevel >= MAX_LEVEL) {
        myExp = 0;
      }
    } else {
      myExp = 0;
    }

    const leveledUp = myLevel > oldLevel;

    localStorage.setItem('arcade_user_level', String(myLevel));
    localStorage.setItem('arcade_user_exp', String(myExp));
    _updateLevelUI();

    // Supabase 로그인 상태라면 클라우드 DB에 비동기 저장
    if (typeof AppSupabase !== 'undefined') {
      const user = AppSupabase.getCurrentUser();
      if (user && typeof AppSupabase.saveLevelAndExp === 'function') {
        AppSupabase.saveLevelAndExp(user.id, myLevel, myExp).catch(() => {});
      }
    }

    // P2P 룸 내 본인 객체 갱신 및 전파
    const myId = P2P.getMyId();
    const me = roomPlayers.find(p => p.id === myId || (p.isHost && isHostPlayer));
    if (me) {
      me.level = myLevel;
      me.exp = myExp;
      _updateRoomUI();
      if (isHostPlayer) {
        _broadcastRoomState();
      } else {
        P2P.send({
          type: 'guest_update_profile',
          name: myNickname,
          avatarIcon: myAvatarIcon,
          avatarColor: myAvatarColor,
          level: myLevel,
          exp: myExp,
          stats: _getMyStats()
        });
      }
    }

    return {
      oldLevel,
      newLevel: myLevel,
      gained: gain,
      leveledUp,
      currentExp: myExp,
      reqExp: _getRequiredExpForNextLevel(myLevel)
    };
  }

  // 🌟 게임별 진취도 및 승패에 따른 경험치 산출
  function _calcGameProgressionExp(gameKey, resultType, contextInfo = {}) {
    // 1. 기본 완주 경험치
    const baseExp = 30;

    // 2. 승패 보너스 (승리 50, 무승부 30, 패배 15)
    let outcomeExp = 15;
    if (resultType === 'win') {
      outcomeExp = 50;
    } else if (resultType === 'draw') {
      outcomeExp = 30;
    }

    // 3. 게임별 진취도 보너스 (5 ~ 35 EXP)
    let progressBonus = 20;
    if (gameKey === 'inu_quiz') {
      progressBonus = 25;
    } else if (gameKey === 'inu_study') {
      progressBonus = 30;
    } else if (gameKey === 'inu_draw') {
      progressBonus = 30;
    }
    return baseExp + outcomeExp + progressBonus;
  }

  /* ── 🌟 프로필/아바타 프레임 및 테두리 유틸리티 ── */
  function _getAvatarFrameClass(frame) {
    if (!frame || frame === 'default') return '';
    const clean = String(frame).replace(/^frame[-_]/, '');
    return `frame-${clean.replace(/_/g, '-')}`;
  }

  function _applyProfileCardTheme(el, theme) {
    if (!el || !el.classList) return;
    Array.from(el.classList).forEach(cls => {
      if (cls.startsWith('pcard-theme-')) el.classList.remove(cls);
    });
    if (theme && theme !== 'default') {
      const clean = String(theme).replace(/^pcard[-_]theme[-_]/, '');
      el.classList.add(`pcard-theme-${clean.replace(/_/g, '-')}`);
    }
  }

  function _applyAvatarFrame(el, frame) {
    if (!el || !el.classList) return;
    Array.from(el.classList).forEach(cls => {
      if (cls.startsWith('frame-')) el.classList.remove(cls);
    });
    const cls = _getAvatarFrameClass(frame);
    if (cls) el.classList.add(cls);
  }

  function _applyCosmeticsToAllUI() {
    _updateHomeUserBar();
  }

  function _triggerVictoryEffect(effectId) {
    if (typeof Sound !== 'undefined' && Sound.playWin) Sound.playWin();
  }

  function _stopVictoryEffect() {
    // 승리 이펙트 정지 훅
  }

  function _updateHomeUserBar() {
    const userBar = document.querySelector('.home-user-bar');
    if (userBar) _applyProfileCardTheme(userBar, myProfileCard);

    const avatarEl = $('home-user-avatar');
    if (avatarEl) {
      avatarEl.innerHTML = `<i class="${myAvatarIcon || 'fa-solid fa-paw'}"></i>`;
      avatarEl.style.background = myAvatarColor || '#38a169';
      if (typeof _applyAvatarFrame === 'function') _applyAvatarFrame(avatarEl, myAvatarFrame);
    }
    const nameEl = $('home-user-name');
    if (nameEl) {
      nameEl.textContent = myNickname || '익명';
      if (myNicknameColor === 'rainbow') {
        nameEl.classList.add('nickname-rainbow');
        nameEl.style.color = '';
        nameEl.style.fontWeight = '900';
      } else {
        nameEl.classList.remove('nickname-rainbow');
        nameEl.style.color = myNicknameColor || '';
        nameEl.style.fontWeight = myNicknameColor ? '800' : '';
      }
    }
    _updateLevelUI();
    if (typeof _syncOnlinePresence === 'function') _syncOnlinePresence();
  }

  /* ── 🌐 Firebase 실시간 글로벌 로비 목록 (전체 / 공개방 / 비밀방 탭 필터링 & 게임별 필터) ── */
  let _currentLobbyTab = 'all'; // 'all' | 'public' | 'private'
  let _selectedLobbyGameFilter = 'all'; // 'all' | gameKey
  let _latestLobbyRoomsData = null;
  let _refreshLobbyCooldown = false;

  function _initFirebaseLobby() {
    const tabAll = $('tab-lobby-all');
    const tabPublic = $('tab-lobby-public');
    const tabPrivate = $('tab-lobby-private');

    const tabs = [
      { el: tabAll, type: 'all' },
      { el: tabPublic, type: 'public' },
      { el: tabPrivate, type: 'private' }
    ];

    // 탭 클릭 이벤트 리스너 통합 등록
    tabs.forEach(({ el, type }) => {
      if (el) {
        el.addEventListener('click', () => {
          if (_currentLobbyTab === type) return;
          _currentLobbyTab = type;

          // 클릭한 탭만 active 추가, 나머지는 제거
          tabs.forEach(t => t.el && t.el.classList.toggle('active', t.type === type));

          _renderLobbyRooms(_latestLobbyRoomsData);
          if (typeof Sound !== 'undefined' && Sound.playClick) Sound.playClick();
        });
      }
    });

    // 게임별 필터 드롭다운 옵션 동적 채우기 & 이벤트
    const gameFilterEl = $('lobby-game-filter');
    if (gameFilterEl) {
      gameFilterEl.innerHTML = '<option value="all">모든 게임</option>';
      Object.keys(GAMES).forEach(gKey => {
        const opt = document.createElement('option');
        opt.value = gKey;
        opt.textContent = GAMES[gKey].title;
        gameFilterEl.appendChild(opt);
      });
      gameFilterEl.addEventListener('change', (e) => {
        _selectedLobbyGameFilter = e.target.value;
        _renderLobbyRooms(_latestLobbyRoomsData);
      });
    }

    if (window.FirebaseLobby && typeof window.FirebaseLobby.onLobbyUpdate === 'function') {
      window.FirebaseLobby.onLobbyUpdate(_renderLobbyRooms);
    } else {
      window.addEventListener('firebase-ready', () => {
        if (window.FirebaseLobby) {
          window.FirebaseLobby.onLobbyUpdate(_renderLobbyRooms);
        }
      }, { once: true });
    }
  }

  function _renderLobbyRooms(roomsData) {
    _latestLobbyRoomsData = roomsData;
    const listEl = $('lobby-room-list');
    if (!listEl) return;

    const isLockRoom = (room) => {
      return !!room.isPrivate || !!room.hasPassword || String(room.isPrivate) === 'true' || String(room.hasPassword) === 'true';
    };

    // 탭 종류별 안내 메시지 반환
    const getEmptyText = () => {
      if (_selectedLobbyGameFilter && _selectedLobbyGameFilter !== 'all') {
        const gDef = GAMES[_selectedLobbyGameFilter];
        const gTitle = gDef ? gDef.title : _selectedLobbyGameFilter;
        return `현재 열려있는 [${gTitle}] 방이 없습니다.<br>직접 방을 만들어 플레이어를 모집해 보세요!`;
      }
      if (_currentLobbyTab === 'public') return '현재 열려있는 공개방이 없습니다.<br>새로운 방을 직접 만들어 보세요!';
      if (_currentLobbyTab === 'private') return '현재 열려있는 비밀방이 없습니다.<br>비밀방을 직접 만들어 친구를 초대해 보세요!';
      return '현재 열려있는 방이 없습니다.<br>새로운 방을 직접 만들어 보세요!';
    };

    if (!roomsData || typeof roomsData !== 'object' || Object.keys(roomsData).length === 0) {
      listEl.classList.add('is-empty');
      listEl.innerHTML = `
        <div class="lobby-empty">
          <i class="fa-regular fa-compass"></i>
          <p>${getEmptyText()}</p>
        </div>
      `;
      return;
    }

    const now = Date.now();
    const allEntries = Object.entries(roomsData)
      .filter(([code, room]) => {
        if (!room || typeof room !== 'object') return false;
        // 1. 호스트 정보(Peer ID 또는 호스트 닉네임)가 전혀 없는 유령 방 제외
        if (!room.hostPeerId && !room.hostName) return false;
        // 2. 45초 이상 무응답 하트비트 또는 6시간 이상 경과한 방 제외
        if (room.lastSeen && (now - room.lastSeen > 45000)) return false;
        if (room.createdAt && (now - room.createdAt > 6 * 60 * 60 * 1000)) return false;
        return true;
      })
      .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

    // 🌟 탭에 따라 전체 / 공개방 / 비밀방 필터링 및 게임별 필터링
    const roomEntries = allEntries.filter(([code, room]) => {
      const lock = isLockRoom(room);
      if (_currentLobbyTab === 'public' && lock) return false;
      if (_currentLobbyTab === 'private' && !lock) return false;
      if (_selectedLobbyGameFilter && _selectedLobbyGameFilter !== 'all') {
        const rGame = (room.game || room.selectedGame || 'inu_quiz').toLowerCase();
        if (rGame !== _selectedLobbyGameFilter.toLowerCase()) return false;
      }
      return true;
    });

    if (roomEntries.length === 0) {
      listEl.classList.add('is-empty');
      listEl.innerHTML = `
        <div class="lobby-empty">
          <i class="fa-regular fa-compass"></i>
          <p>${getEmptyText()}</p>
        </div>
      `;
      return;
    }

    listEl.classList.remove('is-empty');
    listEl.innerHTML = '';
    roomEntries.forEach(([code, room]) => {
      const pCount = room.playerCount || 1;
      const maxP = room.maxPlayers || 5;
      const isFull = pCount >= maxP;
      const isPlaying = room.status === 'playing';
      const isLock = isLockRoom(room);

      const isMyHostedRoom = (room.hostPeerId && room.hostPeerId === P2P.getMyId()) || (room.hostName === myNickname);
      const hostLevel = isMyHostedRoom ? myLevel : (room.hostLevel || 1);
      const hostTierClass = _getLevelTierClass(hostLevel);
      const hostCardTheme = isMyHostedRoom ? myProfileCard : (room.hostProfileCard || 'default');
      const hostCardThemeClass = (hostCardTheme && hostCardTheme !== 'default') ? `pcard-theme-${hostCardTheme}` : '';
      const hostNameColor = isMyHostedRoom ? myNicknameColor : (room.hostNameColor || null);

      const roomGameKey = room.game || room.selectedGame || 'inu_quiz';
      const gameDef = GAMES[roomGameKey];
      const gameTitle = gameDef ? gameDef.title : '오목';

      const card = document.createElement('div');
      card.className = `lobby-room-card ${isPlaying ? 'is-playing' : (isFull ? 'is-full' : '')}`;
      card.innerHTML = `
        <div class="lrc-top">
          <div class="lrc-badge-group">
            <span class="lrc-code-badge"><i class="fa-solid fa-hashtag"></i> ${code}</span>
            <span class="lrc-game-badge" style="background:rgba(59,130,246,0.1);color:var(--primary);font-size:0.75rem;padding:3px 8px;border-radius:6px;font-weight:800;"><i class="fa-solid fa-gamepad"></i> ${gameTitle}</span>
            ${isLock ? '<span class="lrc-lock-badge"><i class="fa-solid fa-lock"></i> 비밀방</span>' : ''}
            <span class="lrc-status-badge ${isPlaying ? 'playing' : (isFull ? 'full' : 'waiting')}">
              ${isPlaying ? '<i class="fa-solid fa-gamepad"></i> 진행 중' : (isFull ? '<i class="fa-solid fa-user-lock"></i> 만원' : '<i class="fa-solid fa-door-open"></i> 대기 중')}
            </span>
          </div>
          <span class="lrc-count-badge"><i class="fa-solid fa-users"></i> ${pCount}/${maxP}명</span>
        </div>
        <div class="lrc-row-bottom">
          <div class="lrc-host-info ${hostCardThemeClass}">
            <div class="user-avatar-wrap">
              <div class="lrc-host-avatar" style="background:${room.hostAvatarColor || '#38a169'};"><i class="${room.hostAvatarIcon || 'fa-solid fa-paw'}"></i></div>
              <span class="user-level-badge sm ${hostTierClass}">${hostLevel}</span>
            </div>
            <div class="lrc-host-meta">
              <strong class="lrc-host-name" style="${hostNameColor ? `color:${hostNameColor} !important; font-weight:800;` : ''}">${_escapeHtml(room.hostName || '익명')} <i class="fa-solid fa-crown" style="color:var(--yellow);font-size:0.75rem;"></i></strong>
            </div>
          </div>
          <button type="button" class="btn ${isPlaying ? 'btn-danger is-playing-btn' : 'btn-primary'} btn-sm lrc-join-btn ${isFull ? 'disabled' : ''}">
            <span>${isPlaying ? '진행 중 | 관전' : (isFull ? '마감' : (isLock ? '비밀번호' : '입장'))}</span>
            <i class="fa-solid ${isLock ? 'fa-lock' : 'fa-arrow-right-to-bracket'}"></i>
          </button>
        </div>
      `;

      card.addEventListener('click', () => {
        if (currentRoomCode === code && (screens.room.classList.contains('active') || screens.game.classList.contains('active'))) {
          showToast('이미 참가 중인 방입니다.', 'info');
          return;
        }
        if (isFull) {
          showToast('해당 방은 정원이 가득 찼습니다.', 'warn');
          return;
        }
        if (isLock) {
          _openPasswordJoinModal(code);
        } else {
          _startJoinRoom(code);
        }
      });

      listEl.appendChild(card);
    });
  }

  // 로비 새로고침 버튼 애니메이션 & 쿨다운
  const refreshLobbyBtn = $('btn-refresh-lobby');
  if (refreshLobbyBtn) {
    refreshLobbyBtn.addEventListener('click', () => {
      if (_refreshLobbyCooldown) return;
      _refreshLobbyCooldown = true;

      refreshLobbyBtn.classList.add('spinning');
      setTimeout(() => {
        refreshLobbyBtn.classList.remove('spinning');
      }, 600);
      setTimeout(() => {
        _refreshLobbyCooldown = false;
      }, 1000);

      _renderLobbyRooms(_latestLobbyRoomsData);
      showToast('방 목록을 새로고침했습니다.', 'info');
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     🌟 Supabase Realtime 기반 사이트 접속 중인 사용자 (Online Users Presence)
  ═══════════════════════════════════════════════════════════════ */
  let _lastOnlineUsers = [];

  function _getMyPresencePayload() {
    const user = (typeof AppSupabase !== 'undefined') ? AppSupabase.getCurrentUser() : null;
    return {
      id: P2P.getMyId() || ('usr_' + Math.random().toString(36).substring(2, 9)),
      supabaseId: user ? user.id : null,
      name: myNickname || '플레이어',
      nameColor: myNicknameColor || null,
      profileCard: myProfileCard || 'default',
      avatarIcon: myAvatarIcon || 'fa-solid fa-dog',
      avatarColor: myAvatarColor || '#38a169',
      avatarFrame: myAvatarFrame || 'default',
      chatBubble: myChatBubble || 'default',
      victoryEffect: myVictoryEffect || 'default',
      level: myLevel || 1,
      exp: myExp || 0,
      stats: _getMyStats()
    };
  }

  function _syncOnlinePresence() {
    const payload = _getMyPresencePayload();
    if (window.FirebaseLobby && typeof window.FirebaseLobby.updateOnlineUser === 'function') {
      window.FirebaseLobby.updateOnlineUser(payload);
    }
    if (typeof AppSupabase !== 'undefined' && typeof AppSupabase.updatePresence === 'function') {
      AppSupabase.updatePresence(payload);
    }
  }

  function _initOnlineUsersPresence() {
    const initialPayload = _getMyPresencePayload();
    _renderOnlineUsersList([initialPayload]);

    // 1. Firebase Realtime Database 실시간 연동 (방 목록과 동일한 WebSocket 푸시)
    const _setupFirebaseOnline = () => {
      if (window.FirebaseLobby && typeof window.FirebaseLobby.registerOnlineUser === 'function') {
        window.FirebaseLobby.registerOnlineUser(_getMyPresencePayload());
        window.FirebaseLobby.onOnlineUsersUpdate((users) => {
          if (Array.isArray(users) && users.length > 0) {
            _lastOnlineUsers = users;
            _renderOnlineUsersList(_lastOnlineUsers);
          } else if (users === null) {
            // Firebase 오류 시 fallback
          } else {
            _lastOnlineUsers = [_getMyPresencePayload()];
            _renderOnlineUsersList(_lastOnlineUsers);
          }
        });
      }
    };

    if (window.FirebaseLobby && typeof window.FirebaseLobby.registerOnlineUser === 'function') {
      _setupFirebaseOnline();
    } else {
      window.addEventListener('firebase-ready', () => {
        _setupFirebaseOnline();
      }, { once: true });
    }

    // 2. Supabase Realtime 보조 연동 (Firebase 미응답 시 fallback)
    if (typeof AppSupabase !== 'undefined' && typeof AppSupabase.initPresence === 'function') {
      AppSupabase.initPresence(_getMyPresencePayload(), (users) => {
        if (!_lastOnlineUsers || _lastOnlineUsers.length <= 1) {
          if (Array.isArray(users) && users.length > 0) {
            _lastOnlineUsers = users;
            _renderOnlineUsersList(_lastOnlineUsers);
          }
        }
      });
    }

    // 3. 접속자 수동 새로고침 버튼 바인딩 (무한 회전 버그 방지: 타이머 즉시 보장)
    const btnRefresh = $('btn-refresh-online-users');
    if (btnRefresh && !btnRefresh.dataset.bound) {
      btnRefresh.dataset.bound = 'true';
      btnRefresh.addEventListener('click', async () => {
        btnRefresh.classList.add('rotating');
        setTimeout(() => {
          btnRefresh.classList.remove('rotating');
        }, 600);

        try {
          if (typeof _syncOnlinePresence === 'function') _syncOnlinePresence();
          if (window.FirebaseLobby && typeof window.FirebaseLobby.refreshOnlineUsers === 'function') {
            const fbUsers = await window.FirebaseLobby.refreshOnlineUsers();
            _lastOnlineUsers = Array.isArray(fbUsers) && fbUsers.length > 0 ? fbUsers : [_getMyPresencePayload()];
            _renderOnlineUsersList(_lastOnlineUsers);
          } else if (typeof AppSupabase !== 'undefined' && typeof AppSupabase.refreshPresence === 'function') {
            await AppSupabase.refreshPresence();
          }
          showToast('접속자 목록을 새로고침했습니다.', 'info');
        } catch (err) {
          console.warn('[OnlineUsers] 새로고침 실패:', err);
        }
      });
    }
  }

  function _renderOnlineUsersList(users) {
    const listEl = $('online-users-list');
    const countEl = $('online-users-count');
    if (!listEl) return;

    let myPresenceKey = null;
    try { myPresenceKey = sessionStorage.getItem('inu_presence_key'); } catch (_) {}
    const mySupabaseId = (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) ? AppSupabase.getCurrentUser().id : null;
    const myPayload = _getMyPresencePayload();

    // 1. 원본 목록에서 내 세션(presenceKey 또는 supabaseId)을 찾아 항상 최신의 로컬 상태(myPayload)로 강제 동기화
    let hasMe = false;
    const listWithMe = (Array.isArray(users) ? users : []).map(u => {
      const isMe = (myPresenceKey && u.presenceKey === myPresenceKey) ||
                   (mySupabaseId && u.supabaseId === mySupabaseId) ||
                   (!mySupabaseId && !u.supabaseId && myPresenceKey && u.presenceKey === myPresenceKey);
      if (isMe) {
        hasMe = true;
        return { ...myPayload, presenceKey: myPresenceKey || u.presenceKey };
      }
      return u;
    });

    if (!hasMe) {
      listWithMe.push({ ...myPayload, presenceKey: myPresenceKey });
    }

    // 2. 접속자 목록 중복 제거 (presenceKey 또는 supabaseId 또는 id 기준)
    const seen = new Set();
    const uniqueUsers = [];
    for (const u of listWithMe) {
      const key = u.presenceKey || (u.supabaseId ? 'sb_' + u.supabaseId : (u.id || u.name));
      if (!seen.has(key)) {
        seen.add(key);
        uniqueUsers.push(u);
      }
    }

    // 3. '내 프로필'을 항상 최상단에 고정하고, 나머지 플레이어는 레벨 내림차순 정렬
    const list = uniqueUsers.sort((a, b) => {
      const isMeA = (myPresenceKey && a.presenceKey === myPresenceKey) ||
                    (mySupabaseId && a.supabaseId === mySupabaseId) ||
                    (a.name === myNickname);
      const isMeB = (myPresenceKey && b.presenceKey === myPresenceKey) ||
                    (mySupabaseId && b.supabaseId === mySupabaseId) ||
                    (b.name === myNickname);
      if (isMeA && !isMeB) return -1;
      if (!isMeA && isMeB) return 1;

      const lvlA = typeof a.level === 'number' ? a.level : 1;
      const lvlB = typeof b.level === 'number' ? b.level : 1;
      return lvlB - lvlA;
    });

    if (countEl) countEl.textContent = `${list.length}명`;
    const topbarCount = $('topbar-online-count');
    if (topbarCount) topbarCount.textContent = `접속 중 ${list.length}명`;

    listEl.innerHTML = list.map((user, idx) => {
      const isMe = (myPresenceKey && user.presenceKey === myPresenceKey) ||
                   (mySupabaseId && user.supabaseId === mySupabaseId) ||
                   (user.name === myNickname);

      // 내 자신은 항상 실시간 로컬 최신 프로필로 렌더링 (새로고침 시 과거 잔여 데이터 노출 방지)
      const uname = isMe ? myNickname : (user.name || '플레이어');
      const unameColor = isMe ? myNicknameColor : (user.nameColor || '');
      const uicon = isMe ? myAvatarIcon : (user.avatarIcon || 'fa-solid fa-dog');
      const ucolor = isMe ? myAvatarColor : (user.avatarColor || '#38a169');
      const ulevel = isMe ? myLevel : (user.level || 1);
      const tierClass = _getLevelTierClass(ulevel);
      const ucard = isMe ? myProfileCard : (user.profileCard || 'default');
      const cardThemeClass = (ucard && ucard !== 'default') ? `pcard-theme-${ucard}` : '';
      const uframe = isMe ? myAvatarFrame : (user.avatarFrame || 'default');
      const frameClass = _getAvatarFrameClass(uframe);

      return `
        <div class="online-user-item ${cardThemeClass} ${isMe ? 'is-me' : ''}" data-idx="${idx}" title="${_escapeHtml(uname)}">
          <div class="user-avatar-wrap">
            <div class="user-avatar sm ${frameClass}" style="background: ${ucolor};">
              <i class="${uicon}"></i>
            </div>
            <span class="user-level-badge ${tierClass}">${ulevel}</span>
          </div>
          <div class="online-user-info">
            <span class="online-user-name ${unameColor === 'rainbow' ? 'nickname-rainbow' : ''}" style="${unameColor && unameColor !== 'rainbow' ? `color:${unameColor} !important; font-weight:800;` : ''}">
              ${_escapeHtml(uname)}
              ${isMe ? '<span class="online-me-badge">나</span>' : ''}
            </span>
            <span class="online-user-sub">Lv.${ulevel}</span>
          </div>
        </div>
      `;
    }).join('');

  }

  /* ── 💬 로비 전체 실시간 채팅방 ── */
  function _initLobbyChat() {
    const form = $('lobby-chat-form');
    const input = $('lobby-chat-input');
    const messagesContainer = $('lobby-chat-messages');
    if (!form || !input || !messagesContainer) return;

    if (typeof AppSupabase !== 'undefined' && typeof AppSupabase.initLobbyChat === 'function') {
      AppSupabase.initLobbyChat((msg) => {
        _appendLobbyChatMessage(msg, false);
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const rawText = input.value ? input.value.trim() : '';
      if (!rawText) return;

      const text = rawText.slice(0, 80);
      input.value = '';

      let myKey = null;
      try { myKey = sessionStorage.getItem('inu_presence_key'); } catch (_) {}
      if (!myKey) myKey = 'usr_' + Math.random().toString(36).substring(2, 8);

      const msgPayload = {
        id: 'lchat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: myNickname || '플레이어',
        nameColor: myNicknameColor || null,
        avatarIcon: myAvatarIcon || 'fa-solid fa-dog',
        avatarColor: myAvatarColor || '#38a169',
        avatarFrame: myAvatarFrame || 'default',
        chatBubble: myChatBubble || 'default',
        level: myLevel || 1,
        text: text,
        senderKey: myKey,
        timestamp: Date.now()
      };

      // 보낸 즉시 로컬 화면에 표시
      _appendLobbyChatMessage(msgPayload, true);

      // 모바일 채팅 뱃지 해제
      const badge = $('lobby-mobile-chat-badge');
      if (badge) badge.classList.add('hidden');

      // Supabase Broadcast로 접속 중인 모든 사용자에게 전송
      if (typeof AppSupabase !== 'undefined' && typeof AppSupabase.sendLobbyChatMessage === 'function') {
        AppSupabase.sendLobbyChatMessage(msgPayload);
      }
    });

    // ── 📱 모바일 로비 채팅 팝업 바텀시트 제어 ──
    function _openLobbyMobileChat() {
      _pushHistory({ modal: 'lobby_chat' }, '#lobby_chat');
      const chatCard = $('lobby-chat-card');
      const backdrop = $('lobby-mobile-chat-backdrop');
      const badge = $('lobby-mobile-chat-badge');
      const longBadge = $('lobby-long-chat-badge');
      const actionBadge = $('mobile-lobby-chat-badge');
      if (chatCard) chatCard.classList.add('mobile-open');
      if (backdrop) backdrop.classList.remove('hidden');
      if (badge) badge.classList.add('hidden');
      if (longBadge) longBadge.classList.add('hidden');
      if (actionBadge) actionBadge.classList.add('hidden');
      const input = $('lobby-chat-input');
      if (input && window.innerWidth > 960) setTimeout(() => input.focus(), 150);
      const box = $('lobby-chat-messages');
      if (box) {
        box.scrollTop = box.scrollHeight;
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => { if (box) box.scrollTop = box.scrollHeight; });
        }
      }
    }

    function _closeLobbyMobileChat() {
      if (_backHistoryIfModal('lobby_chat')) return;
      const chatCard = $('lobby-chat-card');
      const backdrop = $('lobby-mobile-chat-backdrop');
      if (chatCard) chatCard.classList.remove('mobile-open');
      if (backdrop) backdrop.classList.add('hidden');
    }

    if ($('btn-lobby-mobile-chat-toggle')) $('btn-lobby-mobile-chat-toggle').addEventListener('click', _openLobbyMobileChat);
    if ($('btn-lobby-long-chat')) $('btn-lobby-long-chat').addEventListener('click', _openLobbyMobileChat);
    if ($('btn-mobile-lobby-chat')) $('btn-mobile-lobby-chat').addEventListener('click', _openLobbyMobileChat);
    if ($('btn-close-lobby-mobile-chat')) $('btn-close-lobby-mobile-chat').addEventListener('click', _closeLobbyMobileChat);
    if ($('lobby-mobile-chat-backdrop')) $('lobby-mobile-chat-backdrop').addEventListener('click', _closeLobbyMobileChat);
  }

  function _appendLobbyChatMessage(msg, isLocal) {
    const box = $('lobby-chat-messages');
    if (!box || !msg || !msg.text) return;

    // 첫 메시지 전송 시 환영 메시지 안내 제거
    const welcomeEl = box.querySelector('.lobby-chat-welcome');
    if (welcomeEl) {
      welcomeEl.remove();
    }

    let myKey = null;
    try { myKey = sessionStorage.getItem('inu_presence_key'); } catch (_) {}
    const isMe = isLocal || (myKey && msg.senderKey === myKey) || (msg.name === myNickname);

    // 모바일에서 채팅창이 닫혀 있을 때 새 메시지 뱃지 표시
    if (window.innerWidth <= 960 && !isMe) {
      const chatCard = $('lobby-chat-card');
      if (chatCard && !chatCard.classList.contains('mobile-open')) {
        const badge = $('lobby-mobile-chat-badge');
        if (badge) badge.classList.remove('hidden');
        const longBadge = $('lobby-long-chat-badge');
        if (longBadge) longBadge.classList.remove('hidden');
        const actionBadge = $('mobile-lobby-chat-badge');
        if (actionBadge) actionBadge.classList.remove('hidden');
      }
    }

    const uname = msg.name || '플레이어';
    const unameColor = isMe ? myNicknameColor : (msg.nameColor || '');
    const uicon = isMe ? myAvatarIcon : (msg.avatarIcon || 'fa-solid fa-dog');
    const ucolor = isMe ? myAvatarColor : (msg.avatarColor || '#38a169');
    const ulevel = isMe ? myLevel : (typeof msg.level === 'number' ? msg.level : 1);
    const tierClass = _getLevelTierClass(ulevel);
    const textSafe = _escapeHtml(msg.text);

    const uframe = isMe ? myAvatarFrame : (msg.avatarFrame || 'default');
    const frameClass = _getAvatarFrameClass(uframe);

    const msgEl = document.createElement('div');
    msgEl.className = `lobby-chat-msg ${isMe ? 'is-me' : ''}`;
    msgEl.innerHTML = `
      <span class="lobby-chat-prefix">
        <span class="lobby-chat-bracket">[</span><span class="lobby-chat-avatar ${frameClass}" style="background: ${ucolor};"><i class="${uicon}"></i></span><span class="lobby-chat-lvl ${tierClass}">${ulevel}</span><span class="lobby-chat-name ${unameColor === 'rainbow' ? 'nickname-rainbow' : ''}" style="${unameColor && unameColor !== 'rainbow' ? `color:${unameColor}; font-weight:800;` : ''}" title="${_escapeHtml(uname)}">${_escapeHtml(uname)}</span><span class="lobby-chat-bracket">]</span>
      </span>
      <span class="lobby-chat-colon">:</span>
      <span class="lobby-chat-text">${textSafe}</span>
    `;

    box.appendChild(msgEl);

    // 메시지 최대 150개 유지
    while (box.children.length > 150) {
      box.removeChild(box.firstChild);
    }

    // 새 메시지 시 하단으로 자동 스크롤
    box.scrollTop = box.scrollHeight;
  }

  /* ── 👑 참가자 프로필 & 방장 관리 드롭다운 (전적 보기 / 강퇴) ── */
  function _openPlayerActionMenu(e, targetPlayer) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!targetPlayer) return;

    const myId = P2P.getMyId();
    const amIHost = P2P.isHost() || isHostPlayer || isDevMode;
    const isMe = (targetPlayer.id === myId) || (targetPlayer.isHost && amIHost);

    // 만약 나 자신이거나 방장이 아니거나 대상이 방장인 경우 관리 메뉴 표시 안 함
    if (isMe || !amIHost || targetPlayer.isHost) {
      return;
    }

    selectedTargetPlayer = targetPlayer;
    const dropdown = $('host-action-dropdown');
    const nameEl = $('host-action-target-name');
    const btnKick = $('btn-host-kick');
    if (!dropdown || !nameEl) return;

    nameEl.textContent = `${targetPlayer.name}님`;

    if (btnKick) {
      btnKick.style.display = 'flex';
    }
    const btnTransfer = $('btn-host-transfer');
    if (btnTransfer) {
      btnTransfer.style.display = 'flex';
    }

    dropdown.classList.remove('hidden');

    // 마우스/클릭 타겟 위치 기반 최적 포지셔닝
    const targetEl = e.currentTarget || e.target;
    const rect = targetEl.getBoundingClientRect();
    const dropdownWidth = 160;
    const dropdownHeight = 90;

    let left = rect.right - dropdownWidth;
    let top = rect.bottom + 6;

    if (left < 10) left = 10;
    if (left + dropdownWidth > window.innerWidth - 10) left = window.innerWidth - dropdownWidth - 10;
    if (top + dropdownHeight > window.innerHeight - 10) top = rect.top - dropdownHeight - 6;

    dropdown.style.left = `${left}px`;
    dropdown.style.top = `${top}px`;
  }

  // 기존 호환성 유지 alias
  const _openHostActionMenu = _openPlayerActionMenu;

  function _closeHostActionMenu() {
    const dropdown = $('host-action-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
    selectedTargetPlayer = null;
  }

  // 드롭다운 바깥 클릭 또는 ESC 키 입력 시 닫기
  document.addEventListener('click', (e) => {
    const dropdown = $('host-action-dropdown');
    if (dropdown && !dropdown.classList.contains('hidden')) {
      if (!dropdown.contains(e.target)) {
        _closeHostActionMenu();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      _closeHostActionMenu();
    }
  });

  window.addEventListener('resize', _closeHostActionMenu);
  window.addEventListener('scroll', _closeHostActionMenu, true);

  // [강퇴하기] 버튼 클릭
  if ($('btn-host-kick')) {
    $('btn-host-kick').addEventListener('click', async () => {
      if ((!P2P.isHost() && !isDevMode) || !selectedTargetPlayer) return;
      const target = selectedTargetPlayer;
      _closeHostActionMenu();

      if (isDevMode && target.id !== 'dev-player') {
        _removeDevBotPlayer(target.id);
        return;
      }

      const ok = await showConfirmDialog({
        title: '참가자 강퇴',
        message: `${target.name}님을 정말 강퇴하시겠습니까?`,
        confirmText: '강퇴',
        cancelText: '취소',
        icon: 'fa-solid fa-user-xmark',
        isDanger: true
      });
      if (ok) {
        // 대상 게스트에게 KICK 패킷 전송
        P2P.send({
          type: 'KICK',
          targetId: target.id,
          reason: '방장에 의해 강퇴되었습니다.'
        }, target.id);

        // P2P 연결 강제 종료
        if (typeof P2P.kickGuest === 'function') {
          P2P.kickGuest(target.id);
        }

        // 방장 측 로컬 퇴장 처리
        _onHostGuestLeave(target.id);
        showToast(`${target.name}님을 강퇴했습니다.`, 'warn');
      }
    });
  }

  // [방장 위임] 버튼 클릭
  if ($('btn-host-transfer')) {
    $('btn-host-transfer').addEventListener('click', async () => {
      const amIHost = P2P.isHost() || isHostPlayer;
      if (!amIHost || !selectedTargetPlayer) return;
      const target = selectedTargetPlayer;
      _closeHostActionMenu();

      const ok = await showConfirmDialog({
        title: '방장 위임',
        message: `${target.name}님에게 방장을 위임하시겠습니까?`,
        confirmText: '위임',
        cancelText: '취소',
        icon: 'fa-solid fa-crown',
        isDanger: false
      });
      if (ok) {
        _transferHostToPlayer(target);
      }
    });
  }

  /* =====================================================================
     방장 위임 및 자동 승격/인계 로직
     ===================================================================== */
  function _reorderRoomPlayersWithHostFirst() {
    roomPlayers.sort((a, b) => {
      if (a.isHost && !b.isHost) return -1;
      if (!a.isHost && b.isHost) return 1;
      return 0;
    });
  }

  async function _transferHostToPlayer(target) {
    if (!selectedTargetPlayer && !target) return;
    const targetPlayer = target || selectedTargetPlayer;
    const targetId = targetPlayer.id;
    const targetName = targetPlayer.name;
    const roomCode = currentRoomCode;

    if (!roomPlayers.some(p => p.id === targetId || p.name === targetName)) {
      showToast('해당 참가자가 이미 퇴장했습니다.', 'warn');
      return;
    }

    console.log('[Host] 방장 위임 절차 개시 ->', targetName, targetId, roomCode);
    _isMigratingHost = true;

    // 1. Firebase에서 구 방장의 onDisconnect 방 삭제 훅 해제
    if (window.FirebaseLobby && typeof window.FirebaseLobby.cancelRoomOnDisconnect === 'function') {
      try {
        await window.FirebaseLobby.cancelRoomOnDisconnect(roomCode);
      } catch (e) {
        console.warn('[Host] cancelRoomOnDisconnect 경고:', e);
      }
    }

    // 2. 인게임 중이었다면 게임 모듈 종료 및 대기실 상태로 초기화
    if (currentGameModule) {
      try { currentGameModule.destroy(); } catch (_) {}
      currentGameModule = null;
    }
    if ($('game-content')) $('game-content').innerHTML = '';
    const overlayCount = $('overlay-countdown');
    if (overlayCount) overlayCount.classList.add('hidden');
    const overlayRes = $('overlay-game-result');
    if (overlayRes) overlayRes.classList.add('hidden');
    isRoomGameActive = false;
    activeGamePlayers = [];

    // 3. 모든 참가자들에게 방장 위임 패킷 전송
    try {
      P2P.send({
        type: 'DELEGATE_HOST',
        targetHostId: targetId,
        targetHostName: targetName,
        roomCode: roomCode,
        oldHostLeft: false,
        oldHostId: P2P.getMyId(),
        oldHostName: myNickname
      });
    } catch (e) {
      console.error('[Host] DELEGATE_HOST 전송 실패:', e);
    }

    // 4. 구 방장: 호스트 연결 종료 후 일반 게스트로 재접속 준비
    showToast(`${targetName}님에게 방장을 위임했습니다. 게스트로 재접속 중...`, 'info');
    _appendChatMessage({ isSystem: true, text: `👑 ${myNickname}님이 ${targetName}님에게 방장을 위임했습니다.` });

    P2P.destroy();
    isHostPlayer = false;
    isMyReady = false;

    // roomPlayers 내 방장 권한 인계 반영
    roomPlayers.forEach(p => {
      if (p.id === targetId || p.name === targetName) {
        p.isHost = true;
        p.isReady = true;
      } else {
        p.isHost = false;
        p.isReady = false;
      }
    });
    _reorderRoomPlayersWithHostFirst();
    _enterRoomScreen(false);

    // 새 방장이 PeerJS 호스트를 선점할 시간 대기 후 게스트로 재접속
    setTimeout(() => {
      _reconnectAsGuest(roomCode, targetName);
    }, 1000);
  }

  async function _promoteToHost(roomCode, oldHostLeft = false, oldHostInfo = null) {
    showLoading('방장 권한을 인계받아 방을 설정하는 중입니다...');
    _isMigratingHost = true;
    isHostPlayer = true;
    isMyReady = true;

    try {
      // 1. 인게임 정리
      if (currentGameModule) {
        try { currentGameModule.destroy(); } catch (_) {}
        currentGameModule = null;
      }
      if ($('game-content')) $('game-content').innerHTML = '';
      const overlayCount = $('overlay-countdown');
      if (overlayCount) overlayCount.classList.add('hidden');
      const overlayRes = $('overlay-game-result');
      if (overlayRes) overlayRes.classList.add('hidden');
      isRoomGameActive = false;
      activeGamePlayers = [];

      // 2. roomPlayers 정리 (구 방장 퇴장 시 제거, 잔류 시 게스트로 변경)
      if (oldHostLeft) {
        roomPlayers = roomPlayers.filter(p => !p.isHost && (oldHostInfo ? (p.name !== oldHostInfo.name && p.id !== oldHostInfo.id) : true));
      } else {
        roomPlayers.forEach(p => {
          if (p.isHost) {
            p.isHost = false;
            p.isReady = false;
          }
        });
      }

      // 3. 기존 방 코드로 호스트 선점 (unavailable-id 재시도 백오프 내장)
      currentRoomCode = await P2P.host(
        _onHostGuestJoin,
        _onHostGuestLeave,
        roomCode
      );

      // 4. 내 플레이어 엔트리를 방장으로 설정
      const myPeerId = P2P.getMyId();
      let myEntry = roomPlayers.find(p => p.name === myNickname);
      if (myEntry) {
        myEntry.id = myPeerId;
        myEntry.isHost = true;
        myEntry.isReady = true;
      } else {
        myEntry = {
          id: myPeerId,
          name: myNickname || '익명',
          nameColor: myNicknameColor || null,
          profileCard: myProfileCard || 'default',
          avatarIcon: myAvatarIcon,
          avatarColor: myAvatarColor,
          level: myLevel,
          exp: myExp,
          isHost: true,
          isReady: true,
          stats: _getMyStats()
        };
        roomPlayers.unshift(myEntry);
      }

      _reorderRoomPlayersWithHostFirst();

      // 5. 호스트 리스너 재등록
      P2P.onMessage(_onHostReceiveMessage);
      P2P.onDisconnect(_onHostDisconnect);

      // 6. Firebase 방 소유권 등록
      if (window.FirebaseLobby && typeof window.FirebaseLobby.claimRoomHost === 'function') {
        await window.FirebaseLobby.claimRoomHost(currentRoomCode, {
          name: myNickname,
          peerId: myPeerId,
          nameColor: myNicknameColor,
          avatarIcon: myAvatarIcon,
          avatarColor: myAvatarColor,
          level: myLevel,
          profileCard: myProfileCard
        });
      }

      hideLoading();
      _isMigratingHost = false;

      _enterRoomScreen(false);
      _broadcastRoomState();
      _updateRoomUI();

      showToast(`👑 방장이 되었습니다! (방 코드: ${currentRoomCode})`, 'success');
      _appendChatMessage({ isSystem: true, text: `👑 ${myNickname}님이 새로운 방장이 되었습니다!` });

    } catch (err) {
      hideLoading();
      _isMigratingHost = false;
      console.error('[Host] 방장 승격 실패:', err);
      showToast('방장 권한 인계에 실패하여 방이 종료됩니다: ' + (err.message || '오류'), 'error');
      _leaveRoom(true);
    }
  }

  async function _reconnectAsGuest(roomCode, newHostName) {
    showLoading(`새 방장(${newHostName || '방장'})에게 연결하는 중...`);
    _isMigratingHost = true;

    try {
      P2P.onMessage(_onGuestReceiveMessage);
      P2P.onDisconnect(_onGuestDisconnect);

      await P2P.join(roomCode);

      hideLoading();
      _isMigratingHost = false;

      isHostPlayer = false;
      isMyReady = false;

      P2P.send({
        type: 'guest_hello',
        id: P2P.getMyId(),
        name: myNickname || '익명',
        nameColor: myNicknameColor || null,
        profileCard: myProfileCard || 'default',
        avatarIcon: myAvatarIcon,
        avatarColor: myAvatarColor,
        avatarFrame: myAvatarFrame || 'default',
        chatBubble: myChatBubble || 'default',
        victoryEffect: myVictoryEffect || 'default',
        level: myLevel,
        exp: myExp,
        password: currentRoomPassword || '',
        stats: _getMyStats()
      });

      _enterRoomScreen(false);
      showToast(`새 방장(${newHostName || '방장'})의 방에 정상 연결되었습니다.`, 'success');

    } catch (err) {
      hideLoading();
      _isMigratingHost = false;
      console.error('[Guest] 새 방장 재연결 실패:', err);
      showToast('새 방장과의 연결에 실패하여 로비로 이동합니다.', 'error');
      _leaveRoom(true);
    }
  }


  document.querySelectorAll('.sidebar-game-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-game-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const gameKey = item.dataset.game;
      if (gameKey && GAMES[gameKey]) {
        selectedGameKey = gameKey;
      }
      if (gameKey === 'minecraft') {
        _openMinecraftGuide();
      }
    });
  });

  /* ── ⛏️ 마인크래프트 1.12.2 (Eaglercraft) 새 탭 실행 컨트롤러 ── */
  const EAGLERCRAFT_URL = './eaglercraft_1.12.2.html';

  function _launchMinecraft() {
    // 🌟 최상의 3D 캔버스 성능, 마우스 360도 포인터 락 및 키보드 조작을 위해 독립 새 탭에서 실행
    const newWindow = window.open(EAGLERCRAFT_URL, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // 팝업 차단 발생 시 대체 이동
      window.location.href = EAGLERCRAFT_URL;
    }
  }

  // P2P LAN 멀티플레이 가이드 모달
  function _openMinecraftGuide() {
    if ($('overlay-mc-guide')) $('overlay-mc-guide').classList.remove('hidden');
  }
  function _closeMinecraftGuide() {
    if ($('overlay-mc-guide')) $('overlay-mc-guide').classList.add('hidden');
  }

  // 마인크래프트 버튼 리스너들
  if ($('btn-launch-minecraft')) $('btn-launch-minecraft').addEventListener('click', _launchMinecraft);
  if ($('btn-preview-mc-guide')) $('btn-preview-mc-guide').addEventListener('click', _openMinecraftGuide);
  if ($('btn-open-mc-guide')) $('btn-open-mc-guide').addEventListener('click', _openMinecraftGuide);
  if ($('btn-close-mc-guide')) $('btn-close-mc-guide').addEventListener('click', _closeMinecraftGuide);
  if ($('btn-confirm-mc-guide')) $('btn-confirm-mc-guide').addEventListener('click', _closeMinecraftGuide);
  if ($('overlay-mc-guide')) {
    $('overlay-mc-guide').addEventListener('click', (e) => {
      if (e.target === $('overlay-mc-guide')) _closeMinecraftGuide();
    });
  }
  function _closeMinecraftGuide() {
    if ($('overlay-mc-guide')) $('overlay-mc-guide').classList.add('hidden');
  }

  if ($('btn-open-mc-guide')) $('btn-open-mc-guide').addEventListener('click', _openMinecraftGuide);
  if ($('btn-close-mc-guide')) $('btn-close-mc-guide').addEventListener('click', _closeMinecraftGuide);
  if ($('btn-confirm-mc-guide')) $('btn-confirm-mc-guide').addEventListener('click', _closeMinecraftGuide);
  if ($('overlay-mc-guide')) {
    $('overlay-mc-guide').addEventListener('click', (e) => {
      if (e.target === $('overlay-mc-guide')) _closeMinecraftGuide();
    });
  }

  // 홈 화면 탭 전환 (PC)
  if ($('tab-create')) {
    $('tab-create').addEventListener('click', () => {
      Sound.playClick();
      $('tab-create').classList.add('active');
      $('tab-join').classList.remove('active');
      $('panel-create').classList.add('active');
      $('panel-join').classList.remove('active');
    });
  }

  if ($('tab-join')) {
    $('tab-join').addEventListener('click', () => {
      Sound.playClick();
      $('tab-join').classList.add('active');
      $('tab-create').classList.remove('active');
      $('panel-join').classList.add('active');
      $('panel-create').classList.remove('active');
      if (window.innerWidth > 960) {
        setTimeout(() => $('input-room-code').focus(), 50);
      }
    });
  }

  // 🌟 모바일 전용 탭 전환 ([방 목록] | [상점]) & 방 설정 모드 인터랙션 🌟

  // 🌟 방 목록 카드 내부 [방 설정] 버튼 클릭 이벤트 🌟
  const btnMobileRoomAction = $('btn-mobile-room-action');
  if (btnMobileRoomAction) {
    btnMobileRoomAction.addEventListener('click', () => {
      Sound.playClick();
      const homeScreen = $('screen-home');
      if (homeScreen) homeScreen.classList.add('mobile-show-create');
      // 방 만들기 패널 활성화
      if ($('tab-create')) $('tab-create').classList.add('active');
      if ($('tab-join')) $('tab-join').classList.remove('active');
      if ($('panel-create')) $('panel-create').classList.add('active');
      if ($('panel-join')) $('panel-join').classList.remove('active');
    });
  }

  // 🌟 방 만들기 UI 상단 [돌아가기] 버튼 클릭 이벤트 🌟
  const btnBackToRoomList = $('btn-back-to-room-list');
  if (btnBackToRoomList) {
    btnBackToRoomList.addEventListener('click', () => {
      Sound.playClick();
      const homeScreen = $('screen-home');
      if (homeScreen) homeScreen.classList.remove('mobile-show-create');
    });
  }

  // 🌟 모바일 전용 [코드 참가] 모달 이벤트 🌟
  function _openMobileCodeJoinModal() {
    Sound.playClick();
    const modal = $('overlay-mobile-code-join');
    const input = $('input-mobile-room-code');
    if (modal) modal.classList.remove('hidden');
    if (input) {
      input.value = '';
      if (window.innerWidth > 960) setTimeout(() => input.focus(), 80);
    }
  }

  function _closeMobileCodeJoinModal() {
    const modal = $('overlay-mobile-code-join');
    if (modal) modal.classList.add('hidden');
  }

  function _confirmMobileCodeJoin() {
    const input = $('input-mobile-room-code');
    const code = (input ? input.value : '').replace(/\D/g, '').slice(0, 4);
    if (!code || code.length !== 4) {
      if (typeof _toast === 'function') _toast('4자리 숫자 방 코드를 입력해주세요.', 'error');
      if (input) input.focus();
      return;
    }
    _closeMobileCodeJoinModal();
    if ($('input-room-code')) $('input-room-code').value = code;
    if ($('btn-join-room')) $('btn-join-room').click();
  }

  if ($('btn-mobile-code-join')) $('btn-mobile-code-join').addEventListener('click', _openMobileCodeJoinModal);
  if ($('btn-cancel-mobile-code')) $('btn-cancel-mobile-code').addEventListener('click', _closeMobileCodeJoinModal);
  if ($('btn-confirm-mobile-code')) $('btn-confirm-mobile-code').addEventListener('click', _confirmMobileCodeJoin);
  if ($('overlay-mobile-code-join')) {
    $('overlay-mobile-code-join').addEventListener('click', (e) => {
      if (e.target === $('overlay-mobile-code-join')) _closeMobileCodeJoinModal();
    });
  }
  if ($('input-mobile-room-code')) {
    $('input-mobile-room-code').addEventListener('input', (e) => {
      e.target.value = (e.target.value || '').replace(/\D/g, '').slice(0, 4);
    });
    $('input-mobile-room-code').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        _confirmMobileCodeJoin();
      } else if (e.key === 'Escape') {
        _closeMobileCodeJoinModal();
      }
    });
  }

  // 4자리 숫자 전용 입력 (공백 및 특수문자 완전 제거 & trim)
  $('input-room-code').addEventListener('input', (e) => {
    e.target.value = (e.target.value || '').replace(/\s+/g, '').replace(/\D/g, '').slice(0, 4);
  });
  $('input-room-code').addEventListener('paste', (e) => {
    setTimeout(() => {
      if ($('input-room-code')) {
        $('input-room-code').value = ($('input-room-code').value || '').replace(/\s+/g, '').replace(/\D/g, '').slice(0, 4);
      }
    }, 0);
  });

  /* =====================================================================
     🐾 프로필 편집 말풍선 팝업 컨트롤러 (동물 아이콘 + 색상 + 닉네임)
     ===================================================================== */
  /* =====================================================================
     🔐 Supabase 인증 & 클라우드 프로필 연동
     ===================================================================== */
  let _authCurrentTab = 'signin'; // 'signin' | 'signup'

  function _updateProfileAuthUI(user) {
    const statusEl = $('profile-auth-status');
    const subEl = $('profile-auth-sub');
    const iconEl = $('profile-auth-icon');
    const actionWrap = $('profile-auth-action');

    if (!statusEl || !subEl || !actionWrap) return;

    if (user && user.email) {
      if (iconEl) iconEl.className = 'fa-solid fa-cloud-check profile-auth-icon logged-in';
      statusEl.textContent = '구글 로그인 중';
      statusEl.removeAttribute('title');
      subEl.textContent = '클라우드 프로필 동기화 중';
      actionWrap.innerHTML = `
        <button type="button" class="btn btn-outline btn-sm profile-auth-btn" id="btn-supabase-logout">
          <i class="fa-solid fa-right-from-bracket"></i>
          <span>로그아웃</span>
        </button>
      `;
      const btnLogout = $('btn-supabase-logout');
      if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
          if (typeof AppSupabase !== 'undefined') {
            await AppSupabase.signOut();
            await _handleLogoutProfileReset(true);
            showToast('로그아웃되었습니다. 기본 프로필로 전환되었습니다.', 'info');
          }
        });
      }
    } else {
      if (iconEl) iconEl.className = 'fa-solid fa-cloud profile-auth-icon';
      statusEl.textContent = '게스트 모드';
      statusEl.removeAttribute('title');
      subEl.textContent = '로그인하면 프로필이 클라우드에 보관됩니다.';
      actionWrap.innerHTML = `
        <button type="button" class="btn btn-primary btn-sm profile-auth-btn" id="btn-open-auth-modal">
          <i class="fa-solid fa-cloud"></i>
          <span>클라우드 로그인</span>
        </button>
      `;
      const btnOpen = $('btn-open-auth-modal');
      if (btnOpen) {
        btnOpen.addEventListener('click', () => {
          _openAuthModal();
        });
      }
    }
  }

  function _openAuthModal() {
    const modal = $('auth-modal');
    if (!modal) return;

    _clearAuthFeedback();

    // Supabase 설정 완료 여부 체크
    const notice = $('auth-config-notice');
    if (notice) {
      const isOk = typeof AppSupabase !== 'undefined' && AppSupabase.isConfigured();
      notice.classList.toggle('hidden', isOk);
    }

    modal.classList.remove('hidden');
  }

  function _closeAuthModal() {
    const modal = $('auth-modal');
    if (modal) modal.classList.add('hidden');
    _clearAuthFeedback();
  }

  function _showAuthFeedback(msg, type = 'error') {
    const el = $('auth-feedback-msg');
    if (!el) return;
    el.textContent = msg;
    el.className = `auth-feedback-banner ${type}`;
    el.classList.remove('hidden');
  }

  function _clearAuthFeedback() {
    const el = $('auth-feedback-msg');
    if (el) {
      el.textContent = '';
      el.className = 'auth-feedback-banner hidden';
    }
  }

  function _initSupabaseAuthUI() {
    // 1. 모달 열기/닫기 이벤트 바인딩
    const btnOpen = $('btn-open-auth-modal');
    if (btnOpen) {
      btnOpen.addEventListener('click', () => {
        _openAuthModal();
      });
    }

    const btnClose = $('btn-close-auth-modal');
    if (btnClose) btnClose.addEventListener('click', _closeAuthModal);

    // 🌟 소셜 간편 로그인 (Google & Naver 전용) 이벤트 바인딩
    const btnGoogle = $('btn-oauth-google');
    if (btnGoogle) {
      btnGoogle.addEventListener('click', async () => {
        _showAuthFeedback('Google 로그인 페이지로 이동 중...', 'info');
        const res = await AppSupabase.signInWithOAuth('google');
        if (!res.success) {
          _showAuthFeedback(res.error || 'Google 로그인에 실패했습니다.', 'error');
        }
      });
    }

    const btnKakao = $('btn-oauth-kakao');
    if (btnKakao) {
      btnKakao.addEventListener('click', async () => {
        _showAuthFeedback('카카오 로그인 페이지로 이동 중...', 'info');
        const res = await AppSupabase.signInWithOAuth('kakao');
        if (!res.success) {
          _showAuthFeedback(res.error || '카카오 로그인에 실패했습니다.', 'error');
        }
      });
    }

    const modal = $('auth-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) _closeAuthModal();
      });
    }

    // 🌟 OAuth 리다이렉트 콜백 후 URL의 에러 및 상태 파싱
    _checkOAuthUrlFeedback();

    // 2. Supabase 모듈 초기화 및 리스너 연결
    if (typeof AppSupabase !== 'undefined') {
      AppSupabase.onAuthStateChange(async (event, session, user) => {
        _updateProfileAuthUI(user);

        if (user) {
          // 로그인 시 클라우드 프로필 로드 및 복원
          const profile = await AppSupabase.loadProfile(user.id);
          if (profile) {
            _applyLoadedProfile(profile, user.id);
          } else {
            // 소셜 로그인 첫 접속 등의 경우 로컬 프로필로 DB 최초 등록
            AppSupabase.saveProfile(user.id, {
              nickname: myNickname,
              avatarIcon: myAvatarIcon,
              avatarColor: myAvatarColor,
              level: myLevel || 1,
              exp: myExp || 0,
              stats: _getMyStats()
            }).catch(() => {});
          }
          _updateHomeUserBar();
        } else if (event === 'SIGNED_OUT') {
          // 명시적 로그아웃 이벤트 수신 시에만 게스트 기본 프로필로 전환
          await _handleLogoutProfileReset(false);
        }
      });

      // 초기 세션 확인
      AppSupabase.init().then(async user => {
        _updateProfileAuthUI(user);
        if (user) {
          const profile = await AppSupabase.loadProfile(user.id);
          if (profile) {
            _applyLoadedProfile(profile, user.id);
          }
          _updateHomeUserBar();
        }
      }).catch(() => {
        _updateProfileAuthUI(null);
      });
    } else {
      _updateProfileAuthUI(null);
    }
  }

  // 🌟 로그아웃 시 게스트 기본 프로필(익명, 기본 아바타, 1레벨, 0코인, 0전적)로 리셋
  async function _handleLogoutProfileReset(forceReload = false) {
    // 1. Firebase 및 Supabase의 기존 로그인 접속자 정보 즉시 삭제 및 세션 키 초기화
    if (window.FirebaseLobby && typeof window.FirebaseLobby.removeOnlineUser === 'function') {
      try { await window.FirebaseLobby.removeOnlineUser(); } catch (_) {}
    }
    try { sessionStorage.removeItem('inu_presence_key'); } catch (_) {}

    // 2. 로컬 프로필 게스트 기본값으로 초기화
    myNickname = _generateUniqueAnonNick();
    myAvatarIcon = _getRandomAvatarIcon();
    myAvatarColor = _getRandomAvatarColor();
    myLevel = 1;
    myExp = 0;

    localStorage.setItem('arcade_nick', myNickname);
    localStorage.setItem('arcade_avatar_icon', myAvatarIcon);
    localStorage.setItem('arcade_avatar_color', myAvatarColor);
    localStorage.removeItem('arcade_user_coins');
    localStorage.setItem('arcade_user_level', '1');
    localStorage.setItem('arcade_user_exp', '0');
    localStorage.removeItem(GAME_STATS_KEY);
    myNicknameColor = '';
    myPurchasedNameColors = [];
    localStorage.removeItem('arcade_name_color');
    localStorage.removeItem('arcade_purchased_name_colors');
    myProfileCard = 'default';
    myPurchasedProfileCards = ['default'];
    localStorage.removeItem('arcade_profile_card');
    localStorage.removeItem('arcade_purchased_profile_cards');
    myChatBubble = 'default';
    myPurchasedChatBubbles = ['default'];
    localStorage.removeItem('arcade_user_chat_bubble');
    localStorage.removeItem('arcade_purchased_chat_bubbles');
    myAvatarFrame = 'default';
    myPurchasedAvatarFrames = ['default'];
    localStorage.removeItem('arcade_user_avatar_frame');
    localStorage.removeItem('arcade_purchased_avatar_frames');
    myVictoryEffect = 'default';
    myPurchasedVictoryEffects = ['default'];
    localStorage.removeItem('arcade_user_victory_effect');
    localStorage.removeItem('arcade_purchased_victory_effects');

    _updateHomeUserBar();
    _updateLevelUI();
    _updateProfileAuthUI(null);

    // 3. 새 게스트 접속자로 Firebase 및 Supabase에 즉각 등록
    try {
      const guestPayload = _getMyPresencePayload();
      if (window.FirebaseLobby && typeof window.FirebaseLobby.registerOnlineUser === 'function') {
        await window.FirebaseLobby.registerOnlineUser(guestPayload);
      }
    } catch (_) {}

    // 사용자가 명시적으로 로그아웃 버튼을 눌렀을 때만 새로고침 실행
    if (forceReload) {
      window.location.reload();
    }
  }

  // 🌟 OAuth 리다이렉트 콜백 후 URL의 에러 및 상태 파싱
  function _checkOAuthUrlFeedback() {
    const hash = window.location.hash || '';
    const search = window.location.search || '';

    let params = new URLSearchParams(search);
    if (hash && hash.includes('=')) {
      const raw = hash.startsWith('#') ? hash.slice(1) : hash;
      const hashParams = new URLSearchParams(raw);
      if (hashParams.has('error') || hashParams.has('error_description')) {
        params = hashParams;
      }
    }

    if (params.has('error') || params.has('error_description')) {
      const err = params.get('error') || '';
      const desc = params.get('error_description') || '';
      const fullMsg = decodeURIComponent(desc.replace(/\+/g, ' '));
      console.warn('[OAuth Callback Error]', err, fullMsg);

      let alertMsg = `소셜 로그인에 실패했습니다.\n사유: ${fullMsg || err}`;
      if (fullMsg.includes('external provider') || fullMsg.includes('Error getting user profile') || fullMsg.includes('id_token')) {
        alertMsg = `[네이버 로그인 실패 안내]\n\n네이버는 OpenID Connect(id_token) 표준을 제공하지 않아 Supabase Custom OIDC에서 직접 인증 세션을 맺지 못하고 거절되었습니다.\n\n(Supabase 서버 오류: ${fullMsg})\n\n💡 해결 방법:\n1. Supabase 공식 내장 프로바이더인 'Google' 또는 'Kakao(카카오)'를 사용하시거나,\n2. 네이버 로그인을 위해선 Supabase Edge Function을 통한 OAuth 토큰 중계 브릿지가 필요합니다.`;
      }

      setTimeout(() => {
        alert(alertMsg);
      }, 250);

      // 주소창의 지저분한 hash/query 정리
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }

  /* =====================================================================
     🌟 커스텀 확인 / 나가기 다이얼로그 (브라우저 기본 confirm 대체)
     ===================================================================== */
  function showConfirmDialog({
    title = '확인',
    message = '정말 진행하시겠습니까?',
    confirmText = '나가기',
    cancelText = '취소',
    icon = 'fa-solid fa-door-open',
    isDanger = true
  } = {}) {
    return new Promise((resolve) => {
      const modal = $('confirm-modal');
      if (!modal) {
        resolve(window.confirm(message));
        return;
      }

      const titleEl = $('confirm-modal-title');
      const msgEl = $('confirm-modal-message');
      const okBtn = $('confirm-modal-ok');
      const cancelBtn = $('confirm-modal-cancel');
      const iconEl = $('confirm-modal-icon');

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (okBtn) {
        okBtn.textContent = confirmText;
        okBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';
      }
      if (cancelBtn) cancelBtn.textContent = cancelText;
      if (iconEl) {
        iconEl.innerHTML = `<i class="${icon}"></i>`;
        iconEl.className = `confirm-modal-icon-wrap ${isDanger ? 'danger' : 'primary'}`;
      }

      function cleanup(result) {
        modal.classList.add('hidden');
        modal.removeEventListener('click', onBackdrop);
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }

      function onOk(e) {
        if (e) e.preventDefault();
        cleanup(true);
      }
      function onCancel(e) {
        if (e) e.preventDefault();
        cleanup(false);
      }
      function onBackdrop(e) {
        if (e.target === modal) cleanup(false);
      }
      function onKey(e) {
        if (e.key === 'Escape') cleanup(false);
        if (e.key === 'Enter') cleanup(true);
      }

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);

      modal.classList.remove('hidden');
    });
  }
  window.showConfirmDialog = showConfirmDialog;

  /* =====================================================================
     📊 게임 전적 시스템 (게임별/전체 전적 로컬 & Supabase 동기화 & 모달)
     ===================================================================== */
  const GAME_STATS_KEY = 'arcade_user_stats';

  const GAME_STATS_META = {
    inu_quiz:  { title: '인천대 퀴즈', icon: 'fa-solid fa-graduation-cap' },
    inu_study: { title: '스터디룸',   icon: 'fa-solid fa-book-open-reader' },
    inu_draw:  { title: '횃불이 그리기', icon: 'fa-solid fa-paintbrush' }
  };

  function _createEmptyStats() {
    const stats = {
      total: { plays: 0, wins: 0, losses: 0, draws: 0 },
      games: {}
    };
    Object.keys(GAME_STATS_META).forEach(key => {
      stats.games[key] = { plays: 0, wins: 0, losses: 0, draws: 0 };
    });
    return stats;
  }

  function _getMyStats() {
    try {
      const raw = localStorage.getItem(GAME_STATS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (!parsed.total) parsed.total = { plays: 0, wins: 0, losses: 0, draws: 0 };
          if (!parsed.games) parsed.games = {};
          Object.keys(GAME_STATS_META).forEach(k => {
            if (!parsed.games[k]) parsed.games[k] = { plays: 0, wins: 0, losses: 0, draws: 0 };
          });
          return parsed;
        }
      }
    } catch (_) {}
    return _createEmptyStats();
  }

  // 🌟 클라우드 전적과 로컬 전적의 안전한 병합 (쿠키 삭제 후 로그인 시 전적 초기화 방지)
  function _mergeStats(cloudStats, localStats) {
    if (!cloudStats && !localStats) return _createEmptyStats();
    if (!cloudStats) return localStats;
    if (!localStats) return cloudStats;

    const cloudPlays = (cloudStats.total && cloudStats.total.plays) || 0;
    const localPlays = (localStats.total && localStats.total.plays) || 0;

    // 만약 한쪽에만 플레이 기록이 있다면 그 쪽을 우선 적용
    if (cloudPlays === 0 && localPlays > 0) return localStats;
    if (localPlays === 0) return cloudStats;

    // 둘 다 기록이 있으면 큰 값을 유지하도록 안전 병합
    const merged = _createEmptyStats();
    merged.total.plays = Math.max(cloudPlays, localPlays);
    merged.total.wins = Math.max(cloudStats.total?.wins || 0, localStats.total?.wins || 0);
    merged.total.losses = Math.max(cloudStats.total?.losses || 0, localStats.total?.losses || 0);
    merged.total.draws = Math.max(cloudStats.total?.draws || 0, localStats.total?.draws || 0);

    Object.keys(GAME_STATS_META).forEach(k => {
      const cg = cloudStats.games?.[k] || { plays: 0, wins: 0, losses: 0, draws: 0 };
      const lg = localStats.games?.[k] || { plays: 0, wins: 0, losses: 0, draws: 0 };
      merged.games[k] = {
        plays: Math.max(cg.plays, lg.plays),
        wins: Math.max(cg.wins, lg.wins),
        losses: Math.max(cg.losses, lg.losses),
        draws: Math.max(cg.draws, lg.draws)
      };
    });
    return merged;
  }

  // 🌟 로그인 시 Supabase에서 불러온 계정 프로필 및 전적을 로컬과 UI에 완벽 복원
  function _applyLoadedProfile(profile, userId = null) {
    if (!profile) return;

    // 1. 닉네임 복원
    if (profile.nickname) {
      myNickname = profile.nickname;
      localStorage.setItem('arcade_nick', myNickname);
        if ($('home-user-name')) $('home-user-name').textContent = myNickname;
    }

    // 2. 아바타 아이콘 복원
    if (profile.avatarIcon) {
      myAvatarIcon = profile.avatarIcon;
      localStorage.setItem('arcade_avatar_icon', myAvatarIcon);
      }

    // 3. 아바타 배경 색상 복원
    if (profile.avatarColor) {
      myAvatarColor = profile.avatarColor;
      localStorage.setItem('arcade_avatar_color', myAvatarColor);
      }

    // 4. 레벨 & 경험치 복원
    if (typeof profile.level === 'number' && profile.level >= 1) {
      myLevel = Math.min(MAX_LEVEL, profile.level);
      localStorage.setItem('arcade_user_level', String(myLevel));
    }
    if (typeof profile.exp === 'number' && profile.exp >= 0) {
      myExp = profile.exp;
      localStorage.setItem('arcade_user_exp', String(myExp));
    }

    // 6. 🌟 게임 전적(stats) 복원 & 병합 (쿠키/스토리지 삭제 후 로그인 시 완벽 복원!)
    const localStats = _getMyStats();
    const mergedStats = _mergeStats(profile.stats, localStats);
    localStorage.setItem(GAME_STATS_KEY, JSON.stringify(mergedStats));

    // 7. 닉네임 색상 & 구매한 색상 목록 복원
    if (profile.nameColor !== undefined) {
      myNicknameColor = profile.nameColor || '';
      if (myNicknameColor) {
        localStorage.setItem('arcade_name_color', myNicknameColor);
      } else {
        localStorage.removeItem('arcade_name_color');
      }
    }
    if (Array.isArray(profile.purchasedNameColors)) {
      myPurchasedNameColors = [...profile.purchasedNameColors];
      localStorage.setItem('arcade_purchased_name_colors', JSON.stringify(myPurchasedNameColors));
    }

    // 8. 🎴 프로필 카드 & 구매한 카드 목록 복원
    if (profile.profileCard !== undefined) {
      myProfileCard = profile.profileCard || 'default';
      if (myProfileCard && myProfileCard !== 'default') {
        localStorage.setItem('arcade_profile_card', myProfileCard);
      } else {
        localStorage.removeItem('arcade_profile_card');
      }
    }
    if (Array.isArray(profile.purchasedProfileCards)) {
      myPurchasedProfileCards = [...profile.purchasedProfileCards];
      if (!myPurchasedProfileCards.includes('default')) myPurchasedProfileCards.push('default');
      localStorage.setItem('arcade_purchased_profile_cards', JSON.stringify(myPurchasedProfileCards));
    }

    // 9. 💬 말풍선 스킨 & 구매 목록 복원
    if (profile.chatBubble !== undefined) {
      myChatBubble = profile.chatBubble || 'default';
      if (myChatBubble && myChatBubble !== 'default') {
        localStorage.setItem('arcade_user_chat_bubble', myChatBubble);
      } else {
        localStorage.removeItem('arcade_user_chat_bubble');
      }
    }
    if (Array.isArray(profile.purchasedChatBubbles)) {
      myPurchasedChatBubbles = [...profile.purchasedChatBubbles];
      if (!myPurchasedChatBubbles.includes('default')) myPurchasedChatBubbles.push('default');
      localStorage.setItem('arcade_purchased_chat_bubbles', JSON.stringify(myPurchasedChatBubbles));
    }

    // 10. 🖼️ 아바타 테두리 & 구매 목록 복원
    if (profile.avatarFrame !== undefined) {
      myAvatarFrame = profile.avatarFrame || 'default';
      if (myAvatarFrame && myAvatarFrame !== 'default') {
        localStorage.setItem('arcade_user_avatar_frame', myAvatarFrame);
      } else {
        localStorage.removeItem('arcade_user_avatar_frame');
      }
    }
    if (Array.isArray(profile.purchasedAvatarFrames)) {
      myPurchasedAvatarFrames = [...profile.purchasedAvatarFrames];
      if (!myPurchasedAvatarFrames.includes('default')) myPurchasedAvatarFrames.push('default');
      localStorage.setItem('arcade_purchased_avatar_frames', JSON.stringify(myPurchasedAvatarFrames));
    }

    // 11. 🎆 승리 세레머니 연출 & 구매 목록 복원
    if (profile.victoryEffect !== undefined) {
      myVictoryEffect = profile.victoryEffect || 'default';
      if (myVictoryEffect && myVictoryEffect !== 'default') {
        localStorage.setItem('arcade_user_victory_effect', myVictoryEffect);
      } else {
        localStorage.removeItem('arcade_user_victory_effect');
      }
    }
    if (Array.isArray(profile.purchasedVictoryEffects)) {
      myPurchasedVictoryEffects = [...profile.purchasedVictoryEffects];
      if (!myPurchasedVictoryEffects.includes('default')) myPurchasedVictoryEffects.push('default');
      localStorage.setItem('arcade_purchased_victory_effects', JSON.stringify(myPurchasedVictoryEffects));
    }

    // 클라우드와 로컬에 차이가 있다면 클라우드에도 즉시 동기화
    if (userId && typeof AppSupabase !== 'undefined') {
      AppSupabase.saveProfile(userId, {
        nickname: myNickname,
        nameColor: myNicknameColor,
        purchasedNameColors: myPurchasedNameColors,
        profileCard: myProfileCard,
        purchasedProfileCards: myPurchasedProfileCards,
        chatBubble: myChatBubble,
        purchasedChatBubbles: myPurchasedChatBubbles,
        avatarFrame: myAvatarFrame,
        purchasedAvatarFrames: myPurchasedAvatarFrames,
        victoryEffect: myVictoryEffect,
        purchasedVictoryEffects: myPurchasedVictoryEffects,
        avatarIcon: myAvatarIcon,
        avatarColor: myAvatarColor,
        level: myLevel,
        exp: myExp,
        stats: mergedStats
      }).catch(() => {});
    }

    _updateHomeUserBar();
    _updateLevelUI();
  }

  function _saveMyStats(stats) {
    if (!stats || typeof stats !== 'object') return;
    try {
      localStorage.setItem(GAME_STATS_KEY, JSON.stringify(stats));
    } catch (_) {}

    // Supabase 로그인 상태라면 클라우드에도 저장 (모든 정보 동봉하여 덮어쓰기 방지)
    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) {
      const user = AppSupabase.getCurrentUser();
      AppSupabase.saveProfile(user.id, {
        nickname: myNickname,
        avatarIcon: myAvatarIcon,
        avatarColor: myAvatarColor,
        level: myLevel,
        exp: myExp,
        stats: stats
      }).catch(() => {});
    }

    // 대기방에 있다면 P2P 방 참가자들에게 최신 stats 공유
    if (currentRoomCode && roomPlayers.length > 0) {
      const myId = P2P.getMyId();
      const me = roomPlayers.find(p => p.id === myId || (p.isHost && isHostPlayer));
      if (me) me.stats = stats;
      if (isHostPlayer) {
        _broadcastRoomState();
      } else {
        P2P.send({
          type: 'guest_update_profile',
          name: myNickname,
          avatarIcon: myAvatarIcon,
          avatarColor: myAvatarColor,
          level: myLevel,
          exp: myExp,
          stats: stats
        });
      }
    }
  }

  /* =====================================================================
     ⚙️ 방 만들기 옵션 (공개/비밀방, 비밀번호, 2~8인 스피너) & 비밀번호 모달
     ===================================================================== */
  function _initCreateRoomOptions() {
    const optPublic = $('opt-room-public');
    const optPrivate = $('opt-room-private');
    const pwdWrap = $('create-password-wrap');
    const btnMinus = $('btn-cap-minus');
    const btnPlus = $('btn-cap-plus');
    const capVal = $('capacity-val');

    if (optPublic && optPrivate && pwdWrap) {
      optPublic.addEventListener('change', () => {
        if (optPublic.checked) pwdWrap.classList.add('hidden');
      });
      optPrivate.addEventListener('change', () => {
        if (optPrivate.checked) {
          pwdWrap.classList.remove('hidden');
          setTimeout(() => {
            if ($('input-create-room-password')) $('input-create-room-password').focus();
          }, 50);
        }
      });
    }

    if (btnMinus && btnPlus && capVal) {
      btnMinus.addEventListener('click', () => {
        Sound.playClick();
        createRoomCapacity = Math.max(2, createRoomCapacity - 1);
        capVal.textContent = `${createRoomCapacity}인`;
      });
      btnPlus.addEventListener('click', () => {
        Sound.playClick();
        createRoomCapacity = Math.min(8, createRoomCapacity + 1);
        capVal.textContent = `${createRoomCapacity}인`;
      });
    }

    // 비밀번호 입력 팝업 이벤트
    const overlayPwd = $('overlay-room-password');
    const btnCancelPwd = $('btn-cancel-pwd');
    const btnConfirmPwd = $('btn-confirm-pwd');
    const inputJoinPwd = $('input-join-password');

    if (btnCancelPwd) {
      btnCancelPwd.addEventListener('click', () => {
        if (overlayPwd) overlayPwd.classList.add('hidden');
        pendingJoinRoomCode = '';
      });
    }

    if (btnConfirmPwd && inputJoinPwd) {
      const doConfirm = () => {
        const pwd = inputJoinPwd.value.trim();
        if (!pwd) {
          showToast('비밀번호를 입력해 주세요.', 'warn');
          return;
        }
        if (overlayPwd) overlayPwd.classList.add('hidden');
        const code = pendingJoinRoomCode;
        pendingJoinRoomCode = '';
        _startJoinRoom(code, pwd);
      };
      btnConfirmPwd.addEventListener('click', doConfirm);
      inputJoinPwd.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doConfirm();
      });
    }
  }

  function _openPasswordJoinModal(roomCode) {
    _pushHistory({ modal: 'password' }, '#password');
    pendingJoinRoomCode = roomCode;
    const overlayPwd = $('overlay-room-password');
    const inputJoinPwd = $('input-join-password');
    if (overlayPwd) {
      overlayPwd.classList.remove('hidden');
      if (inputJoinPwd) {
        inputJoinPwd.value = '';
        setTimeout(() => inputJoinPwd.focus(), 80);
      }
    }
  }

  /* =====================================================================
     🎮 게임별 세부 설정 (라운드 1~8회 스피너 / 오목·체스 진영 셔플·흑·백 선택)
     ===================================================================== */
  function _initGameExtraSettings() {
    const btnRoundMinus = $('btn-round-minus');
    const btnRoundPlus = $('btn-round-plus');
    const sideButtons = document.querySelectorAll('.side-btn');

    if (btnRoundMinus && btnRoundPlus) {
      btnRoundMinus.addEventListener('click', () => {
        if (!P2P.isHost() && !isHostPlayer) {
          showToast('방장만 라운드 수를 변경할 수 있습니다.', 'info');
          return;
        }
        selectedGameRounds = Math.max(1, selectedGameRounds - 1);
        _updateGameExtraSettingsUI();
        _broadcastRoomState();
      });

      btnRoundPlus.addEventListener('click', () => {
        if (!P2P.isHost() && !isHostPlayer) {
          showToast('방장만 라운드 수를 변경할 수 있습니다.', 'info');
          return;
        }
        selectedGameRounds = Math.min(20, selectedGameRounds + 1);
        _updateGameExtraSettingsUI();
        _broadcastRoomState();
      });
    }

    sideButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!P2P.isHost() && !isHostPlayer) {
          showToast('방장만 진영을 변경할 수 있습니다.', 'info');
          return;
        }
        const side = btn.dataset.side;
        if (side) {
          selectedGameSideMode = side;
          _updateGameExtraSettingsUI();
          _broadcastRoomState();
        }
      });
    });
  }

  function _updateGameExtraSettingsUI() {
    const bar = $('game-extra-settings-bar');
    const roundsItem = $('game-rounds-setting');
    const sideItem = $('game-side-setting');
    const roundVal = $('game-round-val');
    const isHost = P2P.isHost() || isHostPlayer;

    if (!bar || !roundsItem || !sideItem) return;

    const isRoundGame = (selectedGameKey === 'inu_quiz');
    const selectPanel = document.querySelector('.game-select-panel');
    if (selectPanel) {
      selectPanel.classList.toggle('has-extra-settings', isRoundGame);
    }

    if (isRoundGame) {
      bar.classList.remove('hidden');
      roundsItem.classList.remove('hidden');
      if (sideItem) sideItem.classList.add('hidden');
      if (roundVal) roundVal.textContent = `${selectedGameRounds} 라운드`;
    } else {
      bar.classList.add('hidden');
      roundsItem.classList.add('hidden');
      if (sideItem) sideItem.classList.add('hidden');
    }
  }

  /* =====================================================================
     3. 방 생성 및 참가
     ===================================================================== */
  $('btn-create-room').addEventListener('click', () => {
    Sound.playClick();
    _startHostRoom();
  });

  $('btn-join-room').addEventListener('click', () => {
    Sound.playClick();
    const rawVal = $('input-room-code').value;
    const code = String(rawVal || '').replace(/\s+/g, '').trim();
    if (code.length !== 4) {
      showToast('4자리 방 코드를 입력해 주세요.', 'warn');
      return;
    }
    _startJoinRoom(code);
  });

  $('input-room-code').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('btn-join-room').click();
  });

  /* ── 방 만들기 실행 (호스트) ── */
  async function _startHostRoom() {
    const isPrivate = $('opt-room-private') && $('opt-room-private').checked;
    let roomPwd = '';
    if (isPrivate) {
      roomPwd = $('input-create-room-password') ? $('input-create-room-password').value.trim() : '';
      if (!roomPwd) {
        showToast('비밀방의 비밀번호를 입력해 주세요.', 'warn');
        if ($('input-create-room-password')) $('input-create-room-password').focus();
        return;
      }
    }

    currentRoomMaxPlayers = createRoomCapacity || 5;
    currentRoomPassword = isPrivate ? roomPwd : '';

    showLoading('방을 생성하고 있습니다...');
    isDevMode = false;

    try {
      currentRoomCode = await P2P.host(
        _onHostGuestJoin,
        _onHostGuestLeave
      );

      hideLoading();

      isHostPlayer = true;
      roomPlayers = [{
        id: P2P.getMyId(),
        name: myNickname || '익명',
        nameColor: myNicknameColor || null,
        profileCard: myProfileCard || 'default',
        avatarIcon: myAvatarIcon,
        avatarColor: myAvatarColor,
        avatarFrame: myAvatarFrame || 'default',
        chatBubble: myChatBubble || 'default',
        victoryEffect: myVictoryEffect || 'default',
        level: myLevel,
        exp: myExp,
        isHost: true,
        isReady: true,
        stats: _getMyStats()
      }];
      selectedGameKey = 'inu_quiz';

      P2P.onMessage(_onHostReceiveMessage);
      P2P.onDisconnect(_onHostDisconnect);

      // 🌐 Firebase Realtime DB에 방 정보 등록 + onDisconnect 자동 삭제 훅
      if (window.FirebaseLobby && typeof window.FirebaseLobby.registerRoom === 'function') {
        window.FirebaseLobby.registerRoom(
          currentRoomCode,
          myNickname,
          P2P.getMyId(),
          currentRoomMaxPlayers,
          myAvatarIcon,
          myAvatarColor,
          isPrivate,
          !!currentRoomPassword,
          myNicknameColor,
          myLevel,
          myProfileCard,
          selectedGameKey || 'inu_quiz'
        );
      }

      _resetChatLogs();
      _enterRoomScreen();
      showToast(`방(${currentRoomCode})이 생성되었습니다! (최대 ${currentRoomMaxPlayers}인${isPrivate ? ', 비밀방' : ''})`, 'success');

    } catch (err) {
      hideLoading();
      showToast('방 생성 실패: ' + (err.message || '오류 발생'), 'error');
    }
  }

  /* ── 방 참가 실행 (게스트) ── */
  async function _startJoinRoom(code, inputPassword = '') {
    const cleanCode = String(code || '').replace(/\s+/g, '').trim();

    // 🛠️ 개발자 테스트 모드 (0000 입력 시 1인 게임 테스트 및 봇 생성 모드 활성화)
    if (cleanCode === '0000') {
      isDevMode = true;
      currentRoomCode = '0000';
      currentRoomMaxPlayers = 8;
      roomPlayers = [{
        id: 'dev-player',
        name: myNickname || '개발자',
        avatarIcon: myAvatarIcon || 'fa-solid fa-code',
        avatarColor: myAvatarColor || '#e53e3e',
        level: myLevel || 99,
        exp: myExp || 999,
        isHost: true,
        isReady: true
      }];
      selectedGameKey = 'inu_quiz';
      selectedGameRounds = 1;
      isMyReady = true;

      _resetChatLogs();
      _enterRoomScreen();
      showToast('개발자 모드 활성화: 참가자 대기 버튼을 눌러 봇을 추가하고 1인 플레이를 진행하세요!', 'success');
      return;
    }

    isDevMode = false;
    _isJoinCancelled = false;
    showLoading(`방(${cleanCode})에 접속하는 중...`);
    $('btn-join-room').disabled = true;

    try {
      // 메시지 리스너를 join 이전에 미리 등록하여 초기 room_state 유실 방지
      P2P.onMessage(_onGuestReceiveMessage);
      P2P.onDisconnect(_onGuestDisconnect);

      await P2P.join(cleanCode);

      if (_isJoinCancelled) {
        P2P.destroy();
        return;
      }

      currentRoomCode = cleanCode;
      currentRoomPassword = inputPassword || '';
      isHostPlayer = false;
      isMyReady = false;

      _resetChatLogs();

      // 🌟 방 화면으로 즉시 전환하여 홈 화면에 멈추는 현상 방지
      _enterRoomScreen();

      P2P.send({
        type: 'guest_hello',
        id: P2P.getMyId(),
        name: myNickname || '익명',
        nameColor: myNicknameColor || null,
        profileCard: myProfileCard || 'default',
        avatarIcon: myAvatarIcon,
        avatarColor: myAvatarColor,
        avatarFrame: myAvatarFrame || 'default',
        chatBubble: myChatBubble || 'default',
        victoryEffect: myVictoryEffect || 'default',
        level: myLevel,
        exp: myExp,
        password: inputPassword || '',
        stats: _getMyStats()
      });

      hideLoading();
      $('btn-join-room').disabled = false;

    } catch (err) {
      currentRoomCode = '';
      if (_isJoinCancelled) return;
      hideLoading();
      $('btn-join-room').disabled = false;
      const msg = err.message || '호스트를 찾을 수 없거나 응답하지 않습니다';
      showToast(msg, 'error');
    }
  }

  /* =====================================================================
     4. 호스트측 P2P 이벤트 및 시스템 메시지 처리
     ===================================================================== */
  function _onHostGuestJoin(peerId) {
    console.log('[Host] 새 게스트 접속:', peerId);
  }

  function _onHostGuestLeave(peerId, explicitName) {
    const leftPlayer = roomPlayers.find(p => p.id === peerId);
    if (!leftPlayer && !explicitName) {
      // 이미 나갔거나 존재하지 않는 게스트 (중복 실행 방지)
      return;
    }

    const leftName = explicitName || (leftPlayer ? leftPlayer.name : '플레이어');
    console.log('[Host] 게스트 퇴장 처리:', leftName, peerId);

    // 참가자 배열에서 즉시 제거
    roomPlayers = roomPlayers.filter(p => p.id !== peerId);
    activeGamePlayers = activeGamePlayers.filter(p => p.id !== peerId);

    // 다른 게스트들에게 퇴장 브로드캐스트
    P2P.send({
      type: 'player_left_room_broadcast',
      playerId: peerId,
      name: leftName
    });

    _appendChatMessage({ isSystem: true, text: `${leftName}님이 퇴장하셨습니다.` });
    _showInGameAlert(`${leftName}님이 방을 나갔습니다.`);
    _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);

    _checkGomokuPlayerCount();
    _broadcastRoomState();
    _updateRoomUI();

    // 🌐 Firebase 인원 수 업데이트
    if (window.FirebaseLobby && typeof window.FirebaseLobby.updatePlayerCount === 'function') {
      window.FirebaseLobby.updatePlayerCount(currentRoomCode, roomPlayers.length);
    }

    showToast(`${leftName}님이 방을 나갔습니다.`, 'warn');
  }

  function _onHostReceiveMessage(data, senderPeerId) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'guest_hello') {
      // 🔒 비밀번호 검증
      if (currentRoomPassword) {
        if (!data.password) {
          // 비밀번호를 입력하지 않고 입장 시도 -> 비밀번호 입력 팝업 띄우도록 요청
          P2P.send({ type: 'password_required', roomCode: currentRoomCode }, senderPeerId);
          return;
        } else if (data.password !== currentRoomPassword) {
          // 비밀번호 불일치
          P2P.send({ type: 'wrong_password', message: '비밀번호가 일치하지 않습니다.' }, senderPeerId);
          return;
        }
      }

      const isJoiningMidGame = isRoomGameActive && activeGamePlayers.length > 0;
      const existingIdx = roomPlayers.findIndex(p => String(p.id) === String(senderPeerId) || (!p.isHost && p.name === data.name));

      // 👥 최대 정원 검증 (신규 입장 시에만 검사, 재연결 유저는 기존 자리 유지)
      if (existingIdx === -1 && roomPlayers.length >= currentRoomMaxPlayers) {
        P2P.send({ type: 'room_full', message: `방 인원이 가득 찼습니다 (최대 ${currentRoomMaxPlayers}명).` }, senderPeerId);
        return;
      }

      const newPlayerObj = {
        id: senderPeerId,
        name: data.name || '익명',
        nameColor: data.nameColor || null,
        profileCard: data.profileCard || 'default',
        avatarIcon: data.avatarIcon || _getRandomAvatarIcon(),
        avatarColor: data.avatarColor || _getRandomAvatarColor(),
        avatarFrame: data.avatarFrame || 'default',
        chatBubble: data.chatBubble || 'default',
        victoryEffect: data.victoryEffect || 'default',
        level: typeof data.level === 'number' ? data.level : 1,
        exp: typeof data.exp === 'number' ? data.exp : 0,
        isHost: false,
        isReady: false,
        isSpectator: isJoiningMidGame,
        stats: data.stats || null
      };

      if (existingIdx !== -1) {
        roomPlayers[existingIdx] = newPlayerObj;
      } else {
        roomPlayers.push(newPlayerObj);
      }
      _reorderRoomPlayersWithHostFirst();

      // 🌟 게임 진행 중 중간 입장한 게스트에게 즉시 관전 시작 패킷 전송
      if (isJoiningMidGame) {
        console.log('[Host] 게임 진행 중 새 게스트 관전 모드 진입:', data.name, senderPeerId);
        P2P.send({
          type: 'start_spectate',
          game: selectedGameKey,
          players: activeGamePlayers,
          targetRounds: selectedGameRounds,
          sideMode: selectedGameSideMode,
          isSpectator: true
        }, senderPeerId);

        // 🌟 방장 자신의 화면에서도 인게임 사이드바 관전자 목록 즉시 갱신!
        if (screens.game.classList.contains('active')) {
          _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);
          _showInGameAlert(`${data.name || '새 관전자'}님이 관전을 시작했습니다.`);
        }

        // 현재 게임 모듈이 스냅샷 동기화를 지원하는 경우 새 관전자에게 상태 스냅샷 전송 요청
        setTimeout(() => {
          if (currentGameModule && typeof currentGameModule.sendSnapshotTo === 'function') {
            currentGameModule.sendSnapshotTo(senderPeerId);
          }
        }, 150);
      }

      _checkGomokuPlayerCount();
      _broadcastRoomState();
      _updateRoomUI();

      // 🌐 Firebase 인원 수 업데이트
      if (window.FirebaseLobby && typeof window.FirebaseLobby.updatePlayerCount === 'function') {
        window.FirebaseLobby.updatePlayerCount(currentRoomCode, roomPlayers.length);
      }

      showToast(`${data.name || '새 플레이어'}님이 참가했습니다!`, 'success');

    } else if (data.type === 'guest_update_profile') {
      const player = roomPlayers.find(p => p.id === senderPeerId);
      if (player) {
        if (data.name) player.name = data.name;
        if (data.nameColor !== undefined) player.nameColor = data.nameColor;
        if (data.profileCard !== undefined) player.profileCard = data.profileCard;
        if (data.avatarIcon) player.avatarIcon = data.avatarIcon;
        if (data.avatarColor) player.avatarColor = data.avatarColor;
        if (data.avatarFrame !== undefined) player.avatarFrame = data.avatarFrame;
        if (data.chatBubble !== undefined) player.chatBubble = data.chatBubble;
        if (data.victoryEffect !== undefined) player.victoryEffect = data.victoryEffect;
        if (typeof data.level === 'number') player.level = data.level;
        if (typeof data.exp === 'number') player.exp = data.exp;
        if (data.stats) player.stats = data.stats;

        // 인게임 진행 중이면 활성 플레이어 정보도 갱신
        const ap = activeGamePlayers.find(p => p.id === senderPeerId);
        if (ap) {
          if (data.name) ap.name = data.name;
          if (data.nameColor !== undefined) ap.nameColor = data.nameColor;
          if (data.profileCard !== undefined) ap.profileCard = data.profileCard;
          if (data.avatarIcon) ap.avatarIcon = data.avatarIcon;
          if (data.avatarColor) ap.avatarColor = data.avatarColor;
          if (data.avatarFrame !== undefined) ap.avatarFrame = data.avatarFrame;
          if (data.chatBubble !== undefined) ap.chatBubble = data.chatBubble;
          if (data.victoryEffect !== undefined) ap.victoryEffect = data.victoryEffect;
        }

        _broadcastRoomState();
        _updateRoomUI();
      }

    } else if (data.type === 'guest_leave_room') {
      _onHostGuestLeave(senderPeerId);

    } else if (data.type === 'toggle_ready') {
      const player = roomPlayers.find(p => p.id === senderPeerId);
      if (player) {
        if (typeof data.isReady === 'boolean') {
          player.isReady = data.isReady;
        } else {
          player.isReady = !player.isReady;
        }
        _broadcastRoomState();
        _updateRoomUI();
      }

    } else if (data.type === 'guest_leave_game') {
      // 게스트가 게임 도중 [방으로 돌아가기]를 누름
      const leaverName = data.name || '플레이어';
      console.log('[Host] 게스트가 게임에서 나감:', leaverName, senderPeerId);

      activeGamePlayers = activeGamePlayers.filter(p => p.id !== senderPeerId);

      const rPlayer = roomPlayers.find(p => p.id === senderPeerId);
      if (rPlayer) { rPlayer.isReady = false; rPlayer.isSpectating = false; }

      // 🌟 게임 모듈에 탈주자 제거 알림 → 남은 인원끼리 게임 계속
      if (currentGameModule && typeof currentGameModule.removePlayer === 'function') {
        currentGameModule.removePlayer(senderPeerId);
      }

      // 남아있는 다른 모든 게스트들에게 브로드캐스트
      P2P.send({
        type: 'player_left_game_broadcast',
        playerId: senderPeerId,
        name: leaverName
      });

      _showInGameAlert(`${leaverName}님이 게임을 나갔습니다.`);
      _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);

      _broadcastRoomState();

    } else if (data.type === 'chat_msg') {
      // 호스트가 게스트로부터 채팅 수신 -> 호스트 화면에 표시
      _appendChatMessage(data, false);
      // 메시지를 보낸 게스트를 제외한 다른 게스트들에게만 릴레이 브로드캐스트
      P2P.send(data, null, senderPeerId);
    }else if (data.type === 'profile_emoji') {
      // 🌟 호스트 화면에 이모지 표시
      _showProfileEmoji(data.senderId, data.emojiSrc);
      // 🌟 메시지를 보낸 게스트를 제외한 다른 게스트들에게 릴레이 전송!
      P2P.send(data, null, senderPeerId);
    }
  }

  function _checkGomokuPlayerCount() {
    // 다인원 게임 인원수 체크 훅
  }

  function _broadcastRoomState() {
    P2P.send({
      type: 'room_state',
      roomCode: currentRoomCode,
      players: roomPlayers,
      maxPlayers: currentRoomMaxPlayers,
      selectedGame: selectedGameKey,
      isGameActive: isRoomGameActive,
      activePlayerIds: activeGamePlayers.map(p => p.id)
    });
    // 👥 전체 참가자 목록 브로드캐스트
    P2P.send({
      type: 'UPDATE_PARTICIPANTS',
      list: roomPlayers,
      isGameActive: isRoomGameActive,
      activePlayerIds: activeGamePlayers.map(p => p.id)
    });

    // 🌟 방장 화면에서도 게임 중일 때 사이드바 즉시 리렌더링
    if (screens.game.classList.contains('active')) {
      _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);
    }
  }

  /* =====================================================================
     5. 게스트측 P2P 시스템 메시지 처리
     ===================================================================== */
  function _onGuestReceiveMessage(data) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'password_required') {
      hideLoading();
      const targetCode = data.roomCode || currentRoomCode;
      currentRoomCode = '';
      P2P.destroy();
      _openPasswordJoinModal(targetCode);
      return;

    } else if (data.type === 'wrong_password') {
      hideLoading();
      currentRoomCode = '';
      P2P.destroy();
      showToast(data.message || '비밀번호가 일치하지 않습니다.', 'error');
      showScreen('home');
      return;

    } else if (data.type === 'room_state') {
      const prevGameKey = selectedGameKey;
      currentRoomCode = data.roomCode;
      roomPlayers = data.players || [];
      if (data.maxPlayers) currentRoomMaxPlayers = data.maxPlayers;
      selectedGameKey = data.selectedGame || 'inu_quiz';
      if (prevGameKey && selectedGameKey && prevGameKey !== selectedGameKey && screens.room && screens.room.classList.contains('active')) {
        const gameName = GAMES[selectedGameKey] ? GAMES[selectedGameKey].title : selectedGameKey;
        showToast(`방장이 게임을 [${gameName}](으)로 변경했습니다.`, 'info');
      }
      if (typeof data.gameRounds === 'number') selectedGameRounds = data.gameRounds;
      if (data.gameSideMode) selectedGameSideMode = data.gameSideMode;
      _updateGameExtraSettingsUI();
      isRoomGameActive = !!data.isGameActive;
      if (Array.isArray(data.activePlayerIds) && data.activePlayerIds.length > 0) {
        const mapped = data.activePlayerIds.map(id => roomPlayers.find(p => String(p.id) === String(id))).filter(Boolean);
        if (mapped.length > 0) activeGamePlayers = mapped;
      } else if (!isRoomGameActive) {
        activeGamePlayers = [];
      }

      const myId = P2P.getMyId();
      const me = roomPlayers.find(p => !p.isHost && (p.id === myId || (p.name === myNickname && !myId)));
      isMyReady = me ? !!me.isReady : false;

      if ($('room-code-display')) $('room-code-display').textContent = currentRoomCode;

      // 🎮 현재 게임 화면(screen-game)에 있을 때는 사이드바 갱신, 아니면 방 UI 갱신
      if (screens.game.classList.contains('active')) {
        _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);
      } else if (!screens.room.classList.contains('active')) {
        _enterRoomScreen();
      } else {
        _updateRoomUI();
      }

    } else if (data.type === 'UPDATE_PARTICIPANTS') {
      // 👥 실시간 참가자 목록 동기화 수신
      if (Array.isArray(data.list)) {
        roomPlayers = data.list;
        if (typeof data.isGameActive === 'boolean') {
          isRoomGameActive = data.isGameActive;
        }
        if (Array.isArray(data.activePlayerIds) && data.activePlayerIds.length > 0) {
          const mapped = data.activePlayerIds.map(id => roomPlayers.find(p => String(p.id) === String(id))).filter(Boolean);
          if (mapped.length > 0) activeGamePlayers = mapped;
        } else if (!isRoomGameActive) {
          activeGamePlayers = [];
        }

        const myId = P2P.getMyId();
        const me = roomPlayers.find(p => !p.isHost && (p.id === myId || (p.name === myNickname && !myId)));
        if (me) {
          isMyReady = !!me.isReady;
        }
        
        if (screens.game.classList.contains('active')) {
          _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);
        } else {
          _updateRoomUI();
        }
      }

    } else if (data.type === 'room_full') {
      showToast(data.message || '방이 가득 찼습니다.', 'error');
      P2P.destroy();
      showScreen('home');

    } else if (data.type === 'start_spectate') {
      console.log('[Guest] start_spectate 수신 -> 관전 모드로 게임 진입:', data.game);
      selectedGameKey = data.game;
      activeGamePlayers = data.players || [];
      isRoomGameActive = true; roomPlayers.forEach(p => p.isSpectating = undefined);
      if (typeof data.targetRounds === 'number') selectedGameRounds = data.targetRounds;
      if (data.sideMode) selectedGameSideMode = data.sideMode;
      _launchGame(data.game, activeGamePlayers, data.startWord, selectedGameRounds, selectedGameSideMode, true /* isSpectator */);
      showToast('[관전 모드] 진행 중인 게임의 실시간 관전을 시작합니다.', 'info');

    } else if (data.type === 'start_game') {
      console.log('[Guest] start_game 수신 -> 게임 실행:', data.game);
      selectedGameKey = data.game;
      activeGamePlayers = data.players || [...roomPlayers];
      isRoomGameActive = true;
      if (typeof data.targetRounds === 'number') selectedGameRounds = data.targetRounds;
      if (data.sideMode) selectedGameSideMode = data.sideMode;
      _launchGame(data.game, activeGamePlayers, data.startWord, selectedGameRounds, selectedGameSideMode);

    } else if (data.type === 'return_to_room') {
      _exitGameToRoom();

    } else if (data.type === 'player_left_game_broadcast') {
      // 다른 플레이어가 게임에서 나감
      console.log('[Guest] player_left_game_broadcast 수신:', data.name);
      activeGamePlayers = activeGamePlayers.filter(p => p.id !== data.playerId);
      // 🌟 게임 모듈에 탈주자 제거 알림 → 남은 인원끼리 게임 계속
      if (currentGameModule && typeof currentGameModule.removePlayer === 'function') {
        currentGameModule.removePlayer(data.playerId);
      }
      _showInGameAlert(`${data.name}님이 게임을 나갔습니다.`);
      _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);

    } else if (data.type === 'player_left_room_broadcast') {
      // 다른 플레이어가 방 자체를 나감
      const exists = roomPlayers.some(p => p.id === data.playerId) || activeGamePlayers.some(p => p.id === data.playerId);
      if (!exists) return; // 이미 처리된 퇴장이면 무시

      console.log('[Guest] player_left_room_broadcast 수신:', data.name);
      roomPlayers = roomPlayers.filter(p => p.id !== data.playerId);
      activeGamePlayers = activeGamePlayers.filter(p => p.id !== data.playerId);
      _appendChatMessage({ isSystem: true, text: `${data.name}님이 퇴장하셨습니다.` });
      _showInGameAlert(`${data.name}님이 방을 나갔습니다.`);
      showToast(`${data.name}님이 방을 나갔습니다.`, 'warn');
      _updateRoomUI();
      _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);

    } else if (data.type === 'KICK') {
      // 🚫 방장에 의해 강퇴 처리
      if (!data.targetId || data.targetId === P2P.getMyId()) {
        showToast(data.reason || '방장에 의해 강퇴되었습니다.', 'error');
        _leaveRoom();
      }

    } else if (data.type === 'DELEGATE_HOST') {
      console.log('[Guest] DELEGATE_HOST 패킷 수신:', data);
      _isMigratingHost = true;

      const myId = String(P2P.getMyId() || '');
      const targetHostId = data.targetHostId ? String(data.targetHostId) : '';
      const targetHostName = data.targetHostName;
      const roomCode = data.roomCode || currentRoomCode;
      const oldHostLeft = !!data.oldHostLeft;
      const guests = roomPlayers.filter(p => !p.isHost && (oldHostLeft ? (p.name !== data.oldHostName && p.id !== data.oldHostId) : true));
      const myIdxInGuests = guests.findIndex(p => (p.id && String(p.id) === myId) || p.name === myNickname);
      const amINewHost = (targetHostId && targetHostId === myId) || 
                         (targetHostName && targetHostName === myNickname) ||
                         (myIdxInGuests === 0);

      // 인게임 중인 경우 안전하게 대기실로 복귀
      if (currentGameModule) {
        try { currentGameModule.destroy(); } catch (_) {}
        currentGameModule = null;
      }
      if ($('game-content')) $('game-content').innerHTML = '';
      const overlayCount = $('overlay-countdown');
      if (overlayCount) overlayCount.classList.add('hidden');
      const overlayRes = $('overlay-game-result');
      if (overlayRes) overlayRes.classList.add('hidden');
      isRoomGameActive = false;
      activeGamePlayers = [];

      if (amINewHost) {
        // 🌟 내가 새로운 방장으로 승격!
        showToast('👑 방장으로 위임되었습니다!', 'success');
        _appendChatMessage({ isSystem: true, text: `👑 ${myNickname}님이 새로운 방장이 되었습니다!` });

        P2P.destroy();
        _promoteToHost(roomCode, oldHostLeft, { id: data.oldHostId, name: data.oldHostName });

      } else {
        // 👥 다른 게스트: 새 방장에게 재연결
        showToast(`👑 ${targetHostName}님이 새 방장이 되었습니다. 재연결 중...`, 'info');
        _appendChatMessage({ isSystem: true, text: `👑 ${targetHostName}님이 새로운 방장이 되었습니다.` });

        P2P.destroy();
        setTimeout(() => {
          _reconnectAsGuest(roomCode, targetHostName);
        }, 1200);
      }

    } else if (data.type === 'host_left_room') {
      // 🚪 방장이 방을 나감 -> 모든 참가자 로비/홈으로 자동 퇴장
      showToast(data.message || '방장이 퇴장하여 방이 종료되었습니다.', 'error');
      _leaveRoom();

    } else if (data.type === 'chat_msg') {
      // 내가 보낸 메시지의 에코 반사인 경우 무시
      if (data.senderId && data.senderId === P2P.getMyId()) return;
      // 상대방이 보낸 채팅 메시지 수신 및 렌더링
      _appendChatMessage(data, false);
    } else if (data.type === 'profile_emoji') {
      // 🌟 게스트 수신부: 내가 보낸 이모지의 에코 반사는 무시하고 화면에 표시
      if (data.senderId && data.senderId === P2P.getMyId()) return;
      _showProfileEmoji(data.senderId, data.emojiSrc);
    }
  }

  

  /* =====================================================================
     실시간 채팅 기능 (방 & 인게임 양방향 동기화)
     ===================================================================== */
/* =====================================================================
     실시간 채팅 기능 (방 & 인게임 양방향 동기화)
     ===================================================================== */
  const BAD_WORDS = ['시발', '씨발', '병신', '개새끼', '존나', '지랄', '엠창', '느금']; // 필요에 따라 단어 추가
  let _lastChatTime = 0;
  const CHAT_COOLDOWN = 1000; // 1초 쿨타임

  function _sendChatMessage(inputElId) {
    const inputEl = $(inputElId);
    if (!inputEl) return;
    const text = inputEl.value.trim();
    if (!text) return;

    // 1. 도배 제한 (1초 쿨타임 검사)
    const nowTs = Date.now();
    if (nowTs - _lastChatTime < CHAT_COOLDOWN) {
      if (typeof showToast === 'function') {
        showToast('메시지를 너무 빠르게 보낼 수 없습니다.', 'warn');
      }
      return;
    }

    // 2. 욕설 검열 (*로 치환)
    let cleanText = text;
    BAD_WORDS.forEach(word => {
      const regex = new RegExp(word, 'gi');
      cleanText = cleanText.replace(regex, '***');
    });

    _lastChatTime = nowTs;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const myBubbleItemForSend = SHOP_CHAT_BUBBLES.find(b => b.id === myChatBubble);
    const myBubbleClassForSend = (myBubbleItemForSend && myBubbleItemForSend.bubbleClass && myBubbleItemForSend.bubbleClass !== 'bubble-default') ? myBubbleItemForSend.bubbleClass : '';

    const msgObj = {
      type: 'chat_msg',
      senderId: P2P.getMyId(),
      senderName: myNickname,
      senderNameColor: myNicknameColor || null,
      isHost: P2P.isHost(),
      text: cleanText, // 검열된 텍스트 적용
      time: timeStr,
      chatBubbleClass: myBubbleClassForSend
    };

    // 내 화면에 메시지 렌더링
    _appendChatMessage(msgObj, true);

    // P2P 전송
    P2P.send(msgObj);

    // 입력창 비우기 및 포커스 유지
    inputEl.value = '';
    inputEl.focus();
  }

  function _appendChatMessage(data, isMe) {
    if (!data || !data.text) return;

    const targetContainers = [
      $('room-chat-messages'),
      $('game-chat-messages')
    ];

    if (data.isSystem) {
      targetContainers.forEach(container => {
        if (!container) return;
        const sysEl = document.createElement('div');
        sysEl.className = 'chat-system-msg';
        sysEl.textContent = data.text;
        container.appendChild(sysEl);
        container.scrollTop = container.scrollHeight;
      });
      return;
    }

    const isHost = data.isHost;
    const senderName = data.senderName || '플레이어';
    const senderColor = isMe ? myNicknameColor : data.senderNameColor;
    const time = data.time || '';

    // 말풍선 스킨 클래스 - 내 메시지면 내 설정, 상대 메시지면 상대가 보낸 bubbleClass 사용
    const myBubbleItem = SHOP_CHAT_BUBBLES.find(b => b.id === myChatBubble);
    const myBubbleClass = (myBubbleItem && myBubbleItem.bubbleClass && myBubbleItem.bubbleClass !== 'bubble-default') ? myBubbleItem.bubbleClass : '';
    const senderBubbleClass = data.chatBubbleClass || '';

    targetContainers.forEach(container => {
      if (!container) return;

      const msgEl = document.createElement('div');
      msgEl.className = 'chat-msg ' + (isMe ? 'me' : 'other');

      if (isMe) {
        msgEl.innerHTML = `
          <div class="chat-bubble ${myBubbleClass}">${_escapeHtml(data.text)}</div>
          <div class="chat-time">${_escapeHtml(time)}</div>
        `;
      } else {
        msgEl.innerHTML = `
          <div class="chat-sender-info">
            <span class="${senderColor === 'rainbow' ? 'nickname-rainbow' : ''}" style="${senderColor && senderColor !== 'rainbow' ? `color:${senderColor}; font-weight:800;` : ''}">${_escapeHtml(senderName)}</span>
            ${isHost ? '<i class="fa-solid fa-crown" style="color:var(--yellow);font-size:0.65rem;"></i>' : ''}
          </div>
          <div class="chat-bubble ${senderBubbleClass}">${_escapeHtml(data.text)}</div>
          <div class="chat-time">${_escapeHtml(time)}</div>
        `;
      }

      container.appendChild(msgEl);
      container.scrollTop = container.scrollHeight;
    });

    // 모바일에서 채팅창이 닫혀있는 동안 상대방 메시지 도착 시 뱃지 표시
    if (!isMe) {
      const gameChatPanel = $('game-chat-panel');
      const gameBadge = $('mobile-chat-badge');
      const gameSideBadge = $('game-side-chat-badge');
      if (gameChatPanel && !gameChatPanel.classList.contains('mobile-open')) {
        if (gameBadge) gameBadge.classList.remove('hidden');
        if (gameSideBadge) gameSideBadge.classList.remove('hidden');
      }

      const roomChatPanel = $('room-chat-panel');
      const roomBadge = $('room-mobile-chat-badge');
      const roomSideBadge = $('room-side-chat-badge');
      if (roomChatPanel && !roomChatPanel.classList.contains('mobile-open')) {
        if (roomBadge) roomBadge.classList.remove('hidden');
        if (roomSideBadge) roomSideBadge.classList.remove('hidden');
      }
    }

    Sound.playChat();
  }

  // ── 📱 모바일 인게임 채팅 팝업 제어 ──
  function _openMobileChat() {
    _pushHistory({ modal: 'chat' }, '#chat');
    const chatPanel = $('game-chat-panel');
    const backdrop = $('mobile-chat-backdrop');
    const badge = $('mobile-chat-badge');
    const sideBadge = $('game-side-chat-badge');
    if (chatPanel) chatPanel.classList.add('mobile-open');
    if (backdrop) backdrop.classList.remove('hidden');
    if (badge) badge.classList.add('hidden');
    if (sideBadge) sideBadge.classList.add('hidden');
    _scrollGameChatToBottom();
    const input = $('game-chat-input');
    if (input && window.innerWidth > 960) setTimeout(() => input.focus(), 150);
  }

  function _scrollGameChatToBottom() {
    const el = $('game-chat-messages');
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
    setTimeout(() => {
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  function _closeMobileChat() {
    if (_backHistoryIfModal('chat')) return;
    const chatPanel = $('game-chat-panel');
    const backdrop = $('mobile-chat-backdrop');
    if (chatPanel) chatPanel.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.add('hidden');
  }

  if ($('btn-mobile-chat-toggle')) $('btn-mobile-chat-toggle').addEventListener('click', _openMobileChat);
  if ($('btn-game-side-chat')) $('btn-game-side-chat').addEventListener('click', _openMobileChat);
  if ($('btn-close-mobile-chat')) $('btn-close-mobile-chat').addEventListener('click', _closeMobileChat);
  if ($('mobile-chat-backdrop')) $('mobile-chat-backdrop').addEventListener('click', _closeMobileChat);

  // ── 방 채팅 최신 메시지(맨 아래) 자동 스크롤 ──
  function _scrollRoomChatToBottom() {
    const el = $('room-chat-messages');
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
    setTimeout(() => {
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
    setTimeout(() => {
      if (el) el.scrollTop = el.scrollHeight;
    }, 200);
  }

  // ── 📱 모바일 방(대기실) 채팅 팝업 제어 ──
  function _openRoomMobileChat() {
    _pushHistory({ modal: 'room_chat' }, '#room_chat');
    const chatPanel = $('room-chat-panel');
    const backdrop = $('room-mobile-chat-backdrop');
    const badge = $('room-mobile-chat-badge');
    const sideBadge = $('room-side-chat-badge');
    if (chatPanel) chatPanel.classList.add('mobile-open');
    if (backdrop) backdrop.classList.remove('hidden');
    if (badge) badge.classList.add('hidden');
    if (sideBadge) sideBadge.classList.add('hidden');
    _scrollRoomChatToBottom();
    const input = $('room-chat-input');
    if (input && window.innerWidth > 960) setTimeout(() => input.focus(), 150);
  }

  function _closeRoomMobileChat() {
    if (_backHistoryIfModal('room_chat')) return;
    const chatPanel = $('room-chat-panel');
    const backdrop = $('room-mobile-chat-backdrop');
    if (chatPanel) chatPanel.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.add('hidden');
  }

  if ($('btn-room-mobile-chat-toggle')) $('btn-room-mobile-chat-toggle').addEventListener('click', _openRoomMobileChat);
  if ($('btn-room-side-chat')) $('btn-room-side-chat').addEventListener('click', _openRoomMobileChat);
  if ($('btn-close-room-mobile-chat')) $('btn-close-room-mobile-chat').addEventListener('click', _closeRoomMobileChat);
  if ($('room-mobile-chat-backdrop')) $('room-mobile-chat-backdrop').addEventListener('click', _closeRoomMobileChat);

  // 채팅 이벤트 바인딩
  $('btn-room-chat-send').addEventListener('click', () => _sendChatMessage('room-chat-input'));
  $('room-chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      _sendChatMessage('room-chat-input');
    }
  });

  $('btn-game-chat-send').addEventListener('click', () => _sendChatMessage('game-chat-input'));
  $('game-chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      _sendChatMessage('game-chat-input');
    }
  });

  function _onHostDisconnect() {
    console.log('[Host] 방 연결 종료');
  }

  function _onGuestDisconnect() {
    console.log('[Guest] 호스트와의 연결 끊김 감지. _isMigratingHost:', _isMigratingHost);
    // 방장 위임 마이그레이션 진행 중 발생하는 구 호스트와의 일시적 연결 종료는 무시
    if (_isMigratingHost) return;

    // 방장의 예기치 않은 연결 종료(브라우저 강제 종료, 네트워크 오류 등) 시:
    // 참가자 목록 중 최상단(첫 번째 게스트)에게 방장 권한 자동 위임!
    const myId = String(P2P.getMyId() || '');
    const remainingGuests = roomPlayers.filter(p => !p.isHost);
    if (remainingGuests.length > 0) {
      const nextHost = remainingGuests[0];
      const myIdxInGuests = remainingGuests.findIndex(p => (p.id && String(p.id) === myId) || p.name === myNickname);
      const amINextHost = (nextHost.id && String(nextHost.id) === myId) || 
                         (nextHost.name === myNickname) || 
                         (myIdxInGuests === 0);

      // 인게임 정리
      if (currentGameModule) {
        try { currentGameModule.destroy(); } catch (_) {}
        currentGameModule = null;
      }
      if ($('game-content')) $('game-content').innerHTML = '';
      const overlayCount = $('overlay-countdown');
      if (overlayCount) overlayCount.classList.add('hidden');
      const overlayRes = $('overlay-game-result');
      if (overlayRes) overlayRes.classList.add('hidden');
      isRoomGameActive = false;
      activeGamePlayers = [];

      _isMigratingHost = true;
      const roomCode = currentRoomCode;

      if (amINextHost) {
        showToast('방장의 연결이 끊어졌습니다. 방장 권한을 자동으로 이어받습니다...', 'warn');
        _appendChatMessage({ isSystem: true, text: `⚠️ 방장의 연결이 끊겨 ${myNickname}님이 새로운 방장이 되었습니다.` });
        P2P.destroy();
        _promoteToHost(roomCode, true, { name: '이전 방장' });
      } else {
        showToast(`방장의 연결이 끊어졌습니다. ${nextHost.name}님에게 방장이 위임됩니다. 재연결 중...`, 'warn');
        _appendChatMessage({ isSystem: true, text: `⚠️ 방장의 연결이 끊겨 ${nextHost.name}님이 새로운 방장이 되었습니다.` });
        P2P.destroy();
        setTimeout(() => {
          _reconnectAsGuest(roomCode, nextHost.name);
        }, 1500);
      }
      return;
    }

    showToast('방장이 퇴장하여 방이 해체되었습니다.', 'error');
    _leaveRoom(true);
  }

  /* =====================================================================
     6. 방 화면 (`screen-room`) UI 렌더링 및 제어
     ===================================================================== */
  function _enterRoomScreen(pushState = true) {
    showScreen('room', pushState);
    $('room-code-display').textContent = currentRoomCode;
    _updateRoomUI();
    _scrollRoomChatToBottom();
  }

  /* ── 개발자 모드: 봇 플레이어 추가 ── */
  function _addDevBotPlayer() {
    if (!isDevMode) return;
    if (roomPlayers.length >= 8) {
      showToast('최대 8명까지만 추가할 수 있습니다.', 'warn');
      return;
    }
    const botIdx = roomPlayers.length; // 1, 2, ...
    const botNames = ['테스트봇 알파', '테스트봇 베타', '테스트봇 감마', '테스트봇 델타', '테스트봇 엡실론', '테스트봇 제타', '테스트봇 에타', '테스트봇 세타'];
    const botIcons = ['fa-solid fa-robot', 'fa-solid fa-ghost', 'fa-solid fa-cat', 'fa-solid fa-dragon', 'fa-solid fa-bolt', 'fa-solid fa-gamepad', 'fa-solid fa-shield-halved', 'fa-solid fa-wand-magic-sparkles'];
    const botColors = ['#3182ce', '#805ad5', '#dd6b20', '#38a169', '#e53e3e', '#d69e2e', '#319795', '#b83280'];

    const botName = botNames[(botIdx - 1) % botNames.length] || `테스트봇 ${botIdx}`;
    const botIcon = botIcons[(botIdx - 1) % botIcons.length];
    const botColor = botColors[(botIdx - 1) % botColors.length];

    const newBot = {
      id: `dev-bot-${Date.now()}-${botIdx}`,
      name: botName,
      avatarIcon: botIcon,
      avatarColor: botColor,
      level: Math.min(99, botIdx * 5),
      exp: 100,
      isHost: false,
      isReady: true,
      isBot: true
    };
    roomPlayers.push(newBot);

    // 🌟 플레이어 수 만큼 라운드 자동 연동
    selectedGameRounds = roomPlayers.length;
    const roundValEl = $('game-round-val');
    if (roundValEl) roundValEl.textContent = `${selectedGameRounds} 라운드`;

    // 슬롯 여유 유지
    if (roomPlayers.length >= currentRoomMaxPlayers && currentRoomMaxPlayers < 8) {
      currentRoomMaxPlayers = Math.min(8, roomPlayers.length + 1);
    }

    _updateRoomUI();
    showToast(`${botName} 참가! (현재 ${roomPlayers.length}명 / 라운드: ${selectedGameRounds}R)`, 'success');
  }

  /* ── 개발자 모드: 봇 플레이어 추방(강퇴) ── */
  function _removeDevBotPlayer(botId) {
    if (!isDevMode) return;
    const pIndex = roomPlayers.findIndex(p => p.id === botId);
    if (pIndex === -1) return;
    const removedName = roomPlayers[pIndex].name;
    roomPlayers.splice(pIndex, 1);

    // 🌟 플레이어 수 만큼 라운드 자동 연동
    selectedGameRounds = Math.max(1, roomPlayers.length);
    const roundValEl = $('game-round-val');
    if (roundValEl) roundValEl.textContent = `${selectedGameRounds} 라운드`;

    _updateRoomUI();
    showToast(`${removedName} 추방 완료 (현재 ${roomPlayers.length}명 / 라운드: ${selectedGameRounds}R)`, 'info');
  }

  function _updateRoomUI() {
    const amIHost = P2P.isHost() || isHostPlayer || isDevMode;
    const playerCount = roomPlayers.length;

    if ($('room-capacity-text')) {
      $('room-capacity-text').textContent = `${playerCount} / ${currentRoomMaxPlayers}`;
    }
    if ($('player-count-badge')) {
      $('player-count-badge').textContent = `${playerCount} / ${currentRoomMaxPlayers}명`;
    }

    // 🎮 게임 진행 중 알림 배너 토글
    const alertEl = $('room-playing-alert');
    if (alertEl) {
      if (isRoomGameActive) {
        alertEl.classList.remove('hidden');
      } else {
        alertEl.classList.add('hidden');
      }
    }

    const listEl = $('player-list');
    listEl.innerHTML = '';

    roomPlayers.forEach(p => {
      const isThisHost = !!p.isHost;
      const isMe = (p.id === P2P.getMyId() || (isThisHost && amIHost));
      const isInActiveGame = isRoomGameActive && activeGamePlayers.some(ap => ap.id === p.id);
      const isReadyGuest = !isThisHost && !!p.isReady;
      const canManage = amIHost && !isThisHost && !isMe;

      const li = document.createElement('li');

      li.setAttribute('data-player-id', p.id);
      li.setAttribute('data-id', p.id);
      const cardTheme = p.profileCard || (isMe ? myProfileCard : 'default');
      const pFrame = p.avatarFrame || (isMe ? myAvatarFrame : 'default');
      const frameClass = _getAvatarFrameClass(pFrame);
      li.className = 'player-item' + 
        (isMe ? ' is-me' : '') +
        (isInActiveGame ? ' is-in-game' : (isReadyGuest ? ' ready' : (isThisHost ? ' host-item' : ''))) + 
        (canManage ? ' can-manage' : '');
      _applyProfileCardTheme(li, cardTheme);

      let readyBadgeHtml = '';
      if (isInActiveGame) {
        readyBadgeHtml = '<div class="ready-badge is-playing">게임 진행 중</div>';
      } else if (!isThisHost) {
        readyBadgeHtml = `<div class="ready-badge ${isReadyGuest ? 'is-ready' : ''}">${isReadyGuest ? '준비 완료' : '대기 중'}</div>`;
      }

      li.innerHTML = `
        <div class="player-avatar-wrap">
          <div class="player-avatar ${frameClass}" style="background:${p.avatarColor || '#38a169'};"><i class="${p.avatarIcon || 'fa-solid fa-paw'}"></i></div>
          <span class="player-level-badge ${_getLevelTierClass(p.level || 1)}">${p.level || 1}</span>
        </div>
        <div class="player-meta">
          <div class="player-name ${p.nameColor === 'rainbow' ? 'nickname-rainbow' : ''}" style="${p.nameColor && p.nameColor !== 'rainbow' ? `color:${p.nameColor}; font-weight:800;` : ''}">
            ${_escapeHtml(p.name)}
            ${isThisHost ? '<i class="fa-solid fa-crown crown-icon"></i>' : ''}
          </div>
          <div class="player-role"></div>
        </div>
        ${readyBadgeHtml}
        ${(isDevMode && !isThisHost) ? `<button type="button" class="btn-dev-kick-bot" data-bot-id="${p.id}" title="추방하기" style="background:rgba(229,62,62,0.12); color:#e53e3e; border:1px solid rgba(229,62,62,0.3); border-radius:6px; font-size:0.75rem; font-weight:800; cursor:pointer; padding:3px 8px; margin-left:8px; z-index:2; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-user-minus"></i> 추방</button>` : ''}
      `;

      // 🌟 참가자 클릭 이벤트 (전적 보기 & 방장 관리 메뉴)
      const triggerBtn = li.querySelector('.btn-manage-trigger');
      if (triggerBtn) {
        triggerBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          _openPlayerActionMenu(e, p);
        });
      }
      li.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-manage-trigger') && !e.target.closest('.btn-dev-kick-bot')) {
          _openPlayerActionMenu(e, p);
        }
      });

      // 개발자 모드 즉시 추방 버튼 리스너
      const devKickBtn = li.querySelector('.btn-dev-kick-bot');
      if (devKickBtn) {
        devKickBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          _removeDevBotPlayer(p.id);
        });
      }

      listEl.appendChild(li);
    });

    const slotsEl = $('player-slots');
    slotsEl.innerHTML = '';
    let effectiveMaxPlayers = currentRoomMaxPlayers;
    if (isDevMode) {
      effectiveMaxPlayers = Math.min(8, Math.max(playerCount + 1, currentRoomMaxPlayers));
      currentRoomMaxPlayers = effectiveMaxPlayers;
    }
    const emptyCount = Math.max(0, effectiveMaxPlayers - playerCount);
    for (let i = 0; i < emptyCount; i++) {
      const slot = document.createElement('div');
      slot.className = 'player-slot-empty can-invite';
      if (isDevMode) {
        slot.title = '클릭하여 테스트 플레이어(봇) 추가';
        slot.style.borderColor = 'var(--primary)';
        slot.style.background = 'rgba(76, 175, 80, 0.05)';
        slot.innerHTML = `
          <div class="slot-avatar" style="color:var(--primary);"><i class="fa-solid fa-robot"></i></div>
          <div class="slot-text" style="color:var(--primary); font-weight:800;">참가자 대기 중... (클릭 시 봇 추가)</div>
        `;
        slot.addEventListener('click', () => {
          _addDevBotPlayer();
        });
      } else {
        slot.title = '참가자 대기 중';
        slot.innerHTML = `
          <div class="slot-avatar"><i class="fa-solid fa-user"></i></div>
          <div class="slot-text">참가자 대기 중...</div>
        `;
      }
      slotsEl.appendChild(slot);
    }

    document.querySelectorAll('.room-game-btn').forEach(btn => {
      const gKey = btn.dataset.game;
      btn.classList.toggle('selected', gKey === selectedGameKey);

      const gDef = GAMES[gKey];
      const isOverCap = !isDevMode && gDef && gDef.maxPlayers && playerCount > gDef.maxPlayers;

      if (isOverCap) {
        btn.classList.add('disabled-3p');
        btn.title = `${gDef.title}은(는) ${gDef.maxPlayers}인 전용 게임입니다 (현재 ${playerCount}명 접속 중)`;
      } else {
        btn.classList.remove('disabled-3p');
        btn.title = '';
      }

      if (amIHost && !isOverCap) {
        btn.classList.remove('disabled-game');
      } else {
        btn.classList.add('disabled-game');
      }
    });

    const selGameObj = GAMES[selectedGameKey];
    if ($('selected-game-name')) {
      $('selected-game-name').textContent = selGameObj ? `${selGameObj.title} 선택됨` : '게임을 선택해 주세요';
    }

    // 🌟 현재 선택된 게임 프리뷰 요약 바 갱신 (준비/대기 토글 시에도 절대 사라지지 않고 항상 표시 유지)
    const bannerEl = $('room-selected-game-banner');
    if (bannerEl) {
      bannerEl.classList.remove('hidden');
      bannerEl.style.display = 'flex';
      bannerEl.style.visibility = 'visible';
      bannerEl.style.opacity = '1';

      if (selGameObj) {
        try {
          const iconEl = $('rsgb-icon');
          const titleEl = $('rsgb-title');
          const tagEl = $('rsgb-tag');
          const descEl = $('rsgb-desc');

          const is2P = (selGameObj.maxPlayers === 2);
          const tooltipMeta = (typeof GAME_TOOLTIP_DATA !== 'undefined' && GAME_TOOLTIP_DATA[selectedGameKey]) ? GAME_TOOLTIP_DATA[selectedGameKey] : null;
          if (iconEl) iconEl.className = (tooltipMeta && tooltipMeta.icon) || selGameObj.icon || 'fa-solid fa-gamepad';
          if (titleEl) titleEl.textContent = selGameObj.title;
          if (tagEl) {
            tagEl.textContent = is2P ? '2인' : (selGameObj.maxPlayers ? `2~${selGameObj.maxPlayers}인` : '다인원');
            tagEl.className = `rsgb-tag ${is2P ? 'tag-2p' : 'tag-multi'}`;
          }
          if (descEl) descEl.textContent = (tooltipMeta && tooltipMeta.desc) || selGameObj.desc || '';
        } catch (e) {
          console.warn('Banner update error:', e);
        }
      }
    }

    // 🌟 모바일 방 화면: 준비 상태 토글 시 패널 스크롤 밀림 방지하여 배너 항상 고정보장
    const centerPanelEl = document.querySelector('.room-center-panel');
    if (centerPanelEl && centerPanelEl.scrollTop !== 0) centerPanelEl.scrollTop = 0;
    const selectPanelEl = document.querySelector('.game-select-panel');
    if (selectPanelEl && selectPanelEl.scrollTop !== 0) selectPanelEl.scrollTop = 0;

    if ($('game-select-role-hint')) {
      if (playerCount >= 3) {
        $('game-select-role-hint').textContent = amIHost ? '3인 이상은 2~5인 게임만 선택 가능' : '방장만 변경 가능';
      } else {
        $('game-select-role-hint').textContent = amIHost ? '클릭하여 게임 변경' : '방장만 변경 가능';
      }
    }

    const btnReady = $('btn-ready');
    const btnStart = $('btn-start-game');
    const readyHint = $('ready-hint');
    const guestWaitHint = $('guest-wait-hint');

    if (amIHost || isDevMode) {
      btnReady.classList.add('hidden');
      btnStart.classList.remove('hidden');
      guestWaitHint.classList.add('hidden');

      if (isDevMode) {
        btnStart.disabled = false;
        btnStart.classList.add('ready-pulse');
        readyHint.textContent = '개발자 모드: 1인 테스트 시작 가능';
      } else {
        const guests = roomPlayers.filter(p => !p.isHost);
        const allGuestsReady = guests.length >= 1 && guests.every(p => !!p.isReady);
        const isSelectedOverCapacity = selGameObj && selGameObj.maxPlayers && playerCount > selGameObj.maxPlayers;

        btnStart.disabled = !allGuestsReady || isSelectedOverCapacity;
        if (allGuestsReady && !isSelectedOverCapacity) {
          btnStart.classList.add('ready-pulse');
        } else {
          btnStart.classList.remove('ready-pulse');
        }

        if (guests.length === 0) {
          readyHint.textContent = '게임을 시작하려면 최소 1명의 참가자가 필요합니다.';
        } else if (isSelectedOverCapacity) {
          readyHint.textContent = `${selGameObj.title}은(는) ${selGameObj.maxPlayers}인 전용 게임입니다. 다른 게임을 선택해 주세요.`;
        } else if (!allGuestsReady) {
          const notReadyCount = guests.filter(p => !p.isReady).length;
          readyHint.textContent = `모든 참가자가 준비 완료되어야 시작할 수 있습니다. (${notReadyCount}명 준비 중)`;
        } else {
          readyHint.textContent = `모든 참가자(${playerCount}명) 준비 완료! 게임을 시작하세요.`;
        }
      }

    } else {
      btnReady.classList.remove('hidden');
      btnStart.classList.add('hidden');
      guestWaitHint.classList.remove('hidden');

      btnReady.className = 'btn btn-ready' + (isMyReady ? ' is-ready' : '');
      btnReady.querySelector('span').textContent = isMyReady ? '준비 완료' : '준비하기';
      btnReady.querySelector('i').className = isMyReady ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle';

      readyHint.textContent = isMyReady
        ? '준비 완료! 방장이 게임을 시작할 때까지 기다려 주세요.'
        : '준비하기 버튼을 눌러 게임에 참여하세요.';
    }

    _updateGameExtraSettingsUI();
  }

  // 게임 선택 클릭 이벤트 (방장 및 개발자 모드)
  document.querySelectorAll('.room-game-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const amIHost = P2P.isHost() || isHostPlayer;
      if (!amIHost && !isDevMode) {
        showToast('게임 선택은 방장만 가능합니다.', 'warn');
        return;
      }
      const gKey = btn.dataset.game;
      const gDef = GAMES[gKey];
      if (!isDevMode && gDef && gDef.maxPlayers && roomPlayers.length > gDef.maxPlayers) {
        showToast(`${gDef.title}은(는) ${gDef.maxPlayers}인 전용 게임입니다 (현재 ${roomPlayers.length}명).`, 'warn');
        return;
      }

      if (gKey && GAMES[gKey]) {
        Sound.playClick();
        selectedGameKey = gKey;
        _broadcastRoomState();
        _updateRoomUI();
        if (amIHost && currentRoomCode && window.FirebaseLobby && typeof window.FirebaseLobby.updateRoomGame === 'function') {
          window.FirebaseLobby.updateRoomGame(currentRoomCode, selectedGameKey);
        }
      }
    });
  });

  // 게스트 준비 버튼 토글
  $('btn-ready').addEventListener('click', (e) => {
    if (e) e.preventDefault();
    const amIHost = P2P.isHost() || isHostPlayer;
    if (amIHost) return;
    isMyReady = !isMyReady;
    Sound.playReady();
    P2P.send({ type: 'toggle_ready', isReady: isMyReady });
    _updateRoomUI();
    const cp = document.querySelector('.room-center-panel');
    if (cp && cp.scrollTop !== 0) cp.scrollTop = 0;
    const sp = document.querySelector('.game-select-panel');
    if (sp && sp.scrollTop !== 0) sp.scrollTop = 0;
  });

  // 방장 게임 시작 (개발자 모드 포함)
  $('btn-start-game').addEventListener('click', () => {
    const amIHost = P2P.isHost() || isHostPlayer;
    if (!amIHost && !isDevMode) return;
    Sound.playStart();
    const curGameDef = GAMES[selectedGameKey];
    if (!isDevMode && curGameDef && curGameDef.maxPlayers && roomPlayers.length > curGameDef.maxPlayers) {
      showToast(`${curGameDef.title}은(는) ${curGameDef.maxPlayers}인 전용 게임입니다.`, 'warn');
      return;
    }

    // 🎯 게임 참가자 목록 설정
    let finalPlayers = [...roomPlayers];
    activeGamePlayers = finalPlayers;

    let startWord = null;

    const currentRounds = selectedGameRounds || 3;
    const currentSide = selectedGameSideMode || 'shuffle';

    if (P2P.isHost()) {
      isRoomGameActive = true;
      P2P.send({
        type: 'start_game',
        game: selectedGameKey,
        players: finalPlayers,
        targetRounds: currentRounds,
        sideMode: currentSide,
        startWord: startWord
      });
      setTimeout(() => {
        _broadcastRoomState();
      }, 50);
      // 🌐 Firebase에 게임 진행 상태 기록
      if (window.FirebaseLobby && typeof window.FirebaseLobby.updateRoomStatus === 'function') {
        window.FirebaseLobby.updateRoomStatus(currentRoomCode, 'playing');
      }
    }

    _launchGame(selectedGameKey, finalPlayers, startWord, currentRounds, currentSide);
  });

  function _shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // 방 나가기
  $('btn-leave-room').addEventListener('click', async () => {
    const amIHost = P2P.isHost() || isHostPlayer;
    const myPeerId = String(P2P.getMyId() || '');
    const remainingGuests = roomPlayers.filter(p => !p.isHost && (!p.id || String(p.id) !== myPeerId));
    const willDelegate = amIHost && remainingGuests.length > 0;

    const ok = await showConfirmDialog({
      title: '방 나가기',
      message: willDelegate
        ? `방을 나가시겠습니까? ${remainingGuests[0].name}님에게 방장이 자동 위임됩니다.`
        : '방을 나가시겠습니까? 로비 화면으로 돌아갑니다.',
      confirmText: '나가기',
      cancelText: '취소',
      icon: 'fa-solid fa-door-open',
      isDanger: true
    });
    if (ok) {
      if (!amIHost) {
        try {
          P2P.send({ type: 'guest_leave_room', name: myNickname });
        } catch (_) {}
      }
      await _leaveRoom();
    }
  });

  function _resetChatLogs() {
    const roomChatEl = $('room-chat-messages');
    const gameChatEl = $('game-chat-messages');
    if (roomChatEl) {
      roomChatEl.innerHTML = '<div class="chat-system-msg">방 채팅에 입장했습니다. 매너 있는 대화를 나눠보세요!</div>';
    }
    if (gameChatEl) {
      gameChatEl.innerHTML = '<div class="chat-system-msg">게임 중 실시간 응원과 대화를 나눠보세요!</div>';
    }
    _scrollRoomChatToBottom();
  }

  async function _leaveRoom(pushState = true) {
    const amIHost = P2P.isHost() || isHostPlayer;
    const myPeerId = String(P2P.getMyId() || '');

    if (amIHost) {
      // 🌐 방장이 퇴장할 때: 남아있는 다른 게스트가 있는지 확인 (ID 기반 검증으로 동명/테스트 계정 지원)
      const remainingGuests = roomPlayers.filter(p => !p.isHost && (!p.id || String(p.id) !== myPeerId));

      if (remainingGuests.length > 0) {
        // 남은 인원 중 최상단(첫 번째) 게스트에게 방장 자동 위임!
        const nextHost = remainingGuests[0];
        console.log('[Host] 방장 퇴장 -> 최상단 게스트에게 자동 위임:', nextHost.name, nextHost.id);

        if (window.FirebaseLobby && typeof window.FirebaseLobby.cancelRoomOnDisconnect === 'function') {
          try {
            await window.FirebaseLobby.cancelRoomOnDisconnect(currentRoomCode);
          } catch (_) {}
        }

        try {
          P2P.send({
            type: 'DELEGATE_HOST',
            targetHostId: nextHost.id,
            targetHostName: nextHost.name,
            roomCode: currentRoomCode,
            oldHostLeft: true,
            oldHostId: P2P.getMyId(),
            oldHostName: myNickname
          });
        } catch (_) {}

        showToast(`${nextHost.name}님에게 방장을 위임하고 퇴장합니다.`, 'info');

        // 🌟 WebRTC 패킷이 네트워크 데이터 채널을 통해 게스트에게 완전히 도달할 수 있도록 300ms 대기
        await new Promise(r => setTimeout(r, 300));

      } else {
        // 남은 게스트가 없으면 방 정상 종료 및 삭제
        try {
          P2P.send({
            type: 'host_left_room',
            message: '방장이 퇴장하여 방이 종료되었습니다.'
          });
        } catch (_) {}

        if (currentRoomCode && window.FirebaseLobby && typeof window.FirebaseLobby.removeRoom === 'function') {
          window.FirebaseLobby.removeRoom(currentRoomCode);
        }
      }
    }

    if (currentGameModule) {
      try { currentGameModule.destroy(); } catch (_) {}
      currentGameModule = null;
    }
    if ($('game-content')) $('game-content').innerHTML = '';
    const overlayCount = $('overlay-countdown');
    if (overlayCount) overlayCount.classList.add('hidden');
    const overlayRes = $('overlay-game-result');
    if (overlayRes) overlayRes.classList.add('hidden');

    P2P.destroy();
    roomPlayers = [];
    activeGamePlayers = [];
    isHostPlayer = false;
    isMyReady = false;
    isDevMode = false;
    currentRoomCode = '';
    _isMigratingHost = false;
    _resetChatLogs();
    showScreen('home');
  }

  // 🌟 방 코드 복사 (아이콘 시각 피드백 연동 및 룸 코드 클릭 복사)
  const btnCopyRoom = $('btn-copy-room-code');
  if (btnCopyRoom) {
    btnCopyRoom.addEventListener('click', () => {
      _copyToClipboard(currentRoomCode, btnCopyRoom);
    });
  }
  const roomCodeDisplay = $('room-code-display');
  if (roomCodeDisplay) {
    roomCodeDisplay.addEventListener('click', () => {
      _copyToClipboard(currentRoomCode, roomCodeDisplay);
    });
  }
  const btnCopyCode2 = $('btn-copy-code');
  if (btnCopyCode2) {
    btnCopyCode2.addEventListener('click', () => {
      _copyToClipboard(currentRoomCode, btnCopyCode2);
    });
  }

  function _copyToClipboard(text, btnEl) {
    if (!text || text === '——') return;
    const onSuccess = () => {
      showToast('방 코드가 복사되었습니다: ' + text, 'success');
      if (btnEl) {
        const icon = btnEl.querySelector('i');
        if (icon) {
          const origClass = icon.className;
          icon.className = 'fa-solid fa-check';
          icon.style.color = 'var(--green)';
          setTimeout(() => {
            icon.className = origClass;
            icon.style.color = '';
          }, 1500);
        }
      }
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(onSuccess)
        .catch(() => _fallbackCopy(text, onSuccess));
    } else {
      _fallbackCopy(text, onSuccess);
    }
  }
  function _fallbackCopy(text, onSuccess) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (onSuccess) onSuccess();
      else showToast('방 코드가 복사되었습니다: ' + text, 'success');
    } catch (_) {
      showToast('복사 실패. 코드를 직접 입력하세요.', 'error');
    }
    document.body.removeChild(ta);
  }

  /* =====================================================================
     7. 게임 실행 및 게임 화면 (`screen-game`)
     ===================================================================== */
  function _runCountdown(onFinished) {
    const overlay = $('overlay-countdown');
    const numEl = $('countdown-number');
    const subEl = $('countdown-sub');

    overlay.classList.remove('hidden');
    let count = 3;
    numEl.textContent = count;
    subEl.textContent = '잠시 후 게임이 시작됩니다!';
    Sound.playCountdown(3);

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        numEl.textContent = count;
        Sound.playCountdown(count);
      } else if (count === 0) {
        numEl.textContent = 'START!';
        subEl.textContent = '게임 시작!';
        Sound.playCountdown(0);
        Sound.playStart();
      } else {
        clearInterval(interval);
        overlay.classList.add('hidden');
        if (typeof onFinished === 'function') onFinished();
      }
    }, 900);
  }

  function _launchGame(gameKey, playersList, startWord, targetRounds, sideMode, isSpectator = false) {
    const gameObj = GAMES[gameKey];
    if (!gameObj) return;

    if (currentGameModule) {
      try { currentGameModule.destroy(); } catch (_) {}
      currentGameModule = null;
    }

    let currentActivePlayers = playersList || activeGamePlayers || [...roomPlayers];
    const isSinglePlayerGame = (gameObj.maxPlayers === 1);
    if (isDevMode && currentActivePlayers.length === 1 && !isSinglePlayerGame) {
      currentActivePlayers = [
        currentActivePlayers[0],
        { id: 'dev-bot-alpha', name: '테스트봇 알파', avatarIcon: 'fa-solid fa-robot', avatarColor: '#3182ce', level: 10, exp: 100, isHost: false, isReady: true, isBot: true }
      ];
    }
    if (isDevMode && gameObj.maxPlayers === 2 && currentActivePlayers.length > 2) {
      currentActivePlayers = currentActivePlayers.slice(0, 2);
    }
    activeGamePlayers = currentActivePlayers;

    // 🌟 개발자 모드 시 플레이어 수 만큼 라운드 수 자동 연동
    const rounds = (isDevMode && roomPlayers.length > 0)
      ? roomPlayers.length
      : ((typeof targetRounds === 'number') ? targetRounds : (selectedGameRounds || 3));
    const side = sideMode || selectedGameSideMode || 'shuffle';

    currentGameModule = gameObj.module;
    $('current-game-title').textContent = gameObj.title;
    $('game-room-code').textContent = currentRoomCode;
    $('game-content').innerHTML = '';

    // 인게임 사이드바 알림 영역 초기화
    if ($('gsp-alert-container')) $('gsp-alert-container').innerHTML = '';

    // 인게임 좌측 참가자 목록 사이드바 렌더링
    _renderInGamePlayerSidebar(currentActivePlayers, gameKey);

    showScreen('game');
    _hideResultOverlay();

    const amISpectator = isSpectator || !currentActivePlayers.some(p => String(p.id) === String(P2P.getMyId()));
    const context = {
      players: currentActivePlayers, // 🌟 오직 게임에 참여 중인 플레이어들만 포함 (관전자는 제외되어 턴 넘김 버그 원천 차단)
      myId: P2P.getMyId() || (isDevMode ? 'dev-player' : ''),
      myNickname: myNickname || '익명',
      isHost: P2P.isHost() || isDevMode,
      isDevMode: isDevMode, // 🌟 개발자 1인 연속 턴 모드 플래그
      startWord: startWord,
      targetRounds: rounds,
      sideMode: side,
      isSpectator: amISpectator // 🌟 관전자 여부 플래그
    };

    // 상단 인게임 헤더 관전 모드 뱃지 표시
    const gameRoomCodeEl = $('game-room-code');
    if (gameRoomCodeEl) {
      gameRoomCodeEl.innerHTML = amISpectator
        ? `${currentRoomCode} <span class="spectator-mode-badge"><i class="fa-solid fa-eye"></i> 관전 중</span>`
        : currentRoomCode;
    }

    console.log('[App] 게임 런치 context:', gameKey, 'targetRounds:', rounds, 'sideMode:', side, 'players:', currentActivePlayers.map(p=>p.name));

    const needCountdown = (gameKey === 'inu_quiz');
    if (needCountdown) {
      _runCountdown(() => {
        currentGameModule.init($('game-content'), _handleGameResult, context);
      });
    } else {
      currentGameModule.init($('game-content'), _handleGameResult, context);
    }
  }

  // ── 인게임 참가자 사이드바 렌더링 ──
  function _renderInGamePlayerSidebar(currentActivePlayers, gameKey, currentTurnPlayerIdOrIdx) {
    // 🌟 턴 인덱스/ID 영구 기억 및 유지
    if (currentTurnPlayerIdOrIdx !== undefined && currentTurnPlayerIdOrIdx !== null) {
      lastKnownTurnPlayerIdOrIdx = currentTurnPlayerIdOrIdx;
    } else {
      currentTurnPlayerIdOrIdx = lastKnownTurnPlayerIdOrIdx;
    }

    // 🌟 1. 활성 플레이어 목록 확보 (절대 빈 배열이 되지 않도록 3단계 fallback)
    let list = (Array.isArray(currentActivePlayers) && currentActivePlayers.length > 0)
      ? currentActivePlayers
      : (Array.isArray(activeGamePlayers) && activeGamePlayers.length > 0)
        ? activeGamePlayers
        : roomPlayers.filter(p => !p.isSpectator);

    if (!list || list.length === 0) {
      list = roomPlayers;
    }

    const myId = String(P2P.getMyId() || (isDevMode ? 'dev-player' : ''));
    // 🌟 2. 관전자 목록은 list에 포함되지 않은 나머지 유저들로만 정확하게 필터링
    const spectators = roomPlayers.filter(rp => !list.some(ap => String(ap.id) === String(rp.id)) && rp.isSpectating !== false);

    if ($('gsp-count')) $('gsp-count').textContent = list.length + (spectators.length > 0 ? ` (관전 ${spectators.length})` : '');
    const listEl = $('gsp-player-list');
    if (!listEl) return;
    listEl.innerHTML = '';

// 1. 게임 플레이어 목록 렌더링
    list.forEach((p, idx) => {
      const isMe = (String(p.id) === myId);
      const isTurn = _checkIsPlayerTurn(p, idx, currentTurnPlayerIdOrIdx, gameKey);

      let orderTag = _getPlayerOrderTag(gameKey, idx, isTurn);

      const amIHost = P2P.isHost() || isHostPlayer;
      const canManage = amIHost && !p.isHost && !isMe;
      const li = document.createElement('li');
      li.id = `gsp-item-${idx}`;

      // 🌟 [추가 1] 인게임 플레이어 ID 속성 부여
      li.setAttribute('data-player-id', p.id);
      const cardTheme = p.profileCard || (isMe ? myProfileCard : 'default');
      const pFrame = p.avatarFrame || (isMe ? myAvatarFrame : 'default');
      const frameClass = _getAvatarFrameClass(pFrame);
      li.className = 'gsp-item' + (isMe ? ' is-me' : '') + (isTurn ? ' is-current-turn' : '') + (canManage ? ' can-manage' : '');
      _applyProfileCardTheme(li, cardTheme);

      li.innerHTML = `
        <div class="gsp-avatar ${frameClass}" style="background:${p.avatarColor || '#38a169'};"><i class="${p.avatarIcon || 'fa-solid fa-paw'}"></i></div>
        <div class="gsp-meta">
          <div class="gsp-name ${p.nameColor === 'rainbow' ? 'nickname-rainbow' : ''}" style="${p.nameColor && p.nameColor !== 'rainbow' ? `color:${p.nameColor}; font-weight:800;` : ''}">
            ${_escapeHtml(p.name)}
            ${p.isHost ? '<i class="fa-solid fa-crown" style="color:var(--yellow);font-size:0.75rem;"></i>' : ''}
          </div>
          <div class="gsp-tag" style="font-weight:700;">${orderTag}</div>
        </div>
      `;

      const triggerBtn = li.querySelector('.btn-manage-trigger');
      if (triggerBtn) {
        triggerBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          _openPlayerActionMenu(e, p);
        });
      }
      li.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-manage-trigger')) {
          if (currentGameModule && typeof currentGameModule.openOpponentViewer === 'function' && !isMe) {
            currentGameModule.openOpponentViewer(p.id);
            return;
          }
          _openPlayerActionMenu(e, p);
        }
      });

      listEl.appendChild(li);
    });

    // 2. 🌟 관전자 목록 섹션 렌더링
    if (spectators.length > 0) {
      const specHeader = document.createElement('li');
      specHeader.className = 'gsp-spectator-header';
      specHeader.innerHTML = `<i class="fa-solid fa-eye"></i> 관전자 (${spectators.length}명)`;
      listEl.appendChild(specHeader);

      spectators.forEach(sp => {
        const isMe = (String(sp.id) === myId);
        const amIHost = P2P.isHost() || isHostPlayer;
        const canManage = amIHost && !sp.isHost && !isMe;
        const li = document.createElement('li');

        // 🌟 [추가 2] 관전자 ID 속성 부여
        li.setAttribute('data-player-id', sp.id);
        const cardTheme = sp.profileCard || (isMe ? myProfileCard : 'default');
        const spFrame = sp.avatarFrame || (isMe ? myAvatarFrame : 'default');
        const spFrameClass = _getAvatarFrameClass(spFrame);
        li.className = 'gsp-item gsp-spectator-item' + (isMe ? ' is-me' : '') + (canManage ? ' can-manage' : '');
        _applyProfileCardTheme(li, cardTheme);

        li.innerHTML = `
          <div class="gsp-avatar ${spFrameClass}" style="background:${sp.avatarColor || '#718096'}; opacity:0.85;"><i class="${sp.avatarIcon || 'fa-solid fa-user'}"></i></div>
          <div class="gsp-meta">
            <div class="gsp-name ${sp.nameColor === 'rainbow' ? 'nickname-rainbow' : ''}" style="${sp.nameColor && sp.nameColor !== 'rainbow' ? `color:${sp.nameColor}; font-weight:800;` : ''}">
              ${_escapeHtml(sp.name)}
            </div>
            <div class="gsp-tag" style="color:var(--t3);font-size:0.7rem;"><i class="fa-regular fa-eye"></i> 실시간 관전 중</div>
          </div>
        `;

        const triggerBtn = li.querySelector('.btn-manage-trigger');
        if (triggerBtn) {
          triggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            _openPlayerActionMenu(e, sp);
          });
        }
        li.addEventListener('click', (e) => {
          if (!e.target.closest('.btn-manage-trigger')) {
            _openPlayerActionMenu(e, sp);
          }
        });

        listEl.appendChild(li);
      });
    }
    // 🌟 사이드바 재렌더링 후 현재 활성화된 이모지가 있다면 즉시 복원
    if (typeof activeProfileEmojis !== 'undefined') {
      Object.keys(activeProfileEmojis).forEach(pId => {
        if (activeProfileEmojis[pId]) {
          _renderProfileEmojiDOM(pId, activeProfileEmojis[pId].emojiSrc);
        }
      });
    }

    if (typeof currentGameModule !== 'undefined' && currentGameModule && typeof currentGameModule.onSidebarRedrawn === 'function') {
      currentGameModule.onSidebarRedrawn();
    }
    _triggerTurnScroll();
  }

  function _checkIsPlayerTurn(playerObj, playerIdx, currentTurnPlayerIdOrIdx, gameKey) {
    return false;
  }

  function _getPlayerOrderTag(gameKey, idx, isTurn) {
    return `<span style="color:var(--t3);font-weight:600;">참가자 ${idx + 1}</span>`;
  }

  function updateInGameTurn(currentTurnPlayerIdOrIdx) {
    if (currentTurnPlayerIdOrIdx !== undefined && currentTurnPlayerIdOrIdx !== null) {
      lastKnownTurnPlayerIdOrIdx = currentTurnPlayerIdOrIdx;
    }

    const list = activeGamePlayers.length > 0 ? activeGamePlayers : roomPlayers;
    list.forEach((p, idx) => {
      const el = document.getElementById(`gsp-item-${idx}`);
      if (!el) return;

      const isTurn = _checkIsPlayerTurn(p, idx, currentTurnPlayerIdOrIdx, selectedGameKey);

      el.classList.toggle('is-current-turn', !!isTurn);

      const tagEl = el.querySelector('.gsp-tag');
      if (tagEl && !el.classList.contains('is-solved')) {
        tagEl.innerHTML = _getPlayerOrderTag(selectedGameKey, idx, isTurn);
      }
    });

    _triggerTurnScroll();
  }

  // 🌟 현재 턴 플레이어로 인게임 참가자 목록 자연스럽게 스크롤 (부드러운 최상단 이동)
  function _scrollToCurrentTurnPlayer() {
    const listEl = $('gsp-player-list');
    if (!listEl) return;
    const currentTurnEl = listEl.querySelector('.gsp-item.is-current-turn');
    if (!currentTurnEl) return;

    // 현재 턴 플레이어가 목록 최상단에 오도록 자연스럽게 스크롤 (스크롤 한계 도달 시 자연스럽게 멈춤)
    const listRect = listEl.getBoundingClientRect();
    const itemRect = currentTurnEl.getBoundingClientRect();
    const targetScrollTop = listEl.scrollTop + (itemRect.top - listRect.top);
    listEl.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
  }

  // 🌟 턴 변경 및 DOM 렌더링 후 스크롤이 확실하게 동작하도록 다중 타이머 안전 호출
  function _triggerTurnScroll() {
    requestAnimationFrame(() => {
      _scrollToCurrentTurnPlayer();
    });
    setTimeout(() => {
      _scrollToCurrentTurnPlayer();
    }, 60);
    setTimeout(() => {
      _scrollToCurrentTurnPlayer();
    }, 180);
  }

  // 게임 결과 콜백
  function _handleGameResult(win, drawInfo, customLeaderboard) {
    let resultType = 'lose';
    let iAmWinner = false;

    if (customLeaderboard && customLeaderboard.length > 0) {
      const winner = customLeaderboard[0];
      iAmWinner = (winner.name === myNickname) || (winner.id && String(winner.id) === String(P2P.getMyId()));
      resultType = iAmWinner ? 'win' : 'lose';
    } else if (drawInfo && typeof drawInfo === 'object') {
      resultType = 'draw';
    } else if (win === true) {
      resultType = 'win';
      iAmWinner = true;
    } else {
      resultType = 'lose';
    }

    // 🌟 경험치 지급 및 레벨업 산출 (완주 기본 + 승패 + 게임별 진취도)
    let expRewardInfo = null;
    try {
      const expGain = _calcGameProgressionExp(selectedGameKey, resultType, { win, drawInfo, customLeaderboard });
      expRewardInfo = _addExperience(expGain);
    } catch (e) {
      console.warn('[EXP] 경험치 지급 오류:', e);
    }

    _showResultOverlay(win, drawInfo, customLeaderboard, expRewardInfo);
  }

  function _showResultOverlay(win, drawInfo, customLeaderboard, expRewardInfo = null) {
    const iconEl = $('result-icon');
    const titleEl = $('result-title');
    const msgEl = $('result-message');
    const scoreRowEl = $('result-score-row');

    scoreRowEl.innerHTML = '';

    const reasonMsg = (typeof drawInfo === 'string') ? drawInfo : null;
    const isDrawObject = (drawInfo && typeof drawInfo === 'object');

    if (customLeaderboard && customLeaderboard.length > 0) {
      const winner = customLeaderboard[0];
      const iAmWinner = winner.name === myNickname;

      iconEl.innerHTML = iAmWinner ? '<i class="fa-solid fa-trophy"></i>' : '<i class="fa-solid fa-medal"></i>';
      iconEl.style.color = iAmWinner ? 'var(--green)' : 'var(--yellow)';
      iconEl.style.background = iAmWinner ? 'var(--green-tint)' : 'var(--yellow-tint)';
      iconEl.style.borderColor = iAmWinner ? 'var(--green-border)' : 'var(--yellow-border)';

      titleEl.textContent = iAmWinner ? '1위 달성! 우승!' : `${winner.name}님 우승!`;
      titleEl.style.color = iAmWinner ? 'var(--green-deep)' : 'var(--t1)';
      msgEl.textContent = reasonMsg || '게임이 종료되었습니다. 최종 순위표를 확인하세요.';

      let rowsHtml = '';
      customLeaderboard.forEach((item, idx) => {
        const medal = idx === 0 ? '<i class="fa-solid fa-trophy" style="color:#ecc94b;"></i> 1위' : (idx === 1 ? '<i class="fa-solid fa-medal" style="color:#a0aec0;"></i> 2위' : (idx === 2 ? '<i class="fa-solid fa-medal" style="color:#ed8936;"></i> 3위' : `${idx + 1}위`));
        const valDisplay = item.scoreText ? item.scoreText : `${item.score || 0}점`;
        rowsHtml += `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-sub);">
            <span><b>${medal}</b> ${_escapeHtml(item.name)}</span>
            <span style="color:var(--green-deep);font-weight:800;">${valDisplay}</span>
          </div>
        `;
      });
      scoreRowEl.innerHTML = rowsHtml;
      scoreRowEl.classList.remove('hidden');

      if (iAmWinner) {
        Sound.playWin();
        _triggerVictoryEffect(myVictoryEffect);
      } else {
        Sound.playLose();
        _stopVictoryEffect();
      }

    } else if (isDrawObject) {
      iconEl.innerHTML = '<i class="fa-solid fa-handshake"></i>';
      iconEl.style.color = 'var(--sky)';
      iconEl.style.background = 'var(--sky-tint)';
      iconEl.style.borderColor = 'var(--sky-border)';

      titleEl.textContent = '무승부!';
      titleEl.style.color = 'var(--sky)';
      msgEl.textContent = '치열한 접전 끝에 무승부로 끝났습니다!';
      scoreRowEl.innerHTML = `<span>나: <b>${drawInfo.myScore || 0}점</b></span> &nbsp;|&nbsp; <span>상대: <b>${drawInfo.oppScore || 0}점</b></span>`;
      scoreRowEl.classList.remove('hidden');
      Sound.playClick();
      _stopVictoryEffect();

    } else if (win) {
      iconEl.innerHTML = '<i class="fa-solid fa-trophy"></i>';
      iconEl.style.color = 'var(--green)';
      iconEl.style.background = 'var(--green-tint)';
      iconEl.style.borderColor = 'var(--green-border)';

      titleEl.textContent = '승리!';
      titleEl.style.color = 'var(--green-deep)';
      msgEl.textContent = reasonMsg || '멋진 승리입니다! 축하합니다!';
      scoreRowEl.classList.add('hidden');
      Sound.playWin();
      _triggerVictoryEffect(myVictoryEffect);

    } else {
      iconEl.innerHTML = '<i class="fa-regular fa-face-frown"></i>';
      iconEl.style.color = 'var(--coral)';
      iconEl.style.background = 'var(--coral-tint)';
      iconEl.style.borderColor = 'var(--coral-border)';

      titleEl.textContent = '패배';
      titleEl.style.color = 'var(--coral)';
      msgEl.textContent = reasonMsg || '아쉽게 패배했습니다. 다시 도전해 보세요!';
      scoreRowEl.classList.add('hidden');
      Sound.playLose();
      _stopVictoryEffect();
    }

    // 🌟 경험치 및 레벨업 보상 배너 렌더링
    const expBoxEl = $('result-exp-box');
    if (expBoxEl) {
      if (expRewardInfo && expRewardInfo.gained > 0) {
        const isMax = expRewardInfo.newLevel >= MAX_LEVEL;
        const pct = isMax ? 100 : (expRewardInfo.reqExp > 0
          ? Math.min(100, Math.max(0, Math.floor((expRewardInfo.currentExp / expRewardInfo.reqExp) * 100)))
          : 0);

        const levelUpBadge = expRewardInfo.leveledUp
          ? `<div class="result-level-up-badge"><i class="fa-solid fa-arrow-trend-up"></i> 레벨업! Lv.${expRewardInfo.oldLevel} → Lv.${expRewardInfo.newLevel}</div>`
          : '';

        expBoxEl.className = 'result-exp-box';
        expBoxEl.innerHTML = `
          ${levelUpBadge}
          <div class="result-exp-main">
            <i class="fa-solid fa-bolt"></i>
            <span>+${expRewardInfo.gained} EXP 획득! (현재: Lv.${expRewardInfo.newLevel}${isMax ? ' MAX' : ` - ${pct}%`})</span>
          </div>
          <div class="result-exp-bar-wrap">
            <div class="result-exp-bar-fill" style="width: ${pct}%;"></div>
          </div>
        `;
        expBoxEl.classList.remove('hidden');
      } else {
        expBoxEl.className = 'result-exp-box hidden';
        expBoxEl.innerHTML = '';
      }
    }

    $('overlay-result').classList.remove('hidden');
  }

  function _hideResultOverlay() {
    _stopVictoryEffect();
    if (_backHistoryIfModal('result')) return;
    if ($('overlay-result')) $('overlay-result').classList.add('hidden');
  }

  // 결과 화면: 방으로 돌아가기
  $('btn-result-back-room').addEventListener('click', () => {
    _hideResultOverlay();
    _handleBackToRoomClick();
  });

  // 게임 화면 헤더: 방으로 돌아가기 버튼
  $('btn-back-to-room').addEventListener('click', async () => {
    const ok = await showConfirmDialog({
      title: '게임 나가기',
      message: '게임을 종료하고 방으로 돌아가시겠습니까?',
      confirmText: '나가기',
      cancelText: '취소',
      icon: 'fa-solid fa-right-from-bracket',
      isDanger: true
    });
    if (ok) {
      _hideResultOverlay();
      _handleBackToRoomClick();
    }
  });

  function _handleBackToRoomClick() {
    if (P2P.isHost()) {
      // 방장은 모두 함께 방 로비로 복귀
      P2P.send({ type: 'return_to_room' });
      _exitGameToRoom();
    } else {
      // 게스트는 방장 및 다른 참가자들에게 퇴장 알림 전송 후 본인만 방으로 복귀
      P2P.send({
        type: 'guest_leave_game',
        playerId: P2P.getMyId(),
        name: myNickname
      });
      _exitGameToRoom();
    }
  }

  function _exitGameToRoom(pushState = true) {
    if (currentGameModule) {
      try { currentGameModule.destroy(); } catch (_) {}
      currentGameModule = null;
    }
    if ($('game-content')) $('game-content').innerHTML = '';

    isRoomGameActive = false;
    activeGamePlayers = [];

    if (P2P.isHost()) {
      roomPlayers.forEach(p => {
        if (!p.isHost) p.isReady = false;
      });
      _broadcastRoomState();
      // 🌐 Firebase에 대기 상태 복귀 기록
      if (window.FirebaseLobby && typeof window.FirebaseLobby.updateRoomStatus === 'function') {
        window.FirebaseLobby.updateRoomStatus(currentRoomCode, 'waiting');
      }
    } else {
      // 🌟 자동 준비: 설정이 켜진 경우 방으로 돌아오자마자 자동 준비 전환
      const autoReady = localStorage.getItem('arcade_auto_ready') === 'true';
      if (autoReady) {
        isMyReady = true;
        setTimeout(() => {
          P2P.send({ type: 'toggle_ready', isReady: true });
          Sound.playReady();
          _updateRoomUI();
        }, 300);
      } else {
        isMyReady = false;
      }
    }

    _enterRoomScreen(pushState);
    _scrollRoomChatToBottom();
  }

  /* ── XSS 방지 이스케이프 ── */
  function _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* =====================================================================
     8. 사이드바 게임 설명 말풍선 팝업 기능
     ===================================================================== */
  const GAME_TOOLTIP_DATA = {
    inu_quiz: {
      title: '인천대 퀴즈',
      icon: 'fa-solid fa-graduation-cap',
      tag: '1~8인 • 스피드 퀴즈',
      tagClass: 'tag-multi',
      desc: '인천대학교(INU)의 역사, 캠퍼스, 상징, 축제 등 다양한 퀴즈를 출제합니다! 선착순으로 가장 먼저 정답을 빠르게 입력하는 사람이 승리합니다.'
    },
    inu_study: {
      title: '스터디룸',
      icon: 'fa-solid fa-book-open-reader',
      tag: '1~8인 • 뽀모도로 공부',
      tagClass: 'tag-multi',
      desc: '실시간 함께 공부하는 온라인 스터디룸입니다. 방장이 뽀모도로(집중/휴식) 타이머를 켜고 끄며 다 함께 몰입하여 공부할 수 있습니다.'
    },
    inu_draw: {
      title: '횃불이 그리기',
      icon: 'fa-solid fa-paintbrush',
      tag: '1~8인 • 캔버스 드로잉',
      tagClass: 'tag-multi',
      desc: '인천대학교 공식 마스코트 횃불이(Hyoetbuli)를 보고 캔버스에 직접 따라 그리는 정확도 챌린지입니다! 외부 AI 없이 순수 거리 변환(Distance Transform) 알고리즘으로 정확도(%)를 정밀 채점합니다.'
    }
  };

  let activeSidebarTooltip = null;

  function _initSidebarGameTooltips() {
    document.querySelectorAll('.sidebar-game-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const gameKey = item.dataset.game;
        if (!gameKey) return;

        // active 클래스 갱신
        document.querySelectorAll('.sidebar-game-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // 말풍선 팝업 생성
        if (activeSidebarTooltip) {
          activeSidebarTooltip.remove();
          activeSidebarTooltip = null;
        }

        const data = GAME_TOOLTIP_DATA[gameKey];
        if (!data) return;

        const rect = item.getBoundingClientRect();
        const tooltip = document.createElement('div');
        tooltip.className = 'sidebar-game-bubble';
        tooltip.innerHTML = `
          <button type="button" class="sgb-close" title="닫기"><i class="fa-solid fa-xmark"></i></button>
          <div class="sgb-header">
            <div class="sgb-icon"><i class="${data.icon}"></i></div>
            <div class="sgb-meta">
              <strong class="sgb-title">${_escapeHtml(data.title)}</strong>
              <span class="sg-tag ${data.tagClass}">${_escapeHtml(data.tag)}</span>
            </div>
          </div>
          <p class="sgb-desc">${_escapeHtml(data.desc)}</p>
        `;

        document.body.appendChild(tooltip);
        activeSidebarTooltip = tooltip;

        // 위치 계산
        const isMobile = window.innerWidth <= 1024;
        if (isMobile) {
          tooltip.style.left = '50%';
          tooltip.style.top = Math.max(20, rect.top - 10) + 'px';
          tooltip.style.transform = 'translateX(-50%)';
        } else {
          tooltip.style.left = (rect.right + 14) + 'px';
          tooltip.style.top = Math.max(16, rect.top - 10) + 'px';
        }

        tooltip.querySelector('.sgb-close').addEventListener('click', (ev) => {
          ev.stopPropagation();
          tooltip.remove();
          activeSidebarTooltip = null;
        });
      });
    });

    document.addEventListener('click', (e) => {
      if (activeSidebarTooltip && !activeSidebarTooltip.contains(e.target) && !e.target.closest('.sidebar-game-item')) {
        activeSidebarTooltip.remove();
        activeSidebarTooltip = null;
      }
    });
  }

  /* =====================================================================
     프로필 이모지 감정표현 (내 화면 렌더링 + P2P 동기화)
     ===================================================================== */

  // 1. 이모지 버튼 클릭 이벤트 (위임 방식)
// 이모지 버튼 클릭 이벤트 (대기실 + 인게임 통합 감지)
  document.addEventListener('click', (e) => {
    
    // 🚨 원인: 기존에는 e.target.closest('.room-emoji-panel .btn-emoji') 였음
    // 🌟 픽스: 대기실과 인게임 패널 모두 감지하도록 쉼표(,)로 두 클래스를 모두 넣어줍니다.
    const btn = e.target.closest('.room-emoji-panel .btn-emoji, .game-emoji-panel .btn-emoji');
    
    if (!btn) return;

    const img = btn.querySelector('img');
    if (!img || !img.src) return;

    const myId = String(P2P.getMyId()); // 확실한 문자열 비교를 위해 String 감싸기
    const emojiSrc = img.src;

    // 내 화면에 띄우기
    if (typeof _showProfileEmoji === 'function') {
      _showProfileEmoji(myId, emojiSrc);
    }

    // 다른 사람들에게 전송
    try {
      P2P.send({
        type: 'profile_emoji',
        senderId: myId,
        emojiSrc: emojiSrc
      });
    } catch (_) {}
  });

// 1. 프로필 이모지 실행 및 상태 관리 함수
  function _showProfileEmoji(playerId, emojiSrc) {
    if (!playerId || !emojiSrc) return;

    // 기존 타이머가 존재하면 취소
    if (activeProfileEmojis[playerId]) {
      clearTimeout(activeProfileEmojis[playerId].timeoutId);
    }

    // 1.8초 동안 상태 유지 후 자동 삭제
    const timeoutId = setTimeout(() => {
      delete activeProfileEmojis[playerId];
      _removeProfileEmojiDOM(playerId);
    }, 1800);

    activeProfileEmojis[playerId] = { emojiSrc, timeoutId };

    // DOM에 이모지 출력
    _renderProfileEmojiDOM(playerId, emojiSrc);
  }

  // 2. DOM 요소에 실제 이모지 버블 생성하는 보조 함수
  function _renderProfileEmojiDOM(playerId, emojiSrc) {
    if (localStorage.getItem('arcade_show_emojis') === 'false') return;
    const targets = document.querySelectorAll(`[data-player-id="${playerId}"], [data-id="${playerId}"]`);
    
    targets.forEach(playerEl => {
      const avatarEl = playerEl.querySelector('.player-avatar') || 
                       playerEl.querySelector('.gsp-avatar') || 
                       playerEl.querySelector('div') || 
                       playerEl;

      if (!avatarEl) return;

      const oldBubble = avatarEl.querySelector('.profile-emoji-bubble');
      if (oldBubble) oldBubble.remove();

      const bubble = document.createElement('div');
      bubble.className = 'profile-emoji-bubble';
      bubble.innerHTML = `<img src="${_escapeHtml(emojiSrc)}" alt="emoji">`;

      avatarEl.appendChild(bubble);
    });
  }

  // 3. 이모지 버블 제거 보조 함수
  function _removeProfileEmojiDOM(playerId) {
    const targets = document.querySelectorAll(`[data-player-id="${playerId}"], [data-id="${playerId}"]`);
    targets.forEach(playerEl => {
      const bubble = playerEl.querySelector('.profile-emoji-bubble');
      if (bubble) bubble.remove();
    });
  }
  /* ── 🖱️ PC 인게임 화면 잘림 시 마우스 상하 드래그 스크롤 지원 ── */
  function _initInGameDragScroll() {
    const gameScreen = $('screen-game');
    if (!gameScreen) return;

    let isDown = false;
    let startY = 0;
    let startScrollTop = 0;

    gameScreen.addEventListener('mousedown', (e) => {
      if (gameScreen.scrollHeight <= gameScreen.clientHeight + 4) return;
      if (e.target.closest('button, input, textarea, a, canvas, #ak-canvas, .alkkagi-wrap, .janggi-card, .janggi-wrap, .janggi-piece, .yut-board-node, .yut-board-piece, .yut-waiting-token, .yut-power-btn, .yut-mat-arena, .chess-piece, .board-cell, .apple-box, .q-cell, .q-wall-slot, .palette-color, .btn-manage-trigger, .sidebar-game-bubble')) {
        return;
      }

      isDown = true;
      startY = e.pageY;
      startScrollTop = gameScreen.scrollTop;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const deltaY = e.pageY - startY;
      gameScreen.scrollTop = startScrollTop - deltaY;
    });

    window.addEventListener('mouseup', () => {
      isDown = false;
    });
  }

  /* =====================================================================
     9. 앱 시작 시 초기화
     ===================================================================== */
  _initTheme();
  showScreen('home');
  _updateHomeUserBar();
  _applyCosmeticsToAllUI();
  _initCreateRoomOptions();
  _initGameExtraSettings();
  _initFirebaseLobby();
  _initSidebarGameTooltips();
  _initInGameDragScroll();
  _initSupabaseAuthUI();
  _initOnlineUsersPresence();
  _initLobbyChat();
  console.log('[App] INU 아케이드 플랫폼 시작 완료 (PC 인게임 드래그 스크롤 & Firebase 로비 연동 & Supabase 인증 & 실시간 접속자 & 로비 채팅)');



/* =====================================================================
     Virtual Routing / History popstate
     ===================================================================== */
  window.addEventListener('popstate', (e) => {
    // 1. Close modals if they are open
    if ($('auth-modal') && !$('auth-modal').classList.contains('hidden')) {
      $('auth-modal').classList.add('hidden');
      return;
    }
    if ($('overlay-settings') && !$('overlay-settings').classList.contains('hidden')) {
      $('overlay-settings').classList.add('hidden');
      return;
    }
    if ($('overlay-room-password') && !$('overlay-room-password').classList.contains('hidden')) {
      $('overlay-room-password').classList.add('hidden');
      return;
    }
    if ($('lobby-chat-card') && $('lobby-chat-card').classList.contains('mobile-open')) {
      $('lobby-chat-card').classList.remove('mobile-open');
      if ($('lobby-mobile-chat-backdrop')) $('lobby-mobile-chat-backdrop').classList.add('hidden');
      return;
    }
    if ($('room-chat-panel') && $('room-chat-panel').classList.contains('mobile-open')) {
      $('room-chat-panel').classList.remove('mobile-open');
      if ($('room-mobile-chat-backdrop')) $('room-mobile-chat-backdrop').classList.add('hidden');
      return;
    }
    if ($('game-chat-panel') && $('game-chat-panel').classList.contains('mobile-open')) {
      $('game-chat-panel').classList.remove('mobile-open');
      if ($('mobile-chat-backdrop')) $('mobile-chat-backdrop').classList.add('hidden');
      return;
    }
    if ($('overlay-result') && !$('overlay-result').classList.contains('hidden')) {
      $('overlay-result').classList.add('hidden');
      return;
    }

    const state = e.state;
    const targetScreen = state && state.screen ? state.screen : 'home';

    // Prevent going Forward into room/game without a session
    if ((targetScreen === 'room' || targetScreen === 'game') && !currentRoomCode) {
      _replaceHistory({ screen: 'home' });
      showScreen('home', false);
      return;
    }

    // 2. Handle leaving game (Currently in 'game' screen)
    if (screens['game'] && screens['game'].classList.contains('active')) {
      if (targetScreen === 'room' || targetScreen === 'home') {
        _hideResultOverlay();
        if (P2P.isHost()) {
          try { P2P.send({ type: 'return_to_room' }); } catch (_) {}
        } else {
          try {
            P2P.send({
              type: 'guest_leave_game',
              playerId: P2P.getMyId(),
              name: myNickname
            });
          } catch (_) {}
        }

        // 제스처 등으로 인게임에서 곧바로 홈(로비)까지 뒤로가기 된 경우 예외 처리
        if (targetScreen === 'home') {
          if (!P2P.isHost()) {
            try { P2P.send({ type: 'guest_leave_room', name: myNickname }); } catch (_) {}
          }
          _leaveRoom(false);
        } else {
          _exitGameToRoom(false);
        }
        return;
      }
    }

    // 3. Handle leaving room to home (Currently in 'room' screen)
    if (screens['room'] && screens['room'].classList.contains('active')) {
      if (targetScreen === 'home') {
        if (!P2P.isHost()) {
          try { P2P.send({ type: 'guest_leave_room', name: myNickname }); } catch (_) {}
        }
        _leaveRoom(false);
        return;
      }
      if (targetScreen === 'game') {
        showScreen('game', false);
        return;
      }
    }

    showScreen(targetScreen, false);
  });

  // Push initial state
  _replaceHistory({ screen: 'home' });

  // 🌐 URL 초대 링크(?room=CODE) 자동 입장 처리
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam && roomParam.trim().length === 4) {
      const cleanCode = roomParam.trim().toUpperCase();
      // URL 파라미터는 history.replaceState로 주소창에서 정리 (새로고침 시 루프 방지)
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({ screen: 'home' }, document.title, cleanUrl);

      setTimeout(() => {
        showToast(`초대받은 방(${cleanCode})으로 입장을 시도합니다...`, 'info');
        _startJoinRoom(cleanCode);
      }, 500);
    }
  } catch (err) {
    console.warn('[AutoJoin] URL 파라미터 처리 오류:', err);
  }


  window.App = {
    updateInGameTurn
  };
})();