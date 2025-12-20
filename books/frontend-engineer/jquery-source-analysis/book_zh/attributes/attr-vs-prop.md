# attr 与 prop：何时用哪个

前两章我们分别探索了 `attr()` 和 `prop()` 的实现。本章我们将通过系统性的对比，彻底理清这两个方法的区别和适用场景。这是 jQuery 开发中最容易混淆的知识点之一。

## 核心概念回顾

**attr() - HTML 属性**：
- 对应 HTML 标签中写的内容
- 使用 `getAttribute/setAttribute`
- 值始终是字符串或 null
- 表示**初始状态**

**prop() - DOM 属性**：
- 对应 JavaScript 对象的属性
- 使用点语法（`element.property`）
- 值可以是任意类型
- 表示**当前状态**

## 决策流程图

```
需要操作属性
      ↓
是布尔属性吗？（checked, disabled, selected, readonly...）
    ↓是                    ↓否
使用 prop()          需要当前状态还是初始值？
                        ↓当前状态      ↓初始值
                      使用 prop()    使用 attr()
```

## 属性分类与选择

### 第一类：布尔属性（始终用 prop）

这些属性表示开/关状态：

| 属性 | 说明 | 推荐方法 |
|------|------|----------|
| checked | 复选框/单选框选中状态 | prop |
| disabled | 禁用状态 | prop |
| selected | 选项选中状态 | prop |
| readonly | 只读状态 | prop |
| multiple | 多选 | prop |
| autofocus | 自动聚焦 | prop |
| required | 必填 | prop |

```javascript
// ✅ 正确
$('input').prop('checked', true);
$('button').prop('disabled', false);
$('option').prop('selected', true);

// ❌ 避免
$('input').attr('checked', true);   // 不一定生效
$('button').attr('disabled', false); // 不会启用按钮
```

### 第二类：动态值属性（通常用 prop）

这些属性的值会随用户交互变化：

| 属性 | 说明 | 推荐方法 |
|------|------|----------|
| value | 输入框当前值 | prop 或 val() |
| selectedIndex | 选中项索引 | prop |
| scrollTop/scrollLeft | 滚动位置 | prop |
| innerHTML/textContent | 内容 | prop |

```javascript
// 获取当前输入值
const currentValue = $('input').prop('value');
// 或更常用
const currentValue = $('input').val();

// 获取滚动位置
const scrollPos = $('div').prop('scrollTop');
```

### 第三类：静态属性（通常用 attr）

这些属性一般不会动态变化：

| 属性 | 说明 | 推荐方法 |
|------|------|----------|
| id | 元素 ID | attr |
| class | CSS 类（但操作用 addClass 等） | attr |
| src | 图片/脚本源 | attr |
| href | 链接地址（原始值） | attr |
| title | 提示文本 | attr |
| alt | 替代文本 | attr |
| placeholder | 占位符 | attr |

```javascript
// 读取/设置 ID
$('div').attr('id', 'new-id');

// 设置图片源
$('img').attr('src', 'image.jpg');

// 设置链接（原始值）
$('a').attr('href', '/path');
```

### 第四类：data-* 属性

```javascript
// 使用 attr
$('div').attr('data-id', '123');
const id = $('div').attr('data-id');  // "123"（字符串）

// 使用 data（更推荐）
$('div').data('id', 123);
const id = $('div').data('id');  // 123（自动类型转换）
```

`data()` 方法的优势：
- 自动类型转换
- 支持复杂对象
- 缓存机制

## 经典问题剖析

### 问题一：为什么 attr('checked') 返回 undefined？

```html
<input type="checkbox" id="cb">
```

```javascript
$('#cb').prop('checked', true);
$('#cb').attr('checked');  // undefined！
```

**原因**：HTML 中没有写 `checked` 属性，所以 `getAttribute('checked')` 返回 null（jQuery 转为 undefined）。

**正解**：检查选中状态应该用 `prop('checked')`。

### 问题二：设置 attr('checked', false) 为什么不生效？

```javascript
$('input').attr('checked', false);  // 不会取消选中
```

