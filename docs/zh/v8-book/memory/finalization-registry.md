# FinalizationRegistry：弱引用与清理回调

当对象被垃圾回收时,你希望得到通知吗?当资源不再需要时,能否自动清理?FinalizationRegistry和WeakRef为JavaScript带来了全新的内存管理能力,让你可以感知对象的生命周期,实现更精细的资源管理。

本章将深入探讨这两个强大的API,学习如何使用它们优雅地管理资源,同时避免常见的陷阱。

## WeakRef：弱引用基础

WeakRef允许持有对象的弱引用,不阻止垃圾回收:

```javascript
// WeakRef 基础示例
class WeakRefBasics {
  static demonstrate() {
    console.log('=== WeakRef 基础 ===\n');
    
    // 创建对象
    let obj = { data: new Array(100000).fill('data') };
    
    // 创建弱引用
    const weakRef = new WeakRef(obj);
    
    console.log('1. 创建弱引用');
    console.log('   const weakRef = new WeakRef(obj);');
    console.log('   特点：不阻止obj被垃圾回收\n');
    
    // 访问对象
    console.log('2. 访问对象');
    const retrieved = weakRef.deref();
    if (retrieved) {
      console.log('   ✅ 对象仍然存在');
      console.log(`   数据长度: ${retrieved.data.length}`);
    } else {
      console.log('   ❌ 对象已被回收');
    }
    console.log('');
    
    // 模拟对象被回收
    console.log('3. 清除强引用');
    console.log('   obj = null;');
    obj = null;
    
    console.log('   提示：下次GC时，对象可能被回收');
    console.log('   weakRef.deref()将返回undefined\n');
  }
  
  static demonstrateUseCase() {
    console.log('=== WeakRef 使用场景 ===\n');
    
    // 场景：缓存系统
    class WeakCache {
      constructor() {
        this.cache = new Map();
      }
      
      set(key, value) {
        // 存储弱引用，而非强引用
        this.cache.set(key, new WeakRef(value));
      }
      
      get(key) {
        const weakRef = this.cache.get(key);
        if (!weakRef) {
          return undefined;
        }
        
        // 尝试获取对象
        const value = weakRef.deref();
        
        if (!value) {
          // 对象已被回收，清理缓存项
          this.cache.delete(key);
          return undefined;
        }
        
        return value;
      }
      
      has(key) {
        const value = this.get(key);
        return value !== undefined;
      }
      
      get size() {
        // 清理已回收的项
        for (const [key, weakRef] of this.cache.entries()) {
          if (!weakRef.deref()) {
            this.cache.delete(key);
          }
        }
        return this.cache.size;
      }
    }
    
    console.log('WeakCache示例：');
    const cache = new WeakCache();
    
    let largeObject = { data: new Array(100000).fill('data') };
    cache.set('key1', largeObject);
    
    console.log(`  缓存大小: ${cache.size}`);
    console.log('  存储对象的弱引用');
    console.log('  对象可被GC回收，自动清理缓存\n');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateUseCase();
  }
}

WeakRefBasics.runAll();
```

## FinalizationRegistry：清理回调

FinalizationRegistry在对象被回收时执行回调:

