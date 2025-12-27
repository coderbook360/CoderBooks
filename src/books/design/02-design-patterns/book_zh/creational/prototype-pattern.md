# 原型模式：对象克隆与配置复用

## 创建对象的另一种思路

首先要问一个问题：**当一个对象的创建成本很高时，有没有更快的方式创建相似对象？**

看看这个场景：

```typescript
class ComplexConfig {
  constructor(
    public database: { host: string; port: number; credentials: any },
    public cache: { ttl: number; maxSize: number },
    public logging: { level: string; outputs: string[] },
    public features: Map<string, boolean>
  ) {}
}

// 创建第一个配置：需要大量初始化工作
const prodConfig = new ComplexConfig(
  { host: 'prod-db.com', port: 5432, credentials: loadCredentials() },
  { ttl: 3600, maxSize: 1000 },
  { level: 'error', outputs: ['file', 'sentry'] },
  new Map([['featureA', true], ['featureB', false]])
);

// 需要一个staging配置，只改host，其他都一样
// ❌ 重新创建：太麻烦
const stagingConfig = new ComplexConfig(
  { host: 'staging-db.com', port: 5432, credentials: loadCredentials() },
  { ttl: 3600, maxSize: 1000 }, // 重复代码
  { level: 'error', outputs: ['file', 'sentry'] }, // 重复代码
  new Map([['featureA', true], ['featureB', false]]) // 重复代码
);
```

**问题**：
- **重复代码多**：大部分配置相同，却要全部重写
- **创建成本高**：loadCredentials()等初始化操作被重复执行
- **容易出错**：手动复制容易漏掉某些配置

**现在我要问第二个问题：如何快速创建一个"几乎相同"的对象？**

答案是：**克隆现有对象，然后只修改需要改变的部分。**

## 原型模式

### 核心思想

不从零开始创建对象，而是：
1. **克隆现有对象**（原型）
2. **修改需要改变的属性**
3. **其他属性自动继承**

### 浅克隆 vs 深克隆

```typescript
// 问题对象
interface Config {
  name: string;
  settings: {
    timeout: number;
    retry: number;
  };
}

const original: Config = {
  name: 'prod',
  settings: {
    timeout: 5000,
    retry: 3
  }
};

// ❌ 浅克隆：只复制第一层
const shallow = { ...original };
shallow.name = 'staging'; // ✅ 修改name不影响original
shallow.settings.timeout = 10000; // ❌ 修改settings会影响original！

console.log(original.settings.timeout); // 10000（被修改了！）

// ✅ 深克隆：递归复制所有层级
const deep = JSON.parse(JSON.stringify(original));
deep.name = 'dev';
deep.settings.timeout = 3000; // ✅ 不影响original

console.log(original.settings.timeout); // 5000（未被修改）
```

### 完整实现

```typescript
// 1. 定义克隆接口
interface Cloneable {
  clone(): this;
}

// 2. 实现原型类
class ServerConfig implements Cloneable {
  constructor(
    public host: string,
    public port: number,
    public database: {
      name: string;
      credentials: { user: string; password: string };
    },
    public features: Map<string, boolean>
  ) {}

  // 深克隆方法
  clone(): this {
    // 克隆嵌套对象
    const dbClone = {
      name: this.database.name,
      credentials: {
        user: this.database.credentials.user,
        password: this.database.credentials.password
      }
    };

    // 克隆Map
    const featuresClone = new Map(this.features);

    // 创建新实例
    return new ServerConfig(
      this.host,
      this.port,
      dbClone,
      featuresClone
    ) as this;
  }
}

// 3. 使用：创建原型，然后克隆
const prodConfig = new ServerConfig(
  'prod.example.com',
  8080,
  {
    name: 'prod_db',
    credentials: { user: 'admin', password: 'secret' }
  },
  new Map([
    ['featureA', true],
    ['featureB', false]
  ])
);

// 克隆并修改
const stagingConfig = prodConfig.clone();
stagingConfig.host = 'staging.example.com';
stagingConfig.database.name = 'staging_db';

const devConfig = prodConfig.clone();
devConfig.host = 'localhost';
devConfig.port = 3000;
devConfig.database.name = 'dev_db';
devConfig.features.set('featureA', false);

// 验证：原型未被修改
console.log(prodConfig.host); // 'prod.example.com'
console.log(prodConfig.database.name); // 'prod_db'
console.log(prodConfig.features.get('featureA')); // true
```

