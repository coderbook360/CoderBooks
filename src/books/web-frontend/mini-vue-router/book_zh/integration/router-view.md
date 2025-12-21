# RouterView 组件实现

RouterView 是路由系统的渲染核心。本章实现完整的路由视图组件，理解嵌套路由的深度计算原理。

## RouterView 的设计挑战

首先要问一个问题：**RouterView 需要解决什么问题？**

**核心问题**：
1. **动态渲染**：根据当前路由渲染对应组件
2. **嵌套路由**：支持多层 RouterView 嵌套
3. **深度计算**：每个 RouterView 知道自己在第几层
4. **KeepAlive 集成**：支持组件缓存
5. **响应式更新**：路由变化时自动重新渲染

## 从简单开始：渐进式实现

### 版本 1：最简实现

```typescript
import { defineComponent, h, inject } from 'vue';
import { routeKey } from '../injectionSymbols';

export const RouterView = defineComponent({
  name: 'RouterView',
  
  setup() {
    const route = inject(routeKey)!;
    
    return () => {
      // 假设只有一层路由
      const component = route.value.matched[0]?.components?.default;
      
      return component ? h(component) : null;
    };
  }
});
```

**问题**：
- ✗ 只能渲染第一层，不支持嵌套路由
- ✗ 不支持命名视图
- ✗ 没有响应式优化

### 版本 2：支持嵌套路由（核心）

现在我要问第二个问题：**如何让多个 RouterView 知道自己在第几层？**

**方案：依赖注入 + 深度传递**

```typescript
import { defineComponent, h, inject, computed, provide } from 'vue';
import { routeKey } from '../injectionSymbols';

// 定义深度注入 key
const depthKey = Symbol('routerViewDepth');

export const RouterView = defineComponent({
  name: 'RouterView',
  
  setup() {
    const route = inject(routeKey)!;
    
    // 新增：获取父级深度，默认为 0
    const parentDepth = inject(depthKey, 0);
    const depth = parentDepth;  // 当前深度
    
    // 新增：提供深度给子 RouterView
    provide(depthKey, depth + 1);
    
    // 新增：根据深度获取组件
    const component = computed(() => {
      const matched = route.value.matched[depth];
      return matched?.components?.default;
    });
    
    return () => {
      const comp = component.value;
      return comp ? h(comp) : null;
    };
  }
});
```

**深度计算原理**：

```vue-html
<!-- App.vue - depth=0 -->
<router-view />  <!-- 注入 depth=0, 提供 depth=1 -->

<!-- User.vue - depth=1 -->
<router-view />  <!-- 注入 depth=1, 提供 depth=2 -->

<!-- UserProfile.vue - depth=2 -->
<router-view />  <!-- 注入 depth=2, 提供 depth=3 -->
```

**路由匹配数组**：

```typescript
// 当前路由：/user/123/profile

route.matched = [
  { path: '/user/:id', components: { default: User } },       // depth=0
  { path: 'profile', components: { default: UserProfile } }   // depth=1
];

// 第一个 RouterView (depth=0) 渲染 User
// 第二个 RouterView (depth=1) 渲染 UserProfile
```

### 版本 3：支持插槽

```typescript
export const RouterView = defineComponent({
  name: 'RouterView',
  
  setup(props, { slots }) {  // 新增：slots
    const route = inject(routeKey)!;
    const parentDepth = inject(depthKey, 0);
    const depth = parentDepth;
    
    provide(depthKey, depth + 1);
    
    const component = computed(() => {
      const matched = route.value.matched[depth];
      return matched?.components?.default;
    });
    
    return () => {
      const comp = component.value;
      
      // 新增：没有匹配组件时使用插槽
      if (!comp) {
        return slots.default ? slots.default() : null;
      }
      
      return h(comp);
    };
  }
});
```

**使用**：

```vue-html
<router-view>
  <template #default>
    <div>404 - 页面不存在</div>
  </template>
</router-view>
```

