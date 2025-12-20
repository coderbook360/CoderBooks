# React 组件开发工作流

构建高效的 React 组件开发工作流，从创建到测试的完整键盘驱动流程。

## 组件创建

### 快速创建组件文件

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "n", "c"],
      "commands": ["workbench.action.files.newUntitledFile"]
    }
  ]
}
```

### 组件代码片段

创建 `.vscode/snippets/typescriptreact.json`：

```json
{
  "React Functional Component": {
    "prefix": "rfc",
    "body": [
      "interface ${1:ComponentName}Props {",
      "  $2",
      "}",
      "",
      "export function ${1:ComponentName}({ $3 }: ${1:ComponentName}Props) {",
      "  return (",
      "    <div>",
      "      $0",
      "    </div>",
      "  );",
      "}"
    ]
  },
  "React Functional Component with Export": {
    "prefix": "rfce",
    "body": [
      "interface ${1:ComponentName}Props {",
      "  $2",
      "}",
      "",
      "export const ${1:ComponentName} = ({ $3 }: ${1:ComponentName}Props) => {",
      "  return (",
      "    <div>",
      "      $0",
      "    </div>",
      "  );",
      "};"
    ]
  }
}
```

使用：输入 `rfc` + Tab

## Props 编辑

### 添加新 Prop

```typescript
interface ButtonProps {
  label: string;
  // 光标在此，添加新 prop
}
```

操作：
1. `o` → 新行
2. 输入 prop 定义
3. `Esc`

### 批量添加 Props

```typescript
// 使用 Visual Block 模式
interface CardProps {
  title: string;
  description: string;
  imageUrl: string;
}

// 要添加 optional（?）
```

操作：
1. `Ctrl+v` → Visual Block
2. `2j` → 选择多行
3. `f:` → 找到冒号
4. `i?` → 在冒号前插入 `?`
5. `Esc`

### 解构 Props

```typescript
// 前
function Card(props: CardProps) {
  return <div>{props.title}</div>;
}

// 后
function Card({ title, description }: CardProps) {
  return <div>{title}</div>;
}
```

操作：
1. 选中 `props`
2. 使用 Quick Fix 提取解构
3. 或手动：`ci(` → 输入解构

## Hooks 工作流

### useState

```json
{
  "useState Hook": {
    "prefix": "ust",
    "body": [
      "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:type}>(${3:initialValue});"
    ]
  }
}
```

使用：`ust` + Tab

### useEffect

```json
{
  "useEffect Hook": {
    "prefix": "uef",
    "body": [
      "useEffect(() => {",
      "  $1",
      "  return () => {",
      "    $2",
      "  };",
      "}, [$3]);"
    ]
  }
}
```

### Hook 导航

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "h"],
      "commands": ["workbench.action.quickOpen"],
      "args": ["@use"]
    }
  ]
}
```

定位所有 hooks（搜索符号以 "use" 开头）。

## JSX 编辑

### 快速包裹元素

```typescript
// 前
<span>{text}</span>

// 后：包裹在 div 中
<div>
  <span>{text}</span>
</div>
```

操作：
1. `vat` → 选中整个元素
2. `S<div>` → 使用 Vim Surround 包裹

### 条件渲染

```json
{
  "Conditional Render": {
    "prefix": "cond",
    "body": [
      "{${1:condition} && (",
      "  $0",
      ")}"
    ]
  },
  "Ternary Render": {
    "prefix": "tern",
    "body": [
      "{${1:condition} ? (",
      "  $2",
      ") : (",
      "  $3",
      ")}"
    ]
  }
}
```

### 快速添加 className

```typescript
// 光标在 <div> 上
<div>content</div>

// 添加 className
<div className="container">content</div>
```

操作：
1. `f>` → 找到 `>`
2. `i className="container"` → 插入
3. `Esc`

## 事件处理

### 添加事件处理器

```json
{
  "Event Handler": {
    "prefix": "handle",
    "body": [
      "const handle${1:Event} = (${2:e}: ${3:React.MouseEvent}) => {",
      "  $0",
      "};"
    ]
  }
}
```

### 内联到提取

```typescript
// 前：内联
<button onClick={() => setCount(count + 1)}>

// 后：提取
const handleClick = () => setCount(count + 1);
<button onClick={handleClick}>
```

操作：
1. 选中 `() => setCount(count + 1)`
2. `<leader>ef` → 提取函数
3. 或手动剪切粘贴

## 组件导航

### 跳转到定义

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["g", "d"],
      "commands": ["editor.action.revealDefinition"]
    },
    {
      "before": ["g", "D"],
      "commands": ["editor.action.revealDefinitionAside"]
    }
  ]
}
```

- `gd` → 跳转到组件定义
- `gD` → 在侧边打开定义

### 查找组件使用

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["g", "r"],
      "commands": ["editor.action.goToReferences"]
    }
  ]
}
```

