# 导入跳转：快速定位模块来源

在现代前端项目中，一个文件可能有几十行 import 语句。快速定位到导入模块的源文件，是高频操作。

## 基础导入跳转

### gf - Go to File

在 Vim 中，`gf` 命令可以跳转到光标下的文件路径。VSCode Vim 对此有基础支持：

```typescript
import { Button } from './components/Button';
//                     ↑ 光标放在这里
//                     gf 跳转到 Button.tsx
```

不过 VSCode 原生的 `gd` (Go to Definition) 通常更可靠，因为它使用语言服务器解析模块路径。

### gd vs gf

| 命令 | 工作原理 | 可靠性 |
|------|----------|--------|
| `gf` | 字面路径匹配 | 依赖 Vim 路径配置 |
| `gd` | 语言服务器解析 | 更准确 |

在导入语句上，优先使用 `gd`。

## 处理不同的导入类型

### 相对路径导入

```typescript
import { helper } from './utils/helper';
```

光标放在 `helper` 或路径上，`gd` 直接跳转。

### 别名路径导入

```typescript
import { Button } from '@/components/Button';
```

这需要正确配置 `tsconfig.json` 或 `jsconfig.json`：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

配置正确后，`gd` 能识别别名路径。

### npm 包导入

```typescript
import React from 'react';
import { useState } from 'react';
```

`gd` 会跳转到 `node_modules` 中的类型定义文件（`.d.ts`）。

对于没有类型定义的包，可能跳转到 `package.json` 或实际的 JS 文件。

### 类型导入

```typescript
import type { User } from './types';
```

`gd` 同样有效，跳转到类型定义。

## 快速预览导入

有时只想预览导入内容，不想真的跳转：

```json
{
  "before": ["g", "h"],
  "commands": ["editor.action.showHover"]
}
```

`gh` 显示悬浮提示，包含类型信息和文档。

或者用 Peek 功能：

```json
{
  "before": ["<leader>", "p", "d"],
  "commands": ["editor.action.peekDefinition"]
}
```

`\pd` 打开内联预览窗口，看完按 `Escape` 关闭。

## 批量处理导入

### 组织导入

VSCode 可以自动整理导入语句：

```json
{
  "before": ["<leader>", "i", "o"],
  "commands": ["editor.action.organizeImports"]
}
```

`\io` 效果：
- 移除未使用的导入
- 按规则排序导入
- 合并相同来源的导入

### 添加缺失导入

当你使用了未导入的符号时：

```json
{
  "before": ["<leader>", "i", "a"],
  "commands": ["editor.action.quickFix"]
}
```

`\ia` 打开快速修复菜单，选择"添加导入"。

或者配置自动导入：

```json
{
  "editor.codeActionsOnSave": {
    "source.addMissingImports": true
  }
}
```

保存时自动添加缺失的导入。

## 导入路径智能感知

### 路径补全

在输入导入路径时，`Ctrl+Space` 触发路径补全：

```typescript
import { } from './comp|
//                   ↑ Ctrl+Space 显示 components/ 等选项
```

### 自动导入建议

在代码中输入符号名称时，VSCode 会建议自动导入：

```typescript
const btn = <Button />
//           ↑ 如果 Button 未导入，会显示导入建议
```

按 `Tab` 或 `Enter` 接受建议并自动添加导入语句。

## 处理循环导入

循环导入会导致运行时问题。VSCode 有扩展可以检测：

1. **Import Cost**：显示导入的包大小
2. **Circular Dependency Plugin**：检测循环依赖

发现循环导入后，用导航命令追踪依赖链：

```
A.ts gd→ B.ts gd→ C.ts gd→ A.ts （循环！）
```

## 实战场景

### 场景 1：审查陌生代码

打开一个不熟悉的文件：

```
1. 浏览导入区域
2. 在感兴趣的导入上 gd
3. 快速了解依赖关系
4. Ctrl+O 返回
```

### 场景 2：重构导入路径

项目结构调整后，需要更新导入路径：

```
1. 使用 F2 重命名/移动文件
2. VSCode 自动更新所有导入路径
3. 或手动查找替换
```

### 场景 3：了解 npm 包 API

```
1. 在 useState 上 gd
2. 跳转到 React 类型定义
3. 阅读函数签名和文档
4. Ctrl+O 返回
```

## 配置汇总

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["g", "h"],
      "commands": ["editor.action.showHover"]
    },
    {
      "before": ["<leader>", "p", "d"],
      "commands": ["editor.action.peekDefinition"]
    },
    {
      "before": ["<leader>", "i", "o"],
      "commands": ["editor.action.organizeImports"]
    },
    {
      "before": ["<leader>", "i", "a"],
      "commands": ["editor.action.quickFix"]
    }
  ]
}
```

---

**本章收获**：
- ✅ 掌握 gd 在导入语句上的使用
- ✅ 理解不同导入类型的处理
- ✅ 学会快速预览和组织导入
- ✅ 配置导入相关的快捷键

**效率提升**：导入语句不再是障碍，而是快速理解代码结构的入口。
