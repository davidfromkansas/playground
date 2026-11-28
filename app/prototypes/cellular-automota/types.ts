export type Settings = {
  speed: number;
  cellSize: number;
  density: number;
  reseed: boolean;
};
export type Stats = { generation: number; population: number };
/** One voxel in plant-local units: x and z in -2..2, y from 0 upward. */
export type Voxel = [x: number, y: number, z: number, color: number];
export type Species = { name: string; voxels: Voxel[] };
