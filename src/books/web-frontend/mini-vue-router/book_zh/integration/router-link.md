# RouterLink 组件实现

RouterLink 是 Vue Router 中最常用的组件。本章从零实现一个完整的导航链接组件。

## RouterLink 的设计目标

首先要问一个问题：**为什么需要 RouterLink，直接用 `<a>` 标签不行吗？**

### 方案对比

**方案1：普通 `<a>` 标签**

```vue-html
<template>
  <a href="/user/123">用户详情</a>
</template>
```

**问题**：
- ✗ 点击会刷新整个页面
- ✗ 无法使用路由对象（如 `{ name: 'User', params: { id: 123 } }`）
- ✗ 无法自动添加激活状态的 class
- ✗ 无法使用 replace 模式
- ✗ 失去了单页应用的流畅体验

**方案2：手动导航**

```vue-html
<template>
  <span @click="$router.push('/user/123')">用户详情</span>
</template>
```

**问题**：
- ✗ 失去了 `<a>` 标签的语义化
- ✗ SEO 不友好，爬虫无法识别链接
- ✗ 无法右键"在新标签页打开"
- ✗ 无法显示目标 URL（鼠标悬停时浏览器底部不显示链接）
- ✗ 键盘导航不友好（无法 Tab 选中）

**方案3：RouterLink（✓ 最佳实践）**

```vue-html
<template>
  <router-link to="/user/123">用户详情</router-link>
</template>
```

**优势**：
- ✓ 使用 `<a>` 标签，保持语义化和 SEO
- ✓ 拦截点击事件，实现 SPA 导航
- ✓ 支持路由对象和命名路由
- ✓ 自动添加激活状态 class
- ✓ 支持 replace 模式
- ✓ 保留 `<a>` 标签的所有特性（右键菜单、悬停显示 URL等）

## RouterLink 的核心功能

现在我要问第二个问题：**RouterLink 需要实现哪些功能？**

1. **导航**：点击时触发路由导航
2. **激活状态**：当前路由匹配时添加 class
3. **多种 to 格式**：支持字符串、路由对象、命名路由
4. **replace 模式**：不留历史记录
5. **自定义标签**：可以渲染为 `<button>` 等
6. **插槽支持**：自定义渲染内容

## 渐进式实现

### 版本 1：最简实现

```typescript
import { defineComponent, h } from 'vue';

export const RouterLink = defineComponent({
  name: 'RouterLink',
  
  props: {
    to: {
      type: String,
      required: true
    }
  },
  
  setup(props, { slots }) {
    const navigate = (e: MouseEvent) => {
      e.preventDefault();
      console.log('导航到：', props.to);
    };
    
    return () => h(
      'a',
      {
        href: props.to,
        onClick: navigate
      },
      slots.default?.()
    );
  }
});
```

**实现了什么**：
- ✓ 渲染为 `<a>` 标签
- ✓ 拦截点击事件

**还缺什么**：
- ✗ 没有实际导航
- ✗ 不支持路由对象
- ✗ 没有激活状态

### 版本 2：集成 Router

```typescript
import { defineComponent, h, inject } from 'vue';
import { routerKey } from '../injectionSymbols';

export const RouterLink = defineComponent({
  name: 'RouterLink',
  
  props: {
    to: {
      type: String,
      required: true
    }
  },
  
  setup(props, { slots }) {
    const router = inject(routerKey)!;  // 新增
    
    const navigate = (e: MouseEvent) => {
      e.preventDefault();
      router.push(props.to);  // 修改：实际导航
    };
    
    return () => h(
      'a',
      {
        href: props.to,
        onClick: navigate
      },
      slots.default?.()
    );
  }
});
```

**改进**：
- ✓ 通过依赖注入获取 router
- ✓ 点击时触发真实导航

**思考：如果用户忘记安装 router 会怎样？**

应该添加错误处理：

```typescript
const router = inject(routerKey);

if (!router) {
  throw new Error(
    'RouterLink requires router. Did you forget app.use(router)?'
  );
}
```

### 版本 3：支持路由对象

