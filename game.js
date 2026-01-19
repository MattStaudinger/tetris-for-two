const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const p1NextCanvas = document.getElementById("p1Next");
const p2NextCanvas = document.getElementById("p2Next");
const p1NextCtx = p1NextCanvas.getContext("2d");
const p2NextCtx = p2NextCanvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const soundToggle = document.getElementById("soundToggle");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");

const p1ScoreEl = document.getElementById("p1Score");
const p1LinesEl = document.getElementById("p1Lines");
const p2ScoreEl = document.getElementById("p2Score");
const p2LinesEl = document.getElementById("p2Lines");
const levelEl = document.getElementById("level");
const totalLinesEl = document.getElementById("totalLines");
const sharedZoneEl = document.getElementById("sharedZone");
const shiftTimerEl = document.getElementById("shiftTimer");
const shiftIntervalInput = document.getElementById("shiftInterval");
const shiftBannerEl = document.getElementById("shiftBanner");
const shiftCountdownEl = document.getElementById("shiftCountdown");
const pointsToLevelEl = document.getElementById("pointsToLevel");

const COLS = 16;
const ROWS = 20;
const BLOCK = 30;
const COMMON_WIDTH = 4;
const DEFAULT_SHARED_START = 6;
const MIN_EXCLUSIVE_WIDTH = 2;
const SHIFT_DEFAULT_MS = 30000;
const SHIFT_ANIM_DURATION = 1200;
const LEVEL_POINTS_STEP = 1000;

canvas.width = COLS * BLOCK;
canvas.height = ROWS * BLOCK;

const COLORS = {
  I: "#5dd7ff",
  J: "#4f6dff",
  L: "#ff9f4a",
  O: "#ffd94a",
  S: "#70e07b",
  T: "#b175ff",
  Z: "#ff6e6e",
};

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

const PIECES = Object.keys(SHAPES);

const audio = {
  ctx: null,
  enabled: true,
};

const state = {
  board: [],
  players: [],
  running: false,
  paused: false,
  lastTime: 0,
  totalLines: 0,
  totalScore: 0,
  level: 1,
  sharedZoneStart: DEFAULT_SHARED_START,
  sharedZoneEnd: DEFAULT_SHARED_START + COMMON_WIDTH - 1,
  zoneShiftCounter: 0,
  shiftIntervalMs: SHIFT_DEFAULT_MS,
  shiftAnimation: {
    active: false,
    from: DEFAULT_SHARED_START,
    to: DEFAULT_SHARED_START,
    elapsed: 0,
    duration: SHIFT_ANIM_DURATION,
  },
};

const playerConfigs = [
  {
    id: "p1",
    zone: { min: 0, max: DEFAULT_SHARED_START + COMMON_WIDTH - 1 },
    dropKey: "s",
    leftKey: "a",
    rightKey: "d",
    rotateKey: "w",
    hardDropKey: " ",
  },
  {
    id: "p2",
    zone: { min: DEFAULT_SHARED_START, max: 15 },
    dropKey: "ArrowDown",
    leftKey: "ArrowLeft",
    rightKey: "ArrowRight",
    rotateKey: "ArrowUp",
    hardDropKey: "Enter",
  },
];

