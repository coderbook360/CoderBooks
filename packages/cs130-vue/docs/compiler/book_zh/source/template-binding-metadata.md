# 模板与绑定元数据

模板编译器使用 script 分析产生的绑定元数据来优化代码生成。

## 绑定元数据结构

```typescript
interface BindingMetadata {
  [key: string]: BindingTypes
}

const enum BindingTypes {
  DATA = 'data',
  PROPS = 'props',
  PROPS_ALIASED = 'props-aliased',
  SETUP_CONST = 'setup-const',
  SETUP_LET = 'setup-let',
  SETUP_REACTIVE_CONST = 'setup-reactive-const',
  SETUP_REF = 'setup-ref',
  SETUP_MAYBE_REF = 'setup-maybe-ref',
  LITERAL_CONST = 'literal-const',
  OPTIONS = 'options'
}
```

## 元数据传递

```typescript
// script 编译产生绑定信息
const script = compileScript(descriptor, { id })
// script.bindings = { count: 'setup-ref', user: 'setup-reactive-const' }

// 传递给模板编译器
const template = compileTemplate({
  source: descriptor.template!.content,
  compilerOptions: {
    bindingMetadata: script.bindings
  }
})
```

## 变量前缀处理

```typescript
function processExpression(
  node: SimpleExpressionNode,
  context: TransformContext
): ExpressionNode {
  const { content } = node
  const { bindingMetadata } = context

  // 查找绑定类型
  const type = bindingMetadata[content]

  switch (type) {
    case BindingTypes.SETUP_REF:
      // ref 需要 .value
      return createCompoundExpression([
        `${context.helperString(UNREF)}(`,
        node,
        `)`
      ])

    case BindingTypes.SETUP_CONST:
    case BindingTypes.SETUP_REACTIVE_CONST:
      // 直接使用
      return node

    case BindingTypes.PROPS:
      // 从 __props 访问
      node.content = `__props.${content}`
      return node

    default:
      // 添加 _ctx 前缀
      node.content = `_ctx.${content}`
      return node
  }
}
```

## ref 自动解包

```vue
<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <div>{{ count }}</div>
</template>
```

```typescript
// 绑定元数据
{ count: 'setup-ref' }

// 模板编译（inline 模式）
_toDisplayString(count.value)

// 模板编译（非 inline 模式）
_toDisplayString(_unref(count))
```

## Inline 模式

```typescript
// inline: true
function setup(__props) {
  const count = ref(0)

  return (_ctx, _cache) => {
    return _createElementVNode("div", null,
      _toDisplayString(count.value))  // 直接访问
  }
}

// inline: false
const _sfc_render = (_ctx, _cache, $props, $setup) => {
  return _createElementVNode("div", null,
    _toDisplayString(_unref($setup.count)))  // 通过 $setup
}
```

## Props 访问

```vue
<script setup>
const props = defineProps(['msg'])
</script>

<template>
  <div>{{ msg }}</div>
</template>
```

```typescript
// 绑定元数据
{ msg: 'props' }

// 模板编译
_createElementVNode("div", null, _toDisplayString(__props.msg))
```

## Reactive 对象

```vue
<script setup>
import { reactive } from 'vue'
const state = reactive({ count: 0 })
</script>

<template>
  <div>{{ state.count }}</div>
</template>
```

```typescript
// 绑定元数据
{ state: 'setup-reactive-const' }

// 模板编译（无需解包）
_toDisplayString(state.count)
```

## 组件识别

```typescript
// 导入的组件
import MyButton from './MyButton.vue'
// 绑定元数据
{ MyButton: 'setup-const' }

// 模板中使用
<MyButton />

// 编译结果（inline 模式）
_createVNode(MyButton, ...)

// 非 inline 模式
_createVNode($setup['MyButton'], ...)
```

## 生成模式对比

```typescript
// inline: true（开发/小型项目）
// - render 函数在 setup 返回值内
// - 直接访问 setup 作用域变量
// - 更好的 tree-shaking

// inline: false（生产/大型项目）
// - render 函数独立
// - 通过 $setup 对象访问
// - 更好的缓存

compileTemplate({
  source,
  compilerOptions: {
    inline: true,  // 或 false
    bindingMetadata: script.bindings
  }
})
```

## 优化示例

```vue
<script setup>
import { ref, computed } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)
const CONSTANT = 'static'
</script>

<template>
  <div>{{ count }} x 2 = {{ doubled }}, {{ CONSTANT }}</div>
</template>
```

```typescript
// 绑定元数据
{
  count: 'setup-ref',
  doubled: 'setup-maybe-ref',  // computed 可能是 ref
  CONSTANT: 'literal-const'     // 字面量常量
}

// 编译结果
_toDisplayString(count.value) + " x 2 = " +
_toDisplayString(_unref(doubled)) + ", " +
_toDisplayString(CONSTANT)  // 常量直接使用
```

## 小结

绑定元数据的关键点：

1. **类型标记**：记录变量的响应式类型
2. **访问优化**：根据类型选择访问方式
3. **ref 解包**：自动添加 .value 或 unref
4. **模式选择**：inline vs 非 inline

下一章将分析 scoped CSS 的编译实现。
