# FontLoader 字体和 AudioLoader 音频

> "文字和声音为 3D 世界增添灵魂。"

## FontLoader 字体加载

FontLoader 加载 JSON 格式的字体文件，用于创建 3D 文字。

```typescript
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

const loader = new FontLoader();

// 加载字体
loader.load(
  'fonts/helvetiker_regular.typeface.json',
  (font) => {
    // 创建 3D 文字
    const textGeometry = new TextGeometry('Hello Three.js', {
      font: font,
      size: 1,
      depth: 0.2,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelOffset: 0,
      bevelSegments: 5,
    });
    
    // 居中文字
    textGeometry.computeBoundingBox();
    textGeometry.center();
    
    const textMaterial = new MeshStandardMaterial({
      color: 0x4488ff,
      metalness: 0.3,
      roughness: 0.4,
    });
    
    const textMesh = new Mesh(textGeometry, textMaterial);
    scene.add(textMesh);
  }
);

// Promise 方式
async function createText(
  text: string,
  fontUrl: string,
  options?: Partial<TextGeometry['parameters']>
): Promise<Mesh> {
  const loader = new FontLoader();
  const font = await loader.loadAsync(fontUrl);
  
  const geometry = new TextGeometry(text, {
    font,
    size: options?.size ?? 1,
    depth: options?.depth ?? 0.1,
    curveSegments: options?.curveSegments ?? 12,
    bevelEnabled: options?.bevelEnabled ?? false,
    bevelThickness: options?.bevelThickness ?? 0.02,
    bevelSize: options?.bevelSize ?? 0.02,
    bevelSegments: options?.bevelSegments ?? 3,
  });
  
  geometry.center();
  
  return new Mesh(geometry, new MeshStandardMaterial());
}
```

## TextGeometry 参数详解

```typescript
// TextGeometry 参数
interface TextGeometryParameters {
  font: Font;           // 字体对象（必需）
  size: number;         // 文字大小，默认 100
  depth: number;        // 挤压深度，默认 50
  curveSegments: number;// 曲线分段数，默认 12
  
  // 斜角设置
  bevelEnabled: boolean;    // 是否启用斜角，默认 false
  bevelThickness: number;   // 斜角深度，默认 10
  bevelSize: number;        // 斜角大小，默认 8
  bevelOffset: number;      // 斜角偏移，默认 0
  bevelSegments: number;    // 斜角分段数，默认 3
}

// 不同效果示例
const flatText = new TextGeometry('Flat', {
  font,
  size: 2,
  depth: 0.5,
  bevelEnabled: false,
});

const roundedText = new TextGeometry('Rounded', {
  font,
  size: 2,
  depth: 0.5,
  bevelEnabled: true,
  bevelThickness: 0.1,
  bevelSize: 0.05,
  bevelSegments: 10,
});

const sharpText = new TextGeometry('Sharp', {
  font,
  size: 2,
  depth: 0.5,
  bevelEnabled: true,
  bevelThickness: 0.1,
  bevelSize: 0.1,
  bevelSegments: 1,
});
```

## 字体转换

Three.js 使用 JSON 格式字体，需要从 TTF/OTF 转换。

```typescript
// 使用 facetype.js 转换字体
// https://gero3.github.io/facetype.js/

// 内置字体路径
const builtinFonts = [
  'fonts/helvetiker_regular.typeface.json',
  'fonts/helvetiker_bold.typeface.json',
  'fonts/optimer_regular.typeface.json',
  'fonts/optimer_bold.typeface.json',
  'fonts/gentilis_regular.typeface.json',
  'fonts/gentilis_bold.typeface.json',
  'fonts/droid_sans_regular.typeface.json',
  'fonts/droid_sans_bold.typeface.json',
  'fonts/droid_serif_regular.typeface.json',
  'fonts/droid_serif_bold.typeface.json',
];

// 字体缓存
class FontManager {
  private loader = new FontLoader();
  private cache = new Map<string, Font>();
  
  async load(url: string): Promise<Font> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }
    
    const font = await this.loader.loadAsync(url);
    this.cache.set(url, font);
    return font;
  }
  
  async preload(urls: string[]): Promise<void> {
    await Promise.all(urls.map(url => this.load(url)));
  }
}
```

## 动态文字更新

