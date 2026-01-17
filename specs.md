### High-level architecture

At a high level, what you’re describing is:

- **VideoEngine (singleton-ish per app)**  
  - Owns and manages **VideoItem** instances.  
  - Keeps **global state** (volume, mute, user/premium info, external scripts loaded, etc.).  
  - Emits **engine-level events** (creation/disposal, active item changes, global volume/mute changes).  
  - Exposed to React via **Context + `useVideoEngine()`**.

- **VideoItem (per player instance)**  
  - Encapsulates all logic for a single video experience.  
  - Internally composed from multiple **managers, providers, resolvers, and adapters**.  
  - Emits **item-level events** (playback, workflow, analytics, ads, etc.).  
  - Controlled from React only via **public methods + events**, not via tight coupling.

- **Managers & Providers** (inside each VideoItem)  
  - **VideoPlayerManager** (+ **VideoPlayerAdapter** per tech: HTML5, video.js, HLS, Shaka, etc.).  
  - **VideoDataProvider, VideoManifestResolver, VideoSettingsProvider**.  
  - **VideoDataManager, GemiusDataManager, AdvertisementManager, EndScreenManager, RecommendationsManager, ChromecastManager, AirplayManager, FloatingManager**, etc.

- **React layer**  
  - **`VideoEngineProvider` + `useVideoEngine()`**  
  - **`VideoPlayer` React component**: creates/owns a `VideoItem` and provides it via Context.  
  - **Controls components** (`PlayButton`, `VolumeSlider`, etc.) that consume `VideoItem` from Context and react to events/state.

This is a solid separation: engine = framework-agnostic, React = host integration.

---

### Core engine spec refinement

#### VideoEngine class

**Responsibilities (as you already defined, refined into a spec):**

- **Lifecycle management of items:**
  - **`createVideoItem(input: VideoItemInitProps): VideoItem`**
  - **`disposeVideoItem(idOrItem: VideoItem | string): void`**
  - **`getVideoItem(id: string): VideoItem | undefined`**
  - **`getAllVideoItems(): VideoItem[]`** (optional but useful)

- **Global state:**
  - **Global volume:**  
    - **`getVolume(): number`**  
    - **`setVolume(volume: number): void`** (propagates to items if configured)
  - **Global mute:**  
    - **`isMuted(): boolean`**  
    - **`setMuted(muted: boolean): void`**
  - **User/session context:**  
    - **`setUserContext(ctx: UserContext): void`** (premium / userId / AB flags)  
    - **`getUserContext(): UserContext`**

- **Script loading:**
  - **`ensureExternalScript(name: ScriptName): Promise<void>`**  
    VideoEngine is a central place to load IMA, Chromecast, Gemius, etc.

- **Events (EventEmitter based):**
  - **`VIDEO_ITEM_CREATED`** `(payload: { item: VideoItem })`
  - **`VIDEO_ITEM_DISPOSED`** `(payload: { itemId: string })`
  - **`ACTIVE_VIDEO_ITEM_CHANGED`** `(payload: { item: VideoItem | null })`
  - **`VOLUME_CHANGED`** `(payload: { volume: number })`
  - **`MUTE_CHANGED`** `(payload: { muted: boolean })`
  - Standard **`on(event, handler)` / `off(event, handler)` / `emit(event, payload)`.

**Key design choice:**  
Decide if a **VideoItem knows about its engine** (e.g. `private engine: VideoEngine;`). That can be useful for:
- Accessing global state (volume/mute/user) during init.
- Asking engine to mark itself as active.

I’d recommend injecting `VideoEngine` into each `VideoItem` at construction.

---

### VideoItem class and composition

#### VideoItem lifecycle and API

**Construction:**

- Constructed only via **`VideoEngine.createVideoItem`**, never directly.
- Accepts **strongly-typed `VideoItemInitProps`**:
  - **Identity:** `id`, maybe `trackingId`.
  - **Source config:** `videoId`, `manifestId`, `url`, etc.
  - **Feature flags:** `autoplay`, `autoplayInViewport`, `adsEnabled`, `endscreenEnabled`, `recommendationsEnabled`, `chromecastEnabled`, `airplayEnabled`, `floatingEnabled`, etc.
  - **Adapter selection:** `playerType: 'videojs' | 'html5' | 'shaka' | ...`
  - **Initial player settings:** volume, muted, quality, playbackRate, etc.
  - **Data/analytics config:** endpoints, Gemius IDs, extra metadata.

**Initialization phases (as you described):**

1. **Generic settings preparation**  
   - Normalize the props, resolve defaults (e.g. global vs local volume).
   - Apply resolvers (e.g. `AutoplayResolver`, `VolumeResolver`, `MuteResolver`).

2. **Managers creation & composition**  
   - Instantiate the managers based on feature flags:
     - `VideoPlayerManager`
     - `VideoDataManager?`
     - `GemiusDataManager?`
     - `AdvertisementManager?`
     - `EndScreenManager?`
     - `RecommendationsManager?`
     - `ChromecastManager?`
     - `AirplayManager?`
     - `FloatingManager?`
   - Bind internal events between them and VideoItem.

3. **Plugins creation & composition** (if you want a plugin system later).

4. **Orchestration**  
   - Connect everything together:
     - Player events → VideoItem → Data managers / Gemius / Ads / Endscreen.
     - Engine/global context → VideoItem → Settings/feature enablement.

**Public API (examples):**

