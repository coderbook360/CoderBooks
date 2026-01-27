# mismatchHandling 不匹配处理

检测到水合不匹配后，Vue 提供了多种处理策略。正确的处理方式既能保证应用正常运行，又能在开发阶段帮助发现问题。

## 处理策略

```typescript
enum MismatchStrategy {
  WARN = 'warn',       // 警告并继续
  FIX = 'fix',         // 修复不匹配
  BAIL = 'bail',       // 放弃水合，重新渲染
  ERROR = 'error'      // 抛出错误
}
```

## 默认处理行为

```typescript
function handleMismatch(
  node: Node,
  vnode: VNode,
  mismatchType: HydrationMismatchType,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  if (__DEV__) {
    // 开发环境：警告
    logMismatchWarning(node, vnode, mismatchType)
  }
  
  // 根据类型决定策略
  switch (mismatchType) {
    case HydrationMismatchType.TEXT:
      return handleTextMismatch(node, vnode)
      
    case HydrationMismatchType.ATTRIBUTE:
      return handleAttributeMismatch(node as Element, vnode)
      
    case HydrationMismatchType.NODE_TYPE:
    case HydrationMismatchType.TAG:
      return handleNodeMismatch(node, vnode, parentComponent)
      
    case HydrationMismatchType.CHILDREN_COUNT:
      return handleChildrenMismatch(node as Element, vnode, parentComponent)
  }
}
```

## 文本不匹配修复

最简单的情况，直接更新文本内容：

```typescript
function handleTextMismatch(
  node: Node,
  vnode: VNode
): Node {
  const expectedText = vnode.children as string
  
  // 直接更新文本
  node.textContent = expectedText
  
  // 保持节点引用
  vnode.el = node
  
  return node.nextSibling!
}
```

## 属性不匹配修复

```typescript
function handleAttributeMismatch(
  el: Element,
  vnode: VNode
): Node {
  const props = vnode.props || {}
  
  // 修复 class
  if (props.class !== undefined) {
    el.className = normalizeClass(props.class)
  }
  
  // 修复 style
  if (props.style !== undefined) {
    const style = normalizeStyle(props.style)
    for (const key in style) {
      ;(el as HTMLElement).style.setProperty(key, style[key])
    }
  }
  
  // 修复其他属性
  for (const key in props) {
    if (key === 'class' || key === 'style') continue
    if (isEventKey(key)) continue
    
    patchAttr(el, key, props[key])
  }
  
  vnode.el = el
  return el.nextSibling!
}

function patchAttr(el: Element, key: string, value: any) {
  if (value === null || value === false) {
    el.removeAttribute(key)
  } else if (value === true) {
    el.setAttribute(key, '')
  } else {
    el.setAttribute(key, String(value))
  }
}
```

## 节点类型不匹配 - 放弃水合

节点类型完全不匹配时，放弃水合该节点，重新渲染：

```typescript
function handleNodeMismatch(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  const parent = node.parentElement!
  const anchor = node.nextSibling
  
  // 移除不匹配的 DOM 节点
  parent.removeChild(node)
  
  // 重新渲染
  patch(
    null,           // 无旧节点
    vnode,          // 新 VNode
    parent,         // 容器
    anchor,         // 锚点
    parentComponent,
    null,
    false
  )
  
  return vnode.el?.nextSibling || null
}
```

## 子节点不匹配处理

```typescript
function handleChildrenMismatch(
  el: Element,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node {
  const expectedChildren = (vnode.children || []) as VNode[]
  const actualChildren = Array.from(el.childNodes)
    .filter(isValidChildNode)
  
  const expectedCount = expectedChildren.length
  const actualCount = actualChildren.length
  
  if (expectedCount > actualCount) {
    // 服务端少了节点，客户端需要添加
    appendMissingChildren(el, expectedChildren, actualCount, parentComponent)
  } else if (expectedCount < actualCount) {
    // 服务端多了节点，移除多余的
    removeExtraChildren(el, actualChildren, expectedCount)
  }
  
  vnode.el = el
  return el.nextSibling!
}

function appendMissingChildren(
  container: Element,
  children: VNode[],
  startIndex: number,
  parentComponent: ComponentInternalInstance | null
) {
  for (let i = startIndex; i < children.length; i++) {
    patch(
      null,
      children[i],
      container,
      null,
      parentComponent,
      null,
      false
    )
  }
}

function removeExtraChildren(
  container: Element,
  children: Node[],
  keepCount: number
) {
  for (let i = keepCount; i < children.length; i++) {
    container.removeChild(children[i])
  }
}
```

## 组件级放弃水合

当组件水合失败时，放弃整个组件：

```typescript
function bailoutHydration(
  instance: ComponentInternalInstance
) {
  const container = instance.vnode.el?.parentElement
  const anchor = instance.vnode.el?.nextSibling
  
  if (!container) return
  
  // 标记为非水合模式
  instance.isHydrating = false
  
  // 清除现有 DOM
  while (container.firstChild && container.firstChild !== anchor) {
    container.removeChild(container.firstChild)
  }
  
  // 重新挂载
  const vnode = instance.vnode
  patch(null, vnode, container, anchor)
  
  if (__DEV__) {
    warn(
      `Hydration failed for component <${getComponentName(instance.type)}>. ` +
      `Falling back to client-side rendering.`
    )
  }
}
```

