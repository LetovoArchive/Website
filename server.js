import express from "express";
import { loadEjs } from "./loadejs.js";
import { join } from "path";
import * as api from "./index.js";

const app = express();
app.use(express.static(join(import.meta.dirname, "static")));

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

app.listen(9890);