
import { Direction, type BBox } from "./types"

export function resizeBbox<T extends BBox>(
  activeHandle: Direction,
  bbox: T,
  deltaX: number,
  deltaY: number
):T {
  let { x, y, width, height,...rest } = bbox;

  switch (activeHandle) {
    case Direction.N:
      height = Math.max(1, height - deltaY);
      y += deltaY;
      break;
    case Direction.NE:
      width = Math.max(1, width + deltaX);
      height = Math.max(1, height - deltaY);
      y += deltaY;
      break;
    case Direction.E:
      width = Math.max(1, width + deltaX);
      break;
    case Direction.SE:
      width = Math.max(1, width + deltaX);
      height = Math.max(1, height + deltaY);
      break;
    case Direction.S:
      height = Math.max(1, height + deltaY);
      break;
    case Direction.SW:
      width = Math.max(1, width - deltaX);
      height = Math.max(1, height + deltaY);
      x += deltaX;
      break;
    case Direction.W:
      width = Math.max(1, width - deltaX);
      x += deltaX;
      break;
    case Direction.NW:
      width = Math.max(1, width - deltaX);
      height = Math.max(1, height - deltaY);
      x += deltaX;
      y += deltaY;
      break;
  }

  return { x, y, width, height,...rest } as T;
}
