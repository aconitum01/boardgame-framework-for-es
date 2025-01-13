let socket;
let serverMessage = '';  // サーバーからのメッセージを保持する変数
let room_id = '';
let hanabimsg = {};   // サーバーから受信した観測情報を保持する変数
let timeoutDate = null;

// ログ出力の有無
let loggingEnabled = true;

// インスタンス
let cardStackBar;
let backManager;

// アジャスト後のCanvasの端の値を保持する変数
let canW;
let canH;
let canTop;
let canBottom;
let canLeft;
let canRight;

// カラーコード
let cBLUE = "#0000FF"
let cGREEN = "#008000"
let cRED = "#FF0000"
let cATENTIONRED = "#FF4B00"
let cWHITE = "#FFFFFF"
let cYELLOW = "#FFD700"
let cBLACK = "#000000"
let cGRAY = "#808080"
let cLIFERED = "#ED1A3D"
let cINFOBLUE = "#0067C0"
let cDECKBROWN = "#892F1B"
let cKHAKI = "#F0E68C"
let cGAINSBORO = "#DCDCDC"
let cDARKBULE = "#00008B"
let cLIGHTSTEELBLUE = "#B0C4DE"
let cCRIMSON = "#DC143C"
let cDISCARDBLACK = "#14001A"

let colors = ['B', 'R', 'G', 'W', 'Y'];

// UI要素のサイズ群
let CARD_W; // カードの幅
let CARD_H; // カードの高さ
let HINTED_BOX_W; // ヒントボックスの幅
let HINTED_BOX_H; // ヒントボックスの高さ
let EACH_PLAY_AREA_W; // カードスタックバーの幅
let EACH_PLAY_AREA_H; // カードスタックバーの高さ
let AI_NAME_AREA_W; // AI名エリアの幅
let AI_NAME_AREA_H; // AI名エリアの高さ
let MISS_AREA_W; // ミスエリアの幅
let MISS_AREA_H; // ミスエリアの高さ
let INFO_AREA_W; // ヒントエリアの幅
let INFO_AREA_H; // ヒントエリアの高さ
let DECK_AREA_W; // デッキエリアの幅
let DECK_AREA_H; // デッキエリアの高さ
let TIME_AREA_W; // タイムエリアの幅
let TIME_AREA_H; // タイムエリアの高さ
let FIREWORKS_B_AREA_W; // 青い花火エリアの幅
let FIREWORKS_B_AREA_H; // 青い花火エリアの高さ
let FIREWORKS_G_AREA_W; // 緑の花火エリアの幅
let FIREWORKS_G_AREA_H; // 緑の花火エリアの高さ
let FIREWORKS_R_AREA_W; // 赤い花火エリアの幅
let FIREWORKS_R_AREA_H; // 赤い花火エリアの高さ
let FIREWORKS_W_AREA_W; // 白い花火エリアの幅
let FIREWORKS_W_AREA_H; // 白い花火エリアの高さ
let FIREWORKS_Y_AREA_W; // 黄色い花火エリアの幅
let FIREWORKS_Y_AREA_H; // 黄色い花火エリアの高さ
let DISCARD_LOG_AREA_W; // 捨て札＆ログエリアの幅
let DISCARD_LOG_AREA_H; // 捨て札＆ログエリアの高さ
let DISCARD_AREA_W; // 捨て札エリアの幅
let DISCARD_AREA_H; // 捨て札エリアの高さ
let LOG_AREA_W; // 捨て札エリアの幅
let LOG_AREA_H; // 捨て札エリアの高さ

let timeGraphics; // タイム表示用のグラフィックス（ここだけ毎秒更新）

// UI要素の位置調整用のパラメータ
let PADDING;
let FOUR_SPLIT_W; // 3分割エリアの幅
let FOUR_SPLIT_H; // 3分割エリアの高さ
let FIVE_SPLIT_W; // 5分割エリアの幅
let FIVE_SPLIT_H; // 5分割エリアの高さ

let myCards = []; // 自分のカードのリスト
let yourCards = []; // 相手カードのリスト

const MAX_LIFE_TOKENS = 3;
const MAX_INFORMATION_TOKENS = 8;
const MAX_DECK_SIZE = 40;

let isNotGameEnd;

function setup() {
  backInit(); // キャンバスの初期化
  uiSizeSetter(); // UI要素のサイズを初期化
  frameRate(10); // フレームレートの設定

  // サーバーのip:portに変える必要がある
  socket = io.connect('http://' + document.domain + ':' + location.port);

  // サーバー接続成功時の処理
  socket.on('connect', function () {
    console.log('Connected to server');
  });

  socket.on('room_id', (data) => {
    room_id = data
  });

  // サーバーからhanabimsg-jsonを受信
  socket.on('hanabimsg-my-turn', function (data) {

    hanabimsg = JSON.parse(data);
    console.log("Received hanabimsg-my-turn-json: ", hanabimsg);

    removeElements(); // DOM要素を削除
    background(cGRAY); // 背景色をグレーにし塗りなおす

    //各要素の描画
    drawUI()

    timeoutDate = new Date(hanabimsg.timeout);
  });

  socket.on('hanabimsg-not-my-turn', function (data) {

    hanabimsg = JSON.parse(data);
    console.log("Received hanabimsg-not-my-turn-json: ", hanabimsg);

    removeElements(); // DOM要素を削除
    background(cGRAY); // 背景色をグレーにし塗りなおす

    //各要素の描画
    drawUI()

    timeoutDate = new Date(hanabimsg.timeout);
  });

  socket.on('game_end', function (data) {
    drawGameEnd(data.game_id);
  });
  socket.on('finish_process', function (data) {
  });
}

let timeAreaX;
let timeAreaY;

