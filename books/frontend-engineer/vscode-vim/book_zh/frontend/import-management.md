# 导入管理技巧

导入语句是每个文件的开头。高效管理导入能让代码更整洁。

## 自动导入

### 使用自动补全

```
1. 输入符号名称（如 useState）
2. 出现补全提示
3. 选择带有导入信息的选项
4. Tab 确认，自动添加导入语句
```

### 快速修复导入

```
1. 使用未导入的符号
2. 出现红色波浪线
3. \a 打开 Quick Fix
4. 选择 "Add import from ..."
```

### 配置自动导入

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "javascript.preferences.importModuleSpecifier": "relative",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## 整理导入

### 排序导入

VSCode 命令：

```
Shift+Alt+O   整理导入（排序+删除未使用）
```

键位映射：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "o", "i"],
      "commands": ["editor.action.organizeImports"]
    }
  ]
}
```

### 删除未使用导入

保存时自动删除：

```json
{
  "editor.codeActionsOnSave": {
    "source.organizeImports": "explicit"
  }
}
```

或手动触发 `\oi`。

### 导入排序规则

使用 ESLint 插件控制排序：

```json
// .eslintrc
{
  "rules": {
    "import/order": ["error", {
      "groups": [
        "builtin",
        "external",
        "internal",
        "parent",
        "sibling",
        "index"
      ],
      "newlines-between": "always"
    }]
  }
}
```

## 导入语句操作

### 添加新导入

手动添加：

```
1. gg 跳到文件开头
2. O 上方新建行
3. 输入 import 语句
```

### 修改导入

```javascript
import { useState } from 'react';
// 添加 useEffect
```

操作：

```
1. /useState 搜索
2. ea, useEffect 追加
```

或者：

```
1. 光标在 useState 上
2. A, useEffect 在行内追加
```

### 删除导入

```
1. /import 搜索
2. dd 删除行
```

### 切换导入方式

```javascript
// 从
import { Button } from './Button';
// 到
import Button from './Button';
```

```
1. f{ 跳到 {
2. ds{ 删除花括号
```

反向：

```
1. fB 跳到 Button
2. ysiw{ 给单词加花括号
```

## 模块路径

### 相对路径 vs 绝对路径

```javascript
// 相对路径
import { Button } from '../../components/Button';

// 绝对路径（需要配置）
import { Button } from '@/components/Button';
```

### 配置路径别名

`tsconfig.json`:

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

VSCode 设置：

```json
{
  "javascript.preferences.importModuleSpecifier": "non-relative"
}
```

### 更新导入路径

移动文件后，VSCode 会提示更新导入：

```
1. 移动文件
2. 弹出提示 "Update imports"
3. 确认更新
```

## 批量导入操作

### 合并导入

```javascript
// 之前
import { useState } from 'react';
import { useEffect } from 'react';

// 之后
import { useState, useEffect } from 'react';
```

手动合并：

```
1. 复制 useEffect
2. 粘贴到第一行
3. 删除第二行
```

### 分离导入

```javascript
// 之前
import { useState, useEffect, useCallback } from 'react';

// 之后
import { useState } from 'react';
import { useEffect } from 'react';
import { useCallback } from 'react';
```

这种情况不常见，通常保持合并状态。

## 导入诊断

### 查看未使用导入

TypeScript 显示灰色文字表示未使用。

删除单个未使用导入：

```
1. 光标在导入符号上
2. \a 打开 Quick Fix
3. 选择 "Remove unused import"
```

### 解决导入错误

```
1. 查看错误信息
2. 检查路径是否正确
3. 检查模块是否安装
4. 检查 tsconfig 配置
```

## 动态导入

### 添加动态导入

```javascript
// 静态导入
import { heavy } from './heavy';

// 动态导入
const heavy = await import('./heavy');
```

### React 懒加载

```javascript
import { lazy, Suspense } from 'react';

const LazyComponent = lazy(() => import('./Component'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <LazyComponent />
    </Suspense>
  );
}
```

## 类型导入

### TypeScript 类型导入

```typescript
// 值和类型一起导入
import { Component, ComponentProps } from './Component';

// 仅导入类型
import type { ComponentProps } from './Component';
```

### 配置类型导入

```json
// tsconfig.json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true
  }
}
```

强制使用 `import type` 导入类型。

## 常用 snippets

```json
{
  "Import React": {
    "prefix": "imr",
    "body": "import React from 'react';"
  },
  "Import useState": {
    "prefix": "ims",
    "body": "import { useState } from 'react';"
  },
  "Import useEffect": {
    "prefix": "ime",
    "body": "import { useEffect } from 'react';"
  },
  "Import Component": {
    "prefix": "imc",
    "body": "import { ${1:Component} } from './${1:Component}';"
  }
}
```

## 键位映射

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 整理导入
    {
      "before": ["<leader>", "o", "i"],
      "commands": ["editor.action.organizeImports"]
    },
    // 跳到文件开头（导入区域）
    {
      "before": ["<leader>", "g", "i"],
      "after": ["g", "g"]
    },
    // 添加缺失导入
    {
      "before": ["<leader>", "a", "i"],
      "commands": ["editor.action.sourceAction", { "kind": "source.addMissingImports" }]
    }
  ]
}
```

## 最佳实践

### 导入顺序规范

```javascript
// 1. React/框架
import React, { useState, useEffect } from 'react';

// 2. 第三方库
import axios from 'axios';
import { format } from 'date-fns';

// 3. 内部模块（绝对路径）
import { api } from '@/services/api';

// 4. 相对路径导入
import { Button } from './Button';
import styles from './styles.module.css';
```

### 使用 barrel 文件

```javascript
// components/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Card } from './Card';

// 使用
import { Button, Input, Card } from '@/components';
```

### 避免循环导入

- 保持单向依赖
- 使用依赖注入
- 拆分公共模块

---

**本章收获**：
- ✅ 掌握自动导入功能
- ✅ 学会整理和优化导入
- ✅ 理解导入路径配置
- ✅ 建立良好的导入习惯

**效率提升**：自动导入+整理导入，不再手动管理繁琐的导入语句。
