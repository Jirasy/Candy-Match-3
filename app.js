/**
 * Aplikasi Utama Game Candy Match-3
 */
const game = {
  state: "MENU",
  level: 1,
  config: null,
  board: null,
  moves: 0,
  score: 0,
  busy: false,
  selected: null,
  token: 0,
  save: StorageManager.load(),
  shownLevels: 18
};

AudioManager.enabled = game.save.settings.soundEnabled;

const $ = id => document.getElementById(id);
const delay = ms => new Promise(resolve => setTimeout(resolve, matchMedia("(prefers-reduced-motion: reduce)").matches ? 20 : ms));

const Renderer = {
  board() {
    const holder = $("board");
    const frag = document.createDocumentFragment();
    game.board.cells.forEach((value, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cell" + (game.selected === i ? " selected" : "");
      button.dataset.cell = i;
      button.setAttribute("role", "gridcell");

      const row = Math.floor(i / 8) + 1;
      const col = i % 8 + 1;
      button.setAttribute("aria-label", value === -1 ? `Baris ${row}, kolom ${col}, blocker` : `Baris ${row}, kolom ${col}, permen ${SYMBOLS[value]}`);

      if (value === -1) {
        const block = document.createElement("span");
        block.className = "blocker";
        block.textContent = "×";
        button.append(block);
      } else if (value !== null) {
        const sweet = document.createElement("span");
        const symbol = document.createElement("span");
        sweet.className = `sweet type-${value}`;
        symbol.textContent = SYMBOLS[value];
        sweet.append(symbol);
        button.append(sweet);
      }
      frag.append(button);
    });
    holder.replaceChildren(frag);
  },

  hud() {
    $("game-level").textContent = `Level ${game.level}`;
    $("moves").textContent = game.moves;
    $("score").textContent = game.score.toLocaleString("id-ID");
    $("target").textContent = game.config.target.toLocaleString("id-ID");
    const progress = Math.min(100, Math.round(game.score / game.config.target * 100));
    $("progress-fill").style.width = progress + "%";
    $("progress-track").setAttribute("aria-valuenow", progress);
  },

  sound() {
    const active = AudioManager.enabled;
    $("settings-sound-text").textContent = active ? "Aktif" : "Nonaktif";
    $("settings-sound").setAttribute("aria-pressed", String(active));
    $("game-sound").textContent = active ? "♪" : "♪̸";
  },

  levels() {
    const frag = document.createDocumentFragment();
    for (let n = 1; n <= game.shownLevels; n++) {
      const open = n <= game.save.unlockedLevel;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "level-card" + (open ? "" : " locked");
      card.disabled = !open;
      card.dataset.level = n;

      const title = document.createElement("strong");
      const detail = document.createElement("small");
      title.textContent = `${open ? "🍬" : "🔒"} Level ${n}`;
      const stars = Math.max(0, Math.min(3, Number(game.save.stars[n]) || 0));
      detail.textContent = open ? `${"★".repeat(stars)}${"☆".repeat(3 - stars)} · Skor ${(Number(game.save.highScores[n]) || 0).toLocaleString("id-ID")}` : "Level Terkunci";

      card.append(title, detail);
      frag.append(card);
    }
    $("level-grid").replaceChildren(frag);
  }
};

const UIManager = {
  show(state) {
    game.token++;
    game.state = state;
    game.busy = false;
    game.selected = null;

    ["menu", "level-select", "settings", "how-to-play", "playing"].forEach(id => $(id).hidden = true);
    ["pause-overlay", "won-overlay", "lost-overlay"].forEach(id => $(id).hidden = true);

    const screen = { MENU: "menu", LEVEL_SELECT: "level-select", SETTINGS: "settings", HOW_TO_PLAY: "how-to-play", PLAYING: "playing", PAUSED: "playing", WON: "playing", LOST: "playing" }[state];
    $(screen).hidden = false;

    if (state === "PAUSED") $("pause-overlay").hidden = false;
    if (state === "WON") $("won-overlay").hidden = false;
    if (state === "LOST") $("lost-overlay").hidden = false;
    if (state === "LEVEL_SELECT") Renderer.levels();
  },

  start(n) {
    game.level = n;
    game.config = LevelGenerator.getLevelConfig(n);
    game.board = new BoardEngine(game.config);
    game.moves = game.config.moves;
    game.score = 0;
    this.show("PLAYING");
    $("game-status").textContent = "Siap!";
    Renderer.hud();
    Renderer.board();
  },

  finish(win) {
    if (win) {
      const ratio = game.moves / game.config.moves;
      const stars = ratio >= 0.5 || game.score >= game.config.target * 1.6 ? 3 : ratio >= 0.2 || game.score >= game.config.target * 1.25 ? 2 : 1;
      game.save.unlockedLevel = Math.max(game.save.unlockedLevel, game.level + 1);
      game.save.highScores[game.level] = Math.max(Number(game.save.highScores[game.level]) || 0, game.score);
      game.save.stars[game.level] = Math.max(Number(game.save.stars[game.level]) || 0, stars);
      StorageManager.save(game.save);

      $("won-summary").textContent = `Skor ${game.score.toLocaleString("id-ID")} · ${game.moves} langkah tersisa`;
      $("won-stars").textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
      AudioManager.play("won");
      this.show("WON");
    } else {
      $("lost-summary").textContent = `Skor ${game.score.toLocaleString("id-ID")} dari target ${game.config.target.toLocaleString("id-ID")}`;
      AudioManager.play("lost");
      this.show("LOST");
    }
  }
};

