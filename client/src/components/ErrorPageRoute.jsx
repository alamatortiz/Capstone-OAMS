import { useParams } from "react-router-dom";
import ErrorPage from "./ErrorPage";

// Thin route wrapper around ErrorPage so a real failure (api.js's response
// interceptor hard-navigating here on a 502/503/504 or an unreachable
// backend) can pass its actual status code through the URL, while
// ErrorPage itself stays a plain, reusable props-driven component --
// e.g. the "*" catch-all route still mounts <ErrorPage code={404} />
// directly, with no need for a URL param at all.
export default function ErrorPageRoute() {
  const { code } = useParams();
  const parsed = Number(code);
  return <ErrorPage code={Number.isFinite(parsed) ? parsed : 500} />;
}
