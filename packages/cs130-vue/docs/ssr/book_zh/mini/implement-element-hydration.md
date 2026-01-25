# 实现元素激活

本章深入元素级别的 hydration 细节，完善属性比对、事件绑定和 DOM 复用。

## 元素激活流程

```typescript
// src/runtime/hydrate-element.ts

/**
 * 完整的元素激活
 */
export function hydrateElement(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInstance | null,
  options: HydrateOptions = {}
): Node | null {
  // 类型检查
  if (node.nodeType !== Node.ELEMENT_NODE) {
    if (options.strict) {
      throw new HydrationError('Expected element node', node, vnode)
    }
    return createAndInsert(vnode, node)
  }
  
  const el = node as Element
  const { type, props, children, shapeFlag, patchFlag, dynamicProps } = vnode
  
  // 标签名检查
  const tag = (type as string).toLowerCase()
  if (el.tagName.toLowerCase() !== tag) {
    if (options.strict) {
      throw new HydrationError(
        `Tag mismatch: expected ${tag}, got ${el.tagName}`,
        node, vnode
      )
    }
    return createAndInsert(vnode, node)
  }
  
  // 保存 DOM 引用
  vnode.el = el
  
  // 激活属性
  if (props) {
    hydrateElementProps(el, props, tag, patchFlag, dynamicProps, options)
  }
  
  // 处理 ref
  if (props?.ref) {
    setRef(props.ref, el, parentComponent)
  }
  
  // 激活子节点
  if (children != null) {
    hydrateElementChildren(el, vnode, shapeFlag, parentComponent, options)
  }
  
  return el.nextSibling
}

interface HydrateOptions {
  strict?: boolean
  onMismatch?: (info: MismatchInfo) => void
}
```

## 属性激活

```typescript
/**
 * 激活元素属性
 */
function hydrateElementProps(
  el: Element,
  props: Record<string, any>,
  tag: string,
  patchFlag?: number,
  dynamicProps?: string[],
  options: HydrateOptions = {}
): void {
  // 确定需要处理的属性
  const propsToHydrate = dynamicProps || Object.keys(props)
  
  for (const key of propsToHydrate) {
    if (!(key in props)) continue
    
    const value = props[key]
    
    // 跳过保留属性
    if (isReservedProp(key)) continue
    
    // 事件属性
    if (isEventKey(key)) {
      hydrateEvent(el, key, value)
      continue
    }
    
    // 验证并激活属性
    hydrateAttr(el, key, value, tag, options)
  }
  
  // 检查多余属性（开发模式）
  if (process.env.NODE_ENV !== 'production' && options.strict) {
    checkExtraAttrs(el, props)
  }
}

/**
 * 判断是否为事件 key
 */
function isEventKey(key: string): boolean {
  return key.charCodeAt(0) === 111 && // 'o'
         key.charCodeAt(1) === 110 && // 'n'
         key.charCodeAt(2) > 96       // lowercase letter after 'on'
}

/**
 * 判断是否为保留属性
 */
function isReservedProp(key: string): boolean {
  return key === 'key' || key === 'ref' || key.startsWith('v-')
}
```

## 事件激活

```typescript
/**
 * 激活事件
 */
function hydrateEvent(
  el: Element,
  key: string,
  handler: any
): void {
  // 获取事件名
  const eventName = getEventName(key)
  
  // 获取事件选项
  const [name, options] = parseEventName(eventName)
  
  // 创建事件调用器
  const invoker = createInvoker(handler)
  
  // 存储到元素上
  const invokers = ((el as any).__vei || ((el as any).__vei = {}))
  invokers[key] = invoker
  
  // 添加事件监听
  el.addEventListener(name, invoker, options)
}

/**
 * 解析事件名
 */
function parseEventName(name: string): [string, AddEventListenerOptions] {
  const options: AddEventListenerOptions = {}
  
  // 检查修饰符
  if (name.endsWith('Capture')) {
    options.capture = true
    name = name.slice(0, -7)
  }
  
  if (name.endsWith('Once')) {
    options.once = true
    name = name.slice(0, -4)
  }
  
  if (name.endsWith('Passive')) {
    options.passive = true
    name = name.slice(0, -7)
  }
  
  return [name.toLowerCase(), options]
}

/**
 * 获取事件名
 */
function getEventName(key: string): string {
  // onClick -> click
  return key.slice(2)
}

/**
 * 创建事件调用器
 */
function createInvoker(handler: any): EventListener {
  const invoker = ((event: Event) => {
    // 支持数组形式的处理器
    if (Array.isArray(invoker.value)) {
      for (const h of invoker.value) {
        h(event)
      }
    } else {
      invoker.value(event)
    }
  }) as any
  
  invoker.value = handler
  
  return invoker
}
```

