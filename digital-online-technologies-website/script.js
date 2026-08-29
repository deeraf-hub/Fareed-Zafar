/* =========================================================
   DIGITAL ONLINE TECHNOLOGIES SMC PRIVATE LIMITED
   Site script: product data, rendering, filters, search,
   product modal, cart + checkout, contact form, UI behavior
   ========================================================= */

/* ---------------------------------------------------------
   1. PRODUCT CATALOG
   --------------------------------------------------------- */
const CATEGORY_LABELS = {
  business: "Business",
  accounting: "Accounting",
  pos: "POS",
  education: "Education",
  healthcare: "Healthcare",
  hr: "HR",
  retail: "Retail",
  management: "Management"
};

const CATEGORY_COLORS = {
  business: "#2554e6",
  accounting: "#6c3ce9",
  pos: "#00b39a",
  education: "#f2994a",
  healthcare: "#eb5757",
  hr: "#2f80ed",
  retail: "#9b51e0",
  management: "#219653"
};

const PRODUCTS = [
  {
    id: "business-accounting-software",
    name: "Business Accounting Software",
    categories: ["business", "accounting"],
    icon: "fa-solid fa-calculator",
    price: 7500,
    featured: true,
    shortDesc: "Manage ledgers, invoices and financial reports from one system.",
    description: "A complete double-entry accounting solution that helps businesses record transactions, manage accounts, generate financial statements and stay on top of cash flow without hiring a full-time accountant.",
    features: ["Chart of accounts & ledgers", "Sales & purchase invoicing", "Bank & cash reconciliation", "Profit & loss and balance sheet reports", "Tax-ready financial summaries", "Multi-user access"],
    benefits: ["Saves hours of manual bookkeeping", "Reduces accounting errors", "Gives a clear view of business profitability", "Keeps financial records organized and audit-ready"],
    suitableFor: ["Small & medium businesses", "Retail shops", "Trading companies", "Freelancers & consultants"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "500 MB free storage", "1024x768 display resolution"]
  },
  {
    id: "inventory-management-software",
    name: "Inventory Management Software",
    categories: ["retail", "management"],
    icon: "fa-solid fa-boxes-stacked",
    price: 6500,
    featured: true,
    shortDesc: "Manage stock, products, purchases and sales from one simple system.",
    description: "Manage stock, products, purchases and sales from one simple system. Stay informed with real-time stock levels and never run out of your best-selling items again.",
    features: ["Product management", "Stock tracking", "Purchase records", "Sales records", "Low-stock alerts", "Reports", "Customer management"],
    benefits: ["Prevents overstocking and stockouts", "Saves time on manual stock counts", "Improves purchase planning", "Gives full visibility of inventory value"],
    suitableFor: ["Retail stores", "Wholesalers", "Warehouses", "Distribution businesses"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "1 GB free storage", "Barcode scanner (optional)"]
  },
  {
    id: "pos-software",
    name: "Point of Sale (POS) Software",
    categories: ["pos", "retail"],
    icon: "fa-solid fa-cash-register",
    price: 7000,
    featured: true,
    shortDesc: "Fast, reliable billing counter software for shops and retail outlets.",
    description: "A complete point-of-sale system built for busy checkout counters. Process sales quickly, print receipts, manage cash drawers and track daily sales performance with ease.",
    features: ["Quick billing screen", "Barcode & manual entry", "Receipt printing", "Multiple payment modes", "Daily sales summary", "Discount & tax handling", "Return & exchange support"],
    benefits: ["Speeds up checkout and reduces queues", "Minimizes billing mistakes", "Gives instant daily sales insight", "Works well with barcode scanners & receipt printers"],
    suitableFor: ["Retail shops", "Supermarkets", "Pharmacies", "Electronics stores"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "500 MB free storage", "Receipt printer & barcode scanner (optional)"]
  },
  {
    id: "school-management-software",
    name: "School Management Software",
    categories: ["education", "management"],
    icon: "fa-solid fa-graduation-cap",
    price: 6500,
    featured: true,
    shortDesc: "Manage students, classes, attendance and results in one platform.",
    description: "An all-in-one school management system that simplifies student records, class scheduling, attendance, exams and communication with parents — built for schools and academies of any size.",
    features: ["Student admission & records", "Class & section management", "Attendance tracking", "Exam & result management", "Timetable management", "Teacher records", "Parent communication log"],
    benefits: ["Reduces paperwork for administration", "Improves accuracy of student records", "Makes result preparation faster", "Keeps parents informed"],
    suitableFor: ["Schools", "Academies", "Coaching centers", "Training institutes"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "1 GB free storage", "Printer for report cards (optional)"]
  },
  {
    id: "pharmacy-management-software",
    name: "Pharmacy Management Software",
    categories: ["healthcare", "management"],
    icon: "fa-solid fa-prescription-bottle-medical",
    price: 5500,
    featured: true,
    shortDesc: "Manage medicine stock, sales, expiry and prescriptions with ease.",
    description: "Purpose-built for pharmacies, this system manages medicine inventory, batch and expiry tracking, sales billing and supplier purchases so nothing important slips through the cracks.",
    features: ["Medicine inventory management", "Batch & expiry tracking", "Sales billing", "Supplier & purchase records", "Expiry alerts", "Low-stock alerts", "Sales reports"],
    benefits: ["Reduces losses from expired stock", "Speeds up counter billing", "Improves supplier order planning", "Keeps medicine records organized"],
    suitableFor: ["Pharmacies", "Medical stores", "Clinics with in-house dispensing"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "500 MB free storage", "Receipt printer (optional)"]
  },
  {
    id: "restaurant-pos-software",
    name: "Restaurant POS Software",
    categories: ["pos", "retail"],
    icon: "fa-solid fa-utensils",
    price: 6000,
    shortDesc: "Manage orders, tables, kitchen tickets and billing for restaurants.",
    description: "A restaurant-focused billing system that handles dine-in, takeaway and delivery orders, sends kitchen order tickets, and generates accurate bills — keeping service fast and organized.",
    features: ["Table & order management", "Kitchen order ticket (KOT) printing", "Menu & item management", "Takeaway & delivery billing", "Discount & tax handling", "Daily sales reports"],
    benefits: ["Speeds up order taking and billing", "Reduces order mistakes between kitchen and counter", "Improves table turnover", "Gives clear daily revenue insight"],
    suitableFor: ["Restaurants", "Cafes", "Fast food outlets", "Bakeries"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "500 MB free storage", "Receipt/KOT printer (optional)"]
  },
  {
    id: "hotel-management-software",
    name: "Hotel Management Software",
    categories: ["management", "business"],
    icon: "fa-solid fa-hotel",
    price: 7500,
    shortDesc: "Manage room bookings, check-ins, billing and guest records.",
    description: "A complete front-desk solution for guest houses and hotels — manage room availability, bookings, check-in/check-out, billing and guest history from a single dashboard.",
    features: ["Room & booking management", "Check-in / check-out", "Guest record management", "Billing & invoicing", "Room availability calendar", "Reports & occupancy summary"],
    benefits: ["Simplifies front-desk operations", "Reduces booking conflicts", "Speeds up guest billing", "Keeps guest history for repeat customers"],
    suitableFor: ["Hotels", "Guest houses", "Resorts", "Motels"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "1 GB free storage", "Receipt printer (optional)"]
  },
  {
    id: "payroll-management-software",
    name: "Payroll Management Software",
    categories: ["hr", "business"],
    icon: "fa-solid fa-money-check-dollar",
    price: 5000,
    shortDesc: "Automate salary calculation, deductions and payslip generation.",
    description: "Simplify monthly payroll processing with automated salary calculations, deductions, allowances and printable payslips — accurate pay, every time, without spreadsheets.",
    features: ["Employee salary setup", "Automatic salary calculation", "Deductions & allowances", "Payslip generation", "Attendance-based pay adjustment", "Payroll reports"],
    benefits: ["Eliminates manual salary calculation errors", "Saves hours every month on payroll", "Keeps payroll records organized", "Builds employee trust with accurate payslips"],
    suitableFor: ["Small & medium businesses", "Offices", "Factories", "Retail chains"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "500 MB free storage", "Printer for payslips (optional)"]
  },
  {
    id: "employee-attendance-software",
    name: "Employee Attendance Software",
    categories: ["hr"],
    icon: "fa-solid fa-fingerprint",
    price: 4500,
    shortDesc: "Track staff attendance, check-in/out times and leave records.",
    description: "Track employee check-in and check-out times, monitor late arrivals, and manage leave requests from a simple, easy-to-use attendance dashboard.",
    features: ["Daily attendance tracking", "Check-in / check-out logging", "Leave management", "Late & absence tracking", "Attendance reports", "Biometric device support (optional)"],
    benefits: ["Improves staff punctuality", "Reduces manual attendance registers", "Makes leave tracking transparent", "Simplifies monthly attendance reporting"],
    suitableFor: ["Offices", "Factories", "Retail businesses", "Schools"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "500 MB free storage", "Biometric device (optional)"]
  },
  {
    id: "customer-management-software",
    name: "Customer Management Software",
    categories: ["business", "management"],
    icon: "fa-solid fa-users",
    price: 5500,
    shortDesc: "Organize customer records, purchase history and follow-ups.",
    description: "A simple CRM to keep track of your customers, their contact details, purchase history and follow-up reminders — helping you build stronger, longer-lasting relationships.",
    features: ["Customer database", "Purchase history tracking", "Follow-up reminders", "Customer categorization", "Contact management", "Reports & customer insights"],
    benefits: ["Improves customer retention", "Keeps all customer information in one place", "Helps identify your most valuable customers", "Makes follow-ups easy to manage"],
    suitableFor: ["Retail businesses", "Service providers", "Sales teams", "Small businesses"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "500 MB free storage"]
  },
  {
    id: "invoice-billing-software",
    name: "Invoice & Billing Software",
    categories: ["accounting", "business"],
    icon: "fa-solid fa-file-invoice-dollar",
    price: 4000,
    shortDesc: "Create professional invoices and manage billing quickly.",
    description: "Generate professional, ready-to-print invoices in seconds, track payments received and pending, and keep a complete billing history for every customer.",
    features: ["Professional invoice creation", "Payment tracking", "Pending dues management", "Customer billing history", "Print & PDF export", "Tax calculation"],
    benefits: ["Creates a professional impression with clients", "Reduces billing errors", "Keeps track of unpaid invoices", "Speeds up the billing process"],
    suitableFor: ["Freelancers", "Service businesses", "Small shops", "Consultants"],
    requirements: ["Windows 10/11 (64-bit)", "2 GB RAM minimum", "300 MB free storage", "Printer (optional)"]
  },
  {
    id: "shop-management-software",
    name: "Shop Management Software",
    categories: ["retail", "management"],
    icon: "fa-solid fa-shop",
    price: 5000,
    shortDesc: "All-in-one solution to manage daily shop operations.",
    description: "Designed for everyday retail shops, this system combines billing, stock and customer management into one easy-to-use tool that runs your shop smoothly from open to close.",
    features: ["Billing & checkout", "Stock management", "Customer ledger", "Daily sales summary", "Supplier records", "Basic reporting"],
    benefits: ["Simplifies day-to-day shop management", "Reduces reliance on manual registers", "Gives a clear daily sales picture", "Improves stock accuracy"],
    suitableFor: ["General stores", "Garment shops", "Electronics shops", "Hardware stores"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "500 MB free storage"]
  },
  {
    id: "clinic-management-software",
    name: "Clinic Management Software",
    categories: ["healthcare", "management"],
    icon: "fa-solid fa-stethoscope",
    price: 6500,
    shortDesc: "Manage patient records, appointments and billing for clinics.",
    description: "A practical clinic management system for doctors and small healthcare practices — manage patient records, schedule appointments, and generate consultation bills with ease.",
    features: ["Patient record management", "Appointment scheduling", "Consultation billing", "Visit history tracking", "Prescription notes", "Basic reporting"],
    benefits: ["Reduces paperwork for clinic staff", "Improves appointment scheduling", "Keeps complete patient visit history", "Speeds up billing at the front desk"],
    suitableFor: ["Clinics", "Small hospitals", "Diagnostic centers", "Individual practitioners"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "500 MB free storage", "Printer (optional)"]
  },
  {
    id: "school-fee-management-software",
    name: "School Fee Management Software",
    categories: ["education", "accounting"],
    icon: "fa-solid fa-school",
    price: 4500,
    shortDesc: "Manage fee collection, receipts and dues for schools.",
    description: "Simplify fee collection with automated fee structures, printed receipts, and clear tracking of paid and pending dues for every student and class.",
    features: ["Fee structure setup", "Receipt generation", "Due & defaulter tracking", "Class-wise fee reports", "Discount & scholarship handling", "Payment history"],
    benefits: ["Reduces fee collection errors", "Saves administrative time each month", "Makes defaulter tracking simple", "Keeps parents informed with clear receipts"],
    suitableFor: ["Schools", "Academies", "Coaching centers", "Training institutes"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "500 MB free storage", "Printer for receipts (optional)"]
  },
  {
    id: "hr-management-software",
    name: "HR Management Software",
    categories: ["hr", "business"],
    icon: "fa-solid fa-id-badge",
    price: 7000,
    shortDesc: "Manage employee records, attendance, payroll and HR tasks.",
    description: "A complete HR toolkit that brings employee records, attendance, leave and payroll together — helping HR teams manage the entire employee lifecycle in one place.",
    features: ["Employee record management", "Attendance & leave tracking", "Payroll integration", "Document management", "Performance notes", "HR reports"],
    benefits: ["Centralizes all HR data in one system", "Reduces manual HR paperwork", "Improves employee record accuracy", "Simplifies HR reporting"],
    suitableFor: ["Offices", "Medium-sized businesses", "Factories", "Retail chains"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "1 GB free storage"]
  },
  {
    id: "sales-management-software",
    name: "Sales Management Software",
    categories: ["business", "management"],
    icon: "fa-solid fa-chart-line",
    price: 5500,
    shortDesc: "Track sales orders, targets and team performance.",
    description: "Keep every sale organized — from order to delivery — while tracking sales targets and team performance with clear, easy-to-read reports.",
    features: ["Sales order management", "Sales target tracking", "Salesperson performance reports", "Customer-wise sales history", "Invoice generation", "Dashboard summaries"],
    benefits: ["Improves visibility into sales performance", "Helps set and track achievable targets", "Reduces missed or duplicate orders", "Supports better sales decisions"],
    suitableFor: ["Distribution businesses", "Sales teams", "Wholesalers", "Manufacturers"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "500 MB free storage"]
  },
  {
    id: "purchase-management-software",
    name: "Purchase Management Software",
    categories: ["business", "management"],
    icon: "fa-solid fa-cart-flatbed",
    price: 4500,
    shortDesc: "Manage supplier orders, purchase records and payments.",
    description: "Streamline your procurement process by managing purchase orders, supplier records and pending payments — all from one organized system.",
    features: ["Purchase order creation", "Supplier management", "Purchase history tracking", "Pending payment tracking", "Stock-in updates", "Purchase reports"],
    benefits: ["Improves supplier order tracking", "Reduces duplicate or missed orders", "Keeps purchase costs under control", "Simplifies supplier payment tracking"],
    suitableFor: ["Retail businesses", "Wholesalers", "Manufacturers", "Trading companies"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "500 MB free storage"]
  },
  {
    id: "vehicle-management-software",
    name: "Vehicle Management Software",
    categories: ["management", "business"],
    icon: "fa-solid fa-car",
    price: 5000,
    shortDesc: "Track vehicles, maintenance schedules and fuel expenses.",
    description: "Keep track of your company vehicles, maintenance schedules, fuel usage and driver assignments to keep your fleet running smoothly and cost-effectively.",
    features: ["Vehicle record management", "Maintenance & service scheduling", "Fuel expense tracking", "Driver assignment records", "Document & insurance reminders", "Reports"],
    benefits: ["Reduces unexpected vehicle downtime", "Keeps maintenance on schedule", "Improves fuel cost visibility", "Keeps vehicle documents organized"],
    suitableFor: ["Transport companies", "Rental businesses", "Logistics companies", "Offices with company vehicles"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "500 MB free storage"]
  },
  {
    id: "membership-management-software",
    name: "Membership Management Software",
    categories: ["management", "business"],
    icon: "fa-solid fa-id-card",
    price: 4000,
    shortDesc: "Manage memberships, renewals and payments for clubs and gyms.",
    description: "Manage member registrations, renewal dates and payment records for gyms, clubs and membership-based businesses — with automatic reminders for upcoming renewals.",
    features: ["Member registration", "Membership plan management", "Renewal reminders", "Payment tracking", "Attendance / check-in log", "Member reports"],
    benefits: ["Reduces missed renewals", "Improves member payment tracking", "Saves time on membership administration", "Keeps member records organized"],
    suitableFor: ["Gyms", "Clubs", "Fitness centers", "Membership-based businesses"],
    requirements: ["Windows 10/11 (64-bit)", "2 GB RAM minimum", "300 MB free storage"]
  },
  {
    id: "small-business-manager",
    name: "Small Business Manager",
    categories: ["business"],
    icon: "fa-solid fa-briefcase",
    price: 3500,
    featured: true,
    shortDesc: "A simple all-in-one tool for managing small business operations.",
    description: "A lightweight, easy-to-use tool that brings billing, basic stock tracking and customer records together — perfect for small businesses that need simplicity over complexity.",
    features: ["Simple billing", "Basic stock tracking", "Customer records", "Daily sales summary", "Expense tracking", "Easy setup"],
    benefits: ["Very easy to learn and use", "Affordable entry point into business software", "Reduces reliance on manual registers", "Ideal for first-time software users"],
    suitableFor: ["Small shops", "Home-based businesses", "Startups", "Sole proprietors"],
    requirements: ["Windows 10/11 (64-bit)", "2 GB RAM minimum", "300 MB free storage"]
  },
  {
    id: "hospital-management-software",
    name: "Hospital Management Software",
    categories: ["healthcare", "management"],
    icon: "fa-solid fa-hospital",
    price: 7500,
    shortDesc: "Manage patients, departments, billing and records for hospitals.",
    description: "A comprehensive hospital management system covering patient registration, department management, billing and medical record keeping — designed to keep hospital operations organized.",
    features: ["Patient registration & records", "Department & ward management", "OPD & IPD billing", "Doctor scheduling", "Medical record history", "Reports & analytics"],
    benefits: ["Improves coordination between departments", "Reduces paperwork for hospital staff", "Speeds up patient billing", "Keeps complete medical history accessible"],
    suitableFor: ["Hospitals", "Multi-specialty clinics", "Diagnostic centers"],
    requirements: ["Windows 10/11 (64-bit)", "8 GB RAM recommended", "2 GB free storage", "Network setup for multi-user access"]
  },
  {
    id: "exam-management-software",
    name: "Online Exam & Quiz Management Software",
    categories: ["education"],
    icon: "fa-solid fa-clipboard-question",
    price: 3000,
    shortDesc: "Create, manage and grade tests and quizzes with ease.",
    description: "Create question banks, generate tests and quizzes, and grade results automatically — helping schools and training centers save time on exam preparation and evaluation.",
    features: ["Question bank creation", "Test & quiz generation", "Automatic grading", "Result compilation", "Printable question papers", "Performance reports"],
    benefits: ["Saves teachers time on test creation", "Reduces grading errors", "Makes result compilation faster", "Keeps a reusable question bank"],
    suitableFor: ["Schools", "Academies", "Training centers", "Coaching institutes"],
    requirements: ["Windows 10/11 (64-bit)", "4 GB RAM minimum", "500 MB free storage", "Printer (optional)"]
  }
];

