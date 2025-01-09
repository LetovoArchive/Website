// The following typedefs were written by AI. Expect mistakes.

/**
 * @typedef {object} Upload
 * @property {number} id The unique identifier for the upload
 * @property {number} date The date of the upload
 * @property {string} by_ip The IP address from which the upload was made
 * @property {string} files The files associated with the upload
 * @property {string} title The upload title
 * @property {number} accepted Whether the upload was accepted; 0 for not, 1 for yes
 */

/**
 * @typedef {object} WebsiteVacancy
 * @property {number} id The unique identifier for the website vacancy
 * @property {number} vacancy_id The identifier for the specific vacancy
 * @property {number} date The date of the vacancy
 * @property {string} vacancy The details of the vacancy
 */

/**
 * @typedef {object} WebsiteText
 * @property {number} id The unique identifier for the website text
 * @property {string} url The URL of the website text
 * @property {number} date The date of the website text
 * @property {string} json The JSON content of the website text
 */

/**
 * @typedef {object} WebsiteDoc
 * @property {number} id The unique identifier for the website document
 * @property {string} url The URL of the website document
 * @property {number} date The date of the website document
 * @property {string} file The file associated with the website document
 */

/**
 * @typedef {object} WebsiteGallery
 * @property {number} id The unique identifier for the gallery photo
 * @property {number} photo_id The identifier for the specific photo
 * @property {string} url The URL of the gallery photo
 * @property {number} date The date of the gallery photo
 * @property {number} album_id The identifier for the album
 * @property {string} album_name The name of the album
 */

/**
 * @typedef {object} WebsiteNews
 * @property {number} id The unique identifier for the news item
 * @property {number} news_id The identifier for the specific news item
 * @property {string} url The URL of the news item
 * @property {number} date The date of the news item
 * @property {string} json The JSON content of the news item
 */

/**
 * @typedef {object} DDGDoc
 * @property {number} id The unique identifier for the DDG document
 * @property {string} url The URL of the DDG document
 * @property {number} date The date of the DDG document
 * @property {string} name The name of the DDG document
 * @property {string} file The file associated with the DDG document
 */

/**
 * @typedef {object} HHRu
 * @property {number} id The unique identifier for the HH.ru document dump
 * @property {number} date The date of the HH.ru dump
 * @property {string} json The JSON dump
 */



import sqlite3 from "sqlite3";
import { randomUUID } from "crypto";
import fs from "fs";
import { join } from "path";

const db = new sqlite3.Database("data.db");

// Table definitions
db.run(`CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY,
    date INTEGER,
    by_ip TEXT,
    files TEXT,
    title TEXT,
    accepted INTEGER
)`);
db.run(`CREATE TABLE IF NOT EXISTS website_vacancies (
    id INTEGER PRIMARY KEY,
    vacancy_id INTEGER,
    date INTEGER,
    vacancy TEXT
)`);
db.run(`CREATE TABLE IF NOT EXISTS website_texts (
    id INTEGER PRIMARY KEY,
    url TEXT,
    date INTEGER,
    json TEXT
)`);
db.run(`CREATE TABLE IF NOT EXISTS website_docs (
    id INTEGER PRIMARY KEY,
    url TEXT,
    date INTEGER,
    file TEXT
)`);
db.run(`CREATE TABLE IF NOT EXISTS website_gallery (
    id INTEGER PRIMARY KEY,
    photo_id INTEGER,
    url TEXT,
    date INTEGER,
    album_id INTEGER,
    album_name TEXT
)`);
db.run(`CREATE TABLE IF NOT EXISTS website_news (
    id INTEGER PRIMARY KEY,
    news_id INTEGER,
    url TEXT,
    date INTEGER,
    json TEXT
)`);
db.run(`CREATE TABLE IF NOT EXISTS ddg_docs (
    id INTEGER PRIMARY KEY,
    url TEXT,
    date INTEGER,
    name TEXT,
    file TEXT
)`);
db.run(`CREATE TABLE IF NOT EXISTS hhru (
    id INTEGER PRIMARY KEY,
    date INTEGER,
    json TEXT
)`);