**原因**：`attr('checked', false)` 被 boolHook 处理为 `removeAttribute('checked')`，但这只移除了 HTML 属性，DOM 属性可能仍为 true。

**正解**：

```javascript
$('input').prop('checked', false);  // 正确取消选中
```

### 问题三：href 返回值为什么不同？

```html
<a href="/path" id="link">Link</a>
```

```javascript
$('#link').attr('href');  // "/path"
$('#link').prop('href');  // "http://example.com/path"
```

**原因**：
- `getAttribute('href')` 返回原始值
- `element.href` 返回规范化的完整 URL

**选择依据**：需要原始值用 attr，需要完整 URL 用 prop。

### 问题四：value 的困惑

```html
<input type="text" value="initial" id="input">
```

用户输入 "new text" 后：

```javascript
$('#input').attr('value');  // "initial"（HTML 属性，初始值）
$('#input').prop('value');  // "new text"（DOM 属性，当前值）
$('#input').val();          // "new text"（等同于 prop('value')）
```

**实际开发**：几乎总是使用 `val()`，它内部使用 prop。

## 源码层面的对比

```javascript
// attr 的核心逻辑
elem.setAttribute( name, value + "" );
ret = jQuery.find.attr( elem, name );

// prop 的核心逻辑
elem[ name ] = value;
return elem[ name ];
```

**关键区别**：
- attr 使用 DOM API（getAttribute/setAttribute）
- prop 直接操作对象属性

## 混用的风险

```javascript
// 设置用 attr，读取用 prop
$('input').attr('checked', 'checked');
const isChecked = $('input').prop('checked');  // 可能不一致

// 设置用 prop，读取用 attr
$('input').prop('checked', true);
$('input').attr('checked');  // undefined（如果 HTML 中没有）
```

**最佳实践**：同一属性的读写使用同一方法。

## 快速参考表

| 需求 | 方法 | 示例 |
|------|------|------|
| 复选框是否选中 | prop | `$cb.prop('checked')` |
| 按钮是否禁用 | prop | `$btn.prop('disabled')` |
| 输入框当前值 | val | `$input.val()` |
| 链接原始地址 | attr | `$a.attr('href')` |
| 链接完整URL | prop | `$a.prop('href')` |
| 图片源地址 | attr | `$img.attr('src')` |
| 元素 ID | attr | `$el.attr('id')` |
| 自定义数据 | data | `$el.data('key')` |
| 滚动位置 | prop | `$el.prop('scrollTop')` |
| 表单有效性 | prop | `$form.prop('validity')` |

## 简化记忆法

**记住两条规则**：

1. **布尔属性用 prop**：checked、disabled、selected 等
2. **获取当前状态用 prop**：用户交互后的值、动态变化的属性

**其他情况用 attr**：静态属性、data-* 属性、需要原始值时

## 调试技巧

```javascript
// 同时查看两种属性
function debugAttribute(selector, name) {
    const $el = $(selector);
    console.log({
        'attr': $el.attr(name),
        'prop': $el.prop(name),
        'getAttribute': $el[0]?.getAttribute(name),
        'direct': $el[0]?.[name]
    });
}

debugAttribute('input[type="checkbox"]', 'checked');
// {attr: "checked", prop: true, getAttribute: "checked", direct: true}
```

## 历史背景

在 jQuery 1.6 之前，`attr()` 同时处理 HTML 属性和 DOM 属性，这导致了很多混乱。1.6 版本引入了 `prop()`，明确区分两者。

这个改变虽然增加了学习成本，但让 API 语义更加清晰，减少了隐藏的 bug。

## 设计智慧总结

1. **概念分离**：HTML 属性和 DOM 属性是不同的概念，应该用不同的方法
2. **类型安全**：prop 返回正确的类型，attr 总是返回字符串
3. **状态语义**：attr 表示初始状态，prop 表示当前状态
4. **向后兼容**：通过 hooks 机制处理边界情况

理解 attr 和 prop 的区别，是 jQuery 进阶的必经之路。掌握了这个知识点，属性操作中的大部分困惑都会迎刃而解。

下一章，我们将探索 `val()` 方法——jQuery 中专门用于表单值操作的工具，看看它是如何统一处理各种表单元素的。
