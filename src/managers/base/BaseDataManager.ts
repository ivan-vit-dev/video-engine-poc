import { VideoItem, VideoItemEvents } from "../../engine/VideoItem";

/**
 * Base class for all data managers
 * Provides common event subscription and lifecycle management
 */
export abstract class BaseDataManager {
  protected videoItem: VideoItem;
  protected disposed: boolean = false;

  constructor(videoItem: VideoItem) {
    this.videoItem = videoItem;
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for VideoItem events
   * Override in subclasses to subscribe to specific events
   */
  protected setupEventListeners(): void {
    // Common events that most data managers care about
    this.videoItem.on("PLAY", this.handlePlay.bind(this));
    this.videoItem.on("PAUSE", this.handlePause.bind(this));
    this.videoItem.on("ENDED", this.handleEnded.bind(this));
    this.videoItem.on("ERROR", this.handleError.bind(this));
    this.videoItem.on("TIME_UPDATE", this.handleTimeUpdate.bind(this));
    this.videoItem.on("BUFFER_START", this.handleBufferStart.bind(this));
    this.videoItem.on("BUFFER_END", this.handleBufferEnd.bind(this));
    this.videoItem.on("STATE_CHANGED", this.handleStateChanged.bind(this));
  }

  /**
   * Remove all event listeners
   */
  protected removeEventListeners(): void {
    this.videoItem.off("PLAY", this.handlePlay);
    this.videoItem.off("PAUSE", this.handlePause);
    this.videoItem.off("ENDED", this.handleEnded);
    this.videoItem.off("ERROR", this.handleError);
    this.videoItem.off("TIME_UPDATE", this.handleTimeUpdate);
    this.videoItem.off("BUFFER_START", this.handleBufferStart);
    this.videoItem.off("BUFFER_END", this.handleBufferEnd);
    this.videoItem.off("STATE_CHANGED", this.handleStateChanged);
  }

  /**
   * Event handlers - override in subclasses to implement specific logic
   */
  protected handlePlay(_payload: VideoItemEvents["PLAY"]): void {
    // Override in subclass
  }

  protected handlePause(_payload: VideoItemEvents["PAUSE"]): void {
    // Override in subclass
  }

  protected handleEnded(_payload: VideoItemEvents["ENDED"]): void {
    // Override in subclass
  }

  protected handleError(_payload: VideoItemEvents["ERROR"]): void {
    // Override in subclass
  }

  protected handleTimeUpdate(_payload: VideoItemEvents["TIME_UPDATE"]): void {
    // Override in subclass
  }

  protected handleBufferStart(_payload: VideoItemEvents["BUFFER_START"]): void {
    // Override in subclass
  }

  protected handleBufferEnd(_payload: VideoItemEvents["BUFFER_END"]): void {
    // Override in subclass
  }

  protected handleStateChanged(_payload: VideoItemEvents["STATE_CHANGED"]): void {
    // Override in subclass
  }

  /**
   * Dispose the manager and clean up resources
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.removeEventListeners();
    this.disposed = true;
  }

  /**
   * Check if manager is disposed
   */
  isDisposed(): boolean {
    return this.disposed;
  }
}

