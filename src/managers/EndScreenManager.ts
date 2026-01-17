import { VideoItem, VideoItemEvents } from "../engine/VideoItem";

/**
 * Configuration for EndScreenManager
 */
export interface EndScreenManagerConfig {
  enabled?: boolean;
  autoShow?: boolean;
  delay?: number; // Delay in ms before showing end screen
}

/**
 * EndScreenManager - Handles end screen display logic
 */
export class EndScreenManager {
  private videoItem: VideoItem;
  private config: EndScreenManagerConfig;
  private disposed: boolean = false;
  private endScreenShown: boolean = false;

  constructor(videoItem: VideoItem, config: EndScreenManagerConfig = {}) {
    this.videoItem = videoItem;
    this.config = {
      enabled: true,
      autoShow: true,
      delay: 0,
      ...config,
    };
    this.setupEventListeners();
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    this.videoItem.on("ENDED", this.handleEnded.bind(this));
    this.videoItem.on("PLAY", this.handlePlay.bind(this));
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    this.videoItem.off("ENDED", this.handleEnded);
    this.videoItem.off("PLAY", this.handlePlay);
  }

  /**
   * Handle video ended event
   */
  private handleEnded(_payload: VideoItemEvents["ENDED"]): void {
    if (!this.config.enabled || this.endScreenShown) {
      return;
    }

    if (this.config.autoShow) {
      const delay = this.config.delay || 0;
      setTimeout(() => {
        this.showEndScreen();
      }, delay);
    }
  }

  /**
   * Handle play event - hide end screen if shown
   */
  private handlePlay(_payload: VideoItemEvents["PLAY"]): void {
    if (this.endScreenShown) {
      this.hideEndScreen();
    }
  }

  /**
   * Show the end screen
   */
  showEndScreen(): void {
    if (!this.config.enabled || this.endScreenShown) {
      return;
    }

    this.endScreenShown = true;
    // In production, this would emit an event or call a method to show UI
    // For POC, we'll just track the state
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[EndScreenManager] End screen shown");
    }
  }

  /**
   * Hide the end screen
   */
  hideEndScreen(): void {
    if (!this.endScreenShown) {
      return;
    }

    this.endScreenShown = false;
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[EndScreenManager] End screen hidden");
    }
  }

  /**
   * Check if end screen is shown
   */
  isEndScreenShown(): boolean {
    return this.endScreenShown;
  }

  /**
   * Dispose the manager
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.removeEventListeners();
    this.disposed = true;
  }
}

