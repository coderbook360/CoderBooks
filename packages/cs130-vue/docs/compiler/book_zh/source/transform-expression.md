# transformExpression 表达式转换

`transformExpression` 负责处理模板中的表达式，添加必要的前缀和作用域处理。

## 函数结构

```typescript
export const transformExpression: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.INTERPOLATION) {
    node.content = processExpression(
      node.content as SimpleExpressionNode,
      context
    )
  } else if (node.type === NodeTypes.ELEMENT) {
    for (let i = 0; i < node.props.length; i++) {
      const dir = node.props[i]
      if (dir.type === NodeTypes.DIRECTIVE && dir.name !== 'for') {
        const exp = dir.exp
        const arg = dir.arg
        if (
          exp &&
          exp.type === NodeTypes.SIMPLE_EXPRESSION &&
          !(dir.name === 'on' && arg)
        ) {
          dir.exp = processExpression(exp, context, dir.name === 'slot')
        }
        if (arg && arg.type === NodeTypes.SIMPLE_EXPRESSION && !arg.isStatic) {
          dir.arg = processExpression(arg, context)
        }
      }
    }
  }
}
```

## 处理的场景

1. **插值表达式**：`{{ msg }}`
2. **指令表达式**：`:id="dynamicId"`
3. **动态参数**：`:[dynamicAttr]="value"`
4. **事件表达式**：`@click="handleClick"`（有特殊处理）

## processExpression 核心逻辑

```typescript
export function processExpression(
  node: SimpleExpressionNode,
  context: TransformContext,
  asParams = false,
  asRawStatements = false,
  localVars: Record<string, number> = Object.create(context.identifiers)
): ExpressionNode {
  if (!context.prefixIdentifiers || !node.content.trim()) {
    return node
  }

  const rawExp = node.content
  
  // 简单标识符快速路径
  if (isSimpleIdentifier(rawExp)) {
    const isScopeVarReference = context.identifiers[rawExp]
    const isAllowedGlobal = isGloballyWhitelisted(rawExp)
    const isLiteral = isLiteralWhitelisted(rawExp)
    
    if (!asParams && !isScopeVarReference && !isAllowedGlobal && !isLiteral) {
      // 需要添加前缀
      if (isSetupReference(rawExp, context)) {
        node.content = `$setup.${rawExp}`
      } else {
        node.content = `_ctx.${rawExp}`
      }
    }
    return node
  }

  // 复杂表达式需要 AST 分析
  let ast = parse(rawExp)
  // ...
}
```

## 前缀模式

在 `prefixIdentifiers` 模式下，表达式中的标识符需要添加来源前缀：

```typescript
// 原始模板
{{ msg }}

// 非前缀模式（with 语法）
with (_ctx) { return msg }

// 前缀模式
_ctx.msg
// 或
$setup.msg
```

前缀模式是模块模式和 `<script setup>` 的默认行为。

## 标识符分类

```typescript
// 作用域变量（v-for 的 item, v-slot 的参数等）
context.identifiers[rawExp]  // 已在作用域中

// 全局白名单
isGloballyWhitelisted(rawExp)
// true, false, null, undefined, Math, Date, Array, Object...

// 字面量
isLiteralWhitelisted(rawExp)
// NaN, Infinity, undefined
```

这些不需要添加前缀。

## setup 绑定

```typescript
function isSetupReference(name: string, context: TransformContext): boolean {
  const bindings = context.bindingMetadata
  if (!bindings) return false
  
  const type = bindings[name]
  return (
    type === BindingTypes.SETUP_CONST ||
    type === BindingTypes.SETUP_LET ||
    type === BindingTypes.SETUP_REACTIVE_CONST ||
    type === BindingTypes.SETUP_REF ||
    type === BindingTypes.SETUP_MAYBE_REF
  )
}
```

来自 `<script setup>` 的绑定使用 `$setup` 前缀。

## 复杂表达式分析

对于复杂表达式，使用 Babel 解析：

```typescript
let ast
try {
  ast = parse(`(${rawExp})`)
} catch (e) {
  context.onError(createCompilerError(ErrorCodes.X_INVALID_EXPRESSION, node.loc))
  return node
}
```

然后遍历 AST 找出所有标识符：

```typescript
walkIdentifiers(ast, (node, parent, parentStack, isReference) => {
  if (isReference && !scope.includes(node.name)) {
    // 需要添加前缀
    const { name } = node
    if (isSetupReference(name, context)) {
      prefix = '$setup.'
    } else {
      prefix = '_ctx.'
    }
    // 记录替换位置
  }
})
```

## 生成复合表达式

复杂表达式可能生成复合表达式：

```typescript
// 原始
a + b.c

// 分析后
{
  type: NodeTypes.COMPOUND_EXPRESSION,
  children: [
    { content: '_ctx.a', ... },
    ' + ',
    { content: '_ctx.b', ... },
    '.c'
  ]
}
```

## 函数参数处理

```typescript
// v-slot:default="{ item }"
// asParams = true

// 不要给参数添加前缀
// item 是模板作用域变量
```

`asParams` 标记告诉处理器这是参数声明，不要给这些标识符添加前缀。

## 事件表达式特殊处理

```typescript
// @click="handler" - 不在这里处理
// 由 transformOn 处理

if (dir.name === 'on' && arg) {
  // 跳过，交给 transformOn
}
```

事件处理器有特殊的处理逻辑（如自动包装箭头函数）。

## ref 自动解包

```typescript
// <script setup>
const count = ref(0)

// 模板
{{ count }}  // 自动解包

// 编译后
$setup.count  // 而非 $setup.count.value
// 运行时自动解包
```

编译器不生成 `.value`，运行时通过 proxy 自动解包。

## 验证表达式

```typescript
try {
  ast = parse(`(${rawExp})`)
} catch (e) {
  context.onError(
    createCompilerError(
      ErrorCodes.X_INVALID_EXPRESSION,
      node.loc,
      undefined,
      e.message
    )
  )
  return node
}
```

无效的 JavaScript 表达式会报错。

## 保守模式

在浏览器环境或不支持 Babel 的环境中：

```typescript
if (!context.prefixIdentifiers) {
  // 不处理表达式
  // 运行时使用 with 语法
  return node
}
```

## 示例转换

```html
<div :class="active ? 'on' : 'off'" @click="count++">
  {{ items.filter(x => x.done).length }}
</div>
```

转换后：

```typescript
// :class
"_ctx.active ? 'on' : 'off'"

// @click - 由 transformOn 处理
// "() => _ctx.count++"

// 插值
"_ctx.items.filter(x => x.done).length"
// 注意 x 是参数，不加前缀
```

## 小结

transformExpression 处理模板中的表达式，添加访问前缀。简单标识符快速处理，复杂表达式使用 Babel 分析。作用域变量、全局白名单、字面量不加前缀。来自 setup 的绑定使用 `$setup` 前缀，其他使用 `_ctx`。事件表达式由 transformOn 单独处理。这确保表达式在运行时能正确访问响应式数据。
