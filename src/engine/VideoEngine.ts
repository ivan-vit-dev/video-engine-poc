import { EventEmitter } from "./events/EventEmitter";
import { UserContext, PlayerType } from "./types";
import { VideoItem } from "./VideoItem";
import { VideoItemInitProps } from "./types";

/**
 * Script names for external script loading
 */
export type ScriptName = "ima" | "chromecast" | "gemius";

/**
 * VideoEngine event map
 */
export interface VideoEngineEvents {
  VIDEO_ITEM_CREATED: { item: VideoItem };
  VIDEO_ITEM_DISPOSED: { itemId: string };
  ACTIVE_VIDEO_ITEM_CHANGED: { item: VideoItem | null };
  VOLUME_CHANGED: { volume: number };
  MUTE_CHANGED: { muted: boolean };
  [key: string]: unknown;
}

/**
 * VideoEngine - Singleton manager for video items and global state
 */
export class VideoEngine extends EventEmitter<VideoEngineEvents> {
  private static instance: VideoEngine | null = null;
  private items: Map<string, VideoItem> = new Map();
  private activeItem: VideoItem | null = null;
  private globalVolume: number = 1.0;
  private globalMuted: boolean = false;
  private userContext: UserContext = {};
  private playerType: PlayerType = "videojs";
  private loadedScripts: Set<ScriptName> = new Set();
  private scriptPromises: Map<ScriptName, Promise<void>> = new Map();

  private constructor() {
    super();
  }

  /**
   * Get or create the singleton instance
   */
  static getInstance(): VideoEngine {
    if (!VideoEngine.instance) {
      VideoEngine.instance = new VideoEngine();
    }
    return VideoEngine.instance;
  }

  /**
   * Set the global player type for all VideoItems
   */
  setPlayerType(playerType: PlayerType): void {
    this.playerType = playerType;
  }

  /**
   * Get the global player type
   */
  getPlayerType(): PlayerType {
    return this.playerType;
  }

  /**
   * Create and initialize a new VideoItem
   */
  async createVideoItem(
    input: VideoItemInitProps,
    container: HTMLElement
  ): Promise<VideoItem> {
    if (this.items.has(input.id)) {
      throw new Error(`VideoItem with id "${input.id}" already exists`);
    }

    // Create engine context with current global state
    const engineContext = {
      globalVolume: this.globalVolume,
      globalMuted: this.globalMuted,
      userContext: this.userContext,
      playerType: this.playerType,
    };

    // Create VideoItem with engine context
    const item = new VideoItem(input, engineContext);
    this.items.set(input.id, item);

    // Set up event listeners for communication between engine and item
    this.setupVideoItemEventListeners(item);

    // Initialize the VideoItem with container (single init method)
    await item.init(container);

    // Emit creation event
    this.emit("VIDEO_ITEM_CREATED", { item });

    // Set as active if no active item
    if (!this.activeItem) {
      this.setActiveItem(item);
    }

    return item;
  }

  /**
   * Set up event listeners for communication with VideoItem
   * VideoItem can request global state, and engine can propagate changes
   */
  private setupVideoItemEventListeners(item: VideoItem): void {
    // Listen to VideoItem events that need engine response
    item.on("REQUEST_GLOBAL_VOLUME", () => {
      item.setVolume(this.globalVolume);
    });

    item.on("REQUEST_GLOBAL_MUTE", () => {
      item.setMuted(this.globalMuted);
    });

    // Listen to engine global state changes and propagate to active item
    const handleVolumeChange = ({ volume }: { volume: number }) => {
      // Propagate to active item if it's this item
      if (this.activeItem === item) {
        item.setVolume(volume);
      }
    };

    const handleMuteChange = ({ muted }: { muted: boolean }) => {
      // Propagate to active item if it's this item
      if (this.activeItem === item) {
        item.setMuted(muted);
      }
    };

    // Store handlers so we can clean them up on disposal
    // We'll use a WeakMap or store them on the item for cleanup
    // For now, when item is disposed, it removes all listeners
    this.on("VOLUME_CHANGED", handleVolumeChange);
    this.on("MUTE_CHANGED", handleMuteChange);
  }

