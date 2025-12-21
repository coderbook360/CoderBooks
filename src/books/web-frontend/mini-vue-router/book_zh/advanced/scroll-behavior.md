# 滚动行为控制

路由跳转时如何控制页面滚动？本章实现完整的滚动行为管理系统。

## 滚动行为的挑战

首先要问一个问题：**为什么需要滚动行为控制？**

### 默认浏览器行为的问题

```typescript
// 默认行为
router.push('/about');  // 页面保持当前滚动位置
```

**问题**：
- ✗ 新页面可能停留在中间位置，不在顶部
- ✗ 浏览器后退时，滚动位置无法恢复
- ✗ 锚点跳转不工作
- ✗ 无法自定义滚动动画

### 理想的滚动行为

1. **新页面**：滚动到顶部
2. **浏览器后退/前进**：恢复之前的滚动位置
3. **锚点链接**：滚动到指定元素
4. **平滑滚动**：过渡动画

## 设计 scrollBehavior API

```typescript
interface ScrollBehaviorOptions {
  scrollBehavior?: (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    savedPosition: ScrollPosition | null
  ) => ScrollPositionResult | Promise<ScrollPositionResult>;
}

interface ScrollPosition {
  left: number;
  top: number;
}

type ScrollPositionResult =
  | ScrollPosition
  | { el: string | Element; top?: number; left?: number; behavior?: ScrollBehavior }
  | false;
```

**参数说明**：
- `to`：目标路由
- `from`：来源路由
- `savedPosition`：浏览器后退/前进时保存的位置

**返回值**：
- `ScrollPosition`：滚动到指定坐标
- `{ el }`：滚动到指定元素
- `false`：不滚动
- `Promise`：异步滚动

## 渐进式实现

### 版本 1：基础实现

```typescript
// src/router.ts

export function createRouter(options: RouterOptions) {
  const router = {
    // ...其他方法
    
    push(to) {
      // 导航逻辑...
      
      // 导航完成后滚动
      handleScroll(targetRoute, currentRoute, null);
    }
  };
  
  return router;
}

function handleScroll(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  savedPosition: ScrollPosition | null
) {
  // 如果没有配置，使用默认行为
  if (!options.scrollBehavior) {
    return;
  }
  
  // 调用用户配置的函数
  const result = options.scrollBehavior(to, from, savedPosition);
  
  // 应用滚动
  if (result) {
    window.scrollTo(result);
  }
}
```

**基础使用**：

```typescript
const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    // 总是滚动到顶部
    return { left: 0, top: 0 };
  }
});
```

### 版本 2：支持 savedPosition

```typescript
function handleScroll(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  savedPosition: ScrollPosition | null
) {
  if (!options.scrollBehavior) {
    return;
  }
  
  const result = options.scrollBehavior(to, from, savedPosition);
  
  if (!result) return;
  
  window.scrollTo(result);
}
```

**使用 savedPosition**：

```typescript
const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    // 浏览器后退/前进时恢复位置
    if (savedPosition) {
      return savedPosition;
    }
    // 否则滚动到顶部
    return { left: 0, top: 0 };
  }
});
```

**savedPosition 从哪来？**

```typescript
// History 实现中保存滚动位置
function saveScrollPosition() {
  const position = {
    left: window.pageXOffset,
    top: window.pageYOffset
  };
  history.replaceState(
    { ...history.state, scroll: position },
    ''
  );
}

// popstate 时获取
window.addEventListener('popstate', (e) => {
  const savedPosition = e.state?.scroll || null;
  handleScroll(to, from, savedPosition);
});
```

### 版本 3：支持锚点滚动

```typescript
function handleScroll(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  savedPosition: ScrollPosition | null
) {
  if (!options.scrollBehavior) {
    return;
  }
  
  const result = options.scrollBehavior(to, from, savedPosition);
  
  if (!result) return;
  
  // 新增：处理元素选择器
  if ('el' in result) {
    const el = typeof result.el === 'string'
      ? document.querySelector(result.el)
      : result.el;
    
    if (el) {
      el.scrollIntoView({ behavior: result.behavior || 'auto' });
    }
  } else {
    window.scrollTo(result);
  }
}
```

**锚点跳转**：

```typescript
const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    // 如果有 hash，滚动到对应元素
    if (to.hash) {
      return { el: to.hash };
    }
    return { left: 0, top: 0 };
  }
});

// 使用
router.push('/page#section-2');  // 滚动到 #section-2
```

### 版本 4：支持平滑滚动

```typescript
const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth'  // 平滑滚动
      };
    }
    return { left: 0, top: 0 };
  }
});
```

### 版本 5：异步滚动

