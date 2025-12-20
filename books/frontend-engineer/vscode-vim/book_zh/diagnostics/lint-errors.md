# ESLint/TypeScript 错误快速修复

ESLint 和 TypeScript 错误是前端开发中最常见的问题类型，掌握快速修复技巧可大幅提升开发效率。

## ESLint 错误修复

### 常见 ESLint 错误

#### 1. 未使用变量

```typescript
const unused = 1  // 'unused' is assigned but never used
```

修复方式：
- `\ca` → "Remove unused variable"
- 或手动删除：`dd`

#### 2. 缺少分号

```typescript
const name = 'John'  // 缺少分号
```

修复方式：
- `\ca` → "Insert ';'"
- 或手动：`A;Esc`

#### 3. 使用 var 而非 let/const

```typescript
var name = 'John'  // 应使用 let 或 const
```

修复方式：
- `\ca` → "Convert to const" / "Convert to let"
- 或手动：`ciwconstEsc`

#### 4. 引号风格

```typescript
const name = "John"  // 应使用单引号
```

修复方式：
- `\ca` → "Replace with single quotes"
- 或手动：`cs"'`

### 批量修复 ESLint

```json
{
  "before": ["<leader>", "e", "f"],
  "commands": ["eslint.executeAutofix"]
}
```

使用：`\ef` 修复当前文件所有可自动修复的问题。

## TypeScript 错误修复

### 常见 TypeScript 错误

#### 1. 类型不匹配

```typescript
const age: number = '25'  // Type 'string' is not assignable to type 'number'
```

修复方式：
- 修改值：`ci'25Esc`
- 或修改类型：`ciwstringEsc`

#### 2. 缺少属性

```typescript
interface User {
  name: string
  email: string
}

const user: User = {
  name: 'John'
  // 缺少 email
}
```

修复方式：
- `\ca` → "Add missing property 'email'"

#### 3. 可能为 undefined

```typescript
function getLength(str?: string) {
  return str.length  // Object is possibly 'undefined'
}
```

修复方式：
- `\ca` → "Add undefined check"
- 或手动添加：`istr && Esc`

#### 4. 缺少导入

```typescript
const user: User = {}  // Cannot find name 'User'
```

修复方式：
- `\ca` → "Add import from './types'"

### 类型快速修复

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 添加类型注解
    {
      "before": ["<leader>", "t", "a"],
      "commands": ["typescript.addMissingTypeAnnotation"]
    },
    // 移除未使用导入
    {
      "before": ["<leader>", "o", "i"],
      "commands": ["editor.action.organizeImports"]
    }
  ]
}
```

## 工作流程

### 场景 1：修复单个错误

```
]d          跳到错误
\ca         查看修复选项
Enter       应用修复
```

### 场景 2：修复文件所有错误

```
\ef         ESLint 自动修复
\fm         格式化文档
```

### 场景 3：逐个审查修复

```
\dd         打开问题面板
j/k         浏览问题
Enter       跳转
\ca         修复
]d          下一个
```

## 自动修复配置

### 保存时自动修复

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  }
}
```

### 格式化时修复

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## 常用修复命令

| 命令 | 键位 | 说明 |
|------|------|------|
| 快速修复 | `\ca` | 显示修复菜单 |
| ESLint 修复 | `\ef` | 修复所有 ESLint |
| 整理导入 | `\oi` | 移除未使用导入 |
| 添加缺失导入 | `\ca` | 在错误处 |
| 格式化 | `\fm` | 格式化文档 |

## 禁用特定规则

### ESLint 禁用

```typescript
// eslint-disable-next-line no-unused-vars
const temp = 1

/* eslint-disable no-console */
console.log('debug')
/* eslint-enable no-console */
```

### TypeScript 禁用

```typescript
// @ts-ignore
const x: string = 123

// @ts-expect-error
const y: number = 'text'
```

### 快捷添加禁用注释

```json
{
  "before": ["<leader>", "e", "i"],
  "commands": ["eslint.executeDisableRule"]
}
```

---

**效率提升**：ESLint/TypeScript 错误秒级修复，保存时自动修复确保代码质量。
