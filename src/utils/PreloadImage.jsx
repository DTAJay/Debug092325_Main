import { hasValue } from "./Functions";

var preloadedImageUrls = []; //  array for pre-loaded image

// preload image using link. you could see <link> under the <head> as following:
//  <link href=`${imageUrl}` rel="preload" as="image">
const createPreloadLink = (imageUrl) => {
  const preloadLink = document.createElement("link");
  preloadLink.href = imageUrl;
  preloadLink.rel = "preload";
  preloadLink.as = "image";
  document.head.appendChild(preloadLink);
};

const preloadImage = (imageUrl) => {
  if (!hasValue(preloadedImageUrls, imageUrl)) {
    // check if this image has been already pre-loaded
    createPreloadLink(imageUrl); // preload new image using link
    preloadedImageUrls.push(imageUrl); // save url
  }
};

export default preloadImage;
