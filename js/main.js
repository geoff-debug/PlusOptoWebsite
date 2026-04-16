/* ==========================================================
   Plus Opto — main.js
   Requires Bootstrap 5 (already included via CDN in HTML)
   ========================================================== */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     Contact form — send via Resend API (direct fetch)
     ---------------------------------------------------------- */
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!contactForm.checkValidity()) { contactForm.classList.add('was-validated'); return; }

      var btn = contactForm.querySelector('[type=submit]');
      btn.disabled = true;
      btn.textContent = 'Sending…';

      var name    = document.getElementById('fname').value;
      var company = document.getElementById('fcompany').value;
      var email   = document.getElementById('femail').value;
      var phone   = document.getElementById('fphone').value;
      var message = document.getElementById('fmessage').value;

      var body = 'Name: ' + name + '\n';
      if (company) body += 'Company: ' + company + '\n';
      body += 'Email: ' + email + '\n';
      if (phone)   body += 'Phone: ' + phone + '\n';
      body += '\nMessage:\n' + message;

      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer re_THow3y9a_5sPdma41UND4wffZkZnx9dXX',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from:     'contact@plusopto.com',
          to:       ['sales@plusopto.co.uk'],
          subject:  'Website enquiry from ' + name,
          text:     body,
          reply_to: email
        })
      })
        .then(function (r) { return r.json(); })
        .then(function (json) {
          btn.disabled = false;
          btn.textContent = 'Send Message';
          if (json.id) {
            contactForm.reset();
            contactForm.classList.remove('was-validated');
            var alertEl = document.getElementById('formSuccessAlert');
            if (alertEl) {
              alertEl.classList.remove('d-none');
              setTimeout(function () { alertEl.classList.add('d-none'); }, 5000);
            }
          } else {
            alert('Sorry, there was a problem sending your message. Please try again or email us directly.');
          }
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = 'Send Message';
          alert('Sorry, there was a problem sending your message. Please try again or email us directly.');
        });
    });
  }

  /* ----------------------------------------------------------
     Search — powered by Pagefind (generated at build time)
     ---------------------------------------------------------- */
  var searchInput  = document.querySelector('.nav-search');
  var searchResults = document.getElementById('searchResults');
  var pagefindMod  = null;

  function clearResults() {
    if (searchResults) {
      searchResults.innerHTML = '';
      searchResults.classList.remove('open');
    }
  }

  function renderResults(data) {
    if (!searchResults) return;
    searchResults.innerHTML = '';
    if (!data.length) {
      searchResults.innerHTML = '<div class="search-result-item search-no-results">No results found</div>';
      searchResults.classList.add('open');
      return;
    }
    data.forEach(function (item) {
      var el = document.createElement('div');
      el.className = 'search-result-item';
      el.setAttribute('role', 'option');
      el.innerHTML =
        '<a href="' + item.url + '">' +
          '<span class="result-title">' + (item.meta && item.meta.title ? item.meta.title : 'Result') + '</span>' +
          (item.excerpt ? '<span class="result-excerpt">' + item.excerpt + '</span>' : '') +
        '</a>';
      searchResults.appendChild(el);
    });
    searchResults.classList.add('open');
  }

  if (searchInput && searchResults) {
    searchInput.addEventListener('input', async function (e) {
      var query = e.target.value.trim();
      if (query.length < 2) { clearResults(); return; }

      if (!pagefindMod) {
        try {
          pagefindMod = await import('/pagefind/pagefind.js');
          await pagefindMod.init();
        } catch (_) {
          // Pagefind not available (local dev without build step)
          return;
        }
      }

      var search = await pagefindMod.search(query);
      var data   = await Promise.all(search.results.slice(0, 8).map(function (r) { return r.data(); }));
      renderResults(data);
    });

    // Close results when clicking outside
    document.addEventListener('click', function (e) {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        clearResults();
      }
    });

    // Clear on Escape
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { clearResults(); searchInput.blur(); }
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
