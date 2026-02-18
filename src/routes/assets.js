const express = require("express");
const router = express.Router();

const { createAsset } = require("../services/assetService");
const { updateAsset } = require("../services/assetUpdateService");
const { listAssets } = require("../services/assetQueryService");
const { relocateAsset } = require("../services/assetRelocateService");
const { getAssetById } = require("../services/assetGetService");
const { exportAssetsToExcel } = require("../services/assetExportService");
const { exportAssetsToPdf } = require("../services/assetExportPdfService");
const { getAssetHistory } = require("../services/assetHistoryService");
const { transferAsset } = require("../services/assetTransferService");
const { changeAssetStatus } = require("../services/assetStatusService");
const { restoreAsset } = require("../services/assetRestoreService");
const {
  getAssetForceDeleteSummary,
  deleteAssetPermanentForce,
} = require("../services/assetPermanentDeleteService");
const {
  createAssetEvidence,
  listAssetEvidence,
  getAssetEvidenceFile,
} = require("../services/assetEvidenceService");
const { listAssetImportBatches } = require("../services/assetImportHistoryService");
const {
  importAssetsFromExcel,
  buildAssetImportTemplate,
} = require("../services/assetImportService");
const {
  buildAssetImportCatalogWorkbook,
} = require("../services/assetImportCatalogExportService");
const {
  exportAssetImportHistoryToExcel,
} = require("../services/assetImportHistoryExportExcelService");
const {
  exportAssetImportHistoryToPdf,
} = require("../services/assetImportHistoryExportPdfService");
const { MOVEMENT_REASON_CODES, MOVEMENT_REASON_LABELS } = require("../constants/movementReasonCodes");

const { authJwt } = require("../middleware/authJwt");
const { blockWriteForViewer } = require("../middleware/auth");
const { rejectInstitutionIdBody } = require("../middleware/rejectInstitutionId");
const { requireJson } = require("../middleware/requireJson");
const { limitContentLength } = require("../middleware/limitContentLength");
const { asyncHandler } = require("../utils/asyncHandler");
const { validateBody, validateParams, validateQuery } = require("../middleware/validate");
const {
  idParam,
  evidenceIdParam,
  relocateBody,
  transferBody,
  statusChangeBody,
  restoreBody,
  forceDeleteBody,
  createAssetBody,
  updateAssetBody,
  listAssetsQuery,
  importHistoryQuery,
  evidenceListQuery,
} = require("../validators/assetSchemas");

const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const { sendError } = require("../utils/errorResponse");
const uploadEvidence = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.use(authJwt);

router.get(
  "/reason-codes",
  asyncHandler(async (req, res) => {
    res.json({
      transfer: MOVEMENT_REASON_CODES.TRANSFER.map((code) => ({
        code,
        label: MOVEMENT_REASON_LABELS[code] || code,
      })),
      statusChange: MOVEMENT_REASON_CODES.STATUS_CHANGE.map((code) => ({
        code,
        label: MOVEMENT_REASON_LABELS[code] || code,
      })),
      restore: MOVEMENT_REASON_CODES.RESTORE.map((code) => ({
        code,
        label: MOVEMENT_REASON_LABELS[code] || code,
      })),
    });
  })
);

router.post(
  "/",
  blockWriteForViewer,
  rejectInstitutionIdBody,
  requireJson,
  validateBody(createAssetBody),
  asyncHandler(async (req, res) => {
    const asset = await createAsset(req.body, req.user);
    res.status(201).json(asset);
  })
);

router.get(
  "/",
  validateQuery(listAssetsQuery),
  asyncHandler(async (req, res) => {
    const result = await listAssets(req.query, req.user);
    res.json(result);
  })
);

router.get(
  "/export/excel",
  validateQuery(listAssetsQuery),
  asyncHandler(async (req, res) => {
    const workbook = await exportAssetsToExcel(req.query, req.user);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=inventario.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  })
);

router.get(
  "/export/pdf",
  validateQuery(listAssetsQuery),
  asyncHandler(async (req, res) => {
    const doc = await exportAssetsToPdf(req.query, req.user);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=inventario_${Date.now()}.pdf`
    );

    doc.pipe(res);
    doc.end();
  })
);

router.get(
  "/import/template/excel",
  asyncHandler(async (req, res) => {
    const workbook = await buildAssetImportTemplate();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=assets_filtrados.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  })
);

router.get(
  "/import/catalog/excel",
  asyncHandler(async (req, res) => {
    const workbook = await buildAssetImportCatalogWorkbook();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=assets_catalog_ids.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  })
);

router.post(
  "/import/excel",
  blockWriteForViewer,
  limitContentLength(10 * 1024 * 1024),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file || !req.file.buffer) {
      return sendError(res, {
        status: 400,
        error: "Archivo Excel requerido",
        code: "ASSET_IMPORT_FILE_REQUIRED",
        requestId: req.id,
      });
    }

    const result = await importAssetsFromExcel(
      req.file.buffer,
      req.user,
      req.file.originalname
    );
    res.json(result);
  })
);

router.get(
  "/imports",
  validateQuery(importHistoryQuery),
  asyncHandler(async (req, res) => {
    const result = await listAssetImportBatches(req.query, req.user);
    res.json(result);
  })
);

router.get(
  "/imports/export/excel",
  validateQuery(importHistoryQuery),
  asyncHandler(async (req, res) => {
    const workbook = await exportAssetImportHistoryToExcel(req.query, req.user);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=import_history_${Date.now()}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  })
);

router.get(
  "/imports/export/pdf",
  validateQuery(importHistoryQuery),
  asyncHandler(async (req, res) => {
    const doc = await exportAssetImportHistoryToPdf(req.query, req.user);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=import_history_${Date.now()}.pdf`
    );
    doc.pipe(res);
    doc.end();
  })
);

