let socket;
let serverMessage = '';  // サーバーからのメッセージを保持する変数
let room_id = '';
let hanabimsg = {};   // サーバーから受信した観測情報を保持する変数
let button_clickable = true;
let timeoutDate = null;


// let mySound;
// function preload() {
//   soundFormats('mp3', 'ogg');
//   mySound = loadSound('static\\push.mp3');
// }

function setup() {
  createCanvas(1280, 800);
  frameRate(10);
  // WebSocketの接続を初期化
  // サーバーのip:portに変える必要がある
  socket = io.connect('http://' + document.domain + ':' + location.port);

  // サーバー接続成功時の処理
  socket.on('connect', function () {
    console.log('Connected to server');
    // クライアントからサーバーにメッセージを送信
    //socket.emit('client_message', 'Hello from Client');
  });

  socket.on('room_id', (data) => {
    room_id = data
  });

  // 切断時の処理
  //  socket.on('disconnect', function () {
  //    console.log('Disconnected from server');
  //  });

  // サーバーからhanabimsg-jsonを受信
  socket.on('hanabimsg', function (data) {
    removeElements();
    hanabimsg = JSON.parse(data);
    console.log("Received hanabimsg-json: ", hanabimsg);
    background(BACKGROUND_COLOR);
    drawStatus(PADDING, height - PADDING);
    drawDiscardPile(DISCARD_PILE_AREA_X, DISCARD_PILE_AREA_Y);
    drawFireworks(PADDING, PADDING);
    drawMyHand(300, 600);
    drawOpponentHand(300, 100);
    drawHintButtons(900, 10);
    drawActionHistory(300, 300, 200, 900);
    timeoutDate = new Date(hanabimsg.timeout);
  });

  socket.on('game_end', function (data) {
    drawGameEnd();
    let bttn;
    bttn = createButton("GO TO SURVEY PAGE");
    console.log('game_id', data);


    bttn.mousePressed(function () {
      socket.emit('game_end', JSON.stringify({'room_id':room_id}));
      window.location.href = '/game_survey/' + data.game_id;
      // window.location.href = 'home'; //終了後直でhome画面に飛ぶ場合
    });
  });
  socket.on('finish_process', function (data) {
    button_clickable = true;
  });

  textLayer = createGraphics(100, 100);
  textLayer.textSize(32);
  textLayer.clear();
}

const MAX_LIFE_TOKENS = 3;
const MAX_INFORMATION_TOKENS = 8;
const MAX_DECK_SIZE = 40;

const PADDING = 10;
const TOKENS_FONT_SIZE = 32;
const BACKGROUND_COLOR = 250;

const NON_ACTIVE_STAIRS_COLOR = 200;
const STAIR_FONT_COLOR = 0;
const STAIR_FONT_SIZE = 32;
const SMALLEST_STAIR_HEIGHT = 40;
const STAIR_STEP = 20;
const STAIR_WIDTH = 40;

const DISCARD_PILE_AREA_WIDTH = 330;
const DISCARD_PILE_AREA_HEIGHT = 200;
const DISCARD_PILE_AREA_X = 940;
const DISCARD_PILE_AREA_Y = 590;
const DISCARD_PILE_AREA_COLOR = 40;
const DISCARD_PILE_FONT_COLOR = 180;
const DISCARD_PILE_FONT_SIZE = 32;

function createActionJson({ actionType, cardIndex, revealColor, revealRank }) {
  let action;

  // mySound.play();

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

  console.log(action);

  let jsonAction = JSON.stringify({ 'room_id': room_id, 'action': action });
  socket.emit('action', jsonAction);
};

// legal_moves から合法な REVEAL_COLOR と REVEAL_RANK のみフィルタリング
function filterLegalHints() {
  let legalHints = hanabimsg.legal_moves;
  let colorHints = legalHints.filter(move => move.action_type === "REVEAL_COLOR");
  let rankHints = legalHints.filter(move => move.action_type === "REVEAL_RANK");
  return { colorHints, rankHints };
}

