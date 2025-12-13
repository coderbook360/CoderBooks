# v-model 双向绑定的转换

`v-model` 是 Vue 最有特色的功能之一。**它本质上是语法糖，将值绑定和更新事件合二为一。**

**理解 v-model 的转换原理，能帮你更好地在组件中设计自定义 v-model。** 本章将分析 v-model 的转换实现。

## 两种截然不同的处理方式

**首先要问的是**：v-model 在表单元素和组件上的处理方式有什么区别？

这是一个关键问题，因为它们的编译结果**完全不同**：

**表单元素（`<input>`、`<textarea>`、`<select>`）**
- 编译为：**运行时指令** + 事件监听
- 原因：需要处理 DOM 特性（如 IME 输入、checkbox 的 checked 属性）
- 结果：`_withDirectives(_createElementVNode("input", ...), [[_vModelText, value]])`

**组件（`<MyComponent>`）**
- 编译为：**prop + 事件** 的展开
- 原因：组件是纯 Vue 抽象，不需要处理 DOM 细节
- 结果：`{ modelValue: value, "onUpdate:modelValue": $event => value = $event }`

**为什么要区分？** 因为表单元素有 DOM 特有的复杂性：

- `<input type="checkbox">` 的值是 `checked` 属性，不是 `value`
- `<input type="radio">` 需要处理同名分组
- `<select>` 需要处理 `<option>` 的选中状态
- 输入法（IME）需要在组合结束后才更新值

这些 DOM 细节必须在**运行时**处理，而不是编译时。

## v-model 的本质

```html
<!-- 在表单元素上 -->
<input v-model="text">
<!-- 等价于 -->
<input :value="text" @input="text = $event.target.value">

<!-- 在组件上 -->
<MyComponent v-model="value">
<!-- 等价于 -->
<MyComponent :modelValue="value" @update:modelValue="value = $event">

<!-- 具名 v-model -->
<MyComponent v-model:title="title">
<!-- 等价于 -->
<MyComponent :title="title" @update:title="title = $event">
```

## 转换目标

```html
<input v-model="text" />
<MyComponent v-model="value" v-model:title="title" />
```

```javascript
// 表单元素：使用运行时指令
_withDirectives(_createElementVNode("input", {
  "onUpdate:modelValue": $event => _ctx.text = $event
}, null, 512), [
  [_vModelText, _ctx.text]
])

// 组件：展开为 prop + 事件
_createVNode(MyComponent, {
  modelValue: _ctx.value,
  "onUpdate:modelValue": $event => _ctx.value = $event,
  title: _ctx.title,
  "onUpdate:title": $event => _ctx.title = $event
})
```

## transformModel 实现

