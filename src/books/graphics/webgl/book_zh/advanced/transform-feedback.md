# 变换反馈

> "变换反馈让 GPU 的计算结果回写到缓冲区，开启 GPU 通用计算的大门。"

## 什么是变换反馈

### 概念

变换反馈（Transform Feedback）允许将顶点着色器的输出捕获到缓冲区，而不是（或同时）进行光栅化。

```
┌─────────────────────────────────────────────────────────┐
│                变换反馈流程                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   顶点数据 ─→ 顶点着色器 ─→ 变换后的数据               │
│                    │                                    │
│                    ├──→ 光栅化 → 片元 → 屏幕           │
│                    │                                    │
│                    └──→ 变换反馈缓冲区 (GPU 内存)      │
│                                                         │
│   可选择只捕获不渲染 (RASTERIZER_DISCARD)              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 应用场景

| 应用 | 说明 |
|------|------|
| GPU 粒子系统 | 在 GPU 上更新粒子位置 |
| 骨骼动画 | GPU 蒙皮计算 |
| 物理模拟 | 布料、流体等 |
| 几何处理 | 曲面细分、变形 |
| 流式输出 | 生成几何体 |

## 基础设置

### 创建程序

```javascript
// 顶点着色器
const vertexSource = `#version 300 es
  in vec3 a_position;
  in vec3 a_velocity;
  
  out vec3 v_position;
  out vec3 v_velocity;
  
  uniform float u_deltaTime;
  uniform vec3 u_gravity;
  
  void main() {
    // 更新速度
    v_velocity = a_velocity + u_gravity * u_deltaTime;
    
    // 更新位置
    v_position = a_position + v_velocity * u_deltaTime;
    
    gl_Position = vec4(0.0);  // 不重要，因为不会光栅化
  }
`;

// 片元着色器（可以是空的）
const fragmentSource = `#version 300 es
  precision highp float;
  out vec4 fragColor;
  void main() {
    fragColor = vec4(1.0);
  }
`;

// 创建着色器
const program = gl.createProgram();
const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

gl.attachShader(program, vs);
gl.attachShader(program, fs);

// 关键：在链接前指定变换反馈输出变量
gl.transformFeedbackVaryings(
  program,
  ['v_position', 'v_velocity'],  // 要捕获的 varying
  gl.INTERLEAVED_ATTRIBS          // 或 gl.SEPARATE_ATTRIBS
);

gl.linkProgram(program);
```

### 变量模式

```
┌─────────────────────────────────────────────────────────┐
│                变换反馈变量模式                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   INTERLEAVED_ATTRIBS (交错):                          │
│   ┌──────────────────────────────────────────┐         │
│   │ pos0 | vel0 | pos1 | vel1 | pos2 | vel2  │         │
│   └──────────────────────────────────────────┘         │
│   所有变量写入同一个缓冲区                              │
│                                                         │
│   SEPARATE_ATTRIBS (分离):                             │
│   缓冲区 0: │ pos0 | pos1 | pos2 │                     │
│   缓冲区 1: │ vel0 | vel1 | vel2 │                     │
│   每个变量写入单独的缓冲区                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 缓冲区设置

### 创建变换反馈对象

```javascript
// 创建变换反馈对象
const transformFeedback = gl.createTransformFeedback();

// 创建缓冲区（双缓冲，ping-pong）
const buffers = [
  gl.createBuffer(),
  gl.createBuffer()
];

// 初始化数据
const numParticles = 10000;
const particleData = new Float32Array(numParticles * 6);  // pos + vel

for (let i = 0; i < numParticles; i++) {
  // 位置
  particleData[i * 6 + 0] = (Math.random() - 0.5) * 10;
  particleData[i * 6 + 1] = Math.random() * 10;
  particleData[i * 6 + 2] = (Math.random() - 0.5) * 10;
  // 速度
  particleData[i * 6 + 3] = (Math.random() - 0.5) * 2;
  particleData[i * 6 + 4] = Math.random() * 5;
  particleData[i * 6 + 5] = (Math.random() - 0.5) * 2;
}

// 初始化两个缓冲区
for (const buffer of buffers) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, particleData, gl.DYNAMIC_COPY);
}
```

### 创建 VAO

```javascript
// 为每个缓冲区创建 VAO
const vaos = buffers.map(buffer => {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  
  // 位置属性 (vec3)
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
  
  // 速度属性 (vec3)
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  
  gl.bindVertexArray(null);
  return vao;
});
```

## 执行变换反馈

### 更新循环

