// Accordion functionality
(function () {
  const toggles = document.querySelectorAll(".accordion-toggle");
  toggles.forEach((btn) => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      const icon = btn.querySelector(".accordion-icon");
      const isOpen = btn.getAttribute("aria-expanded") === "true";

      if (isOpen) {
        // close
        content.style.maxHeight = "0";
        btn.setAttribute("aria-expanded", "false");
        icon.style.transform = "";
      } else {
        // open
        content.style.maxHeight = content.scrollHeight + "px";
        btn.setAttribute("aria-expanded", "true");
        icon.style.transform = "rotate(45deg)";
      }
    });

    // ensure transition works on resize (recompute maxHeight if open)
    window.addEventListener("resize", () => {
      const content = btn.nextElementSibling;
      if (btn.getAttribute("aria-expanded") === "true") {
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });
})();

// Product option selector
(function () {
  const selectorRoot = document.getElementById("product-selector");
  const items = selectorRoot.querySelectorAll(".product-selector_block");
  const atc = document.querySelector("[data-otp-id]"); // add-to-cart button
  if (!items.length || !atc) return;

  function selectItem(el) {
    items.forEach((i) => {
      i.classList.remove("selected", "ring-2", "ring-[#039869]");
      i.setAttribute("aria-pressed", "false");
      const ind = i.querySelector(".indicator");
      if (ind) ind.classList.add("hidden");
    });

    el.classList.add("selected", "ring-2", "ring-[#039869]");
    el.setAttribute("aria-pressed", "true");
    const indicator = el.querySelector(".indicator");
    if (indicator) indicator.classList.remove("hidden");

    // update add-to-cart data attribute(s)
    const plan = el.dataset.sellingPlan || "";
    if (plan) {
      atc.dataset.sellingPlan = plan;
      atc.setAttribute("data-selling-plan", plan);
    } else {
      delete atc.dataset.sellingPlan;
      atc.removeAttribute("data-selling-plan");
    }

    // optionally update price shown on the button (keeps simple)
    const priceEl = el.querySelector(".w-1\\/2 p");
    if (priceEl) {
      atc.textContent = "ADD TO CART • " + priceEl.textContent.trim();
    }
  }

  // init: select the second option by default (as in original highlighted)
  const defaultEl = items[1] || items[0];
  selectItem(defaultEl);

  // add click & keyboard support
  items.forEach((item) => {
    item.addEventListener("click", () => selectItem(item));
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectItem(item);
      }
    });
  });
})();

// Product shipping UI updater
(function () {
  const root = document.getElementById("product-selector");
  if (!root) return;
  const items = Array.from(root.querySelectorAll(".product-selector_block"));

  // global UI targets (delivery badge & refill text)
  const deliveryBadge = document.querySelector(
    ".flex.items-center.gap-3.mt-4 .flex-1 p span"
  );
  const refillText = document.querySelector('[data-refill="1"]');

  const BORDER_COLOR = "#039869";
  const SELECTED_OPACITY = "1";
  const UNSELECTED_OPACITY = "0.6";

  // ensure every ship-row is visible and themed to border color
  function themeAllShipRows() {
    const allShipRows = document.querySelectorAll(".ship-row");
    allShipRows.forEach((r) => {
      r.classList.remove("hidden"); // ensure visible
      r.style.backgroundColor = BORDER_COLOR;
      r.style.color = "#fff";
      r.style.opacity = UNSELECTED_OPACITY;
    });
  }

  function showShipUI(el) {
    // make sure all ship-rows are visible & themed
    themeAllShipRows();

    // highlight rows inside selected item (full opacity)
    el.querySelectorAll(".ship-row").forEach((r) => {
      r.style.opacity = SELECTED_OPACITY;
    });

    // update global delivery badge and refill text if present
    const delivery = el.dataset.delivery;
    const refill = el.dataset.refill;

    if (delivery && deliveryBadge) {
      deliveryBadge.textContent = delivery;
      // style the delivery badge to match the border
      deliveryBadge.style.backgroundColor = BORDER_COLOR;
      deliveryBadge.style.color = "#fff";
      deliveryBadge.style.borderRadius = "6px";
      deliveryBadge.style.padding = "0.25rem 0.5rem";
    }

    if (refill && refillText) {
      refillText.textContent = refill;
      // make refill text use the border color
      refillText.style.color = BORDER_COLOR;
      refillText.style.fontWeight = "600";
    }
  }

  // initialize based on current selected or default second item
  const selected =
    items.find((i) => i.getAttribute("aria-pressed") === "true") ||
    items[1] ||
    items[0];
  if (selected) showShipUI(selected);

  // attach listeners so UI updates whether selection is controlled by other script or direct click
  items.forEach((it) => {
    it.addEventListener("click", () => showShipUI(it));
    it.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showShipUI(it);
      }
    });
  });

  // observe attribute changes (aria-pressed) in case external script toggles selection
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "attributes" && m.attributeName === "aria-pressed") {
        const target = m.target;
        if (target.getAttribute("aria-pressed") === "true") {
          showShipUI(target);
        }
      }
    }
  });
  items.forEach((it) => mo.observe(it, { attributes: true }));

  // theme all rows on start (covers cases where no item is selected yet)
  themeAllShipRows();
})();

