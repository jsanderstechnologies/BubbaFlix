import React, { useState, useEffect } from "react";
import PosterFallback from "../../assets/no-poster.png";
import { getProxiedImageUrl } from "../../utils/serverSettings";

const Img = ({ src, classname, className, alt = "" }) => {
  const targetSrc = src ? getProxiedImageUrl(src) : PosterFallback;
  const [currentSrc, setCurrentSrc] = useState(targetSrc || PosterFallback);

  useEffect(() => {
    const updated = src ? getProxiedImageUrl(src) : PosterFallback;
    setCurrentSrc(updated || PosterFallback);
  }, [src]);

  const handleError = () => {
    if (currentSrc !== PosterFallback) {
      setCurrentSrc(PosterFallback);
    }
  };

  return (
    <div className="lazy-load-image-background blur image-loaded">
      <img
        className={className || classname || ""}
        alt={alt}
        src={currentSrc || PosterFallback}
        onError={handleError}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};

export default React.memo(Img);
