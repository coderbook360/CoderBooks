# Hydration 不匹配处理

本章分析 Vue hydration 中不匹配情况的检测和处理机制。

## 不匹配类型

Hydration 不匹配可能发生在多个层面，每种类型需要不同的处理策略。

```typescript
// packages/runtime-core/src/hydration.ts

/**
 * 不匹配类型枚举
 */
enum HydrationMismatchType {
  /**
   * 节点类型不匹配
   * 如：期望 Element，实际是 Text
   */
  NODE_TYPE = 'node-type',
  
  /**
   * 标签名不匹配
   * 如：期望 <div>，实际是 <span>
   */
  TAG_NAME = 'tag-name',
  
  /**
   * 文本内容不匹配
   */
  TEXT_CONTENT = 'text',
  
  /**
   * 属性值不匹配
   */
  ATTRIBUTE = 'attribute',
  
  /**
   * class 不匹配
   */
  CLASS = 'class',
  
  /**
   * style 不匹配
   */
  STYLE = 'style',
  
  /**
   * 子节点数量不匹配
   */
  CHILDREN_COUNT = 'children-count',
  
  /**
   * 缺少节点
   */
  MISSING_NODE = 'missing',
  
  /**
   * 多余节点
   */
  EXTRA_NODE = 'extra'
}
```

## 检测机制

```typescript
/**
 * 检测元素属性不匹配
 */
function detectPropMismatch(
  el: Element,
  key: string,
  expected: any,
  isSVG: boolean
): HydrationMismatchInfo | null {
  let actual: any
  let mismatchType: HydrationMismatchType
  
  if (key === 'class') {
    actual = el.className
    expected = normalizeClass(expected)
    mismatchType = HydrationMismatchType.CLASS
    
    // 标准化比较
    const expectedSet = new Set(expected.split(/\s+/).filter(Boolean))
    const actualSet = new Set(actual.split(/\s+/).filter(Boolean))
    
    if (setsEqual(expectedSet, actualSet)) {
      return null
    }
  } else if (key === 'style') {
    actual = (el as HTMLElement).style.cssText
    expected = normalizeStyle(expected)
    mismatchType = HydrationMismatchType.STYLE
    
    // 样式比较需要标准化
    if (normalizeStyleString(expected) === normalizeStyleString(actual)) {
      return null
    }
  } else {
    actual = el.getAttribute(key)
    mismatchType = HydrationMismatchType.ATTRIBUTE
    
    // 布尔属性处理
    if (typeof expected === 'boolean') {
      if ((actual !== null) === expected) {
        return null
      }
    } else {
      if (String(expected) === actual) {
        return null
      }
    }
  }
  
  return {
    type: mismatchType,
    key,
    expected,
    actual,
    el
  }
}

interface HydrationMismatchInfo {
  type: HydrationMismatchType
  key?: string
  expected: any
  actual: any
  el: Element | null
}
```

## 警告系统

```typescript
/**
 * 格式化不匹配警告
 */
function formatMismatchWarning(info: HydrationMismatchInfo): string {
  const lines: string[] = [
    `Hydration ${info.type} mismatch:`
  ]
  
  if (info.key) {
    lines.push(`  Property: ${info.key}`)
  }
  
  lines.push(`  Expected: ${formatValue(info.expected)}`)
  lines.push(`  Actual: ${formatValue(info.actual)}`)
  
  if (info.el) {
    lines.push(`  Element: ${formatElement(info.el)}`)
  }
  
  return lines.join('\n')
}

/**
 * 发出 hydration 警告
 */
function warnHydrationMismatch(info: HydrationMismatchInfo): void {
  if (__DEV__) {
    console.warn(formatMismatchWarning(info))
    
    // 在开发工具中标记
    if ((window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__.emit('hydration:mismatch', info)
    }
  }
}
```

## data-allow-mismatch

Vue 3.5 引入了 `data-allow-mismatch` 属性来抑制预期的不匹配警告。

```typescript
/**
 * 检查是否允许不匹配
 */
function isAllowedMismatch(
  el: Element,
  type: HydrationMismatchType
): boolean {
  // 向上查找 data-allow-mismatch 属性
  let current: Element | null = el
  
  while (current) {
    const attr = current.getAttribute('data-allow-mismatch')
    
    if (attr !== null) {
      // 空值表示允许所有类型
      if (attr === '') return true
      
      // 检查是否包含特定类型
      const types = attr.split(',').map(t => t.trim())
      if (types.includes(type) || types.includes('*')) {
        return true
      }
    }
    
    current = current.parentElement
  }
  
  return false
}

// 使用示例
// <div data-allow-mismatch>...</div>  // 允许所有不匹配
// <div data-allow-mismatch="text">...</div>  // 只允许文本不匹配
// <div data-allow-mismatch="text,class">...</div>  // 允许多种类型
```

## 不匹配修复

```typescript
/**
 * 修复不匹配
 */
function fixMismatch(
  info: HydrationMismatchInfo,
  vnode: VNode
): void {
  const el = info.el
  if (!el) return
  
  switch (info.type) {
    case HydrationMismatchType.TEXT_CONTENT:
      el.textContent = info.expected
      break
      
    case HydrationMismatchType.CLASS:
      el.className = info.expected
      break
      
    case HydrationMismatchType.STYLE:
      (el as HTMLElement).style.cssText = info.expected
      break
      
    case HydrationMismatchType.ATTRIBUTE:
      if (info.expected == null || info.expected === false) {
        el.removeAttribute(info.key!)
      } else {
        el.setAttribute(info.key!, String(info.expected))
      }
      break
  }
}
```

## 严重不匹配处理

某些不匹配无法通过简单修复解决，需要放弃 hydration。

```typescript
/**
 * 处理严重不匹配
 */
function handleSevereMismatch(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  if (__DEV__) {
    warn(
      `Hydration node mismatch. Falling back to client-side rendering for this subtree.\n` +
      `This may cause visual flickering.`
    )
  }
  
  // 获取下一个兄弟节点
  const next = node.nextSibling
  
  // 获取父容器
  const container = node.parentNode!
  
  // 移除不匹配的 DOM
  remove(node)
  
  // 完全客户端渲染
  patch(
    null,
    vnode,
    container,
    next,
    parentComponent,
    null,
    isSVGContainer(container)
  )
  
  return next
}

/**
 * 判断是否为严重不匹配
 */
function isSevereMismatch(type: HydrationMismatchType): boolean {
  return (
    type === HydrationMismatchType.NODE_TYPE ||
    type === HydrationMismatchType.TAG_NAME
  )
}
```

## 小结

本章分析了 hydration 不匹配的处理：

1. **不匹配类型**：节点类型、标签、属性、文本等
2. **检测机制**：比较 DOM 与 VNode
3. **警告系统**：开发环境提示
4. **data-allow-mismatch**：抑制预期不匹配
5. **修复策略**：静默修复轻微不匹配
6. **严重不匹配**：回退到客户端渲染

正确的不匹配处理确保了 hydration 的健壮性。