```javascript
let currentBuffer = 0;

function update(deltaTime) {
  const readBuffer = currentBuffer;
  const writeBuffer = 1 - currentBuffer;
  
  // 使用更新程序
  gl.useProgram(updateProgram);
  gl.uniform1f(gl.getUniformLocation(updateProgram, 'u_deltaTime'), deltaTime);
  gl.uniform3f(gl.getUniformLocation(updateProgram, 'u_gravity'), 0, -9.8, 0);
  
  // 绑定输入 VAO
  gl.bindVertexArray(vaos[readBuffer]);
  
  // 绑定变换反馈对象和输出缓冲区
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffers[writeBuffer]);
  
  // 禁用光栅化（只计算，不渲染）
  gl.enable(gl.RASTERIZER_DISCARD);
  
  // 开始变换反馈
  gl.beginTransformFeedback(gl.POINTS);
  
  // 执行绘制（实际是计算）
  gl.drawArrays(gl.POINTS, 0, numParticles);
  
  // 结束变换反馈
  gl.endTransformFeedback();
  
  // 重新启用光栅化
  gl.disable(gl.RASTERIZER_DISCARD);
  
  // 解绑
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
  gl.bindVertexArray(null);
  
  // 交换缓冲区
  currentBuffer = writeBuffer;
}
```

### 渲染结果

```javascript
function render() {
  gl.useProgram(renderProgram);
  
  // 设置相机等 uniform...
  
  gl.bindVertexArray(vaos[currentBuffer]);
  gl.drawArrays(gl.POINTS, 0, numParticles);
  gl.bindVertexArray(null);
}
```

## GPU 粒子系统

### 完整实现

```javascript
class GPUParticleSystem {
  constructor(gl, count) {
    this.gl = gl;
    this.count = count;
    this.currentBuffer = 0;
    
    this.createPrograms();
    this.createBuffers();
    this.createVAOs();
    this.createTransformFeedback();
  }
  
  createPrograms() {
    // 更新程序
    this.updateProgram = createProgram(this.gl, `
      #version 300 es
      in vec3 a_position;
      in vec3 a_velocity;
      in float a_life;
      in float a_maxLife;
      
      out vec3 v_position;
      out vec3 v_velocity;
      out float v_life;
      out float v_maxLife;
      
      uniform float u_deltaTime;
      uniform vec3 u_gravity;
      uniform vec3 u_emitterPos;
      uniform float u_time;
      
      // 伪随机函数
      float random(float seed) {
        return fract(sin(seed * 12.9898) * 43758.5453);
      }
      
      void main() {
        v_life = a_life - u_deltaTime;
        v_maxLife = a_maxLife;
        
        if (v_life <= 0.0) {
          // 重生粒子
          float seed = float(gl_VertexID) + u_time;
          v_position = u_emitterPos + vec3(
            (random(seed) - 0.5) * 0.5,
            0.0,
            (random(seed + 1.0) - 0.5) * 0.5
          );
          v_velocity = vec3(
            (random(seed + 2.0) - 0.5) * 4.0,
            random(seed + 3.0) * 8.0 + 2.0,
            (random(seed + 4.0) - 0.5) * 4.0
          );
          v_life = random(seed + 5.0) * 2.0 + 1.0;
          v_maxLife = v_life;
        } else {
          // 更新粒子
          v_velocity = a_velocity + u_gravity * u_deltaTime;
          v_position = a_position + v_velocity * u_deltaTime;
          
          // 地面碰撞
          if (v_position.y < 0.0) {
            v_position.y = 0.0;
            v_velocity.y = -v_velocity.y * 0.5;
            v_velocity.xz *= 0.8;
          }
        }
        
        gl_Position = vec4(0.0);
      }
    `, `
      #version 300 es
      precision highp float;
      out vec4 fragColor;
      void main() { fragColor = vec4(1.0); }
    `, ['v_position', 'v_velocity', 'v_life', 'v_maxLife']);
    
    // 渲染程序
    this.renderProgram = createProgram(this.gl, `
      #version 300 es
      in vec3 a_position;
      in float a_life;
      in float a_maxLife;
      
      uniform mat4 u_viewProjection;
      uniform float u_pointSize;
      
      out float v_lifeRatio;
      
      void main() {
        v_lifeRatio = a_life / a_maxLife;
        gl_Position = u_viewProjection * vec4(a_position, 1.0);
        gl_PointSize = u_pointSize * v_lifeRatio;
      }
    `, `
      #version 300 es
      precision highp float;
      
      in float v_lifeRatio;
      out vec4 fragColor;
      
      void main() {
        vec2 coord = gl_PointCoord * 2.0 - 1.0;
        float dist = length(coord);
        if (dist > 1.0) discard;
        
        float alpha = (1.0 - dist) * v_lifeRatio;
        vec3 color = mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 1.0, 0.5), v_lifeRatio);
        
        fragColor = vec4(color, alpha);
      }
    `);
  }
  
  createBuffers() {
    const gl = this.gl;
    
    // 每粒子：position(3) + velocity(3) + life(1) + maxLife(1) = 8 floats
    const stride = 8;
    const data = new Float32Array(this.count * stride);
    
    for (let i = 0; i < this.count; i++) {
      const offset = i * stride;
      // 位置
      data[offset + 0] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      // 速度
      data[offset + 3] = (Math.random() - 0.5) * 4;
      data[offset + 4] = Math.random() * 8 + 2;
      data[offset + 5] = (Math.random() - 0.5) * 4;
      // 生命
      data[offset + 6] = Math.random() * 2 + 1;
      data[offset + 7] = data[offset + 6];
    }
    
    this.buffers = [gl.createBuffer(), gl.createBuffer()];
    
    for (const buffer of this.buffers) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_COPY);
    }
  }
  
  createVAOs() {
    const gl = this.gl;
    const stride = 32;  // 8 floats * 4 bytes
    
    this.vaos = this.buffers.map(buffer => {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      
      // position
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
      // velocity
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
      // life
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 24);
      // maxLife
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 28);
      
      gl.bindVertexArray(null);
      return vao;
    });
  }
  
  createTransformFeedback() {
    this.transformFeedback = this.gl.createTransformFeedback();
  }
  
  update(deltaTime, time) {
    const gl = this.gl;
    const read = this.currentBuffer;
    const write = 1 - this.currentBuffer;
    
    gl.useProgram(this.updateProgram);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_deltaTime'), deltaTime);
    gl.uniform1f(gl.getUniformLocation(this.updateProgram, 'u_time'), time);
    gl.uniform3f(gl.getUniformLocation(this.updateProgram, 'u_gravity'), 0, -9.8, 0);
    gl.uniform3f(gl.getUniformLocation(this.updateProgram, 'u_emitterPos'), 0, 0, 0);
    
    gl.bindVertexArray(this.vaos[read]);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.transformFeedback);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.buffers[write]);
    
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, this.count);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindVertexArray(null);
    
    this.currentBuffer = write;
  }
  
  render(viewProjection) {
    const gl = this.gl;
    
    gl.useProgram(this.renderProgram);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.renderProgram, 'u_viewProjection'),
      false, viewProjection
    );
    gl.uniform1f(gl.getUniformLocation(this.renderProgram, 'u_pointSize'), 20.0);
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);  // 加法混合
    
    gl.bindVertexArray(this.vaos[this.currentBuffer]);
    gl.drawArrays(gl.POINTS, 0, this.count);
    gl.bindVertexArray(null);
    
    gl.disable(gl.BLEND);
  }
}
```

