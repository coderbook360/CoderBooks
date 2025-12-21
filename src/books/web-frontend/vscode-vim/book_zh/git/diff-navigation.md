# Diff 导航与编辑

在 Diff 视图中高效浏览和编辑更改。

## 打开 Diff 视图

### 查看当前文件更改

```
\gd     打开当前文件与 HEAD 的 diff
```

配置：

```json
{
  "before": ["<leader>", "g", "d"],
  "commands": ["git.openChange"]
}
```

### 查看暂存的更改

```json
{
  "before": ["<leader>", "g", "D"],
  "commands": ["git.openAllChanges"]
}
```

### 与特定版本对比

使用命令面板：

```
Ctrl+Shift+P → "Git: Open Changes"
```

## 在更改间导航

### 跳转命令

```
]c      跳到下一个更改
[c      跳到上一个更改
```

配置：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
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

### 在 Diff 编辑器中

Diff 视图是一个特殊的编辑器，分为左右两栏：

- **左侧**：原始版本（只读）
- **右侧**：当前更改（可编辑）

### 切换焦点

```
Ctrl+1    左侧面板
Ctrl+2    右侧面板
```

## 编辑更改

### 在 Diff 视图中编辑

右侧面板是可编辑的：

```
1. ]c 跳到更改
2. 在右侧编辑
3. 保存文件
```

### 撤销单个更改

```
1. 导航到要撤销的更改
2. 点击更改旁的 "Revert Change" 按钮
```

或使用命令：

```json
{
  "before": ["<leader>", "g", "r"],
  "commands": ["git.revertChange"]
}
```

### 暂存单个更改

```
1. 导航到要暂存的更改
2. 点击 "Stage Change" 按钮
```

命令方式：

```json
{
  "before": ["<leader>", "g", "s", "h"],
  "commands": ["git.stageSelectedRanges"]
}
```

## Gutter 指示器

### 更改标记

编辑器左侧 gutter 显示更改状态：

- **绿色**：新增行
- **蓝色**：修改行
- **红色三角**：删除行

### 点击 gutter

点击更改标记会显示：

- 更改内容预览
- Stage Changes（暂存）
- Revert Changes（撤销）

### 使用键盘操作 gutter

```json
{
  "before": ["<leader>", "g", "h"],
  "commands": ["editor.action.dirtydiff.next"]
}
```

跳到下一个 gutter 更改。

## Inline Diff

### 显示行内更改

有些更改在行内显示：

```
const name = "old";  // 修改前
const name = "new";  // 修改后
```

Inline diff 会高亮 "old" → "new" 的变化。

### 配置 inline diff

```json
{
  "diffEditor.renderSideBySide": false
}
```

设为 false 使用 inline 模式。

切换命令：

```
Ctrl+Shift+P → "Toggle Inline View"
```

## 三方合并

### 合并冲突编辑器

VSCode 提供三方合并编辑器：

- **Base**：共同祖先
- **Incoming**：要合并的分支
- **Current**：当前分支
- **Result**：最终结果

### 导航冲突

```
]x      下一个冲突
[x      上一个冲突
```

配置：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["]", "x"],
      "commands": ["merge-conflict.next"]
    },
    {
      "before": ["[", "x"],
      "commands": ["merge-conflict.previous"]
    }
  ]
}
```

### 解决冲突

```json
{
  // 接受当前更改
  { "before": ["<leader>", "m", "c"], "commands": ["merge-conflict.accept.current"] },
  // 接受传入更改
  { "before": ["<leader>", "m", "i"], "commands": ["merge-conflict.accept.incoming"] },
  // 接受两者
  { "before": ["<leader>", "m", "b"], "commands": ["merge-conflict.accept.both"] }
}
```

## 比较文件

### 比较两个文件

```
1. 在文件浏览器选中第一个文件
2. 右键 "Select for Compare"
3. 选中第二个文件
4. 右键 "Compare with Selected"
```

### 与剪贴板比较

```
Ctrl+Shift+P → "Compare Active File with Clipboard"
```

### 与另一个分支比较

```
Ctrl+Shift+P → "Git: Open File from Another Branch"
```

## Diff 快捷操作

### 完整配置

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 打开 diff
    { "before": ["<leader>", "g", "d"], "commands": ["git.openChange"] },
    
    // 导航更改
    { "before": ["]", "c"], "commands": ["workbench.action.editor.nextChange"] },
    { "before": ["[", "c"], "commands": ["workbench.action.editor.previousChange"] },
    
    // Gutter 操作
    { "before": ["<leader>", "g", "h"], "commands": ["editor.action.dirtydiff.next"] },
    
    // 暂存/撤销
    { "before": ["<leader>", "g", "s", "h"], "commands": ["git.stageSelectedRanges"] },
    { "before": ["<leader>", "g", "r", "h"], "commands": ["git.revertSelectedRanges"] },
    
    // 合并冲突
    { "before": ["]", "x"], "commands": ["merge-conflict.next"] },
    { "before": ["[", "x"], "commands": ["merge-conflict.previous"] },
    { "before": ["<leader>", "m", "c"], "commands": ["merge-conflict.accept.current"] },
    { "before": ["<leader>", "m", "i"], "commands": ["merge-conflict.accept.incoming"] },
    { "before": ["<leader>", "m", "b"], "commands": ["merge-conflict.accept.both"] }
  ]
}
```

## 实用技巧

### 快速审查更改

```
1. \gg 打开 Git 视图
2. 选择要审查的文件
3. Enter 打开 diff
4. ]c / [c 浏览所有更改
5. \gsh 选择性暂存
```

### 精确暂存

只暂存部分更改：

```
1. 在 diff 视图中
2. 选中要暂存的行
3. 执行 Stage Selected Ranges
```

### 撤销部分更改

```
1. 打开 diff
2. 导航到要撤销的更改
3. 使用 gutter 按钮或命令撤销
```

## GitLens 增强

安装 GitLens 扩展获得更多功能：

### 行级历史

```json
{
  "before": ["<leader>", "g", "l"],
  "commands": ["gitlens.showQuickFileHistory"]
}
```

### Blame 信息

```json
{
  "before": ["<leader>", "g", "b"],
  "commands": ["gitlens.toggleFileBlame"]
}
```

### 比较分支

```json
{
  "before": ["<leader>", "g", "B", "c"],
  "commands": ["gitlens.diffWithBranch"]
}
```

---

**本章收获**：
- ✅ 掌握 Diff 视图导航
- ✅ 学会在 Diff 中编辑和暂存
- ✅ 熟练处理合并冲突
- ✅ 使用高级 Diff 功能

**效率提升**：更改审查和处理更精确，支持选择性暂存和撤销。
