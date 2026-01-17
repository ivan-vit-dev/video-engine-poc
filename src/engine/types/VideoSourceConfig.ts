/**
 * Video source configuration
 */
export interface VideoSourceConfig {
  videoId?: string;
  manifestId?: string;
  url?: string;
  type?: string;
  poster?: string;
  [key: string]: unknown;
}

