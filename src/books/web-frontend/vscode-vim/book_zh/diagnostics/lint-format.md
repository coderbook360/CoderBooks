# Lint 与 Format：代码质量流程

代码风格和质量检查是现代开发的标配。配置好 ESLint 和 Prettier，让格式化和检查自动化。

## ESLint 集成

### 安装 ESLint 扩展

在 VSCode 扩展市场搜索"ESLint"并安装。

### 项目配置

确保项目中有 ESLint 配置：

```bash
npm install eslint --save-dev
npx eslint --init
```

### VSCode 设置

```json
{
  "eslint.enable": true,
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

### 保存时自动修复

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

保存文件时，ESLint 会自动修复可自动修复的问题。

## Prettier 集成

### 安装 Prettier 扩展

在 VSCode 扩展市场搜索"Prettier - Code formatter"并安装。

### 项目配置

```bash
npm install prettier --save-dev
```

创建 `.prettierrc`：

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### 设为默认格式化器

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## 格式化快捷键

### 格式化整个文件

| 快捷键 | 效果 |
|--------|------|
| `Shift+Alt+F` | 格式化文件 |

配置 Vim 快捷键：

```json
{
  "before": ["<leader>", "="],
  "commands": ["editor.action.formatDocument"]
}
```

`\=` 格式化整个文件。

### 格式化选中区域

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+K Ctrl+F` | 格式化选中 |

在可视模式中选中后：

```json
{
  "before": ["="],
  "commands": ["editor.action.formatSelection"]
}
```

可视模式下 `=` 格式化选中区域。

## 保存时格式化

最省心的方式——保存时自动格式化：

```json
{
  "editor.formatOnSave": true
}
```

### 仅格式化修改的行

避免大面积格式化导致 Git diff 混乱：

```json
{
  "editor.formatOnSaveMode": "modifications"
}
```

只格式化你修改过的行。

## ESLint + Prettier 协作

ESLint 和 Prettier 可能有规则冲突。使用以下包解决：

```bash
npm install eslint-config-prettier eslint-plugin-prettier --save-dev
```

在 `.eslintrc.js` 中：

```javascript
{
  extends: [
    // 其他配置...
    'plugin:prettier/recommended'  // 必须放在最后
  ]
}
```

这样 Prettier 的规则会覆盖 ESLint 的格式规则。

## TypeScript 检查

TypeScript 编译器本身就是一个检查工具。

### 启用严格模式

在 `tsconfig.json` 中：

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### 类型检查命令

```json
{
  "before": ["<leader>", "t", "c"],
  "commands": ["typescript.reloadProjects"]
}
```

`\tc` 重新加载 TypeScript 项目（解决偶尔的类型不同步问题）。

## 手动触发 Lint

### 运行 ESLint

```
> ESLint: Fix all auto-fixable Problems
```

配置快捷键：

```json
{
  "before": ["<leader>", "l", "f"],
  "commands": ["eslint.executeAutofix"]
}
```

`\lf` 运行 ESLint 自动修复。

### 显示 ESLint 规则

```
> ESLint: Show Output Channel
```

查看 ESLint 的详细输出，调试配置问题。

## 禁用规则

### 行内禁用

```typescript
// eslint-disable-next-line no-console
console.log('debug');

/* eslint-disable */
// 这段代码不检查
/* eslint-enable */
```

### 文件级禁用

文件开头：

```typescript
/* eslint-disable no-console */
```

### 项目级禁用

在 `.eslintrc.js` 中：

```javascript
{
  rules: {
    'no-console': 'off'
  }
}
```

## 自定义规则配置

### 警告 vs 错误

```javascript
{
  rules: {
    'no-console': 'warn',      // 警告
    'no-unused-vars': 'error'  // 错误
  }
}
```

### 规则选项

```javascript
{
  rules: {
    'max-len': ['error', { code: 100 }],
    'quotes': ['error', 'single']
  }
}
```

## 实战工作流

### 开发时

1. 编写代码
2. 保存 → 自动格式化 + ESLint 修复
3. 查看剩余问题
4. 手动修复或添加忽略注释

### 提交前

配置 husky + lint-staged：

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

提交时自动检查和格式化暂存的文件。

### CI 检查

在 CI 中运行完整检查：

```bash
npm run lint
npm run type-check
```

## 配置汇总

settings.json：

```json
{
  "eslint.enable": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.formatOnSaveMode": "modifications"
}
```

Vim 配置：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "="],
      "commands": ["editor.action.formatDocument"]
    },
    {
      "before": ["<leader>", "l", "f"],
      "commands": ["eslint.executeAutofix"]
    },
    {
      "before": ["<leader>", "t", "c"],
      "commands": ["typescript.reloadProjects"]
    }
  ],
  "vim.visualModeKeyBindingsNonRecursive": [
    {
      "before": ["="],
      "commands": ["editor.action.formatSelection"]
    }
  ]
}
```

---

**本章收获**：
- ✅ 配置 ESLint 和 Prettier
- ✅ 实现保存时自动格式化和修复
- ✅ 学会禁用和自定义规则
- ✅ 建立代码质量工作流

**效率提升**：代码格式和质量检查自动化，专注于业务逻辑而非格式细节。
