# 代码片段创建与使用

代码片段（Snippets）是提升效率的利器。把常用代码模板化，几个字母就能展开完整代码。

## VSCode Snippets 基础

### Snippet 文件位置

- **用户级**：`~/.config/Code/User/snippets/`
- **项目级**：`.vscode/*.code-snippets`

### 创建 Snippet 文件

```
1. Ctrl+Shift+P
2. 输入 "snippets"
3. 选择 "Configure User Snippets"
4. 选择语言或创建全局 snippet
```

### Snippet 结构

```json
{
  "Snippet Name": {
    "prefix": "触发词",
    "body": ["代码内容"],
    "description": "描述"
  }
}
```

## 基本语法

### 单行 snippet

```json
{
  "Console Log": {
    "prefix": "cl",
    "body": "console.log($1);$0"
  }
}
```

- `$1`：第一个光标位置
- `$0`：最终光标位置

### 多行 snippet

```json
{
  "Arrow Function": {
    "prefix": "af",
    "body": [
      "const ${1:name} = ($2) => {",
      "  $0",
      "};"
    ]
  }
}
```

### 带占位符

```json
{
  "useState Hook": {
    "prefix": "us",
    "body": "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState($2);"
  }
}
```

`${1:state}` 表示第一个占位符，默认值是 "state"。

## 高级语法

### 变量转换

```
${1/(.*)/${1:/capitalize}/}   首字母大写
${1/(.*)/${1:/upcase}/}       全部大写
${1/(.*)/${1:/downcase}/}     全部小写
${1/(.*)/${1:/camelcase}/}    驼峰命名
${1/(.*)/${1:/pascalcase}/}   帕斯卡命名
```

### 内置变量

| 变量 | 含义 |
|------|------|
| `TM_FILENAME` | 文件名 |
| `TM_FILENAME_BASE` | 不带扩展名的文件名 |
| `TM_DIRECTORY` | 目录路径 |
| `TM_LINE_INDEX` | 当前行号（0开始） |
| `TM_LINE_NUMBER` | 当前行号（1开始） |
| `TM_SELECTED_TEXT` | 选中的文本 |
| `CLIPBOARD` | 剪贴板内容 |

### 日期变量

| 变量 | 含义 |
|------|------|
| `CURRENT_YEAR` | 年份 |
| `CURRENT_MONTH` | 月份 |
| `CURRENT_DATE` | 日期 |
| `CURRENT_HOUR` | 小时 |
| `CURRENT_MINUTE` | 分钟 |

## 实用 Snippets 集合

### JavaScript/TypeScript

```json
{
  "Console Log Variable": {
    "prefix": "clv",
    "body": "console.log('${1:var}:', ${1:var});"
  },
  "Try Catch": {
    "prefix": "tc",
    "body": [
      "try {",
      "  $1",
      "} catch (error) {",
      "  console.error(error);",
      "}"
    ]
  },
  "Async Function": {
    "prefix": "asf",
    "body": [
      "async function ${1:name}($2) {",
      "  $0",
      "}"
    ]
  },
  "Export Function": {
    "prefix": "ef",
    "body": [
      "export function ${1:name}($2) {",
      "  $0",
      "}"
    ]
  }
}
```

