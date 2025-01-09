import express from "express";
import { loadEjs } from "./loadejs.js";
import { join } from "path";
import * as api from "./index.js";
import multer from "multer";
import { Telegraf } from "telegraf";
import { fileTypeFromBuffer } from "file-type";
import archiver from "archiver";
import fs from "fs";

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
        recentVacancies: await api.getLast10Vacancies()
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
    res.redirect("/uploads");
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