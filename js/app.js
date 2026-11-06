/* Giao diện & luồng 3 bước: Chụp đề → Kiểm tra số → Hướng dẫn giải. */
(function () {
  'use strict';
  const S = window.Sudoku;
  const V = window.SudokuVision;
  const $ = (id) => document.getElementById(id);

  // ---------- Trạng thái ----------
  let grid = new Array(81).fill(0);        // đề hiện tại (0 = trống)
  let suspects = new Array(81).fill(false); // ô nhận dạng thiếu tự tin
  let steps = [];                           // các bước giải
  let solution = null;
  let stepIndex = 0;                        // số bước đã thực hiện
  let playTimer = null;

  // ---------- Tabs ----------
  const tabs = document.querySelectorAll('.tab');
  function showTab(name) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
    if (name === 'edit') renderEditBoard();
  }
  tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));

  function toast(msg, ms = 3200) {
    const el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, ms);
  }

  // ========== 1. CHỤP ==========
  const camCanvas = $('camera-canvas');
  const camCtx = camCanvas.getContext('2d', { willReadFrequently: true });
  let video = null, camStream = null, rafId = 0;
  let frame = { cx: 0.5, cy: 0.5, size: 0.72 }; // khung vuông tương đối theo cạnh ngắn
  let stillImage = null; // ảnh tĩnh (từ file) đang hiển thị

  function frameRect() {
    const w = camCanvas.width, h = camCanvas.height;
    const side = Math.min(w, h) * frame.size;
    return { x: frame.cx * w - side / 2, y: frame.cy * h - side / 2, size: side };
  }

  function drawOverlay() {
    const { x, y, size } = frameRect();
    const ctx = camCtx;
    ctx.save();
    ctx.fillStyle = '#0008';
    ctx.beginPath();
    ctx.rect(0, 0, camCanvas.width, camCanvas.height);
    ctx.rect(x, y, size, size);
    ctx.fill('evenodd');
    ctx.strokeStyle = '#4f8cff';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, size, size);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#4f8cff88';
    for (let k = 1; k < 9; k++) {
      const p = k * size / 9;
      ctx.beginPath(); ctx.moveTo(x + p, y); ctx.lineTo(x + p, y + size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + p); ctx.lineTo(x + size, y + p); ctx.stroke();
    }
    ctx.restore();
  }

  function drawStill() {
    if (!stillImage) return;
    const { width: cw, height: ch } = camCanvas;
    const scale = Math.min(cw / stillImage.width, ch / stillImage.height);
    const w = stillImage.width * scale, h = stillImage.height * scale;
    camCtx.fillStyle = '#000';
    camCtx.fillRect(0, 0, cw, ch);
    camCtx.drawImage(stillImage, (cw - w) / 2, (ch - h) / 2, w, h);
    drawOverlay();
  }

  function loopCamera() {
    if (!video) return;
    camCtx.drawImage(video, 0, 0, camCanvas.width, camCanvas.height);
    drawOverlay();
    rafId = requestAnimationFrame(loopCamera);
  }

  async function startCamera() {
    try {
      camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
      });
    } catch (e) {
      toast('Không mở được camera: ' + e.message + '. Hãy dùng nút tải/chụp ảnh bên dưới.');
      return;
    }
    stillImage = null;
    video = document.createElement('video');
    video.srcObject = camStream;
    video.setAttribute('playsinline', '');
    await video.play();
    camCanvas.width = video.videoWidth || 1280;
    camCanvas.height = video.videoHeight || 960;
    $('camera-placeholder').hidden = true;
    $('btn-capture').disabled = false;
    cancelAnimationFrame(rafId);
    loopCamera();
  }

  function stopCamera() {
    cancelAnimationFrame(rafId);
    if (camStream) camStream.getTracks().forEach(t => t.stop());
    camStream = null; video = null;
  }

  $('btn-camera-big').addEventListener('click', startCamera);
  $('btn-camera').addEventListener('click', startCamera);

  // Kéo/chỉnh khung bằng chuột hoặc chạm
  let drag = null;
  camCanvas.addEventListener('pointerdown', (e) => {
    camCanvas.setPointerCapture(e.pointerId);
    drag = { x: e.offsetX, y: e.offsetY, cx: frame.cx, cy: frame.cy };
  });
  camCanvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const scaleX = camCanvas.width / camCanvas.clientWidth;
    const scaleY = camCanvas.height / camCanvas.clientHeight;
    frame.cx = Math.min(0.95, Math.max(0.05, drag.cx + (e.offsetX - drag.x) * scaleX / camCanvas.width));
    frame.cy = Math.min(0.95, Math.max(0.05, drag.cy + (e.offsetY - drag.y) * scaleY / camCanvas.height));
    if (stillImage) drawStill();
  });
  const endDrag = () => { drag = null; };
  camCanvas.addEventListener('pointerup', endDrag);
  camCanvas.addEventListener('pointercancel', endDrag);

  $('grid-size').addEventListener('input', (e) => {
    frame.size = e.target.value / 100;
    if (stillImage) drawStill();
  });

  function loadImageFile(file) {
    const img = new Image();
    img.onload = () => {
      stopCamera();
      stillImage = img;
      // canvas giữ tỉ lệ 4:3, phóng to đủ nét
      camCanvas.width = 1280; camCanvas.height = 960;
      $('camera-placeholder').hidden = true;
      $('btn-capture').disabled = false;
      drawStill();
      URL.revokeObjectURL(img.src);
      toast('Căn khung xanh trùm khít đề sudoku (kéo để di chuyển, thanh trượt chỉnh cỡ) rồi bấm "Đọc đề trong khung".');
    };
    img.src = URL.createObjectURL(file);
  }
  $('file-camera').addEventListener('change', (e) => { if (e.target.files[0]) loadImageFile(e.target.files[0]); e.target.value = ''; });
  $('file-input').addEventListener('change', (e) => { if (e.target.files[0]) loadImageFile(e.target.files[0]); e.target.value = ''; });

  $('btn-capture').addEventListener('click', () => {
    // Chụp khung hiện tại (video hoặc ảnh tĩnh đều đã nằm trên canvas)
    if (video) { camCtx.drawImage(video, 0, 0, camCanvas.width, camCanvas.height); }
    else if (stillImage) {
      const { width: cw, height: ch } = camCanvas;
      const scale = Math.min(cw / stillImage.width, ch / stillImage.height);
      const w = stillImage.width * scale, h = stillImage.height * scale;
      camCtx.fillStyle = '#000'; camCtx.fillRect(0, 0, cw, ch);
      camCtx.drawImage(stillImage, (cw - w) / 2, (ch - h) / 2, w, h);
    } else return;

    const rect = frameRect();
    const imageData = camCtx.getImageData(0, 0, camCanvas.width, camCanvas.height);
    $('flash').classList.remove('on'); void $('flash').offsetWidth; $('flash').classList.add('on');
    if (navigator.vibrate) navigator.vibrate(60);

    const res = V.readGrid(imageData, rect);
    const found = res.grid.filter(v => v).length;
    if (found < 10) {
      toast(`Chỉ nhận ra ${found} số — hãy căn khung sát mép đề, đủ sáng, rồi thử lại. Hoặc nhập tay ở bước 2.`);
    }
    grid = res.grid.slice();
    suspects = res.confidence.map((c, i) => grid[i] > 0 && c < 0.25);
    if (video) { drawOverlay(); } else { drawStill(); }
    showTab('edit');
    const nSus = suspects.filter(Boolean).length;
    toast(`Đã đọc ${found} số${nSus ? `, ${nSus} ô nghi sai (dấu ?)` : ''}. Kiểm tra và chạm vào ô để sửa.`);
  });

  // ========== 2. KIỂM TRA ==========
  const board = $('board');
  const boardButtons = [];
  (function buildBoard() {
    for (let i = 0; i < 81; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.addEventListener('click', () => openPicker(i, b));
      board.appendChild(b);
      boardButtons.push(b);
    }
  })();

  function renderEditBoard() {
    const bad = new Set(S.conflicts(grid));
    for (let i = 0; i < 81; i++) {
      const b = boardButtons[i];
      b.textContent = grid[i] || '';
      b.className = '';
      if (grid[i]) b.classList.add('given');
      if (bad.has(i)) b.classList.add('bad');
      if (suspects[i]) b.classList.add('suspect');
    }
    validate();
  }

  function validate() {
    const el = $('validation');
    const filled = grid.filter(v => v).length;
    const bad = S.conflicts(grid);
    el.className = 'validation';
    if (bad.length) {
      el.classList.add('err');
      el.textContent = `Có ${bad.length} ô trùng số trong cùng hàng/cột/khối (viền đỏ) — hãy sửa lại.`;
      $('btn-solve').disabled = true;
      return;
    }
    if (filled < 17) {
      el.classList.add('warn');
      el.textContent = filled === 0
        ? 'Lưới đang trống. Chụp đề ở bước 1, nhập tay, hoặc bấm "Đề mẫu".'
        : `Mới có ${filled} số — đề sudoku chuẩn cần ít nhất 17 số cho trước.`;
      $('btn-solve').disabled = filled === 0;
      return;
    }
    const n = S.countSolutions(grid, 2);
    if (n === 0) {
      el.classList.add('err');
      el.textContent = 'Đề này vô nghiệm — có số bị đọc/nhập sai. Chạm vào ô nghi ngờ để sửa.';
      $('btn-solve').disabled = true;
    } else if (n > 1) {
      el.classList.add('warn');
      el.textContent = 'Đề có nhiều hơn một nghiệm (có thể thiếu số). Vẫn giải được, nhưng nên kiểm tra lại.';
      $('btn-solve').disabled = false;
    } else {
      el.classList.add('ok');
      el.textContent = `✔ Đề hợp lệ (${filled} số cho trước, nghiệm duy nhất). Bấm "Giải ngay".`;
      $('btn-solve').disabled = false;
    }
  }

  // Bảng chọn số
  const picker = $('num-picker');
  let pickingCell = -1;
  function openPicker(i, anchor) {
    closePicker();
    pickingCell = i;
    anchor.classList.add('picking');
    const [r, c] = S.rc(i);
    picker.querySelector('.picker-title').textContent = `Hàng ${r + 1}, cột ${c + 1}`;
    picker.hidden = false;
    const rect = anchor.getBoundingClientRect();
    const pw = 210, ph = picker.offsetHeight || 230;
    let left = rect.left + rect.width / 2 - pw / 2;
    left = Math.max(8, Math.min(window.innerWidth - pw - 8, left));
    let top = rect.bottom + 8;
    if (top + ph > window.innerHeight - 8) top = rect.top - ph - 8;
    picker.style.left = left + 'px';
    picker.style.top = Math.max(8, top) + 'px';
  }
  function closePicker() {
    picker.hidden = true;
    if (pickingCell >= 0) boardButtons[pickingCell].classList.remove('picking');
    pickingCell = -1;
  }
  picker.querySelectorAll('[data-num]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (pickingCell < 0) return;
      grid[pickingCell] = +btn.dataset.num;
      suspects[pickingCell] = false;
      closePicker();
      renderEditBoard();
    });
  });
  picker.querySelector('.picker-cancel').addEventListener('click', closePicker);
  document.addEventListener('pointerdown', (e) => {
    if (!picker.hidden && !picker.contains(e.target) && !board.contains(e.target)) closePicker();
  });

  $('btn-clear').addEventListener('click', () => {
    grid = new Array(81).fill(0);
    suspects = new Array(81).fill(false);
    renderEditBoard();
  });

  $('btn-example').addEventListener('click', () => {
    const { puzzle } = S.generate(30 + Math.floor(Math.random() * 8));
    grid = puzzle;
    suspects = new Array(81).fill(false);
    renderEditBoard();
    toast('Đã sinh một đề ngẫu nhiên có nghiệm duy nhất.');
  });

  $('btn-paste').addEventListener('click', () => {
    const g = S.fromText($('paste-box').value);
    if (!g) { toast('Chuỗi chưa đủ 81 ký tự (dùng 1–9, ô trống là 0 hoặc dấu chấm).'); return; }
    grid = g;
    suspects = new Array(81).fill(false);
    renderEditBoard();
  });

  $('btn-solve').addEventListener('click', () => {
    const res = S.solveSteps(grid);
    if (!res.solvable) { toast('Đề vô nghiệm — hãy kiểm tra lại các số.'); return; }
    steps = res.steps;
    solution = res.solution;
    stepIndex = 0;
    stopPlay();
    buildStepList();
    showTab('solve');
    renderStep();
  });

  // ========== 3. GIẢI ==========
  const solveBoard = $('solve-board');
  const solveButtons = [];
  (function buildSolveBoard() {
    for (let i = 0; i < 81; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.disabled = true;
      solveBoard.appendChild(b);
      solveButtons.push(b);
    }
  })();

  function currentGrid() {
    const g = grid.slice();
    for (let k = 0; k < stepIndex; k++) g[steps[k].cell] = steps[k].value;
    return g;
  }

  const TECH_LABEL = {
    'naked-single': 'Ô đơn',
    'hidden-single': 'Vị trí duy nhất',
    'locked': 'Khoanh vùng',
    'naked-pair': 'Cặp số',
    'advanced': 'Suy luận sâu',
  };

  function renderStep() {
    const g = currentGrid();
    const justDone = stepIndex > 0 ? steps[stepIndex - 1] : null;
    for (let i = 0; i < 81; i++) {
      const b = solveButtons[i];
      b.textContent = g[i] || '';
      b.className = '';
      if (grid[i]) b.classList.add('given');
      else if (g[i]) b.classList.add('filled');
    }
    if (justDone) {
      solveButtons[justDone.cell].classList.add('step-cell');
      for (const i of justDone.highlights.cells) solveButtons[i].classList.add('step-peer');
      for (const u of justDone.highlights.unit) {
        for (const i of S.UNITS[u]) solveButtons[i].classList.add('step-unit');
      }
    }
    $('progress-bar').style.width = steps.length ? (stepIndex / steps.length * 100) + '%' : '0';
    $('step-counter').textContent = steps.length ? `Bước ${stepIndex}/${steps.length}` : '';
    const badge = $('step-badge');
    if (justDone) {
      badge.hidden = false;
      badge.className = 'step-badge ' + justDone.technique;
      badge.textContent = TECH_LABEL[justDone.technique] || justDone.technique;
      $('step-title').textContent = justDone.title;
      $('step-desc').textContent = justDone.detail;
    } else {
      badge.hidden = true;
      $('step-title').textContent = 'Sẵn sàng!';
      $('step-desc').textContent = 'Bấm "Tiếp ▶" để xem từng bước, hoặc "⏩ Tự chạy" để xem cả lời giải.';
    }
    if (stepIndex === steps.length && steps.length) {
      $('step-title').textContent = '🎉 Hoàn thành!';
      $('step-desc').textContent = `Đã điền xong ${steps.length} ô. Sudoku được giải trọn vẹn.`;
      for (let i = 0; i < 81; i++) if (!grid[i]) solveButtons[i].classList.add('done-cell');
    }
    // danh sách bước
    const items = $('step-list').children;
    for (let k = 0; k < items.length; k++) {
      items[k].classList.toggle('done', k < stepIndex - 1);
      items[k].classList.toggle('current', k === stepIndex - 1);
    }
    const cur = items[stepIndex - 1];
    if (cur) cur.scrollIntoView({ block: 'nearest' });
    $('btn-prev').disabled = stepIndex === 0;
    $('btn-first').disabled = stepIndex === 0;
    $('btn-next').disabled = stepIndex >= steps.length;
  }

  function buildStepList() {
    const list = $('step-list');
    list.innerHTML = '';
    steps.forEach((st, k) => {
      const [r, c] = S.rc(st.cell);
      const b = document.createElement('button');
      b.innerHTML = `<span class="n">${k + 1}.</span> <span>H${r + 1}C${c + 1} = <span class="v">${st.value}</span></span>`;
      b.title = st.title;
      b.addEventListener('click', () => { stopPlay(); stepIndex = k + 1; renderStep(); });
      list.appendChild(b);
    });
    $('solution-length').textContent = steps.length ? `(${steps.length} bước)` : '';
  }

  function next() { if (stepIndex < steps.length) { stepIndex++; renderStep(); return true; } return false; }
  function prev() { if (stepIndex > 0) { stepIndex--; renderStep(); } }

  $('btn-next').addEventListener('click', () => { stopPlay(); next(); });
  $('btn-prev').addEventListener('click', () => { stopPlay(); prev(); });
  $('btn-first').addEventListener('click', () => { stopPlay(); stepIndex = 0; renderStep(); });

  function stopPlay() {
    if (playTimer) { clearInterval(playTimer); playTimer = null; $('btn-play').textContent = '⏩ Tự chạy'; }
  }
  $('btn-play').addEventListener('click', () => {
    if (playTimer) { stopPlay(); return; }
    if (stepIndex >= steps.length) stepIndex = 0;
    $('btn-play').textContent = '⏸ Dừng';
    const tick = () => { if (!next()) stopPlay(); };
    tick();
    playTimer = setInterval(tick, +$('speed').value);
  });
  $('speed').addEventListener('input', () => {
    if (playTimer) { clearInterval(playTimer); playTimer = setInterval(() => { if (!next()) stopPlay(); }, +$('speed').value); }
  });

  document.addEventListener('keydown', (e) => {
    if (!document.querySelector('#tab-solve.active')) return;
    if (e.key === 'ArrowRight') { stopPlay(); next(); }
    else if (e.key === 'ArrowLeft') { stopPlay(); prev(); }
    else if (e.key === ' ') { e.preventDefault(); $('btn-play').click(); }
  });

  // Khởi tạo
  renderEditBoard();
  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
    $('camera-note').textContent = 'Camera trực tiếp cần https hoặc localhost — vẫn dùng được nút chụp/tải ảnh.';
  }
})();
