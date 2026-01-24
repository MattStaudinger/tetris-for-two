const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const soundToggle = document.getElementById("soundToggle");
const gameModeSelect = document.getElementById("gameMode");
const playerCountSelect = document.getElementById("playerCount");
const controlsBtn = document.getElementById("controlsBtn");
const controlsModal = document.getElementById("controlsModal");
const controlsClose = document.getElementById("controlsClose");
const controlsList = document.getElementById("controlsList");
const playersPanel = document.getElementById("playersPanel");
const nextTray = document.getElementById("nextTray");
const gameColumn = document.querySelector(".game-column");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const titleEl = document.getElementById("gameTitle");
const subtitleEl = document.getElementById("gameSubtitle");

const levelEl = document.getElementById("level");
const totalLinesEl = document.getElementById("totalLines");
const sharedZoneEl = document.getElementById("sharedZone");
const shiftTimerEl = document.getElementById("shiftTimer");
const shiftIntervalInput = document.getElementById("shiftInterval");
const shiftBannerEl = document.getElementById("shiftBanner");
const shiftCountdownEl = document.getElementById("shiftCountdown");
const pointsToLevelEl = document.getElementById("pointsToLevel");
const shiftControlEl = document.querySelector(".shift-control");

const ROWS = 20;
const MAX_BLOCK = 30;
const MIN_BLOCK = 16;
let BLOCK = MAX_BLOCK;
const COMMON_WIDTH = 4;
const BASE_EXCLUSIVE_WIDTH = 6;
const MIN_EXCLUSIVE_WIDTH = 2;
const SHIFT_DEFAULT_MS = 30000;
const SHIFT_ANIM_DURATION = 1200;
const LEVEL_POINTS_STEP = 1000;
const HARD_DROP_HOLD_MS = 1000;
const BOMB_CLEAR_DELAY_MS = 1000;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 16;

const COLORS = {
  I: "#5dd7ff",
  J: "#4f6dff",
  L: "#ff9f4a",
  O: "#ffd94a",
  S: "#70e07b",
  T: "#b175ff",
  Z: "#ff6e6e",
  B: "#ff3b3b",
};

const PLAYER_COLORS = [
  "#7dd3fc",
  "#fda4af",
  "#fde68a",
  "#86efac",
  "#c4b5fd",
  "#f9a8d4",
  "#a7f3d0",
  "#fcd34d",
  "#93c5fd",
  "#fca5a5",
  "#ddd6fe",
  "#6ee7b7",
  "#f0abfc",
  "#fda4af",
  "#67e8f9",
  "#fdba74",
];

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
  B: [[1]],
};

const PIECES = Object.keys(SHAPES).filter((piece) => piece !== "B");

const bombSprite = new Image();
bombSprite.src = "bomb_sprite.png";

const audio = {
  ctx: null,
  enabled: true,
};

const state = {
  board: [],
  players: [],
  playerConfigs: [],
  gameMode: "zoned",
  running: false,
  paused: false,
  lastTime: 0,
  totalLines: 0,
  totalScore: 0,
  level: 1,
  cols: 0,
  rows: ROWS,
  sharedZones: [],
  zoneShiftCounter: 0,
  shiftIntervalMs: SHIFT_DEFAULT_MS,
  shiftAnimation: {
    active: false,
    index: -1,
    from: 0,
    to: 0,
    elapsed: 0,
    duration: SHIFT_ANIM_DURATION,
  },
  bombEffects: [],
};
const KEY_GROUPS = [
  { left: "a", rotate: "s", right: "d" },
  { left: "f", rotate: "g", right: "h" },
  { left: "j", rotate: "k", right: "l" },
  { left: "q", rotate: "w", right: "e" },
  { left: "r", rotate: "t", right: "z" },
  { left: "u", rotate: "i", right: "o" },
  { left: "y", rotate: "x", right: "c" },
  { left: "v", rotate: "b", right: "n" },
  { left: "1", rotate: "2", right: "3" },
  { left: "4", rotate: "5", right: "6" },
  { left: "7", rotate: "8", right: "9" },
  { left: "0", rotate: "-", right: "=" },
  { left: "[", rotate: "]", right: "\\" },
  { left: ";", rotate: "'", right: "Enter" },
  { left: ",", rotate: ".", right: "/" },
  { left: "`", rotate: "§", right: "\u00B4" },
];

