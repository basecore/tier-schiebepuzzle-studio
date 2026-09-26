(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const images = {
    T1: 'assets/tiles/giraffe-kopf.jpg', T2: 'assets/tiles/giraffe-hals.jpg', T3: 'assets/tiles/giraffe-beine.jpg',
    T4: 'assets/tiles/flamingo-kopf.jpg', T5: 'assets/tiles/flamingo-koerper.jpg', T6: 'assets/tiles/flamingo-beine.jpg',
    T7: 'assets/tiles/koala-kopf.jpg', T8: 'assets/tiles/koala-baum.jpg'
  };
  const names = {
    T1: 'Objekt 1 – Oben', T2: 'Objekt 1 – Mitte', T3: 'Objekt 1 – Unten',
    T4: 'Objekt 2 – Oben', T5: 'Objekt 2 – Mitte', T6: 'Objekt 2 – Unten',
    T7: 'Objekt 3 – Oben', T8: 'Objekt 3 – Mitte',
    '.': 'Frei'
  };
  const photo = ['T1','T6','T4','T2','T7','T5','T3','T8','.'];
  let state = photo.slice(), history = [], solution = [], solutionIndex = 0;
  let selected = 'T1', suggested = null, timer = null, seconds = 0;
  let cropper = null, cut = [], tileRoles = [], customImages = {};

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
    notice('#solveStatus', `${solution.length} minimale Züge.`, 'ok');
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
        $('#importResults').classList.add('hidden');
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
    tileRoles = Engine.tiles.slice();
    renderCutPreview();
    $('#importResults').classList.remove('hidden');
    importStatus();
  }

  function renderCutPreview() {
    const h = $('#cutPreview');
    h.innerHTML = '';
    cut.forEach((d, i) => {
      const card = document.createElement('div');
      card.className = 'cut-card';
      const im = document.createElement('img');
      im.src = d;
      const sel = document.createElement('select');
      Engine.tiles.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t === '.' ? 'Frei' : `${t} – ${name(t)}`;
        opt.selected = tileRoles[i] === t;
        sel.append(opt);
      });
      sel.onchange = () => {
        tileRoles[i] = sel.value;
        importStatus();
      };
      card.append(im, sel);
      h.append(card);
    });
  }

  function importStatus() {
    const ok = tileRoles.length === 9 && Engine.tiles.every(t => tileRoles.filter(x => x === t).length === 1);
    $('#applyImported').disabled = !ok;
    $('#playImported').disabled = !ok;
    notice('#importStatus', ok ? 'Zuordnung vollständig.' : 'Jede Rolle (Objekt 1-3 Oben/Mitte/Unten und Frei) muss genau einmal gewählt werden.', ok ? 'ok' : 'warn');
  }

  function applyImport(play) {
    if ($('#applyImported').disabled) return;
    customImages = {};
    tileRoles.forEach((r, i) => { if (r !== '.') customImages[r] = cut[i]; });
    state = copy(tileRoles);
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
