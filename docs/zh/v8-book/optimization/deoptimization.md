# 去优化（Deoptimization）：当优化失效时

TurboFan的激进优化基于类型假设和代码分析。当这些假设被违反时，V8必须"去优化"——放弃优化后的机器码，回退到解释执行。去优化是V8保证正确性的安全网，但频繁的去优化会严重影响性能。

本章将深入探讨去优化的触发条件、工作机制和避免方法。

## 什么是去优化

去优化是优化的逆过程：

```javascript
// 去优化概念
class DeoptimizationConcept {
  static demonstrate() {
    console.log('=== 去优化概念 ===\n');
    
    console.log('优化代码的生命周期：');
    console.log('');
    console.log('  1. 解释执行（Ignition）');
    console.log('     ↓ 收集类型反馈');
    console.log('  2. 编译优化（TurboFan）');
    console.log('     ↓ 生成优化代码');
    console.log('  3. 执行优化代码');
    console.log('     ↓ 假设被违反');
    console.log('  4. 去优化（Deoptimization）');
    console.log('     ↓ 回退到解释器');
    console.log('  5. 重新解释执行');
    console.log('');
    
    console.log('去优化的代价：');
    console.log('  • 丢弃优化编译的工作');
    console.log('  • 重建解释器栈帧');
    console.log('  • 可能需要重新优化');
    console.log('  • 性能波动\n');
  }
  
  static demonstrateExample() {
    console.log('=== 去优化示例 ===\n');
    
    console.log('代码示例：');
    console.log(`
    function add(a, b) {
      return a + b;
    }
    
    // 阶段1：使用整数调用，触发优化
    for (let i = 0; i < 10000; i++) {
      add(i, i);  // 优化为Smi加法
    }
    
    // 阶段2：传入不同类型，触发去优化
    add("hello", "world");  // 类型假设被违反！
    `);
    
    console.log('发生的事情：');
    console.log('  1. add被优化为Smi加法');
    console.log('  2. 传入字符串时，类型检查失败');
    console.log('  3. 触发去优化');
    console.log('  4. 回退到解释器执行字符串拼接');
    console.log('  5. 可能重新优化为多态版本\n');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateExample();
  }
}

DeoptimizationConcept.runAll();
```

## 去优化的触发条件

什么情况会触发去优化：

```javascript
// 去优化触发条件
class DeoptimizationTriggers {
  static demonstrateTypeChange() {
    console.log('=== 触发条件1：类型变化 ===\n');
    
    console.log('场景：操作数类型与预期不符');
    console.log(`
    function multiply(a, b) {
      return a * b;  // 优化为整数乘法
    }
    
    // 触发去优化的调用：
    multiply(1.5, 2);     // 浮点数
    multiply("2", 3);     // 字符串
    multiply(BigInt(2), BigInt(3)); // BigInt
    `);
    
    console.log('去优化原因：');
    console.log('  CheckSmi守卫失败\n');
  }
  
  static demonstrateMapChange() {
    console.log('=== 触发条件2：对象形状变化 ===\n');
    
    console.log('场景：对象的隐藏类与预期不符');
    console.log(`
    function getX(point) {
      return point.x;  // 优化为直接偏移访问
    }
    
    const p1 = { x: 1, y: 2 };
    const p2 = { x: 1, y: 2 };
    
    // 预热
    for (let i = 0; i < 10000; i++) {
      getX(p1);
    }
    
    // 修改对象形状，触发去优化
    p2.z = 3;  // 改变隐藏类
    getX(p2);  // Map检查失败，去优化
    `);
    
    console.log('去优化原因：');
    console.log('  CheckMap守卫失败\n');
  }
  
  static demonstrateBoundsViolation() {
    console.log('=== 触发条件3：数组边界违反 ===\n');
    
    console.log('场景：数组访问越界');
    console.log(`
    function getElement(arr, index) {
      return arr[index];  // 优化时假设index在范围内
    }
    
    const arr = [1, 2, 3, 4, 5];
    
    // 正常访问
    for (let i = 0; i < arr.length; i++) {
      getElement(arr, i);
    }
    
    // 越界访问，触发去优化
    getElement(arr, 100);  // 边界检查失败
    `);
    
    console.log('去优化原因：');
    console.log('  CheckBounds守卫失败\n');
  }
  
  static demonstratePrototypeChange() {
    console.log('=== 触发条件4：原型链变化 ===\n');
    
    console.log('场景：原型对象被修改');
    console.log(`
    function Animal() {}
    Animal.prototype.speak = function() {
      return 'sound';
    };
    
    function makeSound(animal) {
      return animal.speak();  // 优化为直接调用
    }
    
    const dog = new Animal();
    
    // 预热
    for (let i = 0; i < 10000; i++) {
      makeSound(dog);
    }
    
    // 修改原型，触发去优化
    Animal.prototype.speak = function() {
      return 'bark';
    };
    
    makeSound(dog);  // 原型检查失败，去优化
    `);
    
    console.log('去优化原因：');
    console.log('  原型链稳定性假设被违反\n');
  }
  
  static demonstrateGlobalChange() {
    console.log('=== 触发条件5：全局变量变化 ===\n');
    
    console.log('场景：优化代码依赖的全局变量被修改');
    console.log(`
    const CONFIG = { maxItems: 100 };
    
    function checkLimit(count) {
      return count < CONFIG.maxItems;  // 优化时可能内联
    }
    
    // 预热
    for (let i = 0; i < 10000; i++) {
      checkLimit(i);
    }
    
    // 修改全局配置
    CONFIG.maxItems = 50;  // 触发去优化
    `);
    
    console.log('去优化原因：');
    console.log('  常量假设被违反\n');
  }
  
  static runAll() {
    this.demonstrateTypeChange();
    this.demonstrateMapChange();
    this.demonstrateBoundsViolation();
    this.demonstratePrototypeChange();
    this.demonstrateGlobalChange();
  }
}

DeoptimizationTriggers.runAll();
```

