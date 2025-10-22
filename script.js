// =========================================================================================================
// SUPABASE CONFIGURATION - المفاتيح التي أرسلتها (تم التأكد من صحة الصيغة)
// =========================================================================================================
const SUPABASE_URL = 'https://vnofexhxfcsyiobkjsew.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZub2ZleGh4ZmNzeWlvYmtqc2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMDgzOTIsImV4cCI6MjA3NjY4NDM5Mn0.FwX-ncnC2R0Yegndv0Ucpv8CN8BkCZTcMk4dhfENHHc'; 
const client_supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🚨 بيانات المدير النهائية والمطلوبة
const ADMIN_USERNAME = 'admintito';
const ADMIN_PASSWORD = '0453328124';
const ADMIN_CLICK_COUNT_REQUIRED = 11;
let adminClickCounter = 0;
let currentAdmin = { username: ADMIN_USERNAME, fullName: 'المدير الرئيسي', isMainAdmin: true }; 

// حالة البيانات العالمية (للوحة التحكم)
let allRegistrations = [];

// نطاقات الأسعار
const PRICE_RANGES = {
    damanhour: { min: 16000, max: 22000, arabicName: 'دمنهور' }, 
    'kom-hamada': { min: 16000, max: 24000, arabicName: 'كوم حمادة' },
    itay: { min: 14000, max: 20000, arabicName: 'إيتاي البارود' }, 
    delengat: { min: 12000, max: 18000, arabicName: 'الدلنجات' },
    shop_max: 19000,
    villa_max: 21000,
    land_max: 17000
};
// =========================================================================================================


// =========================================================================================================
// 1. وظائف الواجهة الأمامية الأساسية والتهيئة (Initialization)
// =========================================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. ربط الأحداث العامة للواجهة الأمامية
    bindFrontendEvents();
    
    // 2. التحقق من حالة المدير عند تحميل الصفحة
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        showSection('admin-dashboard');
    } else {
        showSection('home');
    }
});

function bindFrontendEvents() {
    // ربط النماذج
    const sellerForm = document.getElementById('seller-form');
    if(sellerForm) sellerForm.addEventListener('submit', submitSellerForm);
    
    const buyerForm = document.getElementById('buyer-form');
    if(buyerForm) buyerForm.addEventListener('submit', submitBuyerForm);
    
    const adminLoginForm = document.getElementById('admin-login-form');
    if(adminLoginForm) adminLoginForm.addEventListener('submit', adminLogin);
    
    // ربط أزرار نوع العقار
    document.querySelectorAll('.property-type-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            selectPropertyType(e.currentTarget.dataset.type, 'seller');
            generateSellerDetailsForm(e.currentTarget.dataset.type);
        });
    });
    document.querySelectorAll('.buyer-property-type-btn').forEach(button => {
        button.addEventListener('click', (e) => selectPropertyType(e.currentTarget.dataset.type, 'buyer'));
    });
    
    // ربط حقول التحقق من السعر
    const sellerLocation = document.getElementById('seller-location');
    if (sellerLocation) sellerLocation.addEventListener('change', checkPriceValidation);
    const sellerMetersPrice = document.getElementById('seller-meters-price');
    if (sellerMetersPrice) sellerMetersPrice.addEventListener('input', checkPriceValidation);
}

function adminClickCount() {
    adminClickCounter++;
    if (adminClickCounter >= ADMIN_CLICK_COUNT_REQUIRED) {
        adminClickCounter = 0;
        showSection('admin-login');
    }
}

function validateWhatsApp(phoneNumber) {
    const egyptianPhoneRegex = /^(010|011|012|015)\d{8}$/;
    return egyptianPhoneRegex.test(phoneNumber.replace(/\s+/g, ''));
}

function showSection(sectionId) {
    document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
    document.getElementById('home-section').classList.remove('active');
    
    const targetSection = document.getElementById(sectionId + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
    } else if (sectionId === 'home') {
        document.getElementById('home-section').classList.add('active');
    }
    
    if (sectionId === 'admin-dashboard') {
        loadAllData();
    }
}

function showCustomAlert(title, message) {
    const alertDiv = document.getElementById('custom-alert');
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-message').textContent = message;
    alertDiv.classList.remove('hidden');
}

