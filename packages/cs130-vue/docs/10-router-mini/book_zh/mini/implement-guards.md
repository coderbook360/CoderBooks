# 实现导航守卫

导航守卫是路由系统的核心扩展机制，它允许在路由切换的各个阶段插入自定义逻辑。

## 守卫的类型

Vue Router 有三类守卫：全局守卫作用于所有导航，路由守卫定义在路由配置中，组件守卫定义在组件内部。它们的执行顺序是固定的：beforeEach → beforeRouteLeave → beforeRouteUpdate → beforeEnter → beforeRouteEnter → beforeResolve → 导航确认 → afterEach。

## 守卫注册器

首先实现守卫的注册和管理：

```typescript
// guards/registry.ts
import type { NavigationGuard, NavigationHookAfter } from '../types'

export interface GuardRegistry {
  beforeEach: NavigationGuard[]
  beforeResolve: NavigationGuard[]
  afterEach: NavigationHookAfter[]
}

export function createGuardRegistry(): GuardRegistry {
  return {
    beforeEach: [],
    beforeResolve: [],
    afterEach: []
  }
}

export function registerGuard<T extends NavigationGuard | NavigationHookAfter>(
  list: T[],
  guard: T
): () => void {
  list.push(guard)
  
  // 返回取消函数
  return () => {
    const index = list.indexOf(guard)
    if (index > -1) {
      list.splice(index, 1)
    }
  }
}
```

注册函数返回取消函数，这样守卫可以在组件卸载时自动清理。

## 守卫执行器

执行守卫的核心逻辑：

```typescript
// guards/runner.ts
import type { NavigationGuard, RouteLocation, RouteLocationRaw } from '../types'

export type GuardResult = void | boolean | RouteLocationRaw | Error

export async function runGuardQueue(
  guards: NavigationGuard[],
  to: RouteLocation,
  from: RouteLocation
): Promise<GuardResult> {
  for (const guard of guards) {
    const result = await runGuard(guard, to, from)
    
    // 返回 false 表示取消导航
    if (result === false) {
      return false
    }
    
    // 返回路由对象表示重定向
    if (isRouteLocation(result)) {
      return result
    }
    
    // 返回 Error 表示导航失败
    if (result instanceof Error) {
      return result
    }
    
    // 其他情况继续下一个守卫
  }
  
  // 所有守卫都通过
  return
}

async function runGuard(
  guard: NavigationGuard,
  to: RouteLocation,
  from: RouteLocation
): Promise<GuardResult> {
  return new Promise((resolve, reject) => {
    // 创建 next 函数
    let nextCalled = false
    
    const next = (arg?: boolean | RouteLocationRaw | Error) => {
      if (nextCalled) {
        console.warn('next() called multiple times')
        return
      }
      nextCalled = true
      
      if (arg === undefined || arg === true) {
        resolve()
      } else if (arg === false) {
        resolve(false)
      } else if (arg instanceof Error) {
        reject(arg)
      } else {
        resolve(arg)
      }
    }
    
    // 调用守卫
    try {
      const result = guard(to, from, next)
      
      // 支持 Promise 返回值
      if (result instanceof Promise) {
        result
          .then(res => {
            // 如果 next 没被调用，使用返回值
            if (!nextCalled) {
              if (res === false || isRouteLocation(res)) {
                resolve(res)
              } else {
                resolve()
              }
            }
          })
          .catch(reject)
      } else if (!nextCalled) {
        // 同步返回值
        if (result === false || isRouteLocation(result)) {
          resolve(result)
        } else if (result === undefined) {
          resolve()
        }
      }
    } catch (error) {
      reject(error)
    }
  })
}

function isRouteLocation(val: any): val is RouteLocationRaw {
  return (
    typeof val === 'string' ||
    (typeof val === 'object' && val !== null && (val.path || val.name))
  )
}
```

守卫可以通过三种方式控制导航：调用 next 函数、返回值、抛出异常。runGuard 统一处理这三种情况，确保只有一种生效。

## 路由级守卫

beforeEnter 定义在路由配置中：

