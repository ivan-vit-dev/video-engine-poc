import { VideoItem, VideoItemEvents } from "../engine/VideoItem";
import { VideoEngine } from "../engine/VideoEngine";
import { VideoJsAdapter } from "../adapters/VideoJsAdapter";
// Import videojs-ima at module level to ensure it's registered
// Note: videojs-contrib-ads is imported in VideoJsAdapter where player is created
import "videojs-ima";

/**
 * Configuration for AdvertisementManager
 */
export interface AdvertisementManagerConfig {
  enabled?: boolean;
  imaScriptUrl?: string;
  adTagUrl?: string; // Single VMAP URL containing all ad breaks (pre-roll, mid-roll, post-roll)
  metadata?: Record<string, unknown>;
}

/**
 * AdvertisementManager - Handles IMA SDK integration and ad breaks
 */
export class AdvertisementManager {
  private videoItem: VideoItem;
  private config: AdvertisementManagerConfig;
  private disposed: boolean = false;
  private imaLoaded: boolean = false;
  private adBreakActive: boolean = false;
  private imaPlugin: any = null;
  private videoJsPlayer: any = null;

  constructor(videoItem: VideoItem, config: AdvertisementManagerConfig = {}) {
    this.videoItem = videoItem;
    this.config = {
      enabled: true,
      ...config,
    };
    this.setupEventListeners();
    // Initialize IMA asynchronously without blocking
    // Don't await - let it initialize in the background
    this.initializeIMA().catch(() => {
      // Silently fail - ads are optional, don't block playback
    });
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    this.videoItem.on("PLAY", this.handlePlay.bind(this));
    this.videoItem.on("PAUSE", this.handlePause.bind(this));
    this.videoItem.on("ENDED", this.handleEnded.bind(this));
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    this.videoItem.off("PLAY", this.handlePlay);
    this.videoItem.off("PAUSE", this.handlePause);
    this.videoItem.off("ENDED", this.handleEnded);
    this.videoItem.off("TIME_UPDATE", this.handleTimeUpdate);
  }

  /**
   * Handle time update - IMA SDK handles mid-roll automatically from VMAP
   */
  private handleTimeUpdate(_payload: VideoItemEvents["TIME_UPDATE"]): void {
    // IMA SDK automatically handles mid-roll ads based on VMAP timing
    // No manual intervention needed
  }

  /**
   * Initialize IMA SDK
   */
  private async initializeIMA(): Promise<void> {
    if (!this.config.enabled) {
      console.log("[AdvertisementManager] Ads disabled, skipping initialization");
      return;
    }

    if (!this.config.adTagUrl) {
      console.log("[AdvertisementManager] No adTagUrl provided, skipping initialization");
      return;
    }

    try {
      console.log("[AdvertisementManager] Starting IMA initialization...");
      // Load IMA SDK via VideoEngine
      const engine = VideoEngine.getInstance();
      await engine.ensureExternalScript("ima");
      console.log("[AdvertisementManager] IMA SDK loaded");

      // Wait for video.js player to be ready
      await this.waitForPlayer();
      console.log("[AdvertisementManager] Player ready, setting up IMA plugin");

      // Initialize videojs-ima plugin
      this.setupIMA();
      this.imaLoaded = true;
      console.log("[AdvertisementManager] IMA initialization complete");
    } catch (error) {
      if (error instanceof Error) {
        console.error("[AdvertisementManager] Error initializing IMA:", error);
      }
    }
  }

