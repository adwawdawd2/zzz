# 学生证件照批量处理工具（Electron）

基于 **Electron + HTML + CSS + JavaScript** 的 Windows 桌面软件，用于批量导入学生照片，自动抠图并生成白底证件照（固定 480x640），支持批量导出 JPG 与失败后手动微调。

## 功能清单

- 批量导入一个文件夹里的照片
- 调用成熟 API（remove.bg）自动抠图
- 自动输出白底、尺寸固定为 **480x640 像素**
- 批量导出为 JPG
- 文件名沿用原照片名（扩展名统一为 `.jpg`）
- 简单界面：选择文件夹、开始处理、导出目录、进度条、失败列表
- 自动抠图失败时，支持手动微调（画笔擦除/恢复）
- API Key 通过 `.env` 配置

---

## 项目结构

```txt
student-id-photo-tool/
├─ main.js
├─ preload.js
├─ package.json
├─ .env.example
├─ .gitignore
├─ README.md
└─ renderer/
   ├─ index.html
   ├─ styles.css
   └─ renderer.js
```

---

## 安装与运行

> 需要 Node.js 18+（推荐 20+）

1. 安装依赖

```bash
npm install
```

2. 配置 API Key

```bash
cp .env.example .env
```

编辑 `.env`：

```env
REMOVE_BG_API_KEY=你的_remove_bg_key
```

3. 启动应用

```bash
npm start
```

---

## 使用说明

1. 点击“选择文件夹”选择学生照片目录。
2. 点击“选择目录”选择导出目录。
3. 确认 API Key（默认读取 `.env`）。
4. 点击“开始处理”。
5. 若有失败项，在失败列表点击“手动微调”，通过画笔擦除背景并保存。

---

## 打包为 Windows 可执行程序（.exe）

1. 在 Windows 环境执行：

```bash
npm install
npm run build:win
```

2. 打包输出目录：

```txt
dist/
```

通常会生成：

- `Student ID Photo Tool Setup x.x.x.exe`（安装包）

> 如需便携版可执行文件，可在 `package.json` 的 `build.win.target` 中添加 `portable`。

---

## 说明

- 自动抠图基于 remove.bg API，稳定成熟，适合快速接入。
- 若 API 请求失败（额度、网络、格式问题等），会进入失败列表，可手动微调后再导出。
