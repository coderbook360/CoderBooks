---
vPre: true
---

# 语法分析

词法分析产生了扁平的 Token 序列，但模板是有层次结构的——元素可以嵌套。**如何将 Token 序列转换为树形结构？**

这就是语法分析的工作。**本章将分析 Vue 3 的递归下降解析器。** 递归下降是构建解析器最直观、最易理解的方法。

## 输入与输出

```javascript
// 输入：模板字符串
const template = `
<div class="container">
  <p v-if="show">{{ message }}</p>
  <button @click="handleClick">Click</button>
</div>
`

// 输出：AST（抽象语法树）
{
  type: NodeTypes.ROOT,
  children: [{
    type: NodeTypes.ELEMENT,
    tag: 'div',
    props: [{
      type: NodeTypes.ATTRIBUTE,
      name: 'class',
      value: { content: 'container' }
    }],
    children: [
      {
        type: NodeTypes.ELEMENT,
        tag: 'p',
        props: [{
          type: NodeTypes.DIRECTIVE,
          name: 'if',
          exp: { content: 'show' }
        }],
        children: [{
          type: NodeTypes.INTERPOLATION,
          content: { content: 'message' }
        }]
      },
      {
        type: NodeTypes.ELEMENT,
        tag: 'button',
        props: [{
          type: NodeTypes.DIRECTIVE,
          name: 'on',
          arg: { content: 'click' },
          exp: { content: 'handleClick' }
        }],
        children: [{
          type: NodeTypes.TEXT,
          content: 'Click'
        }]
      }
    ]
  }]
}
```

## 递归下降算法

Vue 3 使用**递归下降**（Recursive Descent）解析算法。核心思想：从根节点开始，递归处理子节点。

```javascript
function parse(template) {
  const context = createParserContext(template)
  return createRoot(parseChildren(context, []))
}

function createRoot(children) {
  return {
    type: NodeTypes.ROOT,
    children,
    helpers: [],
    components: [],
    directives: [],
    hoists: [],
    imports: [],
    cached: 0,
    codegenNode: undefined
  }
}
```

## parseChildren：核心循环

```javascript
function parseChildren(context, ancestors) {
  const nodes = []
  
  while (!isEnd(context, ancestors)) {
    const s = context.source
    let node = undefined
    
    if (s.startsWith('\u007b\u007b')) {
      // 插值表达式
      node = parseInterpolation(context)
    } else if (s[0] === '<') {
      if (s[1] === '!') {
        if (s.startsWith('<!--')) {
          // 注释
          node = parseComment(context)
        } else if (s.startsWith('<!DOCTYPE')) {
          // DOCTYPE，忽略
          parseBogusComment(context)
        }
      } else if (s[1] === '/') {
        // 结束标签
        if (/[a-z]/i.test(s[2])) {
          parseTag(context, TagType.End)
          continue
        }
      } else if (/[a-z]/i.test(s[1])) {
        // 开始标签
        node = parseElement(context, ancestors)
      }
    }
    
    // 默认作为文本处理
    if (!node) {
      node = parseText(context)
    }
    
    if (node) {
      nodes.push(node)
    }
  }
  
  return nodes
}
```

