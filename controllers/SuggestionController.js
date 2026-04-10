// controllers/SuggestionController.js
import { SuggestionModel } from "../models/SuggestionModel.js";
import { LocationModel }   from "../models/LocationModel.js";
import { NotificationModel } from "../models/NotificationModel.js";
import { UserModel }       from "../models/UserModel.js";
import { renderView }      from "../views/ViewEngine.js";
import { Toast }           from "../views/components/Toast.js";
import { router }          from "./Router.js";
import { HELP_TYPES, URGENCY } from "../models/LocationModel.js";

export const SuggestionController = {

  // GET /suggest — form đề xuất (member)
  async showForm({ user, userData }) {
    if (!user) { router.navigate("/login"); return; }
    renderView("suggest-form", { userData, helpTypes: HELP_TYPES, urgency: URGENCY });
    await _nextTick();
    _initSuggestionForm(user, userData);
  },

  // GET /admin/suggestions — danh sách chờ duyệt (admin/founder)
  async showList({ userData }) {
    const [pending, approved, rejected] = await Promise.all([
      SuggestionModel.findAll("pending"),
      SuggestionModel.findAll("approved"),
      SuggestionModel.findAll("rejected"),
    ]);
    renderView("admin-suggestions", { userData, pending, approved, rejected });
    _initSuggestionList(userData);
  },
};

// ── Form đề xuất (member) ─────────────────────────────────
function _initSuggestionForm(user, userData) {
  const mapEl = document.getElementById("suggest-map");
  if (!mapEl) return;

  let pickerMap = L.map("suggest-map", {
    center: [16.047, 108.206], zoom: 6,
  });

  // FIX: Dùng Google Maps tile thay vì OpenStreetMap
  L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
    maxZoom: 20,
  }).addTo(pickerMap);

  let pickerMarker = null;
  const latInput = document.getElementById("suggest-lat");
  const lngInput = document.getElementById("suggest-lng");

  function placeMarker(lat, lng) {
    if (pickerMarker) pickerMap.removeLayer(pickerMarker);
    pickerMarker = L.marker([lat, lng], { draggable: true }).addTo(pickerMap);
    latInput.value = lat.toFixed(7);
    lngInput.value = lng.toFixed(7);
    pickerMarker.on("dragend", e => {
      const p = e.target.getLatLng();
      latInput.value = p.lat.toFixed(7);
      lngInput.value = p.lng.toFixed(7);
      _reverseGeocode(p.lat, p.lng, "suggest-address");
    });
  }

  pickerMap.on("click", e => {
    placeMarker(e.latlng.lat, e.latlng.lng);
    _reverseGeocode(e.latlng.lat, e.latlng.lng, "suggest-address");
  });

  document.getElementById("suggest-locate")?.addEventListener("click", () => {
    if (!navigator.geolocation) { Toast.show("Trình duyệt không hỗ trợ định vị.", "error"); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      pickerMap.setView([lat, lng], 16);
      placeMarker(lat, lng);
      _reverseGeocode(lat, lng, "suggest-address");
    }, () => Toast.show("Không thể lấy vị trí.", "error"));
  });

  document.getElementById("suggest-img-input")?.addEventListener("change", function() {
    const file = this.files[0];
    if (!file) return;
    const wrap = document.getElementById("suggest-img-preview");
    if (wrap) { wrap.src = URL.createObjectURL(file); wrap.style.display = "block"; }
  });

  document.getElementById("suggest-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = e.target.querySelector("[type=submit]");
    const lat = latInput.value;
    const lng = lngInput.value;

    if (!lat || !lng) {
      Toast.show("Vui lòng chọn vị trí trên bản đồ.", "error"); return;
    }

    const imageFile = document.getElementById("suggest-img-input")?.files[0];
    if (!imageFile) {
      Toast.show("Vui lòng upload ảnh địa điểm để dễ xác thực.", "error"); return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Đang gửi...';

    try {
      const fd = new FormData(e.target);
      const data = {
        title:       fd.get("title"),
        description: fd.get("description"),
        lat, lng,
        address:     fd.get("address"),
        helpTypes:   fd.getAll("helpTypes"),
        urgency:     fd.get("urgency"),
        peopleCount: fd.get("peopleCount"),
        timeFrom:    fd.get("timeFrom"),
        timeTo:      fd.get("timeTo"),
        note:        fd.get("note"),
        submittedBy:   user.uid,
        submitterName: userData?.fullName || "Ẩn danh",
      };

      await SuggestionModel.create(data, imageFile);

      const allUsers = await UserModel.getAll();
      const adminUids = allUsers
        .filter(u => u.role === "admin" || u.role === "founder")
        .map(u => u.uid);

      await NotificationModel.createForMany(adminUids, {
        type:  "new_suggestion",
        title: "Đề xuất địa điểm mới",
        body:  `${userData?.fullName || "Thành viên"} đề xuất: "${data.title}"`,
        link:  "/admin/suggestions",
      });

      Toast.show("Đã gửi đề xuất! Admin sẽ xem xét sớm.");
      router.navigate("/home");
    } catch (err) {
      console.error(err);
      Toast.show("Lỗi gửi đề xuất: " + err.message, "error");
      btn.disabled = false;
      btn.textContent = "Gửi đề xuất";
    }
  });
}

