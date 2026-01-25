# CoderBooks - 技术知识库

使用 pnpm workspace + VitePress 构建的技术书籍集合，统一部署到 GitHub Pages。

🌐 **在线访问**: [https://coderbook360.github.io/CoderBooks/](https://coderbook360.github.io/CoderBooks/)

## 项目结构

```
codebooks/
├── packages/
│   ├── portal/             # 主入口站点（书籍集合首页）
│   │   └── docs/
│   ├── book1/              # 第一本书
│   │   └── docs/
│   └── book2/              # 第二本书
│       └── docs/
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Pages 自动部署
├── dist/                   # 构建输出目录（所有书籍）
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

## 快速开始

### 前置要求

- Node.js 18+ 
- pnpm 8+

### 安装依赖

```bash
pnpm install
```

## 开发

### 启动主入口站点

```bash
pnpm docs:dev
```

访问 http://localhost:5173

### 启动特定书籍

```bash
# 第一本书
pnpm docs:dev:book1

# 第二本书
pnpm docs:dev:book2
```

## 构建

### 构建所有项目（用于部署）

```bash
pnpm docs:build
```

这会将所有书籍和主站点构建到 `dist/` 目录：
- `dist/` - 主入口
- `dist/book1/` - 第一本书
- `dist/book2/` - 第二本书

### 本地预览构建结果

```bash
pnpm docs:preview
```

## 部署到 GitHub Pages

### 自动部署

1. 将代码推送到 GitHub 仓库的 `main` 分支
2. GitHub Actions 会自动构建并部署到 GitHub Pages
3. 访问 `https://yourusername.github.io/codebooks/`

### 配置步骤

1. 在 GitHub 仓库设置中：
   - 进入 **Settings** > **Pages**
   - Source 选择 **GitHub Actions**

2. 推送代码到 `main` 分支：
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

3. 等待 GitHub Actions 完成部署（约 2-3 分钟）

### 自定义域名（可选）

在仓库设置的 Pages 选项中配置自定义域名，并更新各个 VitePress 配置文件中的 `base` 路径。

## 添加新书籍

1. 在 `packages/` 目录下创建新文件夹（如 `book3`）

2. 添加 `package.json`：
   ```json
   {
     "name": "@codebooks/book3",
     "version": "1.0.0",
     "scripts": {
       "docs:dev": "vitepress dev docs",
       "docs:build": "vitepress build docs"
     },
     "devDependencies": {
       "vitepress": "next",
       "vue": "^3.4.0"
     }
   }
   ```

3. 创建 `docs/.vitepress/config.js`：
   ```javascript
   import { defineConfig } from 'vitepress'

   export default defineConfig({
     title: '第三本书',
     description: '描述',
     base: '/codebooks/book3/',
     outDir: '../../../dist/book3'
   })
   ```

4. 在主站点 `packages/portal/docs/.vitepress/config.js` 中添加导航

5. 更新根目录 `package.json` 的构建脚本

## 目录说明

- `packages/portal/` - 主入口站点，展示所有书籍
- `packages/book1/` - 第一本书的内容
- `packages/book2/` - 第二本书的内容
- `.github/workflows/` - GitHub Actions 自动部署配置
- `dist/` - 所有书籍的构建输出（Git 忽略）

## 技术栈

- [VitePress 2.0](https://vitepress.dev/) - 静态站点生成器
- [Vue 3](https://vuejs.org/) - 前端框架
- [Vite](https://vitejs.dev/) - 构建工具
- [pnpm](https://pnpm.io/) - 包管理器
- [GitHub Pages](https://pages.github.com/) - 托管服务

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装所有依赖 |
| `pnpm docs:dev` | 启动主入口开发服务器 |
| `pnpm docs:dev:book1` | 启动 book1 开发服务器 |
| `pnpm docs:build` | 构建所有项目 |
| `pnpm docs:preview` | 预览构建结果 |

## 访问路径

部署后的访问路径：

- 主入口：`https://yourusername.github.io/codebooks/`
- 第一本书：`https://yourusername.github.io/codebooks/book1/`
- 第二本书：`https://yourusername.github.io/codebooks/book2/`

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装所有依赖 |
| `pnpm docs:dev` | 启动所有书籍开发服务器 |
| `pnpm docs:build` | 构建所有书籍 |
| `pnpm --filter <package> <command>` | 对特定包执行命令 |

## License

MIT