router.get(
  "/:id/evidence",
  validateParams(idParam),
  validateQuery(evidenceListQuery),
  asyncHandler(async (req, res) => {
    const result = await listAssetEvidence(Number(req.params.id), req.query, req.user);
    res.json(result);
  })
);

router.get(
  "/:id/evidence/:evidenceId/download",
  validateParams(evidenceIdParam),
  asyncHandler(async (req, res) => {
    const file = await getAssetEvidenceFile(
      Number(req.params.id),
      Number(req.params.evidenceId),
      req.user
    );
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(file.fileName)}"`
    );
    res.send(Buffer.from(file.content));
  })
);

router.post(
  "/:id/evidence",
  blockWriteForViewer,
  validateParams(idParam),
  limitContentLength(8 * 1024 * 1024),
  uploadEvidence.single("file"),
  asyncHandler(async (req, res) => {
    const item = await createAssetEvidence(
      Number(req.params.id),
      req.body,
      req.file,
      req.user
    );
    res.status(201).json(item);
  })
);

router.get(
  "/:id/history",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const history = await getAssetHistory(req.params.id, req.user);

    res.json({
      assetId: req.params.id,
      count: history.length,
      movements: history,
    });
  })
);

router.get(
  "/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const asset = await getAssetById(req.params.id, req.user);
    res.json(asset);
  })
);

router.put(
  "/:id",
  blockWriteForViewer,
  validateParams(idParam),
  requireJson,
  validateBody(updateAssetBody),
  asyncHandler(async (req, res) => {
    const asset = await updateAsset(req.params.id, req.body, req.user);
    res.json(asset);
  })
);

router.put(
  "/:id/relocate",
  blockWriteForViewer,
  validateParams(idParam),
  requireJson,
  validateBody(relocateBody),
  asyncHandler(async (req, res) => {
    const asset = await relocateAsset(
      req.params.id,
      req.body.toDependencyId,
      req.user
    );
    res.json(asset);
  })
);

router.put(
  "/:id/transfer",
  blockWriteForViewer,
  validateParams(idParam),
  limitContentLength(8 * 1024 * 1024),
  uploadEvidence.single("file"),
  validateBody(transferBody),
  asyncHandler(async (req, res) => {
    const asset = await transferAsset(
      req.params.id,
      req.body.toEstablishmentId,
      req.body.toDependencyId,
      req.body.reasonCode,
      req.body,
      req.file,
      req.user
    );
    res.json(asset);
  })
);

router.put(
  "/:id/status",
  blockWriteForViewer,
  validateParams(idParam),
  limitContentLength(8 * 1024 * 1024),
  uploadEvidence.single("file"),
  validateBody(statusChangeBody),
  asyncHandler(async (req, res) => {
    const asset = await changeAssetStatus(
      req.params.id,
      req.body.assetStateId,
      req.body.reasonCode,
      req.body,
      req.file,
      req.user
    );
    res.json(asset);
  })
);

router.put(
  "/:id/restore",
  blockWriteForViewer,
  validateParams(idParam),
  limitContentLength(8 * 1024 * 1024),
  uploadEvidence.single("file"),
  validateBody(restoreBody),
  asyncHandler(async (req, res) => {
    const asset = await restoreAsset(
      req.params.id,
      req.body.assetStateId,
      req.body.reasonCode,
      req.body,
      req.file,
      req.user
    );
    res.json(asset);
  })
);

router.get(
  "/:id/permanent/summary",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const item = await getAssetForceDeleteSummary(Number(req.params.id), req.user);
    res.json(item);
  })
);

router.delete(
  "/:id/permanent/force",
  blockWriteForViewer,
  validateParams(idParam),
  requireJson,
  validateBody(forceDeleteBody),
  asyncHandler(async (req, res) => {
    const item = await deleteAssetPermanentForce(Number(req.params.id), req.body, req.user);
    res.json(item);
  })
);

module.exports = { assetsRouter: router };
