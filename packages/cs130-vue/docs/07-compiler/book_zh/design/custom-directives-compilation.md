# 自定义指令编译

Vue 的指令系统允许开发者扩展模板的行为。除了内置指令（v-if、v-for、v-model 等），开发者可以创建自定义指令。编译器需要正确处理这些自定义指令，生成合适的运行时代码。

## 指令的基本结构

指令在模板中的形式：

```html
<template>
  <div v-custom-directive:arg.modifier="value">Content</div>
</template>
```

包含几个部分：名称（custom-directive）、参数（arg）、修饰符（modifier）、值表达式（value）。

## 解析阶段

解析器识别 v- 前缀的属性为指令：

```typescript
function parseAttribute(context) {
  const name = ...
  const value = ...
  
  if (/^(v-|:|@|#)/.test(name)) {
    // 这是指令
    return parseDirective(name, value, context)
  }
  
  // 普通属性
  return { type: NodeTypes.ATTRIBUTE, name, value }
}
```

解析结果是 DirectiveNode：

```typescript
interface DirectiveNode {
  type: NodeTypes.DIRECTIVE
  name: string        // 指令名（不含 v-）
  arg: ExpressionNode | undefined    // 参数
  exp: ExpressionNode | undefined    // 表达式
  modifiers: string[]  // 修饰符列表
  loc: SourceLocation
}
```

## 内置指令 vs 自定义指令

编译器需要区分内置指令和自定义指令：

```typescript
const builtInDirectives = ['if', 'else', 'else-if', 'for', 'on', 'bind', 'model', 'slot', 'pre', 'cloak', 'once', 'memo']

function isBuiltInDirective(name: string): boolean {
  return builtInDirectives.includes(name)
}
```

内置指令有专门的转换插件处理（transformIf、transformFor 等）。自定义指令使用通用的处理逻辑。

## 自定义指令的转换

自定义指令的处理相对简单——编译器不理解其语义，只负责传递给运行时：

```typescript
function buildDirectiveArgs(dir: DirectiveNode, context) {
  const dirArgs = []
  
  // 指令对象（运行时解析）
  dirArgs.push(resolveDirective(dir.name))
  
  // 绑定值
  if (dir.exp) {
    dirArgs.push(dir.exp)
  } else {
    dirArgs.push('void 0')
  }
  
  // 参数
  if (dir.arg) {
    if (!dir.exp) dirArgs.push('void 0')
    dirArgs.push(dir.arg)
  }
  
  // 修饰符对象
  if (dir.modifiers.length) {
    if (!dir.arg) {
      dirArgs.push('void 0')
      dirArgs.push('void 0')
    }
    dirArgs.push(createModifiersObject(dir.modifiers))
  }
  
  return dirArgs
}
```

## 代码生成

使用自定义指令的元素通过 withDirectives 包装：

```html
<template>
  <input v-focus v-validate:email.required="rules" />
</template>
```

生成：

```javascript
import { withDirectives, resolveDirective } from 'vue'

const _directive_focus = resolveDirective('focus')
const _directive_validate = resolveDirective('validate')

function render(_ctx) {
  return withDirectives(
    createVNode('input'),
    [
      [_directive_focus],
      [_directive_validate, _ctx.rules, 'email', { required: true }]
    ]
  )
}
```

withDirectives 在运行时为 VNode 附加指令信息。

## 指令的解析时机

resolveDirective 在渲染函数顶部被调用：

```javascript
const _directive_focus = resolveDirective('focus')
```

这发生在 setup 执行后、render 执行时。resolveDirective 从组件实例或全局注册中查找指令对象。

如果指令未注册，开发环境会警告，生产环境返回 undefined（指令不生效）。

## 动态指令名

指令名可以是动态的：

```html
<div v-[directiveName]="value" />
```

生成：

```javascript
withDirectives(
  createVNode('div'),
  [[resolveDynamicDirective(_ctx.directiveName), _ctx.value]]
)
```

动态解析有性能开销，应谨慎使用。

## 参数和修饰符

参数作为字符串传递：

```html
<div v-custom:foo="bar" />
```

生成：

```javascript
[_directive_custom, _ctx.bar, 'foo']
```

修饰符打包成对象：

```html
<div v-custom.a.b.c="value" />
```

生成：

```javascript
[_directive_custom, _ctx.value, void 0, { a: true, b: true, c: true }]
```

## 与组件的配合

指令可以用在组件上：

```html
<MyComponent v-custom="value" />
```

指令会作用于组件渲染的根元素。如果组件有多个根元素，会有警告。

编译生成的代码与普通元素相同：

```javascript
withDirectives(
  createVNode(MyComponent, props),
  [[_directive_custom, _ctx.value]]
)
```

## 与 v-slot 的特殊处理

v-slot 虽然语法类似指令，但实际上不是指令——它只在编译时有意义，不产生运行时指令调用：

```html
<template v-slot:header>...</template>
```

编译器识别这是插槽定义，不会生成 withDirectives。

## SSR 中的处理

服务端渲染时，指令的处理方式不同。大多数指令在服务端没有意义（如 v-focus），编译器生成的 SSR 代码会跳过它们。

某些指令（如 v-show）在 SSR 中需要特殊处理，输出对应的样式或属性。

## 运行时指令生命周期

虽然是编译章节，理解运行时行为有助于理解编译选择：

指令有多个钩子：created、beforeMount、mounted、beforeUpdate、updated、beforeUnmount、unmounted。

编译器只负责传递指令信息，生命周期的调用由运行时的 invokeDirectiveHook 处理。

## 小结

自定义指令的编译相对直接——编译器不理解指令的语义，只负责解析语法（名称、参数、修饰符、表达式）并生成运行时调用。resolveDirective 在渲染时解析指令对象，withDirectives 将指令信息附加到 VNode。内置指令有专门的转换逻辑，自定义指令使用通用处理。这种设计让指令系统保持灵活可扩展，同时编译器代码保持简洁。
