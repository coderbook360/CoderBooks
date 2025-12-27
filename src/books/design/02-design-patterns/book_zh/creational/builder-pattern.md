# 建造者模式：复杂对象的分步构建

## 构造函数的噩梦

首先要问一个问题：**当一个对象有十几个属性时，如何优雅地创建它？**

看看这个典型的构造函数：

```typescript
class HttpRequest {
  constructor(
    public url: string,
    public method: string,
    public headers?: Record<string, string>,
    public data?: any,
    public timeout?: number,
    public retry?: number,
    public cache?: boolean,
    public validateStatus?: (status: number) => boolean,
    public onUploadProgress?: (progress: number) => void,
    public onDownloadProgress?: (progress: number) => void
  ) {}
}

// 使用：参数太多，容易搞错顺序
const request = new HttpRequest(
  '/api/users',
  'POST',
  { 'Content-Type': 'application/json' },
  { name: 'Alice' },
  5000,
  3,
  true,
  (status) => status >= 200 && status < 300,
  undefined, // 不需要上传进度，但必须传undefined占位
  (progress) => console.log(progress)
);
```

**问题**：
- **参数过多**：超过3个参数就难以记忆
- **顺序混乱**：容易传错位置
- **可选参数**：不需要的参数也要传undefined占位
- **可读性差**：看不出参数含义

**现在我要问第二个问题：如何让对象创建过程既灵活又可读？**

答案是：**用建造者模式，链式调用，分步构建。**

## 建造者模式

### 核心思想

不再用构造函数一次性传所有参数，而是：
1. **创建Builder对象**
2. **链式调用设置属性**
3. **最后调用build()生成对象**

### 完整实现

```typescript
// 1. 产品类
class HttpRequest {
  public url: string = '';
  public method: string = 'GET';
  public headers: Record<string, string> = {};
  public data: any = null;
  public timeout: number = 0;
  public retry: number = 0;
  public cache: boolean = false;
  public validateStatus?: (status: number) => boolean;
  public onUploadProgress?: (progress: number) => void;
  public onDownloadProgress?: (progress: number) => void;
}

// 2. 建造者类
class HttpRequestBuilder {
  private request: HttpRequest;

  constructor() {
    this.request = new HttpRequest();
  }

  setUrl(url: string): this {
    this.request.url = url;
    return this; // 返回this支持链式调用
  }

  setMethod(method: string): this {
    this.request.method = method;
    return this;
  }

  setHeaders(headers: Record<string, string>): this {
    this.request.headers = headers;
    return this;
  }

  setData(data: any): this {
    this.request.data = data;
    return this;
  }

  setTimeout(timeout: number): this {
    this.request.timeout = timeout;
    return this;
  }

  setRetry(retry: number): this {
    this.request.retry = retry;
    return this;
  }

  setCache(cache: boolean): this {
    this.request.cache = cache;
    return this;
  }

  setValidateStatus(fn: (status: number) => boolean): this {
    this.request.validateStatus = fn;
    return this;
  }

  setOnDownloadProgress(fn: (progress: number) => void): this {
    this.request.onDownloadProgress = fn;
    return this;
  }

  build(): HttpRequest {
    // 可以在这里做验证
    if (!this.request.url) {
      throw new Error('URL不能为空');
    }
    return this.request;
  }
}

// 3. 使用：链式调用，清晰可读
const request = new HttpRequestBuilder()
  .setUrl('/api/users')
  .setMethod('POST')
  .setHeaders({ 'Content-Type': 'application/json' })
  .setData({ name: 'Alice' })
  .setTimeout(5000)
  .setRetry(3)
  .setOnDownloadProgress((progress) => console.log(progress))
  .build();

// 或者只设置需要的属性
const simpleRequest = new HttpRequestBuilder()
  .setUrl('/api/users')
  .setMethod('GET')
  .build();
```

**关键点**：
- **链式调用**：每个方法返回`this`
- **可读性强**：方法名说明了参数含义
- **灵活性高**：只设置需要的属性
- **验证集中**：在`build()`方法统一验证

## 前端常见场景

### 场景一：SQL查询构建器

