const functions = require("firebase-functions");

exports.getIpAddress = functions.https.onCall((data, context) => {
  const ip = context.rawRequest.headers["x-forwarded-for"] || context.rawRequest.connection.remoteAddress;
  return { ip };
});
