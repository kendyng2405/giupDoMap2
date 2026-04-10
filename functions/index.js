// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
admin.initializeApp();

const ALLOWED_ORIGINS = [
  "https://traitimviet.online",
  "https://www.traitimviet.online",
];

/**
 * deleteUser — Xóa hoàn toàn một user:
 *   1. Firebase Auth account
 *   2. Firestore users/{uid} document
 *
 * Chỉ được gọi bởi user có role = "founder".
 */
exports.deleteUser = onRequest(async (req, res) => {
  // ── CORS ──────────────────────────────────────────────
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Max-Age", "3600");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // ── Xác thực Firebase ID Token ─────────────────────
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!idToken) {
      res.status(401).json({ error: "Chưa đăng nhập." });
      return;
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const callerUid = decoded.uid;

    // ── Kiểm tra quyền founder ─────────────────────────
    const callerDoc = await admin.firestore().doc(`users/${callerUid}`).get();
    if (callerDoc.data()?.role !== "founder") {
      res.status(403).json({ error: "Chỉ founder mới có quyền xóa tài khoản." });
      return;
    }

    // ── Validate input ─────────────────────────────────
    const { uid } = req.body;
    if (!uid || typeof uid !== "string") {
      res.status(400).json({ error: "Thiếu hoặc sai định dạng uid." });
      return;
    }
    if (uid === callerUid) {
      res.status(400).json({ error: "Không thể xóa tài khoản của chính mình." });
      return;
    }

    // ── Xóa Auth + Firestore ───────────────────────────
    await Promise.all([
      admin.auth().deleteUser(uid),
      admin.firestore().doc(`users/${uid}`).delete(),
    ]);

    res.status(200).json({ success: true });

  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ error: err.message });
  }
});
