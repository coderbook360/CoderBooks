# 内存对齐与填充：对象布局优化

为什么同样的数据，在内存中占用的空间可能不同？为什么V8要在对象之间插入一些"无用"的字节？这些看似浪费的填充字节，实际上是性能优化的关键。

内存对齐是现代计算机架构的基本要求，V8必须遵循这些规则来确保高效的内存访问。本章将深入探讨V8如何进行内存对齐和填充，以及这些优化如何影响性能。

## 为什么需要内存对齐

CPU访问内存时，按照特定的对齐边界读取效率最高：

```javascript
// 模拟内存对齐的影响
class MemoryAlignment {
  static demonstrate() {
    // 场景1：未对齐访问
    const unaligned = {
      address: 0x1001,  // 奇数地址
      size: 8,
      reads: 2  // 需要两次内存读取
    };
    
    // 场景2：对齐访问
    const aligned = {
      address: 0x1000,  // 8字节对齐
      size: 8,
      reads: 1  // 只需一次内存读取
    };
    
    console.log('未对齐访问：');
    console.log(`  地址: 0x${unaligned.address.toString(16)}`);
    console.log(`  大小: ${unaligned.size} 字节`);
    console.log(`  内存读取次数: ${unaligned.reads}`);
    console.log(`  性能: 慢\n`);
    
    console.log('对齐访问：');
    console.log(`  地址: 0x${aligned.address.toString(16)}`);
    console.log(`  大小: ${aligned.size} 字节`);
    console.log(`  内存读取次数: ${aligned.reads}`);
    console.log(`  性能: 快`);
  }
}

MemoryAlignment.demonstrate();
```

## V8的对齐规则

V8使用Tagged Pointer，要求所有对象按指针大小对齐：

```javascript
// V8的对齐规则
class V8AlignmentRules {
  constructor() {
    // 指针大小（32位：4字节，64位：8字节）
    this.pointerSize = 8;  // 64位系统
    
    // 对齐要求
    this.alignment = this.pointerSize;
  }
  
  // 计算对齐后的大小
  alignSize(size) {
    // 向上对齐到最近的alignment倍数
    return Math.ceil(size / this.alignment) * this.alignment;
  }
  
  // 计算填充字节数
  calculatePadding(size) {
    const alignedSize = this.alignSize(size);
    return alignedSize - size;
  }
  
  // 演示对齐计算
  demonstrate() {
    const sizes = [1, 5, 8, 13, 16, 21];
    
    console.log('=== V8 对齐规则（64位系统）===\n');
    console.log('原始大小 -> 对齐后大小 (填充字节)');
    console.log(''.padEnd(40, '-'));
    
    for (const size of sizes) {
      const aligned = this.alignSize(size);
      const padding = this.calculatePadding(size);
      
      console.log(`${size.toString().padStart(3)} 字节 -> ${aligned.toString().padStart(3)} 字节 (+${padding} padding)`);
    }
  }
}

const alignment = new V8AlignmentRules();
alignment.demonstrate();
```

## 对象的内存布局

V8对象在内存中的实际布局：

