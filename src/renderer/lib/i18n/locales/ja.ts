import type { Messages } from '../i18n.store.svelte';

export default {
  common: {
    welcome: 'ようこそ',
    welcomeUser: 'ようこそ、{name}さん！',
    settings: '設定',
    cancel: 'キャンセル',
    confirm: '確認',
    save: '保存',
    delete: '削除',
    edit: '編集',
    close: '閉じる',
    back: '戻る',
    next: '次へ',
    loading: '読み込み中...',
    error: 'エラー',
    success: '成功',
    itemCount: '{count} 個のアイテムがあります'
  },
  chat: {
    title: 'チャット',
    newChat: '新しいチャット',
    placeholder: 'メッセージを入力...',
    send: '送信',
    messageFrom: '{user} から {time} のメッセージ',
    noMessages: 'メッセージはまだありません',
    thinking: '考え中...',
    stopGenerating: '生成を停止'
  },
  settings: {
    title: '設定',
    general: '一般',
    appearance: '外観',
    advanced: '詳細設定',
    theme: {
      label: 'テーマ',
      light: 'ライト',
      dark: 'ダーク',
      system: 'システム'
    },
    language: {
      label: '言語',
      select: '言語を選択',
      description: '優先言語を選択してください'
    },
    about: 'について',
    version: 'バージョン {version}'
  },
  titlebar: {
    minimize: '最小化',
    maximize: '最大化',
    restore: '元に戻す',
    close: '閉じる',
    alwaysOnTop: '常に手前に表示'
  },
  welcome: {
    title: 'Mortal へようこそ',
    subtitle: 'マルチ LLM チャットインターフェース',
    getStarted: '始める',
    learnMore: '詳細を見る'
  },
  test: {
    title: 'Mortal AI テスト',
    settingsPage: '設定ページ',
    welcomePage: 'ようこそページ',
    windowState: 'ウィンドウ状態',
    ipcTestSuite: 'IPC 通信テストスイート',
    sendMethods: 'SEND メソッド（メッセージ送信、戻り値なし）',
    callMethods: 'CALL メソッド（呼び出して結果を待つ）',
    testSave: '保存テスト',
    testLog: 'ログテスト',
    testNotify: '通知テスト',
    testMultiply: '乗算テスト',
    testSystemInfo: 'システム情報テスト',
    testFetchUser: 'ユーザー取得テスト',
    results: '結果',
    noResults: '結果はまだありません。上記のテストを実行して出力を確認してください。',
    messages: {
      saveMethodCalled: 'Save メソッドが "Hello from renderer" で呼び出されました',
      logMethodCalled: 'Log メソッドが warn レベルで呼び出されました',
      notifyMethodCalled: 'Notify メソッドが呼び出されました',
      multiplyResult: '乗算結果：{a} × {b} = {result}',
      systemInfo: 'システム情報：プラットフォーム={platform}、稼働時間={uptime}秒',
      userData: 'ユーザーデータ：{name}（ID：{id}）、最終ログイン：{lastLogin}',
      serviceNotAvailable: 'systemService が利用できません',
      multiplyError: '乗算エラー：{error}',
      systemInfoError: 'システム情報エラー：{error}',
      fetchUserError: 'ユーザー取得エラー：{error}'
    }
  }
} as const satisfies Messages;
