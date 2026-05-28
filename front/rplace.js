import { Stomp } from '@stomp/stompjs';

/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║  r/place – Front-end rendering engine                    ║
 * ║                                                          ║
 * ║  Public API (call these from your networking code):      ║
 * ║                                                          ║
 * ║  RPlace.init(cols, rows)          – create empty grid    ║
 * ║  RPlace.loadGrid(uint8_2d)        – bulk-load grid      ║
 * ║  RPlace.setPixel(x, y, color)     – set one pixel       ║
 * ║  RPlace.getPixel(x, y)            – read one pixel      ║
 * ║  RPlace.getGrid()                 – get full grid copy   ║
 * ║  RPlace.onPixelPlace(callback)    – user placed a pixel ║
 * ║  RPlace.clearCallbacks()          – remove listeners     ║
 * ║  RPlace.setCooldown(ms)           – set cooldown timer   ║
 * ║  RPlace.startCooldown(ms?)        – start/restart timer  ║
 * ║  RPlace.getCooldownRemaining()    – ms left (0 = ready)  ║
 * ║  RPlace.isOnCooldown()            – boolean              ║
 * ║  RPlace.setSelectedColor(idx)     – select palette color ║
 * ║  RPlace.getSelectedColor()        – current color index  ║
 * ╚═══════════════════════════════════════════════════════════╝
 */



