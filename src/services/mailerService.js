let nodemailerModule = null;
let transporterInstance = null;

function getNodemailer() {
  if (nodemailerModule !== null) return nodemailerModule;
  try {
    // Optional dependency: when not installed, email sending is skipped safely.
    // eslint-disable-next-line global-require
    nodemailerModule = require("nodemailer");
  } catch (error) {
    nodemailerModule = undefined;
  }
  return nodemailerModule;
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).trim().toLowerCase() === "true";
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || null;
  const secure = toBool(process.env.SMTP_SECURE, port === 465);

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    from,
    timeout: Number(process.env.SMTP_TIMEOUT_MS || 15000),
  };
}

function getTransporter() {
  if (transporterInstance) return transporterInstance;
  const nodemailer = getNodemailer();
  const smtp = getSmtpConfig();
  if (!nodemailer || !smtp) return null;
  transporterInstance = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
    connectionTimeout: smtp.timeout,
    greetingTimeout: smtp.timeout,
    socketTimeout: smtp.timeout,
  });
  return transporterInstance;
}

function buildSupportRequestMail({ to, request, actor }) {
  const scopeParts = [
    request?.institution?.name ? `Institución: ${request.institution.name}` : null,
    request?.establishment?.name ? `Establecimiento: ${request.establishment.name}` : null,
    request?.dependency?.name ? `Dependencia: ${request.dependency.name}` : null,
  ].filter(Boolean);

  const scopeText = scopeParts.length ? scopeParts.join(" | ") : "Sin alcance específico";
  const requester = actor?.name || actor?.email || "ADMIN_CENTRAL";
  const dueAt = request?.dueAt ? new Date(request.dueAt).toLocaleString("es-CL") : "N/A";

  const subject = `[InventaCore] Solicitud #${request.id}: ${request.subject}`;
  const text = [
    "Se creó una nueva solicitud en Asistente Central.",
    "",
    `ID: #${request.id}`,
    `Asunto: ${request.subject}`,
    `Prioridad: ${request.priority}`,
    `Estado: ${request.status}`,
    `Vence: ${dueAt}`,
    `Creado por: ${requester}`,
    `Alcance: ${scopeText}`,
    "",
    "Pregunta:",
    request.question || "",
    "",
    request.responseDraft ? `Borrador de respuesta:\n${request.responseDraft}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.45;color:#0f172a">
      <h2 style="margin:0 0 12px 0">Nueva solicitud en Asistente Central</h2>
      <p><strong>ID:</strong> #${request.id}</p>
      <p><strong>Asunto:</strong> ${request.subject}</p>
      <p><strong>Prioridad:</strong> ${request.priority}</p>
      <p><strong>Estado:</strong> ${request.status}</p>
      <p><strong>Vence:</strong> ${dueAt}</p>
      <p><strong>Creado por:</strong> ${requester}</p>
      <p><strong>Alcance:</strong> ${scopeText}</p>
      <hr />
      <p><strong>Pregunta:</strong></p>
      <pre style="white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:6px">${request.question || ""}</pre>
      ${
        request.responseDraft
          ? `<p><strong>Borrador de respuesta:</strong></p>
      <pre style="white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:6px">${request.responseDraft}</pre>`
          : ""
      }
    </div>
  `;

  return { to, subject, text, html };
}

async function sendSupportRequestCreatedEmail({ to, request, actor }) {
  const nodemailer = getNodemailer();
  if (!nodemailer) {
    return { status: "skipped", reason: "NODEMAILER_NOT_INSTALLED" };
  }

  const smtp = getSmtpConfig();
  if (!smtp) {
    return { status: "skipped", reason: "SMTP_NOT_CONFIGURED" };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { status: "skipped", reason: "SMTP_TRANSPORT_UNAVAILABLE" };
  }

  const payload = buildSupportRequestMail({ to, request, actor });
  const info = await transporter.sendMail({
    from: smtp.from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });

  return {
    status: "sent",
    messageId: info?.messageId || null,
    accepted: info?.accepted || [],
    rejected: info?.rejected || [],
  };
}

async function sendSupportProbeEmail({ to, actor }) {
  const nodemailer = getNodemailer();
  if (!nodemailer) {
    return { status: "skipped", reason: "NODEMAILER_NOT_INSTALLED" };
  }

  const smtp = getSmtpConfig();
  if (!smtp) {
    return { status: "skipped", reason: "SMTP_NOT_CONFIGURED" };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { status: "skipped", reason: "SMTP_TRANSPORT_UNAVAILABLE" };
  }

  await transporter.verify();
  const sender = actor?.name || actor?.email || "ADMIN_CENTRAL";
  const info = await transporter.sendMail({
    from: smtp.from,
    to,
    subject: "[InventaCore] Prueba SMTP OK",
    text: `Prueba SMTP exitosa.\nEnviado por: ${sender}\nFecha: ${new Date().toISOString()}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif">
      <h3>Prueba SMTP exitosa</h3>
      <p><strong>Enviado por:</strong> ${sender}</p>
      <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
    </div>`,
  });

  return {
    status: "sent",
    messageId: info?.messageId || null,
    accepted: info?.accepted || [],
    rejected: info?.rejected || [],
  };
}

module.exports = {
  sendSupportRequestCreatedEmail,
  sendSupportProbeEmail,
};