const adb = (func, query, params) => new Promise((resolve, reject) => {
    db[func](query, params ?? [], (err, res) => {
        if(err) reject(err);
        else resolve(res);
    });
});
adb.get = (query, params) => adb("get", query, params);
adb.all = (query, params) => adb("all", query, params);
adb.run = (query, params) => adb("run", query, params);

/** @typedef {{ name: string }} FileMeta */

/**
 * Writes data to a file and returns its UUID.
 * 
 * @param {FileMeta} name The file name
 * @param {Buffer | string} data The data to write
 * @returns {string} The UUID of the file
 */
export function write(name, data) {
    const uuid = randomUUID();
    if(!fs.existsSync(join("files", uuid)))
        fs.mkdirSync(join("files", uuid));
    fs.writeFileSync(join("files", uuid, "meta"), JSON.stringify({ name }));
    fs.writeFileSync(join("files", uuid, "data"), data);
    return uuid;
}
/**
 * Gets file metadata path by its UUID.
 * 
 * @param {string} uuid The UUID of the file
 * @returns {string} Path to meta file
 */
export function getMetaPath(uuid) {
    return join("files", uuid, "meta");
}
/**
 * Gets file data path by its UUID.
 * 
 * @param {string} uuid The UUID of the file
 * @returns {string} Path to file
 */
export function getDataPath(uuid) {
    return join("files", uuid, "data");
}
/**
 * Gets file metadata by its UUID.
 * 
 * @param {string} uuid The UUID of the file
 * @returns {FileMeta} Metadata
 */
export function readMeta(uuid) {
    return JSON.parse(fs.readFileSync(getMetaPath(uuid), "utf-8"));
}
/**
 * Gets file data by its UUID.
 * 
 * @param {string} uuid The UUID of the file
 * @returns {Buffer} File contents
 */
export function readData(uuid) {
    return fs.readFileSync(getDataPath(uuid));
}
/**
 * Deletes a file.
 * 
 * @param {string} uuid The UUID of the file
 */
export function remove(uuid) {
    fs.unlinkSync(getMetaPath(uuid));
    fs.unlinkSync(getDataPath(uuid));
    fs.rmdirSync(join("files", uuid));
}

// All of the following code has been written by AI. Expect trouble.
// And please don't bully me - who in their right mind would write all these lines of code manually?

/**
 * Gets the last 10 uploads.
 * 
 * @returns {Upload[]}
 */
export async function getLast10Uploads() {
    return await adb.all("SELECT * FROM uploads ORDER BY date DESC LIMIT 10");
}

/**
 * Gets all uploads.
 * 
 * @returns {Upload[]}
 */
export async function getAllUploads() {
    return await adb.all("SELECT * FROM uploads WHERE accepted = 1 ORDER BY date DESC");
}

/**
 * Gets to-be-accepted uploads.
 * 
 * @returns {Upload[]}
 */
export async function getReviewableUploads() {
    return await adb.all("SELECT * FROM uploads WHERE accepted = 0 ORDER BY date DESC");
}

/**
 * Gets an upload by its ID.
 * 
 * @param {number} id The ID of the upload
 * @returns {Upload}
 */
export async function getUploadByID(id) {
    return await adb.get("SELECT * FROM uploads WHERE id = ?", [id]);
}

/**
 * Adds an upload to the database.
 * 
 * @param {number} date The date of the upload
 * @param {string} by_ip The IP address from which the upload was made
 * @param {string} files The files associated with the upload
 * @param {string} title The title
 * @returns {Upload} The upload
 */
export async function addUpload(date, by_ip, files, title) {
    return await adb.get("INSERT INTO uploads (date, by_ip, files, title, accepted) VALUES (?, ?, ?, ?, 0) RETURNING *", [date, by_ip, files, title]);
}

