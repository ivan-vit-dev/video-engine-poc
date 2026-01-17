import { VideoItemInitProps } from './VideoItemInitProps';
import { PlayerType } from './index';

/**
 * Resolved configuration for VideoItem (after initialization)
 */
export interface VideoItemConfig extends VideoItemInitProps {
  // All properties from InitProps, but with defaults resolved
  // playerType is set from VideoEngine context, not from InitProps
  playerType: PlayerType;
  volume: number;
  muted: boolean;
}

