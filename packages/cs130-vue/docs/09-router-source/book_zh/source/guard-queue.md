# 守卫执行队列

Vue Router 的导航守卫按特定顺序执行，形成一个异步队列。理解这个队列的实现，有助于调试复杂的守卫逻辑。

## 守卫执行顺序

```
1. beforeRouteLeave (离开组件)
2. beforeEach (全局)
3. beforeRouteUpdate (复用组件)
4. beforeEnter (路由配置)
5. 解析异步组件
6. beforeRouteEnter (进入组件)
7. beforeResolve (全局)
8. 导航确认
9. afterEach (全局)
```

## navigate 函数结构

```typescript
function navigate(
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded
): Promise<NavigationFailure | void> {
  
  // 1. 分类路由记录
  const [leavingRecords, updatingRecords, enteringRecords] = 
    extractChangingRecords(to, from)

  // 2. 构建执行链
  return Promise.resolve()
    .then(() => runLeaveGuards())
    .then(() => runBeforeEachGuards())
    .then(() => runUpdateGuards())
    .then(() => runBeforeEnterGuards())
    .then(() => resolveAsyncComponents())
    .then(() => runBeforeRouteEnterGuards())
    .then(() => runBeforeResolveGuards())
}
```

## extractChangingRecords

首先分类哪些组件离开、更新、进入：

```typescript
function extractChangingRecords(
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded
): [RouteRecordNormalized[], RouteRecordNormalized[], RouteRecordNormalized[]] {
  const leavingRecords: RouteRecordNormalized[] = []
  const updatingRecords: RouteRecordNormalized[] = []
  const enteringRecords: RouteRecordNormalized[] = []

  const len = Math.max(from.matched.length, to.matched.length)
  
  for (let i = 0; i < len; i++) {
    const recordFrom = from.matched[i]
    
    if (recordFrom) {
      // 目标路由中有相同记录：更新
      if (to.matched.find(record => isSameRouteRecord(record, recordFrom))) {
        updatingRecords.push(recordFrom)
      } else {
        // 目标路由中没有：离开
        leavingRecords.push(recordFrom)
      }
    }

    const recordTo = to.matched[i]
    if (recordTo) {
      // 来源路由中没有：进入
      if (!from.matched.find(record => isSameRouteRecord(record, recordTo))) {
        enteringRecords.push(recordTo)
      }
    }
  }

  return [leavingRecords, updatingRecords, enteringRecords]
}
```

示例：

```typescript
// 从 /admin/users 到 /admin/settings
// from.matched: [AdminLayout, AdminUsers]
// to.matched:   [AdminLayout, AdminSettings]

// leavingRecords:  [AdminUsers]
// updatingRecords: [AdminLayout]
// enteringRecords: [AdminSettings]
```

## runGuardQueue

执行守卫数组：

```typescript
function runGuardQueue(guards: NavigationGuard[]): Promise<void> {
  return guards.reduce(
    (promise, guard) => promise.then(() => guard()),
    Promise.resolve()
  )
}
```

每个守卫返回 Promise，链式执行。任何一个失败会中断整个链。

## guardToPromiseFn

将守卫转换为返回 Promise 的函数：

```typescript
function guardToPromiseFn(
  guard: NavigationGuard,
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded,
  record?: RouteRecordNormalized,
  name?: string
): () => Promise<void> {
  return () => new Promise((resolve, reject) => {
    // 调用守卫
    const next: NavigationGuardNext = (valid?: NavigationGuardReturn) => {
      if (valid === false) {
        // 阻止导航
        reject(createRouterError(ErrorTypes.NAVIGATION_ABORTED, { from, to }))
      } else if (valid instanceof Error) {
        // 抛出错误
        reject(valid)
      } else if (isRouteLocation(valid)) {
        // 重定向
        reject(createRouterError(ErrorTypes.NAVIGATION_GUARD_REDIRECT, { 
          from: to, 
          to: valid 
        }))
      } else {
        // 继续
        resolve()
      }
    }

    // 执行守卫，获取返回值
    const guardReturn = guard(to, from, next)

    // 支持 Promise 返回值
    let guardPromise = Promise.resolve(guardReturn)

    if (guard.length < 3) {
      // 没有 next 参数，使用返回值
      guardPromise = guardPromise.then(next as any)
    }

    // 处理返回的 Promise
    guardPromise.catch(err => reject(err))
  })
}
```

支持两种写法：

