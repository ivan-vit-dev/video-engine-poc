import { VideoItemInitProps } from './VideoItemInitProps';

/**
 * Resolved configuration for VideoItem (after initialization)
 */
export interface VideoItemConfig extends VideoItemInitProps {
  // All properties from InitProps, but with defaults resolved
  playerType: NonNullable<VideoItemInitProps['playerType']>;
  volume: number;
  muted: boolean;
}

