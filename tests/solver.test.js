// node tests/solver.test.js — kiểm tra mô hình + bộ giải từng bước
'use strict';
const S = require('../js/sudoku.js');

let failures = 0;
function check(name, cond) {
  if (cond) console.log(`  ✓ ${name}`);
  else { console.error(`  ✗ ${name}`); failures++; }
}

console.log('conflicts & fromText');
{
  const g = S.fromText(`
    53..7....
    6..195...
    .98....6.
    8...6...3
    4..8.3..1
    7...2...6
    .6....28.
    ...419..5
    ....8..79`);
  check('đọc được đề chuẩn', g && g.filter(v => v).length === 30);
  check('đề hợp lệ không có xung đột', S.conflicts(g).length === 0);
  const bad = g.slice();
  bad[1] = 5; // trùng 5 trên hàng 1
  check('phát hiện trùng số', S.conflicts(bad).length >= 2);
}

console.log('solve & countSolutions');
{
  const g = S.fromText('53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79');
  check('đếm đúng 1 nghiệm', S.countSolutions(g, 2) === 1);
  const sol = S.solve(g);
  check('giải ra nghiệm', !!sol && !sol.includes(0));
  check('nghiệm không xung đột', S.conflicts(sol).length === 0);
  check('nghiệm giữ nguyên ô đề', g.every((v, i) => !v || sol[i] === v));
  const empty = new Array(81).fill(0);
  check('lưới trống có nhiều nghiệm', S.countSolutions(empty, 2) === 2);
  const impossible = g.slice();
  impossible[2] = 5; // hàng 1 đã có 5
  check('đề sai thì vô nghiệm', S.solve(impossible) === null);
}

console.log('solveSteps');
{
  const g = S.fromText('53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79');
  const { solvable, steps, solution } = S.solveSteps(g);
  check('giải được từng bước', solvable);
  check('đủ số bước (51 ô trống)', steps.length === 81 - 30);
  // Mô phỏng lại từng bước
  const sim = g.slice();
  let ok = true;
  for (const st of steps) {
    if (sim[st.cell] !== 0 || st.value !== solution[st.cell]) { ok = false; break; }
    sim[st.cell] = st.value;
    if (!st.title || !st.detail) { ok = false; break; }
  }
  check('các bước áp dụng tuần tự ra đúng nghiệm', ok && !sim.includes(0));
  const hasExplain = steps.every(s => /hàng|cột|khối|khả năng/.test(s.detail));
  check('mọi bước có giải thích tiếng Việt', hasExplain);
}

console.log('generate (sinh đề)');
{
  for (let t = 0; t < 3; t++) {
    const { puzzle, solution } = S.generate(32);
    check(`đề #${t + 1} nghiệm duy nhất`, S.countSolutions(puzzle, 2) === 1);
    check(`đề #${t + 1} khớp nghiệm gốc`, JSON.stringify(S.solve(puzzle)) === JSON.stringify(solution));
    const { solvable, steps } = S.solveSteps(puzzle);
    check(`đề #${t + 1} giải từng bước trọn vẹn`, solvable && steps.length === puzzle.filter(v => !v).length);
  }
}

console.log('toText/fromText vòng tròn');
{
  const { puzzle } = S.generate(40);
  check('round-trip', JSON.stringify(S.fromText(S.toText(puzzle))) === JSON.stringify(puzzle));
}

if (failures) { console.error(`\n${failures} kiểm tra THẤT BẠI`); process.exit(1); }
console.log('\nTất cả kiểm tra solver đạt ✔');
