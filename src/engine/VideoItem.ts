import { EventEmitter } from "./events/EventEmitter";
import {
  VideoItemInitProps,
  VideoItemState,
  VideoItemConfig,
  VideoEngineContext,
  VideoSourceConfig,
} from "./types";
import { VideoPlayerManager } from "../managers/VideoPlayerManager";
import { VideoDataManager } from "../managers/VideoDataManager";
import { GemiusDataManager } from "../managers/GemiusDataManager";
import { AdvertisementManager } from "../managers/AdvertisementManager";
import { EndScreenManager } from "../managers/EndScreenManager";
import { RecommendationsManager } from "../managers/RecommendationsManager";
import { ChromecastManager } from "../managers/ChromecastManager";
import { AirplayManager } from "../managers/AirplayManager";
import { FloatingManager } from "../managers/FloatingManager";

/**
 * VideoItem event map
 */
export interface VideoItemEvents {
  PLAY: {};
  PAUSE: {};
  ENDED: {};
  ERROR: { error: Error };
  TIME_UPDATE: { currentTime: number; duration: number };
  BUFFER_START: {};
  BUFFER_END: {};
  STATE_CHANGED: { state: VideoItemState };
  AD_BREAK_STARTED: {};
  AD_BREAK_ENDED: {};
  RECOMMENDATIONS_SHOWN: {};
  VOLUME_CHANGED: { volume: number };
  MUTE_CHANGED: { muted: boolean };
  // Events for requesting global state (if needed)
  REQUEST_GLOBAL_VOLUME: {};
  REQUEST_GLOBAL_MUTE: {};
  [key: string]: unknown;
}

/**
 * VideoItem - Encapsulates all logic for a single video experience
 */
export class VideoItem extends EventEmitter<VideoItemEvents> {
  private id: string;
  private config: VideoItemConfig;
  private state: VideoItemState = VideoItemState.IDLE;
  private initialized: boolean = false;
  private engineContext: VideoEngineContext;
  private playerManager: VideoPlayerManager | null = null;

  // Data managers
  private videoDataManager: VideoDataManager | null = null;
  private gemiusDataManager: GemiusDataManager | null = null;

  // Feature managers
  private advertisementManager: AdvertisementManager | null = null;
  private endScreenManager: EndScreenManager | null = null;
  private recommendationsManager: RecommendationsManager | null = null;
  private chromecastManager: ChromecastManager | null = null;
  private airplayManager: AirplayManager | null = null;
  private floatingManager: FloatingManager | null = null;
  private managersInitialized: boolean = false;

  constructor(
    initProps: VideoItemInitProps,
    engineContext: VideoEngineContext
  ) {
    super();
    this.id = initProps.id;
    this.engineContext = { ...engineContext };

    // Resolve configuration with defaults
    this.config = {
      ...initProps,
      playerType: engineContext.playerType,
      volume: initProps.volume ?? engineContext.globalVolume,
      muted: initProps.muted ?? engineContext.globalMuted,
    };
  }

  /**
   * Initialize the VideoItem with a container
   */
  async init(container: HTMLElement): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Phase 1: Generic settings preparation
    // (Already done in constructor)

    // Phase 2: Create player manager only
    this.playerManager = new VideoPlayerManager(this, this.config.playerType);

    // Set up event listeners for state management
    this.setupStateEventListeners();

    // Set up READY event handler to initialize all managers
    this.on("STATE_CHANGED", this.handleStateChanged.bind(this));

    // Phase 3: Initialize player with container
    this.setState(VideoItemState.LOADING);

    // Build source config from props
    const source: VideoSourceConfig = {
      url: this.config.url,
      videoId: this.config.videoId,
      manifestId: this.config.manifestId,
      type: this.config.source?.type,
      poster: this.config.source?.poster,
      ...this.config.source,
    };

    try {
      await this.playerManager.init(container, source);
      this.setState(VideoItemState.READY);
      // Managers and autoplay will be handled in handleStateChanged when state becomes READY
    } catch (error) {
      this.setState(VideoItemState.ERROR);
      this.emit("ERROR", {
        error:
          error instanceof Error
            ? error
            : new Error("Failed to initialize player"),
      });
      throw error;
    }

