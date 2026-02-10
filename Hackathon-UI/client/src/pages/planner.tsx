import { useState } from "react";
import { Steps } from "@/components/ui/steps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  useCalculateProject, 
  useAnalyzeProject, 
  useGenerateBlueprint, 
  useExportDxf,
  type CalculationResult,
  type AnalysisResult,
  type BlueprintResult
} from "@/hooks/use-construction";
import { AnalysisCharts } from "@/components/ui/analysis-charts";
import { BlueprintEditor } from "@/components/ui/blueprint-editor";
import { Loader2, ArrowRight, ArrowLeft, Download, Wand2, FileText, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { id: 1, title: "Project Details", description: "Define dimensions & constraints" },
  { id: 2, title: "Cost & Timeline", description: "Review estimates" },
  { id: 3, title: "AI Analysis", description: "Get intelligent insights" },
  { id: 4, title: "Blueprint", description: "Edit layout & export" },
];

export default function Planner() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "My Dream Project",
    width: 30,
    depth: 40,
    floors: 1,
    budget: 150000,
    location: "New York, NY"
  });

  // State for storing API results
  const [calculationData, setCalculationData] = useState<CalculationResult | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [blueprintData, setBlueprintData] = useState<BlueprintResult | null>(null);

  // API Hooks
  const calculate = useCalculateProject();
  const analyze = useAnalyzeProject();
  const generateBlueprint = useGenerateBlueprint();
  const exportDxf = useExportDxf();

  const handleNext = async () => {
    try {
      if (currentStep === 1) {
        const calcRes = await calculate.mutateAsync(formData);
        setCalculationData(calcRes);
        setCurrentStep(2);
      } else if (currentStep === 2) {
        if (!calculationData) return;
        const analysisRes = await analyze.mutateAsync({ 
          project: formData, 
          calculations: calculationData 
        });
        setAnalysisData(analysisRes);
        setCurrentStep(3);
      } else if (currentStep === 3) {
        const blueprintRes = await generateBlueprint.mutateAsync(formData);
        setBlueprintData(blueprintRes);
        setCurrentStep(4);
      }
    } catch (error) {
      console.error("Step failed:", error);
    }
  };

  const handleDxfExport = async () => {
    if (!blueprintData) return;
    const res = await exportDxf.mutateAsync({
      rooms: blueprintData.rooms,
      width: blueprintData.width,
      depth: blueprintData.depth
    });
    
    // Create download link
    const blob = new Blob([res.dxfContent], { type: 'application/dxf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="font-display font-bold text-xl">Structura.ai Planner</div>
          <div className="text-sm text-muted-foreground">{formData.name}</div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1 max-w-6xl">
        <Steps steps={STEPS} currentStep={currentStep} className="mb-12" />

        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 1 && (
                <Step1Form 
                  data={formData} 
                  onChange={setFormData} 
                  isLoading={calculate.isPending}
                  onNext={handleNext}
                />
              )}
              {currentStep === 2 && calculationData && (
                <Step2Analysis 
                  data={calculationData} 
                  isLoading={analyze.isPending}
                  onNext={handleNext}
                  onBack={() => setCurrentStep(1)}
                />
              )}
              {currentStep === 3 && analysisData && (
                <Step3Insights 
                  data={analysisData}
                  isLoading={generateBlueprint.isPending}
                  onNext={handleNext}
                  onBack={() => setCurrentStep(2)}
                />
              )}
              {currentStep === 4 && blueprintData && (
                <Step4Blueprint 
                  data={blueprintData}
                  onUpdate={setBlueprintData}
                  isExporting={exportDxf.isPending}
                  onExport={handleDxfExport}
                  onBack={() => setCurrentStep(3)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// --- Step Components ---

function Step1Form({ data, onChange, isLoading, onNext }: any) {
  return (
    <Card className="max-w-2xl mx-auto shadow-lg border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle>Project Details</CardTitle>
        <CardDescription>Enter the dimensions and constraints for your construction project.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Project Name</Label>
          <Input 
            value={data.name} 
            onChange={(e) => onChange({...data, name: e.target.value})} 
            className="text-lg"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Width (ft)</Label>
            <Input 
              type="number" 
              value={data.width} 
              onChange={(e) => onChange({...data, width: Number(e.target.value)})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Depth (ft)</Label>
            <Input 
              type="number" 
              value={data.depth} 
              onChange={(e) => onChange({...data, depth: Number(e.target.value)})} 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Number of Floors</Label>
            <Input 
              type="number" 
              min={1} max={20}
              value={data.floors} 
              onChange={(e) => onChange({...data, floors: Number(e.target.value)})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Estimated Budget ($)</Label>
            <Input 
              type="number" 
              value={data.budget} 
              onChange={(e) => onChange({...data, budget: Number(e.target.value)})} 
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          <Input 
            value={data.location} 
            onChange={(e) => onChange({...data, location: e.target.value})} 
            placeholder="City, State"
          />
        </div>

        <Button onClick={onNext} disabled={isLoading} className="w-full h-12 text-lg mt-4 shadow-lg shadow-primary/20">
          {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Calculate Estimates"} 
          {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
        </Button>
      </CardContent>
    </Card>
  );
}

function Step2Analysis({ data, isLoading, onNext, onBack }: any) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold font-display">Construction Estimates</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={onNext} disabled={isLoading} className="shadow-lg shadow-primary/20">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Analyze with AI"} 
            {!isLoading && <Wand2 className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      <AnalysisCharts data={data} />
    </div>
  );
}

function Step3Insights({ data, isLoading, onNext, onBack }: any) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold font-display">AI Analysis Report</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={onNext} disabled={isLoading} className="shadow-lg shadow-primary/20">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate Blueprint"} 
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <InsightCard title="Project Summary" content={data.summary} />
        <InsightCard title="Cost Reasoning" content={data.costReasoning} />
        <div className="grid md:grid-cols-2 gap-6">
          <InsightCard title="Timeline Assessment" content={data.timelineJustification} />
          <InsightCard title="Layout Recommendations" content={data.layoutRecommendations} />
        </div>
      </div>
    </div>
  );
}

function InsightCard({ title, content }: { title: string, content: string }) {
  return (
    <Card className="shadow-sm border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
      </CardContent>
    </Card>
  );
}

function Step4Blueprint({ data, onUpdate, isExporting, onExport, onBack }: any) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold font-display">Interactive Blueprint</h2>
          <p className="text-sm text-muted-foreground">Drag and drop rooms to adjust the layout.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={onExport} disabled={isExporting} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export DXF
          </Button>
        </div>
      </div>

      <BlueprintEditor initialData={data} onUpdate={onUpdate} />

      <Card className="bg-emerald-50 border-emerald-100">
        <CardContent className="p-4 flex items-center gap-3 text-emerald-800">
          <CheckCircle className="w-5 h-5" />
          <p className="font-medium">Design is valid and ready for export.</p>
        </CardContent>
      </Card>
    </div>
  );
}
