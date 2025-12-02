import * as simple from "letovo-archive-archiver";
import * as storage from "./storage.js";

const date = () => new Date().getTime();

/**
 * Archives docs found on DDG.
 */
export async function archiveDDGDocs() {
    const archiver = new simple.DocsArchiver();
    let errs = 0;
    while(true) {
        try {
            const res = await archiver.archiveDocs();
            if(res.length === 0) break;
            for(const doc of res) {
                const lastMatching = await storage.getLastDDGDocByURL(doc.originalURL);
                if(lastMatching && storage.readData(lastMatching.file).equals(doc.contents)) continue;
                const uuid = storage.write(doc.name, doc.contents);
                await storage.addDDGDoc(doc.originalURL, date(), doc.name, uuid);
            }
        } catch(e) {
            errs++;
            if(errs >= 100) throw e;
        }
    }
}

/**
 * Archives HH.ru vacancies.
 * 
 * @param {string} email The e-mail to use in the user agent
 */
export async function archiveHHRu(email) {
    const archiver = new simple.HHArchiver(email);
    const res = await archiver.archiveVacancies();
    const lastRes = await storage.getLastHHRuDump();
    if(lastRes && JSON.stringify(res) === lastRes.json) return;
    await storage.addHHRuDump(date(), JSON.stringify(res));
}

/**
 * Archives CRT.sh records.
 */
export async function archiveCRTSh() {
    const archiver = new simple.CrtSHArchiver();
    const res = await archiver.archiveDomains();
    const lastRes = await storage.getLastCRTShDump();
    if(lastRes && JSON.stringify(res) === lastRes.json) return;
    await storage.addCRTShDump(date(), JSON.stringify(res));
}

/**
 * Archives everything on Letovo's website.
 */
export async function archiveWebsite() {
    const archiver = new simple.WebsiteArchiver();

    const docs = await archiver.archiveDocs();
    for(const doc of Object.values(docs.json.docs)) {
        const lastDoc = await storage.getLastDocByURL(doc.url);
        if(lastDoc && await storage.readData(lastDoc.file).equals(doc.data)) continue;
        const uuid = storage.write(doc.url, doc.data);
        await storage.addDoc(doc.url, date(), uuid);
    }

    const news = await archiver.archiveNews();
    for(const newsItem of news.json.data) {
        const lastNews = await storage.getLastNewsByNewsID(newsItem.id);
        if(lastNews && lastNews.json === JSON.stringify(newsItem)) continue;
        await storage.addNews(newsItem.id, newsItem.url, date(), JSON.stringify(newsItem));
    }

    const vacancies = await archiver.archiveVacancies();
    for(const vacancy of Object.values(vacancies.json)) {
        const lastVacancy = storage.getLastVacancyByVacancyID(vacancy.id);
        if(lastVacancy/* && lastVacancy.vacancy === JSON.stringify(vacancy)*/) continue;
        await storage.addVacancy(vacancy.id, date(), JSON.stringify(vacancy));
    }

    const textPages = await archiver.archiveTextPages();
    for(const page of textPages) {
        const lastPage = await storage.getLastTextByURL(page.url);
        if(lastPage && lastPage.json === JSON.stringify(page.json)) continue;
        await storage.addText(page.url, date(), JSON.stringify(page.json));
    }

    const gallery = await archiver.archiveGallery();
    for(const album of gallery.json.items) {
        for(const photo of album.media) {
            const lastPhoto = storage.getLastPhotoByPhotoID(photo.id);
            if(lastPhoto/* && lastPhoto.album_id == album.id && lastPhoto.album_name == album.title*/) continue;
            await storage.addPhoto(photo.id, photo.original_url, date(), album.id, album.title);
        }
    }
}

export async function archiveLibrary(username, password) {
    const archiver = new simple.LibraryArchiver(username, password);
    const res = await archiver.archiveLibrary();
    for(const book of res) {
        const lastBook = storage.getLastBookByLink(book.link);
        if(lastBook && lastBook.title === book.title && lastBook.identifier === book.identifier) continue;
        await storage.addBook(date(), book.title, book.identifier, book.link);
    }
}

async function wrapTryCatch(func) {
    try {
        await func();
    } catch(e) {
        console.error(e);
    }
}

/**
 * Archives everything Letovo!
 * 
 * @param {string} email The e-mail to use in the user agent for HH.ru
 * @param {string} libUsername Letovo username to use for library dumps
 * @param {string} libPassword Letovo password to use for library dumps
 */
export async function archiveAll(email, libUsername = "", libPassword = "") {
    await wrapTryCatch(async () => await archiveDDGDocs());
    if(email)  await wrapTryCatch(async () => await archiveHHRu(email));
    await wrapTryCatch(async () => await archiveCRTSh());
    await wrapTryCatch(async () => await archiveWebsite());
    if(libUsername && libPassword) await wrapTryCatch(async () => await archiveLibrary(libUsername, libPassword)); // longest, keep last
}