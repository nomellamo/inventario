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

const REQUIRED_FIELDS = [
  { label: "establishmentId/Establecimiento", keys: ["establishmentid", "establishmentname"] },
  { label: "dependencyId/Dependencia", keys: ["dependencyid", "dependencyname"] },
  { label: "assetStateId/Estado", keys: ["assetstateid", "assetstatename"] },
  { label: "assetTypeId/Tipo", keys: ["assettypeid", "assettype"] },
  { label: "Nombre", keys: ["name"] },
  { label: "Cuenta Contable", keys: ["accountingaccount"] },
  { label: "Analitico", keys: ["analyticcode"] },
  { label: "Valor Adquisicion", keys: ["acquisitionvalue"] },
  { label: "Fecha Adquisicion", keys: ["acquisitiondate"] },
];

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
  centrocosto: "costcenter",
};

function normalizeHeader(value) {
  return String(value || "")
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

function normalizeLookupValue(value) {
  return String(value || "")
    .trim()
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

    const missingColumns = REQUIRED_FIELDS.filter(
      (field) => !field.keys.some((k) => keyMap[k])
    ).map((field) => field.label);

    if (missingColumns.length) {
      await prisma.assetImportBatch.update({
        where: { id: batch.id },
        data: {
          status: "FAILED",
          errorCount: missingColumns.length,
          errors: {
            missingColumns,
            headersFound,
            expectedColumns: REQUIRED_FIELDS.map((f) => f.label),
          },
          completedAt: new Date(),
        },
      });
      throw badRequest("Faltan columnas requeridas", "IMPORT_SCHEMA", {
        missingColumns,
        headersFound,
        expectedColumns: REQUIRED_FIELDS.map((f) => f.label),
      });
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
    const establishmentByName = new Map();
    for (const item of allEstablishments) {
      const key = normalizeLookupValue(item.name);
      if (!key) continue;
      if (!establishmentByName.has(key)) establishmentByName.set(key, []);
      establishmentByName.get(key).push(item);
    }
    const dependencyByName = new Map();
    const dependencyByEstablishmentAndName = new Map();
    for (const item of allDependencies) {
      const nameKey = normalizeLookupValue(item.name);
      if (!nameKey) continue;
      if (!dependencyByName.has(nameKey)) dependencyByName.set(nameKey, []);
      dependencyByName.get(nameKey).push(item);
      dependencyByEstablishmentAndName.set(`${item.establishmentId}:${nameKey}`, item.id);
    }
    const stateByName = new Map(
      allStates.map((item) => [normalizeLookupValue(item.name), item.id])
    );
    const typeByName = new Map(
      allTypes.map((item) => [normalizeLookupValue(item.name), item.id])
    );

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
        name: getRowValue(row, keyMap, "name"),
        accountingAccount: getRowValue(row, keyMap, "accountingaccount"),
        analyticCode: getRowValue(row, keyMap, "analyticcode"),
        brand: getRowValue(row, keyMap, "brand"),
        modelName: getRowValue(row, keyMap, "modelname"),
        serialNumber: getRowValue(row, keyMap, "serialnumber"),
        quantityRaw: getRowValue(row, keyMap, "quantity"),
        responsibleRut: getRowValue(row, keyMap, "responsiblerut"),
        costCenter: getRowValue(row, keyMap, "costcenter"),
        acquisitionValue: Number(getRowValue(row, keyMap, "acquisitionvalue")),
        acquisitionDate: parseExcelDate(getRowValue(row, keyMap, "acquisitiondate")),
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

      if (!input.establishmentId && establishmentNameKey) {
        const matched = establishmentByName.get(establishmentNameKey) || [];
        if (matched.length === 1) {
          input.establishmentId = matched[0].id;
        }
      }
      if (!input.assetStateId && stateNameKey) {
        input.assetStateId = stateByName.get(stateNameKey) || null;
      }
      if (!input.assetTypeId && typeNameKey) {
        input.assetTypeId = typeByName.get(typeNameKey) || null;
      }
      if (!input.dependencyId && dependencyNameKey) {
        if (input.establishmentId) {
          input.dependencyId =
            dependencyByEstablishmentAndName.get(
              `${input.establishmentId}:${dependencyNameKey}`
            ) || null;
        } else {
          const matched = dependencyByName.get(dependencyNameKey) || [];
          if (matched.length === 1) {
            input.dependencyId = matched[0].id;
          }
        }
      }

      const invalidFields = [];
      if (!input.establishmentId) invalidFields.push("establishmentId");
      if (!input.dependencyId) invalidFields.push("dependencyId");
      if (!input.assetStateId) invalidFields.push("assetStateId");
      if (!input.assetTypeId) invalidFields.push("assetTypeId");
      if (!input.name) invalidFields.push("name");
      if (!String(input.accountingAccount || "").trim()) invalidFields.push("accountingAccount");
      if (!String(input.analyticCode || "").trim()) invalidFields.push("analyticCode");
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
      if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
        invalidFields.push("quantity");
      }
      if (validateRutFormat("responsibleRut", input.responsibleRut)) {
        invalidFields.push("responsibleRut");
      }
      if (validateStringMax("responsibleRut", normalizedResponsibleRut, MAX_SHORT_TEXT)) {
        invalidFields.push("responsibleRut");
      }
      if (validateStringMax("costCenter", normalizedCostCenter, MAX_SHORT_TEXT)) {
        invalidFields.push("costCenter");
      }

      if (invalidFields.length) {
        errors.push({
          row: rowIndex,
          error: "Datos requeridos incompletos o invalidos",
          fields: invalidFields,
        });
        continue;
      }

      try {
        enforceEstablishmentScope(user, input.establishmentId);
        if (!canCreateAsset(user, input.establishmentId)) {
          throw forbidden("No autorizado para este establecimiento");
        }

        let asset = null;
        let lastUniqueErr = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            asset = await prisma.$transaction(async (tx) => {
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
                  quantity: input.quantity,
                  accountingAccount: String(input.accountingAccount),
                  analyticCode: String(input.analyticCode),
                  responsibleRut: normalizedResponsibleRut,
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

              return createdAsset;
            });
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

        created.push(asset.id);
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
  const sheet = workbook.addWorksheet("Assets");
  sheet.addRow([
    "Codigo Interno",
    "Nombre",
    "Marca",
    "Modelo",
    "Serie",
    "Cuenta Contable",
    "Analitico",
    "Tipo",
    "Estado",
    "Establecimiento",
    "Dependencia",
    "Valor Adquisicion",
    "Fecha Adquisicion",
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
        "Marca",
        "Modelo",
        "Serie",
        "CT-001",
        "AN-001",
        "CONTROL",
        "BUENO",
        establishment.name,
        dependency.name,
        10000,
        new Date().toISOString().split("T")[0],
      ]);
    }
  } catch {
    // ignore sample row if lookup fails
  }

  return workbook;
}

module.exports = { importAssetsFromExcel, buildAssetImportTemplate };