function draw() {
  let tmpX = canLeft + PADDING * 2
  let tmpY = CARD_H + HINTED_BOX_H + PADDING + FOUR_SPLIT_H + PADDING + FIVE_SPLIT_H + PADDING;
  drawDiscardLogArea(tmpX, tmpY);

  if (timeoutDate) {
    const currentDate = new Date();
    const diffMillis = timeoutDate.getTime() - currentDate.getTime();
    remainingTime = Math.floor(diffMillis / 1000);
    console.log(remainingTime);

    if (remainingTime >= 0) {
      drawRemainingTime(remainingTime, timeAreaX, timeAreaY);
    }
  }
}


// ユーティリティ関数 ========================================

function customLog(...args) {
  if (loggingEnabled) {
    console.log(...args);
  }
}

// キャンバスの初期化
function backInit() {

  // Canvasの初期化
  createCanvas(windowWidth, windowHeight); // 変更前のキャンバスを仮生成
  adjustCanvasSize(); // キャンバスサイズを縦長に

  // Canvasの端の値を計算して保存
  canTop = 0;
  canBottom = canH;
  canLeft = 0;
  canRight = canW;
  // customLog(`canvasTop: ${canTop}, canvasBottom: ${canBottom}, canvasLeft: ${canLeft}, canvasRight: ${canRight}`)

  background(cGAINSBORO);
}

function uiSizeSetter() {
  CARD_W = percentCanW(20);
  CARD_H = percentCanH(20);

  HINTED_BOX_W = CARD_W * (4 / 6);
  HINTED_BOX_H = CARD_H / 3;

  EACH_PLAY_AREA_W = canW;
  EACH_PLAY_AREA_H = percentCanH(50); // カードスタックバーの高さは画面の50%


  PADDING = percentCanH(1);

  AI_NAME_AREA_W = canW; // AI名エリアの幅
  AI_NAME_AREA_H = CARD_H / 4; // AI名エリアの高さ

  FOUR_SPLIT_W = (canW - PADDING * 5) / 4;
  FOUR_SPLIT_H = CARD_H / 2;

  MISS_AREA_W = FOUR_SPLIT_W; // ミスエリアの幅
  MISS_AREA_H = FOUR_SPLIT_H; // ミスエリアの高さ
  INFO_AREA_W = FOUR_SPLIT_W; // ヒントエリアの幅
  INFO_AREA_H = FOUR_SPLIT_H; // ヒントエリアの高さ
  DECK_AREA_W = FOUR_SPLIT_W; // デッキエリアの幅
  DECK_AREA_H = FOUR_SPLIT_H; // デッキエリアの高さ
  TIME_AREA_W = FOUR_SPLIT_W; // タイムエリアの幅
  TIME_AREA_H = FOUR_SPLIT_H; // タイムエリアの高さ

  // timeGraphics用
  timeGraphics = createGraphics(TIME_AREA_W, TIME_AREA_H);
  // timeGraphics用に明示的にrectWithTextを定義
  timeGraphics.rectWithText = function (x, y, w, h, txt, txtColor, rectColor, radius = 5) {
    // 四角形を描画
    this.fill(rectColor || 255); // 四角形の色（デフォルト白）
    this.rect(x, y, w, h, radius);

    // フォントサイズを調整してテキストが横幅を超えないようにする
    let tSize = h / 2; // 初期フォントサイズ（高さの1/2）
    this.textSize(tSize);

    // テキストが横幅を超えている場合、フォントサイズを縮小
    while (this.textWidth(txt) > w - 10 && tSize > 12) { // 最小フォントサイズは12
      tSize -= 1;
      this.textSize(tSize);
    }

    this.textStyle(BOLD);

    // テキストを描画
    this.fill(txtColor || 0); // テキストの色（デフォルト黒）
    this.textAlign(CENTER, CENTER); // テキストを中央揃え
    this.text(txt, x + w / 2, y + h / 2);
  };
  // 基本UI要素のxy座標はdrawUI()で記述するが，timeGraphicsは特別なのでここでx,yを設定．
  // 他のUI要素との位置関係はdrawUI()を参照．
  timeAreaX = PADDING + canLeft + MISS_AREA_W + PADDING + INFO_AREA_W + PADDING + DECK_AREA_W + PADDING;
  timeAreaY = CARD_H + HINTED_BOX_H + PADDING;

  FIVE_SPLIT_W = (canW - PADDING * 6) / 5;
  FIVE_SPLIT_H = CARD_H / 3;

  FIREWORKS_B_AREA_W = FIVE_SPLIT_W; // 青い花火エリアの幅
  FIREWORKS_B_AREA_H = FIVE_SPLIT_H; // 青い花火エリアの高さ
  FIREWORKS_G_AREA_W = FIVE_SPLIT_W; // 緑の花火エリアの幅
  FIREWORKS_G_AREA_H = FIVE_SPLIT_H; // 緑の花火エリアの高さ
  FIREWORKS_R_AREA_W = FIVE_SPLIT_W; // 赤い花火エリアの幅
  FIREWORKS_R_AREA_H = FIVE_SPLIT_H; // 赤い花火エリアの高さ
  FIREWORKS_W_AREA_W = FIVE_SPLIT_W; // 白い花火エリアの幅
  FIREWORKS_W_AREA_H = FIVE_SPLIT_H; // 白い花火エリアの高さ
  FIREWORKS_Y_AREA_W = FIVE_SPLIT_W; // 黄色い花火エリアの幅
  FIREWORKS_Y_AREA_H = FIVE_SPLIT_H; // 黄色い花火エリアの高さ 

  DISCARD_AREA_W; // 捨て札エリアの幅
  DISCARD_AREA_H = CARD_H / 3; // 捨て札エリアの高さ

  DISCARD_LOG_AREA_W = canW - PADDING * 4; // 捨て札＆ログエリアの幅
  let DISCARD_LOG_AREA_TOP = CARD_H + HINTED_BOX_H + PADDING + FOUR_SPLIT_H + PADDING + FIVE_SPLIT_H + PADDING;
  DISCARD_LOG_AREA_H = (canBottom - CARD_H - HINTED_BOX_H - PADDING) - DISCARD_LOG_AREA_TOP; // 捨て札＆ログエリアの高さ
}

