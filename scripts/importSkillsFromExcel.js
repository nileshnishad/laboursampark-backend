import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Skills from "../src/models/Skills.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, "../.env.local"), quiet: true });
dotenv.config({ path: path.resolve(scriptDirectory, "../.env"), quiet: true });

const HEADER_ALIASES = {
  proposedId: [
    "id",
    "skillid",
    "suggestedskillid",
    "skillsuggestedid",
    "proposedskillid",
  ],
  enName: [
    "en",
    "english",
    "enname",
    "nameen",
    "englishname",
    "skillname",
    "englishskillname",
    "skillnameenglish",
    "skillnameen",
    "englishskill",
  ],
  hiName: [
    "hi",
    "hindi",
    "hiname",
    "namehi",
    "hindiname",
    "hindiskillname",
    "skillnamehindi",
    "skillnamehi",
    "hindiskill",
  ],
  mrName: [
    "mr",
    "marathi",
    "mrname",
    "namemr",
    "marathiname",
    "marathiskillname",
    "skillnamemarathi",
    "skillnamemr",
    "marathiskill",
  ],
  description: ["description", "skilldescription", "descriptionen"],
  category: ["category", "skillcategory", "categoryname", "categoryen"],
  status: ["status", "skillstatus"],
  importNotes: ["importnotes", "notes"],
};

const normalizeHeader = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");

const normalizeName = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const comparableText = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("en");

const cleanCell = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

const getHeaderMapping = (row) => {
  const headerIndexes = new Map();
  row.forEach((value, index) => {
    const header = normalizeHeader(value);
    if (header && !headerIndexes.has(header)) {
      headerIndexes.set(header, index);
    }
  });

  const mapping = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const header = aliases.find((alias) =>
      headerIndexes.has(normalizeHeader(alias)),
    );
    if (header) {
      mapping[field] = headerIndexes.get(normalizeHeader(header));
    }
  }

  return mapping;
};

const hasLanguageHeaders = (mapping) =>
  Boolean(
    mapping.enName !== undefined &&
      mapping.hiName !== undefined &&
      mapping.mrName !== undefined,
  );

const readWorkbookRows = (workbook, xlsx) => {
  const records = [];
  const invalidRows = [];
  const dataSheets = [];
  const worksheetMappings = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false,
    });

    const headerRowIndex = rows.findIndex((row) =>
      hasLanguageHeaders(getHeaderMapping(row)),
    );
    if (headerRowIndex < 0) {
      continue;
    }

    const mapping = getHeaderMapping(rows[headerRowIndex]);
    dataSheets.push(sheetName);
    worksheetMappings.push({
      sheet: sheetName,
      headerRow: headerRowIndex + 1,
      columns: Object.fromEntries(
        Object.entries(mapping).map(([field, column]) => [
          field,
          cleanCell(rows[headerRowIndex][column]),
        ]),
      ),
    });

    for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
      const row = rows[index];
      const values = Object.values(mapping).map((column) =>
        cleanCell(row[column]),
      );
      if (values.every((value) => !value)) {
        continue;
      }

      const source = { sheet: sheetName, row: index + 1 };
      const enName = cleanCell(row[mapping.enName]);
      if (!enName) {
        invalidRows.push({
          ...source,
          reason: "Missing required English skill name (enName).",
        });
        continue;
      }

      records.push({
        ...source,
        proposedId:
          mapping.proposedId === undefined
            ? ""
            : cleanCell(row[mapping.proposedId]),
        enName,
        hiName: cleanCell(row[mapping.hiName]),
        mrName: cleanCell(row[mapping.mrName]),
        description:
          mapping.description === undefined
            ? ""
            : cleanCell(row[mapping.description]),
        category:
          mapping.category === undefined
            ? ""
            : cleanCell(row[mapping.category]),
        status:
          mapping.status === undefined ? "" : cleanCell(row[mapping.status]),
        importNotes:
          mapping.importNotes === undefined
            ? ""
            : cleanCell(row[mapping.importNotes]),
      });
    }
  }

  return { records, invalidRows, dataSheets, worksheetMappings };
};

const describeRecord = (record) => ({
  sheet: record.sheet,
  row: record.row,
  proposedId: record.proposedId || null,
  enName: record.enName,
  hiName: record.hiName,
  mrName: record.mrName,
  category: record.category || null,
  status: record.status || null,
  importNotes: record.importNotes || null,
});

