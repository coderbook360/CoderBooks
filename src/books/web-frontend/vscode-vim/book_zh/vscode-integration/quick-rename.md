# 快速重命名：F2 与 Vim 工作流融合

在重构代码时，你是否遇到过这样的困境：需要重命名一个变量，但它在项目中被引用了几十次甚至上百次？手动查找替换不仅费时，还容易遗漏或误改。如果用鼠标一个个点击，整个流程会被频繁打断。

VSCode 的 F2 重命名功能可以智能地重命名符号（变量、函数、类等），自动更新所有引用。结合 Vim 的快捷键，整个重构流程可以完全键盘化，效率提升 **5-10 倍**。

## 为什么需要智能重命名？

### 传统查找替换的问题

假设你想把变量 `user` 重命名为 `currentUser`。如果用普通的查找替换：

```typescript
const user = getUser();
const admin = getAdmin();
console.log(user.name);  // ✅ 需要替换
console.log('user logged in');  // ❌ 不应该替换（字符串内容）
function validateUser() {}  // ❌ 不应该替换（其他符号）
```

普通查找替换会把所有包含 `user` 的地方都改掉，包括注释、字符串、其他符号，导致代码错误。

### F2 智能重命名的优势

F2 重命名基于语义分析，只重命名当前符号的所有引用：
- ✅ 跨文件重命名（自动更新所有导入）
- ✅ 类型安全（TypeScript/JavaScript 类型检查）
- ✅ 作用域感知（只重命名当前作用域的符号）
- ✅ 预览变更（显示所有将被修改的位置）

## F2 重命名基础

### 触发重命名的三种方式

**方式 1：原生 F2**
```
1. 光标移动到符号上（用 Vim 的 w/b/f 等）
2. 按 F2
3. 输入新名称
4. Enter 确认
```

**方式 2：自定义 Leader 键**
```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "r", "n"],
      "commands": ["editor.action.rename"]
    }
  ]
}
```

操作：光标在符号上 → `Space` `r` `n` → 输入新名称 → `Enter`

**方式 3：右键菜单（不推荐）**
鼠标右键 → "重命名符号" → 输入新名称

### Vim 友好的配置

为了更符合 Vim 习惯，建议配置以下键位：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // Space + r + n: 重命名（rename）
    {
      "before": ["<leader>", "r", "n"],
      "commands": ["editor.action.rename"]
    },
    // Space + r + p: 重命名（带预览）
    {
      "before": ["<leader>", "r", "p"],
      "commands": ["editor.action.rename"]
    },
    // c + r + r: 快速重命名（change rename rename）
    {
      "before": ["c", "r", "r"],
      "commands": ["editor.action.rename"]
    }
  ],
  
  // 启用重命名预览
  "editor.rename.enablePreview": true
}
```


## 实战场景：完整重命名工作流

### 场景 1：局部变量重命名

**任务**：将 `userName` 重命名为 `displayName`

```typescript
function greetUser() {
  const userName = 'John Doe';
  console.log(`Hello, ${userName}`);
  return { userName };
}
```

**操作序列**：
1. 按 `/userName`：搜索并定位到变量
2. 按 `Enter`：光标跳转到第一个匹配项
3. 按 `Space` `r` `n`（或 `F2`）：触发重命名
4. 输入 `displayName`
5. 按 `Enter`：确认重命名

**结果**：
```typescript
function greetUser() {
  const displayName = 'John Doe';
  console.log(`Hello, ${displayName}`);
  return { displayName };
}
```

**用时**：**3-5 秒**

**对比传统方式**：
- 手动查找替换：需要确认每个匹配项，容易误改，**30-60 秒**
- 效率提升：**6-20 倍**

### 场景 2：函数重命名（跨文件）

**任务**：将 `fetchUsers` 重命名为 `getUsers`

**文件 1：api/users.ts**
```typescript
export function fetchUsers() {
  return fetch('/api/users').then(res => res.json());
}
```

**文件 2：components/UserList.tsx**
```typescript
import { fetchUsers } from '../api/users';

function UserList() {
  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);
}
```

**操作序列**：
1. 打开 `api/users.ts`（`Space` `f` `f` → 输入 `users` → `Enter`）
2. 按 `/fetchUsers` → `Enter`：定位到函数定义
3. 按 `gd`：跳转到定义（确保在正确位置）
4. 按 `Space` `r` `n`：触发重命名
5. 输入 `getUsers`
6. 按 `Enter`

**结果**：所有文件中的 `fetchUsers` 都被自动更新为 `getUsers`，包括导入语句。

**用时**：**5-8 秒**

**对比传统方式**：
- 手动修改：需要找到所有引用，逐个文件修改，**3-5 分钟**
- 效率提升：**20-60 倍**

### 场景 3：接口属性重命名（TypeScript）

**任务**：将接口属性 `firstName` 重命名为 `name`

```typescript
interface User {
  firstName: string;
  email: string;
}

