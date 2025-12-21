# Emit 事件的实现机制

Props 实现了父组件向子组件的数据传递，**那子组件如何向父组件发送消息？** 答案是 **emit**——Vue 组件的事件机制。

**本章会给你一个“原来如此”的感觉。** emit 的实现出乎意料地简单，但设计却非常精妙。本章将深入分析 emit 的实现原理。

## Emit 的基本使用

先回顾 emit 的使用方式：

```vue-html
<!-- 子组件 Child.vue -->
<template>
  <button @click="handleClick">Click me</button>
</template>

<script setup>
const emit = defineEmits(['update', 'delete'])

function handleClick() {
  emit('update', { id: 1, value: 'new' })
}
</script>

<!-- 父组件 -->
<template>
  <Child @update="onUpdate" @delete="onDelete" />
</template>

<script setup>
function onUpdate(payload) {
  console.log('收到更新:', payload)
}
</script>
```

子组件调用 `emit('update', payload)`，父组件的 `onUpdate` 被触发。这是如何实现的？

## Emit 的核心原理

思考一下：父组件的 `@update="onUpdate"` 是什么？

答案：**它是一个 prop**。

编译后的子组件 VNode：

```javascript
// <Child @update="onUpdate" @delete="onDelete" />
// 编译为：
h(Child, {
  onUpdate: onUpdate,
  onDelete: onDelete
})
```

事件监听器被转换为 `on` 开头的 props。`emit` 的工作就是从 props 中找到对应的处理函数并执行。

## emit 函数实现

```javascript
function emit(instance, event, ...rawArgs) {
  // 获取组件的 props
  const props = instance.vnode.props || {}
  
  // 事件名转换：update → onUpdate
  let handlerName = toHandlerKey(event)
  let handler = props[handlerName]
  
  // 也尝试 kebab-case：update-value → onUpdateValue
  if (!handler && event.includes('-')) {
    handlerName = toHandlerKey(camelize(event))
    handler = props[handlerName]
  }
  
  if (handler) {
    // 执行事件处理器
    callWithAsyncErrorHandling(
      handler,
      instance,
      ErrorCodes.COMPONENT_EVENT_HANDLER,
      rawArgs
    )
  }
}

// 事件名转换
function toHandlerKey(str) {
  return str ? `on${capitalize(str)}` : ''
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function camelize(str) {
  return str.replace(/-(\w)/g, (_, c) => c.toUpperCase())
}
```

核心逻辑非常简单：

1. 将事件名转换为 handler 属性名（`update` → `onUpdate`）
2. 从 props 中查找处理函数
3. 执行处理函数

## Emits 声明

Vue 3 引入了 `emits` 选项来声明组件会触发的事件：

```javascript
const MyComponent = {
  emits: ['update', 'delete'],
  // 或者带校验
  emits: {
    update: (payload) => {
      // 返回 true 表示校验通过
      return payload && typeof payload.id === 'number'
    },
    delete: null  // 不校验
  }
}
```

为什么需要声明？

**1. 区分事件和透传属性**

```javascript
// 如果没有 emits 声明
// @click 会被当作普通 prop 透传到根元素

// 声明了 emits
emits: ['click']
// @click 不会透传，只作为组件事件
```

**2. 事件校验**

开发环境下，Vue 会校验 emit 的事件是否在 emits 中声明：

```javascript
function emit(instance, event, ...rawArgs) {
  // 校验事件声明
  if (__DEV__) {
    const { emitsOptions } = instance
    if (emitsOptions && !hasOwn(emitsOptions, event)) {
      warn(`Component emitted event "${event}" but it is not declared.`)
    }
    
    // 执行校验函数
    const validator = emitsOptions && emitsOptions[event]
    if (isFunction(validator)) {
      const isValid = validator(...rawArgs)
      if (!isValid) {
        warn(`Invalid event arguments: event "${event}" validation failed.`)
      }
    }
  }
  
  // ... 执行处理器
}
```

## Emits 规范化

与 props 类似，emits 也需要规范化：

