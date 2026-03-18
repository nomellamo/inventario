function PlanchetasSection(props) {
  const {
    canPreviewPlancheta,
    canExportPlancheta,
    loadPlanchetaPreview,
    downloadPlancheta,
    planchetaPreviewLoading,
    planchetaQuery,
    planchetaPreview,
    planchetaFilters,
    planchetaInsights,
    setPlanchetaFilters,
    loadPlanchetaEstablishments,
    setPlanchetaEstablishments,
    setPlanchetaDependencies,
    loadingPlancheta,
    planchetaInstitutions,
    planchetaEstablishments,
    loadPlanchetaDependencies,
    planchetaDependencies,
    planchetaMessage,
    planchetaSummary,
    formatPlanchetaMovement,
    openPrintPlanchetaLabels,
  } = props

  return (
    <div className="section module-section module-section-planchetas">
      <div className="section-head">
        <h3>Planchetas</h3>
        <div className="actions">
          <button className="ghost" disabled={!canPreviewPlancheta} onClick={loadPlanchetaPreview}>
            Previsualizar
          </button>
          <button
            className="ghost"
            disabled={!canExportPlancheta}
            title={!canExportPlancheta ? 'Previsualiza con datos antes de exportar.' : ''}
            onClick={() => downloadPlancheta('excel', 'formal')}
          >
            Excel Formal
          </button>
          <button
            className="ghost"
            disabled={!canExportPlancheta}
            title={!canExportPlancheta ? 'Previsualiza con datos antes de exportar.' : ''}
            onClick={() => downloadPlancheta('pdf', 'formal')}
          >
            PDF Formal
          </button>
          <button
            className="ghost"
            disabled={!canExportPlancheta}
            title={!canExportPlancheta ? 'Previsualiza con datos antes de exportar.' : ''}
            onClick={() => downloadPlancheta('excel', 'gerencial')}
          >
            Excel Gerencial
          </button>
          <button
            className="ghost"
            disabled={!canExportPlancheta}
            title={!canExportPlancheta ? 'Previsualiza con datos antes de exportar.' : ''}
            onClick={() => downloadPlancheta('pdf', 'gerencial')}
          >
            PDF Gerencial
          </button>
          <button
            className="ghost"
            disabled={!canExportPlancheta}
            title={!canExportPlancheta ? 'Previsualiza con datos antes de exportar.' : ''}
            onClick={openPrintPlanchetaLabels}
          >
            Imprimir QR
          </button>
        </div>
      </div>
      {!planchetaPreviewLoading && planchetaQuery && !planchetaPreview.length && (
        <p className="muted">Previsualiza primero. Si no hay filas, la exportación queda bloqueada.</p>
      )}
      <div className="split">
        <div className="form-card">
          <h4>Filtros</h4>
          <div className="select-wrap">
            <label>Institución</label>
            <select
              value={planchetaFilters.institutionId}
              onChange={(e) => {
                const value = e.target.value
                setPlanchetaFilters((prev) => ({
                  ...prev,
                  institutionId: value,
                  establishmentId: '',
                  dependencyId: '',
                }))
                if (value) loadPlanchetaEstablishments(value)
                else setPlanchetaEstablishments([])
                setPlanchetaDependencies([])
              }}
              disabled={loadingPlancheta}
            >
              <option value="">Selecciona institución</option>
              {planchetaInstitutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>
          <div className="select-wrap">
            <label>Establecimiento</label>
            <select
              value={planchetaFilters.establishmentId}
              onChange={(e) => {
                const value = e.target.value
                setPlanchetaFilters((prev) => ({
                  ...prev,
                  establishmentId: value,
                  dependencyId: '',
                }))
                if (value) loadPlanchetaDependencies(value)
                else setPlanchetaDependencies([])
              }}
              disabled={loadingPlancheta || !planchetaFilters.institutionId}
            >
              <option value="">Selecciona establecimiento</option>
              {planchetaEstablishments.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.name}
                </option>
              ))}
            </select>
          </div>
          <div className="select-wrap">
            <label>Dependencia (opcional)</label>
            <select
              value={planchetaFilters.dependencyId}
              onChange={(e) =>
                setPlanchetaFilters((prev) => ({
                  ...prev,
                  dependencyId: e.target.value,
                }))
              }
              disabled={loadingPlancheta || !planchetaFilters.establishmentId}
            >
              <option value="">Todas</option>
              {planchetaDependencies.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {dep.name}
                </option>
              ))}
            </select>
          </div>
          <p className="muted">Si no eliges dependencia, la plancheta se genera por establecimiento.</p>
          <div className="split">
            <div className="select-wrap">
              <label>Fecha de adquisición desde (opcional)</label>
              <input
                type="date"
                value={planchetaFilters.fromDate}
                onChange={(e) =>
                  setPlanchetaFilters((prev) => ({
                    ...prev,
                    fromDate: e.target.value,
                  }))
                }
              />
            </div>
            <div className="select-wrap">
              <label>Fecha de adquisición hasta (opcional)</label>
              <input
                type="date"
                value={planchetaFilters.toDate}
                onChange={(e) =>
                  setPlanchetaFilters((prev) => ({
                    ...prev,
                    toDate: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="select-wrap">
            <label>Encargado de dependencia (firma)</label>
            <input
              value={planchetaFilters.responsibleName}
              onChange={(e) =>
                setPlanchetaFilters((prev) => ({
                  ...prev,
                  responsibleName: e.target.value,
                }))
              }
              placeholder="Nombre encargado"
            />
          </div>
          <div className="select-wrap">
            <label>Jefe de dependencia (firma)</label>
            <input
              value={planchetaFilters.chiefName}
              onChange={(e) =>
                setPlanchetaFilters((prev) => ({
                  ...prev,
                  chiefName: e.target.value,
                }))
              }
              placeholder="Nombre jefe"
            />
          </div>
          <div className="select-wrap">
            <label>Texto ministerial</label>
            <textarea
              rows={4}
              value={planchetaFilters.ministryText}
              onChange={(e) =>
                setPlanchetaFilters((prev) => ({
                  ...prev,
                  ministryText: e.target.value,
                }))
              }
            />
          </div>
          <label className="muted">
            <input
              type="checkbox"
              checked={planchetaFilters.includeHistory}
              onChange={(e) =>
                setPlanchetaFilters((prev) => ({
                  ...prev,
                  includeHistory: e.target.checked,
                }))
              }
            />{' '}
            Incluir historial reciente por activo fijo
          </label>
        </div>
      </div>
      {planchetaPreviewLoading && <p className="muted">Cargando plancheta...</p>}
      {!planchetaPreviewLoading && planchetaMessage && <p className="muted">{planchetaMessage}</p>}
      {!planchetaPreviewLoading && planchetaInsights && (
        <div className="table">
          <div className="table-head">
            <h4>Resumen de bajas</h4>
            <span className="muted">Se usa el mismo alcance de la plancheta</span>
          </div>
          <div className="row">
            <div>
              <strong>{`Ultimos 7 dias: ${planchetaInsights.weekly?.count || 0} registros / ${
                planchetaInsights.weekly?.units || 0
              } bienes`}</strong>
              <div className="muted">{`Ultimos 30 dias: ${planchetaInsights.monthly?.count || 0} registros / ${
                planchetaInsights.monthly?.units || 0
              } bienes`}</div>
            </div>
          </div>
          {!!planchetaInsights.stateOverview?.length && (
            <div className="row">
              <div>
                <strong>Estados actuales (incluye dados de baja)</strong>
                <div className="muted">
                  {planchetaInsights.stateOverview
                    .slice(0, 5)
                    .map((row) => `${row.label}: ${row.count}`)
                    .join(' | ')}
                </div>
              </div>
            </div>
          )}
          {!!planchetaInsights.monthly?.items?.length && (
            <div className="row">
              <div>
                <strong>Bajas recientes</strong>
                <div className="muted">
                  {planchetaInsights.monthly.items
                    .slice(0, 4)
                    .map(
                      (item) =>
                        `INV-${item.internalCode} ${item.name} (${item.dependencyName || 'Sin dependencia'})`
                    )
                    .join(' | ')}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {!planchetaPreviewLoading && planchetaSummary.length > 0 && (
        <div className="table">
          <div className="table-head">
            <h4>Resumen por dependencia y producto</h4>
            <span className="muted">Vista resumida (hasta 100 filas)</span>
          </div>
          {planchetaSummary.slice(0, 100).map((row, idx) => (
            <div
              key={`plancheta-summary-${row.dependencyId}-${row.productName}-${idx}`}
              className="row"
            >
              <div>
                <strong>{row.dependencyName || 'Sin dependencia'}</strong>
                <div className="muted">Producto: {row.productName || 'Sin nombre'}</div>
                <div className="muted">Categoría: {row.category || 'Sin categoría'}</div>
              </div>
              <div className="muted">
                Marca: {row.brand || '-'} | Modelo: {row.modelName || '-'} | Cantidad total:{' '}
                {row.quantity}
              </div>
            </div>
          ))}
        </div>
      )}
      {!planchetaPreviewLoading && planchetaPreview.length > 0 && (
        <div className="table">
          <div className="table-head">
            <h4>Detalle de activos (muestra)</h4>
            <span className="muted">Vista de control (hasta 20 filas)</span>
          </div>
          {planchetaPreview.slice(0, 20).map((item) => (
            <div key={item.id} className="row">
              <div>
                <strong>INV-{item.internalCode}</strong> | {item.name}
                <div className="muted">
                  Marca: {item.brand || '-'} | Modelo: {item.modelName || '-'}
                </div>
              </div>
              <div className="muted">
                Dependencia: {item.dependency?.name || '-'} | Estado: {item.assetState?.name || '-'}
              </div>
              <div className="muted">
                Cantidad: {item.quantity ?? 1} | Responsable: {item.responsibleName || 'Sin asignar'}
                {' | '}RUT: {item.responsibleRut || '-'} | Cargo: {item.responsibleRole || '-'}
                {' | '}CC: {item.costCenter || '-'}
              </div>
              <div className="muted">
                Valor adq: $
                {Number(item.acquisitionValue || 0).toLocaleString('es-CL', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
                {' | '}Deprec. anual: $
                {Number(item.depreciationAnnualValue || 0).toLocaleString('es-CL', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
                {' | '}Vida útil: {item.usefulLifeYears || '-'} años
              </div>
              {planchetaFilters.includeHistory && (
                <div className="muted">
                  Historial reciente:{' '}
                  {(item.movements || []).map(formatPlanchetaMovement).join(' | ') ||
                    'Sin movimientos'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PlanchetasSection
