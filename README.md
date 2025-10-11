# FLX Chat ⚡️

<!-- Badges -->
<p align="center">
  <a href="https://github.com/flxteam/flxchat/stargazers">
    <img src="https://img.shields.io/github/stars/flxteam/flxchat?style=for-the-badge&logo=github&color=gold" alt="GitHub Stars">
  </a>
  <a href="https://github.com/flxteam/flxchat/network/members">
    <img src="https://img.shields.io/github/forks/flxteam/flxchat?style=for-the-badge&logo=github&color=blue" alt="GitHub Forks">
  </a>
  <a href="https://github.com/flxteam/flxchat/issues">
    <img src="https://img.shields.io/github/issues/flxteam/flxchat?style=for-the-badge&logo=github&color=green" alt="GitHub Issues">
  </a>
  <a href="https://github.com/flxteam/flxchat/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/flxteam/flxchat?style=for-the-badge&logo=github&color=lightgrey" alt="License">
  </a>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Built%20with-Next.js-black?style=for-the-badge&logo=next.js" alt="Built with Next.js">
  <img src="https://img.shields.io/badge/Styled%20with-Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Styled with Tailwind CSS">
  <img src="https://img.shields.io/badge/Powered%20by-SiliconFlow-blue?style=for-the-badge" alt="Powered by SiliconFlow">
</p>

<p align="center">
  一个基于 Next.js 和 SiliconFlow 大语言模型构建的、具备流式响应能力的现代化聊天应用。
</p>

<p align="center">
  <a href="https://feli.qzz.io"><strong>🌐 查看官网 & Live Demo</strong></a>
</p>

---

## ✨ 核心功能

- **实时对话**: 与先进的大语言模型进行实时交互。
- **流式响应**: AI 的回答以打字机效果逐字显示，提供流畅、无延迟的对话体验。
- **Markdown & 代码高亮**: 支持 GFM Markdown 渲染，并对代码块进行语法高亮，阅读体验更佳。
- **安全 API 调用**: 通过 Next.js API Route 代理请求，确保 API 密钥永远不会暴露在前端。
- **现代化 UI**: 使用 Tailwind CSS 构建的简洁、响应式的用户界面。

## 🚀 技术栈

- **框架**: [Next.js](https://nextjs.org/) (App Router)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [React](https://react.dev/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **大语言模型 (LLM)**: [SiliconFlow](https://www.siliconflow.cn/)
- **Markdown 解析**: [React-Markdown](https://github.com/remarkjs/react-markdown)
- **语法高亮**: [React-Syntax-Highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter)

## 🛠️ 本地运行指南

按照以下步骤在你的本地环境中运行本项目。

### 1. 克隆仓库

```bash
git clone https://github.com/flxteam/flxchat.git
cd flx-chat
```

### 2. 安装依赖

本项目使用 `npm` 作为包管理器。

```bash
npm install
```

### 3. 配置环境变量

在项目的根目录 (`flx-chat`) 创建一个名为 `.env.local` 的文件，并填入你的 SiliconFlow API 密钥和模型 ID。

```env
# .env.local

SILICONFLOW_API_KEY="YOUR_SILICONFLOW_API_KEY"
SILICONFLOW_MODEL_ID="Qwen/Qwen2-7B-Instruct"
```

> **重要**: `.env.local` 文件已被添加到 `.gitignore` 中，以防止你的敏感信息被意外提交到 Git 仓库。

### 4. 启动开发服务器

```bash
npm run dev
```

现在，在你的浏览器中打开 `http://localhost:3000`，你就可以开始与 FLX Chat 对话了。

## ☁️ 部署

本项目已为现代化的托管平台做好了充分准备。推荐使用以下平台进行一键部署：

- **[Vercel](https://vercel.com/)**: Next.js 的创造者，提供无缝的部署体验。
- **[Cloudflare Pages](https://pages.cloudflare.com/)**: 提供慷慨的免费额度、全球 CDN 和强大的边缘计算能力。

只需将你的 GitHub 仓库连接到这些平台，它们会自动处理构建和部署流程。

## 👤 作者

- **GitHub**: [@flxteam](https://github.com/flxteam)
- **官网**: [feli.qzz.io](https://feli.qzz.io)

## 📄 许可证

本项目采用 [MIT License](https://github.com/flxteam/flx-chat/blob/main/LICENSE) 授权。