```typescript
class SQLQuery {
  public table: string = '';
  public columns: string[] = [];
  public whereConditions: string[] = [];
  public orderBy: string = '';
  public limit: number = 0;

  toString(): string {
    let sql = `SELECT ${this.columns.join(', ') || '*'} FROM ${this.table}`;
    
    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    if (this.orderBy) {
      sql += ` ORDER BY ${this.orderBy}`;
    }
    
    if (this.limit > 0) {
      sql += ` LIMIT ${this.limit}`;
    }
    
    return sql;
  }
}

class SQLQueryBuilder {
  private query: SQLQuery;

  constructor() {
    this.query = new SQLQuery();
  }

  from(table: string): this {
    this.query.table = table;
    return this;
  }

  select(...columns: string[]): this {
    this.query.columns = columns;
    return this;
  }

  where(condition: string): this {
    this.query.whereConditions.push(condition);
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.query.orderBy = `${column} ${direction}`;
    return this;
  }

  limit(count: number): this {
    this.query.limit = count;
    return this;
  }

  build(): SQLQuery {
    if (!this.query.table) {
      throw new Error('必须指定表名');
    }
    return this.query;
  }
}

// 使用
const query = new SQLQueryBuilder()
  .from('users')
  .select('id', 'name', 'email')
  .where('age > 18')
  .where('status = "active"')
  .orderBy('created_at', 'DESC')
  .limit(10)
  .build();

console.log(query.toString());
// 输出: SELECT id, name, email FROM users WHERE age > 18 AND status = "active" ORDER BY created_at DESC LIMIT 10
```

### 场景二：表单验证规则构建器

```typescript
interface ValidationRule {
  type: string;
  message: string;
  value?: any;
}

class FormField {
  public name: string = '';
  public label: string = '';
  public type: string = 'text';
  public rules: ValidationRule[] = [];
  public defaultValue: any = '';
}

class FormFieldBuilder {
  private field: FormField;

  constructor() {
    this.field = new FormField();
  }

  name(name: string): this {
    this.field.name = name;
    return this;
  }

  label(label: string): this {
    this.field.label = label;
    return this;
  }

  type(type: string): this {
    this.field.type = type;
    return this;
  }

  required(message: string = '该字段必填'): this {
    this.field.rules.push({ type: 'required', message });
    return this;
  }

  minLength(length: number, message?: string): this {
    this.field.rules.push({
      type: 'minLength',
      value: length,
      message: message || `至少${length}个字符`
    });
    return this;
  }

  email(message: string = '请输入有效的邮箱地址'): this {
    this.field.rules.push({ type: 'email', message });
    return this;
  }

  pattern(regex: RegExp, message: string): this {
    this.field.rules.push({ type: 'pattern', value: regex, message });
    return this;
  }

  defaultValue(value: any): this {
    this.field.defaultValue = value;
    return this;
  }

  build(): FormField {
    if (!this.field.name) {
      throw new Error('字段名不能为空');
    }
    return this.field;
  }
}

// 使用：构建表单字段
const emailField = new FormFieldBuilder()
  .name('email')
  .label('邮箱地址')
  .type('email')
  .required()
  .email()
  .build();

const passwordField = new FormFieldBuilder()
  .name('password')
  .label('密码')
  .type('password')
  .required()
  .minLength(8)
  .pattern(/[A-Z]/, '必须包含大写字母')
  .build();

console.log(emailField);
// {
//   name: 'email',
//   label: '邮箱地址',
//   type: 'email',
//   rules: [
//     { type: 'required', message: '该字段必填' },
//     { type: 'email', message: '请输入有效的邮箱地址' }
//   ],
//   defaultValue: ''
// }
```

### 场景三：通知构建器

