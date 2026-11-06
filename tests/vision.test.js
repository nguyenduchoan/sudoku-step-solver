// node tests/vision.test.js — kiểm tra nhận dạng chữ số từ ảnh mô phỏng
'use strict';
const V = require('../js/vision.js');
const S = require('../js/sudoku.js');

let failures = 0;
function check(name, cond) {
  if (cond) console.log(`  ✓ ${name}`);
  else { console.error(`  ✗ ${name}`); failures++; }
}

console.log('classify: nhận đúng chữ số vẽ bằng nét chuẩn');
{
  let ok = 0;
  for (let d = 1; d <= 9; d++) {
    const img = V.strokeDigit(d, 13); // độ dày nằm giữa các mẫu
    const res = V.classify(img);
    if (res && res.digit === d) ok++;
    else console.error(`    nhầm ${d} thành ${res && res.digit}`);
  }
  check('9/9 chữ số', ok === 9);
}

// Vẽ một đề sudoku lên "ảnh" RGBA mô phỏng (nền xám sáng, mực tối, lưới kẻ)
function renderPuzzle(grid, cell = 40, noise = 0, bg = 225, inkLevel = 30) {
  const size = cell * 9;
  const data = new Uint8ClampedArray(size * size * 4);
  const put = (x, y, v) => {
    const p = (y * size + x) * 4;
    data[p] = data[p + 1] = data[p + 2] = v; data[p + 3] = 255;
  };
  const rnd = mulberry32(42);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = bg + (rnd() - 0.5) * noise;
      if (x % cell === 0 || y % cell === 0 || x === size - 1 || y === size - 1) v = inkLevel + 40;
      if (x % (cell * 3) === 0 || y % (cell * 3) === 0) v = inkLevel;
      put(x, y, Math.max(0, Math.min(255, v)));
    }
  }
  // Vẽ chữ số bằng strokeDigit thu nhỏ vào từng ô
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const d = grid[r * 9 + c];
      if (!d) continue;
      const img = V.strokeDigit(d, 14); // 100×140
      const target = cell * 0.62;
      const scale = target / 140;
      const ox = c * cell + (cell - 100 * scale) / 2;
      const oy = r * cell + (cell - 140 * scale) / 2;
      for (let y = 0; y < 140; y++) {
        for (let x = 0; x < 100; x++) {
          if (img.px[y * 100 + x] < 0.5) continue;
          const px = Math.round(ox + x * scale), py = Math.round(oy + y * scale);
          if (px >= 0 && py >= 0 && px < size && py < size) put(px, py, inkLevel);
        }
      }
    }
  }
  return { data, width: size, height: size };
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

console.log('readGrid: đọc đề từ ảnh mô phỏng sạch');
{
  const puzzle = S.fromText('53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79');
  const img = renderPuzzle(puzzle, 40, 0);
  const { grid } = V.readGrid(img, { x: 0, y: 0, size: 360 });
  let wrong = 0, missed = 0, ghost = 0;
  for (let i = 0; i < 81; i++) {
    if (puzzle[i] && !grid[i]) missed++;
    else if (puzzle[i] && grid[i] !== puzzle[i]) wrong++;
    else if (!puzzle[i] && grid[i]) ghost++;
  }
  console.log(`    sai: ${wrong}, sót: ${missed}, thừa: ${ghost}`);
  check('không đọc thừa số vào ô trống', ghost === 0);
  check('đọc đúng ≥ 28/30 ô (ảnh sạch)', wrong + missed <= 2);
}

console.log('readGrid: ảnh có nhiễu + ô nhỏ');
{
  const puzzle = S.fromText('53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79');
  const img = renderPuzzle(puzzle, 32, 24, 210, 45);
  const { grid } = V.readGrid(img, { x: 0, y: 0, size: 288 });
  let correct = 0, ghost = 0;
  for (let i = 0; i < 81; i++) {
    if (puzzle[i] && grid[i] === puzzle[i]) correct++;
    if (!puzzle[i] && grid[i]) ghost++;
  }
  console.log(`    đúng ${correct}/30, thừa: ${ghost}`);
  check('đọc đúng ≥ 26/30 ô (có nhiễu)', correct >= 26);
  check('thừa ≤ 1 ô', ghost <= 1);
}

if (failures) { console.error(`\n${failures} kiểm tra THẤT BẠI`); process.exit(1); }
console.log('\nTất cả kiểm tra vision đạt ✔');
