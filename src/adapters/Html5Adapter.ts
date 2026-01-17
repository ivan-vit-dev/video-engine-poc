import { VideoPlayerAdapter, PlayerAdapterEvents } from "./VideoPlayerAdapter";
import { VideoSourceConfig } from "../engine/types";

/**
 * Html5Adapter - Stub implementation for HTML5 video player
 * This is a placeholder for future implementation
 */
export class Html5Adapter extends VideoPlayerAdapter {
  private videoElement: HTMLVideoElement | null = null;

  mount(container: HTMLElement): void {
    if (this.videoElement) {
      this.destroy();
    }

    this.container = container;

    // Create HTML5 video element
    this.videoElement = document.createElement("video");
    this.videoElement.controls = false;
    container.appendChild(this.videoElement);

    this.setupEventListeners();
  }

  destroy(): void {
    if (this.videoElement) {
      this.videoElement.remove();
      this.videoElement = null;
    }
    this.container = null;
    this.source = null;
  }

  async loadSource(source: VideoSourceConfig): Promise<void> {
    if (!this.videoElement) {
      throw new Error("Player not mounted. Call mount() first.");
    }

    this.source = source;

    if (source.url) {
      this.videoElement.src = source.url;
      if (source.type) {
        // HTMLVideoElement doesn't have a type property, use setAttribute instead
        this.videoElement.setAttribute("type", source.type);
      }
    }

    if (source.poster) {
      this.videoElement.poster = source.poster;
    }

    // Wait for metadata
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout waiting for video to load"));
      }, 10000);

      const onLoadedMetadata = () => {
        clearTimeout(timeout);
        this.videoElement?.removeEventListener("loadedmetadata", onLoadedMetadata);
        this.videoElement?.removeEventListener("error", onError);
        resolve();
      };

      const onError = () => {
        clearTimeout(timeout);
        this.videoElement?.removeEventListener("loadedmetadata", onLoadedMetadata);
        this.videoElement?.removeEventListener("error", onError);
        reject(new Error("Failed to load video"));
      };

      this.videoElement?.addEventListener("loadedmetadata", onLoadedMetadata);
      this.videoElement?.addEventListener("error", onError);
    });
  }

  async play(): Promise<void> {
    if (!this.videoElement) {
      throw new Error("Player not initialized");
    }
    await this.videoElement.play();
  }

  pause(): void {
    this.videoElement?.pause();
  }

  seekTo(seconds: number): void {
    if (this.videoElement) {
      this.videoElement.currentTime = seconds;
    }
  }

  setVolume(volume: number): void {
    if (this.videoElement) {
      this.videoElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  getVolume(): number {
    return this.videoElement?.volume ?? 1;
  }

  setMuted(muted: boolean): void {
    if (this.videoElement) {
      this.videoElement.muted = muted;
    }
  }

  isMuted(): boolean {
    if (!this.videoElement) {
      return false;
    }
    return this.videoElement.muted;
  }

  getCurrentTime(): number {
    return this.videoElement?.currentTime || 0;
  }

  getDuration(): number {
    return this.videoElement?.duration || 0;
  }

  getBufferedRanges(): TimeRanges | null {
    return this.videoElement?.buffered || null;
  }

  setPlaybackRate(rate: number): void {
    if (this.videoElement) {
      this.videoElement.playbackRate = rate;
    }
  }

  getPlaybackRate(): number {
    return this.videoElement?.playbackRate || 1;
  }

  isPaused(): boolean {
    return this.videoElement?.paused ?? true;
  }

  isEnded(): boolean {
    return this.videoElement?.ended ?? false;
  }

  private setupEventListeners(): void {
    if (!this.videoElement) {
      return;
    }

    this.videoElement.addEventListener("play", () => {
      this.emit("play", {});
    });

    this.videoElement.addEventListener("pause", () => {
      this.emit("pause", {});
    });

    this.videoElement.addEventListener("ended", () => {
      this.emit("ended", {});
    });

    this.videoElement.addEventListener("error", () => {
      this.emit("error", {
        error: new Error("HTML5 video error"),
      });
    });

    this.videoElement.addEventListener("timeupdate", () => {
      this.emit("timeupdate", {
        currentTime: this.getCurrentTime(),
        duration: this.getDuration(),
      });
    });

    this.videoElement.addEventListener("seeking", () => {
      this.emit("seeking", {});
    });

    this.videoElement.addEventListener("seeked", () => {
      this.emit("seeked", {});
    });

    this.videoElement.addEventListener("volumechange", () => {
      this.emit("volumechange", {
        volume: this.videoElement?.volume || 0,
        muted: this.videoElement?.muted || false,
      });
    });

    this.videoElement.addEventListener("loadedmetadata", () => {
      this.emit("loadedmetadata", {
        duration: this.getDuration(),
      });
    });

    this.videoElement.addEventListener("canplay", () => {
      this.emit("canplay", {});
    });

    this.videoElement.addEventListener("waiting", () => {
      this.emit("waiting", {});
    });

    this.videoElement.addEventListener("playing", () => {
      this.emit("playing", {});
    });

    this.videoElement.addEventListener("ratechange", () => {
      this.emit("ratechange", {
        playbackRate: this.getPlaybackRate(),
      });
    });
  }
}

