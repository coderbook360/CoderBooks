# patchDOMProp 属性更新

patchDOMProp 处理需要直接设置为 DOM 属性（property）的值，与 setAttribute 设置 HTML 属性（attribute）不同。某些属性如 value、checked、selected 必须通过 property 设置才能正确工作。

## Property vs Attribute

理解这两者的区别对于正确处理 DOM 操作至关重要。Attribute 是 HTML 文档中定义的值，通过 getAttribute/setAttribute 操作。Property 是 DOM 对象上的 JavaScript 属性，通过点号或方括号访问。

```html
<input type="text" value="initial">
```

```typescript
const input = document.querySelector('input')

// attribute
input.getAttribute('value')  // 'initial'，始终返回初始值

// property
input.value  // 当前输入值，会随用户输入变化

// 设置时的区别
input.setAttribute('value', 'new')  // 只改变 attribute，不影响显示
input.value = 'new'  // 改变 property，更新显示内容
```

对于表单元素来说，只有设置 property 才能正确更新界面显示。

## 函数实现

patchDOMProp 的核心逻辑：

```typescript
export function patchDOMProp(
  el: any,
  key: string,
  value: any,
  prevChildren: any,
  parentComponent: any,
  parentSuspense: any,
  unmountChildren: any
) {
  if (key === 'innerHTML' || key === 'textContent') {
    // innerHTML/textContent 需要先卸载子节点
    if (prevChildren) {
      unmountChildren(prevChildren, parentComponent, parentSuspense)
    }
    el[key] = value == null ? '' : value
    return
  }

  if (
    key === 'value' &&
    el.tagName !== 'PROGRESS' &&
    !el.tagName.includes('-')
  ) {
    // 存储原始值用于事件处理
    el._value = value
    
    // 将 null 转换为空字符串
    const newValue = value == null ? '' : value
    
    // 只在值实际变化时更新，避免光标位置问题
    if (
      el.value !== newValue ||
      el.tagName === 'OPTION'
    ) {
      el.value = newValue
    }
    
    // value 为 null 时移除 attribute
    if (value == null) {
      el.removeAttribute(key)
    }
    return
  }

  let needRemove = false
  
  if (value === '' || value == null) {
    const type = typeof el[key]
    
    if (type === 'boolean') {
      // 布尔属性：空字符串视为 true
      value = includeBooleanAttr(value)
    } else if (value == null && type === 'string') {
      // 字符串属性：null 需要移除
      value = ''
      needRemove = true
    } else if (type === 'number') {
      // 数字属性：null 设为 0
      value = 0
      needRemove = true
    }
  }

  // 设置 property
  try {
    el[key] = value
  } catch (e) {
    // 某些只读属性会抛出错误
    if (__DEV__ && !needRemove) {
      warn(`Failed setting prop "${key}" on <${el.tagName.toLowerCase()}>`)
    }
  }

  // 移除 attribute
  if (needRemove) {
    el.removeAttribute(key)
  }
}
```

这段代码处理了多种边界情况。innerHTML 和 textContent 需要先清理子节点；value 属性需要特殊处理避免光标跳动；不同类型的属性需要不同的空值处理。

## innerHTML 处理

设置 innerHTML 时需要先卸载现有子节点：

```typescript
if (key === 'innerHTML' || key === 'textContent') {
  if (prevChildren) {
    unmountChildren(prevChildren, parentComponent, parentSuspense)
  }
  el[key] = value == null ? '' : value
  return
}
```

直接设置 innerHTML 会替换所有子元素，但 Vue 需要正确触发子组件的卸载生命周期和清理指令。所以在设置之前，先遍历 prevChildren 执行完整的卸载流程。

## value 属性特殊处理

表单元素的 value 需要特别小心：

```typescript
if (
  key === 'value' &&
  el.tagName !== 'PROGRESS' &&
  !el.tagName.includes('-')
) {
  // 存储原始值
  el._value = value
  
  const newValue = value == null ? '' : value
  
  // 只在值变化时更新
  if (el.value !== newValue || el.tagName === 'OPTION') {
    el.value = newValue
  }
  
  if (value == null) {
    el.removeAttribute(key)
  }
  return
}
```

_value 存储原始值（可能不是字符串），用于 v-model 的值比较和事件处理。OPTION 元素需要总是更新，因为它的 selected 状态依赖于 parent SELECT 的 value 比较。