function initBoard() {
  state.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createBag() {
  return shuffle([...PIECES]);
}

function createPlayer(config) {
  return {
    id: config.id,
    zone: { ...config.zone },
    score: 0,
    lines: 0,
    bag: createBag(),
    next: null,
    piece: null,
    dropCounter: 0,
    dropInterval: 800,
  };
}

function updateSharedZoneLabel() {
  if (sharedZoneEl) {
    sharedZoneEl.textContent = `${state.sharedZoneStart + 1}-${
      state.sharedZoneEnd + 1
    }`;
  }
}

function updateShiftTimerLabel() {
  if (!shiftCountdownEl) return;
  if (state.shiftAnimation.active) {
    shiftCountdownEl.textContent = "Shifting";
    if (shiftBannerEl) {
      shiftBannerEl.classList.add("shifting");
      shiftBannerEl.classList.remove("urgent");
    }
    return;
  }
  const timeLeft = Math.max(
    0,
    Math.ceil((state.shiftIntervalMs - state.zoneShiftCounter) / 1000),
  );
  shiftCountdownEl.textContent = `${timeLeft}s`;
  if (shiftBannerEl) {
    shiftBannerEl.classList.toggle("urgent", timeLeft <= 5);
    shiftBannerEl.classList.remove("shifting");
  }
}

function setShiftInterval(seconds) {
  const clamped = Math.max(10, Math.min(180, seconds));
  state.shiftIntervalMs = clamped * 1000;
  state.zoneShiftCounter = 0;
  if (shiftIntervalInput) {
    shiftIntervalInput.value = `${clamped}`;
  }
  updateShiftTimerLabel();
}

function applySharedZone(start) {
  const maxStart = COLS - COMMON_WIDTH - MIN_EXCLUSIVE_WIDTH;
  const minStart = MIN_EXCLUSIVE_WIDTH;
  const clampedStart = Math.max(minStart, Math.min(maxStart, start));
  state.sharedZoneStart = clampedStart;
  state.sharedZoneEnd = clampedStart + COMMON_WIDTH - 1;
  state.players[0].zone = { min: 0, max: state.sharedZoneEnd };
  state.players[1].zone = { min: state.sharedZoneStart, max: COLS - 1 };
  updateSharedZoneLabel();
}

function resetPlayers() {
  state.players = playerConfigs.map((config) => createPlayer(config));
  applySharedZone(state.sharedZoneStart);
  state.players.forEach((player) => {
    player.next = drawFromBag(player);
    spawnPiece(player);
  });
}

function drawFromBag(player) {
  if (player.bag.length === 0) {
    player.bag = createBag();
  }
  return player.bag.pop();
}

function spawnPiece(player) {
  const type = player.next || drawFromBag(player);
  const matrix = SHAPES[type].map((row) => [...row]);
  const startX =
    Math.floor((player.zone.min + player.zone.max) / 2) -
    Math.floor(matrix[0].length / 2);
  const piece = {
    type,
    matrix,
    x: startX,
    y: -1,
  };
  player.next = drawFromBag(player);
  player.piece = piece;
  if (collides(player, piece.matrix, piece.x, piece.y)) {
    gameOver();
  }
}

function rotateMatrix(matrix) {
  const size = matrix.length;
  const rotated = Array.from({ length: size }, () => Array(size).fill(0));
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      rotated[x][size - 1 - y] = matrix[y][x];
    }
  }
  return rotated;
}

function collides(player, matrix, offsetX, offsetY) {
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (!matrix[y][x]) continue;
      const boardX = offsetX + x;
      const boardY = offsetY + y;
      if (boardX < player.zone.min || boardX > player.zone.max) return true;
      if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return true;
      if (boardY >= 0 && state.board[boardY][boardX]) return true;
    }
  }
  return false;
}

function merge(player) {
  player.piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        const boardY = player.piece.y + y;
        const boardX = player.piece.x + x;
        if (boardY >= 0) {
          state.board[boardY][boardX] = player.piece.type;
        }
      }
    });
  });
}

function sweepLines(player) {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (state.board[y].every((cell) => cell)) {
      state.board.splice(y, 1);
      state.board.unshift(Array(COLS).fill(0));
      cleared += 1;
      y += 1;
    }
  }

  if (cleared > 0) {
    player.lines += cleared;
    state.totalLines += cleared;
    player.score += 100 * cleared * cleared;
    updateLevel();
    playSound("line");
  }
}

function updateLevel() {
  const totalScore = state.players.reduce(
    (sum, player) => sum + player.score,
    0,
  );
  state.totalScore = totalScore;
  const newLevel = Math.floor(state.totalScore / LEVEL_POINTS_STEP) + 1;
  if (newLevel !== state.level) {
    state.level = newLevel;
    state.players.forEach((player) => {
      player.dropInterval = Math.max(120, 800 - (state.level - 1) * 60);
    });
  }
}

