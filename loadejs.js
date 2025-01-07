import ejs from "ejs";
import { join } from "path";
import { readFileSync } from "fs";

const ejsPath = (...paths) => join(import.meta.dirname, "templates", ...paths);
export const loadEjs = (data, ...paths) => {
    const filepath = ejsPath(...paths);
    return ejs.render(readFileSync(filepath, "utf-8"), data, {
        "filename": filepath
    });
};