## 去优化的工作机制

去优化是如何执行的：

```javascript
// 去优化机制
class DeoptimizationMechanism {
  static demonstrate() {
    console.log('=== 去优化执行过程 ===\n');
    
    console.log('步骤1：检测守卫失败');
    console.log('  优化代码中的类型检查失败');
    console.log('  例如：CheckSmi(a) 返回 false\n');
    
    console.log('步骤2：查找去优化信息');
    console.log('  每个检查点都关联去优化数据');
    console.log('  包含：字节码位置、寄存器映射、栈帧信息\n');
    
    console.log('步骤3：保存当前状态');
    console.log('  记录优化代码中的寄存器值');
    console.log('  记录栈上的值\n');
    
    console.log('步骤4：重建解释器帧');
    console.log('  根据映射信息创建解释器栈帧');
    console.log('  将寄存器值转换为解释器变量\n');
    
    console.log('步骤5：跳转到解释器');
    console.log('  从对应的字节码位置继续执行');
    console.log('  更新类型反馈信息\n');
  }
  
  static demonstrateFrameTranslation() {
    console.log('=== 栈帧转换示例 ===\n');
    
    console.log('优化代码栈帧：');
    console.log('  ┌─────────────────────┐');
    console.log('  │ rax = 42 (Smi)      │');
    console.log('  │ rbx = 0x1234 (obj)  │');
    console.log('  │ stack[0] = 100      │');
    console.log('  │ stack[1] = 200      │');
    console.log('  │ return addr         │');
    console.log('  └─────────────────────┘\n');
    
    console.log('去优化映射：');
    console.log('  rax → local[0]');
    console.log('  rbx → local[1]');
    console.log('  stack[0] → accumulator');
    console.log('  bytecode_offset = 42\n');
    
    console.log('解释器栈帧（重建后）：');
    console.log('  ┌─────────────────────┐');
    console.log('  │ bytecode_offset: 42 │');
    console.log('  │ local[0] = 42       │');
    console.log('  │ local[1] = 0x1234   │');
    console.log('  │ accumulator = 100   │');
    console.log('  │ return addr         │');
    console.log('  └─────────────────────┘\n');
  }
  
  static demonstrateDeoptKinds() {
    console.log('=== 去优化类型 ===\n');
    
    console.log('1. Eager Deoptimization（急切去优化）');
    console.log('   • 立即触发，当守卫检查失败时');
    console.log('   • 最常见的类型');
    console.log('   • 例如：类型检查失败\n');
    
    console.log('2. Lazy Deoptimization（惰性去优化）');
    console.log('   • 延迟触发，等到下次进入函数时');
    console.log('   • 用于代码补丁场景');
    console.log('   • 例如：原型链被修改\n');
    
    console.log('3. Soft Deoptimization（软去优化）');
    console.log('   • 不立即去优化，而是标记函数');
    console.log('   • 收集更多信息后重新优化');
    console.log('   • 例如：遇到新的类型反馈\n');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateFrameTranslation();
    this.demonstrateDeoptKinds();
  }
}

DeoptimizationMechanism.runAll();
```

## 检测去优化

如何发现代码中的去优化：

