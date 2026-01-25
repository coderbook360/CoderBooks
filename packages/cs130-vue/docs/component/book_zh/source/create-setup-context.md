# createSetupContext 上下文创建

`setup` 函数的第二个参数是上下文对象，包含 `attrs`、`slots`、`emit`、`expose`。`createSetupContext` 负责创建这个对象。

## 上下文的作用

`setup` 没有 `this`，需要通过上下文访问组件功能：

```javascript
setup(props, { attrs, slots, emit, expose }) {
  // attrs: 透传的属性
  // slots: 插槽
  // emit: 触发事件
  // expose: 暴露给父组件
}
```

## 源码分析

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
    // 开发环境使用 getter
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

## attrs 代理

`attrs` 需要代理以保持响应性：

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

关键点：
- 访问时追踪依赖（`track`）
- 开发环境禁止修改
- 代理被缓存在 `attrsProxy`

## slots 代理

开发环境中 slots 也需要代理：

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

这让插槽的使用能被追踪为依赖。

## emit

事件触发器直接使用实例上的：

```typescript
get emit() {
  return (event: string, ...args: any[]) => instance.emit(event, ...args)
}
```

或者简写：

```typescript
emit: instance.emit
```

## expose

`expose` 是一个函数，调用时设置暴露的内容：

```typescript
const expose: SetupContext['expose'] = exposed => {
  instance.exposed = exposed || {}
}
```

使用示例：

```javascript
setup(props, { expose }) {
  const count = ref(0)
  const internalMethod = () => { /* ... */ }
  const publicMethod = () => { /* ... */ }
  
  expose({
    publicMethod,
    count
  })
  
  return { count, internalMethod, publicMethod }
}
```

## 开发环境的保护

开发环境下 attrs 和 slots 都是只读的：

```typescript
set() {
  warn(`setupContext.attrs is readonly.`)
  return false
},
deleteProperty() {
  warn(`setupContext.attrs is readonly.`)
  return false
}
```

同时上下文对象本身被冻结：

```typescript
return Object.freeze({
  get attrs() { /* ... */ },
  get slots() { /* ... */ },
  get emit() { /* ... */ },
  expose
})
```

## 条件创建

只有当 `setup` 接收第二个参数时才创建上下文：

```typescript
const setupContext = (instance.setupContext =
  setup.length > 1 ? createSetupContext(instance) : null)
```

检查 `setup.length > 1`，如果 setup 只接收 props，就不创建上下文。

## 类型定义

```typescript
export interface SetupContext<E = EmitsOptions> {
  attrs: Data
  slots: Slots
  emit: EmitFn<E>
  expose: (exposed?: Record<string, any>) => void
}
```

配合泛型可以获得更好的类型推导：

```typescript
setup(props, ctx: SetupContext<{ update: (value: number) => void }>) {
  ctx.emit('update', 42)  // 类型检查
}
```

## 解构使用

上下文通常解构使用：

```javascript
setup(props, { attrs, slots, emit }) {
  // 直接使用
}
```

注意解构后失去响应性的问题：

```javascript
setup(props, context) {
  // 不好：解构后 attrs 不再响应
  const { attrs } = context
  
  // 好：保持响应性
  const foo = computed(() => context.attrs.foo)
}
```

## attrs vs props

区别：

```vue
<!-- Parent -->
<Child :known="1" :unknown="2" class="foo" />

<!-- Child -->
<script>
export default {
  props: ['known'],
  setup(props, { attrs }) {
    console.log(props.known)   // 1
    console.log(attrs.unknown) // 2
    console.log(attrs.class)   // 'foo'
  }
}
</script>
```

`attrs` 包含未在 `props` 中声明的属性。

## slots 使用

在 setup 中访问插槽：

```javascript
setup(props, { slots }) {
  return () => h('div', [
    slots.header?.(),
    slots.default?.(),
    slots.footer?.()
  ])
}
```

使用可选链调用，因为插槽可能不存在。

## emit 使用

触发事件：

```javascript
setup(props, { emit }) {
  function handleClick() {
    emit('update', newValue)
  }
  
  return { handleClick }
}
```

## expose 使用场景

**限制 ref 访问**：

```vue
<!-- Parent -->
<template>
  <Child ref="childRef" />
</template>

<script setup>
const childRef = ref()
onMounted(() => {
  childRef.value.publicMethod()  // 可以访问
  childRef.value.privateMethod   // undefined
})
</script>
```

```vue
<!-- Child -->
<script setup>
const privateMethod = () => {}
const publicMethod = () => {}

defineExpose({
  publicMethod
})
</script>
```

## 性能考虑

上下文对象被缓存在实例上：

```typescript
instance.setupContext = setupContext
instance.attrsProxy = proxy
instance.slotsProxy = proxy
```

避免每次访问都创建新对象。

## 小结

`createSetupContext` 创建的上下文：

1. **attrs**：透传属性的响应式代理
2. **slots**：插槽对象（开发环境有代理）
3. **emit**：事件触发函数
4. **expose**：暴露 ref 引用的方法

上下文提供了 `setup` 中访问组件功能的入口，同时通过代理和冻结保证了安全性。

下一章将分析 `handleSetupResult`——setup 返回值的处理逻辑。
