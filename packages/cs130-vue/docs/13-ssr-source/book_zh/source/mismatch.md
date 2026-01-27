# mismatch 不匹配检测

水合过程中，服务端渲染的 DOM 可能与客户端期望的 VNode 不匹配。Vue 提供了完善的不匹配检测机制，帮助开发者发现和定位问题。

## 为什么会出现不匹配

不匹配的常见原因：

1. **时间敏感数据**：`new Date()` 服务端和客户端不同
2. **随机值**：`Math.random()` 每次不同
3. **浏览器特定 API**：服务端无法访问 `window`、`document`
4. **条件渲染**：基于客户端状态的渲染差异
5. **用户状态**：登录状态在服务端和客户端不同

## 检测类型

```typescript
enum HydrationMismatchType {
  TEXT = 1,           // 文本内容不匹配
  NODE_TYPE = 2,      // 节点类型不匹配
  ATTRIBUTE = 3,      // 属性不匹配
  CHILDREN_COUNT = 4, // 子节点数量不匹配
  TAG = 5             // 标签名不匹配
}
```

## 文本不匹配检测

```typescript
function checkTextMismatch(
  node: Text,
  vnode: VNode
): boolean {
  const expectedText = vnode.children as string
  const actualText = node.textContent || ''
  
  if (expectedText !== actualText) {
    if (__DEV__) {
      warn(
        `Hydration text mismatch:\n` +
        `- Server: "${actualText}"\n` +
        `- Client: "${expectedText}"`
      )
    }
    return true
  }
  
  return false
}
```

## 节点类型不匹配

```typescript
function checkNodeTypeMismatch(
  node: Node,
  vnode: VNode
): boolean {
  const expectedType = vnode.type
  const actualType = node.nodeType
  
  // 期望元素节点
  if (typeof expectedType === 'string') {
    if (actualType !== Node.ELEMENT_NODE) {
      if (__DEV__) {
        warn(
          `Hydration node type mismatch:\n` +
          `- Expected: Element <${expectedType}>\n` +
          `- Actual: ${getNodeTypeName(actualType)}`
        )
      }
      return true
    }
  }
  
  // 期望文本节点
  if (expectedType === Text) {
    if (actualType !== Node.TEXT_NODE) {
      if (__DEV__) {
        warn(
          `Hydration node type mismatch:\n` +
          `- Expected: Text\n` +
          `- Actual: ${getNodeTypeName(actualType)}`
        )
      }
      return true
    }
  }
  
  return false
}

function getNodeTypeName(type: number): string {
  const names: Record<number, string> = {
    [Node.ELEMENT_NODE]: 'Element',
    [Node.TEXT_NODE]: 'Text',
    [Node.COMMENT_NODE]: 'Comment',
    [Node.DOCUMENT_NODE]: 'Document'
  }
  return names[type] || `Unknown(${type})`
}
```

## 标签名不匹配

```typescript
function checkTagMismatch(
  el: Element,
  vnode: VNode
): boolean {
  const expectedTag = (vnode.type as string).toLowerCase()
  const actualTag = el.tagName.toLowerCase()
  
  if (expectedTag !== actualTag) {
    if (__DEV__) {
      warn(
        `Hydration tag mismatch:\n` +
        `- Expected: <${expectedTag}>\n` +
        `- Actual: <${actualTag}>`
      )
    }
    return true
  }
  
  return false
}
```

## 属性不匹配检测

```typescript
function checkPropsMismatch(
  el: Element,
  vnode: VNode
): string[] {
  const mismatched: string[] = []
  const props = vnode.props || {}
  
  for (const key in props) {
    if (isEventKey(key)) continue  // 跳过事件
    
    const expected = props[key]
    const actual = getActualProp(el, key)
    
    if (!isSameValue(expected, actual)) {
      mismatched.push(key)
      
      if (__DEV__) {
        warn(
          `Hydration attribute mismatch for "${key}":\n` +
          `- Server: ${JSON.stringify(actual)}\n` +
          `- Client: ${JSON.stringify(expected)}`
        )
      }
    }
  }
  
  return mismatched
}

function getActualProp(el: Element, key: string): any {
  if (key === 'class') {
    return el.className
  }
  
  if (key === 'style') {
    return (el as HTMLElement).style.cssText
  }
  
  if (key in el) {
    return (el as any)[key]
  }
  
  return el.getAttribute(key)
}
```

