(() => {
  'use strict';

  function createImageCropper({ stage, image, overlay, details }) {
    let crop = { x: 0, y: 0, size: 0 };
    let pointer = null;

    function geo() {
      if (!image.naturalWidth) return null;
      const sr = stage.getBoundingClientRect();
      const ir = image.getBoundingClientRect();
      return {
        sr,
        ix: ir.left - sr.left,
        iy: ir.top - sr.top,
        iw: ir.width,
        ih: ir.height,
        sx: image.naturalWidth / ir.width,
        sy: image.naturalHeight / ir.height
      };
    }

    function clamp() {
      const g = geo();
      if (!g) return;
      const minSize = Math.min(g.iw, g.ih);
      crop.size = Math.max(48, Math.min(crop.size, minSize));
      crop.x = Math.max(g.ix, Math.min(crop.x, g.ix + g.iw - crop.size));
      crop.y = Math.max(g.iy, Math.min(crop.y, g.iy + g.ih - crop.size));
    }

    function render() {
      const g = geo();
      if (!g) return;
      clamp();
      overlay.style.left = crop.x + 'px';
      overlay.style.top = crop.y + 'px';
      overlay.style.width = crop.size + 'px';
      overlay.style.height = crop.size + 'px';
      if (details) {
        details.textContent = `Raster: ${Math.round(crop.size)} × ${Math.round(crop.size)} px. Zuschnitt verwendet exakt dieses quadratische Raster.`;
      }
    }

    function reset() {
      const g = geo();
      if (!g) return;
      const minSize = Math.min(g.iw, g.ih);
      crop.size = minSize * 0.9;
      crop.x = g.ix + (g.iw - crop.size) / 2;
      crop.y = g.iy + (g.ih - crop.size) / 2;
      render();
    }

    function pt(ev) {
      const g = geo();
      if (!g) return null;
      return { x: ev.clientX - g.sr.left, y: ev.clientY - g.sr.top };
    }

    function down(ev) {
      const p = pt(ev);
      if (!p) return;
      pointer = {
        id: ev.pointerId,
        handle: ev.target.dataset.handle || '',
        x: p.x,
        y: p.y,
        cx: crop.x,
        cy: crop.y,
        cs: crop.size
      };
      overlay.classList.add('dragging');
      ev.currentTarget.setPointerCapture?.(ev.pointerId);
      ev.preventDefault();
    }

    function move(ev) {
      if (!pointer || ev.pointerId !== pointer.id) return;
      const p = pt(ev);
      if (!p) return;
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      if (!pointer.handle) {
        crop.x = pointer.cx + dx;
        crop.y = pointer.cy + dy;
      } else {
        let delta;
        if (pointer.handle.includes('w')) {
          delta = -dx;
        } else if (pointer.handle.includes('e')) {
          delta = dx;
        } else if (pointer.handle.includes('n')) {
          delta = -dy;
        } else {
          delta = dy;
        }
        const newSize = pointer.cs + delta;
        const minSize = 48;
        if (newSize >= minSize) {
          if (pointer.handle.includes('w')) {
            crop.x = pointer.cx - (newSize - pointer.cs);
          }
          if (pointer.handle.includes('n')) {
            crop.y = pointer.cy - (newSize - pointer.cs);
          }
          crop.size = newSize;
        }
      }
      render();
      ev.preventDefault();
    }

    function up(ev) {
      if (!pointer || ev.pointerId !== pointer.id) return;
      pointer = null;
      overlay.classList.remove('dragging');
    }

    function imageCrop() {
      const g = geo();
      if (!g) return null;
      clamp();
      const x = (crop.x - g.ix) * g.sx;
      const y = (crop.y - g.iy) * g.sy;
      return {
        x: Math.max(0, x),
        y: Math.max(0, y),
        w: Math.min(image.naturalWidth - x, crop.size * g.sx),
        h: Math.min(image.naturalHeight - y, crop.size * g.sy)
      };
    }

    function cutIntoNine(size = 240) {
      const src = imageCrop();
      if (!src) return [];
      const res = [];
      const tw = src.w / 3;
      const th = src.h / 3;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          canvas.getContext('2d').drawImage(
            image,
            src.x + c * tw,
            src.y + r * th,
            tw,
            th,
            0,
            0,
            size,
            size
          );
          res.push(canvas.toDataURL('image/jpeg', 0.92));
        }
      }
      return res;
    }

    overlay.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    window.addEventListener('resize', render);
    return { reset, render, imageCrop, cutIntoNine };
  }

  window.ImageImport = { createImageCropper };
})();
