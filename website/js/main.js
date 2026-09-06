document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  /* Header shadow on scroll -------------------------------------------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Mobile navigation ---------------------------------------------------- */
  var navToggle = document.querySelector(".nav-toggle");
  var mainNav = document.querySelector(".main-nav");

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mainNav.classList.toggle("is-open");
      navToggle.classList.toggle("is-active", isOpen);
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      document.body.style.overflow = isOpen ? "hidden" : "";
    });

    mainNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.innerWidth <= 980) {
          mainNav.classList.remove("is-open");
          navToggle.classList.remove("is-active");
          navToggle.setAttribute("aria-expanded", "false");
          document.body.style.overflow = "";
        }
      });
    });

    document.querySelectorAll(".has-dropdown > .dropdown-toggle").forEach(function (toggle) {
      toggle.addEventListener("click", function (event) {
        if (window.innerWidth <= 980) {
          event.preventDefault();
          toggle.parentElement.classList.toggle("is-open");
        }
      });
    });
  }

  /* Scroll reveal animations --------------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* Safety net: never leave content permanently hidden -------------------- */
  window.setTimeout(function () {
    document.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }, 2500);

  /* Footer year ------------------------------------------------------------ */
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* Pre-select package + service on the contact page --------------------- */
  var serviceSelect = document.getElementById("service-required");
  var packageSelect = document.getElementById("package-selected");
  var params = new URLSearchParams(window.location.search);
  var packageParam = params.get("package");
  var serviceParam = params.get("service");

  if (packageSelect && packageParam) {
    for (var i = 0; i < packageSelect.options.length; i++) {
      if (packageSelect.options[i].value === packageParam) {
        packageSelect.selectedIndex = i;
        break;
      }
    }
  }
  if (serviceSelect && serviceParam) {
    for (var j = 0; j < serviceSelect.options.length; j++) {
      if (serviceSelect.options[j].value === serviceParam) {
        serviceSelect.selectedIndex = j;
        break;
      }
    }
  }

  /* Contact form validation + submission ---------------------------------- */
  var contactForm = document.getElementById("contact-form");
  if (contactForm) {
    var statusBox = document.getElementById("form-status");

    var showError = function (field, message) {
      var group = field.closest(".form-group");
      group.classList.add("has-error");
      var errorEl = group.querySelector(".field-error");
      if (errorEl) errorEl.textContent = message;
    };

    var clearError = function (field) {
      var group = field.closest(".form-group");
      group.classList.remove("has-error");
    };

    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var isValid = true;

      var nameField = contactForm.querySelector("#full-name");
      var phoneField = contactForm.querySelector("#phone");
      var emailField = contactForm.querySelector("#email");
      var messageField = contactForm.querySelector("#message");

      [nameField, phoneField, emailField, messageField].forEach(clearError);

      if (!nameField.value.trim()) {
        showError(nameField, "Please enter your name.");
        isValid = false;
      }

      var phonePattern = /^[0-9+\-\s()]{7,20}$/;
      if (!phonePattern.test(phoneField.value.trim())) {
        showError(phoneField, "Please enter a valid phone number.");
        isValid = false;
      }

      var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(emailField.value.trim())) {
        showError(emailField, "Please enter a valid email address.");
        isValid = false;
      }

      if (!messageField.value.trim()) {
        showError(messageField, "Please tell us a little about your project.");
        isValid = false;
      }

      if (!isValid) {
        statusBox.className = "form-status is-error";
        statusBox.textContent = "Please fix the highlighted fields and try again.";
        return;
      }

      var paymentField = contactForm.querySelector('input[name="payment-method"]:checked');
      var paymentLabel = paymentField ? paymentField.value : "To be discussed";

      statusBox.className = "form-status is-success";
      statusBox.textContent =
        "Thank you, " + nameField.value.trim() + ". Your request has been received. " +
        "Our team will call you at " + phoneField.value.trim() + " shortly to confirm the details" +
        (paymentField ? " and share " + paymentLabel + " payment instructions." : ".");

      contactForm.reset();
      statusBox.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
});