### React

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
  },
  "useState": {
    "prefix": "us",
    "body": "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:type}>($3);"
  },
  "useEffect": {
    "prefix": "ue",
    "body": [
      "useEffect(() => {",
      "  $1",
      "}, [$2]);"
    ]
  },
  "useCallback": {
    "prefix": "ucb",
    "body": [
      "const ${1:callback} = useCallback(($2) => {",
      "  $3",
      "}, [$4]);"
    ]
  },
  "useMemo": {
    "prefix": "um",
    "body": [
      "const ${1:memoized} = useMemo(() => {",
      "  return $2;",
      "}, [$3]);"
    ]
  }
}
```

### 测试

```json
{
  "Describe Block": {
    "prefix": "desc",
    "body": [
      "describe('${1:description}', () => {",
      "  $0",
      "});"
    ]
  },
  "It Block": {
    "prefix": "it",
    "body": [
      "it('should ${1:description}', () => {",
      "  $0",
      "});"
    ]
  },
  "Async It Block": {
    "prefix": "ita",
    "body": [
      "it('should ${1:description}', async () => {",
      "  $0",
      "});"
    ]
  },
  "Test Block": {
    "prefix": "test",
    "body": [
      "test('${1:description}', () => {",
      "  $0",
      "});"
    ]
  }
}
```

### 注释

```json
{
  "TODO Comment": {
    "prefix": "todo",
    "body": "// TODO: $1"
  },
  "FIXME Comment": {
    "prefix": "fixme",
    "body": "// FIXME: $1"
  },
  "File Header": {
    "prefix": "header",
    "body": [
      "/**",
      " * @file ${TM_FILENAME}",
      " * @author ${1:Your Name}",
      " * @date ${CURRENT_YEAR}-${CURRENT_MONTH}-${CURRENT_DATE}",
      " */"
    ]
  },
  "JSDoc Function": {
    "prefix": "jsdoc",
    "body": [
      "/**",
      " * ${1:Description}",
      " * @param {${2:type}} ${3:param} - ${4:description}",
      " * @returns {${5:type}} ${6:description}",
      " */"
    ]
  }
}
```

## 使用 Snippets

### 在 Vim 中使用

```
1. i 进入插入模式
2. 输入 prefix
3. Tab 展开
4. 填写占位符
5. Tab 跳到下一个
6. Esc 完成
```

### 选择要包裹的文本

某些 snippet 可以包裹选中的文本：

```json
{
  "Wrap in Try Catch": {
    "prefix": "wtc",
    "body": [
      "try {",
      "  ${TM_SELECTED_TEXT}",
      "} catch (error) {",
      "  console.error(error);",
      "}"
    ]
  }
}
```

使用：

```
1. V 选中代码
2. Ctrl+Shift+P
3. 输入 "Insert Snippet"
4. 选择 snippet
```

## 项目级 Snippets

### 创建项目 snippet

`.vscode/project.code-snippets`:

```json
{
  "Project Component": {
    "scope": "typescript,typescriptreact",
    "prefix": "pcomp",
    "body": [
      "import styles from './${TM_FILENAME_BASE}.module.css';",
      "",
      "export function ${TM_FILENAME_BASE}() {",
      "  return (",
      "    <div className={styles.container}>",
      "      $0",
      "    </div>",
      "  );",
      "}"
    ]
  }
}
```

### scope 限制语言

```json
{
  "scope": "javascript,typescript,javascriptreact,typescriptreact"
}
```

## Snippet 管理

### 组织 snippets

按功能或技术分文件：

```
snippets/
├── javascript.json
├── typescript.json
├── react.json
├── css.json
└── test.json
```

### 使用 snippet 扩展

推荐扩展：

- ES7+ React/Redux/React-Native snippets
- JavaScript (ES6) code snippets

### 自定义 vs 扩展

- **扩展**：覆盖常见模式，开箱即用
- **自定义**：匹配你的编码风格和项目规范

## 与 Vim 结合

### 快速插入

```
1. o 新建行进入插入
2. 输入 snippet prefix
3. Tab 展开
```

### 跳过占位符

如果不需要某个占位符：

```
Tab     跳到下一个
Shift+Tab   跳到上一个
Esc     退出编辑（保留当前内容）
```

### 使用 . 命令

Snippet 展开后的编辑可以用 `.` 重复。

## 实用技巧

### 同步 snippets

把 snippets 文件放入 dotfiles 或云同步。

### 命名规范

- **短**：常用的用短前缀（us, ue, cl）
- **描述性**：不常用的用描述性前缀（componentWithProps）
- **一致**：保持命名风格一致

### 避免冲突

- 检查是否与现有 snippet 冲突
- 优先使用更具体的前缀

---

**本章收获**：
- ✅ 掌握 VSCode Snippet 语法
- ✅ 学会创建自定义 snippets
- ✅ 建立常用代码的 snippet 库
- ✅ 在 Vim 工作流中高效使用 snippets

**效率提升**：常用代码模板化，几个字母展开完整代码块，减少重复输入。
