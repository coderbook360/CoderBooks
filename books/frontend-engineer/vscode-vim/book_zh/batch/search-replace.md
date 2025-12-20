# 搜索与替换

批量搜索和替换是日常开发中最常用的功能之一。在 VSCode + Vim 环境中，我们可以结合 Vim 的强大搜索替换能力和 VSCode 的全局搜索功能，实现高效的批量修改。

## Vim 原生搜索替换

### 基础语法

**替换命令格式**：
```vim
:[range]s/pattern/replacement/[flags]
```

**常用范围**：
- `%`：整个文件
- `'<,'>`：Visual 模式选中区域
- `.`：当前行
- `.,+5`：当前行及后 5 行
- `10,20`：第 10-20 行

**常用标志**：
- `g`：替换行内所有匹配（global）
- `c`：每次替换前确认（confirm）
- `i`：忽略大小写（ignore case）
- `I`：不忽略大小写

### 实战示例

**1. 替换整个文件中的单词**

将文件中所有 `oldName` 替换为 `newName`：

```vim
:%s/oldName/newName/g
```

按 `Ctrl+/` 调出命令面板，输入上述命令。

**2. 带确认的替换**

```vim
:%s/foo/bar/gc
```

每次替换时会提示：
- `y`：确认替换
- `n`：跳过此处
- `a`：替换所有剩余匹配
- `q`：退出
- `l`：替换此处并退出

**3. 仅替换完整单词**

使用 `\<` 和 `\>` 匹配单词边界：

```vim
:%s/\<user\>/account/g
```

这会将 `user` 替换为 `account`，但不会影响 `username`。

**4. 替换选中区域**

1. 按 `V` 进入 Visual Line 模式
2. 选中要替换的行
3. 输入 `:'<,'>s/old/new/g`（前缀会自动补全）

**5. 大小写转换**

```vim
# 转换为大写
:%s/foo/\U&/g

# 转换为小写
:%s/FOO/\L&/g

# 首字母大写
:%s/\<\w/\u&/g
```

其中 `&` 表示匹配到的文本。

## VSCode 全局搜索替换

### 快捷键

| 功能 | 快捷键 | Vim 兼容 |
|------|--------|----------|
| 打开搜索面板 | `Ctrl+Shift+F` | ✓ |
| 聚焦搜索输入框 | `Ctrl+Shift+F` | ✓ |
| 切换大小写敏感 | `Alt+C` | ✓ |
| 切换全词匹配 | `Alt+W` | ✓ |
| 切换正则表达式 | `Alt+R` | ✓ |
| 替换 | `Ctrl+Shift+H` | ✓ |
| 替换全部 | `Ctrl+Alt+Enter` | ✓ |

### 搜索技巧

**1. 使用正则表达式**

搜索所有以 `get` 开头的函数：

```regex
function get\w+\(
```

**2. 多行搜索**

启用正则表达式后，使用 `\n` 匹配换行：

```regex
const.*=.*\{[\s\S]*?\}
```

**3. 排除特定文件**

在"要排除的文件"输入框中：

```
**/node_modules, **/*.test.ts, **/*.spec.ts
```

**4. 仅搜索特定文件**

在"要包含的文件"输入框中：

```
**/*.ts, **/*.tsx
```

### 批量替换工作流

**场景**：重命名 API 端点

1. **搜索阶段**：
   - 按 `Ctrl+Shift+F` 打开搜索面板
   - 输入 `/api/v1/users`
   - 查看所有匹配结果

2. **预览阶段**：
   - 按 `Ctrl+Shift+H` 切换到替换模式
   - 输入新值 `/api/v2/accounts`
   - 查看预览

3. **替换阶段**：
   - 按 `Ctrl+Alt+Enter` 全部替换
   - 或逐个确认替换

**用时**：**15 秒**（传统鼠标操作约需 2 分钟）

## 正则表达式高级用法

### 捕获组

**示例**：交换函数参数顺序

**原始代码**：
```javascript
function calculate(width, height) {
  return width * height;
}
```

**替换命令**：
```vim
:%s/calculate(\(\w\+\), \(\w\+\))/calculate(\2, \1)/g
```

**结果**：
```javascript
function calculate(height, width) {
  return width * height;
}
```

### 条件替换

**示例**：仅替换函数内的变量

```vim
:g/function/.,/^}/s/oldVar/newVar/g
```

这会在每个函数内部进行替换。

### 多模式替换

使用 `\|` 进行或操作：

```vim
:%s/\(foo\|bar\|baz\)/qux/g
```

## 跨文件批量替换案例

### 案例 1：API 接口统一重命名

**需求**：将项目中所有 `getUserInfo` 改为 `fetchUserProfile`

**步骤**：

1. 按 `Ctrl+Shift+F`
2. 输入 `getUserInfo`
3. 查看匹配结果（假设 23 个文件，共 47 处）
4. 按 `Ctrl+Shift+H` 切换到替换
5. 输入 `fetchUserProfile`
6. 按 `Ctrl+Alt+Enter` 全部替换

**用时**：**10 秒**

### 案例 2：CSS 类名批量更新

**需求**：将 `.btn-primary` 改为 `.button-primary`

**步骤**：

