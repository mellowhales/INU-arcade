/**
 * supabase.js - Supabase 클라이언트 & 인증/프로필 관리 모듈
 */
const AppSupabase = (() => {
  'use strict';

  let _client = null;
  let _currentUser = null;
  let _authListeners = [];

  /**
   * Supabase 설정이 완료되었는지 확인
   */
  function isConfigured() {
    const cfg = window.SUPABASE_CONFIG;
    if (!cfg) return false;
    const hasUrl = typeof cfg.url === 'string' && cfg.url.trim().startsWith('https://');
    const hasKey = typeof cfg.anonKey === 'string' && cfg.anonKey.trim().length > 20;
    return hasUrl && hasKey;
  }

  /**
   * Supabase 클라이언트 초기화 및 반환
   */
  function getClient() {
    if (_client) return _client;
    if (!isConfigured()) return null;

    if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
      console.warn('[Supabase] Supabase JS SDK가 로드되지 않았습니다.');
      return null;
    }

    try {
      _client = window.supabase.createClient(
        window.SUPABASE_CONFIG.url.trim(),
        window.SUPABASE_CONFIG.anonKey.trim()
      );
      return _client;
    } catch (err) {
      console.error('[Supabase] 클라이언트 초기화 실패:', err);
      return null;
    }
  }

  /**
   * 앱 시작 시 세션 자동 복원 및 리스너 등록
   */
  async function init() {
    const client = getClient();
    if (!client) return null;

    try {
      const { data: { session } } = await client.auth.getSession();
      _currentUser = session ? session.user : null;

      client.auth.onAuthStateChange((event, session) => {
        _currentUser = session ? session.user : null;
        _authListeners.forEach(fn => {
          try { fn(event, session, _currentUser); } catch (e) { console.error(e); }
        });
      });

      return _currentUser;
    } catch (err) {
      console.error('[Supabase] 세션 확인 에러:', err);
      return null;
    }
  }

  /**
   * 인증 상태 변경 리스너 등록
   */
  function onAuthStateChange(callback) {
    if (typeof callback === 'function') {
      _authListeners.push(callback);
    }
  }

  /**
   * 현재 로그인된 사용자 정보 반환
   */
  function getCurrentUser() {
    return _currentUser;
  }

  /**
   * 회원가입
   */
  async function signUp(email, password, nickname = '플레이어', avatarIcon = 'fa-solid fa-dog', avatarColor = '#38a169') {
    const client = getClient();
    if (!client) {
      return { success: false, error: 'Supabase 설정(URL/키)이 완료되지 않았습니다. js/supabase-config.js를 확인해주세요.' };
    }

    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            nickname: nickname.trim().slice(0, 8),
            avatar_icon: avatarIcon,
            avatar_color: avatarColor
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const user = data.user;
      if (user) {
        // profiles 테이블에 동기화 저장 시도 (실패해도 무방)
        await saveProfile(user.id, {
          email: user.email,
          nickname: nickname.trim().slice(0, 8),
          avatar_icon: avatarIcon,
          avatar_color: avatarColor
        }).catch(() => {});
      }

      return {
        success: true,
        user: user,
        session: data.session,
        needsEmailConfirmation: !data.session && !!user
      };
    } catch (err) {
      return { success: false, error: err.message || '회원가입 처리 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 로그인
   */
  async function signIn(email, password) {
    const client = getClient();
    if (!client) {
      return { success: false, error: 'Supabase 설정(URL/키)이 완료되지 않았습니다. js/supabase-config.js를 확인해주세요.' };
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      _currentUser = data.user;
      return {
        success: true,
        user: data.user,
        session: data.session
      };
    } catch (err) {
      return { success: false, error: err.message || '로그인 처리 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 로그아웃
   */
  async function signOut() {
    const client = getClient();
    _currentUser = null;
    if (_presenceChannel) {
      try { await _presenceChannel.untrack(); } catch (_) {}
    }
    if (!client) return { success: true };

    try {
      try {
        await client.auth.signOut({ scope: 'local' });
      } catch (_) {
        await client.auth.signOut();
      }
    } catch (err) {
      console.warn('[Supabase] signOut error:', err);
    } finally {
      // 로컬 스토리지의 Supabase 토큰 수동 정리 (확실한 로그아웃 보장)
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
            localStorage.removeItem(k);
          }
        }
      } catch (_) {}
    }
    return { success: true };
  }

/**
   * OAuth 간편 로그인 (Google, Kakao, Naver 등)
   */
  async function signInWithOAuth(provider) {
    const client = getClient();
    if (!client) {
      return { success: false, error: 'Supabase가 설정되지 않았습니다.' };
    }
    try {
      const redirectUrl = window.location.origin + window.location.pathname;
      const targetProvider = provider.toLowerCase() === 'naver' ? 'custom:naver' : provider.toLowerCase();

      // OAuth 옵션 설정
      const oauthOptions = {
        redirectTo: redirectUrl
      };

      // 카카오 로그인 시 account_email 스코프를 제외하고 닉네임/프로필만 요청
      if (targetProvider === 'kakao') {
        oauthOptions.scopes = 'profile_nickname profile_image';
      }

      const { data, error } = await client.auth.signInWithOAuth({
        provider: targetProvider,
        options: oauthOptions
      });
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.warn(`[Supabase] ${provider} OAuth 로그인 오류:`, err);
      return { success: false, error: err.message || `${provider} 로그인 중 오류가 발생했습니다.` };
    }
  }

  /**
   * 클라우드 프로필 로드 (DB profiles 테이블 + user_metadata 이중 백업 통합)
   */
  async function loadProfile(userId) {
    const client = getClient();
    if (!client || !userId) return null;

    try {
      // 1. profiles 테이블 조회 시도
      let tableData = null;
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (!error && data) {
          tableData = data;
        }
      } catch (e) {
        console.warn('[Supabase] profiles 테이블 조회 예외:', e);
      }

      // 2. user_metadata 확보 (이중 백업)
      let meta = (_currentUser && _currentUser.id === userId) ? _currentUser.user_metadata : null;
      if (!meta) {
        try {
          const { data: authData } = await client.auth.getUser();
          if (authData && authData.user && authData.user.id === userId) {
            meta = authData.user.user_metadata;
            _currentUser = authData.user;
          }
        } catch (_) {}
      }
      meta = meta || {};

      const oAuthName = meta.full_name || meta.name || meta.nickname || null;

      // 3. stats 안전 파싱 (JSONB 또는 JSON 문자열 지원)
      let rawStats = (tableData && tableData.stats) || meta.stats || null;
      if (typeof rawStats === 'string') {
        try { rawStats = JSON.parse(rawStats); } catch (_) {}
      }

      const nickname = (tableData && tableData.nickname) || (meta && meta.nickname) || (oAuthName ? oAuthName.slice(0, 8) : null);
      const avatarIcon = (tableData && tableData.avatar_icon) || (meta && meta.avatar_icon) || null;
      const avatarColor = (tableData && tableData.avatar_color) || (meta && meta.avatar_color) || null;
      const nameColor = (tableData && tableData.name_color) || (meta && meta.name_color) || null;
      let purchasedNameColors = (tableData && tableData.purchased_name_colors) || (meta && meta.purchased_name_colors) || [];
      if (typeof purchasedNameColors === 'string') {
        try { purchasedNameColors = JSON.parse(purchasedNameColors); } catch (_) { purchasedNameColors = []; }
      }
      if (!Array.isArray(purchasedNameColors)) purchasedNameColors = [];

      const profileCard = (tableData && tableData.profile_card) || (meta && meta.profile_card) || 'default';
      let purchasedProfileCards = (tableData && tableData.purchased_profile_cards) || (meta && meta.purchased_profile_cards) || ['default'];
      if (typeof purchasedProfileCards === 'string') {
        try { purchasedProfileCards = JSON.parse(purchasedProfileCards); } catch (_) { purchasedProfileCards = ['default']; }
      }
      if (!Array.isArray(purchasedProfileCards)) purchasedProfileCards = ['default'];

      // 💬 말풍선 스킨
      const chatBubble = (tableData && tableData.chat_bubble) || (meta && meta.chat_bubble) || 'default';
      let purchasedChatBubbles = (tableData && tableData.purchased_chat_bubbles) || (meta && meta.purchased_chat_bubbles) || ['default'];
      if (typeof purchasedChatBubbles === 'string') {
        try { purchasedChatBubbles = JSON.parse(purchasedChatBubbles); } catch (_) { purchasedChatBubbles = ['default']; }
      }
      if (!Array.isArray(purchasedChatBubbles)) purchasedChatBubbles = ['default'];

      // 🖼️ 아바타 테두리
      const avatarFrame = (tableData && tableData.avatar_frame) || (meta && meta.avatar_frame) || 'default';
      let purchasedAvatarFrames = (tableData && tableData.purchased_avatar_frames) || (meta && meta.purchased_avatar_frames) || ['default'];
      if (typeof purchasedAvatarFrames === 'string') {
        try { purchasedAvatarFrames = JSON.parse(purchasedAvatarFrames); } catch (_) { purchasedAvatarFrames = ['default']; }
      }
      if (!Array.isArray(purchasedAvatarFrames)) purchasedAvatarFrames = ['default'];

      // 🎉 승리 세레머니 연출
      const victoryEffect = (tableData && tableData.victory_effect) || (meta && meta.victory_effect) || 'default';
      let purchasedVictoryEffects = (tableData && tableData.purchased_victory_effects) || (meta && meta.purchased_victory_effects) || ['default'];
      if (typeof purchasedVictoryEffects === 'string') {
        try { purchasedVictoryEffects = JSON.parse(purchasedVictoryEffects); } catch (_) { purchasedVictoryEffects = ['default']; }
      }
      if (!Array.isArray(purchasedVictoryEffects)) purchasedVictoryEffects = ['default'];

      const coins = (tableData && typeof tableData.coins === 'number')
        ? tableData.coins
        : (meta && typeof meta.coins === 'number')
          ? meta.coins
          : (parseInt(tableData?.coins, 10) || parseInt(meta?.coins, 10) || 0);

      const level = (tableData && typeof tableData.level === 'number' && tableData.level >= 1)
        ? tableData.level
        : (meta && typeof meta.level === 'number' && meta.level >= 1)
          ? meta.level
          : (parseInt(tableData?.level, 10) || parseInt(meta?.level, 10) || 1);

      const exp = (tableData && typeof tableData.exp === 'number' && tableData.exp >= 0)
        ? tableData.exp
        : (meta && typeof meta.exp === 'number' && meta.exp >= 0)
          ? meta.exp
          : (parseInt(tableData?.exp, 10) || parseInt(meta?.exp, 10) || 0);

      if (tableData || Object.keys(meta).length > 0) {
        return {
          nickname,
          avatarIcon,
          avatarColor,
          nameColor,
          purchasedNameColors,
          profileCard,
          purchasedProfileCards,
          chatBubble,
          purchasedChatBubbles,
          avatarFrame,
          purchasedAvatarFrames,
          victoryEffect,
          purchasedVictoryEffects,
          stats: rawStats,
          coins,
          level,
          exp
        };
      }

      return null;
    } catch (err) {
      console.warn('[Supabase] 프로필 로드 경고:', err);
      return null;
    }
  }

  /**
   * 클라우드 프로필 부분 저장 (전달된 필드만 안전하게 업데이트하여 프로필 초기화 방지)
   */
  async function saveProfile(userId, profileData) {
    const client = getClient();
    if (!client || !userId || !profileData || typeof profileData !== 'object') return false;

    const payload = {
      id: userId,
      updated_at: new Date().toISOString()
    };
    if (profileData.nickname) payload.nickname = profileData.nickname;
    if (profileData.avatarIcon || profileData.avatar_icon) {
      payload.avatar_icon = profileData.avatarIcon || profileData.avatar_icon;
    }
    if (profileData.avatarColor || profileData.avatar_color) {
      payload.avatar_color = profileData.avatarColor || profileData.avatar_color;
    }
    if (profileData.nameColor !== undefined || profileData.name_color !== undefined) {
      payload.name_color = profileData.nameColor !== undefined ? profileData.nameColor : profileData.name_color;
    }
    if (profileData.purchasedNameColors !== undefined || profileData.purchased_name_colors !== undefined) {
      payload.purchased_name_colors = profileData.purchasedNameColors !== undefined ? profileData.purchasedNameColors : profileData.purchased_name_colors;
    }
    if (profileData.profileCard !== undefined || profileData.profile_card !== undefined) {
      payload.profile_card = profileData.profileCard !== undefined ? profileData.profileCard : profileData.profile_card;
    }
    if (profileData.purchasedProfileCards !== undefined || profileData.purchased_profile_cards !== undefined) {
      payload.purchased_profile_cards = profileData.purchasedProfileCards !== undefined ? profileData.purchasedProfileCards : profileData.purchased_profile_cards;
    }
    if (profileData.chatBubble !== undefined || profileData.chat_bubble !== undefined) {
      payload.chat_bubble = profileData.chatBubble !== undefined ? profileData.chatBubble : profileData.chat_bubble;
    }
    if (profileData.purchasedChatBubbles !== undefined || profileData.purchased_chat_bubbles !== undefined) {
      payload.purchased_chat_bubbles = profileData.purchasedChatBubbles !== undefined ? profileData.purchasedChatBubbles : profileData.purchased_chat_bubbles;
    }
    if (profileData.avatarFrame !== undefined || profileData.avatar_frame !== undefined) {
      payload.avatar_frame = profileData.avatarFrame !== undefined ? profileData.avatarFrame : profileData.avatar_frame;
    }
    if (profileData.purchasedAvatarFrames !== undefined || profileData.purchased_avatar_frames !== undefined) {
      payload.purchased_avatar_frames = profileData.purchasedAvatarFrames !== undefined ? profileData.purchasedAvatarFrames : profileData.purchased_avatar_frames;
    }
    if (profileData.victoryEffect !== undefined || profileData.victory_effect !== undefined) {
      payload.victory_effect = profileData.victoryEffect !== undefined ? profileData.victoryEffect : profileData.victory_effect;
    }
    if (profileData.purchasedVictoryEffects !== undefined || profileData.purchased_victory_effects !== undefined) {
      payload.purchased_victory_effects = profileData.purchasedVictoryEffects !== undefined ? profileData.purchasedVictoryEffects : profileData.purchased_victory_effects;
    }
    if (profileData.email) payload.email = profileData.email;
    if (profileData.stats !== undefined) payload.stats = profileData.stats;
    if (profileData.coins !== undefined) payload.coins = profileData.coins;
    if (profileData.level !== undefined) payload.level = profileData.level;
    if (profileData.exp !== undefined) payload.exp = profileData.exp;

    try {
      // 1. user_metadata 부분 업데이트 (전달된 필드만 반영)
      const metaData = {};
      if (payload.nickname) metaData.nickname = payload.nickname;
      if (payload.avatar_icon) metaData.avatar_icon = payload.avatar_icon;
      if (payload.avatar_color) metaData.avatar_color = payload.avatar_color;
      if (payload.name_color !== undefined) metaData.name_color = payload.name_color;
      if (payload.purchased_name_colors !== undefined) metaData.purchased_name_colors = payload.purchased_name_colors;
      if (payload.profile_card !== undefined) metaData.profile_card = payload.profile_card;
      if (payload.purchased_profile_cards !== undefined) metaData.purchased_profile_cards = payload.purchased_profile_cards;
      if (payload.chat_bubble !== undefined) metaData.chat_bubble = payload.chat_bubble;
      if (payload.purchased_chat_bubbles !== undefined) metaData.purchased_chat_bubbles = payload.purchased_chat_bubbles;
      if (payload.avatar_frame !== undefined) metaData.avatar_frame = payload.avatar_frame;
      if (payload.purchased_avatar_frames !== undefined) metaData.purchased_avatar_frames = payload.purchased_avatar_frames;
      if (payload.victory_effect !== undefined) metaData.victory_effect = payload.victory_effect;
      if (payload.purchased_victory_effects !== undefined) metaData.purchased_victory_effects = payload.purchased_victory_effects;
      if (payload.stats !== undefined) metaData.stats = payload.stats;
      if (payload.coins !== undefined) metaData.coins = payload.coins;
      if (payload.level !== undefined) metaData.level = payload.level;
      if (payload.exp !== undefined) metaData.exp = payload.exp;

      if (Object.keys(metaData).length > 0) {
        try {
          await client.auth.updateUser({ data: metaData });
        } catch (authErr) {
          console.warn('[Supabase] auth.updateUser 경고:', authErr);
        }
      }

      // 2. profiles 테이블 upsert
      const { error } = await client
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('[Supabase] profiles 테이블 저장 실패 (테이블 미생성 또는 RLS 정책 확인 필요):', error.message);
      }
      return true;
    } catch (err) {
      console.warn('[Supabase] 프로필 저장 에러:', err);
      return false;
    }
  }

  /**
   * 유저 코인 시스템 비활성화 (호환용 no-op)
   */
  async function addCoins(userId, amount) {
    return 0;
  }

  /**
   * 레벨 및 경험치 클라우드 저장
   */
  async function saveLevelAndExp(userId, level, exp) {
    const client = getClient();
    if (!client || !userId) return false;
    return await saveProfile(userId, { level, exp });
  }

  /**
   * 특정 유저의 전적 및 프로필 조회 (상대방 전적 확인용)
   */
  async function fetchUserStats(userId) {
    const client = getClient();
    if (!client || !userId) return null;

    try {
      const { data, error } = await client
        .from('profiles')
        .select('id, nickname, avatar_icon, avatar_color, name_color, profile_card, stats, coins, level, exp')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          nickname: data.nickname || '플레이어',
          avatarIcon: data.avatar_icon || 'fa-solid fa-dog',
          avatarColor: data.avatar_color || '#38a169',
          nameColor: data.name_color || null,
          profileCard: data.profile_card || 'default',
          stats: data.stats || null,
          coins: typeof data.coins === 'number' ? data.coins : 0,
          level: typeof data.level === 'number' ? data.level : 1,
          exp: typeof data.exp === 'number' ? data.exp : 0
        };
      }
      return null;
    } catch (err) {
      console.warn('[Supabase] 상대 전적 조회 에러:', err);
      return null;
    }
  }

  let _presenceChannel = null;
  let _currentPresencePayload = null;
  let _presenceHeartbeatTimer = null;
  const _presenceListeners = [];

  let _lobbyChatChannel = null;
  const _lobbyChatListeners = [];

  function _extractPresenceUsers(channel) {
    if (!channel) return [];
    try {
      const state = channel.presenceState();
      const users = [];
      const seen = new Set();
      for (const key in state) {
        const arr = state[key];
        if (Array.isArray(arr)) {
          arr.forEach(p => {
            const uid = p.presenceKey || key;
            if (!seen.has(uid)) {
              seen.add(uid);
              users.push(p);
            }
          });
        }
      }
      return users;
    } catch (_) {
      return [];
    }
  }

  function _dispatchPresence(users) {
    _presenceListeners.forEach(fn => {
      try { fn(users); } catch (e) { console.error(e); }
    });
  }

  /**
   * 실시간 접속자 Presence 채널 초기화 및 내 정보 브로드캐스트
   */
  function initPresence(userPayload, onSync) {
    const client = getClient();
    if (!client) {
      if (typeof onSync === 'function') onSync([userPayload]);
      return null;
    }

    if (typeof onSync === 'function' && !_presenceListeners.includes(onSync)) {
      _presenceListeners.push(onSync);
    }

    let sessionKey = null;
    try {
      sessionKey = sessionStorage.getItem('inu_presence_key');
      if (!sessionKey) {
        sessionKey = 'usr_' + Math.random().toString(36).substring(2, 10);
        sessionStorage.setItem('inu_presence_key', sessionKey);
      }
    } catch (_) {
      sessionKey = 'usr_' + Math.random().toString(36).substring(2, 10);
    }

    _currentPresencePayload = {
      ...userPayload,
      presenceKey: sessionKey,
      updatedAt: Date.now()
    };

    if (_presenceChannel) {
      try {
        _presenceChannel.track(_currentPresencePayload);
      } catch (_) {}
      return _presenceChannel;
    }

    try {
      const channel = client.channel('lobby-online-users', {
        config: {
          presence: { key: sessionKey }
        }
      });

      const handleStateChange = () => {
        const users = _extractPresenceUsers(channel);
        _dispatchPresence(users);
      };

      channel
        .on('presence', { event: 'sync' }, handleStateChange)
        .on('presence', { event: 'join' }, handleStateChange)
        .on('presence', { event: 'leave' }, handleStateChange)
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            try {
              await channel.track(_currentPresencePayload);
            } catch (err) {
              console.warn('[Supabase] Presence track failed:', err);
            }
          }
        });

      _presenceChannel = channel;

      // 6초 주기 하트비트 트래킹으로 접속자 상태 최신 유지
      if (!_presenceHeartbeatTimer) {
        _presenceHeartbeatTimer = setInterval(() => {
          if (_presenceChannel && _currentPresencePayload) {
            try {
              _presenceChannel.track({
                ..._currentPresencePayload,
                updatedAt: Date.now()
              });
            } catch (_) {}
          }
        }, 6000);
      }

      // 탭 포커스 / 화면 복귀 시 즉각 갱신
      if (typeof window !== 'undefined' && !window._presenceEventBound) {
        window._presenceEventBound = true;
        window.addEventListener('focus', () => {
          if (_presenceChannel && _currentPresencePayload) {
            try {
              _presenceChannel.track({
                ..._currentPresencePayload,
                updatedAt: Date.now()
              });
            } catch (_) {}
          }
        });
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && _presenceChannel && _currentPresencePayload) {
            try {
              _presenceChannel.track({
                ..._currentPresencePayload,
                updatedAt: Date.now()
              });
            } catch (_) {}
          }
        });
      }

      return channel;
    } catch (err) {
      console.warn('[Supabase] Presence init error:', err);
      if (typeof onSync === 'function') onSync([userPayload]);
      return null;
    }
  }

  /**
   * 실시간 접속자 수동 즉시 새로고침
   */
  async function refreshPresence() {
    if (!_presenceChannel || !_currentPresencePayload) return;
    try {
      await _presenceChannel.track({
        ..._currentPresencePayload,
        updatedAt: Date.now()
      });
      const users = _extractPresenceUsers(_presenceChannel);
      _dispatchPresence(users);
    } catch (err) {
      console.warn('[Supabase] Presence refresh error:', err);
    }
  }

  /**
   * 실시간 접속자 내 상태 업데이트 (닉네임/아바타/레벨 변경 시)
   */
  async function updatePresence(newPayload) {
    if (!_presenceChannel || !_currentPresencePayload) return;
    _currentPresencePayload = { ..._currentPresencePayload, ...newPayload, updatedAt: Date.now() };
    try {
      await _presenceChannel.track(_currentPresencePayload);
    } catch (err) {
      console.warn('[Supabase] Presence update error:', err);
    }
  }

  function onPresenceSync(callback) {
    if (typeof callback === 'function' && !_presenceListeners.includes(callback)) {
      _presenceListeners.push(callback);
    }
  }

  /**
   * 💬 로비 전체 채팅 채널 초기화
   */
  function initLobbyChat(onMessage) {
    if (typeof onMessage === 'function' && !_lobbyChatListeners.includes(onMessage)) {
      _lobbyChatListeners.push(onMessage);
    }
    const client = getClient();
    if (!client) return null;
    if (_lobbyChatChannel) return _lobbyChatChannel;

    try {
      const channel = client.channel('lobby-global-chat', {
        config: {
          broadcast: { self: false }
        }
      });

      channel
        .on('broadcast', { event: 'lobby_msg' }, (eventData) => {
          if (eventData && eventData.payload) {
            _lobbyChatListeners.forEach(fn => {
              try { fn(eventData.payload); } catch (e) { console.error(e); }
            });
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // 로비 채팅 채널 준비 완료
          }
        });

      _lobbyChatChannel = channel;
      return channel;
    } catch (err) {
      console.warn('[Supabase] Lobby chat init error:', err);
      return null;
    }
  }

  /**
   * 💬 로비 전체 채팅 메시지 전송 (Supabase Realtime Broadcast)
   */
  async function sendLobbyChatMessage(payload) {
    const client = getClient();
    if (!client) return false;
    if (!_lobbyChatChannel) {
      initLobbyChat();
    }
    if (!_lobbyChatChannel) return false;

    try {
      await _lobbyChatChannel.send({
        type: 'broadcast',
        event: 'lobby_msg',
        payload: payload
      });
      return true;
    } catch (err) {
      console.warn('[Supabase] Lobby chat send error:', err);
      return false;
    }
  }

  /**
   * 친구 목록 조회 (DB friends 테이블 연동)
   */
  async function getFriends(userId) {
    const client = getClient();
    if (!client || !userId) return null;
    try {
      const { data, error } = await client
        .from('friends')
        .select('*')
        .eq('user_id', userId);
      if (error) return null;
      return data || [];
    } catch (_) {
      return null;
    }
  }

  /**
   * 친구 추가 (DB friends 테이블)
   */
  async function addFriend(userId, friendName, friendId = null) {
    const client = getClient();
    if (!client || !userId || !friendName) return false;
    try {
      const { error } = await client
        .from('friends')
        .upsert({
          user_id: userId,
          friend_name: friendName,
          friend_id: friendId
        }, { onConflict: 'user_id, friend_name' });
      return !error;
    } catch (_) {
      return false;
    }
  }

  /**
   * 친구 삭제 (DB friends 테이블)
   */
  async function removeFriend(userId, friendName) {
    const client = getClient();
    if (!client || !userId || !friendName) return false;
    try {
      const { error } = await client
        .from('friends')
        .delete()
        .eq('user_id', userId)
        .eq('friend_name', friendName);
      return !error;
    } catch (_) {
      return false;
    }
  }

  return {
    isConfigured,
    getClient,
    init,
    onAuthStateChange,
    getCurrentUser,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    loadProfile,
    saveProfile,
    addCoins,
    saveLevelAndExp,
    fetchUserStats,
    initPresence,
    refreshPresence,
    updatePresence,
    onPresenceSync,
    initLobbyChat,
    sendLobbyChatMessage,
    getFriends,
    addFriend,
    removeFriend
  };
})();

if (typeof window !== 'undefined') {
  window.AppSupabase = AppSupabase;
}
