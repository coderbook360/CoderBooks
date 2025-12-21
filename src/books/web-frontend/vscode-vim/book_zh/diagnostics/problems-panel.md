# 问题诊断：错误与警告导航

代码中的错误和警告需要快速定位和修复。VSCode 的问题面板配合 Vim 键位可以高效地导航和处理诊断信息。

## 问题面板

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+M` | 打开问题面板 |

配置 Vim 快捷键：

```json
{
  "before": ["<leader>", "x", "x"],
  "commands": ["workbench.actions.view.problems"]
}
```

`\xx` 打开问题面板。

## 问题面板导航

问题面板显示所有错误、警告和信息：

- **错误**（红色）：必须修复
- **警告**（黄色）：建议修复
- **信息**（蓝色）：提示

在面板中：
- `j/k`：上下移动
- `Enter`：跳转到问题位置
- `Space`：预览问题

## 快速跳转到问题

### 跳转到下一个/上一个错误

| 快捷键 | 效果 |
|--------|------|
| `F8` | 跳转到下一个问题 |
| `Shift+F8` | 跳转到上一个问题 |

配置 Vim 快捷键：

```json
{
  "before": ["]", "d"],
  "commands": ["editor.action.marker.next"]
},
{
  "before": ["[", "d"],
  "commands": ["editor.action.marker.prev"]
}
```

- `]d`：下一个诊断（Diagnostic）
- `[d`：上一个诊断

这与 Vim 的 `]` / `[` 导航风格一致。

### 只跳转错误（忽略警告）

```json
{
  "before": ["]", "e"],
  "commands": ["editor.action.marker.nextInFiles"]
},
{
  "before": ["[", "e"],
  "commands": ["editor.action.marker.prevInFiles"]
}
```

- `]e`：下一个错误（Error），跨文件
- `[e`：上一个错误，跨文件

## 在编辑器中查看问题

### 悬浮提示

光标在有问题的代码上时，会显示波浪线。`gh` 或悬浮可以看到详细信息：

```json
{
  "before": ["g", "h"],
  "commands": ["editor.action.showHover"]
}
```

### 快速查看

`F8` 跳转到问题后，会在编辑器内显示内联问题描述。

## 快速修复错误

很多问题有自动修复选项：

```json
{
  "before": ["<leader>", "a"],
  "commands": ["editor.action.quickFix"]
}
```

在问题位置按 `\a`，VSCode 会提供修复建议：
- 添加缺失的导入
- 修复拼写错误
- 添加缺失的类型注解
- 等等

## 过滤问题

### 按严重程度

在问题面板顶部可以过滤：
- 只显示错误
- 只显示警告
- 只显示当前文件

### 按文件类型

使用搜索框过滤：

```
*.ts          只显示 TypeScript 文件的问题
!*.test.ts    排除测试文件
```

## 忽略特定警告

### 行内忽略

不同语言有不同的忽略注释：

TypeScript/JavaScript：
```typescript
// @ts-ignore
// eslint-disable-next-line
```

### 全局忽略

在配置文件中忽略：

ESLint (`.eslintrc.js`)：
```javascript
{
  "rules": {
    "no-console": "off"
  }
}
```

TypeScript (`tsconfig.json`)：
```json
{
  "compilerOptions": {
    "noUnusedLocals": false
  }
}
```

## 错误镜头扩展

**Error Lens** 扩展可以在代码行内显示错误信息，不需要悬浮：

安装后，错误信息直接显示在代码行末尾，非常直观。

## 实时错误检查

VSCode 在你编辑时实时检查错误。确保以下设置：

```json
{
  "editor.validate.enabled": true,
  "typescript.validate.enable": true,
  "javascript.validate.enable": true
}
```

## 保存时检查

配置保存时执行 lint：

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 实战工作流

### 工作流 1：修复所有错误

```
1. \xx 打开问题面板
2. 查看错误列表
3. Enter 跳转到第一个错误
4. \a 尝试快速修复
5. ]d 跳转到下一个
6. 重复直到所有错误修复
```

### 工作流 2：批量修复

```
1. Ctrl+Shift+P → "Fix all auto-fixable problems"
2. 自动修复所有可自动修复的问题
3. 检查剩余的手动问题
```

### 工作流 3：专注当前文件

```
1. 在问题面板中过滤当前文件
2. 逐个修复
3. 切换到下一个有问题的文件
```

## 配置汇总

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "x", "x"],
      "commands": ["workbench.actions.view.problems"]
    },
    {
      "before": ["[", "d"],
      "commands": ["editor.action.marker.prev"]
    },
    {
      "before": ["]", "d"],
      "commands": ["editor.action.marker.next"]
    },
    {
      "before": ["[", "e"],
      "commands": ["editor.action.marker.prevInFiles"]
    },
    {
      "before": ["]", "e"],
      "commands": ["editor.action.marker.nextInFiles"]
    },
    {
      "before": ["<leader>", "a"],
      "commands": ["editor.action.quickFix"]
    },
    {
      "before": ["g", "h"],
      "commands": ["editor.action.showHover"]
    }
  ]
}
```

---

**本章收获**：
- ✅ 掌握问题面板的使用
- ✅ 学会 ]d/[d 快速导航
- ✅ 了解快速修复功能
- ✅ 配置保存时自动修复

**效率提升**：不再需要滚动寻找红色波浪线，一键跳转、一键修复。
