# 命名视图与多视图渲染

命名视图允许在同一级路由渲染多个组件。本章实现完整的多视图系统。

## 命名视图的设计动机

首先要问一个问题：**为什么需要命名视图？**

### 单视图的局限

```vue-html
<!-- 传统单视图 -->
<template>
  <div class="layout">
    <router-view />  <!-- 只能渲染一个组件 -->
  </div>
</template>
```

**问题**：
- ✗ 无法同时渲染多个组件（如侧边栏 + 主内容）
- ✗ 复杂布局需要嵌套路由
- ✗ 部分区域独立更新困难

### 命名视图的优势

```vue-html
<!-- 命名视图 -->
<template>
  <div class="layout">
    <router-view />              <!-- 主内容 -->
    <router-view name="sidebar" /> <!-- 侧边栏 -->
    <router-view name="footer" />  <!-- 底部 -->
  </div>
</template>
```

**优势**：
- ✓ 同时渲染多个独立组件
- ✓ 每个视图独立控制
- ✓ 灵活的布局设计

## 路由配置设计

```typescript
const routes = [
  {
    path: '/',
    components: {  // 注意是 components 而不是 component
      default: Home,
      sidebar: HomeSidebar,
      footer: HomeFooter
    }
  },
  {
    path: '/user',
    components: {
      default: User,
      sidebar: UserSidebar
      // footer 不渲染
    }
  },
  {
    path: '/about',
    component: About  // 单组件路由
  }
];
```

**关键点**：
- `component` → 单组件
- `components` → 多组件（对象）
- `default` 视图总是存在

## 渐进式实现

### 版本 1：RouterView 支持命名视图

先看看需要做什么改动。原来的 `RouterView` 只能渲染 `matched[depth].component`，现在我们要让它能根据 `name` 属性从 `matched[depth].components` 对象中获取对应的组件。

```typescript
// src/components/RouterView.ts

export const RouterView = defineComponent({
  name: 'RouterView',
  
  props: {
    // 视图名称，默认为 'default'
    name: {
      type: String,
      default: 'default'
    }
  },
  
  setup(props) {
    const route = inject(routeKey);
    
    if (!route) {
      throw new Error('RouterView must be used inside a Router');
    }
    
    // depth 用于处理嵌套路由，表示当前是第几层 RouterView
    const depth = inject(depthKey, 0);
    provide(depthKey, depth + 1);
    
    const component = computed(() => {
      const matched = route.value.matched[depth];
      if (!matched) return null;
      
      // 关键改动：从 components 对象中按 name 取组件
      return matched.components?.[props.name] ?? null;
    });
    
    return () => {
      const comp = component.value;
      return comp ? h(comp, { key: route.value.fullPath }) : null;
    };
  }
});
```

这里有几个细节值得注意：

- `depth` 通过 `inject/provide` 传递，每一层 RouterView 都会把深度 +1 传给子组件
- `matched[depth]` 取出当前层级对应的路由记录
- `components?.[props.name]` 根据视图名称获取组件，`?.` 防止 `components` 不存在时报错
<router-view />              → props.name = 'default'  → components.default
<router-view name="sidebar" /> → props.name = 'sidebar' → components.sidebar
<router-view name="footer" />  → props.name = 'footer'  → components.footer
```

### 版本 2：路由记录处理

**目标**：统一 `component` 和 `components` 的存储格式，简化后续处理逻辑。

**核心思路**：无论用户配置的是 `component` 还是 `components`，内部都统一存储为 `components` 对象。

```typescript
// src/matcher/index.ts

function normalizeRouteRecord(record: RouteRecordRaw): RouteRecordNormalized {
  // 处理 component 和 components 的兼容性
  // 优先级：components > component > 空对象
  const components = record.components
    // 如果用户配置了 components，直接使用
    ? record.components
    // 如果配置了 component，转换为 { default: component }
    : record.component
      ? { default: record.component }
      // 都没有配置，返回空对象
      : {};
  
  return {
    path: record.path,
    components,  // 统一存储为 components 对象
    // ...其他字段
  };
}
```

**为什么要做归一化处理？**

这是一个重要的设计决策。通过归一化处理，我们可以：

1. **简化 RouterView 的逻辑**：只需要处理 `components` 一种格式
2. **保持向下兼容**：用户可以继续使用 `component` 配置单组件路由
3. **统一数据结构**：内部存储格式一致，减少条件判断

**转换示意图**：

```
用户配置                        内部存储
─────────────────────────────────────────────
{ component: Home }      →    { components: { default: Home } }

{ components: {          →    { components: {
    default: Home,                 default: Home,
    sidebar: Sidebar               sidebar: Sidebar
  }                              }
}                              }
```

**兼容性处理示例**：

```typescript
// 输入格式 1：单组件（旧写法，保持兼容）
const route1 = { path: '/', component: Home };
// 归一化后
const normalized1 = { path: '/', components: { default: Home } };

// 输入格式 2：多组件（命名视图写法）
const route2 = { path: '/', components: { default: Home, sidebar: Sidebar } };
// 保持不变
const normalized2 = { path: '/', components: { default: Home, sidebar: Sidebar } };
```

## 完整实现

下面是整合了版本1和版本2所有功能的完整 `RouterView` 组件实现：

```typescript
// src/components/RouterView.ts

import { defineComponent, h, inject, computed, provide, PropType } from 'vue';
import { routeKey, depthKey } from '../injectionSymbols';
import type { RouteLocationNormalizedLoaded } from '../types';

