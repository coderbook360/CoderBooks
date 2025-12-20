# 代码重构：快速修复与重命名

重构是代码质量的关键。VSCode 提供了强大的重构功能，配合 Vim 键位可以快速完成各种重构操作。

## 快速修复 (Quick Fix)

`Ctrl+.` 是 VSCode 最有用的快捷键之一。它会根据上下文提供修复建议：

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+.` | 显示快速修复菜单 |

配置 Vim 快捷键：

```json
{
  "before": ["<leader>", "a"],
  "commands": ["editor.action.quickFix"]
}
```

`\a` 触发快速修复（`a` for action）。

### 常见快速修复

- **添加缺失的导入**：使用未导入的符号时
- **移除未使用的导入**：有多余导入时
- **添加缺失的参数**：函数调用参数不足时
- **实现接口方法**：类实现接口时
- **转换为可选链**：`obj && obj.prop` → `obj?.prop`
- **添加类型注解**：TypeScript 类型推断问题时

### 使用演示

```typescript
const result = calculate(a, b);
//            ↑ calculate 未导入
//            \a → 选择 "Add import from './utils'"
```

## 重命名 (Rename)

`F2` 智能重命名，会更新所有引用：

| 快捷键 | 效果 |
|--------|------|
| `F2` | 重命名符号 |

配置 Vim 快捷键：

```json
{
  "before": ["<leader>", "r", "n"],
  "commands": ["editor.action.rename"]
}
```

`\rn` 触发重命名（rename）。

### 重命名范围

F2 重命名会更新：
- 当前文件的所有引用
- 其他文件的导入语句
- 其他文件的使用位置

这比 Vim 的 `:%s/old/new/g` 更智能——它理解代码语义。

### 使用演示

```typescript
// user.ts
export function getUser(id: string) {
  // ...
}

// app.ts
import { getUser } from './user';
const user = getUser(userId);
```

光标在 `getUser` 上，按 `F2`，输入 `fetchUser`：

```typescript
// user.ts
export function fetchUser(id: string) {
  // ...
}

// app.ts
import { fetchUser } from './user';
const user = fetchUser(userId);
```

所有文件自动更新！

## 提取重构

### 提取变量

选中表达式，然后提取为变量：

```json
{
  "before": ["<leader>", "e", "v"],
  "commands": ["editor.action.codeAction", {
    "kind": "refactor.extract.variable"
  }]
}
```

或者用快速修复菜单：

```
1. 选中表达式
2. \a 或 Ctrl+.
3. 选择 "Extract to variable"
```

### 提取函数

选中代码块，提取为函数：

```
1. V 选中多行代码
2. \a
3. 选择 "Extract to function"
```

### 提取到常量

对于魔法数字或字符串：

```typescript
// 之前
if (status === 200) { ... }

// 选中 200，提取为常量
const HTTP_OK = 200;
if (status === HTTP_OK) { ... }
```

## 移动重构

### 移动到新文件

将函数/类移动到单独的文件：

```
1. 光标在函数名上
2. \a
3. 选择 "Move to a new file"
```

VSCode 会：
- 创建新文件
- 移动代码
- 更新所有导入

### 移动语句

上下移动语句：

| 快捷键 | 效果 |
|--------|------|
| `Alt+↑` | 向上移动当前行/选中行 |
| `Alt+↓` | 向下移动当前行/选中行 |

这与 Vim 的 `ddp`（删除并粘贴）类似，但更智能——它会处理缩进。

## 代码操作菜单

VSCode 的代码操作（Code Actions）包括：
- 快速修复（Quick Fixes）
- 重构（Refactorings）
- 源代码操作（Source Actions）

完整的代码操作菜单：

```json
{
  "before": ["<leader>", "c", "a"],
  "commands": ["editor.action.sourceAction"]
}
```

源代码操作包括：
- 组织导入
- 生成 getter/setter
- 实现接口
- 添加文档注释

## 保存时自动修复

配置保存时自动执行某些修复：

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll": true,
    "source.organizeImports": true
  }
}
```

这会在保存时：
- 修复所有可自动修复的问题
- 整理导入语句

## 实战场景

### 场景 1：批量重命名变量

在整个项目中重命名一个函数：

```
1. gd 跳转到函数定义
2. F2 或 \rn
3. 输入新名称
4. Enter 确认
5. 所有文件自动更新
```

### 场景 2：快速修复类型错误

TypeScript 报错，缺少属性：

```
1. 光标移到错误位置
2. \a 打开快速修复
3. 选择 "Add missing property"
4. 自动添加属性定义
```

### 场景 3：代码提取

长函数需要拆分：

```
1. V 选中要提取的代码
2. \a 打开代码操作
3. 选择 "Extract to function"
4. 输入函数名
5. 代码被提取，原位置变成函数调用
```

## 配置汇总

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "a"],
      "commands": ["editor.action.quickFix"]
    },
    {
      "before": ["<leader>", "r", "n"],
      "commands": ["editor.action.rename"]
    },
    {
      "before": ["<leader>", "c", "a"],
      "commands": ["editor.action.sourceAction"]
    }
  ],
  "vim.visualModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "a"],
      "commands": ["editor.action.quickFix"]
    }
  ]
}
```

在 settings.json 中：

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll": true,
    "source.organizeImports": true
  }
}
```

---

**本章收获**：
- ✅ 掌握快速修复的使用
- ✅ 学会智能重命名
- ✅ 了解提取重构功能
- ✅ 配置保存时自动修复

**效率提升**：重构不再是手动查找替换，IDE 智能处理所有引用更新。
