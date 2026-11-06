/*
 * Nhận dạng đề Sudoku từ ảnh:
 *  - Chia vùng khung vuông thành 9×9 ô, nhị phân hoá thích nghi từng ô.
 *  - Cắt khối mực (chữ số), chuẩn hoá về 16×16, so khớp mẫu (template matching).
 *  - Mẫu cơ bản vẽ bằng rasterizer thuần JS (chạy được trong Node cho tests);
 *    trong trình duyệt bổ sung mẫu render từ font hệ thống để chính xác hơn.
 *
 * API chính: SudokuVision.readGrid(imageData, rect) ->
 *   { grid: [81], confidence: [81 0..1], inkRatio: [81] }
 */
(function (global) {
  'use strict';

  const T = 16; // cạnh ảnh mẫu đã chuẩn hoá

  // ---------- Rasterizer thuần JS: vẽ nét dày trên lưới W×H ----------
  function blank(w, h) { return { w, h, px: new Float32Array(w * h) }; }

  function drawSegment(img, x1, y1, x2, y2, thick) {
    const steps = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      stamp(img, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, thick);
    }
  }
  function drawArc(img, cx, cy, rx, ry, a0, a1, thick) {
    const steps = Math.max(8, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry)));
    for (let s = 0; s <= steps; s++) {
      const a = a0 + (a1 - a0) * (s / steps);
      stamp(img, cx + rx * Math.cos(a), cy + ry * Math.sin(a), thick);
    }
  }
  function stamp(img, x, y, thick) {
    const r = thick / 2;
    const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(img.w - 1, Math.ceil(x + r));
    const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(img.h - 1, Math.ceil(y + r));
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        if ((xx - x) ** 2 + (yy - y) ** 2 <= r * r) img.px[yy * img.w + xx] = 1;
      }
    }
  }

  // Nét vẽ chữ số 1..9 trên hộp 100×140 (kiểu chữ in sans đơn giản).
  // Mỗi phần tử: ['L', x1,y1,x2,y2] hoặc ['A', cx,cy,rx,ry,a0,a1] (radian).
  const PI = Math.PI;
  const DIGIT_STROKES = {
    1: [['L', 30, 35, 55, 10], ['L', 55, 10, 55, 130], ['L', 30, 130, 80, 130]],
    2: [['A', 50, 38, 30, 28, PI, 2 * PI], ['L', 80, 38, 22, 130], ['L', 22, 130, 82, 130]],
    3: [['A', 48, 40, 30, 30, -0.9 * PI, 0.4 * PI], ['A', 48, 100, 32, 32, -0.4 * PI, 0.9 * PI]],
    4: [['L', 62, 10, 18, 92], ['L', 18, 92, 85, 92], ['L', 68, 60, 68, 130]],
    5: [['L', 78, 10, 28, 10], ['L', 28, 10, 24, 65], ['A', 50, 95, 30, 36, -0.52 * PI, 0.85 * PI]],
    6: [['A', 50, 95, 29, 34, 0, 2 * PI], ['A', 62, 45, 42, 70, 0.95 * PI, 1.35 * PI]],
    7: [['L', 20, 10, 82, 10], ['L', 82, 10, 42, 130]],
    8: [['A', 50, 40, 26, 29, 0, 2 * PI], ['A', 50, 102, 30, 31, 0, 2 * PI]],
    9: [['A', 50, 45, 29, 34, 0, 2 * PI], ['A', 38, 95, 42, 70, -0.35 * PI, 0.05 * PI]],
  };

  function strokeDigit(d, thick) {
    const img = blank(100, 140);
    for (const cmd of DIGIT_STROKES[d]) {
      if (cmd[0] === 'L') drawSegment(img, cmd[1], cmd[2], cmd[3], cmd[4], thick);
      else drawArc(img, cmd[1], cmd[2], cmd[3], cmd[4], cmd[5], cmd[6], thick);
    }
    return img;
  }

  // ---------- Chuẩn hoá: cắt hộp bao mực, giữ tỉ lệ, về T×T ----------
  function normalize(img) {
    let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
    for (let y = 0; y < img.h; y++) {
      for (let x = 0; x < img.w; x++) {
        if (img.px[y * img.w + x] > 0.5) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return null;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const out = new Float32Array(T * T);
    // Co giãn về T×T giữ tỉ lệ (căn giữa), lấy mẫu trung bình.
    const scale = Math.max(bw, bh) / T;
    const ox = x0 + (bw - T * scale) / 2, oy = y0 + (bh - T * scale) / 2;
    for (let ty = 0; ty < T; ty++) {
      for (let tx = 0; tx < T; tx++) {
        let sum = 0, n = 0;
        const sx0 = ox + tx * scale, sy0 = oy + ty * scale;
        const sx1 = sx0 + scale, sy1 = sy0 + scale;
        for (let sy = Math.floor(sy0); sy < sy1; sy++) {
          for (let sx = Math.floor(sx0); sx < sx1; sx++) {
            n++;
            if (sx >= 0 && sy >= 0 && sx < img.w && sy < img.h) sum += img.px[sy * img.w + sx];
          }
        }
        out[ty * T + tx] = n ? sum / n : 0;
      }
    }
    // Thống kê phụ giúp phân biệt (6↔9, 1↔7…)
    const aspect = bw / bh;
    return { v: out, aspect };
  }

  // Tương quan chuẩn hoá giữa hai vector T×T
  function ncc(a, b) {
    let ma = 0, mb = 0;
    for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; }
    ma /= a.length; mb /= b.length;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < a.length; i++) {
      const xa = a[i] - ma, xb = b[i] - mb;
      num += xa * xb; da += xa * xa; db += xb * xb;
    }
    return da && db ? num / Math.sqrt(da * db) : 0;
  }

  // ---------- Bộ mẫu ----------
  let TEMPLATES = null; // [{digit, v, aspect}]
  function buildTemplates() {
    if (TEMPLATES) return TEMPLATES;
    TEMPLATES = [];
    for (let d = 1; d <= 9; d++) {
      for (const thick of [10, 15, 21]) {
        const n = normalize(strokeDigit(d, thick));
        if (n) TEMPLATES.push({ digit: d, v: n.v, aspect: n.aspect });
      }
    }
    // Trong trình duyệt: thêm mẫu từ font thật (chính xác hơn với đề in)
    if (typeof document !== 'undefined') {
      const fonts = ['Arial', 'Helvetica', 'Georgia', '"Times New Roman"', 'Verdana', 'Courier New'];
      const weights = ['normal', 'bold'];
      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      for (const f of fonts) {
        for (const w of weights) {
          for (let d = 1; d <= 9; d++) {
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 64, 64);
            ctx.fillStyle = '#000';
            ctx.font = `${w} 48px ${f}`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(String(d), 32, 34);
            const data = ctx.getImageData(0, 0, 64, 64).data;
            const img = blank(64, 64);
            for (let i = 0; i < 64 * 64; i++) img.px[i] = data[i * 4] < 128 ? 1 : 0;
            const n = normalize(img);
            if (n) TEMPLATES.push({ digit: d, v: n.v, aspect: n.aspect });
          }
        }
      }
    }
    return TEMPLATES;
  }

  // Phân loại một ảnh mực nhị phân -> { digit, score, margin }
  function classify(img) {
    const n = normalize(img);
    if (!n) return null;
    const temps = buildTemplates();
    const best = { digit: 0, score: -2 };
    const bestPer = new Array(10).fill(-2);
    for (const t of temps) {
      let s = ncc(n.v, t.v);
      // Phạt lệch tỉ lệ khung (giúp 1 không bị nhầm với 7/4)
      s -= Math.min(0.25, Math.abs(Math.log((n.aspect + 0.05) / (t.aspect + 0.05))) * 0.18);
      if (s > bestPer[t.digit]) bestPer[t.digit] = s;
      if (s > best.score) { best.digit = t.digit; best.score = s; }
    }
    let second = -2;
    for (let d = 1; d <= 9; d++) if (d !== best.digit && bestPer[d] > second) second = bestPer[d];
    return { digit: best.digit, score: best.score, margin: best.score - second };
  }

  // ---------- Đọc lưới từ ImageData ----------
  // imageData: {data, width, height} (RGBA); rect: {x, y, size} khung vuông chứa đề.
  function readGrid(imageData, rect) {
    const { data, width } = imageData;
    const grid = new Array(81).fill(0);
    const confidence = new Array(81).fill(0);
    const inkRatio = new Array(81).fill(0);
    const cellSize = rect.size / 9;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        // Lấy phần lõi ô (bỏ 15% mép để né đường kẻ lưới)
        const pad = cellSize * 0.15;
        const x0 = Math.round(rect.x + c * cellSize + pad);
        const y0 = Math.round(rect.y + r * cellSize + pad);
        const side = Math.max(4, Math.round(cellSize - 2 * pad));

        // Độ sáng + ngưỡng thích nghi theo ô
        const gray = new Float32Array(side * side);
        let sum = 0, min = 255, max = 0;
        for (let y = 0; y < side; y++) {
          for (let x = 0; x < side; x++) {
            const p = ((y0 + y) * width + (x0 + x)) * 4;
            const g = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
            gray[y * side + x] = g;
            sum += g;
            if (g < min) min = g;
            if (g > max) max = g;
          }
        }
        const mean = sum / (side * side);
        // Ô gần như phẳng (không tương phản) -> trống
        if (max - min < 28) { inkRatio[r * 9 + c] = 0; continue; }
        const thr = Math.min(mean * 0.82, (min + max) / 2);

        const img = blank(side, side);
        let ink = 0;
        for (let i = 0; i < side * side; i++) {
          if (gray[i] < thr) { img.px[i] = 1; ink++; }
        }
        // Khử nhiễu dính mép: xoá các vệt chạm sát biên (thường là đường kẻ)
        eraseBorderBlobs(img);
        ink = 0;
        for (let i = 0; i < side * side; i++) ink += img.px[i];
        const ratio = ink / (side * side);
        inkRatio[r * 9 + c] = ratio;
        if (ratio < 0.02) continue; // trống

        const res = classify(img);
        if (res && res.score > 0.35) {
          grid[r * 9 + c] = res.digit;
          confidence[r * 9 + c] = Math.max(0, Math.min(1, res.margin * 3 + (res.score - 0.35)));
        }
      }
    }
    return { grid, confidence, inkRatio };
  }

  // Xoá các khối mực dính vào biên ô bằng loang (flood fill) từ 4 mép —
  // nhưng giữ lại nếu khối đó chiếm phần lớn mực (chữ số to chạm mép).
  function eraseBorderBlobs(img) {
    const { w, h, px } = img;
    const total = px.reduce((a, b) => a + b, 0);
    const seen = new Uint8Array(w * h);
    const queue = [];
    for (let x = 0; x < w; x++) { queue.push(x, (h - 1) * w + x); }
    for (let y = 0; y < h; y++) { queue.push(y * w, y * w + (w - 1)); }
    for (const start of queue) {
      if (seen[start] || px[start] < 0.5) continue;
      // BFS gom một khối
      const stack = [start]; const cells = [];
      seen[start] = 1;
      while (stack.length) {
        const i = stack.pop(); cells.push(i);
        const x = i % w, y = Math.floor(i / w);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (!seen[j] && px[j] > 0.5) { seen[j] = 1; stack.push(j); }
        }
      }
      // Khối nhỏ (<40% tổng mực) sát biên -> coi là đường kẻ, xoá
      if (cells.length < total * 0.4) for (const i of cells) px[i] = 0;
    }
  }

  const api = { readGrid, classify, strokeDigit, normalize, blank, buildTemplates, _ncc: ncc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.SudokuVision = api;
})(typeof window !== 'undefined' ? window : globalThis);