```javascript
// 模拟V8对象的内存布局
class V8ObjectLayout {
  constructor() {
    this.pointerSize = 8;
  }
  
  // 分析对象布局
  analyzeLayout(obj) {
    const layout = {
      // 对象头（Map指针）
      header: {
        offset: 0,
        size: this.pointerSize,
        description: 'Map pointer (隐藏类)'
      },
      
      // 属性存储
      properties: [],
      
      // 元素存储（数组元素）
      elements: null,
      
      // 总大小
      totalSize: this.pointerSize
    };
    
    // 计算内联属性
    const inlineProperties = Object.keys(obj).slice(0, 3);  // 假设前3个属性内联
    let currentOffset = this.pointerSize;
    
    for (const prop of inlineProperties) {
      const value = obj[prop];
      const propLayout = this.getPropertyLayout(prop, value, currentOffset);
      
      layout.properties.push(propLayout);
      currentOffset = propLayout.nextOffset;
      layout.totalSize = currentOffset;
    }
    
    // 对齐总大小
    layout.totalSize = this.alignUp(layout.totalSize);
    layout.padding = layout.totalSize - currentOffset;
    
    return layout;
  }
  
  getPropertyLayout(name, value, offset) {
    let size;
    let type;
    
    if (typeof value === 'number' && Number.isInteger(value) && 
        value >= -0x80000000 && value <= 0x7FFFFFFF) {
      // Smi: 直接存储在指针中
      size = this.pointerSize;
      type = 'Smi';
    } else if (typeof value === 'number') {
      // HeapNumber: 指针指向堆对象
      size = this.pointerSize;
      type = 'HeapNumber pointer';
    } else {
      // 其他对象: 指针
      size = this.pointerSize;
      type = 'Object pointer';
    }
    
    return {
      name,
      offset,
      size,
      type,
      value,
      nextOffset: offset + size
    };
  }
  
  alignUp(size) {
    return Math.ceil(size / this.pointerSize) * this.pointerSize;
  }
  
  // 打印布局
  printLayout(layout) {
    console.log('=== 对象内存布局 ===\n');
    console.log('偏移  大小  描述');
    console.log(''.padEnd(50, '-'));
    
    // 打印头部
    console.log(`${layout.header.offset.toString().padStart(4)}  ${layout.header.size.toString().padStart(4)}  ${layout.header.description}`);
    
    // 打印属性
    for (const prop of layout.properties) {
      console.log(`${prop.offset.toString().padStart(4)}  ${prop.size.toString().padStart(4)}  ${prop.name}: ${prop.type} (${prop.value})`);
    }
    
    // 打印填充
    if (layout.padding > 0) {
      const paddingOffset = layout.totalSize - layout.padding;
      console.log(`${paddingOffset.toString().padStart(4)}  ${layout.padding.toString().padStart(4)}  Padding`);
    }
    
    console.log(''.padEnd(50, '-'));
    console.log(`总大小: ${layout.totalSize} 字节\n`);
  }
  
  // 演示
  demonstrate() {
    const obj = {
      x: 10,        // Smi
      y: 20,        // Smi
      z: 3.14       // HeapNumber
    };
    
    const layout = this.analyzeLayout(obj);
    this.printLayout(layout);
  }
}

const objLayout = new V8ObjectLayout();
objLayout.demonstrate();
```

## 数组的对齐优化

数组元素也需要对齐：

```javascript
// 数组内存布局
class ArrayMemoryLayout {
  constructor() {
    this.pointerSize = 8;
    this.smiSize = 8;  // 64位系统中Smi也占8字节
  }
  
  // 分析数组布局
  analyzeArrayLayout(arr) {
    const layout = {
      // JSArray对象头
      header: {
        map: { offset: 0, size: this.pointerSize },
        properties: { offset: this.pointerSize, size: this.pointerSize },
        elements: { offset: this.pointerSize * 2, size: this.pointerSize },
        length: { offset: this.pointerSize * 3, size: this.smiSize }
      },
      
      // FixedArray对象（元素存储）
      elementsObject: {
        map: { offset: 0, size: this.pointerSize },
        length: { offset: this.pointerSize, size: this.smiSize },
        elements: []
      },
      
      totalSize: 0
    };
    
    // 计算JSArray大小
    const jsArraySize = this.pointerSize * 4;
    
    // 计算FixedArray大小
    let elementsOffset = this.pointerSize * 2;  // map + length
    
    for (let i = 0; i < arr.length; i++) {
      const element = arr[i];
      const elementSize = this.getElementSize(element);
      
      layout.elementsObject.elements.push({
        index: i,
        offset: elementsOffset,
        size: elementSize,
        value: element
      });
      
      elementsOffset += elementSize;
    }
    
    // 对齐FixedArray大小
    const alignedElementsSize = this.alignUp(elementsOffset);
    
    layout.totalSize = jsArraySize + alignedElementsSize;
    layout.elementsPadding = alignedElementsSize - elementsOffset;
    
    return layout;
  }
  
  getElementSize(element) {
    // 简化：所有元素都是指针大小
    return this.pointerSize;
  }
  
  alignUp(size) {
    return Math.ceil(size / this.pointerSize) * this.pointerSize;
  }
  
  printArrayLayout(layout) {
    console.log('=== 数组内存布局 ===\n');
    
    console.log('JSArray 对象:');
    console.log('  偏移  大小  字段');
    for (const [name, field] of Object.entries(layout.header)) {
      console.log(`  ${field.offset.toString().padStart(4)}  ${field.size.toString().padStart(4)}  ${name}`);
    }
    
    console.log('\nFixedArray 对象 (元素存储):');
    console.log('  偏移  大小  内容');
    console.log(`  ${layout.elementsObject.map.offset.toString().padStart(4)}  ${layout.elementsObject.map.size.toString().padStart(4)}  Map pointer`);
    console.log(`  ${layout.elementsObject.length.offset.toString().padStart(4)}  ${layout.elementsObject.length.size.toString().padStart(4)}  Length`);
    
    for (const elem of layout.elementsObject.elements) {
      console.log(`  ${elem.offset.toString().padStart(4)}  ${elem.size.toString().padStart(4)}  [${elem.index}] = ${elem.value}`);
    }
    
    if (layout.elementsPadding > 0) {
      const paddingOffset = layout.elementsObject.elements[layout.elementsObject.elements.length - 1].offset + this.pointerSize;
      console.log(`  ${paddingOffset.toString().padStart(4)}  ${layout.elementsPadding.toString().padStart(4)}  Padding`);
    }
    
    console.log(`\n总大小: ${layout.totalSize} 字节\n`);
  }
  
  demonstrate() {
    const arr = [1, 2, 3, 4, 5];
    const layout = this.analyzeArrayLayout(arr);
    this.printArrayLayout(layout);
  }
}

const arrayLayout = new ArrayMemoryLayout();
arrayLayout.demonstrate();
```

