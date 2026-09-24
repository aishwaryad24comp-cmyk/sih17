import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { USE_LIVE_API } from "../api/client";

// Backend half (Member 6) emits "project:update" / "project:high-risk" over
// this same Socket.io server. Until it exists, this hook falls back to a
// simulated pulse so the dashboard still visibly refreshes live in the demo.
// Swapping USE_LIVE_API to true reuses the exact same event contract below —
// no component changes needed once Member 6's server is up.
export function useRealtimeUpdates() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(USE_LIVE_API ? "connecting" : "simulated");
  const [lastEvent, setLastEvent] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!USE_LIVE_API) {
      const tick = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["summary"] });
        setLastEvent({ type: "simulated-refresh", at: new Date().toISOString() });
      }, 15000);
      return () => clearInterval(tick);
    }

    const rawBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    const base = rawBase.replace(/\/api\/?$/, "");
    const socket = io(base, { reconnectionAttempts: 5, timeout: 5000 });
    socketRef.current = socket;

    socket.on("connect", () => setStatus("connected"));
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", () => setStatus("error"));

    socket.on("project:update", (payload) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      setLastEvent({ type: "project:update", payload, at: new Date().toISOString() });
    });

    socket.on("project:high-risk", (payload) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setLastEvent({ type: "project:high-risk", payload, at: new Date().toISOString() });
    });

    return () => socket.disconnect();
  }, [queryClient]);

  return { status, lastEvent };
}