const InputController = {
  pointerStart: null,
  suppressClick: false,

  choose(i) {
    if (game.state !== "PLAYING" || game.busy || game.board.cells[i] === -1) return;
    if (game.selected === null) { game.selected = i; Renderer.board(); return; }
    if (game.selected === i) { game.selected = null; Renderer.board(); return; }
    const from = game.selected;
    if (!game.board.adjacent(from, i)) { game.selected = i; Renderer.board(); return; }
    game.selected = null;
    this.attempt(from, i);
  },

  async attempt(a, b) {
    if (game.state !== "PLAYING" || game.busy) return;
    const board = game.board;
    if (!board.adjacent(a, b) || board.cells[a] === -1 || board.cells[b] === -1) return;

    game.busy = true;
    const token = game.token;
    board.swap(a, b);
    Renderer.board();
    AudioManager.play("swap");

    await delay(180);
    if (token !== game.token) return;

    let matches = board.findMatches();
    if (!matches.size) {
      board.swap(a, b);
      Renderer.board();
      [a, b].forEach(i => $("board").children[i]?.classList.add("invalid"));
      $("game-status").textContent = "Belum cocok. Coba lagi!";
      await delay(270);
      if (token === game.token) { Renderer.board(); game.busy = false; }
      return;
    }

    game.moves--;
    Renderer.hud();
    let chain = 0;

    while (matches.size && chain < 60) {
      if (token !== game.token) return;
      chain++;
      matches.forEach(i => $("board").children[i]?.classList.add("popping"));
      AudioManager.play(chain === 1 ? "match" : "cascade");

      await delay(220);
      if (token !== game.token) return;

      const broken = board.remove(matches);
      game.score += matches.size * 35 * chain + broken * 45;
      $("game-status").textContent = chain > 1 ? `Kombo ×${chain}!` : `${matches.size} permen cocok!`;
      Renderer.hud();
      Renderer.board();

      await delay(110);
      if (token !== game.token) return;

      board.gravity();
      Renderer.board();

      await delay(190);
      if (token !== game.token) return;

      matches = board.findMatches();
    }

    if (token !== game.token) return;
    if (!board.hasMove() && game.score < game.config.target && game.moves > 0) {
      board.generate();
      Renderer.board();
      $("game-status").textContent = "Papan baru siap!";
    }

    game.busy = false;
    if (game.score >= game.config.target) UIManager.finish(true);
    else if (game.moves <= 0) UIManager.finish(false);
  }
};

// Event Listeners
$("board").addEventListener("click", event => {
  if (InputController.suppressClick) { InputController.suppressClick = false; return; }
  const cell = event.target.closest("[data-cell]");
  if (cell) InputController.choose(Number(cell.dataset.cell));
});

$("board").addEventListener("pointerdown", event => {
  const cell = event.target.closest("[data-cell]");
  if (cell && game.state === "PLAYING") InputController.pointerStart = { index: Number(cell.dataset.cell), x: event.clientX, y: event.clientY };
});

window.addEventListener("pointerup", event => {
  const start = InputController.pointerStart;
  InputController.pointerStart = null;
  if (!start || game.state !== "PLAYING") return;
  const dx = event.clientX - start.x;
  const dy = event.clientY - start.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;

  InputController.suppressClick = true;
  setTimeout(() => InputController.suppressClick = false, 80);

  const row = Math.floor(start.index / 8);
  const col = start.index % 8;
  const nr = row + (Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0);
  const nc = col + (Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0);

  if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && game.state === "PLAYING" && !game.busy) {
    game.selected = null;
    InputController.attempt(start.index, nr * 8 + nc);
  }
});

document.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  AudioManager.unlock();
  const action = button.dataset.action;

  if (action === "main") UIManager.start(Math.min(game.save.unlockedLevel, Math.max(1, game.level)));
  if (action === "menu" || action === "quit") UIManager.show("MENU");
  if (action === "levels") UIManager.show("LEVEL_SELECT");
  if (action === "settings") { UIManager.show("SETTINGS"); $("settings-status").textContent = ""; $("reset-confirm").hidden = true; }
  if (action === "help") UIManager.show("HOW_TO_PLAY");
  if (action === "pause" && game.state === "PLAYING" && !game.busy) UIManager.show("PAUSED");
  if (action === "resume" && game.state === "PAUSED") { UIManager.show("PLAYING"); Renderer.board(); Renderer.hud(); }
  if (action === "restart" && game.board) UIManager.start(game.level);
  if (action === "next" && game.state === "WON") UIManager.start(game.level + 1);
  if (action === "sound" || action === "game-sound") {
    AudioManager.enabled = !AudioManager.enabled;
    game.save.settings.soundEnabled = AudioManager.enabled;
    StorageManager.save(game.save);
    Renderer.sound();
    if (AudioManager.enabled) AudioManager.play("swap");
  }
  if (action === "ask-reset") $("reset-confirm").hidden = false;
  if (action === "cancel-reset") $("reset-confirm").hidden = true;
  if (action === "confirm-reset") {
    game.save = StorageManager.reset();
    game.level = 1;
    AudioManager.enabled = true;
    Renderer.sound();
    $("reset-confirm").hidden = true;
    $("settings-status").textContent = "Progres berhasil direset.";
  }
  if (action === "more-levels") { game.shownLevels += 18; Renderer.levels(); }
});

$("level-grid").addEventListener("click", event => {
  const card = event.target.closest("[data-level]");
  if (card && !card.disabled) { AudioManager.unlock(); UIManager.start(Number(card.dataset.level)); }
});

// Inisialisasi awal tampilan suara
Renderer.sound();