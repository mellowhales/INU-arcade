/**
 * inu_quiz.js - 인천대 퀴즈 게임 (INU Speed Quiz Battle)
 * 인천대에 관한 다양한 퀴즈를 출제하고, 선착순으로 가장 먼저 정답을 입력한 사람이 승리하는 스피드 퀴즈입니다.
 */

const InuQuizGame = (() => {
  // ── 인천대학교 퀴즈 문제 은행 ──
  const INU_QUESTIONS = [
    {
      id: 1,
      category: '마스코트',
      question: '인천대학교의 대표 상징 마스코트의 이름은 무엇일까요?',
      answers: ['횃불이'],
      hint: 'ㅎㅂㅇ',
      explanation: '인천대학교의 공식 마스코트는 지혜와 열정으로 세상을 밝히는 "횃불이"입니다.'
    },
    {
      id: 2,
      category: '캠퍼스 역사',
      question: '인천대학교가 송도국제도시 신캠퍼스로 이전한 연도는 몇 년도일까요?',
      answers: ['2009', '2009년'],
      hint: '2000년대 후반',
      explanation: '인천대학교는 2009년 제물포에서 최첨단 송도국제도시 캠퍼스로 성공적으로 이전하였습니다.'
    },
    {
      id: 3,
      category: '교통/위치',
      question: '인천대학교와 바로 맞닿아 있는 인천도시철도 1호선 지하철역 이름은 무엇일까요?',
      answers: ['인천대입구역'],
      hint: 'ㅇㅊㄷㅇㄱㅇ (인천 1호선)',
      explanation: '인천도시철도 1호선 "인천대입구역"에서 교내 셔틀버스 및 도보로 연결됩니다.'
    },
    {
      id: 4,
      category: '도서관',
      question: '인천대학교 중앙도서관의 공식 명칭은 누구의 호를 딴 도서관일까요?',
      answers: ['학산도서관', '학산 도서관', '학산'],
      hint: 'ㅎㅅ도서관',
      explanation: '인천대학교 중앙도서관은 학산(鶴山) 최규식 선생의 호를 기려 "학산도서관"으로 명명되었습니다.'
    },
    {
      id: 5,
      category: '대학 상징',
      question: '인천대학교의 영문 공식 약칭(알파벳 3글자)은 무엇일까요?',
      answers: ['INU', 'inu', '아이앤유'],
      hint: 'I로 시작하는 3글자',
      explanation: 'Incheon National University의 공식 영문 약칭은 "INU"입니다.'
    },
    {
      id: 6,
      category: '상징 색상',
      question: '인천대학교의 공식 시그니처 대표 교색은 무슨 색일까요?',
      answers: ['남색', '네이비', 'navy', '블루', '파란색', '시그니처네이비', '시그니처 네이비'],
      hint: '진한 파란색 계통 (ㄴㅅ / 4글자 영어)',
      explanation: '인천대학교의 시그니처 대표 상징 컬러는 신뢰와 지성을 상징하는 "시그니처 네이비(남색)"입니다.'
    },
    {
      id: 7,
      category: '캠퍼스 위치',
      question: '인천대학교 본교 캠퍼스가 위치한 인천 연수구의 국제도시는 어디일까요?',
      answers: ['송도', '송도국제도시', '송도신도시', '송도캠퍼스'],
      hint: 'ㅅㄷ국제도시',
      explanation: '인천대학교는 글로벌 교육과 첨단 바이오·IT의 중심인 "송도국제도시"에 위치하고 있습니다.'
    },
    {
      id: 8,
      category: '축제/문화',
      question: '인천대학교의 대표 가을/봄 대학 축제 명칭(2글자 또는 축제명)은 무엇일까요?',
      answers: ['대동제', '유니온', '유니온페스티벌', '유니온 페스티벌'],
      hint: 'ㄷㄷㅈ 또는 ㅇㄴㅇ',
      explanation: '인천대학교의 대표 축제는 학생들의 화합을 상징하는 "대동제"와 "유니온 페스티벌"입니다.'
    },
    {
      id: 9,
      category: '대학 역사',
      question: '인천대학교가 시립대학교에서 국립대학법인으로 전환된 연도는 몇 년도일까요?',
      answers: ['2013', '2013년', '2013년도'],
      hint: '2010년대 초반',
      explanation: '인천대학교는 2013년 국립대학법인으로 공식 출범하여 거점 국립대로 도약하였습니다.'
    },
    {
      id: 10,
      category: '교내 명소',
      question: '인천대학교 송도캠퍼스 중심부에 위치한 교내 대표 인공 호수의 이름은 무엇일까요?',
      answers: ['일지호', '일지 호'],
      hint: 'ㅇㅈㅎ',
      explanation: '송도캠퍼스 중앙에 자리잡은 아름다운 "일지호"는 학생들의 대표적인 휴식 공간입니다.'
    },
    {
      id: 11,
      category: '단과대학',
      question: '인천대학교 컴퓨터공학부, 정보통신공학과, 임베디드시스템공학과가 속한 단과대학은?',
      answers: ['정보기술대학', '정보기술대', 'it대학', 'IT대학'],
      hint: 'ㅈㅂㄱㅅ대학 (IT대학)',
      explanation: '소프트웨어와 차세대 컴퓨팅을 선도하는 "정보기술대학(IT대학)"입니다.'
    },
    {
      id: 12,
      category: '교훈',
      question: '인천대학교의 3대 교훈은 "진리", "창조", 그리고 정의로운 사회를 추구하는 "이것"입니다. 무엇일까요?',
      answers: ['정의'],
      hint: 'ㅈㅇ (2글자)',
      explanation: '인천대학교의 3대 교훈은 "진리", "정의", "창조"입니다.'
    },
    {
      id: 13,
      category: '캠퍼스 역사',
      question: '송도 이전 전, 인천대학교가 1979년부터 오랜 역사를 함께했던 인천 미추홀구의 캠퍼스 이름은?',
      answers: ['제물포', '제물포캠퍼스', '제물포 캠퍼스', '도화동'],
      hint: 'ㅈㅁㅍ (1호선 역 이름)',
      explanation: '인천대학교는 2009년 송도 이전 전까지 "제물포 캠퍼스"에서 수많은 인재를 배출하였습니다.'
    },
    {
      id: 14,
      category: '학생 복지',
      question: '학식당, 카페, 동아리방, 편의점 등이 위치한 교내 11호관 건물의 공식 명칭은?',
      answers: ['학생회관', '학생복지회관', '11호관 학생회관'],
      hint: 'ㅎㅅㅎㄱ',
      explanation: '송도캠퍼스 11호관은 학생들의 자치 활동과 복지의 중심인 "학생회관"입니다.'
    },
    {
      id: 15,
      category: '교내 방송국',
      question: '인천대학교 교육방송국의 영문 약칭(알파벳 4글자)은 무엇일까요?',
      answers: ['IUBS', 'iubs'],
      hint: 'I로 시작하는 4글자',
      explanation: '인천대학교 공식 교육방송국의 영문 명칭 약칭은 "IUBS"입니다.'
    },
    {
      id: 16,
      category: '단과대학',
      question: '기계공학과, 전기공학과, 전자공학과, 도시환경공학부 등이 속한 전통 단과대학의 명칭은?',
      answers: ['공과대학', '공과대', '공대'],
      hint: 'ㄱㄱ대학',
      explanation: '우수한 엔지니어를 양성하는 인천대학교 "공과대학"입니다.'
    },
    {
      id: 17,
      category: '시설',
      question: '인천대학교에서 축구 경기와 체육대회가 열리는 야외 대형 인조잔디 경기장의 이름은?',
      answers: ['대운동장', '운동장'],
      hint: 'ㄷㅇㄷㅈ',
      explanation: '체육 축제와 스포츠 경기가 진행되는 "대운동장"입니다.'
    },
    {
      id: 18,
      category: '캠퍼스 상식',
      question: '학산도서관 이룸관 1층에 자리한 학생 전용 디지털 미디어/스터디 라운지 공간은 "이룸관"이다. (O 또는 X)',
      answers: ['O', 'o', '오', 'ㅇ'],
      hint: 'O 또는 X 중 하나',
      explanation: '학산도서관 신축 복합문화공간은 "이룸관"이 맞습니다.'
    },
    {
      id: 19,
      category: '교통',
      question: '인천대학교 셔틀버스가 인천대입구역과 함께 순환 운행하는 송도의 1호선 지하철역 이름은?',
      answers: ['지식정보단지역', '지식정보단지', '테크노파크역', '테크노파크'],
      hint: 'ㅈㅅㅈㅂㄷㅈ역',
      explanation: '인천대학교 셔틀버스는 "지식정보단지역"과 "인천대입구역"을 연결합니다.'
    },
    {
      id: 20,
      category: '커뮤니티',
      question: '인천대학교 학생들이 학교 생활, 강의 평가, 시간표 등을 공유하는 대표 대학생 커뮤니티 앱은?',
      answers: ['에브리타임', '에타', 'everytime'],
      hint: 'ㅇㅂㄹㅌㅇ (줄여서 ㅇㅌ)',
      explanation: '대학생 필수 커뮤니티 "에브리타임(에타)"입니다.'
    }
  ];

  const TIME_PER_QUESTION = 15; // 각 문제당 15초

  let _container = null;
  let _onResult = null;
  let _context = null;

  let _isHost = false;
  let _myId = '';
  let _players = [];
  let _scores = {}; // { [playerId]: score }

  let _round = 0;
  let _totalRounds = 5;
  let _currentQ = null;
  let _timeLeft = TIME_PER_QUESTION;
  let _timerId = null;
  let _isRoundActive = false;
  let _roundWinner = null;
  let _questionDeck = [];
  let _usedIndices = new Set();

  function init(container, onResult, context) {
    _container = container;
    _onResult = onResult;
    _context = context || {};

    _isHost = !!_context.isHost;
    _myId = _context.myId || 'me';
    _players = Array.isArray(_context.players) && _context.players.length > 0 ? _context.players : [{ id: _myId, name: _context.myNickname || '나' }];
    _totalRounds = typeof _context.targetRounds === 'number' && _context.targetRounds >= 3 ? _context.targetRounds : 5;

    // 점수 초기화
    _scores = {};
    _players.forEach(p => {
      _scores[p.id] = 0;
    });

    _round = 0;
    _isRoundActive = false;
    _roundWinner = null;
    _usedIndices.clear();

    // P2P 메시지 리스너 등록
    P2P.onMessage(_handleMessage);

    if (_isHost) {
      _prepareDeck();
      _startNextRound();
    } else {
      _renderWaitingForHost();
    }
  }

  function _prepareDeck() {
    _questionDeck = [...INU_QUESTIONS].sort(() => Math.random() - 0.5);
  }

  function _renderWaitingForHost() {
    _container.innerHTML = `
      <div class="inu-quiz-wrap">
        <div class="inu-quiz-card card text-center" style="padding: 40px 20px;">
          <div class="inu-quiz-badge"><i class="fa-solid fa-graduation-cap"></i> 인천대 퀴즈 배틀</div>
          <h2 style="margin: 20px 0 10px; font-size: 1.5rem; color: var(--t1);">방장님이 퀴즈를 준비 중입니다...</h2>
          <p style="color: var(--t2); font-size: 0.95rem;">잠시 후 첫 번째 인천대 퀴즈가 시작됩니다. 준비하세요!</p>
          <div class="inu-loading-spinner" style="margin-top: 24px;">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem; color: var(--primary);"></i>
          </div>
        </div>
      </div>
    `;
  }

  function _startNextRound() {
    if (!_isHost) return;

    if (_round >= _totalRounds) {
      _finishGame();
      return;
    }

    _round++;
    _currentQ = _questionDeck[(_round - 1) % _questionDeck.length];
    _timeLeft = TIME_PER_QUESTION;
    _isRoundActive = true;
    _roundWinner = null;

    // 참가자들에게 문제 브로드캐스트
    P2P.send({
      type: 'inu_quiz_question',
      round: _round,
      totalRounds: _totalRounds,
      question: {
        id: _currentQ.id,
        category: _currentQ.category,
        question: _currentQ.question,
        hint: _currentQ.hint
      },
      timeLimit: TIME_PER_QUESTION
    });

    _renderRoundUI();
    _startTimer();
  }

  function _startTimer() {
    if (_timerId) clearInterval(_timerId);
    _updateTimerBar();

    _timerId = setInterval(() => {
      _timeLeft--;
      _updateTimerBar();

      if (_timeLeft <= 0) {
        clearInterval(_timerId);
        _timerId = null;
        if (_isHost && _isRoundActive) {
          _handleTimeOut();
        }
      }
    }, 1000);
  }

  function _updateTimerBar() {
    const timerFill = document.getElementById('inu-quiz-timer-fill');
    const timerText = document.getElementById('inu-quiz-timer-text');
    if (timerFill) {
      const pct = Math.max(0, Math.min(100, (_timeLeft / TIME_PER_QUESTION) * 100));
      timerFill.style.width = `${pct}%`;
      if (pct < 30) {
        timerFill.style.background = '#ef4444';
      } else if (pct < 60) {
        timerFill.style.background = '#f59e0b';
      } else {
        timerFill.style.background = 'var(--primary)';
      }
    }
    if (timerText) {
      timerText.textContent = `${_timeLeft}초`;
    }

    // 힌트 공개 (시간이 절반 이하로 남았을 때)
    const hintBox = document.getElementById('inu-quiz-hint-box');
    if (hintBox && _timeLeft <= Math.floor(TIME_PER_QUESTION / 2) && _currentQ) {
      hintBox.innerHTML = `<i class="fa-regular fa-lightbulb"></i> 힌트: <strong>${_escapeHtml(_currentQ.hint)}</strong>`;
      hintBox.classList.remove('hidden');
    }
  }

  function _renderRoundUI() {
    if (!_currentQ) return;

    _container.innerHTML = `
      <div class="inu-quiz-wrap">
        <!-- 상단 헤더: 라운드 진행도 & 랭킹 요약 -->
        <div class="inu-quiz-top-bar">
          <div class="inu-quiz-round-tag">
            <i class="fa-solid fa-graduation-cap"></i> ROUND ${_round} / ${_totalRounds}
          </div>
          <div class="inu-quiz-scores-pill">
            ${_renderMiniScores()}
          </div>
        </div>

        <!-- 타이머 바 -->
        <div class="inu-quiz-timer-wrapper">
          <div class="inu-quiz-timer-track">
            <div class="inu-quiz-timer-fill" id="inu-quiz-timer-fill" style="width: 100%;"></div>
          </div>
          <span class="inu-quiz-timer-text" id="inu-quiz-timer-text">${_timeLeft}초</span>
        </div>

        <!-- 메인 퀴즈 카드 -->
        <div class="inu-quiz-card card" id="inu-quiz-card">
          <div class="inu-category-badge">
            <i class="fa-solid fa-bookmark"></i> ${_escapeHtml(_currentQ.category || '인천대 상식')}
          </div>
          <h2 class="inu-question-text" id="inu-question-text">
            ${_escapeHtml(_currentQ.question)}
          </h2>

          <!-- 힌트 상자 -->
          <div class="inu-hint-box hidden" id="inu-quiz-hint-box"></div>

          <!-- 라운드 결과 피드백 배너 -->
          <div class="inu-feedback-banner hidden" id="inu-quiz-feedback"></div>

          <!-- 정답 입력 폼 -->
          <form class="inu-answer-form" id="inu-quiz-form" onsubmit="return false;">
            <div class="inu-input-group">
              <input
                type="text"
                id="inu-quiz-input"
                class="inu-quiz-input"
                placeholder="선착순 1등으로 정답을 입력하세요! (Enter)"
                maxlength="30"
                autocomplete="off"
                autofocus
              />
              <button type="submit" class="btn btn-primary inu-quiz-submit-btn" id="btn-quiz-submit">
                <i class="fa-solid fa-paper-plane"></i>
                <span>제출</span>
              </button>
            </div>
            <p class="inu-input-hint"><i class="fa-solid fa-bolt"></i> 가장 먼저 정확한 답을 입력한 플레이어가 점수를 획득합니다!</p>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById('inu-quiz-form');
    const input = document.getElementById('inu-quiz-input');
    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        _handleSubmitAnswer(input.value.trim());
      });
      setTimeout(() => input.focus(), 50);
    }
  }

  function _renderMiniScores() {
    return _players.map(p => {
      const s = _scores[p.id] || 0;
      const isMe = String(p.id) === String(_myId);
      return `
        <span class="inu-mini-score ${isMe ? 'is-me' : ''}">
          <strong class="inu-score-name">${_escapeHtml(p.name)}</strong>: <span class="inu-score-pts">${s}점</span>
        </span>
      `;
    }).join('');
  }

  function _handleSubmitAnswer(rawVal) {
    if (!_isRoundActive || !rawVal) return;
    const input = document.getElementById('inu-quiz-input');

    const cleanInput = rawVal.replace(/\s+/g, '').toLowerCase();

    // 내가 호스트인 경우 즉시 판정, 게스트인 경우 호스트에게 전송
    if (_isHost) {
      const isCorrect = _checkAnswer(_currentQ, cleanInput);
      if (isCorrect) {
        _handleRoundWin(_myId, _context.myNickname || '나', _currentQ.answers[0]);
      } else {
        _showWrongShake();
      }
    } else {
      P2P.send({
        type: 'inu_quiz_submit',
        playerId: _myId,
        playerName: _context.myNickname || '나',
        answer: cleanInput,
        round: _round
      });
    }

    if (input) {
      input.value = '';
    }
  }

  function _checkAnswer(qObj, cleanVal) {
    if (!qObj || !Array.isArray(qObj.answers)) return false;
    return qObj.answers.some(ans => {
      const cleanAns = String(ans).replace(/\s+/g, '').toLowerCase();
      return cleanAns === cleanVal;
    });
  }

  function _showWrongShake() {
    const card = document.getElementById('inu-quiz-card');
    const input = document.getElementById('inu-quiz-input');
    if (card) {
      card.classList.remove('shake');
      void card.offsetWidth; // reflow
      card.classList.add('shake');
    }
    if (typeof Sound !== 'undefined' && Sound.playError) Sound.playError();
    if (input) {
      input.placeholder = '아쉬워요! 다시 시도해보세요!';
      setTimeout(() => {
        if (input) input.placeholder = '선착순 1등으로 정답을 입력하세요! (Enter)';
      }, 1500);
    }
  }

  function _handleRoundWin(winnerId, winnerName, standardAnswer) {
    if (!_isRoundActive) return;
    _isRoundActive = false;
    if (_timerId) { clearInterval(_timerId); _timerId = null; }

    const speedBonus = Math.max(10, Math.floor((_timeLeft / TIME_PER_QUESTION) * 50));
    const earnedPoints = 100 + speedBonus;
    _scores[winnerId] = (_scores[winnerId] || 0) + earnedPoints;

    const roundResult = {
      winnerId,
      winnerName,
      earnedPoints,
      answer: standardAnswer || (_currentQ ? _currentQ.answers[0] : ''),
      explanation: _currentQ ? _currentQ.explanation : '',
      scores: { ..._scores }
    };

    if (_isHost) {
      P2P.send({
        type: 'inu_quiz_round_win',
        ...roundResult
      });
    }

    _displayRoundWinFeedback(roundResult);
  }

  function _handleTimeOut() {
    if (!_isRoundActive) return;
    _isRoundActive = false;
    if (_timerId) { clearInterval(_timerId); _timerId = null; }

    const answer = _currentQ ? _currentQ.answers[0] : '';
    const explanation = _currentQ ? _currentQ.explanation : '';

    if (_isHost) {
      P2P.send({
        type: 'inu_quiz_timeout',
        answer,
        explanation,
        scores: { ..._scores }
      });
    }

    _displayTimeoutFeedback(answer, explanation);
  }

  function _displayRoundWinFeedback(data) {
    const feedback = document.getElementById('inu-quiz-feedback');
    const input = document.getElementById('inu-quiz-input');
    const submitBtn = document.getElementById('btn-quiz-submit');

    if (input) input.disabled = true;
    if (submitBtn) submitBtn.disabled = true;

    if (typeof Sound !== 'undefined' && Sound.playWin) Sound.playWin();

    if (feedback) {
      feedback.className = 'inu-feedback-banner win';
      feedback.innerHTML = `
        <div class="inu-fb-title"><i class="fa-solid fa-trophy"></i> <strong>${_escapeHtml(data.winnerName)}</strong>님이 가장 먼저 정답을 맞혔습니다! (+${data.earnedPoints}점)</div>
        <div class="inu-fb-answer">정답: <strong>${_escapeHtml(data.answer)}</strong></div>
        <div class="inu-fb-desc">${_escapeHtml(data.explanation || '')}</div>
        <div class="inu-fb-next"><i class="fa-solid fa-circle-notch fa-spin"></i> 3초 후 다음 문제로 넘어갑니다...</div>
      `;
      feedback.classList.remove('hidden');
    }

    _scores = data.scores || _scores;
    _updateMiniScoresUI();

    if (_isHost) {
      setTimeout(() => {
        _startNextRound();
      }, 3500);
    }
  }

  function _displayTimeoutFeedback(answer, explanation) {
    const feedback = document.getElementById('inu-quiz-feedback');
    const input = document.getElementById('inu-quiz-input');
    const submitBtn = document.getElementById('btn-quiz-submit');

    if (input) input.disabled = true;
    if (submitBtn) submitBtn.disabled = true;

    if (feedback) {
      feedback.className = 'inu-feedback-banner timeout';
      feedback.innerHTML = `
        <div class="inu-fb-title"><i class="fa-regular fa-clock"></i> 시간 초과! 아무도 정답을 맞히지 못했습니다.</div>
        <div class="inu-fb-answer">정답: <strong>${_escapeHtml(answer)}</strong></div>
        <div class="inu-fb-desc">${_escapeHtml(explanation || '')}</div>
        <div class="inu-fb-next"><i class="fa-solid fa-circle-notch fa-spin"></i> 3초 후 다음 문제로 넘어갑니다...</div>
      `;
      feedback.classList.remove('hidden');
    }

    if (_isHost) {
      setTimeout(() => {
        _startNextRound();
      }, 3500);
    }
  }

  function _updateMiniScoresUI() {
    const pill = document.querySelector('.inu-quiz-scores-pill');
    if (pill) {
      pill.innerHTML = _renderMiniScores();
    }
  }

  function _finishGame() {
    if (_timerId) { clearInterval(_timerId); _timerId = null; }
    _isRoundActive = false;

    // 최종 순위 계산
    const ranking = [..._players].sort((a, b) => (_scores[b.id] || 0) - (_scores[a.id] || 0));
    const winner = ranking[0];

    const finalData = {
      winnerId: winner ? winner.id : '',
      winnerName: winner ? winner.name : '무승부',
      ranking: ranking.map(p => ({
        id: p.id,
        name: p.name,
        score: _scores[p.id] || 0,
        avatarIcon: p.avatarIcon,
        avatarColor: p.avatarColor
      }))
    };

    if (_isHost) {
      P2P.send({
        type: 'inu_quiz_final',
        ...finalData
      });
    }

    _renderFinalScreen(finalData);

    const isMeWinner = winner && String(winner.id) === String(_myId);
    setTimeout(() => {
      if (_onResult) {
        _onResult({
          winner: winner,
          iAmWinner: isMeWinner,
          customLeaderboard: finalData.ranking
        });
      }
    }, 4000);
  }

  function _renderFinalScreen(data) {
    if (!_container) return;

    const rankListHtml = data.ranking.map((p, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}위`;
      const isWinner = idx === 0;
      return `
        <div class="inu-rank-item ${isWinner ? 'winner-card' : ''}">
          <div class="inu-rank-badge">${medal}</div>
          <div class="inu-rank-name">${_escapeHtml(p.name)}</div>
          <div class="inu-rank-score"><strong>${p.score}</strong>점</div>
        </div>
      `;
    }).join('');

    _container.innerHTML = `
      <div class="inu-quiz-wrap">
        <div class="inu-quiz-card card final-card text-center">
          <div class="inu-trophy-icon">🏆</div>
          <h2 style="font-size: 1.8rem; margin: 10px 0 6px; font-weight: 900; color: var(--primary);">인천대 퀴즈 배틀 종료!</h2>
          <p style="color: var(--t2); margin-bottom: 24px;">최종 1등: <strong>${_escapeHtml(data.winnerName)}</strong>님 축하합니다!</p>

          <div class="inu-ranking-list">
            ${rankListHtml}
          </div>

          <div style="margin-top: 30px;">
            <button type="button" class="btn btn-primary" id="btn-quiz-rematch">
              <i class="fa-solid fa-rotate-right"></i>
              <span>다시 플레이하기</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const btnRematch = document.getElementById('btn-quiz-rematch');
    if (btnRematch) {
      btnRematch.addEventListener('click', () => {
        if (_isHost) {
          P2P.send({ type: 'inu_quiz_rematch' });
          init(_container, _onResult, _context);
        } else {
          showToast('방장님만 다시 시작할 수 있습니다.', 'info');
        }
      });
    }
  }

  function _handleMessage(data) {
    if (!data) return;

    if (data.type === 'inu_quiz_question') {
      _round = data.round;
      _totalRounds = data.totalRounds || _totalRounds;
      _currentQ = data.question;
      _timeLeft = data.timeLimit || TIME_PER_QUESTION;
      _isRoundActive = true;
      _renderRoundUI();
      _startTimer();

    } else if (data.type === 'inu_quiz_submit') {
      // 오직 호스트만 선착순 정답 채점
      if (_isHost && _isRoundActive && data.round === _round) {
        const isCorrect = _checkAnswer(_currentQ, data.answer);
        if (isCorrect) {
          _handleRoundWin(data.playerId, data.playerName, _currentQ.answers[0]);
        }
      }

    } else if (data.type === 'inu_quiz_round_win') {
      _isRoundActive = false;
      if (_timerId) { clearInterval(_timerId); _timerId = null; }
      _displayRoundWinFeedback(data);

    } else if (data.type === 'inu_quiz_timeout') {
      _isRoundActive = false;
      if (_timerId) { clearInterval(_timerId); _timerId = null; }
      _displayTimeoutFeedback(data.answer, data.explanation);

    } else if (data.type === 'inu_quiz_final') {
      _renderFinalScreen(data);

    } else if (data.type === 'inu_quiz_rematch') {
      init(_container, _onResult, _context);
    }
  }

  function destroy() {
    if (_timerId) {
      clearInterval(_timerId);
      _timerId = null;
    }
    _isRoundActive = false;
    P2P.offMessage(_handleMessage);
    if (_container) _container.innerHTML = '';
  }

  function _escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { init, destroy };
})();
