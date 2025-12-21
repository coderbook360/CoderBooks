# 路由状态管理

使用 Vue 3 响应式系统管理路由状态。

```typescript
import { ref, shallowRef } from 'vue';

// 当前路由（响应式）
const currentRoute = shallowRef<RouteLocationNormalized>({
  path: '/',
  name: undefined,
  params: {},
  query: {},
  hash: '',
  fullPath: '/',
  matched: [],
  meta: {}
});

// 导航状态
const isNavigating = ref(false);

// 更新路由
function updateRoute(to: RouteLocationNormalized) {
  currentRoute.value = to;
  isNavigating.value = false;
}
```

**响应式特性**：组件使用 `currentRoute` 会自动更新。

下一章实现 push 和 replace 导航方法。
