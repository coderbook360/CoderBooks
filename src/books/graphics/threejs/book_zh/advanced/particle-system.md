# 粒子系统

> "粒子是魔法、火焰和星空的画笔。"

## 粒子系统基础

```
粒子系统结构：

┌─────────────────────────────────────┐
│         ParticleSystem              │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │   BufferGeometry            │   │
│  │   - position[]              │   │
│  │   - color[]                 │   │
│  │   - size[]                  │   │
│  │   - custom attributes[]     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   PointsMaterial /          │   │
│  │   ShaderMaterial            │   │
│  │   - size                    │   │
│  │   - map (texture)           │   │
│  │   - blending                │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Points (渲染对象)         │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Points 基础用法

```typescript
import {
  Points,
  PointsMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  AdditiveBlending,
  TextureLoader,
} from 'three';

// 创建简单粒子系统
function createParticleSystem(count: number): Points {
  const geometry = new BufferGeometry();
  
  // 位置
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  
  // 材质
  const material = new PointsMaterial({
    size: 0.1,
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true, // 距离衰减
  });
  
  return new Points(geometry, material);
}

// 带纹理的粒子
function createTexturedParticles(count: number, textureUrl: string): Points {
  const geometry = new BufferGeometry();
  
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  
  const texture = new TextureLoader().load(textureUrl);
  
  const material = new PointsMaterial({
    size: 0.5,
    map: texture,
    transparent: true,
    alphaTest: 0.01,
    blending: AdditiveBlending,
    depthWrite: false, // 避免遮挡问题
  });
  
  return new Points(geometry, material);
}
```

## 粒子发射器

```typescript
interface Particle {
  position: Vector3;
  velocity: Vector3;
  color: Color;
  size: number;
  life: number;
  maxLife: number;
}

class ParticleEmitter {
  private particles: Particle[] = [];
  private geometry: BufferGeometry;
  private material: PointsMaterial;
  points: Points;
  
  private maxParticles: number;
  private emissionRate: number;
  private particleLife: number;
  
  private positionAttribute: Float32BufferAttribute;
  private colorAttribute: Float32BufferAttribute;
  private sizeAttribute: Float32BufferAttribute;
  
  constructor(options: {
    maxParticles?: number;
    emissionRate?: number;
    particleLife?: number;
    size?: number;
    color?: Color;
    texture?: Texture;
  }) {
    this.maxParticles = options.maxParticles || 1000;
    this.emissionRate = options.emissionRate || 50;
    this.particleLife = options.particleLife || 2;
    
    // 创建几何体
    this.geometry = new BufferGeometry();
    
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);
    
    this.positionAttribute = new Float32BufferAttribute(positions, 3);
    this.colorAttribute = new Float32BufferAttribute(colors, 3);
    this.sizeAttribute = new Float32BufferAttribute(sizes, 1);
    
    this.geometry.setAttribute('position', this.positionAttribute);
    this.geometry.setAttribute('color', this.colorAttribute);
    this.geometry.setAttribute('size', this.sizeAttribute);
    
    // 创建材质
    this.material = new PointsMaterial({
      size: options.size || 0.1,
      color: options.color || 0xffffff,
      map: options.texture,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });
    
    this.points = new Points(this.geometry, this.material);
  }
  
  emit(position: Vector3, count: number = 1): void {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      this.particles.push({
        position: position.clone(),
        velocity: new Vector3(
          (Math.random() - 0.5) * 2,
          Math.random() * 3,
          (Math.random() - 0.5) * 2
        ),
        color: new Color(1, 1, 1),
        size: 0.1,
        life: this.particleLife,
        maxLife: this.particleLife,
      });
    }
  }
  
  update(delta: number): void {
    const gravity = new Vector3(0, -5, 0);
    
    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // 更新生命
      p.life -= delta;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      
      // 应用重力
      p.velocity.add(gravity.clone().multiplyScalar(delta));
      
      // 更新位置
      p.position.add(p.velocity.clone().multiplyScalar(delta));
      
      // 更新大小和透明度
      const lifeRatio = p.life / p.maxLife;
      p.size = 0.1 * lifeRatio;
      p.color.setRGB(1, lifeRatio, lifeRatio * 0.5);
    }
    
    // 更新属性
    this.updateAttributes();
  }
  
  private updateAttributes(): void {
    const positions = this.positionAttribute.array as Float32Array;
    const colors = this.colorAttribute.array as Float32Array;
    const sizes = this.sizeAttribute.array as Float32Array;
    
    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        
        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;
        
        colors[i * 3] = p.color.r;
        colors[i * 3 + 1] = p.color.g;
        colors[i * 3 + 2] = p.color.b;
        
        sizes[i] = p.size;
      } else {
        // 隐藏未使用的粒子
        sizes[i] = 0;
      }
    }
    
    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
  }
}

// 使用
const emitter = new ParticleEmitter({
  maxParticles: 5000,
  emissionRate: 100,
  particleLife: 3,
});
scene.add(emitter.points);

// 持续发射
function animate() {
  emitter.emit(new Vector3(0, 0, 0), 5);
  emitter.update(clock.getDelta());
}
```

## GPU 粒子系统

```typescript
// 使用着色器实现 GPU 粒子
class GPUParticleSystem {
  private geometry: BufferGeometry;
  private material: ShaderMaterial;
  points: Points;
  