```typescript
import { RouteLocationRaw } from '../types';

export const RouterLink = defineComponent({
  name: 'RouterLink',
  
  props: {
    to: {
      type: [String, Object] as PropType<RouteLocationRaw>,  // 修改
      required: true
    }
  },
  
  setup(props, { slots }) {
    const router = inject(routerKey)!;
    
    // 新增：解析路由
    const targetLocation = computed(() => {
      return router.resolve(props.to);
    });
    
    const navigate = (e: MouseEvent) => {
      e.preventDefault();
      router.push(props.to);
    };
    
    return () => h(
      'a',
      {
        href: targetLocation.value.fullPath,  // 修改：使用解析后的路径
        onClick: navigate
      },
      slots.default?.()
    );
  }
});
```

**改进**：
- ✓ 支持 `to="/user/123"` 字符串
- ✓ 支持 `:to="{ name: 'User', params: { id: 123 } }"` 对象
- ✓ href 显示正确的完整路径

**为什么需要 `router.resolve`？**

```typescript
// 输入
const to = { name: 'User', params: { id: 123 } };

// 输出
const resolved = {
  path: '/user/123',
  fullPath: '/user/123',
  name: 'User',
  params: { id: '123' },
  // ...
};
```

resolve 将路由对象转换为完整的路由信息，确保 href 正确。

### 版本 4：激活状态

```typescript
export const RouterLink = defineComponent({
  name: 'RouterLink',
  
  props: {
    to: {
      type: [String, Object] as PropType<RouteLocationRaw>,
      required: true
    },
    activeClass: {  // 新增
      type: String,
      default: 'router-link-active'
    },
    exactActiveClass: {  // 新增
      type: String,
      default: 'router-link-exact-active'
    }
  },
  
  setup(props, { slots }) {
    const router = inject(routerKey)!;
    const route = inject(routeKey)!;  // 新增：当前路由
    
    const targetLocation = computed(() => router.resolve(props.to));
    
    // 新增：激活状态
    const isActive = computed(() => {
      const current = route.value;
      const target = targetLocation.value;
      
      // 部分匹配：当前路径以目标路径开头
      return current.path.startsWith(target.path);
    });
    
    // 新增：精确激活状态
    const isExactActive = computed(() => {
      const current = route.value;
      const target = targetLocation.value;
      
      // 精确匹配：完整路径相同
      return current.fullPath === target.fullPath;
    });
    
    const navigate = (e: MouseEvent) => {
      e.preventDefault();
      router.push(props.to);
    };
    
    return () => h(
      'a',
      {
        href: targetLocation.value.fullPath,
        onClick: navigate,
        class: {  // 新增：动态 class
          [props.activeClass]: isActive.value,
          [props.exactActiveClass]: isExactActive.value
        }
      },
      slots.default?.()
    );
  }
});
```

**改进**：
- ✓ 部分匹配时添加 `router-link-active`
- ✓ 精确匹配时添加 `router-link-exact-active`
- ✓ 支持自定义 class 名称

**两种激活状态的区别**：

```javascript
// 当前路由：/user/123/posts

// 链接1：to="/user/123"
isActive: true        // 部分匹配（/user/123/posts 以 /user/123 开头）
isExactActive: false  // 不精确匹配

// 链接2：to="/user/123/posts"
isActive: true        // 部分匹配
isExactActive: true   // 精确匹配

// 链接3：to="/about"
isActive: false
isExactActive: false
```

### 版本 5：支持 replace 模式

```typescript
export const RouterLink = defineComponent({
  name: 'RouterLink',
  
  props: {
    to: {
      type: [String, Object] as PropType<RouteLocationRaw>,
      required: true
    },
    replace: Boolean,  // 新增
    activeClass: {
      type: String,
      default: 'router-link-active'
    },
    exactActiveClass: {
      type: String,
      default: 'router-link-exact-active'
    }
  },
  
  setup(props, { slots }) {
    const router = inject(routerKey)!;
    const route = inject(routeKey)!;
    
    const targetLocation = computed(() => router.resolve(props.to));
    
    const isActive = computed(() => {
      return route.value.path.startsWith(targetLocation.value.path);
    });
    
    const isExactActive = computed(() => {
      return route.value.fullPath === targetLocation.value.fullPath;
    });
    
    const navigate = (e: MouseEvent) => {
      e.preventDefault();
      const method = props.replace ? 'replace' : 'push';  // 修改
      router[method](props.to);
    };
    
    return () => h(
      'a',
      {
        href: targetLocation.value.fullPath,
        onClick: navigate,
        class: {
          [props.activeClass]: isActive.value,
          [props.exactActiveClass]: isExactActive.value
        }
      },
      slots.default?.()
    );
  }
});
```

