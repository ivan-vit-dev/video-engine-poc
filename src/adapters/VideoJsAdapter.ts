import videojs from "video.js";
import "video.js/dist/video-js.css";
// Import videojs-contrib-ads immediately after video.js (required for IMA)
// This must be imported to register the plugin
import "videojs-contrib-ads";
import { VideoPlayerAdapter, PlayerAdapterEvents } from "./VideoPlayerAdapter";
import { VideoSourceConfig } from "../engine/types";

// Video.js types
type VideoJsPlayer = ReturnType<typeof videojs>;
type VideoJsPlayerOptions = Parameters<typeof videojs>[1];

/**
 * VideoJsAdapter - Implementation of VideoPlayerAdapter using video.js
 */
export class VideoJsAdapter extends VideoPlayerAdapter {
  private player: VideoJsPlayer | null = null;

  mount(container: HTMLElement): void {
    if (this.player) {
      this.destroy();
    }

    this.container = container;

    // Create video.js player options
    const options: VideoJsPlayerOptions = {
      controls: false, // We'll handle controls via React
      autoplay: false, // We handle autoplay manually after source loads
      preload: "auto",
      fluid: false,
      responsive: false,
      width: "100%",
      height: "100%",
    };

    // Clear container first to ensure clean mount
    container.innerHTML = "";

    // Create video element
    const videoElement = document.createElement("video");
    videoElement.className = "video-js vjs-default-skin";
    videoElement.setAttribute("playsinline", "true");
    videoElement.setAttribute("webkit-playsinline", "true");
    videoElement.style.width = "100%";
    videoElement.style.height = "100%";
    videoElement.style.display = "block";
    videoElement.style.position = "absolute";
    videoElement.style.top = "0";
    videoElement.style.left = "0";

    container.appendChild(videoElement);

    // Initialize video.js player
    this.player = videojs(videoElement, options, () => {
      // Initialize videojs-contrib-ads immediately after player creation
      // This MUST happen before any source is loaded (in the same tick)
      // The IMA plugin will work with the already-initialized ads plugin
      console.log(
        "[VideoJsAdapter] Player ready callback, initializing ads plugin..."
      );
      const player = this.player as any;
      if (this.player && typeof player.ads === "function") {
        try {
          // Call ads() synchronously - this is critical for proper initialization
          player.ads();
          console.log("[VideoJsAdapter] Ads plugin initialized successfully");
        } catch (error) {
          if (error instanceof Error) {
            console.error(
              "[VideoJsAdapter] Error initializing ads plugin:",
              error
            );
          }
        }
      } else {
        console.warn("[VideoJsAdapter] ads() function not available on player");
      }

      // Ensure player fills container after initialization
      if (this.player) {
        const playerEl = this.player.el();
        if (playerEl) {
          // Video.js wraps the video in a div, style that wrapper
          (playerEl as HTMLElement).style.width = "100%";
          (playerEl as HTMLElement).style.height = "100%";
          (playerEl as HTMLElement).style.position = "absolute";
          (playerEl as HTMLElement).style.top = "0";
          (playerEl as HTMLElement).style.left = "0";

          // Get the actual video element inside
          const videoEl = playerEl.querySelector("video");
          if (videoEl) {
            videoEl.style.width = "100%";
            videoEl.style.height = "100%";
            videoEl.style.display = "block";
          }
        }
      }
      this.setupEventListeners();
    });
  }

  /**
   * Get the video.js player instance (for IMA integration)
   */
  getPlayer(): VideoJsPlayer | null {
    return this.player;
  }

