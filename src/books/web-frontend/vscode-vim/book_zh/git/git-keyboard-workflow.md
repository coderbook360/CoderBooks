# Git 操作完全键盘化

将所有 Git 操作键盘化，实现高效的版本控制工作流。

## 打开 Git 面板

### 快捷键配置

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "g"],
      "commands": ["workbench.view.scm"]
    }
  ]
}
```

也可以使用 `Ctrl+Shift+G`。

## 文件状态查看

### 查看变更文件

打开 Git 面板后：

| 按键 | 操作 |
|------|------|
| `j/k` | 上下导航文件 |
| `Enter` | 打开文件差异 |
| `o` | 在侧边打开 |
| `Space` | 展开/折叠 |

### 行内变更指示

启用行内 Git 装饰：

```json
{
  "git.decorations.enabled": true,
  "editor.lineDecorationsWidth": 20
}
```

### 快速查看行变更

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "h"],
      "commands": ["editor.action.showHover"]
    }
  ]
}
```

## 变更导航

### 跳转到下一个变更

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["]", "c"],
      "commands": ["workbench.action.editor.nextChange"]
    },
    {
      "before": ["[", "c"],
      "commands": ["workbench.action.editor.previousChange"]
    }
  ]
}
```

### 查看行详情

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "b"],
      "commands": ["git.timeline.openDiff"]
    }
  ]
}
```

## 暂存操作

### 暂存当前文件

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "a"],
      "commands": ["git.stage"]
    }
  ]
}
```

### 暂存所有文件

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "A"],
      "commands": ["git.stageAll"]
    }
  ]
}
```

### 取消暂存

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "u"],
      "commands": ["git.unstage"]
    },
    {
      "before": ["<leader>", "g", "U"],
      "commands": ["git.unstageAll"]
    }
  ]
}
```

### 暂存选中区域

在 Visual 模式下选中代码后：

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

## 撤销变更

### 撤销当前文件

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "r"],
      "commands": ["git.revertSelectedRanges"]
    }
  ]
}
```

### 撤销选中区域

```json
{
  "vim.visualModeKeyBindings": [
    {
      "before": ["<leader>", "g", "r"],
      "commands": ["git.revertSelectedRanges"]
    }
  ]
}
```

### 撤销所有变更

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "R"],
      "commands": ["git.cleanAll"]
    }
  ]
}
```

## Diff 查看

### 打开差异视图

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "d"],
      "commands": ["git.openChange"]
    }
  ]
}
```

### 差异视图内导航

| 按键 | 操作 |
|------|------|
| `]c` | 下一个变更 |
| `[c` | 上一个变更 |
| `j/k` | 上下移动 |
| `zM` | 折叠所有 |
| `zR` | 展开所有 |

### 并排对比

```json
{
  "diffEditor.renderSideBySide": true
}
```

### 内联对比

```json
{
  "diffEditor.renderSideBySide": false
}
```

## 提交操作

### 打开提交输入框

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "c"],
      "commands": ["git.commit"]
    }
  ]
}
```

### 提交并修改信息

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "C"],
      "commands": ["git.commitAmend"]
    }
  ]
}
```

### 快速提交（跳过输入）

配置 Git 默认信息或使用命令面板。

## 推送和拉取

### 推送

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "p"],
      "commands": ["git.push"]
    }
  ]
}
```

### 拉取

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "P"],
      "commands": ["git.pull"]
    }
  ]
}
```

### 同步

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "s"],
      "commands": ["git.sync"]
    }
  ]
}
```

## 分支操作

### 创建分支

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "n"],
      "commands": ["git.branch"]
    }
  ]
}
```

### 切换分支

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "o"],
      "commands": ["git.checkout"]
    }
  ]
}
```

### 删除分支

通过命令面板：`Git: Delete Branch`

## Stash 操作

### 保存到 Stash

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "S"],
      "commands": ["git.stash"]
    }
  ]
}
```

