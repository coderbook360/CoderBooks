# JavaScript/TypeScript 重构实战

重构是提升代码质量的关键技能，掌握 VSCode Vim 的重构工作流让你事半功倍。

## 重命名重构

### 变量重命名

```typescript
// 前
const oldName = 'value';
console.log(oldName);
processData(oldName);

// 后
const newName = 'value';
console.log(newName);
processData(newName);
```

操作：
1. 光标移到 `oldName`
2. `<leader>rn` 或 `F2`
3. 输入 `newName`
4. Enter 确认

### 配置快捷键

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "r", "n"],
      "commands": ["editor.action.rename"]
    }
  ]
}
```

### 函数重命名

```typescript
function oldFunction() { }
oldFunction();
```

同样使用 `F2`，所有调用点自动更新。

## 提取变量

### 使用场景

```typescript
// 前：重复的表达式
const total = items.length * 10 + shipping;
const subtotal = items.length * 10;

// 后：提取变量
const itemCost = items.length * 10;
const total = itemCost + shipping;
const subtotal = itemCost;
```

操作：
1. 选中 `items.length * 10`
2. `Ctrl+Shift+R` 打开重构菜单
3. 选择"Extract to variable"
4. 输入变量名

### 配置快捷键

```json
{
  "vim.visualModeKeyBindings": [
    {
      "before": ["<leader>", "e", "v"],
      "commands": ["editor.action.codeAction", { "args": { "kind": "refactor.extract.variable" } }]
    }
  ]
}
```

## 提取函数

### 使用场景

```typescript
// 前：复杂逻辑内联
function processUser(user) {
  // 验证逻辑
  if (!user.email) throw new Error('Email required');
  if (!user.name) throw new Error('Name required');
  if (user.age < 0) throw new Error('Invalid age');
  
  // 处理逻辑
  saveToDatabase(user);
}

// 后：提取验证函数
function validateUser(user) {
  if (!user.email) throw new Error('Email required');
  if (!user.name) throw new Error('Name required');
  if (user.age < 0) throw new Error('Invalid age');
}

function processUser(user) {
  validateUser(user);
  saveToDatabase(user);
}
```

操作：
1. 选中要提取的代码块
2. `Ctrl+Shift+R`
3. 选择"Extract to function"
4. 输入函数名

### 配置快捷键

```json
{
  "vim.visualModeKeyBindings": [
    {
      "before": ["<leader>", "e", "f"],
      "commands": ["editor.action.codeAction", { "args": { "kind": "refactor.extract.function" } }]
    }
  ]
}
```

## 内联重构

### 内联变量

```typescript
// 前
const temp = user.name;
return temp;

// 后
return user.name;
```

操作：
1. 光标在变量上
2. `Ctrl+Shift+R`
3. 选择"Inline variable"

### 内联函数

```typescript
// 前
function getName(user) {
  return user.name;
}
const name = getName(user);

// 后
const name = user.name;
```

## 移动重构

### 移动到新文件

1. 选中函数或类
2. `Ctrl+Shift+R`
3. 选择"Move to a new file"
4. 自动创建文件并更新导入

### 配置快捷键

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "m", "f"],
      "commands": ["editor.action.codeAction", { "args": { "kind": "refactor.move" } }]
    }
  ]
}
```

## 参数重构

### 添加参数

```typescript
// 前
function greet(name) {
  return `Hello, ${name}!`;
}

// 后：添加 greeting 参数
function greet(name, greeting = 'Hello') {
  return `${greeting}, ${name}!`;
}
```

手动操作：
1. `f(a` → 在参数后添加
2. 使用搜索替换更新调用

### 重新排序参数

需要手动操作或使用专门的扩展。

## 条件重构

### 反转条件

```typescript
// 前
if (!isValid) {
  handleError();
} else {
  processData();
}

// 后
if (isValid) {
  processData();
} else {
  handleError();
}
```

使用 Quick Fix（Ctrl+.）选择"Invert if statement"。

### 提取条件

