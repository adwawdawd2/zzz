const inputDirEl = document.getElementById('inputDir');
const outputDirEl = document.getElementById('outputDir');
const apiKeyEl = document.getElementById('apiKey');
const progressEl = document.getElementById('progress');
const progressTextEl = document.getElementById('progressText');
const failedListEl = document.getElementById('failedList');

const manualDialog = document.getElementById('manualDialog');
const editorCanvas = document.getElementById('editorCanvas');
const ctx = editorCanvas.getContext('2d');
const brushSizeEl = document.getElementById('brushSize');

let currentOutputDir = '';
let currentManualTarget = null;
let drawing = false;
let mode = 'erase';

function setProgress(processed, total, success, failedCount, current) {
  const percent = total ? Math.floor((processed / total) * 100) : 0;
  progressEl.max = 100;
  progressEl.value = percent;
  progressTextEl.textContent = `进度 ${processed}/${total}（成功 ${success}，失败 ${failedCount}） 当前：${current || '-'}`;
}

function renderFailedItem(item) {
  const li = document.createElement('li');
  const text = document.createElement('span');
  text.textContent = `${item.filename} - ${item.reason}`;
  const btn = document.createElement('button');
  btn.className = 'danger';
  btn.textContent = '手动微调';
  btn.addEventListener('click', () => openManualEditor(item));
  li.append(text, btn);
  failedListEl.appendChild(li);
}

async function openManualEditor(item) {
  currentManualTarget = item;
  const dataUrl = await window.api.loadImageBuffer(item.originalPath);
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
    const ratio = Math.min(editorCanvas.width / img.width, editorCanvas.height / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    const x = (editorCanvas.width - w) / 2;
    const y = (editorCanvas.height - h) / 2;
    ctx.drawImage(img, x, y, w, h);
  };
  img.src = dataUrl;
  manualDialog.showModal();
}

function drawBrush(event) {
  if (!drawing) return;
  const rect = editorCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  ctx.beginPath();
  ctx.arc(x, y, Number(brushSizeEl.value), 0, Math.PI * 2);

  if (mode === 'erase') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill();
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fill();
  }
}

editorCanvas.addEventListener('mousedown', (event) => {
  drawing = true;
  drawBrush(event);
});
editorCanvas.addEventListener('mousemove', drawBrush);
window.addEventListener('mouseup', () => {
  drawing = false;
  ctx.globalCompositeOperation = 'source-over';
});

document.getElementById('modeErase').addEventListener('click', () => {
  mode = 'erase';
});
document.getElementById('modeRestore').addEventListener('click', () => {
  mode = 'restore';
});

document.getElementById('btnCloseManual').addEventListener('click', () => {
  manualDialog.close();
});

document.getElementById('btnSaveManual').addEventListener('click', async () => {
  if (!currentManualTarget || !currentOutputDir) return;
  const dataUrl = editorCanvas.toDataURL('image/png');
  await window.api.saveManualResult({
    dataUrl,
    outputDir: currentOutputDir,
    originalFilename: currentManualTarget.filename,
  });
  alert(`已保存：${currentManualTarget.filename}`);
  manualDialog.close();
});

document.getElementById('btnSelectInput').addEventListener('click', async () => {
  const folder = await window.api.selectFolder();
  if (folder) inputDirEl.value = folder;
});

document.getElementById('btnSelectOutput').addEventListener('click', async () => {
  const folder = await window.api.selectFolder();
  if (folder) {
    outputDirEl.value = folder;
    currentOutputDir = folder;
  }
});

window.api.getEnvApiKey().then((key) => {
  apiKeyEl.value = key;
});

const unsubscribe = window.api.onProgress((payload) => {
  setProgress(payload.processed, payload.total, payload.success, payload.failedCount, payload.current);
});

window.addEventListener('beforeunload', () => {
  unsubscribe();
});

document.getElementById('btnStart').addEventListener('click', async () => {
  failedListEl.innerHTML = '';
  const inputDir = inputDirEl.value.trim();
  const outputDir = outputDirEl.value.trim();
  const apiKey = apiKeyEl.value.trim();

  if (!inputDir || !outputDir) {
    alert('请先选择输入文件夹和导出目录。');
    return;
  }

  currentOutputDir = outputDir;
  setProgress(0, 1, 0, 0, '准备中');

  const result = await window.api.processBatch({ inputDir, outputDir, apiKey });
  result.failed.forEach(renderFailedItem);

  const msg = `处理完成：总计 ${result.total}，成功 ${result.success}，失败 ${result.failed.length}`;
  progressTextEl.textContent = msg;
  alert(msg);
});
