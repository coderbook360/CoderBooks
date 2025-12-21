# Hook 系统设计

Hook 是 jQuery 内部的扩展机制，让你可以自定义属性读写、样式处理等行为。

## 什么是 Hook

Hook 是一组拦截点，允许在特定操作时插入自定义逻辑：

```javascript
// 读取 width 时的 Hook
$.cssHooks.width = {
  get(elem) {
    return elem.offsetWidth + 'px';
  },
  set(elem, value) {
    elem.style.width = value;
  }
};
```

## 为什么需要 Hook

考虑一个问题：不同属性的读写方式可能不同。

```javascript
// 普通属性
element.id;

// 特殊属性
element.checked;        // boolean
element.className;      // 不是 class
element.htmlFor;        // 不是 for
element.getAttribute('data-id');  // data-* 属性
```

Hook 让你可以为特殊情况提供专门处理，而不需要在核心代码中写大量 if-else。

## Hook 的类型

jQuery 有几种 Hook：

```javascript
$.attrHooks    // attr() 读写时触发
$.propHooks    // prop() 读写时触发
$.cssHooks     // css() 读写时触发
$.valHooks     // val() 读写时触发
```

## 基础 Hook 实现

```javascript
const hooks = {};

function getWithHook(elem, name) {
  const hook = hooks[name];
  
  if (hook && hook.get) {
    return hook.get(elem);
  }
  
  // 默认行为
  return elem[name];
}

function setWithHook(elem, name, value) {
  const hook = hooks[name];
  
  if (hook && hook.set) {
    hook.set(elem, value);
  } else {
    // 默认行为
    elem[name] = value;
  }
}
```

## CSS Hook 实现

```javascript
// src/advanced/hooks.js

export function installHooks(jQuery) {
  
  // CSS Hooks
  jQuery.cssHooks = {};
  
  // 增强 css 方法
  const originalCss = jQuery.fn.css;
  
  jQuery.fn.css = function(name, value) {
    // 设置
    if (value !== undefined) {
      return this.each(function() {
        const hook = jQuery.cssHooks[name];
        
        if (hook && hook.set) {
          hook.set(this, value);
        } else {
          this.style[name] = value;
        }
      });
    }
    
    // 获取
    const elem = this[0];
    if (!elem) return undefined;
    
    const hook = jQuery.cssHooks[name];
    
    if (hook && hook.get) {
      return hook.get(elem);
    }
    
    return getComputedStyle(elem)[name];
  };
  
  // 内置 Hook：opacity
  jQuery.cssHooks.opacity = {
    get(elem) {
      const opacity = getComputedStyle(elem).opacity;
      return opacity === '' ? '1' : opacity;
    },
    set(elem, value) {
      elem.style.opacity = value;
    }
  };
  
  // 内置 Hook：尺寸类
  ['width', 'height'].forEach(name => {
    jQuery.cssHooks[name] = {
      get(elem) {
        // 隐藏元素获取尺寸
        if (elem.offsetWidth === 0 && elem.offsetHeight === 0) {
          const savedStyles = {
            position: elem.style.position,
            visibility: elem.style.visibility,
            display: elem.style.display
          };
          
          elem.style.position = 'absolute';
          elem.style.visibility = 'hidden';
          elem.style.display = 'block';
          
          const value = name === 'width' 
            ? elem.offsetWidth 
            : elem.offsetHeight;
          
          Object.assign(elem.style, savedStyles);
          
          return value + 'px';
        }
        
        return getComputedStyle(elem)[name];
      },
      set(elem, value) {
        if (typeof value === 'number') {
          value += 'px';
        }
        elem.style[name] = value;
      }
    };
  });
}
```

## Attr Hook 实现

```javascript
export function installAttrHooks(jQuery) {
  
  jQuery.attrHooks = {};
  
  // 特殊属性映射
  const attrMap = {
    'class': 'className',
    'for': 'htmlFor'
  };
  
  // Boolean 属性
  const booleanAttrs = [
    'checked', 'selected', 'disabled', 'readonly',
    'multiple', 'autofocus', 'autoplay', 'controls'
  ];
  
  // Boolean 属性 Hook
  booleanAttrs.forEach(name => {
    jQuery.attrHooks[name] = {
      get(elem) {
        return elem[name] ? name : null;
      },
      set(elem, value) {
        if (value === false || value === null) {
          elem.removeAttribute(name);
          elem[name] = false;
        } else {
          elem.setAttribute(name, name);
          elem[name] = true;
        }
      }
    };
  });
  
  // 增强 attr 方法
  const originalAttr = jQuery.fn.attr;
  
  jQuery.fn.attr = function(name, value) {
    if (typeof name === 'object') {
      Object.entries(name).forEach(([k, v]) => {
        this.attr(k, v);
      });
      return this;
    }
    
    // 属性名映射
    const attrName = attrMap[name] || name;
    
    // 设置
    if (value !== undefined) {
      return this.each(function() {
        const hook = jQuery.attrHooks[name];
        
        if (hook && hook.set) {
          hook.set(this, value);
        } else if (value === null) {
          this.removeAttribute(name);
        } else {
          this.setAttribute(name, value);
        }
      });
    }
    
    // 获取
    const elem = this[0];
    if (!elem) return undefined;
    
    const hook = jQuery.attrHooks[name];
    
    if (hook && hook.get) {
      return hook.get(elem);
    }
    
    return elem.getAttribute(name);
  };
}
```