// キャンバスのリサイズ
function adjustCanvasSize() {
  let ASPECT = 9 / 16; // 縦横比 (ここでは16:9)

  // ウィンドウのアスペクト比と事前設定の縦長アスペクト比を比較し，横長か縦長かを判定
  customLog(`windoW: ${windowWidth}, winH: ${windowHeight}`)
  if (windowWidth > windowHeight) {
    // 横長の場合windowHeightを基準に縦幅をASPECTに合わせて調整，縦長Canvasを作成
    canW = windowHeight * ASPECT;
    canH = windowHeight;
  } else {
    // 縦長の場合、そのままwindowWidth, windowHeightにリサイズ
    canW = windowWidth;
    canH = windowHeight;
  }
  customLog(`adjusted_canvasW: ${canW}, adjusted_canvasH: ${canH}`)
  resizeCanvas(canW, canH);
}

function percentCanH(percent) {
  return (canH * percent) / 100;
}

function percentCanW(percent) {
  return (canW * percent) / 100;
}

// ユーティリティ関数ここまで ========================================

function rectWithText(x, y, w, h, txt, txtColor, rectColor, radius = 5) {
  // 四角形を描画
  fill(rectColor || 255); // 四角形の色（デフォルト白）
  rect(x, y, w, h, radius);

  // フォントサイズを調整してテキストが横幅を超えないようにする
  let tSize = h/2;// 初期フォントサイズ（高さの1/2） 
  textSize(tSize);

  // テキストが横幅を超えている場合、フォントサイズを縮小
  while (textWidth(txt) > w - 10 && tSize > 12) { // 最小フォントサイズは12
    tSize -= 1;
    textSize(tSize);
  }

  textStyle(BOLD);

  // テキストを描画
  fill(txtColor || 0); // テキストの色（デフォルト黒）　
  textAlign(CENTER, CENTER); // テキストを中央揃え
  text(txt, x + w / 2, y + h / 2);
}

function rectWithTextTwoLine(x, y, w, h, txt, txtColor, rectColor, radius = 5) {
  // 四角形を描画
  fill(rectColor || 255); // 四角形の色（デフォルト白）
  rect(x, y, w, h, radius);

  // フォントサイズを調整してテキストが横幅を超えないようにする
  // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  let tSize = h/3;// 初期フォントサイズ（高さの1/3） 
  // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  textSize(tSize);

  // テキストが横幅を超えている場合、フォントサイズを縮小
  while (textWidth(txt) > w - 10 && tSize > 12) { // 最小フォントサイズは12
    tSize -= 1;
    textSize(tSize);
  }

  textStyle(BOLD);

  // テキストを描画
  fill(txtColor || 0); // テキストの色（デフォルト黒）　
  textAlign(CENTER, CENTER); // テキストを中央揃え
  text(txt, x + w / 2, y + h / 2);
}

// UI描画関数 -------------------------------------------------------
function drawUI() {
  drawEachPlayArea();
  drawHands();
  drawAiName(canTop, canLeft)

  //ここまではほぼ位置が固定
  drawMiss(PADDING + canLeft,
    CARD_H + HINTED_BOX_H + PADDING);
  drawInfo(PADDING + canLeft + MISS_AREA_W + PADDING,
    CARD_H + HINTED_BOX_H + PADDING);
  drawDeckSize(PADDING + canLeft + MISS_AREA_W + PADDING + INFO_AREA_W + PADDING,
    CARD_H + HINTED_BOX_H + PADDING);

  if (hanabimsg.timeout_cnt >= 3) {
    drawIsTimeOut(timeAreaX, timeAreaY)
  }

  drawFireworks(PADDING + canLeft,
    CARD_H + HINTED_BOX_H + PADDING + FOUR_SPLIT_H + PADDING);

}

function drawEachPlayArea() {
  cardStackBar = new EachPlayArea();
  if (hanabimsg.current_player == hanabimsg.websocket_player_pid) {
    cardStackBar.myDraw(true);
    cardStackBar.yourDraw(false);
  } else {
    cardStackBar.myDraw(false);
    cardStackBar.yourDraw(true);
  }
}

function drawHands() {

  let myHand = hanabimsg.observed_hands[0];
  let myKnowledge = hanabimsg.card_knowledge[0];
  // console.log(myKnowledge);
  let IsMyTurn = hanabimsg.current_player == hanabimsg.websocket_player_pid;
  for (let i = 0; i < myHand.length; i++) {
    let cardX = canLeft + i * CARD_W;
    let cardY = canBottom - CARD_H; // 画面下部に配置
    // customLog(`myHand[i].color: ${myHand[i].color}, myHand[i].number: ${myHand[i].rank}`);
    myCards.push(new Card(cardX, cardY, myHand[i].color, myHand[i].rank,
      'my', i, myKnowledge[i].color, myKnowledge[i].rank, true, IsMyTurn));
  }

  let yourHand = hanabimsg.observed_hands[1];
  let yourKnowledge = hanabimsg.card_knowledge[1];
  for (let i = 0; i < yourHand.length; i++) {
    let cardX = canLeft + i * CARD_W;
    let cardY = canTop;
    // customLog(`yourHand[i].color: ${yourHand[i].color}, yourHand[i].number: ${yourHand[i].rank}`);
    yourCards.push(new Card(cardX, cardY, yourHand[i].color, yourHand[i].rank,
      'your', i, yourKnowledge[i].color, yourKnowledge[i].rank, true, IsMyTurn));
  }
}

function drawAiName(x, y) {
  textDiv = createDiv(`AI Name: ${hanabimsg.ai_name}`);
  textDiv.position(x, y);

  // 背景色を指定（透明度0.3）
  textDiv.style('background-color', 'rgba(239, 239, 239, 0.4)'); // lightblue with 0.3 opacity

  // フォントサイズを動的に調整
  let fontSize = AI_NAME_AREA_H / 2; // 初期フォントサイズを高さの半分に設定
  textDiv.style('font-size', `${fontSize}px`);
  const padding = 10;

  // テキスト幅を確認してフォントサイズを縮小
  while (textDiv.elt.scrollWidth > AI_NAME_AREA_W - PADDING * 2 && fontSize > 12) { // 最小フォントサイズは12
    fontSize -= 1;
    div.style('font-size', `${fontSize}px`);
  }

  // テキストを中央揃えに設定
  textDiv.style('text-align', 'center');
  textDiv.style('line-height', `${AI_NAME_AREA_H}px`); // 縦方向の中央揃え
  textDiv.style('font-weight', 'bold');
  textDiv.style('width', `${AI_NAME_AREA_W}px`);
  textDiv.style('height', `${AI_NAME_AREA_H}px`);
}

