/* ==========================================================
   Plus Opto — main.js
   Requires Bootstrap 5 (already included via CDN in HTML)
   ========================================================== */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     Contact form — simulate submission (no backend)
     ---------------------------------------------------------- */
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = contactForm.querySelector('[type=submit]');
      var original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Sending…';

      // Simulate async send
      setTimeout(function () {
        btn.disabled = false;
        btn.textContent = original;
        contactForm.reset();

        // Show Bootstrap toast / alert
        var alertEl = document.getElementById('formSuccessAlert');
        if (alertEl) {
          alertEl.classList.remove('d-none');
          setTimeout(function () { alertEl.classList.add('d-none'); }, 5000);
        }
      }, 1200);
    });
  }

  /* ----------------------------------------------------------
     Sticky navbar: add shadow on scroll
     ---------------------------------------------------------- */
  var navbar = document.querySelector('.site-navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 10) {
        navbar.classList.add('shadow');
      } else {
        navbar.classList.remove('shadow');
      }
    }, { passive: true });
  }

})();
