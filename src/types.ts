export interface BBox {
  x: number
  y: number
  width: number
  height: number
}

export interface Field {
  psm: number;
  bbox: number[]; // Normalized: cx, cy, width, height
  cls: string;
  id: number;
  keyword: string;
  cls_index: number;
}

export interface Result {
  text: string;
  fieldID: number;
}

export interface DocTemplate {
  name: string;
  width: number;
  height: number;
  fields: Field[];
  results: Result[];
}
/**
 * Intercardinal directions, these match the css '{d}-resize' style
 * see https://developer.mozilla.org/en-US/docs/Web/CSS/cursor
 */
export enum Direction {
  N = 'n',
  E = 'e',
  S = 's',
  W = 'w',
  NE = 'ne',
  NW = 'nw',
  SE = 'se',
  SW = 'sw'
}

export enum EditMode {
  create = -1,
  none,
  move,
  resize,
}

export const DIRECTIONS = [
  Direction.N, Direction.E, Direction.S, Direction.W,
  Direction.NE, Direction.NW, Direction.SE, Direction.SW
]
export interface TemplateField {
  id: UUID;
  name: string;
  value?: string;
  bbox: BBox;
  // psm: number;
  // cls: string;
  // clsIndex: number;
}

export interface TemplatePage {
  template_page_id: string;
  template_id: string;
  originalWidth: number;
  originalHeight: number;
  originalFileName: string;
  fields: TemplateField[];
}

export type UUID = ReturnType<Crypto['randomUUID']>

export interface HasUUID {
  id: UUID
}

export type BboxWithId = BBox & HasUUID;
export type CocoField = BBox & HasUUID & { cls: number };
export type PartialCocoField = BBox & HasUUID & Partial<{ cls: number }>;


export type SetKind = 'train' | 'val' | 'test';
