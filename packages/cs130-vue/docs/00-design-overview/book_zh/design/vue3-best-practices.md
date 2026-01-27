# Vue3 生态系统最佳实践

积累了社区多年的经验，Vue 3 生态形成了一系列最佳实践。这些实践不是强制的规则，而是经过验证的、能够减少问题的做法。

## 项目结构

Vue 3 项目推荐的目录结构：

```
src/
├── assets/          # 静态资源
├── components/      # 通用组件
│   ├── ui/          # UI 基础组件
│   └── business/    # 业务组件
├── composables/     # 组合式函数
├── layouts/         # 布局组件
├── pages/           # 页面组件（如果使用文件路由）
├── router/          # 路由配置
├── stores/          # Pinia stores
├── styles/          # 全局样式
├── types/           # TypeScript 类型定义
├── utils/           # 工具函数
├── App.vue
└── main.ts
```

组织原则：

- 按功能而非文件类型组织
- 组件与其相关的样式、测试放在一起
- 共享代码放在专门的目录

## Composition API 最佳实践

setup 函数的组织方式：

```vue
<script setup lang="ts">
// 1. 导入
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import type { User } from '@/types'

// 2. Props 和 Emits
const props = defineProps<{
  userId: string
}>()

const emit = defineEmits<{
  (e: 'update', user: User): void
}>()

// 3. 使用 composables
const store = useUserStore()
const { data, loading, error, execute } = useFetch(`/api/users/${props.userId}`)

// 4. 响应式状态
const isEditing = ref(false)

// 5. 计算属性
const fullName = computed(() => `${data.value?.firstName} ${data.value?.lastName}`)

// 6. 方法
function toggleEdit() {
  isEditing.value = !isEditing.value
}

// 7. 生命周期
onMounted(() => {
  execute()
})
</script>
```

## Composables 设计

Composables 是 Vue 3 代码复用的核心机制。

设计原则：

```typescript
// ✅ 好的 composable
export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  function update(event: MouseEvent) {
    x.value = event.pageX
    y.value = event.pageY
  }

  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  return { x, y }
}

// ❌ 避免：过于宽泛的 composable
export function useEverything() {
  // 包含太多不相关的功能
}
```

命名约定：

- 以 `use` 开头
- 描述功能而非实现
- 返回的 ref 不带 `.value` 后缀

## 状态管理实践

Pinia store 的组织：

```typescript
// stores/user.ts
export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref<User | null>(null)
  const loading = ref(false)
  
  // getter
  const isLoggedIn = computed(() => !!user.value)
  
  // action
  async function login(credentials: Credentials) {
    loading.value = true
    try {
      user.value = await api.login(credentials)
    } finally {
      loading.value = false
    }
  }
  
  async function logout() {
    await api.logout()
    user.value = null
  }
  
  return { user, loading, isLoggedIn, login, logout }
})
```

使用原则：

- 每个 store 聚焦一个领域
- 避免 store 之间的循环依赖
- 复杂逻辑放在 store 而非组件
- 使用 storeToRefs 解构保持响应式

## TypeScript 实践

类型定义：

```typescript
// types/user.ts
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: Date
}

export interface CreateUserDto {
  email: string
  password: string
  name: string
}

// 使用 Zod 进行运行时验证
import { z } from 'zod'

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(2),
  avatar: z.string().url().optional()
})

export type User = z.infer<typeof UserSchema>
```

Props 类型：

```vue
<script setup lang="ts">
// 使用泛型定义 props
defineProps<{
  title: string
  count?: number
  items: string[]
}>()

// 带默认值
withDefaults(defineProps<{
  title: string
  count?: number
}>(), {
  count: 0
})
</script>
```

## 性能优化实践

组件优化：

```vue
<script setup>
import { shallowRef, markRaw } from 'vue'

// 对于大型对象，使用 shallowRef
const largeData = shallowRef(initialData)

// 对于不需要响应式的对象，使用 markRaw
const chartInstance = markRaw(new ChartLibrary())
</script>
```

列表渲染：

```vue
<template>
  <!-- 始终使用 key -->
  <div v-for="item in items" :key="item.id">
    {{ item.name }}
  </div>
  
  <!-- 避免 v-if 和 v-for 同时使用 -->
  <template v-for="item in items" :key="item.id">
    <div v-if="item.visible">{{ item.name }}</div>
  </template>
</template>
```

懒加载：

```typescript
// 路由懒加载
const routes = [
  {
    path: '/admin',
    component: () => import('@/pages/Admin.vue')
  }
]

// 组件懒加载
import { defineAsyncComponent } from 'vue'

const HeavyComponent = defineAsyncComponent(() =>
  import('@/components/HeavyComponent.vue')
)
```

## 测试实践

组件测试：

```typescript
// components/__tests__/UserCard.test.ts
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import UserCard from '../UserCard.vue'

describe('UserCard', () => {
  it('displays user name', () => {
    const wrapper = mount(UserCard, {
      props: {
        user: { id: '1', name: 'John' }
      },
      global: {
        plugins: [createTestingPinia()]
      }
    })
    
    expect(wrapper.text()).toContain('John')
  })
})
```

Store 测试：

```typescript
// stores/__tests__/user.test.ts
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '../user'

describe('User Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('login sets user', async () => {
    const store = useUserStore()
    await store.login({ email: 'test@example.com', password: '123' })
    expect(store.user).toBeDefined()
  })
})
```

## 错误处理

全局错误处理：

```typescript
// main.ts
app.config.errorHandler = (err, instance, info) => {
  // 上报错误
  reportError(err, { component: instance?.$options.name, info })
  
  // 开发环境打印
  if (import.meta.env.DEV) {
    console.error(err)
  }
}
```

组件级错误边界：

```vue
<template>
  <ErrorBoundary @error="handleError">
    <ChildComponent />
    <template #fallback="{ error }">
      <div>出错了：{{ error.message }}</div>
    </template>
  </ErrorBoundary>
</template>
```

## 安全实践

防止 XSS：

```vue
<template>
  <!-- ✅ 安全：自动转义 -->
  <div>{{ userInput }}</div>
  
  <!-- ❌ 危险：除非内容可信 -->
  <div v-html="userHtml"></div>
</template>
```

API 请求：

```typescript
// 统一的请求封装
const request = async (url: string, options: RequestOptions) => {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',  // 携带 cookie
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCSRFToken()  // CSRF 保护
    }
  })
  
  if (!response.ok) {
    throw new APIError(response.status, await response.json())
  }
  
  return response.json()
}
```

这些实践代表了 Vue 3 生态的成熟经验。遵循这些实践可以减少常见问题，提高代码质量。但更重要的是理解实践背后的原理，这样才能在具体场景中灵活应用。
