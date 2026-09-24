import { useQuery } from "@tanstack/react-query";
import { fetchMapProjects, fetchOverlapClusters, fetchSilentStalls } from "../api/landAcquisitionApi";

// Feature #4 — GIS Map Visualization. Deliberately shares the "projects"
// query key with the rest of the dashboard: it's the exact same project
// list (already carrying lat/lng and riskLevel), so a cache hit here means
// the map mounts instantly if the register was already loaded, and any
// mutation elsewhere (Add-Project, mark Completed) invalidates the map too.
export function useMapProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: fetchMapProjects });
}

// Feature #10 — Cross-Ministry Overlap Detector
export function useOverlapClusters() {
  return useQuery({ queryKey: ["overlapClusters"], queryFn: fetchOverlapClusters });
}

// Feature #11 — "Silent Stall" Alarm
export function useSilentStalls() {
  return useQuery({
    queryKey: ["silentStalls"],
    queryFn: fetchSilentStalls,
    refetchInterval: 60_000, // a stall is a slow-moving signal; a minute-ish poll is enough
  });
}
