# mergeProps 属性合并

`mergeProps` 合并多个 props 对象，正确处理 class、style、事件监听器等特殊属性。

## 函数签名

```typescript
function mergeProps(...args: Data[]): Data
```

接收多个 props 对象，返回合并后的新对象。

## 实现

```typescript
function mergeProps(...args: Data[]): Data {
  const ret: Data = {}
  
  for (let i = 0; i < args.length; i++) {
    const toMerge = args[i]
    for (const key in toMerge) {
      if (key === 'class') {
        // class 合并
        if (ret.class !== toMerge.class) {
          ret.class = normalizeClass([ret.class, toMerge.class])
        }
      } else if (key === 'style') {
        // style 合并
        ret.style = normalizeStyle([ret.style, toMerge.style])
      } else if (isOn(key)) {
        // 事件处理器合并
        const existing = ret[key]
        const incoming = toMerge[key]
        if (
          incoming &&
          existing !== incoming &&
          !(isArray(existing) && existing.includes(incoming))
        ) {
          ret[key] = existing
            ? [].concat(existing as any, incoming as any)
            : incoming
        }
      } else if (key !== '') {
        // 普通属性覆盖
        ret[key] = toMerge[key]
      }
    }
  }
  
  return ret
}
```

## 合并策略

### class 合并

使用 `normalizeClass` 合并为空格分隔的字符串：

```typescript
mergeProps(
  { class: 'foo' },
  { class: ['bar', { baz: true }] }
)
// -> { class: 'foo bar baz' }
```

### style 合并

使用 `normalizeStyle` 合并为对象：

```typescript
mergeProps(
  { style: { color: 'red' } },
  { style: 'font-size: 14px' }
)
// -> { style: { color: 'red', fontSize: '14px' } }
```

后面的属性覆盖前面的：

```typescript
mergeProps(
  { style: { color: 'red' } },
  { style: { color: 'blue' } }
)
// -> { style: { color: 'blue' } }
```

### 事件处理器合并

同名事件合并为数组，都会被调用：

```typescript
mergeProps(
  { onClick: handler1 },
  { onClick: handler2 }
)
// -> { onClick: [handler1, handler2] }
```

去重检查：

```typescript
const handler = () => {}
mergeProps(
  { onClick: handler },
  { onClick: handler }  // 相同引用
)
// -> { onClick: handler }  // 不会重复
```

### 普通属性

后面覆盖前面：

```typescript
mergeProps(
  { id: 'a', title: 'old' },
  { title: 'new' }
)
// -> { id: 'a', title: 'new' }
```

## 使用场景

### 组件属性透传

```typescript
// 子组件继承父组件 attrs
function renderWithAttrs(props: Data, attrs: Data) {
  return h('div', mergeProps(props, attrs))
}
```

### v-bind 合并

多个 v-bind 合并：

```html
<div v-bind="obj1" v-bind="obj2">
```

编译为：

```typescript
h('div', mergeProps(obj1, obj2))
```

### cloneVNode

克隆时合并新属性：

```typescript
function cloneVNode(vnode: VNode, extraProps?: Data) {
  const mergedProps = extraProps
    ? mergeProps(vnode.props || {}, extraProps)
    : vnode.props
  // ...
}
```

### 高阶组件

包装组件合并 props：

```typescript
function withLoading(Comp: Component) {
  return defineComponent({
    props: ['loading'],
    setup(props, { attrs }) {
      return () => {
        if (props.loading) {
          return h('div', 'Loading...')
        }
        // 透传合并的属性
        return h(Comp, mergeProps(attrs, { loaded: true }))
      }
    }
  })
}
```

## normalizeClass

```typescript
function normalizeClass(value: unknown): string {
  let res = ''
  
  if (isString(value)) {
    res = value
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const normalized = normalizeClass(value[i])
      if (normalized) {
        res += normalized + ' '
      }
    }
  } else if (isObject(value)) {
    for (const name in value) {
      if (value[name]) {
        res += name + ' '
      }
    }
  }
  
  return res.trim()
}
```

支持多种格式：

```typescript
normalizeClass('foo bar')            // 'foo bar'
normalizeClass(['foo', 'bar'])       // 'foo bar'
normalizeClass({ foo: true, bar: false }) // 'foo'
normalizeClass(['foo', { bar: true }])    // 'foo bar'
```

## normalizeStyle

```typescript
function normalizeStyle(
  value: unknown
): Record<string, string | number> | string | undefined {
  if (isArray(value)) {
    const res: Record<string, string | number> = {}
    for (let i = 0; i < value.length; i++) {
      const item = value[i]
      const normalized = isString(item)
        ? parseStringStyle(item)
        : normalizeStyle(item)
      if (normalized) {
        for (const key in normalized) {
          res[key] = normalized[key]
        }
      }
    }
    return res
  } else if (isString(value)) {
    return value
  } else if (isObject(value)) {
    return value
  }
}
```

解析字符串样式：

```typescript
function parseStringStyle(cssText: string): Record<string, string> {
  const ret: Record<string, string> = {}
  cssText.split(';').forEach(item => {
    const [key, val] = item.split(':')
    if (key && val) {
      ret[key.trim()] = val.trim()
    }
  })
  return ret
}
```

## isOn 判断

```typescript
const onRE = /^on[^a-z]/

function isOn(key: string): boolean {
  return onRE.test(key)
}
```

匹配 `onXxx` 形式的事件名。

## 边界情况

### 空值处理

```typescript
mergeProps(
  { class: undefined },
  { class: 'foo' }
)
// -> { class: 'foo' }
```

### key 属性

key 是特殊的，不参与合并：

```typescript
mergeProps(
  { key: 'a' },
  { key: 'b' }
)
// key 由 VNode 单独处理
```

### ref 属性

ref 也需要特殊处理（在 cloneVNode 中）：

```typescript
// mergeProps 不处理 ref
// cloneVNode 中单独处理 ref 合并
```

## 性能考虑

1. **避免频繁调用**：合并操作有开销
2. **编译时优化**：静态 props 直接内联
3. **惰性合并**：只在需要时合并

```typescript
// 编译器优化：静态 props 不调用 mergeProps
h('div', { class: 'static', id: 'app' })

// 需要合并时才调用
h('div', mergeProps(dynamicProps, attrs))
```

## 小结

`mergeProps` 是属性合并的核心函数，实现了 Vue 模板中 v-bind 合并的语义。它对 class、style、事件处理器采用特殊的合并策略，确保属性合并符合直觉。这是组件属性透传、高阶组件等模式的基础。
