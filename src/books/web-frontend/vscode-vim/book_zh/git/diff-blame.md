# Git Diff 与 Blame 查看

快速查看代码变更历史和追溯代码来源是日常开发的重要技能。

## Diff 查看

### 查看当前文件变更

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

### 查看所有变更

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

在 Git 面板中：
- `j/k` 导航文件列表
- `Enter` 打开差异视图

### Diff 视图内导航

| 按键 | 操作 |
|------|------|
| `]c` | 下一个变更块 |
| `[c` | 上一个变更块 |
| `j/k` | 逐行移动 |
| `Ctrl+D/U` | 翻页 |
| `gg/G` | 文件开头/结尾 |

### 切换 Diff 模式

**并排对比**：

```json
{
  "diffEditor.renderSideBySide": true
}
```

**内联对比**：

```json
{
  "diffEditor.renderSideBySide": false
}
```

快速切换：

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "d", "s"],
      "commands": ["diffEditor.toggleSideBySide"]
    }
  ]
}
```

## 与特定提交对比

### 与上次提交对比

```json
{
  "before": ["<leader>", "g", "D"],
  "commands": ["git.diffWith"]
}
```

### 与指定分支对比

```json
{
  "before": ["<leader>", "g", "db"],
  "commands": ["git.diffWithBranch"]
}
```

### 查看历史版本

```json
{
  "before": ["<leader>", "g", "h"],
  "commands": ["git.viewHistory"]
}
```

## 行内变更

### 显示行内删除

```json
{
  "diffEditor.renderIndicators": true,
  "diffEditor.renderMarginRevertIcon": true
}
```

### 快速撤销行变更

在 Diff 视图中，点击行号旁的撤销图标，或：

```json
{
  "before": ["<leader>", "g", "r"],
  "commands": ["git.revertSelectedRanges"]
}
```

## Git Blame

### 启用 Blame 信息

```json
{
  "git.blame.statusBarItem.enabled": true,
  "git.blame.editorDecoration.enabled": true
}
```

### 查看当前行 Blame

状态栏显示当前行的提交信息。

### 使用 GitLens

安装 GitLens 扩展获得更强大的 Blame 功能：

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "b"],
      "commands": ["gitlens.toggleFileBlame"]
    },
    {
      "before": ["<leader>", "g", "l"],
      "commands": ["gitlens.toggleLineBlame"]
    }
  ]
}
```

### Blame 信息内容

每行显示：
- 提交作者
- 提交时间
- 提交消息摘要

### 跳转到提交

在 Blame 视图中点击提交 hash 可查看完整提交。

## 历史查看

### 文件历史

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "fh"],
      "commands": ["git.viewFileHistory"]
    }
  ]
}
```

### 行历史

```json
{
  "before": ["<leader>", "g", "lh"],
  "commands": ["gitlens.showLineHistory"]
}
```

### 时间线视图

VSCode 内置时间线：

```json
{
  "before": ["<leader>", "g", "t"],
  "commands": ["timeline.focus"]
}
```

## 比较文件版本

### 与工作区版本比较

选择历史提交后：

```json
{
  "before": ["<leader>", "g", "cw"],
  "commands": ["git.timeline.compareWithWorking"]
}
```

### 与前一版本比较

```json
{
  "before": ["<leader>", "g", "cp"],
  "commands": ["git.timeline.compareWithPrevious"]
}
```

### 与选中版本比较

```json
{
  "before": ["<leader>", "g", "cs"],
  "commands": ["git.timeline.compareWithSelected"]
}
```

## GitLens 高级功能

### Hover 信息

鼠标悬停或光标停留显示详细 Blame：

```json
{
  "gitlens.hovers.currentLine.over": "line",
  "gitlens.hovers.enabled": true
}
```

### 代码镜头

在函数/类上方显示最近更改：

```json
{
  "gitlens.codeLens.enabled": true,
  "gitlens.codeLens.recentChange.enabled": true,
  "gitlens.codeLens.authors.enabled": true
}
```

### Revision 导航

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "["],
      "commands": ["gitlens.diffWithPrevious"]
    },
    {
      "before": ["<leader>", "g", "]"],
      "commands": ["gitlens.diffWithNext"]
    }
  ]
}
```

## 搜索提交

### 按消息搜索

```json
{
  "before": ["<leader>", "g", "/"],
  "commands": ["gitlens.showCommitSearch"]
}
```

### 按作者搜索

在搜索框中使用 `@author` 语法。

### 按文件搜索

在搜索框中使用 `#file` 语法。

## 完整键位配置

```json
{
  "vim.normalModeKeyBindings": [
    // Diff 查看
    { "before": ["<leader>", "g", "d"], "commands": ["git.openChange"] },
    { "before": ["<leader>", "g", "D"], "commands": ["git.diffWith"] },
    { "before": ["<leader>", "d", "s"], "commands": ["diffEditor.toggleSideBySide"] },
    { "before": ["]", "c"], "commands": ["workbench.action.editor.nextChange"] },
    { "before": ["[", "c"], "commands": ["workbench.action.editor.previousChange"] },
    
    // Blame
    { "before": ["<leader>", "g", "b"], "commands": ["gitlens.toggleFileBlame"] },
    { "before": ["<leader>", "g", "l"], "commands": ["gitlens.toggleLineBlame"] },
    
    // 历史
    { "before": ["<leader>", "g", "h"], "commands": ["git.viewHistory"] },
    { "before": ["<leader>", "g", "fh"], "commands": ["git.viewFileHistory"] },
    { "before": ["<leader>", "g", "t"], "commands": ["timeline.focus"] },
    
    // 版本导航
    { "before": ["<leader>", "g", "["], "commands": ["gitlens.diffWithPrevious"] },
    { "before": ["<leader>", "g", "]"], "commands": ["gitlens.diffWithNext"] },
    
    // 搜索
    { "before": ["<leader>", "g", "/"], "commands": ["gitlens.showCommitSearch"] }
  ]
}
```

## 实用工作流

### 代码审查流程

```
1. 查看变更文件列表
   <leader>gg

2. 逐个查看差异
   Enter → 打开 Diff
   ]c/[c → 导航变更

3. 查看代码来源
   <leader>gb → 文件 Blame

4. 追溯历史
   <leader>gh → 提交历史

5. 添加评论/标记
   ...
```

### 追溯 Bug 来源

```
1. 定位问题代码行

2. 查看行 Blame
   <leader>gl

3. 查看引入该行的提交
   点击提交 hash

4. 查看该提交的完整变更
   
5. 如需要，查看更早的版本
   <leader>g[ → 前一版本
```

## 效率技巧总结

| 任务 | 快捷键 |
|------|--------|
| 查看文件变更 | `<leader>gd` |
| 下一个变更 | `]c` |
| 上一个变更 | `[c` |
| 文件 Blame | `<leader>gb` |
| 行 Blame | `<leader>gl` |
| 文件历史 | `<leader>gfh` |
| 时间线 | `<leader>gt` |
| 前一版本 | `<leader>g[` |

## 总结

Git Diff 与 Blame 查看的核心：

1. **Diff 导航**：`]c/[c` 快速定位变更
2. **Blame 查看**：`<leader>gb/gl` 追溯代码来源
3. **历史查看**：时间线和文件历史
4. **版本对比**：与不同版本/分支对比
5. **GitLens**：增强的 Git 信息展示

---

**下一步**：学习常见任务的最优键位组合。
