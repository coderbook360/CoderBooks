# 插值表达式与指令的解析

`{{ msg }}` 和 `v-bind:class` 是 Vue 模板中最常见的动态内容。**它们的解析逻辑是什么？在 AST 中如何表示？**

**理解这一章，你就能明白模板中的动态内容是如何与 JavaScript 表达式关联的。** 本章将深入分析插值表达式和指令的解析细节。

## 插值表达式

### 基本格式

```html
{{ expression }}
```

默认分隔符是 `{{` 和 `}}`，可以通过配置修改：

```javascript
app.config.compilerOptions.delimiters = ['${', '}']
```

### 解析实现

```javascript
function parseInterpolation(context) {
  const [open, close] = context.options.delimiters
  
  const start = getCursor(context)
  
  // 找到结束分隔符
  const closeIndex = context.source.indexOf(close, open.length)
  
  if (closeIndex === -1) {
    emitError(context, ErrorCodes.X_MISSING_INTERPOLATION_END)
    return undefined
  }
  
  // 跳过开始分隔符
  advanceBy(context, open.length)
  
  // 获取内容
  const innerStart = getCursor(context)
  const rawContentLength = closeIndex - open.length
  const rawContent = context.source.slice(0, rawContentLength)
  
  // 解析并处理 HTML 实体
  const preTrimContent = parseTextData(context, rawContentLength)
  const content = preTrimContent.trim()
  
  // 跳过结束分隔符
  advanceBy(context, close.length)
  
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      isStatic: false,
      constType: ConstantTypes.NOT_CONSTANT,
      content,
      loc: getSelection(context, innerStart)
    },
    loc: getSelection(context, start)
  }
}
```

### AST 结构

```html
{{ user.name }}
```

```javascript
{
  type: NodeTypes.INTERPOLATION,
  content: {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content: 'user.name',
    isStatic: false,
    constType: ConstantTypes.NOT_CONSTANT
  }
}
```

## 指令解析

### 指令语法

```
v-name:arg.modifier1.modifier2="expression"
```

各部分含义：
- `v-name`：指令名
- `:arg`：参数（可选）
- `.modifier`：修饰符（可选，可多个）
- `="expression"`：表达式（可选）

### 简写语法

```html
<!-- v-bind 简写 -->
:class="cls"

<!-- v-on 简写 -->
@click="handleClick"

<!-- v-slot 简写 -->
#default="{ item }"
```

### 解析实现

```javascript
function parseAttribute(context, nameSet) {
  const start = getCursor(context)
  
  // 匹配属性名
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)
  const name = match[0]
  
  advanceBy(context, name.length)
  
  // 解析值
  let value = undefined
  if (context.source[0] === '=') {
    advanceBy(context, 1)
    advanceSpaces(context)
    value = parseAttributeValue(context)
  }
  
  // 检查是否是指令
  if (/^(v-[a-z]|:|@|#)/.test(name)) {
    // 指令
    const match = /^(v-([a-z-]+))?(?::([^\s.]+))?(.*)$/i.exec(name)
    
    let dirName = match[2] || (name[0] === ':' ? 'bind' : name[0] === '@' ? 'on' : 'slot')
    let arg = match[3]
    let modifiers = match[4] ? match[4].slice(1).split('.') : []
    
    // 处理动态参数 [arg]
    let isDynamicArg = false
    if (arg && arg.startsWith('[') && arg.endsWith(']')) {
      isDynamicArg = true
      arg = arg.slice(1, -1)
    }
    
    return {
      type: NodeTypes.DIRECTIVE,
      name: dirName,
      exp: value && {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: value.content,
        isStatic: false,
        constType: ConstantTypes.NOT_CONSTANT,
        loc: value.loc
      },
      arg: arg && {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: arg,
        isStatic: !isDynamicArg,
        constType: isDynamicArg ? ConstantTypes.NOT_CONSTANT : ConstantTypes.CAN_STRINGIFY
      },
      modifiers,
      loc: getSelection(context, start)
    }
  }
  
  // 普通属性
  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: value && {
      type: NodeTypes.TEXT,
      content: value.content
    },
    loc: getSelection(context, start)
  }
}
```

### 指令示例

