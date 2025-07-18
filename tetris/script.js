const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(30, 30);

const nextCanvas = document.getElementById('nextPiece');
const nextCtx = nextCanvas.getContext('2d');
nextCtx.scale(30, 30);

const scoreElem = document.getElementById('score');
const levelElem = document.getElementById('level');
const gameStatusElem = document.getElementById('gameStatus');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

const colors = [
  null,
  '#00ffff', // I
  '#ffff00', // O
  '#ff00ff', // T
  '#ff0000', // Z
  '#00ff00', // S
  '#0000ff', // J
  '#ffa500', // L
];

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function createPiece(type) {
  switch(type) {
    case 'T':
      return [
        [0, 3, 0],
        [3, 3, 3],
        [0, 0, 0],
      ];
    case 'O':
      return [
        [2, 2],
        [2, 2],
      ];
    case 'L':
      return [
        [0, 0, 7],
        [7, 7, 7],
        [0, 0, 0],
      ];
    case 'J':
      return [
        [6, 0, 0],
        [6, 6, 6],
        [0, 0, 0],
      ];
    case 'I':
      return [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
    case 'S':
      return [
        [0, 5, 5],
        [5, 5, 0],
        [0, 0, 0],
      ];
    case 'Z':
      return [
        [4, 4, 0],
        [0, 4, 4],
        [0, 0, 0],
      ];
  }
}

function drawMatrix(matrix, offset, ctx = context) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        ctx.fillStyle = colors[value];
        ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 0.1;
        ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawMatrix(arena, {x:0, y:0});

  // Kreslíme hráče s plynulou vertikální pozicí (desetinnou)
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(player.pos.x + x, player.visualY + y, 1, 1);
        context.strokeStyle = '#000';
        context.lineWidth = 0.1;
        context.strokeRect(player.pos.x + x, player.visualY + y, 1, 1);
      }
    });
  });
}

function drawNext() {
  nextCtx.fillStyle = '#000';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  const matrix = nextPiece.matrix;
  const offset = {
    x: Math.floor((nextCanvas.width / 30 - matrix[0].length) / 2),
    y: Math.floor((nextCanvas.height / 30 - matrix.length) / 2),
  };
  drawMatrix(matrix, offset, nextCtx);
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[Math.floor(player.pos.y) + y][player.pos.x + x] = value;
      }
    });
  });
}

function collide(arena, player) {
  const [m, o] = [player.matrix, {x: player.pos.x, y: Math.floor(player.pos.y)}];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 &&
          (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

function playerReset() {
  player.matrix = nextPiece.matrix;
  player.pos.y = 0;
  player.visualY = 0;
  player.pos.x = Math.floor(arena[0].length / 2) - Math.floor(player.matrix[0].length / 2);

  nextPiece.matrix = createPiece(pieces[Math.floor(Math.random() * pieces.length)]);
  drawNext();

  if (collide(arena, player)) {
    gameOver();
  }
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  rotate(player.matrix, dir);
  if (collide(arena, player)) {
    player.pos.x = pos;
  }
}

function arenaSweep() {
  let rowCount = 1;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    player.score += rowCount * 10;
    rowCount *= 2;
  }
  if (player.score > player.level * 100) {
    player.level++;
  }
}

function updateScore() {
  scoreElem.innerText = player.score;
  levelElem.innerText = player.level;
}

function gameOver() {
  isRunning = false;
  pauseBtn.disabled = true;
  restartBtn.disabled = false;
  startBtn.disabled = false;
  saveHighScore();
  playSound('gameover');
  gameStatusElem.innerText = 'Game Over! Stiskni Restart.';
}

let lastTime = 0;
let isRunning = false;

// Rychlost padání (jednotky: políčka za milisekundu)
let dropSpeed = 0.0009; // začínáme pomalu, uprav podle chuti

// Pro plynulé zvýšení rychlosti s časem:
let gameTime = 0;
const acceleration = 0.0000003; // čím větší, tím rychleji se zrychluje

const arena = createMatrix(10, 20);

const player = {
  pos: {x:0, y:0},
  visualY: 0, // desetinná pozice pro plynulý pohyb
  matrix: null,
  score: 0,
  level: 1,
};

const pieces = 'ILJOTSZ';

let nextPiece = {
  matrix: createPiece(pieces[Math.floor(Math.random() * pieces.length)]),
};

function update(time = 0) {
  if (!isRunning) return;

  const deltaTime = time - lastTime;
  lastTime = time;

  gameTime += deltaTime;

  // Postupné plynulé zrychlování padání
  dropSpeed += acceleration * deltaTime;

  // Pohyb plynule po pixelech (jednotka = políčko)
  player.visualY += dropSpeed * deltaTime;

  // Posuň logickou pozici pokud vizuální přesáhla další políčko
  if (player.visualY >= player.pos.y + 1) {
    player.pos.y++;
    if (collide(arena, player)) {
      player.pos.y--;
      merge(arena, player);
      arenaSweep();
      updateScore();
      playerReset();
      player.visualY = player.pos.y;
    } else {
      player.visualY = player.pos.y;
    }
  }

  draw();
  drawNext();
  requestAnimationFrame(update);
}

startBtn.addEventListener('click', () => {
  resetGame();
});

pauseBtn.addEventListener('click', () => {
  if (!isRunning) return;
  isRunning = false;
  pauseBtn.disabled = true;
  startBtn.disabled = false;
  gameStatusElem.innerText = 'Hra pozastavena.';
});

restartBtn.addEventListener('click', () => {
  resetGame();
});

function resetGame() {
  arena.forEach(row => row.fill(0));
  player.score = 0;
  player.level = 1;
  player.pos.y = 0;
  player.visualY = 0;
  dropSpeed = 0.0015;
  gameTime = 0;
  playerReset();
  updateScore();
  drawNext();
  pauseBtn.disabled = false;
  restartBtn.disabled = false;
  startBtn.disabled = true;
  isRunning = true;
  lastTime = 0;
  gameStatusElem.innerText = '';
  update();
}

function playSound(type) {
  // Pro rozšíření
}

function saveHighScore() {
  // Pro rozšíření
}

document.addEventListener('keydown', event => {
  if (!isRunning) return;

  if (event.key === 'ArrowLeft') {
    playerMove(-1);
  } else if (event.key === 'ArrowRight') {
    playerMove(1);
  } else if (event.key === 'ArrowDown') {
    // Pro rychlejší pád můžeš udělat třeba dropSpeed *= 3 na chvíli
    playerDropInstant();
  } else if (event.key === 'ArrowUp') {
    playerRotate(1);
  }
});

// Okamžité pádnutí dolů (použito pro šipku dolů)
function playerDropInstant() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    arenaSweep();
    updateScore();
    playerReset();
    player.visualY = player.pos.y;
  } else {
    player.visualY = player.pos.y;
  }
}
