const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const allowAllOrigins = !FRONTEND_ORIGIN || FRONTEND_ORIGIN === "*";
const allowedOrigins = allowAllOrigins
  ? ["*"]
  : FRONTEND_ORIGIN.split(",")
      .map((o) => o.trim())
      .filter(Boolean);
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const DATA_FILE = path.join(__dirname, "data", "db.json");

// --- Helpers de persistencia ---
function ensureDataFile() {
  if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const seed = {
      users: [
        {
          email: "estudiante@colegio.com",
          passwordHash: bcrypt.hashSync("Alumno1234", 10),
        },
      ],
      tokens: [],
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
  }
}

function readDB() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("No se pudo leer la base local:", error);
    return { users: [], tokens: [] };
  }
}

function writeDB(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// --- Configuracion de correo ---
function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error("Faltan variables SMTP_USER/SMTP_PASS para enviar correos.");
  }
  if (!SMTP_HOST || SMTP_HOST.includes("gmail")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      logger: true,
      debug: true,
    });
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    logger: true,
    debug: true,
  });
}

async function sendRecoveryMail(to, token) {
  const transporter = createTransport();
  const from = process.env.EMAIL_FROM || "soporte@eduquiz.local";
  const replyTo = process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM;
  const subject = "Recuperar contrasena - EduQuiz";
  const text = [
    "Hola,",
    "",
    "Recibimos una solicitud para restablecer tu contrasena en EduQuiz.",
    `Codigo temporal: ${token}`,
    "Vigencia: 10 minutos.",
    "Ingresa a la pagina de inicio de sesion y pega este codigo para restablecer tu contrasena.",
    "",
    "Si no solicitaste este cambio, ignora este mensaje.",
  ].join("\n");

  const info = await transporter.sendMail({
    from,
    to,
    replyTo,
    subject,
    text,
  });
  console.log(`Correo de recuperacion enviado a ${to}. MessageId: ${info.messageId}`);
}

// --- Utilidades de tokens y usuarios ---
function findUser(db, email) {
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

function upsertUser(db, email, passwordHash) {
  const existing = findUser(db, email);
  if (existing) {
    existing.passwordHash = passwordHash;
  } else {
    db.users.push({ email, passwordHash });
  }
}

function generateToken() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function storeToken(db, email, token) {
  const expiresAt = Date.now() + 10 * 60 * 1000;
  db.tokens = db.tokens.filter((t) => t.email !== email);
  db.tokens.push({ email, tokenHash: bcrypt.hashSync(token, 8), expiresAt, usedAt: null });
}

function validateToken(db, email, token) {
  const entry = db.tokens.find((t) => t.email.toLowerCase() === email.toLowerCase() && !t.usedAt);
  if (!entry) return { valid: false, reason: "No hay solicitudes activas." };
  if (Date.now() > entry.expiresAt) return { valid: false, reason: "El codigo expiro." };
  const matches = bcrypt.compareSync(token, entry.tokenHash);
  if (!matches) return { valid: false, reason: "Codigo incorrecto." };
  return { valid: true, entry };
}

function markTokenUsed(db, email) {
  db.tokens = db.tokens.map((t) =>
    t.email.toLowerCase() === email.toLowerCase() ? { ...t, usedAt: Date.now() } : t
  );
}

// --- Middlewares ---
const corsOptions = {
  origin: (origin, callback) => {
    const isAllowed =
      allowAllOrigins ||
      !origin ||
      allowedOrigins.includes("*") ||
      (origin && allowedOrigins.includes(origin));
    if (isAllowed) {
      return callback(null, true);
    }
    console.warn(`CORS bloqueado para origen: ${origin}`);
    return callback(null, false);
  },
  credentials: false,
  optionsSuccessStatus: 200,
  preflightContinue: false,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

// --- Rutas ---
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/auth/recovery", async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ message: "Correo requerido." });
  }

  const db = readDB();
  const token = generateToken();
  storeToken(db, email, token);
  writeDB(db);

  try {
    await sendRecoveryMail(email, token);
    return res.json({ message: "Hemos enviado un correo con tu codigo de recuperacion." });
  } catch (error) {
    console.error("Error enviando correo de recuperacion:", error);
    return res
      .status(500)
      .json({ message: "No se pudo enviar el correo. Revisa la configuracion SMTP en el backend." });
  }
});

app.post("/auth/reset", (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const token = (req.body.token || "").trim();
  const newPass = (req.body.newPassword || "").trim();

  if (!email || !token || !newPass) {
    return res.status(400).json({ message: "Datos incompletos." });
  }
  if (newPass.length < 8) {
    return res.status(400).json({ message: "La contrasena debe tener al menos 8 caracteres." });
  }

  const db = readDB();
  const validation = validateToken(db, email, token);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.reason });
  }

  const newHash = bcrypt.hashSync(newPass, 10);
  upsertUser(db, email, newHash);
  markTokenUsed(db, email);
  writeDB(db);

  return res.json({ message: "Contrasena actualizada correctamente." });
});

app.listen(PORT, () => {
  console.log(`EduQuiz recovery API escuchando en http://localhost:${PORT}`);
});
