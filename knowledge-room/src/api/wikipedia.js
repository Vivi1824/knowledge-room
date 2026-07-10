import axios from "axios";

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const summaryCache = new Map();
const detailsCache = new Map();

const FACT_PROPERTIES = [
  ["P31", "Tipo"],
  ["P279", "Sottoclasse di"],
  ["P106", "Professione"],
  ["P101", "Campo di attività"],
  ["P27", "Cittadinanza"],
  ["P17", "Paese"],
  ["P131", "Località"],
  ["P19", "Luogo di nascita"],
  ["P20", "Luogo di morte"],
  ["P569", "Data di nascita"],
  ["P570", "Data di morte"],
  ["P571", "Data di fondazione"],
  ["P576", "Data di scioglimento"],
  ["P577", "Data di pubblicazione"],
  ["P50", "Autore"],
  ["P57", "Regia"],
  ["P170", "Creatore"],
  ["P112", "Fondatore"],
  ["P136", "Genere"],
  ["P361", "Parte di"],
  ["P159", "Sede"],
  ["P740", "Luogo di fondazione"],
  ["P495", "Paese di origine"],
  ["P364", "Lingua originale"],
  ["P166", "Riconoscimenti"],
  ["P69", "Formazione"],
  ["P108", "Datore di lavoro"],
  ["P463", "Membro di"],
  ["P1412", "Lingue parlate"],
];

export async function searchWiki(query) {
  const res = await axios.get("https://en.wikipedia.org/w/api.php", {
    params: {
      action: "query",
      list: "search",
      srsearch: query,
      format: "json",
      origin: "*",
    },
  });

  return res.data.query.search;
}

export async function getSummary(title, language = "en") {
  const safeTitle = encodeURIComponent(title);
  const res = await axios.get(
    `https://${language}.wikipedia.org/api/rest_v1/page/summary/${safeTitle}`,
    {
      params: {
        redirect: true,
      },
    },
  );

  return res.data;
}

export async function getSummaryByWikidataId(qid) {
  const normalizedQid = qid.toUpperCase();
  if (summaryCache.has(normalizedQid)) return summaryCache.get(normalizedQid);

  const request = getWikidataEntity(
    normalizedQid,
    "sitelinks|labels|descriptions",
  ).then((entity) => buildEntitySummary(entity, normalizedQid));

  summaryCache.set(normalizedQid, request);

  try {
    return await request;
  } catch (error) {
    summaryCache.delete(normalizedQid);
    throw error;
  }
}

export async function getDetails(title, language = "en") {
  const summary = await getSummary(title, language);
  const article = await getArticleDetails(summary.title || title, summary.lang || language);

  return mergeArticleDetails(summary, article, {
    sourceName: "Wikipedia",
  });
}

export async function getDetailsByWikidataId(qid) {
  const normalizedQid = qid.toUpperCase();
  if (detailsCache.has(normalizedQid)) return detailsCache.get(normalizedQid);

  const request = getWikidataEntity(
    normalizedQid,
    "sitelinks|labels|descriptions|claims",
  ).then(async (entity) => {
    const summary = summaryCache.has(normalizedQid)
      ? await summaryCache.get(normalizedQid)
      : await buildEntitySummary(entity, normalizedQid);
    const { wikiTitle, language } = getWikiTarget(entity);

    summaryCache.set(normalizedQid, Promise.resolve(summary));

    const [article, facts] = await Promise.all([
      wikiTitle
        ? getArticleDetails(wikiTitle, language).catch(() => null)
        : Promise.resolve(null),
      getStructuredFacts(entity?.claims).catch(() => []),
    ]);

    return mergeArticleDetails(summary, article, {
      facts,
      sourceName: wikiTitle ? "Wikipedia + Wikidata" : "Wikidata",
      hasDetailedInfo: summary.hasDetailedInfo || facts.length > 0,
    });
  });

  detailsCache.set(normalizedQid, request);

  try {
    return await request;
  } catch (error) {
    detailsCache.delete(normalizedQid);
    throw error;
  }
}

async function getWikidataEntity(qid, props) {
  const entityRes = await axios.get(WIKIDATA_API, {
    params: {
      action: "wbgetentities",
      ids: qid,
      props,
      languages: "it|en",
      languagefallback: 1,
      sitefilter: "itwiki|enwiki",
      format: "json",
      origin: "*",
    },
  });

  const entity = entityRes.data?.entities?.[qid];

  if (!entity || entity.missing !== undefined) {
    throw new Error("Entità Wikidata non trovata.");
  }

  return entity;
}

async function buildEntitySummary(entity, qid) {
  const { wikiTitle, language } = getWikiTarget(entity);
  const label = getLocalizedValue(entity?.labels) || qid;
  const entityDescription = getLocalizedValue(entity?.descriptions);

  if (wikiTitle) {
    try {
      const summary = await getSummary(wikiTitle, language);

      return {
        ...summary,
        wikidataId: qid,
        entityDescription: entityDescription || summary.description,
        sourceName: "Wikipedia + Wikidata",
        hasDetailedInfo: Boolean(summary.extract?.trim()),
      };
    } catch {
      // A Wikidata-only card is still useful when the linked article is unavailable.
    }
  }

  return {
    type: "wikidata",
    title: label,
    lang: entity?.labels?.it ? "it" : "en",
    wikidataId: qid,
    entityDescription,
    description: entityDescription,
    extract:
      entityDescription ||
      "Questa entità è disponibile su Wikidata, ma non ha ancora una voce enciclopedica collegata.",
    content_urls: {
      desktop: {
        page: `https://www.wikidata.org/wiki/${qid}`,
      },
    },
    sourceName: "Wikidata",
    hasDetailedInfo: Boolean(entityDescription?.trim()),
  };
}

