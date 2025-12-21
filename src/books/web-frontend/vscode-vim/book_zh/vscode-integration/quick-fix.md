# 快速修复与重构：Ctrl+. 键位优化

你是否遇到过这样的场景：代码中出现红色波浪线（错误提示），你知道 VSCode 能自动修复，但不知道如何快速触发？或者想要提取一段代码为函数，却需要在右键菜单中层层点击？

**Ctrl+.** （或 `Cmd+.`）是 VSCode 最强大却最容易被忽视的快捷键之一。它能触发：
- 🔧 自动修复错误（ESLint、TypeScript 等）
- 🆕 自动导入缺失的模块
- ♻️ 重构操作（提取变量/函数、内联等）
- ⚡ 源代码操作（整理导入、生成代码等）

结合 Vim 的快捷键，整个修复和重构流程可以完全键盘化，效率提升 **5-10 倍**。

## 为什么需要快速修复？

### 传统方式的低效

**场景：修复 ESLint 错误**

假设你的代码有一个 ESLint 错误："Missing semicolon"

**传统方式**：
1. 看到红色波浪线
2. 鼠标移动到错误处
3. 等待提示弹出
4. 点击"快速修复"
5. 选择修复选项
6. 点击确认

**用时**：**8-12 秒**

**Vim + 快速修复方式**：
1. 按 `]d`：跳转到下一个诊断（错误/警告）
2. 按 `Space` `c` `a`：打开快速修复菜单
3. 按 `Enter`：应用第一个修复

**用时**：**2-3 秒**

**效率提升**：**3-4 倍**

## 快速修复基础

### 三种触发方式

**方式 1：原生快捷键**
```
Ctrl+.        (Windows/Linux)
Cmd+.         (macOS)
```

**方式 2：Vim Leader 键（推荐）**
```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // Space + c + a: 代码操作（Code Actions）
    {
      "before": ["<leader>", "c", "a"],
      "commands": ["editor.action.quickFix"]
    },
    // Space + c + r: 重构菜单（Refactor）
    {
      "before": ["<leader>", "c", "r"],
      "commands": ["editor.action.refactor"]
    },
    // Space + c + s: 源代码操作（Source）
    {
      "before": ["<leader>", "c", "s"],
      "commands": ["editor.action.sourceAction"]
    }
  ]
}
```

**方式 3：灯泡图标（不推荐）**
鼠标点击代码左侧的黄色灯泡 💡 图标

### 完整的 Vim 友好配置

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // ===== 快速修复与重构 =====
    // Space + c + a: 快速修复/代码操作
    {
      "before": ["<leader>", "c", "a"],
      "commands": ["editor.action.quickFix"]
    },
    // Space + c + r: 重构菜单
    {
      "before": ["<leader>", "c", "r"],
      "commands": ["editor.action.refactor"]
    },
    // Space + c + s: 源代码操作
    {
      "before": ["<leader>", "c", "s"],
      "commands": ["editor.action.sourceAction"]
    },
    // Space + o + i: 整理导入
    {
      "before": ["<leader>", "o", "i"],
      "commands": ["editor.action.organizeImports"]
    },
    // Space + c + f: 格式化文档
    {
      "before": ["<leader>", "c", "f"],
      "commands": ["editor.action.formatDocument"]
    },
    
    // ===== 诊断导航 =====
    // ] + d: 下一个诊断
    {
      "before": ["]", "d"],
      "commands": ["editor.action.marker.nextInFiles"]
    },
    // [ + d: 上一个诊断
    {
      "before": ["[", "d"],
      "commands": ["editor.action.marker.prevInFiles"]
    },
    // ] + e: 下一个错误（跳过警告）
    {
      "before": ["]", "e"],
      "commands": ["editor.action.marker.next"]
    },
    // [ + e: 上一个错误
    {
      "before": ["[", "e"],
      "commands": ["editor.action.marker.prev"]
    }
  ]
}
```


## 实战场景：快速修复

### 场景 1：自动导入缺失的模块

**问题**：使用了未导入的符号

```typescript
const [state, setState] = useState(0);  // ❌ 'useState' is not defined
```

**操作序列**：
1. 光标移动到 `useState`（按 `w` 跳转到单词）
2. 按 `Space` `c` `a`：打开快速修复菜单
3. 看到建议：
   ```
   > Add import from 'react'
   Add all missing imports
   ```
4. 按 `Enter`：应用第一个修复

**结果**：
```typescript
import { useState } from 'react';  // ✅ 自动添加

const [state, setState] = useState(0);
```

**用时**：**2-3 秒**

**对比传统方式**：
- 手动输入导入语句：**10-15 秒**
- 效率提升：**3-7 倍**

### 场景 2：修复 TypeScript 类型错误

**问题**：参数类型不匹配

```typescript
function add(a: number, b: number) {
  return a + b;
}

