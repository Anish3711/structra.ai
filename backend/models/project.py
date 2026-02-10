from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class BuildingType(str, Enum):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    MIXED_USE = "mixed-use"
    HOUSE = "house"
    APARTMENT = "apartment"


class SoilType(str, Enum):
    CLAY = "clay"
    SANDY = "sandy"
    ROCKY = "rocky"
    LOAMY = "loamy"
    BLACK_COTTON = "black_cotton"
    LATERITE = "laterite"


class UnitSystem(str, Enum):
    SQFT = "sqft"
    SQM = "sqm"


class SiteAnalysis(BaseModel):
    soil_type: SoilType = SoilType.LOAMY
    surroundings: str = "open"
    constraints: str = ""


class Utilities(BaseModel):
    electrical: bool = True
    plumbing: bool = True
    water_tanks: int = 1
    water_supply: str = "municipal"


class FlatConfig(BaseModel):
    flats_per_floor: int = Field(default=2, ge=1, le=10)
    bedrooms: int = Field(default=2, ge=1, le=5)
    bathrooms: int = Field(default=2, ge=1, le=4)
    balconies: int = Field(default=1, ge=0, le=4)
    doors: int = Field(default=6, ge=1, le=20)
    windows: int = Field(default=4, ge=1, le=20)


class Amenities(BaseModel):
    pool: bool = False
    gym: bool = False
    parking: bool = True
    lift: bool = False


class ProjectInput(BaseModel):
    name: str = "My Project"
    area_sqft: float = Field(default=2000, ge=100, le=500000)
    floors: int = Field(default=2, ge=1, le=50)
    months_to_finish: int = Field(default=12, ge=1, le=120)
    location: str = "India"
    unit: UnitSystem = UnitSystem.SQFT
    building_type: BuildingType = BuildingType.RESIDENTIAL

    site_analysis: SiteAnalysis = Field(default_factory=SiteAnalysis)
    utilities: Utilities = Field(default_factory=Utilities)
    flat_config: FlatConfig = Field(default_factory=FlatConfig)
    amenities: Amenities = Field(default_factory=Amenities)


class WorkerEstimation(BaseModel):
    masons: int
    helpers: int
    carpenters: int
    steel_workers: int
    plumbers: int
    electricians: int
    painters: int
    total_workers: int


class CostBreakdown(BaseModel):
    material_cost: float
    labour_cost: float
    overhead: float
    contingency: float
    total_cost: float
    cost_per_sqft: float


class MaterialItem(BaseModel):
    name: str
    quantity: float
    unit: str
    unit_rate: float
    total_cost: float


class TimelinePhase(BaseModel):
    phase: str
    start_week: int
    end_week: int
    duration_weeks: int
    description: str


class BlueprintRoom(BaseModel):
    id: str
    name: str
    x: float
    y: float
    width: float
    height: float
    type: str


class BlueprintFloor(BaseModel):
    floor: int
    label: str
    rooms: List[BlueprintRoom]
    flats: Optional[List[dict]] = None


class BlueprintData(BaseModel):
    floors: List[BlueprintFloor]
    corridors: List[dict] = []
    terrace: Optional[dict] = None
    roof: Optional[dict] = None
    water_tanks: List[dict] = []
    electrical_lines: List[dict] = []
    water_lines: List[dict] = []
    overview: str = ""
    component_breakdown: List[dict] = []


class AIAnalysis(BaseModel):
    project_summary: str
    risks: List[str]
    recommendations: List[str]
    material_insights: str
    cost_optimization: str
    hindi_summary: str = ""


class PlanResponse(BaseModel):
    workers: WorkerEstimation
    cost_breakdown: CostBreakdown
    materials: List[MaterialItem]
    timeline: List[TimelinePhase]
    schedule: List[TimelinePhase]
    blueprint: BlueprintData
    ai_analysis: AIAnalysis