  /**
   * Wait for video.js player to be ready
   */
  private async waitForPlayer(): Promise<void> {
    const maxAttempts = 100; // Increased from 50 to 100 (10 seconds total)
    let attempts = 0;

    while (attempts < maxAttempts) {
      const playerManager = this.videoItem.getPlayerManager();
      if (playerManager) {
        const adapter = playerManager.getAdapter();
        if (adapter instanceof VideoJsAdapter) {
          const player = adapter.getPlayer();
          if (player) {
            // Check if player is ready (readyState >= 1 means it has metadata)
            const readyState = (player as any).readyState();
            if (readyState >= 1) {
              console.log("[AdvertisementManager] waitForPlayer: Got player, checking ads()...");
              const playerAny = player as any;
              console.log("[AdvertisementManager] waitForPlayer: typeof player.ads =", typeof playerAny.ads);
              console.log("[AdvertisementManager] waitForPlayer: player.id() =", playerAny.id?.());
              console.log("[AdvertisementManager] waitForPlayer: player.readyState() =", readyState);
              this.videoJsPlayer = player;
              return;
            } else {
              console.log(`[AdvertisementManager] waitForPlayer: Player not ready yet (readyState=${readyState}), waiting...`);
            }
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    throw new Error("Video.js player not available for IMA integration");
  }

  /**
   * Set up IMA plugin with video.js
   */
  private setupIMA(): void {
    console.log("[AdvertisementManager] setupIMA: Called");
    if (!this.videoJsPlayer || typeof window === "undefined") {
      console.warn("[AdvertisementManager] setupIMA: videoJsPlayer or window not available");
      return;
    }

    console.log("[AdvertisementManager] setupIMA: Starting IMA plugin setup");
    console.log("[AdvertisementManager] setupIMA: adTagUrl =", this.config.adTagUrl);

    // Wait for player to be ready and ads plugin to be available
    let retryCount = 0;
    const maxRetries = 50; // Max 5 seconds of retries

    const initIMA = () => {
      retryCount++;
      if (retryCount > maxRetries) {
        console.error("[AdvertisementManager] setupIMA: Max retries reached, giving up");
        return;
      }

      if (!this.videoJsPlayer || !this.config.adTagUrl) {
        console.warn("[AdvertisementManager] setupIMA: videoJsPlayer or adTagUrl not available");
        return;
      }

      // Check that ads plugin is available and initialized
      const player = this.videoJsPlayer as any;
      console.log(`[AdvertisementManager] setupIMA: Checking player.ads (attempt ${retryCount})...`);
      console.log(`[AdvertisementManager] setupIMA: typeof player.ads =`, typeof player.ads);
      console.log(`[AdvertisementManager] setupIMA: player.id() =`, player?.id?.());
      console.log(`[AdvertisementManager] setupIMA: player.readyState() =`, player?.readyState?.());
      
      // Check if ads is available - it can be either:
      // 1. A function (to initialize): typeof player.ads === "function"
      // 2. An object (already initialized): typeof player.ads === "object" (after player.ads() was called)
      const hasAdsPlugin = typeof player.ads === "function" || (typeof player.ads === "object" && player.ads !== null);
      
      if (!hasAdsPlugin) {
        console.log(`[AdvertisementManager] setupIMA: ads plugin not available (attempt ${retryCount}), retrying...`);
        setTimeout(() => {
          initIMA();
        }, 100);
        return;
      }
      
      console.log(`[AdvertisementManager] setupIMA: ads plugin found!`);

      // If ads is a function, we need to call it to initialize
      if (typeof player.ads === "function") {
        console.log(`[AdvertisementManager] setupIMA: Initializing ads plugin (attempt ${retryCount})...`);
        player.ads();
        // Wait a bit for ads to initialize
        setTimeout(() => {
          initIMA();
        }, 50);
        return;
      }
      
      // The IMA plugin expects player.ads to be a function it can call
      // But videojs-contrib-ads requires initialization before source loads
      // So we initialize it in VideoJsAdapter, which makes it an object
      // The IMA plugin should work with the already-initialized ads plugin object
      // If ads is still a function, initialize it now
      if (typeof player.ads === "function") {
        console.log(`[AdvertisementManager] setupIMA: Initializing ads plugin...`);
        try {
          player.ads();
          console.log(`[AdvertisementManager] setupIMA: Ads plugin initialized successfully`);
        } catch (error) {
          if (error instanceof Error) {
            console.error(`[AdvertisementManager] setupIMA: Error initializing ads plugin:`, error);
          }
        }
      } else if (typeof player.ads === "object" && player.ads !== null) {
        console.log(`[AdvertisementManager] setupIMA: ads plugin already initialized (object)`);
        // IMA plugin should work with the already-initialized ads plugin
      } else {
        console.warn(`[AdvertisementManager] setupIMA: ads plugin not available`);
        // Continue anyway - IMA might still work
      }

      // Check that IMA plugin is available
      if (typeof player.ima !== "function") {
        console.log(`[AdvertisementManager] setupIMA: IMA plugin not available yet (attempt ${retryCount}), retrying...`);
        // ima() is not available yet, retry
        setTimeout(() => {
          initIMA();
        }, 100);
        return;
      }

      console.log("[AdvertisementManager] setupIMA: IMA plugin available, initializing...");

      // Configure IMA options
      // Note: Do NOT pass 'id' - let IMA plugin use the player directly
      // The ads plugin is already initialized, so IMA should work with it
      const adsRenderingSettings = new (
        window as any
      ).google.ima.AdsRenderingSettings();
      
      // Set muted autoplay for ads to comply with browser autoplay policies
      // This allows ads to play automatically when the video is muted
      adsRenderingSettings.enablePreloading = true;
      
      const imaOptions = {
        adTagUrl: this.config.adTagUrl,
        adsRenderingSettings: adsRenderingSettings,
        autoPlayAdBreaks: true, // Enable auto-play for ad breaks
        // Ensure ads respect muted state
        disableAdControls: false,
      };
      
      console.log("[AdvertisementManager] IMA options:", imaOptions);

      // Initialize IMA plugin
      // The IMA plugin's constructor tries to call player.ads() but it's already an object
      // We need to work around this by ensuring the ads plugin is accessible
      try {
        console.log("[AdvertisementManager] Initializing IMA plugin with adTagUrl:", this.config.adTagUrl);
        console.log("[AdvertisementManager] player.ads type before IMA init:", typeof player.ads);
        
        // Store the ads plugin instance
        const adsPluginInstance = player.ads;
        
        // Temporarily restore ads as a function that returns the instance
        // This allows IMA plugin to "initialize" it even though it's already initialized
        if (typeof adsPluginInstance === "object" && adsPluginInstance !== null) {
          (player as any).ads = function() {
            return adsPluginInstance;
          };
        }
        
        this.imaPlugin = player.ima(imaOptions);
        
        // Restore the ads plugin instance
        if (adsPluginInstance) {
          (player as any).ads = adsPluginInstance;
        }
        
        console.log("[AdvertisementManager] IMA plugin initialized successfully");
        console.log("[AdvertisementManager] this.imaPlugin =", this.imaPlugin);
        console.log("[AdvertisementManager] player.ima =", player.ima);

        // Ensure player is muted for autoplay compliance (ads will inherit this)
        // This is critical - ads must play muted to avoid browser autoplay blocking
        if (player.muted && typeof player.muted === "function") {
          const isMuted = player.muted();
          if (!isMuted) {
            console.log("[AdvertisementManager] Player is not muted - muting for autoplay compliance");
            player.muted(true);
          } else {
            console.log("[AdvertisementManager] Player is already muted - good for autoplay");
          }
        }

        // Set up IMA event listeners FIRST
        // This ensures we catch the ads-manager-loaded event
        this.setupIMAEventListeners();
        
        // Monitor for any video elements that get added (IMA might create its own)
        // Use MutationObserver to catch when IMA adds ad video elements
        if (typeof MutationObserver !== "undefined") {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                  const element = node as HTMLElement;
                  // Check if it's a video element or contains one
                  if (element.tagName === "VIDEO") {
                    const videoEl = element as HTMLVideoElement;
                    if (player.muted && typeof player.muted === "function" && player.muted()) {
                      videoEl.muted = true;
                      console.log("[AdvertisementManager] Set newly added video element muted");
                    }
                  } else {
                    const videoEl = element.querySelector("video") as HTMLVideoElement;
                    if (videoEl && player.muted && typeof player.muted === "function" && player.muted()) {
                      videoEl.muted = true;
                      console.log("[AdvertisementManager] Set video element in added node muted");
                    }
                  }
                }
              });
            });
          });
          
          // Observe the player container for new video elements
          const playerEl = player.el();
          if (playerEl) {
            observer.observe(playerEl, {
              childList: true,
              subtree: true,
            });
            console.log("[AdvertisementManager] Set up MutationObserver to monitor for ad video elements");
          }
        }