  /**
   * Dispose a VideoItem
   */
  disposeVideoItem(idOrItem: VideoItem | string): void {
    const id = typeof idOrItem === "string" ? idOrItem : idOrItem.getId();
    const item = this.items.get(id);

    if (!item) {
      return;
    }

    // Dispose the item
    item.dispose();

    // Remove from map
    this.items.delete(id);

    // Clear active item if it was the active one
    if (this.activeItem === item) {
      this.setActiveItem(null);
    }

    // Emit disposal event
    this.emit("VIDEO_ITEM_DISPOSED", { itemId: id });
  }

  /**
   * Get a VideoItem by ID
   */
  getVideoItem(id: string): VideoItem | undefined {
    return this.items.get(id);
  }

  /**
   * Get all VideoItems
   */
  getAllVideoItems(): VideoItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Get the active VideoItem
   */
  getActiveVideoItem(): VideoItem | null {
    return this.activeItem;
  }

  /**
   * Set the active VideoItem
   */
  setActiveItem(item: VideoItem | null): void {
    if (this.activeItem === item) {
      return;
    }

    this.activeItem = item;
    this.emit("ACTIVE_VIDEO_ITEM_CHANGED", { item });
  }

  /**
   * Get global volume
   */
  getVolume(): number {
    return this.globalVolume;
  }

  /**
   * Set global volume
   */
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (this.globalVolume === clampedVolume) {
      return;
    }

    this.globalVolume = clampedVolume;
    this.emit("VOLUME_CHANGED", { volume: clampedVolume });

    // Propagate to all items if configured
    this.items.forEach((item) => {
      // Items can listen to VOLUME_CHANGED event and update themselves
    });
  }

  /**
   * Check if globally muted
   */
  isMuted(): boolean {
    return this.globalMuted;
  }

  /**
   * Set global mute state
   */
  setMuted(muted: boolean): void {
    if (this.globalMuted === muted) {
      return;
    }

    this.globalMuted = muted;
    this.emit("MUTE_CHANGED", { muted });

    // Propagate to all items if configured
    this.items.forEach((item) => {
      // Items can listen to MUTE_CHANGED event and update themselves
    });
  }

  /**
   * Set user context
   */
  setUserContext(ctx: UserContext): void {
    this.userContext = { ...this.userContext, ...ctx };
  }

  /**
   * Get user context
   */
  getUserContext(): UserContext {
    return { ...this.userContext };
  }

  /**
   * Ensure an external script is loaded
   */
  async ensureExternalScript(name: ScriptName): Promise<void> {
    // If already loaded, return immediately
    if (this.loadedScripts.has(name)) {
      return Promise.resolve();
    }

    // If already loading, return the existing promise
    const existingPromise = this.scriptPromises.get(name);
    if (existingPromise) {
      return existingPromise;
    }

    // Create a new promise for loading
    const loadPromise = this.loadScript(name);
    this.scriptPromises.set(name, loadPromise);

    try {
      await loadPromise;
      this.loadedScripts.add(name);
      this.scriptPromises.delete(name);
    } catch (error) {
      this.scriptPromises.delete(name);
      throw error;
    }
  }

  /**
   * Load a script (implementation depends on script type)
   */
  private loadScript(name: ScriptName): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        resolve();
        return;
      }

      // Check if script is already loaded
      if (name === "ima") {
        // Check if IMA SDK is already available
        if ((window as any).google?.ima) {
          resolve();
          return;
        }

        // Load IMA SDK from Google CDN
        const script = document.createElement("script");
        script.src = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load IMA SDK`));
        document.head.appendChild(script);
      } else {
        // For other scripts, simulate loading
        setTimeout(() => {
          resolve();
        }, 100);
      }
    });
  }

  /**
   * Dispose the engine (cleanup)
   */
  dispose(): void {
    // Dispose all items
    this.items.forEach((item) => item.dispose());
    this.items.clear();
    this.activeItem = null;
    this.removeAllListeners();
  }
}
