"use client";

import React, { useEffect, useState } from "react";
import { useVideoItem } from "../../../providers/VideoItemProvider";
import { VideoItemState } from "../../../../engine/types";
import styles from "./PlayButton.module.scss";

interface PlayButtonProps {
  className?: string;
}

/**
 * PlayButton - Control component for play/pause functionality
 */
export function PlayButton({ className }: PlayButtonProps) {
  const videoItem = useVideoItem();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdBreak, setIsAdBreak] = useState(false);

  // Subscribe to state changes
  useEffect(() => {
    const handleStateChange = ({ state }: { state: VideoItemState }) => {
      setIsPlaying(state === VideoItemState.PLAYING);
      setIsLoading(
        state === VideoItemState.LOADING || state === VideoItemState.BUFFERING
      );
    };

    const handleAdBreakStarted = () => {
      setIsAdBreak(true);
    };

    const handleAdBreakEnded = () => {
      setIsAdBreak(false);
    };

    // Set initial state
    setIsPlaying(videoItem.getState() === VideoItemState.PLAYING);

    videoItem.on("STATE_CHANGED", handleStateChange);
    videoItem.on("AD_BREAK_STARTED", handleAdBreakStarted);
    videoItem.on("AD_BREAK_ENDED", handleAdBreakEnded);

    return () => {
      videoItem.off("STATE_CHANGED", handleStateChange);
      videoItem.off("AD_BREAK_STARTED", handleAdBreakStarted);
      videoItem.off("AD_BREAK_ENDED", handleAdBreakEnded);
    };
  }, [videoItem]);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Don't allow play/pause during ad breaks
    if (isAdBreak) {
      return;
    }

    try {
      if (isPlaying) {
        videoItem.pause();
      } else {
        await videoItem.play();
      }
    } catch (error) {
      // Silently handle errors - they're logged elsewhere
    }
  };

  // Hide button during ad breaks
  if (isAdBreak) {
    return null;
  }

  return (
    <button
      className={`${styles.playButton} ${className || ""}`}
      onClick={handleClick}
      disabled={isLoading}
      aria-label={isPlaying ? "Pause" : "Play"}
    >
      {isLoading ? (
        <span className={styles.loader}>⏳</span>
      ) : isPlaying ? (
        <span className={styles.icon}>⏸</span>
      ) : (
        <span className={styles.icon}>▶</span>
      )}
    </button>
  );
}