/**
 * Accepts an upload by its ID.
 * 
 * @param {number} id The ID
 */
export async function acceptUpload(id) {
    return await adb.run("UPDATE uploads SET accepted = 1 WHERE id = ?", [id]);
}

/**
 * Removes an upload by its ID.
 * REMEMBER: FILES ARE NOT DELETED!!
 * 
 * @param {number} id The ID
 */
export async function removeUpload(id) {
    return await adb.run("DELETE FROM uploads WHERE id = ?", [id]);
}

/**
 * Gets the last 10 vacancies.
 * 
 * @returns {WebsiteVacancy[]}
 */
export async function getLast10Vacancies() {
    return await adb.all("SELECT * FROM website_vacancies ORDER BY date DESC LIMIT 10");
}

/**
 * Gets the last vacancy by its vacancy ID.
 * 
 * @param {number} vacancy_id The ID of the vacancy
 * @returns {WebsiteVacancy}
 */
export async function getLastVacancyByVacancyID(vacancy_id) {
    return await adb.get("SELECT * FROM website_vacancies WHERE vacancy_id = ? ORDER BY date DESC LIMIT 1", [vacancy_id]);
}

/**
 * Gets all vacancies by vacancy ID.
 * 
 * @param {number} vacancy_id The ID of vacancies
 * @returns {WebsiteVacancy[]}
 */
export async function getAllVacanciesByVacancyID(vacancy_id) {
    return await adb.all("SELECT * FROM website_vacancies WHERE vacancy_id = ? ORDER BY date DESC", [vacancy_id]);
}

/**
 * Gets all vacancies.
 * 
 * @returns {WebsiteVacancy[]}
 */
export async function getAllVacancies() {
    return await adb.all("SELECT * FROM website_vacancies ORDER BY date DESC");
}

/**
 * Gets a vacancy by its ID.
 * 
 * @param {number} id The ID of the vacancy
 * @returns {WebsiteVacancy}
 */
export async function getVacancyByID(id) {
    return await adb.get("SELECT * FROM website_vacancies WHERE id = ?", [id]);
}

/**
 * Adds a vacancy to the database.
 * 
 * @param {number} vacancy_id The ID of the vacancy
 * @param {number} date The date of the vacancy
 * @param {string} vacancy The details of the vacancy
 */
export async function addVacancy(vacancy_id, date, vacancy) {
    return await adb.run("INSERT INTO website_vacancies (vacancy_id, date, vacancy) VALUES (?, ?, ?)", [vacancy_id, date, vacancy]);
}

/**
 * Gets the last 10 texts.
 * 
 * @returns {WebsiteText[]}
 */
export async function getLast10Texts() {
    return await adb.all("SELECT * FROM website_texts ORDER BY date DESC LIMIT 10");
}

/**
 * Gets the last text by its URL.
 * 
 * @param {string} url The URL of the text
 * @returns {WebsiteText}
 */
export async function getLastTextByURL(url) {
    return await adb.get("SELECT * FROM website_texts WHERE url = ? ORDER BY date DESC LIMIT 1", [url]);
}

/**
 * Gets all texts by their URL.
 * 
 * @param {string} url The URL of the texts
 * @returns {WebsiteText[]}
 */
export async function getAllTextsByURL(url) {
    return await adb.all("SELECT * FROM website_texts WHERE url = ? ORDER BY date DESC", [url]);
}

/**
 * Gets all texts.
 * 
 * @returns {WebsiteText[]}
 */
export async function getAllTexts() {
    return await adb.all("SELECT * FROM website_texts ORDER BY date DESC");
}

/**
 * Gets a text by its ID.
 * 
 * @param {number} id The ID of the text
 * @returns {WebsiteText}
 */
export async function getTextByID(id) {
    return await adb.get("SELECT * FROM website_texts WHERE id = ?", [id]);
}