```typescript
class DynamicText {
  private mesh: Mesh;
  private font: Font;
  private material: Material;
  private options: TextGeometryParameters;
  
  constructor(
    font: Font,
    text: string,
    material: Material,
    options?: Partial<TextGeometryParameters>
  ) {
    this.font = font;
    this.material = material;
    this.options = {
      font,
      size: 1,
      depth: 0.1,
      bevelEnabled: false,
      ...options,
    } as TextGeometryParameters;
    
    this.mesh = this.createMesh(text);
  }
  
  private createMesh(text: string): Mesh {
    const geometry = new TextGeometry(text, this.options);
    geometry.center();
    return new Mesh(geometry, this.material);
  }
  
  setText(text: string): void {
    // 销毁旧几何体
    this.mesh.geometry.dispose();
    
    // 创建新几何体
    const newGeometry = new TextGeometry(text, this.options);
    newGeometry.center();
    this.mesh.geometry = newGeometry;
  }
  
  getMesh(): Mesh {
    return this.mesh;
  }
  
  dispose(): void {
    this.mesh.geometry.dispose();
  }
}

// 使用
const font = await new FontLoader().loadAsync('font.json');
const dynamicText = new DynamicText(font, 'Score: 0', material);
scene.add(dynamicText.getMesh());

// 更新文字
dynamicText.setText('Score: 100');
```

## 2D 文字（Canvas 纹理）

```typescript
// 使用 Canvas 创建 2D 文字纹理
function createTextTexture(
  text: string,
  options?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    padding?: number;
  }
): Texture {
  const {
    fontSize = 64,
    fontFamily = 'Arial',
    color = '#ffffff',
    backgroundColor = 'transparent',
    padding = 10,
  } = options || {};
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  
  // 测量文字
  context.font = `${fontSize}px ${fontFamily}`;
  const metrics = context.measureText(text);
  
  // 设置画布大小
  canvas.width = metrics.width + padding * 2;
  canvas.height = fontSize + padding * 2;
  
  // 绘制背景
  if (backgroundColor !== 'transparent') {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  // 绘制文字
  context.font = `${fontSize}px ${fontFamily}`;
  context.fillStyle = color;
  context.textBaseline = 'top';
  context.fillText(text, padding, padding);
  
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
}

// 创建文字精灵
function createTextSprite(text: string, options?: Parameters<typeof createTextTexture>[1]): Sprite {
  const texture = createTextTexture(text, options);
  
  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
  });
  
  const sprite = new Sprite(material);
  
  // 根据纹理比例设置大小
  const aspect = texture.image.width / texture.image.height;
  sprite.scale.set(aspect, 1, 1);
  
  return sprite;
}

// 使用
const label = createTextSprite('Hello World', {
  fontSize: 48,
  color: '#00ff00',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
});
label.position.set(0, 2, 0);
scene.add(label);
```

## AudioLoader 音频加载

```typescript
import { AudioLoader, Audio, AudioListener, PositionalAudio } from 'three';

// 创建音频监听器（通常绑定到相机）
const listener = new AudioListener();
camera.add(listener);

// 创建音频加载器
const audioLoader = new AudioLoader();

// 全局音频（背景音乐）
const bgMusic = new Audio(listener);

audioLoader.load(
  'audio/music.mp3',
  (buffer) => {
    bgMusic.setBuffer(buffer);
    bgMusic.setLoop(true);
    bgMusic.setVolume(0.5);
    bgMusic.play();
  }
);

// 位置音频（3D 音效）
const explosionSound = new PositionalAudio(listener);

audioLoader.load(
  'audio/explosion.wav',
  (buffer) => {
    explosionSound.setBuffer(buffer);
    explosionSound.setRefDistance(20);
    explosionSound.setRolloffFactor(2);
  }
);

// 将位置音频绑定到物体
explosionObject.add(explosionSound);

// 播放
function playExplosion(): void {
  if (explosionSound.isPlaying) {
    explosionSound.stop();
  }
  explosionSound.play();
}
```

## 音频管理器