## 字符串的对齐

字符串内容也需要对齐：

```javascript
// 字符串内存布局
class StringMemoryLayout {
  constructor() {
    this.pointerSize = 8;
  }
  
  // 分析字符串布局
  analyzeStringLayout(str) {
    const layout = {
      // String对象头
      header: {
        map: { offset: 0, size: this.pointerSize },
        hash: { offset: this.pointerSize, size: 4 },
        length: { offset: this.pointerSize + 4, size: 4 }
      },
      
      // 字符串内容
      content: null,
      
      padding: 0,
      totalSize: 0
    };
    
    // 计算内容大小（UTF-16编码，每字符2字节）
    const contentSize = str.length * 2;
    const contentOffset = this.pointerSize * 2;  // map + hash + length (对齐)
    
    layout.content = {
      offset: contentOffset,
      size: contentSize,
      encoding: 'UTF-16LE'
    };
    
    // 计算总大小并对齐
    const unalignedSize = contentOffset + contentSize;
    layout.totalSize = this.alignUp(unalignedSize);
    layout.padding = layout.totalSize - unalignedSize;
    
    return layout;
  }
  
  alignUp(size) {
    return Math.ceil(size / this.pointerSize) * this.pointerSize;
  }
  
  printStringLayout(layout) {
    console.log('=== 字符串内存布局 ===\n');
    console.log('偏移  大小  字段');
    console.log(''.padEnd(40, '-'));
    
    console.log(`${layout.header.map.offset.toString().padStart(4)}  ${layout.header.map.size.toString().padStart(4)}  Map pointer`);
    console.log(`${layout.header.hash.offset.toString().padStart(4)}  ${layout.header.hash.size.toString().padStart(4)}  Hash code`);
    console.log(`${layout.header.length.offset.toString().padStart(4)}  ${layout.header.length.size.toString().padStart(4)}  Length`);
    console.log(`${layout.content.offset.toString().padStart(4)}  ${layout.content.size.toString().padStart(4)}  Content (${layout.content.encoding})`);
    
    if (layout.padding > 0) {
      const paddingOffset = layout.content.offset + layout.content.size;
      console.log(`${paddingOffset.toString().padStart(4)}  ${layout.padding.toString().padStart(4)}  Padding`);
    }
    
    console.log(''.padEnd(40, '-'));
    console.log(`总大小: ${layout.totalSize} 字节\n`);
  }
  
  demonstrate() {
    const strings = ['Hi', 'Hello', 'Hello World!'];
    
    for (const str of strings) {
      console.log(`字符串: "${str}"`);
      const layout = this.analyzeStringLayout(str);
      this.printStringLayout(layout);
    }
  }
}

const stringLayout = new StringMemoryLayout();
stringLayout.demonstrate();
```

## 性能影响：对齐 vs 紧凑

对齐虽然浪费空间，但能提升性能：

