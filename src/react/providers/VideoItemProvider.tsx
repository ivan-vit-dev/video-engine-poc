"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { VideoItem } from "../../engine/VideoItem";

interface VideoItemContextValue {
  videoItem: VideoItem;
}

const VideoItemContext = createContext<VideoItemContextValue | null>(null);

interface VideoItemProviderProps {
  children: ReactNode;
  videoItem: VideoItem;
}

/**
 * VideoItemProvider - Provides VideoItem instance to child components
 */
export function VideoItemProvider({
  children,
  videoItem,
}: VideoItemProviderProps) {
  return (
    <VideoItemContext.Provider value={{ videoItem }}>
      {children}
    </VideoItemContext.Provider>
  );
}

/**
 * useVideoItem - Hook to access VideoItem instance from context
 */
export function useVideoItem(): VideoItem {
  const context = useContext(VideoItemContext);

  if (!context) {
    throw new Error("useVideoItem must be used within a VideoItemProvider");
  }

  return context.videoItem;
}