  constructor(count: number) {
    this.geometry = new BufferGeometry();
    
    // 初始化属性
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const startTimes = new Float32Array(count);
    const lifetimes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // 随机初始位置
      positions[i * 3] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      
      // 随机速度
      velocities[i * 3] = (Math.random() - 0.5) * 2;
      velocities[i * 3 + 1] = Math.random() * 5 + 2;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
      
      // 随机开始时间和生命周期
      startTimes[i] = Math.random() * 5;
      lifetimes[i] = Math.random() * 2 + 1;
    }
    
    this.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute('velocity', new Float32BufferAttribute(velocities, 3));
    this.geometry.setAttribute('startTime', new Float32BufferAttribute(startTimes, 1));
    this.geometry.setAttribute('lifetime', new Float32BufferAttribute(lifetimes, 1));
    
    this.material = new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        gravity: { value: new Vector3(0, -5, 0) },
        pointSize: { value: 20.0 },
        particleTexture: { value: null },
      },
      vertexShader: /* glsl */`
        attribute vec3 velocity;
        attribute float startTime;
        attribute float lifetime;
        
        uniform float time;
        uniform vec3 gravity;
        uniform float pointSize;
        
        varying float vAlpha;
        
        void main() {
          float age = mod(time - startTime, lifetime);
          float normalizedAge = age / lifetime;
          
          // 计算当前位置
          vec3 pos = position + velocity * age + 0.5 * gravity * age * age;
          
          // 循环：当粒子死亡时重置位置
          if (normalizedAge >= 1.0) {
            pos = position;
          }
          
          vAlpha = 1.0 - normalizedAge;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = pointSize * (1.0 / -mvPosition.z) * vAlpha;
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D particleTexture;
        varying float vAlpha;
        
        void main() {
          vec4 texColor = texture2D(particleTexture, gl_PointCoord);
          gl_FragColor = vec4(1.0, 0.5, 0.2, texColor.a * vAlpha);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    
    this.points = new Points(this.geometry, this.material);
  }
  
  setTexture(texture: Texture): void {
    this.material.uniforms.particleTexture.value = texture;
  }
  
  update(time: number): void {
    this.material.uniforms.time.value = time;
  }
}
```

## 特效预设

### 火焰效果

```typescript
class FireEffect {
  private emitter: ParticleEmitter;
  
  constructor() {
    this.emitter = new ParticleEmitter({
      maxParticles: 2000,
      particleLife: 1.5,
      size: 0.3,
    });
    
    // 自定义更新逻辑
    this.customUpdate = this.customUpdate.bind(this);
  }
  
  get points(): Points {
    return this.emitter.points;
  }
  
  update(delta: number): void {
    // 发射粒子
    for (let i = 0; i < 10; i++) {
      const offset = new Vector3(
        (Math.random() - 0.5) * 0.5,
        0,
        (Math.random() - 0.5) * 0.5
      );
      this.emitter.emit(offset, 1);
    }
    
    this.emitter.update(delta);
  }
}
```

### 烟雾效果

```typescript
class SmokeEffect {
  private geometry: BufferGeometry;
  private material: ShaderMaterial;
  points: Points;
  
  constructor(count = 500) {
    this.geometry = new BufferGeometry();
    
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = Math.random() * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      
      sizes[i] = Math.random() * 2 + 1;
      opacities[i] = Math.random();
    }
    
    this.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));
    this.geometry.setAttribute('opacity', new Float32BufferAttribute(opacities, 1));
    
    this.material = new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        smokeTexture: { value: null },
      },
      vertexShader: /* glsl */`
        attribute float size;
        attribute float opacity;
        
        uniform float time;
        
        varying float vOpacity;
        
        void main() {
          vOpacity = opacity;
          
          vec3 pos = position;
          pos.y += time * 0.5;
          pos.y = mod(pos.y, 5.0);
          pos.x += sin(time + position.y) * 0.2;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = size * 100.0 / -mvPosition.z;
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D smokeTexture;
        varying float vOpacity;
        
        void main() {
          vec4 texColor = texture2D(smokeTexture, gl_PointCoord);
          gl_FragColor = vec4(0.5, 0.5, 0.5, texColor.a * vOpacity * 0.3);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    
    this.points = new Points(this.geometry, this.material);
  }
  
  update(time: number): void {
    this.material.uniforms.time.value = time;
  }
}
```

### 星空效果

```typescript
class StarField {
  points: Points;
  
  constructor(count = 10000, radius = 100) {
    const geometry = new BufferGeometry();
    
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // 球形分布
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * Math.cbrt(Math.random());
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      // 随机颜色（白色到蓝色）
      const color = new Color();
      color.setHSL(0.6, Math.random() * 0.5, 0.5 + Math.random() * 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      sizes[i] = Math.random() * 2;
    }
    
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));
    
    const material = new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: /* glsl */`
        attribute float size;
        attribute vec3 color;
        
        uniform float time;
        
        varying vec3 vColor;
        
        void main() {
          vColor = color;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // 闪烁效果
          float twinkle = sin(time * 3.0 + position.x * 100.0) * 0.5 + 0.5;
          gl_PointSize = size * twinkle * (300.0 / -mvPosition.z);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vColor;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - dist * 2.0;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    
    this.points = new Points(geometry, material);
  }
  
  update(time: number): void {
    (this.points.material as ShaderMaterial).uniforms.time.value = time;
    this.points.rotation.y = time * 0.02;
  }
}
```

## 本章小结

- Points 是 Three.js 粒子系统的基础
- BufferGeometry 存储粒子属性数据
- 使用 ShaderMaterial 实现 GPU 粒子
- 不同效果需要不同的更新逻辑
- 注意 depthWrite 和 blending 设置

下一章，我们将学习阴影系统。
