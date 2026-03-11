const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
const dotenv = require('dotenv');

dotenv.config();

const SUPPORTED_EXT = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.webp']);

function createWindow() {
  const win = new BrowserWindow({
    width: 1120,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('select-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  return filePaths[0];
});

ipcMain.handle('get-env-api-key', async () => {
  return process.env.REMOVE_BG_API_KEY || '';
});

async function removeBackgroundViaApi(filePath, apiKey) {
  if (!apiKey) {
    throw new Error('未提供 REMOVE_BG_API_KEY，无法调用自动抠图 API。');
  }

  const formData = new FormData();
  const fileBuffer = await fs.readFile(filePath);
  formData.append('image_file', fileBuffer, path.basename(filePath));
  formData.append('size', 'auto');

  const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
    responseType: 'arraybuffer',
    headers: {
      ...formData.getHeaders(),
      'X-Api-Key': apiKey,
    },
    timeout: 60000,
    maxBodyLength: Infinity,
  });

  return Buffer.from(response.data);
}

async function saveAsWhiteBgJpg(inputBuffer, outputPath) {
  await sharp(inputBuffer)
    .resize(480, 640, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 95 })
    .toFile(outputPath);
}

async function listImageFiles(inputDir) {
  const entries = await fs.readdir(inputDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .filter((entry) => SUPPORTED_EXT.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => ({
      filename: entry.name,
      fullPath: path.join(inputDir, entry.name),
    }));
}

ipcMain.handle('process-batch', async (event, { inputDir, outputDir, apiKey }) => {
  const files = await listImageFiles(inputDir);
  const total = files.length;
  let processed = 0;
  let success = 0;
  const failed = [];

  await fs.mkdir(outputDir, { recursive: true });

  for (const file of files) {
    try {
      const transparentPngBuffer = await removeBackgroundViaApi(file.fullPath, apiKey);
      const outputName = `${path.parse(file.filename).name}.jpg`;
      const outputPath = path.join(outputDir, outputName);
      await saveAsWhiteBgJpg(transparentPngBuffer, outputPath);
      success += 1;
    } catch (error) {
      failed.push({
        filename: file.filename,
        originalPath: file.fullPath,
        reason: error?.response?.data
          ? Buffer.from(error.response.data).toString('utf8')
          : error.message,
      });
    }

    processed += 1;
    event.sender.send('process-progress', {
      processed,
      total,
      success,
      failedCount: failed.length,
      current: file.filename,
    });
  }

  return { total, success, failed };
});

ipcMain.handle('load-image-buffer', async (_event, filePath) => {
  const data = await fs.readFile(filePath);
  return `data:image/${path.extname(filePath).replace('.', '')};base64,${data.toString('base64')}`;
});

ipcMain.handle('save-manual-result', async (_event, { dataUrl, outputDir, originalFilename }) => {
  const outputName = `${path.parse(originalFilename).name}.jpg`;
  const outputPath = path.join(outputDir, outputName);

  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  await saveAsWhiteBgJpg(buffer, outputPath);

  return outputPath;
});
