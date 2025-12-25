# AnimationMixer 动画系统

> "流畅的动画是 3D 应用生动性的灵魂。"

## 动画系统架构

```
Three.js 动画系统：

┌─────────────────────────────────────────────────┐
│              AnimationMixer                      │
│         (动画混合器 - 核心控制器)                │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
    │ Action  │ │ Action  │ │ Action  │
    │ (Walk)  │ │ (Run)   │ │ (Jump)  │
    └────┬────┘ └────┬────┘ └────┬────┘
         │           │           │
    ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
    │  Clip   │ │  Clip   │ │  Clip   │
    │(关键帧) │ │(关键帧) │ │(关键帧) │
    └────┬────┘ └────┬────┘ └────┬────┘
         │           │           │
         └───────────┼───────────┘
                     │
              ┌──────▼──────┐
              │   Object3D   │
              │   (目标)     │
              └─────────────┘
```

## AnimationMixer 基础

```typescript
import {
  AnimationMixer,
  AnimationClip,
  AnimationAction,
  LoopRepeat,
  LoopOnce,
  LoopPingPong,
} from 'three';

// 创建混合器
const mixer = new AnimationMixer(model);

// 创建动画动作
const clip = AnimationClip.findByName(animations, 'Walk');
const action = mixer.clipAction(clip);

// 播放
action.play();

// 更新循环
const clock = new Clock();

function animate() {
  const delta = clock.getDelta();
  mixer.update(delta);
  
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

## AnimationAction 控制

```typescript
// 获取动作
const walkAction = mixer.clipAction(walkClip);
const runAction = mixer.clipAction(runClip);

// 基本控制
walkAction.play();       // 播放
walkAction.stop();       // 停止
walkAction.reset();      // 重置
walkAction.paused = true; // 暂停

// 播放参数
walkAction.timeScale = 1.5;        // 速度（1.5 = 1.5倍速）
walkAction.weight = 1.0;           // 权重（混合用）
walkAction.time = 0;               // 当前时间

// 循环模式
walkAction.setLoop(LoopRepeat, Infinity);  // 无限循环
walkAction.setLoop(LoopOnce, 1);           // 播放一次
walkAction.setLoop(LoopPingPong, 2);       // 往返播放

// 循环结束行为
walkAction.clampWhenFinished = true;  // 停留在最后一帧

// 有效参数（考虑淡入淡出后的实际值）
walkAction.setEffectiveTimeScale(1.5);
walkAction.setEffectiveWeight(1.0);

// 淡入淡出
walkAction.fadeIn(0.3);   // 0.3 秒淡入
walkAction.fadeOut(0.3);  // 0.3 秒淡出

// 交叉淡入淡出
walkAction.crossFadeTo(runAction, 0.3, true);
runAction.crossFadeFrom(walkAction, 0.3, true);
```

## 动画状态机

```typescript
type AnimationState = 'idle' | 'walk' | 'run' | 'jump';

class CharacterAnimator {
  private mixer: AnimationMixer;
  private actions = new Map<AnimationState, AnimationAction>();
  private currentState: AnimationState = 'idle';
  private currentAction?: AnimationAction;
  
  constructor(model: Object3D, clips: AnimationClip[]) {
    this.mixer = new AnimationMixer(model);
    
    // 初始化所有动作
    clips.forEach(clip => {
      const state = clip.name.toLowerCase() as AnimationState;
      const action = this.mixer.clipAction(clip);
      
      // 默认配置
      action.setLoop(LoopRepeat, Infinity);
      
      this.actions.set(state, action);
    });
    
    // 播放初始状态
    this.setState('idle');
  }
  
  setState(newState: AnimationState, fadeTime = 0.3): void {
    if (newState === this.currentState) return;
    
    const newAction = this.actions.get(newState);
    if (!newAction) {
      console.warn(`Animation state not found: ${newState}`);
      return;
    }
    
    // 淡出当前动画
    if (this.currentAction) {
      this.currentAction.fadeOut(fadeTime);
    }
    
    // 淡入新动画
    newAction
      .reset()
      .setEffectiveTimeScale(1)
      .setEffectiveWeight(1)
      .fadeIn(fadeTime)
      .play();
    
    this.currentAction = newAction;
    this.currentState = newState;
  }
  
