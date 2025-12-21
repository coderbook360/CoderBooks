# 单元测试

代码写完了，怎么保证它是正确的？单元测试是保障代码质量的关键。

## 为什么需要测试

```javascript
// 你写了一个函数
function addClass(elem, className) {
  elem.className += ' ' + className;
}

// 问题：
// 1. 如果 className 已存在会重复添加
// 2. 如果 elem.className 为空会多一个空格
// 3. 如果传入多个类名怎么办
```

测试能发现这些问题：

```javascript
test('addClass 不重复添加', () => {
  const div = document.createElement('div');
  div.className = 'foo';
  addClass(div, 'foo');
  expect(div.className).toBe('foo');  // 失败！实际是 'foo foo'
});
```

## 测试框架选择

常用的 JavaScript 测试框架：

- **Vitest**：Vite 生态，速度快，API 兼容 Jest
- **Jest**：最流行，功能全面
- **Mocha + Chai**：经典组合，灵活

我们使用 Vitest，因为它与我们的构建工具一致。

## 项目配置

```bash
npm install -D vitest @testing-library/dom jsdom
```

配置 `vitest.config.js`：

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true
  }
});
```

更新 `package.json`：

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## 测试结构

```javascript
// tests/core.test.js

import { describe, it, expect, beforeEach } from 'vitest';
import $ from '../src/jquery.js';

describe('jQuery Core', () => {
  
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  
  describe('$(selector)', () => {
    
    it('应该通过 ID 选择元素', () => {
      document.body.innerHTML = '<div id="test"></div>';
      const $el = $('#test');
      expect($el.length).toBe(1);
      expect($el[0].id).toBe('test');
    });
    
    it('应该通过类名选择元素', () => {
      document.body.innerHTML = '<div class="item"></div><div class="item"></div>';
      const $el = $('.item');
      expect($el.length).toBe(2);
    });
    
  });
  
});
```

## 测试分类

### 选择器测试

```javascript
// tests/selector.test.js