const user: User = {
  firstName: 'John',
  email: 'john@example.com'
};

function displayUser(u: User) {
  console.log(u.firstName);
}
```

**操作序列**：
1. 按 `/interface User` → `Enter`：定位到接口定义
2. 按 `j`：向下移动到 `firstName` 行
3. 按 `w`：跳转到 `firstName` 单词
4. 按 `Space` `r` `n`
5. 输入 `name`
6. 按 `Enter`

**结果**：
```typescript
interface User {
  name: string;  // ✅ 接口定义更新
  email: string;
}

const user: User = {
  name: 'John',  // ✅ 对象字面量更新
  email: 'john@example.com'
};

function displayUser(u: User) {
  console.log(u.name);  // ✅ 属性访问更新
}
```

**用时**：**4-6 秒**

### 场景 4：React 组件重命名

**任务**：将组件 `UserCard` 重命名为 `UserProfile`

**文件：components/UserCard.tsx**
```typescript
export function UserCard({ user }: { user: User }) {
  return (
    <div className="user-card">
      <h2>{user.name}</h2>
    </div>
  );
}
```

**文件：pages/Dashboard.tsx**
```typescript
import { UserCard } from '../components/UserCard';

function Dashboard() {
  return <UserCard user={currentUser} />;
}
```

**操作序列**：
1. 打开 `UserCard.tsx`
2. 按 `/function UserCard` → `Enter`
3. 按 `w`：光标移动到 `UserCard`
4. 按 `Space` `r` `n`
5. 输入 `UserProfile`
6. 按 `Enter`

**结果**：
- ✅ 函数名更新：`export function UserProfile`
- ✅ 导入语句更新：`import { UserProfile }`
- ✅ JSX 标签更新：`<UserProfile user={currentUser} />`

**注意**：文件名和 CSS 类名需要手动更新（这些不是语义符号）。

**用时**：**5-8 秒**

### 场景 5：重命名预览（大型重构）

当重命名影响范围很大时（如修改核心 API 函数名），使用预览模式更安全：

**操作序列**：
1. 光标定位到要重命名的符号
2. 按 `Space` `r` `p`（带预览的重命名）
3. 输入新名称
4. 按 `Enter`
5. VSCode 显示预览面板，列出所有将被修改的位置
6. 用 `j` `k` 检查每个修改
7. 按 `Ctrl+Enter`：应用所有更改
8. 或按 `Esc`：取消重命名

**预览面板示例**：
```
Renaming 'fetchData' to 'getData'
12 occurrences across 4 files

