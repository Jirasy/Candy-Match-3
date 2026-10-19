/**
 * StorageManager
 * Menyimpan progres level, skor tertinggi, bintang, dan pengaturan suara di localStorage.
 */
const StorageManager = {
  key: "candy-match3-save-v1",
  
  defaults() {
    return {
      unlockedLevel: 1,
      highScores: {},
      stars: {},
      settings: { soundEnabled: true }
    };
  },

  load() {
    const base = this.defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(this.key));
      if (!saved || typeof saved !== "object") return base;
      return {
        unlockedLevel: Number.isSafeInteger(saved.unlockedLevel) ? Math.max(1, saved.unlockedLevel) : 1,
        highScores: saved.highScores && typeof saved.highScores === "object" ? saved.highScores : {},
        stars: saved.stars && typeof saved.stars === "object" ? saved.stars : {},
        settings: { soundEnabled: saved.settings?.soundEnabled !== false }
      };
    } catch (_) {
      return base;
    }
  },

  save(data) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch (_) {}
  },

  reset() {
    const data = this.defaults();
    this.save(data);
    return data;
  }
};