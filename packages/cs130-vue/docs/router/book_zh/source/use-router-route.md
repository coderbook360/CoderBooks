# useRouter 与 useRoute

Vue Router 提供两个 Composition API 函数：`useRouter` 返回路由实例，`useRoute` 返回当前路由。

## 基本用法

```typescript
import { useRouter, useRoute } from 'vue-router'

export default {
  setup() {
    const router = useRouter()  // 路由实例
    const route = useRoute()    // 当前路由（响应式）

    function goToUser(id: string) {
      router.push({ name: 'user', params: { id } })
    }

    // route 是响应式的
    watch(
      () => route.params.id,
      (newId) => {
        console.log('User ID changed:', newId)
      }
    )

    return { route, goToUser }
  }
}
```

## useRouter 实现

```typescript
export function useRouter(): Router {
  return inject(routerKey)!
}
```

非常简单，直接从注入中获取路由实例。

路由安装时提供：

```typescript
// createRouter.ts
function install(app: App) {
  app.provide(routerKey, router)
  app.provide(routeLocationKey, reactive({
    ...toRefs(reactive(currentRoute.value))
  }))
}
```

## useRoute 实现

```typescript
export function useRoute(): RouteLocationNormalizedLoaded {
  return inject(routeLocationKey)!
}
```

也是从注入中获取，但返回的是响应式的当前路由。

## 为什么 useRoute 是响应式的

路由变化时更新注入的值：

```typescript
// 路由安装时
const reactiveRoute = reactive({
  ...toRefs(reactive(currentRoute.value))
})

app.provide(routeLocationKey, reactiveRoute)

// 导航完成后
function finalizeNavigation(to) {
  currentRoute.value = to
  
  // reactiveRoute 自动更新
  // 因为它引用了 currentRoute
}
```

## 两者的区别

| 特性 | useRouter | useRoute |
|------|-----------|----------|
| 返回类型 | Router | RouteLocationNormalizedLoaded |
| 响应式 | 否 | 是 |
| 用途 | 导航操作 | 读取路由信息 |
| 变化时 | 不变 | 自动更新 |

## useRoute 的响应式特性

```typescript
const route = useRoute()

// ✅ 响应式，会触发更新
watch(() => route.params.id, (id) => {
  fetchUser(id)
})

// ✅ 可以在模板中使用
// <div>{{ route.params.id }}</div>

// ⚠️ 解构后失去响应式
const { params } = route  // params 不是响应式的
```

保持响应式：

```typescript
import { toRefs } from 'vue'

const route = useRoute()
const { params, query } = toRefs(route)

// 现在 params 和 query 是 ref
watch(params, (newParams) => {
  // 当参数变化时触发
})
```

## 常见用法

**编程式导航**：

```typescript
const router = useRouter()

function handleSubmit() {
  saveForm().then(() => {
    router.push('/success')
  })
}
```

**路由参数**：

```typescript
const route = useRoute()

const userId = computed(() => route.params.id)
```

**查询参数**：

```typescript
const route = useRoute()

const searchQuery = computed({
  get: () => route.query.q || '',
  set: (value) => {
    router.replace({ query: { ...route.query, q: value } })
  }
})
```

**元信息**：

```typescript
const route = useRoute()

const pageTitle = computed(() => route.meta.title)
```

## 与 Options API 对比

```typescript
// Options API
export default {
  computed: {
    userId() {
      return this.$route.params.id
    }
  },
  methods: {
    goHome() {
      this.$router.push('/')
    }
  }
}

// Composition API
export default {
  setup() {
    const router = useRouter()
    const route = useRoute()

    const userId = computed(() => route.params.id)

    function goHome() {
      router.push('/')
    }

    return { userId, goHome }
  }
}
```

## 注意事项

**只能在 setup 中使用**：

```typescript
// ❌ 错误：在 setup 外使用
const router = useRouter()

export default {
  setup() {
    // ...
  }
}

// ✅ 正确
export default {
  setup() {
    const router = useRouter()
    // ...
  }
}
```

**避免在回调中解构**：

```typescript
// ❌ 问题：解构时的值不会更新
const { params } = useRoute()

setTimeout(() => {
  console.log(params.id)  // 可能是旧值
}, 1000)

// ✅ 正确
const route = useRoute()

setTimeout(() => {
  console.log(route.params.id)  // 总是最新值
}, 1000)
```

## 本章小结

useRouter 和 useRoute 是 Composition API 的核心：

1. **useRouter**：获取路由实例，用于导航操作
2. **useRoute**：获取响应式的当前路由
3. **响应式**：route 自动响应路由变化
4. **解构注意**：直接解构会失去响应式
5. **使用位置**：只能在 setup 或其他 Composition 函数中使用

这两个函数是 Vue Router 与 Composition API 集成的桥梁。
