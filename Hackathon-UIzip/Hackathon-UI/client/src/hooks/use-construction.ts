import { useMutation } from "@tanstack/react-query";
import { api, type ProjectInput } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Types derived from the schema via API responses
export type CalculationResult = z.infer<typeof api.calculate.responses[200]>;
export type AnalysisResult = z.infer<typeof api.analyze.responses[200]>;
export type BlueprintResult = z.infer<typeof api.generateBlueprint.responses[200]>;
export type DxfExportResult = z.infer<typeof api.exportDxf.responses[200]>;

export function useCalculateProject() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: ProjectInput) => {
      const res = await apiRequest("POST", api.calculate.path, data);
      return api.calculate.responses[200].parse(await res.json());
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Calculation Failed",
        description: error.message,
      });
    },
  });
}

export function useAnalyzeProject() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { project: ProjectInput; calculations: CalculationResult }) => {
      const res = await apiRequest("POST", api.analyze.path, data);
      return api.analyze.responses[200].parse(await res.json());
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message,
      });
    },
  });
}

export function useGenerateBlueprint() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: ProjectInput) => {
      const res = await apiRequest("POST", api.generateBlueprint.path, data);
      return api.generateBlueprint.responses[200].parse(await res.json());
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Blueprint Generation Failed",
        description: error.message,
      });
    },
  });
}

export function useExportDxf() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { rooms: BlueprintResult['rooms']; width: number; depth: number }) => {
      const res = await apiRequest("POST", api.exportDxf.path, data);
      return api.exportDxf.responses[200].parse(await res.json());
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error.message,
      });
    },
  });
}
