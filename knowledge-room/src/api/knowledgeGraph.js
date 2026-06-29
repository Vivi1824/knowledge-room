import axios from "axios";

const WIKI = "https://en.wikipedia.org/w/api.php";
const WIKIDATA = "https://www.wikidata.org/wiki/Special:EntityData";

export async function buildGraph(topic) {

    // Cerca la pagina Wikipedia
    const search = await axios.get(WIKI, {
        params: {
            action: "query",
            list: "search",
            srsearch: topic,
            format: "json",
            origin: "*"
        }
    });

    if (!search.data.query.search.length)
        return null;

    const pageTitle = search.data.query.search[0].title;

    // Ottiene il QID
    const page = await axios.get(WIKI, {
        params: {
            action: "query",
            titles: pageTitle,
            prop: "pageprops",
            format: "json",
            origin: "*"
        }
    });

    const wikiPage = Object.values(page.data.query.pages)[0];

    const qid = wikiPage.pageprops?.wikibase_item;

    if (!qid)
        return null;

    // Scarica Wikidata
    const entityRes = await axios.get(
        `${WIKIDATA}/${qid}.json`
    );

    const entity = entityRes.data.entities[qid];

    const nodes = [
        {
            id: qid,
            label: pageTitle
        }
    ];

    const links = [];

    let count = 0;

    for (const property in entity.claims) {

        if (count >= 20) break;

        for (const claim of entity.claims[property]) {

            const value = claim.mainsnak?.datavalue?.value;

            if (!value?.id) continue;

            const linkedQid = value.id;

            try {

                const linkedRes = await axios.get(
                    `${WIKIDATA}/${linkedQid}.json`
                );

                const linked = linkedRes.data.entities[linkedQid];

                const label =
                    linked.labels?.it?.value ||
                    linked.labels?.en?.value;

                if (!label) continue;

                nodes.push({
                    id: linkedQid,
                    label
                });

                links.push({
                    source: qid,
                    target: linkedQid
                });

                count++;

            } catch {

            }

            if (count >= 20)
                break;
        }
    }

    return {
        nodes,
        links
    };
}