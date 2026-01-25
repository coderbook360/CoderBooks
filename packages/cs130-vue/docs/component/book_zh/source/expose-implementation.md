# expose 暴露方法

expose 方法用于显式控制组件向父组件暴露的公共接口。当父组件通过 ref 访问子组件时，只能访问 expose 暴露的属性。

## 基本用法

```typescript
import { ref } from 'vue'

export default {
  setup(props, { expose }) {
    const count = ref(0)
    const privateMethod = () => {
      // 内部方法
    }
    const publicMethod = () => {
      // 公开方法
    }
    
    // 只暴露 publicMethod
    expose({
      publicMethod
    })
    
    return { count, privateMethod, publicMethod }
  }
}
```

## expose 实现

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
  
  // ...
}
```

## 组件实例上的 exposed

```typescript
interface ComponentInternalInstance {
  // ...
  exposed: Record<string, any> | null
  exposeProxy: Record<string, any> | null
  // ...
}
```

## ref 访问时的处理

当父组件通过 ref 访问子组件时：

```typescript
export function getExposeProxy(instance: ComponentInternalInstance) {
  if (instance.exposed) {
    return (
      instance.exposeProxy ||
      (instance.exposeProxy = new Proxy(proxyRefs(markRaw(instance.exposed)), {
        get(target, key: string) {
          if (key in target) {
            return target[key]
          } else if (key in publicPropertiesMap) {
            return publicPropertiesMap[key](instance)
          }
        },
        has(target, key: string) {
          return key in target || key in publicPropertiesMap
        }
      }))
    )
  }
}
```

## 模板 ref 的赋值

```typescript
export function setRef(
  rawRef: VNodeNormalizedRef,
  oldRawRef: VNodeNormalizedRef | null,
  parentSuspense: SuspenseBoundary | null,
  vnode: VNode,
  isUnmount = false
) {
  // ...
  
  const refValue =
    vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
      ? getExposeProxy(vnode.component!) || vnode.component!.proxy
      : vnode.el
      
  // ...
}
```

如果组件调用了 expose，ref 获取的是 exposeProxy；否则获取完整的 proxy。

## 默认行为（无 expose）

```typescript
// 子组件
export default {
  setup() {
    const count = ref(0)
    return { count }
  }
}

// 父组件
const childRef = ref()
childRef.value.count  // 可以访问所有返回的属性
```

## 使用 expose 后

```typescript
// 子组件
export default {
  setup(props, { expose }) {
    const count = ref(0)
    const increment = () => count.value++
    
    expose({
      increment
    })
    
    return { count, increment }
  }
}

// 父组件
const childRef = ref()
childRef.value.increment()  // ✅ 可以访问
childRef.value.count  // ❌ undefined
```

## 空 expose

```typescript
setup(props, { expose }) {
  // 不暴露任何东西
  expose()
  // 或者
  expose({})
  
  return { /* ... */ }
}
```

调用 expose() 不传参数或传空对象，会阻止父组件访问任何属性。

## defineExpose（script setup）

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)
const increment = () => count.value++

// 使用 defineExpose 暴露
defineExpose({
  count,
  increment
})
</script>
```

编译为：

```javascript
export default {
  setup(__props, { expose: __expose }) {
    const count = ref(0)
    const increment = () => count.value++
    
    __expose({
      count,
      increment
    })
    
    return { count, increment }
  }
}
```

## proxyRefs 自动解包

```typescript
instance.exposeProxy = new Proxy(proxyRefs(markRaw(instance.exposed)), {
  // ...
})
```

暴露的 ref 会自动解包，父组件访问时不需要 .value：

```typescript
// 子组件
expose({ count })  // count 是 ref

// 父组件
childRef.value.count  // 直接是数值，不是 ref
```

## 公共属性仍可访问

```typescript
get(target, key: string) {
  if (key in target) {
    return target[key]
  } else if (key in publicPropertiesMap) {
    return publicPropertiesMap[key](instance)
  }
}
```

即使使用了 expose，$el、$parent 等公共属性仍然可以访问。

## 类型安全

```typescript
import { ref, defineComponent } from 'vue'

export default defineComponent({
  setup(props, { expose }) {
    const count = ref(0)
    const increment = () => count.value++
    
    // TypeScript 类型推断
    expose({
      count,
      increment
    })
    
    return { count }
  }
})
```

## 单次调用限制

```typescript
if (__DEV__ && instance.exposed) {
  warn(`expose() should be called only once per setup().`)
}
```

expose 只能调用一次，多次调用会产生警告。

## 与 Options API 对比

Options API 没有直接的 expose 等价物，所有实例属性都会暴露：

```typescript
// Options API - 所有属性都可访问
export default {
  data() {
    return { count: 0 }
  },
  methods: {
    increment() { this.count++ }
  }
}

// Composition API - 可以精确控制
export default {
  setup(props, { expose }) {
    const count = ref(0)
    expose({ /* 只暴露需要的 */ })
    return { count }
  }
}
```

## 使用场景

```typescript
// 1. 表单组件，只暴露验证方法
expose({
  validate,
  resetFields,
  clearValidate
})

// 2. 模态框组件，只暴露开关方法
expose({
  open,
  close
})

// 3. 列表组件，只暴露刷新方法
expose({
  refresh,
  scrollToTop
})
```

## 小结

expose 的核心要点：

1. **显式控制**：明确指定对外暴露的接口
2. **封装性**：隐藏内部实现细节
3. **单次调用**：只能调用一次
4. **自动解包**：暴露的 ref 自动解包
5. **公共属性保留**：$el 等属性始终可访问

expose 增强了组件的封装性，是良好 API 设计的重要工具。

下一章将分析 handleSetupResult 处理返回值的实现。
