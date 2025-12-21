# 单态、多态与超态：对象形状的影响

上一章我们了解了内联缓存的基本原理，本章将深入探讨IC的三种状态：单态（Monomorphic）、多态（Polymorphic）和超态（Megamorphic）。这三种状态直接决定了属性访问的性能，理解它们是优化JavaScript代码的关键。

## IC状态详解

三种状态代表了不同的缓存策略：

```javascript
// IC状态详解
class ICStatesExplained {
  static demonstrateMonomorphic() {
    console.log('=== 单态（Monomorphic）===\n');
    
    console.log('定义：IC只见过一种对象形状\n');
    
    console.log('特点：');
    console.log('  • 最快的访问速度');
    console.log('  • 直接使用缓存的偏移量');
    console.log('  • 可以被TurboFan内联优化\n');
    
    // 示例
    function Point(x, y) {
      this.x = x;
      this.y = y;
    }
    
    function getX(point) {
      return point.x;  // 单态IC
    }
    
    const p1 = new Point(1, 2);
    const p2 = new Point(3, 4);
    const p3 = new Point(5, 6);
    
    console.log('示例代码：');
    console.log('  所有Point实例共享相同形状');
    console.log(`  getX(p1) = ${getX(p1)}`);
    console.log(`  getX(p2) = ${getX(p2)}`);
    console.log(`  getX(p3) = ${getX(p3)}`);
    console.log('  IC状态: monomorphic\n');
  }
  
  static demonstratePolymorphic() {
    console.log('=== 多态（Polymorphic）===\n');
    
    console.log('定义：IC见过2-4种对象形状\n');
    
    console.log('特点：');
    console.log('  • 中等访问速度');
    console.log('  • 需要检查多个缓存条目');
    console.log('  • 仍可使用缓存，但需要分支\n');
    
    // 示例
    function getX(obj) {
      return obj.x;  // 多态IC
    }
    
    const point2D = { x: 1, y: 2 };
    const point3D = { x: 1, y: 2, z: 3 };
    const colorPoint = { color: 'red', x: 1, y: 2 };
    
    console.log('示例代码：');
    console.log('  见到3种不同形状');
    console.log(`  getX({ x, y }) = ${getX(point2D)}`);
    console.log(`  getX({ x, y, z }) = ${getX(point3D)}`);
    console.log(`  getX({ color, x, y }) = ${getX(colorPoint)}`);
    console.log('  IC状态: polymorphic (3种形状)\n');
  }
  
  static demonstrateMegamorphic() {
    console.log('=== 超态（Megamorphic）===\n');
    
    console.log('定义：IC见过超过4种对象形状\n');
    
    console.log('特点：');
    console.log('  • 最慢的访问速度');
    console.log('  • 放弃缓存，使用通用查找');
    console.log('  • 无法被有效优化\n');
    
    // 示例
    function getX(obj) {
      return obj.x;  // 超态IC
    }
    
    // 创建大量不同形状
    const shapes = [];
    for (let i = 0; i < 10; i++) {
      const obj = { x: i };
      obj[`prop${i}`] = i;  // 每个对象独特的属性
      shapes.push(obj);
    }
    
    console.log('示例代码：');
    console.log('  见到10种不同形状');
    shapes.slice(0, 5).forEach((obj, i) => {
      console.log(`  getX(shape${i}) = ${getX(obj)}`);
    });
    console.log('  ...');
    console.log('  IC状态: megamorphic\n');
  }
  
  static runAll() {
    this.demonstrateMonomorphic();
    this.demonstratePolymorphic();
    this.demonstrateMegamorphic();
  }
}

ICStatesExplained.runAll();
```

## 状态转换机制

IC状态如何转换：