```javascript
function normalizeEmitsOptions(comp) {
  const raw = comp.emits
  let normalized = {}
  
  if (!raw) {
    return null
  }
  
  if (isArray(raw)) {
    // 数组形式 → 对象形式
    raw.forEach(key => {
      normalized[key] = null
    })
  } else {
    // 对象形式，直接使用
    normalized = raw
  }
  
  // 缓存
  comp.__emits = normalized
  
  return normalized
}
```

## emit 绑定到实例

在创建组件实例时，emit 被绑定到当前实例：

```javascript
function createComponentInstance(vnode, parent) {
  const instance = {
    // ...
    emit: null
  }
  
  // 绑定 emit 函数
  instance.emit = emit.bind(null, instance)
  
  return instance
}
```

这样在 setup 中就能直接使用：

```javascript
setup(props, { emit }) {
  // emit 已绑定到当前实例
  emit('update', data)
}
```

## v-model 与 emit

v-model 是 props + emit 的语法糖：

```vue-html
<!-- 父组件 -->
<Child v-model="value" />

<!-- 等价于 -->
<Child :modelValue="value" @update:modelValue="value = $event" />
```

子组件需要：

```javascript
const MyComponent = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  
  setup(props, { emit }) {
    function updateValue(newValue) {
      emit('update:modelValue', newValue)
    }
    
    return { updateValue }
  }
}
```

**命名 v-model**：

```vue-html
<!-- 父组件 -->
<Child v-model:title="title" v-model:content="content" />

<!-- 等价于 -->
<Child 
  :title="title" 
  @update:title="title = $event"
  :content="content"
  @update:content="content = $event"
/>
```

## 事件修饰符

一些修饰符在编译时处理：

```vue-html
<Child @update.once="onUpdate" />
```

编译为：

```javascript
h(Child, {
  onUpdateOnce: onUpdate
})
```

运行时识别 `Once` 后缀：

```javascript
function emit(instance, event, ...rawArgs) {
  const props = instance.vnode.props || {}
  
  let handlerName = toHandlerKey(event)
  let handler = props[handlerName]
  
  // 检查 once 修饰符
  const onceHandler = props[handlerName + 'Once']
  if (onceHandler) {
    if (!instance.emitted) {
      instance.emitted = {}
    }
    if (instance.emitted[event]) {
      return  // 已触发过，不再执行
    }
    instance.emitted[event] = true
    handler = onceHandler
  }
  
  if (handler) {
    callWithAsyncErrorHandling(handler, instance, ErrorCodes.COMPONENT_EVENT_HANDLER, rawArgs)
  }
}
```

## 原生事件与组件事件

区分原生 DOM 事件和组件自定义事件：

```vue-html
<!-- 原生事件：直接绑定到 DOM -->
<button @click="onClick">Click</button>

<!-- 组件事件：通过 emit 机制 -->
<Child @click="onClick" />
```

如果子组件声明了 `emits: ['click']`，则 `@click` 是组件事件，不会透传。

如果没有声明，`@click` 会作为 prop 透传到子组件的根元素（原生事件行为）。

```javascript
// 在 initProps 中
function isEmitListener(options, key) {
  if (!options || !isOn(key)) {
    return false
  }
  
  const eventName = key.slice(2).toLowerCase()
  return hasOwn(options, eventName) || hasOwn(options, camelize(eventName))
}

// 区分 emit listener 和普通 props
if (isEmitListener(emitsOptions, key)) {
  // 是组件事件，不放入 attrs
} else {
  attrs[key] = value  // 透传属性
}
```

## 本章小结

本章分析了 Emit 的实现机制：

- **核心原理**：事件监听器是 `on` 开头的 props，emit 从 props 中查找并执行
- **名称转换**：`event` → `onEvent`，支持 kebab-case
- **emits 声明**：区分组件事件和透传属性，支持校验
- **实例绑定**：emit 绑定到组件实例，方便使用
- **v-model**：props + emit 的语法糖
- **事件修饰符**：once 等修饰符的运行时处理

Emit 机制非常简洁——本质就是"从 props 中找函数并调用"。这种设计使得父子组件通信统一通过 props 完成，保持了数据流的清晰。

下一章，我们将分析 Slots——父组件如何向子组件传递渲染内容。
