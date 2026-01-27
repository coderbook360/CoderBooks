# Props/Emits/Slots 通信设计

组件之间的通信是构建复杂用户界面的基础。Vue 提供了三种核心的组件通信机制：Props 用于向下传递数据、Emits 用于向上发送事件、Slots 用于传递内容片段。这三种机制的设计体现了 Vue 对「单向数据流」和「关注点分离」原则的坚持，同时提供了足够的灵活性来满足各种复杂场景的需求。

## 单向数据流：Props 的设计哲学

Props 是父组件向子组件传递数据的机制。Vue 的 Props 设计遵循严格的单向数据流原则：数据只能从父组件流向子组件，子组件不能直接修改接收到的 Props。

```vue
<!-- 父组件 -->
<template>
  <UserProfile 
    :user="currentUser" 
    :editable="canEdit"
    theme="dark"
  />
</template>

<!-- 子组件 UserProfile.vue -->
<script setup>
const props = defineProps({
  user: {
    type: Object,
    required: true
  },
  editable: {
    type: Boolean,
    default: false
  },
  theme: {
    type: String,
    default: 'light',
    validator: (value) => ['light', 'dark', 'auto'].includes(value)
  }
})
</script>
```

单向数据流的设计有深刻的工程意义。当应用出现问题时，数据的流向是可追溯的——如果某个状态出了问题，你只需要沿着组件树向上查找，就能定位到数据的源头。如果允许子组件直接修改 Props，数据就可能在任何地方被改变，调试将变成噩梦。

Vue 通过运行时检查来强制执行这一原则。如果你尝试在子组件中直接修改 Props，开发环境下会收到警告：

```javascript
// ❌ 这会触发警告
props.user.name = 'New Name'  // 对于对象类型的 props，技术上可以修改，但不推荐
props.editable = true  // 这会被 Vue 阻止并发出警告
```

当子组件需要基于 Props 维护本地状态时，推荐的模式是创建一个本地副本：

```javascript
const props = defineProps(['initialValue'])

// 使用 prop 的值初始化本地状态
const localValue = ref(props.initialValue)

// 或者使用 computed 进行转换
const formattedValue = computed(() => {
  return props.initialValue.toUpperCase()
})
```

Props 的类型系统是 Vue 组件接口设计的重要组成部分。通过声明 Props 的类型、默认值和验证器，组件明确地定义了它的输入契约：

```javascript
const props = defineProps({
  // 基础类型检查
  propA: Number,
  
  // 多种类型
  propB: [String, Number],
  
  // 必填字段
  propC: {
    type: String,
    required: true
  },
  
  // 带默认值的对象
  propD: {
    type: Object,
    default: () => ({ key: 'value' })  // 对象和数组的默认值必须是工厂函数
  },
  
  // 自定义验证
  propE: {
    type: Number,
    validator: (value) => {
      return value >= 0 && value <= 100
    }
  }
})
```

## 事件通信：Emits 的设计考量

如果 Props 是「向下的数据管道」，那么 Emits 就是「向上的事件通道」。当子组件需要通知父组件某些事情发生时，它通过发射事件来实现，而不是直接操作父组件的状态。

```vue
<!-- 子组件 -->
<script setup>
const emit = defineEmits(['update', 'delete', 'validate'])

function handleSave() {
  // 发射事件，可以携带数据
  emit('update', { id: 1, name: 'Updated Name' })
}

function handleDelete() {
  emit('delete', 1)
}
</script>

<!-- 父组件 -->
<template>
  <EditForm 
    @update="handleUpdate"
    @delete="handleDelete"
    @validate="handleValidate"
  />
</template>
```

Vue 3 引入了 `defineEmits` 来声明组件发射的事件，这与 `defineProps` 形成对称。显式声明事件有几个好处：它作为组件的文档，帮助使用者理解组件会发射哪些事件；它为 IDE 和 TypeScript 提供了类型推断的基础；它也允许 Vue 在开发环境进行验证。

```javascript
// 带验证的事件声明
const emit = defineEmits({
  // 无验证
  click: null,
  
  // 带验证函数
  update: (payload) => {
    if (typeof payload.id !== 'number') {
      console.warn('update 事件的 payload 必须包含数字类型的 id')
      return false
    }
    return true
  },
  
  // TypeScript 类型声明
  submit: (email: string, password: string) => {
    return email.length > 0 && password.length > 0
  }
})
```

Vue 3 对 `v-model` 的设计也与事件通信密切相关。`v-model` 本质上是 Props 和 Emits 的语法糖，它将双向绑定分解为单向的数据流加事件通信：

```vue
<!-- 使用 v-model -->
<CustomInput v-model="searchText" />

<!-- 等价于 -->
<CustomInput 
  :modelValue="searchText"
  @update:modelValue="searchText = $event"
/>
```

