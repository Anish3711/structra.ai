import { useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, ContactShadows, PerspectiveCamera } from "@react-three/drei";
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

const ROOM_COLORS: Record<string, { hex: number; css: string }> = {
  bedroom: { hex: 0x93c5fd, css: "#93c5fd" },
  living: { hex: 0x86efac, css: "#86efac" },
  kitchen: { hex: 0xfde68a, css: "#fde68a" },
  bathroom: { hex: 0xc4b5fd, css: "#c4b5fd" },
  corridor: { hex: 0xd1d5db, css: "#e5e7eb" },
  staircase: { hex: 0xfdba74, css: "#fdba74" },
  elevator: { hex: 0x60a5fa, css: "#60a5fa" },
  lobby: { hex: 0xa78bfa, css: "#a78bfa" },
  dining: { hex: 0xfca5a5, css: "#fca5a5" },
  balcony: { hex: 0x6ee7b7, css: "#6ee7b7" },
  storage: { hex: 0x9ca3af, css: "#9ca3af" },
  utility: { hex: 0x78716c, css: "#78716c" },
  parking: { hex: 0xd6d3d1, css: "#d6d3d1" },
  office: { hex: 0x7dd3fc, css: "#7dd3fc" },
  laundry: { hex: 0xfbbf24, css: "#fbbf24" },
  other: { hex: 0xf9a8d4, css: "#f9a8d4" },
};

function getRoomColor(type: string): string {
  return ROOM_COLORS[type]?.css || "#f3f4f6";
}

function getRoomColorHex(type: string): number {
  return ROOM_COLORS[type]?.hex || 0xf3f4f6;
}

