# hydrateElement 元素水合

`hydrateElement` 处理 HTML 元素的水合过程。元素是最常见的节点类型，它的水合涉及属性、事件、指令和子节点的处理。

## 函数签名

```typescript
function hydrateElement(
  el: Element,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  optimized: boolean
): Node | null
```

## 元素水合流程

元素水合的主要步骤：

1. 验证元素匹配
2. 关联 vnode 和 DOM
3. 处理 props 和事件
4. 处理 ref
5. 水合子节点
6. 调用指令钩子

## 核心实现

```typescript
function hydrateElement(
  el: Element,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  optimized: boolean
): Node | null {
  // 关联 DOM 节点
  vnode.el = el
  
  const { type, props, shapeFlag, dirs } = vnode
  
  // 1. 验证标签名
  if (__DEV__) {
    const tag = type as string
    if (el.tagName.toLowerCase() !== tag.toLowerCase()) {
      logMismatch('tag', el.tagName, tag)
      return handleMismatch(el, vnode)
    }
  }
  
  // 2. 处理 props
  if (props) {
    hydrateProps(el, props, vnode, parentComponent)
  }
  
  // 3. 处理子节点
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 文本子节点
    hydrateTextContent(el, vnode.children as string)
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    // 数组子节点
    hydrateChildren(
      el.firstChild,
      vnode.children as VNode[],
      parentComponent,
      optimized
    )
  }
  
  // 4. 处理指令
  if (dirs) {
    invokeDirectiveHook(vnode, null, parentComponent, 'mounted')
  }
  
  return el.nextSibling
}
```

## 属性水合

```typescript
function hydrateProps(
  el: Element,
  props: Record<string, any>,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
) {
  for (const key in props) {
    const value = props[key]
    
    if (key === 'ref') {
      // 处理 ref
      setRef(value, el, parentComponent)
    } else if (isOn(key)) {
      // 事件处理器
      const eventName = key.slice(2).toLowerCase()
      el.addEventListener(eventName, value)
    } else if (shouldHydrateProp(key)) {
      // 可能需要同步的 props
      hydrateProperty(el, key, value)
    }
  }
}
```

## 事件附加

事件是水合的核心任务：

```typescript
function attachEvents(el: Element, props: Record<string, any>) {
  for (const key in props) {
    if (!isOn(key)) continue
    
    const eventName = key.slice(2).toLowerCase()
    const handler = props[key]
    
    if (typeof handler === 'function') {
      el.addEventListener(eventName, handler)
    } else if (Array.isArray(handler)) {
      // 多个处理器
      handler.forEach(h => {
        if (typeof h === 'function') {
          el.addEventListener(eventName, h)
        }
      })
    }
  }
}
```

## 事件修饰符

Vue 的事件修饰符需要在水合时正确处理：

```typescript
function createEventHandler(
  handler: Function,
  modifiers: string[]
): EventListener {
  return (event: Event) => {
    for (const mod of modifiers) {
      switch (mod) {
        case 'stop':
          event.stopPropagation()
          break
        case 'prevent':
          event.preventDefault()
          break
        case 'self':
          if (event.target !== event.currentTarget) return
          break
        case 'once':
          // once 在 addEventListener 时处理
          break
        // ... 其他修饰符
      }
    }
    return handler(event)
  }
}
```

## 属性比对

开发模式下比对属性：

```typescript
function hydrateProperty(el: Element, key: string, expected: any) {
  if (__DEV__) {
    const actual = getDOMValue(el, key)
    
    if (!isEqual(actual, expected)) {
      logMismatch('prop', key, actual, expected)
    }
  }
  
  // 某些属性需要同步
  if (shouldPatchProperty(key)) {
    patchProp(el, key, null, expected)
  }
}

function getDOMValue(el: Element, key: string): any {
  switch (key) {
    case 'class':
      return el.className
    case 'style':
      return (el as HTMLElement).style.cssText
    default:
      return el.getAttribute(key)
  }
}
```

## 文本内容水合

```typescript
function hydrateTextContent(el: Element, text: string) {
  if (el.textContent !== text) {
    if (__DEV__) {
      logMismatch('text', el.textContent, text)
    }
    // 修复不匹配
    el.textContent = text
  }
}
```

## 特殊元素处理

某些元素需要特殊处理：

**表单元素**：

```typescript
function hydrateFormElement(el: HTMLInputElement, props: Record<string, any>) {
  if ('value' in props) {
    // value 需要特殊处理
    const value = props.value
    if (el.value !== value) {
      el.value = value
    }
  }
  
  if ('checked' in props) {
    el.checked = props.checked
  }
  
  if ('selected' in props && el instanceof HTMLOptionElement) {
    el.selected = props.selected
  }
}
```

**textarea**：

