# Options API vs Composition API

Vue 3 同时支持两种编写组件的风格：Options API 和 Composition API。这不是简单的新旧之分——两种风格各有适用场景，理解它们的本质差异，才能在项目中做出正确的选择。

## 两种思维模式

Options API 和 Composition API 代表了两种不同的代码组织思维。

Options API 按照**选项类型**组织代码：所有的状态放在 `data`，所有的计算属性放在 `computed`，所有的方法放在 `methods`，所有的监听器放在 `watch`。这种方式的好处是结构清晰、易于上手——即使是刚接触 Vue 的开发者，也能很快理解组件的整体结构。

```javascript
export default {
  data() {
    return {
      firstName: 'John',
      lastName: 'Doe',
      todos: []
    }
  },
  computed: {
    fullName() {
      return `${this.firstName} ${this.lastName}`
    },
    completedTodos() {
      return this.todos.filter(t => t.done)
    }
  },
  methods: {
    addTodo(text) {
      this.todos.push({ text, done: false })
    },
    toggleTodo(todo) {
      todo.done = !todo.done
    }
  },
  watch: {
    todos: {
      handler(newVal) {
        localStorage.setItem('todos', JSON.stringify(newVal))
      },
      deep: true
    }
  }
}
```

这段代码展示了一个包含用户信息和待办事项两个功能的组件。在 Options API 中，这两个功能的代码是交织在一起的：`firstName` 和 `lastName` 在 `data` 中与 `todos` 并列，`fullName` 计算属性和 `completedTodos` 计算属性在 `computed` 中相邻。当组件变得复杂时，要理解某个功能的完整逻辑，需要在不同选项之间来回跳转。

Composition API 按照**功能逻辑**组织代码：相关的状态、计算属性、方法放在一起，形成一个内聚的逻辑单元。

```javascript
import { ref, computed, watch } from 'vue'

export default {
  setup() {
    // ---- 用户信息功能 ----
    const firstName = ref('John')
    const lastName = ref('Doe')
    const fullName = computed(() => `${firstName.value} ${lastName.value}`)
    
    // ---- 待办事项功能 ----
    const todos = ref([])
    const completedTodos = computed(() => todos.value.filter(t => t.done))
    
    function addTodo(text) {
      todos.value.push({ text, done: false })
    }
    
    function toggleTodo(todo) {
      todo.done = !todo.done
    }
    
    watch(todos, (newVal) => {
      localStorage.setItem('todos', JSON.stringify(newVal))
    }, { deep: true })
    
    return { firstName, lastName, fullName, todos, completedTodos, addTodo, toggleTodo }
  }
}
```

在 Composition API 中，用户信息相关的代码和待办事项相关的代码被清晰地分开。更重要的是，这些逻辑可以进一步提取成独立的函数，实现真正的逻辑复用。

## 逻辑复用的革命

Vue 2.x 时代，复用逻辑的主要方式是 mixin。它可以将一组选项混入到组件中，看起来很方便：

```javascript
// 一个提供鼠标位置追踪的 mixin
const mousePositionMixin = {
  data() {
    return { x: 0, y: 0 }
  },
  mounted() {
    window.addEventListener('mousemove', this.updatePosition)
  },
  beforeDestroy() {
    window.removeEventListener('mousemove', this.updatePosition)
  },
  methods: {
    updatePosition(e) {
      this.x = e.clientX
      this.y = e.clientY
    }
  }
}

// 使用 mixin
export default {
  mixins: [mousePositionMixin],
  // ... 组件自己的选项
}
```

但 mixin 存在几个严重的问题。首先是**命名冲突**——如果 mixin 和组件都定义了 `x`，谁会覆盖谁？第二是**来源不明**——当组件使用多个 mixin 时，很难知道某个属性来自哪个 mixin。第三是**隐式依赖**——mixin 可能依赖组件提供的某些属性，但这种依赖是隐式的，不看源码根本发现不了。