const GAME_MODES = {
  zoned: {
    label: "Zoned Shift",
    description: "Players have lanes with moving shared zones.",
  },
  chaos: {
    label: "Chaos Arena",
    description: "All players can drop pieces anywhere on the board.",
  },
};

function initBoard() {
  state.board = Array.from({ length: state.rows }, () =>
    Array(state.cols).fill(0),
  );
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

function drawFromChaosBag(player) {
  if (player.bag.length === 0) {
    player.bag = createBag();
  }
  if (Math.random() < 0.5) {
    return "B";
  }
  return player.bag.pop();
}

function createPlayer(config, ui) {
  return {
    id: config.id,
    color: config.color,
    zone: { min: 0, max: 0 },
    spawnZone: { min: 0, max: 0 },
    score: 0,
    lines: 0,
    bag: createBag(),
    next: null,
    piece: null,
    dropCounter: 0,
    dropInterval: 800,
    input: {
      rotateHeld: false,
      rotateHoldTriggered: false,
      rotateHoldTimer: null,
    },
    ui,
  };
}

function clampPlayerCount(count) {
  return Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, count));
}

function buildPlayerConfigs(playerCount) {
  const configs = [];
  for (let i = 0; i < playerCount; i += 1) {
    const keys = KEY_GROUPS[i];
    if (!keys) break;
    configs.push({
      id: `p${i + 1}`,
      keys,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    });
  }
  return configs;
}

function buildPlayerPanel(index, config) {
  if (!playersPanel) return null;
  const panel = document.createElement("section");
  panel.className = "panel";

  const title = document.createElement("h2");
  title.textContent = `Player ${index + 1}`;
  panel.appendChild(title);

  const stats = document.createElement("div");
  stats.className = "stats";
  const scoreRow = document.createElement("div");
  const linesRow = document.createElement("div");
  const scoreValue = document.createElement("span");
  const linesValue = document.createElement("span");
  scoreValue.textContent = "0";
  linesValue.textContent = "0";
  scoreRow.append("Score: ", scoreValue);
  linesRow.append("Lines: ", linesValue);
  stats.append(scoreRow, linesRow);

  const keys = document.createElement("div");
  keys.className = "keys";
  keys.innerHTML = `
    <h3>Keys</h3>
    <p>Move: ${config.keys.left.toUpperCase()} / ${config.keys.right.toUpperCase()}</p>
    <p>Rotate: ${config.keys.rotate.toUpperCase()}</p>
    <p>Hard drop: hold ${config.keys.rotate.toUpperCase()}</p>
  `;

  panel.append(stats, keys);
  playersPanel.appendChild(panel);

  return {
    scoreEl: scoreValue,
    linesEl: linesValue,
  };
}

function buildNextTray(configs) {
  if (!nextTray) return [];
  nextTray.innerHTML = "";
  nextTray.style.gridTemplateColumns = `repeat(${state.cols}, minmax(0, 1fr))`;
  return configs.map((config, index) => {
    const card = document.createElement("div");
    card.className = "next-card";
    const label = document.createElement("span");
    label.textContent = `P${index + 1} NEXT`;
    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = 64;
    previewCanvas.height = 64;
    card.append(label, previewCanvas);
    nextTray.appendChild(card);
    return {
      nextCanvas: previewCanvas,
      nextCtx: previewCanvas.getContext("2d"),
    };
  });
}

function updateBlockSize() {
  const containerWidth =
    gameColumn?.clientWidth || document.body.clientWidth || window.innerWidth;
  const horizontalPadding = 32;
  const verticalPadding = 260;
  const maxBoardWidth = Math.max(200, containerWidth - horizontalPadding);
  const maxBoardHeight = Math.max(200, window.innerHeight - verticalPadding);
  const candidateWidth = Math.floor(maxBoardWidth / state.cols);
  const candidateHeight = Math.floor(maxBoardHeight / state.rows);
  const candidate = Math.min(candidateWidth, candidateHeight);
  BLOCK = Math.max(MIN_BLOCK, Math.min(MAX_BLOCK, candidate));
  canvas.width = state.cols * BLOCK;
  canvas.height = state.rows * BLOCK;
}

