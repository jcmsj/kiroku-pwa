import { type Dir, HandleKind, type Item, type Library } from ".";

export async function sort(dir: Dir): Promise<Library> {
    const labels: Library["labels"] = {},
        dirs: Library["dirs"] = {};
    for await (const h of dir.entries()) {
        if (h.kind === HandleKind.FILE) {
            labels[h.name] = h
        } else {
            dirs[h.name] = h
        }
    }
    return { labels, dirs };
}

export function prepLibrarian(sort: (dir: Dir) => Promise<Library>) {
    return {
        dirs: {} as Record<string, Dir>,
        labels: {} as Record<string, Item>,
        async sort(dir: Dir) {
            const pair = await sort(dir);
            this.labels = pair.labels;
            this.dirs = pair.dirs;
            return this;
        },
        findDir(name: string): Dir | undefined {
            return Object.values(this.dirs).find(dir => dir.name === name)
        }
    };
}

