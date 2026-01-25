import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Vue3 生态系统学习系列',
  description: '从零到精通：系统掌握 Vue3 核心原理与生态系统',
  base: '/CoderBooks/cs130-vue/',
  outDir: '../../../dist/cs130-vue',
  cleanUrls: true,

  // 忽略死链接检查（toc.md 文件中包含尚未创建的章节链接）
  ignoreDeadLinks: true,

  // 排除有 Vue 模板语法问题的目录（代码示例中的 {{ }} 会被误解析）
  srcExclude: [
    '**/.book_task/**',
    '**/.book_guide/**',
  ],
  
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { 
        text: '核心模块',
        items: [
          { text: '响应式系统', link: '/reactive/' },
          { text: '组件系统', link: '/component/' },
          { text: '路由系统', link: '/router/' },
          { text: '编译器系统', link: '/compiler/' },
          { text: '渲染器系统', link: '/renderer/' }
        ]
      },
      {
        text: '扩展模块',
        items: [
          { text: '状态管理 (Pinia)', link: '/pinia/' },
          { text: '服务端渲染', link: '/ssr/' }
        ]
      },
      { text: '学习路径', link: '/learning-paths' }
    ],

    sidebar: {
      '/reactive/': [
        {
          text: 'Vue3 响应式系统',
          items: [
            { text: '系列概述', link: '/reactive/' },
            { text: '学习路径', link: '/reactive/LEARNING_PATHS' }
          ]
        },
        {
          text: 'L1 快速上手',
          collapsed: true,
          items: [
            { text: '概述', link: '/reactive/01-quick-start/' }
          ]
        },
        {
          text: 'L2 进阶实战',
          collapsed: true,
          items: [
            { text: '概述', link: '/reactive/02-advanced-usage/' }
          ]
        },
        {
          text: 'L3 设计思想',
          collapsed: true,
          items: [
            { text: '概述', link: '/reactive/03-design-philosophy/' }
          ]
        },
        {
          text: 'L4 源码解析',
          collapsed: true,
          items: [
            { text: 'L4-0 源码总览', link: '/reactive/04-0-source-overview/' },
            { text: 'L4-1 源码解析', link: '/reactive/04-1-source-analysis/' },
            { text: 'L4-2 手写实现', link: '/reactive/04-2-implementation/' }
          ]
        },
        {
          text: 'L5 架构方案',
          collapsed: true,
          items: [
            { text: '概述', link: '/reactive/05-architecture-solution/' }
          ]
        }
      ],

      '/component/': [
        {
          text: '前端组件系统',
          items: [
            { text: '系列概述', link: '/component/' },
            { text: '学习路径', link: '/component/LEARNING_PATHS' }
          ]
        },
        {
          text: 'L1 组件快速上手',
          collapsed: true,
          items: [
            { text: '概述', link: '/component/01-component-quick-start/' }
          ]
        },
        {
          text: 'L2 组件进阶实战',
          collapsed: true,
          items: [
            { text: '概述', link: '/component/02-component-advanced/' }
          ]
        },
        {
          text: 'L3 组件设计思想',
          collapsed: true,
          items: [
            { text: '概述', link: '/component/03-component-design/' }
          ]
        },
        {
          text: 'L4 源码解析',
          collapsed: true,
          items: [
            { text: 'L4-0 源码设计总览', link: '/component/04-0-source-overview/' },
            { text: 'L4-1 Vue3 源码解析', link: '/component/04-1-vue3-source/' },
            { text: 'L4-2 Mini Vue3 实现', link: '/component/04-2-vue3-mini/' },
            { text: 'L4-3 React 源码解析', link: '/component/04-3-react-source/' },
            { text: 'L4-4 Mini React 实现', link: '/component/04-4-react-mini/' },
            { text: 'L4-5 Web Components', link: '/component/04-5-web-components/' }
          ]
        },
        {
          text: 'L5 企业级架构',
          collapsed: true,
          items: [
            { text: '概述', link: '/component/05-enterprise-architecture/' }
          ]
        }
      ],

      '/router/': [
        {
          text: 'Vue Router 系统',
          items: [
            { text: '系列概述', link: '/router/' },
            { text: '学习路径', link: '/router/LEARNING_PATHS' }
          ]
        },
        {
          text: 'L1 快速上手',
          collapsed: true,
          items: [
            { text: '概述', link: '/router/01-quick-start/' }
          ]
        },
        {
          text: 'L2 进阶实战',
          collapsed: true,
          items: [
            { text: '概述', link: '/router/02-advanced-usage/' }
          ]
        },
        {
          text: 'L3 设计思想',
          collapsed: true,
          items: [
            { text: '概述', link: '/router/03-design-philosophy/' }
          ]
        },
        {
          text: 'L4 源码解析',
          collapsed: true,
          items: [
            { text: 'L4-0 源码总览', link: '/router/04-0-source-overview/' },
            { text: 'L4-1 源码解析', link: '/router/04-1-source-analysis/' },
            { text: 'L4-2 手写实现', link: '/router/04-2-implementation/' }
          ]
        },
        {
          text: 'L5 架构方案',
          collapsed: true,
          items: [
            { text: '概述', link: '/router/05-architecture-solution/' }
          ]
        }
      ],

      '/compiler/': [
        {
          text: 'Vue3 编译器系统',
          items: [
            { text: '系列概述', link: '/compiler/' }
          ]
        },
        {
          text: 'L1 快速上手',
          collapsed: true,
          items: [
            { text: '概述', link: '/compiler/01-quick-start/' }
          ]
        },
        {
          text: 'L2 进阶实战',
          collapsed: true,
          items: [
            { text: '概述', link: '/compiler/02-advanced-usage/' }
          ]
        },
        {
          text: 'L3 设计思想',
          collapsed: true,
          items: [
            { text: '概述', link: '/compiler/03-design-philosophy/' }
          ]
        },
        {
          text: 'L4 源码解析',
          collapsed: true,
          items: [
            { text: 'L4-0 源码总览', link: '/compiler/04-0-source-overview/' },
            { text: 'L4-1 源码解析', link: '/compiler/04-1-source-analysis/' },
            { text: 'L4-2 手写实现', link: '/compiler/04-2-implementation/' }
          ]
        },
        {
          text: 'L5 架构方案',
          collapsed: true,
          items: [
            { text: '概述', link: '/compiler/05-architecture-solution/' }
          ]
        }
      ],

      '/renderer/': [
        {
          text: 'Vue3 渲染器系统',
          items: [
            { text: '系列概述', link: '/renderer/' }
          ]
        },
        {
          text: 'L1 快速上手',
          collapsed: true,
          items: [
            { text: '概述', link: '/renderer/01-quick-start/' }
          ]
        },
        {
          text: 'L2 进阶实战',
          collapsed: true,
          items: [
            { text: '概述', link: '/renderer/02-advanced-usage/' }
          ]
        },
        {
          text: 'L3 设计思想',
          collapsed: true,
          items: [
            { text: '概述', link: '/renderer/03-design-philosophy/' }
          ]
        },
        {
          text: 'L4 源码解析',
          collapsed: true,
          items: [
            { text: 'L4-0 源码总览', link: '/renderer/04-0-source-overview/' },
            { text: 'L4-1 源码解析', link: '/renderer/04-1-source-analysis/' },
            { text: 'L4-2 手写实现', link: '/renderer/04-2-implementation/' }
          ]
        },
        {
          text: 'L5 架构方案',
          collapsed: true,
          items: [
            { text: '概述', link: '/renderer/05-architecture-solution/' }
          ]
        }
      ],

      '/pinia/': [
        {
          text: 'Pinia 状态管理',
          items: [
            { text: '系列概述', link: '/pinia/' },
            { text: '学习路径', link: '/pinia/LEARNING_PATHS' }
          ]
        },
        {
          text: 'L1 快速上手',
          collapsed: true,
          items: [
            { text: '概述', link: '/pinia/01-quick-start/' }
          ]
        },
        {
          text: 'L2 进阶实战',
          collapsed: true,
          items: [
            { text: '概述', link: '/pinia/02-advanced-usage/' }
          ]
        },
        {
          text: 'L3 设计思想',
          collapsed: true,
          items: [
            { text: '概述', link: '/pinia/03-design-philosophy/' }
          ]
        },
        {
          text: 'L4 源码解析',
          collapsed: true,
          items: [
            { text: 'L4-0 源码总览', link: '/pinia/04-0-source-overview/' },
            { text: 'L4-1 源码解析', link: '/pinia/04-1-source-analysis/' },
            { text: 'L4-2 手写实现', link: '/pinia/04-2-implementation/' }
          ]
        },
        {
          text: 'L5 架构方案',
          collapsed: true,
          items: [
            { text: '概述', link: '/pinia/05-architecture-solution/' }
          ]
        }
      ],

      '/ssr/': [
        {
          text: '服务端渲染',
          items: [
            { text: '系列概述', link: '/ssr/' }
          ]
        },
        {
          text: 'L1 快速上手',
          collapsed: true,
          items: [
            { text: '概述', link: '/ssr/01-quick-start/' }
          ]
        },
        {
          text: 'L2 进阶实战',
          collapsed: true,
          items: [
            { text: '概述', link: '/ssr/02-advanced-usage/' }
          ]
        },
        {
          text: 'L3 设计思想',
          collapsed: true,
          items: [
            { text: '概述', link: '/ssr/03-design-philosophy/' }
          ]
        },
        {
          text: 'L4 源码解析',
          collapsed: true,
          items: [
            { text: 'L4-0 源码总览', link: '/ssr/04-0-source-overview/' },
            { text: 'L4-1 源码解析', link: '/ssr/04-1-source-analysis/' },
            { text: 'L4-2 手写实现', link: '/ssr/04-2-implementation/' }
          ]
        },
        {
          text: 'L5 架构方案',
          collapsed: true,
          items: [
            { text: '概述', link: '/ssr/05-architecture-solution/' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ],

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2026 Vue3 生态系统学习系列'
    },

    search: {
      provider: 'local'
    }
  }
})
