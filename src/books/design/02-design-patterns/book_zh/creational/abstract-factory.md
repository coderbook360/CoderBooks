# 抽象工厂：产品族的创建策略

## 工厂方法的局限

首先要问一个问题：**如果我需要创建一组相关的对象，工厂方法够用吗？**

看看这个场景：你在开发一个跨平台UI库，需要同时创建Button、Checkbox、Input等组件，并且要保证它们风格一致：

```typescript
// ❌ 使用工厂方法的问题
const buttonFactory = new MacButtonFactory();
const checkboxFactory = new WindowsCheckboxFactory(); // 风格不一致！
const inputFactory = new MacInputFactory();

const button = buttonFactory.createButton();
const checkbox = checkboxFactory.createCheckbox(); // Mac按钮 + Windows复选框，样式混乱！
const input = inputFactory.createInput();
```

**问题**：
- **无法保证产品一致性**：可能混用不同风格的组件
- **客户端责任过重**：需要记住哪些工厂属于同一套风格
- **容易出错**：手动组合工厂容易搞错

**现在我要问第二个问题：如何保证创建的一组对象来自同一个产品族？**

答案是：**用一个工厂创建整个产品族，而不是每个产品一个工厂。**

## 抽象工厂模式

### 核心思想

**产品族**：一组相关的产品，它们必须一起使用才能保证一致性。
**产品等级**：同一类产品的不同实现（如MacButton、WindowsButton）。

```
产品族视角（横向）：
- Mac风格：MacButton + MacCheckbox + MacInput
- Windows风格：WindowsButton + WindowsCheckbox + WindowsInput

产品等级视角（纵向）：
- Button等级：MacButton、WindowsButton
- Checkbox等级：MacCheckbox、WindowsCheckbox
- Input等级：MacInput、WindowsInput
```

**抽象工厂的职责**：创建一整个产品族，保证风格一致。

### 完整实现

```typescript
// 1. 产品接口（产品等级）
interface Button {
  render(): void;
}

interface Checkbox {
  render(): void;
}

interface Input {
  render(): void;
}

// 2. 具体产品：Mac风格
class MacButton implements Button {
  render(): void {
    console.log('渲染Mac风格按钮');
  }
}

class MacCheckbox implements Checkbox {
  render(): void {
    console.log('渲染Mac风格复选框');
  }
}

class MacInput implements Input {
  render(): void {
    console.log('渲染Mac风格输入框');
  }
}

// 3. 具体产品：Windows风格
class WindowsButton implements Button {
  render(): void {
    console.log('渲染Windows风格按钮');
  }
}

class WindowsCheckbox implements Checkbox {
  render(): void {
    console.log('渲染Windows风格复选框');
  }
}

class WindowsInput implements Input {
  render(): void {
    console.log('渲染Windows风格输入框');
  }
}

// 4. 抽象工厂接口（核心）
interface UIFactory {
  createButton(): Button;
  createCheckbox(): Checkbox;
  createInput(): Input;
}

// 5. 具体工厂：Mac产品族
class MacUIFactory implements UIFactory {
  createButton(): Button {
    return new MacButton();
  }

  createCheckbox(): Checkbox {
    return new MacCheckbox();
  }

  createInput(): Input {
    return new MacInput();
  }
}

// 6. 具体工厂：Windows产品族
class WindowsUIFactory implements UIFactory {
  createButton(): Button {
    return new WindowsButton();
  }

  createCheckbox(): Checkbox {
    return new WindowsCheckbox();
  }

  createInput(): Input {
    return new WindowsInput();
  }
}

// 7. 客户端代码：只依赖抽象工厂
class Application {
  private button: Button;
  private checkbox: Checkbox;
  private input: Input;

  constructor(factory: UIFactory) {
    this.button = factory.createButton();
    this.checkbox = factory.createCheckbox();
    this.input = factory.createInput();
  }

  render(): void {
    this.button.render();
    this.checkbox.render();
    this.input.render();
  }
}

// 使用：根据平台选择工厂
function getUIFactory(): UIFactory {
  const platform = navigator.platform;
  
  if (platform.includes('Mac')) {
    return new MacUIFactory();
  } else {
    return new WindowsUIFactory();
  }
}

const factory = getUIFactory();
const app = new Application(factory);
app.render();
// 输出：
// 渲染Mac风格按钮
// 渲染Mac风格复选框
// 渲染Mac风格输入框
```

**关键点**：
- **产品族一致性**：一个工厂创建的所有产品风格统一
- **易于切换**：只需更换工厂，整个产品族全部切换
- **开闭原则**：新增产品族（如Linux风格）只需添加新工厂

## 前端常见场景

### 场景一：主题系统

