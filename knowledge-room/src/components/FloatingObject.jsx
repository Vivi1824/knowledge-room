import { useNavigate } from "react-router-dom";

export default function FloatingObject({ label, target, style }) {
  const navigate = useNavigate();

  return (
    <div
      className="floating-object"
      style={style}
      onClick={() => navigate(target)}
    >
      {label}
    </div>
  );
}