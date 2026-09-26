(() => {
  'use strict';

  const tiles = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', '.'];
  const rank = { T1: 1, T2: 2, T3: 3, T4: 4, T5: 5, T6: 6, T7: 7, T8: 8 };
  const neighbors = {
    0: [1, 3], 1: [0, 2, 4], 2: [1, 5],
    3: [0, 4, 6], 4: [1, 3, 5, 7], 5: [2, 4, 8],
    6: [3, 7], 7: [4, 6, 8], 8: [5, 7]
  };

  function key(state) { return state.join(','); }

  function buildGoals() {
    const perms = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
    const all = [];
    for (const p of perms) {
      for (const blankTop of [true, false]) {
        const s = Array(9);
        const colA = p[0], colB = p[1], colC = p[2];
        s[colA] = 'T1'; s[colB] = 'T4'; s[colC] = blankTop ? '.' : 'T7';
        s[colA+3] = 'T2'; s[colB+3] = 'T5'; s[colC+3] = blankTop ? 'T7' : 'T8';
        s[colA+6] = 'T3'; s[colB+6] = 'T6'; s[colC+6] = blankTop ? 'T8' : '.';
        all.push(s);
      }
    }
    return all;
  }

  const goals = buildGoals();
  const goalKeys = new Set(goals.map(key));

  function valid(state) {
    return Array.isArray(state) && state.length === 9 && tiles.every(t => state.filter(v => v === t).length === 1);
  }

  function inversions(state) {
    const vals = state.filter(t => t !== '.').map(t => rank[t]);
    let inv = 0;
    for (let i = 0; i < vals.length; i++) {
      for (let j = i + 1; j < vals.length; j++) {
        if (vals[i] > vals[j]) inv++;
      }
    }
    return inv;
  }

  function isGoal(state) { return goalKeys.has(key(state)); }

  function direction(from, to) {
    const d = to - from;
    if (d === -3) return { arrow: '⬆️', word: 'nach oben' };
    if (d === 3) return { arrow: '⬇️', word: 'nach unten' };
    if (d === -1) return { arrow: '⬅️', word: 'nach links' };
    return { arrow: '➡️', word: 'nach rechts' };
  }

  function next(state) {
    if (!valid(state)) return [];
    const e = state.indexOf('.');
    return neighbors[e].map(from => {
      const c = state.slice();
      const t = c[from];
      c[e] = t; c[from] = '.';
      return { tile: t, from, to: e, ...direction(from, e), state: c };
    });
  }

  function possible(state) {
    if (!valid(state)) return false;
    const p = inversions(state) % 2;
    return goals.some(g => inversions(g) % 2 === p);
  }

  function solve(start) {
    if (!valid(start)) return { status: 'Ungültig', path: [] };
    if (isGoal(start)) return { status: 'Bereits gelöst', path: [] };
    if (!possible(start)) return { status: 'Unlösbar', path: [] };
    const q = [start.slice()];
    const par = new Map([[key(start), null]]);
    let i = 0, end = null;
    while (i < q.length && !end) {
      const cur = q[i++];
      for (const m of next(cur)) {
        const mk = key(m.state);
        if (par.has(mk)) continue;
        par.set(mk, { prev: key(cur), move: m });
        if (isGoal(m.state)) { end = mk; break; }
        q.push(m.state);
      }
    }
    if (!end) return { status: 'Unlösbar', path: [] };
    const path = [];
    for (let a = end; par.get(a); a = par.get(a).prev) path.push(par.get(a).move);
    path.reverse();
    return { status: 'Lösbar', path };
  }

  function random(min = 7, max = 12) {
    for (let i = 0; i < 1000; i++) {
      const s = goals[Math.floor(Math.random() * goals.length)].slice();
      let pe = -1;
      const n = max + 5 + Math.floor(Math.random() * 11);
      for (let j = 0; j < n; j++) {
        const e = s.indexOf('.');
        const c = neighbors[e].filter(x => x !== pe);
        const f = c[Math.floor(Math.random() * c.length)];
        pe = e;
        [s[e], s[f]] = [s[f], s[e]];
      }
      const r = solve(s);
      if (r.status === 'Lösbar' && r.path.length >= min && r.path.length <= max) return s;
    }
    return ['T1', 'T6', 'T4', 'T2', 'T7', 'T5', 'T3', 'T8', '.'];
  }

  window.Engine = { tiles, goal: goals[0].slice(), goals: goals.map(g => g.slice()), neighbors, key, valid, inversions, isGoal, next, possible, solve, random };
})();