```typescript
// 产品接口
interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
}

interface ThemeSpacing {
  small: string;
  medium: string;
  large: string;
}

interface ThemeFonts {
  body: string;
  heading: string;
}

// 抽象工厂
interface ThemeFactory {
  createColors(): ThemeColors;
  createSpacing(): ThemeSpacing;
  createFonts(): ThemeFonts;
}

// 浅色主题工厂
class LightThemeFactory implements ThemeFactory {
  createColors(): ThemeColors {
    return {
      primary: '#007bff',
      secondary: '#6c757d',
      background: '#ffffff'
    };
  }

  createSpacing(): ThemeSpacing {
    return {
      small: '8px',
      medium: '16px',
      large: '24px'
    };
  }

  createFonts(): ThemeFonts {
    return {
      body: '14px Arial',
      heading: '24px Arial Bold'
    };
  }
}

// 深色主题工厂
class DarkThemeFactory implements ThemeFactory {
  createColors(): ThemeColors {
    return {
      primary: '#0dcaf0',
      secondary: '#adb5bd',
      background: '#212529'
    };
  }

  createSpacing(): ThemeSpacing {
    return {
      small: '8px',
      medium: '16px',
      large: '24px'
    };
  }

  createFonts(): ThemeFonts {
    return {
      body: '14px Arial',
      heading: '24px Arial Bold'
    };
  }
}

// 使用
class ThemeManager {
  private colors: ThemeColors;
  private spacing: ThemeSpacing;
  private fonts: ThemeFonts;

  constructor(factory: ThemeFactory) {
    this.colors = factory.createColors();
    this.spacing = factory.createSpacing();
    this.fonts = factory.createFonts();
  }

  applyTheme(): void {
    document.body.style.backgroundColor = this.colors.background;
    document.body.style.color = this.colors.primary;
    document.body.style.fontSize = this.fonts.body;
  }
}

// 根据用户偏好切换主题
const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
const themeFactory = isDarkMode ? new DarkThemeFactory() : new LightThemeFactory();
const themeManager = new ThemeManager(themeFactory);
themeManager.applyTheme();
```

### 场景二：数据库适配器

```typescript
// 产品接口
interface Connection {
  connect(): void;
  disconnect(): void;
}

interface Query {
  select(table: string): string;
  insert(table: string, data: any): string;
}

interface Transaction {
  begin(): void;
  commit(): void;
  rollback(): void;
}

// 抽象工厂
interface DatabaseFactory {
  createConnection(): Connection;
  createQuery(): Query;
  createTransaction(): Transaction;
}

// MySQL工厂
class MySQLFactory implements DatabaseFactory {
  createConnection(): Connection {
    return {
      connect: () => console.log('MySQL连接建立'),
      disconnect: () => console.log('MySQL连接关闭')
    };
  }

  createQuery(): Query {
    return {
      select: (table) => `SELECT * FROM ${table}`,
      insert: (table, data) => `INSERT INTO ${table} VALUES (${JSON.stringify(data)})`
    };
  }

  createTransaction(): Transaction {
    return {
      begin: () => console.log('MySQL BEGIN'),
      commit: () => console.log('MySQL COMMIT'),
      rollback: () => console.log('MySQL ROLLBACK')
    };
  }
}

// PostgreSQL工厂
class PostgreSQLFactory implements DatabaseFactory {
  createConnection(): Connection {
    return {
      connect: () => console.log('PostgreSQL连接建立'),
      disconnect: () => console.log('PostgreSQL连接关闭')
    };
  }

  createQuery(): Query {
    return {
      select: (table) => `SELECT * FROM "${table}"`,
      insert: (table, data) => `INSERT INTO "${table}" VALUES (${JSON.stringify(data)})`
    };
  }

  createTransaction(): Transaction {
    return {
      begin: () => console.log('PostgreSQL BEGIN'),
      commit: () => console.log('PostgreSQL COMMIT'),
      rollback: () => console.log('PostgreSQL ROLLBACK')
    };
  }
}

// 数据库管理器
class DatabaseManager {
  private connection: Connection;
  private query: Query;
  private transaction: Transaction;

  constructor(factory: DatabaseFactory) {
    this.connection = factory.createConnection();
    this.query = factory.createQuery();
    this.transaction = factory.createTransaction();
  }

  executeQuery(table: string): void {
    this.connection.connect();
    this.transaction.begin();
    
    const sql = this.query.select(table);
    console.log(`执行SQL: ${sql}`);
    
    this.transaction.commit();
    this.connection.disconnect();
  }
}

// 使用：根据配置选择数据库
const dbType = process.env.DB_TYPE || 'mysql';
const dbFactory = dbType === 'mysql' ? new MySQLFactory() : new PostgreSQLFactory();
const dbManager = new DatabaseManager(dbFactory);
dbManager.executeQuery('users');
```

