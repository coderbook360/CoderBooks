# Source Map 的生成原理

调试编译后的代码时，我们希望能定位到原始模板位置。**Source Map 实现了这一能力。**

**理解 Source Map 的生成原理，能帮你更好地调试 Vue 组件。** 本章将分析 Vue 编译器如何生成 Source Map。

## Source Map 是什么

Source Map 是一个映射文件，记录编译后代码与源代码的位置对应关系：

```json
{
  "version": 3,
  "file": "out.js",
  "sourceRoot": "",
  "sources": ["foo.vue"],
  "names": [],
  "mappings": "AAAA,..."
}
```

关键字段：

- `sources`：原始文件列表
- `mappings`：位置映射信息（VLQ 编码）

## CodegenContext 中的 Source Map 支持

```javascript
function createCodegenContext(ast, options) {
  const context = {
    // ...
    source: ast.loc.source,
    line: 1,
    column: 1,
    offset: 0,
    map: undefined
  }
  
  if (options.sourceMap) {
    context.map = new SourceMapGenerator()
    context.map.setSourceContent(options.filename, context.source)
  }
  
  return context
}
```

## 位置追踪

每次输出代码时追踪位置：

```javascript
function createCodegenContext(ast, options) {
  // ...
  
  context.push = (code, node) => {
    context.code += code
    
    if (context.map) {
      if (node) {
        // 添加映射
        context.map.addMapping({
          source: options.filename,
          original: {
            line: node.loc.start.line,
            column: node.loc.start.column - 1 // 0-based
          },
          generated: {
            line: context.line,
            column: context.column - 1
          }
        })
      }
      
      // 更新位置
      advancePositionWithMutation(context, code)
    }
  }
  
  return context
}
```

位置更新：

```javascript
function advancePositionWithMutation(pos, source) {
  let linesCount = 0
  let lastNewLinePos = -1
  
  for (let i = 0; i < source.length; i++) {
    if (source.charCodeAt(i) === 10 /* \n */) {
      linesCount++
      lastNewLinePos = i
    }
  }
  
  pos.offset += source.length
  pos.line += linesCount
  pos.column = lastNewLinePos === -1
    ? pos.column + source.length
    : source.length - lastNewLinePos
}
```

## 节点位置传递

生成代码时传递节点位置：

```javascript
function genNode(node, context) {
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context)
      break
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    // ...
  }
}

function genText(node, context) {
  // 传递 node 以记录映射
  context.push(JSON.stringify(node.content), node)
}

function genInterpolation(node, context) {
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(')')
}

function genExpression(node, context) {
  // 表达式带有源码位置
  context.push(node.content, node)
}
```

## VLQ 编码

Source Map 使用 VLQ（Variable-Length Quantity）编码压缩位置信息。

每个映射包含 5 个数值：

1. 生成代码的列号增量
2. 源文件索引增量
3. 源代码行号增量
4. 源代码列号增量
5. 名称索引增量（可选）

VLQ 编码原理：

```javascript
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function encodeVLQ(value) {
  let result = ''
  let vlq = value < 0
    ? ((-value) << 1) + 1
    : value << 1
  
  do {
    let digit = vlq & 0x1f
    vlq >>>= 5
    if (vlq > 0) {
      digit |= 0x20 // 续位标记
    }
    result += BASE64[digit]
  } while (vlq > 0)
  
  return result
}
```

## 完整示例

模板：

```html
<div>{{ msg }}</div>
```

生成代码：

```javascript
import { toDisplayString as _toDisplayString } from "vue"

export function render(_ctx) {
  return _createElementVNode("div", null, _toDisplayString(_ctx.msg))
}
```

Source Map 映射（简化）：

```
生成位置           源码位置
line 4, col 9   -> line 1, col 0   ("div")
line 4, col 41  -> line 1, col 5   ("{{ msg }}")
line 4, col 63  -> line 1, col 7   ("msg")
```

## 开发体验

启用 Source Map 后：

1. 浏览器 DevTools 显示原始模板位置
2. 错误堆栈指向 `.vue` 文件而非编译后代码
3. 断点可以设置在模板中

开发模式配置：

```javascript
compile(template, {
  sourceMap: true,
  filename: 'App.vue'
})
```

## 本章小结

本章分析了 Source Map 的生成原理：

- **位置追踪**：输出代码时追踪行列号
- **节点位置**：从 AST 节点获取源码位置
- **VLQ 编码**：压缩位置信息
- **开发体验**：调试时定位到原始模板

Source Map 是开发体验的重要保障。下一章将分析模块导入语句的生成。
