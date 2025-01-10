import express from "express";
import { loadEjs } from "./loadejs.js";
import { join } from "path";
import * as api from "./index.js";
import multer from "multer";
import { Telegraf } from "telegraf";
import { fileTypeFromBuffer } from "file-type";
import archiver from "archiver";
import fs from "fs";
import * as Diff from "diff";
import cron from "node-cron";

process.on("uncaughtException", e => console.error(e));
process.on("unhandledRejection", e => console.error(e));

const webArchiver = new api.WebArchiver(["letovo.ru", "letovo.site"]);
let ready = false;
(async () => {
    await webArchiver.init();
    ready = true;
})();

process.on("SIGINT", async () => {
    await webArchiver.deinit();
    process.exit(0);
});

const { EMAIL, TG_TOKEN, TG_ID, PASSWORD } = process.env;
const bot = new Telegraf(TG_TOKEN);

const rateLimits = {};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fieldSize: 10 * 1024 * 1024,
        files: 20
    }
});

const app = express();
app.use(express.static(join(import.meta.dirname, "static")));

const PER_PAGE = 20;
const TIMEOUT = 60000;
const LIMIT = 1;

app.get("/", async (_req, res) => {
    res.status(200).send(loadEjs({
        recentUploads: await api.getLast10Uploads(),
        recentDDGDocs: await api.getLast10DDGDocs(),
        recentDocs: await api.getLast10Docs(),
        recentPhotos: await api.getLast10Photos(),
        recentNews: await api.getLast10News(),
        recentTexts: await api.getLast10Texts(),
        recentVacancies: await api.getLast10Vacancies(),
        recentWebArchives: await api.getLast10WebArchives()
    }, "index.ejs"));
});

const paginate = (req, res, array, key, ...ejs) => {
    if(!("page" in req.query)) return res.redirect(req.baseUrl + req.path + "?page=1");
    const page = parseInt(req.query.page);
    const slicePage = page - 1;
    const subarray = array.slice(slicePage * PER_PAGE, (slicePage + 1) * PER_PAGE);
    const lastPage = Math.max(1, Math.ceil(array.length / PER_PAGE));
    res.status(200).send(loadEjs({
        [key]: subarray,
        page, lastPage
    }, ...ejs));
}

app.get("/website", (_req, res) => {
    res.status(200).send(loadEjs({}, "website.ejs"));
});

app.get("/uploads", async (req, res) => paginate(req, res, await api.getAllUploads(), "uploads", "uploads.ejs"));
app.get("/vacancy", async (req, res) => paginate(req, res, await api.getAllVacancies(), "vacancies", "vacancies.ejs"));
app.get("/text", async (req, res) => paginate(req, res, await api.getAllTexts(), "texts", "text.ejs"));
app.get("/docs", async (req, res) => paginate(req, res, await api.getAllDocs(), "docs", "docs.ejs"));
app.get("/ddg", async (req, res) => paginate(req, res, await api.getAllDDGDocs(), "ddgDocs", "ddg.ejs"));
app.get("/gallery", async (req, res) => paginate(req, res, await api.getAllPhotos(), "photos", "gallery.ejs"));
app.get("/news", async (req, res) => paginate(req, res, await api.getAllNews(), "news", "news.ejs"));
app.get("/hhru", async (req, res) => paginate(req, res, await api.getAllHHRuDumps(), "dumps", "hhru.ejs"));
app.get("/web", async (req, res) => paginate(req, res, await api.getAllWebArchives(), "webArchives", "web.ejs"));

const download = async (res, uuid, forceName = null) => {
    try {
        const data = await api.readData(uuid);
        const meta = await api.readMeta(uuid);
        res
            .contentType((await fileTypeFromBuffer(data))?.mime ?? "text/plain")
            .setHeader("content-disposition", `attachment; filename="${encodeURIComponent(forceName === null ? meta.name : forceName)}"`)
            .send(data);
    } catch(e) {
        console.error(e);
        res.status(500).send("server error");
    }
}

app.get("/dl/:uuid", async (req, res) => {
    await download(res, req.params.uuid);
});

app.get("/docs/:id", async (req, res) => {
    const doc = await api.getDocByID(req.params.id);
    if(!doc) return res.status(404).send("not found");
    res.status(200).send(loadEjs({ doc }, "viewdoc.ejs"))
});
app.get("/docs/:id/download", async (req, res) => {
    const doc = await api.getDocByID(req.params.id);
    if(!doc) return res.status(404).send("not found");
    await download(res, doc.file);
});

app.get("/ddg/:id", async (req, res) => {
    const doc = await api.getDDGDocByID(req.params.id);
    if(!doc) return res.status(404).send("not found");
    res.status(200).send(loadEjs({ doc }, "viewddg.ejs"))
});
app.get("/ddg/:id/download", async (req, res) => {
    const doc = await api.getDDGDocByID(req.params.id);
    if(!doc) return res.status(404).send("not found");
    await download(res, doc.file, doc.url.split("/").reverse()[0]);
});