**v-if**

```html
<div v-if="isVisible">
```

```javascript
{
  type: NodeTypes.DIRECTIVE,
  name: 'if',
  exp: { content: 'isVisible' },
  arg: undefined,
  modifiers: []
}
```

**v-bind 简写**

```html
<div :class="activeClass">
```

```javascript
{
  type: NodeTypes.DIRECTIVE,
  name: 'bind',
  exp: { content: 'activeClass' },
  arg: { content: 'class', isStatic: true },
  modifiers: []
}
```

**v-on 带修饰符**

```html
<button @click.stop.prevent="handleClick">
```

```javascript
{
  type: NodeTypes.DIRECTIVE,
  name: 'on',
  exp: { content: 'handleClick' },
  arg: { content: 'click', isStatic: true },
  modifiers: ['stop', 'prevent']
}
```

**动态参数**

```html
<div :[dynamicAttr]="value">
```

```javascript
{
  type: NodeTypes.DIRECTIVE,
  name: 'bind',
  exp: { content: 'value' },
  arg: { 
    content: 'dynamicAttr', 
    isStatic: false  // 动态参数
  },
  modifiers: []
}
```

## 属性值解析

```javascript
function parseAttributeValue(context) {
  const start = getCursor(context)
  let content
  
  const quote = context.source[0]
  const isQuoted = quote === '"' || quote === "'"
  
  if (isQuoted) {
    // 带引号的值
    advanceBy(context, 1)
    const endIndex = context.source.indexOf(quote)
    
    if (endIndex === -1) {
      content = parseTextData(context, context.source.length)
    } else {
      content = parseTextData(context, endIndex)
      advanceBy(context, 1)  // 跳过结束引号
    }
  } else {
    // 不带引号的值
    const match = /^[^\t\r\n\f >]+/.exec(context.source)
    content = parseTextData(context, match[0].length)
  }
  
  return {
    content,
    isQuoted,
    loc: getSelection(context, start)
  }
}
```

## v-for 特殊处理

v-for 的表达式有特殊格式：

```html
<div v-for="(item, index) in items">
```

需要解析出：
- `valueAlias`：item
- `keyAlias`：index
- `source`：items

```javascript
function parseForExpression(content) {
  // 匹配 "alias in/of source" 格式
  const match = content.match(/^([\s\S]*?)\s+(in|of)\s+([\s\S]*)$/)
  
  if (!match) return undefined
  
  const [, alias, , source] = match
  
  // 解析别名 (item, index)
  const aliasMatch = alias.match(/^\(?\s*([^,\s]+)?(?:\s*,\s*([^,\s]+))?(?:\s*,\s*([^,\s]+))?\s*\)?$/)
  
  return {
    source: createExpression(source.trim()),
    value: aliasMatch[1] && createExpression(aliasMatch[1].trim()),
    key: aliasMatch[2] && createExpression(aliasMatch[2].trim()),
    index: aliasMatch[3] && createExpression(aliasMatch[3].trim())
  }
}
```

## v-slot 特殊处理

v-slot 可以有解构参数：

```html
<template #default="{ item, index }">
```

解析后：

```javascript
{
  type: NodeTypes.DIRECTIVE,
  name: 'slot',
  exp: { content: '{ item, index }' },
  arg: { content: 'default' }
}
```

## 错误处理

```javascript
// 缺少表达式
<div v-if>  // 错误：X_V_IF_NO_EXPRESSION

// 动态参数未闭合
<div :[attr="value">  // 错误：X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END

// 无效指令名
<div v->  // 错误：X_MISSING_DIRECTIVE_NAME
```

## 本章小结

本章分析了插值和指令的解析：

**插值表达式**：
- 匹配分隔符 `{{` 和 `}}`
- 提取并 trim 内容
- 生成 INTERPOLATION 节点

**指令解析**：
- 识别 `v-`、`:`、`@`、`#` 前缀
- 提取 name、arg、modifiers、exp
- 处理动态参数 `[arg]`
- 特殊处理 v-for、v-slot

解析阶段将模板的动态内容转换为结构化的 AST 节点，为后续的转换和代码生成做好准备。

下一章，我们将分析编译器的错误处理机制。
