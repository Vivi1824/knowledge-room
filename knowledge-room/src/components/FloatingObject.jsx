import { useNavigate } from "react-router-dom";

export default function FloatingObject({ label, target, style }) {
  const navigate = useNavigate();

  const handleClick = () => {
    document.body.style.transition = "all 0.3s";
    document.body.style.transform = "scale(1.02)";

    setTimeout(() => {
      document.body.style.transform = "scale(1)";
      navigate(target);
    }, 150);
  };

  return (
    <div className="floating-object" style={style} onClick={handleClick}>
      {label}
    </div>
  );
}