**关键点**：
- **深克隆**：递归复制嵌套对象
- **独立修改**：克隆对象与原型互不影响
- **复用配置**：大部分属性继承自原型

## 前端常见场景

### 场景一：HTTP请求模板

```typescript
interface RequestOptions {
  headers: Record<string, string>;
  timeout: number;
  retry: number;
  validateStatus: (status: number) => boolean;
}

class HttpRequest implements Cloneable {
  constructor(
    public url: string,
    public method: string,
    public options: RequestOptions
  ) {}

  clone(): this {
    // 深克隆options
    const optionsClone: RequestOptions = {
      headers: { ...this.options.headers },
      timeout: this.options.timeout,
      retry: this.options.retry,
      validateStatus: this.options.validateStatus
    };

    return new HttpRequest(
      this.url,
      this.method,
      optionsClone
    ) as this;
  }

  async send(): Promise<any> {
    console.log(`${this.method} ${this.url}`);
    // 实际请求逻辑
  }
}

// 创建基础请求模板
const baseRequest = new HttpRequest(
  '',
  'GET',
  {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token123'
    },
    timeout: 5000,
    retry: 3,
    validateStatus: (status) => status >= 200 && status < 300
  }
);

// 克隆模板，创建具体请求
const getUsersRequest = baseRequest.clone();
getUsersRequest.url = '/api/users';
getUsersRequest.method = 'GET';

const createUserRequest = baseRequest.clone();
createUserRequest.url = '/api/users';
createUserRequest.method = 'POST';
createUserRequest.options.timeout = 10000; // 创建用户可能需要更长时间

const deleteUserRequest = baseRequest.clone();
deleteUserRequest.url = '/api/users/123';
deleteUserRequest.method = 'DELETE';
```

### 场景二：图表配置克隆

```typescript
interface ChartOptions {
  title: string;
  colors: string[];
  legend: { show: boolean; position: string };
  tooltip: { enabled: boolean };
  animation: { duration: number };
}

class ChartConfig implements Cloneable {
  constructor(public options: ChartOptions) {}

  clone(): this {
    // 深克隆配置
    const optionsClone: ChartOptions = {
      title: this.options.title,
      colors: [...this.options.colors],
      legend: { ...this.options.legend },
      tooltip: { ...this.options.tooltip },
      animation: { ...this.options.animation }
    };

    return new ChartConfig(optionsClone) as this;
  }
}

// 创建默认配置模板
const defaultChartConfig = new ChartConfig({
  title: '',
  colors: ['#5470c6', '#91cc75', '#fac858'],
  legend: { show: true, position: 'top' },
  tooltip: { enabled: true },
  animation: { duration: 1000 }
});

// 克隆并定制
const salesChart = defaultChartConfig.clone();
salesChart.options.title = '月度销售额';
salesChart.options.colors = ['#ee6666', '#73c0de'];

const userChart = defaultChartConfig.clone();
userChart.options.title = '用户增长趋势';
userChart.options.legend.position = 'bottom';

const performanceChart = defaultChartConfig.clone();
performanceChart.options.title = '系统性能';
performanceChart.options.animation.duration = 0; // 性能图表不需要动画
```

### 场景三：表单字段模板

