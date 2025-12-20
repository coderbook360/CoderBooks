# Sneak：两字符快速定位

vim-sneak 是一个简洁高效的移动插件，核心功能只有一个：输入两个字符，跳转到它们出现的位置。

## 什么是 Sneak

Sneak 的工作方式：
1. 按 `s` 进入 Sneak 模式
2. 输入两个字符
3. 跳转到这两个字符的第一个匹配位置
4. 按 `;` 跳转到下一个匹配

**为什么是两个字符？** 两个字符足够精确，比单字符搜索（`f`）冲突少，比完整搜索（`/`）更快。

## 启用 Sneak

在 settings.json 中：

```json
{
  "vim.sneak": true
}
```

## 基本命令

| 命令 | 效果 |
|------|------|
| `s{char}{char}` | 向后搜索两个字符 |
| `S{char}{char}` | 向前搜索两个字符 |
| `;` | 跳转到下一个匹配 |
| `,` | 跳转到上一个匹配 |

## 实战演示

### 场景：跳转到某个函数调用

代码中有一个 `handleSubmit` 调用，你要跳转过去：

```
1. sha    (输入 ha)
2. 跳转到第一个 "ha" 位置
3. 如果不是目标，按 ; 继续
4. 到达 handleSubmit
```

### 场景：跳转到特定变量

要跳转到 `userId`：

```
1. sus    (输入 us)
2. 跳转到第一个 "us" 位置
3. ; 继续，直到找到 userId
```

## Sneak vs f/t

| 特性 | f/t | Sneak |
|------|-----|-------|
| 搜索字符数 | 1 个 | 2 个 |
| 范围 | 行内 | 跨行 |
| 精确度 | 低 | 高 |

**f/t 的问题**：行内某个字符可能出现多次，需要多次 `;`。

**Sneak 的优势**：两个字符组合更精确，通常一次或两次就能到达目标。

## Sneak vs EasyMotion

| 特性 | Sneak | EasyMotion |
|------|-------|------------|
| 交互 | 输入两字符，顺序匹配 | 显示所有标签 |
| 按键 | s + 2字符 + 可能的 ; | Leader序列 + 标签 |
| 思维 | "跳到 xx 开头的位置" | "跳到那个标签" |

**Sneak 适合**：你知道目标的开头字符，想快速接近。

**EasyMotion 适合**：你看到目标在屏幕上，想精确跳转。

## 使用技巧

### 技巧 1：选择独特的两字符组合

不要搜索常见组合如 `th`、`in`。选择更独特的：

```
handleSubmit → 搜索 "Su" 或 "bm"
isAuthenticated → 搜索 "Au" 或 "ti"
```

### 技巧 2：利用大小写

默认 Sneak 大小写敏感：

```
"User" 和 "user" 是不同的
sUs → 跳转到 "Us" (可能是 User)
sus → 跳转到 "us" (可能是 user)
```

### 技巧 3：配合操作符

Sneak 可以作为动作（motion）与操作符配合：

```
ds{char}{char}    删除到 sneak 匹配位置
ys{char}{char}    复制到 sneak 匹配位置
cs{char}{char}    修改到 sneak 匹配位置
```

例如：`dsha` 删除从当前位置到 "ha" 出现的位置。

## 配置选项

### 大小写设置

```json
{
  "vim.sneakUseIgnorecaseAndSmartcase": true
}
```

启用后，Sneak 会遵循 Vim 的 `ignorecase` 和 `smartcase` 设置：
- 全小写搜索 → 忽略大小写
- 包含大写 → 精确匹配

### 替换 f/t

有些人喜欢用 Sneak 完全替换 `f/t`：

```json
{
  "vim.sneakReplacesF": true
}
```

启用后：
- `f{char}` 变成 Sneak（等待第二个字符）
- 如果只想搜索一个字符，输入同一个字符两次（如 `faa`）

不推荐这种配置——`f/t` 在行内快速移动还是很有用的。

## 工作流建议

### 行内移动用 f/t

当你只需要在当前行内移动，且目标字符很少时：

```
const user = { name: "John", age: 25 };
//   ↑ 光标在这
//   想到 name → fn（行内只有一个 n）
```

### 跨行移动用 Sneak

当目标在其他行，或者目标字符在行内出现多次：

```
// 10 行外有 handleSubmit
sha → 两三次 ; → 到达
```

### 精确跳转用 EasyMotion

当你眼睛已经看到目标位置，想一步到位：

```
\s 或 \\w → 选择标签 → 到达
```

## 配置汇总

```json
{
  "vim.sneak": true,
  "vim.sneakUseIgnorecaseAndSmartcase": true
}
```

可选的增强配置：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["f"],
      "after": ["s"]
    },
    {
      "before": ["F"],
      "after": ["S"]
    }
  ]
}
```

这会让 `f` 和 `F` 触发 Sneak。但会失去原生的行内 `f/t` 功能。

---

**本章收获**：
- ✅ 理解 Sneak 的工作原理
- ✅ 掌握 s/S 和 ;/, 命令
- ✅ 学会选择合适的两字符组合
- ✅ 理解 Sneak、f/t、EasyMotion 的使用场景

**效率提升**：两个字符，快速接近目标。比 f/t 更精确，比 EasyMotion 更快启动。
