# 🚀 cs130-vue 部署指南

## ✅ 已完成的配置

- [x] GitHub Actions 工作流：`.github/workflows/deploy.yml`
- [x] Git 配置：`.gitignore`
- [x] 项目文档：`README.md`
- [x] VitePress 配置调整：`base: '/'`, `outDir: './.vitepress/dist'`
- [x] Git 仓库初始化
- [x] 远程仓库关联：`git@github.com:coderbook360/cs130-vue.git`

---

## 📋 下一步操作

### 1. 在 GitHub 创建仓库

前往 https://github.com/new 创建仓库：

- **Repository name**: `cs130-vue`
- **Owner**: `coderbook360`
- **Visibility**: Public（GitHub Pages 需要）
- **不要勾选** "Initialize this repository with"（已有本地仓库）

### 2. 推送代码到 GitHub

```bash
cd G:\projects\codebooks\packages\cs130-vue
git push -u origin main
```

### 3. 配置 GitHub Pages

推送成功后：

1. 前往仓库设置：https://github.com/coderbook360/cs130-vue/settings/pages
2. **Source** 选择：`GitHub Actions`（不是 Deploy from a branch）
3. 保存设置

### 4. 等待部署完成

1. 查看 Actions 执行：https://github.com/coderbook360/cs130-vue/actions
2. 等待绿色 ✅（约 2-3 分钟）
3. 访问网站：https://coderbook360.github.io/cs130-vue/

---

## 🔄 后续更新流程

### 本地开发

```bash
cd G:\projects\codebooks\packages\cs130-vue
pnpm install
pnpm run docs:dev
```

### 提交更新

```bash
git add .
git commit -m "更新内容说明"
git push
```

推送后会自动触发 GitHub Actions 部署。

---

## 🛠️ 故障排查

### 问题 1: GitHub Actions 失败

**可能原因**：
- 权限问题：确保仓库设置中 `Settings > Actions > General > Workflow permissions` 选择了 "Read and write permissions"

**解决方案**：
```bash
# 前往仓库设置
Settings > Actions > General > Workflow permissions
# 选择 "Read and write permissions"
# 保存并重新运行失败的工作流
```

### 问题 2: 页面 404

**可能原因**：
- GitHub Pages 未启用
- Source 设置错误

**解决方案**：
```bash
Settings > Pages > Source 必须选择 "GitHub Actions"
```

### 问题 3: 样式/资源加载失败

**可能原因**：
- `base` 配置错误

**解决方案**：
确保 `docs/.vitepress/config.js` 中：
```javascript
base: '/'  // ← 独立仓库必须是根路径
```

### 问题 4: 推送失败（权限问题）

**可能原因**：
- SSH Key 未配置

**解决方案**：
```bash
# 检查 SSH Key
ssh -T git@github.com

# 如果失败，配置 SSH Key
# 参考：https://docs.github.com/en/authentication/connecting-to-github-with-ssh

# 或使用 HTTPS
git remote set-url origin https://github.com/coderbook360/cs130-vue.git
```

---

## 📊 监控与维护

### 查看部署状态

- Actions 面板：https://github.com/coderbook360/cs130-vue/actions
- 最近部署：https://github.com/coderbook360/cs130-vue/deployments

### 性能监控

GitHub Pages 自动支持：
- CDN 加速
- HTTPS
- 流量统计（在 Settings > Insights 查看）

---

## 🔗 相关资源

- 📖 [VitePress 官方文档](https://vitepress.dev/)
- 🚀 [GitHub Actions 文档](https://docs.github.com/en/actions)
- 📄 [GitHub Pages 文档](https://docs.github.com/en/pages)
- 📚 [Monorepo 部署策略](../../../MONOREPO_DEPLOYMENT.md)

---

## 📞 技术支持

遇到问题？
1. 查看 [GitHub Actions 日志](https://github.com/coderbook360/cs130-vue/actions)
2. 检查 [VitePress 构建输出](docs/.vitepress/dist/)
3. 阅读 [故障排查指南](#故障排查)
