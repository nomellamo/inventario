import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import logoInventacore from './assets/images/logo-inventacore.png'
import './App.css'

function App() {
  const API_BASE = import.meta.env.VITE_API_BASE || '/api'
  const STORAGE_KEY = 'admin_panel_prefs'
  const CATALOG_ADMIN_TAKE = 20
  const MAX_TAKE = 100
  const IMPORT_REQUIRED = [
    'establishmentId',
    'dependencyId',
    'assetStateId',
    'assetTypeId',
    'Nombre',
    'Cuenta Contable',
    'Analítico',
    'Valor Adquisición',
    'Fecha Adquisición',
  ]
  const [token, setToken] = useState(() => localStorage.getItem('admin_token') || '')
  const [currentUser, setCurrentUser] = useState(() => {
    const raw = localStorage.getItem('admin_user')
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  })
  const [login, setLogin] = useState({
    email: 'admin@cordillera.local',
    password: 'admin123',
  })
  const [status, setStatus] = useState({
    type: 'idle',
    message: '',
    code: null,
    requestId: null,
    details: null,
  })
  const [statusCopyFeedback, setStatusCopyFeedback] = useState('')
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [formErrors, setFormErrors] = useState({})
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
  })
  const [forceDeleteState, setForceDeleteState] = useState({
    open: false,
    entityType: '',
    entityId: null,
    entityLabel: '',
    summary: null,
    confirmationText: '',
    expectedConfirmationText: 'ELIMINAR DEFINITIVO',
    loading: false,
    deleting: false,
  })
  const [activeTab, setActiveTab] = useState('institutions')
  const [importsView, setImportsView] = useState('assets')

  const [institutions, setInstitutions] = useState([])
  const [institutionsCatalog, setInstitutionsCatalog] = useState([])
  const [loadingInstitutions, setLoadingInstitutions] = useState(false)
  const [instQuery, setInstQuery] = useState('')
  const [instForm, setInstForm] = useState({ name: '' })
  const [instPage, setInstPage] = useState(1)
  const [instTotal, setInstTotal] = useState(0)
  const [instOriginal, setInstOriginal] = useState({})
  const [instSort, setInstSort] = useState({ key: 'name', order: 'asc' })
  const [instIncludeInactive, setInstIncludeInactive] = useState(true)

  const [establishments, setEstablishments] = useState([])
  const [establishmentsCatalog, setEstablishmentsCatalog] = useState([])
  const [loadingEstablishments, setLoadingEstablishments] = useState(false)
  const [estFilters, setEstFilters] = useState({ q: '', institutionId: '', institutionSearch: '' })
  const [estForm, setEstForm] = useState({ name: '', type: '', rbd: '', commune: '', institutionId: '' })
  const [estPage, setEstPage] = useState(1)
  const [estTotal, setEstTotal] = useState(0)
  const [estOriginal, setEstOriginal] = useState({})
  const [estSort, setEstSort] = useState({ key: 'name', order: 'asc' })
  const [estIncludeInactive, setEstIncludeInactive] = useState(true)

  const [dependencies, setDependencies] = useState([])
  const [dependenciesCatalog, setDependenciesCatalog] = useState([])
  const [loadingDependencies, setLoadingDependencies] = useState(false)
  const [depFilters, setDepFilters] = useState({
    q: '',
    establishmentId: '',
    establishmentSearch: '',
  })
  const [depForm, setDepForm] = useState({ name: '', establishmentId: '' })
  const [depReplicateForm, setDepReplicateForm] = useState({
    sourceEstablishmentId: '',
    targetEstablishmentId: '',
    includeInactive: false,
  })
  const [depReplicateResult, setDepReplicateResult] = useState(null)
  const [depPage, setDepPage] = useState(1)
  const [depTotal, setDepTotal] = useState(0)
  const [depOriginal, setDepOriginal] = useState({})
  const [depSort, setDepSort] = useState({ key: 'name', order: 'asc' })
  const [depIncludeInactive, setDepIncludeInactive] = useState(true)

  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userInstitutionOptions, setUserInstitutionOptions] = useState([])
  const [userEstablishmentOptions, setUserEstablishmentOptions] = useState([])
  const [usersPage, setUsersPage] = useState(1)
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersOriginal, setUsersOriginal] = useState({})
  const [userFilters, setUserFilters] = useState({
    q: '',
    roleType: '',
    institutionId: '',
    establishmentId: '',
    includeInactive: false,
  })
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    roleType: 'ADMIN_ESTABLISHMENT',
    institutionId: '',
    establishmentId: '',
  })
  const [userFormPhotoFile, setUserFormPhotoFile] = useState(null)
  const [userFormWithoutPhoto, setUserFormWithoutPhoto] = useState(false)
  const [userPhotoFiles, setUserPhotoFiles] = useState({})
  const [assistantQuestion, setAssistantQuestion] = useState('')
  const [assistantNotifyEmail, setAssistantNotifyEmail] = useState('a.nunezu.n@gmail.com')
  const [assistantScope, setAssistantScope] = useState({
    institutionId: '',
    establishmentId: '',
    dependencyId: '',
  })
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [assistantSmtpLoading, setAssistantSmtpLoading] = useState(false)
  const [assistantAnswer, setAssistantAnswer] = useState(null)
  const [supportRequests, setSupportRequests] = useState([])
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportPage, setSupportPage] = useState(1)
  const [supportTotal, setSupportTotal] = useState(0)
  const [supportFilters, setSupportFilters] = useState({
    q: '',
    status: '',
    priority: '',
  })
  const [supportCommentDraft, setSupportCommentDraft] = useState({})

  const [assetForm, setAssetForm] = useState({
    catalogItemId: '',
    name: '',
    quantity: '1',
    brand: '',
    modelName: '',
    serialNumber: '',
    accountingAccount: '',
    analyticCode: '',
    responsibleName: '',
    responsibleRut: '',
    responsibleRole: '',
    costCenter: '',
    acquisitionValue: '',
    acquisitionDate: '',
    establishmentId: '',
    dependencyId: '',
    assetStateId: '',
    assetTypeId: '',
  })
  const [assetCatalogItems, setAssetCatalogItems] = useState([])
  const [showAssetCatalogList, setShowAssetCatalogList] = useState(false)
  const [assetStates, setAssetStates] = useState([])
  const [assetTypes, setAssetTypes] = useState([])
  const [assetEstablishments, setAssetEstablishments] = useState([])
  const [assetDependencies, setAssetDependencies] = useState([])
  const [assetListEstablishments, setAssetListEstablishments] = useState([])
  const [assetListDependencies, setAssetListDependencies] = useState([])
  const [assetInstitutionId, setAssetInstitutionId] = useState('')
  const [catalogFilters, setCatalogFilters] = useState({
    q: '',
    category: '',
    subcategory: '',
    brand: '',
    modelName: '',
  })
  const [assetCreating, setAssetCreating] = useState(false)
  const [assetHasResponsible, setAssetHasResponsible] = useState(true)
  const [createdAsset, setCreatedAsset] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [assetErrors, setAssetErrors] = useState({})
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null)
  const [catalogModalOpen, setCatalogModalOpen] = useState(false)
  const [catalogAction, setCatalogAction] = useState(null)
  const [editAssetHasResponsible, setEditAssetHasResponsible] = useState(true)
  const [editAssetForm, setEditAssetForm] = useState({
    name: '',
    quantity: '',
    brand: '',
    modelName: '',
    serialNumber: '',
    accountingAccount: '',
    analyticCode: '',
    responsibleName: '',
    responsibleRut: '',
    responsibleRole: '',
    costCenter: '',
    acquisitionValue: '',
    acquisitionDate: '',
  })
  const [moveAssetForm, setMoveAssetForm] = useState({ toDependencyId: '' })
  const [transferAssetForm, setTransferAssetForm] = useState({
    toEstablishmentId: '',
    toDependencyId: '',
    reasonCode: '',
    docType: 'ACTA',
    note: '',
    file: null,
  })
  const [transferEstablishments, setTransferEstablishments] = useState([])
  const [transferDependencies, setTransferDependencies] = useState([])
  const [statusAssetForm, setStatusAssetForm] = useState({
    assetStateId: '',
    reasonCode: '',
    docType: 'ACTA',
    note: '',
    file: null,
  })
  const [movementReasonCodes, setMovementReasonCodes] = useState({
    transfer: [],
    statusChange: [],
    restore: [],
  })
  const [assetMovements, setAssetMovements] = useState([])
  const [assetEvidence, setAssetEvidence] = useState([])
  const [assetEvidenceLoading, setAssetEvidenceLoading] = useState(false)
  const [evidenceForm, setEvidenceForm] = useState({
    movementId: '',
    docType: 'ACTA',
    note: '',
    file: null,
  })
  const [assetsList, setAssetsList] = useState([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [labelAssetId, setLabelAssetId] = useState('')
  const [scanInput, setScanInput] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [assetListFilters, setAssetListFilters] = useState({
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
  const [assetListPage, setAssetListPage] = useState(1)
  const [assetListTotal, setAssetListTotal] = useState(0)
  const [trashFilters, setTrashFilters] = useState({
    q: '',
    internalCode: '',
    deletedFrom: '',
    deletedTo: '',
  })
  const [trashAssets, setTrashAssets] = useState([])
  const [trashLoading, setTrashLoading] = useState(false)
  const [restoreModal, setRestoreModal] = useState({
    open: false,
    asset: null,
    reasonCode: '',
    docType: 'ACTA',
    note: '',
    file: null,
  })

  const [importFile, setImportFile] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importErrors, setImportErrors] = useState([])
  const [importSchemaDetails, setImportSchemaDetails] = useState(null)
  const [previewHeaders, setPreviewHeaders] = useState([])
  const [previewRows, setPreviewRows] = useState([])
  const [previewMissing, setPreviewMissing] = useState([])
  const [previewInvalidCells, setPreviewInvalidCells] = useState({})
  const [catalogImportFile, setCatalogImportFile] = useState(null)
  const [catalogImportLoading, setCatalogImportLoading] = useState(false)
  const [catalogImportResult, setCatalogImportResult] = useState(null)
  const [catalogImportErrors, setCatalogImportErrors] = useState([])
  const [snBaseFile, setSnBaseFile] = useState(null)
  const [snBaseLoading, setSnBaseLoading] = useState(false)
  const [snBaseParsed, setSnBaseParsed] = useState(null)
  const [snBaseImporting, setSnBaseImporting] = useState(false)
  const [snBaseImportResult, setSnBaseImportResult] = useState(null)
  const [catalogManualForm, setCatalogManualForm] = useState({
    officialKey: '',
    name: '',
    category: '',
    subcategory: '',
    brand: '',
    modelName: '',
    description: '',
    unit: 'unidad',
  })
  const [catalogAdminItems, setCatalogAdminItems] = useState([])
  const [catalogAdminOriginal, setCatalogAdminOriginal] = useState({})
  const [catalogAdminLoading, setCatalogAdminLoading] = useState(false)
  const [catalogAdminQuery, setCatalogAdminQuery] = useState('')
  const [catalogAdminPage, setCatalogAdminPage] = useState(1)
  const [catalogAdminTotal, setCatalogAdminTotal] = useState(0)
  const [catalogAdminRowStatus, setCatalogAdminRowStatus] = useState({})
  const [catalogAdminKeyStatus, setCatalogAdminKeyStatus] = useState({})
  const [manualOfficialKeyCheck, setManualOfficialKeyCheck] = useState(null)
  const catalogKeyCheckTimers = useRef({})
  const assetSearchDebounceRef = useRef(null)
  const usersSearchDebounceRef = useRef(null)

  const [importHistory, setImportHistory] = useState([])
  const [importHistoryPage, setImportHistoryPage] = useState(1)
  const [importHistoryTotal, setImportHistoryTotal] = useState(0)
  const [importHistoryLoading, setImportHistoryLoading] = useState(false)
  const [importHistoryOpen, setImportHistoryOpen] = useState(null)
  const [importHistoryFilters, setImportHistoryFilters] = useState({
    fromDate: '',
    toDate: '',
    userId: '',
  })

  const [planchetaFilters, setPlanchetaFilters] = useState({
    institutionId: '',
    establishmentId: '',
    dependencyId: '',
    fromDate: '',
    toDate: '',
    responsibleName: 'Encargado de Dependencia',
    chiefName: 'Jefe de Dependencia',
    ministryText:
      'Certifico que el presente inventario corresponde a los bienes fisicos verificados en la dependencia indicada, en conformidad con lineamientos ministeriales vigentes.',
    includeHistory: true,
  })
  const [planchetaInstitutions, setPlanchetaInstitutions] = useState([])
  const [planchetaEstablishments, setPlanchetaEstablishments] = useState([])
  const [planchetaDependencies, setPlanchetaDependencies] = useState([])
  const [planchetaPreview, setPlanchetaPreview] = useState([])
  const [planchetaSummary, setPlanchetaSummary] = useState([])
  const [planchetaPreviewLoading, setPlanchetaPreviewLoading] = useState(false)
  const [loadingPlancheta, setLoadingPlancheta] = useState(false)
  const [planchetaMessage, setPlanchetaMessage] = useState('')

  const [adminAudits, setAdminAudits] = useState([])
  const [adminAuditLoading, setAdminAuditLoading] = useState(false)
  const [adminAuditPage, setAdminAuditPage] = useState(1)
  const [adminAuditTotal, setAdminAuditTotal] = useState(0)
  const [loginAudits, setLoginAudits] = useState([])
  const [loginAuditLoading, setLoginAuditLoading] = useState(false)
  const [loginAuditPage, setLoginAuditPage] = useState(1)
  const [loginAuditTotal, setLoginAuditTotal] = useState(0)
  const [loginMetrics, setLoginMetrics] = useState([])
  const [loginMetricsHourly, setLoginMetricsHourly] = useState([])
  const [loginMetricsByIp, setLoginMetricsByIp] = useState([])
  const [loginMetricsByUser, setLoginMetricsByUser] = useState([])
  const [metricsTop, setMetricsTop] = useState(10)
  const [hourlySort, setHourlySort] = useState({ key: 'hour', order: 'asc' })
  const [ipSort, setIpSort] = useState({ key: 'failed', order: 'desc' })
  const [userSort, setUserSort] = useState({ key: 'failed', order: 'desc' })
  const [metricsFilters, setMetricsFilters] = useState({
    fromDate: '',
    toDate: '',
    hourFrom: '',
    hourTo: '',
  })
  const [auditFilters, setAuditFilters] = useState({
    entityType: '',
    action: '',
    fromDate: '',
    toDate: '',
  })
  const [loginAuditFilters, setLoginAuditFilters] = useState({
    email: '',
    success: '',
    fromDate: '',
    toDate: '',
  })
  const [auditCleanupForm, setAuditCleanupForm] = useState({
    scope: 'ALL',
    mode: 'KEEP_DAYS',
    beforeDate: '',
    keepDays: 90,
  })
  const [showHeroNotice, setShowHeroNotice] = useState(true)

  const isAuthed = useMemo(() => Boolean(token), [token])
  const roleType = useMemo(
    () => currentUser?.role?.type || currentUser?.role || currentUser?.roleType || '',
    [currentUser]
  )
  const isCentral = useMemo(() => roleType === 'ADMIN_CENTRAL', [roleType])
  const planchetaQuery = useMemo(() => buildPlanchetaQuery(), [planchetaFilters])
  const canPreviewPlancheta = Boolean(planchetaQuery) && !planchetaPreviewLoading
  const canExportPlancheta = canPreviewPlancheta && planchetaPreview.length > 0

  useEffect(() => {
    if (!isAuthed) {
      setShowHeroNotice(true)
      return
    }
    setShowHeroNotice(true)
    const hideId = setTimeout(() => setShowHeroNotice(false), 3000)
    return () => clearTimeout(hideId)
  }, [isAuthed])

  useEffect(() => {
    if (!isAuthed) return
    const id = setInterval(async () => {
      try {
        const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
        if (refreshed.ok) {
          const data = await refreshed.json()
          if (data?.token) {
            localStorage.setItem('admin_token', data.token)
            setToken(data.token)
          }
        }
      } catch {
        // ignore silent refresh errors
      }
    }, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [isAuthed])

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const prefs = JSON.parse(raw)
      if (prefs.activeTab) {
        const legacyTab = prefs.activeTab
        if (legacyTab === 'bulk') {
          setActiveTab('imports')
          setImportsView('assets')
        } else if (legacyTab === 'catalogImport') {
          setActiveTab('imports')
          setImportsView('catalog')
        } else if (legacyTab === 'baseSn') {
          setActiveTab('imports')
          setImportsView('sn')
        } else {
          setActiveTab(legacyTab)
        }
      }
      if (prefs.importsView) {
        const rawImportsView = String(prefs.importsView)
        if (rawImportsView === 'bulk' || rawImportsView === 'assets') {
          setImportsView('assets')
        } else if (rawImportsView === 'catalogImport' || rawImportsView === 'catalog') {
          setImportsView('catalog')
        } else if (rawImportsView === 'baseSn' || rawImportsView === 'sn') {
          setImportsView('sn')
        } else {
          setImportsView('assets')
        }
      }
      if (prefs.instQuery !== undefined) setInstQuery(prefs.instQuery)
      if (prefs.instSort) setInstSort(prefs.instSort)
      if (prefs.estFilters) setEstFilters(prefs.estFilters)
      if (prefs.estSort) setEstSort(prefs.estSort)
      if (prefs.depFilters) setDepFilters(prefs.depFilters)
      if (prefs.depSort) setDepSort(prefs.depSort)
      if (prefs.metricsFilters) setMetricsFilters(prefs.metricsFilters)
      if (prefs.metricsTop) setMetricsTop(prefs.metricsTop)
      if (prefs.hourlySort) setHourlySort(prefs.hourlySort)
      if (prefs.ipSort) setIpSort(prefs.ipSort)
      if (prefs.userSort) setUserSort(prefs.userSort)
    } catch {
      // ignore invalid storage
    }
  }, [])

  useEffect(() => {
    const prefs = {
      activeTab,
      importsView,
      instQuery,
      instSort,
      estFilters,
      estSort,
      depFilters,
      depSort,
      metricsFilters,
      metricsTop,
      hourlySort,
      ipSort,
      userSort,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  }, [
    activeTab,
    importsView,
    instQuery,
    instSort,
    estFilters,
    estSort,
    depFilters,
    depSort,
    metricsFilters,
    metricsTop,
    hourlySort,
    ipSort,
    userSort,
  ])

  function resetPreferences() {
    localStorage.removeItem(STORAGE_KEY)
    setActiveTab('institutions')
    setImportsView('assets')
    setInstQuery('')
    setInstSort({ key: 'name', order: 'asc' })
    setEstFilters({ q: '', institutionId: '', institutionSearch: '' })
    setEstSort({ key: 'name', order: 'asc' })
    setDepFilters({ q: '', establishmentId: '', establishmentSearch: '' })
    setDepSort({ key: 'name', order: 'asc' })
    setMetricsFilters({ fromDate: '', toDate: '', hourFrom: '', hourTo: '' })
    setMetricsTop(10)
    setHourlySort({ key: 'hour', order: 'asc' })
    setIpSort({ key: 'failed', order: 'desc' })
    setUserSort({ key: 'failed', order: 'desc' })
    setOk('Preferencias reiniciadas.')
  }

  function clampTake(raw) {
    const n = Number(raw)
    if (!Number.isFinite(n)) return MAX_TAKE
    return Math.max(1, Math.min(MAX_TAKE, Math.trunc(n)))
  }

  function sanitizeTakeInPath(path) {
    const raw = String(path || '')
    if (!raw.includes('take=')) return raw
    const qIndex = raw.indexOf('?')
    if (qIndex < 0) return raw
    const base = raw.slice(0, qIndex)
    const query = raw.slice(qIndex + 1)
    const params = new URLSearchParams(query)
    if (!params.has('take')) return raw
    params.set('take', String(clampTake(params.get('take'))))
    return `${base}?${params.toString()}`
  }

  const API_ERROR_MESSAGES = {
    VALIDATION_ERROR: 'Datos inválidos. Revisa los campos e intenta nuevamente.',
    ROUTE_NOT_FOUND: 'Ruta no encontrada.',
    REFRESH_TOKEN_REQUIRED: 'Tu sesión expiró. Vuelve a iniciar sesión.',
    UNSUPPORTED_MEDIA_TYPE: 'Formato de envio inválido. Usa application/json.',
    PAYLOAD_TOO_LARGE: 'El archivo o payload excede el tamaño permitido.',
    ASSET_IMPORT_FILE_REQUIRED: 'Debes adjuntar un archivo Excel para importar activos fijos.',
    CATALOG_IMPORT_FILE_REQUIRED: 'Debes adjuntar un archivo Excel para importar catálogo.',
    PLANCHETA_EMPTY_EXPORT: 'No hay datos para exportar con los filtros actuales.',
    INVALID_ASSET_ID: 'El identificador de activo fijo no es valido.',
    FORCE_DELETE_CONFIRMATION_INVALID: 'Confirmacion invalida para eliminacion forzada.',
    USER_FORCE_DELETE_SELF: 'No puedes eliminar forzadamente tu propio usuario.',
    USER_HARD_DELETE_REQUIRES_INACTIVE: 'Primero debes desactivar el usuario.',
    ASSET_HARD_DELETE_REQUIRES_DELETED: 'Primero debes dar de baja el activo fijo.',
    PASSWORD_CURRENT_INVALID: 'La clave actual no coincide.',
    PASSWORD_NEW_SAME_AS_CURRENT: 'La nueva clave debe ser distinta a la actual.',
    UNAUTHORIZED: 'No autorizado. Inicia sesión nuevamente.',
    FORBIDDEN: 'No tienes permisos para realizar esta acción.',
    NOT_FOUND: 'No se encontro el recurso solicitado.',
    CONFLICT: 'Conflicto de datos. Revisa los campos e intenta nuevamente.',
    RATE_LIMITED: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.',
    INTERNAL_SERVER_ERROR: 'Error interno del servidor. Intenta nuevamente.',
    READINESS_DB_TIMEOUT: 'La base de datos no respondio a tiempo.',
    READINESS_DB_DOWN: 'La base de datos no esta disponible.',
    SUPPORT_INVALID_SCOPE: 'El alcance seleccionado no existe o es invalido.',
    SUPPORT_INVALID_STATUS: 'El estado solicitado no es valido.',
  }

  function getFallbackCodeByStatus(status) {
    if (status === 400) return 'BAD_REQUEST'
    if (status === 401) return 'UNAUTHORIZED'
    if (status === 403) return 'FORBIDDEN'
    if (status === 404) return 'NOT_FOUND'
    if (status === 409) return 'CONFLICT'
    if (status === 413) return 'PAYLOAD_TOO_LARGE'
    if (status === 415) return 'UNSUPPORTED_MEDIA_TYPE'
    if (status === 429) return 'RATE_LIMITED'
    if (status >= 500) return 'INTERNAL_SERVER_ERROR'
    return `HTTP_${status}`
  }

  function resolveApiErrorMessage({ status, code, serverMessage, requestId }) {
    const base =
      API_ERROR_MESSAGES[code] ||
      (status >= 500 ? API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR : null) ||
      serverMessage ||
      `HTTP ${status}`
    return requestId ? `${base} (ID: ${requestId})` : base
  }

  function resolveAuthToken(overrideToken) {
    if (overrideToken) return overrideToken
    const persisted = localStorage.getItem('admin_token')
    if (persisted) return persisted
    return token || ''
  }

  async function api(path, { method = 'GET', body, retry = true, overrideToken = '' } = {}) {
    const normalizedPath = sanitizeTakeInPath(path)
    const authToken = resolveAuthToken(overrideToken)
    const res = await fetch(`${API_BASE}${normalizedPath}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    })

    if (res.status === 401 && retry) {
      const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (refreshed.ok) {
        const data = await refreshed.json()
        if (data?.token) {
          localStorage.setItem('admin_token', data.token)
          setToken(data.token)
          return api(normalizedPath, {
            method,
            body,
            retry: false,
            overrideToken: data.token,
          })
        }
      }
    }

    const text = await res.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }

    if (!res.ok) {
      const requestId = json?.requestId || res.headers.get('x-request-id') || null
      const code = json?.code || getFallbackCodeByStatus(res.status)
      const msg = resolveApiErrorMessage({
        status: res.status,
        code,
        serverMessage: json?.error || text || `HTTP ${res.status}`,
        requestId,
      })
      const err = new Error(msg)
      err.status = res.status
      err.code = code
      err.requestId = requestId
      err.details = json?.details || null
      throw err
    }
    return json
  }

  async function apiMultipart(
    path,
    { method = 'POST', formData, retry = true, overrideToken = '' } = {}
  ) {
    const normalizedPath = sanitizeTakeInPath(path)
    const authToken = resolveAuthToken(overrideToken)
    const res = await fetch(`${API_BASE}${normalizedPath}`, {
      method,
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      credentials: 'include',
      body: formData,
    })

    if (res.status === 401 && retry) {
      const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (refreshed.ok) {
        const data = await refreshed.json()
        if (data?.token) {
          localStorage.setItem('admin_token', data.token)
          setToken(data.token)
          return apiMultipart(normalizedPath, {
            method,
            formData,
            retry: false,
            overrideToken: data.token,
          })
        }
      }
    }

    const text = await res.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }

    if (!res.ok) {
      const requestId = json?.requestId || res.headers.get('x-request-id') || null
      const code = json?.code || getFallbackCodeByStatus(res.status)
      const msg = resolveApiErrorMessage({
        status: res.status,
        code,
        serverMessage: json?.error || text || `HTTP ${res.status}`,
        requestId,
      })
      const err = new Error(msg)
      err.status = res.status
      err.code = code
      err.requestId = requestId
      err.details = json?.details || null
      throw err
    }
    return json
  }

  async function downloadFile(path, filename, overrideToken = '') {
    const normalizedPath = sanitizeTakeInPath(path)
    const authToken = resolveAuthToken(overrideToken)
    const res = await fetch(`${API_BASE}${normalizedPath}`, {
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    })
    if (res.status === 401) {
      const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (refreshed.ok) {
        const data = await refreshed.json()
        if (data?.token) {
          localStorage.setItem('admin_token', data.token)
          setToken(data.token)
          return downloadFile(normalizedPath, filename, data.token)
        }
      }
    }
    if (!res.ok) {
      const text = await res.text()
      let json = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        json = null
      }
      const requestId = json?.requestId || res.headers.get('x-request-id') || null
      const code = json?.code || getFallbackCodeByStatus(res.status)
      const msg = resolveApiErrorMessage({
        status: res.status,
        code,
        serverMessage: json?.error || text || `HTTP ${res.status}`,
        requestId,
      })
      const err = new Error(msg)
      err.status = res.status
      err.code = code
      err.requestId = requestId
      err.details = json?.details || null
      throw err
    }
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  function csvEscape(value) {
    const text = String(value ?? '')
    if (text.includes('"') || text.includes(',') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  function downloadCsv(filename, headers, rows) {
    const lines = [headers.map(csvEscape).join(',')]
    rows.forEach((row) => {
      lines.push(row.map(csvEscape).join(','))
    })
    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  function getCatalogConflictMessage(err, fallback) {
    if (err?.status !== 409) {
      return err?.message || fallback
    }
    if (err?.code === 'CATALOG_ITEM_DUPLICATE_OFFICIAL_KEY') {
      return 'officialKey ya existe en otro ítem de catálogo.'
    }
    if (err?.code === 'CATALOG_ITEM_DUPLICATE_COMPOSITE') {
      return 'Ya existe un ítem con la misma combinación de nombre/categoría/subcategoría/marca/modelo.'
    }
    if (err?.code === 'CATALOG_ITEM_HAS_ASSETS') {
      return 'No se puede eliminar: hay activos fijos asociados.'
    }
    return err?.message || fallback
  }

  function getInstitutionConflictMessage(err, fallback) {
    if (err?.status !== 409) {
      return err?.message || fallback
    }
    if (err?.code === 'INSTITUTION_ALREADY_INACTIVE') {
      return 'La institución ya estaba inactiva.'
    }
    if (err?.code === 'INSTITUTION_ALREADY_ACTIVE') {
      return 'La institución ya estaba activa.'
    }
    if (err?.code === 'INSTITUTION_HAS_ACTIVE_ESTABLISHMENTS') {
      return 'No se puede dar de baja: tiene establecimientos activos.'
    }
    if (err?.code === 'INSTITUTION_HAS_ACTIVE_USERS') {
      return 'No se puede dar de baja: tiene usuarios activos.'
    }
    if (err?.code === 'INSTITUTION_HAS_ACTIVE_ASSETS') {
      return 'No se puede dar de baja: tiene activos vigentes.'
    }
    if (err?.code === 'INSTITUTION_HARD_DELETE_REQUIRES_INACTIVE') {
      return 'Para eliminar definitivamente, primero debes dar de baja la institución.'
    }
    if (err?.code === 'INSTITUTION_HARD_DELETE_HAS_RELATIONS') {
      return 'No se puede eliminar definitivamente: todavía tiene registros relacionados.'
    }
    return err?.message || fallback
  }

  function getEstablishmentConflictMessage(err, fallback) {
    if (err?.status !== 409) {
      return err?.message || fallback
    }
    if (err?.code === 'ESTABLISHMENT_ALREADY_INACTIVE') {
      return 'El establecimiento ya estaba inactivo.'
    }
    if (err?.code === 'ESTABLISHMENT_ALREADY_ACTIVE') {
      return 'El establecimiento ya estaba activo.'
    }
    if (err?.code === 'ESTABLISHMENT_HAS_ACTIVE_DEPENDENCIES') {
      return 'No se puede dar de baja: tiene dependencias activas.'
    }
    if (err?.code === 'ESTABLISHMENT_HAS_ACTIVE_USERS') {
      return 'No se puede dar de baja: tiene usuarios activos.'
    }
    if (err?.code === 'ESTABLISHMENT_HAS_ACTIVE_ASSETS') {
      return 'No se puede dar de baja: tiene activos vigentes.'
    }
    if (err?.code === 'ESTABLISHMENT_HARD_DELETE_REQUIRES_INACTIVE') {
      return 'Para eliminar definitivamente, primero debes dar de baja el establecimiento.'
    }
    if (err?.code === 'ESTABLISHMENT_HARD_DELETE_HAS_RELATIONS') {
      return 'No se puede eliminar definitivamente: todavía tiene registros relacionados.'
    }
    return err?.message || fallback
  }

  function getDependencyConflictMessage(err, fallback) {
    if (err?.status !== 409) {
      return err?.message || fallback
    }
    if (err?.code === 'DEPENDENCY_ALREADY_INACTIVE') {
      return 'La dependencia ya estaba inactiva.'
    }
    if (err?.code === 'DEPENDENCY_ALREADY_ACTIVE') {
      return 'La dependencia ya estaba activa.'
    }
    if (err?.code === 'DEPENDENCY_HAS_ACTIVE_ASSETS') {
      return 'No se puede dar de baja: tiene activos vigentes.'
    }
    if (err?.code === 'DEPENDENCY_HARD_DELETE_REQUIRES_INACTIVE') {
      return 'Para eliminar definitivamente, primero debes dar de baja la dependencia.'
    }
    if (err?.code === 'DEPENDENCY_HARD_DELETE_HAS_RELATIONS') {
      return 'No se puede eliminar definitivamente: todavía tiene registros relacionados.'
    }
    return err?.message || fallback
  }

  function getPlanchetaErrorMessage(err, fallback) {
    if (err?.code === 'PLANCHETA_INVALID_DATE_FORMAT') {
      const field = err?.details?.field
      if (field === 'fromDate') return 'Fecha "desde" invalida. Usa formato YYYY-MM-DD.'
      if (field === 'toDate') return 'Fecha "hasta" invalida. Usa formato YYYY-MM-DD.'
      return 'Formato de fecha inválido. Usa YYYY-MM-DD.'
    }
    if (err?.code === 'PLANCHETA_INVALID_DATE_RANGE') {
      return 'Rango de fechas inválido: "desde" no puede ser mayor que "hasta".'
    }
    return err?.message || fallback
  }

  function getMoveConflictMessage(err, fallback) {
    if (err?.status !== 409) {
      return err?.message || fallback
    }
    if (err?.code === 'ASSET_RELOCATE_ASSET_DELETED') {
      return 'No se puede mover: el activo fijo esta dado de baja.'
    }
    if (err?.code === 'ASSET_RELOCATE_SAME_DEPENDENCY') {
      return 'El activo fijo ya esta en esa dependencia.'
    }
    if (err?.code === 'ASSET_RELOCATE_TARGET_DEPENDENCY_INACTIVE') {
      return 'No se puede mover: la dependencia destino esta inactiva.'
    }
    if (err?.code === 'ASSET_RELOCATE_CROSS_ESTABLISHMENT_FORBIDDEN') {
      return 'No se puede mover a una dependencia de otro establecimiento.'
    }
    return err?.message || fallback
  }

  function getAssetCreateConflictMessage(err, fallback) {
    if (err?.status !== 409) {
      return err?.message || fallback
    }
    if (err?.code === 'ASSET_INTERNAL_CODE_CONFLICT') {
      return 'Conflicto al generar el código interno del activo fijo. Intenta nuevamente.'
    }
    return err?.message || fallback
  }

  function downloadCatalogImportReport(kind) {
    if (!catalogImportResult) return
    if (kind === 'errors') {
      const rows = (catalogImportResult.errors || []).map((item) => [
        item.row ?? '',
        item.error || '',
      ])
      downloadCsv('catalog_import_errors.csv', ['row', 'error'], rows)
      return
    }
    if (kind === 'skipped') {
      const rows = (catalogImportResult.skipped || []).map((item) => [
        item.name || '',
        item.category || '',
        item.subcategory || '',
        item.brand || '',
        item.modelName || '',
        item.reason || '',
        item.dedupeBy || '',
      ])
      downloadCsv(
        'catalog_import_skipped.csv',
        ['name', 'category', 'subcategory', 'brand', 'modelName', 'reason', 'dedupeBy'],
        rows
      )
      return
    }
    if (kind === 'created') {
      const rows = (catalogImportResult.items || []).map((item) => [
        item.id ?? '',
        item.name || '',
        item.category || '',
        item.subcategory || '',
        item.brand || '',
        item.modelName || '',
      ])
      downloadCsv(
        'catalog_import_created.csv',
        ['id', 'name', 'category', 'subcategory', 'brand', 'modelName'],
        rows
      )
    }
  }

  async function fetchCatalogIds() {
    const [establishments, dependencies, assetStates, assetTypes] = await Promise.all([
      api('/catalog/establishments?take=100'),
      api('/catalog/dependencies?take=100'),
      api('/catalog/asset-states?take=100'),
      api('/catalog/asset-types?take=100'),
    ])
    return {
      establishments: new Set((establishments.items || []).map((i) => i.id)),
      dependencies: new Set((dependencies.items || []).map((i) => i.id)),
      assetStates: new Set((assetStates.items || []).map((i) => i.id)),
      assetTypes: new Set((assetTypes.items || []).map((i) => i.id)),
    }
  }

  function normalizePreviewHeader(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/_/g, '')
      .toLowerCase()
  }

  function normalizeSnCell(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function parseSnInventoryRows(rows) {
    if (!Array.isArray(rows) || !rows.length) {
      return {
        rowsRead: 0,
        blockCount: 0,
        items: [],
        catalogItems: [],
      }
    }

    const headerRowIndex = rows.findIndex((row) => {
      const values = (row || []).map((cell) => normalizeSnCell(cell).toLowerCase())
      return values.includes('insumo') && values.includes('cantidad')
    })

    if (headerRowIndex < 0) {
      throw new Error(
        'Formato SN no detectado: debe incluir una fila con columnas Insumo y Cantidad.'
      )
    }

    const headerRow = rows[headerRowIndex] || []
    const categoryRow = rows[headerRowIndex + 1] || []
    const dataRows = rows.slice(headerRowIndex + 2)

    const insumoCols = []
    const cantidadCols = []
    headerRow.forEach((cell, idx) => {
      const key = normalizeSnCell(cell).toLowerCase()
      if (key === 'insumo') insumoCols.push(idx)
      if (key === 'cantidad') cantidadCols.push(idx)
    })

    const blocks = insumoCols
      .map((nameCol) => {
        const qtyCol = cantidadCols.find((c) => c > nameCol && c <= nameCol + 2)
        return qtyCol !== undefined ? { nameCol, qtyCol } : null
      })
      .filter(Boolean)

    const categoryByCol = {}
    let currentCategory = 'SIN_CATEGORIA'
    for (let col = 0; col < categoryRow.length; col += 1) {
      const value = normalizeSnCell(categoryRow[col])
      if (value) currentCategory = value
      categoryByCol[col] = currentCategory
    }

    const grouped = new Map()
    dataRows.forEach((row) => {
      blocks.forEach(({ nameCol, qtyCol }) => {
        const name = normalizeSnCell(row?.[nameCol])
        if (!name) return
        const rawQty = normalizeSnCell(row?.[qtyCol]).replace(',', '.')
        const quantity = Number(rawQty)
        if (!Number.isFinite(quantity) || quantity <= 0) return

        const category = normalizeSnCell(categoryByCol[nameCol] || categoryByCol[qtyCol]) || 'SIN_CATEGORIA'
        const key = `${category.toUpperCase()}::${name.toUpperCase()}`
        const current = grouped.get(key) || { category, name, quantity: 0, rows: 0 }
        current.quantity += quantity
        current.rows += 1
        grouped.set(key, current)
      })
    })

    const items = Array.from(grouped.values()).sort((a, b) => {
      const cat = a.category.localeCompare(b.category, 'es')
      if (cat !== 0) return cat
      return a.name.localeCompare(b.name, 'es')
    })

    const catalogItems = items.map((item) => ({
      name: item.name,
      category: item.category,
      subcategory: 'BASE_SN',
      description: `Base SN | Cantidad referencial: ${item.quantity}`,
      unit: 'unidad',
    }))

    return {
      rowsRead: dataRows.length,
      blockCount: blocks.length,
      items,
      catalogItems,
    }
  }

  async function handleSnBaseFileChange(file) {
    setSnBaseFile(file || null)
    setSnBaseImportResult(null)
    if (!file) {
      setSnBaseParsed(null)
      return
    }
    setSnBaseLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      if (!firstSheetName) {
        throw new Error('El archivo no contiene hojas para procesar.')
      }
      const sheet = workbook.Sheets[firstSheetName]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
      const parsed = parseSnInventoryRows(rows)
      setSnBaseParsed(parsed)
    } catch (err) {
      setSnBaseParsed(null)
      setErr(err, 'No se pudo leer el formato Base Inventario SN.')
    } finally {
      setSnBaseLoading(false)
    }
  }

  async function handleSnBaseImportToCatalog() {
    if (!snBaseParsed?.catalogItems?.length) {
      setErr('Primero carga y analiza un archivo Base SN valido.')
      return
    }
    setSnBaseImporting(true)
    setSnBaseImportResult(null)
    try {
      const result = await api('/admin/catalog-items/bulk', {
        method: 'POST',
        body: { items: snBaseParsed.catalogItems },
      })
      setSnBaseImportResult(result)
      setOk('Base SN convertida e importada a catalogo.')
      if (activeTab === 'imports' && importsView === 'catalog') {
        await loadCatalogAdminItems(1)
      }
    } catch (err) {
      setErr(err, 'No se pudo importar Base SN al catalogo.')
    } finally {
      setSnBaseImporting(false)
    }
  }

  async function handlePreviewFile(file) {
    if (!file) {
      setPreviewHeaders([])
      setPreviewRows([])
      setPreviewMissing([])
      setPreviewInvalidCells({})
      return
    }
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        setPreviewHeaders([])
        setPreviewRows([])
        setPreviewMissing(IMPORT_REQUIRED)
        setPreviewInvalidCells({})
        return
      }
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
      const headers = Array.isArray(rows[0]) ? rows[0] : []
      const normalized = headers.map((h) => normalizePreviewHeader(h))
      const requiredNormalized = IMPORT_REQUIRED.map((col) =>
        normalizePreviewHeader(col)
      )
      const missing = IMPORT_REQUIRED.filter(
        (_, idx) => !normalized.includes(requiredNormalized[idx])
      )

      const preview = rows.slice(1, 11)
      const invalidMap = {}
      const columnIndexByKey = {}
      normalized.forEach((key, idx) => {
        columnIndexByKey[key] = idx
      })

      let catalogSets = null
      if (!missing.length && token) {
        try {
          catalogSets = await fetchCatalogIds()
        } catch {
          catalogSets = null
        }
      }

      preview.forEach((row, rowIdx) => {
        const base = rowIdx + 1
        const invalidCols = []
        IMPORT_REQUIRED.forEach((required) => {
          const colIdx = columnIndexByKey[normalizePreviewHeader(required)]
          if (colIdx === undefined) return
          const value = row[colIdx]
          const str = String(value || '').trim()
          if (!str) {
            invalidCols.push(colIdx)
            return
          }
          if (normalizePreviewHeader(required) === 'acquisitionvalue') {
            const num = Number(value)
            if (!Number.isFinite(num) || num <= 0) invalidCols.push(colIdx)
          }
        })

        if (catalogSets) {
          const idChecks = [
            { key: 'establishmentid', set: catalogSets.establishments },
            { key: 'dependencyid', set: catalogSets.dependencies },
            { key: 'assetstateid', set: catalogSets.assetStates },
            { key: 'assettypeid', set: catalogSets.assetTypes },
          ]
          idChecks.forEach((check) => {
            const colIdx = columnIndexByKey[check.key]
            if (colIdx === undefined) return
            const value = Number(row[colIdx])
            if (!Number.isFinite(value) || !check.set.has(value)) {
              invalidCols.push(colIdx)
            }
          })
        }

        if (invalidCols.length) {
          invalidMap[base] = Array.from(new Set(invalidCols))
        }
      })

      setPreviewHeaders(headers)
      setPreviewRows(preview)
      setPreviewMissing(missing)
      setPreviewInvalidCells(invalidMap)
    } catch {
      setPreviewHeaders([])
      setPreviewRows([])
      setPreviewMissing(IMPORT_REQUIRED)
      setPreviewInvalidCells({})
    }
  }

  async function handleImportUpload() {
    if (!importFile) {
      setErr('Selecciona un archivo .xlsx antes de importar.')
      return
    }

    setImportLoading(true)
    setImportResult(null)
    setImportSchemaDetails(null)
    setImportErrors([])

    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const res = await fetch(`${API_BASE}/assets/import/excel`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })

      const text = await res.text()
      let json = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        json = null
      }

      if (!res.ok) {
        if (json?.code === 'IMPORT_SCHEMA') {
          setImportSchemaDetails(json?.details || json)
        }
        const msg = json?.error || text || `HTTP ${res.status}`
        throw new Error(msg)
      }

      setImportResult(json)
      setImportErrors(json?.errors || [])
      setOk('Importación completada.')
    } catch (err) {
      setErr(err, 'Error al importar Excel.')
    } finally {
      setImportLoading(false)
    }
  }

  async function handleCatalogImportUpload() {
    if (!catalogImportFile) {
      setErr('Selecciona un archivo de catálogo (.xlsx) antes de importar.')
      return
    }

    setCatalogImportLoading(true)
    setCatalogImportResult(null)
    setCatalogImportErrors([])

    try {
      const formData = new FormData()
      formData.append('file', catalogImportFile)

      const res = await fetch(`${API_BASE}/admin/catalog-items/import/excel`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })

      const text = await res.text()
      let json = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        json = null
      }

      if (!res.ok) {
        const msg = json?.error || text || `HTTP ${res.status}`
        throw new Error(msg)
      }

      setCatalogImportResult(json)
      setCatalogImportErrors(json?.errors || [])
      setOk('Carga masiva de catálogo completada.')
    } catch (err) {
      setErr(err, 'Error al importar catálogo por Excel.')
    } finally {
      setCatalogImportLoading(false)
    }
  }

  async function handleCatalogManualCreate() {
    try {
      const payload = {
        officialKey: catalogManualForm.officialKey.trim() || undefined,
        name: catalogManualForm.name.trim(),
        category: catalogManualForm.category.trim(),
        subcategory: catalogManualForm.subcategory.trim() || undefined,
        brand: catalogManualForm.brand.trim() || undefined,
        modelName: catalogManualForm.modelName.trim() || undefined,
        description: catalogManualForm.description.trim() || undefined,
        unit: catalogManualForm.unit.trim() || undefined,
      }

      await api('/admin/catalog-items', { method: 'POST', body: payload })
      setCatalogManualForm({
        officialKey: '',
        name: '',
        category: '',
        subcategory: '',
        brand: '',
        modelName: '',
        description: '',
        unit: 'unidad',
      })
      await loadCatalogAdminItems(catalogAdminPage)
      setManualOfficialKeyCheck(null)
      setOk('Ítem de catálogo creado manualmente.')
    } catch (err) {
      const message = getCatalogConflictMessage(err, 'No se pudo crear el ítem de catálogo.')
      setErr(withMappedError(err, message, 'No se pudo crear el ítem de catálogo.'))
    }
  }

  async function purgeCatalogAllWithReset() {
    openConfirm({
      title: 'Vaciar catálogo',
      message:
        'Se eliminarán todos los ítems del catálogo, se desvincularán de activos y el ID volverá a 1. ¿Continuar?',
      onConfirm: async () => {
        try {
          const result = await api('/admin/catalog-items/purge/reset', { method: 'DELETE' })
          await loadCatalogAdminItems(1)
          await loadCatalogItems()
          setOk(
            `Catálogo vaciado. Eliminados: ${Number(result?.deletedCount || 0)}. Próximo ID: 1.`
          )
        } catch (err) {
          setErr(err, 'No se pudo vaciar el catálogo.')
        } finally {
          closeConfirm()
        }
      },
    })
  }

  async function checkManualOfficialKeyAvailability() {
    const raw = catalogManualForm.officialKey?.trim()
    if (!raw) {
      setManualOfficialKeyCheck({
        type: 'info',
        message: 'No hay officialKey para validar.',
      })
      return
    }
    try {
      const params = new URLSearchParams()
      params.set('officialKey', raw)
      const data = await api(`/admin/catalog-items/official-key-availability?${params.toString()}`)
      if (data.available) {
        setManualOfficialKeyCheck({
          type: 'ok',
          message: `Disponible (${data.normalizedOfficialKey}).`,
        })
      } else {
        setManualOfficialKeyCheck({
          type: 'error',
          message: `En uso por #${data.conflictItem?.id} (${data.conflictItem?.name || 'sin nombre'}).`,
        })
      }
    } catch (err) {
      setManualOfficialKeyCheck({
        type: 'error',
        message: err?.message || 'No se pudo validar officialKey.',
      })
    }
  }

  async function loadCatalogAdminItems(page = catalogAdminPage) {
    setCatalogAdminLoading(true)
    try {
      const safePage = Number(page)
      const normalizedPage = Number.isFinite(safePage) && safePage > 0 ? safePage : 1
      const skip = (normalizedPage - 1) * CATALOG_ADMIN_TAKE
      const params = new URLSearchParams()
      params.set('take', String(CATALOG_ADMIN_TAKE))
      params.set('skip', String(skip))
      if (catalogAdminQuery.trim()) params.set('q', catalogAdminQuery.trim())
      const data = await api(`/admin/catalog-items?${params.toString()}`)
      const items = data.items || []
      setCatalogAdminItems(items)
      setCatalogAdminTotal(data.total || 0)
      setCatalogAdminPage(normalizedPage)

      const snapshot = {}
      items.forEach((item) => {
        snapshot[item.id] = {
          officialKey: item.officialKey || '',
          name: item.name || '',
          category: item.category || '',
          subcategory: item.subcategory || '',
          brand: item.brand || '',
          modelName: item.modelName || '',
          unit: item.unit || '',
        }
      })
      setCatalogAdminOriginal(snapshot)
      setCatalogAdminRowStatus({})
      setCatalogAdminKeyStatus({})
    } catch (err) {
      setErr(err, 'No se pudo cargar ítems de catálogo.')
    } finally {
      setCatalogAdminLoading(false)
    }
  }

  async function updateCatalogAdminItem(item) {
    try {
      setCatalogAdminRowStatus((prev) => ({
        ...prev,
        [item.id]: { type: 'info', message: 'Guardando...' },
      }))
      const body = {
        officialKey: item.officialKey?.trim() || undefined,
        name: item.name?.trim() || undefined,
        category: item.category?.trim() || undefined,
        subcategory: item.subcategory?.trim() || undefined,
        brand: item.brand?.trim() || undefined,
        modelName: item.modelName?.trim() || undefined,
        unit: item.unit?.trim() || undefined,
      }
      const updated = await api(`/admin/catalog-items/${item.id}`, { method: 'PUT', body })
      setCatalogAdminItems((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, ...updated } : x))
      )
      setCatalogAdminOriginal((prev) => ({
        ...prev,
        [item.id]: {
          officialKey: updated.officialKey || '',
          name: updated.name || '',
          category: updated.category || '',
          subcategory: updated.subcategory || '',
          brand: updated.brand || '',
          modelName: updated.modelName || '',
          unit: updated.unit || '',
        },
      }))
      setCatalogAdminRowStatus((prev) => ({
        ...prev,
        [item.id]: { type: 'ok', message: 'Guardado' },
      }))
      setOk(`Ítem #${item.id} actualizado.`)
    } catch (err) {
      const message = getCatalogConflictMessage(err, 'Error al guardar')
      setCatalogAdminRowStatus((prev) => ({
        ...prev,
        [item.id]: { type: 'error', message },
      }))
      setErr(withMappedError(err, message, 'Error al guardar'))
    }
  }

  async function validateCatalogAdminOfficialKey(itemId, rawOfficialKey) {
    const officialKey = String(rawOfficialKey || '').trim()
    if (!officialKey) {
      setCatalogAdminKeyStatus((prev) => ({
        ...prev,
        [itemId]: { type: 'info', message: '' },
      }))
      return
    }

    try {
      setCatalogAdminKeyStatus((prev) => ({
        ...prev,
        [itemId]: { type: 'info', message: 'Validando officialKey...' },
      }))
      const params = new URLSearchParams()
      params.set('officialKey', officialKey)
      params.set('excludeId', String(itemId))
      const data = await api(`/admin/catalog-items/official-key-availability?${params.toString()}`)
      if (data.available) {
        setCatalogAdminKeyStatus((prev) => ({
          ...prev,
          [itemId]: { type: 'ok', message: 'officialKey disponible' },
        }))
      } else {
        setCatalogAdminKeyStatus((prev) => ({
          ...prev,
          [itemId]: {
            type: 'error',
            message: `officialKey en uso por #${data.conflictItem?.id || '?'}`,
          },
        }))
      }
    } catch (err) {
      setCatalogAdminKeyStatus((prev) => ({
        ...prev,
        [itemId]: {
          type: 'error',
          message: err?.message || 'No se pudo validar officialKey',
        },
      }))
    }
  }

  function scheduleCatalogAdminOfficialKeyValidation(itemId, officialKey) {
    if (catalogKeyCheckTimers.current[itemId]) {
      clearTimeout(catalogKeyCheckTimers.current[itemId])
    }
    catalogKeyCheckTimers.current[itemId] = setTimeout(() => {
      validateCatalogAdminOfficialKey(itemId, officialKey)
    }, 300)
  }

  function discardCatalogAdminItem(itemId) {
    const original = catalogAdminOriginal[itemId]
    if (!original) return
    if (catalogKeyCheckTimers.current[itemId]) {
      clearTimeout(catalogKeyCheckTimers.current[itemId])
      delete catalogKeyCheckTimers.current[itemId]
    }
    setCatalogAdminItems((prev) =>
      prev.map((x) =>
        x.id === itemId
          ? {
              ...x,
              officialKey: original.officialKey,
              name: original.name,
              category: original.category,
              subcategory: original.subcategory,
              brand: original.brand,
              modelName: original.modelName,
              unit: original.unit,
            }
          : x
      )
    )
    setCatalogAdminRowStatus((prev) => ({
      ...prev,
      [itemId]: { type: 'info', message: 'Cambios descartados' },
    }))
    setCatalogAdminKeyStatus((prev) => ({
      ...prev,
      [itemId]: { type: 'info', message: '' },
    }))
  }
  function setOk(message) {
    setStatus({ type: 'ok', message, code: null, requestId: null, details: null })
    setStatusCopyFeedback('')
    setFormErrors({})
  }
  function setErr(errorOrMessage, fallbackMessage = 'Ocurrio un error.') {
    setStatusCopyFeedback('')
    if (errorOrMessage && typeof errorOrMessage === 'object') {
      setStatus({
        type: 'error',
        message: errorOrMessage.message || fallbackMessage,
        code: errorOrMessage.code || 'UNKNOWN_ERROR',
        requestId: errorOrMessage.requestId || null,
        details: errorOrMessage.details || null,
      })
      return
    }
    const message =
      typeof errorOrMessage === 'string' && errorOrMessage.trim()
        ? errorOrMessage
        : fallbackMessage
    setStatus({
      type: 'error',
      message,
      code: 'UNKNOWN_ERROR',
      requestId: null,
      details: null,
    })
  }

  function withMappedError(errorObject, mappedMessage, fallbackMessage = 'Ocurrio un error.') {
    if (errorObject && typeof errorObject === 'object') {
      return {
        ...errorObject,
        message:
          typeof mappedMessage === 'string' && mappedMessage.trim()
            ? mappedMessage
            : errorObject.message || fallbackMessage,
      }
    }
    return mappedMessage || fallbackMessage
  }


  function copyStatusRequestId() {
    const requestId = String(status.requestId || '').trim()
    if (!requestId || requestId === 'N/A') return
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard
        .writeText(requestId)
        .then(() => setStatusCopyFeedback('ID copiado'))
        .catch(() => setStatusCopyFeedback('No se pudo copiar el ID'))
      return
    }
    setStatusCopyFeedback('Portapapeles no disponible en este navegador')
  }

  function copyStatusDetailsJson() {
    const payload = {
      code: status.code || 'UNKNOWN_ERROR',
      requestId: status.requestId || null,
      details: status.details || null,
      message: status.message || null,
      copiedAt: new Date().toISOString(),
    }
    const text = JSON.stringify(payload, null, 2)
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard
        .writeText(text)
        .then(() => setStatusCopyFeedback('Detalle JSON copiado'))
        .catch(() => setStatusCopyFeedback('No se pudo copiar el detalle JSON'))
      return
    }
    setStatusCopyFeedback('Portapapeles no disponible en este navegador')
  }


  function openConfirm({ title, message, onConfirm }) {
    setConfirmState({ open: true, title, message, onConfirm })
  }

  function closeConfirm() {
    setConfirmState({ open: false, title: '', message: '', onConfirm: null })
  }

  function getForceDeleteConfig(entityType, entityId) {
    if (entityType === 'institution') {
      return {
        summaryPath: `/admin/institutions/${entityId}/permanent/summary`,
        forcePath: `/admin/institutions/${entityId}/permanent/force`,
        reload: async () => {
          await loadInstitutions(instPage)
        },
      }
    }
    if (entityType === 'establishment') {
      return {
        summaryPath: `/admin/establishments/${entityId}/permanent/summary`,
        forcePath: `/admin/establishments/${entityId}/permanent/force`,
        reload: async () => {
          await loadEstablishments(estPage)
        },
      }
    }
    if (entityType === 'dependency') {
      return {
        summaryPath: `/admin/dependencies/${entityId}/permanent/summary`,
        forcePath: `/admin/dependencies/${entityId}/permanent/force`,
        reload: async () => {
          await loadDependencies(depPage)
        },
      }
    }
    if (entityType === 'user') {
      return {
        summaryPath: `/admin/users/${entityId}/permanent/summary`,
        forcePath: `/admin/users/${entityId}/permanent/force`,
        reload: async () => {
          await loadUsersAdmin(usersPage)
        },
      }
    }
    if (entityType === 'catalogItem') {
      return {
        summaryPath: `/admin/catalog-items/${entityId}/permanent/summary`,
        forcePath: `/admin/catalog-items/${entityId}/permanent/force`,
        reload: async () => {
          await loadCatalogAdminItems(catalogAdminPage)
        },
      }
    }
    if (entityType === 'asset') {
      return {
        summaryPath: `/assets/${entityId}/permanent/summary`,
        forcePath: `/assets/${entityId}/permanent/force`,
        reload: async () => {
          await loadTrash()
          await loadAssetsList(assetListPage)
        },
      }
    }
    throw new Error(`Tipo de eliminación forzada no soportado: ${entityType}`)
  }

  async function openForceDelete(entityType, entityId, entityLabel) {
    const { summaryPath } = getForceDeleteConfig(entityType, entityId)
    setForceDeleteState({
      open: true,
      entityType,
      entityId,
      entityLabel: entityLabel || `#${entityId}`,
      summary: null,
      confirmationText: '',
      expectedConfirmationText: 'ELIMINAR DEFINITIVO',
      loading: true,
      deleting: false,
    })
    try {
      const data = await api(summaryPath)
      setForceDeleteState((prev) => ({
        ...prev,
        summary: data?.summary || null,
        expectedConfirmationText: data?.confirmationText || 'ELIMINAR DEFINITIVO',
        loading: false,
      }))
    } catch (err) {
      setErr(err, 'No se pudo cargar el resumen de eliminación forzada.')
      setForceDeleteState((prev) => ({
        ...prev,
        loading: false,
        open: false,
      }))
    }
  }

  function closeForceDelete() {
    setForceDeleteState({
      open: false,
      entityType: '',
      entityId: null,
      entityLabel: '',
      summary: null,
      confirmationText: '',
      expectedConfirmationText: 'ELIMINAR DEFINITIVO',
      loading: false,
      deleting: false,
    })
  }

  async function confirmForceDelete() {
    if (!forceDeleteState.entityType || !forceDeleteState.entityId) return
    const typed = String(forceDeleteState.confirmationText || '').trim()
    const expected = String(forceDeleteState.expectedConfirmationText || '').trim()
    if (!typed || typed !== expected) {
      setErr(`Debes escribir exactamente: ${expected}`)
      return
    }
    const { forcePath, reload } = getForceDeleteConfig(
      forceDeleteState.entityType,
      forceDeleteState.entityId
    )
    setForceDeleteState((prev) => ({ ...prev, deleting: true }))
    try {
      await api(forcePath, {
        method: 'DELETE',
        body: { confirmationText: typed },
      })
      await reload()
      setOk('Eliminación forzada completada.')
      closeForceDelete()
    } catch (err) {
      setErr(err, 'No se pudo completar la eliminación forzada.')
      setForceDeleteState((prev) => ({ ...prev, deleting: false }))
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setIsLoginLoading(true)
    const startedAt = Date.now()
    const waitAtLeastOneSecond = async () => {
      const elapsed = Date.now() - startedAt
      const remaining = 1000 - elapsed
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining))
      }
    }
    try {
      const result = await api('/auth/login', { method: 'POST', body: login })
      await waitAtLeastOneSecond()
      localStorage.setItem('admin_token', result.token)
      setToken(result.token)
      if (result.user) {
        localStorage.setItem('admin_user', JSON.stringify(result.user))
        setCurrentUser(result.user)
      }
      setOk('Sesión iniciada correctamente.')
    } catch (err) {
      await waitAtLeastOneSecond()
      setErr(err)
    } finally {
      setIsLoginLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      setToken('')
      setCurrentUser(null)
      setOk('Sesión cerrada.')
    }
  }

  async function loadInstitutions(page = instPage) {
    const take = 10
    const skip = (page - 1) * take
    const params = new URLSearchParams()
    if (instQuery) params.set('q', instQuery)
    if (instIncludeInactive) params.set('includeInactive', 'true')
    params.set('take', String(take))
    params.set('skip', String(skip))
    const data = await api(`/admin/institutions?${params.toString()}`)
    setInstitutions(data.items || [])
    setInstTotal(data.total || 0)
    const snapshot = {}
    ;(data.items || []).forEach((i) => {
      snapshot[i.id] = { name: i.name }
    })
    setInstOriginal(snapshot)
  }

  async function loadInstitutionCatalog() {
    setLoadingInstitutions(true)
    try {
      const take = 100
      let skip = 0
      let total = 0
      const collected = []
      do {
        const params = new URLSearchParams()
        params.set('take', String(take))
        params.set('skip', String(skip))
        params.set('includeInactive', 'true')
        const data = await api(`/catalog/institutions?${params.toString()}`)
        const items = data.items || []
        total = Number(data.total || 0)
        collected.push(...items)
        skip += take
        if (!items.length) break
      } while (skip < total && collected.length < 10000)
      setInstitutionsCatalog(uniqueById(collected))
    } finally {
      setLoadingInstitutions(false)
    }
  }

  function openChangePassword() {
    setIsChangePasswordOpen(true)
    setChangePasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
  }

  function closeChangePassword() {
    setIsChangePasswordOpen(false)
    setIsChangingPassword(false)
    setChangePasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (!changePasswordForm.currentPassword || !changePasswordForm.newPassword) {
      setErr('Completa clave actual y nueva clave.')
      return
    }
    if (changePasswordForm.newPassword.length < 8) {
      setErr('La nueva clave debe tener al menos 8 caracteres.')
      return
    }
    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      setErr('La confirmacion de clave no coincide.')
      return
    }

    setIsChangingPassword(true)
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: {
          currentPassword: changePasswordForm.currentPassword,
          newPassword: changePasswordForm.newPassword,
        },
      })
      setOk('Clave actualizada correctamente.')
      closeChangePassword()
    } catch (err) {
      setErr(err, 'No se pudo actualizar la clave.')
      setIsChangingPassword(false)
    }
  }

  async function loadEstablishments(page = estPage) {
    const take = 10
    const skip = (page - 1) * take
    const params = new URLSearchParams()
    if (estFilters.q) params.set('q', estFilters.q)
    if (estFilters.institutionId) params.set('institutionId', estFilters.institutionId)
    if (estIncludeInactive) params.set('includeInactive', 'true')
    params.set('take', String(take))
    params.set('skip', String(skip))
    const data = await api(`/admin/establishments?${params.toString()}`)
    setEstablishments(data.items || [])
    setEstTotal(data.total || 0)
    const snapshot = {}
    ;(data.items || []).forEach((e) => {
      snapshot[e.id] = { name: e.name, type: e.type, rbd: e.rbd || '', commune: e.commune || '', institutionId: e.institutionId }
    })
    setEstOriginal(snapshot)
  }

  async function loadEstablishmentCatalog(institutionId) {
    setLoadingEstablishments(true)
    try {
      const take = 100
      let skip = 0
      let total = 0
      const collected = []
      do {
        const params = new URLSearchParams()
        if (institutionId) {
          const instId = Number(institutionId)
          if (!Number.isNaN(instId)) params.set('institutionId', String(instId))
        }
        params.set('take', String(take))
        params.set('skip', String(skip))
        if (estIncludeInactive) params.set('includeInactive', 'true')
        const data = await api(`/catalog/establishments?${params.toString()}`)
        const items = data.items || []
        total = Number(data.total || 0)
        collected.push(...items)
        skip += take
        if (!items.length) break
      } while (skip < total && collected.length < 10000)
      setEstablishmentsCatalog(uniqueById(collected))
    } finally {
      setLoadingEstablishments(false)
    }
  }

  async function loadDependencies(page = depPage) {
    const take = 10
    const skip = (page - 1) * take
    const params = new URLSearchParams()
    if (depFilters.q) params.set('q', depFilters.q)
    if (depFilters.establishmentId) params.set('establishmentId', depFilters.establishmentId)
    if (depIncludeInactive) params.set('includeInactive', 'true')
    params.set('take', String(take))
    params.set('skip', String(skip))
    const data = await api(`/admin/dependencies?${params.toString()}`)
    setDependencies(data.items || [])
    setDepTotal(data.total || 0)
    const snapshot = {}
    ;(data.items || []).forEach((d) => {
      snapshot[d.id] = { name: d.name, establishmentId: d.establishmentId }
    })
    setDepOriginal(snapshot)
  }

  async function loadDependencyCatalog(establishmentId) {
    setLoadingDependencies(true)
    try {
      const take = 100
      let skip = 0
      let total = 0
      const collected = []
      do {
        const params = new URLSearchParams()
        if (establishmentId) {
          const estId = Number(establishmentId)
          if (!Number.isNaN(estId)) params.set('establishmentId', String(estId))
        }
        params.set('take', String(take))
        params.set('skip', String(skip))
        if (depIncludeInactive) params.set('includeInactive', 'true')
        const data = await api(`/catalog/dependencies?${params.toString()}`)
        const items = data.items || []
        total = Number(data.total || 0)
        collected.push(...items)
        skip += take
        if (!items.length) break
      } while (skip < total && collected.length < 10000)
      setDependenciesCatalog(uniqueById(collected))
    } finally {
      setLoadingDependencies(false)
    }
  }

  async function loadImportHistory(page = importHistoryPage) {
    setImportHistoryLoading(true)
    try {
      const take = 10
      const skip = (page - 1) * take
      const params = new URLSearchParams()
      if (importHistoryFilters.fromDate) params.set('fromDate', importHistoryFilters.fromDate)
      if (importHistoryFilters.toDate) params.set('toDate', importHistoryFilters.toDate)
      if (importHistoryFilters.userId) params.set('userId', importHistoryFilters.userId)
      params.set('take', String(take))
      params.set('skip', String(skip))

      const data = await api(`/assets/imports?${params.toString()}`)
      setImportHistory(data.items || [])
      setImportHistoryTotal(data.total || 0)
      setImportHistoryPage(page)
      setImportHistoryOpen(null)
    } catch (err) {
      setErr(err)
    } finally {
      setImportHistoryLoading(false)
    }
  }

  async function loadAssetStates() {
    const data = await api('/catalog/asset-states?take=100')
    setAssetStates(data.items || [])
  }

  async function loadMovementReasonCodes() {
    const data = await api('/assets/reason-codes')
    setMovementReasonCodes({
      transfer: data.transfer || [],
      statusChange: data.statusChange || [],
      restore: data.restore || [],
    })
  }

  async function loadAssetTypes() {
    const data = await api('/catalog/asset-types?take=100')
    setAssetTypes(data.items || [])
  }

  async function loadAssetEstablishments(institutionId) {
    try {
      const take = 100
      let skip = 0
      let total = 0
      const collected = []

      do {
        const params = new URLSearchParams()
        if (institutionId) {
          const instId = Number(institutionId)
          if (!Number.isNaN(instId)) params.set('institutionId', String(instId))
        }
        params.set('take', String(take))
        params.set('skip', String(skip))
        params.set('includeInactive', 'true')
        const data = await api(`/catalog/establishments?${params.toString()}`)
        const items = data.items || []
        total = Number(data.total || 0)
        collected.push(...items)
        skip += take
        if (!items.length) break
      } while (skip < total && collected.length < 10000)

      setAssetEstablishments(uniqueById(collected))
    } catch (err) {
      setAssetEstablishments([])
      setErr(err.message || 'No se pudieron cargar establecimientos.')
    }
  }

  async function loadAssetListEstablishments(institutionId) {
    try {
      const take = 100
      let skip = 0
      let total = 0
      const collected = []

      do {
        const params = new URLSearchParams()
        if (institutionId) {
          const instId = Number(institutionId)
          if (!Number.isNaN(instId)) params.set('institutionId', String(instId))
        }
        params.set('take', String(take))
        params.set('skip', String(skip))
        params.set('includeInactive', 'true')
        const data = await api(`/catalog/establishments?${params.toString()}`)
        const items = data.items || []
        total = Number(data.total || 0)
        collected.push(...items)
        skip += take
        if (!items.length) break
      } while (skip < total && collected.length < 10000)

      setAssetListEstablishments(uniqueById(collected))
    } catch (err) {
      setAssetListEstablishments([])
      setErr(err.message || 'No se pudieron cargar establecimientos.')
    }
  }

  async function loadAssetDependencies(establishmentId) {
    if (!establishmentId) {
      setAssetDependencies([])
      return
    }
    try {
      const take = 100
      let skip = 0
      let total = 0
      const collected = []

      do {
        const params = new URLSearchParams()
        const estId = Number(establishmentId)
        if (!Number.isNaN(estId)) params.set('establishmentId', String(estId))
        params.set('take', String(take))
        params.set('skip', String(skip))
        params.set('includeInactive', 'true')
        const data = await api(`/catalog/dependencies?${params.toString()}`)
        const items = data.items || []
        total = Number(data.total || 0)
        collected.push(...items)
        skip += take
        if (!items.length) break
      } while (skip < total && collected.length < 10000)

      setAssetDependencies(uniqueById(collected))
    } catch (err) {
      setAssetDependencies([])
      setErr(err.message || 'No se pudieron cargar dependencias.')
    }
  }

  async function loadAssetListDependencies(establishmentId) {
    if (!establishmentId) {
      setAssetListDependencies([])
      return
    }
    try {
      const take = 100
      let skip = 0
      let total = 0
      const collected = []

      do {
        const params = new URLSearchParams()
        const estId = Number(establishmentId)
        if (!Number.isNaN(estId)) params.set('establishmentId', String(estId))
        params.set('take', String(take))
        params.set('skip', String(skip))
        params.set('includeInactive', 'true')
        const data = await api(`/catalog/dependencies?${params.toString()}`)
        const items = data.items || []
        total = Number(data.total || 0)
        collected.push(...items)
        skip += take
        if (!items.length) break
      } while (skip < total && collected.length < 10000)

      setAssetListDependencies(uniqueById(collected))
    } catch (err) {
      setAssetListDependencies([])
      setErr(err.message || 'No se pudieron cargar dependencias.')
    }
  }

  async function loadTransferEstablishmentsForAsset(asset) {
    if (!asset) {
      setTransferEstablishments([])
      return
    }
    const params = new URLSearchParams()
    const institutionId = asset?.establishment?.institutionId
    if (institutionId) params.set('institutionId', String(institutionId))
    params.set('take', '100')
    const data = await api(`/catalog/establishments?${params.toString()}`)
    const options = (data.items || []).filter(
      (est) => String(est.id) !== String(asset.establishmentId)
    )
    setTransferEstablishments(options)
  }

  async function loadTransferDependenciesForEstablishment(establishmentId) {
    if (!establishmentId) {
      setTransferDependencies([])
      return
    }
    const params = new URLSearchParams()
    params.set('establishmentId', String(establishmentId))
    params.set('take', '100')
    const data = await api(`/catalog/dependencies?${params.toString()}`)
    setTransferDependencies(data.items || [])
  }

  async function loadCatalogItems() {
    const baseParams = new URLSearchParams()
    if (catalogFilters.q) baseParams.set('q', catalogFilters.q)
    if (catalogFilters.category) baseParams.set('category', catalogFilters.category)
    if (catalogFilters.subcategory) baseParams.set('subcategory', catalogFilters.subcategory)
    if (catalogFilters.brand) baseParams.set('brand', catalogFilters.brand)
    if (catalogFilters.modelName) baseParams.set('modelName', catalogFilters.modelName)

    const take = 100
    let skip = 0
    let total = 0
    const collected = []

    do {
      const params = new URLSearchParams(baseParams)
      params.set('take', String(take))
      params.set('skip', String(skip))
      const data = await api(`/catalog/items?${params.toString()}`)
      const items = data.items || []
      total = Number(data.total || 0)
      collected.push(...items)
      skip += take
      if (!items.length) break
    } while (skip < total && collected.length < 10000)

    setAssetCatalogItems(collected)
  }

  async function loadAssetsList(page = assetListPage) {
    setAssetsLoading(true)
    try {
      const safePage = Number(page)
      const normalizedPage = Number.isFinite(safePage) && safePage > 0 ? safePage : 1
      const take = 20
      const skip = (normalizedPage - 1) * take
      const params = new URLSearchParams()
      const safeId = toPositiveIntOrNull(assetListFilters.id)
      if (assetListFilters.id && !safeId) {
        throw new Error('Filtro ID inválido. Usa solo numeros positivos.')
      }
      if (safeId) params.set('id', String(safeId))
      if (assetListFilters.internalCode)
        params.set('internalCode', assetListFilters.internalCode)
      if (assetListFilters.q) params.set('q', assetListFilters.q)
      if (assetListFilters.responsibleName)
        params.set('responsibleName', assetListFilters.responsibleName)
      if (assetListFilters.costCenter) params.set('costCenter', assetListFilters.costCenter)
      if (assetListFilters.institutionId)
        params.set('institutionId', assetListFilters.institutionId)
      if (assetListFilters.establishmentId)
        params.set('establishmentId', assetListFilters.establishmentId)
      if (assetListFilters.dependencyId)
        params.set('dependencyId', assetListFilters.dependencyId)
      if (assetListFilters.assetStateId)
        params.set('assetStateId', assetListFilters.assetStateId)
      if (assetListFilters.includeDeleted) params.set('includeDeleted', 'true')
      if (assetListFilters.fromDate) params.set('fromDate', assetListFilters.fromDate)
      if (assetListFilters.toDate) params.set('toDate', assetListFilters.toDate)
      params.set('take', String(take))
      params.set('skip', String(skip))
      params.set('withCount', 'true')
      const data = await api(`/assets?${params.toString()}`)
      setAssetsList(data.items || [])
      setAssetListTotal(data.total || 0)
      setAssetListPage(normalizedPage)
    } catch (err) {
      setAssetsList([])
      setAssetListTotal(0)
      setErr(err)
    } finally {
      setAssetsLoading(false)
    }
  }

  async function loadTrash() {
    setTrashLoading(true)
    try {
      const params = new URLSearchParams()
      if (trashFilters.q) params.set('q', trashFilters.q)
      if (trashFilters.internalCode) params.set('internalCode', trashFilters.internalCode)
      if (trashFilters.deletedFrom) params.set('deletedFrom', trashFilters.deletedFrom)
      if (trashFilters.deletedTo) params.set('deletedTo', trashFilters.deletedTo)
      params.set('includeDeleted', 'true')
      params.set('onlyDeleted', 'true')
      params.set('take', '50')
      params.set('withCount', 'false')
      const data = await api(`/assets?${params.toString()}`)
      setTrashAssets(data.items || [])
    } finally {
      setTrashLoading(false)
    }
  }

  async function loadAssetMovements(assetId) {
    const safeAssetId = toPositiveIntOrNull(assetId)
    if (!safeAssetId) {
      setAssetMovements([])
      return
    }
    try {
      const data = await api(`/assets/${safeAssetId}/history`)
      const movements = (data.movements || []).filter(
        (m) => m.type === 'TRANSFER' || m.type === 'STATUS_CHANGE'
      )
      setAssetMovements(movements)
      setEvidenceForm((prev) => ({
        ...prev,
        movementId:
          prev.movementId ||
          (movements[0]?.id ? String(movements[0].id) : ''),
      }))
    } catch {
      setAssetMovements([])
    }
  }

  async function loadAssetEvidence(assetId) {
    const safeAssetId = toPositiveIntOrNull(assetId)
    if (!safeAssetId) {
      setAssetEvidence([])
      return
    }
    setAssetEvidenceLoading(true)
    try {
      const data = await api(`/assets/${safeAssetId}/evidence?take=100&skip=0`)
      setAssetEvidence(data.items || [])
    } catch (err) {
      setErr(err)
    } finally {
      setAssetEvidenceLoading(false)
    }
  }

  async function submitEvidenceUpload() {
    const assetId = getSafeAssetId(createdAsset)
    if (!assetId) {
      setErr('Activo fijo inválido para subir evidencia.')
      return
    }
    if (!evidenceForm.file) {
      setErr('Selecciona un archivo de evidencia.')
      return
    }
    if (!evidenceForm.docType) {
      setErr('Selecciona tipo de documento.')
      return
    }

    try {
      const formData = new FormData()
      formData.append('docType', evidenceForm.docType)
      if (evidenceForm.note?.trim()) formData.append('note', evidenceForm.note.trim())
      if (evidenceForm.movementId) formData.append('movementId', evidenceForm.movementId)
      formData.append('file', evidenceForm.file)

      await apiMultipart(`/assets/${assetId}/evidence`, {
        method: 'POST',
        formData,
      })
      setEvidenceForm((prev) => ({
        ...prev,
        note: '',
        file: null,
      }))
      const fileInput = document.getElementById('evidence-file-input')
      if (fileInput) fileInput.value = ''
      await loadAssetEvidence(assetId)
      setOk('Evidencia subida correctamente.')
    } catch (err) {
      setErr(err)
    }
  }

  async function downloadEvidence(item) {
    const assetId = getSafeAssetId(createdAsset)
    const evidenceId = toPositiveIntOrNull(item?.id)
    if (!assetId || !evidenceId) return
    try {
      await downloadFile(
        `/assets/${assetId}/evidence/${evidenceId}/download`,
        item.fileName || `evidence_${item.id}`
      )
    } catch (err) {
      setErr(err)
    }
  }

  function restoreFromTrash(asset) {
    const restoreCodes = movementReasonCodes.restore || []
    if (!restoreCodes.length) {
      setErr('No hay catálogo de motivos de restauración disponible.')
      return
    }
    setRestoreModal({
      open: true,
      asset,
      reasonCode: restoreCodes[0]?.code || '',
      docType: 'ACTA',
      note: '',
      file: null,
    })
  }

  async function confirmRestoreFromTrash() {
    const restoreAssetId = getSafeAssetId(restoreModal.asset)
    if (!restoreAssetId) {
      setErr('Activo fijo inválido para restaurar.')
      return
    }
    if (!restoreModal.reasonCode) {
      setErr('Selecciona un motivo de restauración.')
      return
    }
    if (!restoreModal.file) {
      setErr('Adjunta evidencia (PDF/JPG/PNG) para restaurar.')
      return
    }
    try {
      const formData = new FormData()
      formData.append('reasonCode', restoreModal.reasonCode)
      formData.append('docType', restoreModal.docType)
      if (restoreModal.note) formData.append('note', restoreModal.note)
      formData.append('file', restoreModal.file)
      await apiMultipart(`/assets/${restoreAssetId}/restore`, {
        method: 'PUT',
        formData,
      })
      setOk(`Activo fijo restaurado: ${restoreModal.asset.name}`)
      setRestoreModal({
        open: false,
        asset: null,
        reasonCode: '',
        docType: 'ACTA',
        note: '',
        file: null,
      })
      await loadTrash()
      await loadAssetsList()
    } catch (err) {
      if (err?.status === 409) {
        await loadTrash()
        await loadAssetsList()
      }
      setErr(err)
    }
  }

  async function loadUsersAdmin(page = usersPage) {
    setUsersLoading(true)
    try {
      const take = 10
      const skip = (page - 1) * take
      const params = new URLSearchParams()
      if (userFilters.q) params.set('q', userFilters.q)
      if (userFilters.roleType) params.set('roleType', userFilters.roleType)
      if (userFilters.institutionId) params.set('institutionId', userFilters.institutionId)
      if (userFilters.establishmentId)
        params.set('establishmentId', userFilters.establishmentId)
      if (userFilters.includeInactive) params.set('includeInactive', 'true')
      params.set('take', String(take))
      params.set('skip', String(skip))

      const data = await api(`/admin/users?${params.toString()}`)
      const mapped = (data.items || []).map((u) => ({
        ...u,
        roleType: u.role?.type || '',
      }))
      setUsers(mapped)
      setUsersTotal(data.total || 0)
      setUsersPage(page)

      const snapshot = {}
      mapped.forEach((u) => {
        snapshot[u.id] = {
          name: u.name || '',
          roleType: u.roleType || '',
          institutionId: u.institutionId || '',
          establishmentId: u.establishmentId || '',
        }
      })
      setUsersOriginal(snapshot)
    } catch (err) {
      setErr(err)
    } finally {
      setUsersLoading(false)
    }
  }

  function applyUpdatedUserInList(updatedUser) {
    if (!updatedUser?.id) return
    setUsers((prev) =>
      prev.map((item) =>
        Number(item.id) === Number(updatedUser.id)
          ? { ...item, ...updatedUser, roleType: updatedUser.role?.type || updatedUser.roleType || item.roleType }
          : item
      )
    )
  }

  function syncCurrentUserPhotoIfNeeded(updatedUser) {
    if (!updatedUser?.id) return
    if (Number(currentUser?.id) !== Number(updatedUser.id)) return
    const next = {
      ...currentUser,
      hasPhoto: Boolean(updatedUser.hasPhoto),
      photoDataUrl: updatedUser.photoDataUrl || null,
    }
    setCurrentUser(next)
    localStorage.setItem('admin_user', JSON.stringify(next))
  }

  async function saveUserPhotoAdmin(userId, file) {
    if (!file) {
      setErr('Selecciona una foto JPG/PNG antes de guardar.')
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    const updated = await apiMultipart(`/admin/users/${userId}/photo`, {
      method: 'PUT',
      formData,
    })
    applyUpdatedUserInList(updated)
    syncCurrentUserPhotoIfNeeded(updated)
    setUserPhotoFiles((prev) => ({ ...prev, [userId]: null }))
    setOk('Foto de usuario actualizada.')
  }

  async function clearUserPhotoAdmin(userId) {
    const updated = await api(`/admin/users/${userId}/photo`, { method: 'DELETE' })
    applyUpdatedUserInList(updated)
    syncCurrentUserPhotoIfNeeded(updated)
    setUserPhotoFiles((prev) => ({ ...prev, [userId]: null }))
    setOk('Usuario marcado sin foto.')
  }

  async function loadUserAssignmentOptions() {
    try {
      const institutionsRes = await api('/catalog/institutions?take=100')
      setUserInstitutionOptions(institutionsRes.items || [])

      const take = 100
      let skip = 0
      let total = 0
      const allEstablishments = []
      do {
        const params = new URLSearchParams()
        params.set('take', String(take))
        params.set('skip', String(skip))
        const page = await api(`/catalog/establishments?${params.toString()}`)
        const items = page.items || []
        total = Number(page.total || 0)
        allEstablishments.push(...items)
        skip += take
        if (!items.length) break
      } while (skip < total && allEstablishments.length < 10000)

      setUserEstablishmentOptions(uniqueById(allEstablishments))
    } catch (err) {
      setErr(err)
    }
  }

  async function createUserAdmin() {
    try {
      if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password.trim()) {
        setErr('Nombre, email y password son requeridos.')
        return
      }
      const institutionId = toPositiveIntOrNull(userForm.institutionId)
      const establishmentId = toPositiveIntOrNull(userForm.establishmentId)
      if (userForm.roleType === 'ADMIN_CENTRAL') {
        if (userForm.institutionId && !institutionId) {
          setErr('Institution ID inválido. Debe ser un numero mayor a 0.')
          return
        }
      } else {
        if (!establishmentId) {
          setErr('Establishment ID requerido para este rol (numero mayor a 0).')
          return
        }
      }
      const payload = {
        name: userForm.name.trim(),
        email: userForm.email.trim().toLowerCase(),
        password: userForm.password,
        roleType: userForm.roleType,
      }
      if (userForm.roleType === 'ADMIN_CENTRAL') {
        if (institutionId) payload.institutionId = institutionId
      } else if (establishmentId) {
        payload.establishmentId = establishmentId
      }

      const created = await api('/admin/users', { method: 'POST', body: payload })
      if (userFormPhotoFile && !userFormWithoutPhoto) {
        await saveUserPhotoAdmin(created.id, userFormPhotoFile)
      }
      setUserForm({
        name: '',
        email: '',
        password: '',
        roleType: 'ADMIN_ESTABLISHMENT',
        institutionId: '',
        establishmentId: '',
      })
      setUserFormPhotoFile(null)
      setUserFormWithoutPhoto(false)
      await loadUsersAdmin(1)
      setOk(`Usuario creado: ${created.email}`)
    } catch (err) {
      setErr(err)
    }
  }

  async function updateUserAdmin(user) {
    try {
      const institutionId = toPositiveIntOrNull(user.institutionId)
      const establishmentId = toPositiveIntOrNull(user.establishmentId)
      const payload = {
        name: user.name,
        roleType: user.roleType,
      }
      if (user.roleType === 'ADMIN_CENTRAL') {
        if (user.institutionId && !institutionId) {
          setErr('Institution ID inválido. Debe ser un numero mayor a 0.')
          return
        }
        if (institutionId) payload.institutionId = institutionId
      } else {
        if (!establishmentId) {
          setErr('Establishment ID requerido para este rol (numero mayor a 0).')
          return
        }
        payload.establishmentId = establishmentId
      }
      const updated = await api(`/admin/users/${user.id}`, {
        method: 'PUT',
        body: payload,
      })
      setOk(`Usuario actualizado: ${updated.email}`)
      await loadUsersAdmin(usersPage)
    } catch (err) {
      setErr(err)
    }
  }

  async function deactivateUserAdmin(userId, email) {
    openConfirm({
      title: 'Desactivar usuario',
      message: `Se desactivará ${email}. Podrá quedar visible con "inactivos".`,
      onConfirm: async () => {
        try {
          await api(`/admin/users/${userId}`, { method: 'DELETE' })
          await loadUsersAdmin(usersPage)
          setOk(`Usuario desactivado: ${email}`)
        } catch (err) {
          setErr(err)
        } finally {
          closeConfirm()
        }
      },
    })
  }

  async function reactivateUserAdmin(userId, email) {
    try {
      await api(`/admin/users/${userId}/reactivate`, { method: 'PUT' })
      await loadUsersAdmin(usersPage)
      setOk(`Usuario reactivado: ${email}`)
    } catch (err) {
      setErr(err)
    }
  }

  async function askCentralAssistant() {
    try {
      const question = String(assistantQuestion || '').trim()
      if (question.length < 5) {
        setErr('Escribe una consulta mas detallada (minimo 5 caracteres).')
        return
      }
      setAssistantLoading(true)
      const body = { question }
      const institutionId = toPositiveIntOrNull(assistantScope.institutionId)
      const establishmentId = toPositiveIntOrNull(assistantScope.establishmentId)
      const dependencyId = toPositiveIntOrNull(assistantScope.dependencyId)
      if (institutionId) body.institutionId = institutionId
      if (establishmentId) body.establishmentId = establishmentId
      if (dependencyId) body.dependencyId = dependencyId
      const result = await api('/admin/assistant/ask', { method: 'POST', body })
      setAssistantAnswer(result)
      setOk('Asistente central respondio correctamente.')
    } catch (err) {
      setErr(err)
    } finally {
      setAssistantLoading(false)
    }
  }

  async function createSupportRequestFromAssistant() {
    if (!assistantAnswer?.question) {
      setErr('Primero consulta al asistente para generar una solicitud.')
      return
    }
    try {
      const body = {
        subject: assistantAnswer.suggestedSubject || `Solicitud central ${Date.now()}`,
        question: assistantAnswer.question,
        responseDraft: assistantAnswer.answer || '',
        priority: assistantAnswer.suggestedPriority || 'MEDIUM',
        dueHours: 72,
        source: 'ASSISTANT_UI',
      }
      const notifyEmail = String(assistantNotifyEmail || '').trim()
      if (notifyEmail) body.contactEmail = notifyEmail
      const scope = assistantAnswer.scope || {}
      if (scope.institutionId) body.institutionId = Number(scope.institutionId)
      if (scope.establishmentId) body.establishmentId = Number(scope.establishmentId)
      if (scope.dependencyId) body.dependencyId = Number(scope.dependencyId)
      const created = await api('/admin/support-requests', { method: 'POST', body })
      setOk(`Solicitud creada #${created.id}. SLA objetivo: 72 horas.`)
      setSupportPage(1)
      await loadSupportRequests(1)
    } catch (err) {
      setErr(err)
    }
  }

  async function testAssistantSmtp() {
    try {
      setAssistantSmtpLoading(true)
      const email = String(assistantNotifyEmail || '').trim()
      const body = email ? { email } : {}
      const result = await api('/admin/support-requests/test-email', { method: 'POST', body })
      const status = result?.delivery?.status || 'unknown'
      if (status === 'sent') {
        setOk(`SMTP OK. Correo de prueba enviado a ${result.email}.`)
      } else {
        const reason = result?.delivery?.reason || 'SMTP_TEST_FAILED'
        setErr({
          message: `No se pudo enviar correo SMTP de prueba (${reason}).`,
          code: reason,
          details: result?.delivery || null,
        })
      }
    } catch (err) {
      setErr(err)
    } finally {
      setAssistantSmtpLoading(false)
    }
  }

  async function loadSupportRequests(page = supportPage) {
    try {
      setSupportLoading(true)
      const take = 10
      const skip = (page - 1) * take
      const params = new URLSearchParams()
      if (supportFilters.q) params.set('q', supportFilters.q)
      if (supportFilters.status) params.set('status', supportFilters.status)
      if (supportFilters.priority) params.set('priority', supportFilters.priority)
      params.set('take', String(take))
      params.set('skip', String(skip))
      const data = await api(`/admin/support-requests?${params.toString()}`)
      setSupportRequests(data.items || [])
      setSupportTotal(data.total || 0)
      setSupportPage(page)
    } catch (err) {
      setErr(err)
    } finally {
      setSupportLoading(false)
    }
  }

  async function updateSupportStatus(item, status) {
    try {
      await api(`/admin/support-requests/${item.id}/status`, {
        method: 'PUT',
        body: { status },
      })
      await loadSupportRequests(supportPage)
      setOk(`Solicitud #${item.id} actualizada a ${status}.`)
    } catch (err) {
      setErr(err)
    }
  }

  async function sendSupportComment(item) {
    try {
      const text = String(supportCommentDraft[item.id] || '').trim()
      if (!text) {
        setErr('Escribe un comentario antes de enviar.')
        return
      }
      await api(`/admin/support-requests/${item.id}/comments`, {
        method: 'POST',
        body: { message: text },
      })
      setSupportCommentDraft((prev) => ({ ...prev, [item.id]: '' }))
      await loadSupportRequests(supportPage)
      setOk(`Comentario agregado en solicitud #${item.id}.`)
    } catch (err) {
      setErr(err)
    }
  }

  function validateAssetForm() {
    const errors = {}
    if (!assetForm.establishmentId) errors.establishmentId = 'Requerido'
    if (!assetForm.dependencyId) errors.dependencyId = 'Requerido'
    if (!assetForm.assetStateId) errors.assetStateId = 'Requerido'
    if (!assetForm.assetTypeId) errors.assetTypeId = 'Requerido'
    if (!assetForm.catalogItemId && !assetForm.name) {
      errors.name = 'Requerido si no hay catálogo'
    }
    if (!assetForm.accountingAccount) errors.accountingAccount = 'Requerido'
    const quantity = Number(assetForm.quantity)
    if (!assetForm.quantity || !Number.isInteger(quantity) || quantity <= 0) {
      errors.quantity = 'Debe ser un entero mayor a 0'
    }
    if (!assetForm.acquisitionValue) errors.acquisitionValue = 'Requerido'
    if (!assetForm.acquisitionDate) errors.acquisitionDate = 'Requerido'
    if (assetHasResponsible && assetForm.responsibleRut) {
      const rut = String(assetForm.responsibleRut).trim()
      const compact = rut.replace(/\./g, '').replace(/\s+/g, '').toUpperCase()
      if (!/^\d{7,8}-?[\dK]$/.test(compact)) {
        errors.responsibleRut = 'RUT inválido. Usa formato 12345678-9'
      }
    }
    return errors
  }

  function normalizeRutValue(value) {
    const raw = String(value || '').trim().toUpperCase()
    if (!raw) return ''
    const compact = raw.replace(/\./g, '').replace(/\s+/g, '')
    const match = compact.match(/^(\d{7,8})-?([\dK])$/)
    if (!match) return raw
    return `${match[1]}-${match[2]}`
  }

  function normalizeCostCenterValue(value) {
    return String(value || '').trim().toUpperCase()
  }

  function buildBarcodeDataUrl(value) {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, value, {
      format: 'CODE39',
      displayValue: false,
      height: 40,
      margin: 0,
    })
    return canvas.toDataURL('image/png')
  }

  const LABEL = {
    widthMm: 40,
    heightMm: 30,
    marginMm: 1,
    offsetX: 0,
    offsetY: 0,
  }

  function getLabelData(asset) {
    const code = asset?.internalCode ? `INV-${asset.internalCode}` : ''
    const name = asset?.name || asset?.catalogItem?.name || 'Activo Fijo'
    const establishment = asset?.establishment?.name || ''
    const dependency = asset?.dependency?.name || ''
    const assetState = asset?.assetState?.name || ''
    return { code, name, establishment, dependency, assetState }
  }

  function normalizeScannedInternalCode(rawValue) {
    const raw = String(rawValue || '').trim()
    if (!raw) return null
    const direct = Number(raw)
    if (Number.isFinite(direct) && direct > 0) return Math.trunc(direct)
    const invMatch = raw.match(/INV[-_\s]?(\d{1,12})/i)
    if (invMatch?.[1]) return Number(invMatch[1])
    const anyDigits = raw.match(/(\d{1,12})/)
    if (anyDigits?.[1]) return Number(anyDigits[1])
    return null
  }

  function toPositiveIntOrNull(value) {
    const raw = String(value ?? '').trim()
    if (!raw) return null
    if (!/^\d+$/.test(raw)) return null
    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed <= 0) return null
    return parsed
  }

  function getSafeAssetId(assetLike) {
    return toPositiveIntOrNull(assetLike?.id)
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  async function downloadLabelPdf() {
    if (!createdAsset?.internalCode) return
    const label = getLabelData(createdAsset)
    const doc = new jsPDF({ unit: 'mm', format: [LABEL.widthMm, LABEL.heightMm] })
    const baseX = LABEL.marginMm + LABEL.offsetX
    const baseY = LABEL.marginMm + LABEL.offsetY
    const contentWidth = LABEL.widthMm - 2 * LABEL.marginMm
    const centerX = baseX + contentWidth / 2
    doc.setFontSize(8.8)
    doc.text(String(label.code || '').substring(0, 22), centerX, baseY + 3.2, { align: 'center' })
    const name = label.name || 'Activo Fijo'
    doc.setFontSize(8)
    doc.text(name.substring(0, 22), centerX, baseY + 6.3, { align: 'center' })
    doc.setFontSize(6.2)
    const metaLines = [
      label.establishment ? `Est: ${label.establishment.substring(0, 20)}` : null,
      label.dependency ? `Dep: ${label.dependency.substring(0, 20)}` : null,
      label.assetState ? `Estado: ${label.assetState.substring(0, 16)}` : null,
    ].filter(Boolean)
    let y = baseY + 8.6
    for (const line of metaLines.slice(0, 3)) {
      doc.text(line, centerX, y, { align: 'center' })
      y += 2.3
    }

    let qr = qrCodeUrl
    if (!qr) {
      qr = await QRCode.toDataURL(label.code, { margin: 1, width: 160 })
    }
    const barcode = buildBarcodeDataUrl(label.code)
    const qrSize = 8
    const barcodeWidth = 24
    const barcodeHeight = 5
    const mediaY = LABEL.heightMm - LABEL.marginMm - qrSize - 1 + LABEL.offsetY
    const qrX = baseX + (contentWidth - (qrSize + 1 + barcodeWidth)) / 2
    const qrY = mediaY
    const barcodeX = qrX + qrSize + 1
    const barcodeY = qrY + (qrSize - barcodeHeight) / 2
    doc.addImage(qr, 'PNG', qrX, qrY, qrSize, qrSize)
    doc.addImage(barcode, 'PNG', barcodeX, barcodeY, barcodeWidth, barcodeHeight)
    doc.save(`label_${label.code}.pdf`)
  }

  async function openPrintLabel() {
    if (!createdAsset?.internalCode) return
    const label = getLabelData(createdAsset)

    let qr = qrCodeUrl
    if (!qr) {
      qr = await QRCode.toDataURL(label.code, { margin: 1, width: 160 })
    }
    const barcode = buildBarcodeDataUrl(label.code)

    const win = window.open('', '_blank', 'width=480,height=420')
    if (!win) {
      setErr('El navegador bloqueó la ventana de impresión.')
      return
    }

    const metaLines = [
      label.establishment && `Est: ${escapeHtml(label.establishment)}`,
      label.dependency && `Dep: ${escapeHtml(label.dependency)}`,
      label.assetState && `Estado: ${escapeHtml(label.assetState)}`,
    ]
      .filter(Boolean)
      .map((line) => `<div>${line}</div>`)
      .join('')

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
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
    }
    .sheet {
      width: ${LABEL.widthMm - 2 * LABEL.marginMm}mm;
      height: ${LABEL.heightMm - 2 * LABEL.marginMm}mm;
      transform: translate(${LABEL.offsetX}mm, ${LABEL.offsetY}mm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      overflow: hidden;
    }
    .top {
      width: 100%;
      min-height: 16mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 0.6mm;
    }
    .code {
      font-weight: 700;
      font-size: 8.8px;
      line-height: 1.05;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .name {
      font-size: 8px;
      line-height: 1.05;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta {
      font-size: 6.3px;
      line-height: 1.05;
      color: #334155;
      width: 100%;
      display: grid;
      gap: 0.2mm;
    }
    .meta div {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .media {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.1mm;
      margin-bottom: 0.4mm;
    }
    .qr {
      width: 8mm;
      height: 8mm;
      border: 0.2mm solid #e2e8f0;
      padding: 0.25mm;
      object-fit: contain;
      background: #fff;
    }
    .barcode {
      width: 24mm;
      height: 5mm;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div class="code">${escapeHtml(label.code)}</div>
      <div class="name">${escapeHtml(label.name)}</div>
      <div class="meta">${metaLines}</div>
    </div>
    <div class="media">
      <img class="qr" src="${qr}" alt="QR" />
      <img class="barcode" src="${barcode}" alt="Barcode" />
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

  async function handleCreateAsset() {
    setAssetCreating(true)
    try {
      const errors = validateAssetForm()
      setAssetErrors(errors)
      if (Object.keys(errors).length) {
        setAssetCreating(false)
        return
      }
      const payload = {
        establishmentId: Number(assetForm.establishmentId),
        dependencyId: Number(assetForm.dependencyId),
        assetStateId: Number(assetForm.assetStateId),
        assetTypeId: Number(assetForm.assetTypeId),
        quantity: Number(assetForm.quantity),
        accountingAccount: assetForm.accountingAccount,
        acquisitionValue: Number(assetForm.acquisitionValue),
        acquisitionDate: assetForm.acquisitionDate,
      }
      if (assetForm.catalogItemId) payload.catalogItemId = Number(assetForm.catalogItemId)
      if (assetForm.name) payload.name = assetForm.name
      if (assetForm.brand) payload.brand = assetForm.brand
      if (assetForm.modelName) payload.modelName = assetForm.modelName
      if (assetForm.serialNumber) payload.serialNumber = assetForm.serialNumber
      if (assetHasResponsible) {
        if (assetForm.responsibleName) payload.responsibleName = assetForm.responsibleName
        if (assetForm.responsibleRut) payload.responsibleRut = normalizeRutValue(assetForm.responsibleRut)
        if (assetForm.responsibleRole) payload.responsibleRole = assetForm.responsibleRole
        if (assetForm.costCenter) payload.costCenter = normalizeCostCenterValue(assetForm.costCenter)
      }

      const created = await api('/assets', { method: 'POST', body: payload })
      let resolved = created
      const createdId = toPositiveIntOrNull(created?.id)
      if (createdId) {
        try {
          resolved = await api(`/assets/${createdId}`)
        } catch {
          // ignore
        }
      }
      setCreatedAsset(resolved)
      const resolvedId = toPositiveIntOrNull(resolved?.id)
      if (resolvedId) {
        localStorage.setItem('last_asset_id', String(resolvedId))
      }
      setOk('Activo fijo creado correctamente.')
      setAssetErrors({})
    } catch (err) {
      const message = getAssetCreateConflictMessage(
        err,
        'No se pudo crear el activo fijo. Verifica los datos e intenta nuevamente.'
      )
      setErr(
        withMappedError(
          err,
          message,
          'No se pudo crear el activo fijo. Verifica los datos e intenta nuevamente.'
        )
      )
    } finally {
      setAssetCreating(false)
    }
  }

  function openCatalogAction(type, assetOverride) {
    const target = assetOverride || createdAsset
    if (!target) {
      setErr('Primero debes crear el activo fijo.')
      return
    }
    if (assetOverride) {
      const overrideId = toPositiveIntOrNull(assetOverride.id)
      setCreatedAsset(assetOverride)
      if (overrideId) localStorage.setItem('last_asset_id', String(overrideId))
    }
    if (type === 'edit') setOk('Acción: editar activo fijo')
    if (type === 'move') setOk('Acción: mover activo fijo')
    if (type === 'transfer') setOk('Acción: transferir activo fijo')
    if (type === 'status') setOk('Acción: dar de baja')
    if (type === 'edit') {
      setEditAssetForm({
        name: target.name || '',
        quantity: target.quantity ?? '',
        brand: target.brand || '',
        modelName: target.modelName || '',
        serialNumber: target.serialNumber || '',
        accountingAccount: target.accountingAccount || '',
        analyticCode: target.analyticCode || '',
        responsibleName: target.responsibleName || '',
        responsibleRut: target.responsibleRut || '',
        responsibleRole: target.responsibleRole || '',
        costCenter: target.costCenter || '',
        acquisitionValue: target.acquisitionValue || '',
        acquisitionDate: target.acquisitionDate
          ? String(target.acquisitionDate).slice(0, 10)
          : '',
      })
    }
    if (type === 'move') {
      setMoveAssetForm({ toDependencyId: '' })
      const targetEstablishmentId = toPositiveIntOrNull(
        target?.establishmentId || target?.establishment?.id
      )
      if (!targetEstablishmentId) {
        setAssetDependencies([])
        setErr('El activo fijo no tiene establecimiento asociado para mover.')
      } else {
        loadAssetDependencies(targetEstablishmentId).catch((err) => {
          setAssetDependencies([])
          setErr(err)
        })
      }
    }
    if (type === 'transfer') {
      if (!isCentral) {
        setErr('Solo ADMIN_CENTRAL puede transferir activos fijos.')
        setCatalogAction(null)
        return
      }
      if (target.assetState?.name === 'BAJA' || target.isDeleted) {
        setErr('No puedes transferir un activo fijo dado de baja.')
        setCatalogAction(null)
        return
      }
      const transferReasons = movementReasonCodes.transfer || []
      setTransferAssetForm({
        toEstablishmentId: '',
        toDependencyId: '',
        reasonCode: transferReasons[0]?.code || '',
        docType: 'ACTA',
        note: '',
        file: null,
      })
      setTransferDependencies([])
      loadTransferEstablishmentsForAsset(target).catch((err) => setErr(err))
    }
    if (type === 'status') {
      if (target.assetState?.name === 'BAJA' || target.isDeleted) {
        setErr('El activo fijo ya esta dado de baja.')
        setCatalogAction(null)
        return
      }
      if (!assetStates.length) {
        setErr('No hay estados disponibles. Carga estados primero.')
        setCatalogAction(null)
        return
      }
      const baja = assetStates.find((s) => s.name === 'BAJA')
      setStatusAssetForm({
        assetStateId: baja ? String(baja.id) : '',
        reasonCode: '',
        docType: 'ACTA',
        note: '',
        file: null,
      })
      setEditAssetHasResponsible(
        Boolean(
          target.responsibleName ||
            target.responsibleRut ||
            target.responsibleRole ||
            target.costCenter
        )
      )
    }
    setCatalogAction(type)
  }

  async function resolveScannedAsset() {
    const normalizedCode = normalizeScannedInternalCode(scanInput)
    if (!normalizedCode) {
      setScanResult({
        status: 'error',
        message: 'Código QR inválido. Usa formato INV-123 o código numerico.',
      })
      return
    }
    try {
      const params = new URLSearchParams()
      params.set('internalCode', String(normalizedCode))
      params.set('take', '1')
      params.set('skip', '0')
      const data = await api(`/assets?${params.toString()}`)
      const asset = data?.items?.[0] || null
      if (!asset) {
        setScanResult({
          status: 'error',
          message: `No se encontro activo fijo para INV-${normalizedCode}.`,
        })
        return
      }
      setCreatedAsset(asset)
      setSelectedCatalogItem(asset?.catalogItem || null)
      const scannedAssetId = toPositiveIntOrNull(asset.id)
      if (scannedAssetId) {
        setLabelAssetId(String(scannedAssetId))
        localStorage.setItem('last_asset_id', String(scannedAssetId))
      }
      setScanResult({
        status: 'ok',
        message: `Activo fijo encontrado: INV-${asset.internalCode}.`,
      })
      setOk(`Activo fijo cargado desde QR: INV-${asset.internalCode}`)
    } catch (err) {
      setScanResult({
        status: 'error',
        message: err.message || 'No se pudo resolver el código escaneado.',
      })
    }
  }

  function selectAssetForModal(asset, action = null) {
    const assetId = getSafeAssetId(asset)
    if (!assetId) {
      setErr('Activo fijo inválido.')
      return
    }
    setCreatedAsset(asset)
    setSelectedCatalogItem(asset?.catalogItem || null)
    localStorage.setItem('last_asset_id', String(assetId))
    setCatalogModalOpen(true)
    setCatalogAction(null)
    if (action) {
      openCatalogAction(action, asset)
    }
  }

  async function submitEditAsset() {
    const assetId = getSafeAssetId(createdAsset)
    if (!assetId) return
    try {
      const payload = {
        name: editAssetForm.name || undefined,
        quantity:
          editAssetForm.quantity !== '' ? Number(editAssetForm.quantity) : undefined,
        brand: editAssetForm.brand || undefined,
        modelName: editAssetForm.modelName || undefined,
        serialNumber: editAssetForm.serialNumber || undefined,
        accountingAccount: editAssetForm.accountingAccount || undefined,
        analyticCode: editAssetForm.analyticCode || undefined,
        acquisitionValue:
          editAssetForm.acquisitionValue !== ''
            ? Number(editAssetForm.acquisitionValue)
            : undefined,
        acquisitionDate: editAssetForm.acquisitionDate || undefined,
      }
      if (editAssetHasResponsible) {
        payload.responsibleName = editAssetForm.responsibleName || undefined
        if (editAssetForm.responsibleRut) {
          const compact = String(editAssetForm.responsibleRut)
            .trim()
            .replace(/\./g, '')
            .replace(/\s+/g, '')
            .toUpperCase()
          if (!/^\d{7,8}-?[\dK]$/.test(compact)) {
            setErr('RUT responsable inválido. Usa formato 12345678-9')
            return
          }
        }
        payload.responsibleRut = editAssetForm.responsibleRut
          ? normalizeRutValue(editAssetForm.responsibleRut)
          : undefined
        payload.responsibleRole = editAssetForm.responsibleRole || undefined
        payload.costCenter = editAssetForm.costCenter
          ? normalizeCostCenterValue(editAssetForm.costCenter)
          : undefined
      } else {
        payload.responsibleName = ''
        payload.responsibleRut = ''
        payload.responsibleRole = ''
        payload.costCenter = ''
      }
      const updated = await api(`/assets/${assetId}`, {
        method: 'PUT',
        body: payload,
      })
      setCreatedAsset(updated)
      setOk('Activo fijo actualizado.')
      setCatalogAction(null)
    } catch (err) {
      setErr(err)
    }
  }

  async function submitMoveAsset() {
    const assetId = getSafeAssetId(createdAsset)
    if (!assetId) return
    if (!moveAssetForm.toDependencyId) {
      setErr('Selecciona una dependencia de destino.')
      return
    }
    try {
      const updated = await api(`/assets/${assetId}/relocate`, {
        method: 'PUT',
        body: { toDependencyId: Number(moveAssetForm.toDependencyId) },
      })
      setCreatedAsset(updated)
      setOk('Activo fijo movido correctamente.')
      setCatalogAction(null)
    } catch (err) {
      const message = getMoveConflictMessage(err, 'No se pudo mover el activo fijo.')
      setErr(withMappedError(err, message, 'No se pudo mover el activo fijo.'))
    }
  }

  async function submitTransferAsset() {
    const assetId = getSafeAssetId(createdAsset)
    if (!assetId) return
    if (!isCentral) {
      setErr('Solo ADMIN_CENTRAL puede transferir activos fijos.')
      return
    }
    if (!transferAssetForm.toEstablishmentId) {
      setErr('Selecciona establecimiento destino.')
      return
    }
    if (!transferAssetForm.toDependencyId) {
      setErr('Selecciona dependencia destino.')
      return
    }
    if (!transferAssetForm.reasonCode) {
      setErr('Selecciona motivo de transferencia.')
      return
    }
    if (!transferAssetForm.file) {
      setErr('Adjunta evidencia (PDF/JPG/PNG) para transferir.')
      return
    }
    try {
      const formData = new FormData()
      formData.append('toEstablishmentId', String(Number(transferAssetForm.toEstablishmentId)))
      formData.append('toDependencyId', String(Number(transferAssetForm.toDependencyId)))
      formData.append('reasonCode', transferAssetForm.reasonCode)
      formData.append('docType', transferAssetForm.docType)
      if (transferAssetForm.note) formData.append('note', transferAssetForm.note)
      formData.append('file', transferAssetForm.file)
      const updated = await apiMultipart(`/assets/${assetId}/transfer`, {
        method: 'PUT',
        formData,
      })
      setCreatedAsset(updated)
      setOk('Activo fijo transferido correctamente.')
      setCatalogAction(null)
      await loadAssetsList()
    } catch (err) {
      if (err?.status === 409) {
        try {
          const latest = await api(`/assets/${assetId}`)
          setCreatedAsset(latest)
          await loadAssetsList()
        } catch {
          // ignore secondary refresh error
        }
      }
      setErr(err)
    }
  }

  async function submitStatusAsset() {
    const assetId = getSafeAssetId(createdAsset)
    if (!assetId) return
    if (!statusAssetForm.assetStateId) {
      setErr('Selecciona estado.')
      return
    }
    if (String(createdAsset.assetStateId) === String(statusAssetForm.assetStateId)) {
      setErr('El activo fijo ya tiene ese estado.')
      return
    }
    if (!statusAssetForm.reasonCode) {
      setErr('Selecciona un motivo de baja.')
      return
    }
    if (!statusAssetForm.file) {
      setErr('Adjunta evidencia (PDF/JPG/PNG) para dar de baja.')
      return
    }
    try {
      const formData = new FormData()
      formData.append('assetStateId', String(Number(statusAssetForm.assetStateId)))
      formData.append('reasonCode', statusAssetForm.reasonCode)
      formData.append('docType', statusAssetForm.docType)
      if (statusAssetForm.note) formData.append('note', statusAssetForm.note)
      formData.append('file', statusAssetForm.file)
      const updated = await apiMultipart(`/assets/${assetId}/status`, {
        method: 'PUT',
        formData,
      })
      setCreatedAsset(updated)
      setOk('Estado actualizado.')
      setCatalogAction(null)
      setCatalogModalOpen(false)
    } catch (err) {
      if (err?.status === 409) {
        try {
          const latest = await api(`/assets/${assetId}`)
          setCreatedAsset(latest)
          setStatusAssetForm({
            assetStateId: String(latest?.assetStateId || ''),
            reasonCode: '',
            docType: 'ACTA',
            note: '',
            file: null,
          })
          await loadAssetsList()
        } catch {
          // ignore secondary refresh error
        }
      }
      setErr(err)
    }
  }


  function applyCatalogItem(selected) {
    if (!selected) {
      setErr('No se encontro el item de catálogo seleccionado.')
      return
    }
    setSelectedCatalogItem(selected)
    setCatalogModalOpen(true)
    setAssetForm((prev) => ({
      ...prev,
      catalogItemId: String(selected.id || ''),
      name: selected.name || '',
      brand: selected.brand || '',
      modelName: selected.modelName || '',
    }))
    setOk(`Catálogo seleccionado: ${formatCatalogItemDisplay(selected)}`)
  }

  function extractCatalogDetail(description) {
    const text = String(description || '')
    const match = text.match(/Detalle:\s*([^|]+)/i)
    return match?.[1]?.trim() || ''
  }

  function formatCatalogItemDisplay(item) {
    if (!item) return ''
    const parts = [item.name, item.brand, item.modelName]
      .map((v) => String(v || '').trim())
      .filter(Boolean)
    const detail = extractCatalogDetail(item.description)
    if (detail) parts.push(detail)
    if (parts.length) return parts.join(' / ')
    return [item.name, item.category].filter(Boolean).join(' · ')
  }

  function uniqueById(items) {
    const map = new Map()
    for (const item of items || []) {
      const id = item?.id
      if (id === undefined || id === null) continue
      if (!map.has(id)) map.set(id, item)
    }
    return Array.from(map.values())
  }

  function handleSelectCatalogItem(value) {
    if (!value) {
      setSelectedCatalogItem(null)
      setAssetForm((prev) => ({
        ...prev,
        catalogItemId: '',
      }))
      return
    }
    const selected = assetCatalogItems.find((i) => String(i.id) === String(value))
    applyCatalogItem(selected)
  }

  function formatDateInput(dateValue) {
    const date = new Date(dateValue)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  function applyAuditRangePreset(target, preset) {
    const now = new Date()
    const toDate = formatDateInput(now)
    const from = new Date(now)
    if (preset === 'WEEK') from.setDate(now.getDate() - 6)
    if (preset === 'MONTH') from.setDate(now.getDate() - 29)
    if (preset === 'YEAR') from.setDate(now.getDate() - 364)
    const fromDate = formatDateInput(from)

    if (target === 'admin') {
      setAuditFilters((prev) => ({ ...prev, fromDate, toDate }))
      return
    }
    setLoginAuditFilters((prev) => ({ ...prev, fromDate, toDate }))
  }

  function buildAdminAuditParams(filters = auditFilters) {
    const params = new URLSearchParams()
    if (filters.entityType) params.set('entityType', filters.entityType)
    if (filters.action) params.set('action', filters.action)
    if (filters.fromDate) params.set('fromDate', filters.fromDate)
    if (filters.toDate) params.set('toDate', filters.toDate)
    return params
  }

  function buildLoginAuditParams(filters = loginAuditFilters) {
    const params = new URLSearchParams()
    if (filters.email) params.set('email', filters.email)
    if (filters.success !== '') params.set('success', filters.success)
    if (filters.fromDate) params.set('fromDate', filters.fromDate)
    if (filters.toDate) params.set('toDate', filters.toDate)
    return params
  }

  function resetAdminAuditFilters() {
    const defaults = {
      entityType: '',
      action: '',
      fromDate: '',
      toDate: '',
    }
    setAuditFilters(defaults)
    setAdminAuditPage(1)
    loadAdminAudits(1, defaults)
  }

  function resetLoginAuditFilters() {
    const defaults = {
      email: '',
      success: '',
      fromDate: '',
      toDate: '',
    }
    setLoginAuditFilters(defaults)
    setLoginAuditPage(1)
    loadLoginAudits(1, defaults)
  }

  async function loadAdminAudits(page = adminAuditPage, filters = auditFilters) {
    setAdminAuditLoading(true)
    try {
      const take = 20
      const safePage = Number(page)
      const nextPage = Number.isFinite(safePage) && safePage > 0 ? safePage : 1
      const skip = (nextPage - 1) * take
      const params = buildAdminAuditParams(filters)
      params.set('take', String(take))
      params.set('skip', String(skip))
      const data = await api(`/admin/audit?${params.toString()}`)
      setAdminAudits(data.items || [])
      setAdminAuditTotal(data.total || 0)
      setAdminAuditPage(nextPage)
    } catch (err) {
      setErr(err)
      setAdminAudits([])
      setAdminAuditTotal(0)
    } finally {
      setAdminAuditLoading(false)
    }
  }

  async function loadLoginAudits(page = loginAuditPage, filters = loginAuditFilters) {
    setLoginAuditLoading(true)
    try {
      const take = 20
      const safePage = Number(page)
      const nextPage = Number.isFinite(safePage) && safePage > 0 ? safePage : 1
      const skip = (nextPage - 1) * take
      const params = buildLoginAuditParams(filters)
      params.set('take', String(take))
      params.set('skip', String(skip))
      const data = await api(`/admin/login-audit?${params.toString()}`)
      setLoginAudits(data.items || [])
      setLoginAuditTotal(data.total || 0)
      setLoginAuditPage(nextPage)
    } catch (err) {
      setErr(err)
      setLoginAudits([])
      setLoginAuditTotal(0)
    } finally {
      setLoginAuditLoading(false)
    }
  }

  async function runAuditCleanup() {
    const modeDescription =
      auditCleanupForm.mode === 'DELETE_ALL'
        ? 'Se borrara todo el historial del alcance seleccionado.'
        : auditCleanupForm.mode === 'BEFORE_DATE'
          ? `Se borraran registros anteriores a ${auditCleanupForm.beforeDate || '(sin fecha)'}.`
          : `Se conservaran solo los ultimos ${auditCleanupForm.keepDays} dias.`

    openConfirm({
      title: 'Confirmar limpieza de auditoria',
      message: modeDescription,
      onConfirm: async () => {
        const body = {
          scope: auditCleanupForm.scope,
          mode: auditCleanupForm.mode,
        }
        if (auditCleanupForm.mode === 'BEFORE_DATE') body.beforeDate = auditCleanupForm.beforeDate
        if (auditCleanupForm.mode === 'KEEP_DAYS') body.keepDays = Number(auditCleanupForm.keepDays)

        try {
          const result = await api('/admin/audit/cleanup', {
            method: 'POST',
            body,
          })
          setOk(
            `Limpieza auditoria completada. Admin: ${result.deleted?.adminAudit || 0}, Login: ${
              result.deleted?.loginAudit || 0
            }`
          )
          await Promise.all([loadAdminAudits(), loadLoginAudits(), loadLoginMetrics()])
        } catch (err) {
          setErr(err)
        } finally {
          closeConfirm()
        }
      },
    })
  }

  async function loadLoginMetrics() {
    const params = new URLSearchParams()
    if (metricsFilters.fromDate) params.set('fromDate', metricsFilters.fromDate)
    if (metricsFilters.toDate) params.set('toDate', metricsFilters.toDate)
    if (metricsFilters.hourFrom !== '') params.set('hourFrom', metricsFilters.hourFrom)
    if (metricsFilters.hourTo !== '') params.set('hourTo', metricsFilters.hourTo)
    const qs = params.toString()
    const base = qs ? `?${qs}` : ''
    const data = await api(`/admin/login-audit/metrics${base}`)
    const hourly = await api(`/admin/login-audit/metrics/hourly${base}`)
    const byIp = await api(`/admin/login-audit/metrics/ip${base}`)
    const byUser = await api(`/admin/login-audit/metrics/user${base}`)
    setLoginMetrics(data.items || [])
    setLoginMetricsHourly(hourly.items || [])
    setLoginMetricsByIp(byIp.items || [])
    setLoginMetricsByUser(byUser.items || [])
  }

  function buildPlanchetaQuery() {
    const params = new URLSearchParams()
    if (!planchetaFilters.establishmentId) return ''
    params.set('establishmentId', planchetaFilters.establishmentId)
    if (planchetaFilters.dependencyId) params.set('dependencyId', planchetaFilters.dependencyId)
    if (planchetaFilters.fromDate) params.set('fromDate', planchetaFilters.fromDate)
    if (planchetaFilters.toDate) params.set('toDate', planchetaFilters.toDate)
    if (planchetaFilters.responsibleName)
      params.set('responsibleName', planchetaFilters.responsibleName)
    if (planchetaFilters.chiefName) params.set('chiefName', planchetaFilters.chiefName)
    if (planchetaFilters.ministryText) params.set('ministryText', planchetaFilters.ministryText)
    params.set('includeHistory', planchetaFilters.includeHistory ? 'true' : 'false')
    return params.toString()
  }

  async function loadPlanchetaInstitutions() {
    setLoadingPlancheta(true)
    try {
      const data = await api('/catalog/institutions?take=100&includeInactive=true')
      setPlanchetaInstitutions(data.items || [])
      if (!(data.items || []).length) {
        setPlanchetaMessage(
          'No hay instituciónes disponibles. Crea estructura base antes de usar planchetas.'
        )
      } else {
        setPlanchetaMessage('')
      }
    } catch (err) {
      setPlanchetaMessage(err.message)
      setErr(err)
    } finally {
      setLoadingPlancheta(false)
    }
  }

  async function loadPlanchetaEstablishments(institutionId) {
    if (!institutionId) {
      setPlanchetaEstablishments([])
      return
    }
    try {
      const params = new URLSearchParams()
      params.set('institutionId', String(institutionId))
      params.set('take', '100')
      params.set('includeInactive', 'true')
      const data = await api(`/catalog/establishments?${params.toString()}`)
      setPlanchetaEstablishments(data.items || [])
      if (!(data.items || []).length) {
        setPlanchetaMessage('No hay establecimientos en esta institución.')
      } else {
        setPlanchetaMessage('')
      }
    } catch (err) {
      setPlanchetaEstablishments([])
      setPlanchetaMessage(err.message || 'No se pudieron cargar establecimientos.')
      setErr(err.message || 'No se pudieron cargar establecimientos.')
    }
  }

  async function loadPlanchetaDependencies(establishmentId) {
    if (!establishmentId) {
      setPlanchetaDependencies([])
      return
    }
    try {
      const params = new URLSearchParams()
      params.set('establishmentId', String(establishmentId))
      params.set('take', '100')
      params.set('includeInactive', 'true')
      const data = await api(`/catalog/dependencies?${params.toString()}`)
      const items = data.items || []
      setPlanchetaDependencies(items)
      if (!items.length) {
        setPlanchetaMessage('No hay dependencias en este establecimiento.')
      } else if (planchetaMessage === 'No hay dependencias en este establecimiento.') {
        setPlanchetaMessage('')
      }
    } catch (err) {
      setPlanchetaDependencies([])
      setErr(err.message || 'No se pudieron cargar dependencias.')
    }
  }

  async function loadPlanchetaPreview() {
    const qs = buildPlanchetaQuery()
    if (!qs) {
      setPlanchetaMessage('Selecciona establecimiento para previsualizar.')
      setPlanchetaPreview([])
      setPlanchetaSummary([])
      return
    }
    setPlanchetaPreviewLoading(true)
    try {
      const data = await api(`/planchetas?${qs}`)
      const items = data.items || []
      const summary = data.summary || []
      setPlanchetaPreview(items)
      setPlanchetaSummary(summary)
      if (!items.length) {
        setPlanchetaMessage(
          'No hay activos fijos para ese filtro. Carga activos fijos en la dependencia y vuelve a intentar.'
        )
      } else {
        setPlanchetaMessage('')
      }
    } catch (err) {
      setPlanchetaPreview([])
      setPlanchetaSummary([])
      const message = getPlanchetaErrorMessage(err, 'No se pudo cargar la previsualizacion.')
      setPlanchetaMessage(message)
      setErr(message)
    } finally {
      setPlanchetaPreviewLoading(false)
    }
  }

  function formatPlanchetaMovement(movement) {
    const typeMap = {
      INVENTORY_CHECK: 'Registro inicial',
      TRANSFER: 'Transferencia',
      STATUS_CHANGE: 'Cambio de estado',
      RELOCATION: 'Reubicación',
    }
    const typeLabel = typeMap[movement?.type] || movement?.type || 'Movimiento'
    const reason = movement?.reasonCode || movement?.reason || 'sin motivo'
    return `${typeLabel} (${reason})`
  }

  async function downloadPlancheta(kind) {
    const qs = buildPlanchetaQuery()
    if (!qs) {
      const msg = 'Selecciona establecimiento para descargar plancheta.'
      setPlanchetaMessage(msg)
      setErr(msg)
      return
    }
    const path = kind === 'excel' ? `/planchetas/excel?${qs}` : `/planchetas/pdf?${qs}`
    const filename = kind === 'excel' ? 'plancheta.xlsx' : 'plancheta.pdf'
    try {
      await downloadFile(path, filename)
    } catch (err) {
      const message = getPlanchetaErrorMessage(
        err,
        `No se pudo descargar plancheta ${kind.toUpperCase()}.`
      )
      setPlanchetaMessage(message)
      setErr(err, message)
    }
  }

  useEffect(() => {
    if (!isAuthed) return
    if (activeTab === 'institutions') {
      if (isCentral) {
        loadInstitutions(1)
      } else {
        loadInstitutionCatalog()
      }
    }
    if (activeTab === 'establishments') {
      if (isCentral) {
        loadInstitutionCatalog()
        loadEstablishments(1)
      } else if (currentUser?.institutionId) {
        loadEstablishmentCatalog(currentUser.institutionId)
      }
    }
    if (activeTab === 'dependencies') {
      if (isCentral) {
        loadInstitutionCatalog()
        loadEstablishmentCatalog()
        loadDependencies(1)
      } else if (currentUser?.establishmentId) {
        loadDependencyCatalog(currentUser.establishmentId)
      }
    }
    if (activeTab === 'users' && isCentral) {
      loadInstitutionCatalog()
      loadEstablishmentCatalog()
      loadUsersAdmin(1)
      loadUserAssignmentOptions()
    }
    if (activeTab === 'assistant' && isCentral) {
      loadInstitutionCatalog()
      loadEstablishmentCatalog(assistantScope.institutionId)
      if (assistantScope.establishmentId) {
        loadDependencyCatalog(assistantScope.establishmentId)
      } else {
        setDependenciesCatalog([])
      }
      loadSupportRequests(1)
    }
    if (activeTab === 'imports' && importsView === 'assets') loadImportHistory(1)
    if (activeTab === 'assets') {
      loadAssetStates()
      loadMovementReasonCodes()
      loadAssetTypes()
      loadCatalogItems()
      loadAssetsList()
    }
    if (activeTab === 'imports' && importsView === 'catalog') {
      loadCatalogAdminItems(1)
    }
    if (activeTab === 'trash') {
      loadMovementReasonCodes()
      loadTrash()
    }
    if (activeTab === 'audit') {
      loadAdminAudits()
      loadLoginAudits()
      loadLoginMetrics()
    }
    if (activeTab === 'planchetas') {
      loadPlanchetaInstitutions()
      setPlanchetaPreview([])
    }
  }, [activeTab, importsView, isAuthed, isCentral, currentUser?.institutionId, currentUser?.establishmentId])

  useEffect(() => {
    if (!isAuthed) return
    if (activeTab !== 'institutions' && activeTab !== 'assets' && activeTab !== 'planchetas') {
      return
    }
    loadInstitutionCatalog()
  }, [isAuthed, activeTab])

  useEffect(() => {
    if (!isAuthed || activeTab !== 'planchetas') return
    if (!planchetaFilters.institutionId) {
      setPlanchetaEstablishments([])
      return
    }
    loadPlanchetaEstablishments(planchetaFilters.institutionId)
  }, [isAuthed, activeTab, planchetaFilters.institutionId])

  useEffect(() => {
    if (!isAuthed || activeTab !== 'planchetas') return
    if (!planchetaFilters.establishmentId) {
      setPlanchetaDependencies([])
      return
    }
    loadPlanchetaDependencies(planchetaFilters.establishmentId)
  }, [isAuthed, activeTab, planchetaFilters.establishmentId])

  useEffect(() => {
    if (!isAuthed) return
    if (activeTab !== 'establishments') return
    loadEstablishmentCatalog(estForm.institutionId)
  }, [isAuthed, estForm.institutionId, activeTab])

  useEffect(() => {
    if (!isAuthed) return
    if (activeTab !== 'dependencies') return
    loadDependencyCatalog(depForm.establishmentId)
  }, [isAuthed, depForm.establishmentId, activeTab])

  useEffect(() => {
    if (!isAuthed || activeTab !== 'assistant' || !isCentral) return
    loadEstablishmentCatalog(assistantScope.institutionId)
    setAssistantScope((prev) => ({ ...prev, establishmentId: '', dependencyId: '' }))
    setDependenciesCatalog([])
  }, [isAuthed, activeTab, isCentral, assistantScope.institutionId])

  useEffect(() => {
    if (!isAuthed || activeTab !== 'assistant' || !isCentral) return
    if (!assistantScope.establishmentId) {
      setDependenciesCatalog([])
      setAssistantScope((prev) => ({ ...prev, dependencyId: '' }))
      return
    }
    loadDependencyCatalog(assistantScope.establishmentId)
    setAssistantScope((prev) => ({ ...prev, dependencyId: '' }))
  }, [isAuthed, activeTab, isCentral, assistantScope.establishmentId])

  useEffect(() => {
    if (!isAuthed) return
    if (activeTab !== 'assets') return
    if (!assetInstitutionId) {
      setAssetEstablishments([])
      return
    }
    loadAssetEstablishments(assetInstitutionId)
  }, [isAuthed, assetInstitutionId, activeTab])

  useEffect(() => {
    if (!isAuthed) return
    if (activeTab !== 'assets') return
    if (!assetForm.establishmentId) {
      setAssetDependencies([])
      return
    }
    loadAssetDependencies(assetForm.establishmentId)
  }, [isAuthed, assetForm.establishmentId, activeTab])

  useEffect(() => {
    if (!isAuthed) return
    if (activeTab !== 'assets') return
    loadAssetListEstablishments(assetListFilters.institutionId)
  }, [isAuthed, activeTab, assetListFilters.institutionId])

  useEffect(() => {
    if (!isAuthed) return
    if (activeTab !== 'assets') return
    if (!assetListFilters.establishmentId) {
      setAssetListDependencies([])
      return
    }
    loadAssetListDependencies(assetListFilters.establishmentId)
  }, [isAuthed, activeTab, assetListFilters.establishmentId])

  useEffect(() => {
    if (!isAuthed || !isCentral) return
    if (activeTab !== 'users') return

    if (usersSearchDebounceRef.current) {
      clearTimeout(usersSearchDebounceRef.current)
    }
    usersSearchDebounceRef.current = setTimeout(() => {
      loadUsersAdmin(1)
    }, 320)

    return () => {
      if (usersSearchDebounceRef.current) {
        clearTimeout(usersSearchDebounceRef.current)
        usersSearchDebounceRef.current = null
      }
    }
  }, [
    isAuthed,
    isCentral,
    activeTab,
    userFilters.q,
    userFilters.roleType,
    userFilters.institutionId,
    userFilters.establishmentId,
    userFilters.includeInactive,
  ])

  useEffect(() => {
    if (!isAuthed) return
    if (activeTab !== 'assets') return

    if (assetSearchDebounceRef.current) {
      clearTimeout(assetSearchDebounceRef.current)
    }
    assetSearchDebounceRef.current = setTimeout(() => {
      loadAssetsList(1)
    }, 320)

    return () => {
      if (assetSearchDebounceRef.current) {
        clearTimeout(assetSearchDebounceRef.current)
        assetSearchDebounceRef.current = null
      }
    }
  }, [
    isAuthed,
    activeTab,
    assetListFilters.id,
    assetListFilters.internalCode,
    assetListFilters.q,
    assetListFilters.responsibleName,
    assetListFilters.costCenter,
    assetListFilters.institutionId,
    assetListFilters.establishmentId,
    assetListFilters.dependencyId,
    assetListFilters.assetStateId,
    assetListFilters.includeDeleted,
    assetListFilters.fromDate,
    assetListFilters.toDate,
  ])

  useEffect(() => {
    if (!isAuthed) return
    const lastId = localStorage.getItem('last_asset_id')
    if (!lastId) return
    const safeLastId = toPositiveIntOrNull(lastId)
    if (!safeLastId) {
      localStorage.removeItem('last_asset_id')
      return
    }
    api(`/assets/${safeLastId}`)
      .then((asset) => setCreatedAsset(asset))
      .catch(() => {
        localStorage.removeItem('last_asset_id')
      })
  }, [isAuthed])

  useEffect(() => {
    if (!createdAsset?.internalCode) {
      setQrCodeUrl('')
      return
    }
    const value = `INV-${createdAsset.internalCode}`
    QRCode.toDataURL(value, { margin: 1, width: 180 })
      .then((url) => setQrCodeUrl(url))
      .catch(() => setQrCodeUrl(''))
    const el = document.getElementById('barcode-preview')
    if (el) {
      try {
        JsBarcode(el, value, {
          format: 'CODE128',
          displayValue: true,
          height: 48,
          margin: 0,
        })
      } catch {
        // ignore barcode errors
      }
    }
  }, [createdAsset])

  useEffect(() => {
    return () => {
      Object.values(catalogKeyCheckTimers.current).forEach((timerId) => {
        clearTimeout(timerId)
      })
      if (assetSearchDebounceRef.current) {
        clearTimeout(assetSearchDebounceRef.current)
        assetSearchDebounceRef.current = null
      }
      if (usersSearchDebounceRef.current) {
        clearTimeout(usersSearchDebounceRef.current)
        usersSearchDebounceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const safeAssetId = getSafeAssetId(createdAsset)
    if (!safeAssetId) {
      setAssetMovements([])
      setAssetEvidence([])
      setEvidenceForm({ movementId: '', docType: 'ACTA', note: '', file: null })
      return
    }
    loadAssetMovements(safeAssetId)
    loadAssetEvidence(safeAssetId)
  }, [createdAsset?.id])

  useEffect(() => {
    setDepForm((prev) => ({ ...prev, establishmentId: '' }))
  }, [estForm.institutionId])

  async function createInstitution() {
    try {
      if (!instForm.name.trim()) {
        setFormErrors((prev) => ({ ...prev, instName: 'Nombre requerido.' }))
        return
      }
      const created = await api('/admin/institutions', {
        method: 'POST',
        body: instForm,
      })
      setInstForm({ name: '' })
      await Promise.all([loadInstitutions(), loadInstitutionCatalog()])
      setOk(`Institución creada: ${created.name}`)
    } catch (err) {
      setErr(err)
    }
  }

  async function updateInstitution(payload) {
    try {
      if (!payload.name || !payload.name.trim()) {
        setFormErrors((prev) => ({ ...prev, instEdit: 'Nombre requerido.' }))
        return
      }
      await api(`/admin/institutions/${payload.id}`, {
        method: 'PUT',
        body: { name: payload.name },
      })
      await loadInstitutions()
      setOk('Institución actualizada.')
    } catch (err) {
      setErr(err)
    }
  }

  async function deleteInstitution(id) {
    openConfirm({
      title: 'Dar de baja institución',
      message: 'La institución quedara inactiva pero no se eliminara.',
      onConfirm: async () => {
        try {
          await api(`/admin/institutions/${id}`, { method: 'DELETE' })
          await loadInstitutions()
          setOk('Institución dada de baja.')
        } catch (err) {
          const message = getInstitutionConflictMessage(err, 'No se pudo dar de baja la institución.')
          setErr(withMappedError(err, message, 'No se pudo dar de baja la institución.'))
        } finally {
          closeConfirm()
        }
      },
    })
  }

  async function reactivateInstitution(id) {
    try {
      await api(`/admin/institutions/${id}/reactivate`, { method: 'PUT' })
      await Promise.all([loadInstitutions(), loadInstitutionCatalog()])
      setOk('Institución reactivada.')
    } catch (err) {
      const message = getInstitutionConflictMessage(err, 'No se pudo reactivar la institución.')
      setErr(withMappedError(err, message, 'No se pudo reactivar la institución.'))
    }
  }

  async function hardDeleteInstitution(id) {
    openConfirm({
      title: 'Eliminar institucion definitivamente',
      message:
        'Esta accion es irreversible. Se eliminara definitivamente si no tiene relaciones.',
      onConfirm: async () => {
        try {
          await api(`/admin/institutions/${id}/permanent`, { method: 'DELETE' })
          await loadInstitutions()
          setOk('Institucion eliminada definitivamente.')
        } catch (err) {
          const message = getInstitutionConflictMessage(
            err,
            'No se pudo eliminar definitivamente la institucion.'
          )
          setErr(withMappedError(err, message, 'No se pudo eliminar definitivamente la institucion.'))
        } finally {
          closeConfirm()
        }
      },
    })
  }

  async function createEstablishment() {
    try {
      if (!estForm.name.trim()) {
        setFormErrors((prev) => ({ ...prev, estName: 'Nombre requerido.' }))
        return
      }
      if (!estForm.type.trim()) {
        setFormErrors((prev) => ({ ...prev, estType: 'Tipo requerido.' }))
        return
      }
      if (!Number(estForm.institutionId)) {
        setFormErrors((prev) => ({
          ...prev,
          estInstitutionId: 'Institution ID inválido.',
        }))
        return
      }
      const created = await api('/admin/establishments', {
        method: 'POST',
        body: {
          name: estForm.name,
          type: estForm.type,
          ...(estForm.rbd ? { rbd: estForm.rbd.trim() } : {}),
          ...(estForm.commune ? { commune: estForm.commune.trim() } : {}),
          institutionId: Number(estForm.institutionId),
        },
      })
      const createdInstitutionId = Number(estForm.institutionId)
      setEstForm({ name: '', type: '', rbd: '', commune: '', institutionId: '' })
      await Promise.all([
        loadEstablishments(),
        loadEstablishmentCatalog(createdInstitutionId),
        loadInstitutionCatalog(),
      ])
      setOk(`Establecimiento creado: ${created.name}`)
    } catch (err) {
      setErr(err)
    }
  }

  async function updateEstablishment(payload) {
    try {
      if (payload.name !== undefined && payload.name !== '' && !payload.name.trim()) {
        setFormErrors((prev) => ({ ...prev, estEdit: 'Nombre inválido.' }))
        return
      }
      await api(`/admin/establishments/${payload.id}`, {
        method: 'PUT',
        body: {
          name: payload.name || undefined,
          type: payload.type || undefined,
          institutionId: payload.institutionId
            ? Number(payload.institutionId)
            : undefined,
        },
      })
      await loadEstablishments()
      setOk('Establecimiento actualizado.')
    } catch (err) {
      setErr(err)
    }
  }

  async function deleteEstablishment(id) {
    openConfirm({
      title: 'Dar de baja establecimiento',
      message: 'El establecimiento quedara inactivo pero no se eliminara.',
      onConfirm: async () => {
        try {
          const result = await api(`/admin/establishments/${id}`, { method: 'DELETE' })
          await loadEstablishments()
          const autoDeps = Number(result?.autoDeactivatedDependencies || 0)
          if (autoDeps > 0) {
            setOk(`Establecimiento dado de baja. Dependencias auto-desactivadas: ${autoDeps}.`)
          } else {
            setOk('Establecimiento dado de baja.')
          }
        } catch (err) {
          const message = getEstablishmentConflictMessage(
            err,
            'No se pudo dar de baja el establecimiento.'
          )
          setErr(withMappedError(err, message, 'No se pudo dar de baja el establecimiento.'))
        } finally {
          closeConfirm()
        }
      },
    })
  }

  async function reactivateEstablishment(id) {
    try {
      await api(`/admin/establishments/${id}/reactivate`, { method: 'PUT' })
      await loadEstablishments()
      setOk('Establecimiento reactivado.')
    } catch (err) {
      const message = getEstablishmentConflictMessage(
        err,
        'No se pudo reactivar el establecimiento.'
      )
      setErr(withMappedError(err, message, 'No se pudo reactivar el establecimiento.'))
    }
  }

  async function hardDeleteEstablishment(id) {
    openConfirm({
      title: 'Eliminar establecimiento definitivamente',
      message:
        'Esta accion es irreversible. Se eliminara definitivamente si no tiene relaciones.',
      onConfirm: async () => {
        try {
          await api(`/admin/establishments/${id}/permanent`, { method: 'DELETE' })
          await loadEstablishments()
          setOk('Establecimiento eliminado definitivamente.')
        } catch (err) {
          const message = getEstablishmentConflictMessage(
            err,
            'No se pudo eliminar definitivamente el establecimiento.'
          )
          setErr(
            withMappedError(
              err,
              message,
              'No se pudo eliminar definitivamente el establecimiento.'
            )
          )
        } finally {
          closeConfirm()
        }
      },
    })
  }

  async function createDependency() {
    try {
      if (!depForm.name.trim()) {
        setFormErrors((prev) => ({ ...prev, depName: 'Nombre requerido.' }))
        return
      }
      if (!Number(depForm.establishmentId)) {
        setFormErrors((prev) => ({
          ...prev,
          depEstablishmentId: 'Establishment ID inválido.',
        }))
        return
      }
      const created = await api('/admin/dependencies', {
        method: 'POST',
        body: {
          name: depForm.name,
          establishmentId: Number(depForm.establishmentId),
        },
      })
      const createdEstablishmentId = Number(depForm.establishmentId)
      setDepForm({ name: '', establishmentId: '' })
      await Promise.all([
        loadDependencies(),
        loadDependencyCatalog(createdEstablishmentId),
        loadEstablishmentCatalog(),
      ])
      setOk(`Dependencia creada: ${created.name}`)
    } catch (err) {
      setErr(err)
    }
  }

  async function updateDependency(payload) {
    try {
      if (payload.name !== undefined && payload.name !== '' && !payload.name.trim()) {
        setFormErrors((prev) => ({ ...prev, depEdit: 'Nombre inválido.' }))
        return
      }
      await api(`/admin/dependencies/${payload.id}`, {
        method: 'PUT',
        body: {
          name: payload.name || undefined,
          establishmentId: payload.establishmentId
            ? Number(payload.establishmentId)
            : undefined,
        },
      })
      await loadDependencies()
      setOk('Dependencia actualizada.')
    } catch (err) {
      setErr(err)
    }
  }

  async function deleteDependency(id) {
    openConfirm({
      title: 'Dar de baja dependencia',
      message: 'La dependencia quedara inactiva pero no se eliminara.',
      onConfirm: async () => {
        try {
          await api(`/admin/dependencies/${id}`, { method: 'DELETE' })
          await loadDependencies()
          setOk('Dependencia dada de baja.')
        } catch (err) {
          const message = getDependencyConflictMessage(err, 'No se pudo dar de baja la dependencia.')
          setErr(withMappedError(err, message, 'No se pudo dar de baja la dependencia.'))
        } finally {
          closeConfirm()
        }
      },
    })
  }

  async function replicateDependenciesFromBase() {
    try {
      setDepReplicateResult(null)
      const sourceEstablishmentId = Number(depReplicateForm.sourceEstablishmentId)
      const targetEstablishmentId = Number(depReplicateForm.targetEstablishmentId)
      if (!sourceEstablishmentId || sourceEstablishmentId <= 0) {
        setErr('Selecciona establecimiento origen válido.')
        return
      }
      if (!targetEstablishmentId || targetEstablishmentId <= 0) {
        setErr('Selecciona establecimiento destino válido.')
        return
      }
      if (sourceEstablishmentId === targetEstablishmentId) {
        setErr('Origen y destino deben ser distintos.')
        return
      }

      const result = await api('/admin/dependencies/replicate', {
        method: 'POST',
        body: {
          sourceEstablishmentId,
          targetEstablishmentId,
          includeInactive: depReplicateForm.includeInactive,
        },
      })
      await loadDependencies(1)
      const createdCount = Number(result?.createdCount || 0)
      const skippedCount = Number(result?.skippedCount || 0)
      setDepReplicateResult({
        sourceEstablishmentName: result?.sourceEstablishmentName || '-',
        targetEstablishmentName: result?.targetEstablishmentName || '-',
        sourceCount: Number(result?.sourceCount || 0),
        createdCount,
        skippedCount,
        skipped: Array.isArray(result?.skipped) ? result.skipped : [],
      })
      setOk(
        `Replicación completada. Creadas: ${createdCount}. Omitidas: ${skippedCount}.`
      )
    } catch (err) {
      setDepReplicateResult(null)
      setErr(err)
    }
  }

  async function reactivateDependency(id) {
    try {
      await api(`/admin/dependencies/${id}/reactivate`, { method: 'PUT' })
      await loadDependencies()
      setOk('Dependencia reactivada.')
    } catch (err) {
      const message = getDependencyConflictMessage(err, 'No se pudo reactivar la dependencia.')
      setErr(withMappedError(err, message, 'No se pudo reactivar la dependencia.'))
    }
  }

  async function hardDeleteDependency(id) {
    openConfirm({
      title: 'Eliminar dependencia definitivamente',
      message:
        'Esta accion es irreversible. Se eliminara definitivamente si no tiene relaciones.',
      onConfirm: async () => {
        try {
          await api(`/admin/dependencies/${id}/permanent`, { method: 'DELETE' })
          await loadDependencies()
          setOk('Dependencia eliminada definitivamente.')
        } catch (err) {
          const message = getDependencyConflictMessage(
            err,
            'No se pudo eliminar definitivamente la dependencia.'
          )
          setErr(withMappedError(err, message, 'No se pudo eliminar definitivamente la dependencia.'))
        } finally {
          closeConfirm()
        }
      },
    })
  }

  const tabs = [
    { id: 'institutions', label: 'Instituciónes' },
    { id: 'establishments', label: 'Establecimientos' },
    { id: 'dependencies', label: 'Dependencias' },
    { id: 'users', label: 'Usuarios' },
    { id: 'assistant', label: 'Asistente Central' },
    { id: 'assets', label: 'Activos Fijos' },
    { id: 'trash', label: 'Basurero' },
    { id: 'imports', label: 'Importaciones' },
    { id: 'planchetas', label: 'Planchetas' },
    { id: 'audit', label: 'Auditoria Admin' },
  ]
  const miniManualByTab = {
    institutions: {
      title: 'Instituciónes',
      steps: [
        'Crear institución con nombre oficial.',
        'Editar inline y guardar cambios.',
        'Dar de baja solo si no tiene establecimientos activos.',
        'Usar Mostrar inactivos para reactivar.',
      ],
    },
    establishments: {
      title: 'Establecimientos',
      steps: [
        'Seleccionar institución y crear establecimiento.',
        'Completar tipo, RBD, comuna y datos administrativos.',
        'Editar inline y guardar.',
        'Dar de baja/reactivar respetando reglas de dependencias activas.',
      ],
    },
    dependencies: {
      title: 'Dependencias',
      steps: [
        'Elegir establecimiento para crear la dependencia.',
        'Verificar que el nombre identifique sala/oficina/bodega.',
        'Usar replicar dependencias base para copiar estructura a otro establecimiento.',
        'Editar inline si cambia la estructura interna.',
        'Dar de baja solo cuando no existan activos vinculados.',
      ],
    },
    users: {
      title: 'Usuarios',
      steps: [
        'Crear usuario con rol correcto.',
        'Asignar establecimiento si el rol lo requiere.',
        'Usar filtros y paginación para administración diaria.',
        'Desactivar/reactivar sin perder trazabilidad.',
      ],
    },
    assistant: {
      title: 'Asistente Central',
      steps: [
        'Escribir una consulta operativa o tecnica del sistema.',
        'Revisar respuesta concreta y sugerencias aplicables.',
        'Crear solicitud formal para seguimiento cuando corresponda.',
        'Gestionar estados y SLA de 72 horas desde la misma vista.',
      ],
    },
    assets: {
      title: 'Activos Fijos',
      steps: [
        'Seleccionar institución, establecimiento y dependencia.',
        'Elegir catálogo o cargar datos manuales del activo.',
        'Definir cantidad, valor, fecha y responsable (o Sin responsable asignado).',
        'Crear, luego operar mover/transferir/baja desde el modal.',
      ],
    },
    trash: {
      title: 'Basurero',
      steps: [
        'Revisar activos dados de baja.',
        'Filtrar por fechas y texto para localizar registros.',
        'Usar restaurar con motivo cuando corresponda.',
      ],
    },
    imports: {
      title: 'Importaciones',
      steps: [
        'Seleccionar subtipo: Activos Fijos, Catálogo Estándar o Catálogo Base SN.',
        'Cargar Excel en el formato correspondiente.',
        'Revisar resumen created/skipped/errors.',
        'Corregir y reimportar cuando existan filas con error.',
      ],
    },
    planchetas: {
      title: 'Planchetas',
      steps: [
        'Seleccionar institución y establecimiento.',
        'Opcionalmente filtrar por dependencia y rango de fechas.',
        'Previsualizar resultados y validar conteos.',
        'Exportar a PDF/Excel para uso ministerial.',
      ],
    },
    audit: {
      title: 'Auditoría Admin',
      steps: [
        'Filtrar por entidad, acción, usuario y rango de fechas.',
        'Revisar trazabilidad de cambios críticos.',
        'Exportar reportes cuando se requiera respaldo.',
        'Aplicar limpieza de auditoría solo con criterio administrativo.',
      ],
    },
  }
  const activeMiniManual = miniManualByTab[activeTab]

  const labelData = createdAsset ? getLabelData(createdAsset) : null
  const createdLabel = createdAsset ? getLabelData(createdAsset) : null
  const modalCatalogItem = selectedCatalogItem || createdAsset?.catalogItem || null
  const selectedAssetInstitution = institutionsCatalog.find(
    (inst) => String(inst.id) === String(assetInstitutionId)
  )
  const selectedAssetEstablishment = assetEstablishments.find(
    (est) => String(est.id) === String(assetForm.establishmentId)
  )
  const hasModalContext = Boolean(createdAsset || modalCatalogItem)
  const isBaja =
    Boolean(createdAsset?.isDeleted) || createdAsset?.assetState?.name === 'BAJA'

  return (
    <div className="page">
      {catalogModalOpen && (
        <div className="modal-backdrop" onClick={() => setCatalogModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h4>{modalCatalogItem ? 'Catálogo seleccionado' : 'Activo fijo seleccionado'}</h4>
              <button className="ghost" onClick={() => setCatalogModalOpen(false)}>
                Cerrar
              </button>
            </div>
            {hasModalContext ? (
              <div className="modal-body">
                <div className="modal-layout">
                  <div className="modal-main">
                    <div className="modal-grid">
                      <div>
                        <strong>Nombre</strong>
                        <span>{modalCatalogItem?.name || createdAsset?.name || '-'}</span>
                      </div>
                      <div>
                        <strong>Categoria</strong>
                        <span>{modalCatalogItem?.category || '-'}</span>
                      </div>
                      <div>
                        <strong>Subcategoria</strong>
                        <span>{modalCatalogItem?.subcategory || '-'}</span>
                      </div>
                      <div>
                        <strong>Marca</strong>
                        <span>{modalCatalogItem?.brand || createdAsset?.brand || '-'}</span>
                      </div>
                      <div>
                        <strong>Modelo</strong>
                        <span>{modalCatalogItem?.modelName || createdAsset?.modelName || '-'}</span>
                      </div>
                    </div>
                    {!modalCatalogItem && (
                      <p className="muted">
                        Este activo fijo no tiene item de catálogo asociado; puedes operar igual.
                      </p>
                    )}
                    {status.details && (
                      <button
                        type="button"
                        className="ghost status-copy-btn"
                        onClick={copyStatusDetailsJson}
                      >
                        Copiar detalle JSON
                      </button>
                    )}
                    {createdLabel ? (
                      <div className="modal-label">
                        <div className="label-code">
                          Código: <strong>{createdLabel.code}</strong>
                        </div>
                        {qrCodeUrl && <img className="qr" src={qrCodeUrl} alt="QR" />}
                        <div className="actions">
                          <button className="ghost" onClick={openPrintLabel}>
                            Imprimir QR
                          </button>
                          <button className="ghost" onClick={openPrintLabel}>
                            Imprimir
                          </button>
                          <button className="ghost" onClick={downloadLabelPdf}>
                            Descargar PDF
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="muted">
                          Para ver QR e imprimir etiqueta necesitas crear el activo fijo.
                        </p>
                        <div className="actions">
                          <button className="ghost" disabled>
                            Imprimir QR
                          </button>
                          <button className="ghost" disabled>
                            Imprimir
                          </button>
                          <button className="ghost" disabled>
                            Descargar PDF
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="modal-side">
                    <div className="modal-actions">
                      <button
                        className="ghost"
                        disabled={!createdLabel}
                        onClick={() => openCatalogAction('edit')}
                      >
                        Editar producto
                      </button>
                      <button
                        className="ghost"
                        disabled={!createdLabel}
                        onClick={() => openCatalogAction('move')}
                      >
                        Mover producto
                      </button>
                      <button
                        className="ghost"
                        disabled={!createdLabel || !isCentral || isBaja}
                        onClick={() => openCatalogAction('transfer')}
                      >
                        Transferir
                      </button>
                      <button
                        className="danger"
                        disabled={!createdLabel || isBaja}
                        onClick={() => openCatalogAction('status')}
                      >
                        Dar de baja
                      </button>
                    </div>
                    {catalogAction === 'edit' && (
                      <div className="modal-form">
                        <h5>Editar activo fijo</h5>
                        <div className="modal-grid">
                          <div>
                            <strong>Nombre</strong>
                            <input
                              value={editAssetForm.name}
                              onChange={(e) =>
                                setEditAssetForm((p) => ({ ...p, name: e.target.value }))
                              }
                            />
                          </div>
                          <div>
                            <strong>Marca</strong>
                            <input
                              value={editAssetForm.brand}
                              onChange={(e) =>
                                setEditAssetForm((p) => ({ ...p, brand: e.target.value }))
                              }
                            />
                          </div>
                          <div>
                            <strong>Modelo</strong>
                            <input
                              value={editAssetForm.modelName}
                              onChange={(e) =>
                                setEditAssetForm((p) => ({
                                  ...p,
                                  modelName: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <strong>Serie</strong>
                            <input
                              value={editAssetForm.serialNumber}
                              onChange={(e) =>
                                setEditAssetForm((p) => ({
                                  ...p,
                                  serialNumber: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <strong>Cantidad</strong>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={editAssetForm.quantity}
                              onChange={(e) =>
                                setEditAssetForm((p) => ({
                                  ...p,
                                  quantity: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <strong>Cuenta contable</strong>
                            <input
                              value={editAssetForm.accountingAccount}
                              onChange={(e) =>
                                setEditAssetForm((p) => ({
                                  ...p,
                                  accountingAccount: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <strong>Código analitico</strong>
                            <input
                              value={editAssetForm.analyticCode}
                              onChange={(e) =>
                                setEditAssetForm((p) => ({
                                  ...p,
                                  analyticCode: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <label className="inline-check">
                            <input
                              type="checkbox"
                              checked={!editAssetHasResponsible}
                              onChange={(e) => {
                                const withoutResponsible = e.target.checked
                                setEditAssetHasResponsible(!withoutResponsible)
                                if (withoutResponsible) {
                                  setEditAssetForm((p) => ({
                                    ...p,
                                    responsibleName: '',
                                    responsibleRut: '',
                                    responsibleRole: '',
                                    costCenter: '',
                                  }))
                                }
                              }}
                            />
                            Sin responsable asignado
                          </label>
                          {editAssetHasResponsible ? (
                            <>
                              <div>
                                <strong>Responsable</strong>
                                <input
                                  value={editAssetForm.responsibleName}
                                  onChange={(e) =>
                                    setEditAssetForm((p) => ({
                                      ...p,
                                      responsibleName: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <strong>RUT responsable</strong>
                                <input
                                  value={editAssetForm.responsibleRut}
                                  onChange={(e) =>
                                    setEditAssetForm((p) => ({
                                      ...p,
                                      responsibleRut: e.target.value,
                                    }))
                                  }
                                  onBlur={(e) =>
                                    setEditAssetForm((p) => ({
                                      ...p,
                                      responsibleRut: normalizeRutValue(e.target.value),
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <strong>Cargo responsable</strong>
                                <input
                                  value={editAssetForm.responsibleRole}
                                  onChange={(e) =>
                                    setEditAssetForm((p) => ({
                                      ...p,
                                      responsibleRole: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <strong>Centro de costo</strong>
                                <input
                                  value={editAssetForm.costCenter}
                                  onChange={(e) =>
                                    setEditAssetForm((p) => ({
                                      ...p,
                                      costCenter: e.target.value,
                                    }))
                                  }
                                  onBlur={(e) =>
                                    setEditAssetForm((p) => ({
                                      ...p,
                                      costCenter: normalizeCostCenterValue(e.target.value),
                                    }))
                                  }
                                />
                              </div>
                            </>
                          ) : (
                            <p className="muted">El activo fijo quedara sin responsable.</p>
                          )}
                          <div>
                            <strong>Valor adquisicion</strong>
                            <input
                              type="number"
                              value={editAssetForm.acquisitionValue}
                              onChange={(e) =>
                                setEditAssetForm((p) => ({
                                  ...p,
                                  acquisitionValue: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <strong>Fecha adquisicion</strong>
                            <input
                              type="date"
                              value={editAssetForm.acquisitionDate}
                              onChange={(e) =>
                                setEditAssetForm((p) => ({
                                  ...p,
                                  acquisitionDate: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div className="actions">
                          <button className="ghost" onClick={() => setCatalogAction(null)}>
                            Cancelar
                          </button>
                          <button className="primary" onClick={submitEditAsset}>
                            Guardar cambios
                          </button>
                        </div>
                      </div>
                    )}
                    {catalogAction === 'move' && (
                      <div className="modal-form">
                        <h5>Mover activo fijo</h5>
                        <div className="modal-grid">
                          <div>
                            <strong>Establecimiento actual</strong>
                            <span>{createdAsset?.establishment?.name || '-'}</span>
                          </div>
                          <div>
                            <strong>Dependencia actual</strong>
                            <span>{createdAsset?.dependency?.name || '-'}</span>
                          </div>
                        </div>
                        <div className="modal-grid">
                          <div>
                            <strong>Dependencia destino</strong>
                            <select
                              value={moveAssetForm.toDependencyId}
                              onChange={(e) =>
                                setMoveAssetForm({ toDependencyId: e.target.value })
                              }
                            >
                              <option value="">Selecciona dependencia</option>
                              {assetDependencies.map((dep) => (
                                <option key={dep.id} value={dep.id}>
                                  {dep.name}
                                </option>
                              ))}
                            </select>
                            {!assetDependencies.length && (
                              <p className="muted">
                                No hay dependencias disponibles para este establecimiento.
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="actions">
                          <button className="ghost" onClick={() => setCatalogAction(null)}>
                            Cancelar
                          </button>
                          <button className="primary" onClick={submitMoveAsset}>
                            Mover
                          </button>
                        </div>
                      </div>
                    )}
                    {catalogAction === 'transfer' && (
                      <div className="modal-form">
                        <h5>Transferir activo fijo</h5>
                        <div className="modal-grid">
                          <div>
                            <strong>Establecimiento destino</strong>
                            <select
                              value={transferAssetForm.toEstablishmentId}
                              onChange={(e) => {
                                const value = e.target.value
                                setTransferAssetForm((prev) => ({
                                  ...prev,
                                  toEstablishmentId: value,
                                  toDependencyId: '',
                                }))
                                loadTransferDependenciesForEstablishment(value).catch((err) =>
                                  setErr(err)
                                )
                              }}
                            >
                              <option value="">Selecciona establecimiento</option>
                              {transferEstablishments.map((est) => (
                                <option key={est.id} value={est.id}>
                                  {est.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <strong>Dependencia destino</strong>
                            <select
                              value={transferAssetForm.toDependencyId}
                              onChange={(e) =>
                                setTransferAssetForm((prev) => ({
                                  ...prev,
                                  toDependencyId: e.target.value,
                                }))
                              }
                              disabled={!transferAssetForm.toEstablishmentId}
                            >
                              <option value="">Selecciona dependencia</option>
                              {transferDependencies.map((dep) => (
                                <option key={dep.id} value={dep.id}>
                                  {dep.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <strong>Motivo</strong>
                            <select
                              value={transferAssetForm.reasonCode}
                              onChange={(e) =>
                                setTransferAssetForm((prev) => ({
                                  ...prev,
                                  reasonCode: e.target.value,
                                }))
                              }
                            >
                              <option value="">Selecciona motivo</option>
                              {(movementReasonCodes.transfer || []).map((item) => (
                                <option key={item.code} value={item.code}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <strong>Tipo documento</strong>
                            <select
                              value={transferAssetForm.docType}
                              onChange={(e) =>
                                setTransferAssetForm((prev) => ({
                                  ...prev,
                                  docType: e.target.value,
                                }))
                              }
                            >
                              <option value="FOTO">FOTO</option>
                              <option value="ACTA">ACTA</option>
                              <option value="FACTURA">FACTURA</option>
                              <option value="OTRO">OTRO</option>
                            </select>
                          </div>
                          <div>
                            <strong>Nota evidencia</strong>
                            <input
                              value={transferAssetForm.note}
                              onChange={(e) =>
                                setTransferAssetForm((prev) => ({
                                  ...prev,
                                  note: e.target.value,
                                }))
                              }
                              placeholder="Observacion breve"
                            />
                          </div>
                          <div>
                            <strong>Archivo (PDF/JPG/PNG)</strong>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={(e) =>
                                setTransferAssetForm((prev) => ({
                                  ...prev,
                                  file: e.target.files?.[0] || null,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div className="actions">
                          <button className="ghost" onClick={() => setCatalogAction(null)}>
                            Cancelar
                          </button>
                          <button className="primary" onClick={submitTransferAsset}>
                            Confirmar transferencia
                          </button>
                        </div>
                      </div>
                    )}
                    {catalogAction === 'status' && (
                      <div className="modal-form">
                        <h5>Dar de baja</h5>
                        <div className="modal-grid">
                          <div>
                            <strong>Estado</strong>
                            <select
                              value={statusAssetForm.assetStateId}
                              onChange={(e) =>
                                setStatusAssetForm((prev) => ({
                                  ...prev,
                                  assetStateId: e.target.value,
                                }))
                              }
                            >
                              <option value="">Selecciona estado</option>
                              {assetStates.map((st) => (
                                <option key={st.id} value={st.id}>
                                  {st.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <strong>Motivo</strong>
                            <select
                              value={statusAssetForm.reasonCode}
                              onChange={(e) =>
                                setStatusAssetForm((prev) => ({
                                  ...prev,
                                  reasonCode: e.target.value,
                                }))
                              }
                            >
                              <option value="">Selecciona motivo</option>
                              {(movementReasonCodes.statusChange || []).map((item) => (
                                <option key={item.code} value={item.code}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <strong>Tipo documento</strong>
                            <select
                              value={statusAssetForm.docType}
                              onChange={(e) =>
                                setStatusAssetForm((prev) => ({
                                  ...prev,
                                  docType: e.target.value,
                                }))
                              }
                            >
                              <option value="FOTO">FOTO</option>
                              <option value="ACTA">ACTA</option>
                              <option value="FACTURA">FACTURA</option>
                              <option value="OTRO">OTRO</option>
                            </select>
                          </div>
                          <div>
                            <strong>Nota evidencia</strong>
                            <input
                              value={statusAssetForm.note}
                              onChange={(e) =>
                                setStatusAssetForm((prev) => ({
                                  ...prev,
                                  note: e.target.value,
                                }))
                              }
                              placeholder="Observacion breve"
                            />
                          </div>
                          <div>
                            <strong>Archivo (PDF/JPG/PNG)</strong>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={(e) =>
                                setStatusAssetForm((prev) => ({
                                  ...prev,
                                  file: e.target.files?.[0] || null,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div className="actions">
                          <button className="ghost" onClick={() => setCatalogAction(null)}>
                            Cancelar
                          </button>
                          <button className="danger" onClick={submitStatusAsset}>
                            Confirmar baja
                          </button>
                        </div>
                      </div>
                    )}
                    {createdLabel && (
                      <div className="modal-form">
                        <h5>Evidencias</h5>
                        <div className="modal-grid">
                          <div>
                            <strong>Movimiento sensible</strong>
                            <select
                              value={evidenceForm.movementId}
                              onChange={(e) =>
                                setEvidenceForm((prev) => ({
                                  ...prev,
                                  movementId: e.target.value,
                                }))
                              }
                            >
                              <option value="">Sin movimiento especifico</option>
                              {assetMovements.map((m) => (
                                <option key={m.id} value={m.id}>
                                  #{m.id} · {m.type} · {m.reasonCode || m.reason || 'sin motivo'} · {new Date(m.createdAt).toLocaleString()}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <strong>Tipo documento</strong>
                            <select
                              value={evidenceForm.docType}
                              onChange={(e) =>
                                setEvidenceForm((prev) => ({
                                  ...prev,
                                  docType: e.target.value,
                                }))
                              }
                            >
                              <option value="FOTO">FOTO</option>
                              <option value="ACTA">ACTA</option>
                              <option value="FACTURA">FACTURA</option>
                              <option value="OTRO">OTRO</option>
                            </select>
                          </div>
                          <div>
                            <strong>Nota</strong>
                            <input
                              value={evidenceForm.note}
                              onChange={(e) =>
                                setEvidenceForm((prev) => ({
                                  ...prev,
                                  note: e.target.value,
                                }))
                              }
                              placeholder="Observacion breve"
                            />
                          </div>
                          <div>
                            <strong>Archivo (PDF/JPG/PNG)</strong>
                            <input
                              id="evidence-file-input"
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={(e) =>
                                setEvidenceForm((prev) => ({
                                  ...prev,
                                  file: e.target.files?.[0] || null,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div className="actions">
                          <button className="primary" onClick={submitEvidenceUpload}>
                            Subir evidencia
                          </button>
                        </div>
                        <div className="table-wrap">
                          {assetEvidenceLoading ? (
                            <p className="muted">Cargando evidencias...</p>
                          ) : assetEvidence.length ? (
                            <table>
                              <thead>
                                <tr>
                                  <th>ID</th>
                                  <th>Tipo</th>
                                  <th>Movimiento</th>
                                  <th>Archivo</th>
                                  <th>Fecha</th>
                                  <th>Acción</th>
                                </tr>
                              </thead>
                              <tbody>
                                {assetEvidence.map((ev) => (
                                  <tr key={ev.id}>
                                    <td>{ev.id}</td>
                                    <td>{ev.docType}</td>
                                    <td>{ev.movementId || '-'}</td>
                                    <td>{ev.fileName}</td>
                                    <td>{new Date(ev.createdAt).toLocaleString()}</td>
                                    <td>
                                      <button
                                        className="ghost"
                                        onClick={() => downloadEvidence(ev)}
                                      >
                                        Descargar
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="muted">Sin evidencias cargadas.</p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="modal-help">
                      <strong>Como usar</strong>
                      <p>1. Crea el activo fijo para habilitar QR y acciónes.</p>
                      <p>2. Usa Editar para cambiar datos.</p>
                      <p>3. Dar de baja lo envia al Basurero.</p>
                    </div>
                  </div>
                </div>
                <div className="actions">
                  <button
                    className="primary"
                    onClick={() => setCatalogModalOpen(false)}
                  >
                    Continuar con el formulario
                  </button>
                </div>
              </div>
            ) : (
              <p className="muted">Sin datos de catálogo.</p>
            )}
          </div>
        </div>
      )}
      <div className="hero">
        <div className="hero-top">
          <div className="hero-title">
            <img className="hero-logo" src={logoInventacore} alt="Logo InventaCore" />
            <div className="hero-heading">
              <span>Inventario</span>
              <h1>Panel Administrativo</h1>
            </div>
          </div>
          {isAuthed && (
            <div className="user-menu">
              <div className="user-menu-trigger">
                <div className="user-thumb-wrap">
                  {currentUser?.photoDataUrl ? (
                    <img
                      className="user-thumb"
                      src={currentUser.photoDataUrl}
                      alt={`Foto ${currentUser?.name || 'Usuario'}`}
                    />
                  ) : (
                    <div className="user-thumb user-thumb-empty">Sin foto</div>
                  )}
                </div>
                <span className="user-menu-section">Sesión</span>
                <span className="user-menu-name">{currentUser?.name || 'Usuario'}</span>
                <span className="user-menu-role">{roleType || 'ADMIN'}</span>
              </div>
              <div className="user-menu-panel">
                <p className="muted">{currentUser?.email || ''}</p>
                {!isChangePasswordOpen ? (
                  <button type="button" className="ghost" onClick={openChangePassword}>
                    Cambiar clave
                  </button>
                ) : (
                  <form onSubmit={handleChangePassword} className="auth-form" style={{ marginBottom: 8 }}>
                    <div className="field">
                      <label>Clave actual</label>
                      <input
                        type="password"
                        value={changePasswordForm.currentPassword}
                        onChange={(e) =>
                          setChangePasswordForm((prev) => ({
                            ...prev,
                            currentPassword: e.target.value,
                          }))
                        }
                        autoComplete="current-password"
                      />
                    </div>
                    <div className="field">
                      <label>Nueva clave</label>
                      <input
                        type="password"
                        value={changePasswordForm.newPassword}
                        onChange={(e) =>
                          setChangePasswordForm((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                        }
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="field">
                      <label>Confirmar nueva clave</label>
                      <input
                        type="password"
                        value={changePasswordForm.confirmPassword}
                        onChange={(e) =>
                          setChangePasswordForm((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="actions">
                      <button type="button" className="ghost" onClick={closeChangePassword}>
                        Cancelar
                      </button>
                      <button type="submit" className="primary" disabled={isChangingPassword}>
                        {isChangingPassword ? 'Guardando...' : 'Guardar clave'}
                      </button>
                    </div>
                  </form>
                )}
                <button type="button" className="ghost" onClick={handleLogout}>
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
        {showHeroNotice && (
          <div className="hero-notice">
            Gestiona instituciónes, establecimientos y dependencias con trazabilidad
            completa. Todos los cambios quedan auditados.
          </div>
        )}
      </div>

      {(!isAuthed || status.message) && (
      <section className={!isAuthed ? 'card auth-card' : 'card'}>
        {!isAuthed ? (
          <>
            <div>
              <h2>Acceso Admin</h2>
              <p className="muted">Solo ADMIN_CENTRAL</p>
            </div>
            <form onSubmit={handleLogin} className="auth-form">
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={login.email}
                  onChange={(e) => setLogin({ ...login, email: e.target.value })}
                  placeholder="admin@cordillera.local"
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  value={login.password}
                  onChange={(e) => setLogin({ ...login, password: e.target.value })}
                  placeholder="admin123"
                />
              </div>
              <div className="auth-actions">
                <button type="submit" className="primary" disabled={isLoginLoading}>
                  {isLoginLoading ? (
                    <span className="btn-loading">
                      <span className="btn-spinner" aria-hidden="true" />
                      Iniciando...
                    </span>
                  ) : (
                    'Ingresar'
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <></>
        )}
        {status.message && (
          <div className={'status ' + status.type}>
            <div>{status.message}</div>
            {status.type === 'error' && (
              <details className="status-meta">
                <summary>Detalle técnico</summary>
                <div className="status-meta-grid">
                  <div>
                    <strong>Code:</strong> <span>{status.code || 'UNKNOWN_ERROR'}</span>
                  </div>
                  <div>
                    <strong>Request ID:</strong> <span>{status.requestId || 'N/A'}</span>
                    {status.requestId && (
                      <button
                        type="button"
                        className="ghost status-copy-btn"
                        onClick={copyStatusRequestId}
                      >
                        Copiar ID
                      </button>
                    )}
                    {status.details && (
                      <button
                        type="button"
                        className="ghost status-copy-btn"
                        onClick={copyStatusDetailsJson}
                      >
                        Copiar detalle JSON
                      </button>
                    )}
                  </div>
                </div>
                {statusCopyFeedback && <div className="muted">{statusCopyFeedback}</div>}
                {status.details && (
                  <pre className="code-block">{JSON.stringify(status.details, null, 2)}</pre>
                )}
              </details>
            )}
          </div>
        )}
      </section>
      )}

      <section className="card">
        <div className="tabs">
          {tabs
            .filter(
              (tab) =>
                !((tab.id === 'users' || tab.id === 'assistant') && !isCentral)
            )
            .map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'tab active' : 'tab'}
              onClick={() => setActiveTab(tab.id)}
              disabled={!isAuthed}
            >
              {tab.label}
            </button>
          ))}
          <a
            className="ghost"
            href="/manual/manual-operativo-técnico.pdf"
            download="manual-operativo-técnico.pdf"
          >
            Descargar manual
          </a>
          <button className="ghost" onClick={resetPreferences}>
            Reset preferencias
          </button>
        </div>

        {!isAuthed ? (
          <div className="empty-state">Inicia sesión para continuar.</div>
        ) : null}
        {isAuthed && activeMiniManual ? (
          <details className="mini-manual">
            <summary>Mini manual: {activeMiniManual.title}</summary>
            <ol>
              {activeMiniManual.steps.map((step, idx) => (
                <li key={`${activeTab}-manual-${idx}`}>{step}</li>
              ))}
            </ol>
          </details>
        ) : null}

        {isAuthed && activeTab === 'institutions' && (
          <div className="section">
            <div className="section-head">
              <h3>Instituciónes</h3>
              <div className="actions">
                {isCentral ? (
                  <>
                    <input
                      placeholder="Buscar..."
                      value={instQuery}
                      onChange={(e) => setInstQuery(e.target.value)}
                    />
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={instIncludeInactive}
                        onChange={(e) => {
                          setInstIncludeInactive(e.target.checked)
                          loadInstitutions(1)
                        }}
                      />
                      Mostrar inactivos
                    </label>
                    <button onClick={() => loadInstitutions(1)}>Actualizar</button>
                    <button
                      className="ghost"
                      onClick={() =>
                        downloadFile('/admin/institutions/export/excel', 'institutions.xlsx')
                      }
                    >
                      Exportar Excel
                    </button>
                    <button
                      className="ghost"
                      onClick={() =>
                        downloadFile('/admin/institutions/export/csv', 'institutions.csv')
                      }
                    >
                      Exportar CSV
                    </button>
                  </>
                ) : (
                  <span className="muted">Vista solo lectura</span>
                )}
              </div>
            </div>
            {isCentral && instQuery && (
              <div className="chip-row">
                <span className="chip">
                  Búsqueda: {instQuery}
                  <button onClick={() => setInstQuery('')}>×</button>
                </span>
              </div>
            )}
            {isCentral && (
              <div className="split">
                <div className="form-card">
                  <h4>Nueva institución</h4>
                  <input
                    placeholder="Nombre"
                    value={instForm.name}
                    onChange={(e) => setInstForm({ name: e.target.value })}
                  />
                  {formErrors.instName && <p className="error">{formErrors.instName}</p>}
                  <button className="primary" onClick={createInstitution}>
                    Crear
                  </button>
                </div>
              </div>
            )}
            <div className="table">
              <div className="table-head">
                <div className="sort-controls">
                  <label>Orden</label>
                  <select
                    value={instSort.key}
                    onChange={(e) => setInstSort((s) => ({ ...s, key: e.target.value }))}
                  >
                    <option value="name">Nombre</option>
                  </select>
                  <button
                    className="ghost"
                    onClick={() =>
                      setInstSort((s) => ({
                        ...s,
                        order: s.order === 'asc' ? 'desc' : 'asc',
                      }))
                    }
                  >
                    {instSort.order === 'asc' ? 'Asc' : 'Desc'}
                  </button>
                </div>
                <span className="muted">
                  {isCentral
                    ? `Mostrando ${institutions.length} de ${instTotal}`
                    : `Mostrando ${institutionsCatalog.length}`}
                </span>
              </div>
              {[...(isCentral ? institutions : institutionsCatalog)]
                .sort((a, b) => {
                  const dir = instSort.order === 'asc' ? 1 : -1
                  return a.name.localeCompare(b.name) * dir
                })
                .map((i) => (
                <div key={i.id} className="row">
                  <div className="row-main">
                    <strong>#{i.id}</strong>
                    {!i.isActive && <span className="pill danger-pill">INACTIVA</span>}
                    {isCentral ? (
                      <input
                        className="inline-input"
                        value={i.name}
                        onChange={(e) => {
                          const next = institutions.map((x) =>
                            x.id === i.id ? { ...x, name: e.target.value } : x
                          )
                          setInstitutions(next)
                        }}
                      />
                    ) : (
                      <span>{i.name}</span>
                    )}
                  </div>
                  {isCentral && (
                    <div className="row-actions">
                      <button
                        disabled={
                          !instOriginal[i.id] ||
                          instOriginal[i.id].name === i.name
                        }
                        onClick={() =>
                          updateInstitution({
                            id: i.id,
                            name: i.name,
                          })
                        }
                      >
                        Guardar
                      </button>
                      {i.isActive ? (
                        <button
                          className="danger"
                          onClick={() => deleteInstitution(i.id)}
                        >
                          Dar de baja
                        </button>
                      ) : (
                        <>
                          <button onClick={() => reactivateInstitution(i.id)}>
                            Reactivar
                          </button>
                          <button
                            className="danger"
                            onClick={() => hardDeleteInstitution(i.id)}
                          >
                            Eliminar definitivo
                          </button>
                          <button
                            className="danger danger-outline"
                            onClick={() => openForceDelete('institution', i.id, i.name)}
                          >
                            Eliminar forzado
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {isCentral && !institutions.length && (
                <p className="muted">Sin resultados.</p>
              )}
              {!isCentral && !institutionsCatalog.length && (
                <p className="muted">Sin resultados.</p>
              )}
            </div>
            {isCentral && (
              <div className="pager">
                <button
                  className="ghost"
                  disabled={instPage <= 1}
                  onClick={() => {
                    const next = instPage - 1
                    setInstPage(next)
                    loadInstitutions(next)
                  }}
                >
                  Anterior
                </button>
                <span>
                  Página {instPage} / {Math.max(1, Math.ceil(instTotal / 10))}
                </span>
                <button
                  className="ghost"
                  disabled={instPage >= Math.ceil(instTotal / 10)}
                  onClick={() => {
                    const next = instPage + 1
                    setInstPage(next)
                    loadInstitutions(next)
                  }}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}

        {isAuthed && activeTab === 'establishments' && isCentral && (
          <div className="section">
            <div className="section-head">
              <h3>Establecimientos</h3>
              <div className="actions">
                <input
                  placeholder="Buscar..."
                  value={estFilters.q}
                  onChange={(e) => setEstFilters({ ...estFilters, q: e.target.value })}
                />
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={estIncludeInactive}
                    onChange={(e) => {
                      setEstIncludeInactive(e.target.checked)
                      loadEstablishments(1)
                    }}
                  />
                  Mostrar inactivos
                </label>
                <input
                  placeholder="Institution ID"
                  value={estFilters.institutionId}
                  onChange={(e) =>
                    setEstFilters({ ...estFilters, institutionId: e.target.value })
                  }
                />
                <button onClick={() => loadEstablishments(1)}>Actualizar</button>
                <button
                  className="ghost"
                  onClick={() =>
                    downloadFile('/admin/establishments/export/excel', 'establishments.xlsx')
                  }
                >
                  Exportar Excel
                </button>
                <button
                  className="ghost"
                  onClick={() =>
                    downloadFile('/admin/establishments/export/csv', 'establishments.csv')
                  }
                >
                  Exportar CSV
                </button>
              </div>
            </div>
            {(estFilters.q || estFilters.institutionId) && (
              <div className="chip-row">
                {estFilters.q && (
                  <span className="chip">
                    Búsqueda: {estFilters.q}
                    <button onClick={() => setEstFilters({ ...estFilters, q: '' })}>
                      ×
                    </button>
                  </span>
                )}
                {estFilters.institutionId && (
                  <span className="chip">
                    Institución: {estFilters.institutionId}
                    <button
                      onClick={() => setEstFilters({ ...estFilters, institutionId: '' })}
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}
            <div className="split">
              <div className="form-card">
                <h4>Nuevo establecimiento</h4>
                <input
                  placeholder="Nombre"
                  value={estForm.name}
                  onChange={(e) => setEstForm({ ...estForm, name: e.target.value })}
                />
                {formErrors.estName && <p className="error">{formErrors.estName}</p>}
                <input
                  placeholder="Tipo"
                  value={estForm.type}
                  onChange={(e) => setEstForm({ ...estForm, type: e.target.value })}
                />
                {formErrors.estType && <p className="error">{formErrors.estType}</p>}
                <input
                  placeholder="RBD"
                  value={estForm.rbd}
                  onChange={(e) => setEstForm({ ...estForm, rbd: e.target.value })}
                />
                <input
                  placeholder="Comuna"
                  value={estForm.commune}
                  onChange={(e) => setEstForm({ ...estForm, commune: e.target.value })}
                />
                <input
                  placeholder="Institution ID"
                  value={estForm.institutionId}
                  onChange={(e) =>
                    setEstForm({ ...estForm, institutionId: e.target.value })
                  }
                  style={{
                    display:
                      institutionsCatalog.length === 0 && !loadingInstitutions
                        ? 'block'
                        : 'none',
                  }}
                />
                <div className="select-wrap">
                  <input
                    className="select-search"
                    placeholder="Buscar institución..."
                    value={estFilters.institutionSearch || ''}
                    onChange={(e) =>
                      setEstFilters({ ...estFilters, institutionSearch: e.target.value })
                    }
                  />
                  <select
                    value={estForm.institutionId}
                    onChange={(e) =>
                      setEstForm({ ...estForm, institutionId: e.target.value })
                    }
                    disabled={loadingInstitutions || institutionsCatalog.length === 0}
                  >
                    <option value="">
                      {loadingInstitutions ? 'Cargando...' : 'Selecciona institución'}
                    </option>
                    {institutionsCatalog
                      .filter((i) =>
                        estFilters.institutionSearch
                          ? i.name
                              .toLowerCase()
                              .includes(estFilters.institutionSearch.toLowerCase())
                          : true
                      )
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                  </select>
                </div>
                {estForm.institutionId && (
                  <p className="muted">
                    Comunas ya usadas en esta institución:{' '}
                    {[
                      ...new Set(
                        (establishmentsCatalog || [])
                          .map((x) => (x.commune || '').trim())
                          .filter(Boolean)
                      ),
                    ].join(', ') || 'sin registro'}
                  </p>
                )}
                <p className="muted">
                  Nota: código postal aún no existe en base de datos; si lo quieres, agregamos
                  migración para guardarlo formalmente.
                </p>
                {formErrors.estInstitutionId && (
                  <p className="error">{formErrors.estInstitutionId}</p>
                )}
                <button className="primary" onClick={createEstablishment}>
                  Crear
                </button>
              </div>
            </div>
            <div className="table">
              <div className="table-head">
                <div className="sort-controls">
                  <label>Orden</label>
                  <select
                    value={estSort.key}
                    onChange={(e) => setEstSort((s) => ({ ...s, key: e.target.value }))}
                  >
                    <option value="name">Nombre</option>
                    <option value="type">Tipo</option>
                    <option value="institutionId">Institución</option>
                  </select>
                  <button
                    className="ghost"
                    onClick={() =>
                      setEstSort((s) => ({
                        ...s,
                        order: s.order === 'asc' ? 'desc' : 'asc',
                      }))
                    }
                  >
                    {estSort.order === 'asc' ? 'Asc' : 'Desc'}
                  </button>
                </div>
                <span className="muted">
                  Mostrando {establishments.length} de {estTotal}
                </span>
              </div>
              {[...establishments]
                .sort((a, b) => {
                  const dir = estSort.order === 'asc' ? 1 : -1
                  if (estSort.key === 'type') return a.type.localeCompare(b.type) * dir
                  if (estSort.key === 'institutionId')
                    return (a.institutionId - b.institutionId) * dir
                  return a.name.localeCompare(b.name) * dir
                })
                .map((e) => (
                <div key={e.id} className="row">
                  <div className="row-main">
                    <strong>#{e.id}</strong>
                    {!e.isActive && <span className="pill danger-pill">INACTIVO</span>}
                    <input
                      className="inline-input"
                      value={e.name}
                      onChange={(evt) => {
                        const next = establishments.map((x) =>
                          x.id === e.id ? { ...x, name: evt.target.value } : x
                        )
                        setEstablishments(next)
                      }}
                    />
                    <input
                      className="inline-input small"
                      value={e.type}
                      onChange={(evt) => {
                        const next = establishments.map((x) =>
                          x.id === e.id ? { ...x, type: evt.target.value } : x
                        )
                        setEstablishments(next)
                      }}
                    />
                    <input
                      className="inline-input small"
                      value={e.rbd || ''}
                      onChange={(evt) => {
                        const next = establishments.map((x) =>
                          x.id === e.id ? { ...x, rbd: evt.target.value } : x
                        )
                        setEstablishments(next)
                      }}
                    />
                    <input
                      className="inline-input"
                      value={e.commune || ''}
                      onChange={(evt) => {
                        const next = establishments.map((x) =>
                          x.id === e.id ? { ...x, commune: evt.target.value } : x
                        )
                        setEstablishments(next)
                      }}
                    />
                    <span className="pill">Inst {e.institutionId}</span>
                  </div>
                  <div className="row-actions">
                    <button
                      disabled={
                        !estOriginal[e.id] ||
                        (estOriginal[e.id].name === e.name &&
                          estOriginal[e.id].type === e.type &&
                          estOriginal[e.id].rbd === (e.rbd || '') &&
                          estOriginal[e.id].commune === (e.commune || '') &&
                          estOriginal[e.id].institutionId === e.institutionId)
                      }
                      onClick={() =>
                        updateEstablishment({
                          id: e.id,
                          name: e.name,
                          type: e.type,
                          rbd: e.rbd,
                          commune: e.commune,
                          institutionId: e.institutionId,
                        })
                      }
                    >
                      Guardar
                    </button>
                    {e.isActive ? (
                      <button
                        className="danger"
                        onClick={() => deleteEstablishment(e.id)}
                      >
                        Dar de baja
                      </button>
                    ) : (
                      <>
                        <button onClick={() => reactivateEstablishment(e.id)}>
                          Reactivar
                        </button>
                        <button
                          className="danger"
                          onClick={() => hardDeleteEstablishment(e.id)}
                        >
                          Eliminar definitivo
                        </button>
                        <button
                          className="danger danger-outline"
                          onClick={() => openForceDelete('establishment', e.id, e.name)}
                        >
                          Eliminar forzado
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {!establishments.length && <p className="muted">Sin resultados.</p>}
            </div>
            <div className="pager">
              <button
                className="ghost"
                disabled={estPage <= 1}
                onClick={() => {
                  const next = estPage - 1
                  setEstPage(next)
                  loadEstablishments(next)
                }}
              >
                Anterior
              </button>
              <span>
                Página {estPage} / {Math.max(1, Math.ceil(estTotal / 10))}
              </span>
              <button
                className="ghost"
                disabled={estPage >= Math.ceil(estTotal / 10)}
                onClick={() => {
                  const next = estPage + 1
                  setEstPage(next)
                  loadEstablishments(next)
                }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {isAuthed && activeTab === 'dependencies' && isCentral && (
          <div className="section">
            <div className="section-head">
              <h3>Dependencias</h3>
              <div className="actions">
                <input
                  placeholder="Buscar..."
                  value={depFilters.q}
                  onChange={(e) => setDepFilters({ ...depFilters, q: e.target.value })}
                />
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={depIncludeInactive}
                    onChange={(e) => {
                      setDepIncludeInactive(e.target.checked)
                      loadDependencies(1)
                    }}
                  />
                  Mostrar inactivos
                </label>
                <select
                  value={depFilters.establishmentId}
                  onChange={(e) =>
                    setDepFilters({ ...depFilters, establishmentId: e.target.value })
                  }
                >
                  <option value="">Todos los establecimientos</option>
                  {establishmentsCatalog.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                <button onClick={() => loadDependencies(1)}>Actualizar</button>
                <button
                  className="ghost"
                  onClick={() =>
                    downloadFile('/admin/dependencies/export/excel', 'dependencies.xlsx')
                  }
                >
                  Exportar Excel
                </button>
                <button
                  className="ghost"
                  onClick={() =>
                    downloadFile('/admin/dependencies/export/csv', 'dependencies.csv')
                  }
                >
                  Exportar CSV
                </button>
              </div>
            </div>
            {(depFilters.q || depFilters.establishmentId) && (
              <div className="chip-row">
                {depFilters.q && (
                  <span className="chip">
                    Búsqueda: {depFilters.q}
                    <button onClick={() => setDepFilters({ ...depFilters, q: '' })}>
                      ×
                    </button>
                  </span>
                )}
                {depFilters.establishmentId && (
                  <span className="chip">
                    Establecimiento:{' '}
                    {establishmentsCatalog.find(
                      (e) => String(e.id) === String(depFilters.establishmentId)
                    )?.name || depFilters.establishmentId}
                    <button
                      onClick={() =>
                        setDepFilters({ ...depFilters, establishmentId: '' })
                      }
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}
            <div className="split">
              <div className="form-card">
                <h4>Nueva dependencia</h4>
                <input
                  placeholder="Nombre"
                  value={depForm.name}
                  onChange={(e) => setDepForm({ ...depForm, name: e.target.value })}
                />
                {formErrors.depName && <p className="error">{formErrors.depName}</p>}
                <div className="select-wrap">
                  <input
                    className="select-search"
                    placeholder="Buscar establecimiento..."
                    value={depFilters.establishmentSearch || ''}
                    onChange={(e) =>
                      setDepFilters({
                        ...depFilters,
                        establishmentSearch: e.target.value,
                      })
                    }
                  />
                  <select
                  value={depForm.establishmentId}
                  onChange={(e) =>
                    setDepForm({ ...depForm, establishmentId: e.target.value })
                  }
                  disabled={loadingEstablishments || establishmentsCatalog.length === 0}
                  >
                    <option value="">
                      {loadingEstablishments
                        ? 'Cargando...'
                        : 'Selecciona establecimiento'}
                    </option>
                    {establishmentsCatalog
                      .filter((e) =>
                        depFilters.establishmentSearch
                          ? e.name
                              .toLowerCase()
                              .includes(depFilters.establishmentSearch.toLowerCase())
                          : true
                      )
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                  </select>
                </div>
                {formErrors.depEstablishmentId && (
                  <p className="error">{formErrors.depEstablishmentId}</p>
                )}
                <button className="primary" onClick={createDependency}>
                  Crear
                </button>
              </div>
              <div className="form-card">
                <h4>Replicar dependencias base</h4>
                <p className="muted">
                  Copia dependencias desde un establecimiento origen a uno destino, sin duplicar
                  nombres existentes.
                </p>
                <div className="select-wrap">
                  <label>Establecimiento origen</label>
                  <select
                    value={depReplicateForm.sourceEstablishmentId}
                    onChange={(e) =>
                      setDepReplicateForm((prev) => ({
                        ...prev,
                        sourceEstablishmentId: e.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona origen</option>
                    {establishmentsCatalog.map((e) => (
                      <option key={`dep-repl-src-${e.id}`} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="select-wrap">
                  <label>Establecimiento destino</label>
                  <select
                    value={depReplicateForm.targetEstablishmentId}
                    onChange={(e) =>
                      setDepReplicateForm((prev) => ({
                        ...prev,
                        targetEstablishmentId: e.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona destino</option>
                    {establishmentsCatalog.map((e) => (
                      <option key={`dep-repl-dst-${e.id}`} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={depReplicateForm.includeInactive}
                    onChange={(e) =>
                      setDepReplicateForm((prev) => ({
                        ...prev,
                        includeInactive: e.target.checked,
                      }))
                    }
                  />
                  Incluir dependencias inactivas del origen
                </label>
                <button className="primary" onClick={replicateDependenciesFromBase}>
                  Replicar
                </button>
                {depReplicateResult && (
                  <div className="import-summary">
                    <span className="pill">
                      Origen: {depReplicateResult.sourceEstablishmentName}
                    </span>
                    <span className="pill">
                      Destino: {depReplicateResult.targetEstablishmentName}
                    </span>
                    <span className="pill">Base: {depReplicateResult.sourceCount}</span>
                    <span className="pill">Creadas: {depReplicateResult.createdCount}</span>
                    <span className="pill">Omitidas: {depReplicateResult.skippedCount}</span>
                    {depReplicateResult.skippedCount > 0 && (
                      <div className="muted">
                        Omitidas (duplicadas u otras):{' '}
                        {depReplicateResult.skipped
                          .slice(0, 10)
                          .map((s) => `${s.name || '-'} [${s.reason || 'SKIPPED'}]`)
                          .join(' · ')}
                        {depReplicateResult.skipped.length > 10 ? ' · ...' : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="table">
              <div className="table-head">
                <div className="sort-controls">
                  <label>Orden</label>
                  <select
                    value={depSort.key}
                    onChange={(e) => setDepSort((s) => ({ ...s, key: e.target.value }))}
                  >
                    <option value="name">Nombre</option>
                    <option value="establishmentId">Establecimiento</option>
                  </select>
                  <button
                    className="ghost"
                    onClick={() =>
                      setDepSort((s) => ({
                        ...s,
                        order: s.order === 'asc' ? 'desc' : 'asc',
                      }))
                    }
                  >
                    {depSort.order === 'asc' ? 'Asc' : 'Desc'}
                  </button>
                </div>
                <span className="muted">
                  Mostrando {dependencies.length} de {depTotal}
                </span>
              </div>
              {[...dependencies]
                .sort((a, b) => {
                  const dir = depSort.order === 'asc' ? 1 : -1
                  if (depSort.key === 'establishmentId')
                    return (a.establishmentId - b.establishmentId) * dir
                  return a.name.localeCompare(b.name) * dir
                })
                .map((d) => (
                <div key={d.id} className="row">
                  <div className="row-main">
                    <strong>#{d.id}</strong>
                    {!d.isActive && <span className="pill danger-pill">INACTIVA</span>}
                    <input
                      className="inline-input"
                      value={d.name}
                      onChange={(evt) => {
                        const next = dependencies.map((x) =>
                          x.id === d.id ? { ...x, name: evt.target.value } : x
                        )
                        setDependencies(next)
                      }}
                    />
                    <span className="pill">
                      {establishmentsCatalog.find(
                        (e) => Number(e.id) === Number(d.establishmentId)
                      )?.name || `Est ${d.establishmentId}`}
                    </span>
                  </div>
                  <div className="row-actions">
                    <button
                      disabled={
                        !depOriginal[d.id] ||
                        (depOriginal[d.id].name === d.name &&
                          depOriginal[d.id].establishmentId === d.establishmentId)
                      }
                      onClick={() =>
                        updateDependency({
                          id: d.id,
                          name: d.name,
                          establishmentId: d.establishmentId,
                        })
                      }
                    >
                      Guardar
                    </button>
                    {d.isActive ? (
                      <button
                        className="danger"
                        onClick={() => deleteDependency(d.id)}
                      >
                        Dar de baja
                      </button>
                    ) : (
                      <>
                        <button onClick={() => reactivateDependency(d.id)}>
                          Reactivar
                        </button>
                        <button
                          className="danger"
                          onClick={() => hardDeleteDependency(d.id)}
                        >
                          Eliminar definitivo
                        </button>
                        <button
                          className="danger danger-outline"
                          onClick={() => openForceDelete('dependency', d.id, d.name)}
                        >
                          Eliminar forzado
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {!dependencies.length && <p className="muted">Sin resultados.</p>}
            </div>
            <div className="pager">
              <button
                className="ghost"
                disabled={depPage <= 1}
                onClick={() => {
                  const next = depPage - 1
                  setDepPage(next)
                  loadDependencies(next)
                }}
              >
                Anterior
              </button>
              <span>
                Página {depPage} / {Math.max(1, Math.ceil(depTotal / 10))}
              </span>
              <button
                className="ghost"
                disabled={depPage >= Math.ceil(depTotal / 10)}
                onClick={() => {
                  const next = depPage + 1
                  setDepPage(next)
                  loadDependencies(next)
                }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {isAuthed && activeTab === 'users' && isCentral && (
          <div className="section">
            <div className="section-head">
              <h3>Usuarios</h3>
              <div className="actions">
                <input
                  placeholder="Buscar por nombre/email..."
                  value={userFilters.q}
                  onChange={(e) => setUserFilters({ ...userFilters, q: e.target.value })}
                />
                <select
                  value={userFilters.roleType}
                  onChange={(e) =>
                    setUserFilters({ ...userFilters, roleType: e.target.value })
                  }
                >
                  <option value="">Todos los roles</option>
                  <option value="ADMIN_CENTRAL">ADMIN_CENTRAL</option>
                  <option value="ADMIN_ESTABLISHMENT">ADMIN_ESTABLISHMENT</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
                <input
                  placeholder="Institution ID"
                  value={userFilters.institutionId}
                  onChange={(e) =>
                    setUserFilters({
                      ...userFilters,
                      institutionId: e.target.value.replace(/\D/g, ''),
                    })
                  }
                />
                <input
                  placeholder="Establishment ID"
                  value={userFilters.establishmentId}
                  onChange={(e) =>
                    setUserFilters({
                      ...userFilters,
                      establishmentId: e.target.value.replace(/\D/g, ''),
                    })
                  }
                />
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={userFilters.includeInactive}
                    onChange={(e) =>
                      setUserFilters({
                        ...userFilters,
                        includeInactive: e.target.checked,
                      })
                    }
                  />
                  Mostrar inactivos
                </label>
                <button onClick={() => loadUsersAdmin(1)}>Actualizar</button>
              </div>
            </div>

            <div className="split">
              <div className="form-card">
                <h4>Crear usuario</h4>
                <input
                  placeholder="Nombre *"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                />
                <input
                  placeholder="Email *"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                />
                <input
                  placeholder="Password *"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                />
                <select
                  value={userForm.roleType}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      roleType: e.target.value,
                      institutionId: e.target.value === 'ADMIN_CENTRAL' ? prev.institutionId : '',
                      establishmentId:
                        e.target.value === 'ADMIN_CENTRAL' ? '' : prev.establishmentId,
                    }))
                  }
                >
                  <option value="ADMIN_ESTABLISHMENT">ADMIN_ESTABLISHMENT</option>
                  <option value="VIEWER">VIEWER</option>
                  <option value="ADMIN_CENTRAL">ADMIN_CENTRAL</option>
                </select>
                <select
                  value={userForm.institutionId}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      institutionId: e.target.value,
                    })
                  }
                  disabled={userForm.roleType !== 'ADMIN_CENTRAL'}
                >
                  <option value="">Selecciona institución</option>
                  {userInstitutionOptions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      #{inst.id} · {inst.name}
                    </option>
                  ))}
                </select>
                <select
                  value={userForm.establishmentId}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      establishmentId: e.target.value,
                    })
                  }
                  disabled={userForm.roleType === 'ADMIN_CENTRAL'}
                >
                  <option value="">Selecciona establecimiento</option>
                  {userEstablishmentOptions.map((est) => (
                    <option key={est.id} value={est.id}>
                      #{est.id} · {est.name} · Comuna: {est.commune || 's/i'} · Inst {est.institutionId}
                    </option>
                  ))}
                </select>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={userFormWithoutPhoto}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setUserFormWithoutPhoto(checked)
                      if (checked) setUserFormPhotoFile(null)
                    }}
                  />
                  Sin foto
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  disabled={userFormWithoutPhoto}
                  onChange={(e) =>
                    setUserFormPhotoFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)
                  }
                />
                <button className="primary" onClick={createUserAdmin}>
                  Crear usuario
                </button>
              </div>
            </div>

            <div className="table">
              <div className="table-head">
                <span className="muted">
                  Mostrando {users.length} de {usersTotal}
                </span>
              </div>

              {usersLoading && <p className="muted">Cargando usuarios...</p>}
              {!usersLoading &&
                users.map((u) => (
                  <div key={u.id} className="row">
                    <div className="row-main">
                      <div className="user-thumb-wrap">
                        {u.photoDataUrl ? (
                          <img className="user-thumb" src={u.photoDataUrl} alt={`Foto ${u.name}`} />
                        ) : (
                          <div className="user-thumb user-thumb-empty">Sin foto</div>
                        )}
                      </div>
                      <strong>#{u.id}</strong>
                      {!u.isActive && <span className="pill danger-pill">INACTIVO</span>}
                      <input
                        className="inline-input"
                        value={u.name || ''}
                        onChange={(e) => {
                          const next = users.map((x) =>
                            x.id === u.id ? { ...x, name: e.target.value } : x
                          )
                          setUsers(next)
                        }}
                      />
                      <span className="pill">{u.email}</span>
                      <select
                        value={u.roleType || ''}
                        onChange={(e) => {
                          const next = users.map((x) =>
                            x.id === u.id
                              ? {
                                  ...x,
                                  roleType: e.target.value,
                                  establishmentId:
                                    e.target.value === 'ADMIN_CENTRAL'
                                      ? ''
                                      : x.establishmentId,
                                }
                              : x
                          )
                          setUsers(next)
                        }}
                      >
                        <option value="ADMIN_CENTRAL">ADMIN_CENTRAL</option>
                        <option value="ADMIN_ESTABLISHMENT">ADMIN_ESTABLISHMENT</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                      <input
                        className="inline-input small"
                        value={u.institutionId || ''}
                        onChange={(e) => {
                          const next = users.map((x) =>
                            x.id === u.id ? { ...x, institutionId: e.target.value } : x
                          )
                          setUsers(next)
                        }}
                      />
                      <select
                        className="inline-input"
                        value={u.establishmentId || ''}
                        disabled={u.roleType === 'ADMIN_CENTRAL'}
                        onChange={(e) => {
                          const next = users.map((x) =>
                            x.id === u.id ? { ...x, establishmentId: e.target.value } : x
                          )
                          setUsers(next)
                        }}
                      >
                        <option value="">Sin establecimiento</option>
                        {userEstablishmentOptions.map((est) => (
                          <option key={est.id} value={est.id}>
                            #{est.id} · {est.name} · {est.commune || 's/i'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="row-actions">
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={(e) =>
                          setUserPhotoFiles((prev) => ({
                            ...prev,
                            [u.id]: e.target.files && e.target.files[0] ? e.target.files[0] : null,
                          }))
                        }
                      />
                      <button
                        className="ghost"
                        onClick={async () => {
                          try {
                            await saveUserPhotoAdmin(u.id, userPhotoFiles[u.id])
                          } catch (err) {
                            setErr(err)
                          }
                        }}
                      >
                        Guardar foto
                      </button>
                      <button
                        className="ghost"
                        onClick={async () => {
                          try {
                            await clearUserPhotoAdmin(u.id)
                          } catch (err) {
                            setErr(err)
                          }
                        }}
                      >
                        Sin foto
                      </button>
                      <button
                        disabled={
                          !usersOriginal[u.id] ||
                          (usersOriginal[u.id].name === u.name &&
                            usersOriginal[u.id].roleType === u.roleType &&
                            String(usersOriginal[u.id].institutionId || '') ===
                              String(u.institutionId || '') &&
                            String(usersOriginal[u.id].establishmentId || '') ===
                              String(u.establishmentId || ''))
                        }
                        onClick={() => updateUserAdmin(u)}
                      >
                        Guardar
                      </button>
                      {u.isActive ? (
                        <button
                          className="danger"
                          disabled={Number(currentUser?.id) === Number(u.id)}
                          onClick={() => deactivateUserAdmin(u.id, u.email)}
                        >
                          Desactivar
                        </button>
                      ) : (
                        <>
                          <button
                            className="ghost"
                            onClick={() => reactivateUserAdmin(u.id, u.email)}
                          >
                            Reactivar
                          </button>
                          <button
                            className="danger danger-outline"
                            disabled={Number(currentUser?.id) === Number(u.id)}
                            onClick={() => openForceDelete('user', u.id, u.email)}
                          >
                            Eliminar forzado
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              {!usersLoading && !users.length && <p className="muted">Sin resultados.</p>}
            </div>

            <div className="pager">
              <button
                className="ghost"
                disabled={usersPage <= 1}
                onClick={() => {
                  const next = usersPage - 1
                  setUsersPage(next)
                  loadUsersAdmin(next)
                }}
              >
                Anterior
              </button>
              <span>
                Página {usersPage} / {Math.max(1, Math.ceil(usersTotal / 10))}
              </span>
              <button
                className="ghost"
                disabled={usersPage >= Math.ceil(usersTotal / 10)}
                onClick={() => {
                  const next = usersPage + 1
                  setUsersPage(next)
                  loadUsersAdmin(next)
                }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {isAuthed && activeTab === 'assistant' && isCentral && (
          <div className="section">
            <div className="section-head">
              <h3>Asistente Central y Mesa de Solicitudes</h3>
              <div className="actions">
                <button onClick={() => loadSupportRequests(1)}>Actualizar</button>
                <button
                  className="ghost"
                  onClick={testAssistantSmtp}
                  disabled={assistantSmtpLoading}
                >
                  {assistantSmtpLoading ? 'Probando SMTP...' : 'Probar SMTP'}
                </button>
              </div>
            </div>

            <div className="split">
              <div className="form-card">
                <h4>Consulta al asistente</h4>
                <textarea
                  rows={4}
                  placeholder="Escribe la consulta del inventario..."
                  value={assistantQuestion}
                  onChange={(e) => setAssistantQuestion(e.target.value)}
                />
                <div className="grid">
                  <select
                    value={assistantScope.institutionId}
                    onChange={(e) =>
                      setAssistantScope((prev) => ({
                        ...prev,
                        institutionId: e.target.value,
                        establishmentId: '',
                        dependencyId: '',
                      }))
                    }
                  >
                    <option value="">Institucion (opcional)</option>
                    {institutionsCatalog.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={assistantScope.establishmentId}
                    onChange={(e) =>
                      setAssistantScope((prev) => ({
                        ...prev,
                        establishmentId: e.target.value,
                        dependencyId: '',
                      }))
                    }
                    disabled={!assistantScope.institutionId}
                  >
                    <option value="">Establecimiento (opcional)</option>
                    {establishmentsCatalog
                      .filter((item) =>
                        assistantScope.institutionId
                          ? String(item.institutionId) === String(assistantScope.institutionId)
                          : true
                      )
                      .map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                  <select
                    value={assistantScope.dependencyId}
                    onChange={(e) =>
                      setAssistantScope((prev) => ({
                        ...prev,
                        dependencyId: e.target.value,
                      }))
                    }
                    disabled={!assistantScope.establishmentId}
                  >
                    <option value="">Dependencia (opcional)</option>
                    {dependenciesCatalog.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="email"
                    placeholder="Correo destino notificaciones"
                    value={assistantNotifyEmail}
                    onChange={(e) => setAssistantNotifyEmail(e.target.value)}
                  />
                </div>
                <button className="primary" onClick={askCentralAssistant} disabled={assistantLoading}>
                  {assistantLoading ? 'Analizando...' : 'Preguntar'}
                </button>
              </div>

              <div className="form-card">
                <h4>Respuesta</h4>
                {!assistantAnswer ? (
                  <p className="muted">Sin respuesta aun.</p>
                ) : (
                  <>
                    <p>{assistantAnswer.answer}</p>
                    <p className="muted">
                      Contexto: activos {assistantAnswer.context?.assetsActive || 0} · abiertas{' '}
                      {assistantAnswer.context?.openRequests || 0} · vencidas{' '}
                      {assistantAnswer.context?.overdueRequests || 0}
                    </p>
                    <ul>
                      {(assistantAnswer.suggestions || []).map((s, idx) => (
                        <li key={`assistant-suggestion-${idx}`}>{s}</li>
                      ))}
                    </ul>
                    <button className="ghost" onClick={createSupportRequestFromAssistant}>
                      Crear solicitud (SLA 72h)
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="section-head">
              <h4>Mesa de solicitudes</h4>
              <div className="actions">
                <input
                  placeholder="Buscar asunto/pregunta..."
                  value={supportFilters.q}
                  onChange={(e) => setSupportFilters((prev) => ({ ...prev, q: e.target.value }))}
                />
                <select
                  value={supportFilters.status}
                  onChange={(e) =>
                    setSupportFilters((prev) => ({ ...prev, status: e.target.value }))
                  }
                >
                  <option value="">Todos estados</option>
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="OVERDUE">OVERDUE</option>
                </select>
                <select
                  value={supportFilters.priority}
                  onChange={(e) =>
                    setSupportFilters((prev) => ({ ...prev, priority: e.target.value }))
                  }
                >
                  <option value="">Todas prioridades</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
                <button onClick={() => loadSupportRequests(1)}>Buscar</button>
              </div>
            </div>

            <div className="table">
              <div className="table-head">
                <span className="muted">
                  Mostrando {supportRequests.length} de {supportTotal}
                </span>
              </div>
              {supportLoading && <p className="muted">Cargando solicitudes...</p>}
              {!supportLoading &&
                supportRequests.map((item) => (
                  <div key={item.id} className="row">
                    <div className="row-main">
                      <strong>#{item.id}</strong>
                      <span className="pill">{item.status}</span>
                      <span className="pill">{item.priority}</span>
                      <span>{item.subject}</span>
                      <span className="muted">
                        Vence: {item.dueAt ? new Date(item.dueAt).toLocaleString() : '-'}
                      </span>
                    </div>
                    <div className="row-actions">
                      <button className="ghost" onClick={() => updateSupportStatus(item, 'IN_PROGRESS')}>
                        Tomar
                      </button>
                      <button className="ghost" onClick={() => updateSupportStatus(item, 'RESOLVED')}>
                        Resolver
                      </button>
                      <button className="ghost" onClick={() => updateSupportStatus(item, 'OPEN')}>
                        Reabrir
                      </button>
                    </div>
                    <div className="row-main" style={{ marginTop: 8 }}>
                      <span className="muted">{item.question}</span>
                    </div>
                    <div className="row-main" style={{ marginTop: 8 }}>
                      <input
                        className="inline-input"
                        placeholder="Agregar comentario..."
                        value={supportCommentDraft[item.id] || ''}
                        onChange={(e) =>
                          setSupportCommentDraft((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                      />
                      <button className="ghost" onClick={() => sendSupportComment(item)}>
                        Comentar
                      </button>
                    </div>
                  </div>
                ))}
              {!supportLoading && !supportRequests.length && (
                <p className="muted">Sin solicitudes.</p>
              )}
            </div>

            <div className="pager">
              <button
                className="ghost"
                disabled={supportPage <= 1}
                onClick={() => {
                  const next = supportPage - 1
                  setSupportPage(next)
                  loadSupportRequests(next)
                }}
              >
                Anterior
              </button>
              <span>
                Pagina {supportPage} / {Math.max(1, Math.ceil(supportTotal / 10))}
              </span>
              <button
                className="ghost"
                disabled={supportPage >= Math.ceil(supportTotal / 10)}
                onClick={() => {
                  const next = supportPage + 1
                  setSupportPage(next)
                  loadSupportRequests(next)
                }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {isAuthed && activeTab === 'assets' && (
          <div className="section">
            <div className="section-head">
              <h3>Activos Fijos</h3>
              <div className="actions">
                <button className="ghost" onClick={loadCatalogItems}>
                  Actualizar catálogo
                </button>
              </div>
            </div>
            <div className="split">
              <div className="form-card">
                <h4>Crear activo fijo</h4>
                <div className="select-wrap">
                  <label>Institución</label>
                  <select
                    value={assetInstitutionId}
                    onChange={(e) => {
                      const value = e.target.value
                      setAssetInstitutionId(value)
                      setAssetEstablishments([])
                      setAssetDependencies([])
                      setAssetForm((prev) => ({
                        ...prev,
                        establishmentId: '',
                        dependencyId: '',
                      }))
                      if (value) {
                        loadAssetEstablishments(value)
                      }
                    }}
                  >
                    <option value="">Selecciona institución</option>
                    {institutionsCatalog.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                  {assetInstitutionId && (
                    <p className="muted">
                      Institución seleccionada: {selectedAssetInstitution?.name || 'N/D'}
                    </p>
                  )}
                </div>
                <div className="select-wrap">
                  <label>Establecimiento</label>
                  <select
                    value={assetForm.establishmentId}
                    onChange={(e) => {
                      const value = e.target.value
                      setAssetDependencies([])
                      setAssetForm((prev) => ({
                        ...prev,
                        establishmentId: value,
                        dependencyId: '',
                      }))
                      if (value) loadAssetDependencies(value)
                    }}
                  >
                    <option value="">Selecciona establecimiento</option>
                    {assetEstablishments.map((est) => (
                      <option key={est.id} value={est.id}>
                        {est.name}
                      </option>
                    ))}
                  </select>
                  {assetForm.establishmentId && (
                    <p className="muted">
                      Establecimiento seleccionado: {selectedAssetEstablishment?.name || 'N/D'}
                    </p>
                  )}
                  {assetErrors.establishmentId && (
                    <p className="error">{assetErrors.establishmentId}</p>
                  )}
                </div>
                <div className="select-wrap">
                  <label>Dependencia</label>
                  <select
                    value={assetForm.dependencyId}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, dependencyId: e.target.value }))
                    }
                    disabled={!assetForm.establishmentId}
                  >
                    <option value="">Selecciona dependencia</option>
                    {assetDependencies.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.name}
                        {selectedAssetEstablishment?.name
                          ? ` · ${selectedAssetEstablishment.name}`
                          : ''}
                      </option>
                    ))}
                  </select>
                  {assetErrors.dependencyId && (
                    <p className="error">{assetErrors.dependencyId}</p>
                  )}
                </div>
                <div className="select-wrap">
                  <label>Estado</label>
                  <select
                    value={assetForm.assetStateId}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, assetStateId: e.target.value }))
                    }
                  >
                    <option value="">Selecciona estado</option>
                    {assetStates.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                  {assetErrors.assetStateId && (
                    <p className="error">{assetErrors.assetStateId}</p>
                  )}
                </div>
                <div className="select-wrap">
                  <label>Tipo de activo fijo</label>
                  <select
                    value={assetForm.assetTypeId}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, assetTypeId: e.target.value }))
                    }
                  >
                    <option value="">Selecciona tipo</option>
                    {assetTypes.map((tp) => (
                      <option key={tp.id} value={tp.id}>
                        {tp.name}
                      </option>
                    ))}
                  </select>
                  {assetErrors.assetTypeId && (
                    <p className="error">{assetErrors.assetTypeId}</p>
                  )}
                </div>
                <div className="select-wrap">
                  <label>Catálogo</label>
                  <p className="muted">Selecciona desde la lista de catálogo disponible.</p>
                  <select
                    value={assetForm.catalogItemId}
                    onChange={(e) => handleSelectCatalogItem(e.target.value)}
                  >
                    <option value="">Sin catálogo (manual)</option>
                    {assetCatalogItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {formatCatalogItemDisplay(item)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Nombre</label>
                  <input
                    value={assetForm.name}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Ej: Mesa redonda reuniones"
                  />
                  {assetErrors.name && <p className="error">{assetErrors.name}</p>}
                </div>
                <div className="field">
                  <label>Marca</label>
                  <input
                    value={assetForm.brand}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, brand: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Modelo</label>
                  <input
                    value={assetForm.modelName}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, modelName: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Serie</label>
                  <input
                    value={assetForm.serialNumber}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, serialNumber: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={assetForm.quantity}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                  />
                  {assetErrors.quantity && <p className="error">{assetErrors.quantity}</p>}
                </div>
                <div className="field">
                  <label>Cuenta contable</label>
                  <input
                    value={assetForm.accountingAccount}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, accountingAccount: e.target.value }))
                    }
                  />
                  {assetErrors.accountingAccount && (
                    <p className="error">{assetErrors.accountingAccount}</p>
                  )}
                </div>
                <div className="field">
                  <label>Código analitico</label>
                  <input
                    value={assetForm.analyticCode || 'Se genera automaticamente al crear'}
                    readOnly
                    disabled
                  />
                  <p className="muted">Código generado por el sistema.</p>
                </div>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={!assetHasResponsible}
                    onChange={(e) => {
                      const withoutResponsible = e.target.checked
                      setAssetHasResponsible(!withoutResponsible)
                      if (withoutResponsible) {
                        setAssetForm((prev) => ({
                          ...prev,
                          responsibleName: '',
                          responsibleRut: '',
                          responsibleRole: '',
                          costCenter: '',
                        }))
                      }
                    }}
                  />
                  Sin responsable asignado
                </label>
                {assetHasResponsible ? (
                  <>
                    <div className="field">
                      <label>Responsable (nombre)</label>
                      <input
                        value={assetForm.responsibleName}
                        onChange={(e) =>
                          setAssetForm((prev) => ({ ...prev, responsibleName: e.target.value }))
                        }
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div className="field">
                      <label>RUT responsable</label>
                      <input
                        value={assetForm.responsibleRut}
                        onChange={(e) =>
                          setAssetForm((prev) => ({ ...prev, responsibleRut: e.target.value }))
                        }
                        onBlur={(e) =>
                          setAssetForm((prev) => ({
                            ...prev,
                            responsibleRut: normalizeRutValue(e.target.value),
                          }))
                        }
                        placeholder="12.345.678-9"
                      />
                      {assetErrors.responsibleRut && (
                        <p className="error">{assetErrors.responsibleRut}</p>
                      )}
                    </div>
                    <div className="field">
                      <label>Cargo responsable</label>
                      <input
                        value={assetForm.responsibleRole}
                        onChange={(e) =>
                          setAssetForm((prev) => ({ ...prev, responsibleRole: e.target.value }))
                        }
                        placeholder="Ej: Encargado de bodega"
                      />
                    </div>
                    <div className="field">
                      <label>Centro de costo</label>
                      <input
                        value={assetForm.costCenter}
                        onChange={(e) =>
                          setAssetForm((prev) => ({ ...prev, costCenter: e.target.value }))
                        }
                        onBlur={(e) =>
                          setAssetForm((prev) => ({
                            ...prev,
                            costCenter: normalizeCostCenterValue(e.target.value),
                          }))
                        }
                        placeholder="Ej: CC-ADM-01"
                      />
                    </div>
                  </>
                ) : (
                  <p className="muted">Se creara el activo fijo sin responsable asignado.</p>
                )}
                <div className="field">
                  <label>Valor adquisicion</label>
                  <input
                    type="number"
                    value={assetForm.acquisitionValue}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, acquisitionValue: e.target.value }))
                    }
                  />
                  {assetErrors.acquisitionValue && (
                    <p className="error">{assetErrors.acquisitionValue}</p>
                  )}
                </div>
                <div className="field">
                  <label>Fecha adquisicion</label>
                  <input
                    type="date"
                    value={assetForm.acquisitionDate}
                    onChange={(e) =>
                      setAssetForm((prev) => ({ ...prev, acquisitionDate: e.target.value }))
                    }
                  />
                  {assetErrors.acquisitionDate && (
                    <p className="error">{assetErrors.acquisitionDate}</p>
                  )}
                </div>
                <div className="actions">
                  <button className="primary" onClick={handleCreateAsset} disabled={assetCreating}>
                    {assetCreating ? 'Creando...' : 'Crear activo fijo'}
                  </button>
                  <button
                    className="ghost"
                    onClick={() =>
                      (() => {
                        setAssetForm({
                          catalogItemId: '',
                          name: '',
                          quantity: '1',
                          brand: '',
                          modelName: '',
                          serialNumber: '',
                          accountingAccount: '',
                          analyticCode: '',
                          responsibleName: '',
                          responsibleRut: '',
                          responsibleRole: '',
                          costCenter: '',
                          acquisitionValue: '',
                          acquisitionDate: '',
                          establishmentId: '',
                          dependencyId: '',
                          assetStateId: '',
                          assetTypeId: '',
                        })
                        setAssetHasResponsible(true)
                        setCreatedAsset(null)
                        setQrCodeUrl('')
                      })()
                    }
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              <div className="form-card">
                <h4>Etiqueta</h4>
                <div className="field">
                  <label>Escanear/pegar código QR</label>
                  <div className="actions">
                    <input
                      placeholder="Ej: INV-123 o 123"
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          resolveScannedAsset()
                        }
                      }}
                    />
                    <button className="ghost" onClick={resolveScannedAsset}>
                      Buscar
                    </button>
                    <button
                      className="ghost"
                      onClick={() => {
                        setScanInput('')
                        setScanResult(null)
                      }}
                    >
                      Limpiar
                    </button>
                  </div>
                  {scanResult && (
                    <p
                      className={
                        scanResult.status === 'ok' ? 'status ok inline-status' : 'status error inline-status'
                      }
                    >
                      {scanResult.message}
                    </p>
                  )}
                </div>
                {!createdAsset && (
                  <>
                    <p className="muted">Crea un activo fijo o selecciona uno de la lista.</p>
                    <div className="field">
                      <label>Seleccionar activo fijo</label>
                      <select
                        value={labelAssetId}
                        onChange={(e) => {
                          const value = e.target.value
                          setLabelAssetId(value)
                          const asset = assetsList.find(
                            (a) => String(a.id) === String(value)
                          )
                          if (asset) {
                            const selectedId = toPositiveIntOrNull(asset.id)
                            setCreatedAsset(asset)
                            setSelectedCatalogItem(asset?.catalogItem || null)
                            if (selectedId) {
                              localStorage.setItem('last_asset_id', String(selectedId))
                            }
                          }
                        }}
                      >
                        <option value="">Selecciona activo fijo</option>
                        {assetsList.map((a) => (
                          <option key={a.id} value={a.id}>
                            INV-{a.internalCode} · {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                {createdAsset && labelData && (
                  <div className="label-preview">
                    <div className="label-code">
                      Código: <strong>{labelData.code}</strong>
                    </div>
                    <div className="label-scan-info">
                      <span>ID: #{createdAsset.id}</span>
                      <span>Cantidad: {createdAsset.quantity ?? 1}</span>
                      {createdAsset.serialNumber && <span>Serie: {createdAsset.serialNumber}</span>}
                      {createdAsset.brand && <span>Marca: {createdAsset.brand}</span>}
                      {createdAsset.modelName && <span>Modelo: {createdAsset.modelName}</span>}
                      {createdAsset.responsibleName && (
                        <span>Responsable: {createdAsset.responsibleName}</span>
                      )}
                      {createdAsset.costCenter && <span>CC: {createdAsset.costCenter}</span>}
                    </div>
                    <div className="label-meta">
                      <span>Nombre: {labelData.name}</span>
                      {labelData.establishment && <span>Est: {labelData.establishment}</span>}
                      {labelData.dependency && <span>Dep: {labelData.dependency}</span>}
                      {labelData.assetState && <span>Estado: {labelData.assetState}</span>}
                    </div>
                    {qrCodeUrl && <img className="qr" src={qrCodeUrl} alt="QR" />}
                    <svg id="barcode-preview" className="barcode" />
                    <div className="actions">
                      <button className="ghost" onClick={openPrintLabel}>
                        Imprimir
                      </button>
                      <button className="ghost" onClick={downloadLabelPdf}>
                        Descargar PDF
                      </button>
                      <button
                        className="ghost"
                        onClick={() => {
                          const value = labelData.code
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(value)
                          }
                        }}
                      >
                        Copiar código
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="table">
              <div className="table-head">
                <h4>Catálogo disponible</h4>
                <div className="actions">
                  <span className="muted">Mostrando {assetCatalogItems.length}</span>
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => setShowAssetCatalogList((prev) => !prev)}
                  >
                    {showAssetCatalogList ? 'Ocultar catálogo' : 'Mostrar catálogo'}
                  </button>
                </div>
              </div>
              {showAssetCatalogList ? (
                <>
                  {assetCatalogItems.map((item) => (
                    <div key={item.id} className="row clickable" onClick={() => applyCatalogItem(item)}>
                      <div>
                        <strong>{formatCatalogItemDisplay(item)}</strong>
                        <span className="muted"> · {item.category}</span>
                      </div>
                      <div className="row-actions">
                        <button className="ghost" onClick={() => applyCatalogItem(item)}>
                          Usar
                        </button>
                      </div>
                    </div>
                  ))}
                  {!assetCatalogItems.length && <p className="muted">Sin items.</p>}
                </>
              ) : (
                <p className="muted">
                  Catálogo oculto. Usa "Mostrar catálogo" para ver los items.
                </p>
              )}
            </div>

            <div className="table">
              <div className="table-head">
                <h4>Activos fijos creados</h4>
                <span className="muted">
                  {assetsLoading ? 'Cargando...' : `Mostrando ${assetsList.length}`}
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
                    placeholder="Código interno"
                    value={assetListFilters.internalCode}
                    onChange={(e) =>
                      setAssetListFilters((p) => ({
                        ...p,
                        internalCode: e.target.value,
                      }))
                    }
                    className="inline-input small"
                  />
                  <input
                    placeholder="Buscar por código o nombre..."
                    value={assetListFilters.q}
                    onChange={(e) =>
                      setAssetListFilters((p) => ({ ...p, q: e.target.value }))
                    }
                  />
                  <input
                    placeholder="Responsable"
                    value={assetListFilters.responsibleName}
                    onChange={(e) =>
                      setAssetListFilters((p) => ({
                        ...p,
                        responsibleName: e.target.value,
                      }))
                    }
                  />
                  <input
                    placeholder="Centro costo"
                    value={assetListFilters.costCenter}
                    onChange={(e) =>
                      setAssetListFilters((p) => ({ ...p, costCenter: e.target.value }))
                    }
                  />
                  <input
                    type="date"
                    value={assetListFilters.fromDate}
                    onChange={(e) =>
                      setAssetListFilters((p) => ({ ...p, fromDate: e.target.value }))
                    }
                  />
                  <input
                    type="date"
                    value={assetListFilters.toDate}
                    onChange={(e) =>
                      setAssetListFilters((p) => ({ ...p, toDate: e.target.value }))
                    }
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
                    Mostrar dados de baja
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
                    <option value="">Institución</option>
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
                    onChange={(e) =>
                      setAssetListFilters((p) => ({ ...p, dependencyId: e.target.value }))
                    }
                    disabled={!assetListFilters.establishmentId}
                  >
                    <option value="">Dependencia</option>
                    {assetListDependencies.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={assetListFilters.assetStateId}
                    onChange={(e) =>
                      setAssetListFilters((p) => ({ ...p, assetStateId: e.target.value }))
                    }
                  >
                    <option value="">Estado</option>
                    {assetStates.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                  <button className="ghost" onClick={loadAssetsList}>
                    Actualizar
                  </button>
                  <button
                    className="ghost"
                    onClick={() => {
                      const params = new URLSearchParams()
                      const safeId = toPositiveIntOrNull(assetListFilters.id)
                      if (safeId) params.set('id', String(safeId))
                      if (assetListFilters.internalCode)
                        params.set('internalCode', assetListFilters.internalCode)
                      if (assetListFilters.q) params.set('q', assetListFilters.q)
                      if (assetListFilters.responsibleName)
                        params.set('responsibleName', assetListFilters.responsibleName)
                      if (assetListFilters.costCenter)
                        params.set('costCenter', assetListFilters.costCenter)
                      if (assetListFilters.institutionId)
                        params.set('institutionId', assetListFilters.institutionId)
                      if (assetListFilters.establishmentId)
                        params.set('establishmentId', assetListFilters.establishmentId)
                      if (assetListFilters.dependencyId)
                        params.set('dependencyId', assetListFilters.dependencyId)
                      if (assetListFilters.assetStateId)
                        params.set('assetStateId', assetListFilters.assetStateId)
                      if (assetListFilters.includeDeleted)
                        params.set('includeDeleted', 'true')
                      if (assetListFilters.fromDate)
                        params.set('fromDate', assetListFilters.fromDate)
                      if (assetListFilters.toDate)
                        params.set('toDate', assetListFilters.toDate)
                      const qs = params.toString()
                      downloadFile(
                        `/assets/export/excel${qs ? `?${qs}` : ''}`,
                        'assets_filtrados.xlsx'
                      )
                    }}
                  >
                    Exportar Excel
                  </button>
                  <button
                    className="ghost"
                    onClick={() => {
                      const params = new URLSearchParams()
                      const safeId = toPositiveIntOrNull(assetListFilters.id)
                      if (safeId) params.set('id', String(safeId))
                      if (assetListFilters.internalCode)
                        params.set('internalCode', assetListFilters.internalCode)
                      if (assetListFilters.q) params.set('q', assetListFilters.q)
                      if (assetListFilters.responsibleName)
                        params.set('responsibleName', assetListFilters.responsibleName)
                      if (assetListFilters.costCenter)
                        params.set('costCenter', assetListFilters.costCenter)
                      if (assetListFilters.establishmentId)
                        params.set('establishmentId', assetListFilters.establishmentId)
                      if (assetListFilters.dependencyId)
                        params.set('dependencyId', assetListFilters.dependencyId)
                      if (assetListFilters.assetStateId)
                        params.set('assetStateId', assetListFilters.assetStateId)
                      if (assetListFilters.includeDeleted)
                        params.set('includeDeleted', 'true')
                      if (assetListFilters.fromDate)
                        params.set('fromDate', assetListFilters.fromDate)
                      if (assetListFilters.toDate)
                        params.set('toDate', assetListFilters.toDate)
                      const qs = params.toString()
                      downloadFile(
                        `/assets/export/pdf${qs ? `?${qs}` : ''}`,
                        'assets_filtrados.pdf'
                      )
                    }}
                  >
                    Exportar PDF
                  </button>
                </div>
              </div>
              {assetsList.map((asset) => (
                <div key={asset.id} className="row">
                  <div className="row-main">
                    <strong>#{asset.id}</strong>
                    <span className="pill">INV-{asset.internalCode}</span>
                    <span>{asset.name}</span>
                    <span className="pill">Cant: {asset.quantity ?? 1}</span>
                    {asset.assetState?.name && (
                      <span
                        className={
                          asset.isDeleted || asset.assetState.name === 'BAJA'
                            ? 'pill danger-pill'
                            : 'pill'
                        }
                      >
                        {asset.assetState.name}
                      </span>
                    )}
                    {asset.dependency?.name && (
                      <span className="pill">{asset.dependency.name}</span>
                    )}
                    {asset.responsibleName && (
                      <span className="pill">Resp: {asset.responsibleName}</span>
                    )}
                    {asset.responsibleRut && <span className="pill">RUT: {asset.responsibleRut}</span>}
                    {asset.responsibleRole && (
                      <span className="pill">Cargo: {asset.responsibleRole}</span>
                    )}
                    {asset.costCenter && <span className="pill">CC: {asset.costCenter}</span>}
                  </div>
                  <div className="row-actions">
                    <button
                      className="ghost"
                      onClick={() => selectAssetForModal(asset)}
                    >
                      Ver
                    </button>
                    <button
                      className="ghost"
                      onClick={() => selectAssetForModal(asset, 'edit')}
                    >
                      Editar
                    </button>
                    <button
                      className="ghost"
                      onClick={() => selectAssetForModal(asset, 'move')}
                    >
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
                      onClick={() => selectAssetForModal(asset, 'status')}
                    >
                      Dar de baja
                    </button>
                  </div>
                </div>
              ))}
              {!assetsList.length && !assetsLoading && (
                <p className="muted">Sin activos fijos.</p>
              )}
              <div className="pagination">
                <button
                  className="ghost"
                  disabled={assetListPage <= 1}
                  onClick={() => loadAssetsList(assetListPage - 1)}
                >
                  Anterior
                </button>
                <span className="muted">
                  Pagina {assetListPage} / {Math.max(1, Math.ceil(assetListTotal / 20))}
                </span>
                <button
                  className="ghost"
                  disabled={assetListPage >= Math.ceil(assetListTotal / 20)}
                  onClick={() => loadAssetsList(assetListPage + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}

        {isAuthed && activeTab === 'trash' && (
          <div className="section">
            <div className="section-head">
              <h3>Basurero</h3>
              <div className="actions">
                <input
                  placeholder="Buscar..."
                  value={trashFilters.q}
                  onChange={(e) => setTrashFilters((p) => ({ ...p, q: e.target.value }))}
                />
                <input
                  placeholder="Código interno"
                  value={trashFilters.internalCode}
                  onChange={(e) =>
                    setTrashFilters((p) => ({ ...p, internalCode: e.target.value }))
                  }
                />
                <input
                  type="date"
                  value={trashFilters.deletedFrom}
                  onChange={(e) =>
                    setTrashFilters((p) => ({ ...p, deletedFrom: e.target.value }))
                  }
                />
                <input
                  type="date"
                  value={trashFilters.deletedTo}
                  onChange={(e) =>
                    setTrashFilters((p) => ({ ...p, deletedTo: e.target.value }))
                  }
                />
                <button className="ghost" onClick={loadTrash}>
                  Actualizar
                </button>
              </div>
            </div>
            <div className="table">
              <div className="table-head">
                <span className="muted">
                  {trashLoading ? 'Cargando...' : `Mostrando ${trashAssets.length}`}
                </span>
              </div>
              {trashAssets.map((asset) => (
                <div key={asset.id} className="row">
                  <div className="row-main">
                    <strong>#{asset.id}</strong>
                    <span className="pill danger-pill">BAJA</span>
                    <span className="pill">INV-{asset.internalCode}</span>
                    <span>{asset.name}</span>
                    {asset.deletedAt && (
                      <span className="muted">
                        Baja: {String(asset.deletedAt).slice(0, 10)}
                      </span>
                    )}
                  </div>
                  <div className="row-actions">
                    <button className="ghost" onClick={() => restoreFromTrash(asset)}>
                      Restaurar
                    </button>
                    <button
                      className="danger danger-outline"
                      onClick={() =>
                        openForceDelete('asset', asset.id, `${asset.name || 'Activo'} (INV-${asset.internalCode})`)
                      }
                    >
                      Eliminar forzado
                    </button>
                  </div>
                </div>
              ))}
              {!trashAssets.length && !trashLoading && (
                <p className="muted">Basurero vacio.</p>
              )}
            </div>
          </div>
        )}

        {isAuthed && activeTab === 'imports' && (
          <div className="section">
            <div className="section-head">
              <h3>Importaciones</h3>
              <div className="actions">
                <button
                  className={importsView === 'assets' ? 'primary' : 'ghost'}
                  onClick={() => setImportsView('assets')}
                >
                  Activos Fijos
                </button>
                <button
                  className={importsView === 'catalog' ? 'primary' : 'ghost'}
                  onClick={() => setImportsView('catalog')}
                >
                  Catálogo Estándar
                </button>
                <button
                  className={importsView === 'sn' ? 'primary' : 'ghost'}
                  onClick={() => setImportsView('sn')}
                >
                  Catálogo Base SN
                </button>
              </div>
            </div>
          </div>
        )}

        {isAuthed && activeTab === 'imports' && importsView === 'assets' && (
          <div className="section">
            <div className="section-head">
              <h3>Carga Masiva (Excel)</h3>
              <div className="actions">
                <button
                  className="ghost"
                  onClick={() =>
                    downloadFile('/assets/import/template/excel', 'assets_filtrados.xlsx')
                  }
                >
                  Descargar plantilla Activo Fijo
                </button>
                <button
                  className="ghost"
                  onClick={() =>
                    downloadFile('/assets/import/catalog/excel', 'assets_catalog_ids.xlsx')
                  }
                >
                  Descargar IDs
                </button>
              </div>
            </div>
            <div className="split">
              <div className="form-card upload-card">
                <h4>Subir archivo</h4>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setImportFile(file)
                    handlePreviewFile(file)
                  }}
                />
                <p className="muted">
                  Columnas requeridas: Establecimiento, Dependencia, Tipo, Estado, Nombre, Cuenta Contable, Analítico, Valor Adquisición, Fecha Adquisición.
                </p>
                <button className="primary" onClick={handleImportUpload} disabled={importLoading}>
                  {importLoading ? 'Importando...' : 'Importar Excel'}
                </button>
              </div>
              <div className="form-card">
                <h4>Resultado</h4>
                {importResult ? (
                  <div className="import-summary">
                    <p>
                      Creados: <strong>{importResult.createdCount}</strong>
                    </p>
                    <p>
                      Errores: <strong>{importResult.errorCount}</strong>
                    </p>
                  </div>
                ) : (
                  <p className="muted">Aún no hay importación.</p>
                )}
              </div>
            </div>
            {importSchemaDetails?.missingColumns && (
              <div className="alert">
                <strong>Faltan columnas:</strong>{' '}
                {importSchemaDetails.missingColumns.join(', ')}
              </div>
            )}
            {previewHeaders.length > 0 && (
              <div className="preview">
                <div className="table-head">
                  <h4>Preview</h4>
                  {previewMissing.length > 0 && (
                    <span className="muted">Faltan: {previewMissing.join(', ')}</span>
                  )}
                </div>
                <div className="preview-table">
                  <div className="preview-row header">
                    {previewHeaders.map((h, idx) => (
                      <div key={`ph-${idx}`} className="preview-cell">
                        {String(h)}
                      </div>
                    ))}
                  </div>
                  {previewRows.map((row, idx) => {
                    const invalidCols = previewInvalidCells[idx + 1] || []
                    return (
                      <div key={`pr-${idx}`} className="preview-row">
                        {row.map((cell, cidx) => (
                          <div
                            key={`pc-${idx}-${cidx}`}
                            className={`preview-cell${invalidCols.includes(cidx) ? ' invalid' : ''}`}
                          >
                            {String(cell)}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {importErrors.length > 0 && (
              <div className="table">
                <div className="table-head">
                  <h4>Errores por fila</h4>
                  <span className="muted">Corrige y vuelve a importar</span>
                </div>
                {importErrors.map((err, idx) => (
                  <div key={`imp-${idx}`} className="row">
                    <div>
                      <strong>Fila {err.row}</strong>
                      {err.fields?.length ? (
                        <span className="muted"> · {err.fields.join(', ')}</span>
                      ) : null}
                    </div>
                    <div className="muted">{err.error}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="section-head" style={{ marginTop: '16px' }}>
              <h4>Historial de importaciónes</h4>
              <div className="actions">
                <input
                  type="date"
                  value={importHistoryFilters.fromDate}
                  onChange={(e) =>
                    setImportHistoryFilters({
                      ...importHistoryFilters,
                      fromDate: e.target.value,
                    })
                  }
                />
                <input
                  type="date"
                  value={importHistoryFilters.toDate}
                  onChange={(e) =>
                    setImportHistoryFilters({
                      ...importHistoryFilters,
                      toDate: e.target.value,
                    })
                  }
                />
                <input
                  placeholder="User ID"
                  value={importHistoryFilters.userId}
                  onChange={(e) =>
                    setImportHistoryFilters({
                      ...importHistoryFilters,
                      userId: e.target.value,
                    })
                  }
                  style={{ maxWidth: '140px' }}
                />
                <button className="ghost" onClick={() => loadImportHistory(1)}>
                  Actualizar
                </button>
                <button
                  className="ghost"
                  onClick={() => {
                    const params = new URLSearchParams()
                    if (importHistoryFilters.fromDate)
                      params.set('fromDate', importHistoryFilters.fromDate)
                    if (importHistoryFilters.toDate)
                      params.set('toDate', importHistoryFilters.toDate)
                    if (importHistoryFilters.userId)
                      params.set('userId', importHistoryFilters.userId)
                    const qs = params.toString()
                    downloadFile(
                      `/assets/imports/export/excel${qs ? `?${qs}` : ''}`,
                      'import_history.xlsx'
                    )
                  }}
                >
                  Exportar Excel
                </button>
                <button
                  className="ghost"
                  onClick={() => {
                    const params = new URLSearchParams()
                    if (importHistoryFilters.fromDate)
                      params.set('fromDate', importHistoryFilters.fromDate)
                    if (importHistoryFilters.toDate)
                      params.set('toDate', importHistoryFilters.toDate)
                    if (importHistoryFilters.userId)
                      params.set('userId', importHistoryFilters.userId)
                    const qs = params.toString()
                    downloadFile(
                      `/assets/imports/export/pdf${qs ? `?${qs}` : ''}`,
                      'import_history.pdf'
                    )
                  }}
                >
                  Exportar PDF
                </button>
              </div>
            </div>
            {importHistoryLoading && <p className="muted">Cargando...</p>}
            {!importHistoryLoading && (
              <div className="table">
                {importHistory.map((batch) => (
                  <div key={batch.id} className="row">
                    <div>
                      <strong>{batch.filename}</strong>
                      <span className="muted">
                        {' '}· {new Date(batch.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="row-actions">
                      <span className="pill">{batch.status}</span>
                      <span className="pill">Creados: {batch.createdCount}</span>
                      <span className="pill">Errores: {batch.errorCount}</span>
                      {batch.errors && (
                        <button
                          className="ghost"
                          onClick={() =>
                            setImportHistoryOpen(
                              importHistoryOpen && importHistoryOpen.id === batch.id
                                ? null
                                : batch
                            )
                          }
                        >
                          Ver errores
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {!importHistory.length && <p className="muted">Sin historial.</p>}
              </div>
            )}
            <div className="pager">
              <button
                className="ghost"
                disabled={importHistoryPage <= 1}
                onClick={() => loadImportHistory(importHistoryPage - 1)}
              >
                Anterior
              </button>
              <span>
                Pagina {importHistoryPage} / {Math.max(1, Math.ceil(importHistoryTotal / 10))}
              </span>
              <button
                className="ghost"
                disabled={importHistoryPage >= Math.ceil(importHistoryTotal / 10)}
                onClick={() => loadImportHistory(importHistoryPage + 1)}
              >
                Siguiente
              </button>
            </div>
            {importHistoryOpen && (
              <div className="modal-backdrop">
                <div className="modal">
                  <h3>Errores de importación</h3>
                  <pre className="code-block">{JSON.stringify(importHistoryOpen.errors, null, 2)}</pre>
                  <div className="modal-actions">
                    <button className="ghost" onClick={() => setImportHistoryOpen(null)}>
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {isAuthed && activeTab === 'imports' && importsView === 'catalog' && (
          <div className="section">
            <div className="section-head">
              <h3>Importar Catálogo</h3>
              <div className="actions">
                <button
                  className="ghost"
                  onClick={() =>
                    downloadFile(
                      '/admin/catalog-items/import/template/excel',
                      'catalog_items_template.xlsx'
                    )
                  }
                >
                  Descargar plantilla Activo Fijo
                </button>
                <button className="danger danger-outline" onClick={purgeCatalogAllWithReset}>
                  Vaciar catálogo (ID=1)
                </button>
              </div>
            </div>

            <div className="split">
              <div className="form-card upload-card">
                <h4>Carga masiva desde Excel</h4>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setCatalogImportFile(e.target.files?.[0] || null)}
                />
                <p className="muted">
                  Soporta plantilla estándar de catálogo y también tu formato inventario
                  avanzado (CODIGO_ACTIVO, CARACTERISTICAS, ...).
                </p>
                <button
                  className="primary"
                  onClick={handleCatalogImportUpload}
                  disabled={catalogImportLoading}
                >
                  {catalogImportLoading ? 'Importando...' : 'Importar Catálogo'}
                </button>
              </div>

              <div className="form-card">
                <h4>Resultado importación</h4>
                {catalogImportResult ? (
                  <div className="import-summary">
                    <p>
                      Filas leidas: <strong>{catalogImportResult.totalRows ?? 0}</strong>
                    </p>
                    <p>
                      Parseadas: <strong>{catalogImportResult.parsedCount ?? 0}</strong>
                    </p>
                    <p>
                      Creadas: <strong>{catalogImportResult.createdCount ?? 0}</strong>
                    </p>
                    <p>
                      Omitidas: <strong>{catalogImportResult.skippedCount ?? 0}</strong>
                    </p>
                    <p>
                      Errores: <strong>{catalogImportResult.errorCount ?? 0}</strong>
                    </p>
                    <p className="muted">
                      Dedupe: {catalogImportResult?.dedupePolicy?.primary || 'N/D'} | fallback:{' '}
                      {catalogImportResult?.dedupePolicy?.fallback || 'N/D'}
                    </p>
                    <div className="actions">
                      <button
                        className="ghost"
                        onClick={() => downloadCatalogImportReport('created')}
                        disabled={!catalogImportResult?.items?.length}
                      >
                        Descargar creados CSV
                      </button>
                      <button
                        className="ghost"
                        onClick={() => downloadCatalogImportReport('skipped')}
                        disabled={!catalogImportResult?.skipped?.length}
                      >
                        Descargar omitidos CSV
                      </button>
                      <button
                        className="ghost"
                        onClick={() => downloadCatalogImportReport('errors')}
                        disabled={!catalogImportResult?.errors?.length}
                      >
                        Descargar errores CSV
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="muted">Aún no hay importación de catálogo.</p>
                )}
              </div>
            </div>

            {catalogImportResult?.items?.length > 0 && (
              <div className="table">
                <div className="table-head">
                  <h4>Registros creados</h4>
                  <span className="muted">Mostrando hasta 20</span>
                </div>
                {catalogImportResult.items.slice(0, 20).map((item, idx) => (
                  <div key={`cat-created-${item.id || idx}`} className="row">
                    <div>
                      <strong>{item.name || 'Sin nombre'}</strong>
                      <span className="muted"> · {item.category || 'Sin categoria'}</span>
                    </div>
                    <div className="muted">
                      {(item.brand || '-') + ' / ' + (item.modelName || '-')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {catalogImportErrors.length > 0 && (
              <div className="table">
                <div className="table-head">
                  <h4>Errores de catálogo</h4>
                  <span className="muted">Corrige y vuelve a importar</span>
                </div>
                {catalogImportErrors.map((err, idx) => (
                  <div key={`cat-err-${idx}`} className="row">
                    <div>
                      <strong>Fila {err.row}</strong>
                    </div>
                    <div className="muted">{err.error}</div>
                  </div>
                ))}
              </div>
            )}

            {catalogImportResult?.skipped?.length > 0 && (
              <div className="table">
                <div className="table-head">
                  <h4>Registros omitidos</h4>
                  <span className="muted">Mostrando hasta 20</span>
                </div>
                {catalogImportResult.skipped.slice(0, 20).map((item, idx) => (
                  <div key={`cat-skip-${idx}`} className="row">
                    <div>
                      <strong>{item.name || 'Sin nombre'}</strong>
                      <span className="muted"> · {item.category || 'Sin categoria'}</span>
                    </div>
                    <div className="muted">{item.reason || 'OMITIDO'}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="section-head" style={{ marginTop: '16px' }}>
              <h4>Alta manual (casos específicos)</h4>
            </div>
            <div className="form-card">
              <div className="grid-form">
                <input
                  placeholder="Official Key (opcional)"
                  value={catalogManualForm.officialKey}
                  onChange={(e) => {
                    setCatalogManualForm({ ...catalogManualForm, officialKey: e.target.value })
                    setManualOfficialKeyCheck(null)
                  }}
                />
                <input
                  placeholder="Nombre *"
                  value={catalogManualForm.name}
                  onChange={(e) =>
                    setCatalogManualForm({ ...catalogManualForm, name: e.target.value })
                  }
                />
                <input
                  placeholder="Categoria *"
                  value={catalogManualForm.category}
                  onChange={(e) =>
                    setCatalogManualForm({ ...catalogManualForm, category: e.target.value })
                  }
                />
                <input
                  placeholder="Subcategoria"
                  value={catalogManualForm.subcategory}
                  onChange={(e) =>
                    setCatalogManualForm({
                      ...catalogManualForm,
                      subcategory: e.target.value,
                    })
                  }
                />
                <input
                  placeholder="Marca"
                  value={catalogManualForm.brand}
                  onChange={(e) =>
                    setCatalogManualForm({ ...catalogManualForm, brand: e.target.value })
                  }
                />
                <input
                  placeholder="Modelo"
                  value={catalogManualForm.modelName}
                  onChange={(e) =>
                    setCatalogManualForm({
                      ...catalogManualForm,
                      modelName: e.target.value,
                    })
                  }
                />
                <input
                  placeholder="Unidad"
                  value={catalogManualForm.unit}
                  onChange={(e) =>
                    setCatalogManualForm({ ...catalogManualForm, unit: e.target.value })
                  }
                />
                <textarea
                  placeholder="Descripcion"
                  value={catalogManualForm.description}
                  onChange={(e) =>
                    setCatalogManualForm({
                      ...catalogManualForm,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
              <div className="actions" style={{ marginTop: '12px' }}>
                <button
                  className="ghost"
                  onClick={checkManualOfficialKeyAvailability}
                  disabled={!catalogManualForm.officialKey.trim()}
                >
                  Validar officialKey
                </button>
                <button
                  className="primary"
                  onClick={handleCatalogManualCreate}
                  disabled={
                    !catalogManualForm.name.trim() || !catalogManualForm.category.trim()
                  }
                >
                  Agregar manualmente
                </button>
              </div>
              {manualOfficialKeyCheck?.message && (
                <p className={manualOfficialKeyCheck.type === 'error' ? 'error' : 'muted'}>
                  {manualOfficialKeyCheck.message}
                </p>
              )}
            </div>

            <div className="section-head" style={{ marginTop: '16px' }}>
              <h4>Editar ítems de catálogo</h4>
              <div className="actions">
                <input
                  placeholder="Buscar por nombre, categoría o officialKey..."
                  value={catalogAdminQuery}
                  onChange={(e) => setCatalogAdminQuery(e.target.value)}
                />
                <button className="ghost" onClick={() => loadCatalogAdminItems(1)}>
                  Buscar
                </button>
              </div>
            </div>
            <div className="table">
              {catalogAdminLoading ? (
                <p className="muted">Cargando catálogo...</p>
              ) : catalogAdminItems.length ? (
                catalogAdminItems.map((item) => {
                  const original = catalogAdminOriginal[item.id]
                  const rowStatus = catalogAdminRowStatus[item.id]
                  const keyStatus = catalogAdminKeyStatus[item.id]
                  const dirty =
                    original &&
                    (
                      (original.officialKey || '') !== (item.officialKey || '') ||
                      (original.name || '') !== (item.name || '') ||
                      (original.category || '') !== (item.category || '') ||
                      (original.subcategory || '') !== (item.subcategory || '') ||
                      (original.brand || '') !== (item.brand || '') ||
                      (original.modelName || '') !== (item.modelName || '') ||
                      (original.unit || '') !== (item.unit || '')
                    )

                  return (
                    <div key={item.id} className="row">
                      <div className="row-main">
                        <strong>#{item.id}</strong>
                        <input
                          className="inline-input small"
                          placeholder="officialKey"
                          value={item.officialKey || ''}
                          onChange={(e) => {
                            const value = e.target.value
                            setCatalogAdminItems((prev) =>
                              prev.map((x) =>
                                x.id === item.id ? { ...x, officialKey: value } : x
                              )
                            )
                            scheduleCatalogAdminOfficialKeyValidation(item.id, value)
                          }}
                        />
                        <input
                          className="inline-input"
                          placeholder="Nombre"
                          value={item.name || ''}
                          onChange={(e) =>
                            setCatalogAdminItems((prev) =>
                              prev.map((x) => (x.id === item.id ? { ...x, name: e.target.value } : x))
                            )
                          }
                        />
                        <input
                          className="inline-input small"
                          placeholder="Categoría"
                          value={item.category || ''}
                          onChange={(e) =>
                            setCatalogAdminItems((prev) =>
                              prev.map((x) =>
                                x.id === item.id ? { ...x, category: e.target.value } : x
                              )
                            )
                          }
                        />
                        <input
                          className="inline-input small"
                          placeholder="Subcategoría"
                          value={item.subcategory || ''}
                          onChange={(e) =>
                            setCatalogAdminItems((prev) =>
                              prev.map((x) =>
                                x.id === item.id ? { ...x, subcategory: e.target.value } : x
                              )
                            )
                          }
                        />
                        <input
                          className="inline-input small"
                          placeholder="Marca"
                          value={item.brand || ''}
                          onChange={(e) =>
                            setCatalogAdminItems((prev) =>
                              prev.map((x) => (x.id === item.id ? { ...x, brand: e.target.value } : x))
                            )
                          }
                        />
                        <input
                          className="inline-input small"
                          placeholder="Modelo"
                          value={item.modelName || ''}
                          onChange={(e) =>
                            setCatalogAdminItems((prev) =>
                              prev.map((x) =>
                                x.id === item.id ? { ...x, modelName: e.target.value } : x
                              )
                            )
                          }
                        />
                        <input
                          className="inline-input small"
                          placeholder="Unidad"
                          value={item.unit || ''}
                          onChange={(e) =>
                            setCatalogAdminItems((prev) =>
                              prev.map((x) => (x.id === item.id ? { ...x, unit: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                      <div className="row-actions">
                        <button
                          onClick={() => updateCatalogAdminItem(item)}
                          disabled={
                            rowStatus?.message === 'Guardando...' ||
                            keyStatus?.message === 'Validando officialKey...' ||
                            keyStatus?.type === 'error' ||
                            !dirty ||
                            !String(item.name || '').trim() ||
                            !String(item.category || '').trim()
                          }
                        >
                          Guardar
                        </button>
                        <button
                          className="ghost"
                          onClick={() => discardCatalogAdminItem(item.id)}
                          disabled={!dirty || rowStatus?.message === 'Guardando...'}
                        >
                          Descartar
                        </button>
                        <button
                          className="danger danger-outline"
                          onClick={() =>
                            openForceDelete(
                              'catalogItem',
                              item.id,
                              `${item.name || 'Item catálogo'} #${item.id}`
                            )
                          }
                        >
                          Eliminar forzado
                        </button>
                        {rowStatus?.message && (
                          <span className={rowStatus.type === 'error' ? 'error' : 'muted'}>
                            {rowStatus.message}
                          </span>
                        )}
                        {keyStatus?.message && (
                          <span className={keyStatus.type === 'error' ? 'error' : 'muted'}>
                            {keyStatus.message}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="muted">Sin ítems para editar.</p>
              )}
            </div>
            <div className="pager">
              <button
                className="ghost"
                disabled={catalogAdminPage <= 1 || catalogAdminLoading}
                onClick={() => loadCatalogAdminItems(catalogAdminPage - 1)}
              >
                Anterior
              </button>
              <span>
                Página {catalogAdminPage} / {Math.max(1, Math.ceil(catalogAdminTotal / CATALOG_ADMIN_TAKE))}
              </span>
              <button
                className="ghost"
                disabled={
                  catalogAdminLoading ||
                  catalogAdminPage >= Math.max(1, Math.ceil(catalogAdminTotal / CATALOG_ADMIN_TAKE))
                }
                onClick={() => loadCatalogAdminItems(catalogAdminPage + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {isAuthed && activeTab === 'imports' && importsView === 'sn' && (
          <div className="section">
            <div className="section-head">
              <h3>Base SN (Insumos)</h3>
            </div>
            <div className="split">
              <div className="form-card upload-card">
                <h4>Cargar archivo SN</h4>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => handleSnBaseFileChange(e.target.files?.[0] || null)}
                />
                <p className="muted">
                  Formato detectado: bloques de Insumo/Cantidad por categoria en una misma hoja.
                </p>
                {snBaseFile && <p className="muted">Archivo: {snBaseFile.name}</p>}
                <button
                  className="primary"
                  disabled={!snBaseParsed?.catalogItems?.length || snBaseImporting}
                  onClick={handleSnBaseImportToCatalog}
                >
                  {snBaseImporting ? 'Importando...' : 'Convertir e importar a Catalogo'}
                </button>
              </div>
              <div className="form-card">
                <h4>Resumen Base SN</h4>
                {snBaseLoading ? (
                  <p className="muted">Analizando archivo...</p>
                ) : snBaseParsed ? (
                  <div className="import-summary">
                    <p>
                      Filas analizadas: <strong>{snBaseParsed.rowsRead}</strong>
                    </p>
                    <p>
                      Bloques detectados: <strong>{snBaseParsed.blockCount}</strong>
                    </p>
                    <p>
                      Insumos unicos: <strong>{snBaseParsed.items.length}</strong>
                    </p>
                  </div>
                ) : (
                  <p className="muted">Aun no se ha cargado una base SN.</p>
                )}
                {snBaseImportResult && (
                  <div className="import-summary" style={{ marginTop: '12px' }}>
                    <p>
                      Creados en catalogo: <strong>{snBaseImportResult.createdCount || 0}</strong>
                    </p>
                    <p>
                      Omitidos: <strong>{snBaseImportResult.skippedCount || 0}</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>
            {snBaseParsed?.items?.length > 0 && (
              <div className="table">
                <div className="table-head">
                  <h4>Previsualizacion consolidada</h4>
                  <span className="muted">Mostrando hasta 100 filas</span>
                </div>
                {snBaseParsed.items.slice(0, 100).map((item, idx) => (
                  <div key={`sn-row-${idx}`} className="row">
                    <div>
                      <strong>{item.category}</strong>
                      <span className="muted"> · {item.name}</span>
                    </div>
                    <div className="muted">Cantidad total: {item.quantity}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isAuthed && activeTab === 'planchetas' && (
          <div className="section">
            <div className="section-head">
              <h3>Planchetas</h3>
              <div className="actions">
                <button
                  className="ghost"
                  disabled={!canPreviewPlancheta}
                  onClick={loadPlanchetaPreview}
                >
                  Previsualizar
                </button>
                <button
                  className="ghost"
                  disabled={!canExportPlancheta}
                  title={!canExportPlancheta ? 'Previsualiza con datos antes de exportar.' : ''}
                  onClick={() => downloadPlancheta('excel')}
                >
                  Descargar Excel
                </button>
                <button
                  className="ghost"
                  disabled={!canExportPlancheta}
                  title={!canExportPlancheta ? 'Previsualiza con datos antes de exportar.' : ''}
                  onClick={() => downloadPlancheta('pdf')}
                >
                  Descargar PDF
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
                <p className="muted">
                  Si no eliges dependencia, se exporta la plancheta por establecimiento.
                </p>
                <div className="split">
                  <div className="select-wrap">
                    <label>Fecha adquisicion desde (opcional)</label>
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
                    <label>Fecha adquisicion hasta (opcional)</label>
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
            {!planchetaPreviewLoading && planchetaMessage && (
              <p className="muted">{planchetaMessage}</p>
            )}
            {!planchetaPreviewLoading && planchetaSummary.length > 0 && (
              <div className="table">
                <div className="table-head">
                  <h4>Resumen por dependencia y producto</h4>
                  <span className="muted">Vista resumida (hasta 100 filas)</span>
                </div>
                {planchetaSummary.slice(0, 100).map((row, idx) => (
                  <div key={`plancheta-summary-${row.dependencyId}-${row.productName}-${idx}`} className="row">
                    <div>
                      <strong>{row.dependencyName || 'Sin dependencia'}</strong>
                      <div className="muted">Producto: {row.productName || 'Sin nombre'}</div>
                      <div className="muted">Categoría: {row.category || 'Sin categoría'}</div>
                    </div>
                    <div className="muted">
                      Marca: {row.brand || '-'} · Modelo: {row.modelName || '-'} · Cantidad total:{' '}
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
                      <strong>INV-{item.internalCode}</strong> · {item.name}
                      <div className="muted">
                        Marca: {item.brand || '-'} · Modelo: {item.modelName || '-'}
                      </div>
                    </div>
                    <div className="muted">
                      Dependencia: {item.dependency?.name || '-'} · Estado: {item.assetState?.name || '-'}
                    </div>
                    <div className="muted">
                      Cantidad: {item.quantity ?? 1} · Responsable: {item.responsibleName || 'Sin asignar'}
                      {' · '}RUT: {item.responsibleRut || '-'} · Cargo: {item.responsibleRole || '-'}
                      {' · '}CC: {item.costCenter || '-'}
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
        )}

        {isAuthed && activeTab === 'audit' && (
          <div className="section">
            <div className="section-head">
              <h3>Auditoría Admin</h3>
              <div className="actions">
                <select
                  value={auditFilters.entityType}
                  onChange={(e) =>
                    setAuditFilters({ ...auditFilters, entityType: e.target.value })
                  }
                >
                  <option value="">Entidad</option>
                  <option value="INSTITUTION">INSTITUTION</option>
                  <option value="ESTABLISHMENT">ESTABLISHMENT</option>
                  <option value="DEPENDENCY">DEPENDENCY</option>
                  <option value="CATALOG_ITEM">CATALOG_ITEM</option>
                  <option value="USER">USER</option>
                </select>
                <select
                  value={auditFilters.action}
                  onChange={(e) =>
                    setAuditFilters({ ...auditFilters, action: e.target.value })
                  }
                >
                  <option value="">Acción</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <input
                  type="date"
                  value={auditFilters.fromDate}
                  onChange={(e) =>
                    setAuditFilters({ ...auditFilters, fromDate: e.target.value })
                  }
                />
                <input
                  type="date"
                  value={auditFilters.toDate}
                  onChange={(e) =>
                    setAuditFilters({ ...auditFilters, toDate: e.target.value })
                  }
                />
                <button className="ghost" onClick={() => applyAuditRangePreset('admin', 'WEEK')}>
                  Semanal
                </button>
                <button className="ghost" onClick={() => applyAuditRangePreset('admin', 'MONTH')}>
                  Mensual
                </button>
                <button className="ghost" onClick={() => applyAuditRangePreset('admin', 'YEAR')}>
                  Anual
                </button>
                <button onClick={() => loadAdminAudits(1)}>Actualizar</button>
                <button className="ghost" onClick={resetAdminAuditFilters}>
                  Reset
                </button>
                <button
                  className="ghost"
                  onClick={() => {
                    const params = buildAdminAuditParams()
                    const qs = params.toString()
                    downloadFile(`/admin/audit/export/excel${qs ? `?${qs}` : ''}`, 'admin_audit.xlsx')
                  }}
                >
                  Exportar Excel
                </button>
                <button
                  className="ghost"
                  onClick={() => {
                    const params = buildAdminAuditParams()
                    const qs = params.toString()
                    downloadFile(`/admin/audit/export/csv${qs ? `?${qs}` : ''}`, 'admin_audit.csv')
                  }}
                >
                  Exportar CSV
                </button>
                <button
                  className="ghost"
                  onClick={() => {
                    const params = buildAdminAuditParams()
                    const qs = params.toString()
                    downloadFile(`/admin/audit/export/pdf${qs ? `?${qs}` : ''}`, 'admin_audit.pdf')
                  }}
                >
                  Exportar PDF
                </button>
              </div>
            </div>
            <div className="table">
              <div className="table-head">
                <span className="muted">
                  {adminAuditLoading
                    ? 'Cargando...'
                    : `Mostrando ${adminAudits.length} de ${adminAuditTotal}`}
                </span>
              </div>
              {adminAudits.map((a) => (
                <div key={a.id} className="row">
                  <div>
                    <strong>{a.action}</strong> {a.entityType} #{a.entityId}
                  </div>
                  <div className="muted">
                    {a.user?.name} · {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {!adminAuditLoading && !adminAudits.length && <p className="muted">Sin resultados.</p>}
              <div className="pagination">
                <button
                  className="ghost"
                  disabled={adminAuditPage <= 1}
                  onClick={() => loadAdminAudits(adminAuditPage - 1)}
                >
                  Anterior
                </button>
                <span className="muted">
                  Pagina {adminAuditPage} / {Math.max(1, Math.ceil(adminAuditTotal / 20))}
                </span>
                <button
                  className="ghost"
                  disabled={adminAuditPage >= Math.ceil(adminAuditTotal / 20)}
                  onClick={() => loadAdminAudits(adminAuditPage + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
            <div className="form-card" style={{ marginTop: '12px' }}>
              <h4>Limpieza / Minimización de Auditoría</h4>
              <div className="grid-form">
                <div className="field">
                  <label>Scope</label>
                  <select
                    value={auditCleanupForm.scope}
                    onChange={(e) =>
                      setAuditCleanupForm((prev) => ({ ...prev, scope: e.target.value }))
                    }
                  >
                    <option value="ALL">ALL (Admin + Login)</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="LOGIN">LOGIN</option>
                  </select>
                </div>
                <div className="field">
                  <label>Modo</label>
                  <select
                    value={auditCleanupForm.mode}
                    onChange={(e) =>
                      setAuditCleanupForm((prev) => ({ ...prev, mode: e.target.value }))
                    }
                  >
                    <option value="KEEP_DAYS">Mantener ultimos X dias</option>
                    <option value="BEFORE_DATE">Borrar antes de fecha</option>
                    <option value="DELETE_ALL">Borrar todo</option>
                  </select>
                </div>
                {auditCleanupForm.mode === 'KEEP_DAYS' && (
                  <div className="field">
                    <label>Dias a conservar</label>
                    <input
                      type="number"
                      min="1"
                      max="3650"
                      value={auditCleanupForm.keepDays}
                      onChange={(e) =>
                        setAuditCleanupForm((prev) => ({
                          ...prev,
                          keepDays: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
                {auditCleanupForm.mode === 'BEFORE_DATE' && (
                  <div className="field">
                    <label>Fecha corte</label>
                    <input
                      type="date"
                      value={auditCleanupForm.beforeDate}
                      onChange={(e) =>
                        setAuditCleanupForm((prev) => ({
                          ...prev,
                          beforeDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </div>
              <div className="actions">
                <button className="danger" onClick={runAuditCleanup}>
                  Ejecutar limpieza
                </button>
              </div>
            </div>
            <div className="section-head" style={{ marginTop: '16px' }}>
              <h3>Login Audit</h3>
              <div className="actions">
                <input
                  placeholder="Email"
                  value={loginAuditFilters.email}
                  onChange={(e) =>
                    setLoginAuditFilters({ ...loginAuditFilters, email: e.target.value })
                  }
                />
                <select
                  value={loginAuditFilters.success}
                  onChange={(e) =>
                    setLoginAuditFilters({ ...loginAuditFilters, success: e.target.value })
                  }
                >
                  <option value="">Success?</option>
                  <option value="true">YES</option>
                  <option value="false">NO</option>
                </select>
                <input
                  type="date"
                  value={loginAuditFilters.fromDate}
                  onChange={(e) =>
                    setLoginAuditFilters({ ...loginAuditFilters, fromDate: e.target.value })
                  }
                />
                <input
                  type="date"
                  value={loginAuditFilters.toDate}
                  onChange={(e) =>
                    setLoginAuditFilters({ ...loginAuditFilters, toDate: e.target.value })
                  }
                />
                <button className="ghost" onClick={() => applyAuditRangePreset('login', 'WEEK')}>
                  Semanal
                </button>
                <button className="ghost" onClick={() => applyAuditRangePreset('login', 'MONTH')}>
                  Mensual
                </button>
                <button className="ghost" onClick={() => applyAuditRangePreset('login', 'YEAR')}>
                  Anual
                </button>
                <button onClick={() => loadLoginAudits(1)}>Actualizar</button>
                <button className="ghost" onClick={resetLoginAuditFilters}>
                  Reset
                </button>
                <button
                  className="ghost"
                  onClick={() => {
                    const params = buildLoginAuditParams()
                    const qs = params.toString()
                    downloadFile(
                      `/admin/login-audit/export/excel${qs ? `?${qs}` : ''}`,
                      'login_audit.xlsx'
                    )
                  }}
                >
                  Exportar Excel
                </button>
                <button
                  className="ghost"
                  onClick={() => {
                    const params = buildLoginAuditParams()
                    const qs = params.toString()
                    downloadFile(
                      `/admin/login-audit/export/csv${qs ? `?${qs}` : ''}`,
                      'login_audit.csv'
                    )
                  }}
                >
                  Exportar CSV
                </button>
                <button
                  className="ghost"
                  onClick={() => {
                    const params = buildLoginAuditParams()
                    const qs = params.toString()
                    downloadFile(
                      `/admin/login-audit/export/pdf${qs ? `?${qs}` : ''}`,
                      'login_audit.pdf'
                    )
                  }}
                >
                  Exportar PDF
                </button>
              </div>
            </div>
            <div className="table">
              <div className="table-head">
                <span className="muted">
                  {loginAuditLoading
                    ? 'Cargando...'
                    : `Mostrando ${loginAudits.length} de ${loginAuditTotal}`}
                </span>
              </div>
              {loginAudits.map((a) => (
                <div key={a.id} className="row">
                  <div>
                    <strong>{a.success ? 'SUCCESS' : 'FAIL'}</strong> {a.email}
                  </div>
                  <div className="muted">
                    {a.ip} · {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {!loginAuditLoading && !loginAudits.length && <p className="muted">Sin resultados.</p>}
              <div className="pagination">
                <button
                  className="ghost"
                  disabled={loginAuditPage <= 1}
                  onClick={() => loadLoginAudits(loginAuditPage - 1)}
                >
                  Anterior
                </button>
                <span className="muted">
                  Pagina {loginAuditPage} / {Math.max(1, Math.ceil(loginAuditTotal / 20))}
                </span>
                <button
                  className="ghost"
                  disabled={loginAuditPage >= Math.ceil(loginAuditTotal / 20)}
                  onClick={() => loadLoginAudits(loginAuditPage + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
            <div className="section-head" style={{ marginTop: '16px' }}>
              <h3>Métricas de Seguridad</h3>
              <div className="actions">
                <input
                  type="date"
                  value={metricsFilters.fromDate}
                  onChange={(e) =>
                    setMetricsFilters({ ...metricsFilters, fromDate: e.target.value })
                  }
                />
                <input
                  type="date"
                  value={metricsFilters.toDate}
                  onChange={(e) =>
                    setMetricsFilters({ ...metricsFilters, toDate: e.target.value })
                  }
                />
                <input
                  type="number"
                  min="0"
                  max="23"
                  placeholder="Hora desde"
                  value={metricsFilters.hourFrom}
                  onChange={(e) =>
                    setMetricsFilters({ ...metricsFilters, hourFrom: e.target.value })
                  }
                />
                <input
                  type="number"
                  min="0"
                  max="23"
                  placeholder="Hora hasta"
                  value={metricsFilters.hourTo}
                  onChange={(e) =>
                    setMetricsFilters({ ...metricsFilters, hourTo: e.target.value })
                  }
                />
                <button className="ghost" onClick={loadLoginMetrics}>
                  Actualizar
                </button>
                <button
                  className="ghost"
                  onClick={() =>
                    downloadFile(
                      `/admin/login-audit/metrics/export/csv?fromDate=${metricsFilters.fromDate}&toDate=${metricsFilters.toDate}&hourFrom=${metricsFilters.hourFrom}&hourTo=${metricsFilters.hourTo}`,
                      'login_metrics.csv'
                    )
                  }
                >
                  Exportar CSV
                </button>
                  <select value={metricsTop} onChange={(e) => setMetricsTop(Number(e.target.value))}>
                    <option value={10}>Top 10</option>
                    <option value={20}>Top 20</option>
                  </select>
              </div>
            </div>
            <div className="table">
              {loginMetrics.map((m) => (
                <div key={m.day} className="row">
                  <div>
                    <strong>{m.day}</strong>
                  </div>
                  <div className="muted">
                    Éxitos: {m.success} · Fallos: {m.failed}
                  </div>
                </div>
              ))}
              {!loginMetrics.length && <p className="muted">Sin datos.</p>}
            </div>
            {loginMetrics.length > 0 && (
              <div className="chart">
                {loginMetrics.map((m) => {
                  const total = m.success + m.failed || 1
                  const successPct = Math.round((m.success / total) * 100)
                  const failedPct = 100 - successPct
                  return (
                    <div key={`chart-${m.day}`} className="chart-row">
                      <span>{m.day}</span>
                    <div className="bar">
                        <div
                          className="bar-success"
                          style={{ width: `${successPct}%` }}
                          title={`Éxitos: ${m.success}`}
                        />
                        <div
                          className="bar-fail"
                          style={{ width: `${failedPct}%` }}
                          title={`Fallos: ${m.failed}`}
                        />
                      </div>
                      <span className="muted">
                        {m.success}/{m.failed}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            {loginMetricsHourly.length > 0 && (
              <div className="table">
                <div className="table-head">
                  <h4>Por hora</h4>
                  <span className="muted">Éxitos / Fallos</span>
                  <div className="sort-controls">
                    <label>Orden</label>
                    <select
                      value={hourlySort.key}
                      onChange={(e) =>
                        setHourlySort((s) => ({ ...s, key: e.target.value }))
                      }
                    >
                      <option value="hour">Hora</option>
                      <option value="success">Éxitos</option>
                      <option value="failed">Fallos</option>
                    </select>
                    <button
                      className="ghost"
                      onClick={() =>
                        setHourlySort((s) => ({
                          ...s,
                          order: s.order === 'asc' ? 'desc' : 'asc',
                        }))
                      }
                    >
                      {hourlySort.order === 'asc' ? 'Asc' : 'Desc'}
                    </button>
                  </div>
                  <button
                    className="ghost"
                    onClick={() =>
                      downloadFile(
                        `/admin/login-audit/metrics/hourly/export/csv?fromDate=${metricsFilters.fromDate}&toDate=${metricsFilters.toDate}&hourFrom=${metricsFilters.hourFrom}&hourTo=${metricsFilters.hourTo}`,
                        'login_metrics_hourly.csv'
                      )
                    }
                  >
                    CSV
                  </button>
                  <button
                    className="ghost"
                    onClick={() =>
                      downloadFile(
                        `/admin/login-audit/metrics/hourly/export/pdf?fromDate=${metricsFilters.fromDate}&toDate=${metricsFilters.toDate}&hourFrom=${metricsFilters.hourFrom}&hourTo=${metricsFilters.hourTo}`,
                        'login_metrics_hourly.pdf'
                      )
                    }
                  >
                    PDF
                  </button>
                </div>
                {[...loginMetricsHourly]
                  .sort((a, b) => {
                    const dir = hourlySort.order === 'asc' ? 1 : -1
                    if (hourlySort.key === 'success') return (a.success - b.success) * dir
                    if (hourlySort.key === 'failed') return (a.failed - b.failed) * dir
                    return (new Date(a.hour) - new Date(b.hour)) * dir
                  })
                  .map((m) => (
                  <div key={m.hour} className="row">
                    <div>
                      <strong>{new Date(m.hour).toLocaleString()}</strong>
                    </div>
                    <div className="muted">
                      {m.success} / {m.failed}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {loginMetricsByIp.length > 0 && (
              <div className="table">
                <div className="table-head">
                  <h4>Por IP</h4>
                  <span className="muted">Éxitos / Fallos</span>
                  <div className="sort-controls">
                    <label>Orden</label>
                    <select
                      value={ipSort.key}
                      onChange={(e) => setIpSort((s) => ({ ...s, key: e.target.value }))}
                    >
                      <option value="failed">Fallos</option>
                      <option value="success">Éxitos</option>
                      <option value="ip">IP</option>
                    </select>
                    <button
                      className="ghost"
                      onClick={() =>
                        setIpSort((s) => ({
                          ...s,
                          order: s.order === 'asc' ? 'desc' : 'asc',
                        }))
                      }
                    >
                      {ipSort.order === 'asc' ? 'Asc' : 'Desc'}
                    </button>
                  </div>
                  <button
                    className="ghost"
                    onClick={() =>
                      downloadFile(
                        `/admin/login-audit/metrics/ip/export/csv?fromDate=${metricsFilters.fromDate}&toDate=${metricsFilters.toDate}&hourFrom=${metricsFilters.hourFrom}&hourTo=${metricsFilters.hourTo}`,
                        'login_metrics_ip.csv'
                      )
                    }
                  >
                    CSV
                  </button>
                  <button
                    className="ghost"
                    onClick={() =>
                      downloadFile(
                        `/admin/login-audit/metrics/ip/export/pdf?fromDate=${metricsFilters.fromDate}&toDate=${metricsFilters.toDate}&hourFrom=${metricsFilters.hourFrom}&hourTo=${metricsFilters.hourTo}`,
                        'login_metrics_ip.pdf'
                      )
                    }
                  >
                    PDF
                  </button>
                </div>
                {[...loginMetricsByIp]
                  .sort((a, b) => {
                    const dir = ipSort.order === 'asc' ? 1 : -1
                    if (ipSort.key === 'success') return (a.success - b.success) * dir
                    if (ipSort.key === 'ip') return a.ip.localeCompare(b.ip) * dir
                    return (a.failed - b.failed) * dir
                  })
                  .slice(0, metricsTop)
                  .map((m) => (
                  <div key={m.ip} className="row">
                    <div>
                      <strong>{m.ip}</strong>
                    </div>
                    <div className="muted">
                      {m.success} / {m.failed}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {loginMetricsByUser.length > 0 && (
              <div className="table">
                <div className="table-head">
                  <h4>Por Usuario</h4>
                  <span className="muted">Éxitos / Fallos</span>
                  <div className="sort-controls">
                    <label>Orden</label>
                    <select
                      value={userSort.key}
                      onChange={(e) => setUserSort((s) => ({ ...s, key: e.target.value }))}
                    >
                      <option value="failed">Fallos</option>
                      <option value="success">Éxitos</option>
                      <option value="name">Usuario</option>
                    </select>
                    <button
                      className="ghost"
                      onClick={() =>
                        setUserSort((s) => ({
                          ...s,
                          order: s.order === 'asc' ? 'desc' : 'asc',
                        }))
                      }
                    >
                      {userSort.order === 'asc' ? 'Asc' : 'Desc'}
                    </button>
                  </div>
                  <button
                    className="ghost"
                    onClick={() =>
                      downloadFile(
                        `/admin/login-audit/metrics/user/export/csv?fromDate=${metricsFilters.fromDate}&toDate=${metricsFilters.toDate}&hourFrom=${metricsFilters.hourFrom}&hourTo=${metricsFilters.hourTo}`,
                        'login_metrics_user.csv'
                      )
                    }
                  >
                    CSV
                  </button>
                  <button
                    className="ghost"
                    onClick={() =>
                      downloadFile(
                        `/admin/login-audit/metrics/user/export/pdf?fromDate=${metricsFilters.fromDate}&toDate=${metricsFilters.toDate}&hourFrom=${metricsFilters.hourFrom}&hourTo=${metricsFilters.hourTo}`,
                        'login_metrics_user.pdf'
                      )
                    }
                  >
                    PDF
                  </button>
                </div>
                {[...loginMetricsByUser]
                  .sort((a, b) => {
                    const dir = userSort.order === 'asc' ? 1 : -1
                    if (userSort.key === 'success') return (a.success - b.success) * dir
                    if (userSort.key === 'name') {
                      const an = a.user?.name || ''
                      const bn = b.user?.name || ''
                      return an.localeCompare(bn) * dir
                    }
                    return (a.failed - b.failed) * dir
                  })
                  .slice(0, metricsTop)
                  .map((m) => (
                  <div key={m.userId || `null-${m.failed}`} className="row">
                    <div>
                      <strong>{m.user?.name || 'Desconocido'}</strong>
                      <span className="muted"> · {m.user?.email || 'N/A'}</span>
                    </div>
                    <div className="muted">
                      {m.success} / {m.failed}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {restoreModal.open && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Restaurar Activo Fijo</h3>
            <p>
              Selecciona motivo para restaurar
              {restoreModal.asset ? `: ${restoreModal.asset.name}` : ''}.
            </p>
            <select
              value={restoreModal.reasonCode}
              onChange={(e) =>
                setRestoreModal((prev) => ({
                  ...prev,
                  reasonCode: e.target.value,
                }))
              }
            >
              <option value="">Selecciona motivo</option>
              {(movementReasonCodes.restore || []).map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={restoreModal.docType}
              onChange={(e) =>
                setRestoreModal((prev) => ({
                  ...prev,
                  docType: e.target.value,
                }))
              }
            >
              <option value="FOTO">FOTO</option>
              <option value="ACTA">ACTA</option>
              <option value="FACTURA">FACTURA</option>
              <option value="OTRO">OTRO</option>
            </select>
            <input
              value={restoreModal.note}
              onChange={(e) =>
                setRestoreModal((prev) => ({
                  ...prev,
                  note: e.target.value,
                }))
              }
              placeholder="Nota evidencia (opcional)"
            />
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) =>
                setRestoreModal((prev) => ({
                  ...prev,
                  file: e.target.files?.[0] || null,
                }))
              }
            />
            <div className="modal-actions">
              <button
                className="ghost"
                onClick={() =>
                  setRestoreModal({
                    open: false,
                    asset: null,
                    reasonCode: '',
                    docType: 'ACTA',
                    note: '',
                    file: null,
                  })
                }
              >
                Cancelar
              </button>
              <button className="primary" onClick={confirmRestoreFromTrash}>
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmState.open && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>{confirmState.title}</h3>
            <p>{confirmState.message}</p>
            <div className="modal-actions">
              <button className="ghost" onClick={closeConfirm}>
                Cancelar
              </button>
              <button
                className="danger"
                onClick={() => confirmState.onConfirm && confirmState.onConfirm()}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {forceDeleteState.open && (
        <div className="modal-backdrop modal-backdrop-scroll">
          <div className="modal modal-force-delete">
            <h3>Eliminar forzado</h3>
            <p>
              Esta acción elimina de forma permanente <strong>{forceDeleteState.entityLabel}</strong> y
              sus registros relacionados.
            </p>
            {forceDeleteState.loading ? (
              <p className="muted">Cargando resumen...</p>
            ) : (
              <>
                <div className="modal-summary-grid">
                  {Object.entries(forceDeleteState.summary || {}).map(([key, value]) => (
                    <div key={key}>
                      <strong>{key}</strong>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
                <label className="modal-confirm-label">
                  Escribe <strong>{forceDeleteState.expectedConfirmationText}</strong> para confirmar:
                  <input
                    value={forceDeleteState.confirmationText}
                    onChange={(e) =>
                      setForceDeleteState((prev) => ({
                        ...prev,
                        confirmationText: e.target.value,
                      }))
                    }
                    placeholder={forceDeleteState.expectedConfirmationText}
                  />
                </label>
              </>
            )}
            <div className="modal-actions">
              <button className="ghost" onClick={closeForceDelete} disabled={forceDeleteState.deleting}>
                Cancelar
              </button>
              <button
                className="danger"
                disabled={forceDeleteState.loading || forceDeleteState.deleting}
                onClick={confirmForceDelete}
              >
                {forceDeleteState.deleting ? 'Eliminando...' : 'Eliminar forzado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

