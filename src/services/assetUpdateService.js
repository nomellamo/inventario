const { prisma } = require("../prisma");
const { canUpdateAsset } = require("../permissions/assetPermissions");
const { logAssetAudit, snapshotAsset } = require("./assetAuditService");
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
const { badRequest, forbidden, notFound } = require("../utils/httpError");
const { ensureUniqueAssetIdentity } = require("../utils/assetIdentity");

function assert(cond, error) {
  if (!cond) throw error;
}

async function updateAsset(assetId, input, user) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw notFound("Asset no encontrado");
  if (!canUpdateAsset(user, asset)) {
    throw forbidden("No autorizado para editar este asset");
  }
  if (asset.isDeleted) {
    throw forbidden("No se puede editar un asset dado de baja");
  }

  if (input.acquisitionValue !== undefined) {
    const valueError = validateAcquisitionValue(input.acquisitionValue);
    assert(!valueError, badRequest(valueError));
  }
  if (input.acquisitionDate !== undefined) {
    const dateError = validateAcquisitionDate(new Date(input.acquisitionDate));
    assert(!dateError, badRequest(dateError));
  }

  const nameError = validateStringMax("name", input.name, MAX_NAME_LENGTH);
  assert(!nameError, badRequest(nameError));
  const brandError = validateStringMax("brand", input.brand, MAX_SHORT_TEXT);
  assert(!brandError, badRequest(brandError));
  const modelError = validateStringMax("modelName", input.modelName, MAX_SHORT_TEXT);
  assert(!modelError, badRequest(modelError));
  const serialError = validateStringMax("serialNumber", input.serialNumber, MAX_SHORT_TEXT);
  assert(!serialError, badRequest(serialError));
  if (input.quantity !== undefined) {
    assert(
      Number.isInteger(Number(input.quantity)) && Number(input.quantity) > 0,
      badRequest("quantity invalido")
    );
  }
  const accError = validateStringMax("accountingAccount", input.accountingAccount, MAX_SHORT_TEXT);
  assert(!accError, badRequest(accError));
  const analyticError = validateStringMax("analyticCode", input.analyticCode, MAX_SHORT_TEXT);
  assert(!analyticError, badRequest(analyticError));
  const responsibleNameError = validateStringMax(
    "responsibleName",
    input.responsibleName,
    MAX_SHORT_TEXT
  );
  assert(!responsibleNameError, badRequest(responsibleNameError));
  const responsibleRutFormatError = validateRutFormat("responsibleRut", input.responsibleRut);
  assert(!responsibleRutFormatError, badRequest(responsibleRutFormatError));
  const normalizedResponsibleRut = normalizeRut(input.responsibleRut);
  const responsibleRutError = validateStringMax("responsibleRut", normalizedResponsibleRut, MAX_SHORT_TEXT);
  assert(!responsibleRutError, badRequest(responsibleRutError));
  const responsibleRoleError = validateStringMax(
    "responsibleRole",
    input.responsibleRole,
    MAX_SHORT_TEXT
  );
  assert(!responsibleRoleError, badRequest(responsibleRoleError));
  const normalizedCostCenter = normalizeCostCenter(input.costCenter);
  const costCenterError = validateStringMax("costCenter", normalizedCostCenter, MAX_SHORT_TEXT);
  assert(!costCenterError, badRequest(costCenterError));

  if (input.catalogItemId !== undefined) {
    const catalog = await prisma.catalogItem.findUnique({
      where: { id: input.catalogItemId },
    });
    assert(catalog, notFound("CatalogItem no existe"));
  }

  const data = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.brand !== undefined) data.brand = input.brand || null;
  if (input.modelName !== undefined) data.modelName = input.modelName || null;
  if (input.serialNumber !== undefined) data.serialNumber = input.serialNumber || null;
  if (input.quantity !== undefined) data.quantity = Number(input.quantity);
  if (input.accountingAccount !== undefined) data.accountingAccount = input.accountingAccount;
  if (input.analyticCode !== undefined) data.analyticCode = input.analyticCode;
  if (input.responsibleName !== undefined) data.responsibleName = input.responsibleName || null;
  if (input.responsibleRut !== undefined) data.responsibleRut = normalizedResponsibleRut;
  if (input.responsibleRole !== undefined) data.responsibleRole = input.responsibleRole || null;
  if (input.costCenter !== undefined) data.costCenter = normalizedCostCenter;
  if (input.acquisitionValue !== undefined) data.acquisitionValue = input.acquisitionValue;
  if (input.acquisitionDate !== undefined) data.acquisitionDate = new Date(input.acquisitionDate);
  if (input.catalogItemId !== undefined) data.catalogItemId = input.catalogItemId;

  if (!Object.keys(data).length) {
    throw badRequest("Sin campos para actualizar");
  }

  await ensureUniqueAssetIdentity(prisma, {
    excludeId: asset.id,
    serialNumber:
      data.serialNumber !== undefined ? data.serialNumber : asset.serialNumber,
    brand: data.brand !== undefined ? data.brand : asset.brand,
    modelName: data.modelName !== undefined ? data.modelName : asset.modelName,
  });

  const before = snapshotAsset(asset);
  const updated = await prisma.asset.update({
    where: { id: assetId },
    data,
  });

  await logAssetAudit({
    userId: user.id,
    action: "UPDATE",
    assetId: updated.id,
    before,
    after: snapshotAsset(updated),
  });

  return updated;
}

module.exports = { updateAsset };
