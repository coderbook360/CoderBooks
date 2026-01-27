# 水合错误类型

本章详细分析 Vue hydration 中的各种错误类型及其特征。

## 错误分类

Hydration 错误可以分为几个主要类别，每类有不同的严重程度和处理方式。

```typescript
// packages/runtime-core/src/errorHandling.ts

/**
 * Hydration 错误代码
 */
export const enum HydrationErrorCode {
  // 结构错误（严重）
  NODE_TYPE_MISMATCH = 'HYDRATION_NODE_TYPE_MISMATCH',
  TAG_MISMATCH = 'HYDRATION_TAG_MISMATCH',
  CHILDREN_COUNT_MISMATCH = 'HYDRATION_CHILDREN_COUNT_MISMATCH',
  
  // 内容错误（可修复）
  TEXT_MISMATCH = 'HYDRATION_TEXT_MISMATCH',
  ATTRIBUTE_MISMATCH = 'HYDRATION_ATTRIBUTE_MISMATCH',
  CLASS_MISMATCH = 'HYDRATION_CLASS_MISMATCH',
  STYLE_MISMATCH = 'HYDRATION_STYLE_MISMATCH',
  
  // 缺失错误
  MISSING_NODE = 'HYDRATION_MISSING_NODE',
  EXTRA_NODE = 'HYDRATION_EXTRA_NODE',
  
  // 特殊节点错误
  TELEPORT_TARGET_MISMATCH = 'HYDRATION_TELEPORT_TARGET',
  SUSPENSE_MISMATCH = 'HYDRATION_SUSPENSE_MISMATCH'
}
```

## 结构性错误

结构性错误是最严重的不匹配类型，通常需要回退到客户端渲染。

```typescript
/**
 * 节点类型不匹配
 */
interface NodeTypeMismatchError {
  code: HydrationErrorCode.NODE_TYPE_MISMATCH
  expectedType: number  // Node.ELEMENT_NODE, Node.TEXT_NODE, etc.
  actualType: number
  vnode: VNode
  node: Node
}

/**
 * 检测节点类型不匹配
 */
function detectNodeTypeMismatch(
  node: Node,
  vnode: VNode
): NodeTypeMismatchError | null {
  const expectedType = getExpectedNodeType(vnode)
  const actualType = node.nodeType
  
  if (expectedType !== actualType) {
    return {
      code: HydrationErrorCode.NODE_TYPE_MISMATCH,
      expectedType,
      actualType,
      vnode,
      node
    }
  }
  
  return null
}

/**
 * 标签名不匹配
 */
interface TagMismatchError {
  code: HydrationErrorCode.TAG_MISMATCH
  expectedTag: string
  actualTag: string
  vnode: VNode
  el: Element
}

/**
 * 检测标签不匹配
 */
function detectTagMismatch(
  el: Element,
  vnode: VNode
): TagMismatchError | null {
  if (typeof vnode.type !== 'string') return null
  
  const expectedTag = vnode.type.toUpperCase()
  const actualTag = el.tagName
  
  if (expectedTag !== actualTag) {
    return {
      code: HydrationErrorCode.TAG_MISMATCH,
      expectedTag: vnode.type,
      actualTag: el.tagName.toLowerCase(),
      vnode,
      el
    }
  }
  
  return null
}
```

## 内容性错误

内容性错误可以通过修补 DOM 来修复，不需要重新渲染。

```typescript
/**
 * 文本内容不匹配
 */
interface TextMismatchError {
  code: HydrationErrorCode.TEXT_MISMATCH
  expected: string
  actual: string
  node: Text
}

/**
 * 属性不匹配
 */
interface AttributeMismatchError {
  code: HydrationErrorCode.ATTRIBUTE_MISMATCH
  key: string
  expected: any
  actual: any
  el: Element
}

/**
 * 收集所有属性不匹配
 */
function collectAttributeMismatches(
  el: Element,
  props: Record<string, any>
): AttributeMismatchError[] {
  const errors: AttributeMismatchError[] = []
  
  for (const key in props) {
    // 跳过事件和保留属性
    if (isReservedProp(key) || isEventProp(key)) continue
    
    const expected = props[key]
    const actual = el.getAttribute(key)
    
    if (!propsEqual(expected, actual)) {
      errors.push({
        code: HydrationErrorCode.ATTRIBUTE_MISMATCH,
        key,
        expected,
        actual,
        el
      })
    }
  }
  
  return errors
}
```

## 子节点错误

子节点数量或类型的不匹配需要特殊处理。