describe('Selector', () => {
  
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="container">
        <p class="text">First</p>
        <p class="text active">Second</p>
        <span>Third</span>
      </div>
    `;
  });
  
  it('ID 选择器', () => {
    expect($('#container').length).toBe(1);
  });
  
  it('类选择器', () => {
    expect($('.text').length).toBe(2);
  });
  
  it('标签选择器', () => {
    expect($('p').length).toBe(2);
  });
  
  it('组合选择器', () => {
    expect($('.text.active').length).toBe(1);
  });
  
  it('后代选择器', () => {
    expect($('#container p').length).toBe(2);
  });
  
  it('空结果', () => {
    expect($('.nonexistent').length).toBe(0);
  });
  
});
```

### DOM 操作测试

```javascript
// tests/manipulation.test.js

describe('DOM Manipulation', () => {
  
  beforeEach(() => {
    document.body.innerHTML = '<div id="test"></div>';
  });
  
  describe('append', () => {
    
    it('应该追加 HTML 字符串', () => {
      $('#test').append('<span>Hello</span>');
      expect($('#test').html()).toBe('<span>Hello</span>');
    });
    
    it('应该追加元素', () => {
      const span = document.createElement('span');
      $('#test').append(span);
      expect($('#test span').length).toBe(1);
    });
    
    it('应该追加 jQuery 对象', () => {
      document.body.innerHTML = '<div id="test"></div><span id="source"></span>';
      $('#test').append($('#source'));
      expect($('#test #source').length).toBe(1);
    });
    
  });
  
  describe('html', () => {
    
    it('获取 HTML', () => {
      document.body.innerHTML = '<div id="test"><span>Hello</span></div>';
      expect($('#test').html()).toBe('<span>Hello</span>');
    });
    
    it('设置 HTML', () => {
      $('#test').html('<p>New content</p>');
      expect($('#test p').length).toBe(1);
    });
    
    it('空集合返回 undefined', () => {
      expect($('.nonexistent').html()).toBeUndefined();
    });
    
  });
  
});
```

### 事件测试

```javascript
// tests/events.test.js

describe('Events', () => {
  
  beforeEach(() => {
    document.body.innerHTML = '<button id="btn">Click</button>';
  });
  
  it('on 应该绑定事件', () => {
    let clicked = false;
    $('#btn').on('click', () => { clicked = true; });
    
    $('#btn')[0].click();
    
    expect(clicked).toBe(true);
  });
  
  it('off 应该移除事件', () => {
    let count = 0;
    const handler = () => { count++; };
    
    $('#btn').on('click', handler);
    $('#btn')[0].click();
    expect(count).toBe(1);
    
    $('#btn').off('click', handler);
    $('#btn')[0].click();
    expect(count).toBe(1);
  });
  
  it('one 只触发一次', () => {
    let count = 0;
    $('#btn').one('click', () => { count++; });
    
    $('#btn')[0].click();
    $('#btn')[0].click();
    
    expect(count).toBe(1);
  });
  
  it('trigger 触发事件', () => {
    let triggered = false;
    $('#btn').on('click', () => { triggered = true; });
    
    $('#btn').trigger('click');
    
    expect(triggered).toBe(true);
  });
  
});
```

### CSS 测试

```javascript
// tests/css.test.js

describe('CSS', () => {
  
  beforeEach(() => {
    document.body.innerHTML = '<div id="test" style="color: red; width: 100px;"></div>';
  });
  
  it('获取样式', () => {
    expect($('#test').css('color')).toBe('rgb(255, 0, 0)');
  });
  
  it('设置单个样式', () => {
    $('#test').css('color', 'blue');
    expect($('#test').css('color')).toBe('rgb(0, 0, 255)');
  });
  
  it('设置多个样式', () => {
    $('#test').css({ color: 'blue', fontSize: '20px' });
    expect($('#test').css('color')).toBe('rgb(0, 0, 255)');
    expect($('#test').css('fontSize')).toBe('20px');
  });
  
});
```

### 类操作测试

```javascript
// tests/class.test.js

describe('Class Methods', () => {
  
  beforeEach(() => {
    document.body.innerHTML = '<div id="test" class="foo"></div>';
  });
  
  describe('addClass', () => {
    
    it('添加单个类', () => {
      $('#test').addClass('bar');
      expect($('#test')[0].classList.contains('bar')).toBe(true);
    });
    
    it('添加多个类', () => {
      $('#test').addClass('bar baz');
      expect($('#test')[0].classList.contains('bar')).toBe(true);
      expect($('#test')[0].classList.contains('baz')).toBe(true);
    });
    
    it('不重复添加', () => {
      $('#test').addClass('foo');
      expect($('#test')[0].className).toBe('foo');
    });
    
  });
  
  describe('removeClass', () => {
    
    it('移除类', () => {
      $('#test').removeClass('foo');
      expect($('#test')[0].classList.contains('foo')).toBe(false);
    });
    
    it('移除所有类', () => {
      $('#test').addClass('bar baz');
      $('#test').removeClass();
      expect($('#test')[0].className).toBe('');
    });
    
  });
  
  describe('toggleClass', () => {
    
    it('切换类', () => {
      $('#test').toggleClass('foo');
      expect($('#test')[0].classList.contains('foo')).toBe(false);
      
      $('#test').toggleClass('foo');
      expect($('#test')[0].classList.contains('foo')).toBe(true);
    });
    
    it('强制添加', () => {
      $('#test').toggleClass('foo', true);
      expect($('#test')[0].classList.contains('foo')).toBe(true);
    });
    
  });
  
  describe('hasClass', () => {
    
    it('检测存在的类', () => {
      expect($('#test').hasClass('foo')).toBe(true);
    });
    
    it('检测不存在的类', () => {
      expect($('#test').hasClass('bar')).toBe(false);
    });
    
  });
  
});
```

## 测试工具函数

```javascript
// tests/utils.test.js

describe('Utilities', () => {
  
  describe('$.type', () => {
    
    it('识别基本类型', () => {
      expect($.type(undefined)).toBe('undefined');
      expect($.type(null)).toBe('null');
      expect($.type(true)).toBe('boolean');
      expect($.type(123)).toBe('number');
      expect($.type('str')).toBe('string');
    });
    
    it('识别对象类型', () => {
      expect($.type([])).toBe('array');
      expect($.type({})).toBe('object');
      expect($.type(() => {})).toBe('function');
      expect($.type(new Date())).toBe('date');
      expect($.type(/regex/)).toBe('regexp');
    });
    
  });
  
  describe('$.each', () => {
    
    it('遍历数组', () => {
      const result = [];
      $.each([1, 2, 3], (index, value) => {
        result.push(value);
      });
      expect(result).toEqual([1, 2, 3]);
    });
    
    it('遍历对象', () => {
      const result = {};
      $.each({ a: 1, b: 2 }, (key, value) => {
        result[key] = value;
      });
      expect(result).toEqual({ a: 1, b: 2 });
    });
    
    it('返回 false 中断', () => {
      let count = 0;
      $.each([1, 2, 3, 4, 5], () => {
        count++;
        if (count === 3) return false;
      });
      expect(count).toBe(3);
    });
    
  });
  
  describe('$.extend', () => {
    
    it('浅拷贝', () => {
      const result = $.extend({}, { a: 1 }, { b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });
    
    it('深拷贝', () => {
      const source = { nested: { value: 1 } };
      const result = $.extend(true, {}, source);
      result.nested.value = 2;
      expect(source.nested.value).toBe(1);
    });
    
  });
  
});
```

## 异步测试

```javascript
// tests/ajax.test.js

describe('Ajax', () => {
  
  // 模拟 fetch
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  
  it('$.get 发送 GET 请求', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' })
    });
    
    const result = await $.get('/api/test');
    
    expect(fetch).toHaveBeenCalledWith('/api/test', expect.any(Object));
    expect(result).toEqual({ data: 'test' });
  });
  
  it('$.post 发送 POST 请求', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    
    await $.post('/api/submit', { name: 'test' });
    
    expect(fetch).toHaveBeenCalledWith('/api/submit', 
      expect.objectContaining({ method: 'POST' })
    );
  });
  
});
```

## 覆盖率报告

安装覆盖率工具：

```bash
npm install -D @vitest/coverage-v8
```

运行覆盖率测试：

```bash
npm run test:coverage
```

输出示例：

```
----------|---------|----------|---------|---------|
File      | % Stmts | % Branch | % Funcs | % Lines |
----------|---------|----------|---------|---------|
All files |   85.23 |    78.45 |   92.31 |   85.23 |
 core.js  |   90.12 |    85.23 |   95.45 |   90.12 |
 events.js|   82.35 |    72.41 |   88.89 |   82.35 |
 css.js   |   87.50 |    80.00 |   93.75 |   87.50 |
----------|---------|----------|---------|---------|
```

目标：
- 语句覆盖率 > 80%
- 分支覆盖率 > 70%
- 函数覆盖率 > 90%

## 完整测试配置

```javascript
// vitest.config.js

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules', 'tests']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
});
```

测试启动文件：

```javascript
// tests/setup.js

import $ from '../src/jquery.js';

// 全局暴露 jQuery
global.$ = global.jQuery = $;

// 清理 DOM
afterEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});
```

## 本章小结

测试关键点：

- **测试框架**：Vitest + jsdom 模拟浏览器环境
- **测试结构**：describe 分组，it 定义用例
- **断言**：expect 验证结果
- **覆盖率**：确保代码被充分测试

测试类型：

| 类型 | 说明 |
|------|------|
| 单元测试 | 测试单个函数或方法 |
| 集成测试 | 测试多个模块协作 |
| DOM 测试 | 测试 DOM 操作结果 |
| 异步测试 | 测试 Promise、回调 |

下一章，我们讨论性能优化。

---

**思考题**：如何为事件委托功能编写测试用例？
