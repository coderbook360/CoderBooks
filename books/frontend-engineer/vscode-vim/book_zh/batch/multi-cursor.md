# 多光标编辑：同时修改多处

多光标是 VSCode 的杀手级功能之一。配合 Vim 的编辑命令，可以同时修改多处代码。

## 添加光标

### 鼠标添加

`Alt+Click` 在点击位置添加光标。

但作为 Vim 用户，你更想用键盘：

### 上下添加光标

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Alt+↑` | 在上一行添加光标 |
| `Ctrl+Alt+↓` | 在下一行添加光标 |

配置 Vim 快捷键：

```json
{
  "before": ["<C-k>"],
  "commands": ["editor.action.insertCursorAbove"]
},
{
  "before": ["<C-j>"],
  "commands": ["editor.action.insertCursorBelow"]
}
```

`Ctrl+K` 向上添加光标，`Ctrl+J` 向下添加。

### 在选中的每行末尾添加光标

```json
{
  "before": ["<leader>", "c", "e"],
  "commands": ["editor.action.insertCursorAtEndOfEachLineSelected"]
}
```

使用：
1. `V` 选中多行
2. `\ce` 在每行末尾添加光标
3. 现在有多个光标，可以同时编辑

## 选择相同内容

### 选择下一个相同的词

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+D` | 选择下一个相同的词 |

但 `Ctrl+D` 与 Vim 的半页滚动冲突。配置：

```json
{
  "vim.handleKeys": {
    "<C-d>": false
  }
}
```

这让 VSCode 处理 `Ctrl+D`。

或者用其他键：

```json
{
  "before": ["g", "n"],
  "commands": ["editor.action.addSelectionToNextFindMatch"]
}
```

`gn` 添加下一个匹配到选择。

### 选择所有相同的词

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+Shift+L` | 选择所有相同的词 |

```json
{
  "before": ["<leader>", "a", "a"],
  "commands": ["editor.action.selectHighlights"]
}
```

`\aa` 选择所有相同的词。

## 使用多光标编辑

多光标激活后，进入 Insert 模式：

```
1. 创建多个光标
2. i 进入 Insert 模式
3. 输入内容，所有光标位置同时输入
4. Escape 退出
```

### 演示：批量添加前缀

```javascript
const name = "John";
const age = 25;
const city = "NYC";
```

要给所有变量添加 `user` 前缀：

```
1. 在 name 上 Ctrl+D
2. Ctrl+D 两次，选中 age 和 city
3. i 进入 Insert 模式
4. 输入 user
5. Escape
```

结果：

```javascript
const userName = "John";
const userAge = 25;
const userCity = "NYC";
```

## Vim 命令与多光标

### 正常模式命令

多光标在正常模式下也生效：

```
1. 创建多个光标
2. dw 删除每个光标后的单词
3. 所有位置同时删除
```

### 文本对象

```
1. 多光标在多个单词上
2. ciw 修改所有单词
3. 输入新内容
4. Escape
```

## gb - 内置多光标命令

VSCode Vim 有内置的多光标命令 `gb`：

| 命令 | 效果 |
|------|------|
| `gb` | 添加下一个匹配到选择 |

`gb` 等同于 `Ctrl+D`，但不需要配置键位。

使用：
1. 光标在单词上
2. `gb` 选中当前单词并添加下一个匹配
3. 继续 `gb` 添加更多
4. 编辑

## 跳过不想要的匹配

使用 `Ctrl+D` 或 `gb` 时，如果当前匹配不想要：

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+K Ctrl+D` | 跳过当前匹配，选择下一个 |

## 撤销光标

### 撤销最后一个光标

| 快捷键 | 效果 |
|--------|------|
| `Ctrl+U` | 撤销上一个光标添加 |

注意：这与 Vim 的 `Ctrl+U`（半页滚动）冲突。

### 退出多光标

按 `Escape` 退出多光标模式，只保留主光标。

## 块可视模式创建多光标

`Ctrl+V` 块可视模式选中后：

```
1. Ctrl+V 进入块可视模式
2. 选中矩形区域
3. I（大写）进入插入模式
4. 输入内容
5. Escape，所有行都添加了内容
```

这与真正的多光标略有不同，但效果类似。

## 实战场景

### 场景 1：批量重命名变量

函数中的局部变量重命名：

```javascript
function process(data) {
  const result = transform(data);
  console.log(result);
  return result;
}
```

```
1. 光标在第一个 result
2. gb gb gb 选中所有 result
3. ciw 修改单词
4. 输入 output
5. Escape
```

### 场景 2：批量添加属性

```javascript
const obj = {
  name
  age
  city
}
```

要给每个属性加冒号和逗号：

```
1. V 选中三行
2. \ce 在每行末尾添加光标
3. a 在光标后插入
4. 输入 ,
5. Escape
6. f 第一列，w 跳到属性名后
7. a: 添加冒号
```

### 场景 3：快速包装字符串

```javascript
const cities = [
  Beijing
  Shanghai
  Guangzhou
]
```

给每个城市加引号：

```
1. V 选中三行城市名
2. \ce 每行末尾加光标
3. 或者使用 vim-surround
```

## 配置汇总

```json
{
  "vim.handleKeys": {
    "<C-d>": false
  },
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "a", "a"],
      "commands": ["editor.action.selectHighlights"]
    },
    {
      "before": ["<leader>", "c", "e"],
      "commands": ["editor.action.insertCursorAtEndOfEachLineSelected"]
    }
  ]
}
```

如果想保留 Vim 的 `Ctrl+D`，用 `gb` 代替多光标添加。

---

**本章收获**：
- ✅ 掌握多光标的创建方式
- ✅ 学会 gb 和 Ctrl+D 的使用
- ✅ 了解多光标下的 Vim 编辑
- ✅ 应用于批量修改场景

**效率提升**：同时修改多处，减少重复操作，批量编辑效率倍增。
