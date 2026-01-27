# 向后兼容与渐进式升级

Vue3 的发布带来了重大变化，但 Vue 团队在设计时充分考虑了从 Vue2 迁移的平滑性。这种渐进式升级策略是 Vue 一贯理念的延续。

## 兼容性构建版本

Vue3 提供了 `@vue/compat` 包（也称为"迁移构建版本"），它是一个特殊的 Vue3 构建，在运行时模拟了大部分 Vue2 的行为。

```javascript
// vue.config.js
module.exports = {
  chainWebpack: (config) => {
    config.resolve.alias.set('vue', '@vue/compat')
  }
}
```

使用迁移构建版本后，大部分 Vue2 代码可以直接运行在 Vue3 环境中。当代码使用了已废弃的 API 时，控制台会输出警告，指导开发者如何修改。

这种设计让团队可以先升级到 Vue3 环境，然后逐步修复兼容性问题，而不是一次性完成所有迁移工作。

## Breaking Changes 的分类

Vue3 的 breaking changes 可以分为几个层次。

**编译时可自动处理的变化**：如 v-model 的 prop 和 event 名称变化、v-for 中 ref 的行为变化等。这些可以通过迁移构建版本自动处理，或者使用 codemod 工具批量转换。

**需要手动修改的 API 变化**：如全局 API 从 `Vue.xxx` 改为 `app.xxx`、过滤器（filters）被移除、`$listeners` 被合并到 `$attrs` 等。这些需要开发者根据新的 API 进行调整。

**底层行为变化**：如响应式系统从 `Object.defineProperty` 改为 Proxy、生命周期钩子时机的细微调整等。这些变化通常对应用代码影响较小，但可能影响依赖底层行为的库。

## 渐进式迁移策略

Vue 团队推荐的迁移路径是：

首先升级工具链。确保使用最新版本的 Vue CLI 或迁移到 Vite，更新相关的构建配置。

然后启用迁移构建版本。将 vue 的别名指向 `@vue/compat`，让应用在 Vue3 环境中运行，观察控制台的警告信息。

接着逐步修复兼容性问题。按照警告信息的指导，一个个修复已废弃的 API 使用。优先处理高频出现的警告。

最后移除迁移构建版本。当所有警告都被解决后，将 vue 改回正式的 Vue3 包。

```javascript
// 迁移完成后的配置
module.exports = {
  chainWebpack: (config) => {
    // 移除 compat 别名，使用正式版 Vue3
    config.resolve.alias.delete('vue')
  }
}
```

## 生态系统的同步升级

Vue 核心团队维护的库（Vue Router、Vuex/Pinia、Vue Devtools）都同步发布了 Vue3 兼容版本。

Vue Router 4 是为 Vue3 设计的路由库，API 有一些变化但保持了熟悉的使用方式。Pinia 作为新一代状态管理方案，被推荐用于替代 Vuex。Vuex 4 也提供了 Vue3 支持，让现有 Vuex 项目可以平滑过渡。

第三方生态系统的升级需要更多时间。Vue 团队提供了详细的迁移文档和工具，帮助库作者适配 Vue3。随着时间推移，主流的 Vue 生态库都已经提供了 Vue3 版本。

这种系统性的迁移支持，体现了 Vue 对开发者体验的重视。大型项目的迁移不是一夜之间的事情，渐进式的策略让这个过程变得可控。