### 版本 4：支持 key 优化

```typescript
export const RouterView = defineComponent({
  name: 'RouterView',
  
  setup(props, { slots }) {
    const route = inject(routeKey)!;
    const parentDepth = inject(depthKey, 0);
    const depth = parentDepth;
    
    provide(depthKey, depth + 1);
    
    const component = computed(() => {
      const matched = route.value.matched[depth];
      return matched?.components?.default;
    });
    
    return () => {
      const comp = component.value;
      
      if (!comp) {
        return slots.default?.();
      }
      
      // 新增：使用 key 确保组件正确更新
      return h(comp, {
        key: route.value.fullPath  // 新增
      });
    };
  }
});
```

**为什么需要 key？**

```typescript
// 没有 key
<router-view />
// 从 /user/1 导航到 /user/2
// Vue 会复用同一个 User 组件实例，不触发重新挂载

// 有 key
<router-view />
// 从 /user/1 (key="/user/1") 导航到 /user/2 (key="/user/2")
// Vue 检测到 key 变化，卸载旧组件，挂载新组件
```

**权衡**：
- **优点**：确保组件生命周期正确触发
- **缺点**：每次路由变化都重新挂载，性能略低

### 版本 5：支持命名视图

```typescript
export const RouterView = defineComponent({
  name: 'RouterView',
  
  props: {
    name: {  // 新增：视图名称
      type: String,
      default: 'default'
    }
  },
  
  setup(props, { slots }) {
    const route = inject(routeKey)!;
    const parentDepth = inject(depthKey, 0);
    const depth = parentDepth;
    
    provide(depthKey, depth + 1);
    
    // 修改：根据视图名称获取组件
    const component = computed(() => {
      const matched = route.value.matched[depth];
      return matched?.components?.[props.name];
    });
    
    return () => {
      const comp = component.value;
      
      if (!comp) {
        return slots.default?.();
      }
      
      return h(comp, {
        key: route.value.fullPath
      });
    };
  }
});
```

**使用**：

```vue-html
<router-view />              <!-- 默认视图 -->
<router-view name="sidebar" /> <!-- 侧边栏视图 -->
<router-view name="footer" />  <!-- 底部视图 -->
```

```typescript
const routes = [
  {
    path: '/home',
    components: {
      default: Home,
      sidebar: HomeSidebar,
      footer: HomeFooter
    }
  }
];
```

### 版本 6：完整实现（支持作用域插槽）

```typescript
import { defineComponent, h, inject, computed, provide, PropType } from 'vue';
import { routeKey } from '../injectionSymbols';

const depthKey: InjectionKey<number> = Symbol('routerViewDepth');

export const RouterView = defineComponent({
  name: 'RouterView',
  
  props: {
    name: {
      type: String,
      default: 'default'
    }
  },
  
  setup(props, { slots }) {
    const route = inject(routeKey);
    
    if (!route) {
      throw new Error(
        'RouterView requires route. Did you forget app.use(router)?'
      );
    }
    
    const parentDepth = inject(depthKey, 0);
    const depth = parentDepth;
    
    // 为子 RouterView 提供深度
    provide(depthKey, depth + 1);
    
    // 响应式获取组件
    const component = computed(() => {
      const matched = route.value.matched[depth];
      return matched?.components?.[props.name];
    });
    
    // 响应式获取路由记录
    const matchedRoute = computed(() => {
      return route.value.matched[depth];
    });
    
    return () => {
      const comp = component.value;
      const currentRoute = route.value;
      const matched = matchedRoute.value;
      
      // 作用域插槽
      if (slots.default) {
        return slots.default({
          Component: comp,
          route: currentRoute,
          matched
        });
      }
      
      // 没有匹配组件
      if (!comp) {
        return null;
      }
      
      // 渲染组件
      return h(comp, {
        key: currentRoute.fullPath
      });
    };
  }
});
```

**作用域插槽使用**：