const hasSameImportData = (left, right) =>
  ["enName", "hiName", "mrName", "description", "category"].every(
    (field) => comparableText(left[field]) === comparableText(right[field]),
  );

const levenshteinDistance = (left, right) => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
};

const arePossibleNameVariants = (left, right) => {
  const normalizedLeft = normalizeName(left);
  const normalizedRight = normalizeName(right);
  if (!normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight) {
    return false;
  }
  const distance = levenshteinDistance(normalizedLeft, normalizedRight);
  return (
    distance <= 2 &&
    distance / Math.max(normalizedLeft.length, normalizedRight.length, 1) <= 0.2
  );
};

const findPossibleSpellingMatches = (record, existingRecords) => {
  return existingRecords
    .map((existing) => ({
      existing,
    }))
    .filter(({ existing }) =>
      arePossibleNameVariants(
        record.enName,
        existing.enName || existing.name,
      ),
    )
    .map(({ existing }) => ({
      id: String(existing._id),
      enName: existing.enName || existing.name,
    }));
};

const classifyRecords = (records, invalidRows, existingRecords) => {
  const groups = new Map();
  const duplicateRows = [];
  const conflicts = [];
  const excelIdOwners = new Map();
  const blockedExcelKeys = new Set();

  for (const record of records) {
    const key = normalizeName(record.enName);
    const group = groups.get(key) || [];
    group.push(record);
    groups.set(key, group);

    if (record.proposedId) {
      const idKey = comparableText(record.proposedId);
      const owner = excelIdOwners.get(idKey);
      if (owner && normalizeName(owner.enName) !== key) {
        blockedExcelKeys.add(normalizeName(owner.enName));
        blockedExcelKeys.add(key);
        conflicts.push({
          type: "duplicate-proposed-id-in-workbook",
          records: [describeRecord(owner), describeRecord(record)],
          reason:
            "The same suggested ID is assigned to different English skill names.",
        });
      } else {
        excelIdOwners.set(idKey, record);
      }
    }
  }

  const existingByEnglishName = new Map();
  for (const existing of existingRecords) {
    for (const value of [existing.enName, existing.name]) {
      const key = normalizeName(value);
      if (key) {
        const matches = existingByEnglishName.get(key) || [];
        if (
          !matches.some(
            (match) => String(match._id) === String(existing._id),
          )
        ) {
          matches.push(existing);
        }
        existingByEnglishName.set(key, matches);
      }
    }
  }

  const groupEntries = [...groups.entries()];
  for (let leftIndex = 0; leftIndex < groupEntries.length; leftIndex += 1) {
    const [leftKey, leftGroup] = groupEntries[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < groupEntries.length; rightIndex += 1) {
      const [rightKey, rightGroup] = groupEntries[rightIndex];
      if (arePossibleNameVariants(leftGroup[0].enName, rightGroup[0].enName)) {
        blockedExcelKeys.add(leftKey);
        blockedExcelKeys.add(rightKey);
        conflicts.push({
          type: "possible-workbook-spelling-variation",
          records: [
            describeRecord(leftGroup[0]),
            describeRecord(rightGroup[0]),
          ],
          reason:
            "Different English names in the workbook are similar enough to require manual duplicate and category review.",
        });
      }
    }
  }

  const alreadyPresent = [];
  const eligible = [];
  const incompleteTranslations = [];

  for (const group of groups.values()) {
    const canonical = group[0];
    if (group.length > 1) {
      duplicateRows.push(
        ...group.slice(1).map((record) => ({
          ...describeRecord(record),
          duplicateOf: { sheet: canonical.sheet, row: canonical.row },
          conflicting: group.some(
            (record) =>
              !hasSameImportData(canonical, record) ||
              (canonical.proposedId &&
                record.proposedId &&
                comparableText(canonical.proposedId) !==
                  comparableText(record.proposedId)),
          ),
        })),
      );
    }

    if (blockedExcelKeys.has(normalizeName(canonical.enName))) {
      continue;
    }
    const groupDiffers = group.some(
      (record) =>
        !hasSameImportData(canonical, record) ||
        (canonical.proposedId &&
          record.proposedId &&
          comparableText(canonical.proposedId) !==
            comparableText(record.proposedId)),
    );
    if (group.length > 1 && groupDiffers) {
      conflicts.push({
        type: "conflicting-workbook-rows",
        records: group.map(describeRecord),
        reason:
          "Rows share a normalized English name but disagree on translations, description, category, or suggested ID.",
      });
      continue;
    }
    const existingMatches = existingByEnglishName.get(normalizeName(canonical.enName)) || [];
    if (existingMatches.length > 1) {
      conflicts.push({
        type: "multiple-existing-matches",
        record: describeRecord(canonical),
        existing: existingMatches.map((existing) => ({
          id: String(existing._id),
          enName: existing.enName || existing.name,
          category: existing.category || "",
        })),
        reason: "More than one existing skill matches this normalized English name.",
      });
      continue;
    }

    if (existingMatches.length === 1) {
      const existing = existingMatches[0];
      const current = {
        enName: existing.enName || existing.name || "",
        hiName: existing.hiName || "",
        mrName: existing.mrName || "",
        description: existing.description || "",
        category: existing.category || "",
      };
      if (hasSameImportData(canonical, current)) {
        alreadyPresent.push(describeRecord(canonical));
      } else {
        conflicts.push({
          type: "existing-skill-differs",
          record: describeRecord(canonical),
          existing: {
            id: String(existing._id),
            enName: current.enName,
            hiName: current.hiName,
            mrName: current.mrName,
            category: current.category,
          },
          reason:
            "An existing skill has the same normalized English name but different data; it will not be overwritten.",
        });
      }
      continue;
    }

    const spellingMatches = findPossibleSpellingMatches(
      canonical,
      existingRecords,
    );
    if (spellingMatches.length) {
      conflicts.push({
        type: "possible-existing-spelling-variation",
        record: describeRecord(canonical),
        possibleMatches: spellingMatches,
        reason:
          "A similar existing English name needs manual review before insertion.",
      });
      continue;
    }

    if (!canonical.hiName || !canonical.mrName) {
      incompleteTranslations.push(describeRecord(canonical));
    }
    eligible.push(canonical);
  }

  const validated = [];
  for (const record of eligible) {
    const skill = new Skills({
      enName: record.enName,
      name: record.enName,
      hiName: record.hiName,
      mrName: record.mrName,
      ...(record.description ? { description: record.description } : {}),
      ...(record.category ? { category: record.category } : {}),
      lang: ["hi", "en", "mr"],
    });
    const error = skill.validateSync();
    if (error) {
      invalidRows.push({
        sheet: record.sheet,
        row: record.row,
        reason: error.message,
      });
      continue;
    }
    validated.push({
      source: record,
      document: skill.toObject({
        depopulate: true,
        versionKey: false,
      }),
    });
  }

  return {
    validated,
    duplicateRows,
    conflicts,
    alreadyPresent,
    incompleteTranslations,
  };
};

