/**
 * Casa Amara Boutique Hotel - Admin & Room Inventory Publishing Engine
 * Industry Best Practices Property Management System (PMS)
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let allRooms = [];
  let allReservations = [];
  let currentUser = null;
  let activeTab = 'rooms';

  // DOM Elements
  const loginOverlay = document.getElementById('loginOverlay');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const userPill = document.getElementById('userPill');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const btnSignOut = document.getElementById('btnSignOut');

  const kpiTotalRooms = document.getElementById('kpiTotalRooms');
  const kpiAvailableUnits = document.getElementById('kpiAvailableUnits');
  const kpiMaintenanceRooms = document.getElementById('kpiMaintenanceRooms');
  const kpiTotalReservations = document.getElementById('kpiTotalReservations');

  const roomsContainer = document.getElementById('roomsContainer');
  const reservationsContainer = document.getElementById('reservationsContainer');
  const reservationsTableBody = document.getElementById('reservationsTableBody');
  const reportsContainer = document.getElementById('reportsContainer');
  const backupContainer = document.getElementById('backupContainer');
  const adminHeaderRow = document.querySelector('.admin-header-row');
  const adminKpiGrid = document.querySelector('.admin-kpi-grid');
  const adminToolbar = document.querySelector('.admin-toolbar');
  const btnRefreshReports = document.getElementById('btnRefreshReports');

  // Manager Only DOM References
  const logsContainer = document.getElementById('logsContainer');
  const logsTableBody = document.getElementById('logsTableBody');
  const logsEmptyState = document.getElementById('logsEmptyState');
  const logSearchInput = document.getElementById('logSearchInput');
  const logActionFilter = document.getElementById('logActionFilter');
  const logOutcomeFilter = document.getElementById('logOutcomeFilter');
  const logDateFrom = document.getElementById('logDateFrom');
  const logDateTo = document.getElementById('logDateTo');

  const staffContainer = document.getElementById('staffContainer');
  const staffTableBody = document.getElementById('staffTableBody');
  const staffEmptyState = document.getElementById('staffEmptyState');
  const staffSearchInput = document.getElementById('staffSearchInput');
  const staffRoleFilter = document.getElementById('staffRoleFilter');
  const addStaffForm = document.getElementById('addStaffForm');

  const editStaffModalBackdrop = document.getElementById('editStaffModalBackdrop');
  const editStaffForm = document.getElementById('editStaffForm');
  const btnCloseEditStaffModal = document.getElementById('btnCloseEditStaffModal');
  const btnCancelEditStaffModal = document.getElementById('btnCancelEditStaffModal');

  const deleteStaffModalBackdrop = document.getElementById('deleteStaffModalBackdrop');
  const deleteStaffConfirmText = document.getElementById('deleteStaffConfirmText');
  const btnCancelDeleteStaff = document.getElementById('btnCancelDeleteStaff');
  const btnConfirmDeleteStaff = document.getElementById('btnConfirmDeleteStaff');
  let pendingDeleteUser = null;

  const roomSearchInput = document.getElementById('roomSearchInput');
  const roomCategoryFilter = document.getElementById('roomCategoryFilter');
  const roomFloorFilter = document.getElementById('roomFloorFilter');
  const roomNumberFilter = document.getElementById('roomNumberFilter');

  const resSearchInput = document.getElementById('resSearchInput');
  const resSortSelect = document.getElementById('resSortSelect');
  const resRoomTypeFilter = document.getElementById('resRoomTypeFilter');
  const resRoomNumberFilter = document.getElementById('resRoomNumberFilter');

  const roomModalBackdrop = document.getElementById('roomModalBackdrop');
  const roomForm = document.getElementById('roomForm');
  const modalTitle = document.getElementById('modalTitle');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const btnOpenPostModal = document.getElementById('btnOpenPostModal');

  const adminToast = document.getElementById('adminToast');
  const toastMessage = document.getElementById('toastMessage');

  const tabButtons = document.querySelectorAll('.admin-tab-btn');

  // --- Role & Permissions Management ---
  function isManager() {
    if (!currentUser) return false;
    const r = (currentUser.role || '').toLowerCase();
    const u = (currentUser.username || '').toLowerCase();
    return r === 'manager' || r === 'hotel manager' || u === 'manager';
  }

  function updateRoleVisibility() {
    const managerTabs = document.querySelectorAll('.manager-only-tab');
    const databaseRestoreSection = document.getElementById('databaseRestoreSection');
    const restoreRestrictedNotice = document.getElementById('restoreRestrictedNotice');

    if (isManager()) {
      managerTabs.forEach(tab => {
        tab.style.display = 'inline-block';
      });
      if (databaseRestoreSection) databaseRestoreSection.style.display = 'block';
      if (restoreRestrictedNotice) restoreRestrictedNotice.style.display = 'none';
    } else {
      managerTabs.forEach(tab => {
        tab.style.display = 'none';
      });
      if (databaseRestoreSection) databaseRestoreSection.style.display = 'none';
      if (restoreRestrictedNotice) restoreRestrictedNotice.style.display = 'flex';
      // If currently on a manager-restricted tab, immediately switch to rooms
      if (activeTab === 'logs' || activeTab === 'staff') {
        switchTab('rooms');
      }
    }
  }

  // --- Toast Feedback ---
  function showToast(msg) {
    if (!adminToast || !toastMessage) return;
    toastMessage.textContent = msg;
    adminToast.classList.add('show');
    setTimeout(() => {
      adminToast.classList.remove('show');
    }, 3800);
  }

  // --- Authentication ---
  function checkAuth() {
    const sessionUser = sessionStorage.getItem('casa_amara_admin_user');
    if (sessionUser) {
      try {
        currentUser = JSON.parse(sessionUser);
        if (loginOverlay) loginOverlay.style.display = 'none';
        if (userNameDisplay) userNameDisplay.textContent = `${currentUser.full_name} (${currentUser.role})`;
        updateRoleVisibility();
        loadData();
      } catch (e) {
        showLogin();
      }
    } else {
      showLogin();
    }
  }

  function showLogin() {
    if (loginOverlay) loginOverlay.style.display = 'flex';
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.style.display = 'none';
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value.trim();

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          currentUser = data.user;
          sessionStorage.setItem('casa_amara_admin_user', JSON.stringify(currentUser));
          loginOverlay.style.display = 'none';
          if (userNameDisplay) userNameDisplay.textContent = `${currentUser.full_name} (${currentUser.role})`;
          updateRoleVisibility();
          showToast(`Welcome back, ${currentUser.full_name}`);
          loadData();
        } else {
          loginError.textContent = data.error || 'Invalid credentials';
          loginError.style.display = 'block';
        }
      } catch (err) {
        loginError.textContent = 'Network or server error occurred.';
        loginError.style.display = 'block';
      }
    });
  }

  if (btnSignOut) {
    btnSignOut.addEventListener('click', () => {
      sessionStorage.removeItem('casa_amara_admin_user');
      currentUser = null;
      updateRoleVisibility();
      showLogin();
      showToast('Signed out successfully.');
    });
  }

  // --- Data Loading ---
  async function loadData() {
    await Promise.all([fetchRooms(), fetchReservations()]);
    updateKpis();
    updateRoomFilterDropdowns();
    updateReservationFilterDropdowns();
    if (window.initAllLuxurySelects) window.initAllLuxurySelects();
    renderRooms();
    renderReservations();
    renderReports();
  }

  function resolveRoomImage(img) {
    if (!img) return 'assets/images/deluxe-room.jpg';
    if (typeof img === 'string') return img;
    if (typeof img === 'object' && Array.isArray(img.data)) {
      try {
        const decoded = new TextDecoder('utf-8').decode(new Uint8Array(img.data));
        if (decoded && (decoded.startsWith('assets/') || decoded.startsWith('data:') || decoded.startsWith('http') || decoded.startsWith('/'))) {
          return decoded;
        }
      } catch (e) {
        // Fallback
      }
    }
    return 'assets/images/deluxe-room.jpg';
  }

  async function fetchRooms() {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const rawRooms = await res.json();
        allRooms = (rawRooms || []).map(r => ({
          ...r,
          image: resolveRoomImage(r.image)
        }));
      }
    } catch (e) {
      console.error('Failed to load rooms:', e);
    }
  }

  async function fetchReservations() {
    try {
      const res = await fetch('/api/reservations');
      if (res.ok) {
        allReservations = await res.json();
      }
    } catch (e) {
      console.error('Failed to load reservations:', e);
    }
  }

  // --- KPI Updates ---
  function updateKpis() {
    if (kpiTotalRooms) kpiTotalRooms.textContent = allRooms.length;

    const availableUnits = allRooms.reduce((acc, r) => acc + (r.status === 'available' ? (r.available_units || 0) : 0), 0);
    if (kpiAvailableUnits) kpiAvailableUnits.textContent = availableUnits;

    const maintenanceRooms = allRooms.filter(r => r.status === 'maintenance').length;
    if (kpiMaintenanceRooms) kpiMaintenanceRooms.textContent = maintenanceRooms;

    if (kpiTotalReservations) kpiTotalReservations.textContent = allReservations.length;
  }

  // Helper to extract discrete room numbers from strings, ranges (e.g., "101 - 108"), or lists
  function extractIndividualRoomNumbers(roomNumberStr) {
    if (!roomNumberStr || typeof roomNumberStr !== 'string') return [];
    const str = roomNumberStr.trim();
    const results = new Set();

    const parts = str.split(/[,;/]+/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Handle range formats like "101 - 108", "101-108", "101 to 108"
      const rangeMatch = trimmed.match(/^(\d+)\s*(?:-|–|—|to)\s*(\d+)$/i);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        if (!isNaN(start) && !isNaN(end) && start <= end && (end - start) <= 100) {
          const padLen = rangeMatch[1].length;
          for (let i = start; i <= end; i++) {
            results.add(String(i).padStart(padLen, '0'));
          }
          continue;
        }
      }

      // Standalone numbers or room names (e.g. "302", "Villa 1")
      const cleanNum = trimmed.replace(/^Room\s+/i, '').trim();
      if (cleanNum) {
        results.add(cleanNum);
      }
    }

    return Array.from(results);
  }

  // --- Room Filter Dropdowns Population ---
  function updateRoomFilterDropdowns() {
    // 1. Category Filter Dropdown
    if (roomCategoryFilter) {
      const currentCat = roomCategoryFilter.value;
      const categories = [...new Set(allRooms.map(r => r.category || r.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      roomCategoryFilter.replaceChildren();
      const allCatOpt = document.createElement('option');
      allCatOpt.value = 'all';
      allCatOpt.textContent = 'All Categories';
      roomCategoryFilter.appendChild(allCatOpt);
      categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        roomCategoryFilter.appendChild(opt);
      });
      if (currentCat && (currentCat === 'all' || categories.includes(currentCat))) {
        roomCategoryFilter.value = currentCat;
      } else {
        roomCategoryFilter.value = 'all';
      }
    }

    // 2. Floor Filter Dropdown (All 20 Floors)
    if (roomFloorFilter) {
      const currentFloor = roomFloorFilter.value;
      const HS = window.HotelStructure;
      const all20Floors = HS ? HS.HOTEL_FLOORS.map(f => f.name) : [];
      const existingFloors = [...new Set(allRooms.map(r => r.floor_number).filter(Boolean))];
      const floorsList = all20Floors.length > 0 ? all20Floors : existingFloors;

      roomFloorFilter.replaceChildren();
      const allFloorOpt = document.createElement('option');
      allFloorOpt.value = 'all';
      allFloorOpt.textContent = 'All Floors';
      roomFloorFilter.appendChild(allFloorOpt);

      floorsList.forEach(floorName => {
        const opt = document.createElement('option');
        opt.value = floorName;
        opt.textContent = floorName;
        roomFloorFilter.appendChild(opt);
      });

      if (currentFloor && (currentFloor === 'all' || floorsList.includes(currentFloor))) {
        roomFloorFilter.value = currentFloor;
      } else {
        roomFloorFilter.value = 'all';
      }
    }

    // 3. Room Number Filter Dropdown (Individual Numbers e.g. Room 101, Room 102...)
    if (roomNumberFilter) {
      const currentRoomNo = roomNumberFilter.value;
      const allExtractedNumbers = new Set();
      allRooms.forEach(r => {
        extractIndividualRoomNumbers(r.room_number).forEach(num => allExtractedNumbers.add(num));
      });
      const roomNumbers = Array.from(allExtractedNumbers).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      roomNumberFilter.replaceChildren();
      const allRoomOpt = document.createElement('option');
      allRoomOpt.value = 'all';
      allRoomOpt.textContent = 'All Rooms';
      roomNumberFilter.appendChild(allRoomOpt);
      roomNumbers.forEach(rn => {
        const opt = document.createElement('option');
        opt.value = rn;
        opt.textContent = rn.toLowerCase().startsWith('room') ? rn : `Room ${rn}`;
        roomNumberFilter.appendChild(opt);
      });
      if (currentRoomNo && (currentRoomNo === 'all' || roomNumbers.includes(currentRoomNo))) {
        roomNumberFilter.value = currentRoomNo;
      } else {
        roomNumberFilter.value = 'all';
      }
    }
  }

  // Helper to parse numeric part of room number for natural numerical sorting
  function parseRoomNumber(numStr) {
    if (!numStr) return 0;
    const match = String(numStr).match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  // Helper to resolve a reservation's assigned room number consistently
  function getReservationRoomNumber(res) {
    let assignedRoomNumber = res.room_number || '';
    if (!assignedRoomNumber && allRooms && allRooms.length > 0) {
      const matchingRoom = allRooms.find(r => r.id === res.room_type_id || r.name === res.room_name);
      if (matchingRoom && matchingRoom.room_number) {
        const discrete = extractIndividualRoomNumbers(matchingRoom.room_number);
        assignedRoomNumber = discrete[0] || matchingRoom.room_number;
      }
    }
    if (!assignedRoomNumber) assignedRoomNumber = '101';
    return assignedRoomNumber.replace(/^Room\s+/i, '').trim();
  }

  // --- Reservation Filter Dropdowns Population ---
  function updateReservationFilterDropdowns() {
    // 1. Room Type Filter Dropdown
    if (resRoomTypeFilter) {
      const currentType = resRoomTypeFilter.value;
      const typesSet = new Set();
      (allReservations || []).forEach(r => {
        if (r.room_name) typesSet.add(r.room_name.trim());
      });
      (allRooms || []).forEach(r => {
        if (r.name) typesSet.add(r.name.trim());
      });
      const types = Array.from(typesSet).sort((a, b) => a.localeCompare(b));

      resRoomTypeFilter.replaceChildren();
      const allOpt = document.createElement('option');
      allOpt.value = 'all';
      allOpt.textContent = 'All Room Types';
      resRoomTypeFilter.appendChild(allOpt);

      types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        resRoomTypeFilter.appendChild(opt);
      });

      if (currentType && (currentType === 'all' || types.includes(currentType))) {
        resRoomTypeFilter.value = currentType;
      } else {
        resRoomTypeFilter.value = 'all';
      }
    }

    // 2. Room Number Filter Dropdown
    if (resRoomNumberFilter) {
      const currentRoomNo = resRoomNumberFilter.value;
      const roomNumSet = new Set();
      (allReservations || []).forEach(r => {
        const num = getReservationRoomNumber(r);
        if (num) roomNumSet.add(num);
      });
      (allRooms || []).forEach(r => {
        extractIndividualRoomNumbers(r.room_number).forEach(num => roomNumSet.add(num));
      });
      const roomNumbers = Array.from(roomNumSet).sort((a, b) => {
        const numA = parseRoomNumber(a);
        const numB = parseRoomNumber(b);
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b, undefined, { numeric: true });
      });

      resRoomNumberFilter.replaceChildren();
      const allRoomOpt = document.createElement('option');
      allRoomOpt.value = 'all';
      allRoomOpt.textContent = 'All Rooms';
      resRoomNumberFilter.appendChild(allRoomOpt);

      roomNumbers.forEach(rn => {
        const opt = document.createElement('option');
        opt.value = rn;
        opt.textContent = rn.toLowerCase().startsWith('room') || rn.toLowerCase().startsWith('villa') ? rn : `Room ${rn}`;
        resRoomNumberFilter.appendChild(opt);
      });

      if (currentRoomNo && (currentRoomNo === 'all' || roomNumbers.includes(currentRoomNo))) {
        resRoomNumberFilter.value = currentRoomNo;
      } else {
        resRoomNumberFilter.value = 'all';
      }
    }
  }

  // --- Render Rooms ---
  function renderRooms() {
    if (!roomsContainer) return;
    const query = (roomSearchInput?.value || '').toLowerCase().trim();
    const categoryFilter = roomCategoryFilter?.value || 'all';
    const floorFilter = roomFloorFilter?.value || 'all';
    const roomNumberFilterVal = roomNumberFilter?.value || 'all';

    const filtered = allRooms.filter(room => {
      // 1. Text Search matching (name, tagline, bedding, room number, floor, view, specs)
      const matchesSearch = !query ||
        room.name.toLowerCase().includes(query) ||
        (room.tagline || '').toLowerCase().includes(query) ||
        (room.bed_config || '').toLowerCase().includes(query) ||
        (room.room_number || '').toLowerCase().includes(query) ||
        (room.floor_number || '').toLowerCase().includes(query) ||
        (room.view || '').toLowerCase().includes(query) ||
        (room.badge || '').toLowerCase().includes(query);

      // 2. Category Filter matching
      let matchesCategory = true;
      if (categoryFilter !== 'all') {
        const catFilterLower = categoryFilter.toLowerCase();
        const roomNameLower = (room.name || '').toLowerCase();
        const roomCatLower = (room.category || '').toLowerCase();
        matchesCategory = roomNameLower === catFilterLower ||
          roomCatLower === catFilterLower ||
          roomNameLower.includes(catFilterLower) ||
          (room.id && room.id.toLowerCase() === catFilterLower);
      }

      // 3. Floor Number Filter matching
      let matchesFloor = true;
      if (floorFilter !== 'all') {
        const floorLower = (room.floor_number || '').toLowerCase();
        const selectedFloorLower = floorFilter.toLowerCase();
        matchesFloor = floorLower === selectedFloorLower || floorLower.includes(selectedFloorLower);
      }

      // 4. Room Number Filter matching (checks if room's unit range/list contains the selected room number)
      let matchesRoomNumber = true;
      if (roomNumberFilterVal !== 'all') {
        const cleanSelected = roomNumberFilterVal.replace(/^Room\s+/i, '').trim().toLowerCase();
        const discreteNumbers = extractIndividualRoomNumbers(room.room_number);
        if (discreteNumbers.length > 0) {
          matchesRoomNumber = discreteNumbers.some(n => n.toLowerCase() === cleanSelected);
        } else {
          const roomNoLower = (room.room_number || '').toLowerCase();
          matchesRoomNumber = roomNoLower === cleanSelected || roomNoLower.includes(cleanSelected);
        }
      }

      return matchesSearch && matchesCategory && matchesFloor && matchesRoomNumber;
    });

    if (filtered.length === 0) {
      roomsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; background: #fff; border-radius: 8px; padding: 3rem; text-align: center; border: 1px dashed var(--ca-border-subtle);">
          <p style="font-family: var(--font-serif); font-size: 1.5rem; color: var(--ca-espresso); margin-bottom: 0.5rem;">No rooms match criteria</p>
          <p style="font-size: 0.9rem; color: var(--ca-text-muted); margin-bottom: 1.25rem;">Try adjusting your category, floor, or room number filter.</p>
          <button type="button" class="btn-secondary-action" id="btnResetRoomFilters" style="padding: 0.55rem 1.4rem; font-size: 0.85rem;">Reset All Filters</button>
        </div>
      `;
      const btnReset = document.getElementById('btnResetRoomFilters');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          if (roomSearchInput) roomSearchInput.value = '';
          if (roomCategoryFilter) roomCategoryFilter.value = 'all';
          if (roomFloorFilter) roomFloorFilter.value = 'all';
          if (roomNumberFilter) roomNumberFilter.value = 'all';
          renderRooms();
        });
      }
      return;
    }

    roomsContainer.innerHTML = filtered.map(room => {
      const isAvail = room.status === 'available';
      const isMaint = room.status === 'maintenance';
      const statusClass = isAvail ? 'status-badge-available' :
        isMaint ? 'status-badge-maintenance' : 'status-badge-soldout';
      const statusText = isAvail ? '● Available' :
        isMaint ? '▲ Maintenance' : '✕ Sold Out';

      const pctUnits = room.inventory_units > 0 ? Math.round(((room.available_units || 0) / room.inventory_units) * 100) : 0;

      // Clean size to only meter squared
      const cleanSize = (room.room_size || '40 m²').split('/')[0].trim();

      return `
        <div class="admin-room-card" data-room-id="${room.id}">
          <div class="admin-room-media">
            <img src="${room.image || 'assets/images/deluxe-room.jpg'}" alt="${room.name}" />
            ${room.badge ? `<span class="room-badge-overlay">${room.badge}</span>` : ''}
            <span class="room-status-badge ${statusClass}">${statusText}</span>
          </div>
          
          <div class="admin-room-content">
            <!-- Header: Title & Nightly Rate -->
            <div class="admin-room-header">
              <div class="admin-room-title-block">
                <h3 class="admin-room-name">${room.name}</h3>
                ${(room.room_number || room.floor_number) ? `
                  <div style="display:inline-flex; align-items:center; gap:0.4rem; font-size:0.78rem; font-weight:600; color:var(--ca-gold); margin-top:0.25rem;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    <span>${room.room_number ? `Room ${room.room_number}` : ''}${room.room_number && room.floor_number ? ' · ' : ''}${room.floor_number || ''}</span>
                  </div>
                ` : ''}
                ${room.featured ? '<span class="room-featured-tag" style="margin-top:0.25rem;"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Featured on Home</span>' : ''}
              </div>
              <div class="admin-room-rate-block">
                <span class="rate-amount">₱${Number(room.rate_per_night).toLocaleString()}</span>
                <span class="rate-period">/ night</span>
              </div>
            </div>

            <!-- Tagline -->
            <p class="admin-room-tagline">${room.tagline || 'Boutique accommodations tailored for serenity and luxury.'}</p>
            
            <!-- Organized 2x2 Specs Matrix -->
            <div class="admin-room-specs-matrix">
              <div class="spec-matrix-cell" title="Maximum Capacity">
                <span class="matrix-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </span>
                <span class="matrix-text">Up to ${room.max_guests} Guests</span>
              </div>
              <div class="spec-matrix-cell" title="Bed Configuration">
                <span class="matrix-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>
                </span>
                <span class="matrix-text">${room.bed_config || '1 King Bed'}</span>
              </div>
              <div class="spec-matrix-cell" title="Room Dimensions">
                <span class="matrix-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18"></path><path d="M9 21V9"></path></svg>
                </span>
                <span class="matrix-text">${cleanSize}</span>
              </div>
              <div class="spec-matrix-cell" title="Room View">
                <span class="matrix-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 4 13V9a7 7 0 0 1 7-7 7 7 0 0 1 7 7v4a7 7 0 0 1-7 7z"></path><path d="M11 20v-9"></path></svg>
                </span>
                <span class="matrix-text">${room.view || 'Courtyard View'}</span>
              </div>
            </div>

            <!-- Organized Inventory Status Card (Clean Text Only) -->
            <div class="admin-room-inventory-card">
              <span class="inv-label">Inventory Status</span>
              <span class="inv-stats"><strong>${room.available_units || 0}</strong> of ${room.inventory_units} Available</span>
            </div>

            <!-- Organized 2-Tier Actions (Prevents Awkward Text Wrapping) -->
            <div class="admin-room-actions-organized">
              <button class="btn-card-primary" onclick="window.editRoom('${room.id}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>Edit Room Details</span>
              </button>
              <div class="admin-room-actions-row">
                <button class="btn-card-secondary ${isMaint ? 'is-in-maintenance' : ''}" onclick="window.toggleRoomStatus('${room.id}')">
                  ${isAvail
          ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg><span>Set Maintenance</span>'
          : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Set Available</span>'}
                </button>
                <button class="btn-card-danger" onclick="window.deleteRoom('${room.id}')" data-room-id="${room.id}">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>Unpublish</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Render Reservations ---
  function renderReservations() {
    if (!reservationsTableBody) return;
    if (!allReservations || allReservations.length === 0) {
      reservationsTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--ca-text-muted);">
            No guest reservations found.
          </td>
        </tr>
      `;
      return;
    }

    const query = (resSearchInput?.value || '').toLowerCase().trim();
    const sortVal = resSortSelect?.value || 'room-type-asc';
    const typeFilter = resRoomTypeFilter?.value || 'all';
    const roomNumFilter = resRoomNumberFilter?.value || 'all';

    // 1. Filtering
    const filtered = allReservations.filter(res => {
      const roomNum = getReservationRoomNumber(res);
      const roomName = (res.room_name || '').toLowerCase();
      const guestName = (res.guest_name || '').toLowerCase();
      const email = (res.email || '').toLowerCase();
      const refId = (res.reference_id || '').toLowerCase();
      const status = (res.payment_status || '').toLowerCase();

      // Search matching (guest name, email, ref ID, room name, room number, status)
      const matchesSearch = !query ||
        guestName.includes(query) ||
        email.includes(query) ||
        refId.includes(query) ||
        roomName.includes(query) ||
        roomNum.toLowerCase().includes(query) ||
        `room ${roomNum}`.toLowerCase().includes(query) ||
        status.includes(query);

      // Room Type matching
      let matchesType = true;
      if (typeFilter !== 'all') {
        const selLower = typeFilter.toLowerCase();
        matchesType = roomName === selLower ||
          (res.room_type_id && res.room_type_id.toLowerCase() === selLower);
      }

      // Room Number matching
      let matchesRoomNum = true;
      if (roomNumFilter !== 'all') {
        const cleanSelected = roomNumFilter.replace(/^Room\s+/i, '').trim().toLowerCase();
        matchesRoomNum = roomNum.toLowerCase() === cleanSelected;
      }

      return matchesSearch && matchesType && matchesRoomNum;
    });

    // 2. Sorting
    filtered.sort((a, b) => {
      const roomNumA = getReservationRoomNumber(a);
      const roomNumB = getReservationRoomNumber(b);
      const roomTypeA = (a.room_name || '').toLowerCase();
      const roomTypeB = (b.room_name || '').toLowerCase();

      switch (sortVal) {
        case 'room-type-asc': {
          const cmp = roomTypeA.localeCompare(roomTypeB);
          if (cmp !== 0) return cmp;
          return parseRoomNumber(roomNumA) - parseRoomNumber(roomNumB);
        }
        case 'room-type-desc': {
          const cmp = roomTypeB.localeCompare(roomTypeA);
          if (cmp !== 0) return cmp;
          return parseRoomNumber(roomNumB) - parseRoomNumber(roomNumA);
        }
        case 'room-num-asc': {
          const numA = parseRoomNumber(roomNumA);
          const numB = parseRoomNumber(roomNumB);
          if (numA !== numB) return numA - numB;
          return roomNumA.localeCompare(roomNumB, undefined, { numeric: true });
        }
        case 'room-num-desc': {
          const numA = parseRoomNumber(roomNumA);
          const numB = parseRoomNumber(roomNumB);
          if (numA !== numB) return numB - numA;
          return roomNumB.localeCompare(roomNumA, undefined, { numeric: true });
        }
        case 'date-asc': {
          const timeA = new Date(a.check_in).getTime() || 0;
          const timeB = new Date(b.check_in).getTime() || 0;
          return timeA - timeB;
        }
        case 'date-desc': {
          const timeA = new Date(a.check_in).getTime() || 0;
          const timeB = new Date(b.check_in).getTime() || 0;
          return timeB - timeA;
        }
        case 'guest-name': {
          return (a.guest_name || '').localeCompare(b.guest_name || '');
        }
        case 'amount-desc': {
          return Number(b.total_amount || 0) - Number(a.total_amount || 0);
        }
        case 'amount-asc': {
          return Number(a.total_amount || 0) - Number(b.total_amount || 0);
        }
        default:
          return 0;
      }
    });

    if (filtered.length === 0) {
      reservationsTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 3rem 1.5rem; color: var(--ca-text-muted);">
            <div style="font-family: var(--font-serif); font-size: 1.35rem; color: var(--ca-espresso); margin-bottom: 0.35rem;">No matching reservations found</div>
            <div style="font-size: 0.85rem; margin-bottom: 1.1rem;">Try clearing your search query or adjusting your room type / room number filters.</div>
            <button type="button" class="btn-secondary-action" id="btnResetResFilters" style="padding: 0.45rem 1.3rem; font-size: 0.82rem; border-radius: 999px; cursor: pointer;">Reset All Filters</button>
          </td>
        </tr>
      `;
      const btnReset = document.getElementById('btnResetResFilters');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          if (resSearchInput) resSearchInput.value = '';
          if (resSortSelect) resSortSelect.value = 'room-type-asc';
          if (resRoomTypeFilter) resRoomTypeFilter.value = 'all';
          if (resRoomNumberFilter) resRoomNumberFilter.value = 'all';
          renderReservations();
        });
      }
      return;
    }

    reservationsTableBody.innerHTML = filtered.map(res => {
      const assignedNum = getReservationRoomNumber(res);
      const cleanDisplayNum = assignedNum.toLowerCase().startsWith('room') || assignedNum.toLowerCase().startsWith('villa')
        ? assignedNum
        : `Room ${assignedNum}`;

      const rawStatus = (res.payment_status || 'Pending').trim();
      const statusLower = rawStatus.toLowerCase();
      let statusClass = 'pending';
      let statusDisplay = rawStatus;

      if (statusLower === 'approved') {
        statusClass = 'approved';
        statusDisplay = 'Approved';
      } else if (statusLower === 'rejected') {
        statusClass = 'rejected';
        statusDisplay = 'Rejected';
      } else if (statusLower.includes('cancel')) {
        statusClass = 'cancelled';
        statusDisplay = 'Cancelled';
      } else if (statusLower.includes('deposit') || statusLower.includes('paid')) {
        statusClass = 'approved';
      }

      let actionsHtml = '';
      if (statusLower === 'pending') {
        actionsHtml = `
          <div class="res-actions-btn-group">
            <button type="button" class="btn-res-action btn-approve-res" onclick="window.approveReservation('${res.reference_id}')" title="Approve Reservation">Approve</button>
            <button type="button" class="btn-res-action btn-reject-res" onclick="window.openRejectModal('${res.reference_id}')" title="Reject Reservation">Reject</button>
          </div>
        `;
      } else if (statusLower === 'rejected') {
        actionsHtml = `
          <div class="res-actions-btn-group">
            <button type="button" class="btn-res-action btn-cancel-res btn-cancel-reservation" onclick="window.cancelReservation('${res.reference_id}')">Cancel</button>
            ${res.rejection_reason ? `<button type="button" class="btn-res-action btn-view-reason" onclick="window.viewRejectionReason('${res.reference_id}')">Reason</button>` : ''}
          </div>
        `;
      } else {
        actionsHtml = `
          <div class="res-actions-btn-group">
            <button type="button" class="btn-res-action btn-cancel-res btn-cancel-reservation" onclick="window.cancelReservation('${res.reference_id}')">Cancel</button>
          </div>
        `;
      }

      return `
        <tr>
          <td class="res-col-ref-id"><strong style="font-family: monospace; color: var(--ca-espresso); font-size: 0.84rem;">${res.reference_id}</strong></td>
          <td class="res-col-guest">
            <strong>${res.guest_name}</strong>
            <span class="guest-email" data-email="${res.email}" title="Click to copy: ${res.email}">${res.email}</span>
          </td>
          <td class="res-col-room">
            <strong>${res.room_name}</strong>
            <span class="room-guests-sub">${res.guests} Guests</span>
          </td>
          <td class="res-col-room-no">
            <span class="reservation-room-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              ${cleanDisplayNum}
            </span>
          </td>
          <td class="res-col-stay-dates">
            <span class="stay-dates-line">
              <strong class="stay-dates-range">${res.check_in} → ${res.check_out}</strong>
              <span class="stay-nights-badge">(${res.nights} ${res.nights === 1 ? 'Night' : 'Nights'})</span>
            </span>
          </td>
          <td class="res-col-amount"><strong>₱${Number(res.total_amount || 0).toLocaleString()}</strong></td>
          <td class="res-col-status">
            <span class="res-status-badge status-${statusClass}">
              ${statusDisplay}
            </span>
          </td>
          <td class="res-col-actions">
            ${actionsHtml}
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- Global Window Actions ---
  window.editRoom = function (roomId) {
    const room = allRooms.find(r => r.id === roomId);
    if (!room) return;

    modalTitle.textContent = `Edit Room: ${room.name}`;
    document.getElementById('roomId').value = room.id;
    document.getElementById('roomName').value = room.name;
    document.getElementById('roomTagline').value = room.tagline || '';
    document.getElementById('roomRate').value = room.rate_per_night;
    document.getElementById('roomMaxGuests').value = room.max_guests;
    document.getElementById('roomTotalUnits').value = room.inventory_units;
    document.getElementById('roomAvailUnits').value = room.available_units !== undefined ? room.available_units : room.inventory_units;
    document.getElementById('roomBedConfig').value = room.bed_config || '';
    if (document.getElementById('roomNumber')) document.getElementById('roomNumber').value = room.room_number || '';
    const floorSelect = document.getElementById('floorNumber');
    if (floorSelect) {
      const targetFloor = room.floor_number || '';
      floorSelect.value = targetFloor;
      if (!floorSelect.value && targetFloor) {
        const match = Array.from(floorSelect.options).find(opt =>
          opt.value.toLowerCase().startsWith(targetFloor.toLowerCase()) ||
          targetFloor.toLowerCase().startsWith(opt.value.toLowerCase())
        );
        if (match) floorSelect.value = match.value;
      }
      floorSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // Set Room Size
    const rawSize = room.room_size || '';
    document.getElementById('roomSize').value = rawSize;
    const sizeMatch = rawSize.match(/(\d+(\.\d+)?)/);
    const roomSizeNum = document.getElementById('roomSizeNum');
    if (sizeMatch && roomSizeNum) {
      roomSizeNum.value = sizeMatch[1];
      updateRoomSizeFromNum(sizeMatch[1]);
    } else if (roomSizeNum) {
      roomSizeNum.value = '';
      updateRoomSizeFromNum('');
    }

    document.getElementById('roomView').value = room.view || '';
    document.getElementById('roomBadge').value = room.badge || '';
    document.getElementById('roomStatus').value = room.status || 'available';
    document.getElementById('roomFeatured').checked = !!room.featured;

    // Set Room Image & Preview
    const currentImg = room.image || 'assets/images/deluxe-room.jpg';
    document.getElementById('roomImage').value = currentImg;
    const roomImgPreview = document.getElementById('roomImgPreview');
    if (roomImgPreview) roomImgPreview.src = currentImg;
    const uploadFileName = document.getElementById('uploadFileName');
    if (uploadFileName) uploadFileName.textContent = 'Current room image';
    const roomImageUpload = document.getElementById('roomImageUpload');
    if (roomImageUpload) roomImageUpload.value = '';

    // Set amenities
    const checkBoxes = document.querySelectorAll('input[name="roomAmenities"]');
    checkBoxes.forEach(cb => {
      cb.checked = (room.amenities || []).includes(cb.value);
    });
    syncCheckboxCards();

    roomModalBackdrop.classList.add('active');
  };

  window.toggleRoomStatus = async function (roomId) {
    const room = allRooms.find(r => r.id === roomId);
    if (!room) return;

    const newStatus = room.status === 'available' ? 'maintenance' : 'available';
    room.status = newStatus;

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room)
      });
      if (res.ok) {
        showToast(`Updated ${room.name} status to ${newStatus}`);
        loadData();
      }
    } catch (e) {
      showToast('Error toggling room status.');
    }
  };

  window.deleteRoom = async function (roomId, roomName) {
    const targetRoom = (allRooms || []).find(r => r.id === roomId);
    const displayName = roomName || (targetRoom ? targetRoom.name : (roomId || 'this room'));
    if (!confirm(`Are you sure you want to unpublish "${displayName}" from the website catalog?`)) return;

    try {
      const res = await fetch(`/api/rooms?id=${encodeURIComponent(roomId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`Room "${displayName}" removed from catalog.`);
        loadData();
      } else {
        showToast('Failed to delete room.');
      }
    } catch (e) {
      showToast('Server error while deleting room.');
    }
  };

  window.cancelReservation = async function (refId) {
    if (!confirm(`Cancel reservation reference ${refId}?`)) return;
    try {
      const res = await fetch(`/api/reservations?reference_id=${encodeURIComponent(refId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`Reservation ${refId} removed/cancelled.`);
        loadData();
      }
    } catch (e) {
      showToast('Error cancelling reservation.');
    }
  };

  // --- Admin Approval Action ---
  window.approveReservation = async function (refId) {
    const res = allReservations.find(r => r.reference_id === refId);
    const guestName = res ? res.guest_name : 'Guest';
    const email = res ? res.email : 'guest';

    if (!confirm(`Approve reservation ${refId} for ${guestName}?\n\nAn official confirmation email will be sent to ${email}.`)) {
      return;
    }

    try {
      const response = await fetch('/api/reservations/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_id: refId })
      });
      const result = await response.json();
      if (response.ok && result.success) {
        showToast(`Reservation ${refId} approved! Customer notified by email.`);
        loadData();
      } else {
        showToast(result.error || 'Failed to approve reservation.');
      }
    } catch (err) {
      showToast('Network error while approving reservation.');
    }
  };

  // --- Admin Rejection Modal & Action ---
  let targetRejectRefId = null;
  const rejectModalBackdrop = document.getElementById('rejectReservationModalBackdrop');
  const btnCloseRejectModal = document.getElementById('btnCloseRejectModal');
  const btnCancelRejectModal = document.getElementById('btnCancelRejectModal');
  const btnConfirmRejectReservation = document.getElementById('btnConfirmRejectReservation');
  const rejectRefIdLabel = document.getElementById('rejectRefIdLabel');
  const rejectGuestNameLabel = document.getElementById('rejectGuestNameLabel');
  const rejectReasonText = document.getElementById('rejectReasonText');
  const rejectReasonCharCount = document.getElementById('rejectReasonCharCount');
  const reasonChips = document.querySelectorAll('.btn-reason-chip');

  // Reason chips quick-select handler
  reasonChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const reason = chip.getAttribute('data-reason') || '';
      if (chip.classList.contains('active')) {
        chip.classList.remove('active');
        if (rejectReasonText) {
          rejectReasonText.value = '';
          if (rejectReasonCharCount) rejectReasonCharCount.textContent = '0 / 300';
        }
      } else {
        reasonChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (rejectReasonText) {
          rejectReasonText.value = reason;
          if (rejectReasonCharCount) rejectReasonCharCount.textContent = `${rejectReasonText.value.length} / 300`;
          rejectReasonText.focus();
        }
      }
    });
  });

  // Rejection reason input listener for live character counter
  rejectReasonText?.addEventListener('input', () => {
    const len = rejectReasonText.value.length;
    if (rejectReasonCharCount) {
      rejectReasonCharCount.textContent = `${len} / 300`;
    }
    reasonChips.forEach(c => {
      if (c.getAttribute('data-reason') === rejectReasonText.value) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });
  });

  window.openRejectModal = function (refId) {
    const res = allReservations.find(r => r.reference_id === refId);
    if (!res) return;
    targetRejectRefId = refId;
    if (rejectRefIdLabel) rejectRefIdLabel.textContent = refId;
    if (rejectGuestNameLabel) rejectGuestNameLabel.textContent = res.guest_name;
    if (rejectReasonText) rejectReasonText.value = '';
    if (rejectReasonCharCount) rejectReasonCharCount.textContent = '0 / 300';
    reasonChips.forEach(c => c.classList.remove('active'));
    if (rejectModalBackdrop) {
      rejectModalBackdrop.classList.add('active');
      setTimeout(() => rejectReasonText?.focus(), 80);
    }
  };

  function closeRejectModal() {
    targetRejectRefId = null;
    if (rejectModalBackdrop) {
      rejectModalBackdrop.classList.remove('active');
    }
  }

  btnCloseRejectModal?.addEventListener('click', closeRejectModal);
  btnCancelRejectModal?.addEventListener('click', closeRejectModal);
  rejectModalBackdrop?.addEventListener('click', (e) => {
    if (e.target === rejectModalBackdrop) closeRejectModal();
  });

  btnConfirmRejectReservation?.addEventListener('click', async () => {
    if (!targetRejectRefId) return;
    const reason = rejectReasonText ? rejectReasonText.value.trim() : '';

    btnConfirmRejectReservation.disabled = true;
    btnConfirmRejectReservation.textContent = 'Rejecting...';

    try {
      const response = await fetch('/api/reservations/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_id: targetRejectRefId, reason })
      });
      const result = await response.json();
      if (response.ok && result.success) {
        showToast(`Reservation ${targetRejectRefId} rejected. Customer notified by email.`);
        closeRejectModal();
        loadData();
      } else {
        showToast(result.error || 'Failed to reject reservation.');
      }
    } catch (err) {
      showToast('Network error while rejecting reservation.');
    } finally {
      btnConfirmRejectReservation.disabled = false;
      btnConfirmRejectReservation.textContent = 'Confirm Rejection';
    }
  });

  window.viewRejectionReason = function (refId) {
    const res = allReservations.find(r => r.reference_id === refId);
    if (!res) return;
    alert(`Rejection Reason for ${refId}:\n\n${res.rejection_reason || 'No specific reason provided.'}`);
  };

  // --- Modal Open/Close ---
  if (btnOpenPostModal) {
    btnOpenPostModal.addEventListener('click', () => {
      modalTitle.textContent = 'Post / Publish New Room';
      roomForm.reset();
      document.getElementById('roomId').value = '';
      document.getElementById('roomTotalUnits').value = '5';
      document.getElementById('roomAvailUnits').value = '5';
      document.getElementById('roomStatus').value = 'available';
      if (document.getElementById('roomNumber')) document.getElementById('roomNumber').value = '';
      const floorSelect = document.getElementById('floorNumber');
      if (floorSelect) {
        floorSelect.value = '';
        floorSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Reset image upload preview
      document.getElementById('roomImage').value = 'assets/images/deluxe-room.jpg';
      const roomImgPreview = document.getElementById('roomImgPreview');
      if (roomImgPreview) roomImgPreview.src = 'assets/images/deluxe-room.jpg';
      const uploadFileName = document.getElementById('uploadFileName');
      if (uploadFileName) uploadFileName.textContent = 'JPG, PNG or WebP';
      const roomImageUpload = document.getElementById('roomImageUpload');
      if (roomImageUpload) roomImageUpload.value = '';

      const roomSizeNum = document.getElementById('roomSizeNum');
      if (roomSizeNum) {
        roomSizeNum.value = '52';
        updateRoomSizeFromNum('52');
      }
      const defaultAmenities = [
        "Courtyard garden view",
        "Walk-in rain shower",
        "Complimentary Wi-Fi",
        "Complimentary daily breakfast"
      ];
      document.querySelectorAll('input[name="roomAmenities"]').forEach(cb => {
        cb.checked = defaultAmenities.includes(cb.value);
      });
      syncCheckboxCards();
      roomModalBackdrop.classList.add('active');
    });
  }

  function closeModal() {
    roomModalBackdrop.classList.remove('active');
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

  // --- Room Photo Upload & LONGBLOB Preparation ---
  const roomImageUpload = document.getElementById('roomImageUpload');
  const roomImageHidden = document.getElementById('roomImage');
  const roomImgPreview = document.getElementById('roomImgPreview');
  const uploadFileName = document.getElementById('uploadFileName');
  const btnTriggerUpload = document.getElementById('btnTriggerUpload');
  const roomUploadBox = document.getElementById('roomUploadBox');

  function handleFileSelection(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (uploadFileName) {
      uploadFileName.textContent = file.name;
    }

    const reader = new FileReader();
    reader.onload = function (evt) {
      const dataUri = evt.target.result;

      // Client-side optimization: scale down overly large images for efficient LONGBLOB storage
      const img = new Image();
      img.onload = function () {
        const maxWidth = 1600;
        const maxHeight = 1200;
        let w = img.width;
        let h = img.height;

        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const compressedDataUri = canvas.toDataURL('image/jpeg', 0.88);

          if (roomImageHidden) roomImageHidden.value = compressedDataUri;
          if (roomImgPreview) roomImgPreview.src = compressedDataUri;
        } else {
          if (roomImageHidden) roomImageHidden.value = dataUri;
          if (roomImgPreview) roomImgPreview.src = dataUri;
        }
      };
      img.src = dataUri;
    };
    reader.readAsDataURL(file);
  }

  if (btnTriggerUpload && roomImageUpload) {
    btnTriggerUpload.addEventListener('click', (e) => {
      e.stopPropagation();
      roomImageUpload.click();
    });
  }

  if (roomUploadBox && roomImageUpload) {
    roomUploadBox.addEventListener('click', () => {
      roomImageUpload.click();
    });

    roomUploadBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      roomUploadBox.classList.add('drag-over');
    });

    ['dragleave', 'dragend'].forEach(evt => {
      roomUploadBox.addEventListener(evt, () => {
        roomUploadBox.classList.remove('drag-over');
      });
    });

    roomUploadBox.addEventListener('drop', (e) => {
      e.preventDefault();
      roomUploadBox.classList.remove('drag-over');
      if (e.dataTransfer?.files?.length) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });
  }

  if (roomImageUpload) {
    roomImageUpload.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  // Enforce numerical form only on room number input (letters prohibited)
  const roomNumberInput = document.getElementById('roomNumber');
  if (roomNumberInput) {
    roomNumberInput.addEventListener('keydown', (e) => {
      // Allow navigation and editing keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if ([
        'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Tab', 'Enter', 'Home', 'End'
      ].includes(e.key)) {
        return;
      }
      // Strictly prohibit letters (a-z, A-Z)
      if (/[a-zA-Z]/.test(e.key)) {
        e.preventDefault();
        return;
      }
      // Strictly prohibit characters other than digits (0-9), hyphens (-), commas (,), and spaces
      if (!/[\d\s,-]/.test(e.key)) {
        e.preventDefault();
      }
    });

    // Strip letters and non-numeric characters on input
    roomNumberInput.addEventListener('input', () => {
      roomNumberInput.value = roomNumberInput.value.replace(/[^0-9,\-\s]/g, '');
    });

    // Handle paste: strip letters and prohibited characters immediately
    roomNumberInput.addEventListener('paste', (e) => {
      const pasteText = (e.clipboardData || window.clipboardData)?.getData('text') || '';
      if (pasteText && /[^0-9,\-\s]/.test(pasteText)) {
        e.preventDefault();
        const cleaned = pasteText.replace(/[^0-9,\-\s]/g, '');
        const start = roomNumberInput.selectionStart;
        const end = roomNumberInput.selectionEnd;
        const val = roomNumberInput.value;
        roomNumberInput.value = val.slice(0, start) + cleaned + val.slice(end);
        roomNumberInput.setSelectionRange(start + cleaned.length, start + cleaned.length);
      }
    });
  }

  // --- Form Submission (Post/Edit Room) ---
  if (roomForm) {
    roomForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const selectedAmenities = [];
      document.querySelectorAll('input[name="roomAmenities"]:checked').forEach(cb => {
        selectedAmenities.push(cb.value);
      });

      // 20-Floor and Room Numbering Validation before submission
      const HS = window.HotelStructure;
      const currentRoomId = document.getElementById('roomId').value.trim() || null;
      const floorVal = document.getElementById('floorNumber')?.value.trim() || '';
      const roomNumVal = (document.getElementById('roomNumber')?.value || '').replace(/[^0-9,\-\s]/g, '').trim();

      if (!floorVal) {
        showToast('Please select a Floor/Level from the 20 floors.');
        document.getElementById('floorNumber')?.focus();
        return;
      }

      if (!roomNumVal) {
        showToast('Please enter or assign a Room Number.');
        document.getElementById('roomNumber')?.focus();
        return;
      }

      if (HS) {
        const valCheck = HS.validateRoomNumbers(floorVal, roomNumVal, allRooms, currentRoomId);
        if (!valCheck.valid) {
          showToast(valCheck.error);
          document.getElementById('roomNumber')?.focus();
          return;
        }
      }

      const payload = {
        id: document.getElementById('roomId').value.trim() || undefined,
        name: document.getElementById('roomName').value.trim(),
        tagline: document.getElementById('roomTagline').value.trim(),
        rate_per_night: Number(document.getElementById('roomRate').value),
        max_guests: Number(document.getElementById('roomMaxGuests').value),
        inventory_units: Number(document.getElementById('roomTotalUnits').value),
        available_units: Number(document.getElementById('roomAvailUnits').value),
        bed_config: document.getElementById('roomBedConfig').value.trim(),
        room_number: (document.getElementById('roomNumber')?.value || '').replace(/[^0-9,\-\s]/g, '').trim(),
        floor_number: document.getElementById('floorNumber')?.value.trim() || '',
        room_size: (document.getElementById('roomSize')?.value.trim()) || (document.getElementById('roomSizeNum')?.value ? `${document.getElementById('roomSizeNum').value} m²` : '50 m²'),
        view: document.getElementById('roomView').value.trim(),
        badge: document.getElementById('roomBadge').value.trim(),
        status: document.getElementById('roomStatus').value,
        featured: document.getElementById('roomFeatured').checked,
        image: document.getElementById('roomImage').value,
        amenities: selectedAmenities,
        posted_by: currentUser?.full_name || 'Hotel Admin'
      };

      try {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          closeModal();
          showToast(`Successfully published "${payload.name}" to website!`);
          loadData();
        } else {
          const errData = await res.json();
          alert(errData.error || 'Failed to save room.');
        }
      } catch (err) {
        alert('Server network error while saving room.');
      }
    });
  }


  // --- Search and Filter Listeners ---
  if (roomSearchInput) roomSearchInput.addEventListener('input', renderRooms);
  if (roomCategoryFilter) roomCategoryFilter.addEventListener('change', renderRooms);
  if (roomFloorFilter) roomFloorFilter.addEventListener('change', renderRooms);
  if (roomNumberFilter) roomNumberFilter.addEventListener('change', renderRooms);

  // --- Guest Reservations Search, Sort, and Filter Listeners ---
  if (resSearchInput) resSearchInput.addEventListener('input', renderReservations);
  if (resSortSelect) resSortSelect.addEventListener('change', renderReservations);
  if (resRoomTypeFilter) resRoomTypeFilter.addEventListener('change', renderReservations);
  if (resRoomNumberFilter) resRoomNumberFilter.addEventListener('change', renderReservations);

  // --- Guest Reservations Email Tooltip & Copy Handler ---
  const luxuryTooltip = document.getElementById('luxuryFloatingTooltip');
  const tooltipEmailText = document.getElementById('tooltipEmailText');
  const tooltipActionHint = document.querySelector('.tooltip-action-hint');
  let activeTooltipEl = null;

  function positionLuxuryTooltip(targetEl, email) {
    if (!luxuryTooltip || !tooltipEmailText) return;
    activeTooltipEl = targetEl;
    tooltipEmailText.textContent = email;
    if (tooltipActionHint) tooltipActionHint.textContent = 'Click to copy';

    luxuryTooltip.style.display = 'block';

    const rect = targetEl.getBoundingClientRect();
    const tooltipWidth = luxuryTooltip.offsetWidth;
    const tooltipHeight = luxuryTooltip.offsetHeight;

    // Show below if element is near the top of viewport, otherwise show above
    const showBelow = rect.top < (tooltipHeight + 16);
    const top = showBelow ? (rect.bottom + 8) : (rect.top - tooltipHeight - 8);
    let left = rect.left;

    // Viewport edge guards
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16;
    }
    if (left < 16) left = 16;

    luxuryTooltip.style.top = `${Math.round(top)}px`;
    luxuryTooltip.style.left = `${Math.round(left)}px`;

    luxuryTooltip.classList.remove('arrow-top', 'arrow-bottom');
    luxuryTooltip.classList.add(showBelow ? 'arrow-top' : 'arrow-bottom');

    requestAnimationFrame(() => {
      luxuryTooltip.classList.add('active');
    });
  }

  function hideLuxuryTooltip() {
    if (!luxuryTooltip) return;
    luxuryTooltip.classList.remove('active');
    activeTooltipEl = null;
    setTimeout(() => {
      if (!luxuryTooltip.classList.contains('active')) {
        luxuryTooltip.style.display = 'none';
      }
    }, 180);
  }

  if (reservationsTableBody) {
    // Mouse hover reveals full unclipped email instantly
    reservationsTableBody.addEventListener('mouseover', (e) => {
      const emailEl = e.target.closest('.guest-email');
      if (emailEl) {
        const email = emailEl.getAttribute('data-email') || emailEl.textContent.trim();
        positionLuxuryTooltip(emailEl, email);
      }
    });

    reservationsTableBody.addEventListener('mouseout', (e) => {
      const emailEl = e.target.closest('.guest-email');
      if (emailEl) {
        hideLuxuryTooltip();
      }
    });

    // Clicking email copies it to clipboard with instant feedback
    reservationsTableBody.addEventListener('click', async (e) => {
      const emailEl = e.target.closest('.guest-email');
      if (emailEl) {
        const email = emailEl.getAttribute('data-email') || emailEl.textContent.trim();
        try {
          await navigator.clipboard.writeText(email);
          if (tooltipActionHint) tooltipActionHint.textContent = '✓ Copied!';
          showToast(`Copied ${email} to clipboard`);
        } catch (err) {
          showToast(`Email: ${email}`);
        }
      }
    });
  }

  window.addEventListener('scroll', () => {
    if (activeTooltipEl) hideLuxuryTooltip();
  }, { passive: true });

  // --- Live Reports Calculation (Figma Design) ---
  function renderReports() {
    // 1. Reservation summary
    const totalReservations = allReservations.length;
    let confirmedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;

    allReservations.forEach(r => {
      const status = (r.payment_status || '').toLowerCase();
      if (status.includes('cancelled') || status.includes('canceled') || status === 'rejected') {
        cancelledCount++;
      } else if (status.includes('deposit') || status.includes('paid') || status === 'approved' || status.includes('confirmed')) {
        confirmedCount++;
      } else {
        pendingCount++;
      }
    });

    const repSummaryTotal = document.getElementById('repSummaryTotal');
    const repConfirmedRow = document.getElementById('repConfirmedRow');
    const repPendingRow = document.getElementById('repPendingRow');
    const repCancelledRow = document.getElementById('repCancelledRow');

    if (repSummaryTotal) repSummaryTotal.textContent = totalReservations;
    if (repConfirmedRow) repConfirmedRow.textContent = `${confirmedCount} confirmed`;
    if (repPendingRow) repPendingRow.textContent = `${pendingCount} pending`;
    if (repCancelledRow) repCancelledRow.textContent = `${cancelledCount} cancelled`;

    // 2. Room occupancy today
    const totalInventory = allRooms.reduce((acc, r) => acc + (parseInt(r.inventory_units, 10) || 0), 0);
    const availableUnits = allRooms.reduce((acc, r) => {
      if (r.status === 'available') {
        return acc + (parseInt(r.available_units !== undefined ? r.available_units : r.inventory_units, 10) || 0);
      }
      return acc;
    }, 0);
    const occupiedUnits = Math.max(0, totalInventory - availableUnits);
    const occupancyPct = totalInventory > 0 ? Math.round((occupiedUnits / totalInventory) * 100) : 0;

    const repOccupancyPercent = document.getElementById('repOccupancyPercent');
    const repOccupiedUnitsRow = document.getElementById('repOccupiedUnitsRow');
    const repAvailableUnitsRow = document.getElementById('repAvailableUnitsRow');
    const repInventoryUnitsRow = document.getElementById('repInventoryUnitsRow');

    if (repOccupancyPercent) repOccupancyPercent.textContent = `${occupancyPct}%`;
    if (repOccupiedUnitsRow) repOccupiedUnitsRow.textContent = `${occupiedUnits} occupied / reserved`;
    if (repAvailableUnitsRow) repAvailableUnitsRow.textContent = `${availableUnits} available`;
    if (repInventoryUnitsRow) repInventoryUnitsRow.textContent = `${totalInventory} inventory`;

    // 3. Payment summary
    const totalBookingValue = allReservations.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0);
    let fullyPaidCount = 0;
    let depositsCount = 0;

    allReservations.forEach(r => {
      const status = (r.payment_status || '').toLowerCase();
      if (status.includes('full') || (status.includes('paid') && !status.includes('deposit'))) {
        fullyPaidCount++;
      } else if (status.includes('deposit')) {
        depositsCount++;
      }
    });

    const repPaymentTotal = document.getElementById('repPaymentTotal');
    const repBookingValueRow = document.getElementById('repBookingValueRow');
    const repPaidRow = document.getElementById('repPaidRow');
    const repDepositsRow = document.getElementById('repDepositsRow');

    if (repPaymentTotal) repPaymentTotal.textContent = `₱${totalBookingValue.toLocaleString()}`;
    if (repBookingValueRow) repBookingValueRow.textContent = `₱${totalBookingValue.toLocaleString()} total booking value`;
    if (repPaidRow) repPaidRow.textContent = `${fullyPaidCount} fully paid`;
    if (repDepositsRow) repDepositsRow.textContent = `${depositsCount} deposits`;

    // 4. Booking trends
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthCount = allReservations.filter(r => {
      if (!r.created_at && !r.check_in) return true;
      const d = new Date(r.created_at || r.check_in);
      return !isNaN(d.getTime()) ? (d.getMonth() === currentMonth && d.getFullYear() === currentYear) : true;
    }).length || totalReservations;

    const uniqueGuests = new Set(allReservations.map(r => (r.email || r.guest_name || '').toLowerCase().trim())).size;
    const roomTypesCount = allRooms.length;

    const repTrendsTotal = document.getElementById('repTrendsTotal');
    const repMonthRow = document.getElementById('repMonthRow');
    const repGuestsRow = document.getElementById('repGuestsRow');
    const repTypesRow = document.getElementById('repTypesRow');

    if (repTrendsTotal) repTrendsTotal.textContent = thisMonthCount;
    if (repMonthRow) repMonthRow.textContent = `${thisMonthCount} reservations this month`;
    if (repGuestsRow) repGuestsRow.textContent = `${uniqueGuests} unique guests`;
    if (repTypesRow) repTypesRow.textContent = `${roomTypesCount} room types`;
  }

  // --- Tabs Switching ---
  function switchTab(targetTab) {
    if ((targetTab === 'logs' || targetTab === 'staff') && !isManager()) {
      targetTab = 'rooms';
    }

    tabButtons.forEach(b => {
      if (b.getAttribute('data-tab') === targetTab) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    activeTab = targetTab;

    if (activeTab === 'rooms') {
      if (adminHeaderRow) adminHeaderRow.style.display = 'flex';
      if (adminKpiGrid) adminKpiGrid.style.display = 'grid';
      if (adminToolbar) adminToolbar.style.display = 'flex';
      if (roomsContainer) roomsContainer.style.display = 'grid';
      if (reservationsContainer) reservationsContainer.style.display = 'none';
      if (reportsContainer) reportsContainer.style.display = 'none';
      if (backupContainer) backupContainer.style.display = 'none';
      if (logsContainer) logsContainer.style.display = 'none';
      if (staffContainer) staffContainer.style.display = 'none';
    } else if (activeTab === 'reservations') {
      if (adminHeaderRow) adminHeaderRow.style.display = 'flex';
      if (adminKpiGrid) adminKpiGrid.style.display = 'grid';
      if (adminToolbar) adminToolbar.style.display = 'none';
      if (roomsContainer) roomsContainer.style.display = 'none';
      if (reservationsContainer) reservationsContainer.style.display = 'block';
      if (reportsContainer) reportsContainer.style.display = 'none';
      if (backupContainer) backupContainer.style.display = 'none';
      if (logsContainer) logsContainer.style.display = 'none';
      if (staffContainer) staffContainer.style.display = 'none';
    } else if (activeTab === 'reports') {
      if (adminHeaderRow) adminHeaderRow.style.display = 'none';
      if (adminKpiGrid) adminKpiGrid.style.display = 'none';
      if (adminToolbar) adminToolbar.style.display = 'none';
      if (roomsContainer) roomsContainer.style.display = 'none';
      if (reservationsContainer) reservationsContainer.style.display = 'none';
      if (reportsContainer) reportsContainer.style.display = 'block';
      if (backupContainer) backupContainer.style.display = 'none';
      if (logsContainer) logsContainer.style.display = 'none';
      if (staffContainer) staffContainer.style.display = 'none';
      renderReports();
    } else if (activeTab === 'backup') {
      if (adminHeaderRow) adminHeaderRow.style.display = 'none';
      if (adminKpiGrid) adminKpiGrid.style.display = 'none';
      if (adminToolbar) adminToolbar.style.display = 'none';
      if (roomsContainer) roomsContainer.style.display = 'none';
      if (reservationsContainer) reservationsContainer.style.display = 'none';
      if (reportsContainer) reportsContainer.style.display = 'none';
      if (backupContainer) backupContainer.style.display = 'block';
      if (logsContainer) logsContainer.style.display = 'none';
      if (staffContainer) staffContainer.style.display = 'none';
      updateRoleVisibility();
      loadBackupSectionInfo();
    } else if (activeTab === 'logs') {
      if (adminHeaderRow) adminHeaderRow.style.display = 'none';
      if (adminKpiGrid) adminKpiGrid.style.display = 'none';
      if (adminToolbar) adminToolbar.style.display = 'none';
      if (roomsContainer) roomsContainer.style.display = 'none';
      if (reservationsContainer) reservationsContainer.style.display = 'none';
      if (reportsContainer) reportsContainer.style.display = 'none';
      if (backupContainer) backupContainer.style.display = 'none';
      if (logsContainer) logsContainer.style.display = 'block';
      if (staffContainer) staffContainer.style.display = 'none';
      loadLogs();
    } else if (activeTab === 'staff') {
      if (adminHeaderRow) adminHeaderRow.style.display = 'none';
      if (adminKpiGrid) adminKpiGrid.style.display = 'none';
      if (adminToolbar) adminToolbar.style.display = 'none';
      if (roomsContainer) roomsContainer.style.display = 'none';
      if (reservationsContainer) reservationsContainer.style.display = 'none';
      if (reportsContainer) reportsContainer.style.display = 'none';
      if (backupContainer) backupContainer.style.display = 'none';
      if (logsContainer) logsContainer.style.display = 'none';
      if (staffContainer) staffContainer.style.display = 'block';
      loadStaff();
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  if (btnRefreshReports) {
    btnRefreshReports.addEventListener('click', async () => {
      btnRefreshReports.style.opacity = '0.6';
      await loadData();
      renderReports();
      btnRefreshReports.style.opacity = '1';
      showToast('Live report analytics synchronized.');
    });
  }

  // =========================================================================
  // Manager Feature 1: Activity Logs Engine
  // =========================================================================
  let allLogs = [];

  async function loadLogs() {
    try {
      const q = new URLSearchParams();
      if (logSearchInput && logSearchInput.value.trim()) q.set('search', logSearchInput.value.trim());
      if (logActionFilter && logActionFilter.value !== 'all') q.set('action', logActionFilter.value);
      if (logOutcomeFilter && logOutcomeFilter.value !== 'all') q.set('outcome', logOutcomeFilter.value);
      if (logDateFrom && logDateFrom.value) q.set('from', logDateFrom.value);
      if (logDateTo && logDateTo.value) q.set('to', logDateTo.value);

      const res = await fetch(`/api/logs?${q.toString()}`);
      if (res.ok) {
        allLogs = await res.json();
      } else {
        allLogs = [];
      }
    } catch (e) {
      allLogs = [];
    }
    renderLogs();
  }

  function renderLogs() {
    if (!logsTableBody) return;
    logsTableBody.replaceChildren();

    if (!allLogs || allLogs.length === 0) {
      if (logsEmptyState) logsEmptyState.style.display = 'block';
      return;
    }
    if (logsEmptyState) logsEmptyState.style.display = 'none';

    allLogs.forEach(entry => {
      const tr = document.createElement('tr');

      // 1. DATE & TIME
      const tdDate = document.createElement('td');
      tdDate.textContent = entry.date_time || '';
      tr.appendChild(tdDate);

      // 2. USER
      const tdUser = document.createElement('td');
      const userWrap = document.createElement('div');
      userWrap.className = 'user-cell-wrap';
      const userName = document.createElement('span');
      userName.className = 'user-cell-name';
      userName.textContent = entry.user_name || 'Staff User';
      const userEmail = document.createElement('span');
      userEmail.className = 'user-cell-email';
      userEmail.textContent = entry.user_email || '';
      userWrap.appendChild(userName);
      userWrap.appendChild(userEmail);
      tdUser.appendChild(userWrap);
      tr.appendChild(tdUser);

      // 3. ACTION
      const tdAction = document.createElement('td');
      tdAction.textContent = entry.action || '';
      tr.appendChild(tdAction);

      // 4. AFFECTED RECORD
      const tdRecord = document.createElement('td');
      tdRecord.textContent = entry.affected_record || '';
      tr.appendChild(tdRecord);

      // 5. DESCRIPTION
      const tdDesc = document.createElement('td');
      tdDesc.textContent = entry.description || '';
      tr.appendChild(tdDesc);

      // 6. OUTCOME
      const tdOutcome = document.createElement('td');
      const badge = document.createElement('span');
      const outcomeVal = (entry.outcome || 'SUCCESSFUL').toUpperCase();
      badge.className = `badge-pill ${outcomeVal === 'SUCCESSFUL' ? 'badge-outcome-successful' : 'badge-outcome-failed'}`;
      badge.textContent = outcomeVal;
      tdOutcome.appendChild(badge);
      tr.appendChild(tdOutcome);

      logsTableBody.appendChild(tr);
    });
  }

  if (logSearchInput) {
    let debounceTimer;
    logSearchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadLogs, 250);
    });
  }
  if (logActionFilter) logActionFilter.addEventListener('change', loadLogs);
  if (logOutcomeFilter) logOutcomeFilter.addEventListener('change', loadLogs);
  if (logDateFrom) logDateFrom.addEventListener('change', loadLogs);
  if (logDateTo) logDateTo.addEventListener('change', loadLogs);

  // =========================================================================
  // Manager Feature 2: Staff Users Management Engine
  // =========================================================================
  let allStaff = [];

  async function loadStaff() {
    try {
      const res = await fetch('/api/staff-users');
      if (res.ok) {
        allStaff = await res.json();
      } else {
        allStaff = [];
      }
    } catch (e) {
      allStaff = [];
    }
    renderStaff();
  }

  function renderStaff() {
    if (!staffTableBody) return;
    staffTableBody.replaceChildren();

    const search = (staffSearchInput ? staffSearchInput.value : '').toLowerCase().trim();
    const roleFilter = (staffRoleFilter ? staffRoleFilter.value : 'all').toLowerCase();

    const filtered = allStaff.filter(s => {
      if (roleFilter !== 'all' && (s.role || '').toLowerCase() !== roleFilter) return false;
      if (search) {
        const text = `${s.full_name || ''} ${s.email || ''} ${s.role || ''} ${s.username || ''}`.toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      if (staffEmptyState) staffEmptyState.style.display = 'block';
      return;
    }
    if (staffEmptyState) staffEmptyState.style.display = 'none';

    filtered.forEach(s => {
      const tr = document.createElement('tr');

      // 1. STAFF MEMBER
      const tdMember = document.createElement('td');
      const userWrap = document.createElement('div');
      userWrap.className = 'user-cell-wrap';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'user-cell-name';
      nameSpan.textContent = s.full_name || s.username;
      const emailSpan = document.createElement('span');
      emailSpan.className = 'user-cell-email';
      emailSpan.textContent = s.email || `${s.username}@casaamara.ph`;
      userWrap.appendChild(nameSpan);
      userWrap.appendChild(emailSpan);
      tdMember.appendChild(userWrap);
      tr.appendChild(tdMember);

      // 2. ROLE
      const tdRole = document.createElement('td');
      tdRole.textContent = s.role || 'Admin';
      tr.appendChild(tdRole);

      // 3. STATUS
      const tdStatus = document.createElement('td');
      const statusBadge = document.createElement('span');
      const statusVal = (s.status || 'ACTIVE').toUpperCase();
      statusBadge.className = `badge-pill ${statusVal === 'ACTIVE' ? 'badge-status-active' : 'badge-status-inactive'}`;
      statusBadge.textContent = statusVal;
      tdStatus.appendChild(statusBadge);
      tr.appendChild(tdStatus);

      // 4. LAST SIGN IN
      const tdLastSignIn = document.createElement('td');
      tdLastSignIn.textContent = s.last_signin || 'Never';
      tr.appendChild(tdLastSignIn);

      // 5. ACTIONS
      const tdActions = document.createElement('td');
      const isTargetManager = (s.role || '').toLowerCase() === 'manager' || (s.username || '').toLowerCase() === 'manager';

      if (isTargetManager) {
        const currentTag = document.createElement('span');
        currentTag.className = 'current-account-tag';
        currentTag.textContent = 'Current account';
        tdActions.appendChild(currentTag);
      } else {
        // Edit Link
        const editLink = document.createElement('button');
        editLink.type = 'button';
        editLink.className = 'staff-action-link action-edit';
        editLink.textContent = 'Edit';
        editLink.addEventListener('click', () => openEditStaffModal(s));
        tdActions.appendChild(editLink);

        // Deactivate / Activate Link
        const toggleLink = document.createElement('button');
        toggleLink.type = 'button';
        toggleLink.className = 'staff-action-link action-toggle';
        const isInactive = (s.status || '').toUpperCase() === 'INACTIVE';
        toggleLink.textContent = isInactive ? 'Activate' : 'Deactivate';
        toggleLink.addEventListener('click', () => toggleStaffStatus(s));
        tdActions.appendChild(toggleLink);

        // Remove Link (Opens confirmation modal)
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'staff-action-link action-remove';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => openDeleteStaffModal(s));
        tdActions.appendChild(removeBtn);
      }
      tr.appendChild(tdActions);

      staffTableBody.appendChild(tr);
    });
  }

  if (staffSearchInput) staffSearchInput.addEventListener('input', renderStaff);
  if (staffRoleFilter) staffRoleFilter.addEventListener('change', renderStaff);

  // Name inputs: restrict numbers, letters only
  ['staffFullName', 'editStaffFullName'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        const cleaned = el.value.replace(/[0-9]/g, '');
        if (el.value !== cleaned) el.value = cleaned;
      });
      el.addEventListener('keydown', (e) => {
        if (/^[0-9]$/.test(e.key)) e.preventDefault();
      });
    }
  });

  // Add Staff Member Form Submission
  if (addStaffForm) {
    addStaffForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('staffFullName').value.trim();
      const email = document.getElementById('staffEmail').value.trim();
      const password = document.getElementById('staffPassword').value;

      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      if (password.length < 10 || !hasUpper || !hasLower || !hasNumber) {
        showToast('Password must be at least 10 characters with uppercase, lowercase, and a number.');
        return;
      }

      try {
        const btn = document.getElementById('btnCreateAdmin');
        if (btn) btn.disabled = true;

        const res = await fetch('/api/staff-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName,
            email: email,
            password: password,
            caller_name: currentUser ? currentUser.full_name : 'Casa Amara Manager',
            caller_email: currentUser ? currentUser.email : 'manager@casaamara.ph'
          })
        });

        const data = await res.json();
        if (btn) btn.disabled = false;

        if (res.ok && data.success) {
          showToast(`Admin account created for ${fullName}`);
          addStaffForm.reset();
          await loadStaff();
        } else {
          showToast(data.error || 'Failed to create staff account.');
        }
      } catch (err) {
        showToast('Network error while creating staff account.');
      }
    });
  }

  // Toggle Staff Status (Deactivate / Activate)
  async function toggleStaffStatus(user) {
    const isCurrentlyInactive = (user.status || '').toUpperCase() === 'INACTIVE';
    const newStatus = isCurrentlyInactive ? 'ACTIVE' : 'INACTIVE';
    try {
      const res = await fetch('/api/staff-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          username: user.username,
          status: newStatus,
          caller_name: currentUser ? currentUser.full_name : 'Casa Amara Manager',
          caller_email: currentUser ? currentUser.email : 'manager@casaamara.ph'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Account for ${user.full_name} is now ${newStatus === 'ACTIVE' ? 'Active' : 'Deactivated'}.`);
        await loadStaff();
      } else {
        showToast(data.error || 'Failed to update account status.');
      }
    } catch (e) {
      showToast('Error updating account status.');
    }
  }

  // Remove Staff User
  async function removeStaffUser(user) {
    try {
      const res = await fetch(`/api/staff-users?id=${encodeURIComponent(user.id)}&username=${encodeURIComponent(user.username)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Staff account for ${user.full_name} has been removed.`);
        await loadStaff();
      } else {
        showToast(data.error || 'Failed to remove account.');
      }
    } catch (e) {
      showToast('Error removing account.');
    }
  }

  // Delete Staff Modal Handlers
  function openDeleteStaffModal(user) {
    if (!deleteStaffModalBackdrop) return;
    pendingDeleteUser = user;
    if (deleteStaffConfirmText) {
      deleteStaffConfirmText.textContent = `Are you sure you want to remove the staff account for "${user.full_name}" (${user.email || user.username})? This action cannot be undone.`;
    }
    deleteStaffModalBackdrop.classList.add('active');
  }

  function closeDeleteStaffModal() {
    if (deleteStaffModalBackdrop) deleteStaffModalBackdrop.classList.remove('active');
    pendingDeleteUser = null;
  }

  if (btnCancelDeleteStaff) btnCancelDeleteStaff.addEventListener('click', closeDeleteStaffModal);
  if (btnConfirmDeleteStaff) {
    btnConfirmDeleteStaff.addEventListener('click', async () => {
      if (!pendingDeleteUser) return;
      const user = pendingDeleteUser;
      closeDeleteStaffModal();
      await removeStaffUser(user);
    });
  }

  // Edit Staff Modal Handlers
  function openEditStaffModal(user) {
    if (!editStaffModalBackdrop) return;
    document.getElementById('editStaffId').value = user.id || '';
    document.getElementById('editStaffUsername').value = user.username || '';
    document.getElementById('editStaffFullName').value = user.full_name || '';
    document.getElementById('editStaffEmail').value = user.email || '';
    document.getElementById('editStaffStatusSelect').value = user.status || 'ACTIVE';
    const pwdInput = document.getElementById('editStaffPassword');
    if (pwdInput) pwdInput.value = '';
    editStaffModalBackdrop.classList.add('active');
  }

  function closeEditStaffModal() {
    if (editStaffModalBackdrop) editStaffModalBackdrop.classList.remove('active');
  }

  if (btnCloseEditStaffModal) btnCloseEditStaffModal.addEventListener('click', closeEditStaffModal);
  if (btnCancelEditStaffModal) btnCancelEditStaffModal.addEventListener('click', closeEditStaffModal);

  // Close modals when clicking on background backdrop
  if (editStaffModalBackdrop) {
    editStaffModalBackdrop.addEventListener('click', (e) => {
      if (e.target === editStaffModalBackdrop) closeEditStaffModal();
    });
  }
  if (deleteStaffModalBackdrop) {
    deleteStaffModalBackdrop.addEventListener('click', (e) => {
      if (e.target === deleteStaffModalBackdrop) closeDeleteStaffModal();
    });
  }

  if (editStaffForm) {
    editStaffForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editStaffId').value;
      const username = document.getElementById('editStaffUsername').value;
      const full_name = document.getElementById('editStaffFullName').value.trim();
      const email = document.getElementById('editStaffEmail').value.trim();
      const status = document.getElementById('editStaffStatusSelect').value;
      const pwdInput = document.getElementById('editStaffPassword');
      const password = pwdInput ? pwdInput.value : '';

      if (password && password.trim()) {
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        if (password.length < 10 || !hasUpper || !hasLower || !hasNumber) {
          showToast('Password must be at least 10 characters with uppercase, lowercase, and a number.');
          return;
        }
      }

      try {
        const payload = {
          id,
          username,
          full_name,
          email,
          status,
          caller_name: currentUser ? currentUser.full_name : 'Casa Amara Manager',
          caller_email: currentUser ? currentUser.email : 'manager@casaamara.ph'
        };
        if (password && password.trim()) {
          payload.password = password.trim();
        }

        const res = await fetch('/api/staff-users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(`Staff account for ${full_name} updated successfully.`);
          closeEditStaffModal();
          await loadStaff();
        } else {
          showToast(data.error || 'Failed to update staff account.');
        }
      } catch (err) {
        showToast('Error updating staff account.');
      }
    });
  }

  // --- Room Size Automation (Strictly m²) ---
  function updateRoomSizeFromNum(sqmVal) {
    const roomSizeHidden = document.getElementById('roomSize');
    if (!sqmVal || isNaN(sqmVal) || parseFloat(sqmVal) <= 0) {
      if (roomSizeHidden) roomSizeHidden.value = '';
      return;
    }
    const sqm = parseFloat(sqmVal);
    if (roomSizeHidden) roomSizeHidden.value = `${sqm} m²`;
  }

  const roomSizeNum = document.getElementById('roomSizeNum');
  if (roomSizeNum) {
    roomSizeNum.addEventListener('input', (e) => {
      updateRoomSizeFromNum(e.target.value);
    });
  }

  // --- Luxury Checkbox Card Synchronization ---
  function syncCheckboxCards() {
    document.querySelectorAll('.amenity-check-card').forEach(card => {
      const cb = card.querySelector('input[type="checkbox"]');
      if (cb) {
        if (cb.checked) {
          card.classList.add('is-checked');
        } else {
          card.classList.remove('is-checked');
        }
      }
    });
  }

  document.querySelectorAll('.amenity-check-card input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', syncCheckboxCards);
  });

  // Init
  checkAuth();
  if (roomSizeNum && roomSizeNum.value) {
    updateRoomSizeFromNum(roomSizeNum.value);
  }
  syncCheckboxCards();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'reports' || window.location.hash === '#reports') {
    switchTab('reports');
  } else if (urlParams.get('tab') === 'reservations' || window.location.hash === '#reservations') {
    switchTab('reservations');
  } else if (urlParams.get('tab') === 'backup' || window.location.hash === '#backup') {
    switchTab('backup');
  }

  // --- SQL Database Backup & Download ---
  async function triggerDatabaseBackup(triggerBtn) {
    if (!currentUser) {
      showToast('Please sign in to export database backups.');
      return;
    }

    const originalContent = triggerBtn ? triggerBtn.innerHTML : '';
    if (triggerBtn) {
      triggerBtn.classList.add('loading');
      triggerBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spin-icon"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        <span>Generating Backup...</span>
      `;
    }

    try {
      showToast('Generating live SQL database backup...');
      const response = await fetch(`/api/database/backup?username=${encodeURIComponent(currentUser.username)}`, {
        method: 'GET',
        headers: {
          'X-Admin-User': currentUser.username,
          'X-Admin-Email': currentUser.email || ''
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        showToast(errData.error || 'Failed to download database backup.');
        return;
      }

      // Extract filename from Content-Disposition header if available
      let filename = `casa_amara_db_backup_${new Date().toISOString().slice(0, 10)}.sql`;
      const disposition = response.headers.get('content-disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(downloadUrl);

      showToast(`Database backup downloaded: ${filename}`);

      // Refresh activity logs if on logs tab
      if (typeof loadActivityLogs === 'function') {
        loadActivityLogs();
      }
    } catch (err) {
      console.error('Database backup error:', err);
      showToast('Network error while downloading database backup.');
    } finally {
      if (triggerBtn) {
        triggerBtn.classList.remove('loading');
        triggerBtn.innerHTML = originalContent;
      }
    }
  }

  // Bind all backup buttons
  document.querySelectorAll('.btn-download-sql-backup').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      triggerDatabaseBackup(btn);
    });
  });


  // --- Dedicated Database Backup & Restore Section Logic ---
  let selectedRestoreFile = null;
  let selectedRestoreSqlText = null;

  async function loadBackupSectionInfo() {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/database/info?username=${encodeURIComponent(currentUser.username)}`, {
        headers: { 'X-Admin-User': currentUser.username }
      });
      if (res.ok) {
        const data = await res.json();
        const dbInfoName = document.getElementById('dbInfoName');
        const dbInfoTables = document.getElementById('dbInfoTables');
        const dbInfoRecords = document.getElementById('dbInfoRecords');
        const dbInfoLatestBackup = document.getElementById('dbInfoLatestBackup');

        if (dbInfoName) dbInfoName.textContent = data.db_name || 'casa_amara_db';
        if (dbInfoTables) dbInfoTables.textContent = `${data.total_tables || 4} Base Tables`;
        if (dbInfoRecords) {
          const t = data.tables || {};
          dbInfoRecords.textContent = `${data.total_records || 0} (${t.rooms || 0} rooms, ${t.reservations || 0} reservations, ${t.users || 0} users, ${t.activity_logs || 0} logs)`;
        }
        if (dbInfoLatestBackup) {
          dbInfoLatestBackup.textContent = data.latest_server_backup || 'Ready on demand';
        }
      }
    } catch (e) {
      console.warn('Could not load database status info:', e.message);
    }
  }

  // Restore file handling
  const restoreDropzone = document.getElementById('restoreDropzone');
  const dropzoneClickArea = document.getElementById('dropzoneClickArea');
  const restoreSqlFileInput = document.getElementById('restoreSqlFileInput');
  const selectedFileCard = document.getElementById('selectedFileCard');
  const selectedFilenameLabel = document.getElementById('selectedFilenameLabel');
  const selectedFilesizeLabel = document.getElementById('selectedFilesizeLabel');
  const btnClearSelectedFile = document.getElementById('btnClearSelectedFile');
  const btnOpenRestoreConfirmModal = document.getElementById('btnOpenRestoreConfirmModal');

  const restoreConfirmModalBackdrop = document.getElementById('restoreConfirmModalBackdrop');
  const btnCloseRestoreModal = document.getElementById('btnCloseRestoreModal');
  const btnCancelRestoreModal = document.getElementById('btnCancelRestoreModal');
  const btnExecuteDatabaseRestore = document.getElementById('btnExecuteDatabaseRestore');
  const btnExecuteRestoreText = document.getElementById('btnExecuteRestoreText');
  const restoreModalFilename = document.getElementById('restoreModalFilename');

  function handleFileSelected(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.sql')) {
      showToast('Invalid file format. Please select a valid .sql backup file.');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      showToast('File size is too large (maximum limit is 30 MB).');
      return;
    }

    selectedRestoreFile = file;
    if (selectedFilenameLabel) selectedFilenameLabel.textContent = file.name;
    if (selectedFilesizeLabel) {
      const kb = (file.size / 1024).toFixed(1);
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      selectedFilesizeLabel.textContent = file.size > 1024 * 1024 ? `${mb} MB` : `${kb} KB`;
    }

    if (selectedFileCard) selectedFileCard.style.display = 'flex';
    if (btnOpenRestoreConfirmModal) btnOpenRestoreConfirmModal.disabled = false;

    // Read file contents
    const reader = new FileReader();
    reader.onload = (e) => {
      selectedRestoreSqlText = e.target.result;
    };
    reader.onerror = () => {
      showToast('Error reading selected SQL file.');
      clearSelectedFile();
    };
    reader.readAsText(file);
  }

  function clearSelectedFile() {
    selectedRestoreFile = null;
    selectedRestoreSqlText = null;
    if (restoreSqlFileInput) restoreSqlFileInput.value = '';
    if (selectedFileCard) selectedFileCard.style.display = 'none';
    if (btnOpenRestoreConfirmModal) btnOpenRestoreConfirmModal.disabled = true;
  }

  dropzoneClickArea?.addEventListener('click', () => {
    if (restoreSqlFileInput) restoreSqlFileInput.click();
  });

  restoreSqlFileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  });

  // Drag and drop handlers
  if (restoreDropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      restoreDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        restoreDropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      restoreDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        restoreDropzone.classList.remove('dragover');
      });
    });

    restoreDropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });
  }

  btnClearSelectedFile?.addEventListener('click', clearSelectedFile);

  // Restore Confirmation Modal
  btnOpenRestoreConfirmModal?.addEventListener('click', () => {
    if (!selectedRestoreFile || !selectedRestoreSqlText) {
      showToast('Please select a valid .sql backup file to restore.');
      return;
    }
    if (!isManager()) {
      showToast('Access denied: Only Hotel Managers are permitted to restore the database.');
      return;
    }

    if (restoreModalFilename) {
      restoreModalFilename.textContent = selectedRestoreFile.name;
    }
    if (restoreConfirmModalBackdrop) {
      restoreConfirmModalBackdrop.classList.add('active');
    }
  });

  function closeRestoreModal() {
    if (restoreConfirmModalBackdrop) {
      restoreConfirmModalBackdrop.classList.remove('active');
    }
  }

  btnCloseRestoreModal?.addEventListener('click', closeRestoreModal);
  btnCancelRestoreModal?.addEventListener('click', closeRestoreModal);
  restoreConfirmModalBackdrop?.addEventListener('click', (e) => {
    if (e.target === restoreConfirmModalBackdrop) closeRestoreModal();
  });

  // Execute Database Restore
  btnExecuteDatabaseRestore?.addEventListener('click', async () => {
    if (!selectedRestoreFile || !selectedRestoreSqlText || !currentUser) return;
    if (!isManager()) {
      showToast('Access denied: Manager permissions required.');
      closeRestoreModal();
      return;
    }

    btnExecuteDatabaseRestore.disabled = true;
    if (btnExecuteRestoreText) btnExecuteRestoreText.textContent = 'Creating Safety Backup & Restoring...';

    try {
      showToast('1/2 Creating automatic safety backup on server...');

      const response = await fetch('/api/database/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-User': currentUser.username
        },
        body: JSON.stringify({
          filename: selectedRestoreFile.name,
          sql: selectedRestoreSqlText,
          caller_name: currentUser.full_name,
          caller_email: currentUser.email || `${currentUser.username}@casaamara.ph`
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast(`Database successfully restored! (Safety backup: ${result.safety_backup})`);
        closeRestoreModal();
        clearSelectedFile();

        // Refresh all local dashboard data
        await loadData();
        await loadBackupSectionInfo();
        if (typeof loadActivityLogs === 'function') loadActivityLogs();
        if (typeof loadStaff === 'function') loadStaff();
      } else {
        showToast(result.error || 'Failed to restore database.');
        if (result.safety_backup) {
          console.warn('Safety backup was preserved on server:', result.safety_backup);
        }
      }
    } catch (err) {
      console.error('Database restore error:', err);
      showToast('Network error while processing database restoration.');
    } finally {
      btnExecuteDatabaseRestore.disabled = false;
      if (btnExecuteRestoreText) btnExecuteRestoreText.textContent = 'Yes, Restore Database';
    }
  });

});