```typescript
function hydrateTextarea(el: HTMLTextAreaElement, props: Record<string, any>) {
  if (props.value !== undefined) {
    el.value = props.value
  }
}
```

**select**：

```typescript
function hydrateSelect(el: HTMLSelectElement, props: Record<string, any>) {
  if (props.value !== undefined) {
    // 设置选中的 option
    Array.from(el.options).forEach(option => {
      option.selected = props.value.includes(option.value)
    })
  }
}
```

## Ref 处理

```typescript
function setRef(
  ref: string | Ref | ((el: Element | null) => void),
  el: Element,
  parentComponent: ComponentInternalInstance | null
) {
  if (!parentComponent) return
  
  if (typeof ref === 'function') {
    // 函数 ref
    ref(el)
  } else if (typeof ref === 'string') {
    // 字符串 ref
    parentComponent.refs[ref] = el
  } else if (isRef(ref)) {
    // Ref 对象
    ref.value = el
  }
}
```

## 指令水合

```typescript
function invokeDirectiveHook(
  vnode: VNode,
  prevVNode: VNode | null,
  instance: ComponentInternalInstance | null,
  name: 'mounted' | 'updated' | 'beforeUpdate' | 'beforeUnmount' | 'unmounted'
) {
  const dirs = vnode.dirs!
  
  for (const dir of dirs) {
    const hook = dir.dir[name]
    if (hook) {
      const binding = {
        instance: instance?.proxy,
        value: dir.value,
        oldValue: prevVNode ? dir.value : undefined,
        arg: dir.arg,
        modifiers: dir.modifiers,
        dir: dir.dir
      }
      
      hook(vnode.el, binding, vnode, prevVNode)
    }
  }
}
```

## 子节点水合

```typescript
function hydrateChildren(
  node: Node | null,
  vnodes: VNode[],
  parentComponent: ComponentInternalInstance | null,
  optimized: boolean
): void {
  for (let i = 0; i < vnodes.length; i++) {
    const childVNode = normalizeVNode(vnodes[i])
    
    if (node) {
      // 有对应的 DOM 节点
      node = hydrateNode(node, childVNode, parentComponent, optimized)
    } else if (__DEV__) {
      // DOM 节点不够，说明服务端渲染的内容少了
      logMismatch('children', 'missing', childVNode)
    }
  }
  
  // 检查是否有多余的 DOM 节点
  if (__DEV__ && node) {
    logMismatch('children', 'extra DOM nodes', node)
  }
}
```

## 不匹配修复

```typescript
function handleElementMismatch(
  actualEl: Element,
  expectedVNode: VNode
): Node | null {
  const parent = actualEl.parentNode
  
  if (parent) {
    // 创建正确的元素
    const newEl = document.createElement(expectedVNode.type as string)
    
    // 复制子节点
    while (actualEl.firstChild) {
      newEl.appendChild(actualEl.firstChild)
    }
    
    // 替换
    parent.replaceChild(newEl, actualEl)
    
    // 重新水合
    return hydrateElement(newEl, expectedVNode, null, false)
  }
  
  return actualEl.nextSibling
}
```

## 性能优化

**静态属性跳过**：

```typescript
if (vnode.patchFlag === PatchFlags.HOISTED) {
  // 静态元素，只需关联，不需要比对
  vnode.el = el
  return el.nextSibling
}
```

**批量处理**：

```typescript
function batchHydration(elements: [Element, VNode][]) {
  // 收集所有需要附加的事件
  const eventQueue: [Element, string, Function][] = []
  
  elements.forEach(([el, vnode]) => {
    vnode.el = el
    
    if (vnode.props) {
      for (const key in vnode.props) {
        if (isOn(key)) {
          eventQueue.push([el, key.slice(2).toLowerCase(), vnode.props[key]])
        }
      }
    }
  })
  
  // 批量附加事件
  requestAnimationFrame(() => {
    eventQueue.forEach(([el, event, handler]) => {
      el.addEventListener(event, handler as EventListener)
    })
  })
}
```

## 调试辅助

```typescript
function logMismatch(
  type: string,
  ...args: any[]
) {
  console.warn(
    `[Vue Hydration Mismatch] ${type}:`,
    ...args,
    '\n',
    'This may cause issues with your application.',
    '\nSee: https://vuejs.org/guide/scaling-up/ssr.html#hydration-mismatch'
  )
}
```

## 小结

`hydrateElement` 处理元素节点的水合：

1. 验证 DOM 元素与 vnode 匹配
2. 关联 vnode.el 到 DOM 元素
3. 附加事件处理器
4. 处理 ref 和指令
5. 递归水合子节点
6. 处理不匹配情况

元素水合是最频繁的操作，理解其实现有助于优化 SSR 应用的水合性能。