function drawMiss(x, y) {
  rectWithTextTwoLine(x, y, MISS_AREA_W, MISS_AREA_H, `LIFE\n${hanabimsg.life_tokens}/${MAX_LIFE_TOKENS}`, cWHITE, cLIFERED, line = 2);
}

function drawInfo(x, y) {
  rectWithTextTwoLine(x, y, INFO_AREA_W, INFO_AREA_H, `HINT\n${hanabimsg.information_tokens}/${MAX_INFORMATION_TOKENS}`, cWHITE, cINFOBLUE, line = 2);
}

function drawDeckSize(x, y) {
  rectWithTextTwoLine(x, y, DECK_AREA_W, DECK_AREA_H, `DECK\n${hanabimsg.deck_size}/${MAX_DECK_SIZE}`, cWHITE, cDECKBROWN, line = 2);
}

function drawIsTimeOut(x, y) {
  rectWithText(x, y, TIME_AREA_W, TIME_AREA_H, `3回時間切れ\n切断扱い`, cWHITE, cATENTIONRED);
}

function drawRemainingTime(remainingTime, x, y) {
  timeout_cnt = hanabimsg.timeout_cnt
  timeGraphics.rectWithText(0, 0, TIME_AREA_W, TIME_AREA_H, `TIME: ${remainingTime}\nCNT: ${timeout_cnt}/3`, cWHITE, cGRAY, radius = 0);
  image(timeGraphics, x, y);
}

function drawFireworks(x, y) {

  let radius = 50;
  rectWithText(x,
    y, FIREWORKS_B_AREA_W, FIREWORKS_B_AREA_H, `B: ${hanabimsg.fireworks['B']}`, cWHITE, cBLUE, radius);
  rectWithText(x + FIREWORKS_B_AREA_W + PADDING,
    y, FIREWORKS_G_AREA_W, FIREWORKS_G_AREA_H, `G: ${hanabimsg.fireworks['G']}`, cWHITE, cGREEN, radius);
  rectWithText(x + FIREWORKS_B_AREA_W + PADDING + FIREWORKS_G_AREA_W + PADDING,
    y, FIREWORKS_R_AREA_W, FIREWORKS_R_AREA_H, `R: ${hanabimsg.fireworks['R']}`, cWHITE, cRED, radius);
  rectWithText(x + FIREWORKS_B_AREA_W + PADDING + FIREWORKS_G_AREA_W + PADDING + FIREWORKS_R_AREA_W + PADDING,
    y, FIREWORKS_W_AREA_W, FIREWORKS_W_AREA_H, `W: ${hanabimsg.fireworks['W']}`, cBLACK, cWHITE, radius);
  rectWithText(x + FIREWORKS_B_AREA_W + PADDING + FIREWORKS_G_AREA_W + PADDING + FIREWORKS_R_AREA_W + PADDING + FIREWORKS_W_AREA_W + PADDING,
    y, FIREWORKS_Y_AREA_W, FIREWORKS_Y_AREA_H, `Y: ${hanabimsg.fireworks['Y']}`, cBLACK, cYELLOW, radius);
}

let isShowingLog = true;  // 表示の状態を保持するフラグ

// function doubleClicked() {
//   isShowingLog = !isShowingLog;
// }

let lastTapTime = 0;  // 最後にタップされた時間を保持する変数
let doubleTapInterval = 300;  // ダブルタップと認識する最大間隔（ミリ秒）
function touchStarted() {
  let currentTime = millis();  // 現在の経過時間を取得
  if (currentTime - lastTapTime < doubleTapInterval) {
    // ダブルタップが検出された場合の処理
    isShowingLog = !isShowingLog;
  }
  lastTapTime = currentTime;  // 最後のタップ時間を更新
}

function drawDiscardLogArea(x, y) {
  if (isShowingLog) {
    drawLog(x, y);
  } else {
    drawDiscard(x, y);
  }
}

function drawDiscard(x, y) {
  fill(cDISCARDBLACK)
  rect(x, y, DISCARD_LOG_AREA_W, DISCARD_LOG_AREA_H);

  let discardPileJson = hanabimsg.discard_pile;
  let discardMap = {
    "B": [],
    "G": [],
    "R": [],
    "W": [],
    "Y": []
  };

  // discardPileJsonからcolorとrankを取り出してマップに追加
  discardPileJson.forEach(card => {
    if (discardMap[card.color]) {
      discardMap[card.color].push(card.rank);
    }
  });


  textAlign(LEFT, TOP)
  let DISCARD_PILE_FONT_SIZE = (DISCARD_LOG_AREA_H - PADDING * 2) / 6; // 6行なのでフォントサイズを高さの6分の1に設定
  // customLog(`DISCARD_PILE_FONT_SIZE: ${DISCARD_PILE_FONT_SIZE}`);
  textSize(DISCARD_PILE_FONT_SIZE);

  // discardMapを描画
  let tmpY = y + PADDING;

  fill(cWHITE)
  text("DISCARD", x + PADDING * 2, tmpY);

  tmpY += DISCARD_PILE_FONT_SIZE;

  for (let color in discardMap) {
    // 色に応じてテキストの色を変更
    switch (color) {
      case "B":
        fill(cBLUE); // 青 (Blue)
        break;
      case "G":
        fill(cGREEN); // 緑 (Green)
        break;
      case "R":
        fill(cRED); // 赤 (Red)
        break;
      case "W":
        fill(cWHITE); // 白 (White)
        break;
      case "Y":
        fill(cYELLOW); // 黄色 (Yellow)
        break;
      default:
        fill(cBLACK); // デフォルトで黒色
    }

    // ランクを小さい順にソート
    discardMap[color].sort((a, b) => a - b);
    let textOutput = `${color}: ${discardMap[color].length > 0 ? discardMap[color].join(' ') : '0'}`;

    // console.log(`x: ${x}, y: ${tmpY}, textOutput: ${textOutput}`);
    text(textOutput, x + PADDING * 2, tmpY);
    tmpY += DISCARD_PILE_FONT_SIZE;
  }
};