src/api/data.ts (3 occurrences)
  Line 5: export function fetchData() {
  Line 12:   return fetchData();
  
src/hooks/useData.ts (5 occurrences)
  Line 2: import { fetchData } from '../api/data';
  Line 8:   const data = await fetchData();
  ...
```

**用时**：**10-20 秒**（包含审查时间）

## 高效工作流模式

### 模式 1：搜索-重命名-返回

当你需要重命名远处的符号，然后返回当前编辑位置：

```
/symbolName    搜索符号
Enter          跳转到符号
Space r n      重命名
输入新名称
Enter          确认
Ctrl+O         返回上一个位置（跳转历史）
```

**用时**：**5-8 秒**

### 模式 2：定义-重命名

当你不确定符号定义在哪里，先跳转到定义，再重命名：

```
gd             跳转到定义
Space r n      重命名
输入新名称
Enter          确认
Ctrl+O         返回
```

**用时**：**6-10 秒**

### 模式 3：批量审查

当你需要重命名多个相关符号（如一组相关变量）：

```
/oldName       搜索第一个符号
Enter          跳转
Space r n      重命名
n              跳到下一个匹配项（搜索）
gd             确认是否是同一个符号
Space r n      重命名第二个
n              继续下一个
```

**用时**：**每个符号 5-8 秒**

## 与其他重构操作组合

### 组合 1：重命名 + 提取变量

```typescript
// 原代码
console.log(users.filter(u => u.active).length);

// 步骤 1：选中表达式（Visual 模式）
v$             选择到行尾
Space c r      打开重构菜单
选择 "Extract to constant"

// 步骤 2：重命名常量
Space r n
输入 "activeUserCount"
Enter
```

**结果**：
```typescript
const activeUserCount = users.filter(u => u.active).length;
console.log(activeUserCount);
```

### 组合 2：重命名 + 整理导入

```typescript
import { fetchUsers, updateUser } from './api';

// 重命名 fetchUsers 为 getUsers
// 步骤 1：重命名
Space r n → getUsers → Enter

// 步骤 2：整理导入（自动排序）
Space o i      (Organize Imports)
```

**结果**：
```typescript
import { getUsers, updateUser } from './api';
```

## 常见问题与解决方案

### 问题 1：F2 没有反应

**症状**：按 F2 后没有弹出重命名输入框。

**可能原因**：
1. 光标不在符号上（在空白处或注释中）
2. 当前语言不支持重命名（纯文本文件）
3. 符号是外部库的（readonly）

**解决方案**：
- 用 `w` 或 `b` 将光标精确移动到符号上
- 确保文件是 JavaScript/TypeScript 等支持重命名的语言
- 检查是否是第三方库的符号（这些通常无法重命名）

### 问题 2：重命名影响了不该改的地方

**症状**：重命名后发现字符串或注释中的内容也被改了。

**原因**：这通常不会发生，因为 F2 是基于语义的。如果发生了，可能是：
- 使用了普通查找替换而非 F2
- 代码没有正确解析（语法错误）

**解决方案**：
- 确保使用 F2 而非 `Ctrl+H`（查找替换）
- 修复语法错误后再重命名
- 使用 `Ctrl+Z` 撤销错误的重命名

### 问题 3：跨文件重命名失败

**症状**：重命名只在当前文件生效，其他文件没有更新。

**原因**：
- 其他文件没有打开或没有被 VSCode 索引
- 使用了动态导入（`require()` 而非 `import`）
- 模块解析配置错误（`tsconfig.json` 或 `jsconfig.json`）

**解决方案**：
- 等待 VSCode 完成文件索引（状态栏显示 "正在索引文件..."）
- 确保项目有正确的 `tsconfig.json` 或 `jsconfig.json`
- 使用静态导入（ES6 `import`）而非动态 `require()`

### 问题 4：重命名后出现类型错误

**症状**：重命名后，TypeScript 报告类型错误。

**原因**：
- 重命名影响了类型定义，但类型文件没有同步更新
- 存在类型断言或 `any` 类型绕过了检查

**解决方案**：
- 检查类型定义文件（`.d.ts`）是否也需要更新
- 运行 `tsc --noEmit` 检查所有类型错误
- 逐个修复类型错误

## 键位速查表

| 操作 | 默认快捷键 | Vim 配置 | 说明 |
|------|-----------|----------|------|
| 重命名 | `F2` | `Space` `r` `n` | 智能重命名符号 |
| 预览重命名 | - | `Space` `r` `p` | 显示所有变更 |
| 跳转到定义 | `F12` | `gd` | 确认符号位置 |
| 查找所有引用 | `Shift+F12` | `gr` | 查看影响范围 |
| 返回上一位置 | `Alt+Left` | `Ctrl+O` | 重命名后返回 |
| 撤销 | `Ctrl+Z` | `u` | 撤销错误重命名 |

## 效率对比与最佳实践

### 效率对比

| 场景 | 传统方式 | F2 + Vim | 效率提升 |
|------|----------|----------|----------|
| 局部变量重命名 | 30-60 秒 | 3-5 秒 | **6-20 倍** |
| 跨文件函数重命名 | 3-5 分钟 | 5-8 秒 | **20-60 倍** |
| 接口属性重命名 | 1-2 分钟 | 4-6 秒 | **10-30 倍** |
| 组件重命名 | 2-3 分钟 | 5-8 秒 | **15-36 倍** |

### 最佳实践

1. **先确认再重命名**：
   - 使用 `gd`（跳转到定义）确认符号位置
   - 使用 `gr`（查找所有引用）了解影响范围

2. **使用预览模式**：
   - 大型重构时启用预览（`Space` `r` `p`）
   - 仔细检查每个将被修改的位置

3. **遵循命名规范**：
   - 使用有意义的名称
   - 保持命名风格一致（camelCase、PascalCase 等）

4. **配合版本控制**：
   - 重命名后立即提交（单独的 commit）
   - commit 信息清晰：`refactor: rename fetchUsers to getUsers`

5. **批量重命名策略**：
   - 一次只重命名一个符号
   - 重命名后测试，确保代码正常运行
   - 避免一次性重命名过多符号（容易出错）

6. **利用跳转历史**：
   - 重命名后用 `Ctrl+O` 返回原位置
   - 用 `Ctrl+I` 前进到下一个位置
   - 保持编辑流畅性

## 总结

F2 重命名是 VSCode 最强大的重构工具之一。结合 Vim 的快捷键，整个重命名流程完全键盘化，效率提升显著：

**核心优势**：
1. **智能语义分析**：只重命名相关符号，不误改字符串和注释
2. **跨文件支持**：自动更新所有引用，包括导入语句
3. **类型安全**：TypeScript 类型检查确保重命名不破坏类型
4. **预览机制**：大型重构前可预览所有变更

**效率提升**：
- 单次重命名：**3-8 秒** vs 传统方式 **30-180 秒**
- 效率提升：**6-60 倍**
- 每天节省：**10-20 分钟**（假设每天重命名 10-20 次）
- 每年节省：**50-100 小时**

**建议配置**：
```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "r", "n"],
      "commands": ["editor.action.rename"]
    }
  ],
  "editor.rename.enablePreview": true
}
```

掌握 F2 重命名，让重构变得轻松愉快，代码质量持续提升。
