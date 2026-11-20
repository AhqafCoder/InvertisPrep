import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { PointsLog } from '../models/PointsLog.js';
import { PYQPaper } from '../models/PYQPaper.js';
import { calculateUserBadges } from '../utils/badges.js';

// Escape user input before embedding it into a RegExp
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Competition ranking: ties share the same (better) rank, next distinct value
// takes the next rank. Call on the FULL sorted list so ties are correct even
// across page boundaries, then slice.
const applyTieRanks = (rows, key) => {
  let prevValue;
  let prevRank = 0;
  rows.forEach((row, index) => {
    if (index === 0 || row[key] !== prevValue) {
      prevRank = index + 1;
      prevValue = row[key];
    }
    row.rank = prevRank;
  });
  return rows;
};

// Get leaderboard rankings (paginated, searchable)
export const getLeaderboard = async (req, res) => {
  try {
    const { type = 'all_time', department, search } = req.query;
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;
    const searchRegex = search && search.trim() ? new RegExp(escapeRegex(search.trim()), 'i') : null;

    let rankings = [];
    let total = 0;

    if (type === 'contributors') {
      // Top contributors: ranked by verified paper uploads
      const pipeline = [
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
            uploads: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: '$user',
        },
        {
          $match: {
            'user.isActive': true,
          },
        },
      ];

      let rows = await PYQPaper.aggregate(pipeline);
      rows = rows
        .map((r) => ({
          userId: r._id,
          uploads: r.uploads,
          points: r.user.points || 0,
          name: r.user.name,
          email: r.user.email,
          picture: r.user.picture,
          course: r.user.course,
          followersCount: r.user.followers ? r.user.followers.length : 0,
        }))
        .filter((r) => {
          if (department && (r.course || '').toLowerCase() !== department.toLowerCase()) return false;
          if (searchRegex && !searchRegex.test(r.name || '') && !searchRegex.test(r.email || '')) return false;
          return true;
        })
        .sort((a, b) => b.uploads - a.uploads || String(a.name || '').localeCompare(String(b.name || '')));

      applyTieRanks(rows, 'uploads');
      total = rows.length;
      rankings = rows.slice(skip, skip + limitNum);
    } else if (type === 'weekly') {
      // Get the start of the current week (Sunday 12:00 AM IST)
      const startOfWeek = new Date();
      startOfWeek.setHours(0, 0, 0, 0);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

      const [logRows, weeklyUploads] = await Promise.all([
        PointsLog.aggregate([
          {
            $match: {
              createdAt: { $gte: startOfWeek },
            },
          },
          {
            $group: {
              _id: '$userId',
              points: { $sum: '$points' },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user',
            },
          },
          {
            $unwind: '$user',
          },
        ]),
        PYQPaper.aggregate([
          {
            $match: {
              verified: true,
              isActive: true,
              createdAt: { $gte: startOfWeek },
              uploadedBy: { $ne: null },
            },
          },
          {
            $group: {
              _id: '$uploadedBy',
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      const weekUploadMap = new Map(weeklyUploads.map((d) => [d._id.toString(), d.count]));

      let rows = logRows
        .map((r) => ({
          userId: r._id,
          points: r.points,
          uploads: weekUploadMap.get(r._id.toString()) || 0,
          name: r.user.name,
          email: r.user.email,
          picture: r.user.picture,
          course: r.user.course,
          followersCount: r.user.followers ? r.user.followers.length : 0,
        }))
        .filter((r) => {
          if (department && (r.course || '').toLowerCase() !== department.toLowerCase()) return false;
          if (searchRegex && !searchRegex.test(r.name || '') && !searchRegex.test(r.email || '')) return false;
          return true;
        })
        .sort((a, b) => b.points - a.points || String(a.name || '').localeCompare(String(b.name || '')));

      applyTieRanks(rows, 'points');
      total = rows.length;
      rankings = rows.slice(skip, skip + limitNum);
    } else {
      // All time leaderboard — full directory of every active user so
      // search finds anyone, ranked by points.
      const filter = { isActive: true };
      if (department) {
        filter.course = { $regex: new RegExp(`^${department}$`, 'i') };
      }
      if (searchRegex) {
        filter.$or = [{ name: { $regex: searchRegex } }, { email: { $regex: searchRegex } }];
      }

      total = await User.countDocuments(filter);

      const users = await User.find(filter)
        .select('name email picture course points followers')
        .sort({ points: -1, name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      // Verified upload counts for the page users
      const pageUserIds = users.map((u) => u._id);
      const uploadCounts = pageUserIds.length
        ? await PYQPaper.aggregate([
            {
              $match: {
                uploadedBy: { $in: pageUserIds },
                verified: true,
                isActive: true,
              },
            },
            {
              $group: {
                _id: '$uploadedBy',
                count: { $sum: 1 },
              },
            },
          ])
        : [];
      const uploadMap = new Map(uploadCounts.map((d) => [d._id.toString(), d.count]));

      // Anchor the page's first row to its true global rank, then carry ties.
      const baseRank = users.length
        ? (await User.countDocuments({ ...filter, points: { $gt: users[0].points } })) + 1
        : skip + 1;
      let currentRank = baseRank;
      let prevPoints;

      rankings = users.map((u, i) => {
        if (i === 0 || u.points !== prevPoints) {
          currentRank = baseRank + i;
          prevPoints = u.points;
        }
        return {
          userId: u._id,
          points: u.points || 0,
          uploads: uploadMap.get(u._id.toString()) || 0,
          name: u.name,
          email: u.email,
          picture: u.picture,
          course: u.course || 'N/A',
          followersCount: u.followers ? u.followers.length : 0,
          rank: currentRank,
        };
      });
    }

    res.json({
      success: true,
      data: rankings,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving leaderboard rankings' });
  }
};

// Get stats & badges for the logged in user
export const getMyStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch user details
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // 2. Fetch specific statistics for badges
    // Number of verified uploads
    const verifiedUploads = await PYQPaper.countDocuments({
      uploadedBy: userId,
      verified: true,
      isActive: true,
    });

    // Quiz wins: check logs of type 'quiz' and description matching 'Won'
    const quizWins = await PointsLog.countDocuments({
      userId,
      type: 'quiz',
      description: { $regex: /Won 1v1/i },
    });

    const followers = user.followers ? user.followers.length : 0;

    // Calculate badges
    const badges = calculateUserBadges(user.points, verifiedUploads, quizWins, followers);

    // 3. Calculate current rankings (competition style — matches the boards)
    // All-time Rank
    const allTimeHigherCount = await User.countDocuments({
      isActive: true,
      points: { $gt: user.points },
    });
    const allTimeRank = allTimeHigherCount + 1;

    // Weekly points and rank
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const myWeeklyLog = await PointsLog.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startOfWeek },
        },
      },
      {
        $group: {
          _id: '$userId',
          total: { $sum: '$points' },
        },
      },
    ]);

    const weeklyPoints = myWeeklyLog[0]?.total || 0;

    // Count how many users have weekly points higher than mine
    const weeklyRankLogs = await PointsLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfWeek },
        },
      },
      {
        $group: {
          _id: '$userId',
          total: { $sum: '$points' },
        },
      },
      {
        $match: {
          total: { $gt: weeklyPoints },
        },
      },
      {
        $count: 'count',
      },
    ]);

    const weeklyRank = (weeklyRankLogs[0]?.count || 0) + 1;

    // Contributor rank: number of users with more verified paper uploads than me
    const uploadRankAgg = await PYQPaper.aggregate([
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
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $match: {
          'user.isActive': true,
          count: { $gt: verifiedUploads },
        },
      },
      {
        $count: 'count',
      },
    ]);
    const uploadsRank = (uploadRankAgg[0]?.count || 0) + 1;

    res.json({
      success: true,
      data: {
        points: user.points || 0,
        weeklyPoints,
        allTimeRank,
        weeklyRank,
        uploadsRank,
        stats: {
          verifiedUploads,
          quizWins,
          followers,
        },
        badges,
      },
    });
  } catch (error) {
    console.error('Error fetching personal leaderboard stats:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving stats' });
  }
};