```typescript
interface NotificationConfig {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  closable: boolean;
  onClose?: () => void;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

class Notification {
  constructor(public config: NotificationConfig) {}

  show(): void {
    console.log(`显示通知: ${this.config.title} - ${this.config.message}`);
    // 实际显示逻辑
  }
}

class NotificationBuilder {
  private config: Partial<NotificationConfig> = {
    type: 'info',
    duration: 3000,
    closable: true,
    position: 'top-right'
  };

  title(title: string): this {
    this.config.title = title;
    return this;
  }

  message(message: string): this {
    this.config.message = message;
    return this;
  }

  success(): this {
    this.config.type = 'success';
    return this;
  }

  error(): this {
    this.config.type = 'error';
    return this;
  }

  warning(): this {
    this.config.type = 'warning';
    return this;
  }

  info(): this {
    this.config.type = 'info';
    return this;
  }

  duration(ms: number): this {
    this.config.duration = ms;
    return this;
  }

  closable(closable: boolean = true): this {
    this.config.closable = closable;
    return this;
  }

  position(position: NotificationConfig['position']): this {
    this.config.position = position;
    return this;
  }

  onClose(callback: () => void): this {
    this.config.onClose = callback;
    return this;
  }

  build(): Notification {
    if (!this.config.title || !this.config.message) {
      throw new Error('标题和消息不能为空');
    }
    return new Notification(this.config as NotificationConfig);
  }
}

// 使用
const successNotification = new NotificationBuilder()
  .title('操作成功')
  .message('用户创建成功')
  .success()
  .duration(2000)
  .build();

successNotification.show();

const errorNotification = new NotificationBuilder()
  .title('操作失败')
  .message('网络连接超时')
  .error()
  .duration(5000)
  .closable(false)
  .position('bottom-right')
  .onClose(() => console.log('通知关闭'))
  .build();

errorNotification.show();
```

## 建造者模式的变体

### 变体一：Director（导演类）

当构建过程有多种标准配置时，可以用Director封装：

```typescript
class HttpRequestDirector {
  static createGetRequest(url: string): HttpRequest {
    return new HttpRequestBuilder()
      .setUrl(url)
      .setMethod('GET')
      .setTimeout(5000)
      .setCache(true)
      .build();
  }

  static createPostRequest(url: string, data: any): HttpRequest {
    return new HttpRequestBuilder()
      .setUrl(url)
      .setMethod('POST')
      .setHeaders({ 'Content-Type': 'application/json' })
      .setData(data)
      .setTimeout(10000)
      .setRetry(3)
      .build();
  }
}

// 使用：快速创建标准配置
const getRequest = HttpRequestDirector.createGetRequest('/api/users');
const postRequest = HttpRequestDirector.createPostRequest('/api/users', { name: 'Alice' });
```

### 变体二：Fluent Interface（流式接口）

TypeScript中常用的简化写法：

```typescript
class QueryBuilder {
  private _table: string = '';
  private _where: string[] = [];

  from(table: string): this {
    this._table = table;
    return this;
  }

  where(condition: string): this {
    this._where.push(condition);
    return this;
  }

  // 直接返回结果，无需build()
  toString(): string {
    return `SELECT * FROM ${this._table} WHERE ${this._where.join(' AND ')}`;
  }
}

const query = new QueryBuilder()
  .from('users')
  .where('age > 18')
  .toString(); // 直接获取结果
```

## 建造者 vs 构造函数

| 对比维度 | 构造函数 | 建造者模式 |
|---------|---------|-----------|
| 参数数量 | 适合≤3个参数 | 适合>3个参数 |
| 可读性 | 参数多时可读性差 | 链式调用可读性强 |
| 可选参数 | 需要传undefined占位 | 只设置需要的属性 |
| 验证逻辑 | 分散在构造函数 | 集中在build() |
| 复杂度 | 简单 | 需要额外的Builder类 |

## 总结

建造者模式的核心在于：**分步构建复杂对象，提供清晰的API。**

**关键原则**：
1. **链式调用**：每个方法返回this
2. **步骤清晰**：方法名说明参数含义
3. **灵活可选**：只设置需要的属性
4. **验证集中**：在build()统一验证

**使用场景**：
- ✅ 对象有很多属性（>3个）
- ✅ 大部分属性是可选的
- ✅ 需要复杂的构建逻辑（如SQL查询）
- ✅ 希望提供流式API
- ❌ 对象很简单（≤3个必填属性）
- ❌ 所有属性都是必填的

记住：**建造者模式不是为了炫技，而是为了解决"如何优雅地创建复杂对象"的问题。**