```typescript
function handleScroll(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  savedPosition: ScrollPosition | null
) {
  if (!options.scrollBehavior) {
    return;
  }
  
  const result = options.scrollBehavior(to, from, savedPosition);
  
  // 新增：支持 Promise
  Promise.resolve(result).then((position) => {
    if (!position) return;
    
    if ('el' in position) {
      const el = typeof position.el === 'string'
        ? document.querySelector(position.el)
        : position.el;
      
      if (el) {
        el.scrollIntoView({
          behavior: position.behavior || 'auto',
          block: 'start'
        });
      }
    } else {
      window.scrollTo({
        ...position,
        behavior: position.behavior || 'auto'
      });
    }
  });
}
```

**异步等待元素加载**：

```typescript
const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      // 等待元素渲染后再滚动
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ el: to.hash, behavior: 'smooth' });
        }, 500);
      });
    }
    return { left: 0, top: 0 };
  }
});
```

## 完整实现

```typescript
// src/scrollBehavior.ts

import type {
  RouteLocationNormalized,
  ScrollPosition,
  ScrollPositionResult
} from './types';

export function handleScroll(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  savedPosition: ScrollPosition | null,
  scrollBehavior?: Function
): Promise<void> {
  return new Promise((resolve) => {
    if (!scrollBehavior) {
      resolve();
      return;
    }
    
    const result = scrollBehavior(to, from, savedPosition);
    
    Promise.resolve(result).then((position) => {
      if (!position) {
        resolve();
        return;
      }
      
      // 等待 DOM 更新
      nextTick(() => {
        if ('el' in position) {
          scrollToElement(position);
        } else {
          window.scrollTo({
            left: position.left ?? 0,
            top: position.top ?? 0,
            behavior: position.behavior || 'auto'
          });
        }
        resolve();
      });
    });
  });
}

function scrollToElement(position: {
  el: string | Element;
  top?: number;
  left?: number;
  behavior?: ScrollBehavior;
}) {
  const el = typeof position.el === 'string'
    ? document.querySelector(position.el)
    : position.el;
  
  if (!el) {
    console.warn(`Element not found: ${position.el}`);
    return;
  }
  
  const rect = el.getBoundingClientRect();
  const scrollTop = window.pageYOffset + rect.top + (position.top ?? 0);
  const scrollLeft = window.pageXOffset + rect.left + (position.left ?? 0);
  
  window.scrollTo({
    left: scrollLeft,
    top: scrollTop,
    behavior: position.behavior || 'auto'
  });
}
```

## 实战场景

### 场景1：基础配置

```typescript
const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { left: 0, top: 0 };
  }
});
```

### 场景2：锚点导航

```typescript
const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
        top: -80  // 偏移导航栏高度
      };
    }
    return { left: 0, top: 0 };
  }
});
```

### 场景3：页面切换动画配合

```typescript
const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      // 等待页面切换动画完成
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(savedPosition);
        }, 300);
      });
    }
    return { left: 0, top: 0 };
  }
});
```

### 场景4：特定路由不滚动

```typescript
const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    // 模态框路由不滚动
    if (to.meta.modal) {
      return false;
    }
    if (savedPosition) {
      return savedPosition;
    }
    return { left: 0, top: 0 };
  }
});
```

### 场景5：保存滚动位置到 Session Storage

```typescript
const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    // 从 sessionStorage 恢复
    const key = `scroll_${from.fullPath}`;
    const saved = sessionStorage.getItem(key);
    
    if (saved) {
      return JSON.parse(saved);
    }
    
    return { left: 0, top: 0 };
  }
});

// 离开页面时保存
router.beforeEach((to, from) => {
  const position = {
    left: window.pageXOffset,
    top: window.pageYOffset
  };
  const key = `scroll_${from.fullPath}`;
  sessionStorage.setItem(key, JSON.stringify(position));
});
```

## 常见陷阱

### 陷阱1：忘记等待 DOM 更新

```typescript
// ❌ 错误
router.push('/page#section');
scrollToHash();  // 元素可能还未渲染

// ✅ 正确
await router.push('/page#section');
await nextTick();
scrollToHash();
```

### 陷阱2：固定定位导航栏遮挡

```typescript
// ❌ 错误
return { el: to.hash };

// ✅ 正确：偏移导航栏高度
return {
  el: to.hash,
  top: -80  // 导航栏高度
};
```

### 陷阱3：异步组件未加载

```typescript
// ✅ 正确：等待组件加载
const router = createRouter({
  scrollBehavior(to, from, savedPosition) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ el: to.hash });
      }, 100);  // 等待异步组件
    });
  }
});
```

## 小结

本章实现了完整的滚动行为控制：

**核心功能**：
- 新页面滚动到顶部
- 浏览器后退/前进恢复位置
- 锚点跳转
- 平滑滚动
- 异步滚动

**设计亮点**：
- 支持同步和异步返回值
- 支持元素选择器和坐标
- 与 History API 集成

**实战价值**：
- 提升用户体验
- 符合用户预期
- 灵活可定制

下一章实现路由元信息与权限控制。
