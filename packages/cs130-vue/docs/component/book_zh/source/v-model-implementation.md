# v-model 实现

`v-model` 是 Vue 的双向绑定语法糖。它编译为 prop 和事件的组合，实现父子组件间的数据同步。

## 基本用法

```vue
<template>
  <CustomInput v-model="searchText" />
</template>
```

等价于：

```vue
<template>
  <CustomInput
    :modelValue="searchText"
    @update:modelValue="searchText = $event"
  />
</template>
```

## 编译结果

```vue
<CustomInput v-model="searchText" />
```

编译为：

```javascript
_createVNode(CustomInput, {
  modelValue: searchText,
  "onUpdate:modelValue": $event => (searchText = $event)
}, null, 8 /* PROPS */, ["modelValue"])
```

## 子组件实现

```vue
<script setup>
const model = defineModel()
</script>

<template>
  <input :value="model" @input="model = $event.target.value" />
</template>
```

传统写法：

```vue
<script setup>
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <input 
    :value="props.modelValue" 
    @input="emit('update:modelValue', $event.target.value)" 
  />
</template>
```

## 多个 v-model

```vue
<UserForm
  v-model:name="userName"
  v-model:age="userAge"
/>
```

编译为：

```javascript
_createVNode(UserForm, {
  name: userName,
  "onUpdate:name": $event => (userName = $event),
  age: userAge,
  "onUpdate:age": $event => (userAge = $event)
}, null, 8, ["name", "age"])
```

## 修饰符

v-model 支持修饰符：

```vue
<CustomInput v-model.trim.number="value" />
```

编译为：

```javascript
_createVNode(CustomInput, {
  modelValue: value,
  "onUpdate:modelValue": $event => (value = $event),
  modelModifiers: { trim: true, number: true }
}, null, 8, ["modelValue"])
```

修饰符通过 `modelModifiers` prop 传递。

## emit 中的修饰符处理

`emit` 函数处理修饰符：

```typescript
// emit 函数中
const isModelListener = event.startsWith('update:')
const modelArg = isModelListener && event.slice(7)

if (modelArg && modelArg in props) {
  const modifiersKey = `${
    modelArg === 'modelValue' ? 'model' : modelArg
  }Modifiers`
  const { number, trim } = props[modifiersKey] || EMPTY_OBJ
  
  if (trim) {
    args = rawArgs.map(a => (isString(a) ? a.trim() : a))
  }
  if (number) {
    args = rawArgs.map(looseToNumber)
  }
}
```

`trim` 和 `number` 修饰符在 emit 时自动处理。

## 自定义修饰符

组件可以处理自定义修饰符：

```vue
<MyInput v-model.capitalize="text" />
```

子组件：

```vue
<script setup>
const props = defineProps({
  modelValue: String,
  modelModifiers: { default: () => ({}) }
})
const emit = defineEmits(['update:modelValue'])

function handleInput(e) {
  let value = e.target.value
  if (props.modelModifiers.capitalize) {
    value = value.charAt(0).toUpperCase() + value.slice(1)
  }
  emit('update:modelValue', value)
}
</script>

<template>
  <input :value="modelValue" @input="handleInput" />
</template>
```

## defineModel

Vue 3.4+ 的简化写法：

```vue
<script setup>
const model = defineModel()
</script>

<template>
  <input v-model="model" />
</template>
```

`defineModel` 编译为 props + emit 的组合，返回一个可写的 ref。

## defineModel 编译结果

```vue
<script setup>
const model = defineModel()
</script>
```

编译为：

```javascript
import { useModel as _useModel } from 'vue'

export default {
  props: {
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(__props) {
    const model = _useModel(__props, "modelValue")
    return { model }
  }
}
```

## useModel

`useModel` 的实现：