function RoomBox({ room, floorIndex, isActive, totalWidth, totalDepth }: {
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

  useFrame((_, delta) => {
    if (meshRef.current) {
      const targetOpacity = isActive ? (hovered ? 0.95 : 0.85) : 0.35;
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, delta * 5);
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[xPos, yPos, zPos]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[roomWidth - 0.05, wallHeight, roomDepth - 0.05]} />
        <meshStandardMaterial
          color={getRoomColorHex(room.type)}
          transparent
          opacity={isActive ? 0.85 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {room.type !== "corridor" && (
        <mesh position={[xPos, yPos + wallHeight / 2 - 0.02, zPos]}>
          <boxGeometry args={[roomWidth - 0.06, 0.04, roomDepth - 0.06]} />
          <meshStandardMaterial color={0xffffff} transparent opacity={isActive ? 0.6 : 0.2} />
        </mesh>
      )}

      {isActive && (
        <Text
          position={[xPos, yPos + 0.1, zPos]}
          fontSize={Math.min(roomWidth, roomDepth) * 0.12}
          color="#1e293b"
          anchorX="center"
          anchorY="middle"
          rotation={[-Math.PI / 2, 0, 0]}
          maxWidth={roomWidth * 0.8}
        >
          {room.name}
        </Text>
      )}

      <lineSegments position={[xPos, yPos, zPos]}>
        <edgesGeometry args={[new THREE.BoxGeometry(roomWidth - 0.05, wallHeight, roomDepth - 0.05)]} />
        <lineBasicMaterial color={isActive ? "#334155" : "#94a3b8"} linewidth={1} transparent opacity={isActive ? 0.7 : 0.3} />
      </lineSegments>
    </group>
  );
}

function FloorSlab({ floorIndex, width, depth }: {
  floorIndex: number;
  width: number;
  depth: number;
}) {
  const yPos = floorIndex * FLOOR_HEIGHT;
  const slabWidth = width * SCALE;
  const slabDepth = depth * SCALE;

  return (
    <group>
      <mesh position={[0, yPos - 0.05, 0]} receiveShadow>
        <boxGeometry args={[slabWidth + 0.1, 0.1, slabDepth + 0.1]} />
        <meshStandardMaterial color={0xd1d5db} roughness={0.8} />
      </mesh>
      <lineSegments position={[0, yPos - 0.05, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(slabWidth + 0.1, 0.1, slabDepth + 0.1)]} />
        <lineBasicMaterial color="#94a3b8" />
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
      {Array.from({ length: steps }).map((_, i) => (
        <mesh
          key={i}
          position={[
            xPos,
            fromFloor * FLOOR_HEIGHT + stepHeight * (i + 0.5),
            zPos - (room.height * SCALE) / 2 + stepDepth * (i + 0.5),
          ]}
          castShadow
        >
          <boxGeometry args={[room.width * SCALE * 0.7, stepHeight * 0.9, stepDepth * 0.9]} />
          <meshStandardMaterial color={0x9ca3af} roughness={0.6} />
        </mesh>
      ))}
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
      <mesh position={[xPos, shaftHeight / 2, zPos]}>
        <boxGeometry args={[room.width * SCALE * 0.9, shaftHeight, room.height * SCALE * 0.9]} />
        <meshStandardMaterial color={0x60a5fa} transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments position={[xPos, shaftHeight / 2, zPos]}>
        <edgesGeometry args={[new THREE.BoxGeometry(room.width * SCALE * 0.9, shaftHeight, room.height * SCALE * 0.9)]} />
        <lineBasicMaterial color="#3b82f6" transparent opacity={0.4} />
      </lineSegments>

      <mesh ref={cabRef} position={[xPos, FLOOR_HEIGHT * 0.3, zPos]}>
        <boxGeometry args={[room.width * SCALE * 0.7, FLOOR_HEIGHT * 0.5, room.height * SCALE * 0.7]} />
        <meshStandardMaterial color={0x3b82f6} metalness={0.6} roughness={0.3} />
      </mesh>
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
          <FloorSlab floorIndex={floorIdx} width={width} depth={depth} />
          {floor.rooms.map((room) => (
            <RoomBox
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

      <FloorSlab floorIndex={floors.length} width={width} depth={depth} />

      <gridHelper
        args={[Math.max(width, depth) * SCALE * 2, 20, "#e2e8f0", "#f1f5f9"]}
        position={[0, -0.1, 0]}
      />
    </group>
  );
}

function AutoRotate({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const angleRef = useRef(0);

  useFrame((_, delta) => {
    if (enabled) {
      angleRef.current += delta * 0.3;
      const radius = camera.position.length();
      const height = camera.position.y;
      camera.position.x = Math.sin(angleRef.current) * radius * 0.7;
      camera.position.z = Math.cos(angleRef.current) * radius * 0.7;
      camera.position.y = height;
      camera.lookAt(0, (height - 2) * 0.3, 0);
    }
  });

  return null;
}

function CameraAnimation({ targetY, totalHeight }: { targetY: number; totalHeight: number }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const targetLookAt = new THREE.Vector3(0, targetY, 0);
    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);

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
    <div className="relative w-full rounded-xl overflow-hidden border bg-gradient-to-b from-slate-100 to-slate-200" style={{ height: "550px" }}>
      <Canvas shadows dpr={[1, 2]}>
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

        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-5, 8, -5]} intensity={0.3} />

        <BuildingModel
          floors={floors}
          width={width}
          depth={depth}
          activeFloor={displayFloor}
        />

        <ContactShadows
          position={[0, -0.15, 0]}
          opacity={0.3}
          scale={20}
          blur={2}
          far={10}
        />

        <CameraAnimation
          targetY={activeFloor >= 0 ? activeFloor * FLOOR_HEIGHT : totalHeight / 2}
          totalHeight={totalHeight}
        />
      </Canvas>

      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex flex-col gap-1">
          <Button
            variant={viewMode === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("all")}
            className="justify-start text-xs"
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            All Floors
          </Button>
          <Button
            variant={viewMode === "single" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("single")}
            className="justify-start text-xs"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            Single Floor
          </Button>
        </div>

        {viewMode === "single" && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex flex-col gap-1">
            {floors.map((floor, idx) => (
              <Button
                key={floor.floor}
                variant={activeFloor === idx ? "default" : "ghost"}
                size="sm"
                onClick={() => onFloorChange(idx)}
                className="justify-start text-xs"
              >
                {floor.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-1 flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
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
            className="h-8 w-8 bg-white/90 shadow-lg"
            onClick={() => onFloorChange(Math.min(activeFloor + 1, floors.length - 1))}
            disabled={activeFloor >= floors.length - 1}
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg px-2 py-1 text-center text-xs font-medium">
            {floors[activeFloor]?.label}
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-white/90 shadow-lg"
            onClick={() => onFloorChange(Math.max(activeFloor - 1, 0))}
            disabled={activeFloor <= 0}
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
          <div className="text-xs font-semibold mb-2">Room Types</div>
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
                  className="w-3 h-3 rounded-sm border border-gray-300"
                  style={{ backgroundColor: getRoomColor(type) }}
                />
                <span className="text-[10px] text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
