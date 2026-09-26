(() => {
  const $ = selector => document.querySelector(selector);

  const photoStart = [
    'G1', 'F3', 'F1',
    'G2', 'K1', 'F2',
    'G3', 'K2', '.'
  ];

  let state = Engine.goal.slice();
  let history = [];
  let solutionSteps = [];
  let solutionPosition = 0;
  let timerHandle = null;
  let elapsedSeconds = 0;
  let selectedTile = '';

  function renderBoard(selector, tiles, onTileClick) {
    const container = $(selector);

    if (!container) {
      return;
    }

    container.innerHTML = '';

    tiles.forEach((tile, index) => {
      const button = document.createElement('button');

      button.className = `tile ${tile === '.' ? 'empty' : ''}`;
      button.textContent = tile;
      button.type = 'button';

      button.setAttribute(
        'aria-label',
        tile === '.' ? 'Freies Feld' : `Kachel ${tile}`
      );

      button.onclick = () => {
        if (onTileClick) {
          onTileClick(index);
        }
      };

      container.append(button);
    });
  }

  function setText(selector, value) {
    const element = $(selector);

    if (element) {
      element.textContent = value;
    }
  }

  function currentSolverState() {
    if (solutionPosition <= 0) {
      return state;
    }

    const step = solutionSteps[solutionPosition - 1];

    return step?.state || state;
  }

  function isSolved() {
    return Engine.key(state) === Engine.key(Engine.goal);
  }

  function updateMoveCounters() {
    setText('#moves', history.length);

    const parElement = $('#par');
    const par = Number(parElement?.textContent);

    if (Number.isFinite(par)) {
      setText('#delta', history.length - par);
    } else {
      setText('#delta', '–');
    }
  }

  function updateVariantCode() {
    const codeInput = $('#code');

    if (codeInput) {
      codeInput.value = state.join(',');
    }
  }

  function renderGameBoard() {
    renderBoard('#game', state, clickedIndex => {
      const legalMove = Engine.next(state).find(
        move => move.state[clickedIndex] === '.'
      );

      if (!legalMove) {
        return;
      }

      history.push(state.slice());
      state = legalMove.state.slice();

      updateMoveCounters();
      renderAll();

      if (isSolved()) {
        setText('#notice', '🎉 Geschafft! Alle Tiere sind korrekt zusammengesetzt.');
        clearInterval(timerHandle);
      }
    });
  }

  function renderSolverBoard() {
    renderBoard('#solveBoard', currentSolverState());
  }

  function renderAll() {
    renderGameBoard();
    renderSolverBoard();
    updateVariantCode();
  }

  function renderEditorPalette() {
    const palette = $('#palette');

    if (!palette) {
      return;
    }

    palette.innerHTML = '';

    Engine.goal.forEach(tile => {
      const button = document.createElement('button');

      button.type = 'button';
      button.textContent = tile;
      button.className = tile === selectedTile ? 'selected' : '';

      button.onclick = () => {
        selectedTile = tile;
        renderEditorPalette();
      };

      palette.append(button);
    });
  }

  function renderEditorBoard() {
    renderBoard('#edit', state, index => {
      if (!selectedTile) {
        setText('#valid', 'Bitte zuerst eine Kachel aus der Palette auswählen.');
        return;
      }

      const oldIndex = state.indexOf(selectedTile);

      if (oldIndex >= 0) {
        [state[index], state[oldIndex]] = [state[oldIndex], state[index]];
      } else {
        state[index] = selectedTile;
      }

      updateEditorValidation();
      renderAll();
      renderEditorBoard();
    });
  }

  function updateEditorValidation() {
    const validation = $('#valid');

    if (!validation) {
      return;
    }

    if (!Engine.valid(state)) {
      validation.textContent =
        'Ungültige oder unvollständige Variante: Jede Kachel und genau ein freies Feld müssen genau einmal vorhanden sein.';
      return;
    }

    if (!Engine.possible(state)) {
      validation.textContent =
        'Gültig, aber unlösbar: Diese Kachelanordnung kann durch Schieben nicht gelöst werden.';
      return;
    }

    const result = Engine.solve(state);

    validation.textContent =
      `Gültig und lösbar: ${result.path.length} minimale Züge.`;
  }

  function setupEditor() {
    renderEditorPalette();
    renderEditorBoard();
    updateEditorValidation();
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return (
      `${String(minutes).padStart(2, '0')}:` +
      `${String(seconds).padStart(2, '0')}`
    );
  }

  function startTimer() {
    clearInterval(timerHandle);

    elapsedSeconds = 0;
    setText('#time', formatTime(elapsedSeconds));

    timerHandle = setInterval(() => {
      elapsedSeconds += 1;
      setText('#time', formatTime(elapsedSeconds));
    }, 1000);
  }

  function createRandomGame() {
    const level = $('#level');

    if (!level) {
      return;
    }

    const [minimum, maximum] = level.value
      .split(',')
      .map(Number);

    state = Engine.random(minimum, maximum);
    history = [];

    const result = Engine.solve(state);

    setText('#moves', '0');
    setText('#par', result.path.length);
    setText('#delta', '0');
    setText(
      '#notice',
      `Neues Rätsel erstellt. Die optimale Lösung benötigt ${result.path.length} Züge.`
    );

    startTimer();
    renderAll();
    updateEditorValidation();
  }

  function undoMove() {
    if (!history.length) {
      return;
    }

    state = history.pop();

    updateMoveCounters();
    renderAll();
    updateEditorValidation();
  }

  function showHint() {
    if (!Engine.valid(state)) {
      setText('#notice', 'Die aktuelle Variante ist ungültig.');
      return;
    }

    const result = Engine.solve(state);

    if (!result.path.length) {
      setText('#notice', 'Das Puzzle ist bereits gelöst.');
      return;
    }

    const hint = result.path[0];

    setText(
      '#notice',
      `💡 Tipp: Schiebe ${hint.tile} ${hint.arrow}.`
    );
  }

  function calculateSolution() {
    if (!Engine.valid(state)) {
      setText(
        '#solveStatus',
        'Ungültige Variante: Es werden acht eindeutige Kacheln und ein freies Feld benötigt.'
      );

      solutionSteps = [];
      solutionPosition = 0;
      renderSolverBoard();
      return;
    }

    const result = Engine.solve(state);

    solutionSteps = [];
    solutionPosition = 0;

    let currentState = state.slice();

    result.path.forEach(step => {
      currentState = step.state.slice();

      solutionSteps.push({