  playOnce(state: AnimationState, onComplete?: () => void): void {
    const action = this.actions.get(state);
    if (!action) return;
    
    // 配置单次播放
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    
    // 播放
    action.reset().play();
    
    // 完成回调
    if (onComplete) {
      const onFinished = (e: { action: AnimationAction }) => {
        if (e.action === action) {
          this.mixer.removeEventListener('finished', onFinished);
          onComplete();
        }
      };
      this.mixer.addEventListener('finished', onFinished);
    }
  }
  
  update(delta: number): void {
    this.mixer.update(delta);
  }
  
  getState(): AnimationState {
    return this.currentState;
  }
  
  dispose(): void {
    this.mixer.stopAllAction();
    this.actions.clear();
  }
}

// 使用
const animator = new CharacterAnimator(character, gltf.animations);

// 根据输入切换状态
function handleInput(input: { forward: boolean; sprint: boolean }) {
  if (input.forward) {
    animator.setState(input.sprint ? 'run' : 'walk');
  } else {
    animator.setState('idle');
  }
}

// 播放跳跃动画
animator.playOnce('jump', () => {
  animator.setState('idle');
});
```

## 动画混合

```typescript
// 加性混合（叠加动画）
class AdditiveAnimationMixer {
  private mixer: AnimationMixer;
  private baseAction?: AnimationAction;
  private additiveActions: AnimationAction[] = [];
  
  constructor(model: Object3D) {
    this.mixer = new AnimationMixer(model);
  }
  
  setBaseAnimation(clip: AnimationClip): void {
    this.baseAction = this.mixer.clipAction(clip);
    this.baseAction.play();
  }
  
  addAdditiveAnimation(clip: AnimationClip, weight = 1): AnimationAction {
    // 将普通动画转为加性动画
    AnimationUtils.makeClipAdditive(clip);
    
    const action = this.mixer.clipAction(clip);
    action.blendMode = AdditiveAnimationBlendMode;
    action.weight = weight;
    action.play();
    
    this.additiveActions.push(action);
    return action;
  }
  
  update(delta: number): void {
    this.mixer.update(delta);
  }
}

// 多层动画混合
class LayeredAnimationMixer {
  private mixer: AnimationMixer;
  private layers: Map<string, AnimationAction[]> = new Map();
  
  constructor(model: Object3D) {
    this.mixer = new AnimationMixer(model);
  }
  
  addLayer(name: string, clips: AnimationClip[]): void {
    const actions = clips.map(clip => this.mixer.clipAction(clip));
    this.layers.set(name, actions);
  }
  
  playOnLayer(layerName: string, clipIndex: number, weight = 1): void {
    const actions = this.layers.get(layerName);
    if (!actions) return;
    
    actions.forEach((action, i) => {
      if (i === clipIndex) {
        action.setEffectiveWeight(weight);
        action.play();
      } else {
        action.setEffectiveWeight(0);
      }
    });
  }
  
  setLayerWeight(layerName: string, weight: number): void {
    const actions = this.layers.get(layerName);
    actions?.forEach(action => {
      action.setEffectiveWeight(action.getEffectiveWeight() * weight);
    });
  }
  
  update(delta: number): void {
    this.mixer.update(delta);
  }
}
```

## AnimationClip 创建

```typescript
// 程序化创建动画
function createBounceAnimation(duration = 1): AnimationClip {
  // 关键帧时间
  const times = [0, 0.25, 0.5, 0.75, 1];
  
  // 位置关键帧值
  const positionValues = [
    0, 0, 0,     // t=0
    0, 1, 0,     // t=0.25
    0, 2, 0,     // t=0.5
    0, 1, 0,     // t=0.75
    0, 0, 0,     // t=1
  ];
  
  // 缩放关键帧值
  const scaleValues = [
    1, 1, 1,
    1.1, 0.9, 1.1,
    1, 1, 1,
    0.9, 1.1, 0.9,
    1, 1, 1,
  ];
  
  // 创建轨道
  const positionTrack = new VectorKeyframeTrack(
    '.position',
    times,
    positionValues
  );
  
  const scaleTrack = new VectorKeyframeTrack(
    '.scale',
    times,
    scaleValues
  );
  
  // 创建动画剪辑
  return new AnimationClip('Bounce', duration, [positionTrack, scaleTrack]);
}

