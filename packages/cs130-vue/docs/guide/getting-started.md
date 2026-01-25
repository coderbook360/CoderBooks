# 快速开始

本节将引导你如何开始使用本书。

## 环境准备

确保你已经安装了以下工具：

- Node.js 18 或更高版本
- pnpm 包管理器

## 安装依赖

在项目根目录执行：

```bash
pnpm install
```

## 启动开发服务器

```bash
pnpm docs:dev
```

开发服务器将在 `http://localhost:5173` 启动。

## 构建生产版本

```bash
pnpm docs:build
```

构建的文件将输出到 `docs/.vitepress/dist` 目录。

## 预览生产版本

```bash
pnpm docs:preview
```

## 下一步

现在你已经成功启动了项目，可以开始编写内容了！