## 分离属性模式

### 使用多个缓冲区

```javascript
// 指定分离属性模式
gl.transformFeedbackVaryings(
  program,
  ['v_position', 'v_velocity'],
  gl.SEPARATE_ATTRIBS  // 分离模式
);

// 绑定多个输出缓冲区
gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, positionBuffer);
gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, velocityBuffer);
```

## 查询对象

### 计算捕获的图元数

```javascript
// 创建查询对象
const query = gl.createQuery();

// 开始查询
gl.beginQuery(gl.TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN, query);

gl.beginTransformFeedback(gl.POINTS);
gl.drawArrays(gl.POINTS, 0, count);
gl.endTransformFeedback();

// 结束查询
gl.endQuery(gl.TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN);

// 异步获取结果
function checkQuery() {
  const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
  
  if (available) {
    const primitivesWritten = gl.getQueryParameter(query, gl.QUERY_RESULT);
    console.log(`捕获了 ${primitivesWritten} 个图元`);
    gl.deleteQuery(query);
  } else {
    requestAnimationFrame(checkQuery);
  }
}

requestAnimationFrame(checkQuery);
```

## 注意事项

### 限制

```
┌─────────────────────────────────────────────────────────┐
│                变换反馈限制                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   1. 输出变量必须在链接前声明                           │
│                                                         │
│   2. INTERLEAVED_ATTRIBS:                              │
│      - 最多 4 个分量合计                                │
│      - 所有变量写入同一缓冲区                           │
│                                                         │
│   3. SEPARATE_ATTRIBS:                                 │
│      - 最多 4 个单独的变量                              │
│      - 每个变量一个缓冲区                               │
│                                                         │
│   4. 不能同时读写同一缓冲区                             │
│      - 需要双缓冲 (ping-pong)                          │
│                                                         │
│   5. 必须先 endTransformFeedback 再切换程序            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 调试技巧

```javascript
// 读回数据验证
function debugTransformFeedback(gl, buffer, count, componentsPerVertex) {
  const size = count * componentsPerVertex;
  const data = new Float32Array(size);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.getBufferSubData(gl.ARRAY_BUFFER, 0, data);
  
  console.log('Transform Feedback Output:', data);
  
  // 打印前几个顶点
  for (let i = 0; i < Math.min(5, count); i++) {
    const offset = i * componentsPerVertex;
    console.log(`Vertex ${i}:`, 
      data.slice(offset, offset + componentsPerVertex));
  }
}
```

## 本章小结

- 变换反馈捕获顶点着色器输出
- 使用 `transformFeedbackVaryings` 指定输出变量
- `RASTERIZER_DISCARD` 禁用渲染只计算
- 双缓冲避免同时读写
- 非常适合 GPU 粒子系统
- 查询对象可获取捕获数量

下一章，我们将学习 WebGL 性能优化技术。
