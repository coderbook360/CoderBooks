# Stage、Commit、Push 键盘流程

掌握完整的 Stage → Commit → Push 键盘流程，实现无鼠标版本控制。

## 完整提交流程

### 标准流程

```
1. 编写代码
2. 查看变更 → <leader>gg
3. 暂存变更 → <leader>ga
4. 编写提交信息 → <leader>gc
5. 推送远程 → <leader>gp
```

### 快速流程（一键提交）

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "q"],
      "commands": [
        "git.stageAll",
        "git.commit"
      ]
    }
  ]
}
```

## Stage 暂存详解

### 暂存整个文件

光标在文件中时：

```json
{
  "before": ["<leader>", "g", "a"],
  "commands": ["git.stage"]
}
```

### 暂存所有变更

```json
{
  "before": ["<leader>", "g", "A"],
  "commands": ["git.stageAll"]
}
```

### 部分暂存（Hunk）

在 Git 面板或差异视图中：

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "s"],
      "commands": ["git.stageChange"]
    }
  ]
}
```

### 行级暂存

选中要暂存的行后：

```json
{
  "vim.visualModeKeyBindings": [
    {
      "before": ["<leader>", "g", "a"],
      "commands": ["git.stageSelectedRanges"]
    }
  ]
}
```

### 取消暂存

```json
{
  "before": ["<leader>", "g", "u"],
  "commands": ["git.unstage"]
}
```

### 交互式暂存工作流

1. `<leader>gg` → 打开 Git 面板
2. `j/k` → 导航到文件
3. `Enter` → 打开差异视图
4. `]c/[c` → 导航到变更块
5. `<leader>gs` → 暂存当前变更块
6. 重复直到完成

## Commit 提交详解

### 基本提交

```json
{
  "before": ["<leader>", "g", "c"],
  "commands": ["git.commit"]
}
```

执行后：
1. 打开提交信息输入框
2. 输入提交信息
3. `Ctrl+Enter` 确认提交

### 提交信息编写

在提交输入框中：

| 操作 | 按键 |
|------|------|
| 确认提交 | `Ctrl+Enter` |
| 取消 | `Escape` |
| 换行 | `Enter` |

### 修改上次提交

```json
{
  "before": ["<leader>", "g", "C"],
  "commands": ["git.commitAmend"]
}
```

### 快速提交（带信息）

使用任务或命令行：

```json
{
  "before": ["<leader>", "g", "m"],
  "commands": ["workbench.action.terminal.sendSequence"],
  "args": { "text": "git commit -m \"" }
}
```

### 空提交

```json
{
  "before": ["<leader>", "g", "e"],
  "commands": ["git.commitEmpty"]
}
```

### 提交信息模板

创建 `.gitmessage` 文件：

```
feat: 

# feat: 新功能
# fix: 修复
# docs: 文档
# style: 格式
# refactor: 重构
# test: 测试
# chore: 构建/工具
```

配置 Git：

```bash
git config --global commit.template ~/.gitmessage
```

## Push 推送详解

### 基本推送

```json
{
  "before": ["<leader>", "g", "p"],
  "commands": ["git.push"]
}
```

### 强制推送

```json
{
  "before": ["<leader>", "g", "P"],
  "commands": ["git.pushForce"]
}
```

### 推送到新分支

```json
{
  "before": ["<leader>", "g", "pub"],
  "commands": ["git.pushTo"]
}
```

### 推送并设置上游

首次推送新分支时自动设置：

```json
{
  "git.setAutofetchPeriod": "true",
  "git.autofetch": true
}
```

## Pull 拉取

### 基本拉取

```json
{
  "before": ["<leader>", "g", "l"],
  "commands": ["git.pull"]
}
```

### 拉取并 rebase

```json
{
  "before": ["<leader>", "g", "L"],
  "commands": ["git.pullRebase"]
}
```

### 同步（拉取 + 推送）

```json
{
  "before": ["<leader>", "g", "y"],
  "commands": ["git.sync"]
}
```

## 查看状态

### 状态栏信息

VSCode 底部状态栏显示：
- 当前分支名
- 同步状态（↑↓ 表示推送/拉取数量）
- 变更文件数

### 快速状态