/**
 * Adds a text to the database.
 * 
 * @param {string} url The URL of the text
 * @param {number} date The date of the text
 * @param {string} json The JSON content of the text
 */
export async function addText(url, date, json) {
    return await adb.run("INSERT INTO website_texts (url, date, json) VALUES (?, ?, ?)", [url, date, json]);
}

/**
 * Gets the last 10 documents.
 * 
 * @returns {WebsiteDoc[]}
 */
export async function getLast10Docs() {
    return await adb.all("SELECT * FROM website_docs ORDER BY date DESC LIMIT 10");
}

/**
 * Gets the last document by its URL.
 * 
 * @param {string} url The URL of the document
 * @returns {WebsiteDoc}
 */
export async function getLastDocByURL(url) {
    return await adb.get("SELECT * FROM website_docs WHERE url = ? ORDER BY date DESC LIMIT 1", [url]);
}

/**
 * Gets all documents by their URL.
 * 
 * @param {string} url The URL of the documents
 * @returns {WebsiteDoc[]}
 */
export async function getAllDocsByURL(url) {
    return await adb.all("SELECT * FROM website_docs WHERE url = ? ORDER BY date DESC", [url]);
}

/**
 * Gets all documents.
 * 
 * @returns {WebsiteDoc[]}
 */
export async function getAllDocs() {
    return await adb.all("SELECT * FROM website_docs ORDER BY date DESC");
}

/**
 * Gets a document by its ID.
 * 
 * @param {number} id The ID of the document
 * @returns {WebsiteDoc}
 */
export async function getDocByID(id) {
    return await adb.get("SELECT * FROM website_docs WHERE id = ?", [id]);
}

/**
 * Adds a document to the database.
 * 
 * @param {string} url The URL of the document
 * @param {number} date The date of the document
 * @param {string} file The file associated with the document
 */
export async function addDoc(url, date, file) {
    return await adb.run("INSERT INTO website_docs (url, date, file) VALUES (?, ?, ?)", [url, date, file]);
}

/**
 * Gets the last 10 photos.
 * 
 * @returns {WebsiteGallery[]}
 */
export async function getLast10Photos() {
    return await adb.all("SELECT * FROM website_gallery ORDER BY date DESC LIMIT 10");
}

/**
 * Gets all photos.
 * 
 * @returns {WebsiteGallery[]}
 */
export async function getAllPhotos() {
    return await adb.all("SELECT * FROM website_gallery ORDER BY date DESC");
}

/**
 * Gets the last photo by its photo ID.
 * 
 * @param {number} photo_id The ID of the photo
 * @returns {WebsiteGallery}
 */
export async function getLastPhotoByPhotoID(photo_id) {
    return await adb.get("SELECT * FROM website_gallery WHERE photo_id = ? ORDER BY date DESC LIMIT 1", [photo_id]);
}

/**
 * Gets a photo by its ID.
 * 
 * @param {number} id The ID of the photo
 * @returns {WebsiteGallery}
 */
export async function getPhotoByID(id) {
    return await adb.get("SELECT * FROM website_gallery WHERE id = ?", [id]);
}

/**
 * Adds a photo to the database.
 * 
 * @param {number} photo_id The ID of the photo
 * @param {string} url The URL of the photo
 * @param {number} date The date of the photo
 * @param {number} album_id The ID of the album
 * @param {string} album_name The name of the album
 */
export async function addPhoto(photo_id, url, date, album_id, album_name) {
    return await adb.run("INSERT INTO website_gallery (photo_id, url, date, album_id, album_name) VALUES (?, ?, ?, ?, ?)", [photo_id, url, date, album_id, album_name]);
}

/**
 * Gets the last 10 news items.
 * 
 * @returns {WebsiteNews[]}
 */
export async function getLast10News() {
    return await adb.all("SELECT * FROM website_news ORDER BY date DESC LIMIT 10");
}

