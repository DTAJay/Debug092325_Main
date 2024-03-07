import _ from "lodash";

let cache = [];
const SIZE_OF_CACHE = 100;  // max limit is 100

// get the index of element which has minimal value
const findMinIndex = (array, key) => {
  let minValue = Number.MAX_VALUE;
  let minIndex = -1;

  array.forEach((item, index) => {
    if (item[key] < minValue) {
      minValue = item[key];
      minIndex = index;
    }
  });

  return minIndex;
};

// convert image url to base64
const toDataUrl = (url, width, height, callback, outputFormat) => {
  var img = new Image(width, height);
  img.crossOrigin = "Anonymous";
  img.onload = function () {
    var canvas = document.createElement("CANVAS");
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");
    var dataURL;
    ctx.drawImage(this, 0, 0, width, height);
    dataURL = canvas.toDataURL(outputFormat);
    callback(dataURL);
    canvas = null;
  };
  img.src = url;
};

// delete the given element
const prune = (index) => {
  cache.splice(index, 1);
};

// add new element
const add = (url, width, height) => {
  if (_.isEmpty(url) || _.isEmpty(width) || _.isEmpty(height)) return;
  let temp = cache.find((element) => element.url === url);
  if (_.isEmpty(temp)) { 
    if (cache.length >= SIZE_OF_CACHE) {
      let deletingIndex = findMinIndex(cache, "usage");
      if (deletingIndex !== -1) {
        prune(deletingIndex);
      }
    }
    cache.push({ url, usage: 0 });
    let newCacheIndex = cache.length - 1;
    toDataUrl(url, parseInt(width), parseInt(height), function (base64Img) {
      // Base64DataURL
      cache[newCacheIndex].data = base64Img;
      return base64Img;
    });
  }
};

// get element
const get = (url, width, height) => {
  return new Promise((resolve, reject) => {
    if (_.isEmpty(url) || _.isEmpty(width) || _.isEmpty(height)) reject("");
    let temp = cache.find((element) => element.url === url);
    if (_.isEmpty(temp)) {
      resolve(add(url, width, height))
    } else {
      temp.usage += 1;
    }
    if (_.isEmpty(temp.data)) {
      setTimeout(() => resolve(temp.data), 1000);
    } else {
      resolve(temp.data)
    }
  })
};

const CachedImage = {
  add,
  get,
  cache,
};

export default CachedImage;