        // Don't request ads immediately - wait for ads-manager-loaded event
        // The ads-manager-loaded event handler will call requestAds()
        // This ensures the ads manager is ready before we request ads
        console.log("[AdvertisementManager] IMA plugin initialized, waiting for ads-manager-loaded event...");
      } catch (error) {
        // Error initializing IMA
        if (error instanceof Error) {
          console.error("[AdvertisementManager] Error initializing IMA:", error);
        }
      }
    };

    // Check if player is already ready
    const readyState = this.videoJsPlayer.readyState();
    console.log(`[AdvertisementManager] setupIMA: Player readyState = ${readyState}`);
    
    if (readyState >= 1) {
      // Player is ready, initialize IMA
      console.log("[AdvertisementManager] setupIMA: Player ready, starting initIMA");
      initIMA();
    } else {
      // Wait for player ready event
      console.log("[AdvertisementManager] setupIMA: Waiting for player ready event");
      this.videoJsPlayer.ready(() => {
        console.log("[AdvertisementManager] setupIMA: Player ready event fired, starting initIMA");
        initIMA();
      });
    }
  }

  /**
   * Set up IMA event listeners
   */
  private setupIMAEventListeners(): void {
    if (!this.imaPlugin || !this.videoJsPlayer) {
      return;
    }

    const player = this.videoJsPlayer as any;

    // Listen to events on both the plugin and the player
    // videojs-ima emits events on the player, not the plugin
    this.imaPlugin.on("ads-manager-loaded", () => {
      console.log("[AdvertisementManager] ads-manager-loaded event fired on plugin");
      // Ads manager loaded, ready to request ads
      // Request ads once - IMA will handle all breaks from VMAP
      // Only request if adTagUrl is provided
      if (this.config.adTagUrl) {
        console.log("[AdvertisementManager] Requesting ads from ads-manager-loaded event");
        this.requestAds();
      } else {
        console.warn("[AdvertisementManager] No adTagUrl provided, cannot request ads");
      }
    });

    // Also listen on the player - videojs-ima emits events on the player
    // Try multiple event names - different versions use different names
    const managerLoadedEvents = ["ads-manager-loaded", "ads-manager", "adsready"];
    managerLoadedEvents.forEach((eventName) => {
      player.on(eventName, (...args: any[]) => {
        console.log(`[AdvertisementManager] ${eventName} event fired on player`, args);
        if (this.config.adTagUrl) {
          console.log(`[AdvertisementManager] Requesting ads from ${eventName} event`);
          // If args[0] contains adsManager, store it and ensure muted state
          if (args[0] && args[0].adsManager) {
            console.log("[AdvertisementManager] Found adsManager in event args");
            // Ensure video is muted for autoplay compliance
            if (player.muted && typeof player.muted === "function" && player.muted()) {
              try {
                const videoElement = player.el().querySelector("video") as HTMLVideoElement;
                if (videoElement) {
                  videoElement.muted = true;
                  console.log("[AdvertisementManager] Set video muted when ads manager loaded");
                }
              } catch (e) {
                console.warn("[AdvertisementManager] Could not set video muted:", e);
              }
            }
          }
          this.requestAds();
        }
      });
    });

    // Listen to events on the player (videojs-ima emits on player, not plugin)
    const setupPlayerEvent = (eventName: string, handler: (...args: any[]) => void) => {
      player.on(eventName, handler);
      // Also try on plugin in case it works
      if (this.imaPlugin && typeof this.imaPlugin.on === "function") {
        this.imaPlugin.on(eventName, handler);
      }
    };

    setupPlayerEvent("content-playback-started", () => {
      console.log("[AdvertisementManager] content-playback-started event fired");
      // Content started playing - ensure ads are requested if not already
      if (this.config.adTagUrl && !this.adBreakActive) {
        // Ads should already be requested, but check anyway
      }
    });

    setupPlayerEvent("ads-request", () => {
      console.log("[AdvertisementManager] ads-request event fired");
      // Ensure video is muted before ad starts (for autoplay compliance)
      if (player.muted && typeof player.muted === "function" && player.muted()) {
        try {
          const videoElement = player.el().querySelector("video") as HTMLVideoElement;
          if (videoElement) {
            videoElement.muted = true;
            console.log("[AdvertisementManager] Set video muted before ad request");
          }
        } catch (e) {
          console.warn("[AdvertisementManager] Could not set video muted:", e);
        }
      }
      this.adBreakActive = true;
      this.videoItem.emit("AD_BREAK_STARTED", {});
    });

    setupPlayerEvent("ads-ad-started", () => {
      console.log("[AdvertisementManager] ads-ad-started event fired - ad is playing!");
      // Ensure ad is muted if player is muted (for autoplay compliance)
      if (player.muted && player.muted()) {
        console.log("[AdvertisementManager] Player is muted, ensuring ad is muted");
        // The ad should already be muted, but ensure it
        try {
          const videoElement = player.el().querySelector("video") as HTMLVideoElement;
          if (videoElement) {
            videoElement.muted = true;
          }
        } catch (error) {
          console.warn("[AdvertisementManager] Could not set ad muted:", error);
        }
      }
    });

    setupPlayerEvent("ads-ad-ended", () => {
      console.log("[AdvertisementManager] ads-ad-ended event fired");
    });

    setupPlayerEvent("ads-all-ads-completed", () => {
      console.log("[AdvertisementManager] ads-all-ads-completed event fired");
      this.adBreakActive = false;
      this.videoItem.emit("AD_BREAK_ENDED", {});
    });

    setupPlayerEvent("ads-error", (error: any) => {
      console.error("[AdvertisementManager] ads-error event fired:", error);
      // Check if it's an autoplay error (error code 1205)
      if (error && error.getErrorCode && error.getErrorCode() === 1205) {
        console.warn("[AdvertisementManager] Autoplay error detected (1205) - ad blocked by browser autoplay policy");
        console.warn("[AdvertisementManager] This happens when ads try to play unmuted without user interaction");
        console.warn("[AdvertisementManager] Player muted state:", player.muted ? player.muted() : "unknown");
        // Try to ensure the video element is muted
        try {
          const videoElement = player.el().querySelector("video") as HTMLVideoElement;
          if (videoElement) {
            videoElement.muted = true;
            console.log("[AdvertisementManager] Set video element muted to true");
          }
        } catch (e) {
          console.warn("[AdvertisementManager] Could not set video muted:", e);
        }
      }
      this.adBreakActive = false;
      this.videoItem.emit("AD_BREAK_ENDED", {});
    });

    // Log all player events that contain "ads" to debug
    // videojs-ima emits events on the player, so we listen there
    const adEventNames = [
      "ads-manager-loaded",
      "ads-request",
      "ads-ad-started",
      "ads-ad-ended",
      "ads-all-ads-completed",
      "ads-error",
      "content-playback-started",
      "content-pause-requested",
      "content-resume-requested",
    ];

    // Log when any ad-related event fires
    adEventNames.forEach((eventName) => {
      player.on(eventName, (...args: any[]) => {
        console.log(`[AdvertisementManager] Player event '${eventName}' fired`, args);
      });
    });

    // Also try to catch any event with "ads" in the name
    // This is a fallback to see what events are actually being fired
    const allEvents: string[] = [];
    const originalOn = player.on.bind(player);
    player.on = function(eventName: string, handler: any) {
      if (eventName && eventName.includes("ads")) {
        allEvents.push(eventName);
        console.log(`[AdvertisementManager] Event listener registered: ${eventName}`);
      }
      return originalOn(eventName, handler);
    };
  }

  /**
   * Handle play event - IMA will automatically handle pre-roll from VMAP
   */
  private handlePlay(_payload: VideoItemEvents["PLAY"]): void {
    // IMA SDK will automatically handle ad breaks from VMAP
    // But we should ensure ads are requested if not already
    if (this.imaPlugin && this.config.adTagUrl && !this.adBreakActive) {
      // Try to request ads if they haven't been requested yet
      // This is a fallback in case ads-manager-loaded didn't fire
      try {
        this.requestAds();
      } catch (error) {
        // Ads might already be requested, ignore error
      }
    }
  }

  /**
   * Handle pause event - pause ads if playing
   */
  private handlePause(_payload: VideoItemEvents["PAUSE"]): void {
    if (!this.config.enabled || !this.adBreakActive) {
      return;
    }

    // In production, this would pause the ad
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      // eslint-disable-next-line no-console
      console.log("[AdvertisementManager] Pause event - pausing ad");
    }
  }

  /**
   * Handle ended event - IMA will automatically handle post-roll from VMAP
   */
  private handleEnded(_payload: VideoItemEvents["ENDED"]): void {
    // IMA SDK will automatically handle post-roll from VMAP
    // No need to manually trigger
  }

  /**
   * Request ads from IMA SDK (called once with VMAP URL)
   */
  private requestAds(): void {
    // Check if IMA plugin is available via player.ima
    const player = this.videoJsPlayer as any;
    if (!player || !player.ima) {
      console.warn("[AdvertisementManager] Cannot request ads: IMA plugin not available on player");
      return;
    }

    if (!this.config.adTagUrl) {
      console.warn("[AdvertisementManager] Cannot request ads: No adTagUrl provided");
      return;
    }

    try {
      console.log("[AdvertisementManager] Calling requestAds() with URL:", this.config.adTagUrl);
      console.log("[AdvertisementManager] player.ima type:", typeof player.ima);
      console.log("[AdvertisementManager] player.ima.requestAds type:", typeof player.ima.requestAds);
      console.log("[AdvertisementManager] this.imaPlugin:", this.imaPlugin);
      console.log("[AdvertisementManager] this.imaPlugin.requestAds type:", typeof this.imaPlugin?.requestAds);
      
      // Try multiple ways to request ads
      // Method 1: via player.ima.requestAds()
      if (typeof player.ima.requestAds === "function") {
        console.log("[AdvertisementManager] Calling player.ima.requestAds()");
        player.ima.requestAds();
        console.log("[AdvertisementManager] player.ima.requestAds() called successfully");
        return;
      }
      
      // Method 2: via this.imaPlugin.requestAds()
      if (this.imaPlugin && typeof this.imaPlugin.requestAds === "function") {
        console.log("[AdvertisementManager] Calling this.imaPlugin.requestAds()");
        this.imaPlugin.requestAds();
        console.log("[AdvertisementManager] this.imaPlugin.requestAds() called successfully");
        return;
      }
      
      // Method 3: Check if there's an adsManager property
      if (this.imaPlugin && this.imaPlugin.adsManager) {
        console.log("[AdvertisementManager] Found adsManager, trying to request ads via adsManager");
        // This shouldn't be needed for VMAP, but let's try
      }
      
      console.error("[AdvertisementManager] Could not find requestAds method!");
      console.log("[AdvertisementManager] Available methods on player.ima:", Object.keys(player.ima || {}));
      if (this.imaPlugin) {
        console.log("[AdvertisementManager] Available methods on this.imaPlugin:", Object.keys(this.imaPlugin || {}));
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("[AdvertisementManager] Error requesting ads:", error);
        console.error("[AdvertisementManager] Error stack:", error.stack);
      }
    }
  }

  /**
   * Start an ad break
   */
  startAdBreak(): void {
    if (!this.config.enabled || !this.imaLoaded) {
      return;
    }

    this.adBreakActive = true;
    this.videoItem.emit("AD_BREAK_STARTED", {});

    // In production, this would request ads from IMA SDK
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      // eslint-disable-next-line no-console
      console.log("[AdvertisementManager] Ad break started");
    }
  }

  /**
   * End an ad break
   */
  endAdBreak(): void {
    if (!this.adBreakActive) {
      return;
    }

    this.adBreakActive = false;
    this.videoItem.emit("AD_BREAK_ENDED", {});

    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      // eslint-disable-next-line no-console
      console.log("[AdvertisementManager] Ad break ended");
    }
  }

  /**
   * Check if ad break is active
   */
  isAdBreakActive(): boolean {
    return this.adBreakActive;
  }

  /**
   * Dispose the manager
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    if (this.imaPlugin && this.videoJsPlayer) {
      try {
        this.videoJsPlayer.ima.destroy();
      } catch (error) {
        // Error destroying IMA plugin
      }
    }

    this.removeEventListeners();
    this.imaPlugin = null;
    this.videoJsPlayer = null;
    this.disposed = true;
  }
}
