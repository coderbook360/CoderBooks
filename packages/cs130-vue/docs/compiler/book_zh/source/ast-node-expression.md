# ExpressionNode 表达式节点

表达式节点表示模板中的 JavaScript 表达式。它们出现在插值、指令值、属性绑定等位置。

## 节点类型

Vue 编译器有两种表达式节点：

```typescript
export type ExpressionNode = SimpleExpressionNode | CompoundExpressionNode
```

## SimpleExpressionNode

简单表达式是最基础的表达式形式：

```typescript
export interface SimpleExpressionNode extends Node {
  type: NodeTypes.SIMPLE_EXPRESSION
  content: string
  isStatic: boolean
  constType: ConstantTypes
  identifiers?: string[]
  hoisted?: JSChildNode
  loc: SourceLocation
}
```

### content 字段

表达式的字符串内容：

```typescript
{{ msg }}       → content: 'msg'
:id="userId"    → content: 'userId'
@click="fn()"   → content: 'fn()'
```

### isStatic 字段

标记表达式是否是静态的：

```typescript
// 静态表达式
:id="'static-id'"   → isStatic: true, content: "'static-id'"
@click="handler"    → arg.isStatic: true (click 是静态参数)

// 动态表达式  
:id="dynamicId"     → isStatic: false
:[key]="value"      → arg.isStatic: false (key 是动态参数)
```

### constType 字段

表达式的常量类型，用于优化：

```typescript
export const enum ConstantTypes {
  NOT_CONSTANT = 0,    // 非常量，每次渲染都要重新计算
  CAN_SKIP_PATCH = 1,  // 可以跳过 patch
  CAN_HOIST = 2,       // 可以静态提升
  CAN_STRINGIFY = 3    // 可以字符串化（纯静态）
}
```

```typescript
// NOT_CONSTANT - 响应式数据
{{ count }}

// CAN_SKIP_PATCH - props 常量
:id="propId"  // propId 来自 props

// CAN_HOIST - 可提升
:class="'static-class'"

// CAN_STRINGIFY - 纯静态
<div class="foo">Static</div>
```

### identifiers 字段

表达式中引用的标识符：

```typescript
{{ a + b }}     → identifiers: ['a', 'b']
{{ fn(x, y) }}  → identifiers: ['fn', 'x', 'y']
```

用于确定表达式的依赖关系。

## CompoundExpressionNode

复合表达式由多个子部分组成：

```typescript
export interface CompoundExpressionNode extends Node {
  type: NodeTypes.COMPOUND_EXPRESSION
  children: (
    | SimpleExpressionNode
    | CompoundExpressionNode
    | InterpolationNode
    | TextNode
    | string
    | symbol
  )[]
  identifiers?: string[]
  isHandlerKey?: boolean
}
```

### 使用场景

复合表达式在转换阶段创建，用于表示需要拼接的表达式：

```typescript
// 文本拼接
"Hello, " + toDisplayString(name) + "!"

// 对应的复合表达式
{
  type: NodeTypes.COMPOUND_EXPRESSION,
  children: [
    '"Hello, "',
    ' + ',
    toDisplayString,
    '(',
    { content: 'name', ... },
    ')',
    ' + "!"'
  ]
}
```

### 与 SimpleExpression 的区别

```typescript
// SimpleExpressionNode - 单一表达式
{{ msg }}
→ { type: SIMPLE_EXPRESSION, content: 'msg' }

// CompoundExpressionNode - 组合表达式
Hello {{ name }}!
→ {
  type: COMPOUND_EXPRESSION,
  children: [
    { type: TEXT, content: 'Hello ' },
    { type: INTERPOLATION, content: { content: 'name' } },
    { type: TEXT, content: '!' }
  ]
}
```

## 表达式在不同位置

### 插值

```typescript
{{ expression }}

→ {
  type: NodeTypes.INTERPOLATION,
  content: {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content: 'expression',
    isStatic: false
  }
}
```

### v-bind 值

```typescript
:id="expression"

→ {
  type: NodeTypes.DIRECTIVE,
  name: 'bind',
  arg: { content: 'id', isStatic: true },
  exp: { content: 'expression', isStatic: false }
}
```

### v-on 值

```typescript
@click="handler"

→ {
  exp: { content: 'handler', isStatic: false }
}

@click="() => doSomething()"

→ {
  exp: { content: '() => doSomething()', isStatic: false }
}
```

### 动态参数

```typescript
:[dynamicAttr]="value"

→ {
  arg: { content: 'dynamicAttr', isStatic: false },
  exp: { content: 'value', isStatic: false }
}
```

## 表达式验证

解析阶段不验证表达式语法，只是提取字符串。验证在转换阶段：

```typescript
{{ foo[ }}  // 解析阶段通过
            // 转换阶段报错：Invalid expression
```

转换阶段使用 Babel 解析表达式检查语法：

```typescript
function validateBrowserExpression(node, context) {
  try {
    new Function(`return ${node.content}`)
  } catch (e) {
    context.onError(
      createCompilerError(ErrorCodes.X_INVALID_EXPRESSION, node.loc)
    )
  }
}
```

## 表达式重写

转换阶段会重写表达式，添加响应式访问：

```typescript
// 原始表达式
{{ msg }}

// 重写后（setup + 内联模式）
_ctx.msg

// 重写后（setup + ref unwrap）
msg.value
```

## 静态分析

编译器分析表达式的常量性：

```typescript
function isStaticExp(node: ExpressionNode): boolean {
  return node.type === NodeTypes.SIMPLE_EXPRESSION && node.isStatic
}

function getConstantType(node, context): ConstantTypes {
  // 分析表达式中的标识符
  // 确定是否引用响应式数据
  // 返回最保守的常量类型
}
```

这用于静态提升优化。

## 小结

表达式节点分为简单表达式和复合表达式。简单表达式是单一的 JavaScript 表达式字符串，复合表达式由多个部分组成。isStatic 标记静态性，constType 标记常量类型用于优化。表达式在解析阶段只提取内容，在转换阶段验证语法并可能被重写。这种分离使解析保持简单，复杂逻辑放在转换阶段。