1. 打开搜索（`Ctrl+Shift+F`）
2. 启用正则表达式（`Alt+R`）
3. 搜索：`\bbtn-primary\b`
4. 替换为：`button-primary`
5. 在"要包含的文件"中输入：`**/*.css, **/*.scss, **/*.tsx`
6. 全部替换

**用时**：**15 秒**

### 案例 3：TypeScript 类型重命名

**需求**：将 `IUser` 接口改为 `User`

**步骤**：

1. 搜索：`\bIUser\b`（完整单词匹配）
2. 替换为：`User`
3. 排除测试文件：`!**/*.test.ts`
4. 预览并确认替换

**注意事项**：
- 确保不会误替换 `IUserService`、`IUserRepository` 等
- 使用单词边界 `\b` 避免部分匹配

**用时**：**20 秒**

## 结合 Vim 宏进行复杂替换

### 录制替换宏

**场景**：为每个函数添加 JSDoc 注释

1. 定位到第一个函数
2. 按 `q` `a`：开始录制到寄存器 a
3. 执行操作：
   ```vim
   O/**<CR> * @description TODO<CR> * @returns {void}<CR> */<Esc>
   /function<CR>
   ```
4. 按 `q`：停止录制

5. 应用到其他函数：
   - 按 `50@a`：执行 50 次

### 可视块模式批量编辑

**场景**：为多行代码添加注释

**原始代码**：
```javascript
const name = 'John';
const age = 30;
const email = 'john@example.com';
```

**操作序列**：
1. 定位到第一行
2. 按 `Ctrl+V` 进入 Visual Block 模式
3. 按 `j` `j` 选中三行
4. 按 `I`：在块前插入
5. 输入 `// `
6. 按 `Esc`：应用到所有行

**结果**：
```javascript
// const name = 'John';
// const age = 30;
// const email = 'john@example.com';
```

**用时**：**3 秒**

## 高级搜索替换技巧

### 技巧 1：使用 Vim 命令行历史

在命令模式下：
- 按 `:`，然后按 `↑`：浏览历史命令
- 按 `Ctrl+P`：上一条命令
- 按 `Ctrl+N`：下一条命令

### 技巧 2：暂存搜索模式

使用寄存器保存搜索模式：

```vim
# 复制当前搜索到寄存器
:let @a = @/

# 恢复搜索
:let @/ = @a
```

## 技巧 3：替换确认模式技巧

在确认模式（`/c` 标志）下：
- `Ctrl+E`：向下滚动
- `Ctrl+Y`：向上滚动
- 查看更多上下文再决定是否替换

### 技巧 4：全局命令

**删除包含特定模式的所有行**：
```vim
:g/console.log/d
```

**复制匹配行到文件末尾**：
```vim
:g/TODO/t$
```

## 实战工作流

### 大型重构项目

**场景**：将项目从 `axios` 迁移到 `fetch`

**步骤 1**：搜索所有 axios 导入

```vim
# VSCode 搜索
import.*axios
```

**步骤 2**：记录需要修改的文件（假设 15 个）

**步骤 3**：逐文件替换

每个文件中执行：
```vim
# 替换导入
:%s/import axios from 'axios'/import { fetchApi } from '@/utils/fetch'/g

# 替换 axios.get 调用
:%s/axios\.get(\(.*\))/fetchApi(\1, { method: 'GET' })/g

# 替换 axios.post 调用
:%s/axios\.post(\([^,]*\), \(.*\))/fetchApi(\1, { method: 'POST', body: \2 })/g
```

**用时**：每个文件约 **30 秒**，总计 **7.5 分钟**

传统手动修改需要约 **45 分钟**，效率提升 **6 倍**。

## 常见陷阱与注意事项

### 陷阱 1：特殊字符未转义

**错误**：
```vim
:%s/user.name/user.fullName/g
```

`.` 会匹配任意字符，应该转义：

**正确**：
```vim
:%s/user\.name/user.fullName/g
```

### 陷阱 2：全局替换波及范围过大

始终先用 VSCode 搜索预览：
1. 搜索要替换的内容
2. 检查所有匹配
3. 确认无误后再执行替换

### 陷阱 3：忘记使用 `/g` 标志

不加 `g` 只会替换每行的第一个匹配：

```vim
:%s/foo/bar/    # 只替换每行第一个
:%s/foo/bar/g   # 替换所有匹配
```

### 陷阱 4：误操作无法撤销

- Vim 替换可以用 `u` 撤销
- VSCode 全局替换可以用 `Ctrl+Z` 撤销
- 重要操作前先提交 Git

## 键盘流操作对比

| 操作 | 鼠标操作 | 键盘流 | 节省时间 |
|------|----------|--------|----------|
| 文件内替换 | 45 秒 | 5 秒 | 89% |
| 跨文件替换 | 2 分钟 | 15 秒 | 87% |
| 正则替换 | 3 分钟 | 20 秒 | 89% |
| 批量注释 | 1 分钟 | 3 秒 | 95% |

## 小结

搜索替换是最能体现键盘流效率的场景之一：

- **Vim 替换**：适合单文件内的精确替换
- **VSCode 搜索**：适合跨文件的全局替换
- **正则表达式**：处理复杂模式的利器
- **可视块模式**：批量编辑的神器

掌握这些技巧后，代码重构和批量修改的效率将提升 **5-10 倍**。
