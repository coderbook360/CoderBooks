# GitHub Pages 部署指南

## 前置准备

1. 创建 GitHub 仓库（假设名为 `codebooks`）
2. 确保本地代码已提交

## 部署步骤

### 1. 初始化 Git 仓库（如果还没有）

```bash
git init
git add .
git commit -m "Initial commit: VitePress monorepo setup"
```

### 2. 添加远程仓库

```bash
git remote add origin https://github.com/yourusername/codebooks.git
git branch -M main
```

### 3. 推送到 GitHub

```bash
git push -u origin main
```

### 4. 配置 GitHub Pages

1. 访问你的 GitHub 仓库
2. 点击 **Settings** 标签
3. 在左侧菜单中找到 **Pages**
4. 在 **Source** 下拉菜单中选择 **GitHub Actions**

### 5. 等待部署完成

1. 推送代码后，GitHub Actions 会自动触发
2. 访问 **Actions** 标签查看部署进度
3. 部署成功后，你的网站将在以下地址可访问：
   ```
   https://yourusername.github.io/codebooks/
   ```

## 访问地址

部署成功后，你可以通过以下地址访问：

- **主入口**: `https://yourusername.github.io/codebooks/`
- **Vue3 生态系统**: `https://yourusername.github.io/codebooks/cs130-vue/`
- **第二本书**: `https://yourusername.github.io/codebooks/book2/`

## 项目结构说明

```
codebooks/
├── packages/
│   ├── portal/          # 主入口站点
│   │   └── docs/        → 输出到 dist/
│   ├── cs130-vue/       # Vue3 生态系统学习系列
│   │   └── docs/        → 输出到 dist/cs130-vue/
│   └── book2/           # 第二本书
│       └── docs/        → 输出到 dist/book2/
└── dist/                # 最终部署目录
    ├── index.html       # 主入口
    ├── cs130-vue/       # Vue3 系列
    └── book2/           # 第二本书
```

## 构建命令

```bash
# 开发模式
pnpm docs:dev              # 启动主入口 (portal)
pnpm docs:dev:cs130-vue    # 启动 Vue3 系列
pnpm docs:dev:book2        # 启动第二本书

# 生产构建（完整流程）
# 1. 先构建各个书籍
pnpm --filter @codebooks/book2 run docs:build
pnpm --filter @codebooks/cs130-vue run docs:build

# 2. 构建 portal（输出到临时目录）
pnpm --filter @codebooks/portal run docs:build

# 3. 合并 portal 到 dist 根目录
# Windows PowerShell:
Copy-Item -Recurse -Force dist\portal-temp\* dist\
Remove-Item -Recurse -Force dist\portal-temp

# Linux/macOS:
cp -r dist/portal-temp/* dist/
rm -rf dist/portal-temp
```

**注意**：GitHub Actions 会自动执行上述构建流程，本地开发通常只需使用开发模式命令。

## 自定义域名（可选）

如果你有自己的域名：

### 1. 配置 DNS

在你的域名提供商处添加 CNAME 记录：

```
books.yourdomain.com  →  yourusername.github.io
```

### 2. 添加 CNAME 文件

在 `packages/portal/docs/public/` 目录下创建 `CNAME` 文件：

```bash
echo "books.yourdomain.com" > packages/portal/docs/public/CNAME
```

### 3. 更新 VitePress 配置

修改所有 VitePress 配置文件中的 `base` 路径：

**packages/portal/docs/.vitepress/config.js**:
```javascript
export default defineConfig({
  base: '/',  // 改为 '/'
  // ...
})
```

**packages/book1/docs/.vitepress/config.js**:
```javascript
export default defineConfig({
  base: '/book1/',  // 改为 '/book1/'
  // ...
})
```

**packages/book2/docs/.vitepress/config.js**:
```javascript
export default defineConfig({
  base: '/book2/',  // 改为 '/book2/'
  // ...
})
```

### 4. 在 GitHub 中配置

1. 进入仓库的 **Settings** > **Pages**
2. 在 **Custom domain** 中输入你的域名
3. 等待 DNS 验证通过

## 更新内容

每次更新内容后：

```bash
git add .
git commit -m "Update content"
git push
```

GitHub Actions 会自动重新构建和部署。

## 本地测试构建

在推送前，建议先本地测试构建：

```bash
# 构建所有项目
pnpm docs:build

# 预览构建结果
pnpm docs:preview
```

访问 http://localhost:4173/codebooks/ 查看效果。

## 故障排查

### 404 错误

如果访问页面出现 404：

1. 检查 `base` 路径配置是否正确
2. 确保 `.nojekyll` 文件存在
3. 检查 GitHub Actions 是否成功运行

### 样式丢失

如果样式加载失败：

1. 检查浏览器控制台的错误信息
2. 确认 `base` 路径配置正确
3. 清除浏览器缓存重试

### Actions 失败

查看 Actions 日志中的错误信息：

1. 可能是依赖安装失败 → 检查 `package.json`
2. 可能是构建失败 → 本地测试 `pnpm docs:build`
3. 可能是权限问题 → 检查仓库的 Actions 权限设置

## 进阶配置

### 添加构建缓存

GitHub Actions 工作流已经配置了 pnpm 缓存，可以加快构建速度。

### 环境变量

如果需要在构建时使用环境变量：

在 `.github/workflows/deploy.yml` 中添加：

```yaml
env:
  NODE_ENV: production
  VITE_APP_TITLE: My Books
```

### 多分支部署

可以配置预览环境：

```yaml
on:
  push:
    branches:
      - main      # 生产环境
      - preview   # 预览环境
```

## 相关资源

- [VitePress 官方文档](https://vitepress.dev/)
- [GitHub Pages 文档](https://docs.github.com/pages)
- [GitHub Actions 文档](https://docs.github.com/actions)
