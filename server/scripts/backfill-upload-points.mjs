/**
 * InvertisPrep — Upload-points reconciliation & backfill.
 * =======================================================
 * Fixes the leaderboard data problem where users with many verified paper
 * uploads have low/zero points: papers that were verified BEFORE the
 * "+50 points on verification" feature shipped never created a PointsLog
 * entry, so their uploaders never got credit and User.points drifted away
 * from the earning history.
 *
 * What it does (two passes):
 *   1. Backfill  — per user, expected upload points = verified+active paper
 *                  count × 50 (the verifyPYQ award). If their actual PointsLog
 *                  type='upload' total is lower, one adjustment log is inserted
 *                  (createdAt backdated to their oldest un-credited paper so
 *                  the weekly board is not polluted).
 *   2. Reconcile — User.points is recomputed as the sum of ALL PointsLog
 *                  entries (awardPoints in server/quiz-server is the only
 *                  writer and always logs, so the log is the source of truth).
 *                  User.weeklyPoints is recomputed from the current week's
 *                  logs to keep the fast-read field coherent.
 *
 * Environment (server/.env or shell exports):
 *   MONGODB_URI — same URI the API uses
 *
 * Usage (run from server/):
 *   node scripts/backfill-upload-points.mjs             # dry-run report (default)
 *   node scripts/backfill-upload-points.mjs --commit    # actually write to Mongo
 */

import 'dotenv/config';

const mongoose = (await import('mongoose')).default;
const COMMIT = process.argv.includes('--commit');

const PER_UPLOAD_POINTS = 50;

const pointLogSchemaCheck = `
NOTE: raw collections used — users, pointslogs, pyqpapers (same DB as the API).
`;

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  InvertisPrep — upload points backfill & leaderboard reconcile ║
╚══════════════════════════════════════════════════════════════╝
  Mode: ${COMMIT ? '🟢 COMMIT — writes will be applied' : '🟡 DRY-RUN — read only (pass --commit to apply)'}
