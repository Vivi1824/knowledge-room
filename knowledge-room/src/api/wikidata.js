import axios from "axios";

const endpoint = "https://query.wikidata.org/sparql";

export async function searchEntity(search) {
  const normalizedSearch = search?.trim();

  if (/^Q\d+$/i.test(normalizedSearch)) {
    const qid = normalizedSearch.toUpperCase();
    const entityRes = await axios.get(
      "https://www.wikidata.org/w/api.php",
      {
        params: {
          action: "wbgetentities",
          ids: qid,
          props: "labels|descriptions",
          languages: "it|en",
          languagefallback: 1,
          format: "json",
          origin: "*",
        },
      }
    );
    const entity = entityRes.data?.entities?.[qid];

    if (!entity || entity.missing !== undefined) return null;

    return {
      id: qid,
      label:
        entity.labels?.it?.value ||
        entity.labels?.en?.value ||
        qid,
      description:
        entity.descriptions?.it?.value ||
        entity.descriptions?.en?.value ||
        "",
    };
  }

  const res = await axios.get(
    "https://www.wikidata.org/w/api.php",
    {
      params: {
        action: "wbsearchentities",
        search: normalizedSearch,
        language: "en",
        format: "json",
        origin: "*"
      }
    }
  );

  if (!res.data.search.length) return null;

  return res.data.search[0];
}

export async function getNeighbors(qid) {
  const query = `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>

SELECT ?item ?itemLabel WHERE {
  wd:${qid} ?p ?item.

  FILTER(STRSTARTS(STR(?p), STR(wdt:)))
  FILTER(isIRI(?item))

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en,it".
  }
}
LIMIT 120
`;

  const res = await axios.get(endpoint, {
    params: {
      format: "json",
      query,
      origin: "*"
    }
  });

  const bindings = res.data?.results?.bindings || [];
  const rows = bindings
    .filter((r) => r.item?.value && r.itemLabel?.value)
    .map((r) => ({
      id: r.item.value.split("/").pop(),
      label: r.itemLabel.value,
    }));

  const isMeaningful = (label) => {
    if (!label || typeof label !== "string") return false;
    const value = label.trim().toLowerCase();
    if (value.length < 3) return false;

    const blocked = [
      /^statement\//,
      /^https?:\/\//,
      /:\/\//,
      /\/special:/,
      /\.ogg$/,
      /wikimedia/i,
      /factgrid/i,
      /id\.loc\.gov/i,
      /statement/,
      /claim/,
      /property/,
      /uri/,
      /qid/,
    ];

    return !blocked.some((pattern) => pattern.test(value));
  };

  const meaningful = rows.filter((row) => isMeaningful(row.label));
  const unique = [];
  for (const row of rows) {
    if (!unique.find((item) => item.id === row.id)) {
      unique.push(row);
    }
  }

  if (meaningful.length > 0) {
    return meaningful.slice(0, 30);
  }

  return unique.slice(0, 30);
}
