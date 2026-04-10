// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
admin.initializeApp();

exports.deleteUser = onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      // Xác thực Firebase ID Token
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!idToken) {
        res.status(401).json({ error: "Chưa đăng nhập." });
        return;
      }

      const decoded = await admin.auth().verifyIdToken(idToken);
      const callerUid = decoded.uid;

      // Kiểm tra quyền founder
      const callerDoc = await admin.firestore().doc(`users/${callerUid}`).get();
      if (callerDoc.data()?.role !== "founder") {
        res.status(403).json({ error: "Chỉ founder mới có quyền xóa tài khoản." });
        return;
      }

      // Validate uid cần xóa
      const { uid } = req.body;
      if (!uid || typeof uid !== "string") {
        res.status(400).json({ error: "Thiếu uid." });
        return;
      }
      if (uid === callerUid) {
        res.status(400).json({ error: "Không thể xóa chính mình." });
        return;
      }

      // Xóa Auth + Firestore
      await Promise.all([
        admin.auth().deleteUser(uid),
        admin.firestore().doc(`users/${uid}`).delete(),
      ]);

      res.status(200).json({ success: true });

    } catch (err) {
      console.error("deleteUser error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);
