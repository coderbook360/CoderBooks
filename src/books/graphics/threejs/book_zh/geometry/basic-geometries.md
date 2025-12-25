# 基础几何体

> "立方体、球体、平面——这些基础形状是构建 3D 世界的积木。"

## BoxGeometry 立方体

```typescript
// src/geometries/BoxGeometry.ts
import { BufferGeometry } from '../core/BufferGeometry';
import { Float32BufferAttribute } from '../core/BufferAttribute';

export class BoxGeometry extends BufferGeometry {
  readonly type = 'BoxGeometry';
  
  parameters: {
    width: number;
    height: number;
    depth: number;
    widthSegments: number;
    heightSegments: number;
    depthSegments: number;
  };
  
  constructor(
    width = 1,
    height = 1,
    depth = 1,
    widthSegments = 1,
    heightSegments = 1,
    depthSegments = 1
  ) {
    super();
    
    this.parameters = {
      width, height, depth,
      widthSegments, heightSegments, depthSegments
    };
    
    // 确保分段数为整数
    widthSegments = Math.floor(widthSegments);
    heightSegments = Math.floor(heightSegments);
    depthSegments = Math.floor(depthSegments);
    
    // 缓存数据
    const indices: number[] = [];
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    
    let numberOfVertices = 0;
    let groupStart = 0;
    
    // 构建每个面
    buildPlane('z', 'y', 'x', -1, -1, depth, height, width, depthSegments, heightSegments, 0); // +X
    buildPlane('z', 'y', 'x', 1, -1, depth, height, -width, depthSegments, heightSegments, 1); // -X
    buildPlane('x', 'z', 'y', 1, 1, width, depth, height, widthSegments, depthSegments, 2);   // +Y
    buildPlane('x', 'z', 'y', 1, -1, width, depth, -height, widthSegments, depthSegments, 3); // -Y
    buildPlane('x', 'y', 'z', 1, -1, width, height, depth, widthSegments, heightSegments, 4); // +Z
    buildPlane('x', 'y', 'z', -1, -1, width, height, -depth, widthSegments, heightSegments, 5); // -Z
    
    // 构建单个面
    function buildPlane(
      u: string, v: string, w: string,
      udir: number, vdir: number,
      width: number, height: number, depth: number,
      gridX: number, gridY: number,
      materialIndex: number
    ) {
      const segmentWidth = width / gridX;
      const segmentHeight = height / gridY;
      
      const widthHalf = width / 2;
      const heightHalf = height / 2;
      const depthHalf = depth / 2;
      
      const gridX1 = gridX + 1;
      const gridY1 = gridY + 1;
      
      let vertexCounter = 0;
      let groupCount = 0;
      
      const vector = { x: 0, y: 0, z: 0 };
      
      // 生成顶点、法线和 UV
      for (let iy = 0; iy < gridY1; iy++) {
        const y = iy * segmentHeight - heightHalf;
        
        for (let ix = 0; ix < gridX1; ix++) {
          const x = ix * segmentWidth - widthHalf;
          
          // 设置位置
          vector[u as keyof typeof vector] = x * udir;
          vector[v as keyof typeof vector] = y * vdir;
          vector[w as keyof typeof vector] = depthHalf;
          
          vertices.push(vector.x, vector.y, vector.z);
          
          // 设置法线
          vector[u as keyof typeof vector] = 0;
          vector[v as keyof typeof vector] = 0;
          vector[w as keyof typeof vector] = depth > 0 ? 1 : -1;
          
          normals.push(vector.x, vector.y, vector.z);
          
          // 设置 UV
          uvs.push(ix / gridX, 1 - (iy / gridY));
          
          vertexCounter++;
        }
      }
      
      // 生成索引
      for (let iy = 0; iy < gridY; iy++) {
        for (let ix = 0; ix < gridX; ix++) {
          const a = numberOfVertices + ix + gridX1 * iy;
          const b = numberOfVertices + ix + gridX1 * (iy + 1);
          const c = numberOfVertices + (ix + 1) + gridX1 * (iy + 1);
          const d = numberOfVertices + (ix + 1) + gridX1 * iy;
          
          // 两个三角形
          indices.push(a, b, d);
          indices.push(b, c, d);
          
          groupCount += 6;
        }
      }
      
      // 添加组（多材质支持）
      this.addGroup(groupStart, groupCount, materialIndex);
      
      groupStart += groupCount;
      numberOfVertices += vertexCounter;
    }
    
    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  }
  
  static fromJSON(data: any): BoxGeometry {
    return new BoxGeometry(
      data.width,
      data.height,
      data.depth,
      data.widthSegments,
      data.heightSegments,
      data.depthSegments
    );
  }
}
```

