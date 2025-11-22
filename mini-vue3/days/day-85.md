# Day 85: 模板编译器 - 词法分析

> 学习日期: 2026年02月14日  
> 预计用时: 3.5小时  
> 难度等级: ⭐⭐⭐

## 📋 今日目标

- [ ] 理解编译器的基本概念和流程
- [ ] 掌握词法分析（Tokenize）的原理
- [ ] 实现有限状态机（FSM）
- [ ] 实现 HTML 模板的 Token 化
- [ ] 处理文本、标签、属性等各种 Token

## ⏰ 时间规划

- 理论学习: 1.5小时
- 编码实践: 1.5小时
- 测试调试: 30分钟

---

## 📚 理论知识详解

### 1. 编译器概述

#### 1.1 什么是编译器？

**编译器**将高级语言（如 Vue 模板）转换为低级代码（如 render 函数）。

```vue
<!-- 源代码：Vue 模板 -->
<template>
  <div class="container">
    <h1>{{ title }}</h1>
    <button @click="handleClick">Click</button>
  </div>
</template>
```

```javascript
// 目标代码：render 函数
function render() {
  return createVNode('div', { class: 'container' }, [
    createVNode('h1', null, title),
    createVNode('button', { onClick: handleClick }, 'Click')
  ])
}
```

#### 1.2 编译流程

Vue 3 的模板编译分为 4 个阶段：

```
模板字符串
    ↓
【1. 词法分析 Tokenize】
    生成 Token 流
    ↓
【2. 语法分析 Parse】
    生成 AST（抽象语法树）
    ↓
【3. 转换 Transform】
    优化和转换 AST
    ↓
【4. 代码生成 Generate】
    生成 render 函数代码
```

**今天我们focus on第一阶段：词法分析**。

---

### 2. 词法分析（Tokenize）

#### 2.1 什么是 Token？

Token 是**源代码的最小单元**，类似于英语中的单词。

```html
<div class="container">Hello</div>
```

**Token 流**：
```javascript
[
  { type: 'tagStart', name: 'div' },            // <div
  { type: 'attribute', name: 'class', value: 'container' }, // class="container"
  { type: 'tagEnd' },                            // >
  { type: 'text', content: 'Hello' },            // Hello
  { type: 'tagClose', name: 'div' }              // </div>
]
```

#### 2.2 Token 的类型

```typescript
enum TokenType {
  // 标签相关
  TAG_START,        // <div
  TAG_END,          // >
  TAG_CLOSE,        // </div>
  TAG_SELF_CLOSE,   // />
  
  // 属性相关
  ATTRIBUTE,        // class="value"
  
  // 内容相关
  TEXT,             // 文本内容
  INTERPOLATION,    // {{ expression }}
  
  // 特殊
  COMMENT,          // <!-- comment -->
  CDATA,            // <![CDATA[...]]>
  DOCTYPE,          // <!DOCTYPE html>
  
  // 结束
  EOF               // End Of File
}
```

---

### 3. 有限状态机（FSM）

#### 3.1 状态机原理

**有限状态机**是词法分析的核心算法。

```
初始状态
    ↓
读取字符，根据规则转换到下一个状态
    ↓
重复直到结束
```

#### 3.2 状态定义

```typescript
enum State {
  // 初始状态
  DATA,               // 初始状态
  
  // 标签相关
  TAG_OPEN,           // 遇到 <
  TAG_NAME,           // 读取标签名
  TAG_END,            // 标签结束 >
  END_TAG_OPEN,       // 遇到 </
  END_TAG_NAME,       // 读取闭合标签名
  SELF_CLOSING_TAG,   // 自闭合标签 />
  
  // 属性相关
  BEFORE_ATTRIBUTE_NAME,  // 属性名之前
  ATTRIBUTE_NAME,         // 属性名
  AFTER_ATTRIBUTE_NAME,   // 属性名之后
  BEFORE_ATTRIBUTE_VALUE, // 属性值之前
  ATTRIBUTE_VALUE_DOUBLE_QUOTED, // 双引号属性值
  ATTRIBUTE_VALUE_SINGLE_QUOTED, // 单引号属性值
  ATTRIBUTE_VALUE_UNQUOTED,      // 无引号属性值
  
  // 插值相关
  INTERPOLATION_OPEN,  // {{
  INTERPOLATION,       // 插值内容
  INTERPOLATION_CLOSE, // }}
  
  // 注释相关
  COMMENT_START,       // <!--
  COMMENT,             // 注释内容
  COMMENT_END,         // -->
}
```

