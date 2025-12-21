# 文档片段优化：批量操作

当需要向 DOM 中插入多个元素时，直接操作会导致多次重排。文档片段（DocumentFragment）是解决这个问题的利器。

## 问题：多次插入的性能

```javascript
// 每次 append 都会触发重排
for (let i = 0; i < 1000; i++) {
  $('.list').append('<li>Item ' + i + '</li>');
}
```

每次 DOM 操作都可能触发浏览器重排（reflow），1000 次操作意味着 1000 次潜在的重排。

## 解决方案：DocumentFragment

```javascript
const fragment = document.createDocumentFragment();

for (let i = 0; i < 1000; i++) {
  const li = document.createElement('li');
  li.textContent = 'Item ' + i;
  fragment.appendChild(li);
}

// 只触发一次重排
document.querySelector('.list').appendChild(fragment);
```

DocumentFragment 的特点：

- 存在于内存中，不在 DOM 树中
- 对它的操作不会触发重排
- 插入时，只有 fragment 的子节点被移动（fragment 本身保持为空）

## 在 jQuery 中应用

我们的 `append()` 等方法已经做了优化。现在进一步整合文档片段：

```javascript
function createFragment(nodes) {
  const fragment = document.createDocumentFragment();
  
  nodes.forEach(node => {
    if (typeof node === 'string') {
      // HTML 字符串需要解析
      const temp = document.createElement('div');
      temp.innerHTML = node;
      while (temp.firstChild) {
        fragment.appendChild(temp.firstChild);
      }
    } else {
      fragment.appendChild(node);
    }
  });
  
  return fragment;
}
```

## 批量 append 优化

```javascript
jQuery.fn.append = function(...contents) {
  return this.each(function(index) {
    const target = this;
    
    contents.forEach(content => {
      // 将所有内容收集到 fragment
      const fragment = document.createDocumentFragment();
      
      if (typeof content === 'string') {
        const temp = document.createElement('template');
        temp.innerHTML = content;
        fragment.appendChild(temp.content.cloneNode(true));
      } else if (content instanceof jQuery) {
        content.each(function() {
          fragment.appendChild(
            index === 0 ? this : this.cloneNode(true)
          );
        });
      } else if (content.nodeType) {
        fragment.appendChild(
          index === 0 ? content : content.cloneNode(true)
        );
      }
      
      target.appendChild(fragment);
    });
  });
};
```

## template 元素的优势

使用 `<template>` 元素解析 HTML 更安全：

```javascript
function parseHTML(htmlString) {
  const template = document.createElement('template');
  template.innerHTML = htmlString.trim();
  return template.content;
}
```

`<template>` 的优势：

- 支持任意 HTML 内容（包括 `<tr>`、`<td>` 等特殊元素）
- 内容不会被渲染
- 脚本不会执行
- 返回 DocumentFragment

## 批量创建元素

```javascript
// 使用数组批量创建
const items = ['Apple', 'Banana', 'Cherry'];

$('.list').append(
  items.map(item => `<li>${item}</li>`).join('')
);
```

内部会将整个 HTML 字符串一次性解析，比循环调用高效得多。

## 性能对比

```javascript
console.time('without fragment');
for (let i = 0; i < 1000; i++) {
  list.appendChild(document.createElement('li'));
}
console.timeEnd('without fragment');  // ~50ms

console.time('with fragment');
const frag = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  frag.appendChild(document.createElement('li'));
}
list.appendChild(frag);
console.timeEnd('with fragment');  // ~5ms
```

使用 fragment 可以获得约 10 倍的性能提升。

## 实际应用场景

### 场景 1：渲染列表

```javascript
function renderList(items) {
  const html = items.map(item => `
    <li class="item">
      <span class="title">${item.title}</span>
      <span class="desc">${item.desc}</span>
    </li>
  `).join('');
  
  $('.list').empty().append(html);
}
```

### 场景 2：表格数据

```javascript
function renderTable(rows) {
  const tbody = rows.map(row => `
    <tr>
      <td>${row.name}</td>
      <td>${row.value}</td>
    </tr>
  `).join('');
  
  $('table tbody').html(tbody);
}
```

### 场景 3：异步加载更多

```javascript
async function loadMore() {
  const data = await fetch('/api/items?page=' + page);
  const items = await data.json();
  
  const html = items.map(renderItem).join('');
  $('.list').append(html);
}
```

## 何时使用 DocumentFragment

| 场景 | 是否使用 |
|------|----------|
| 插入单个元素 | 不需要 |
| 循环插入多个元素 | 推荐 |
| 大量 HTML 字符串 | 模板更好 |
| 复杂 DOM 结构 | 推荐 |

## 本章小结

批量操作优化要点：

- **DocumentFragment**：在内存中构建 DOM
- **减少重排**：一次性插入
- **template 元素**：安全解析 HTML
- **字符串拼接**：批量 HTML 更高效

下一章，我们实现元素删除方法。

---

**思考题**：`innerHTML = html` 和 `append(fragment)` 哪个更快？各有什么优缺点？
