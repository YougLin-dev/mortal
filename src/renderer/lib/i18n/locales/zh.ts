import type { Messages } from '../i18n.store.svelte';

export default {
  common: {
    welcome: '欢迎',
    welcomeUser: '欢迎，{name}！',
    settings: '设置',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    close: '关闭',
    back: '返回',
    next: '下一步',
    loading: '加载中...',
    error: '错误',
    success: '成功',
    itemCount: '你有 {count} 个项目'
  },
  chat: {
    title: '聊天',
    newChat: '新建聊天',
    placeholder: '输入消息...',
    send: '发送',
    messageFrom: '{user} 于 {time} 发送的消息',
    noMessages: '暂无消息',
    thinking: '思考中...',
    stopGenerating: '停止生成'
  },
  settings: {
    title: '设置',
    general: '通用',
    appearance: '外观',
    advanced: '高级',
    theme: {
      label: '主题',
      light: '浅色',
      dark: '深色',
      system: '跟随系统'
    },
    language: {
      label: '语言',
      select: '选择语言',
      description: '选择你偏好的语言'
    },
    about: '关于',
    version: '版本 {version}'
  },
  titlebar: {
    minimize: '最小化',
    maximize: '最大化',
    restore: '还原',
    close: '关闭',
    alwaysOnTop: '始终置顶'
  },
  welcome: {
    title: '欢迎使用 Mortal',
    subtitle: '你的多模型 LLM 聊天界面',
    getStarted: '开始使用',
    learnMore: '了解更多'
  },
  test: {
    title: 'Mortal AI 测试',
    settingsPage: '设置页面',
    welcomePage: '欢迎页面',
    windowState: '窗口状态',
    ipcTestSuite: 'IPC 通信测试套件',
    sendMethods: 'SEND 方法（发送消息，无返回值）',
    callMethods: 'CALL 方法（调用并等待结果）',
    testSave: '测试保存',
    testLog: '测试日志',
    testNotify: '测试通知',
    testMultiply: '测试乘法',
    testSystemInfo: '测试系统信息',
    testFetchUser: '测试获取用户',
    results: '结果',
    noResults: '暂无结果。运行上面的测试查看输出。',
    messages: {
      saveMethodCalled: 'Save 方法已调用，参数为 "Hello from renderer"',
      logMethodCalled: 'Log 方法已调用，日志级别为 warn',
      notifyMethodCalled: 'Notify 方法已调用',
      multiplyResult: '乘法结果：{a} × {b} = {result}',
      systemInfo: '系统信息：平台={platform}，运行时间={uptime}秒',
      userData: '用户数据：{name}（ID：{id}），上次登录：{lastLogin}',
      serviceNotAvailable: 'systemService 不可用',
      multiplyError: '乘法错误：{error}',
      systemInfoError: '系统信息错误：{error}',
      fetchUserError: '获取用户错误：{error}'
    }
  }
} as const satisfies Messages;
