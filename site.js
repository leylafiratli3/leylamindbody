/* Leyla Fıratlı, shared marketing-site JS (vanilla, no deps) */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Sticky header shrink past 40px ---- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 40) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Desktop dropdown: open on click/keyboard (hover handled in CSS) ---- */
  document.querySelectorAll(".has-dropdown").forEach(function (wrap) {
    var top = wrap.querySelector(".menu-top");
    var panel = wrap.querySelector(".dropdown");
    if (!top || !panel) return;
    top.setAttribute("aria-haspopup", "true");
    top.setAttribute("aria-expanded", "false");
    top.addEventListener("click", function (e) {
      e.preventDefault();
      var open = panel.classList.toggle("open");
      top.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) { panel.classList.remove("open"); top.setAttribute("aria-expanded", "false"); }
    });
    wrap.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { panel.classList.remove("open"); top.setAttribute("aria-expanded", "false"); top.focus(); }
    });
  });

  /* ---- Mobile full-screen menu ---- */
  var toggle = document.querySelector("[data-menu-toggle]");
  var menu = document.getElementById("mobile-nav");
  var lastFocus = null;

  function focusables() {
    return menu ? Array.prototype.slice.call(
      menu.querySelectorAll('a[href], button:not([disabled])')
    ).filter(function (el) { return el.offsetParent !== null; }) : [];
  }
  function openMenu() {
    if (!menu) return;
    lastFocus = document.activeElement;
    menu.classList.add("open");
    document.body.classList.add("menu-open");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    var f = focusables();
    if (f.length) f[0].focus();
  }
  function closeMenu() {
    if (!menu) return;
    menu.classList.remove("open");
    document.body.classList.remove("menu-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (lastFocus) lastFocus.focus();
  }
  if (toggle && menu) {
    toggle.addEventListener("click", openMenu);
    menu.querySelectorAll("[data-menu-close]").forEach(function (b) { b.addEventListener("click", closeMenu); });
    // close when a real navigation link is tapped
    menu.querySelectorAll("a[href]").forEach(function (a) { a.addEventListener("click", closeMenu); });
    // inline expanders for WORK WITH ME
    menu.querySelectorAll(".menu-top").forEach(function (btn) {
      var sub = btn.nextElementSibling;
      btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", function () {
        var open = sub.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (!menu.classList.contains("open")) return;
      if (e.key === "Escape") { closeMenu(); return; }
      if (e.key === "Tab") {
        var f = focusables();
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---- Scroll reveal with stagger ---- */
  var reveals = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var sibs = el.parentElement ? el.parentElement.querySelectorAll(":scope > .reveal") : [el];
        var idx = Array.prototype.indexOf.call(sibs, el);
        el.style.transitionDelay = (Math.max(0, idx) * 100) + "ms";
        el.classList.add("in");
        obs.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---- Side-scrolling testimonials: arrow buttons ---- */
  document.querySelectorAll("[data-carousel]").forEach(function (wrap) {
    var track = wrap.querySelector(".carousel-track");
    var prev = wrap.querySelector("[data-prev]");
    var next = wrap.querySelector("[data-next]");
    if (!track || !prev || !next) return;
    var step = function () {
      var s = track.querySelector(".slide");
      return s ? s.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0) : track.clientWidth;
    };
    var update = function () {
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    prev.addEventListener("click", function () { track.scrollBy({ left: -step() }); });
    next.addEventListener("click", function () { track.scrollBy({ left: step() }); });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });
})();
