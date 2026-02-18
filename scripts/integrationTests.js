// scripts/integrationTests.js
// Minimal integration checks (requires API running and DB seeded)

if (typeof fetch !== "function") {
  throw new Error("Este script requiere Node 18+ (fetch global)");
}

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const EMAIL = process.env.TEST_EMAIL || "a.nunezu.n@gmail.com";
const PASSWORD = process.env.TEST_PASSWORD || "123456789";
const ESTABLISHMENT_ID = Number(process.env.TEST_ESTABLISHMENT_ID || 3);

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

async function main() {
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

  console.log("[2] Catalogo: asset-states");
  const states = await request("/catalog/asset-states", { headers: authHeaders });
  assert(states.res.ok, `asset-states fallo: ${states.res.status}`);
  const stateId = states.body.items?.[0]?.id;
  assert(stateId, "No hay assetState disponible (seed?)");

  console.log("[3] Catalogo: dependencies");
  const deps = await request(
    `/catalog/dependencies?establishmentId=${ESTABLISHMENT_ID}`,
    { headers: authHeaders }
  );
  assert(deps.res.ok, `dependencies fallo: ${deps.res.status}`);
  const dependencyId = deps.body.items?.[0]?.id;
  assert(dependencyId, "No hay dependency disponible (seed?)");

  console.log("[4] Crear asset");
  const assetPayload = {
    establishmentId: ESTABLISHMENT_ID,
    dependencyId,
    assetStateId: stateId,
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

  console.log("[5] Planchetas JSON");
  const plancheta = await request(`/planchetas?establishmentId=${ESTABLISHMENT_ID}`, {
    headers: authHeaders,
  });
  assert(plancheta.res.ok, `Planchetas JSON fallo: ${plancheta.res.status}`);

  console.log("[6] Planchetas Excel");
  const excel = await request(
    `/planchetas/excel?establishmentId=${ESTABLISHMENT_ID}`,
    { headers: authHeaders }
  );
  assert(excel.res.ok, `Planchetas Excel fallo: ${excel.res.status}`);

  console.log("[7] Planchetas PDF");
  const pdf = await request(`/planchetas/pdf?dependencyId=${dependencyId}`, {
    headers: authHeaders,
  });
  assert(pdf.res.ok, `Planchetas PDF fallo: ${pdf.res.status}`);

  console.log("[8] Rechazo fuera de establecimiento");
  const badCreate = await request("/assets", {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ ...assetPayload, establishmentId: 1 }),
  });
  assert(
    badCreate.res.status === 403 || badCreate.res.status === 400,
    `Se esperaba rechazo, obtuvo ${badCreate.res.status}`
  );

  console.log("[9] Auditoria assets (scope)");
  const auditAll = await request("/audit/assets?take=5", { headers: authHeaders });
  assert(auditAll.res.ok, `Audit assets fallo: ${auditAll.res.status}`);

  console.log("[10] Auditoria assets por assetId");
  const auditByAsset = await request(`/audit/assets?assetId=${assetId}`, {
    headers: authHeaders,
  });
  assert(auditByAsset.res.ok, `Audit assets assetId fallo: ${auditByAsset.res.status}`);

  console.log("[11] Auditoria assets por action");
  const auditByAction = await request("/audit/assets?action=CREATE", {
    headers: authHeaders,
  });
  assert(auditByAction.res.ok, `Audit assets action fallo: ${auditByAction.res.status}`);

  console.log("Tests minimos OK");
}

main().catch((e) => {
  console.error("Tests fallaron:", e.message);
  process.exit(1);
});