function updateScoreboard() {
  state.totalScore = state.players.reduce(
    (sum, player) => sum + player.score,
    0,
  );
  p1ScoreEl.textContent = state.players[0].score;
  p1LinesEl.textContent = state.players[0].lines;
  p2ScoreEl.textContent = state.players[1].score;
  p2LinesEl.textContent = state.players[1].lines;
  levelEl.textContent = state.level;
  totalLinesEl.textContent = state.totalLines;
  if (pointsToLevelEl) {
    const nextLevelScore = state.level * LEVEL_POINTS_STEP;
    const remaining = Math.max(0, nextLevelScore - state.totalScore);
    pointsToLevelEl.textContent = `${remaining}`;
  }
}

function drawCell(x, y, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
  ctx.globalAlpha = 1;
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (x >= state.sharedZoneStart && x <= state.sharedZoneEnd) {
        drawCell(x, y, "#1c2346", 0.35);
      } else {
        drawCell(x, y, "#11172e", 0.2);
      }
    }
  }

  drawShiftAnimationHighlight();

  state.board.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        drawCell(x, y, COLORS[cell]);
      }
    });
  });

  state.players.forEach((player) => {
    if (!player.piece) return;
    player.piece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (!value) return;
        const drawX = player.piece.x + x;
        const drawY = player.piece.y + y;
        if (drawY >= 0) {
          drawCell(drawX, drawY, COLORS[player.piece.type]);
        }
      });
    });
  });
}

