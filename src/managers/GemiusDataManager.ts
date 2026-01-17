import { BaseDataManager } from "./base/BaseDataManager";
import { VideoItem, VideoItemEvents } from "../engine/VideoItem";

/**
 * Configuration for GemiusDataManager
 */
export interface GemiusDataManagerConfig {
  gemiusId?: string;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * GemiusDataManager - Handles Gemius analytics integration
 * Subscribes to VideoItem events and sends data to Gemius
 */
export class GemiusDataManager extends BaseDataManager {
  private config: GemiusDataManagerConfig;
  private gemiusLoaded: boolean = false;

  constructor(videoItem: VideoItem, config: GemiusDataManagerConfig = {}) {
    super(videoItem);
    this.config = {
      enabled: true,
      ...config,
    };
    this.initializeGemius();
  }

  /**
   * Initialize Gemius SDK (stub for POC)
   */
  private async initializeGemius(): Promise<void> {
    if (!this.config.enabled || !this.config.gemiusId) {
      return;
    }

    // In production, this would load the Gemius SDK
    // For POC, we'll just mark it as loaded
    // await this.videoItem.getEngine()?.ensureExternalScript("gemius");
    
    this.gemiusLoaded = true;
  }

  protected override handlePlay(_payload: VideoItemEvents["PLAY"]): void {
    if (!this.config.enabled || !this.gemiusLoaded) {
      return;
    }

    this.sendGemiusEvent("play", {
      videoId: this.videoItem.getConfig().videoId,
      currentTime: this.videoItem.getCurrentTime(),
    });
  }

  protected override handlePause(_payload: VideoItemEvents["PAUSE"]): void {
    if (!this.config.enabled || !this.gemiusLoaded) {
      return;
    }

    this.sendGemiusEvent("pause", {
      videoId: this.videoItem.getConfig().videoId,
      currentTime: this.videoItem.getCurrentTime(),
    });
  }

  protected override handleEnded(_payload: VideoItemEvents["ENDED"]): void {
    if (!this.config.enabled || !this.gemiusLoaded) {
      return;
    }

    this.sendGemiusEvent("ended", {
      videoId: this.videoItem.getConfig().videoId,
      duration: this.videoItem.getDuration(),
      currentTime: this.videoItem.getCurrentTime(),
    });
  }

  protected override handleTimeUpdate(
    payload: VideoItemEvents["TIME_UPDATE"]
  ): void {
    if (!this.config.enabled || !this.gemiusLoaded) {
      return;
    }

    // Gemius typically tracks milestones (25%, 50%, 75%, 100%)
    const progress = payload.duration > 0 ? payload.currentTime / payload.duration : 0;
    const milestones = [0.25, 0.5, 0.75, 1.0];
    
    // Check if we've crossed a milestone
    // In production, this would track which milestones have been sent
    // For POC, we'll just log the progress
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(`[GemiusDataManager] Progress: ${(progress * 100).toFixed(1)}%`);
    }
  }

  protected override handleError(payload: VideoItemEvents["ERROR"]): void {
    if (!this.config.enabled || !this.gemiusLoaded) {
      return;
    }

    this.sendGemiusEvent("error", {
      videoId: this.videoItem.getConfig().videoId,
      error: payload.error.message,
    });
  }

  /**
   * Send event to Gemius
   */
  private sendGemiusEvent(eventType: string, eventData: Record<string, unknown>): void {
    if (!this.config.gemiusId) {
      return;
    }

    const payload = {
      gemiusId: this.config.gemiusId,
      event: eventType,
      videoItemId: this.videoItem.getId(),
      ...eventData,
      ...this.config.metadata,
    };

    try {
      // In POC, we'll just log the payload
      // In production, this would use Gemius SDK API
      if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log(`[GemiusDataManager] Event: ${eventType}`, payload);
      }

      // Production implementation would use Gemius SDK:
      // if (window.pp_gemius_analytics) {
      //   window.pp_gemius_analytics.sendEvent({
      //     ...payload,
      //   });
      // }
    } catch (error) {
      // Silently fail in POC
      if (error instanceof Error) {
        // Error handling
      }
    }
  }
}