```javascript
// IC状态转换模拟器
class ICStateTransitionSimulator {
  constructor() {
    this.state = 'uninitialized';
    this.shapes = new Set();
    this.transitionHistory = [];
  }
  
  // 模拟属性访问
  access(shape) {
    const previousState = this.state;
    let transition = null;
    
    if (this.state === 'uninitialized') {
      this.shapes.add(shape);
      this.state = 'monomorphic';
      transition = 'uninitialized → monomorphic';
    } else if (this.state === 'monomorphic') {
      if (!this.shapes.has(shape)) {
        this.shapes.add(shape);
        this.state = 'polymorphic';
        transition = 'monomorphic → polymorphic';
      }
    } else if (this.state === 'polymorphic') {
      if (!this.shapes.has(shape)) {
        this.shapes.add(shape);
        if (this.shapes.size > 4) {
          this.state = 'megamorphic';
          transition = 'polymorphic → megamorphic';
        }
      }
    }
    
    if (transition) {
      this.transitionHistory.push({
        shape,
        transition,
        shapeCount: this.shapes.size
      });
    }
    
    return {
      state: this.state,
      shapeCount: this.shapes.size,
      transition
    };
  }
  
  // 打印转换历史
  printHistory() {
    console.log('\n状态转换历史：');
    this.transitionHistory.forEach((record, i) => {
      console.log(`  ${i + 1}. ${record.transition}`);
      console.log(`     触发形状: ${record.shape}`);
      console.log(`     形状总数: ${record.shapeCount}`);
    });
  }
  
  // 演示
  static demonstrate() {
    console.log('=== IC状态转换过程 ===\n');
    
    const ic = new ICStateTransitionSimulator();
    
    // 模拟一系列访问
    const accesses = [
      { x: 1, y: 2 },                     // 形状1
      { x: 3, y: 4 },                     // 形状1（重复）
      { x: 1, y: 2, z: 3 },               // 形状2
      { a: 0, x: 1, y: 2 },               // 形状3
      { x: 1 },                           // 形状4
      { x: 1, y: 2, z: 3, w: 4 },         // 形状5（触发超态）
    ];
    
    console.log('访问  形状                        状态            形状数');
    console.log(''.padEnd(70, '-'));
    
    accesses.forEach((obj, i) => {
      const shape = Object.keys(obj).join(',');
      const result = ic.access(shape);
      
      console.log(
        `${(i + 1).toString().padStart(3)}   ` +
        `{${shape.padEnd(20)}}   ` +
        `${result.state.padEnd(14)}  ` +
        `${result.shapeCount}`
      );
    });
    
    ic.printHistory();
  }
}

ICStateTransitionSimulator.demonstrate();
```

## 多态IC的内部结构

多态IC如何存储多个形状：

```javascript
// 多态IC内部结构
class PolymorphicICStructure {
  static demonstrate() {
    console.log('=== 多态IC内部结构 ===\n');
    
    // 模拟多态IC的缓存结构
    const polymorphicIC = {
      type: 'LoadIC',
      property: 'x',
      state: 'polymorphic',
      
      // 多个缓存条目
      entries: [
        {
          map: 'Map@0x1234',      // Point2D的隐藏类
          handler: { type: 'field', offset: 0 }
        },
        {
          map: 'Map@0x5678',      // Point3D的隐藏类
          handler: { type: 'field', offset: 0 }
        },
        {
          map: 'Map@0x9ABC',      // ColorPoint的隐藏类
          handler: { type: 'field', offset: 8 }  // x在color之后
        }
      ]
    };
    
    console.log('多态IC结构：');
    console.log(`  属性: ${polymorphicIC.property}`);
    console.log(`  状态: ${polymorphicIC.state}`);
    console.log(`  条目数: ${polymorphicIC.entries.length}\n`);
    
    console.log('缓存条目：');
    polymorphicIC.entries.forEach((entry, i) => {
      console.log(`  [${i}] Map: ${entry.map}`);
      console.log(`      偏移: ${entry.handler.offset}`);
    });
    
    console.log('\n查找过程（伪代码）：');
    console.log(`
    function loadX(obj) {
      const map = obj.map;
      
      // 线性搜索缓存条目
      if (map === 'Map@0x1234') return *(obj + 0);
      if (map === 'Map@0x5678') return *(obj + 0);
      if (map === 'Map@0x9ABC') return *(obj + 8);
      
      // 未命中，执行完整查找
      return slowLookup(obj, 'x');
    }
    `);
  }
  
  static demonstratePolymorphicDispatch() {
    console.log('\n=== 多态分发性能 ===\n');
    
    console.log('不同条目数的性能影响：');
    console.log('');
    console.log('  条目数  检查次数(平均)  相对性能');
    console.log('  '.padEnd(45, '-'));
    console.log('  1       1.0            100%  (单态)');
    console.log('  2       1.5            ~85%');
    console.log('  3       2.0            ~70%');
    console.log('  4       2.5            ~60%');
    console.log('  5+      N/A            ~30%  (超态，放弃缓存)');
    console.log('');
    
    console.log('说明：');
    console.log('  • 多态IC使用线性搜索');
    console.log('  • 条目越多，平均检查次数越多');
    console.log('  • 超过4个条目后转为超态\n');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstratePolymorphicDispatch();
  }
}

PolymorphicICStructure.runAll();
```

