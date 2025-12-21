# 组件内守卫实现

组件内守卫定义在组件选项中，需要与 Vue 组件系统集成。

## 组件内守卫类型

```typescript
interface ComponentWithGuards {
  beforeRouteEnter?: NavigationGuard;
  beforeRouteUpdate?: NavigationGuard;
  beforeRouteLeave?: NavigationGuard;
}
```

## 提取组件守卫

```typescript
function extractComponentGuards(
  matched: RouteRecordNormalized[]
) {
  const guards: NavigationGuard[] = [];
  
  for (const record of matched) {
    const component = record.component;
    
    if (component && typeof component === 'object') {
      if (component.beforeRouteEnter) {
        guards.push(component.beforeRouteEnter);
      }
      if (component.beforeRouteUpdate) {
        guards.push(component.beforeRouteUpdate);
      }
      if (component.beforeRouteLeave) {
        guards.push(component.beforeRouteLeave);
      }
    }
  }
  
  return guards;
}
```

## 使用示例

```vue
<script>
export default {
  beforeRouteEnter(to, from) {
    // 组件实例还未创建，无法访问 this
    console.log('准备进入组件');
  },
  
  beforeRouteUpdate(to, from) {
    // 组件复用时调用（如 /user/1 -> /user/2）
    this.loadData(to.params.id);
  },
  
  beforeRouteLeave(to, from) {
    // 离开组件前调用
    if (this.hasUnsavedChanges) {
      return confirm('确定要离开吗？');
    }
  }
}
</script>
```

下一章实现守卫执行队列。
