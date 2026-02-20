const DESTS = ["FP", "MC", "VM"];
const TIMES = ["1000","1100","1200","1300","1400","1500","1600","1700"];

//14 ที่
const SEATS = ["A1","A2","B1","B2","B3","C1","C2","C3","D1","D2","D3","E1","E2","E3"];

function bangkokNow() {
  const now = new Date();
  // แปลงให้เป็นเวลาไทย
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 7 * 3600000);
}

function fmtYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function makeTripId(dateObj, destCode, hhmm) {
  return `${fmtYYYYMMDD(dateObj)}_${destCode}_${hhmm}`;
}

function parseTripId(tripId) {
  // 20260211_FP_1000
  const [ymd, dest, hhmm] = String(tripId).split("_");
  if (!ymd || !dest || !hhmm) return null;

  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6));
  const d = Number(ymd.slice(6, 8));
  const hh = Number(hhmm.slice(0, 2));
  const mm = Number(hhmm.slice(2, 4));

  if (!DESTS.includes(dest)) return null;
  if (!TIMES.includes(hhmm)) return null;

  const departAt = new Date(Date.UTC(y, m - 1, d, hh - 7, mm, 0));

  return { y, m, d, dest, hhmm, departAt };
}

// ปิดจองก่อนออก 1 นาที
function isBookingOpen(tripId, now = bangkokNow()) {
  
  const info = parseTripId(tripId);
  if (!info) return { ok: false, code: "BAD_TRIP_ID" };

  const closeAt = new Date(info.departAt.getTime() - 60 * 1000);
  if (now >= closeAt) return { ok: false, code: "TRIP_CLOSED" };
  return { ok: true };
}

function allTripIdsForDate(dateObj) {
  const ymd = fmtYYYYMMDD(dateObj);
  const ids = [];
  for (const dest of DESTS) {
    for (const t of TIMES) ids.push(`${ymd}_${dest}_${t}`);
  }
  return ids;
}

module.exports = {
  DESTS, TIMES, SEATS,
  bangkokNow,
  makeTripId,
  parseTripId,
  isBookingOpen,
  allTripIdsForDate,
};
