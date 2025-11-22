# 实战项目示例

> 使用 mini-vue3 构建真实应用，验证学习成果

## 🎯 项目目的

1. **验证功能**：确保实现的功能可用
2. **发现问题**：在实际使用中发现 Bug
3. **提升信心**：看到自己的框架运行起来
4. **积累经验**：理解框架在实际项目中的应用

---

## 📂 项目结构

```
examples/
├── 01-counter/              # Week 7 - 简单计数器
├── 02-todo-list/            # Week 9 - Todo 应用
├── 03-markdown-editor/      # Week 12 - Markdown 编辑器
├── 04-component-library/    # Week 16 - 组件库
├── 05-admin-dashboard/      # Week 20 - 后台管理
└── 06-ssr-blog/            # Week 24 - SSR 博客
```

---

## 项目1：响应式计数器（Week 7）

**学习目标**：验证响应式系统和 effect

### 功能需求
- ✅ 显示当前计数
- ✅ 点击按钮增加/减少计数
- ✅ 自动更新页面

### 实现代码

```typescript
/**
 * examples/01-counter/main.ts
 */

import { reactive, effect } from '../../src/index'

// 创建响应式状态
const state = reactive({
  count: 0
})

// 创建副作用（自动更新页面）
effect(() => {
  document.querySelector('#count')!.textContent = String(state.count)
})

// 绑定事件
document.querySelector('#increment')!.addEventListener('click', () => {
  state.count++
})

document.querySelector('#decrement')!.addEventListener('click', () => {
  state.count--
})
```

```html
<!-- examples/01-counter/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Counter - Mini Vue3</title>
  <style>
    .counter {
      text-align: center;
      padding: 40px;
      font-family: Arial, sans-serif;
    }
    .count {
      font-size: 48px;
      margin: 20px 0;
    }
    button {
      font-size: 20px;
      padding: 10px 20px;
      margin: 0 10px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="counter">
    <h1>响应式计数器</h1>
    <div class="count" id="count">0</div>
    <button id="decrement">-</button>
    <button id="increment">+</button>
  </div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

### 验收标准
- [ ] 初始显示为 0
- [ ] 点击 + 按钮，数字增加
- [ ] 点击 - 按钮，数字减少
- [ ] 页面自动更新，无需手动操作 DOM

---

## 项目2：Todo List（Week 9）

**学习目标**：验证响应式数组和computed

### 功能需求
- ✅ 添加待办事项
- ✅ 标记完成/未完成
- ✅ 删除待办事项
- ✅ 显示完成数量
- ✅ 筛选显示（全部/未完成/已完成）

### 数据结构

```typescript
interface Todo {
  id: number
  text: string
  completed: boolean
}

const state = reactive({
  todos: [] as Todo[],
  filter: 'all' as 'all' | 'active' | 'completed'
})

const filteredTodos = computed(() => {
  switch (state.filter) {
    case 'active':
      return state.todos.filter(todo => !todo.completed)
    case 'completed':
      return state.todos.filter(todo => todo.completed)
    default:
      return state.todos
  }
})

const completedCount = computed(() => {
  return state.todos.filter(todo => todo.completed).length
})
```

### 验收标准
- [ ] 可以添加新的 todo
- [ ] 可以切换完成状态
- [ ] 可以删除 todo
- [ ] completed count 自动更新
- [ ] 筛选功能正常工作

---

## 项目3：Markdown 编辑器（Week 12）

**学习目标**：验证组件系统和双向绑定

### 功能需求
- ✅ 左侧输入 Markdown
- ✅ 右侧实时预览 HTML
- ✅ 支持常用 Markdown 语法
- ✅ 本地存储自动保存

### 组件结构

```
MarkdownEditor
├── EditorPanel（编辑面板）
└── PreviewPanel（预览面板）
```

### 实现要点

```typescript
// 组件定义
const MarkdownEditor = {
  setup() {
    const state = reactive({
      markdown: localStorage.getItem('markdown') || '# Hello Mini-Vue3!'
    })

    const html = computed(() => {
      return marked.parse(state.markdown)
    })

    watch(() => state.markdown, (value) => {
      localStorage.setItem('markdown', value)
    })

    return {
      state,
      html
    }
  },
  
  render() {
    return h('div', { class: 'editor' }, [
      h(EditorPanel, { 
        modelValue: this.state.markdown,
        'onUpdate:modelValue': (val) => this.state.markdown = val
      }),
      h(PreviewPanel, { html: this.html })
    ])
  }
}
```

### 验收标准
- [ ] 输入 Markdown，右侧实时预览
- [ ] 支持标题、列表、代码块等语法
- [ ] 刷新页面后内容保留
- [ ] 组件通信正常

---

## 项目4：组件库（Week 16）

**学习目标**：验证编译器和组件系统

### 功能需求
- ✅ Button 按钮组件
- ✅ Input 输入框组件
- ✅ Dialog 对话框组件
- ✅ Table 表格组件

### Button 组件示例

```vue
<!-- examples/04-component-library/components/Button.vue -->
<template>
  <button 
    :class="['btn', `btn-${type}`, { 'btn-disabled': disabled }]"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot></slot>
  </button>
