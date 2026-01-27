# transformBind 绑定转换

`transformBind` 处理 v-bind 指令，将属性绑定转换为 props 对象。

## 函数结构

```typescript
export const transformBind: DirectiveTransform = (dir, _node, context) => {
  const { exp, modifiers, loc } = dir
  const arg = dir.arg!

  if (arg.type !== NodeTypes.SIMPLE_EXPRESSION) {
    arg.children.unshift(`(`)
    arg.children.push(`) || ""`)
  } else if (!arg.isStatic) {
    arg.content = `${arg.content} || ""`
  }

  // 处理修饰符
  if (modifiers.includes('camel')) {
    if (arg.type === NodeTypes.SIMPLE_EXPRESSION) {
      if (arg.isStatic) {
        arg.content = camelize(arg.content)
      } else {
        arg.content = `${context.helperString(CAMELIZE)}(${arg.content})`
      }
    } else {
      arg.children.unshift(`${context.helperString(CAMELIZE)}(`)
      arg.children.push(`)`)
    }
  }

  if (!context.inSSR) {
    if (modifiers.includes('prop')) {
      injectPrefix(arg, '.')
    }
    if (modifiers.includes('attr')) {
      injectPrefix(arg, '^')
    }
  }

  if (
    !exp ||
    (exp.type === NodeTypes.SIMPLE_EXPRESSION && !exp.content.trim())
  ) {
    context.onError(createCompilerError(ErrorCodes.X_V_BIND_NO_EXPRESSION, loc))
    return {
      props: [createObjectProperty(arg, createSimpleExpression('', true, loc))]
    }
  }

  return {
    props: [createObjectProperty(arg, exp)]
  }
}
```

## DirectiveTransform 接口

```typescript
type DirectiveTransform = (
  dir: DirectiveNode,
  node: ElementNode,
  context: TransformContext,
  augmentor?: (ret: DirectiveTransformResult) => DirectiveTransformResult
) => DirectiveTransformResult

interface DirectiveTransformResult {
  props: Property[]
  needRuntime?: boolean | symbol
  ssrTagParts?: TemplateLiteral['elements']
}
```

## 基本绑定

```html
<div :id="userId"></div>
```

转换结果：

```typescript
{
  props: [{
    key: { content: 'id', isStatic: true },
    value: { content: 'userId', isStatic: false }
  }]
}
```

## 动态参数

```html
<div :[attr]="value"></div>
```

动态参数需要处理 undefined 情况：

```typescript
// 原始
:[attr]="value"

// 处理后
arg.content = `${arg.content} || ""`
// 变成 attr || ""
```

这避免了 undefined 作为属性名。

## 修饰符处理

### .camel

```html
<div :view-box.camel="viewBox"></div>
```

转换静态参数：

```typescript
arg.content = camelize(arg.content)
// view-box → viewBox
```

转换动态参数：

```typescript
arg.content = `_camelize(${arg.content})`
```

### .prop

```html
<div :innerHTML.prop="html"></div>
```

添加 `.` 前缀：

```typescript
injectPrefix(arg, '.')
// .innerHTML
```

运行时识别这个前缀，直接设置 DOM 属性而非 attribute。

### .attr

```html
<div :custom-attr.attr="value"></div>
```

添加 `^` 前缀：

```typescript
injectPrefix(arg, '^')
// ^custom-attr
```

强制作为 attribute 设置。

## 没有表达式

```html
<div :disabled></div>
```

没有值时报错：

```typescript
if (!exp || !exp.content.trim()) {
  context.onError(createCompilerError(ErrorCodes.X_V_BIND_NO_EXPRESSION, loc))
  // 返回空字符串作为值
  return {
    props: [createObjectProperty(arg, createSimpleExpression('', true, loc))]
  }
}
```

## 简写语法

```html
<!-- 完整语法 -->
<div v-bind:id="id"></div>

<!-- 简写 -->
<div :id="id"></div>

<!-- .prop 简写 -->
<div .innerHTML="html"></div>
```

解析阶段已经统一为 DirectiveNode，这里处理逻辑相同。

## 对象绑定

```html
<div v-bind="{ id: 1, class: 'foo' }"></div>
```

对象绑定没有 arg，不经过 transformBind：

```typescript
// 在 buildProps 中处理
if (!arg) {
  // v-bind="obj" 形式
  // 直接返回表达式
}
```

## 与 buildProps 的配合

transformBind 返回的 props 被 buildProps 收集：

```typescript
function buildProps(node, context, props = node.props) {
  const properties = []
  
  for (const prop of props) {
    if (prop.type === NodeTypes.DIRECTIVE) {
      const directiveTransform = context.directiveTransforms[prop.name]
      if (directiveTransform) {
        const { props: dirProps } = directiveTransform(prop, node, context)
        properties.push(...dirProps)
      }
    }
  }
  
  return { props: createObjectExpression(properties) }
}
```

## 静态属性 vs 动态绑定

```html
<!-- 静态属性 -->
<div id="static"></div>
<!-- { key: 'id', value: '"static"' } -->

<!-- 动态绑定 -->
<div :id="dynamic"></div>
<!-- { key: 'id', value: 'dynamic' } -->
```

静态属性由 buildProps 直接处理，动态绑定经过 transformBind。

## 合并相同属性

```html
<div class="static" :class="dynamic"></div>
```

这在 buildProps 中处理，生成 mergeProps 或 normalizeClass 调用。

## 代码生成示例

```html
<div :id="userId" :class="{ active: isActive }"></div>
```

生成：

```typescript
createElementVNode("div", {
  id: userId,
  class: normalizeClass({ active: isActive })
}, null, 10 /* CLASS, PROPS */, ["id"])
```

## 小结

transformBind 处理 v-bind 指令，将属性名和表达式转换为 props 对象属性。动态参数添加 `|| ""` 防止 undefined。修饰符影响属性处理：.camel 驼峰化，.prop 设置 DOM 属性，.attr 设置 attribute。没有表达式时报错。返回的 props 被 buildProps 收集，最终生成完整的 props 对象。
