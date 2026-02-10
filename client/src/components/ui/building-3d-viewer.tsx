import { useRef, useState } from "react";
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

const FLOOR_HEIGHT = 3;
const SCALE = 0.3;

const ROOM_EDGE_COLORS: Record<string, string> = {
  bedroom: "#7ec8e3",
  living: "#9ed8db",
  kitchen: "#c4dfe6",
  bathroom: "#a8d8ea",
  corridor: "#5b88a5",
  staircase: "#87ceeb",
  elevator: "#69b4d0",
  lobby: "#90caf9",
  dining: "#b3e5fc",
  balcony: "#80cbc4",
  storage: "#78909c",
  utility: "#6d8fa3",
  parking: "#607d8b",
  office: "#81d4fa",
  laundry: "#80deea",
  other: "#b2dfdb",
};

function getRoomEdgeColor(type: string): string {
  return ROOM_EDGE_COLORS[type] || "#7ec8e3";
}

function WireframeRoom({ room, floorIndex, isActive, totalWidth, totalDepth }: {
  room: Room;
  floorIndex: number;
  isActive: boolean;
  totalWidth: number;
  totalDepth: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const wallHeight = room.type === "corridor" ? FLOOR_HEIGHT * 0.3 : FLOOR_HEIGHT * 0.85;
  const yPos = floorIndex * FLOOR_HEIGHT + wallHeight / 2;

  const xPos = (room.x + room.width / 2 - totalWidth / 2) * SCALE;
  const zPos = (room.y + room.height / 2 - totalDepth / 2) * SCALE;
  const roomWidth = room.width * SCALE;
  const roomDepth = room.height * SCALE;

  const edgeColor = getRoomEdgeColor(room.type);
  const activeOpacity = hovered ? 0.15 : 0.06;
  const inactiveOpacity = 0.02;

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[xPos, yPos, zPos]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[roomWidth - 0.05, wallHeight, roomDepth - 0.05]} />
        <meshBasicMaterial
          color={edgeColor}
          transparent
          opacity={isActive ? activeOpacity : inactiveOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <lineSegments position={[xPos, yPos, zPos]}>
        <edgesGeometry args={[new THREE.BoxGeometry(roomWidth - 0.05, wallHeight, roomDepth - 0.05)]} />
        <lineBasicMaterial
          color={isActive ? (hovered ? "#ffffff" : edgeColor) : "#2a5080"}
          transparent
          opacity={isActive ? (hovered ? 1 : 0.85) : 0.3}
        />
      </lineSegments>

      {isActive && (
        <Text
          position={[xPos, yPos + 0.1, zPos]}
          fontSize={Math.min(roomWidth, roomDepth) * 0.12}
          color="#b0d4f1"
          anchorX="center"
          anchorY="middle"
          rotation={[-Math.PI / 2, 0, 0]}
          maxWidth={roomWidth * 0.8}
        >
          {room.name}
        </Text>
      )}
    </group>
  );
}

function WireframeFloorSlab({ floorIndex, width, depth }: {
  floorIndex: number;
  width: number;
  depth: number;
}) {
  const yPos = floorIndex * FLOOR_HEIGHT;
  const slabWidth = width * SCALE;
  const slabDepth = depth * SCALE;

  return (
    <group>
      <mesh position={[0, yPos - 0.05, 0]}>
        <boxGeometry args={[slabWidth + 0.1, 0.06, slabDepth + 0.1]} />
        <meshBasicMaterial color="#1a4a7a" transparent opacity={0.3} />
      </mesh>
      <lineSegments position={[0, yPos - 0.05, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(slabWidth + 0.1, 0.06, slabDepth + 0.1)]} />
        <lineBasicMaterial color="#4a9eff" transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
}

function StaircaseConnector({ room, fromFloor, totalWidth, totalDepth }: {
  room: Room;
  fromFloor: number;
  totalWidth: number;
  totalDepth: number;
}) {
  const xPos = (room.x + room.width / 2 - totalWidth / 2) * SCALE;
  const zPos = (room.y + room.height / 2 - totalDepth / 2) * SCALE;

  const steps = 8;
  const stepHeight = FLOOR_HEIGHT / steps;
  const stepDepth = (room.height * SCALE) / steps;

  return (
    <group>
      {Array.from({ length: steps }).map((_, i) => {
        const pos: [number, number, number] = [
          xPos,
          fromFloor * FLOOR_HEIGHT + stepHeight * (i + 0.5),
          zPos - (room.height * SCALE) / 2 + stepDepth * (i + 0.5),
        ];
        return (
          <group key={i}>
            <lineSegments position={pos}>
              <edgesGeometry args={[new THREE.BoxGeometry(room.width * SCALE * 0.7, stepHeight * 0.9, stepDepth * 0.9)]} />
              <lineBasicMaterial color="#5ba3d9" transparent opacity={0.6} />
            </lineSegments>
          </group>
        );
      })}
    </group>
  );
}

function ElevatorShaft({ room, totalFloors, totalWidth, totalDepth }: {
  room: Room;
  totalFloors: number;
  totalWidth: number;
  totalDepth: number;
}) {
  const xPos = (room.x + room.width / 2 - totalWidth / 2) * SCALE;
  const zPos = (room.y + room.height / 2 - totalDepth / 2) * SCALE;
  const shaftHeight = totalFloors * FLOOR_HEIGHT;
  const cabRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (cabRef.current) {
      const t = (Math.sin(state.clock.elapsedTime * 0.5) + 1) / 2;
      cabRef.current.position.y = t * (shaftHeight - FLOOR_HEIGHT * 0.6) + FLOOR_HEIGHT * 0.3;
    }
  });

  return (
    <group>
      <lineSegments position={[xPos, shaftHeight / 2, zPos]}>
        <edgesGeometry args={[new THREE.BoxGeometry(room.width * SCALE * 0.9, shaftHeight, room.height * SCALE * 0.9)]} />
        <lineBasicMaterial color="#4a9eff" transparent opacity={0.4} />
      </lineSegments>

      <group ref={cabRef as any}>
        <lineSegments position={[xPos, FLOOR_HEIGHT * 0.3, zPos]}>
          <edgesGeometry args={[new THREE.BoxGeometry(room.width * SCALE * 0.7, FLOOR_HEIGHT * 0.5, room.height * SCALE * 0.7)]} />
          <lineBasicMaterial color="#7ec8e3" />
        </lineSegments>
        <mesh position={[xPos, FLOOR_HEIGHT * 0.3, zPos]}>
          <boxGeometry args={[room.width * SCALE * 0.7, FLOOR_HEIGHT * 0.5, room.height * SCALE * 0.7]} />
          <meshBasicMaterial color="#4a9eff" transparent opacity={0.1} />
        </mesh>
      </group>
    </group>
  );
}

