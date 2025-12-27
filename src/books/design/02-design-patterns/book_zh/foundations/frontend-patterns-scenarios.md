# 前端开发中的常见模式场景

## 为什么前端需要设计模式？

在前端开发中，我们经常遇到这样的困境：代码能跑，功能实现了，但维护成本极高。三个月后回头看自己的代码，完全不知道当初为什么这样写。

**前端特有的复杂性**：
- **UI状态管理**：用户交互导致的状态变化复杂且频繁
- **异步操作**：网络请求、动画、定时器等异步场景随处可见
- **组件通信**：父子组件、兄弟组件、跨层级组件的数据传递
- **性能优化**：虚拟列表、懒加载、防抖节流等场景需要特殊处理

设计模式不是为了炫技，而是为了让代码**可预测、可测试、可维护**。

## 场景一：表单验证（策略模式）

### 问题现状

看看这个典型的表单验证代码：

```typescript
function validateForm(data: any) {
  if (!data.email) {
    return { valid: false, message: '邮箱不能为空' };
  }
  if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(data.email)) {
    return { valid: false, message: '邮箱格式不正确' };
  }
  if (!data.password) {
    return { valid: false, message: '密码不能为空' };
  }
  if (data.password.length < 8) {
    return { valid: false, message: '密码至少8位' };
  }
  if (!data.username) {
    return { valid: false, message: '用户名不能为空' };
  }
  if (data.username.length < 3) {
    return { valid: false, message: '用户名至少3位' };
  }
  return { valid: true };
}
```

**问题**：新增字段需要修改函数，违反开闭原则；验证逻辑无法复用；难以测试单个规则。

### 策略模式改造

```typescript
interface ValidationRule {
  validate(value: any): boolean;
  message: string;
}

class RequiredRule implements ValidationRule {
  message = '该字段不能为空';
  validate(value: any): boolean {
    return value !== null && value !== undefined && value !== '';
  }
}

class EmailFormatRule implements ValidationRule {
  message = '邮箱格式不正确';
  validate(value: string): boolean {
    return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value);
  }
}

class MinLengthRule implements ValidationRule {
  constructor(private minLength: number) {
    this.message = `至少${minLength}个字符`;
  }
  message: string;
  validate(value: string): boolean {
    return value.length >= this.minLength;
  }
}

class FieldValidator {
  constructor(
    private fieldName: string,
    private rules: ValidationRule[]
  ) {}

  validate(value: any): { valid: boolean; message?: string } {
    for (const rule of this.rules) {
      if (!rule.validate(value)) {
        return { valid: false, message: `${this.fieldName}${rule.message}` };
      }
    }
    return { valid: true };
  }
}

// 使用
const emailValidator = new FieldValidator('邮箱', [
  new RequiredRule(),
  new EmailFormatRule()
]);

const passwordValidator = new FieldValidator('密码', [
  new RequiredRule(),
  new MinLengthRule(8)
]);

function validateForm(data: any) {
  const validators = [
    { field: 'email', validator: emailValidator },
    { field: 'password', validator: passwordValidator }
  ];

  for (const { field, validator } of validators) {
    const result = validator.validate(data[field]);
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}
```

**收益**：新增验证规则只需添加新类；规则可复用；每个规则独立测试。

## 场景二：HTTP请求（装饰器模式）

### 问题现状

```typescript
async function fetchUserData(userId: string) {
  console.log(`Fetching user ${userId}...`);
  const token = localStorage.getItem('token');
  const startTime = Date.now();
  
  try {
    const response = await fetch(`/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Request took ${Date.now() - startTime}ms`);
    return data;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}
```

**问题**：日志、鉴权、性能监控、错误处理混在一起，难以复用和测试。

### 装饰器模式改造

```typescript
interface HttpClient {
  request(url: string, options?: RequestInit): Promise<any>;
}

class BaseHttpClient implements HttpClient {
  async request(url: string, options?: RequestInit): Promise<any> {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }
}

class LoggingDecorator implements HttpClient {
  constructor(private client: HttpClient) {}

  async request(url: string, options?: RequestInit): Promise<any> {
    console.log(`[HTTP] ${options?.method || 'GET'} ${url}`);
    return this.client.request(url, options);
  }
}

class AuthDecorator implements HttpClient {
  constructor(private client: HttpClient) {}

  async request(url: string, options?: RequestInit): Promise<any> {
    const token = localStorage.getItem('token');
    const headers = {
      ...options?.headers,
      Authorization: `Bearer ${token}`
    };
    return this.client.request(url, { ...options, headers });
  }
}

class PerformanceDecorator implements HttpClient {
  constructor(private client: HttpClient) {}

  async request(url: string, options?: RequestInit): Promise<any> {
    const startTime = performance.now();
    try {
      const result = await this.client.request(url, options);
      console.log(`[Perf] ${url} took ${(performance.now() - startTime).toFixed(2)}ms`);
      return result;
    } catch (error) {
      console.log(`[Perf] ${url} failed after ${(performance.now() - startTime).toFixed(2)}ms`);
      throw error;
    }
  }
}

// 使用：按需组合功能
const httpClient = new PerformanceDecorator(
  new AuthDecorator(
    new LoggingDecorator(
      new BaseHttpClient()
    )
  )
);

async function fetchUserData(userId: string) {
  return httpClient.request(`/api/users/${userId}`);
}
```