## 严格模式

生产环境可以启用严格模式，遇到不匹配直接抛出错误：

```typescript
function handleMismatchStrict(
  node: Node,
  vnode: VNode,
  mismatchType: HydrationMismatchType
): never {
  const info = getMismatchInfo(node, vnode, mismatchType)
  
  throw new HydrationMismatchError(
    `Hydration mismatch: ${info.message}`,
    info
  )
}

class HydrationMismatchError extends Error {
  constructor(
    message: string,
    public info: MismatchInfo
  ) {
    super(message)
    this.name = 'HydrationMismatchError'
  }
}
```

## 自定义处理器

允许应用自定义不匹配处理：

```typescript
interface HydrationMismatchHandler {
  (
    node: Node,
    vnode: VNode,
    type: HydrationMismatchType,
    info: MismatchInfo
  ): 'fix' | 'bail' | 'ignore'
}

const app = createSSRApp(App)

app.config.hydrationMismatchHandler = (node, vnode, type, info) => {
  // 时间戳相关的属性，忽略不匹配
  if (info.key === 'data-timestamp') {
    return 'ignore'
  }
  
  // 用户相关内容，放弃水合
  if (info.path.includes('user-profile')) {
    return 'bail'
  }
  
  // 其他情况，修复
  return 'fix'
}
```

## 增量修复策略

对于大型应用，可以采用增量修复：

```typescript
function incrementalFix(
  mismatches: MismatchInfo[],
  maxFixPerFrame: number = 10
) {
  let index = 0
  
  function fixBatch() {
    const batch = mismatches.slice(index, index + maxFixPerFrame)
    
    for (const mismatch of batch) {
      applyFix(mismatch)
    }
    
    index += batch.length
    
    if (index < mismatches.length) {
      requestAnimationFrame(fixBatch)
    }
  }
  
  fixBatch()
}

function applyFix(mismatch: MismatchInfo) {
  const { node, vnode, type } = mismatch
  
  switch (type) {
    case HydrationMismatchType.TEXT:
      node.textContent = vnode.children as string
      break
    case HydrationMismatchType.ATTRIBUTE:
      patchAttr(node as Element, mismatch.key!, mismatch.expected)
      break
  }
}
```

## 静默水合模式

某些场景下需要静默处理不匹配：

```typescript
function silentHydrate(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  // 保存原有的警告函数
  const originalWarn = console.warn
  
  // 临时禁用警告
  if (!__DEV__) {
    console.warn = () => {}
  }
  
  try {
    return hydrateNode(node, vnode, parentComponent, false)
  } finally {
    console.warn = originalWarn
  }
}
```

## 部分放弃策略

只放弃不匹配的部分：

```typescript
function partialBailout(
  container: Element,
  vnode: VNode,
  mismatchedPaths: Set<string>
) {
  const children = vnode.children as VNode[]
  let node = container.firstChild
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const path = `${i}`
    
    if (mismatchedPaths.has(path)) {
      // 这个子节点不匹配，重新渲染
      const anchor = node?.nextSibling || null
      if (node) {
        container.removeChild(node)
      }
      patch(null, child, container, anchor)
      node = child.el?.nextSibling || null
    } else {
      // 正常水合
      if (node) {
        node = hydrateNode(node, child, null, false)
      }
    }
  }
}
```

## 恢复机制

提供完整的恢复流程：

```typescript
async function recoverFromMismatch(
  instance: ComponentInternalInstance
) {
  // 1. 标记恢复状态
  instance.isRecovering = true
  
  // 2. 保存当前状态
  const currentState = captureState(instance)
  
  // 3. 放弃水合
  bailoutHydration(instance)
  
  // 4. 等待下一帧
  await nextTick()
  
  // 5. 恢复状态
  restoreState(instance, currentState)
  
  // 6. 完成恢复
  instance.isRecovering = false
  
  if (__DEV__) {
    console.log(`Component <${getComponentName(instance.type)}> recovered from hydration mismatch`)
  }
}

function captureState(instance: ComponentInternalInstance): any {
  return {
    props: { ...instance.props },
    data: instance.data ? { ...instance.data } : null,
    refs: { ...instance.refs }
  }
}
```

## 监控和上报

```typescript
function setupMismatchReporting(app: App) {
  const mismatches: MismatchInfo[] = []
  
  app.config.hydrationMismatchHandler = (node, vnode, type, info) => {
    mismatches.push(info)
    return 'fix'
  }
  
  // 水合完成后上报
  onHydrationComplete(() => {
    if (mismatches.length > 0) {
      reportToAnalytics({
        type: 'hydration_mismatch',
        count: mismatches.length,
        details: mismatches.map(m => ({
          type: m.type,
          path: m.path
        }))
      })
    }
  })
}
```

## 小结

Vue 的不匹配处理提供了灵活的策略：

1. **修复**：更新 DOM 使其与 VNode 一致
2. **放弃**：移除不匹配的节点，重新渲染
3. **忽略**：对于可接受的差异，保持现状
4. **错误**：严格模式下直接抛出异常

选择合适的策略需要权衡用户体验和开发效率，开发环境应该暴露问题，生产环境需要优雅降级。
