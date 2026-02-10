import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building3DViewer } from "@/components/ui/building-3d-viewer";
import {
  blueprintToSVG,
  exportSVGAsFile,
  exportSVGAsPNG,
  type SVGBlueprint,
  type SVGRoom,
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
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
} from "lucide-react";

interface BlueprintViewerProps {
  blueprint: SVGBlueprint;
  buildingWidth: number;
  buildingDepth: number;
  onBlueprintChange?: (blueprint: SVGBlueprint) => void;
}

const COMPONENT_FILTERS: {
  id: ComponentFilter;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "all", label: "Complete Blueprint", icon: <LayoutGrid className="w-4 h-4" /> },
  { id: "floors", label: "Floors", icon: <Layers className="w-4 h-4" /> },
  { id: "flats", label: "Flats", icon: <Home className="w-4 h-4" /> },
  { id: "corridors", label: "Corridors", icon: <Building2 className="w-4 h-4" /> },
  { id: "single_flat", label: "Single Flat", icon: <Eye className="w-4 h-4" /> },
  { id: "parking", label: "Parking", icon: <ParkingCircle className="w-4 h-4" /> },
  { id: "terrace", label: "Terrace", icon: <CloudRain className="w-4 h-4" /> },
  { id: "water_tanks", label: "Water Tanks", icon: <Droplets className="w-4 h-4" /> },
  { id: "water_connections", label: "Water Flow", icon: <Droplets className="w-4 h-4" /> },
  { id: "electrical_connections", label: "Electrical", icon: <Zap className="w-4 h-4" /> },
];

const ROOM_TYPES = [
  "bedroom", "living", "kitchen", "bathroom", "corridor",
  "dining", "balcony", "staircase", "elevator", "lobby",
  "storage", "utility", "office", "parking", "laundry",
];