export const RouterView = defineComponent({
  name: 'RouterView',
  
  props: {
    name: {
      type: String as PropType<string>,
      default: 'default'
    }
  },
  
  setup(props, { slots }) {
    const route = inject(routeKey);
    
    if (!route) {
      throw new Error('RouterView requires route provider');
    }
    
    const parentDepth = inject(depthKey, 0);
    const depth = parentDepth;
    
    // 为子 RouterView 提供深度
    provide(depthKey, depth + 1);
    
    // 获取当前深度和名称的组件
    const component = computed(() => {
      const matched = route.value.matched[depth];
      if (!matched) return null;
      
      // 优先使用 components，向下兼容 component
      const components = matched.components || 
        (matched.component ? { default: matched.component } : {});
      
      return components[props.name];
    });
    
    return () => {
      const comp = component.value;
      
      // 作用域插槽
      if (slots.default) {
        return slots.default({
          Component: comp,
          route: route.value
        });
      }
      
      if (!comp) {
        return null;
      }
      
      return h(comp, {
        key: route.value.fullPath
      });
    };
  }
});
```

## 实战场景

### 场景1：经典布局

```typescript
const routes = [
  {
    path: '/',
    components: {
      default: Home,
      sidebar: HomeSidebar,
      footer: Footer
    }
  },
  {
    path: '/user',
    components: {
      default: User,
      sidebar: UserSidebar,
      footer: Footer
    }
  }
];
```

```vue-html
<!-- App.vue -->
<template>
  <div class="layout">
    <header>导航栏</header>
    <div class="main">
      <aside>
        <router-view name="sidebar" />
      </aside>
      <main>
        <router-view />  <!-- default -->
      </main>
    </div>
    <footer>
      <router-view name="footer" />
    </footer>
  </div>
</template>
```

### 场景2：条件渲染视图

```vue-html
<template>
  <div class="layout">
    <router-view />  <!-- 主内容总是存在 -->
    
    <!-- 根据路由决定是否显示侧边栏 -->
    <router-view 
      v-if="route.meta.showSidebar" 
      name="sidebar" 
    />
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
</script>
```

### 场景3：嵌套命名视图

```typescript
const routes = [
  {
    path: '/settings',
    components: {
      default: Settings,
      sidebar: SettingsSidebar
    },
    children: [
      {
        path: 'profile',
        components: {
          default: Profile,
          aside: ProfileAside  // 嵌套的命名视图
        }
      }
    ]
  }
];
```

```vue-html
<!-- Settings.vue -->
<template>
  <div class="settings">
    <h1>设置</h1>
    <div class="content">
      <router-view />  <!-- 渲染 Profile -->
      <router-view name="aside" />  <!-- 渲染 ProfileAside -->
    </div>
  </div>
</template>
```

### 场景4：动态布局切换

```typescript
const routes = [
  {
    path: '/dashboard',
    components: {
      default: Dashboard,
      sidebar: DashboardSidebar
    },
    meta: { layout: 'full' }
  },
  {
    path: '/admin',
    components: {
      default: Admin,
      sidebar: AdminSidebar,
      toolbar: AdminToolbar
    },
    meta: { layout: 'admin' }
  }
];
```

```vue-html
<!-- App.vue -->
<template>
  <div :class="`layout-${route.meta.layout}`">
    <router-view name="toolbar" v-if="hasToolbar" />
    <div class="main">
      <router-view name="sidebar" v-if="hasSidebar" />
      <router-view />
    </div>
  </div>
</template>

<script setup>
const route = useRoute();

const hasToolbar = computed(() => {
  return route.matched.some(r => r.components.toolbar);
});

const hasSidebar = computed(() => {
  return route.matched.some(r => r.components.sidebar);
});
</script>
```

### 场景5：响应式布局

```vue-html
<template>
  <div class="responsive-layout">
    <!-- 桌面端：显示侧边栏 -->
    <router-view v-if="isDesktop" name="sidebar" />
    
    <!-- 主内容 -->
    <router-view />
    
    <!-- 移动端：抽屉显示侧边栏 -->
    <el-drawer v-model="showDrawer" v-if="!isDesktop">
      <router-view name="sidebar" />
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const showDrawer = ref(false);

const isDesktop = computed(() => window.innerWidth > 768);
</script>
```

## 常见陷阱

### 陷阱1：混淆 component 和 components

```typescript
// ❌ 错误
const routes = [
  {
    path: '/',
    component: Home,  // 单组件
    components: {     // 多组件
      sidebar: Sidebar
    }
  }
];

// ✅ 正确：只用一种
const routes = [
  {
    path: '/',
    components: {
      default: Home,
      sidebar: Sidebar
    }
  }
];
```

### 陷阱2：忘记 default 视图

```typescript
// ❌ 错误：没有 default
const routes = [
  {
    path: '/',
    components: {
      sidebar: Sidebar,
      footer: Footer
    }
  }
];

// 模板中的 <router-view /> 无法渲染

// ✅ 正确：提供 default
const routes = [
  {
    path: '/',
    components: {
      default: Home,
      sidebar: Sidebar,
      footer: Footer
    }
  }
];
```

### 陷阱3：嵌套路由深度混乱

```vue-html
<!-- ❌ 错误：忘记传递深度 -->
<template>
  <router-view name="sidebar" />  <!-- depth=0 -->
  <router-view />                 <!-- depth=0 （错误！） -->
</template>

<!-- ✅ 正确：每个 RouterView 自动管理深度 -->
<!-- 通过 provide/inject 自动处理 -->
```

## 小结

本章实现了完整的命名视图系统：

**核心功能**：
- 同一路由渲染多个组件
- 通过 `name` prop 指定视图
- 默认视图名为 `default`
- 支持嵌套命名视图

**实现要点**：
- `component` 转换为 `components.default`
- RouterView 根据 `name` 属性获取对应组件
- 深度通过 provide/inject 传递

**实战价值**：
- 灵活的布局设计
- 独立控制多个区域
- 响应式布局适配

下一章实现重定向与别名功能。
