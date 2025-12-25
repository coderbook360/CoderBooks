# 项目配置与初始化

> "良好的开端是成功的一半，正确的项目配置让开发更顺畅。"

## 环境准备

### 开发环境要求

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | ≥ 16.0 | 运行构建工具 |
| npm/pnpm | 最新版 | 包管理 |
| VS Code | 推荐 | 代码编辑器 |
| Chrome | 最新版 | 调试浏览器 |

### 初始化项目

```bash
# 创建项目目录
mkdir mini-three
cd mini-three

# 初始化 npm
npm init -y

# 安装开发依赖
npm install -D typescript vite @types/node
```

### 目录结构

```
mini-three/
├── src/
│   ├── math/
│   │   ├── Vector2.ts
│   │   ├── Vector3.ts
│   │   ├── Vector4.ts
│   │   ├── Matrix3.ts
│   │   ├── Matrix4.ts
│   │   ├── Quaternion.ts
│   │   ├── Euler.ts
│   │   └── Color.ts
│   ├── core/
│   │   ├── EventDispatcher.ts
│   │   ├── Object3D.ts
│   │   ├── Scene.ts
│   │   ├── BufferAttribute.ts
│   │   ├── BufferGeometry.ts
│   │   └── Mesh.ts
│   ├── cameras/
│   │   ├── Camera.ts
│   │   └── PerspectiveCamera.ts
│   ├── lights/
│   │   ├── Light.ts
│   │   └── DirectionalLight.ts
│   ├── materials/
│   │   ├── Material.ts
│   │   └── MeshBasicMaterial.ts
│   ├── renderers/
│   │   └── WebGLRenderer.ts
│   ├── constants.ts
│   └── index.ts
├── examples/
│   ├── basic.html
│   └── basic.ts
├── tests/
│   └── math/
│       └── Vector3.test.ts
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## TypeScript 配置

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "examples", "tests"]
}
```

### 严格模式的好处

```typescript
// strict: true 会启用所有严格检查

// noImplicitAny: 禁止隐式 any
function add(a: number, b: number) {  // 必须声明类型
  return a + b;
}

// strictNullChecks: null 检查
function process(value: string | null) {
  if (value !== null) {
    console.log(value.length);  // 必须先检查
  }
}

// exactOptionalPropertyTypes: 精确可选类型
interface Options {
  color?: string;  // string | undefined，不能是 null
}
```

## Vite 配置

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MiniThree',
      fileName: (format) => `mini-three.${format}.js`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      output: {
        globals: {},
      },
    },
    sourcemap: true,
    minify: 'terser',
  },
  
  server: {
    port: 3000,
    open: '/examples/basic.html',
  },
});
```

### package.json

```json
{
  "name": "mini-three",
  "version": "0.0.1",
  "description": "A minimal Three.js implementation",
  "type": "module",
  "main": "./dist/mini-three.umd.js",
  "module": "./dist/mini-three.es.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/mini-three.es.js",
      "require": "./dist/mini-three.umd.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint src --ext .ts",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "@types/node": "^20.0.0",
    "vitest": "^1.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0"
  }
}
```

## 常量定义

### src/constants.ts

```typescript
// 渲染面
export const FrontSide = 0;
export const BackSide = 1;
export const DoubleSide = 2;

// 混合模式
export const NoBlending = 0;
export const NormalBlending = 1;
export const AdditiveBlending = 2;
export const SubtractiveBlending = 3;
export const MultiplyBlending = 4;

// 深度测试函数
export const NeverDepth = 0;
export const AlwaysDepth = 1;
export const LessDepth = 2;
export const LessEqualDepth = 3;
export const EqualDepth = 4;
export const GreaterEqualDepth = 5;
export const GreaterDepth = 6;
export const NotEqualDepth = 7;

// 纹理包裹模式
export const RepeatWrapping = 1000;
export const ClampToEdgeWrapping = 1001;
export const MirroredRepeatWrapping = 1002;

// 纹理过滤
export const NearestFilter = 1003;
export const NearestMipmapNearestFilter = 1004;
export const NearestMipmapLinearFilter = 1005;
export const LinearFilter = 1006;
export const LinearMipmapNearestFilter = 1007;
export const LinearMipmapLinearFilter = 1008;

// 纹理格式
export const AlphaFormat = 1009;
export const RGBFormat = 1010;
export const RGBAFormat = 1011;
export const LuminanceFormat = 1012;
export const LuminanceAlphaFormat = 1013;

// 纹理类型
export const UnsignedByteType = 1014;
export const ByteType = 1015;
export const ShortType = 1016;
export const UnsignedShortType = 1017;
export const IntType = 1018;
export const UnsignedIntType = 1019;
export const FloatType = 1020;
export const HalfFloatType = 1021;

// 颜色空间
export const NoColorSpace = '';
export const SRGBColorSpace = 'srgb';
export const LinearSRGBColorSpace = 'srgb-linear';

// 属性用途
export const StaticDrawUsage = 35044;
export const DynamicDrawUsage = 35048;
export const StreamDrawUsage = 35040;

// 三角形绘制模式
export const TrianglesDrawMode = 0;
export const TriangleStripDrawMode = 1;
export const TriangleFanDrawMode = 2;
```

### 类型定义

```typescript
// src/types.ts

