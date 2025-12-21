# TypeScript 诊断：类型错误处理

TypeScript 的类型系统是强大的代码检查工具。本章介绍如何高效处理 TypeScript 的类型诊断信息。

## TypeScript 错误类型

### 语法错误

最基本的错误，代码无法解析：

```typescript
const x = ;  // 语法错误
```

### 类型错误

类型不匹配：

```typescript
const name: string = 123;  // Type 'number' is not assignable to type 'string'
```

### 语义错误

逻辑问题，如未使用的变量：

```typescript
const unused = 5;  // 'unused' is declared but its value is never read
```

## 快速跳转类型错误

```json
{
  "before": ["]", "t"],
  "commands": ["editor.action.marker.next"]
},
{
  "before": ["[", "t"],
  "commands": ["editor.action.marker.prev"]
}
```

- `]t`：下一个类型错误
- `[t`：上一个类型错误

## 查看类型信息

### 悬浮查看

光标在变量上，`gh` 显示类型信息：

```json
{
  "before": ["g", "h"],
  "commands": ["editor.action.showHover"]
}
```

### 查看推断类型

对于类型推断的变量，悬浮可以看到推断出的完整类型。

```typescript
const config = getConfig();
//    ↑ gh 查看 config 的推断类型
```

## 常见类型错误及修复

### 1. 缺少类型注解

```typescript
// 错误：Parameter 'x' implicitly has an 'any' type
function add(x, y) {
  return x + y;
}

// 修复：添加类型
function add(x: number, y: number): number {
  return x + y;
}
```

**快速修复**：`\a` → "Infer parameter types from usage"

### 2. 可能为 undefined

```typescript
// 错误：Object is possibly 'undefined'
const user = getUser();
console.log(user.name);

// 修复1：可选链
console.log(user?.name);

// 修复2：非空断言（确定不为空时）
console.log(user!.name);

// 修复3：类型守卫
if (user) {
  console.log(user.name);
}
```

**快速修复**：`\a` → "Add optional chain"

### 3. 类型不匹配

```typescript
// 错误：Argument of type 'string' is not assignable to parameter of type 'number'
function setAge(age: number) { }
setAge("25");

// 修复：转换类型
setAge(Number("25"));
// 或
setAge(parseInt("25", 10));
```

### 4. 缺少属性

```typescript
interface User {
  name: string;
  age: number;
}

// 错误：Property 'age' is missing
const user: User = {
  name: "John"
};

// 修复：添加属性
const user: User = {
  name: "John",
  age: 25
};
```

**快速修复**：`\a` → "Add missing properties"

### 5. 模块未找到

```typescript
// 错误：Cannot find module './utils'
import { helper } from './utils';

// 可能原因：
// 1. 文件不存在
// 2. 路径错误
// 3. 缺少类型声明
```

**解决**：检查文件路径，或安装 @types 包。

## 类型断言

当你比 TypeScript 更了解类型时：

```typescript
// 类型断言
const element = document.getElementById('app') as HTMLDivElement;

// 或
const element = <HTMLDivElement>document.getElementById('app');
```

**注意**：类型断言绕过了类型检查，使用时要确保正确。

## 忽略类型错误

### 单行忽略

```typescript
// @ts-ignore
const x: string = 123;  // 这行的错误被忽略

// @ts-expect-error 更好（如果没有错误会报警）
const y: string = 123;
```

### 文件忽略

文件开头：

```typescript
// @ts-nocheck
```

**不推荐**——失去了类型检查的保护。

## tsconfig 相关配置

### 严格模式

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

等同于启用一系列严格检查：
- `noImplicitAny`
- `strictNullChecks`
- `strictFunctionTypes`
- 等等

### 常用检查选项

```json
{
  "compilerOptions": {
    "noUnusedLocals": true,        // 未使用的变量
    "noUnusedParameters": true,    // 未使用的参数
    "noImplicitReturns": true,     // 缺少返回值
    "noFallthroughCasesInSwitch": true  // switch 贯穿
  }
}
```

## 重新加载 TypeScript

有时 TypeScript 服务会不同步。重新加载：

```
> TypeScript: Restart TS server
```

配置快捷键：

```json
{
  "before": ["<leader>", "t", "r"],
  "commands": ["typescript.restartTsServer"]
}
```

`\tr` 重启 TypeScript 服务。

## 类型检查命令

在终端运行完整类型检查：

```bash
npx tsc --noEmit
```

这会检查所有文件，不生成输出。

## 实战工作流

### 修复类型错误

```
1. \xx 打开问题面板
2. 过滤只显示当前文件
3. ]t 跳转到第一个类型错误
4. gh 查看详细错误信息
5. \a 尝试快速修复
6. 手动修复无法自动修复的问题
7. ]t 继续下一个
```

### 处理大量类型错误

重构或升级后可能有很多类型错误：

```
1. 先修复核心类型定义
2. 类型会自动向下传播
3. 按文件逐个处理
4. 使用批量替换处理相似问题
```

## 配置汇总

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["[", "t"],
      "commands": ["editor.action.marker.prev"]
    },
    {
      "before": ["]", "t"],
      "commands": ["editor.action.marker.next"]
    },
    {
      "before": ["g", "h"],
      "commands": ["editor.action.showHover"]
    },
    {
      "before": ["<leader>", "a"],
      "commands": ["editor.action.quickFix"]
    },
    {
      "before": ["<leader>", "t", "r"],
      "commands": ["typescript.restartTsServer"]
    }
  ]
}
```

---

**本章收获**：
- ✅ 理解 TypeScript 错误类型
- ✅ 掌握类型错误的快速跳转和修复
- ✅ 学会常见类型问题的解决方案
- ✅ 配置 TypeScript 检查选项

**效率提升**：类型错误不再是障碍，而是帮助你写出更健壮代码的工具。