// ── Admin list ────────────────────────────────────────────
function _initSuggestionList(currentUserData) {
  document.querySelectorAll(".sug-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".sug-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".sug-panel").forEach(p => p.style.display = "none");
      tab.classList.add("active");
      const panel = document.getElementById("panel-" + tab.dataset.tab);
      if (panel) panel.style.display = "block";
    });
  });

  document.getElementById("suggestions-wrap")?.addEventListener("click", async e => {
    const approveBtn = e.target.closest(".btn-approve");
    const rejectBtn  = e.target.closest(".btn-reject");
    const deleteBtn  = e.target.closest(".btn-sug-delete");

    if (approveBtn) {
      const id = approveBtn.dataset.id;
      if (!confirm("Xét duyệt và thêm địa điểm này lên bản đồ?")) return;
      approveBtn.disabled = true;
      approveBtn.innerHTML = '<span class="spinner"></span>';
      try {
        const sug = await SuggestionModel.findById(id);
        if (!sug) { Toast.show("Không tìm thấy đề xuất.", "error"); return; }

        await LocationModel.create({
          title:       sug.title,
          description: sug.description,
          lat:         sug.lat,
          lng:         sug.lng,
          address:     sug.address,
          helpTypes:   sug.helpTypes,
          urgency:     sug.urgency,
          peopleCount: sug.peopleCount,
          timeFrom:    sug.timeFrom,
          timeTo:      sug.timeTo,
          note:        sug.note,
          imageUrl:    sug.imageUrl,
          createdBy:   currentUserData?.uid,
        });

        await SuggestionModel.approve(id, currentUserData?.uid);

        await NotificationModel.create({
          toUid: sug.submittedBy,
          type:  "suggestion_approved",
          title: "Đề xuất được duyệt!",
          body:  `Địa điểm "${sug.title}" đã được thêm lên bản đồ.`,
          link:  "/home",
        });

        Toast.show("Đã duyệt và thêm địa điểm lên bản đồ!");
        router.navigate("/admin/suggestions");
      } catch (err) {
        Toast.show("Lỗi: " + err.message, "error");
        approveBtn.disabled = false;
        approveBtn.textContent = "Duyệt";
      }
      return;
    }

    if (rejectBtn) {
      const id    = rejectBtn.dataset.id;
      const title = rejectBtn.dataset.title;
      const toUid = rejectBtn.dataset.uid;
      _openRejectModal(id, title, toUid, currentUserData);
      return;
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      if (!confirm("Xóa đề xuất này?")) return;
      await SuggestionModel.delete(id);
      deleteBtn.closest("tr")?.remove();
      Toast.show("Đã xóa đề xuất.");
    }
  });
}

function _openRejectModal(sugId, title, submitterUid, currentUserData) {
  let modal = document.getElementById("reject-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "reject-modal";
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h3>Từ chối đề xuất</h3>
          <button class="modal-close" id="reject-modal-close">&times;</button>
        </div>
        <div style="padding:20px;">
          <p style="font-size:.85rem;color:var(--text2);margin-bottom:14px;">
            Đề xuất: <strong id="reject-sug-title"></strong>
          </p>
          <div class="form-group">
            <label>Lý do từ chối <span style="color:var(--accent)">*</span></label>
            <textarea id="reject-reason" class="form-control" rows="3"
              placeholder="Ví dụ: Ảnh không rõ ràng, vị trí không chính xác..."></textarea>
          </div>
          <div style="display:flex;gap:10px;margin-top:4px;">
            <button id="reject-confirm-btn" class="btn btn--danger" style="flex:1">Xác nhận từ chối</button>
            <button id="reject-cancel-btn" class="btn btn--ghost">Hủy</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  document.getElementById("reject-sug-title").textContent = title;
  document.getElementById("reject-reason").value = "";
  modal.style.display = "flex";

  const close = () => { modal.style.display = "none"; };
  document.getElementById("reject-modal-close").onclick = close;
  document.getElementById("reject-cancel-btn").onclick  = close;
  modal.onclick = e => { if (e.target === modal) close(); };

  // FIX: clone button để xóa handler cũ, tránh chồng event listener
  const oldBtn = document.getElementById("reject-confirm-btn");
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(newBtn, oldBtn);

  newBtn.onclick = async () => {
    const reason = document.getElementById("reject-reason").value.trim();
    if (!reason) { Toast.show("Vui lòng nhập lý do từ chối.", "error"); return; }
    newBtn.disabled = true;
    newBtn.innerHTML = '<span class="spinner"></span>';
    try {
      await SuggestionModel.reject(sugId, currentUserData?.uid, reason);
      await NotificationModel.create({
        toUid: submitterUid,
        type:  "suggestion_rejected",
        title: "Đề xuất không được duyệt",
        body:  `Đề xuất "${title}" bị từ chối. Lý do: ${reason}`,
        link:  "/home",
      });
      Toast.show("Đã từ chối đề xuất.");
      close();
      router.navigate("/admin/suggestions");
    } catch (err) {
      Toast.show("Lỗi: " + err.message, "error");
      newBtn.disabled = false;
      newBtn.textContent = "Xác nhận từ chối";
    }
  };
}

async function _reverseGeocode(lat, lng, inputId) {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`,
      { headers: { "Accept-Language": "vi" } }
    );
    const data = await res.json();
    const el   = document.getElementById(inputId);
    if (el && data.display_name) el.value = data.display_name;
  } catch(e) {}
}

function _nextTick() {
  return new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
}
