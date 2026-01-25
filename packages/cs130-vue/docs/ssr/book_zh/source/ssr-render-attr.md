# ssrRenderAttr 单属性渲染

`ssrRenderAttr` 是属性渲染的基础函数，处理单个 HTML 属性的序列化。虽然逻辑看似简单，但其中包含了很多 HTML 规范的细节。

## 函数签名

```typescript
function ssrRenderAttr(key: string, value: unknown): string
```

函数接收属性名和属性值，返回格式化的属性字符串（包含前导空格）。

## 基本实现

```typescript
function ssrRenderAttr(key: string, value: unknown): string {
  if (!isRenderableAttrValue(value)) {
    return ''
  }
  return ` ${key}="${escapeHtmlAttr(String(value))}"`
}

function isRenderableAttrValue(value: unknown): boolean {
  if (value == null) {
    return false
  }
  const type = typeof value
  return type === 'string' || type === 'number' || type === 'boolean'
}
```

简单明了：检查值是否可渲染，然后格式化输出。

## 值的过滤规则

并非所有值都应该渲染到 HTML 中。

**null 和 undefined**不渲染。这让条件属性变得优雅：

```javascript
ssrRenderAttr('title', null)       // ''
ssrRenderAttr('title', undefined)  // ''

// 实际使用
<div :title="hasTitle ? title : null">
// hasTitle 为 false 时，title 属性不会出现
```

**对象和数组**不直接渲染，需要先序列化：

```javascript
ssrRenderAttr('data-config', { a: 1 })  // '' 或抛出警告

// 正确做法
ssrRenderAttr('data-config', JSON.stringify({ a: 1 }))
// ' data-config="{\"a\":1}"'
```

**函数**不渲染：

```javascript
ssrRenderAttr('onclick', () => {})  // ''
```

## 布尔属性

HTML 有很多布尔属性，它们的存在即表示 true：

```html
<input disabled>
<input checked>
<button autofocus>
```

`ssrRenderAttr` 需要识别这些属性：

```typescript
const isBooleanAttr = makeSet(
  'allowfullscreen,async,autofocus,autoplay,checked,compact,controls,' +
  'declare,default,defaultchecked,defaultmuted,defaultselected,defer,' +
  'disabled,enabled,formnovalidate,hidden,indeterminate,inert,ismap,' +
  'itemscope,loop,multiple,muted,nohref,noresize,noshade,novalidate,' +
  'nowrap,open,pauseonexit,readonly,required,reversed,scoped,seamless,' +
  'selected,sortable,truespeed,typemustmatch,visible'
)

function ssrRenderAttr(key: string, value: unknown): string {
  if (isBooleanAttr(key)) {
    // 布尔属性：值为真则渲染属性名，否则不渲染
    return value ? ` ${key}` : ''
  }
  // ... 其他处理
}
```

布尔属性的值处理：

```javascript
ssrRenderAttr('disabled', true)   // ' disabled'
ssrRenderAttr('disabled', false)  // ''
ssrRenderAttr('disabled', '')     // ''  (空字符串视为 false)
ssrRenderAttr('disabled', 'disabled')  // ' disabled'
```

## 枚举属性

有些属性的值只能是特定字符串：

```html
<div contenteditable="true">
<div draggable="false">
<div spellcheck="true">
```

这些属性需要特殊处理，因为布尔值 `true`/`false` 需要转换为字符串 `"true"`/`"false"`：

```typescript
const isEnumeratedAttr = makeSet(
  'contenteditable,draggable,spellcheck'
)

function ssrRenderAttr(key: string, value: unknown): string {
  if (isEnumeratedAttr(key)) {
    // 枚举属性：保留字符串形式
    return ` ${key}="${value === true ? 'true' : value === false ? 'false' : value}"`
  }
  // ...
}
```

枚举属性的特殊之处：

```javascript
// 布尔属性
<button disabled>        // disabled 存在
<button>                 // disabled 不存在

// 枚举属性
<div contenteditable="true">   // 可编辑
<div contenteditable="false">  // 不可编辑
<div contenteditable>          // 等同于 "true"
```

## 属性值转义

属性值必须转义，防止 HTML 注入：

```typescript
function escapeHtmlAttr(str: string): string {
  // 属性值用双引号包裹，需要转义的字符较少
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
}
```

与文本内容的转义不同，属性值只需要转义 `&` 和 `"`：

```javascript
// 文本内容需要转义 < 和 >
<div>A < B > C</div>  // 错误，< 会被解析为标签
<div>A &lt; B &gt; C</div>  // 正确

// 属性值不需要
<div title="A < B > C">  // 正确，在双引号内 < > 是安全的
<div title="He said &quot;Hi&quot;">  // 需要转义引号
```