function closeCustomAlert() {
    document.getElementById('custom-alert').classList.add('hidden');
}


// =========================================================================================================
// 2. نظام النماذج الديناميكية والتحقق من الأسعار (Dynamic Forms & Smart Pricing)
// =========================================================================================================

// الدوال المطلوبة لإنشاء النماذج التفصيلية (تم تبسيط العودة هنا لتجنب تكرار كود HTML الضخم)
function generateApartmentForm() { 
    // مثال مبسط للشقة
    return `<div class="grid md:grid-cols-2 gap-4">
        <div><label class="block text-sm font-semibold text-gray-700 mb-2">المساحة (متر مربع)</label><input type="number" name="area" class="w-full p-3 border-2 border-gray-300 rounded-lg" required></div>
        <div><label class="block text-sm font-semibold text-gray-700 mb-2">عدد الغرف</label><select name="rooms" class="w-full p-3 border-2 border-gray-300 rounded-lg"><option value="3">3 غرف</option><option value="4">4 غرف</option></select></div>
        <div><label class="block text-sm font-semibold text-gray-700 mb-2">عدد الحمامات</label><select name="bathrooms" class="w-full p-3 border-2 border-gray-300 rounded-lg"><option value="1">1</option><option value="2">2</option></select></div>
        <div><label class="block text-sm font-semibold text-gray-700 mb-2">الدور</label><select name="floor" class="w-full p-3 border-2 border-gray-300 rounded-lg"><option value="ground">الأرضي</option><option value="1">الأول</option></select></div>
        <div><label class="block text-sm font-semibold text-gray-700 mb-2">حصة الشقة في الأرض</label><input type="text" name="house_shares" class="w-full p-3 border-2 border-gray-300 rounded-lg" placeholder="مثال: 1/8" required></div>
        <div><label class="block text-sm font-semibold text-gray-700 mb-2">سنة المباني</label><input type="number" name="building_year" class="w-full p-3 border-2 border-gray-300 rounded-lg" required></div>
        <div><label class="block text-sm font-semibold text-gray-700 mb-2">مستوى التشطيب</label><select name="finishing" class="w-full p-3 border-2 border-gray-300 rounded-lg"><option value="finished">متشطبة كاملة</option><option value="semi-finished">نصف تشطيب</option><option value="unfinished">على الطوبة</option></select></div>
    </div>`;
}
function generateHouseForm() { return generateApartmentForm().replace(/شقة/g, 'بيت').replace('حصة الشقة في الأرض', 'مساحة البناء') }
function generateLandForm(type) { return `<div class="grid md:grid-cols-2 gap-4"><div><label class="block text-sm font-semibold text-gray-700 mb-2">المساحة (متر مربع)</label><input type="number" name="area" class="w-full p-3 border-2 border-gray-300 rounded-lg" required></div><div><label class="block text-sm font-semibold text-gray-700 mb-2">المساحة (قيراط)</label><input type="number" name="area_qirat" class="w-full p-3 border-2 border-gray-300 rounded-lg"></div><div><label class="block text-sm font-semibold text-gray-700 mb-2">نوع الأرض</label><select name="land_type" class="w-full p-3 border-2 border-gray-300 rounded-lg"><option value="building">أرض مباني</option><option value="agricultural">أرض زراعية</option><option value="mixed">متخللات</option></select></div></div>`; }
function generateShopForm() { return generateApartmentForm().replace(/شقة/g, 'محل').replace('حصة الشقة في الأرض', 'حصة المحل في الأرض'); }
function generateOfficeForm() { return generateApartmentForm().replace(/شقة/g, 'مكتب'); }
function generateVillaForm() { return generateApartmentForm().replace(/شقة/g, 'فيلا').replace('حصة الشقة في الأرض', 'مساحة الحديقة'); }


