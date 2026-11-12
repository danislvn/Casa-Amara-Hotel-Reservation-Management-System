/**
 * Casa Amara Boutique Hotel - Luxury Animated Custom Dropdowns System
 * Elevates native <select> elements into bespoke, animated, accessible dropdowns
 * with silky smooth spring physics, micro-interactions, and real-time two-way synchronization.
 */

(function () {
  'use strict';

  const CHECKMARK_SVG = `
    <svg class="ca-option-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;

  const CHEVRON_SVG = `
    <svg class="ca-chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `;

  // Close all open luxury dropdowns
  function closeAllDropdowns(exceptWrap) {
    document.querySelectorAll('.custom-select-wrap.is-open').forEach(wrap => {
      if (wrap !== exceptWrap) {
        wrap.classList.remove('is-open');
        const trigger = wrap.querySelector('.ca-custom-select-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Global click listener to close open dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-wrap')) {
      closeAllDropdowns();
    }
  });

  // Global Escape key listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openWrap = document.querySelector('.custom-select-wrap.is-open');
      if (openWrap) {
        const trigger = openWrap.querySelector('.ca-custom-select-trigger');
        closeAllDropdowns();
        if (trigger) trigger.focus();
      }
    }
  });

  /**
   * Initializes a single native <select> element into a Luxury Custom Select
   */
  function initLuxurySelect(selectEl) {
    if (!selectEl || selectEl._caCustomSelectInitialized) return;

    // 1. Ensure select has wrapper
    let wrap = selectEl.closest('.custom-select-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'custom-select-wrap';
      selectEl.parentNode.insertBefore(wrap, selectEl);
      wrap.appendChild(selectEl);
    }

    wrap.classList.add('ca-customized');
    selectEl.classList.add('ca-native-select-hidden');
    selectEl.setAttribute('tabindex', '-1');
    selectEl.setAttribute('aria-hidden', 'true');

    // Remove or hide any pre-existing static chevron icons inside the wrapper
    wrap.querySelectorAll('.select-chevron-icon:not(.ca-chevron-icon)').forEach(el => {
      el.style.display = 'none';
    });

    // Check if trigger/menu already exist
    let trigger = wrap.querySelector('.ca-custom-select-trigger');
    let menu = wrap.querySelector('.ca-custom-select-menu');

    if (!trigger) {
      trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'ca-custom-select-trigger';
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');

      // Transfer select ID context if useful for styling
      if (selectEl.id) {
        trigger.setAttribute('data-target-select', selectEl.id);
        trigger.id = `trigger_${selectEl.id}`;
      }

      // Add label container and animated chevron
      trigger.innerHTML = `
        <span class="ca-custom-select-label"></span>
        ${CHEVRON_SVG}
      `;
      wrap.appendChild(trigger);
    }

    const labelSpan = trigger.querySelector('.ca-custom-select-label');

    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'ca-custom-select-menu';
      menu.setAttribute('role', 'listbox');
      menu.setAttribute('tabindex', '-1');
      menu.innerHTML = `<div class="ca-custom-select-scroll"></div>`;
      wrap.appendChild(menu);
    }

    const scrollContainer = menu.querySelector('.ca-custom-select-scroll');

    // 2. Build / Rebuild Options List
    function rebuildOptions() {
      scrollContainer.replaceChildren();
      const options = Array.from(selectEl.options);

      let selectedText = '';

      options.forEach((opt, idx) => {
        const optionRow = document.createElement('div');
        optionRow.className = 'ca-custom-select-option';
        optionRow.setAttribute('role', 'option');
        optionRow.setAttribute('data-value', opt.value);
        optionRow.setAttribute('data-index', idx);

        if (opt.selected) {
          optionRow.classList.add('is-selected');
          optionRow.setAttribute('aria-selected', 'true');
          selectedText = opt.textContent.trim();
        } else {
          optionRow.setAttribute('aria-selected', 'false');
        }

        if (opt.disabled) {
          optionRow.classList.add('is-disabled');
          optionRow.setAttribute('aria-disabled', 'true');
        }

        optionRow.innerHTML = `
          <span class="ca-option-text">${opt.textContent.trim()}</span>
          <span class="ca-option-check-wrap">${CHECKMARK_SVG}</span>
        `;

        optionRow.addEventListener('click', (e) => {
          e.stopPropagation();
          if (opt.disabled) return;
          selectOption(opt.value, opt.textContent.trim());
        });

        scrollContainer.appendChild(optionRow);
      });

      if (!selectedText && options.length > 0) {
        selectedText = options[0].textContent.trim();
      }
      labelSpan.textContent = selectedText || 'Select option';
    }

    // 3. Selection handler
    function selectOption(val, text) {
      if (selectEl.value !== val) {
        selectEl.value = val;
      }
      labelSpan.textContent = text;

      // Update selected class on menu options
      scrollContainer.querySelectorAll('.ca-custom-select-option').forEach(row => {
        const isMatch = row.getAttribute('data-value') === String(val);
        row.classList.toggle('is-selected', isMatch);
        row.setAttribute('aria-selected', isMatch ? 'true' : 'false');
      });

      closeDropdown();

      // Dispatch native change and input events to trigger attached PMS / filtering handlers
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      selectEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 4. Synchronize display when native select value changes programmatically
    function syncDisplay() {
      const selectedOpt = selectEl.options[selectEl.selectedIndex];
      if (selectedOpt) {
        labelSpan.textContent = selectedOpt.textContent.trim();
        scrollContainer.querySelectorAll('.ca-custom-select-option').forEach(row => {
          const isMatch = row.getAttribute('data-value') === String(selectedOpt.value);
          row.classList.toggle('is-selected', isMatch);
          row.setAttribute('aria-selected', isMatch ? 'true' : 'false');
        });
      }
    }

    // 5. Smart positioning (viewport boundary check)
    function adjustPosition() {
      const triggerRect = trigger.getBoundingClientRect();
      const menuWidth = menu.offsetWidth || 260;

      // Check right edge collision
      if (triggerRect.left + menuWidth > window.innerWidth - 18) {
        menu.classList.add('align-right');
      } else {
        menu.classList.remove('align-right');
      }

      // Check bottom edge collision (flip upwards if insufficient space below)
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      if (spaceBelow < 280 && triggerRect.top > 280) {
        menu.classList.add('open-upwards');
      } else {
        menu.classList.remove('open-upwards');
      }
    }

    // 6. Open / Close triggers
    function openDropdown() {
      closeAllDropdowns(wrap);
      adjustPosition();
      wrap.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');

      // Scroll selected item into visible view
      const selectedRow = scrollContainer.querySelector('.ca-custom-select-option.is-selected');
      if (selectedRow) {
        selectedRow.scrollIntoView({ block: 'nearest' });
      }
    }

    function closeDropdown() {
      wrap.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    function toggleDropdown() {
      if (wrap.classList.contains('is-open')) {
        closeDropdown();
      } else {
        openDropdown();
      }
    }

    // Trigger click
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    // Keyboard navigation
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!wrap.classList.contains('is-open')) {
          openDropdown();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          const options = Array.from(scrollContainer.querySelectorAll('.ca-custom-select-option:not(.is-disabled)'));
          const currentIdx = options.findIndex(o => o.classList.contains('is-focused') || o.classList.contains('is-selected'));
          let nextIdx = e.key === 'ArrowDown' ? currentIdx + 1 : currentIdx - 1;
          if (nextIdx < 0) nextIdx = options.length - 1;
          if (nextIdx >= options.length) nextIdx = 0;
          options.forEach(o => o.classList.remove('is-focused'));
          options[nextIdx].classList.add('is-focused');
          options[nextIdx].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter' || e.key === ' ') {
          const focused = scrollContainer.querySelector('.ca-custom-select-option.is-focused');
          if (focused) {
            const val = focused.getAttribute('data-value');
            const text = focused.querySelector('.ca-option-text')?.textContent.trim() || '';
            selectOption(val, text);
          } else {
            closeDropdown();
          }
        }
      }
    });

    // 7. Watch for native DOM mutation (options dynamically added/removed/replaced)
    const observer = new MutationObserver(() => {
      rebuildOptions();
    });
    observer.observe(selectEl, { childList: true, subtree: true });

    // 8. Hook native value setter to auto-sync when external JS assigns select.value = '...'
    const proto = HTMLSelectElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) {
      Object.defineProperty(selectEl, 'value', {
        get() {
          return desc.get.call(this);
        },
        set(newVal) {
          desc.set.call(this, newVal);
          syncDisplay();
        },
        configurable: true
      });
    }

    // Listen for standard change events as well
    selectEl.addEventListener('change', syncDisplay);

    // Initial build
    rebuildOptions();

    // Mark as initialized
    selectEl._caCustomSelectInitialized = true;
    selectEl._caRebuildCustomSelect = rebuildOptions;
    selectEl._caSyncCustomSelect = syncDisplay;
  }

  /**
   * Initializes all dropdowns matching custom select criteria
   */
  function initAllLuxurySelects(root = document) {
    const selects = root.querySelectorAll(`
      select.filter-select,
      select.manager-select,
      select#roomStatus,
      select#searchGuests,
      .custom-select-wrap select
    `);

    selects.forEach(selectEl => {
      initLuxurySelect(selectEl);
    });
  }

  // Expose global helpers
  window.initLuxurySelect = initLuxurySelect;
  window.initAllLuxurySelects = initAllLuxurySelects;
  window.refreshLuxurySelect = function(selectEl) {
    if (selectEl && selectEl._caRebuildCustomSelect) {
      selectEl._caRebuildCustomSelect();
    }
  };

  // Run automatically on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAllLuxurySelects());
  } else {
    initAllLuxurySelects();
  }
})();
