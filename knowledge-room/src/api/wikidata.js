import axios from "axios";

const endpoint = "https://query.wikidata.org/sparql";

export async function searchEntity(search) {
  const res = await axios.get(
    "https://www.wikidata.org/w/api.php",
    {
      params: {
        action: "wbsearchentities",
        search,
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
SELECT ?item ?itemLabel WHERE {
  wd:${qid} ?p ?item.

  FILTER(isIRI(?item))

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
  }
}
LIMIT 25
`;

  const res = await axios.get(endpoint, {
    params: {
      format: "json",
      query
    }
  });

  return res.data.results.bindings.map((r) => ({
    id: r.item.value.split("/").pop(),
    label: r.itemLabel.value
  }));
}