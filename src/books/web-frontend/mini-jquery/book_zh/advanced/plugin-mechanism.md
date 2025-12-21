# 插件机制

jQuery 的插件生态非常繁荣，理解插件机制有助于设计可扩展的库。

## 什么是插件

插件就是扩展 jQuery 功能的方法：

```javascript
// 使用插件
$('.element').myPlugin({ option: 'value' });

// 定义插件
$.fn.myPlugin = function(options) {
  // this 是 jQuery 对象
  return this.each(function() {
    // 处理每个元素
  });
};
```

## 插件的两种类型

### 实例方法插件（$.fn）

作用于 jQuery 对象：

```javascript
$.fn.highlight = function(color) {
  return this.css('background-color', color);
};

$('p').highlight('yellow');
```

### 静态方法插件（$）

作用于 jQuery 命名空间：

```javascript
$.sum = function(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
};

$.sum(1, 2, 3);  // 6
```

## 实现 $.fn.extend

```javascript
// 核心就是简单的对象合并
$.fn.extend = function(methods) {
  Object.assign($.fn, methods);
  return this;
};

// 使用
$.fn.extend({
  highlight(color) {
    return this.css('background-color', color);
  },
  fadeIn() {
    return this.css('opacity', 1);
  }
});
```

## 经典插件模式

### 基础模式

```javascript
$.fn.myPlugin = function(options) {
  // 合并默认选项
  const settings = Object.assign({}, $.fn.myPlugin.defaults, options);
  
  // 遍历元素
  return this.each(function() {
    const $el = $(this);
    // 处理逻辑
  });
};

// 暴露默认选项
$.fn.myPlugin.defaults = {
  color: 'red',
  duration: 300
};
```

### 带状态的插件

```javascript
$.fn.counter = function(options) {
  const settings = Object.assign({
    initial: 0,
    step: 1
  }, options);
  
  return this.each(function() {
    const $el = $(this);
    
    // 检查是否已初始化
    if ($el.data('counter')) return;
    
    // 创建实例
    const counter = {
      value: settings.initial,
      
      increment() {
        this.value += settings.step;
        $el.text(this.value);
        return this;
      },
      
      decrement() {
        this.value -= settings.step;
        $el.text(this.value);
        return this;
      },
      
      reset() {
        this.value = settings.initial;
        $el.text(this.value);
        return this;
      }
    };
    
    // 保存实例
    $el.data('counter', counter);
    $el.text(counter.value);
  });
};

// 使用
$('#count').counter({ initial: 10 });
$('#count').data('counter').increment();
```

### 支持方法调用

```javascript
$.fn.tooltip = function(action, ...args) {
  // 如果是字符串，调用方法
  if (typeof action === 'string') {
    return this.each(function() {
      const instance = $(this).data('tooltip');
      if (instance && typeof instance[action] === 'function') {
        instance[action](...args);
      }
    });
  }
  
  // 否则是初始化
  const options = action || {};
  
  return this.each(function() {
    // 初始化逻辑
  });
};

// 使用
$('.tip').tooltip({ content: 'Hello' });  // 初始化
$('.tip').tooltip('show');                 // 调用方法
$('.tip').tooltip('hide');
```

## 完整插件实现示例

