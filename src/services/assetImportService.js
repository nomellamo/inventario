const ExcelJS = require("exceljs");
const { prisma } = require("../prisma");
const { canCreateAsset, enforceEstablishmentScope } = require("../permissions/assetPermissions");
const { badRequest, forbidden, notFound } = require("../utils/httpError");
const {
  validateAcquisitionDate,
  validateAcquisitionValue,
  validateStringMax,
  MAX_NAME_LENGTH,
  MAX_SHORT_TEXT,
  normalizeCostCenter,
  normalizeRut,
  validateRutFormat,
} = require("../utils/assetRules");
const { ensureUniqueAssetIdentity } = require("../utils/assetIdentity");

const HEADER_ALIASES = {
  codigointerno: "internalcode",
  nombre: "name",
  marca: "brand",
  modelo: "modelname",
  serie: "serialnumber",
  cuentacontable: "accountingaccount",
  analitico: "analyticcode",
  tipo: "assettype",
  estado: "assetstatename",
  establecimiento: "establishmentname",
  dependencia: "dependencyname",
  valoradquisicion: "acquisitionvalue",
  fechaadquisicion: "acquisitiondate",
  cantidad: "quantity",
  rutresponsable: "responsiblerut",
  responsable: "responsiblename",
  cargoresponsable: "responsiblerole",
  centrocosto: "costcenter",
  centrodecosto: "costcenter",
};

const IMPORT_PLACEHOLDER_TEXTS = new Set([
  "s/i",
  "si",
  "n/a",
  "na",
  "por informar",
  "por asignar",
  "sin informacion",
  "sin informacion.",
  "sin info",
  "no informa",
  "no informado",
]);

function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .toLowerCase();
}

function getRowValue(row, keyMap, key) {
  const col = keyMap[key];
  if (!col) return undefined;
  return row.getCell(col).value;
}

function parseExcelDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parsePositiveInt(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

function normalizeImportText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function isImportPlaceholder(value) {
  const normalized = normalizeImportText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
  return IMPORT_PLACEHOLDER_TEXTS.has(normalized);
}

function normalizeOptionalImportValue(value) {
  if (value === undefined || value === null) return null;
  if (isImportPlaceholder(value)) return null;
  const text = normalizeImportText(value);
  return text ? text : null;
}

function parseImportAcquisitionValue(value) {
  if (value === undefined || value === null || normalizeImportText(value) === "") return 1;
  if (isImportPlaceholder(value)) return 1;
  const num = Number(value);
  return Number.isFinite(num) ? num : Number.NaN;
}

function parseImportAcquisitionDate(value) {
  if (value === undefined || value === null || normalizeImportText(value) === "") {
    return new Date();
  }
  if (isImportPlaceholder(value)) return new Date();
  return parseExcelDate(value);
}

function normalizeLookupValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isPrismaUniqueConstraintError(err) {
  if (!err) return false;
  if (err.code === "P2002") return true;
  if (err.name === "PrismaClientKnownRequestError" && err.message) {
    return String(err.message).includes("Unique constraint failed");
  }
  return false;
}

async function importAssetsFromExcel(buffer, user, filename = "import.xlsx") {
  if (!canCreateAsset(user, user.establishmentId || 0) && user.role.type !== "ADMIN_CENTRAL") {
    throw forbidden("No autorizado para importacion masiva");
  }

  const batch = await prisma.assetImportBatch.create({
    data: {
      filename,
      status: "PROCESSING",
      userId: user.id,
    },
  });

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw badRequest("Archivo Excel vacio");

    const headerRow = sheet.getRow(1);
    const keyMap = {};
    const headersFound = [];

    headerRow.eachCell((cell, colNumber) => {
      const key = normalizeHeader(cell.value);
      if (key) {
        const canonical = HEADER_ALIASES[key] || key;
        keyMap[canonical] = colNumber;
        headersFound.push(canonical);
      }
    });

    const hasInstitutionIdColumn = Boolean(keyMap["institutionid"]);
    if (hasInstitutionIdColumn) {
      await prisma.assetImportBatch.update({
        where: { id: batch.id },
        data: {
          status: "FAILED",
          errorCount: 1,
          errors: {
            message: "institutionId no permitido en importacion",
            headersFound,
          },
          completedAt: new Date(),
        },
      });
      throw badRequest("institutionId no permitido en importacion", "IMPORT_SCHEMA", {
        headersFound,
      });
    }

    if (!headersFound.length) {
      await prisma.assetImportBatch.update({
        where: { id: batch.id },
        data: {
          status: "FAILED",
          errorCount: 1,
          errors: {
            message: "No se detectaron encabezados en el Excel",
          },
          completedAt: new Date(),
        },
      });
      throw badRequest("No se detectaron encabezados en el Excel", "IMPORT_SCHEMA");
    }

    const errors = [];
    const created = [];
    const lastRow = sheet.lastRow ? sheet.lastRow.number : 1;
    const [allEstablishments, allDependencies, allStates, allTypes] = await Promise.all([
      prisma.establishment.findMany({
        where: { isActive: true },
        select: { id: true, name: true, institutionId: true },
      }),
      prisma.dependency.findMany({
        where: { isActive: true },
        select: { id: true, name: true, establishmentId: true },
      }),
      prisma.assetState.findMany({
        select: { id: true, name: true },
      }),
      prisma.assetType.findMany({
        select: { id: true, name: true },
      }),
    ]);
    const establishmentById = new Map(allEstablishments.map((item) => [item.id, item]));
    const establishmentByName = new Map();
    const establishmentRows = [];
    for (const item of allEstablishments) {
      const key = normalizeLookupValue(item.name);
      if (!key) continue;
      establishmentRows.push({ id: item.id, key, raw: item.name });
      if (!establishmentByName.has(key)) establishmentByName.set(key, []);
      establishmentByName.get(key).push(item);
    }
    const dependencyByName = new Map();
    const dependencyByEstablishmentAndName = new Map();
    const dependencyByEstablishmentNameAndName = new Map();
    const dependencyRows = [];
    const establishmentNameById = new Map(
      allEstablishments.map((item) => [item.id, normalizeLookupValue(item.name)])
    );
    for (const item of allDependencies) {
      const nameKey = normalizeLookupValue(item.name);
      if (!nameKey) continue;
      dependencyRows.push({
        id: item.id,
        establishmentId: item.establishmentId,
        key: nameKey,
        raw: item.name,
        establishmentNameKey: establishmentNameById.get(item.establishmentId) || "",
      });
      if (!dependencyByName.has(nameKey)) dependencyByName.set(nameKey, []);
      dependencyByName.get(nameKey).push(item);
      dependencyByEstablishmentAndName.set(`${item.establishmentId}:${nameKey}`, item.id);
      const estNameKey = establishmentNameById.get(item.establishmentId);
      if (estNameKey) {
        const pairKey = `${estNameKey}:${nameKey}`;
        if (!dependencyByEstablishmentNameAndName.has(pairKey)) {
          dependencyByEstablishmentNameAndName.set(pairKey, []);
        }
        dependencyByEstablishmentNameAndName.get(pairKey).push(item);
      }
    }
    const stateByName = new Map(
      allStates.map((item) => [normalizeLookupValue(item.name), item.id])
    );
    const typeByName = new Map(
      allTypes.map((item) => [normalizeLookupValue(item.name), item.id])
    );
    const firstDependencyByEstablishmentId = new Map();
    for (const item of allDependencies) {
      if (!firstDependencyByEstablishmentId.has(item.establishmentId)) {
        firstDependencyByEstablishmentId.set(item.establishmentId, item);
      }
    }
    const defaultState =
      allStates.find((item) => normalizeLookupValue(item.name) === "bueno") || allStates[0] || null;
    const defaultType =
      allTypes.find((item) => normalizeLookupValue(item.name) === "control") || allTypes[0] || null;

    let defaultEstablishment = null;
    if (user.establishmentId) {
      defaultEstablishment = establishmentById.get(Number(user.establishmentId)) || null;
    }
    if (!defaultEstablishment && user.institutionId) {
      defaultEstablishment =
        allEstablishments.find(
          (item) => item.institutionId === Number(user.institutionId)
        ) || null;
    }
    if (!defaultEstablishment) {
      defaultEstablishment = allEstablishments[0] || null;
    }

    let defaultDependency = defaultEstablishment
      ? firstDependencyByEstablishmentId.get(defaultEstablishment.id) || null
      : null;
    if (!defaultDependency) {
      defaultDependency = allDependencies[0] || null;
      if (defaultDependency) {
        defaultEstablishment =
          establishmentById.get(defaultDependency.establishmentId) || defaultEstablishment;
      }
    }

    for (let rowIndex = 2; rowIndex <= lastRow; rowIndex++) {
      const row = sheet.getRow(rowIndex);
      const establishmentIdRaw = getRowValue(row, keyMap, "establishmentid");
      const dependencyIdRaw = getRowValue(row, keyMap, "dependencyid");
      const assetStateIdRaw = getRowValue(row, keyMap, "assetstateid");
      const assetTypeIdRaw = getRowValue(row, keyMap, "assettypeid");

      const input = {
        establishmentId: parsePositiveInt(establishmentIdRaw),
        dependencyId: parsePositiveInt(dependencyIdRaw),
        assetStateId: parsePositiveInt(assetStateIdRaw),
        assetTypeId: parsePositiveInt(assetTypeIdRaw),
        establishmentName: getRowValue(row, keyMap, "establishmentname"),
        dependencyName: getRowValue(row, keyMap, "dependencyname"),
        assetStateName: getRowValue(row, keyMap, "assetstatename"),
        assetTypeName: getRowValue(row, keyMap, "assettype"),
        name: normalizeOptionalImportValue(getRowValue(row, keyMap, "name")),
        accountingAccount: normalizeOptionalImportValue(
          getRowValue(row, keyMap, "accountingaccount")
        ),
        analyticCode: normalizeOptionalImportValue(getRowValue(row, keyMap, "analyticcode")),
        brand: normalizeOptionalImportValue(getRowValue(row, keyMap, "brand")),
        modelName: normalizeOptionalImportValue(getRowValue(row, keyMap, "modelname")),
        serialNumber: normalizeOptionalImportValue(getRowValue(row, keyMap, "serialnumber")),
        quantityRaw: getRowValue(row, keyMap, "quantity"),
        responsibleName: normalizeOptionalImportValue(getRowValue(row, keyMap, "responsiblename")),
        responsibleRut: getRowValue(row, keyMap, "responsiblerut"),
        responsibleRole: normalizeOptionalImportValue(getRowValue(row, keyMap, "responsiblerole")),
        costCenter: normalizeOptionalImportValue(getRowValue(row, keyMap, "costcenter")),
        acquisitionValue: parseImportAcquisitionValue(getRowValue(row, keyMap, "acquisitionvalue")),
        acquisitionDate: parseImportAcquisitionDate(getRowValue(row, keyMap, "acquisitiondate")),
      };
      const quantityText = String(input.quantityRaw ?? "").trim();
      const quantity =
        !quantityText || quantityText.toLowerCase() === "null"
          ? 1
          : parsePositiveInt(input.quantityRaw);
      input.quantity = quantity;
      const normalizedResponsibleRut = normalizeRut(input.responsibleRut);
      const normalizedCostCenter = normalizeCostCenter(input.costCenter);
      const establishmentNameKey = normalizeLookupValue(input.establishmentName);
      const dependencyNameKey = normalizeLookupValue(input.dependencyName);
      const stateNameKey = normalizeLookupValue(input.assetStateName);
      const typeNameKey = normalizeLookupValue(input.assetTypeName);
      const rowHasData =
        Array.isArray(row.values) &&
        row.values.slice(1).some((value) => normalizeImportText(value) !== "");

      // Allow exported templates with summary rows like "TOTAL".
      const isSummaryRow = ["total", "totales"].includes(
        String(input.name || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim()
          .toLowerCase()
      );
      if (isSummaryRow) {
        continue;
      }
      if (!rowHasData) {
        continue;
      }

      if (!input.name) {
        input.name = `Activo importado fila ${rowIndex}`;
      }

      if (!input.establishmentId && establishmentNameKey) {
        const matched = establishmentByName.get(establishmentNameKey) || [];
        if (matched.length === 1) {
          input.establishmentId = matched[0].id;
        } else if (matched.length === 0) {
          const fuzzy = establishmentRows.filter(
            (x) => x.key.includes(establishmentNameKey) || establishmentNameKey.includes(x.key)
          );
          if (fuzzy.length === 1) {
            input.establishmentId = fuzzy[0].id;
          }
        }
      }
      if (
        !input.establishmentId &&
        establishmentNameKey &&
        user.role?.type === "ADMIN_CENTRAL" &&
        user.institutionId
      ) {
        const estNameRaw = String(input.establishmentName || "").trim();
        if (estNameRaw) {
          let found = await prisma.establishment.findFirst({
            where: {
              institutionId: Number(user.institutionId),
              name: estNameRaw,
            },
            select: { id: true, isActive: true, name: true },
          });
          if (!found) {
            found = await prisma.establishment.create({
              data: {
                name: estNameRaw,
                type: "IMPORTADO",
                institutionId: Number(user.institutionId),
                isActive: true,
              },
              select: { id: true, isActive: true, name: true },
            });
          } else if (!found.isActive) {
            found = await prisma.establishment.update({
              where: { id: found.id },
              data: { isActive: true },
              select: { id: true, isActive: true, name: true },
            });
          }
          input.establishmentId = found.id;
          const key = normalizeLookupValue(found.name);
          if (key) {
            if (!establishmentByName.has(key)) establishmentByName.set(key, []);
            establishmentByName.get(key).push({ id: found.id, name: found.name });
            establishmentRows.push({ id: found.id, key, raw: found.name });
            establishmentNameById.set(found.id, key);
          }
        }
      }
      if (!input.assetStateId && stateNameKey) {
        input.assetStateId = stateByName.get(stateNameKey) || null;
      }
      if (!input.assetStateId && defaultState) {
        input.assetStateId = defaultState.id;
      }
      if (!input.assetTypeId && typeNameKey) {
        input.assetTypeId = typeByName.get(typeNameKey) || null;
      }
      if (!input.assetTypeId && defaultType) {
        input.assetTypeId = defaultType.id;
      }
      if (!input.establishmentId && defaultEstablishment) {
        input.establishmentId = defaultEstablishment.id;
      }
      if (!input.dependencyId && dependencyNameKey) {
        if (input.establishmentId) {
          input.dependencyId =
            dependencyByEstablishmentAndName.get(
              `${input.establishmentId}:${dependencyNameKey}`
            ) || null;
          if (!input.dependencyId) {
            const fuzzy = dependencyRows.filter(
              (x) =>
                x.establishmentId === input.establishmentId &&
                (x.key.includes(dependencyNameKey) || dependencyNameKey.includes(x.key))
            );
            if (fuzzy.length === 1) {
              input.dependencyId = fuzzy[0].id;
            }
          }
          if (
            !input.dependencyId &&
            user.role?.type === "ADMIN_CENTRAL" &&
            input.establishmentId
          ) {
            const depNameRaw = String(input.dependencyName || "").trim();
            if (depNameRaw) {
              let depFound = await prisma.dependency.findFirst({
                where: {
                  establishmentId: input.establishmentId,
                  name: depNameRaw,
                },
                select: { id: true, name: true, establishmentId: true, isActive: true },
              });
              if (!depFound) {
                depFound = await prisma.dependency.create({
                  data: {
                    name: depNameRaw,
                    establishmentId: input.establishmentId,
                    isActive: true,
                  },
                  select: { id: true, name: true, establishmentId: true, isActive: true },
                });
              } else if (!depFound.isActive) {
                depFound = await prisma.dependency.update({
                  where: { id: depFound.id },
                  data: { isActive: true },
                  select: { id: true, name: true, establishmentId: true, isActive: true },
                });
              }
              input.dependencyId = depFound.id;
              const depKey = normalizeLookupValue(depFound.name);
              if (depKey) {
                if (!dependencyByName.has(depKey)) dependencyByName.set(depKey, []);
                dependencyByName.get(depKey).push(depFound);
                dependencyByEstablishmentAndName.set(
                  `${depFound.establishmentId}:${depKey}`,
                  depFound.id
                );
                const estNameKey = establishmentNameById.get(depFound.establishmentId);
                if (estNameKey) {
                  const pairKey = `${estNameKey}:${depKey}`;
                  if (!dependencyByEstablishmentNameAndName.has(pairKey)) {
                    dependencyByEstablishmentNameAndName.set(pairKey, []);
                  }
                  dependencyByEstablishmentNameAndName.get(pairKey).push(depFound);
                }
                dependencyRows.push({
                  id: depFound.id,
                  establishmentId: depFound.establishmentId,
                  key: depKey,
                  raw: depFound.name,
                  establishmentNameKey:
                    establishmentNameById.get(depFound.establishmentId) || "",
                });
              }
            }
          }
        } else if (establishmentNameKey) {
          const byPair =
            dependencyByEstablishmentNameAndName.get(
              `${establishmentNameKey}:${dependencyNameKey}`
            ) || [];
          if (byPair.length === 1) {
            input.dependencyId = byPair[0].id;
            input.establishmentId = byPair[0].establishmentId;
          } else if (byPair.length === 0) {
            const fuzzy = dependencyRows.filter(
              (x) =>
                (x.establishmentNameKey.includes(establishmentNameKey) ||
                  establishmentNameKey.includes(x.establishmentNameKey)) &&
                (x.key.includes(dependencyNameKey) || dependencyNameKey.includes(x.key))
            );
            if (fuzzy.length === 1) {
              input.dependencyId = fuzzy[0].id;
              input.establishmentId = fuzzy[0].establishmentId;
            }
          }
        } else {
          const matched = dependencyByName.get(dependencyNameKey) || [];
          if (matched.length === 1) {
            input.dependencyId = matched[0].id;
            input.establishmentId = matched[0].establishmentId;
          }
        }
      }
      if (!input.dependencyId && input.establishmentId) {
        const fallbackDependency = firstDependencyByEstablishmentId.get(input.establishmentId);
        if (fallbackDependency) {
          input.dependencyId = fallbackDependency.id;
        }
      }
      if (!input.dependencyId && defaultDependency) {
        input.dependencyId = defaultDependency.id;
      }
      if (!input.establishmentId && input.dependencyId) {
        const dependency = allDependencies.find((item) => item.id === input.dependencyId);
        if (dependency) {
          input.establishmentId = dependency.establishmentId;
        }
      }

      const invalidFields = [];
      if (!input.establishmentId) invalidFields.push("establishmentId");
      if (!input.dependencyId) invalidFields.push("dependencyId");
      if (!input.assetStateId) invalidFields.push("assetStateId");
      if (!input.assetTypeId) invalidFields.push("assetTypeId");
      if (validateAcquisitionValue(input.acquisitionValue)) {
        invalidFields.push("acquisitionValue");
      }
      if (validateAcquisitionDate(input.acquisitionDate)) {
        invalidFields.push("acquisitionDate");
      }
      if (validateStringMax("name", input.name, MAX_NAME_LENGTH)) {
        invalidFields.push("name");
      }
      if (validateStringMax("brand", input.brand, MAX_SHORT_TEXT)) {
        invalidFields.push("brand");
      }
      if (validateStringMax("modelName", input.modelName, MAX_SHORT_TEXT)) {
        invalidFields.push("modelName");
      }
      if (validateStringMax("serialNumber", input.serialNumber, MAX_SHORT_TEXT)) {
        invalidFields.push("serialNumber");
      }
      if (validateStringMax("accountingAccount", input.accountingAccount, MAX_SHORT_TEXT)) {
        invalidFields.push("accountingAccount");
      }
      if (validateStringMax("analyticCode", input.analyticCode, MAX_SHORT_TEXT)) {
        invalidFields.push("analyticCode");
      }
      if (validateStringMax("responsibleName", input.responsibleName, MAX_SHORT_TEXT)) {
        invalidFields.push("responsibleName");
      }
      if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
        invalidFields.push("quantity");
      }
      if (input.quantity > 1 && input.serialNumber) {
        invalidFields.push("serialNumber");
      }
      if (validateRutFormat("responsibleRut", input.responsibleRut)) {
        invalidFields.push("responsibleRut");
      }
      if (validateStringMax("responsibleRut", normalizedResponsibleRut, MAX_SHORT_TEXT)) {
        invalidFields.push("responsibleRut");
      }
      if (validateStringMax("responsibleRole", input.responsibleRole, MAX_SHORT_TEXT)) {
        invalidFields.push("responsibleRole");
      }
      if (validateStringMax("costCenter", normalizedCostCenter, MAX_SHORT_TEXT)) {
        invalidFields.push("costCenter");
      }

      if (invalidFields.length) {
        errors.push({
          row: rowIndex,
          error: "Datos requeridos incompletos o invalidos",
          fields: invalidFields,
          values: {
            establishmentName: input.establishmentName || null,
            dependencyName: input.dependencyName || null,
            assetStateName: input.assetStateName || null,
            assetTypeName: input.assetTypeName || null,
          },
        });
        continue;
      }

      try {
        enforceEstablishmentScope(user, input.establishmentId);
        if (!canCreateAsset(user, input.establishmentId)) {
          throw forbidden("No autorizado para este establecimiento");
        }

        const createdAssets = await prisma.$transaction(async (tx) => {
          const assetsInRow = [];
          for (let unit = 0; unit < input.quantity; unit++) {
            let asset = null;
            let lastUniqueErr = null;
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
              const establishment = await tx.establishment.findUnique({
                where: { id: input.establishmentId },
                select: { id: true, institutionId: true, isActive: true },
              });
              if (!establishment) throw notFound("Establishment no existe");
              if (!establishment.isActive) throw badRequest("Establishment inactivo");
              if (
                user.role.type === "ADMIN_ESTABLISHMENT" &&
                user.institutionId &&
                establishment.institutionId !== user.institutionId
              ) {
                throw forbidden("No autorizado para esta institution");
              }

              const dependency = await tx.dependency.findUnique({
                where: { id: input.dependencyId },
                select: { id: true, establishmentId: true, isActive: true },
              });
              if (!dependency) throw notFound("Dependency no existe");
              if (!dependency.isActive) throw badRequest("Dependency inactiva");
              if (dependency.establishmentId !== input.establishmentId) {
                throw badRequest("Dependency no pertenece al establishment");
              }

              const state = await tx.assetState.findUnique({
                where: { id: input.assetStateId },
              });
              if (!state) throw notFound("AssetState no existe");

              const assetType = await tx.assetType.findUnique({
                where: { id: input.assetTypeId },
              });
              if (!assetType) throw notFound("AssetType no existe");

              const seq = await tx.assetSequence.upsert({
                where: { institutionId: establishment.institutionId },
                update: { lastNumber: { increment: 1 } },
                create: { institutionId: establishment.institutionId, lastNumber: 1 },
              });

              let internalCode = seq.lastNumber;
              const existingBySeq = await tx.asset.findUnique({
                where: { internalCode },
                select: { id: true },
              });
              if (existingBySeq) {
                const maxCode = await tx.asset.aggregate({ _max: { internalCode: true } });
                internalCode = Number(maxCode?._max?.internalCode || 0) + 1;
              }

              await ensureUniqueAssetIdentity(tx, {
                serialNumber: input.serialNumber,
                brand: input.brand,
                modelName: input.modelName,
              });

              const createdAsset = await tx.asset.create({
                data: {
                  internalCode,
                  name: String(input.name),
                  brand: input.brand ? String(input.brand) : null,
                  modelName: input.modelName ? String(input.modelName) : null,
                  serialNumber: input.serialNumber ? String(input.serialNumber) : null,
                  quantity: 1,
                  accountingAccount: input.accountingAccount
                    ? String(input.accountingAccount)
                    : null,
                  analyticCode: input.analyticCode ? String(input.analyticCode) : null,
                  responsibleName: input.responsibleName
                    ? String(input.responsibleName)
                    : null,
                  responsibleRut: normalizedResponsibleRut,
                  responsibleRole: input.responsibleRole
                    ? String(input.responsibleRole)
                    : null,
                  costCenter: normalizedCostCenter,
                  acquisitionValue: Number(input.acquisitionValue),
                  acquisitionDate: new Date(input.acquisitionDate),
                  assetTypeId: input.assetTypeId,
                  assetStateId: input.assetStateId,
                  establishmentId: input.establishmentId,
                  dependencyId: input.dependencyId,
                },
              });

              await tx.movement.create({
                data: {
                  type: "INVENTORY_CHECK",
                  assetId: createdAsset.id,
                  fromDependencyId: null,
                  toDependencyId: input.dependencyId,
                  userId: user.id,
                },
              });

                asset = createdAsset;
                break;
              } catch (e) {
                if (isPrismaUniqueConstraintError(e)) {
                  lastUniqueErr = e;
                  continue;
                }
                throw e;
              }
            }

            if (!asset && lastUniqueErr) {
              throw badRequest("Conflicto de codigo interno durante importacion");
            }
            if (!asset) {
              throw badRequest("No se pudo crear asset durante importacion");
            }
            assetsInRow.push(asset);
          }
          return assetsInRow;
        });

        created.push(...createdAssets.map((item) => item.id));
      } catch (e) {
        errors.push({
          row: rowIndex,
          error: e.message || "Error importando",
          values: {
            establishmentId: establishmentIdRaw || null,
            dependencyId: dependencyIdRaw || null,
            assetStateId: assetStateIdRaw || null,
            assetTypeId: assetTypeIdRaw || null,
            name: input.name || null,
          },
        });
      }
    }

    await prisma.assetImportBatch.update({
      where: { id: batch.id },
      data: {
        status: "COMPLETED",
        createdCount: created.length,
        errorCount: errors.length,
        errors: errors.slice(0, 200),
        completedAt: new Date(),
      },
    });

    return {
      createdCount: created.length,
      errorCount: errors.length,
      errors,
    };
  } catch (err) {
    await prisma.assetImportBatch.update({
      where: { id: batch.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errors: err?.details || { message: err.message || "Error" },
      },
    });
    throw err;
  }
}