**收益**：每个装饰器职责单一；可自由组合功能；易于测试和复用。

## 场景三：全局状态管理（观察者模式）

### 问题现状

组件之间直接共享状态，导致数据流混乱：

```typescript
// 组件A修改全局变量
window.currentUser = { name: 'Alice', role: 'admin' };

// 组件B监听变量变化？无法实现
// 组件C如何知道用户信息更新了？无法得知
```

### 观察者模式改造

```typescript
interface Observer {
  update(data: any): void;
}

class Store {
  private observers: Observer[] = [];
  private state: any = {};

  subscribe(observer: Observer): () => void {
    this.observers.push(observer);
    return () => {
      this.observers = this.observers.filter(o => o !== observer);
    };
  }

  setState(newState: any): void {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  getState(): any {
    return this.state;
  }

  private notify(): void {
    this.observers.forEach(observer => observer.update(this.state));
  }
}

// 用户信息store
const userStore = new Store();

// 组件A：显示用户名
class UserNameComponent implements Observer {
  update(state: any): void {
    console.log(`用户名更新：${state.user?.name}`);
    document.querySelector('#username')!.textContent = state.user?.name || '';
  }
}

// 组件B：根据角色显示菜单
class MenuComponent implements Observer {
  update(state: any): void {
    const isAdmin = state.user?.role === 'admin';
    console.log(`菜单权限更新：${isAdmin ? '管理员' : '普通用户'}`);
  }
}

// 使用
const nameComp = new UserNameComponent();
const menuComp = new MenuComponent();

userStore.subscribe(nameComp);
userStore.subscribe(menuComp);

// 修改状态，所有订阅者自动更新
userStore.setState({ user: { name: 'Alice', role: 'admin' } });
```

**收益**：状态变化自动通知；组件解耦；数据流清晰可追踪。

## 场景四：组件懒加载（代理模式）

### 问题现状

大组件一次性加载，首屏性能差：

```typescript
import HeavyChart from './HeavyChart'; // 500KB的图表库

function Dashboard() {
  return <HeavyChart data={chartData} />;
}
```

### 代理模式改造

```typescript
interface Chart {
  render(data: any): void;
}

class RealChart implements Chart {
  constructor() {
    console.log('重量级图表组件加载完成（500KB）');
  }

  render(data: any): void {
    console.log('渲染图表:', data);
    // 实际渲染逻辑
  }
}

class ChartProxy implements Chart {
  private realChart: RealChart | null = null;
  private isLoading = false;

  async render(data: any): void {
    if (!this.realChart && !this.isLoading) {
      this.isLoading = true;
      console.log('开始懒加载图表组件...');
      
      // 模拟动态导入
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.realChart = new RealChart();
      this.isLoading = false;
    }

    if (this.realChart) {
      this.realChart.render(data);
    } else {
      console.log('显示加载中占位符...');
    }
  }
}

// 使用
const chart = new ChartProxy();
chart.render({ values: [1, 2, 3] }); // 首次触发加载
```

**收益**：按需加载；减少首屏体积；用户体验平滑过渡。

## 模式选择指南

| 场景 | 推荐模式 | 核心价值 |
|------|---------|---------|
| 表单验证、支付方式 | 策略模式 | 算法可替换 |
| HTTP拦截器、日志增强 | 装饰器模式 | 功能可组合 |
| 状态管理、事件总线 | 观察者模式 | 自动通知 |
| 懒加载、权限控制 | 代理模式 | 延迟/控制访问 |
| 工厂创建组件 | 工厂模式 | 创建逻辑封装 |
| 全局配置、路由实例 | 单例模式 | 唯一实例 |

## 总结

前端设计模式不是"设计过度"，而是应对复杂性的必要手段。关键在于：

1. **识别痛点**：代码难维护、功能难扩展、逻辑难复用
2. **找到模式**：根据问题本质选择合适模式
3. **渐进重构**：不要一次性重写，从最痛的地方开始
4. **团队共识**：模式的价值在于团队统一的解决方案

记住：**模式是工具，不是目的。解决问题才是核心。**