### 弹出 Stash

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "O"],
      "commands": ["git.stashPop"]
    }
  ]
}
```

## Git Blame

### 查看行 Blame

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "l"],
      "commands": ["git.blameStatusBarItem.toggle"]
    }
  ]
}
```

### 使用 GitLens

安装 GitLens 扩展后：

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "l"],
      "commands": ["gitlens.toggleLineBlame"]
    },
    {
      "before": ["<leader>", "g", "f"],
      "commands": ["gitlens.toggleFileBlame"]
    }
  ]
}
```

## 完整键位配置

```json
{
  "vim.normalModeKeyBindings": [
    // 面板和导航
    { "before": ["<leader>", "g", "g"], "commands": ["workbench.view.scm"] },
    { "before": ["]", "c"], "commands": ["workbench.action.editor.nextChange"] },
    { "before": ["[", "c"], "commands": ["workbench.action.editor.previousChange"] },
    
    // 暂存
    { "before": ["<leader>", "g", "a"], "commands": ["git.stage"] },
    { "before": ["<leader>", "g", "A"], "commands": ["git.stageAll"] },
    { "before": ["<leader>", "g", "u"], "commands": ["git.unstage"] },
    { "before": ["<leader>", "g", "U"], "commands": ["git.unstageAll"] },
    
    // 撤销
    { "before": ["<leader>", "g", "r"], "commands": ["git.revertSelectedRanges"] },
    { "before": ["<leader>", "g", "R"], "commands": ["git.cleanAll"] },
    
    // 提交
    { "before": ["<leader>", "g", "c"], "commands": ["git.commit"] },
    { "before": ["<leader>", "g", "C"], "commands": ["git.commitAmend"] },
    
    // 推送拉取
    { "before": ["<leader>", "g", "p"], "commands": ["git.push"] },
    { "before": ["<leader>", "g", "P"], "commands": ["git.pull"] },
    { "before": ["<leader>", "g", "s"], "commands": ["git.sync"] },
    
    // 分支
    { "before": ["<leader>", "g", "n"], "commands": ["git.branch"] },
    { "before": ["<leader>", "g", "o"], "commands": ["git.checkout"] },
    
    // Stash
    { "before": ["<leader>", "g", "S"], "commands": ["git.stash"] },
    { "before": ["<leader>", "g", "O"], "commands": ["git.stashPop"] },
    
    // Diff
    { "before": ["<leader>", "g", "d"], "commands": ["git.openChange"] },
    
    // Blame
    { "before": ["<leader>", "g", "b"], "commands": ["gitlens.toggleFileBlame"] },
    { "before": ["<leader>", "g", "l"], "commands": ["gitlens.toggleLineBlame"] }
  ],
  "vim.visualModeKeyBindings": [
    { "before": ["<leader>", "g", "a"], "commands": ["git.stageSelectedRanges"] },
    { "before": ["<leader>", "g", "r"], "commands": ["git.revertSelectedRanges"] }
  ]
}
```

## 效率技巧总结

| 任务 | 快捷键 |
|------|--------|
| 打开 Git 面板 | `<leader>gg` |
| 下一个变更 | `]c` |
| 上一个变更 | `[c` |
| 暂存文件 | `<leader>ga` |
| 暂存全部 | `<leader>gA` |
| 撤销变更 | `<leader>gr` |
| 提交 | `<leader>gc` |
| 推送 | `<leader>gp` |
| 拉取 | `<leader>gP` |

## 总结

Git 键盘化工作流的核心：

1. **`<leader>g` 前缀**：所有 Git 操作统一入口
2. **变更导航**：`]c`/`[c` 快速跳转
3. **暂存操作**：`a`/`u` 暂存/取消
4. **提交推送**：`c`/`p` 完成提交流程
5. **分支管理**：`n`/`o` 创建/切换

---

**下一步**：学习 Stage、Commit、Push 的完整键盘流程。