## 特殊字符处理

某些特殊字符需要额外处理。

**换行符**在属性值中应该被保留：

```typescript
function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/\r?\n/g, '&#10;')  // 换行符转义
}
```

**Unicode 字符**通常不需要转义，现代浏览器都支持 UTF-8。

## 属性名验证

恶意输入可能包含非法属性名：

```typescript
function isValidAttrName(name: string): boolean {
  // HTML5 属性名规则
  return /^[^\s"'<>\/=]+$/.test(name)
}

function ssrRenderAttr(key: string, value: unknown): string {
  if (!isValidAttrName(key)) {
    __DEV__ && warn(`Invalid attribute name: ${key}`)
    return ''
  }
  // ...
}
```

非法属性名的例子：

```javascript
ssrRenderAttr('data-<script>', 'value')  // 危险！
ssrRenderAttr('data id', 'value')        // 包含空格
ssrRenderAttr('"onclick"', 'alert(1)')   // 包含引号
```

## data-* 属性

HTML5 的 data-* 属性用于存储自定义数据：

```javascript
ssrRenderAttr('data-id', 123)
// ' data-id="123"'

ssrRenderAttr('data-config', JSON.stringify({ a: 1, b: 2 }))
// ' data-config="{\"a\":1,\"b\":2}"'
```

data-* 属性没有特殊处理，按普通属性规则渲染。

## aria-* 属性

无障碍属性同样按普通规则处理：

```javascript
ssrRenderAttr('aria-label', 'Close button')
// ' aria-label="Close button"'

ssrRenderAttr('aria-hidden', true)
// ' aria-hidden="true"'  (注意：不是布尔属性)
```

注意 aria-* 不是布尔属性，`aria-hidden="true"` 和 `aria-hidden` 含义不同。

## 数值属性

数值会自动转换为字符串：

```javascript
ssrRenderAttr('tabindex', 0)      // ' tabindex="0"'
ssrRenderAttr('maxlength', 100)   // ' maxlength="100"'
ssrRenderAttr('width', 300)       // ' width="300"'
```

特殊数值的处理：

```javascript
ssrRenderAttr('data-value', NaN)       // ' data-value="NaN"'
ssrRenderAttr('data-value', Infinity)  // ' data-value="Infinity"'
```

## 完整实现

综合以上规则：

```typescript
function ssrRenderAttr(key: string, value: unknown): string {
  // 1. 验证属性名
  if (!isValidAttrName(key)) {
    return ''
  }
  
  // 2. 过滤不可渲染的值
  if (value == null || typeof value === 'function' || typeof value === 'symbol') {
    return ''
  }
  
  // 3. 布尔属性
  if (isBooleanAttr(key)) {
    return value ? ` ${key}` : ''
  }
  
  // 4. 枚举属性
  if (isEnumeratedAttr(key)) {
    const strValue = value === true ? 'true' : value === false ? 'false' : String(value)
    return ` ${key}="${escapeHtmlAttr(strValue)}"`
  }
  
  // 5. 值为 false 的普通属性不渲染
  if (value === false) {
    return ''
  }
  
  // 6. 普通属性
  return ` ${key}="${escapeHtmlAttr(String(value))}"`
}
```

## 性能考量

`ssrRenderAttr` 调用频率很高，每个元素的每个属性都要调用一次。

**字符串拼接优化**。使用模板字符串通常比 `+` 拼接更快。

**类型检查优先级**。把最常见的情况放在前面：

```typescript
// 优化后的顺序
if (value == null) return ''           // 最常见的跳过情况
if (isBooleanAttr(key)) ...            // 布尔属性很常见
// ... 其他情况
```

**属性集合查询**。使用 Set 而不是数组进行查询：

```typescript
// 慢
const booleanAttrs = ['disabled', 'checked', ...]
if (booleanAttrs.includes(key)) ...

// 快
const booleanAttrs = new Set(['disabled', 'checked', ...])
if (booleanAttrs.has(key)) ...
```

## 小结

`ssrRenderAttr` 处理单个 HTML 属性的序列化：

1. 验证属性名的合法性
2. 过滤 null、undefined、函数等不可渲染的值
3. 布尔属性只渲染属性名
4. 枚举属性保留字符串形式
5. 普通属性转换为字符串并转义
6. 返回带前导空格的属性字符串

这个看似简单的函数，背后是对 HTML 规范的精确实现。理解这些细节，有助于我们写出更规范的前端代码。