条件检查排除了 PROGRESS 元素（它的 value 是特殊的）和自定义元素（Custom Elements 可能有自己的 value 处理逻辑）。

## 布尔属性处理

HTML 布尔属性有特殊的语义：

```typescript
if (type === 'boolean') {
  value = includeBooleanAttr(value)
}

function includeBooleanAttr(value: unknown): boolean {
  return !!value || value === ''
}
```

对于 `<input disabled="">` 这样的写法，disabled 的值是空字符串，但应该视为 true。只有完全省略属性才是 false。

## 数字属性处理

某些属性是数字类型：

```typescript
if (type === 'number') {
  value = 0
  needRemove = true
}
```

比如 input 的 maxLength。当设置为 null 时，property 设为 0 但同时移除 attribute，恢复默认行为。

## 错误处理

某些属性是只读的或有特殊限制：

```typescript
try {
  el[key] = value
} catch (e) {
  if (__DEV__ && !needRemove) {
    warn(`Failed setting prop "${key}" on <${el.tagName.toLowerCase()}>`)
  }
}
```

比如某些元素的 form 属性是只读的。try-catch 确保这些情况不会导致渲染失败，开发环境下会发出警告。

## 与 patchProp 的关系

patchDOMProp 被 patchProp 调用，作为属性更新的一个分支：

```typescript
export const patchProp: DOMRendererOptions['patchProp'] = (
  el,
  key,
  prevValue,
  nextValue,
  isSVG = false,
  prevChildren,
  parentComponent,
  parentSuspense,
  unmountChildren
) => {
  if (key === 'class') {
    patchClass(el, nextValue, isSVG)
  } else if (key === 'style') {
    patchStyle(el, prevValue, nextValue)
  } else if (isOn(key)) {
    patchEvent(el, key, prevValue, nextValue, parentComponent)
  } else if (
    key[0] === '.'
      ? ((key = key.slice(1)), true)
      : key[0] === '^'
      ? ((key = key.slice(1)), false)
      : shouldSetAsProp(el, key, nextValue, isSVG)
  ) {
    patchDOMProp(
      el,
      key,
      nextValue,
      prevChildren,
      parentComponent,
      parentSuspense,
      unmountChildren
    )
  } else {
    // 作为 attribute 设置
    patchAttr(el, key, nextValue, isSVG, parentComponent)
  }
}
```

决定使用 patchDOMProp 还是 patchAttr 依赖 shouldSetAsProp 函数。

## shouldSetAsProp

判断属性应该设置为 property 还是 attribute：

```typescript
function shouldSetAsProp(
  el: Element,
  key: string,
  value: unknown,
  isSVG: boolean
) {
  if (isSVG) {
    // SVG 使用 attribute
    if (key === 'innerHTML' || key === 'textContent') {
      return true
    }
    if (key in el && nativeOnRE.test(key) && isFunction(value)) {
      return true
    }
    return false
  }

  // 特殊处理的属性
  if (key === 'spellcheck' || key === 'draggable' || key === 'translate') {
    return false
  }
  if (key === 'form') {
    return false
  }
  if (key === 'list' && el.tagName === 'INPUT') {
    return false
  }
  if (key === 'type' && el.tagName === 'TEXTAREA') {
    return false
  }

  // 原生事件
  if (nativeOnRE.test(key) && isString(value)) {
    return false
  }

  // 检查是否是元素的 property
  return key in el
}
```

这个函数包含了大量的边界情况处理。某些属性虽然在元素上存在对应的 property，但由于浏览器行为或规范要求，必须通过 attribute 设置。

## 强制修饰符

Vue 支持通过修饰符强制设置方式：

```html
<!-- 强制使用 property -->
<input .value="text">

<!-- 强制使用 attribute -->
<input ^value="text">
```

在 patchProp 中处理：

```typescript
if (key[0] === '.') {
  key = key.slice(1)
  // 使用 patchDOMProp
} else if (key[0] === '^') {
  key = key.slice(1)
  // 使用 patchAttr
}
```

这给开发者提供了精确控制的能力，用于处理某些特殊的第三方组件或复杂场景。

## 小结

patchDOMProp 处理需要作为 DOM property 设置的属性值。它特别处理 innerHTML/textContent 的子节点清理、value 的光标保护、布尔和数字属性的类型转换。shouldSetAsProp 决定属性应该走 property 还是 attribute 路径，处理了众多浏览器特殊情况。这套机制确保了 Vue 能够正确更新各种类型的 DOM 属性。
