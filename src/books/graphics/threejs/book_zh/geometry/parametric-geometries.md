# 参数化曲面几何体

> "参数化曲面通过数学公式定义形状，能创造出丰富多样的曲线与曲面。"

## TorusGeometry 圆环

```typescript
// src/geometries/TorusGeometry.ts
import { BufferGeometry } from '../core/BufferGeometry';
import { Float32BufferAttribute } from '../core/BufferAttribute';
import { Vector3 } from '../math/Vector3';

export class TorusGeometry extends BufferGeometry {
  readonly type = 'TorusGeometry';
  
  parameters: {
    radius: number;
    tube: number;
    radialSegments: number;
    tubularSegments: number;
    arc: number;
  };
  
  constructor(
    radius = 1,            // 圆环中心到管中心的距离
    tube = 0.4,           // 管的半径
    radialSegments = 12,   // 管截面分段数
    tubularSegments = 48, // 圆环分段数
    arc = Math.PI * 2     // 圆环弧度
  ) {
    super();
    
    this.parameters = { radius, tube, radialSegments, tubularSegments, arc };
    
    radialSegments = Math.floor(radialSegments);
    tubularSegments = Math.floor(tubularSegments);
    
    const indices: number[] = [];
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    
    const center = new Vector3();
    const vertex = new Vector3();
    const normal = new Vector3();
    
    // 生成顶点
    for (let j = 0; j <= radialSegments; j++) {
      for (let i = 0; i <= tubularSegments; i++) {
        const u = i / tubularSegments * arc;
        const v = j / radialSegments * Math.PI * 2;
        
        // 顶点位置
        vertex.x = (radius + tube * Math.cos(v)) * Math.cos(u);
        vertex.y = (radius + tube * Math.cos(v)) * Math.sin(u);
        vertex.z = tube * Math.sin(v);
        
        vertices.push(vertex.x, vertex.y, vertex.z);
        
        // 法线
        center.x = radius * Math.cos(u);
        center.y = radius * Math.sin(u);
        normal.subVectors(vertex, center).normalize();
        
        normals.push(normal.x, normal.y, normal.z);
        
        // UV
        uvs.push(i / tubularSegments, j / radialSegments);
      }
    }
    
    // 生成索引
    for (let j = 1; j <= radialSegments; j++) {
      for (let i = 1; i <= tubularSegments; i++) {
        const a = (tubularSegments + 1) * j + i - 1;
        const b = (tubularSegments + 1) * (j - 1) + i - 1;
        const c = (tubularSegments + 1) * (j - 1) + i;
        const d = (tubularSegments + 1) * j + i;
        
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    
    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  }
}
```

## 圆环参数化

```
圆环几何：

俯视图：                    截面图：
        ╱───╲                   ╭───╮
      ╱   ╭╮  ╲                ╱     ╲
     │   │  │   │             │   ●   │ ← tube（管半径）
      ╲  ╰╯   ╱                ╲     ╱
        ╲───╱                   ╰───╯
     ← radius →            ← radius →

参数方程：
x = (R + r·cos(v)) · cos(u)
y = (R + r·cos(v)) · sin(u)
z = r · sin(v)

其中：
R = radius（大半径）
r = tube（管半径）
u ∈ [0, arc]（绕主轴）
v ∈ [0, 2π]（绕管）
```

## TorusKnotGeometry 环面纽结