const PRODUCTS_BY_ID = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

function formatPKR(amount){
  return "PKR " + amount.toLocaleString("en-PK");
}

function primaryCategoryColor(product){
  return CATEGORY_COLORS[product.categories[0]] || "#2554e6";
}

/* ---------------------------------------------------------
   2. PRODUCT CARD RENDERING
   --------------------------------------------------------- */
function categoryTagsHTML(product){
  return product.categories
    .map(c => `<span>${CATEGORY_LABELS[c]}</span>`)
    .join("");
}

function productCardHTML(product){
  const color = primaryCategoryColor(product);
  const topFeatures = product.features.slice(0, 3);
  return `
  <article class="product-card reveal" data-id="${product.id}" data-name="${product.name.toLowerCase()}" data-categories="${product.categories.join(",")}">
    <div class="card-top">
      <div class="product-icon" style="background:${color}"><i class="${product.icon}"></i></div>
      <div class="card-category">${CATEGORY_LABELS[product.categories[0]]}</div>
    </div>
    <h3>${product.name}</h3>
    <p class="card-desc">${product.shortDesc}</p>
    <div class="feature-tags">
      ${topFeatures.map(f => `<span>${f}</span>`).join("")}
    </div>
    <div class="card-footer">
      <div class="card-price"><span class="amount">${product.price.toLocaleString("en-PK")}</span><span class="currency">PKR</span></div>
      <div class="card-actions">
        <button class="btn btn-secondary btn-view-details" data-id="${product.id}"><i class="fa-solid fa-eye"></i> View Details</button>
        <button class="btn btn-primary btn-add-cart" data-id="${product.id}"><i class="fa-solid fa-cart-plus"></i> Add to Cart</button>
      </div>
    </div>
  </article>`;
}

