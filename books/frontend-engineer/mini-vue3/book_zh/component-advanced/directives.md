# 自定义指令系统

`v-focus`、`v-loading`、`v-permission`——这些自定义指令是如何工作的？它们在什么时机执行？

**理解指令的本质——“DOM 操作的封装”——能帮你更好地设计可复用的 DOM 逻辑。** 本章将深入分析 Vue 3 的自定义指令系统，包括指令的定义、解析和执行机制。

## 指令的本质

指令是**操作 DOM 的封装**。当你需要直接访问 DOM 元素时，指令比在组件中使用 ref 更优雅：

```javascript
// 自动聚焦指令
const vFocus = {
  mounted(el) {
    el.focus()
  }
}

// 使用
<input v-focus />
```

## 指令的生命周期

指令有自己的生命周期，与元素的生命周期对应：

```javascript
const myDirective = {
  // 元素创建后
  created(el, binding, vnode, prevVnode) {},
  
  // 挂载前
  beforeMount(el, binding, vnode, prevVnode) {},
  
  // 挂载后
  mounted(el, binding, vnode, prevVnode) {},
  
  // 更新前
  beforeUpdate(el, binding, vnode, prevVnode) {},
  
  // 更新后
  updated(el, binding, vnode, prevVnode) {},
  
  // 卸载前
  beforeUnmount(el, binding, vnode, prevVnode) {},
  
  // 卸载后
  unmounted(el, binding, vnode, prevVnode) {}
}
```

简写形式（mounted 和 updated 使用相同逻辑）：

```javascript
const vFocus = (el, binding) => {
  el.focus()
}
```

## binding 对象

每个钩子都接收 `binding` 参数：

```javascript
interface DirectiveBinding {
  value: any           // 指令绑定的值
  oldValue: any        // 旧值（仅在更新时可用）
  arg?: string         // 指令参数
  modifiers: object    // 修饰符对象
  instance: Component  // 组件实例
  dir: Directive       // 指令定义对象
}
```

示例：

```vue
<div v-my-directive:arg.modifier1.modifier2="value">
```

对应的 binding：

```javascript
{
  value: value,
  arg: 'arg',
  modifiers: { modifier1: true, modifier2: true }
}
```

## 注册指令

### 全局注册

```javascript
const app = createApp(App)

app.directive('focus', {
  mounted(el) {
    el.focus()
  }
})
```

### 局部注册

```javascript
export default {
  directives: {
    focus: {
      mounted(el) {
        el.focus()
      }
    }
  }
}
```

### setup 中注册

```vue
<script setup>
const vFocus = {
  mounted: (el) => el.focus()
}
</script>

<template>
  <input v-focus />
</template>
```

注意：`<script setup>` 中，以 `v` 开头的变量自动识别为指令。

## 指令解析

编译阶段，指令被转换为 `withDirectives` 调用：

```vue
<input v-focus v-model="text" />
```

编译结果：

```javascript
withDirectives(
  h('input', { ... }),
  [
    [vFocus],
    [vModelText, text, void 0, { lazy: false }]
  ]
)
```

`withDirectives` 实现：

```javascript
function withDirectives(vnode, directives) {
  // 将指令信息附加到 VNode
  vnode.dirs = directives.map(directive => {
    const [dir, value, arg, modifiers] = directive
    
    return {
      dir: typeof dir === 'function' ? { mounted: dir, updated: dir } : dir,
      value,
      arg,
      modifiers: modifiers || {}
    }
  })
  
  return vnode
}
```

## 指令调用时机

指令钩子在元素生命周期的特定时机调用：

