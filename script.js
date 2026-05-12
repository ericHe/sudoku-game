const boardElement = document.getElementById('sudokuBoard');
const statusText = document.querySelector('.status-text');
const hintButton = document.querySelector('.hint-button');
const pickerOverlay = document.getElementById('pickerOverlay');
const hintOverlay = document.getElementById('hintOverlay');
const hintMessage = document.getElementById('hintMessage');
const pickerCancel = document.getElementById('pickerCancel');
const hintClose = document.getElementById('hintClose');

let currentBoard = [];
let fixedCells = [];
let selectedCell = null;
let hintTarget = null;
let solutionBoard = [];

const difficultyMap = {
  easy: 42,
  normal: 34,
  hard: 26,
};

const difficultyLabels = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
};

function createSolvedBoard() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  function shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
  }

  function canPlace(board, row, col, value) {
    for (let i = 0; i < 9; i += 1) {
      if (board[row][i] === value || board[i][col] === value) return false;
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = startRow; r < startRow + 3; r += 1) {
      for (let c = startCol; c < startCol + 3; c += 1) {
        if (board[r][c] === value) return false;
      }
    }
    return true;
  }

  function fillCell(index = 0) {
    if (index >= 81) return true;
    const row = Math.floor(index / 9);
    const col = index % 9;
    if (board[row][col] !== 0) return fillCell(index + 1);

    const shuffled = shuffle([...numbers]);
    for (const value of shuffled) {
      if (canPlace(board, row, col, value)) {
        board[row][col] = value;
        if (fillCell(index + 1)) return true;
        board[row][col] = 0;
      }
    }
    return false;
  }

  fillCell();
  return board;
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function removeCells(board, clues) {
  const removed = cloneBoard(board);
  const empties = 81 - clues;
  const positions = Array.from({ length: 81 }, (_, i) => i);
  for (let i = 0; i < empties; i += 1) {
    const randomIndex = Math.floor(Math.random() * positions.length);
    const position = positions.splice(randomIndex, 1)[0];
    const row = Math.floor(position / 9);
    const col = position % 9;
    removed[row][col] = 0;
  }
  return removed;
}

function startGame(level) {
  solutionBoard = createSolvedBoard();
  currentBoard = removeCells(solutionBoard, difficultyMap[level]);
  fixedCells = currentBoard.map((row) => row.map((value) => value !== 0));
  selectedCell = null;
  hintTarget = null;
  hideHint();
  statusText.textContent = `已选择${difficultyLabels[level]}难度。点击空格填写数字，或者使用提示。`;
  renderBoard();
}

function renderBoard() {
  boardElement.innerHTML = '';
  currentBoard.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'sudoku-cell';
      cell.dataset.row = rowIndex;
      cell.dataset.col = colIndex;
      cell.dataset.fixed = fixedCells[rowIndex][colIndex];
      cell.textContent = value === 0 ? '' : value;
      if (value === 0) {
        cell.classList.add('empty');
      }
      if (selectedCell && selectedCell.row === rowIndex && selectedCell.col === colIndex) {
        cell.classList.add('selected');
      }
      if (hintTarget) {
        if (rowIndex === hintTarget.row && colIndex === hintTarget.col) {
          cell.classList.add('hint-target');
        } else if (
          rowIndex === hintTarget.row ||
          colIndex === hintTarget.col ||
          sameBox(rowIndex, colIndex, hintTarget.row, hintTarget.col)
        ) {
          cell.classList.add('hint-related');
        }
      }
      cell.addEventListener('click', () => handleCellClick(rowIndex, colIndex));
      boardElement.appendChild(cell);
    });
  });
}

function handleCellClick(row, col) {
  if (fixedCells[row][col]) {
    statusText.textContent = '这是原始数字，不能修改哦。';
    return;
  }
  selectedCell = { row, col };
  showPicker();
  renderBoard();
}

function showPicker() {
  pickerOverlay.classList.remove('hidden');
}

function hidePicker() {
  pickerOverlay.classList.add('hidden');
}

