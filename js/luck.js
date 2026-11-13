/* luck.js — движок шансов: адаптивный house-edge + демо-режим для кейсов */

const Luck = {
  /*
   * Возвращает коэффициент к RTP (1 = честные ~97%).
   * < 1 — казино зарабатывает больше, > 1 — игроку везёт.
   */
  f(bet, demoOk) {
    /* демо-режим: щедрые кейсы, выигрыши ненастоящие */
    if (Store.demoMode && demoOk) return 1.6;

    const s = Store.stats;
    const staked = s.staked || 0;
    const won = s.won || 0;

    /* базовый RTP казино */
    let rtp = 0.88;

    /* адаптация под игрока: в минусе у казино — чуть мягче, в плюсе — жёстче */
    const deficit = staked - won; /* >0 = казино в плюсе */
    const rel = staked > 0 ? deficit / staked : 0; /* [-1..1] */
    rtp += Math.max(-0.3, Math.min(0.12, rel * 0.4));

    /* первые 3 игры сессии — мягкие, дальше постепенно жёстче */
    const games = Store.session.games || 0;
    if (games < 3) rtp += 0.15;
    else if (games > 8) rtp -= Math.min(0.18, (games - 8) * 0.018);

    /* крупные ставки — заметно жёстче */
    const avg = Store.session.avgBet || bet;
    if (bet >= avg * 3 || bet >= Store.balance * 0.35) rtp -= 0.22;
    if (bet >= 300) rtp -= 0.08;
    if (bet >= 1000) rtp -= 0.05;

    const f = rtp / 0.9;
    return Math.max(0.42, Math.min(1.25, f));
  },

  /* шанс выигрыша по базовой вероятности */
  p(baseProb, bet, demoOk) {
    const p = baseProb * (this.f(bet, demoOk) / 0.95);
    return Math.max(0.01, Math.min(0.97, p));
  }
};
