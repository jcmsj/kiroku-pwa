import { type EntityTable, type DexieOptions,Dexie } from 'dexie';

export interface Coco {
  id: number;
  projectName: string;
  dir: FileSystemDirectoryHandle;
  cls: Record<string, {
    name: string;
    color: string;
    index: number;
  }>
}

export class KirokuDB extends Dexie {
  coco!: EntityTable<Coco, 'id'>;

  constructor(
    name: string,
    options?: DexieOptions,
  ) {
    super(name, options);
    this.version(1).stores({
      coco: '++id, projectName',
    });
  }
}

export const db = new KirokuDB('kiroku.pwa');
