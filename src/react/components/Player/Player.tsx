"use client";

import React, { useEffect, useRef, useState, ReactNode } from "react";
import { useVideoEngine } from "../../providers/VideoEngineProvider";
import { VideoItemProvider } from "../../providers/VideoItemProvider";
import { useViewportVisibility } from "../../hooks/useViewportVisibility";
import { VideoItemInitProps } from "../../../engine/types";
import { VideoItem } from "../../../engine/VideoItem";
import styles from "./Player.module.scss";

interface PlayerProps extends Omit<VideoItemInitProps, "id"> {
  id: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Player - Core React component that creates and manages a VideoItem instance
 */
export function Player({ id, className, children, ...initProps }: PlayerProps) {
  const engine = useVideoEngine();
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoItem, setVideoItem] = useState<VideoItem | null>(null);
  const isVisible = useViewportVisibility(containerRef);

  // Create VideoItem when container is ready
  useEffect(() => {
    let item: VideoItem | null = null;
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    // Use a small delay to ensure container is mounted
    timeoutId = setTimeout(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const initialize = async () => {
        try {
          // Create and initialize VideoItem via engine (single init method)
          item = await engine.createVideoItem(
            {
              id,
              ...initProps,
            },
            container
          );

          if (!isMounted) {
            engine.disposeVideoItem(item);
            return;
          }

          setVideoItem(item);
        } catch (err) {
          if (!isMounted) return;
          // Error handling will be done by Error component via VideoItem events
          // Still set the item if it was created (even if init failed)
          // This allows controls to render for error handling
          if (item) {
            setVideoItem(item);
          }
        }
      };

      initialize();
    }, 0);

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (item) {
        engine.disposeVideoItem(item);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Only recreate if id changes - containerRef is stable

  // Track viewport visibility
  useEffect(() => {
    if (!videoItem || !initProps.autoplayInViewport) {
      return;
    }

    // Handle autoplay in viewport logic
    // This could trigger play/pause based on visibility
    // For now, we'll just track it
  }, [isVisible, videoItem, initProps.autoplayInViewport]);

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${className || ""}`}
    >
      {/* Video element will be mounted here by the adapter */}
      {videoItem ? (
        <VideoItemProvider videoItem={videoItem}>{children}</VideoItemProvider>
      ) : null}
    </div>
  );
}