```javascript
// src/plugins/modal.js

(function($) {
  'use strict';
  
  // 插件名
  const PLUGIN_NAME = 'modal';
  
  // 默认选项
  const DEFAULTS = {
    backdrop: true,      // 是否显示遮罩
    keyboard: true,      // ESC 关闭
    closeButton: true,   // 显示关闭按钮
    onOpen: null,        // 打开回调
    onClose: null        // 关闭回调
  };
  
  // Modal 类
  class Modal {
    constructor(element, options) {
      this.$element = $(element);
      this.options = Object.assign({}, DEFAULTS, options);
      this.isOpen = false;
      this.$backdrop = null;
      
      this.init();
    }
    
    init() {
      // 设置样式
      this.$element.css({
        display: 'none',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1050
      });
      
      // 添加关闭按钮
      if (this.options.closeButton) {
        const $close = $('<button>')
          .text('×')
          .css({
            position: 'absolute',
            top: '10px',
            right: '10px',
            border: 'none',
            background: 'none',
            fontSize: '20px',
            cursor: 'pointer'
          })
          .on('click', () => this.close());
        
        this.$element.prepend($close);
      }
      
      // ESC 关闭
      if (this.options.keyboard) {
        $(document).on('keydown.' + PLUGIN_NAME, e => {
          if (e.key === 'Escape' && this.isOpen) {
            this.close();
          }
        });
      }
    }
    
    open() {
      if (this.isOpen) return;
      
      // 创建遮罩
      if (this.options.backdrop) {
        this.$backdrop = $('<div>')
          .css({
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1040
          })
          .on('click', () => this.close())
          .appendTo('body');
      }
      
      this.$element.css('display', 'block');
      this.isOpen = true;
      
      // 回调
      if (this.options.onOpen) {
        this.options.onOpen.call(this.$element[0]);
      }
      
      // 触发事件
      this.$element.trigger('open.modal');
    }
    
    close() {
      if (!this.isOpen) return;
      
      // 移除遮罩
      if (this.$backdrop) {
        this.$backdrop.remove();
        this.$backdrop = null;
      }
      
      this.$element.css('display', 'none');
      this.isOpen = false;
      
      // 回调
      if (this.options.onClose) {
        this.options.onClose.call(this.$element[0]);
      }
      
      // 触发事件
      this.$element.trigger('close.modal');
    }
    
    toggle() {
      this.isOpen ? this.close() : this.open();
    }
    
    destroy() {
      // 清理事件
      $(document).off('.' + PLUGIN_NAME);
      
      // 移除遮罩
      if (this.$backdrop) {
        this.$backdrop.remove();
      }
      
      // 移除数据
      this.$element.removeData(PLUGIN_NAME);
    }
  }
  
  // jQuery 插件
  $.fn[PLUGIN_NAME] = function(option, ...args) {
    return this.each(function() {
      const $this = $(this);
      let instance = $this.data(PLUGIN_NAME);
      
      // 初始化
      if (!instance) {
        const options = typeof option === 'object' ? option : {};
        instance = new Modal(this, options);
        $this.data(PLUGIN_NAME, instance);
      }
      
      // 调用方法
      if (typeof option === 'string') {
        if (typeof instance[option] !== 'function') {
          throw new Error(`No method named "${option}"`);
        }
        instance[option](...args);
      }
    });
  };
  
  // 暴露默认选项
  $.fn[PLUGIN_NAME].defaults = DEFAULTS;
  
  // 暴露构造函数（方便继承）
  $.fn[PLUGIN_NAME].Constructor = Modal;
  
})(jQuery);
```

使用：

```javascript
// 初始化
$('#myModal').modal({
  backdrop: true,
  onOpen() {
    console.log('Modal opened');
  }
});

// 方法调用
$('#myModal').modal('open');
$('#myModal').modal('close');
$('#myModal').modal('toggle');
$('#myModal').modal('destroy');

// 事件监听
$('#myModal').on('open.modal', function() {
  console.log('Modal opened!');
});
```

## 插件开发最佳实践

### 1. 链式调用

始终返回 `this`：

```javascript
$.fn.myPlugin = function() {
  return this.each(function() {
    // 处理
  });
};
```

### 2. 命名空间

使用命名空间避免冲突：

```javascript
// 事件命名空间
$el.on('click.myPlugin', handler);
$el.off('.myPlugin');

// 数据命名空间
$el.data('myPlugin', instance);
```

### 3. 暴露默认选项

```javascript
$.fn.myPlugin.defaults = { /* ... */ };

// 用户可以全局修改默认值
$.fn.myPlugin.defaults.duration = 500;
```

### 4. 防止多次初始化