### 组件文件跳转

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "g", "c"],
      "commands": ["workbench.action.quickOpen"],
      "args": [".tsx"]
    }
  ]
}
```

## 样式编辑

### CSS Modules

```typescript
import styles from './Button.module.css';

<button className={styles.button}>
```

`gd` 在 `styles.button` 上可跳转到 CSS 定义（需要扩展支持）。

### Styled Components

```typescript
const Button = styled.button`
  padding: 10px;
  // Vim 操作在模板字符串内有效
`;
```

## 测试文件工作流

### 跳转到测试

```json
{
  "vim.normalModeKeyBindings": [
    {
      "before": ["<leader>", "t", "f"],
      "commands": ["workbench.action.quickOpen"],
      "args": [".test.tsx"]
    }
  ]
}
```

### 测试代码片段

```json
{
  "React Test": {
    "prefix": "rtest",
    "body": [
      "import { render, screen } from '@testing-library/react';",
      "import { ${1:ComponentName} } from './${1:ComponentName}';",
      "",
      "describe('${1:ComponentName}', () => {",
      "  it('should render correctly', () => {",
      "    render(<${1:ComponentName} $2 />);",
      "    expect(screen.getByText($3)).toBeInTheDocument();",
      "  });",
      "});"
    ]
  }
}
```

## 组件重构

### 提取子组件

```typescript
// 前：大组件
function UserProfile() {
  return (
    <div>
      <div className="avatar">
        <img src={user.avatar} />
        <span>{user.name}</span>
      </div>
      <div className="info">...</div>
    </div>
  );
}

// 后：提取 Avatar 组件
function Avatar({ src, name }) {
  return (
    <div className="avatar">
      <img src={src} />
      <span>{name}</span>
    </div>
  );
}
```

操作：
1. 选中要提取的 JSX
2. 剪切
3. 创建新组件
4. 替换为新组件调用

### 转换组件类型

函数组件 ↔ 箭头函数：

```typescript
// 函数声明
function Button() { }

// 箭头函数
const Button = () => { }
```

手动修改或使用宏录制。

## 完整键位配置

```json
{
  "vim.normalModeKeyBindings": [
    // 组件导航
    { "before": ["g", "d"], "commands": ["editor.action.revealDefinition"] },
    { "before": ["g", "r"], "commands": ["editor.action.goToReferences"] },
    { "before": ["g", "i"], "commands": ["editor.action.goToImplementation"] },
    
    // 快速操作
    { "before": ["<leader>", "r", "n"], "commands": ["editor.action.rename"] },
    { "before": ["<leader>", "c", "a"], "commands": ["editor.action.quickFix"] },
    
    // 文件跳转
    { "before": ["<leader>", "g", "t"], "commands": ["workbench.action.quickOpen"], "args": [".test."] },
    { "before": ["<leader>", "g", "s"], "commands": ["workbench.action.quickOpen"], "args": [".css"] }
  ]
}
```

## 效率技巧总结

| 任务 | 最快操作 |
|------|----------|
| 创建组件 | `rfc` + Tab |
| 添加 Prop | `o` + 输入 |
| 添加 Hook | `ust`/`uef` + Tab |
| 包裹元素 | `vat` + `S<tag>` |
| 跳转定义 | `gd` |
| 查找引用 | `gr` |
| 重命名 | `<leader>rn` |
| 提取函数 | `<leader>ef` |

## 总结

React 组件开发高效工作流：

1. **代码片段**：快速生成组件骨架和 hooks
2. **Vim 操作**：`vat`/`cit` 处理 JSX
3. **符号导航**：`gd`/`gr` 跳转和查找
4. **重构操作**：`<leader>rn` 重命名，提取函数
5. **文件跳转**：快速在组件和测试间切换

---

**下一步**：学习测试文件快速跳转与运行。
