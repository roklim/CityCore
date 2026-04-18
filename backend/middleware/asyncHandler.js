"use strict";

// Wrapper unico per route async: permette di scrivere handler puliti senza
// ripetere try/catch e lascia al middleware errorHandler la risposta finale.
module.exports = function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
