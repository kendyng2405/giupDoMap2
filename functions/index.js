// functions/index.js
// Firebase Cloud Functions — cần deploy lên Firebase để xóa Auth account
//
// Setup (chạy một lần nếu chưa có thư mục functions):
//   firebase init functions   (chọn JavaScript, không dùng ESLint)
//   cd functions && npm install
//
// Deploy:
//   firebase deploy --only functions

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
admin.initializeApp();

/**
 * deleteUser — Xóa hoàn toàn một user:
 *   1. Firebase Auth account
 *   2. Firestore users/{uid} document
 *
 * Chỉ được gọi bởi user có role = "founder".
 */
exports.deleteUser = onCall(
  {
    cors: [
      "https://traitimviet.online",
      "https://www.traitimviet.online",
    ],
  },
  async (request) => {
  // 1. Xác thực người gọi
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Bạn chưa đăng nhập.");
  }

  // 2. Kiểm tra quyền founder
  const callerDoc = await admin.firestore().doc(`users/${callerUid}`).get();
  if (callerDoc.data()?.role !== "founder") {
    throw new HttpsError("permission-denied", "Chỉ founder mới có quyền xóa tài khoản.");
  }

  // 3. Validate input
  const { uid } = request.data;
  if (!uid || typeof uid !== "string") {
    throw new HttpsError("invalid-argument", "Thiếu hoặc sai định dạng uid.");
  }
  if (uid === callerUid) {
    throw new HttpsError("invalid-argument", "Không thể xóa tài khoản của chính mình.");
  }

  // 4. Xóa song song Auth + Firestore
  await Promise.all([
    admin.auth().deleteUser(uid),
    admin.firestore().doc(`users/${uid}`).delete(),
  ]);

  return { success: true };
  }
);
