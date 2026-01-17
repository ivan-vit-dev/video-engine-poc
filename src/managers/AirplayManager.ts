import { VideoItem } from "../engine/VideoItem";

/**
 * Configuration for AirplayManager
 */
export interface AirplayManagerConfig {
  enabled?: boolean;
}

/**
 * AirplayManager - Handles AirPlay integration
 * For POC, this is a stub implementation
 */
export class AirplayManager {
  private videoItem: VideoItem;
  private config: AirplayManagerConfig;
  private disposed: boolean = false;
  private isAirplaying: boolean = false;

  constructor(videoItem: VideoItem, config: AirplayManagerConfig = {}) {
    this.videoItem = videoItem;
    this.config = {
      enabled: true,
      ...config,
    };
  }

  /**
   * Check if AirPlay is available
   */
  isAvailable(): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // In production, this would check for AirPlay support
    // For POC, we'll check if we're on a platform that supports AirPlay
    if (typeof window !== "undefined") {
      // AirPlay is typically available on Safari/iOS
      // This is a simplified check
      return false; // Stub for POC
    }

    return false;
  }

  /**
   * Start AirPlay
   */
  startAirplay(): void {
    if (!this.isAvailable() || this.isAirplaying) {
      return;
    }

    this.isAirplaying = true;
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[AirplayManager] AirPlay started");
    }

    // In production, this would trigger native AirPlay interface
    // The video element would need the webkit-playsinline attribute
  }

  /**
   * Stop AirPlay
   */
  stopAirplay(): void {
    if (!this.isAirplaying) {
      return;
    }

    this.isAirplaying = false;
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[AirplayManager] AirPlay stopped");
    }
  }

  /**
   * Check if currently AirPlaying
   */
  getIsAirplaying(): boolean {
    return this.isAirplaying;
  }

  /**
   * Dispose the manager
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    if (this.isAirplaying) {
      this.stopAirplay();
    }

    this.disposed = true;
  }
}