add('1', 2);  // ❌ Argument of type 'string' is not assignable to parameter of type 'number'
```

**操作序列**：
1. 按 `]d`：跳转到错误位置
2. 按 `Space` `c` `a`
3. 看到建议：
   ```
   > Convert to number
   Change parameter type to 'string | number'
   Add type assertion
   ```
4. 选择修复方案，按 `Enter`

**方案 1：转换为数字**
```typescript
add(Number('1'), 2);  // ✅ 类型正确
```

**方案 2：修改函数签名**
```typescript
function add(a: string | number, b: number) {
  return a + b;  // 需要进一步处理
}
```

**用时**：**3-5 秒**

### 场景 3：修复 ESLint 错误

**问题**：缺少分号（根据 ESLint 规则）

```typescript
const name = 'John'  // ❌ Missing semicolon.
```

**操作序列**：
1. 按 `]d`：跳转到警告位置
2. 按 `Space` `c` `a`
3. 看到建议：`Add semicolon`
4. 按 `Enter`

**结果**：
```typescript
const name = 'John';  // ✅
```

**批量修复**：
如果文件中有多个相同的 ESLint 错误，可以批量修复：

**操作序列**：
1. 按 `Space` `c` `a`
2. 选择 `Fix all auto-fixable problems`
3. 按 `Enter`

**用时**：**2 秒**（修复所有可自动修复的问题）

### 场景 4：添加缺失的接口属性

**问题**：对象字面量缺少属性

```typescript
interface User {
  name: string;
  email: string;
  age: number;
}

const user: User = {  // ❌ Type '{ name: string; }' is missing properties: email, age
  name: 'John'
};
```

**操作序列**：
1. 光标在 `user` 上
2. 按 `Space` `c` `a`
3. 看到建议：
   ```
   > Add missing properties
   Add 'email' property
   Add 'age' property
   ```
4. 选择 `Add missing properties`
5. 按 `Enter`

**结果**：
```typescript
const user: User = {
  name: 'John',
  email: '',  // ✅ 自动添加
  age: 0      // ✅ 自动添加
};
```

**用时**：**3-4 秒**

### 场景 5：实现接口方法

**问题**：类未实现接口的所有方法

```typescript
interface Repository {
  save(data: any): void;
  find(id: string): any;
  delete(id: string): void;
}

class UserRepository implements Repository {  // ❌ Class incorrectly implements interface
  save(data: any) {
    // ...
  }
}
```

**操作序列**：
1. 光标在 `UserRepository` 上
2. 按 `Space` `c` `a`
3. 看到建议：`Implement interface 'Repository'`
4. 按 `Enter`

**结果**：
```typescript
class UserRepository implements Repository {
  save(data: any) {
    // ...
  }
  find(id: string) {  // ✅ 自动生成方法签名
    throw new Error('Method not implemented.');
  }
  delete(id: string): void {  // ✅ 自动生成方法签名
    throw new Error('Method not implemented.');
  }
}
```

**用时**：**2-3 秒**

## 实战场景：重构操作

### 场景 6：提取变量

**任务**：将复杂表达式提取为变量

```typescript
console.log(items.filter(x => x.active).length);
```

**操作序列**：
1. 按 `v`：进入 Visual 模式
2. 选中 `items.filter(x => x.active)`
3. 按 `Space` `c` `r`：打开重构菜单
4. 看到选项：
   ```
   > Extract to constant in enclosing scope
   Extract to constant in module scope
   ```
5. 选择并按 `Enter`
6. 输入变量名：`activeItems`
7. 按 `Enter`

**结果**：
```typescript
const activeItems = items.filter(x => x.active);
console.log(activeItems.length);
```

**用时**：**5-8 秒**

**对比手动操作**：
- 手动剪切、粘贴、创建变量：**20-30 秒**
- 效率提升：**3-6 倍**

### 场景 7：提取函数

**任务**：将多行代码提取为函数

```typescript
// 选中以下代码
const total = items.reduce((sum, item) => sum + item.price, 0);
const tax = total * 0.1;
const final = total + tax;
console.log(final);
```

**操作序列**：
1. 按 `V`：进入行可视模式
2. 用 `j` 选中多行
3. 按 `Space` `c` `r`
4. 选择 `Extract to function in module scope`
5. 输入函数名：`calculateFinalPrice`
6. 按 `Enter`

**结果**：
```typescript
function calculateFinalPrice() {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const tax = total * 0.1;
  const final = total + tax;
  console.log(final);
}

calculateFinalPrice();
```

**进一步优化**：修改函数签名，添加参数和返回值

```typescript
function calculateFinalPrice(items: Item[]): number {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const tax = total * 0.1;
  return total + tax;
}

