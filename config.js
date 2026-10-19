/**
 * Konfigurasi Level Prosedural
 * Menghitung target skor, jumlah langkah, variasi permen, dan blocker secara otomatis per level.
 */
const LevelGenerator = {
  getLevelConfig(number) {
    const n = Math.max(1, Math.floor(number));
    return {
      number: n,
      size: 8,
      target: 450 + (n - 1) * 175 + Math.floor((n - 1) / 5) * 100,
      moves: Math.max(20, 29 - Math.floor((n - 1) / 5)),
      types: Math.min(7, 6 + Math.floor((n - 1) / 8)),
      blockers: n === 1 ? 0 : Math.min(9, Math.floor((n - 1) / 3) + 1)
    };
  }
};

/**
 * Generator acak berdasarkan seed (PRNG) agar pengacakan konsisten.
 */
function randomSeed(seed) {
  let x = seed >>> 0;
  return () => {
    x += 0x6D2B79F5;
    let t = x;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}