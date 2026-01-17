"use client";

import { VideoEngineProvider } from "../react/providers/VideoEngineProvider";
import { VideoPlayer } from "./components/VideoPlayer";
import styles from "./page.module.scss";

export default function Home() {
  // Test video URLs - you can switch between them
  const testVideos = {
    mp4: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    // Public HLS/m3u8 test streams
    hls1: "https://devstreaming-cdn.apple.com/videos/streaming/examples/adv_dv_atmos/main.m3u8", // Becoming You - 4K with Dolby Vision
    hls2: "https://sample.vodobox.net/skate_phantom_flex_4k/skate_phantom_flex_4k.m3u8", // Skate Phantom Flex - 4K
    hls3: "https://content.jwplatform.com/manifests/vM7nH0Kl.m3u8", // Tears of Steel
  };

  // Currently using HLS stream - change to testVideos.mp4 for MP4
  // Try different streams if one doesn't work
  const videoUrl = testVideos.hls3; // Try hls3 (Tears of Steel) - often more reliable

  return (
    <VideoEngineProvider>
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Video Engine POC</h1>
          <p className={styles.description}>
            A modular video engine with React integration
          </p>

          <VideoPlayer
            id="demo-player-1"
            url={videoUrl}
            adsEnabled={true}
            adTagUrl="https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&correlator="
          />

          <div className={styles.info}>
            <h2>Features</h2>
            <ul>
              <li>✅ VideoEngine singleton with global state management</li>
              <li>✅ VideoItem instances with event-driven architecture</li>
              <li>✅ Player adapter system (VideoJS, HTML5, Shaka)</li>
              <li>✅ React integration with Context providers</li>
              <li>✅ Control components (Play, Volume, Timeline)</li>
              <li>✅ Type-safe event system</li>
            </ul>
          </div>
        </div>
      </main>
    </VideoEngineProvider>
  );
}
