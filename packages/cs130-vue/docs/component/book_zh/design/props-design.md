# Props 设计思想

Props 是组件接收外部输入的主要通道。在 Vue 的组件模型中，props 不仅是数据传递的机制，更承载着组件契约的设计理念。一个设计良好的 props 接口，是可复用组件的基础。

## 单向数据流的基石

Vue 采用单向数据流的设计：数据从父组件通过 props 流向子组件，子组件不能直接修改 props。这个设计看似增加了代码量——子组件想改变数据需要通过事件通知父组件——但它带来的可维护性收益是巨大的。

想象一下，如果子组件可以随意修改 props 会发生什么。当一个 props 被多个子组件共享时，任何一个子组件都可能在任何时候修改它。数据的变化变得不可追踪，调试时你不知道是哪个组件在什么时候改变了数据。

单向数据流让数据的流动变得可预测。所有的状态变更都发生在拥有该状态的组件中，子组件只能"请求"变更，而不能直接执行。这种约束在小型应用中可能显得繁琐，但在大型应用中是不可或缺的秩序保障。

```javascript
// 子组件尝试修改 props 会收到警告
export default {
  props: ['count'],
  methods: {
    increment() {
      // 警告：Attempting to mutate prop "count"
      this.count++
    }
  }
}

// 正确的做法：通过事件请求父组件修改
export default {
  props: ['count'],
  emits: ['update:count'],
  methods: {
    increment() {
      this.$emit('update:count', this.count + 1)
    }
  }
}
```

Vue 在开发模式下会检测 props 的直接修改并发出警告。这不是技术上的限制（JavaScript 无法真正阻止对象属性的修改），而是一种规范的强制执行。

## Props 的声明方式

Vue 提供了灵活的 props 声明方式，从简单到完整，适应不同的场景需求。

最简单的方式是使用字符串数组，只声明 props 的名称：

```javascript
export default {
  props: ['title', 'content', 'author']
}
```

这种方式适合快速原型开发，但缺少类型检查和文档价值。

对象形式允许声明类型：

```javascript
export default {
  props: {
    title: String,
    count: Number,
    isActive: Boolean,
    items: Array,
    config: Object,
    callback: Function
  }
}
```

每个 prop 对应一个构造函数作为类型。Vue 在运行时会检查传入的值是否符合声明的类型，不符合时在开发模式发出警告。

完整的对象形式提供了最大的控制力：

```javascript
export default {
  props: {
    // 必填的字符串
    title: {
      type: String,
      required: true
    },
    // 带默认值的数字
    count: {
      type: Number,
      default: 0
    },
    // 多种类型
    value: {
      type: [String, Number]
    },
    // 对象/数组的默认值必须是工厂函数
    items: {
      type: Array,
      default: () => []
    },
    // 自定义验证
    status: {
      type: String,
      validator: (value) => {
        return ['pending', 'success', 'error'].includes(value)
      }
    }
  }
}
```

这段代码展示了 props 声明的各种能力。`required` 标记必填项，`default` 提供默认值，`validator` 定义自定义验证逻辑。对于对象和数组类型，默认值必须通过工厂函数返回，以确保每个组件实例获得独立的默认对象，避免实例间的状态污染。

在 TypeScript 环境中，`<script setup>` 提供了更优雅的类型声明方式：

```vue
<script setup lang="ts">
interface Item {
  id: number
  name: string
}

const props = defineProps<{
  title: string
  count?: number
  items: Item[]
}>()

// 带默认值的写法
const props = withDefaults(defineProps<{
  title: string
  count?: number
}>(), {
  count: 0
})
</script>
```

`defineProps` 使用 TypeScript 类型语法，编译器会自动生成对应的运行时验证代码。这实现了类型定义和运行时检查的统一，避免了两者不一致的问题。

## Props 的响应式设计

传入组件的 props 是响应式的——当父组件更新 props 时，子组件会自动重新渲染。但这个响应式有一些需要理解的细节。

首先，整个 `props` 对象是响应式的，但不能对其解构：

```javascript
export default {
  props: ['title'],
  setup(props) {
    // 错误：解构后丢失响应式
    const { title } = props
    
    // title 是一个普通字符串，不会跟踪 props.title 的变化
    watchEffect(() => {
      console.log(title)  // 只打印初始值
    })
    
    // 正确：保持通过 props 对象访问
    watchEffect(() => {
      console.log(props.title)  // 会跟踪变化
    })
    
    // 或者使用 toRefs 保持响应式
    const { title: titleRef } = toRefs(props)
    watchEffect(() => {
      console.log(titleRef.value)  // 会跟踪变化
    })
  }
}
```

这个行为源于 Vue 响应式系统的工作原理。`props` 对象是一个响应式代理，对它属性的访问会被追踪。但当你解构时，只是复制了当时的值，后续的变化就无法追踪了。

`toRefs` 解决了这个问题——它将 props 的每个属性转换为独立的 ref，保持响应式连接。如果你需要将 props 传递给组合式函数，通常需要使用这种方式。

## Props 的规范化过程

无论开发者使用哪种声明方式，Vue 内部都会将 props 规范化为统一的格式。这个过程由 `normalizePropsOptions` 函数完成。

```javascript
// 规范化前的各种写法
props: ['title']
props: { title: String }
props: { title: { type: String, required: true } }

// 规范化后的统一格式
normalizedProps = {
  title: {
    type: String,
    required: true,
    default: undefined,
    validator: undefined
  }
}
```

规范化带来几个好处。首先是一致性——后续的处理逻辑只需要处理一种格式。其次是性能——规范化的结果会被缓存，同一个组件定义的多个实例共享规范化结果，避免重复计算。

