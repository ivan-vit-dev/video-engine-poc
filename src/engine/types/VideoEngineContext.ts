import { UserContext } from "./UserContext";
import { PlayerType } from "./VideoItemInitProps";

/**
 * Context data from VideoEngine passed to VideoItem during construction
 */
export interface VideoEngineContext {
  /**
   * Global volume value (0.0 to 1.0)
   */
  globalVolume: number;

  /**
   * Global mute state
   */
  globalMuted: boolean;

  /**
   * User context (premium status, userId, AB flags, etc.)
   */
  userContext: UserContext;

  /**
   * Global player type for the application
   */
  playerType: PlayerType;

  /**
   * Additional engine-level data that might be needed by VideoItem
   */
  [key: string]: unknown;
}