function renderGrid(container, products){
  if (!container) return;
  if (products.length === 0){
    container.innerHTML = `
      <div class="no-results">
        <i class="fa-solid fa-magnifying-glass"></i>
        <h3>No software found</h3>
        <p>Try a different search term or choose another category.</p>
      </div>`;
    return;
  }
  container.innerHTML = products.map(productCardHTML).join("");
  revealOnScroll();
}

/* ---------------------------------------------------------
   3. FILTERING & SEARCH (products.html)
   --------------------------------------------------------- */
function initCatalogPage(){
  const grid = document.getElementById("software-grid");
  if (!grid) return;

  const searchInput = document.getElementById("software-search");
  const filterBar = document.getElementById("filter-bar");
  const resultsMeta = document.getElementById("results-meta");
  let activeFilter = "all";
  let searchTerm = "";

  function applyFilters(){
    let list = PRODUCTS;
    if (activeFilter !== "all"){
      list = list.filter(p => p.categories.includes(activeFilter));
    }
    if (searchTerm.trim() !== ""){
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.shortDesc.toLowerCase().includes(q) ||
        p.categories.some(c => CATEGORY_LABELS[c].toLowerCase().includes(q))
      );
    }
    renderGrid(grid, list);
    if (resultsMeta){
      resultsMeta.textContent = `Showing ${list.length} of ${PRODUCTS.length} software solutions`;
    }
  }

  if (filterBar){
    filterBar.addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip");
      if (!chip) return;
      filterBar.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      activeFilter = chip.dataset.filter;
      applyFilters();
    });
  }

  if (searchInput){
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value;
      applyFilters();
    });
  }

  // Support ?category=xxx deep link from homepage
  const params = new URLSearchParams(window.location.search);
  const categoryParam = params.get("category");
  if (categoryParam && filterBar){
    const chip = filterBar.querySelector(`[data-filter="${categoryParam}"]`);
    if (chip){
      filterBar.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      activeFilter = categoryParam;
    }
  }

  applyFilters();
}

