# patchProps 属性更新

`patchProps` 处理元素属性的完整 diff。当没有 patchFlag 优化时使用此函数。

## 函数签名

```typescript
const patchProps = (
  el: RendererElement,
  vnode: VNode,
  oldProps: Data,
  newProps: Data,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean
) => { ... }
```

## 实现

```typescript
const patchProps = (
  el,
  vnode,
  oldProps,
  newProps,
  parentComponent,
  parentSuspense,
  isSVG
) => {
  if (oldProps !== newProps) {
    // 1. 移除旧属性中不存在于新属性的
    if (oldProps !== EMPTY_OBJ) {
      for (const key in oldProps) {
        if (!isReservedProp(key) && !(key in newProps)) {
          hostPatchProp(
            el,
            key,
            oldProps[key],
            null,  // 移除
            isSVG,
            vnode.children as VNode[],
            parentComponent,
            parentSuspense,
            unmountChildren
          )
        }
      }
    }
    
    // 2. 添加/更新新属性
    for (const key in newProps) {
      if (isReservedProp(key)) continue
      const next = newProps[key]
      const prev = oldProps[key]
      // 值变化或是 value 属性
      if (next !== prev && key !== 'value') {
        hostPatchProp(
          el,
          key,
          prev,
          next,
          isSVG,
          vnode.children as VNode[],
          parentComponent,
          parentSuspense,
          unmountChildren
        )
      }
    }
    
    // 3. value 最后处理
    if ('value' in newProps) {
      hostPatchProp(el, 'value', oldProps.value, newProps.value)
    }
  }
}
```

## 执行流程

### 移除旧属性

```typescript
// oldProps: { class: 'a', id: 'x' }
// newProps: { class: 'b' }

// id 在 newProps 中不存在，移除
hostPatchProp(el, 'id', 'x', null, ...)
```

### 更新属性

```typescript
// oldProps: { class: 'a' }
// newProps: { class: 'b' }

// class 值变化，更新
hostPatchProp(el, 'class', 'a', 'b', ...)
```

### 添加新属性

```typescript
// oldProps: {}
// newProps: { title: 'Hello' }

// title 是新属性，添加
hostPatchProp(el, 'title', undefined, 'Hello', ...)
```

## hostPatchProp

`hostPatchProp` 是平台相关的属性更新函数：

```typescript
const patchProp: DOMRendererOptions['patchProp'] = (
  el,
  key,
  prevValue,
  nextValue,
  isSVG = false,
  prevChildren,
  parentComponent,
  parentSuspense,
  unmountChildren
) => {
  if (key === 'class') {
    patchClass(el, nextValue, isSVG)
  } else if (key === 'style') {
    patchStyle(el, prevValue, nextValue)
  } else if (isOn(key)) {
    if (!isModelListener(key)) {
      patchEvent(el, key, prevValue, nextValue, parentComponent)
    }
  } else if (
    key[0] === '.'
      ? ((key = key.slice(1)), true)
      : key[0] === '^'
      ? ((key = key.slice(1)), false)
      : shouldSetAsProp(el, key, nextValue, isSVG)
  ) {
    patchDOMProp(el, key, nextValue, prevChildren, parentComponent, parentSuspense, unmountChildren)
  } else {
    if (key === 'true-value') {
      ;(el as any)._trueValue = nextValue
    } else if (key === 'false-value') {
      ;(el as any)._falseValue = nextValue
    }
    patchAttr(el, key, nextValue, isSVG, parentComponent)
  }
}
```

## 属性类型处理

### class

```typescript
function patchClass(el: Element, value: string | null, isSVG: boolean) {
  const transitionClasses = (el as ElementWithTransition)._vtc
  if (transitionClasses) {
    value = (
      value ? [value, ...transitionClasses] : [...transitionClasses]
    ).join(' ')
  }
  if (value == null) {
    el.removeAttribute('class')
  } else if (isSVG) {
    el.setAttribute('class', value)
  } else {
    el.className = value
  }
}
```

### style

```typescript
function patchStyle(
  el: Element,
  prev: Style | null,
  next: Style | null
) {
  const style = (el as HTMLElement).style
  const isCssString = isString(next)
  
  if (next && !isCssString) {
    // 设置新样式
    for (const key in next) {
      setStyle(style, key, next[key])
    }
    // 移除旧样式
    if (prev && !isString(prev)) {
      for (const key in prev) {
        if (next[key] == null) {
          setStyle(style, key, '')
        }
      }
    }
  } else {
    if (isCssString) {
      if (prev !== next) {
        style.cssText = next as string
      }
    } else if (prev) {
      el.removeAttribute('style')
    }
  }
}
```

### 事件

```typescript
function patchEvent(
  el: Element,
  rawName: string,
  prevValue: EventValue | null,
  nextValue: EventValue | null,
  instance: ComponentInternalInstance | null = null
) {
  const invokers = (el as any)._vei || ((el as any)._vei = {})
  const existingInvoker = invokers[rawName]
  
  if (nextValue && existingInvoker) {
    // 更新：替换 value
    existingInvoker.value = nextValue
  } else {
    const [name, options] = parseName(rawName)
    if (nextValue) {
      // 添加
      const invoker = (invokers[rawName] = createInvoker(nextValue, instance))
      addEventListener(el, name, invoker, options)
    } else if (existingInvoker) {
      // 移除
      removeEventListener(el, name, existingInvoker, options)
      invokers[rawName] = undefined
    }
  }
}
```

事件使用 invoker 模式，更新时只换 value，不重新绑定。

### DOM Property

```typescript
function patchDOMProp(
  el: any,
  key: string,
  value: any,
  prevChildren: VNode[] | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  unmountChildren: UnmountChildrenFn | undefined
) {
  if (key === 'innerHTML' || key === 'textContent') {
    if (prevChildren) {
      unmountChildren(prevChildren, parentComponent, parentSuspense)
    }
    el[key] = value == null ? '' : value
    return
  }
  
  // ... 其他 DOM property 处理
  el[key] = value
}
```

### Attribute

```typescript
function patchAttr(
  el: Element,
  key: string,
  value: any,
  isSVG: boolean,
  instance?: ComponentInternalInstance | null
) {
  if (isSVG && key.startsWith('xlink:')) {
    if (value == null) {
      el.removeAttributeNS(xlinkNS, key.slice(6))
    } else {
      el.setAttributeNS(xlinkNS, key, value)
    }
  } else {
    if (value == null || (isBooleanAttr(key) && !includeBooleanAttr(value))) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, isBooleanAttr(key) ? '' : value)
    }
  }
}
```

## 保留属性

```typescript
const isReservedProp = (key: string): boolean =>
  key === 'key' ||
  key === 'ref' ||
  key.startsWith('onVnode')
```

这些属性不作为 DOM 属性处理。

## value 特殊处理

value 最后处理有两个原因：

1. **依赖其他属性**：如 type、multiple
2. **用户可能直接修改**：即使值相同也要同步

```typescript
if ('value' in newProps) {
  hostPatchProp(el, 'value', oldProps.value, newProps.value)
}
```

## 性能考虑

完整 props diff 的复杂度是 O(m + n)：
- m = 旧属性数量
- n = 新属性数量

编译器优化（patchFlag + dynamicProps）可以减少到 O(d)，d = 动态属性数量。

## 小结

`patchProps` 实现完整的属性 diff，处理移除、更新、添加三种情况。它委托 `hostPatchProp` 处理具体的属性类型（class、style、事件、DOM property、attribute）。这是非优化路径的必经之路。
