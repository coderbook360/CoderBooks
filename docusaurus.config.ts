import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'CoderBooks',
  tagline: '深入源码，掌握本质 | 程序员的技术书籍库',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://coderbooks.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'coderbooks', // Usually your GitHub org/user name.
  projectName: 'coderbooks', // Usually your repo name.

  onBrokenLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  // 多文档实例插件 - 每本书一个实例
  plugins: [
    // ========== 源码解读系列 ==========
    ['@docusaurus/plugin-content-docs', {
      id: 'mini-vite',
      path: 'docs/source-code/mini-vite',
      routeBasePath: 'books/mini-vite',
      sidebarPath: './docs/source-code/mini-vite/sidebar.json',
    }],
    ['@docusaurus/plugin-content-docs', {
      id: 'mini-vue3',
      path: 'docs/source-code/mini-vue3',
      routeBasePath: 'books/mini-vue3',
      sidebarPath: './docs/source-code/mini-vue3/sidebar.json',
    }],
    ['@docusaurus/plugin-content-docs', {
      id: 'mini-acornjs',
      path: 'docs/source-code/mini-acornjs',
      routeBasePath: 'books/mini-acornjs',
      sidebarPath: './docs/source-code/mini-acornjs/sidebar.json',
    }],
    ['@docusaurus/plugin-content-docs', {
      id: 'mini-hammerjs',
      path: 'docs/source-code/mini-hammerjs',
      routeBasePath: 'books/mini-hammerjs',
      sidebarPath: './docs/source-code/mini-hammerjs/sidebar.json',
    }],
    ['@docusaurus/plugin-content-docs', {
      id: 'mini-ramdajs',
      path: 'docs/source-code/mini-ramdajs',
      routeBasePath: 'books/mini-ramdajs',
      sidebarPath: './docs/source-code/mini-ramdajs/sidebar.json',
    }],
    ['@docusaurus/plugin-content-docs', {
      id: 'mini-path-to-regexp',
      path: 'docs/source-code/mini-path-to-regexp',
      routeBasePath: 'books/mini-path-to-regexp',
      sidebarPath: './docs/source-code/mini-path-to-regexp/sidebar.json',
    }],
    ['@docusaurus/plugin-content-docs', {
      id: 'v8-book',
      path: 'docs/source-code/v8',
      routeBasePath: 'books/v8',
      sidebarPath: './docs/source-code/v8/sidebar.json',
    }],

    // ========== AI 与思维系列 ==========
    ['@docusaurus/plugin-content-docs', {
      id: 'ai-prompt',
      path: 'docs/ai-thinking/ai-prompt',
      routeBasePath: 'books/ai-prompt',
      sidebarPath: './docs/ai-thinking/ai-prompt/sidebar.json',
    }],
    ['@docusaurus/plugin-content-docs', {
      id: 'clear-thinking',
      path: 'docs/ai-thinking/clear-thinking',
      routeBasePath: 'books/clear-thinking',
      sidebarPath: './docs/ai-thinking/clear-thinking/sidebar.json',
    }],

    // ========== 前端工具系列 ==========
    ['@docusaurus/plugin-content-docs', {
      id: 'quick-unocss',
      path: 'docs/frontend-tools/unocss',
      routeBasePath: 'books/unocss',
      sidebarPath: './docs/frontend-tools/unocss/sidebar.json',
    }],

    // ========== LeetCode 算法系列 ==========
    ['@docusaurus/plugin-content-docs', {
      id: 'leetcode-ds',
      path: 'docs/leetcode/ds-foundations',
      routeBasePath: 'books/leetcode-ds',
      sidebarPath: './docs/leetcode/ds-foundations/sidebar.json',
    }],
    ['@docusaurus/plugin-content-docs', {
      id: 'leetcode-algo',
      path: 'docs/leetcode/algo-techniques',
      routeBasePath: 'books/leetcode-algo',
      sidebarPath: './docs/leetcode/algo-techniques/sidebar.json',
    }],
    ['@docusaurus/plugin-content-docs', {
      id: 'leetcode-dp',
      path: 'docs/leetcode/dp-mastery',
      routeBasePath: 'books/leetcode-dp',
      sidebarPath: './docs/leetcode/dp-mastery/sidebar.json',
    }],
    ['@docusaurus/plugin-content-docs', {
      id: 'leetcode-graph',
      path: 'docs/leetcode/graph-search',
      routeBasePath: 'books/leetcode-graph',
      sidebarPath: './docs/leetcode/graph-search/sidebar.json',
    }],
    ['@docusaurus/plugin-content-docs', {
      id: 'leetcode-advanced',
      path: 'docs/leetcode/advanced-ds',
      routeBasePath: 'books/leetcode-advanced',
      sidebarPath: './docs/leetcode/advanced-ds/sidebar.json',
    }],
    ['@docusaurus/plugin-content-docs', {
      id: 'leetcode-competitive',
      path: 'docs/leetcode/competitive',
      routeBasePath: 'books/leetcode-competitive',
      sidebarPath: './docs/leetcode/competitive/sidebar.json',
    }],
  ],

  // Markdown 配置 - 使用宽松模式处理非标准语法
  markdown: {
    format: 'detect', // 自动检测 md/mdx 格式
    mermaid: false,
    preprocessor: ({filePath, fileContent}) => {
      // 转义可能被误解析为 JSX 的语法，如 <L=1> <n=5> 等
      return fileContent.replace(/<([a-zA-Z])=/g, '&lt;$1=');
    },
  },

  presets: [
    [
      'classic',
      {
        docs: false, // 禁用默认 docs
        blog: false, // 禁用博客
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'CoderBooks',
      logo: {
        alt: 'CoderBooks Logo',
        src: 'img/logo.svg',
      },
      items: [
        // 源码解读系列
        {
          type: 'dropdown',
          label: '🔧 源码解读',
          position: 'left',
          items: [
            { to: '/books/mini-vite', label: 'Mini-Vite 源码解读' },
            { to: '/books/mini-vue3', label: 'Mini-Vue3 源码解读' },
            { to: '/books/mini-acornjs', label: 'Mini-Acorn.js 解析器' },
            { to: '/books/mini-hammerjs', label: 'Mini-Hammer.js 手势库' },
            { to: '/books/mini-ramdajs', label: 'Mini-Ramda.js 函数式' },
            { to: '/books/mini-path-to-regexp', label: 'Path-to-RegExp 路由' },
            { to: '/books/v8', label: 'V8 引擎深度剖析' },
          ],
        },
        // LeetCode 算法系列
        {
          type: 'dropdown',
          label: '📊 LeetCode',
          position: 'left',
          items: [
            { to: '/books/leetcode-ds', label: '① 数据结构基础' },
            { to: '/books/leetcode-algo', label: '② 算法技巧篇' },
            { to: '/books/leetcode-dp', label: '③ 动态规划精通' },
            { to: '/books/leetcode-graph', label: '④ 图论与搜索' },
            { to: '/books/leetcode-advanced', label: '⑤ 高级数据结构' },
            { to: '/books/leetcode-competitive', label: '⑥ 算法竞赛实战' },
          ],
        },
        // AI 与思维系列
        {
          type: 'dropdown',
          label: '🤖 AI & 思维',
          position: 'left',
          items: [
            { to: '/books/ai-prompt', label: 'AI 提示词工程' },
            { to: '/books/clear-thinking', label: '清晰思考' },
          ],
        },
        // 前端工具
        {
          type: 'dropdown',
          label: '🛠️ 前端工具',
          position: 'left',
          items: [
            { to: '/books/unocss', label: 'UnoCSS 实战指南' },
          ],
        },
        {
          href: 'https://github.com/user/coderbooks',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '源码解读',
          items: [
            { label: 'Mini-Vite', to: '/books/mini-vite' },
            { label: 'Mini-Vue3', to: '/books/mini-vue3' },
            { label: 'V8 引擎', to: '/books/v8' },
          ],
        },
        {
          title: 'LeetCode 系列',
          items: [
            { label: '数据结构基础', to: '/books/leetcode-ds' },
            { label: '算法技巧篇', to: '/books/leetcode-algo' },
            { label: '动态规划精通', to: '/books/leetcode-dp' },
          ],
        },
        {
          title: 'AI & 工具',
          items: [
            { label: 'AI 提示词工程', to: '/books/ai-prompt' },
            { label: 'UnoCSS 指南', to: '/books/unocss' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} CoderBooks. 深入源码，掌握本质。`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
