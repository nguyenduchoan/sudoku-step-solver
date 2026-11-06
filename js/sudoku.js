/*
 * Mô hình Sudoku 9×9: kiểm tra hợp lệ, đếm nghiệm (backtracking),
 * và bộ giải "kiểu người" sinh từng bước có giải thích tiếng Việt.
 *
 * Lưới là mảng 81 số (0 = ô trống), chỉ số = hàng*9 + cột.
 * Chạy được cả trong trình duyệt lẫn Node (dùng cho tests/).
 */
(function (global) {
  'use strict';

  const N = 9;

  // ---------- Tiện ích chỉ số ----------
  function rc(i) { return [Math.floor(i / 9), i % 9]; }
  function idx(r, c) { return r * 9 + c; }
  function boxOf(r, c) { return Math.floor(r / 3) * 3 + Math.floor(c / 3); }

  // 27 "đơn vị": 9 hàng, 9 cột, 9 khối 3×3 (mỗi đơn vị là mảng 9 chỉ số)
  const UNITS = [];
  for (let r = 0; r < 9; r++) UNITS.push(Array.from({ length: 9 }, (_, c) => idx(r, c)));
  for (let c = 0; c < 9; c++) UNITS.push(Array.from({ length: 9 }, (_, r) => idx(r, c)));
  for (let b = 0; b < 9; b++) {
    const r0 = Math.floor(b / 3) * 3, c0 = (b % 3) * 3;
    const u = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) u.push(idx(r0 + r, c0 + c));
    UNITS.push(u);
  }
  // PEERS[i] = các ô cùng hàng/cột/khối với i (không gồm i)
  const PEERS = Array.from({ length: 81 }, (_, i) => {
    const s = new Set();
    for (const u of UNITS) if (u.includes(i)) for (const j of u) if (j !== i) s.add(j);
    return [...s];
  });

  function unitName(u) {
    // u: chỉ số đơn vị 0..26
    if (u < 9) return `hàng ${u + 1}`;
    if (u < 18) return `cột ${u - 9 + 1}`;
    return `khối ${u - 18 + 1}`;
  }
  function cellName(i) {
    const [r, c] = rc(i);
    return `ô (hàng ${r + 1}, cột ${c + 1})`;
  }

  // ---------- Hợp lệ ----------
  // Trả về danh sách chỉ số ô bị trùng số với ô khác cùng đơn vị.
  function conflicts(grid) {
    const bad = new Set();
    for (const u of UNITS) {
      const seen = new Map(); // số -> chỉ số ô đầu tiên
      for (const i of u) {
        const v = grid[i];
        if (!v) continue;
        if (seen.has(v)) { bad.add(i); bad.add(seen.get(v)); }
        else seen.set(v, i);
      }
    }
    return [...bad];
  }

  function candidatesAt(grid, i) {
    if (grid[i]) return [];
    const used = new Set();
    for (const j of PEERS[i]) if (grid[j]) used.add(grid[j]);
    const out = [];
    for (let v = 1; v <= 9; v++) if (!used.has(v)) out.push(v);
    return out;
  }

  // Bảng ứng viên cho cả lưới: mảng 81 Set (ô đã điền -> null)
  function allCandidates(grid) {
    return grid.map((v, i) => (v ? null : new Set(candidatesAt(grid, i))));
  }

  // ---------- Đếm nghiệm (backtracking, tối đa `limit`) ----------
  function countSolutions(grid, limit = 2) {
    const g = grid.slice();
    if (conflicts(g).length) return 0;
    let count = 0;
    function step() {
      // chọn ô trống có ít ứng viên nhất (MRV)
      let best = -1, bestCands = null;
      for (let i = 0; i < 81; i++) {
        if (g[i]) continue;
        const cands = candidatesAt(g, i);
        if (cands.length === 0) return;
        if (!bestCands || cands.length < bestCands.length) { best = i; bestCands = cands; }
        if (bestCands.length === 1) break;
      }
      if (best === -1) { count++; return; }
      for (const v of bestCands) {
        g[best] = v;
        step();
        g[best] = 0;
        if (count >= limit) return;
      }
    }
    step();
    return count;
  }

  // Giải nhanh ra một nghiệm (hoặc null nếu vô nghiệm)
  function solve(grid) {
    const g = grid.slice();
    if (conflicts(g).length) return null;
    function step() {
      let best = -1, bestCands = null;
      for (let i = 0; i < 81; i++) {
        if (g[i]) continue;
        const cands = candidatesAt(g, i);
        if (cands.length === 0) return false;
        if (!bestCands || cands.length < bestCands.length) { best = i; bestCands = cands; }
        if (bestCands.length === 1) break;
      }
      if (best === -1) return true;
      for (const v of bestCands) {
        g[best] = v;
        if (step()) return true;
        g[best] = 0;
      }
      return false;
    }
    return step() ? g : null;
  }

  // ---------- Bộ giải "kiểu người": sinh từng bước ----------
  // Mỗi bước: { cell, value, technique, title, detail, highlights }
  //   highlights: { cells: [chỉ số làm nổi bật], unit: [chỉ số đơn vị] }

  // notes (tuỳ chọn): mảng 81 Map(giá trị -> lý do) ghi lại các ứng viên đã bị
  // loại bởi phép loại trừ ở bước trước, để lời giải thích nêu đúng căn cứ
  // thay vì nói mọi số đều "đã xuất hiện trong hàng/cột/khối".
  function elimReason(notes, cell, value) {
    return (notes && notes[cell].get(value)) || 'phép loại trừ trước đó';
  }

  function findNakedSingle(grid, cands, notes) {
    for (let i = 0; i < 81; i++) {
      if (grid[i] || cands[i].size !== 1) continue;
      const v = [...cands[i]][0];
      const [r, c] = rc(i);
      // Những số không nhìn thấy trong hàng/cột/khối nhưng đã bị loại
      // bởi phép loại trừ ở bước trước
      const byTech = candidatesAt(grid, i).filter(x => x !== v);
      let detail;
      if (byTech.length) {
        const reasons = [...new Set(byTech.map(x => elimReason(notes, i, x)))];
        detail = `Xét ${cellName(i)}: ${byTech.join(' và ')} đã bị loại ở bước trước (${reasons.join('; ')}), các số còn lại đều đã xuất hiện trong hàng ${r + 1}, cột ${c + 1} hoặc khối ${boxOf(r, c) + 1}, nên ô này chỉ có thể là ${v}.`;
      } else {
        detail = `Xét ${cellName(i)}: các số khác đều đã xuất hiện trong hàng ${r + 1}, cột ${c + 1} hoặc khối ${boxOf(r, c) + 1}, nên ô này chỉ có thể là ${v}.`;
      }
      return {
        cell: i, value: v, technique: 'naked-single',
        title: `Ô chỉ còn một khả năng: điền ${v}`,
        detail,
        highlights: { cells: PEERS[i].filter(j => grid[j]), unit: [] },
      };
    }
    return null;
  }

  function findHiddenSingle(grid, cands, notes) {
    for (let u = 0; u < UNITS.length; u++) {
      const unit = UNITS[u];
      for (let v = 1; v <= 9; v++) {
        let spot = -1, count = 0;
        for (const i of unit) {
          if (grid[i] === v) { count = -1; break; } // v đã có trong đơn vị
          if (!grid[i] && cands[i].has(v)) { spot = i; count++; if (count > 1) break; }
        }
        if (count === 1) {
          // Ô trống không "nhìn thấy" v qua hàng/cột/khối — chỉ bị chặn
          // nhờ phép loại trừ ở bước trước
          const blocked = unit.filter(j =>
            j !== spot && !grid[j] && !PEERS[j].some(k => grid[k] === v));
          const techPart = blocked.length
            ? `; riêng ${blocked.map(cellName).join(' và ')} thì ${v} đã bị loại ở bước trước (${[...new Set(blocked.map(j => elimReason(notes, j, v)))].join('; ')})`
            : '';
          return {
            cell: spot, value: v, technique: 'hidden-single',
            title: `Chỉ một chỗ đặt được số ${v} trong ${unitName(u)}`,
            detail: `Trong ${unitName(u)}, mọi ô trống khác đều không thể chứa ${v} (vì ${v} đã có ở hàng/cột/khối giao với chúng${techPart}). Vậy ${cellName(spot)} phải là ${v}.`,
            highlights: { cells: unit.filter(i => i !== spot), unit: [u] },
          };
        }
      }
    }
    return null;
  }

  // Kỹ thuật thu hẹp ứng viên (không điền số, chỉ loại trừ): trả về
  // { technique, title, detail, eliminations: [{cell, value}], highlights } hoặc null
  function findLockedCandidates(grid, cands) {
    // Pointing: trong 1 khối, nếu số v chỉ nằm trên 1 hàng (hoặc cột) của khối
    // thì loại v khỏi phần còn lại của hàng/cột đó.
    for (let b = 0; b < 9; b++) {
      const unit = UNITS[18 + b];
      for (let v = 1; v <= 9; v++) {
        const spots = unit.filter(i => !grid[i] && cands[i].has(v));
        if (spots.length < 2 || spots.length > 3) continue;
        const rows = new Set(spots.map(i => rc(i)[0]));
        const cols = new Set(spots.map(i => rc(i)[1]));
        let lineUnit = -1, lineLabel = '';
        if (rows.size === 1) { lineUnit = [...rows][0]; lineLabel = `hàng ${lineUnit + 1}`; }
        else if (cols.size === 1) { lineUnit = 9 + [...cols][0]; lineLabel = `cột ${[...cols][0] + 1}`; }
        else continue;
        const elim = [];
        for (const i of UNITS[lineUnit]) {
          if (!unit.includes(i) && !grid[i] && cands[i].has(v)) elim.push({ cell: i, value: v });
        }
        if (elim.length) {
          return {
            technique: 'locked', eliminations: elim,
            title: `Khoanh vùng số ${v} trong khối ${b + 1}`,
            detail: `Trong khối ${b + 1}, số ${v} chỉ có thể nằm trên ${lineLabel}. Vì vậy, các ô khác trên ${lineLabel} (ngoài khối này) không thể là ${v}.`,
            highlights: { cells: spots, unit: [18 + b] },
          };
        }
      }
    }
    return null;
  }

  function findNakedPair(grid, cands) {
    for (let u = 0; u < UNITS.length; u++) {
      const unit = UNITS[u];
      const pairs = unit.filter(i => !grid[i] && cands[i].size === 2);
      for (let a = 0; a < pairs.length; a++) {
        for (let b = a + 1; b < pairs.length; b++) {
          const A = [...cands[pairs[a]]].sort().join('');
          const B = [...cands[pairs[b]]].sort().join('');
          if (A !== B) continue;
          const [v1, v2] = [...cands[pairs[a]]];
          const elim = [];
          for (const i of unit) {
            if (i === pairs[a] || i === pairs[b] || grid[i]) continue;
            if (cands[i].has(v1)) elim.push({ cell: i, value: v1 });
            if (cands[i].has(v2)) elim.push({ cell: i, value: v2 });
          }
          if (elim.length) {
            return {
              technique: 'naked-pair', eliminations: elim,
              title: `Cặp số ${v1}–${v2} trong ${unitName(u)}`,
              detail: `Hai ô ${cellName(pairs[a])} và ${cellName(pairs[b])} chỉ có thể là ${v1} hoặc ${v2}. Hai số này "chiếm chỗ" hai ô đó, nên các ô khác trong ${unitName(u)} không thể là ${v1} hay ${v2}.`,
              highlights: { cells: [pairs[a], pairs[b]], unit: [u] },
            };
          }
        }
      }
    }
    return null;
  }

  // Sinh toàn bộ các bước giải. Bảng ứng viên được duy trì xuyên suốt:
  // điền số thì loại ứng viên ở các ô cùng hàng/cột/khối, các phép loại trừ
  // (khoanh vùng, cặp số) được giữ lại và xâu chuỗi đến khi hết tiến triển.
  // Nếu vẫn bí, lấy số từ nghiệm backtracking và nói rõ đó là suy luận
  // bắt buộc hay chỉ là lựa chọn (khi đề có nhiều nghiệm).
  function solveSteps(grid) {
    const solution = solve(grid);
    if (!solution) return { solvable: false, steps: [] };
    const g = grid.slice();
    const cands = allCandidates(g);
    const steps = [];
    // Ghi lại lý do mỗi ứng viên bị loại để các bước sau dẫn lại đúng căn cứ
    const elimNotes = Array.from({ length: 81 }, () => new Map());
    function place(i, v) {
      g[i] = v;
      cands[i] = null;
      for (const j of PEERS[i]) if (cands[j]) cands[j].delete(v);
    }
    let guard = 0;
    while (guard++ < 3000 && g.includes(0)) {
      const step = findNakedSingle(g, cands, elimNotes) || findHiddenSingle(g, cands, elimNotes);
      if (step) {
        place(step.cell, step.value);
        steps.push(step);
        continue;
      }
      // Xâu chuỗi các phép loại trừ đến khi điền được ô hoặc hết tiến triển;
      // ứng viên đã loại được giữ nguyên cho các vòng sau.
      const chain = [];
      let follow = null;
      for (;;) {
        const elim = findLockedCandidates(g, cands) || findNakedPair(g, cands);
        if (!elim) break;
        let removed = false;
        for (const e of elim.eliminations) {
          if (cands[e.cell] && cands[e.cell].delete(e.value)) {
            removed = true;
            elimNotes[e.cell].set(e.value, elim.title);
          }
        }
        if (!removed) break;
        chain.push(elim);
        follow = findNakedSingle(g, cands, elimNotes) || findHiddenSingle(g, cands, elimNotes);
        if (follow) break;
      }
      if (follow) {
        const last = chain[chain.length - 1];
        follow.title = `${last.title} → điền ${follow.value}`;
        follow.detail = `${chain.map(c => c.detail).join(' ')} Nhờ đó: ${follow.detail}`;
        follow.technique = last.technique;
        follow.highlights = last.highlights;
        place(follow.cell, follow.value);
        steps.push(follow);
        continue;
      }
      if (chain.length) continue; // có loại trừ nhưng chưa điền được: thử lại từ đầu với ứng viên đã thu hẹp
      // Bí thật sự: chọn ô ít ứng viên nhất, kiểm chứng từng ứng viên bằng backtracking
      let best = -1, bestLen = 10;
      for (let i = 0; i < 81; i++) {
        if (g[i]) continue;
        const n = cands[i].size;
        if (n && n < bestLen) { best = i; bestLen = n; }
      }
      if (best === -1) break;
      const options = [...cands[best]];
      const viable = options.filter(v => {
        if (v === solution[best]) return true;
        const t = g.slice();
        t[best] = v;
        return countSolutions(t, 1) > 0;
      });
      const v = solution[best];
      let title, detail;
      if (viable.length === 1) {
        title = `Suy luận sâu: điền ${v}`;
        detail = `${cellName(best)} còn ${options.length} khả năng (${options.join(', ')}). Thử lần lượt: mọi khả năng khác đều dẫn tới mâu thuẫn ở các bước sau, chỉ ${v} đi được tới cùng, nên ô này buộc phải là ${v}.`;
      } else {
        title = `Đề nhiều nghiệm: chọn ${v}`;
        detail = `${cellName(best)} còn ${options.length} khả năng (${options.join(', ')}). Đề này có nhiều hơn một nghiệm nên ô này không bị ép buộc (${viable.join(', ')} đều dẫn tới nghiệm hợp lệ). Chọn ${v} theo một nghiệm để đi tiếp.`;
      }
      steps.push({
        cell: best, value: v, technique: 'advanced',
        title, detail,
        highlights: { cells: [], unit: [] },
      });
      place(best, v);
    }
    return { solvable: true, steps, solution };
  }

  // ---------- Sinh đề ----------
  function shuffled(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function randomSolved(rnd = Math.random) {
    const g = new Array(81).fill(0);
    function fill(pos) {
      if (pos === 81) return true;
      if (g[pos]) return fill(pos + 1);
      for (const v of shuffled(candidatesAt(g, pos), rnd)) {
        g[pos] = v;
        if (fill(pos + 1)) return true;
        g[pos] = 0;
      }
      return false;
    }
    fill(0);
    return g;
  }

  // Sinh đề có nghiệm duy nhất; clues ~ số ô cho trước mong muốn (>= 17)
  function generate(clues = 30, rnd = Math.random) {
    const full = randomSolved(rnd);
    const g = full.slice();
    const order = shuffled(Array.from({ length: 81 }, (_, i) => i), rnd);
    let remaining = 81;
    for (const i of order) {
      if (remaining <= clues) break;
      const keep = g[i];
      g[i] = 0;
      if (countSolutions(g, 2) !== 1) g[i] = keep;
      else remaining--;
    }
    return { puzzle: g, solution: full };
  }

  // ---------- Chuỗi hoá ----------
  function toText(grid) {
    let s = '';
    for (let r = 0; r < 9; r++) {
      s += grid.slice(r * 9, r * 9 + 9).map(v => (v || '.')).join('') + '\n';
    }
    return s;
  }
  // Nhận chuỗi 81 ký tự (0/./- là trống) hoặc nhiều dòng
  function fromText(text) {
    const chars = (text || '').replace(/[^0-9.\-_*]/g, '');
    if (chars.length < 81) return null;
    const g = [];
    for (let k = 0; k < 81; k++) {
      const ch = chars[k];
      g.push(/[1-9]/.test(ch) ? +ch : 0);
    }
    return g;
  }

  const api = {
    N, UNITS, PEERS, rc, idx, boxOf, unitName, cellName,
    conflicts, candidatesAt, allCandidates,
    countSolutions, solve, solveSteps,
    randomSolved, generate, toText, fromText,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Sudoku = api;
})(typeof window !== 'undefined' ? window : globalThis);