const final = calculateFinalPrice(items);
console.log(final);
```

**用时**：**8-12 秒**

### 场景 8：内联变量/函数

**任务**：将临时变量内联回使用处

```typescript
const name = user.name;
console.log(name);
console.log(name);
```

**操作序列**：
1. 光标移动到 `name` 变量声明
2. 按 `Space` `c` `r`
3. 选择 `Inline variable`
4. 按 `Enter`

**结果**：
```typescript
console.log(user.name);
console.log(user.name);
```

**用时**：**3-4 秒**

**适用场景**：
- 临时变量只使用一两次
- 变量名没有提供额外的语义价值
- 简化代码，提高可读性

### 场景 9：转换为箭头函数/普通函数

**任务**：在箭头函数和普通函数之间转换

```typescript
function greet(name: string) {
  return `Hello, ${name}`;
}
```

**操作序列**：
1. 光标在 `function` 关键字上
2. 按 `Space` `c` `r`
3. 选择 `Convert to arrow function`
4. 按 `Enter`

**结果**：
```typescript
const greet = (name: string) => {
  return `Hello, ${name}`;
};
```

**进一步优化**（自动）：
```typescript
const greet = (name: string) => `Hello, ${name}`;
```

**用时**：**3-5 秒**

### 场景 10：生成 getter/setter

**任务**：为类属性生成访问器

```typescript
class User {
  private _name: string;
  
  constructor(name: string) {
    this._name = name;
  }
}
```

**操作序列**：
1. 光标在 `_name` 属性上
2. 按 `Space` `c` `s`：源代码操作
3. 选择 `Generate 'get' and 'set' accessors`
4. 按 `Enter`

**结果**：
```typescript
class User {
  private _name: string;
  
  constructor(name: string) {
    this._name = name;
  }
  
  public get name(): string {
    return this._name;
  }
  
  public set name(value: string) {
    this._name = value;
  }
}
```

**用时**：**3-4 秒**

## 高效工作流模式

### 模式 1：诊断 → 修复 → 下一个

快速修复所有错误：

```
]d              跳转到下一个诊断
Space c a       打开快速修复
Enter           应用修复
]d              跳到下一个
Space c a       修复
Enter
...
```

**用时**：**每个错误 2-3 秒**

**传统方式**：每个错误 8-12 秒

**效率提升**：**3-4 倍**

### 模式 2：批量修复工作流

修复一类相同的错误：

```
]d              跳到第一个错误
Space c a       打开快速修复
选择 "Fix all"   批量修复同类问题
Enter
```

**用时**：**3-5 秒**（修复所有同类问题）

### 模式 3：重构 → 测试 → 提交

安全的重构流程：

```
V               选中代码块
Space c r       重构菜单
选择提取操作
输入名称
Enter

