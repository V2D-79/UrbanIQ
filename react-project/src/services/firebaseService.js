/**
 * UrbanIQ Firebase Service - Complete CRUD + Real-time subscriptions
 * Handles: users, reports, progress updates, feedback, stats, AI analysis
 */

import { ref, push, set, get, remove, update, onValue, query, orderByChild, equalTo } from "firebase/database";
import { database } from "../firebase/config";

// ═══════════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════════

export async function createUserProfile(uid, data) {
  const userRef = ref(database, `users/${uid}`);
  await set(userRef, {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function getUserProfile(uid) {
  const snap = await get(ref(database, `users/${uid}`));
  return snap.val() || null;
}

export async function updateUserProfile(uid, data) {
  await update(ref(database, `users/${uid}`), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function addReport(data) {
  const reportRef = ref(database, "reports");
  const newRef = push(reportRef);
  const record = {
    ...data,
    id: newRef.key,
    status: "submitted",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await set(newRef, record);
  // Update global stats
  await incrementStat("totalReports");
  await updateCategoryStat(data.category, 1);
  return record;
}

export async function updateReport(reportId, data) {
  const reportRef = ref(database, `reports/${reportId}`);
  await update(reportRef, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteReport(reportId) {
  // Get report data first for stats update
  const snap = await get(ref(database, `reports/${reportId}`));
  const report = snap.val();
  
  await remove(ref(database, `reports/${reportId}`));
  
  // Update stats
  if (report) {
    await decrementStat("totalReports");
    await updateCategoryStat(report.category, -1);
    if (report.status === "closed" || report.status === "verified") {
      await decrementStat("resolvedReports");
    } else if (report.status === "in_progress" || report.status === "work_completed") {
      await decrementStat("inProgressReports");
    }
  }
}

export async function getReport(reportId) {
  const snap = await get(ref(database, `reports/${reportId}`));
  return snap.val() || null;
}

export async function getAllReports() {
  const snap = await get(ref(database, "reports"));
  const data = snap.val();
  return data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : [];
}

export async function getUserReports(userId) {
  const snap = await get(ref(database, "reports"));
  const data = snap.val();
  if (!data) return [];
  return Object.entries(data)
    .map(([id, val]) => ({ id, ...val }))
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function subscribeToAllReports(callback) {
  const reportRef = ref(database, "reports");
  const unsub = onValue(reportRef, (snapshot) => {
    const data = snapshot.val();
    const list = data
      ? Object.entries(data).map(([id, val]) => ({ id, ...val }))
      : [];
    callback(list);
  });
  return () => unsub();
}

export function subscribeToUserReports(userId, callback) {
  const reportRef = ref(database, "reports");
  const unsub = onValue(reportRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    const list = Object.entries(data)
      .map(([id, val]) => ({ id, ...val }))
      .filter((r) => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    callback(list);
  });
  return () => unsub();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS UPDATES (by authority)
// ═══════════════════════════════════════════════════════════════════════════════

export async function addProgressUpdate(reportId, data) {
  const progressRef = ref(database, `reports/${reportId}/progress`);
  const newRef = push(progressRef);
  const record = {
    ...data,
    id: newRef.key,
    createdAt: new Date().toISOString(),
  };
  await set(newRef, record);

  // Update report status
  if (data.status) {
    await update(ref(database, `reports/${reportId}`), {
      status: data.status,
      updatedAt: new Date().toISOString(),
    });
    // Update stats based on status change
    await recalculateStats();
  }

  return record;
}

export async function getProgressUpdates(reportId) {
  const snap = await get(ref(database, `reports/${reportId}/progress`));
  const data = snap.val();
  return data
    ? Object.entries(data)
        .map(([id, val]) => ({ id, ...val }))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    : [];
}

export function subscribeToProgress(reportId, callback) {
  const progressRef = ref(database, `reports/${reportId}/progress`);
  const unsub = onValue(progressRef, (snapshot) => {
    const data = snapshot.val();
    const list = data
      ? Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      : [];
    callback(list);
  });
  return () => unsub();
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEEDBACK (by citizen after work is completed)
// ═══════════════════════════════════════════════════════════════════════════════

export async function addFeedback(reportId, data) {
  const feedbackRef = ref(database, `reports/${reportId}/feedback`);
  await set(feedbackRef, {
    ...data,
    createdAt: new Date().toISOString(),
  });
  // Recalculate satisfaction
  await recalculateStats();
}

export async function getFeedback(reportId) {
  const snap = await get(ref(database, `reports/${reportId}/feedback`));
  return snap.val() || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL STATS
// ═══════════════════════════════════════════════════════════════════════════════

export function subscribeToStats(callback) {
  const statsRef = ref(database, "stats");
  const unsub = onValue(statsRef, (snapshot) => {
    callback(snapshot.val() || {
      totalReports: 0,
      resolvedReports: 0,
      inProgressReports: 0,
      satisfactionRate: 0,
      categoryBreakdown: {},
    });
  });
  return () => unsub();
}

export async function getStats() {
  const snap = await get(ref(database, "stats"));
  return snap.val() || {
    totalReports: 0,
    resolvedReports: 0,
    inProgressReports: 0,
    satisfactionRate: 0,
    categoryBreakdown: {},
  };
}

async function incrementStat(key) {
  const snap = await get(ref(database, `stats/${key}`));
  const current = snap.val() || 0;
  await set(ref(database, `stats/${key}`), current + 1);
}

async function decrementStat(key) {
  const snap = await get(ref(database, `stats/${key}`));
  const current = snap.val() || 0;
  await set(ref(database, `stats/${key}`), Math.max(0, current - 1));
}

async function updateCategoryStat(category, delta) {
  if (!category) return;
  const snap = await get(ref(database, `stats/categoryBreakdown/${category}`));
  const current = snap.val() || 0;
  await set(ref(database, `stats/categoryBreakdown/${category}`), Math.max(0, current + delta));
}

export async function recalculateStats() {
  try {
    const reports = await getAllReports();
    const totalReports = reports.length;
    const resolvedReports = reports.filter(
      (r) => r.status === "closed" || r.status === "verified" || r.status === "work_completed"
    ).length;
    const inProgressReports = reports.filter(
      (r) => r.status === "in_progress" || r.status === "under_review"
    ).length;

    // Category breakdown
    const categoryBreakdown = {};
    reports.forEach((r) => {
      const cat = r.category || "other";
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });

    // Satisfaction rate from feedback
    let totalRatings = 0;
    let ratingSum = 0;
    reports.forEach((r) => {
      if (r.feedback?.rating) {
        totalRatings++;
        ratingSum += r.feedback.rating;
      }
    });
    const satisfactionRate = totalRatings > 0 ? Math.round((ratingSum / totalRatings / 5) * 100) : 0;

    await set(ref(database, "stats"), {
      totalReports,
      resolvedReports,
      inProgressReports,
      satisfactionRate,
      categoryBreakdown,
    });
  } catch (err) {
    console.error("Failed to recalculate stats:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI ANALYSIS STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

export async function saveAIAnalysis(data) {
  const aiRef = ref(database, "aiAnalysis");
  const newRef = push(aiRef);
  await set(newRef, {
    ...data,
    id: newRef.key,
    savedAt: new Date().toISOString(),
  });
  return newRef.key;
}

export async function getLatestAIAnalysis() {
  const snap = await get(ref(database, "aiAnalysis"));
  const data = snap.val();
  if (!data) return null;
  const entries = Object.entries(data).map(([id, val]) => ({ id, ...val }));
  entries.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  return entries[0] || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

export async function exportAllData() {
  const [reports, stats] = await Promise.all([
    getAllReports(),
    getStats(),
  ]);
  return { reports, stats };
}
