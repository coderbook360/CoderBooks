# 搜索与移动：/ 与 * 的高效用法

搜索不仅是"查找"，更是强大的移动命令。掌握搜索作为动作（motion）的用法，能让你的编辑效率倍增。

## 基本搜索

| 命令 | 效果 |
|------|------|
| `/{pattern}` | 向下搜索 |
| `?{pattern}` | 向上搜索 |
| `n` | 下一个匹配 |
| `N` | 上一个匹配 |
| `*` | 搜索光标下的单词（向下） |
| `#` | 搜索光标下的单词（向上） |

## 搜索作为动作

搜索可以与操作符配合使用：

```
d/function    删除到 "function" 出现的位置
c/return      修改到 "return" 出现的位置
y/}           复制到 "}" 出现的位置
```

### 实战演示

删除到某个函数调用：

```typescript
const result = processData(input);
validateResult(result);
sendNotification();
// ↑ 删除从这里到 sendNotification
```

```
d/send    （删除到 "send" 出现的位置）
```

结果：
```typescript
sendNotification();
```

## * 和 # 的威力

`*` 和 `#` 是被低估的命令。光标在单词上时：

```
*    搜索这个单词的下一个出现
#    搜索这个单词的上一个出现
```

## 场景：快速查看变量使用

```typescript
const user = getUser(id);
console.log(user.name);
updateDatabase(user);
return user;
//     ↑ 光标在 user 上
//     * → 跳转到下一个 user
//     * 或 n → 继续下一个
//     # 或 N → 返回上一个
```

### 场景：审查函数调用

```
1. 光标放在函数名上
2. * 跳转到下一个调用
3. 浏览所有调用
4. 发现问题，就地修改
```

## g* 和 g#

`*` 和 `#` 匹配的是完整单词（有单词边界）。

```
user 会匹配 user，但不匹配 username
```

如果想匹配部分单词：

```
g*    搜索光标下的文本（无单词边界）
g#    向上搜索（无单词边界）
```

## 搜索高亮

搜索后，所有匹配项都会高亮。有时候高亮很烦人，想关闭：

```
:noh    或    :nohlsearch
```

配置一个快捷键：

```json
{
  "before": ["<leader>", "h"],
  "commands": [":noh"]
}
```

`\h` 关闭搜索高亮。

## 增量搜索

VSCode Vim 默认启用增量搜索——输入时实时显示匹配。

```json
{
  "vim.incsearch": true
}
```

这让你在输入搜索模式时就能看到匹配结果，确认后按 Enter。

## 智能大小写

```json
{
  "vim.ignorecase": true,
  "vim.smartcase": true
}
```

- `ignorecase`：搜索时忽略大小写
- `smartcase`：如果搜索模式包含大写，则精确匹配

效果：
- `/user` → 匹配 User、user、USER
- `/User` → 只匹配 User

## 正则表达式

Vim 搜索支持正则表达式：

| 模式 | 含义 |
|------|------|
| `.` | 任意字符 |
| `\d` | 数字 |
| `\w` | 单词字符 |
| `\s` | 空白字符 |
| `^` | 行首 |
| `$` | 行尾 |
| `*` | 零个或多个 |
| `\+` | 一个或多个 |

例如：

```
/function\s\+\w\+    匹配 "function " 后跟函数名
/console\.log        匹配 console.log（. 需要转义）
/TODO\|FIXME         匹配 TODO 或 FIXME
```

## 搜索历史

按 `/` 后，使用上下箭头浏览搜索历史。

## n/N 的方向

一个常见困惑：`n` 总是"下一个"，但方向取决于初始搜索方向。

- `/pattern` 然后 `n` → 向下
- `?pattern` 然后 `n` → 向上

如果你忘记了当前方向，状态栏会显示搜索模式和方向。

## 配合可视模式

在可视模式中使用搜索：

```
v/pattern    从当前位置选择到 pattern 匹配处
```

选中后可以用 `d`、`y` 等操作。

## 使用技巧

### 技巧 1：搜索选中文本

在可视模式中选中文本后：

```
y       复制选中的文本到寄存器
/       进入搜索模式
Ctrl+R  然后 "    粘贴寄存器内容
Enter   开始搜索
```

这让你可以搜索任意选中的文本。

### 技巧 2：搜索并替换

搜索后，用 `cgn` 替换：

```
1. /oldName    搜索目标
2. cgn         修改当前匹配并自动跳转到下一个
3. newName     输入新内容
4. Escape      退出插入模式
5. .           重复（对下一个匹配执行相同操作）
```

这比 `:%s/old/new/g` 更可控——你可以决定哪些替换、哪些跳过。

### 技巧 3：搜索边界

搜索完整单词：

```
/\<user\>    只匹配完整的 user，不匹配 username
```

这与 `*` 的效果相同。

## 配置汇总

```json
{
  "vim.incsearch": true,
  "vim.hlsearch": true,
  "vim.ignorecase": true,
  "vim.smartcase": true,
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "h"],
      "commands": [":noh"]
    }
  ]
}
```

---

**本章收获**：
- ✅ 掌握搜索作为动作的用法
- ✅ 学会 * 和 # 快速搜索当前单词
- ✅ 理解增量搜索和智能大小写
- ✅ 掌握搜索并替换的高效流程

**效率提升**：搜索不再只是"查找"，而是精确跳转和批量编辑的利器。
