"use client";

import React, { useEffect, useState } from "react";
import { useVideoItem } from "../../../providers/VideoItemProvider";
import styles from "./VolumeSlider.module.scss";

interface VolumeSliderProps {
  className?: string;
  showMuteButton?: boolean;
}

/**
 * VolumeSlider - Control component for volume and mute functionality
 */
export function VolumeSlider({
  className,
  showMuteButton = true,
}: VolumeSliderProps) {
  const videoItem = useVideoItem();
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isAdBreak, setIsAdBreak] = useState(false);

  // Subscribe to volume and mute changes
  useEffect(() => {
    // Get initial state from config (player manager might not be ready yet)
    const config = videoItem.getConfig();
    setVolume(config.volume ?? 1);
    setIsMuted(config.muted ?? false);

    const handleVolumeChange = ({ volume: newVolume }: { volume: number }) => {
      setVolume(newVolume);
    };

    const handleMuteChange = ({ muted }: { muted: boolean }) => {
      setIsMuted(muted);
    };

    const handleAdBreakStarted = () => {
      setIsAdBreak(true);
    };

    const handleAdBreakEnded = () => {
      setIsAdBreak(false);
    };

    videoItem.on("VOLUME_CHANGED", handleVolumeChange);
    videoItem.on("MUTE_CHANGED", handleMuteChange);
    videoItem.on("AD_BREAK_STARTED", handleAdBreakStarted);
    videoItem.on("AD_BREAK_ENDED", handleAdBreakEnded);

    return () => {
      videoItem.off("VOLUME_CHANGED", handleVolumeChange);
      videoItem.off("MUTE_CHANGED", handleMuteChange);
      videoItem.off("AD_BREAK_STARTED", handleAdBreakStarted);
      videoItem.off("AD_BREAK_ENDED", handleAdBreakEnded);
    };
  }, [videoItem]);


  const handleMuteToggle = () => {
    // Don't allow mute toggle during ad breaks
    if (isAdBreak) {
      return;
    }
    videoItem.setMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Don't allow volume change during ad breaks
    if (isAdBreak) {
      return;
    }
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    videoItem.setVolume(newVolume);
    if (isMuted && newVolume > 0) {
      videoItem.setMuted(false);
    }
  };

  // Hide controls during ad breaks
  if (isAdBreak) {
    return null;
  }

  return (
    <div className={`${styles.volumeSlider} ${className || ""}`}>
      {showMuteButton && (
        <button
          className={styles.muteButton}
          onClick={handleMuteToggle}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
        </button>
      )}
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={isMuted ? 0 : volume}
        onChange={handleVolumeChange}
        className={styles.slider}
        aria-label="Volume"
        disabled={isAdBreak}
      />
      <span className={styles.volumeValue}>
        {Math.round((isMuted ? 0 : volume) * 100)}%
      </span>
    </div>
  );
}

