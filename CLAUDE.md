# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

- `pnpm start` - Start the development server (Electron Forge)
- `pnpm run lint` - Run ESLint with auto-fix
- `pnpm run format` - Format code with Prettier
- `pnpm run check` - Run Svelte type checking and TypeScript compilation

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

#### 1. Service-Based IPC System

The app uses a **decorator-based service pattern** for type-safe IPC communication:

- **Services** (`src/main/services/`): Backend logic with `@Service` decorator
- **Handlers** (`src/main/services/*`): Methods with `@Handler` decorator exposed to renderer
- **Auto-registration**: Services auto-register IPC handlers via `src/main/ipc-handlers.ts`
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
2. Add `@Handler` to methods that need renderer access
3. Export service instance and class from `src/main/services/index.ts`
4. **IMPORTANT**: Manually update `src/preload/preload.d.ts` with the new service interface (TypeScript declarations are manually maintained)
5. Use type-safe calls in renderer: `window.serviceName.methodName()`

**Available services on `window`:**

- `window.systemService` - System operations, logging, notifications
- `window.themeService` - Theme management
- `window.windowService` - Window controls (always-on-top, etc.)
- `window.storageService` - Key-value storage operations
- `window.eventEmitterService` - Event broadcasting

#### 2. Window State Management

- **WindowStateManager** (`src/main/services/window/window-state-manager.ts`): Persists window positions/sizes
- **WindowService** (`src/main/services/window/window-service.ts`): Manages window creation and always-on-top functionality
- State persisted to storage automatically
- Supports multiple window instances with individual state tracking

#### 3. Storage System

- **Async storage** (`electron-async-storage`): Cross-platform key-value storage
- **Migration support**: Automatic schema migrations via `storage.migrate()`
- **Location**: Dev mode uses `data/storage/`, production uses `userData/storage`
- **Queue driver**: Batches writes for performance (3 items, 1s flush interval)
- Used for app settings, window states, and user data

Storage is initialized in `src/main/core/storage/config.ts` with migration hooks.

#### 4. Frontend Architecture (Svelte 5)

- **Router**: `@mateothegreat/svelte5-router` for page navigation
- **UI Components**: Located in `src/renderer/lib/components/`
  - Custom titlebar with window controls
  - shadcn-svelte inspired component library (`src/renderer/lib/components/ui/`)
- **TailwindCSS v4**: For styling with custom titlebar implementation
- **Runes-based**: Uses Svelte 5 `$state`, `$derived`, `$effect` patterns

**Key renderer patterns:**

- **PersistedStore** (`src/renderer/lib/stores/core/persisted-store.svelte.ts`): Deep reactive state with automatic Electron storage persistence
- **i18n System** (`src/renderer/lib/i18n/`): Type-safe internationalization with lazy-loaded locales
- **Event System**: Global event emitter exposed via `window.events` for cross-process communication

#### 5. Internationalization (i18n)

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
