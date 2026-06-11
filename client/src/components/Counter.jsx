import { useState, useEffect } from "react";
import axios from "axios";
import "./Counter.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Counter() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCount = async () => {
    try {
      const res = await axios.get(`${API}/counter`);
      setCount(res.data.count);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const handleTap = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/counter/tap`);
      setCount(res.data.count);
    } catch (err) {
      console.error("Tap error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchCount, 3000);

    // Defer initial fetch to avoid triggering the "setState in effect" rule.
    const timeout = setTimeout(fetchCount, 0);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="counter-card">
      <h2>Queue Ticket</h2>
      <div className="counter-value">{count}</div>
      <button className="tap-btn" onClick={handleTap} disabled={loading}>
        {loading ? "Processing..." : "Tap to Increment"}
      </button>
      <p className="counter-note">
        Web and mobile share this same counter via the API.
      </p>
    </div>
  );
}
