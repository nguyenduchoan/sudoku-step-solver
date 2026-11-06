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
  check('đề dễ không cần bước "suy luận sâu"', steps.every(s => s.technique !== 'advanced'));
}

// Kiểm chứng lời văn của các bước 'advanced': chỉ được nói "buộc phải là"
// khi đúng là chỉ có một ứng viên dẫn tới nghiệm; ngược lại phải thừa nhận
// đây là lựa chọn giữa nhiều nghiệm.
function verifyAdvancedWording(puzzle, steps) {
  const sim = puzzle.slice();
  for (const st of steps) {
    if (st.technique === 'advanced') {
      const options = S.candidatesAt(sim, st.cell);
      const viable = options.filter(v => {
        const t = sim.slice();
        t[st.cell] = v;
        return S.countSolutions(t, 1) > 0;
      });
      const claimsForced = /buộc phải là/.test(st.detail);
      if (claimsForced !== (viable.length === 1)) return false;
      if (!claimsForced && !/nhiều hơn một nghiệm/.test(st.detail)) return false;
    }
    sim[st.cell] = st.value;
  }
  return true;
}

console.log('solveSteps: đề nhiều nghiệm (ví dụ của reviewer)');
{
  // Hai hàng đầu cho trước → đề có rất nhiều nghiệm
  const g = S.fromText('123456789456789123' + '.'.repeat(63));
  check('đề có nhiều nghiệm', S.countSolutions(g, 2) === 2);
  const { solvable, steps, solution } = S.solveSteps(g);
  check('vẫn giải trọn vẹn 63 ô', solvable && steps.length === 63);
  const sim = g.slice();
  for (const st of steps) sim[st.cell] = st.value;
  check('kết quả khớp nghiệm trả về', JSON.stringify(sim) === JSON.stringify(solution));
  check('có dùng bước advanced', steps.some(s => s.technique === 'advanced'));
  check('lời văn phân biệt ép buộc / lựa chọn đúng thực tế', verifyAdvancedWording(g, steps));
}

console.log('solveSteps: loại trừ được giữ lại và xâu chuỗi');
{
  // Đề khó (nghiệm duy nhất, ít số cho trước) — trước đây app nhảy ngay sang
  // "suy luận sâu" dù còn chuỗi loại trừ hợp lệ. Sau khi sửa, mọi bước
  // advanced trên đề nghiệm duy nhất phải thực sự "ép buộc" (chỉ 1 ứng viên
  // khả thi) — tức không còn dùng advanced như lối tắt sai.
  for (let t = 0; t < 2; t++) {
    const { puzzle } = S.generate(24);
    const { solvable, steps } = S.solveSteps(puzzle);
    check(`đề khó #${t + 1} giải trọn vẹn`, solvable && steps.length === puzzle.filter(v => !v).length);
    check(`đề khó #${t + 1} lời văn advanced đúng thực tế`, verifyAdvancedWording(puzzle, steps));
    const chained = steps.filter(s => / Nhờ đó: /.test(s.detail));
    for (const st of chained) {
      if (!/Khoanh vùng|Cặp số/.test(st.title)) {
        check(`đề khó #${t + 1} bước chuỗi có tiêu đề kỹ thuật`, false);
        break;
      }
    }
  }
}

console.log('solveSteps: lời văn Ô đơn / Vị trí duy nhất nêu đúng căn cứ loại trừ');
{
  // RNG có seed để tái lập: đề này có nhiều bước single dựa trên ứng viên
  // đã bị loại bởi Khoanh vùng / Cặp số ở bước trước.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const { puzzle } = S.generate(24, mulberry32(18));
  const { solvable, steps } = S.solveSteps(puzzle);
  check('đề seed 18 giải trọn vẹn', solvable && steps.length === puzzle.filter(v => !v).length);

  const sim = puzzle.slice();
  let nakedRefs = 0, hiddenRefs = 0, ok = true;
  for (const st of steps) {
    // Ô đơn (kể cả khi nằm cuối một chuỗi loại trừ): nếu có ứng viên không
    // nhìn thấy trong hàng/cột/khối thì phải dẫn lại căn cứ loại trừ,
    // và phải liệt kê đúng các số đó.
    // "nên ô này chỉ có thể là" là câu kết riêng của Ô đơn (cụm "chỉ có thể là"
    // không thôi còn xuất hiện trong lời văn Cặp số)
    if (/nên ô này chỉ có thể là/.test(st.detail)) {
      const byTech = S.candidatesAt(sim, st.cell).filter(x => x !== st.value);
      if (byTech.length) {
        nakedRefs++;
        if (!/đã bị loại ở bước trước/.test(st.detail)) { ok = false; break; }
        if (!byTech.every(x => new RegExp(`(^|[^0-9])${x}([^0-9]|$)`).test(st.detail))) { ok = false; break; }
      } else if (/đã bị loại ở bước trước[^.]*nên ô này chỉ có thể là/.test(st.detail)) {
        ok = false; break; // không được viện dẫn loại trừ khi không cần
      }
    }
    // Vị trí duy nhất: ô trống không "nhìn thấy" giá trị qua hàng/cột/khối
    // phải được nêu đích danh kèm căn cứ loại trừ.
    if (st.technique === 'hidden-single') {
      const u = st.highlights.unit[0];
      for (const j of S.UNITS[u]) {
        if (j === st.cell || sim[j]) continue;
        if (!S.PEERS[j].some(k => sim[k] === st.value)) {
          hiddenRefs++;
          if (!/đã bị loại ở bước trước/.test(st.detail) || !st.detail.includes(S.cellName(j))) {
            ok = false;
          }
        }
      }
      if (!ok) break;
    }
    sim[st.cell] = st.value;
  }
  check('có bước Ô đơn dựa trên loại trừ để kiểm chứng', nakedRefs >= 1);
  check('có bước Vị trí duy nhất dựa trên loại trừ để kiểm chứng', hiddenRefs >= 1);
  check('lời văn nêu đúng căn cứ loại trừ, không nói quá', ok);
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
