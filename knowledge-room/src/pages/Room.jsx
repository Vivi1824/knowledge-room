import FloatingObject from "../components/FloatingObject";
import "../styles/room.css";

export default function Room() {
    return (
        <div className="room">
            <h1 className="title">🧠 Knowledge Room</h1>

            <FloatingObject
                label="📚 Wikipedia"
                target="/wiki/einstein"
                style={{ top: "30%", left: "25%" }}
            />

            <FloatingObject
                label="🌍 World"
                target="/wiki/italy"
                style={{ top: "60%", left: "70%" }}
            />

            <FloatingObject
                label="🎲 Random"
                target="/wiki/random"
                style={{ top: "20%", left: "70%" }}
            />

            <FloatingObject
                label="🔗 Knowledge Graph"
                target="/graph/Einstein"
            />
        </div>
    );
}