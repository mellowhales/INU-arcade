/**
 * p2p.js - PeerJS 다중 P2P 래퍼 (호스트 중심 Star Topology, 최대 9명 지원)
 * (Wi-Fi 초고속 직결 + LTE/5G 대칭형 NAT TURN 릴레이 완벽 하이브리드 지원)
 */
const P2P = (() => {
  'use strict';

  let _peer = null;
  let _isHost = false;
  let _peerId = null;

  // 룸 네임스페이스 프리픽스 (전 세계 PeerJS 공용 브로커 충돌 방지)
  const ROOM_PREFIX = 'kr-arcade-v2-';

  // 호스트: 여러 게스트 연결 관리 (Map: peerId -> conn)
  const _conns = new Map();
  // 게스트: 호스트와의 단일 연결
  let _hostConn = null;

  // 핸들러들
  const _msgHandlers = [];
  const _discHandlers = [];
  let _onGuestJoinCb = null;
  let _onGuestLeaveCb = null;

  const MAX_GUESTS = 8; // 호스트 1명 + 게스트/관전자 8명 = 최대 9명 // 호스트 1명 + 게스트 4명 = 최대 5명

  // 🌟 전용 Metered TURN & STUN 서버 설정 (대칭형 NAT / 모바일 LTE 5G / 엄격한 방화벽 완벽 우회)
  const ICE_CONFIG = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun.relay.metered.ca:80" },
      {
        urls: "turn:standard.relay.metered.ca:80",
        username: "8e667ca1e800004d636c0d8a",
        credential: "+AKW3QA+XCcdCfcf"
      },
      {
        urls: "turn:standard.relay.metered.ca:443",
        username: "8e667ca1e800004d636c0d8a",
        credential: "+AKW3QA+XCcdCfcf"
      },
      {
        urls: "turns:standard.relay.metered.ca:443?transport=tcp",
        username: "8e667ca1e800004d636c0d8a",
        credential: "+AKW3QA+XCcdCfcf"
      }
    ],
    iceCandidatePoolSize: 10
  };

  /* ── 💓 20초 간격 하트비트(Ping) 유지 (PeerJS 시그널링 & WebRTC NAT 만료 방지) ── */
  let _heartbeatInterval = null;

  function _startHeartbeat() {
    _stopHeartbeat();
    _heartbeatInterval = setInterval(() => {
      try {
        // 1. PeerJS 시그널링 서버 웹소켓 연결 유지
        if (_peer && _peer.socket) {
          if (_peer.socket._ws && _peer.socket._ws.readyState === WebSocket.OPEN) {
            try {
              _peer.socket._ws.send(JSON.stringify({ type: 'HEARTBEAT' }));
            } catch (_) {}
          }
        }

        // 2. 활성 WebRTC DataChannel NAT keep-alive 유지
        if (_isHost) {
          _conns.forEach((conn) => {
            if (conn && conn.open) {
              try { conn.send({ type: '__ping__', t: Date.now() }); } catch (_) {}
            }
          });
        } else if (_hostConn && _hostConn.open) {
          try { _hostConn.send({ type: '__ping__', t: Date.now() }); } catch (_) {}
        }
      } catch (err) {
        console.warn('[P2P] heartbeat warn:', err);
      }
    }, 20000); // 20초 간격
  }

  function _stopHeartbeat() {
    if (_heartbeatInterval) {
      clearInterval(_heartbeatInterval);
      _heartbeatInterval = null;
    }
  }

  /* ── 룸 코드 <-> 실제 Peer ID 변환 (공백 완전 제거 & trim) ── */
  function _codeToPeerId(code) {
    const clean = String(code || '').replace(/\s+/g, '').trim();
    return `${ROOM_PREFIX}${clean}`;
  }

  function _peerIdToCode(peerId) {
    if (peerId && peerId.startsWith(ROOM_PREFIX)) {
      return peerId.slice(ROOM_PREFIX.length).replace(/\s+/g, '').trim();
    }
    return String(peerId || '').replace(/\s+/g, '').trim();
  }

  /* ── 호스트 측: 게스트 연결 설정 (내부 예외 처리 및 견고한 수락 보장) ── */
  function _setupHostGuestConn(conn) {
    if (!conn) return;
    const peerId = conn.peer;

    if (_conns.size >= MAX_GUESTS) {
      console.warn('[P2P] 방 인원 초과(최대 9명). 연결 거부:', peerId);
      try {
        const rejectFull = () => {
          try { conn.send({ type: 'room_full', message: '방 인원이 가득 찼습니다 (최대 5명).' }); } catch (_) {}
          setTimeout(() => { try { conn.close(); } catch (_) {} }, 300);
        };
        if (conn.open) rejectFull();
        else conn.on('open', rejectFull);
      } catch (e) {
        console.error('[P2P] room_full reject err:', e);
      }
      return;
    }

    console.log('[P2P] 호스트: 게스트 연결 요청 감지 및 수락 처리 시작:', peerId);

    const handleOpen = () => {
      try {
        console.log('[P2P] 호스트: 게스트 연결 채널 open 성공:', peerId);
        _conns.set(peerId, conn);

        if (typeof _onGuestJoinCb === 'function') {
          _onGuestJoinCb(peerId);
        }
      } catch (err) {
        console.error('[P2P] host guest open callback err:', err);
      }
    };

    if (conn.open) {
      handleOpen();
    } else {
      conn.on('open', handleOpen);
    }

    conn.on('data', (raw) => {
      if (raw && typeof raw === 'object' && raw.type === '__ping__') {
        return; // keep-alive ping 무시
      }
      try {
        _msgHandlers.forEach(fn => {
          try { fn(raw, peerId); } catch (e) { console.error('[P2P] host msg handler err:', e); }
        });
      } catch (err) {
        console.error('[P2P] host on data fatal err:', err);
      }
    });

    conn.on('close', () => {
      try {
        console.log('[P2P] 호스트: 게스트 연결 종료:', peerId);
        _conns.delete(peerId);
        if (typeof _onGuestLeaveCb === 'function') {
          _onGuestLeaveCb(peerId);
        }
        _discHandlers.forEach(fn => { try { fn(peerId); } catch (_) {} });
      } catch (err) {
        console.error('[P2P] host guest close handler err:', err);
      }
    });

    conn.on('error', (err) => {
      try {
        console.warn('[P2P] 호스트: 게스트 conn error 발생:', peerId, err);
        _conns.delete(peerId);
        if (typeof _onGuestLeaveCb === 'function') {
          _onGuestLeaveCb(peerId);
        }
      } catch (e) {
        console.error('[P2P] host guest error handler fail:', e);
      }
    });
  }

  /* ── 게스트 측: 호스트 연결 설정 ── */
  function _setupGuestHostConn(conn) {
    if (!conn) return;
    _hostConn = conn;

    conn.on('data', (raw) => {
      if (raw && typeof raw === 'object' && raw.type === '__ping__') {
        return; // keep-alive ping 무시
      }
      try {
        _msgHandlers.forEach(fn => {
          try { fn(raw, 'host'); } catch (e) { console.error('[P2P] guest msg handler err:', e); }
        });
      } catch (err) {
        console.error('[P2P] guest on data err:', err);
      }
    });

    conn.on('close', () => {
      try {
        console.log('[P2P] 게스트: 호스트와의 연결 종료');
        _hostConn = null;
        _discHandlers.forEach(fn => { try { fn('host'); } catch (_) {} });
      } catch (err) {
        console.error('[P2P] guest close err:', err);
      }
    });

    conn.on('error', (err) => {
      console.warn('[P2P] 게스트: 호스트 conn error:', err);
    });
  }

  /* ── 방 만들기 (호스트) ── */
  function host(onGuestJoin, onGuestLeave, customRoomCode) {
    _isHost = true;
    _onGuestJoinCb = onGuestJoin;
    _onGuestLeaveCb = onGuestLeave;
    _conns.clear();

    return new Promise((resolve, reject) => {
      let attempts = 0;
      const MAX_ATTEMPTS = 12;

      function tryCreate() {
        attempts++;
        if (attempts > MAX_ATTEMPTS) {
          reject(new Error('방 생성 실패: 잠시 후 다시 시도해 주세요.'));
          return;
        }

        if (_peer) { try { _peer.destroy(); } catch (_) {} _peer = null; }

        // 4자리 고유 숫자 코드 생성 (customRoomCode가 주어지면 해당 코드 그대로 사용)
        const code = customRoomCode ? String(customRoomCode).trim() : String(Math.floor(1000 + Math.random() * 9000));
        const fullPeerId = _codeToPeerId(code);

        _peer = new Peer(fullPeerId, {
          debug: 1,
          config: ICE_CONFIG,
          iceCandidatePoolSize: 10
        });

        // 🌟 호스트 측 리스너 최우선 즉시 등록: 게스트 연결 요청 누락 방지
        _peer.on('connection', (conn) => {
          console.log('[P2P] 호스트가 새로운 게스트 접속 요청을 감지함:', conn ? conn.peer : 'unknown');
          try {
            _setupHostGuestConn(conn);
          } catch (e) {
            console.error('[P2P] _setupHostGuestConn 오류:', e);
          }
        });

        const openTimeout = setTimeout(() => {
          reject(new Error('PeerJS 시그널링 서버 응답 없음. 네트워크 상태를 확인하세요.'));
        }, 15000);

        _peer.on('open', (id) => {
          clearTimeout(openTimeout);
          _peerId = id;
          console.log('[P2P] 방 생성 완료! 코드:', code, '(PeerID:', id, ')');
          _startHeartbeat();
          resolve(code);
        });

        _peer.on('error', (err) => {
          clearTimeout(openTimeout);
          if (err.type === 'unavailable-id') {
            if (customRoomCode && attempts <= MAX_ATTEMPTS) {
              console.log(`[P2P] 방장 위임 코드 (${customRoomCode}) 해제 대기 중... 재시도 (${attempts}/${MAX_ATTEMPTS})`);
              setTimeout(tryCreate, 400);
              return;
            }
            console.log('[P2P] 방 코드 중복 감지, 다른 코드로 재시도...', code);
            setTimeout(tryCreate, 200);
          } else {
            console.error('[P2P] host error:', err);
            reject(new Error(err.message || '방 생성 오류'));
          }
        });
      }

      tryCreate();
    });
  }

  /* ── 방 참가 (게스트 - 자동 재시도 및 방화벽/시그널링 지연 극복) ── */
  function join(roomCode) {
    _isHost = false;

    return new Promise((resolve, reject) => {
      const cleanCode = String(roomCode || '').replace(/\s+/g, '').trim();
      const targetPeerId = _codeToPeerId(cleanCode);
      let attempts = 0;
      const MAX_JOIN_ATTEMPTS = 6;
      let isResolved = false;

      function tryConnect() {
        if (isResolved) return;
        attempts++;
        if (_peer) { try { _peer.destroy(); } catch (_) {} _peer = null; }

        console.log(`[P2P] 호스트 연결 시도 (${attempts}/${MAX_JOIN_ATTEMPTS}):`, targetPeerId);

        _peer = new Peer({
          debug: 1,
          config: ICE_CONFIG,
          iceCandidatePoolSize: 10
        });

        const connTimeout = setTimeout(() => {
          if (isResolved) return;
          if (attempts < MAX_JOIN_ATTEMPTS) {
            console.warn('[P2P] 연결 응답 지연, 재시도 중...', attempts);
            setTimeout(tryConnect, 600);
          } else {
            isResolved = true;
            reject(new Error('호스트를 찾을 수 없거나 응답하지 않습니다'));
          }
        }, 10000);

        _peer.on('error', (err) => {
          if (isResolved) return;
          console.warn('[P2P] join peer warning/error:', err.type, err.message);

          if (err.type === 'peer-unavailable' && attempts < MAX_JOIN_ATTEMPTS) {
            clearTimeout(connTimeout);
            console.log('[P2P] 방장 ID 브로커 등록 대기 중... 1초 후 재시도');
            setTimeout(tryConnect, 1000);
            return;
          }

          if (attempts >= MAX_JOIN_ATTEMPTS) {
            clearTimeout(connTimeout);
            isResolved = true;
            reject(new Error('호스트를 찾을 수 없거나 응답하지 않습니다'));
          }
        });

        _peer.on('open', (myId) => {
          if (isResolved) return;
          _peerId = myId;
          console.log('[P2P] 게스트 ID 생성 완료:', myId, '-> 호스트 connect 요청:', targetPeerId);

          const conn = _peer.connect(targetPeerId, {
            reliable: true
          });

          _setupGuestHostConn(conn);

          conn.on('open', () => {
            if (isResolved) return;
            isResolved = true;
            clearTimeout(connTimeout);
            console.log('[P2P] 호스트 연결 성공 완료!');
            _startHeartbeat();
            resolve();
          });

          conn.on('error', (err) => {
            if (isResolved) return;
            console.warn('[P2P] conn error:', err);
            if (attempts < MAX_JOIN_ATTEMPTS) {
              clearTimeout(connTimeout);
              setTimeout(tryConnect, 800);
            } else {
              isResolved = true;
              clearTimeout(connTimeout);
              reject(new Error('호스트를 찾을 수 없거나 응답하지 않습니다'));
            }
          });
        });
      }

      tryConnect();
    });
  }

  /* ── 데이터 전송 (단일 전송, 전체 브로드캐스트, 발신자 제외 릴레이) ── */
  function send(data, targetPeerId, excludePeerId) {
    if (_isHost) {
      if (targetPeerId) {
        const conn = _conns.get(targetPeerId);
        if (conn && conn.open) {
          try { conn.send(data); return true; } catch (e) { return false; }
        }
        return false;
      }
      // 전체 브로드캐스트 (excludePeerId가 있으면 해당 게스트 제외)
      let sentCount = 0;
      _conns.forEach((conn, peerId) => {
        if (excludePeerId && String(peerId) === String(excludePeerId)) return;
        if (conn && conn.open) {
          try {
            conn.send(data);
            sentCount++;
          } catch (e) {
            console.error('[P2P] Broadcast error to', peerId, e);
          }
        }
      });
      return sentCount > 0;
    } else {
      if (_hostConn && _hostConn.open) {
        try { _hostConn.send(data); return true; } catch (e) { return false; }
      }
      return false;
    }
  }

  /* ── 핸들러 관리 ── */
  function onMessage(fn) {
    if (fn && !_msgHandlers.includes(fn)) _msgHandlers.push(fn);
  }
  function offMessage(fn) {
    const i = _msgHandlers.indexOf(fn);
    if (i !== -1) _msgHandlers.splice(i, 1);
  }
  function setMessageHandler(fn) {
    _msgHandlers.length = 0;
    if (fn) _msgHandlers.push(fn);
  }

  function onDisconnect(fn) {
    if (fn && !_discHandlers.includes(fn)) _discHandlers.push(fn);
  }
  function offDisconnect(fn) {
    const i = _discHandlers.indexOf(fn);
    if (i !== -1) _discHandlers.splice(i, 1);
  }

  function isConnected() {
    if (_isHost) return _conns.size > 0;
    return !!_hostConn && _hostConn.open === true;
  }
  function isHost() { return _isHost; }
  function setIsHost(val) { _isHost = !!val; }
  function getMyId() { return _peerId; }
  function getGuestCount() { return _conns.size; }

  /* ── 특정 게스트 강퇴 (연결 강제 종료) ── */
  function kickGuest(peerId) {
    const conn = _conns.get(peerId);
    if (conn) {
      try { conn.close(); } catch (_) {}
      _conns.delete(peerId);
    }
  }

  function destroy() {
    _stopHeartbeat();
    _msgHandlers.length = 0;
    _discHandlers.length = 0;
    _onGuestJoinCb = null;
    _onGuestLeaveCb = null;

    if (_hostConn) { try { _hostConn.close(); } catch (_) {} _hostConn = null; }
    _conns.forEach(conn => { try { conn.close(); } catch (_) {} });
    _conns.clear();

    if (_peer) { try { _peer.destroy(); } catch (_) {} _peer = null; }
    _peerId = null;
    _isHost = false;
  }

  return {
    host, join, send,
    onMessage, offMessage, setMessageHandler,
    onDisconnect, offDisconnect,
    isConnected, isHost, setIsHost, getMyId, getGuestCount,
    kickGuest, destroy
  };
})();
