import { useEffect, useState } from "react";

export default function Transition({ children }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(1.05)",
        transition: "all 0.4s ease",
      }}
    >
      {children}
    </div>
  );
}