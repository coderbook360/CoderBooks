# 挤出几何体

> "挤出将 2D 形状延展成 3D 实体，是建模中最强大的技术之一。"

## ExtrudeGeometry 挤出几何体

```typescript
// src/geometries/ExtrudeGeometry.ts
import { BufferGeometry } from '../core/BufferGeometry';
import { Float32BufferAttribute } from '../core/BufferAttribute';
import { Shape } from '../extras/core/Shape';
import { ShapeUtils } from '../extras/ShapeUtils';
import { Vector2 } from '../math/Vector2';
import { Vector3 } from '../math/Vector3';

interface ExtrudeGeometryOptions {
  depth?: number;              // 挤出深度
  bevelEnabled?: boolean;      // 是否启用倒角
  bevelThickness?: number;     // 倒角厚度
  bevelSize?: number;          // 倒角大小
  bevelOffset?: number;        // 倒角偏移
  bevelSegments?: number;      // 倒角分段
  steps?: number;              // 挤出分段
  extrudePath?: Curve;         // 挤出路径
  UVGenerator?: UVGenerator;   // UV 生成器
}

export class ExtrudeGeometry extends BufferGeometry {
  readonly type = 'ExtrudeGeometry';
  
  parameters: {
    shapes: Shape[];
    options: ExtrudeGeometryOptions;
  };
  
  constructor(
    shapes: Shape | Shape[] = new Shape([
      new Vector2(0, 0.5),
      new Vector2(-0.5, -0.5),
      new Vector2(0.5, -0.5)
    ]),
    options: ExtrudeGeometryOptions = {}
  ) {
    super();
    
    shapes = Array.isArray(shapes) ? shapes : [shapes];
    
    this.parameters = { shapes, options };
    
    const scope = this;
    
    const verticesArray: number[] = [];
    const uvArray: number[] = [];
    
    for (let i = 0, l = shapes.length; i < l; i++) {
      const shape = shapes[i];
      addShape(shape);
    }
    
    this.setAttribute('position', new Float32BufferAttribute(verticesArray, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvArray, 2));
    
    this.computeVertexNormals();
    
    function addShape(shape: Shape) {
      const placeholder: number[] = [];
      
      const {
        depth = 1,
        bevelEnabled = true,
        bevelThickness = 0.2,
        bevelSize = bevelThickness - 0.1,
        bevelOffset = 0,
        bevelSegments = 3,
        steps = 1,
        extrudePath = undefined,
        UVGenerator = WorldUVGenerator,
      } = options;
      
      // 获取形状点
      const shapePoints = shape.extractPoints(12);
      let vertices = shapePoints.shape;
      const holes = shapePoints.holes;
      
      // 检查顶点顺序（逆时针）
      const reverse = !ShapeUtils.isClockWise(vertices);
      
      if (reverse) {
        vertices = vertices.reverse();
        
        for (let h = 0, hl = holes.length; h < hl; h++) {
          const hole = holes[h];
          
          if (ShapeUtils.isClockWise(hole)) {
            holes[h] = hole.reverse();
          }
        }
      }
      
      // 三角化形状
      const faces = ShapeUtils.triangulateShape(vertices, holes);
      
      // 将孔洞顶点合并到主顶点数组
      const contour = vertices;
      
      for (let h = 0, hl = holes.length; h < hl; h++) {
        const hole = holes[h];
        vertices = vertices.concat(hole);
      }
      
      const vlen = vertices.length;
      const flen = faces.length;
      
      // 生成几何体
      if (extrudePath) {
        buildLidFaces();
        buildSideFaces();
      } else {
        // 普通挤出
        
        // 倒角
        const bevelSteps = bevelEnabled ? bevelSegments : 0;
        
        // 底面
        for (let i = 0; i < flen; i++) {
          const face = faces[i];
          f3(face[2], face[1], face[0], 0);
        }
        
        // 底部倒角
        if (bevelEnabled) {
          for (let b = 0; b < bevelSegments; b++) {
            const t = b / bevelSegments;
            buildBevelLayer(t, bevelThickness, bevelSize);
          }
        }
        
        // 挤出侧面
        for (let s = 1; s <= steps; s++) {
          const z = s / steps * depth;
          buildLayer(z);
        }
        
        // 顶部倒角
        if (bevelEnabled) {
          for (let b = bevelSegments - 1; b >= 0; b--) {
            const t = b / bevelSegments;
            buildBevelLayer(depth + bevelThickness - t * bevelThickness, bevelThickness, bevelSize);
          }
        }
        
        // 顶面
        for (let i = 0; i < flen; i++) {
          const face = faces[i];
          f3(face[0], face[1], face[2], depth + (bevelEnabled ? 2 * bevelThickness : 0));
        }
        
        // 侧面
        buildSideFaces();
      }
      
      // 构建侧面
      function buildSideFaces() {
        let layeroffset = 0;
        buildLayerSides(contour, layeroffset);
        layeroffset += contour.length;
        
        for (let h = 0, hl = holes.length; h < hl; h++) {
          const hole = holes[h];
          buildLayerSides(hole, layeroffset);
          layeroffset += hole.length;
        }
      }
      
      function buildLayerSides(contour: Vector2[], layeroffset: number) {
        let i = contour.length;
        
        while (--i >= 0) {
          const j = i;
          let k = i - 1;
          if (k < 0) k = contour.length - 1;
          
          const s = 0;
          const sl = steps + bevelSegments * 2;
          
          for (let s = 0; s < sl; s++) {
            const slen1 = vlen * s;
            const slen2 = vlen * (s + 1);
            
            const a = layeroffset + j + slen1;
            const b = layeroffset + k + slen1;
            const c = layeroffset + k + slen2;
            const d = layeroffset + j + slen2;
            
            f4(a, b, c, d);
          }
        }
      }
      
      function buildBevelLayer(z: number, bevelThickness: number, bevelSize: number) {
        // 构建倒角层
        for (let i = 0, l = contour.length; i < l; i++) {
          const pt = contour[i];
          v(pt.x + bevelOffset, pt.y + bevelOffset, z);
        }
      }
      
      function buildLayer(z: number) {
        for (let i = 0, l = vertices.length; i < l; i++) {
          const pt = vertices[i];
          v(pt.x, pt.y, z);
        }
      }
      
      function v(x: number, y: number, z: number) {
        verticesArray.push(x, y, z);
      }
      
      function f3(a: number, b: number, c: number, z: number) {
        const va = vertices[a];
        const vb = vertices[b];
        const vc = vertices[c];
        
        v(va.x, va.y, z);
        v(vb.x, vb.y, z);
        v(vc.x, vc.y, z);
        
        const uvs = UVGenerator.generateTopUV(
          scope, verticesArray,
          verticesArray.length - 9,
          verticesArray.length - 6,
          verticesArray.length - 3
        );
        
        uvArray.push(uvs[0].x, uvs[0].y);
        uvArray.push(uvs[1].x, uvs[1].y);
        uvArray.push(uvs[2].x, uvs[2].y);
      }
      
      function f4(a: number, b: number, c: number, d: number) {
        const offset = verticesArray.length / 3;
        
        // 侧面由两个三角形组成
        v(verticesArray[a * 3], verticesArray[a * 3 + 1], verticesArray[a * 3 + 2]);
        v(verticesArray[b * 3], verticesArray[b * 3 + 1], verticesArray[b * 3 + 2]);
        v(verticesArray[d * 3], verticesArray[d * 3 + 1], verticesArray[d * 3 + 2]);
        
        v(verticesArray[b * 3], verticesArray[b * 3 + 1], verticesArray[b * 3 + 2]);
        v(verticesArray[c * 3], verticesArray[c * 3 + 1], verticesArray[c * 3 + 2]);
        v(verticesArray[d * 3], verticesArray[d * 3 + 1], verticesArray[d * 3 + 2]);
        
        const uvs = UVGenerator.generateSideWallUV(
          scope, verticesArray,
          offset, offset + 1, offset + 2, offset + 3
        );
        
        uvArray.push(uvs[0].x, uvs[0].y);
        uvArray.push(uvs[1].x, uvs[1].y);
        uvArray.push(uvs[3].x, uvs[3].y);
        
        uvArray.push(uvs[1].x, uvs[1].y);
        uvArray.push(uvs[2].x, uvs[2].y);
        uvArray.push(uvs[3].x, uvs[3].y);
      }
    }
  }
}

// UV 生成器
const WorldUVGenerator = {
  generateTopUV(
    geometry: BufferGeometry,
    vertices: number[],
    indexA: number,
    indexB: number,
    indexC: number
  ): Vector2[] {
    const a_x = vertices[indexA];
    const a_y = vertices[indexA + 1];
    const b_x = vertices[indexB];
    const b_y = vertices[indexB + 1];
    const c_x = vertices[indexC];
    const c_y = vertices[indexC + 1];
    
    return [
      new Vector2(a_x, a_y),
      new Vector2(b_x, b_y),
      new Vector2(c_x, c_y),
    ];
  },
  
  generateSideWallUV(
    geometry: BufferGeometry,
    vertices: number[],
    indexA: number,
    indexB: number,
    indexC: number,
    indexD: number
  ): Vector2[] {
    const a_x = vertices[indexA * 3];
    const a_y = vertices[indexA * 3 + 1];
    const a_z = vertices[indexA * 3 + 2];
    const b_x = vertices[indexB * 3];
    const b_y = vertices[indexB * 3 + 1];
    const b_z = vertices[indexB * 3 + 2];
    const c_x = vertices[indexC * 3];
    const c_y = vertices[indexC * 3 + 1];
    const c_z = vertices[indexC * 3 + 2];
    const d_x = vertices[indexD * 3];
    const d_y = vertices[indexD * 3 + 1];
    const d_z = vertices[indexD * 3 + 2];
    
    if (Math.abs(a_y - b_y) < Math.abs(a_x - b_x)) {
      return [
        new Vector2(a_x, 1 - a_z),
        new Vector2(b_x, 1 - b_z),
        new Vector2(c_x, 1 - c_z),
        new Vector2(d_x, 1 - d_z),
      ];
    } else {
      return [
        new Vector2(a_y, 1 - a_z),
        new Vector2(b_y, 1 - b_z),
        new Vector2(c_y, 1 - c_z),
        new Vector2(d_y, 1 - d_z),
      ];
    }
  },
};
```

