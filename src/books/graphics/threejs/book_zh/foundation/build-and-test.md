# 构建系统与测试策略

> "可靠的构建系统和完善的测试是高质量代码的保障。"

## 构建系统

### 构建流程

```
源代码 (TypeScript)
    ↓
类型检查 (tsc --noEmit)
    ↓
代码转换 (Vite/Rollup)
    ↓
打包优化 (Tree-shaking)
    ↓
产物生成 (ES Module + UMD)
    ↓
类型声明 (d.ts)
```

### Rollup 配置详解

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,  // 合并类型声明
    }),
  ],
  
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MiniThree',
      fileName: (format) => `mini-three.${format}.js`,
      formats: ['es', 'umd', 'cjs'],
    },
    
    rollupOptions: {
      // 外部依赖
      external: [],
      
      output: {
        // 全局变量映射
        globals: {},
        
        // 分离代码块
        manualChunks: (id) => {
          if (id.includes('math')) {
            return 'math';
          }
          if (id.includes('renderers')) {
            return 'renderers';
          }
        },
      },
    },
    
    // 构建目标
    target: 'es2020',
    
    // 源码映射
    sourcemap: true,
    
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
```

### Tree-shaking

```typescript
// 支持 Tree-shaking 的导出方式
// ✅ 命名导出
export { Vector3 } from './math/Vector3';
export { Scene } from './core/Scene';

// ❌ 默认导出整个对象（不利于 Tree-shaking）
export default {
  Vector3,
  Scene,
  // ...
};
```

### 副作用标记

```json
// package.json
{
  "sideEffects": false  // 无副作用，可安全 Tree-shake
}
```

```json
// 如果有副作用文件
{
  "sideEffects": [
    "src/polyfills.ts",
    "*.css"
  ]
}
```

## 多格式输出

### ES Module

```javascript
// dist/mini-three.es.js
// 用于现代打包工具和浏览器

import { createProgram } from './webgl-utils.js';

export class WebGLRenderer {
  // ...
}
```

### UMD

```javascript
// dist/mini-three.umd.js
// 用于传统 <script> 标签和 AMD

(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' 
    ? factory(exports) 
    : typeof define === 'function' && define.amd 
    ? define(['exports'], factory) 
    : (global = typeof globalThis !== 'undefined' 
      ? globalThis : global || self, 
      factory(global.MiniThree = {}));
})(this, function(exports) {
  'use strict';
  
  class WebGLRenderer {
    // ...
  }
  
  exports.WebGLRenderer = WebGLRenderer;
});
```

### CommonJS

```javascript
// dist/mini-three.cjs.js
// 用于 Node.js

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class WebGLRenderer {
  // ...
}

exports.WebGLRenderer = WebGLRenderer;
```

## 类型声明

### 生成配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "declaration": true,       // 生成 .d.ts
    "declarationMap": true,    // 生成 .d.ts.map
    "emitDeclarationOnly": true,  // 只生成声明
    "declarationDir": "./dist/types"
  }
}
```

### 类型声明示例

```typescript
// dist/math/Vector3.d.ts
export declare class Vector3 {
  x: number;
  y: number;
  z: number;
  
  constructor(x?: number, y?: number, z?: number);
  
  set(x: number, y: number, z: number): this;
  clone(): Vector3;
  copy(v: Vector3): this;
  
  add(v: Vector3): this;
  sub(v: Vector3): this;
  multiply(v: Vector3): this;
  divide(v: Vector3): this;
  
  multiplyScalar(s: number): this;
  divideScalar(s: number): this;
  
  length(): number;
  lengthSq(): number;
  normalize(): this;
  
  dot(v: Vector3): number;
  cross(v: Vector3): this;
  
  applyMatrix4(m: Matrix4): this;
  applyQuaternion(q: Quaternion): this;
}
```

## 测试策略

### 测试金字塔

```
        /\
       /  \     E2E 测试
      /----\    少量，验证完整流程
     /      \
    /--------\   集成测试
   /          \  中量，验证组件交互
  /------------\
 /              \ 单元测试
/________________\ 大量，验证单个函数
```

### 单元测试

