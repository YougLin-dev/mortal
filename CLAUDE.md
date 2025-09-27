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

#### 2. Window State Management

- **WindowStateManager** (`src/main/window-state-manager.ts`): Persists window positions/sizes
- **WindowService** (`src/main/services/window-service.ts`): Manages window creation and always-on-top functionality
- State persisted to storage automatically

#### 3. Storage System

- **Async storage** (`electron-async-storage`): Cross-platform key-value storage
- **Migration support**: Automatic schema migrations via `storage.migrate()`
- Used for app settings, window states, and user data

#### 4. Frontend Architecture (Svelte 5)

- **Router**: `@mateothegreat/svelte5-router` for page navigation
- **UI Components**: Located in `src/renderer/lib/components/`
- **TailwindCSS v4**: For styling with custom titlebar implementation
- **Runes-based**: Uses Svelte 5 `$state`, `$derived`, `$effect` patterns

### Build System

#### Vite Configuration

- **Multi-target builds**: main, preload, and renderer processes
- **Custom plugins**: Metadata collection plugin (`vite-plugins/metadata/`) for IPC bridge generation
- **Development**: Hot reload with detached DevTools

#### Electron Forge

- **Packaging**: Configured for Windows (Squirrel), macOS (ZIP), and Linux (DEB/RPM)
- **Auto-updater**: GitHub releases publisher configured
- **Security**: ASAR integrity validation, node integration disabled

### Development Guidelines

#### IPC Communication

1. Create services in `src/main/services/` with `@Service` decorator
2. Add `@Handler` to methods that need renderer access
3. Import service in `src/main/services/index.ts`
4. **IMPORTANT**: Manually update `src/preload/preload.d.ts` with the new service interface
5. Use type-safe calls in renderer: `window.serviceName.methodName()`

**Available services on `window`:**

- `window.systemService` - System operations, logging, notifications
- `window.themeService` - Theme management
- `window.windowService` - Window controls (always-on-top, etc.)
- `window.storageService` - Key-value storage operations

**Note**: The `preload.d.ts` file is manually maintained and must be updated when adding new services or handlers to ensure proper TypeScript support in the renderer process.

#### Styling

- Use TailwindCSS classes
- Custom titlebar with `--spacing-titlebar-h` CSS variable
- Dark/light theme support via `nativeTheme`

#### Window Management

- Custom titlebar implementation with minimize/maximize/close controls
- Always-on-top toggle functionality
- Cross-platform window chrome handling (macOS vs Windows/Linux)

### Key Dependencies

- **Electron 38**: Desktop app runtime
- **Svelte 5**: Reactive frontend framework with runes
- **TypeScript**: Type safety across all processes
- **TailwindCSS v4**: Utility-first CSS framework
- **Electron Forge**: Build and packaging toolchain
- **Vite**: Fast build tool and development server

### Security Considerations

- **Context isolation**: Enabled for all windows
- **Preload bridge**: Type-safe IPC without exposing Node.js APIs
- **ASAR integrity**: Validates app bundle integrity
- **Disabled features**: Node integration, experimental features disabled in renderer