## 挤出过程图解

```
挤出几何体生成过程：

1. 2D 形状              2. 挤出               3. 加倒角
     ╱╲                  ╱╲                    ╱╲
    ╱  ╲               ╱───╲               ╱┬───┬╲
   ╱    ╲             │╱   ╲│            │ ╱   ╲ │
  ╱──────╲            │──────│            ╰╱─────╲╯
                      └──────┘

参数说明：
- depth: 挤出深度
- bevelThickness: 倒角 Z 方向延伸
- bevelSize: 倒角 XY 方向延伸
- bevelSegments: 倒角平滑度
```

## Shape 形状定义

```typescript
// 使用 Shape 定义 2D 轮廓
import { Shape, Path } from 'three';

// 创建心形
function createHeartShape(): Shape {
  const x = 0, y = 0;
  
  const heartShape = new Shape();
  
  heartShape.moveTo(x + 0.5, y + 0.5);
  heartShape.bezierCurveTo(x + 0.5, y + 0.5, x + 0.4, y, x, y);
  heartShape.bezierCurveTo(x - 0.6, y, x - 0.6, y + 0.7, x - 0.6, y + 0.7);
  heartShape.bezierCurveTo(x - 0.6, y + 1.1, x - 0.3, y + 1.54, x + 0.5, y + 1.9);
  heartShape.bezierCurveTo(x + 1.2, y + 1.54, x + 1.6, y + 1.1, x + 1.6, y + 0.7);
  heartShape.bezierCurveTo(x + 1.6, y + 0.7, x + 1.6, y, x + 1, y);
  heartShape.bezierCurveTo(x + 0.7, y, x + 0.5, y + 0.5, x + 0.5, y + 0.5);
  
  return heartShape;
}

// 创建带孔的形状
function createShapeWithHole(): Shape {
  const shape = new Shape();
  
  // 外轮廓
  shape.moveTo(0, 0);
  shape.lineTo(0, 2);
  shape.lineTo(2, 2);
  shape.lineTo(2, 0);
  shape.lineTo(0, 0);
  
  // 孔洞
  const hole = new Path();
  hole.moveTo(0.5, 0.5);
  hole.lineTo(0.5, 1.5);
  hole.lineTo(1.5, 1.5);
  hole.lineTo(1.5, 0.5);
  hole.lineTo(0.5, 0.5);
  
  shape.holes.push(hole);
  
  return shape;
}
```

