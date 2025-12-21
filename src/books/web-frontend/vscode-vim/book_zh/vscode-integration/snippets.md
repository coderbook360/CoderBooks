# 代码片段：Snippets 与 Vim 协作

代码片段是提高编码效率的利器，与 Vim 结合使用可实现极速代码生成。

## 代码片段基础

### 使用内置片段

```
1. 输入片段前缀（如 `for`）
2. Tab 展开片段
3. Tab 切换占位符
4. Esc 完成编辑
```

### 常用内置片段

JavaScript/TypeScript:
- `for` → for 循环
- `foreach` → forEach 循环
- `if` → if 语句
- `try` → try-catch 块
- `func` → 函数定义
- `class` → 类定义

## 与 Vim 协作

### 展开片段

```
i          进入插入模式
for        输入前缀
Tab        展开片段
Tab        下一个占位符
Tab        下一个占位符
Esc        返回普通模式
```

### 占位符编辑

展开后：
```javascript
for (let index = 0; index < array.length; index++) {
  const element = array[index];
  |  // 光标在这里
}
```

- `index`、`array`、`element` 是占位符
- Tab 在占位符间跳转
- 直接输入替换占位符

## 自定义代码片段

### 创建片段文件

File → Preferences → Configure User Snippets

选择语言或创建全局片段。

### 片段语法

```json
{
  "React Function Component": {
    "prefix": "rfc",
    "body": [
      "interface ${1:Component}Props {",
      "  $2",
      "}",
      "",
      "export function ${1:Component}({ $3 }: ${1:Component}Props) {",
      "  return (",
      "    <div>",
      "      $0",
      "    </div>",
      "  )",
      "}"
    ],
    "description": "React Function Component with TypeScript"
  }
}
```

### 占位符说明

- `$1`, `$2`... - 按顺序的制表位
- `$0` - 最终光标位置
- `${1:default}` - 带默认值的占位符
- `${1|one,two,three|}` - 选择列表
- `$TM_FILENAME_BASE` - 文件名变量

## 实用代码片段

### React 组件

```json
{
  "prefix": "rfc",
  "body": [
    "export function ${TM_FILENAME_BASE}() {",
    "  return (",
    "    <div>",
    "      $0",
    "    </div>",
    "  )",
    "}"
  ]
}
```

### useState Hook

```json
{
  "prefix": "us",
  "body": "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState($2)"
}
```

使用：`us` → Tab → 输入 `count` → 自动生成：
```javascript
const [count, setCount] = useState()
```

### Console Log

```json
{
  "prefix": "cl",
  "body": "console.log('${1:label}:', $1)"
}
```

### API Handler

```json
{
  "prefix": "apih",
  "body": [
    "export async function ${1:handler}(req: Request, res: Response) {",
    "  try {",
    "    $0",
    "  } catch (error) {",
    "    res.status(500).json({ error: 'Internal Server Error' })",
    "  }",
    "}"
  ]
}
```

## Vim 键位配置

### 快速触发片段

```json
{
  "vim.normalModeKeyBindingsNonRecursive": [
    // 插入模式并触发补全
    {
      "before": ["<leader>", "s", "n"],
      "commands": [
        {
          "command": "editor.action.insertSnippet"
        }
      ]
    }
  ]
}
```

### 特定片段快捷键

```json
{
  "before": ["<leader>", "c", "l"],
  "commands": [
    {
      "command": "editor.action.insertSnippet",
      "args": { "langId": "javascript", "name": "Console Log" }
    }
  ]
}
```

## 工作流示例

### 场景 1：创建 React 组件

```
1. 创建新文件 UserCard.tsx
2. i 进入插入模式
3. rfc Tab 展开组件模板
4. Tab Tab Tab 跳过占位符
5. 开始编写组件内容
```

### 场景 2：快速调试

```
1. 光标在变量后
2. o 新建行
3. cl Tab 展开 console.log
4. 输入变量名
5. Esc 返回
```

## 常用片段集合

推荐安装的片段扩展：
- ES7+ React/Redux/React-Native snippets
- JavaScript (ES6) code snippets
- Vue 3 Snippets

## 技巧与最佳实践

1. **简短前缀**：使用 2-3 个字符的前缀
2. **语义化命名**：前缀要能联想到内容
3. **合理分组**：按功能分类管理片段
4. **变量活用**：使用 `$TM_*` 变量自动填充

---

**效率提升**：自定义片段配合 Vim 快捷键，常用代码模板秒级生成。
