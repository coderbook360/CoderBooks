# 特殊属性处理

本章深入分析 Vue SSR 中特殊属性的处理逻辑。

## 保留属性

Vue 中有一些属性具有特殊含义，不应该渲染到 HTML 输出中。这些属性在 SSR 阶段需要被过滤掉。

```typescript
// packages/server-renderer/src/helpers/ssrRenderAttrs.ts

/**
 * 判断是否为保留属性
 */
function isReservedProp(key: string): boolean {
  return (
    key === 'key' ||
    key === 'ref' ||
    key === 'ref_for' ||
    key === 'ref_key' ||
    key.startsWith('onVnode') ||
    key === '__v_isVNode'
  )
}
```

`key` 属性用于 diff 算法，帮助 Vue 识别节点的唯一性。在客户端渲染时，key 用于优化列表更新；在 SSR 中，由于不存在 diff 过程，key 不需要输出到 HTML。

`ref` 属性用于获取 DOM 或组件实例的引用。服务端没有真实的 DOM 环境，ref 在 SSR 阶段没有意义，因此也需要过滤。

以 `onVnode` 开头的属性是 Vue 内部的生命周期钩子属性，如 `onVnodeMounted`、`onVnodeUpdated`，这些仅在客户端有效。

## 事件属性

事件处理器是另一类需要特殊处理的属性。在 SSR 中，事件处理器不会输出到 HTML，而是在客户端 hydration 时绑定。

```typescript
/**
 * 判断是否为事件属性
 */
function isEventKey(key: string): boolean {
  return key.charCodeAt(0) === 111 /* o */ &&
         key.charCodeAt(1) === 110 /* n */ &&
         // 排除 onVnode 开头的
         key.charCodeAt(2) !== 86 /* V */ &&
         // 第三个字符必须是大写字母
         key.charCodeAt(2) >= 65 && key.charCodeAt(2) <= 90
}
```

这个判断逻辑通过字符编码检查属性名是否以 `on` 开头且第三个字符是大写字母。例如 `onClick`、`onMouseenter` 会被识别为事件，而 `online`（浏览器在线状态属性）则不会。

过滤事件属性的原因在于：HTML 属性中的内联事件处理（如 `onclick="..."`）需要字符串形式的代码，而 Vue 的事件处理器是函数。将函数序列化为字符串既不安全也不实用，因此 Vue 选择在 hydration 阶段重新绑定事件。

## v-model 相关属性

v-model 在编译阶段会被转换为 props 和事件的组合。对于原生元素，v-model 涉及到 `value`、`checked` 等属性的处理。

```typescript
/**
 * 处理表单元素的 v-model 属性
 */
function renderVModelProp(
  tag: string,
  props: Record<string, any>
): string {
  let result = ''
  
  if (tag === 'input') {
    const type = props.type
    
    if (type === 'checkbox' || type === 'radio') {
      // checkbox/radio 使用 checked 属性
      if (props.checked) {
        result += ' checked'
      }
    } else {
      // 其他 input 使用 value 属性
      if (props.value != null) {
        result += ` value="${escapeHtml(String(props.value))}"`
      }
    }
  } else if (tag === 'textarea') {
    // textarea 的值作为内容渲染，不是属性
    // 在 renderChildren 中处理
  } else if (tag === 'select') {
    // select 的值通过 option 的 selected 属性体现
    // 需要在渲染 option 时根据 value 设置 selected
  }
  
  return result
}
```

select 元素的 v-model 处理稍微复杂。Vue 需要在渲染 option 子元素时，比较 option 的值与 select 的 modelValue，匹配时添加 `selected` 属性。

## innerHTML 与 textContent

`innerHTML` 和 `textContent` 是 DOM 属性，用于设置元素的内容。在 SSR 中，这些属性需要转换为元素的子内容。

```typescript
/**
 * 处理 innerHTML
 */
function handleInnerHTML(
  props: Record<string, any>,
  children: VNodeChildren
): { renderContent: string; skipChildren: boolean } {
  if ('innerHTML' in props) {
    // v-html 指令：直接输出 HTML，不转义
    return {
      renderContent: props.innerHTML,
      skipChildren: true
    }
  }
  
  if ('textContent' in props) {
    // textContent：作为文本输出，需要转义
    return {
      renderContent: escapeHtml(String(props.textContent)),
      skipChildren: true
    }
  }
  
  return {
    renderContent: '',
    skipChildren: false
  }
}
```

使用 `innerHTML`（对应 v-html 指令）时，内容不会被转义，这意味着开发者需要确保内容的安全性，避免 XSS 攻击。

## suppressHydrationWarning

Vue 3.5 引入了 `data-allow-mismatch` 属性，允许开发者标记某些预期存在不匹配的元素，避免 hydration 警告。

```typescript
/**
 * 检查是否允许 mismatch
 */
function allowMismatch(el: Element, type: MismatchType): boolean {
  const attr = el.getAttribute('data-allow-mismatch')
  
  if (attr === '') {
    // 空值表示允许所有类型的 mismatch
    return true
  }
  
  if (attr) {
    // 逗号分隔的类型列表
    const types = attr.split(',').map(t => t.trim())
    return types.includes(type)
  }
  
  return false
}

// 使用示例
// <span data-allow-mismatch="text">{{ clientOnlyValue }}</span>
// <div data-allow-mismatch="class,style">...</div>
// <time data-allow-mismatch>{{ formattedDate }}</time>
```

这个功能在某些场景下非常有用，比如显示客户端时间、随机内容等预期会与服务端不同的情况。

## 小结

本章分析了 Vue SSR 中特殊属性的处理：

1. **保留属性**：key、ref 等内部属性被过滤
2. **事件属性**：onClick 等事件在 SSR 中不输出
3. **v-model 属性**：根据元素类型转换为对应的 HTML 属性
4. **innerHTML/textContent**：转换为元素内容
5. **suppressHydrationWarning**：控制 hydration 警告

正确处理特殊属性确保了 SSR 输出的正确性和安全性。
