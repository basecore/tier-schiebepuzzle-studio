(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const TILE_IMAGES = {
    F1: 'assets/tiles/flamingo-kopf.jpg',
    F2: 'assets/tiles/flamingo-koerper.jpg',
    F3: 'assets/tiles/flamingo-beine.jpg',
    G1: 'assets/tiles/giraffe-kopf.jpg',
    G2: 'assets/tiles/giraffe-hals.jpg',
    G3: 'assets/tiles/giraffe-beine.jpg',
    K1: 'assets/tiles/koala-kopf.jpg',
    K2: 'assets/tiles/koala-baum.jpg'
  };

  const TILE_NAMES = {
    G1: 'Giraffe – Kopf',
    G2: 'Giraffe – Hals',
    G3: 'Giraffe – Beine',
    F1: 'Flamingo – Kopf',
    F2: 'Flamingo – Körper',
    F3: 'Flamingo – Beine',
    K1: 'Koala – Kopf',
    K2: 'Koala – Baum / Unterteil',
    '.': 'Freies Feld'
  };

  const PHOTO_START = ['G1', 'F3', 'F1', 'G2', 'K1', 'F2', 'G3', 'K2', '.'];
  const TILE_KEYS = ['G1', 'G2', 'G3', 'F1', 'F2', 'F3', 'K1', 'K2'];

  let state = PHOTO_START.slice();
  let history = [];
  let solution = [];
  let solutionIndex = 0;
  let selectedTile = 'G1';
  let suggestedTile = null;
  let timerId = null;
  let elapsedSeconds = 0;
  let cropImage = null;
  let crop = { x: 0, y: 0, size: 0 };
  let cropPointer = null;
  let importedTiles = [];
  let importedAssignments = [];
  let customTileImages = {};

  function text(selector, value) {
    const el = $(selector);
    if (el) el.textContent = String(value);
  }

  function html(selector, value) {
    const el = $(selector);
    if (el) el.innerHTML = value;
  }

  function nameOf(tile) {
    return TILE_NAMES[tile] || tile;
  }

  function imageFor(tile) {
    return customTileImages[tile] || TILE_IMAGES[tile] || '';
  }

  function clone(board) {
    return Array.isArray(board) ? board.slice() : [];
  }

  function key(board) {
    return board.join(',');
  }

  function validBoard(board) {
    if (window.Engine?.valid) return Engine.valid(board);
    return board.length === 9 && board.filter(x => x === '.').length === 1 && TILE_KEYS.every(t => board.filter(x => x === t).length === 1);
  }

  function solve(board) {
    if (!window.Engine?.solve) return { status: 'Engine fehlt', path: [] };
    return Engine.solve(board);
  }

  function possible(board) {
    if (!window.Engine?.possible) return false;
    return Engine.possible(board);
  }

  function setNotice(selector, message, type = 'info') {
    const el = $(selector);
    if (!el) return;
    el.textContent = message;
    el.className = `notice ${type}`;
  }

  function formatTime(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function updateCode() {
    const field = $('#code');
    if (field) field.value = state.join(',');
  }

  function updateStats() {
    text('#moves', history.length);
    const par = Number($('#par')?.textContent || 0);
    text('#delta', Number.isFinite(par) ? history.length - par : '–');
  }

  function stopTimer() {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  }

  function startTimer() {
    stopTimer();
    elapsedSeconds = 0;
    text('#time', '00:00');
    timerId = window.setInterval(() => {
      elapsedSeconds += 1;
      text('#time', formatTime(elapsedSeconds));
    }, 1000);
  }

  function makeTile(tile, index, onClick, options = {}) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tile ${tile === '.' ? 'empty' : ''}`;
    button.dataset.tile = tile;
    button.dataset.index = String(index);
    button.setAttribute('aria-label', nameOf(tile));

    if (tile === '.') {
      button.textContent = 'FREI';
    } else {
      const src = imageFor(tile);
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = nameOf(tile);
        img.addEventListener('error', () => {
          img.remove();
          button.append(document.createTextNode(tile));
        });
        button.append(img);
      } else {
        button.textContent = tile;
      }
      const badge = document.createElement('span');
      badge.className = 'tile-code';
      badge.textContent = tile;
      button.append(badge);
    }

    if (options.movable) button.classList.add('movable');
    if (options.suggested) button.classList.add('suggested');
    if (typeof onClick === 'function') button.addEventListener('click', () => onClick(index, tile));
    return button;
  }

  function renderBoard(selector, board, onClick, options = {}) {
    const host = $(selector);
    if (!host) return;
    host.innerHTML = '';
    const free = board.indexOf('.');
    board.forEach((tile, index) => {
      const movable = options.showMoves && window.Engine?.next
        ? Engine.next(board).some(move => move.state[index] === '.')
        : false;
      host.append(makeTile(tile, index, onClick, {
        movable,
        suggested: tile === suggestedTile && index !== free
      }));
    });
  }

  function isSolved() {
    return window.Engine?.key && window.Engine?.goal && Engine.key(state) === Engine.key(Engine.goal);
  }

  function playMove(index) {
    if (!window.Engine?.next) return;
    const move = Engine.next(state).find(candidate => candidate.state[index] === '.');
    if (!move) {
      setNotice('#notice', 'Diese Kachel liegt nicht direkt neben dem freien Feld.', 'warn');
      return;
    }
    history.push(clone(state));
    state = clone(move.state);
    suggestedTile = null;
    updateStats();
    renderAll();
    if (isSolved()) {
      stopTimer();
      setNotice('#notice', `🎉 Geschafft! ${history.length} Züge in ${formatTime(elapsedSeconds)}.`, 'ok');
    }
  }

  function renderGame() {
    renderBoard('#game', state, index => playMove(index), { showMoves: true });
  }

  function currentSolveBoard() {
    return solutionIndex > 0 ? solution[solutionIndex - 1].state : state;
  }

  function renderSolverBoard() {
    renderBoard('#solveBoard', currentSolveBoard(), null);
  }

  function renderAll() {
    renderGame();
    renderSolverBoard();
    updateCode();
  }

  function validation() {
    if (!validBoard(state)) return { valid: false, possible: false, message: 'Ungültig: Jede Kachel und genau ein freies Feld müssen einmal vorhanden sein.' };
    if (!possible(state)) return { valid: true, possible: false, message: 'Gültig, aber unlösbar: falsche Schiebe-Parität.' };
    const result = solve(state);
    return { valid: true, possible: true, moves: result.path.length, message: `Gültig und lösbar: ${result.path.length} minimale Züge.` };
  }

  function updateEditorStatus() {
    const result = validation();
    setNotice('#valid', result.message, result.valid && result.possible ? 'ok' : result.valid ? 'bad' : 'warn');
    return result;
  }

  function renderPalette() {
    const host = $('#palette');
    if (!host) return;
    host.innerHTML = '';
    [...TILE_KEYS, '.'].forEach((tile, index) => {
      const button = makeTile(tile, index, null);
      button.className = `pick ${tile === selectedTile ? 'selected' : ''}`;
      button.addEventListener('click', () => {
        selectedTile = tile;
        renderPalette();
      });
      host.append(button);
    });
  }

  function placeEditorTile(index) {
    if (!selectedTile) return;
    const old = state.indexOf(selectedTile);
    if (old >= 0) [state[index], state[old]] = [state[old], state[index]];
    else state[index] = selectedTile;
    history = [];
    updateStats();
    renderAll();
    renderEditor();
  }

  function renderEditor() {
    renderBoard('#edit', state, index => placeEditorTile(index));
    updateEditorStatus();
  }

  function createRandom() {
    const [min, max] = ($('#level')?.value || '7,12').split(',').map(Number);
    if (!window.Engine?.random) return;
    state = clone(Engine.random(min, max));
    history = [];
    suggestedTile = null;
    const result = solve(state);
    text('#par', result.path.length);
    updateStats();
    startTimer();
    setNotice('#notice', `Neues Rätsel: optimal ${result.path.length} Züge.`, 'info');
    renderAll();
    renderEditor();
  }

  function undo() {
    if (!history.length) return;
    state = history.pop();
    suggestedTile = null;
    updateStats();
    renderAll();
    renderEditor();
  }

  function hint() {
    const check = validation();
    if (!check.valid || !check.possible) {
      setNotice('#notice', check.message, 'warn');
      return;
    }
    const step = solve(state).path[0];
    if (!step) {
      setNotice('#notice', 'Das Puzzle ist bereits gelöst.', 'ok');
      return;
    }
    suggestedTile = step.tile;
    setNotice('#notice', `💡 Tipp: ${nameOf(step.tile)} ${step.arrow}.`, 'warn');
    renderGame();
  }

  function calculateSolution() {
    const check = validation();
    const list = $('#steps');
    if (list) list.innerHTML = '';
    solution = [];
    solutionIndex = 0;
    if (!check.valid || !check.possible) {
      setNotice('#solveStatus', check.message, 'bad');
      renderSolverBoard();
      return;
    }
    const result = solve(state);
    let running = clone(state);
    solution = result.path.map(step => {
      running = clone(step.state);
      return { ...step, state: clone(running) };
    });
    setNotice('#solveStatus', `${result.status} – ${solution.length} minimale Züge`, 'ok');
    if (list) {
      solution.forEach((step, index) => {
        const item = document.createElement('li');
        item.textContent = `${index + 1}. ${nameOf(step.tile)} ${step.arrow}`;
        item.addEventListener('click', () => {
          solutionIndex = index + 1;
          renderSolverBoard();
          [...list.children].forEach((el, i) => el.classList.toggle('active', i === index));
        });
        list.append(item);
      });
    }
    renderSolverBoard();
  }

  function switchPage(id) {
    $$('.page').forEach(page => page.classList.toggle('active', page.id === id));
    $$('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.page === id));
  }

  function loadCode() {
    const value = $('#codeLoad')?.value || $('#code')?.value || '';
    const parsed = value.split(',').map(x => x.trim());
    if (!validBoard(parsed)) {
      setNotice('#valid', 'Ungültiger Code: Es sind exakt acht Kacheln und ein freies Feld erforderlich.', 'bad');
      return;
    }
    state = clone(parsed);
    history = [];
    suggestedTile = null;
    updateStats();
    renderAll();
    renderEditor();
    setNotice('#notice', 'Varianten-Code geladen.', 'ok');
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(state.join(','));
      setNotice('#notice', 'Varianten-Code kopiert.', 'ok');
    } catch {
      const field = $('#code');
      field?.select();
      document.execCommand('copy');
    }
  }

  function photoStart() {
    state = clone(PHOTO_START);
    history = [];
    suggestedTile = null;
    updateStats();
    renderAll();
    renderEditor();
  }

  function clearEditor() {
    state = Array(9).fill('');
    history = [];
    renderAll();
    renderEditor();
  }

  function refreshSaved() {
    const select = $('#saved');
    if (!select || !window.Store?.all) return;
    select.innerHTML = '';
    Store.all().forEach(entry => {
      const option = document.createElement('option');
      option.value = entry.name;
      option.textContent = entry.name;
      select.append(option);
    });
  }

  function saveVariant() {
    if (!window.Store?.put || !validBoard(state)) return;
    const name = $('#saveName')?.value.trim() || 'Variante';
    Store.put(name, clone(state));
    refreshSaved();
  }

  function loadSaved() {
    const select = $('#saved');
    if (!select || !window.Store?.all) return;
    const entry = Store.all().find(item => item.name === select.value);
    if (!entry) return;
    state = clone(entry.state || entry.board || entry.value || PHOTO_START);
    history = [];
    renderAll();
    renderEditor();
  }

  function deleteSaved() {
    const select = $('#saved');
    if (!select?.value || !window.Store?.del || !confirm('Variante wirklich löschen?')) return;
    Store.del(select.value);
    refreshSaved();
  }

  function imageLoaded(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const source = $('#sourceImage');
      if (!source) return;
      source.onload = () => {
        cropImage = source;
        $('#cropWorkspace')?.classList.remove('hidden');
        resetCrop();
      };
      source.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function stageGeometry() {
    const stage = $('#cropStage');
    const image = $('#sourceImage');
    if (!stage || !image || !image.naturalWidth) return null;
    const rect = stage.getBoundingClientRect();
    const displayW = image.clientWidth;
    const displayH = image.clientHeight;
    const x = (rect.width - displayW) / 2;
    const y = (rect.height - displayH) / 2;
    return { stage, rect, x, y, width: displayW, height: displayH, scaleX: image.naturalWidth / displayW, scaleY: image.naturalHeight / displayH };
  }

  function clampCrop() {
    const geo = stageGeometry();
    if (!geo) return;
    const maxSize = Math.min(geo.width, geo.height);
    crop.size = Math.max(60, Math.min(crop.size, maxSize));
    crop.x = Math.max(geo.x, Math.min(crop.x, geo.x + geo.width - crop.size));
    crop.y = Math.max(geo.y, Math.min(crop.y, geo.y + geo.height - crop.size));
  }

  function drawCrop() {
    const overlay = $('#cropOverlay');
    const geo = stageGeometry();
    if (!overlay || !geo) return;
    clampCrop();
    overlay.style.left = `${crop.x}px`;
    overlay.style.top = `${crop.y}px`;
    overlay.style.width = `${crop.size}px`;
    overlay.style.height = `${crop.size}px`;
    text('#cropDetails', `Raster: ${Math.round(crop.size)} × ${Math.round(crop.size)} px – Verschieben: mittig ziehen · Größe ändern: Eckgriffe ziehen.`);
  }

  function resetCrop() {
    const geo = stageGeometry();
    if (!geo) return;
    crop.size = Math.min(geo.width, geo.height) * 0.78;
    crop.x = geo.x + (geo.width - crop.size) / 2;
    crop.y = geo.y + (geo.height - crop.size) / 2;
    drawCrop();
  }

  function pointerPosition(event) {
    const geo = stageGeometry();
    if (!geo) return null;
    return { x: event.clientX - geo.rect.left, y: event.clientY - geo.rect.top };
  }

  function startCropPointer(event) {
    const point = pointerPosition(event);
    if (!point) return;
    const handle = event.target.dataset.handle || '';
    cropPointer = { id: event.pointerId, handle, startX: point.x, startY: point.y, cropX: crop.x, cropY: crop.y, cropSize: crop.size };
    $('#cropOverlay')?.classList.add('dragging');
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function moveCropPointer(event) {
    if (!cropPointer || event.pointerId !== cropPointer.id) return;
    const point = pointerPosition(event);
    if (!point) return;
    const dx = point.x - cropPointer.startX;
    const dy = point.y - cropPointer.startY;
    if (!cropPointer.handle) {
      crop.x = cropPointer.cropX + dx;
      crop.y = cropPointer.cropY + dy;
    } else {
      const delta = cropPointer.handle.includes('w') ? -dx : dx;
      const vertical = cropPointer.handle.includes('n') ? -dy : dy;
      const amount = Math.abs(delta) > Math.abs(vertical) ? delta : vertical;
      const nextSize = cropPointer.cropSize + amount;
      if (cropPointer.handle.includes('w')) crop.x = cropPointer.cropX - (nextSize - cropPointer.cropSize);
      else crop.x = cropPointer.cropX;
      if (cropPointer.handle.includes('n')) crop.y = cropPointer.cropY - (nextSize - cropPointer.cropSize);
      else crop.y = cropPointer.cropY;
      crop.size = nextSize;
    }
    drawCrop();
    event.preventDefault();
  }

  function endCropPointer(event) {
    if (!cropPointer || event.pointerId !== cropPointer.id) return;
    cropPointer = null;
    $('#cropOverlay')?.classList.remove('dragging');
  }

  function cutTiles() {
    const geo = stageGeometry();
    if (!geo || !cropImage) return;
    clampCrop();
    const sx = (crop.x - geo.x) * geo.scaleX;
    const sy = (crop.y - geo.y) * geo.scaleY;
    const sourceSize = crop.size * geo.scaleX;
    importedTiles = [];
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(cropImage, sx + col * sourceSize / 3, sy + row * sourceSize / 3, sourceSize / 3, sourceSize / 3, 0, 0, 240, 240);
        importedTiles.push(canvas.toDataURL('image/jpeg', 0.9));
      }
    }
    importedAssignments = ['G1', 'F3', 'F1', 'G2', 'K1', 'F2', 'G3', 'K2', '.'];
    renderImportPreviews();
    $('#importResults')?.classList.remove('hidden');
  }

  function renderImportPreviews() {
    const host = $('#cutPreview');
    if (!host) return;
    host.innerHTML = '';
    const roles = [...TILE_KEYS, '.'];
    importedTiles.forEach((src, index) => {
      const card = document.createElement('div');
      card.className = 'cut-card';
      const img = document.createElement('img');
      img.src = src;
      img.alt = `Ausschnitt ${index + 1}`;
      const select = document.createElement('select');
      roles.forEach(role => {
        const option = document.createElement('option');
        option.value = role;
        option.textContent = role === '.' ? 'Frei' : `${role} – ${nameOf(role)}`;
        option.selected = importedAssignments[index] === role;
        select.append(option);
      });
      select.addEventListener('change', () => {
        importedAssignments[index] = select.value;
        updateImportAvailability();
      });
      card.append(img, select);
      host.append(card);
    });
    updateImportAvailability();
  }

  function updateImportAvailability() {
    const complete = importedAssignments.length === 9 && importedAssignments.filter(x => x === '.').length === 1 && TILE_KEYS.every(tile => importedAssignments.filter(x => x === tile).length === 1);
    $('#applyImported').disabled = !complete;
    $('#playImported').disabled = !complete;
    setNotice('#importStatus', complete ? 'Zuordnung vollständig. Du kannst das Puzzle jetzt übernehmen.' : 'Jede Rolle G1–K2 und das freie Feld müssen genau einmal zugeordnet sein.', complete ? 'ok' : 'warn');
  }

  function applyImportedPuzzle(openPlay = false) {
    if ($('#applyImported').disabled) return;
    const images = {};
    importedAssignments.forEach((role, index) => {
      if (role !== '.') images[role] = importedTiles[index];
    });
    customTileImages = images;
    state = importedAssignments.slice();
    history = [];
    suggestedTile = null;
    const result = solve(state);
    text('#par', result.path.length);
    updateStats();
    renderAll();
    renderPalette();
    renderEditor();
    setNotice('#notice', 'Importiertes Puzzle wurde übernommen.', 'ok');
    if (openPlay) switchPage('play');
  }

  function bindEvents() {
    $$('.tab').forEach(tab => tab.addEventListener('click', () => switchPage(tab.dataset.page)));
    $('#random')?.addEventListener('click', createRandom);
    $('#undo')?.addEventListener('click', undo);
    $('#hint')?.addEventListener('click', hint);
    $('#toSolver')?.addEventListener('click', () => { switchPage('solver'); calculateSolution(); });
    $('#solve')?.addEventListener('click', calculateSolution);
    $('#first')?.addEventListener('click', () => { solutionIndex = 0; renderSolverBoard(); });
    $('#back')?.addEventListener('click', () => { solutionIndex = Math.max(0, solutionIndex - 1); renderSolverBoard(); });
    $('#next')?.addEventListener('click', () => { solutionIndex = Math.min(solution.length, solutionIndex + 1); renderSolverBoard(); });
    $('#load')?.addEventListener('click', loadCode);
    $('#copy')?.addEventListener('click', copyCode);
    $('#photoStart')?.addEventListener('click', photoStart);
    $('#clear')?.addEventListener('click', clearEditor);
    $('#playEdited')?.addEventListener('click', () => switchPage('play'));
    $('#save')?.addEventListener('click', saveVariant);
    $('#loadSaved')?.addEventListener('click', loadSaved);
    $('#delete')?.addEventListener('click', deleteSaved);
    $('#imageInput')?.addEventListener('change', event => event.target.files[0] && imageLoaded(event.target.files[0]));
    $('#cameraInput')?.addEventListener('change', event => event.target.files[0] && imageLoaded(event.target.files[0]));
    $('#resetCrop')?.addEventListener('click', resetCrop);
    $('#cutTiles')?.addEventListener('click', cutTiles);
    $('#applyImported')?.addEventListener('click', () => applyImportedPuzzle(false));
    $('#playImported')?.addEventListener('click', () => applyImportedPuzzle(true));
    $('#cropOverlay')?.addEventListener('pointerdown', startCropPointer);
    $('#cropStage')?.addEventListener('pointermove', moveCropPointer);
    $('#cropStage')?.addEventListener('pointerup', endCropPointer);
    $('#cropStage')?.addEventListener('pointercancel', endCropPointer);
    window.addEventListener('resize', drawCrop);
  }

  function initialize() {
    bindEvents();
    renderPalette();
    renderAll();
    renderEditor();
    refreshSaved();
    const result = solve(state);
    text('#par', result.path.length);
    updateStats();
    setNotice('#notice', 'Klicke eine orange markierte Kachel an. Ziel: alle Tiere korrekt zusammensetzen.', 'info');
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }

  document.addEventListener('DOMContentLoaded', initialize);
})();