## 属性验证

```typescript
/**
 * 激活单个属性
 */
function hydrateAttr(
  el: Element,
  key: string,
  expected: any,
  tag: string,
  options: HydrateOptions
): void {
  // class
  if (key === 'class') {
    hydrateClass(el, expected, options)
    return
  }
  
  // style
  if (key === 'style') {
    hydrateStyle(el, expected, options)
    return
  }
  
  // 布尔属性
  if (isBooleanAttr(key)) {
    hydrateBooleanAttr(el, key, expected, options)
    return
  }
  
  // DOM 属性
  if (shouldSetAsDOMProp(el, key, expected)) {
    hydrateDOMProp(el, key, expected, options)
    return
  }
  
  // HTML 属性
  hydrateHTMLAttr(el, key, expected, options)
}

/**
 * 激活 class
 */
function hydrateClass(
  el: Element,
  expected: any,
  options: HydrateOptions
): void {
  const normalizedExpected = normalizeClass(expected)
  const actual = el.className
  
  if (normalizedExpected !== actual) {
    // 报告不匹配
    if (options.onMismatch) {
      options.onMismatch({
        type: 'class',
        expected: normalizedExpected,
        actual,
        node: el
      })
    }
    
    // 不在 hydration 时修复 class
    // 因为这可能是 SSR 和 CSR 的预期差异
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `Hydration class mismatch on <${el.tagName.toLowerCase()}>:` +
        `\n  Expected: ${normalizedExpected}` +
        `\n  Actual: ${actual}`
      )
    }
  }
}

/**
 * 激活 style
 */
function hydrateStyle(
  el: Element,
  expected: any,
  options: HydrateOptions
): void {
  const style = (el as HTMLElement).style
  
  if (typeof expected === 'string') {
    // 字符串 style
    if (style.cssText !== expected) {
      reportMismatch(options, 'style', expected, style.cssText, el)
    }
  } else if (typeof expected === 'object') {
    // 对象 style - 检查每个属性
    for (const key in expected) {
      const value = expected[key]
      const prop = hyphenate(key)
      const actual = style.getPropertyValue(prop)
      
      const normalizedValue = normalizeStyleValue(prop, value)
      
      if (actual !== normalizedValue) {
        reportMismatch(options, `style.${key}`, normalizedValue, actual, el)
      }
    }
  }
}

/**
 * 激活布尔属性
 */
function hydrateBooleanAttr(
  el: Element,
  key: string,
  expected: any,
  options: HydrateOptions
): void {
  const hasAttr = el.hasAttribute(key)
  const expectedPresent = !!expected
  
  if (hasAttr !== expectedPresent) {
    reportMismatch(options, key, expectedPresent, hasAttr, el)
  }
}
```

## DOM 属性处理

```typescript
/**
 * 判断是否应设置为 DOM 属性
 */
function shouldSetAsDOMProp(
  el: Element,
  key: string,
  value: any
): boolean {
  // 特殊情况
  if (key === 'spellcheck' || key === 'draggable') {
    return false
  }
  
  // 表单元素
  if (key === 'value' || key === 'checked' || key === 'selected') {
    return true
  }
  
  // 属性存在于元素原型上
  if (key in el) {
    return true
  }
  
  return false
}

/**
 * 激活 DOM 属性
 */
function hydrateDOMProp(
  el: Element,
  key: string,
  expected: any,
  options: HydrateOptions
): void {
  const actual = (el as any)[key]
  
  // 特殊处理 value
  if (key === 'value') {
    const tag = el.tagName.toLowerCase()
    
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      // 表单元素的 value 可能被用户修改
      // 不报告 mismatch，但需要设置初始值
      ;(el as any)[key] = expected
      return
    }
  }
  
  if (actual !== expected) {
    reportMismatch(options, key, expected, actual, el)
    
    // 某些 DOM 属性需要修复
    if (shouldFixDOMProp(key)) {
      ;(el as any)[key] = expected
    }
  }
}

/**
 * 判断是否应修复 DOM 属性
 */
function shouldFixDOMProp(key: string): boolean {
  return key === 'value' || key === 'checked' || key === 'selected'
}

/**
 * 激活 HTML 属性
 */
function hydrateHTMLAttr(
  el: Element,
  key: string,
  expected: any,
  options: HydrateOptions
): void {
  const actual = el.getAttribute(key)
  
  // 处理不同值类型
  let expectedStr: string | null
  
  if (expected === true) {
    expectedStr = ''
  } else if (expected === false || expected == null) {
    expectedStr = null
  } else {
    expectedStr = String(expected)
  }
  
  if (actual !== expectedStr) {
    reportMismatch(options, key, expected, actual, el)
  }
}
```

