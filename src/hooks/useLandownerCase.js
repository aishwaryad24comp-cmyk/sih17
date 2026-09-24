import { useQuery } from "@tanstack/react-query";
import { useSession } from "../context/SessionContext";
import { fetchLandownerCase } from "../api/landAcquisitionApi";

// Feature #13 — Landowner Portal. Keyed by user id (not project id) so
// switching the demo user correctly refetches instead of showing a stale
// cached case from whoever was logged in before.
export function useLandownerCase() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["landownerCase", user?.id],
    queryFn: () => fetchLandownerCase(user),
    enabled: !!user && user.role === "Landowner",
  });
}