```typescript
// src/geometries/TorusKnotGeometry.ts
export class TorusKnotGeometry extends BufferGeometry {
  readonly type = 'TorusKnotGeometry';
  
  parameters: {
    radius: number;
    tube: number;
    tubularSegments: number;
    radialSegments: number;
    p: number;
    q: number;
  };
  
  constructor(
    radius = 1,
    tube = 0.4,
    tubularSegments = 64,
    radialSegments = 8,
    p = 2,  // 绕轴旋转次数
    q = 3   // 绕中心孔穿过次数
  ) {
    super();
    
    this.parameters = { radius, tube, tubularSegments, radialSegments, p, q };
    
    tubularSegments = Math.floor(tubularSegments);
    radialSegments = Math.floor(radialSegments);
    
    const indices: number[] = [];
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    
    const vertex = new Vector3();
    const normal = new Vector3();
    
    const P1 = new Vector3();
    const P2 = new Vector3();
    const B = new Vector3();
    const T = new Vector3();
    const N = new Vector3();
    
    // 计算环面纽结曲线上的点
    function calculatePositionOnCurve(
      u: number, p: number, q: number,
      radius: number, position: Vector3
    ): void {
      const cu = Math.cos(u);
      const su = Math.sin(u);
      const quOverP = q / p * u;
      const cs = Math.cos(quOverP);
      
      position.x = radius * (2 + cs) * 0.5 * cu;
      position.y = radius * (2 + cs) * su * 0.5;
      position.z = radius * Math.sin(quOverP) * 0.5;
    }
    
    // 生成顶点
    for (let i = 0; i <= tubularSegments; i++) {
      const u = i / tubularSegments * p * Math.PI * 2;
      
      calculatePositionOnCurve(u, p, q, radius, P1);
      calculatePositionOnCurve(u + 0.01, p, q, radius, P2);
      
      // 切线
      T.subVectors(P2, P1);
      // 法线（Frenet 框架）
      N.addVectors(P2, P1);
      // 副法线
      B.crossVectors(T, N);
      N.crossVectors(B, T);
      
      B.normalize();
      N.normalize();
      
      for (let j = 0; j <= radialSegments; j++) {
        const v = j / radialSegments * Math.PI * 2;
        const cx = -tube * Math.cos(v);
        const cy = tube * Math.sin(v);
        
        vertex.x = P1.x + (cx * N.x + cy * B.x);
        vertex.y = P1.y + (cx * N.y + cy * B.y);
        vertex.z = P1.z + (cx * N.z + cy * B.z);
        
        vertices.push(vertex.x, vertex.y, vertex.z);
        
        normal.subVectors(vertex, P1).normalize();
        normals.push(normal.x, normal.y, normal.z);
        
        uvs.push(i / tubularSegments, j / radialSegments);
      }
    }
    
    // 生成索引
    for (let j = 1; j <= tubularSegments; j++) {
      for (let i = 1; i <= radialSegments; i++) {
        const a = (radialSegments + 1) * (j - 1) + (i - 1);
        const b = (radialSegments + 1) * j + (i - 1);
        const c = (radialSegments + 1) * j + i;
        const d = (radialSegments + 1) * (j - 1) + i;
        
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    
    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  }
}
```

## 常见环面纽结

```
不同 p, q 参数的环面纽结：

p=2, q=3 (Trefoil Knot)     p=3, q=2
      ╱╲                         ╱╲
     ╱  ╲                       ╱  ╲
    │    │                     │    │
     ╲╱╲╱                       ╲──╱
      ╲╱                          ╲╱

p=2, q=5                    p=3, q=4
    ╱╲╱╲                      复杂扭曲
   ╱    ╲
  │      │
   ╲    ╱
    ╲╱╲╱

规则：
- p 和 q 互质时形成纽结
- p 和 q 有公因数时形成链接
```

## RingGeometry 圆环平面

```typescript
// src/geometries/RingGeometry.ts
export class RingGeometry extends BufferGeometry {
  readonly type = 'RingGeometry';
  
  parameters: {
    innerRadius: number;
    outerRadius: number;
    thetaSegments: number;
    phiSegments: number;
    thetaStart: number;
    thetaLength: number;
  };
  
  constructor(
    innerRadius = 0.5,
    outerRadius = 1,
    thetaSegments = 32,
    phiSegments = 1,
    thetaStart = 0,
    thetaLength = Math.PI * 2
  ) {
    super();
    
    this.parameters = {
      innerRadius, outerRadius,
      thetaSegments, phiSegments,
      thetaStart, thetaLength
    };
    
    thetaSegments = Math.max(3, thetaSegments);
    phiSegments = Math.max(1, phiSegments);
    
    const indices: number[] = [];
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    
    // 生成顶点
    let radius = innerRadius;
    const radiusStep = (outerRadius - innerRadius) / phiSegments;
    const vertex = new Vector3();
    const uv = new Vector2();
    
    for (let j = 0; j <= phiSegments; j++) {
      for (let i = 0; i <= thetaSegments; i++) {
        const segment = thetaStart + i / thetaSegments * thetaLength;
        
        vertex.x = radius * Math.cos(segment);
        vertex.y = radius * Math.sin(segment);
        vertex.z = 0;
        
        vertices.push(vertex.x, vertex.y, vertex.z);
        normals.push(0, 0, 1);
        
        uv.x = (vertex.x / outerRadius + 1) / 2;
        uv.y = (vertex.y / outerRadius + 1) / 2;
        uvs.push(uv.x, uv.y);
      }
      
      radius += radiusStep;
    }
    
    // 生成索引
    for (let j = 0; j < phiSegments; j++) {
      const thetaSegmentLevel = j * (thetaSegments + 1);
      
      for (let i = 0; i < thetaSegments; i++) {
        const segment = i + thetaSegmentLevel;
        
        const a = segment;
        const b = segment + thetaSegments + 1;
        const c = segment + thetaSegments + 2;
        const d = segment + 1;
        
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    
    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  }
}
```

