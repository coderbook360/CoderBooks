# v-on 事件绑定的转换

`v-on`（简写 `@`）是事件绑定指令。**它需要将事件声明转换为属性对象，同时处理修饰符和动态事件名。**

**理解 v-on 的转换原理，能帮你更好地理解事件修饰符的工作方式。** 本章将分析 v-on 转换器的实现。

## 转换目标

```html
<!-- 原始模板 -->
<button @click="handleClick">Click</button>
<button @click.stop.prevent="handleSubmit">Submit</button>
<button @[eventName]="handleDynamic">Dynamic</button>
```

```javascript
// 转换后的渲染函数
function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock(_Fragment, null, [
    // @click="handleClick"
    _createElementVNode("button", {
      onClick: _ctx.handleClick
    }, "Click"),
    
    // @click.stop.prevent="handleSubmit"
    _createElementVNode("button", {
      onClick: _withModifiers(_ctx.handleSubmit, ["stop", "prevent"])
    }, "Submit"),
    
    // @[eventName]="handleDynamic"
    _createElementVNode("button", {
      [_toHandlerKey(_ctx.eventName)]: _ctx.handleDynamic
    }, "Dynamic")
  ], 64))
}
```

## transformOn 实现

```javascript
const transformOn = (dir, node, context, augmentor) => {
  const { loc, modifiers, arg } = dir
  
  // 验证表达式
  if (!dir.exp && !modifiers.length) {
    context.onError(
      createCompilerError(ErrorCodes.X_V_ON_NO_EXPRESSION, loc)
    )
  }
  
  let eventName
  if (arg.type === NodeTypes.SIMPLE_EXPRESSION) {
    if (arg.isStatic) {
      // 静态事件名：click -> onClick
      let rawName = arg.content
      
      // 处理 vnode 生命周期钩子
      if (rawName.startsWith('vue:')) {
        rawName = `vnode-${rawName.slice(4)}`
      }
      
      eventName = createSimpleExpression(
        toHandlerKey(camelize(rawName)),
        true
      )
    } else {
      // 动态事件名
      eventName = createCompoundExpression([
        `${context.helperString(TO_HANDLER_KEY)}(`,
        arg,
        ')'
      ])
    }
  } else {
    // 复合表达式
    eventName = arg
    eventName.children.unshift(`${context.helperString(TO_HANDLER_KEY)}(`)
    eventName.children.push(')')
  }
  
  // 处理表达式
  let exp = dir.exp
  if (exp && !exp.content.trim()) {
    exp = undefined
  }
  
  // 判断是否缓存
  let shouldCache = context.cacheHandlers && !exp && !context.inVOnce
  
  if (exp) {
    // 判断是函数引用还是内联表达式
    const isMemberExp = isMemberExpression(exp.content)
    const isInlineStatement = !(isMemberExp || isFunctionExpression(exp.content))
    const hasMultipleStatements = exp.content.includes(';')
    
    if (isInlineStatement || (shouldCache && isMemberExp)) {
      // 包装为箭头函数
      exp = createCompoundExpression([
        `${isInlineStatement ? '$event' : ''} => ${hasMultipleStatements ? '{' : '('}`,
        exp,
        hasMultipleStatements ? '}' : ')'
      ])
    }
  }
  
  let ret = {
    props: [
      createObjectProperty(
        eventName,
        exp || createSimpleExpression('() => {}', false)
      )
    ]
  }
  
  // 让 DOM 编译器增强（处理修饰符）
  if (augmentor) {
    ret = augmentor(ret)
  }
  
  // 应用缓存
  if (shouldCache) {
    ret.props[0].value = context.cache(ret.props[0].value)
  }
  
  return ret
}
```

## 事件名转换

`toHandlerKey` 将事件名转换为属性名：

```javascript
function toHandlerKey(str) {
  return str ? 'on' + str[0].toUpperCase() + str.slice(1) : ''
}

// click -> onClick
// mouse-enter -> onMouseEnter
```

动态事件名需要运行时处理：

```javascript
// @[eventName]="handler"
{
  [_toHandlerKey(_ctx.eventName)]: _ctx.handler
}
```

## 内联表达式处理

v-on 表达式有几种形式：

```html
<!-- 方法引用 -->
@click="handleClick"

<!-- 内联语句 -->
@click="count++"

<!-- 内联函数 -->
@click="() => count++"

<!-- 带参数的调用 -->
@click="handleClick($event, item)"
```

转换器需要区分处理：

```javascript
const isMemberExp = isMemberExpression(exp.content)  // handleClick
const isInlineStatement = !isMemberExp && !isFunctionExpression(exp.content)

if (isInlineStatement) {
  // 内联语句需要包装
  // count++ -> ($event) => (count++)
  exp = createCompoundExpression([
    '$event => (',
    exp,
    ')'
  ])
}
```

## 事件修饰符

修饰符分三类：

### 1. 事件选项修饰符

```html
@click.capture="handler"
@click.once="handler"
@click.passive="handler"
```

通过修改事件名实现：

```javascript
// onClick -> onClickCapture
// onClick -> onClickOnce
// onClick -> onClickPassive
```

### 2. 事件行为修饰符

```html
@click.stop="handler"
@click.prevent="handler"
@click.self="handler"
```

通过 `withModifiers` 包装：

```javascript
onClick: _withModifiers(_ctx.handler, ["stop", "prevent"])
```

运行时实现：

```javascript
function withModifiers(fn, modifiers) {
  return (event, ...args) => {
    for (const mod of modifiers) {
      if (mod === 'stop') event.stopPropagation()
      else if (mod === 'prevent') event.preventDefault()
      else if (mod === 'self' && event.target !== event.currentTarget) return
    }
    return fn(event, ...args)
  }
}
```

### 3. 按键修饰符

```html
@keyup.enter="handler"
@keyup.esc="handler"
@keyup.space="handler"
```

通过 `withKeys` 包装：

```javascript
onKeyup: _withKeys(_ctx.handler, ["enter"])
```

支持的按键别名：

- `enter`、`tab`、`delete`、`esc`、`space`
- `up`、`down`、`left`、`right`

### 4. 系统修饰符

```html
@click.ctrl="handler"     <!-- Ctrl + 点击 -->
@click.alt="handler"      <!-- Alt + 点击 -->
@click.shift="handler"    <!-- Shift + 点击 -->
@click.meta="handler"     <!-- Cmd(Mac) / Win(Windows) + 点击 -->
@click.exact="handler"    <!-- 精确匹配，无其他系统键 -->
```

这些修饰符通过 `withModifiers` 在运行时检查：

```javascript
const modifierGuards = {
  ctrl: e => !e.ctrlKey,
  shift: e => !e.shiftKey,
  alt: e => !e.altKey,
  meta: e => !e.metaKey,
  left: e => 'button' in e && e.button !== 0,
  middle: e => 'button' in e && e.button !== 1,
  right: e => 'button' in e && e.button !== 2
}
```

### 5. 鼠标按钮修饰符

```html
@click.left="handler"    <!-- 左键（默认） -->
@click.right="handler"   <!-- 右键 -->
@click.middle="handler"  <!-- 中键 -->
```

## DOM 编译器增强

核心编译器只处理通用逻辑，DOM 特定的修饰符由 DOM 编译器处理：

```javascript
// packages/compiler-dom/src/transforms/vOn.ts
const transformOn = (dir, node, context) => {
  return baseTransformOn(dir, node, context, (baseResult) => {
    const { modifiers } = dir
    if (!modifiers.length) return baseResult
    
    let { key, value: handlerExp } = baseResult.props[0]
    const { keyModifiers, nonKeyModifiers, eventOptionModifiers } =
      resolveModifiers(key, modifiers)
    
    // 处理事件选项修饰符
    if (eventOptionModifiers.length) {
      const modifierPostfix = eventOptionModifiers.map(capitalize).join('')
      key = createSimpleExpression(`${key.content}${modifierPostfix}`, true)
    }
    
    // 处理非键盘修饰符
    if (nonKeyModifiers.length) {
      handlerExp = createCallExpression(
        context.helper(V_ON_WITH_MODIFIERS),
        [handlerExp, JSON.stringify(nonKeyModifiers)]
      )
    }
    
    // 处理键盘修饰符
    if (keyModifiers.length) {
      handlerExp = createCallExpression(
        context.helper(V_ON_WITH_KEYS),
        [handlerExp, JSON.stringify(keyModifiers)]
      )
    }
    
    return { props: [createObjectProperty(key, handlerExp)] }
  })
}
```

## 事件缓存

每次渲染都创建新的事件处理函数会导致不必要的更新。Vue 3 支持缓存：

```javascript
// 开启 cacheHandlers 时
function render(_ctx, _cache) {
  return _createElementVNode("button", {
    onClick: _cache[0] || (_cache[0] = ($event) => _ctx.count++)
  }, "Click")
}
```

缓存条件：
- `cacheHandlers` 选项开启
- 不是方法引用（内联表达式）
- 不在 v-once 内

## 本章小结

本章分析了 v-on 转换器的实现：

- **事件名转换**：click -> onClick，支持动态事件名
- **表达式处理**：区分方法引用和内联语句
- **修饰符处理**：事件选项、行为修饰符、键盘修饰符
- **DOM 增强**：核心编译器 + DOM 编译器分层设计
- **事件缓存**：避免重复创建函数对象

下一章将分析 v-bind 的转换——属性绑定的另一面。