**改进**：
- ✓ 支持 `<router-link to="/home" replace>` 替换模式
- ✓ replace 模式不会在历史记录中留下记录

### 版本 6：处理特殊按键

```typescript
const navigate = (e: MouseEvent) => {
  // 新增：特殊按键处理
  if (
    e.metaKey ||   // macOS 的 Cmd 键
    e.altKey ||    // Alt 键
    e.ctrlKey ||   // Ctrl 键
    e.shiftKey     // Shift 键
  ) {
    return;  // 让浏览器处理（如在新标签页打开）
  }
  
  // 新增：非左键点击
  if (e.button !== 0) {
    return;  // 让浏览器处理（如中键打开新标签页）
  }
  
  e.preventDefault();
  const method = props.replace ? 'replace' : 'push';
  router[method](props.to);
};
```

**改进**：
- ✓ Cmd/Ctrl + 点击：在新标签页打开
- ✓ 中键点击：在新标签页打开
- ✓ Shift + 点击：在新窗口打开
- ✓ 保留浏览器的原生行为

### 版本 7：完整实现（作用域插槽）

```typescript
import { defineComponent, h, inject, computed, PropType } from 'vue';
import { routerKey, routeKey } from '../injectionSymbols';
import type { RouteLocationRaw } from '../types';

export const RouterLink = defineComponent({
  name: 'RouterLink',
  
  props: {
    to: {
      type: [String, Object] as PropType<RouteLocationRaw>,
      required: true
    },
    replace: Boolean,
    activeClass: {
      type: String,
      default: 'router-link-active'
    },
    exactActiveClass: {
      type: String,
      default: 'router-link-exact-active'
    },
    custom: Boolean  // 新增：自定义渲染
  },
  
  setup(props, { slots }) {
    const router = inject(routerKey);
    const route = inject(routeKey);
    
    if (!router) {
      throw new Error(
        'RouterLink requires router. Did you forget app.use(router)?'
      );
    }
    
    const targetLocation = computed(() => router.resolve(props.to));
    
    const isActive = computed(() => {
      const current = route.value;
      const target = targetLocation.value;
      return current.path.startsWith(target.path);
    });
    
    const isExactActive = computed(() => {
      const current = route.value;
      const target = targetLocation.value;
      return current.fullPath === target.fullPath;
    });
    
    const navigate = (e: MouseEvent) => {
      // 特殊按键或非左键
      if (
        e.metaKey || e.altKey || e.ctrlKey || e.shiftKey ||
        e.button !== 0
      ) {
        return;
      }
      
      e.preventDefault();
      const method = props.replace ? 'replace' : 'push';
      router[method](props.to);
    };
    
    return () => {
      // 新增：作用域插槽
      if (props.custom && slots.default) {
        return slots.default({
          href: targetLocation.value.fullPath,
          navigate,
          isActive: isActive.value,
          isExactActive: isExactActive.value
        });
      }
      
      // 默认渲染
      return h(
        'a',
        {
          href: targetLocation.value.fullPath,
          onClick: navigate,
          class: {
            [props.activeClass]: isActive.value,
            [props.exactActiveClass]: isExactActive.value
          }
        },
        slots.default?.()
      );
    };
  }
});
```

**改进**：
- ✓ 支持作用域插槽自定义渲染

**作用域插槽的使用**：

```vue-html
<router-link to="/home" custom v-slot="{ href, navigate, isActive }">
  <button @click="navigate" :class="{ active: isActive }">
    <icon-home />
    <span>首页</span>
  </button>
</router-link>
```

## 完整代码

