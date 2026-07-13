import { Request } from "express";

export function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
}

export function intParam(req: Request, name: string): number {
  return parseInt(param(req, name), 10);
}