## Val Hook 实现

```javascript
export function installValHooks(jQuery) {
  
  jQuery.valHooks = {};
  
  // select 元素
  jQuery.valHooks.select = {
    get(elem) {
      const options = elem.options;
      const index = elem.selectedIndex;
      
      // 多选
      if (elem.multiple) {
        const values = [];
        for (let i = 0; i < options.length; i++) {
          if (options[i].selected) {
            values.push(options[i].value);
          }
        }
        return values;
      }
      
      // 单选
      return index >= 0 ? options[index].value : '';
    },
    set(elem, value) {
      const options = elem.options;
      const values = Array.isArray(value) ? value : [value];
      
      for (let i = 0; i < options.length; i++) {
        options[i].selected = values.includes(options[i].value);
      }
      
      if (!values.length) {
        elem.selectedIndex = -1;
      }
    }
  };
  
  // checkbox
  jQuery.valHooks.checkbox = {
    get(elem) {
      return elem.checked;
    },
    set(elem, value) {
      elem.checked = !!value;
    }
  };
  
  // radio
  jQuery.valHooks.radio = {
    get(elem) {
      return elem.checked ? elem.value : null;
    },
    set(elem, value) {
      elem.checked = (elem.value === value);
    }
  };
  
  // 增强 val 方法
  jQuery.fn.val = function(value) {
    // 设置
    if (value !== undefined) {
      return this.each(function() {
        const hook = jQuery.valHooks[this.type] || 
                     jQuery.valHooks[this.nodeName.toLowerCase()];
        
        if (hook && hook.set) {
          hook.set(this, value);
        } else {
          this.value = value;
        }
      });
    }
    
    // 获取
    const elem = this[0];
    if (!elem) return undefined;
    
    const hook = jQuery.valHooks[elem.type] || 
                 jQuery.valHooks[elem.nodeName.toLowerCase()];
    
    if (hook && hook.get) {
      return hook.get(elem);
    }
    
    return elem.value;
  };
}
```

## 动画 Hook

```javascript
export function installAnimationHooks(jQuery) {
  
  jQuery.fx = jQuery.fx || {};
  jQuery.fx.step = {};
  
  // 默认动画处理
  jQuery.fx.step._default = function(fx) {
    fx.elem.style[fx.prop] = fx.now + fx.unit;
  };
  
  // scrollTop 动画
  jQuery.fx.step.scrollTop = function(fx) {
    fx.elem.scrollTop = fx.now;
  };
  
  // scrollLeft 动画
  jQuery.fx.step.scrollLeft = function(fx) {
    fx.elem.scrollLeft = fx.now;
  };
  
  // opacity 动画
  jQuery.fx.step.opacity = function(fx) {
    fx.elem.style.opacity = fx.now;
  };
}
```

## 完整 Hook 系统

