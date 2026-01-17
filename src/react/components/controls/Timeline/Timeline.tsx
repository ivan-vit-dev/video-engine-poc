"use client";

import React, { useEffect, useState } from "react";
import { useVideoItem } from "../../../providers/VideoItemProvider";
import styles from "./Timeline.module.scss";

interface TimelineProps {
  className?: string;
  showTime?: boolean;
}

/**
 * Timeline - Control component for video progress and seeking
 */
export function Timeline({ className, showTime = true }: TimelineProps) {
  const videoItem = useVideoItem();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isAdBreak, setIsAdBreak] = useState(false);

  // Subscribe to time updates
  useEffect(() => {
    const handleAdBreakStarted = () => {
      setIsAdBreak(true);
    };

    const handleAdBreakEnded = () => {
      setIsAdBreak(false);
    };

    videoItem.on("AD_BREAK_STARTED", handleAdBreakStarted);
    videoItem.on("AD_BREAK_ENDED", handleAdBreakEnded);

    return () => {
      videoItem.off("AD_BREAK_STARTED", handleAdBreakStarted);
      videoItem.off("AD_BREAK_ENDED", handleAdBreakEnded);
    };
  }, [videoItem]);

  useEffect(() => {
    const handleTimeUpdate = ({
      currentTime: time,
      duration: dur,
    }: {
      currentTime: number;
      duration: number;
    }) => {
      if (!isSeeking) {
        setCurrentTime(time);
      }
      if (dur > 0) {
        setDuration(dur);
      }
    };

    // Get initial values
    setCurrentTime(videoItem.getCurrentTime());
    setDuration(videoItem.getDuration());

    videoItem.on("TIME_UPDATE", handleTimeUpdate);

    return () => {
      videoItem.off("TIME_UPDATE", handleTimeUpdate);
    };
  }, [videoItem, isSeeking]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    videoItem.seekTo(newTime);
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekEnd = () => {
    setIsSeeking(false);
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) {
      return "0:00";
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Hide timeline during ad breaks
  if (isAdBreak) {
    return null;
  }

  return (
    <div className={`${styles.timeline} ${className || ""}`}>
      {showTime && (
        <span className={styles.time}>{formatTime(currentTime)}</span>
      )}
      <div className={styles.sliderContainer}>
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          onMouseDown={handleSeekStart}
          onMouseUp={handleSeekEnd}
          onTouchStart={handleSeekStart}
          onTouchEnd={handleSeekEnd}
          className={styles.slider}
          aria-label="Video timeline"
        />
        <div
          className={styles.progressBar}
          style={{ width: `${progress}%` }}
        />
      </div>
      {showTime && (
        <span className={styles.time}>{formatTime(duration)}</span>
      )}
    </div>
  );
}

