# AGENTS.md

This file provides guidance to AI coding assistants when working with code in this repository.

## Commands

### Development

- `pnpm start` - Start the development server (Electron Forge)
- `pnpm run lint` - Run ESLint with auto-fix
- `pnpm run format` - Format code with Prettier
- `pnpm run check` - Run Svelte type checking and TypeScript compilation
- `pnpm mastra:dev` - Start Mastra development server with inspector

### Build and Package

- `pnpm run package` - Package the app for distribution
- `pnpm run make` - Create distributable packages (installers)
- `pnpm publish` - Publish to GitHub releases

## Architecture Overview

This is an **Electron application** built with **Svelte 5**, **TypeScript**, and **Vite**. It's a multi-LLM chat UI with a modular, service-oriented architecture.

### Core Structure

```
src/
├── main/           # Electron main process
├── preload/        # Preload scripts for secure IPC
├── renderer/       # Svelte frontend
└── shared/         # Shared types and utilities
```

### Key Architectural Patterns

#### 1. Multi-Window Shell Architecture

The app uses a **BaseWindow + WebContentsView architecture** instead of traditional BrowserWindow, enabling true multi-window and multi-tab support:

- **BaseWindow**: Serves as the shell container for views
- **WebContentsView**: Separate views for titlebar, content, and loading states
- **View Tagging System**: Tracks views across windows with `__viewType` and `__tabId` tags
- **Independent Views**: Each tab gets its own WebContentsView, enabling isolated rendering
- **Multi-Protocol Support**: Three separate protocols using unified `AppProtocol` class:
  - `titlebar://localhost` - Titlebar UI (loads `titlebar.html`)
  - `content://localhost` - Main content area (loads `content.html`)
  - `loading://localhost` - Loading placeholder (loads `loading.html`)
- **Detachable Tabs**: Tabs can be dragged out of the tab bar to create a new ShellWindow; the detached tab becomes the active content view in the new window
- **Ghost Window System**: Transparent floating window that follows cursor during tab drag operations, with visual feedback for drop targets

**Key files:**

- Shell window service: `src/main/services/window/shell-window-service.ts`
- Ghost window service: `src/main/services/window/ghost-window-service.ts`
- View utilities: `src/shared/types/view.ts`
- Window utilities: `src/shared/types/window.ts`
- Protocol handler base: `src/main/core/protocols/app-protocol.ts`

**View hierarchy example:**

```
BaseWindow (shell container)
├── WebContentsView (titlebar) - Fixed at top
├── WebContentsView (content, tab1) - Active tab
├── WebContentsView (content, tab2) - Background tab
└── WebContentsView (loading) - Loading placeholder
```

**Benefits:**

- True multi-tab support with isolated rendering contexts
- Shared titlebar across all tabs
- Smooth tab switching with loading states
- Better memory management per tab
- Supports multi-window operation via tab detachment (drag a tab out to spawn a new window)

#### 2. HTTP-Style IPC Router System

The app features a **full-featured HTTP router built on top of IPC**, enabling REST-like API patterns within Electron:

- **Route decorators** (`@Route(method, path)`): Define HTTP-style endpoints in services
- **Fetch-like API** (`ipcFetch`): Call backend routes from renderer using standard `fetch` semantics
- **Streaming support**: Full `ReadableStream` support for AI responses and long-running operations
- **Abort support**: Request cancellation via `AbortController`/`AbortSignal`
- **Standard Request/Response**: Uses Web APIs (Request, Response, Headers) for familiarity

**Router location:** `src/main/core/router/setup.ts`

**Example route definition:**

```typescript
@Service
export class SystemService {
  @Route('POST', '/api/chat')
  async chatRoute(request: Request): Promise<Response> {
    const { messages } = await request.json();

    // Access Mastra AI agent
    const agent = mastra.getAgent('weatherAgent');
    const stream = await agent.stream(messages, {
      abortSignal: request.signal // Abort support
    });

    // Return streaming response
    return stream.aisdk.v5.toUIMessageStreamResponse();
  }
}
```

**Calling routes from renderer:**

