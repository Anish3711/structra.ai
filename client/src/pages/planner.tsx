import { useState, useMemo } from "react";
import { Steps } from "@/components/ui/steps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowRight, ArrowLeft, Wand2, FileText, AlertTriangle, TrendingUp, Lightbulb, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { BlueprintViewer } from "@/components/ui/blueprint-viewer";

import residentialImg from "@/assets/building-types/residential.png";
import apartmentImg from "@/assets/building-types/apartment.png";
import commercialImg from "@/assets/building-types/commercial.png";
import mixedUseImg from "@/assets/building-types/mixed-use.png";
import houseImg from "@/assets/building-types/house.png";

const BUILDING_TYPES = [
  { value: "residential", label: "Residential", img: residentialImg },
  { value: "apartment", label: "Apartment", img: apartmentImg },
  { value: "commercial", label: "Commercial", img: commercialImg },
  { value: "mixed-use", label: "Mixed Use", img: mixedUseImg },
  { value: "house", label: "House", img: houseImg },
];

function formatINR(amount: number): string {
  if (amount >= 10000000) return `\u20B9${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `\u20B9${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `\u20B9${(amount / 1000).toFixed(1)}K`;
  return `\u20B9${amount.toFixed(0)}`;
}

const STEPS = [
  { id: 1, title: "Project Details", description: "Define project & site" },
  { id: 2, title: "Configuration", description: "Flat config & amenities" },
  { id: 3, title: "Results", description: "Costs, materials & timeline" },
  { id: 4, title: "Blueprint & AI", description: "Blueprint & AI insights" },
];

interface FormData {
  name: string;
  area_sqft: number;
  floors: number;
  months_to_finish: number;
  location: string;
  unit: string;
  building_type: string;
  site_analysis: {
    soil_type: string;
    surroundings: string;
    constraints: string;
  };
  utilities: {
    electrical: boolean;
    plumbing: boolean;
    water_tanks: number;
    water_supply: string;
  };
  flat_config: {
    flats_per_floor: number;
    bedrooms: number;
    bathrooms: number;
    balconies: number;
    doors: number;
    windows: number;
  };
  amenities: {
    pool: boolean;
    gym: boolean;
    parking: boolean;
    lift: boolean;
  };
}

interface PlanResult {
  workers: any;
  cost_breakdown: any;
  materials: any[];
  timeline: any[];
  schedule: any[];
  blueprint: any;
  ai_analysis: any;
}

export default function Planner() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [planResult, setPlanResult] = useState<PlanResult | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>({
    name: "My Construction Project",
    area_sqft: 2000,
    floors: 3,
    months_to_finish: 18,
    location: "India",
    unit: "sqft",
    building_type: "residential",
    site_analysis: {
      soil_type: "loamy",
      surroundings: "open",
      constraints: "",
    },
    utilities: {
      electrical: true,
      plumbing: true,
      water_tanks: 1,
      water_supply: "municipal",
    },
    flat_config: {
      flats_per_floor: 2,
      bedrooms: 2,
      bathrooms: 2,
      balconies: 1,
      doors: 6,
      windows: 4,
    },
    amenities: {
      pool: false,
      gym: false,
      parking: true,
      lift: false,
    },
  });

  const isResidential = formData.building_type === "residential" || formData.building_type === "apartment";

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Plan generation failed");
      }
      const data = await res.json();
      setPlanResult(data);
      setCurrentStep(3);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Plan Generation Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
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
                <Step1ProjectDetails
                  data={formData}
                  onChange={setFormData}
                  onNext={() => setCurrentStep(2)}
                />
              )}
              {currentStep === 2 && (
                <Step2Configuration
                  data={formData}
                  onChange={setFormData}
                  isResidential={isResidential}
                  isLoading={isLoading}
                  onGenerate={handleGeneratePlan}
                  onBack={() => setCurrentStep(1)}
                />
              )}
              {currentStep === 3 && planResult && (
                <Step3Results
                  result={planResult}
                  onNext={() => setCurrentStep(4)}
                  onBack={() => setCurrentStep(2)}
                />
              )}
              {currentStep === 4 && planResult && (
                <Step4BlueprintAI
                  result={planResult}
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

function Step1ProjectDetails({ data, onChange, onNext }: { data: FormData; onChange: (d: FormData) => void; onNext: () => void }) {
  return (
    <Card className="max-w-3xl mx-auto shadow-lg border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle>Project Details & Site Analysis</CardTitle>
        <CardDescription>Enter your construction project details, site conditions, and utilities.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Project Name</Label>
          <Input value={data.name} onChange={(e) => onChange({ ...data, name: e.target.value })} className="text-lg" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Area (sqft)</Label>
            <Input type="number" value={data.area_sqft} onChange={(e) => onChange({ ...data, area_sqft: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Floors</Label>
            <Input type="number" min={1} max={50} value={data.floors} onChange={(e) => onChange({ ...data, floors: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Months to Finish</Label>
            <Input type="number" min={1} max={120} value={data.months_to_finish} onChange={(e) => onChange({ ...data, months_to_finish: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <Select value={data.unit} onValueChange={(v) => onChange({ ...data, unit: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sqft">Sq. Feet</SelectItem>
                <SelectItem value="sqm">Sq. Meters</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          <Input value={data.location} onChange={(e) => onChange({ ...data, location: e.target.value })} placeholder="City, State, India" />
        </div>

        <div className="space-y-3">
          <Label className="text-base font-semibold">Building Type</Label>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {BUILDING_TYPES.map((bt) => {
              const isSelected = data.building_type === bt.value;
              return (
                <button
                  key={bt.value}
                  type="button"
                  onClick={() => onChange({ ...data, building_type: bt.value })}
                  className={`relative group rounded-xl border-2 p-2 transition-all duration-200 cursor-pointer text-center hover:shadow-md ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <img
                    src={bt.img}
                    alt={bt.label}
                    className="w-full aspect-square object-cover rounded-lg mb-2"
                  />
                  <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-slate-700"}`}>
                    {bt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Separator />
        <h3 className="text-lg font-semibold">Site Analysis</h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Soil Type</Label>
            <Select value={data.site_analysis.soil_type} onValueChange={(v) => onChange({ ...data, site_analysis: { ...data.site_analysis, soil_type: v } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="clay">Clay</SelectItem>
                <SelectItem value="sandy">Sandy</SelectItem>
                <SelectItem value="rocky">Rocky</SelectItem>
                <SelectItem value="loamy">Loamy</SelectItem>
                <SelectItem value="black_cotton">Black Cotton</SelectItem>
                <SelectItem value="laterite">Laterite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Surroundings</Label>
            <Select value={data.site_analysis.surroundings} onValueChange={(v) => onChange({ ...data, site_analysis: { ...data.site_analysis, surroundings: v } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open Land</SelectItem>
                <SelectItem value="urban">Urban Area</SelectItem>
                <SelectItem value="suburban">Suburban</SelectItem>
                <SelectItem value="industrial">Industrial Zone</SelectItem>
                <SelectItem value="coastal">Coastal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Constraints</Label>
            <Input value={data.site_analysis.constraints} onChange={(e) => onChange({ ...data, site_analysis: { ...data.site_analysis, constraints: e.target.value } })} placeholder="e.g., narrow access road" />
          </div>
        </div>

        <Separator />
        <h3 className="text-lg font-semibold">Utilities</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <Switch checked={data.utilities.electrical} onCheckedChange={(v) => onChange({ ...data, utilities: { ...data.utilities, electrical: v } })} />
            <Label>Electrical</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={data.utilities.plumbing} onCheckedChange={(v) => onChange({ ...data, utilities: { ...data.utilities, plumbing: v } })} />
            <Label>Plumbing</Label>
          </div>
          <div className="space-y-2">
            <Label>Water Tanks</Label>
            <Select value={String(data.utilities.water_tanks)} onValueChange={(v) => onChange({ ...data, utilities: { ...data.utilities, water_tanks: Number(v) } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Water Supply</Label>
            <Select value={data.utilities.water_supply} onValueChange={(v) => onChange({ ...data, utilities: { ...data.utilities, water_supply: v } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="municipal">Municipal</SelectItem>
                <SelectItem value="borewell">Borewell</SelectItem>
                <SelectItem value="tanker">Tanker</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={onNext} className="w-full h-12 text-lg mt-4 shadow-lg shadow-primary/20">
          Next: Configure Flats & Amenities <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </CardContent>
    </Card>
  );
}

function Step2Configuration({ data, onChange, isResidential, isLoading, onGenerate, onBack }: any) {
  return (
    <Card className="max-w-3xl mx-auto shadow-lg border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle>Flat Configuration & Amenities</CardTitle>
        <CardDescription>Configure the flat layout and select amenities.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <h3 className="text-lg font-semibold">Flat Configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Flats per Floor</Label>
            <Select value={String(data.flat_config.flats_per_floor)} onValueChange={(v: string) => onChange({ ...data, flat_config: { ...data.flat_config, flats_per_floor: Number(v) } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 8, 10].map((n: number) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bedrooms</Label>
            <Select value={String(data.flat_config.bedrooms)} onValueChange={(v: string) => onChange({ ...data, flat_config: { ...data.flat_config, bedrooms: Number(v) } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n: number) => <SelectItem key={n} value={String(n)}>{n} BHK</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bathrooms</Label>
            <Select value={String(data.flat_config.bathrooms)} onValueChange={(v: string) => onChange({ ...data, flat_config: { ...data.flat_config, bathrooms: Number(v) } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((n: number) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Balconies</Label>
            <Select value={String(data.flat_config.balconies)} onValueChange={(v: string) => onChange({ ...data, flat_config: { ...data.flat_config, balconies: Number(v) } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4].map((n: number) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Doors per Flat</Label>
            <Select value={String(data.flat_config.doors)} onValueChange={(v: string) => onChange({ ...data, flat_config: { ...data.flat_config, doors: Number(v) } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map((n: number) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Windows per Flat</Label>
            <Select value={String(data.flat_config.windows)} onValueChange={(v: string) => onChange({ ...data, flat_config: { ...data.flat_config, windows: Number(v) } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((n: number) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isResidential && (
          <>
            <Separator />
            <h3 className="text-lg font-semibold">Amenities</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Switch checked={data.amenities.pool} onCheckedChange={(v: boolean) => onChange({ ...data, amenities: { ...data.amenities, pool: v } })} />
                <Label>Swimming Pool</Label>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Switch checked={data.amenities.gym} onCheckedChange={(v: boolean) => onChange({ ...data, amenities: { ...data.amenities, gym: v } })} />
                <Label>Gym</Label>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Switch checked={data.amenities.parking} onCheckedChange={(v: boolean) => onChange({ ...data, amenities: { ...data.amenities, parking: v } })} />
                <Label>Parking</Label>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Switch checked={data.amenities.lift} onCheckedChange={(v: boolean) => onChange({ ...data, amenities: { ...data.amenities, lift: v } })} />
                <Label>Lift / Elevator</Label>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onBack} className="flex-1 h-12">
            <ArrowLeft className="mr-2 h-5 w-5" /> Back
          </Button>
          <Button onClick={onGenerate} disabled={isLoading} className="flex-[2] h-12 text-lg shadow-lg shadow-primary/20">
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
            {isLoading ? "Generating Plan..." : "Generate Complete Plan"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Step3Results({ result, onNext, onBack }: { result: PlanResult; onNext: () => void; onBack: () => void }) {
  const { cost_breakdown, workers, materials, schedule } = result;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold font-display">Construction Plan Results</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={onNext} className="shadow-lg shadow-primary/20">
            View Blueprint & AI <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Cost" value={formatINR(cost_breakdown.total_cost)} color="bg-blue-50 border-blue-200" />
        <StatCard label="Material Cost" value={formatINR(cost_breakdown.material_cost)} color="bg-green-50 border-green-200" />
        <StatCard label="Labour Cost" value={formatINR(cost_breakdown.labour_cost)} color="bg-orange-50 border-orange-200" />
        <StatCard label="Cost / sqft" value={formatINR(cost_breakdown.cost_per_sqft)} color="bg-purple-50 border-purple-200" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Overhead (10%)" value={formatINR(cost_breakdown.overhead)} color="bg-yellow-50 border-yellow-200" />
        <StatCard label="Contingency (8%)" value={formatINR(cost_breakdown.contingency)} color="bg-red-50 border-red-200" />
        <StatCard label="Total Workers" value={String(workers.total_workers)} color="bg-indigo-50 border-indigo-200" />
      </div>

      <Card>
        <CardHeader><CardTitle>Worker Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Masons", count: workers.masons },
              { label: "Helpers", count: workers.helpers },
              { label: "Carpenters", count: workers.carpenters },
              { label: "Steel Workers", count: workers.steel_workers },
              { label: "Plumbers", count: workers.plumbers },
              { label: "Electricians", count: workers.electricians },
              { label: "Painters", count: workers.painters },
            ].map(w => (
              <div key={w.label} className="p-3 rounded-lg bg-slate-50 border text-center">
                <div className="text-2xl font-bold text-primary">{w.count}</div>
                <div className="text-sm text-muted-foreground">{w.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Material Estimates</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 font-medium">Material</th>
                  <th className="text-right p-3 font-medium">Quantity</th>
                  <th className="text-right p-3 font-medium">Unit</th>
                  <th className="text-right p-3 font-medium">Rate</th>
                  <th className="text-right p-3 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m: any, i: number) => (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-medium">{m.name}</td>
                    <td className="p-3 text-right">{m.quantity.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-right text-muted-foreground">{m.unit}</td>
                    <td className="p-3 text-right">{formatINR(m.unit_rate)}</td>
                    <td className="p-3 text-right font-semibold">{formatINR(m.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Construction Schedule</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {schedule.map((phase: any, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{phase.phase}</div>
                  <div className="text-sm text-muted-foreground truncate">{phase.description}</div>
                </div>
                <div className="text-sm text-right shrink-0">
                  <span className="font-medium">Week {phase.start_week}-{phase.end_week}</span>
                  <span className="text-muted-foreground ml-1">({phase.duration_weeks}w)</span>
                </div>
                <div className="w-24 bg-slate-100 rounded-full h-2 shrink-0">
                  <div
                    className="bg-primary rounded-full h-2"
                    style={{ width: `${Math.min(100, (phase.duration_weeks / (schedule[schedule.length - 1]?.end_week || 1)) * 100 * 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Step4BlueprintAI({ result, onBack }: { result: PlanResult; onBack: () => void }) {
  const { blueprint, ai_analysis } = result;

  const buildingDims = useMemo(() => {
    let maxW = 0;
    let maxD = 0;
    for (const floor of blueprint.floors || []) {
      for (const room of floor.rooms || []) {
        maxW = Math.max(maxW, room.x + room.width);
        maxD = Math.max(maxD, room.y + room.height);
      }
    }
    return { width: maxW || 50, depth: maxD || 40 };
  }, [blueprint]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold font-display">Blueprint & AI Analysis</h2>
        <Button variant="outline" onClick={onBack}>Back to Results</Button>
      </div>

      <Card className="border-t-4 border-t-primary">
        <CardContent className="p-4">
          <p className="text-muted-foreground mb-4">{blueprint.overview}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {blueprint.component_breakdown?.map((c: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-slate-50 border text-center">
                <div className="text-xl font-bold text-primary">{c.count}</div>
                <div className="text-xs text-muted-foreground">{c.component}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <BlueprintViewer
        blueprint={blueprint}
        buildingWidth={buildingDims.width}
        buildingDepth={buildingDims.depth}
      />

      <Separator />

      <h3 className="text-xl font-bold font-display flex items-center gap-2">
        <Wand2 className="h-5 w-5 text-primary" /> AI Analysis
      </h3>

      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-6">
          <h4 className="font-semibold flex items-center gap-2 mb-2"><FileText className="h-4 w-4 text-blue-500" /> Project Summary</h4>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{ai_analysis.project_summary}</p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="pt-6">
            <h4 className="font-semibold flex items-center gap-2 text-base mb-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Risks</h4>
            <ul className="space-y-2">
              {ai_analysis.risks?.map((r: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="text-red-400 mt-0.5 shrink-0">&#x2022;</span> {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-400">
          <CardContent className="pt-6">
            <h4 className="font-semibold flex items-center gap-2 text-base mb-2"><Lightbulb className="h-4 w-4 text-green-500" /> Recommendations</h4>
            <ul className="space-y-2">
              {ai_analysis.recommendations?.map((r: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="text-green-400 mt-0.5 shrink-0">&#x2022;</span> {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-purple-400">
          <CardContent className="pt-6">
            <h4 className="font-semibold flex items-center gap-2 text-base mb-2"><TrendingUp className="h-4 w-4 text-purple-500" /> Material Insights</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{ai_analysis.material_insights}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="pt-6">
            <h4 className="font-semibold flex items-center gap-2 text-base mb-2"><TrendingUp className="h-4 w-4 text-amber-500" /> Cost Optimization</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{ai_analysis.cost_optimization}</p>
          </CardContent>
        </Card>
      </div>

      {ai_analysis.hindi_summary && (
        <Card className="border-l-4 border-l-orange-400 bg-orange-50/30">
          <CardContent className="pt-6">
            <h4 className="font-semibold text-base mb-2">Hindi Summary</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{ai_analysis.hindi_summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`p-4 rounded-xl border ${color}`}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