## 立方体结构

```
BoxGeometry 顶点布局：

        v4 ─────── v5
       ╱│        ╱│
      ╱ │       ╱ │
     v0 ─────── v1│
     │  │      │  │
     │  v7 ────│─ v6
     │ ╱       │ ╱
     │╱        │╱
     v3 ─────── v2

6 个面，每面独立顶点（硬边）：
- 24 个顶点（6 面 × 4 顶点）
- 36 个索引（6 面 × 2 三角形 × 3 顶点）
```

## SphereGeometry 球体

```typescript
// src/geometries/SphereGeometry.ts
export class SphereGeometry extends BufferGeometry {
  readonly type = 'SphereGeometry';
  
  parameters: {
    radius: number;
    widthSegments: number;
    heightSegments: number;
    phiStart: number;
    phiLength: number;
    thetaStart: number;
    thetaLength: number;
  };
  
  constructor(
    radius = 1,
    widthSegments = 32,
    heightSegments = 16,
    phiStart = 0,
    phiLength = Math.PI * 2,
    thetaStart = 0,
    thetaLength = Math.PI
  ) {
    super();
    
    this.parameters = {
      radius, widthSegments, heightSegments,
      phiStart, phiLength, thetaStart, thetaLength
    };
    
    widthSegments = Math.max(3, Math.floor(widthSegments));
    heightSegments = Math.max(2, Math.floor(heightSegments));
    
    const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI);
    
    let index = 0;
    const grid: number[][] = [];
    
    const vertex = new Vector3();
    const normal = new Vector3();
    
    const indices: number[] = [];
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    
    // 生成顶点
    for (let iy = 0; iy <= heightSegments; iy++) {
      const verticesRow: number[] = [];
      const v = iy / heightSegments;
      
      // 极点特殊处理
      let uOffset = 0;
      if (iy === 0 && thetaStart === 0) {
        uOffset = 0.5 / widthSegments;
      } else if (iy === heightSegments && thetaEnd === Math.PI) {
        uOffset = -0.5 / widthSegments;
      }
      
      for (let ix = 0; ix <= widthSegments; ix++) {
        const u = ix / widthSegments;
        
        // 球面坐标转笛卡尔坐标
        vertex.x = -radius * Math.cos(phiStart + u * phiLength) * 
                   Math.sin(thetaStart + v * thetaLength);
        vertex.y = radius * Math.cos(thetaStart + v * thetaLength);
        vertex.z = radius * Math.sin(phiStart + u * phiLength) * 
                   Math.sin(thetaStart + v * thetaLength);
        
        vertices.push(vertex.x, vertex.y, vertex.z);
        
        // 法线就是归一化的位置
        normal.copy(vertex).normalize();
        normals.push(normal.x, normal.y, normal.z);
        
        // UV
        uvs.push(u + uOffset, 1 - v);
        
        verticesRow.push(index++);
      }
      
      grid.push(verticesRow);
    }
    
    // 生成索引
    for (let iy = 0; iy < heightSegments; iy++) {
      for (let ix = 0; ix < widthSegments; ix++) {
        const a = grid[iy][ix + 1];
        const b = grid[iy][ix];
        const c = grid[iy + 1][ix];
        const d = grid[iy + 1][ix + 1];
        
        // 跳过极点退化三角形
        if (iy !== 0 || thetaStart > 0) {
          indices.push(a, b, d);
        }
        if (iy !== heightSegments - 1 || thetaEnd < Math.PI) {
          indices.push(b, c, d);
        }
      }
    }
    
    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  }
}
```

## 球体参数化