```typescript
class AudioManager {
  private listener: AudioListener;
  private loader = new AudioLoader();
  private sounds = new Map<string, AudioBuffer>();
  private playingSounds = new Map<string, Audio | PositionalAudio>();
  
  constructor(camera: Camera) {
    this.listener = new AudioListener();
    camera.add(this.listener);
  }
  
  async load(name: string, url: string): Promise<void> {
    const buffer = await this.loader.loadAsync(url);
    this.sounds.set(name, buffer);
  }
  
  async preload(sounds: Record<string, string>): Promise<void> {
    const promises = Object.entries(sounds).map(
      ([name, url]) => this.load(name, url)
    );
    await Promise.all(promises);
  }
  
  playGlobal(name: string, options?: {
    loop?: boolean;
    volume?: number;
  }): Audio | null {
    const buffer = this.sounds.get(name);
    if (!buffer) return null;
    
    const { loop = false, volume = 1 } = options || {};
    
    const sound = new Audio(this.listener);
    sound.setBuffer(buffer);
    sound.setLoop(loop);
    sound.setVolume(volume);
    sound.play();
    
    this.playingSounds.set(name, sound);
    
    sound.onEnded = () => {
      this.playingSounds.delete(name);
    };
    
    return sound;
  }
  
  playPositional(
    name: string,
    position: Vector3,
    options?: {
      refDistance?: number;
      rolloffFactor?: number;
      volume?: number;
    }
  ): PositionalAudio | null {
    const buffer = this.sounds.get(name);
    if (!buffer) return null;
    
    const {
      refDistance = 10,
      rolloffFactor = 1,
      volume = 1,
    } = options || {};
    
    const sound = new PositionalAudio(this.listener);
    sound.setBuffer(buffer);
    sound.setRefDistance(refDistance);
    sound.setRolloffFactor(rolloffFactor);
    sound.setVolume(volume);
    sound.position.copy(position);
    sound.play();
    
    sound.onEnded = () => {
      sound.parent?.remove(sound);
    };
    
    return sound;
  }
  
  stop(name: string): void {
    const sound = this.playingSounds.get(name);
    if (sound && sound.isPlaying) {
      sound.stop();
    }
  }
  
  stopAll(): void {
    for (const sound of this.playingSounds.values()) {
      if (sound.isPlaying) {
        sound.stop();
      }
    }
    this.playingSounds.clear();
  }
  
  setMasterVolume(volume: number): void {
    this.listener.setMasterVolume(volume);
  }
  
  dispose(): void {
    this.stopAll();
    this.sounds.clear();
  }
}

// 使用
const audioManager = new AudioManager(camera);

await audioManager.preload({
  bgMusic: 'audio/background.mp3',
  footstep: 'audio/footstep.wav',
  explosion: 'audio/explosion.wav',
  pickup: 'audio/pickup.wav',
});

// 播放背景音乐
audioManager.playGlobal('bgMusic', { loop: true, volume: 0.3 });

// 播放位置音效
audioManager.playPositional('explosion', new Vector3(10, 0, 5));
```

## 音频分析器

```typescript
// 音频可视化
class AudioVisualizer {
  private analyser: THREE.AudioAnalyser;
  private data: Uint8Array;
  
  constructor(audio: Audio | PositionalAudio, fftSize = 128) {
    this.analyser = new THREE.AudioAnalyser(audio, fftSize);
    this.data = this.analyser.data;
  }
  
  getFrequencyData(): Uint8Array {
    return this.analyser.getFrequencyData();
  }
  
  getAverageFrequency(): number {
    return this.analyser.getAverageFrequency();
  }
  
  // 创建频谱可视化
  createBars(count: number): Group {
    const group = new Group();
    
    for (let i = 0; i < count; i++) {
      const geometry = new BoxGeometry(0.5, 1, 0.5);
      const material = new MeshStandardMaterial({
        color: new Color().setHSL(i / count, 0.8, 0.5),
      });
      const bar = new Mesh(geometry, material);
      bar.position.x = (i - count / 2) * 0.6;
      group.add(bar);
    }
    
    return group;
  }
  
  updateBars(bars: Group): void {
    const data = this.getFrequencyData();
    const barCount = bars.children.length;
    
    bars.children.forEach((bar, i) => {
      const dataIndex = Math.floor(i / barCount * data.length);
      const value = data[dataIndex] / 255;
      bar.scale.y = value * 5 + 0.1;
      bar.position.y = bar.scale.y / 2;
    });
  }
}
```

## 本章小结

- FontLoader 加载 JSON 格式字体
- TextGeometry 创建 3D 挤压文字
- Canvas 纹理适合创建 2D 标签
- AudioLoader 加载音频文件
- Audio 播放全局音效
- PositionalAudio 播放 3D 位置音效
- AudioAnalyser 实现音频可视化

下一章，我们将学习高级动画和物理系统。
