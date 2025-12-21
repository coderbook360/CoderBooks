<script setup lang="ts">
import SiteMap from './SiteMap.vue'
</script>

<template>
  <section id="hero">
    <h1 class="tagline">
      <span class="accent">CoderBooks</span>
      <br />程序员书籍精选
    </h1>
    <p class="description">
      深入源码，洞察原理，构建技术体系
    </p>
    <p class="actions">
      <a class="get-started" href="/books/web-frontend/mini-vue3/book_zh/">
        开始阅读
        <svg
          class="icon"
          xmlns="http://www.w3.org/2000/svg"
          width="10"
          height="10"
          viewBox="0 0 24 24"
        >
          <path
            d="M13.025 1l-2.847 2.828 6.176 6.176h-16.354v3.992h16.354l-6.176 6.176 2.847 2.828 10.975-11z"
          />
        </svg>
      </a>
      <a class="setup" href="https://github.com/coderbook360/CoderBooks" target="_blank">GitHub</a>
    </p>
  </section>

  <section id="highlights" class="vt-box-container">
    <div class="vt-box">
      <h2>📚 精选书籍</h2>
      <p>
        涵盖前端、后端、算法、图形学等多个领域，精心挑选优质技术书籍。
      </p>
    </div>
    <div class="vt-box">
      <h2>🔍 源码解析</h2>
      <p>
        深入框架源码，理解底层实现，从 Vue、React 到 Node.js 生态。
      </p>
    </div>
    <div class="vt-box">
      <h2>💡 实战导向</h2>
      <p>
        结合实际项目，手把手教你实现核心功能，学以致用。
      </p>
    </div>
  </section>

  <SiteMap />
</template>

<style scoped>
section {
  padding: 42px 32px;
}

#hero {
  padding: 96px 32px;
  text-align: center;
}

.tagline {
  font-size: 76px;
  line-height: 1.25;
  font-weight: 900;
  letter-spacing: -1.5px;
  max-width: 960px;
  margin: 0px auto;
}

html:not(.dark) .accent,
.dark .tagline {
  background: -webkit-linear-gradient(315deg, #42d392 25%, #647eff);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.dark .accent {
  background: -webkit-linear-gradient(315deg, #42d392 25%, #647eff);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.description {
  max-width: 960px;
  line-height: 1.5;
  color: var(--vt-c-text-2);
  transition: color 0.5s;
  font-size: 22px;
  margin: 24px auto 40px;
}

.actions a {
  font-size: 16px;
  display: inline-block;
  background-color: var(--vt-c-bg-mute);
  padding: 8px 18px;
  font-weight: 500;
  border-radius: 8px;
  transition: background-color 0.5s, color 0.5s;
}

.actions .get-started {
  margin-right: 18px;
}

.actions .icon {
  display: inline;
  position: relative;
  top: -1px;
  margin-left: 2px;
  fill: currentColor;
  transition: transform 0.2s;
}

.actions .get-started:hover {
  transition-duration: 0.2s;
}

.actions .get-started:hover .icon {
  transform: translateX(2px);
}

.actions .get-started {
  color: #fff;
  background-color: var(--vt-c-green);
}

.actions .get-started:hover {
  background-color: var(--vt-c-green-dark);
}

.dark .actions .get-started {
  color: var(--vt-c-indigo);
}

.actions .setup {
  color: var(--vt-c-text-code);
}

.actions .setup:hover {
  background-color: var(--vt-c-gray-light-4);
}

.dark .actions .setup:hover {
  background-color: var(--vt-c-gray-dark-3);
}

#highlights {
  max-width: 960px;
  margin: 0px auto;
  color: var(--vt-c-text-2);
}

#highlights h2 {
  font-weight: 600;
  font-size: 20px;
  letter-spacing: -0.4px;
  color: var(--vt-c-text-1);
  transition: color 0.5s;
  margin-bottom: 0.75em;
}

#highlights p {
  font-weight: 400;
  font-size: 15px;
}

#highlights .vt-box {
  background-color: transparent;
}

@media (max-width: 960px) {
  .tagline {
    font-size: 64px;
    letter-spacing: -0.5px;
  }
  .description {
    font-size: 18px;
    margin-bottom: 48px;
  }
}

@media (max-width: 768px) {
  .tagline {
    font-size: 48px;
    letter-spacing: -0.5px;
  }
}

@media (max-width: 576px) {
  #hero {
    padding: 56px 32px;
  }
  .description {
    font-size: 16px;
    margin: 18px 0 30px;
  }
  .tagline {
    font-size: 36px;
    letter-spacing: -0.5px;
  }
  .actions a {
    margin: 6px 0;
  }
}

@media (max-width: 370px) {
  .tagline {
    font-size: 32px;
  }
}
</style>