app.get("/uploads/:id", async (req, res) => {
    const upload = await api.getUploadByID(req.params.id);
    if(!upload) return res.status(404).send("not found");
    const files = {};
    for(const file of upload.files.split(";")) {
        files[api.readMeta(file).name] = file;
    }
    res.status(200).send(loadEjs({ upload, files }, "viewupload.ejs"))
});
app.get("/uploads/:id/download", async (req, res) => {
    const upload = await api.getUploadByID(req.params.id);
    if(!upload) return res.status(404).send("not found");
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);
    for(const file of upload.files.split(";"))
        archive.append(fs.createReadStream(api.getDataPath(file)), { name: api.readMeta(file).name });
    archive.finalize();
});

app.get("/web/:id", async (req, res) => {
    const webArchive = await api.getWebArchiveByID(req.params.id);
    if(!webArchive) return res.status(404).send("not found");
    res.status(200).send(loadEjs({ webArchive }, "viewweb.ejs"))
});
app.get("/web/:id/download", async (req, res) => {
    const webArchive = await api.getWebArchiveByID(req.params.id);
    if(!webArchive) return res.status(404).send("not found");
    await download(res, webArchive.file);
});

app.get("/gallery/:id", async (req, res) => {
    const photo = await api.getPhotoByID(req.params.id);
    if(!photo) return res.status(404).send("not found");
    res.status(200).send(loadEjs({ photo }, "viewphoto.ejs"))
});

const diffwith = (array, id, res, baseURL) => {
    res.send(loadEjs({
        array, id, baseURL
    }, "creatediff.ejs"));
};
const diff = (text1, text2, res) => {
    res.send(loadEjs({
        diff: Diff.diffLines(text1, text2)
    }, "diff.ejs"));
}

app.get("/news/:id", async (req, res) => {
    const news = await api.getNewsByID(req.params.id);
    if(!news) return res.status(404).send("not found");
    res.status(200).send(loadEjs({ news }, "viewnews.ejs"))
});

app.get("/news/:id/diff", async (req, res) => {
    const news = await api.getNewsByID(req.params.id);
    if(!news) return res.status(404).send("not found");

    if("all" in req.query)
        diffwith(await api.getAllNews(), parseInt(req.params.id), res, "news");
    else
        diffwith(await api.getAllNewsByNewsID(news.news_id), parseInt(req.params.id), res, "news");
});
app.get("/news/:left/diff/:right", async (req, res) => {
    const left = await api.getNewsByID(req.params.left);
    if(!left) return res.status(404).send("not found");
    const right = await api.getNewsByID(req.params.right);
    if(!right) return res.status(404).send("not found");
    diff(
        JSON.stringify(JSON.parse(left.json), null, 4),
        JSON.stringify(JSON.parse(right.json), null, 4),
        res
    );
})

app.get("/hhru/:id", async (req, res) => {
    const dump = await api.getHHRuDumpByID(req.params.id);
    if(!dump) return res.status(404).send("not found");
    res.status(200).send(loadEjs({ dump }, "viewhhru.ejs"))
});

app.get("/hhru/:id/diff", async (req, res) => {
    const dump = await api.getHHRuDumpByID(req.params.id);
    if(!dump) return res.status(404).send("not found");

    diffwith(await api.getAllHHRuDumps(), parseInt(req.params.id), res, "hhru");
});
app.get("/hhru/:left/diff/:right", async (req, res) => {
    const left = await api.getHHRuDumpByID(req.params.left);
    if(!left) return res.status(404).send("not found");
    const right = await api.getHHRuDumpByID(req.params.right);
    if(!right) return res.status(404).send("not found");
    diff(
        JSON.stringify(JSON.parse(left.json), null, 4),
        JSON.stringify(JSON.parse(right.json), null, 4),
        res
    );
})

app.get("/vacancy/:id", async (req, res) => {
    const vacancy = await api.getVacancyByID(req.params.id);
    if(!vacancy) return res.status(404).send("not found");
    res.status(200).send(loadEjs({ vacancy }, "viewvacancy.ejs"))
});

app.get("/vacancy/:id/diff", async (req, res) => {
    const vacancy = await api.getVacancyByID(req.params.id);
    if(!vacancy) return res.status(404).send("not found");

    if("all" in req.query)
        diffwith(await api.getAllVacancies(), parseInt(req.params.id), res, "vacancy");
    else
        diffwith(await api.getAllVacanciesByVacancyID(vacancy.vacancy_id), parseInt(req.params.id), res, "vacancy");
});
app.get("/vacancy/:left/diff/:right", async (req, res) => {
    const left = await api.getVacancyByID(req.params.left);
    if(!left) return res.status(404).send("not found");
    const right = await api.getVacancyByID(req.params.right);
    if(!right) return res.status(404).send("not found");
    diff(
        JSON.stringify(JSON.parse(left.vacancy), null, 4),
        JSON.stringify(JSON.parse(right.vacancy), null, 4),
        res
    );
})