function initFeaturedPreview(){
  const grid = document.getElementById("software-preview-grid");
  if (!grid) return;
  const featured = PRODUCTS.filter(p => p.featured);
  renderGrid(grid, featured);
}

/* ---------------------------------------------------------
   4. PRODUCT DETAILS MODAL
   --------------------------------------------------------- */
function buildModalHTML(product){
  const color = primaryCategoryColor(product);
  return `
    <button class="modal-close" id="modal-close-btn" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
    <div class="modal-header">
      <div class="product-icon" style="background:${color}"><i class="${product.icon}"></i></div>
      <div>
        <div class="modal-category">${categoryTagsHTML(product)}</div>
        <h2>${product.name}</h2>
      </div>
    </div>
    <div class="modal-body">
      <div class="modal-price-row">
        <div>
          <div style="font-size:12.5px;color:var(--color-text-muted);font-weight:600;">Price</div>
          <span class="amount">${formatPKR(product.price)}</span>
        </div>
        <div style="font-size:13px;color:var(--color-text-muted);"><i class="fa-solid fa-circle-check" style="color:var(--color-accent);"></i> One-time license</div>
      </div>

      <p class="modal-desc">${product.description}</p>

      <h4>Key Features</h4>
      <ul class="modal-list">
        ${product.features.map(f => `<li><i class="fa-solid fa-check"></i> ${f}</li>`).join("")}
      </ul>

      <h4>Benefits</h4>
      <ul class="modal-list">
        ${product.benefits.map(b => `<li><i class="fa-solid fa-star"></i> ${b}</li>`).join("")}
      </ul>

      <h4>Suitable For</h4>
      <div class="suitable-tags">
        ${product.suitableFor.map(s => `<span>${s}</span>`).join("")}
      </div>

      <h4>System Requirements</h4>
      <ul class="req-list">
        ${product.requirements.map(r => `<li><i class="fa-solid fa-desktop" style="width:16px;color:var(--color-text-muted);"></i> ${r}</li>`).join("")}
      </ul>

      <div class="modal-actions">
        <button class="btn btn-primary btn-block btn-add-cart" data-id="${product.id}"><i class="fa-solid fa-cart-plus"></i> Add to Cart</button>
        <a href="index.html#contact" class="btn btn-secondary btn-block modal-enquire" data-id="${product.id}"><i class="fa-solid fa-envelope"></i> Enquire About This Software</a>
      </div>
    </div>
  `;
}

