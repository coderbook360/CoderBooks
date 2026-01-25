# 组件内守卫实现

组件内守卫（`beforeRouteEnter`、`beforeRouteUpdate`、`beforeRouteLeave`）直接定义在组件中，与组件生命周期紧密关联。

## 三种组件内守卫

```typescript
export default {
  beforeRouteEnter(to, from, next) {
    // 进入前，无法访问 this
  },
  
  beforeRouteUpdate(to, from) {
    // 路由参数变化，同一组件复用
  },
  
  beforeRouteLeave(to, from) {
    // 离开前，可以访问 this
  }
}
```

## 提取组件守卫

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

      // 解析组件（可能是异步）
      const component = 'default' in rawComponent 
        ? rawComponent.default 
        : rawComponent

      // 获取守卫
      const guard = (component as any)[guardType]

      if (guard) {
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

## beforeRouteLeave

离开组件前触发，可以阻止导航：

```typescript
export default {
  data() {
    return { hasUnsavedChanges: false }
  },
  
  beforeRouteLeave(to, from) {
    if (this.hasUnsavedChanges) {
      const answer = window.confirm('有未保存的更改，确定离开？')
      if (!answer) return false
    }
  }
}
```

在 navigate 中的执行：

```typescript
function navigate(to, from) {
  const [leavingRecords] = extractChangingRecords(to, from)

  // 反向顺序：子组件先离开
  let guards = extractComponentsGuards(
    leavingRecords.reverse(),
    'beforeRouteLeave',
    to,
    from
  )

  // 加上实例守卫（onBeforeRouteLeave）
  for (const record of leavingRecords) {
    for (const leaveGuard of record.leaveGuards) {
      guards.push(guardToPromiseFn(leaveGuard, to, from))
    }
  }

  return runGuardQueue(guards)
}
```

## beforeRouteUpdate

路由参数变化，但组件复用时触发：

```typescript
// /users/1 → /users/2
// 同一个 UserProfile 组件

export default {
  beforeRouteUpdate(to, from) {
    // this 可用
    this.userData = null
    this.loadUser(to.params.id)
  }
}
```

在 navigate 中：

```typescript
const [, updatingRecords] = extractChangingRecords(to, from)

guards = extractComponentsGuards(
  updatingRecords,
  'beforeRouteUpdate',
  to,
  from
)

// 加上实例守卫
for (const record of updatingRecords) {
  for (const updateGuard of record.updateGuards) {
    guards.push(guardToPromiseFn(updateGuard, to, from))
  }
}
```

## beforeRouteEnter

进入组件前触发，无法访问 `this`：

```typescript
export default {
  beforeRouteEnter(to, from, next) {
    // this 是 undefined
    
    fetchUserData(to.params.id).then(data => {
      // 通过 next 回调访问组件实例
      next(vm => {
        vm.userData = data
      })
    })
  }
}
```

## next 回调的实现

`beforeRouteEnter` 的 next 回调需要特殊处理：

```typescript
function guardToPromiseFn(
  guard: NavigationGuard,
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded,
  record?: RouteRecordNormalized,
  name?: string
) {
  return () => new Promise((resolve, reject) => {
    const next: NavigationGuardNext = (valid) => {
      // 如果是函数，保存为回调
      if (typeof valid === 'function') {
        if (record && name) {
          if (!record.enterCallbacks[name]) {
            record.enterCallbacks[name] = []
          }
          record.enterCallbacks[name].push(valid)
        }
        resolve()
      } else {
        // 其他情况正常处理
        if (valid === false) {
          reject(createRouterError(ErrorTypes.NAVIGATION_ABORTED))
        } else if (isRouteLocation(valid)) {
          reject(createRouterError(ErrorTypes.NAVIGATION_GUARD_REDIRECT, { to: valid }))
        } else {
          resolve()
        }
      }
    }

    // 调用守卫
    const guardReturn = guard(to, from, next)
    
    // 处理返回值
    if (guard.length < 3) {
      Promise.resolve(guardReturn).then(next).catch(reject)
    }
  })
}
```

## 回调执行时机

保存的回调在 RouterView 挂载组件后执行：

```typescript
// RouterView.ts
setup(props) {
  const matchedRouteRef = inject(matchedRouteKey)
  
  return () => {
    const ViewComponent = matchedRoute.components[props.name]
    
    return h(ViewComponent, {
      onVnodeMounted: () => {
        // 执行 beforeRouteEnter 的 next 回调
        const enterCallbacks = matchedRoute.enterCallbacks[props.name]
        if (enterCallbacks) {
          enterCallbacks.forEach(callback => {
            callback(instance)
          })
        }
      }
    })
  }
}
```

## Composition API 守卫

使用 `onBeforeRouteLeave` 和 `onBeforeRouteUpdate`：

```typescript
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'

export default {
  setup() {
    onBeforeRouteLeave((to, from) => {
      // 离开前逻辑
    })

    onBeforeRouteUpdate((to, from) => {
      // 更新时逻辑
    })
  }
}
```

实现：

```typescript
// useApi.ts
export function onBeforeRouteLeave(leaveGuard: NavigationGuard): void {
  const activeRecord = inject(matchedRouteKey)!.value
  
  if (activeRecord) {
    activeRecord.leaveGuards.add(leaveGuard)
    
    // 组件卸载时移除
    onUnmounted(() => {
      activeRecord.leaveGuards.delete(leaveGuard)
    })
  }
}

export function onBeforeRouteUpdate(updateGuard: NavigationGuard): void {
  const activeRecord = inject(matchedRouteKey)!.value
  
  if (activeRecord) {
    activeRecord.updateGuards.add(updateGuard)
    
    onUnmounted(() => {
      activeRecord.updateGuards.delete(updateGuard)
    })
  }
}
```

## 守卫与生命周期的关系

```
beforeRouteEnter
       ↓
  beforeCreate
       ↓
    created
       ↓
  beforeMount
       ↓
   mounted ← 此时执行 next(vm => {}) 回调
       ↓
beforeRouteUpdate (参数变化时)
       ↓
beforeRouteLeave (离开时)
       ↓
  beforeUnmount
       ↓
   unmounted
```

## 本章小结

组件内守卫的实现要点：

1. **提取守卫**：`extractComponentsGuards` 从组件定义中提取
2. **执行顺序**：leave 反向、update 和 enter 正向
3. **next 回调**：`beforeRouteEnter` 的回调保存到 `enterCallbacks`
4. **回调执行**：RouterView 在组件挂载后执行回调
5. **Composition API**：`onBeforeRouteLeave`/`onBeforeRouteUpdate` 注册到路由记录

理解组件内守卫的实现，有助于正确使用它们处理组件级的导航逻辑。