### 场景三：图表库适配器

```typescript
// 产品接口
interface Chart {
  render(data: any[]): void;
}

interface Legend {
  show(): void;
}

interface Tooltip {
  enable(): void;
}

// 抽象工厂
interface ChartFactory {
  createLineChart(): Chart;
  createBarChart(): Chart;
  createLegend(): Legend;
  createTooltip(): Tooltip;
}

// ECharts工厂
class EChartsFactory implements ChartFactory {
  createLineChart(): Chart {
    return {
      render: (data) => console.log('ECharts渲染折线图:', data)
    };
  }

  createBarChart(): Chart {
    return {
      render: (data) => console.log('ECharts渲染柱状图:', data)
    };
  }

  createLegend(): Legend {
    return {
      show: () => console.log('ECharts显示图例')
    };
  }

  createTooltip(): Tooltip {
    return {
      enable: () => console.log('ECharts启用提示框')
    };
  }
}

// Highcharts工厂
class HighchartsFactory implements ChartFactory {
  createLineChart(): Chart {
    return {
      render: (data) => console.log('Highcharts渲染折线图:', data)
    };
  }

  createBarChart(): Chart {
    return {
      render: (data) => console.log('Highcharts渲染柱状图:', data)
    };
  }

  createLegend(): Legend {
    return {
      show: () => console.log('Highcharts显示图例')
    };
  }

  createTooltip(): Tooltip {
    return {
      enable: () => console.log('Highcharts启用提示框')
    };
  }
}

// 图表应用
class ChartApplication {
  private lineChart: Chart;
  private legend: Legend;
  private tooltip: Tooltip;

  constructor(factory: ChartFactory) {
    this.lineChart = factory.createLineChart();
    this.legend = factory.createLegend();
    this.tooltip = factory.createTooltip();
  }

  display(data: any[]): void {
    this.lineChart.render(data);
    this.legend.show();
    this.tooltip.enable();
  }
}

// 使用：根据项目需求选择图表库
const chartLibrary = 'echarts'; // 配置项
const chartFactory = chartLibrary === 'echarts' 
  ? new EChartsFactory() 
  : new HighchartsFactory();

const app = new ChartApplication(chartFactory);
app.display([1, 2, 3, 4, 5]);
```

## 抽象工厂 vs 工厂方法

| 对比维度 | 工厂方法 | 抽象工厂 |
|---------|---------|---------|
| 创建对象数量 | 单个产品 | 一组相关产品（产品族） |
| 工厂方法数量 | 1个 | 多个（每个产品一个） |
| 关注点 | 产品等级（纵向扩展） | 产品族（横向扩展） |
| 适用场景 | 单一产品多种实现 | 多个相关产品需要一致性 |
| 新增产品 | 容易（加工厂和产品） | 困难（需修改所有工厂） |
| 新增产品族 | 不适用 | 容易（加新工厂） |

## 抽象工厂的局限性

### 问题：新增产品困难

```typescript
// 现有工厂
interface UIFactory {
  createButton(): Button;
  createCheckbox(): Checkbox;
}

// ❌ 需要新增Select组件，所有工厂都要修改
interface UIFactory {
  createButton(): Button;
  createCheckbox(): Checkbox;
  createSelect(): Select; // 新增方法
}

class MacUIFactory implements UIFactory {
  // 必须实现新方法
  createSelect(): Select {
    return new MacSelect();
  }
  // ...
}

class WindowsUIFactory implements UIFactory {
  // 必须实现新方法
  createSelect(): Select {
    return new WindowsSelect();
  }
  // ...
}
```

**问题**：违反开闭原则，新增产品需要修改所有工厂。

**解决方案**：
1. **提前规划**：设计时考虑好产品族的完整性
2. **分离职责**：按功能拆分多个小的抽象工厂
3. **使用原型模式**：通过克隆来创建新产品

## 总结

抽象工厂模式的核心在于：**创建一组相关产品，保证产品族一致性。**

**关键原则**：
1. **产品族一致性**：同一工厂创建的产品必须配套使用
2. **横向扩展容易**：新增产品族（如新增主题）只需添加新工厂
3. **纵向扩展困难**：新增产品（如新增组件类型）需修改所有工厂
4. **权衡取舍**：适合产品族稳定、需要频繁切换的场景

**使用场景**：
- ✅ 多个相关产品需要一起使用（主题、UI套件、数据库适配器）
- ✅ 产品族固定，但需要支持多种实现（Mac/Windows）
- ✅ 需要保证产品一致性
- ❌ 产品种类频繁变化（用工厂方法）
- ❌ 只有单一产品（用简单工厂或工厂方法）

记住：**抽象工厂解决的是"如何创建一组相关对象并保证一致性"，而不是"如何创建单个对象"。**
