/* plinko.js — Плинко: пирамида колышков, шарики, разноцветные лузы */

Games.plinko = (() => {
  function mount(root) {
    root.innerHTML = `
      <div class="game-root-title"><svg class="gicon"><use href="#ic-plinko"/></svg> Plinko</div>
      <div class="plinko-stage">
        <canvas class="plinko-canvas" id="p-canvas"></canvas>
      </div>
      <div class="chips-row" style="margin:0 0 14px">
        <button class="chip-m" data-risk="low">Низкий</button>
        <button class="chip-m sel" data-risk="mid">Средний</button>
        <button class="chip-m" data-risk="high">Высокий</button>
      </div>
      <div class="bet-panel">
        <div class="bet-row">
          <input class="bet-input" id="p-bet" type="number" min="1" value="10">
          <button class="chip" data-add="10">+10</button>
          <button class="chip" data-add="50">+50</button>
          <button class="chip" data-add="100">+100</button>
        </div>
        <button class="btn-bet" id="p-drop">Бросить шарик</button>
        <div class="multiplier-display">Шарик падает сквозь колышки — приз зависит от лузы!</div>
      </div>
    `;

    const cv = root.querySelector('#p-canvas');
    const ctx = cv.getContext('2d');
    if (!ctx.roundRect) {
      CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
      };
    }
    const ROWS = 8;
    const RISKS = {
      low: [5.6, 2.1, 1.1, 0.5, 0.3, 0.5, 1.1, 2.1, 5.6],
      mid: [11, 2.6, 1.2, 0.7, 0.45, 0.7, 1.2, 2.6, 11],
      high: [24, 5, 1.6, 0.4, 0.2, 0.4, 1.6, 5, 24]
    };
    let mults = RISKS.mid;
    const BUCKET_COLORS = ['#e0334f', '#ff8a3d', '#ffd766', '#4a9dff', '#b44aff', '#4a9dff', '#ffd766', '#ff8a3d', '#e0334f'];
    const DROP_MS = 240; /* время между колышками */
    const HOP_MS = 230;

    let W = 0, H = 0, dpr = 1;
    let balls = [], raf = null, last = 0;
    let flashes = []; /* вспышки на лузах */

    function resize() {
      dpr = devicePixelRatio || 1;
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    function geo() {
      const topY = 40, botY = H - 56;
      const rowH = (botY - topY) / ROWS;
      const spread = Math.min(W * 0.72, 250);
      const pegs = [];
      for (let r = 0; r < ROWS; r++) {
        const n = r + 2;
        const y = topY + r * rowH;
        for (let i = 0; i < n; i++) {
          const x = W / 2 + (i - (n - 1) / 2) * (spread / ROWS);
          pegs.push({ x, y, r: 4.5 });
        }
      }
      return { topY, botY, rowH, spread, pegs };
    }

    function bucketX(i) {
      const g = geo();
      const bw = g.spread / 8;
      return W / 2 + (i - 4) * bw;
    }

    function draw(ts) {
      const g = geo();
      ctx.clearRect(0, 0, W, H);

      /* колышки */
      for (const p of g.pegs) {
        const grd = ctx.createRadialGradient(p.x - 1, p.y - 1, 1, p.x, p.y, 5);
        grd.addColorStop(0, '#ffffff');
        grd.addColorStop(1, '#8fa0d9');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }

      /* лузы */
      const bw = g.spread / 8;
      for (let i = 0; i < 9; i++) {
        const x = bucketX(i) - bw / 2 + 2;
        const y = H - 44;
        ctx.fillStyle = BUCKET_COLORS[i];
        ctx.beginPath();
        ctx.roundRect(x, y, bw - 4, 26, 6);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '800 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(mults[i] + 'x', bucketX(i), y + 17);
        /* свечение при попадании */
        const fl = flashes.find(f => f.i === i && ts - f.t < 500);
        if (fl) {
          const a = 1 - (ts - fl.t) / 500;
          ctx.strokeStyle = 'rgba(255,255,255,' + a + ')';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(x - 2, y - 2, bw, 30, 7); ctx.stroke();
        }
      }
      flashes = flashes.filter(f => ts - f.t < 500);

      /* шарики */
      for (const b of balls) {
        ctx.save();
        const grd = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, 7);
        grd.addColorStop(0, '#ffffff');
        grd.addColorStop(.6, '#ffd766');
        grd.addColorStop(1, '#ff8a3d');
        ctx.fillStyle = grd;
        ctx.shadowColor = 'rgba(255,215,102,.7)';
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    function loop(ts) {
      const dt = Math.min(ts - last, 50) / 1000;
      last = ts;
      for (const b of balls) {
        if (b.done) continue;
        b.t += dt * 1000;
        if (b.t >= HOP_MS) {
          /* прыжок к следующей точке */
          b.t = 0;
          b.fromX = b.x; b.fromY = b.y;
          b.row++;
          if (b.row > ROWS) { land(b); continue; }
          b.dir = Math.random() < 0.5 ? -1 : 1;
          b.targetCol += (b.dir + 1) / 2; /* -1 -> 0, 1 -> +1 */
          const g = geo();
          const n = b.row + 2;
          b.tx = W / 2 + (b.targetCol - (n - 1) / 2) * (g.spread / ROWS);
          b.ty = g.topY + (b.row - 1) * g.rowH;
        }
        const p = Math.min(b.t / HOP_MS, 1);
        const ease = 1 - Math.pow(1 - p, 2);
        b.x = b.fromX + (b.tx - b.fromX) * ease;
        b.y = b.fromY + (b.ty - b.fromY) * ease + Math.sin(p * Math.PI) * 7;
      }
      draw(ts);
      balls = balls.filter(b => !b.done || ts - b.doneTs < 1500);
      if (balls.length) raf = requestAnimationFrame(loop);
      else raf = null;
    }

    function land(b) {
      b.done = true;
      b.doneTs = last;
      b.y = H - 50;
      const g = geo();
      /* индекс лузы = число правых отскоков */
      const idx = Math.min(8, Math.max(0, b.rights));
      const mult = mults[idx];
      flashes.push({ i: idx, t: last });
      if (mult >= 1) {
        const win = Math.floor(b.bet * mult);
        Store.add(win);
        Store.recordWin(mult, win, 'Плинко');
        showHit('+' + win + ' ★ (' + mult + 'x)');
      } else {
        const back = Math.floor(b.bet * mult);
        if (back > 0) Store.add(back);
        Store.recordLoss('Плинко', b.bet);
        showHit('×' + mult + ' (' + back + ' ★)');
      }
      if (Store.tg) {
        try { Store.tg.HapticFeedback.notificationOccurred(mult >= 1 ? 'success' : 'error'); } catch (e) {}
      }
    }

    function showHit(text) {
      const stage = root.querySelector('.plinko-stage');
      const el = document.createElement('div');
      el.className = 'plinko-hit';
      el.textContent = text;
      stage.appendChild(el);
      setTimeout(() => el.remove(), 1200);
    }

    function drop() {
      const v = Math.floor(+root.querySelector('#p-bet').value);
      if (!v || v < 1) return Store.toast('Укажи ставку');
      if (!Store.canAfford(v)) return Store.toast('Недостаточно звёзд ⭐');
      Store.add(-v);
      Store.recordBet('Плинко', v);
      const g = geo();
      balls.push({
        x: W / 2, y: g.topY - 10, fromX: W / 2, fromY: g.topY - 10,
        tx: W / 2, ty: g.topY - 10, t: HOP_MS, row: 0, targetCol: 0,
        bet: v, rights: 0, done: false, f: Luck.f(v)
      });
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    }

    /* переопределяем логику rights: считаем правые отскоки в прыжках */
    const _loop = loop;
    loop = function (ts) {
      for (const b of balls) {
        if (!b.done && b.row > 0 && b.t === 0) { /* только что прыгнул */ }
      }
      _loop(ts);
    };

    root.querySelectorAll('[data-risk]').forEach(b =>
      b.addEventListener('click', () => {
        root.querySelectorAll('[data-risk]').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
        mults = RISKS[b.dataset.risk];
        draw(performance.now());
      }));

    root.querySelector('#p-drop').addEventListener('click', drop);
    root.querySelectorAll('[data-add]').forEach(c =>
      c.addEventListener('click', () => {
        const inp = root.querySelector('#p-bet');
        inp.value = c.dataset.add === 'max'
          ? Math.max(1, Math.floor(Store.demoMode ? Store.demoBalance : Store.balance))
          : (+inp.value || 0) + +c.dataset.add;
      }));

    /* считаем правые отскоки при выборе направления */
    const origLand = land;
    land = function (b) {
      b.rights = b.targetCol; /* targetCol = число правых шагов */
      /* Luck смещает результат: жёстко — к центру (низкие x), щедро — к краям */
      const idx0 = b.rights;
      if (b.f < 0.85 && Math.random() < (0.85 - b.f) * 1.2) {
        b.rights = 3 + Math.floor(Math.random() * 3);
      } else if (b.f > 1.15 && Math.random() < Math.min(0.5, (b.f - 1.15) * 1.5)) {
        b.rights = Math.random() < 0.5 ? 0 : 8;
      }
      origLand(b);
    };

    draw(performance.now());

    return {
      unmount() { if (raf) cancelAnimationFrame(raf); balls = []; }
    };
  }

  return { mount };
})();