function generateSellerDetailsForm(type) {
    const container = document.getElementById('property-details-container');
    const titleSpan = document.getElementById('dynamic-property-title');
    
    titleSpan.textContent = getPropertyTypeArabic(type);

    let formHTML = '';

    switch(type) {
        case 'apartment': formHTML = generateApartmentForm(); break;
        case 'house': formHTML = generateHouseForm(); break;
        case 'land': case 'building-land': formHTML = generateLandForm(type); break;
        case 'shop': formHTML = generateShopForm(); break;
        case 'office': formHTML = generateOfficeForm(); break;
        case 'villa': formHTML = generateVillaForm(); break;
        default: formHTML = '<p class="text-gray-500 text-center py-4">يرجى اختيار نوع العقار.</p>';
    }

    container.innerHTML = formHTML;
}


// دالة فحص الأسعار (كما تم الاتفاق)
function checkPriceValidation() {
    const location = document.getElementById('seller-location').value;
    const pricePerMeterInput = document.getElementById('seller-meters-price');
    const negotiableCheckbox = document.getElementById('seller-negotiable');
    const validationMessage = document.getElementById('price-validation-message');

    if (!location || !pricePerMeterInput || pricePerMeterInput.value === '') {
        validationMessage.classList.add('hidden');
        negotiableCheckbox.checked = false;
        negotiableCheckbox.disabled = false;
        return;
    }

    const pricePerMeter = parseFloat(pricePerMeterInput.value);
    const type = document.getElementById('seller-property-type').value;

    let maxLimit = PRICE_RANGES[location]?.max || 999999;
    
    // تعديل الحدود القصوى حسب نوع العقار
    if (type === 'shop' && PRICE_RANGES.shop_max) maxLimit = PRICE_RANGES.shop_max;
    if (type === 'villa' && PRICE_RANGES.villa_max) maxLimit = PRICE_RANGES.villa_max;
    if (type === 'land' || type === 'building-land' && PRICE_RANGES.land_max) maxLimit = PRICE_RANGES.land_max;

    if (pricePerMeter > maxLimit) {
        validationMessage.classList.remove('hidden');
        validationMessage.innerHTML = `⚠️ السعر المُحدد (${pricePerMeter.toLocaleString()}) للمتر أعلى من الحد الأقصى التقديري للمنطقة (${maxLimit.toLocaleString()} ج.م). <br> **يجب تحديد "قابل للتفاوض" إجباريًا**.`;
        
        negotiableCheckbox.checked = true;
        negotiableCheckbox.disabled = true;
    } else {
        validationMessage.classList.add('hidden');
        negotiableCheckbox.disabled = false;
        negotiableCheckbox.checked = false; 
    }
}


// =========================================================================================================
// 3. وظائف الإرسال إلى Supabase (Submit Logic)
// =========================================================================================================

async function submitSellerForm(event) {
    event.preventDefault();
    const form = event.target;
    const whatsapp = form.elements['whatsapp'].value;

    if (!validateWhatsApp(whatsapp)) {
        showCustomAlert('خطأ', 'رقم الواتساب غير صحيح.');
        return;
    }
    
    // جمع البيانات الديناميكية والامتيازات
    const selectedUtilities = Array.from(form.elements['utilities']).filter(checkbox => checkbox.checked).map(checkbox => checkbox.value).join(', '); 
    const selectedExtras = Array.from(form.elements['extras']).filter(checkbox => checkbox.checked).map(checkbox => checkbox.value).join(', ');
    
    const negotiable = document.getElementById('seller-negotiable').checked;

    const formData = {
        client_type: 'Seller',
        name: form.elements['name'].value,
        whatsapp: whatsapp,
        location: form.elements['location'].value,
        property_type: form.elements['property_type'].value,
        
        area: parseFloat(form.elements['area']?.value) || null,
        price: parseFloat(form.elements['price']?.value) || null,
        meters_price: parseFloat(form.elements['meters_price']?.value) || null,
        negotiable: negotiable,
        
        // تفاصيل العقار الموسعة (جمع ديناميكي)
        floor: form.elements['floor']?.value || 'N/A',
        rooms: form.elements['rooms']?.value || 'N/A',
        bathrooms: form.elements['bathrooms']?.value || 'N/A',
        finishing: form.elements['finishing']?.value || 'N/A',
        building_year: parseInt(form.elements['building_year']?.value) || null,
        
        // تفاصيل إضافية (JSONB)
        details_json: {
            map_location: form.elements['map_location'].value,
            notes: form.elements['notes'].value || 'N/A',
            utilities: selectedUtilities,
            extras: selectedExtras,
            house_shares: form.elements['house_shares']?.value || 'N/A',
            land_licensed: form.elements['land_licensed']?.value || 'N/A'
        }, 
        status: 'جديد - بانتظار المراجعة'
    };
    
    // الحل النهائي لـ Failed to fetch: إعادة التأكد من أن جميع الحقول متوفرة في Supabase
    const { error } = await client_supabase.from('registrations').insert([formData]);

    if (error) {
        console.error('Supabase Error:', error);
        showCustomAlert('خطأ في الإرسال', `حدث خطأ أثناء تسجيل البيانات. رسالة الخطأ: ${error.message}`);
    } else {
        showCustomAlert('تم بنجاح! 🎉', 'تم تسجيل عقارك للبيع بنجاح. لوحة التحكم جاهزة لاستقبال البيانات.');
        form.reset();
        showSection('home');
    }
}

