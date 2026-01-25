# app.directive 全局指令

指令是 Vue 中对 DOM 元素进行底层操作的方式。当内置指令（v-if、v-for、v-model 等）不能满足需求时，可以创建自定义指令。`app.directive` 用于注册全局自定义指令。

## 指令的作用

指令提供了直接操作 DOM 的能力，适合以下场景：

```javascript
// 自动聚焦
<input v-focus />

// 权限控制
<button v-permission="'admin'">管理</button>

// 点击外部关闭
<div v-click-outside="close">弹窗内容</div>

// 长按事件
<button v-longpress="handleLongPress">按住我</button>
```

这些场景的共同点是需要直接操作 DOM 元素，与 DOM API 打交道。

## 源码分析

`directive` 方法的实现与 `component` 类似：

```typescript
directive(name: string, directive?: Directive): any {
  if (__DEV__) {
    validateDirectiveName(name)
  }
  
  if (!directive) {
    // 获取已注册的指令
    return context.directives[name]
  }
  
  if (__DEV__ && context.directives[name]) {
    warn(`Directive "${name}" has already been registered in target app.`)
  }
  
  // 注册指令
  context.directives[name] = directive
  
  return app
}
```

指令存储在 `context.directives` 中，结构与组件注册完全一致。

## 指令名验证

指令名不能使用内置指令的名称：

```typescript
function validateDirectiveName(name: string) {
  if (isBuiltInDirective(name)) {
    warn('Do not use built-in directive ids as custom directive id: ' + name)
  }
}

const isBuiltInDirective = makeMap(
  'bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo'
)
```

## 指令的定义

指令可以是对象或函数：

```javascript
// 对象形式（完整）
const focusDirective = {
  created(el, binding, vnode) { },
  beforeMount(el, binding, vnode) { },
  mounted(el, binding, vnode) {
    el.focus()
  },
  beforeUpdate(el, binding, vnode, prevVnode) { },
  updated(el, binding, vnode, prevVnode) { },
  beforeUnmount(el, binding, vnode) { },
  unmounted(el, binding, vnode) { }
}

// 函数形式（简写，同时作为 mounted 和 updated）
const focusDirective = (el, binding) => {
  el.focus()
}
```

函数形式是简写，等价于同时定义 `mounted` 和 `updated` 钩子。

## 钩子参数

每个钩子接收相同的参数：

```typescript
interface DirectiveBinding<V = any> {
  instance: ComponentPublicInstance | null  // 使用指令的组件实例
  value: V                                  // 指令的值
  oldValue: V | null                        // 之前的值（仅 updated 中可用）
  arg?: string                              // 指令参数
  modifiers: DirectiveModifiers             // 修饰符
  dir: ObjectDirective<any, V>              // 指令对象
}

// 使用示例
// v-my-directive:foo.bar.baz="value"
// binding.arg = 'foo'
// binding.modifiers = { bar: true, baz: true }
// binding.value = value
```

## 指令解析

当模板中使用指令时，`resolveDirective` 处理解析：

```typescript
export function resolveDirective(name: string): Directive | undefined {
  return resolveAsset(DIRECTIVES, name)
}
```

与组件解析共用 `resolveAsset` 函数，先查局部注册，再查全局注册。

## 实际案例

**v-focus 自动聚焦**：

```javascript
app.directive('focus', {
  mounted(el) {
    el.focus()
  }
})

// 使用
<input v-focus />
```

**v-permission 权限控制**：

```javascript
app.directive('permission', {
  mounted(el, binding) {
    const requiredPermission = binding.value
    const userPermissions = getCurrentUserPermissions()
    
    if (!userPermissions.includes(requiredPermission)) {
      el.parentNode?.removeChild(el)
    }
  }
})

// 使用
<button v-permission="'admin'">管理员操作</button>
```

**v-click-outside 点击外部**：

```javascript
app.directive('click-outside', {
  mounted(el, binding) {
    el._clickOutsideHandler = (event) => {
      if (!el.contains(event.target)) {
        binding.value(event)
      }
    }
    document.addEventListener('click', el._clickOutsideHandler)
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutsideHandler)
  }
})

// 使用
<div v-click-outside="closePopup">弹窗内容</div>
```

**v-lazy 图片懒加载**：

```javascript
app.directive('lazy', {
  mounted(el, binding) {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.src = binding.value
        observer.disconnect()
      }
    })
    observer.observe(el)
    el._lazyObserver = observer
  },
  unmounted(el) {
    el._lazyObserver?.disconnect()
  }
})
```

使用示例：

```vue
<img v-lazy="imageUrl" />
```

## 指令的生命周期

指令钩子对应组件的生命周期：

| 指令钩子 | 时机 |
|---------|------|
| created | 元素的属性和事件监听器应用之前 |
| beforeMount | 元素插入 DOM 之前 |
| mounted | 元素插入 DOM 之后 |
| beforeUpdate | 组件更新之前 |
| updated | 组件更新之后 |
| beforeUnmount | 元素移除之前 |
| unmounted | 元素移除之后 |

大多数情况只需要 `mounted` 和 `unmounted`——挂载时设置，卸载时清理。

## 动态参数

指令支持动态参数：

```vue
<template>
  <div v-pin:[direction]="200">固定位置</div>
</template>

<script setup>
import { ref } from 'vue'
const direction = ref('top')
</script>
```

指令定义：

```javascript
app.directive('pin', {
  mounted(el, binding) {
    el.style.position = 'fixed'
    el.style[binding.arg || 'top'] = binding.value + 'px'
  },
  updated(el, binding) {
    el.style[binding.arg || 'top'] = binding.value + 'px'
  }
})
```

## 在组件上使用

指令也可以用在组件上，会应用到组件的根元素：

```vue
<MyComponent v-focus />
```

如果组件有多个根元素，指令会被忽略并发出警告。

## 类型支持

为自定义指令添加类型：

```typescript
import type { Directive } from 'vue'

const vFocus: Directive<HTMLElement> = {
  mounted(el) {
    el.focus()
  }
}

// 或者带值类型
const vPermission: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    // binding.value 类型是 string
  }
}
```

全局类型声明：

```typescript
declare module 'vue' {
  export interface ComponentCustomProperties {
    vFocus: Directive<HTMLElement>
    vPermission: Directive<HTMLElement, string>
  }
}
```

## 与 Composition API 配合

在 setup 中使用指令：

```vue
<script setup>
// 局部注册
const vFocus = {
  mounted: (el) => el.focus()
}
</script>

<template>
  <input v-focus />
</template>
```

以 `v` 开头的变量会被自动识别为指令。

## 何时使用指令

指令适合的场景：

- 需要直接操作 DOM 元素
- 与第三方 DOM 库集成
- 需要在多个组件间复用的 DOM 操作

指令不适合的场景：

- 复杂的业务逻辑（应该放在组件或 composables 中）
- 需要响应式状态（应该使用组件）
- 可以用 CSS 实现的效果

## 小结

`app.directive` 提供了全局指令的注册功能。指令存储在应用上下文的 `directives` 对象中。

指令可以是包含生命周期钩子的对象，或者同时作为 `mounted` 和 `updated` 的函数。钩子参数提供了绑定值、参数、修饰符等信息。

指令适合直接操作 DOM 的场景，与组件互补。正确使用指令可以让代码更简洁，封装可复用的 DOM 操作。

在下一章中，我们将看看 `app.provide` 是如何实现全局依赖注入的。