```javascript
// FinalizationRegistry 基础
class FinalizationRegistryBasics {
  static demonstrate() {
    console.log('=== FinalizationRegistry 基础 ===\n');
    
    // 创建注册表
    const registry = new FinalizationRegistry((heldValue) => {
      console.log(`🗑️  对象被回收了！持有值: ${heldValue}`);
    });
    
    console.log('1. 创建FinalizationRegistry');
    console.log(`
    const registry = new FinalizationRegistry((heldValue) => {
      console.log(\`对象被回收: \${heldValue}\`);
    });
    `);
    
    // 注册对象
    let obj = { name: 'test', data: new Array(10000) };
    registry.register(obj, 'test-object');
    
    console.log('2. 注册对象');
    console.log('   registry.register(obj, "test-object");');
    console.log('   当obj被GC时，回调将执行\n');
    
    console.log('3. 清除引用');
    console.log('   obj = null;');
    console.log('   等待GC执行...\n');
    
    obj = null;
    
    // 强制GC（仅Node.js）
    if (global.gc) {
      console.log('4. 强制GC（仅测试）');
      global.gc();
      console.log('   等待回调执行...\n');
    }
  }
  
  static demonstrateUnregister() {
    console.log('=== 取消注册 ===\n');
    
    const registry = new FinalizationRegistry((heldValue) => {
      console.log(`对象回收: ${heldValue}`);
    });
    
    let obj = { name: 'test' };
    
    // 使用token取消注册
    const token = { id: 'unique-token' };
    registry.register(obj, 'my-object', token);
    
    console.log('注册时提供token:');
    console.log('  registry.register(obj, "my-object", token);\n');
    
    // 取消注册
    registry.unregister(token);
    
    console.log('取消注册:');
    console.log('  registry.unregister(token);');
    console.log('  回调将不会执行\n');
    
    obj = null;
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateUnregister();
  }
}

FinalizationRegistryBasics.runAll();
```

## 实战案例：资源管理器

使用FinalizationRegistry管理外部资源:

```javascript
// 资源管理器
class ResourceManager {
  constructor() {
    // 资源清理回调
    this.registry = new FinalizationRegistry((resourceId) => {
      this.cleanup(resourceId);
    });
    
    // 跟踪活跃资源
    this.resources = new Map();
    this.nextId = 1;
  }
  
  // 分配资源
  allocate(type, size) {
    const id = this.nextId++;
    
    // 创建资源
    const resource = {
      id,
      type,
      size,
      data: new Array(size).fill(0),
      allocated: Date.now()
    };
    
    // 记录资源
    this.resources.set(id, {
      type,
      size,
      allocated: resource.allocated
    });
    
    // 创建包装对象
    const handle = {
      id,
      read: (index) => resource.data[index],
      write: (index, value) => { resource.data[index] = value; }
    };
    
    // 注册清理
    this.registry.register(handle, id, handle);
    
    console.log(`✅ 分配资源 #${id}: ${type}, ${size}字节`);
    
    return handle;
  }
  
  // 手动释放资源
  release(handle) {
    if (!handle) return;
    
    // 取消自动清理
    this.registry.unregister(handle);
    
    // 执行清理
    this.cleanup(handle.id);
  }
  
  // 清理资源
  cleanup(resourceId) {
    const info = this.resources.get(resourceId);
    
    if (!info) {
      return;  // 已清理
    }
    
    console.log(`🗑️  清理资源 #${resourceId}: ${info.type}`);
    console.log(`   大小: ${info.size}字节`);
    console.log(`   存活: ${Date.now() - info.allocated}ms`);
    
    // 清理资源
    this.resources.delete(resourceId);
  }
  
  // 获取统计
  getStats() {
    const stats = {
      count: this.resources.size,
      totalSize: 0,
      byType: {}
    };
    
    for (const [id, info] of this.resources.entries()) {
      stats.totalSize += info.size;
      
      if (!stats.byType[info.type]) {
        stats.byType[info.type] = { count: 0, size: 0 };
      }
      
      stats.byType[info.type].count++;
      stats.byType[info.type].size += info.size;
    }
    
    return stats;
  }
  