function getWikiTarget(entity) {
  const italianTitle = entity?.sitelinks?.itwiki?.title;
  const englishTitle = entity?.sitelinks?.enwiki?.title;

  return {
    wikiTitle: italianTitle || englishTitle,
    language: italianTitle ? "it" : "en",
  };
}

async function getArticleDetails(title, language) {
  const response = await axios.get(`https://${language}.wikipedia.org/w/api.php`, {
    params: {
      action: "query",
      prop: "extracts|pageimages|categories|info",
      titles: title,
      redirects: 1,
      exintro: 1,
      explaintext: 1,
      piprop: "thumbnail|original",
      pithumbsize: 900,
      cllimit: 12,
      clshow: "!hidden",
      inprop: "url",
      format: "json",
      origin: "*",
    },
  });

  const page = Object.values(response.data?.query?.pages || {})[0];

  if (!page || page.missing !== undefined) return null;

  return {
    title: page.title,
    extract: page.extract,
    categories: (page.categories || []).map((category) =>
      category.title.replace(/^(Categoria|Category):/i, ""),
    ),
    thumbnail: page.thumbnail,
    originalimage: page.original,
    timestamp: page.touched,
    pageid: page.pageid,
    sourceUrl: page.fullurl,
  };
}

function mergeArticleDetails(summary, article, extra = {}) {
  const fullExtract = article?.extract?.trim() || summary.extract;

  return {
    ...summary,
    ...extra,
    title: article?.title || summary.title,
    summaryExtract: summary.extract,
    extract: fullExtract,
    categories: article?.categories || [],
    thumbnail: article?.thumbnail || summary.thumbnail,
    originalimage: article?.originalimage || summary.originalimage,
    timestamp: article?.timestamp || summary.timestamp,
    pageid: article?.pageid || summary.pageid,
    content_urls: article?.sourceUrl
      ? {
          ...summary.content_urls,
          desktop: {
            ...summary.content_urls?.desktop,
            page: article.sourceUrl,
          },
        }
      : summary.content_urls,
  };
}

async function getStructuredFacts(claims = {}) {
  const selectedFacts = [];
  const entityIds = new Set();

  for (const [propertyId, label] of FACT_PROPERTIES) {
    const statements = (claims[propertyId] || [])
      .filter((statement) => statement.rank !== "deprecated")
      .slice(0, 3);
    const values = [];

    for (const statement of statements) {
      const value = normalizeClaimValue(statement?.mainsnak?.datavalue);
      if (!value) continue;
      if (value.entityId) entityIds.add(value.entityId);
      values.push(value);
    }

    if (values.length) {
      selectedFacts.push({ propertyId, label, values });
    }

    if (selectedFacts.length >= 10) break;
  }

  const labels = await resolveEntityLabels([...entityIds]);

  return selectedFacts.map((fact) => ({
    id: fact.propertyId,
    label: fact.label,
    value: fact.values
      .map((item) => item.entityId ? labels[item.entityId] || item.entityId : item.value)
      .filter(Boolean)
      .join(" · "),
  }));
}

function normalizeClaimValue(datavalue) {
  if (!datavalue) return null;

  if (datavalue.type === "wikibase-entityid" && datavalue.value?.id) {
    return { entityId: datavalue.value.id };
  }

  if (datavalue.type === "time") {
    return { value: formatWikidataTime(datavalue.value) };
  }

  if (datavalue.type === "monolingualtext") {
    return { value: datavalue.value?.text };
  }

  if (datavalue.type === "globecoordinate") {
    const latitude = Number(datavalue.value?.latitude);
    const longitude = Number(datavalue.value?.longitude);

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { value: `${latitude.toFixed(3)}, ${longitude.toFixed(3)}` };
    }
  }

  if (typeof datavalue.value === "string") {
    return { value: datavalue.value };
  }

  return null;
}

async function resolveEntityLabels(ids) {
  if (!ids.length) return {};

  const response = await axios.get(WIKIDATA_API, {
    params: {
      action: "wbgetentities",
      ids: ids.join("|"),
      props: "labels",
      languages: "it|en",
      languagefallback: 1,
      format: "json",
      origin: "*",
    },
  });

  return Object.fromEntries(
    Object.entries(response.data?.entities || {}).map(([id, entity]) => [
      id,
      getLocalizedValue(entity.labels) || id,
    ]),
  );
}

function getLocalizedValue(values = {}) {
  return values.it?.value || values.en?.value || values[Object.keys(values)[0]]?.value;
}

function formatWikidataTime(timeValue) {
  const match = timeValue?.time?.match(/^([+-])(\d+)-(\d{2})-(\d{2})/);
  if (!match) return "";

  const [, sign, rawYear, rawMonth, rawDay] = match;
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);
  const suffix = sign === "-" ? " a.C." : "";

  if (timeValue.precision >= 11 && day > 0 && month > 0) {
    return `${day} ${monthName(month)} ${year}${suffix}`;
  }

  if (timeValue.precision >= 10 && month > 0) {
    return `${monthName(month)} ${year}${suffix}`;
  }

  return `${year}${suffix}`;
}

function monthName(month) {
  return [
    "",
    "gennaio",
    "febbraio",
    "marzo",
    "aprile",
    "maggio",
    "giugno",
    "luglio",
    "agosto",
    "settembre",
    "ottobre",
    "novembre",
    "dicembre",
  ][month] || "";
}
