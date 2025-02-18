import { type Dir, type Handle, HandleKind, type Item, Status } from "../index";

const g = "granted"
export async function verifyPermission(handle?: FileSystemDirectoryHandle, mode: FileSystemPermissionMode = "read") {
    if (!handle)
        return false;

    const options: FileSystemHandlePermissionDescriptor = {
        mode,
    };

    // Check if permission was already granted.
    if ((await handle.queryPermission(options)) === g) {
        return true;
    }
    // Request permission.
    if ((await handle.requestPermission(options)) === g) {
        return true;
    }

    // Permission denied.
    return false;
}
export function aDirHandle(h: any): h is FileSystemDirectoryHandle {
    return h instanceof FileSystemDirectoryHandle;
}
export async function getLastWorkingDir(provider:()=>Promise<FileSystemDirectoryHandle|undefined>): Promise<{
    status: Status;
    handle?: FileSystemDirectoryHandle;
}> {
    const lastDir = await provider()
    if (!aDirHandle(lastDir)) { //Maybe a new user
        return { status: Status.unset }
    }

    if (await verifyPermission(lastDir, "read")) {
        return { status: Status.granted, handle: lastDir }
    }

    return { status: Status.denied };
}


export async function isSameEntry(one?: FileSystemHandle, other?: FileSystemHandle) {
    return one?.isSameEntry(other!) || false
}

export function asItem(item: FileSystemFileHandle): Item {
    return {
        name: item.name,
        kind: HandleKind.FILE,
        origin: item,
        async get() {
            return item.getFile();
        },
        async isSame(other: Handle<FileSystemHandle>) {
            return item.isSameEntry(other.origin);
        }
    }
}

export function asDir(dir: FileSystemDirectoryHandle): Dir {
    return {
        name: dir.name,
        kind: HandleKind.DIR,
        origin: dir,
        isRoot: false,
        async isSame(other: Handle<FileSystemHandle>) {
            return isSameEntry(dir, other.origin);
        },
        async getItem(name: string) {
            return asItem(await dir.getFileHandle(name));
        },
        async *entries() {
            for await (const [_, h] of dir.entries()) {
                if (h instanceof FileSystemDirectoryHandle) {
                    yield asDir(h);
                } else if (h.name.endsWith(".epub")){
                    yield asItem(h);
                }
            }
        }
    }
}

export async function FileSystemDirectoryHandleToDir(raw: FileSystemDirectoryHandle): Promise<Dir | undefined> {
    return await verifyPermission(raw) ? asDir(raw) : undefined;
}

export const isSupported = window.showOpenFilePicker !== undefined;