function drawLog(x, y) {
  fill(cBLACK);
  rect(x, y, DISCARD_LOG_AREA_W, DISCARD_LOG_AREA_H);

  if (!hanabimsg.gui_log_history) return;

  textAlign(LEFT, TOP);
  fill(cWHITE);  // テキスト色
  textSize(16);

  let logHistory = hanabimsg.gui_log_history;

  // DISCARD_LOG_AREA_Hに応じて表示するログの最大数を動的に設定
  let lineHeight = 22;
  let maxLogsToShow = Math.floor(DISCARD_LOG_AREA_H / lineHeight);

  // 表示するログの開始と終了位置を計算
  let start = max(logHistory.length - maxLogsToShow, 0);
  let end = logHistory.length;
  let logsToShow = logHistory.slice(start, end);

  // 表示領域の設定
  push();
  translate(x, y);
  for (let i = 0; i < logsToShow.length; i++) {
    let log = logsToShow[i];
    if (i * lineHeight < DISCARD_LOG_AREA_H) { // 表示領域の高さ内に収める
      text(log, PADDING, i * lineHeight + PADDING);  // 行間隔を調整
    }
  }
  pop();

  // 表示領域の枠を描画
  noFill();
  stroke(0);
  rect(x, y, DISCARD_LOG_AREA_W, DISCARD_LOG_AREA_H);
}

function drawGameEnd(game_id) {
  // スコアを計算する
  let score = hanabimsg.fireworks["B"] + hanabimsg.fireworks["G"] + hanabimsg.fireworks["R"] + hanabimsg.fireworks["W"] + hanabimsg.fireworks["Y"];

  // myHandのボタン要素をすべて削除する
  let myHandButtons = selectAll('button');
  myHandButtons.forEach(button => {
    button.remove();
  });

  // 確認用に，相手のカードのボタン要素を再度作成する
  let yourHand = hanabimsg.observed_hands[1];
  let yourKnowledge = hanabimsg.card_knowledge[1];
  for (let i = 0; i < yourHand.length; i++) {
    let cardX = canLeft + i * CARD_W;
    let cardY = canTop;
    yourCards.push(new Card(cardX, cardY, yourHand[i].color, yourHand[i].rank,
      'your', i, yourKnowledge[i].color, yourKnowledge[i].rank, isNotGameEnd = false));
  }

  drawAiName(canTop, canLeft)

  let txt = `GAME END! SCORE: ${score} \nタッチして次へ`;
  // ゲーム終了メッセージを表示するボタンを作成する
  let gameEndButton = createButton(txt);

  // フォントサイズを調整してテキストが横幅を超えないようにする
  let tSize = CARD_H / 2; // 初期フォントサイズ（高さの1/2）
  this.textSize(tSize);

  // テキストが横幅を超えている場合、フォントサイズを縮小
  while (this.textWidth(txt) > canW - 10 && tSize > 12) { // 最小フォントサイズは12
    tSize -= 1;
    this.textSize(tSize);
  }

  gameEndButton.position(canLeft, canBottom - CARD_H);
  gameEndButton.size(canW, CARD_H);
  gameEndButton.attribute('aria-label', 'game_end'); // Playwrightのnameに影響を与える属性
  // ボタンのスタイルを「例」に合わせて設定
  gameEndButton.style('color', 'white'); // テキストカラー
  gameEndButton.style('background-color', cCRIMSON); // 背景色
  gameEndButton.style('border', '2px solid black'); // 黒いふち
  gameEndButton.style('border-radius', '10px'); // 角丸にする
  gameEndButton.style('font-size', `${tSize}px`); // フォントサイズを設定 (適宜変更)
  gameEndButton.style('font-weight', 'bold'); // 太字に設定
  gameEndButton.style('text-align', 'center'); // テキストを中央に
  gameEndButton.style('padding', '15px 10px'); // 内側の余白を設定
  gameEndButton.style('box-shadow', '0px 4px 6px rgba(0, 0, 0, 0.3)'); // 上面に影を追加


  gameEndButton.mousePressed(() => {
    socket.emit('game_end', JSON.stringify({'room_id':room_id}));
    window.location.href = '/game_survey/' + game_id;
  });
}
// UI描画関数ここまで  -------------------------------------------------------


// 各プレイヤのプレイエリアを四角形で描画
// 主に手番か否かを示す
class EachPlayArea {
  constructor() {
    this.POS = {
      MY_X: canLeft,
      MY_Y: canBottom - EACH_PLAY_AREA_H,
      YOUR_X: canLeft,
      YOUR_Y: canTop,
    };
    // customLog(`MY_X: ${this.POS.MY_X}, MY_Y: ${this.POS.MY_Y}, YOUR_X: ${this.POS.YOUR_X}, YOUR_Y: ${this.POS.YOUR_Y}`)
  }

  // 自分のカードを指すバーを描画
  myDraw(is_current_player) {
    this.changeColor(is_current_player)
    noStroke(); // 輪郭を消す
    rect(this.POS.MY_X, this.POS.MY_Y, EACH_PLAY_AREA_W, EACH_PLAY_AREA_H);
  }

  // 相手のカードを指すバーを描画
  yourDraw(is_current_player) {
    this.changeColor(is_current_player)
    noStroke(); // 輪郭を消す
    rect(this.POS.YOUR_X, this.POS.YOUR_Y, EACH_PLAY_AREA_W, EACH_PLAY_AREA_H);
  }