function drawHintButtons(x, y) {
  let { colorHints, rankHints } = filterLegalHints();

  // ボタン描画のy位置を調整するためのオフセット
  let yOffset = 0;

  // 色ヒントボタンを描画
  colorHints.forEach(hint => {
    drawRevealColorButton(x, y + yOffset, hint.color);
    yOffset += 30;  // ボタンの間隔を空ける
  });

  // ランクヒントボタンを描画
  rankHints.forEach(hint => {
    drawRevealRankButton(x, y + yOffset, hint.rank);
    yOffset += 30;  // ボタンの間隔を空ける
  });
}

function drawRevealColorButton(x, y, revealColor) {
  let revealColorButton;
  revealColorButton = createButton("REVEAL_COLOR: " + revealColor);
  revealColorButton.position(x, y);
  revealColorButton.style('width', '200px');
  revealColorButton.mousePressed(function () {
    if (button_clickable) {
      createActionJson({ actionType: "REVEAL_COLOR", revealColor: revealColor });
      button_cllickable = false;
    }
  });
};

function drawRevealRankButton(x, y, revealRank) {
  let revealRankButton;
  revealRankButton = createButton("REVEAL_RANK: " + revealRank);
  revealRankButton.position(x, y);
  revealRankButton.style('width', '200px');
  revealRankButton.mousePressed(function () {
    if (button_clickable) {
      createActionJson({ actionType: "REVEAL_RANK", revealRank: revealRank });
      button_clickable = false;
    }

  });
};

function drawPlayButton(x, y, cardIndex) {
  let playButton;
  playButton = createButton("PLAY");
  playButton.position(x, y);
  playButton.mousePressed(function () {
    if (button_clickable) {
      createActionJson({ actionType: "PLAY", cardIndex: cardIndex });
      button_clickable = false;
    }
  });
};

function drawDiscardButton(x, y, cardIndex) {
  let discardButton;
  discardButton = createButton("DISCARD");
  discardButton.position(x, y);

  discardButton.mousePressed(function () {
    if (button_clickable) {
      createActionJson({ actionType: "DISCARD", cardIndex: cardIndex });
      butoon_clickable = false;
    }
  });
};

function drawCard(x, y, card, hintInfo) {
  let cardColor = card.color;
  let cardRank = card.rank;
  let cardWidth = 80;
  let cardHeight = 120;
  let cardColorMap = {
    "B": `blue`, // 青 (Blue)
    "G": `green`, // 緑 (Green)
    "R": `red`, // 赤 (Red)
    "W": `white`, // 白 (White)
    "Y": `yellow` // 黄色 (Yellow)
  };

  if (cardColor === null) {
    fill(`black`);
  } else {
    fill(cardColorMap[cardColor]);
  }
  rect(x, y, cardWidth, cardHeight);

  fill(0);
  textSize(32);
  if (cardRank === -1) {
    fill(255);
    text(`?`, x + 5, y + 32);
  } else {
    text(`${cardRank + 1}`, x + 5, y + 32);
  }
};

// let my_pid = 0;
// let op_pid = 1;
// websocket_player_pidを受け取れた場合の処理

function drawHint(x, y, hintInfo) {
  // ヒント情報を描画（カードの上部）
  if (hintInfo) {
    fill(0);
    textSize(24);
    if (hintInfo.rank == null) {
      view_rank = '?';
    } else {
      view_rank = hintInfo.rank + 1;
    }
    text(
      `${hintInfo.color || '?'} ${view_rank}`,
      x + 80 / 2,
      y - 10
    );
  }
}

function drawOpponentHand(x, y) {
  let opHand = hanabimsg.observed_hands[1];
  for (let i = 0; i < opHand.length; i++) {
    let card = opHand[i];
    let cardX = x + i * 100;
    let cardY = y;
    drawCard(cardX, cardY, card);
  }

  // hanabimsgのcard_knowledgeから情報を取得
  let oppKnowledge = hanabimsg.card_knowledge[1];
  console.log('oppKnowledge', oppKnowledge);
  for (let cid = 0; cid < oppKnowledge.length; cid++) {
    let each_card_knowlege = oppKnowledge[cid];
    drawHint(300 + cid * 100, 100, each_card_knowlege);
  }
};