  destroy(): void {
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }
    this.container = null;
    this.source = null;
  }

  async loadSource(source: VideoSourceConfig): Promise<void> {
    if (!this.player) {
      throw new Error("Player not mounted. Call mount() first.");
    }

    this.source = source;

    // Prepare sources array for video.js
    const sources: Array<{ src: string; type?: string }> = [];

    // Auto-detect HLS if URL ends with .m3u8 or determine type
    let detectedType = source.type;
    const isHLS = source.url?.includes(".m3u8") || false;

    if (!detectedType && isHLS) {
      detectedType = "application/x-mpegURL"; // HLS MIME type
    }

    if (source.url) {
      sources.push({
        src: source.url,
        type: detectedType,
      });
    }

    // Set poster if available
    if (source.poster) {
      this.player.poster(source.poster);
    }

    // Load sources
    if (sources.length > 0) {
      this.player.src(sources);
    } else {
      throw new Error("No valid video source provided");
    }

    // Wait for video to be ready
    // For HLS streams, we can resolve once loading starts (they load progressively)
    // For regular videos, we wait for 'loadedmetadata'
    return new Promise((resolve, reject) => {
      let resolved = false;
      let loadStarted = false;

      const timeout = setTimeout(
        () => {
          if (!resolved) {
            cleanup();
            // For HLS, if loading has started and no error, resolve anyway
            // HLS streams load progressively and might not fire all events immediately
            if (isHLS && loadStarted && this.player && !this.player.error()) {
              resolved = true;
              resolve();
            } else {
              reject(new Error("Timeout waiting for video to load"));
            }
          }
        },
        isHLS ? 60000 : 20000
      ); // Much longer timeout for HLS (60s)

      const cleanup = () => {
        if (resolved) return;
        clearTimeout(timeout);
        this.player?.off("loadedmetadata", onLoadedMetadata);
        this.player?.off("loadeddata", onLoadedData);
        this.player?.off("canplay", onCanPlay);
        this.player?.off("loadstart", onLoadStart);
        this.player?.off("error", onError);
      };

      const resolveOnce = () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve();
      };

      const onLoadedMetadata = () => {
        if (!isHLS) {
          // For regular videos, loadedmetadata is sufficient
          resolveOnce();
        }
      };

      const onLoadedData = () => {
        // For HLS, loadeddata indicates the stream is ready
        if (isHLS) {
          resolveOnce();
        }
      };

      const onCanPlay = () => {
        // canplay works for both HLS and regular videos
        resolveOnce();
      };

      const onLoadStart = () => {
        // For HLS, loadstart means the manifest is being fetched
        // Mark that loading has started
        loadStarted = true;

        // For HLS, we can resolve once loading starts (progressive loading)
        // But wait a bit to see if we get a better event
        if (isHLS) {
          // Give it a moment to see if canplay/loadeddata fires
          setTimeout(() => {
            if (
              !resolved &&
              loadStarted &&
              this.player &&
              !this.player.error()
            ) {
              resolveOnce();
            }
          }, 2000); // Wait 2 seconds after loadstart for HLS
        }
      };

      const onError = () => {
        cleanup();
        const errorMessage = this.player?.error();
        reject(
          new Error(
            errorMessage
              ? `Failed to load video: ${
                  errorMessage.message || "Unknown error"
                }`
              : "Failed to load video"
          )
        );
      };

      // Listen to appropriate events based on stream type
      if (isHLS) {
        // For HLS, wait for canplay, loadeddata, or loadstart
        this.player?.on("canplay", onCanPlay);
        this.player?.on("loadeddata", onLoadedData);
        this.player?.on("loadstart", onLoadStart); // Track loading start
      } else {
        // For regular videos, wait for loadedmetadata
        this.player?.on("loadedmetadata", onLoadedMetadata);
        this.player?.on("canplay", onCanPlay); // Fallback
      }
      this.player?.on("error", onError);
    });
  }

  async play(): Promise<void> {
    console.log("[VideoJsAdapter] play() called");
    if (!this.player) {
      console.error("[VideoJsAdapter] Player not initialized");
      throw new Error("Player not initialized");
    }

    console.log("[VideoJsAdapter] Player ready, calling player.play()");
    // Simple: just play. No checks, no delays.
    const playPromise = this.player.play();
    if (playPromise !== undefined) {
      await playPromise;
      console.log("[VideoJsAdapter] player.play() promise resolved");
    } else {
      console.log("[VideoJsAdapter] player.play() returned undefined");
    }
  }

  pause(): void {
    if (!this.player) {
      return;
    }
    this.player.pause();
  }

  seekTo(seconds: number): void {
    if (!this.player) {
      return;
    }
    this.player.currentTime(seconds);
  }

  setVolume(volume: number): void {
    if (!this.player) {
      return;
    }
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.player.volume(clampedVolume);
  }

  getVolume(): number {
    if (!this.player) {
      return 1;
    }
    return this.player.volume() || 1;
  }

  setMuted(muted: boolean): void {
    if (!this.player) {
      return;
    }
    this.player.muted(muted);
  }

  isMuted(): boolean {
    if (!this.player) {
      return false;
    }
    return this.player.muted() || false;
  }

  getCurrentTime(): number {
    if (!this.player) {
      return 0;
    }
    return this.player.currentTime() || 0;
  }

  getDuration(): number {
    if (!this.player) {
      return 0;
    }
    return this.player.duration() || 0;
  }

  getBufferedRanges(): TimeRanges | null {
    if (!this.player) {
      return null;
    }
    return this.player.buffered();
  }

  setPlaybackRate(rate: number): void {
    if (!this.player) {
      return;
    }
    this.player.playbackRate(rate);
  }

  getPlaybackRate(): number {
    if (!this.player) {
      return 1;
    }
    return this.player.playbackRate() || 1;
  }

  isPaused(): boolean {
    if (!this.player) {
      return true;
    }
    return this.player.paused();
  }

  isEnded(): boolean {
    if (!this.player) {
      return false;
    }
    return this.player.ended();
  }

  /**
   * Set up event listeners to map video.js events to adapter events
   */
  private setupEventListeners(): void {
    if (!this.player) {
      return;
    }

    // Map video.js events to adapter events
    this.player.on("play", () => {
      // Emit play event - ads plugins will handle ad breaks automatically
      // We don't need to filter here, the plugins manage the flow
      this.emit("play", {});
    });

    this.player.on("pause", () => {
      this.emit("pause", {});
    });

    this.player.on("ended", () => {
      this.emit("ended", {});
    });

    this.player.on("error", () => {
      const error = this.player?.error();
      this.emit("error", {
        error: error
          ? new Error(error.message || "Video.js error")
          : new Error("Unknown video.js error"),
      });
    });

    this.player.on("timeupdate", () => {
      this.emit("timeupdate", {
        currentTime: this.getCurrentTime(),
        duration: this.getDuration(),
      });
    });

    this.player.on("seeking", () => {
      this.emit("seeking", {});
    });

    this.player.on("seeked", () => {
      this.emit("seeked", {});
    });

    this.player.on("volumechange", () => {
      this.emit("volumechange", {
        volume: this.player?.volume() || 0,
        muted: this.player?.muted() || false,
      });
    });

    this.player.on("loadedmetadata", () => {
      this.emit("loadedmetadata", {
        duration: this.getDuration(),
      });
    });

    this.player.on("canplay", () => {
      this.emit("canplay", {});
    });

    this.player.on("waiting", () => {
      this.emit("waiting", {});
    });

    this.player.on("playing", () => {
      // playing event means video is actually playing (not just play() was called)
      this.emit("playing", {});
      // Also emit play event to ensure state is updated
      this.emit("play", {});
    });

    this.player.on("ratechange", () => {
      this.emit("ratechange", {
        playbackRate: this.getPlaybackRate(),
      });
    });
  }
}
