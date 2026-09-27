(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const active=new WeakMap();
  function createImageCropper({stage,image,overlay,details}){
    active.get(overlay)?.destroy();
    const controller=new AbortController();
    let corners=[],drag=null,previewTimer=0;
    const handles=['nw','ne','se','sw'].map(n=>overlay.querySelector(`[data-handle="${n}"]`));
    const grid=overlay.querySelector('.crop-grid');
    if(grid)grid.style.display='none';
    overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;box-shadow:none;background:none;pointer-events:none;touch-action:none';
    const svg=document.createElementNS(NS,'svg');
    svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none';
    const shade=document.createElementNS(NS,'path'),lines=document.createElementNS(NS,'path'),edge=document.createElementNS(NS,'path'),hit=document.createElementNS(NS,'path');
    shade.setAttribute('fill','#0007');shade.setAttribute('fill-rule','evenodd');
    lines.setAttribute('fill','none');lines.setAttribute('stroke','#fff');lines.setAttribute('stroke-width','1.5');lines.setAttribute('pointer-events','none');
    edge.setAttribute('fill','none');edge.setAttribute('stroke','#ffe05c');edge.setAttribute('stroke-width','3');edge.setAttribute('pointer-events','none');
    hit.setAttribute('fill','transparent');hit.setAttribute('pointer-events','all');hit.dataset.move='1';hit.style.cursor='grab';
    svg.append(shade,lines,edge,hit);overlay.prepend(svg);
    overlay.style.zIndex='6';
    handles.forEach((h,i)=>{h.style.cssText='position:absolute;width:36px;height:36px;left:0;top:0;right:auto;bottom:auto;transform:translate(-50%,-50%);pointer-events:auto;touch-action:none;z-index:7';h.dataset.corner=String(i);h.title=['Oben links','Oben rechts','Unten rechts','Unten links'][i];h.setAttribute('role','slider');h.setAttribute('aria-label','Puzzleecke '+h.title);h.tabIndex=0});
    const workspace=stage.closest('.crop-workspace');
    const help=workspace?.querySelector('#cropHelp');if(help)help.textContent='Ziehe die vier Eckpunkte einzeln an die Puzzle-Ecken. Ziehe die Fläche zum Verschieben. Das Raster und der Zuschnitt folgen der Perspektive.';
    const label=document.createElement('p');label.className='small';label.textContent='Vorschau nach Perspektivkorrektur:';
    const preview=document.createElement('canvas');preview.width=preview.height=300;preview.style.cssText='display:block;width:min(100%,300px);aspect-ratio:1;margin:8px auto 18px;border:2px solid #ffe05c;border-radius:8px';
    details?.after(label,preview);
    function geo(){if(!image.naturalWidth)return null;const sr=stage.getBoundingClientRect(),ir=image.getBoundingClientRect();return{sr,ix:ir.left-sr.left,iy:ir.top-sr.top,iw:ir.width,ih:ir.height}}
    function displayed(g){return corners.map(p=>({x:g.ix+p.x*g.iw,y:g.iy+p.y*g.ih}))}
    function valid(pts,g){if(pts.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.y<0||p.x>1||p.y>1))return false;const p=pts.map(t=>({x:t.x*g.iw,y:t.y*g.ih}));let area=0;for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4],c=p[(i+2)%4],dx=b.x-a.x,dy=b.y-a.y;area+=a.x*b.y-b.x*a.y;if(Math.hypot(dx,dy)<30||dx*(c.y-b.y)-dy*(c.x-b.x)<120)return false}return area>3000}
    function homography(p){const [a,b,c,d]=p,dx1=b.x-c.x,dx2=d.x-c.x,dx3=a.x-b.x+c.x-d.x,dy1=b.y-c.y,dy2=d.y-c.y,dy3=a.y-b.y+c.y-d.y;let g=0,h=0;if(Math.abs(dx3)+Math.abs(dy3)>1e-9){const det=dx1*dy2-dx2*dy1;if(Math.abs(det)<1e-10)throw Error('Perspektive ist zu stark verzerrt.');g=(dx3*dy2-dx2*dy3)/det;h=(dx1*dy3-dx3*dy1)/det}return{a:b.x-a.x+g*b.x,b:d.x-a.x+h*d.x,c:a.x,d:b.y-a.y+g*b.y,e:d.y-a.y+h*d.y,f:a.y,g,h}}
    function project(H,u,v){const q=H.g*u+H.h*v+1;return{x:(H.a*u+H.b*v+H.c)/q,y:(H.d*u+H.e*v+H.f)/q}}
    function path(p){return`M${p.map(t=>`${t.x},${t.y}`).join('L')}Z`}
    function render(){const g=geo();if(!g||corners.length!==4)return;const p=displayed(g),H=homography(p),w=g.sr.width,h=g.sr.height;svg.setAttribute('viewBox',`0 0 ${w} ${h}`);const border=path(p);shade.setAttribute('d',`M0,0H${w}V${h}H0Z ${border}`);edge.setAttribute('d',border);hit.setAttribute('d',border);let d='';for(const t of [1/3,2/3]){const v1=project(H,t,0),v2=project(H,t,1),h1=project(H,0,t),h2=project(H,1,t);d+=`M${v1.x},${v1.y}L${v2.x},${v2.y}M${h1.x},${h1.y}L${h2.x},${h2.y}`}lines.setAttribute('d',d);handles.forEach((handle,i)=>{handle.style.left=p[i].x+'px';handle.style.top=p[i].y+'px'});if(details)details.textContent='Vier Ecken frei verschiebbar – perspektivischer Zuschnitt in 3 × 3 Kacheln.'}
    function reset(){const g=geo();if(!g)return;const s=Math.min(g.iw,g.ih)*.82,x=(g.iw-s)/(2*g.iw),y=(g.ih-s)/(2*g.ih),w=s/g.iw,h=s/g.ih;corners=[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];render();schedulePreview()}
    function point(ev,g){return{x:(ev.clientX-g.sr.left-g.ix)/g.iw,y:(ev.clientY-g.sr.top-g.iy)/g.ih}}
    function down(ev){const g=geo(),index=ev.target.dataset.corner,move=ev.target.dataset.move;if(!g||index===undefined&&!move)return;drag={id:ev.pointerId,index:index===undefined?-1:Number(index),start:point(ev,g),original:corners.map(p=>({...p}))};overlay.setPointerCapture?.(ev.pointerId);ev.preventDefault()}
    function move(ev){if(!drag||drag.id!==ev.pointerId)return;const g=geo();if(!g)return;const p=point(ev,g),dx=p.x-drag.start.x,dy=p.y-drag.start.y,candidate=drag.original.map(q=>({...q}));if(drag.index>=0){candidate[drag.index].x+=dx;candidate[drag.index].y+=dy}else candidate.forEach(q=>{q.x+=dx;q.y+=dy});if(valid(candidate,g)){corners=candidate;render()}ev.preventDefault()}
    function up(ev){if(!drag||drag.id!==ev.pointerId)return;drag=null;schedulePreview()}
    handles.forEach((h,i)=>h.addEventListener('keydown',ev=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key))return;const g=geo();if(!g)return;const step=ev.shiftKey?.001:.01,candidate=corners.map(p=>({...p}));candidate[i].x+=(ev.key==='ArrowRight'?step:ev.key==='ArrowLeft'?-step:0);candidate[i].y+=(ev.key==='ArrowDown'?step:ev.key==='ArrowUp'?-step:0);if(valid(candidate,g)){corners=candidate;render();schedulePreview()}ev.preventDefault()},{signal:controller.signal}));
    function imageCrop(){const g=geo();if(!g||corners.length!==4)return null;return corners.map(p=>({x:p.x*image.naturalWidth,y:p.y*image.naturalHeight}))}
    function rectify(size){const p=imageCrop();if(!p)throw Error('Kein gültiges Raster ausgewählt.');const H=homography(p),minX=Math.max(0,Math.floor(Math.min(...p.map(q=>q.x)))-1),minY=Math.max(0,Math.floor(Math.min(...p.map(q=>q.y)))-1),maxX=Math.min(image.naturalWidth,Math.ceil(Math.max(...p.map(q=>q.x)))+1),maxY=Math.min(image.naturalHeight,Math.ceil(Math.max(...p.map(q=>q.y)))+1),bw=maxX-minX,bh=maxY-minY,scale=Math.min(1,1600/Math.max(bw,bh));const source=document.createElement('canvas');source.width=Math.max(2,Math.ceil(bw*scale));source.height=Math.max(2,Math.ceil(bh*scale));const sctx=source.getContext('2d',{willReadFrequently:true});sctx.drawImage(image,minX,minY,bw,bh,0,0,source.width,source.height);const pixels=sctx.getImageData(0,0,source.width,source.height).data;const result=document.createElement('canvas');result.width=result.height=size;const ctx=result.getContext('2d'),out=ctx.createImageData(size,size),dst=out.data,sw=source.width,sh=source.height;for(let y=0;y<size;y++)for(let x=0;x<size;x++){const q=project(H,(x+.5)/size,(y+.5)/size),sx=Math.max(0,Math.min(sw-1.001,(q.x-minX)*source.width/bw)),sy=Math.max(0,Math.min(sh-1.001,(q.y-minY)*source.height/bh)),ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,a=(iy*sw+ix)*4,b=a+4,c=a+sw*4,d=c+4,k=(y*size+x)*4;for(let ch=0;ch<4;ch++)dst[k+ch]=pixels[a+ch]*(1-fx)*(1-fy)+pixels[b+ch]*fx*(1-fy)+pixels[c+ch]*(1-fx)*fy+pixels[d+ch]*fx*fy}ctx.putImageData(out,0,0);return result}
    function schedulePreview(){clearTimeout(previewTimer);previewTimer=setTimeout(()=>{try{const c=rectify(300),ctx=preview.getContext('2d');ctx.clearRect(0,0,300,300);ctx.drawImage(c,0,0)}catch(error){if(details)details.textContent=error.message}},120)}
    function cutIntoNine(size=240){if(!imageCrop())return[];const straight=rectify(size*3),result=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++){const canvas=document.createElement('canvas');canvas.width=canvas.height=size;canvas.getContext('2d').drawImage(straight,c*size,r*size,size,size,0,0,size,size);result.push(canvas.toDataURL('image/jpeg',.92))}return result}
    overlay.addEventListener('pointerdown',down,{signal:controller.signal});stage.addEventListener('pointermove',move,{signal:controller.signal});stage.addEventListener('pointerup',up,{signal:controller.signal});stage.addEventListener('pointercancel',up,{signal:controller.signal});window.addEventListener('resize',render,{signal:controller.signal});
    const api={reset,render,imageCrop,cutIntoNine,destroy(){clearTimeout(previewTimer);controller.abort();svg.remove();label.remove();preview.remove();overlay.classList.remove('dragging');active.delete(overlay)}};active.set(overlay,api);return api;
  }
  window.ImageImport={createImageCropper};
})();