</template>

<script>
export default {
  props: {
    type: {
      type: String,
      default: 'primary'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  
  emits: ['click'],
  
  setup(props, { emit }) {
    const handleClick = (e) => {
      if (!props.disabled) {
        emit('click', e)
      }
    }
    
    return {
      handleClick
    }
  }
}
</script>

<style scoped>
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

### 验收标准
- [ ] 所有组件功能正常
- [ ] props 和 emit 正常工作
- [ ] 插槽功能正常
- [ ] 样式隔离正常
- [ ] 模板编译正确

---

## 项目5：后台管理系统（Week 20）

**学习目标**：验证高级特性（Teleport、KeepAlive等）

### 功能需求
- ✅ 路由导航
- ✅ 数据表格
- ✅ 表单验证
- ✅ 弹窗组件（使用 Teleport）
- ✅ 页面缓存（使用 KeepAlive）

### 技术栈
- mini-vue3（核心）
- mini-vue-router（路由）
- 自己实现的组件库

### 验收标准
- [ ] 路由切换正常
- [ ] 表单验证正常
- [ ] Teleport 正确渲染到 body
- [ ] KeepAlive 缓存页面状态
- [ ] 整体交互流畅

---

## 项目6：SSR 博客（Week 24）

**学习目标**：验证 SSR 和性能优化

### 功能需求
- ✅ 服务端渲染
- ✅ 客户端激活（Hydration）
- ✅ 文章列表和详情
- ✅ 评论功能
- ✅ SEO 优化

### SSR 实现

```typescript
// server.ts
import express from 'express'
import { renderToString } from '../../src/server-renderer'
import { createApp } from './app'

const server = express()

server.get('*', async (req, res) => {
  const app = createApp()
  const html = await renderToString(app)
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Mini-Vue3 SSR Blog</title>
      </head>
      <body>
        <div id="app">${html}</div>
        <script src="/client.js"></script>
      </body>
    </html>
  `)
})

server.listen(3000)
```

```typescript
// client.ts
import { createApp } from './app'

const app = createApp()
app.mount('#app')
```

### 验收标准
- [ ] 首次加载显示服务端渲染的 HTML
- [ ] 客户端 hydration 成功
- [ ] 页面可交互
- [ ] SEO 友好
- [ ] 性能优良（First Contentful Paint < 1s）

---

## 🚀 如何运行示例项目

### 开发模式

```bash
# 进入项目目录
cd examples/01-counter

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 打开浏览器
# http://localhost:5173
```

### 构建生产版本

```bash
npm run build
```

---

## 📝 项目开发检查清单

### 开始前
- [ ] 明确项目需求
- [ ] 设计数据结构
- [ ] 规划组件结构
- [ ] 准备测试用例

### 开发中
- [ ] 功能逐步实现
- [ ] 每个功能都测试
- [ ] 及时提交代码
- [ ] 记录遇到的问题

### 完成后
- [ ] 所有功能正常
- [ ] 没有控制台错误
- [ ] 性能可接受
- [ ] 代码整洁规范
- [ ] 写项目总结

---

## 💡 项目总结模板

```markdown
# 项目名称

## 项目信息
- 开发时间：X 小时
- 代码行数：X 行
- 使用的功能：reactive, effect, computed, ...

## 功能截图
[添加截图]

## 遇到的问题
1. **问题1**：描述
   - 原因：
   - 解决方案：
   - 学到的经验：

## 性能数据
- 首次渲染：X ms
- 更新时间：X ms
- 内存占用：X MB

## 项目亮点
1. 
2. 
3. 

## 需要改进的地方
1. 
2. 

## 下次可以尝试
1. 
2. 
```

---

记住：**实战项目是检验学习成果的最好方式！** 🎯
