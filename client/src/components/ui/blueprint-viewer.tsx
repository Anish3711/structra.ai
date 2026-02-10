import { useState, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building3DViewer } from "@/components/ui/building-3d-viewer";
import {
  blueprintToSVG,
  exportSVGAsFile,
  exportSVGAsPNG,
  type SVGBlueprint,
  type ComponentFilter,
} from "@/lib/blueprint-svg";
import {
  Box,
  Layers,
  Download,
  FileImage,
  FileText,
  Building2,
  Home,
  ParkingCircle,
  Droplets,
  Zap,
  LayoutGrid,
  CloudRain,
  Eye,
} from "lucide-react";

interface BlueprintViewerProps {
  blueprint: SVGBlueprint;
  buildingWidth: number;
  buildingDepth: number;
}

const COMPONENT_FILTERS: {
  id: ComponentFilter;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { id: "all", label: "Complete Blueprint", icon: <LayoutGrid className="w-4 h-4" />, color: "bg-slate-100 border-slate-300 text-slate-700" },
  { id: "floors", label: "Floors", icon: <Layers className="w-4 h-4" />, color: "bg-blue-50 border-blue-300 text-blue-700" },
  { id: "flats", label: "Flats", icon: <Home className="w-4 h-4" />, color: "bg-green-50 border-green-300 text-green-700" },
  { id: "corridors", label: "Corridors", icon: <Building2 className="w-4 h-4" />, color: "bg-gray-50 border-gray-300 text-gray-700" },
  { id: "single_flat", label: "Single Flat", icon: <Eye className="w-4 h-4" />, color: "bg-purple-50 border-purple-300 text-purple-700" },
  { id: "parking", label: "Parking", icon: <ParkingCircle className="w-4 h-4" />, color: "bg-amber-50 border-amber-300 text-amber-700" },
  { id: "terrace", label: "Terrace", icon: <CloudRain className="w-4 h-4" />, color: "bg-emerald-50 border-emerald-300 text-emerald-700" },
  { id: "water_tanks", label: "Water Tanks", icon: <Droplets className="w-4 h-4" />, color: "bg-cyan-50 border-cyan-300 text-cyan-700" },
  { id: "water_connections", label: "Water Flow", icon: <Droplets className="w-4 h-4" />, color: "bg-blue-50 border-blue-300 text-blue-700" },
  { id: "electrical_connections", label: "Electrical", icon: <Zap className="w-4 h-4" />, color: "bg-yellow-50 border-yellow-300 text-yellow-700" },
];

export function BlueprintViewer({ blueprint, buildingWidth, buildingDepth }: BlueprintViewerProps) {
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [activeFilter, setActiveFilter] = useState<ComponentFilter>("all");
  const [activeFloor, setActiveFloor] = useState(0);
  const [selectedFlatIdx, setSelectedFlatIdx] = useState(0);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const floors = useMemo(() => {
    return blueprint.floors.map((f) => ({
      floor: f.floor,
      label: f.label,
      rooms: f.rooms.map((r) => ({
        id: r.id,
        name: r.name,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        type: r.type as any,
      })),
      walls: [] as any[],
    }));
  }, [blueprint]);

  const filteredFloors = useMemo(() => {
    let result = floors;

    if (activeFilter === "floors") {
      result = floors.filter((f) => f.floor === activeFloor);
    } else if (activeFilter === "corridors") {
      result = floors.map((f) => ({
        ...f,
        rooms: f.rooms.filter((r) => r.type === "corridor"),
      }));
    } else if (activeFilter === "parking") {
      result = floors.map((f) => ({
        ...f,
        rooms: f.rooms.filter((r) => r.type === "parking"),
      }));
    } else if (activeFilter === "flats") {
      result = floors.map((f) => ({
        ...f,
        rooms: f.rooms.filter((r) => r.type !== "corridor"),
      }));
    } else if (activeFilter === "single_flat") {
      result = floors.map((f) => {
        const bpFloor = blueprint.floors.find((bf) => bf.floor === f.floor);
        if (!bpFloor?.flats?.length) return { ...f, rooms: [] };
        const flat = bpFloor.flats[selectedFlatIdx] || bpFloor.flats[0];
        if (!flat) return { ...f, rooms: [] };
        const flatRoomIds = new Set(flat.rooms);
        return {
          ...f,
          rooms: f.rooms.filter((r) => flatRoomIds.has(r.id)),
        };
      });
    } else if (activeFilter === "terrace" || activeFilter === "water_tanks" || activeFilter === "water_connections" || activeFilter === "electrical_connections") {
      result = floors;
    }

    return result;
  }, [floors, activeFilter, activeFloor, selectedFlatIdx, blueprint]);

  const svgSelectedFloor = activeFilter === "floors" ? activeFloor : -1;

  const svgString = useMemo(() => {
    return blueprintToSVG(blueprint, activeFilter, svgSelectedFloor, selectedFlatIdx);
  }, [blueprint, activeFilter, svgSelectedFloor, selectedFlatIdx]);

  const handleDownloadSVG = useCallback(() => {
    exportSVGAsFile(svgString, `blueprint-${activeFilter}.svg`);
  }, [svgString, activeFilter]);

  const handleDownloadPNG = useCallback(() => {
    exportSVGAsPNG(svgString, `blueprint-${activeFilter}.png`, 3);
  }, [svgString, activeFilter]);

  const totalFlats = blueprint.floors[0]?.flats?.length || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-lg shadow border p-1 flex gap-1">
            <Button
              variant={viewMode === "3d" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("3d")}
              className="text-sm"
            >
              <Box className="w-4 h-4 mr-1.5" />
              3D View
            </Button>
            <Button
              variant={viewMode === "2d" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("2d")}
              className="text-sm"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              2D Blueprint
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadSVG}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            SVG
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPNG}>
            <FileImage className="w-3.5 h-3.5 mr-1.5" />
            PNG
          </Button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border bg-white shadow-lg" style={{ minHeight: "550px" }}>
        {viewMode === "3d" ? (
          <Building3DViewer
            floors={filteredFloors}
            width={buildingWidth}
            depth={buildingDepth}
            activeFloor={activeFloor}
            onFloorChange={setActiveFloor}
          />
        ) : (
          <div
            ref={svgContainerRef}
            className="w-full overflow-auto bg-white p-4"
            style={{ minHeight: "550px" }}
            dangerouslySetInnerHTML={{ __html: svgString }}
          />
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Component View</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Click a component to see its isolated blueprint
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {COMPONENT_FILTERS.map((cf) => {
              const isActive = activeFilter === cf.id;
              return (
                <button
                  key={cf.id}
                  onClick={() => setActiveFilter(cf.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-left text-sm font-medium ${
                    isActive
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                      : `${cf.color} hover:shadow-sm hover:scale-[1.02]`
                  }`}
                >
                  <span className={isActive ? "text-primary" : ""}>{cf.icon}</span>
                  <span className={isActive ? "text-primary font-semibold" : ""}>{cf.label}</span>
                </button>
              );
            })}
          </div>

          {activeFilter === "single_flat" && totalFlats > 1 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Select flat:</span>
              {Array.from({ length: totalFlats }).map((_, i) => (
                <Button
                  key={i}
                  variant={selectedFlatIdx === i ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectedFlatIdx(i)}
                >
                  Flat {i + 1}
                </Button>
              ))}
            </div>
          )}

          {activeFilter === "floors" && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Select floor:</span>
              {blueprint.floors.map((f) => (
                <Button
                  key={f.floor}
                  variant={activeFloor === f.floor ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setActiveFloor(f.floor)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
