import { useEffect, useState } from "react";
import FloatingObject from "../components/FloatingObject";
import "../styles/room.css";
import { useRoom } from "../context/RoomContext";

export default function Room() {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const { theme } = useRoom();
    useEffect(() => {
        const handleMove = (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;

            setOffset({ x, y });
        };

        window.addEventListener("mousemove", handleMove);

        return () => window.removeEventListener("mousemove", handleMove);
    }, []);

    return (
        <div className="room" data-theme={theme}>
            <h1 className="title">🧠 Knowledge Room</h1>

            <div
                className="room-layer"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px)`
                }}
            >
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
                    label="🔗 Graph"
                    target="/graph/Einstein"
                    style={{ top: "40%", left: "50%" }}
                />
            </div>
        </div>
    );
}