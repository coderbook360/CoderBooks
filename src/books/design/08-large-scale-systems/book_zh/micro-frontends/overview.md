# 微前端架构概述

> 微前端是一种将前端应用拆分为独立可部署的小型应用的架构风格，每个小型应用可以由不同团队独立开发、测试和部署。

## 为什么需要微前端？

### 单体前端的困境

```
单体前端应用的问题
├── 代码库巨大（100万+ 行代码）
├── 构建时间长（10+ 分钟）
├── 团队协作困难（20+ 人同时开发）
├── 发布风险高（一处改动影响全局）
├── 技术升级困难（强制一致的技术栈）
└── 新人上手慢（需要理解整个应用）
```

### 微前端的解决方案

```
微前端架构

┌────────────────────────────────────┐
│              容器应用 (Shell)            │
│  ┌────────┐ ┌────────┐ ┌────────┐ │
│  │ 应用 A  │ │ 应用 B  │ │ 应用 C  │ │
│  │ (React)│ │ (Vue)   │ │(Angular)│ │
│  └────────┘ └────────┘ └────────┘ │
└────────────────────────────────────┘

每个应用：
• 独立开发和部署
• 独立的技术栈
• 独立的团队负责
```

## 微前端实现方案

### 1. iframe 集成

```html
<!-- 最简单的微前端方案 -->
<div id="container">
  <iframe src="https://app-a.example.com" />
</div>
```

**优缺点**：

| 优点 | 缺点 |
|------|------|
| 完全隔离 | URL 不同步 |
| 简单实现 | 性能开销大 |
| 技术无关 | 通信复杂 |

### 2. JavaScript 集成

```typescript
// 容器应用：动态加载子应用
class MicroFrontendLoader {
  private apps: Map<string, MicroApp> = new Map();
  
  async loadApp(name: string, container: HTMLElement): Promise<void> {
    // 1. 获取子应用入口
    const manifest = await fetch(`/apps/${name}/manifest.json`);
    const { entry } = await manifest.json();
    
    // 2. 加载子应用脚本
    await this.loadScript(entry);
    
    // 3. 调用子应用的挂载函数
    const app = (window as any)[name];
    await app.mount(container);
    
    this.apps.set(name, app);
  }
  
  async unmountApp(name: string): Promise<void> {
    const app = this.apps.get(name);
    await app?.unmount();
    this.apps.delete(name);
  }
}

// 子应用：导出生命周期函数
class SubApp {
  private root: ReactDOM.Root | null = null;
  
  async mount(container: HTMLElement): Promise<void> {
    this.root = ReactDOM.createRoot(container);
    this.root.render(<App />);
  }
  
  async unmount(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }
}

(window as any).appA = new SubApp();
```

### 3. Module Federation

Webpack 5 的 Module Federation 是目前最流行的方案：

```typescript
// 子应用配置 (app-a)
const config: Configuration = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'appA',
      filename: 'remoteEntry.js',
      exposes: {
        './Button': './src/components/Button',
        './UserList': './src/features/UserList',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
};

// 容器应用配置 (shell)
const config: Configuration = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        appA: 'appA@http://localhost:3001/remoteEntry.js',
        appB: 'appB@http://localhost:3002/remoteEntry.js',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
};

// 容器应用中使用
const RemoteButton = React.lazy(() => import('appA/Button'));

function App() {
  return (
    <Suspense fallback="Loading...">
      <RemoteButton />
    </Suspense>
  );
}
```

## 核心挑战

### 1. 应用间通信

```typescript
// 事件总线方案
class EventBus {
  private events = new Map<string, Set<Function>>();
  
  emit(event: string, data: unknown): void {
    this.events.get(event)?.forEach(handler => handler(data));
  }
  
  on(event: string, handler: Function): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
    
    // 返回取消订阅函数
    return () => this.events.get(event)?.delete(handler);
  }
}

// 全局单例
const globalBus = new EventBus();

// 应用 A 发送消息
globalBus.emit('user:login', { userId: 123 });

// 应用 B 监听消息
globalBus.on('user:login', (data) => {
  console.log('User logged in:', data.userId);
});
```

### 2. 共享状态

```typescript
// 共享状态管理
interface SharedState {
  user: User | null;
  theme: 'light' | 'dark';
  locale: string;
}

class GlobalStore {
  private state: SharedState;
  private listeners = new Set<(state: SharedState) => void>();
  
  getState(): SharedState {
    return this.state;
  }
  
  setState(partial: Partial<SharedState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(listener => listener(this.state));
  }
  
  subscribe(listener: (state: SharedState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
```

### 3. 样式隔离

```typescript
// CSS 隐离方案
// 1. CSS Modules
import styles from './Button.module.css';

// 2. CSS-in-JS
const StyledButton = styled.button`
  background: ${props => props.theme.primary};
`;

// 3. Shadow DOM
class MicroAppElement extends HTMLElement {
  constructor() {
    super();
    // 创建 Shadow DOM 实现样式隔离
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.shadowRoot!.innerHTML = `
      <style>
        /* 这里的样式不会影响外部 */
        button { background: blue; }
      </style>
      <button>Click me</button>
    `;
  }
}
```

## 最佳实践

### 拆分策略

```
按业务域拆分（推荐）
├── 用户中心应用
├── 订单管理应用
├── 商品管理应用
└── 库存管理应用

每个应用：
• 由一个团队负责
• 有明确的业务边界
• 可以独立发布
```

### 选型建议

| 场景 | 推荐方案 |
|------|----------|
| 简单集成 | iframe |
| React 生态 | Module Federation |
| 多框架混合 | qiankun / single-spa |
| 组件级共享 | Module Federation |

## 总结

微前端的核心价值：

1. **独立部署**：每个应用可以单独发布
2. **技术多样性**：不同应用可用不同技术栈
3. **团队自治**：各团队独立负责自己的应用
4. **渐进升级**：可以逐步替换老旧系统

需要注意的挑战：

1. **应用通信**：事件总线或共享状态
2. **样式隔离**：CSS 模块化或 Shadow DOM
3. **共享依赖**：避免重复加载相同库
4. **统一体验**：共享设计系统