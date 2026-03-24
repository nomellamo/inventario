import { useEffect } from 'react'
import { UI_TEXT } from '../constants/uiText'

const LABEL = {
  widthMm: 40,
  heightMm: 30,
  marginMm: 1,
  offsetX: 0,
  offsetY: 0,
  qrSizeMm: 25.8,
  barcodeWidthMm: 12,
  barcodeHeightMm: 2.2,
}

const LABEL_SHOW_BARCODE = false
const LABEL_QR_LEFT_MM = 0.2
const LABEL_QR_TOP_MM = 1.1
const LABEL_TEXT_RIGHT_MM = 0.6
const LABEL_TEXT_GAP_FROM_QR_MM = 0.6
const LABEL_CODE_TOP_MM = 1.8
const LABEL_BODY_TOP_MM = 7.2
const QR_PRINT_WIDTH_PX = 2200

function getErrorMessage(error, fallbackMessage) {
  return error?.message || fallbackMessage
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function truncateLabelText(value, maxLength = 26) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`
}

function splitLabelText(value, maxCharsPerLine = 12, maxLines = 2) {
  const normalized = truncateLabelText(value, maxCharsPerLine * maxLines + 4)
  if (!normalized) return []
  const words = normalized.split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxCharsPerLine || !current) {
      current = candidate
      continue
    }
    lines.push(current)
    current = word
    if (lines.length >= maxLines - 1) break
  }
  if (lines.length < maxLines && current) lines.push(current)
  const consumedWords = lines.join(' ').split(/\s+/).filter(Boolean).length
  const remainingWords = words.slice(consumedWords)
  if (remainingWords.length && lines.length) {
    const lastIndex = Math.min(lines.length - 1, maxLines - 1)
    lines[lastIndex] = truncateLabelText(
      `${lines[lastIndex]} ${remainingWords.join(' ')}`.trim(),
      maxCharsPerLine
    )
  }
  return lines.slice(0, maxLines)
}

function useAssetLabelsAndScan({
  api,
  setErr,
  setOk,
  apiBase,
  publicSheetBase,
  loadQrCodeLib,
  loadJsBarcodeLib,
  loadJsPdfLib,
  loadHtml2CanvasLib,
  toPositiveIntOrNull,
  createdAsset,
  createdAssetBatch,
  qrCodeUrl,
  setQrCodeUrl,
  assetListTotal,
  assetsList,
  assetListFilters,
  selectedAssetIds,
  setSelectedAssetIds,
  planchetaPreview,
  scanInput,
  setScanResult,
  selectAssetForModal,
}) {
  function getSafeAssetId(assetLike) {
    return toPositiveIntOrNull(assetLike?.id)
  }

  function buildAssetTechnicalSheetUrl(assetLike) {
    const assetId = getSafeAssetId(assetLike)
    if (!assetId) return ''
    const forcedPublicBase = String(publicSheetBase || '').trim().replace(/\/+$/, '')
    if (/^https?:\/\//i.test(forcedPublicBase)) {
      return `${forcedPublicBase}/assets/public/${assetId}/ficha.html`
    }
    let base = String(apiBase || '/api').trim()
    const forcedHttpsIndex = base.toLowerCase().lastIndexOf('https://')
    const forcedHttpIndex = base.toLowerCase().lastIndexOf('http://')
    const forcedIndex = Math.max(forcedHttpsIndex, forcedHttpIndex)
    if (forcedIndex > 0) {
      base = base.slice(forcedIndex)
    }
    base = base.replace(/\/+$/, '')
    if (/^https?:\/\//i.test(base)) {
      return `${base}/assets/public/${assetId}/ficha.html`
    }
    const normalizedBase = base.startsWith('/') ? base : `/${base}`
    return `${window.location.origin}${normalizedBase}/assets/public/${assetId}/ficha.html`
  }

  function getLabelData(asset) {
    const code = asset?.internalCode ? `INV-${asset.internalCode}` : ''
    const name = asset?.name || asset?.catalogItem?.name || UI_TEXT.assetSingular
    const responsibleName = asset?.responsibleName || ''
    const assetId = getSafeAssetId(asset)
    const technicalSheetUrl = buildAssetTechnicalSheetUrl(asset)
    return {
      code,
      name,
      responsibleName,
      assetId,
      technicalSheetUrl,
      establishment: asset?.establishment?.name || '',
      dependency: asset?.dependency?.name || '',
      assetState: asset?.assetState?.name || '',
    }
  }

  function getLabelBodyLines(label) {
    const lines = []
    if (label?.responsibleName) {
      lines.push(...splitLabelText(label.responsibleName, 12, 2))
    }
    if (label?.name) lines.push(...splitLabelText(label.name, 12, 2))
    return lines.filter(Boolean)
  }

  function getLabelLayoutMetrics() {
    const baseX = LABEL.marginMm + LABEL.offsetX
    const baseY = LABEL.marginMm + LABEL.offsetY
    const contentWidth = LABEL.widthMm - 2 * LABEL.marginMm
    const qrX = baseX + LABEL_QR_LEFT_MM
    const qrY = baseY + LABEL_QR_TOP_MM
    const qrSize = LABEL.qrSizeMm
    const textLeftX = qrX + qrSize + LABEL_TEXT_GAP_FROM_QR_MM
    const textTopY = baseY + LABEL_BODY_TOP_MM
    const codeTopY = baseY + LABEL_CODE_TOP_MM
    const textWidth = Math.max(4, LABEL.widthMm - LABEL.marginMm - LABEL_TEXT_RIGHT_MM - textLeftX)
    return { baseX, baseY, contentWidth, qrX, qrY, qrSize, textLeftX, textTopY, codeTopY, textWidth }
  }

  function getLabelBodyHtml(label) {
    return getLabelBodyLines(label)
      .map((line) => `<div class="line">${escapeHtml(line)}</div>`)
      .join('')
  }

  function getSingleLabelSheetStyles() {
    const { textLeftX, textTopY, textWidth } = getLabelLayoutMetrics()
    return `
      * { box-sizing: border-box; }
      .label-pdf-root {
        margin: 0;
        padding: ${LABEL.marginMm}mm;
        width: ${LABEL.widthMm}mm;
        height: ${LABEL.heightMm}mm;
        font-family: Arial, "Helvetica Neue", sans-serif;
        color: #0f172a;
        background: #fff;
      }
      .sheet {
        width: ${LABEL.widthMm - 2 * LABEL.marginMm}mm;
        height: ${LABEL.heightMm - 2 * LABEL.marginMm}mm;
        transform: translate(${LABEL.offsetX}mm, ${LABEL.offsetY}mm);
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        text-align: center;
        overflow: hidden;
        background: #fff;
      }
      .code-top {
        position: absolute;
        top: ${LABEL_CODE_TOP_MM}mm;
        left: ${textLeftX}mm;
        width: ${textWidth}mm;
        text-align: left;
        font-weight: 800;
        font-size: 8.6px;
        line-height: 1.1;
        color: #020617;
        letter-spacing: 0;
        white-space: normal;
        word-break: break-word;
      }
      .side-right {
        position: absolute;
        left: ${textLeftX}mm;
        top: ${textTopY}mm;
        width: ${textWidth}mm;
        display: grid;
        gap: 0.5mm;
        text-align: left;
      }
      .line {
        font-size: 7.6px;
        line-height: 1.12;
        font-weight: 700;
        white-space: normal;
        word-break: break-word;
        overflow: visible;
        color: #111827;
      }
      .media {
        width: 100%;
        position: absolute;
        left: ${LABEL_QR_LEFT_MM}mm;
        top: ${LABEL_QR_TOP_MM}mm;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        gap: 0.4mm;
      }
      .qr {
        width: ${LABEL.qrSizeMm}mm;
        height: ${LABEL.qrSizeMm}mm;
        background: #fff;
        display: block;
      }
      .barcode {
        width: ${LABEL.barcodeWidthMm}mm;
        height: ${LABEL.barcodeHeightMm}mm;
        object-fit: contain;
      }
    `
  }

  function getLabelSheetMarkup(label, qr, barcode = '') {
    return `
      <div class="sheet">
        <div class="code-top">${escapeHtml(label.code)}</div>
        <div class="side-right">${getLabelBodyHtml(label)}</div>
        <div class="media">
          <img class="qr" src="${qr}" alt="QR" />
          ${LABEL_SHOW_BARCODE && barcode ? `<img class="barcode" src="${barcode}" alt="Barcode" />` : ''}
        </div>
      </div>
    `
  }

  async function buildBarcodeDataUrl(value) {
    const { default: JsBarcode } = await loadJsBarcodeLib()
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, value, {
      format: 'CODE39',
      displayValue: false,
      height: 40,
      margin: 0,
    })
    return canvas.toDataURL('image/png')
  }

  async function buildQrLabelDataUrl(qrValue, qrCodeLib) {
    if (!qrValue) return ''
    return qrCodeLib.toDataURL(qrValue, {
      margin: 1,
      width: QR_PRINT_WIDTH_PX,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
  }

  async function renderLabelSheetImageDataUrl(label, qr, barcode = '') {
    const { default: html2canvas } = await loadHtml2CanvasLib()
    const host = document.createElement('div')
    host.style.position = 'fixed'
    host.style.left = '-10000px'
    host.style.top = '0'
    host.style.zIndex = '-1'
    host.style.pointerEvents = 'none'
    host.innerHTML = `
      <style>${getSingleLabelSheetStyles()}</style>
      <div class="label-pdf-root">
        ${getLabelSheetMarkup(label, qr, barcode)}
      </div>
    `
    document.body.appendChild(host)
    try {
      const root = host.querySelector('.label-pdf-root')
      const canvas = await html2canvas(root, {
        backgroundColor: '#ffffff',
        scale: Math.max(3, window.devicePixelRatio || 1),
        useCORS: true,
        logging: false,
      })
      return canvas.toDataURL('image/png')
    } finally {
      host.remove()
    }
  }

  function getRequiredTechnicalSheetQrValue(label) {
    const value = String(label?.technicalSheetUrl || '').trim()
    if (!value) {
      throw new Error(`El activo ${label?.code || ''} no tiene URL de ficha tecnica para QR.`)
    }
    return value
  }

  function getPrintableLabelBatch(items) {
    return (items || [])
      .filter((item) => item?.internalCode)
      .sort((a, b) => Number(a.internalCode || 0) - Number(b.internalCode || 0))
  }

  async function downloadLabelsPdfForBatch(items, filePrefix = 'labels_lote') {
    const batch = getPrintableLabelBatch(items)
    if (!batch.length) return
    const [{ jsPDF }, { default: QRCode }] = await Promise.all([loadJsPdfLib(), loadQrCodeLib()])
    const doc = new jsPDF({ unit: 'mm', format: [LABEL.widthMm, LABEL.heightMm] })
    for (let index = 0; index < batch.length; index += 1) {
      if (index > 0) doc.addPage([LABEL.widthMm, LABEL.heightMm], 'portrait')
      const label = getLabelData(batch[index])
      const qr = await buildQrLabelDataUrl(getRequiredTechnicalSheetQrValue(label), QRCode)
      const barcode = LABEL_SHOW_BARCODE ? await buildBarcodeDataUrl(label.code) : ''
      const imageDataUrl = await renderLabelSheetImageDataUrl(label, qr, barcode)
      doc.addImage(imageDataUrl, 'PNG', 0, 0, LABEL.widthMm, LABEL.heightMm, undefined, 'FAST')
    }
    doc.save(`${filePrefix}_${Date.now()}.pdf`)
  }

  async function downloadLabelPdf() {
    if (!createdAsset?.internalCode) return
    const [{ jsPDF }, { default: QRCode }] = await Promise.all([loadJsPdfLib(), loadQrCodeLib()])
    const label = getLabelData(createdAsset)
    const doc = new jsPDF({ unit: 'mm', format: [LABEL.widthMm, LABEL.heightMm] })
    const qrValue = getRequiredTechnicalSheetQrValue(label)
    let qr = qrCodeUrl
    if (!qr) {
      qr = await buildQrLabelDataUrl(qrValue, QRCode)
    }
    const barcode = LABEL_SHOW_BARCODE ? await buildBarcodeDataUrl(label.code) : ''
    const imageDataUrl = await renderLabelSheetImageDataUrl(label, qr, barcode)
    doc.addImage(imageDataUrl, 'PNG', 0, 0, LABEL.widthMm, LABEL.heightMm, undefined, 'FAST')
    doc.save(`label_${label.code}.pdf`)
  }

  async function openPrintLabel() {
    if (!createdAsset?.internalCode) return
    const { default: QRCode } = await loadQrCodeLib()
    const label = getLabelData(createdAsset)

    const qrValue = getRequiredTechnicalSheetQrValue(label)
    let qr = qrCodeUrl
    if (!qr) {
      qr = await buildQrLabelDataUrl(qrValue, QRCode)
    }
    const barcode = LABEL_SHOW_BARCODE ? await buildBarcodeDataUrl(label.code) : ''

    const win = window.open('', '_blank', 'width=480,height=420')
    if (!win) {
      setErr('El navegador bloqueo la ventana de impresion.')
      return
    }

    const bodyHtml = getLabelBodyHtml(label)

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(label.code)}</title>
  <style>
    @page { size: ${LABEL.widthMm}mm ${LABEL.heightMm}mm; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: ${LABEL.marginMm}mm;
      width: ${LABEL.widthMm}mm;
      height: ${LABEL.heightMm}mm;
      font-family: Arial, "Helvetica Neue", sans-serif;
      color: #0f172a;
    }
    .sheet {
      width: ${LABEL.widthMm - 2 * LABEL.marginMm}mm;
      height: ${LABEL.heightMm - 2 * LABEL.marginMm}mm;
      transform: translate(${LABEL.offsetX}mm, ${LABEL.offsetY}mm);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      text-align: center;
      overflow: hidden;
    }
    .code-top {
      ${(() => {
        const { textLeftX, textWidth } = getLabelLayoutMetrics()
        return `left: ${textLeftX}mm; width: ${textWidth}mm; text-align: left;`
      })()}
      position: absolute;
      top: ${LABEL_CODE_TOP_MM}mm;
      font-weight: 800;
      font-size: 8.6px;
      line-height: 1.1;
      color: #020617;
      letter-spacing: 0;
      white-space: normal;
      word-break: break-word;
    }
    .side-right {
      ${(() => {
        const { textLeftX, textTopY, textWidth } = getLabelLayoutMetrics()
        return `left: ${textLeftX}mm; top: ${textTopY}mm; width: ${textWidth}mm;`
      })()}
      position: absolute;
      display: grid;
      gap: 0.5mm;
      text-align: left;
    }
    .line {
      font-size: 7.6px;
      line-height: 1.12;
      font-weight: 700;
      white-space: normal;
      word-break: break-word;
      overflow: visible;
      color: #111827;
    }
    .media {
      width: 100%;
      position: absolute;
      left: ${LABEL_QR_LEFT_MM}mm;
      top: ${LABEL_QR_TOP_MM}mm;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 0.4mm;
    }
    .qr {
      width: ${LABEL.qrSizeMm}mm;
      height: ${LABEL.qrSizeMm}mm;
      background: #fff;
      display: block;
    }
    .barcode {
      width: ${LABEL.barcodeWidthMm}mm;
      height: ${LABEL.barcodeHeightMm}mm;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="code-top">${escapeHtml(label.code)}</div>
    <div class="side-right">${bodyHtml}</div>
    <div class="media">
      <img class="qr" src="${qr}" alt="QR" />
      ${LABEL_SHOW_BARCODE && barcode ? `<img class="barcode" src="${barcode}" alt="Barcode" />` : ''}
    </div>
  </div>
  <script>
    window.addEventListener('load', () => {
      const imgs = Array.from(document.images);
      let loaded = 0;
      const done = () => { window.print(); setTimeout(() => window.close(), 300); };
      if (!imgs.length) return done();
      imgs.forEach(img => {
        if (img.complete) { loaded++; if (loaded === imgs.length) done(); }
        else img.onload = img.onerror = () => {
          loaded++;
          if (loaded === imgs.length) done();
        };
      });
    });
  </script>
</body>
</html>`
    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  async function openPrintLabelsForBatch(items, title = '') {
    const batch = getPrintableLabelBatch(items)
    if (!batch.length) return
    const win = window.open('', '_blank', 'width=640,height=520')
    if (!win) {
      setErr('El navegador bloqueo la ventana de impresion.')
      return
    }

    const { default: QRCode } = await loadQrCodeLib()
    const sheets = []
    for (const item of batch) {
      const label = getLabelData(item)
      const qr = await buildQrLabelDataUrl(getRequiredTechnicalSheetQrValue(label), QRCode)
      const barcode = LABEL_SHOW_BARCODE ? await buildBarcodeDataUrl(label.code) : ''
      const bodyHtml = getLabelBodyHtml(label)
      sheets.push(`
  <div class="sheet">
    <div class="code-top">${escapeHtml(label.code)}</div>
    <div class="side-right">${bodyHtml}</div>
    <div class="media">
      <img class="qr" src="${qr}" alt="QR" />
      ${LABEL_SHOW_BARCODE && barcode ? `<img class="barcode" src="${barcode}" alt="Barcode" />` : ''}
    </div>
  </div>`)
    }

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title || `Etiquetas lote (${batch.length})`)}</title>
  <style>
    @page { size: ${LABEL.widthMm}mm ${LABEL.heightMm}mm; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, "Helvetica Neue", sans-serif;
      color: #0f172a;
    }
    .sheet {
      width: ${LABEL.widthMm}mm;
      height: ${LABEL.heightMm}mm;
      padding: ${LABEL.marginMm}mm;
      transform: translate(${LABEL.offsetX}mm, ${LABEL.offsetY}mm);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      text-align: center;
      overflow: hidden;
      page-break-after: always;
    }
    .sheet:last-child { page-break-after: auto; }
    .code-top {
      ${(() => {
        const { textLeftX, textWidth } = getLabelLayoutMetrics()
        return `left: ${textLeftX}mm; width: ${textWidth}mm; text-align: left;`
      })()}
      position: absolute;
      top: ${LABEL_CODE_TOP_MM}mm;
      font-weight: 800;
      font-size: 8.6px;
      line-height: 1.1;
      color: #020617;
      letter-spacing: 0;
      white-space: normal;
      word-break: break-word;
    }
    .side-right {
      ${(() => {
        const { textLeftX, textTopY, textWidth } = getLabelLayoutMetrics()
        return `left: ${textLeftX}mm; top: ${textTopY}mm; width: ${textWidth}mm;`
      })()}
      position: absolute;
      display: grid;
      gap: 0.5mm;
      text-align: left;
    }
    .line {
      font-size: 7.6px;
      line-height: 1.12;
      font-weight: 700;
      white-space: normal;
      word-break: break-word;
      overflow: visible;
      color: #111827;
    }
    .media {
      width: 100%;
      position: absolute;
      left: ${LABEL_QR_LEFT_MM}mm;
      top: ${LABEL_QR_TOP_MM}mm;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 0.4mm;
    }
    .qr {
      width: ${LABEL.qrSizeMm}mm;
      height: ${LABEL.qrSizeMm}mm;
      background: #fff;
      display: block;
    }
    .barcode {
      width: ${LABEL.barcodeWidthMm}mm;
      height: ${LABEL.barcodeHeightMm}mm;
      object-fit: contain;
    }
  </style>
