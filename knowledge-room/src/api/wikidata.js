import axios from "axios";

export async function getWikidataId(title) {
  const res = await axios.get(
    "https://en.wikipedia.org/w/api.php",
    {
      params: {
        action: "query",
        titles: title,
        prop: "pageprops",
        format: "json",
        origin: "*",
      },
    }
  );

  const pages = res.data.query.pages;
  const page = Object.values(pages)[0];

  return page.pageprops.wikibase_item; // QID
}

export async function getEntityRelations(qid) {
  const res = await axios.get(
    `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`
  );

  const entity = res.data.entities[qid];

  const claims = entity.claims;

  // prendiamo solo "linked items" (P279 = subclass, P31 = instance of ecc.)
  let links = [];

  Object.keys(claims).forEach((prop) => {
    claims[prop].forEach((c) => {
      if (c.mainsnak?.datavalue?.value?.id) {
        links.push(c.mainsnak.datavalue.value.id);
      }
    });
  });

  return links.slice(0, 10); // limitiamo per UI
}