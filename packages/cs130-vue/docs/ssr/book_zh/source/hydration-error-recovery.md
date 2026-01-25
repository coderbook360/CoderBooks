# 水合错误恢复

本章分析 Vue hydration 中的错误恢复机制。

## 恢复策略

不同类型的错误需要不同的恢复策略。

```typescript
// packages/runtime-core/src/hydration.ts

/**
 * 恢复策略枚举
 */
enum RecoveryStrategy {
  /**
   * 忽略错误，继续 hydration
   */
  IGNORE = 'ignore',
  
  /**
   * 修补 DOM，保持 hydration
   */
  PATCH = 'patch',
  
  /**
   * 移除并重新创建节点
   */
  RECREATE = 'recreate',
  
  /**
   * 放弃整个子树的 hydration
   */
  BAILOUT = 'bailout'
}

/**
 * 根据错误类型选择恢复策略
 */
function getRecoveryStrategy(
  error: HydrationError,
  options: HydrationOptions
): RecoveryStrategy {
  // 严格模式下直接 bailout
  if (options.strict) {
    return RecoveryStrategy.BAILOUT
  }
  
  switch (error.code) {
    // 结构性错误需要重建
    case HydrationErrorCode.NODE_TYPE_MISMATCH:
    case HydrationErrorCode.TAG_MISMATCH:
      return RecoveryStrategy.RECREATE
    
    // 子节点数量错误可能需要重建
    case HydrationErrorCode.CHILDREN_COUNT_MISMATCH:
      return RecoveryStrategy.RECREATE
    
    // 内容错误可以修补
    case HydrationErrorCode.TEXT_MISMATCH:
    case HydrationErrorCode.ATTRIBUTE_MISMATCH:
    case HydrationErrorCode.CLASS_MISMATCH:
    case HydrationErrorCode.STYLE_MISMATCH:
      return RecoveryStrategy.PATCH
    
    // 多余节点可以移除
    case HydrationErrorCode.EXTRA_NODE:
      return RecoveryStrategy.PATCH
    
    // 缺失节点需要重建
    case HydrationErrorCode.MISSING_NODE:
      return RecoveryStrategy.RECREATE
    
    default:
      return RecoveryStrategy.IGNORE
  }
}
```

## 修补恢复

对于轻微的不匹配，直接修补 DOM 是最高效的恢复方式。

```typescript
/**
 * 执行修补恢复
 */
function executePatchRecovery(
  error: HydrationError,
  vnode: VNode
): void {
  switch (error.code) {
    case HydrationErrorCode.TEXT_MISMATCH:
      patchTextContent(error.node as Text, error.expected)
      break
    
    case HydrationErrorCode.ATTRIBUTE_MISMATCH:
      patchAttribute(error.el!, error.key, error.expected)
      break
    
    case HydrationErrorCode.CLASS_MISMATCH:
      patchClass(error.el!, error.expected)
      break
    
    case HydrationErrorCode.STYLE_MISMATCH:
      patchStyle(error.el! as HTMLElement, error.expected)
      break
    
    case HydrationErrorCode.EXTRA_NODE:
      removeExtraNode(error.node!)
      break
  }
}

/**
 * 修补文本内容
 */
function patchTextContent(node: Text, expected: string): void {
  node.textContent = expected
}

/**
 * 修补属性
 */
function patchAttribute(el: Element, key: string, value: any): void {
  if (value == null || value === false) {
    el.removeAttribute(key)
  } else if (value === true) {
    el.setAttribute(key, '')
  } else {
    el.setAttribute(key, String(value))
  }
}

/**
 * 修补 class
 */
function patchClass(el: Element, value: any): void {
  el.className = normalizeClass(value)
}

/**
 * 修补 style
 */
function patchStyle(el: HTMLElement, value: any): void {
  if (typeof value === 'string') {
    el.style.cssText = value
  } else if (value && typeof value === 'object') {
    for (const key in value) {
      setStyle(el.style, key, value[key])
    }
  }
}

/**
 * 移除多余节点
 */
function removeExtraNode(node: Node): void {
  node.parentNode?.removeChild(node)
}
```

## 重建恢复

当 DOM 结构严重不匹配时，需要移除旧节点并创建新节点。

