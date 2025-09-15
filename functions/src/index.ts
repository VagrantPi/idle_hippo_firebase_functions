/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import {getConfig} from "./config.js";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

function setCors(res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-KEY");
}

export const healthz = onRequest((req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  const {usePlayApi} = getConfig();
  res.status(200).json({status: "ok", mock: !usePlayApi});
});

type VerifyRequest = {
  packageName?: string;
  productId?: string;
  purchaseToken?: string;
  debug?: boolean;
};

export const verifyPurchase = onRequest(async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ok: false, reason: "Method Not Allowed"});
    return;
  }

  const {usePlayApi, apiKey} = getConfig();

  // API key check (optional)
  if (apiKey) {
    const provided = req.get("X-API-KEY");
    if (!provided || provided !== apiKey) {
      res.status(401).json({ok: false, reason: "Unauthorized"});
      return;
    }
  }

  const body: VerifyRequest = typeof req.body === "object" ? req.body : {};
  const {packageName, productId, purchaseToken, debug} = body;

  if (debug) {
    logger.debug("verifyPurchase request", {packageName, productId});
  }

  if (!packageName || !productId || !purchaseToken) {
    res.status(400).json({ok: false, reason: "Missing required fields"});
    return;
  }

  try {
    if (!usePlayApi) {
      const now = Date.now().toString();
      res.status(200).json({
        ok: true,
        purchaseState: 0,
        consumptionState: 0,
        orderId: "MOCK.ORDER",
        purchaseTimeMillis: now,
        reason: null,
      });
      return;
    }

    // NOTE: Real Play API integration comes in later stages.
    // Placeholder to satisfy shape; currently not implemented.
    res.status(200).json({
      ok: false,
      purchaseState: 2,
      consumptionState: 0,
      orderId: null,
      purchaseTimeMillis: null,
      reason: "PLAY_API_NOT_IMPLEMENTED",
    });
  } catch (err: any) {
    logger.error("verifyPurchase error", err);
    res.status(500).json({ok: false, reason: "Internal Server Error"});
  }
});