Composition API 的组合式函数优雅地解决了这些问题：

```javascript
// 组合式函数：提供鼠标位置追踪
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)
  
  function updatePosition(e) {
    x.value = e.clientX
    y.value = e.clientY
  }
  
  onMounted(() => window.addEventListener('mousemove', updatePosition))
  onUnmounted(() => window.removeEventListener('mousemove', updatePosition))
  
  return { x, y }
}

// 在组件中使用
export default {
  setup() {
    const { x, y } = useMouse()
    // 或者重命名以避免冲突
    const { x: mouseX, y: mouseY } = useMouse()
    
    return { mouseX, mouseY }
  }
}
```

组合式函数的优势一目了然。变量来源清晰——`mouseX` 和 `mouseY` 明确来自 `useMouse()` 的返回值。命名冲突可控——使用解构赋值时可以重命名。依赖明确——函数的输入和输出都是显式的。

更强大的是，组合式函数可以自由组合。你可以写一个 `useWindowSize` 获取窗口尺寸，写一个 `useBreakpoint` 判断响应式断点，然后在 `useBreakpoint` 内部调用 `useWindowSize`。这种组合能力是 mixin 无法企及的。

## TypeScript 支持的差异

在类型安全越来越受重视的今天，TypeScript 支持成为一个重要的考量因素。

Options API 的类型推导是出了名的困难。`this` 的类型需要依赖复杂的类型体操，而且经常推导失败：

```typescript
export default {
  data() {
    return { count: 0 }
  },
  computed: {
    double() {
      // this 的类型推导依赖 Vue 的类型定义
      // 有时候会失败，特别是有循环依赖时
      return this.count * 2
    }
  },
  methods: {
    increment() {
      // 如果类型推导失败，this.count 会变成 any
      this.count++
    }
  }
}
```

Composition API 天生适合 TypeScript。每个变量都有独立的类型，不存在 `this` 的类型推导问题：

```typescript
import { ref, computed } from 'vue'

export default {
  setup() {
    // count 被推导为 Ref<number>
    const count = ref(0)
    
    // double 被推导为 ComputedRef<number>
    const double = computed(() => count.value * 2)
    
    // 函数参数和返回值可以显式标注
    function increment(): void {
      count.value++
    }
    
    return { count, double, increment }
  }
}
```

使用 `<script setup lang="ts">` 时，类型体验更好：

```html
<script setup lang="ts">
import { ref, computed } from 'vue'

// props 类型直接使用 TypeScript 语法
const props = defineProps<{
  title: string
  count?: number
}>()

// emits 类型
const emit = defineEmits<{
  (e: 'update', value: number): void
  (e: 'delete'): void
}>()

const localCount = ref(props.count ?? 0)
const doubled = computed(() => localCount.value * 2)
</script>
```

这种写法不仅类型安全，而且简洁优雅。props 和 emits 的类型定义既是类型声明也是运行时定义，一举两得。

## 学习曲线的对比

Options API 的学习曲线更平缓。它的结构是固定的，初学者只需要记住几个选项的用途，就能开始编写组件。`data` 放数据、`methods` 放方法、`computed` 放计算属性——这种模式简单直观。

Composition API 需要更多的前置知识。你需要理解 `ref` 和 `reactive` 的区别，需要知道什么时候用 `.value`，需要理解闭包和函数作用域。对于 JavaScript 基础不够扎实的开发者，这些概念可能是障碍。

但一旦越过这个门槛，Composition API 会回报你更强的表达能力和更好的可维护性。就像从面向过程到面向对象——起初需要学习新的思维方式，但之后会发现它能更好地处理复杂问题。

## 性能考量

从运行时性能角度看，两种 API 没有本质差异——最终都会编译成相似的运行时代码。但 Composition API 在某些场景下有一些优势。