function buildControlsDocs(configs) {
  if (controlsList) {
    controlsList.innerHTML = "";
    configs.forEach((config, index) => {
      const card = document.createElement("div");
      card.className = "control-card";
      card.innerHTML = `
        <strong>Player ${index + 1}</strong>
        <div>Left: ${config.keys.left.toUpperCase()}</div>
        <div>Right: ${config.keys.right.toUpperCase()}</div>
        <div>Rotate: ${config.keys.rotate.toUpperCase()}</div>
        <div>Hard drop: hold ${config.keys.rotate.toUpperCase()} 1s</div>
      `;
      controlsList.appendChild(card);
    });
  }
}

function applyModeUI() {
  const mode = GAME_MODES[state.gameMode] || GAME_MODES.zoned;
  if (titleEl) {
    titleEl.textContent = "Multi-Tetris";
  }
  if (subtitleEl) {
    subtitleEl.textContent = mode.description;
  }
  if (shiftBannerEl) {
    shiftBannerEl.style.display = state.gameMode === "zoned" ? "grid" : "none";
  }
  if (shiftControlEl) {
    shiftControlEl.style.display = state.gameMode === "zoned" ? "flex" : "none";
  }
  if (gameModeSelect) {
    gameModeSelect.value = state.gameMode;
  }
}

function buildSharedZones(playerCount) {
  const zones = [];
  let cursor = BASE_EXCLUSIVE_WIDTH;
  for (let i = 0; i < playerCount - 1; i += 1) {
    zones.push({ start: cursor, end: cursor + COMMON_WIDTH - 1 });
    cursor += COMMON_WIDTH + BASE_EXCLUSIVE_WIDTH;
  }
  return zones;
}

function updatePlayerZones() {
  const lastIndex = state.players.length - 1;
  state.players.forEach((player, index) => {
    const min = index === 0 ? 0 : state.sharedZones[index - 1].start;
    const max =
      index === lastIndex ? state.cols - 1 : state.sharedZones[index].end;
    player.zone = { min, max };
  });
}

function applySharedZones() {
  if (state.gameMode === "chaos") {
    state.sharedZones = [];
    state.players.forEach((player) => {
      player.zone = { min: 0, max: state.cols - 1 };
    });
    updateSharedZoneLabel();
    return;
  }
  state.sharedZones.forEach((zone) => {
    zone.end = zone.start + COMMON_WIDTH - 1;
  });
  updatePlayerZones();
  updateSharedZoneLabel();
}

function buildLayout(playerCount) {
  const count = clampPlayerCount(playerCount);
  if (playerCountSelect) {
    playerCountSelect.value = `${count}`;
  }
  const configs = buildPlayerConfigs(count);
  state.playerConfigs = configs;
  if (playersPanel) {
    playersPanel.innerHTML = "";
  }
  state.cols = count * BASE_EXCLUSIVE_WIDTH + (count - 1) * COMMON_WIDTH;
  updateBlockSize();
  state.sharedZones = state.gameMode === "zoned" ? buildSharedZones(count) : [];
  const players = configs.map((config, index) => {
    const panelUi = buildPlayerPanel(index, config) || {};
    return createPlayer(config, panelUi);
  });
  state.players = players;
  applySharedZones();
  const nextTrayUis = buildNextTray(configs);
  state.players.forEach((player, index) => {
    const trayUi = nextTrayUis[index] || {};
    player.ui = { ...player.ui, ...trayUi };
    const span = Math.min(4, state.cols);
    const center =
      state.gameMode === "zoned"
        ? Math.floor((player.zone.min + player.zone.max) / 2) + 1
        : Math.floor(((index + 0.5) * state.cols) / count) + 1;
    const start = Math.max(1, Math.min(state.cols - span + 1, center - 1));
    if (nextTrayUis[index]?.nextCanvas?.parentElement) {
      nextTrayUis[index].nextCanvas.parentElement.style.gridColumn =
        `${start} / span ${span}`;
    }

    if (state.gameMode === "zoned") {
      player.spawnZone = { ...player.zone };
    } else {
      const segmentStart = Math.floor((index * state.cols) / count);
      const segmentEnd = Math.floor(((index + 1) * state.cols) / count) - 1;
      player.spawnZone = {
        min: Math.max(0, segmentStart),
        max: Math.max(0, segmentEnd),
      };
    }
  });
  buildControlsDocs(configs);
}

