# v-bind 与动态属性的转换

`v-bind`（简写 `:`）是属性绑定指令。**它看起来简单，但涉及 class、style 的特殊处理和无参数的对象绑定。**

**理解 v-bind 的转换原理，能帮你更好地理解为什么 class 和 style 需要特殊处理。** 本章将分析 v-bind 转换器的实现。

## 转换目标

```html
<!-- 原始模板 -->
<div :id="dynamicId" :class="{ active: isActive }" :style="styles">
  Content
</div>
<div v-bind="attrs">With Object</div>
```

```javascript
// 转换后
function render(_ctx) {
  return (_openBlock(), _createElementBlock(_Fragment, null, [
    _createElementVNode("div", {
      id: _ctx.dynamicId,
      class: _normalizeClass({ active: _ctx.isActive }),
      style: _normalizeStyle(_ctx.styles)
    }, "Content"),
    
    _createElementVNode("div",
      _normalizeProps(_guardReactiveProps(_ctx.attrs)),
      "With Object"
    )
  ], 64))
}
```

## transformBind 实现

```javascript
const transformBind = (dir, _node, context) => {
  const { exp, modifiers, loc } = dir
  const arg = dir.arg
  
  // 处理动态参数
  if (arg.type !== NodeTypes.SIMPLE_EXPRESSION) {
    arg.children.unshift('(')
    arg.children.push(') || ""')
  } else if (!arg.isStatic) {
    arg.content = `${arg.content} || ""`
  }
  
  // 处理修饰符
  if (modifiers.includes('camel')) {
    if (arg.type === NodeTypes.SIMPLE_EXPRESSION) {
      if (arg.isStatic) {
        arg.content = camelize(arg.content)
      } else {
        arg.content = `${context.helperString(CAMELIZE)}(${arg.content})`
      }
    } else {
      arg.children.unshift(`${context.helperString(CAMELIZE)}(`)
      arg.children.push(')')
    }
  }
  
  // .prop 修饰符 - 强制为 DOM property
  if (modifiers.includes('prop')) {
    injectPrefix(arg, '.')
  }
  
  // .attr 修饰符 - 强制为 attribute
  if (modifiers.includes('attr')) {
    injectPrefix(arg, '^')
  }
  
  // 无表达式的绑定
  if (!exp || (exp.type === NodeTypes.SIMPLE_EXPRESSION && !exp.content.trim())) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_BIND_NO_EXPRESSION, loc)
    )
    return {
      props: [createObjectProperty(arg, createSimpleExpression('', true))]
    }
  }
  
  return {
    props: [createObjectProperty(arg, exp)]
  }
}
```

## 修饰符处理

### .camel 修饰符

将属性名转为驼峰：

```html
<svg :view-box.camel="viewBox">
```

```javascript
// 转换后
{ viewBox: _ctx.viewBox }
```

### .prop 修饰符

强制绑定为 DOM property：

```html
<div :text-content.prop="text">
```

```javascript
// 使用 . 前缀标记
{ '.textContent': _ctx.text }
```

### .attr 修饰符

强制绑定为 HTML attribute：

```html
<div :foo.attr="bar">
```

```javascript
// 使用 ^ 前缀标记
{ '^foo': _ctx.bar }
```

## class 的特殊处理

class 支持多种格式，需要运行时规范化：

```html
<!-- 对象语法 -->
:class="{ active: isActive, 'text-danger': hasError }"

<!-- 数组语法 -->
:class="[activeClass, errorClass]"

<!-- 混合语法 -->
:class="[{ active: isActive }, errorClass]"
```

在 `transformElement` 中处理：

```javascript
function buildProps(node, context) {
  const properties = []
  
  for (const prop of props) {
    if (prop.type === NodeTypes.DIRECTIVE && prop.name === 'bind') {
      const { props: bindProps } = transformBind(prop, node, context)
      
      for (const p of bindProps) {
        if (isStaticExp(p.key)) {
          // class 属性需要 normalizeClass
          if (p.key.content === 'class') {
            p.value = createCallExpression(
              context.helper(NORMALIZE_CLASS),
              [p.value]
            )
          }
          // style 属性需要 normalizeStyle
          else if (p.key.content === 'style') {
            p.value = createCallExpression(
              context.helper(NORMALIZE_STYLE),
              [p.value]
            )
          }
        }
        properties.push(p)
      }
    }
  }
  
  return { properties }
}
```

生成的代码：

```javascript
{
  class: _normalizeClass({ active: _ctx.isActive }),
  style: _normalizeStyle(_ctx.styles)
}
```

## 对象绑定（无参数）

```html
<div v-bind="attrs">
```

这是把整个对象展开为属性。需要特殊处理：

```javascript
function buildProps(node, context) {
  let mergeArgs = []
  let properties = []
  
  for (const prop of props) {
    if (prop.type === NodeTypes.DIRECTIVE && prop.name === 'bind' && !prop.arg) {
      // 无参数的 v-bind
      if (properties.length) {
        // 先把已收集的属性包装
        mergeArgs.push(createObjectExpression(properties))
        properties = []
      }
      // 添加展开的对象
      mergeArgs.push(prop.exp)
    } else {
      // 正常属性
      // ...
    }
  }
  
  if (mergeArgs.length > 1) {
    // 需要合并多个属性源
    return createCallExpression(
      context.helper(MERGE_PROPS),
      mergeArgs
    )
  }
}
```

生成的代码：

```javascript
// 单个对象绑定
_normalizeProps(_guardReactiveProps(_ctx.attrs))

// 混合静态和动态
_mergeProps({ id: "static" }, _ctx.attrs, { class: "extra" })
```

## normalizeClass 实现

```javascript
function normalizeClass(value) {
  let res = ''
  
  if (isString(value)) {
    res = value
  } else if (isArray(value)) {
    for (const v of value) {
      const normalized = normalizeClass(v)
      if (normalized) {
        res += normalized + ' '
      }
    }
  } else if (isObject(value)) {
    for (const key in value) {
      if (value[key]) {
        res += key + ' '
      }
    }
  }
  
  return res.trim()
}
```

## normalizeStyle 实现

```javascript
function normalizeStyle(value) {
  if (isArray(value)) {
    const res = {}
    for (const v of value) {
      const normalized = isString(v)
        ? parseStringStyle(v)
        : normalizeStyle(v)
      if (normalized) {
        Object.assign(res, normalized)
      }
    }
    return res
  } else if (isString(value)) {
    return value
  } else if (isObject(value)) {
    return value
  }
}
```

## 静态 vs 动态属性

编译器区分静态和动态属性，生成不同的 PatchFlag：

```html
<div id="static" :class="dynamic">
```

```javascript
_createElementVNode("div", {
  id: "static",
  class: _normalizeClass(_ctx.dynamic)
}, null, 2 /* CLASS */)
```

PatchFlag `2` 表示只有 class 是动态的，运行时可以优化 Diff。

## 本章小结

本章分析了 v-bind 转换器的实现：

- **基本转换**：属性名 + 表达式
- **修饰符**：.camel、.prop、.attr
- **class/style**：规范化函数包装
- **对象绑定**：展开 + mergeProps
- **PatchFlag**：区分静态和动态属性

下一章将分析 v-model——双向绑定的语法糖如何转换。