const parseArguments = (args) => {
  const flags = new Set(args.filter((argument) => argument.startsWith("--")));
  const files = args.filter((argument) => !argument.startsWith("--"));
  const unknownFlags = [...flags].filter(
    (flag) => !["--dry-run", "--apply", "--confirm-write"].includes(flag),
  );

  if (unknownFlags.length || files.length !== 1) {
    throw new Error(
      "Usage: node scripts/importSkillsFromExcel.js <workbook.xlsx> [--dry-run | --apply --confirm-write]",
    );
  }
  if (flags.has("--dry-run") && flags.has("--apply")) {
    throw new Error("Choose either --dry-run or --apply, not both.");
  }
  if (flags.has("--confirm-write") && !flags.has("--apply")) {
    throw new Error("--confirm-write is only valid with --apply.");
  }

  const apply = flags.has("--apply");
  if (apply && !flags.has("--confirm-write")) {
    throw new Error(
      "Writes require both --apply and --confirm-write. No database changes were made.",
    );
  }

  return { filePath: path.resolve(files[0]), apply };
};

// Same variables the existing scripts and src/config/db.js use.
const getLocalMongoUri = () => {
  const uri =
    process.env.SKILLS_IMPORT_MONGODB_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGODB_URI / MONGO_URI is not set in .env or .env.local.");
  }
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error("The configured MongoDB URI is not valid.");
  }
  return uri;
};