## LatheGeometry 车削几何体

```typescript
// src/geometries/LatheGeometry.ts
// 绕 Y 轴旋转 2D 轮廓生成 3D 形状
export class LatheGeometry extends BufferGeometry {
  readonly type = 'LatheGeometry';
  
  parameters: {
    points: Vector2[];
    segments: number;
    phiStart: number;
    phiLength: number;
  };
  
  constructor(
    points: Vector2[] = [
      new Vector2(0, -0.5),
      new Vector2(0.5, 0),
      new Vector2(0, 0.5)
    ],
    segments = 12,
    phiStart = 0,
    phiLength = Math.PI * 2
  ) {
    super();
    
    this.parameters = { points, segments, phiStart, phiLength };
    
    segments = Math.floor(segments);
    
    const indices: number[] = [];
    const vertices: number[] = [];
    const uvs: number[] = [];
    const initNormals: number[] = [];
    const normals: number[] = [];
    
    // 计算初始法线（2D 轮廓的法线）
    const vertex = new Vector3();
    const prevVertex = new Vector3();
    const nextVertex = new Vector3();
    
    for (let i = 0; i < points.length; i++) {
      const prev = points[i === 0 ? points.length - 1 : i - 1];
      const curr = points[i];
      const next = points[i === points.length - 1 ? 0 : i + 1];
      
      prevVertex.set(prev.x, prev.y, 0);
      vertex.set(curr.x, curr.y, 0);
      nextVertex.set(next.x, next.y, 0);
      
      const dx1 = vertex.x - prevVertex.x;
      const dy1 = vertex.y - prevVertex.y;
      const dx2 = nextVertex.x - vertex.x;
      const dy2 = nextVertex.y - vertex.y;
      
      // 平均法线
      const nx = dy1 + dy2;
      const ny = -(dx1 + dx2);
      const len = Math.sqrt(nx * nx + ny * ny);
      
      initNormals.push(nx / len, ny / len);
    }
    
    // 生成顶点
    for (let i = 0; i <= segments; i++) {
      const phi = phiStart + i / segments * phiLength;
      const sin = Math.sin(phi);
      const cos = Math.cos(phi);
      
      for (let j = 0; j < points.length; j++) {
        // 位置
        vertex.x = points[j].x * sin;
        vertex.y = points[j].y;
        vertex.z = points[j].x * cos;
        
        vertices.push(vertex.x, vertex.y, vertex.z);
        
        // 法线
        const nx = initNormals[j * 2] * sin;
        const ny = initNormals[j * 2 + 1];
        const nz = initNormals[j * 2] * cos;
        
        normals.push(nx, ny, nz);
        
        // UV
        uvs.push(i / segments, j / (points.length - 1));
      }
    }
    
    // 生成索引
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < points.length - 1; j++) {
        const base = j + i * points.length;
        
        const a = base;
        const b = base + points.length;
        const c = base + points.length + 1;
        const d = base + 1;
        
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    
    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  }
}
```

## 车削原理

```
车削（Lathe）：

2D 轮廓：              旋转后：
    │                    ╱│╲
    ●                   ╱ │ ╲
   ╱                   │  │  │
  ●                    │ ─┼─ │
   ╲                   │  │  │
    ●───              ╲ │ ╱
    Y轴                 ╲│╱

应用示例：
- 花瓶
- 酒杯
- 棋子
- 柱子
```