```typescript
// tests/math/Vector3.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from '@/math/Vector3';

describe('Vector3', () => {
  let v: Vector3;
  
  beforeEach(() => {
    v = new Vector3();
  });
  
  describe('constructor', () => {
    it('creates with default values', () => {
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
      expect(v.z).toBe(0);
    });
    
    it('creates with specified values', () => {
      const v = new Vector3(1, 2, 3);
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
      expect(v.z).toBe(3);
    });
  });
  
  describe('arithmetic operations', () => {
    it('adds vectors correctly', () => {
      v.set(1, 2, 3);
      v.add(new Vector3(4, 5, 6));
      expect(v).toEqual({ x: 5, y: 7, z: 9 });
    });
    
    it('subtracts vectors correctly', () => {
      v.set(4, 5, 6);
      v.sub(new Vector3(1, 2, 3));
      expect(v).toEqual({ x: 3, y: 3, z: 3 });
    });
    
    it('multiplies by scalar', () => {
      v.set(1, 2, 3);
      v.multiplyScalar(2);
      expect(v).toEqual({ x: 2, y: 4, z: 6 });
    });
  });
  
  describe('vector operations', () => {
    it('calculates length correctly', () => {
      v.set(3, 4, 0);
      expect(v.length()).toBe(5);
    });
    
    it('normalizes to unit vector', () => {
      v.set(3, 4, 0);
      v.normalize();
      expect(v.length()).toBeCloseTo(1);
    });
    
    it('calculates dot product', () => {
      const a = new Vector3(1, 0, 0);
      const b = new Vector3(0, 1, 0);
      expect(a.dot(b)).toBe(0);
    });
    
    it('calculates cross product', () => {
      const a = new Vector3(1, 0, 0);
      const b = new Vector3(0, 1, 0);
      a.cross(b);
      expect(a).toEqual({ x: 0, y: 0, z: 1 });
    });
  });
});
```

### 集成测试

```typescript
// tests/integration/render.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Mesh,
  BoxGeometry,
  MeshBasicMaterial,
} from '@/index';

describe('Render Integration', () => {
  let canvas: HTMLCanvasElement;
  let scene: Scene;
  let camera: PerspectiveCamera;
  let renderer: WebGLRenderer;
  
  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    scene = new Scene();
    camera = new PerspectiveCamera(75, 800 / 600, 0.1, 1000);
    camera.position.z = 5;
    
    renderer = new WebGLRenderer({ canvas });
    renderer.setSize(800, 600);
  });
  
  afterEach(() => {
    renderer.dispose();
  });
  
  it('renders a basic mesh', () => {
    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);
    
    // 不抛出错误
    expect(() => renderer.render(scene, camera)).not.toThrow();
  });
  
  it('updates mesh transform', () => {
    const mesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial({ color: 0xff0000 })
    );
    scene.add(mesh);
    
    mesh.position.set(1, 2, 3);
    mesh.rotation.y = Math.PI / 4;
    mesh.updateMatrixWorld();
    
    expect(mesh.matrixWorld.elements[12]).toBe(1);  // tx
    expect(mesh.matrixWorld.elements[13]).toBe(2);  // ty
    expect(mesh.matrixWorld.elements[14]).toBe(3);  // tz
  });
  
  it('handles scene hierarchy', () => {
    const parent = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial({ color: 0xff0000 })
    );
    const child = new Mesh(
      new BoxGeometry(0.5, 0.5, 0.5),
      new MeshBasicMaterial({ color: 0x00ff00 })
    );
    
    parent.add(child);
    scene.add(parent);
    
    parent.position.set(5, 0, 0);
    child.position.set(1, 0, 0);
    
    scene.updateMatrixWorld();
    
    // 子对象的世界位置是 6, 0, 0
    const worldPosition = child.getWorldPosition(new Vector3());
    expect(worldPosition.x).toBe(6);
  });
});
```

### 性能测试

```typescript
// tests/performance/vector3.bench.ts
import { bench, describe } from 'vitest';
import { Vector3 } from '@/math/Vector3';

describe('Vector3 Performance', () => {
  const a = new Vector3(1, 2, 3);
  const b = new Vector3(4, 5, 6);
  
  bench('add', () => {
    const v = new Vector3().copy(a);
    v.add(b);
  });
  
  bench('normalize', () => {
    const v = new Vector3().copy(a);
    v.normalize();
  });
  
  bench('cross', () => {
    const v = new Vector3().copy(a);
    v.cross(b);
  });
  
  bench('applyMatrix4', () => {
    const v = new Vector3().copy(a);
    const m = new Matrix4().makeRotationX(0.1);
    v.applyMatrix4(m);
  });
});
```