```
球面坐标系：

         Y (up)
         │
         │ θ (theta, 仰角)
         │╱
─────────●───────── X
        ╱│
       ╱ │
      ╱  │
     Z   φ (phi, 方位角)

公式：
x = r × sin(θ) × cos(φ)
y = r × cos(θ)
z = r × sin(θ) × sin(φ)

部分球面：
phiStart, phiLength   → 控制水平范围
thetaStart, thetaLength → 控制垂直范围
```

## PlaneGeometry 平面

```typescript
// src/geometries/PlaneGeometry.ts
export class PlaneGeometry extends BufferGeometry {
  readonly type = 'PlaneGeometry';
  
  parameters: {
    width: number;
    height: number;
    widthSegments: number;
    heightSegments: number;
  };
  
  constructor(
    width = 1,
    height = 1,
    widthSegments = 1,
    heightSegments = 1
  ) {
    super();
    
    this.parameters = { width, height, widthSegments, heightSegments };
    
    const width_half = width / 2;
    const height_half = height / 2;
    
    const gridX = Math.floor(widthSegments);
    const gridY = Math.floor(heightSegments);
    
    const gridX1 = gridX + 1;
    const gridY1 = gridY + 1;
    
    const segment_width = width / gridX;
    const segment_height = height / gridY;
    
    const indices: number[] = [];
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    
    // 生成顶点
    for (let iy = 0; iy < gridY1; iy++) {
      const y = iy * segment_height - height_half;
      
      for (let ix = 0; ix < gridX1; ix++) {
        const x = ix * segment_width - width_half;
        
        vertices.push(x, -y, 0);  // XY 平面，面向 +Z
        normals.push(0, 0, 1);
        uvs.push(ix / gridX, 1 - (iy / gridY));
      }
    }
    
    // 生成索引
    for (let iy = 0; iy < gridY; iy++) {
      for (let ix = 0; ix < gridX; ix++) {
        const a = ix + gridX1 * iy;
        const b = ix + gridX1 * (iy + 1);
        const c = (ix + 1) + gridX1 * (iy + 1);
        const d = (ix + 1) + gridX1 * iy;
        
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

## CylinderGeometry 圆柱体

```typescript
// src/geometries/CylinderGeometry.ts
export class CylinderGeometry extends BufferGeometry {
  readonly type = 'CylinderGeometry';
  
  parameters: {
    radiusTop: number;
    radiusBottom: number;
    height: number;
    radialSegments: number;
    heightSegments: number;
    openEnded: boolean;
    thetaStart: number;
    thetaLength: number;
  };
  
