# 实现 Hydration 不匹配处理

本章实现 hydration 不匹配的检测、报告和恢复策略。

## 不匹配类型

```typescript
// src/runtime/hydration-mismatch.ts

/**
 * 不匹配类型
 */
export type MismatchType =
  | 'tag'              // 标签名不匹配
  | 'text'             // 文本内容不匹配
  | 'children-count'   // 子节点数量不匹配
  | 'children-type'    // 子节点类型不匹配
  | 'attribute'        // 属性不匹配
  | 'class'            // class 不匹配
  | 'style'            // style 不匹配
  | 'missing-node'     // 缺少节点
  | 'extra-node'       // 多余节点
  | 'component-state'  // 组件状态不匹配

/**
 * 不匹配信息
 */
export interface MismatchInfo {
  type: MismatchType
  expected: any
  actual: any
  node: Node | null
  vnode: VNode | null
  path: string[]
  component?: string
}

/**
 * 不匹配收集器
 */
class MismatchCollector {
  private mismatches: MismatchInfo[] = []
  private path: string[] = []
  
  /**
   * 进入节点
   */
  enter(name: string): void {
    this.path.push(name)
  }
  
  /**
   * 离开节点
   */
  leave(): void {
    this.path.pop()
  }
  
  /**
   * 记录不匹配
   */
  record(info: Omit<MismatchInfo, 'path'>): void {
    this.mismatches.push({
      ...info,
      path: [...this.path]
    })
  }
  
  /**
   * 获取所有不匹配
   */
  getAll(): MismatchInfo[] {
    return [...this.mismatches]
  }
  
  /**
   * 清空
   */
  clear(): void {
    this.mismatches = []
    this.path = []
  }
  
  /**
   * 是否有不匹配
   */
  hasMismatches(): boolean {
    return this.mismatches.length > 0
  }
}

// 全局收集器
const collector = new MismatchCollector()

export { collector }
```

## 不匹配检测

```typescript
/**
 * 检测标签不匹配
 */
export function checkTagMismatch(
  node: Node,
  vnode: VNode
): MismatchInfo | null {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return {
      type: 'tag',
      expected: vnode.type,
      actual: `#${nodeTypeName(node.nodeType)}`,
      node,
      vnode,
      path: []
    }
  }
  
  const el = node as Element
  const expectedTag = (vnode.type as string).toLowerCase()
  const actualTag = el.tagName.toLowerCase()
  
  if (expectedTag !== actualTag) {
    return {
      type: 'tag',
      expected: expectedTag,
      actual: actualTag,
      node,
      vnode,
      path: []
    }
  }
  
  return null
}

/**
 * 检测文本不匹配
 */
export function checkTextMismatch(
  node: Node,
  vnode: VNode
): MismatchInfo | null {
  if (node.nodeType !== Node.TEXT_NODE) {
    return {
      type: 'text',
      expected: 'text node',
      actual: `#${nodeTypeName(node.nodeType)}`,
      node,
      vnode,
      path: []
    }
  }
  
  const expected = String(vnode.children ?? '')
  const actual = node.textContent || ''
  
  if (expected !== actual) {
    return {
      type: 'text',
      expected,
      actual,
      node,
      vnode,
      path: []
    }
  }
  
  return null
}

/**
 * 检测子节点数量不匹配
 */
export function checkChildrenCountMismatch(
  container: Element,
  vnodes: VNode[]
): MismatchInfo | null {
  const actualCount = countSignificantChildren(container)
  const expectedCount = vnodes.length
  
  if (actualCount !== expectedCount) {
    return {
      type: 'children-count',
      expected: expectedCount,
      actual: actualCount,
      node: container,
      vnode: null,
      path: []
    }
  }
  
  return null
}

/**
 * 计算有效子节点数量
 */
function countSignificantChildren(container: Element): number {
  let count = 0
  let node = container.firstChild
  
  while (node) {
    if (!isIgnorableNode(node)) {
      count++
    }
    node = node.nextSibling
  }
  
  return count
}

/**
 * 节点类型名称
 */
function nodeTypeName(type: number): string {
  switch (type) {
    case Node.ELEMENT_NODE: return 'element'
    case Node.TEXT_NODE: return 'text'
    case Node.COMMENT_NODE: return 'comment'
    default: return `node(${type})`
  }
}
```

## 属性不匹配检测

```typescript
/**
 * 检测属性不匹配
 */
export function checkAttrMismatch(
  el: Element,
  props: Record<string, any>
): MismatchInfo[] {
  const mismatches: MismatchInfo[] = []
  
  for (const key in props) {
    if (isReservedProp(key) || isEventKey(key)) continue
    
    const expected = props[key]
    
    // class
    if (key === 'class') {
      const mismatch = checkClassMismatch(el, expected)
      if (mismatch) mismatches.push(mismatch)
      continue
    }
    
    // style
    if (key === 'style') {
      const mismatch = checkStyleMismatch(el, expected)
      if (mismatch) mismatches.push(mismatch)
      continue
    }
    
    // 普通属性
    const mismatch = checkSingleAttrMismatch(el, key, expected)
    if (mismatch) mismatches.push(mismatch)
  }
  
  return mismatches
}