function openProductModal(id){
  const product = PRODUCTS_BY_ID[id];
  if (!product) return;
  const overlay = document.getElementById("product-modal");
  const box = document.getElementById("product-modal-box");
  if (!overlay || !box) return;
  box.innerHTML = buildModalHTML(product);
  overlay.classList.add("is-open");
  document.body.style.overflow = "hidden";

  document.getElementById("modal-close-btn").addEventListener("click", closeProductModal);

  const enquireLink = box.querySelector(".modal-enquire");
  if (enquireLink){
    enquireLink.addEventListener("click", () => {
      closeProductModal();
      setTimeout(() => prefillEnquiry(product.name), 300);
    });
  }
}

function closeProductModal(){
  const overlay = document.getElementById("product-modal");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  document.body.style.overflow = "";
}

function prefillEnquiry(productName){
  const select = document.getElementById("contact-software");
  if (select){
    const option = Array.from(select.options).find(o => o.value === productName);
    if (option) select.value = productName;
  }
}

/* ---------------------------------------------------------
   5. CART (localStorage) & CHECKOUT
   Note: no real payment gateway is integrated. Customers choose
   a preferred payment method (JazzCash, EasyPaisa or Cash on
   Delivery) and Digital Online Technologies confirms and
   completes payment directly with the customer.
   --------------------------------------------------------- */
