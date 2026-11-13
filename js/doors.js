/* doors.js — угадай дверь: Хэллоуин-тема, призраки, тыквы */

Games.doors = (() => {
  function mount(root) {
    root.innerHTML = `
      <div class="game-root-title"><svg class="gicon"><use href="#ic-door"/></svg> Особняк</div>
      <div class="bet-panel">
        <div class="bet-row">
          <input class="bet-input" id="d-bet" type="number" min="1" value="10">
          <button class="chip" data-add="10">+10</button>
          <button class="chip" data-add="50">+50</button>
          <button class="chip" data-add="100">+100</button>
        </div>
        <button class="btn-bet" id="d-start">Играть</button>
        <div class="multiplier-display" id="d-info">Приз x2.91. Но за одной из дверей — призрак 👻</div>
      </div>
      <div class="doors-stage" id="hw-stage">
        <div class="hw-moon"></div>
        <div class="hw-bats">🦇🦇🦇</div>
        <div class="hw-title">🎃 СТРАШНЫЕ ДВЕРИ 🎃</div>
        <div class="hw-sub">Выбери правильную дверь — забери приз. Ошибёшься — призрак заберёт ставку</div>
        <div class="doors-grid" id="d-grid">
          <button class="door">🚪</button>
          <button class="door">🚪</button>
          <button class="door">🚪</button>
        </div>
        <div class="hw-fog"></div>
        <div class="hw-pumpkins">🎃🕯️🎃</div>
      </div>
    `;

    const doors = root.querySelectorAll('.door');
    const info = root.querySelector('#d-info');
    const startBtn = root.querySelector('#d-start');
    const stage = root.querySelector('#hw-stage');
    let playing = false, bet = 0, prizeDoor = -1;

    root.querySelectorAll('[data-add]').forEach(c =>
      c.addEventListener('click', () => {
        const inp = root.querySelector('#d-bet');
        inp.value = c.dataset.add === 'max'
          ? Math.max(1, Math.floor(Store.demoMode ? Store.demoBalance : Store.balance))
          : (+inp.value || 0) + +c.dataset.add;
      }));

    function start() {
      const v = Math.floor(+root.querySelector('#d-bet').value);
      if (!v || v < 1) return Store.toast('Укажи ставку');
      if (!Store.canAfford(v)) return Store.toast('Недостаточно звёзд ⭐');
      Store.add(-v); Store.recordBet('Двери', v);
      bet = v; playing = true;
      /* Luck решает, будет ли победа в этой попытке */
      const shouldWin = Math.random() < Luck.p(1 / 3, v);
      if (shouldWin) {
        prizeDoor = Math.floor(Math.random() * 3);
      } else {
        const others = [0, 1, 2].filter(d => d !== Math.floor(Math.random() * 3));
        prizeDoor = others[Math.floor(Math.random() * others.length)];
        if (prizeDoor === undefined) prizeDoor = 1;
      }
      doors.forEach(d => { d.className = 'door'; d.textContent = '🚪'; });
      startBtn.disabled = true;
      info.textContent = 'За одной из дверей ждёт приз... или призрак!';
    }

    function ghost(idx) {
      const g = document.createElement('div');
      g.className = 'hw-ghost';
      g.textContent = '👻';
      const d = doors[idx];
      g.style.left = (d.offsetLeft + d.offsetWidth / 3) + 'px';
      g.style.top = (d.offsetTop + 20) + 'px';
      stage.appendChild(g);
      setTimeout(() => g.remove(), 2500);
    }

    function pick(idx) {
      if (!playing) return;
      playing = false;
      doors.forEach((d, i) => {
        d.classList.add('opened');
        if (i === prizeDoor) {
          d.classList.add('win');
          d.textContent = '⭐';
        } else {
          d.classList.add('lose');
          d.textContent = '👻';
        }
      });
      startBtn.disabled = false;
      if (idx === prizeDoor) {
        const win = Math.floor(bet * 2.91);
        Store.add(win); Store.recordWin(2.91, win, 'Двери');
        info.textContent = '✅ Угадал! Выигрыш ' + win + ' ★. Ты пережил эту ночь!';
      } else {
        ghost(prizeDoor);
        info.textContent = '❌ Призрак забрал твою ставку...';
      }
    }

    doors.forEach((d, i) => d.addEventListener('click', () => pick(i)));
    startBtn.addEventListener('click', start);

    return { unmount() {} };
  }

  return { mount };
})();