## class 不匹配

```typescript
function checkClassMismatch(
  el: Element,
  expected: unknown
): boolean {
  const actualClass = el.className
  const expectedClass = normalizeClass(expected)
  
  // 规范化后比较（忽略空格顺序）
  const actualSet = new Set(actualClass.split(/\s+/).filter(Boolean))
  const expectedSet = new Set(expectedClass.split(/\s+/).filter(Boolean))
  
  if (actualSet.size !== expectedSet.size) {
    return true
  }
  
  for (const cls of expectedSet) {
    if (!actualSet.has(cls)) {
      return true
    }
  }
  
  return false
}
```

## style 不匹配

```typescript
function checkStyleMismatch(
  el: HTMLElement,
  expected: unknown
): boolean {
  const actualStyle = el.style.cssText
  const expectedStyle = stringifyStyle(normalizeStyle(expected))
  
  // 规范化比较
  const actual = parseStyle(actualStyle)
  const exp = parseStyle(expectedStyle)
  
  if (Object.keys(actual).length !== Object.keys(exp).length) {
    return true
  }
  
  for (const key in exp) {
    if (actual[key] !== exp[key]) {
      return true
    }
  }
  
  return false
}

function parseStyle(css: string): Record<string, string> {
  const result: Record<string, string> = {}
  
  css.split(';').forEach(part => {
    const [key, value] = part.split(':').map(s => s.trim())
    if (key && value) {
      result[key] = value
    }
  })
  
  return result
}
```

## 子节点数量不匹配

```typescript
function checkChildrenMismatch(
  el: Element,
  vnode: VNode
): { expected: number; actual: number } | null {
  const children = vnode.children as VNode[]
  const expectedCount = children?.length || 0
  
  // 计算实际子节点（忽略空白文本）
  let actualCount = 0
  let node = el.firstChild
  
  while (node) {
    if (isValidChildNode(node)) {
      actualCount++
    }
    node = node.nextSibling
  }
  
  if (expectedCount !== actualCount) {
    if (__DEV__) {
      warn(
        `Hydration children count mismatch:\n` +
        `- Expected: ${expectedCount}\n` +
        `- Actual: ${actualCount}`
      )
    }
    return { expected: expectedCount, actual: actualCount }
  }
  
  return null
}

function isValidChildNode(node: Node): boolean {
  if (node.nodeType === Node.ELEMENT_NODE) {
    return true
  }
  
  if (node.nodeType === Node.TEXT_NODE) {
    // 忽略纯空白文本
    return !/^\s*$/.test(node.textContent || '')
  }
  
  if (node.nodeType === Node.COMMENT_NODE) {
    // 保留特殊标记
    const text = node.textContent || ''
    return text.startsWith('teleport') || 
           text.startsWith('suspense') ||
           text.startsWith('[')
  }
  
  return false
}
```

## 综合检测函数