```typescript
interface ValidationRule {
  type: string;
  message: string;
  value?: any;
}

class FormField implements Cloneable {
  constructor(
    public name: string,
    public label: string,
    public type: string,
    public rules: ValidationRule[],
    public attrs: Record<string, any>
  ) {}

  clone(): this {
    // 深克隆规则数组
    const rulesClone = this.rules.map(rule => ({ ...rule }));
    
    // 深克隆属性对象
    const attrsClone = { ...this.attrs };

    return new FormField(
      this.name,
      this.label,
      this.type,
      rulesClone,
      attrsClone
    ) as this;
  }
}

// 创建文本字段模板
const textFieldTemplate = new FormField(
  '',
  '',
  'text',
  [
    { type: 'required', message: '该字段必填' }
  ],
  {
    placeholder: '请输入',
    maxLength: 100
  }
);

// 克隆并定制
const usernameField = textFieldTemplate.clone();
usernameField.name = 'username';
usernameField.label = '用户名';
usernameField.rules.push({
  type: 'minLength',
  value: 3,
  message: '至少3个字符'
});

const emailField = textFieldTemplate.clone();
emailField.name = 'email';
emailField.label = '邮箱';
emailField.type = 'email';
emailField.rules.push({
  type: 'email',
  message: '邮箱格式不正确'
});
emailField.attrs.placeholder = '请输入邮箱地址';

const passwordField = textFieldTemplate.clone();
passwordField.name = 'password';
passwordField.label = '密码';
passwordField.type = 'password';
passwordField.rules.push({
  type: 'minLength',
  value: 8,
  message: '至少8个字符'
});
passwordField.attrs.maxLength = 20;
```

## JavaScript原生克隆方法

### 方法一：Object.assign()（浅克隆）

```typescript
const original = {
  name: 'Alice',
  age: 25,
  address: { city: 'Beijing' }
};

const copy = Object.assign({}, original);
copy.name = 'Bob'; // ✅ 不影响original
copy.address.city = 'Shanghai'; // ❌ 影响original

console.log(original.address.city); // 'Shanghai'
```

### 方法二：展开运算符（浅克隆）

```typescript
const copy = { ...original };
```

### 方法三：JSON序列化（深克隆，有限制）

```typescript
const deep = JSON.parse(JSON.stringify(original));

// ❌ 限制：
// 1. 函数会丢失
// 2. undefined会丢失
// 3. Date会变成字符串
// 4. RegExp会变成空对象
// 5. Map/Set不支持
```

### 方法四：structuredClone()（现代浏览器）

```typescript
const deep = structuredClone(original);

// ✅ 支持：
// - 嵌套对象
// - 数组
// - Date
// - RegExp
// - Map/Set

// ❌ 限制：
// - 函数不支持
// - DOM节点不支持
```

## 原型模式的应用场景

| 场景 | 是否适用 | 理由 |
|------|---------|------|
| 对象创建成本高 | ✅ 是 | 克隆比重新创建快 |
| 需要多个相似对象 | ✅ 是 | 复用配置，只改差异 |
| 动态运行时创建对象 | ✅ 是 | 不需要知道具体类 |
| 对象结构简单 | ❌ 否 | 直接new即可 |
| 每个对象都完全不同 | ❌ 否 | 没有复用价值 |

## 原型模式 vs 工厂模式

| 对比维度 | 原型模式 | 工厂模式 |
|---------|---------|---------|
| 创建方式 | 克隆现有对象 | 从零创建新对象 |
| 适用场景 | 对象相似，创建成本高 | 对象种类多，创建逻辑复杂 |
| 灵活性 | 基于现有对象，灵活性低 | 完全控制创建过程，灵活性高 |
| 性能 | 克隆通常比new快 | 每次都是完整创建 |

## 总结

原型模式的核心在于：**通过克隆快速创建相似对象，复用现有配置。**

**关键原则**：
1. **深克隆**：确保克隆对象与原型独立
2. **复用优先**：大部分属性来自原型，只改差异
3. **性能优化**：克隆比重新创建快
4. **适度使用**：对象简单时不要过度设计

**使用场景**：
- ✅ 创建成本高（初始化复杂、数据库查询）
- ✅ 需要多个相似对象（配置模板、请求模板）
- ✅ 动态运行时创建（不知道具体类）
- ❌ 对象简单（直接new即可）
- ❌ 对象完全不同（没有复用价值）

记住：**原型模式不是为了克隆而克隆，而是为了解决"如何高效创建相似对象"的问题。**