```typescript
// 前
if (user.age >= 18 && user.email && user.verified) {
  // ...
}

// 后
const isEligible = user.age >= 18 && user.email && user.verified;
if (isEligible) {
  // ...
}
```

选中条件 → 提取变量。

## 解构重构

### 添加解构

```typescript
// 前
function process(user) {
  console.log(user.name);
  console.log(user.email);
}

// 后
function process(user) {
  const { name, email } = user;
  console.log(name);
  console.log(email);
}
```

使用 Quick Fix 或手动添加。

### 展开解构

```typescript
// 前
const { name, email } = user;

// 后
const name = user.name;
const email = user.email;
```

## 类型重构（TypeScript）

### 提取类型

```typescript
// 前
function process(user: { name: string; email: string; age: number }) {}

// 后
interface User {
  name: string;
  email: string;
  age: number;
}
function process(user: User) {}
```

选中类型 → Ctrl+Shift+R → Extract to type alias/interface

### 配置快捷键

```json
{
  "vim.visualModeKeyBindings": [
    {
      "before": ["<leader>", "e", "t"],
      "commands": ["editor.action.codeAction", { "args": { "kind": "refactor.extract.type" } }]
    }
  ]
}
```

## 导入重构

### 整理导入

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "o", "i"],
      "commands": ["editor.action.organizeImports"]
    }
  ]
}
```

功能：
- 移除未使用的导入
- 按字母排序
- 合并相同来源的导入

### 自动导入

输入代码时自动补全并添加导入：

```json
{
  "typescript.suggest.autoImports": true,
  "javascript.suggest.autoImports": true
}
```

## 快速重构菜单

### 统一入口

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "r"],
      "commands": ["editor.action.refactor"]
    }
  ],
  "vim.visualModeKeyBindings": [
    {
      "before": ["<leader>", "r"],
      "commands": ["editor.action.refactor"]
    }
  ]
}
```

### 快速修复

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "c", "a"],
      "commands": ["editor.action.quickFix"]
    }
  ]
}
```

## 手动重构技巧

### 提取常量

```typescript
// 使用搜索替换
// 1. 选中要提取的值
// 2. * 高亮所有匹配
// 3. cgn 修改为常量名
// 4. . 重复

// 前
const timeout = 5000;
setTimeout(fn, 5000);

// 后
const TIMEOUT = 5000;
const timeout = TIMEOUT;
setTimeout(fn, TIMEOUT);
```

### 批量参数修改

使用宏录制：

```typescript
// 修改所有函数签名添加新参数
qa                    // 开始录制
/function<CR>         // 找到函数
f(                    // 跳转到括号
a, options<Esc>       // 添加参数
q                     // 停止录制

@a                    // 应用到下一个
@@                    // 重复
```

## 完整重构键位

```json
{
  "vim.normalModeKeyBindings": [
    { "before": ["<leader>", "r", "n"], "commands": ["editor.action.rename"] },
    { "before": ["<leader>", "r"], "commands": ["editor.action.refactor"] },
    { "before": ["<leader>", "c", "a"], "commands": ["editor.action.quickFix"] },
    { "before": ["<leader>", "o", "i"], "commands": ["editor.action.organizeImports"] }
  ],
  "vim.visualModeKeyBindings": [
    { "before": ["<leader>", "r"], "commands": ["editor.action.refactor"] },
    { "before": ["<leader>", "e", "v"], "commands": ["editor.action.codeAction", { "args": { "kind": "refactor.extract.variable" } }] },
    { "before": ["<leader>", "e", "f"], "commands": ["editor.action.codeAction", { "args": { "kind": "refactor.extract.function" } }] }
  ]
}
```

## 总结

重构工作流核心：

| 操作 | 快捷键 |
|------|--------|
| 重命名 | `<leader>rn` / `F2` |
| 重构菜单 | `<leader>r` |
| 快速修复 | `<leader>ca` |
| 提取变量 | 选中 + `<leader>ev` |
| 提取函数 | 选中 + `<leader>ef` |
| 整理导入 | `<leader>oi` |

---

**下一步**：学习 React 组件开发工作流。
