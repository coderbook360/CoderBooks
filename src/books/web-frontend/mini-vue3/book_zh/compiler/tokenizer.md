# 词法分析

编译器的第一步是理解模板字符串。**如何将连续的字符分解成有意义的单元？** 这就是词法分析的工作。

**本章将分析 Vue 3 编译器的词法分析器（Tokenizer）实现。** 其核心是有限状态机（FSM）——一个经典的编译原理技术。

## 什么是词法分析

词法分析将字符流转换为 Token 流：

```javascript
// 输入：模板字符串
const template = '<div class="box">{{ msg }}</div>'

// 输出：Token 序列
[
  { type: 'tagOpen', value: '<' },
  { type: 'tagName', value: 'div' },
  { type: 'attrName', value: 'class' },
  { type: 'attrValue', value: 'box' },
  { type: 'tagOpenEnd', value: '>' },
  { type: 'interpolationOpen', value: '{{' },
  { type: 'interpolation', value: ' msg ' },
  { type: 'interpolationClose', value: '}}' },
  { type: 'tagClose', value: '</div>' }
]
```

类比自然语言："我爱编程" → ["我", "爱", "编程"]

## 有限状态机

Vue 3 的词法分析器使用**有限状态机**（FSM）实现。

### 状态定义

```javascript
const State = {
  DATA: 'DATA',                    // 初始状态：普通文本
  TAG_OPEN: 'TAG_OPEN',            // 遇到 <
  TAG_NAME: 'TAG_NAME',            // 标签名
  BEFORE_ATTR_NAME: 'BEFORE_ATTR_NAME',  // 属性名之前
  ATTR_NAME: 'ATTR_NAME',          // 属性名
  AFTER_ATTR_NAME: 'AFTER_ATTR_NAME',    // 属性名之后
  BEFORE_ATTR_VALUE: 'BEFORE_ATTR_VALUE', // 属性值之前
  ATTR_VALUE_QUOTED: 'ATTR_VALUE_QUOTED', // 引号内的属性值
  ATTR_VALUE_UNQUOTED: 'ATTR_VALUE_UNQUOTED', // 无引号属性值
  END_TAG_OPEN: 'END_TAG_OPEN',    // 遇到 </
  SELF_CLOSING: 'SELF_CLOSING',    // 遇到 /
  INTERPOLATION: 'INTERPOLATION'  // 遇到 {{
}
```

### 状态转换

```
     '<'           letter        空格/'>'
DATA ───► TAG_OPEN ───► TAG_NAME ───► BEFORE_ATTR_NAME
  │                         │
  │ '{{'                    │ '/'
  ▼                         ▼
INTERPOLATION          SELF_CLOSING
```

## Tokenizer 实现

```javascript
function tokenize(template) {
  let state = State.DATA
  const tokens = []
  let buffer = ''
  let i = 0
  
  while (i < template.length) {
    const char = template[i]
    
    switch (state) {
      case State.DATA:
        if (char === '<') {
          // 输出之前的文本
          if (buffer) {
            tokens.push({ type: 'text', value: buffer })
            buffer = ''
          }
          state = State.TAG_OPEN
        } else if (template.slice(i, i + 2) === '{{') {
          // 输出之前的文本
          if (buffer) {
            tokens.push({ type: 'text', value: buffer })
            buffer = ''
          }
          tokens.push({ type: 'interpolationOpen', value: '{{' })
          i += 2
          state = State.INTERPOLATION
          continue
        } else {
          buffer += char
        }
        break
        
      case State.TAG_OPEN:
        if (char === '/') {
          state = State.END_TAG_OPEN
        } else if (/[a-zA-Z]/.test(char)) {
          buffer += char
          state = State.TAG_NAME
        }
        break
        
      case State.TAG_NAME:
        if (/[a-zA-Z0-9-]/.test(char)) {
          buffer += char
        } else if (char === ' ' || char === '\n') {
          tokens.push({ type: 'tagName', value: buffer })
          buffer = ''
          state = State.BEFORE_ATTR_NAME
        } else if (char === '>') {
          tokens.push({ type: 'tagName', value: buffer })
          tokens.push({ type: 'tagOpenEnd', value: '>' })
          buffer = ''
          state = State.DATA
        } else if (char === '/') {
          tokens.push({ type: 'tagName', value: buffer })
          buffer = ''
          state = State.SELF_CLOSING
        }
        break
        
      case State.INTERPOLATION:
        if (template.slice(i, i + 2) === '}}') {
          tokens.push({ type: 'interpolation', value: buffer })
          tokens.push({ type: 'interpolationClose', value: '}}' })
          buffer = ''
          i += 2
          state = State.DATA
          continue
        } else {
          buffer += char
        }
        break
        
      // ... 更多状态处理
    }
    
    i++
  }
  
  // 处理剩余的文本
  if (buffer && state === State.DATA) {
    tokens.push({ type: 'text', value: buffer })
  }
  
  return tokens
}
```

