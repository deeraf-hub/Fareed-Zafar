// RMPS — interactions: nav, scroll reveals, payment demo, counters, chart

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveals();
  initPaymentDemo();
  initCounters();
  initTimeline();
  initChart();
  document.getElementById('year').textContent = new Date().getFullYear();
});

/* ---------------- Navbar ---------------- */
function initNav() {
  const nav = document.querySelector('.navbar');
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
  });

  links.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}

/* ---------------- Scroll reveal ---------------- */
function initReveals() {
  const targets = document.querySelectorAll('.reveal, .timeline-step');
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );
  targets.forEach((t) => io.observe(t));
}

/* ---------------- Payment gateway interactive demo ---------------- */
const PAYMENT_METHODS = {
  jazzcash: { label: 'JazzCash Wallet' },
  easypaisa: { label: 'Easypaisa Wallet' },
  cards: { label: 'Visa / Mastercard' },
  bank: { label: 'Bank Account Transfer' },
  qr: { label: 'QR Payment' },
  paypak: { label: 'PayPak / UnionPay' },
};

function initPaymentDemo() {
  const chips = document.querySelectorAll('.method-chip');
  const methodLabel = document.getElementById('checkoutMethodLabel');
  const status = document.getElementById('checkoutStatus');
  const statusText = document.getElementById('checkoutStatusText');
  if (!chips.length || !methodLabel) return;

  let timer;

  const runDemo = (key) => {
    chips.forEach((c) => c.classList.toggle('active', c.dataset.method === key));
    methodLabel.textContent = PAYMENT_METHODS[key]?.label || 'Select a method';

    clearTimeout(timer);
    status.classList.remove('success');
    status.querySelector('.spinner').style.display = '';
    statusText.textContent = 'Processing payment…';

    timer = setTimeout(() => {
      status.classList.add('success');
      statusText.textContent = 'Payment successful — settlement in progress';
    }, 1200);
  };

  chips.forEach((chip) => {
    chip.addEventListener('click', () => runDemo(chip.dataset.method));
  });

  runDemo('jazzcash');
}

/* ---------------- Animated counters (dashboard stats) ---------------- */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const animate = (el) => {
    const target = parseFloat(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals, 10) : 0;
    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = `${prefix}${value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  counters.forEach((c) => io.observe(c));
}

/* ---------------- Timeline step highlight ---------------- */
function initTimeline() {
  // handled via .in-view class from initReveals() (shared observer target)
}

/* ---------------- Dashboard bar chart (SVG) ---------------- */
function initChart() {
  const chart = document.getElementById('dashChart');
  if (!chart) return;

  const values = [42, 58, 51, 70, 64, 82, 76, 91, 85, 97, 88, 100];
  const width = 100;
  const height = 40;
  const barWidth = width / values.length;

  const bars = values
    .map((v, i) => {
      const h = (v / 100) * height;
      const x = i * barWidth + barWidth * 0.15;
      const y = height - h;
      const w = barWidth * 0.7;
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.2" class="chart-bar" style="animation-delay:${i * 60}ms"></rect>`;
    })
    .join('');

  chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" width="100%" height="140">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#17b978" />
          <stop offset="100%" stop-color="#2af598" />
        </linearGradient>
      </defs>
      ${bars}
    </svg>
    <style>
      .chart-bar { fill: url(#barGrad); transform-origin: bottom; animation: growBar .8s ease both; }
      @keyframes growBar { from { transform: scaleY(0); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
    </style>
  `;
}
