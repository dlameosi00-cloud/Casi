/* roulette.js — рулетка: красное (x2), чёрное (x2), зеро (x36) */

Games.roulette = (() => {
  function mount(root) {
    root.innerHTML = `
      <div class="game-root-title"><svg class="gicon"><use href="#ic-wheel"/></svg> Рулетка</div>
      <div class="roulette-wrap">
        <div class="roulette-dial" id="rl-dial">
          <div class="roulette-ball"></div>
          <div class="roulette-pin"><span id="rl-num">?</span></div>
        </div>
        <div class="roulette-result" id="rl-result"></div>
        <div class="rl-hist" id="rl-hist"></div>
      </div>
      <div class="bet-panel">
        <div style="font-size:13px;color:var(--dim)">Выбери ставку</div>
        <div class="bet-selects" style="margin-top:8px">
          <button class="bet-opt red sel" data-t="red">🔴 Красное x2</button>
          <button class="bet-opt black" data-t="black">⚫ Чёрное x2</button>
          <button class="bet-opt zero" data-t="zero">🟢 Зеро x36</button>
        </div>
        <div class="bet-row">
          <input class="bet-input" id="rl-bet" type="number" min="1" value="10">
          <button class="chip" data-add="10">+10</button>
          <button class="chip" data-add="50">+50</button>
          <button class="chip" data-add="100">+100</button>
        </div>
        <button class="btn-bet" id="rl-start">Крутить</button>
      </div>
    `;

    const dial = root.querySelector('#rl-dial');
    const numEl = root.querySelector('#rl-num');
    const resEl = root.querySelector('#rl-result');
    const btn = root.querySelector('#rl-start');
    let type = 'red';
    let spinning = false;

    root.querySelectorAll('.bet-opt').forEach(b =>
      b.addEventListener('click', () => {
        if (spinning) return;
        root.querySelectorAll('.bet-opt').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
        type = b.dataset.t;
      }));

    root.querySelectorAll('[data-add]').forEach(c =>
      c.addEventListener('click', () => {
        const inp = root.querySelector('#rl-bet');
        inp.value = c.dataset.add === 'max'
          ? Math.max(1, Math.floor(Store.demoMode ? Store.demoBalance : Store.balance))
          : (+inp.value || 0) + +c.dataset.add;
      }));

    function spin() {
      const v = Math.floor(+root.querySelector('#rl-bet').value);
      if (!v || v < 1) return Store.toast('Укажи ставку');
      if (!Store.canAfford(v)) return Store.toast('Недостаточно звёзд ⭐');
      Store.add(-v);
      Store.recordBet('Рулетка', v);
      spinning = true;
      btn.disabled = true;
      resEl.textContent = '';

      // исход с поправкой Luck (ставки игрока казино держит под контролем)
      const f = Luck.f(v);
      const pWinBase = type === 'zero' ? 1 / 37 : 18 / 37;
      const pWin = Math.max(0.02, Math.min(0.92, pWinBase * (f / 0.95)));
      let num, color;
      if (Math.random() < pWin) {
        num = type === 'zero' ? 0 : (type === 'red'
          ? 1 + 2 * Math.floor(Math.random() * 18)
          : 2 * (1 + Math.floor(Math.random() * 17)));
        color = type;
      } else {
        if (Math.random() < 0.03) { num = 0; color = 'zero'; }
        else {
          num = type === 'red'
            ? 2 * (1 + Math.floor(Math.random() * 17))
            : 1 + 2 * Math.floor(Math.random() * 18);
          color = type === 'red' ? 'black' : 'red';
        }
      }
      const slots = 37;
      const seg = 360 / slots;

      // сколько сегментов нужно докрутить чтобы ball сверху
      const turns = 5 + Math.floor(Math.random() * 3);
      const target = 360 * turns + (slots - num) * seg;
      dial.style.transform = 'rotate(' + target + 'deg)';

      setTimeout(() => {
        numEl.textContent = num === 0 ? '0' : num;
        const histEl = root.querySelector('#rl-hist');
        if (histEl) {
          histEl.insertAdjacentHTML('afterbegin',
            '<span class="rl-chip ' + color + '">' + (num === 0 ? '0' : num) + '</span>');
          while (histEl.children.length > 12) histEl.lastChild.remove();
        }
        spinning = false;
        btn.disabled = false;
        const names = { red: 'Красное', black: 'Чёрное', zero: 'Зеро' };
        if (color === type) {
          const m = type === 'zero' ? 36 : 2;
          const win = v * m;
          Store.add(win);
          Store.recordWin(m, win, 'Рулетка');
          resEl.textContent = '✅ ' + names[color] + '! Выигрыш ' + win + ' ★';
          resEl.style.color = 'var(--green)';
        } else {
          resEl.textContent = '❌ Выпало ' + names[color] + '. Проигрыш.';
          resEl.style.color = 'var(--red)';
        }
      }, 4100);
    }

    btn.addEventListener('click', spin);

    return { unmount() {} };
  }

  return { mount };
})();
