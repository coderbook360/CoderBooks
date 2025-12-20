# 性能优化

确保 VSCode Vim 运行流畅，解决可能的性能问题。

## 常见性能问题

### 输入延迟

输入时明显感觉到延迟。

### 光标移动卡顿

hjkl 移动不流畅。

### 启动缓慢

VSCode 启动时间变长。

### 大文件卡顿

打开大文件时编辑器变慢。

## 基础优化

### 禁用不需要的功能

```json
{
  // 禁用 Neovim（如果不需要）
  "vim.enableNeovim": false,
  
  // 禁用 easymotion（如果不用）
  "vim.easymotion": false,
  
  // 禁用 sneak（如果不用）
  "vim.sneak": false,
  
  // 禁用 surround（如果不用）
  "vim.surround": false
}
```

只启用你实际使用的功能。

### 优化搜索高亮

```json
{
  // 搜索高亮可能影响性能
  "vim.hlsearch": true,
  "vim.highlightedyank.enable": false  // 禁用复制高亮
}
```

### 减少 statusBar 更新

```json
{
  "vim.statusBarColorControl": false
}
```

## Neovim 相关优化

### 禁用 Neovim

如果不需要 Neovim 的高级功能：

```json
{
  "vim.enableNeovim": false
}
```

### 使用空 Neovim 配置

如果需要 Neovim，使用最小配置：

```json
{
  "vim.neovimConfigPath": ""
}
```

### 简化 Neovim 配置

`~/.config/nvim/init.vim`:

```vim
" 最小化配置用于 VSCode
set noswapfile
set nobackup
set nowritebackup
```

## VSCode 相关优化

### 编辑器设置

```json
{
  // 减少渲染开销
  "editor.minimap.enabled": false,
  "editor.renderWhitespace": "none",
  "editor.renderControlCharacters": false,
  "editor.renderLineHighlight": "none",
  
  // 减少格式化开销
  "editor.formatOnType": false,
  
  // 关闭不必要的功能
  "editor.occurrencesHighlight": "off",
  "editor.selectionHighlight": false,
  "editor.matchBrackets": "never"
}
```

### 大文件设置

```json
{
  // 大文件阈值
  "editor.largeFileOptimizations": true,
  
  // 词法标记
  "editor.maxTokenizationLineLength": 5000
}
```

### 扩展管理

禁用不需要的扩展，特别是：

- 重型语言扩展
- 实时分析扩展
- 主题渲染复杂的扩展

## 键位映射优化

### 避免递归映射

使用 `NonRecursive` 版本：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 映射
  ]
}
```

### 减少复杂映射

简化多命令映射：

```json
// 避免过长的命令链
{
  "before": ["<leader>", "x"],
  "commands": [
    "command1",
    "command2",
    "command3"
    // 太多命令可能影响性能
  ]
}
```

### 合理使用 timeout

```json
{
  "vim.timeout": true,
  "vim.timeoutLen": 300  // 毫秒
}
```

过长的 timeout 会让多键映射感觉迟钝。

## 诊断性能问题

### 使用 Developer Tools

```
Help → Toggle Developer Tools
→ Performance tab
```

录制操作，分析性能瓶颈。

### 查看扩展主机

```
View → Output → Extension Host
```

查看扩展相关的日志和错误。

### 扩展二分法

```
1. 禁用所有扩展
2. 只启用 Vim
3. 测试性能
4. 逐个启用其他扩展
5. 找出影响性能的扩展
```

## 特定场景优化

### 长行文件

处理有超长行的文件：

```json
{
  "editor.wordWrap": "off",
  "editor.wrappingIndent": "none"
}
```

### JSON/YAML 大文件

```json
{
  "[json]": {
    "editor.folding": true,
    "editor.foldingStrategy": "indentation"
  }
}
```

### 日志文件

```json
{
  "[log]": {
    "editor.minimap.enabled": false,
    "editor.wordWrap": "off"
  }
}
```

## 系统级优化

### 硬件加速

确保 GPU 加速已启用：

```json
{
  "terminal.integrated.gpuAcceleration": "auto"
}
```

### 内存设置

如果遇到内存问题，增加 VSCode 内存限制：

```bash
# 在 VSCode 启动参数中
code --max-memory=8192
```

## 文件监视

减少文件监视开销：

```json
{
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/.git/subtree-cache/**": true,
    "**/node_modules/**": true,
    "**/dist/**": true
  }
}
```

## 推荐配置

### 性能优先配置

```json
{
  // Vim 设置
  "vim.enableNeovim": false,
  "vim.highlightedyank.enable": false,
  "vim.statusBarColorControl": false,
  
  // 编辑器设置
  "editor.minimap.enabled": false,
  "editor.renderWhitespace": "none",
  "editor.occurrencesHighlight": "off",
  
  // 文件设置
  "files.watcherExclude": {
    "**/.git/**": true,
    "**/node_modules/**": true
  }
}
```

### 平衡配置

```json
{
  // Vim 设置 - 保留常用功能
  "vim.enableNeovim": false,
  "vim.easymotion": true,
  "vim.surround": true,
  
  // 编辑器 - 保留有用功能
  "editor.minimap.enabled": true,
  "editor.minimap.renderCharacters": false,
  
  // 适度的文件排除
  "files.watcherExclude": {
    "**/node_modules/**": true
  }
}
```

## 性能监控

### 持续监控

```
1. 注意日常使用中的卡顿
2. 记录发生卡顿的场景
3. 针对性优化
```

### 定期检查

```
1. 定期审查安装的扩展
2. 清理不用的扩展
3. 更新扩展和 VSCode
```

---

**本章收获**：
- ✅ 识别常见的性能问题
- ✅ 掌握优化配置方法
- ✅ 学会诊断性能瓶颈
- ✅ 建立性能监控意识

**效率提升**：流畅的编辑体验让你专注于代码，不被卡顿打断思路。