```javascript
// src/advanced/hooks.js

export function installHookSystem(jQuery) {
  
  // Hook 容器
  jQuery.cssHooks = {};
  jQuery.attrHooks = {};
  jQuery.propHooks = {};
  jQuery.valHooks = {};
  
  // Hook 工具函数
  jQuery.hook = function(type, name, hooks) {
    const container = jQuery[type + 'Hooks'];
    if (!container) {
      throw new Error(`Unknown hook type: ${type}`);
    }
    
    container[name] = hooks;
  };
  
  // CSS Hooks
  installCssHooks(jQuery);
  
  // Attr Hooks
  installAttrHooks(jQuery);
  
  // Val Hooks
  installValHooks(jQuery);
  
  // 动画 Hooks
  installAnimationHooks(jQuery);
  
  function installCssHooks(jQuery) {
    // opacity
    jQuery.cssHooks.opacity = {
      get(elem) {
        return getComputedStyle(elem).opacity || '1';
      }
    };
    
    // transform 快捷方式
    ['translateX', 'translateY', 'rotate', 'scale'].forEach(prop => {
      jQuery.cssHooks[prop] = {
        get(elem) {
          const transform = getComputedStyle(elem).transform;
          // 解析 matrix 获取值（简化处理）
          return transform;
        },
        set(elem, value) {
          const current = elem.style.transform || '';
          const regex = new RegExp(`${prop}\\([^)]*\\)`, 'g');
          
          if (regex.test(current)) {
            elem.style.transform = current.replace(regex, `${prop}(${value})`);
          } else {
            elem.style.transform = current + ` ${prop}(${value})`;
          }
        }
      };
    });
  }
  
  function installAttrHooks(jQuery) {
    // tabindex
    jQuery.attrHooks.tabindex = {
      get(elem) {
        const value = elem.getAttribute('tabindex');
        return value ? parseInt(value, 10) : -1;
      }
    };
    
    // contenteditable
    jQuery.attrHooks.contenteditable = {
      get(elem) {
        const value = elem.getAttribute('contenteditable');
        return value === 'true' || value === '';
      },
      set(elem, value) {
        elem.setAttribute('contenteditable', value ? 'true' : 'false');
      }
    };
  }
  
  function installValHooks(jQuery) {
    // option
    jQuery.valHooks.option = {
      get(elem) {
        // 优先使用 value 属性
        return elem.hasAttribute('value') 
          ? elem.value 
          : elem.textContent.trim();
      }
    };
    
    // textarea
    jQuery.valHooks.textarea = {
      get(elem) {
        return elem.value;
      },
      set(elem, value) {
        elem.value = value;
      }
    };
  }
  
  function installAnimationHooks(jQuery) {
    jQuery.fx = jQuery.fx || {};
    jQuery.fx.step = {
      _default(fx) {
        fx.elem.style[fx.prop] = fx.now + fx.unit;
      }
    };
  }
}
```

## 使用示例

### 自定义 CSS Hook

```javascript
// 支持 css('rotate', '45deg')
$.cssHooks.rotate = {
  get(elem) {
    const transform = getComputedStyle(elem).transform;
    if (transform === 'none') return '0deg';
    
    // 解析 matrix
    const values = transform.match(/matrix\(([^)]+)\)/);
    if (values) {
      const parts = values[1].split(', ');
      const angle = Math.atan2(parts[1], parts[0]) * (180 / Math.PI);
      return angle + 'deg';
    }
    return '0deg';
  },
  set(elem, value) {
    elem.style.transform = `rotate(${value})`;
  }
};

// 使用
$('.box').css('rotate', '45deg');
```

### 自定义 Attr Hook

```javascript
// aria-* 属性的便捷 Hook
$.attrHooks.ariaLabel = {
  get(elem) {
    return elem.getAttribute('aria-label');
  },
  set(elem, value) {
    elem.setAttribute('aria-label', value);
  }
};
```

### 扩展 Val Hook

```javascript
// 内容可编辑元素的 val
$.valHooks.div = {
  get(elem) {
    if (elem.contentEditable === 'true') {
      return elem.innerHTML;
    }
    return elem.textContent;
  },
  set(elem, value) {
    if (elem.contentEditable === 'true') {
      elem.innerHTML = value;
    } else {
      elem.textContent = value;
    }
  }
};
```

## Hook 设计模式

Hook 本质是策略模式：

```javascript
// 不用 Hook
function css(elem, name, value) {
  if (name === 'opacity') {
    // 特殊处理
  } else if (name === 'width') {
    // 特殊处理
  } else if (name === 'transform') {
    // 特殊处理
  } else {
    // 默认处理
  }
}

// 使用 Hook
function css(elem, name, value) {
  const hook = cssHooks[name];
  if (hook && hook.set) {
    return hook.set(elem, value);
  }
  // 默认处理
}
```

Hook 的优势：
- **开闭原则**：对扩展开放，对修改关闭
- **单一职责**：每个 Hook 只处理一种情况
- **可插拔**：可以动态添加、移除 Hook
- **可测试**：每个 Hook 可以独立测试

## 本章小结

Hook 系统特点：

- **拦截机制**：在特定操作时插入自定义逻辑
- **统一接口**：`{ get, set }` 结构
- **按需扩展**：不改核心代码即可处理特殊情况
- **类型多样**：cssHooks、attrHooks、valHooks 等

应用场景：

- 处理浏览器兼容（现代浏览器已不太需要）
- 支持自定义 CSS 属性
- 统一不同元素的取值方式
- 动画系统的属性更新

下一章进入最后一部分：发布。

---

**思考题**：如何设计一个通用的 Hook 系统，使得任何方法都可以被 Hook？
