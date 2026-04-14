"use strict";

/**
 * Wrappa un route handler async per passare gli errori a Express
 */
module.exports = function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
