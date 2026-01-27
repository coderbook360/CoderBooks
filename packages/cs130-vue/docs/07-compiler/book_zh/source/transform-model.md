# transformModel 双向绑定转换

`transformModel` 处理 v-model 指令，将其转换为 value prop 和 update 事件。

## 基础结构

```typescript
export const transformModel: DirectiveTransform = (dir, node, context) => {
  const { exp, arg } = dir
  if (!exp) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_MODEL_NO_EXPRESSION, dir.loc)
    )
    return createEmptyExpression()
  }

  const rawExp = exp.loc.source
  const expString = exp.type === NodeTypes.SIMPLE_EXPRESSION ? exp.content : rawExp

  // 验证表达式是否可赋值
  if (!isMemberExpression(expString, context)) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_MODEL_MALFORMED_EXPRESSION, exp.loc)
    )
    return createEmptyExpression()
  }

  // 确定 prop 名称
  const propName = arg ? arg : createSimpleExpression('modelValue', true)
  const eventName = arg
    ? isStaticExp(arg)
      ? `onUpdate:${arg.content}`
      : createCompoundExpression(['"onUpdate:" + ', arg])
    : `onUpdate:modelValue`

  let assignmentExp: ExpressionNode
  const eventArg = context.isTS ? `($event: any)` : `$event`
  assignmentExp = createCompoundExpression([
    `${eventArg} => ((`,
    exp,
    `) = $event)`
  ])

  const props = [
    createObjectProperty(propName, dir.exp!),
    createObjectProperty(eventName, assignmentExp)
  ]

  // 处理修饰符
  if (dir.modifiers.length && node.tagType === ElementTypes.COMPONENT) {
    const modifiers = dir.modifiers
      .map(m => (isSimpleIdentifier(m) ? m : JSON.stringify(m)) + `: true`)
      .join(`, `)
    const modifiersKey = arg
      ? isStaticExp(arg)
        ? `${arg.content}Modifiers`
        : createCompoundExpression([arg, ' + "Modifiers"'])
      : `modelModifiers`
    props.push(
      createObjectProperty(
        modifiersKey,
        createSimpleExpression(`{ ${modifiers} }`, false, dir.loc, ConstantTypes.CAN_HOIST)
      )
    )
  }

  return createTransformProps(props)
}
```

## v-model 的本质

v-model 是语法糖：

```html
<!-- v-model -->
<input v-model="text">

<!-- 等价于 -->
<input :value="text" @input="text = $event.target.value">

<!-- 组件 v-model -->
<MyInput v-model="text">

<!-- 等价于 -->
<MyInput :modelValue="text" @update:modelValue="text = $event">
```

## 表达式验证

```typescript
if (!isMemberExpression(expString, context)) {
  context.onError(
    createCompilerError(ErrorCodes.X_V_MODEL_MALFORMED_EXPRESSION, exp.loc)
  )
}
```

v-model 的表达式必须是可赋值的：

```html
<!-- 合法 -->
<input v-model="foo">
<input v-model="foo.bar">
<input v-model="foo[bar]">

<!-- 非法 -->
<input v-model="foo + bar">
<input v-model="foo()">
```

## 自定义 v-model 参数

```html
<MyComponent v-model:title="pageTitle">
```

转换为：

```typescript
{
  title: pageTitle,
  "onUpdate:title": ($event) => ((pageTitle) = $event)
}
```

## 多个 v-model

```html
<UserForm
  v-model:firstName="first"
  v-model:lastName="last"
>
```

转换为：

```typescript
{
  firstName: first,
  "onUpdate:firstName": ($event) => ((first) = $event),
  lastName: last,
  "onUpdate:lastName": ($event) => ((last) = $event)
}
```

## 修饰符处理

```html
<MyInput v-model.trim.lazy="text">
```

转换为：

```typescript
{
  modelValue: text,
  "onUpdate:modelValue": ($event) => ((text) = $event),
  modelModifiers: { trim: true, lazy: true }
}
```

### 自定义参数的修饰符

```html
<MyInput v-model:title.capitalize="text">
```

转换为：

```typescript
{
  title: text,
  "onUpdate:title": ($event) => ((text) = $event),
  titleModifiers: { capitalize: true }
}
```

## 原生元素的 v-model

compiler-dom 扩展了 transformModel：

```typescript
// compiler-dom/src/transforms/vModel.ts
export const transformModel: DirectiveTransform = (dir, node, context) => {
  const baseResult = baseTransformModel(dir, node, context)
  
  // 检查元素类型
  if (node.tagType === ElementTypes.ELEMENT) {
    const { tag } = node
    const isCustomElement = context.isCustomElement(tag)
    
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || isCustomElement) {
      // 返回需要运行时指令
      return {
        ...baseResult,
        needRuntime: context.helper(V_MODEL_TEXT) // 或其他
      }
    }
  }
  
  return baseResult
}
```

不同元素使用不同的运行时指令：

```typescript
// input type="text" | textarea
V_MODEL_TEXT

// input type="checkbox"
V_MODEL_CHECKBOX

// input type="radio"
V_MODEL_RADIO

// select
V_MODEL_SELECT

// 动态类型
V_MODEL_DYNAMIC
```

## 运行时指令

原生元素的 v-model 需要运行时指令处理：

```typescript
withDirectives(
  createElementVNode("input", {
    "onUpdate:modelValue": ($event) => ((text) = $event)
  }, null, 8, ["onUpdate:modelValue"]),
  [[vModelText, text]]
)
```

运行时指令负责：
- 设置初始值
- 监听事件
- 处理修饰符（.lazy, .number, .trim）

## 组件 vs 原生元素

组件的 v-model：
- 纯 props + 事件
- 不需要运行时指令

原生元素的 v-model：
- props + 事件
- 加上运行时指令处理边界情况

## TypeScript 支持

```typescript
const eventArg = context.isTS ? `($event: any)` : `$event`
```

TypeScript 模式下添加类型注解。

## 错误场景

```html
<!-- 作用域变量 -->
<input v-model="item" v-for="item in items">
<!-- X_V_MODEL_ON_SCOPE_VARIABLE -->

<!-- props -->
<script setup>
const props = defineProps(['value'])
</script>
<input v-model="props.value">
<!-- X_V_MODEL_ON_PROPS -->
```

## 示例转换

```html
<MyComponent v-model="text" v-model:count.number="num">
```

生成 props：

```typescript
{
  modelValue: text,
  "onUpdate:modelValue": ($event) => ((text) = $event),
  count: num,
  "onUpdate:count": ($event) => ((num) = $event),
  countModifiers: { number: true }
}
```

## 小结

transformModel 将 v-model 转换为 value prop 和 update 事件。表达式必须可赋值。支持自定义参数和多个 v-model。修饰符通过 xxxModifiers prop 传递给组件。原生元素需要额外的运行时指令处理 DOM 交互。这种设计使 v-model 既保持简洁的模板语法，又有完整的双向绑定功能。
