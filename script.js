const boardElement = document.getElementById('sudokuBoard');
const statusText = document.querySelector('.status-text');
const hintButton = document.querySelector('.hint-button');
const pickerOverlay = document.getElementById('pickerOverlay');
const hintOverlay = document.getElementById('hintOverlay');
const hintMessage = document.getElementById('hintMessage');
const pickerCancel = document.getElementById('pickerCancel');
const pickerModeButtons = document.querySelectorAll('.picker-mode');
const pickerModeLabel = document.getElementById('pickerModeLabel');
const pickerHint = document.getElementById('pickerHint');
const pickerApply = document.getElementById('pickerApply');
const pickerClear = document.getElementById('pickerClear');

let currentBoard = [];
let fixedCells = [];
let selectedCell = null;
let pickerMode = 'confirmed';
let pickerTempCandidates = [];
let hintTarget = null;
let solutionBoard = [];

function createCell(value, status = 'empty', candidates = []) {
  return { value, status, candidates };
}

function getCellValue(row, col) {
  const cell = currentBoard[row][col];
  return cell.status === 'confirmed' || cell.status === 'fixed' ? cell.value : 0;
}

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
  const initialBoard = removeCells(solutionBoard, difficultyMap[level]);
  fixedCells = initialBoard.map((row) => row.map((value) => value !== 0));
  currentBoard = initialBoard.map((row, rowIndex) => row.map((value, colIndex) => {
    if (value !== 0) return createCell(value, 'fixed');
    return createCell('', 'empty');
  }));
  selectedCell = null;
  pickerMode = 'confirmed';
  pickerTempCandidates = [];
  hintTarget = null;
  hideHint();
  updatePickerState();
  statusText.textContent = `已选择${difficultyLabels[level]}难度。点击空格填写数字，或者使用提示。`;
  renderBoard();
}

