/**
 * inu_draw.js - 횃불이 그리기 (INU Mascot Drawing Accuracy Game)
 * 인천대학교 공식 마스코트 "횃불이"를 캔버스에 직접 따라 그리고,
 * 외부 AI나 백엔드 없이 순수 Canvas API 및 2D 거리 변환(Distance Transform) 영상 처리 알고리즘으로
 * 정확도(%)를 정밀하게 채점하는 실시간 드로잉 챌린지 게임입니다.
 */

const InuDrawGame = (() => {
  // ── 기본 스테이지 프리셋 (assets/draw/ 횃불이 3종) ──
  const DRAW_STAGES = [
    {
      id: 'char06',
      title: '기본형 횃불이',
      subtitle: '지혜와 열정의 마스코트',
      difficulty: '★☆☆',
      src: 'assets/draw/character06.png',
      desc: '인천대학교를 대표하는 횃불이의 가장 친근한 기본 포즈입니다.'
    },
    {
      id: 'char13',
      title: '달리는 횃불이',
      subtitle: '미래를 향해 질주하는 열정',
      difficulty: '★★☆',
      src: 'assets/draw/character13.png',
      desc: '역동적인 동작으로 힘차게 달려나가는 횃불이입니다.'
    },
    {
      id: 'char14',
      title: '날개 횃불이',
      subtitle: '세상을 향해 비상하는 날갯짓',
      difficulty: '★★★',
      src: 'assets/draw/character14.png',
      desc: '멋진 날개를 펼치고 높이 솟아오르는 정교한 횃불이입니다.'
    }
  ];

  // 연산 최적화 그리드 규격
  const GRID_SIZE = 128;
  const TOTAL_DRAW_TIME = 30.0;

  // 게임 상태 변수
  let _container = null;
  let _onResult = null;
  let _context = null;

  let _isHost = false;
  let _myId = '';
  let _myName = '';
  let _players = [];

  let _currentStageIdx = 0;
  let _customImgSrc = null;
  let _timeRemaining = TOTAL_DRAW_TIME;
  let _timerInterval = null;
  let _countdownInterval = null;
  let _startTime = 0;
  let _elapsedSec = 0;
  let _hasSubmitted = false;
  let _hasRevealed = false;
  let _hasHostSynced = false;
  let _canDraw = false;

  // 유저 캔버스 드로잉 상태
  let _drawCanvas = null;
  let _drawCtx = null;
  let _isDrawing = false;
  let _lastX = 0;
  let _lastY = 0;
  let _brushColor = '#0A4A9B'; // 기본 인천대 블루
  let _brushSize = 5;
  let _isEraser = false;
  let _undoStack = [];
  const MAX_UNDO = 25;

  // 가이드 표시 모드: 'none' | 'ghost' (반투명 밑그림)
  let _guideMode = 'ghost';

  // 멀티플레이 제출 집계
  let _submissions = {}; // { [playerId]: { name, score, matchRate, meanDist, timeSec, dataUrl, penaltyReason, resultObj } }

  // 이미지 캐시 및 에지 데이터 캐시
  const _imageCache = {};
  const _edgeCache = {};

  /**
   * 1. 게임 초기화 진입점
   */
  function init(container, onResult, context) {
    _container = container;
    _onResult = onResult;
    _context = context || {};

    _isHost = !!_context.isHost;
    _myId = _context.myId || 'me';
    _myName = _context.myNickname || _context.myName || '나';
    _players = Array.isArray(_context.players) && _context.players.length > 0
      ? _context.players
      : [{ id: _myId, name: _myName }];

    _customImgSrc = null;
    _timeRemaining = TOTAL_DRAW_TIME;
    _hasSubmitted = false;
    _hasRevealed = false;
    _hasHostSynced = false;
    _canDraw = false;
    _undoStack = [];
    _submissions = {};

    P2P.onMessage(_handleMessage);

    if (_players.length > 1) {
      if (_isHost) {
        // 호스트: 3장의 횃불이 중 무작위 1종을 선정하여 모든 참가자와 동일하게 동기화!
        _currentStageIdx = Math.floor(Math.random() * DRAW_STAGES.length);
        _preloadStages(() => {
          P2P.send({
            type: 'inu_draw_init_sync',
            stageIdx: _currentStageIdx,
            players: _players
          });
          _renderGameUI();
          _startCountdown(() => _startTimer());
        });
      } else {
        // 게스트: 에셋을 먼저 프리로드하고 호스트의 시작 동기화 신호를 기다림
        _preloadStages(() => {
          if (_hasHostSynced) {
            _renderGameUI();
            _startCountdown(() => _startTimer());
          } else {
            _renderWaitingForHost();
          }
        });
      }
    } else {
      // 1인 싱글플레이: 랜덤 1종 선택 후 즉시 3-2-1 카운트다운 시작
      _currentStageIdx = Math.floor(Math.random() * DRAW_STAGES.length);
      _preloadStages(() => {
        _renderGameUI();
        _startCountdown(() => _startTimer());
      });
    }
  }

  function _renderWaitingForHost() {
    if (!_container) return;
    _container.innerHTML = `
      <div class="inu-draw-wrap">
        <div class="card inu-draw-header flex-center" style="padding:48px 24px; text-align:center; min-height:360px;">
          <div style="font-size:3rem; color:#FCAF15; margin-bottom:16px;">
            <i class="fa-solid fa-spinner fa-spin"></i>
          </div>
          <h3 style="font-size:1.3rem; font-weight:900; color:var(--t1);">방장의 시작 신호를 기다리고 있습니다...</h3>
          <p style="font-size:0.9rem; color:var(--t3); margin-top:8px;">
            모든 참가자가 동일한 횃불이로 함께 카운트다운을 시작합니다!
          </p>
        </div>
      </div>
    `;
  }

  /**
   * 2. 이미지 프리로드
   */
  function _preloadStages(callback) {
    let loaded = 0;
    DRAW_STAGES.forEach((stage, idx) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        _imageCache[stage.id] = img;
        _extractTargetEdges(stage.id, img);
        loaded++;
        if (loaded >= DRAW_STAGES.length && typeof callback === 'function') {
          callback();
        }
      };
      img.onerror = () => {
        loaded++;
        if (loaded >= DRAW_STAGES.length && typeof callback === 'function') {
          callback();
        }
      };
      img.src = stage.src;
    });
  }

  /**
   * 3. 메인 게임 UI 렌더링
   */
  function _renderGameUI() {
    if (!_container) return;

    const currentStage = _customImgSrc
      ? { id: 'custom', title: '사용자 업로드', difficulty: '커스텀', src: _customImgSrc }
      : DRAW_STAGES[_currentStageIdx];

    _container.innerHTML = `
      <div class="inu-draw-wrap">
        <!-- ── 상단 헤더: 타이틀 & 오늘의 횃불이 정보 ── -->
        <div class="inu-draw-header card">
          <div class="inu-draw-header-left">
            <div class="inu-draw-title-row">
              <span class="inu-draw-badge"><i class="fa-solid fa-paintbrush"></i> AI 없는 순수 캔버스 챌린지</span>
              <h2 class="inu-draw-title">횃불이 그리기</h2>
            </div>
            <p class="inu-draw-desc">왼쪽의 인천대학교 마스코트 <strong>${_escapeHtml(currentStage.title)}</strong>를 30초 안에 정밀하게 따라 그려보세요!</p>
          </div>

          <div class="inu-draw-header-right">
            ${_players.length > 1 ? `
              <div class="inu-draw-header-players" id="inu-draw-players-badge">
                <i class="fa-solid fa-users" style="color:#0A4A9B;"></i>
                <span id="inu-draw-players-count">제출: ${Object.keys(_submissions).length} / ${_players.length}명</span>
              </div>
            ` : ''}
            <div class="inu-draw-stage-name-badge">
              <i class="fa-solid fa-fire" style="color:#FCAF15;"></i>
              <span>오늘의 횃불이: <strong>${_escapeHtml(currentStage.title)}</strong> (${currentStage.difficulty})</span>
            </div>
          </div>
        </div>

        <!-- ── ⏱️ 30초 시간 제한 상단 진행 게이지 바 ── -->
        <div class="inu-draw-timer-bar-container">
          <div class="inu-draw-timer-bar-header">
            <div class="inu-timer-bar-label">
              <i class="fa-solid fa-stopwatch"></i>
              <span>제한 시간: <strong>30초</strong></span>
            </div>
            <div class="inu-timer-bar-time" id="inu-draw-time-remaining">30.0초</div>
          </div>
          <div class="inu-timer-bar-track">
            <div class="inu-timer-bar-fill" id="inu-draw-timer-bar-fill" style="width: 100%;"></div>
          </div>
        </div>

        <!-- ── 메인 캔버스 2분할 영역 (좌: 제시 원본 / 우: 유저 드로잉) ── -->
        <div class="inu-draw-main-grid">
          
          <!-- 좌측: 제시 화면 (원본 이미지 뷰어) -->
          <div class="inu-draw-col card inu-draw-orig-card">
            <div class="inu-draw-panel-bar">
              <div class="inu-panel-title">
                <i class="fa-solid fa-image" style="color:var(--primary);"></i>
                <span>원본 제시 이미지 (${_escapeHtml(currentStage.title)})</span>
              </div>
              <div class="inu-panel-actions">
                <span class="inu-diff-tag">${currentStage.difficulty}</span>
              </div>
            </div>

            <div class="inu-orig-display-area" id="inu-orig-display-area">
              <img id="inu-orig-img" class="inu-orig-img" src="${currentStage.src}" alt="${_escapeHtml(currentStage.title)}" />
              <canvas id="inu-orig-edge-canvas" class="inu-orig-edge-canvas hidden" width="360" height="360"></canvas>
            </div>

            <div class="inu-orig-footer-bar">
              <div class="inu-guide-toggle-group">
                <span class="inu-guide-label"><i class="fa-solid fa-eye"></i> 드로잉 가이드:</span>
                <button type="button" class="btn btn-xs ${ _guideMode === 'none' ? 'btn-primary' : 'btn-outline'}" id="btn-guide-none">숨김</button>
                <button type="button" class="btn btn-xs ${ _guideMode === 'ghost' ? 'btn-primary' : 'btn-outline'}" id="btn-guide-ghost">연한 밑그림</button>
              </div>
            </div>
          </div>

          <!-- 우측: 유저 드로잉 캔버스 -->
          <div class="inu-draw-col card inu-draw-canvas-card" style="position:relative;">
            <div class="inu-draw-panel-bar">
              <div class="inu-panel-title">
                <i class="fa-solid fa-pen-nib" style="color:#FCAF15;"></i>
                <span>내 그림 그리기</span>
              </div>
              <div class="inu-canvas-quick-tools">
                <button type="button" class="btn btn-xs btn-outline" id="btn-draw-undo" title="실행 취소 (Undo)">
                  <i class="fa-solid fa-rotate-left"></i> 되돌리기
                </button>
                <button type="button" class="btn btn-xs btn-outline text-danger" id="btn-draw-clear" title="전체 지우기">
                  <i class="fa-solid fa-trash-can"></i> 전체 삭제
                </button>
              </div>
            </div>

            <!-- 캔버스 컨테이너 (반응형 1:1 종횡비) -->
            <div class="inu-canvas-stage" id="inu-canvas-stage">
              <!-- 3 2 1 카운트다운 오버레이 -->
              <div class="inu-draw-countdown-overlay" id="inu-draw-countdown-overlay">
                <div class="inu-countdown-number" id="inu-countdown-number">3</div>
                <div class="inu-countdown-sub" id="inu-countdown-sub">준비하세요!</div>
              </div>

              <!-- 다른 플레이어 제출 대기 오버레이 (멀티플레이) -->
              <div class="inu-draw-waiting-overlay hidden" id="inu-draw-waiting-overlay">
                <div class="inu-waiting-icon"><i class="fa-solid fa-palette"></i></div>
                <div class="inu-waiting-title">내 그림 제출 완료!</div>
                <div class="inu-waiting-sub">모든 참가자가 그리기를 마칠 때까지 잠시만 기다려 주세요.</div>
                <div class="inu-waiting-progress-badge" id="inu-waiting-progress">
                  <i class="fa-solid fa-users"></i> <span id="inu-waiting-count-text">1 / ${_players.length}명 제출 완료</span>
                </div>
              </div>

              <!-- 밑그림 가이드 레이어 (설정에 따라 투명도 조절) -->
              <img id="inu-canvas-ghost-guide" class="inu-canvas-ghost-guide ${_guideMode === 'ghost' ? '' : 'hidden'}" src="${currentStage.src}" />

              <!-- 실제 유저 드로잉 캔버스 -->
              <canvas id="inu-user-canvas" class="inu-user-canvas"></canvas>
            </div>

            <!-- 툴바: 굵기, 색상, 지우개, 채점 제출 -->
            <div class="inu-draw-toolbar">
              <div class="inu-tool-group inu-color-group">
                <button type="button" class="inu-color-dot active" data-color="#0A4A9B" style="background:#0A4A9B;" title="인천대 블루"></button>
                <button type="button" class="inu-color-dot" data-color="#FCAF15" style="background:#FCAF15;" title="인천대 골드"></button>
                <button type="button" class="inu-color-dot" data-color="#111827" style="background:#111827;" title="블랙"></button>
                <button type="button" class="inu-color-dot" data-color="#ef4444" style="background:#ef4444;" title="레드"></button>
                <button type="button" class="inu-color-dot" data-color="#10b981" style="background:#10b981;" title="그린"></button>
                <button type="button" class="inu-color-dot" data-color="#8b5cf6" style="background:#8b5cf6;" title="퍼플"></button>
              </div>

              <div class="inu-tool-divider"></div>

              <div class="inu-tool-group inu-size-group">
                <button type="button" class="inu-tool-btn inu-size-btn" data-size="3" title="얇은 선 (3px)"><span style="width:4px;height:4px;"></span></button>
                <button type="button" class="inu-tool-btn inu-size-btn active" data-size="6" title="보통 선 (6px)"><span style="width:7px;height:7px;"></span></button>
                <button type="button" class="inu-tool-btn inu-size-btn" data-size="12" title="굵은 선 (12px)"><span style="width:12px;height:12px;"></span></button>
                <button type="button" class="inu-tool-btn inu-eraser-btn" id="btn-draw-eraser" title="지우개 모드">
                  <i class="fa-solid fa-eraser"></i>
                </button>
              </div>

              <div class="inu-toolbar-submit">
                <button type="button" class="btn btn-primary btn-sm inu-btn-submit-draw" id="btn-draw-submit">
                  <i class="fa-solid fa-check-double"></i>
                  <span>결과 제출 &amp; 채점하기</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── 채점 결과 오버레이 모달 컨테이너 ── -->
        <div id="inu-draw-result-modal" class="overlay inu-draw-modal hidden">
          <div class="modal-card inu-draw-result-card custom-scroll">
            <div class="modal-header">
              <h3 class="modal-title">
                <i class="fa-solid fa-award" style="color:#FCAF15;"></i>
                <span>정확도 정밀 채점 리포트</span>
              </h3>
              <button type="button" class="btn-icon sm" id="btn-close-draw-modal">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div class="modal-body inu-draw-result-body" id="inu-draw-result-content">
              <!-- 채점 결과 동적 주입 -->
            </div>

            <div class="modal-footer inu-draw-result-footer">
              ${_players.length > 1 ? `
                ${_isHost ? `
                  <button type="button" class="btn btn-gold" id="btn-draw-next-stage">
                    <i class="fa-solid fa-dice"></i> 새로운 횃불이 도전 (다음 판)
                  </button>
                ` : `
                  <div style="font-size:0.88rem; font-weight:800; color:var(--t2); display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-hourglass-half" style="color:#FCAF15;"></i> 방장이 다음 판을 시작하기를 기다리는 중...
                  </div>
                `}
              ` : `
                <button type="button" class="btn btn-outline" id="btn-draw-retry">다시 그리기</button>
                <button type="button" class="btn btn-gold" id="btn-draw-next-stage">새로운 횃불이 도전</button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    _initCanvas();
    _bindEvents();
    _updateGhostGuides();
  }

  /**
   * 4. 캔버스 초기화 및 터치/마우스 바인딩
   */
  function _initCanvas() {
    _drawCanvas = document.getElementById('inu-user-canvas');
    if (!_drawCanvas) return;
    _drawCtx = _drawCanvas.getContext('2d', { willReadFrequently: true });

    const stage = document.getElementById('inu-canvas-stage');
    if (!stage) return;

    // 크기 맞춤 (고해상도 DPI 보정)
    const rect = stage.getBoundingClientRect();
    const size = Math.min(rect.width || 380, 420);
    const dpr = window.devicePixelRatio || 1;

    _drawCanvas.width = size * dpr;
    _drawCanvas.height = size * dpr;
    _drawCanvas.style.width = `${size}px`;
    _drawCanvas.style.height = `${size}px`;

    _drawCtx.scale(dpr, dpr);
    _drawCtx.lineCap = 'round';
    _drawCtx.lineJoin = 'round';
    _drawCtx.strokeStyle = _brushColor;
    _drawCtx.lineWidth = _brushSize;

    // 가이드 캔버스도 동일 크기로 동기화
    const edgeGuide = document.getElementById('inu-canvas-edge-guide');
    if (edgeGuide) {
      edgeGuide.width = size * dpr;
      edgeGuide.height = size * dpr;
      edgeGuide.style.width = `${size}px`;
      edgeGuide.style.height = `${size}px`;
      const eCtx = edgeGuide.getContext('2d');
      eCtx.scale(dpr, dpr);
    }

    _saveUndoSnapshot();
    _bindCanvasEvents();
  }

  /**
   * 5. 터치 및 마우스 이벤트 바인딩 (모바일 완벽 지원)
   */
  function _bindCanvasEvents() {
    if (!_drawCanvas) return;

    const getPos = (e) => {
      const rect = _drawCanvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const startDraw = (e) => {
      if (_hasSubmitted || !_canDraw) return;
      e.preventDefault();
      _isDrawing = true;
      const pos = getPos(e);
      _lastX = pos.x;
      _lastY = pos.y;

      _drawCtx.beginPath();
      _drawCtx.moveTo(_lastX, _lastY);
      // 점 하나만 찍었을 때도 렌더링되도록 미세 점 그리기
      _drawCtx.lineTo(_lastX + 0.1, _lastY + 0.1);
      _drawCtx.stroke();
    };

    const moveDraw = (e) => {
      if (!_isDrawing || _hasSubmitted || !_canDraw) return;
      e.preventDefault();
      const pos = getPos(e);

      _drawCtx.beginPath();
      _drawCtx.moveTo(_lastX, _lastY);
      _drawCtx.lineTo(pos.x, pos.y);
      _drawCtx.stroke();

      _lastX = pos.x;
      _lastY = pos.y;
    };

    const endDraw = (e) => {
      if (!_isDrawing) return;
      e.preventDefault();
      _isDrawing = false;
      _saveUndoSnapshot();
    };

    // 마우스 이벤트
    _drawCanvas.addEventListener('mousedown', startDraw);
    window.addEventListener('mousemove', moveDraw);
    window.addEventListener('mouseup', endDraw);

    // 모바일 터치 이벤트 (스크롤 방지)
    _drawCanvas.addEventListener('touchstart', startDraw, { passive: false });
    _drawCanvas.addEventListener('touchmove', moveDraw, { passive: false });
    _drawCanvas.addEventListener('touchend', endDraw, { passive: false });
    _drawCanvas.addEventListener('touchcancel', endDraw, { passive: false });
  }

  /**
   * 6. Undo (실행 취소) 스냅샷 관리
   */
  function _saveUndoSnapshot() {
    if (!_drawCanvas || !_drawCtx) return;
    try {
      const snap = _drawCtx.getImageData(0, 0, _drawCanvas.width, _drawCanvas.height);
      _undoStack.push(snap);
      if (_undoStack.length > MAX_UNDO) {
        _undoStack.shift();
      }
    } catch (_) {}
  }

  function _performUndo() {
    if (_undoStack.length <= 1) {
      _clearCanvas(false);
      return;
    }
    _undoStack.pop(); // 현재 상태 버림
    const prev = _undoStack[_undoStack.length - 1];
    if (prev && _drawCtx) {
      _drawCtx.putImageData(prev, 0, 0);
    }
  }

  function _clearCanvas(saveSnap = true) {
    if (!_drawCanvas || !_drawCtx) return;
    const dpr = window.devicePixelRatio || 1;
    _drawCtx.clearRect(0, 0, _drawCanvas.width / dpr, _drawCanvas.height / dpr);
    if (saveSnap) {
      _saveUndoSnapshot();
    }
  }

  /**
   * 7. 가이드 및 에지(Edge) 렌더링 동기화
   */
  function _updateGhostGuides() {
    const stage = _customImgSrc
      ? { id: 'custom', src: _customImgSrc }
      : DRAW_STAGES[_currentStageIdx];

    const ghostImg = document.getElementById('inu-canvas-ghost-guide');
    if (ghostImg) {
      ghostImg.src = stage.src;
      ghostImg.classList.toggle('hidden', _guideMode !== 'ghost');
    }

    const edgeCanvas = document.getElementById('inu-canvas-edge-guide');
    if (edgeCanvas) {
      edgeCanvas.classList.toggle('hidden', _guideMode !== 'edge');
      if (_guideMode === 'edge') {
        _drawEdgeGuideOnCanvas(edgeCanvas, stage.id);
      }
    }
  }

  function _drawEdgeGuideOnCanvas(targetCanvas, stageId) {
    const edgeData = _edgeCache[stageId];
    if (!edgeData || !targetCanvas) return;

    const ctx = targetCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = targetCanvas.width / dpr;
    const h = targetCanvas.height / dpr;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(10, 74, 155, 0.45)'; // 네이비 가이드선
    const scaleX = w / GRID_SIZE;
    const scaleY = h / GRID_SIZE;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (edgeData[y * GRID_SIZE + x] === 1) {
          ctx.fillRect(x * scaleX, y * scaleY, scaleX + 0.3, scaleY + 0.3);
        }
      }
    }
  }

  /**
   * 8. 3 2 1 카운트다운 & 30초 타이머 관리
   */
  function _startCountdown(onComplete) {
    _canDraw = false;
    _stopCountdown();
    const overlay = document.getElementById('inu-draw-countdown-overlay');
    const numEl = document.getElementById('inu-countdown-number');
    const subEl = document.getElementById('inu-countdown-sub');
    if (!overlay || !numEl) {
      _canDraw = true;
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    overlay.classList.remove('hidden');
    let count = 3;
    numEl.textContent = '3';
    if (subEl) subEl.textContent = '준비하세요!';
    if (typeof Sound !== 'undefined' && Sound.playTick) Sound.playTick();

    _countdownInterval = setInterval(() => {
      count--;
      if (count === 2) {
        numEl.textContent = '2';
        if (typeof Sound !== 'undefined' && Sound.playTick) Sound.playTick();
      } else if (count === 1) {
        numEl.textContent = '1';
        if (typeof Sound !== 'undefined' && Sound.playTick) Sound.playTick();
      } else if (count === 0) {
        numEl.textContent = '시작!';
        if (subEl) subEl.textContent = '30초 안에 따라 그려보세요!';
        if (typeof Sound !== 'undefined' && Sound.playStart) Sound.playStart();
      } else {
        _stopCountdown();
        overlay.classList.add('hidden');
        _canDraw = true;
        if (typeof onComplete === 'function') onComplete();
      }
    }, 850);
  }

  function _stopCountdown() {
    if (_countdownInterval) {
      clearInterval(_countdownInterval);
      _countdownInterval = null;
    }
  }

  function _startTimer() {
    _stopTimer();
    _startTime = Date.now();
    _timeRemaining = TOTAL_DRAW_TIME;
    _updateTimerBarUI(_timeRemaining);

    _timerInterval = setInterval(() => {
      _timeRemaining -= 0.1;
      _elapsedSec = (TOTAL_DRAW_TIME - Math.max(0, _timeRemaining)).toFixed(1);

      if (_timeRemaining <= 0) {
        _timeRemaining = 0;
        _stopTimer();
        _updateTimerBarUI(0);
        _canDraw = false;
        if (!_hasSubmitted) {
          _submitAndScore(true); // 30초 시간 초과 시 자동 채점 처리!
        }
        if (_players.length > 1) {
          if (_isHost) {
            setTimeout(() => {
              _revealScoresForAll();
            }, 800);
          }
        } else {
          _revealScoresForAll();
        }
      } else {
        _updateTimerBarUI(_timeRemaining);
      }
    }, 100);
  }

  function _stopTimer() {
    if (_timerInterval) {
      clearInterval(_timerInterval);
      _timerInterval = null;
    }
  }

  function _updateTimerBarUI(remaining) {
    const textEl = document.getElementById('inu-draw-time-remaining');
    const fillEl = document.getElementById('inu-draw-timer-bar-fill');
    if (textEl) {
      textEl.textContent = `${Math.max(0, remaining).toFixed(1)}초`;
      textEl.classList.toggle('urgent', remaining <= 5.0);
    }
    if (fillEl) {
      const pct = Math.max(0, Math.min(100, (remaining / TOTAL_DRAW_TIME) * 100));
      fillEl.style.width = `${pct}%`;
      fillEl.classList.toggle('urgent', remaining <= 5.0);
    }
  }

  /**
   * =========================================================================
   * 9. 🌟 채점 알고리즘 (핵심 요구사항 - No AI, Pure Canvas 2D + Classical CV)
   * =========================================================================
   */

  /**
   * 9-1. 원본 이미지로부터 에지/선 이진 배열(128x128) 추출 및 캐싱
   */
  function _extractTargetEdges(stageId, imgElement) {
    if (_edgeCache[stageId]) return _edgeCache[stageId];

    const off = document.createElement('canvas');
    off.width = GRID_SIZE;
    off.height = GRID_SIZE;
    const ctx = off.getContext('2d', { willReadFrequently: true });

    // 비율 유지 리사이즈 (패딩 10px 부여)
    const padding = 10;
    const avail = GRID_SIZE - padding * 2;
    const scale = Math.min(avail / (imgElement.width || 1), avail / (imgElement.height || 1));
    const nw = Math.floor((imgElement.width || 1) * scale);
    const nh = Math.floor((imgElement.height || 1) * scale);
    const ox = Math.floor((GRID_SIZE - nw) / 2);
    const oy = Math.floor((GRID_SIZE - nh) / 2);

    ctx.drawImage(imgElement, ox, oy, nw, nh);
    const imgData = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);
    const data = imgData.data;

    const binary = new Uint8Array(GRID_SIZE * GRID_SIZE);

    // Sobel 필터 + 알파 실루엣 경계선 추출
    const lum = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        const idx = (y * GRID_SIZE + x) * 4;
        const a = data[idx + 3];

        if (a > 35) {
          // 1. 외곽선(실루엣) 경계선 검출 (이웃 픽셀 중 투명 배경이 있는 경우)
          const isSilhouetteEdge =
            data[((y - 1) * GRID_SIZE + x) * 4 + 3] <= 35 ||
            data[((y + 1) * GRID_SIZE + x) * 4 + 3] <= 35 ||
            data[(y * GRID_SIZE + (x - 1)) * 4 + 3] <= 35 ||
            data[(y * GRID_SIZE + (x + 1)) * 4 + 3] <= 35;

          if (isSilhouetteEdge) {
            binary[y * GRID_SIZE + x] = 1;
          } else {
            // 2. 내부 주요 윤곽선 (명암 및 경계 그라디언트 검출)
            const gx = Math.abs(lum(idx + 4) - lum(idx - 4));
            const gy = Math.abs(lum(idx + GRID_SIZE * 4) - lum(idx - GRID_SIZE * 4));
            if (gx + gy > 55) {
              binary[y * GRID_SIZE + x] = 1;
            }
          }
        }
      }
    }

    _edgeCache[stageId] = binary;
    return binary;
  }

  /**
   * 9-2. 유저 드로잉 캔버스에서 이진 선 배열(128x128) 추출
   */
  function _extractUserDrawingBinary() {
    if (!_drawCanvas) return new Uint8Array(GRID_SIZE * GRID_SIZE);

    const off = document.createElement('canvas');
    off.width = GRID_SIZE;
    off.height = GRID_SIZE;
    const ctx = off.getContext('2d', { willReadFrequently: true });

    // 유저 캔버스를 128x128 오프스크린 캔버스에 리사이즈
    ctx.drawImage(_drawCanvas, 0, 0, GRID_SIZE, GRID_SIZE);
    const imgData = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);
    const data = imgData.data;

    const binary = new Uint8Array(GRID_SIZE * GRID_SIZE);

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const idx = i * 4;
      const a = data[idx + 3];
      // 투명하지 않고 선이 그어진 픽셀을 선(Foreground: 1)으로 판정
      if (a > 25) {
        binary[i] = 1;
      }
    }

    return binary;
  }

  /**
   * 9-3. 거리 변환 (Distance Transform) - 다중 시작점 BFS (Multi-Source BFS)
   * 128x128 격자에서 2~3ms 안에 각 픽셀과 가장 가까운 선 픽셀 간의 거리 맵 산출
   */
  function _computeDistanceTransform(binaryGrid) {
    const total = GRID_SIZE * GRID_SIZE;
    const dist = new Float32Array(total);
    const queueX = new Int16Array(total);
    const queueY = new Int16Array(total);
    let head = 0;
    let tail = 0;

    for (let i = 0; i < total; i++) {
      if (binaryGrid[i] === 1) {
        dist[i] = 0;
        queueX[tail] = i % GRID_SIZE;
        queueY[tail] = (i / GRID_SIZE) | 0;
        tail++;
      } else {
        dist[i] = 9999;
      }
    }

    // 선이 아예 없는 경우 조기 반환
    if (tail === 0) return dist;

    // 8방향 이웃 이동 (상하좌우 1.0, 대각선 1.414 유클리드 근사)
    const dx = [-1, 1, 0, 0, -1, 1, -1, 1];
    const dy = [0, 0, -1, 1, -1, -1, 1, 1];
    const ddist = [1.0, 1.0, 1.0, 1.0, 1.414, 1.414, 1.414, 1.414];

    while (head < tail) {
      const cx = queueX[head];
      const cy = queueY[head];
      const cd = dist[cy * GRID_SIZE + cx];
      head++;

      for (let k = 0; k < 8; k++) {
        const nx = cx + dx[k];
        const ny = cy + dy[k];
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
          const ni = ny * GRID_SIZE + nx;
          const nd = cd + ddist[k];
          if (nd < dist[ni]) {
            dist[ni] = nd;
            queueX[tail] = nx;
            queueY[tail] = ny;
            tail++;
          }
        }
      }
    }

    return dist;
  }

  /**
   * 9-4. 정밀 정확도 채점 & 부정행위(어뷰징) 방지 계산
   */
  function _calculateAccuracy() {
    const stage = _customImgSrc
      ? { id: 'custom' }
      : DRAW_STAGES[_currentStageIdx];

    let origBinary = _edgeCache[stage.id];
    if (!origBinary) {
      const img = _imageCache[stage.id] || document.getElementById('inu-orig-img');
      origBinary = _extractTargetEdges(stage.id, img);
    }

    const userBinary = _extractUserDrawingBinary();

    // 1. 픽셀 수 카운트
    let origCount = 0;
    let userCount = 0;
    const userIndices = [];
    const origIndices = [];

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      if (origBinary[i] === 1) {
        origCount++;
        origIndices.push(i);
      }
      if (userBinary[i] === 1) {
        userCount++;
        userIndices.push(i);
      }
    }

    // 2. 어뷰징 및 선 부족 체크
    if (userCount === 0) {
      return {
        score: 0,
        matchRate: 0,
        meanDist: 99.9,
        origCount,
        userCount,
        penaltyReason: '그린 선이 전혀 없습니다. 마우스나 터치로 그림을 그려주세요!'
      };
    }

    // 2-1. 도배 어뷰징: 원본 픽셀 수의 2.8배를 초과하여 캔버스를 칠해버린 경우
    if (userCount > origCount * 2.8) {
      return {
        score: 0,
        matchRate: 0,
        meanDist: 50.0,
        origCount,
        userCount,
        penaltyReason: '캔버스 전체를 과도하게 칠해 무단 어뷰징(도배)으로 판정되었습니다. (0점 처리)'
      };
    }

    // 3. 거리 변환(Distance Transform) 맵 생성
    const origDistMap = _computeDistanceTransform(origBinary);
    const userDistMap = _computeDistanceTransform(userBinary);

    // 4. 유저 선 -> 원본 선 평균 오차 (Precision)
    let sumUserDist = 0;
    let matchedPixels = 0; // 3픽셀 이내 일치 픽셀

    for (let i = 0; i < userIndices.length; i++) {
      const idx = userIndices[i];
      const d = origDistMap[idx];
      sumUserDist += d;
      if (d <= 3.2) {
        matchedPixels++;
      }
    }

    const userMeanDist = sumUserDist / userCount;
    const matchRate = Math.round((matchedPixels / userCount) * 100);

    // 5. 원본 선 -> 유저 선 평균 오차 (Recall: 형태를 빠짐없이 그렸는지 판정)
    let sumOrigDist = 0;
    for (let i = 0; i < origIndices.length; i++) {
      const idx = origIndices[i];
      sumOrigDist += userDistMap[idx];
    }
    const origMeanDist = sumOrigDist / origCount;

    // 6. 상호 오차(Chamfer Distance) 결합 (유저 선 정확도 65% + 원본 커버율 35%)
    const combinedDist = userMeanDist * 0.65 + origMeanDist * 0.35;

    // 7. 점수 산출 공식: 정확도(%) = max(0, 100 - (combinedDist * 감점계수))
    let rawScore = Math.max(0, Math.min(100, Math.round(100 - combinedDist * 8.6)));

    // 8. 선 부족 페널티 (원본 선의 25% 미만인 경우 점수 차감)
    let penaltyReason = null;
    if (userCount < origCount * 0.25) {
      const ratio = userCount / (origCount * 0.25);
      rawScore = Math.round(rawScore * Math.max(0.15, ratio));
      penaltyReason = '그린 선의 양이 부족하여 미완성 감점이 적용되었습니다.';
    }

    return {
      score: rawScore,
      matchRate,
      meanDist: Math.round(combinedDist * 10) / 10,
      origCount,
      userCount,
      userBinary,
      origBinary,
      origDistMap,
      penaltyReason
    };
  }

  /**
   * 9-5. 시각적 피드백 오버레이 캔버스 생성
   * (일치 영역 = 초록색, 빗나간 영역 = 빨간색, 원본 가이드 = 연한 네이비)
   */
  function _createComparisonOverlayCanvas(result) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    // 부드러운 배경
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 300, 300);

    const scale = 300 / GRID_SIZE;
    const origBinary = result.origBinary;
    const userBinary = result.userBinary;
    const distMap = result.origDistMap;

    // 1. 원본 가이드 선 (연한 남색 반투명)
    ctx.fillStyle = 'rgba(10, 74, 155, 0.28)';
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (origBinary && origBinary[y * GRID_SIZE + x] === 1) {
          ctx.fillRect(x * scale, y * scale, scale + 0.4, scale + 0.4);
        }
      }
    }

    // 2. 유저 선 오버레이 (3px 이내 초록색, 초과 빨간색)
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const i = y * GRID_SIZE + x;
        if (userBinary && userBinary[i] === 1) {
          const d = distMap ? distMap[i] : 99;
          if (d <= 3.2) {
            ctx.fillStyle = '#10b981'; // 초록색 (정확)
          } else {
            ctx.fillStyle = '#ef4444'; // 빨간색 (빗나감)
          }
          ctx.fillRect(x * scale, y * scale, scale + 0.5, scale + 0.5);
        }
      }
    }

    return canvas;
  }

  /**
   * 10. 채점 결과 제출 처리 (멀티플레이 동시 채점 동기화)
   */
  function _submitAndScore(isTimeOut = false) {
    if (_hasSubmitted) return;
    _hasSubmitted = true;
    _canDraw = false;
    _stopTimer();

    const result = _calculateAccuracy();
    const timeUsed = _elapsedSec || (isTimeOut ? 30.0 : 1.0);
    const dataUrl = _drawCanvas ? _drawCanvas.toDataURL('image/png') : '';

    // 내 결과 기록
    _submissions[_myId] = {
      id: _myId,
      name: _myName,
      score: result.score,
      matchRate: result.matchRate,
      meanDist: result.meanDist,
      timeSec: timeUsed,
      dataUrl,
      penaltyReason: result.penaltyReason,
      resultObj: result
    };

    // 효과음 재생
    if (typeof Sound !== 'undefined') {
      if (result.score >= 70 && Sound.playWin) {
        Sound.playWin();
      } else if (Sound.playClick) {
        Sound.playClick();
      }
    }

    if (_players.length > 1) {
      // 멀티플레이: 호스트 및 다른 참가자들에게 내 제출 정보 전송
      if (typeof P2P !== 'undefined' && P2P.send) {
        P2P.send({
          type: 'inu_draw_submit',
          playerId: _myId,
          playerName: _myName,
          score: result.score,
          matchRate: result.matchRate,
          meanDist: result.meanDist,
          timeSec: timeUsed,
          dataUrl,
          penaltyReason: result.penaltyReason
        });
      }

      // 내 캔버스 위에 대기 오버레이 표시 (다른 참가자 대기)
      _showWaitingOverlay();

      // 호스트인 경우: 모든 참가자가 제출했는지 확인
      if (_isHost) {
        const submittedCount = Object.keys(_submissions).length;
        if (submittedCount >= _players.length) {
          setTimeout(() => {
            _revealScoresForAll();
          }, 600);
        }
      }
    } else {
      // 1인 싱글플레이: 즉시 결과 공개
      _showResultModal(result, timeUsed, isTimeOut);
    }
  }

  /**
   * 10-1. 멀티플레이 대기 오버레이
   */
  function _showWaitingOverlay() {
    const overlay = document.getElementById('inu-draw-waiting-overlay');
    const countEl = document.getElementById('inu-waiting-count-text');
    const badgeEl = document.getElementById('inu-draw-players-count');
    const submittedCount = Object.keys(_submissions).length;
    if (countEl) countEl.textContent = `${submittedCount} / ${_players.length}명 제출 완료`;
    if (badgeEl) badgeEl.textContent = `제출: ${submittedCount} / ${_players.length}명`;
    if (overlay) overlay.classList.remove('hidden');
  }

  function _hideWaitingOverlay() {
    const overlay = document.getElementById('inu-draw-waiting-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  /**
   * 10-2. 모든 참가자 점수 동시 공개 (Reveal Scores)
   */
  function _revealScoresForAll() {
    if (_hasRevealed) return;
    _hasRevealed = true;
    _hideWaitingOverlay();

    if (_isHost && _players.length > 1) {
      // 미제출 참가자는 0점 처리 보정
      _players.forEach(p => {
        if (!_submissions[p.id]) {
          _submissions[p.id] = {
            id: p.id,
            name: p.name || '참가자',
            score: 0,
            matchRate: 0,
            meanDist: 99.9,
            timeSec: 30,
            dataUrl: '',
            penaltyReason: '시간 초과로 미제출 처리되었습니다.'
          };
        }
      });

      if (typeof P2P !== 'undefined' && P2P.send) {
        P2P.send({
          type: 'inu_draw_reveal',
          submissions: _submissions
        });
      }
    }

    const mySub = _submissions[_myId] || {
      score: 0,
      matchRate: 0,
      meanDist: 99.9,
      timeSec: 30,
      penaltyReason: '제출 기록 없음'
    };

    const resObj = mySub.resultObj || {
      score: mySub.score,
      matchRate: mySub.matchRate,
      meanDist: mySub.meanDist,
      userBinary: _extractUserDrawingBinary(),
      origBinary: _edgeCache[_customImgSrc ? 'custom' : DRAW_STAGES[_currentStageIdx].id],
      origDistMap: null,
      penaltyReason: mySub.penaltyReason
    };

    _showResultModal(resObj, mySub.timeSec, false);

    if (_onResult) {
      const sorted = Object.entries(_submissions).sort((a, b) => (b[1].score || 0) - (a[1].score || 0));
      if (sorted.length > 0) {
        _onResult({
          winnerId: sorted[0][0],
          winnerName: sorted[0][1].name,
          score: sorted[0][1].score
        });
      }
    }
  }

  /**
   * 11. 결과 모달 렌더링
   */
  function _showResultModal(result, timeUsed, isTimeOut) {
    const modal = document.getElementById('inu-draw-result-modal');
    const content = document.getElementById('inu-draw-result-content');
    if (!modal || !content) return;

    let titleRank = '🏆 횃불이 마스터 화가!';
    let rankColor = '#0A4A9B';
    if (result.score >= 90) {
      titleRank = '🏆 횃불이 마스터 화가!';
      rankColor = '#FCAF15';
    } else if (result.score >= 80) {
      titleRank = '✨ 인천대 미대 수석급 재능!';
      rankColor = '#0A4A9B';
    } else if (result.score >= 65) {
      titleRank = '🎨 훌륭한 묘사력!';
      rankColor = '#10b981';
    } else if (result.score >= 45) {
      titleRank = '👍 개성 넘치는 횃불이!';
      rankColor = '#3b82f6';
    } else {
      titleRank = '🐥 조금 더 관찰해 볼까요?';
      rankColor = '#6b7280';
    }

    content.innerHTML = `
      <div class="inu-draw-res-grid">
        <!-- 좌측: 비주얼 오버레이 비교 캔버스 -->
        <div class="inu-res-visual-box card">
          <div class="inu-res-vis-title">
            <span>시각적 비교 피드백</span>
            <div class="inu-legend-row">
              <span class="inu-leg-dot" style="background:#10b981;"></span><span class="inu-leg-txt">일치 (±3px)</span>
              <span class="inu-leg-dot" style="background:#ef4444; margin-left:6px;"></span><span class="inu-leg-txt">오차</span>
              <span class="inu-leg-dot" style="background:rgba(10,74,155,0.4); margin-left:6px;"></span><span class="inu-leg-txt">원본 윤곽</span>
            </div>
          </div>
          <div class="inu-res-canvas-holder" id="inu-res-canvas-holder">
            <!-- 오버레이 캔버스 주입 -->
          </div>
        </div>

        <!-- 우측: 점수표 & 상세 수치 분석 -->
        <div class="inu-res-score-box">
          <div class="inu-res-score-badge">
            <span class="inu-res-score-num" style="color:${rankColor};">${result.score}</span>
            <span class="inu-res-score-unit">점</span>
          </div>

          <div class="inu-res-rank-title" style="color:${rankColor};">${titleRank}</div>
          
          ${result.penaltyReason ? `
            <div class="inu-res-penalty-alert">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>${_escapeHtml(result.penaltyReason)}</span>
            </div>
          ` : ''}

          <div class="inu-res-stat-table">
            <div class="inu-stat-row">
              <span class="stat-k"><i class="fa-solid fa-bullseye"></i> 외곽선 일치율</span>
              <strong class="stat-v">${result.matchRate}%</strong>
            </div>
            <div class="inu-stat-row">
              <span class="stat-k"><i class="fa-solid fa-ruler"></i> 평균 거리 오차</span>
              <strong class="stat-v">${result.meanDist} px</strong>
            </div>
            <div class="inu-stat-row">
              <span class="stat-k"><i class="fa-solid fa-clock"></i> 소요 시간</span>
              <strong class="stat-v">${timeUsed}초</strong>
            </div>
          </div>

          <!-- 멀티플레이 시 랭킹 리스트 -->
          ${_players.length > 1 ? `
            <div class="inu-res-multi-rank">
              <div class="inu-res-mr-title"><i class="fa-solid fa-ranking-star"></i> 방 참가자 최종 순위</div>
              <div class="inu-mr-list">
                ${Object.values(_submissions)
                  .sort((a, b) => b.score - a.score || a.timeSec - b.timeSec)
                  .map((sub, idx) => `
                    <div class="inu-mr-item ${sub.name === _myName ? 'is-me' : ''}">
                      <span class="inu-mr-pos">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}위`}</span>
                      <span class="inu-mr-name">${_escapeHtml(sub.name)}</span>
                      <strong class="inu-mr-score">${sub.score}점 (${sub.timeSec}s)</strong>
                    </div>
                  `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // 오버레이 캔버스 삽입
    const holder = document.getElementById('inu-res-canvas-holder');
    if (holder) {
      holder.innerHTML = '';
      const overlayCanvas = _createComparisonOverlayCanvas(result);
      holder.appendChild(overlayCanvas);
    }

    modal.classList.remove('hidden');
  }

  /**
   * 12. UI 이벤트 바인딩
   */
  function _bindEvents() {
    // 1. 색상 선택기
    document.querySelectorAll('.inu-color-dot').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.inu-color-dot').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _brushColor = btn.getAttribute('data-color') || '#0A4A9B';
        _isEraser = false;
        if (_drawCtx) {
          _drawCtx.strokeStyle = _brushColor;
          _drawCtx.globalCompositeOperation = 'source-over';
        }
        const eraserBtn = document.getElementById('btn-draw-eraser');
        if (eraserBtn) eraserBtn.classList.remove('active');
      });
    });

    // 2. 굵기 조절
    document.querySelectorAll('.inu-size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.inu-size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _brushSize = parseInt(btn.getAttribute('data-size'), 10) || 6;
        if (_drawCtx) _drawCtx.lineWidth = _brushSize;
      });
    });

    // 3. 지우개 토글
    const eraserBtn = document.getElementById('btn-draw-eraser');
    if (eraserBtn) {
      eraserBtn.addEventListener('click', () => {
        _isEraser = !_isEraser;
        eraserBtn.classList.toggle('active', _isEraser);
        if (_drawCtx) {
          if (_isEraser) {
            _drawCtx.globalCompositeOperation = 'destination-out';
          } else {
            _drawCtx.globalCompositeOperation = 'source-over';
            _drawCtx.strokeStyle = _brushColor;
          }
        }
      });
    }

    // 4. 되돌리기 (Undo) & 전체 삭제 (Clear)
    const undoBtn = document.getElementById('btn-draw-undo');
    if (undoBtn) undoBtn.addEventListener('click', _performUndo);

    const clearBtn = document.getElementById('btn-draw-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => _clearCanvas(true));

    // 5. 가이드선 모드 토글
    const bindGuide = (id, mode) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          _guideMode = mode;
          document.querySelectorAll('.inu-guide-toggle-group .btn').forEach(b => b.className = 'btn btn-xs btn-outline');
          btn.className = 'btn btn-xs btn-primary';
          _updateGhostGuides();
        });
      }
    };
    bindGuide('btn-guide-none', 'none');
    bindGuide('btn-guide-ghost', 'ghost');

    // 6. 직접 이미지 업로드 (Custom Image Upload)
    const fileInput = document.getElementById('inu-draw-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (re) => {
          _customImgSrc = re.target.result;
          const img = new Image();
          img.onload = () => {
            _imageCache['custom'] = img;
            _extractTargetEdges('custom', img);
            _renderGameUI();
            _startCountdown(() => _startTimer());
          };
          img.src = _customImgSrc;
        };
        reader.readAsDataURL(file);
      });
    }

    // 7. 채점 및 제출 버튼
    const submitBtn = document.getElementById('btn-draw-submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => _submitAndScore(false));
    }

    // 8. 결과 모달 닫기 / 재도전
    const closeBtn = document.getElementById('btn-close-draw-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const modal = document.getElementById('inu-draw-result-modal');
        if (modal) modal.classList.add('hidden');
      });
    }

    const retryBtn = document.getElementById('btn-draw-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        const modal = document.getElementById('inu-draw-result-modal');
        if (modal) modal.classList.add('hidden');
        _clearCanvas(true);
        _hasSubmitted = false;
        _timeRemaining = TOTAL_DRAW_TIME;
        _startCountdown(() => _startTimer());
      });
    }

    const nextBtn = document.getElementById('btn-draw-next-stage');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const modal = document.getElementById('inu-draw-result-modal');
        if (modal) modal.classList.add('hidden');
        const others = [0, 1, 2].filter(i => i !== _currentStageIdx);
        const nextIdx = others[Math.floor(Math.random() * others.length)];
        _switchStage(nextIdx);
      });
    }
  }

  /**
   * 13. 스테이지 전환 (호스트가 다음 판 시작 시 전체 동기화)
   */
  function _switchStage(idx) {
    _customImgSrc = null;
    _currentStageIdx = idx;
    _hasSubmitted = false;
    _hasRevealed = false;
    _canDraw = false;
    _undoStack = [];
    _submissions = {};
    _timeRemaining = TOTAL_DRAW_TIME;

    if (_isHost && typeof P2P !== 'undefined' && P2P.send) {
      P2P.send({
        type: 'inu_draw_stage_change',
        stageIdx: idx
      });
    }

    _renderGameUI();
    _startCountdown(() => _startTimer());
  }

  /**
   * 14. P2P 네트워크 메시지 수신 핸들러 (동시 시작 & 동시 채점 동기화)
   */
  function _handleMessage(data) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'inu_draw_init_sync') {
      _hasHostSynced = true;
      _currentStageIdx = data.stageIdx !== undefined ? data.stageIdx : 0;
      _submissions = {};
      _hasSubmitted = false;
      _hasRevealed = false;
      _undoStack = [];
      _renderGameUI();
      _startCountdown(() => _startTimer());

    } else if (data.type === 'inu_draw_stage_change') {
      _currentStageIdx = data.stageIdx !== undefined ? data.stageIdx : 0;
      _customImgSrc = null;
      _hasSubmitted = false;
      _hasRevealed = false;
      _canDraw = false;
      _undoStack = [];
      _submissions = {};
      _timeRemaining = TOTAL_DRAW_TIME;
      _renderGameUI();
      _startCountdown(() => _startTimer());

    } else if (data.type === 'inu_draw_submit') {
      _submissions[data.playerId] = {
        id: data.playerId,
        name: data.playerName,
        score: data.score,
        matchRate: data.matchRate,
        meanDist: data.meanDist,
        timeSec: data.timeSec,
        dataUrl: data.dataUrl,
        penaltyReason: data.penaltyReason
      };

      // 제출 카운트 배지 갱신
      const badgeCountEl = document.getElementById('inu-draw-players-count');
      if (badgeCountEl) {
        badgeCountEl.textContent = `제출: ${Object.keys(_submissions).length} / ${_players.length}명`;
      }
      const waitCountEl = document.getElementById('inu-waiting-count-text');
      if (waitCountEl) {
        waitCountEl.textContent = `${Object.keys(_submissions).length} / ${_players.length}명 제출 완료`;
      }

      // 호스트인 경우: 전원 제출 완료 시 채점 동시 공개 트리거!
      if (_isHost && !_hasRevealed) {
        const submittedCount = Object.keys(_submissions).length;
        if (submittedCount >= _players.length) {
          setTimeout(() => {
            _revealScoresForAll();
          }, 600);
        }
      }

    } else if (data.type === 'inu_draw_reveal') {
      // 호스트가 보낸 최종 채점 결과 수신 -> 전 참가자 동시 결과 모달 오픈!
      if (data.submissions) {
        _submissions = data.submissions;
      }
      _revealScoresForAll();
    }
  }

  /**
   * 15. 게임 종료 및 리소스 해제
   */
  function destroy() {
    _stopTimer();
    _stopCountdown();
    if (typeof P2P !== 'undefined' && P2P.offMessage) {
      P2P.offMessage(_handleMessage);
    }
    if (_container) _container.innerHTML = '';
  }

  function _escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { init, destroy };
})();
