export default {
  common: {
    welcome: 'Welcome',
    welcomeUser: 'Welcome, {name}!',
    settings: 'Settings',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    itemCount: 'You have {count} items'
  },
  chat: {
    title: 'Chat',
    newChat: 'New Chat',
    placeholder: 'Type a message...',
    send: 'Send',
    messageFrom: 'Message from {user} at {time}',
    noMessages: 'No messages yet',
    thinking: 'Thinking...',
    stopGenerating: 'Stop Generating'
  },
  settings: {
    title: 'Settings',
    general: 'General',
    appearance: 'Appearance',
    advanced: 'Advanced',
    theme: {
      label: 'Theme',
      light: 'Light',
      dark: 'Dark',
      system: 'System'
    },
    language: {
      label: 'Language',
      select: 'Select Language',
      description: 'Choose your preferred language'
    },
    about: 'About',
    version: 'Version {version}'
  },
  titlebar: {
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close',
    alwaysOnTop: 'Always on Top'
  },
  welcome: {
    title: 'Welcome to Mortal',
    subtitle: 'Your multi-LLM chat interface',
    getStarted: 'Get Started',
    learnMore: 'Learn More'
  },
  test: {
    title: 'Mortal AI Test',
    settingsPage: 'Settings Page',
    welcomePage: 'Welcome Page',
    windowState: 'Window State',
    ipcTestSuite: 'IPC Communication Test Suite',
    sendMethods: 'SEND Methods (Send messages, no return value)',
    callMethods: 'CALL Methods (Call and wait for result)',
    testSave: 'Test Save',
    testLog: 'Test Log',
    testNotify: 'Test Notify',
    testMultiply: 'Test Multiply',
    testSystemInfo: 'Test System Info',
    testFetchUser: 'Test Fetch User',
    results: 'Results',
    noResults: 'No results yet. Run some tests above to see output.',
    messages: {
      saveMethodCalled: 'Save method called with "Hello from renderer"',
      logMethodCalled: 'Log method called with warn level',
      notifyMethodCalled: 'Notify method called',
      multiplyResult: 'Multiply result: {a} × {b} = {result}',
      systemInfo: 'System info: Platform={platform}, Uptime={uptime}s',
      userData: 'User data: {name} (ID: {id}), Last login: {lastLogin}',
      serviceNotAvailable: 'systemService not available',
      multiplyError: 'Multiply error: {error}',
      systemInfoError: 'System info error: {error}',
      fetchUserError: 'Fetch user error: {error}'
    }
  },
  tabbar: {
    close: 'Close',
    close_all: 'Close All'
  }
} as const;
