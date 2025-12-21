# 路由状态管理

上一章实现了 `createRouter` 的整体架构，本章深入探讨路由状态管理——Vue Router 响应式能力的核心。

**首先要问一个问题**：为什么路由状态需要响应式？

当用户导航到新页面时，`<RouterView>` 需要重新渲染对应的组件。如果路由状态不是响应式的，Vue 就无法知道"路由变了"，也就不会触发重新渲染。

```typescript
// 没有响应式
let currentRoute = { path: '/home', ... };
currentRoute = { path: '/about', ... };  // 变了，但 Vue 不知道

// 有响应式
const currentRoute = ref({ path: '/home', ... });
currentRoute.value = { path: '/about', ... };  // Vue 自动触发更新
```

这就是为什么 `router.currentRoute` 是一个 `ref`。

## 路由状态的设计

### 核心状态

路由系统需要管理以下状态：

```typescript
// src/router.ts

import { ref, shallowRef, computed } from 'vue';

// 当前路由位置（响应式）
const currentRoute = shallowRef<RouteLocationNormalized>(START_LOCATION);

// 是否正在导航中
const isNavigating = ref(false);

// 挂起的导航目标（用于处理并发导航）
const pendingLocation = ref<RouteLocationNormalized | null>(null);

// 导航失败信息
const failure = ref<NavigationFailure | null>(null);
```

### 为什么用 shallowRef 而不是 ref？

**性能考虑**：

```typescript
// ref：深度响应式
const route = ref({ path: '/', params: { id: '1' } });
route.value.params.id = '2';  // ✅ 会触发更新，但代价是整个对象都被代理

// shallowRef：浅层响应式
const route = shallowRef({ path: '/', params: { id: '1' } });
route.value.params.id = '2';  // ❌ 不会触发更新
route.value = { path: '/', params: { id: '2' } };  // ✅ 只有替换整个值才触发
```

Vue Router 使用 `shallowRef` 的原因：

1. **路由状态是只读的**：用户不应该直接修改 `route.params.id`
2. **整体更新**：每次导航都是替换整个 `currentRoute.value`
3. **性能更好**：避免不必要的深度代理

## 实现路由状态管理

### 起始位置

```typescript
// src/types.ts

export const START_LOCATION: RouteLocationNormalized = {
  path: '/',
  name: undefined,
  params: {},
  query: {},
  hash: '',
  fullPath: '/',
  matched: [],
  meta: {},
  redirectedFrom: undefined
};
```

这是路由系统启动时的初始状态，在 `createRouter` 被调用但还没有进行第一次导航时使用。

### 路由状态更新

```typescript
function updateRouteState(to: RouteLocationNormalized) {
  // 更新响应式状态
  currentRoute.value = Object.freeze(to);  // 冻结防止修改
  
  // 清除导航标志
  isNavigating.value = false;
  pendingLocation.value = null;
  failure.value = null;
}
```

**为什么用 Object.freeze？**

防止用户意外修改路由状态：

```typescript
router.currentRoute.value.params.id = 'new';  // ❌ 报错（严格模式）或静默失败
```

这是一种**防御性编程**：让错误的使用方式尽早暴露。

### 导航过程中的状态变化

```typescript
async function navigate(to: RouteLocationRaw, type: 'push' | 'replace') {
  const from = currentRoute.value;
  const resolved = matcher.resolve(normalizeLocation(to));
  
  // 1. 标记导航开始
  isNavigating.value = true;
  pendingLocation.value = resolved;
  
  try {
    // 2. 执行守卫
    await runGuards(resolved, from);
    
    // 3. 更新 URL
    history[type](resolved.fullPath);
    
    // 4. 更新状态
    updateRouteState(resolved);
    
  } catch (error) {
    // 5. 记录错误
    failure.value = error as NavigationFailure;
    isNavigating.value = false;
    throw error;
  }
}
```

### 并发导航处理

**思考一个场景**：用户快速点击多个链接会发生什么？

```typescript
router.push('/page1');  // 导航1
router.push('/page2');  // 导航2（导航1还没完成）
```

需要处理这种"导航竞争"：

```typescript
async function navigate(to: RouteLocationRaw, type: 'push' | 'replace') {
  const resolved = matcher.resolve(normalizeLocation(to));
  
  // 记录当前导航
  pendingLocation.value = resolved;
  
  // ... 执行守卫等 ...
  
  // 在更新状态前，检查是否还是当前导航
  if (pendingLocation.value !== resolved) {
    // 被新导航取代了，抛出取消错误
    throw createNavigationCancelledError(resolved, from);
  }
  
  // 安全更新
  updateRouteState(resolved);
}
```

## 暴露给组件的 API

### router.currentRoute

这是一个只读的 `Ref`：

```typescript
// 在组件中使用
const route = router.currentRoute;

// 监听变化
watch(route, (newRoute, oldRoute) => {
  console.log(`从 ${oldRoute.path} 导航到 ${newRoute.path}`);
});

// 计算属性
const userId = computed(() => route.value.params.id);
```

### useRoute() Hook

为了方便在 `setup()` 中使用，提供 `useRoute()` Hook：

```typescript
// src/composables/useRoute.ts

import { inject, computed } from 'vue';
import { routeKey } from '../injectionSymbols';

export function useRoute(): RouteLocationNormalized {
  const route = inject(routeKey);
  
  if (!route) {
    throw new Error('useRoute() must be used inside <router-view>');
  }
  
  // 返回响应式的路由对象
  return computed(() => route.value);
}
```

**使用示例**：

```vue
<script setup>
import { useRoute } from 'mini-vue-router';
import { computed } from 'vue';

const route = useRoute();

// 响应式获取参数
const userId = computed(() => route.params.id);

// 自动响应路由变化
</script>
```

## 路由状态的生命周期

```
                     ┌────────────────────────────┐
                     │      START_LOCATION        │
                     │  path: '/', matched: []    │
                     └─────────────┬──────────────┘
                                   │
                                   ▼ 初始导航
                     ┌────────────────────────────┐
                     │     isNavigating = true    │
                     │     pendingLocation = to   │
                     └─────────────┬──────────────┘
                                   │
                         ┌─────────┴─────────┐
                         ▼                   ▼
              ┌──────────────────┐  ┌──────────────────┐
              │   守卫通过       │  │   守卫拒绝       │
              └────────┬─────────┘  └────────┬─────────┘
                       │                     │
                       ▼                     ▼
              ┌──────────────────┐  ┌──────────────────┐
              │ currentRoute = to│  │ failure = error  │
              │ isNavigating=false│  │ isNavigating=false│
              └──────────────────┘  └──────────────────┘
                       │
                       ▼ 用户再次导航
                      ...
```

## 与官方实现的对比

**官方实现的额外特性**：

1. **routerViewLocationKey**：为 `<router-view>` 提供独立的 location 注入
2. **matchedRouteKey**：注入当前匹配的路由记录
3. **viewDepthKey**：注入当前视图深度

这些额外的注入点让 `RouterView` 能够正确处理嵌套路由和 `keep-alive` 场景。

## 本章小结

路由状态管理的核心洞察：

1. **shallowRef 性能优化**：避免深度响应式的开销
2. **Object.freeze 防御性编程**：防止意外修改
3. **并发导航处理**：用 `pendingLocation` 跟踪当前导航
4. **状态生命周期**：从 `START_LOCATION` 到实际路由的完整流程

下一章实现 `push` 和 `replace` 导航方法。