/**
 * 检测 class 不匹配
 */
function checkClassMismatch(
  el: Element,
  expected: any
): MismatchInfo | null {
  const normalizedExpected = normalizeClass(expected)
  const actual = el.className
  
  // 标准化比较
  const expectedSet = new Set(normalizedExpected.split(/\s+/).filter(Boolean))
  const actualSet = new Set(actual.split(/\s+/).filter(Boolean))
  
  // 检查是否相同
  if (expectedSet.size !== actualSet.size) {
    return createAttrMismatch('class', normalizedExpected, actual, el)
  }
  
  for (const cls of expectedSet) {
    if (!actualSet.has(cls)) {
      return createAttrMismatch('class', normalizedExpected, actual, el)
    }
  }
  
  return null
}

/**
 * 检测 style 不匹配
 */
function checkStyleMismatch(
  el: Element,
  expected: any
): MismatchInfo | null {
  const style = (el as HTMLElement).style
  
  if (typeof expected === 'string') {
    // 简单字符串比较
    const normalized = normalizeStyleString(expected)
    const actual = normalizeStyleString(style.cssText)
    
    if (normalized !== actual) {
      return createAttrMismatch('style', expected, style.cssText, el)
    }
  } else if (typeof expected === 'object') {
    // 对象比较
    for (const key in expected) {
      const prop = hyphenate(key)
      const expectedValue = normalizeStyleValue(prop, expected[key])
      const actualValue = style.getPropertyValue(prop)
      
      if (expectedValue !== actualValue) {
        return createAttrMismatch(
          `style.${key}`,
          expectedValue,
          actualValue,
          el
        )
      }
    }
  }
  
  return null
}

/**
 * 检测单个属性不匹配
 */
function checkSingleAttrMismatch(
  el: Element,
  key: string,
  expected: any
): MismatchInfo | null {
  const actual = el.getAttribute(key)
  
  // 布尔属性
  if (typeof expected === 'boolean') {
    const hasAttr = actual !== null
    if (hasAttr !== expected) {
      return createAttrMismatch(key, expected, hasAttr, el)
    }
    return null
  }
  
  // 其他属性
  const expectedStr = expected == null ? null : String(expected)
  
  if (actual !== expectedStr) {
    return createAttrMismatch(key, expected, actual, el)
  }
  
  return null
}

/**
 * 创建属性不匹配信息
 */
function createAttrMismatch(
  key: string,
  expected: any,
  actual: any,
  el: Element
): MismatchInfo {
  return {
    type: key === 'class' ? 'class' : key === 'style' ? 'style' : 'attribute',
    expected,
    actual,
    node: el,
    vnode: null,
    path: []
  }
}
```

## 不匹配报告

```typescript
/**
 * 格式化不匹配信息
 */
export function formatMismatch(info: MismatchInfo): string {
  const lines: string[] = []
  
  lines.push(`[Hydration Mismatch] ${info.type}`)
  lines.push(`  Path: ${info.path.join(' > ') || '<root>'}`)
  lines.push(`  Expected: ${formatValue(info.expected)}`)
  lines.push(`  Actual: ${formatValue(info.actual)}`)
  
  if (info.node) {
    lines.push(`  Node: ${formatNode(info.node)}`)
  }
  
  if (info.component) {
    lines.push(`  Component: ${info.component}`)
  }
  
  return lines.join('\n')
}

/**
 * 格式化值
 */
function formatValue(value: any): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') {
    if (value.length > 50) {
      return `"${value.slice(0, 50)}..."`
    }
    return `"${value}"`
  }
  if (typeof value === 'object') {
    try {
      const json = JSON.stringify(value)
      if (json.length > 100) {
        return json.slice(0, 100) + '...'
      }
      return json
    } catch {
      return '[Object]'
    }
  }
  return String(value)
}

/**
 * 格式化节点
 */
function formatNode(node: Node): string {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element
    let str = `<${el.tagName.toLowerCase()}`
    
    if (el.id) str += ` id="${el.id}"`
    if (el.className) str += ` class="${el.className}"`
    
    return str + '>'
  }
  
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent || '').trim()
    if (text.length > 30) {
      return `#text "${text.slice(0, 30)}..."`
    }
    return `#text "${text}"`
  }
  
  if (node.nodeType === Node.COMMENT_NODE) {
    return `<!--${node.textContent}-->`
  }
  
  return `#node(${node.nodeType})`
}

/**
 * 报告所有不匹配
 */
export function reportAllMismatches(): void {
  const mismatches = collector.getAll()
  
  if (mismatches.length === 0) {
    console.log('✓ Hydration completed without mismatches')
    return
  }
  
  console.group(`⚠ Hydration completed with ${mismatches.length} mismatches`)
  
  for (const mismatch of mismatches) {
    console.warn(formatMismatch(mismatch))
  }
  
  console.groupEnd()
}
```

## 恢复策略

```typescript
/**
 * 不匹配恢复策略
 */
