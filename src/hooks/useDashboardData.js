import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  fetchProjects,
  fetchSummary,
  fetchDistrictTrend,
  fetchStateComparison,
  fetchDepartments,
  fetchDepartmentRisk,
  fetchProgressByStage,
  fetchMyProjects,
  createProject,
  updateProject,
  markProjectCompleted,
  verifyProject,
  uploadCsv,
} from "../api/landAcquisitionApi";

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: fetchProjects });
}

export function useSummary() {
  return useQuery({ queryKey: ["summary"], queryFn: fetchSummary });
}

export function useMonthlyTrend() {
  return useQuery({ queryKey: ["monthlyTrend"], queryFn: fetchDistrictTrend });
}

export function useStateComparison() {
  return useQuery({ queryKey: ["stateComparison"], queryFn: fetchStateComparison });
}

export function useDepartments() {
  return useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });
}

export function useDepartmentRisk(department) {
  return useQuery({
    queryKey: ["departmentRisk", department],
    queryFn: () => fetchDepartmentRisk(department),
  });
}

export function useProgressByStage() {
  return useQuery({ queryKey: ["progressByStage"], queryFn: fetchProgressByStage });
}

export function useMyProjects(userId) {
  return useQuery({
    queryKey: ["myProjects", userId],
    queryFn: () => fetchMyProjects(userId),
    enabled: !!userId,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, user }) => createProject(input, user),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["myProjects"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch, editor }) => updateProject(id, patch, editor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["myProjects"] });
    },
  });
}

export function useMarkCompleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, outcome, editor }) => markProjectCompleted(id, outcome, editor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["myProjects"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

// Maker-checker: a different user (Admin) confirms a project's submitted
// data before it's treated as fully trustworthy.
export function useVerifyProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewer }) => verifyProject(id, reviewer),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["myProjects"] });
    },
  });
}

export function useUploadCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadCsv,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["myProjects"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}
