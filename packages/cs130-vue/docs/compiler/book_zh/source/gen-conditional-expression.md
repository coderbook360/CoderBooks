# genConditionalExpression 条件表达式生成

条件表达式生成处理 v-if/v-else-if/v-else 产生的三元表达式嵌套。

## 条件表达式节点

```typescript
interface ConditionalExpression extends Node {
  type: NodeTypes.JS_CONDITIONAL_EXPRESSION
  test: JSChildNode
  consequent: JSChildNode
  alternate: JSChildNode
  newline: boolean
}
```

## 生成函数

```typescript
function genConditionalExpression(
  node: ConditionalExpression,
  context: CodegenContext
) {
  const { test, consequent, alternate, newline: needNewline } = node
  const { push, indent, deindent, newline } = context

  // 1. 生成条件测试
  if (test.type === NodeTypes.SIMPLE_EXPRESSION) {
    const needsParens = !isSimpleIdentifier(test.content)
    needsParens && push(`(`)
    genExpression(test, context)
    needsParens && push(`)`)
  } else {
    push(`(`)
    genNode(test, context)
    push(`)`)
  }

  // 2. 换行缩进
  needNewline && indent()
  context.indentLevel++
  needNewline || push(` `)
  push(`? `)

  // 3. 生成真值分支
  genNode(consequent, context)
  context.indentLevel--

  // 4. 生成假值分支
  needNewline && newline()
  needNewline || push(` `)
  push(`: `)

  // 5. 处理嵌套条件
  const isNested = alternate.type === NodeTypes.JS_CONDITIONAL_EXPRESSION
  if (!isNested) {
    context.indentLevel++
  }
  genNode(alternate, context)
  if (!isNested) {
    context.indentLevel--
  }

  needNewline && deindent(true)
}
```

## 简单条件

```html
<div v-if="show">Visible</div>
```

```typescript
show
  ? (_openBlock(), _createElementBlock("div", { key: 0 }, "Visible"))
  : _createCommentVNode("v-if", true)
```

## 多分支条件

```html
<div v-if="type === 'a'">A</div>
<div v-else-if="type === 'b'">B</div>
<div v-else>Default</div>
```

```typescript
type === 'a'
  ? (_openBlock(), _createElementBlock("div", { key: 0 }, "A"))
  : type === 'b'
    ? (_openBlock(), _createElementBlock("div", { key: 1 }, "B"))
    : (_openBlock(), _createElementBlock("div", { key: 2 }, "Default"))
```

## 括号处理

```typescript
function isSimpleIdentifier(name: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)
}

// 简单标识符不需要括号
show ? ... : ...

// 复杂表达式需要括号
(items.length > 0) ? ... : ...
```

## 注释 VNode

没有 v-else 时，假值分支生成注释：

```typescript
_createCommentVNode("v-if", true)
```

第二个参数 true 表示这是 v-if 产生的注释。

## Key 的处理

每个分支都有唯一的 key：

```typescript
// 分支 0
{ key: 0 }
// 分支 1
{ key: 1 }
// 分支 2
{ key: 2 }
```

确保条件切换时 DOM 正确更新。

## 嵌套优化

嵌套条件不增加缩进级别：

```typescript
// 正确的缩进
a
  ? branchA
  : b
    ? branchB
    : c
      ? branchC
      : branchDefault

// 而不是
a
  ? branchA
  : b
      ? branchB
      : c
          ? branchC
          : branchDefault
```

## 条件与 Fragment

多根条件使用 Fragment：

```html
<template v-if="show">
  <div>A</div>
  <div>B</div>
</template>
```

```typescript
show
  ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
      _createElementVNode("div", null, "A"),
      _createElementVNode("div", null, "B")
    ]))
  : _createCommentVNode("v-if", true)
```

## 小结

条件表达式生成的关键点：

1. **三元嵌套**：else-if 链式生成
2. **括号智能**：复杂条件加括号
3. **缩进优化**：嵌套条件扁平化
4. **Key 自动**：每个分支唯一 key

下一章将分析 for 循环的代码生成。
