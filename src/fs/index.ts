export interface Library {
    dirs: Record<string, Dir>,
    labels: Record<string, Item>,
}

export interface FS {
    currentDir: Dir,
    readonly root: RootDir;
    /**
     * Implementers must guarantee that the length is at least 1
     */
    levels: Dir[];
    inRoot: boolean;
    /**
     * @returns whether the current directory was changed
     */
    goto: (d: Dir) => Promise<boolean>;
    /**
     * Changing this would also update {{@link FS.dirs}, {@link FS.labels}}
     * @returns if currentDir was changed
     */
    setDir: (d: Dir) => Promise<boolean>;
    moveUp: () => Promise<void>;
}

/**
 * Handles converting the respective File Interfaces for all platforms compatible with {@link FS}
 */
export interface Transformer {
    sort: (dir: Dir) => Promise<Library>;
}

export interface Librarian extends Transformer, Library { }

export enum HandleKind {
    DIR,
    FILE
}
/**
 * `O` will be used for the implementations. However, {@link Item} nor {@link Dir} needs to know about it.
 */
export interface Handle<O = any> {
    isSame(other: Handle): Promise<boolean>;
    readonly name: string;
    readonly kind: HandleKind;
    readonly origin: O;
}

export interface Item extends Handle {
    get: () => Promise<File>;
    readonly kind: HandleKind.FILE;
}

export interface RootDir extends Dir {
    readonly isRoot: true;
}

export interface Dir extends Handle {
    readonly name: string;
    readonly kind: HandleKind.DIR;
    readonly isRoot: boolean;
    getItem: (name: string) => Promise<Item>;
    entries: () => AsyncIterableIterator<Item | Dir>;
}

export enum Status {
    unset,
    granted,
    denied
}

export function asRoot(dir: Dir): RootDir {
    return { ...dir, isRoot: true };
}