function updateSharedZoneLabel() {
  if (sharedZoneEl) {
    if (state.gameMode !== "zoned" || state.sharedZones.length === 0) {
      sharedZoneEl.textContent = "-";
      return;
    }
    sharedZoneEl.textContent = state.sharedZones
      .map((zone) => `${zone.start + 1}-${zone.end + 1}`)
      .join(" | ");
  }
}

function updateShiftTimerLabel() {
  if (!shiftCountdownEl) return;
  if (state.gameMode !== "zoned") {
    shiftCountdownEl.textContent = "Off";
    if (shiftTimerEl) {
      shiftTimerEl.textContent = "Off";
    }
    if (shiftBannerEl) {
      shiftBannerEl.classList.remove("urgent", "shifting");
    }
    return;
  }
  if (state.shiftAnimation.active) {
    shiftCountdownEl.textContent = "Shifting";
    if (shiftTimerEl) {
      shiftTimerEl.textContent = "Shifting";
    }
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
  if (shiftTimerEl) {
    shiftTimerEl.textContent = `${timeLeft}s`;
  }
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

function resetPlayers() {
  state.players.forEach((player) => {
    player.score = 0;
    player.lines = 0;
    player.bag = createBag();
    player.next = null;
    player.piece = null;
    player.dropCounter = 0;
    player.dropInterval = 800;
    player.input.rotateHeld = false;
    player.input.rotateHoldTriggered = false;
    if (player.input.rotateHoldTimer) {
      clearTimeout(player.input.rotateHoldTimer);
      player.input.rotateHoldTimer = null;
    }
  });
  applySharedZones();
  state.players.forEach((player) => {
    player.next = drawFromBag(player);
    spawnPiece(player);
  });
}

function drawFromBag(player) {
  if (state.gameMode === "chaos") {
    return drawFromChaosBag(player);
  }
  if (player.bag.length === 0) {
    player.bag = createBag();
  }
  return player.bag.pop();
}

function spawnPiece(player) {
  const type = player.next || drawFromBag(player);
  const matrix = SHAPES[type].map((row) => [...row]);
  const spawnZone = player.spawnZone || player.zone;
  const startX =
    Math.floor((spawnZone.min + spawnZone.max) / 2) -
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
      if (boardX < 0 || boardX >= state.cols || boardY >= state.rows) {
        return true;
      }
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
          const usePlayerColor = state.gameMode === "chaos";
          state.board[boardY][boardX] = {
            type: player.piece.type,
            owner: player.id,
            color: usePlayerColor ? player.color : null,
          };
        }
      }
    });
  });
}

function applyBomb(player) {
  const clearCells = new Map();
  player.piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      const centerX = player.piece.x + x;
      const centerY = player.piece.y + y;
      const startX = centerX - 1;
      const startY = centerY - 1;
      for (let dy = 0; dy < 4; dy += 1) {
        for (let dx = 0; dx < 4; dx += 1) {
          const boardX = startX + dx;
          const boardY = startY + dy;
          if (
            boardX >= 0 &&
            boardX < state.cols &&
            boardY >= 0 &&
            boardY < state.rows
          ) {
            if (state.board[boardY][boardX]) {
              clearCells.set(`${boardY}:${boardX}`, [boardY, boardX]);
            }
          }
        }
      }
    });
  });
  if (clearCells.size > 0) {
    state.bombEffects.push({
      cells: Array.from(clearCells.values()),
      remaining: BOMB_CLEAR_DELAY_MS,
    });
    playSound("drop");
  }
}

