import React from "react";
import type { VideoChatPageProps } from "@/pages/videochat/core";
import { VideoCore } from "./components/VideoCore";
import { useVideoPageState } from "./hooks/useVideoPageState";

export default function VideoChatPage(props: VideoChatPageProps) {
  const pageState = useVideoPageState(props);

  return <VideoCore {...pageState} />;
}