Space t r       运行测试（如果配置了）
Space g s       查看 Git 状态
Space g c       提交重构
```

**用时**：**15-25 秒**（完整重构流程）

### 模式 4：导航 → 修复 → 返回

修复远处的错误后返回：

```
]d              跳到错误
Space c a       快速修复
Enter
Ctrl+O          返回上一个位置
```

**用时**：**4-6 秒**

## 源代码操作（Source Actions）

除了快速修复和重构，还有一类"源代码操作"：

### 1. 整理导入

```
Space o i       整理导入（Organize Imports）
```

**效果**：
- 移除未使用的导入
- 按字母顺序排序
- 合并同一模块的导入

**示例**：

**优化前**：
```typescript
import { useState } from 'react';
import { useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { unused } from './unused';
```

**优化后**：
```typescript
import { useEffect, useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
```

### 2. 添加缺失导入

```
Space c s       源代码操作
选择 "Add all missing imports"
```

### 3. 移除未使用代码

```
Space c s
选择 "Remove unused code"
```

## 键位速查表

| 操作 | 快捷键 | 说明 |
|------|--------|------|
| 快速修复 | `Space` `c` `a` | 修复错误、添加导入 |
| 重构菜单 | `Space` `c` `r` | 提取变量/函数、内联等 |
| 源代码操作 | `Space` `c` `s` | 整理导入、生成代码 |
| 整理导入 | `Space` `o` `i` | 快捷方式 |
| 格式化文档 | `Space` `c` `f` | 格式化代码 |
| 下一个诊断 | `]d` | 跳转到下一个问题 |
| 上一个诊断 | `[d` | 跳转到上一个问题 |
| 下一个错误 | `]e` | 跳过警告 |
| 重命名 | `Space` `r` `n` | 智能重命名符号 |

## 常见问题与解决方案

### 问题 1：快速修复菜单是空的

**症状**：按 `Space` `c` `a` 后，菜单显示 "No code actions available"。

**可能原因**：
1. 当前位置没有可用的修复建议
2. 语言服务器未启动或出错
3. 当前文件类型不支持代码操作

**解决方案**：
- 确保光标在有错误/警告的位置（红色或黄色波浪线）
- 检查状态栏，确认语言服务器正常运行
- 尝试重启 VSCode 或重新加载窗口（`Ctrl+Shift+P` → `Reload Window`）

### 问题 2：自动导入不工作

**症状**：使用未导入的符号，但快速修复菜单中没有"添加导入"选项。

**可能原因**：
1. 模块路径配置错误（`tsconfig.json` 或 `jsconfig.json`）
2. 符号所在的包未安装
3. VSCode 未完成文件索引

**解决方案**：
- 确保 `tsconfig.json` 或 `jsconfig.json` 配置正确
- 运行 `npm install` 确保依赖已安装
- 等待 VSCode 完成文件索引（状态栏会显示进度）

### 问题 3：批量修复后出现新错误

**症状**：使用 "Fix all" 后，其他地方出现了新的类型错误。

**原因**：批量修复可能改变了代码结构，影响了其他部分。

**解决方案**：
- 批量修复前先提交代码（便于回滚）
- 批量修复后立即运行测试
- 使用 `git diff` 检查修改内容
- 必要时用 `Ctrl+Z` 撤销

### 问题 4：重构操作找不到想要的选项

**症状**：按 `Space` `c` `r` 后，没有看到"提取函数"等选项。

**原因**：
- 没有选中代码（提取操作需要先选中）
- 当前语言不支持该重构操作
- 选中的代码不符合重构条件（如语法错误）

**解决方案**：
- 使用 Visual 模式选中代码：`v` 或 `V`
- 确保选中的代码是完整的表达式或语句
- 修复语法错误后再尝试重构

## 效率对比与最佳实践

### 效率对比

| 任务 | 传统方式 | Vim + 快速修复 | 效率提升 |
|------|----------|----------------|----------|
| 修复单个错误 | 8-12 秒 | 2-3 秒 | **3-4 倍** |
| 自动导入 | 10-15 秒 | 2-3 秒 | **3-7 倍** |
| 提取变量 | 20-30 秒 | 5-8 秒 | **3-6 倍** |
| 提取函数 | 60-90 秒 | 8-12 秒 | **5-10 倍** |
| 批量修复 | 5-10 分钟 | 3-5 秒 | **60-200 倍** |
| 整理导入 | 30-60 秒 | 1-2 秒 | **15-60 倍** |

### 最佳实践

1. **养成诊断导航习惯**：
   - 用 `]d` 和 `[d` 在错误间跳转
   - 不要用鼠标滚动查找错误

2. **优先使用快速修复**：
   - 看到错误提示，先尝试 `Space` `c` `a`
   - VSCode 的自动修复通常比手动修改更准确

3. **重构前先测试**：
   - 确保当前代码能正常运行
   - 重构后立即运行测试

4. **小步快跑**：
   - 每次只做一个重构操作
   - 重构后立即提交（独立的 commit）

5. **利用批量修复**：
   - 同类错误使用 "Fix all"
   - 节省大量时间

6. **定期整理导入**：
   - 保持代码整洁
   - 提高编译速度（移除未使用的导入）

7. **配合其他重构工具**：
   - 快速修复 + 重命名（`Space` `r` `n`）
   - 快速修复 + 格式化（`Space` `c` `f`）

## 总结

`Ctrl+.`（快速修复）是 VSCode 最强大的生产力工具之一。结合 Vim 的键位配置，可以实现：

**核心功能**：
1. **自动修复错误**：ESLint、TypeScript、Prettier 等
2. **智能导入**：自动添加缺失的 import 语句
3. **代码重构**：提取变量/函数、内联、转换等
4. **源代码操作**：整理导入、生成代码、批量修复

**效率提升**：
- 单次修复：**2-3 秒** vs 传统方式 **8-15 秒**
- 效率提升：**3-7 倍**
- 批量操作：效率提升可达 **60-200 倍**
- 每天节省：**15-30 分钟**（假设修复 20-30 个问题）
- 每年节省：**75-150 小时**

**推荐配置**：
```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    { "before": ["<leader>", "c", "a"], "commands": ["editor.action.quickFix"] },
    { "before": ["<leader>", "c", "r"], "commands": ["editor.action.refactor"] },
    { "before": ["<leader>", "c", "s"], "commands": ["editor.action.sourceAction"] },
    { "before": ["<leader>", "o", "i"], "commands": ["editor.action.organizeImports"] },
    { "before": ["]", "d"], "commands": ["editor.action.marker.nextInFiles"] },
    { "before": ["[", "d"], "commands": ["editor.action.marker.prevInFiles"] }
  ]
}
```

掌握快速修复，让代码质量持续提升，重构变得轻松自如。
