# ssrRenderSlotInner 插槽内部

本章深入分析 `ssrRenderSlotInner` 的实现，这是插槽渲染的核心逻辑。

## 函数签名

```typescript
// packages/server-renderer/src/helpers/ssrRenderSlot.ts

export function ssrRenderSlotInner(
  slots: Slots,
  slotName: string,
  slotProps: Record<string, any>,
  fallbackRenderFn: (() => void) | null,
  push: PushFn,
  parentComponent: ComponentInternalInstance,
  slotScopeId?: string
): void
```

与 `ssrRenderSlot` 相比，`ssrRenderSlotInner` 去掉了 Fragment 包装逻辑，直接渲染插槽内容。这个函数被 `ssrRenderSlot` 内部调用，也可以在某些场景下直接使用。

## 实现逻辑

```typescript
export function ssrRenderSlotInner(
  slots: Slots,
  slotName: string,
  slotProps: Record<string, any>,
  fallbackRenderFn: (() => void) | null,
  push: PushFn,
  parentComponent: ComponentInternalInstance,
  slotScopeId?: string
): void {
  // 获取插槽函数
  const slotFn = slots[slotName]
  
  if (slotFn) {
    // 设置作用域 ID（用于 scoped CSS）
    const slotBuffer: SSRBufferItem[] = []
    const bufferedPush = (item: SSRBufferItem) => {
      slotBuffer.push(item)
    }
    
    // 执行插槽函数获取 VNode
    const slotContent = slotFn(slotProps)
    
    // 渲染插槽内容
    if (Array.isArray(slotContent)) {
      for (let i = 0; i < slotContent.length; i++) {
        renderVNode(
          bufferedPush,
          slotContent[i],
          parentComponent,
          slotScopeId
        )
      }
    } else if (slotContent != null) {
      renderVNode(
        bufferedPush,
        slotContent,
        parentComponent,
        slotScopeId
      )
    }
    
    // 输出缓冲的内容
    if (slotBuffer.length) {
      push(...slotBuffer)
    }
  } else if (fallbackRenderFn) {
    // 没有插槽内容，渲染回退内容
    fallbackRenderFn()
  }
}
```

这个实现的核心是通过缓冲区收集插槽内容，然后一次性输出。这样做的好处是可以在输出前对内容进行处理，比如添加作用域 ID。

## 作用域 ID 处理

Vue 的 scoped CSS 通过给元素添加唯一的属性来实现样式隔离。在 SSR 中，插槽内容可能来自父组件，但需要应用子组件的 scoped 样式。

```typescript
function applySlotScopeId(
  content: SSRBufferItem[],
  slotScopeId: string
): SSRBufferItem[] {
  // 在每个元素开标签中添加 scope ID
  return content.map(item => {
    if (typeof item === 'string') {
      // 使用正则在开标签中添加属性
      return item.replace(
        /(<[a-z][a-z0-9-]*)/gi,
        `$1 ${slotScopeId}`
      )
    }
    return item
  })
}
```

实际的 Vue 实现更加复杂，需要处理嵌套元素、自闭合标签等情况。这里展示的是简化版本。

## 异步插槽

插槽函数可能返回异步内容，需要特殊处理。

```typescript
async function ssrRenderSlotInnerAsync(
  slots: Slots,
  slotName: string,
  slotProps: Record<string, any>,
  fallbackRenderFn: (() => void) | null,
  push: PushFn,
  parentComponent: ComponentInternalInstance
): Promise<void> {
  const slotFn = slots[slotName]
  
  if (slotFn) {
    let slotContent = slotFn(slotProps)
    
    // 处理异步插槽
    if (isPromise(slotContent)) {
      slotContent = await slotContent
    }
    
    if (Array.isArray(slotContent)) {
      for (const vnode of slotContent) {
        await renderVNodeAsync(push, vnode, parentComponent)
      }
    } else if (slotContent != null) {
      await renderVNodeAsync(push, slotContent, parentComponent)
    }
  } else if (fallbackRenderFn) {
    fallbackRenderFn()
  }
}
```

## 插槽与 Teleport

当插槽内容包含 Teleport 时，需要特殊处理。Teleport 的内容应该渲染到目标位置，而不是当前位置。

```typescript
function handleTeleportInSlot(
  vnode: VNode,
  push: PushFn,
  parentComponent: ComponentInternalInstance,
  context: SSRContext
): void {
  if (vnode.type === Teleport) {
    const target = vnode.props?.to
    
    if (target) {
      // 将 Teleport 内容添加到 context 中
      if (!context.teleports) {
        context.teleports = {}
      }
      
      const teleportBuffer: SSRBufferItem[] = []
      const teleportPush = (item: SSRBufferItem) => {
        teleportBuffer.push(item)
      }
      
      // 渲染 Teleport 内容到缓冲区
      renderChildren(
        teleportPush,
        vnode.children,
        parentComponent
      )
      
      // 存储到 context
      const existing = context.teleports[target]
      context.teleports[target] = existing
        ? existing + teleportBuffer.join('')
        : teleportBuffer.join('')
    }
    
    // 在原位置渲染占位符
    push('<!--teleport start--><!--teleport end-->')
  } else {
    renderVNode(push, vnode, parentComponent)
  }
}
```

## 性能优化

对于静态插槽内容，可以进行缓存优化。

```typescript
const slotCache = new WeakMap<
  ComponentInternalInstance,
  Map<string, string>
>()

function ssrRenderSlotWithCache(
  slots: Slots,
  slotName: string,
  slotProps: Record<string, any>,
  push: PushFn,
  parentComponent: ComponentInternalInstance
): void {
  // 检查是否为静态插槽
  const slotFn = slots[slotName]
  if (!slotFn || slotFn._static) {
    // 尝试从缓存获取
    let cache = slotCache.get(parentComponent)
    if (!cache) {
      cache = new Map()
      slotCache.set(parentComponent, cache)
    }
    
    const cacheKey = slotName
    const cached = cache.get(cacheKey)
    
    if (cached) {
      push(cached)
      return
    }
    
    // 渲染并缓存
    const buffer: string[] = []
    ssrRenderSlotInner(
      slots,
      slotName,
      slotProps,
      null,
      (item) => buffer.push(String(item)),
      parentComponent
    )
    
    const result = buffer.join('')
    cache.set(cacheKey, result)
    push(result)
    return
  }
  
  // 非静态插槽，正常渲染
  ssrRenderSlotInner(slots, slotName, slotProps, null, push, parentComponent)
}
```

## 小结

本章深入分析了 `ssrRenderSlotInner` 的实现：

1. **核心逻辑**：执行插槽函数、渲染内容、处理回退
2. **作用域 ID**：确保 scoped CSS 正确应用
3. **异步处理**：支持异步插槽内容
4. **Teleport 处理**：正确处理插槽中的 Teleport
5. **性能优化**：静态插槽缓存

理解插槽内部实现有助于优化组件设计和排查渲染问题。
