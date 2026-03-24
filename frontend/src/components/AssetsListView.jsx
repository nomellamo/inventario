import { UI_TEXT } from '../constants/uiText'

function AssetCatalogTable(props) {
  const {
    showAssetCatalogList,
    setShowAssetCatalogList,
    assetCatalogItems,
    applyCatalogItem,
    formatCatalogItemDisplay,
  } = props

  return (
    <div className="table">
      <div className="table-head">
        <h4>{UI_TEXT.catalogAvailable}</h4>
        <div className="actions">
          <span className="muted">Mostrando {assetCatalogItems.length}</span>
          <button
            className="ghost"
            type="button"
            onClick={() => setShowAssetCatalogList((prev) => !prev)}
          >
            {showAssetCatalogList ? UI_TEXT.hideCatalog : UI_TEXT.showCatalog}
          </button>
        </div>
      </div>
      {showAssetCatalogList ? (
        <>
          {assetCatalogItems.map((item) => (
            <div key={item.id} className="row clickable" onClick={() => applyCatalogItem(item)}>
              <div>
                <strong>{formatCatalogItemDisplay(item)}</strong>
                <span className="muted"> - {item.category}</span>
              </div>
              <div className="row-actions">
                <button className="ghost" onClick={() => applyCatalogItem(item)}>
                  Usar
                </button>
              </div>
            </div>
          ))}
          {!assetCatalogItems.length && <p className="muted">{`Sin ${UI_TEXT.itemPlural}.`}</p>}
        </>
      ) : (
        <p className="muted">{UI_TEXT.catalogHidden}</p>
      )}
    </div>
  )
}

