# 效率提升技巧合集

零散但实用的技巧合集，每一个都能在特定场景下大幅提升效率。

## 编辑技巧

### 快速复制行

```
yyp     复制当前行到下方
yyP     复制当前行到上方
5yyp    复制 5 行到下方
```

### 快速删除

```
dd      删除当前行
D       删除到行尾
C       删除到行尾并进入插入模式
S       删除整行并进入插入模式
```

### 快速交换

```
ddp     交换当前行和下一行
ddkP    交换当前行和上一行
xp      交换两个字符
```

### 大小写转换

```
~       切换当前字符大小写
g~iw    切换当前单词大小写
gUiw    单词转大写
guiw    单词转小写
gUU     整行转大写
guu     整行转小写
```

### 增减数字

```
Ctrl+a  数字加 1
Ctrl+x  数字减 1
10Ctrl+a 数字加 10
```

需要在设置中启用：

```json
{
  "vim.handleKeys": {
    "<C-a>": true,
    "<C-x>": true
  }
}
```

## 移动技巧

### 精确跳转

```
50G     跳到第 50 行
50%     跳到文件 50% 位置
H       跳到屏幕顶部
M       跳到屏幕中间
L       跳到屏幕底部
```

### 屏幕控制

```
zz      当前行移到屏幕中央
zt      当前行移到屏幕顶部
zb      当前行移到屏幕底部
Ctrl+e  向下滚动一行
Ctrl+y  向上滚动一行
```

### 段落移动

```
{       上一个空行
}       下一个空行
[[      上一个函数
]]      下一个函数
```

## 搜索技巧

### 搜索当前单词

```
*       向下搜索当前单词
#       向上搜索当前单词
g*      部分匹配向下搜索
g#      部分匹配向上搜索
```

## 搜索历史

```
/       进入搜索模式
↑/↓     浏览搜索历史
```

### 搜索替换技巧

```
:%s/old/new/g       全局替换
:%s/old/new/gc      全局替换（确认）
:5,10s/old/new/g    只在 5-10 行替换
:'<,'>s/old/new/g   在可视选中区域替换
```

### 保留大小写替换

```
:%s/\<old\>/new/gI   区分大小写
```

## 选择技巧

### 扩展选择

```
viw     选中单词
viW     选中 WORD（含特殊字符）
vis     选中句子
vip     选中段落
vi"     选中引号内
vi(     选中括号内
vit     选中标签内
```

### 快速全选

```
ggVG    全选
```

### 重复上次选择

```
gv      重新选中上次的区域
```

## 插入模式技巧

### 插入模式中的快捷键

```
Ctrl+h  删除前一个字符
Ctrl+w  删除前一个单词
Ctrl+u  删除到行首
Ctrl+o  临时进入普通模式执行一个命令
```

### 插入特殊字符

```
Ctrl+v + 数字    插入 ASCII 字符
Ctrl+v + u + 十六进制   插入 Unicode
```

### 补全

```
Ctrl+n  下一个补全项
Ctrl+p  上一个补全项
```

## 实用组合

### 快速修改引号内容

```
ci"     改变双引号内容
ci'     改变单引号内容
ci`     改变反引号内容
```

### 快速修改括号内容

```
ci(     改变小括号内容
ci{     改变大括号内容
ci[     改变方括号内容
```

### 快速删除包裹

vim-surround:

```
ds"     删除双引号
ds(     删除括号
dst     删除标签
```

### 快速修改包裹

```
cs"'    双引号改单引号
cs({    小括号改大括号
cst<div> 标签改为 div
```

### 快速添加包裹

```
ysiw"   给单词加双引号
ysiw(   给单词加括号
yss(    给整行加括号
```

## 窗口技巧

### 快速分屏

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    { "before": ["<leader>", "v"], "commands": ["workbench.action.splitEditor"] },
    { "before": ["<leader>", "s"], "commands": ["workbench.action.splitEditorDown"] }
  ]
}
```

### 调整窗口大小

```
Ctrl+Shift+→    增加宽度
Ctrl+Shift+←    减少宽度
```

### 最大化当前窗口

```json
{
  "before": ["<leader>", "m"],
  "commands": ["workbench.action.toggleEditorWidths"]
}
```

## 文件技巧

### 快速打开文件

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    { "before": ["<leader>", "f"], "commands": ["workbench.action.quickOpen"] },
    { "before": ["<leader>", "r"], "commands": ["workbench.action.openRecent"] }
  ]
}
```

### 在文件间跳转

```
Ctrl+o  跳转历史后退
Ctrl+i  跳转历史前进
gf      跳转到光标下的文件
gd      跳转到定义
```

### 快速切换文件

```
Ctrl+Tab        最近文件列表
Ctrl+数字       切换到指定 Tab
```

## 终端技巧

### 快速打开终端

```json
{
  "before": ["<leader>", "`"],
  "commands": ["workbench.action.terminal.toggleTerminal"]
}
```

### 在终端中使用 Vim

终端中按 Ctrl+Shift+`  创建新终端。

### 发送命令到终端

```json
{
  "before": ["<leader>", "t", "r"],
  "commands": [
    {
      "command": "workbench.action.terminal.sendSequence",
      "args": { "text": "npm run dev\n" }
    }
  ]
}
```

## 重构技巧

### 批量重命名

```
1. 光标在符号上
2. F2 或 \rn
3. 输入新名称
4. Enter
```

### 提取函数

```
1. 选中代码
2. Ctrl+Shift+R
3. 选择 "Extract function"
```

### 内联变量

```
1. 光标在变量上
2. Ctrl+Shift+R
3. 选择 "Inline variable"
```

## 调试技巧

### 快速调试

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    { "before": ["<leader>", "d", "b"], "commands": ["editor.debug.action.toggleBreakpoint"] },
    { "before": ["<leader>", "d", "c"], "commands": ["workbench.action.debug.continue"] },
    { "before": ["<leader>", "d", "n"], "commands": ["workbench.action.debug.stepOver"] },
    { "before": ["<leader>", "d", "i"], "commands": ["workbench.action.debug.stepInto"] },
    { "before": ["<leader>", "d", "o"], "commands": ["workbench.action.debug.stepOut"] }
  ]
}
```

### 快速添加 console.log

使用 snippet:

```json
{
  "Console Log": {
    "prefix": "cl",
    "body": "console.log('${1:label}:', ${1:label});$0"
  }
}
```

## 日常效率

### 每天开始

```
1. git pull
2. 检查 TODO
3. 打开相关文件
```

### 编码时

```
1. 使用 / 搜索定位
2. 使用 gd 跳转定义
3. 使用 Ctrl+o 返回
4. 使用 . 重复操作
```

### 提交前

```
1. \gd 查看更改
2. 运行测试
3. \gc 提交
4. \gp 推送
```

## 习惯养成

### 避免的操作

- ❌ 用鼠标移动光标
- ❌ 用方向键移动
- ❌ 单个字符删除用 Backspace
- ❌ 重复按相同的键

### 推荐的习惯

- ✓ 用 hjkl 移动
- ✓ 用 w/b/e 按单词移动
- ✓ 用 f/t 精确跳转
- ✓ 用 / 搜索跳转
- ✓ 用 . 重复操作
- ✓ 用文本对象操作

### 刻意练习

每天练习一个新技巧，直到形成肌肉记忆。

---

**本章收获**：
- ✅ 掌握各种实用的小技巧
- ✅ 学会组合使用命令
- ✅ 建立高效的日常习惯
- ✅ 持续改进工作流程

**效率提升**：每个小技巧都能在特定场景下节省时间，积少成多，效率倍增。