```typescript
import { ipcFetch } from '$lib/fetch';

// Regular request
const response = await ipcFetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ messages }),
  headers: { 'Content-Type': 'application/json' }
});

// Streaming response
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // Process chunk
}

// With abort controller
const controller = new AbortController();
const response = await ipcFetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ messages }),
  signal: controller.signal
});
// Later: controller.abort();
```

**Key features:**

- Routes auto-register from `@Route` decorated methods
- Supports all HTTP methods (GET, POST, PUT, DELETE, etc.)
- JSON and text body serialization
- Stream chunking with abort handling
- Error handling with proper HTTP status codes

#### 2. Service-Based IPC System

The app also uses a **traditional decorator-based service pattern** for simple IPC calls:

- **Services** (`src/main/services/`): Backend logic with `@Service` decorator
- **Handlers** (`src/main/services/*`): Methods with `@Handler` decorator exposed to renderer
- **Auto-registration**: Services auto-register IPC handlers via `src/main/core/ipc/setup.ts`
- **Bridge generation**: Preload script generates type-safe API bridge via metadata collection

Example service structure:

```typescript
@Service
export class ExampleService {
  @Handler
  async doSomething(event: IpcMainInvokeEvent, param: string): Promise<string> {
    return `Processed: ${param}`;
  }
}
```

**Adding a new service:**

1. Create service in `src/main/services/` with `@Service` decorator
2. Add `@Handler` to methods for simple IPC or `@Route` for HTTP-style endpoints
3. Export service instance and class from `src/main/services/index.ts`
4. **IMPORTANT**: Manually update `src/preload/preload.d.ts` with the new service interface (TypeScript declarations are manually maintained)
5. Use type-safe calls in renderer: `window.serviceName.methodName()` (for @Handler) or `ipcFetch()` (for @Route)

**Available services on `window`:**

- `window.systemService` - System operations, logging, notifications
- `window.themeService` - Theme management
- `window.shellWindowService` - Window controls (always-on-top, tab context menu, new window creation for detached tabs)
- `window.tabService` - Tab switching, lifecycle management, and tab detachment
- `window.storageService` - Key-value storage operations
- `window.eventEmitterService` - Event broadcasting
- `window.ghostWindowService` - Ghost window for tab drag-and-drop visual feedback

**Choosing between @Handler and @Route:**

- Use `@Handler` for simple request/response operations (getting settings, triggering actions)
- Use `@Route` for streaming responses, complex data flows, or when you need abort support

#### 3. Mastra AI Framework Integration

The app integrates **Mastra AI SDK** for AI agent management:

- **Agent system** (`src/main/mastra/`): Manages AI agents (e.g., weather agent)
- **Stream support**: Agents support streaming responses with abort signals
- **V5 AI SDK integration**: Uses Vercel AI SDK v5 for UI message streams

**Example agent usage:**

```typescript
const agent = mastra.getAgent('weatherAgent');
const stream = await agent.stream(messages, {
  abortSignal: request.signal
});
return stream.aisdk.v5.toUIMessageStreamResponse();
```

**Adding new agents:**

1. Create agent in `src/main/mastra/agents/`
2. Register agent in `src/main/mastra/index.ts` Mastra configuration
3. Access agent via `mastra.getAgent('agentName')` in routes or handlers

#### 4. Custom Protocol Handler

The app implements **unified protocol handlers** using the `AppProtocol` class:

- **AppProtocol class**: Reusable base class for custom protocol handling
- **Three protocol instances**:
  - `titlebar://localhost` - Titlebar UI rendering
  - `content://localhost` - Main application content
  - `loading://localhost` - Loading placeholder views
- **SPA support**: Routes without file extensions fall back to specified index HTML file
- **Security**: Path traversal protection ensures files stay within renderer base
- **Setup**: All protocols registered via `setupProtocolHandlers()` in main.ts
- **Location**: `src/main/core/protocols/app-protocol.ts`

#### 5. Platform Utilities

The app uses **custom platform utilities** for cross-platform compatibility:

- **Platform detection** (`src/main/utils/platform.ts`): Exports `platform`, `isMac`, `isWindows`, `isLinux`
- **Dev mode detection** (`src/main/utils/dev.ts`): Exports `isDev` for environment checks
- **Titlebar offset calculations**: Platform-specific adjustments for window chrome
- **Replaces**: Previously used `@electron-toolkit/utils`, now using custom lightweight utilities

