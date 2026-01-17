"use client";

import { Player } from "../../../react/components/Player";
import {
  PlayButton,
  VolumeSlider,
  Timeline,
} from "../../../react/components/controls";
import styles from "./VideoPlayer.module.scss";

interface VideoPlayerProps {
  id: string;
  url: string;
  autoplay?: boolean;
  className?: string;
  adsEnabled?: boolean;
  adTagUrl?: string; // Single VMAP URL containing all ad breaks
}

/**
 * VideoPlayer - Complete video player component with controls
 * Wraps the Player component and includes all player controls
 */
export function VideoPlayer({
  id,
  url,
  autoplay = true,
  className,
  adsEnabled,
  adTagUrl,
}: VideoPlayerProps) {
  return (
    <div className={`${styles.playerWrapper} ${className || ""}`}>
      <Player
        id={id}
        url={url}
        autoplay={autoplay}
        className={styles.player}
        adsEnabled={adsEnabled}
        adTagUrl={adTagUrl}
      >
        <div className={styles.controls}>
          <PlayButton />
          <Timeline />
          <VolumeSlider />
        </div>
      </Player>
    </div>
  );
}
