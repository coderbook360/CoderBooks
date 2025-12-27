# 简单工厂：对象创建的集中管理

## 为什么需要工厂？

首先要问一个问题：**直接new对象有什么问题？**

看看这段代码：

```typescript
class App {
  init(): void {
    const button1 = new MacButton();
    const button2 = new WindowsButton();
    const button3 = new LinuxButton();
    
    // 如果新增AndroidButton，需要修改这里
    // 如果Button构造函数参数变化，需要修改所有地方
  }
}
```

**问题**：
- **创建逻辑分散**：每个new的地方都需要知道具体类名
- **难以维护**：构造函数变化时，所有new的地方都要改
- **违反开闭原则**：新增类型需要修改调用代码

**现在我要问第二个问题：如何解决这个问题？**

答案是：**把创建逻辑集中到一个地方，调用者只需要告诉工厂"我要什么"，不需要知道"怎么创建"。**

## 简单工厂模式

### 错误示例：分散的创建逻辑

```typescript
// 支付场景
class PaymentService {
  processPayment(method: string, amount: number): void {
    if (method === 'alipay') {
      const payment = new AlipayPayment();
      payment.pay(amount);
    } else if (method === 'wechat') {
      const payment = new WechatPayment();
      payment.pay(amount);
    } else if (method === 'credit-card') {
      const payment = new CreditCardPayment();
      payment.pay(amount);
    }
  }
}

// ❌ 问题：每次新增支付方式都要修改if-else
// ❌ 问题：创建逻辑和业务逻辑混在一起
```

### 正确实现：简单工厂

```typescript
// 1. 定义统一接口
interface Payment {
  pay(amount: number): void;
}

// 2. 实现具体类
class AlipayPayment implements Payment {
  pay(amount: number): void {
    console.log(`支付宝支付 ${amount} 元`);
    // 调用支付宝SDK
  }
}

class WechatPayment implements Payment {
  pay(amount: number): void {
    console.log(`微信支付 ${amount} 元`);
    // 调用微信SDK
  }
}

class CreditCardPayment implements Payment {
  pay(amount: number): void {
    console.log(`信用卡支付 ${amount} 元`);
    // 调用银行接口
  }
}

// 3. 工厂类：集中创建逻辑
class PaymentFactory {
  static createPayment(method: string): Payment {
    switch (method) {
      case 'alipay':
        return new AlipayPayment();
      case 'wechat':
        return new WechatPayment();
      case 'credit-card':
        return new CreditCardPayment();
      default:
        throw new Error(`不支持的支付方式: ${method}`);
    }
  }
}

// 4. 使用：调用者不需要知道具体类
class PaymentService {
  processPayment(method: string, amount: number): void {
    const payment = PaymentFactory.createPayment(method);
    payment.pay(amount);
  }
}

// 使用
const service = new PaymentService();
service.processPayment('alipay', 100); // 支付宝支付 100 元
service.processPayment('wechat', 200); // 微信支付 200 元
```

**收益**：
- **创建逻辑集中**：只在工厂中修改
- **调用者解耦**：不依赖具体类
- **易于扩展**：新增支付方式只改工厂

## 前端常见场景

### 场景一：HTTP请求工厂

```typescript
interface HttpAdapter {
  request(config: any): Promise<any>;
}

class FetchAdapter implements HttpAdapter {
  async request(config: any): Promise<any> {
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: JSON.stringify(config.data)
    });
    return response.json();
  }
}

class XHRAdapter implements HttpAdapter {
  async request(config: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(config.method, config.url);
      
      Object.keys(config.headers || {}).forEach(key => {
        xhr.setRequestHeader(key, config.headers[key]);
      });

      xhr.onload = () => resolve(JSON.parse(xhr.responseText));
      xhr.onerror = () => reject(new Error('Request failed'));
      
      xhr.send(JSON.stringify(config.data));
    });
  }
}

class HttpAdapterFactory {
  static createAdapter(): HttpAdapter {
    // 根据环境自动选择
    if (typeof fetch !== 'undefined') {
      return new FetchAdapter();
    } else if (typeof XMLHttpRequest !== 'undefined') {
      return new XHRAdapter();
    } else {
      throw new Error('No suitable adapter found');
    }
  }
}

// 使用
const adapter = HttpAdapterFactory.createAdapter();
adapter.request({
  url: '/api/users',
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
});
```

### 场景二：表单验证器工厂

```typescript
interface Validator {
  validate(value: any): { valid: boolean; message?: string };
}

class EmailValidator implements Validator {
  validate(value: string): { valid: boolean; message?: string } {
    const isValid = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value);
    return isValid 
      ? { valid: true }
      : { valid: false, message: '邮箱格式不正确' };
  }
}

class PhoneValidator implements Validator {
  validate(value: string): { valid: boolean; message?: string } {
    const isValid = /^1[3-9]\d{9}$/.test(value);
    return isValid
      ? { valid: true }
      : { valid: false, message: '手机号格式不正确' };
  }
}

class MinLengthValidator implements Validator {
  constructor(private minLength: number) {}

  validate(value: string): { valid: boolean; message?: string } {
    const isValid = value.length >= this.minLength;
    return isValid
      ? { valid: true }
      : { valid: false, message: `至少${this.minLength}个字符` };
  }
}

class ValidatorFactory {
  static createValidator(type: string, options?: any): Validator {
    switch (type) {
      case 'email':
        return new EmailValidator();
      case 'phone':
        return new PhoneValidator();
      case 'minLength':
        return new MinLengthValidator(options.minLength);
      default:
        throw new Error(`Unknown validator type: ${type}`);
    }
  }
}

// 使用：动态创建验证器
function validateField(type: string, value: any, options?: any) {
  const validator = ValidatorFactory.createValidator(type, options);
  return validator.validate(value);
}

console.log(validateField('email', 'test@example.com')); // { valid: true }
console.log(validateField('phone', '12345')); // { valid: false, message: '手机号格式不正确' }
console.log(validateField('minLength', 'abc', { minLength: 5 })); // { valid: false, message: '至少5个字符' }
```