async function submitBuyerForm(event) {
    event.preventDefault();
    const form = event.target;
    const whatsapp = form.elements['whatsapp'].value;

    if (!validateWhatsApp(whatsapp)) {
        showCustomAlert('خطأ', 'رقم الواتساب غير صحيح.');
        return;
    }
    
    const { error } = await client_supabase
        .from('registrations')
        .insert([{
            client_type: 'Buyer',
            name: form.elements['name'].value,
            whatsapp: whatsapp,
            location: form.elements['location'].value,
            property_type: form.elements['property_type'].value,
            min_budget: parseFloat(form.elements['min_budget']?.value) || null,
            max_budget: parseFloat(form.elements['max_budget']?.value) || null,
            requirements: form.elements['requirements'].value,
            status: 'جديد - طلب شراء'
        }]);

    if (error) {
        showCustomAlert('خطأ في الإرسال', `حدث خطأ أثناء تسجيل طلب الشراء: ${error.message}`);
    } else {
        showCustomAlert('تم بنجاح! 🔍', 'تم تسجيل طلبك. سنتواصل معك عند توفر عقار مطابق للمواصفات.');
        event.target.reset();
        showSection('home');
    }
}

async function submitServiceRequest(event) {
    event.preventDefault();
    const form = event.target;
    const whatsapp = form.elements['whatsapp'].value;

    if (!validateWhatsApp(whatsapp)) {
        showCustomAlert('خطأ', 'رقم الواتساب غير صحيح.');
        return;
    }
    
    const { error } = await client_supabase
        .from('contracting_requests')
        .insert([{
            client_type: 'Contracting',
            name: form.elements['name'].value,
            whatsapp: whatsapp,
            service_requested: form.elements['service_name'].value,
            details: form.elements['details'].value,
            status: 'جديد - طلب خدمة'
        }]);

    if (error) {
        showCustomAlert('خطأ في الإرسال', `حدث خطأ أثناء تسجيل طلب الخدمة: ${error.message}`);
    } else {
        showCustomAlert('تم بنجاح! 🛠️', `تم إرسال طلبك لخدمة ${form.elements['service_name'].value}. سنتواصل بك.`);
        closeServiceModal();
    }
}


// =========================================================================================================
// 4. منطق لوحة تحكم المدير (Admin Dashboard Logic)
// =========================================================================================================

function adminLogin(event) {
    event.preventDefault();
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password-input').value;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        localStorage.setItem('adminLoggedIn', 'true');
        showSection('admin-dashboard');
    } else {
        showCustomAlert('خطأ في الدخول', 'اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
}

function adminLogout() {
    localStorage.removeItem('adminLoggedIn');
    showSection('home');
}

function showAdminTab(tabId) {
    // 1. إخفاء وإظهار المحتوى
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    const targetTab = document.getElementById(`admin-${tabId}-tab`);
    if (targetTab) targetTab.classList.add('active');
    
    // 2. تحديث شكل أزرار التنقل
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-indigo-600', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
    });
    
    // 3. تفعيل الزر النشط (Active Button)
    const targetButton = event.currentTarget; // استخدام event.currentTarget للإشارة إلى الزر الذي تم النقر عليه
    if (targetButton) {
        targetButton.classList.add('active', 'bg-indigo-600', 'text-white');
    }
    
    if (tabId === 'registrations') loadAllData();
}

