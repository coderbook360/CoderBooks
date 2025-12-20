# EasyMotion：屏幕内闪电跳转

Vim 的移动命令需要你计算距离——"往下 7 行"、"第 3 个 w"。EasyMotion 彻底改变这种方式：直接标记屏幕上的每个目标位置，你只需要看着跳。

## EasyMotion 是什么

EasyMotion 是 Vim 的一个著名插件，VSCode Vim 内置了它的实现。

工作原理：
1. 触发 EasyMotion
2. 屏幕上的目标位置显示高亮字母
3. 输入对应字母
4. 光标直接跳转到那个位置

**不需要计算，不需要多次按键，一步到位。**

## 启用 EasyMotion

在 settings.json 中：

```json
{
  "vim.easymotion": true
}
```

## 核心命令

### 跳转到词首

```
<leader><leader>w    跳转到后面的词首
<leader><leader>b    跳转到前面的词首
```

**演示**：

假设光标在行首，你要跳转到第 5 个单词：

传统方式：`5w` 或 `wwwww`

EasyMotion 方式：
1. `\\w`（假设 Leader 是反斜杠）
2. 屏幕上每个词首显示标签：`a`、`b`、`c`...
3. 按下目标位置的字母
4. 跳转完成

### 跳转到行

```
<leader><leader>j    跳转到下面某一行
<leader><leader>k    跳转到上面某一行
```

这解决了"我要跳到那一行"的问题。不用数行号，直接看着选。

### 行内跳转

```
<leader><leader>f{char}    跳转到后面的某个字符
<leader><leader>F{char}    跳转到前面的某个字符
```

比原生的 `f` 更强大——当行内有多个相同字符时，EasyMotion 给每个都加上标签。

## 搜索跳转

最强大的功能——搜索跳转：

```
<leader><leader>s{char}    搜索字符并跳转
<leader><leader>/{pattern}    搜索模式并跳转
```

`\\s` 后输入一个字符，屏幕上所有该字符的出现位置都会显示标签。

## 实战对比

### 场景：跳转到屏幕上的某个函数名

**传统方式**：
1. 估算行数，`12j` 跳到那一行
2. 不对，再 `2j` 调整
3. 用 `w` 或 `f` 移到函数名

**EasyMotion 方式**：
1. `\\w`
2. 眼睛找到目标函数名的标签
3. 按下对应字母
4. 完成

**效率提升**：从"估算-调整"变成"看-跳"。

### 场景：跳转到某个变量的使用位置

变量名是 `user`，屏幕上有 5 处使用。

**传统方式**：
1. `/user` 搜索
2. `n` 多次，或者数次数用 `3n`

**EasyMotion 方式**：
1. `\\su` (搜索 u)
2. 或者 `\\2su` (搜索两个字符 us)
3. 选择目标位置的标签

## 配置优化

### 自定义标签字符

默认标签字符按优先级排列。可以自定义：

```json
{
  "vim.easymotionKeys": "hklyuiopnm,qwertzxcvbasdgjf;"
}
```

把最常用手指能按到的键放在前面。

### 简化触发键

`<leader><leader>` 比较长。可以自定义更短的触发方式：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "w"],
      "after": ["<leader>", "<leader>", "w"]
    },
    {
      "before": ["<leader>", "j"],
      "after": ["<leader>", "<leader>", "j"]
    },
    {
      "before": ["<leader>", "k"],
      "after": ["<leader>", "<leader>", "k"]
    },
    {
      "before": ["<leader>", "f"],
      "after": ["<leader>", "<leader>", "f"]
    }
  ]
}
```

现在 `\w` 直接触发 EasyMotion 跳词。

### 或者使用 s 键

有些人喜欢用单键触发：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["s"],
      "after": ["<leader>", "<leader>", "s"]
    }
  ]
}
```

`s` 直接触发字符搜索跳转。（这会覆盖原生的 `s` 替换命令，但 `s` 可以用 `cl` 代替。）

## 常用命令总结

| 命令 | 效果 |
|------|------|
| `\\w` | 跳转到后面的词首 |
| `\\b` | 跳转到前面的词首 |
| `\\j` | 跳转到下面某行 |
| `\\k` | 跳转到上面某行 |
| `\\f{c}` | 跳转到后面的字符 c |
| `\\F{c}` | 跳转到前面的字符 c |
| `\\s{c}` | 屏幕内搜索字符 c |
| `\\2s{cc}` | 屏幕内搜索两个字符 |

## 使用技巧

### 技巧 1：眼睛先定位

触发 EasyMotion 前，眼睛应该已经看到目标位置。触发后只需要读标签、按键。

### 技巧 2：优先用搜索跳转

`\\s` 是最通用的命令。你想跳到某个位置，那个位置附近肯定有某个字符。搜索那个字符就行。

### 技巧 3：与操作符配合

EasyMotion 可以与 `d`、`c`、`y` 等操作符配合：

```
d\\w    删除到 EasyMotion 选中的词
y\\j    复制到 EasyMotion 选中的行
```

不过这比较复杂，通常先跳转，再操作更清晰。

## 与 vim-sneak 的区别

vim-sneak 是另一个移动插件（下一章介绍）。区别：

| 特性 | EasyMotion | vim-sneak |
|------|------------|-----------|
| 标签显示 | 显示所有目标 | 依次匹配 |
| 触发方式 | Leader 序列 | 单键 s |
| 适用 | 精确跳转 | 快速接近 |

两者可以共存，根据场景选择。

## 配置汇总

```json
{
  "vim.easymotion": true,
  "vim.easymotionKeys": "hklyuiopnm,qwertzxcvbasdgjf;",
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "w"],
      "after": ["<leader>", "<leader>", "w"]
    },
    {
      "before": ["<leader>", "j"],
      "after": ["<leader>", "<leader>", "j"]
    },
    {
      "before": ["<leader>", "k"],
      "after": ["<leader>", "<leader>", "k"]
    },
    {
      "before": ["<leader>", "f"],
      "after": ["<leader>", "<leader>", "f"]
    },
    {
      "before": ["s"],
      "after": ["<leader>", "<leader>", "s"]
    }
  ]
}
```

---

**本章收获**：
- ✅ 理解 EasyMotion 的工作原理
- ✅ 掌握核心跳转命令
- ✅ 配置更高效的触发方式
- ✅ 建立"看-跳"的思维模式

**效率提升**：屏幕内任意位置，通常 2-3 次按键到达。不再需要计算距离。
