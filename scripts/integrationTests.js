// scripts/integrationTests.js
// Minimal integration checks (self-hosted if API_BASE_URL is not provided)

if (typeof fetch !== "function") {
  throw new Error("Este script requiere Node 18+ (fetch global)");
}

let BASE_URL = process.env.API_BASE_URL || null;
const EMAIL = process.env.TEST_EMAIL || "a.nunezu.n@gmail.com";
const PASSWORD = process.env.TEST_PASSWORD || "123456789";
const DEFAULT_ESTABLISHMENT_ID = Number(process.env.TEST_ESTABLISHMENT_ID || 3);

async function request(path, opts = {}) {
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const contentType = res.headers.get("content-type") || "";
  let body;
  if (contentType.includes("application/json")) {
    body = await res.json();
  } else {
    body = await res.text();
  }
  return { res, body, contentType };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function setupServer() {
  if (BASE_URL) {
    return { close: async () => {} };
  }

  const { app } = require("../src/app");
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const addr = server.address();
  BASE_URL = `http://127.0.0.1:${addr.port}`;
  console.log(`[setup] API local para tests: ${BASE_URL}`);

  return {
    close: async () =>
      new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

async function run() {
  console.log("[1] Login");
  const login = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  assert(login.res.ok, `Login fallo: ${login.res.status} ${JSON.stringify(login.body)}`);
  const token = login.body.token;
  assert(token, "Login no devolvio token");

  const authHeaders = { Authorization: `Bearer ${token}` };
  const establishmentId = Number(
    login.body?.user?.establishmentId || login.body?.user?.establishment?.id || DEFAULT_ESTABLISHMENT_ID
  );

  console.log("[2] Catalogo: asset-states");
  const states = await request("/catalog/asset-states", { headers: authHeaders });
  assert(states.res.ok, `asset-states fallo: ${states.res.status}`);
  const stateId = states.body.items?.[0]?.id;
  assert(stateId, "No hay assetState disponible (seed?)");

  console.log("[3] Catalogo: asset-types");
  const types = await request("/catalog/asset-types", { headers: authHeaders });
  assert(types.res.ok, `asset-types fallo: ${types.res.status}`);
  const typeId = types.body.items?.[0]?.id;
  assert(typeId, "No hay assetType disponible (seed?)");

  console.log("[4] Catalogo: dependencies");
  const deps = await request(
    `/catalog/dependencies?establishmentId=${establishmentId}`,
    { headers: authHeaders }
  );
  assert(deps.res.ok, `dependencies fallo: ${deps.res.status}`);
  const dependencyId = deps.body.items?.[0]?.id;
  assert(dependencyId, "No hay dependency disponible (seed?)");

  console.log("[5] Crear asset");
  const assetPayload = {
    establishmentId,
    dependencyId,
    assetStateId: stateId,
    assetTypeId: typeId,
    name: `Asset Test ${Date.now()}`,
    accountingAccount: "ACC-001",
    analyticCode: "AN-001",
    acquisitionValue: 100000,
    acquisitionDate: new Date().toISOString(),
  };
  const created = await request("/assets", {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(assetPayload),
  });
  assert(created.res.ok, `Crear asset fallo: ${created.res.status} ${JSON.stringify(created.body)}`);
  const assetId = created.body.id;
  assert(assetId, "Crear asset no devolvio id");

  console.log("[6] Planchetas JSON");
  const plancheta = await request(`/planchetas?establishmentId=${establishmentId}`, {
    headers: authHeaders,
  });
  assert(plancheta.res.ok, `Planchetas JSON fallo: ${plancheta.res.status}`);

  console.log("[7] Planchetas Excel");
  const excel = await request(
    `/planchetas/excel?establishmentId=${establishmentId}`,
    { headers: authHeaders }
  );
  assert(excel.res.ok, `Planchetas Excel fallo: ${excel.res.status}`);

  console.log("[8] Planchetas PDF");
  const pdf = await request(`/planchetas/pdf?dependencyId=${dependencyId}`, {
    headers: authHeaders,
  });
  assert(pdf.res.ok, `Planchetas PDF fallo: ${pdf.res.status}`);

  console.log("[9] Rechazo fuera de establecimiento");
  const badCreate = await request("/assets", {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ ...assetPayload, establishmentId: 1 }),
  });
  assert(
    badCreate.res.status === 403 || badCreate.res.status === 400,
    `Se esperaba rechazo, obtuvo ${badCreate.res.status}`
  );

  console.log("[10] Auditoria assets (scope)");
  const auditAll = await request("/audit/assets?take=5", { headers: authHeaders });
  assert(auditAll.res.ok, `Audit assets fallo: ${auditAll.res.status}`);

  console.log("[11] Auditoria assets por assetId");
  const auditByAsset = await request(`/audit/assets?assetId=${assetId}`, {
    headers: authHeaders,
  });
  assert(auditByAsset.res.ok, `Audit assets assetId fallo: ${auditByAsset.res.status}`);

  console.log("[12] Auditoria assets por action");
  const auditByAction = await request("/audit/assets?action=CREATE", {
    headers: authHeaders,
  });
  assert(auditByAction.res.ok, `Audit assets action fallo: ${auditByAction.res.status}`);

  console.log("Tests minimos OK");
}

async function main() {
  const server = await setupServer();
  try {
    await run();
  } finally {
    await server.close();
  }
}

main().catch((e) => {
  console.error("Tests fallaron:", e.message);
  process.exit(1);
});
