(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const images = {
    G1: 'assets/tiles/giraffe-kopf.jpg',
    G2: 'assets/tiles/giraffe-hals.jpg',
    G3: 'assets/tiles/giraffe-beine.jpg',
    F1: 'assets/tiles/flamingo-kopf.jpg',
    F2: 'assets/tiles/flamingo-koerper.jpg',
    F3: 'assets/tiles/flamingo-beine.jpg',
    K1: 'assets/tiles/koala-kopf.jpg',
    K2: 'assets/tiles/koala-baum.jpg'
  };

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

  const photo = ['G1', 'F3', 'F1', 'G2', 'K1', 'F2', 'G3', 'K2', '.'];
  let state = photo.slice();
  let history = [];
  let solution = [];
  let solutionIndex = 0;
  let selected = 'G1';
  let suggested = null;
  let timer = null;
  let seconds = 0;
  let cropper = null;
  let cut = [];
  let assignments = [];
  let customImages = {};

  const copy = a => a.slice();

  function notice(id, msg, type = 'info') {
    const e = $(id);
    if (e) {
      e.textContent = msg;
      e.className = `notice ${type}`;
    }
  }

  function src(t) {
    return customImages[t] || images[t] || '';
  }

  function name(t) {
    return names[t] || t;
  }

  function tile(t, i, click, opt = {}) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `tile ${t === '.' ? 'empty' : ''}`;
    if (t === '.') {
      b.textContent = 'FREI';
    } else {
      const im = document.createElement('img');
      im.src = src(t);
      im.alt = name(t);
      im.onerror = () => { im.remove(); b.append(t); };
      b.append(im);
      const badge = document.createElement('span');
      badge.className = 'tile-code';
      badge.textContent = t;
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

  function text(id, v) {
    const e = $(id);
    if (e) e.textContent = String(v);
  }

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
      notice('#notice', `🎉 Geschafft! ${history.length} Züge.`, 'ok');
    }
  }

  function check() {
    if (!Engine.valid(state)) {
      return { ok: false, msg: 'Ungültig: Alle acht Kacheln und ein freies Feld werden benötigt.' };
    }
    if (!Engine.possible(state)) {
      return { ok: false, msg: 'Gültig, aber zu keinem der zwölf Zielzustände lösbar.' };
    }
    const r = Engine.solve(state);
    return { ok: true, result: r, msg: `Gültig und lösbar: ${r.path.length} minimale Züge.` };
  }

  function randomPuzzle() {
    const [min, max] = $('#level').value.split(',').map(Number);
    state = Engine.random(min, max);
    history = [];
    suggested = null;
    const r = Engine.solve(state);
    text('#par', r.path.length);
    stats();
    seconds = 0;
    clearInterval(timer);
    timer = setInterval(() => {
      text('#time', `${String(Math.floor(++seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`);
    }, 1000);
    notice('#notice', `Neue Variante: optimal ${r.path.length} Züge.`, 'info');
    render();
    editor();
  }

  function hint() {
    const c = check();
    if (!c.ok) {
      notice('#notice', c.msg, 'warn');
      return;
    }
    const m = c.result.path[0];
    if (!m) {
      notice('#notice', 'Das Puzzle ist bereits gelöst.', 'ok');
      return;
    }
    suggested = m.tile;
    notice('#notice', `💡 Tipp: ${name(m.tile)} ${m.word}.`, 'warn');
    board('#game', state, move, true);
  }

  function solve() {
    const c = check();
    const list = $('#steps');
    list.innerHTML = '';
    solution = [];
    solutionIndex = 0;
    if (!c.ok) {
      notice('#solveStatus', c.msg, 'bad');
      return;
    }
    let current = copy(state);
    solution = c.result.path.map(m => {
      current = copy(m.state);
      return { ...m, state: copy(current) };
    });
    notice('#solveStatus', `${solution.length} minimale Züge zu einem der 12 Ziele.`, 'ok');
    solution.forEach((m, i) => {
      const li = document.createElement('li');
      li.textContent = `${i + 1}. ${name(m.tile)} ${m.arrow} ${m.word}`;
      li.onclick = () => {
        solutionIndex = i + 1;
        render();
        [...list.children].forEach((x, n) => x.classList.toggle('active', n === i));
      };
      list.append(li);
    });
    render();
  }

  function palette() {
    const p = $('#palette');
    p.innerHTML = '';
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
      if (old >= 0) {
        [state[i], state[old]] = [state[old], state[i]];
      } else {
        state[i] = selected;
      }
      history = [];
      stats();
      render();
      editor();
    });
    const c = check();
    notice('#valid', c.msg, c.ok ? 'ok' : 'warn');
  }

  function loadCode() {
    const a = $('#codeLoad').value.split(',').map(x => x.trim());
    if (!Engine.valid(a)) {
      notice('#valid', 'Ungültiger Code.', 'bad');
      return;
    }
    state = a;
    history = [];
    render();
    editor();
  }

  function loadImage(file) {
    const r = new FileReader();
    r.onload = () => {
      const im = $('#sourceImage');
      im.onload = () => {
        $('#cropWorkspace').classList.remove('hidden');
        cropper = ImageImport.createImageCropper({
          stage: $('#cropStage'),
          image: im,
          overlay: $('#cropOverlay'),
          details: $('#cropDetails')
        });
        cropper.reset();
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  }

  function cuts() {
    if (!cropper) return;
    cut = cropper.cutIntoNine();
    assignments = ['G1', 'F3', 'F1', 'G2', 'K1', 'F2', 'G3', 'K2', '.'];
    const h = $('#cutPreview');
    h.innerHTML = '';
    cut.forEach((d, i) => {
      const c = document.createElement('div');
      c.className = 'cut-card';
      const im = document.createElement('img');
      im.src = d;
      const se = document.createElement('select');
      Engine.tiles.forEach(t => {
        const o = document.createElement('option');
        o.value = t;
        o.textContent = t === '.' ? 'Frei' : `${t} – ${name(t)}`;
        o.selected = assignments[i] === t;
        se.append(o);
      });
      se.onchange = () => { assignments[i] = se.value; importStatus(); };
      c.append(im, se);
      h.append(c);
    });
    $('#importResults').classList.remove('hidden');
    importStatus();
  }

  function importStatus() {
    const ok = assignments.length === 9 && Engine.tiles.every(t => assignments.filter(x => x === t).length === 1);
    $('#applyImported').disabled = !ok;
    $('#playImported').disabled = !ok;
    notice('#importStatus', ok ? 'Zuordnung vollständig.' : 'Jede Rolle muss genau einmal gewählt werden.', ok ? 'ok' : 'warn');
  }

  function applyImport(play) {
    if ($('#applyImported').disabled) return;
    customImages = {};
    assignments.forEach((r, i) => {
      if (r !== '.') customImages[r] = cut[i];
    });
    state = copy(assignments);
    history = [];
    const r = Engine.solve(state);
    text('#par', r.path.length);
    stats();
    render();
    palette();
    editor();
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
    $('#undo').onclick = () => {
      if (history.length) {
        state = history.pop();
        stats();
        render();
        editor();
      }
    };
    $('#hint').onclick = hint;
    $('#toSolver').onclick = () => { switchPage('solver'); solve(); };
    $('#solve').onclick = solve;
    $('#first').onclick = () => { solutionIndex = 0; render(); };
    $('#back').onclick = () => { solutionIndex = Math.max(0, solutionIndex - 1); render(); };
    $('#next').onclick = () => { solutionIndex = Math.min(solution.length, solutionIndex + 1); render(); };
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
    palette();
    render();
    editor();
    const r = Engine.solve(state);
    text('#par', r.path.length);
    stats();
    notice('#notice', 'Klicke eine orange markierte Kachel an. Ziel: Tiere korrekt senkrecht zusammensetzen.', 'info');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    }
  });
})();