```typescript
interface MismatchInfo {
  type: HydrationMismatchType
  expected: any
  actual: any
  path: string
}

function detectMismatch(
  node: Node,
  vnode: VNode,
  path: string = ''
): MismatchInfo[] {
  const mismatches: MismatchInfo[] = []
  
  // 节点类型检测
  if (checkNodeTypeMismatch(node, vnode)) {
    mismatches.push({
      type: HydrationMismatchType.NODE_TYPE,
      expected: getVNodeTypeName(vnode),
      actual: getNodeTypeName(node.nodeType),
      path
    })
    return mismatches // 类型不匹配，无法继续
  }
  
  // 文本节点
  if (vnode.type === Text) {
    if (checkTextMismatch(node as Text, vnode)) {
      mismatches.push({
        type: HydrationMismatchType.TEXT,
        expected: vnode.children,
        actual: node.textContent,
        path
      })
    }
    return mismatches
  }
  
  // 元素节点
  if (typeof vnode.type === 'string') {
    const el = node as Element
    
    // 标签名
    if (checkTagMismatch(el, vnode)) {
      mismatches.push({
        type: HydrationMismatchType.TAG,
        expected: vnode.type,
        actual: el.tagName.toLowerCase(),
        path
      })
    }
    
    // 属性
    const propsMismatch = checkPropsMismatch(el, vnode)
    for (const key of propsMismatch) {
      mismatches.push({
        type: HydrationMismatchType.ATTRIBUTE,
        expected: vnode.props?.[key],
        actual: getActualProp(el, key),
        path: `${path}.${key}`
      })
    }
    
    // 子节点数量
    const childMismatch = checkChildrenMismatch(el, vnode)
    if (childMismatch) {
      mismatches.push({
        type: HydrationMismatchType.CHILDREN_COUNT,
        expected: childMismatch.expected,
        actual: childMismatch.actual,
        path
      })
    }
  }
  
  return mismatches
}
```

## 开发环境警告

```typescript
function logMismatchWarning(mismatches: MismatchInfo[]) {
  if (!__DEV__ || mismatches.length === 0) return
  
  const grouped = groupByType(mismatches)
  
  console.group('[Vue Hydration Mismatch]')
  
  for (const [type, items] of Object.entries(grouped)) {
    console.groupCollapsed(`${type} (${items.length})`)
    
    for (const item of items) {
      console.log(
        `Path: ${item.path}\n` +
        `Expected: ${JSON.stringify(item.expected)}\n` +
        `Actual: ${JSON.stringify(item.actual)}`
      )
    }
    
    console.groupEnd()
  }
  
  console.groupEnd()
}
```

## 定位问题代码

```typescript
function getComponentTrace(
  vnode: VNode
): string[] {
  const trace: string[] = []
  let current: VNode | null = vnode
  
  while (current) {
    if (current.component) {
      const name = getComponentName(current.component.type)
      if (name) {
        trace.unshift(name)
      }
    }
    current = current.parent || null
  }
  
  return trace
}

function logWithTrace(
  mismatch: MismatchInfo,
  vnode: VNode
) {
  const trace = getComponentTrace(vnode)
  
  console.warn(
    `[Vue Hydration Mismatch]\n` +
    `${mismatch.path}\n` +
    `Expected: ${mismatch.expected}\n` +
    `Actual: ${mismatch.actual}\n` +
    `Component trace:\n${trace.map(n => `  <${n}>`).join('\n')}`
  )
}
```

## 忽略特定不匹配

某些不匹配是可接受的：

```typescript
function shouldIgnoreMismatch(
  key: string,
  expected: any,
  actual: any
): boolean {
  // data-v- scoped 样式 ID
  if (key.startsWith('data-v-')) {
    return true
  }
  
  // 空字符串和 null/undefined
  if (!expected && !actual) {
    return true
  }
  
  // 等效的布尔值
  if (typeof expected === 'boolean') {
    if (expected === true && actual === '') return true
    if (expected === false && actual === null) return true
  }
  
  return false
}
```

## 配置选项

```typescript
interface HydrationConfig {
  // 是否启用严格模式
  strict: boolean
  
  // 忽略的属性
  ignoredProps: string[]
  
  // 自定义检测器
  customChecker?: (node: Node, vnode: VNode) => MismatchInfo[]
}

const defaultConfig: HydrationConfig = {
  strict: __DEV__,
  ignoredProps: ['data-v-', 'data-server-rendered'],
  customChecker: undefined
}
```

## 小结

Vue 的不匹配检测机制覆盖了：

1. **节点类型**：Element vs Text vs Comment
2. **标签名**：`<div>` vs `<span>`
3. **属性值**：class、style、其他属性
4. **子节点数量**：期望与实际的差异
5. **文本内容**：文本节点的内容

开发环境下会输出详细的警告信息，帮助快速定位问题。生产环境下可以选择静默修复或抛出错误。