function drawShiftAnimationHighlight() {
  if (!state.shiftAnimation.active) return;
  const progress = Math.min(
    1,
    state.shiftAnimation.elapsed / state.shiftAnimation.duration,
  );
  const start =
    state.shiftAnimation.from +
    (state.shiftAnimation.to - state.shiftAnimation.from) * progress;
  const x = start * BLOCK;
  const width = COMMON_WIDTH * BLOCK;
  const pulse = 0.5 + Math.sin(progress * Math.PI) * 0.5;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `rgba(96, 170, 255, ${0.35 + pulse * 0.35})`;
  ctx.fillRect(x, 0, width, canvas.height);
  ctx.strokeStyle = `rgba(120, 210, 255, ${0.5 + pulse * 0.4})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, 1.5, width - 3, canvas.height - 3);
  ctx.restore();
}

function drawPreview(ctxPreview, type) {
  ctxPreview.clearRect(0, 0, ctxPreview.canvas.width, ctxPreview.canvas.height);
  const matrix = SHAPES[type];
  const size = matrix.length;
  const block = ctxPreview.canvas.width / 4;
  const offsetX = (ctxPreview.canvas.width - size * block) / 2;
  const offsetY = (ctxPreview.canvas.height - size * block) / 2;
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        ctxPreview.fillStyle = COLORS[type];
        ctxPreview.fillRect(
          offsetX + x * block,
          offsetY + y * block,
          block,
          block,
        );
        ctxPreview.strokeStyle = "rgba(0,0,0,0.4)";
        ctxPreview.strokeRect(
          offsetX + x * block,
          offsetY + y * block,
          block,
          block,
        );
      }
    });
  });
}

function drawUI() {
  drawPreview(p1NextCtx, state.players[0].next);
  drawPreview(p2NextCtx, state.players[1].next);
  updateScoreboard();
}

function move(player, dir) {
  if (!player.piece) return;
  const newX = player.piece.x + dir;
  if (!collides(player, player.piece.matrix, newX, player.piece.y)) {
    player.piece.x = newX;
    playSound("move");
  }
}

function softDrop(player) {
  if (!player.piece) return;
  const newY = player.piece.y + 1;
  if (!collides(player, player.piece.matrix, player.piece.x, newY)) {
    player.piece.y = newY;
  } else {
    lockPiece(player);
  }
}

function hardDrop(player) {
  if (!player.piece) return;
  while (
    !collides(player, player.piece.matrix, player.piece.x, player.piece.y + 1)
  ) {
    player.piece.y += 1;
  }
  lockPiece(player);
  playSound("drop");
}

function rotate(player) {
  if (!player.piece) return;
  const rotated = rotateMatrix(player.piece.matrix);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collides(player, rotated, player.piece.x + kick, player.piece.y)) {
      player.piece.matrix = rotated;
      player.piece.x += kick;
      playSound("rotate");
      return;
    }
  }
}

function lockPiece(player) {
  merge(player);
  sweepLines(player);
  spawnPiece(player);
  playSound("lock");
}

function fitPieceInZone(player) {
  if (!player.piece) return;
  const width = player.piece.matrix[0].length;
  const minX = player.zone.min;
  const maxX = player.zone.max - width + 1;
  if (
    player.piece.x >= minX &&
    player.piece.x <= maxX &&
    !collides(player, player.piece.matrix, player.piece.x, player.piece.y)
  ) {
    return;
  }

  const clampedX = Math.max(minX, Math.min(maxX, player.piece.x));
  const maxOffset = Math.max(clampedX - minX, maxX - clampedX);
  for (let offset = 0; offset <= maxOffset; offset += 1) {
    const candidates = [clampedX + offset, clampedX - offset];
    for (const candidate of candidates) {
      if (candidate < minX || candidate > maxX) continue;
      if (!collides(player, player.piece.matrix, candidate, player.piece.y)) {
        player.piece.x = candidate;
        return;
      }
    }
  }

  gameOver();
}

function getShiftTarget() {
  const maxStart = COLS - COMMON_WIDTH - MIN_EXCLUSIVE_WIDTH;
  const minStart = MIN_EXCLUSIVE_WIDTH;
  const direction = Math.random() < 0.5 ? -1 : 1;
  const step = 1 + Math.floor(Math.random() * 3);
  let nextStart = state.sharedZoneStart + direction * step;
  if (nextStart < minStart || nextStart > maxStart) {
    nextStart = state.sharedZoneStart - direction * step;
  }
  if (nextStart < minStart) nextStart = minStart;
  if (nextStart > maxStart) nextStart = maxStart;
  if (nextStart === state.sharedZoneStart) {
    nextStart = Math.max(minStart, Math.min(maxStart, nextStart + direction));
  }
  return nextStart;
}

function startShiftAnimation(targetStart) {
  state.shiftAnimation = {
    active: true,
    from: state.sharedZoneStart,
    to: targetStart,
    elapsed: 0,
    duration: SHIFT_ANIM_DURATION,
  };
  playSound("rotate");
}

function shiftSharedZone() {
  if (state.shiftAnimation.active) return;
  const targetStart = getShiftTarget();
  startShiftAnimation(targetStart);
}

function update(delta) {
  state.players.forEach((player) => {
    player.dropCounter += delta;
    if (player.dropCounter >= player.dropInterval) {
      softDrop(player);
      player.dropCounter = 0;
    }
  });
  if (state.shiftAnimation.active) {
    state.shiftAnimation.elapsed += delta;
    if (state.shiftAnimation.elapsed >= state.shiftAnimation.duration) {
      state.shiftAnimation.active = false;
      applySharedZone(state.shiftAnimation.to);
      state.players.forEach((player) => fitPieceInZone(player));
    }
  } else {
    state.zoneShiftCounter += delta;
    if (state.zoneShiftCounter >= state.shiftIntervalMs) {
      state.zoneShiftCounter = 0;
      shiftSharedZone();
    }
  }
  updateShiftTimerLabel();
}

function loop(timestamp) {
  if (!state.running) return;
  if (state.paused) {
    state.lastTime = timestamp;
    requestAnimationFrame(loop);
    return;
  }
  const delta = timestamp - state.lastTime;
  state.lastTime = timestamp;
  update(delta);
  drawBoard();
  drawUI();
  requestAnimationFrame(loop);
}

function startGame() {
  if (state.running) return;
  state.running = true;
  state.paused = false;
  state.lastTime = performance.now();
  overlay.classList.add("hidden");
  pauseBtn.disabled = false;
  restartBtn.disabled = false;
  ensureAudio();
  playSound("start");
  requestAnimationFrame(loop);
}

function pauseGame() {
  if (!state.running) return;
  state.paused = !state.paused;
  overlay.classList.toggle("hidden", !state.paused);
  overlayTitle.textContent = state.paused ? "Paused" : "";
  overlayText.textContent = state.paused ? "Press Pause to resume." : "";
  pauseBtn.textContent = state.paused ? "Resume" : "Pause";
}

function resetGame() {
  initBoard();
  state.totalLines = 0;
  state.totalScore = 0;
  state.level = 1;
  state.zoneShiftCounter = 0;
  state.sharedZoneStart = DEFAULT_SHARED_START;
  state.sharedZoneEnd = DEFAULT_SHARED_START + COMMON_WIDTH - 1;
  state.shiftAnimation = {
    active: false,
    from: state.sharedZoneStart,
    to: state.sharedZoneStart,
    elapsed: 0,
    duration: SHIFT_ANIM_DURATION,
  };
  resetPlayers();
  drawBoard();
  drawUI();
  updateShiftTimerLabel();
}

function restartGame() {
  resetGame();
  overlay.classList.add("hidden");
  state.running = true;
  state.paused = false;
  pauseBtn.textContent = "Pause";
  requestAnimationFrame(loop);
}

function gameOver() {
  state.running = false;
  overlay.classList.remove("hidden");
  overlayTitle.textContent = "Game Over";
  overlayText.textContent = "Press Restart to play again.";
  pauseBtn.disabled = true;
  playSound("gameover");
}

function ensureAudio() {
  if (!audio.ctx) {
    audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTone(frequency, duration, type = "sine", gainValue = 0.08) {
  if (!audio.enabled) return;
  ensureAudio();
  const now = audio.ctx.currentTime;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain).connect(audio.ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playSound(name) {
  if (!audio.enabled) return;
  switch (name) {
    case "move":
      playTone(220, 0.05, "square", 0.03);
      break;
    case "rotate":
      playTone(330, 0.07, "triangle", 0.05);
      break;
    case "drop":
      playTone(120, 0.12, "sawtooth", 0.07);
      break;
    case "lock":
      playTone(180, 0.08, "square", 0.04);
      break;
    case "line":
      playTone(520, 0.15, "triangle", 0.08);
      break;
    case "gameover":
      playTone(120, 0.4, "sawtooth", 0.09);
      break;
    case "start":
      playTone(440, 0.12, "sine", 0.06);
      break;
    default:
      break;
  }
}

function handleKeydown(event) {
  if (!state.running || state.paused) return;
  state.players.forEach((player, index) => {
    const config = playerConfigs[index];
    if (event.key === config.leftKey) {
      event.preventDefault();
      move(player, -1);
    } else if (event.key === config.rightKey) {
      event.preventDefault();
      move(player, 1);
    } else if (event.key === config.dropKey) {
      event.preventDefault();
      softDrop(player);
    } else if (event.key === config.rotateKey) {
      event.preventDefault();
      rotate(player);
    } else if (event.key === config.hardDropKey) {
      event.preventDefault();
      hardDrop(player);
    }
  });
}

function setup() {
  resetGame();
  const initialInterval = shiftIntervalInput
    ? Number(shiftIntervalInput.value || SHIFT_DEFAULT_MS / 1000)
    : SHIFT_DEFAULT_MS / 1000;
  setShiftInterval(Number.isFinite(initialInterval) ? initialInterval : 30);
  overlayTitle.textContent = "Ready";
  overlayText.textContent = "Press Start to begin.";
  overlay.classList.remove("hidden");
  updateScoreboard();
}

startBtn.addEventListener("click", () => {
  if (!state.running) {
    startGame();
  }
});

pauseBtn.addEventListener("click", () => {
  pauseGame();
});

restartBtn.addEventListener("click", () => {
  restartGame();
});

soundToggle.addEventListener("change", (event) => {
  audio.enabled = event.target.checked;
});

if (shiftIntervalInput) {
  shiftIntervalInput.addEventListener("change", (event) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value)) {
      setShiftInterval(value);
    }
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "p" || event.key === "P") {
    pauseGame();
    return;
  }
  handleKeydown(event);
});

setup();