```javascript
// 对齐性能测试
class AlignmentPerformance {
  static testUnalignedAccess() {
    // 模拟未对齐访问（需要多次内存读取）
    const iterations = 10000000;
    
    console.time('Unaligned access simulation');
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      // 模拟两次内存读取
      sum += Math.random();
      sum += Math.random();
    }
    console.timeEnd('Unaligned access simulation');
    
    return sum;
  }
  
  static testAlignedAccess() {
    // 模拟对齐访问（一次内存读取）
    const iterations = 10000000;
    
    console.time('Aligned access simulation');
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
      // 模拟一次内存读取
      sum += Math.random();
    }
    console.timeEnd('Aligned access simulation');
    
    return sum;
  }
  
  static compare() {
    console.log('=== 对齐性能对比 ===\n');
    
    this.testUnalignedAccess();
    this.testAlignedAccess();
    
    console.log('\n结论：对齐访问速度约为未对齐的2倍');
  }
}

AlignmentPerformance.compare();
```

## 内存紧凑性优化

V8在某些情况下会优化内存使用：

```javascript
// 内存紧凑性优化
class MemoryCompaction {
  static demonstrateSmallIntegers() {
    // Smi（小整数）不需要额外堆分配
    console.log('=== Smi 优化 ===\n');
    
    const smi = 42;
    console.log(`值: ${smi}`);
    console.log(`存储: 直接编码在指针中（Tagged Pointer）`);
    console.log(`堆分配: 无`);
    console.log(`内存开销: 0 字节\n`);
    
    // 大整数需要堆分配
    const heapNumber = 2 ** 53;
    console.log(`值: ${heapNumber}`);
    console.log(`存储: HeapNumber 对象`);
    console.log(`堆分配: 是`);
    console.log(`内存开销: ~16 字节（对齐后）\n`);
  }
  
  static demonstrateStringInternalization() {
    // 字符串驻留优化
    console.log('=== 字符串驻留 ===\n');
    
    const str1 = 'hello';
    const str2 = 'hello';
    const str3 = 'hel' + 'lo';
    
    console.log('三个相同内容的字符串:');
    console.log(`str1 === str2: ${str1 === str2}`);
    console.log(`str1 === str3: ${str1 === str3}`);
    console.log('结论: V8复用同一个字符串对象\n');
  }
  
  static demonstrateArrayPacking() {
    // 数组元素紧凑存储
    console.log('=== 数组紧凑存储 ===\n');
    
    // PACKED_SMI_ELEMENTS: 最紧凑
    const packedSmi = [1, 2, 3, 4, 5];
    console.log('纯Smi数组:', packedSmi);
    console.log('Elements Kind: PACKED_SMI_ELEMENTS');
    console.log('每元素: 8字节（指针大小）\n');
    
    // PACKED_DOUBLE_ELEMENTS: 紧凑的双精度数组
    const packedDouble = [1.1, 2.2, 3.3];
    console.log('纯浮点数组:', packedDouble);
    console.log('Elements Kind: PACKED_DOUBLE_ELEMENTS');
    console.log('每元素: 8字节（直接存储double）\n');
    
    // PACKED_ELEMENTS: 混合类型
    const packedMixed = [1, 'a', {}];
    console.log('混合类型数组:', packedMixed);
    console.log('Elements Kind: PACKED_ELEMENTS');
    console.log('每元素: 8字节（指针）\n');
  }
  
  static runAll() {
    this.demonstrateSmallIntegers();
    this.demonstrateStringInternalization();
    this.demonstrateArrayPacking();
  }
}

MemoryCompaction.runAll();
```

## 对象形状与填充

对象的隐藏类影响内存布局：

```javascript
// 对象形状与内存布局
class ObjectShapeAndLayout {
  constructor() {
    this.pointerSize = 8;
  }
  
  // 分析不同形状的对象
  compareShapes() {
    console.log('=== 对象形状对比 ===\n');
    
    // 形状1：紧凑对象
    const compact = { a: 1, b: 2, c: 3 };
    console.log('紧凑对象: { a: 1, b: 2, c: 3 }');
    console.log(`预估大小: ${this.estimateSize(compact)} 字节`);
    console.log(`内联属性: 3`);
    console.log(`外部属性: 0\n`);
    
    // 形状2：稀疏对象（添加很多属性）
    const sparse = { a: 1 };
    for (let i = 0; i < 20; i++) {
      sparse[`prop${i}`] = i;
    }
    console.log('稀疏对象: 21个属性');
    console.log(`预估大小: ${this.estimateSize(sparse)} 字节`);
    console.log(`内联属性: ~3`);
    console.log(`外部属性: ~18（存储在properties数组）\n`);
    
    // 形状3：删除属性后
    const deleted = { a: 1, b: 2, c: 3 };
    delete deleted.b;
    console.log('删除属性后: { a: 1, c: 3 }');
    console.log(`预估大小: ${this.estimateSize(deleted)} 字节`);
    console.log(`注意: 删除属性可能导致字典模式\n`);
  }
  
  estimateSize(obj) {
    const propCount = Object.keys(obj).length;
    const inlineProps = Math.min(propCount, 3);
    const externalProps = Math.max(propCount - 3, 0);
    
    // 对象头 + 内联属性 + 外部属性数组指针
    let size = this.pointerSize;  // Map指针
    size += inlineProps * this.pointerSize;
    
    if (externalProps > 0) {
      size += this.pointerSize;  // properties指针
      // 外部数组的大小另计
    }
    
    // 对齐
    size = Math.ceil(size / this.pointerSize) * this.pointerSize;
    
    return size;
  }
}

const shapeLayout = new ObjectShapeAndLayout();
shapeLayout.compareShapes();
```

