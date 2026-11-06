/**
 * inu_study.js - 스터디룸 (INU Pomodoro Study Together)
 * 다 함께 공부하고 몰입할 수 있는 스터디 플랫폼입니다.
 * 방장이 뽀모도로(집중 25분 / 휴식 5분) 타이머를 켜고 끄며, 참가자들의 실시간 열공 상태와 목표를 공유합니다.
 */

const InuStudyGame = (() => {
  // 기본 뽀모도로 시간 (초 단위)
  const FOCUS_DURATION = 25 * 60; // 25분
  const BREAK_DURATION = 5 * 60;  // 5분

  let _container = null;
  let _onResult = null;
  let _context = null;

  let _isHost = false;
  let _myId = '';
  let _myName = '';
  let _players = [];

  // 뽀모도로 타이머 상태 (방장 주관 동기화)
  let _pomoMode = 'focus'; // 'focus' | 'break'
  let _pomoRunning = false;
  let _pomoSecondsLeft = FOCUS_DURATION;
  let _pomoTotalSeconds = FOCUS_DURATION;
  let _pomoInterval = null;

  // 개인별 공부 상태 및 누적 시간
  // { [playerId]: { status: 'studying'|'resting'|'away', studySeconds: 0, subject: string, lastActive: number } }
  let _playerStates = {};
  let _myStudyTimer = null;

  // Web Audio 백색소음 상태
  let _audioCtx = null;
  let _noiseNode = null;
  let _gainNode = null;
  let _currentNoiseType = 'off'; // 'off' | 'rain' | 'library' | 'cafe'

  function init(container, onResult, context) {
    _container = container;
    _onResult = onResult;
    _context = context || {};

    _isHost = !!_context.isHost;
    _myId = _context.myId || 'me';
    _myName = _context.myNickname || '스터디원';
    _players = Array.isArray(_context.players) && _context.players.length > 0
      ? _context.players
      : [{ id: _myId, name: _myName, avatarIcon: 'fa-solid fa-user', avatarColor: '#3b82f6' }];

    // 플레이어별 상태 초기화
    _playerStates = {};
    _players.forEach(p => {
      _playerStates[p.id] = {
        name: p.name,
        avatarIcon: p.avatarIcon || 'fa-solid fa-user',
        avatarColor: p.avatarColor || '#3b82f6',
        status: 'studying', // 기본값: 열공 모드
        studySeconds: 0,
        subject: p.id === _myId ? '인천대 전공/시험 공부' : '열공 중',
        lastTick: Date.now()
      };
    });

    _pomoMode = 'focus';
    _pomoRunning = false;
    _pomoSecondsLeft = FOCUS_DURATION;
    _pomoTotalSeconds = FOCUS_DURATION;

    // P2P 메시지 리스너 등록
    P2P.onMessage(_handleMessage);

    _renderStudyRoomUI();
    _startPersonalStopwatch();

    // 방장일 경우 초기 상태 브로드캐스트
    if (_isHost) {
      _broadcastPomoState();
    }
  }

  function _renderStudyRoomUI() {
    if (!_container) return;

    _container.innerHTML = `
      <div class="inu-study-wrapper">
        <!-- 1. 상단 대시보드: 뽀모도로 타이머 & 제어판 -->
        <div class="inu-pomo-dashboard card">
          <div class="inu-pomo-header" style="justify-content: flex-end;">
            <!-- 백색 소음 선택 드롭다운 -->
            <div class="inu-ambient-controls">
              <i class="fa-solid fa-headphones" style="color:var(--primary);"></i>
              <select id="select-ambient-noise" class="inu-ambient-select" title="집중 백색소음 선택">
                <option value="off">🔇 백색소음 끔</option>
                <option value="rain">🌧️ 송도 빗소리</option>
                <option value="library">📚 학산도서관 앰비언스</option>
                <option value="cafe">☕ 캠퍼스 카페 소음</option>
              </select>
            </div>
          </div>

          <!-- 대형 뽀모도로 원형/디지털 타이머 -->
          <div class="inu-pomo-clock-area">
            <div class="inu-pomo-time-display ${_pomoRunning ? 'pulsing' : ''}" id="inu-pomo-time-display">
              ${_formatTime(_pomoSecondsLeft)}
            </div>
            <div class="inu-pomo-progress-track">
              <div class="inu-pomo-progress-fill" id="inu-pomo-progress-fill" style="width: ${((_pomoTotalSeconds - _pomoSecondsLeft) / _pomoTotalSeconds) * 100}%;"></div>
            </div>
          </div>

          <!-- 방장 타이머 컨트롤러 -->
          <div class="inu-pomo-actions">
            ${_isHost ? `
              <button type="button" class="btn ${_pomoRunning ? 'btn-primary' : 'btn-gold'} btn-sm inu-btn-pomo" id="btn-pomo-toggle">
                <i class="fa-solid ${_pomoRunning ? 'fa-pause' : 'fa-play'}"></i>
                <span id="btn-pomo-toggle-text">${_pomoRunning ? '일시정지' : '뽀모도로 시작'}</span>
              </button>
              <button type="button" class="btn btn-outline btn-sm inu-btn-pomo" id="btn-pomo-switch-mode">
                <i class="fa-solid fa-repeat"></i>
                <span>${_pomoMode === 'focus' ? '휴식(5분)으로 전환' : '집중(25분)으로 전환'}</span>
              </button>
              <button type="button" class="btn btn-outline btn-sm inu-btn-pomo" id="btn-pomo-reset">
                <i class="fa-solid fa-arrow-rotate-left"></i>
                <span>리셋</span>
              </button>
              <button type="button" class="btn btn-outline btn-sm inu-btn-pomo text-danger" id="btn-study-finish" style="margin-left:auto;">
                <i class="fa-solid fa-flag-checkered"></i>
                <span>스터디 마무리</span>
              </button>
            ` : `
              <div class="inu-pomo-guest-info">
                <i class="fa-solid fa-crown" style="color:#FCAF15; margin-right:6px;"></i>
                <span>방장님이 뽀모도로 타이머를 제어하고 있습니다. 함께 몰입해보세요!</span>
              </div>
            `}
          </div>
        </div>

        <!-- 2. 내 공부 상태 바 (과목 설정) -->
        <div class="inu-my-study-bar card">
          <div class="inu-msb-left" style="width:100%;">
            <div class="inu-msb-label"><i class="fa-solid fa-book-open" style="color:var(--primary);"></i> 공부 중인 과목:</div>
            <input
              type="text"
              id="input-my-study-goal"
              class="inu-study-goal-input"
              value="${_escapeHtml((_playerStates[_myId] && _playerStates[_myId].subject) || '인천대 전공/시험 공부')}"
              maxlength="40"
              placeholder="예: 컴퓨터네트워크 5장 복습, 토익 RC 파트5 등"
            />
          </div>
        </div>

        <!-- 3. 실시간 참가자 스터디룸 그리드 카드 -->
        <div class="inu-study-grid-header">
          <h3><i class="fa-solid fa-users" style="color:var(--primary);"></i> 스터디원 실시간 현황 (${_players.length}명)</h3>
        </div>
        <div class="inu-study-players-grid" id="inu-study-players-grid">
          ${_renderPlayerCardsHtml()}
        </div>
      </div>
    `;

    _bindUIEvents();
  }

  function _bindUIEvents() {
    // 뽀모도로 컨트롤러
    const btnToggle = document.getElementById('btn-pomo-toggle');
    const btnSwitch = document.getElementById('btn-pomo-switch-mode');
    const btnReset = document.getElementById('btn-pomo-reset');
    const btnFinish = document.getElementById('btn-study-finish');

    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        _pomoRunning = !_pomoRunning;
        if (_pomoRunning) {
          _startPomoTimer();
        } else {
          _stopPomoTimer();
        }
        _broadcastPomoState();
        _updatePomoControlsUI();
      });
    }

    if (btnSwitch) {
      btnSwitch.addEventListener('click', () => {
        _pomoMode = (_pomoMode === 'focus') ? 'break' : 'focus';
        _pomoSecondsLeft = (_pomoMode === 'focus') ? FOCUS_DURATION : BREAK_DURATION;
        _pomoTotalSeconds = _pomoSecondsLeft;
        _broadcastPomoState();
        _updatePomoControlsUI();
        _updatePomoClockUI();
        showToast(_pomoMode === 'focus' ? '🎯 25분 집중 모드로 전환되었습니다.' : '☕ 5분 휴식 모드로 전환되었습니다.', 'info');
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        _pomoSecondsLeft = (_pomoMode === 'focus') ? FOCUS_DURATION : BREAK_DURATION;
        _broadcastPomoState();
        _updatePomoClockUI();
        showToast('타이머가 리셋되었습니다.', 'info');
      });
    }

    if (btnFinish) {
      btnFinish.addEventListener('click', () => {
        _finishStudySession();
      });
    }

    // 과목 변경 이벤트
    const goalInput = document.getElementById('input-my-study-goal');
    if (goalInput) {
      goalInput.addEventListener('change', () => {
        const val = goalInput.value.trim() || '시험 공부';
        if (_playerStates[_myId]) {
          _playerStates[_myId].subject = val;
        }
        P2P.send({
          type: 'inu_study_subject',
          playerId: _myId,
          subject: val
        });
        _updatePlayerCardsUI();
        showToast('공부 중인 과목이 갱신되었습니다.', 'success');
      });
    }

    // 백색 소음 드롭다운 이벤트
    const selectAmbient = document.getElementById('select-ambient-noise');
    if (selectAmbient) {
      selectAmbient.value = _currentNoiseType;
      selectAmbient.addEventListener('change', (e) => {
        _setAmbientNoise(e.target.value);
      });
    }
  }

  function _renderPlayerCardsHtml() {
    return _players.map(p => {
      const state = _playerStates[p.id] || {
        studySeconds: 0,
        subject: '공부 중'
      };
      const isMe = String(p.id) === String(_myId);
      const isPomoActive = (_pomoRunning && _pomoMode === 'focus');

      return `
        <div class="inu-study-card card ${isPomoActive ? 'active-study-flame' : ''} ${isMe ? 'is-me-card' : ''}" id="study-card-${p.id}">
          <div class="inu-sc-top">
            <div class="inu-sc-avatar-wrap">
              <div class="inu-sc-avatar" style="background:${p.avatarColor || '#3b82f6'};">
                <i class="${p.avatarIcon || 'fa-solid fa-user'}"></i>
              </div>
              ${isPomoActive ? '<span class="inu-flame-dot">🔥</span>' : ''}
            </div>
            <div class="inu-sc-info">
              <div class="inu-sc-name">
                <strong>${_escapeHtml(p.name)}</strong>
                ${isMe ? '<span class="online-me-badge">나</span>' : ''}
              </div>
            </div>
          </div>

          <!-- 공부 중인 과목 -->
          <div class="inu-sc-subject" title="${_escapeHtml(state.subject || '공부 중')}">
            <i class="fa-solid fa-book-bookmark" style="color:var(--primary);"></i>
            <span>${_escapeHtml(state.subject || '공부 중')}</span>
          </div>

          <!-- 집중 시간 -->
          <div class="inu-sc-time-box">
            <div class="inu-sc-time-value" id="study-time-${p.id}">⏱️ ${_formatTime(state.studySeconds)}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function _updatePlayerCardsUI() {
    const grid = document.getElementById('inu-study-players-grid');
    if (grid) {
      grid.innerHTML = _renderPlayerCardsHtml();
    }
  }

  function _updateMyStatusBarUI() {
    // 상태 토글 버튼 제거에 따른 UI 스텁
  }

  function _startPersonalStopwatch() {
    if (_myStudyTimer) clearInterval(_myStudyTimer);
    _myStudyTimer = setInterval(() => {
      // 뽀모도로 타이머가 시작되어 실행 중일 때만(집중 모드) 집중 시간이 흐름!
      if (!_pomoRunning || _pomoMode !== 'focus') return;

      // 내가 집중 중이라면 내 시간 증가
      if (_playerStates[_myId]) {
        _playerStates[_myId].studySeconds++;
        const el = document.getElementById(`study-time-${_myId}`);
        if (el) {
          el.textContent = `⏱️ ${_formatTime(_playerStates[_myId].studySeconds)}`;
        }
      }

      // 다른 플레이어들도 로컬에서 1초씩 누적 (실시간 동기화)
      _players.forEach(p => {
        if (p.id !== _myId && _playerStates[p.id]) {
          _playerStates[p.id].studySeconds++;
          const el = document.getElementById(`study-time-${p.id}`);
          if (el) {
            el.textContent = `⏱️ ${_formatTime(_playerStates[p.id].studySeconds)}`;
          }
        }
      });
    }, 1000);
  }

  function _startPomoTimer() {
    if (_pomoInterval) clearInterval(_pomoInterval);
    _pomoInterval = setInterval(() => {
      if (!_pomoRunning) return;
      _pomoSecondsLeft--;
      _updatePomoClockUI();

      if (_pomoSecondsLeft <= 0) {
        _pomoRunning = false;
        clearInterval(_pomoInterval);
        _pomoInterval = null;
        _onPomoCompleted();
      }
    }, 1000);
  }

  function _stopPomoTimer() {
    if (_pomoInterval) {
      clearInterval(_pomoInterval);
      _pomoInterval = null;
    }
    _pomoRunning = false;
    _updatePomoClockUI();
  }

  function _onPomoCompleted() {
    if (typeof Sound !== 'undefined' && Sound.playWin) Sound.playWin();

    if (_pomoMode === 'focus') {
      showToast('🎉 25분 집중 시간이 끝났습니다! 5분간 달콤한 휴식을 취하세요.', 'success');
      _pomoMode = 'break';
      _pomoSecondsLeft = BREAK_DURATION;
      _pomoTotalSeconds = BREAK_DURATION;
    } else {
      showToast('⏰ 휴식 시간이 끝났습니다! 새로운 25분 집중 세션을 시작해볼까요?', 'info');
      _pomoMode = 'focus';
      _pomoSecondsLeft = FOCUS_DURATION;
      _pomoTotalSeconds = FOCUS_DURATION;
    }

    _broadcastPomoState();
    _updatePomoControlsUI();
    _updatePomoClockUI();
  }

  function _updatePomoClockUI() {
    const display = document.getElementById('inu-pomo-time-display');
    const fill = document.getElementById('inu-pomo-progress-fill');
    if (display) {
      display.textContent = _formatTime(_pomoSecondsLeft);
      display.classList.toggle('pulsing', _pomoRunning);
    }
    if (fill) {
      const pct = Math.max(0, Math.min(100, ((_pomoTotalSeconds - _pomoSecondsLeft) / _pomoTotalSeconds) * 100));
      fill.style.width = `${pct}%`;
    }
  }

  function _updatePomoControlsUI() {
    const toggleBtn = document.getElementById('btn-pomo-toggle');
    const toggleText = document.getElementById('btn-pomo-toggle-text');

    if (toggleBtn && toggleText) {
      const icon = toggleBtn.querySelector('i');
      if (icon) icon.className = `fa-solid ${_pomoRunning ? 'fa-pause' : 'fa-play'}`;
      toggleText.textContent = _pomoRunning ? '일시정지' : '뽀모도로 시작';
      toggleBtn.className = `btn ${_pomoRunning ? 'btn-primary' : 'btn-gold'} btn-sm inu-btn-pomo`;
    }

    _updatePlayerCardsUI();
  }

  function _broadcastPomoState() {
    P2P.send({
      type: 'inu_study_pomo_sync',
      isRunning: _pomoRunning,
      mode: _pomoMode,
      secondsLeft: _pomoSecondsLeft,
      totalSeconds: _pomoTotalSeconds
    });
  }

  // ── Web Audio 합성 백색소음 생성기 ──
  function _setAmbientNoise(type) {
    _currentNoiseType = type;
    if (type === 'off') {
      _stopAmbientNoise();
      return;
    }

    try {
      if (!_audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        _audioCtx = new AudioContext();
      }
      if (_audioCtx.state === 'suspended') {
        _audioCtx.resume();
      }

      _stopAmbientNoise();

      const bufferSize = _audioCtx.sampleRate * 2;
      const noiseBuffer = _audioCtx.createBuffer(1, bufferSize, _audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Pink Noise / Brownian noise synthesis
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      _noiseNode = _audioCtx.createBufferSource();
      _noiseNode.buffer = noiseBuffer;
      _noiseNode.loop = true;

      // Filter settings depending on soundscape
      const filter = _audioCtx.createBiquadFilter();
      if (type === 'rain') {
        filter.type = 'lowpass';
        filter.frequency.value = 1200;
      } else if (type === 'library') {
        filter.type = 'bandpass';
        filter.frequency.value = 450;
      } else { // cafe
        filter.type = 'lowpass';
        filter.frequency.value = 800;
      }

      _gainNode = _audioCtx.createGain();
      _gainNode.gain.value = 0.15; // 부드럽고 잔잔한 음량

      _noiseNode.connect(filter);
      filter.connect(_gainNode);
      _gainNode.connect(_audioCtx.destination);

      _noiseNode.start(0);
      showToast(`🎧 [${type === 'rain' ? '송도 빗소리' : type === 'library' ? '학산도서관 소음' : '카페 백색소음'}] 재생을 시작합니다.`, 'info');
    } catch (e) {
      console.warn('[Audio] 백색소음 재생 실패:', e);
    }
  }

  function _stopAmbientNoise() {
    if (_noiseNode) {
      try { _noiseNode.stop(); _noiseNode.disconnect(); } catch (_) {}
      _noiseNode = null;
    }
  }

  function _finishStudySession() {
    // 최종 스터디 리포트
    const sorted = [..._players].sort((a, b) => {
      const sa = (_playerStates[a.id] && _playerStates[a.id].studySeconds) || 0;
      const sb = (_playerStates[b.id] && _playerStates[b.id].studySeconds) || 0;
      return sb - sa;
    });

    const reportData = {
      rankings: sorted.map(p => ({
        id: p.id,
        name: p.name,
        seconds: (_playerStates[p.id] && _playerStates[p.id].studySeconds) || 0,
        subject: (_playerStates[p.id] && _playerStates[p.id].subject) || '열공 완료'
      }))
    };

    if (_isHost) {
      P2P.send({
        type: 'inu_study_finish',
        ...reportData
      });
    }

    _displayStudySummary(reportData);

    setTimeout(() => {
      if (_onResult) {
        _onResult({
          winner: sorted[0],
          iAmWinner: sorted[0] && String(sorted[0].id) === String(_myId),
          customLeaderboard: reportData.rankings.map(r => ({ name: r.name, score: `${Math.floor(r.seconds / 60)}분 집중` }))
        });
      }
    }, 4500);
  }

  function _displayStudySummary(data) {
    if (!_container) return;
    _stopAmbientNoise();

    const rankHtml = data.rankings.map((p, idx) => {
      const medal = idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}위`;
      const timeStr = _formatTime(p.seconds);
      return `
        <div class="inu-study-report-item">
          <div class="sri-badge">${medal}</div>
          <div class="sri-name"><strong>${_escapeHtml(p.name)}</strong> <span class="sri-subj">(${_escapeHtml(p.subject)})</span></div>
          <div class="sri-time"><i class="fa-regular fa-clock"></i> ${timeStr} 집중</div>
        </div>
      `;
    }).join('');

    _container.innerHTML = `
      <div class="inu-study-wrapper">
        <div class="inu-study-report card text-center">
          <div class="inu-trophy-icon">📚</div>
          <h2 style="font-size: 1.8rem; margin: 10px 0; font-weight:900; color:var(--primary);">오늘의 스터디 완료!</h2>
          <p style="color:var(--t2); margin-bottom: 24px;">오늘도 인천대 스터디룸에서 최선을 다해 몰입하셨습니다. 수고하셨습니다 👏</p>
          <div class="inu-report-list">
            ${rankHtml}
          </div>
        </div>
      </div>
    `;
  }

  function _handleMessage(data) {
    if (!data) return;

    if (data.type === 'inu_study_pomo_sync') {
      _pomoRunning = !!data.isRunning;
      _pomoMode = data.mode || _pomoMode;
      _pomoSecondsLeft = data.secondsLeft;
      _pomoTotalSeconds = data.totalSeconds || _pomoTotalSeconds;

      if (_pomoRunning) {
        _startPomoTimer();
      } else {
        _stopPomoTimer();
      }
      _updatePomoControlsUI();
      _updatePomoClockUI();

    } else if (data.type === 'inu_study_status') {
      if (_playerStates[data.playerId]) {
        _playerStates[data.playerId].status = data.status;
        _updatePlayerCardsUI();
      }

    } else if (data.type === 'inu_study_subject') {
      if (_playerStates[data.playerId]) {
        _playerStates[data.playerId].subject = data.subject;
        _updatePlayerCardsUI();
      }

    } else if (data.type === 'inu_study_finish') {
      _displayStudySummary(data);
    }
  }

  function destroy() {
    _stopPomoTimer();
    if (_myStudyTimer) {
      clearInterval(_myStudyTimer);
      _myStudyTimer = null;
    }
    _stopAmbientNoise();
    P2P.offMessage(_handleMessage);
    if (_container) _container.innerHTML = '';
  }

  function _formatTime(totalSec) {
    const s = Math.max(0, Math.floor(totalSec || 0));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function _escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { init, destroy };
})();
