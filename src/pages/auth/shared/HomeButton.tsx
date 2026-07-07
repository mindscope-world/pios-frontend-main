import { useNavigate } from "react-router-dom";

export function HomeButton() {
  const navigate = useNavigate();
  return (
    <button className="auth-home" onClick={() => navigate("/")} title="Back to pi.trade" type="button">
      <span className="auth-home-mark">π</span>
      <span className="auth-home-word">PI</span>
    </button>
  );
}
