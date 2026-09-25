import { useState } from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

import { getProxiedImageUrl } from "../../utils/serverSettings";

const Img = ({ src, classname, className }) => {
  const proxied = src?.includes("image.tmdb.org") ? getProxiedImageUrl(src) : src;
  const [currentSrc, setCurrentSrc] = useState(proxied);

  const handleError = () => {
    if (currentSrc !== src && src) {
      setCurrentSrc(src);
    }
  };

  return (
    <LazyLoadImage
      className={className || classname || ""}
      wrapperClassName="lazy-load-image-background"
      alt=""
      src={currentSrc || src}
      onError={handleError}
      effect="blur"
    />
  );
};

export default Img;
