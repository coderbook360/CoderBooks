# 属性与样式的处理：patchProp

**首先要问的是**：class、style、onclick、disabled... 这些属性应该如何设置到 DOM 上？它们的处理方式相同吗？

**答案是不同！这里有很多细节。** `patchProp` 需要根据属性类型分别处理。

## patchProp 整体设计

```javascript
function patchProp(el, key, prevValue, nextValue, isSVG) {
  if (key === 'class') {
    patchClass(el, nextValue, isSVG)
  } else if (key === 'style') {
    patchStyle(el, prevValue, nextValue)
  } else if (isOn(key)) {
    // 事件：onClick, onMouseenter 等
    patchEvent(el, key, prevValue, nextValue)
  } else if (shouldSetAsProp(el, key, nextValue, isSVG)) {
    // DOM Property
    patchDOMProp(el, key, nextValue)
  } else {
    // HTML Attribute
    patchAttr(el, key, nextValue, isSVG)
  }
}

// 判断是否是事件（以 on 开头，第三个字符是大写）
function isOn(key) {
  return key[0] === 'o' && key[1] === 'n' && key.charCodeAt(2) > 96
}
```

## 处理 class

```javascript
function patchClass(el, value, isSVG) {
  if (value == null) {
    el.removeAttribute('class')
  } else if (isSVG) {
    // SVG 使用 setAttribute
    el.setAttribute('class', value)
  } else {
    // 普通元素使用 className（更快）
    el.className = value
  }
}
```

class 可以是多种类型，需要在 VNode 创建时规范化：

```javascript
// 字符串
class: 'foo bar'

// 对象
class: { foo: true, bar: false }

// 数组
class: ['foo', { bar: true }]
```

规范化函数：

```javascript
function normalizeClass(value) {
  let res = ''
  
  if (typeof value === 'string') {
    res = value
  } else if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeClass(item)
      if (normalized) {
        res += normalized + ' '
      }
    }
  } else if (typeof value === 'object') {
    for (const key in value) {
      if (value[key]) {
        res += key + ' '
      }
    }
  }
  
  return res.trim()
}
```

## 处理 style

```javascript
function patchStyle(el, prev, next) {
  const style = el.style
  
  if (next && typeof next !== 'string') {
    // 对象形式
    for (const key in next) {
      setStyle(style, key, next[key])
    }
    
    // 移除旧的不存在于新的
    if (prev && typeof prev !== 'string') {
      for (const key in prev) {
        if (next[key] == null) {
          setStyle(style, key, '')
        }
      }
    }
  } else {
    if (typeof next === 'string') {
      // 字符串形式
      if (prev !== next) {
        style.cssText = next
      }
    } else if (prev) {
      // next 为空，移除所有样式
      el.removeAttribute('style')
    }
  }
}

function setStyle(style, name, value) {
  if (name.startsWith('--')) {
    // CSS 变量
    style.setProperty(name, value)
  } else {
    // 普通属性
    style[name] = value
  }
}
```

## DOM Property vs HTML Attribute

这是一个容易混淆的概念：

```html
<input value="hello">
```

```javascript
// HTML Attribute：定义在 HTML 中
el.getAttribute('value')  // 'hello'

// DOM Property：DOM 对象的属性
el.value  // 用户输入后可能变化
```

区别：

1. **类型**：Attribute 是字符串，Property 可以是任意类型
2. **值**：Attribute 反映初始值，Property 反映当前值
3. **名称**：某些不同（class/className, for/htmlFor）

## 判断使用哪种方式

```javascript
function shouldSetAsProp(el, key, value, isSVG) {
  // SVG 的属性大多用 setAttribute
  if (isSVG) {
    if (key === 'innerHTML' || key === 'textContent') {
      return true
    }
    return false
  }
  
  // 某些属性必须用 setAttribute
  if (key === 'form' || key === 'list' || key === 'type') {
    return false
  }
  
  // 检查是否是 DOM Property
  if (key in el) {
    return true
  }
  
  return false
}
```