function drawMyHand(x, y) {
  let myHand = hanabimsg.observed_hands[0];
  for (let i = 0; i < myHand.length; i++) {
    let card = myHand[i];
    let cardX = x + i * 100;
    let cardY = y;
    drawCard(cardX, cardY, card);
    drawPlayButton(cardX, cardY + 120, i);
    drawDiscardButton(cardX, cardY + 150, i);
  }

  // hanabimsgのcard_knowledgeから情報を取得
  let myKnowledge = hanabimsg.card_knowledge[0];
  console.log('myKnowledge', myKnowledge);
  for (let cid = 0; cid < myKnowledge.length; cid++) {
    let each_card_knowlege = myKnowledge[cid];
    drawHint(300 + cid * 100, 600, each_card_knowlege);
  }
};

function drawDiscardArea(x, y, width, height, color) {
  fill(color);
  rect(x, y, width, height);
  fill(DISCARD_PILE_FONT_COLOR);
  textSize(DISCARD_PILE_FONT_SIZE);
  text(`DISCARD`, x + PADDING, y + DISCARD_PILE_FONT_SIZE);
};

function drawDiscardPile(x, y) {
  drawDiscardArea(x, y, DISCARD_PILE_AREA_WIDTH, DISCARD_PILE_AREA_HEIGHT, DISCARD_PILE_AREA_COLOR);

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

  textSize(DISCARD_PILE_FONT_SIZE); // テキストサイズを指定

  // discardMapを描画
  tmpY = y + DISCARD_PILE_FONT_SIZE * 2;
  for (let color in discardMap) {
    // 色に応じてテキストの色を変更
    switch (color) {
      case "B":
        fill(`blue`); // 青 (Blue)
        break;
      case "G":
        fill(`green`); // 緑 (Green)
        break;
      case "R":
        fill(`red`); // 赤 (Red)
        break;
      case "W":
        fill(`white`); // 白 (White)
        break;
      case "Y":
        fill(`yellow`); // 黄色 (Yellow)
        break;
      default:
        fill(0); // デフォルトで黒色
    }

    // ランクを小さい順にソート
    discardMap[color].sort((a, b) => a - b);
    let textOutput = `${color}: ${discardMap[color].length > 0 ? discardMap[color].join(' ') : '0'}`;

    text(textOutput, x + PADDING, tmpY);
    tmpY += DISCARD_PILE_FONT_SIZE;
  }
};

function drawStatus(tokensTextBoxX, tokensTextBoxY) {
  drawLifeTokens(tokensTextBoxX, tokensTextBoxY, TOKENS_FONT_SIZE);
  drawInformationTokens(tokensTextBoxX, tokensTextBoxY - TOKENS_FONT_SIZE, TOKENS_FONT_SIZE);
  drawDeckSize(tokensTextBoxX, tokensTextBoxY - 2 * TOKENS_FONT_SIZE, TOKENS_FONT_SIZE);
};

function drawDeckSize(x, y, fontSize) {
  fill(`black`);
  textSize(fontSize);
  text(`DECK: ${hanabimsg.deck_size} / ${MAX_DECK_SIZE}`, x, y);
};

function drawLifeTokens(x, y, fontSize) {
  fill(`red`);
  textSize(fontSize);
  text(`LIFE: ${hanabimsg.life_tokens} / ${MAX_LIFE_TOKENS}`, x, y);
};

function drawInformationTokens(x, y, fontSize) {
  fill(`blue`);
  textSize(fontSize);
  text(`INFO: ${hanabimsg.information_tokens} / ${MAX_INFORMATION_TOKENS}`, x, y);
};