## TubeGeometry 管道

```typescript
// src/geometries/TubeGeometry.ts
// 沿曲线生成管道
export class TubeGeometry extends BufferGeometry {
  readonly type = 'TubeGeometry';
  
  parameters: {
    path: Curve;
    tubularSegments: number;
    radius: number;
    radialSegments: number;
    closed: boolean;
  };
  
  tangents: Vector3[];
  normals: Vector3[];
  binormals: Vector3[];
  
  constructor(
    path: Curve = new QuadraticBezierCurve3(
      new Vector3(-1, -1, 0),
      new Vector3(-1, 1, 0),
      new Vector3(1, 1, 0)
    ),
    tubularSegments = 64,
    radius = 1,
    radialSegments = 8,
    closed = false
  ) {
    super();
    
    this.parameters = { path, tubularSegments, radius, radialSegments, closed };
    
    tubularSegments = Math.floor(tubularSegments);
    radialSegments = Math.floor(radialSegments);
    
    // 计算 Frenet 框架
    const frames = path.computeFrenetFrames(tubularSegments, closed);
    
    this.tangents = frames.tangents;
    this.normals = frames.normals;
    this.binormals = frames.binormals;
    
    const vertex = new Vector3();
    const normal = new Vector3();
    const uv = new Vector2();
    let P = new Vector3();
    
    const indices: number[] = [];
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    
    // 生成顶点
    for (let i = 0; i <= tubularSegments; i++) {
      generateSegment(i);
    }
    
    // 生成索引
    for (let j = 1; j <= tubularSegments; j++) {
      for (let i = 1; i <= radialSegments; i++) {
        const a = (radialSegments + 1) * (j - 1) + (i - 1);
        const b = (radialSegments + 1) * j + (i - 1);
        const c = (radialSegments + 1) * j + i;
        const d = (radialSegments + 1) * (j - 1) + i;
        
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    
    function generateSegment(i: number) {
      P = path.getPointAt(i / tubularSegments, P);
      
      const N = frames.normals[i];
      const B = frames.binormals[i];
      
      for (let j = 0; j <= radialSegments; j++) {
        const v = j / radialSegments * Math.PI * 2;
        const sin = Math.sin(v);
        const cos = -Math.cos(v);
        
        // 法线
        normal.x = cos * N.x + sin * B.x;
        normal.y = cos * N.y + sin * B.y;
        normal.z = cos * N.z + sin * B.z;
        normal.normalize();
        
        normals.push(normal.x, normal.y, normal.z);
        
        // 顶点位置
        vertex.x = P.x + radius * normal.x;
        vertex.y = P.y + radius * normal.y;
        vertex.z = P.z + radius * normal.z;
        
        vertices.push(vertex.x, vertex.y, vertex.z);
        
        // UV
        uvs.push(i / tubularSegments, j / radialSegments);
      }
    }
    
    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  }
}
```

## 使用示例

```typescript
// 圆环
const torus = new TorusGeometry(1, 0.4, 16, 100);

// 环面纽结
const knot = new TorusKnotGeometry(1, 0.3, 100, 16, 2, 3);

// 圆环平面（如光环）
const ring = new RingGeometry(0.5, 1, 32);

// 车削几何体（花瓶）
const vaseProfile = [
  new Vector2(0, -1),
  new Vector2(0.5, -0.8),
  new Vector2(0.7, 0),
  new Vector2(0.5, 0.8),
  new Vector2(0.3, 1),
];
const vase = new LatheGeometry(vaseProfile, 32);

// 管道沿贝塞尔曲线
const curve = new CubicBezierCurve3(
  new Vector3(-5, 0, 0),
  new Vector3(-2, 3, 0),
  new Vector3(2, -3, 0),
  new Vector3(5, 0, 0)
);
const tube = new TubeGeometry(curve, 64, 0.5, 8, false);
```

## 本章小结

- TorusGeometry 通过两个角度参数化
- TorusKnotGeometry 创建复杂的数学曲面
- LatheGeometry 车削 2D 轮廓生成旋转体
- TubeGeometry 沿任意曲线生成管道
- 参数化曲面提供无限的形状可能性

下一章，我们将学习挤出和路径几何体。