function sweepLines(player) {
  let cleared = 0;
  for (let y = state.rows - 1; y >= 0; y -= 1) {
    if (state.board[y].every((cell) => cell)) {
      state.board.splice(y, 1);
      state.board.unshift(Array(state.cols).fill(0));
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
  state.players.forEach((player) => {
    if (player.ui?.scoreEl) player.ui.scoreEl.textContent = player.score;
    if (player.ui?.linesEl) player.ui.linesEl.textContent = player.lines;
  });
  levelEl.textContent = state.level;
  totalLinesEl.textContent = state.totalLines;
  if (pointsToLevelEl) {
    const nextLevelScore = state.level * LEVEL_POINTS_STEP;
    const remaining = Math.max(0, nextLevelScore - state.totalScore);
    pointsToLevelEl.textContent = `${remaining}`;
  }
}

function drawCell(x, y, color, alpha = 1, isBomb = false) {
  const px = x * BLOCK;
  const py = y * BLOCK;
  if (isBomb) {
    if (bombSprite?.complete && bombSprite.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.drawImage(bombSprite, px + 1, py + 1, BLOCK - 2, BLOCK - 2);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.shadowColor = "rgba(255, 59, 59, 0.8)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "rgba(255, 59, 59, 0.9)";
    ctx.fillRect(px + 2, py + 2, BLOCK - 4, BLOCK - 4);
    ctx.restore();
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(px, py, BLOCK, BLOCK);
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.strokeRect(px, py, BLOCK, BLOCK);
  ctx.globalAlpha = 1;
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < state.rows; y += 1) {
    for (let x = 0; x < state.cols; x += 1) {
      const inSharedZone =
        state.gameMode === "zoned" &&
        state.sharedZones.some((zone) => x >= zone.start && x <= zone.end);
      if (inSharedZone) {
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
        if (typeof cell === "string") {
          const isBomb = cell === "B";
          drawCell(x, y, COLORS[cell] || "#ffffff", 1, isBomb);
        } else {
          const isBomb = cell.type === "B";
          const color = cell.color || COLORS[cell.type] || "#ffffff";
          drawCell(x, y, color, 1, isBomb);
        }
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
          const usePlayerColor = state.gameMode === "chaos";
          const color = usePlayerColor
            ? player.color
            : COLORS[player.piece.type];
          const isBomb = player.piece.type === "B";
          drawCell(drawX, drawY, color, 1, isBomb);
        }
      });
    });
  });

  drawBombEffects();
}

function drawShiftAnimationHighlight() {
  if (!state.shiftAnimation.active) return;
  const zoneIndex = state.shiftAnimation.index;
  if (zoneIndex < 0) return;
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

function drawBombWarningCell(x, y, intensity = 1) {
  const px = x * BLOCK;
  const py = y * BLOCK;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = `rgba(255, 255, 255, ${0.6 + intensity * 0.4})`;
  ctx.shadowBlur = 14 + intensity * 6;
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 + intensity * 0.25})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 1, py + 1, BLOCK - 2, BLOCK - 2);
  ctx.restore();
}

function drawBombEffects() {
  if (!state.bombEffects.length) return;
  state.bombEffects.forEach((effect) => {
    const progress = 1 - Math.max(0, effect.remaining) / BOMB_CLEAR_DELAY_MS;
    const pulse = 0.6 + Math.sin(progress * Math.PI * 2) * 0.4;
    effect.cells.forEach(([y, x]) => {
      if (!state.board[y][x]) return;
      drawBombWarningCell(x, y, pulse);
    });
  });
}

function drawPreview(ctxPreview, type, color) {
  if (!type || !ctxPreview) return;
  ctxPreview.clearRect(0, 0, ctxPreview.canvas.width, ctxPreview.canvas.height);
  const matrix = SHAPES[type];
  const size = matrix.length;
  const block = ctxPreview.canvas.width / 4;
  const offsetX = (ctxPreview.canvas.width - size * block) / 2;
  const offsetY = (ctxPreview.canvas.height - size * block) / 2;
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        ctxPreview.fillStyle = color || COLORS[type] || "#ffffff";
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
        if (type === "B") {
          if (bombSprite?.complete && bombSprite.naturalWidth) {
            ctxPreview.drawImage(
              bombSprite,
              offsetX + x * block + 1,
              offsetY + y * block + 1,
              block - 2,
              block - 2,
            );
          } else {
            ctxPreview.save();
            ctxPreview.shadowColor = "rgba(255, 59, 59, 0.9)";
            ctxPreview.shadowBlur = 8;
            ctxPreview.fillStyle = "rgba(255, 59, 59, 0.7)";
            ctxPreview.fillRect(
              offsetX + x * block + 2,
              offsetY + y * block + 2,
              block - 4,
              block - 4,
            );
            ctxPreview.restore();
          }
        }
      }
    });
  });
}

