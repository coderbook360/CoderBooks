# Jest 架构设计

> Jest 是 Facebook 开发的 JavaScript 测试框架，以零配置、快速执行和优秀的开发体验著称。理解其架构设计有助于更好地使用和扩展 Jest。

## Jest 整体架构

```
Jest 架构概览
├── @jest/core          # 核心协调器
├── jest-cli            # 命令行接口
├── jest-config         # 配置解析
├── jest-haste-map      # 文件系统缓存
├── jest-runner         # 测试运行器
├── jest-runtime        # 模块执行环境
├── jest-environment    # 测试环境（jsdom/node）
├── jest-transform      # 代码转换（Babel/TS）
├── expect              # 断言库
└── jest-mock           # Mock 系统
```

## 核心模块详解

### 1. 测试发现（Test Discovery）

```typescript
// jest-haste-map: 高效的文件系统缓存
interface HasteMap {
  // 存储文件元信息
  files: Map<string, FileMetadata>;
  
  // 模块映射
  map: Map<string, ModuleMap>;
  
  // 监听文件变化
  watch(onChange: (changes: FileChanges) => void): void;
}

// 工作原理
// 1. 首次运行：扫描所有文件，建立缓存
// 2. 后续运行：只处理变化的文件
// 3. 缓存存储在 node_modules/.cache/jest

// 测试文件匹配
const testMatch = [
  '**/__tests__/**/*.[jt]s?(x)',
  '**/?(*.)+(spec|test).[jt]s?(x)',
];
```

### 2. 测试运行器（Test Runner）

```typescript
// jest-runner: 并行执行测试
interface TestRunner {
  // 运行测试文件
  runTests(
    tests: Test[],
    watcher: TestWatcher,
    onStart: OnTestStart,
    onResult: OnTestSuccess,
    onFailure: OnTestFailure,
  ): Promise<void>;
}

// 并行策略
// 1. 创建 worker 池（默认 = CPU 核心数 - 1）
// 2. 将测试文件分配给 workers
// 3. 每个 worker 在独立进程中运行
// 4. 收集所有结果

// 配置
module.exports = {
  // 最大并行数
  maxWorkers: '50%',  // 或具体数字
  
  // 运行模式
  runInBand: false,   // true = 串行运行
};
```

### 3. 模块系统（Module System）

```typescript
// jest-runtime: 模拟 Node.js 模块系统
class Runtime {
  // 自定义 require
  requireModule(modulePath: string): unknown {
    // 1. 检查是否需要 mock
    if (this._shouldMock(modulePath)) {
      return this._requireMock(modulePath);
    }
    
    // 2. 检查缓存
    if (this._moduleCache.has(modulePath)) {
      return this._moduleCache.get(modulePath);
    }
    
    // 3. 转换代码（Babel/TS）
    const transformedCode = this._transform(modulePath);
    
    // 4. 执行模块
    const module = this._execModule(transformedCode);
    
    // 5. 缓存并返回
    this._moduleCache.set(modulePath, module);
    return module;
  }
}
```

### 4. Mock 系统

```typescript
// jest-mock: 强大的 Mock 功能

// 自动 Mock
jest.mock('./userService');  // 自动创建 mock

// 手动 Mock
jest.mock('./userService', () => ({
  getUser: jest.fn().mockResolvedValue({ id: 1, name: 'Test' }),
}));

// Mock 实现原理
class ModuleMocker {
  // 创建 mock 函数
  fn<T extends (...args: any[]) => any>(
    implementation?: T
  ): jest.MockedFunction<T> {
    const mock = {
      calls: [],        // 调用记录
      results: [],      // 返回值记录
      instances: [],    // new 调用的实例
    };
    
    function mockFn(...args: Parameters<T>): ReturnType<T> {
      mock.calls.push(args);
      // 执行实现并记录结果
      const result = implementation?.(...args);
      mock.results.push({ type: 'return', value: result });
      return result;
    }
    
    mockFn.mock = mock;
    return mockFn as jest.MockedFunction<T>;
  }
  
  // 自动生成 mock 对象
  generateFromMetadata(metadata: ModuleMetadata): MockedModule {
    // 递归为所有函数创建 mock
  }
}
```

### 5. 断言系统

```typescript
// expect: 链式断言 API

// 基础用法
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(array).toContain(item);

// 实现原理
function expect(actual: unknown): Matchers {
  return {
    toBe(expected: unknown) {
      if (!Object.is(actual, expected)) {
        throw new Error(
          `Expected ${actual} to be ${expected}`
        );
      }
    },
    
    toEqual(expected: unknown) {
      if (!deepEqual(actual, expected)) {
        throw new Error(
          `Expected ${format(actual)} to equal ${format(expected)}`
        );
      }
    },
    
    // 取反
    not: {
      toBe(expected: unknown) {
        if (Object.is(actual, expected)) {
          throw new Error(...);
        }
      },
    },
  };
}

// 自定义 matcher
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
    };
  },
});
```

## 测试生命周期

```
测试执行流程

1. 初始化
   ├── 解析配置
   ├── 建立文件系统缓存
   └── 发现测试文件

2. 测试调度
   ├── 创建 worker 池
   └── 分配测试文件

3. 测试执行（每个 worker）
   ├── 创建测试环境（jsdom/node）
   ├── 执行 setupFiles
   ├── 执行 beforeAll
   ├── 对于每个测试：
   │   ├── 执行 beforeEach
   │   ├── 执行测试
   │   ├── 执行 afterEach
   │   └── 收集结果
   └── 执行 afterAll

4. 结果收集
   ├── 聚合所有结果
   ├── 生成报告
   └── 更新缓存
```

## 性能优化机制

```typescript
// 1. 智能测试选择
module.exports = {
  // 只运行与变更相关的测试
  onlyChanged: true,
  
  // 基于 Git 变更
  changedSince: 'main',
};

// 2. 缓存转换结果
module.exports = {
  // 缓存目录
  cacheDirectory: '/tmp/jest_cache',
  
  // 转换缓存
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
  },
};

// 3. 失败优先
module.exports = {
  // 先运行上次失败的测试
  testSequencer: './failedFirstSequencer.js',
};
```

## 总结

Jest 架构特点：

1. **模块化设计**：各组件职责清晰，可独立使用
2. **并行执行**：多进程并行，充分利用多核 CPU
3. **智能缓存**：文件系统缓存 + 转换缓存
4. **隔离环境**：每个测试文件独立环境
5. **强大 Mock**：自动 Mock + 手动 Mock

Jest 设计理念：

- **零配置**：开箱即用
- **快速反馈**：只运行相关测试
- **开发友好**：清晰的错误信息和 Watch 模式