    this.initialized = true;
  }

  /**
   * Handle state changes - initialize managers and handle autoplay when player becomes READY
   */
  private handleStateChanged(payload: { state: VideoItemState }): void {
    if (payload.state === VideoItemState.READY && !this.managersInitialized) {
      this.initializeManagers();
      this.handleAutoplay();
    }
  }

  /**
   * Handle autoplay after player and managers are ready
   */
  private async handleAutoplay(): Promise<void> {
    if (!this.config.autoplay) {
      return;
    }

    // Player is already ready at this point
    // Don't wait for ads - they should not block playback
    try {
      await this.play();
    } catch (error) {
      // Autoplay might fail due to browser policies (user interaction required)
      // This is expected and not a critical error
    }
  }

  /**
   * Initialize all managers after player is READY
   */
  private initializeManagers(): void {
    if (this.managersInitialized) {
      return;
    }

    // Create data managers based on config
    if (this.config.dataEndpoint) {
      this.videoDataManager = new VideoDataManager(this, {
        endpoint: this.config.dataEndpoint,
        enabled: true,
        metadata: this.config.metadata,
      });
    }

    if (this.config.gemiusId) {
      this.gemiusDataManager = new GemiusDataManager(this, {
        gemiusId: this.config.gemiusId,
        enabled: true,
        metadata: this.config.metadata,
      });
    }

    // Create feature managers based on feature flags
    if (this.config.adsEnabled) {
      this.advertisementManager = new AdvertisementManager(this, {
        enabled: true,
        adTagUrl: this.config.adTagUrl,
        metadata: this.config.metadata,
      });
    }

    if (this.config.endscreenEnabled) {
      this.endScreenManager = new EndScreenManager(this, {
        enabled: true,
        autoShow: true,
      });
    }

    if (this.config.recommendationsEnabled) {
      this.recommendationsManager = new RecommendationsManager(this, {
        enabled: true,
        autoShow: false,
        showOnEnd: true,
        metadata: this.config.metadata,
      });
    }

    if (this.config.chromecastEnabled) {
      this.chromecastManager = new ChromecastManager(this, {
        enabled: true,
      });
    }

    if (this.config.airplayEnabled) {
      this.airplayManager = new AirplayManager(this, {
        enabled: true,
      });
    }

    if (this.config.floatingEnabled) {
      this.floatingManager = new FloatingManager(this, {
        enabled: true,
        autoFloat: false,
      });
    }

    this.managersInitialized = true;
  }

  /**
   * Set up event listeners to update state based on player events
   */
  private setupStateEventListeners(): void {
    // Listen to PLAY event to update state to PLAYING
    // This is emitted from the 'playing' event, which means video is actually playing
    this.on("PLAY", () => {
      if (this.state !== VideoItemState.PLAYING) {
        this.setState(VideoItemState.PLAYING);
      }
    });

    // Listen to PAUSE event to update state
    this.on("PAUSE", () => {
      if (this.state !== VideoItemState.PAUSED) {
        this.setState(VideoItemState.PAUSED);
      }
    });

    // Listen to ENDED event to update state
    this.on("ENDED", () => {
      if (this.state !== VideoItemState.ENDED) {
        this.setState(VideoItemState.ENDED);
      }
    });

    // Listen to BUFFER_START event
    this.on("BUFFER_START", () => {
      if (this.state === VideoItemState.PLAYING) {
        this.setState(VideoItemState.BUFFERING);
      }
    });

    // Listen to BUFFER_END event
    this.on("BUFFER_END", () => {
      if (this.state === VideoItemState.BUFFERING) {
        // Return to previous state (playing or paused)
        // For simplicity, we'll check if player is paused
        if (this.playerManager?.isPaused()) {
          this.setState(VideoItemState.PAUSED);
        } else {
          this.setState(VideoItemState.PLAYING);
        }
      }
    });
  }

  /**
   * Get the item ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get the configuration
   */
  getConfig(): VideoItemConfig {
    return { ...this.config };
  }

  /**
   * Get the engine context (user context, global state, etc.)
   */
  getEngineContext(): VideoEngineContext {
    return { ...this.engineContext };
  }

  /**
   * Get the current state
   */
  getState(): VideoItemState {
    return this.state;
  }

  /**
   * Get the player manager (for IMA integration)
   */
  getPlayerManager(): VideoPlayerManager | null {
    return this.playerManager;
  }

  /**
   * Set the state
   */
  private setState(newState: VideoItemState): void {
    if (this.state === newState) {
      return;
    }
    this.state = newState;
    this.emit("STATE_CHANGED", { state: newState });
  }

  /**
   * Play the video
   */
  async play(): Promise<void> {
    console.log("[VideoItem] play() called, current state:", this.state);
    if (!this.playerManager) {
      console.error("[VideoItem] Player manager not initialized");
      throw new Error("Player not initialized");
    }

    // Don't try to play if we're in an error or idle state
    const currentState = this.state;
    if (
      currentState === VideoItemState.ERROR ||
      currentState === VideoItemState.IDLE
    ) {
      console.error("[VideoItem] Cannot play in state:", currentState);
      throw new Error(`Cannot play: player is in ${currentState} state`);
    }

    try {
      console.log("[VideoItem] Calling playerManager.play()");
      await this.playerManager.play();
      console.log("[VideoItem] playerManager.play() completed");
      // State will be updated via event from manager
    } catch (error) {
      // If unmuted autoplay failed due to browser policy, try muted autoplay
      if (
        error instanceof Error &&
        error.name === "NotAllowedError" &&
        !this.playerManager.isMuted()
      ) {
        console.log(
          "[VideoItem] Unmuted autoplay failed, trying muted autoplay..."
        );
        try {
          this.playerManager.setMuted(true);
          await this.playerManager.play();
          console.log("[VideoItem] Muted autoplay succeeded");
          // State will be updated via event from manager
          return;
        } catch (mutedError) {
          // If muted autoplay also fails, throw the original error
          throw error;
        }
      }
      console.error("[VideoItem] Error in play():", error);
      // Re-throw to let caller handle it
      throw error;
    }
  }

  /**
   * Pause the video
   */
  pause(): void {
    if (!this.playerManager) {
      return;
    }
    // Update state immediately for responsive UI
    if (this.state === VideoItemState.PLAYING) {
      this.setState(VideoItemState.PAUSED);
    }
    this.playerManager.pause();
    // State will also be updated via event from manager (as a backup)
  }

  /**
   * Seek to a specific time
   */
  seekTo(seconds: number): void {
    if (!this.playerManager) {
      return;
    }
    this.playerManager.seekTo(seconds);
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.config.volume = clampedVolume;
    this.playerManager?.setVolume(clampedVolume);
    this.emit("VOLUME_CHANGED", { volume: clampedVolume });
  }

  /**
   * Set muted state
   */
  setMuted(muted: boolean): void {
    this.config.muted = muted;
    this.playerManager?.setMuted(muted);
    this.emit("MUTE_CHANGED", { muted });
  }

  /**
   * Get current time
   */
  getCurrentTime(): number {
    return this.playerManager?.getCurrentTime() || 0;
  }

  /**
   * Get duration
   */
  getDuration(): number {
    return this.playerManager?.getDuration() || 0;
  }

  /**
   * Update configuration
   */
  update(props: Partial<VideoItemInitProps>): void {
    this.config = { ...this.config, ...props };
  }

  /**
   * Dispose the VideoItem
   */
  dispose(): void {
    // Dispose player manager
    if (this.playerManager) {
      this.playerManager.dispose();
      this.playerManager = null;
    }

    // Dispose data managers
    if (this.videoDataManager) {
      this.videoDataManager.dispose();
      this.videoDataManager = null;
    }
    if (this.gemiusDataManager) {
      this.gemiusDataManager.dispose();
      this.gemiusDataManager = null;
    }

    // Dispose feature managers
    if (this.advertisementManager) {
      this.advertisementManager.dispose();
      this.advertisementManager = null;
    }
    if (this.endScreenManager) {
      this.endScreenManager.dispose();
      this.endScreenManager = null;
    }
    if (this.recommendationsManager) {
      this.recommendationsManager.dispose();
      this.recommendationsManager = null;
    }
    if (this.chromecastManager) {
      this.chromecastManager.dispose();
      this.chromecastManager = null;
    }
    if (this.airplayManager) {
      this.airplayManager.dispose();
      this.airplayManager = null;
    }
    if (this.floatingManager) {
      this.floatingManager.dispose();
      this.floatingManager = null;
    }

    this.removeAllListeners();
    this.setState(VideoItemState.IDLE);
    this.initialized = false;
  }
}