// 渲染面类型
export type Side = 0 | 1 | 2;

// 混合模式类型
export type Blending = 0 | 1 | 2 | 3 | 4;

// 颜色空间类型
export type ColorSpace = '' | 'srgb' | 'srgb-linear';

// 纹理包裹模式类型
export type Wrapping = 1000 | 1001 | 1002;

// 纹理过滤类型
export type TextureFilter = 1003 | 1004 | 1005 | 1006 | 1007 | 1008;

// 数组类型
export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;
```

## 入口文件

### src/index.ts

```typescript
// Math
export { Vector2 } from './math/Vector2';
export { Vector3 } from './math/Vector3';
export { Vector4 } from './math/Vector4';
export { Matrix3 } from './math/Matrix3';
export { Matrix4 } from './math/Matrix4';
export { Quaternion } from './math/Quaternion';
export { Euler } from './math/Euler';
export { Color } from './math/Color';

// Core
export { EventDispatcher } from './core/EventDispatcher';
export { Object3D } from './core/Object3D';
export { Scene } from './core/Scene';
export { BufferAttribute } from './core/BufferAttribute';
export { BufferGeometry } from './core/BufferGeometry';
export { Mesh } from './core/Mesh';

// Cameras
export { Camera } from './cameras/Camera';
export { PerspectiveCamera } from './cameras/PerspectiveCamera';

// Lights
export { Light } from './lights/Light';
export { DirectionalLight } from './lights/DirectionalLight';

// Materials
export { Material } from './materials/Material';
export { MeshBasicMaterial } from './materials/MeshBasicMaterial';

// Renderers
export { WebGLRenderer } from './renderers/WebGLRenderer';

// Constants
export * from './constants';
```

## 示例文件

### examples/basic.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mini Three.js - Basic Example</title>
  <style>
    * { margin: 0; padding: 0; }
    body { overflow: hidden; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script type="module" src="./basic.ts"></script>
</body>
</html>
```

### examples/basic.ts

```typescript
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Mesh,
  BoxGeometry,
  MeshBasicMaterial,
} from '../src';

// 创建场景
const scene = new Scene();

// 创建相机
const camera = new PerspectiveCamera(
  75,                           // 视角
  window.innerWidth / window.innerHeight,  // 宽高比
  0.1,                          // 近裁剪面
  1000                          // 远裁剪面
);
camera.position.z = 5;

// 创建渲染器
const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 创建立方体
const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshBasicMaterial({ color: 0x00ff00 });
const cube = new Mesh(geometry, material);
scene.add(cube);

// 动画循环
function animate() {
  requestAnimationFrame(animate);
  
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  
  renderer.render(scene, camera);
}

animate();

// 响应窗口大小变化
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

## 测试配置

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
```

### tests/math/Vector3.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { Vector3 } from '@/math/Vector3';

describe('Vector3', () => {
  it('should create with default values', () => {
    const v = new Vector3();
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
  });
  
  it('should create with given values', () => {
    const v = new Vector3(1, 2, 3);
    expect(v.x).toBe(1);
    expect(v.y).toBe(2);
    expect(v.z).toBe(3);
  });
  
  it('should add vectors', () => {
    const a = new Vector3(1, 2, 3);
    const b = new Vector3(4, 5, 6);
    a.add(b);
    expect(a.x).toBe(5);
    expect(a.y).toBe(7);
    expect(a.z).toBe(9);
  });
  
  it('should calculate length', () => {
    const v = new Vector3(3, 4, 0);
    expect(v.length()).toBe(5);
  });
  
  it('should normalize', () => {
    const v = new Vector3(3, 4, 0);
    v.normalize();
    expect(v.length()).toBeCloseTo(1);
    expect(v.x).toBeCloseTo(0.6);
    expect(v.y).toBeCloseTo(0.8);
    expect(v.z).toBeCloseTo(0);
  });
  
  it('should calculate dot product', () => {
    const a = new Vector3(1, 0, 0);
    const b = new Vector3(0, 1, 0);
    expect(a.dot(b)).toBe(0);  // 垂直
    
    const c = new Vector3(1, 0, 0);
    expect(a.dot(c)).toBe(1);  // 平行同向
  });
  
  it('should calculate cross product', () => {
    const a = new Vector3(1, 0, 0);
    const b = new Vector3(0, 1, 0);
    const c = a.clone().cross(b);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
    expect(c.z).toBe(1);
  });
});
```

## 开发流程

### 启动开发服务器

```bash
# 启动 Vite 开发服务器
npm run dev

# 浏览器访问 http://localhost:3000
```

### 运行测试

```bash
# 运行测试
npm test

# 监视模式
npm test -- --watch

# 覆盖率报告
npm test -- --coverage
```

### 构建发布

```bash
# 类型检查
npm run type-check

# 构建
npm run build

# 预览构建结果
npm run preview
```

## 本章小结

- 使用 TypeScript 确保类型安全
- Vite 提供快速的开发体验
- 合理的目录结构让代码易于维护
- 常量定义提高可读性
- 测试保证代码质量
- 完善的构建配置支持多种使用方式

下一章，我们将学习构建系统与测试策略。