```typescript
// src/components/RouterLink.ts

import { defineComponent, h, inject, computed, PropType } from 'vue';
import { routerKey, routeKey } from '../injectionSymbols';
import type { RouteLocationRaw } from '../types';

export const RouterLink = defineComponent({
  name: 'RouterLink',
  
  props: {
    to: {
      type: [String, Object] as PropType<RouteLocationRaw>,
      required: true
    },
    replace: Boolean,
    activeClass: {
      type: String,
      default: 'router-link-active'
    },
    exactActiveClass: {
      type: String,
      default: 'router-link-exact-active'
    },
    custom: Boolean
  },
  
  setup(props, { slots }) {
    const router = inject(routerKey);
    const route = inject(routeKey);
    
    if (!router) {
      throw new Error(
        'RouterLink requires router. Did you forget app.use(router)?'
      );
    }
    
    const targetLocation = computed(() => router.resolve(props.to));
    
    const isActive = computed(() => {
      const current = route.value;
      const target = targetLocation.value;
      return current.path.startsWith(target.path);
    });
    
    const isExactActive = computed(() => {
      const current = route.value;
      const target = targetLocation.value;
      return current.fullPath === target.fullPath;
    });
    
    const navigate = (e: MouseEvent) => {
      if (
        e.metaKey || e.altKey || e.ctrlKey || e.shiftKey ||
        e.button !== 0
      ) {
        return;
      }
      
      e.preventDefault();
      const method = props.replace ? 'replace' : 'push';
      router[method](props.to);
    };
    
    return () => {
      if (props.custom && slots.default) {
        return slots.default({
          href: targetLocation.value.fullPath,
          navigate,
          isActive: isActive.value,
          isExactActive: isExactActive.value
        });
      }
      
      return h(
        'a',
        {
          href: targetLocation.value.fullPath,
          onClick: navigate,
          class: {
            [props.activeClass]: isActive.value,
            [props.exactActiveClass]: isExactActive.value
          }
        },
        slots.default?.()
      );
    };
  }
});
```

## 实战场景

### 场景1：导航菜单

```vue-html
<template>
  <nav>
    <router-link to="/">首页</router-link>
    <router-link to="/about">关于</router-link>
    <router-link to="/products">产品</router-link>
  </nav>
</template>

<style>
.router-link-active {
  color: #42b983;
  font-weight: bold;
}
</style>
```

### 场景2：命名路由

```vue-html
<router-link :to="{ name: 'User', params: { id: userId } }">
  用户详情
</router-link>
```

### 场景3：带查询参数

```vue-html
<router-link :to="{ path: '/search', query: { keyword: 'vue' } }">
  搜索结果
</router-link>
```

### 场景4：自定义渲染（按钮）

```vue-html
<router-link to="/login" custom v-slot="{ navigate, isActive }">
  <button @click="navigate" :class="{ 'btn-active': isActive }">
    登录
  </button>
</router-link>
```

### 场景5：禁用链接

```vue-html
<router-link
  :to="canAccess ? '/admin' : ''"
  :custom="!canAccess"
  v-slot="{ navigate, isActive }"
>
  <span
    @click="canAccess ? navigate : showWarning"
    :class="{ disabled: !canAccess, active: isActive }"
  >
    管理后台
  </span>
</router-link>
```

## 常见陷阱

### 陷阱1：忘记使用 computed

```typescript
// ❌ 错误
const targetLocation = router.resolve(props.to);

// ✅ 正确
const targetLocation = computed(() => router.resolve(props.to));
```

### 陷阱2：直接修改 window.location

```typescript
// ❌ 错误
const navigate = () => {
  window.location.href = props.to;  // 会刷新页面
};

// ✅ 正确
const navigate = () => {
  router.push(props.to);  // SPA 导航
};
```

### 陷阱3：阻止所有点击事件

```typescript
// ❌ 错误
const navigate = (e: MouseEvent) => {
  e.preventDefault();  // 阻止了 Cmd+点击 等特殊操作
  router.push(props.to);
};

// ✅ 正确
const navigate = (e: MouseEvent) => {
  if (e.metaKey || e.ctrlKey || e.button !== 0) {
    return;  // 保留浏览器原生行为
  }
  e.preventDefault();
  router.push(props.to);
};
```

## 小结

本章从零实现了 RouterLink 组件：

**核心功能**：
- 使用 `<a>` 标签渲染，保持语义化
- 拦截点击事件，实现 SPA 导航
- 支持字符串和路由对象
- 自动添加激活状态 class
- 支持 replace 模式
- 处理特殊按键，保留浏览器原生行为
- 支持作用域插槽自定义渲染

**设计亮点**：
- 渐进式实现，从简单到完善
- 依赖注入获取 router 和 route
- computed 确保响应式
- 特殊按键处理提升用户体验

**实战价值**：
- 理解 RouterLink 的设计动机
- 掌握组件渐进式开发方法
- 学会处理边界情况和特殊按键
- 知道如何自定义渲染逻辑

下一章实现 RouterView 组件，负责渲染匹配的路由组件。
