import _ from "lodash";

let cache = [];
const SIZE_OF_CACHE = 50;  // max limit is 50

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
const toDataUrl = (url, width, height, callback, errorCallback, outputFormat) => {
  let canvas = document.createElement("CANVAS");
  const ctx = canvas.getContext("2d");
  canvas.width = width;
  canvas.height = height;

  const img = new Image(width, height);
  img.crossOrigin = "Anonymous";

  img.onload = function () {
    ctx.drawImage(this, 0, 0, width, height);
    const dataURL = canvas.toDataURL(outputFormat);
    callback(dataURL);
    // Cleanup
    canvas = null;
  };

  img.onerror = function (event) {
    // The event itself is not a detailed error object, so we just trigger the generic error callback.
    errorCallback(event);
    // Cleanup
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
  return new Promise((resolve, reject) => {
    if (_.isEmpty(url) || _.isEmpty(width) || _.isEmpty(height)) {
      return reject("URL or dimensions are empty.");
    }
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
      toDataUrl(
        url,
        parseInt(width),
        parseInt(height),
        function (base64Img) { // success callback
          cache[newCacheIndex].data = base64Img;
          resolve(base64Img);
        },
        function (err) { // error callback
          // If the image fails to load, remove it from the cache and reject the promise
          prune(newCacheIndex);
          reject(`Failed to load image: ${url}`);
        }
      );
    } else {
      // If the item is already in the cache, we might need to wait for its data
      if (temp.data) {
        temp.usage += 1;
        resolve(temp.data);
      } else {
        // This is a tricky state - it's in the cache but not loaded yet.
        // We'll retry getting it in a moment.
        setTimeout(() => {
          get(url, width, height).then(resolve, reject);
        }, 500);
      }
    }
  });
};

// get element
const get = (url, width, height) => {
  return new Promise((resolve, reject) => {
    if (_.isEmpty(url) || _.isEmpty(width) || _.isEmpty(height)) {
      return reject("URL or dimensions are empty.");
    }
    let temp = cache.find((element) => element.url === url);
    if (_.isEmpty(temp)) {
      // If not in cache, add it. The add function now returns a promise.
      add(url, width, height).then(resolve, reject);
    } else {
      // If it is in the cache, check if data is loaded
      if (temp.data) {
        temp.usage += 1;
        resolve(temp.data);
      } else {
        // It's in the cache but data is not ready, this can happen if multiple calls are made simultaneously.
        // We'll wait and see if it loads. This is a simplified polling mechanism.
        setTimeout(() => {
          // Re-check the cache item directly
          const updatedTemp = cache.find((element) => element.url === url);
          if (updatedTemp && updatedTemp.data) {
            resolve(updatedTemp.data);
          } else {
            // If it's still not loaded, it might have failed.
            reject(`Timeout or failure waiting for image to load: ${url}`);
          }
        }, 1500); // Wait a bit longer for the image to potentially load/fail
      }
    }
  });
};

const clear = () => {
  cache = [];
}

const CachedImage = {
  add,
  get,
  clear
};

export default CachedImage;
