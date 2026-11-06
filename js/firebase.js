/**
 * firebase.js — Firebase v10 (ES Module CDN) 초기화 및 글로벌 로비 관리
 * window.FirebaseLobby 전역 객체를 통해 app.js와 통신합니다.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getDatabase, ref, set, get, remove, update, push,
  onValue, off, serverTimestamp, onDisconnect as dbOnDisconnect
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyBbDh0IsekvQ-HWtMq5gNYTWbg2vCfKlk4",
  authDomain: "acadeio.firebaseapp.com",
  projectId: "acadeio",
  storageBucket: "acadeio.firebasestorage.app",
  messagingSenderId: "842308981983",
  appId: "1:842308981983:web:707349072dac2d8324056a",
  measurementId: "G-7530Z1BKLJ",
  databaseURL: "https://acadeio-default-rtdb.firebaseio.com"
};

let _app, _db;
let _myRoomCode = null;
let _myRoomRef  = null;
let _roomHeartbeatInterval = null;
let _lobbyListenerRef = null;

try {
  _app = initializeApp(firebaseConfig);
  _db  = getDatabase(_app);
  console.log('[Firebase] 초기화 완료');
} catch (e) {
  console.error('[Firebase] 초기화 실패:', e);
}

const FirebaseLobby = {
  /**
   * 방 생성 — Firebase /rooms/{code} 에 방 정보 등록 + onDisconnect 자동 삭제 훅
   */
  async registerRoom(roomCode, hostName, peerId, maxPlayers, hostAvatarIcon, hostAvatarColor, isPrivate, hasPassword, hostNameColor, hostLevel, hostProfileCard, game) {
    if (!_db) return;
    _myRoomCode = roomCode;
    _myRoomRef  = ref(_db, `rooms/${roomCode}`);

    const roomData = {
      hostPeerId:      peerId,
      hostName:        hostName,
      hostNameColor:   hostNameColor || null,
      hostAvatarIcon:  hostAvatarIcon || 'fa-solid fa-paw',
      hostAvatarColor: hostAvatarColor || '#38a169',
      hostLevel:       typeof hostLevel === 'number' ? hostLevel : 1,
      hostProfileCard: hostProfileCard || 'default',
      game:            game || 'gomoku',
      playerCount:     1,
      maxPlayers:      maxPlayers || 5,
      isPrivate:       !!isPrivate,
      hasPassword:     !!hasPassword,
      status:          'waiting',
      createdAt:       Date.now(),
      lastSeen:        Date.now()
    };

    try {
      await set(_myRoomRef, roomData);
      // 방장 브라우저가 꺼지거나 연결이 끊기면 자동으로 방 데이터 삭제
      dbOnDisconnect(_myRoomRef).remove();

      // 방장 생존 하트비트 (15초마다 방 lastSeen 최신화)
      if (_roomHeartbeatInterval) clearInterval(_roomHeartbeatInterval);
      _roomHeartbeatInterval = setInterval(() => {
        if (_myRoomRef && _myRoomCode) {
          update(_myRoomRef, { lastSeen: Date.now() }).catch(() => {});
        }
      }, 15000);

      console.log('[Firebase] 방 등록 완료:', roomCode);
    } catch (err) {
      console.error('[Firebase] 방 등록 실패:', err);
    }
  },

  /**
   * 게임 종류 업데이트 (방장이 게임 변경 시)
   */
  async updateRoomGame(roomCode, game) {
    if (!_db) return;
    const code = roomCode || _myRoomCode;
    if (!code || !game) return;
    try {
      const roomSnap = await get(ref(_db, `rooms/${code}`));
      if (!roomSnap.exists()) return;
      await update(ref(_db, `rooms/${code}`), { game: game, lastSeen: Date.now() });
    } catch (err) {
      console.error('[Firebase] 게임 종류 업데이트 실패:', err);
    }
  },

  /**
   * 현재 인원 수 업데이트
   */
  async updatePlayerCount(roomCode, count) {
    if (!_db) return;
    const code = roomCode || _myRoomCode;
    if (!code) return;
    try {
      const roomSnap = await get(ref(_db, `rooms/${code}`));
      if (!roomSnap.exists()) return; // 이미 삭제/종료된 방에 부분 업데이트로 인한 유령 방 재생성 방지
      await update(ref(_db, `rooms/${code}`), { playerCount: count, lastSeen: Date.now() });
    } catch (err) {
      console.error('[Firebase] 인원 수 업데이트 실패:', err);
    }
  },

  /**
   * 방 수동 삭제 (방장이 방 나가기 클릭 시)
   */
  async removeRoom(roomCode) {
    if (!_db) return;
    const code = roomCode || _myRoomCode;
    if (_roomHeartbeatInterval) {
      clearInterval(_roomHeartbeatInterval);
      _roomHeartbeatInterval = null;
    }
    if (!code) return;
    try {
      await remove(ref(_db, `rooms/${code}`));
      _myRoomCode = null;
      _myRoomRef  = null;
      console.log('[Firebase] 방 삭제 완료:', code);
    } catch (err) {
      console.error('[Firebase] 방 삭제 실패:', err);
    }
  },

  /**
   * 방장 위임 시 구 방장의 onDisconnect 자동 삭제 훅 안전하게 해제
   */
  async cancelRoomOnDisconnect(roomCode) {
    if (!_db) return;
    const code = roomCode || _myRoomCode;
    if (_roomHeartbeatInterval) {
      clearInterval(_roomHeartbeatInterval);
      _roomHeartbeatInterval = null;
    }
    if (!code) return;
    try {
      if (_myRoomRef) {
        await dbOnDisconnect(_myRoomRef).cancel();
      }
      _myRoomCode = null;
      _myRoomRef = null;
      console.log('[Firebase] 구 방장 onDisconnect 훅 해제 완료:', code);
    } catch (err) {
      console.warn('[Firebase] cancelRoomOnDisconnect warn:', err);
    }
  },

  /**
   * 신규 방장이 Firebase 방 소유권 및 하트비트 인수
   */
  async claimRoomHost(roomCode, newHostData) {
    if (!_db || !roomCode) return;
    _myRoomCode = roomCode;
    _myRoomRef = ref(_db, `rooms/${roomCode}`);

    try {
      const roomSnap = await get(_myRoomRef);
      if (!roomSnap.exists()) return;

      const updatePayload = {
        hostName:        newHostData.name || '방장',
        hostPeerId:      newHostData.peerId || null,
        hostNameColor:   newHostData.nameColor || null,
        hostAvatarIcon:  newHostData.avatarIcon || 'fa-solid fa-paw',
        hostAvatarColor: newHostData.avatarColor || '#38a169',
        hostLevel:       typeof newHostData.level === 'number' ? newHostData.level : 1,
        hostProfileCard: newHostData.profileCard || 'default',
        lastSeen:        Date.now()
      };

      await update(_myRoomRef, updatePayload);

      // 새 방장의 onDisconnect 삭제 훅 등록
      try {
        dbOnDisconnect(_myRoomRef).remove();
      } catch (_) {}

      // 새 방장의 15초 하트비트 가동
      if (_roomHeartbeatInterval) clearInterval(_roomHeartbeatInterval);
      _roomHeartbeatInterval = setInterval(() => {
        if (_myRoomRef && _myRoomCode) {
          update(_myRoomRef, { lastSeen: Date.now() }).catch(() => {});
        }
      }, 15000);

      console.log('[Firebase] 신규 방장 소유권 인수 완료:', roomCode, newHostData.name);
    } catch (err) {
      console.error('[Firebase] claimRoomHost 실패:', err);
    }
  },

  /**
   * 방장 위임 후 Firebase 방 정보 업데이트
   */
  async updateRoomHost(roomCode, newHostName, newHostPeerId) {
    if (!_db) return;
    const code = roomCode || _myRoomCode;
    if (!code) return;
    try {
      const roomSnap = await get(ref(_db, `rooms/${code}`));
      if (!roomSnap.exists()) return;
      await update(ref(_db, `rooms/${code}`), {
        hostName:   newHostName,
        hostPeerId: newHostPeerId,
        lastSeen:   Date.now()
      });
      console.log('[Firebase] 방장 정보 업데이트 완료');
    } catch (err) {
      console.error('[Firebase] 방장 정보 업데이트 실패:', err);
    }
  },

  /**
   * 방장의 프로필 정보 (프로필 카드, 레벨, 닉네임 색상 등) 실시간 업데이트
   */
  async updateRoomHostProfile(roomCode, hostData) {
    if (!_db) return;
    const code = roomCode || _myRoomCode;
    if (!code || !hostData || typeof hostData !== 'object') return;
    try {
      const roomSnap = await get(ref(_db, `rooms/${code}`));
      if (!roomSnap.exists()) return;
      await update(ref(_db, `rooms/${code}`), {
        ...hostData,
        lastSeen: Date.now()
      });
      console.log('[Firebase] 방장 프로필 업데이트 완료');
    } catch (err) {
      console.error('[Firebase] 방장 프로필 업데이트 실패:', err);
    }
  },

  /**
   * 게임 시작/종료 시 status 업데이트
   */
  async updateRoomStatus(roomCode, status) {
    if (!_db) return;
    const code = roomCode || _myRoomCode;
    if (!code) return;
    try {
      const roomSnap = await get(ref(_db, `rooms/${code}`));
      if (!roomSnap.exists()) return;
      await update(ref(_db, `rooms/${code}`), { status, lastSeen: Date.now() });
    } catch (err) {
      console.error('[Firebase] status 업데이트 실패:', err);
    }
  },

  /**
   * 로비 실시간 수신 시작 (onValue)
   */
  onLobbyUpdate(callback) {
    if (!_db) return;
    _lobbyListenerRef = ref(_db, 'rooms');
    onValue(_lobbyListenerRef, (snapshot) => {
      const val = snapshot.val();
      if (!val || typeof val !== 'object') {
        callback(null);
        return;
      }
      const now = Date.now();
      const validRooms = {};
      Object.keys(val).forEach(code => {
        const r = val[code];
        if (!r || typeof r !== 'object') return;
        // 1. 호스트 정보(Peer ID 또는 호스트 이름)가 누락된 유령 방 자동 정리 및 제거
        if (!r.hostPeerId && !r.hostName) {
          remove(ref(_db, `rooms/${code}`)).catch(() => {});
          return;
        }
        // 2. 하트비트가 45초 이상 끊겼거나 6시간 이상 경과한 방 자동 정리 및 제거
        if (r.lastSeen && (now - r.lastSeen > 45000)) {
          remove(ref(_db, `rooms/${code}`)).catch(() => {});
          return;
        }
        if (r.createdAt && (now - r.createdAt > 6 * 60 * 60 * 1000)) {
          remove(ref(_db, `rooms/${code}`)).catch(() => {});
          return;
        }
        validRooms[code] = r;
      });
      callback(Object.keys(validRooms).length > 0 ? validRooms : null);
    }, (err) => {
      console.error('[Firebase] 로비 수신 오류:', err);
      callback(null);
    });
  },

  /**
   * 로비 수신 해제
   */
  offLobbyUpdate() {
    if (!_db || !_lobbyListenerRef) return;
    off(_lobbyListenerRef);
    _lobbyListenerRef = null;
  },

  /**
   * 🌟 실시간 사이트 접속자 등록 (방 목록과 100% 동일한 onDisconnect 자동 삭제)
   */
  async registerOnlineUser(userPayload) {
    if (!_db) return;
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

    _myUserPresenceKey = sessionKey;
    _myUserPresenceRef = ref(_db, `online_users/${sessionKey}`);

    const payload = {
      ...userPayload,
      presenceKey: sessionKey,
      lastSeen: Date.now()
    };

    try {
      await set(_myUserPresenceRef, payload);
      // 브라우저 닫힘 / 강제 종료 시 Firebase 서버에서 즉시 자동 삭제
      dbOnDisconnect(_myUserPresenceRef).remove();

      // 15초 주기 하트비트로 생존 신호 최신화
      if (!_presenceHeartbeatInterval) {
        _presenceHeartbeatInterval = setInterval(() => {
          if (_myUserPresenceRef) {
            update(_myUserPresenceRef, { lastSeen: Date.now() }).catch(() => {});
          }
        }, 15000);
      }
    } catch (err) {
      console.warn('[Firebase] 접속자 등록 실패:', err);
    }
  },

  /**
   * 실시간 사이트 접속자 정보 업데이트 (닉네임/아바타/레벨 변경 시)
   */
  async updateOnlineUser(newPayload) {
    if (!_db || !_myUserPresenceRef) return;
    try {
      const payload = {
        ...newPayload,
        presenceKey: _myUserPresenceKey,
        lastSeen: Date.now()
      };
      await set(_myUserPresenceRef, payload);
    } catch (err) {
      console.warn('[Firebase] 접속자 정보 갱신 실패:', err);
    }
  },

  /**
   * 실시간 사이트 접속자 삭제 (로그아웃 시 기존 계정 즉시 제거)
   */
  async removeOnlineUser() {
    if (!_db) return;
    try {
      if (_myUserPresenceRef) {
        await remove(_myUserPresenceRef);
      }
    } catch (_) {}
    _myUserPresenceRef = null;
    _myUserPresenceKey = null;
    try {
      sessionStorage.removeItem('inu_presence_key');
    } catch (_) {}
  },

  /**
   * 실시간 사이트 접속자 목록 수신 (방 목록과 동일한 onValue 실시간 푸시)
   */
  onOnlineUsersUpdate(callback) {
    if (!_db) return;
    _onlineUsersListenerRef = ref(_db, 'online_users');
    onValue(_onlineUsersListenerRef, (snapshot) => {
      const val = snapshot.val();
      const users = [];
      if (val && typeof val === 'object') {
        const now = Date.now();
        Object.keys(val).forEach(key => {
          const u = val[key];
          if (u && typeof u === 'object') {
            // 35초 주기(하트비트 15초 대비 2회 이상) 무응답 유령 세션 즉각 필터링
            if (!u.lastSeen || (now - u.lastSeen < 35000)) {
              users.push({ ...u, presenceKey: u.presenceKey || key });
            }
          }
        });
      }
      callback(users);
    }, (err) => {
      console.warn('[Firebase] 접속자 목록 수신 오류:', err);
      callback(null);
    });
  },

  /**
   * 접속자 목록 수동 즉시 새로고침
   */
  async refreshOnlineUsers() {
    if (!_db) return null;
    try {
      if (_myUserPresenceRef) {
        await update(_myUserPresenceRef, { lastSeen: Date.now() });
      }
      const snapshot = await get(ref(_db, 'online_users'));
      const val = snapshot.val();
      const users = [];
      if (val && typeof val === 'object') {
        const now = Date.now();
        Object.keys(val).forEach(key => {
          const u = val[key];
          if (u && typeof u === 'object') {
            if (!u.lastSeen || (now - u.lastSeen < 35000)) {
              users.push({ ...u, presenceKey: u.presenceKey || key });
            }
          }
        });
      }
      return users;
    } catch (err) {
      console.warn('[Firebase] 접속자 수동 갱신 오류:', err);
      return null;
    }
  },

  /**
   * 친구 방 초대 전송 (/room_invites/{targetNickname})
   */
  async sendRoomInvite(targetNickname, inviteData) {
    if (!_db || !targetNickname) return false;
    try {
      const cleanKey = encodeURIComponent(String(targetNickname).trim()).replace(/\./g, '%2E');
      const targetRef = ref(_db, `room_invites/${cleanKey}`);
      await set(targetRef, {
        ...inviteData,
        timestamp: Date.now()
      });
      setTimeout(() => {
        try { remove(targetRef).catch(() => {}); } catch (_) {}
      }, 45000);
      return true;
    } catch (err) {
      console.warn('[Firebase] 방 초대 발송 실패:', err);
      return false;
    }
  },

  /**
   * 내 닉네임으로 오는 방 초대 수신 리스너
   */
  onRoomInvite(myNickname, callback) {
    if (!_db || !myNickname) return null;
    try {
      const cleanKey = encodeURIComponent(String(myNickname).trim()).replace(/\./g, '%2E');
      const myInviteRef = ref(_db, `room_invites/${cleanKey}`);
      onValue(myInviteRef, (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === 'object' && val.roomCode) {
          const age = Date.now() - (val.timestamp || 0);
          if (age < 45000) {
            callback(val);
            return;
          }
        }
        callback(null);
      });
      return myInviteRef;
    } catch (err) {
      console.warn('[Firebase] 방 초대 리스너 등록 실패:', err);
      return null;
    }
  },

  /**
   * 수락/거절된 초대장 정리
   */
  async removeRoomInvite(myNickname) {
    if (!_db || !myNickname) return;
    try {
      const cleanKey = encodeURIComponent(String(myNickname).trim()).replace(/\./g, '%2E');
      await remove(ref(_db, `room_invites/${cleanKey}`));
    } catch (_) {}
  },

  /**
   * ── 실시간 친구 신청 및 수락/거절 시스템 ──
   */
  async sendFriendRequest(targetKey, targetName, requestData) {
    if (!_db || !targetKey || !requestData) return false;
    try {
      const cleanTargetKey = encodeURIComponent(String(targetKey).trim()).replace(/\./g, '%2E');
      const cleanFromKey = encodeURIComponent(String(requestData.fromKey).trim()).replace(/\./g, '%2E');
      await set(ref(_db, `friend_requests/${cleanTargetKey}/${cleanFromKey}`), requestData);

      if (targetName) {
        const cleanName = encodeURIComponent(String(targetName).trim()).replace(/\./g, '%2E');
        await set(ref(_db, `friend_requests_by_name/${cleanName}/${cleanFromKey}`), requestData);
      }
      return true;
    } catch (err) {
      console.warn('[Firebase] 친구 신청 전송 실패:', err);
      return false;
    }
  },

  onFriendRequests(myKey, myNickname, callback) {
    if (!_db || (!myKey && !myNickname)) return null;
    try {
      const keyRequests = {};
      const nameRequests = {};

      const notifyMerged = () => {
        const merged = {};
        Object.values(keyRequests).forEach(r => { if (r && r.fromKey) merged[r.fromKey] = r; });
        Object.values(nameRequests).forEach(r => { if (r && r.fromKey) merged[r.fromKey] = r; });
        callback(Object.values(merged));
      };

      if (myKey) {
        const cleanKey = encodeURIComponent(String(myKey).trim()).replace(/\./g, '%2E');
        onValue(ref(_db, `friend_requests/${cleanKey}`), (snapshot) => {
          const val = snapshot.val() || {};
          Object.keys(keyRequests).forEach(k => delete keyRequests[k]);
          Object.assign(keyRequests, val);
          notifyMerged();
        });
      }

      if (myNickname) {
        const cleanName = encodeURIComponent(String(myNickname).trim()).replace(/\./g, '%2E');
        onValue(ref(_db, `friend_requests_by_name/${cleanName}`), (snapshot) => {
          const val = snapshot.val() || {};
          Object.keys(nameRequests).forEach(k => delete nameRequests[k]);
          Object.assign(nameRequests, val);
          notifyMerged();
        });
      }
    } catch (err) {
      console.warn('[Firebase] 친구 신청 리스너 등록 실패:', err);
    }
  },

  async removeFriendRequest(myKey, myNickname, fromKey) {
    if (!_db || !fromKey) return;
    try {
      const cleanFromKey = encodeURIComponent(String(fromKey).trim()).replace(/\./g, '%2E');
      if (myKey) {
        const cleanKey = encodeURIComponent(String(myKey).trim()).replace(/\./g, '%2E');
        await remove(ref(_db, `friend_requests/${cleanKey}/${cleanFromKey}`));
      }
      if (myNickname) {
        const cleanName = encodeURIComponent(String(myNickname).trim()).replace(/\./g, '%2E');
        await remove(ref(_db, `friend_requests_by_name/${cleanName}/${cleanFromKey}`));
      }
    } catch (_) {}
  },

  async sendFriendAccept(targetKey, targetName, acceptData) {
    if (!_db || !targetKey || !acceptData) return false;
    try {
      const cleanTargetKey = encodeURIComponent(String(targetKey).trim()).replace(/\./g, '%2E');
      const cleanFromKey = encodeURIComponent(String(acceptData.fromKey).trim()).replace(/\./g, '%2E');
      await set(ref(_db, `friend_accepts/${cleanTargetKey}/${cleanFromKey}`), acceptData);

      if (targetName) {
        const cleanName = encodeURIComponent(String(targetName).trim()).replace(/\./g, '%2E');
        await set(ref(_db, `friend_accepts_by_name/${cleanName}/${cleanFromKey}`), acceptData);
      }
      return true;
    } catch (err) {
      console.warn('[Firebase] 친구 수락 알림 전송 실패:', err);
      return false;
    }
  },

  onFriendAccepts(myKey, myNickname, callback) {
    if (!_db || (!myKey && !myNickname)) return null;
    try {
      if (myKey) {
        const cleanKey = encodeURIComponent(String(myKey).trim()).replace(/\./g, '%2E');
        onValue(ref(_db, `friend_accepts/${cleanKey}`), (snapshot) => {
          const val = snapshot.val();
          if (val && typeof val === 'object') {
            Object.values(val).forEach(acc => {
              if (acc && acc.fromKey) callback(acc);
            });
          }
        });
      }
      if (myNickname) {
        const cleanName = encodeURIComponent(String(myNickname).trim()).replace(/\./g, '%2E');
        onValue(ref(_db, `friend_accepts_by_name/${cleanName}`), (snapshot) => {
          const val = snapshot.val();
          if (val && typeof val === 'object') {
            Object.values(val).forEach(acc => {
              if (acc && acc.fromKey) callback(acc);
            });
          }
        });
      }
    } catch (err) {
      console.warn('[Firebase] 친구 수락 리스너 등록 실패:', err);
    }
  },

  async removeFriendAccept(myKey, myNickname, fromKey) {
    if (!_db || !fromKey) return;
    try {
      const cleanFromKey = encodeURIComponent(String(fromKey).trim()).replace(/\./g, '%2E');
      if (myKey) {
        const cleanKey = encodeURIComponent(String(myKey).trim()).replace(/\./g, '%2E');
        await remove(ref(_db, `friend_accepts/${cleanKey}/${cleanFromKey}`));
      }
      if (myNickname) {
        const cleanName = encodeURIComponent(String(myNickname).trim()).replace(/\./g, '%2E');
        await remove(ref(_db, `friend_accepts_by_name/${cleanName}/${cleanFromKey}`));
      }
    } catch (_) {}
  },

  async cancelFriendRequest(targetKey, targetName, myKey) {
    if (!_db || !myKey) return;
    try {
      const cleanMyKey = encodeURIComponent(String(myKey).trim()).replace(/\./g, '%2E');
      if (targetKey) {
        const cleanTargetKey = encodeURIComponent(String(targetKey).trim()).replace(/\./g, '%2E');
        await remove(ref(_db, `friend_requests/${cleanTargetKey}/${cleanMyKey}`));
      }
      if (targetName) {
        const cleanName = encodeURIComponent(String(targetName).trim()).replace(/\./g, '%2E');
        await remove(ref(_db, `friend_requests_by_name/${cleanName}/${cleanMyKey}`));
      }
    } catch (_) {}
  },

  async sendFriendRemoval(targetKey, targetName, removalData) {
    if (!_db || (!targetKey && !targetName) || !removalData) return false;
    try {
      const cleanFromKey = encodeURIComponent(String(removalData.fromKey).trim()).replace(/\./g, '%2E');
      if (targetKey) {
        const cleanTargetKey = encodeURIComponent(String(targetKey).trim()).replace(/\./g, '%2E');
        await set(ref(_db, `friend_removals/${cleanTargetKey}/${cleanFromKey}`), removalData);
      }
      if (targetName) {
        const cleanName = encodeURIComponent(String(targetName).trim()).replace(/\./g, '%2E');
        await set(ref(_db, `friend_removals_by_name/${cleanName}/${cleanFromKey}`), removalData);
      }
      return true;
    } catch (err) {
      console.warn('[Firebase] 친구 삭제 알림 전송 실패:', err);
      return false;
    }
  },

  onFriendRemovals(myKey, myNickname, callback) {
    if (!_db || (!myKey && !myNickname)) return null;
    try {
      if (myKey) {
        const cleanKey = encodeURIComponent(String(myKey).trim()).replace(/\./g, '%2E');
        onValue(ref(_db, `friend_removals/${cleanKey}`), (snapshot) => {
          const val = snapshot.val();
          if (val && typeof val === 'object') {
            Object.values(val).forEach(rem => {
              if (rem && rem.fromKey) callback(rem);
            });
          }
        });
      }
      if (myNickname) {
        const cleanName = encodeURIComponent(String(myNickname).trim()).replace(/\./g, '%2E');
        onValue(ref(_db, `friend_removals_by_name/${cleanName}`), (snapshot) => {
          const val = snapshot.val();
          if (val && typeof val === 'object') {
            Object.values(val).forEach(rem => {
              if (rem && rem.fromKey) callback(rem);
            });
          }
        });
      }
    } catch (err) {
      console.warn('[Firebase] 친구 삭제 리스너 등록 실패:', err);
    }
  },

  async removeFriendRemoval(myKey, myNickname, fromKey) {
    if (!_db || !fromKey) return;
    try {
      const cleanFromKey = encodeURIComponent(String(fromKey).trim()).replace(/\./g, '%2E');
      if (myKey) {
        const cleanKey = encodeURIComponent(String(myKey).trim()).replace(/\./g, '%2E');
        await remove(ref(_db, `friend_removals/${cleanKey}/${cleanFromKey}`));
      }
      if (myNickname) {
        const cleanName = encodeURIComponent(String(myNickname).trim()).replace(/\./g, '%2E');
        await remove(ref(_db, `friend_removals_by_name/${cleanName}/${cleanFromKey}`));
      }
    } catch (_) {}
  },

  /**
   * 버그 문의 및 피드백 접수 — Firebase /bug_reports/{id} 실시간 저장 + 타임아웃 방어 & 로컬 백업
   */
  async submitBugReport(reportData) {
    const payload = {
      userId: reportData.userId || '',
      userNickname: reportData.userNickname || '익명',
      type: reportData.type || 'bug',
      game: reportData.game || 'all',
      title: reportData.title || '',
      content: reportData.content || '',
      deviceInfo: reportData.deviceInfo || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
      createdAt: Date.now(),
      version: '1.0.2',
      status: 'open'
    };

    if (!_db) {
      this._saveBugReportLocal(payload);
      return { success: true, localOnly: true };
    }

    try {
      const reportsRef = ref(_db, 'bug_reports');
      const newRef = push(reportsRef);
      payload.id = newRef.key;

      // ⏱️ Firebase 네트워크 멈춤/무한 대기 방어: 4초 타임아웃
      const savePromise = set(newRef, payload);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 4000)
      );

      await Promise.race([savePromise, timeoutPromise]);
      console.log('[Firebase] 버그 문의 등록 완료:', newRef.key);
      this._saveBugReportLocal(payload);
      return { success: true, id: newRef.key };
    } catch (e) {
      console.warn('[Firebase] submitBugReport 서버 응답 지연/오류 -> 로컬 안전 백업:', e);
      this._saveBugReportLocal(payload);
      // 사용자에게 실패 대신 로컬 백업 성공으로 처리하여 무한 대기 및 실망 방지
      return { success: true, id: 'local_' + Date.now(), localOnly: true };
    }
  },

  _saveBugReportLocal(data) {
    try {
      const raw = localStorage.getItem('arcade_saved_inquiries') || '[]';
      const list = JSON.parse(raw);
      list.push({ ...data, savedAt: Date.now() });
      if (list.length > 50) list.shift();
      localStorage.setItem('arcade_saved_inquiries', JSON.stringify(list));
    } catch (_) {}
  },

  isReady() {
    return !!_db;
  }
};

let _myUserPresenceRef = null;
let _myUserPresenceKey = null;
let _onlineUsersListenerRef = null;
let _presenceHeartbeatInterval = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (_roomHeartbeatInterval) {
      clearInterval(_roomHeartbeatInterval);
      _roomHeartbeatInterval = null;
    }
    if (_db && _myRoomRef) {
      remove(_myRoomRef).catch(() => {});
    }
    if (_db && _myUserPresenceRef) {
      remove(_myUserPresenceRef).catch(() => {});
    }
  });
}

window.FirebaseLobby = FirebaseLobby;

// app.js가 준비를 기다릴 수 있도록 커스텀 이벤트 발행
window.dispatchEvent(new CustomEvent('firebase-ready'));