  // 演示
  static demonstrate() {
    console.log('=== 资源管理器示例 ===\n');
    
    const manager = new ResourceManager();
    
    console.log('1. 分配资源\n');
    let handle1 = manager.allocate('buffer', 1024);
    let handle2 = manager.allocate('texture', 2048);
    let handle3 = manager.allocate('buffer', 512);
    
    console.log('\n2. 查看统计\n');
    let stats = manager.getStats();
    console.log(`   活跃资源: ${stats.count}`);
    console.log(`   总大小: ${stats.totalSize}字节`);
    console.log('   按类型:');
    for (const [type, info] of Object.entries(stats.byType)) {
      console.log(`     ${type}: ${info.count}个, ${info.size}字节`);
    }
    
    console.log('\n3. 手动释放handle1\n');
    manager.release(handle1);
    handle1 = null;
    
    console.log('\n4. 清除handle2和handle3的引用\n');
    console.log('   这些资源将在GC时自动清理');
    handle2 = null;
    handle3 = null;
    
    console.log('\n5. 强制GC（仅测试）\n');
    if (global.gc) {
      global.gc();
      setTimeout(() => {
        stats = manager.getStats();
        console.log(`\n   GC后活跃资源: ${stats.count}`);
      }, 100);
    }
  }
}

ResourceManager.demonstrate();
```

## 实战案例：缓存管理

结合WeakRef和FinalizationRegistry实现智能缓存:

```javascript
// 智能缓存
class SmartCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.ttl = options.ttl || 60000;  // 1分钟
    
    // 缓存存储：key -> { weakRef, timestamp, size }
    this.cache = new Map();
    
    // 监控对象回收
    this.registry = new FinalizationRegistry((key) => {
      this.handleReclaimed(key);
    });
    
    // 定期清理过期项
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 10000);
  }
  
  // 设置缓存
  set(key, value, options = {}) {
    // 检查大小限制
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    const entry = {
      weakRef: new WeakRef(value),
      timestamp: Date.now(),
      ttl: options.ttl || this.ttl,
      size: options.size || 1,
      hits: 0
    };
    
    // 存储缓存项
    this.cache.set(key, entry);
    
    // 注册清理
    this.registry.register(value, key, value);
    
    console.log(`💾 缓存项: ${key}`);
  }
  
  // 获取缓存
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`❌ 缓存未命中: ${key}`);
      return undefined;
    }
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      console.log(`⏰ 缓存过期: ${key}`);
      this.cache.delete(key);
      return undefined;
    }
    
    // 尝试获取值
    const value = entry.weakRef.deref();
    
    if (!value) {
      console.log(`🗑️  对象已回收: ${key}`);
      this.cache.delete(key);
      return undefined;
    }
    
    // 更新统计
    entry.hits++;
    entry.timestamp = Date.now();  // 刷新时间
    
    console.log(`✅ 缓存命中: ${key} (hits: ${entry.hits})`);
    return value;
  }
  
  // 删除缓存
  delete(key) {
    const entry = this.cache.get(key);
    
    if (entry) {
      const value = entry.weakRef.deref();
      if (value) {
        this.registry.unregister(value);
      }
      
      this.cache.delete(key);
      console.log(`🗑️  删除缓存: ${key}`);
    }
  }
  
  // 对象被回收的处理
  handleReclaimed(key) {
    console.log(`♻️  自动清理: ${key} (对象已回收)`);
    this.cache.delete(key);
  }
  
  // 清理过期项
  cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 清理了${cleaned}个过期项`);
    }
  }
  
  // 驱逐最旧的项
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      console.log(`📤 驱逐最旧项: ${oldestKey}`);
      this.delete(oldestKey);
    }
  }
  
  // 获取统计
  getStats() {
    const stats = {
      size: 0,
      alive: 0,
      reclaimed: 0,
      totalHits: 0
    };
    
    for (const [key, entry] of this.cache.entries()) {
      stats.size++;
      stats.totalHits += entry.hits;
      
      if (entry.weakRef.deref()) {
        stats.alive++;
      } else {
        stats.reclaimed++;
      }
    }
    
    return stats;
  }
  
  // 销毁缓存
  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
  
  // 演示
  static demonstrate() {
    console.log('=== 智能缓存示例 ===\n');
    
    const cache = new SmartCache({ maxSize: 5, ttl: 5000 });
    
    console.log('1. 添加缓存项\n');
    let obj1 = { data: 'object 1' };
    let obj2 = { data: 'object 2' };
    let obj3 = { data: 'object 3' };
    
    cache.set('key1', obj1);
    cache.set('key2', obj2);
    cache.set('key3', obj3);
    
    console.log('\n2. 读取缓存\n');
    cache.get('key1');
    cache.get('key2');
    cache.get('key1');  // 再次命中
    
    console.log('\n3. 清除obj1引用\n');
    obj1 = null;
    
    console.log('\n4. 再次读取key1\n');
    setTimeout(() => {
      cache.get('key1');  // 对象可能已被回收
      
      console.log('\n5. 统计信息\n');
      const stats = cache.getStats();
      console.log(`   总项数: ${stats.size}`);
      console.log(`   存活: ${stats.alive}`);
      console.log(`   已回收: ${stats.reclaimed}`);
      console.log(`   总命中: ${stats.totalHits}`);
      
      // 清理
      cache.destroy();
    }, 100);
  }
}

SmartCache.demonstrate();
```

