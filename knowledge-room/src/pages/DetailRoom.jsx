import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getDetails, getDetailsByWikidataId } from "../api/wikipedia";
import "../styles/detail.css";

import ambientImage from "../assets/image.png";
import brainIcon from "../assets/brain.svg";
import compassIcon from "../assets/compass.svg";
import homeIcon from "../assets/icons/home.svg";
import shareIcon from "../assets/icons/share.png";
import favoritesIcon from "../assets/icons/heart.png";

const isWikidataId = (value = "") => /^Q\d+$/i.test(value);

export default function DetailRoom() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [requestKey, setRequestKey] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [savedOverride, setSavedOverride] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      setStatus("loading");
      setData(null);

      try {
        const result = isWikidataId(id)
          ? await getDetailsByWikidataId(id.toUpperCase())
          : await getDetails(id);

        if (!cancelled) {
          setData(result);
          setStatus("success");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [id, requestKey]);

  useEffect(() => {
    if (!feedback) return undefined;

    const timeoutId = window.setTimeout(() => setFeedback(""), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const sourceUrl = data?.content_urls?.desktop?.page;
  const imageUrl = data?.thumbnail?.source || data?.originalimage?.source;
  const description = data?.entityDescription || data?.description;
  const language = data?.lang?.toUpperCase() || "—";
  const sourceName = data?.sourceName || "Wikipedia";
  const articleParagraphs = splitParagraphs(data?.extract);
  const summaryText = data?.summaryExtract || articleParagraphs[0];
  const facts = data?.facts || [];
  const categories = data?.categories || [];
  const isSaved = savedOverride?.id === id
    ? savedOverride.value
    : readSavedState(id);
  const readTime = getReadTime(data?.extract);
  const lastUpdated = formatLastUpdated(data?.timestamp);

  const handleShare = async () => {
    const shareData = {
      title: `Knowledge Room — ${data?.title || id}`,
      text: `Esplora ${data?.title || id} nella Sala della Conoscenza.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setFeedback("Condivisione completata");
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      setFeedback("Link copiato negli appunti");
    } catch (error) {
      if (error?.name !== "AbortError") {
        setFeedback("Condivisione non disponibile");
      }
    }
  };

  const toggleSaved = () => {
    const nextValue = !isSaved;

    try {
      if (nextValue) {
        window.localStorage.setItem(
          savedKey(id),
          JSON.stringify({ saved: true, label: data?.title || id })
        );
      } else {
        window.localStorage.removeItem(savedKey(id));
      }
    } catch {
      // The visual state still works when storage is unavailable.
    }

    setSavedOverride({ id, value: nextValue });
    setFeedback(nextValue ? "Aggiunto ai preferiti" : "Rimosso dai preferiti");
  };

  return (
    <main className="detailPage">
      <aside className="detailSidebar">
        <div className="detailSidebarTop" aria-label="Knowledge Room">
        </div>

        <nav className="detailSidebarNav" aria-label="Navigazione dettagli">
          <button
            type="button"
            className="detailNavItem"
            onClick={() => navigate("/")}
            title="Home"
          >
            <img src={homeIcon} alt="Home" className="detailNavIcon" />
          </button>

          <button
            type="button"
            className="detailNavItem"
            onClick={handleShare}
            title="Condividi"
          >
            <img src={shareIcon} alt="Condividi" className="detailNavIcon" />
          </button>

          <button
            type="button"
            className={`detailNavItem ${isSaved ? "isActive" : ""}`}
            onClick={toggleSaved}
            title={isSaved ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
            aria-pressed={isSaved}
          >
            <img src={favoritesIcon} alt="Preferiti" className="detailNavIcon" />
          </button>
        </nav>

        <div className="detailSidebarBottom">
          <img src={compassIcon} alt="" className="detailCompassIcon" />
        </div>
      </aside>

      <section className="detailShell">
        <div className="detailBackdrop" aria-hidden="true">
          <img src={ambientImage} className="detailBgImage" alt="" />
          <div className="detailGrid" />
        </div>

        <header className="detailTopbar">
          <button
            type="button"
            className="detailBackButton"
            onClick={() => navigate(-1)}
            aria-label="Torna alla pagina precedente"
          >
            <span aria-hidden="true">←</span>
            <span>Indietro</span>
          </button>

          <div className="detailTopbarBrand">
            <img src={brainIcon} alt="" />
            <div>
              <span>SALA DELLA CONOSCENZA</span>
              <strong>Archivio dei dettagli</strong>
            </div>
          </div>

          <div className="detailTopbarActions">
            <button type="button" onClick={handleShare}>
              <img src={shareIcon} alt="" />
              <span>Condividi</span>
            </button>
            <button
              type="button"
              className={isSaved ? "isActive" : ""}
              onClick={toggleSaved}
              aria-pressed={isSaved}
            >
              <img src={favoritesIcon} alt="" />
              <span>{isSaved ? "Salvato" : "Salva"}</span>
            </button>
          </div>
        </header>

        <div className="detailContent">
          {status === "loading" && <DetailLoading />}

          {status === "error" && (
            <DetailError onRetry={() => setRequestKey((key) => key + 1)} />
          )}

          {status === "success" && data && (
            <>
              <article className="detailHero">
                <div className={`detailArtwork ${imageUrl ? "hasImage" : ""}`}>
                  {imageUrl ? (
                    <img src={imageUrl} alt={`Immagine di ${data.title}`} />
                  ) : (
                    <div className="detailArtworkFallback">
                      <img src={brainIcon} alt="" />
                      <span>Knowledge Room</span>
                    </div>
                  )}
                  <div className="detailArtworkShade" />
                  <span className="detailArtworkBadge">Dati verificati</span>
                </div>

                <div className="detailIntro">
                  <div className="detailEyebrow">
                    <span />
                    Scheda di conoscenza
                  </div>

                  <h1>{data.title}</h1>

                  {description && <p className="detailDescription">{description}</p>}

                  <div className="detailTags" aria-label="Metadati principali">
                    <span>{sourceName}</span>
                    <span>Lingua {language}</span>
                    {data.wikidataId && <span>{data.wikidataId}</span>}
                  </div>

                  {summaryText && <p className="detailExtract">{summaryText}</p>}

                  <div className="detailCtas">
                    <button
                      type="button"
                      className="detailPrimaryButton"
                      onClick={() => navigate(`/graph/${encodeURIComponent(data.title)}`)}
                    >
                      Esplora nel grafo
                      <span aria-hidden="true">↗</span>
                    </button>

                    {sourceUrl && (
                      <a
                        className="detailSecondaryButton"
                        href={sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Apri la fonte
                        <span aria-hidden="true">→</span>
                      </a>
                    )}
                  </div>
                </div>
              </article>

              <section className="detailInfoGrid" aria-label="Informazioni sulla voce">
                <div className="detailInfoCard detailInfoCardWide">
                  <span className="detailInfoIcon" aria-hidden="true">◎</span>
                  <div>
                    <p>Fonte</p>
                    <strong>{sourceName}</strong>
                    <small>Fonti collegate e dati strutturati del nodo</small>
                  </div>
                </div>

                <div className="detailInfoCard">
                  <span className="detailInfoIcon" aria-hidden="true">◷</span>
                  <div>
                    <p>Tempo di lettura</p>
                    <strong>{readTime} min</strong>
                    <small>{getWordCount(data.extract)} parole circa</small>
                  </div>
                </div>

                <div className="detailInfoCard">
                  <span className="detailInfoIcon" aria-hidden="true">◇</span>
                  <div>
                    <p>Ultimo controllo</p>
                    <strong>{lastUpdated}</strong>
                    <small>Dati sincronizzati dalla fonte</small>
                  </div>
                </div>
              </section>

              <section className="detailDeepDive" aria-labelledby="detail-deep-title">
                <header className="detailSectionHeader">
                  <div>
                    <p className="detailEyebrow">
                      <span />
                      Analisi del nodo
                    </p>
                    <h2 id="detail-deep-title">Approfondimento</h2>
                  </div>
                  <p>
                    Informazioni estese e attributi principali raccolti dalle fonti
                    collegate.
                  </p>
                </header>

                <div className="detailDeepGrid">
                  <article className="detailArticlePanel">
                    <div className="detailPanelHeading">
                      <span aria-hidden="true">≋</span>
                      <div>
                        <p>Voce enciclopedica</p>
                        <strong>{data.title}</strong>
                      </div>
                    </div>

                    <div className="detailArticleCopy">
                      {articleParagraphs.map((paragraph, index) => (
                        <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                      ))}
                    </div>

                    {categories.length > 0 && (
                      <div className="detailCategories">
                        <p>Ambiti correlati</p>
                        <div>
                          {categories.map((category) => (
                            <button
                              type="button"
                              key={category}
                              onClick={() => navigate(`/graph/${encodeURIComponent(category)}`)}
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>

                  <aside className="detailFactsPanel">
                    <div className="detailPanelHeading">
                      <span aria-hidden="true">⌘</span>
                      <div>
                        <p>Dati strutturati</p>
                        <strong>Informazioni chiave</strong>
                      </div>
                    </div>

                    {facts.length > 0 ? (
                      <dl className="detailFactsList">
                        {facts.map((fact) => (
                          <div key={fact.id}>
                            <dt>{fact.label}</dt>
                            <dd>{fact.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="detailFactsEmpty">
                        Non sono disponibili altri attributi strutturati per questo nodo.
                      </p>
                    )}

                    {sourceUrl && (
                      <a
                        className="detailFactsSource"
                        href={sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Verifica sulla fonte
                        <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </aside>
                </div>
              </section>
            </>
          )}
        </div>

        <div className={`detailToast ${feedback ? "isVisible" : ""}`} aria-live="polite">
          {feedback}
        </div>
      </section>
    </main>
  );
}

function DetailLoading() {
  return (
    <div className="detailLoading" aria-live="polite" aria-label="Caricamento dettagli">
      <div className="detailSkeleton detailSkeletonArtwork" />
      <div className="detailSkeletonCopy">
        <div className="detailSkeleton detailSkeletonLabel" />
        <div className="detailSkeleton detailSkeletonTitle" />
        <div className="detailSkeleton detailSkeletonText" />
        <div className="detailSkeleton detailSkeletonText short" />
      </div>
    </div>
  );
}

function DetailError({ onRetry }) {
  const navigate = useNavigate();

  return (
    <div className="detailError" role="alert">
      <span className="detailErrorIcon" aria-hidden="true">!</span>
      <p className="detailEyebrow">Connessione interrotta</p>
      <h1>Questa scheda non è disponibile</h1>
      <p>
        Non siamo riusciti a recuperare le informazioni del nodo. Puoi riprovare
        oppure tornare nella sala principale.
      </p>
      <div>
        <button type="button" className="detailPrimaryButton" onClick={onRetry}>
          Riprova
        </button>
        <button type="button" className="detailSecondaryButton" onClick={() => navigate("/")}>
          Torna alla home
        </button>
      </div>
    </div>
  );
}

function savedKey(id) {
  return `knowledge-room:saved:${id}`;
}

function readSavedState(id) {
  try {
    const value = window.localStorage.getItem(savedKey(id));
    if (!value) return false;

    try {
      const parsed = JSON.parse(value);
      return parsed?.saved === true || parsed?.saved === "true";
    } catch {
      return value === "true";
    }
  } catch {
    return false;
  }
}

function getReadTime(extract = "") {
  return Math.max(1, Math.ceil(getWordCount(extract) / 200));
}

function getWordCount(extract = "") {
  return extract.trim().split(/\s+/).filter(Boolean).length;
}

function splitParagraphs(extract = "") {
  if (!extract.trim()) return [];

  const paragraphs = extract
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length > 1 || extract.length < 900) {
    return paragraphs.length ? paragraphs : [extract.trim()];
  }

  const sentences = extract
    .match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [extract.trim()];
  const readableParagraphs = [];
  let currentParagraph = "";

  for (const sentence of sentences) {
    if (currentParagraph && currentParagraph.length + sentence.length > 720) {
      readableParagraphs.push(currentParagraph);
      currentParagraph = sentence;
    } else {
      currentParagraph = `${currentParagraph} ${sentence}`.trim();
    }
  }

  if (currentParagraph) readableParagraphs.push(currentParagraph);

  return readableParagraphs;
}

function formatLastUpdated(timestamp) {
  if (!timestamp) return "Aggiornata di recente";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}