app.get("/text/:id", async (req, res) => {
    const text = await api.getTextByID(req.params.id);
    if(!text) return res.status(404).send("not found");
    res.status(200).send(loadEjs({ text }, "viewtext.ejs"))
});

app.get("/text/:id/diff", async (req, res) => {
    const text = await api.getTextByID(req.params.id);
    if(!text) return res.status(404).send("not found");

    if("all" in req.query)
        diffwith(await api.getAllTexts(), parseInt(req.params.id), res, "text");
    else
        diffwith(await api.getAllTextsByURL(text.url), parseInt(req.params.id), res, "text");
});
app.get("/text/:left/diff/:right", async (req, res) => {
    const left = await api.getTextByID(req.params.left);
    if(!left) return res.status(404).send("not found");
    const right = await api.getTextByID(req.params.right);
    if(!right) return res.status(404).send("not found");
    diff(
        JSON.stringify(JSON.parse(left.json), null, 4),
        JSON.stringify(JSON.parse(right.json), null, 4),
        res
    );
})

app.get("/new", (_req, res) => {
    res.status(200).send(loadEjs({}, "new.ejs"));
})
app.post("/new", upload.array("files"), async (req, res) => {
    if(!req.body.title || req.body.title.length > 200)
        return res.status(400).send("bad request");

    const ip = req.headers["cf-connecting-ip"] ?? req.ip;
    if(ip in rateLimits && rateLimits[ip] >= LIMIT)
        return res.status(429).send("too many requests");
    if(!(ip in rateLimits)) {
        rateLimits[ip] = 1;
    } else rateLimits[ip]++;
    setTimeout(() => rateLimits[ip]--, TIMEOUT)

    let uuids = [];
    await bot.telegram.sendMessage(parseInt(TG_ID), req.body.title);
    for(const file of req.files) {
        uuids.push(await api.write(file.originalname, file.buffer));
        await bot.telegram.sendDocument(parseInt(TG_ID), {
            source: file.buffer,
            filename: file.originalname
        });
    }
    const row = await api.addUpload(new Date().getTime(), ip, uuids.join(";"), req.body.title);
    await bot.telegram.sendMessage(parseInt(TG_ID), "Accept ID: " + row.id);
    res.redirect("/uploads#success");
});

app.get("/newweb", (_req, res) => {
    res.status(200).send(loadEjs({}, "newweb.ejs"));
})
app.post("/newweb", upload.none(), async (req, res) => {
    if(!ready) return res.status(429).send("not ready yet!");

    if(!req.body.url)
        return res.status(400).send("bad request");

    const ip = req.headers["cf-connecting-ip"] ?? req.ip;
    if(ip in rateLimits && rateLimits[ip] >= LIMIT)
        return res.status(429).send("too many requests");
    if(!(ip in rateLimits)) {
        rateLimits[ip] = 1;
    } else rateLimits[ip]++;
    setTimeout(() => rateLimits[ip]--, TIMEOUT)

    const archive = await webArchiver.archiveToMHTML(req.body.url);
    if(archive === null)
        return res.status(400).send("bad request. should only be *.letovo.ru, *.letovo.site or letovo.ru");
    const uuid = api.write((req.body.url.split("/").reverse()[0] || "index") + ".mhtml", archive);
    await api.addWebArchive(new Date().getTime(), uuid, req.body.url);

    res.redirect("/web#success");
});

app.get("/admin", (_req, res) => {
    res.status(200).send(loadEjs({}, "admin.ejs"));
});
app.post("/admin/approve", upload.none(), async (req, res) => {
    if(req.body.password != PASSWORD) return res.status(401).send("wrong password");
    await api.acceptUpload(parseInt(req.body.id));
    res.status(200).end("Accepted!");
});
app.post("/admin/reject", upload.none(), async (req, res) => {
    if(req.body.password != PASSWORD) return res.status(401).send("wrong password");
    const upload = await api.getUploadByID(parseInt(req.body.id));
    if(!upload) return res.status(404).send("not found");
    for(const file of upload.files.split(";"))
        api.remove(file);
    await api.removeUpload(upload.id);
    res.status(200).end("Rejected!");
});

app.listen(9890);

cron.schedule("0 0 * * *", async () => {
    console.log("Started archiving...");
    await api.archiveAll(EMAIL);
    console.log("Archived everything!!");
});