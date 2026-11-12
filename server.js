const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const BACKUPS_DIR = path.join(__dirname, 'data', 'backups');
if (!fs.existsSync(BACKUPS_DIR)) {
  try {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  } catch (e) {}
}

let mysql;
try {
  mysql = require('mysql2');
} catch (e) {
  console.warn('mysql2 module could not be loaded directly:', e.message);
}

let db;
try {
  db = require('./db');
} catch (e) {
  console.warn('MySQL db module could not be loaded:', e.message);
}

const emailService = require('./emailService');

function getEmailService() {
  try {
    delete require.cache[require.resolve('./emailService')];
  } catch (e) {}
  return require('./emailService');
}

// OTP Verification Store
// key: email.toLowerCase() -> { code, expiresAt, attempts, lastSentAt, verified, token, verifiedAt }
const otpStore = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of otpStore.entries()) {
    if (now > (entry.expiresAt || 0) + 15 * 60 * 1000) {
      otpStore.delete(email);
    }
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=UTF-8'
};

function formatLogDateTime(date = new Date()) {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

async function logActivity(userName, userEmail, action, affectedRecord, description, outcome = 'SUCCESSFUL') {
  const dt = formatLogDateTime();
  const entry = {
    date_time: dt,
    user_name: userName || 'Staff User',
    user_email: userEmail || 'staff@casaamara.ph',
    action: action || 'System Event',
    affected_record: affectedRecord || 'General',
    description: description || '',
    outcome: outcome || 'SUCCESSFUL'
  };

  if (db) {
    try {
      await db.query(
        'INSERT INTO activity_logs (date_time, user_name, user_email, action, affected_record, description, outcome) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [entry.date_time, entry.user_name, entry.user_email, entry.action, entry.affected_record, entry.description, entry.outcome]
      );
    } catch (e) {
      console.error('Failed to write log to MySQL:', e.message);
    }
  }

  const logsPath = path.join(BASE_DIR, 'data', 'activity_logs.json');
  fs.readFile(logsPath, 'utf8', (err, raw) => {
    let logs = [];
    if (!err && raw) {
      try { logs = JSON.parse(raw); } catch (pe) { logs = []; }
    }
    const newId = logs.length > 0 ? (Math.max(...logs.map(l => l.id || 0)) + 1) : 1;
    logs.unshift({ id: newId, ...entry });
    fs.writeFile(logsPath, JSON.stringify(logs, null, 2), 'utf8', () => {});
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  let reqPath = decodeURI(parsedUrl.pathname);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath === '/admin' || reqPath === '/admin/') reqPath = '/admin.html';
  if (reqPath === '/rooms' || reqPath === '/rooms/') reqPath = '/rooms.html';
  if (reqPath === '/booking' || reqPath === '/booking/') reqPath = '/booking.html';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // --- API: Staff Authentication ---
  if (reqPath === '/api/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { username, password } = JSON.parse(body || '{}');
        const passwordHash = crypto.createHash('sha256').update(password || '').digest('hex');

        // 1. Try MySQL First
        if (db) {
          try {
            const [rows] = await db.query(
              'SELECT id, username, password_hash, role, full_name, email, status, last_signin FROM users WHERE username = ?',
              [username]
            );
            if (rows && rows.length > 0) {
              const targetUser = rows[0];
              if (targetUser.status === 'INACTIVE') {
                await logActivity(
                  targetUser.full_name,
                  targetUser.email || `${targetUser.username}@casaamara.ph`,
                  'Staff login',
                  'Authentication',
                  `Rejected login: Account "${targetUser.username}" is deactivated.`,
                  'FAILED'
                );
                res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: 'This account has been deactivated. Please contact the Hotel Manager.' }));
              }

              if (passwordHash === targetUser.password_hash) {
                const nowDt = formatLogDateTime();
                try {
                  await db.query('UPDATE users SET last_signin = ? WHERE id = ?', [nowDt, targetUser.id]);
                } catch (uErr) {}

                await logActivity(
                  targetUser.full_name,
                  targetUser.email || `${targetUser.username}@casaamara.ph`,
                  'Staff login',
                  'Authentication',
                  `${targetUser.full_name} signed in.`,
                  'SUCCESSFUL'
                );

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({
                  success: true,
                  user: {
                    id: targetUser.id,
                    username: targetUser.username,
                    role: targetUser.role,
                    full_name: targetUser.full_name,
                    email: targetUser.email || `${targetUser.username}@casaamara.ph`,
                    status: targetUser.status || 'ACTIVE',
                    last_signin: nowDt
                  }
                }));
              } else {
                await logActivity(
                  username,
                  `${username}@casaamara.ph`,
                  'Staff login',
                  'Authentication',
                  `Failed login attempt for user "${username}".`,
                  'FAILED'
                );
                res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: 'Invalid username or password' }));
              }
            }
          } catch (dbErr) {
            // If MySQL query fails, fall through to JSON
          }
        }

        // 2. Fallback to users.json
        const usersPath = path.join(BASE_DIR, 'data', 'users.json');
        fs.readFile(usersPath, 'utf8', async (err, data) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ error: 'Failed to access user directory' }));
          }
          let users = {};
          try { users = JSON.parse(data); } catch (e) { users = {}; }

          const targetUser = users[username];
          if (!targetUser || passwordHash !== targetUser.password_hash) {
            await logActivity(
              username,
              `${username}@casaamara.ph`,
              'Staff login',
              'Authentication',
              `Failed login attempt for user "${username}".`,
              'FAILED'
            );
            res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ error: 'Invalid username or password' }));
          }

          if (targetUser.status === 'INACTIVE') {
            await logActivity(
              targetUser.full_name,
              targetUser.email || `${username}@casaamara.ph`,
              'Staff login',
              'Authentication',
              `Rejected login: Account "${username}" is deactivated.`,
              'FAILED'
            );
            res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ error: 'This account has been deactivated. Please contact the Hotel Manager.' }));
          }

          const nowDt = formatLogDateTime();
          targetUser.last_signin = nowDt;
          fs.writeFile(usersPath, JSON.stringify(users, null, 2), 'utf8', () => {});

          await logActivity(
            targetUser.full_name,
            targetUser.email || `${username}@casaamara.ph`,
            'Staff login',
            'Authentication',
            `${targetUser.full_name} signed in.`,
            'SUCCESSFUL'
          );

          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({
            success: true,
            user: {
              username,
              role: targetUser.role,
              full_name: targetUser.full_name,
              email: targetUser.email || `${username}@casaamara.ph`,
              status: targetUser.status || 'ACTIVE',
              last_signin: nowDt
            }
          }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
      }
    });
    return;
  }

  // --- API: Room Inventory Management & Publishing ---
  if (reqPath === '/api/rooms') {
    const roomsPath = path.join(BASE_DIR, 'data', 'rooms.json');

    // GET /api/rooms
    if (req.method === 'GET') {
      if (db) {
        try {
          const [rows] = await db.query('SELECT * FROM rooms WHERE status != "hidden"');
          if (rows && rows.length > 0) {
            const formatted = rows.map(r => {
              let imageStr = 'assets/images/deluxe-room.jpg';
              if (r.image) {
                if (Buffer.isBuffer(r.image)) {
                  imageStr = r.image.toString('utf8');
                } else if (typeof r.image === 'string') {
                  imageStr = r.image;
                }
              }
              return {
                ...r,
                image: imageStr,
                amenities: typeof r.amenities === 'string' ? JSON.parse(r.amenities) : (r.amenities || [])
              };
            });
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify(formatted));
          }
        } catch (dbErr) {
          // Fall through to JSON
        }
      }

      fs.readFile(roomsPath, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Failed to read room catalog' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(data);
      });
      return;
    }

    // POST /api/rooms (Add or Update Room)
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const roomData = JSON.parse(body || '{}');
          if (!roomData.name || !roomData.rate_per_night) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ error: 'Room name and nightly rate are required' }));
          }

          // Assign unique ID if not present
          if (!roomData.id) {
            roomData.id = roomData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          }

          // Normalize fields
          roomData.rate_per_night = Number(roomData.rate_per_night);
          roomData.max_guests = Number(roomData.max_guests) || 2;
          roomData.inventory_units = Number(roomData.inventory_units) || 5;
          roomData.available_units = Number(roomData.available_units !== undefined ? roomData.available_units : roomData.inventory_units);
          roomData.status = roomData.status || 'available';
          roomData.date_posted = roomData.date_posted || new Date().toISOString().slice(0, 10);
          roomData.bed_config = roomData.bed_config || '';
          roomData.room_number = (roomData.room_number || '').toString().replace(/[^0-9,\-\s]/g, '').trim();
          roomData.floor_number = roomData.floor_number || '';
          roomData.amenities = Array.isArray(roomData.amenities) ? roomData.amenities : [];
          roomData.image = roomData.image || 'assets/images/deluxe-room.jpg';

          // 1. Sync to MySQL
          if (db) {
            try {
              await db.query(
                `INSERT INTO rooms (id, name, tagline, rate_per_night, max_guests, bed_config, room_number, floor_number, room_size, view, badge, inventory_units, available_units, status, amenities, image, posted_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                   name=VALUES(name), tagline=VALUES(tagline), rate_per_night=VALUES(rate_per_night),
                   max_guests=VALUES(max_guests), bed_config=VALUES(bed_config),
                   room_number=VALUES(room_number), floor_number=VALUES(floor_number), room_size=VALUES(room_size),
                   view=VALUES(view), badge=VALUES(badge), inventory_units=VALUES(inventory_units),
                   available_units=VALUES(available_units), status=VALUES(status), amenities=VALUES(amenities),
                   image=VALUES(image), posted_by=VALUES(posted_by)`,
                [
                  roomData.id, roomData.name, roomData.tagline || '', roomData.rate_per_night,
                  roomData.max_guests, roomData.bed_config || '', roomData.room_number || '',
                  roomData.floor_number || '', roomData.room_size || '',
                  roomData.view || '', roomData.badge || '', roomData.inventory_units,
                  roomData.available_units, roomData.status,
                  JSON.stringify(roomData.amenities), roomData.image, roomData.posted_by || 'Hotel Manager'
                ]
              );
            } catch (dbErr) {
              // Non-fatal, continue to sync JSON
            }
          }

          // 2. Sync to rooms.json
          fs.readFile(roomsPath, 'utf8', (err, data) => {
            let rooms = [];
            if (!err && data) {
              try { rooms = JSON.parse(data); } catch (e) { rooms = []; }
            }

            const existingIdx = rooms.findIndex(r => r.id === roomData.id);
            const isUpdate = existingIdx >= 0;
            if (isUpdate) {
              rooms[existingIdx] = { ...rooms[existingIdx], ...roomData };
            } else {
              rooms.push(roomData);
            }

            logActivity(
              roomData.posted_by || 'Casa Amara Staff',
              'manager@casaamara.ph',
              isUpdate ? 'Room updated' : 'Room created',
              'Rooms Catalog',
              `${isUpdate ? 'Updated' : 'Published'} room "${roomData.name}" (${roomData.room_number || roomData.id}).`,
              'SUCCESSFUL'
            );

            fs.writeFile(roomsPath, JSON.stringify(rooms, null, 2), 'utf8', writeErr => {
              if (writeErr) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: 'Failed to write room catalog' }));
              }
              res.writeHead(201, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              return res.end(JSON.stringify({ success: true, room: roomData }));
            });
          });
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
        }
      });
      return;
    }

    // DELETE /api/rooms (Delete or Unpublish room)
    if (req.method === 'DELETE') {
      const roomId = parsedUrl.searchParams.get('id');
      if (!roomId) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Missing room ID parameter' }));
      }

      let dbAffected = false;
      if (db) {
        try {
          const [dbRes] = await db.query('DELETE FROM rooms WHERE id = ?', [roomId]);
          if (dbRes && dbRes.affectedRows > 0) dbAffected = true;
        } catch (dbErr) {
          // Continue to JSON removal
        }
      }

      logActivity(
        'Casa Amara Staff',
        'manager@casaamara.ph',
        'Room removed',
        'Rooms Catalog',
        `Removed room ${roomId} from catalog.`,
        'SUCCESSFUL'
      );

      fs.readFile(roomsPath, 'utf8', (err, data) => {
        if (err) {
          if (dbAffected) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ success: true, message: `Room ${roomId} unpublished` }));
          }
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Failed to read rooms' }));
        }
        let rooms = [];
        try { rooms = JSON.parse(data); } catch (e) { rooms = []; }

        const initialLen = rooms.length;
        rooms = rooms.filter(r => r.id !== roomId);

        if (rooms.length === initialLen && !dbAffected) {
          res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Room not found' }));
        }

        fs.writeFile(roomsPath, JSON.stringify(rooms, null, 2), 'utf8', writeErr => {
          if (writeErr && !dbAffected) {
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ error: 'Failed to update rooms' }));
          }
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ success: true, message: `Room ${roomId} unpublished` }));
        });
      });
      return;
    }
  }

  // --- API: Email OTP Verification ---
  if (reqPath === '/api/otp/send' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { email } = JSON.parse(body || '{}');
        const cleanEmail = (email || '').trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!cleanEmail || !emailRegex.test(cleanEmail)) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Please enter a valid email address.' }));
        }

        const now = Date.now();
        const existing = otpStore.get(cleanEmail);

        // Check if existing OTP session is still active (within 5 minutes)
        const isSessionActive = existing && (now < (existing.expiresAt || 0));

        if (isSessionActive) {
          // Check 60-second cooldown
          if (existing.lastSentAt && (now - existing.lastSentAt < 60 * 1000)) {
            const waitSecs = Math.ceil((60 * 1000 - (now - existing.lastSentAt)) / 1000);
            res.writeHead(429, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ 
              error: `Please wait ${waitSecs} seconds before requesting a new code.`,
              cooldownWait: waitSecs
            }));
          }

          // Check resend limit (maximum 3 resends allowed)
          const currentResends = existing.resends || 0;
          if (currentResends >= 3) {
            res.writeHead(429, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ 
              error: 'You have reached the maximum limit of 3 code resends. Please check your inbox or spam folder for previous codes, or wait until the code expires.',
              maxResendsReached: true,
              resendsRemaining: 0
            }));
          }
        }

        const otpCode = crypto.randomInt(100000, 1000000).toString();
        const resendCount = isSessionActive ? ((existing.resends || 0) + 1) : 0;
        const entry = {
          code: otpCode,
          expiresAt: now + 5 * 60 * 1000, // 5 minutes
          attempts: 0,
          resends: resendCount,
          lastSentAt: now,
          verified: false
        };

        // Try to deliver verification code
        try {
          await getEmailService().sendOtpEmail(cleanEmail, otpCode);
        } catch (emailErr) {
          console.error('[OTP SEND] Failed to deliver OTP email:', emailErr.message);
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Failed to deliver verification code to your email. Please check your email address and try again.' }));
        }

        otpStore.set(cleanEmail, entry);

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ 
          success: true, 
          message: 'Verification code sent to your email.',
          resendsRemaining: Math.max(0, 3 - resendCount),
          resendsUsed: resendCount
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Invalid request payload.' }));
      }
    });
    return;
  }

  if (reqPath === '/api/otp/verify' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { email, otp } = JSON.parse(body || '{}');
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanOtp = (otp || '').trim();

        const entry = otpStore.get(cleanEmail);
        if (!entry) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'No verification code requested for this email. Please request a new code.' }));
        }

        const now = Date.now();
        if (now > entry.expiresAt) {
          otpStore.delete(cleanEmail);
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Verification code has expired. Please request a new code.' }));
        }

        if (entry.attempts >= 5) {
          otpStore.delete(cleanEmail);
          res.writeHead(429, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Too many failed attempts. Please request a new verification code.' }));
        }

        if (entry.code !== cleanOtp) {
          entry.attempts++;
          const remaining = 5 - entry.attempts;
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({
            error: remaining > 0 ? `Invalid verification code. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.` : 'Too many failed attempts. Please request a new code.'
          }));
        }

        // Verified successfully
        const verificationToken = crypto.randomBytes(24).toString('hex');
        entry.verified = true;
        entry.token = verificationToken;
        entry.verifiedAt = now;

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({
          success: true,
          verified: true,
          verification_token: verificationToken,
          message: 'Email verified successfully.'
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Invalid verification request.' }));
      }
    });
    return;
  }

  // --- API: Admin Reservation Approval ---
  if (reqPath === '/api/reservations/approve' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { reference_id } = JSON.parse(body || '{}');
        if (!reference_id) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Missing reference_id.' }));
        }

        const dataFilePath = path.join(BASE_DIR, 'data', 'reservations.json');
        let targetReservation = null;

        // 1. Fetch reservation from MySQL or JSON
        if (db) {
          try {
            const [rows] = await db.query('SELECT * FROM reservations WHERE reference_id = ?', [reference_id]);
            if (rows && rows.length > 0) targetReservation = rows[0];
          } catch (dbErr) {}
        }

        let fileData = [];
        try {
          fileData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8') || '[]');
        } catch (e) {
          fileData = [];
        }

        if (!targetReservation) {
          targetReservation = fileData.find(r => r.reference_id === reference_id);
        }

        if (!targetReservation) {
          res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Reservation not found.' }));
        }

        // Check if already approved (prevent duplicate emails)
        if (targetReservation.payment_status === 'Approved') {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ success: true, message: 'Reservation is already approved.', already_processed: true }));
        }

        // 2. Update status in MySQL
        if (db) {
          try {
            await db.query('UPDATE reservations SET payment_status = ? WHERE reference_id = ?', ['Approved', reference_id]);
          } catch (dbErr) {
            console.error('Failed to update reservation in MySQL:', dbErr.message);
          }
        }

        // 3. Update status in reservations.json
        targetReservation.payment_status = 'Approved';
        const jsonIdx = fileData.findIndex(r => r.reference_id === reference_id);
        if (jsonIdx >= 0) {
          fileData[jsonIdx] = { ...fileData[jsonIdx], payment_status: 'Approved' };
        } else {
          fileData.push(targetReservation);
        }
        try {
          fs.writeFileSync(dataFilePath, JSON.stringify(fileData, null, 2), 'utf8');
        } catch (fErr) {}

        // 4. Log staff activity
        logActivity(
          'Hotel Admin',
          'admin@casaamara.ph',
          'Reservation approved',
          'Reservations',
          `Approved reservation ${reference_id} for ${targetReservation.guest_name}.`,
          'SUCCESSFUL'
        );

        // 5. Send Reservation Confirmed email (non-blocking for DB update)
        let emailSent = true;
        try {
          await getEmailService().sendReservationApprovedEmail(targetReservation);
        } catch (emailErr) {
          console.error('[APPROVE EMAIL] Failed to send approval email:', emailErr.message);
          emailSent = false;
        }

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({
          success: true,
          message: emailSent ? 'Reservation approved and confirmation email sent.' : 'Reservation approved in system, but confirmation email delivery failed.',
          email_sent: emailSent,
          reservation: targetReservation
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Server error during approval.' }));
      }
    });
    return;
  }

  // --- API: Admin Reservation Rejection ---
  if (reqPath === '/api/reservations/reject' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { reference_id, reason } = JSON.parse(body || '{}');
        if (!reference_id) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Missing reference_id.' }));
        }

        const dataFilePath = path.join(BASE_DIR, 'data', 'reservations.json');
        let targetReservation = null;

        // 1. Fetch reservation from MySQL or JSON
        if (db) {
          try {
            const [rows] = await db.query('SELECT * FROM reservations WHERE reference_id = ?', [reference_id]);
            if (rows && rows.length > 0) targetReservation = rows[0];
          } catch (dbErr) {}
        }

        let fileData = [];
        try {
          fileData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8') || '[]');
        } catch (e) {
          fileData = [];
        }

        if (!targetReservation) {
          targetReservation = fileData.find(r => r.reference_id === reference_id);
        }

        if (!targetReservation) {
          res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Reservation not found.' }));
        }

        // Check if already rejected (prevent duplicate emails)
        if (targetReservation.payment_status === 'Rejected') {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ success: true, message: 'Reservation is already rejected.', already_processed: true }));
        }

        const cleanReason = (reason || '').trim();

        // 2. Update status & reason in MySQL
        if (db) {
          try {
            await db.query('UPDATE reservations SET payment_status = ?, rejection_reason = ? WHERE reference_id = ?', ['Rejected', cleanReason, reference_id]);
          } catch (dbErr) {
            console.error('Failed to update rejection in MySQL:', dbErr.message);
          }
        }

        // 3. Update status in reservations.json
        targetReservation.payment_status = 'Rejected';
        targetReservation.rejection_reason = cleanReason;
        const jsonIdx = fileData.findIndex(r => r.reference_id === reference_id);
        if (jsonIdx >= 0) {
          fileData[jsonIdx] = { ...fileData[jsonIdx], payment_status: 'Rejected', rejection_reason: cleanReason };
        } else {
          fileData.push(targetReservation);
        }
        try {
          fs.writeFileSync(dataFilePath, JSON.stringify(fileData, null, 2), 'utf8');
        } catch (fErr) {}

        // 4. Log staff activity
        logActivity(
          'Hotel Admin',
          'admin@casaamara.ph',
          'Reservation rejected',
          'Reservations',
          `Rejected reservation ${reference_id}. Reason: ${cleanReason || 'No specific reason provided.'}`,
          'SUCCESSFUL'
        );

        // 5. Send Rejection Email (non-blocking for DB update)
        let emailSent = true;
        try {
          await getEmailService().sendReservationRejectedEmail(targetReservation, cleanReason);
        } catch (emailErr) {
          console.error('[REJECT EMAIL] Failed to send rejection email:', emailErr.message);
          emailSent = false;
        }

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({
          success: true,
          message: emailSent ? 'Reservation rejected and notification email sent.' : 'Reservation marked as rejected, but notification email delivery failed.',
          email_sent: emailSent,
          reservation: targetReservation
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Server error during rejection.' }));
      }
    });
    return;
  }

  // --- API: Reservations Management ---
  if (reqPath === '/api/reservations') {
    const dataFilePath = path.join(BASE_DIR, 'data', 'reservations.json');

    // GET /api/reservations
    if (req.method === 'GET') {
      if (db) {
        try {
          const [rows] = await db.query('SELECT * FROM reservations ORDER BY created_at DESC');
          if (rows && rows.length > 0) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify(rows));
          }
        } catch (dbErr) {
          // Fall through to JSON
        }
      }

      fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Failed to read reservations' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(data);
      });
      return;
    }

    // POST /api/reservations (Add or Update)
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const newReservation = JSON.parse(body || '{}');

          // 1. Sync to MySQL
          if (db && newReservation.reference_id) {
            try {
              await db.query(
                `INSERT INTO reservations 
                  (reference_id, guest_name, email, phone, room_type_id, room_name, room_number, check_in, check_out, nights, guests, total_amount, payment_status, special_requests, rejection_reason)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   guest_name=VALUES(guest_name), email=VALUES(email), phone=VALUES(phone),
                   room_number=VALUES(room_number), payment_status=VALUES(payment_status), special_requests=VALUES(special_requests),
                   rejection_reason=VALUES(rejection_reason)`,
                [
                  newReservation.reference_id,
                  newReservation.guest_name || 'Guest',
                  newReservation.email || '',
                  newReservation.phone || '',
                  newReservation.room_type_id || 'deluxe',
                  newReservation.room_name || 'Deluxe Room',
                  newReservation.room_number || '',
                  newReservation.check_in || '',
                  newReservation.check_out || '',
                  newReservation.nights || 1,
                  newReservation.guests || 2,
                  newReservation.total_amount || 0,
                  newReservation.payment_status || 'Pending',
                  newReservation.special_requests || '',
                  newReservation.rejection_reason || null
                ]
              );
            } catch (dbErr) {
              // Non-fatal, continue to sync JSON
            }
          }

          // 2. Sync to reservations.json
          fs.readFile(dataFilePath, 'utf8', (err, data) => {
            let reservations = [];
            if (!err && data) {
              try { reservations = JSON.parse(data); } catch (e) { reservations = []; }
            }
            const existingIndex = reservations.findIndex(r => r.reference_id === newReservation.reference_id);
            const isUpdate = existingIndex >= 0;
            if (isUpdate) {
              reservations[existingIndex] = { ...reservations[existingIndex], ...newReservation };
            } else {
              reservations.push(newReservation);
            }

            logActivity(
              newReservation.guest_name || 'Front Desk',
              newReservation.email || 'guest@casaamara.ph',
              isUpdate ? 'Reservation updated' : 'Reservation created',
              'Reservations',
              `${isUpdate ? 'Updated' : 'Created'} reservation ${newReservation.reference_id} for ${newReservation.guest_name}${newReservation.room_number ? ` (Room ${newReservation.room_number})` : ''}.`,
              'SUCCESSFUL'
            );

            fs.writeFile(dataFilePath, JSON.stringify(reservations, null, 2), 'utf8', async (writeErr) => {
              if (writeErr) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: 'Failed to save reservation' }));
              }

              // Send Reservation Request Received Email
              if (newReservation.payment_status === 'Pending') {
                try {
                  await getEmailService().sendReservationRequestEmail(newReservation);
                } catch (emailErr) {
                  console.error('[REQUEST EMAIL] Failed to send request email:', emailErr.message);
                }
              }

              res.writeHead(201, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              return res.end(JSON.stringify({ success: true, reservation: newReservation }));
            });
          });
        } catch (parseErr) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
        }
      });
      return;
    }

    // DELETE /api/reservations?reference_id=...
    if (req.method === 'DELETE') {
      const refId = parsedUrl.searchParams.get('reference_id');
      if (!refId) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Missing reference_id parameter' }));
      }

      if (db) {
        try {
          await db.query('DELETE FROM reservations WHERE reference_id = ?', [refId]);
        } catch (dbErr) {
          // Continue to JSON update
        }
      }

      fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Failed to read reservations' }));
        }
        let reservations = [];
        try { reservations = JSON.parse(data); } catch (e) { reservations = []; }

        const initialLen = reservations.length;
        reservations = reservations.filter(r => r.reference_id !== refId);

        if (reservations.length === initialLen) {
          res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Reservation not found' }));
        }

        logActivity(
          'Casa Amara Staff',
          'manager@casaamara.ph',
          'Reservation cancelled',
          'Reservations',
          `Cancelled reservation ${refId}.`,
          'SUCCESSFUL'
        );

        fs.writeFile(dataFilePath, JSON.stringify(reservations, null, 2), 'utf8', writeErr => {
          if (writeErr) {
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ error: 'Failed to save update' }));
          }
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ success: true, message: `Reservation ${refId} removed` }));
        });
      });
      return;
    }
  }

  // --- API: Activity Logs (Append-only Manager Access) ---
  if (reqPath === '/api/logs') {
    // GET /api/logs
    if (req.method === 'GET') {
      let logs = [];
      if (db) {
        try {
          const [rows] = await db.query('SELECT * FROM activity_logs ORDER BY id DESC');
          if (rows && rows.length > 0) logs = rows;
        } catch (e) {}
      }

      if (logs.length === 0) {
        const logsPath = path.join(BASE_DIR, 'data', 'activity_logs.json');
        try {
          const raw = fs.readFileSync(logsPath, 'utf8');
          logs = JSON.parse(raw);
        } catch (e) {
          logs = [];
        }
      }

      // Filter query parameters
      const search = (parsedUrl.searchParams.get('search') || '').toLowerCase().trim();
      const actionFilter = (parsedUrl.searchParams.get('action') || 'all').toLowerCase().trim();
      const outcomeFilter = (parsedUrl.searchParams.get('outcome') || 'all').toLowerCase().trim();
      const recordFilter = (parsedUrl.searchParams.get('record') || 'all').toLowerCase().trim();
      const fromDate = parsedUrl.searchParams.get('from');
      const toDate = parsedUrl.searchParams.get('to');

      let filtered = logs.filter(item => {
        if (search) {
          const haystack = `${item.date_time || ''} ${item.user_name || ''} ${item.user_email || ''} ${item.action || ''} ${item.affected_record || ''} ${item.description || ''} ${item.outcome || ''}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        if (actionFilter !== 'all' && (item.action || '').toLowerCase() !== actionFilter) {
          return false;
        }
        if (outcomeFilter !== 'all' && (item.outcome || '').toLowerCase() !== outcomeFilter) {
          return false;
        }
        if (recordFilter !== 'all' && (item.affected_record || '').toLowerCase() !== recordFilter) {
          return false;
        }
        if (fromDate) {
          const itemDt = new Date(item.date_time || item.created_at);
          const fDt = new Date(fromDate);
          if (!isNaN(itemDt) && !isNaN(fDt) && itemDt < fDt) return false;
        }
        if (toDate) {
          const itemDt = new Date(item.date_time || item.created_at);
          const tDt = new Date(toDate);
          tDt.setHours(23, 59, 59, 999);
          if (!isNaN(itemDt) && !isNaN(tDt) && itemDt > tDt) return false;
        }
        return true;
      });

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify(filtered));
    }

    // POST /api/logs (Manual or client event append)
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { user_name, user_email, action, affected_record, description, outcome } = JSON.parse(body || '{}');
          await logActivity(user_name, user_email, action, affected_record, description, outcome || 'SUCCESSFUL');
          res.writeHead(201, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
        }
      });
      return;
    }
  }

  // --- API: Staff Users Management (Manager Only Access) ---
  if (reqPath === '/api/staff-users') {
    const usersPath = path.join(BASE_DIR, 'data', 'users.json');

    // GET /api/staff-users
    if (req.method === 'GET') {
      if (db) {
        try {
          const [rows] = await db.query(
            'SELECT id, username, role, full_name, email, status, last_signin, created_at FROM users ORDER BY id ASC'
          );
          if (rows && rows.length > 0) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify(rows));
          }
        } catch (dbErr) {}
      }

      fs.readFile(usersPath, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Failed to access staff directory' }));
        }
        let usersMap = {};
        try { usersMap = JSON.parse(data); } catch (e) { usersMap = {}; }
        const list = Object.keys(usersMap).map((uname, idx) => {
          const u = usersMap[uname];
          return {
            id: idx + 1,
            username: uname,
            role: u.role || 'Admin',
            full_name: u.full_name || uname,
            email: u.email || `${uname}@casaamara.ph`,
            status: u.status || 'ACTIVE',
            last_signin: u.last_signin || 'Never'
          };
        });
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify(list));
      });
      return;
    }

    // POST /api/staff-users (Add staff member)
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { full_name, email, password, caller_name, caller_email } = JSON.parse(body || '{}');

          if (!full_name || !email || !password) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ error: 'Full name, email address, and temporary password are required' }));
          }

          // Validate password complexity: at least 10 chars with uppercase, lowercase, and a number
          const hasUpper = /[A-Z]/.test(password);
          const hasLower = /[a-z]/.test(password);
          const hasNumber = /[0-9]/.test(password);
          if (password.length < 10 || !hasUpper || !hasLower || !hasNumber) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ 
              error: 'Password must be at least 10 characters with uppercase, lowercase, and a number.' 
            }));
          }

          const emailClean = email.trim().toLowerCase();
          let username = emailClean.split('@')[0].replace(/[^a-z0-9_.-]/g, '');
          if (!username) username = `admin_${Date.now()}`;

          const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
          const role = 'Admin';
          const status = 'ACTIVE';
          const last_signin = 'Never';

          let newId = Date.now();
          if (db) {
            try {
              const [existing] = await db.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, emailClean]);
              if (existing && existing.length > 0) {
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                return res.end(JSON.stringify({ error: 'A staff account with this email address already exists' }));
              }
              const [ins] = await db.query(
                'INSERT INTO users (username, password_hash, role, full_name, email, status, last_signin) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [username, passwordHash, role, full_name.trim(), emailClean, status, last_signin]
              );
              if (ins && ins.insertId) newId = ins.insertId;
            } catch (dbErr) {
              console.error('MySQL insert user error:', dbErr.message);
            }
          }

          fs.readFile(usersPath, 'utf8', (err, data) => {
            let users = {};
            if (!err && data) {
              try { users = JSON.parse(data); } catch (e) { users = {}; }
            }
            users[username] = {
              role,
              full_name: full_name.trim(),
              email: emailClean,
              status,
              last_signin,
              password_hash: passwordHash
            };
            fs.writeFile(usersPath, JSON.stringify(users, null, 2), 'utf8', () => {});
          });

          await logActivity(
            caller_name || 'Casa Amara Manager',
            caller_email || 'manager@casaamara.ph',
            'Staff account created',
            'Staff Directory',
            `Created admin account for ${full_name.trim()} (${emailClean}).`,
            'SUCCESSFUL'
          );

          res.writeHead(201, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({
            success: true,
            user: {
              id: newId,
              username,
              role,
              full_name: full_name.trim(),
              email: emailClean,
              status,
              last_signin
            }
          }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
        }
      });
      return;
    }

    // PUT /api/staff-users (Edit or toggle status)
    if (req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { id, username, status, full_name, email, password, caller_name, caller_email } = JSON.parse(body || '{}');

          let targetRole = '';
          let currentName = full_name || username || id;
          if (db) {
            try {
              const [chk] = await db.query('SELECT role, username, full_name FROM users WHERE id = ? OR username = ?', [id || 0, username || '']);
              if (chk && chk.length > 0) {
                targetRole = chk[0].role || '';
                currentName = chk[0].full_name || chk[0].username;
              }
            } catch (e) {}
          }

          if (targetRole.toLowerCase() === 'manager' || (username && username.toLowerCase() === 'manager')) {
            res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ error: 'Manager access is protected from changes on this page.' }));
          }

          let passwordHash = null;
          if (password && password.trim()) {
            const hasUpper = /[A-Z]/.test(password);
            const hasLower = /[a-z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            if (password.length < 10 || !hasUpper || !hasLower || !hasNumber) {
              res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              return res.end(JSON.stringify({ 
                error: 'New password must be at least 10 characters with uppercase, lowercase, and a number.' 
              }));
            }
            passwordHash = crypto.createHash('sha256').update(password.trim()).digest('hex');
          }

          if (db) {
            try {
              if (status) {
                await db.query('UPDATE users SET status = ? WHERE id = ? OR username = ?', [status, id || 0, username || '']);
              }
              if (full_name) {
                await db.query('UPDATE users SET full_name = ? WHERE id = ? OR username = ?', [full_name.trim(), id || 0, username || '']);
              }
              if (email) {
                await db.query('UPDATE users SET email = ? WHERE id = ? OR username = ?', [email.trim().toLowerCase(), id || 0, username || '']);
              }
              if (passwordHash) {
                await db.query('UPDATE users SET password_hash = ? WHERE id = ? OR username = ?', [passwordHash, id || 0, username || '']);
              }
            } catch (e) {}
          }

          fs.readFile(usersPath, 'utf8', (err, data) => {
            if (!err && data) {
              try {
                let users = JSON.parse(data);
                const uname = username || Object.keys(users).find(k => users[k].email === email || k === username);
                if (uname && users[uname] && users[uname].role !== 'Manager') {
                  if (status) users[uname].status = status;
                  if (full_name) users[uname].full_name = full_name.trim();
                  if (email) users[uname].email = email.trim().toLowerCase();
                  if (passwordHash) users[uname].password_hash = passwordHash;
                  fs.writeFile(usersPath, JSON.stringify(users, null, 2), 'utf8', () => {});
                }
              } catch (e) {}
            }
          });

          await logActivity(
            caller_name || 'Casa Amara Manager',
            caller_email || 'manager@casaamara.ph',
            'Staff status updated',
            'Staff Directory',
            `Updated staff account ${currentName} (Status: ${status || 'Updated'}).`,
            'SUCCESSFUL'
          );

          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ success: true, message: 'Staff member updated' }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Malformed JSON payload' }));
        }
      });
      return;
    }

    // DELETE /api/staff-users?id=...&username=...
    if (req.method === 'DELETE') {
      const id = parsedUrl.searchParams.get('id');
      const username = parsedUrl.searchParams.get('username');

      let targetRole = '';
      let targetName = username || id;
      if (db) {
        try {
          const [chk] = await db.query('SELECT role, username, full_name FROM users WHERE id = ? OR username = ?', [id || 0, username || '']);
          if (chk && chk.length > 0) {
            targetRole = chk[0].role || '';
            targetName = chk[0].full_name || chk[0].username;
          }
        } catch (e) {}
      }

      if (targetRole.toLowerCase() === 'manager' || (username && username.toLowerCase() === 'manager')) {
        res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Manager access is protected from changes on this page.' }));
      }

      if (db) {
        try {
          await db.query('DELETE FROM users WHERE (id = ? OR username = ?) AND LOWER(role) != "manager"', [id || 0, username || '']);
        } catch (e) {}
      }

      fs.readFile(usersPath, 'utf8', (err, data) => {
        if (!err && data) {
          try {
            let users = JSON.parse(data);
            for (const k of Object.keys(users)) {
              if ((k === username || users[k].email === username) && users[k].role !== 'Manager') {
                delete users[k];
              }
            }
            fs.writeFile(usersPath, JSON.stringify(users, null, 2), 'utf8', () => {});
          } catch (e) {}
        }
      });

      await logActivity(
        'Casa Amara Manager',
        'manager@casaamara.ph',
        'Staff account removed',
        'Staff Directory',
        `Removed staff account ${targetName}.`,
        'SUCCESSFUL'
      );

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ success: true, message: 'Staff member removed' }));
    }
  }


/**
 * Generate full SQL dump string from current MySQL database
 */
async function generateDatabaseBackupSql() {
  const dbName = process.env.DB_NAME || 'casa_amara_db';
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').slice(0, 19);

  let sql = '';
  sql += `-- =============================================================================\n`;
  sql += `-- Casa Amara Boutique Hotel — SQL Database Backup\n`;
  sql += `-- Database: ${dbName}\n`;
  sql += `-- Generated: ${dateStr} (Server Local Time)\n`;
  sql += `-- =============================================================================\n\n`;

  sql += `/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;\n`;
  sql += `/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;\n`;
  sql += `/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;\n`;
  sql += `/*!40101 SET NAMES utf8mb4 */;\n`;
  sql += `/*!40014 SET @OLD_TIME_ZONE=@@TIME_ZONE */;\n`;
  sql += `/*!40014 SET TIME_ZONE='+00:00' */;\n`;
  sql += `/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;\n`;
  sql += `/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;\n`;
  sql += `/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;\n\n`;

  sql += `-- Create database if not exists and switch\n`;
  sql += `CREATE DATABASE /*!32312 IF NOT EXISTS*/ \`${dbName}\` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;\n`;
  sql += `USE \`${dbName}\`;\n\n`;

  const mysqlPromise = require('mysql2/promise');
  let conn;
  try {
    conn = await mysqlPromise.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });

    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${dbName}\``);

    // Get all base tables
    const [tables] = await conn.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
    const tableNames = tables.map(t => Object.values(t)[0]);

    if (tableNames.length === 0) {
      sql += `-- (Database currently contains 0 tables)\n\n`;
      sql += `/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;\n`;
      sql += `/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;\n`;
      sql += `/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;\n`;
      sql += `/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;\n`;
      sql += `/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;\n`;
      sql += `/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;\n\n`;
      sql += `-- Dump completed on ${dateStr}\n`;
      return sql;
    }

    // Preferred ordering: parent tables before child tables for creation
    const preferredOrder = ['users', 'activity_logs', 'rooms', 'reservations'];
    tableNames.sort((a, b) => {
      const idxA = preferredOrder.indexOf(a);
      const idxB = preferredOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    // Add safe table drop block at top of dump: drop child tables before parent tables
    sql += `-- Drop tables in reverse-dependency order to eliminate foreign key constraints\n`;
    const reverseOrder = [...tableNames].reverse();
    for (const tName of reverseOrder) {
      sql += `DROP TABLE IF EXISTS \`${tName}\`;\n`;
    }
    sql += `\n`;

    for (const tableName of tableNames) {
      sql += `-- -----------------------------------------------------------------------------\n`;
      sql += `-- Table structure for table \`${tableName}\`\n`;
      sql += `-- -----------------------------------------------------------------------------\n`;
      sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;

      const [createResult] = await conn.query(`SHOW CREATE TABLE \`${tableName}\``);
      const createTableSql = createResult[0]['Create Table'];
      sql += `${createTableSql};\n\n`;

      // Dump records
      sql += `-- Dumping data for table \`${tableName}\`\n`;
      sql += `LOCK TABLES \`${tableName}\` WRITE;\n`;
      sql += `/*!40000 ALTER TABLE \`${tableName}\` DISABLE KEYS */;\n`;

      const [rows, fields] = await conn.query(`SELECT * FROM \`${tableName}\``);

      if (rows && rows.length > 0) {
        const colNames = fields.map(f => `\`${f.name}\``).join(', ');
        sql += `INSERT INTO \`${tableName}\` (${colNames}) VALUES\n`;

        const rowValues = rows.map(row => {
          const values = fields.map(f => {
            const val = row[f.name];
            if (val === null || val === undefined) return 'NULL';
            if (Buffer.isBuffer(val)) {
              return `X'${val.toString('hex')}'`;
            }
            if (typeof val === 'object' && !(val instanceof Date)) {
              return mysql ? mysql.escape(JSON.stringify(val)) : `'${JSON.stringify(val).replace(/'/g, "\\'")}'`;
            }
            return mysql ? mysql.escape(val) : `'${String(val).replace(/'/g, "\\'")}'`;
          });
          return `(${values.join(', ')})`;
        });

        sql += `${rowValues.join(',\n')};\n`;
      } else {
        sql += `-- (Table is currently empty)\n`;
      }

      sql += `/*!40000 ALTER TABLE \`${tableName}\` ENABLE KEYS */;\n`;
      sql += `UNLOCK TABLES;\n\n`;
    }

    sql += `-- Restore environment state\n`;
    sql += `/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;\n`;
    sql += `/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;\n`;
    sql += `/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;\n`;
    sql += `/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;\n`;
    sql += `/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;\n`;
    sql += `/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;\n\n`;
    sql += `-- Dump completed on ${dateStr}\n`;

    return sql;
  } finally {
    if (conn) {
      try { await conn.end(); } catch (e) {}
    }
  }
}


  // =========================================================================
  // API: Download SQL Database Backup (Authorized Staff Only)
  // =========================================================================
  if (reqPath === '/api/database/backup' && req.method === 'GET') {
    const username = (req.headers['x-admin-user'] || parsedUrl.searchParams?.get('username') || parsedUrl.query?.username || '').toString().trim();

    if (!username) {
      res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Authentication required. Please sign in to the management portal.' }));
    }

    let isAuthorized = false;
    let callerFullName = 'Authorized Administrator';
    let callerEmail = 'admin@casaamara.ph';

    // Verify user against MySQL database
    if (db) {
      try {
        const [users] = await db.query(
          'SELECT id, username, full_name, email, role, status FROM users WHERE username = ?',
          [username]
        );
        if (users && users.length > 0) {
          const u = users[0];
          if (u.status === 'ACTIVE' && (u.role === 'Admin' || u.role === 'Manager')) {
            isAuthorized = true;
            callerFullName = u.full_name;
            callerEmail = u.email || `${u.username}@casaamara.ph`;
          }
        }
      } catch (err) {
        console.error('Error verifying backup authorization in MySQL:', err.message);
      }
    }

    // Fallback verification if MySQL was unavailable
    if (!isAuthorized) {
      const usersPath = path.join(__dirname, 'data', 'users.json');
      if (fs.existsSync(usersPath)) {
        try {
          const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
          if (users[username] && users[username].status === 'ACTIVE') {
            isAuthorized = true;
            callerFullName = users[username].full_name;
            callerEmail = users[username].email || `${username}@casaamara.ph`;
          }
        } catch (e) {}
      }
    }

    if (!isAuthorized) {
      await logActivity(
        username,
        `${username}@casaamara.ph`,
        'Database Backup Access Denied',
        'SQL Database',
        `Unauthorized attempt to export database backup by "${username}".`,
        'FAILED'
      );
      res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Access denied: Only active staff administrators or managers may download database backups.' }));
    }

    if (!db) {
      res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'MySQL database is currently offline. Please ensure MySQL is running to generate a database backup.' }));
    }

    try {
      const sqlDump = await generateDatabaseBackupSql();
      const dbName = process.env.DB_NAME || 'casa_amara_db';
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const filename = `${dbName}_backup_${yyyy}-${mm}-${dd}.sql`;

      await logActivity(
        callerFullName,
        callerEmail,
        'Database Backup Downloaded',
        'SQL Database',
        `${callerFullName} downloaded live SQL database backup (${filename}).`,
        'SUCCESSFUL'
      );

      const buffer = Buffer.from(sqlDump, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'application/sql; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Disposition',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      return res.end(buffer);
    } catch (dumpErr) {
      console.error('Error creating database backup:', dumpErr.message);
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Failed to generate database backup: ' + dumpErr.message }));
    }
  }


  // =========================================================================
  // API: Get Database Status & Record Counts (Authorized Staff)
  // =========================================================================
  if (reqPath === '/api/database/info' && req.method === 'GET') {
    const username = (req.headers['x-admin-user'] || parsedUrl.searchParams?.get('username') || parsedUrl.query?.username || '').toString().trim();
    if (!username) {
      res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Authentication required' }));
    }

    const dbName = process.env.DB_NAME || 'casa_amara_db';
    let counts = { rooms: 0, reservations: 0, users: 0, activity_logs: 0 };
    let latestBackupInfo = 'None created yet';
    let totalTablesCount = 0;

    if (db) {
      try {
        const [rCount] = await db.query('SELECT COUNT(*) as c FROM rooms').catch(() => [[{ c: 0 }]]);
        const [resCount] = await db.query('SELECT COUNT(*) as c FROM reservations').catch(() => [[{ c: 0 }]]);
        const [uCount] = await db.query('SELECT COUNT(*) as c FROM users').catch(() => [[{ c: 0 }]]);
        const [lCount] = await db.query('SELECT COUNT(*) as c FROM activity_logs').catch(() => [[{ c: 0 }]]);
        counts = {
          rooms: rCount[0]?.c || 0,
          reservations: resCount[0]?.c || 0,
          users: uCount[0]?.c || 0,
          activity_logs: lCount[0]?.c || 0
        };

        const [tList] = await db.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"').catch(() => [[]]);
        totalTablesCount = tList.length;
      } catch (e) {
        console.error('Error fetching db counts:', e.message);
      }
    }

    // Check data/backups directory for latest snapshot
    try {
      if (fs.existsSync(BACKUPS_DIR)) {
        const files = fs.readdirSync(BACKUPS_DIR)
          .filter(f => f.endsWith('.sql'))
          .map(f => {
            const stat = fs.statSync(path.join(BACKUPS_DIR, f));
            return { filename: f, mtime: stat.mtime, size: stat.size };
          })
          .sort((a, b) => b.mtime - a.mtime);

        if (files.length > 0) {
          const latest = files[0];
          latestBackupInfo = `${latest.filename} (${new Date(latest.mtime).toLocaleDateString()}, ${(latest.size / (1024 * 1024)).toFixed(2)} MB)`;
        }
      }
    } catch (e) {}

    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({
      success: true,
      db_name: dbName,
      total_tables: totalTablesCount || 4,
      total_records: totalRecords,
      tables: counts,
      latest_server_backup: latestBackupInfo,
      server_time: new Date().toISOString()
    }));
  }

  // =========================================================================
  // API: Restore Database from Uploaded SQL File (Manager Only)
  // =========================================================================
  if (reqPath === '/api/database/restore' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const username = (req.headers['x-admin-user'] || '').toString().trim();
        const payload = JSON.parse(body || '{}');
        const rawFilename = (payload.filename || 'backup.sql').toString();
        const safeFilename = path.basename(rawFilename);
        const sqlContent = payload.sql;
        const callerName = payload.caller_name || 'Casa Amara Manager';
        const callerEmail = payload.caller_email || 'manager@casaamara.ph';

        const userToCheck = username || (payload.username || '').toString().trim();

        if (!userToCheck) {
          res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Authentication required. Please sign in as a Manager.' }));
        }

        // Strict Role Permission Check: Only Manager is allowed
        let isManagerUser = false;
        let callerFullName = callerName;
        let callerEmailAddress = callerEmail;

        if (db) {
          try {
            const [users] = await db.query(
              'SELECT id, username, full_name, email, role, status FROM users WHERE username = ?',
              [userToCheck]
            );
            if (users && users.length > 0) {
              const u = users[0];
              const roleLower = (u.role || '').toLowerCase();
              if (u.status === 'ACTIVE' && (roleLower === 'manager' || roleLower === 'hotel manager' || u.username === 'manager')) {
                isManagerUser = true;
                callerFullName = u.full_name;
                callerEmailAddress = u.email || `${u.username}@casaamara.ph`;
              }
            }
          } catch (err) {
            console.warn('Notice: Verifying manager authorization in fallback mode:', err.message);
          }
        }

        // Fallback file check if MySQL was offline or database was dropped
        if (!isManagerUser) {
          const usersPath = path.join(__dirname, 'data', 'users.json');
          if (fs.existsSync(usersPath)) {
            try {
              const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
              const u = users[userToCheck];
              if (u && u.status === 'ACTIVE') {
                const roleLower = (u.role || '').toLowerCase();
                if (roleLower === 'manager' || roleLower === 'hotel manager' || userToCheck === 'manager') {
                  isManagerUser = true;
                  callerFullName = u.full_name;
                  callerEmailAddress = u.email || `${userToCheck}@casaamara.ph`;
                }
              }
            } catch (e) {}
          }
        }

        if (!isManagerUser) {
          await logActivity(
            userToCheck,
            `${userToCheck}@casaamara.ph`,
            'Database Restore Denied',
            'SQL Database',
            `Unauthorized attempt to restore database by user "${userToCheck}". Manager permission required.`,
            'FAILED'
          );
          res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({
            error: 'Forbidden: Database restoration is strictly restricted to Hotel Managers.'
          }));
        }

        // 1. File Validation
        if (!safeFilename.toLowerCase().endsWith('.sql')) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Invalid file format: Only .sql backup files are accepted.' }));
        }

        if (!sqlContent || typeof sqlContent !== 'string' || sqlContent.trim().length < 20) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Uploaded SQL file is empty or contains no valid SQL statements.' }));
        }

        if (sqlContent.length > 30 * 1024 * 1024) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'File size exceeds maximum permitted limit (30 MB).' }));
        }

        // Connect directly to MySQL at server level (even if target database was deleted)
        const mysqlPromise = require('mysql2/promise');
        let restoreConn;
        try {
          restoreConn = await mysqlPromise.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: Number(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            multipleStatements: true
          });
        } catch (connErr) {
          console.error('MySQL server connection failed:', connErr.message);
          res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({
            error: 'MySQL service is offline or unreachable (' + connErr.message + '). Please ensure MySQL is running.'
          }));
        }

        const dbName = process.env.DB_NAME || 'casa_amara_db';
        let safetyBackupFilename = '';
        let safetyBackupPath = '';

        try {
          if (!fs.existsSync(BACKUPS_DIR)) {
            fs.mkdirSync(BACKUPS_DIR, { recursive: true });
          }

          // 2. Ensure target database exists and inspect current tables
          await restoreConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
          await restoreConn.query(`USE \`${dbName}\``);

          const [existingTables] = await restoreConn.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          safetyBackupFilename = `pre_restore_backup_${dbName}_${timestamp}.sql`;
          safetyBackupPath = path.join(BACKUPS_DIR, safetyBackupFilename);

          if (existingTables && existingTables.length > 0) {
            // Database has tables: capture a full safety snapshot of current data
            const preRestoreDump = await generateDatabaseBackupSql();
            fs.writeFileSync(safetyBackupPath, preRestoreDump, 'utf8');
          } else {
            // Database was empty or newly created prior to restore: create a valid safety record marker
            const emptyNotice = `-- =============================================================================\n` +
              `-- Casa Amara Boutique Hotel — Pre-Restoration Safety Record\n` +
              `-- Database: ${dbName}\n` +
              `-- Generated: ${new Date().toISOString()} (Server Local Time)\n` +
              `-- Notice: Target database was empty (0 tables) or newly created prior to this restore.\n` +
              `-- =============================================================================\n`;
            fs.writeFileSync(safetyBackupPath, emptyNotice, 'utf8');
          }

          // 3. Prevent FK / Collation Incompatibility: Drop existing views & tables in target DB
          await restoreConn.query('SET FOREIGN_KEY_CHECKS = 0');

          const [viewsToDrop] = await restoreConn.query('SHOW FULL TABLES WHERE Table_type = "VIEW"').catch(() => [[]]);
          for (const v of viewsToDrop) {
            const vName = Object.values(v)[0];
            await restoreConn.query(`DROP VIEW IF EXISTS \`${vName}\``);
          }

          const [tablesToDrop] = await restoreConn.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"').catch(() => [[]]);
          for (const t of tablesToDrop) {
            const tName = Object.values(t)[0];
            await restoreConn.query(`DROP TABLE IF EXISTS \`${tName}\``);
          }

          // 4. Normalize SQL: redirect ANY database name to our configured dbName
          let normalizedSql = sqlContent;
          // Rewrite USE <db_name>; statements to target active dbName
          normalizedSql = normalizedSql.replace(/\bUSE\s+[`"]?[a-zA-Z0-9_]+[`"]?\s*;/gi, `USE \`${dbName}\`;`);
          // Neutralize CREATE DATABASE statements targeting other databases
          normalizedSql = normalizedSql.replace(/\bCREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?[a-zA-Z0-9_]+[`"]?[^;]*;/gi, `-- [CREATE DATABASE neutralized for target: ${dbName}]`);
          // Neutralize administrative privilege commands that could fail on non-root accounts
          normalizedSql = normalizedSql.replace(/\b(CREATE\s+USER|DROP\s+USER|GRANT\s+ALL|FLUSH\s+PRIVILEGES)[^;]*;/gi, `-- [ADMIN COMMAND COMMENTED OUT]`);

          // 5. Execute Restoration with Foreign Key Safety & Intended DB Scoping
          const scopedExecutionSql = `
            USE \`${dbName}\`;
            SET @OLD_SQL_MODE = @@SQL_MODE, SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
            SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS = 0;
            ${normalizedSql}
            SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
            SET SQL_MODE = @OLD_SQL_MODE;
          `;

          await restoreConn.query(scopedExecutionSql);

          // Get list of restored tables to return in response
          const [restoredTables] = await restoreConn.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"').catch(() => [[]]);
          const restoredTableNames = restoredTables.map(t => Object.values(t)[0]);

          await logActivity(
            callerFullName,
            callerEmailAddress,
            'Database Restored',
            'SQL Database',
            `${callerFullName} restored database from "${safeFilename}". Pre-restoration safety snapshot saved as "${safetyBackupFilename}". Tables restored: ${restoredTableNames.join(', ') || 'All tables'}.`,
            'SUCCESSFUL'
          );

          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({
            success: true,
            message: 'Database successfully restored from ' + safeFilename,
            safety_backup: safetyBackupFilename,
            restored_file: safeFilename,
            tables_restored: restoredTableNames
          }));
        } catch (execErr) {
          console.error('Error during database restoration execution:', execErr.message);

          await logActivity(
            callerFullName,
            callerEmailAddress,
            'Database Restore Error',
            'SQL Database',
            `Restoration from "${safeFilename}" encountered an error: ${execErr.message}. Pre-restoration safety backup is preserved as "${safetyBackupFilename}".`,
            'FAILED'
          );

          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({
            error: 'Database restoration failed during SQL execution: ' + execErr.message,
            safety_backup: safetyBackupFilename,
            safety_backup_preserved: true
          }));
        } finally {
          if (restoreConn) {
            try { await restoreConn.end(); } catch (e) {}
          }
        }
      } catch (parseErr) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Invalid JSON request payload: ' + parseErr.message }));
      }
    });
    return;
  }

  // --- Static Files Handling ---
  const safePath = path.normalize(path.join(BASE_DIR, reqPath));
  if (!safePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(safePath).pipe(res);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERROR] Port ${PORT} is already in use by another process.`);
    console.error(`Possible solutions:`);
    console.error(` 1. Stop the process currently using port ${PORT}.`);
    console.error(`    In PowerShell: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force`);
    console.error(` 2. Change the PORT in .env (e.g. PORT=3001).\n`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Casa Amara server running at http://localhost:${PORT}`);
});