```typescript
/**
 * 子节点数量不匹配
 */
interface ChildrenCountMismatchError {
  code: HydrationErrorCode.CHILDREN_COUNT_MISMATCH
  expectedCount: number
  actualCount: number
  parent: Element
}

/**
 * 缺少节点
 */
interface MissingNodeError {
  code: HydrationErrorCode.MISSING_NODE
  vnode: VNode
  parentEl: Element
  expectedPosition: number
}

/**
 * 多余节点
 */
interface ExtraNodeError {
  code: HydrationErrorCode.EXTRA_NODE
  node: Node
  parentEl: Element
}

/**
 * 检测子节点错误
 */
function detectChildrenErrors(
  el: Element,
  vnodeChildren: VNode[]
): (ChildrenCountMismatchError | MissingNodeError | ExtraNodeError)[] {
  const errors: any[] = []
  
  // 计算有效子节点数量
  const domChildren = Array.from(el.childNodes).filter(
    node => !isIgnorableNode(node)
  )
  
  if (domChildren.length !== vnodeChildren.length) {
    errors.push({
      code: HydrationErrorCode.CHILDREN_COUNT_MISMATCH,
      expectedCount: vnodeChildren.length,
      actualCount: domChildren.length,
      parent: el
    })
  }
  
  // 检测缺失的节点
  if (domChildren.length < vnodeChildren.length) {
    for (let i = domChildren.length; i < vnodeChildren.length; i++) {
      errors.push({
        code: HydrationErrorCode.MISSING_NODE,
        vnode: vnodeChildren[i],
        parentEl: el,
        expectedPosition: i
      })
    }
  }
  
  // 检测多余的节点
  if (domChildren.length > vnodeChildren.length) {
    for (let i = vnodeChildren.length; i < domChildren.length; i++) {
      errors.push({
        code: HydrationErrorCode.EXTRA_NODE,
        node: domChildren[i],
        parentEl: el
      })
    }
  }
  
  return errors
}
```

## 错误报告

```typescript
/**
 * Hydration 错误类
 */
export class HydrationError extends Error {
  code: HydrationErrorCode
  details: Record<string, any>
  
  constructor(
    code: HydrationErrorCode,
    message: string,
    details: Record<string, any> = {}
  ) {
    super(message)
    this.name = 'HydrationError'
    this.code = code
    this.details = details
  }
}

/**
 * 格式化错误信息
 */
function formatHydrationError(error: any): string {
  const lines: string[] = []
  
  switch (error.code) {
    case HydrationErrorCode.NODE_TYPE_MISMATCH:
      lines.push(`Node type mismatch:`)
      lines.push(`  Expected: ${nodeTypeName(error.expectedType)}`)
      lines.push(`  Actual: ${nodeTypeName(error.actualType)}`)
      break
      
    case HydrationErrorCode.TAG_MISMATCH:
      lines.push(`Tag mismatch:`)
      lines.push(`  Expected: <${error.expectedTag}>`)
      lines.push(`  Actual: <${error.actualTag}>`)
      break
      
    case HydrationErrorCode.TEXT_MISMATCH:
      lines.push(`Text content mismatch:`)
      lines.push(`  Expected: "${truncate(error.expected, 50)}"`)
      lines.push(`  Actual: "${truncate(error.actual, 50)}"`)
      break
      
    // ... 其他类型
  }
  
  return lines.join('\n')
}
```

## 错误收集器

```typescript
/**
 * Hydration 错误收集器
 */
class HydrationErrorCollector {
  private errors: HydrationError[] = []
  private maxErrors: number
  
  constructor(maxErrors = 10) {
    this.maxErrors = maxErrors
  }
  
  add(error: HydrationError): void {
    if (this.errors.length < this.maxErrors) {
      this.errors.push(error)
    }
  }
  
  getAll(): HydrationError[] {
    return [...this.errors]
  }
  
  hasErrors(): boolean {
    return this.errors.length > 0
  }
  
  report(): void {
    if (!this.hasErrors()) return
    
    console.group(`Hydration completed with ${this.errors.length} error(s)`)
    
    for (const error of this.errors) {
      console.warn(formatHydrationError(error))
    }
    
    if (this.errors.length >= this.maxErrors) {
      console.warn(`... and potentially more errors (limit: ${this.maxErrors})`)
    }
    
    console.groupEnd()
  }
  
  clear(): void {
    this.errors = []
  }
}
```

## 小结

本章分析了 hydration 错误类型：

1. **结构性错误**：节点类型、标签名不匹配
2. **内容性错误**：文本、属性、样式不匹配
3. **子节点错误**：数量、缺失、多余
4. **错误报告**：格式化的错误信息
5. **错误收集**：批量收集和报告

理解错误类型有助于快速定位和解决 SSR 问题。