## ShapeGeometry 形状几何体

```typescript
// src/geometries/ShapeGeometry.ts
// 2D 形状（无挤出）
export class ShapeGeometry extends BufferGeometry {
  readonly type = 'ShapeGeometry';
  
  parameters: {
    shapes: Shape[];
    curveSegments: number;
  };
  
  constructor(
    shapes: Shape | Shape[] = new Shape([
      new Vector2(0, 0.5),
      new Vector2(-0.5, -0.5),
      new Vector2(0.5, -0.5)
    ]),
    curveSegments = 12
  ) {
    super();
    
    shapes = Array.isArray(shapes) ? shapes : [shapes];
    
    this.parameters = { shapes, curveSegments };
    
    const indices: number[] = [];
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    
    let groupStart = 0;
    let groupCount = 0;
    
    for (let i = 0; i < shapes.length; i++) {
      addShape(shapes[i]);
      this.addGroup(groupStart, groupCount, i);
      groupStart += groupCount;
      groupCount = 0;
    }
    
    function addShape(shape: Shape) {
      const indexOffset = vertices.length / 3;
      const points = shape.extractPoints(curveSegments);
      
      let shapeVertices = points.shape;
      const shapeHoles = points.holes;
      
      // 确保逆时针
      if (!ShapeUtils.isClockWise(shapeVertices)) {
        shapeVertices = shapeVertices.reverse();
      }
      
      for (let i = 0, l = shapeHoles.length; i < l; i++) {
        const shapeHole = shapeHoles[i];
        
        if (ShapeUtils.isClockWise(shapeHole)) {
          shapeHoles[i] = shapeHole.reverse();
        }
      }
      
      // 三角化
      const faces = ShapeUtils.triangulateShape(shapeVertices, shapeHoles);
      
      // 合并孔洞顶点
      for (let i = 0, l = shapeHoles.length; i < l; i++) {
        const shapeHole = shapeHoles[i];
        shapeVertices = shapeVertices.concat(shapeHole);
      }
      
      // 生成顶点
      for (let i = 0, l = shapeVertices.length; i < l; i++) {
        const vertex = shapeVertices[i];
        
        vertices.push(vertex.x, vertex.y, 0);
        normals.push(0, 0, 1);
        uvs.push(vertex.x, vertex.y);
      }
      
      // 生成索引
      for (let i = 0, l = faces.length; i < l; i++) {
        const face = faces[i];
        
        const a = face[0] + indexOffset;
        const b = face[1] + indexOffset;
        const c = face[2] + indexOffset;
        
        indices.push(a, b, c);
        groupCount += 3;
      }
    }
    
    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  }
}
```

