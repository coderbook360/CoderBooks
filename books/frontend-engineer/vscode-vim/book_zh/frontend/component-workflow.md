# 组件开发工作流

高效的组件开发需要流畅的工作流程。本章介绍从创建到调试的完整流程。

## 创建组件

### 新建文件

```
1. Ctrl+n 新建文件
2. Ctrl+s 保存，输入文件名 ComponentName.tsx
```

或使用文件浏览器：

```
1. \e 打开资源管理器
2. a 新建文件
3. 输入文件名
4. Enter
```

### 组件模板

使用代码片段快速生成：

```
rfc<Tab>
→
export function ComponentName() {
  return (
    <div>
      
    </div>
  );
}
```

### 推荐的 snippets

```json
{
  "React Function Component": {
    "prefix": "rfc",
    "body": [
      "export function ${TM_FILENAME_BASE}() {",
      "  return (",
      "    <div>",
      "      $0",
      "    </div>",
      "  );",
      "}"
    ]
  },
  "React Function Component with Props": {
    "prefix": "rfcp",
    "body": [
      "interface ${TM_FILENAME_BASE}Props {",
      "  $1",
      "}",
      "",
      "export function ${TM_FILENAME_BASE}({ $2 }: ${TM_FILENAME_BASE}Props) {",
      "  return (",
      "    <div>",
      "      $0",
      "    </div>",
      "  );",
      "}"
    ]
  }
}
```

`${TM_FILENAME_BASE}` 自动使用文件名作为组件名。

## 编写组件

### 添加 Props

```
1. 光标在组件函数上
2. 添加参数和类型
3. 使用 props
```

快速定义接口：

```typescript
// 先写使用处
function Button({ label, onClick }) {
  return <button onClick={onClick}>{label}</button>;
}

// 然后光标在参数上，使用 Quick Fix 生成类型
```

### 添加 Hooks

输入 snippets：

```
us<Tab>   → useState
ue<Tab>   → useEffect
um<Tab>   → useMemo
uc<Tab>   → useCallback
```

### 配套 snippets

```json
{
  "useState": {
    "prefix": "us",
    "body": "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:type}>($3);"
  },
  "useEffect": {
    "prefix": "ue",
    "body": [
      "useEffect(() => {",
      "  $1",
      "  return () => {",
      "    $2",
      "  };",
      "}, [$3]);"
    ]
  },
  "useMemo": {
    "prefix": "um",
    "body": [
      "const ${1:memoized} = useMemo(() => {",
      "  return $2;",
      "}, [$3]);"
    ]
  },
  "useCallback": {
    "prefix": "ucb",
    "body": [
      "const ${1:callback} = useCallback(($2) => {",
      "  $3",
      "}, [$4]);"
    ]
  }
}
```

## 组件导航

### 跳转到组件定义

```
1. 光标在 <ComponentName />
2. gd 跳转到定义
```

### 查看组件引用

```
1. 光标在组件名上
2. gr 查看引用
```

### 组件间快速切换

```
Ctrl+Tab       最近文件
Ctrl+p         文件名搜索
gf             跳转到导入文件
```

## 重构组件

### 重命名组件

```
1. 光标在组件名上
2. F2 或 \rn
3. 输入新名称
4. Enter
```

会同时重命名文件（如果配置了）和所有引用。

### 提取组件

手动提取：

```
1. 选中要提取的 JSX
2. d 剪切
3. 创建新文件
4. rfc<Tab> 生成模板
5. 粘贴 JSX
6. 回到原文件，导入并使用新组件
```

VSCode 重构：

```
1. 选中 JSX
2. Ctrl+Shift+R 重构菜单
3. 选择 "Extract to component"
```

### 提取 Hook

```
1. 选中 hook 相关代码
2. 移动到新文件 useXxx.ts
3. 导出 hook
4. 原位置导入使用
```

## 样式处理

### CSS Modules