```json
{
  "before": ["<leader>", "g", "t"],
  "commands": ["git.viewHistory"]
}
```

## 完整工作流示例

### 场景：开发新功能

```
1. 创建分支
   <leader>gn → 输入 feature/new-feature

2. 编写代码
   ...正常编辑...

3. 查看变更
   <leader>gg → 打开 Git 面板
   j/k → 导航查看文件

4. 暂存
   <leader>gA → 暂存所有
   或
   <leader>ga → 逐个暂存

5. 提交
   <leader>gc → 打开提交框
   输入: "feat: add new feature"
   Ctrl+Enter → 确认

6. 推送
   <leader>gp → 推送到远程

7. 切回主分支
   <leader>go → 选择 main
```

### 场景：修复 Bug

```
1. 从主分支创建修复分支
   <leader>go → main
   <leader>gn → fix/bug-123

2. 修改代码并测试

3. 部分暂存（只提交相关变更）
   <leader>gg → Git 面板
   选择文件 → Enter
   ]c → 导航到变更
   <leader>gs → 暂存变更块

4. 提交
   <leader>gc → "fix: resolve bug #123"

5. 推送
   <leader>gp

6. 创建 PR（在浏览器或使用 GitHub CLI）
```

## 高级配置

### 自动暂存

每次保存时自动暂存：

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "w"],
      "commands": [
        "workbench.action.files.save",
        "git.stage"
      ]
    }
  ]
}
```

### 提交前检查

使用 pre-commit hooks 或配置：

```json
{
  "git.confirmSync": true,
  "git.enableCommitSigning": false
}
```

### 一键工作流

```json
{
  // 暂存 → 提交（带默认信息）→ 推送
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "quick"],
      "commands": [
        "git.stageAll",
        "git.commit",
        "git.push"
      ]
    }
  ]
}
```

## 完整键位参考

```json
{
  "vim.normalModeKeyBindings": [
    // 基本操作
    { "before": ["<leader>", "g", "g"], "commands": ["workbench.view.scm"] },
    { "before": ["<leader>", "g", "a"], "commands": ["git.stage"] },
    { "before": ["<leader>", "g", "A"], "commands": ["git.stageAll"] },
    { "before": ["<leader>", "g", "u"], "commands": ["git.unstage"] },
    { "before": ["<leader>", "g", "U"], "commands": ["git.unstageAll"] },
    { "before": ["<leader>", "g", "s"], "commands": ["git.stageChange"] },
    
    // 提交
    { "before": ["<leader>", "g", "c"], "commands": ["git.commit"] },
    { "before": ["<leader>", "g", "C"], "commands": ["git.commitAmend"] },
    
    // 推送拉取
    { "before": ["<leader>", "g", "p"], "commands": ["git.push"] },
    { "before": ["<leader>", "g", "P"], "commands": ["git.pushForce"] },
    { "before": ["<leader>", "g", "l"], "commands": ["git.pull"] },
    { "before": ["<leader>", "g", "L"], "commands": ["git.pullRebase"] },
    { "before": ["<leader>", "g", "y"], "commands": ["git.sync"] },
    
    // 分支
    { "before": ["<leader>", "g", "n"], "commands": ["git.branch"] },
    { "before": ["<leader>", "g", "o"], "commands": ["git.checkout"] }
  ],
  "vim.visualModeKeyBindings": [
    { "before": ["<leader>", "g", "a"], "commands": ["git.stageSelectedRanges"] },
    { "before": ["<leader>", "g", "r"], "commands": ["git.revertSelectedRanges"] }
  ]
}
```

## 总结

Stage → Commit → Push 键盘流程：

| 步骤 | 快捷键 | 说明 |
|------|--------|------|
| 查看状态 | `<leader>gg` | 打开 Git 面板 |
| 暂存文件 | `<leader>ga` | 暂存当前文件 |
| 暂存全部 | `<leader>gA` | 暂存所有变更 |
| 暂存块 | `<leader>gs` | 暂存变更块 |
| 提交 | `<leader>gc` | 打开提交框 |
| 推送 | `<leader>gp` | 推送到远程 |
| 拉取 | `<leader>gl` | 拉取更新 |
| 同步 | `<leader>gy` | 拉取 + 推送 |

---

**下一步**：学习分支管理与合并冲突处理。
