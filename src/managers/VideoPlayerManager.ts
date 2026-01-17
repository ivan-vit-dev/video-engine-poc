import {
  VideoPlayerAdapter,
  VideoJsAdapter,
  Html5Adapter,
  ShakaAdapter,
} from "../adapters";
import { VideoSourceConfig, PlayerType } from "../engine/types";
import { VideoItem, VideoItemEvents } from "../engine/VideoItem";

/**
 * VideoPlayerManager - Orchestrates the video player adapter and maps events
 */
export class VideoPlayerManager {
  private adapter: VideoPlayerAdapter | null = null;
  private videoItem: VideoItem;
  private playerType: PlayerType;
  private container: HTMLElement | null = null;
  private source: VideoSourceConfig | null = null;

  constructor(videoItem: VideoItem, playerType: PlayerType) {
    this.videoItem = videoItem;
    this.playerType = playerType;
  }

  /**
   * Initialize the player with a container element
   */
  async init(container: HTMLElement, source: VideoSourceConfig): Promise<void> {
    this.container = container;
    this.source = source;

    // Create adapter based on player type
    this.adapter = this.createAdapter();

    // Mount adapter to container
    this.adapter.mount(container);

    // Set up event mapping from adapter to VideoItem
    this.setupEventMapping();

    // Load the source
    await this.adapter.loadSource(source);

    // Apply initial settings
    this.applyInitialSettings();
  }

  /**
   * Create adapter instance based on player type
   */
  private createAdapter(): VideoPlayerAdapter {
    switch (this.playerType) {
      case "videojs":
        return new VideoJsAdapter();
      case "html5":
        return new Html5Adapter();
      case "shaka":
        return new ShakaAdapter();
      default:
        throw new Error(`Unknown player type: ${this.playerType}`);
    }
  }

  /**
   * Set up event mapping from adapter to VideoItem
   */
  private setupEventMapping(): void {
    if (!this.adapter) {
      return;
    }

    // Map adapter events to VideoItem events
    // Note: We don't emit PLAY on 'play' event - we wait for 'playing' event
    // The 'play' event fires when play() is called, but 'playing' fires when video actually starts
    this.adapter.on("play", () => {
      // Don't emit PLAY here - wait for 'playing' event to ensure video is actually playing
    });

    this.adapter.on("pause", () => {
      this.videoItem.emit("PAUSE", {});
    });

    this.adapter.on("ended", () => {
      this.videoItem.emit("ENDED", {});
    });

    this.adapter.on("error", ({ error }) => {
      this.videoItem.emit("ERROR", { error });
    });

    this.adapter.on("timeupdate", ({ currentTime, duration }) => {
      this.videoItem.emit("TIME_UPDATE", { currentTime, duration });
    });

    this.adapter.on("waiting", () => {
      this.videoItem.emit("BUFFER_START", {});
    });

    this.adapter.on("canplay", () => {
      this.videoItem.emit("BUFFER_END", {});
    });

    this.adapter.on("playing", () => {
      // playing event means video is actually playing (not just play() was called)
      this.videoItem.emit("PLAY", {});
      this.videoItem.emit("BUFFER_END", {});
    });

    // Also listen to play event but don't emit PLAY - we'll wait for 'playing' event
    // The 'play' event fires when play() is called, but 'playing' fires when video actually starts
    this.adapter.on("play", () => {
      // Don't emit PLAY here - wait for 'playing' event to ensure video is actually playing
    });

    this.adapter.on("volumechange", ({ volume, muted }) => {
      this.videoItem.emit("VOLUME_CHANGED", { volume });
      this.videoItem.emit("MUTE_CHANGED", { muted });
    });
  }

  /**
   * Apply initial settings from VideoItem config
   */
  private applyInitialSettings(): void {
    if (!this.adapter) {
      return;
    }

    const config = this.videoItem.getConfig();
    this.adapter.setVolume(config.volume);
    this.adapter.setMuted(config.muted);

    if (config.playbackRate) {
      this.adapter.setPlaybackRate(config.playbackRate);
    }
  }

  /**
   * Play the video
   */
  async play(): Promise<void> {
    if (!this.adapter) {
      throw new Error("Player not initialized");
    }
    await this.adapter.play();
  }

  /**
   * Pause the video
   */
  pause(): void {
    this.adapter?.pause();
  }

  /**
   * Seek to a specific time
   */
  seekTo(seconds: number): void {
    this.adapter?.seekTo(seconds);
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    this.adapter?.setVolume(volume);
  }

  /**
   * Set muted state
   */
  setMuted(muted: boolean): void {
    this.adapter?.setMuted(muted);
  }

  /**
   * Check if muted
   */
  isMuted(): boolean {
    return this.adapter?.isMuted() || false;
  }

  /**
   * Get volume
   */
  getVolume(): number {
    return this.adapter?.getVolume() || 1;
  }

  /**
   * Get current time
   */
  getCurrentTime(): number {
    return this.adapter?.getCurrentTime() || 0;
  }

  /**
   * Get duration
   */
  getDuration(): number {
    return this.adapter?.getDuration() || 0;
  }

  /**
   * Get buffered ranges
   */
  getBufferedRanges(): TimeRanges | null {
    return this.adapter?.getBufferedRanges() || null;
  }

  /**
   * Set playback rate
   */
  setPlaybackRate(rate: number): void {
    this.adapter?.setPlaybackRate(rate);
  }

  /**
   * Get playback rate
   */
  getPlaybackRate(): number {
    return this.adapter?.getPlaybackRate() || 1;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.adapter?.isPaused() ?? true;
  }

  /**
   * Check if ended
   */
  isEnded(): boolean {
    return this.adapter?.isEnded() ?? false;
  }

  /**
   * Get the adapter instance (for IMA integration)
   */
  getAdapter(): VideoPlayerAdapter | null {
    return this.adapter;
  }

  /**
   * Dispose the manager and adapter
   */
  dispose(): void {
    if (this.adapter) {
      this.adapter.destroy();
      this.adapter = null;
    }
    this.container = null;
    this.source = null;
  }
}
