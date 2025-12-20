# 章节写作指导：settings.json 效率优化配置

## 1. 章节信息
- **章节标题**: settings.json 效率优化配置
- **文件名**: setup/settings-optimization.md
- **所属部分**: 第一部分
- **预计阅读时间**: 25分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 掌握 VSCode Vim settings.json 的所有关键配置项
- 理解每个配置对效率的影响
- 了解配置项之间的相互关系

### 技能目标
- 能够根据需求定制 settings.json
- 能够优化光标、滚动、搜索等行为
- 能够配置 Vim 模式显示与提示

## 3. 内容要点
### 核心配置项（必须全部讲解）
- `vim.useSystemClipboard`: 系统剪贴板集成
- `vim.hlsearch`: 搜索高亮
- `vim.incsearch`: 增量搜索
- `vim.smartcase/ignorecase`: 智能大小写
- `vim.leader`: Leader 键配置
- `vim.easymotion`: EasyMotion 启用
- `vim.sneak`: Sneak 启用
- `vim.surround`: Surround 启用
- `vim.camelCaseMotion.enable`: 驼峰命名移动
- `vim.cursorStylePerMode`: 每个模式的光标样式

### 效率优化配置
- `vim.scroll`: 自定义滚动行为
- `vim.visualstar`: Visual 模式搜索选中文本
- `vim.highlightedyank.enable`: 高亮复制内容
- `vim.statusBarColorControl`: 状态栏颜色提示

## 4. 写作要求
- **开篇方式**: "默认的 VSCode Vim 配置只是起点，通过精心调整 settings.json，你可以将效率再提升 30-50%"
- **结构组织**:
  1. settings.json 位置与编辑方法
  2. 核心配置项详解
  3. 效率优化配置
  4. 作者推荐的最优配置
  5. 不同使用场景的配置方案

- **代码示例**: 提供完整的 settings.json 配置文件

## 5. 技术细节
```json
{
  "vim.easymotion": true,
  "vim.sneak": true,
  "vim.surround": true,
  "vim.incsearch": true,
  "vim.useSystemClipboard": true,
  "vim.useCtrlKeys": true,
  "vim.hlsearch": true,
  "vim.insertModeKeyBindings": [],
  "vim.normalModeKeyBindingsNonRecursive": [],
  "vim.leader": "<space>",
  "vim.handleKeys": {
    "<C-d>": true,
    "<C-u>": true,
    "<C-f>": false,
    "<C-b>": false
  },
  "vim.cursorStylePerMode": {
    "normal": "block",
    "insert": "line",
    "visual": "block"
  },
  "vim.highlightedyank.enable": true,
  "vim.highlightedyank.duration": 200
}
```

## 6. 风格指导
- 提供多种配置方案（保守派、激进派、平衡派）
- 说明每个配置的效率影响（用数据）

## 7. 章节检查清单
- [ ] 提供完整可复制配置
- [ ] 说明每个配置项的作用
- [ ] 提供配置测试方法
- [ ] 说明重新加载配置的方法

## 8. 效率提升承诺
- 完成本章后，编辑体验提升 30-50%
- 配置时间：10-15分钟
- 立即生效，无需重启