```typescript
import styles from './Component.module.css';

function Component() {
  return <div className={styles.container}>...</div>;
}
```

### styled-components

```typescript
const Container = styled.div`
  display: flex;
`;
```

### Tailwind

```tsx
<div className="flex items-center justify-center">
```

Tailwind IntelliSense 提供类名补全。

## 测试工作流

### 创建测试文件

```
1. 组件文件 Button.tsx
2. 创建 Button.test.tsx 或 __tests__/Button.test.tsx
```

### 测试模板

```json
{
  "React Test": {
    "prefix": "rtc",
    "body": [
      "import { render, screen } from '@testing-library/react';",
      "import { ${TM_FILENAME_BASE/(.*)\\..*/\\1/} } from './${TM_FILENAME_BASE/(.*)\\..*/\\1/}';",
      "",
      "describe('${TM_FILENAME_BASE/(.*)\\..*/\\1/}', () => {",
      "  it('should render', () => {",
      "    render(<${TM_FILENAME_BASE/(.*)\\..*/\\1/} />);",
      "    $0",
      "  });",
      "});"
    ]
  }
}
```

### 运行测试

```
\rt     运行当前文件测试
\ra     运行所有测试
```

配置：

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    {
      "before": ["<leader>", "r", "t"],
      "commands": ["testing.runCurrentFile"]
    },
    {
      "before": ["<leader>", "r", "a"],
      "commands": ["testing.runAll"]
    }
  ]
}
```

## 调试组件

### 添加断点

```
\db     切换断点
```

### 启动调试

```
F5      启动调试
\dn     下一步
\di     步入
\do     步出
\dc     继续
```

### Console 调试

```
1. 输入 cl<Tab> 展开 console.log snippet
2. 输入变量名
```

snippet:

```json
{
  "Console Log": {
    "prefix": "cl",
    "body": "console.log('$1:', $1);"
  }
}
```

## 组件文档

### JSDoc 注释

```typescript
/**
 * A reusable button component
 * @param label - Button text
 * @param onClick - Click handler
 */
export function Button({ label, onClick }: ButtonProps) {
  // ...
}
```

### Storybook

如果使用 Storybook：

```
1. 创建 Component.stories.tsx
2. 编写 stories
3. npm run storybook 查看
```

## 高效工作流示例

### 新建功能组件

```
1. \e 打开资源管理器
2. 导航到 components 目录
3. a 新建 UserCard.tsx
4. rfc<Tab> 生成模板
5. 编写 props 接口
6. 实现组件逻辑
7. \ff 搜索使用处
8. 导入并使用组件
```

### 修改现有组件

```
1. Ctrl+p 搜索组件文件
2. gd 跳转到定义
3. 修改
4. gr 查看引用确保没有破坏
5. Ctrl+o 返回原位置
```

### 重构组件

```
1. 识别要提取的代码
2. 创建新组件文件
3. 移动代码
4. 更新导入
5. 运行测试验证
```

## 键位映射汇总

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 组件导航
    { "before": ["g", "d"], "commands": ["editor.action.revealDefinition"] },
    { "before": ["g", "r"], "commands": ["editor.action.goToReferences"] },
    
    // 重构
    { "before": ["<leader>", "r", "n"], "commands": ["editor.action.rename"] },
    { "before": ["<leader>", "r", "f"], "commands": ["editor.action.refactor"] },
    
    // 测试
    { "before": ["<leader>", "r", "t"], "commands": ["testing.runCurrentFile"] },
    
    // 调试
    { "before": ["<leader>", "d", "b"], "commands": ["editor.debug.action.toggleBreakpoint"] }
  ]
}
```

---

**本章收获**：
- ✅ 掌握完整的组件开发流程
- ✅ 学会使用代码片段加速开发
- ✅ 熟练组件间的导航和重构
- ✅ 建立高效的测试和调试习惯

**效率提升**：从创建到调试的完整流程都有键盘快捷方式，大幅提升开发效率。