## 性能基准测试

量化三种状态的性能差异：

```javascript
// IC状态性能基准测试
class ICStateBenchmark {
  // 创建指定形状数量的对象数组
  static createObjects(shapeCount, objectCount) {
    const objects = [];
    
    for (let i = 0; i < objectCount; i++) {
      const obj = { x: i };
      
      // 根据形状数量分配不同属性
      const shapeIndex = i % shapeCount;
      for (let j = 0; j < shapeIndex; j++) {
        obj[`prop${j}`] = j;
      }
      
      objects.push(obj);
    }
    
    return objects;
  }
  
  // 执行基准测试
  static runBenchmark(objects, label) {
    // 预热
    let sum = 0;
    for (const obj of objects) {
      sum += obj.x;
    }
    
    // 正式测试
    const iterations = 1000;
    const start = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      sum = 0;
      for (const obj of objects) {
        sum += obj.x;
      }
    }
    
    const end = performance.now();
    const time = end - start;
    
    return { label, time, sum };
  }
  
  static run() {
    console.log('=== IC状态性能基准测试 ===\n');
    
    const objectCount = 10000;
    
    // 创建不同形状数量的对象
    const mono = this.createObjects(1, objectCount);    // 单态
    const poly2 = this.createObjects(2, objectCount);   // 2态
    const poly4 = this.createObjects(4, objectCount);   // 4态
    const mega = this.createObjects(20, objectCount);   // 超态
    
    console.log(`对象数量: ${objectCount}`);
    console.log(`迭代次数: 1000\n`);
    
    // 运行测试
    const results = [
      this.runBenchmark(mono, '单态 (1种形状)'),
      this.runBenchmark(poly2, '多态 (2种形状)'),
      this.runBenchmark(poly4, '多态 (4种形状)'),
      this.runBenchmark(mega, '超态 (20种形状)')
    ];
    
    // 计算相对性能
    const baseTime = results[0].time;
    
    console.log('结果：\n');
    console.log('状态              耗时(ms)    相对性能');
    console.log(''.padEnd(50, '-'));
    
    results.forEach(result => {
      const relative = (baseTime / result.time * 100).toFixed(1);
      console.log(
        `${result.label.padEnd(18)} ` +
        `${result.time.toFixed(2).padStart(8)}    ` +
        `${relative}%`
      );
    });
    
    console.log('\n结论：');
    console.log('  • 单态访问最快，是优化的目标');
    console.log('  • 多态性能随形状数量下降');
    console.log('  • 超态性能显著下降，应避免\n');
  }
}

ICStateBenchmark.run();
```

## 实际场景分析

常见代码模式的IC状态：

