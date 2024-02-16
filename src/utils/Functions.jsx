// check if param is empty
export const isEmpty = (value) => {
  if (value === null || value === undefined) return !value;
  else if (typeof value === "string" || Array.isArray(value))
    // if type is str
    return value.length === 0;
  else if (typeof value === "number") return isNaN(value); // if type is number
  else if (typeof value === "object")
    return Object.keys(value).length === 0; // if type is object
  else return !value; // exceptions
};

// convert string to boolean
export const stringToBool = (string) => {
  if (string.toUpperCase() === "TRUE") return true;
  else if (string.toUpperCase() === "FALSE") return false;
  else return undefined;
};

// check if the array has specific values
export const hasValue = (array, value) => {
  return !!array.find((item) => item === value);
};

// get index by property from array
export const getIndexFromArr = (array, property, threshold) => {
  if (array === undefined || (array && array.length === 0)) return -1;
  if (property.length)
    return array.findIndex((item) => item[property] === threshold);
  else return array.findIndex((item) => item === threshold);
};