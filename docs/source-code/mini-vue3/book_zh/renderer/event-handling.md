# 事件处理：invoker 模式的优化

**首先要问的是**：每次更新事件处理函数都要 `removeEventListener` + `addEventListener`，太慢了。有没有更好的方式？

Vue 使用 **invoker 模式** 解决这个问题。**这是一个非常巧妙的设计，值得仔细理解。**

## 传统方式的问题

```javascript
function updateEvent(el, name, prevHandler, nextHandler) {
  if (prevHandler) {
    el.removeEventListener(name, prevHandler)
  }
  if (nextHandler) {
    el.addEventListener(name, nextHandler)
  }
}
```

问题：

1. 频繁的 `removeEventListener`/`addEventListener` 有性能开销
2. 更新时可能会丢失事件（在 remove 和 add 之间触发）

## invoker 模式的核心思想

不直接绑定用户的处理函数，而是绑定一个 invoker：

```javascript
const invoker = (e) => {
  invoker.value(e)  // 调用真正的处理函数
}
invoker.value = onClick  // 真正的处理函数

el.addEventListener('click', invoker)

// 更新时只需要修改 invoker.value
invoker.value = newOnClick  // 超快！不需要操作 DOM
```

## 完整实现

```javascript
function patchEvent(el, rawName, prevValue, nextValue) {
  // 解析事件名：onClick -> click
  const name = rawName.slice(2).toLowerCase()
  
  // 获取或创建 invokers 缓存
  const invokers = el._vei || (el._vei = {})
  const existingInvoker = invokers[rawName]
  
  if (nextValue && existingInvoker) {
    // 更新：只需要修改 value
    existingInvoker.value = nextValue
  } else {
    if (nextValue) {
      // 新增：创建 invoker 并绑定
      const invoker = invokers[rawName] = createInvoker(nextValue)
      el.addEventListener(name, invoker)
    } else if (existingInvoker) {
      // 移除
      el.removeEventListener(name, existingInvoker)
      invokers[rawName] = undefined
    }
  }
}

function createInvoker(initialValue) {
  const invoker = (e) => {
    invoker.value(e)
  }
  invoker.value = initialValue
  return invoker
}
```

`_vei` 是 Vue Event Invokers 的缩写，用于缓存该元素的所有 invokers。

## 事件冒泡与时序问题

考虑这个场景：

```javascript
const comp = {
  setup() {
    const show = ref(false)
    
    return () => [
      h('button', { onClick: () => show.value = true }, 'Show'),
      show.value && h('div', { onClick: () => show.value = false }, 'Hide')
    ]
  }
}
```

点击 button 时会发生什么？

1. click 事件触发
2. `show.value = true`
3. 组件同步更新，div 被挂载并绑定 onClick
4. click 事件冒泡到 div（因为 DOM 已更新）
5. `show.value = false`

结果：div 一闪而过！

### 解决方案：记录绑定时间

```javascript
function createInvoker(initialValue) {
  const invoker = (e) => {
    // 如果事件发生在绑定之前，忽略
    if (e.timeStamp >= invoker.attached) {
      invoker.value(e)
    }
  }
  
  invoker.value = initialValue
  invoker.attached = performance.now()  // 记录绑定时间
  
  return invoker
}
```

## 支持多个处理函数

Vue 支持数组形式的事件处理：

```javascript
h('div', {
  onClick: [handler1, handler2, handler3]
})
```

```javascript
function createInvoker(initialValue) {
  const invoker = (e) => {
    if (e.timeStamp < invoker.attached) return
    
    const handlers = invoker.value
    
    if (Array.isArray(handlers)) {
      // 多个处理函数
      for (let i = 0; i < handlers.length; i++) {
        handlers[i](e)
      }
    } else {
      // 单个处理函数
      handlers(e)
    }
  }
  
  invoker.value = initialValue
  invoker.attached = performance.now()
  
  return invoker
}
```

## 解析事件名和修饰符

