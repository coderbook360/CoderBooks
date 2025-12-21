# 分屏与窗口切换策略

高效的分屏管理是提升开发效率的关键，结合 Vim 键位可实现流畅的多窗口工作流。

## 分屏基础

### 创建分屏

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 向右分屏
    {
      "before": ["<leader>", "v"],
      "commands": ["workbench.action.splitEditorRight"]
    },
    // 向下分屏
    {
      "before": ["<leader>", "s"],
      "commands": ["workbench.action.splitEditorDown"]
    }
  ]
}
```

### Vim 原生分屏命令

```json
{
  // Ctrl+W v 垂直分屏
  "before": ["<C-w>", "v"],
  "commands": ["workbench.action.splitEditorRight"]
},
{
  // Ctrl+W s 水平分屏
  "before": ["<C-w>", "s"],
  "commands": ["workbench.action.splitEditorDown"]
}
```

## 窗口切换

### 方向切换

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 向左切换
    { "before": ["<C-h>"], "commands": ["workbench.action.focusLeftGroup"] },
    // 向下切换
    { "before": ["<C-j>"], "commands": ["workbench.action.focusBelowGroup"] },
    // 向上切换
    { "before": ["<C-k>"], "commands": ["workbench.action.focusAboveGroup"] },
    // 向右切换
    { "before": ["<C-l>"], "commands": ["workbench.action.focusRightGroup"] }
  ]
}
```

### Vim 风格切换

```json
{
  "before": ["<C-w>", "h"], "commands": ["workbench.action.focusLeftGroup"]
},
{
  "before": ["<C-w>", "j"], "commands": ["workbench.action.focusBelowGroup"]
},
{
  "before": ["<C-w>", "k"], "commands": ["workbench.action.focusAboveGroup"]
},
{
  "before": ["<C-w>", "l"], "commands": ["workbench.action.focusRightGroup"]
}
```

### 按编号切换

```json
{
  "before": ["<leader>", "1"], "commands": ["workbench.action.focusFirstEditorGroup"]
},
{
  "before": ["<leader>", "2"], "commands": ["workbench.action.focusSecondEditorGroup"]
},
{
  "before": ["<leader>", "3"], "commands": ["workbench.action.focusThirdEditorGroup"]
}
```

## 窗口管理

### 关闭窗口

```json
{
  // 关闭当前窗口
  "before": ["<C-w>", "q"],
  "commands": ["workbench.action.closeActiveEditor"]
},
{
  // 关闭其他窗口
  "before": ["<leader>", "o"],
  "commands": ["workbench.action.closeOtherEditors"]
}
```

### 调整窗口大小

```json
{
  // 增加宽度
  "before": ["<C-w>", ">"],
  "commands": ["workbench.action.increaseViewWidth"]
},
{
  // 减少宽度
  "before": ["<C-w>", "<"],
  "commands": ["workbench.action.decreaseViewWidth"]
},
{
  // 增加高度
  "before": ["<C-w>", "+"],
  "commands": ["workbench.action.increaseViewHeight"]
},
{
  // 减少高度
  "before": ["<C-w>", "-"],
  "commands": ["workbench.action.decreaseViewHeight"]
},
{
  // 均分窗口
  "before": ["<C-w>", "="],
  "commands": ["workbench.action.evenEditorWidths"]
}
```

### 移动窗口

```json
{
  // 移动到左侧组
  "before": ["<C-w>", "H"],
  "commands": ["workbench.action.moveEditorToLeftGroup"]
},
{
  // 移动到右侧组
  "before": ["<C-w>", "L"],
  "commands": ["workbench.action.moveEditorToRightGroup"]
}
```

## 分屏工作流

### 场景 1：左右对比

```
\v          向右分屏
\ff         在新窗口打开其他文件
Ctrl+h/l    在窗口间切换
```

### 场景 2：代码与测试

```
打开代码文件
\v          分屏
\ff         打开对应测试文件
            并排编辑
```

### 场景 3：参考文档

```
打开主代码
\s          向下分屏
            在下方打开参考文件
Ctrl+j/k    上下切换
```

## 最大化与恢复

### 最大化当前窗口

```json
{
  "before": ["<C-w>", "m"],
  "commands": ["workbench.action.toggleEditorWidths"]
}
```

### 切换单一编辑器模式

```json
{
  "before": ["<C-w>", "o"],
  "commands": ["workbench.action.toggleSidebarVisibility", "workbench.action.closePanel"]
}
```

## 键位总结

| 键位 | 操作 |
|------|------|
| `\v` | 向右分屏 |
| `\s` | 向下分屏 |
| `Ctrl+h/j/k/l` | 切换窗口 |
| `\1/2/3` | 聚焦编号窗口 |
| `Ctrl+W q` | 关闭窗口 |
| `\o` | 关闭其他窗口 |
| `Ctrl+W =` | 均分窗口 |
| `Ctrl+W >/<` | 调整宽度 |
| `Ctrl+W +/-` | 调整高度 |

## 配置优化

```json
{
  // 打开文件时的行为
  "workbench.editor.openSideBySideDirection": "right",
  
  // 关闭最后一个编辑器时
  "workbench.editor.closeEmptyGroups": true,
  
  // 聚焦新打开的编辑器
  "workbench.editor.focusRecentEditorAfterClose": true
}
```

---

**效率提升**：分屏操作全键盘化，多文件对比、代码与测试并排编辑流畅自如。
