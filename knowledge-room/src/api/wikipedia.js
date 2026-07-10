import axios from "axios";

export async function searchWiki(query) {
  const res = await axios.get(
    "https://en.wikipedia.org/w/api.php",
    {
      params: {
        action: "query",
        list: "search",
        srsearch: query,
        format: "json",
        origin: "*",
      },
    }
  );

  return res.data.query.search;
}

export async function getSummary(title) {
  const safeTitle = encodeURIComponent(title);
  const res = await axios.get(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${safeTitle}`
  );

  return res.data;
}

export async function getSummaryByWikidataId(qid) {
  const entityRes = await axios.get(
    "https://www.wikidata.org/w/api.php",
    {
      params: {
        action: "wbgetentities",
        ids: qid,
        props: "sitelinks|labels",
        format: "json",
        origin: "*",
      },
    }
  );

  const entity = entityRes.data?.entities?.[qid];
  const englishTitle = entity?.sitelinks?.enwiki?.title;

  if (englishTitle) {
    return getSummary(englishTitle);
  }

  const fallbackLabel = entity?.labels?.en?.value || entity?.labels?.[Object.keys(entity?.labels || {})[0]]?.value;

  if (!fallbackLabel) {
    throw new Error("Nessun titolo Wikipedia trovato per questo nodo.");
  }

  return getSummary(fallbackLabel);
}