```typescript
// guards/routeGuards.ts
import type { RouteRecord, RouteLocation, NavigationGuard } from '../types'

export function extractRouteEnterGuards(
  matched: RouteRecord[],
  to: RouteLocation,
  from: RouteLocation
): NavigationGuard[] {
  const guards: NavigationGuard[] = []
  
  for (const record of matched) {
    // 检查这个路由是否是新进入的
    const isNew = !from.matched.some(r => r === record)
    
    if (isNew && record.beforeEnter) {
      // beforeEnter 可以是数组
      const routeGuards = Array.isArray(record.beforeEnter)
        ? record.beforeEnter
        : [record.beforeEnter]
      
      guards.push(...routeGuards)
    }
  }
  
  return guards
}
```

## 组件守卫

组件内的守卫需要从组件定义中提取：

```typescript
// guards/componentGuards.ts
import type { 
  RouteRecord, 
  RouteLocation, 
  NavigationGuard,
  Component 
} from '../types'

type ComponentGuardName = 
  | 'beforeRouteEnter'
  | 'beforeRouteUpdate'
  | 'beforeRouteLeave'

export function extractComponentGuards(
  matched: RouteRecord[],
  guardName: ComponentGuardName,
  to: RouteLocation,
  from: RouteLocation
): NavigationGuard[] {
  const guards: NavigationGuard[] = []
  
  for (const record of matched) {
    for (const [name, component] of Object.entries(record.components)) {
      const guard = extractGuardFromComponent(component, guardName)
      if (guard) {
        // 包装守卫，绑定组件实例
        guards.push(createGuardWrapper(guard, record, name))
      }
    }
  }
  
  return guards
}

function extractGuardFromComponent(
  component: Component,
  guardName: ComponentGuardName
): NavigationGuard | undefined {
  // 处理异步组件
  if (typeof component === 'function') {
    // 对于 beforeRouteEnter，需要先加载组件
    return undefined // 简化版不处理
  }
  
  // 普通组件
  const options = (component as any)
  return options[guardName]
}

function createGuardWrapper(
  guard: NavigationGuard,
  record: RouteRecord,
  componentName: string
): NavigationGuard {
  return (to, from, next) => {
    // 组件实例通过 matched[x].instances[name] 获取
    // 简化版直接调用
    return guard(to, from, next)
  }
}
```

## Leave 守卫

beforeRouteLeave 需要特殊处理，因为它作用于离开的组件：

```typescript
export function extractLeaveGuards(
  from: RouteLocation,
  to: RouteLocation
): NavigationGuard[] {
  const guards: NavigationGuard[] = []
  
  // 找出要离开的路由记录
  const leavingRecords = from.matched.filter(
    record => !to.matched.includes(record)
  )
  
  // 倒序执行（从子到父）
  for (const record of leavingRecords.reverse()) {
    for (const [name, component] of Object.entries(record.components)) {
      const guard = extractGuardFromComponent(component, 'beforeRouteLeave')
      if (guard) {
        guards.push(guard)
      }
    }
  }
  
  return guards
}
```

## Update 守卫

beforeRouteUpdate 作用于复用的组件：

```typescript
export function extractUpdateGuards(
  to: RouteLocation,
  from: RouteLocation
): NavigationGuard[] {
  const guards: NavigationGuard[] = []
  
  // 找出复用的路由记录
  const reusedRecords = to.matched.filter(record =>
    from.matched.includes(record)
  )
  
  for (const record of reusedRecords) {
    for (const [name, component] of Object.entries(record.components)) {
      const guard = extractGuardFromComponent(component, 'beforeRouteUpdate')
      if (guard) {
        guards.push(guard)
      }
    }
  }
  
  return guards
}
```

## 完整的守卫执行流程

把所有守卫组装起来：