export type RecoveryStrategy =
  | 'ignore'      // 忽略，继续激活
  | 'patch'       // 尝试修补
  | 'recreate'    // 重新创建
  | 'bailout'     // 放弃激活，完全客户端渲染

/**
 * 获取恢复策略
 */
export function getRecoveryStrategy(
  info: MismatchInfo,
  config: HydrationConfig
): RecoveryStrategy {
  // 严格模式下直接放弃
  if (config.strict) {
    return 'bailout'
  }
  
  // 根据不匹配类型决定策略
  switch (info.type) {
    case 'text':
      // 文本不匹配可以修补
      return 'patch'
    
    case 'class':
    case 'style':
      // 样式不匹配通常可以忽略
      return 'ignore'
    
    case 'attribute':
      // 属性不匹配可以修补
      return 'patch'
    
    case 'tag':
      // 标签不匹配需要重建
      return 'recreate'
    
    case 'children-count':
      // 子节点数量不匹配需要重建
      return 'recreate'
    
    case 'missing-node':
    case 'extra-node':
      // 节点缺失或多余可以修补
      return 'patch'
    
    default:
      return 'ignore'
  }
}

/**
 * 执行恢复
 */
export function executeRecovery(
  strategy: RecoveryStrategy,
  node: Node,
  vnode: VNode,
  container: Element
): Node | null {
  switch (strategy) {
    case 'ignore':
      // 继续使用现有节点
      return node.nextSibling
    
    case 'patch':
      // 尝试修补
      return patchMismatch(node, vnode)
    
    case 'recreate':
      // 移除旧节点，创建新节点
      return recreateNode(node, vnode, container)
    
    case 'bailout':
      // 抛出错误，由上层处理
      throw new HydrationBailoutError()
  }
}

/**
 * 修补不匹配
 */
function patchMismatch(node: Node, vnode: VNode): Node | null {
  if (vnode.type === Text) {
    // 修补文本
    node.textContent = String(vnode.children ?? '')
    return node.nextSibling
  }
  
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element
    
    // 修补属性
    if (vnode.props) {
      for (const key in vnode.props) {
        if (isReservedProp(key) || isEventKey(key)) continue
        patchAttr(el, key, vnode.props[key])
      }
    }
    
    return node.nextSibling
  }
  
  return node.nextSibling
}

/**
 * 修补属性
 */
function patchAttr(el: Element, key: string, value: any): void {
  if (key === 'class') {
    el.className = normalizeClass(value)
  } else if (key === 'style') {
    (el as HTMLElement).style.cssText = normalizeStyle(value)
  } else if (typeof value === 'boolean') {
    if (value) {
      el.setAttribute(key, '')
    } else {
      el.removeAttribute(key)
    }
  } else if (value == null) {
    el.removeAttribute(key)
  } else {
    el.setAttribute(key, String(value))
  }
}

/**
 * 重新创建节点
 */
function recreateNode(
  node: Node,
  vnode: VNode,
  container: Element
): Node | null {
  const next = node.nextSibling
  
  // 移除旧节点
  container.removeChild(node)
  
  // 创建新节点
  const newNode = createNode(vnode)
  
  // 插入到正确位置
  if (next) {
    container.insertBefore(newNode, next)
  } else {
    container.appendChild(newNode)
  }
  
  // 返回新节点的下一个兄弟
  return newNode.nextSibling
}

/**
 * Hydration 放弃错误
 */
export class HydrationBailoutError extends Error {
  constructor() {
    super('Hydration bailout')
    this.name = 'HydrationBailoutError'
  }
}
```

## 使用示例

```typescript
// 配置 hydration
const config: HydrationConfig = {
  strict: false,
  onMismatch: (info) => {
    collector.record(info)
    
    // 可以发送到错误追踪服务
    if (process.env.NODE_ENV === 'production') {
      trackHydrationError(info)
    }
  }
}

// 执行 hydration
try {
  hydrate(vnode, container, config)
} catch (error) {
  if (error instanceof HydrationBailoutError) {
    console.warn('Hydration failed, falling back to client render')
    container.innerHTML = ''
    render(vnode, container)
  } else {
    throw error
  }
}

// 检查结果
reportAllMismatches()

// 获取详细信息
const mismatches = collector.getAll()
console.log(`Total mismatches: ${mismatches.length}`)
```

## 小结

本章实现了 hydration 不匹配处理：

1. **不匹配类型**：定义各种不匹配情况
2. **检测机制**：标签、文本、属性、子节点
3. **收集系统**：路径追踪和信息收集
4. **报告格式**：清晰的错误信息
5. **恢复策略**：忽略、修补、重建、放弃
6. **错误处理**：优雅降级

不匹配处理确保了 hydration 的健壮性，即使出现问题也能优雅恢复。