function BlueprintGrid({ size }: { size: number }) {
  const gridSize = size;
  const divisions = Math.floor(size / 0.5);

  return (
    <group position={[0, -0.1, 0]}>
      <gridHelper args={[gridSize, divisions, "#1a4a7a", "#0d2847"]} />
    </group>
  );
}

function BuildingModel({ floors, width, depth, activeFloor }: {
  floors: FloorPlan[];
  width: number;
  depth: number;
  activeFloor: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const elevatorRooms = floors[0]?.rooms.filter(r => r.type === "elevator") || [];

  return (
    <group ref={groupRef}>
      {floors.map((floor, floorIdx) => (
        <group key={floor.floor}>
          <WireframeFloorSlab floorIndex={floorIdx} width={width} depth={depth} />
          {floor.rooms.map((room) => (
            <WireframeRoom
              key={room.id}
              room={room}
              floorIndex={floorIdx}
              isActive={activeFloor === -1 || activeFloor === floorIdx}
              totalWidth={width}
              totalDepth={depth}
            />
          ))}
          {floor.rooms
            .filter((r) => r.type === "staircase" && floorIdx < floors.length - 1)
            .map((stairRoom) => (
              <StaircaseConnector
                key={`stairs-${stairRoom.id}`}
                room={stairRoom}
                fromFloor={floorIdx}
                totalWidth={width}
                totalDepth={depth}
              />
            ))}
        </group>
      ))}

      {elevatorRooms.map((elevRoom) => (
        <ElevatorShaft
          key={`shaft-${elevRoom.id}`}
          room={elevRoom}
          totalFloors={floors.length}
          totalWidth={width}
          totalDepth={depth}
        />
      ))}

      <WireframeFloorSlab floorIndex={floors.length} width={width} depth={depth} />

      <BlueprintGrid size={Math.max(width, depth) * SCALE * 2} />
    </group>
  );
}

function CameraAnimation({ targetY, totalHeight }: { targetY: number; totalHeight: number }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, totalHeight * 0.6 + targetY * 0.3, delta * 2);
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
        <color attach="background" args={["#0a1628"]} />
        <fog attach="fog" args={["#0a1628", 15, 40]} />

        <PerspectiveCamera
          makeDefault
          position={[width * SCALE * 1.2, totalHeight * 0.8, depth * SCALE * 1.2]}
          fov={50}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={3}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate={autoRotate}
          autoRotateSpeed={1}
        />

        <ambientLight intensity={0.3} color="#4a9eff" />
        <directionalLight position={[10, 15, 10]} intensity={0.15} color="#ffffff" />

        <BuildingModel
          floors={floors}
          width={width}
          depth={depth}
          activeFloor={displayFloor}
        />

        <CameraAnimation
          targetY={activeFloor >= 0 ? activeFloor * FLOOR_HEIGHT : totalHeight / 2}
          totalHeight={totalHeight}
        />
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
        <div className="bg-[#0d2040]/90 backdrop-blur-sm rounded-lg shadow-lg shadow-blue-900/30 border border-blue-800/40 p-1 flex gap-1">
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
              { type: "lobby", label: "Lobby" },
              { type: "dining", label: "Dining" },
              { type: "office", label: "Office" },
              { type: "balcony", label: "Balcony" },
              { type: "storage", label: "Storage" },
            ].map(({ type, label }) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-sm border"
                  style={{ backgroundColor: "transparent", borderColor: getRoomEdgeColor(type), borderWidth: "1.5px" }}
                />
                <span className="text-[10px] text-blue-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
