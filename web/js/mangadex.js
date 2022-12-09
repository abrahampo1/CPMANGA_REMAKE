const MFA = require("mangadex-full-api");

class mangadex {
  constructor() {}
  search = async function (query) {
    let m = await MFA.Manga.search(query);
    return m;
  };
}

const MDEX = new mangadex();
