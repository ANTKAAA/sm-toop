// script.js — نسخة مُحسّنة للعمل مع Supabase + تحسينات عامة
// 1) يجب تحميل مكتبة supabase قبل هذا السكربت (see index.html head snippet)

const SUPABASE_URL = window.SUPABASE_URL || '';
const SUPABASE_KEY = window.SUPABASE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('لم يتم العثور على بيانات Supabase في window.SUPABASE_URL / window.SUPABASE_KEY. سيتم استخدام localStorage فقط.');
}

const supabaseClient = (window.supabase && SUPABASE_URL && SUPABASE_KEY)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

// Global state
let currentPropertyType = '';
let currentBuyerPropertyType = '';
let sellerRegistrations = [];
let buyerRegistrations = [];
let featuredProperties = [];
let contractingServices = []; // سيتم تهيئته لاحقاً
let adminUsers = [];
let currentAdmin = null;
let adminClickCounter = 0;

// Basic demo contractingServices & admin (يمكن تعديلها أو تحميلها من DB)
contractingServices = [
    { id: 1, title: 'تصميم الشقق السكنية', description: 'خدمات تصميم داخلي وخارجي.', price: 'للاستعلام', icon: '🏠', active: true },
    { id: 2, title: 'مقاولات تشطيب كاملة', description: 'تشطيب شامل من A to Z.', price: 'للاستعلام', icon: '🔨', active: true },
    { id: 3, title: 'تصميم المحلات التجارية', description: 'تصميم واجهات وتجهيز داخلي.', price: 'للاستعلام', icon: '🏪', active: true }
];

adminUsers = [
    { id: 1, username: 'admin', password: '123456', fullName: 'المدير الرئيسي', isMainAdmin: true }
];

// ---------------------- DOM Helpers ----------------------
function el(id) { return document.getElementById(id); }
function qAll(sel) { return Array.from(document.querySelectorAll(sel)); }

// ---------------------- Show / Hide Sections ----------------------
function showSection(section) {
    // إخفاء كل الأقسام
    qAll('.form-section').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });

    // home-section يُعرض ببلوك
    if (section === 'home') {
        const home = el('home-section');
        if (home) { home.style.display = 'block'; home.classList.add('active'); }
        updateHomeServices();
        updateFeaturedProperties();
        updateServicesList();
        updateListings();
        window.scrollTo(0,0);
        return;
    }

    const target = el(section + '-section');
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
        window.scrollTo(0,0);
    } else {
        console.error('showSection: القسم غير موجود ->', section);
    }
}

// ---------------------- Select Property Type (seller / buyer) ----------------------
function getPropertyTypeArabic(type) {
    const types = { apartment: 'شقة', house: 'بيت', land: 'أرض', villa: 'فيلا', shop: 'محل', office: 'مكتب', 'building-land': 'أرض مباني' };
    return types[type] || type;
}

function selectPropertyType(type) {
    currentPropertyType = type;
    // تحديث أزرار الـ seller
    qAll('.property-type-btn').forEach(btn => {
        const txt = btn.textContent || '';
        if (txt.includes(getPropertyTypeArabic(type))) {
            btn.classList.add('border-green-500','bg-green-100');
            btn.classList.remove('border-gray-300');
        } else {
            btn.classList.remove('border-green-500','bg-green-100');
            btn.classList.add('border-gray-300');
        }
    });
}

function selectBuyerPropertyType(type) {
    currentBuyerPropertyType = type;
    qAll('.buyer-property-type-btn').forEach(btn => {
        const txt = btn.textContent || '';
        if (txt.includes(getPropertyTypeArabic(type))) {
            btn.classList.add('border-blue-500','bg-blue-100');
            btn.classList.remove('border-gray-300');
        } else {
            btn.classList.remove('border-blue-500','bg-blue-100');
            btn.classList.add('border-gray-300');
        }
    });
}