## TextGeometry 文本几何体

```typescript
// src/geometries/TextGeometry.ts
// 基于字体的 3D 文本（扩展 ExtrudeGeometry）
import { Font } from '../loaders/FontLoader';

interface TextGeometryParameters {
  font: Font;
  size?: number;
  depth?: number;           // 挤出深度（原 height）
  curveSegments?: number;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelOffset?: number;
  bevelSegments?: number;
}

export class TextGeometry extends ExtrudeGeometry {
  readonly type = 'TextGeometry';
  
  constructor(text: string = '', parameters: TextGeometryParameters) {
    const font = parameters.font;
    
    if (!font || !font.isFont) {
      console.error('TextGeometry: font is required');
      super();
      return;
    }
    
    const shapes = font.generateShapes(text, parameters.size ?? 100);
    
    super(shapes, {
      depth: parameters.depth ?? 50,
      bevelEnabled: parameters.bevelEnabled ?? false,
      bevelThickness: parameters.bevelThickness ?? 10,
      bevelSize: parameters.bevelSize ?? 8,
      bevelOffset: parameters.bevelOffset ?? 0,
      bevelSegments: parameters.bevelSegments ?? 3,
    });
    
    (this.parameters as any).text = text;
    (this.parameters as any).font = font;
  }
}
```

