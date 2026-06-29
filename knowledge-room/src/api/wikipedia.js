import axios from "axios";

export async function searchWiki(query) {
  const res = await axios.get(
    `https://en.wikipedia.org/w/api.php`,
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
  const res = await axios.get(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`
  );

  return res.data;
}