```typescript
// 使用 next
router.beforeEach((to, from, next) => {
  if (auth.check()) next()
  else next('/login')
})

// 使用返回值
router.beforeEach((to, from) => {
  if (!auth.check()) return '/login'
  // 不返回值表示继续
})
```

## extractComponentsGuards

从组件中提取守卫：

```typescript
function extractComponentsGuards(
  matched: RouteRecordNormalized[],
  guardType: 'beforeRouteEnter' | 'beforeRouteUpdate' | 'beforeRouteLeave',
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded
): NavigationGuard[] {
  const guards: NavigationGuard[] = []

  for (const record of matched) {
    for (const name in record.components) {
      const rawComponent = record.components[name]

      // 处理已解析的组件
      const component = 'default' in rawComponent 
        ? rawComponent.default 
        : rawComponent

      const guard = component[guardType]

      if (guard) {
        // 确保守卫是数组形式
        const guardList = Array.isArray(guard) ? guard : [guard]
        
        for (const g of guardList) {
          guards.push(guardToPromiseFn(g, to, from, record, name))
        }
      }
    }
  }

  return guards
}
```

## 各阶段详细实现

**beforeRouteLeave**：

```typescript
// 反向顺序：子组件先离开
guards = extractComponentsGuards(
  leavingRecords.reverse(),
  'beforeRouteLeave',
  to,
  from
)

// 加上实例上注册的守卫
for (const record of leavingRecords) {
  for (const guard of record.leaveGuards) {
    guards.push(guardToPromiseFn(guard, to, from))
  }
}
```

**beforeEach**：

```typescript
guards = []
for (const guard of beforeGuards.list()) {
  guards.push(guardToPromiseFn(guard, to, from))
}
```

**beforeRouteUpdate**：

```typescript
guards = extractComponentsGuards(
  updatingRecords,
  'beforeRouteUpdate',
  to,
  from
)

// 加上实例守卫
for (const record of updatingRecords) {
  for (const guard of record.updateGuards) {
    guards.push(guardToPromiseFn(guard, to, from))
  }
}
```

**beforeEnter**：

```typescript
guards = []
for (const record of to.matched) {
  // 只对新进入的路由执行
  if (record.beforeEnter && !from.matched.includes(record)) {
    const guardList = Array.isArray(record.beforeEnter) 
      ? record.beforeEnter 
      : [record.beforeEnter]
    
    for (const guard of guardList) {
      guards.push(guardToPromiseFn(guard, to, from))
    }
  }
}
```

**beforeRouteEnter**：

```typescript
// 先解析异步组件
await Promise.all(
  enteringRecords.map(record => {
    return Promise.all(
      Object.keys(record.components).map(name => {
        const rawComponent = record.components[name]
        
        if (typeof rawComponent === 'function') {
          // 异步组件
          return rawComponent().then(resolved => {
            record.components[name] = resolved
          })
        }
      })
    )
  })
)

// 然后提取守卫
guards = extractComponentsGuards(
  enteringRecords,
  'beforeRouteEnter',
  to,
  from
)
```

## beforeRouteEnter 的特殊性

这个守卫访问不到组件实例，需要通过 next 回调：

```typescript
{
  beforeRouteEnter(to, from, next) {
    // this 是 undefined
    next(vm => {
      // 在这里访问 vm
    })
  }
}
```

实现方式是保存回调：

```typescript
function guardToPromiseFn(guard, to, from, record, name) {
  return () => new Promise((resolve, reject) => {
    const next = (valid) => {
      if (typeof valid === 'function') {
        // 保存回调，导航完成后调用
        if (!record.enterCallbacks[name]) {
          record.enterCallbacks[name] = []
        }
        record.enterCallbacks[name].push(valid)
      }
      resolve()
    }
    // ...
  })
}
```

导航完成后，RouterView 会调用这些回调：

```typescript
// RouterView 中
onMounted(() => {
  if (matchedRouteRef.value?.enterCallbacks[props.name]) {
    matchedRouteRef.value.enterCallbacks[props.name].forEach(
      callback => callback(instance)
    )
  }
})
```

## 本章小结

守卫执行队列的实现要点：

1. **分类记录**：将路由记录分为离开、更新、进入三类
2. **Promise 链**：所有守卫通过 `reduce` 串联执行
3. **统一适配**：`guardToPromiseFn` 统一处理 next 和返回值
4. **组件提取**：从组件定义中提取守卫
5. **beforeRouteEnter 特殊**：通过回调数组传递组件实例

理解这个队列有助于调试守卫执行顺序问题。