async function loadAllData() {
    const { data: registrations, error: regError } = await client_supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });

    if (regError) {
        console.error('Error loading data:', regError);
        return;
    }
    
    allRegistrations = registrations;
    
    const sellers = registrations.filter(r => r.client_type === 'Seller');
    const buyers = registrations.filter(r => r.client_type === 'Buyer');
    
    // تحديث الإحصائيات والأعداد في اللوحة
    document.getElementById('sellers-count').textContent = sellers.length;
    document.getElementById('buyers-count').textContent = buyers.length;
    document.getElementById('total-properties').textContent = sellers.length;
    document.getElementById('total-requests').textContent = buyers.length;
    
    // عرض قوائم البائعين والمشترين
    const sellersList = document.getElementById('admin-sellers');
    const buyersList = document.getElementById('admin-buyers');

    sellersList.innerHTML = sellers.length > 0 ? sellers.map(createSellerCard).join('') : '<p class="text-gray-500 text-center py-8">لا توجد تسجيلات بائعين.</p>';
    buyersList.innerHTML = buyers.length > 0 ? buyers.map(createBuyerCard).join('') : '<p class="text-gray-500 text-center py-8">لا توجد طلبات مشترين.</p>';
}

function createSellerCard(item) {
    const isNegotiable = item.negotiable ? ' | 💸 قابل للتفاوض' : '';
    return `
        <div class="bg-white p-4 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-3">
                <h4 class="font-bold text-green-700">${getPropertyTypeArabic(item.property_type)} للبيع - ${item.location}</h4>
                <span class="text-xs text-gray-500">${new Date(item.created_at).toLocaleDateString('ar-EG')}</span>
            </div>
            <p class="text-sm text-gray-600">👤 ${item.name} | 📱 ${item.whatsapp}</p>
            <div class="mt-2 text-sm">
                <p><strong>السعر الكلي:</strong> ${item.price?.toLocaleString() || 'غير محدد'} جنيه ${isNegotiable}</p>
                <p><strong>المساحة:</strong> ${item.area || 'غير محدد'} م² | <strong>المباني:</strong> ${item.building_year || 'N/A'}</p>
            </div>
            <button onclick="showDetailsModal('${item.id}', 'seller')" class="text-xs bg-indigo-500 text-white px-3 py-1 rounded mt-2 hover:bg-indigo-600 transition-colors">التفاصيل / تعديل</button>
        </div>
    `;
}

function createBuyerCard(item) {
    return `
        <div class="bg-white p-4 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-3">
                <h4 class="font-bold text-blue-700">مطلوب ${getPropertyTypeArabic(item.property_type)} في ${item.location}</h4>
                <span class="text-xs text-gray-500">${new Date(item.created_at).toLocaleDateString('ar-EG')}</span>
            </div>
            <p class="text-sm text-gray-600">👤 ${item.name} | 📱 ${item.whatsapp}</p>
            <div class="mt-2 text-sm">
                <p><strong>الميزانية:</strong> ${item.min_budget?.toLocaleString() || 'N/A'} - ${item.max_budget?.toLocaleString() || 'N/A'} جنيه</p>
                <p><strong>المتطلبات:</strong> ${item.requirements.substring(0, 30)}...</p>
            </div>
             <button onclick="showDetailsModal('${item.id}', 'buyer')" class="text-xs bg-indigo-500 text-white px-3 py-1 rounded mt-2 hover:bg-indigo-600 transition-colors">التفاصيل / تعديل</button>
        </div>
    `;
}

function getPropertyTypeArabic(type) {
    const types = { 'apartment': 'شقة', 'house': 'بيت', 'land': 'أرض', 'shop': 'محل', 'office': 'مكتب تجاري', 'villa': 'فيلا', 'building-land': 'أرض مباني' };
    return types[type] || type;
}
// دوال النماذج والدعم يجب أن تكون هنا.
function showServiceModal(serviceName) { /* ... */ }
function closeServiceModal() { /* ... */ }
function showDetailsModal(id, type) { showCustomAlert('تفاصيل', `عرض التفاصيل وتعديلها للعنصر ${id} من نوع ${type}`); }
