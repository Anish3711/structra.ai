import { useState, useEffect, useRef } from "react";
import { Stage, Layer, Rect, Text, Group, Line } from "react-konva";
import { BlueprintResult } from "@/hooks/use-construction";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BlueprintEditorProps {
  initialData: BlueprintResult;
  onUpdate: (data: BlueprintResult) => void;
}

export function BlueprintEditor({ initialData, onUpdate }: BlueprintEditorProps) {
  const [data, setData] = useState<BlueprintResult>(initialData);
  const [scale, setScale] = useState(1);
  const stageRef = useRef<any>(null);

  // Constants for rendering
  const PADDING = 50;
  const PIXELS_PER_FOOT = 20;

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleDragEnd = (e: any, roomId: string) => {
    const newData = { ...data };
    const room = newData.rooms.find((r) => r.id === roomId);
    if (room) {
      // Snap to grid (1 ft increments)
      const x = Math.round((e.target.x() - PADDING) / PIXELS_PER_FOOT);
      const y = Math.round((e.target.y() - PADDING) / PIXELS_PER_FOOT);
      
      room.x = Math.max(0, x);
      room.y = Math.max(0, y);
      
      // Update data state
      setData(newData);
      onUpdate(newData);
    }
  };

  const getRoomColor = (type: string) => {
    switch (type) {
      case 'bedroom': return '#bfdbfe'; // blue-200
      case 'living': return '#bbf7d0'; // green-200
      case 'kitchen': return '#fef08a'; // yellow-200
      case 'bathroom': return '#e5e7eb'; // gray-200
      default: return '#f3f4f6';
    }
  };

  const stageWidth = (data.width * PIXELS_PER_FOOT) + (PADDING * 2);
  const stageHeight = (data.depth * PIXELS_PER_FOOT) + (PADDING * 2);

  return (
    <div className="relative w-full overflow-hidden border rounded-xl bg-slate-50 shadow-inner">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={() => setScale(s => Math.min(s + 0.1, 2))}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={() => setScale(s => Math.max(s - 0.1, 0.5))}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
      </div>

      <div className="overflow-auto max-h-[600px] flex items-center justify-center p-8 bg-blueprint-grid">
        <Stage
          width={stageWidth * scale}
          height={stageHeight * scale}
          scaleX={scale}
          scaleY={scale}
          ref={stageRef}
          className="bg-white shadow-xl"
        >
          <Layer>
            {/* Grid Lines */}
            {Array.from({ length: data.width + 1 }).map((_, i) => (
              <Line
                key={`v-${i}`}
                points={[
                  PADDING + (i * PIXELS_PER_FOOT), 
                  PADDING, 
                  PADDING + (i * PIXELS_PER_FOOT), 
                  PADDING + (data.depth * PIXELS_PER_FOOT)
                ]}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
            ))}
            {Array.from({ length: data.depth + 1 }).map((_, i) => (
              <Line
                key={`h-${i}`}
                points={[
                  PADDING, 
                  PADDING + (i * PIXELS_PER_FOOT), 
                  PADDING + (data.width * PIXELS_PER_FOOT), 
                  PADDING + (i * PIXELS_PER_FOOT)
                ]}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
            ))}

            {/* Rooms */}
            {data.rooms.map((room) => (
              <Group
                key={room.id}
                x={PADDING + (room.x * PIXELS_PER_FOOT)}
                y={PADDING + (room.y * PIXELS_PER_FOOT)}
                draggable
                onDragEnd={(e) => handleDragEnd(e, room.id)}
              >
                <Rect
                  width={room.width * PIXELS_PER_FOOT}
                  height={room.height * PIXELS_PER_FOOT}
                  fill={getRoomColor(room.type)}
                  stroke="#334155"
                  strokeWidth={2}
                  shadowColor="black"
                  shadowBlur={5}
                  shadowOpacity={0.1}
                />
                <Text
                  text={`${room.name}\n${room.width}' x ${room.height}'`}
                  width={room.width * PIXELS_PER_FOOT}
                  height={room.height * PIXELS_PER_FOOT}
                  align="center"
                  verticalAlign="middle"
                  fontFamily="Inter, sans-serif"
                  fontSize={12}
                  fontStyle="bold"
                  fill="#1e293b"
                />
              </Group>
            ))}

            {/* Boundary */}
            <Rect
              x={PADDING}
              y={PADDING}
              width={data.width * PIXELS_PER_FOOT}
              height={data.depth * PIXELS_PER_FOOT}
              stroke="#0f172a"
              strokeWidth={4}
              listening={false}
            />
          </Layer>
        </Stage>
      </div>
      
      <div className="p-4 bg-white border-t text-sm text-muted-foreground flex justify-between">
        <div>Total Area: {data.width * data.depth} sq. ft.</div>
        <div>Drag rooms to rearrange layout</div>
      </div>
    </div>
  );
}