## WeakRef vs WeakMap vs FinalizationRegistry

三者的区别和选择:

```javascript
// 三种弱引用机制对比
class WeakReferencesComparison {
  static demonstrate() {
    console.log('=== WeakRef vs WeakMap vs FinalizationRegistry ===\n');
    
    console.log('1. WeakRef\n');
    console.log('   用途：单个对象的弱引用');
    console.log('   特点：');
    console.log('     • 不阻止对象被GC');
    console.log('     • 需要手动检查对象是否存活（deref）');
    console.log('     • 适合缓存单个对象');
    console.log('   示例：');
    console.log('     const ref = new WeakRef(obj);');
    console.log('     const value = ref.deref();  // 可能为undefined\n');
    
    console.log('2. WeakMap\n');
    console.log('   用途：对象到值的映射');
    console.log('   特点：');
    console.log('     • 键必须是对象');
    console.log('     • 键被GC时，映射项自动删除');
    console.log('     • 无法枚举键');
    console.log('     • 适合存储对象私有数据');
    console.log('   示例：');
    console.log('     const map = new WeakMap();');
    console.log('     map.set(obj, value);');
    console.log('     map.get(obj);  // 自动处理GC\n');
    
    console.log('3. FinalizationRegistry\n');
    console.log('   用途：对象被回收时执行清理');
    console.log('   特点：');
    console.log('     • 感知对象生命周期');
    console.log('     • 执行清理操作（关闭文件、释放资源）');
    console.log('     • 回调执行时机不确定');
    console.log('     • 适合资源管理');
    console.log('   示例：');
    console.log('     const registry = new FinalizationRegistry(cleanup);');
    console.log('     registry.register(obj, resourceId);\n');
  }
  
  static demonstrateUseCases() {
    console.log('=== 使用场景选择 ===\n');
    
    console.log('场景1：对象元数据存储');
    console.log('  选择：WeakMap');
    console.log('  原因：自动管理，无需手动检查');
    console.log(`
    const metadata = new WeakMap();
    metadata.set(element, { clicks: 0, created: Date.now() });
    `);
    
    console.log('\n场景2：可选的缓存');
    console.log('  选择：WeakRef');
    console.log('  原因：允许对象被回收，手动检查可用性');
    console.log(`
    class Cache {
      constructor() {
        this.cache = new Map();  // key -> WeakRef
      }
      get(key) {
        const ref = this.cache.get(key);
        return ref?.deref();
      }
    }
    `);
    
    console.log('\n场景3：外部资源管理');
    console.log('  选择：FinalizationRegistry');
    console.log('  原因：需要在对象回收时清理资源');
    console.log(`
    const registry = new FinalizationRegistry((fd) => {
      closeFile(fd);
    });
    
    function openFile(path) {
      const fd = nativeOpenFile(path);
      const handle = { fd };
      registry.register(handle, fd);
      return handle;
    }
    `);
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateUseCases();
  }
}

WeakReferencesComparison.runAll();
```

## 注意事项与陷阱

