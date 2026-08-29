import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./index.scss";

const WALLPAPERS = [
  "/horror_background.jpg",
  "/wallpaper_mix_movies.jpg",
  "/wallpaper_film_posters.jpg",
];

const BackgroundRotator = () => {
  const location = useLocation();
  const [activeIdx, setActiveIdx] = useState(0);
  const isFirstRender = useRef(true);

  // Rotate wallpaper on navigation / route change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setActiveIdx((prevIdx) => (prevIdx + 1) % WALLPAPERS.length);
  }, [location.pathname]);

  // Timed auto-rotation every 45 seconds while viewing
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prevIdx) => (prevIdx + 1) % WALLPAPERS.length);
    }, 45000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="backgroundRotatorStage">
      {WALLPAPERS.map((url, idx) => (
        <div
          key={url}
          className={`bgLayer ${idx === activeIdx ? "active" : ""}`}
          style={{ backgroundImage: `linear-gradient(to bottom, rgba(10, 5, 10, 0.75), rgba(8, 8, 8, 0.88)), url("${url}")` }}
        />
      ))}
    </div>
  );
};

export default BackgroundRotator;
