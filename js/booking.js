/**
 * CASA AMARA BOUTIQUE HOTEL
 * Interactive Multi-step Booking Flow (6 Steps)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Booking State
  const bookingState = {
    currentStep: 1,
    checkin: '10/27/2026',
    checkout: '10/30/2026',
    guests: 2,
    nights: 3,
    room: {
      id: 'deluxe',
      name: 'Deluxe Room',
      price: 8200,
      thumb: 'assets/images/deluxe-room.jpg',
      tag: 'Deluxe room',
      room_number: '101',
      floor_number: '1st Floor (Garden Wing)',
      available_units: 6
    },
    guest: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      requests: ''
    },
    paymentMethod: 'card'
  };

  // Date parsing and night calculation helpers
  function parseDate(str) {
    if (!str) return null;
    const s = String(str).trim();
    // MM/DD/YYYY format
    const slashParts = s.split('/');
    if (slashParts.length === 3) {
      const m = parseInt(slashParts[0], 10) - 1;
      const d = parseInt(slashParts[1], 10);
      const y = parseInt(slashParts[2], 10);
      const dt = new Date(y, m, d);
      if (!isNaN(dt.getTime())) return dt;
    }
    // YYYY-MM-DD format
    const isoParts = s.split('-');
    if (isoParts.length === 3) {
      const y = parseInt(isoParts[0], 10);
      const m = parseInt(isoParts[1], 10) - 1;
      const d = parseInt(isoParts[2], 10);
      const dt = new Date(y, m, d);
      if (!isNaN(dt.getTime())) return dt;
    }
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt;
  }

  function formatShortDate(date) {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function calculateNights(cinStr, coutStr) {
    const cin = parseDate(cinStr);
    const cout = parseDate(coutStr);
    if (cin && cout) {
      const diffMs = cout.getTime() - cin.getTime();
      const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : 1;
    }
    return 3;
  }

  function parseSlashToIso(slashDate) {
    if (!slashDate) return '';
    const parts = String(slashDate).trim().split('/');
    if (parts.length === 3) {
      const m = parts[0].padStart(2, '0');
      const d = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
    return '';
  }

  function parseIsoToSlash(isoDate) {
    if (!isoDate) return '';
    const parts = String(isoDate).trim().split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${m}/${d}/${y}`;
    }
    return '';
  }

  // 1. Check URL parameters and sessionStorage to pre-fill Step 1 & select room
  const urlParams = new URLSearchParams(window.location.search);
  const paramRoom = urlParams.get('room');
  let paramCheckin = urlParams.get('checkin');
  let paramCheckout = urlParams.get('checkout');
  let paramGuests = urlParams.get('guests');

  // Fallback to session storage if not explicitly passed in URL
  try {
    if (!paramCheckin) paramCheckin = sessionStorage.getItem('ca_search_checkin');
    if (!paramCheckout) paramCheckout = sessionStorage.getItem('ca_search_checkout');
    if (!paramGuests) paramGuests = sessionStorage.getItem('ca_search_guests');
  } catch (e) {}

  // Auto-fill Step 1 inputs and booking state
  const inCheckin = document.getElementById('inCheckin');
  const inCheckout = document.getElementById('inCheckout');
  const inGuests = document.getElementById('inGuests');

  let wasPrefilled = false;
  if (paramCheckin) {
    bookingState.checkin = paramCheckin;
    if (inCheckin) inCheckin.value = paramCheckin;
    wasPrefilled = true;
  }
  if (paramCheckout) {
    bookingState.checkout = paramCheckout;
    if (inCheckout) inCheckout.value = paramCheckout;
    wasPrefilled = true;
  }
  if (paramGuests) {
    bookingState.guests = parseInt(paramGuests, 10) || 2;
    if (inGuests) inGuests.value = bookingState.guests;
    wasPrefilled = true;
  }

  // Visual confirmation glow on pre-filled inputs
  if (wasPrefilled) {
    [inCheckin, inCheckout, inGuests].forEach(el => {
      if (el) {
        el.classList.add('input-prefilled-highlight');
        setTimeout(() => el.classList.remove('input-prefilled-highlight'), 2200);
      }
    });
  }

  // Room pre-selection
  if (paramRoom) {
    const roomMap = {
      'deluxe': { name: 'Deluxe Room', price: 8200, thumb: 'assets/images/deluxe-room.jpg', tag: 'Deluxe room', floor_number: '1st Floor (Garden Wing)', room_number: '101' },
      'executive': { name: 'Executive Room', price: 11500, thumb: 'assets/images/executive-room.jpg', tag: 'Executive room', floor_number: '2nd Floor (Skyline Wing)', room_number: '201' },
      'family': { name: 'Family Room', price: 9800, thumb: 'assets/images/family-room.jpg', tag: 'Family room', floor_number: 'Ground Floor (Poolside)', room_number: '109' },
      'premium': { name: 'Premium Suite', price: 14500, thumb: 'assets/images/premium-suite.jpg', tag: 'Premium suite', floor_number: '3rd Floor (Penthouse Level)', room_number: '301' },
      'executive-garden-suite': { name: 'Executive Garden Suite', price: 12800, thumb: 'assets/images/executive-garden-suite.jpg', tag: 'Executive suite', floor_number: '3rd Floor', room_number: '302' },
      'master-s-villa': { name: "Master's Villa", price: 9000, thumb: 'assets/images/executive-room.jpg', tag: 'Villa luxury', floor_number: '2nd Floor', room_number: '206' }
    };
    if (roomMap[paramRoom]) {
      bookingState.room.id = paramRoom;
      bookingState.room.name = roomMap[paramRoom].name;
      bookingState.room.price = roomMap[paramRoom].price;
      bookingState.room.thumb = roomMap[paramRoom].thumb;
      bookingState.room.tag = roomMap[paramRoom].tag;
      bookingState.room.floor_number = roomMap[paramRoom].floor_number;
      bookingState.room.room_number = roomMap[paramRoom].room_number;
    }
  }

  // Wire up Step 1 native date pickers
  const inCheckinPicker = document.getElementById('inCheckinPicker');
  const inCheckoutPicker = document.getElementById('inCheckoutPicker');
  const btnPickInCheckin = document.getElementById('btnPickInCheckin');
  const btnPickInCheckout = document.getElementById('btnPickInCheckout');

  if (inCheckinPicker && inCheckin) {
    inCheckinPicker.value = parseSlashToIso(inCheckin.value);
    btnPickInCheckin?.addEventListener('click', () => {
      inCheckinPicker.value = parseSlashToIso(inCheckin.value);
      if (typeof inCheckinPicker.showPicker === 'function') {
        inCheckinPicker.showPicker();
      } else {
        inCheckinPicker.focus();
      }
    });
    inCheckinPicker.addEventListener('change', () => {
      if (inCheckinPicker.value) {
        inCheckin.value = parseIsoToSlash(inCheckinPicker.value);
        updateCalculations();
      }
    });
  }

  if (inCheckoutPicker && inCheckout) {
    inCheckoutPicker.value = parseSlashToIso(inCheckout.value);
    btnPickInCheckout?.addEventListener('click', () => {
      inCheckoutPicker.value = parseSlashToIso(inCheckout.value);
      if (typeof inCheckoutPicker.showPicker === 'function') {
        inCheckoutPicker.showPicker();
      } else {
        inCheckoutPicker.focus();
      }
    });
    inCheckoutPicker.addEventListener('change', () => {
      if (inCheckoutPicker.value) {
        inCheckout.value = parseIsoToSlash(inCheckoutPicker.value);
        updateCalculations();
      }
    });
  }

  // 2. Stepper Management
  function goToStep(stepNumber) {
    bookingState.currentStep = stepNumber;

    // Show only active pane
    document.querySelectorAll('.step-pane').forEach((pane, idx) => {
      pane.style.display = (idx + 1 === stepNumber) ? 'block' : 'none';
    });

    // Update stepper nodes
    const stepNodes = document.querySelectorAll('.step-node');
    stepNodes.forEach((node) => {
      const nodeStep = parseInt(node.getAttribute('data-step'), 10);
      const bubble = node.querySelector('.step-node-bubble');

      node.classList.remove('active', 'completed');
      if (nodeStep < stepNumber) {
        node.classList.add('completed');
        bubble.innerHTML = '&#10003;'; // Checkmark
      } else if (nodeStep === stepNumber) {
        node.classList.add('active');
        if (stepNumber === 6) {
          node.classList.add('completed');
          bubble.innerHTML = '&#10003;';
        } else {
          bubble.textContent = nodeStep;
        }
      } else {
        bubble.textContent = nodeStep;
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateCalculations();
  }

  // Allow clicking completed step nodes in stepper
  document.querySelectorAll('.step-node').forEach(node => {
    node.addEventListener('click', () => {
      const targetStep = parseInt(node.getAttribute('data-step'), 10);
      if (targetStep < bookingState.currentStep && bookingState.currentStep !== 6) {
        goToStep(targetStep);
      }
    });
  });

  // 3. Calculation & Display Updates
  function updateCalculations() {
    // Read current form inputs
    const inCinEl = document.getElementById('inCheckin');
    const inCoutEl = document.getElementById('inCheckout');
    const inGuestsEl = document.getElementById('inGuests');

    if (inCinEl) bookingState.checkin = inCinEl.value.trim() || '10/27/2026';
    if (inCoutEl) bookingState.checkout = inCoutEl.value.trim() || '10/30/2026';
    if (inGuestsEl) bookingState.guests = parseInt(inGuestsEl.value, 10) || 2;

    bookingState.nights = calculateNights(bookingState.checkin, bookingState.checkout);

    const cinDate = parseDate(bookingState.checkin);
    const coutDate = parseDate(bookingState.checkout);
    const cinFormatted = cinDate ? formatShortDate(cinDate) : bookingState.checkin;
    const coutFormatted = coutDate ? formatShortDate(coutDate) : bookingState.checkout;

    // Update Step 2 summary text
    const step2DateSummary = document.getElementById('step2DateSummary');
    if (step2DateSummary) {
      step2DateSummary.textContent = `${cinFormatted}–${coutFormatted} · ${bookingState.guests} guest${bookingState.guests > 1 ? 's' : ''}`;
    }

    // Money calculations
    const subtotal = bookingState.room.price * bookingState.nights;
    const taxes = Math.round(subtotal * 0.12); // 12% VAT/Service
    const total = subtotal + taxes;
    const deposit30 = Math.round(total * 0.30);

    const fmt = (num) => '₱' + num.toLocaleString('en-US');

    // Step 4 (Review) updates
    const reviewRoomImg = document.getElementById('reviewRoomImg');
    if (reviewRoomImg) reviewRoomImg.src = bookingState.room.thumb;

    const reviewRoomTag = document.getElementById('reviewRoomTag');
    if (reviewRoomTag) reviewRoomTag.textContent = bookingState.room.tag;

    const reviewRoomTitle = document.getElementById('reviewRoomTitle');
    if (reviewRoomTitle) reviewRoomTitle.textContent = bookingState.room.name;

    const reviewRoomNumTxt = document.getElementById('reviewRoomNumTxt');
    if (reviewRoomNumTxt) {
      reviewRoomNumTxt.textContent = `Room ${bookingState.room.room_number || '101'}`;
    }
    const reviewRoomFloorTxt = document.getElementById('reviewRoomFloorTxt');
    if (reviewRoomFloorTxt) {
      reviewRoomFloorTxt.textContent = bookingState.room.floor_number || '';
    }

    const reviewCheckinTxt = document.getElementById('reviewCheckinTxt');
    if (reviewCheckinTxt) reviewCheckinTxt.textContent = cinFormatted;

    const reviewCheckoutTxt = document.getElementById('reviewCheckoutTxt');
    if (reviewCheckoutTxt) reviewCheckoutTxt.textContent = coutFormatted;

    const reviewStayMeta = document.getElementById('reviewStayMeta');
    if (reviewStayMeta) {
      reviewStayMeta.textContent = `${bookingState.nights} night${bookingState.nights > 1 ? 's' : ''} · ${bookingState.guests} guest${bookingState.guests > 1 ? 's' : ''} · 1 room`;
    }

    const priceFormulaTxt = document.getElementById('priceFormulaTxt');
    if (priceFormulaTxt) priceFormulaTxt.textContent = `${fmt(bookingState.room.price)} × ${bookingState.nights} night${bookingState.nights > 1 ? 's' : ''}`;

    const priceSubtotalTxt = document.getElementById('priceSubtotalTxt');
    if (priceSubtotalTxt) priceSubtotalTxt.textContent = fmt(subtotal);

    const priceTaxTxt = document.getElementById('priceTaxTxt');
    if (priceTaxTxt) priceTaxTxt.textContent = fmt(taxes);

    const priceTotalTxt = document.getElementById('priceTotalTxt');
    if (priceTotalTxt) priceTotalTxt.textContent = fmt(total);

    // Guest Info updates in Step 4
    const firstName = (document.getElementById('inFirstName')?.value || '').trim();
    const lastName = (document.getElementById('inLastName')?.value || '').trim();
    const email = (document.getElementById('inEmail')?.value || '').trim();
    const phone = (document.getElementById('inPhone')?.value || '').trim();

    bookingState.guest = { firstName, lastName, email, phone };

    const reviewGuestName = document.getElementById('reviewGuestName');
    if (reviewGuestName) reviewGuestName.textContent = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : '—';

    const reviewGuestEmail = document.getElementById('reviewGuestEmail');
    if (reviewGuestEmail) reviewGuestEmail.textContent = email || '—';

    const reviewGuestPhone = document.getElementById('reviewGuestPhone');
    if (reviewGuestPhone) reviewGuestPhone.textContent = phone || '—';

    // Step 5 (Payment) updates
    const cardDepositSub = document.getElementById('cardDepositSub');
    if (cardDepositSub) cardDepositSub.textContent = `Simulated 30% deposit of ${fmt(deposit30)}`;

    const payStayRoomTitle = document.getElementById('payStayRoomTitle');
    if (payStayRoomTitle) payStayRoomTitle.textContent = `${bookingState.room.name} · Room ${bookingState.room.room_number || '101'}`;

    const payStayDates = document.getElementById('payStayDates');
    if (payStayDates) {
      payStayDates.textContent = `${cinFormatted}–${coutFormatted} · ${bookingState.nights} night${bookingState.nights > 1 ? 's' : ''}`;
    }

    const payStaySubtotal = document.getElementById('payStaySubtotal');
    if (payStaySubtotal) payStaySubtotal.textContent = fmt(subtotal);

    const payStayTax = document.getElementById('payStayTax');
    if (payStayTax) payStayTax.textContent = fmt(taxes);

    const payStayTotal = document.getElementById('payStayTotal');
    if (payStayTotal) payStayTotal.textContent = fmt(total);

    // Step 6 (Confirmation) updates
    const confEmailSpan = document.getElementById('confEmailSpan');
    if (confEmailSpan) confEmailSpan.textContent = email;

    const confEmailHintSpan = document.getElementById('confEmailHintSpan');
    if (confEmailHintSpan) confEmailHintSpan.textContent = email;

    const confColGuest = document.getElementById('confColGuest');
    if (confColGuest) confColGuest.textContent = `${firstName} ${lastName}`;

    const confColParty = document.getElementById('confColParty');
    if (confColParty) confColParty.textContent = `${bookingState.guests} guest${bookingState.guests > 1 ? 's' : ''}`;

    const confColCheckin = document.getElementById('confColCheckin');
    if (confColCheckin) confColCheckin.textContent = cinFormatted;

    const confColCheckout = document.getElementById('confColCheckout');
    if (confColCheckout) confColCheckout.textContent = `to ${coutFormatted}`;

    const confColRoom = document.getElementById('confColRoom');
    if (confColRoom) confColRoom.textContent = bookingState.room.name;

    const confColNights = document.getElementById('confColNights');
    if (confColNights) confColNights.textContent = `Room ${bookingState.room.room_number || '101'} · ${bookingState.nights} night${bookingState.nights > 1 ? 's' : ''}`;

    const confColPayStatus = document.getElementById('confColPayStatus');
    const confColPayAmount = document.getElementById('confColPayAmount');
    if (bookingState.paymentMethod === 'hotel') {
      if (confColPayStatus) confColPayStatus.textContent = 'Pending';
      if (confColPayAmount) confColPayAmount.textContent = 'Pay at hotel';
    } else {
      if (confColPayStatus) confColPayStatus.textContent = 'Deposit paid';
      if (confColPayAmount) confColPayAmount.textContent = `${fmt(deposit30)} collected`;
    }
  }

  // Real-time calculation synchronization when inputs change
  ['inCheckin', 'inCheckout', 'inGuests'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        updateCalculations();
        if (typeof renderAvailableRoomCards === 'function' && cachedRooms && cachedRooms.length > 0) {
          renderAvailableRoomCards();
        }
      });
      el.addEventListener('change', () => {
        updateCalculations();
        if (typeof renderAvailableRoomCards === 'function' && cachedRooms && cachedRooms.length > 0) {
          renderAvailableRoomCards();
        }
      });
    }
  });

  ['inFirstName', 'inLastName', 'inEmail', 'inPhone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateCalculations);
      el.addEventListener('change', updateCalculations);
    }
  });

  // Cached data for room availability and date conflicts
  let cachedReservations = [];
  let cachedRooms = [];

  // Helper to extract discrete room numbers from strings, ranges (e.g., "101 - 108"), or lists
  function extractIndividualRoomNumbers(roomNumberStr) {
    if (!roomNumberStr || typeof roomNumberStr !== 'string') return [];
    const str = roomNumberStr.trim();
    const results = new Set();
    const parts = str.split(/[,;/]+/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const rangeMatch = trimmed.match(/^(\d+)\s*(?:-|–|—|to)\s*(\d+)$/i);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        if (!isNaN(start) && !isNaN(end) && start <= end && (end - start) <= 50) {
          const padLen = rangeMatch[1].length;
          for (let i = start; i <= end; i++) {
            results.add(String(i).padStart(padLen, '0'));
          }
          continue;
        }
      }
      const cleanNum = trimmed.replace(/^Room\s+/i, '').trim();
      if (cleanNum) results.add(cleanNum);
    }
    return Array.from(results);
  }

  function isOverlapping(rCheckin, rCheckout, uCheckin, uCheckout) {
    const rIn = parseDate(rCheckin);
    const rOut = parseDate(rCheckout);
    const uIn = parseDate(uCheckin);
    const uOut = parseDate(uCheckout);
    if (!rIn || !rOut || !uIn || !uOut) return false;
    return (rIn < uOut && rOut > uIn);
  }

  function renderAvailableRoomCards() {
    const listContainer = document.querySelector('.room-select-list');
    if (!listContainer || cachedRooms.length === 0) return;

    // Determine occupied room numbers for current checkin and checkout
    const occupiedRoomNumbers = new Set();
    cachedReservations.forEach(res => {
      if (isOverlapping(res.check_in, res.check_out, bookingState.checkin, bookingState.checkout)) {
        if (res.room_number) {
          occupiedRoomNumbers.add(String(res.room_number).trim());
        }
      }
    });

    listContainer.innerHTML = cachedRooms.map(r => {
      const isCardSelected = (r.id === bookingState.room.id);
      let discreteRooms = extractIndividualRoomNumbers(r.room_number);
      if (discreteRooms.length === 0 && r.room_number) {
        discreteRooms.push(r.room_number);
      }
      if (discreteRooms.length === 0) {
        discreteRooms.push('101');
      }

      // Check available units
      const availablePills = discreteRooms.filter(num => !occupiedRoomNumbers.has(num));
      const availCount = availablePills.length;
      const isSoldOut = (availCount === 0);

      // Badge style
      let badgeHtml = '';
      if (isSoldOut) {
        badgeHtml = '<span class="room-avail-badge sold-out"><span class="avail-dot"></span> Sold Out for Dates</span>';
      } else if (availCount <= 2) {
        badgeHtml = `<span class="room-avail-badge few-units"><span class="avail-dot"></span> Only ${availCount} left!</span>`;
      } else {
        badgeHtml = `<span class="room-avail-badge"><span class="avail-dot"></span> ${availCount} rooms available</span>`;
      }

      // Determine active room number for this card
      let activeRoomNum = '';
      if (isCardSelected && bookingState.room.room_number && discreteRooms.includes(bookingState.room.room_number)) {
        activeRoomNum = bookingState.room.room_number;
      } else {
        activeRoomNum = availablePills[0] || discreteRooms[0];
      }
      if (isCardSelected && !bookingState.room.room_number) {
        bookingState.room.room_number = activeRoomNum;
        bookingState.room.floor_number = r.floor_number || '';
      }

      return `
        <div class="room-select-card ${isCardSelected ? 'selected' : ''}" 
             data-room-id="${r.id}" 
             data-room-name="${r.name}" 
             data-room-price="${r.rate_per_night}" 
             data-room-thumb="${r.image || 'assets/images/deluxe-room.jpg'}"
             data-room-floor="${r.floor_number || ''}">
          <div class="room-radio-circle">
            <div class="room-radio-dot"></div>
          </div>
          <div class="room-select-thumb">
            <img src="${r.image || 'assets/images/deluxe-room.jpg'}" alt="${r.name}">
          </div>
          <div class="room-select-details">
            <div class="room-select-top-meta">
              <span class="room-select-tag">${r.badge || r.name}</span>
              ${badgeHtml}
            </div>
            <h3 class="room-select-title">${r.name}</h3>
            <p class="room-select-specs">Up to ${r.max_guests} guests · ${r.bed_config || 'King bed'}${r.floor_number ? ` · ${r.floor_number}` : ''}${r.view ? ` · ${r.view}` : ''}</p>
            
            <div class="room-numbers-chooser">
              <div class="room-numbers-chooser-header">
                <span class="room-numbers-chooser-title">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-1.5 1.5L10 13l-4 4-2-2 4-4 7.5-7.5z"></path><circle cx="7.5" cy="16.5" r="1.5"></circle></svg>
                  Choose room number:
                </span>
                <span class="room-selected-indicator" id="selInd-${r.id}">Selected: Room ${activeRoomNum}</span>
              </div>
              <div class="room-pills-wrap" data-room-id="${r.id}">
                ${discreteRooms.map(num => {
                  const isOcc = occupiedRoomNumbers.has(num);
                  const isActive = (isCardSelected && activeRoomNum === num);
                  return `
                    <button type="button" 
                            class="room-choice-pill ${isActive ? 'active' : ''} ${isOcc ? 'occupied' : ''}" 
                            data-room-num="${num}"
                            ${isOcc ? 'disabled title="Room already reserved for your chosen dates"' : `title="Select Room ${num}"`}>
                      <svg class="pill-key-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-1.5 1.5L10 13l-4 4-2-2 4-4 7.5-7.5z"></path><circle cx="7.5" cy="16.5" r="1.5"></circle></svg>
                      Room ${num}
                      ${isOcc ? '<span class="pill-occ-tag">Booked</span>' : ''}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
          <div class="room-select-price-box">
            <div class="room-select-price">₱${Number(r.rate_per_night).toLocaleString()} <span>/ night</span></div>
          </div>
        </div>
      `;
    }).join('');

    setupRoomCardEvents();
  }

  // 4. Room Card and Room Number Pill Selection
  function setupRoomCardEvents() {
    const roomCards = document.querySelectorAll('.room-select-card');
    roomCards.forEach(card => {
      const roomId = card.getAttribute('data-room-id');

      // Click on the room card itself
      card.addEventListener('click', (e) => {
        if (e.target.closest('.room-choice-pill')) return;

        roomCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        bookingState.room.id = roomId;
        bookingState.room.name = card.getAttribute('data-room-name');
        bookingState.room.price = parseInt(card.getAttribute('data-room-price'), 10);
        bookingState.room.thumb = card.getAttribute('data-room-thumb');
        bookingState.room.floor_number = card.getAttribute('data-room-floor') || '';
        const tagElem = card.querySelector('.room-select-tag');
        bookingState.room.tag = tagElem ? tagElem.textContent : card.getAttribute('data-room-name');

        let activePill = card.querySelector('.room-choice-pill.active');
        if (!activePill) {
          activePill = card.querySelector('.room-choice-pill:not(.occupied)');
          if (activePill) {
            card.querySelectorAll('.room-choice-pill').forEach(p => p.classList.remove('active'));
            activePill.classList.add('active');
          }
        }
        if (activePill) {
          const chosenNum = activePill.getAttribute('data-room-num');
          bookingState.room.room_number = chosenNum;
          const ind = document.getElementById(`selInd-${roomId}`);
          if (ind) ind.textContent = `Selected: Room ${chosenNum}`;
        }

        updateCalculations();
      });

      // Click on individual room pills within the card
      const pills = card.querySelectorAll('.room-choice-pill');
      pills.forEach(pill => {
        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          if (pill.classList.contains('occupied') || pill.disabled) return;

          roomCards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');

          pills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');

          const chosenNum = pill.getAttribute('data-room-num');
          bookingState.room.id = roomId;
          bookingState.room.name = card.getAttribute('data-room-name');
          bookingState.room.price = parseInt(card.getAttribute('data-room-price'), 10);
          bookingState.room.thumb = card.getAttribute('data-room-thumb');
          bookingState.room.floor_number = card.getAttribute('data-room-floor') || '';
          bookingState.room.room_number = chosenNum;
          const tagElem = card.querySelector('.room-select-tag');
          bookingState.room.tag = tagElem ? tagElem.textContent : card.getAttribute('data-room-name');

          const ind = document.getElementById(`selInd-${roomId}`);
          if (ind) ind.textContent = `Selected: Room ${chosenNum}`;

          updateCalculations();
        });
      });
    });
  }

  async function loadPublishedRooms() {
    try {
      const [roomsRes, resRes] = await Promise.all([
        fetch('/api/rooms').catch(() => null),
        fetch('/api/reservations').catch(() => null)
      ]);

      if (resRes && resRes.ok) {
        cachedReservations = await resRes.json();
      }
      if (roomsRes && roomsRes.ok) {
        const rooms = await roomsRes.json();
        cachedRooms = (rooms || []).map(r => {
          let resolvedImg = r.image || 'assets/images/deluxe-room.jpg';
          if (r.image && typeof r.image === 'object' && Array.isArray(r.image.data)) {
            try {
              resolvedImg = new TextDecoder('utf-8').decode(new Uint8Array(r.image.data));
            } catch (e) {
              resolvedImg = 'assets/images/deluxe-room.jpg';
            }
          }
          return {
            ...r,
            image: resolvedImg
          };
        }).filter(r => r.status === 'available');

        if (cachedRooms.length > 0) {
          renderAvailableRoomCards();
          return;
        }
      }
    } catch (e) {
      console.log('Using static fallback for rooms:', e);
    }
    setupRoomCardEvents();
  }

  loadPublishedRooms();

  // 5. Payment Option Selection
  const payOptions = document.querySelectorAll('.payment-option-card');
  payOptions.forEach(card => {
    card.addEventListener('click', () => {
      payOptions.forEach(c => {
        c.classList.remove('selected');
        c.querySelector('.room-radio-dot').style.opacity = '0';
      });
      card.classList.add('selected');
      card.querySelector('.room-radio-dot').style.opacity = '1';

      const method = card.getAttribute('data-pay-method');
      bookingState.paymentMethod = method;

      const cardInputs = document.getElementById('cardInputsContainer');
      if (cardInputs) {
        cardInputs.style.display = (method === 'card') ? 'block' : 'none';
      }
    });
  });

  // 6. Validation for Step 3: Guest Information
  function validateStep3() {
    let isValid = true;
    let firstInvalidInput = null;

    const inFirstName = document.getElementById('inFirstName');
    const inLastName = document.getElementById('inLastName');
    const inEmail = document.getElementById('inEmail');
    const inPhone = document.getElementById('inPhone');

    const errFirstName = document.getElementById('errFirstName');
    const errLastName = document.getElementById('errLastName');
    const errEmail = document.getElementById('errEmail');
    const errPhone = document.getElementById('errPhone');

    function setFieldState(input, errElem, hasError, msg) {
      if (hasError) {
        isValid = false;
        if (input) {
          input.classList.add('input-error');
          input.classList.remove('shake');
          void input.offsetWidth; // re-trigger animation
          input.classList.add('shake');
        }
        if (errElem) {
          if (msg) errElem.textContent = msg;
          errElem.classList.add('visible');
        }
        if (!firstInvalidInput && input) {
          firstInvalidInput = input;
        }
      } else {
        if (input) input.classList.remove('input-error', 'shake');
        if (errElem) errElem.classList.remove('visible');
      }
    }

    // 1. Validate First Name (letters only, numbers restricted)
    const firstNameVal = (inFirstName?.value || '').trim();
    const nameRegex = /^[A-Za-z\s\.\-']+$/;
    if (firstNameVal.length === 0) {
      setFieldState(inFirstName, errFirstName, true, 'Please enter your first name.');
    } else if (!nameRegex.test(firstNameVal)) {
      setFieldState(inFirstName, errFirstName, true, 'First name must contain letters only (numbers are restricted).');
    } else {
      setFieldState(inFirstName, errFirstName, false);
    }

    // 2. Validate Last Name (letters only, numbers restricted)
    const lastNameVal = (inLastName?.value || '').trim();
    if (lastNameVal.length === 0) {
      setFieldState(inLastName, errLastName, true, 'Please enter your last name.');
    } else if (!nameRegex.test(lastNameVal)) {
      setFieldState(inLastName, errLastName, true, 'Last name must contain letters only (numbers are restricted).');
    } else {
      setFieldState(inLastName, errLastName, false);
    }

    // 3. Validate Email (@ is required, example: gmail.com)
    const emailVal = (inEmail?.value || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailVal.length === 0) {
      setFieldState(inEmail, errEmail, true, 'Please enter your email address.');
    } else if (!emailVal.includes('@')) {
      setFieldState(inEmail, errEmail, true, 'Email address must include an "@" (e.g. maria.santos@gmail.com).');
    } else if (!emailRegex.test(emailVal)) {
      setFieldState(inEmail, errEmail, true, 'Please enter a valid email address (e.g. maria.santos@gmail.com).');
    } else {
      setFieldState(inEmail, errEmail, false);
    }

    // 4. Validate Phone Number (must be exactly 11 digits, e.g. 0914 557 6321)
    const phoneVal = (inPhone?.value || '').trim();
    const digitsOnly = phoneVal.replace(/\D/g, '');
    if (phoneVal.length === 0) {
      setFieldState(inPhone, errPhone, true, 'Please enter your contact phone number.');
    } else if (digitsOnly.length !== 11) {
      setFieldState(inPhone, errPhone, true, 'Please enter a valid 11-digit mobile number (e.g. 0914 557 6321).');
    } else {
      setFieldState(inPhone, errPhone, false);
    }

    if (!isValid && firstInvalidInput) {
      firstInvalidInput.focus();
    }

    return isValid;
  }

  // Clear validation errors dynamically as the user types, and allow Enter key to proceed
  ['inFirstName', 'inLastName', 'inEmail', 'inPhone'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', () => {
        if (input.value.trim().length > 0) {
          input.classList.remove('input-error', 'shake');
          const errElem = document.getElementById('err' + id.replace('in', ''));
          if (errElem) errElem.classList.remove('visible');
        }
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('btnToStep4')?.click();
        }
      });
    }
  });

  // 7. Validation for Step 5: Payment
  function validatePayment() {
    let isValid = true;
    let firstInvalidInput = null;

    const inCardNum = document.getElementById('inCardNum');
    const inExpiry = document.getElementById('inExpiry');
    const inCvv = document.getElementById('inCvv');

    const errCardNum = document.getElementById('errCardNum');
    const errExpiry = document.getElementById('errExpiry');
    const errCvv = document.getElementById('errCvv');

    function setPaymentFieldState(input, errElem, hasError, msg) {
      if (hasError) {
        isValid = false;
        if (input) {
          input.classList.add('input-error');
          input.classList.remove('shake');
          void input.offsetWidth; // re-trigger animation
          input.classList.add('shake');
        }
        if (errElem) {
          if (msg) errElem.textContent = msg;
          errElem.classList.add('visible');
        }
        if (!firstInvalidInput && input) {
          firstInvalidInput = input;
        }
      } else {
        if (input) input.classList.remove('input-error', 'shake');
        if (errElem) errElem.classList.remove('visible');
      }
    }

    // 1. Validate Card Number
    const cardVal = (inCardNum?.value || '').trim();
    const cardDigits = cardVal.replace(/\D/g, '');
    if (cardVal.length === 0) {
      setPaymentFieldState(inCardNum, errCardNum, true, 'Card number is required');
    } else if (cardDigits.length < 13 || cardDigits.length > 19) {
      setPaymentFieldState(inCardNum, errCardNum, true, 'Please enter a valid card number');
    } else {
      setPaymentFieldState(inCardNum, errCardNum, false);
    }

    // 2. Validate Expiry
    const expVal = (inExpiry?.value || '').trim();
    if (expVal.length === 0) {
      setPaymentFieldState(inExpiry, errExpiry, true, 'Expiry date is required');
    } else if (!/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(expVal)) {
      setPaymentFieldState(inExpiry, errExpiry, true, 'Please enter MM/YY format');
    } else {
      setPaymentFieldState(inExpiry, errExpiry, false);
    }

    // 3. Validate CVV
    const cvvVal = (inCvv?.value || '').trim();
    const cvvDigits = cvvVal.replace(/\D/g, '');
    if (cvvVal.length === 0) {
      setPaymentFieldState(inCvv, errCvv, true, 'CVV is required');
    } else if (cvvDigits.length < 3 || cvvDigits.length > 4) {
      setPaymentFieldState(inCvv, errCvv, true, 'Please enter a valid CVV (3-4 digits)');
    } else {
      setPaymentFieldState(inCvv, errCvv, false);
    }

    if (!isValid && firstInvalidInput) {
      firstInvalidInput.focus();
    }

    return isValid;
  }

  // Clear payment validation errors dynamically and show required error when blurred blank
  ['inCardNum', 'inExpiry', 'inCvv'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', () => {
        if (input.value.trim().length > 0) {
          input.classList.remove('input-error', 'shake');
          const errElem = document.getElementById('err' + id.replace('in', ''));
          if (errElem) errElem.classList.remove('visible');
        }
      });
      input.addEventListener('blur', () => {
        if (input.value.trim().length === 0) {
          input.classList.add('input-error');
          const errElem = document.getElementById('err' + id.replace('in', ''));
          if (errElem) {
            errElem.textContent = id === 'inCardNum' ? 'Card number is required' : (id === 'inExpiry' ? 'Expiry date is required' : 'CVV is required');
            errElem.classList.add('visible');
          }
        }
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('btnConfirmBooking')?.click();
        }
      });
    }
  });

  // Phone number auto-spacing and maximum 11 digits (e.g. 0914 557 6321)
  const phoneInput = document.getElementById('inPhone');
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      let digits = phoneInput.value.replace(/\D/g, '').substring(0, 11);
      let formatted = digits;
      if (digits.length > 7) {
        formatted = `${digits.substring(0, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}`;
      } else if (digits.length > 4) {
        formatted = `${digits.substring(0, 4)} ${digits.substring(4)}`;
      }
      phoneInput.value = formatted;
    });

    phoneInput.addEventListener('keydown', (e) => {
      // Allow navigation and functional keys
      if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'].includes(e.key) || e.ctrlKey || e.metaKey) {
        return;
      }
      // Block non-digit keys
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        return;
      }
      // Enforce 11-digit maximum
      const currentDigits = (phoneInput.value || '').replace(/\D/g, '');
      if (currentDigits.length >= 11 && phoneInput.selectionStart === phoneInput.selectionEnd) {
        e.preventDefault();
      }
    });
  }

  // Name fields: numbers are restricted and should be letters only
  ['inFirstName', 'inLastName'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        // Strip numbers immediately on type or paste
        const cleaned = el.value.replace(/[0-9]/g, '');
        if (el.value !== cleaned) {
          el.value = cleaned;
        }
      });
      el.addEventListener('keydown', (e) => {
        // Prevent typing numbers directly
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
        }
      });
    }
  });

  // Card formatting helpers
  const cardNumInput = document.getElementById('inCardNum');
  if (cardNumInput) {
    cardNumInput.addEventListener('input', () => {
      let digits = cardNumInput.value.replace(/\D/g, '').substring(0, 16);
      let formatted = digits.match(/.{1,4}/g)?.join(' ') || digits;
      cardNumInput.value = formatted;
    });
  }

  const expiryInput = document.getElementById('inExpiry');
  if (expiryInput) {
    expiryInput.addEventListener('input', () => {
      let digits = expiryInput.value.replace(/\D/g, '').substring(0, 4);
      if (digits.length >= 2) {
        digits = digits.substring(0, 2) + '/' + digits.substring(2);
      }
      expiryInput.value = digits;
    });
  }

  const cvvInput = document.getElementById('inCvv');
  if (cvvInput) {
    cvvInput.addEventListener('input', () => {
      cvvInput.value = cvvInput.value.replace(/\D/g, '').substring(0, 4);
    });
  }

  // 8. Step Transitions
  document.getElementById('btnToStep2')?.addEventListener('click', () => goToStep(2));
  document.getElementById('btnBackToStep1')?.addEventListener('click', () => goToStep(1));

  document.getElementById('btnToStep3')?.addEventListener('click', () => goToStep(3));
  document.getElementById('btnBackToStep2')?.addEventListener('click', () => goToStep(2));

  document.getElementById('btnToStep4')?.addEventListener('click', () => {
    if (validateStep3()) {
      goToStep(4);
    }
  });
  document.getElementById('btnBackToStep3')?.addEventListener('click', () => goToStep(3));

  document.getElementById('btnToStep5')?.addEventListener('click', () => goToStep(5));
  document.getElementById('btnBackToStep4')?.addEventListener('click', () => goToStep(4));

  // --- OTP Verification Logic & Modal Management ---
  const otpModal = document.getElementById('otpModalBackdrop');
  const otpDigitInput = document.getElementById('otpDigitInput');
  const otpErrorMsg = document.getElementById('otpErrorMsg');
  const otpCountdownTimer = document.getElementById('otpCountdownTimer');
  const btnResendOtp = document.getElementById('btnResendOtp');
  const btnCancelOtp = document.getElementById('btnCancelOtp');
  const btnVerifyOtp = document.getElementById('btnVerifyOtp');
  const otpRecipientEmail = document.getElementById('otpRecipientEmail');

  let otpExpiryInterval = null;
  let otpResendInterval = null;
  let otpExpiresAt = 0;
  let otpResendAvailableAt = 0;
  let currentVerificationToken = null;
  let otpResendsRemaining = 3;

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function startOtpTimers() {
    clearInterval(otpExpiryInterval);
    clearInterval(otpResendInterval);

    otpExpiresAt = Date.now() + 5 * 60 * 1000;
    otpResendAvailableAt = Date.now() + 60 * 1000;

    if (btnResendOtp) {
      btnResendOtp.disabled = true;
      if (otpResendsRemaining > 0) {
        btnResendOtp.textContent = 'Resend Code (60s)';
      } else {
        btnResendOtp.textContent = 'Resend limit reached (0 left)';
      }
    }

    otpExpiryInterval = setInterval(() => {
      const remainingSecs = Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000));
      if (otpCountdownTimer) {
        otpCountdownTimer.innerHTML = `Expires in: <strong>${formatTime(remainingSecs)}</strong>`;
      }
      if (remainingSecs <= 0) {
        clearInterval(otpExpiryInterval);
        if (otpErrorMsg) {
          otpErrorMsg.textContent = 'Verification code has expired. Please request a new code.';
          otpErrorMsg.classList.add('visible');
        }
      }
    }, 1000);

    otpResendInterval = setInterval(() => {
      const remainingSecs = Math.max(0, Math.ceil((otpResendAvailableAt - Date.now()) / 1000));
      if (remainingSecs > 0) {
        if (btnResendOtp) {
          btnResendOtp.disabled = true;
          if (otpResendsRemaining > 0) {
            btnResendOtp.textContent = `Resend Code (${remainingSecs}s)`;
          } else {
            btnResendOtp.textContent = 'Resend limit reached (0 left)';
          }
        }
      } else {
        clearInterval(otpResendInterval);
        if (btnResendOtp) {
          if (otpResendsRemaining > 0) {
            btnResendOtp.disabled = false;
            btnResendOtp.textContent = `Resend Code (${otpResendsRemaining} left)`;
          } else {
            btnResendOtp.disabled = true;
            btnResendOtp.textContent = 'Resend limit reached (0 left)';
          }
        }
      }
    }, 1000);
  }

  function stopOtpTimers() {
    clearInterval(otpExpiryInterval);
    clearInterval(otpResendInterval);
  }

  function openOtpModal(email, resendsRemaining = 3) {
    if (typeof resendsRemaining === 'number') {
      otpResendsRemaining = resendsRemaining;
    }
    if (otpRecipientEmail) otpRecipientEmail.textContent = email;
    if (otpDigitInput) otpDigitInput.value = '';
    if (otpErrorMsg) {
      otpErrorMsg.textContent = '';
      otpErrorMsg.classList.remove('visible');
    }
    if (otpModal) {
      otpModal.style.display = 'flex';
      void otpModal.offsetWidth;
      otpModal.classList.add('active');
    }
    startOtpTimers();
    setTimeout(() => {
      otpDigitInput?.focus();
    }, 150);
  }

  function closeOtpModal() {
    stopOtpTimers();
    if (otpModal) {
      otpModal.classList.remove('active');
      setTimeout(() => {
        otpModal.style.display = 'none';
      }, 200);
    }
  }

  btnCancelOtp?.addEventListener('click', closeOtpModal);

  // Auto clean / format 6 digits in OTP input
  otpDigitInput?.addEventListener('input', () => {
    otpDigitInput.value = otpDigitInput.value.replace(/\D/g, '').substring(0, 6);
    if (otpErrorMsg) {
      otpErrorMsg.textContent = '';
      otpErrorMsg.classList.remove('visible');
    }
  });

  otpDigitInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      btnVerifyOtp?.click();
    }
  });

  btnResendOtp?.addEventListener('click', async () => {
    if (otpResendsRemaining <= 0) {
      if (otpErrorMsg) {
        otpErrorMsg.textContent = 'You have reached the maximum limit of 3 code resends. Please check your inbox or spam folder.';
        otpErrorMsg.classList.add('visible');
      }
      btnResendOtp.disabled = true;
      btnResendOtp.textContent = 'Resend limit reached (0 left)';
      return;
    }

    const email = (bookingState.guest.email || '').trim().toLowerCase();
    btnResendOtp.disabled = true;
    btnResendOtp.textContent = 'Sending...';
    try {
      const resp = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        if (typeof data.resendsRemaining === 'number') {
          otpResendsRemaining = data.resendsRemaining;
        } else {
          otpResendsRemaining = Math.max(0, otpResendsRemaining - 1);
        }
        startOtpTimers();
        if (otpErrorMsg) {
          otpErrorMsg.textContent = '';
          otpErrorMsg.classList.remove('visible');
        }
      } else {
        if (data.maxResendsReached || otpResendsRemaining <= 0) {
          otpResendsRemaining = 0;
          btnResendOtp.disabled = true;
          btnResendOtp.textContent = 'Resend limit reached (0 left)';
        } else {
          btnResendOtp.disabled = false;
          btnResendOtp.textContent = `Resend Code (${otpResendsRemaining} left)`;
        }
        if (otpErrorMsg) {
          otpErrorMsg.textContent = data.error || 'Failed to resend code.';
          otpErrorMsg.classList.add('visible');
        }
      }
    } catch (e) {
      if (otpErrorMsg) {
        otpErrorMsg.textContent = 'Network error while requesting code.';
        otpErrorMsg.classList.add('visible');
      }
      btnResendOtp.disabled = false;
      btnResendOtp.textContent = `Resend Code (${otpResendsRemaining} left)`;
    }
  });

  btnVerifyOtp?.addEventListener('click', async () => {
    const otp = (otpDigitInput?.value || '').trim();
    const email = (bookingState.guest.email || '').trim().toLowerCase();

    if (otp.length !== 6) {
      if (otpErrorMsg) {
        otpErrorMsg.textContent = 'Please enter the complete 6-digit verification code.';
        otpErrorMsg.classList.add('visible');
      }
      otpDigitInput?.focus();
      return;
    }

    btnVerifyOtp.disabled = true;
    btnVerifyOtp.textContent = 'Verifying...';

    try {
      const resp = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await resp.json();

      if (resp.ok && data.success && data.verification_token) {
        currentVerificationToken = data.verification_token;
        closeOtpModal();
        await submitReservationRequest();
      } else {
        if (otpErrorMsg) {
          otpErrorMsg.textContent = data.error || 'Verification failed. Please check the code.';
          otpErrorMsg.classList.add('visible');
        }
        otpDigitInput?.classList.add('shake');
        setTimeout(() => otpDigitInput?.classList.remove('shake'), 400);
        btnVerifyOtp.disabled = false;
        btnVerifyOtp.textContent = 'Verify & Request';
      }
    } catch (e) {
      if (otpErrorMsg) {
        otpErrorMsg.textContent = 'Network error during verification.';
        otpErrorMsg.classList.add('visible');
      }
      btnVerifyOtp.disabled = false;
      btnVerifyOtp.textContent = 'Verify & Request';
    }
  });

  async function submitReservationRequest() {
    const btnConfirm = document.getElementById('btnConfirmBooking');
    if (btnConfirm) {
      btnConfirm.disabled = true;
      btnConfirm.textContent = 'Submitting request...';
    }

    const refCode = 'CA-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
    const confCodeEl = document.getElementById('confBookingRefCode');
    if (confCodeEl) confCodeEl.textContent = refCode;

    const subtotal = bookingState.room.price * bookingState.nights;
    const taxes = Math.round(subtotal * 0.12);
    const total = subtotal + taxes;

    let assignedRoomNumber = bookingState.room.room_number || '';
    if (!assignedRoomNumber) {
      const roomNumMap = {
        'deluxe': '105',
        'executive': '203',
        'family': '111',
        'premium': '302',
        'villa': '207'
      };
      assignedRoomNumber = roomNumMap[bookingState.room.id] || '101';
    }

    const confColNightsEl = document.getElementById('confColNights');
    if (confColNightsEl) {
      confColNightsEl.textContent = `Room ${assignedRoomNumber} · ${bookingState.nights} night${bookingState.nights > 1 ? 's' : ''}`;
    }

    const confColPayStatus = document.getElementById('confColPayStatus');
    const confColPayAmount = document.getElementById('confColPayAmount');
    if (confColPayStatus) confColPayStatus.textContent = 'Pending Approval';
    if (confColPayAmount) confColPayAmount.textContent = 'Awaiting hotel review';

    const newReservationRecord = {
      reference_id: refCode,
      guest_name: `${bookingState.guest.firstName} ${bookingState.guest.lastName}`,
      email: bookingState.guest.email,
      phone: bookingState.guest.phone,
      room_type_id: bookingState.room.id,
      room_name: bookingState.room.name,
      room_number: assignedRoomNumber,
      check_in: bookingState.checkin,
      check_out: bookingState.checkout,
      nights: bookingState.nights,
      guests: parseInt(bookingState.guests, 10),
      total_amount: total,
      payment_status: 'Pending',
      special_requests: document.getElementById('inRequests')?.value || '',
      verification_token: currentVerificationToken
    };

    try {
      await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReservationRecord)
      });
    } catch (e) {
      console.warn('API save fallback:', e);
    }

    if (btnConfirm) {
      btnConfirm.disabled = false;
      btnConfirm.textContent = 'Request Reservation';
    }

    goToStep(6);
  }

  document.getElementById('btnConfirmBooking')?.addEventListener('click', async () => {
    if (!validatePayment()) {
      return;
    }

    const email = (bookingState.guest.email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      alert('Please enter a valid guest email address in Step 3 before proceeding.');
      goToStep(3);
      document.getElementById('inEmail')?.focus();
      return;
    }

    const btnConfirm = document.getElementById('btnConfirmBooking');
    btnConfirm.disabled = true;
    btnConfirm.textContent = 'Sending verification code...';

    try {
      const resp = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await resp.json();

      if (resp.ok && data.success) {
        btnConfirm.disabled = false;
        btnConfirm.textContent = 'Request Reservation';
        const remaining = typeof data.resendsRemaining === 'number' ? data.resendsRemaining : 3;
        openOtpModal(email, remaining);
      } else {
        alert(data.error || 'Failed to send verification code. Please check your email and try again.');
        btnConfirm.disabled = false;
        btnConfirm.textContent = 'Request Reservation';
      }
    } catch (e) {
      alert('Unable to connect to verification service. Please try again.');
      btnConfirm.disabled = false;
      btnConfirm.textContent = 'Request Reservation';
    }
  });

  // Initialize calculations on first load
  updateCalculations();
});