```javascript
// 检测去优化
class DetectingDeoptimization {
  static demonstrateV8Flags() {
    console.log('=== 使用V8标志检测 ===\n');
    
    console.log('Node.js命令：');
    console.log('  node --trace-deopt script.js\n');
    
    console.log('输出示例：');
    console.log(`
    [deoptimizing (DEOPT eager): begin 0x...]
    ;;; deoptimize at <script.js:10:5>, not a Smi
    [deoptimizing (DEOPT eager): end ...]
    `);
    
    console.log('关键信息：');
    console.log('  • 去优化类型（eager/lazy/soft）');
    console.log('  • 代码位置');
    console.log('  • 去优化原因\n');
    
    console.log('其他有用的标志：');
    console.log('  --trace-opt: 跟踪优化');
    console.log('  --trace-deopt-verbose: 详细去优化信息');
    console.log('  --print-opt-code: 打印优化代码\n');
  }
  
  static demonstrateDeoptReasons() {
    console.log('=== 常见去优化原因 ===\n');
    
    const reasons = [
      { reason: 'not a Smi', description: '期望小整数，收到其他类型' },
      { reason: 'wrong map', description: '对象形状与预期不符' },
      { reason: 'out of bounds', description: '数组访问越界' },
      { reason: 'division by zero', description: '除零' },
      { reason: 'lost precision', description: '整数溢出' },
      { reason: 'hole', description: '稀疏数组中的空洞' },
      { reason: 'minus zero', description: '负零（-0）' },
      { reason: 'wrong instance type', description: '实例类型不匹配' },
      { reason: 'unknown map', description: '未见过的隐藏类' }
    ];
    
    console.log('原因                    说明');
    console.log(''.padEnd(55, '-'));
    
    reasons.forEach(({ reason, description }) => {
      console.log(`${reason.padEnd(24)}${description}`);
    });
    console.log('');
  }
  
  static demonstrateProgrammaticDetection() {
    console.log('=== 编程检测方法 ===\n');
    
    console.log('使用V8内置函数（需要--allow-natives-syntax）：');
    console.log(`
    function test(a, b) {
      return a + b;
    }
    
    // 预热
    for (let i = 0; i < 10000; i++) {
      test(i, i);
    }
    
    // 检查优化状态
    // %OptimizeFunctionOnNextCall(test);
    // test(1, 2);
    
    // 获取优化状态
    // const status = %GetOptimizationStatus(test);
    // 
    // 状态位：
    // 1 << 0: 函数已优化
    // 1 << 1: 函数总是优化
    // 1 << 2: 从不优化
    // 1 << 3: 正在优化
    // 1 << 4: 优化后去优化过
    `);
  }
  
  static runAll() {
    this.demonstrateV8Flags();
    this.demonstrateDeoptReasons();
    this.demonstrateProgrammaticDetection();
  }
}

DetectingDeoptimization.runAll();
```

## 避免去优化

编写不容易触发去优化的代码：

```javascript
// 避免去优化
class AvoidingDeoptimization {
  static tip1_ConsistentTypes() {
    console.log('=== 策略1：保持类型一致 ===\n');
    
    console.log('❌ 容易去优化：');
    console.log(`
    function process(value) {
      return value * 2;
    }
    
    process(10);      // Smi
    process(3.14);    // HeapNumber - 去优化
    process("5");     // String - 去优化
    `);
    
    console.log('✅ 避免去优化：');
    console.log(`
    // 方法1：类型检查
    function processNumber(value) {
      if (typeof value !== 'number') {
        throw new TypeError('Expected number');
      }
      return value * 2;
    }
    
    // 方法2：分开处理
    function processInt(value) { return value * 2; }
    function processFloat(value) { return value * 2; }
    `);
  }
  
  static tip2_StableShapes() {
    console.log('=== 策略2：保持对象形状稳定 ===\n');
    
    console.log('❌ 容易去优化：');
    console.log(`
    function createUser(data) {
      const user = {};
      user.name = data.name;
      if (data.email) user.email = data.email;  // 条件属性
      if (data.phone) user.phone = data.phone;
      return user;
    }
    `);
    
    console.log('✅ 避免去优化：');
    console.log(`
    function createUser(data) {
      return {
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null
      };
    }
    
    // 或使用类
    class User {
      constructor(data) {
        this.name = data.name;
        this.email = data.email ?? null;
        this.phone = data.phone ?? null;
      }
    }
    `);
  }
  
  static tip3_AvoidModifyingPrototypes() {
    console.log('=== 策略3：避免修改原型 ===\n');
    
    console.log('❌ 容易去优化：');
    console.log(`
    function Animal() {}
    Animal.prototype.speak = function() { return 'sound'; };
    
    const animals = [];
    for (let i = 0; i < 1000; i++) {
      animals.push(new Animal());
    }
    
    // 稍后修改原型
    Animal.prototype.speak = function() { return 'new sound'; };
    // 所有依赖speak的优化代码都会去优化
    `);
    
    console.log('✅ 避免去优化：');
    console.log(`
    // 方法1：一次性定义完整的原型
    function Animal(sound) {
      this.sound = sound;
    }
    Animal.prototype.speak = function() {
      return this.sound;
    };
    
    // 方法2：使用组合而非继承
    function createAnimal(sound) {
      return {
        speak: () => sound
      };
    }
    `);
  }
  
  static tip4_SafeArrayOperations() {
    console.log('=== 策略4：安全的数组操作 ===\n');
    
    console.log('❌ 容易去优化：');
    console.log(`
    function process(arr) {
      // 可能越界
      return arr[arr.length];  // 越界访问
    }
    
    function fillArray(arr) {
      for (let i = 0; i <= arr.length; i++) {  // 注意 <=
        arr[i] = i;  // 最后一次越界
      }
    }
    `);
    
    console.log('✅ 避免去优化：');
    console.log(`
    function process(arr) {
      if (arr.length === 0) return undefined;
      return arr[arr.length - 1];  // 正确的最后元素访问
    }
    
    function fillArray(arr) {
      for (let i = 0; i < arr.length; i++) {  // 正确的边界
        arr[i] = i;
      }
    }
    `);
  }
  
  static tip5_AvoidHiddenClassTransitions() {
    console.log('=== 策略5：避免隐藏类转换 ===\n');
    
    console.log('❌ 容易去优化：');
    console.log(`
    const obj = { a: 1 };
    obj.b = 2;  // 隐藏类转换
    obj.c = 3;  // 又一次转换
    delete obj.b;  // 可能变成字典模式
    `);
    
    console.log('✅ 避免去优化：');
    console.log(`
    // 在构造时定义所有属性
    const obj = { a: 1, b: 2, c: 3 };
    
    // 使用类确保一致的形状
    class Point {
      constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
    }
    
    // 不使用delete，设置为null
    obj.b = null;  // 保持形状
    `);
  }
  
  static runAll() {
    this.tip1_ConsistentTypes();
    this.tip2_StableShapes();
    this.tip3_AvoidModifyingPrototypes();
    this.tip4_SafeArrayOperations();
    this.tip5_AvoidHiddenClassTransitions();
  }
}

AvoidingDeoptimization.runAll();
```

