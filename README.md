# noopy-web

Noopy v2 独立前端仓库，采用 **Atelier Paper** 设计系统（React 19 + Vite 6 + TypeScript），对接后端仓库 `ShawnJim/noopy` 的 `/v2/ontology/*` 与 `/v1/*` 接口。

## 设计语言与核心空间

- **视觉系统**：暖麻纸面 `#f5f2eb` / 档案纸卡片 `#fcfaf5` / 深松墨绿 `#234e3b`、`Instrument Serif` + `Inter` + `JetBrains Mono`、顶部悬浮毛玻璃胶囊导航、双日光漫射光斑、中/英/双语切换（`中·EN / 中文 / EN`）。
- **8 大业务空间**：总览画报、归因血缘（含 Attribution Lineage Tree）、语义助手（真 SSE 流式 + 6 个本体工具轨迹）、证据收件箱、账单导入、周期订阅、本体图谱、多协议模型（OpenAI / Claude / Gemini / 本地 Ollama）。

## 快速启动

```bash
npm install

# 正式模式（默认，严格连接本地 http://127.0.0.1:8080 后端，禁止降级假数据）
npm run dev

# 离线演示沙盒模式（一键切换，含脱敏演示数据）
npm run dev:demo
```

## 构建与校验

```bash
npm run typecheck
npm test

# 正式构建（Vite 自动剔除全部演示数据，产物 0 泄漏）
npm run build

# 演示沙盒构建（独立 chunk 打包演示数据集）
npm run build:demo
```

环境变量说明见 [.env.example](.env.example)。详细设计规范见后端仓库 `design/current-ui.md`。