/**
 * Gets the last news item by its news ID.
 * 
 * @param {number} news_id The ID of the news item
 * @returns {WebsiteNews}
 */
export async function getLastNewsByNewsID(news_id) {
    return await adb.get("SELECT * FROM website_news WHERE news_id = ? ORDER BY date DESC LIMIT 1", [news_id]);
}

/**
 * Gets all news items by their news ID.
 * 
 * @param {number} news_id The ID of the news items
 * @returns {WebsiteNews[]}
 */
export async function getAllNewsByNewsID(news_id) {
    return await adb.all("SELECT * FROM website_news WHERE news_id = ? ORDER BY date DESC", [news_id]);
}

/**
 * Gets all news items.
 * 
 * @returns {WebsiteNews[]}
 */
export async function getAllNews() {
    return await adb.all("SELECT * FROM website_news ORDER BY date DESC");
}

/**
 * Gets a news item by its ID.
 * 
 * @param {number} id The ID of the news item
 * @returns {WebsiteNews}
 */
export async function getNewsByID(id) {
    return await adb.get("SELECT * FROM website_news WHERE id = ?", [id]);
}

/**
 * Adds a news item to the database.
 * 
 * @param {number} news_id The ID of the news item
 * @param {string} url The URL of the news item
 * @param {number} date The date of the news item
 * @param {string} json The JSON content of the news item
 */
export async function addNews(news_id, url, date, json) {
    return await adb.run("INSERT INTO website_news (news_id, url, date, json) VALUES (?, ?, ?, ?)", [news_id, url, date, json]);
}

/**
 * Gets the last 10 DDG documents.
 * 
 * @returns {DDGDoc[]}
 */
export async function getLast10DDGDocs() {
    return await adb.all("SELECT * FROM ddg_docs ORDER BY date DESC LIMIT 10");
}

/**
 * Gets all DDG documents.
 * 
 * @returns {DDGDoc[]}
 */
export async function getAllDDGDocs() {
    return await adb.all("SELECT * FROM ddg_docs ORDER BY date DESC");
}

/**
 * Gets the last DDG document by its URL.
 * 
 * @param {string} url The URL of the DDG document
 * @returns {DDGDoc}
 */
export async function getLastDDGDocByURL(url) {
    return await adb.get("SELECT * FROM ddg_docs WHERE url = ? ORDER BY date DESC LIMIT 1", [url]);
}

/**
 * Gets a DDG document by its ID.
 * 
 * @param {number} id The ID of the DDG document
 * @returns {DDGDoc}
 */
export async function getDDGDocByID(id) {
    return await adb.get("SELECT * FROM ddg_docs WHERE id = ?", [id]);
}

/**
 * Adds a DDG document to the database.
 * 
 * @param {string} url The URL of the DDG document
 * @param {number} date The date of the DDG document
 * @param {string} name The name of the DDG document
 * @param {string} file The file associated with the DDG document
 */
export async function addDDGDoc(url, date, name, file) {
    return await adb.run("INSERT INTO ddg_docs (url, date, name, file) VALUES (?, ?, ?, ?)", [url, date, name, file]);
}

/**
 * Gets the last HH.ru dump.
 * 
 * @returns {HHRu} The dump
 */
export async function getLastHHRuDump() {
    return await adb.get("SELECT * FROM hhru ORDER BY date DESC LIMIT 1");
}

/**
 * Gets all HH.ru dumps.
 * 
 * @returns {HHRu[]} The dumps
 */
export async function getAllHHRuDumps() {
    return await adb.all("SELECT * FROM hhru ORDER BY date DESC");
}

/**
 * Adds an HH.ru dump to the database.
 * 
 * @param {number} date The date of the dump
 * @param {string} json The JSON dump
 */
export async function addHHRuDump(date, json) {
    return await adb.run("INSERT INTO hhru (date, json) VALUES (?, ?)", [date, json]);
}