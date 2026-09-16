import { LeadStatus } from "@prisma/client";
import * as repo from "../repositories/leads.repository";
import { parseLeadsCsv, parseLeadsExcel } from "../lib/leadFileParser";
import { normalizePhoneNumber } from "../lib/phone";
import { validateLeadRows } from "../lib/leadRowValidator";

// Business errors the leads domain can raise. Controllers (Step 6) map these
// to HTTP status codes; this layer only decides that they're errors, per
// docs/rules/backend.md's layer split (services own business rules,
// controllers stay HTTP-focused). No shared AppError class exists in this
// repo yet (only plain Error, serialized by src/middleware/errorHandler.ts —
// see the Step 1 note on docs/rules/backend.md describing a different
// project's conventions), so these follow the same plain-Error-subclass
// pattern already used by src/lib/phone.ts's InvalidPhoneNumberError.
export class LeadNotFoundError extends Error {
  constructor(id: string) {
    super(`Lead not found: ${id}`);
    this.name = "LeadNotFoundError";
  }
}

export class LeadAlreadyContactedError extends Error {
  constructor(id: string) {
    super(`Lead ${id} has already been contacted and cannot be deleted`);
    this.name = "LeadAlreadyContactedError";
  }
}

export class UnsupportedLeadFileTypeError extends Error {
  constructor(fileName: string) {
    super(`Unsupported file type: ${fileName} (expected .csv or .xlsx)`);
    this.name = "UnsupportedLeadFileTypeError";
  }
}

export interface ImportLeadsResult {
  imported: number;
  duplicates: number;
  failed: number;
}

// Ties Steps 3-5 together: parse the uploaded file, validate/dedupe against
// the current table, then persist only the valid, non-duplicate rows.
// Matches POST /api/v1/leads/import's documented response shape exactly
// (docs/architecture/05-api-design.md section 3).
export async function importLeads(file: Buffer, fileName: string): Promise<ImportLeadsResult> {
  const lowerFileName = fileName.toLowerCase();
  const parsedRows = lowerFileName.endsWith(".csv")
    ? parseLeadsCsv(file)
    : lowerFileName.endsWith(".xlsx")
      ? await parseLeadsExcel(file)
      : (() => {
          throw new UnsupportedLeadFileTypeError(fileName);
        })();

  // Stored phones are always normalized E.164 (Step 2), so the DB lookup
  // must use the normalized form too — not the raw cell text — or an
  // existing lead written as "+14155552671" would never match an import
  // row spelled "1-415-555-2671" and get inserted as a silent duplicate
  // (masked only by createManyLeads' skipDuplicates backstop, which drops
  // the row without it ever being counted). validateLeadRows repeats this
  // same normalization per row below; that's cheap and keeps it self-contained.
  const candidatePhones = parsedRows
    .map((row) => {
      if (!row.phone) {
        return undefined;
      }
      try {
        return normalizePhoneNumber(row.phone);
      } catch {
        return undefined;
      }
    })
    .filter((phone): phone is string => Boolean(phone));
  const existingPhones = await repo.findExistingPhones(candidatePhones);

  const { valid, invalid, duplicates } = validateLeadRows(parsedRows, existingPhones);

  const { count } = await repo.createManyLeads(
    valid.map((row) => ({ ...row, sourceFile: fileName }))
  );

  return { imported: count, duplicates: duplicates.length, failed: invalid.length };
}

export interface ListLeadsParams {
  status?: LeadStatus;
  page?: number;
  limit?: number;
}

const DEFAULT_PAGE_SIZE = 20;

export async function listLeads(params: ListLeadsParams) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const limit = params.limit && params.limit > 0 ? params.limit : DEFAULT_PAGE_SIZE;

  const [leads, total] = await repo.listLeads({
    status: params.status,
    skip: (page - 1) * limit,
    take: limit,
  });

  return { leads, total };
}

export async function getLeadById(id: string) {
  return repo.findLeadById(id);
}

// "Not allowed if lead has been contacted" (docs/architecture/05-api-design.md
// section 3). Originally checked `status !== "NEW"`, but status is the wrong
// signal: webhook.repository.ts's upsertLeadByPhone creates a Lead with
// status NEW (plus Message/Conversation rows) for an inbound message from a
// number we never contacted, so a NEW lead can already have real history.
// Checking for that history directly (repo.hasContactHistory) is what
// actually decides "contacted" here, and is also what deleteLeadById would
// otherwise fail on at the database level (messages_lead_id_fkey /
// conversations_lead_id_fkey) — this makes that the documented, deliberate
// business rule instead of a fallen-through Postgres error.
export async function deleteLead(id: string): Promise<void> {
  const lead = await repo.findLeadById(id);
  if (!lead) {
    throw new LeadNotFoundError(id);
  }
  if (await repo.hasContactHistory(id)) {
    throw new LeadAlreadyContactedError(id);
  }

  await repo.deleteLeadById(id);
}