```javascript
// onClick -> click
// onClickOnce -> click, { once: true }
// onClickCapture -> click, { capture: true }
// onClickPassive -> click, { passive: true }

const optionsModifierRE = /(?:Once|Passive|Capture)$/

function parseName(name) {
  let options
  
  if (optionsModifierRE.test(name)) {
    options = {}
    let m
    while ((m = name.match(optionsModifierRE))) {
      name = name.slice(0, name.length - m[0].length)
      options[m[0].toLowerCase()] = true
    }
  }
  
  return [
    name.slice(2).toLowerCase(),  // 移除 'on' 前缀
    options
  ]
}

// parseName('onClickOnceCapture')
// -> ['click', { once: true, capture: true }]
```

## 模板编译的事件修饰符

模板中的修饰符：

```html
<button @click.stop.prevent="handleClick">
```

编译为 `withModifiers`：

```javascript
h('button', {
  onClick: withModifiers(handleClick, ['stop', 'prevent'])
})

function withModifiers(fn, modifiers) {
  return (event, ...args) => {
    for (const mod of modifiers) {
      if (mod === 'stop') {
        event.stopPropagation()
      } else if (mod === 'prevent') {
        event.preventDefault()
      } else if (mod === 'self') {
        if (event.target !== event.currentTarget) {
          return
        }
      }
      // ... 其他修饰符
    }
    return fn(event, ...args)
  }
}
```

常见修饰符：

- `.stop`：stopPropagation
- `.prevent`：preventDefault
- `.self`：只在 target === currentTarget 时触发
- `.once`：只触发一次（使用 addEventListener 的 once 选项）
- `.capture`：捕获阶段触发
- `.passive`：passive 模式

## 按键修饰符

```html
<input @keyup.enter="submit">
```

编译为：

```javascript
h('input', {
  onKeyup: withKeys(submit, ['enter'])
})

function withKeys(fn, modifiers) {
  return (event) => {
    if (!modifiers.some(key => key === event.key.toLowerCase())) {
      return
    }
    return fn(event)
  }
}
```

## 完整的 patchEvent

```javascript
function patchEvent(el, rawName, prev, next) {
  const invokers = el._vei || (el._vei = {})
  const existing = invokers[rawName]
  
  if (next && existing) {
    // 更新
    existing.value = next
  } else {
    const [name, options] = parseName(rawName)
    
    if (next) {
      // 新增
      const invoker = invokers[rawName] = createInvoker(next)
      el.addEventListener(name, invoker, options)
    } else if (existing) {
      // 移除
      el.removeEventListener(name, existing, options)
      invokers[rawName] = undefined
    }
  }
}

function createInvoker(initialValue) {
  const invoker = (e) => {
    if (e.timeStamp >= invoker.attached) {
      const value = invoker.value
      if (Array.isArray(value)) {
        value.forEach(fn => fn(e))
      } else {
        value(e)
      }
    }
  }
  invoker.value = initialValue
  invoker.attached = performance.now()
  return invoker
}

const optionsModifierRE = /(?:Once|Passive|Capture)$/

function parseName(name) {
  let options
  if (optionsModifierRE.test(name)) {
    options = {}
    let m
    while ((m = name.match(optionsModifierRE))) {
      name = name.slice(0, name.length - m[0].length)
      options[m[0].toLowerCase()] = true
    }
  }
  return [name.slice(2).toLowerCase(), options]
}
```

## 本章小结

invoker 模式的核心优势：

- **更新快**：只需修改 `invoker.value`，不操作 DOM
- **时序安全**：通过 `attached` 时间戳避免冒泡问题
- **支持数组**：多个处理函数可以同时绑定

事件修饰符处理：

- **选项修饰符**（Once/Capture/Passive）：解析到 addEventListener 选项
- **行为修饰符**（stop/prevent）：包装为 withModifiers

---

## 练习与思考

1. 实现支持多处理函数的 invoker。

2. 为什么需要 `attached` 时间戳检查？画出时序图说明问题场景。

3. 思考：React 的合成事件和 Vue 的 invoker 模式有什么区别？
