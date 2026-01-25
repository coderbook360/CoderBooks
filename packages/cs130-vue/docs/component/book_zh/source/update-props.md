# updateProps 属性更新

updateProps 负责在组件更新时同步 props 的变化，包括新增、修改和删除属性。

## 函数签名

```typescript
// packages/runtime-core/src/componentProps.ts
export function updateProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  rawPrevProps: Data | null,
  optimized: boolean
)
```

## 完整实现

```typescript
export function updateProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  rawPrevProps: Data | null,
  optimized: boolean
) {
  const {
    props,
    attrs,
    vnode: { patchFlag }
  } = instance
  const rawCurrentProps = toRaw(props)
  const [options] = instance.propsOptions
  let hasAttrsChanged = false

  if (
    !(
      __DEV__ &&
      (instance.type as ComponentOptions).__hmrId
    ) &&
    (optimized || patchFlag > 0) &&
    !(patchFlag & PatchFlags.FULL_PROPS)
  ) {
    // ⭐ 优化路径：只更新动态属性
    if (patchFlag & PatchFlags.PROPS) {
      const propsToUpdate = instance.vnode.dynamicProps!
      for (let i = 0; i < propsToUpdate.length; i++) {
        let key = propsToUpdate[i]
        if (isEmitListener(instance.emitsOptions, key)) {
          continue
        }
        const value = rawProps![key]
        if (options) {
          if (hasOwn(attrs, key)) {
            if (value !== attrs[key]) {
              attrs[key] = value
              hasAttrsChanged = true
            }
          } else {
            const camelizedKey = camelize(key)
            props[camelizedKey] = resolvePropValue(
              options,
              rawCurrentProps,
              camelizedKey,
              value,
              instance,
              false
            )
          }
        } else {
          if (value !== attrs[key]) {
            attrs[key] = value
            hasAttrsChanged = true
          }
        }
      }
    }
  } else {
    // ⭐ 完整更新
    if (setFullProps(instance, rawProps, props, attrs)) {
      hasAttrsChanged = true
    }
    
    // 删除不存在的属性
    let kebabKey: string
    for (const key in rawCurrentProps) {
      if (
        !rawProps ||
        (!hasOwn(rawProps, key) &&
          ((kebabKey = hyphenate(key)) === key || !hasOwn(rawProps, kebabKey)))
      ) {
        if (options) {
          if (
            rawPrevProps &&
            (rawPrevProps[key] !== undefined ||
              rawPrevProps[kebabKey!] !== undefined)
          ) {
            props[key] = resolvePropValue(
              options,
              rawCurrentProps,
              key,
              undefined,
              instance,
              true
            )
          }
        } else {
          delete props[key]
        }
      }
    }

    // 清理不存在的 attrs
    if (attrs !== rawCurrentProps) {
      for (const key in attrs) {
        if (
          !rawProps ||
          (!hasOwn(rawProps, key) &&
            (!__COMPAT__ || !hasOwn(rawProps, key + 'Native')))
        ) {
          delete attrs[key]
          hasAttrsChanged = true
        }
      }
    }
  }

  // 触发 attrs 更新
  if (hasAttrsChanged) {
    trigger(instance, TriggerOpTypes.SET, '$attrs')
  }

  // 开发环境验证
  if (__DEV__) {
    validateProps(rawProps || {}, props, instance)
  }
}
```

## setFullProps 完整设置

```typescript
function setFullProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  props: Data,
  attrs: Data
) {
  const [options, needCastKeys] = instance.propsOptions
  let hasAttrsChanged = false
  let rawCastValues: Data | undefined
  
  if (rawProps) {
    for (let key in rawProps) {
      if (isReservedProp(key)) {
        continue
      }
      
      const value = rawProps[key]
      let camelKey
      
      if (options && hasOwn(options, (camelKey = camelize(key)))) {
        if (!needCastKeys || !needCastKeys.includes(camelKey)) {
          props[camelKey] = value
        } else {
          ;(rawCastValues || (rawCastValues = {}))[camelKey] = value
        }
      } else if (!isEmitListener(instance.emitsOptions, key)) {
        if (!(key in attrs) || value !== attrs[key]) {
          attrs[key] = value
          hasAttrsChanged = true
        }
      }
    }
  }

  if (needCastKeys) {
    const rawCurrentProps = toRaw(props)
    const castValues = rawCastValues || EMPTY_OBJ
    for (let i = 0; i < needCastKeys.length; i++) {
      const key = needCastKeys[i]
      props[key] = resolvePropValue(
        options!,
        rawCurrentProps,
        key,
        castValues[key],
        instance,
        !hasOwn(castValues, key)
      )
    }
  }

  return hasAttrsChanged
}
```

