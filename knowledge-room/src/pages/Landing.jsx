import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../styles/landing.css";

import brain from "../assets/brain.svg";
import sparkles from "../assets/sparkles.png";
import image from "../assets/image.png";
import brainIcon from "../assets/brain.svg";
import libraryIcon from "../assets/library.svg";
import atomIcon from "../assets/atom.svg";
import compassIcon from "../assets/compass.svg";
import arrowRight from "../assets/arrow-right.png";
import homeIcon from "../assets/icons/home.svg";
import shareIcon from "../assets/icons/share.png";
import favoritesIcon from "../assets/icons/heart.png";

const featureCards = [
    {
        title: "CONNESSIONI",
        description: "Scopri legami invisibili tra concetti distanti.",
        image: brainIcon
    },
    {
        title: "ARCHIVIO",
        description: "Accesso a milioni di nodi di conoscenza certificata.",
        image: libraryIcon
    },
    {
        title: "ANALISI",
        description: "Approfondimenti dettagliati con dati cross-piattaforma.",
        image: atomIcon
    },
    {
        title: "NAVIGAZIONE",
        description: "Interfaccia spaziale per un'esplorazione fluida.",
        image: compassIcon
    },
];
const suggestedTopics = [
    "Einstein",
    "Spazio-Tempo",
    "Impero Romano",
    "Leonardo da Vinci",
    "AI",
];

export default function Landing() {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const suggestions = useMemo(() => suggestedTopics, []);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!query.trim()) return;

        navigate(`/graph/${encodeURIComponent(query.trim())}`);
    };

    return (
        <main className="main">
            <aside className="sidebar">
                <div className="sidebarTop">
                    <div className="logoDot" />
                </div>

                <nav className="sidebarNav">
                    <button className="navItem">
                        <img src={homeIcon} alt="Home" className="navIcon" />
                    </button>

                    <button className="navItem">
                        <img src={shareIcon} alt="Condividi" className="navIcon" />
                    </button>

                    <button className="navItem">
                        <img src={favoritesIcon} alt="Preferiti" className="navIcon" />
                    </button>
                </nav>

                <div className="sidebarBottom">
                    <button className="navItem">
                        {/* <img src={userIcon} alt="Profilo" className="navIcon" /> */}
                    </button>
                </div>
            </aside>
            {/* CANVAS 1920x1080 */}
            <div className="canvas">

                {/* BACKGROUND */}
                <div className="bg">
                    <img src={image} className="bgImage" alt="" />
                    <div className="overlay" />
                </div>

                {/* GLOWS */}
                <div className="glowTop" />
                <div className="glowBottom" />

                {/* HEADER */}
                <header className="header">
                    <img src={brain} className="brain" alt="" />
                    <h1 className="title">SALA DELLA CONOSCENZA</h1>

                    <p className="subtitle">
                        Esplora l'universo della conoscenza interconnessa
                    </p>
                </header>

                {/* SEARCH */}
                <form className="search" onSubmit={handleSubmit}>
                    <div className="searchTitle">
                        <img src={sparkles} className="sparkles" alt="" />
                        <p>
                            COSA VUOI ESPLORARE OGGI?
                        </p>
                    </div>

                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Cerca un argomento..."
                        className="input"
                    />

                    <div className="suggestions">
                        {suggestions.map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setQuery(t)}
                                className="suggestionBtn"
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <button type="submit" className="button">
                        <span>ENTRA NEL GRAFO</span>
                        <img src={arrowRight} className="arrow" alt="" />
                    </button>
                </form>

                {/* CARDS */}
                <section className="cards">
                    {featureCards.map((card) => (
                        <div key={card.title} className="card">
                            <img src={card.image} className="cardIconImg" alt="" />
                            <h3 className="cardTitle">{card.title}</h3>
                            <p className="cardDesc">{card.description}</p>
                        </div>
                    ))}
                </section>

            </div>
        </main>

    );
}