# 移除操作：remove/detach/empty

移除元素是 DOM 操作的重要部分。这一章，我们实现三个移除方法，它们有不同的用途。

## remove()：完全移除

`remove()` 从 DOM 中移除元素，同时清理关联的数据和事件：

```javascript
$('.item').remove();
```

执行后，`.item` 元素从 DOM 中消失，相关的事件监听器和存储的数据也被清理。

### 支持选择器过滤

```javascript
$('li').remove('.completed');
// 只移除有 .completed 类的 li
```

### 实现

```javascript
jQuery.fn.remove = function(selector) {
  // 筛选要移除的元素
  const elements = selector ? this.filter(selector) : this;
  
  elements.each(function() {
    // 清理数据（后面章节实现）
    // jQuery.cleanData(this);
    
    // 从 DOM 移除
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  });
  
  return this;
};
```

## detach()：临时移除

`detach()` 从 DOM 中移除元素，但保留数据和事件，方便之后重新插入：

```javascript
const $item = $('.item').detach();
// 做一些操作...
$('.container').append($item); // 重新插入，事件还在
```

### 与 remove() 的区别

| 方法 | 移除 DOM | 清理数据 | 清理事件 |
|------|----------|----------|----------|
| `remove()` | ✓ | ✓ | ✓ |
| `detach()` | ✓ | ✗ | ✗ |

### 实现

```javascript
jQuery.fn.detach = function(selector) {
  const elements = selector ? this.filter(selector) : this;
  
  elements.each(function() {
    // 不清理数据和事件
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  });
  
  return this;
};
```

## empty()：清空内容

`empty()` 清空元素的所有内容，但保留元素本身：

```javascript
$('.container').empty();
```

执行前：
```html
<div class="container">
  <p>text</p>
  <span>more</span>
</div>
```

执行后：
```html
<div class="container"></div>
```

### 实现

```javascript
jQuery.fn.empty = function() {
  return this.each(function() {
    // 清理子元素的数据（后面章节实现）
    // jQuery.cleanData(this.querySelectorAll('*'));
    
    // 清空内容
    this.textContent = '';
  });
};
```

注意：使用 `textContent = ''` 比循环 removeChild 更快。

## cleanData：清理关联数据

为了完整实现 `remove()`，我们需要一个清理函数：

```javascript
// 数据存储
const dataCache = new WeakMap();
const eventCache = new WeakMap();

jQuery.cleanData = function(elements) {
  // 支持单个元素或集合
  const elems = elements.length !== undefined ? elements : [elements];
  
  elems.forEach(elem => {
    if (elem.nodeType !== 1) return;
    
    // 清理存储的数据
    dataCache.delete(elem);
    
    // 清理事件监听
    const events = eventCache.get(elem);
    if (events) {
      Object.keys(events).forEach(type => {
        events[type].forEach(handler => {
          elem.removeEventListener(type, handler);
        });
      });
      eventCache.delete(elem);
    }
    
    // 递归清理后代
    elem.querySelectorAll('*').forEach(child => {
      dataCache.delete(child);
      
      const childEvents = eventCache.get(child);
      if (childEvents) {
        Object.keys(childEvents).forEach(type => {
          childEvents[type].forEach(handler => {
            child.removeEventListener(type, handler);
          });
        });
        eventCache.delete(child);
      }
    });
  });
};
```

## 完整实现

```javascript
// src/manipulation/remove.js

export function installRemoveMethods(jQuery) {
  
  // 简化的数据存储（实际应该在单独模块）
  const dataStore = new WeakMap();
  
  jQuery.fn.remove = function(selector) {
    const elements = selector ? this.filter(selector) : this;
    
    elements.each(function() {
      // 清理当前元素和所有后代的数据
      cleanElement(this);
      this.querySelectorAll('*').forEach(cleanElement);
      
      // 从 DOM 移除
      this.parentNode?.removeChild(this);
    });
    
    return this;
  };
  
  jQuery.fn.detach = function(selector) {
    const elements = selector ? this.filter(selector) : this;
    
    elements.each(function() {
      // 不清理数据
      this.parentNode?.removeChild(this);
    });
    
    return this;
  };
  
  jQuery.fn.empty = function() {
    return this.each(function() {
      // 清理所有后代的数据
      this.querySelectorAll('*').forEach(cleanElement);
      
      // 清空内容
      this.textContent = '';
    });
  };
  
  function cleanElement(elem) {
    if (elem.nodeType !== 1) return;
    dataStore.delete(elem);
    // 清理事件等其他关联数据
  }
}
```

## 实际应用场景

### 场景 1：删除列表项

```javascript
$('.delete-btn').on('click', function() {
  $(this).closest('li').remove();
});
```

### 场景 2：条件移除

```javascript
// 移除已完成的任务
$('.task').remove('.completed');

// 移除空段落
$('p').filter(function() {
  return $(this).text().trim() === '';
}).remove();
```

### 场景 3：临时隐藏

```javascript
// 暂时移除，稍后恢复
const $sidebar = $('.sidebar').detach();

// 执行全屏操作...

// 恢复
$('.layout').append($sidebar);
// 事件监听还在，不需要重新绑定
```

### 场景 4：清空容器

```javascript
// 加载新内容前清空
$('.content').empty().append(newContent);

// 重置表单区域
$('.form-dynamic-fields').empty();
```

### 场景 5：内存管理

```javascript
// 单页应用中切换页面
function switchPage(newPage) {
  // 使用 remove() 确保清理事件，防止内存泄漏
  $('.page.active').remove();
  
  // 加载新页面
  $('body').append(newPage);
}
```

### 场景 6：拖拽操作

```javascript
// 拖拽过程中临时移除
$('.draggable').on('dragstart', function() {
  $(this).detach().appendTo('.drag-layer');
});

$('.droppable').on('drop', function() {
  $(this).append($('.drag-layer > *'));
});
```

## 性能考虑

### empty() 的性能

```javascript
// 慢：循环移除
while (element.firstChild) {
  element.removeChild(element.firstChild);
}

// 快：一次性清空
element.textContent = '';

// 也可以用 innerHTML
element.innerHTML = '';
```

`textContent = ''` 是最快的方式。

### 批量移除

```javascript
// 如果有很多元素需要移除，考虑用文档片段
const $items = $('.item');
const fragment = document.createDocumentFragment();

$items.each(function() {
  fragment.appendChild(this);
});

// 现在所有元素都在 fragment 中（已从 DOM 移除）
```

## remove() vs detach() 使用建议

**使用 remove()：**
- 永久删除元素
- 不需要保留事件和数据
- 单页应用中清理组件

**使用 detach()：**
- 临时移除元素
- 之后会重新插入
- 想保留复杂的事件绑定

```javascript
// 场景：排序时临时移除
const items = [];

$('.item').each(function() {
  items.push($(this).detach());
});

// 排序
items.sort((a, b) => a.data('order') - b.data('order'));

// 重新插入
items.forEach($item => {
  $('.list').append($item);
});
```

## 本章小结

三个移除方法的对比：

| 方法 | 移除元素 | 移除内容 | 清理数据 |
|------|----------|----------|----------|
| `remove()` | ✓ | ✓ | ✓ |
| `detach()` | ✓ | ✓ | ✗ |
| `empty()` | ✗ | ✓ | ✓（后代） |

选择原则：

- **永久删除** → `remove()`
- **临时移除** → `detach()`
- **清空容器** → `empty()`

下一章，我们实现替换方法：`replaceWith()` 和 `replaceAll()`。

---

**思考题**：`$('.item').remove()` 返回什么？返回的 jQuery 对象包含的是什么？还能继续操作吗？