在组件内部实现 `v-model` 支持：

```vue
<script setup>
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])

function updateValue(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <input :value="modelValue" @input="updateValue" />
</template>
```

Vue 3 还支持多个 `v-model` 绑定，使得复杂表单组件的设计更加优雅：

```vue
<UserForm
  v-model:firstName="user.firstName"
  v-model:lastName="user.lastName"
  v-model:email="user.email"
/>
```

## 插槽的灵活性

Props 传递的是数据，而 Slots 传递的是「内容」——可以是静态的 HTML，可以是动态的模板片段，甚至可以是其他组件。插槽机制使得组件的复用性达到了新的高度，父组件可以「注入」内容到子组件的特定位置。

最基本的插槽使用：

```vue
<!-- 子组件 Card.vue -->
<template>
  <div class="card">
    <div class="card-header">
      <slot name="header">默认标题</slot>
    </div>
    <div class="card-body">
      <slot>默认内容</slot>
    </div>
    <div class="card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<!-- 父组件使用 -->
<template>
  <Card>
    <template #header>
      <h2>自定义标题</h2>
    </template>
    
    <p>这是卡片的主要内容</p>
    
    <template #footer>
      <button>确认</button>
      <button>取消</button>
    </template>
  </Card>
</template>
```

插槽的真正威力在于「作用域插槽」。它允许子组件向插槽内容暴露数据，父组件可以使用这些数据来渲染自定义内容。这种模式实现了「渲染控制权的反转」：

```vue
<!-- 子组件 DataList.vue -->
<script setup>
const props = defineProps(['items'])
</script>

<template>
  <ul>
    <li v-for="(item, index) in items" :key="item.id">
      <!-- 将 item 和 index 暴露给父组件 -->
      <slot :item="item" :index="index">
        {{ item.name }}
      </slot>
    </li>
  </ul>
</template>

<!-- 父组件使用 -->
<template>
  <DataList :items="users">
    <template #default="{ item, index }">
      <div class="user-row">
        <span class="index">{{ index + 1 }}</span>
        <img :src="item.avatar" />
        <span class="name">{{ item.name }}</span>
        <button @click="deleteUser(item.id)">删除</button>
      </div>
    </template>
  </DataList>
</template>
```

这种模式被称为「Renderless Components」或「无渲染组件」。子组件负责逻辑（数据获取、状态管理、行为处理），而将渲染的控制权完全交给父组件。这是一种强大的逻辑复用模式：

```vue
<!-- 无渲染的鼠标位置追踪组件 -->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const x = ref(0)
const y = ref(0)

function update(event) {
  x.value = event.pageX
  y.value = event.pageY
}

onMounted(() => window.addEventListener('mousemove', update))
onUnmounted(() => window.removeEventListener('mousemove', update))
</script>

<template>
  <slot :x="x" :y="y"></slot>
</template>

<!-- 使用 -->
<MouseTracker v-slot="{ x, y }">
  <div>鼠标位置: {{ x }}, {{ y }}</div>
</MouseTracker>
```

## 通信机制的协作

在实际应用中，Props、Emits 和 Slots 往往需要协同工作。一个设计良好的组件会合理运用这三种机制，让组件既灵活又易用。

考虑一个模态对话框组件的设计：

```vue
<script setup>
const props = defineProps({
  visible: Boolean,
  title: String,
  width: {
    type: String,
    default: '500px'
  },
  closable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:visible', 'open', 'close', 'confirm', 'cancel'])

function close() {
  emit('update:visible', false)
  emit('close')
}

function confirm() {
  emit('confirm')
  close()
}

function cancel() {
  emit('cancel')
  close()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="closable && close()">
        <div class="modal" :style="{ width }">
          <div class="modal-header">
            <slot name="header">
              <h3>{{ title }}</h3>
            </slot>
            <button v-if="closable" class="close-btn" @click="close">×</button>
          </div>
          
          <div class="modal-body">
            <slot></slot>
          </div>
          
          <div class="modal-footer">
            <slot name="footer" :confirm="confirm" :cancel="cancel">
              <button @click="cancel">取消</button>
              <button @click="confirm">确认</button>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
```

这个组件展示了三种通信机制的协作：Props 控制可见性、标题和配置；Emits 通知父组件各种事件的发生；Slots 允许父组件自定义头部、内容和底部区域，作用域插槽还将 `confirm` 和 `cancel` 方法暴露给父组件，让自定义的 footer 也能触发标准行为。

理解这三种通信机制的设计意图，是写出高质量 Vue 组件的关键。Props 定义了组件「需要什么」，Emits 定义了组件「会做什么」，Slots 定义了组件「允许定制什么」。它们共同构成了组件的公共 API，也决定了组件的复用性和灵活性。