```javascript
// 实际场景分析
class RealWorldScenarios {
  static scenario1_HomogeneousArrays() {
    console.log('=== 场景1：同构数组处理 ===\n');
    
    console.log('✅ 好的模式（单态）：');
    console.log(`
    class User {
      constructor(name, age) {
        this.name = name;
        this.age = age;
      }
    }
    
    const users = [
      new User('Alice', 25),
      new User('Bob', 30),
      new User('Charlie', 35)
    ];
    
    function getNames(users) {
      return users.map(u => u.name);  // 单态IC
    }
    `);
    
    console.log('原因：所有User实例共享相同形状\n');
  }
  
  static scenario2_HeterogeneousArrays() {
    console.log('=== 场景2：异构数组处理 ===\n');
    
    console.log('❌ 不好的模式（多态/超态）：');
    console.log(`
    const items = [
      { type: 'user', name: 'Alice' },
      { type: 'product', name: 'Phone', price: 999 },
      { type: 'order', name: 'Order#1', items: [] }
    ];
    
    function getNames(items) {
      return items.map(item => item.name);  // 多态IC
    }
    `);
    
    console.log('✅ 改进方案：');
    console.log(`
    // 方案1：使用基类
    class NamedItem {
      constructor(name) {
        this.name = name;
      }
    }
    
    class User extends NamedItem { ... }
    class Product extends NamedItem { ... }
    
    // 方案2：分开处理
    const users = items.filter(i => i.type === 'user');
    const products = items.filter(i => i.type === 'product');
    `);
  }
  
  static scenario3_APIResponses() {
    console.log('=== 场景3：处理API响应 ===\n');
    
    console.log('常见问题：');
    console.log('  • API返回的对象形状可能不一致');
    console.log('  • 可选字段导致不同形状');
    console.log('  • 不同版本的API返回不同结构\n');
    
    console.log('❌ 不好的模式：');
    console.log(`
    // API响应的形状不一致
    const responses = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
      { id: 3, name: 'Charlie', phone: '123456' }
    ];
    `);
    
    console.log('✅ 改进方案：');
    console.log(`
    // 规范化响应
    function normalizeUser(data) {
      return {
        id: data.id,
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null
      };
    }
    
    const users = responses.map(normalizeUser);
    `);
  }
  
  static scenario4_ConfigObjects() {
    console.log('=== 场景4：配置对象 ===\n');
    
    console.log('❌ 不好的模式：');
    console.log(`
    function processConfig(config) {
      const name = config.name;  // 超态IC（配置对象形状各异）
      // ...
    }
    
    processConfig({ name: 'app1' });
    processConfig({ name: 'app2', debug: true });
    processConfig({ name: 'app3', port: 8080 });
    `);
    
    console.log('✅ 改进方案：');
    console.log(`
    // 使用默认值确保形状一致
    function createConfig(options) {
      return {
        name: options.name ?? 'default',
        debug: options.debug ?? false,
        port: options.port ?? 3000,
        timeout: options.timeout ?? 5000
      };
    }
    
    function processConfig(config) {
      const normalized = createConfig(config);
      const name = normalized.name;  // 单态IC
    }
    `);
  }
  
  static runAll() {
    this.scenario1_HomogeneousArrays();
    this.scenario2_HeterogeneousArrays();
    this.scenario3_APIResponses();
    this.scenario4_ConfigObjects();
  }
}

RealWorldScenarios.runAll();
```

## 检测IC状态

如何检测代码中的IC状态：

```javascript
// IC状态检测
class ICStateDetection {
  static demonstrateV8Flags() {
    console.log('=== 使用V8标志检测IC状态 ===\n');
    
    console.log('Node.js命令行：');
    console.log('  node --trace-ic script.js\n');
    
    console.log('输出示例：');
    console.log(`
    [LoadIC]: 1->2 at getX (script.js:10:10)
              map=0x1234 -> map=0x5678
              {x:Smi} -> {x:Smi,y:Smi}
    `);
    
    console.log('解读：');
    console.log('  • 1->2: 从单态转为2态多态');
    console.log('  • 显示了触发位置和形状变化\n');
  }
  
  static demonstrateDevTools() {
    console.log('=== 使用Chrome DevTools ===\n');
    
    console.log('步骤：');
    console.log('  1. 打开DevTools -> Performance面板');
    console.log('  2. 勾选"Enable advanced paint instrumentation"');
    console.log('  3. 录制性能分析');
    console.log('  4. 查看Main线程中的"IC"事件\n');
    
    console.log('关注点：');
    console.log('  • IC Miss事件（缓存未命中）');
    console.log('  • 频繁的状态转换');
    console.log('  • 超态函数的调用\n');
  }
  
  static demonstrateProgrammaticDetection() {
    console.log('=== 编程检测方法 ===\n');
    
    console.log('使用%GetOptimizationStatus（需要--allow-natives-syntax）：');
    console.log(`
    function getX(obj) {
      return obj.x;
    }
    
    // 预热
    for (let i = 0; i < 10000; i++) {
      getX({ x: i, y: i });
    }
    
    // 检查优化状态
    // %OptimizeFunctionOnNextCall(getX);
    // console.log(%GetOptimizationStatus(getX));
    `);
    
    console.log('状态码解读：');
    console.log('  • 1: 函数已优化');
    console.log('  • 2: 函数未优化');
    console.log('  • 3: 函数总是优化');
    console.log('  • 4: 函数从不优化');
    console.log('  • 6: 函数正在优化中\n');
  }
  
  static runAll() {
    this.demonstrateV8Flags();
    this.demonstrateDevTools();
    this.demonstrateProgrammaticDetection();
  }
}

ICStateDetection.runAll();
```