首先是包体积。Composition API 的函数可以被 tree-shaking 优化——如果你没有使用 `watch`，那 `watch` 的代码就不会被打包。而 Options API 的方法是挂载在原型链上的，难以被 tree-shaking。

其次是 `<script setup>` 的编译优化。使用 `<script setup>` 时，编译器可以进行更多优化，因为它能静态分析出哪些变量被模板使用。变量不需要通过对象包装暴露给模板，减少了一层间接访问的开销。

```html
<!-- script setup 编译后的代码更高效 -->
<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <div>{{ count }}</div>
</template>
```

这段代码编译后，`count` 可以直接在模板中访问，不需要经过 `setup` 函数的 return 对象。这种优化在 Options API 中是无法实现的。

## 何时选择哪种风格

经过上面的分析，我们可以给出一些实践建议。

**优先使用 Composition API + `<script setup>`** 如果你的项目满足以下条件：项目使用 TypeScript；需要复用逻辑；组件逻辑复杂；团队成员有较好的 JavaScript 基础。

**可以考虑 Options API** 如果：项目是简单的应用或原型；团队成员以 Vue 初学者为主；老项目需要维护但不打算全面重构。

**两种风格可以混用**。Vue 3 完全兼容 Options API，你可以在同一个项目中根据需要选择。一个常见的策略是：新组件使用 Composition API，老组件保持 Options API，在需要复用逻辑时逐步重构。

需要强调的是，这不是对错之分，而是适用场景之分。Options API 并没有被废弃，它在某些场景下仍然是好的选择。重要的是理解两种风格的优缺点，根据实际情况做出判断。

## 深入理解：setup 的本质

要真正理解 Composition API，需要理解 `setup` 函数在组件生命周期中的位置。

`setup` 函数在组件实例创建后、`beforeCreate` 之前执行。在这个时间点，组件的 props 已经被解析，但组件实例还没有完全初始化。这就是为什么在 `setup` 中不能使用 `this`——此时还没有组件实例可供访问。

```javascript
export default {
  beforeCreate() {
    console.log('beforeCreate')  // 第二个执行
  },
  setup() {
    console.log('setup')  // 第一个执行
    // 这里 this 是 undefined
  },
  created() {
    console.log('created')  // 第三个执行
  }
}
```

`setup` 函数接收两个参数：`props` 和 `context`。`props` 是响应式的，可以用 `watch` 监听其变化。`context` 包含 `attrs`、`slots`、`emit`、`expose` 等属性，它们对应 Options API 中的 `this.$attrs`、`this.$slots`、`this.$emit` 等。

```javascript
export default {
  props: ['title'],
  emits: ['update'],
  setup(props, { attrs, slots, emit, expose }) {
    // props.title 是响应式的
    watch(() => props.title, (newTitle) => {
      console.log('title changed:', newTitle)
    })
    
    // attrs 包含非 prop 的 attribute
    console.log(attrs.class, attrs.id)
    
    // emit 用于触发事件
    function handleClick() {
      emit('update', 'new value')
    }
    
    // expose 用于限制暴露给父组件的属性
    expose({ handleClick })
    
    return { handleClick }
  }
}
```

理解了 `setup` 的执行时机和参数，你就能理解为什么 Composition API 这样设计。它提供了一个干净的函数上下文，让你可以用纯粹的 JavaScript 逻辑来组织代码，不依赖 `this` 这个魔法对象。

## 小结

Options API 和 Composition API 是 Vue 组件的两种编写风格，各有优势。Options API 结构清晰、学习曲线平缓；Composition API 逻辑内聚、复用强大、TypeScript 友好。

对于新项目，我们推荐使用 Composition API + `<script setup>`，这是目前 Vue 团队推荐的最佳实践。但如果你的场景更适合 Options API，也不必强求改变。

在接下来的章节中，我们将深入探讨 Vue3 组件系统的设计目标，理解这些 API 设计背后的深层考量。