export function BlueprintViewer({ blueprint: initialBlueprint, buildingWidth, buildingDepth, onBlueprintChange }: BlueprintViewerProps) {
  const [blueprint, setBlueprint] = useState<SVGBlueprint>(initialBlueprint);

  useEffect(() => {
    setBlueprint(initialBlueprint);
  }, [initialBlueprint]);

  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [activeFilter, setActiveFilter] = useState<ComponentFilter>("all");
  const [activeFloor, setActiveFloor] = useState(0);
  const [selectedFlatIdx, setSelectedFlatIdx] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [editingRoom, setEditingRoom] = useState<{ floorIdx: number; roomId: string } | null>(null);
  const [addingRoom, setAddingRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: "", type: "bedroom", x: 0, y: 0, width: 12, height: 10, floor: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const updateBlueprint = useCallback((updated: SVGBlueprint) => {
    setBlueprint(updated);
    onBlueprintChange?.(updated);
  }, [onBlueprintChange]);

  const handleAddRoom = useCallback(() => {
    const floor = blueprint.floors[newRoom.floor];
    if (!floor) return;
    const roomId = `f${newRoom.floor}-custom-${Date.now()}`;
    const room: SVGRoom = {
      id: roomId,
      name: newRoom.name || `${newRoom.type.charAt(0).toUpperCase() + newRoom.type.slice(1)}`,
      x: newRoom.x,
      y: newRoom.y,
      width: newRoom.width,
      height: newRoom.height,
      type: newRoom.type,
    };
    const updatedFloors = blueprint.floors.map((f, i) => {
      if (i === newRoom.floor) {
        return { ...f, rooms: [...f.rooms, room] };
      }
      return f;
    });
    updateBlueprint({ ...blueprint, floors: updatedFloors });
    setAddingRoom(false);
    setNewRoom({ name: "", type: "bedroom", x: 0, y: 0, width: 12, height: 10, floor: 0 });
  }, [blueprint, newRoom, updateBlueprint]);

  const handleDeleteRoom = useCallback((floorIdx: number, roomId: string) => {
    const updatedFloors = blueprint.floors.map((f, i) => {
      if (i === floorIdx) {
        return {
          ...f,
          rooms: f.rooms.filter(r => r.id !== roomId),
          flats: f.flats?.map(flat => ({
            ...flat,
            rooms: flat.rooms.filter((rid: string) => rid !== roomId),
          })),
        };
      }
      return f;
    });
    updateBlueprint({ ...blueprint, floors: updatedFloors });
    setEditingRoom(null);
  }, [blueprint, updateBlueprint]);

  const handleUpdateRoom = useCallback((floorIdx: number, roomId: string, updates: Partial<SVGRoom>) => {
    const updatedFloors = blueprint.floors.map((f, i) => {
      if (i === floorIdx) {
        return {
          ...f,
          rooms: f.rooms.map(r => r.id === roomId ? { ...r, ...updates } : r),
        };
      }
      return f;
    });
    updateBlueprint({ ...blueprint, floors: updatedFloors });
  }, [blueprint, updateBlueprint]);

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
  const currentEditRoom = editingRoom ? blueprint.floors[editingRoom.floorIdx]?.rooms.find(r => r.id === editingRoom.roomId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-[#0d2040] rounded-lg shadow-lg shadow-blue-900/30 border border-blue-800/40 p-1 flex gap-1">
            <Button
              variant={viewMode === "3d" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("3d")}
              className={`text-sm ${viewMode === "3d" ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-blue-300 hover:text-blue-200 hover:bg-blue-900/50"}`}
            >
              <Box className="w-4 h-4 mr-1.5" />
              3D View
            </Button>
            <Button
              variant={viewMode === "2d" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("2d")}
              className={`text-sm ${viewMode === "2d" ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-blue-300 hover:text-blue-200 hover:bg-blue-900/50"}`}
            >
              <FileText className="w-4 h-4 mr-1.5" />
              2D Blueprint
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditor(!showEditor)}
            className={`border-blue-800/40 text-sm ${showEditor ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-[#0d2040] text-blue-300 hover:bg-blue-900/50 hover:text-blue-200"}`}
          >
            <Edit3 className="w-3.5 h-3.5 mr-1.5" />
            Customize
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadSVG} className="border-blue-800/40 bg-[#0d2040] text-blue-300 hover:bg-blue-900/50 hover:text-blue-200">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            SVG
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPNG} className="border-blue-800/40 bg-[#0d2040] text-blue-300 hover:bg-blue-900/50 hover:text-blue-200">
            <FileImage className="w-3.5 h-3.5 mr-1.5" />
            PNG
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className={`rounded-xl overflow-hidden border border-blue-900/50 bg-[#0a1628] shadow-lg shadow-blue-900/20 ${showEditor ? 'flex-1' : 'w-full'}`} style={{ minHeight: "550px" }}>
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
              className="w-full overflow-auto p-4"
              style={{ minHeight: "550px", background: "#0a1628" }}
              dangerouslySetInnerHTML={{ __html: svgString }}
            />
          )}
        </div>

        {showEditor && (
          <div className="w-80 bg-[#0d2040] rounded-xl border border-blue-800/40 shadow-lg p-4 overflow-y-auto" style={{ maxHeight: "550px" }}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-blue-300">Blueprint Editor</h4>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-400 hover:text-blue-200" onClick={() => setShowEditor(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <Button
              size="sm"
              className="w-full mb-4 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setAddingRoom(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Room
            </Button>

            {addingRoom && (
              <div className="mb-4 p-3 rounded-lg bg-[#0a1628] border border-blue-800/40 space-y-3">
                <div className="text-xs font-semibold text-blue-300 mb-2">New Room</div>
                <div>
                  <Label className="text-xs text-blue-400">Name</Label>
                  <Input
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                    placeholder="Room name"
                    className="h-8 text-xs bg-[#0d2040] border-blue-800/40 text-blue-200"
                  />
                </div>
                <div>
                  <Label className="text-xs text-blue-400">Type</Label>
                  <Select value={newRoom.type} onValueChange={(v) => setNewRoom({ ...newRoom, type: v })}>
                    <SelectTrigger className="h-8 text-xs bg-[#0d2040] border-blue-800/40 text-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-blue-400">Floor</Label>
                  <Select value={String(newRoom.floor)} onValueChange={(v) => setNewRoom({ ...newRoom, floor: parseInt(v) })}>
                    <SelectTrigger className="h-8 text-xs bg-[#0d2040] border-blue-800/40 text-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {blueprint.floors.map((f, i) => (
                        <SelectItem key={i} value={String(i)}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-blue-400">X (ft)</Label>
                    <Input type="number" value={newRoom.x} onChange={(e) => setNewRoom({ ...newRoom, x: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs bg-[#0d2040] border-blue-800/40 text-blue-200" />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-400">Y (ft)</Label>
                    <Input type="number" value={newRoom.y} onChange={(e) => setNewRoom({ ...newRoom, y: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs bg-[#0d2040] border-blue-800/40 text-blue-200" />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-400">Width (ft)</Label>
                    <Input type="number" value={newRoom.width} onChange={(e) => setNewRoom({ ...newRoom, width: parseFloat(e.target.value) || 5 })}
                      className="h-8 text-xs bg-[#0d2040] border-blue-800/40 text-blue-200" />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-400">Height (ft)</Label>
                    <Input type="number" value={newRoom.height} onChange={(e) => setNewRoom({ ...newRoom, height: parseFloat(e.target.value) || 5 })}
                      className="h-8 text-xs bg-[#0d2040] border-blue-800/40 text-blue-200" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs" onClick={handleAddRoom}>
                    <Check className="w-3 h-3 mr-1" /> Add
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs border-blue-800/40 text-blue-400" onClick={() => setAddingRoom(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {editingRoom && currentEditRoom && (
              <div className="mb-4 p-3 rounded-lg bg-[#0a1628] border border-blue-400/40 space-y-3">
                <div className="text-xs font-semibold text-blue-300">Editing: {currentEditRoom.name}</div>
                <div>
                  <Label className="text-xs text-blue-400">Name</Label>
                  <Input
                    value={currentEditRoom.name}
                    onChange={(e) => handleUpdateRoom(editingRoom.floorIdx, editingRoom.roomId, { name: e.target.value })}
                    className="h-8 text-xs bg-[#0d2040] border-blue-800/40 text-blue-200"
                  />
                </div>
                <div>
                  <Label className="text-xs text-blue-400">Type</Label>
                  <Select value={currentEditRoom.type} onValueChange={(v) => handleUpdateRoom(editingRoom.floorIdx, editingRoom.roomId, { type: v })}>
                    <SelectTrigger className="h-8 text-xs bg-[#0d2040] border-blue-800/40 text-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-blue-400">Width (ft)</Label>
                    <Input type="number" value={currentEditRoom.width}
                      onChange={(e) => handleUpdateRoom(editingRoom.floorIdx, editingRoom.roomId, { width: parseFloat(e.target.value) || 5 })}
                      className="h-8 text-xs bg-[#0d2040] border-blue-800/40 text-blue-200" />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-400">Height (ft)</Label>
                    <Input type="number" value={currentEditRoom.height}
                      onChange={(e) => handleUpdateRoom(editingRoom.floorIdx, editingRoom.roomId, { height: parseFloat(e.target.value) || 5 })}
                      className="h-8 text-xs bg-[#0d2040] border-blue-800/40 text-blue-200" />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-400">X (ft)</Label>
                    <Input type="number" value={currentEditRoom.x}
                      onChange={(e) => handleUpdateRoom(editingRoom.floorIdx, editingRoom.roomId, { x: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs bg-[#0d2040] border-blue-800/40 text-blue-200" />
                  </div>
                  <div>
                    <Label className="text-xs text-blue-400">Y (ft)</Label>
                    <Input type="number" value={currentEditRoom.y}
                      onChange={(e) => handleUpdateRoom(editingRoom.floorIdx, editingRoom.roomId, { y: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs bg-[#0d2040] border-blue-800/40 text-blue-200" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs border-red-800/40 text-red-400 hover:bg-red-900/30"
                    onClick={() => handleDeleteRoom(editingRoom.floorIdx, editingRoom.roomId)}>
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs border-blue-800/40 text-blue-400"
                    onClick={() => setEditingRoom(null)}>
                    Done
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {blueprint.floors.map((floor, floorIdx) => (
                <div key={floor.floor} className="mb-3">
                  <div className="text-xs font-semibold text-blue-400 mb-1.5 px-1">{floor.label}</div>
                  {floor.rooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setEditingRoom({ floorIdx, roomId: room.id })}
                      className={`w-full flex items-center justify-between p-2 rounded text-left text-xs transition-all ${
                        editingRoom?.roomId === room.id
                          ? "bg-blue-600/20 border border-blue-400/40 text-blue-200"
                          : "hover:bg-blue-900/30 text-blue-400/80"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: room.type === "corridor" ? "#3d7ab5" : room.type === "bedroom" ? "#5ba3d9" : room.type === "living" ? "#4ecdc4" : room.type === "kitchen" ? "#7ec8e3" : room.type === "bathroom" ? "#64b5f6" : "#4a9eff" }} />
                        <span className="truncate max-w-[120px]">{room.name}</span>
                      </div>
                      <span className="text-blue-500/50 text-[10px]">{Math.round(room.width)}x{Math.round(room.height)}ft</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#0d2040] rounded-xl border border-blue-800/40 shadow-lg shadow-blue-900/20 p-4">
        <h4 className="text-sm font-semibold text-blue-300 mb-3">Component View</h4>
        <p className="text-xs text-blue-500/70 mb-3">
          Click a component to see its isolated blueprint
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {COMPONENT_FILTERS.map((cf) => {
            const isActive = activeFilter === cf.id;
            return (
              <button
                key={cf.id}
                onClick={() => setActiveFilter(cf.id)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left text-sm font-medium ${
                  isActive
                    ? "border-blue-400 bg-blue-600/20 text-blue-200 shadow-sm shadow-blue-500/20"
                    : "border-blue-800/40 bg-[#0a1628] text-blue-400/80 hover:border-blue-600/50 hover:text-blue-300 hover:bg-blue-900/30"
                }`}
              >
                <span>{cf.icon}</span>
                <span>{cf.label}</span>
              </button>
            );
          })}
        </div>

        {activeFilter === "single_flat" && totalFlats > 1 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-blue-500/70">Select flat:</span>
            {Array.from({ length: totalFlats }).map((_, i) => (
              <Button
                key={i}
                variant={selectedFlatIdx === i ? "default" : "outline"}
                size="sm"
                className={`h-7 text-xs ${selectedFlatIdx === i ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-blue-800/40 text-blue-400 hover:text-blue-300 hover:bg-blue-900/50"}`}
                onClick={() => setSelectedFlatIdx(i)}
              >
                Flat {i + 1}
              </Button>
            ))}
          </div>
        )}

        {activeFilter === "floors" && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-blue-500/70">Select floor:</span>
            {blueprint.floors.map((f) => (
              <Button
                key={f.floor}
                variant={activeFloor === f.floor ? "default" : "outline"}
                size="sm"
                className={`h-7 text-xs ${activeFloor === f.floor ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-blue-800/40 text-blue-400 hover:text-blue-300 hover:bg-blue-900/50"}`}
                onClick={() => setActiveFloor(f.floor)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