// ---------------------- Preview images (seller form) ----------------------
function previewImages(event) {
    const container = el('image-preview-container');
    if (!container) return;
    container.innerHTML = '';
    const files = event.target.files || [];
    for (let i=0; i<Math.min(files.length,4); i++){
        const file = files[i];
        const reader = new FileReader();
        reader.onload = function(e){
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'image-preview';
            container.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
}

// ---------------------- Validation & Helpers ----------------------
function validateWhatsApp(phoneNumber) {
    if (!phoneNumber) return false;
    const cleaned = phoneNumber.replace(/\s+/g,'');
    const egyptianPhoneRegex = /^(010|011|012|015)\d{8}$/;
    return egyptianPhoneRegex.test(cleaned);
}

function showCustomAlert(title, message) {
    const existing = document.querySelector('.custom-alert-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50';
    overlay.innerHTML = `
      <div class="bg-white rounded-2xl p-6 max-w-md mx-4 text-center shadow-lg">
        <h3 class="text-lg font-bold mb-2">${title}</h3>
        <p class="text-sm text-gray-700 mb-4">${message}</p>
        <button id="custom-alert-ok" class="px-5 py-2 rounded bg-blue-600 text-white">موافق</button>
      </div>
    `;
    document.body.appendChild(overlay);
    el('custom-alert-ok').addEventListener('click', () => overlay.remove());
}

// ---------------------- Supabase load/save ----------------------
async function loadDataFromSupabase() {
    if (!supabaseClient) {
        console.warn('Supabase غير مُهيأ — سيتم تحميل البيانات من localStorage إن وُجدت.');
        loadFromLocalStorage();
        return;
    }

    try {
        const { data: sellers, error: sellersError } = await supabaseClient.from('seller_registrations').select('*');
        if (sellersError) console.warn('Supabase sellers error:', sellersError);
        else sellerRegistrations = sellers || [];

        const { data: buyers, error: buyersError } = await supabaseClient.from('buyer_registrations').select('*');
        if (buyersError) console.warn('Supabase buyers error:', buyersError);
        else buyerRegistrations = buyers || [];

        const { data: featured, error: featuredError } = await supabaseClient.from('featured_properties').select('*');
        if (!featuredError) featuredProperties = featured || [];
        else console.warn('featured load error', featuredError);

        console.log('Data loaded from Supabase.');
    } catch (err) {
        console.error('Error loading from Supabase:', err);
        loadFromLocalStorage();
    }
}

async function saveSellerRegistration(formData) {
    // حفظ محلي أولاً
    sellerRegistrations.push(formData);
    saveToLocalStorage('sellerRegistrations', sellerRegistrations);
    updateListings();
    updateAdminPanel();

    if (!supabaseClient) {
        showCustomAlert('تم الحفظ محلياً', 'لا يوجد اتصال بـ Supabase. تم الحفظ في المتصفح.');
        return;
    }

    try {
        const { data, error } = await supabaseClient.from('seller_registrations').insert([formData]).select();
        if (error) {
            console.error('Supabase insert seller error:', error);
            showCustomAlert('خطأ', 'تعذر حفظ البيانات في Supabase، تم حفظها محلياً.');
            return;
        }
        showCustomAlert('نجح', 'تم تسجيل العقار في النظام.');
    } catch (err) {
        console.error('Error saving seller to Supabase:', err);
        showCustomAlert('خطأ', 'حدث خطأ أثناء الحفظ.');
    }
}

async function saveBuyerRegistration(formData) {
    buyerRegistrations.push(formData);
    saveToLocalStorage('buyerRegistrations', buyerRegistrations);
    updateListings();
    updateAdminPanel();

    if (!supabaseClient) {
        showCustomAlert('تم الحفظ محلياً', 'لا يوجد اتصال بـ Supabase. تم الحفظ في المتصفح.');
        return;
    }

    try {
        const { data, error } = await supabaseClient.from('buyer_registrations').insert([formData]).select();
        if (error) {
            console.error('Supabase insert buyer error:', error);
            showCustomAlert('خطأ', 'تعذر حفظ الطلب في Supabase، تم حفظه محلياً.');
            return;
        }
        showCustomAlert('نجح', 'تم تسجيل طلب المشتري.');
    } catch (err) {
        console.error('Error saving buyer to Supabase:', err);
        showCustomAlert('خطأ', 'حدث خطأ أثناء الحفظ.');
    }
}

// ---------------------- localStorage fallback ----------------------
function loadFromLocalStorage() {
    sellerRegistrations = JSON.parse(localStorage.getItem('sellerRegistrations')) || [];
    buyerRegistrations = JSON.parse(localStorage.getItem('buyerRegistrations')) || [];
    featuredProperties = JSON.parse(localStorage.getItem('featuredProperties')) || [];
}

function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) { console.warn('localStorage error:', e); }
}

// ---------------------- Forms submit handlers ----------------------
async function submitSellerForm(e) {
    e.preventDefault();

    const whatsapp = el('seller-whatsapp') ? el('seller-whatsapp').value.trim() : '';
    if (!validateWhatsApp(whatsapp)) {
        showCustomAlert('خطأ', 'رقم واتساب غير صحيح. يجب أن يبدأ بـ 010/011/012/015 ويتكون من 11 رقم.');
        return;
    }
    if (!currentPropertyType) {
        showCustomAlert('خطأ', 'اختر نوع العقار أولاً.');
        return;
    }

    const formData = {
        id: Date.now(),
        type: 'seller',
        propertyType: currentPropertyType,
        location: el('seller-location') ? el('seller-location').value : '',
        mapLocation: el('map-location') ? el('map-location').value : '',
        area: el('property-area') ? el('property-area').value : '',
        pricePerMeter: el('property-price-per-meter') ? el('property-price-per-meter').value : '',
        totalPrice: el('property-total-price') ? el('property-total-price').value : '',
        rooms: el('property-rooms') ? el('property-rooms').value : '',
        description: el('property-description') ? el('property-description').value : '',
        name: el('seller-name') ? el('seller-name').value : '',
        whatsapp: whatsapp,
        timestamp: new Date().toISOString()
    };

    await saveSellerRegistration(formData);
    // reset form
    const f = el('seller-form');
    if (f) f.reset();
    el('image-preview-container') && (el('image-preview-container').innerHTML = '');
    currentPropertyType = '';
    showSection('home');
}

async function submitBuyerForm(e) {
    e.preventDefault();

    const whatsapp = el('buyer-whatsapp') ? el('buyer-whatsapp').value.trim() : '';
    if (!validateWhatsApp(whatsapp)) {
        showCustomAlert('خطأ', 'رقم واتساب غير صحيح. يجب أن يبدأ بـ 010/011/012/015 ويتكون من 11 رقم.');
        return;
    }
    if (!currentBuyerPropertyType) {
        showCustomAlert('خطأ', 'اختر نوع العقار المطلوب.');
        return;
    }

    const formData = {
        id: Date.now(),
        type: 'buyer',
        propertyType: currentBuyerPropertyType,
        location: el('buyer-location') ? el('buyer-location').value : '',
        minPrice: el('buyer-min-price') ? el('buyer-min-price').value : '',
        maxPrice: el('buyer-max-price') ? el('buyer-max-price').value : '',
        name: el('buyer-name') ? el('buyer-name').value : '',
        whatsapp: whatsapp,
        timestamp: new Date().toISOString()
    };

    await saveBuyerRegistration(formData);
    const f = el('buyer-form');
    if (f) f.reset();
    currentBuyerPropertyType = '';
    showSection('home');
}

// ---------------------- Listings / Admin UI update ----------------------
function updateListings() {
    const saleListings = el('sale-listings');
    const wantedListings = el('wanted-listings');

    if (saleListings) {
        if (sellerRegistrations.length === 0) {
            saleListings.innerHTML = '<p class="text-center text-gray-500 py-4">لا توجد عقارات للبيع حالياً</p>';
        } else {
            saleListings.innerHTML = sellerRegistrations.map(seller => `
                <div class="border-2 border-green-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-bold text-lg text-gray-800">${getPropertyTypeArabic(seller.propertyType)} للبيع</h4>
                        <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">للبيع</span>
                    </div>
                    <p class="text-gray-600 mb-2">📍 ${seller.location || 'غير محدد'}</p>
                    <p class="text-gray-600 mb-2">📐 المساحة: ${seller.area || 'غير محدد'} متر مربع</p>
                    ${seller.rooms ? `<p class="text-gray-600 mb-2">🏠 ${seller.rooms} غرف</p>` : ''}
                    <div class="flex justify-between items-center mt-4">
                        <div>
                            <p class="text-sm text-gray-500">سعر المتر: ${seller.pricePerMeter ? Number(seller.pricePerMeter).toLocaleString() : '-'} جنيه</p>
                            <p class="text-xl font-bold text-green-600">${seller.totalPrice ? Number(seller.totalPrice).toLocaleString() : '-'} جنيه</p>
                        </div>
                        <button onclick="directWhatsApp('${seller.whatsapp || ''}')" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                            📱 تواصل مباشر
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    if (wantedListings) {
        if (buyerRegistrations.length === 0) {
            wantedListings.innerHTML = '<p class="text-center text-gray-500 py-4">لا توجد طلبات شراء حالياً</p>';
        } else {
            wantedListings.innerHTML = buyerRegistrations.map(buyer => `
                <div class="border-2 border-blue-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-bold text-lg text-gray-800">مطلوب ${getPropertyTypeArabic(buyer.propertyType)}</h4>
                        <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">مطلوب</span>
                    </div>
                    <p class="text-gray-600 mb-2">📍 ${buyer.location || 'غير محدد'}</p>
                    ${buyer.minPrice || buyer.maxPrice ? `<p class="text-gray-600 mb-2">💰 الميزانية: ${buyer.minPrice || 'أي'} - ${buyer.maxPrice || 'أي'} جنيه</p>` : ''}
                    <div class="flex justify-between items-center mt-4">
                        <button onclick="directWhatsApp('${buyer.whatsapp || ''}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            📱 تواصل مباشر
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }
}

function updateAdminPanel() {
    // Sellers / Buyers containers
    const sellersContainer = el('admin-sellers');
    const buyersContainer = el('admin-buyers');
    if (sellersContainer) {
        sellersContainer.innerHTML = sellerRegistrations.map(seller => `
            <div class="bg-white p-4 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-3">
                    <h4 class="font-bold text-green-700">${getPropertyTypeArabic(seller.propertyType)} للبيع</h4>
                    <span class="text-xs text-gray-500">${new Date(seller.timestamp).toLocaleString()}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <p class="text-gray-600">📍 ${seller.location || 'غير محدد'}</p>
                    <p class="text-gray-600">👤 ${seller.name || '---'}</p>
                    <p class="text-gray-600">📱 ${seller.whatsapp || '---'}</p>
                    <p class="text-gray-600">📐 ${seller.area || '---'} م²</p>
                </div>
                <div class="mb-3 p-2 bg-green-50 rounded">
                    <p class="text-sm text-gray-600">سعر المتر: ${seller.pricePerMeter ? Number(seller.pricePerMeter).toLocaleString() : '-' } جنيه</p>
                    <p class="text-lg font-bold text-green-600">💰 ${seller.totalPrice ? Number(seller.totalPrice).toLocaleString() : '-'} جنيه</p>
                </div>
                <div class="flex gap-2 flex-wrap">
                    <button onclick="directWhatsApp('${seller.whatsapp || ''}')" class="text-xs bg-green-500 text-white px-3 py-1 rounded">📱 واتساب</button>
                    <button onclick="addToFeatured(${seller.id})" class="text-xs bg-yellow-500 text-white px-3 py-1 rounded">⭐ تمييز</button>
                    <button onclick="deleteRegistration('seller', ${seller.id})" class="text-xs bg-red-500 text-white px-3 py-1 rounded">🗑️ حذف</button>
                </div>
            </div>
        `).join('');
    }
    if (buyersContainer) {
        buyersContainer.innerHTML = buyerRegistrations.map(buyer => `
            <div class="bg-white p-4 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-blue-700">مطلوب ${getPropertyTypeArabic(buyer.propertyType)}</h4>
                    <span class="text-xs text-gray-500">${new Date(buyer.timestamp).toLocaleString()}</span>
                </div>
                <p class="text-sm text-gray-600 mb-1">📍 ${buyer.location || 'غير محدد'}</p>
                <p class="text-sm text-gray-600 mb-1">👤 ${buyer.name || '---'}</p>
                <p class="text-sm text-gray-600 mb-1">📱 ${buyer.whatsapp || '---'}</p>
                <div class="mt-3 flex gap-2 flex-wrap">
                    <button onclick="directWhatsApp('${buyer.whatsapp || ''}')" class="text-xs bg-blue-500 text-white px-3 py-1 rounded">📱 واتساب</button>
                    <button onclick="deleteRegistration('buyer', ${buyer.id})" class="text-xs bg-red-500 text-white px-3 py-1 rounded">🗑️ حذف</button>
                </div>
            </div>
        `).join('');
    }

    // Stats
    el('sellers-count') && (el('sellers-count').textContent = sellerRegistrations.length);
    el('buyers-count') && (el('buyers-count').textContent = buyerRegistrations.length);
    el('total-properties') && (el('total-properties').textContent = sellerRegistrations.length);
    el('total-requests') && (el('total-requests').textContent = buyerRegistrations.length);
    el('total-clients') && (el('total-clients').textContent = sellerRegistrations.length + buyerRegistrations.length);
    el('total-featured') && (el('total-featured').textContent = featuredProperties.length || 0);
}

// ---------------------- Admin actions ----------------------
function adminClickCount() {
    adminClickCounter++;
    if (adminClickCounter >= 12) {
        adminClickCounter = 0;
        showSection('admin-login');
    }
}

function adminLogin(e) {
    e.preventDefault();
    const username = el('admin-username') ? el('admin-username').value : '';
    const password = el('admin-password') ? el('admin-password').value : '';

    const admin = adminUsers.find(a => a.username === username && a.password === password);
    if (admin) {
        currentAdmin = admin;
        el('admin-welcome') && (el('admin-welcome').textContent = `مرحباً، ${admin.fullName}`);
        showSection('admin-dashboard');
        showAdminTab('registrations');
        updateAdminPanel();
        el('admin-login-form') && el('admin-login-form').reset();
    } else {
        showCustomAlert('فشل الدخول', 'اسم المستخدم أو كلمة المرور غير صحيحة');
    }
}

function adminLogout() {
    currentAdmin = null;
    showSectio
