import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { FloorPlan, Room } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Layers, Eye, ChevronUp, ChevronDown, Play, Pause } from "lucide-react";

interface Building3DViewerProps {
  floors: FloorPlan[];
  width: number;
  depth: number;
  activeFloor: number;
  onFloorChange: (floor: number) => void;
}

const FLOOR_HEIGHT = 3.2;
const SCALE = 0.25;
const WALL_THICKNESS = 0.08;

const ROOM_EDGE_COLORS: Record<string, string> = {
  bedroom: "#5ba3d9",
  living: "#4ecdc4",
  kitchen: "#7ec8e3",
  bathroom: "#64b5f6",
  corridor: "#3d7ab5",
  staircase: "#5ba3d9",
  elevator: "#42a5f5",
  lobby: "#64b5f6",
  dining: "#4dd0e1",
  balcony: "#26c6da",
  storage: "#546e7a",
  utility: "#4a7c9b",
  parking: "#37687e",
  office: "#4fc3f7",
  laundry: "#80deea",
  other: "#4a9eff",
};

const ROOM_HEIGHTS: Record<string, number> = {
  corridor: 0.35,
  balcony: 0.6,
  bathroom: 0.85,
  elevator: 1.0,
  staircase: 1.0,
  parking: 0.5,
};

function getRoomEdgeColor(type: string): string {
  return ROOM_EDGE_COLORS[type] || "#7ec8e3";
}

function getRoomWallHeight(type: string): number {
  return (ROOM_HEIGHTS[type] || 0.88) * FLOOR_HEIGHT;
}

function WallSegment({ x, y, z, w, h, d, color, opacity }: {
  x: number; y: number; z: number;
  w: number; h: number; d: number;
  color: string; opacity: number;
}) {
  return (
    <group>
      <mesh position={[x, y, z]}>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.08} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments position={[x, y, z]}>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color={color} transparent opacity={opacity * 0.9} />
      </lineSegments>
    </group>
  );
}

function RoomWithWalls({ room, floorIndex, isActive, totalWidth, totalDepth, allRooms }: {
  room: Room;
  floorIndex: number;
  isActive: boolean;
  totalWidth: number;
  totalDepth: number;
  allRooms: Room[];
}) {
  const [hovered, setHovered] = useState(false);

  const wallHeight = getRoomWallHeight(room.type);
  const yBase = floorIndex * FLOOR_HEIGHT;
  const xPos = (room.x + room.width / 2 - totalWidth / 2) * SCALE;
  const zPos = (room.y + room.height / 2 - totalDepth / 2) * SCALE;
  const roomWidth = room.width * SCALE;
  const roomDepth = room.height * SCALE;

  const edgeColor = getRoomEdgeColor(room.type);
  const activeOpacity = hovered ? 1 : 0.8;
  const opacity = isActive ? activeOpacity : 0.25;

  const floorY = yBase + 0.02;
  const wallY = yBase + wallHeight / 2;

  return (
    <group
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[xPos, floorY, zPos]}>
        <boxGeometry args={[roomWidth, 0.04, roomDepth]} />
        <meshBasicMaterial color={edgeColor} transparent opacity={opacity * 0.12} depthWrite={false} />
      </mesh>
      <lineSegments position={[xPos, floorY, zPos]}>
        <edgesGeometry args={[new THREE.BoxGeometry(roomWidth, 0.04, roomDepth)]} />
        <lineBasicMaterial color={edgeColor} transparent opacity={opacity * 0.5} />
      </lineSegments>

      <WallSegment x={xPos - roomWidth / 2 + WALL_THICKNESS / 2} y={wallY} z={zPos}
        w={WALL_THICKNESS} h={wallHeight} d={roomDepth} color={edgeColor} opacity={opacity} />
      <WallSegment x={xPos + roomWidth / 2 - WALL_THICKNESS / 2} y={wallY} z={zPos}
        w={WALL_THICKNESS} h={wallHeight} d={roomDepth} color={edgeColor} opacity={opacity} />
      <WallSegment x={xPos} y={wallY} z={zPos - roomDepth / 2 + WALL_THICKNESS / 2}
        w={roomWidth} h={wallHeight} d={WALL_THICKNESS} color={edgeColor} opacity={opacity} />
      <WallSegment x={xPos} y={wallY} z={zPos + roomDepth / 2 - WALL_THICKNESS / 2}
        w={roomWidth} h={wallHeight} d={WALL_THICKNESS} color={edgeColor} opacity={opacity} />

      {isActive && roomWidth > 0.8 && roomDepth > 0.5 && (
        <Text
          position={[xPos, yBase + 0.15, zPos]}
          fontSize={Math.min(roomWidth, roomDepth) * 0.1}
          color={hovered ? "#ffffff" : "#b0d4f1"}
          anchorX="center"
          anchorY="middle"
          rotation={[-Math.PI / 2, 0, 0]}
          maxWidth={roomWidth * 0.85}
        >
          {room.name}
        </Text>
      )}
    </group>
  );
}