const CART_KEY = "dot_cart_v1";

function getCart(){
  try{
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  }catch(e){
    return [];
  }
}

function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function addToCart(id){
  const cart = getCart();
  const existing = cart.find(item => item.id === id);
  if (existing){
    existing.qty += 1;
  }else{
    cart.push({ id, qty: 1 });
  }
  saveCart(cart);
  renderCartDrawer();
  openCartDrawer();
}

function updateCartQty(id, delta){
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  const filtered = item.qty <= 0 ? cart.filter(i => i.id !== id) : cart;
  saveCart(filtered);
  renderCartDrawer();
}

function removeFromCart(id){
  const cart = getCart().filter(i => i.id !== id);
  saveCart(cart);
  renderCartDrawer();
}

function cartTotal(){
  return getCart().reduce((sum, item) => {
    const product = PRODUCTS_BY_ID[item.id];
    return product ? sum + product.price * item.qty : sum;
  }, 0);
}

function updateCartCount(){
  const count = getCart().reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll(".cart-count").forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? "flex" : "none";
  });
}

function renderCartDrawer(){
  const itemsEl = document.getElementById("cart-items");
  const footerEl = document.getElementById("cart-footer");
  if (!itemsEl) return;
  const cart = getCart();

  if (cart.length === 0){
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <i class="fa-solid fa-cart-shopping"></i>
        <p>Your cart is empty.<br>Browse our software and add items to get started.</p>
      </div>`;
    if (footerEl) footerEl.style.display = "none";
    return;
  }

  if (footerEl) footerEl.style.display = "block";

  itemsEl.innerHTML = cart.map(item => {
    const product = PRODUCTS_BY_ID[item.id];
    if (!product) return "";
    const color = primaryCategoryColor(product);
    return `
      <div class="cart-item">
        <div class="ci-icon" style="background:${color}"><i class="${product.icon}"></i></div>
        <div class="cart-item-info">
          <h5>${product.name}</h5>
          <div class="ci-price">${formatPKR(product.price)}</div>
          <div class="qty-control">
            <button class="qty-decrease" data-id="${item.id}"><i class="fa-solid fa-minus"></i></button>
            <span>${item.qty}</span>
            <button class="qty-increase" data-id="${item.id}"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>
        <button class="remove-item" data-id="${item.id}" aria-label="Remove"><i class="fa-solid fa-trash"></i></button>
      </div>`;
  }).join("");

  const subtotalEl = document.getElementById("cart-subtotal-amount");
  if (subtotalEl) subtotalEl.textContent = formatPKR(cartTotal());
}

function openCartDrawer(){
  const overlay = document.getElementById("cart-overlay");
  if (!overlay) return;
  renderCartDrawer();
  overlay.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeCartDrawer(){
  const overlay = document.getElementById("cart-overlay");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  document.body.style.overflow = "";
}

/* ---------- Checkout modal ---------- */
function openCheckoutModal(){
  const cart = getCart();
  if (cart.length === 0) return;
  closeCartDrawer();
  const overlay = document.getElementById("checkout-modal");
  const box = document.getElementById("checkout-modal-box");
  if (!overlay || !box) return;

  const summaryRows = cart.map(item => {
    const product = PRODUCTS_BY_ID[item.id];
    if (!product) return "";
    return `<div class="checkout-summary-row"><span>${product.name} x${item.qty}</span><span>${formatPKR(product.price * item.qty)}</span></div>`;
  }).join("");

  box.innerHTML = `
    <button class="modal-close" id="checkout-close-btn" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
    <div class="modal-header">
      <div class="product-icon" style="background:var(--color-primary)"><i class="fa-solid fa-bag-shopping"></i></div>
      <div><h2>Complete Your Order Request</h2><div class="modal-category">No online payment is charged now</div></div>
    </div>
    <div class="modal-body">
      <div class="form-success" id="checkout-success">
        <i class="fa-solid fa-circle-check"></i>
        <div>
          <strong>Order request received!</strong><br>
          Thank you. Our team will call you shortly to confirm your order and complete payment via your selected method.
        </div>
      </div>

      <div class="checkout-summary">
        ${summaryRows}
        <div class="checkout-summary-row total"><span>Total</span><span>${formatPKR(cartTotal())}</span></div>
      </div>

      <form id="checkout-form" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label for="co-name">Full Name</label>
            <input type="text" id="co-name" name="name" placeholder="Your full name" required>
            <div class="field-error">Please enter your full name.</div>
          </div>
          <div class="form-group">
            <label for="co-phone">Phone Number</label>
            <input type="tel" id="co-phone" name="phone" placeholder="03XXXXXXXXX" required>
            <div class="field-error">Please enter a valid phone number.</div>
          </div>
        </div>
        <div class="form-group">
          <label for="co-address">Delivery / Business Address</label>
          <input type="text" id="co-address" name="address" placeholder="Shop / office address, city" required>
          <div class="field-error">Please enter your address.</div>
        </div>

        <div class="form-group">
          <label>Preferred Payment Method</label>
          <div class="payment-options">
            <label class="payment-option" data-method="jazzcash">
              <input type="radio" name="payment" value="JazzCash" required>
              <div class="po-icon" style="background:#e6002d"><i class="fa-solid fa-mobile-screen-button"></i></div>
              <div><strong>JazzCash</strong><span>Pay via JazzCash mobile account after confirmation</span></div>
            </label>
            <label class="payment-option" data-method="easypaisa">
              <input type="radio" name="payment" value="EasyPaisa" required>
              <div class="po-icon" style="background:#2e7d32"><i class="fa-solid fa-wallet"></i></div>
              <div><strong>EasyPaisa</strong><span>Pay via EasyPaisa mobile account after confirmation</span></div>
            </label>
            <label class="payment-option" data-method="cod">
              <input type="radio" name="payment" value="Cash on Delivery" required>
              <div class="po-icon" style="background:#455a64"><i class="fa-solid fa-hand-holding-dollar"></i></div>
              <div><strong>Cash on Delivery</strong><span>Pay in cash when your software is delivered/installed</span></div>
            </label>
          </div>
          <div class="field-error" id="payment-error">Please choose a payment method.</div>
        </div>

        <button type="submit" class="btn btn-primary btn-block"><i class="fa-solid fa-paper-plane"></i> Submit Order Request</button>
        <p class="cart-note">This sends an order request to our team — no payment is processed online. We will contact you to confirm details and arrange payment via your chosen method.</p>
      </form>
    </div>
  `;

  overlay.classList.add("is-open");
  document.body.style.overflow = "hidden";

  document.getElementById("checkout-close-btn").addEventListener("click", closeCheckoutModal);

  box.querySelectorAll(".payment-option").forEach(opt => {
    opt.addEventListener("click", () => {
      box.querySelectorAll(".payment-option").forEach(o => o.classList.remove("is-selected"));
      opt.classList.add("is-selected");
    });
  });

  const form = document.getElementById("checkout-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let valid = true;

    const nameInput = document.getElementById("co-name");
    const phoneInput = document.getElementById("co-phone");
    const addressInput = document.getElementById("co-address");
    const paymentChecked = form.querySelector('input[name="payment"]:checked');
    const paymentError = document.getElementById("payment-error");

    valid = validateField(nameInput, v => v.trim().length >= 3) && valid;
    valid = validateField(phoneInput, v => /^(\+92|0)[0-9]{10}$/.test(v.replace(/[\s-]/g, ""))) && valid;
    valid = validateField(addressInput, v => v.trim().length >= 5) && valid;

    if (!paymentChecked){
      paymentError.style.display = "block";
      valid = false;
    }else{
      paymentError.style.display = "none";
    }

    if (!valid) return;

    document.getElementById("checkout-success").classList.add("is-visible");
    form.style.display = "none";

    saveCart([]);

    setTimeout(() => {
      closeCheckoutModal();
      form.style.display = "block";
      form.reset();
      document.getElementById("checkout-success").classList.remove("is-visible");
    }, 3200);
  });
}

function closeCheckoutModal(){
  const overlay = document.getElementById("checkout-modal");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  document.body.style.overflow = "";
}

/* ---------------------------------------------------------
   6. CONTACT FORM VALIDATION
   --------------------------------------------------------- */
function validateField(input, testFn){
  const group = input.closest(".form-group");
  const isValid = testFn(input.value);
  if (group){
    group.classList.toggle("has-error", !isValid);
  }
  return isValid;
}

function populateSoftwareSelect(){
  const select = document.getElementById("contact-software");
  if (!select) return;
  const options = [`<option value="">Select a software (optional)</option>`]
    .concat(PRODUCTS.map(p => `<option value="${p.name}">${p.name}</option>`))
    .concat([`<option value="Not sure / General enquiry">Not sure / General enquiry</option>`]);
  select.innerHTML = options.join("");
}

function initContactForm(){
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("contact-name");
    const phone = document.getElementById("contact-phone");
    const email = document.getElementById("contact-email");
    const message = document.getElementById("contact-message");

    let valid = true;
    valid = validateField(name, v => v.trim().length >= 3) && valid;
    valid = validateField(phone, v => /^(\+92|0)[0-9]{10}$/.test(v.replace(/[\s-]/g, ""))) && valid;
    valid = validateField(email, v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) && valid;
    valid = validateField(message, v => v.trim().length >= 10) && valid;

    if (!valid) return;

    document.getElementById("contact-success").classList.add("is-visible");
    form.reset();

    setTimeout(() => {
      document.getElementById("contact-success").classList.remove("is-visible");
    }, 6000);
  });

  form.querySelectorAll("input, textarea").forEach(field => {
    field.addEventListener("input", () => {
      field.closest(".form-group")?.classList.remove("has-error");
    });
  });
}

/* ---------------------------------------------------------
   7. HEADER / MOBILE NAV / SCROLL BEHAVIOR
   --------------------------------------------------------- */
function initHeader(){
  const header = document.getElementById("site-header");
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);

    const backToTop = document.getElementById("back-to-top");
    if (backToTop){
      backToTop.classList.toggle("is-visible", window.scrollY > 400);
    }
  };
  window.addEventListener("scroll", onScroll);
  onScroll();

  const hamburger = document.getElementById("hamburger");
  const mobileNav = document.getElementById("mobile-nav");
  if (hamburger && mobileNav){
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("is-active");
      mobileNav.classList.toggle("is-open");
    });
    mobileNav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        hamburger.classList.remove("is-active");
        mobileNav.classList.remove("is-open");
      });
    });
  }
}

function initBackToTop(){
  const btn = document.getElementById("back-to-top");
  if (!btn) return;
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ---------------------------------------------------------
   8. GLOBAL DELEGATED EVENTS (cards, cart, modal)
   --------------------------------------------------------- */
function initGlobalEvents(){
  document.addEventListener("click", (e) => {
    const viewBtn = e.target.closest(".btn-view-details");
    if (viewBtn){
      openProductModal(viewBtn.dataset.id);
      return;
    }
    const addBtn = e.target.closest(".btn-add-cart");
    if (addBtn){
      addToCart(addBtn.dataset.id);
      return;
    }
    const qtyDec = e.target.closest(".qty-decrease");
    if (qtyDec){ updateCartQty(qtyDec.dataset.id, -1); return; }
    const qtyInc = e.target.closest(".qty-increase");
    if (qtyInc){ updateCartQty(qtyInc.dataset.id, 1); return; }
    const removeBtn = e.target.closest(".remove-item");
    if (removeBtn){ removeFromCart(removeBtn.dataset.id); return; }

    if (e.target.closest(".cart-btn")){
      e.preventDefault();
      openCartDrawer();
      return;
    }
    if (e.target.id === "cart-overlay"){
      closeCartDrawer();
      return;
    }
    if (e.target.closest("#cart-close-btn")){
      closeCartDrawer();
      return;
    }
    if (e.target.closest("#checkout-btn")){
      openCheckoutModal();
      return;
    }
    if (e.target.id === "product-modal"){
      closeProductModal();
      return;
    }
    if (e.target.id === "checkout-modal"){
      closeCheckoutModal();
      return;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape"){
      closeProductModal();
      closeCheckoutModal();
      closeCartDrawer();
    }
  });
}

/* ---------------------------------------------------------
   9. REVEAL-ON-SCROLL ANIMATION
   --------------------------------------------------------- */
function revealOnScroll(){
  const items = document.querySelectorAll(".reveal:not(.is-visible)");
  if (!("IntersectionObserver" in window)){
    items.forEach(el => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach(el => observer.observe(el));
}

/* ---------------------------------------------------------
   10. INIT
   --------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initBackToTop();
  initGlobalEvents();
  initFeaturedPreview();
  initCatalogPage();
  populateSoftwareSelect();
  initContactForm();
  updateCartCount();
  renderCartDrawer();
  revealOnScroll();
});
