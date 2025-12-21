# 项目架构与开发环境搭建

理论讲够了，是时候动手写代码了。

这一章我们会搭建 Mini-jQuery 的项目结构，配置开发环境，写出第一行代码。

## 项目结构设计

先来规划我们的项目结构：

```
mini-jquery/
├── src/                    # 源码目录
│   ├── core/               # 核心模块
│   │   ├── init.js         # 初始化与构造器
│   │   └── index.js        # 核心入口
│   ├── selector/           # 选择器模块
│   ├── traversal/          # DOM 遍历模块
│   ├── manipulation/       # DOM 操作模块
│   ├── attributes/         # 属性模块
│   ├── styles/             # 样式模块
│   ├── events/             # 事件模块
│   ├── animation/          # 动画模块
│   ├── ajax/               # Ajax 模块
│   └── index.js            # 总入口
├── test/                   # 测试文件
├── dist/                   # 构建输出
├── package.json
├── vite.config.js          # 构建配置
└── index.html              # 测试页面
```

这个结构的设计思路：

1. **模块化**：每个功能独立成模块，便于维护和测试
2. **渐进式**：可以按需引入，不需要的模块不会打包进去
3. **现代化**：使用 ES Modules，配合 Vite 进行开发和构建

## 初始化项目

打开终端，创建项目：

```bash
mkdir mini-jquery
cd mini-jquery
npm init -y
```

安装开发依赖：

```bash
npm install -D vite
```

为什么选择 Vite？

1. **零配置启动**：不需要复杂的 webpack 配置
2. **极速热更新**：修改代码秒级生效
3. **原生 ES Modules**：开发时不需要打包，直接运行源码

修改 `package.json`，添加脚本：

```json
{
  "name": "mini-jquery",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

## 创建入口文件

创建 `src/index.js`，这是我们库的入口：

```javascript
// src/index.js

// 定义 jQuery 构造函数
function jQuery(selector) {
  // 暂时只做一件事：打印选择器
  console.log('jQuery called with:', selector);
}

// 挂载到全局
window.$ = window.jQuery = jQuery;

export default jQuery;
```

这是最简单的起点——一个函数，接受选择器参数。

## 创建测试页面

创建 `index.html`：

```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mini-jQuery 开发测试</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 0 20px;
    }
    .box {
      padding: 20px;
      margin: 10px 0;
      background: #f0f0f0;
      border-radius: 8px;
    }
    .item {
      padding: 10px;
      margin: 5px 0;
      background: #e0e0e0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>Mini-jQuery 测试页面</h1>
  
  <div id="app">
    <div class="box" id="box1">
      <p>这是第一个盒子</p>
      <div class="item">Item 1</div>
      <div class="item">Item 2</div>
      <div class="item">Item 3</div>
    </div>
    
    <div class="box" id="box2">
      <p>这是第二个盒子</p>
      <button id="btn">点击我</button>
    </div>
  </div>
  
  <script type="module">
    import $ from './src/index.js';
    
    // 测试代码
    $('#box1');
    $('.item');
    $('div');
  </script>
</body>
</html>
```

## 启动开发服务器

运行：

```bash
npm run dev
```

打开浏览器访问 `http://localhost:5173`，打开控制台，你应该能看到：

```
jQuery called with: #box1
jQuery called with: .item
jQuery called with: div
```

恭喜！你的 Mini-jQuery 已经"运行"起来了。

当然，它现在什么都不能做，只是打印了选择器。但这就是我们的起点。

## 开发工作流

从现在开始，我们的开发工作流是这样的：

1. **编写代码**：在 `src/` 目录下编写模块
2. **测试功能**：在 `index.html` 中调用，在控制台查看结果
3. **迭代优化**：发现问题，修改代码，Vite 自动热更新

每一章结束后，我们都会有一个可运行的版本。你可以随时在浏览器中验证我们写的代码是否正确。

## 代码规范

在开始写大量代码之前，先约定一些规范：

### ES6+ 语法

我们只考虑 Chrome 最新版，可以放心使用所有现代语法：

```javascript
// 箭头函数
const add = (a, b) => a + b;

// 解构赋值
const { length } = 'hello';

// 模板字符串
const msg = `Length is ${length}`;

// 展开运算符
const arr = [...document.querySelectorAll('.item')];

// 可选链
const name = obj?.user?.name;

// 空值合并
const value = input ?? 'default';
```

### 命名规范

```javascript
// 变量和函数：camelCase
const userName = 'John';
function getUserName() {}

// 常量：UPPER_SNAKE_CASE
const MAX_LENGTH = 100;

// 类：PascalCase
class EventEmitter {}

// 私有方法：下划线前缀
function _privateMethod() {}
```

### 注释规范

```javascript
/**
 * 根据选择器查找元素
 * @param {string} selector - CSS 选择器
 * @param {Element} [context=document] - 查找上下文
 * @returns {jQuery} jQuery 对象
 */
function find(selector, context = document) {
  // 实现...
}
```

## 下一步

现在我们有了：

- 一个可运行的项目结构
- 一个极简的入口函数
- 一个用于测试的 HTML 页面
- 热更新的开发环境

下一章，我们将开始实现真正的功能：让 `$()` 函数能够选择元素，返回一个可以链式调用的 jQuery 对象。

---

准备好了吗？让我们开始实现 `$` 函数的核心逻辑。