</head>
<body>${sheets.join('\n')}
  <script>
    window.addEventListener('load', () => {
      const imgs = Array.from(document.images);
      let loaded = 0;
      const done = () => { window.print(); setTimeout(() => window.close(), 300); };
      if (!imgs.length) return done();
      imgs.forEach(img => {
        if (img.complete) { loaded++; if (loaded === imgs.length) done(); }
        else img.onload = img.onerror = () => {
          loaded++;
          if (loaded === imgs.length) done();
        };
      });
    });
  </script>
</body>
</html>`
    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  async function openPrintBatchLabels() {
    return openPrintLabelsForBatch(createdAssetBatch)
  }

  async function fetchAssetListBatchForLabels() {
    const total = Number(assetListTotal || assetsList.length || 0)
    if (!total) return []
    if (total > 1000) {
      throw new Error('Hay demasiados activos para imprimir de una vez. Filtra a 1000 o menos.')
    }
    const params = new URLSearchParams()
    const safeId = toPositiveIntOrNull(assetListFilters.id)
    if (assetListFilters.id && !safeId) {
      throw new Error('Filtro ID invalido. Usa solo numeros positivos.')
    }
    if (safeId) params.set('id', String(safeId))
    if (assetListFilters.internalCode) params.set('internalCode', assetListFilters.internalCode)
    if (assetListFilters.q) params.set('q', assetListFilters.q)
    if (assetListFilters.responsibleName) {
      params.set('responsibleName', assetListFilters.responsibleName)
    }
    if (assetListFilters.costCenter) params.set('costCenter', assetListFilters.costCenter)
    if (assetListFilters.institutionId) params.set('institutionId', assetListFilters.institutionId)
    if (assetListFilters.establishmentId) {
      params.set('establishmentId', assetListFilters.establishmentId)
    }
    if (assetListFilters.dependencyId) params.set('dependencyId', assetListFilters.dependencyId)
    if (assetListFilters.assetStateId) params.set('assetStateId', assetListFilters.assetStateId)
    if (assetListFilters.includeDeleted) params.set('includeDeleted', 'true')
    if (assetListFilters.fromDate) params.set('fromDate', assetListFilters.fromDate)
    if (assetListFilters.toDate) params.set('toDate', assetListFilters.toDate)
    params.set('take', String(total))
    params.set('skip', '0')
    params.set('withCount', 'false')
    const data = await api(`/assets?${params.toString()}`)
    return data.items || []
  }

  async function openPrintAssetListLabels() {
    try {
      const items = await fetchAssetListBatchForLabels()
      if (!items.length) {
        setErr('No hay activos fijos filtrados para imprimir QR.')
        return
      }
      await openPrintLabelsForBatch(items, `Etiquetas activos (${items.length})`)
    } catch (err) {
      setErr(err)
    }
  }

  function toggleSelectedAsset(assetId) {
    const safeId = toPositiveIntOrNull(assetId)
    if (!safeId) return
    setSelectedAssetIds((prev) =>
      prev.includes(safeId) ? prev.filter((id) => id !== safeId) : [...prev, safeId]
    )
  }

  function toggleSelectAllVisibleAssets() {
    const visibleIds = (assetsList || [])
      .map((asset) => toPositiveIntOrNull(asset.id))
      .filter(Boolean)
    if (!visibleIds.length) return
    setSelectedAssetIds((prev) => {
      const allSelected = visibleIds.every((id) => prev.includes(id))
      if (allSelected) {
        return prev.filter((id) => !visibleIds.includes(id))
      }
      const next = new Set(prev)
      visibleIds.forEach((id) => next.add(id))
      return Array.from(next)
    })
  }

  function clearSelectedAssets() {
    setSelectedAssetIds([])
  }

  async function openPrintSelectedAssetLabels() {
    try {
      const selectedItems = (assetsList || []).filter((asset) =>
        selectedAssetIds.includes(toPositiveIntOrNull(asset.id))
      )
      if (!selectedItems.length) {
        setErr('Selecciona al menos un activo fijo visible para imprimir QR.')
        return
      }
      await openPrintLabelsForBatch(
        selectedItems,
        `Etiquetas seleccionadas (${selectedItems.length})`
      )
    } catch (err) {
      setErr(err)
    }
  }

  async function openPrintPlanchetaLabels() {
    try {
      const items = getPrintableLabelBatch(planchetaPreview)
      if (!items.length) {
        setErr('Previsualiza planchetas con activos antes de imprimir QR.')
        return
      }
      await openPrintLabelsForBatch(items, `Etiquetas plancheta (${items.length})`)
    } catch (err) {
      setErr(err)
    }
  }

  function normalizeScannedAssetReference(rawValue) {
    const raw = String(rawValue || '').trim()
    if (!raw) return null
    const absolutePublicUrlMatch = raw.match(
      /^https?:\/\/[^/\s]+\/(?:api\/)?assets\/public\/(\d+)\/(?:ficha\.html|technical-sheet)/i
    )
    if (absolutePublicUrlMatch?.[1]) {
      return {
        kind: 'assetId',
        assetId: Number(absolutePublicUrlMatch[1]),
        internalCode: null,
        publicUrl: buildAssetTechnicalSheetUrl({ id: Number(absolutePublicUrlMatch[1]) }),
      }
    }
    const htmlPathMatch = raw.match(/\/assets\/public\/(\d+)\/ficha\.html/i)
    if (htmlPathMatch?.[1]) {
      return {
        kind: 'assetId',
        assetId: Number(htmlPathMatch[1]),
        internalCode: null,
        publicUrl: buildAssetTechnicalSheetUrl({ id: Number(htmlPathMatch[1]) }),
      }
    }
    const pathMatch = raw.match(/\/assets\/public\/(\d+)\/technical-sheet/i)
    if (pathMatch?.[1]) {
      return {
        kind: 'assetId',
        assetId: Number(pathMatch[1]),
        internalCode: null,
        publicUrl: buildAssetTechnicalSheetUrl({ id: Number(pathMatch[1]) }),
      }
    }
    const queryId = raw.match(/[?&]assetId=(\d{1,12})/i)
    if (queryId?.[1]) {
      return {
        kind: 'assetId',
        assetId: Number(queryId[1]),
        internalCode: null,
        publicUrl: null,
      }
    }
    const direct = Number(raw)
    if (Number.isFinite(direct) && direct > 0) {
      return {
        kind: 'internalCode',
        internalCode: Math.trunc(direct),
        assetId: null,
        publicUrl: null,
      }
    }
    const invMatch = raw.match(/INV[-_\s]?(\d{1,12})/i)
    if (invMatch?.[1]) {
      return {
        kind: 'internalCode',
        internalCode: Number(invMatch[1]),
        assetId: null,
        publicUrl: null,
      }
    }
    const anyDigits = raw.match(/(\d{1,12})/)
    if (anyDigits?.[1]) {
      return {
        kind: 'internalCode',
        internalCode: Number(anyDigits[1]),
        assetId: null,
        publicUrl: null,
      }
    }
    return null
  }

  async function getAssetByScanReference(reference) {
    if (!reference) return null
    if (reference.assetId) {
      try {
        return await api(`/assets/${reference.assetId}`)
      } catch (err) {
        if (err?.status === 404) return null
        throw err
      }
    }
    if (reference.internalCode) {
      const params = new URLSearchParams()
      params.set('internalCode', String(reference.internalCode))
      params.set('take', '1')
      params.set('skip', '0')
      params.set('withCount', 'false')
      const data = await api(`/assets?${params.toString()}`)
      return (data.items || [])[0] || null
    }
    return null
  }

  function openAssetModal(asset) {
    selectAssetForModal(asset)
  }

  async function resolveScannedAsset() {
    const reference = normalizeScannedAssetReference(scanInput)
    if (!reference) {
      setScanResult({
        status: 'error',
        message: 'Ingresa o escanea un codigo QR valido para continuar.',
      })
      return
    }
    try {
      setScanResult(null)
      const asset = await getAssetByScanReference(reference)
      if (!asset) {
        setScanResult({
          status: 'error',
          message:
            reference.kind === 'internalCode'
              ? 'No se encontro un activo fijo para el codigo interno ingresado.'
              : 'No se encontro un activo fijo para el QR escaneado.',
        })
        return
      }
      openAssetModal(asset, { focusTechnicalSheet: true })
      setOk(`Activo fijo cargado desde QR: INV-${asset.internalCode}`)
      setScanResult({
        status: 'ok',
        message: `Activo fijo encontrado: INV-${asset.internalCode}`,
      })
    } catch (error) {
      setScanResult({
        status: 'error',
        message: getErrorMessage(error, 'No se pudo resolver el codigo QR escaneado.'),
      })
    }
  }

  function copyTechnicalSheetLink() {
    const technicalSheetUrl =
      createdLabel?.technicalSheetUrl || labelData?.technicalSheetUrl || ''
    if (!technicalSheetUrl) {
      setErr('No hay ficha tecnica disponible para copiar.')
      return
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard
        .writeText(technicalSheetUrl)
        .then(() => setOk('Enlace de ficha tecnica copiado al portapapeles.'))
        .catch(() => setErr('Tu navegador no permite copiar al portapapeles en este contexto.'))
      return
    }
    setErr('Tu navegador no permite copiar al portapapeles en este contexto.')
  }

  useEffect(() => {
    if (!createdAsset?.internalCode) {
      setQrCodeUrl('')
      return
    }
    const barcodeValue = `INV-${createdAsset.internalCode}`
    const qrValue = buildAssetTechnicalSheetUrl(createdAsset) || barcodeValue
    let cancelled = false

    Promise.all([loadQrCodeLib(), loadJsBarcodeLib()])
      .then(([qrModule, barcodeModule]) => {
        if (cancelled) return
        qrModule.default
          .toDataURL(qrValue, { margin: 1, width: 180 })
          .then((url) => {
            if (!cancelled) setQrCodeUrl(url)
          })
          .catch(() => {
            if (!cancelled) setQrCodeUrl('')
          })
        const element = document.getElementById('barcode-preview')
        if (element) {
          try {
            barcodeModule.default(element, barcodeValue, {
              format: 'CODE128',
              displayValue: true,
              height: 48,
              margin: 0,
            })
          } catch {
            // ignore barcode errors
          }
        }
      })
      .catch(() => {
        if (!cancelled) setQrCodeUrl('')
      })

    return () => {
      cancelled = true
    }
  }, [createdAsset, loadJsBarcodeLib, loadQrCodeLib, setQrCodeUrl])

  const labelData = createdAsset ? getLabelData(createdAsset) : null
  const createdLabel = createdAsset ? getLabelData(createdAsset) : null

  return {
    labelData,
    createdLabel,
    downloadLabelPdf,
    openPrintLabel,
    openPrintBatchLabels,
    openPrintAssetListLabels,
    toggleSelectedAsset,
    toggleSelectAllVisibleAssets,
    clearSelectedAssets,
    openPrintSelectedAssetLabels,
    openPrintPlanchetaLabels,
    resolveScannedAsset,
    copyTechnicalSheetLink,
  }
}

export default useAssetLabelsAndScan
