import { ArrowLeft, Home } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <span className="eyebrow">CodePrep</span>
        <div className="not-found-code">404</div>
        <h2>That study page does not exist.</h2>
        <p>The route may have moved, or the content is not part of the current catalog.</p>
        <div className="not-found-actions">
          <button className="secondary-button" type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Go back</button>
          <Link className="primary-button" to="/"><Home size={16} /> Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