## 使用示例

```typescript
// 基本挤出
const triangleShape = new Shape();
triangleShape.moveTo(0, 1);
triangleShape.lineTo(-1, -1);
triangleShape.lineTo(1, -1);
triangleShape.lineTo(0, 1);

const triangleGeometry = new ExtrudeGeometry(triangleShape, {
  depth: 0.5,
  bevelEnabled: true,
  bevelThickness: 0.1,
  bevelSize: 0.1,
  bevelSegments: 3,
});

// 文本
const loader = new FontLoader();
loader.load('fonts/helvetiker_regular.typeface.json', (font) => {
  const textGeometry = new TextGeometry('Hello', {
    font: font,
    size: 1,
    depth: 0.2,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.03,
    bevelSegments: 5,
  });
  
  textGeometry.center();  // 居中
  
  const mesh = new Mesh(textGeometry, material);
  scene.add(mesh);
});

// 圆角矩形
const roundedRect = new Shape();
const width = 2, height = 1, radius = 0.2;

roundedRect.moveTo(-width / 2, -height / 2 + radius);
roundedRect.lineTo(-width / 2, height / 2 - radius);
roundedRect.quadraticCurveTo(-width / 2, height / 2, -width / 2 + radius, height / 2);
roundedRect.lineTo(width / 2 - radius, height / 2);
roundedRect.quadraticCurveTo(width / 2, height / 2, width / 2, height / 2 - radius);
roundedRect.lineTo(width / 2, -height / 2 + radius);
roundedRect.quadraticCurveTo(width / 2, -height / 2, width / 2 - radius, -height / 2);
roundedRect.lineTo(-width / 2 + radius, -height / 2);
roundedRect.quadraticCurveTo(-width / 2, -height / 2, -width / 2, -height / 2 + radius);

const roundedRectGeometry = new ExtrudeGeometry(roundedRect, {
  depth: 0.1,
  bevelEnabled: false,
});
```

## 沿路径挤出

```typescript
// 沿曲线挤出
const curve = new CatmullRomCurve3([
  new Vector3(-2, 0, 0),
  new Vector3(0, 2, 0),
  new Vector3(2, 0, 0),
  new Vector3(0, -2, 0),
], true);  // closed

// 星形截面
const starShape = new Shape();
const points = 5, outerRadius = 0.5, innerRadius = 0.25;

for (let i = 0; i < points * 2; i++) {
  const radius = i % 2 === 0 ? outerRadius : innerRadius;
  const angle = (i / points) * Math.PI;
  
  if (i === 0) {
    starShape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  } else {
    starShape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
}
starShape.closePath();

const pathExtrudeGeometry = new ExtrudeGeometry(starShape, {
  extrudePath: curve,
  steps: 100,
  bevelEnabled: false,
});
```

## 本章小结

- ExtrudeGeometry 将 2D Shape 挤出成 3D
- 支持倒角（bevel）创建圆滑边缘
- Shape 可以包含孔洞
- TextGeometry 用于 3D 文本
- extrudePath 可沿任意曲线挤出

下一章，我们将学习几何体工具函数。
