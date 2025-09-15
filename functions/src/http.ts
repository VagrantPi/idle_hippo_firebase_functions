import {getConfig} from "./config.js";
import type {Request as Req, Response as Res} from "express";

export function setCors(res: Res) {
  const {allowedOrigins} = getConfig();
  res.setHeader("Access-Control-Allow-Origin", allowedOrigins);
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-KEY");
}

export function withCors<T extends (req: Req, res: Res) => any>(handler: T) {
  return (req: Req, res: Res) => {
    setCors(res);
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    return handler(req, res);
  };
}

export function requireJson(req: Req, res: Res): boolean {
  const ct = req.get("Content-Type") || req.get("content-type") || "";
  if (!ct.toLowerCase().includes("application/json")) {
    res.status(400).json({ok: false, reason: "invalid content-type"});
    return false;
  }
  return true;
}

export function requireFields(req: Req, res: Res, fields: string[]): boolean {
  const body = (typeof req.body === "object" && req.body) || {};
  const missing = fields.filter((k) => body[k] == null || body[k] === "");
  if (missing.length > 0) {
    res.status(400).json({ok: false, reason: "Missing required fields"});
    return false;
  }
  return true;
}

export function requireApiKeyIfSet(req: Req, res: Res): boolean {
  const {apiKey} = getConfig();
  if (!apiKey) return true;
  const provided = req.get("X-API-KEY");
  if (!provided || provided !== apiKey) {
    res.status(401).json({ok: false, reason: "Unauthorized"});
    return false;
  }
  return true;
}