## 优化路径 vs 完整更新

```typescript
// 优化路径：使用 dynamicProps
if (patchFlag & PatchFlags.PROPS) {
  const propsToUpdate = instance.vnode.dynamicProps!
  // 只遍历动态属性
}

// 完整更新：遍历所有属性
// - FULL_PROPS 标记
// - 开发环境 HMR
// - 非优化模式
```

## resolvePropValue 解析值

```typescript
function resolvePropValue(
  options: NormalizedProps,
  props: Data,
  key: string,
  value: unknown,
  instance: ComponentInternalInstance,
  isAbsent: boolean
) {
  const opt = options[key]
  if (opt != null) {
    const hasDefault = hasOwn(opt, 'default')
    
    // 处理默认值
    if (hasDefault && value === undefined) {
      const defaultValue = opt.default
      if (opt.type !== Function && isFunction(defaultValue)) {
        const { propsDefaults } = instance
        if (key in propsDefaults) {
          value = propsDefaults[key]
        } else {
          setCurrentInstance(instance)
          value = propsDefaults[key] = defaultValue.call(
            null,
            props
          )
          unsetCurrentInstance()
        }
      } else {
        value = defaultValue
      }
    }
    
    // Boolean 类型转换
    if (opt[BooleanFlags.shouldCast]) {
      if (isAbsent && !hasDefault) {
        value = false
      } else if (
        opt[BooleanFlags.shouldCastTrue] &&
        (value === '' || value === hyphenate(key))
      ) {
        value = true
      }
    }
  }
  return value
}
```

## camelize 和 hyphenate

```typescript
// props 名称转换
const camelize = (str: string): string => {
  return str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ''))
}

const hyphenate = (str: string): string => {
  return str.replace(/\B([A-Z])/g, '-$1').toLowerCase()
}

// my-prop -> myProp
// myProp -> my-prop
```

## attrs 变化触发

```typescript
if (hasAttrsChanged) {
  trigger(instance, TriggerOpTypes.SET, '$attrs')
}
```

这使得依赖 `$attrs` 的渲染会重新执行。

## 属性删除处理

```typescript
// 检查属性是否被删除
for (const key in rawCurrentProps) {
  if (
    !rawProps ||
    (!hasOwn(rawProps, key) &&
      ((kebabKey = hyphenate(key)) === key || !hasOwn(rawProps, kebabKey)))
  ) {
    // 属性被删除
    if (options) {
      // 使用默认值
      props[key] = resolvePropValue(
        options,
        rawCurrentProps,
        key,
        undefined,
        instance,
        true
      )
    } else {
      delete props[key]
    }
  }
}
```

## 使用示例

### 动态属性更新

```vue
<template>
  <Child :title="title" :count="count" static-prop="never changes" />
</template>

<script setup>
import { ref } from 'vue'

const title = ref('Hello')
const count = ref(0)

// 只有 title 和 count 变化时触发更新
// static-prop 不在 dynamicProps 中
</script>
```

### 属性删除

```vue
<template>
  <Child :title="showTitle ? title : undefined" />
</template>

<script setup>
import { ref } from 'vue'

const showTitle = ref(true)
const title = ref('Hello')

// showTitle 为 false 时，title prop 使用默认值
</script>
```

## 小结

updateProps 的核心要点：

1. **优化路径**：只更新 dynamicProps 中的属性
2. **完整更新**：遍历所有属性进行比较
3. **resolvePropValue**：处理默认值和类型转换
4. **属性删除**：恢复为默认值或删除
5. **attrs 触发**：变化时触发响应式更新

下一章将分析 updateSlots 插槽更新。