#### 3.3 状态转换示例

解析 `<div>`：

```
DATA 状态，读到 '<'
  → TAG_OPEN 状态

TAG_OPEN 状态，读到 'd'
  → TAG_NAME 状态，token.name = 'd'

TAG_NAME 状态，读到 'i'
  → 保持 TAG_NAME 状态，token.name = 'di'

TAG_NAME 状态，读到 'v'
  → 保持 TAG_NAME 状态，token.name = 'div'

TAG_NAME 状态，读到 '>'
  → TAG_END 状态，生成 Token，回到 DATA 状态
```

---

### 4. 词法分析的挑战

#### 4.1 模板 vs HTML

Vue 模板不是标准 HTML，有特殊语法：

```html
<!-- HTML -->
<div class="container">Hello</div>

<!-- Vue 模板 -->
<div :class="dynamicClass">{{ message }}</div>
<component v-if="show" @click="handler" />
```

需要特殊处理：
- 插值 `{{ }}`
- 指令 `v-if`, `v-for`
- 动态绑定 `:`
- 事件绑定 `@`
- 自闭合组件

#### 4.2 边界情况

```html
<!-- 1. 属性值中的特殊字符 -->
<div title="<hello>">

<!-- 2. 注释中的特殊字符 -->
<!-- <div> -->

<!-- 3. 嵌套插值 -->
<div>{{ a + '{{b}}' }}</div>

<!-- 4. 转义字符 -->
<div>&lt;&gt;&amp;</div>
```

---

## 💻 实践任务

### 任务目标
实现一个完整的词法分析器，将 HTML 模板转换为 Token 流。

---

### 步骤1：定义 Token 类型（15分钟）

```typescript
// src/compiler-core/tokenizer.ts

/**
 * Token 类型
 */
export enum TokenType {
  TAG_START,
  TAG_END,
  TAG_CLOSE,
  TAG_SELF_CLOSE,
  ATTRIBUTE,
  TEXT,
  INTERPOLATION,
  COMMENT,
  EOF
}

/**
 * Token 接口
 */
export interface Token {
  type: TokenType
  content?: string
  name?: string
  value?: string
  loc?: SourceLocation
}

export interface SourceLocation {
  start: Position
  end: Position
}

export interface Position {
  offset: number // 偏移量
  line: number   // 行号
  column: number // 列号
}

/**
 * Tokenizer 上下文
 */
interface Context {
  source: string      // 源代码
  index: number       // 当前位置
  line: number        // 当前行
  column: number      // 当前列
  tokens: Token[]     // Token 列表
}
```

---

### 步骤2：实现 Tokenizer 核心（40分钟）

```typescript
// src/compiler-core/tokenizer.ts

/**
 * 词法分析器
 */
export function tokenize(template: string): Token[] {
  const context: Context = {
    source: template,
    index: 0,
    line: 1,
    column: 1,
    tokens: []
  }
  
  // 有限状态机
  let state: State = State.DATA
  
  while (context.index < context.source.length) {
    const char = context.source[context.index]
    
    switch (state) {
      case State.DATA:
        state = parseData(context, char)
        break
        
      case State.TAG_OPEN:
        state = parseTagOpen(context, char)
        break
        
      case State.TAG_NAME:
        state = parseTagName(context, char)
        break
        
      case State.END_TAG_OPEN:
        state = parseEndTagOpen(context, char)
        break
        
      case State.BEFORE_ATTRIBUTE_NAME:
        state = parseBeforeAttributeName(context, char)
        break
        
      case State.ATTRIBUTE_NAME:
        state = parseAttributeName(context, char)
        break
        
      case State.BEFORE_ATTRIBUTE_VALUE:
        state = parseBeforeAttributeValue(context, char)
        break
        
      case State.ATTRIBUTE_VALUE_DOUBLE_QUOTED:
        state = parseAttributeValueDoubleQuoted(context, char)
        break
        
      case State.INTERPOLATION_OPEN:
        state = parseInterpolationOpen(context, char)
        break
        
      case State.INTERPOLATION:
        state = parseInterpolation(context, char)
        break
        
      case State.COMMENT_START:
        state = parseCommentStart(context, char)
        break
        
      case State.COMMENT:
        state = parseComment(context, char)
        break
    }
    
    // 移动到下一个字符
    advanceBy(context, 1)
  }
  
  // 添加 EOF token
  context.tokens.push({ type: TokenType.EOF })
  
  return context.tokens
}

/**
 * 前进 n 个字符
 */
function advanceBy(context: Context, n: number) {
  for (let i = 0; i < n; i++) {
    if (context.source[context.index] === '\n') {
      context.line++
      context.column = 1
    } else {
      context.column++
    }
    context.index++
  }
}

/**
 * 查看后续字符（不移动位置）
 */
function peek(context: Context, n: number = 1): string {
  return context.source.slice(context.index, context.index + n)
}

/**
 * 创建位置信息
 */
function getPosition(context: Context): Position {
  return {
    offset: context.index,
    line: context.line,
    column: context.column
  }
}
```