const RPlace = (() => {
  "use strict";

  /* ── r/place-style 32-color palette ────────────────────── */
  const PALETTE = [
    /* 0  empty / background */ "#1a1a2e",
    /* 1  dark red           */ "#6d001a",
    /* 2  red                */ "#be0039",
    /* 3  orange             */ "#ff4500",
    /* 4  yellow             */ "#ffa800",
    /* 5  pale yellow        */ "#ffd635",
    /* 6  dark green         */ "#00a368",
    /* 7  green              */ "#00cc78",
    /* 8  light green        */ "#7eed56",
    /* 9  dark teal          */ "#00756f",
    /* 10 teal               */ "#009eaa",
    /* 11 light teal         */ "#00ccc0",
    /* 12 dark blue          */ "#2450a4",
    /* 13 blue               */ "#3690ea",
    /* 14 light blue         */ "#51e9f4",
    /* 15 indigo             */ "#493ac1",
    /* 16 periwinkle         */ "#6a5cff",
    /* 17 lavender           */ "#94b3ff",
    /* 18 dark purple        */ "#811e9f",
    /* 19 purple             */ "#b44ac0",
    /* 20 pale purple        */ "#e4abff",
    /* 21 burgundy           */ "#de107f",
    /* 22 pink               */ "#ff3881",
    /* 23 light pink         */ "#ff99aa",
    /* 24 dark brown         */ "#6d482f",
    /* 25 brown              */ "#9c6926",
    /* 26 beige              */ "#ffb470",
    /* 27 black              */ "#000000",
    /* 28 dark gray          */ "#515252",
    /* 29 gray               */ "#898d90",
    /* 30 light gray         */ "#d4d7d9",
    /* 31 white              */ "#ffffff",
  ];

  /* ── Pre-compute palette as RGBA bytes for ImageData ──── */
  const PALETTE_RGBA = PALETTE.map((hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, 255];
  });

  /* ── State ─────────────────────────────────────────────── */
  let grid = null;          // Uint8Array[], row-major [y][x]
  let cols = 0;
  let rows = 0;

  // Camera
  let camX = 0;             // world-space offset (top-left)
  let camY = 0;
  let zoom = 1;
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 80;

  // Interaction
  let selectedColor = 1;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let camStartX = 0;
  let camStartY = 0;
  let hoverX = -1;
  let hoverY = -1;

  // Cooldown
  let cooldownMs = 10000;     // default 5s, override with setCooldown()
  let cooldownEndTime = 0;   // timestamp when cooldown expires
  let cooldownTimerId = null;

  // Callbacks
  const placeCallbacks = [];

  // DOM
  let canvas, ctx, cursorCanvas, cursorCtx;
  let viewW = 0, viewH = 0;
  let imageData = null;     // off-screen pixel buffer
  let offCanvas = null;     // cached 1:1 grid canvas
  let needsRender = true;
  let rafId = null;
  let booted = false;

  /* ════════════════════════════════════════════════════════
     INITIALISATION
     ════════════════════════════════════════════════════════ */

  function boot() {
    if (booted) return;
    booted = true;

    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    cursorCanvas = document.getElementById("cursor-canvas");
    cursorCtx = cursorCanvas.getContext("2d");

    _buildPaletteUI();
    _buildCooldownUI();
    _attachEvents();
    _resize();
    window.addEventListener("resize", _resize);

    // kick render loop
    rafId = requestAnimationFrame(_renderLoop);
  }

  /** Ensure boot has run before any API call. */
  function _ensureBooted() {
    if (!booted && document.readyState !== "loading") boot();
  }

  /* ════════════════════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════════════════════ */

  /**
   * Initialise an empty grid of the given size.
   * @param {number} w  – columns (width)
   * @param {number} h  – rows    (height)
   */
  function init(w, h) {
    _ensureBooted();
    cols = w;
    rows = h;
    grid = [];
    for (let y = 0; y < rows; y++) {
      grid[y] = new Uint8Array(cols);   // filled with 0
    }
    _rebuildImageData();
    _centerCamera();
    needsRender = true;
  }

  /**
   * Bulk-load a grid from a 2-D array of uint8 values.
   * grid2d[y][x] = colorIndex  (0 = empty, 1-31 = color)
   * Accepts plain arrays or typed arrays.
   * @param {Array<Array<number>>|Array<Uint8Array>} grid2d
   */
  function loadGrid(grid2d) {
    _ensureBooted();
    rows = grid2d.length;
    // Each row may be a plain array, a Uint8Array, or an object { pixels: [...] }
    const firstRow = grid2d[0];
    const extractRow = (row) =>
      row instanceof Uint8Array ? row
        : Array.isArray(row) ? row
          : (row && Array.isArray(row.pixels)) ? row.pixels
            : row;
    cols = extractRow(firstRow).length;
    grid = [];
    for (let y = 0; y < rows; y++) {
      const raw = extractRow(grid2d[y]);
      grid[y] = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
    }
    _rebuildImageData();
    _centerCamera();
    needsRender = true;
  }

  /**
   * Set a single pixel.
   * @param {number} x     – column
   * @param {number} y     – row
   * @param {number} color – palette index (0-31)
   */
  function setPixel(x, y, color) {
    if (!grid) return;
    x = x | 0; y = y | 0;                                   // coerce to int (NaN → 0)
    if (x < 0 || y < 0 || x >= cols || y >= rows) return;
    color = Math.max(0, Math.min(color, PALETTE.length - 1));
    grid[y][x] = color;
    _putPixelToImage(x, y, color);
    needsRender = true;
  }

  /**
   * Read a single pixel.
   * @returns {number} palette index
   */
  function getPixel(x, y) {
    x = x | 0; y = y | 0;
    if (!grid || x < 0 || y < 0 || x >= cols || y >= rows) return 0;
    return grid[y][x];
  }

  /**
   * Return a deep copy of the current grid.
   * @returns {Uint8Array[]}
   */
  function getGrid() {
    if (!grid) return [];
    return grid.map((row) => new Uint8Array(row));
  }

  /**
   * Register a callback invoked when the LOCAL user places a pixel.
   * Signature: callback(x, y, colorIndex)
   * This is where you send the pixel to your server.
   */
  function onPixelPlace(cb) {
    if (typeof cb === "function") placeCallbacks.push(cb);
  }

  /** Remove all onPixelPlace listeners. */
  function clearCallbacks() {
    placeCallbacks.length = 0;
  }

  /** Set the cooldown between pixel placements (ms). 0 = no cooldown. */
  function setCooldown(ms) {
    cooldownMs = Math.max(0, ms);
  }

  /**
   * Start (or restart) the cooldown timer.
   * Call this after the server confirms a pixel placement,
   * or when the server tells you to wait.
   *
   * @param {number} [ms]  – override duration (uses setCooldown value if omitted)
   *
   * Usage from your networking code:
   *   // After server confirms pixel:
   *   RPlace.startCooldown();
   *
   *   // If server says "wait 10s":
   *   RPlace.startCooldown(10000);
   *
   *   // If server sends the exact timestamp when you can place again:
   *   const remaining = serverUnlockTimestamp - Date.now();
   *   RPlace.startCooldown(remaining);
   */
  function startCooldown(ms) {
    const duration = (ms != null && ms > 0) ? ms : cooldownMs;
    if (duration <= 0) return;
    cooldownEndTime = Date.now() + duration;
    _startCooldownTick();
  }

  /**
   * Get milliseconds remaining on the cooldown. Returns 0 when ready.
   * Useful for syncing with backend or displaying custom UI.
   */
  function getCooldownRemaining() {
    const remaining = cooldownEndTime - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /** Check if the user is currently on cooldown. */
  function isOnCooldown() {
    return Date.now() < cooldownEndTime;
  }

  /** Programmatically select a palette color (1-31). */
  function setSelectedColor(idx) {
    if (idx < 1 || idx >= PALETTE.length) return;
    selectedColor = idx;
    _highlightSwatch(idx);
  }

  /** Get currently selected palette color index. */
  function getSelectedColor() {
    return selectedColor;
  }

  /* ════════════════════════════════════════════════════════
     IMAGE DATA HELPERS
     ════════════════════════════════════════════════════════ */

  /** Rebuild the full ImageData buffer from the current grid. */
  function _rebuildImageData() {
    if (!grid) return;
    imageData = new ImageData(cols, rows);
    const d = imageData.data;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = (y * cols + x) * 4;
        const c = PALETTE_RGBA[grid[y][x]] || PALETTE_RGBA[0];
        d[idx] = c[0];
        d[idx + 1] = c[1];
        d[idx + 2] = c[2];
        d[idx + 3] = c[3];
      }
    }
  }

  /** Write a single pixel into the ImageData buffer. */
  function _putPixelToImage(x, y, color) {
    if (!imageData) return;
    const idx = (y * cols + x) * 4;
    const c = PALETTE_RGBA[color] || PALETTE_RGBA[0];
    imageData.data[idx] = c[0];
    imageData.data[idx + 1] = c[1];
    imageData.data[idx + 2] = c[2];
    imageData.data[idx + 3] = c[3];
  }

  /* ════════════════════════════════════════════════════════
     CAMERA
     ════════════════════════════════════════════════════════ */

  function _centerCamera() {
    const w = viewW || window.innerWidth;
    const h = viewH || window.innerHeight;
    camX = (cols / 2) - (w / 2) / zoom;
    camY = (rows / 2) - (h / 2) / zoom;
    needsRender = true;
  }

  /** Convert screen coords → grid coords (fractional). */
  function _screenToWorld(sx, sy) {
    return {
      wx: camX + sx / zoom,
      wy: camY + sy / zoom,
    };
  }

  /** Convert screen coords → grid cell (always returns integers). */
  function _screenToCell(sx, sy) {
    const { wx, wy } = _screenToWorld(sx, sy);
    return { cx: Math.floor(wx) | 0, cy: Math.floor(wy) | 0 };
  }

  /* ════════════════════════════════════════════════════════
     RENDER LOOP
     ════════════════════════════════════════════════════════ */

  function _renderLoop() {
    if (needsRender) {
      _draw();
      needsRender = false;
    }
    _drawCursor();
    rafId = requestAnimationFrame(_renderLoop);
  }

  function _draw() {
    if (!imageData) {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, viewW, viewH);
      return;
    }

    // Reuse a cached offscreen canvas for the 1:1 pixel grid
    if (!offCanvas || offCanvas.width !== cols || offCanvas.height !== rows) {
      offCanvas = document.createElement("canvas");
      offCanvas.width = cols;
      offCanvas.height = rows;
    }
    offCanvas.getContext("2d").putImageData(imageData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#111122";
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);
    ctx.drawImage(offCanvas, 0, 0);

    // Grid lines when zoomed in enough
    if (zoom >= 6) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      const x0 = Math.max(0, Math.floor(camX));
      const y0 = Math.max(0, Math.floor(camY));
      const x1 = Math.min(cols, Math.ceil(camX + viewW / zoom));
      const y1 = Math.min(rows, Math.ceil(camY + viewH / zoom));
      for (let x = x0; x <= x1; x++) {
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
      }
      for (let y = y0; y <= y1; y++) {
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  function _drawCursor() {
    cursorCtx.clearRect(0, 0, viewW + 1, viewH + 1);
    if (!grid || hoverX < 0 || hoverY < 0 || hoverX >= cols || hoverY >= rows) return;
    if (!Number.isFinite(camX) || !Number.isFinite(camY)) return;

    // Cell bounds in screen space
    const sx = (hoverX - camX) * zoom;
    const sy = (hoverY - camY) * zoom;
    const size = zoom;

    // Fill preview of selected color
    cursorCtx.globalAlpha = 0.5;
    cursorCtx.fillStyle = PALETTE[selectedColor];
    cursorCtx.fillRect(sx, sy, size, size);

    // White outline
    cursorCtx.globalAlpha = 1;
    cursorCtx.strokeStyle = "#ffffff";
    cursorCtx.lineWidth = Math.max(1.5, zoom >= 4 ? 2.5 : 1.5);
    cursorCtx.strokeRect(sx + 0.5, sy + 0.5, size - 1, size - 1);
  }

  /* ════════════════════════════════════════════════════════
     RESIZE
     ════════════════════════════════════════════════════════ */

  function _resize() {
    const vp = document.getElementById("viewport");
    viewW = vp.clientWidth;
    viewH = vp.clientHeight;

    // Set actual pixel resolution
    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewW * dpr;
    canvas.height = viewH * dpr;
    canvas.style.width = viewW + "px";
    canvas.style.height = viewH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cursorCanvas.width = viewW * dpr;
    cursorCanvas.height = viewH * dpr;
    cursorCanvas.style.width = viewW + "px";
    cursorCanvas.style.height = viewH + "px";
    cursorCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    needsRender = true;
  }

  /* ════════════════════════════════════════════════════════
     EVENT HANDLERS
     ════════════════════════════════════════════════════════ */

  function _attachEvents() {
    const vp = document.getElementById("viewport");

    /* ── Zoom (wheel) ─────────────────────────────────── */
    vp.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // World pos under cursor before zoom
      const wx = camX + mx / zoom;
      const wy = camY + my / zoom;

      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor));

      // Adjust cam so world pos stays under cursor
      camX = wx - mx / zoom;
      camY = wy - my / zoom;

      _updateZoomBadge();
      needsRender = true;
    }, { passive: false });

    /* ── Pan (middle / right click drag, or any button + Space) ── */
    let spaceHeld = false;

    document.addEventListener("keydown", (e) => {
      if (e.code === "Space") { spaceHeld = true; vp.style.cursor = "grab"; }
    });
    document.addEventListener("keyup", (e) => {
      if (e.code === "Space") { spaceHeld = false; vp.style.cursor = "crosshair"; }
    });

    vp.addEventListener("mousedown", (e) => {
      // Pan with middle-click, right-click, or space+left-click
      if (e.button === 1 || e.button === 2 || (e.button === 0 && spaceHeld)) {
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        camStartX = camX;
        camStartY = camY;
        vp.style.cursor = "grabbing";
        e.preventDefault();
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (isPanning) {
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        camX = camStartX - dx / zoom;
        camY = camStartY - dy / zoom;
        needsRender = true;
      }

      // Update hover cell
      const rect = vp.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { cx, cy } = _screenToCell(mx, my);
      if (cx !== hoverX || cy !== hoverY) {
        hoverX = cx;
        hoverY = cy;
        _updateCoords(cx, cy);
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (isPanning) {
        isPanning = false;
        vp.style.cursor = spaceHeld ? "grab" : "crosshair";
      }
    });

    /* ── Place pixel (left click) ─────────────────────── */
    let didPan = false;
    let mouseDownPos = null;

    const origMouseDown = vp.onmousedown;
    vp.addEventListener("mousedown", (e) => {
      if (e.button === 0 && !spaceHeld) {
        mouseDownPos = { x: e.clientX, y: e.clientY };
        didPan = false;
      }
    });

    vp.addEventListener("mouseup", (e) => {
      if (e.button !== 0 || spaceHeld || !grid || !mouseDownPos) {
        mouseDownPos = null;
        return;
      }

      // Only count as a click if the mouse didn't move much (not a drag)
      const dx = e.clientX - mouseDownPos.x;
      const dy = e.clientY - mouseDownPos.y;
      mouseDownPos = null;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) return;

      const rect = vp.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { cx, cy } = _screenToCell(mx, my);

      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;

      // Cooldown check — block placement if timer is active
      if (isOnCooldown()) return;

      setPixel(cx, cy, selectedColor);

      // Start the cooldown timer immediately (optimistic).
      // If your backend controls the cooldown, remove this line
      // and call RPlace.startCooldown() from your server response instead.
      if (cooldownMs > 0) startCooldown();

      // Notify listeners
      for (const cb of placeCallbacks) {
        try { cb(cx, cy, selectedColor); } catch (_) { }
      }
    });

    /* Prevent context menu on right-click (we use it for panning) */
    vp.addEventListener("contextmenu", (e) => e.preventDefault());

    /* ── Touch: pinch-zoom & pan ──────────────────────── */
    let touches = [];
    let lastPinchDist = 0;

    vp.addEventListener("touchstart", (e) => {
      touches = [...e.touches];
      if (touches.length === 2) {
        lastPinchDist = _touchDist(touches[0], touches[1]);
      } else if (touches.length === 1) {
        isPanning = true;
        panStartX = touches[0].clientX;
        panStartY = touches[0].clientY;
        camStartX = camX;
        camStartY = camY;
      }
      e.preventDefault();
    }, { passive: false });

    vp.addEventListener("touchmove", (e) => {
      touches = [...e.touches];
      if (touches.length === 2) {
        const dist = _touchDist(touches[0], touches[1]);
        const factor = dist / lastPinchDist;
        const cx = (touches[0].clientX + touches[1].clientX) / 2;
        const cy = (touches[0].clientY + touches[1].clientY) / 2;
        const rect = vp.getBoundingClientRect();
        const mx = cx - rect.left;
        const my = cy - rect.top;
        const wx = camX + mx / zoom;
        const wy = camY + my / zoom;
        zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor));
        camX = wx - mx / zoom;
        camY = wy - my / zoom;
        lastPinchDist = dist;
        _updateZoomBadge();
        needsRender = true;
      } else if (touches.length === 1 && isPanning) {
        const dx = touches[0].clientX - panStartX;
        const dy = touches[0].clientY - panStartY;
        camX = camStartX - dx / zoom;
        camY = camStartY - dy / zoom;
        needsRender = true;
      }
      e.preventDefault();
    }, { passive: false });

    vp.addEventListener("touchend", (e) => {
      // Single tap → place pixel
      if (e.changedTouches.length === 1 && touches.length <= 1) {
        const t = e.changedTouches[0];
        const rect = vp.getBoundingClientRect();
        const mx = t.clientX - rect.left;
        const my = t.clientY - rect.top;
        const { cx, cy } = _screenToCell(mx, my);
        if (cx >= 0 && cy >= 0 && cx < cols && cy < rows && grid) {
          if (!isOnCooldown()) {
            setPixel(cx, cy, selectedColor);
            if (cooldownMs > 0) startCooldown();
            for (const cb of placeCallbacks) {
              try { cb(cx, cy, selectedColor); } catch (_) { }
            }
          }
        }
      }
      isPanning = false;
      touches = [...e.touches];
    });
  }

  function _touchDist(a, b) {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  /* ════════════════════════════════════════════════════════
     PALETTE UI
     ════════════════════════════════════════════════════════ */

  function _buildPaletteUI() {
    const container = document.getElementById("palette");
    // Skip index 0 (background). Users pick from 1-31.
    for (let i = 1; i < PALETTE.length; i++) {
      const el = document.createElement("button");
      el.className = "palette-swatch";
      el.style.background = PALETTE[i];
      el.setAttribute("aria-label", `Color ${i}`);
      el.dataset.idx = i;
      if (i === selectedColor) el.classList.add("selected");
      el.addEventListener("click", () => {
        selectedColor = i;
        _highlightSwatch(i);
      });
      container.appendChild(el);
    }
  }

  function _highlightSwatch(idx) {
    document.querySelectorAll(".palette-swatch").forEach((el) => {
      el.classList.toggle("selected", +el.dataset.idx === idx);
    });
  }

  /* ════════════════════════════════════════════════════════
     COOLDOWN TIMER UI
     ════════════════════════════════════════════════════════ */

  function _buildCooldownUI() {
    const bar = document.getElementById("palette-bar");

    // Container for the cooldown overlay
    const overlay = document.createElement("div");
    overlay.id = "cooldown-overlay";
    overlay.innerHTML = `
      <div class="cooldown-content">
        <div class="cooldown-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <span class="cooldown-text" id="cooldown-text">0:00</span>
        <div class="cooldown-progress-track">
          <div class="cooldown-progress-fill" id="cooldown-progress"></div>
        </div>
      </div>
    `;
    bar.appendChild(overlay);
  }

  /** Start the visual countdown tick. */
  function _startCooldownTick() {
    if (cooldownTimerId) clearInterval(cooldownTimerId);

    const overlay = document.getElementById("cooldown-overlay");
    const textEl = document.getElementById("cooldown-text");
    const fillEl = document.getElementById("cooldown-progress");
    if (!overlay) return;

    const totalDuration = cooldownEndTime - Date.now();
    overlay.classList.add("active");
    document.getElementById("palette").classList.add("cooldown-active");

    const tick = () => {
      const remaining = cooldownEndTime - Date.now();
      if (remaining <= 0) {
        // Cooldown finished
        clearInterval(cooldownTimerId);
        cooldownTimerId = null;
        overlay.classList.remove("active");
        overlay.classList.add("ready-flash");
        document.getElementById("palette").classList.remove("cooldown-active");
        textEl.textContent = "Ready!";
        fillEl.style.width = "100%";
        setTimeout(() => overlay.classList.remove("ready-flash"), 600);
        return;
      }

      const secs = Math.ceil(remaining / 1000);
      const mins = Math.floor(secs / 60);
      const s = secs % 60;
      textEl.textContent = mins > 0
        ? `${mins}:${String(s).padStart(2, "0")}`
        : `0:${String(s).padStart(2, "0")}`;

      const progress = 1 - (remaining / totalDuration);
      fillEl.style.width = `${(progress * 100).toFixed(1)}%`;
    };

    tick(); // immediate first tick
    cooldownTimerId = setInterval(tick, 50); // smooth updates
  }

  /* ════════════════════════════════════════════════════════
     HUD UPDATES
     ════════════════════════════════════════════════════════ */

  function _updateCoords(x, y) {
    const el = document.getElementById("coords");
    if (x >= 0 && y >= 0 && x < cols && y < rows) {
      el.textContent = `( ${x} , ${y} )`;
    } else {
      el.textContent = "( — , — )";
    }
  }

  function _updateZoomBadge() {
    document.getElementById("zoom-badge").textContent =
      zoom >= 10 ? `${Math.round(zoom)}×` : `${zoom.toFixed(1)}×`;
  }

  /* ════════════════════════════════════════════════════════
     BOOT
     ════════════════════════════════════════════════════════ */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  /* ── Expose public API ─────────────────────────────── */
  return {
    init,
    loadGrid,
    setPixel,
    getPixel,
    getGrid,
    onPixelPlace,
    clearCallbacks,
    setCooldown,
    startCooldown,
    getCooldownRemaining,
    isOnCooldown,
    setSelectedColor,
    getSelectedColor,
    PALETTE,        // expose palette for reference
  };
})();

(() => {

  const SERVER_URL = 'http://localhost:8080/canvas'

  const socket = new SockJS(SERVER_URL);
  const stompClient = Stomp.over(socket);

  console.log("Conectando na url: " + SERVER_URL)
  stompClient.connect({}, (frame) => {

    // Recebe o canvas inicial 
    stompClient.subscribe('/app/init', (message) => {
      console.log("Pegando Canvas");

      try {
        const canvasData = JSON.parse(message.body);

        RPlace.loadGrid(canvasData.grid);

      } catch (error) {
        console.error("Falha ao carregar canvas:", error);
      }
    });

    // Receber pixeis colocados pelos outros usuários 
    stompClient.subscribe('/topic/update', (message) => {
      console.log("Pixel recebido")
      const { x, y, color } = JSON.parse(message.body)

      RPlace.setPixel(x, y, color)
    });

  });

  RPlace.onPixelPlace((x, y, color) => {
    stompClient.send("/app/placePixel", {}, JSON.stringify({ x, y, color }))
  })
})()
