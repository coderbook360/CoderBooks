# 克隆节点：clone 实现

`clone()` 用于复制元素及其后代。这一章，我们实现一个功能完整的克隆方法。

## clone() 的基本用法

```javascript
const $clone = $('.original').clone();
$('.container').append($clone);
```

克隆会复制：
- 元素及其所有后代
- 所有属性
- 内联样式

## 基础实现

```javascript
jQuery.fn.clone = function() {
  const clones = [];
  
  this.each(function() {
    clones.push(this.cloneNode(true));
  });
  
  return this.pushStack(clones);
};
```

`cloneNode(true)` 会深度克隆元素及其所有后代。

## 是否复制数据和事件

jQuery 的 `clone()` 支持两个参数：

```javascript
.clone(withDataAndEvents, deepWithDataAndEvents)
```

- `withDataAndEvents`：是否复制元素自身的数据和事件
- `deepWithDataAndEvents`：是否复制后代的数据和事件

```javascript
$('.btn').clone();           // 不复制数据和事件
$('.btn').clone(true);       // 复制元素的数据和事件
$('.btn').clone(true, true); // 复制元素和后代的数据和事件
```

## 完整实现

这需要我们的数据和事件系统支持，我们先实现基础框架：

```javascript
jQuery.fn.clone = function(withDataAndEvents = false, deepWithDataAndEvents) {
  // 如果第二个参数未指定，默认与第一个参数相同
  if (deepWithDataAndEvents === undefined) {
    deepWithDataAndEvents = withDataAndEvents;
  }
  
  const clones = [];
  
  this.each(function() {
    // 深度克隆 DOM
    const clone = this.cloneNode(true);
    
    if (withDataAndEvents) {
      // 复制元素自身的数据和事件
      cloneDataAndEvents(this, clone, deepWithDataAndEvents);
    }
    
    clones.push(clone);
  });
  
  return this.pushStack(clones);
};

// 复制数据和事件的辅助函数
function cloneDataAndEvents(source, target, deep) {
  // 复制元素数据
  copyData(source, target);
  
  // 复制元素事件
  copyEvents(source, target);
  
  // 如果需要深度复制，处理后代
  if (deep) {
    const sourceChildren = source.querySelectorAll('*');
    const targetChildren = target.querySelectorAll('*');
    
    sourceChildren.forEach((child, i) => {
      copyData(child, targetChildren[i]);
      copyEvents(child, targetChildren[i]);
    });
  }
}

// 复制存储的数据
function copyData(source, target) {
  const data = jQuery.data(source);
  if (data && Object.keys(data).length) {
    jQuery.data(target, { ...data });
  }
}

// 复制事件处理器
function copyEvents(source, target) {
  const events = jQuery._data(source, 'events');
  if (!events) return;
  
  // 为每个事件类型重新绑定处理器
  Object.keys(events).forEach(type => {
    events[type].forEach(handler => {
      jQuery(target).on(type, handler.selector, handler.handler);
    });
  });
}
```

## 简化版实现

在还没有完整的数据和事件系统时，我们可以先用简化版：

```javascript
// src/manipulation/clone.js

export function installCloneMethod(jQuery) {
  
  // 内部数据存储
  const dataStore = new WeakMap();
  
  jQuery.fn.clone = function(withDataAndEvents = false, deep) {
    if (deep === undefined) {
      deep = withDataAndEvents;
    }
    
    const clones = [];
    
    this.each(function() {
      const clone = this.cloneNode(true);
      
      // 处理特殊情况：清除 ID（可选）
      // clone.removeAttribute('id');
      
      if (withDataAndEvents) {
        // 复制 data-* 属性已经通过 cloneNode 完成
        // 这里处理 jQuery 存储的数据
        const data = dataStore.get(this);
        if (data) {
          dataStore.set(clone, { ...data });
        }
        
        // 深度复制
        if (deep) {
          const sourceEls = this.querySelectorAll('*');
          const cloneEls = clone.querySelectorAll('*');
          
          sourceEls.forEach((el, i) => {
            const elData = dataStore.get(el);
            if (elData) {
              dataStore.set(cloneEls[i], { ...elData });
            }
          });
        }
      }
      
      clones.push(clone);
    });
    
    return this.pushStack(clones);
  };
}
```

## 克隆时需要注意的问题

### 问题 1：ID 重复

克隆的元素会有相同的 ID：

```javascript
// 原始：<div id="unique">content</div>
// 克隆后也是：<div id="unique">content</div>
// 这违反了 ID 唯一性！
```

解决方案：

```javascript
const $clone = $('.original').clone();
$clone.removeAttr('id');
// 或者生成新 ID
$clone.attr('id', 'unique-' + Date.now());
```

### 问题 2：表单元素状态

`cloneNode` 会复制属性，但某些状态需要特殊处理：

```javascript
// input/textarea 的当前值
// checkbox/radio 的选中状态
// select 的选中选项
```