// Scrolling logos track
(function () {
  const track = document.getElementById("logosTrack");
  if (!track) return;

  const container = track.parentElement;

  // remove old clone if present
  const old = document.getElementById("logosTrackClone");
  if (old) old.remove();

  // clone once to create seamless loop
  const clone = track.cloneNode(true);
  clone.id = "logosTrackClone";
  clone.style.position = "absolute";
  clone.style.left = "0";
  clone.style.top = "0";
  container.appendChild(clone);

  // make images focusable for keyboard users
  [track, clone].forEach((wrapper) => {
    wrapper
      .querySelectorAll("img")
      .forEach((img) => img.setAttribute("tabindex", "0"));
  });

  let speed = 60; // px per second (adjust)
  let paused = false;
  let x = 0;
  let last = null;
  let trackW = 0;
  let containerW = 0;
  let resizeTimer = null;

  function updateSizes() {
    // use scrollWidth to include full content width
    trackW = Math.max(1, track.scrollWidth);
    containerW = container.offsetWidth;

    // ensure clone visually identical width
    clone.style.width = trackW + "px";

    // if track shorter than container, disable animation and center content
    if (trackW <= containerW) {
      paused = true;
      x = 0;
      track.style.transform = `translateX(0px)`;
      clone.style.transform = `translateX(${trackW}px)`;
    } else {
      // normalize x into [-trackW, 0)
      x = ((x % trackW) + trackW) % trackW;
      if (x > 0) x = x - trackW;
    }
  }

  // initial sizes after render
  updateSizes();

  // observe resizes and recompute sizes (debounced)
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      updateSizes();
      last = null; // reset timing to avoid big dt jump
    }, 80);
  });
  ro.observe(container);
  ro.observe(track);
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      updateSizes();
      last = null;
    }, 120);
  });

  function step(ts) {
    if (last === null) last = ts;
    const dt = (ts - last) / 1000;
    last = ts;

    if (!paused && trackW > containerW) {
      x -= speed * dt;
      if (Math.abs(x) >= trackW) {
        x += trackW;
      }
      track.style.transform = `translateX(${x}px)`;
      clone.style.transform = `translateX(${x + trackW}px)`;
    } else {
      // ensure transforms remain correct when paused or when content fits container
      track.style.transform = `translateX(${x}px)`;
      clone.style.transform = `translateX(${x + trackW}px)`;
    }

    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);

  // pause on hover/focus (apply on container for easier handling)
  [container, track, clone].forEach((el) => {
    el.addEventListener("mouseenter", () => (paused = true));
    el.addEventListener("mouseleave", () => {
      // only resume if track is wider than container
      if (trackW > containerW) paused = false;
    });
    el.addEventListener("focusin", () => (paused = true));
    el.addEventListener("focusout", () => {
      if (trackW > containerW) paused = false;
    });
  });

  // accessibility: allow keyboard to temporarily pause/resume with Space
  document.addEventListener("keydown", (e) => {
    if (
      e.code === "Space" &&
      document.activeElement &&
      container.contains(document.activeElement)
    ) {
      e.preventDefault();
      if (trackW > containerW) paused = !paused;
    }
  });
})();

// Ingredient accordion functionality
(function () {
  const toggles = Array.from(document.querySelectorAll(".ingr-toggle"));
  if (!toggles.length) return;

  toggles.forEach((t) => {
    const bind = () => {
      const card = t.closest(".p-6");
      const content = card?.querySelector(".product_lymph-ingr-content");
      if (!content) return;

      function open() {
        // set padding visible then expand
        content.style.maxHeight = content.scrollHeight + "px";
        t.classList.add("open");
        t.setAttribute("aria-expanded", "true");
      }

      function close() {
        // collapse then remove padding
        content.style.maxHeight = "0px";
        // keep padding 0 while closed
        t.classList.remove("open");
        t.setAttribute("aria-expanded", "false");
      }

      function toggle() {
        const isOpen = t.getAttribute("aria-expanded") === "true";
        if (isOpen) close();
        else open();
      }

      t.addEventListener("click", toggle);
      t.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });

      // recompute maxHeight on resize for open panels
      window.addEventListener("resize", () => {
        if (t.getAttribute("aria-expanded") === "true") {
          // small timeout to allow layout
          requestAnimationFrame(() => {
            content.style.maxHeight = content.scrollHeight + "px";
          });
        }
      });
    };
    bind();
  });
})();