function drawUI() {
  state.players.forEach((player) => {
    if (player.ui?.nextCtx) {
      const usePlayerColor = state.gameMode === "chaos";
      drawPreview(
        player.ui.nextCtx,
        player.next,
        usePlayerColor ? player.color : COLORS[player.next],
      );
    }
  });
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
  if (player.piece?.type === "B") {
    applyBomb(player);
  } else {
    sweepLines(player);
  }
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

function getSharedZoneBounds(index) {
  const lastIndex = state.sharedZones.length - 1;
  const minStart =
    index === 0
      ? MIN_EXCLUSIVE_WIDTH
      : state.sharedZones[index - 1].start + COMMON_WIDTH + MIN_EXCLUSIVE_WIDTH;
  const maxStart =
    index === lastIndex
      ? state.cols - MIN_EXCLUSIVE_WIDTH - COMMON_WIDTH
      : state.sharedZones[index + 1].start - MIN_EXCLUSIVE_WIDTH - COMMON_WIDTH;
  return { minStart, maxStart };
}

function getShiftTarget(index) {
  const current = state.sharedZones[index].start;
  const { minStart, maxStart } = getSharedZoneBounds(index);
  if (minStart > maxStart) return current;
  const direction = Math.random() < 0.5 ? -1 : 1;
  const step = 1 + Math.floor(Math.random() * 3);
  let nextStart = current + direction * step;
  if (nextStart < minStart || nextStart > maxStart) {
    nextStart = current - direction * step;
  }
  nextStart = Math.max(minStart, Math.min(maxStart, nextStart));
  if (nextStart === current && maxStart > minStart) {
    nextStart = Math.max(minStart, Math.min(maxStart, current + direction));
  }
  return nextStart;
}

function startShiftAnimation(index, targetStart) {
  state.shiftAnimation = {
    active: true,
    index,
    from: state.sharedZones[index].start,
    to: targetStart,
    elapsed: 0,
    duration: SHIFT_ANIM_DURATION,
  };
  playSound("rotate");
}

function shiftSharedZone() {
  if (state.shiftAnimation.active || state.sharedZones.length === 0) return;
  const index = Math.floor(Math.random() * state.sharedZones.length);
  const targetStart = getShiftTarget(index);
  if (targetStart !== state.sharedZones[index].start) {
    startShiftAnimation(index, targetStart);
  }
}

function updateBombEffects(delta) {
  if (!state.bombEffects.length) return;
  state.bombEffects = state.bombEffects.filter((effect) => {
    effect.remaining -= delta;
    if (effect.remaining > 0) return true;
    effect.cells.forEach(([boardY, boardX]) => {
      state.board[boardY][boardX] = 0;
    });
    playSound("boom");
    return false;
  });
}

function update(delta) {
  updateBombEffects(delta);
  state.players.forEach((player) => {
    player.dropCounter += delta;
    if (player.dropCounter >= player.dropInterval) {
      softDrop(player);
      player.dropCounter = 0;
    }
  });
  if (state.gameMode === "zoned") {
    if (state.shiftAnimation.active) {
      state.shiftAnimation.elapsed += delta;
      if (state.shiftAnimation.elapsed >= state.shiftAnimation.duration) {
        state.shiftAnimation.active = false;
        const index = state.shiftAnimation.index;
        if (index >= 0) {
          state.sharedZones[index].start = state.shiftAnimation.to;
          applySharedZones();
        }
        state.players.forEach((player) => fitPieceInZone(player));
      }
    } else {
      state.zoneShiftCounter += delta;
      if (state.zoneShiftCounter >= state.shiftIntervalMs) {
        state.zoneShiftCounter = 0;
        shiftSharedZone();
      }
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
  state.shiftAnimation = {
    active: false,
    index: -1,
    from: 0,
    to: 0,
    elapsed: 0,
    duration: SHIFT_ANIM_DURATION,
  };
  state.bombEffects = [];
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
    case "boom":
      playTone(90, 0.18, "sawtooth", 0.1);
      playTone(140, 0.12, "square", 0.06);
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

function normalizeKey(event) {
  if (event.key.length === 1) {
    return event.key.toLowerCase();
  }
  return event.key;
}

function handleKeydown(event) {
  if (!state.running || state.paused) return;
  const key = normalizeKey(event);
  state.players.forEach((player, index) => {
    const config = state.playerConfigs[index];
    if (!config) return;
    if (key === config.keys.left) {
      event.preventDefault();
      move(player, -1);
    } else if (key === config.keys.right) {
      event.preventDefault();
      move(player, 1);
    } else if (key === config.keys.rotate) {
      event.preventDefault();
      if (player.input.rotateHeld) return;
      player.input.rotateHeld = true;
      player.input.rotateHoldTriggered = false;
      if (player.input.rotateHoldTimer) {
        clearTimeout(player.input.rotateHoldTimer);
      }
      player.input.rotateHoldTimer = setTimeout(() => {
        if (player.input.rotateHeld && !player.input.rotateHoldTriggered) {
          player.input.rotateHoldTriggered = true;
          hardDrop(player);
        }
      }, HARD_DROP_HOLD_MS);
    }
  });
}

function handleKeyup(event) {
  if (!state.running || state.paused) return;
  const key = normalizeKey(event);
  state.players.forEach((player, index) => {
    const config = state.playerConfigs[index];
    if (!config) return;
    if (key === config.keys.rotate) {
      event.preventDefault();
      if (player.input.rotateHoldTimer) {
        clearTimeout(player.input.rotateHoldTimer);
        player.input.rotateHoldTimer = null;
      }
      if (!player.input.rotateHoldTriggered) {
        rotate(player);
      }
      player.input.rotateHeld = false;
      player.input.rotateHoldTriggered = false;
    }
  });
}

function setup() {
  const initialPlayers = clampPlayerCount(
    playerCountSelect ? Number(playerCountSelect.value) : MIN_PLAYERS,
  );
  if (gameModeSelect && GAME_MODES[gameModeSelect.value]) {
    state.gameMode = gameModeSelect.value;
  }
  applyModeUI();
  buildLayout(initialPlayers);
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

if (gameModeSelect) {
  gameModeSelect.addEventListener("change", (event) => {
    const value = event.target.value;
    state.gameMode = GAME_MODES[value] ? value : "zoned";
    applyModeUI();
    buildLayout(
      clampPlayerCount(
        playerCountSelect ? Number(playerCountSelect.value) : MIN_PLAYERS,
      ),
    );
    resetGame();
    overlayTitle.textContent = "Ready";
    overlayText.textContent = "Press Start to begin.";
    overlay.classList.remove("hidden");
  });
}

if (playerCountSelect) {
  playerCountSelect.addEventListener("change", (event) => {
    const value = Number(event.target.value);
    const count = clampPlayerCount(
      Number.isFinite(value) ? value : MIN_PLAYERS,
    );
    buildLayout(count);
    resetGame();
    overlayTitle.textContent = "Ready";
    overlayText.textContent = "Press Start to begin.";
    overlay.classList.remove("hidden");
  });
}

if (controlsBtn && controlsModal && controlsClose) {
  controlsBtn.addEventListener("click", () => {
    controlsModal.classList.remove("hidden");
    controlsModal.setAttribute("aria-hidden", "false");
  });

  controlsClose.addEventListener("click", () => {
    controlsModal.classList.add("hidden");
    controlsModal.setAttribute("aria-hidden", "true");
  });

  controlsModal.addEventListener("click", (event) => {
    if (event.target === controlsModal) {
      controlsModal.classList.add("hidden");
      controlsModal.setAttribute("aria-hidden", "true");
    }
  });
}

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

window.addEventListener("keyup", (event) => {
  handleKeyup(event);
});

window.addEventListener("resize", () => {
  if (!state.cols) return;
  updateBlockSize();
  drawBoard();
  drawUI();
});

setup();
