import { useState, useEffect, useRef } from "react";
import { Stage, Layer, Rect, Text, Group, Line } from "react-konva";
import { BlueprintResult } from "@/hooks/use-construction";
import { ZoomIn, ZoomOut, Plus, Trash2, Move, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROOM_TYPES, type RoomType, type Room, type FloorPlan } from "@shared/schema";

interface BlueprintEditorProps {
  initialData: BlueprintResult;
  onUpdate: (data: BlueprintResult) => void;
}

const ROOM_COLOR_MAP: Record<string, string> = {
  bedroom: '#bfdbfe',
  living: '#bbf7d0',
  kitchen: '#fef08a',
  bathroom: '#c4b5fd',
  corridor: '#e5e7eb',
  staircase: '#fdba74',
  elevator: '#93c5fd',
  lobby: '#c4b5fd',
  dining: '#fca5a5',
  balcony: '#6ee7b7',
  storage: '#d1d5db',
  utility: '#a8a29e',
  parking: '#e7e5e4',
  office: '#bae6fd',
  laundry: '#fde047',
  other: '#f9a8d4',
};

function getRoomColor(type: string) {
  return ROOM_COLOR_MAP[type] || '#f3f4f6';
}

export function BlueprintEditor({ initialData, onUpdate }: BlueprintEditorProps) {
  const [data, setData] = useState<BlueprintResult>(initialData);
  const [scale, setScale] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [activeFloorIdx, setActiveFloorIdx] = useState(0);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: "", type: "bedroom" as RoomType, width: 10, height: 10 });
  const stageRef = useRef<any>(null);

  const PADDING = 50;
  const PIXELS_PER_FOOT = 15;

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const hasFloors = data.floors && data.floors.length > 0;
  const currentFloor = hasFloors ? data.floors![activeFloorIdx] : null;
  const displayRooms = currentFloor ? currentFloor.rooms : data.rooms;

  const updateFloorRooms = (rooms: Room[]) => {
    const newData = { ...data };
    if (hasFloors && newData.floors) {
      newData.floors = newData.floors.map((f, idx) =>
        idx === activeFloorIdx ? { ...f, rooms } : f
      );
      if (activeFloorIdx === 0) {
        newData.rooms = rooms;
      }
    } else {
      newData.rooms = rooms;
    }
    setData(newData);
    onUpdate(newData);
  };

  const handleDragEnd = (e: any, roomId: string) => {
    const room = displayRooms.find((r) => r.id === roomId);
    if (room) {
      const x = Math.max(0, Math.min(Math.round((e.target.x() - PADDING) / PIXELS_PER_FOOT), data.width - room.width));
      const y = Math.max(0, Math.min(Math.round((e.target.y() - PADDING) / PIXELS_PER_FOOT), data.depth - room.height));
      const updatedRooms = displayRooms.map(r =>
        r.id === roomId ? { ...r, x, y } : r
      );
      updateFloorRooms(updatedRooms);
    }
  };

  const handleDeleteRoom = (roomId: string) => {
    const updatedRooms = displayRooms.filter(r => r.id !== roomId);
    updateFloorRooms(updatedRooms);
    setSelectedRoom(null);
  };

  const handleAddRoom = () => {
    if (!newRoom.name) return;
    const prefix = hasFloors ? `f${activeFloorIdx + 1}` : 'r';
    const id = `${prefix}-${newRoom.type}-${Date.now().toString(36)}`;
    const room: Room = {
      id,
      name: newRoom.name,
      x: 0,
      y: 0,
      width: Math.min(newRoom.width, data.width),
      height: Math.min(newRoom.height, data.depth),
      type: newRoom.type,
    };
    const updatedRooms = [...displayRooms, room];
    updateFloorRooms(updatedRooms);
    setShowAddRoom(false);
    setNewRoom({ name: "", type: "bedroom", width: 10, height: 10 });
  };

  const handleResizeRoom = (roomId: string, newWidth: number, newHeight: number) => {
    const updatedRooms = displayRooms.map(r =>
      r.id === roomId
        ? { ...r, width: Math.min(newWidth, data.width - r.x), height: Math.min(newHeight, data.depth - r.y) }
        : r
    );
    updateFloorRooms(updatedRooms);
  };

  const handleChangeType = (roomId: string, newType: RoomType) => {
    const updatedRooms = displayRooms.map(r =>
      r.id === roomId ? { ...r, type: newType } : r
    );
    updateFloorRooms(updatedRooms);
  };

  const handleRenameRoom = (roomId: string, newName: string) => {
    const updatedRooms = displayRooms.map(r =>
      r.id === roomId ? { ...r, name: newName } : r
    );
    updateFloorRooms(updatedRooms);
  };

  const stageWidth = (data.width * PIXELS_PER_FOOT) + (PADDING * 2);
  const stageHeight = (data.depth * PIXELS_PER_FOOT) + (PADDING * 2);

  const selectedRoomData = selectedRoom ? displayRooms.find(r => r.id === selectedRoom) : null;

  return (
    <div className="relative w-full overflow-hidden border rounded-xl bg-slate-50 shadow-inner">
      <div className="flex items-center justify-between p-3 bg-white border-b">
        <div className="flex items-center gap-2">
          {hasFloors && data.floors!.length > 1 && (
            <Select value={String(activeFloorIdx)} onValueChange={(v) => { setActiveFloorIdx(Number(v)); setSelectedRoom(null); }}>
              <SelectTrigger className="w-[160px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.floors!.map((floor, idx) => (
                  <SelectItem key={idx} value={String(idx)}>{floor.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <span className="text-sm text-muted-foreground">
            {displayRooms.length} rooms | {data.width} x {data.depth} ft
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddRoom(true)} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Room
          </Button>
          <div className="flex gap-1">
            <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.min(s + 0.15, 2.5))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.max(s - 0.15, 0.4))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        <div className="flex-1 overflow-auto max-h-[550px] flex items-center justify-center p-4">
          <Stage
            width={stageWidth * scale}
            height={stageHeight * scale}
            scaleX={scale}
            scaleY={scale}
            ref={stageRef}
            className="bg-white shadow-xl"
            onClick={(e) => {
              if (e.target === e.target.getStage()) setSelectedRoom(null);
            }}
          >
            <Layer>
              {Array.from({ length: Math.floor(data.width / 5) + 1 }).map((_, i) => (
                <Line
                  key={`v-${i}`}
                  points={[PADDING + (i * 5 * PIXELS_PER_FOOT), PADDING, PADDING + (i * 5 * PIXELS_PER_FOOT), PADDING + (data.depth * PIXELS_PER_FOOT)]}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: Math.floor(data.depth / 5) + 1 }).map((_, i) => (
                <Line
                  key={`h-${i}`}
                  points={[PADDING, PADDING + (i * 5 * PIXELS_PER_FOOT), PADDING + (data.width * PIXELS_PER_FOOT), PADDING + (i * 5 * PIXELS_PER_FOOT)]}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                />
              ))}

              {displayRooms.map((room) => (
                <Group
                  key={room.id}
                  x={PADDING + (room.x * PIXELS_PER_FOOT)}
                  y={PADDING + (room.y * PIXELS_PER_FOOT)}
                  draggable
                  onDragEnd={(e) => handleDragEnd(e, room.id)}
                  onClick={() => setSelectedRoom(room.id)}
                  onTap={() => setSelectedRoom(room.id)}
                >
                  <Rect
                    width={room.width * PIXELS_PER_FOOT}
                    height={room.height * PIXELS_PER_FOOT}
                    fill={getRoomColor(room.type)}
                    stroke={selectedRoom === room.id ? "#2563eb" : "#334155"}
                    strokeWidth={selectedRoom === room.id ? 3 : 1.5}
                    shadowColor="black"
                    shadowBlur={selectedRoom === room.id ? 8 : 3}
                    shadowOpacity={selectedRoom === room.id ? 0.2 : 0.08}
                    cornerRadius={2}
                  />
                  <Text
                    text={`${room.name}\n${room.width}' x ${room.height}'`}
                    width={room.width * PIXELS_PER_FOOT}
                    height={room.height * PIXELS_PER_FOOT}
                    align="center"
                    verticalAlign="middle"
                    fontFamily="Inter, sans-serif"
                    fontSize={Math.min(11, Math.min(room.width, room.height) * PIXELS_PER_FOOT * 0.12)}
                    fontStyle="600"
                    fill="#1e293b"
                  />
                </Group>
              ))}

              <Rect
                x={PADDING}
                y={PADDING}
                width={data.width * PIXELS_PER_FOOT}
                height={data.depth * PIXELS_PER_FOOT}
                stroke="#0f172a"
                strokeWidth={3}
                listening={false}
              />

              {Array.from({ length: Math.floor(data.width / 10) + 1 }).map((_, i) => (
                <Text
                  key={`dim-x-${i}`}
                  x={PADDING + (i * 10 * PIXELS_PER_FOOT) - 10}
                  y={PADDING - 18}
                  text={`${i * 10}'`}
                  fontSize={9}
                  fill="#94a3b8"
                  fontFamily="Inter, sans-serif"
                />
              ))}
              {Array.from({ length: Math.floor(data.depth / 10) + 1 }).map((_, i) => (
                <Text
                  key={`dim-y-${i}`}
                  x={PADDING - 25}
                  y={PADDING + (i * 10 * PIXELS_PER_FOOT) - 4}
                  text={`${i * 10}'`}
                  fontSize={9}
                  fill="#94a3b8"
                  fontFamily="Inter, sans-serif"
                />
              ))}
            </Layer>
          </Stage>
        </div>

        {selectedRoomData && (
          <div className="w-64 border-l bg-white p-4 space-y-4 overflow-y-auto max-h-[550px]">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Room Properties</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteRoom(selectedRoomData.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input className="h-8 text-sm" value={selectedRoomData.name} onChange={(e) => handleRenameRoom(selectedRoomData.id, e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={selectedRoomData.type} onValueChange={(v) => handleChangeType(selectedRoomData.id, v as RoomType)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map(t => (
                      <SelectItem key={t} value={t}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getRoomColor(t) }} />
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Width (ft)</Label>
                  <Input className="h-8 text-sm" type="number" min={3} max={data.width} value={selectedRoomData.width} onChange={(e) => handleResizeRoom(selectedRoomData.id, Number(e.target.value), selectedRoomData.height)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Height (ft)</Label>
                  <Input className="h-8 text-sm" type="number" min={3} max={data.depth} value={selectedRoomData.height} onChange={(e) => handleResizeRoom(selectedRoomData.id, selectedRoomData.width, Number(e.target.value))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">X Position</Label>
                  <div className="h-8 flex items-center text-sm text-muted-foreground px-2 bg-muted rounded">{selectedRoomData.x}'</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Y Position</Label>
                  <div className="h-8 flex items-center text-sm text-muted-foreground px-2 bg-muted rounded">{selectedRoomData.y}'</div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  Area: {selectedRoomData.width * selectedRoomData.height} sq ft
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddRoom && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-2xl space-y-4">
            <h3 className="font-semibold text-lg">Add New Room</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Room Name</Label>
                <Input className="h-9" value={newRoom.name} onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })} placeholder="e.g. Master Bedroom" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Room Type</Label>
                <Select value={newRoom.type} onValueChange={(v) => setNewRoom({ ...newRoom, type: v as RoomType })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map(t => (
                      <SelectItem key={t} value={t}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getRoomColor(t) }} />
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Width (ft)</Label>
                  <Input className="h-9" type="number" min={3} value={newRoom.width} onChange={(e) => setNewRoom({ ...newRoom, width: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Height (ft)</Label>
                  <Input className="h-9" type="number" min={3} value={newRoom.height} onChange={(e) => setNewRoom({ ...newRoom, height: Number(e.target.value) })} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddRoom(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleAddRoom} disabled={!newRoom.name}>Add Room</Button>
            </div>
          </div>
        </div>
      )}

      <div className="p-3 bg-white border-t text-sm text-muted-foreground flex justify-between items-center">
        <div className="flex gap-4">
          <span>Total Area: {data.width * data.depth} sq ft</span>
          <span>Rooms: {displayRooms.length}</span>
          {hasFloors && <span>Floor: {data.floors![activeFloorIdx]?.label}</span>}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Move className="w-3.5 h-3.5" /> Drag rooms to rearrange
          {selectedRoom && <span className="text-primary font-medium">| Click room to edit properties</span>}
        </div>
      </div>
    </div>
  );
}