  // バーの色を変更
  changeColor(is_current_player) {
    if (is_current_player) {
      fill(cKHAKI); // 自分の手番の場合，ちょっと薄い黄色
    } else {
      fill(cGAINSBORO); // 相手の手番の場合，ちょっと薄い灰色
    }
  }
}

// カードクラス
class Card {

  constructor(x, y, color, number, my_or_your, cardIndex, hintedColor = null, hintedRank = null, isNotGameEnd = true, isTurn = false) {
    this.POS = {
      X: x,
      Y: y,
    };
    this.color = color;
    this.number = number; //0-indexedなので+1
    this.my_or_your = my_or_your;
    this.button = null; // ボタン要素を保持
    this.isToggled = false; // ON・OFFの状態を保持
    this.actionButtons = []; // アクションボタン要素を保持

    this.cardIndex = cardIndex;
    this.hintedRank = hintedRank; //0-indexedなので+1
    this.hintedColor = hintedColor;

    this.isNotGameEnd = isNotGameEnd;

    this.createCardButton(isTurn); //ボタン（カード）を作成
    this.drawHintedInfo(); // ヒント情報を描画
  }

  // ボタン（カード）を作成
  createCardButton(isTurn) {
    // customLog(`this.color: ${this.color}, this.number: ${this.number}, this.my_or_your: ${this.my_or_your}`);
    let labelText;
    if (this.my_or_your === "my") {
      labelText = "";
    } else if (this.my_or_your === "your") {
      labelText = (this.number + 1).toString(); // 0-indexedなので+1
    }
    // const labelText = this.my_or_your === "my" ? "" : this.number ? this.number.toString() : "";
    this.button = createButton(labelText);
    if(!isTurn){
      this.button.attribute("disabled", "");
    }
    let ariaLabel = `card_${this.cardIndex}`;
    this.button.attribute('aria-label', ariaLabel); // Playwrightのnameに影響を与える属性
    this.adjustCardPosition(); // カードの座標を調整
    this.button.size(CARD_W, CARD_H);

    // カードのデザイン（スタイルをカードらしく設定）
    this.updateCardStyle();
    console.log(`isNotGameEnd: ${this.isNotGameEnd}`);
    // ボタンがクリックされたときの処理
    this.button.mousePressed(() => {
      if (!this.isNotGameEnd) return;
      customLog(`カード ${this.color} がクリックされました！`);
      this.toggleActionButtons();
    });
  }

  drawHintedInfo() {
    // console.log(`hintedColor: ${this.hintedColor}, hintedRank: ${this.hintedRank}`);

    let hintedColorText
    let hintedRankText
    if (this.hintedColor === null) {
      hintedColorText = "?";
    } else {
      hintedColorText = this.hintedColor;
    }

    if (this.hintedRank === null) {
      hintedRankText = "?";
    } else {
      hintedRankText = this.hintedRank + 1 // 0-indexedなので+1
    }

    let hintedText = `${hintedColorText},${hintedRankText}`;

    if (this.my_or_your === "my") {
      // customLog(`my hintedText: ${hintedText}`);
      rectWithText(this.POS.X + CARD_W * (1 / 6), canBottom - CARD_H - HINTED_BOX_H, HINTED_BOX_W, HINTED_BOX_H, hintedText, cBLACK, cLIGHTSTEELBLUE);
    } else if (this.my_or_your === "your") {
      // customLog(`your hintedText: ${hintedText}`);
      rectWithText(this.POS.X + CARD_W * (1 / 6), CARD_H, HINTED_BOX_W, HINTED_BOX_H, hintedText, cBLACK, cLIGHTSTEELBLUE);
    }
  }

  // カードの位置を調整
  adjustCardPosition() {
    if (this.my_or_your === "my") {
      this.POS.Y = canBottom - CARD_H; // カードの下端をcanBottomに合わせる
    } else if (this.my_or_your === "your") {
      this.POS.Y = canTop; // カードの上端をcanTopに合わせる
    }
    // customLog(`POS.X: ${this.POS.X},POS.Y: ${this.POS.Y}`)
    this.button.position(this.POS.X, this.POS.Y);
  }

  // カードのスタイルを更新
  updateCardStyle() {
    const colorMap = {
      "B": cBLUE,
      "R": cRED,
      "G": cGREEN,
      "W": cWHITE,
      "Y": cYELLOW,
      null: cGRAY
    };
    const textColorMap = {
      "B": cWHITE,
      "R": cWHITE,
      "G": cWHITE,
      "W": cBLACK,
      "Y": cBLACK,
      null: cBLACK
    };

    const backgroundColor = colorMap[this.color] || "#FFFFFF";
    const textColor = textColorMap[this.color] || "#000000";

    const fontSize = Math.max(12, Math.min(CARD_W / 2, CARD_H / 2)); // カードのサイズに応じてフォントサイズを変更

    if (this.isToggled) {
      if (this.my_or_your === "my") {
        this.button.style('background-color', cDARKBULE);
      } else {
        this.button.style('background-color', backgroundColor);
      }
      this.button.style('color', textColor);
      this.button.style('border', '2px solid black'); // 黒いふちを追加
      this.button.style('border-radius', '10px');
      this.button.style('font-size', `${fontSize}px`);
      this.button.style('font-weight', 'bold'); // 太字に設定
      this.button.style('text-align', 'center');
      this.button.style('box-shadow', 'inset 0px 6px 8px rgba(0, 0, 0, 0.2), inset 0px 10px 20px rgba(0, 0, 0, 0.1)'); // へこませる効果
      this.button.style('padding', '15px 10px');
      this.button.style('transition', 'box-shadow 0.2s, transform 0.5s, opacity 0.5s');
    } else {
      this.button.style('background-color', backgroundColor);
      this.button.style('color', textColor);
      this.button.style('border', '2px solid black'); // 黒いふちを追加
      this.button.style('border-radius', '10px');
      this.button.style('font-size', `${fontSize}px`);
      this.button.style('font-weight', 'bold');
      this.button.style('text-align', 'center');
      this.button.style('box-shadow', '0px 6px 8px rgba(0, 0, 0, 0.2), 0px 10px 20px rgba(0, 0, 0, 0.1)'); // 通常のスタイル
      this.button.style('padding', '15px 10px');
      this.button.style('transition', 'box-shadow 0.2s, transform 0.5s, opacity 0.5s');
    }
  }