---

### 步骤3：实现状态处理函数（50分钟）

```typescript
// src/compiler-core/tokenizer.ts

/**
 * 状态：DATA（初始状态）
 */
function parseData(context: Context, char: string): State {
  if (char === '<') {
    // 可能是标签或注释
    if (peek(context, 4) === '<!--') {
      return State.COMMENT_START
    } else if (peek(context, 2)[1] === '/') {
      return State.END_TAG_OPEN
    } else {
      return State.TAG_OPEN
    }
  } else if (peek(context, 2) === '{{') {
    return State.INTERPOLATION_OPEN
  } else {
    // 文本内容
    const start = context.index
    let content = ''
    
    while (context.index < context.source.length) {
      const ch = context.source[context.index]
      if (ch === '<' || peek(context, 2) === '{{') {
        break
      }
      content += ch
      context.index++
    }
    
    if (content) {
      context.tokens.push({
        type: TokenType.TEXT,
        content: content.trim()
      })
    }
    
    context.index = start // 回退，让下一次循环处理 < 或 {{
    return State.DATA
  }
}

/**
 * 状态：TAG_OPEN（遇到 <）
 */
function parseTagOpen(context: Context, char: string): State {
  context.index++ // 跳过 <
  return State.TAG_NAME
}

/**
 * 状态：TAG_NAME（读取标签名）
 */
let currentTag: Partial<Token> = {}

function parseTagName(context: Context, char: string): State {
  if (!currentTag.name) {
    currentTag = { type: TokenType.TAG_START, name: '' }
  }
  
  if (/[a-zA-Z0-9\-]/.test(char)) {
    currentTag.name += char
    return State.TAG_NAME
  } else if (char === '>') {
    context.tokens.push(currentTag as Token)
    context.tokens.push({ type: TokenType.TAG_END })
    currentTag = {}
    return State.DATA
  } else if (char === '/') {
    if (peek(context, 1) === '>') {
      context.tokens.push(currentTag as Token)
      context.tokens.push({ type: TokenType.TAG_SELF_CLOSE })
      advanceBy(context, 1) // 跳过 >
      currentTag = {}
      return State.DATA
    }
  } else if (/\s/.test(char)) {
    context.tokens.push(currentTag as Token)
    currentTag = {}
    return State.BEFORE_ATTRIBUTE_NAME
  }
  
  return State.TAG_NAME
}

/**
 * 状态：END_TAG_OPEN（遇到 </）
 */
function parseEndTagOpen(context: Context, char: string): State {
  advanceBy(context, 2) // 跳过 </
  return State.END_TAG_NAME
}

/**
 * 状态：END_TAG_NAME（读取闭合标签名）
 */
let currentEndTag: Partial<Token> = {}

function parseEndTagName(context: Context, char: string): State {
  if (!currentEndTag.name) {
    currentEndTag = { type: TokenType.TAG_CLOSE, name: '' }
  }
  
  if (/[a-zA-Z0-9\-]/.test(char)) {
    currentEndTag.name += char
    return State.END_TAG_NAME
  } else if (char === '>') {
    context.tokens.push(currentEndTag as Token)
    currentEndTag = {}
    return State.DATA
  }
  
  return State.END_TAG_NAME
}

/**
 * 状态：BEFORE_ATTRIBUTE_NAME（属性名之前）
 */
function parseBeforeAttributeName(context: Context, char: string): State {
  if (/\s/.test(char)) {
    return State.BEFORE_ATTRIBUTE_NAME
  } else if (char === '>') {
    context.tokens.push({ type: TokenType.TAG_END })
    return State.DATA
  } else if (char === '/') {
    if (peek(context, 1) === '>') {
      context.tokens.push({ type: TokenType.TAG_SELF_CLOSE })
      advanceBy(context, 1)
      return State.DATA
    }
  } else {
    return State.ATTRIBUTE_NAME
  }
  
  return State.BEFORE_ATTRIBUTE_NAME
}

/**
 * 状态：ATTRIBUTE_NAME（读取属性名）
 */
let currentAttribute: Partial<Token> = {}

function parseAttributeName(context: Context, char: string): State {
  if (!currentAttribute.name) {
    currentAttribute = { type: TokenType.ATTRIBUTE, name: '', value: '' }
  }
  
  if (/[a-zA-Z0-9\-:@]/.test(char)) {
    currentAttribute.name += char
    return State.ATTRIBUTE_NAME
  } else if (char === '=') {
    return State.BEFORE_ATTRIBUTE_VALUE
  } else if (/\s/.test(char)) {
    // 无值属性
    context.tokens.push(currentAttribute as Token)
    currentAttribute = {}
    return State.BEFORE_ATTRIBUTE_NAME
  } else if (char === '>') {
    context.tokens.push(currentAttribute as Token)
    context.tokens.push({ type: TokenType.TAG_END })
    currentAttribute = {}
    return State.DATA
  }
  
  return State.ATTRIBUTE_NAME
}

/**
 * 状态：BEFORE_ATTRIBUTE_VALUE（属性值之前）
 */
function parseBeforeAttributeValue(context: Context, char: string): State {
  if (char === '"') {
    context.index++ // 跳过 "
    return State.ATTRIBUTE_VALUE_DOUBLE_QUOTED
  } else if (char === "'") {
    return State.ATTRIBUTE_VALUE_SINGLE_QUOTED
  } else if (!/\s/.test(char)) {
    return State.ATTRIBUTE_VALUE_UNQUOTED
  }
  
  return State.BEFORE_ATTRIBUTE_VALUE
}

/**
 * 状态：ATTRIBUTE_VALUE_DOUBLE_QUOTED（双引号属性值）
 */
function parseAttributeValueDoubleQuoted(context: Context, char: string): State {
  if (char === '"') {
    context.tokens.push(currentAttribute as Token)
    currentAttribute = {}
    return State.BEFORE_ATTRIBUTE_NAME
  } else {
    currentAttribute.value += char
    return State.ATTRIBUTE_VALUE_DOUBLE_QUOTED
  }
}

/**
 * 状态：INTERPOLATION_OPEN（{{ 插值开始）
 */
let currentInterpolation: Partial<Token> = {}

function parseInterpolationOpen(context: Context, char: string): State {
  advanceBy(context, 2) // 跳过 {{
  currentInterpolation = { type: TokenType.INTERPOLATION, content: '' }
  return State.INTERPOLATION
}

/**
 * 状态：INTERPOLATION（插值内容）
 */
function parseInterpolation(context: Context, char: string): State {
  if (peek(context, 2) === '}}') {
    context.tokens.push(currentInterpolation as Token)
    advanceBy(context, 2) // 跳过 }}
    currentInterpolation = {}
    return State.DATA
  } else {
    currentInterpolation.content += char
    return State.INTERPOLATION
  }
}

/**
 * 状态：COMMENT_START（注释开始）
 */
function parseCommentStart(context: Context, char: string): State {
  advanceBy(context, 4) // 跳过 <!--
  return State.COMMENT
}

/**
 * 状态：COMMENT（注释内容）
 */
let currentComment: Partial<Token> = { type: TokenType.COMMENT, content: '' }

function parseComment(context: Context, char: string): State {
  if (peek(context, 3) === '-->') {
    context.tokens.push(currentComment as Token)
    advanceBy(context, 3) // 跳过 -->
    currentComment = { type: TokenType.COMMENT, content: '' }
    return State.DATA
  } else {
    currentComment.content += char
    return State.COMMENT
  }
}
```