function ExteriorWalls({ width, depth, floorIndex, floors }: {
  width: number; depth: number; floorIndex: number; floors: number;
}) {
  const yBase = floorIndex * FLOOR_HEIGHT;
  const wallH = FLOOR_HEIGHT * 0.92;
  const wallY = yBase + wallH / 2;
  const w = width * SCALE;
  const d = depth * SCALE;
  const t = WALL_THICKNESS * 2;

  return (
    <group>
      <WallSegment x={-w / 2 - t / 2} y={wallY} z={0} w={t} h={wallH} d={d + t * 2} color="#4a9eff" opacity={0.5} />
      <WallSegment x={w / 2 + t / 2} y={wallY} z={0} w={t} h={wallH} d={d + t * 2} color="#4a9eff" opacity={0.5} />
      <WallSegment x={0} y={wallY} z={-d / 2 - t / 2} w={w + t * 2} h={wallH} d={t} color="#4a9eff" opacity={0.5} />
      <WallSegment x={0} y={wallY} z={d / 2 + t / 2} w={w + t * 2} h={wallH} d={t} color="#4a9eff" opacity={0.5} />
    </group>
  );
}

function FloorSlab({ floorIndex, width, depth }: {
  floorIndex: number;
  width: number;
  depth: number;
}) {
  const yPos = floorIndex * FLOOR_HEIGHT;
  const slabWidth = (width + 1) * SCALE;
  const slabDepth = (depth + 1) * SCALE;

  return (
    <group>
      <mesh position={[0, yPos - 0.06, 0]}>
        <boxGeometry args={[slabWidth, 0.08, slabDepth]} />
        <meshBasicMaterial color="#1a4a7a" transparent opacity={0.25} />
      </mesh>
      <lineSegments position={[0, yPos - 0.06, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(slabWidth, 0.08, slabDepth)]} />
        <lineBasicMaterial color="#4a9eff" transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}

function StaircaseVisual({ room, fromFloor, totalWidth, totalDepth }: {
  room: Room; fromFloor: number; totalWidth: number; totalDepth: number;
}) {
  const xPos = (room.x + room.width / 2 - totalWidth / 2) * SCALE;
  const zPos = (room.y + room.height / 2 - totalDepth / 2) * SCALE;
  const steps = 10;
  const stepH = FLOOR_HEIGHT / steps;
  const stepD = (room.height * SCALE) / steps;

  return (
    <group>
      {Array.from({ length: steps }).map((_, i) => (
        <group key={i}>
          <lineSegments position={[
            xPos,
            fromFloor * FLOOR_HEIGHT + stepH * (i + 0.5),
            zPos - (room.height * SCALE) / 2 + stepD * (i + 0.5),
          ]}>
            <edgesGeometry args={[new THREE.BoxGeometry(room.width * SCALE * 0.6, stepH * 0.8, stepD * 0.85)]} />
            <lineBasicMaterial color="#5ba3d9" transparent opacity={0.5} />
          </lineSegments>
        </group>
      ))}
    </group>
  );
}

function ElevatorShaft({ room, totalFloors, totalWidth, totalDepth }: {
  room: Room; totalFloors: number; totalWidth: number; totalDepth: number;
}) {
  const xPos = (room.x + room.width / 2 - totalWidth / 2) * SCALE;
  const zPos = (room.y + room.height / 2 - totalDepth / 2) * SCALE;
  const shaftHeight = totalFloors * FLOOR_HEIGHT;
  const cabRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (cabRef.current) {
      const t = (Math.sin(state.clock.elapsedTime * 0.4) + 1) / 2;
      cabRef.current.position.y = t * (shaftHeight - FLOOR_HEIGHT * 0.6) + FLOOR_HEIGHT * 0.3;
    }
  });

  return (
    <group>
      <lineSegments position={[xPos, shaftHeight / 2, zPos]}>
        <edgesGeometry args={[new THREE.BoxGeometry(room.width * SCALE * 0.85, shaftHeight, room.height * SCALE * 0.85)]} />
        <lineBasicMaterial color="#4a9eff" transparent opacity={0.3} />
      </lineSegments>

      {Array.from({ length: totalFloors }).map((_, i) => (
        <lineSegments key={i} position={[xPos, i * FLOOR_HEIGHT + FLOOR_HEIGHT / 2, zPos]}>
          <edgesGeometry args={[new THREE.BoxGeometry(room.width * SCALE * 0.85, 0.01, room.height * SCALE * 0.85)]} />
          <lineBasicMaterial color="#4a9eff" transparent opacity={0.2} />
        </lineSegments>
      ))}

      <group ref={cabRef}>
        <mesh position={[xPos, 0, zPos]}>
          <boxGeometry args={[room.width * SCALE * 0.65, FLOOR_HEIGHT * 0.4, room.height * SCALE * 0.65]} />
          <meshBasicMaterial color="#4a9eff" transparent opacity={0.15} depthWrite={false} />
        </mesh>
        <lineSegments position={[xPos, 0, zPos]}>
          <edgesGeometry args={[new THREE.BoxGeometry(room.width * SCALE * 0.65, FLOOR_HEIGHT * 0.4, room.height * SCALE * 0.65)]} />
          <lineBasicMaterial color="#7ec8e3" />
        </lineSegments>
      </group>
    </group>
  );
}

