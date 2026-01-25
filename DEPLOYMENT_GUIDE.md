# 🎉 CoderBooks Monorepo 部署完成

## 📐 最终架构

### GitHub 仓库
**地址**：https://github.com/coderbook360/CoderBooks

### 部署结构
```
https://coderbook360.github.io/CoderBooks/              ← Portal 主页
https://coderbook360.github.io/CoderBooks/cs130-vue/    ← Vue3 生态系统系列
https://coderbook360.github.io/CoderBooks/book2/        ← 第二本书
```

### ⚡ 增量构建策略

**原理**：GitHub Actions 检测文件变化，仅构建修改过的书籍。

#### 变化检测规则

| 变化的文件/目录 | 构建行为 |
|---------------|----------|
| `packages/book2/**` | 仅构建 book2 |
| `packages/cs130-vue/**` | 仅构建 cs130-vue |
| `packages/portal/**` | Portal 总是构建（包含导航）|
| `package.json` 或 `pnpm-workspace.yaml` | **全量构建**所有书籍 |
| 首次部署（无历史） | **全量构建**所有书籍 |

#### 缓存机制

- **缓存内容**：上次构建的 `dist/` 目录
- **工作流程**：
  1. 恢复上次的 `dist/` 缓存（包含所有书籍）
  2. 检测本次 commit 的文件变化
  3. 仅重新构建有变化的书籍（覆盖对应目录）
  4. 未变化的书籍使用缓存版本
  5. 保存新的 `dist/` 缓存供下次使用
  6. 部署完整的 `dist/` 到 GitHub Pages

**性能提升**：
- 单本书变化：~2-5 分钟（vs 全量 ~5-10 分钟）
- 仅修改 Portal：~1 分钟

### 构建产物结构
```
dist/
├── index.html                    ← Portal 主页
├── books.html                    ← 书籍列表页
├── assets/                       ← Portal 资源
├── cs130-vue/                    ← Vue3 书籍目录
│   ├── index.html
│   ├── reactive/
│   ├── component/
│   └── ...
└── book2/                        ← Book2 目录
    ├── index.html
    └── tutorial/
```

---

## ✅ 完成的配置

### 1. VitePress Base 路径
- **portal**: `/CoderBooks/`
- **cs130-vue**: `/CoderBooks/cs130-vue/`
- **book2**: `/CoderBooks/book2/`

### 2. 构建脚本
```json
{
  "docs:build": "构建所有书籍 + portal + 合并目录",
  "build:books": "构建 book2 和 cs130-vue",
  "build:portal": "构建 portal",
  "postbuild": "将 portal 内容移到 dist 根目录"
}
```

### 3. GitHub Actions
- **触发**：推送到 main 分支或手动触发
- **流程**：
  1. 安装依赖（pnpm）
  2. 构建所有书籍
  3. 构建 portal
  4. 合并 portal 到 dist 根目录
  5. 部署到 GitHub Pages

---

## 🚀 部署步骤

### 1. 提交所有更改
```bash
cd G:\projects\codebooks
git add .
git commit -m "feat: 配置 CoderBooks monorepo 部署"
git push origin main
```

### 2. 配置 GitHub Pages
访问：https://github.com/coderbook360/CoderBooks/settings/pages

**设置**：
- Repository name: 确保是 `CoderBooks`（注意大小写）
- Source: **GitHub Actions**
- 保存

### 3. 验证部署
1. 查看 Actions：https://github.com/coderbook360/CoderBooks/actions
2. 等待构建完成（约 3-5 分钟）
3. 访问网站：
   - Portal: https://coderbook360.github.io/CoderBooks/
   - CS130-Vue: https://coderbook360.github.io/CoderBooks/cs130-vue/
   - Book2: https://coderbook360.github.io/CoderBooks/book2/

---

## 🔍 测试清单

### Portal 主页
- [ ] https://coderbook360.github.io/CoderBooks/ 加载正常
- [ ] 首页显示所有书籍卡片
- [ ] 点击 "Vue3 生态系统" 跳转到 `/CoderBooks/cs130-vue/`
- [ ] 点击 "第二本书" 跳转到 `/CoderBooks/book2/`
- [ ] 导航菜单工作正常

### CS130-Vue 书籍
- [ ] https://coderbook360.github.io/CoderBooks/cs130-vue/ 加载正常
- [ ] 侧边栏显示所有模块
- [ ] 点击章节链接正常跳转
- [ ] 返回主页链接工作（如果有）
- [ ] 样式和图片加载正常

### Book2 书籍
- [ ] https://coderbook360.github.io/CoderBooks/book2/ 加载正常
- [ ] 教程页面可访问
- [ ] 导航正常

---

## 🛠️ 本地开发

### 启动开发服务器
```bash
# Portal 主页
pnpm run docs:dev

# CS130-Vue 书籍
pnpm run docs:dev:cs130-vue

# Book2
pnpm run docs:dev:book2
```

### 本地构建测试
```bash
# 完整构建
pnpm run docs:build

# 检查构建产物
ls dist
# 预期：index.html, books.html, cs130-vue/, book2/, assets/

# 本地预览（如果 portal 有 preview 脚本）
pnpm run docs:preview
```

---

## 📝 Git 历史（重要节点）

```bash
# 初始提交
git log --oneline --graph
```

**预期提交信息**：
- feat: 配置 CoderBooks monorepo 部署
- fix: 更新所有 VitePress base 路径为 /CoderBooks/
- feat: 添加 GitHub Actions 工作流
- fix: 修复 cs130-vue 构建错误（SSR 源码排除）

---

## 🔧 故障排查

### 问题 1: Portal 链接 404
**可能原因**：base 路径不匹配

**检查**：
```javascript
// packages/portal/docs/.vitepress/config.js
base: '/CoderBooks/'  // 必须匹配仓库名（注意大小写）
```

### 问题 2: 书籍页面 404
**可能原因**：base 路径错误

**检查**：
```javascript
// packages/cs130-vue/docs/.vitepress/config.js
base: '/CoderBooks/cs130-vue/'  // 必须包含仓库名 + 书籍路径
```

### 问题 3: 样式加载失败
**可能原因**：资源路径错误

**解决**：确保 base 路径以 `/` 结尾

### 问题 4: GitHub Actions 失败
**常见原因**：
- pnpm-lock.yaml 缺失或不同步 → `pnpm install` 更新
- 构建脚本错误 → 本地测试 `pnpm run docs:build`
- 权限问题 → 检查 Pages 权限设置

---

## 📈 后续优化

### 1. 添加新书籍
1. 在 `packages/` 创建新目录
2. 添加 VitePress 配置（`base: '/CoderBooks/new-book/'`）
3. 更新根目录 `package.json` 构建脚本
4. 更新 Portal 页面链接
5. 更新 GitHub Actions 工作流

### 2. 自定义域名（可选）
```bash
# 1. 在 DNS 设置 CNAME 记录
# 2. 在 public/ 添加 CNAME 文件
echo "docs.coderbook360.com" > packages/portal/docs/public/CNAME

# 3. 更新所有 base 路径为 '/'
```

### 3. 性能优化
- 启用代码分割
- 优化图片加载
- 添加 Service Worker（PWA）

---

## 📞 技术支持

- GitHub Issues: https://github.com/coderbook360/CoderBooks/issues
- Actions 日志: https://github.com/coderbook360/CoderBooks/actions
- Pages 设置: https://github.com/coderbook360/CoderBooks/settings/pages

---

**最后更新**：2026-01-25  
**当前状态**：✅ 配置完成，等待推送部署  
**预计部署地址**：https://coderbook360.github.io/CoderBooks/