使用WeakRef和FinalizationRegistry的常见陷阱:

```javascript
// 常见陷阱
class CommonPitfalls {
  static demonstrate() {
    console.log('=== 常见陷阱与注意事项 ===\n');
    
    console.log('❌ 陷阱1：回调执行时机不确定\n');
    console.log('   问题：');
    console.log('     FinalizationRegistry回调可能很晚才执行');
    console.log('     甚至可能永远不执行\n');
    console.log('   解决：');
    console.log('     • 不依赖回调的及时性');
    console.log('     • 关键资源提供手动清理方法');
    console.log('     • 使用try-finally确保清理\n');
    
    console.log('❌ 陷阱2：循环引用\n');
    console.log('   问题：');
    console.log(`
    const registry = new FinalizationRegistry((obj) => {
      // 错误：回调持有obj的引用
      console.log(obj.data);  // obj永远不会被回收！
    });
    
    registry.register(obj, obj);  // 错误
    `);
    console.log('   解决：');
    console.log('     • heldValue不要是被注册的对象本身');
    console.log('     • 使用ID或其他元数据\n');
    
    console.log('❌ 陷阱3：过度使用WeakRef\n');
    console.log('   问题：');
    console.log('     频繁deref()检查增加复杂度');
    console.log('     对象可能在使用过程中被回收\n');
    console.log('   解决：');
    console.log('     • 仅在缓存等场景使用');
    console.log('     • 优先使用普通引用');
    console.log('     • 考虑使用WeakMap代替\n');
    
    console.log('❌ 陷阱4：在回调中创建新的强引用\n');
    console.log('   问题：');
    console.log(`
    registry.register(obj, {
      data: obj  // 错误：持有obj的强引用
    });
    `);
    console.log('   解决：');
    console.log('     • heldValue只包含必要的元数据');
    console.log('     • 不要引用原对象\n');
  }
  
  static demonstrateBestPractices() {
    console.log('=== 最佳实践 ===\n');
    
    console.log('✅ 实践1：提供手动清理方法\n');
    console.log(`
    class Resource {
      constructor() {
        this.registry.register(this, this.id);
      }
      
      // 手动清理（推荐）
      close() {
        cleanup(this.id);
        this.registry.unregister(this);
      }
      
      // 自动清理（备用）
      // FinalizationRegistry作为安全网
    }
    `);
    
    console.log('\n✅ 实践2：使用try-finally\n');
    console.log(`
    const resource = new Resource();
    try {
      // 使用资源
      resource.use();
    } finally {
      // 确保清理
      resource.close();
    }
    `);
    
    console.log('\n✅ 实践3：合理选择弱引用机制\n');
    console.log('   • 对象元数据 → WeakMap');
    console.log('   • 可选缓存 → WeakRef');
    console.log('   • 资源清理 → FinalizationRegistry\n');
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateBestPractices();
  }
}

CommonPitfalls.runAll();
```

## 本章小结

本章深入探讨了FinalizationRegistry和WeakRef的使用。我们学习了以下核心内容：

1. **WeakRef基础**：创建弱引用,使用deref()访问对象,不阻止垃圾回收。

2. **FinalizationRegistry**：注册清理回调,在对象被回收时执行清理操作。

3. **资源管理器**：结合两者实现自动资源清理,提供手动释放选项。

4. **智能缓存**：使用WeakRef实现可被GC的缓存,FinalizationRegistry自动清理失效项。

5. **三者对比**：WeakRef用于单个弱引用,WeakMap用于映射,FinalizationRegistry用于清理回调。

6. **注意事项**：回调时机不确定,避免循环引用,不要过度使用,提供手动清理方法。

7. **最佳实践**：手动清理优先,自动清理作为安全网,合理选择弱引用机制。

掌握这些API,你将能够实现更精细的内存管理,优雅地处理资源生命周期。至此,第六部分"内存管理与垃圾回收"全部完成,我们已经深入理解了V8的内存管理机制。