## 最佳实践总结

```javascript
// IC状态优化最佳实践
class ICOptimizationBestPractices {
  static summary() {
    console.log('=== IC状态优化最佳实践 ===\n');
    
    console.log('1. 保持对象形状一致');
    console.log('   • 使用class或构造函数创建对象');
    console.log('   • 所有属性在构造时初始化');
    console.log('   • 属性添加顺序一致\n');
    
    console.log('2. 避免动态属性');
    console.log('   • 不要在运行时添加新属性');
    console.log('   • 不要使用delete删除属性');
    console.log('   • 使用Map存储动态键值对\n');
    
    console.log('3. 处理异构数据');
    console.log('   • 规范化API响应');
    console.log('   • 分组处理不同类型');
    console.log('   • 使用默认值确保形状一致\n');
    
    console.log('4. 热点函数优化');
    console.log('   • 识别频繁调用的函数');
    console.log('   • 确保参数形状一致');
    console.log('   • 避免传入不同形状的对象\n');
    
    console.log('5. 监控和检测');
    console.log('   • 使用--trace-ic检测状态转换');
    console.log('   • 关注性能面板中的IC事件');
    console.log('   • 定期审查热点代码路径\n');
  }
  
  // 代码示例对比
  static codeComparison() {
    console.log('=== 代码对比示例 ===\n');
    
    console.log('❌ 会导致多态/超态的代码：');
    console.log(`
    // 不同形状的对象
    const data = [
      { name: 'a' },
      { name: 'b', value: 1 },
      { name: 'c', value: 2, extra: true }
    ];
    
    // 动态属性
    function addProp(obj, key, value) {
      obj[key] = value;  // 改变形状
    }
    
    // 条件属性
    function createUser(name, email) {
      const user = { name };
      if (email) user.email = email;  // 不同形状
      return user;
    }
    `);
    
    console.log('✅ 保持单态的代码：');
    console.log(`
    // 统一形状
    class Item {
      constructor(name, value = null, extra = false) {
        this.name = name;
        this.value = value;
        this.extra = extra;
      }
    }
    
    const data = [
      new Item('a'),
      new Item('b', 1),
      new Item('c', 2, true)
    ];
    
    // 始终初始化所有属性
    function createUser(name, email = null) {
      return { name, email };  // 形状一致
    }
    `);
  }
}

ICOptimizationBestPractices.summary();
ICOptimizationBestPractices.codeComparison();
```

## 本章小结

本章深入探讨了IC的三种状态及其对性能的影响。我们学习了以下核心内容：

1. **单态（Monomorphic）**：只见一种形状，最快，可被深度优化。

2. **多态（Polymorphic）**：见2-4种形状，中等速度，使用线性搜索缓存。

3. **超态（Megamorphic）**：超过4种形状，最慢，放弃缓存使用通用查找。

4. **状态转换**：uninitialized → monomorphic → polymorphic → megamorphic，单向不可逆。

5. **性能差异**：单态最快，超态可能比单态慢3-5倍。

6. **检测方法**：使用--trace-ic标志、DevTools Performance面板。

7. **最佳实践**：保持形状一致、避免动态属性、规范化数据、监控热点函数。

理解IC状态，能够帮助你识别和优化性能瓶颈。在下一章中，我们将探讨TurboFan编译器的激进优化策略。
