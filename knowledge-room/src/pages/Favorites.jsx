import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/favorites.css";
import homeIcon from "../assets/icons/home.svg";
import favoritesIcon from "../assets/icons/heart.png";

const GRAPH_FAVORITE_PREFIX = "knowledge-room:saved:graph:";
const DETAIL_FAVORITE_PREFIX = "knowledge-room:saved:";

export default function Favorites() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const favorites = [];

    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key) continue;

        if (key.startsWith(GRAPH_FAVORITE_PREFIX)) {
          const value = window.localStorage.getItem(key);
          if (value === "true") {
            const topic = decodeURIComponent(key.slice(GRAPH_FAVORITE_PREFIX.length));
            favorites.push({
              id: key,
              type: "graph",
              label: topic,
              target: `/graph/${encodeURIComponent(topic)}`,
            });
          }
        }

        if (
          key.startsWith(DETAIL_FAVORITE_PREFIX) &&
          !key.startsWith(GRAPH_FAVORITE_PREFIX)
        ) {
          const value = window.localStorage.getItem(key);
          if (!value) continue;

          const detailId = key.slice(DETAIL_FAVORITE_PREFIX.length);
          let label = detailId;
          let saved = false;

          try {
            const parsed = JSON.parse(value);
            saved = parsed?.saved === true || parsed?.saved === "true";
            if (parsed?.label) label = parsed.label;
          } catch {
            saved = value === "true";
          }

          if (saved) {
            favorites.push({
              id: key,
              type: "detail",
              label,
              target: `/detail/${encodeURIComponent(detailId)}`,
            });
          }
        }
      }
    } catch {
      // ignore storage access errors
    }

    setItems(favorites);
  }, []);

  const favoriteGroups = useMemo(() => {
    const graph = items.filter((item) => item.type === "graph");
    const detail = items.filter((item) => item.type === "detail");
    return { graph, detail };
  }, [items]);

  const removeFavorite = (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setItems((current) => current.filter((item) => item.id !== key));
  };

  return (
    <main className="favoritesPage">
      <aside className="favoritesSidebar">
        <div className="favoritesSidebarTop" aria-label="Knowledge Room">
        </div>

        <nav className="favoritesSidebarNav" aria-label="Navigazione preferiti">
          <button
            type="button"
            className="favoritesNavItem"
            onClick={() => navigate("/")}
            title="Home"
          >
            <img src={homeIcon} alt="Home" className="favoritesNavIcon" />
          </button>
        </nav>
      </aside>

      <section className="favoritesShell">
        <header className="favoritesTopbar">
          <div>
            <p className="favoritesEyebrow">PREFERITI</p>
            <h1>I tuoi elementi salvati</h1>
          </div>
        </header>

        <div className="favoritesContent">
          {items.length === 0 ? (
            <div className="favoritesEmpty">
              <p>Nessun elemento salvato nei preferiti.</p>
              <span>Salva un grafo o una scheda per trovarli qui.</span>
            </div>
          ) : (
            <div className="favoritesList">
              {favoriteGroups.graph.length > 0 && (
                <div className="favoritesGroup">
                  <h2>Grafi salvati</h2>
                  <div className="favoritesItems">
                    {favoriteGroups.graph.map((item) => (
                      <article key={item.id} className="favoriteCard">
                        <div>
                          <strong>{item.label}</strong>
                          <span>Grafo</span>
                        </div>
                        <div className="favoriteCardActions">
                          <button
                            type="button"
                            onClick={() => navigate(item.target)}
                          >
                            Apri
                          </button>
                          <button
                            type="button"
                            className="removeButton"
                            onClick={() => removeFavorite(item.id)}
                          >
                            Rimuovi
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {favoriteGroups.detail.length > 0 && (
                <div className="favoritesGroup">
                  <h2>Schede salvate</h2>
                  <div className="favoritesItems">
                    {favoriteGroups.detail.map((item) => (
                      <article key={item.id} className="favoriteCard">
                        <div>
                          <strong>{item.label}</strong>
                          <span>Scheda dettagli</span>
                        </div>
                        <div className="favoriteCardActions">
                          <button
                            type="button"
                            onClick={() => navigate(item.target)}
                          >
                            Apri
                          </button>
                          <button
                            type="button"
                            className="removeButton"
                            onClick={() => removeFavorite(item.id)}
                          >
                            Rimuovi
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