**Usage example:**

```typescript
import { isMac, isWindows } from '@/main/utils/platform';
import { isDev } from '@/main/utils/dev';

if (isMac) {
  // macOS-specific code
}
```

#### 6. LogTape Logging System

The app uses **LogTape** for structured logging across all processes:

- **Configuration**: `src/shared/logging/config.ts`
- **Helpers**: `src/shared/logging/helpers.ts` provides logger factories
- **Categories**: `src/shared/logging/categories.ts` defines log categories
- **Formatters**:
  - Development: Pretty formatter with colors and detailed output
  - Production: JSON lines formatter for log aggregation
- **Log levels**: `trace`, `debug`, `info`, `warning`, `error`, `fatal`
- **Initialized per process**: `initLogging('main' | 'preload' | 'renderer')`

**Using loggers:**

```typescript
import { getLoggerBy } from '@/shared/logging/helpers';

const logger = getLoggerBy('category', 'subcategory');
logger.info('Message with {placeholder}', { placeholder: 'value' });
logger.error('Error occurred: {error}', { error });
```

#### 7. Window State Management

- **WindowStateManager** (`src/main/services/window/window-state-manager.ts`): Persists window positions/sizes
- **ShellWindowService** (`src/main/services/window/shell-window-service.ts`): Manages window creation, always-on-top functionality, and tab context menus
- **State injection**: Window state passed via preload arguments (`windowState` global)
- **Auto-save**: Window states saved on `window-all-closed` event
- Supports multiple window instances with individual state tracking
- **Per-window tab lists**: Each window persists its own tab state
- **Tab detachment persistence**: Detached tabs are persisted in the new window's state

#### 8. Storage System

- **Async storage** (`electron-async-storage`): Cross-platform key-value storage
- **Migration support**: Automatic schema migrations via `storage.migrate()`
- **Version tracking**: Current version defined in storage config
- **Location**: Dev mode uses `data/storage/`, production uses `userData/storage`
- **Theme storage path**: Theme settings are stored under the `app/theme` subdirectory
- **Queue driver**: Batches writes for performance (3 items, 1s flush interval)
- **Migration hooks**: `afterMigration`, `onMigrationError` callbacks
- Used for app settings, window states, and user data

**Storage initialization:**

```typescript
// In main.ts
await storage.migrate();

// Storage auto-initializes:
// - Theme state (system theme, dark mode detection)
// - Main window state (tabs, active tab)
// - Locale state (browser language detection)
```

Storage is initialized in `src/main/core/storage/config.ts` with migration hooks.

#### 9. Frontend Architecture (Svelte 5)

- **Router**: `@mateothegreat/svelte5-router` for page navigation
- **Pages**: `src/renderer/pages/` - Main application pages
  - `welcome-page.svelte` - Welcome/landing page
  - `chat-page.svelte` - Chat interface
  - `settings/` - Settings pages
- **UI Components**: Located in `src/renderer/lib/components/`
  - Custom titlebar with window controls
  - shadcn-svelte inspired component library (`src/renderer/lib/components/ui/`)
  - Tab bar for multi-tab interface (`src/renderer/lib/components/tabbar/`)
  - Language selector (`src/renderer/lib/components/selector/`)
  - Developer tools panel (`src/renderer/lib/components/registry/`)
- **TailwindCSS v4**: For styling with custom titlebar implementation
- **Runes-based**: Uses Svelte 5 `$state`, `$derived`, `$effect` patterns

**Key renderer patterns:**

- **PersistedStore** (`src/renderer/lib/stores/core/persisted-store.svelte.ts`): Deep reactive state with automatic Electron storage persistence
- **i18n System** (`src/renderer/lib/i18n/`): Type-safe internationalization with lazy-loaded locales
- **Event System**: Global event emitter exposed via `window.events` for cross-process communication
- **Drag and Drop** (`src/renderer/lib/dnd/`): Custom drag-and-drop implementation for tab reordering
- **Tab System**: Multi-tab interface with state persistence
  - Tab state stored in window state
  - Each tab has id, name, active status, pinned status, and URL
  - Tab reordering via drag-and-drop
  - Tab detachment: Drag a tab outside the tab bar to create a new window; the new window opens with the detached tab active and persisted
  - Always maintains at least one tab (auto-creates new tab when last tab is closed)
  - Tab close button always visible for flexibility