Vue 还会处理一些特殊情况，比如 prop 名称的转换。在 DOM 中，attribute 名称是大小写不敏感的，所以 Vue 会自动将 camelCase 的 prop 名转换为 kebab-case：

```vue
<!-- 模板中使用 kebab-case -->
<MyComponent my-prop="value" />

<!-- 组件内部使用 camelCase -->
<script>
export default {
  props: ['myProp']  // 自动匹配 my-prop
}
</script>
```

## Props 验证机制

Props 验证是组件健壮性的重要保障。当 props 验证失败时，Vue 会在控制台输出详细的警告信息，包括组件名、prop 名、期望类型、实际值等。

```javascript
export default {
  name: 'UserCard',
  props: {
    age: {
      type: Number,
      validator: (value) => value >= 0 && value <= 150
    }
  }
}

// 使用时
<UserCard :age="200" />
// 警告：Invalid prop: custom validator check failed for prop "age".
```

验证发生在组件 setup 之前，这意味着在 setup 函数中你可以安全地假设 props 已经通过验证。当然，这只是开发时的检查——生产构建中验证代码会被移除以减少包体积。

类型验证支持多种类型，包括 JavaScript 内置类型和自定义类：

```javascript
class Person {
  constructor(name) {
    this.name = name
  }
}

export default {
  props: {
    // 内置类型
    name: String,
    count: Number,
    isActive: Boolean,
    items: Array,
    config: Object,
    callback: Function,
    date: Date,
    pattern: RegExp,
    
    // 自定义类
    author: Person,
    
    // 多类型
    id: [String, Number]
  }
}
```

对于自定义类，Vue 使用 `instanceof` 进行检查。这在某些复杂场景下很有用，比如你可以验证传入的是否是某个特定类的实例。

## Boolean 类型的特殊处理

Boolean 类型的 props 有一些特殊的转换规则，这是为了让模板使用更加方便。

```vue
<!-- 不传值时，Boolean prop 为 true -->
<MyComponent disabled />

<!-- 传空字符串时，Boolean prop 也为 true -->
<MyComponent disabled="" />

<!-- 显式传 false -->
<MyComponent :disabled="false" />
```

这个行为模仿了原生 HTML 的 boolean attributes（如 disabled、checked）。当你写 `<input disabled>` 时，disabled 属性的存在本身就表示 true。Vue 将这个约定延续到了组件 props。

当一个 prop 同时允许 Boolean 和 String 类型时，规则会更复杂：

```javascript
props: {
  // String 在前，空字符串被视为空字符串
  value: [String, Boolean],
  
  // Boolean 在前，空字符串被视为 true
  value: [Boolean, String]
}
```

类型数组中 Boolean 的位置决定了空字符串的解析方式。这个细节很少用到，但在设计通用组件库时可能会遇到。

## Props 与 Attrs 的分离

传给组件的 attributes 分为两类：被声明为 props 的和未被声明的。未被声明的称为"透传 attributes"（fallthrough attributes），可以通过 `$attrs` 访问。

```vue
<script>
export default {
  props: ['title'],
  mounted() {
    // 如果父组件传了 class="wrapper" id="main"
    console.log(this.$attrs)  // { class: 'wrapper', id: 'main' }
  }
}
</script>
```

默认情况下，透传 attributes 会自动应用到组件的根元素上。这让封装组件变得简单——用户传的 class、style、事件监听器等可以自然地"穿透"到内部：

```vue
<!-- 父组件 -->
<MyButton class="primary" @click="handleClick" />

<!-- MyButton 组件模板 -->
<template>
  <button>Click me</button>
</template>

<!-- 实际渲染结果 -->
<button class="primary">Click me</button>
<!-- click 事件也会绑定到 button 上 -->
```

这种自动继承行为可以通过 `inheritAttrs: false` 禁用，然后手动控制 attrs 的应用位置：

```vue
<script>
export default {
  inheritAttrs: false,
  props: ['label']
}
</script>

<template>
  <div class="wrapper">
    <!-- 将 attrs 应用到内部元素 -->
    <input v-bind="$attrs" />
    <label>{{ label }}</label>
  </div>
</template>
```

这在封装表单控件等场景非常有用——你希望 class 应用到外层容器，但事件监听器应用到 input 元素。

## 设计良好的 Props 接口

Props 是组件的公开接口，设计得好不好直接影响组件的易用性和可维护性。这里有一些设计原则。

**保持 props 数量适中**。如果一个组件需要超过 7-10 个 props，可能意味着它承担了太多职责，应该考虑拆分成更小的组件，或者将相关的 props 组合成一个配置对象。

**使用明确的命名**。Prop 名应该清楚地表达其用途。比如 `isLoading` 比 `loading` 更明确地表示这是一个布尔值，`onClose` 比 `close` 更明确地表示这是一个回调函数。

**提供合理的默认值**。让组件在最简使用时就能正常工作，用户只需要传递必要的 props。可选的定制通过带默认值的 props 提供。

**考虑 v-model 支持**。如果组件需要双向绑定，遵循 v-model 的约定（使用 `modelValue` prop 和 `update:modelValue` 事件），让使用者可以用 `v-model` 语法。

**文档化**。对于组件库，每个 prop 的类型、默认值、可选值范围都应该有清晰的文档。TypeScript 类型定义本身就是一种文档。

## 小结

Props 是 Vue 组件通信的核心机制之一，承载着单向数据流的设计理念。Vue 提供了灵活的声明方式、完善的验证机制、以及响应式的更新能力。理解 props 的规范化过程和验证机制，有助于设计更健壮的组件接口。

在下一章中，我们将探讨 Emits——组件向外发送消息的机制，它与 Props 共同构成了组件通信的完整图景。