```typescript
/**
 * 执行重建恢复
 */
function executeRecreateRecovery(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  const parent = node.parentNode!
  const next = node.nextSibling
  
  // 移除不匹配的节点
  parent.removeChild(node)
  
  // 使用 patch 创建新节点
  patch(
    null,           // 旧 vnode
    vnode,          // 新 vnode
    parent,         // 容器
    next,           // 锚点
    parentComponent,
    null,           // suspense
    isSVGContainer(parent)
  )
  
  return next
}

/**
 * 处理子节点重建
 */
function recreateChildren(
  el: Element,
  vnodeChildren: VNode[],
  parentComponent: ComponentInternalInstance | null
): void {
  // 清空现有子节点
  el.innerHTML = ''
  
  // 创建新的子节点
  for (const child of vnodeChildren) {
    patch(
      null,
      child,
      el,
      null,
      parentComponent,
      null,
      isSVGContainer(el)
    )
  }
}
```

## Bailout 恢复

当错误太严重无法恢复时，放弃 hydration 并完全客户端渲染。

```typescript
/**
 * 执行 bailout 恢复
 */
function executeBailoutRecovery(
  container: Element,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): void {
  if (__DEV__) {
    warn(
      `Hydration bailout triggered. ` +
      `The entire subtree will be client-rendered. ` +
      `This may cause visual flickering.`
    )
  }
  
  // 清空容器
  container.innerHTML = ''
  
  // 完全客户端渲染
  patch(
    null,
    vnode,
    container,
    null,
    parentComponent,
    null,
    isSVGContainer(container)
  )
}

/**
 * Bailout 错误类
 */
class HydrationBailoutError extends Error {
  vnode: VNode
  container: Element
  
  constructor(
    message: string,
    vnode: VNode,
    container: Element
  ) {
    super(message)
    this.name = 'HydrationBailoutError'
    this.vnode = vnode
    this.container = container
  }
}
```

## 错误边界

组件可以定义错误边界来捕获和处理 hydration 错误。

```typescript
/**
 * Hydration 错误边界组件
 */
const HydrationErrorBoundary = defineComponent({
  name: 'HydrationErrorBoundary',
  
  props: {
    fallback: {
      type: [Object, Function],
      default: null
    }
  },
  
  setup(props, { slots }) {
    const error = ref<Error | null>(null)
    
    // 捕获 hydration 错误
    onErrorCaptured((err) => {
      if (err instanceof HydrationError || 
          err instanceof HydrationBailoutError) {
        error.value = err
        return false // 阻止向上传播
      }
    })
    
    return () => {
      if (error.value) {
        // 渲染回退内容
        if (typeof props.fallback === 'function') {
          return props.fallback(error.value)
        }
        return props.fallback
      }
      
      return slots.default?.()
    }
  }
})

// 使用示例
// <HydrationErrorBoundary :fallback="h('div', 'Hydration failed')">
//   <MyComponent />
// </HydrationErrorBoundary>
```

## 渐进式恢复

对于大型应用，可以采用渐进式恢复策略。

```typescript
/**
 * 渐进式恢复管理器
 */
class ProgressiveRecovery {
  private pendingRecoveries: Array<() => void> = []
  private isProcessing = false
  
  /**
   * 调度恢复任务
   */
  schedule(recovery: () => void): void {
    this.pendingRecoveries.push(recovery)
    
    if (!this.isProcessing) {
      this.process()
    }
  }
  
  /**
   * 处理恢复任务
   */
  private async process(): Promise<void> {
    this.isProcessing = true
    
    while (this.pendingRecoveries.length > 0) {
      const recovery = this.pendingRecoveries.shift()!
      
      // 使用 requestIdleCallback 避免阻塞主线程
      await new Promise<void>(resolve => {
        requestIdleCallback(() => {
          recovery()
          resolve()
        })
      })
    }
    
    this.isProcessing = false
  }
}
```

## 小结

本章分析了 hydration 错误恢复机制：

1. **恢复策略**：忽略、修补、重建、放弃
2. **修补恢复**：直接修改 DOM 属性
3. **重建恢复**：移除并重新创建节点
4. **Bailout 恢复**：完全客户端渲染
5. **错误边界**：组件级错误处理
6. **渐进式恢复**：避免阻塞主线程

完善的错误恢复机制确保了 SSR 应用的健壮性。