```vue-html
<router-view v-slot="{ Component, route }">
  <transition name="fade">
    <component :is="Component" :key="route.path" />
  </transition>
</router-view>
```

```vue-html
<router-view v-slot="{ Component }">
  <keep-alive>
    <component :is="Component" />
  </keep-alive>
</router-view>
```

## KeepAlive 集成

```vue-html
<template>
  <router-view v-slot="{ Component, route }">
    <keep-alive :include="cachedViews">
      <component :is="Component" :key="route.meta.usePathKey ? route.path : undefined" />
    </keep-alive>
  </router-view>
</template>

<script setup>
const cachedViews = computed(() => {
  // 根据路由元信息决定哪些组件需要缓存
  return route.matched
    .filter(r => r.meta.keepAlive)
    .map(r => r.components.default.name);
});
</script>
```

## 实战场景

### 场景1：基础使用

```vue-html
<!-- App.vue -->
<template>
  <router-view />
</template>
```

### 场景2：带过渡动画

```vue-html
<router-view v-slot="{ Component }">
  <transition name="fade" mode="out-in">
    <component :is="Component" />
  </transition>
</router-view>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
```

### 场景3：嵌套路由

```typescript
const routes = [
  {
    path: '/user/:id',
    component: User,
    children: [
      {
        path: '',
        component: UserHome
      },
      {
        path: 'profile',
        component: UserProfile
      },
      {
        path: 'posts',
        component: UserPosts
      }
    ]
  }
];
```

```vue-html
<!-- User.vue -->
<template>
  <div class="user">
    <h1>User {{ $route.params.id }}</h1>
    <nav>
      <router-link to="">Home</router-link>
      <router-link to="profile">Profile</router-link>
      <router-link to="posts">Posts</router-link>
    </nav>
    <router-view />  <!-- 渲染子路由 -->
  </div>
</template>
```

### 场景4：命名视图布局

```vue-html
<template>
  <div class="layout">
    <router-view />                 <!-- 主内容 -->
    <router-view name="sidebar" />  <!-- 侧边栏 -->
  </div>
</template>
```

### 场景5：条件缓存

```vue-html
<router-view v-slot="{ Component, route }">
  <keep-alive v-if="route.meta.keepAlive">
    <component :is="Component" :key="route.fullPath" />
  </keep-alive>
  <component v-else :is="Component" :key="route.fullPath" />
</router-view>
```

## 常见陷阱

### 陷阱1：忘记提供深度

```typescript
// ❌ 错误：忘记提供深度
provide(depthKey, depth);  // 子组件会得到相同深度

// ✅ 正确：提供 depth + 1
provide(depthKey, depth + 1);
```

### 陷阱2：直接渲染组件

```typescript
// ❌ 错误
return () => component.value;

// ✅ 正确：使用 h() 创建 VNode
return () => h(component.value);
```

### 陷阱3：KeepAlive 与 key 冲突

```vue-html
<!-- ❌ 错误：key 导致组件无法缓存 -->
<keep-alive>
  <component :is="Component" :key="route.fullPath" />
</keep-alive>

<!-- ✅ 正确：缓存时不使用 key -->
<keep-alive>
  <component :is="Component" />
</keep-alive>
```

## 小结

本章实现了 RouterView 组件，核心原理：

**深度计算**：
- 通过 provide/inject 传递深度
- 每个 RouterView 提供 `depth + 1` 给子级
- 根据深度从 `route.matched` 数组获取对应组件

**核心功能**：
1. 动态渲染匹配的路由组件
2. 支持嵌套路由（任意深度）
3. 支持命名视图
4. 支持作用域插槽
5. 响应式更新

**设计亮点**：
- 使用 computed 确保响应式
- 使用 key 优化更新策略
- 支持 KeepAlive 集成
- 作用域插槽提供灵活性

下一章实现 Composition API 集成，提供 `useRouter()` 和 `useRoute()`。