function renderBoard() {
  boardElement.innerHTML = '';
  currentBoard.forEach((row, rowIndex) => {
    row.forEach((cellData, colIndex) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'sudoku-cell';
      cell.dataset.row = rowIndex;
      cell.dataset.col = colIndex;
      cell.dataset.fixed = fixedCells[rowIndex][colIndex];
      if (cellData.status === 'uncertain') {
        cell.textContent = cellData.candidates.join(' ');
      } else if (cellData.status === 'confirmed' || cellData.status === 'fixed') {
        cell.textContent = cellData.value;
      } else {
        cell.textContent = '';
      }
      if (cellData.status === 'empty') {
        cell.classList.add('empty');
      }
      if (cellData.status === 'uncertain') {
        cell.classList.add('uncertain');
      }
      if (cellData.status === 'confirmed') {
        cell.classList.add('confirmed');
      }
      if (cellData.status === 'fixed') {
        cell.classList.add('fixed');
      }
      if (cellData.status === 'confirmed' || cellData.status === 'fixed') {
        if (!isMoveValid(rowIndex, colIndex, cellData.value)) {
          cell.classList.add('invalid');
        }
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

function getPossibleValuesForCell(row, col) {
  const cellData = currentBoard[row][col];
  if (cellData.status === 'empty' || cellData.status === 'uncertain') return getCandidates(row, col);
  return getCandidates(row, col);
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
  pickerTempCandidates = [];
  updatePickerState();
  pickerOverlay.classList.remove('hidden');
}

function hidePicker() {
  pickerOverlay.classList.add('hidden');
}

function updateCell(value) {
  if (!selectedCell) return;
  const { row, col } = selectedCell;
  if (value === 0) {
    currentBoard[row][col] = createCell('', 'empty');
    statusText.textContent = '已清除这个格子。';
    pickerTempCandidates = [];
  } else if (pickerMode === 'confirmed') {
    if (isMoveValid(row, col, value)) {
      currentBoard[row][col] = createCell(value, 'confirmed');
      selectedCell = null;
      statusText.textContent = `已填入 ${value}，这个数字现在是确定的。`;
    } else {
      currentBoard[row][col] = createCell(value, 'confirmed');
      statusText.textContent = `数字 ${value} 与现有数字冲突，请检查。`;
    }
  }
  hidePicker();
  renderBoard();
  if (isComplete()) {
    statusText.textContent = '太棒了！你完成了数独！';
  }
}

function applyPendingCandidates() {
  if (!selectedCell) return;
  const { row, col } = selectedCell;
  if (pickerTempCandidates.length === 0) {
    statusText.textContent = '请选择至少一个待定数字。';
    return;
  }
  currentBoard[row][col] = createCell('', 'uncertain', [...pickerTempCandidates]);
  selectedCell = null;
  statusText.textContent = `已标记为待定：${pickerTempCandidates.join('、')}。`;
  pickerTempCandidates = [];
  hidePicker();
  renderBoard();
}

function isMoveValid(row, col, value) {
  if (value === 0) return true;
  for (let i = 0; i < 9; i += 1) {
    const rowValue = getCellValue(row, i);
    const colValue = getCellValue(i, col);
    if (rowValue === value && i !== col) return false;
    if (colValue === value && i !== row) return false;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r += 1) {
    for (let c = startCol; c < startCol + 3; c += 1) {
      const boxValue = getCellValue(r, c);
      if (boxValue === value && (r !== row || c !== col)) return false;
    }
  }
  return true;
}

function sameBox(row1, col1, row2, col2) {
  return Math.floor(row1 / 3) === Math.floor(row2 / 3) && Math.floor(col1 / 3) === Math.floor(col2 / 3);
}

function getCandidates(row, col) {
  const candidates = [];
  const currentValue = getCellValue(row, col);
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
  const used = currentBoard[row]
    .filter((cell) => cell.status === 'confirmed' || cell.status === 'fixed')
    .map((cell) => cell.value);
  return getMissingNumbers(used);
}

function getColMissing(col) {
  const used = [];
  for (let r = 0; r < 9; r += 1) {
    const cell = currentBoard[r][col];
    if (cell.status === 'confirmed' || cell.status === 'fixed') used.push(cell.value);
  }
  return getMissingNumbers(used);
}

function getBoxMissing(row, col) {
  const used = [];
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r += 1) {
    for (let c = startCol; c < startCol + 3; c += 1) {
      const cell = currentBoard[r][c];
      if (cell.status === 'confirmed' || cell.status === 'fixed') used.push(cell.value);
    }
  }
  return getMissingNumbers(used);
}

function showHint() {
  const candidatesList = [];
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const cell = currentBoard[row][col];
      if (cell.status === 'confirmed' || cell.status === 'fixed') continue;
      const candidates = getCandidates(row, col);
      if (candidates.length > 0) {
        candidatesList.push({ row, col, candidates });
      }
    }
  }
  if (candidatesList.length === 0) {
    hintMessage.textContent = '恭喜你，棋盘已经完成，无需提示。';
  } else {
    candidatesList.sort((a, b) => a.candidates.length - b.candidates.length);
    const choice = candidatesList[0];
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
      `所以这个位置最适合的候选数字是：<strong>${candidateText}</strong>。`;
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
      const cell = currentBoard[row][col];
      if (cell.status !== 'confirmed' && cell.status !== 'fixed') return false;
    }
  }
  return true;
}

function resetPickerNumbers() {
  document.querySelectorAll('.picker-number').forEach((button) => {
    button.classList.remove('active');
  });
}

function updatePickerState() {
  pickerModeLabel.textContent = `当前模式：${pickerMode === 'confirmed' ? '确定' : '待定'}`;
  pickerHint.textContent = pickerMode === 'confirmed'
    ? '点击数字即可填入一个确定值。' 
    : '点击数字可选多个待定候选，完成后点击“应用待定”。';
  pickerApply.classList.toggle('hidden', pickerMode !== 'uncertain');
  if (pickerMode === 'confirmed') {
    pickerTempCandidates = [];
  }
  pickerModeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === pickerMode);
  });
  resetPickerNumbers();
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
  pickerClear.addEventListener('click', () => updateCell(0));
  hintClose.addEventListener('click', hideHint);
  hintButton.addEventListener('click', showHint);
  pickerApply.addEventListener('click', applyPendingCandidates);

  pickerModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      pickerMode = button.dataset.mode;
      pickerTempCandidates = [];
      updatePickerState();
    });
  });

  document.querySelectorAll('.picker-number').forEach((button) => {
    button.addEventListener('click', () => {
      const number = Number(button.dataset.number);
      if (pickerMode === 'confirmed') {
        updateCell(number);
      } else {
        const index = pickerTempCandidates.indexOf(number);
        if (index === -1) {
          pickerTempCandidates.push(number);
          button.classList.add('active');
        } else {
          pickerTempCandidates.splice(index, 1);
          button.classList.remove('active');
        }
        pickerHint.textContent = `待定候选：${pickerTempCandidates.join('、') || '无'}。点击继续选择或点击应用待定。`;
      }
    });
  });
}

attachEvents();