```javascript
$.fn.myPlugin = function(options) {
  return this.each(function() {
    const $el = $(this);
    
    if ($el.data('myPlugin')) return;
    
    // 初始化
    $el.data('myPlugin', new Plugin(this, options));
  });
};
```

### 5. 提供销毁方法

```javascript
destroy() {
  // 移除事件监听
  this.$el.off('.myPlugin');
  
  // 移除添加的元素
  this.$wrapper.remove();
  
  // 清理数据
  this.$el.removeData('myPlugin');
}
```

## 完整实现

```javascript
// src/advanced/plugin.js

export function installPluginSystem(jQuery) {
  
  // $.fn.extend 已在 core 实现
  // 这里添加一些插件开发辅助工具
  
  // 创建插件的工厂函数
  jQuery.plugin = function(name, Constructor) {
    jQuery.fn[name] = function(option, ...args) {
      let result;
      
      this.each(function() {
        const $this = jQuery(this);
        let instance = $this.data(name);
        
        // 获取实例（不初始化）
        if (option === 'instance') {
          result = instance;
          return false;
        }
        
        // 初始化
        if (!instance) {
          const options = typeof option === 'object' ? option : {};
          instance = new Constructor(this, options, jQuery);
          $this.data(name, instance);
        }
        
        // 调用方法
        if (typeof option === 'string') {
          if (option.startsWith('_')) {
            throw new Error('Cannot call private method');
          }
          if (typeof instance[option] !== 'function') {
            throw new Error(`No method named "${option}"`);
          }
          const methodResult = instance[option](...args);
          if (methodResult !== undefined) {
            result = methodResult;
            return false;
          }
        }
      });
      
      return result !== undefined ? result : this;
    };
    
    // 暴露构造函数和默认选项
    jQuery.fn[name].Constructor = Constructor;
    if (Constructor.defaults) {
      jQuery.fn[name].defaults = Constructor.defaults;
    }
  };
  
  // 插件基类
  jQuery.Plugin = class {
    static defaults = {};
    
    constructor(element, options, $) {
      this.element = element;
      this.$element = $(element);
      this.options = Object.assign(
        {},
        this.constructor.defaults,
        options
      );
      this.$ = $;
      
      this.init();
    }
    
    init() {
      // 子类重写
    }
    
    destroy() {
      this.$element.off('.' + this.constructor.name);
      this.$element.removeData(this.constructor.name.toLowerCase());
    }
  };
}
```

使用工厂函数创建插件：

```javascript
class Tooltip extends $.Plugin {
  static defaults = {
    content: '',
    position: 'top'
  };
  
  init() {
    this.$tip = $('<div class="tooltip">').text(this.options.content);
    
    this.$element
      .on('mouseenter.Tooltip', () => this.show())
      .on('mouseleave.Tooltip', () => this.hide());
  }
  
  show() {
    this.$tip.appendTo('body');
    this.position();
  }
  
  hide() {
    this.$tip.detach();
  }
  
  position() {
    const rect = this.element.getBoundingClientRect();
    this.$tip.css({
      position: 'absolute',
      top: rect.top - this.$tip.outerHeight() - 5,
      left: rect.left + rect.width / 2
    });
  }
  
  destroy() {
    this.hide();
    super.destroy();
  }
}

// 注册插件
$.plugin('tooltip', Tooltip);

// 使用
$('.btn').tooltip({ content: 'Click me!' });
$('.btn').tooltip('show');
$('.btn').tooltip('destroy');
```

## 本章小结

插件机制核心：

- `$.fn.extend` 添加实例方法
- `$.extend` 添加静态方法
- `$.fn.xxx` 直接定义插件

最佳实践：

- 返回 `this` 保持链式调用
- 使用命名空间隔离事件和数据
- 暴露默认选项供全局配置
- 防止重复初始化
- 提供销毁方法清理资源

下一章，我们实现 Hook 系统。

---

**思考题**：如何设计一个插件系统，使得多个插件可以协作而不冲突？
