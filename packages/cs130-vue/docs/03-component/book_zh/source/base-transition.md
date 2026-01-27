# BaseTransition 基础

BaseTransition 是 Transition 和 TransitionGroup 的底层实现。它是一个平台无关的过渡组件，不包含任何 DOM 操作，只负责管理过渡状态和钩子调用。

## 设计理念

Vue 3 将过渡逻辑分为两层。BaseTransition 在 runtime-core 中，处理通用的过渡状态管理；Transition 在 runtime-dom 中，处理具体的 CSS 类和 DOM 事件。这种分层让过渡系统可以扩展到其他平台。

## 组件实现

```typescript
const BaseTransitionImpl: ComponentOptions = {
  name: `BaseTransition`,

  props: {
    mode: String,
    appear: Boolean,
    persisted: Boolean,
    // enter
    onBeforeEnter: TransitionHookValidator,
    onEnter: TransitionHookValidator,
    onAfterEnter: TransitionHookValidator,
    onEnterCancelled: TransitionHookValidator,
    // leave
    onBeforeLeave: TransitionHookValidator,
    onLeave: TransitionHookValidator,
    onAfterLeave: TransitionHookValidator,
    onLeaveCancelled: TransitionHookValidator,
    // appear
    onBeforeAppear: TransitionHookValidator,
    onAppear: TransitionHookValidator,
    onAfterAppear: TransitionHookValidator,
    onAppearCancelled: TransitionHookValidator
  },

  setup(props: BaseTransitionProps, { slots }: SetupContext) {
    const instance = getCurrentInstance()!
    const state = useTransitionState()

    let prevTransitionKey: any

    return () => {
      const children = slots.default && getTransitionRawChildren(slots.default(), true)
      
      if (!children || !children.length) {
        return
      }

      let child: VNode = children[0]
      
      if (children.length > 1) {
        // 多个子元素时找到第一个非注释节点
        let hasFound = false
        for (const c of children) {
          if (c.type !== Comment) {
            if (__DEV__ && hasFound) {
              warn('<Transition> can only be used on a single element or component.')
              break
            }
            child = c
            hasFound = true
          }
        }
      }

      const rawProps = toRaw(props)
      const { mode } = rawProps

      if (__DEV__ && mode && mode !== 'in-out' && mode !== 'out-in' && mode !== 'default') {
        warn(`invalid <transition> mode: ${mode}`)
      }

      // 如果正在离开，返回占位符
      if (state.isLeaving) {
        return emptyPlaceholder(child)
      }

      // 获取真实子元素
      const innerChild = getKeepAliveChild(child)
      if (!innerChild) {
        return emptyPlaceholder(child)
      }

      // 设置进入钩子
      const enterHooks = resolveTransitionHooks(
        innerChild,
        rawProps,
        state,
        instance
      )
      setTransitionHooks(innerChild, enterHooks)

      const oldChild = instance.subTree
      const oldInnerChild = oldChild && getKeepAliveChild(oldChild)

      // 处理 key 变化
      let transitionKeyChanged = false
      const { getTransitionKey } = innerChild.type as any
      if (getTransitionKey) {
        const key = getTransitionKey()
        if (prevTransitionKey === undefined) {
          prevTransitionKey = key
        } else if (key !== prevTransitionKey) {
          prevTransitionKey = key
          transitionKeyChanged = true
        }
      }

      // 有旧元素且不是同类型
      if (
        oldInnerChild &&
        oldInnerChild.type !== Comment &&
        (!isSameVNodeType(innerChild, oldInnerChild) || transitionKeyChanged)
      ) {
        const leavingHooks = resolveTransitionHooks(
          oldInnerChild,
          rawProps,
          state,
          instance
        )
        setTransitionHooks(oldInnerChild, leavingHooks)

        // out-in 模式
        if (mode === 'out-in') {
          state.isLeaving = true
          leavingHooks.afterLeave = () => {
            state.isLeaving = false
            if (instance.update.active !== false) {
              instance.update()
            }
          }
          return emptyPlaceholder(child)
        } 
        // in-out 模式
        else if (mode === 'in-out' && innerChild.type !== Comment) {
          leavingHooks.delayLeave = (
            el: TransitionElement,
            earlyRemove,
            delayedLeave
          ) => {
            const leavingVNodesCache = getLeavingNodesForType(
              state,
              oldInnerChild
            )
            leavingVNodesCache[String(oldInnerChild.key)] = oldInnerChild
            el._leaveCb = () => {
              earlyRemove()
              el._leaveCb = undefined
              delete enterHooks.delayedLeave
            }
            enterHooks.delayedLeave = delayedLeave
          }
        }
      }

      return child
    }
  }
}
```

## useTransitionState

管理过渡状态：

```typescript
export function useTransitionState(): TransitionState {
  const state: TransitionState = {
    isMounted: false,
    isLeaving: false,
    isUnmounting: false,
    leavingVNodes: new Map()
  }
  
  onMounted(() => {
    state.isMounted = true
  })
  
  onBeforeUnmount(() => {
    state.isUnmounting = true
  })
  
  return state
}
```

