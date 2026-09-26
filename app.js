(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const images = {
    T1: 'assets/tiles/giraffe-kopf.jpg', T2: 'assets/tiles/giraffe-hals.jpg', T3: 'assets/tiles/giraffe-beine.jpg',
    T4: 'assets/tiles/flamingo-kopf.jpg', T5: 'assets/tiles/flamingo-koerper.jpg', T6: 'assets/tiles/flamingo-beine.jpg',
    T7: 'assets/tiles/koala-kopf.jpg', T8: 'assets/tiles/koala-baum.jpg'
  };
  const names = { T1:'Teil 1', T2:'Teil 2', T3:'Teil 3', T4:'Teil 4', T5:'Teil 5', T6:'Teil 6', T7:'Teil 7', T8:'Teil 8', '.':'Frei' };
  const photo = ['T1','T6','T4','T2','T7','T5','T3','T8','.'];
  let state = photo.slice(), history = [], solution = [], solutionIndex = 0;
  let selected = 'T1', suggested = null, timer = null, seconds = 0;
  let cropper = null, cut = [], assignments = [], customImages = {};
  let assignSelected = null, manualFrames = [], manualStageImg = null, manualStageRect = null;

  const copy = a => a.slice();

  function notice(id, msg, type = 'info') {
    const e = $(id);
    if (e) { e.textContent = msg; e.className = `notice ${type}`; }
  }

  function src(t) { return customImages[t] || images[t] || ''; }
  function name(t) { return names[t] || t; }

  function tile(t, i, click, opt = {}) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `tile ${t === '.' ? 'empty' : ''}`;
    if (t === '.') b.textContent = 'FREI';
    else {
      const im = document.createElement('img');
      im.src = src(t); im.alt = name(t);
      im.onerror = () => { im.remove(); b.append(t); };
      b.append(im);
      const badge = document.createElement('span');
      badge.className = 'tile-code'; badge.textContent = t;
      b.append(badge);
    }
    if (opt.movable) b.classList.add('movable');
    if (opt.suggested) b.classList.add('suggested');
    if (click) b.onclick = () => click(i, t);
    return b;
  }

  function board(id, b, click, moves = false) {
    const host = $(id);
    if (!host) return;
    host.innerHTML = '';
    b.forEach((t, i) => {
      const movable = moves && Engine.next(b).some(m => m.state[i] === '.');
      host.append(tile(t, i, click, { movable, suggested: t === suggested }));
    });
  }

  function text(id, v) { const e = $(id); if (e) e.textContent = String(v); }

  function stats() {
    text('#moves', history.length);
    const p = Number($('#par')?.textContent || 0);
    text('#delta', Number.isFinite(p) ? history.length - p : '–');
  }

  function render() {
    board('#game', state, move, true);
    board('#solveBoard', solutionIndex ? solution[solutionIndex - 1].state : state);
    const codeEl = $('#code');
    if (codeEl) codeEl.value = state.join(',');
  }

  function move(i) {
    const m = Engine.next(state).find(x => x.state[i] === '.');
    if (!m) return;
    history.push(copy(state));
    state = copy(m.state);
    suggested = null;
    stats();
    render();
    if (Engine.isGoal(state)) {
      clearInterval(timer);
      showSuccessModal();
    }
  }

  function showSuccessModal() {
    $('#modalMoves').textContent = history.length;
    $('#modalPar').textContent = $('#par').textContent;
    $('#modalTime').textContent = $('#time').textContent;
    $('#successModal').classList.remove('hidden');
  }

  $('#modalNew').onclick = () => { $('#successModal').classList.add('hidden'); randomPuzzle(); };
  $('#modalClose').onclick = () => { $('#successModal').classList.add('hidden'); };

  function check() {
    if (!Engine.valid(state)) return { ok: false, msg: 'Ungültig: Alle acht Teile und ein freies Feld werden benötigt.' };
    if (!Engine.possible(state)) return { ok: false, msg: 'Gültig, aber zu keinem der zwölf Zielzustände lösbar.' };
    const r = Engine.solve(state);
    return { ok: true, result: r, msg: `Gültig und lösbar: ${r.path.length} minimale Züge.` };
  }

  function randomPuzzle() {
    const [min, max] = $('#level').value.split(',').map(Number);
    state = Engine.random(min, max);
    history = []; suggested = null;
    const r = Engine.solve(state);
    text('#par', r.path.length); stats();
    seconds = 0; clearInterval(timer);
    timer = setInterval(() => {
      text('#time', `${String(Math.floor(++seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`);
    }, 1000);
    notice('#notice', `Neue Variante: optimal ${r.path.length} Züge.`, 'info');
    render(); editor();
  }

  function hint() {
    const c = check();
    if (!c.ok) { notice('#notice', c.msg, 'warn'); return; }
    const m = c.result.path[0];
    if (!m) { notice('#notice', 'Das Puzzle ist bereits gelöst.', 'ok'); return; }
    suggested = m.tile;
    notice('#notice', `💡 Tipp: ${name(m.tile)} ${m.word}.`, 'warn');
    board('#game', state, move, true);
  }

  function solve() {
    const c = check(), list = $('#steps');
    list.innerHTML = ''; solution = []; solutionIndex = 0;
    if (!c.ok) { notice('#solveStatus', c.msg, 'bad'); return; }
    let current = copy(state);
    solution = c.result.path.map(m => { current = copy(m.state); return { ...m, state: copy(current) }; });
    notice('#solveStatus', `${solution.length} minimale Züge zu einem der 12 Ziele.`, 'ok');
    solution.forEach((m, i) => {
      const li = document.createElement('li');
      li.textContent = `${i+1}. ${name(m.tile)} ${m.arrow} ${m.word}`;
      li.onclick = () => { solutionIndex = i+1; render(); [...list.children].forEach((x,n) => x.classList.toggle('active', n===i)); };
      list.append(li);
    });
    render();
  }

  function palette() {
    const p = $('#palette'); p.innerHTML = '';
    Engine.tiles.forEach((t, i) => {
      const b = tile(t, i);
      b.classList.toggle('selected', t === selected);
      b.onclick = () => { selected = t; palette(); };
      p.append(b);
    });
  }

  function editor() {
    board('#edit', state, i => {
      const old = state.indexOf(selected);
      if (old >= 0) [state[i], state[old]] = [state[old], state[i]];
      else state[i] = selected;
      history = []; stats(); render(); editor();
    });
    const c = check();
    notice('#valid', c.msg, c.ok ? 'ok' : 'warn');
  }

  function loadCode() {
    const a = $('#codeLoad').value.split(',').map(x => x.trim());
    if (!Engine.valid(a)) { notice('#valid', 'Ungültiger Code.', 'bad'); return; }
    state = a; history = []; render(); editor();
  }

  function loadImage(file) {
    const r = new FileReader();
    r.onload = () => {
      const im = $('#sourceImage');
      im.onload = () => {
        $('#cropWorkspace').classList.remove('hidden');
        cropper = ImageImport.createImageCropper({ stage: $('#cropStage'), image: im, overlay: $('#cropOverlay'), details: $('#cropDetails') });
        cropper.reset();
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  }

  function cuts() {
    if (!cropper) return;
    cut = cropper.cutIntoNine();
    assignments = ['T1','T6','T4','T2','T7','T5','T3','T8','.'];
    renderAssignPreview();
    $('#importResults').classList.remove('hidden');
    $('#manualAssign').classList.add('hidden');
    $('#finalImport').classList.add('hidden');
  }

  function renderAssignPreview() {
    const h = $('#assignPreview'); h.innerHTML = '';
    cut.forEach((d, i) => {
      const c = document.createElement('div');
      c.className = 'assign-card' + (assignments[i] === assignSelected ? ' selected' : '');
      const im = document.createElement('img'); im.src = d; im.alt = `Pos ${i+1}`;
      c.append(im);
      c.onclick = () => { assignSelected = assignments[i]; renderAssignPreview(); };
      h.append(c);
    });
  }

  $('#startManual').onclick = () => {
    $('#manualAssign').classList.remove('hidden');
    $('#importResults').classList.add('hidden');
    initManualFrames();
  };

  function initManualFrames() {
    const stage = $('#manualStage');
    stage.innerHTML = '';
    manualStageImg = document.createElement('img');
    manualStageImg.src = cut[0];
    stage.append(manualStageImg);
    manualStageRect = null;

    const positions = [
      { x: 0, y: 0, label: 'T1' }, { x: 1, y: 0, label: 'T4' }, { x: 2, y: 0, label: 'T7' },
      { x: 0, y: 1, label: 'T2' }, { x: 1, y: 1, label: 'T5' }, { x: 2, y: 1, label: 'T8' },
      { x: 0, y: 2, label: 'T3' }, { x: 1, y: 2, label: 'T6' }
    ];

    manualFrames = positions.map((pos, idx) => {
      const f = document.createElement('div');
      f.className = 'frame';
      f.style.left = `${pos.x * 33.33}%`;
      f.style.top = `${pos.y * 33.33}%`;
      f.style.width = '33.33%';
      f.style.height = '33.33%';
      const lbl = document.createElement('span');
      lbl.className = 'frame-label';
      lbl.textContent = pos.label;
      f.append(lbl);
      stage.append(f);
      return { el: f, x: pos.x, y: pos.y, w: 1, h: 1, pointer: null, label: pos.label };
    });

    manualStageImg.onload = () => { manualStageRect = stage.getBoundingClientRect(); };
    window.addEventListener('resize', () => { manualStageRect = stage.getBoundingClientRect(); });

    manualFrames.forEach(frame => {
      frame.el.addEventListener('pointerdown', e => {
        e.preventDefault();
        frame.pointer = { id: e.pointerId, startX: e.clientX, startY: e.clientY, origX: frame.x, origY: frame.y };
        frame.el.classList.add('dragging');
        frame.el.setPointerCapture?.(e.pointerId);
      });
      frame.el.addEventListener('pointermove', e => {
        if (!frame.pointer || e.pointerId !== frame.pointer.id || !manualStageRect) return;
        const dx = e.clientX - frame.pointer.startX;
        const dy = e.clientY - frame.pointer.startY;
        const cellW = manualStageRect.width / 3;
        const cellH = manualStageRect.height / 3;
        const newX = Math.round((frame.pointer.origX * cellW + dx) / cellW);
        const newY = Math.round((frame.pointer.origY * cellH + dy) / cellH);
        frame.x = Math.max(0, Math.min(2, newX));
        frame.y = Math.max(0, Math.min(2, newY));
        frame.el.style.left = `${frame.x * 33.33}%`;
        frame.el.style.top = `${frame.y * 33.33}%`;
      });
      frame.el.addEventListener('pointerup', e => {
        if (frame.pointer && e.pointerId === frame.pointer.id) {
          frame.pointer = null;
          frame.el.classList.remove('dragging');
        }
      });
    });
  }

  $('#finishManual').onclick = () => {
    const mapping = {};
    manualFrames.forEach(f => { mapping[`${f.x},${f.y}`] = f.label; });
    const order = ['T1','T4','T7','T2','T5','T8','T3','T6','.'];
    assignments = [];
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const key = `${x},${y}`;
        const label = mapping[key];
        if (label) {
          const idx = order.indexOf(label);
          assignments.push(idx >= 0 && idx < 8 ? cut[idx] : '.');
        } else {
          assignments.push('.');
        }
      }
    }
    $('#manualAssign').classList.add('hidden');
    $('#finalImport').classList.remove('hidden');
    importStatus();
  };

  $('#cancelManual').onclick = () => {
    $('#manualAssign').classList.add('hidden');
    $('#importResults').classList.remove('hidden');
  };

  function importStatus() {
    const ok = assignments.length === 9 && Engine.tiles.every(t => assignments.filter(x => x === t).length === 1);
    $('#applyImported').disabled = !ok;
    $('#playImported').disabled = !ok;
    notice('#importStatus', ok ? 'Zuordnung vollständig.' : 'Jede Rolle muss genau einmal gewählt werden.', ok ? 'ok' : 'warn');
  }

  function applyImport(play) {
    if ($('#applyImported').disabled) return;
    customImages = {};
    assignments.forEach((r, i) => { if (r !== '.') customImages[r] = cut[i]; });
    state = copy(assignments);
    history = [];
    const r = Engine.solve(state);
    text('#par', r.path.length); stats();
    render(); palette(); editor();
    notice('#notice', 'Importiertes Puzzle übernommen.', 'ok');
    if (play) switchPage('play');
  }

  function switchPage(id) {
    $$('.page').forEach(x => x.classList.toggle('active', x.id === id));
    $$('.tab').forEach(x => x.classList.toggle('active', x.dataset.page === id));
  }

  document.addEventListener('DOMContentLoaded', () => {
    $$('.tab').forEach(b => b.onclick = () => switchPage(b.dataset.page));
    $('#random').onclick = randomPuzzle;
    $('#undo').onclick = () => { if (history.length) { state = history.pop(); stats(); render(); editor(); } };
    $('#hint').onclick = hint;
    $('#toSolver').onclick = () => { switchPage('solver'); solve(); };
    $('#solve').onclick = solve;
    $('#first').onclick = () => { solutionIndex = 0; render(); };
    $('#back').onclick = () => { solutionIndex = Math.max(0, solutionIndex-1); render(); };
    $('#next').onclick = () => { solutionIndex = Math.min(solution.length, solutionIndex+1); render(); };
    $('#photoStart').onclick = () => { state = copy(photo); history = []; render(); editor(); };
    $('#clear').onclick = () => { state = Array(9).fill(''); render(); editor(); };
    $('#playEdited').onclick = () => switchPage('play');
    $('#load').onclick = loadCode;
    $('#copy').onclick = () => navigator.clipboard?.writeText(state.join(','));
    $('#imageInput').onchange = e => e.target.files[0] && loadImage(e.target.files[0]);
    $('#cameraInput').onchange = e => e.target.files[0] && loadImage(e.target.files[0]);
    $('#resetCrop').onclick = () => cropper?.reset();
    $('#cutTiles').onclick = cuts;
    $('#applyImported').onclick = () => applyImport(false);
    $('#playImported').onclick = () => applyImport(true);
    palette(); render(); editor();
    const r = Engine.solve(state);
    text('#par', r.path.length); stats();
    notice('#notice', 'Klicke eine orange markierte Kachel an. Ziel: Teile korrekt senkrecht zusammensetzen.', 'info');
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
})();