  // アクションボタンの表示・非表示を切り替える
  toggleActionButtons() {
    if (this.isToggled) {
      this.isToggled = false;
      this.updateCardStyle();
      this.hideActionButtons();
    } else {
      // 他のカードのトグルを解除
      let cardsToReset = myCards.concat(yourCards);
      cardsToReset.forEach(card => {
        if (card !== this && card.isToggled) {
          card.isToggled = false;
          card.hideActionButtons();
          card.updateCardStyle();
        }
      });
      this.isToggled = true;
      this.updateCardStyle();
      this.showActionButtons();
    }
  }

  // アクションボタンを表示
  showActionButtons() {
    const colorMap = {
      "B": cBLUE,
      "R": cRED,
      "G": cGREEN,
      "W": cWHITE,
      "Y": cYELLOW,
      "UNKNOWN": cGRAY
    };
    const textColorMap = {
      "B": cWHITE,
      "R": cWHITE,
      "G": cWHITE,
      "W": cBLACK,
      "Y": cBLACK,
      "UNKNOWN": cBLACK
    };

    const buttonWidth = CARD_W - percentCanW(5);
    const buttonHeight = canW / 2 - percentCanW(5);
    const margin = percentCanW(4);
    const fontSize = Math.max(12, Math.min(CARD_W / 5, CARD_H / 5)); // カードのサイズに応じてフォントサイズを変更

    // "場に出す"ボタン
    if (this.my_or_your === "my") {
      let playButton = createButton("場に出す");
      playButton.position(canLeft, canBottom / 2 - buttonHeight / 2);
      playButton.size(buttonWidth, buttonHeight);
      playButton.style('background-color', '#007BFF');
      playButton.style('color', 'white');
      playButton.style('border', 'none');
      playButton.style('border', '2px solid black'); // 黒いふちを追加
      playButton.style('font-weight', 'bold');
      playButton.style('border-radius', '5px');
      playButton.style('writing-mode: vertical-rl;');
      playButton.style('text-orientation: upright;');
      playButton.style('font-size', `${fontSize}px`);
      playButton.style('box-shadow', '0px 6px 8px rgba(0, 0, 0, 0.2), 0px 10px 20px rgba(0, 0, 0, 0.1)'); // 通常のスタイル
      playButton.style('text-align', 'center');
      playButton.style(`display: flex;`);
      playButton.style(`justify-content: center;`);
      playButton.style(`align-items: center;`);
      playButton.style('padding', '10px');

      playButton.mousePressed(() => {
        customLog(`カード ${this.color} を場に出しました。`);
        playButton.style('transform', 'scale(0.95)'); // クリックアニメーション
        this.createActionJson({ actionType: "PLAY", cardIndex: this.cardIndex });
        setTimeout(() => {
          playButton.style('transform', 'scale(1)');
          this.animateAndRemove(); // カードを場に出すのでアニメーション後に削除
        }, 200);
      });
      this.actionButtons.push(playButton);

      // "捨てる"ボタン
      let discardButton = createButton("捨てる");
      discardButton.position(canRight - buttonWidth, canBottom / 2 - buttonHeight / 2);
      discardButton.size(buttonWidth, buttonHeight);
      discardButton.style('background-color', '#FF4136');
      discardButton.style('color', 'white');
      discardButton.style('border', 'none');
      discardButton.style('border', '2px solid black'); // 黒いふちを追加
      discardButton.style('font-weight', 'bold');
      discardButton.style('writing-mode: vertical-rl;');
      discardButton.style('text-orientation: upright;');
      discardButton.style('border-radius', '5px');
      discardButton.style('font-size', `${fontSize}px`);
      discardButton.style('box-shadow', '0px 6px 8px rgba(0, 0, 0, 0.2), 0px 10px 20px rgba(0, 0, 0, 0.1)'); // 通常のスタイル
      discardButton.style('text-align', 'center');
      discardButton.style(`display: flex;`);
      discardButton.style(`justify-content: center;`);
      discardButton.style(`align-items: center;`);
      discardButton.style('padding', '10px');
      discardButton.mousePressed(() => {
        customLog(`カード ${this.color} を捨てました。`);
        discardButton.style('transform', 'scale(0.95)'); // クリックアニメーション
        this.createActionJson({ actionType: "DISCARD", cardIndex: this.cardIndex });
        setTimeout(() => {
          discardButton.style('transform', 'scale(1)');
          this.animateAndRemove(); // カードを捨てるのでアニメーション後に削除
        }, 200);
      });
      this.actionButtons.push(discardButton);

    } else if (this.my_or_your === "your" && hanabimsg.information_tokens > 0) {
      // "色のヒントを出す"ボタン
      let colorHintButton = createButton(`${this.color}のヒントを出す`);
      colorHintButton.position(canLeft, canBottom / 2 - buttonHeight / 2);
      colorHintButton.size(buttonWidth, buttonHeight);
      colorHintButton.style('background-color', colorMap[this.color] || '#6C757D');
      colorHintButton.style('color', textColorMap[this.color] || 'white');
      colorHintButton.style('border', 'none');
      colorHintButton.style('border', '2px solid black'); // 黒いふちを追加
      colorHintButton.style('border-radius', '5px');
      colorHintButton.style('writing-mode: vertical-rl;');
      colorHintButton.style('text-orientation: upright;');
      colorHintButton.style('font-size', `${fontSize}px`);
      colorHintButton.style('box-shadow', '0px 6px 8px rgba(0, 0, 0, 0.2), 0px 10px 20px rgba(0, 0, 0, 0.1)'); // 通常のスタイル
      colorHintButton.style('font-weight', 'bold');
      colorHintButton.style('text-align', 'center');
      colorHintButton.style(`display: flex;`);
      colorHintButton.style(`justify-content: center;`);
      colorHintButton.style(`align-items: center;`);
      colorHintButton.style('padding', '10px');
      colorHintButton.mousePressed(() => {
        customLog(`プレイヤーに ${this.color} のヒントを出しました。`);
        colorHintButton.style('transform', 'scale(0.95)'); // クリックアニメーション
        this.createActionJson({ actionType: "REVEAL_COLOR", revealColor: this.color });
        setTimeout(() => {
          colorHintButton.style('transform', 'scale(1)');
          this.hideActionButtons(); // アクションボタンのみ削除
          this.isToggled = false; // カードの選択状態をOFFにする
          this.updateCardStyle();
        }, 200);
      });

      this.actionButtons.push(colorHintButton);

      // "数字のヒントを出す"ボタン
      let numberHintButton = createButton(`${this.number + 1}のヒントを出す`); // 0-indexedなので+1
      numberHintButton.position(canRight - buttonWidth, canBottom / 2 - buttonHeight / 2);
      numberHintButton.size(buttonWidth, buttonHeight);
      numberHintButton.style('background-color', '#6C757D');
      numberHintButton.style('color', 'white');
      numberHintButton.style('border', 'none');
      numberHintButton.style('border', '2px solid black'); // 黒いふちを追加
      numberHintButton.style('font-weight', 'bold');
      numberHintButton.style('writing-mode: vertical-rl;');
      numberHintButton.style('text-orientation: upright;');
      numberHintButton.style('border-radius', '5px');
      numberHintButton.style('font-size', `${fontSize}px`);
      numberHintButton.style('box-shadow', '0px 6px 8px rgba(0, 0, 0, 0.2), 0px 10px 20px rgba(0, 0, 0, 0.1)'); // 通常のスタイル
      numberHintButton.style('text-align', 'center');
      numberHintButton.style(`display: flex;`);
      numberHintButton.style(`justify-content: center;`);
      numberHintButton.style(`align-items: center;`);
      numberHintButton.style('padding', '10px');
      numberHintButton.mousePressed(() => {
        customLog(`プレイヤーに ${this.number} のヒントを出しました。`);
        numberHintButton.style('transform', 'scale(0.95)'); // クリックアニメーション
        this.createActionJson({ actionType: "REVEAL_RANK", revealRank: (this.number + 1) }); // 0-indexedなので+1
        setTimeout(() => {
          numberHintButton.style('transform', 'scale(1)');
          this.hideActionButtons(); // アクションボタンのみ削除
          this.isToggled = false; // カードの選択状態をOFFにする
          this.updateCardStyle();
        }, 200);
      });

      this.actionButtons.push(numberHintButton);
    }else if (this.my_or_your === "your" && hanabimsg.information_tokens <= 0){
      // "ヒントトークンがありません"ボタン
      let noHintButton = createButton(`ヒントトークンがありません`); // 0-indexedなので+1
      noHintButton.position(canLeft, CARD_H + HINTED_BOX_H + PADDING + FOUR_SPLIT_H + PADDING);
      noHintButton.size(canW, buttonHeight/4);
      noHintButton.style('background-color', '#6C757D');
      noHintButton.style('color', 'white');
      noHintButton.style('border', 'none');
      noHintButton.style('border', '2px solid black'); // 黒いふちを追加
      noHintButton.style('font-weight', 'bold');
      noHintButton.style('text-orientation: upright;');
      noHintButton.style('border-radius', '5px');
      noHintButton.style('font-size', `${fontSize}px`);
      noHintButton.style('box-shadow', '0px 6px 8px rgba(0, 0, 0, 0.2), 0px 10px 20px rgba(0, 0, 0, 0.1)'); // 通常のスタイル
      noHintButton.style('text-align', 'center');
      noHintButton.style(`display: flex;`);
      noHintButton.style(`justify-content: center;`);
      noHintButton.style(`align-items: center;`);
      noHintButton.style('padding', '10px');
      noHintButton.mousePressed(() => {
        setTimeout(() => {
          this.hideActionButtons(); // アクションボタンのみ削除
          this.isToggled = false; // カードの選択状態をOFFにする
          this.updateCardStyle();
        }, 200);
      });

      this.actionButtons.push(noHintButton);
    }
  }

