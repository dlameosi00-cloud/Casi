/* rocket.js — игра "Ракетка" (crash) v2: детальная ракета, дым, искры, параллакс */

Games.rocket = (() => {
  function mount(root) {
    root.innerHTML = `
      <div class="game-root-title"><svg class="gicon"><use href="#ic-rocket"/></svg> Ракетка</div>
      <div class="r-hist" id="r-hist"></div>
      <div class="rocket-stage" id="r-stage">
        <canvas class="rocket-canvas" id="r-canvas"></canvas>
        <div class="rocket-cashline" id="r-line"><b></b></div>
        <div class="rocket-badge" id="r-badge">Ракета готовится к запуску</div>
        <div class="rocket-mult" id="r-mult">x1.00</div>
        <div class="rocket-status" id="r-status">Ставь и жди старта</div>
      </div>
      <div class="bet-panel">
        <div class="bet-row">
          <input class="bet-input" id="r-bet" type="number" min="1" value="10">
          <button class="chip" data-add="10">+10</button>
          <button class="chip" data-add="50">+50</button>
          <button class="chip" data-add="100">+100</button>
        </div>
        <button class="btn-bet" id="r-start">🚀 Запустить</button>
        <div class="multiplier-display">Ракета взлетает — забери до взрыва!</div>
      </div>
    `;

    const cv = root.querySelector('#r-canvas');
    const ctx = cv.getContext('2d');
    const multEl = root.querySelector('#r-mult');
    const statusEl = root.querySelector('#r-status');
    const badgeEl = root.querySelector('#r-badge');
    const stageEl = root.querySelector('#r-stage');
    const lineEl = root.querySelector('#r-line');
    const startBtn = root.querySelector('#r-start');

    let running = false, raf = null, startTs = 0, bet = 0, crashAt = 0;
    let stars = [], smokes = [], sparks = [];
    let lastSmoke = 0;
    const histEl = root.querySelector('#r-hist');
    let hist = [];
    function pushCrash(v) {
      hist.unshift(v); hist = hist.slice(0, 12);
      histEl.innerHTML = hist.map(x =>
        '<span class="rh-pill ' + (x < 2 ? 'lo' : x < 5 ? 'mid' : 'hi') + '">x' + x.toFixed(2) + '</span>').join('');
    }

    function resize() {
      cv.width = cv.clientWidth * devicePixelRatio;
      cv.height = cv.clientHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      stars = [];
      for (let i = 0; i < 70; i++) stars.push({
        x: Math.random() * cv.clientWidth,
        y: Math.random() * cv.clientHeight,
        s: Math.random() * 1.6 + 0.4,
        v: Math.random() * 1 + 0.25,
        layer: Math.random() < .5 ? 1 : 2
      });
    }
    resize();

    function drawStars(fly) {
      for (const st of stars) {
        st.y += st.v * (fly ? st.layer * 3.2 : 0.35);
        if (st.y > cv.clientHeight) { st.y = -2; st.x = Math.random() * cv.clientWidth; }
        ctx.fillStyle = fly
          ? 'rgba(255,255,255,' + (0.25 + st.layer * 0.22) + ')'
          : 'rgba(255,255,255,.25)';
        ctx.fillRect(st.x, st.y, st.s, st.s + (fly ? st.v * st.layer * 1.5 : 0));
      }
    }

    function path(t) {
      const w = cv.clientWidth, h = cv.clientHeight;
      const ease = Math.min(t / 9, 1);
      const x = 34 + (w - 100) * ease * ease * 0.62 + t * 13;
      const y = h - 58 - Math.min(t * t * 9, h - 116);
      return { x: Math.min(x, w - 48), y: Math.max(48, y) };
    }

    function angle(t) {
      return -Math.PI * 0.3 * Math.min((path(t).y / (cv.clientHeight - 60)), 1) - 0.28;
    }

    function drawRocket(p, a, t, boom) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a + Math.PI / 2); // ракета смотрит по направлению полёта
      // --- пламя (2 слоя) ---
      if (!boom) {
        const fl = 20 + Math.sin(t * 55) * 7;
        // внешний слой
        let g = ctx.createLinearGradient(0, 12, 0, 12 + fl);
        g.addColorStop(0, 'rgba(255,120,60,.9)');
        g.addColorStop(1, 'rgba(255,60,30,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-6, 12); ctx.lineTo(0, 12 + fl); ctx.lineTo(6, 12); ctx.fill();
        // внутренний слой
        g = ctx.createLinearGradient(0, 12, 0, 12 + fl * .55);
        g.addColorStop(0, '#fff3c4');
        g.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-3, 12); ctx.lineTo(0, 12 + fl * .55); ctx.lineTo(3, 12); ctx.fill();
      }
      // --- корпус ---
      const bg = ctx.createLinearGradient(-11, 0, 11, 0);
      bg.addColorStop(0, '#b9aee8');
      bg.addColorStop(.45, '#f2eeff');
      bg.addColorStop(1, '#8a7cc9');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.quadraticCurveTo(11, -6, 10, 8);
      ctx.lineTo(-10, 8);
      ctx.quadraticCurveTo(-11, -6, 0, -22);
      ctx.fill();
      // --- нос ---
      ctx.fillStyle = '#ff4d6a';
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.quadraticCurveTo(4, -14, 4.5, -10);
      ctx.lineTo(-4.5, -10);
      ctx.quadraticCurveTo(-4, -14, 0, -22);
      ctx.fill();
      // --- стабилизаторы ---
      ctx.fillStyle = '#ff8a3d';
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(17, 12); ctx.lineTo(9, 9); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-17, 12); ctx.lineTo(-9, 9); ctx.fill();
      // --- сопло ---
      ctx.fillStyle = '#3a2f6b';
      ctx.fillRect(-5, 8, 10, 4);
      // --- иллюминатор ---
      ctx.fillStyle = '#241b44';
      ctx.beginPath(); ctx.arc(0, -2, 5, 0, Math.PI * 2); ctx.fill();
      const wg = ctx.createRadialGradient(-1.5, -3.5, 1, 0, -2, 4.5);
      wg.addColorStop(0, '#9be8ff');
      wg.addColorStop(1, '#7c4dff');
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.arc(0, -2, 3.8, 0, Math.PI * 2); ctx.fill();
      // блик
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -2, 3.2, -2.6, -1.4);
      ctx.stroke();
      ctx.restore();
    }

    function draw(t, boom) {
      const w = cv.clientWidth, h = cv.clientHeight;
      const shake = boom ? Math.sin(t * 40) * 5 : 0;
      ctx.save();
      ctx.translate(shake, boom ? Math.cos(t * 33) * 4 : 0);
      ctx.clearRect(-12, -12, w + 24, h + 24);
      drawStars(running && !boom);

      const p = path(t);
      const a = angle(t);

      // дым
      if (running && !boom && t - lastSmoke > 0.03) {
        lastSmoke = t;
        smokes.push({ x: p.x - 14, y: p.y + 8, r: 3 + Math.random() * 3, life: 1, vx: -0.6 - Math.random(), vy: 1 + Math.random() });
      }
      for (let i = smokes.length - 1; i >= 0; i--) {
        const s = smokes[i];
        s.x += s.vx; s.y += s.vy; s.r += 0.35; s.life -= 0.02;
        if (s.life <= 0) { smokes.splice(i, 1); continue; }
        ctx.fillStyle = 'rgba(180,165,235,' + (s.life * 0.25) + ')';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }

      // траектория
      ctx.strokeStyle = 'rgba(124,77,255,.8)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(124,77,255,.6)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(26, h - 36);
      ctx.quadraticCurveTo(p.x * 0.55, h - 30, p.x, p.y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // земля и стартовая площадка
      ctx.fillStyle = '#241b44';
      ctx.fillRect(0, h - 24, w, 24);
      ctx.fillStyle = 'rgba(124,77,255,.45)';
      ctx.fillRect(0, h - 24, w, 2);
      ctx.fillStyle = '#3a2f6b';
      ctx.fillRect(14, h - 30, 24, 6);

      drawRocket(p, a, t, boom);

      // искры взрыва
      if (boom) {
        for (let i = 0; i < 22; i++) {
          const ang = i / 22 * Math.PI * 2;
          const r = 20 + Math.sin(t * 11 + i * 1.7) * 10;
          ctx.fillStyle = ['#ff4d6a', '#ff8a3d', '#ffd766'][i % 3];
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r, 4 + Math.sin(t * 9 + i) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    function loop(ts) {
      const t = (ts - startTs) / 1000;
      const m = Math.pow(1.06, t * 2.2);
      if (m >= crashAt) {
        running = false;
        stageEl.classList.add('crash');
        setTimeout(() => stageEl.classList.remove('crash'), 380);
        draw(t, true);
        multEl.textContent = '💥 x' + crashAt.toFixed(2);
        multEl.style.color = '#ff4d6a';
        badgeEl.textContent = 'Взрыв';
        pushCrash(crashAt);
        statusEl.textContent = 'Ракета взорвалась на x' + crashAt.toFixed(2);
        startBtn.textContent = '🚀 Запустить';
        startBtn.classList.remove('red');
        lineEl.classList.remove('show');
        return;
      }
      multEl.textContent = 'x' + m.toFixed(2);
      multEl.classList.toggle('hotpulse', m > 2);
      statusEl.textContent = bet > 0
        ? 'Забрать сейчас: ' + Math.floor(bet * m) + ' ★'
        : 'Полёт!';
      if (bet > 0) {
        lineEl.classList.add('show');
        lineEl.style.top = path(t).y + 16 + 'px';
        lineEl.querySelector('b').textContent = Math.floor(bet * m) + ' ★';
      }
      draw(t, false);
      raf = requestAnimationFrame(loop);
    }

    function start() {
      const v = Math.floor(+root.querySelector('#r-bet').value);
      if (!v || v < 1) return Store.toast('Укажи ставку');
      if (!Store.canAfford(v)) return Store.toast('Недостаточно звёзд ⭐');
      Store.add(-v); Store.recordBet('Ракетка', v);
      bet = v;
      const r = Math.random();
      const f = Luck.f(v);
      crashAt = Math.max(1.0, Math.floor(0.97 * f / (1 - r) * 100) / 100);
      running = true;
      multEl.style.color = '#ffd766';
      badgeEl.textContent = 'В полёте 🚀';
      startBtn.textContent = '💰 Забрать';
      startBtn.classList.add('red');
      startTs = performance.now();
      raf = requestAnimationFrame(loop);
    }

    function cashout() {
      if (!running) return;
      cancelAnimationFrame(raf);
      const m = +multEl.textContent.slice(1);
      const win = Math.floor(bet * m);
      Store.add(win); Store.recordWin(m, win, 'Ракетка');
      running = false;
      statusEl.textContent = '✅ Забрано ' + win + ' ★ на x' + m.toFixed(2);
      badgeEl.textContent = 'Успешный кэшаут ✨';
      multEl.classList.remove('hotpulse');
      lineEl.classList.remove('show');
      startBtn.textContent = '🚀 Запустить';
      startBtn.classList.remove('red');
      draw((performance.now() - startTs) / 1000, false);
    }

    startBtn.addEventListener('click', () => running ? cashout() : start());
    root.querySelectorAll('[data-add]').forEach(c =>
      c.addEventListener('click', () => {
        const inp = root.querySelector('#r-bet');
        inp.value = c.dataset.add === 'max'
          ? Math.max(1, Math.floor(Store.demoMode ? Store.demoBalance : Store.balance))
          : (+inp.value || 0) + +c.dataset.add;
      }));

    draw(0, false);

    return {
      unmount() { if (raf) cancelAnimationFrame(raf); running = false; }
    };
  }

  return { mount };
})();