---

### 步骤4：编写测试用例（30分钟）

```typescript
// test/compiler-core/tokenizer.spec.ts

import { describe, it, expect } from 'vitest'
import { tokenize, TokenType } from '../../src/compiler-core/tokenizer'

describe('Tokenizer', () => {
  it('应该解析简单元素', () => {
    const tokens = tokenize('<div></div>')
    
    expect(tokens).toEqual([
      { type: TokenType.TAG_START, name: 'div' },
      { type: TokenType.TAG_END },
      { type: TokenType.TAG_CLOSE, name: 'div' },
      { type: TokenType.EOF }
    ])
  })
  
  it('应该解析带属性的元素', () => {
    const tokens = tokenize('<div class="container"></div>')
    
    expect(tokens).toEqual([
      { type: TokenType.TAG_START, name: 'div' },
      { type: TokenType.ATTRIBUTE, name: 'class', value: 'container' },
      { type: TokenType.TAG_END },
      { type: TokenType.TAG_CLOSE, name: 'div' },
      { type: TokenType.EOF }
    ])
  })
  
  it('应该解析文本内容', () => {
    const tokens = tokenize('<div>Hello World</div>')
    
    expect(tokens).toMatchObject([
      { type: TokenType.TAG_START, name: 'div' },
      { type: TokenType.TAG_END },
      { type: TokenType.TEXT, content: 'Hello World' },
      { type: TokenType.TAG_CLOSE, name: 'div' },
      { type: TokenType.EOF }
    ])
  })
  
  it('应该解析插值', () => {
    const tokens = tokenize('<div>{{ message }}</div>')
    
    expect(tokens).toMatchObject([
      { type: TokenType.TAG_START, name: 'div' },
      { type: TokenType.TAG_END },
      { type: TokenType.INTERPOLATION, content: ' message ' },
      { type: TokenType.TAG_CLOSE, name: 'div' },
      { type: TokenType.EOF }
    ])
  })
  
  it('应该解析自闭合标签', () => {
    const tokens = tokenize('<img src="logo.png" />')
    
    expect(tokens).toMatchObject([
      { type: TokenType.TAG_START, name: 'img' },
      { type: TokenType.ATTRIBUTE, name: 'src', value: 'logo.png' },
      { type: TokenType.TAG_SELF_CLOSE },
      { type: TokenType.EOF }
    ])
  })
  
  it('应该解析注释', () => {
    const tokens = tokenize('<!-- this is a comment -->')
    
    expect(tokens).toMatchObject([
      { type: TokenType.COMMENT, content: ' this is a comment ' },
      { type: TokenType.EOF }
    ])
  })
  
  it('应该解析复杂模板', () => {
    const template = `
      <div class="app">
        <h1>{{ title }}</h1>
        <button @click="handleClick">Click</button>
        <!-- comment -->
        <img src="logo.png" />
      </div>
    `
    
    const tokens = tokenize(template)
    expect(tokens.length).toBeGreaterThan(10)
  })
})
```

---

## 🤔 思考题

### 问题1: 为什么使用有限状态机而不是正则表达式？

**提示**: 
- 复杂度
- 性能
- 可维护性

### 问题2: 如何处理属性值中的特殊字符？

```html
<div title="<hello>"></div>
```

### 问题3: 如何优化 Tokenizer 的性能？

**提示**: 
- 字符串操作
- 状态转换
- 内存分配

---

## 📝 学习总结

完成今天的学习后，请回答：

1. **词法分析的作用是什么？**

2. **有限状态机的核心思想？**

3. **Token 的主要类型有哪些？**

---

## 📖 扩展阅读

- [编译原理 - 词法分析](https://en.wikipedia.org/wiki/Lexical_analysis)
- [Vue 3 源码：tokenizer.ts](https://github.com/vuejs/core/blob/main/packages/compiler-core/src/tokenizer.ts)

---

## ⏭️ 明日预告

### Day 86: 模板编译器 - 语法分析

明天我们将学习：
- 解析 Token 流生成 AST
- AST 的数据结构设计
- 递归下降解析

**核心任务**: 将 Token 转换为抽象语法树

---

**词法分析是编译器的第一步，理解状态机是关键！** 🚀