- **Playback:**
  - **`play(): Promise<void>`**
  - **`pause(): void`**
  - **`seekTo(seconds: number): void`**
  - **`setVolume(volume: number): void`**
  - **`setMuted(muted: boolean): void`**
  - **`getCurrentTime(): number`**
  - **`getDuration(): number`**

- **State & info:**
  - **`getState(): VideoItemState`** (playing, paused, buffering, ended, error, etc.)
  - **`getConfig(): VideoItemConfig`**
  - **`getId(): string`**

- **Feature control:**
  - **`enableAds()` / `disableAds()`** (if toggling at runtime makes sense)
  - **`enableFloating()` / `disableFloating()`**
  - **`showEndScreen()` / `hideEndScreen()`**
  - **`showRecommendations()` / `hideRecommendations()`**

- **Lifecycle:**
  - **`init(): Promise<void>`** (called by engine after creation, or inside constructor)
  - **`update(props: Partial<VideoItemInitProps>): void`**
  - **`dispose(): void`**

- **Events:**
  - Same EventEmitter pattern:
    - **`on('PLAY', handler)`**
    - **`on('PAUSE', handler)`**
    - **`on('ENDED', handler)`**
    - **`on('ERROR', handler)`**
    - **`on('TIME_UPDATE', handler)`**
    - **`on('BUFFER_START'/'BUFFER_END', handler)`**
    - Plus workflow: `on('AD_BREAK_STARTED')`, `on('RECOMMENDATIONS_SHOWN')`, etc.

You can keep event names as string literals or define **string enums / union types** in TypeScript for better type safety.

---

### Managers and adapters

#### VideoPlayerManager & VideoPlayerAdapter

**VideoPlayerAdapter interface (core abstraction):**

- **`mount(container: HTMLElement): void`**
- **`destroy(): void`**
- **`loadSource(source: VideoSourceConfig): Promise<void>`**
- **Playback:** `play()`, `pause()`, `seekTo()`, `setVolume()`, `setMuted()`
- **Info:** `getCurrentTime()`, `getDuration()`, `getBufferedRanges()`
- **Events:** internal EventEmitter-like or callback subscription:
  - `on('play' | 'pause' | 'ended' | 'timeupdate' | 'error' | 'seeking' | 'seeked' | 'volumechange' | 'loadedmetadata' | 'canplay' | 'waiting' | ...)`

**VideoPlayerManager responsibilities:**

- Accepts **adapter instance** based on `playerType`.
- Binds adapter events → maps them to **VideoItem events**.
- Exposes a thin API to VideoItem:
  - `init(container: HTMLElement, source: VideoSourceConfig)`
  - `play/pause/seek/setVolume/etc.` delegating to adapter.

For the POC, you implement **`VideoJsAdapter`** and stub other adapters.

#### Data and analytics managers

- **VideoDataManager:**
  - Subscribes to key VideoItem events (`PLAY`, `PAUSE`, `ENDED`, `TIME_UPDATE`, `ERROR`, `AD_START`, etc.).
  - Maintains internal state for constructing data payloads.
  - Sends data to the configured endpoint.

- **GemiusDataManager:**
  - Same pattern, but uses Gemius-specific API.

You can define a small **`BaseDataManager`** they both extend to re-use the “subscribe to events + lifecycle” logic.

#### Ads, endscreen, recommendations, casting, floating

Each manager:

- Knows only about:
  - **VideoItem (or a minimal interface of it)**.
  - **PlayerAdapter** if needed (e.g. for ad breaks).
  - **Engine** if global context or script loaders are needed.

- Is created conditionally, based on VideoItem config:
  - `if (config.adsEnabled) this.adManager = new AdvertisementManager(...)`

- Subscribes to VideoItem or adapter events as needed:
  - Ads: watch for play, pause, time updates, etc.
  - Floating: uses `IntersectionObserver` via the React component and/or direct DOM.

---

### React integration spec

#### VideoEngineProvider and hook

- **`<VideoEngineProvider>`**:
  - Creates a **single `VideoEngine` instance** (or accepts one via props for testing).
  - Places it in React Context.

- **`useVideoEngine()`**:
  - Returns the `VideoEngine` instance.
  - No coupling to VideoItem or DOM here.

This means engine is created once per Next.js app instance, which is what you want for shared global state and script loading.

#### VideoPlayer component (host for VideoItem)

Responsibilities:

- Receives **props** that will become `VideoItemInitProps` subset:
  - `videoId`, `playerType`, `autoplay`, `adsEnabled`, etc.
- On **mount**:
  - Calls `videoEngine.createVideoItem(initProps)` and stores the `VideoItem` in local state.
  - Provides the container DOM ref to the item (via VideoPlayerManager → adapter).
- On **unmount**:
  - Calls `videoEngine.disposeVideoItem(item)` (and/or `item.dispose()`).
- Provides **VideoItem via Context** to controls:
  - `<VideoItemProvider value={videoItem}>`.

It may also:

- Track **viewport visibility** (via `IntersectionObserver` hook) and call `videoItem.setInViewport(true/false)` or emit an event.
- Subscribe to `VideoItem` events if some UI state is local to this component (e.g., show a loading spinner on buffering).

#### Controls components

- **`useVideoItem()`** hook pulls the current VideoItem from context.
- They subscribe to VideoItem events as needed and call VideoItem methods:
  - Play button → `videoItem.play()` and listens for `PLAY/PAUSE` events.
  - Volume slider → `videoItem.setVolume(value)` and listens for `VOLUME_CHANGED`.
  - Timeline → uses `TIME_UPDATE` events and `getDuration()`.

React components shouldn’t know about the internal managers. They only rely on the **public VideoItem API + events**.