判断逻辑：
1. <code v-pre>{{</code> → 插值表达式
2. `<!--` → 注释
3. `</` → 结束标签（不产生节点）
4. `<字母` → 元素
5. 其他 → 文本

## parseElement：解析元素

```javascript
function parseElement(context, ancestors) {
  // 1. 解析开始标签
  const element = parseTag(context, TagType.Start)
  
  // 自闭合标签，直接返回
  if (element.isSelfClosing || isVoidTag(element.tag)) {
    return element
  }
  
  // 2. 递归解析子节点
  ancestors.push(element)
  const children = parseChildren(context, ancestors)
  ancestors.pop()
  
  element.children = children
  
  // 3. 解析结束标签
  if (context.source.startsWith(`</${element.tag}`)) {
    parseTag(context, TagType.End)
  } else {
    emitError(context, ErrorCodes.X_MISSING_END_TAG)
  }
  
  return element
}
```

`ancestors` 栈的作用：
1. 追踪当前的父元素链
2. 判断结束标签是否匹配
3. 检测未闭合的标签

## parseTag：解析标签

```javascript
function parseTag(context, type) {
  const start = getCursor(context)
  
  // 匹配标签名
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
  
  // 判断元素类型
  let tagType = ElementTypes.ELEMENT
  if (tag === 'slot') {
    tagType = ElementTypes.SLOT
  } else if (tag === 'template') {
    tagType = ElementTypes.TEMPLATE
  } else if (isComponent(tag, context)) {
    tagType = ElementTypes.COMPONENT
  }
  
  return {
    type: NodeTypes.ELEMENT,
    tag,
    tagType,
    props,
    isSelfClosing,
    children: [],
    loc: getSelection(context, start)
  }
}
```

## parseAttributes：解析属性

```javascript
function parseAttributes(context) {
  const props = []
  const attributeNames = new Set()
  
  while (
    context.source.length > 0 &&
    !context.source.startsWith('>') &&
    !context.source.startsWith('/>')
  ) {
    const attr = parseAttribute(context, attributeNames)
    if (attr) {
      props.push(attr)
    }
    advanceSpaces(context)
  }
  
  return props
}

function parseAttribute(context, nameSet) {
  const start = getCursor(context)
  
  // 匹配属性名
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)
  const name = match[0]
  
  // 检查重复
  if (nameSet.has(name)) {
    emitError(context, ErrorCodes.DUPLICATE_ATTRIBUTE)
  }
  nameSet.add(name)
  
  advanceBy(context, name.length)
  
  // 解析值
  let value = undefined
  if (context.source[0] === '=') {
    advanceBy(context, 1)
    advanceSpaces(context)
    value = parseAttributeValue(context)
  }
  
  // 检查是否是指令
  if (/^(v-|:|@|#)/.test(name)) {
    return parseDirective(name, value, start, context)
  }
  
  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: value && {
      type: NodeTypes.TEXT,
      content: value.content,
      loc: value.loc
    },
    loc: getSelection(context, start)
  }
}
```

## isEnd：判断结束条件

```javascript
function isEnd(context, ancestors) {
  const s = context.source
  
  // 模板解析完毕
  if (!s) {
    return true
  }
  
  // 遇到父元素的结束标签
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (startsWithEndTagOpen(s, ancestors[i].tag)) {
      return true
    }
  }
  
  return false
}

function startsWithEndTagOpen(source, tag) {
  return (
    source.startsWith('</') &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase() &&
    /[\t\r\n\f />]/.test(source[2 + tag.length] || '>')
  )
}
```

## 错误恢复

遇到错误时，解析器会尝试恢复继续：

```javascript
function parseChildren(context, ancestors) {
  const nodes = []
  
  while (!isEnd(context, ancestors)) {
    try {
      // 正常解析...
    } catch (e) {
      // 错误恢复：跳过当前字符
      emitError(context, e.code)
      advanceBy(context, 1)
    }
  }
  
  return nodes
}
```

## 位置信息

每个节点都携带位置信息，用于错误提示：

```javascript
{
  type: NodeTypes.ELEMENT,
  tag: 'div',
  loc: {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 3, column: 7, offset: 42 },
    source: '<div>...</div>'
  }
}
```

## 本章小结

本章分析了语法分析的实现：

- **递归下降**：从根开始，递归处理子节点
- **parseChildren**：核心循环，根据首字符判断类型
- **parseElement**：解析元素，包括开始标签、子节点、结束标签
- **ancestors 栈**：追踪父元素链，判断结束条件
- **错误恢复**：遇到错误跳过继续解析
- **位置信息**：记录每个节点的源码位置

语法分析将扁平的字符流转换为层次化的 AST，为后续的转换和代码生成奠定基础。

下一章，我们将详细分析 AST 节点的类型设计。
