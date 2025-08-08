"use strict";

(function () {
  const NUM_COLUMNS = 10;
  const NUM_ROWS = 20;
  const BLOCK_SIZE = 30; // pixels

  const LINE_SCORES = { 1: 100, 2: 300, 3: 500, 4: 800 };

  const KEY = {
    LEFT: "ArrowLeft",
    RIGHT: "ArrowRight",
    DOWN: "ArrowDown",
    ROTATE_CW: "ArrowUp",
    ROTATE_CCW: "z",
    HARD_DROP: " ", // Space
    PAUSE: "p",
  };

  /** Colors for tetromino types */
  const COLOR_BY_TYPE = {
    I: "#54d7f9",
    J: "#5a73ff",
    L: "#ffa148",
    O: "#f7e35a",
    S: "#65e589",
    T: "#c17cf7",
    Z: "#ff6d7a",
    GHOST: "#ffffff20",
    GRID: "#16213b",
  };

  /** Tetromino rotation states as 4x4 matrices */
  const SHAPES = {
    I: [
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      [
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
      ],
    ],
    J: [
      [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 1],
        [0, 1, 0],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 0, 1],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [1, 1, 0],
      ],
    ],
    L: [
      [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 1],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [1, 0, 0],
      ],
      [
        [1, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
      ],
    ],
    O: [
      [
        [1, 1],
        [1, 1],
      ],
    ],
    S: [
      [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 0, 1],
      ],
    ],
    T: [
      [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 1, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
    ],
    Z: [
      [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
      ],
      [
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0],
      ],
    ],
  };

  /** 7-bag randomizer */
  function createSevenBagGenerator() {
    let bag = [];
    function refill() {
      bag = ["I", "J", "L", "O", "S", "T", "Z"];
      for (let i = bag.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    refill();
    return {
      next() {
        if (bag.length === 0) refill();
        return bag.pop();
      },
    };
  }

  function createEmptyBoard() {
    const board = [];
    for (let rowIndex = 0; rowIndex < NUM_ROWS; rowIndex += 1) {
      const row = new Array(NUM_COLUMNS).fill(null);
      board.push(row);
    }
    return board;
  }

  function createPiece(type) {
    const rotations = SHAPES[type];
    const rotationIndex = 0;
    const shape = rotations[rotationIndex];
    const width = shape[0].length;
    const initialX = Math.floor((NUM_COLUMNS - width) / 2);
    const initialY = -getTopPadding(shape); // spawn above board if needed
    return { type, rotationIndex, x: initialX, y: initialY };
  }

  function getTopPadding(matrix) {
    for (let y = 0; y < matrix.length; y += 1) {
      if (matrix[y].some((cell) => cell)) return y;
    }
    return 0;
  }

  function getCurrentShape(piece) {
    const rotations = SHAPES[piece.type];
    return rotations[piece.rotationIndex % rotations.length];
  }

  function isPositionValid(board, piece, offsetX = 0, offsetY = 0, testRotationIndex = null) {
    const rotationIndex = testRotationIndex == null ? piece.rotationIndex : testRotationIndex;
    const matrix = SHAPES[piece.type][rotationIndex % SHAPES[piece.type].length];
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) continue;
        const newX = piece.x + x + offsetX;
        const newY = piece.y + y + offsetY;
        if (newX < 0 || newX >= NUM_COLUMNS || newY >= NUM_ROWS) return false;
        if (newY >= 0 && board[newY][newX]) return false;
      }
    }
    return true;
  }

  function mergePieceIntoBoard(board, piece) {
    const matrix = getCurrentShape(piece);
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) continue;
        const by = piece.y + y;
        const bx = piece.x + x;
        if (by >= 0) {
          board[by][bx] = piece.type;
        }
      }
    }
  }

  function clearCompletedLines(board) {
    let linesCleared = 0;
    for (let rowIndex = NUM_ROWS - 1; rowIndex >= 0; rowIndex -= 1) {
      const isFull = board[rowIndex].every((cell) => cell != null);
      if (isFull) {
        board.splice(rowIndex, 1);
        board.unshift(new Array(NUM_COLUMNS).fill(null));
        linesCleared += 1;
        rowIndex += 1; // recheck current index after unshift
      }
    }
    return linesCleared;
  }

  function computeGhostDropY(board, piece) {
    let ghostOffset = 0;
    while (isPositionValid(board, piece, 0, ghostOffset + 1)) {
      ghostOffset += 1;
    }
    return piece.y + ghostOffset;
  }

  function computeDropIntervalMs(level) {
    const base = 1000; // 1s at level 1
    const speedUp = Math.pow(0.85, Math.max(0, level - 1));
    return Math.max(60, Math.floor(base * speedUp));
  }

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const uiScore = document.getElementById("score");
  const uiLines = document.getElementById("lines");
  const uiLevel = document.getElementById("level");

  const newGameBtn = document.getElementById("newGameBtn");
  const pauseBtn = document.getElementById("pauseBtn");

  const STATE = {
    board: createEmptyBoard(),
    generator: createSevenBagGenerator(),
    currentPiece: null,
    isGameOver: false,
    isPaused: false,
    score: 0,
    totalLines: 0,
    level: 1,
    lastDropAtMs: 0,
    softDropActive: false,
    allowHold: true, // reserved for potential future hold feature
  };

  function resetGame() {
    STATE.board = createEmptyBoard();
    STATE.generator = createSevenBagGenerator();
    STATE.currentPiece = createPiece(STATE.generator.next());
    STATE.isGameOver = false;
    STATE.isPaused = false;
    STATE.score = 0;
    STATE.totalLines = 0;
    STATE.level = 1;
    STATE.lastDropAtMs = performance.now();
    STATE.softDropActive = false;
    STATE.allowHold = true;
    updateUI();
    draw();
  }

  function updateUI() {
    uiScore.textContent = String(STATE.score);
    uiLines.textContent = String(STATE.totalLines);
    uiLevel.textContent = String(STATE.level);
    pauseBtn.textContent = STATE.isPaused ? "Reprendre" : "Pause";
  }

  function endGame() {
    STATE.isGameOver = true;
    updateUI();
    draw(true);
  }

  function tryRotate(clockwise = true) {
    if (STATE.isGameOver || STATE.isPaused) return;
    const piece = STATE.currentPiece;
    const rotations = SHAPES[piece.type];
    const nextIndex = (piece.rotationIndex + (clockwise ? 1 : rotations.length - 1)) % rotations.length;

    // Basic wall-kick attempts
    const kickOffsets = [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: -2, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: -1 },
    ];

    for (const offset of kickOffsets) {
      if (isPositionValid(STATE.board, piece, offset.x, offset.y, nextIndex)) {
        piece.x += offset.x;
        piece.y += offset.y;
        piece.rotationIndex = nextIndex;
        draw();
        return;
      }
    }
  }

  function tryMove(offsetX, offsetY) {
    if (STATE.isGameOver || STATE.isPaused) return false;
    const piece = STATE.currentPiece;
    if (isPositionValid(STATE.board, piece, offsetX, offsetY)) {
      piece.x += offsetX;
      piece.y += offsetY;
      draw();
      return true;
    }
    return false;
  }

  function hardDrop() {
    if (STATE.isGameOver || STATE.isPaused) return;
    const piece = STATE.currentPiece;
    let dropDistance = 0;
    while (isPositionValid(STATE.board, piece, 0, 1)) {
      piece.y += 1;
      dropDistance += 1;
    }
    // scoring for hard drop
    STATE.score += dropDistance * 2;
    lockPieceAndProceed();
  }

  function lockPieceAndProceed() {
    mergePieceIntoBoard(STATE.board, STATE.currentPiece);
    const cleared = clearCompletedLines(STATE.board);
    if (cleared > 0) {
      STATE.score += LINE_SCORES[cleared] || 0;
      STATE.totalLines += cleared;
      const newLevel = Math.floor(STATE.totalLines / 10) + 1;
      if (newLevel !== STATE.level) {
        STATE.level = newLevel;
      }
    }

    STATE.currentPiece = createPiece(STATE.generator.next());
    STATE.allowHold = true;

    if (!isPositionValid(STATE.board, STATE.currentPiece, 0, 0)) {
      endGame();
    } else {
      updateUI();
      draw();
    }
  }

  function gameTick(nowMs) {
    if (STATE.isGameOver || STATE.isPaused) return;
    const intervalMs = computeDropIntervalMs(STATE.level);
    const isSoft = STATE.softDropActive;
    const effectiveInterval = isSoft ? Math.max(40, Math.floor(intervalMs / 8)) : intervalMs;

    if (nowMs - STATE.lastDropAtMs >= effectiveInterval) {
      const moved = tryMove(0, 1);
      if (!moved) {
        // lock piece
        lockPieceAndProceed();
      }
      STATE.lastDropAtMs = nowMs;
    }
  }

  function drawGameGrid() {
    ctx.strokeStyle = COLOR_BY_TYPE.GRID;
    ctx.lineWidth = 1;
    for (let x = 0; x <= NUM_COLUMNS; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * BLOCK_SIZE + 0.5, 0);
      ctx.lineTo(x * BLOCK_SIZE + 0.5, NUM_ROWS * BLOCK_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= NUM_ROWS; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * BLOCK_SIZE + 0.5);
      ctx.lineTo(NUM_COLUMNS * BLOCK_SIZE, y * BLOCK_SIZE + 0.5);
      ctx.stroke();
    }
  }

  function drawCell(x, y, color) {
    const px = x * BLOCK_SIZE;
    const py = y * BLOCK_SIZE;
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
  }

  function drawBoard() {
    for (let row = 0; row < NUM_ROWS; row += 1) {
      for (let col = 0; col < NUM_COLUMNS; col += 1) {
        const cell = STATE.board[row][col];
        if (cell) {
          drawCell(col, row, COLOR_BY_TYPE[cell]);
        }
      }
    }
  }

  function drawCurrentPiece(withGhost = true) {
    const piece = STATE.currentPiece;
    const matrix = getCurrentShape(piece);

    let ghostY = piece.y;
    if (withGhost) {
      ghostY = computeGhostDropY(STATE.board, piece);
      for (let y = 0; y < matrix.length; y += 1) {
        for (let x = 0; x < matrix[y].length; x += 1) {
          if (!matrix[y][x]) continue;
          const drawX = piece.x + x;
          const drawY = ghostY + y;
          if (drawY >= 0) drawCell(drawX, drawY, COLOR_BY_TYPE.GHOST);
        }
      }
    }

    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) continue;
        const drawX = piece.x + x;
        const drawY = piece.y + y;
        if (drawY >= 0) drawCell(drawX, drawY, COLOR_BY_TYPE[piece.type]);
      }
    }
  }

  function draw(gameOverOverlay = false) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    if (STATE.currentPiece && !STATE.isGameOver) {
      drawCurrentPiece(true);
    }
    drawGameGrid();

    if (STATE.isPaused) {
      drawOverlayText("Pause", "Appuyez sur P pour reprendre");
    } else if (gameOverOverlay || STATE.isGameOver) {
      drawOverlayText("Game Over", "Nouvelle partie pour rejouer");
    }
  }

  function drawOverlayText(title, subtitle) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#eaeef2";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "bold 28px Inter, system-ui, sans-serif";
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 14);

    ctx.font = "600 14px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#b8c1e2";
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 16);
    ctx.restore();
  }

  // Input handling
  window.addEventListener("keydown", (e) => {
    if (e.key === KEY.PAUSE) {
      e.preventDefault();
      STATE.isPaused = !STATE.isPaused;
      updateUI();
      draw();
      return;
    }

    if (STATE.isGameOver || STATE.isPaused) return;

    switch (e.key) {
      case KEY.LEFT:
        e.preventDefault();
        tryMove(-1, 0);
        break;
      case KEY.RIGHT:
        e.preventDefault();
        tryMove(1, 0);
        break;
      case KEY.DOWN:
        e.preventDefault();
        STATE.softDropActive = true;
        // On keydown we can also attempt an immediate step
        if (!tryMove(0, 1)) {
          // no move
        } else {
          STATE.score += 1; // soft drop point
          updateUI();
        }
        break;
      case KEY.ROTATE_CW:
        e.preventDefault();
        tryRotate(true);
        break;
      case KEY.ROTATE_CCW:
        e.preventDefault();
        tryRotate(false);
        break;
      case KEY.HARD_DROP:
        e.preventDefault();
        hardDrop();
        break;
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === KEY.DOWN) {
      STATE.softDropActive = false;
    }
  });

  // Buttons
  newGameBtn.addEventListener("click", () => resetGame());
  pauseBtn.addEventListener("click", () => {
    STATE.isPaused = !STATE.isPaused;
    updateUI();
    draw();
  });

  // Main loop
  function frame(nowMs) {
    gameTick(nowMs);
    draw();
    requestAnimationFrame(frame);
  }

  // Init
  function init() {
    // Ensure canvas matches cell size
    canvas.width = NUM_COLUMNS * BLOCK_SIZE;
    canvas.height = NUM_ROWS * BLOCK_SIZE;
    resetGame();
    requestAnimationFrame(frame);
  }

  init();
})();