增强的克隆：

```javascript
function fixClonedInputs(source, target) {
  const sourceInputs = source.querySelectorAll('input, textarea, select');
  const targetInputs = target.querySelectorAll('input, textarea, select');
  
  sourceInputs.forEach((input, i) => {
    const clone = targetInputs[i];
    
    if (input.type === 'checkbox' || input.type === 'radio') {
      clone.checked = input.checked;
    } else if (input.tagName === 'TEXTAREA') {
      clone.value = input.value;
    } else if (input.tagName === 'SELECT') {
      [...input.options].forEach((opt, j) => {
        clone.options[j].selected = opt.selected;
      });
    } else {
      clone.value = input.value;
    }
  });
}
```

### 问题 3：script 标签

克隆的 script 标签不会重新执行。这通常是期望的行为。

## 改进后的完整实现

```javascript
// src/manipulation/clone.js

export function installCloneMethod(jQuery) {
  
  jQuery.fn.clone = function(withDataAndEvents = false, deep) {
    if (deep === undefined) {
      deep = withDataAndEvents;
    }
    
    const clones = [];
    
    this.each(function() {
      const clone = this.cloneNode(true);
      
      // 修复表单元素状态
      fixFormState(this, clone);
      
      // 复制数据（如果需要）
      if (withDataAndEvents) {
        cloneData(this, clone, deep);
      }
      
      clones.push(clone);
    });
    
    return this.pushStack(clones);
  };
  
  function fixFormState(source, target) {
    if (source.nodeType !== 1) return;
    
    // 处理当前元素
    copyValue(source, target);
    
    // 处理后代
    const sourceInputs = source.querySelectorAll('input, textarea, select');
    const targetInputs = target.querySelectorAll('input, textarea, select');
    
    sourceInputs.forEach((input, i) => {
      copyValue(input, targetInputs[i]);
    });
  }
  
  function copyValue(source, target) {
    const tag = source.tagName;
    
    if (tag === 'INPUT') {
      if (source.type === 'checkbox' || source.type === 'radio') {
        target.checked = source.checked;
      }
      target.value = source.value;
    } else if (tag === 'TEXTAREA') {
      target.value = source.value;
      target.textContent = source.value;
    } else if (tag === 'SELECT') {
      [...source.options].forEach((opt, i) => {
        if (target.options[i]) {
          target.options[i].selected = opt.selected;
        }
      });
    }
  }
  
  function cloneData(source, target, deep) {
    // 这里需要与数据模块集成
    // 暂时只处理 data-* 属性（已通过 cloneNode 复制）
    
    if (deep) {
      // 深度复制时处理后代
      const sourceEls = source.querySelectorAll('*');
      const targetEls = target.querySelectorAll('*');
      
      sourceEls.forEach((el, i) => {
        // 复制每个后代的数据
      });
    }
  }
}
```

## 实际应用场景

### 场景 1：模板复制

```javascript
// 复制模板行
$('.add-row').on('click', function() {
  const $newRow = $('.row-template').clone();
  $newRow.removeClass('row-template');
  $newRow.find('input').val('');
  $('.table-body').append($newRow);
});
```

### 场景 2：拖拽复制

```javascript
// 复制卡片
$('.card').on('dragstart', function(e) {
  if (e.altKey) {
    // Alt 键 + 拖拽 = 复制
    const $clone = $(this).clone();
    // 设置拖拽数据
  }
});
```

### 场景 3：撤销功能

```javascript
// 保存状态以支持撤销
const history = [];

function saveState() {
  history.push($('.editor').clone(true, true));
}

function undo() {
  if (history.length > 0) {
    const $previous = history.pop();
    $('.editor').replaceWith($previous);
  }
}
```

### 场景 4：动画副本

```javascript
// 创建动画用的副本
$('.item').on('click', function() {
  $(this).clone()
    .appendTo('body')
    .css({
      position: 'fixed',
      top: $(this).offset().top,
      left: $(this).offset().left
    })
    .animate({ top: 0, opacity: 0 }, 500, function() {
      $(this).remove();
    });
});
```

## clone() vs 直接创建

什么时候用 clone()？

```javascript
// 适合 clone()：复杂的现有结构
const $row = $('tr.template').clone();

// 适合直接创建：简单的新元素
const $item = $('<li class="item">New</li>');
```

## 本章小结

`clone()` 的核心要点：

- **深度复制**：包括所有后代
- **属性复制**：通过 cloneNode 实现
- **数据和事件**：可选复制，需要额外处理
- **表单状态**：需要手动同步

实现关键：

- 使用 `cloneNode(true)` 深度克隆
- 修复表单元素的当前值
- 与数据/事件系统集成

下一章，我们实现移除方法：`remove()`、`detach()` 和 `empty()`。

---

**思考题**：克隆一个包含 `<canvas>` 的元素时，canvas 的绑制内容会被复制吗？如何处理？