## 子节点激活

```typescript
/**
 * 激活元素子节点
 */
function hydrateElementChildren(
  el: Element,
  vnode: VNode,
  shapeFlag: number,
  parentComponent: ComponentInstance | null,
  options: HydrateOptions
): void {
  const { children, props } = vnode
  
  // innerHTML
  if (props?.innerHTML) {
    // innerHTML 直接覆盖，不验证
    return
  }
  
  // textContent
  if (props?.textContent) {
    const expected = props.textContent
    if (el.textContent !== expected) {
      reportMismatch(options, 'textContent', expected, el.textContent, el)
      el.textContent = expected
    }
    return
  }
  
  // 文本子节点
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    const expected = String(children)
    if (el.textContent !== expected) {
      reportMismatch(options, 'text', expected, el.textContent, el)
      el.textContent = expected
    }
    return
  }
  
  // 数组子节点
  if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    hydrateChildren(
      el.firstChild,
      children as VNode[],
      el,
      parentComponent,
      options
    )
  }
}

/**
 * 激活子节点列表
 */
function hydrateChildren(
  node: Node | null,
  vnodes: VNode[],
  container: Element,
  parentComponent: ComponentInstance | null,
  options: HydrateOptions
): void {
  for (let i = 0; i < vnodes.length; i++) {
    const vnode = vnodes[i]
    
    // 跳过空白文本节点
    while (node && isIgnorableNode(node)) {
      node = node.nextSibling
    }
    
    if (!node) {
      // 缺少节点，创建
      reportMismatch(options, 'children', vnodes.length, i, container)
      mountVNode(vnode, container)
      continue
    }
    
    // 激活节点
    node = hydrateNode(node, vnode, parentComponent, options)
  }
  
  // 移除多余节点
  while (node) {
    const next = node.nextSibling
    
    if (!isIgnorableNode(node)) {
      reportMismatch(options, 'extra-child', null, node, container)
      container.removeChild(node)
    } else {
      container.removeChild(node)
    }
    
    node = next
  }
}

/**
 * 判断是否为可忽略节点
 */
function isIgnorableNode(node: Node): boolean {
  // 空白文本节点
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || '').trim() === ''
  }
  
  // 注释节点（某些情况）
  if (node.nodeType === Node.COMMENT_NODE) {
    const text = node.textContent || ''
    // hydration 标记注释不忽略
    return !text.startsWith('[') && !text.startsWith(']')
  }
  
  return false
}
```

## 错误报告

```typescript
/**
 * 报告不匹配
 */
function reportMismatch(
  options: HydrateOptions,
  type: string,
  expected: any,
  actual: any,
  node: Node
): void {
  const info: MismatchInfo = {
    type: type as any,
    expected,
    actual,
    node
  }
  
  if (options.onMismatch) {
    options.onMismatch(info)
  }
  
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `Hydration mismatch [${type}]:` +
      `\n  Expected: ${formatValue(expected)}` +
      `\n  Actual: ${formatValue(actual)}` +
      `\n  Node: ${formatNode(node)}`
    )
  }
}

/**
 * 格式化值
 */
function formatValue(value: any): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return `"${value}"`
  return String(value)
}

/**
 * 格式化节点
 */
function formatNode(node: Node): string {
  if (node.nodeType === Node.ELEMENT_NODE) {
    return `<${(node as Element).tagName.toLowerCase()}>`
  }
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || ''
    return `#text "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`
  }
  return `#${node.nodeType}`
}
```

## 使用示例

```typescript
// 基本元素激活
const vnode = h('div', { 
  class: 'container',
  onClick: () => console.log('clicked')
}, [
  h('span', null, 'Hello'),
  h('button', { disabled: true }, 'Click me')
])

const container = document.getElementById('app')!
hydrateElement(container.firstChild!, vnode, null, {
  strict: true,
  onMismatch: (info) => {
    console.log('Mismatch detected:', info)
  }
})

// 验证结果
const mismatches = getHydrationMismatches()
if (mismatches.length > 0) {
  console.warn(`Found ${mismatches.length} hydration mismatches`)
}
```

## 小结

本章实现了元素级别的激活：

1. **标签验证**：确保 DOM 元素匹配
2. **属性激活**：class、style、布尔属性
3. **事件绑定**：添加事件监听器
4. **DOM 属性**：处理表单元素等
5. **子节点激活**：递归处理子元素
6. **错误报告**：详细的不匹配信息

元素激活是 hydration 的核心，正确处理各种属性和事件是关键。
