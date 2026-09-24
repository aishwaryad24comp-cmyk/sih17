import { useQuery } from "@tanstack/react-query";
import { fetchExplain, fetchRecommendations } from "../api/landAcquisitionApi";

export function useProjectExplain(selectedId) {
  return useQuery({
    queryKey: ["explain", selectedId],
    queryFn: () => fetchExplain(selectedId),
    enabled: !!selectedId,
  });
}

export function useProjectRecommendation(selectedId) {
  return useQuery({
    queryKey: ["recommend", selectedId],
    queryFn: () => fetchRecommendations(selectedId),
    enabled: !!selectedId,
  });
}