function updateCell(value) {
  if (!selectedCell) return;
  const { row, col } = selectedCell;
  if (value === 0) {
    currentBoard[row][col] = 0;
    statusText.textContent = '已清除这个格子。';
  } else if (isMoveValid(row, col, value)) {
    currentBoard[row][col] = value;
    selectedCell = null;
    statusText.textContent = `已填入 ${value}。继续加油！`;
  } else {
    statusText.textContent = `数字 ${value} 不符合规则，请再试一次。`;
  }
  hidePicker();
  renderBoard();
  if (isComplete()) {
    statusText.textContent = '太棒了！你完成了数独！';
  }
}

function isMoveValid(row, col, value) {
  if (value === 0) return true;
  for (let i = 0; i < 9; i += 1) {
    if (currentBoard[row][i] === value && i !== col) return false;
    if (currentBoard[i][col] === value && i !== row) return false;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r += 1) {
    for (let c = startCol; c < startCol + 3; c += 1) {
      if (currentBoard[r][c] === value && (r !== row || c !== col)) return false;
    }
  }
  return true;
}

function sameBox(row1, col1, row2, col2) {
  return Math.floor(row1 / 3) === Math.floor(row2 / 3) && Math.floor(col1 / 3) === Math.floor(col2 / 3);
}

function getCandidates(row, col) {
  const candidates = [];
  if (currentBoard[row][col] !== 0) return candidates;
  for (let value = 1; value <= 9; value += 1) {
    if (isMoveValid(row, col, value)) {
      candidates.push(value);
    }
  }
  return candidates;
}

function getMissingNumbers(values) {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((value) => !values.includes(value));
}

function getRowMissing(row) {
  return getMissingNumbers(currentBoard[row].filter(Boolean));
}

function getColMissing(col) {
  const used = [];
  for (let r = 0; r < 9; r += 1) {
    if (currentBoard[r][col]) used.push(currentBoard[r][col]);
  }
  return getMissingNumbers(used);
}

function getBoxMissing(row, col) {
  const used = [];
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r += 1) {
    for (let c = startCol; c < startCol + 3; c += 1) {
      if (currentBoard[r][c]) used.push(currentBoard[r][c]);
    }
  }
  return getMissingNumbers(used);
}

function showHint() {
  const emptyCells = [];
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (currentBoard[row][col] === 0) {
        const candidates = getCandidates(row, col);
        if (candidates.length > 0) {
          emptyCells.push({ row, col, candidates });
        }
      }
    }
  }
  if (emptyCells.length === 0) {
    hintMessage.textContent = '恭喜你，棋盘已经完成，无需提示。';
  } else {
    emptyCells.sort((a, b) => a.candidates.length - b.candidates.length);
    const choice = emptyCells[0];
    hintTarget = choice;
    const { row, col, candidates } = choice;
    const candidateText = candidates.join('、');
    const rowMissing = getRowMissing(row).join('、');
    const colMissing = getColMissing(col).join('、');
    const boxMissing = getBoxMissing(row, col).join('、');
    hintMessage.innerHTML = `这是一个关键位置：第 ${row + 1} 行，第 ${col + 1} 列。<br />` +
      `这一行还缺少：<strong>${rowMissing}</strong>。<br />` +
      `这一列还缺少：<strong>${colMissing}</strong>。<br />` +
      `这个 3×3 小格还缺少：<strong>${boxMissing}</strong>。<br />` +
      `所以这个位置最合适的数字是：<strong>${candidateText}</strong>。`;
  }
  hintOverlay.classList.remove('hidden');
  renderBoard();
}

function hideHint() {
  hintOverlay.classList.add('hidden');
  hintTarget = null;
  renderBoard();
}

function isComplete() {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (currentBoard[row][col] === 0) return false;
    }
  }
  return true;
}

function attachEvents() {
  document.querySelectorAll('.difficulty-button').forEach((button) => {
    button.addEventListener('click', () => startGame(button.dataset.level));
  });

  pickerOverlay.addEventListener('click', (event) => {
    if (event.target === pickerOverlay) hidePicker();
  });

  hintOverlay.addEventListener('click', (event) => {
    if (event.target === hintOverlay) hideHint();
  });

  pickerCancel.addEventListener('click', hidePicker);
  hintClose.addEventListener('click', hideHint);
  hintButton.addEventListener('click', showHint);

  document.querySelectorAll('.picker-number').forEach((button) => {
    button.addEventListener('click', () => {
      updateCell(Number(button.dataset.number));
    });
  });
}

attachEvents();
