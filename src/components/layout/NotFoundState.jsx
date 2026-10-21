import { Link } from "react-router-dom";

export default function NotFoundState({ title, message, backTo = "/subjects", backLabel = "Browse subjects" }) {
  return (
    <section className="empty-state" role="status">
      <h2>{title}</h2>
      <p>{message}</p>
      <Link className="primary-button" to={backTo}>{backLabel}</Link>
    </section>
  );
}