${pointLogSchemaCheck}`);

if (!process.env.MONGODB_URI) {
  console.error('✖ MONGODB_URI is not set. Export it or run from server/ with .env present.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const usersCol = db.collection('users');
const logsCol = db.collection('pointslogs');
const papersCol = db.collection('pyqpapers');

// ── 1. Expected upload credit: verified + active papers per uploader ──
const uploadAgg = await papersCol
  .aggregate([
    {
      $match: {
        verified: true,
        isActive: true,
        uploadedBy: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$uploadedBy',
        papers: { $sum: 1 },
        oldest: { $min: '$createdAt' },
      },
    },
  ])
  .toArray();

const uploadMap = new Map(uploadAgg.map((d) => [d._id.toString(), d]));

// ── 2. Actual upload-type points earned so far ──
const logAgg = await logsCol
  .aggregate([
    { $match: { type: 'upload' } },
    { $group: { _id: '$userId', earned: { $sum: '$points' } } },
  ])
  .toArray();
const uploadLogMap = new Map(logAgg.map((d) => [d._id.toString(), d.earned]));

// Resolve user docs once
const userIds = [...uploadMap.keys()];
const userDocs = await usersCol
  .find({ _id: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) } })
  .project({ name: 1, email: 1, points: 1 })
  .toArray();
const userMap = new Map(userDocs.map((u) => [u._id.toString(), u]));

// ── 3. Compute deficits ──
const adjustments = [];
for (const [uid, agg] of uploadMap) {
  const user = userMap.get(uid);
  if (!user) continue; // dangling uploadedBy (user deleted) — nothing to credit

  const expected = agg.papers * PER_UPLOAD_POINTS;
  const earned = uploadLogMap.get(uid) || 0;
  const deficit = expected - earned;
  if (deficit > 0) {
    adjustments.push({
      uid: new mongoose.Types.ObjectId(uid),
      name: user.name || user.email || uid,
      email: user.email || '',
      papers: agg.papers,
      expected,
      earned,
      deficit,
      oldest: agg.oldest || new Date('2024-01-01'),
    });
  }
}

console.log(`\n── Backfill pass ──────────────────────────────────────────────`);
console.log(`Uploaders with verified papers: ${uploadMap.size}`);
if (adjustments.length === 0) {
  console.log('✔ No missing upload credit — every uploader already has their points.');
} else {
  console.log(`⚠ ${adjustments.length} user(s) under-credited:\n`);
  for (const a of adjustments.sort((x, y) => y.deficit - x.deficit)) {
    console.log(
      `  ${a.name.padEnd(28).slice(0, 28)} ${String(a.papers).padStart(4)} papers  expected ${String(a.expected).padStart(6)}  logged ${String(a.earned).padStart(6)}  → +${a.deficit}`
    );
  }
}

// ── 4. Commit backfill ──
if (COMMIT && adjustments.length > 0) {
  for (const a of adjustments) {
    await logsCol.insertOne({
      userId: a.uid,
      points: a.deficit,
      type: 'upload',
      description: `Backfill: ${a.papers} verified upload(s) @ ${PER_UPLOAD_POINTS} pts each`,
      createdAt: a.oldest,
      updatedAt: new Date(),
    });
  }
  console.log(`\n✔ Inserted ${adjustments.length} backfill log(s).`);
}

// ── 5. Reconcile User.points / weeklyPoints against the full log ──
const startOfWeek = new Date();
startOfWeek.setHours(0, 0, 0, 0);
startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

const totalsAgg = await logsCol
  .aggregate([{ $group: { _id: '$userId', total: { $sum: '$points' } } }])
  .toArray();
const weeklyAgg = await logsCol
  .aggregate([
    { $match: { createdAt: { $gte: startOfWeek } } },
    { $group: { _id: '$userId', total: { $sum: '$points' } } },
  ])
  .toArray();
const totalMap = new Map(totalsAgg.map((d) => [d._id.toString(), d.total]));
const weekMap = new Map(weeklyAgg.map((d) => [d._id.toString(), d.total]));

// Every user with a points value on the doc (covers users whose logs were purged too)
const allUsers = await usersCol
  .find({}, { projection: { name: 1, email: 1, points: 1, weeklyPoints: 1 } })
  .toArray();

const drifts = [];
for (const u of allUsers) {
  const logTotal = totalMap.get(u._id.toString()) || 0;
  const weekTotal = weekMap.get(u._id.toString()) || 0;
  if ((u.points || 0) !== logTotal || (u.weeklyPoints || 0) !== weekTotal) {
    drifts.push({
      _id: u._id,
      name: u.name || u.email || String(u._id),
      docPoints: u.points || 0,
      logTotal,
      docWeekly: u.weeklyPoints || 0,
      weekTotal,
    });
  }
}

console.log(`\n── Reconcile pass ─────────────────────────────────────────────`);
if (drifts.length === 0) {
  console.log('✔ User.points matches the PointsLog sum for every user.');
} else {
  console.log(`⚠ ${drifts.length} user(s) with points drift:\n`);
  for (const d of drifts.slice(0, 50)) {
    console.log(
      `  ${d.name.padEnd(28).slice(0, 28)} doc ${String(d.docPoints).padStart(6)} → log ${String(d.logTotal).padStart(6)}  (weekly ${String(d.docWeekly).padStart(4)} → ${String(d.weekTotal).padStart(4)})`
    );
  }
  if (drifts.length > 50) console.log(`  … and ${drifts.length - 50} more`);
}

if (COMMIT && drifts.length > 0) {
  let fixed = 0;
  for (const d of drifts) {
    await usersCol.updateOne(
      { _id: d._id },
      { $set: { points: d.logTotal, weeklyPoints: d.weekTotal } }
    );
    fixed++;
  }
  console.log(`\n✔ Reconciled ${fixed} user doc(s) to their PointsLog totals.`);
}

console.log(`\n── Done ───────────────────────────────────────────────────────`);
console.log(
  COMMIT
    ? '🟢 Changes written. Leaderboard now reflects real upload credit.'
    : '🟡 Dry-run only. Re-run with --commit to apply.'
);

await mongoose.disconnect();
process.exit(0);
