import express from "express";
import { loadEjs } from "./loadejs.js";
import { join } from "path";
import * as api from "./index.js";

const app = express();
app.use(express.static(join(import.meta.dirname, "static")));

const PER_PAGE = 20;

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

app.listen(9890);