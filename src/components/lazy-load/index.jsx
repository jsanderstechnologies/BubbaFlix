/* eslint-disable react/prop-types */
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

const Img = ({ src, classname, className }) => {
  return (
    <LazyLoadImage className={className || classname || ""} alt="" src={src} effect="blur" />
  );
};

export default Img;
