import { VideoItem, VideoItemEvents } from "../engine/VideoItem";

/**
 * Configuration for RecommendationsManager
 */
export interface RecommendationsManagerConfig {
  enabled?: boolean;
  endpoint?: string;
  autoShow?: boolean;
  showOnEnd?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Recommendation item
 */
export interface RecommendationItem {
  id: string;
  title: string;
  thumbnail: string;
  duration?: number;
  videoId?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

/**
 * RecommendationsManager - Handles video recommendations
 */
export class RecommendationsManager {
  private videoItem: VideoItem;
  private config: RecommendationsManagerConfig;
  private disposed: boolean = false;
  private recommendations: RecommendationItem[] = [];
  private recommendationsShown: boolean = false;

  constructor(videoItem: VideoItem, config: RecommendationsManagerConfig = {}) {
    this.videoItem = videoItem;
    this.config = {
      enabled: true,
      autoShow: false,
      showOnEnd: true,
      ...config,
    };
    this.setupEventListeners();
    this.loadRecommendations();
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
   * Load recommendations from endpoint
   */
  private async loadRecommendations(): Promise<void> {
    if (!this.config.enabled || !this.config.endpoint) {
      // For POC, use mock data
      this.recommendations = this.getMockRecommendations();
      return;
    }

    try {
      // In production, this would fetch from the endpoint
      // const response = await fetch(this.config.endpoint, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     videoId: this.videoItem.getConfig().videoId,
      //     ...this.config.metadata,
      //   }),
      // });
      // this.recommendations = await response.json();

      // For POC, use mock data
      this.recommendations = this.getMockRecommendations();
    } catch (error) {
      // Fallback to mock data on error
      this.recommendations = this.getMockRecommendations();
      if (error instanceof Error) {
        // Error handling
      }
    }
  }

  /**
   * Get mock recommendations for POC
   */
  private getMockRecommendations(): RecommendationItem[] {
    return [
      {
        id: "rec-1",
        title: "Recommended Video 1",
        thumbnail: "https://via.placeholder.com/320x180",
        duration: 120,
        videoId: "video-1",
      },
      {
        id: "rec-2",
        title: "Recommended Video 2",
        thumbnail: "https://via.placeholder.com/320x180",
        duration: 180,
        videoId: "video-2",
      },
      {
        id: "rec-3",
        title: "Recommended Video 3",
        thumbnail: "https://via.placeholder.com/320x180",
        duration: 240,
        videoId: "video-3",
      },
    ];
  }

  /**
   * Handle video ended event
   */
  private handleEnded(_payload: VideoItemEvents["ENDED"]): void {
    if (!this.config.enabled || this.recommendationsShown) {
      return;
    }

    if (this.config.showOnEnd && this.config.autoShow) {
      this.showRecommendations();
    }
  }

  /**
   * Handle play event - hide recommendations if shown
   */
  private handlePlay(_payload: VideoItemEvents["PLAY"]): void {
    if (this.recommendationsShown) {
      this.hideRecommendations();
    }
  }

  /**
   * Show recommendations
   */
  showRecommendations(): void {
    if (!this.config.enabled || this.recommendationsShown) {
      return;
    }

    this.recommendationsShown = true;
    this.videoItem.emit("RECOMMENDATIONS_SHOWN", {});

    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[RecommendationsManager] Recommendations shown", this.recommendations);
    }
  }

  /**
   * Hide recommendations
   */
  hideRecommendations(): void {
    if (!this.recommendationsShown) {
      return;
    }

    this.recommendationsShown = false;
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log("[RecommendationsManager] Recommendations hidden");
    }
  }

  /**
   * Get current recommendations
   */
  getRecommendations(): RecommendationItem[] {
    return [...this.recommendations];
  }

  /**
   * Check if recommendations are shown
   */
  areRecommendationsShown(): boolean {
    return this.recommendationsShown;
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

