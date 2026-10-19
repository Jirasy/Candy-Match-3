const SYMBOLS = ["♥", "✦", "●", "◆", "▲", "◎", "★"];

class BoardEngine {
  constructor(config) {
    this.config = config;
    this.rng = randomSeed((config.number * 2654435761) >>> 0);
    this.cells = [];
    this.generate();
  }

  index(r, c) { return r * 8 + c; }

  neighbors(i) {
    const r = Math.floor(i / 8), c = i % 8;
    return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
      .filter(([a, b]) => a >= 0 && a < 8 && b >= 0 && b < 8)
      .map(([a, b]) => this.index(a, b));
  }

  adjacent(a, b) {
    return this.neighbors(a).includes(b);
  }

  swap(a, b) {
    [this.cells[a], this.cells[b]] = [this.cells[b], this.cells[a]];
  }

  generate() {
    for (let attempt = 0; attempt < 250; attempt++) {
      this.cells = Array(64).fill(null);
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const options = Array.from({ length: this.config.types }, (_, i) => i).filter(v =>
            !(c >= 2 && this.cells[this.index(r, c - 1)] === v && this.cells[this.index(r, c - 2)] === v) &&
            !(r >= 2 && this.cells[this.index(r - 1, c)] === v && this.cells[this.index(r - 2, c)] === v)
          );
          this.cells[this.index(r, c)] = options[Math.floor(this.rng() * options.length)];
        }
      }

      if (!this.hasMove()) continue;

      for (let k = 0; k < this.config.blockers; k++) {
        const candidates = Array.from({ length: 64 }, (_, i) => i)
          .filter(i => this.cells[i] !== -1 && this.neighbors(i).every(j => this.cells[j] !== -1));
        let placed = false;
        for (let tries = 0; tries < Math.min(32, candidates.length); tries++) {
          const pick = Math.floor(this.rng() * candidates.length);
          const i = candidates.splice(pick, 1)[0];
          const old = this.cells[i];
          this.cells[i] = -1;
          if (this.hasMove()) { placed = true; break; }
          this.cells[i] = old;
        }
        if (!placed) break;
      }

      if (this.hasMove()) return;
    }

    this.cells = Array.from({ length: 64 }, (_, i) => (Math.floor(i / 8) + i % 8) % this.config.types);
    this.cells[0] = 0; this.cells[1] = 1; this.cells[2] = 0; this.cells[9] = 0;
  }

  findMatches() {
    const result = new Set();
    for (let axis = 0; axis < 2; axis++) {
      for (let line = 0; line < 8; line++) {
        let start = 0;
        while (start < 8) {
          const value = this.cells[axis ? this.index(start, line) : this.index(line, start)];
          let end = start + 1;
          while (end < 8 && this.cells[axis ? this.index(end, line) : this.index(line, end)] === value) end++;
          if (value !== null && value !== -1 && end - start >= 3) {
            for (let p = start; p < end; p++) result.add(axis ? this.index(p, line) : this.index(line, p));
          }
          start = end;
        }
      }
    }
    return result;
  }

  hasMove() {
    for (let a = 0; a < 64; a++) {
      if (this.cells[a] === -1) continue;
      for (const b of [a % 8 < 7 ? a + 1 : -1, a < 56 ? a + 8 : -1]) {
        if (b < 0 || this.cells[b] === -1 || this.cells[a] === this.cells[b]) continue;
        this.swap(a, b);
        const valid = this.findMatches().size > 0;
        this.swap(a, b);
        if (valid) return true;
      }
    }
    return false;
  }

  remove(matches) {
    const blockers = new Set();
    matches.forEach(i => this.neighbors(i).forEach(j => { if (this.cells[j] === -1) blockers.add(j); }));
    matches.forEach(i => this.cells[i] = null);
    blockers.forEach(i => this.cells[i] = null);
    return blockers.size;
  }

  gravity() {
    for (let c = 0; c < 8; c++) {
      let bottom = 7;
      while (bottom >= 0) {
        if (this.cells[this.index(bottom, c)] === -1) { bottom--; continue; }
        let top = bottom;
        while (top >= 0 && this.cells[this.index(top, c)] !== -1) top--;
        const existing = [];
        for (let r = bottom; r > top; r--) {
          const value = this.cells[this.index(r, c)];
          if (value !== null) existing.push(value);
        }
        let r = bottom;
        for (const value of existing) this.cells[this.index(r--, c)] = value;
        while (r > top) this.cells[this.index(r--, c)] = Math.floor(this.rng() * this.config.types);
        bottom = top - 1;
      }
    }
  }
}