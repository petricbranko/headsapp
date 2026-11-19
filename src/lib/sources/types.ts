import type { IncidentDoc } from "../types";
export type RawIncident = Omit<IncidentDoc, "_id" | "fetchedAt">;
export interface SourceResult {
  id: string;
  name: string;
  incidents: RawIncident[];
}
