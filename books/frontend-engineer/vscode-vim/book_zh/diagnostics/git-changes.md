# Git 变更快速审查与修复

在代码编写过程中快速审查 Git 变更，是保证代码质量的重要环节。

## 变更导航

### 在变更间跳转

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

使用：
```
]c    跳到下一个变更
[c    跳到上一个变更
```

### 变更指示器

编辑器左侧 gutter 显示变更状态：
- 绿色：新增行
- 蓝色：修改行
- 红色三角：删除位置

## 查看变更详情

### 行内差异

```json
{
  "before": ["<leader>", "g", "d"],
  "commands": ["editor.action.dirtydiff.next"]
}
```

光标在变更处，查看具体修改内容。

### 打开差异视图

```json
{
  "before": ["<leader>", "g", "D"],
  "commands": ["git.openChange"]
}
```

并排显示变更前后的对比。

## 撤销变更

### 撤销单处变更

```json
{
  "before": ["<leader>", "g", "u"],
  "commands": ["git.revertSelectedRanges"]
}
```

使用：光标在变更处 → `\gu` → 撤销该处修改。

### 撤销整个文件变更

```json
{
  "before": ["<leader>", "g", "U"],
  "commands": ["git.clean"]
}
```

**警告**：此操作不可恢复，请谨慎使用。

## 暂存变更

### 暂存当前文件

```json
{
  "before": ["<leader>", "g", "a"],
  "commands": ["git.stage"]
}
```

### 暂存选中区域

1. 在可视模式下选择要暂存的行
2. 执行暂存命令

```json
{
  "before": ["<leader>", "g", "s"],
  "commands": ["git.stageSelectedRanges"]
}
```

## 审查工作流

### 场景 1：提交前审查

```
\gs         打开源代码管理视图
j/k         浏览文件列表
Enter       打开差异视图
]c [c       在变更间跳转
\gu         撤销不需要的变更
\ga         暂存确认的变更
```

### 场景 2：快速审查当前文件

```
]c          跳到第一个变更
            审查变更内容
]c          下一个变更
            ...
\ga         确认无误后暂存
```

### 场景 3：部分暂存

```
V           行选择模式
j/k         选择要暂存的行
\gs         暂存选中区域
```

## Gutter 操作

点击 gutter 中的变更指示器可以：
- 查看变更详情
- 撤销该处变更
- 暂存该处变更

### 键盘操作 gutter

```json
{
  "before": ["<leader>", "g", "p"],
  "commands": ["editor.action.dirtydiff.previous"]
}
```

## 差异视图导航

在差异视图中：

```
]c          下一个差异块
[c          上一个差异块
```

### 差异视图操作

```json
{
  // 在差异视图中接受变更
  "before": ["<leader>", "g", "r"],
  "commands": ["git.revertChange"]
}
```

## 配置优化

```json
{
  // 显示行内差异装饰
  "scm.diffDecorations": "all",
  
  // 差异编辑器设置
  "diffEditor.ignoreTrimWhitespace": false,
  "diffEditor.renderSideBySide": true
}
```

## 键位总结

| 键位 | 操作 |
|------|------|
| `]c` | 下一个变更 |
| `[c` | 上一个变更 |
| `\gd` | 查看变更详情 |
| `\gD` | 打开差异视图 |
| `\gu` | 撤销当前变更 |
| `\gU` | 撤销文件所有变更 |
| `\ga` | 暂存文件 |
| `\gs` | 暂存选中区域 |

## 效率对比

| 操作 | 传统方式 | Vim 方式 |
|------|----------|----------|
| 查看变更 | 鼠标点击 gutter | `]c` / `[c` |
| 撤销变更 | 右键 → 撤销 | `\gu` |
| 暂存文件 | 点击 + 图标 | `\ga` |
| 部分暂存 | 右键 → 暂存选中 | `V` + `\gs` |

---

**效率提升**：Git 变更审查全键盘化，提交前的代码审查流程更加顺畅。
