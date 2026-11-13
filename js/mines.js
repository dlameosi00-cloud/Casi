/* mines.js — игра "Мины": поле 5x5, 3D-плитки, прогресс, кэшаут */

Games.mines = (() => {
  function mount(root) {
    root.innerHTML = `
      <div class="game-root-title"><svg class="gicon"><use href="#ic-bomb"/></svg> Мины</div>
      <div class="bet-panel">
        <div style="font-size:13px;color:var(--dim)">Количество мин</div>
        <div class="bet-row" id="mines-count-row">
          <button class="chip sel" data-m="3">3 💣</button>
          <button class="chip" data-m="5">5 💣</button>
          <button class="chip" data-m="10">10 💣</button>
        </div>
        <div class="bet-row">
          <input class="bet-input" id="m-bet" type="number" min="1" value="10">
          <button class="chip" data-add="10">+10</button>
          <button class="chip" data-add="50">+50</button>
          <button class="chip" data-add="100">+100</button>
        </div>
        <button class="btn-bet" id="m-start">Играть</button>
      </div>
      <div class="mines-stage">
        <div class="mines-head">
          <div>
            <div class="mh-label">Следующий x</div>
            <div class="mh-value" id="m-next">—</div>
          </div>
          <div style="text-align:center">
            <div class="mh-label">Мин в игре</div>
            <div class="mh-value" id="m-left" style="color:#ff8098">3</div>
          </div>
          <div style="text-align:right">
            <div class="mh-label">Забрать</div>
            <div class="mh-value" id="m-cash" style="color:var(--green)">0 ★</div>
          </div>
        </div>
        <div class="mines-grid" id="m-grid"></div>
        <div class="mines-dots" id="m-dots"></div>
      </div>
    `;

    let minesCount = 3, bet = 0, playing = false, minePos = [], opened = 0, mult = 0, openedSafe = [];

    const grid = root.querySelector('#m-grid');
    const nextEl = root.querySelector('#m-next');
    const cashEl = root.querySelector('#m-cash');
    const dotsEl = root.querySelector('#m-dots');
    const startBtn = root.querySelector('#m-start');
    const info = root.querySelector('#m-info');

    root.querySelectorAll('#mines-count-row .chip').forEach(c =>
      c.addEventListener('click', () => {
        if (playing) return;
        root.querySelectorAll('#mines-count-row .chip').forEach(x => x.classList.remove('sel'));
        c.classList.add('sel');
        minesCount = +c.dataset.m;
      }));

    root.querySelectorAll('[data-add]').forEach(c =>
      c.addEventListener('click', () => {
        const inp = root.querySelector('#m-bet');
        inp.value = c.dataset.add === 'max'
          ? Math.max(1, Math.floor(Store.demoMode ? Store.demoBalance : Store.balance))
          : (+inp.value || 0) + +c.dataset.add;
      }));

    function payout() {
      let m = 1;
      for (let i = 0; i < opened; i++) m *= (25 - minesCount - i) / (25 - i);
      return Math.floor(0.97 / m * 100) / 100;
    }

    function buildGrid() {
      grid.innerHTML = '';
      for (let i = 0; i < 25; i++) {
        const cell = document.createElement('button');
        cell.className = 'mine-cell';
        cell.dataset.i = i;
        cell.addEventListener('click', () => pick(cell, i));
        grid.appendChild(cell);
      }
      dotsEl.innerHTML = '';
      for (let i = 0; i < 8; i++) {
        const d = document.createElement('div');
        d.className = 'mines-dot';
        dotsEl.appendChild(d);
      }
      updateHead();
    }

    function updateHead() {
      const ml = root.querySelector('#m-left');
      if (ml) ml.textContent = minesCount;
      const next = payoutFor(opened + 1);
      nextEl.textContent = playing ? 'x' + next : '—';
      cashEl.textContent = playing && opened > 0
        ? Math.floor(bet * mult) + ' ★' : '0 ★';
    }

    function payoutFor(k) {
      let m = 1;
      for (let i = 0; i < k; i++) m *= (25 - minesCount - i) / (25 - i);
      return Math.floor(0.97 / m * 100) / 100;
    }

    function pick(cell, i) {
      if (!playing || cell.classList.contains('opened')) return;
      cell.classList.add('opened');
      /* динамический шанс мины ( Luck адаптирует под игрока и ставку) */
      const remaining = 25 - opened;
      const minesLeft = minePos.filter(m => !openedSafe.includes(m)).length;
      const pMine = Math.min(0.97, (minesLeft / remaining) / Luck.f(bet));
      const isMine = Math.random() < pMine;
      if (isMine) {
        if (!minePos.includes(i)) minePos.push(i);
        cell.classList.add('boom');
        cell.textContent = '💥';
        lose();
        return;
      }
      /* если решено, что клетка безопасна — убираем мину из расклада */
      if (minePos.includes(i)) {
        minePos.splice(minePos.indexOf(i), 1);
        const free = [...Array(25).keys()]
          .filter(x => !minePos.includes(x) && !openedSafe.includes(x) && x !== i);
        if (free.length) minePos.push(free[Math.floor(Math.random() * free.length)]);
      }
      openedSafe.push(i);
      opened++;
      cell.classList.add('safe');
      cell.textContent = '💎';
      mult = payout();
      const dot = dotsEl.children[Math.min(opened - 1, 7)];
      if (dot) dot.classList.add('on');
      updateHead();
    }

    function lose() {
      playing = false; mult = 0;
      startBtn.textContent = 'Играть';
      startBtn.classList.remove('red');
      nextEl.textContent = '—'; cashEl.textContent = '0 ★';
      Store.toast('💥 Мина! Ставка проиграна');
      showAll();
    }

    function showAll() {
      grid.querySelectorAll('.mine-cell').forEach((cell, i) => {
        if (!cell.classList.contains('opened')) {
          cell.classList.add('opened');
          setTimeout(() => {
            cell.textContent = minePos.includes(i) ? '💣' : '·';
            cell.style.opacity = minePos.includes(i) ? '1' : '.45';
          }, Math.random() * 350);
        }
      });
    }

    function start() {
      const v = Math.floor(+root.querySelector('#m-bet').value);
      if (!v || v < 1) return Store.toast('Укажи ставку');
      if (!Store.canAfford(v)) return Store.toast('Недостаточно звёзд ⭐');
      Store.add(-v); Store.recordBet('Мины', v);
      bet = v; playing = true; opened = 0; mult = 0; openedSafe = [];
      minePos = [];
      while (minePos.length < minesCount) {
        const p = Math.floor(Math.random() * 25);
        if (!minePos.includes(p)) minePos.push(p);
      }
      buildGrid();
      startBtn.textContent = '💰 Забрать';
      startBtn.classList.add('red');
    }

    function cashout() {
      if (!playing) return;
      if (opened === 0) return Store.toast('Открой хотя бы 1 клетку');
      const win = Math.floor(bet * mult);
      Store.add(win); Store.recordWin(mult, win, 'Мины');
      playing = false;
      startBtn.textContent = 'Играть';
      startBtn.classList.remove('red');
      Store.toast('✅ Забрано ' + win + ' ★ (x' + mult + ')');
      showAll();
      nextEl.textContent = '—'; cashEl.textContent = '0 ★';
    }

    startBtn.addEventListener('click', () => playing ? cashout() : start());
    buildGrid();

    return { unmount() {} };
  }

  return { mount };
})();
