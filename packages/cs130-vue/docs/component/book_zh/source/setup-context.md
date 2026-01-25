# setupContext 上下文对象

setupContext 是 setup 函数的第二个参数，提供了 attrs、slots、emit 和 expose 四个核心能力。

## 创建条件

```typescript
const setupContext = (instance.setupContext =
  setup.length > 1 ? createSetupContext(instance) : null)
```

只有当 setup 函数声明了两个参数时才创建 setupContext，这是一种性能优化。

## createSetupContext 实现

```typescript
export function createSetupContext(
  instance: ComponentInternalInstance
): SetupContext {
  const expose: SetupContext['expose'] = exposed => {
    if (__DEV__) {
      if (instance.exposed) {
        warn(`expose() should be called only once per setup().`)
      }
      if (exposed != null) {
        let exposedType: string = typeof exposed
        if (exposedType === 'object') {
          if (isArray(exposed)) {
            exposedType = 'array'
          } else if (isRef(exposed)) {
            exposedType = 'ref'
          }
        }
        if (exposedType !== 'object') {
          warn(
            `expose() should be passed a plain object, received ${exposedType}.`
          )
        }
      }
    }
    instance.exposed = exposed || {}
  }

  if (__DEV__) {
    // 开发环境：冻结对象，使用 getter
    return Object.freeze({
      get attrs() {
        return getAttrsProxy(instance)
      },
      get slots() {
        return getSlotsProxy(instance)
      },
      get emit() {
        return (event: string, ...args: any[]) => instance.emit(event, ...args)
      },
      expose
    })
  } else {
    // 生产环境：简化实现
    return {
      get attrs() {
        return getAttrsProxy(instance)
      },
      slots: instance.slots,
      emit: instance.emit,
      expose
    }
  }
}
```

## attrs 属性

attrs 包含未在 props 中声明的属性：

```typescript
function getAttrsProxy(instance: ComponentInternalInstance): Data {
  return (
    instance.attrsProxy ||
    (instance.attrsProxy = new Proxy(
      instance.attrs,
      __DEV__
        ? {
            get(target, key: string) {
              markAttrsAccessed()
              track(instance, TrackOpTypes.GET, '$attrs')
              return target[key]
            },
            set() {
              warn(`setupContext.attrs is readonly.`)
              return false
            },
            deleteProperty() {
              warn(`setupContext.attrs is readonly.`)
              return false
            }
          }
        : {
            get(target, key: string) {
              track(instance, TrackOpTypes.GET, '$attrs')
              return target[key]
            }
          }
    ))
  )
}
```

attrs 是响应式的，访问时会追踪依赖。

## slots 属性

```typescript
function getSlotsProxy(instance: ComponentInternalInstance): Slots {
  return (
    instance.slotsProxy ||
    (instance.slotsProxy = new Proxy(instance.slots, {
      get(target, key: string) {
        track(instance, TrackOpTypes.GET, '$slots')
        return target[key]
      }
    }))
  )
}
```

slots 同样是响应式的，插槽变化会触发更新。

## emit 方法

```typescript
get emit() {
  return (event: string, ...args: any[]) => instance.emit(event, ...args)
}
```

emit 绑定到组件实例，调用时会查找并执行对应的事件处理器。

## expose 方法

```typescript
const expose: SetupContext['expose'] = exposed => {
  if (__DEV__ && instance.exposed) {
    warn(`expose() should be called only once per setup().`)
  }
  instance.exposed = exposed || {}
}
```

expose 将指定的属性暴露给父组件的 ref：

```typescript
// 子组件
setup(props, { expose }) {
  const count = ref(0)
  const increment = () => count.value++
  
  // 只暴露 increment 方法
  expose({ increment })
  
  return { count, increment }
}

// 父组件
const childRef = ref()
childRef.value.increment()  // 可以访问
childRef.value.count  // undefined，未暴露
```

## 类型定义

```typescript
export interface SetupContext<E = EmitsOptions, S extends SlotsType = {}> {
  attrs: Data
  slots: UnwrapSlotsType<S>
  emit: EmitFn<E>
  expose: (exposed?: Record<string, any>) => void
}
```

## 在模板中的使用

```vue
<script setup>
import { useAttrs, useSlots } from 'vue'

const attrs = useAttrs()
const slots = useSlots()

// 或者通过 defineExpose
defineExpose({
  publicMethod: () => {}
})
</script>
```

## useAttrs 和 useSlots

```typescript
export function useAttrs(): SetupContext['attrs'] {
  return getContext().attrs
}

export function useSlots(): SetupContext['slots'] {
  return getContext().slots
}

function getContext(): SetupContext {
  const i = getCurrentInstance()!
  if (__DEV__ && !i) {
    warn(`useContext() called without active instance.`)
  }
  return i.setupContext || (i.setupContext = createSetupContext(i))
}
```

## 开发环境的保护

```typescript
if (__DEV__) {
  return Object.freeze({
    // 使用 getter 确保每次访问都是最新值
    get attrs() {
      return getAttrsProxy(instance)
    },
    get slots() {
      return getSlotsProxy(instance)
    },
    get emit() {
      return (event: string, ...args: any[]) => instance.emit(event, ...args)
    },
    expose
  })
}
```

Object.freeze 防止 setupContext 被意外修改。

## 响应式追踪

```typescript
get(target, key: string) {
  track(instance, TrackOpTypes.GET, '$attrs')
  return target[key]
}
```

attrs 和 slots 的访问会触发依赖追踪，确保它们变化时组件能够更新。

## 与 Options API 的对比

```typescript
// Composition API
setup(props, { attrs, slots, emit, expose }) {
  // ...
}

// Options API
{
  mounted() {
    this.$attrs   // attrs
    this.$slots   // slots
    this.$emit    // emit
    // 没有 expose 的等价物
  }
}
```

## 使用示例

```typescript
export default {
  props: ['title'],
  emits: ['update'],
  
  setup(props, { attrs, slots, emit, expose }) {
    // 访问非 prop 属性
    console.log(attrs.class, attrs.style)
    
    // 检查插槽
    const hasHeader = computed(() => !!slots.header)
    
    // 触发事件
    const update = (value) => emit('update', value)
    
    // 暴露方法
    const reset = () => {
      // ...
    }
    expose({ reset })
    
    return {
      hasHeader,
      update
    }
  }
}
```

## 解构注意事项

```typescript
// 可以解构，但 attrs 和 slots 需要保持响应式
setup(props, { attrs, slots, emit, expose }) {
  // attrs 和 slots 已经是代理对象
  // 但如果解构具体属性会失去响应性
  const { class: className } = attrs  // ❌ 失去响应性
  
  // 应该使用计算属性
  const className = computed(() => attrs.class)  // ✅
}
```

## 小结

setupContext 的核心特点：

1. **懒创建**：只在需要时创建
2. **响应式**：attrs 和 slots 支持依赖追踪
3. **只读保护**：开发环境防止意外修改
4. **expose 控制**：精确控制对外暴露的接口
5. **类型安全**：完整的 TypeScript 类型支持

setupContext 是 Composition API 与组件系统交互的重要接口。

下一章将分析 expose 暴露方法的详细实现。
