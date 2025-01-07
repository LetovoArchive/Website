import express from "express";
import { loadEjs } from "./loadejs.js";
import { join } from "path";

const app = express();
app.use(express.static(join(import.meta.dirname, "static")));

app.get("/", (_req, res) => {
    res.status(200).send(loadEjs({}, "index.ejs"));
});

app.listen(9890);