## 去优化后的重新优化

去优化不是终点：

```javascript
// 重新优化
class ReoptimizationAfterDeopt {
  static demonstrate() {
    console.log('=== 去优化后的重新优化 ===\n');
    
    console.log('去优化后的可能路径：');
    console.log('');
    console.log('  1. 单次去优化');
    console.log('     去优化 → 解释执行 → 收集新反馈 → 重新优化');
    console.log('     结果：新的优化代码适应更多类型');
    console.log('');
    console.log('  2. 重复去优化');
    console.log('     去优化 → 重新优化 → 再次去优化 → ...');
    console.log('     结果：可能被标记为"不优化"');
    console.log('');
    console.log('  3. 永久放弃优化');
    console.log('     多次去优化后，V8可能放弃优化该函数');
    console.log('     使用解释执行\n');
  }
  
  static demonstrateReoptimizationExample() {
    console.log('=== 重新优化示例 ===\n');
    
    console.log('场景：函数遇到新类型后重新优化');
    console.log(`
    function add(a, b) {
      return a + b;
    }
    
    // 阶段1：整数调用
    for (let i = 0; i < 10000; i++) {
      add(i, i);
    }
    // 优化为：Smi加法
    
    // 阶段2：遇到浮点数
    add(1.5, 2.5);  // 去优化
    
    // 阶段3：混合类型调用
    for (let i = 0; i < 10000; i++) {
      add(i, i);
      add(i + 0.5, i + 0.5);
    }
    // 重新优化为：Number加法（处理Smi和HeapNumber）
    `);
    
    console.log('新的优化代码：');
    console.log('  • 可以处理Smi和HeapNumber');
    console.log('  • 性能略低于纯Smi版本');
    console.log('  • 但不会再因为浮点数去优化\n');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateReoptimizationExample();
  }
}

ReoptimizationAfterDeopt.runAll();
```

## 本章小结

本章深入探讨了V8的去优化机制。我们学习了以下核心内容：

1. **去优化概念**：放弃优化代码，回退到解释执行的过程。

2. **触发条件**：类型变化、对象形状变化、数组越界、原型链变化、全局变量修改。

3. **工作机制**：检测守卫失败 → 查找去优化信息 → 重建解释器帧 → 跳转执行。

4. **去优化类型**：急切去优化、惰性去优化、软去优化。

5. **检测方法**：使用--trace-deopt标志，查看去优化原因和位置。

6. **避免策略**：保持类型一致、稳定对象形状、不修改原型、安全数组操作。

7. **重新优化**：去优化后可能重新优化，但多次去优化可能导致放弃优化。

理解去优化机制，能够帮助你写出稳定高效的代码，避免性能波动。在下一章中，我们将探讨内联函数优化。