### 快照测试

```typescript
// tests/snapshots/geometry.test.ts
import { describe, it, expect } from 'vitest';
import { BoxGeometry } from '@/geometries/BoxGeometry';

describe('BoxGeometry Snapshot', () => {
  it('generates correct vertex data', () => {
    const geometry = new BoxGeometry(1, 1, 1);
    
    expect(geometry.getAttribute('position').array).toMatchSnapshot();
    expect(geometry.getAttribute('normal').array).toMatchSnapshot();
    expect(geometry.getAttribute('uv').array).toMatchSnapshot();
    expect(geometry.getIndex().array).toMatchSnapshot();
  });
});
```

## 测试工具

### Mock WebGL

```typescript
// tests/mocks/webgl.ts
export function createMockWebGLContext(): WebGLRenderingContext {
  return {
    canvas: document.createElement('canvas'),
    
    // 程序
    createProgram: () => ({}),
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    attachShader: () => {},
    linkProgram: () => {},
    useProgram: () => {},
    deleteProgram: () => {},
    deleteShader: () => {},
    
    // 缓冲区
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    deleteBuffer: () => {},
    
    // 纹理
    createTexture: () => ({}),
    bindTexture: () => {},
    texImage2D: () => {},
    texParameteri: () => {},
    deleteTexture: () => {},
    
    // 帧缓冲
    createFramebuffer: () => ({}),
    bindFramebuffer: () => {},
    framebufferTexture2D: () => {},
    deleteFramebuffer: () => {},
    
    // 状态
    enable: () => {},
    disable: () => {},
    depthFunc: () => {},
    blendFunc: () => {},
    cullFace: () => {},
    
    // 绘制
    clear: () => {},
    clearColor: () => {},
    viewport: () => {},
    drawArrays: () => {},
    drawElements: () => {},
    
    // 属性
    getAttribLocation: () => 0,
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    
    // Uniform
    getUniformLocation: () => ({}),
    uniform1i: () => {},
    uniform1f: () => {},
    uniform2f: () => {},
    uniform3f: () => {},
    uniform4f: () => {},
    uniformMatrix4fv: () => {},
    
    // 查询
    getParameter: () => null,
    getExtension: () => null,
    getSupportedExtensions: () => [],
    getError: () => 0,
    
    // 常量
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    STATIC_DRAW: 35044,
    TRIANGLES: 4,
    UNSIGNED_SHORT: 5123,
    FLOAT: 5126,
    // ... 其他常量
  } as unknown as WebGLRenderingContext;
}
```

### 测试辅助函数

```typescript
// tests/utils/helpers.ts
import { Vector3 } from '@/math/Vector3';
import { Matrix4 } from '@/math/Matrix4';

export function expectVectorClose(
  actual: Vector3,
  expected: Vector3,
  precision = 5
) {
  expect(actual.x).toBeCloseTo(expected.x, precision);
  expect(actual.y).toBeCloseTo(expected.y, precision);
  expect(actual.z).toBeCloseTo(expected.z, precision);
}

export function expectMatrixClose(
  actual: Matrix4,
  expected: Matrix4,
  precision = 5
) {
  for (let i = 0; i < 16; i++) {
    expect(actual.elements[i]).toBeCloseTo(expected.elements[i], precision);
  }
}

export function createRandomVector(): Vector3 {
  return new Vector3(
    Math.random() * 100 - 50,
    Math.random() * 100 - 50,
    Math.random() * 100 - 50
  );
}
```

## CI/CD 配置

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Lint
        run: npm run lint
      
      - name: Test
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
  
  build:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
```

### 发布流程

```yaml
# .github/workflows/publish.yml
name: Publish

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Publish
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 本章小结

- Vite + Rollup 提供现代构建体验
- 多格式输出支持不同使用场景
- 类型声明确保 IDE 支持
- 单元测试验证核心逻辑
- 集成测试验证组件协作
- CI/CD 保证代码质量

下一章，我们将深入学习向量与向量运算。
