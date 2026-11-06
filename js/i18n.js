/**
 * i18n.js — INU 아케이드 전역 국제화(i18n) 통합 엔진
 * - 사이트 내 모든 텍스트(로비, 상점, 친구, 방, 게임, 전적, 프로필, 모달 등) 완전 번역 지원
 * - 7개 언어 지원: ko, en, es, tr, ru, zh, ja
 */

const I18N = (() => {
  const LANGUAGES = [
    { code: 'ko', label: '한국어',        flag: '🇰🇷' },
    { code: 'en', label: 'English',       flag: '🇺🇸' },
    { code: 'es', label: 'Español',       flag: '🇪🇸' },
    { code: 'tr', label: 'Türkçe',        flag: '🇹🇷' },
    { code: 'ru', label: 'Русский',       flag: '🇷🇺' },
    { code: 'zh', label: '中文 (简体)',    flag: '🇨🇳' },
    { code: 'ja', label: '日本語',        flag: '🇯🇵' },
  ];

  const STORAGE_KEY = 'arcade_lang';
  let _currentLang = 'ko';
  const _localeBundles = {};

  /* ─────────────────────────────────────────────────────────
     전체 UI 종합 다국어 번역 사전
  ───────────────────────────────────────────────────────── */
  const DICT = {
    // 공통 버튼
    'common.button.save':     { ko:'저장', en:'Save', es:'Guardar', tr:'Kaydet', ru:'Сохранить', zh:'保存', ja:'保存' },
    'common.button.cancel':   { ko:'취소', en:'Cancel', es:'Cancelar', tr:'İptal', ru:'Отмена', zh:'取消', ja:'キャンセル' },
    'common.button.confirm':  { ko:'확인', en:'Confirm', es:'Confirmar', tr:'Onayla', ru:'ОК', zh:'确定', ja:'確認' },
    'common.button.close':    { ko:'닫기', en:'Close', es:'Cerrar', tr:'Kapat', ru:'Закрыть', zh:'关闭', ja:'閉じる' },
    'common.button.ready':    { ko:'준비', en:'Ready', es:'Listo', tr:'Hazır', ru:'Готов', zh:'准备', ja:'準備' },
    'common.button.start':    { ko:'게임 시작', en:'Start Game', es:'Iniciar Juego', tr:'Oyunu Başlat', ru:'Начать Игру', zh:'开始游戏', ja:'ゲームスタート' },
    'common.button.leave':    { ko:'방 나가기', en:'Leave Room', es:'Salir de la Sala', tr:'Odadan Çık', ru:'Покинуть', zh:'离开房间', ja:'部屋を出る' },
    'common.button.rematch':  { ko:'다시 하기', en:'Rematch', es:'Revancha', tr:'Tekrar Oyna', ru:'Реванш', zh:'再来一局', ja:'リマッチ' },
    'common.button.send':     { ko:'전송', en:'Send', es:'Enviar', tr:'Gönder', ru:'Отправить', zh:'发送', ja:'送信' },
    'common.button.accept':   { ko:'수락', en:'Accept', es:'Aceptar', tr:'Kabul Et', ru:'Принять', zh:'接受', ja:'承認' },
    'common.button.decline':  { ko:'거절', en:'Decline', es:'Rechazar', tr:'Reddet', ru:'Отклонить', zh:'拒绝', ja:'拒否' },
    'common.button.enter':    { ko:'입장', en:'Enter', es:'Entrar', tr:'Giriş', ru:'Войти', zh:'进入', ja:'入場' },
    'common.button.kick':     { ko:'강퇴하기', en:'Kick', es:'Expulsar', tr:'At', ru:'Выгнать', zh:'踢出', ja:'追放' },
    'common.button.transfer': { ko:'방장 위임', en:'Pass Host', es:'Ceder Anfitrión', tr:'Devret', ru:'Передать хоста', zh:'移交房主', ja:'ホスト委任' },
    'common.button.stats':    { ko:'전적 보기', en:'View Stats', es:'Ver Récord', tr:'İstatistikler', ru:'Статистика', zh:'查看战绩', ja:'戦績を見る' },
    'settings.close':         { ko:'닫기', en:'Close', es:'Cerrar', tr:'Kapat', ru:'Закрыть', zh:'关闭', ja:'閉じる' },
    'lang.title':             { ko:'언어 선택', en:'Language Selection', es:'Seleccionar Idioma', tr:'Dil Seçin', ru:'Выберите Язык', zh:'选择语言', ja:'言語を選択' },
    'lang.desc':              { ko:'앱 표시 언어를 선택하세요.', en:'Choose your display language.', es:'Elija el idioma de visualización.', tr:'Görüntüleme dilinizi seçin.', ru:'Выберите язык интерфейса.', zh:'请选择界面显示语言。', ja:'表示言語を選択してください。' },
  };

  /* ─────────────────────────────────────────────────────────
     한국어 원문 텍스트 일대일 역방향 전역 매핑 테이블
  ───────────────────────────────────────────────────────── */
  const RAW_TEXT_MAP = {
    // 탑바 & 메인 네비게이션
    'INU 아케이드': { en:'INU Arcade', es:'INU Arcade', tr:'INU Arcade', ru:'INU Arcade', zh:'INU街机', ja:'INUアーケード' },
    '시그니처 네이비': { en:'Signature Navy', es:'Azul Marino', tr:'Lacivert', ru:'Темно-синий', zh:'海军蓝', ja:'シグネチャーネイビー' },
    '상점 열기': { en:'Open Shop', es:'Abrir Tienda', tr:'Dükkanı Aç', ru:'Открыть Магазин', zh:'打开商店', ja:'ショップを開く' },
    '친구 목록': { en:'Friends List', es:'Lista de Amigos', tr:'Arkadaş Listesi', ru:'Список Друзей', zh:'好友列表', ja:'フレンドリスト' },
    '환경 설정': { en:'Settings', es:'Configuración', tr:'Ayarlar', ru:'Настройки', zh:'设置', ja:'設定' },
    '채팅': { en:'Chat', es:'Chat', tr:'Sohbet', ru:'Чат', zh:'聊天', ja:'チャット' },
    '채팅창 열기': { en:'Open Chat', es:'Abrir Chat', tr:'Sohbeti Aç', ru:'Открыть Чат', zh:'打开聊天', ja:'チャットを開く' },
    '채팅창 닫기': { en:'Close Chat', es:'Cerrar Chat', tr:'Sohbeti Kapat', ru:'Закрыть Чат', zh:'关闭聊天', ja:'チャットを閉じる' },
    '게임 목록': { en:'Games', es:'Juegos', tr:'Oyunlar', ru:'Игры', zh:'游戏列表', ja:'ゲーム一覧' },
    '2인 전용': { en:'2 Players', es:'2 Jugadores', tr:'2 Oyuncu', ru:'2 Игрока', zh:'2人专用', ja:'2人専用' },
    '2~8인': { en:'2~8 Players', es:'2~8 Jugadores', tr:'2~8 Oyuncu', ru:'2~8 Игроков', zh:'2~8人', ja:'2〜8人' },
    '2~4인': { en:'2~4 Players', es:'2~4 Jugadores', tr:'2~4 Oyuncu', ru:'2~4 Игроков', zh:'2~4人', ja:'2〜4人' },
    '멀티': { en:'Multi', es:'Multi', tr:'Çok Oyunculu', ru:'Мульти', zh:'多人', ja:'マルチ' },

    // 게임 이름 & 설명
    '오목': { en:'Gomoku', es:'Gomoku', tr:'Gomoku', ru:'Гомоку', zh:'五子棋', ja:'五目並べ' },
    '15×15 턴제 전략': { en:'15×15 Turn-Based Strategy', es:'Estrategia 15×15', tr:'15×15 Strateji', ru:'15×15 Стратегия', zh:'15×15回合制策略', ja:'15×15ターン制戦略' },
    '15×15 턴제 바둑판': { en:'15×15 Board Battle', es:'Tablero 15×15', tr:'15×15 Tahta', ru:'15×15 Доска', zh:'15×15棋盘', ja:'15×15盤' },
    '체스': { en:'Chess', es:'Ajedrez', tr:'Satranç', ru:'Шахматы', zh:'国际象棋', ja:'チェス' },
    '실시간 2인 클래식 체스': { en:'Classic Chess 2P', es:'Ajedrez Clásico 2J', tr:'Klasik Satranç 2K', ru:'Шахматы 2И', zh:'2人经典国象', ja:'2人クラシックチェス' },
    '정통 클래식 2인 체스': { en:'Classic 2-Player Chess', es:'Ajedrez Clásico 2J', tr:'Klasik 2K Satranç', ru:'Шахматы 2И', zh:'2人国际象棋', ja:'2人クラシックチェス' },
    '장기': { en:'Janggi', es:'Janggi', tr:'Kore Satrancı', ru:'Чанги', zh:'韩国象棋', ja:'チャンギ' },
    '정통 2인 한국 장기': { en:'Korean Chess 2P', es:'Ajedrez Coreano 2J', tr:'Kore Satrancı 2K', ru:'Корейские Шахматы 2И', zh:'2人韩国象棋', ja:'2人用韓国将棋' },
    '알까기': { en:'Alkkagi', es:'Alkkagi', tr:'Alkkagi', ru:'Алькаги', zh:'弹棋', ja:'アルカギ' },
    '실시간 물리 알까기 대결': { en:'Physics Flick Battle', es:'Duelo de Física', tr:'Fizik Kapışması', ru:'Физическая Битва', zh:'物理弹棋对决', ja:'物理アルカギ対決' },
    '쿼리도': { en:'Quoridor', es:'Quoridor', tr:'Quoridor', ru:'Квори́дор', zh:'围墙棋', ja:'クォリドー' },
    '미로 탈출 & 벽 세우기': { en:'Maze Escape & Walls', es:'Laberinto y Muros', tr:'Labirent & Duvar', ru:'Лабиринт и Стены', zh:'迷宫逃脱与建墙', ja:'迷路脱出＆壁建て' },
    '베스킨라빈스 31': { en:'Baskin 31', es:'Baskin 31', tr:'Baskin 31', ru:'31 (Игра)', zh:'31点游戏', ja:'バスキン31' },
    '1~3 숫자 심리전': { en:'1-3 Number Mind Game', es:'Juego Mental 1-3', tr:'1-3 Sayı Oyunu', ru:'Игра 1-3 Числа', zh:'1~3数字心理战', ja:'1~3心理戦' },
    '끝말잇기': { en:'Word Chain', es:'Cadena de Palabras', tr:'Kelime Zinciri', ru:'Цепочка Слов', zh:'接龙游戏', ja:'しりとり' },
    '15초 스피드 대결': { en:'15s Speed Battle', es:'Duelo de 15 Segundos', tr:'15sn Hız Savaşı', ru:'15-сек Битва', zh:'15秒速度对决', ja:'15秒スピード対決' },
    '사과게임': { en:'Apple Game', es:'Juego de Manzanas', tr:'Elma Oyunu', ru:'Игра в Яблоки', zh:'苹果游戏', ja:'りんごゲーム' },
    '60초 숫자 퍼즐': { en:'60s Number Puzzle', es:'Puzzle de 60s', tr:'60sn Sayı Bulmacası', ru:'60-сек Головоломка', zh:'60秒数字谜题', ja:'60秒数字パズル' },
    '타이핑': { en:'Typing', es:'Mecanografía', tr:'Yazma', ru:'Печатание', zh:'打字游戏', ja:'タイピング' },
    '타자연습 대결': { en:'Typing Battle', es:'Duelo de Mecanografía', tr:'Hızlı Yazma', ru:'Печатание', zh:'打字对决', ja:'タイピング対決' },
    '실시간 속타 배틀': { en:'Real-time Typing Duel', es:'Duelo de Velocidad', tr:'Hız Kapışması', ru:'Скоростной Набор', zh:'实时速打对决', ja:'リアルタイム打鍵バトル' },
    '캐치마인드': { en:'Catch Mind', es:'Adivina el Dibujo', tr:'Çizim Tahmin', ru:'Угадай Рисунок', zh:'你画我猜', ja:'キャッチマインド' },
    '실시간 그림 퀴즈 배틀': { en:'Draw & Guess Party', es:'Dibuja y Adivina', tr:'Çiz & Tahmin Et', ru:'Рисуй и Угадывай', zh:'你画我猜趣味赛', ja:'お絵かきクイズバトル' },
    '윷놀이': { en:'Yutnori', es:'Yutnori', tr:'Yutnori', ru:'Ютнори', zh:'跳棋游戏', ja:'ユンノリ' },
    '전통 윷놀이 말판 배틀': { en:'Traditional Korean Board Game', es:'Juego de Mesa Tradicional', tr:'Geleneksel Masa Oyunu', ru:'Корейская Настольная Игра', zh:'传统韩国棋盘对决', ja:'伝統韓国ボードゲーム' },
    '야추': { en:'Yacht Dice', es:'Yate (Dados)', tr:'Yat Zarı', ru:'Яхта (Кости)', zh:'快艇骰子', ja:'ヤッツー' },
    '야추 다이스': { en:'Yacht Dice', es:'Yate (Dados)', tr:'Yat Zarı', ru:'Яхта (Кости)', zh:'快艇骰子', ja:'ヤッツー' },
    '3D 주사위 족보 배틀': { en:'3D Dice High Score Duel', es:'Duelo de Dados 3D', tr:'3D Zar Oyunu', ru:'3D Кости Битва', zh:'3D骰子组合战', ja:'3Dサイコロ役バトル' },
    '지뢰찾기': { en:'Minesweeper', es:'Buscaminas', tr:'Mayın Tarlası', ru:'Сапёр', zh:'扫雷', ja:'マインスイーパー' },
    '실시간 멀티 배틀': { en:'Live Multiplayer Battle', es:'Batalla Multijugador en Vivo', tr:'Canlı Çok Oyunculu Savaş', ru:'Живая Мультиплеер Битва', zh:'实时多人对决', ja:'リアルタイムマルチバトル' },
    '2~8인': { en:'2-8 Players', es:'2-8 Jugadores', tr:'2-8 Oyuncu', ru:'2-8 Игроков', zh:'2~8人', ja:'2~8人' },

    // 설정 모달
    '화면': { en:'Display', es:'Pantalla', tr:'Ekran', ru:'Экран', zh:'显示', ja:'画面' },
    '음향': { en:'Sound', es:'Sonido', tr:'Ses', ru:'Звук', zh:'音效', ja:'音声' },
    '게임': { en:'Game', es:'Juego', tr:'Oyun', ru:'Игра', zh:'游戏', ja:'ゲーム' },
    '문의': { en:'Support', es:'Soporte', tr:'Destek', ru:'Поддержка', zh:'客服', ja:'サポート' },
    '정보': { en:'About', es:'Acerca de', tr:'Hakkında', ru:'О Программе', zh:'关于', ja:'情報' },
    '언어': { en:'Language', es:'Idioma', tr:'Dil', ru:'Язык', zh:'语言', ja:'言語' },
    '언어 선택': { en:'Language Selection', es:'Seleccionar Idioma', tr:'Dil Seçin', ru:'Выберите Язык', zh:'选择语言', ja:'言語を選択' },
    '앱 표시 언어를 선택하세요.': { en:'Choose your display language.', es:'Elija el idioma de visualización.', tr:'Görüntüleme dilinizi seçin.', ru:'Выберите язык интерфейса.', zh:'请选择界面显示语言。', ja:'表示言語を選択してください。' },
    '화면 테마': { en:'Theme', es:'Tema', tr:'Tema', ru:'Тема', zh:'主题', ja:'テーマ' },
    '라이트': { en:'Light', es:'Claro', tr:'Açık', ru:'Светлая', zh:'浅色', ja:'ライト' },
    '다크': { en:'Dark', es:'Oscuro', tr:'Koyu', ru:'Тёмная', zh:'深色', ja:'ダーク' },
    '시각 효과 & 애니메이션': { en:'Visual FX & Animations', es:'Efectos Visuales', tr:'Görsel Efektler', ru:'Визуальные Эффекты', zh:'视觉效果与动画', ja:'視覚エフェクト＆アニメ' },
    '화면 흔들림 효과': { en:'Screen Shake', es:'Efecto de Sacudida', tr:'Ekran Sarsıntısı', ru:'Тряска Экрана', zh:'屏幕震动效果', ja:'画面揺れエフェクト' },
    '글꼴 크기': { en:'Font Size', es:'Tamaño de Fuente', tr:'Yazı Boyutu', ru:'Размер Шрифта', zh:'字体大小', ja:'フォントサイズ' },
    '보통': { en:'Normal', es:'Normal', tr:'Normal', ru:'Обычный', zh:'正常', ja:'普通' },
    '크게': { en:'Large', es:'Grande', tr:'Büyük', ru:'Крупный', zh:'大', ja:'大きい' },
    '전체 사운드': { en:'Master Sound', es:'Sonido Principal', tr:'Ana Ses', ru:'Общий Звук', zh:'全部声音', ja:'全体サウンド' },
    '소리 켜짐': { en:'Sound On', es:'Sonido Activado', tr:'Ses Açık', ru:'Звук Вкл', zh:'声音开启', ja:'サウンドオン' },
    '소리 꺼짐': { en:'Sound Off', es:'Sonido Silenciado', tr:'Ses Kapalı', ru:'Звук Выкл', zh:'声音关闭', ja:'サウンドオフ' },
    '배경음악 (BGM)': { en:'Background Music', es:'Música de Fondo', tr:'Arka Plan Müziği', ru:'Фоновая Музыка', zh:'背景音乐 (BGM)', ja:'BGM' },
    '효과음 (SFX)': { en:'Sound Effects', es:'Efectos de Sonido', tr:'Ses Efektleri', ru:'Звуковые Эффекты', zh:'音效 (SFX)', ja:'効果音 (SFX)' },
    '사운드 테스트': { en:'Sound Test', es:'Prueba de Sonido', tr:'Ses Testi', ru:'Тест Звука', zh:'声音测试', ja:'サウンドテスト' },
    '대기실 자동 준비': { en:'Auto Ready in Room', es:'Preparación Automática', tr:'Otomatik Hazır', ru:'Авто Готовность', zh:'房间自动准备', ja:'自動レディ' },
    '초대 방해금지': { en:'Do Not Disturb', es:'No Molestar', tr:'Rahatsız Etme', ru:'Не Беспокоить', zh:'免打扰', ja:'招待拒否' },
    '이모지 표시': { en:'Show Emojis', es:'Mostrar Emojis', tr:'Emojileri Göster', ru:'Показывать Эмодзи', zh:'显示表情', ja:'絵文字表示' },
    '채팅 알림': { en:'Chat Notifications', es:'Notificaciones de Chat', tr:'Sohbet Bildirimleri', ru:'Уведомления Чата', zh:'聊天通知', ja:'チャット通知' },
    '버그 제보 및 건의사항': { en:'Bug Report & Feedback', es:'Reporte de Errores', tr:'Hata Bildirimi', ru:'Отчет об Ошибках', zh:'反馈与建议', ja:'不具合報告・ご意見' },
    '업데이트 내역': { en:'Changelog', es:'Historial de Cambios', tr:'Değişiklik Günlüğü', ru:'История Обновлений', zh:'更新日志', ja:'更新履歴' },
    '닫기': { en:'Close', es:'Cerrar', tr:'Kapat', ru:'Закрыть', zh:'关闭', ja:'閉じる' },

    // 로비 방 목록 & 만들기
    '방 목록': { en:'Rooms', es:'Salas', tr:'Odalar', ru:'Комнаты', zh:'房间列表', ja:'部屋一覧' },
    '방 만들기': { en:'Create Room', es:'Crear Sala', tr:'Oda Oluştur', ru:'Создать Комнату', zh:'创建房间', ja:'部屋を作成' },
    '방 참가': { en:'Join Room', es:'Entrar a Sala', tr:'Odaya Katıl', ru:'Войти в Комнату', zh:'加入房间', ja:'部屋に参加' },
    '전체': { en:'All', es:'Todos', tr:'Tümü', ru:'Все', zh:'全部', ja:'すべて' },
    '공개방': { en:'Public', es:'Pública', tr:'Açık', ru:'Открытые', zh:'公开', ja:'公開' },
    '비밀방': { en:'Private', es:'Privada', tr:'Gizli', ru:'Приватные', zh:'私密', ja:'非公開' },
    '모든 게임': { en:'All Games', es:'Todos los Juegos', tr:'Tüm Oyunlar', ru:'Все Игры', zh:'所有游戏', ja:'すべてのゲーム' },
    '목록 새로고침': { en:'Refresh List', es:'Actualizar', tr:'Yenile', ru:'Обновить', zh:'刷新列表', ja:'更新' },
    '접속자 새로고침': { en:'Refresh Players', es:'Actualizar', tr:'Yenile', ru:'Обновить', zh:'刷新玩家', ja:'更新' },
    '접속 중인 플레이어': { en:'Online Players', es:'Jugadores Conectados', tr:'Çevrimiçi Oyuncular', ru:'Игроки Онлайн', zh:'在线玩家', ja:'オンラインプレイヤー' },
    '현재 열려있는 공개방이 없습니다.': { en:'No rooms available right now.', es:'No hay salas disponibles.', tr:'Mevcut oda yok.', ru:'Нет доступных комнат.', zh:'暂无开放房间。', ja:'現在公開中の部屋はありません。' },
    '새로운 방을 직접 만들어 보세요!': { en:'Create a new room yourself!', es:'¡Crea una nueva sala!', tr:'Yeni bir oda oluşturun!', ru:'Создайте новую комнату!', zh:'自己创建一个新房间吧！', ja:'新しい部屋を作成してみましょう！' },
    '공개 설정': { en:'Visibility', es:'Visibilidad', tr:'Görünürlük', ru:'Доступность', zh:'公开设置', ja:'公開設定' },
    '비밀번호': { en:'Password', es:'Contraseña', tr:'Şifre', ru:'Пароль', zh:'密码', ja:'パスワード' },
    '최대 인원': { en:'Max Players', es:'Máx Jugadores', tr:'Maks Oyuncu', ru:'Макс Игроков', zh:'最大人数', ja:'最大人数' },
    '방 코드로 참가': { en:'Join with Code', es:'Unirse con Código', tr:'Kod ile Katıl', ru:'Войти по Коду', zh:'使用房间号加入', ja:'コードで参加' },
    '방 코드 4자리 입력': { en:'Enter 4-letter code', es:'Ingresa código de 4 letras', tr:'4 haneli kod girin', ru:'Введите 4-значный код', zh:'输入4位房间代码', ja:'4桁のコードを入力' },


    // 채팅 & 로비
    '전체 채팅': { en:'Global Chat', es:'Chat General', tr:'Genel Sohbet', ru:'Общий чат', zh:'全员聊天', ja:'全体チャット' },
    '로비 전체 채팅방입니다. 자유롭게 대화해보세요!': { en:'This is the lobby chat. Feel free to chat!', es:'Este es el chat del lobby. ¡Siente libre de chatear!', tr:'Bu lobi genel sohbet odasıdır. Özgürce sohbet edin!', ru:'Это общий чат лобби. Общайтесь свободно!', zh:'这是大厅公共聊天室。请自由交流！', ja:'ロビー全体チャットです。ご自由に会話をお楽しみください！' },
    '메시지 입력 (최대 80자)...': { en:'Enter message (max 80 chars)...', es:'Escribe un mensaje (máx. 80 car.)...', tr:'Mesaj girin (maks 80 karakter)...', ru:'Введите сообщение (макс. 80 симв.)...', zh:'输入消息（最多80字）...', ja:'メッセージを入力（最大80文字）...' },
    '친구 방에 참가하기': { en:'Join Friend Room', es:'Unirse a Sala de Amigo', tr:'Arkadaş Odasına Katıl', ru:'Войти в комнату друга', zh:'加入好友房间', ja:'フレンドの部屋に参加' },
    '공유받은 4자리 방 코드를 입력하여 입장하세요.': { en:'Enter the shared 4-digit room code to join.', es:'Ingresa el código de sala de 4 dígitos compartido para entrar.', tr:'Giriş yapmak için paylaşılan 4 haneli oda kodunu girin.', ru:'Введите полученный 4-значный код комнаты для входа.', zh:'请输入分享的4位房间代码以进入。', ja:'共有された4桁のルームコードを入力して入場してください。' },
    '입장하기': { en:'Enter', es:'Entrar', tr:'Giriş Yap', ru:'Войти', zh:'进入', ja:'入場する' },

    // 친구 관리
    '내 친구': { en:'My Friends', es:'Mis Amigos', tr:'Arkadaşlarım', ru:'Мои друзья', zh:'我的好友', ja:'フレンド' },
    '나에게 온 친구 신청': { en:'Incoming Friend Requests', es:'Solicitudes de amistad recibidas', tr:'Gelen Arkadaşlık İstekleri', ru:'Входящие запросы в друзья', zh:'收到感好友申请', ja:'届いたフレンド申請' },
    '새로운 친구 신청이 없습니다.': { en:'No new friend requests.', es:'No hay nuevas solicitudes de amistad.', tr:'Yeni arkadaşlık isteği yok.', ru:'Нет новых запросов в друзья.', zh:'没有新的好友申请。', ja:'新しいフレンド申請はありません。' },
    '친구 신청은 대기실이나 로비에서 다른 플레이어의 프로필을 클릭하여 전적창에서 보낼 수 있습니다.': { en:'Friend requests can be sent from the record window by clicking another player profile in the waiting room or lobby.', es:'Las solicitudes de amistad se pueden enviar desde la ventana de récords haciendo clic en el perfil de otro jugador en la sala de espera o lobby.', tr:'Arkadaşlık istekleri, bekleme odasında veya lobide başka bir oyuncunun profiline tıklayarak geçmiş penceresinden gönderilebilir.', ru:'Запросы в друзья можно отправить из окна статистики, нажав на профиль другого игрока в комнате ожидания или лобби.', zh:'可在等候室或大厅点击其他玩家的个人资料，在战绩窗口中发送好友申请。', ja:'フレンド申請は、待機室やロビーで他のプレイヤーのプロフィールをクリックし、戦績画面から送信できます。' },

    // 대기실 & 게임 선택
    '명': { en:'Players', es:'Jugadores', tr:'Oyuncu', ru:'игроков', zh:'人', ja:'人' },
    '참가자 대기 중...': { en:'Waiting for players...', es:'Esperando jugadores...', tr:'Oyuncu bekleniyor...', ru:'Ожидание игроков...', zh:'等待玩家加入...', ja:'参加者を待っています...' },
    '실시간 채팅': { en:'Live Chat', es:'Chat en vivo', tr:'Canlı Sohbet', ru:'Чат в реальном времени', zh:'实时聊天', ja:'リアルタイムチャット' },
    '방 채팅에 입장했습니다. 매너 있는 대화를 나눠보세요!': { en:'Entered room chat. Please maintain polite conversation!', es:'Has entrado al chat de la sala. ¡Mantén una conversación respetuosa!', tr:'Oda sohbetine girildi. Lütfen kibar bir şekilde sohbet edin!', ru:'Вы вошли в чат комнаты. Соблюдайте вежливость в общении!', zh:'已进入房间聊天。请礼貌交流！', ja:'ルームチャットに入場しました。マナーを守って会話を楽しみましょう！' },
    '메시지를 입력하세요...': { en:'Enter a message...', es:'Escribe un mensaje...', tr:'Bir mesaj girin...', ru:'Введите сообщение...', zh:'请输入消息...', ja:'メッセージを入力してください...' },
    '드래그하여 선택한 사과 속 숫자들의 합이 정확히 10이 되면 사과가 제거됩니다. 60초 동안 더 많은 사과를 없애 높은 점수를 기록하세요!': { en:'Drag to select apples so that the sum of their numbers equals exactly 10 to clear them. Clear as many apples as possible in 60 seconds to set a high score!', es:'Arrastra para seleccionar manzanas cuya suma de números sea exactamente 10 para eliminarlas. ¡Elimina tantas manzanas como puedas en 60 segundos para obtener una puntuación alta!', tr:'Sürükleyerek seçtiğiniz elmalardaki sayıların toplamı tam 10 olduğunda elmalar temizlenir. 60 saniye içinde daha fazla elma temizleyerek yüksek skor yapın!', ru:'Перетащите, чтобы выбрать яблоки, сумма чисел на которых равна ровно 10, чтобы удалить их. Удалите как можно больше яблок за 60 секунд, чтобы набрать рекордные очки!', zh:'拖动选择苹果，使其中数字之和正好为10即可消除苹果。在60秒内消除更多苹果,刷新最高分吧！', ja:'ドラッグして選択したリンゴの中の数字の合計がちょうど10になるとリンゴが消えます。60秒間により多くのリンゴを消して高得点を狙いましょう！' },
    '실시간 물리 알까기 배틀': { en:'Real-time physics Alkkagi battle', es:'Batalla de Alkkagi con física en tiempo real', tr:'Gerçek zamanlı fiziksel Alkkagi savaşı', ru:'Битва Альккаги с реальной физикой', zh:'实时物理弹珠对战', ja:'リアルタイム物理アルカギバトル' },
    '9×9 미로 벽 세우기': { en:'9x9 Maze Wall Building', es:'Construcción de muros en laberinto 9x9', tr:'9x9 Duvar Örme Labirenti', ru:'Строительство стен в лабиринте 9x9', zh:'9x9迷宫建墙', ja:'9×9迷路の壁立て' },
    '15초 한국어 어휘력': { en:'15-second Korean Vocabulary', es:'Vocabulario coreano en 15 segundos', tr:'15 Saniyelik Korece Kelime Bilgisi', ru:'Корейский словарный запас за 15 секунд', zh:'15秒韩语词汇测试', ja:'15秒韓国語語彙力' },
    '합 10 숫자 퍼즐': { en:'Sum of 10 Number Puzzle', es:'Rompecabezas de suma 10', tr:'Toplamı 10 Sayı Bulmacası', ru:'Головоломка "Сумма 10"', zh:'和为10数字拼图', ja:'合計10数字パズル' },
    '실시간 문장 속타전': { en:'Real-time Speed Typing Battle', es:'Batalla de mecanografía rápida en tiempo real', tr:'Gerçek zamanlı hızlı yazma savaşı', ru:'Скоростная печать предложений в реальном времени', zh:'实时句子打字速速战', ja:'リアルタイム文章タイピング対戦' },
    '게임 시작': { en:'Start Game', es:'Iniciar Juego', tr:'Oyunu Başlat', ru:'Начать Игру', zh:'开始游戏', ja:'ゲーム開始' },
    '개발자 모드: 1인 테스트 시작 가능': { en:'Developer Mode: Single-player testing available', es:'Modo desarrollador: Prueba individual disponible', tr:'Geliştirici Modu: Tek kişilik test başlatılabilir', ru:'Режим разработчика: Доступно одиночное тестирование', zh:'开发者模式：可开启单人测试', ja:'開発者モード：1人テスト開始可能' },
    'Tip - 상점에서 프로필 카드와 닉네임 염색약을 구매해 나만의 개성을 뽐내보세요!': { en:'Tip - Purchase profile cards and nickname dyes in the shop to show off your style!', es:'Consejo: ¡Compra tarjetas de perfil y tintes de apodo en la tienda para presumir tu estilo!', tr:'İpucu - Mağazadan profil kartı ve takma ad boyası satın alarak tarzınızı sergileyin!', ru:'Совет — покупайте карточки профиля и красители для никнейма в магазине, чтобы проявить свою индивидуальность!', zh:'Tip - 在商店购买个人资料卡和昵称染色剂，展示你的专属个性吧！', ja:'Tip - ショップでプロフィールカードやニックネームの染色薬を購入して、自分だけの個性をアピールしましょう！' },

    // 인게임
    '참가자': { en:'Participants', es:'Participantes', tr:'Katılımcılar', ru:'Участники', zh:'参赛者', ja:'参加者' },
    '상대방 차례 (흑)': { en:'Opponent Turn (Black)', es:'Turno del oponente (Negro)', tr:'Rakibin Sırası (Siyah)', ru:'Ход соперника (Черные)', zh:'对方回合（黑）', ja:'相手の番（黒）' },
    '인게임 채팅': { en:'In-Game Chat', es:'Chat del Juego', tr:'Oyun İçi Sohbet', ru:'Внутриигровой чат', zh:'局内聊天', ja:'インゲームチャット' },
    '게임 중 실시간 응원과 대화를 나눠보세요!': { en:'Cheer each other on and chat in real-time during the game!', es:'¡Anímense y chateen en tiempo real durante el juego!', tr:'Oyun sırasında gerçek zamanlı olarak tezahürat yapın ve sohbet edin!', ru:'Общайтесь и поддерживайте друг друга в реальном времени во время игры!', zh:'游戏过程中请实时加油互动并愉快聊天！', ja:'ゲーム中にリアルタイムで応援や会話を楽しんでみましょう！' },
    '메시지 입력...': { en:'Enter message...', es:'Ingresa mensaje...', tr:'Mesaj girin...', ru:'Введите сообщение...', zh:'输入消息...', ja:'メッセージを入力...' },
    '1번 (흑 차례)': { en:'P1 (Black Turn)', es:'P1 (Turno de Negro)', tr:'1 (Siyahın Sırası)', ru:'Игрок 1 (Ход черных)', zh:'1号 (黑方回合)', ja:'1番 (黒の番)' },
    '2번 (백)': { en:'P2 (White)', es:'P2 (Blanco)', tr:'2 (Beyaz)', ru:'Игрок 2 (Белые)', zh:'2号 (白)', ja:'2番 (白)' },
    '[흑 선공]': { en:'[Black First]', es:'[Negro Primero]', tr:'[Siyah İlk Hamle]', ru:'[Черные - Первые]', zh:'[黑先]', ja:'[黒 先攻]' },
    '[백 후공]': { en:'[White Second]', es:'[Blanco Segundo]', tr:'[Beyaz İkinci Hamle]', ru:'[Белые - Вторые]', zh:'[白后]', ja:'[白 後攻]' },
    // 상점
    '상점': { en:'Shop', es:'Tienda', tr:'Dükkan', ru:'Магазин', zh:'商店', ja:'ショップ' },
    '닉네임': { en:'Nickname', es:'Apodo', tr:'Takma Ad', ru:'Никнейм', zh:'昵称', ja:'ニックネーム' },
    '프로필 카드': { en:'Profile Cards', es:'Tarjetas de Perfil', tr:'Profil Kartları', ru:'Карточки', zh:'个人卡片', ja:'プロフィールカード' },
    '말풍선': { en:'Chat Bubbles', es:'Burbujas de Chat', tr:'Sohbet Balonları', ru:'Пузыри Чата', zh:'聊天气泡', ja:'吹き出し' },
    '테두리': { en:'Avatar Frames', es:'Marcos de Avatar', tr:'Çerçeveler', ru:'Рамки', zh:'头像框', ja:'フレーム' },
    '세레머니': { en:'Victory FX', es:'Efectos de Victoria', tr:'Zafer Efektleri', ru:'Эффекты Победы', zh:'胜利特效', ja:'セレモニー' },
    '구매': { en:'Buy', es:'Comprar', tr:'Satın Al', ru:'Купить', zh:'购买', ja:'購入' },
    '장착': { en:'Equip', es:'Equipar', tr:'Kuşan', ru:'Надеть', zh:'装备', ja:'装着' },
    '장착 중': { en:'Equipped', es:'Equipado', tr:'Kuşanıldı', ru:'Надето', zh:'已装备', ja:'装着中' },
    '방 목록으로 돌아가기': { en:'Back to Rooms', es:'Volver a Salas', tr:'Odalara Dön', ru:'Назад к комнатам', zh:'返回房间列表', ja:'部屋一覧に戻る' },

    // 프로필 & 계정 모달
    '프로필 편집': { en:'Edit Profile', es:'Editar Perfil', tr:'Profili Düzenle', ru:'Изменить Профиль', zh:'编辑个人资料', ja:'プロフィール編集' },
    '게스트 모드': { en:'Guest Mode', es:'Modo Invitado', tr:'Misafir Modu', ru:'Гостевой Режим', zh:'访客模式', ja:'ゲストモード' },
    '클라우드 로그인': { en:'Cloud Login', es:'Iniciar Sesión', tr:'Giriş Yap', ru:'Войти в Облако', zh:'云端登录', ja:'クラウドログイン' },
    '동물 아이콘': { en:'Avatar Icon', es:'Icono de Avatar', tr:'Profil İkonu', ru:'Иконка', zh:'动物图标', ja:'動物アイコン' },
    '배경 색상': { en:'Background Color', es:'Color de Fondo', tr:'Arka Plan Rengi', ru:'Цвет Фона', zh:'背景颜色', ja:'背景色' },
    'INU 아케이드 로그인': { en:'INU Arcade Login', es:'Inicio de Sesión', tr:'INU Arcade Giriş', ru:'Вход в INU Arcade', zh:'INU街机登录', ja:'INUアーケードログイン' },
    'Google 계정으로 계속': { en:'Continue with Google', es:'Continuar con Google', tr:'Google ile Devam Et', ru:'Продолжить с Google', zh:'使用Google继续', ja:'Googleでログイン' },

    // 전적 모달
    '게임별 상세 전적': { en:'Detailed Game Stats', es:'Estadísticas por Juego', tr:'Oyun İstatistikleri', ru:'Статистика по Играм', zh:'按游戏统计', ja:'ゲーム別戦績' },
    '총 판수': { en:'Total Plays', es:'Partidas Totales', tr:'Toplam Oyun', ru:'Всего Игр', zh:'总局数', ja:'総試合数' },
    '승리': { en:'Wins', es:'Victorias', tr:'Galibiyet', ru:'Победы', zh:'胜利', ja:'勝利' },
    '패배': { en:'Losses', es:'Derrotas', tr:'Mağlubiyet', ru:'Поражения', zh:'失败', ja:'敗北' },
    '무승부': { en:'Draws', es:'Empates', tr:'Beraberlik', ru:'Ничьи', zh:'平局', ja:'引き分け' },
    '승률': { en:'Win Rate', es:'Tasa de Victorias', tr:'Kazanma Oranı', ru:'Винрейт', zh:'胜率', ja:'勝率' },
    '친구 신청': { en:'Add Friend', es:'Agregar Amigo', tr:'Arkadaş Ekle', ru:'В Друзья', zh:'添加好友', ja:'フレンド申請' },

    // 친구 관리 모달
    '친구 관리': { en:'Friends Management', es:'Gestión de Amigos', tr:'Arkadaş Yönetimi', ru:'Управление Друзьями', zh:'好友管理', ja:'フレンド管理' },
    '내 친구': { en:'My Friends', es:'Mis Amigos', tr:'Arkadaşlarım', ru:'Мои Друзья', zh:'我的好友', ja:'マイフレンド' },
    '받은 신청': { en:'Requests', es:'Solicitudes', tr:'İstekler', ru:'Заявки', zh:'收到的申请', ja:'届いた申請' },
    '친구 닉네임 검색...': { en:'Search nickname...', es:'Buscar apodo...', tr:'Takma ad ara...', ru:'Поиск по никнейму...', zh:'搜索好友昵称...', ja:'フレンド検索...' },
    '검색어 지우기': { en:'Clear', es:'Limpiar', tr:'Temizle', ru:'Очистить', zh:'清空', ja:'クリア' },

    // 방 내부 (Screen Room)
    '로비로 나가기': { en:'Exit to Lobby', es:'Salir al Lobby', tr:'Lobiye Dön', ru:'В Лобби', zh:'返回大厅', ja:'ロビーに戻る' },
    '방 코드 복사': { en:'Copy Code', es:'Copiar Código', tr:'Kodu Kopyala', ru:'Скопировать Код', zh:'复制房间号', ja:'コードをコピー' },
    '클릭하여 방 코드 복사': { en:'Click to copy room code', es:'Haz clic para copiar código', tr:'Kopyalamak için tıkla', ru:'Нажмите, чтобы скопировать', zh:'点击复制房间号', ja:'クリックしてコピー' },
    '친구 초대하기': { en:'Invite Friends', es:'Invitar Amigos', tr:'Arkadaş Davet Et', ru:'Пригласить Друзей', zh:'邀请好友', ja:'フレンドを招待' },
    '참가자 목록': { en:'Players List', es:'Lista de Jugadores', tr:'Oyuncu Listesi', ru:'Список Игроков', zh:'玩家列表', ja:'参加者一覧' },
    '게임 선택': { en:'Select Game', es:'Elegir Juego', tr:'Oyun Seç', ru:'Выбор Игры', zh:'选择游戏', ja:'ゲーム選択' },
    '방장만 변경 가능': { en:'Host only', es:'Solo Anfitrión', tr:'Sadece Kurucu', ru:'Только Хост', zh:'仅房主可更改', ja:'ホストのみ変更可能' },
    '진영:': { en:'Side:', es:'Bando:', tr:'Taraf:', ru:'Сторона:', zh:'阵营:', ja:'陣営:' },
    '셔플': { en:'Shuffle', es:'Aleatorio', tr:'Karıştır', ru:'Случайно', zh:'随机', ja:'シャッフル' },
    '방장 흑': { en:'Host Black', es:'Anfitrión Negras', tr:'Kurucu Siyah', ru:'Хост Чёрные', zh:'房主执黑', ja:'ホスト先手(黒)' },
    '방장 백': { en:'Host White', es:'Anfitrión Blancas', tr:'Kurucu Beyaz', ru:'Хост Белые', zh:'房主执白', ja:'ホスト後手(白)' },
    '라운드:': { en:'Rounds:', es:'Rondas:', tr:'Raund:', ru:'Раунды:', zh:'局数:', ja:'ラウンド:' },

    // 일반 액션 & 팝업
    '취소': { en:'Cancel', es:'Cancelar', tr:'İptal', ru:'Отмена', zh:'取消', ja:'キャンセル' },
    '저장': { en:'Save', es:'Guardar', tr:'Kaydet', ru:'Сохранить', zh:'保存', ja:'保存' },
    '확인': { en:'Confirm', es:'Confirmar', tr:'Onayla', ru:'ОК', zh:'确定', ja:'確認' },
    '수락': { en:'Accept', es:'Aceptar', tr:'Kabul Et', ru:'Принять', zh:'接受', ja:'承認' },
    '거절': { en:'Decline', es:'Rechazar', tr:'Reddet', ru:'Отклонить', zh:'拒绝', ja:'拒否' },
    '입장': { en:'Join', es:'Entrar', tr:'Giriş', ru:'Войти', zh:'进入', ja:'入場' },
    '강퇴하기': { en:'Kick', es:'Expulsar', tr:'At', ru:'Выгнать', zh:'踢出', ja:'追放' },
    '방장 위임': { en:'Pass Host', es:'Ceder Anfitrión', tr:'Devret', ru:'Передать хоста', zh:'移交房主', ja:'ホスト委任' },
    '전적 보기': { en:'View Stats', es:'Ver Récord', tr:'İstatistikler', ru:'Статистика', zh:'查看战绩', ja:'戦績を見る' },
    '연결 중...': { en:'Connecting...', es:'Conectando...', tr:'Bağlanıyor...', ru:'Подключение...', zh:'连接中...', ja:'接続中...' },
    '연결 취소': { en:'Cancel Connection', es:'Cancelar Conexión', tr:'İptal Et', ru:'Отменить', zh:'取消连接', ja:'接続キャンセル' },
    '잠시 후 게임이 시작됩니다!': { en:'Game starting soon!', es:'¡El juego comenzará pronto!', tr:'Oyun birazdan başlıyor!', ru:'Игра скоро начнется!', zh:'游戏即将开始！', ja:'まもなくゲームが始まります！' },
    '골인!': { en:'Goal!', es:'¡Meta!', tr:'Gol!', ru:'Финиш!', zh:'到达终点！', ja:'ゴール！' },
    '윷 던지기': { en:'Cast Sticks', es:'Lanzar Varillas', tr:'Zar At', ru:'Бросить Палочки', zh:'掷木', ja:'ユッを投げる' },
    '처리 중...': { en:'Processing...', es:'Procesando...', tr:'İşleniyor...', ru:'Обработка...', zh:'处理中...', ja:'処理中...' },
    '방을 생성하고 있습니다...': { en:'Creating room...', es:'Creando sala...', tr:'Oda oluşturuluyor...', ru:'Создание комнаты...', zh:'创建房间中...', ja:'部屋を作成中...' },
    '방에 참가하고 있습니다...': { en:'Joining room...', es:'Uniéndose a la sala...', tr:'Odaya katılınıyor...', ru:'Вход в комнату...', zh:'加入房间中...', ja:'部屋に参加中...' },
    '게임을 불러오는 중...': { en:'Loading game...', es:'Cargando juego...', tr:'Oyun yükleniyor...', ru:'Загрузка игры...', zh:'游戏加载中...', ja:'ゲームを読み込み中...' },
    '저장 중...': { en:'Saving...', es:'Guardando...', tr:'Kaydediliyor...', ru:'Сохранение...', zh:'保存中...', ja:'保存中...' },
    '방 접속이 취소되었습니다.': { en:'Connection cancelled.', es:'Conexión cancelada.', tr:'Bağlantı iptal edildi.', ru:'Подключение отменено.', zh:'连接已取消。', ja:'接続がキャンセルされました。' },
    '방이 가득 찼습니다.': { en:'Room is full.', es:'La sala está llena.', tr:'Oda dolu.', ru:'Комната заполнена.', zh:'房间已满。', ja:'部屋が満員です。' },
    '비밀번호가 일치하지 않습니다.': { en:'Wrong password.', es:'Contraseña incorrecta.', tr:'Yanlış şifre.', ru:'Неверный пароль.', zh:'密码不正确。', ja:'パスワードが違います。' },
    '비밀번호를 입력해 주세요.': { en:'Please enter password.', es:'Ingresa la contraseña.', tr:'Şifreyi girin.', ru:'Введите пароль.', zh:'请输入密码。', ja:'パスワードを入力してください。' },
    '방 코드가 복사되었습니다.': { en:'Room code copied!', es:'¡Código copiado!', tr:'Oda kodu kopyalandı!', ru:'Код скопирован!', zh:'房间号已复制！', ja:'コードをコピーしました！' },
    '방장만 게임을 시작할 수 있습니다.': { en:'Only the host can start.', es:'Solo anfitrión inicia.', tr:'Yalnızca kurucu başlatabilir.', ru:'Только хост может начать.', zh:'只有房主能开始游戏。', ja:'ホストのみ開始できます。' },
    '방장만 라운드 수를 변경할 수 있습니다.': { en:'Only host can change rounds.', es:'Solo anfitrión cambia rondas.', tr:'Yalnızca kurucu tur değiştirebilir.', ru:'Только хост меняет раунды.', zh:'只有房主能更改局数。', ja:'ホストのみラウンド変更可。' },
    '방장만 진영을 변경할 수 있습니다.': { en:'Only host can change sides.', es:'Solo anfitrión cambia lados.', tr:'Yalnızca kurucu taraf değiştirebilir.', ru:'Только хост меняет стороны.', zh:'只有房主能切换阵营。', ja:'ホストのみ陣営変更可。' },
    '방장만 게임을 선택할 수 있습니다.': { en:'Only host can select game.', es:'Solo anfitrión elige juego.', tr:'Yalnızca kurucu oyun seçebilir.', ru:'Только хост выбирает игру.', zh:'只有房主能选择游戏。', ja:'ホストのみゲーム選択可。' },
    '참가자가 3명 이상이 되어 오목 대신 베스킨라빈스 31로 변경되었습니다.': { en:'3+ players: switched to Baskin 31.', es:'3+ jugadores: cambiado a Baskin 31.', tr:'3+ oyuncu: Baskin 31 seçildi.', ru:'3+ игроков: переключено на Баскин 31.', zh:'3人以上：已变更为31点。', ja:'3人以上：バスキン31に変更されました。' },
    '준비 완료!': { en:'Ready!', es:'¡Listo!', tr:'Hazır!', ru:'Готов!', zh:'准备好了！', ja:'準備完了！' },
    '준비를 취소했습니다.': { en:'Cancelled ready.', es:'Preparación cancelada.', tr:'Hazırlık iptal edildi.', ru:'Готовность отменена.', zh:'已取消准备。', ja:'準備를キャンセルしました。' },
    '친구 신청을 보냈습니다.': { en:'Friend request sent.', es:'Solicitud enviada.', tr:'İstek gönderildi.', ru:'Запрос отправлен.', zh:'已发送好友申请。', ja:'フレンド申請を送りました。' },
    '이미 친구입니다.': { en:'Already friends.', es:'Ya son amigos.', tr:'Zaten arkadaşsınız.', ru:'Уже в друзьях.', zh:'已经是好友了。', ja:'すでにフレンドです。' },
    '코인이 부족합니다.': { en:'Not enough coins.', es:'Monedas insuficientes.', tr:'Yetersiz altın.', ru:'Недостаточно монет.', zh:'金币不足。', ja:'コインが足りません。' },
    '구매가 완료되었습니다!': { en:'Purchase complete!', es:'¡Compra completada!', tr:'Satın alma tamamlandı!', ru:'Покупка завершена!', zh:'购买成功！', ja:'購入完了！' },
    '저장되었습니다.': { en:'Saved.', es:'Guardado.', tr:'Kaydedildi.', ru:'Сохранено.', zh:'已保存。', ja:'保存しました。' },
    '닉네임이 변경되었습니다.': { en:'Nickname changed.', es:'Apodo cambiado.', tr:'Takma ad değiştirildi.', ru:'Никнейм изменён.', zh:'昵称已更改。', ja:'ニックネームを変更しました。' },
    '배경음악이 음소거되었습니다.': { en:'BGM muted.', es:'Música silenciada.', tr:'Müzik kapatıldı.', ru:'Музыка выключена.', zh:'背景音乐已静音。', ja:'BGMをミュートしました。' },
    '배경음악이 켜졌습니다.': { en:'BGM on.', es:'Música activada.', tr:'Müzik açıldı.', ru:'Музыка включена.', zh:'背景音乐已开启。', ja:'BGMをオンにしました。' },
    '효과음이 음소거되었습니다.': { en:'SFX muted.', es:'Efectos silenciados.', tr:'Efektler kapatıldı.', ru:'Звуки выключены.', zh:'音效已静音。', ja:'効果音をミュートしました。' },
    '효과음이 켜졌습니다.': { en:'SFX on.', es:'Efectos activados.', tr:'Efektler açıldı.', ru:'Звуки включены.', zh:'音效已开启。', ja:'効果音をオンにしました。' },
    '소리 켜기': { en:'Enable Sound', es:'Activar Sonido', tr:'Sesi Aç', ru:'Включить Звук', zh:'开启声音', ja:'サウンドオン' },
    '전체 끄기': { en:'Mute All', es:'Silenciar Todo', tr:'Hepsini Kapat', ru:'Отключить Всё', zh:'全部关闭', ja:'すべてオフ' },
    '소리 꺼짐 (음소거)': { en:'Muted', es:'Silenciado', tr:'Sessiz', ru:'Отключён', zh:'已静音', ja:'ミュート中' },
    '소리 켜짐': { en:'Sound On', es:'Sonido Activado', tr:'Ses Açık', ru:'Звук Вкл', zh:'声音开启', ja:'サウンドオン' },
    '소리 설정': { en:'Sound Settings', es:'Config. de Sonido', tr:'Ses Ayarları', ru:'Настройки Звука', zh:'声音设置', ja:'サウンド設定' },
    '[관전 모드] 진행 중인 게임의 실시간 관전을 시작합니다.': { en:'[Spectate] Watching live game.', es:'[Espectador] Viendo en vivo.', tr:'[İzleme] Canlı izleniyor.', ru:'[Зритель] Наблюдение за игрой.', zh:'[观战] 开始实时观战。', ja:'[観戦] 進行中のゲームを観戦します。' },
    '상대방이 나가서 승리!': { en:'Opponent left - You win!', es:'¡El rival se fue - Ganas!', tr:'Rakip ayrıldı - Kazandınız!', ru:'Соперник вышел - Победа!', zh:'对手退出 - 胜利！', ja:'相手が退出 - 勝利！' },
    '골드': { en:'Gold', es:'Oro', tr:'Altın', ru:'Золото', zh:'金色', ja:'ゴールド' },
    '핑크': { en:'Pink', es:'Rosa', tr:'Pembe', ru:'Розовый', zh:'粉色', ja:'ピンク' },
    '하늘색': { en:'Sky Blue', es:'Azul Cielo', tr:'Gök Mavisi', ru:'Голубой', zh:'天蓝色', ja:'スカイブルー' },
    '초록': { en:'Green', es:'Verde', tr:'Yeşil', ru:'Зелёный', zh:'绿色', ja:'グリーン' },
    '보라': { en:'Purple', es:'Morado', tr:'Mor', ru:'Фиолетовый', zh:'紫色', ja:'パープル' },
    '빨강': { en:'Red', es:'Rojo', tr:'Kırmızı', ru:'Красный', zh:'红色', ja:'レッド' },
    '청록': { en:'Cyan', es:'Cian', tr:'Camgöbeği', ru:'Голубовато-зелёный', zh:'青色', ja:'シアン' },
    '로즈': { en:'Rose', es:'Rosa Fuerte', tr:'Gül Rengi', ru:'Розовый', zh:'玫瑰色', ja:'ローズ' },
    '실버': { en:'Silver', es:'Plata', tr:'Gümüş', ru:'Серебряный', zh:'银色', ja:'シルバー' },
    '무지개': { en:'Rainbow', es:'Arcoíris', tr:'Gökkuşağı', ru:'Радуга', zh:'彩虹', ja:'レインボー' },
    '기본': { en:'Default', es:'Por defecto', tr:'Varsayılan', ru:'По умолчанию', zh:'默认', ja:'デフォルト' },
    '선셋': { en:'Sunset', es:'Atardecer', tr:'Gün Batımı', ru:'Закат', zh:'日落', ja:'サンセット' },
    '오션': { en:'Ocean', es:'Océano', tr:'Okyanus', ru:'Океан', zh:'海洋', ja:'オーシャン' },
    '민트': { en:'Mint', es:'Menta', tr:'Nane', ru:'Мятный', zh:'薄荷', ja:'ミント' },
    '퍼플': { en:'Purple', es:'Púrpura', tr:'Mor', ru:'Пурпурный', zh:'紫色', ja:'パープル' },
    '카본': { en:'Carbon', es:'Carbono', tr:'Karbon', ru:'Карбон', zh:'碳黑', ja:'カーボン' },
    '은하수': { en:'Galaxy', es:'Galaxia', tr:'Galaksi', ru:'Галактика', zh:'银河', ja:'ギャラクシー' },
    '프리즘': { en:'Prism', es:'Prisma', tr:'Prizma', ru:'Призма', zh:'棱镜', ja:'プリズム' },
    '오로라': { en:'Aurora', es:'Aurora', tr:'Aurora', ru:'Аврора', zh:'极光', ja:'オーロラ' },
    '스페이스': { en:'Space', es:'Espacio', tr:'Uzay', ru:'Космос', zh:'宇宙', ja:'スペース' },
    '게임 결과': { en:'Game Result', es:'Resultado', tr:'Oyun Sonucu', ru:'Итог Игры', zh:'游戏结果', ja:'ゲーム結果' },
    '대기실로 돌아가기': { en:'Back to Lobby', es:'Volver al Lobby', tr:'Lobiye Dön', ru:'В Лобби', zh:'返回大厅', ja:'ロビーに戻る' },
    '다시 하기': { en:'Rematch', es:'Revancha', tr:'Tekrar Oyna', ru:'Реванш', zh:'再来一局', ja:'もう一度' },
    '실시간 관전 중': { en:'Spectating live', es:'Viendo en vivo', tr:'Canlı izleniyor', ru:'Наблюдение', zh:'实时观战', ja:'リアルタイム観戦中' },
    '출제자': { en:'Drawer', es:'Dibujante', tr:'Çizen', ru:'Рисующий', zh:'出题者', ja:'出題者' },
    '맞히는 중': { en:'Guessing', es:'Adivinando', tr:'Tahmin ediyor', ru:'Угадывает', zh:'猜题中', ja:'回答中' },
    '기본순': { en:'Default', es:'Predeterminado', tr:'Varsayılan', ru:'По умолчанию', zh:'默认排序', ja:'デフォルト順' },
    '승률순': { en:'By Win Rate', es:'Por Tasa de Victoria', tr:'Kazanma Oranına Göre', ru:'По Винрейту', zh:'按胜率排序', ja:'勝率順' },
    '/ 500자': { en:'/ 500 chars', es:'/ 500 car.', tr:'/ 500 karakter', ru:'/ 500 симв.', zh:'/ 500字', ja:'/ 500文字' },
    'Tip - 로그인을 하면 전적과 레벨 등의 정보를 안전하게 저장할 수 있어요.': { en:'Tip - Log in to safely save your records and level.', es:'Tip - Inicia sesión para guardar tu historial y nivel.', tr:'Tip - Sicil ve seviyenizi güvenle kaydetmek için giriş yapın.', ru:'Tip - Войдите, чтобы сохранить статистику и уровень.', zh:'Tip - 登录后可安全保存战绩和等级。', ja:'Tip - ログインすると戦績やレベルを安全に保存できます。' },
    'Tip - 승리 시 지급되는 코인으로 상점에서 멋진 아이템을 살 수 있어요.': { en:'Tip - Use coins from winning to buy items in the shop.', es:'Tip - Usa monedas de victoria para comprar en la tienda.', tr:'Tip - Kazandığınız altınlarla mağazadan eşya alın.', ru:'Tip - Тратьте монеты за победу в магазине.', zh:'Tip - 用胜利获得的金币在商店购买道具。', ja:'Tip - 勝利コインでショップのアイテムを買えます。' },
    'Tip - 상점에서 프로필 카드와 닉네임 염색약을 구매해 나만의 개성을 뽐내보세요!': { en:'Tip - Buy profile cards and nickname dyes to show your style!', es:'Tip - ¡Compra tarjetas y tintes para mostrar tu estilo!', tr:'Tip - Tarzınızı göstermek için kart ve boya satın alın!', ru:'Tip - Купите карточки и красители, чтобы выделиться!', zh:'Tip - 购买资料卡和染色剂展示个性！', ja:'Tip - プロフィールカードや染色薬で個性を表現しましょう！' },
    'Tip - 채팅창에 다양한 감정표현 이모지를 사용해 플레이어들과 소통해 보세요.': { en:'Tip - Use emoji in chat to communicate with players.', es:'Tip - Usa emojis en el chat para comunicarte.', tr:'Tip - Oyuncularla iletişim için emojileri kullanın.', ru:'Tip - Используйте эмодзи в чате для общения.', zh:'Tip - 在聊天中使用表情与玩家互动。', ja:'Tip - チャットで絵文字を使って交流しましょう。' },
    'Tip - 상단 방 코드를 클릭하면 클립보드에 바로 복사되어 친구를 쉽게 초대할 수 있어요.': { en:'Tip - Click the room code to copy and invite friends.', es:'Tip - Haz clic en el código para copiar e invitar amigos.', tr:'Tip - Kodu kopyalayıp arkadaşlarınızı davet edin.', ru:'Tip - Нажмите на код комнаты, чтобы скопировать.', zh:'Tip - 点击房间号即可复制并邀请好友。', ja:'Tip - ルームコードをクリックして友達を招待できます。' },
    'Tip - 오목과 체스는 방장이 진영(흑/백/셔플)을 자유롭게 설정할 수 있어요.': { en:'Tip - In Gomoku and Chess, host sets sides freely.', es:'Tip - En Gomoku y Ajedrez, el anfitrión elige lados.', tr:'Tip - Gomoku ve Satrançta kurucu tarafları ayarlar.', ru:'Tip - В Гомоку и Шахматах хост выбирает стороны.', zh:'Tip - 五子棋和国象中房主可自由设置阵营。', ja:'Tip - 五目並べとチェスではホストが陣営を設定できます。' },
    'Tip - 끝말잇기와 캐치마인드는 방장이 게임 라운드 수를 1~20라운드까지 조절할 수 있어요.': { en:'Tip - Word Chain and Catch Mind host sets 1-20 rounds.', es:'Tip - En Cadena y Adivina el Dibujo, ajusta 1-20 rondas.', tr:'Tip - Kelime Zinciri ve Çizimde 1-20 tur ayarlayın.', ru:'Tip - В Цепочке Слов и Рисунке хост задаёт 1–20 раундов.', zh:'Tip - 接龙和你画我猜中房主可设1~20回合。', ja:'Tip - しりとりとキャッチマインドは1〜20ラウンド設定可能。' },
    'Tip - 대기실과 인게임 좌측 패널에서 플레이어를 클릭하면 프로필과 전적 통계를 볼 수 있어요.': { en:'Tip - Click a player to view profile and stats.', es:'Tip - Haz clic en un jugador para ver su perfil.', tr:'Tip - Oyuncuya tıklayarak profilini görün.', ru:'Tip - Нажмите на игрока для просмотра статистики.', zh:'Tip - 点击玩家可查看资料和战绩。', ja:'Tip - プレイヤーをクリックするとプロフィールを見られます。' },
    'Tip - 프로필 카드를 장착하면 대기실, 인게임, 접속자 목록에 멋진 테마가 표시돼요.': { en:'Tip - Equip a profile card for a stylish theme.', es:'Tip - Equipa una tarjeta para un tema genial.', tr:'Tip - Profil kartı takarak şık bir tema gösterin.', ru:'Tip - Карточка профиля даёт стильную тему.', zh:'Tip - 装备资料卡可显示精美主题。', ja:'Tip - プロフィールカードでスタイリッシュなテーマを表示。' },
    'Tip - 캐치마인드에서 그림을 그릴 때 투명도, 브러시 크기, 무지개 컬러 휠을 활용해 보세요!': { en:'Tip - Use opacity, brush size, and color wheel when drawing!', es:'Tip - ¡Usa opacidad, tamaño de pincel y rueda de color!', tr:'Tip - Çizimde opaklık, boyut ve renk tekerleğini kullanın!', ru:'Tip - Используйте прозрачность, размер и палитру при рисовании!', zh:'Tip - 画图时善用透明度、画笔大小和彩虹调色轮！', ja:'Tip - 描画時は透明度やブラシ、カラーホイールを活用！' },
    'Tip - 야추 다이스는 주사위를 최대 3번까지 굴릴 수 있으며, 높은 족보를 전략적으로 선점하는 게 중요해요.': { en:'Tip - In Yacht Dice, roll up to 3 times for high scores.', es:'Tip - En Yate, lanza hasta 3 veces para alto puntaje.', tr:'Tip - Yat Zarında 3 atışla yüksek puan hedefleyin.', ru:'Tip - В Яхте бросайте до 3 раз ради комбинаций.', zh:'Tip - 快艇骰子最多投3次，抢占高分组合。', ja:'Tip - ヤッツーは最大3回振って高得点を狙いましょう。' },
    'Tip - 게임 도중 관전자로 참여해도 실시간으로 채팅과 이모지로 함께 응원할 수 있어요.': { en:'Tip - Even spectators can cheer with chat and emoji.', es:'Tip - Los espectadores pueden animar con chat y emojis.', tr:'Tip - İzleyiciler de sohbet ve emojiyle destek olabilir.', ru:'Tip - Зрители тоже могут болеть в чате.', zh:'Tip - 观战者也可以用聊天和表情加油。', ja:'Tip - 観戦者もチャットや絵文字で応援できます。' },
    'Tip - 사이드바 상단의 프로필 설정 버튼을 눌러 언제든 귀여운 동물 아바타로 변경할 수 있어요.': { en:'Tip - Change your avatar anytime in profile settings.', es:'Tip - Cambia tu avatar cuando quieras en ajustes.', tr:'Tip - Profil ayarlarından avatarınızı değiştirin.', ru:'Tip - Меняйте аватар в настройках профиля.', zh:'Tip - 在个人资料中随时更换动物头像。', ja:'Tip - プロフィール設定でいつでもアバターを変更可能。' },
    'Tip - 다크 모드를 켜면 눈의 피로를 덜면서 더욱 몰입감 있게 게임을 즐길 수 있어요.': { en:'Tip - Dark mode reduces eye strain for more immersion.', es:'Tip - El modo oscuro reduce el cansancio visual.', tr:'Tip - Koyu mod göz yorgunluğunu azaltır.', ru:'Tip - Тёмная тема снижает усталость глаз.', zh:'Tip - 深色模式减轻视疲劳，增强沉浸感。', ja:'Tip - ダークモードで目の疲れを軽減できます。' },
    'Tip - 게임에서 아쉽게 패배하더라도 판수와 경험치가 누적되어 레벨을 올릴 수 있어요.': { en:'Tip - Even in defeat, EXP accumulates to level up.', es:'Tip - Incluso perdiendo, ganas EXP para subir de nivel.', tr:'Tip - Kaybetseniz bile EXP birikir ve seviye atlatır.', ru:'Tip - Даже при поражении начисляется опыт.', zh:'Tip - 即使失败也会积累经验升级。', ja:'Tip - 負けても経験値が溜まりレベルアップできます。' },
    'Tip - 쿼리도는 말 이동뿐만 아니라 상대의 경로를 벽으로 막아 턴을 낭비시키는 전략이 핵심이에요.': { en:'Tip - In Quoridor, wall placement is key to victory.', es:'Tip - En Quoridor, colocar muros es clave.', tr:'Tip - Quoridor\'da duvar yerleştirmek zaferin anahtarıdır.', ru:'Tip - В Кворидоре стены — ключ к победе.', zh:'Tip - 围墙棋中放墙阻挡对手是制胜关键。', ja:'Tip - クォリドーは壁の配置が勝利の鍵です。' },
    'Tip - 로비 실시간 채팅에서 접속 중인 모든 플레이어들과 자유롭게 대화를 나눠보세요.': { en:'Tip - Chat freely with all online players in the lobby.', es:'Tip - Chatea libremente con todos en el lobby.', tr:'Tip - Lobideki herkesle özgürce sohbet edin.', ru:'Tip - Общайтесь со всеми игроками в лобби.', zh:'Tip - 在大厅实时聊天中与所有人交流。', ja:'Tip - ロビーのチャットでみんなと会話しましょう。' },

    // 🌟 전역 확장 영어 번역 사전 (로비, 대기실, 인게임, 모달, 상점, 프로필 등)
    'Tip - 로그인을 하면 전적과 레벨 등의 정보를 저장할 수 있어요.': { en:'Tip - Log in to safely save your records and level.' },
    'Supabase 설정이 필요합니다.': { en:'Supabase setup is required.' },
    '참가자 (': { en:'Players (' },
    '(방': { en:'(Room' },
    '로딩 중...': { en:'Loading...' },
    '동물 아바타': { en:'Animal Avatar' },
    '아바타 색상': { en:'Avatar Color' },
    '프로필 변경 완료': { en:'Profile updated successfully' },
    '클립보드에 복사되었습니다!': { en:'Copied to clipboard!' },
    '방 접속 중...': { en:'Joining room...' },
    '방 생성 중...': { en:'Creating room...' },
    '방이 삭제되었거나 존재하지 않습니다.': { en:'Room was deleted or does not exist.' },
    '인원이 가득 찼습니다.': { en:'Room is full.' },
    '방장이 퇴장하여 방이 종료되었습니다.': { en:'Room closed as host left.' },
    '상대방이 접속을 종료했습니다.': { en:'Opponent disconnected.' },
    '상대방이 기권했습니다.': { en:'Opponent resigned.' },
    '당신의 승리입니다!': { en:'You Win!' },
    '당신의 패배입니다.': { en:'You Lost.' },
    '턴 넘기기': { en:'Pass Turn' },
    '다시 도전': { en:'Try Again' },
    '게임 다시시작': { en:'Restart Game' },
    '게임 준비 중...': { en:'Preparing game...' },
    '잠시만 기다려 주세요.': { en:'Please wait a moment.' },
    '게임 시작!': { en:'Game Start!' },
    '연속 턴!': { en:'Bonus Turn!' },
    '한 번 더!': { en:'One More Turn!' },
    '플레이어': { en:'Players' },
    '1명': { en:'1 Player' },
    '2명': { en:'2 Players' },
    '3명': { en:'3 Players' },
    '4명': { en:'4 Players' },
    '5명': { en:'5 Players' },
    '6명': { en:'6 Players' },
    '7명': { en:'7 Players' },
    '8명': { en:'8 Players' },
    '5인': { en:'5 Players' },
    '1명 접속': { en:'1 Player Online' },
    '친구 연결 대기 중': { en:'Waiting for friends...' },
    '익명': { en:'Anonymous' },
    '개발자': { en:'Developer' },
    '로그인하면 프로필이 클라우드에 보관됩니다.': { en:'Log in to save your profile to the cloud.' },
    '닉네임 (최대 6글자)': { en:'Nickname (Max 6 chars)' },
    'Google로 간편 로그인': { en:'Sign in with Google' },
    '카카오 계정으로 계속': { en:'Continue with Kakao' },
    '현재 구글 로그인만 지원합니다.': { en:'Currently only Google login is supported.' },
    '내 레벨 경험치': { en:'My Level & EXP' },
    '프로필 편집 (닉네임/동물 아바타)': { en:'Edit Profile (Nickname & Avatar)' },
    '내 전적 통계 보기': { en:'View My Stats' },
    '게임별 방 필터': { en:'Filter Rooms by Game' },
    '1명 감소': { en:'Decrease 1 Player' },
    '1명 증가': { en:'Increase 1 Player' },
    '복사': { en:'Copy' },
    '환경설정': { en:'Settings' },
    '환경 설정 (소리/볼륨)': { en:'Settings (Sound & Volume)' },
    '간편 소셜 로그인으로 1초 만에 INU 아케이드를 시작하세요.': { en:'Get started in 1 second with simple social login.' },
    '로그인 시 전적, 레벨이 클라우드에 영구 보관됩니다.': { en:'Your records and level are safely stored in the cloud.' },
    'BGM 음소거': { en:'Mute BGM' },
    '효과음 음소거': { en:'Mute SFX' },
    '정말 진행하시겠습니까?': { en:'Are you sure you want to proceed?' },
    '나가기': { en:'Leave' },
    '비밀번호 입력': { en:'Enter Password' },
    '님의 초대!': { en:'\'s Invitation!' },
    '내 친구 (': { en:'My Friends (' },
    '친구 신청은 대기실이나 로비에서 다른 플레이어의': { en:'To send a friend request, click a player\'s' },
    '프로필': { en:'profile' },
    '을 클릭하여 전적 창에서 보낼 수 있습니다.': { en:'in the lobby or room to open stats.' },
    '친구 목록이 비어 있습니다.': { en:'Your friends list is empty.' },
    '온라인': { en:'Online' },
    '오프라인': { en:'Offline' },
    '접속 중': { en:'Online' },
    '방 코드': { en:'Room Code' },
    '현재 게임이 진행 중입니다. 대기실에서 대기하시거나 채팅에 참여해 보세요!': { en:'Game in progress! Please wait in the lobby or join the chat.' },
    '방장이 게임을 선택하고 시작하기를 기다리고 있습니다.': { en:'Waiting for the host to select a game and start.' },
    '준비하기': { en:'Ready' },
    '준비 완료': { en:'Ready' },
    '대기 중': { en:'Waiting' },
    '게임 진행 중': { en:'In Game' },
    '모든 참가자가 준비해야 시작할 수 있습니다.': { en:'All players must be ready to start.' },
    '모든 참가자 준비 완료! 게임을 시작하세요.': { en:'All players ready! Start the game.' },
    '게임을 시작하려면 최소 1명의 참가자가 필요합니다.': { en:'At least 1 other player is required to start.' },
    '개발자 모드: 참가자 대기 버튼을 눌러 봇을 추가하고 1인 플레이를 진행하세요!': { en:'Dev Mode: Click waiting slots to add bots and play solo!' },
    '참가자 대기 중... (클릭 시 봇 추가)': { en:'Waiting for players... (Click to add Bot)' },
    '+ 테스트 플레이어 추가': { en:'+ Add Test Player' },
    '추방': { en:'Kick' },
    '추방하기': { en:'Kick Player' },
    '1라운드 감소': { en:'Decrease 1 Round' },
    '1라운드 증가': { en:'Increase 1 Round' },
    '1 라운드': { en:'1 Round' },
    '2 라운드': { en:'2 Rounds' },
    '3 라운드': { en:'3 Rounds' },
    '4 라운드': { en:'4 Rounds' },
    '5 라운드': { en:'5 Rounds' },
    '방장 초': { en:'Host Cho' },
    '방장 한': { en:'Host Han' },
    '랜덤 셔플': { en:'Random Shuffle' },
    '참가자 관리': { en:'Manage Player' },
    '클릭하여 친구 초대하기': { en:'Click to invite friends' },
    '게임을 선택해 주세요': { en:'Please select a game' },
    '선택됨': { en:'Selected' },
    '방으로 돌아가기': { en:'Back to Room' },
    '내 턴': { en:'My Turn' },
    '상대 턴': { en:'Opponent\'s Turn' },
    '턴': { en:'Turn' },
    '기권': { en:'Resign' },
    '대국 기권': { en:'Resign Game' },
    '정말 기권하시겠습니까?': { en:'Are you sure you want to resign?' },
    '관전 중': { en:'Spectating' },
    '관전': { en:'Spectate' },
    '모바일 채팅': { en:'Mobile Chat' },
    '채팅창': { en:'Chat Panel' },
    '웃기': { en:'Laugh' },
    '박수': { en:'Clap' },
    '놀람': { en:'Surprised' },
    '축하': { en:'Congrats' },
    '승리!': { en:'Victory!' },
    '패배!': { en:'Defeat!' },
    '무승부!': { en:'Draw!' },
    '축하합니다! 대결에서 승리하셨습니다.': { en:'Congratulations! You won the match.' },
    '아쉽지만 패배하셨습니다. 다음 판에 도전해 보세요!': { en:'You lost this match. Try again next time!' },
    '무승부로 경기가 끝났습니다.': { en:'The game ended in a draw.' },
    '승': { en:'W' },
    '패': { en:'L' },
    '무': { en:'D' },
    '전적': { en:'Record' },
    '판': { en:'Games' },
    '유형': { en:'Type' },
    '버그 / 기능 오류': { en:'Bug / Functional Error' },
    '게임 룰 / 판정 오류': { en:'Game Rule / Judgment Error' },
    '개선 및 기능 제안': { en:'Feature / Improvement Idea' },
    '기타 문의': { en:'Other Inquiries' },
    '대상 게임': { en:'Target Game' },
    '전체 / 공통': { en:'All / Common' },
    '제목': { en:'Title' },
    '내용': { en:'Content' },
    '0 / 500자': { en:'0 / 500 chars' },
    '문의 접수': { en:'Submit Ticket' },
    '문의 제목을 입력하세요...': { en:'Enter inquiry title...' },
    '발생한 상황 또는 건의 내용을 적어주세요 (최대 500자)...': { en:'Describe the issue or suggestion (Max 500 chars)...' },
    '인게임 감정표현': { en:'In-game Emotes' },
    '채팅 알림 뱃지': { en:'Chat Notification Badge' },
    '재생': { en:'Play' },
    '15×15 정통 바둑판에서 먼저 5목을 완성하면 승리합니다.': { en:'First player to connect 5 stones on a 15×15 board wins.' },
    '흑 선공': { en:'Black (First)' },
    '백 후공': { en:'White (Second)' },
    '흑': { en:'Black' },
    '백': { en:'White' },
    '흑돌 승리!': { en:'Black wins!' },
    '백돌 승리!': { en:'White wins!' },
    '흑돌 턴': { en:'Black\'s Turn' },
    '백돌 턴': { en:'White\'s Turn' },
    '착수': { en:'Place Stone' },
    '체크!': { en:'Check!' },
    '내 킹이 체크당했습니다!': { en:'Your King is in check!' },
    '상대방 킹 체크!': { en:'Opponent\'s King in check!' },
    '체크메이트!': { en:'Checkmate!' },
    '스테일메이트 (무승부)': { en:'Stalemate (Draw)' },
    '백 선공': { en:'White (First)' },
    '흑 후공': { en:'Black (Second)' },
    '장군!': { en:'Janggun (Check)!' },
    '상대방 장군!': { en:'Opponent\'s General in check!' },
    '외통수!': { en:'Checkmate (Oetongsu)!' },
    '초 선공': { en:'Cho (Green First)' },
    '한 후공': { en:'Han (Red Second)' },
    '초': { en:'Cho' },
    '한': { en:'Han' },
    '돌을 드래그하여 조준하세요': { en:'Drag stones to aim and flick' },
    '파워 조절': { en:'Power Control' },
    '남은 돌': { en:'Stones Left' },
    '경기 종료': { en:'Game Over' },
    '남은 벽': { en:'Walls Left' },
    '가로 벽': { en:'Horizontal Wall' },
    '세로 벽': { en:'Vertical Wall' },
    '벽 설치': { en:'Place Wall' },
    '말 이동': { en:'Move Pawn' },
    '하단': { en:'Bottom' },
    '상단': { en:'Top' },
    '벽이 부족합니다': { en:'Not enough walls' },
    '도달 불가': { en:'Unreachable' },
    '남은 숫자:': { en:'Numbers Left:' },
    '최대 3개까지 선택 가능': { en:'Choose up to 3 numbers' },
    '님이 숫자를 선택 중입니다...': { en:'is picking numbers...' },
    '상대방이 숫자를 선택 중입니다...': { en:'Opponent is picking numbers...' },
    '님이 31을 선언하여 패배했습니다!': { en:'declared 31 and lost!' },
    '숫자 1개': { en:'1 Number' },
    '숫자 2개': { en:'2 Numbers' },
    '숫자 3개': { en:'3 Numbers' },
    '턴 준비 중...': { en:'Preparing Turn...' },
    '시작 단어': { en:'Starting Word' },
    '이어서 단어 입력 후 Enter...': { en:'Type a matching word and Enter...' },
    '이 입력 중입니다...': { en:'is typing...' },
    '단어 입력...': { en:'Type word...' },
    '이미 사용된 단어입니다': { en:'Word already used' },
    '존재하지 않는 단어입니다': { en:'Word does not exist' },
    '시간 초과!': { en:'Time Out!' },
    '라운드 종료': { en:'Round Over' },
    '점': { en:'pts' },
    '남은 시간': { en:'Time Left' },
    '합이 10이 되도록 드래그하세요': { en:'Drag apples so their sum equals 10' },
    '사과 제거': { en:'Remove Apples' },
    '콤보': { en:'Combo' },
    '게임 종료!': { en:'Game Over!' },
    '최종 점수': { en:'Final Score' },
    '타자 입력...': { en:'Type here...' },
    '문장을 빠르게 입력하세요': { en:'Type sentences accurately and quickly' },
    '정확도': { en:'Accuracy' },
    '타수': { en:'Speed' },
    '타/분': { en:'CPM' },
    '완료!': { en:'Finished!' },
    '현재 순위': { en:'Current Rank' },
    '출제자 준비 중...': { en:'Preparing Drawer...' },
    '다음 라운드 준비 중...': { en:'Preparing next round...' },
    '그림을 그려 단어를 설명하세요': { en:'Draw to explain the word' },
    '정답을 채팅창에 입력하세요': { en:'Guess the word in chat' },
    '정답입니다!': { en:'Correct!' },
    '정답!': { en:'Correct!' },
    '내 점수:': { en:'My Score:' },
    '내 점수': { en:'My Score' },
    '색상 선택': { en:'Color Palette' },
    '이 색으로 설정': { en:'Set this color' },
    '지우개': { en:'Eraser' },
    '전체 지우기': { en:'Clear All' },
    '선 굵기': { en:'Brush Size' },
    '말을 선택하세요': { en:'Select a piece' },
    '버튼을 길게 눌러 게이지 파워를 조절하세요': { en:'Hold button to charge throwing power' },
    '움직일 말을 클릭한 후 목적지(붉은 칸)를 누르세요': { en:'Click your piece, then click destination' },
    '대기 말': { en:'Waiting Pieces' },
    '도': { en:'Do (1 step)' },
    '개': { en:'Gae (2 steps)' },
    '걸': { en:'Geol (3 steps)' },
    '윷': { en:'Yut (4 steps)' },
    '모': { en:'Mo (5 steps)' },
    '빽도': { en:'Back-Do (-1 step)' },
    '잡기!': { en:'Captured!' },
    '주사위 트레이': { en:'Dice Tray' },
    '주사위를 클릭하여 보관하세요': { en:'Click dice to hold/keep' },
    '남은 굴림:': { en:'Rolls Left:' },
    '3회': { en:'3' },
    '2회': { en:'2' },
    '1회': { en:'1' },
    '0회': { en:'0' },
    '주사위 굴리기': { en:'Roll Dice' },
    '점수표': { en:'Score Sheet' },
    '에이스': { en:'Aces' },
    '듀스': { en:'Deuces' },
    '트레이': { en:'Threes' },
    '포스': { en:'Fours' },
    '파이브스': { en:'Fives' },
    '식스': { en:'Sixes' },
    '초이스': { en:'Choice' },
    '포 오브 어 카인드': { en:'4 of a Kind' },
    '풀하우스': { en:'Full House' },
    '스몰 스트레이트': { en:'Small Straight' },
    '라지 스트레이트': { en:'Large Straight' },
    '보너스': { en:'Bonus' },
    '총점': { en:'Total Score' },
    '보유 코인': { en:'My Coins' },
    '닉네임 컬러': { en:'Nickname Colors' },
    '구매하기': { en:'Purchase' },
    '장착하기': { en:'Equip' },
    '보유 중': { en:'Owned' },
    '섯다': { en:'Seotda' },
    '2장 섯다 & 베팅 배틀': { en:'2-card Seotda & Betting' },
    '현재 판돈': { en:'Current Pot' },
    '족보표': { en:'Hand Rankings' },
    '섯다 족보표': { en:'Seotda Hand Rankings' },
    '다이': { en:'Fold' },
    '체크': { en:'Check' },
    '콜': { en:'Call' },
    '삥': { en:'Ping' },
    '따당': { en:'Dadang' },
    '하프': { en:'Half' },
    '쿼터': { en:'Quarter' },
    '올인': { en:'All-in' },
    '탭하여 쪼기': { en:'Tap to Peek' },
    '38광땡': { en:'38 Gwang Ddaeng' },
    '13광땡': { en:'13 Gwang Ddaeng' },
    '18광땡': { en:'18 Gwang Ddaeng' },
    '장땡': { en:'Jang Ddaeng (10-pair)' },
    '알리': { en:'Alli' },
    '독사': { en:'Doksa' },
    '구삥': { en:'Gubbing' },
    '장삥': { en:'Jangbbing' },
    '장사': { en:'Jangsa' },
    '세륙': { en:'Seryuk' },
    '갑오 (9끗)': { en:'Gabo (9-point)' },
    '망통': { en:'Mangtong (0-point)' },
    '암행어사': { en:'Royal Secret Inspector' },
    '땡잡이': { en:'Ddaeng Hunter' },
    '멍텅구리 구사': { en:'Foolish Gusa (Meong-Gu)' },
    '구사': { en:'Gusa' },
  };

  /* ─────────────────────────────────────────────────────────
     엔진 초기화 & 이벤트 동기화
  ───────────────────────────────────────────────────────── */
  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.find(l => l.code === saved)) {
      _currentLang = saved;
    } else {
      const bLang = (navigator.language || 'ko').toLowerCase().split('-')[0];
      const matched = LANGUAGES.find(l => l.code === bLang);
      _currentLang = matched ? bLang : 'ko';
    }

    _loadLocaleFile('ko');
    _loadLocaleFile('en');

    _applyToDocument();
    _setupObserver();
    _syncHeaderDropdown();
  }

  function _loadLocaleFile(langCode) {
    if (typeof fetch === 'undefined') return;
    fetch(`locales/${langCode}.json`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          _localeBundles[langCode] = data;
          if (_currentLang === langCode) _applyToDocument();
        }
      })
      .catch(() => {});
  }

  function t(keyOrText, params, lang) {
    if (!keyOrText || typeof keyOrText !== 'string') return keyOrText;
    const l = lang || _currentLang;
    const trimmed = keyOrText.trim();

    let result = null;

    if (DICT[trimmed] && DICT[trimmed][l]) {
      result = DICT[trimmed][l];
    } else if (RAW_TEXT_MAP[trimmed] && RAW_TEXT_MAP[trimmed][l]) {
      result = RAW_TEXT_MAP[trimmed][l];
    } else if (_localeBundles[l]) {
      const keys = trimmed.split('.');
      let cur = _localeBundles[l];
      for (const k of keys) {
        if (cur && typeof cur === 'object' && k in cur) {
          cur = cur[k];
        } else {
          cur = null;
          break;
        }
      }
      if (typeof cur === 'string') result = cur;
    }

    if (!result) {
      if (l === 'ko') return keyOrText;
      result = trimmed;
    }

    if (params && typeof params === 'object') {
      Object.keys(params).forEach(pKey => {
        const regex = new RegExp(`\\{${pKey}\\}`, 'g');
        result = result.replace(regex, params[pKey]);
      });
    }

    const leading = keyOrText.match(/^\s*/)[0];
    const trailing = keyOrText.match(/\s*$/)[0];
    return leading + result + trailing;
  }

  function formatNumber(number, options) {
    try {
      return new Intl.NumberFormat(_currentLang, options).format(number);
    } catch (_) {
      return String(number);
    }
  }

  function formatDate(date, options) {
    try {
      const d = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat(_currentLang, options || { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    } catch (_) {
      return String(date);
    }
  }

  function setLanguage(code) {
    if (!LANGUAGES.find(l => l.code === code)) return;
    _currentLang = code;
    localStorage.setItem(STORAGE_KEY, code);

    _applyToDocument();
    _syncHeaderDropdown();

    document.querySelectorAll('.lang-choice-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === code);
    });

    document.documentElement.lang = code;
  }

  function _syncHeaderDropdown() {
    const sel = document.getElementById('select-global-language');
    if (sel && sel.value !== _currentLang) {
      sel.value = _currentLang;
    }
  }

  function _applyToDocument() {
    const lang = _currentLang;

    // 1. data-i18n 속성 번역
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key, null, lang);
    });

    // 2. 전체 DOM TextNode 자동 탐색 및 변환
    if (document.body) {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toUpperCase();
            if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA'].includes(tag)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (node.nodeValue && node.nodeValue.trim().length > 0) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        },
        false
      );

      let node;
      while ((node = walker.nextNode())) {
        const val = node.nodeValue;
        const trimmed = val.trim();
        if (!trimmed) continue;

        if (!node._i18nOrig && RAW_TEXT_MAP[trimmed]) {
          node._i18nOrig = trimmed;
        }

        if (node._i18nOrig && RAW_TEXT_MAP[node._i18nOrig]) {
          const trans = lang === 'ko' ? node._i18nOrig : (RAW_TEXT_MAP[node._i18nOrig][lang] || RAW_TEXT_MAP[node._i18nOrig]['en'] || node._i18nOrig);
          const leading = val.match(/^\s*/)[0];
          const trailing = val.match(/\s*$/)[0];
          node.nodeValue = leading + trans + trailing;
        }
      }
    }

    // 3. title, placeholder 속성 번역
    document.querySelectorAll('[title]').forEach(el => {
      const tVal = el.getAttribute('title');
      if (!tVal) return;
      if (!el._i18nOrigTitle && RAW_TEXT_MAP[tVal.trim()]) {
        el._i18nOrigTitle = tVal.trim();
      }
      if (el._i18nOrigTitle && RAW_TEXT_MAP[el._i18nOrigTitle]) {
        el.setAttribute('title', lang === 'ko' ? el._i18nOrigTitle : (RAW_TEXT_MAP[el._i18nOrigTitle][lang] || RAW_TEXT_MAP[el._i18nOrigTitle]['en'] || el._i18nOrigTitle));
      }
    });

    document.querySelectorAll('input[placeholder]').forEach(el => {
      const pVal = el.getAttribute('placeholder');
      if (!pVal) return;
      if (!el._i18nOrigPlaceholder && RAW_TEXT_MAP[pVal.trim()]) {
        el._i18nOrigPlaceholder = pVal.trim();
      }
      if (el._i18nOrigPlaceholder && RAW_TEXT_MAP[el._i18nOrigPlaceholder]) {
        el.setAttribute('placeholder', lang === 'ko' ? el._i18nOrigPlaceholder : (RAW_TEXT_MAP[el._i18nOrigPlaceholder][lang] || RAW_TEXT_MAP[el._i18nOrigPlaceholder]['en'] || el._i18nOrigPlaceholder));
      }
    });
  }

  let _observerTimer = null;
  function _setupObserver() {
    if (typeof MutationObserver === 'undefined' || !document.body) return;
    const observer = new MutationObserver(() => {
      if (_currentLang === 'ko') return;
      if (_observerTimer) clearTimeout(_observerTimer);
      _observerTimer = setTimeout(() => {
        _applyToDocument();
      }, 100);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return {
    init,
    setLanguage,
    t,
    formatNumber,
    formatDate,
    getCurrentLang: () => _currentLang,
    getLanguages: () => LANGUAGES,
    applyToDocument: _applyToDocument
  };
})();