function AssetRecordsTable(props) {
  const {
    assetsLoading,
    assetsList,
    assetListFilters,
    setAssetListFilters,
    institutionsCatalog,
    assetListEstablishments,
    loadAssetListDependencies,
    assetListDependencies,
    assetStates,
    loadAssetsList,
    selectedAssetIds,
    toggleSelectedAsset,
    toggleSelectAllVisibleAssets,
    clearSelectedAssets,
    openPrintSelectedAssetLabels,
    openPrintAssetListLabels,
    toPositiveIntOrNull,
    downloadFile,
    assetListPage,
    assetListTotal,
    selectAssetForModal,
    isCentral,
  } = props
  const visibleIds = assetsList
    .map((asset) => toPositiveIntOrNull(asset.id))
    .filter(Boolean)
  const selectedVisibleCount = visibleIds.filter((id) => selectedAssetIds.includes(id)).length
  const allVisibleSelected = Boolean(visibleIds.length) && selectedVisibleCount === visibleIds.length

  return (
    <div className="table">
      <div className="table-head">
        <h4>Activos fijos creados</h4>
        <span className="muted">
          {assetsLoading ? UI_TEXT.loading : `Mostrando ${assetsList.length} de ${assetListTotal}`}
        </span>
      </div>
      <div className="row">
        <div className="actions">
          <input
            placeholder="ID"
            value={assetListFilters.id}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, '')
              setAssetListFilters((p) => ({ ...p, id: digitsOnly }))
            }}
            className="inline-input small"
          />
          <input
            placeholder={UI_TEXT.codeInternal}
            value={assetListFilters.internalCode}
            onChange={(e) => setAssetListFilters((p) => ({ ...p, internalCode: e.target.value }))}
            className="inline-input small"
          />
          <input
            placeholder={`Buscar por ${UI_TEXT.code.toLowerCase()} o nombre...`}
            value={assetListFilters.q}
            onChange={(e) => setAssetListFilters((p) => ({ ...p, q: e.target.value }))}
          />
          <input
            placeholder="Responsable"
            value={assetListFilters.responsibleName}
            onChange={(e) => setAssetListFilters((p) => ({ ...p, responsibleName: e.target.value }))}
          />
          <input
            placeholder="Centro costo"
            value={assetListFilters.costCenter}
            onChange={(e) => setAssetListFilters((p) => ({ ...p, costCenter: e.target.value }))}
          />
          <input
            type="date"
            value={assetListFilters.fromDate}
            onChange={(e) => setAssetListFilters((p) => ({ ...p, fromDate: e.target.value }))}
          />
          <input
            type="date"
            value={assetListFilters.toDate}
            onChange={(e) => setAssetListFilters((p) => ({ ...p, toDate: e.target.value }))}
          />
          <label className="inline-check">
            <input
              type="checkbox"
              checked={assetListFilters.includeDeleted}
              onChange={(e) =>
                setAssetListFilters((p) => ({
                  ...p,
                  includeDeleted: e.target.checked,
                }))
              }
            />
            Mostrar activos dados de baja
          </label>
          <select
            value={assetListFilters.institutionId}
            onChange={(e) => {
              const value = e.target.value
              setAssetListFilters((p) => ({
                ...p,
                institutionId: value,
                establishmentId: '',
                dependencyId: '',
              }))
            }}
          >
            <option value="">{UI_TEXT.institution}</option>
            {institutionsCatalog.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
              </option>
            ))}
          </select>
          <select
            value={assetListFilters.establishmentId}
            onChange={(e) => {
              const value = e.target.value
              setAssetListFilters((p) => ({
                ...p,
                establishmentId: value,
                dependencyId: '',
              }))
              if (value) loadAssetListDependencies(value)
            }}
          >
            <option value="">Establecimiento</option>
            {assetListEstablishments.map((est) => (
              <option key={est.id} value={est.id}>
                {est.name}
              </option>
            ))}
          </select>
          <select
            value={assetListFilters.dependencyId}
            onChange={(e) => setAssetListFilters((p) => ({ ...p, dependencyId: e.target.value }))}
            disabled={!assetListFilters.establishmentId}
          >
            <option value="">Sector</option>
            {assetListDependencies.map((dep) => (
              <option key={dep.id} value={dep.id}>
                {dep.name}
              </option>
            ))}
          </select>
          <select
            value={assetListFilters.assetStateId}
            onChange={(e) => setAssetListFilters((p) => ({ ...p, assetStateId: e.target.value }))}
          >
            <option value="">Estado</option>
            {assetStates.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
          <button className="ghost" onClick={loadAssetsList}>
            {UI_TEXT.updating}
          </button>
          <button
            className="ghost"
            onClick={() =>
              setAssetListFilters({
                id: '',
                internalCode: '',
                q: '',
                responsibleName: '',
                costCenter: '',
                institutionId: '',
                establishmentId: '',
                dependencyId: '',
                assetStateId: '',
                includeDeleted: false,
                fromDate: '',
                toDate: '',
              })
            }
          >
            {UI_TEXT.clear}
          </button>
          <button
            className="ghost"
            disabled={assetsLoading || !assetListTotal}
            onClick={openPrintAssetListLabels}
          >
            Imprimir etiquetas QR masivo
          </button>
          <button
            className="ghost"
            disabled={!selectedVisibleCount}
            onClick={openPrintSelectedAssetLabels}
          >
            Imprimir etiquetas QR seleccionados
          </button>
          <button
            className="ghost"
            onClick={() => {
              const params = new URLSearchParams()
              const safeId = toPositiveIntOrNull(assetListFilters.id)
              if (safeId) params.set('id', String(safeId))
              if (assetListFilters.internalCode) params.set('internalCode', assetListFilters.internalCode)
              if (assetListFilters.q) params.set('q', assetListFilters.q)
              if (assetListFilters.responsibleName) params.set('responsibleName', assetListFilters.responsibleName)
              if (assetListFilters.costCenter) params.set('costCenter', assetListFilters.costCenter)
              if (assetListFilters.institutionId) params.set('institutionId', assetListFilters.institutionId)
              if (assetListFilters.establishmentId) params.set('establishmentId', assetListFilters.establishmentId)
              if (assetListFilters.dependencyId) params.set('dependencyId', assetListFilters.dependencyId)
              if (assetListFilters.assetStateId) params.set('assetStateId', assetListFilters.assetStateId)
              if (assetListFilters.includeDeleted) params.set('includeDeleted', 'true')
              if (assetListFilters.fromDate) params.set('fromDate', assetListFilters.fromDate)
              if (assetListFilters.toDate) params.set('toDate', assetListFilters.toDate)
              const qs = params.toString()
              downloadFile(`/assets/export/excel${qs ? `?${qs}` : ''}`, 'assets_filtrados.xlsx')
            }}
          >
            Exportar todo en Excel
          </button>
          <button
            className="ghost"
            onClick={() => {
              const params = new URLSearchParams()
              const safeId = toPositiveIntOrNull(assetListFilters.id)
              if (safeId) params.set('id', String(safeId))
              if (assetListFilters.internalCode) params.set('internalCode', assetListFilters.internalCode)
              if (assetListFilters.q) params.set('q', assetListFilters.q)
              if (assetListFilters.responsibleName) params.set('responsibleName', assetListFilters.responsibleName)
              if (assetListFilters.costCenter) params.set('costCenter', assetListFilters.costCenter)
              if (assetListFilters.institutionId) params.set('institutionId', assetListFilters.institutionId)
              if (assetListFilters.establishmentId) params.set('establishmentId', assetListFilters.establishmentId)
              if (assetListFilters.dependencyId) params.set('dependencyId', assetListFilters.dependencyId)
              if (assetListFilters.assetStateId) params.set('assetStateId', assetListFilters.assetStateId)
              if (assetListFilters.includeDeleted) params.set('includeDeleted', 'true')
              if (assetListFilters.fromDate) params.set('fromDate', assetListFilters.fromDate)
              if (assetListFilters.toDate) params.set('toDate', assetListFilters.toDate)
              const qs = params.toString()
              downloadFile(`/assets/export/pdf${qs ? `?${qs}` : ''}`, 'assets_filtrados.pdf')
            }}
          >
            Exportar todo en PDF
          </button>
        </div>
      </div>
      <p className="muted">
        Las exportaciones incluyen todos los activos filtrados, no solo los de esta página.
      </p>
      <div className="row">
        <div className="actions">
          <label className="inline-check">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisibleAssets}
              disabled={!visibleIds.length}
            />
            Seleccionar página visible
          </label>
          <span className="muted">Seleccionados en esta página: {selectedVisibleCount}</span>
          <button className="ghost" onClick={clearSelectedAssets} disabled={!selectedAssetIds.length}>
            Limpiar selección
          </button>
        </div>
      </div>

      {assetsList.map((asset, idx) => (
        <div key={asset.id} className="row">
          <div className="row-main">
            <label className="inline-check">
              <input
                type="checkbox"
                checked={selectedAssetIds.includes(toPositiveIntOrNull(asset.id))}
                onChange={() => toggleSelectedAsset(asset.id)}
              />
              Sel.
            </label>
            <strong>#{(assetListPage - 1) * 20 + idx + 1}</strong>
            <span className="pill">ID real: {asset.id}</span>
            <span className="pill">INV-{asset.internalCode}</span>
            <span>{asset.name}</span>
            <span className="pill">Cant: {asset.quantity ?? 1}</span>
            {asset.assetState?.name && (
              <span
                className={
                  asset.isDeleted || asset.assetState.name === 'BAJA' ? 'pill danger-pill' : 'pill'
                }
              >
                {asset.assetState.name}
              </span>
            )}
            {asset.dependency?.name && <span className="pill">{asset.dependency.name}</span>}
            {asset.responsibleName && <span className="pill">Resp: {asset.responsibleName}</span>}
            {asset.responsibleRut && <span className="pill">RUT: {asset.responsibleRut}</span>}
            {asset.responsibleRole && <span className="pill">Cargo: {asset.responsibleRole}</span>}
            {asset.costCenter && <span className="pill">CC: {asset.costCenter}</span>}
          </div>
          <div className="row-actions">
            <button className="ghost" onClick={() => selectAssetForModal(asset)}>
              Ver
            </button>
            <button className="ghost" onClick={() => selectAssetForModal(asset, 'edit')}>
              Editar
            </button>
            <button className="ghost" onClick={() => selectAssetForModal(asset, 'move')}>
              Mover
            </button>
            <button
              className="ghost"
              disabled={!isCentral || asset.isDeleted || asset.assetState?.name === 'BAJA'}
              onClick={() => selectAssetForModal(asset, 'transfer')}
            >
              Transferir
            </button>
            <button
              className="danger"
              disabled={asset.isDeleted || asset.assetState?.name === 'BAJA'}
              title={
                asset.isDeleted || asset.assetState?.name === 'BAJA'
                  ? 'Este activo ya está en baja. Revísalo en Basurero para restaurar o eliminar forzado.'
                  : 'Dar de baja'
              }
              onClick={() => selectAssetForModal(asset, 'status')}
            >
              {asset.isDeleted || asset.assetState?.name === 'BAJA' ? 'Ya en baja' : 'Dar de baja'}
            </button>
          </div>
        </div>
      ))}

      {!assetsList.length && !assetsLoading && (
        <div className="row">
          <div>
            <strong>Sin activos fijos para los filtros actuales.</strong>
            <p className="muted">
              Limpia los filtros, importa una matriz desde Importaciones o usa la exportación masiva
              cuando ya existan registros.
            </p>
          </div>
        </div>
      )}

      <div className="pagination">
        <button
          className="ghost"
          disabled={assetListPage <= 1}
          onClick={() => loadAssetsList(assetListPage - 1)}
        >
          {UI_TEXT.previous}
        </button>
        <span className="muted">
          {UI_TEXT.page} {assetListPage} / {Math.max(1, Math.ceil(assetListTotal / 20))}
        </span>
        <button
          className="ghost"
          disabled={assetListPage >= Math.ceil(assetListTotal / 20)}
          onClick={() => loadAssetsList(assetListPage + 1)}
        >
          {UI_TEXT.next}
        </button>
      </div>
    </div>
  )
}

function AssetsListView(props) {
  return (
    <>
      <AssetCatalogTable {...props} />
      <AssetRecordsTable {...props} />
    </>
  )
}

export default AssetsListView
