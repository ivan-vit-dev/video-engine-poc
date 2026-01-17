# Video Engine POC - Implementation Plan

## Project Overview

A Next.js 16 application with TypeScript and React, implementing a modular video engine architecture with SCSS styling.

## Technology Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **UI Library**: React
- **Styling**: SCSS
- **Video Player**: video.js (primary adapter for POC)
- **Event System**: Custom EventEmitter pattern

## Project Structure

```
video-engine-poc/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Demo page
│   │   └── globals.scss
│   ├── engine/                 # Core engine (framework-agnostic)
│   │   ├── VideoEngine.ts
│   │   ├── VideoItem.ts
│   │   ├── types/
│   │   │   ├── index.ts
│   │   │   ├── VideoItemInitProps.ts
│   │   │   ├── VideoItemState.ts
│   │   │   └── UserContext.ts
│   │   └── events/
│   │       └── EventEmitter.ts
│   ├── managers/               # Feature managers
│   │   ├── VideoPlayerManager.ts
│   │   ├── VideoDataManager.ts
│   │   ├── GemiusDataManager.ts
│   │   ├── AdvertisementManager.ts
│   │   ├── EndScreenManager.ts
│   │   ├── RecommendationsManager.ts
│   │   ├── ChromecastManager.ts
│   │   ├── AirplayManager.ts
│   │   ├── FloatingManager.ts
│   │   └── base/
│   │       └── BaseDataManager.ts
│   ├── adapters/               # Player adapters
│   │   ├── VideoPlayerAdapter.ts
│   │   ├── VideoJsAdapter.ts
│   │   ├── Html5Adapter.ts      # Stub
│   │   └── ShakaAdapter.ts      # Stub
│   ├── providers/              # Data providers
│   │   ├── VideoDataProvider.ts
│   │   ├── VideoManifestResolver.ts
│   │   └── VideoSettingsProvider.ts
│   ├── resolvers/              # Settings resolvers
│   │   ├── AutoplayResolver.ts
│   │   ├── VolumeResolver.ts
│   │   └── MuteResolver.ts
│   ├── react/                  # React integration layer
│   │   ├── providers/
│   │   │   ├── VideoEngineProvider.tsx
│   │   │   └── VideoItemProvider.tsx
│   │   ├── hooks/
│   │   │   ├── useVideoEngine.ts
│   │   │   └── useVideoItem.ts
│   │   └── components/
│   │       ├── VideoPlayer/
│   │       │   ├── VideoPlayer.tsx
│   │       │   └── VideoPlayer.module.scss
│   │       ├── controls/
│   │       │   ├── PlayButton/
│   │       │   │   ├── PlayButton.tsx
│   │       │   │   └── PlayButton.module.scss
│   │       │   ├── VolumeSlider/
│   │       │   │   ├── VolumeSlider.tsx
│   │       │   │   └── VolumeSlider.module.scss
│   │       │   ├── Timeline/
│   │       │   │   ├── Timeline.tsx
│   │       │   │   └── Timeline.module.scss
│   │       │   └── index.ts
│   │       └── features/
│   │           ├── EndScreen/
│   │           ├── Recommendations/
│   │           └── FloatingPlayer/
│   └── utils/
│       └── scripts.ts           # External script loader
├── public/
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## Implementation Steps

### Phase 1: Project Setup & Foundation

1. **Initialize Next.js 16 project with TypeScript**

   - Set up Next.js 16 with TypeScript
   - Configure SCSS support
   - Install dependencies: video.js, @types/node, etc.

2. **Create core type definitions**

   - `VideoItemInitProps` - initialization props
   - `VideoItemState` - player state enum/type
   - `UserContext` - user/premium context
   - `VideoSourceConfig` - video source configuration
   - Event type definitions

3. **Implement EventEmitter base class**
   - Generic event emitter for VideoEngine and VideoItem
   - Type-safe event handling

### Phase 2: Core Engine Implementation

4. **Build VideoEngine class**

   - Lifecycle: `createVideoItem()`, `disposeVideoItem()`, `getVideoItem()`
   - Global state: volume, mute, user context
   - Script loading: `ensureExternalScript()`
   - Event system: engine-level events
   - Singleton pattern management

5. **Implement VideoItem class**
   - Construction via VideoEngine
   - Initialization phases (settings, managers, orchestration)
   - Public API (playback, state, features, lifecycle)
   - Event system (item-level events)
   - Manager composition and lifecycle

### Phase 3: Player Adapter & Manager Layer

6. **Create VideoPlayerAdapter interface**

   - Abstract interface for all player adapters
   - Methods: mount, destroy, loadSource, playback controls
   - Event subscription pattern

7. **Implement VideoJsAdapter**

   - Full implementation for video.js
   - Event mapping from video.js to adapter events
   - Source loading and configuration

8. **Create VideoPlayerManager**

   - Adapter selection and initialization
   - Event mapping from adapter to VideoItem
   - Thin API wrapper for VideoItem

9. **Create stub adapters** (Html5Adapter, ShakaAdapter)
   - Basic structure for future implementation

### Phase 4: Data & Analytics Managers

10. **Build BaseDataManager**

    - Common event subscription logic
    - Lifecycle management
    - Base class for all data managers

11. **Implement VideoDataManager**

    - Event subscription (PLAY, PAUSE, ENDED, etc.)
    - Data payload construction
    - API endpoint communication

12. **Implement GemiusDataManager**
    - Gemius-specific analytics
    - Event tracking integration

### Phase 5: Feature Managers

13. **AdvertisementManager**

    - IMA SDK integration (stub for POC)
    - Ad break handling
    - Event coordination

14. **EndScreenManager**

    - End screen display logic
    - Video completion handling

15. **RecommendationsManager**

    - Recommendations data fetching
    - Display coordination

16. **ChromecastManager, AirplayManager, FloatingManager**
    - Basic structure and stubs
    - Integration points defined

### Phase 6: Providers & Resolvers

17. **VideoDataProvider, VideoManifestResolver, VideoSettingsProvider**

    - Data fetching and resolution
    - Settings normalization

18. **Resolvers (Autoplay, Volume, Mute)**
    - Settings resolution logic
    - Global vs local precedence

### Phase 7: React Integration

19. **VideoEngineProvider & useVideoEngine hook**

    - Context provider for VideoEngine
    - Hook for accessing engine

20. **VideoItemProvider & useVideoItem hook**

    - Context provider for VideoItem
    - Hook for accessing current item

21. **VideoPlayer React component**
    - Component lifecycle (mount/unmount)
    - VideoItem creation/disposal
    - Container ref management
    - Viewport tracking (IntersectionObserver)
    - Event subscription for UI state

### Phase 8: Control Components

22. **PlayButton component**

    - Play/pause toggle
    - Event subscription
    - SCSS styling

23. **VolumeSlider component**

    - Volume control
    - Mute toggle
    - Event subscription
    - SCSS styling

24. **Timeline component**

    - Progress bar
    - Seek functionality
    - Time display
    - SCSS styling

25. **Additional controls** (optional)
    - Fullscreen button
    - Settings menu
    - Quality selector

### Phase 9: Feature UI Components

26. **EndScreen component**

    - Display logic
    - Integration with EndScreenManager

27. **Recommendations component**

    - Display logic
    - Integration with RecommendationsManager

28. **FloatingPlayer component**
    - Floating window logic
    - Integration with FloatingManager

### Phase 10: Styling & Polish

29. **Global SCSS styles**

    - Reset/normalize
    - Variables (colors, spacing, typography)
    - Mixins and utilities

30. **Component SCSS modules**
    - VideoPlayer styles
    - Control components styles
    - Feature components styles
    - Responsive design
    - Modern, clean UI

### Phase 11: Demo & Testing

31. **Create demo page**

    - Example video player implementation
    - Multiple player instances
    - Feature demonstrations

32. **Testing & refinement**
    - Test all features
    - Fix bugs
    - Performance optimization

## Dependencies

### Core Dependencies

```json
{
  "next": "^16.0.0",
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "typescript": "^5.0.0",
  "video.js": "^8.0.0",
  "@types/video.js": "^7.0.0"
}
```

### Dev Dependencies

```json
{
  "@types/node": "^20.0.0",
  "@types/react": "^18.0.0",
  "@types/react-dom": "^18.0.0",
  "sass": "^1.70.0"
}
```

## Key Design Decisions

1. **Separation of Concerns**

   - Engine layer is framework-agnostic
   - React layer is thin integration wrapper
   - Managers are independent and composable

2. **Event-Driven Architecture**

   - Loose coupling via events
   - Type-safe event system
   - Clear event naming conventions

3. **Adapter Pattern**

   - Easy to swap video players
   - Consistent API across adapters
   - Future-proof for new players

4. **Manager Composition**

   - Feature flags control manager creation
   - Managers subscribe to events independently
   - Easy to add/remove features

5. **TypeScript First**
   - Strong typing throughout
   - Type-safe event handlers
   - Better IDE support

## Next Steps

Ready to start implementation? We'll begin with Phase 1: Project Setup & Foundation.