## patchDOMProp

```javascript
function patchDOMProp(el, key, value) {
  if (key === 'innerHTML' || key === 'textContent') {
    el[key] = value == null ? '' : value
    return
  }
  
  if (key === 'value') {
    // value 特殊处理
    el._value = value
    const newValue = value == null ? '' : value
    if (el.value !== newValue) {
      el.value = newValue
    }
    return
  }
  
  // 布尔属性
  if (value === '' && typeof el[key] === 'boolean') {
    el[key] = true
  } else {
    el[key] = value == null ? '' : value
  }
}
```

## patchAttr

```javascript
function patchAttr(el, key, value, isSVG) {
  if (value == null) {
    el.removeAttribute(key)
  } else {
    el.setAttribute(key, value)
  }
}
```

## 布尔属性

某些属性是布尔型的：

```html
<input disabled>
<!-- 等价于 -->
<input disabled="">
```

```javascript
// 布尔属性列表
const booleanAttrs = [
  'disabled', 'checked', 'selected', 'readonly', 'hidden',
  'required', 'multiple', 'autofocus', 'autoplay', 'controls',
  'loop', 'muted', 'open', 'default', 'defer', 'async', 'novalidate'
]

function patchAttr(el, key, value, isSVG) {
  if (value == null || value === false) {
    el.removeAttribute(key)
  } else {
    // 布尔属性设置为空字符串
    el.setAttribute(key, value === true ? '' : value)
  }
}
```

## 完整的 patchProp

```javascript
function patchProp(el, key, prev, next, isSVG) {
  if (key === 'class') {
    // class
    if (next == null) {
      el.removeAttribute('class')
    } else if (isSVG) {
      el.setAttribute('class', next)
    } else {
      el.className = next
    }
  } else if (key === 'style') {
    // style
    if (next) {
      if (typeof next === 'string') {
        el.style.cssText = next
      } else {
        for (const k in next) {
          el.style[k] = next[k]
        }
        if (prev && typeof prev !== 'string') {
          for (const k in prev) {
            if (!(k in next)) {
              el.style[k] = ''
            }
          }
        }
      }
    } else {
      el.removeAttribute('style')
    }
  } else if (/^on[A-Z]/.test(key)) {
    // 事件
    patchEvent(el, key, prev, next)
  } else if (key in el && !isSVG) {
    // DOM Property
    if (next === '' && typeof el[key] === 'boolean') {
      el[key] = true
    } else {
      el[key] = next == null ? '' : next
    }
  } else {
    // HTML Attribute
    if (next == null || next === false) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, next === true ? '' : next)
    }
  }
}
```

## 特殊属性

### 自定义属性（data-*）

```javascript
el.setAttribute('data-id', value)
// 或
el.dataset.id = value
```

### ARIA 属性

```javascript
el.setAttribute('aria-label', value)
```

### 枚举属性

某些属性有固定的可选值：

```html
<div contenteditable="true">  <!-- 必须是字符串 -->
<div draggable="true">
```

## 本章小结

`patchProp` 根据属性类型分别处理：

- **class**：使用 `className`（HTML）或 `setAttribute`（SVG）
- **style**：对象形式遍历设置，字符串形式使用 `cssText`
- **事件**：使用 invoker 模式（下一章详解）
- **DOM Property**：直接设置 `el[key]`
- **HTML Attribute**：使用 `setAttribute`

判断使用哪种方式：

- 事件以 `on` 开头
- `class`、`style` 特殊处理
- 检查 `key in el` 判断是否是 DOM Property
- SVG 大多使用 Attribute

---

## 练习与思考

1. 实现完整的 `patchProp`。

2. 为什么 `el.className` 比 `el.setAttribute('class', ...)` 更快？

3. 以下代码有什么区别？

```javascript
el.value = 'hello'
el.setAttribute('value', 'hello')
```
