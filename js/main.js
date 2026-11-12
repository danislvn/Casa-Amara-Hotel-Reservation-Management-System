/**
 * CASA AMARA BOUTIQUE HOTEL
 * Main Script - Navigation, Micro-Interactions & Modals
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Sticky Navigation Scroll Effect
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // 2. Active Link Handling
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // 3. Mobile Navigation Drawer Toggle
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navMenu.classList.toggle('open');
      mobileToggle.classList.toggle('active', isOpen);
      mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close when clicking nav links
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        mobileToggle.classList.remove('active');
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close when tapping outside
    document.addEventListener('click', (e) => {
      if (!mobileToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('open');
        mobileToggle.classList.remove('active');
        mobileToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // 4. Booking Button Feedback (Friendly toast notification)
  const bookingButtons = document.querySelectorAll('button:not(.mobile-toggle), .btn-primary');
  bookingButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const actionName = btn.innerText.trim();
      if (actionName.includes('Book') || actionName.includes('dates')) {
        showToast(`Opening booking inquiry: ${actionName}...`);
      }
    });
  });

  function showToast(message) {
    let existingToast = document.querySelector('.ca-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'ca-toast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      backgroundColor: '#23201D',
      color: '#FAF7F2',
      padding: '12px 22px',
      borderRadius: '4px',
      fontSize: '13px',
      letterSpacing: '0.04em',
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      zIndex: '9999',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      transform: 'translateY(10px)',
      opacity: '0'
    });

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 350);
    }, 2800);
  }

  // 5. Room Details Registry & Dynamic Catalog Synchronization
  const ROOM_DETAILS_MAP = {
    'deluxe': {
      id: 'deluxe',
      tag: 'Deluxe room',
      title: 'Deluxe Room',
      desc: 'A serene garden-facing retreat with natural linens, handcrafted details, and a generous rainfall shower.',
      room_number: '101 - 108',
      floor_number: '1st Floor (Garden Wing)',
      specs: 'Up to 2 guests · 1 king bed · 4 rooms in hotel inventory',
      features: ['King bed', 'Garden view', 'Rain shower'],
      price: '₱8,200',
      image: 'assets/images/deluxe-room.jpg'
    },
    'executive': {
      id: 'executive',
      tag: 'Executive room',
      title: 'Executive Room',
      desc: 'An intimate room pairing a quiet private terrace with layered textures and a deep soaking tub.',
      room_number: '201 - 205',
      floor_number: '2nd Floor (Skyline Wing)',
      specs: 'Up to 3 guests · 1 king bed and daybed · 3 rooms in hotel inventory',
      features: ['Private terrace', 'King bed and daybed', 'Soaking tub'],
      price: '₱11,500',
      image: 'assets/images/executive-room.jpg'
    },
    'family': {
      id: 'family',
      tag: 'Family room',
      title: 'Family Room',
      desc: 'Generous shared space with two queen beds, serene inner courtyard lighting, and breakfast included.',
      room_number: '109 - 114',
      floor_number: 'Ground Floor (Poolside)',
      specs: 'Up to 5 guests · 2 queen beds · 3 rooms in hotel inventory',
      features: ['Two queen beds', 'Courtyard view', 'Family breakfast'],
      price: '₱9,800',
      image: 'assets/images/family-room.jpg'
    },
    'premium': {
      id: 'premium',
      tag: 'Premium suite',
      title: 'Premium Suite',
      desc: 'Our most spacious retreat, with a private lounge, bespoke furnishings, and thoughtful evening turndown.',
      room_number: '301 - 303',
      floor_number: '3rd Floor (Penthouse Level)',
      specs: 'Up to 5 guests · 1 king bed and sofa bed · 2 rooms in hotel inventory',
      features: ['Separate lounge', 'Soaking tub', 'Evening turndown'],
      price: '₱14,500',
      image: 'assets/images/premium-suite.jpg'
    }
  };

  function resolveMainRoomImage(img) {
    if (!img) return 'assets/images/deluxe-room.jpg';
    if (typeof img === 'string') return img;
    if (typeof img === 'object' && Array.isArray(img.data)) {
      try {
        const decoded = new TextDecoder('utf-8').decode(new Uint8Array(img.data));
        if (decoded && (decoded.startsWith('assets/') || decoded.startsWith('data:') || decoded.startsWith('http') || decoded.startsWith('/'))) {
          return decoded;
        }
      } catch (e) {}
    }
    return 'assets/images/deluxe-room.jpg';
  }

  function registerRoomToDetailsMap(r) {
    if (!r) return;
    const resolvedImg = resolveMainRoomImage(r.image);

    let amenitiesArr = [];
    if (Array.isArray(r.amenities)) {
      amenitiesArr = r.amenities;
    } else if (typeof r.amenities === 'string') {
      try { amenitiesArr = JSON.parse(r.amenities); } catch (e) { amenitiesArr = []; }
    }
    if (!amenitiesArr || amenitiesArr.length === 0) {
      amenitiesArr = ['Courtyard view', 'Rain shower', 'Complimentary breakfast'];
    }

    const bedText = r.bed_config || '1 king bed';
    const inventoryCount = r.inventory_units || r.available_units || 4;

    const entry = {
      id: r.id,
      tag: r.badge || r.name,
      title: r.name,
      desc: r.tagline || `${r.name} with bespoke luxury finishes, handcrafted details, and premium boutique comforts.`,
      room_number: r.room_number || '',
      floor_number: r.floor_number || '',
      specs: `Up to ${r.max_guests || 2} guests · ${bedText} · ${inventoryCount} rooms in hotel inventory`,
      features: amenitiesArr.slice(0, 4),
      price: `₱${Number(r.rate_per_night || 0).toLocaleString()}`,
      image: resolvedImg
    };

    if (r.id) {
      ROOM_DETAILS_MAP[r.id] = entry;
      ROOM_DETAILS_MAP[r.id.toLowerCase().replace(/[^a-z0-9]/g, '')] = entry;
    }
    if (r.name) {
      ROOM_DETAILS_MAP[r.name.toLowerCase().replace(/[^a-z0-9]/g, '')] = entry;
    }
  }

  const roomsCatalogGrid = document.querySelector('.rooms-catalog-grid');
  fetch('/api/rooms')
    .then(res => res.ok ? res.json() : null)
    .then(rooms => {
      if (!rooms || rooms.length === 0) return;
      rooms.forEach(r => registerRoomToDetailsMap(r));

      if (roomsCatalogGrid) {
        const liveRooms = rooms.map(r => ({
          ...r,
          image: resolveMainRoomImage(r.image)
        })).filter(r => r.status === 'available');

        if (liveRooms.length === 0) return;

        roomsCatalogGrid.innerHTML = liveRooms.map(room => {
          let amenitiesList = [];
          if (Array.isArray(room.amenities)) {
            amenitiesList = room.amenities;
          } else if (typeof room.amenities === 'string') {
            try { amenitiesList = JSON.parse(room.amenities); } catch(e) { amenitiesList = []; }
          }
          if (!amenitiesList || amenitiesList.length === 0) {
            amenitiesList = ['King bed', 'Courtyard view', 'Rain shower'];
          }

          const renderedAmenities = amenitiesList.slice(0, 3).map(a => `
            <li>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ${a}
            </li>
          `).join('');

          return `
            <article class="room-card" data-room-id="${room.id}">
              <div class="room-image-box">
                <span class="room-badge">${(room.badge || room.name).toUpperCase()}</span>
                <img src="${room.image || 'assets/images/deluxe-room.jpg'}" alt="${room.name}" loading="lazy">
              </div>
              <div class="room-content">
                <div class="room-header">
                  <h2 class="room-title">${room.name}</h2>
                  <div class="room-price">₱${Number(room.rate_per_night).toLocaleString()} <span>/ night</span></div>
                </div>
                <div class="room-meta">
                  <span class="room-meta-item">
                    <svg class="meta-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    Up to ${room.max_guests} guests
                  </span>
                  <span class="room-meta-sep">·</span>
                  <span class="room-meta-item">
                    <svg class="meta-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>
                    ${room.bed_config || '1 king bed'}
                  </span>
                </div>
                ${(room.room_number || room.floor_number) ? `
                  <div class="room-location-meta">
                    ${room.room_number ? `
                      <span class="room-loc-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        Room ${room.room_number}
                      </span>` : ''}
                    ${room.floor_number ? `
                      <span class="room-loc-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>
                        ${room.floor_number}
                      </span>` : ''}
                  </div>
                ` : ''}
                <p class="room-desc">
                  ${room.tagline || 'A serene boutique retreat with tailored luxury amenities.'}
                </p>
                <ul class="room-features">
                  ${renderedAmenities}
                </ul>
                <div class="room-actions">
                  <button type="button" class="btn-outline-dark btn-view-room" data-room-id="${room.id}">View room</button>
                  <a href="booking.html?room=${room.id}" class="btn-primary">Book now &rarr;</a>
                </div>
              </div>
            </article>
          `;
        }).join('');
      }
    })
    .catch(err => {
      console.log('Using static rooms catalog fallback.');
    });

  // 7. Scroll Reading Progress Bar
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress-bar';
  document.body.prepend(progressBar);

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = `${progress}%`;
  });

  // 8. Scroll-Driven IntersectionObserver Reveal Animations
  const revealElements = document.querySelectorAll(
    '.room-card, .dining-card, .pool-card, .amenity-feature-item, ' +
    '.about-grid > div, .reserve-direct-card, .section-header, .rooms-catalog-section .room-card'
  );

  revealElements.forEach((el, index) => {
    el.classList.add('reveal-init');
    // Stagger delay within groups
    const delay = (index % 4) * 120;
    el.style.transitionDelay = `${delay}ms`;
  });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
        // Clear stagger transition-delay once revealed so hover transitions are immediate
        setTimeout(() => {
          entry.target.style.transitionDelay = '';
        }, 900);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // 9. Floating "Back to Top" Luxury Scroll Button
  const backToTopBtn = document.createElement('button');
  backToTopBtn.className = 'back-to-top-btn';
  backToTopBtn.setAttribute('aria-label', 'Return to top of page');
  backToTopBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"></line>
      <polyline points="5 12 12 5 19 12"></polyline>
    </svg>
  `;
  document.body.appendChild(backToTopBtn);

  window.addEventListener('scroll', () => {
    if (window.scrollY > 380) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  // 10. Click Ripple Effect on Interactive CTAs
  const interactiveBtns = document.querySelectorAll('.btn-primary, .btn-outline-dark, .btn-post-room');
  interactiveBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const circle = document.createElement('span');
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.style.position = 'absolute';
      circle.style.borderRadius = '50%';
      circle.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
      circle.style.transform = 'scale(0)';
      circle.style.animation = 'rippleEffect 0.6s linear';
      circle.style.pointerEvents = 'none';

      const existingRipple = btn.querySelector('.btn-ripple');
      if (existingRipple) existingRipple.remove();

      circle.className = 'btn-ripple';
      btn.appendChild(circle);

      setTimeout(() => circle.remove(), 600);
    });
  });

  // 11. View Room Detail Modal Controller (Exact Figma Spec Replication)
  const viewRoomModal = document.getElementById('viewRoomModal');
  const closeViewRoomModalBtn = document.getElementById('closeViewRoomModal');
  const modalImg = document.getElementById('viewRoomModalImg');
  const modalTag = document.getElementById('viewRoomModalTag');
  const modalTitle = document.getElementById('viewRoomModalTitle');
  const modalDesc = document.getElementById('viewRoomModalDesc');
  const modalSpecs = document.getElementById('viewRoomModalSpecs');
  const modalLocation = document.getElementById('viewRoomModalLocation');
  const modalFeatures = document.getElementById('viewRoomModalFeatures');
  const modalPrice = document.getElementById('viewRoomModalPrice');
  const modalBookBtn = document.getElementById('viewRoomModalBookBtn');

  async function openRoomModal(roomId) {
    if (!viewRoomModal) return;

    let room = ROOM_DETAILS_MAP[roomId];
    if (!room && roomId) {
      const norm = roomId.toLowerCase().replace(/[^a-z0-9]/g, '');
      room = ROOM_DETAILS_MAP[norm];
    }

    if (!room) {
      try {
        const res = await fetch('/api/rooms');
        if (res.ok) {
          const apiRooms = await res.json();
          (apiRooms || []).forEach(r => registerRoomToDetailsMap(r));
          room = ROOM_DETAILS_MAP[roomId] || ROOM_DETAILS_MAP[(roomId || '').toLowerCase().replace(/[^a-z0-9]/g, '')];
        }
      } catch (e) {
        console.error('Failed to fetch rooms for modal:', e);
      }
    }

    if (!room) {
      room = ROOM_DETAILS_MAP['deluxe'];
    }

    if (modalImg) {
      modalImg.src = room.image;
      modalImg.alt = room.title;
    }
    if (modalTag) modalTag.textContent = room.tag;
    if (modalTitle) modalTitle.textContent = room.title;
    if (modalLocation) {
      if (room.room_number || room.floor_number) {
        modalLocation.style.display = 'flex';
        modalLocation.innerHTML = `
          ${room.room_number ? `<span class="room-loc-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> Room ${room.room_number}</span>` : ''}
          ${room.floor_number ? `<span class="room-loc-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg> ${room.floor_number}</span>` : ''}
        `;
      } else {
        modalLocation.style.display = 'none';
        modalLocation.innerHTML = '';
      }
    }
    if (modalDesc) modalDesc.textContent = room.desc;
    if (modalSpecs) modalSpecs.textContent = room.specs;
    if (modalFeatures) {
      modalFeatures.innerHTML = room.features.map(f => `<span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> ${f}</span>`).join('');
    }
    if (modalPrice) modalPrice.textContent = room.price;
    if (modalBookBtn) {
      const searchVals = getSearchValues();
      modalBookBtn.href = `booking.html?room=${encodeURIComponent(room.id)}&checkin=${encodeURIComponent(searchVals.cin)}&checkout=${encodeURIComponent(searchVals.cout)}&guests=${encodeURIComponent(searchVals.guests)}`;
      modalBookBtn.textContent = 'Book this room';
    }

    viewRoomModal.classList.add('active');
    viewRoomModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeRoomModal() {
    if (!viewRoomModal) return;
    viewRoomModal.classList.remove('active');
    viewRoomModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Delegated event listener for all "View room" triggers
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-view-room');
    if (btn) {
      e.preventDefault();
      const roomId = btn.getAttribute('data-room-id') || 'deluxe';
      openRoomModal(roomId);
    }
  });

  if (closeViewRoomModalBtn) {
    closeViewRoomModalBtn.addEventListener('click', closeRoomModal);
  }

  if (viewRoomModal) {
    viewRoomModal.addEventListener('click', (e) => {
      if (e.target === viewRoomModal) {
        closeRoomModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && viewRoomModal && viewRoomModal.classList.contains('active')) {
      closeRoomModal();
    }
  });

  // =========================================================================
  // 12. Floating Availability Search Bar Controller (rooms.html)
  // =========================================================================
  const searchCheckin = document.getElementById('searchCheckin');
  const searchCheckout = document.getElementById('searchCheckout');
  const searchGuests = document.getElementById('searchGuests');
  const btnCheckAvailability = document.getElementById('btnCheckAvailability');
  const searchCheckinPicker = document.getElementById('searchCheckinPicker');
  const searchCheckoutPicker = document.getElementById('searchCheckoutPicker');
  const btnPickCheckin = document.getElementById('btnPickCheckin');
  const btnPickCheckout = document.getElementById('btnPickCheckout');

  function getSearchValues() {
    let cin = searchCheckin ? searchCheckin.value.trim() : '';
    let cout = searchCheckout ? searchCheckout.value.trim() : '';
    let guests = searchGuests ? searchGuests.value : '';

    if (!cin) {
      try { cin = sessionStorage.getItem('ca_search_checkin') || '10/27/2026'; } catch (e) { cin = '10/27/2026'; }
    }
    if (!cout) {
      try { cout = sessionStorage.getItem('ca_search_checkout') || '10/30/2026'; } catch (e) { cout = '10/30/2026'; }
    }
    if (!guests) {
      try { guests = sessionStorage.getItem('ca_search_guests') || '2'; } catch (e) { guests = '2'; }
    }

    return { cin, cout, guests };
  }

  function persistSearchValues() {
    const vals = getSearchValues();
    try {
      sessionStorage.setItem('ca_search_checkin', vals.cin);
      sessionStorage.setItem('ca_search_checkout', vals.cout);
      sessionStorage.setItem('ca_search_guests', vals.guests);
    } catch (e) {}
    updateCatalogBookLinks();
  }

  function updateCatalogBookLinks() {
    const { cin, cout, guests } = getSearchValues();
    document.querySelectorAll('a[href*="booking.html"]').forEach(link => {
      if (link.id === 'btnCheckAvailability') {
        link.href = `booking.html?checkin=${encodeURIComponent(cin)}&checkout=${encodeURIComponent(cout)}&guests=${encodeURIComponent(guests)}`;
        return;
      }
      try {
        const rawHref = link.getAttribute('href');
        if (!rawHref) return;
        const url = new URL(rawHref, window.location.href);
        const roomId = url.searchParams.get('room');
        if (roomId) {
          link.href = `booking.html?room=${encodeURIComponent(roomId)}&checkin=${encodeURIComponent(cin)}&checkout=${encodeURIComponent(cout)}&guests=${encodeURIComponent(guests)}`;
        }
      } catch (err) {}
    });
  }

  // Restore saved search values from sessionStorage if present
  try {
    const savedCin = sessionStorage.getItem('ca_search_checkin');
    const savedCout = sessionStorage.getItem('ca_search_checkout');
    const savedGuests = sessionStorage.getItem('ca_search_guests');
    if (searchCheckin && savedCin) searchCheckin.value = savedCin;
    if (searchCheckout && savedCout) searchCheckout.value = savedCout;
    if (searchGuests && savedGuests) searchGuests.value = savedGuests;
  } catch (e) {}

  // Date parsing helpers for input <-> datepicker synchronization
  function parseSlashToIso(slashDate) {
    if (!slashDate) return '';
    const parts = slashDate.trim().split('/');
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
    const parts = isoDate.trim().split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${m}/${d}/${y}`;
    }
    return '';
  }

  if (searchCheckinPicker && searchCheckin) {
    searchCheckinPicker.value = parseSlashToIso(searchCheckin.value);
    btnPickCheckin?.addEventListener('click', () => {
      searchCheckinPicker.value = parseSlashToIso(searchCheckin.value);
      if (typeof searchCheckinPicker.showPicker === 'function') {
        searchCheckinPicker.showPicker();
      } else {
        searchCheckinPicker.focus();
      }
    });
    searchCheckinPicker.addEventListener('change', () => {
      if (searchCheckinPicker.value) {
        searchCheckin.value = parseIsoToSlash(searchCheckinPicker.value);
        persistSearchValues();
      }
    });
  }

  if (searchCheckoutPicker && searchCheckout) {
    searchCheckoutPicker.value = parseSlashToIso(searchCheckout.value);
    btnPickCheckout?.addEventListener('click', () => {
      searchCheckoutPicker.value = parseSlashToIso(searchCheckout.value);
      if (typeof searchCheckoutPicker.showPicker === 'function') {
        searchCheckoutPicker.showPicker();
      } else {
        searchCheckoutPicker.focus();
      }
    });
    searchCheckoutPicker.addEventListener('change', () => {
      if (searchCheckoutPicker.value) {
        searchCheckout.value = parseIsoToSlash(searchCheckoutPicker.value);
        persistSearchValues();
      }
    });
  }

  if (searchCheckin) {
    searchCheckin.addEventListener('input', persistSearchValues);
    searchCheckin.addEventListener('change', persistSearchValues);
  }
  if (searchCheckout) {
    searchCheckout.addEventListener('input', persistSearchValues);
    searchCheckout.addEventListener('change', persistSearchValues);
  }
  if (searchGuests) {
    searchGuests.addEventListener('change', persistSearchValues);
  }

  if (btnCheckAvailability) {
    btnCheckAvailability.addEventListener('click', (e) => {
      e.preventDefault();
      const { cin, cout, guests } = getSearchValues();
      persistSearchValues();
      window.location.href = `booking.html?checkin=${encodeURIComponent(cin)}&checkout=${encodeURIComponent(cout)}&guests=${encodeURIComponent(guests)}`;
    });
  }

  // Intercept any booking.html link click on rooms page to ensure latest dates are appended
  document.addEventListener('click', (e) => {
    const bookLink = e.target.closest('a[href*="booking.html"]');
    if (bookLink && bookLink.id !== 'btnCheckAvailability') {
      const { cin, cout, guests } = getSearchValues();
      try {
        const url = new URL(bookLink.getAttribute('href'), window.location.href);
        if (!url.searchParams.has('checkin')) url.searchParams.set('checkin', cin);
        if (!url.searchParams.has('checkout')) url.searchParams.set('checkout', cout);
        if (!url.searchParams.has('guests')) url.searchParams.set('guests', guests);
        bookLink.href = `${url.pathname}?${url.searchParams.toString()}`;
      } catch (err) {}
    }
  });

  // Run initial link update if on rooms.html
  if (searchCheckin || searchCheckout || searchGuests) {
    persistSearchValues();
  }
});

