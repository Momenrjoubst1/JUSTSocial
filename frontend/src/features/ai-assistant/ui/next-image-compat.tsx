import React from "react";

const NextImageCompat = ({ src, alt, className, ...props }: any) => {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} {...props} />;
};

export default NextImageCompat;