#### 10. Event Broadcasting System

The app uses a **unified event channel** for cross-process communication:

- **Unified channel**: `UNIFIED_EVENT_CHANNEL` for all events
- **Event types**: Defined in `src/shared/types/event.ts`
- **Global emitter**: `window.events` (mitt-based event emitter)
- **Type-safe events**: `GlobalEventDataMap` defines event data types
- **Auto-forwarding**: Preload script forwards main process events to renderer

**Available global events:**

- `theme-changed` - Theme state updates
- `theme-error` - Theme-related errors
- `storage:*` - Storage value changes (pattern-based)
- `tab-context-menu-action` - Tab context menu actions
- `tab-detached` - Tab detached to new window
- `tab-attached` - Tab attached to window
- `tab-drag-ghost-hover` - Ghost window hovering over tab bar
- `tab-drag-ghost-clear` - Clear ghost window hover state
- `window-state-update` - Window state changes

**Using events:**

```typescript
// In renderer
window.events.on('theme-changed', (themeState) => {
  // Handle theme change
});

// In main process (via EventEmitterService)
await eventEmitterService.emitAll('theme-changed', themeState);
```

#### 11. Internationalization (i18n)

- **Type-safe i18n** with Svelte 5 runes
- **Lazy loading**: Non-default locales loaded on demand
- **Locales**: `en`, `zh`, `ja` available
- **Auto-detection**: Browser language detection with fallback to English
- Initialized in renderer via `initI18n()` from `src/renderer/lib/i18n/init.ts`

### Build System

#### Vite Configuration

- **Multi-target builds**: main, preload, and renderer processes
- **Custom plugins**: Metadata collection plugin (`vite-plugins/metadata/`) for IPC bridge generation
  - Collects service metadata at build time
  - Inlines as virtual module for preload bridge
- **Development**: Hot reload with detached DevTools

#### Electron Forge

- **Packaging**: Configured for Windows (Squirrel), macOS (ZIP), and Linux (DEB/RPM)
- **Auto-updater**: GitHub releases publisher configured
- **Security**: ASAR integrity validation, node integration disabled

### Development Guidelines

#### IPC Communication

The IPC system uses a two-phase approach:

1. **Build-time**: Vite plugin collects service metadata from `@Service`/`@Handler` decorators
2. **Runtime**: Preload script generates type-safe bridge from metadata

When adding IPC handlers:

- First parameter must be `IpcMainInvokeEvent`
- Return types should be serializable (no functions, classes)
- Keep handlers pure when possible (side-effect free)

#### Styling

- Use TailwindCSS classes
- Custom titlebar with `--spacing-titlebar-h` CSS variable
- Dark/light theme support via `nativeTheme`
- Main content area must account for titlebar height: `h-[calc(100vh-var(--spacing-titlebar-h))]`

#### Window Management

- Custom titlebar implementation with minimize/maximize/close controls
- Always-on-top toggle functionality
- Cross-platform window chrome handling (macOS vs Windows/Linux)
- Window state persistence happens automatically via `WindowStateManager`

### Key Dependencies

- **Electron 38**: Desktop app runtime
- **Svelte 5**: Reactive frontend framework with runes
- **TypeScript**: Type safety across all processes
- **TailwindCSS v4**: Utility-first CSS framework
- **Electron Forge**: Build and packaging toolchain
- **Vite**: Fast build tool and development server
- **electron-async-storage**: Cross-platform storage with queue driver

### Security Considerations

- **Context isolation**: Enabled for all windows
- **Preload bridge**: Type-safe IPC without exposing Node.js APIs
- **ASAR integrity**: Validates app bundle integrity
- **Disabled features**: Node integration, experimental features disabled in renderer
- **Single instance**: Application enforces single-instance lock

## Other

See @.claude/\*.md