状态用于区分首次渲染、正常更新和卸载阶段。

## getTransitionRawChildren

获取过渡的原始子元素：

```typescript
export function getTransitionRawChildren(
  children: VNode[],
  keepComment: boolean = false,
  parentKey?: VNode['key']
): VNode[] {
  let ret: VNode[] = []
  let keyedFragmentCount = 0
  
  for (let i = 0; i < children.length; i++) {
    let child = children[i]
    
    // 传递父级 key
    if (parentKey != null) {
      child.key = parentKey + String(child.key ?? i)
    }
    
    // 处理 Fragment
    if (child.type === Fragment) {
      if (child.patchFlag & PatchFlags.KEYED_FRAGMENT) keyedFragmentCount++
      ret = ret.concat(
        getTransitionRawChildren(child.children as VNode[], keepComment, child.key)
      )
    } 
    // 保留注释或非注释节点
    else if (keepComment || child.type !== Comment) {
      ret.push(child)
    }
  }
  
  // 检查多个 keyed fragment
  if (keyedFragmentCount > 1) {
    for (let i = 0; i < ret.length; i++) {
      ret[i].patchFlag = PatchFlags.BAIL
    }
  }
  
  return ret
}
```

处理 Fragment 子元素，展平嵌套结构。

## getKeepAliveChild

处理 KeepAlive 包裹的情况：

```typescript
function getKeepAliveChild(vnode: VNode): VNode | undefined {
  return isKeepAlive(vnode)
    ? vnode.component
      ? vnode.component.subTree
      : vnode.children
        ? ((vnode.children as VNodeArrayChildren)[0] as VNode)
        : undefined
    : vnode
}
```

## emptyPlaceholder

创建空占位符：

```typescript
function emptyPlaceholder(vnode: VNode): VNode | undefined {
  if (isKeepAlive(vnode)) {
    vnode = cloneVNode(vnode)
    vnode.children = null
    return vnode
  }
}
```

out-in 模式下，旧元素离开时新元素用占位符代替。

## getLeavingNodesForType

管理离开节点缓存：

```typescript
function getLeavingNodesForType(
  state: TransitionState,
  vnode: VNode
): Record<string, VNode> {
  const { leavingVNodes } = state
  let leavingVNodesCache = leavingVNodes.get(vnode.type)!
  if (!leavingVNodesCache) {
    leavingVNodesCache = Object.create(null)
    leavingVNodes.set(vnode.type, leavingVNodesCache)
  }
  return leavingVNodesCache
}
```

按类型分组缓存离开的节点。

## 钩子验证器

```typescript
const TransitionHookValidator = [Function, Array] as PropType<
  TransitionHookCaller | TransitionHookCaller[]
>
```

钩子可以是单个函数或函数数组。

## 过渡模式实现

```typescript
// out-in：先离开后进入
if (mode === 'out-in') {
  state.isLeaving = true
  leavingHooks.afterLeave = () => {
    state.isLeaving = false
    instance.update()  // 触发重新渲染
  }
  return emptyPlaceholder(child)  // 返回占位符
}

// in-out：先进入后离开
if (mode === 'in-out' && innerChild.type !== Comment) {
  leavingHooks.delayLeave = (el, earlyRemove, delayedLeave) => {
    // 新元素进入完成后再开始离开
    enterHooks.delayedLeave = delayedLeave
  }
}
```

## persisted 属性

用于 KeepAlive 缓存场景：

```typescript
if (transition && !transition.persisted) {
  // 非持久化，执行过渡
} else {
  // 持久化，跳过过渡
}
```

persisted 为 true 时，元素只是隐藏而非真正移除。

## 与渲染器集成

BaseTransition 通过 VNode 的 transition 属性与渲染器交互：

```typescript
// 渲染器中
if (vnode.transition) {
  const hooks = vnode.transition
  hooks.beforeEnter(el)
  // ...
  queuePostRenderEffect(() => {
    hooks.enter(el)
  })
}
```

## 导出

```typescript
export const BaseTransition = BaseTransitionImpl as unknown as {
  new (): {
    $props: BaseTransitionProps<any>
    $slots: TransitionSlots
  }
}

export function resolveTransitionHooks(...): TransitionHooks
export function setTransitionHooks(vnode: VNode, hooks: TransitionHooks): void
export function getTransitionRawChildren(...): VNode[]
```

## 小结

BaseTransition 的核心设计：

1. **平台无关**：不依赖任何 DOM API
2. **状态管理**：通过 useTransitionState 管理过渡状态
3. **模式支持**：实现 out-in 和 in-out 过渡模式
4. **钩子解析**：resolveTransitionHooks 创建钩子对象
5. **渲染器集成**：通过 VNode.transition 传递钩子

这种分层设计使过渡系统具有良好的可扩展性。

下一章将分析 Fragment 组件的实现。