// UGC Carousel functionality
(function () {
  const track = document.getElementById("ugc-track");
  const slides = Array.from(track.querySelectorAll(".ugc-slide"));
  const prevBtn = document.getElementById("ugc-prev");
  const nextBtn = document.getElementById("ugc-next");
  const dotsWrap = document.getElementById("ugc-dots");

  if (!track || slides.length === 0) return;

  let index = 0;
  let autoplayInterval = 3500;
  let timer = null;
  let slidesPerView = getSlidesPerView();
  let maxIndex = Math.max(0, slides.length - slidesPerView);

  // Create dots
  for (let i = 0; i <= maxIndex; i++) {
    const dot = document.createElement("button");
    dot.className = "dot";
    dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
    dot.addEventListener("click", () => goTo(i));
    dotsWrap.appendChild(dot);
  }
  const dots = Array.from(dotsWrap.children);

  function getSlidesPerView() {
    const width = window.innerWidth;
    if (width >= 1280) return 4;
    if (width >= 768) return 3;
    if (width >= 640) return 2;
    return 1;
  }

  function getSlideWidth() {
    return slides[0].offsetWidth + 16; // 16px gap
  }

  function update() {
    slidesPerView = getSlidesPerView();
    maxIndex = Math.max(0, slides.length - slidesPerView);

    // Clamp index
    if (index > maxIndex) index = maxIndex;

    const slideWidth = getSlideWidth();
    const offset = -index * slideWidth;
    track.style.transform = `translateX(${offset}px)`;

    // Update dots
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  }

  function goTo(i) {
    pauseAllVideos();
    index = Math.max(0, Math.min(i, maxIndex));
    update();
    resetAutoplay();
  }

  function prev() {
    goTo(index - 1);
  }

  function next() {
    goTo(index + 1);
  }

  prevBtn.addEventListener("click", prev);
  nextBtn.addEventListener("click", next);

  // function startAutoplay() {
  //   stopAutoplay();
  //   timer = setInterval(() => {
  //     if (index >= maxIndex) {
  //       goTo(0);
  //     } else {
  //       goTo(index + 1);
  //     }
  //   }, autoplayInterval);
  // }

  // function stopAutoplay() {
  //   if (timer) {
  //     clearInterval(timer);
  //     timer = null;
  //   }
  // }

  function resetAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  function pauseAllVideos() {
    track.querySelectorAll("video").forEach((v) => {
      v.pause();
      const playBtn = v.parentElement.querySelector(".ugc-play");
      if (playBtn) playBtn.style.display = "";
    });
  }

  // Video play functionality
  track.addEventListener("click", (e) => {
    const playBtn = e.target.closest(".ugc-play");
    if (!playBtn) return;

    const videoContainer = playBtn.parentElement;
    const video = videoContainer.querySelector("video");
    if (!video) return;

    pauseAllVideos();

    video.muted = false;
    video.play().catch(() => {});

    playBtn.style.display = "none";
    stopAutoplay();

    video.addEventListener(
      "ended",
      function onEnd() {
        playBtn.style.display = "";
        startAutoplay();
        video.removeEventListener("ended", onEnd);
      },
      { once: true }
    );
  });

  // Pause on hover
  const container = track.parentElement;
  container.addEventListener("mouseenter", stopAutoplay);
  container.addEventListener("mouseleave", startAutoplay);

  // Responsive
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      update();
    }, 150);
  });

  // Initialize
  update();
  // startAutoplay();
})();

// FAQ Accordion functionality
document.addEventListener("DOMContentLoaded", function () {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");

    // Set initial max-height for active item
    if (item.classList.contains("active")) {
      answer.style.maxHeight = answer.scrollHeight + "px";
    }

    question.addEventListener("click", () => {
      const isActive = item.classList.contains("active");

      if (isActive) {
        // Close this item
        item.classList.remove("active");
        answer.style.maxHeight = "0";
      } else {
        // Open this item (allow multiple items to be open)
        item.classList.add("active");
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
  });

  // Recalculate heights on window resize
  window.addEventListener("resize", () => {
    faqItems.forEach((item) => {
      if (item.classList.contains("active")) {
        const answer = item.querySelector(".faq-answer");
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
  });
});
