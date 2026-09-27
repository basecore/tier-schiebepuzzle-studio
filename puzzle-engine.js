(() => {
  'use strict';
  const tiles=['A1','A2','A3','B1','B2','B3','C1','C2','.'];
  const rank={A1:1,A2:2,A3:3,B1:4,B2:5,B3:6,C1:7,C2:8};
  const neighbors={0:[1,3],1:[0,2,4],2:[1,5],3:[0,4,6],4:[1,3,5,7],5:[2,4,8],6:[3,7],7:[4,6,8],8:[5,7]};
  let rule='flexible';
  function key(state){return state.join(',')}
  function buildGoals(){const perms=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];const all=[];for(const p of perms){for(const blankTop of[true,false]){const s=Array(9);const a=p[0],b=p[1],c=p[2];s[a]='A1';s[b]='B1';s[c]=blankTop?'.':'C1';s[a+3]='A2';s[b+3]='B2';s[c+3]=blankTop?'C1':'C2';s[a+6]='A3';s[b+6]='B3';s[c+6]=blankTop?'C2':'.';all.push(s)}}return all}
  const goals=buildGoals();
  function activeGoals(){if(rule==='strict')return [goals.find(g=>key(g)==='A1,B1,C1,A2,B2,C2,A3,B3,.')];return goals}
  function valid(state){return Array.isArray(state)&&state.length===9&&tiles.every(t=>state.filter(v=>v===t).length===1)}
  function inversions(state){const vals=state.filter(t=>t!=='.').map(t=>rank[t]);let inv=0;for(let i=0;i<vals.length;i++)for(let j=i+1;j<vals.length;j++)if(vals[i]>vals[j])inv++;return inv}
  function isGoal(state){return activeGoals().some(g=>key(g)===key(state))}
  function direction(from,to){const d=to-from;if(d===-3)return{arrow:'⬆️',word:'nach oben'};if(d===3)return{arrow:'⬇️',word:'nach unten'};if(d===-1)return{arrow:'⬅️',word:'nach links'};return{arrow:'➡️',word:'nach rechts'}}
  function next(state){if(!valid(state))return[];const e=state.indexOf('.');return neighbors[e].map(from=>{const c=state.slice(),t=c[from];c[e]=t;c[from]='.';return{tile:t,from,to:e,...direction(from,e),state:c}})}
  function possible(state){if(!valid(state))return false;const p=inversions(state)%2;return activeGoals().some(g=>inversions(g)%2===p)}
  function solve(start){if(!valid(start))return{status:'Ungültig',path:[]};if(isGoal(start))return{status:'Bereits gelöst',path:[]};if(!possible(start))return{status:'Unlösbar',path:[]};const q=[start.slice()],parents=new Map([[key(start),null]]);let i=0,end=null;while(i<q.length&&!end){const cur=q[i++];for(const m of next(cur)){const mk=key(m.state);if(parents.has(mk))continue;parents.set(mk,{prev:key(cur),move:m});if(isGoal(m.state)){end=mk;break}q.push(m.state)}}if(!end)return{status:'Unlösbar',path:[]};const path=[];for(let at=end;parents.get(at);at=parents.get(at).prev)path.push(parents.get(at).move);path.reverse();return{status:'Lösbar',path}}
  function random(min=7,max=12,details=false){for(let i=0;i<1000;i++){const g=activeGoals();const s=g[Math.floor(Math.random()*g.length)].slice();let prev=-1;const count=max+5+Math.floor(Math.random()*11);for(let j=0;j<count;j++){const e=s.indexOf('.'),choices=neighbors[e].filter(x=>x!==prev),from=choices[Math.floor(Math.random()*choices.length)];prev=e;[s[e],s[from]]=[s[from],s[e]]}const r=solve(s);if(r.status==='Lösbar'&&r.path.length>=min&&r.path.length<=max)return details?{state:s,par:r.path.length}:s}if(details)throw new Error('Kein passendes Rätsel gefunden. Bitte erneut versuchen.');return['A1','B3','B1','A2','C1','B2','A3','C2','.']}
  function setRule(value){rule=value==='strict'?'strict':'flexible'}
  window.Engine={tiles,goal:goals[0].slice(),goals:goals.map(g=>g.slice()),neighbors,key,valid,inversions,isGoal,next,possible,solve,random,setRule,getRule:()=>rule};
})();