function BuildingModel({ floors, width, depth, activeFloor }: {
  floors: FloorPlan[]; width: number; depth: number; activeFloor: number;
}) {
  const elevatorRooms = useMemo(() => {
    const elev: Room[] = [];
    for (const f of floors) {
      for (const r of f.rooms) {
        if (r.type === "elevator" && !elev.find(e => Math.abs(e.x - r.x) < 1 && Math.abs(e.y - r.y) < 1)) {
          elev.push(r);
        }
      }
    }
    return elev;
  }, [floors]);

  return (
    <group>
      {floors.map((floor, floorIdx) => (
        <group key={floor.floor}>
          <FloorSlab floorIndex={floorIdx} width={width} depth={depth} />
          <ExteriorWalls width={width} depth={depth} floorIndex={floorIdx} floors={floors.length} />
          {floor.rooms.filter(r => r.type !== "elevator").map((room) => (
            <RoomWithWalls
              key={room.id}
              room={room}
              floorIndex={floorIdx}
              isActive={activeFloor === -1 || activeFloor === floorIdx}
              totalWidth={width}
              totalDepth={depth}
              allRooms={floor.rooms}
            />
          ))}
          {floor.rooms
            .filter((r) => r.type === "staircase" && floorIdx < floors.length - 1)
            .map((stairRoom) => (
              <StaircaseVisual
                key={`stairs-${stairRoom.id}`}
                room={stairRoom}
                fromFloor={floorIdx}
                totalWidth={width}
                totalDepth={depth}
              />
            ))}
        </group>
      ))}

      {elevatorRooms.map((elevRoom, i) => (
        <ElevatorShaft
          key={`shaft-${i}`}
          room={elevRoom}
          totalFloors={floors.length}
          totalWidth={width}
          totalDepth={depth}
        />
      ))}

      <FloorSlab floorIndex={floors.length} width={width} depth={depth} />

      <group position={[0, -0.12, 0]}>
        <gridHelper args={[Math.max(width, depth) * SCALE * 2.5, 30, "#1a4a7a", "#0d2847"]} />
      </group>
    </group>
  );
}

function CameraSetup({ width, depth, totalHeight }: { width: number; depth: number; totalHeight: number }) {
  const { camera } = useThree();
  const initialized = useRef(false);

  useFrame(() => {
    if (!initialized.current) {
      const maxDim = Math.max(width, depth) * SCALE;
      const dist = maxDim * 2 + totalHeight * 0.5;
      camera.position.set(dist * 0.8, totalHeight * 0.7, dist * 0.8);
      camera.lookAt(0, totalHeight * 0.3, 0);
      initialized.current = true;
    }
  });

  return null;
}

