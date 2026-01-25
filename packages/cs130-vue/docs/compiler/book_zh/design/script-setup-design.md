# script setup 设计

script setup 是 Vue 3.2 引入的语法糖，让 Composition API 的使用更加简洁。它将 script 块本身当作 setup 函数，所有顶层绑定自动暴露给模板。这个特性需要编译器的深度支持。

## 传统写法的繁琐

使用 Composition API 的传统方式需要大量样板代码：

```vue
<script>
import { ref, computed } from 'vue'
import MyComponent from './MyComponent.vue'

export default {
  components: { MyComponent },
  setup() {
    const count = ref(0)
    const double = computed(() => count.value * 2)
    
    function increment() {
      count.value++
    }
    
    // 必须显式返回所有模板需要的绑定
    return {
      count,
      double,
      increment
    }
  }
}
</script>
```

每个变量和函数都要在 return 中声明，组件需要显式注册。这些都是可以自动完成的。

## script setup 的简洁

同样的逻辑用 script setup：

```vue
<script setup>
import { ref, computed } from 'vue'
import MyComponent from './MyComponent.vue'

const count = ref(0)
const double = computed(() => count.value * 2)

function increment() {
  count.value++
}
</script>
```

所有顶层绑定（count、double、increment）自动暴露给模板。导入的组件（MyComponent）自动可用。无需 export default，无需 return。

## 编译转换

编译器将 script setup 转换为标准的组件定义：

```javascript
import { ref, computed, defineComponent } from 'vue'
import MyComponent from './MyComponent.vue'

export default defineComponent({
  __name: 'Example',
  setup(__props, { expose }) {
    const count = ref(0)
    const double = computed(() => count.value * 2)
    
    function increment() {
      count.value++
    }
    
    // 自动生成 return
    return { count, double, increment, MyComponent }
  }
})
```

编译器做了几件事：添加 defineComponent 包装、将顶层代码放入 setup、生成 return 语句包含所有绑定、将导入的组件加入返回。

## 绑定收集

编译器需要识别哪些顶层标识符应该暴露。这包括：

变量声明（const、let、var）：

```javascript
const a = 1      // 暴露 a
let b = ref(2)   // 暴露 b
```

函数声明：

```javascript
function foo() {}  // 暴露 foo
const bar = () => {}  // 暴露 bar
```

导入：

```javascript
import { ref } from 'vue'  // 暴露 ref（作为类型或用于运行时）
import Comp from './Comp.vue'  // 暴露 Comp（作为组件）
```

类声明：

```javascript
class MyClass {}  // 暴露 MyClass
```

## 与模板的配合

模板编译需要知道哪些绑定来自 script setup。这通过 bindingMetadata 传递：

```typescript
const bindings = {
  count: BindingTypes.SETUP_REF,      // ref，需要 .value
  double: BindingTypes.SETUP_REF,     // computed 也是 ref
  increment: BindingTypes.SETUP_CONST, // 普通函数
  MyComponent: BindingTypes.SETUP_CONST // 导入的组件
}
```

模板编译器据此生成正确的访问代码：

```javascript
// 知道 count 是 ref，生成 _ctx.count（会自动解包）
// 知道 MyComponent 是组件，可以直接使用
```

## defineProps 与 defineEmits

script setup 使用编译器宏定义 props 和 emits：

```vue
<script setup>
const props = defineProps<{
  title: string
  count?: number
}>()

const emit = defineEmits<{
  (e: 'update', value: number): void
}>()
</script>
```

这些不是真正的运行时函数调用——编译器识别它们，提取类型信息，生成相应的运行时选项：

```javascript
export default {
  props: {
    title: { type: String, required: true },
    count: { type: Number, required: false }
  },
  emits: ['update'],
  setup(__props, { emit }) {
    // props 是 __props 的别名
    // emit 来自 setup context
  }
}
```

## 顶层 await

script setup 支持顶层 await，编译器将其转换为 async setup：

```vue
<script setup>
const data = await fetchData()
</script>
```

编译为：

```javascript
export default {
  async setup() {
    const data = await fetchData()
    return { data }
  }
}
```

注意这会使组件成为异步组件，需要配合 Suspense 使用。

## 类型推导

script setup 的一大优势是更好的 TypeScript 支持。因为所有绑定都在同一作用域，TypeScript 可以直接推导类型。

传统写法需要各种类型标注来帮助推导。script setup 中，模板表达式能直接获得绑定的类型信息（通过 Volar 等工具）。

## 与 Options API 共存

script setup 可以与普通 script 块共存：

```vue
<script>
export default {
  inheritAttrs: false
}
</script>

<script setup>
// setup 逻辑
</script>
```

编译器会合并两个块的内容。普通 script 块用于声明无法在 setup 中表达的选项（如 inheritAttrs、自定义选项）。

## 性能优势

script setup 不仅是语法糖，还有性能优势：

生成的代码更紧凑。没有选项对象的嵌套，直接是扁平的函数体。

模板访问更直接。编译器知道每个绑定的类型，可以生成更优化的访问代码。

更好的 minification。顶层变量可以被压缩工具安全地重命名。

## 局限性

script setup 有一些局限：

无法声明组件名称。需要额外的 defineOptions 宏或使用普通 script 块。

无法使用 render 选项。script setup 假设使用模板。

某些高级模式（如 mixins）不直接支持。

这些局限通常有替代方案，不影响大多数使用场景。

## 小结

script setup 通过编译器魔法将繁琐的 Composition API 样板代码消除，让开发者专注于逻辑本身。编译器负责收集绑定、生成导出、处理编译器宏、与模板编译配合。这种设计保持了运行时的简洁（最终还是标准的组件定义），同时提供了更好的开发体验和类型支持。理解其编译原理有助于在遇到边缘情况时做出正确的判断。
