"use client";

import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { VideoEngine } from "../../engine/VideoEngine";

interface VideoEngineContextValue {
  engine: VideoEngine;
}

const VideoEngineContext = createContext<VideoEngineContextValue | null>(null);

interface VideoEngineProviderProps {
  children: ReactNode;
  engine?: VideoEngine; // Optional for testing
}

/**
 * VideoEngineProvider - Provides VideoEngine instance to React components
 */
export function VideoEngineProvider({
  children,
  engine,
}: VideoEngineProviderProps) {
  const engineInstance = useMemo(() => {
    return engine || VideoEngine.getInstance();
  }, [engine]);

  const value = useMemo(
    () => ({
      engine: engineInstance,
    }),
    [engineInstance]
  );

  return (
    <VideoEngineContext.Provider value={value}>
      {children}
    </VideoEngineContext.Provider>
  );
}

/**
 * useVideoEngine - Hook to access VideoEngine instance
 */
export function useVideoEngine(): VideoEngine {
  const context = useContext(VideoEngineContext);

  if (!context) {
    throw new Error(
      "useVideoEngine must be used within a VideoEngineProvider"
    );
  }

  return context.engine;
}