export function Building3DViewer({ floors, width, depth, activeFloor, onFloorChange }: Building3DViewerProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewMode, setViewMode] = useState<"all" | "single">("all");
  const totalHeight = floors.length * FLOOR_HEIGHT;
  const displayFloor = viewMode === "all" ? -1 : activeFloor;

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-blue-900/50" style={{ height: "550px" }}>
      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={["#060e1a"]} />
        <fog attach="fog" args={["#060e1a", 20, 50]} />

        <PerspectiveCamera
          makeDefault
          position={[width * SCALE * 1.5, totalHeight * 0.8, depth * SCALE * 1.5]}
          fov={45}
          near={0.1}
          far={100}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={40}
          maxPolarAngle={Math.PI / 2.05}
          autoRotate={autoRotate}
          autoRotateSpeed={0.8}
        />

        <ambientLight intensity={0.2} color="#4a9eff" />
        <pointLight position={[10, 20, 10]} intensity={0.1} color="#ffffff" />

        <BuildingModel
          floors={floors}
          width={width}
          depth={depth}
          activeFloor={displayFloor}
        />

        <CameraSetup width={width} depth={depth} totalHeight={totalHeight} />
      </Canvas>

      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <div className="bg-[#0d2040]/90 backdrop-blur-sm rounded-lg shadow-lg shadow-blue-900/30 border border-blue-800/40 p-2 flex flex-col gap-1">
          <Button
            variant={viewMode === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("all")}
            className={`justify-start text-xs ${viewMode === "all" ? "bg-blue-600 hover:bg-blue-700" : "text-blue-300 hover:text-blue-200 hover:bg-blue-900/50"}`}
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            All Floors
          </Button>
          <Button
            variant={viewMode === "single" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("single")}
            className={`justify-start text-xs ${viewMode === "single" ? "bg-blue-600 hover:bg-blue-700" : "text-blue-300 hover:text-blue-200 hover:bg-blue-900/50"}`}
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            Single Floor
          </Button>
        </div>

        {viewMode === "single" && (
          <div className="bg-[#0d2040]/90 backdrop-blur-sm rounded-lg shadow-lg shadow-blue-900/30 border border-blue-800/40 p-2 flex flex-col gap-1">
            {floors.map((floor, idx) => (
              <Button
                key={floor.floor}
                variant={activeFloor === idx ? "default" : "ghost"}
                size="sm"
                onClick={() => onFloorChange(idx)}
                className={`justify-start text-xs ${activeFloor === idx ? "bg-blue-600 hover:bg-blue-700" : "text-blue-300 hover:text-blue-200 hover:bg-blue-900/50"}`}
              >
                {floor.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 z-10">
        <div className="bg-[#0d2040]/90 backdrop-blur-sm rounded-lg shadow-lg shadow-blue-900/30 border border-blue-800/40 p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-300 hover:text-blue-200 hover:bg-blue-900/50"
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? "Stop rotation" : "Auto rotate"}
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {viewMode === "single" && (
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-[#0d2040]/90 border border-blue-800/40 text-blue-300 hover:text-blue-200 hover:bg-blue-900/50 shadow-lg"
            onClick={() => onFloorChange(Math.min(activeFloor + 1, floors.length - 1))}
            disabled={activeFloor >= floors.length - 1}
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <div className="bg-[#0d2040]/90 backdrop-blur-sm rounded-lg shadow-lg border border-blue-800/40 px-2 py-1 text-center text-xs font-medium text-blue-300">
            {floors[activeFloor]?.label}
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-[#0d2040]/90 border border-blue-800/40 text-blue-300 hover:text-blue-200 hover:bg-blue-900/50 shadow-lg"
            onClick={() => onFloorChange(Math.max(activeFloor - 1, 0))}
            disabled={activeFloor <= 0}
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-[#0d2040]/90 backdrop-blur-sm rounded-lg shadow-lg shadow-blue-900/30 border border-blue-800/40 p-3">
          <div className="text-xs font-semibold mb-2 text-blue-300">Room Types</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {[
              { type: "living", label: "Living" },
              { type: "bedroom", label: "Bedroom" },
              { type: "kitchen", label: "Kitchen" },
              { type: "bathroom", label: "Bathroom" },
              { type: "corridor", label: "Corridor" },
              { type: "staircase", label: "Stairs" },
              { type: "elevator", label: "Elevator" },
              { type: "dining", label: "Dining" },
              { type: "balcony", label: "Balcony" },
            ].map(({ type, label }) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ border: `1.5px solid ${getRoomEdgeColor(type)}` }} />
                <span className="text-[10px] text-blue-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