```javascript
const transformModel = (dir, node, context) => {
  const { exp, arg } = dir
  
  // 验证表达式
  if (!exp) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_MODEL_NO_EXPRESSION)
    )
    return createTransformProps()
  }
  
  const rawExp = exp.loc.source
  const expString = exp.type === NodeTypes.SIMPLE_EXPRESSION
    ? exp.content
    : rawExp
  
  // 验证是否是有效的左值
  const bindingType = context.bindingMetadata[rawExp]
  
  if (bindingType === BindingTypes.SETUP_CONST) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_MODEL_ON_SCOPE_VARIABLE)
    )
    return createTransformProps()
  }
  
  // 表达式必须是可赋值的
  if (!isMemberExpression(expString) && !maybeRef(rawExp, context)) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_MODEL_MALFORMED_EXPRESSION)
    )
    return createTransformProps()
  }
  
  // 生成 prop 名和事件名
  const propName = arg
    ? isStaticExp(arg) ? arg.content : arg
    : 'modelValue'
  
  const eventName = arg
    ? isStaticExp(arg)
      ? `onUpdate:${arg.content}`
      : createCompoundExpression(['"onUpdate:" + ', arg])
    : 'onUpdate:modelValue'
  
  // 生成赋值表达式
  let assignmentExp
  const eventArg = context.isTS ? '($event: any)' : '$event'
  
  assignmentExp = createCompoundExpression([
    `${eventArg} => ((`,
    exp,
    ') = $event)'
  ])
  
  const props = [
    // modelValue 或自定义 prop
    createObjectProperty(propName, dir.exp),
    // update 事件
    createObjectProperty(eventName, assignmentExp)
  ]
  
  // 处理修饰符
  if (dir.modifiers.length && node.tagType === ElementTypes.COMPONENT) {
    const modifiers = dir.modifiers
      .map(m => (isSimpleIdentifier(m) ? m : JSON.stringify(m)) + ': true')
      .join(', ')
    
    const modifiersKey = arg
      ? isStaticExp(arg)
        ? `${arg.content}Modifiers`
        : createCompoundExpression([arg, ' + "Modifiers"'])
      : 'modelModifiers'
    
    props.push(
      createObjectProperty(
        modifiersKey,
        createSimpleExpression(`{ ${modifiers} }`, false)
      )
    )
  }
  
  return createTransformProps(props)
}
```

## 表单元素的特殊处理

表单元素需要运行时指令来同步值：

```javascript
// packages/compiler-dom/src/transforms/vModel.ts
const transformModel = (dir, node, context) => {
  const baseResult = baseTransformModel(dir, node, context)
  
  if (!baseResult.props.length || node.tagType === ElementTypes.COMPONENT) {
    return baseResult
  }
  
  // 表单元素使用运行时指令
  const { tag } = node
  
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    let directiveToUse = V_MODEL_TEXT
    
    if (tag === 'input') {
      const type = findProp(node, 'type')
      if (type) {
        if (type.value.content === 'checkbox') {
          directiveToUse = V_MODEL_CHECKBOX
        } else if (type.value.content === 'radio') {
          directiveToUse = V_MODEL_RADIO
        }
      }
    } else if (tag === 'select') {
      directiveToUse = V_MODEL_SELECT
    }
    
    // 添加运行时指令
    baseResult.needRuntime = context.helper(directiveToUse)
  }
  
  return baseResult
}
```

## 运行时指令

不同表单元素有不同的 v-model 指令实现：

### vModelText

```javascript
const vModelText = {
  created(el, { modifiers: { lazy, trim, number } }) {
    el._assign = getModelAssigner(/* ... */)
    
    const castToNumber = number || el.type === 'number'
    
    addEventListener(el, lazy ? 'change' : 'input', e => {
      let domValue = el.value
      if (trim) domValue = domValue.trim()
      if (castToNumber) domValue = toNumber(domValue)
      el._assign(domValue)
    })
  },
  
  mounted(el, { value }) {
    el.value = value == null ? '' : value
  },
  
  beforeUpdate(el, { value, modifiers: { lazy, trim, number } }) {
    el._assign = getModelAssigner(/* ... */)
    
    if (document.activeElement === el) {
      if (lazy) return
      if (trim && el.value.trim() === value) return
      if (number && toNumber(el.value) === value) return
    }
    
    const newValue = value == null ? '' : value
    if (el.value !== newValue) {
      el.value = newValue
    }
  }
}
```

### vModelCheckbox

```javascript
const vModelCheckbox = {
  created(el, binding) {
    el._assign = getModelAssigner(/* ... */)
    
    addEventListener(el, 'change', () => {
      const modelValue = binding.value
      const checked = el.checked
      
      if (isArray(modelValue)) {
        // 数组模式
        const value = getValue()
        const index = modelValue.indexOf(value)
        const found = index !== -1
        
        if (checked && !found) {
          el._assign(modelValue.concat(value))
        } else if (!checked && found) {
          const filtered = [...modelValue]
          filtered.splice(index, 1)
          el._assign(filtered)
        }
      } else {
        // 布尔模式
        el._assign(getCheckboxValue(el, checked))
      }
    })
  },
  
  mounted: setChecked,
  beforeUpdate(el, binding) {
    el._assign = getModelAssigner(/* ... */)
    setChecked(el, binding)
  }
}
```

## 修饰符处理

### .lazy

```html
<input v-model.lazy="text">
```

使用 `change` 事件代替 `input` 事件，只在失焦时更新。

### .number

```html
<input v-model.number="age">
```

将输入值转换为数字：

```javascript
if (castToNumber) domValue = toNumber(domValue)
```

### .trim

```html
<input v-model.trim="text">
```

去除首尾空格：

```javascript
if (trim) domValue = domValue.trim()
```

## 组件的修饰符传递

组件上的修饰符通过 props 传递：

```html
<MyComponent v-model.trim="value">
```

```javascript
_createVNode(MyComponent, {
  modelValue: _ctx.value,
  "onUpdate:modelValue": $event => _ctx.value = $event,
  modelModifiers: { trim: true }
})
```

组件内部可以访问：

```javascript
const props = defineProps({
  modelValue: String,
  modelModifiers: { default: () => ({}) }
})

// 使用修饰符
if (props.modelModifiers.trim) {
  value = value.trim()
}
```

## 多个 v-model

Vue 3 支持组件上多个 v-model：

```html
<UserForm
  v-model:firstName="first"
  v-model:lastName="last"
/>
```

```javascript
_createVNode(UserForm, {
  firstName: _ctx.first,
  "onUpdate:firstName": $event => _ctx.first = $event,
  lastName: _ctx.last,
  "onUpdate:lastName": $event => _ctx.last = $event
})
```

组件内部接收：

```javascript
const props = defineProps({
  firstName: String,
  lastName: String
})

const emit = defineEmits(['update:firstName', 'update:lastName'])

// 更新
function updateFirstName(value) {
  emit('update:firstName', value)
}
```

## IME 输入处理

中文输入法等 IME 场景需要特殊处理，避免在拼音输入过程中触发更新：

```javascript
const vModelText = {
  created(el) {
    el._composing = false
    
    // 开始输入法组合
    el.addEventListener('compositionstart', () => {
      el._composing = true
    })
    
    // 结束输入法组合
    el.addEventListener('compositionend', (e) => {
      el._composing = false
      // 手动触发 input 事件
      el.dispatchEvent(new Event('input'))
    })
    
    el.addEventListener('input', () => {
      // 输入法组合过程中不更新
      if (el._composing) return
      // 正常更新逻辑
      el._assign(el.value)
    })
  }
}
```

**为什么需要这个？** 当用户输入"中文"时，会先输入拼音"zhongwen"，此时不应触发更新，否则会打断输入过程。

## 本章小结

本章分析了 v-model 的转换实现：

- **语法糖本质**：prop + 更新事件
- **组件 v-model**：modelValue + onUpdate:modelValue
- **表单元素**：运行时指令处理 DOM 细节
- **修饰符**：.lazy、.number、.trim
- **多个 v-model**：具名绑定支持
- **IME 处理**：compositionstart/end 事件

下一章将分析自定义指令——从编译到运行的完整链路。