function drawStairs(stairX, stairY, activeNumber, activeColor) {
  for (let num = 1; num <= 5; num++) {

    let stepX = stairX + STAIR_WIDTH * (num - 1);
    let stepY = stairY;
    let stepHeight = SMALLEST_STAIR_HEIGHT + STAIR_STEP * (num - 1);
    let stepWidth = STAIR_WIDTH;

    if (num <= activeNumber) {
      fill(activeColor);
    } else {
      fill(NON_ACTIVE_STAIRS_COLOR);
    }
    rect(stepX, stepY, stepWidth, stepHeight);

    fill(STAIR_FONT_COLOR);
    textSize(STAIR_FONT_SIZE);
    text(`${num}`, stepX + stepWidth / 4, stepY + STAIR_FONT_SIZE);
  }
};

function drawFireworks(fireworksX, fireworksY) {
  for (let color_num = 0; color_num <= 4; color_num++) {
    let stairsColor;
    let stairsNumber;
    switch (color_num) {
      case 0:
        stairsColor = `blue`;
        stairsNumber = hanabimsg.fireworks["B"];
        break;
      case 1:
        stairsColor = `green`;
        stairsNumber = hanabimsg.fireworks["G"];
        break;
      case 2:
        stairsColor = `red`;
        stairsNumber = hanabimsg.fireworks["R"];
        break;
      case 3:
        stairsColor = `white`;
        stairsNumber = hanabimsg.fireworks["W"];
        break;
      case 4:
        stairsColor = `yellow`;
        stairsNumber = hanabimsg.fireworks["Y"];
        break;
    }

    let stairsX = fireworksX;
    let stairsMaxHeight = SMALLEST_STAIR_HEIGHT + STAIR_STEP * 4
    let stairsY = fireworksY + stairsMaxHeight * color_num;
    drawStairs(stairsX, stairsY, stairsNumber, stairsColor);

  }
};

let maxActionsToShow = 10; // 表示するアクションの最大数
// gui_log_historyを描画する関数
function drawActionHistory(x, y, height, width) {
  fill(0);  // テキスト色
  textSize(16);

  let actionHistory = hanabimsg.gui_log_history;

  // アクション履歴の最新5つを表示
  let start = max(actionHistory.length - maxActionsToShow, 0);
  let end = actionHistory.length;
  let actionsToShow = actionHistory.slice(start, end);

  // 表示領域の設定
  push();
  translate(x, y);
  for (let i = 0; i < actionsToShow.length; i++) {
    let action = actionsToShow[i];
    let turnNumber = start + i + 1;
    if (i * 20 < height) { // 高さ内に収める
      text("Turn " + turnNumber + ": " + action, 0, i * 20 + 20);  // 行間隔を調整
    }
  }
  pop();

  // 表示領域の枠を描画
  noFill();
  stroke(0);
  rect(x, y, width, height);
};

function drawGameEnd() {
  // background(220); // 背景をリセット
  // removeElements();
  RESULT_FONT_SIZE = 100;
  textSize(RESULT_FONT_SIZE);
  fill(0);
  let score = hanabimsg.fireworks["B"] + hanabimsg.fireworks["G"] + hanabimsg.fireworks["R"] + hanabimsg.fireworks["W"] + hanabimsg.fireworks["Y"];
  text('GameEnd', width / 2, height / 2);
  text('Score:' + score, width / 2, height / 2 + RESULT_FONT_SIZE);
}

TIME_FONT_SIZE = 32;

function drawRemainingTime(remainingTime) {
  textLayer.background(100);
  textLayer.fill(255); // テキスト色
  textLayer.text("time", 10, 32);
  textLayer.text(remainingTime, 10, 64);
  image(textLayer, 800, 600);
  // fill(0);
  // textSize(TIME_FONT_SIZE);
  // text('Turn Time Limit:' + remainingTime, 300, 550);
}

function draw() {
  if (timeoutDate) {
    const currentDate = new Date();
    const diffMillis = timeoutDate.getTime() - currentDate.getTime();
    remainingTime = Math.floor(diffMillis / 1000);
    console.log(remainingTime);

    if (remainingTime >= 0) {
      drawRemainingTime(remainingTime);
    }


  }
}