  // アクションボタンを非表示にする
  hideActionButtons() {
    if (this.actionButtons) {
      this.actionButtons.forEach(button => button.remove());

    }
    this.actionButtons = [];
  }

  // カードの削除アニメーションと削除
  animateAndRemove() {
    if (this.my_or_your === "my" && this.button) {
      // myカードの場合は削除アニメーションを適用
      this.button.style('transition', 'transform 0.5s ease-in, opacity 0.5s ease-in');
      this.button.style('transform', 'translateY(-100px)');
      this.button.style('opacity', '0');
      setTimeout(() => this.remove(), 500); // アニメーション後に削除
    } else if (this.my_or_your === "your") {
      // yourカードの場合はactionButtonsのみ削除し、カードの選択状態をOFFにする
      this.hideActionButtons();
      this.isToggled = false;
      this.updateCardStyle();
    }
  }

  // カードの削除
  remove() {
    if (this.button && this.my_or_your === "my") {
      this.button.remove();
    }
    if (this.actionButtons) {
      this.actionButtons.forEach(button => button.remove());
    }
  }

  createActionJson({ actionType, cardIndex, revealColor, revealRank }) {
    let action;
    if (actionType === "PLAY" || actionType === "DISCARD") {
      action = {
        "action_type": actionType,
        "card_index": cardIndex
      };
    } else if (actionType === "REVEAL_COLOR") {
      action = {
        "action_type": actionType,
        "color": revealColor,
        "target_offset": 1
      };
    } else if (actionType === "REVEAL_RANK") {
      action = {
        "action_type": actionType,
        "rank": revealRank,
        "target_offset": 1
      };
    }

    customLog(action);

    let jsonAction = JSON.stringify({ 'room_id': room_id, 'action': action });
    socket.emit('action', jsonAction);
  };
}

