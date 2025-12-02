import { parseArgs } from "util";
import * as api from "./index.js";

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        "lib-username": {
            type: "string"
        },
        "lib-password": {
            type: "string",
        },
        "hh-email": {
            type: "string"
        }
    }
});

if(positionals.length === 0) {
    console.log("Check cli.js for options");
    process.exit(2);
}

(async () => {
    if(positionals[0] === "books") {
        if(!values["lib-username"] || !values["lib-password"]) {
            console.error("Check arguments: lib-username, lib-password");
            process.exit(1);
        }
        await api.archiveLibrary(values["lib-username"], values["lib-password"]);
    } else if(positionals[0] === "crtsh") {
        await api.archiveCRTSh();
    } else if(positionals[0] === "website") {
        await api.archiveWebsite();
    } else if(positionals[0] === "ddg") {
        await api.archiveDDGDocs();
    } else if(positionals[0] === "hh") {
        if(!values["hh-email"]) {
            console.error("Check arguments: hh-email");
            process.exit(1);
        }
        await api.archiveHHRu(values["hh-email"]);
    }
    console.log("Done!");
})();