## 最佳实践：减少内存浪费

```javascript
// 内存优化建议
class MemoryOptimizationTips {
  static tip1_UseConsistentShapes() {
    console.log('=== 提示1：使用一致的对象形状 ===\n');
    
    // 不推荐：形状不一致
    console.log('❌ 不推荐:');
    const obj1 = { a: 1, b: 2 };
    const obj2 = { b: 2, a: 1 };  // 顺序不同
    const obj3 = { a: 1, b: 2, c: 3 };  // 属性数量不同
    console.log('  不同的属性顺序和数量导致不同隐藏类\n');
    
    // 推荐：形状一致
    console.log('✅ 推荐:');
    console.log('  使用构造函数或类保持一致的形状');
    class Point {
      constructor(x, y) {
        this.x = x;
        this.y = y;
      }
    }
    const p1 = new Point(1, 2);
    const p2 = new Point(3, 4);
    console.log('  所有Point实例共享相同隐藏类\n');
  }
  
  static tip2_AvoidDeletingProperties() {
    console.log('=== 提示2：避免删除属性 ===\n');
    
    console.log('❌ 不推荐:');
    console.log('  delete obj.property  // 可能导致字典模式\n');
    
    console.log('✅ 推荐:');
    console.log('  obj.property = null  // 保持对象形状\n');
  }
  
  static tip3_UseTypedArrays() {
    console.log('=== 提示3：使用TypedArray处理数值 ===\n');
    
    console.log('❌ 不推荐:');
    console.log('  const arr = [1.1, 2.2, 3.3, ...]');
    console.log('  内存: 每元素8字节指针 + HeapNumber对象\n');
    
    console.log('✅ 推荐:');
    console.log('  const arr = new Float64Array([1.1, 2.2, 3.3, ...])');
    console.log('  内存: 每元素8字节，直接存储\n');
  }
  
  static tip4_PreallocateArrays() {
    console.log('=== 提示4：预分配数组大小 ===\n');
    
    console.log('❌ 不推荐:');
    console.log('  const arr = [];');
    console.log('  for (...) arr.push(item);  // 多次重新分配\n');
    
    console.log('✅ 推荐:');
    console.log('  const arr = new Array(expectedSize);');
    console.log('  for (...) arr[i] = item;  // 一次分配\n');
  }
  
  static runAll() {
    this.tip1_UseConsistentShapes();
    this.tip2_AvoidDeletingProperties();
    this.tip3_UseTypedArrays();
    this.tip4_PreallocateArrays();
  }
}

MemoryOptimizationTips.runAll();
```

## 本章小结

本章深入探讨了V8的内存对齐与填充机制。我们学习了以下核心内容：

1. **对齐原理**：CPU按对齐边界访问内存效率最高，V8要求所有对象按指针大小对齐。

2. **对象布局**：对象头、属性、元素都按对齐规则排列，可能包含填充字节。

3. **数组对齐**：数组元素根据类型（Smi、Double、Object）采用不同的存储策略。

4. **字符串对齐**：字符串内容按2字节对齐，整体对象按指针大小对齐。

5. **性能权衡**：对齐虽然浪费空间（约10-20%），但访问速度提升显著。

6. **优化策略**：使用一致的对象形状、TypedArray、预分配数组可减少内存浪费。

理解内存对齐，能够帮助你写出内存友好的代码。在下一章中，我们将探讨内存泄漏的常见场景与分析方法。