## 解析上下文

Vue 3 使用解析上下文维护解析状态：

```javascript
function createParserContext(content, options) {
  return {
    options,
    source: content,        // 剩余待解析的模板
    originalSource: content,
    column: 1,
    line: 1,
    offset: 0
  }
}
```

### 前进指针

```javascript
function advanceBy(context, numberOfCharacters) {
  const { source } = context
  
  // 更新位置信息
  advancePositionWithMutation(context, source, numberOfCharacters)
  
  // 截取剩余模板
  context.source = source.slice(numberOfCharacters)
}

function advancePositionWithMutation(pos, source, numberOfCharacters) {
  let linesCount = 0
  let lastNewLinePos = -1
  
  for (let i = 0; i < numberOfCharacters; i++) {
    if (source.charCodeAt(i) === 10) {  // 换行符
      linesCount++
      lastNewLinePos = i
    }
  }
  
  pos.offset += numberOfCharacters
  pos.line += linesCount
  pos.column = lastNewLinePos === -1
    ? pos.column + numberOfCharacters
    : numberOfCharacters - lastNewLinePos
}
```

## 识别不同类型的 Token

### 标签开始

```javascript
function parseTag(context, type) {
  // 匹配 < 或 </
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)
  const tag = match[1]
  
  advanceBy(context, match[0].length)
  advanceSpaces(context)
  
  // 解析属性
  const props = parseAttributes(context)
  
  // 检查自闭合
  let isSelfClosing = false
  if (context.source.startsWith('/>')) {
    isSelfClosing = true
    advanceBy(context, 2)
  } else {
    advanceBy(context, 1)  // >
  }
  
  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    isSelfClosing
  }
}
```

### 插值表达式

```javascript
function parseInterpolation(context) {
  const [open, close] = context.options.delimiters  // ['{{', '}}']
  
  // 跳过 {{
  advanceBy(context, open.length)
  
  // 找到 }}
  const closeIndex = context.source.indexOf(close)
  
  // 获取内容
  const content = context.source.slice(0, closeIndex).trim()
  
  // 跳过内容和 }}
  advanceBy(context, closeIndex + close.length)
  
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content
    }
  }
}
```

### 文本

```javascript
function parseText(context) {
  // 找到下一个 < 或 {{ 的位置
  const endTokens = ['<', context.options.delimiters[0]]
  
  let endIndex = context.source.length
  
  for (const token of endTokens) {
    const index = context.source.indexOf(token)
    if (index !== -1 && index < endIndex) {
      endIndex = index
    }
  }
  
  // 提取文本
  const content = context.source.slice(0, endIndex)
  advanceBy(context, endIndex)
  
  return {
    type: NodeTypes.TEXT,
    content
  }
}
```

## 空白处理

```javascript
function advanceSpaces(context) {
  const match = /^[\t\r\n\f ]+/.exec(context.source)
  if (match) {
    advanceBy(context, match[0].length)
  }
}
```

## 位置追踪

准确的位置信息对错误提示很重要：

```javascript
function getCursor(context) {
  const { column, line, offset } = context
  return { column, line, offset }
}

function getSelection(context, start, end) {
  end = end || getCursor(context)
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset)
  }
}
```

## 本章小结

本章分析了词法分析的实现：

- **有限状态机**：在不同状态间切换来识别 Token
- **解析上下文**：维护当前位置和剩余模板
- **advanceBy**：前进指针，更新位置信息
- **Token 类型**：标签、属性、插值、文本等
- **位置追踪**：记录行列信息，用于错误提示

词法分析是编译器的第一步，它将连续的字符分解成有意义的单元。下一章，我们将分析语法分析如何将这些 Token 组织成树形结构。