async function buildAssetImportTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Inventario");
  sheet.addRow([
    "Codigo Interno",
    "Nombre",
    "Cantidad",
    "Marca",
    "Modelo",
    "Serie",
    "Responsable",
    "RUT Responsable",
    "Cargo Responsable",
    "Centro de Costo",
    "Cuenta Contable",
    "Analitico",
    "Tipo",
    "Estado",
    "Establecimiento",
    "Dependencia",
    "Valor Adquisicion",
    "Fecha Adquisicion",
    "DESCRIPCI\u00d3N DEL BIEN",
    "DEPRECIACI\u00d3N",
  ]);
  sheet.getRow(1).font = { bold: true };

  try {
    const establishment = await prisma.establishment.findFirst({
      where: { isActive: true },
      orderBy: { id: "asc" },
    });
    const dependency = establishment
      ? await prisma.dependency.findFirst({
          where: { establishmentId: establishment.id, isActive: true },
          orderBy: { id: "asc" },
        })
      : null;
    const state = await prisma.assetState.findFirst({
      where: { name: "BUENO" },
    });
    const type = await prisma.assetType.findFirst({
      where: { name: "CONTROL" },
    });

    if (establishment && dependency && state && type) {
      sheet.addRow([
        "",
        "Ejemplo",
        1,
        "Marca",
        "Modelo",
        "Serie",
        "Encargado de Dependencia",
        "11111111-1",
        "Jefe de Dependencia",
        "CC-001",
        "CT-001",
        "AN-001",
        "CONTROL",
        "BUENO",
        establishment.name,
        dependency.name,
        "POR INFORMAR",
        "POR INFORMAR",
        "Detalle referencial del bien",
        "",
      ]);
    }
  } catch {
    // ignore sample row if lookup fails
  }

  return workbook;
}

module.exports = { importAssetsFromExcel, buildAssetImportTemplate };
