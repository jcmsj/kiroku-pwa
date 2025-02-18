import { type FS, type Dir, type Librarian, asRoot } from ".";

export function prepFS(l: Librarian): (rootDir: Dir) => Promise<FS> {
    return async (rootDir: Dir) => {
        const root = asRoot(rootDir);
        return {
            levels: [root],
            get root() {
                return this.levels[0]
            },
            currentDir: root,
            inRoot: true,
            async setDir(d: Dir) {
                if (await this.currentDir.isSame(d)) {
                    return false;
                }
                await l.sort(d);
                this.currentDir = d;
                this.inRoot = d.isRoot;
                return true;
            },
            async goto(d: Dir) {
                if (!this.setDir(d)) {
                    return false;
                }
                if (d.isRoot) {
                    this.levels = [root];
                } else {
                    this.levels.push(this.currentDir);
                }

                return true;
            },
            async moveUp() {
                let maybeLast:Dir|undefined = undefined;
                if (this.levels.length == 1) {
                    maybeLast = this.root
                }

                if (this.levels.length > 1) {
                    maybeLast = this.levels.pop()
                }
                // levels.length < 1
                if (maybeLast == undefined) {
                    throw TypeError("No directory to go up to, nor can the root directory be returned to")
                }

                await this.setDir(maybeLast);
            },
        } as FS;
    };
}