```javascript
function invokeDirectiveHook(vnode, prevVNode, hook) {
  const dirs = vnode.dirs
  const prevDirs = prevVNode?.dirs
  
  for (let i = 0; i < dirs.length; i++) {
    const dir = dirs[i]
    const prevDir = prevDirs?.[i]
    
    // 获取对应钩子
    const hookFn = dir.dir[hook]
    
    if (hookFn) {
      // 构建 binding
      const binding = {
        value: dir.value,
        oldValue: prevDir?.value,
        arg: dir.arg,
        modifiers: dir.modifiers,
        instance: vnode.component?.proxy,
        dir: dir.dir
      }
      
      // 调用钩子
      callWithAsyncErrorHandling(hookFn, vnode.component, hook, [
        vnode.el,
        binding,
        vnode,
        prevVNode
      ])
    }
  }
}
```

调用位置：

```javascript
// mountElement
function mountElement(vnode, container) {
  const el = vnode.el = createElement(vnode.type)
  
  // ... 处理属性、子节点
  
  // 调用 created 钩子
  if (vnode.dirs) {
    invokeDirectiveHook(vnode, null, 'created')
  }
  
  // 调用 beforeMount 钩子
  if (vnode.dirs) {
    invokeDirectiveHook(vnode, null, 'beforeMount')
  }
  
  // 插入 DOM
  insert(el, container)
  
  // 调用 mounted 钩子（延迟）
  queuePostFlushCb(() => {
    if (vnode.dirs) {
      invokeDirectiveHook(vnode, null, 'mounted')
    }
  })
}
```

## 常见指令实现

### v-focus

```javascript
const vFocus = {
  mounted(el) {
    el.focus()
  }
}
```

### v-loading

```javascript
const vLoading = {
  mounted(el, binding) {
    if (binding.value) {
      showLoading(el)
    }
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) {
      binding.value ? showLoading(el) : hideLoading(el)
    }
  }
}

function showLoading(el) {
  const mask = document.createElement('div')
  mask.className = 'loading-mask'
  mask.innerHTML = '<div class="spinner"></div>'
  el.style.position = 'relative'
  el.appendChild(mask)
  el._loadingMask = mask
}

function hideLoading(el) {
  if (el._loadingMask) {
    el.removeChild(el._loadingMask)
    el._loadingMask = null
  }
}
```

### v-permission

```javascript
const vPermission = {
  mounted(el, binding) {
    const permission = binding.value
    const hasPermission = checkPermission(permission)
    
    if (!hasPermission) {
      el.parentNode?.removeChild(el)
    }
  }
}
```

### v-click-outside

```javascript
const vClickOutside = {
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
}
```

## 指令参数

指令可以接收动态参数：

```vue
<div v-my-directive:[arg]="value">
```

```javascript
const vMyDirective = {
  mounted(el, binding) {
    console.log(binding.arg)  // 动态参数值
  }
}
```

## 指令修饰符

修饰符提供额外的行为控制：

```vue
<input v-my-directive.trim.lazy="value">
```

```javascript
const vMyDirective = {
  mounted(el, binding) {
    if (binding.modifiers.trim) {
      // 处理 trim 修饰符
    }
    if (binding.modifiers.lazy) {
      // 处理 lazy 修饰符
    }
  }
}
```

## 在组件上使用指令

指令应用于组件时，作用于组件的根元素：

```vue
<MyComponent v-focus />
```

如果组件有多个根元素，指令会被忽略并发出警告。

## 本章小结

本章分析了自定义指令系统：

- **定义**：包含生命周期钩子的对象
- **binding**：包含 value、arg、modifiers 等信息
- **注册**：全局、局部、`<script setup>`
- **解析**：编译为 `withDirectives` 调用
- **执行**：在元素对应生命周期调用钩子

指令的生命周期：
- `created`：元素创建后
- `beforeMount`：挂载前
- `mounted`：挂载后
- `beforeUpdate`：更新前
- `updated`：更新后
- `beforeUnmount`：卸载前
- `unmounted`：卸载后

指令是直接操作 DOM 的优雅方式，适用于需要底层 DOM 访问的场景。

下一章，我们将分析 expose 和 refs 的工作原理。