  constructor(
    radiusTop = 1,
    radiusBottom = 1,
    height = 1,
    radialSegments = 32,
    heightSegments = 1,
    openEnded = false,
    thetaStart = 0,
    thetaLength = Math.PI * 2
  ) {
    super();
    
    this.parameters = {
      radiusTop, radiusBottom, height,
      radialSegments, heightSegments,
      openEnded, thetaStart, thetaLength
    };
    
    radialSegments = Math.floor(radialSegments);
    heightSegments = Math.floor(heightSegments);
    
    const indices: number[] = [];
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    
    let index = 0;
    const indexArray: number[][] = [];
    const halfHeight = height / 2;
    let groupStart = 0;
    
    // 侧面
    generateTorso();
    
    // 端盖
    if (!openEnded) {
      if (radiusTop > 0) generateCap(true);
      if (radiusBottom > 0) generateCap(false);
    }
    
    function generateTorso() {
      const normal = new Vector3();
      const vertex = new Vector3();
      
      let groupCount = 0;
      
      // 计算斜面法线
      const slope = (radiusBottom - radiusTop) / height;
      
      for (let y = 0; y <= heightSegments; y++) {
        const indexRow: number[] = [];
        const v = y / heightSegments;
        const radius = v * (radiusBottom - radiusTop) + radiusTop;
        
        for (let x = 0; x <= radialSegments; x++) {
          const u = x / radialSegments;
          const theta = u * thetaLength + thetaStart;
          
          const sinTheta = Math.sin(theta);
          const cosTheta = Math.cos(theta);
          
          // 顶点
          vertex.x = radius * sinTheta;
          vertex.y = -v * height + halfHeight;
          vertex.z = radius * cosTheta;
          vertices.push(vertex.x, vertex.y, vertex.z);
          
          // 法线（考虑斜面）
          normal.set(sinTheta, slope, cosTheta).normalize();
          normals.push(normal.x, normal.y, normal.z);
          
          // UV
          uvs.push(u, 1 - v);
          
          indexRow.push(index++);
        }
        
        indexArray.push(indexRow);
      }
      
      // 索引
      for (let x = 0; x < radialSegments; x++) {
        for (let y = 0; y < heightSegments; y++) {
          const a = indexArray[y][x];
          const b = indexArray[y + 1][x];
          const c = indexArray[y + 1][x + 1];
          const d = indexArray[y][x + 1];
          
          indices.push(a, b, d);
          indices.push(b, c, d);
          
          groupCount += 6;
        }
      }
      
      this.addGroup(groupStart, groupCount, 0);
      groupStart += groupCount;
    }
    
    function generateCap(top: boolean) {
      const centerIndexStart = index;
      
      const radius = top ? radiusTop : radiusBottom;
      const sign = top ? 1 : -1;
      
      let groupCount = 0;
      
      // 中心顶点
      for (let x = 1; x <= radialSegments; x++) {
        vertices.push(0, halfHeight * sign, 0);
        normals.push(0, sign, 0);
        uvs.push(0.5, 0.5);
        index++;
      }
      
      const centerIndexEnd = index;
      
      // 边缘顶点
      for (let x = 0; x <= radialSegments; x++) {
        const u = x / radialSegments;
        const theta = u * thetaLength + thetaStart;
        
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        
        vertices.push(radius * sinTheta, halfHeight * sign, radius * cosTheta);
        normals.push(0, sign, 0);
        uvs.push((cosTheta * 0.5) + 0.5, (sinTheta * 0.5 * sign) + 0.5);
        
        index++;
      }
      
      // 索引
      for (let x = 0; x < radialSegments; x++) {
        const c = centerIndexStart + x;
        const i = centerIndexEnd + x;
        
        if (top) {
          indices.push(i, i + 1, c);
        } else {
          indices.push(i + 1, i, c);
        }
        
        groupCount += 3;
      }
      
      this.addGroup(groupStart, groupCount, top ? 1 : 2);
      groupStart += groupCount;
    }
    
    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  }
}

// 圆锥体（特殊圆柱）
export class ConeGeometry extends CylinderGeometry {
  readonly type = 'ConeGeometry';
  
  constructor(
    radius = 1,
    height = 1,
    radialSegments = 32,
    heightSegments = 1,
    openEnded = false,
    thetaStart = 0,
    thetaLength = Math.PI * 2
  ) {
    super(0, radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength);
    
    this.parameters = {
      radius, height, radialSegments, heightSegments,
      openEnded, thetaStart, thetaLength
    };
  }
}
```

## 使用示例

```typescript
// 创建各种基础几何体
const box = new BoxGeometry(2, 2, 2, 2, 2, 2);
const sphere = new SphereGeometry(1, 32, 16);
const plane = new PlaneGeometry(10, 10, 10, 10);
const cylinder = new CylinderGeometry(0.5, 0.5, 2, 32);
const cone = new ConeGeometry(1, 2, 32);

// 部分球面
const hemisphere = new SphereGeometry(
  1, 32, 16,
  0, Math.PI * 2,  // 完整水平范围
  0, Math.PI / 2    // 上半球
);

// 开口圆柱（无端盖）
const tube = new CylinderGeometry(1, 1, 2, 32, 1, true);

// 扇形平面
const fan = new SphereGeometry(
  1, 32, 1,
  0, Math.PI / 2,   // 90度扇形
  Math.PI / 2, 0.01 // 只有赤道
);
```

## 本章小结

- BoxGeometry 由 6 个面组成，支持分段
- SphereGeometry 基于球面坐标系参数化
- PlaneGeometry 是简单的四边形网格
- CylinderGeometry 支持不同顶底半径
- 所有几何体都可以通过分段参数调节细节

下一章，我们将学习参数化曲面几何体。