const main = async () => {
  const { filePath, apply } = parseArguments(process.argv.slice(2));
  await access(filePath);

  let xlsx;
  try {
    const xlsxModule = await import("xlsx");
    xlsx = xlsxModule.default || xlsxModule;
  } catch {
    throw new Error(
      'Excel parsing requires the "xlsx" package, which is not present in the project dependencies. Install it through the project dependency workflow before running this importer.',
    );
  }

  const workbook = xlsx.readFile(filePath, { cellDates: false });
  const {
    records,
    invalidRows,
    dataSheets,
    worksheetMappings,
  } = readWorkbookRows(workbook, xlsx);
  if (!dataSheets.length) {
    throw new Error(
      "No worksheet with English, Hindi, and Marathi skill-name headers was found. No database connection was made.",
    );
  }

  const uri = getLocalMongoUri();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    const existingRecords = await Skills.find(
      {},
      {
        _id: 1,
        enName: 1,
        name: 1,
        hiName: 1,
        mrName: 1,
        description: 1,
        category: 1,
      },
    ).lean();

    const result = classifyRecords(records, invalidRows, existingRecords);
    const categoryMappingIssues = [
      ...worksheetMappings
        .filter((mapping) => !mapping.columns.category)
        .map((mapping) => ({
          type: "missing-category-column",
          sheet: mapping.sheet,
          reason:
            "The worksheet has no category column; the optional category field will be left unset.",
        })),
      ...records
        .filter((record) => !record.category)
        .map((record) => ({
          type: "missing-category-value",
          sheet: record.sheet,
          row: record.row,
          reason:
            "No category value was supplied; no category was inferred.",
        })),
    ];
    const rowsMarkedForReview = records
      .filter(
        (record) =>
          /draft|review/i.test(record.status) ||
          /review|duplicate/i.test(record.importNotes),
      )
      .map((record) => ({
        ...describeRecord(record),
        status: record.status || null,
        importNotes: record.importNotes || null,
      }));
    let inserted = 0;
    let writeError = null;

    if (apply && result.validated.length) {
      try {
        const insertedDocuments = await Skills.insertMany(
          result.validated.map(({ document }) => document),
          { ordered: false },
        );
        inserted = insertedDocuments.length;
      } catch (error) {
        inserted = error.insertedDocs?.length || 0;
        writeError = String(error.message || "Unknown MongoDB write error").replace(
          /mongodb(?:\+srv)?:\/\/\S+/giu,
          "[REDACTED_MONGODB_URI]",
        );
      }
    }

    const report = {
      mode: apply ? "apply" : "dry-run",
      workbook: path.basename(filePath),
      dataWorksheets: dataSheets,
      worksheetMappings,
      fieldMapping: {
        English: "enName; also copied to required name field",
        Hindi: "hiName",
        Marathi: "mrName",
        Category: "category (source text preserved; schema field is an optional String)",
        Description: "description (optional String, when present in workbook)",
        SuggestedSkillId:
          "Not stored; the Skill schema has no custom skill-ID field and MongoDB supplies _id",
        Languages: 'lang = ["hi", "en", "mr"] (same default as admin creation)',
      },
      summary: {
        validSkillRows: records.length,
        existingRecordsChecked: existingRecords.length,
        newSkillsEligibleForInsertion: result.validated.length,
        duplicateRowsInWorkbook: result.duplicateRows.length,
        skillsAlreadyPresent: result.alreadyPresent.length,
        conflictingRecords: result.conflicts.length,
        invalidRows: invalidRows.length,
        missingEnglishNames: invalidRows.filter((row) =>
          row.reason.startsWith("Missing required English"),
        ).length,
        rowsWithMissingHindiOrMarathi: result.incompleteTranslations.length,
        categoryMappingIssues: categoryMappingIssues.length,
        rowsMarkedForReview: rowsMarkedForReview.length,
        inserted,
      },
      duplicateRows: result.duplicateRows,
      alreadyPresent: result.alreadyPresent,
      plannedInsertions: result.validated.map(({ source }) =>
        describeRecord(source),
      ),
      conflicts: result.conflicts,
      invalidRows,
      incompleteTranslations: result.incompleteTranslations,
      categoryMappingIssues,
      rowsMarkedForReview,
      ...(writeError ? { writeError } : {}),
    };

    console.log(JSON.stringify(report, null, 2));
    if (writeError) {
      process.exitCode = 1;
    }
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  const message = String(error?.message || "Unknown importer error").replace(
    /mongodb(?:\+srv)?:\/\/\S+/giu,
    "[REDACTED_MONGODB_URI]",
  );
  console.error(`Skills import stopped: ${message}`);
  process.exitCode = 1;
});