```typescript
export function useModel(
  props: Record<string, any>,
  name: string,
  options?: { local?: boolean }
): Ref {
  const i = getCurrentInstance()!
  
  if (__DEV__ && !i) {
    warn(`useModel() called without active instance.`)
    return ref() as any
  }
  
  if (__DEV__ && !(name in props)) {
    warn(`useModel() called with prop "${name}" which is not declared.`)
    return ref() as any
  }

  // local 模式：本地状态 + 同步
  if (options && options.local) {
    const proxy = ref(props[name])
    
    watch(
      () => props[name],
      v => (proxy.value = v)
    )
    
    watch(proxy, v => {
      if (v !== props[name]) {
        i.emit(`update:${name}`, v)
      }
    })
    
    return proxy
  }

  // 默认模式：直接代理
  return {
    __v_isRef: true,
    get value() {
      return props[name]
    },
    set value(v) {
      i.emit(`update:${name}`, v)
    }
  } as Ref
}
```

返回一个特殊的 ref，get 读 prop，set 触发事件。

## 具名 v-model

```vue
<MyComponent v-model:title="pageTitle" />
```

使用：

```vue
<script setup>
const title = defineModel('title')
</script>
```

编译为：

```javascript
const title = _useModel(__props, "title")
```

## 带选项的 defineModel

```vue
<script setup>
const count = defineModel('count', {
  type: Number,
  default: 0,
  required: true
})
</script>
```

## 表单元素的 v-model

原生表单元素有特殊处理：

```vue
<input v-model="text" />
```

编译为（简化）：

```javascript
_withDirectives(_createElementVNode("input", {
  "onUpdate:modelValue": $event => (text = $event)
}, null, 512), [
  [_vModelText, text]
])
```

使用 `vModelText` 指令处理。

## vModelText

文本输入指令：

```typescript
export const vModelText: ModelDirective<
  HTMLInputElement | HTMLTextAreaElement
> = {
  created(el, { modifiers: { lazy, trim, number } }, vnode) {
    el._assign = getModelAssigner(vnode)
    const castToNumber = number || (vnode.props && vnode.props.type === 'number')
    
    addEventListener(el, lazy ? 'change' : 'input', e => {
      if ((e.target as any).composing) return
      let domValue: string | number = el.value
      if (trim) {
        domValue = domValue.trim()
      }
      if (castToNumber) {
        domValue = looseToNumber(domValue)
      }
      el._assign(domValue)
    })
    
    if (trim) {
      addEventListener(el, 'change', () => {
        el.value = el.value.trim()
      })
    }
    
    if (!lazy) {
      addEventListener(el, 'compositionstart', onCompositionStart)
      addEventListener(el, 'compositionend', onCompositionEnd)
    }
  },
  
  mounted(el, { value }) {
    el.value = value == null ? '' : value
  },
  
  beforeUpdate(el, { value, modifiers: { lazy, trim, number } }, vnode) {
    el._assign = getModelAssigner(vnode)
    
    if ((el as any).composing) return
    
    if (document.activeElement === el && el.type !== 'range') {
      if (lazy) return
      if (trim && el.value.trim() === value) return
      if ((number || el.type === 'number') && looseToNumber(el.value) === value)
        return
    }
    
    const newValue = value == null ? '' : value
    if (el.value !== newValue) {
      el.value = newValue
    }
  }
}
```

## IME 处理

中文输入法的特殊处理：

```typescript
addEventListener(el, 'compositionstart', onCompositionStart)
addEventListener(el, 'compositionend', onCompositionEnd)

function onCompositionStart(e: Event) {
  ;(e.target as any).composing = true
}

function onCompositionEnd(e: Event) {
  const target = e.target as any
  if (target.composing) {
    target.composing = false
    target.dispatchEvent(new Event('input'))
  }
}
```

在输入法组合期间不触发更新，完成后统一触发。

## checkbox 和 radio

有专门的指令：

```typescript
export const vModelCheckbox: ModelDirective<HTMLInputElement>
export const vModelRadio: ModelDirective<HTMLInputElement>
export const vModelSelect: ModelDirective<HTMLSelectElement>
export const vModelDynamic: ModelDirective
```

## 小结

v-model 的实现：

1. **编译转换**：`v-model` → prop + 事件
2. **修饰符传递**：通过 `modifiers` prop
3. **emit 处理**：自动应用 trim/number
4. **defineModel**：简化组件 v-model 定义
5. **原生指令**：处理表单元素的双向绑定

v-model 是 Vue 双向绑定的核心，让表单处理变得简洁直观。

下一章将分析 `provide/inject` 的实现。
