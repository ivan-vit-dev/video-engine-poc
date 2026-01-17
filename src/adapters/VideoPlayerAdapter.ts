import { VideoSourceConfig } from "../engine/types";
import { EventEmitter, EventMap } from "../engine/events/EventEmitter";

/**
 * Player adapter event map
 */
export interface PlayerAdapterEvents extends EventMap {
  play: {};
  pause: {};
  ended: {};
  error: { error: Error };
  timeupdate: { currentTime: number; duration: number };
  seeking: {};
  seeked: {};
  volumechange: { volume: number; muted: boolean };
  loadedmetadata: { duration: number };
  canplay: {};
  waiting: {};
  playing: {};
  ratechange: { playbackRate: number };
}

/**
 * VideoPlayerAdapter - Abstract interface for all video player adapters
 */
export abstract class VideoPlayerAdapter extends EventEmitter<PlayerAdapterEvents> {
  protected container: HTMLElement | null = null;
  protected source: VideoSourceConfig | null = null;

  /**
   * Mount the player to a container element
   */
  abstract mount(container: HTMLElement): void;

  /**
   * Destroy the player instance
   */
  abstract destroy(): void;

  /**
   * Load a video source
   */
  abstract loadSource(source: VideoSourceConfig): Promise<void>;

  /**
   * Play the video
   */
  abstract play(): Promise<void>;

  /**
   * Pause the video
   */
  abstract pause(): void;

  /**
   * Seek to a specific time (in seconds)
   */
  abstract seekTo(seconds: number): void;

  /**
   * Set volume (0.0 to 1.0)
   */
  abstract setVolume(volume: number): void;

  /**
   * Get volume (0.0 to 1.0)
   */
  abstract getVolume(): number;

  /**
   * Set muted state
   */
  abstract setMuted(muted: boolean): void;

  /**
   * Check if muted
   */
  abstract isMuted(): boolean;

  /**
   * Get current playback time (in seconds)
   */
  abstract getCurrentTime(): number;

  /**
   * Get video duration (in seconds)
   */
  abstract getDuration(): number;

  /**
   * Get buffered time ranges
   */
  abstract getBufferedRanges(): TimeRanges | null;

  /**
   * Set playback rate
   */
  abstract setPlaybackRate(rate: number): void;

  /**
   * Get playback rate
   */
  abstract getPlaybackRate(): number;

  /**
   * Check if video is paused
   */
  abstract isPaused(): boolean;

  /**
   * Check if video is ended
   */
  abstract isEnded(): boolean;
}