### 场景三：图表组件工厂

```typescript
interface Chart {
  render(data: any[]): void;
}

class LineChart implements Chart {
  render(data: any[]): void {
    console.log('渲染折线图:', data);
    // 实际渲染逻辑
  }
}

class BarChart implements Chart {
  render(data: any[]): void {
    console.log('渲染柱状图:', data);
    // 实际渲染逻辑
  }
}

class PieChart implements Chart {
  render(data: any[]): void {
    console.log('渲染饼图:', data);
    // 实际渲染逻辑
  }
}

class ChartFactory {
  static createChart(type: string): Chart {
    const charts: Record<string, () => Chart> = {
      'line': () => new LineChart(),
      'bar': () => new BarChart(),
      'pie': () => new PieChart()
    };

    const factory = charts[type];
    if (!factory) {
      throw new Error(`不支持的图表类型: ${type}`);
    }

    return factory();
  }
}

// 使用：根据配置动态创建图表
interface ChartConfig {
  type: string;
  data: any[];
}

function renderChart(config: ChartConfig): void {
  const chart = ChartFactory.createChart(config.type);
  chart.render(config.data);
}

renderChart({ type: 'line', data: [1, 2, 3] }); // 渲染折线图: [1, 2, 3]
renderChart({ type: 'bar', data: [4, 5, 6] }); // 渲染柱状图: [4, 5, 6]
```

## 简单工厂 vs 直接new

### 什么时候用简单工厂？

| 场景 | 是否用工厂 | 理由 |
|------|-----------|------|
| 创建逻辑简单，只有一两个类 | ❌ 否 | 直接new即可，不要过度设计 |
| 需要根据参数决定创建哪个类 | ✅ 是 | 集中创建逻辑 |
| 构造函数参数复杂 | ✅ 是 | 隐藏复杂性 |
| 未来可能新增类型 | ✅ 是 | 易于扩展 |
| 需要对象池、缓存等高级功能 | ✅ 是 | 控制创建过程 |

### 简单工厂的局限性

```typescript
// ❌ 问题：每次新增类型都要修改工厂
class PaymentFactory {
  static createPayment(method: string): Payment {
    switch (method) {
      case 'alipay':
        return new AlipayPayment();
      case 'wechat':
        return new WechatPayment();
      case 'credit-card':
        return new CreditCardPayment();
      // 新增PayPal，需要修改这里
      case 'paypal':
        return new PayPalPayment();
      default:
        throw new Error(`不支持的支付方式: ${method}`);
    }
  }
}
```

**问题**：违反开闭原则（对扩展开放，对修改关闭）。

**解决方案**：使用注册机制或工厂方法模式（后续章节介绍）。

## 改进：注册机制

```typescript
type PaymentConstructor = new () => Payment;

class PaymentFactory {
  private static registry = new Map<string, PaymentConstructor>();

  // 注册支付方式
  static register(method: string, constructor: PaymentConstructor): void {
    this.registry.set(method, constructor);
  }

  // 创建支付对象
  static createPayment(method: string): Payment {
    const Constructor = this.registry.get(method);
    if (!Constructor) {
      throw new Error(`不支持的支付方式: ${method}`);
    }
    return new Constructor();
  }
}

// 注册内置支付方式
PaymentFactory.register('alipay', AlipayPayment);
PaymentFactory.register('wechat', WechatPayment);
PaymentFactory.register('credit-card', CreditCardPayment);

// 扩展：新增PayPal，无需修改工厂代码
class PayPalPayment implements Payment {
  pay(amount: number): void {
    console.log(`PayPal支付 ${amount} 元`);
  }
}

PaymentFactory.register('paypal', PayPalPayment);

// 使用
const payment = PaymentFactory.createPayment('paypal');
payment.pay(100); // PayPal支付 100 元
```

**收益**：
- **开闭原则**：新增类型无需修改工厂
- **插件化**：支持动态注册
- **解耦**：工厂不依赖具体类

## 总结

简单工厂模式的核心在于：**把创建逻辑集中管理，让调用者只依赖接口，不依赖具体类。**

**关键原则**：
1. **适度使用**：创建逻辑简单时不要过度设计
2. **统一接口**：所有产品实现相同接口
3. **集中创建**：创建逻辑集中在工厂
4. **易于扩展**：使用注册机制避免修改工厂

**使用场景**：
- ✅ 需要根据参数动态创建对象
- ✅ 创建逻辑复杂或可能变化
- ✅ 希望隐藏具体类，只暴露接口
- ❌ 创建逻辑极其简单（直接new即可）
- ❌ 只有一个产品类（不需要工厂）

记住：**工厂模式不是为了炫技，而是为了解决"创建逻辑复杂或多变"的问题。**
