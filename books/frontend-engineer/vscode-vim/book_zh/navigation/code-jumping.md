# 代码跳转：gd、gf 与定义跳转

在大型代码库中，快速跳转到函数定义、变量声明、类型定义是日常工作的核心。本章介绍 Vim 风格的代码跳转命令。

## gd：跳转到定义

`gd`（go to definition）是最常用的代码跳转命令。

### 基本用法

1. 光标放在标识符上（函数名、变量名、类名等）
2. 按 `gd`
3. 跳转到定义位置

### 实战示例

```typescript
// app.tsx
import { Button } from './components/Button';

function App() {
  return <Button onClick={handleClick}>Click</Button>;
}
```

光标在 `Button` 上按 `gd`，会跳转到 `./components/Button.tsx` 的 Button 组件定义处。

光标在 `handleClick` 上按 `gd`，会跳转到当前文件中 handleClick 函数的定义处。

### gd vs gD

| 命令 | 效果 |
|------|------|
| `gd` | 跳转到定义（Go to Definition） |
| `gD` | 跳转到声明（Go to Declaration） |

在大多数场景中两者相同。在 C/C++ 等区分声明和定义的语言中有区别。

## gf：跳转到文件

`gf`（go to file）根据光标下的路径跳转到对应文件。

### 基本用法

```typescript
import { utils } from './utils/helpers';
```

光标在 `./utils/helpers` 上按 `gf`，会打开 `./utils/helpers.ts`。

### 处理省略的扩展名

JavaScript/TypeScript 导入通常省略扩展名。VSCode Vim 会自动尝试常见扩展：

- 尝试 `.ts`
- 尝试 `.tsx`
- 尝试 `.js`
- 尝试 `/index.ts`

## VSCode 跳转命令

除了 Vim 命令，VSCode 提供了更多跳转选项：

| 快捷键 | 命令 | 效果 |
|--------|------|------|
| `F12` | Go to Definition | 跳转到定义 |
| `Alt+F12` | Peek Definition | 预览定义（不离开当前文件） |
| `Ctrl+F12` | Go to Implementation | 跳转到实现（用于接口） |
| `Shift+F12` | Go to References | 查看所有引用 |

### Peek Definition

`Alt+F12` 是一个很有用的功能——在当前编辑器中弹出一个小窗口显示定义，查看后按 `Esc` 关闭，不会切换文件。

适合快速查看函数签名或简短实现，不适合深入阅读。

## 配置 Vim 风格跳转

在 settings.json 中配置：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["g", "d"],
      "commands": ["editor.action.revealDefinition"]
    },
    {
      "before": ["g", "D"],
      "commands": ["editor.action.revealDeclaration"]
    },
    {
      "before": ["g", "h"],
      "commands": ["editor.action.showDefinitionPreviewHover"]
    },
    {
      "before": ["g", "i"],
      "commands": ["editor.action.goToImplementation"]
    },
    {
      "before": ["g", "r"],
      "commands": ["editor.action.goToReferences"]
    }
  ]
}
```

这套配置：
- `gd`：跳转到定义
- `gD`：跳转到声明
- `gh`：悬浮显示定义
- `gi`：跳转到实现
- `gr`：查看引用

## 类型定义跳转

在 TypeScript 中，经常需要查看类型定义：

```typescript
const user: User = getUser();
```

光标在 `User` 上，`gd` 会跳转到 `User` 类型的定义处。

如果 `User` 来自第三方库，会跳转到 `.d.ts` 声明文件。

配置专门的类型定义跳转：

```json
{
  "before": ["g", "t"],
  "commands": ["editor.action.goToTypeDefinition"]
}
```

`gt` 跳转到变量的类型定义（区别于变量本身的定义）。

## 返回跳转位置

跳转后如何返回？

| 命令 | 效果 |
|------|------|
| `Ctrl+O` | 返回上一个位置 |
| `Ctrl+I` | 前进到下一个位置 |

这是跳转列表导航，会在下一章详细讲解。

快速来回跳转的典型流程：

1. 在 `App.tsx` 编辑
2. 光标在 `handleClick` 上，按 `gd` 跳转查看定义
3. 阅读代码...
4. 按 `Ctrl+O` 返回 `App.tsx` 继续编辑

## 在分屏中打开定义

有时你想同时看定义和使用位置。

配置在分屏中打开定义：

```json
{
  "before": ["g", "v"],
  "commands": ["editor.action.revealDefinitionAside"]
}
```

`gv` 在右侧分屏打开定义。

或使用 VSCode 命令 `Ctrl+K F12`。

## 多个定义

当有多个可能的定义时（如重载函数），会弹出选择列表：

1. 使用 `j/k` 或 `Ctrl+N/P` 导航
2. `Enter` 选择
3. `Esc` 取消

## 跳转失败处理

跳转可能失败的原因：

**原因 1：语言服务未就绪**

打开项目后，TypeScript 服务需要几秒钟初始化。等状态栏的 TypeScript 版本号出现后再跳转。

**原因 2：类型缺失**

动态类型或 `any` 类型可能无法跳转。添加类型注解可以改善。

**原因 3：第三方库未安装类型**

安装 `@types/xxx` 包。

## 完整配置

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 跳转
    { "before": ["g", "d"], "commands": ["editor.action.revealDefinition"] },
    { "before": ["g", "D"], "commands": ["editor.action.revealDeclaration"] },
    { "before": ["g", "i"], "commands": ["editor.action.goToImplementation"] },
    { "before": ["g", "r"], "commands": ["editor.action.goToReferences"] },
    { "before": ["g", "t"], "commands": ["editor.action.goToTypeDefinition"] },
    
    // 预览
    { "before": ["g", "h"], "commands": ["editor.action.showDefinitionPreviewHover"] },
    { "before": ["g", "p"], "commands": ["editor.action.peekDefinition"] },
    
    // 分屏打开
    { "before": ["g", "v"], "commands": ["editor.action.revealDefinitionAside"] }
  ]
}
```

## 键位速查

| 键位 | 功能 |
|------|------|
| `gd` | 跳转到定义 |
| `gD` | 跳转到声明 |
| `gi` | 跳转到实现 |
| `gr` | 查看引用 |
| `gt` | 跳转到类型定义 |
| `gh` | 悬浮显示定义 |
| `gp` | Peek 定义 |
| `gv` | 分屏打开定义 |
| `gf` | 跳转到文件 |
| `Ctrl+O` | 返回 |
| `Ctrl+I` | 前进 |

---

**本章收获**：
- ✅ 掌握 gd 定义跳转
- ✅ 掌握 gf 文件跳转
- ✅ 配置完整的跳转键位
- ✅ 学会使用 Peek Definition

**效率提升**：代码导航效率提升 **5-10 倍**，理解大型代码库更加轻松。
