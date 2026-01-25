# Monorepo 多项目管理策略

## 📋 项目概述

本 monorepo 包含多个独立的文档项目，每个项目都部署到独立的 GitHub 仓库和 GitHub Pages。

### 项目列表

| 项目 | GitHub 仓库 | 部署地址 | 状态 |
|------|------------|---------|------|
| cs130-vue | `coderbook360/cs130-vue` | `coderbook360.github.io/cs130-vue` | ✅ 已配置 |
| book2 | `coderbook360/book2` | `coderbook360.github.io/book2` | ⏳ 待配置 |
| portal | `coderbook360/portal` | `coderbook360.github.io/portal` | ⏳ 待配置 |

---

## 🏗️ 架构方案

### 方案说明

采用 **Monorepo 本地开发 + 独立仓库部署** 的混合模式：

**本地开发**：
- 统一在 `codebooks` monorepo 中管理
- 共享依赖、统一脚本
- 便于跨项目代码复用

**远程部署**：
- 每个 package 推送到独立的 GitHub 仓库
- 独立的 CI/CD 流程
- 独立的版本控制和发布

---

## 🚀 快速开始

### 一键配置所有项目

```bash
# 1. 运行配置脚本
chmod +x scripts/setup-git-repos.sh
./scripts/setup-git-repos.sh

# 2. 在 GitHub 创建仓库（手动操作）
# - https://github.com/new → coderbook360/cs130-vue
# - https://github.com/new → coderbook360/book2
# - https://github.com/new → coderbook360/portal

# 3. 推送代码
cd packages/cs130-vue
git add .
git commit -m "first commit"
git push -u origin main

cd ../book2
git add .
git commit -m "first commit"
git push -u origin main

cd ../portal
git add .
git commit -m "first commit"
git push -u origin main
```

### 为单个项目配置

以 `cs130-vue` 为例：

```bash
cd packages/cs130-vue

# 初始化 Git
git init
git branch -M main

# 添加远程仓库
git remote add origin git@github.com:coderbook360/cs130-vue.git

# 提交并推送
git add .
git commit -m "first commit"
git push -u origin main
```

---

## 📦 为新项目添加部署配置

### 必需文件清单

每个项目需要以下文件：

```
packages/your-project/
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions 配置
├── .gitignore               # Git 忽略规则
├── README.md                # 项目说明
├── package.json             # 项目依赖
└── docs/
    └── .vitepress/
        └── config.js        # VitePress 配置
```

### VitePress 配置要点

独立仓库模式下，`config.js` 需要调整：

```javascript
export default defineConfig({
  base: '/',  // ← 根路径（非 monorepo 子路径）
  outDir: './.vitepress/dist',  // ← 标准输出路径
  // ... 其他配置
})
```

### GitHub Actions 模板

使用 `packages/cs130-vue/.github/workflows/deploy.yml` 作为模板，无需修改。

---

## 🔄 工作流程

### 日常开发

```bash
# 在 monorepo 根目录
pnpm install
pnpm run docs:dev:cs130-vue  # 启动某个项目
```

### 构建测试

```bash
pnpm run build:books  # 构建所有书籍
```

### 部署更新

```bash
cd packages/cs130-vue
git add .
git commit -m "更新内容"
git push  # 触发 GitHub Actions 自动部署
```

---

## 📊 GitHub Pages 配置

### 首次配置

1. 推送代码到 GitHub
2. 进入仓库设置：`Settings > Pages`
3. **Source** 选择：`GitHub Actions`
4. 等待首次部署完成

### 后续更新

推送到 `main` 分支会自动触发部署，无需手动操作。

---

## 🛠️ 常见问题

### Q1: 如何保持 monorepo 和独立仓库同步？

**A1**: 使用 Git Subtree 或手动同步：

```bash
# 手动同步（推荐简单场景）
cd packages/cs130-vue
git add .
git commit -m "更新"
git push
```

### Q2: 是否需要删除 monorepo？

**A2**: 不需要！monorepo 可以保留用于本地开发，独立仓库仅用于部署。

### Q3: 如何统一依赖版本？

**A3**: 在 monorepo 根目录使用 pnpm workspace 统一管理：

```json
// pnpm-workspace.yaml
packages:
  - 'packages/*'
```

---

## 📚 参考资料

- [VitePress 官方文档](https://vitepress.dev/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [GitHub Pages 文档](https://docs.github.com/en/pages)