// 创建旋转动画
function createSpinAnimation(
  axis: 'x' | 'y' | 'z' = 'y',
  duration = 2
): AnimationClip {
  const times = [0, duration];
  
  // 四元数关键帧
  const quaternion1 = new Quaternion();
  const quaternion2 = new Quaternion();
  
  const axisVector = new Vector3(
    axis === 'x' ? 1 : 0,
    axis === 'y' ? 1 : 0,
    axis === 'z' ? 1 : 0
  );
  
  quaternion2.setFromAxisAngle(axisVector, Math.PI * 2);
  
  const values = [
    quaternion1.x, quaternion1.y, quaternion1.z, quaternion1.w,
    quaternion2.x, quaternion2.y, quaternion2.z, quaternion2.w,
  ];
  
  const track = new QuaternionKeyframeTrack('.quaternion', times, values);
  
  return new AnimationClip('Spin', duration, [track]);
}

// 使用
const bounceClip = createBounceAnimation(1);
const bounceAction = mixer.clipAction(bounceClip);
bounceAction.setLoop(LoopRepeat, Infinity);
bounceAction.play();
```

## 变形目标动画

```typescript
// 面部表情动画
class FacialAnimationController {
  private mesh: SkinnedMesh;
  private morphDict: Record<string, number>;
  
  constructor(mesh: SkinnedMesh) {
    this.mesh = mesh;
    this.morphDict = mesh.morphTargetDictionary || {};
  }
  
  setMorphTarget(name: string, value: number): void {
    const index = this.morphDict[name];
    if (index !== undefined && this.mesh.morphTargetInfluences) {
      this.mesh.morphTargetInfluences[index] = value;
    }
  }
  
  // 创建表情动画
  createExpressionClip(
    name: string,
    targets: Record<string, number>,
    duration = 0.5
  ): AnimationClip {
    const tracks: KeyframeTrack[] = [];
    
    for (const [targetName, targetValue] of Object.entries(targets)) {
      const index = this.morphDict[targetName];
      if (index !== undefined) {
        const track = new NumberKeyframeTrack(
          `.morphTargetInfluences[${index}]`,
          [0, duration / 2, duration],
          [0, targetValue, 0]
        );
        tracks.push(track);
      }
    }
    
    return new AnimationClip(name, duration, tracks);
  }
  
  // 预设表情
  smile(): AnimationClip {
    return this.createExpressionClip('smile', {
      'mouthSmile': 1,
      'eyeSquint': 0.5,
    });
  }
  
  blink(): AnimationClip {
    return this.createExpressionClip('blink', {
      'eyesClosed': 1,
    }, 0.15);
  }
}
```

## 动画事件

```typescript
// 监听动画事件
mixer.addEventListener('loop', (e) => {
  console.log('Animation looped:', e.action.getClip().name);
});

mixer.addEventListener('finished', (e) => {
  console.log('Animation finished:', e.action.getClip().name);
});

// 自定义动画事件系统
class AnimationEventSystem {
  private mixer: AnimationMixer;
  private events = new Map<string, { time: number; callback: () => void }[]>();
  private lastTime = new Map<AnimationAction, number>();
  
  constructor(mixer: AnimationMixer) {
    this.mixer = mixer;
  }
  
  addEvent(
    clipName: string,
    time: number,
    callback: () => void
  ): void {
    const events = this.events.get(clipName) || [];
    events.push({ time, callback });
    this.events.set(clipName, events);
  }
  
  update(): void {
    // 检查每个激活的动作
    for (const action of this.mixer._actions) {
      if (!action.isRunning()) continue;
      
      const clipName = action.getClip().name;
      const events = this.events.get(clipName);
      if (!events) continue;
      
      const currentTime = action.time;
      const lastTime = this.lastTime.get(action) || 0;
      
      // 检查是否经过了事件点
      for (const event of events) {
        if (lastTime < event.time && currentTime >= event.time) {
          event.callback();
        }
      }
      
      this.lastTime.set(action, currentTime);
    }
  }
}

// 使用
const eventSystem = new AnimationEventSystem(mixer);

// 在走路动画的脚步声位置添加事件
eventSystem.addEvent('Walk', 0.3, () => playFootstepSound('left'));
eventSystem.addEvent('Walk', 0.8, () => playFootstepSound('right'));

function animate() {
  mixer.update(delta);
  eventSystem.update();
}
```

## 本章小结

- AnimationMixer 是动画系统的核心控制器
- AnimationAction 控制动画播放行为
- 使用淡入淡出实现平滑过渡
- 可以程序化创建动画剪辑
- 变形目标动画用于面部表情
- 通过事件系统同步音效等

下一章，我们将学习骨骼动画和 IK 系统。
