(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const PHOTO_START = [
    'G1', 'F3', 'F1',
    'G2', 'K1', 'F2',
    'G3', 'K2', '.'
  ];

  let state = PHOTO_START.slice();
  let history = [];
  let solution = [];
  let solutionIndex = 0;
  let selectedTile = '';
  let timerHandle = null;
  let elapsedSeconds = 0;

  function elementExists(selector) {
    return Boolean($(selector));
  }

  function setText(selector, text) {
    const element = $(selector);

    if (element) {
      element.textContent = String(text);
    }
  }

  function setHTML(selector, html) {
    const element = $(selector);

    if (element) {
      element.innerHTML = html;
    }
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return (
      `${String(minutes).padStart(2, '0')}:` +
      `${String(remainingSeconds).padStart(2, '0')}`
    );
  }

  function cloneBoard(board) {
    return Array.isArray(board) ? board.slice() : [];
  }

  function getFreeIndex(board) {
    return board.indexOf('.');
  }

  function getTileName(tile) {
    const names = {
      G1: 'Giraffe – Kopf',
      G2: 'Giraffe – Hals',
      G3: 'Giraffe – Beine',
      F1: 'Flamingo – Kopf',
      F2: 'Flamingo – Körper',
      F3: 'Flamingo – Beine',
      K1: 'Koala – Kopf',
      K2: 'Koala – Baum',
      '.': 'Freies Feld'
    };

    return names[tile] || tile;
  }

  function updateCodeField() {
    const codeInput = $('#code');

    if (codeInput) {
      codeInput.value = state.join(',');
    }
  }

  function updateMoveStatistics() {
    const moves = history.length;
    const parText = $('#par')?.textContent ?? '';
    const par = Number(parText);

    setText('#moves', moves);

    if (Number.isFinite(par)) {
      setText('#delta', moves - par);
    } else {
      setText('#delta', '–');
    }
  }

  function clearTimer() {
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
  }

  function startTimer() {
    clearTimer();

    elapsedSeconds = 0;
    setText('#time', formatTime(elapsedSeconds));

    timerHandle = window.setInterval(() => {
      elapsedSeconds += 1;
      setText('#time', formatTime(elapsedSeconds));
    }, 1000);
  }

  function renderBoard(selector, board, callback) {
    const container = $(selector);

    if (!container) {
      return;
    }

    container.innerHTML = '';

    board.forEach((tile, index) => {
      const button = document.createElement('button');

      button.type = 'button';
      button.className = `tile ${tile === '.' ? 'empty' : ''}`;
      button.dataset.index = String(index);
      button.dataset.tile = tile;
      button.textContent = tile;

      button.setAttribute(
        'aria-label',
        tile === '.'
          ? 'Freies Feld'
          : `${getTileName(tile)} – Feld ${index + 1}`
      );

      button.addEventListener('click', () => {
        if (typeof callback === 'function') {
          callback(index, tile);
        }
      });

      container.append(button);
    });
  }

  function getLegalMoveForTileIndex(tileIndex) {
    if (!Engine?.next) {
      return null;
    }

    return Engine.next(state).find(move => {
      return move.state[tileIndex] === '.';
    }) || null;
  }

  function isSolved(board = state) {
    if (!Engine?.key || !Engine?.goal) {
      return false;
    }

    return Engine.key(board) === Engine.key(Engine.goal);
  }

  function renderGameBoard() {
    renderBoard('#game', state, tileIndex => {
      const move = getLegalMoveForTileIndex(tileIndex);

      if (!move) {
        setText(
          '#notice',
          'Diese Kachel kann nicht bewegt werden. Wähle eine Kachel direkt neben dem freien Feld.'
        );
        return;
      }

      history.push(cloneBoard(state));
      state = cloneBoard(move.state);

      updateMoveStatistics();
      renderAll();

      if (isSolved()) {
        clearTimer();
        setText(
          '#notice',
          `🎉 Geschafft! Du hast das Puzzle in ${history.length} Zügen und ${formatTime(elapsedSeconds)} gelöst.`
        );
      }
    });
  }

  function getSolverBoard() {
    if (solutionIndex <= 0) {
      return state;
    }

    return solution[solutionIndex - 1]?.state || state;
  }

  function renderSolverBoard() {
    renderBoard('#solveBoard', getSolverBoard());
  }

  function renderAll() {
    renderGameBoard();
    renderSolverBoard();
    updateCodeField();
  }

  function setStatus(selector, text, stateClass = '') {
    const element = $(selector);

    if (!element) {
      return;
    }

    element.textContent = text;
    element.classList.remove('ok', 'bad', 'warn');

    if (stateClass) {
      element.classList.add(stateClass);
    }
  }

  function validateCurrentBoard() {
    if (!Engine?.valid || !Engine?.possible || !Engine?.solve) {
      return {
        valid: false,
        possible: false,
        message: 'Die Puzzle-Engine wurde nicht geladen.'
      };
    }

    if (!Engine.valid(state)) {
      return {
        valid: false,
        possible: false,
        message:
          'Ungültige Eingabe: Jede Kachel muss genau einmal vorkommen und es muss genau ein freies Feld geben.'
      };
    }

    if (!Engine.possible(state)) {
      return {
        valid: true,
        possible: false,
        message:
          'Die Anordnung ist gültig, aber mathematisch nicht durch Schieben lösbar.'
      };
    }

    const result = Engine.solve(state);

    return {
      valid: true,
      possible: true,
      moves: result.path.length,
      message: `Gültig und lösbar: ${result.path.length} minimale Züge.`
    };
  }

  function updateEditorValidation() {
    const result = validateCurrentBoard();

    if (!result.valid) {
      setStatus('#valid', result.message, 'warn');
      return result;
    }

    if (!result.possible) {
      setStatus('#valid', result.message, 'bad');
      return result;
    }

    setStatus('#valid', result.message, 'ok');
    return result;
  }

  function renderPalette() {
    const palette = $('#palette');

    if (!palette || !Engine?.goal) {
      return;
    }

    palette.innerHTML = '';

    const paletteTiles = [...Engine.goal];

    paletteTiles.forEach(tile => {
      const button = document.createElement('button');

      button.type = 'button';
      button.className = tile === selectedTile ? 'selected' : '';
      button.textContent = tile;
      button.setAttribute('aria-label', getTileName(tile));

      button.addEventListener('click', () => {
        selectedTile = tile;
        renderPalette();
      });

      palette.append(button);
    });
  }

  function renderEditorBoard() {
    renderBoard('#edit', state, index => {
      if (!selectedTile) {
        setStatus(
          '#valid',
          'Bitte wähle zuerst eine Kachel aus der Palette aus.',
          'warn'
        );
        return;
      }

      const oldIndex = state.indexOf(selectedTile);

      if (oldIndex >= 0) {
        [state[index], state[oldIndex]] = [
          state[oldIndex],
          state[index]
        ];
      } else {
        state[index] = selectedTile;
      }

      history = [];
      updateMoveStatistics();
      updateEditorValidation();
      renderAll();
      renderEditorBoard();
    });
  }

  function setupEditor() {
    renderPalette();
    renderEditorBoard();
    updateEditorValidation();
  }

  function createRandomPuzzle() {
    const level = $('#level');

    if (!level || !Engine?.random || !Engine?.solve) {
      return;
    }

    const [minimum, maximum] = level.value
      .split(',')
      .map(Number);

    state = cloneBoard(Engine.random(minimum, maximum));
    history = [];

    const solutionResult = Engine.solve(state);

    setText('#moves', '0');
    setText('#par', solutionResult.path.length);
    setText('#delta', '0');

    setText(
      '#notice',
      `Neues Rätsel gestartet. Die optimale Lösung benötigt ${solutionResult.path.length} Züge.`
    );

    startTimer();
    renderAll();
    updateEditorValidation();
  }

  function undoMove() {
    if (!history.length) {
      setText('#notice', 'Es gibt noch keinen Zug zum Zurücknehmen.');
      return;
    }

    state = history.pop();

    updateMoveStatistics();
    renderAll();
    updateEditorValidation();
  }

  function showHint() {
    const validation = validateCurrentBoard();

    if (!validation.valid || !validation.possible) {
      setText('#notice', validation.message);
      return;
    }

    const result = Engine.solve(state);

    if (!result.path.length) {
      setText('#notice', 'Das Puzzle ist bereits gelöst.');
      return;
    }

    const firstMove = result.path[0];

    setText(
      '#notice',
      `💡 Tipp: Schiebe ${getTileName(firstMove.tile)} ${firstMove.arrow}.`
    );
  }

  function calculateSolution() {
    const validation = validateCurrentBoard();

    if (!validation.valid || !validation.possible) {
      setStatus('#solveStatus', validation.message, 'bad');
      solution = [];
      solutionIndex = 0;
      renderSolverBoard();
      setHTML('#steps', '');
      return;
    }

    const result = Engine.solve(state);
    let runningState = cloneBoard(state);

    solution = result.path.map(move => {
      runningState = cloneBoard(move.state);

      return {
        ...move,
        state: cloneBoard(runningState)
      };
    });

    solutionIndex = 0;

    setStatus(
      '#solveStatus',
      `${result.status} – ${result.path.length} minimale Züge`,
      'ok'
    );

    const stepList = $('#steps');

    if (stepList) {
      stepList.innerHTML = '';

      solution.forEach((move, index) => {
        const item = document.createElement('li');

        item.dataset.index = String(index);
        item.textContent =
          `${index + 1}. ${getTileName(move.tile)} ${move.arrow}`;

        item.addEventListener('click', () => {
          solutionIndex = index + 1;
          renderSolverBoard();
        });

        stepList.append(item);
      });
    }

    renderSolverBoard();
  }

  function setSolutionIndex(index) {
    solutionIndex = Math.max(
      0,
      Math.min(solution.length, index)
    );

    renderSolverBoard();
  }

  function openSolverForCurrentState() {
    const solverNavigationButton = $('[data-page="solver"]');

    if (solverNavigationButton) {
      solverNavigationButton.click();
    }

    calculateSolution();
  }

  function loadCode() {
    const codeInput = $('#code');

    if (!codeInput) {
      return;
    }

    const parsed = codeInput.value
      .split(',')
      .map(value => value.trim());

    if (!Engine?.valid || !Engine.valid(parsed)) {
      setStatus(
        '#valid',
        'Ungültiger Code: Es werden genau neun eindeutige gültige Werte benötigt.',
        'bad'
      );
      return;
    }

    state = cloneBoard(parsed);
    history = [];

    updateMoveStatistics();
    renderAll();
    renderEditorBoard();
    updateEditorValidation();

    setText('#notice', 'Varianten-Code geladen.');
  }

  async function copyCode() {
    const code = state.join(',');

    try {
      await navigator.clipboard.writeText(code);
      setText('#notice', 'Varianten-Code wurde in die Zwischenablage kopiert.');
    } catch (error) {
      const input = $('#code');

      if (input) {
        input.focus();
        input.select();
        document.execCommand('copy');
      }

      setText('#notice', 'Varianten-Code wurde kopiert.');
    }
  }

  function restorePhotoStart() {
    state = cloneBoard(PHOTO_START);
    history = [];

    updateMoveStatistics();
    renderAll();
    renderEditorBoard();
    updateEditorValidation();

    setText('#notice', 'Der fotografierte Ausgangszustand wurde geladen.');
  }

  function clearEditor() {
    state = Array(9).fill('');
    history = [];

    updateMoveStatistics();
    renderAll();
    renderEditorBoard();
    updateEditorValidation();
  }

  function playEditorState() {
    const playNavigationButton = $('[data-page="play"]');

    if (playNavigationButton) {
      playNavigationButton.click();
    }

    renderAll();
  }

  function refreshSavedVariants() {
    const select = $('#saved');

    if (!select || !window.Store?.all) {
      return;
    }

    select.innerHTML = '';

    Store.all().forEach(entry => {
      const option = document.createElement('option');

      option.value = entry.name;
      option.textContent = entry.name;

      select.append(option);
    });
  }

  function saveCurrentVariant() {
    if (!window.Store?.put) {
      return;
    }

    const name = $('#saveName')?.value?.trim() || 'Variante';

    Store.put(name, cloneBoard(state));
    refreshSavedVariants();

    setText('#notice', `Variante „${name}“ gespeichert.`);
  }

  function deleteSavedVariant() {
    const select = $('#saved');

    if (!select || !select.value || !window.Store?.del) {
      return;
    }

    if (!window.confirm('Variante wirklich löschen?')) {
      return;
    }

    Store.del(select.value);
    refreshSavedVariants();

    setText('#notice', 'Gespeicherte Variante wurde gelöscht.');
  }

  function switchPage(pageId) {
    $$('.page').forEach(page => {
      page.classList.toggle('hide', page.id !== pageId);
    });
  }

  function bindEvents() {
    $$('[data-page]').forEach(button => {
      button.addEventListener('click', () => {
        switchPage(button.dataset.page);
      });
    });

    const bindings = [
      ['#random', createRandomPuzzle],
      ['#undo', undoMove],
      ['#hint', showHint],
      ['#solve', calculateSolution],
      ['#toSolver', openSolverForCurrentState],
      ['#first', () => setSolutionIndex(0)],
      ['#back', () => setSolutionIndex(solutionIndex - 1)],
      ['#next', () => setSolutionIndex(solutionIndex + 1)],
      ['#load', loadCode],
      ['#copy', copyCode],
      ['#photoStart', restorePhotoStart],
      ['#clear', clearEditor],
      ['#playEdited', playEditorState],
      ['#save', saveCurrentVariant],
      ['#delete', deleteSavedVariant]
    ];

    bindings.forEach(([selector, handler]) => {
      const element = $(selector);

      if (element) {
        element.addEventListener('click', handler);
      }
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register('service-worker.js')
      .catch(error => {
        console.warn(
          'Service Worker konnte nicht registriert werden:',
          error
        );
      });
  }

  function initialize() {
    bindEvents();

    state = cloneBoard(PHOTO_START);
    history = [];

    setupEditor();
    refreshSavedVariants();
    renderAll();
    updateEditorValidation();

    if (Engine?.solve) {
      const result = Engine.solve(state);

      if (result?.path) {
        setText('#par', result.path.length);
        setText('#delta', '0');
      }
    }

    setText(
      '#notice',
      'Klicke eine Kachel an, die direkt neben dem freien Feld liegt. Ziel: alle Tiere korrekt zusammensetzen.'
    );

    registerServiceWorker();
  }

  document.addEventListener('DOMContentLoaded', initialize);
})();
