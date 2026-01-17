import { VideoSourceConfig } from './VideoSourceConfig';

/**
 * Player type options
 */
export type PlayerType = 'videojs' | 'html5' | 'shaka';

/**
 * Initialization properties for VideoItem
 */
export interface VideoItemInitProps {
  // Identity
  id: string;
  trackingId?: string;

  // Source config
  videoId?: string;
  manifestId?: string;
  url?: string;
  source?: VideoSourceConfig;

  // Feature flags
  autoplay?: boolean;
  autoplayInViewport?: boolean;
  adsEnabled?: boolean;
  endscreenEnabled?: boolean;
  recommendationsEnabled?: boolean;
  chromecastEnabled?: boolean;
  airplayEnabled?: boolean;
  floatingEnabled?: boolean;


  // Initial player settings
  volume?: number;
  muted?: boolean;
  quality?: string;
  playbackRate?: number;

  // Data/analytics config
  dataEndpoint?: string;
  gemiusId?: string;
  metadata?: Record<string, unknown>;

  // Ad configuration - single VMAP URL containing all ad breaks
  adTagUrl?: string;
}

