import { BaseDataManager } from "./base/BaseDataManager";
import { VideoItem, VideoItemEvents } from "../engine/VideoItem";

/**
 * Configuration for VideoDataManager
 */
export interface VideoDataManagerConfig {
  endpoint?: string;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * VideoDataManager - Handles analytics data collection and sending
 * Subscribes to VideoItem events and sends data to configured endpoint
 */
export class VideoDataManager extends BaseDataManager {
  private config: VideoDataManagerConfig;
  private sessionStartTime: number = 0;
  private playStartTime: number = 0;
  private totalPlayTime: number = 0;
  private pauseCount: number = 0;
  private bufferCount: number = 0;
  private totalBufferTime: number = 0;
  private bufferStartTime: number = 0;
  private lastTimeUpdate: number = 0;
  private hasEnded: boolean = false;

  constructor(videoItem: VideoItem, config: VideoDataManagerConfig = {}) {
    super(videoItem);
    this.config = {
      enabled: true,
      ...config,
    };
    this.sessionStartTime = Date.now();
  }

  protected override setupEventListeners(): void {
    super.setupEventListeners();
    // Subscribe to additional events if needed
    this.videoItem.on("AD_BREAK_STARTED", this.handleAdBreakStarted.bind(this));
    this.videoItem.on("AD_BREAK_ENDED", this.handleAdBreakEnded.bind(this));
  }

  protected override removeEventListeners(): void {
    super.removeEventListeners();
    this.videoItem.off("AD_BREAK_STARTED", this.handleAdBreakStarted);
    this.videoItem.off("AD_BREAK_ENDED", this.handleAdBreakEnded);
  }

  protected override handlePlay(_payload: VideoItemEvents["PLAY"]): void {
    if (!this.config.enabled) {
      return;
    }

    this.playStartTime = Date.now();
    this.sendEvent("play", {
      timestamp: this.playStartTime,
      videoId: this.videoItem.getConfig().videoId,
      currentTime: this.videoItem.getCurrentTime(),
    });
  }

  protected override handlePause(_payload: VideoItemEvents["PAUSE"]): void {
    if (!this.config.enabled) {
      return;
    }

    this.pauseCount++;
    const pauseTime = Date.now();
    const playDuration = pauseTime - this.playStartTime;
    this.totalPlayTime += playDuration;

    this.sendEvent("pause", {
      timestamp: pauseTime,
      videoId: this.videoItem.getConfig().videoId,
      currentTime: this.videoItem.getCurrentTime(),
      playDuration,
      pauseCount: this.pauseCount,
    });
  }

  protected override handleEnded(_payload: VideoItemEvents["ENDED"]): void {
    if (!this.config.enabled || this.hasEnded) {
      return;
    }

    this.hasEnded = true;
    const endTime = Date.now();
    const sessionDuration = endTime - this.sessionStartTime;

    this.sendEvent("ended", {
      timestamp: endTime,
      videoId: this.videoItem.getConfig().videoId,
      currentTime: this.videoItem.getCurrentTime(),
      duration: this.videoItem.getDuration(),
      totalPlayTime: this.totalPlayTime,
      sessionDuration,
      pauseCount: this.pauseCount,
      bufferCount: this.bufferCount,
      totalBufferTime: this.totalBufferTime,
    });
  }

  protected override handleError(payload: VideoItemEvents["ERROR"]): void {
    if (!this.config.enabled) {
      return;
    }

    this.sendEvent("error", {
      timestamp: Date.now(),
      videoId: this.videoItem.getConfig().videoId,
      error: payload.error.message,
      currentTime: this.videoItem.getCurrentTime(),
    });
  }

  protected override handleTimeUpdate(
    payload: VideoItemEvents["TIME_UPDATE"]
  ): void {
    if (!this.config.enabled) {
      return;
    }

    // Throttle time update events (send every 5 seconds)
    const now = Date.now();
    if (now - this.lastTimeUpdate < 5000) {
      return;
    }

    this.lastTimeUpdate = now;
    this.sendEvent("timeupdate", {
      timestamp: now,
      videoId: this.videoItem.getConfig().videoId,
      currentTime: payload.currentTime,
      duration: payload.duration,
      progress: payload.duration > 0 ? payload.currentTime / payload.duration : 0,
    });
  }

  protected override handleBufferStart(
    _payload: VideoItemEvents["BUFFER_START"]
  ): void {
    if (!this.config.enabled) {
      return;
    }

    this.bufferCount++;
    this.bufferStartTime = Date.now();
    this.sendEvent("buffer_start", {
      timestamp: this.bufferStartTime,
      videoId: this.videoItem.getConfig().videoId,
      currentTime: this.videoItem.getCurrentTime(),
      bufferCount: this.bufferCount,
    });
  }

  protected override handleBufferEnd(
    _payload: VideoItemEvents["BUFFER_END"]
  ): void {
    if (!this.config.enabled || this.bufferStartTime === 0) {
      return;
    }

    const bufferEndTime = Date.now();
    const bufferDuration = bufferEndTime - this.bufferStartTime;
    this.totalBufferTime += bufferDuration;

    this.sendEvent("buffer_end", {
      timestamp: bufferEndTime,
      videoId: this.videoItem.getConfig().videoId,
      currentTime: this.videoItem.getCurrentTime(),
      bufferDuration,
      totalBufferTime: this.totalBufferTime,
    });

    this.bufferStartTime = 0;
  }

  protected handleAdBreakStarted(_payload: VideoItemEvents["AD_BREAK_STARTED"]): void {
    if (!this.config.enabled) {
      return;
    }

    this.sendEvent("ad_break_started", {
      timestamp: Date.now(),
      videoId: this.videoItem.getConfig().videoId,
      currentTime: this.videoItem.getCurrentTime(),
    });
  }

  protected handleAdBreakEnded(_payload: VideoItemEvents["AD_BREAK_ENDED"]): void {
    if (!this.config.enabled) {
      return;
    }

    this.sendEvent("ad_break_ended", {
      timestamp: Date.now(),
      videoId: this.videoItem.getConfig().videoId,
      currentTime: this.videoItem.getCurrentTime(),
    });
  }

  /**
   * Send event data to the configured endpoint
   */
  private async sendEvent(eventType: string, eventData: Record<string, unknown>): Promise<void> {
    if (!this.config.endpoint) {
      // No endpoint configured, skip sending
      return;
    }

    const payload = {
      event: eventType,
      videoItemId: this.videoItem.getId(),
      ...eventData,
      ...this.config.metadata,
    };

    try {
      // In POC, we'll just log the payload
      // In production, this would be a real API call
      if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log(`[VideoDataManager] Event: ${eventType}`, payload);
      }

      // Production implementation would use fetch:
      // await fetch(this.config.endpoint, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(payload),
      // });
    } catch (error) {
      // Silently fail in POC - in production, might want to queue for retry
      if (error instanceof Error) {
        // Error handling
      }
    }
  }

  /**
   * Get current analytics data snapshot
   */
  getAnalyticsData(): Record<string, unknown> {
    return {
      videoId: this.videoItem.getConfig().videoId,
      videoItemId: this.videoItem.getId(),
      sessionDuration: Date.now() - this.sessionStartTime,
      totalPlayTime: this.totalPlayTime,
      pauseCount: this.pauseCount,
      bufferCount: this.bufferCount,
      totalBufferTime: this.totalBufferTime,
      hasEnded: this.hasEnded,
      currentTime: this.videoItem.getCurrentTime(),
      duration: this.videoItem.getDuration(),
    };
  }
}