```typescript
// guards/index.ts
import type { RouteLocation, NavigationGuard, NavigationHookAfter } from '../types'
import { runGuardQueue, GuardResult } from './runner'
import { extractRouteEnterGuards } from './routeGuards'
import { 
  extractLeaveGuards, 
  extractUpdateGuards,
  extractComponentGuards 
} from './componentGuards'

export interface GuardQueue {
  beforeEach: NavigationGuard[]
  beforeResolve: NavigationGuard[]
  afterEach: NavigationHookAfter[]
}

export async function runNavigationGuards(
  to: RouteLocation,
  from: RouteLocation,
  guards: GuardQueue
): Promise<GuardResult> {
  // 1. 全局 beforeEach
  let result = await runGuardQueue(guards.beforeEach, to, from)
  if (result !== undefined) return result
  
  // 2. 组件 beforeRouteLeave
  const leaveGuards = extractLeaveGuards(from, to)
  result = await runGuardQueue(leaveGuards, to, from)
  if (result !== undefined) return result
  
  // 3. 组件 beforeRouteUpdate
  const updateGuards = extractUpdateGuards(to, from)
  result = await runGuardQueue(updateGuards, to, from)
  if (result !== undefined) return result
  
  // 4. 路由 beforeEnter
  const enterGuards = extractRouteEnterGuards(to.matched, to, from)
  result = await runGuardQueue(enterGuards, to, from)
  if (result !== undefined) return result
  
  // 5. 组件 beforeRouteEnter（简化版省略）
  
  // 6. 全局 beforeResolve
  result = await runGuardQueue(guards.beforeResolve, to, from)
  if (result !== undefined) return result
  
  // 所有守卫通过
  return
}

export function runAfterEachHooks(
  to: RouteLocation,
  from: RouteLocation,
  hooks: NavigationHookAfter[],
  failure?: Error
): void {
  for (const hook of hooks) {
    hook(to, from, failure)
  }
}
```

## 组合式 API 守卫

onBeforeRouteLeave 和 onBeforeRouteUpdate 作为组合式 API 使用：

```typescript
// composables/guards.ts
import { inject, onUnmounted, getCurrentInstance } from 'vue'
import type { NavigationGuard } from '../types'
import { routerKey, routeKey, matchedRouteKey } from '../router'

export function onBeforeRouteLeave(guard: NavigationGuard): void {
  const instance = getCurrentInstance()
  if (!instance) {
    console.warn('onBeforeRouteLeave must be called inside setup()')
    return
  }
  
  const matchedRoute = inject(matchedRouteKey)
  if (!matchedRoute) {
    console.warn('No matched route found')
    return
  }
  
  // 注册到匹配的路由记录
  const record = matchedRoute.value
  if (record) {
    if (!record.leaveGuards) {
      record.leaveGuards = []
    }
    record.leaveGuards.push(guard)
    
    onUnmounted(() => {
      const index = record.leaveGuards!.indexOf(guard)
      if (index > -1) {
        record.leaveGuards!.splice(index, 1)
      }
    })
  }
}

export function onBeforeRouteUpdate(guard: NavigationGuard): void {
  const instance = getCurrentInstance()
  if (!instance) {
    console.warn('onBeforeRouteUpdate must be called inside setup()')
    return
  }
  
  const matchedRoute = inject(matchedRouteKey)
  if (!matchedRoute) {
    console.warn('No matched route found')
    return
  }
  
  const record = matchedRoute.value
  if (record) {
    if (!record.updateGuards) {
      record.updateGuards = []
    }
    record.updateGuards.push(guard)
    
    onUnmounted(() => {
      const index = record.updateGuards!.indexOf(guard)
      if (index > -1) {
        record.updateGuards!.splice(index, 1)
      }
    })
  }
}
```

## 使用示例

```typescript
// 全局守卫
router.beforeEach((to, from) => {
  // 检查登录状态
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

router.afterEach((to, from, failure) => {
  if (!failure) {
    // 发送页面访问统计
    analytics.trackPageView(to.fullPath)
  }
})

// 路由级守卫
const routes = [
  {
    path: '/admin',
    component: AdminLayout,
    beforeEnter: (to, from) => {
      if (!isAdmin()) {
        return { name: 'forbidden' }
      }
    }
  }
]

// 组件内守卫
export default {
  setup() {
    onBeforeRouteLeave((to, from) => {
      if (hasUnsavedChanges.value) {
        return confirm('确定要离开吗？未保存的更改将丢失。')
      }
    })
    
    onBeforeRouteUpdate((to, from) => {
      // 路由参数变化时重新加载数据
      loadData(to.params.id)
    })
  }
}
```

## 本章小结

导航守卫的实现要点：

1. **类型分类**：全局、路由、组件三类守卫
2. **执行顺序**：严格按照规定顺序执行
3. **控制方式**：next 函数、返回值、异常
4. **结果处理**：false 取消、路由对象重定向、Error 失败
5. **组件守卫**：需要从组件定义中提取
6. **组合式 API**：通过依赖注入实现

守卫机制是路由系统的重要扩展点，理解它的实现有助于正确使用各类守卫。
