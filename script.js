// Supabase Configuration
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let currentPropertyType = '';
let currentBuyerPropertyType = '';
let sellerRegistrations = [];
let buyerRegistrations = [];
let currentAdmin = null;
let adminClickCounter = 0;
let inquiries = [];
let notifications = [];
let serviceRequests = [];
let contractingClients = [];
let contractingServices = [
    {
        id: 1,
        title: 'تصميم الشقق السكنية',
        description: 'خدمات تصميم داخلي وخارجي للشقق السكنية بأحدث الطرق والتقنيات',
        features: ['تصميم ثلاثي الأبعاد', 'اختيار الألوان والمواد', 'تخطيط المساحات', 'إشراف على التنفيذ'],
        price: 'للاستعلام عن الأسعار تواصل معنا',
        category: 'تصميم',
        icon: '🏠',
        active: true,
        createdAt: new Date().toLocaleString('ar-EG')
    },
    {
        id: 2,
        title: 'تصميم المحلات التجارية',
        description: 'تصميم وتجهيز المحلات التجارية لجذب العملاء وزيادة المبيعات',
        features: ['تصميم الواجهة', 'تخطيط المساحة الداخلية', 'الإضاءة والديكور', 'أنظمة العرض'],
        price: 'للاستعلام عن الأسعار تواصل معنا',
        category: 'تصميم',
        icon: '🏪',
        active: true,
        createdAt: new Date().toLocaleString('ar-EG')
    },
    {
        id: 3,
        title: 'مقاولات استلام على المفتاح',
        description: 'مقاولات كاملة من البداية حتى الاستلام النهائي جاهز للسكن',
        features: ['أعمال البناء الكاملة', 'التشطيبات الداخلية', 'السباكة والكهرباء', 'الدهانات والأرضيات'],
        price: 'للاستعلام عن الأسعار تواصل معنا',
        category: 'مقاولات',
        icon: '🔑',
        active: true,
        createdAt: new Date().toLocaleString('ar-EG')
    }
];
let adminUsers = [
    {
        id: 1,
        username: 'admintito',
        password: '0453328124',
        fullName: 'المدير الرئيسي',
        isMainAdmin: true,
        createdAt: new Date().toLocaleString('ar-EG')
    }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    await loadDataFromSupabase();
    showSection('home');
    updateLocationCounts();
    updateServicesList();
    updateHomeServices();
    updateContractingClients();
}

// Supabase Data Operations
async function loadDataFromSupabase() {
    try {
        // Load seller registrations
        const { data: sellers, error: sellersError } = await supabase
            .from('seller_registrations')
            .select('*');
        
        if (!sellersError) {
            sellerRegistrations = sellers || [];
        }

        // Load buyer registrations
        const { data: buyers, error: buyersError } = await supabase
            .from('buyer_registrations')
            .select('*');
        
        if (!buyersError) {
            buyerRegistrations = buyers || [];
        }

        // Load service requests
        const { data: services, error: servicesError } = await supabase
            .from('service_requests')
            .select('*');
        
        if (!servicesError) {
            serviceRequests = services || [];
        }

        // Load contracting clients
        const { data: clients, error: clientsError } = await supabase
            .from('contracting_clients')
            .select('*');
        
        if (!clientsError) {
            contractingClients = clients || [];
        }

        // Load inquiries
        const { data: inquiryData, error: inquiryError } = await supabase
            .from('inquiries')
            .select('*');
        
        if (!inquiryError) {
            inquiries = inquiryData || [];
        }

        console.log('Data loaded successfully from Supabase');
    } catch (error) {
        console.error('Error loading data from Supabase:', error);
        // Fallback to localStorage if Supabase fails
        loadFromLocalStorage();
    }
}

async function saveSellerRegistration(formData) {
    try {
        const { data, error } = await supabase
            .from('seller_registrations')
            .insert([formData])
            .select();

        if (error) throw error;

        // Save to local array
        sellerRegistrations.push(formData);
        
        // Add notification
        addNotification('عقار جديد مسجل', `تم تسجيل ${getPropertyTypeArabic(formData.propertyType)} جديد في ${getLocationArabic(formData.location)} بواسطة ${formData.name}`, 'success');
        
        // Update UI
        updateAdminPanel();
        updateListings();
        updateLocationCounts();
        
        showCustomAlert('تم بنجاح', 'تم تسجيل العقار بنجاح! سيتم التواصل معك قريباً.');
        
        // Reset form
        resetSellerForm();
        
    } catch (error) {
        console.error('Error saving seller registration:', error);
        // Fallback to localStorage
        saveToLocalStorage('sellerRegistrations', sellerRegistrations);
        showCustomAlert('تم الحفظ محلياً', 'تم حفظ البيانات محلياً بسبب مشكلة في الاتصال');
    }
}

async function saveBuyerRegistration(formData) {
    try {
        const { data, error } = await supabase
            .from('buyer_registrations')
            .insert([formData])
            .select();

        if (error) throw error;

        // Save to local array
        buyerRegistrations.push(formData);
        
        // Update UI
        updateAdminPanel();
        updateListings();
        
        showCustomAlert('تم بنجاح', 'تم تسجيل طلب البحث بنجاح! سيتم التواصل معك عند توفر عقار مناسب.');
        
        // Reset form
        resetBuyerForm();
        
    } catch (error) {
        console.error('Error saving buyer registration:', error);
        // Fallback to localStorage
        saveToLocalStorage('buyerRegistrations', buyerRegistrations);
        showCustomAlert('تم الحفظ محلياً', 'تم حفظ البيانات محلياً بسبب مشكلة في الاتصال');
    }
}

// Local Storage Fallback
function loadFromLocalStorage() {
    sellerRegistrations = JSON.parse(localStorage.getItem('sellerRegistrations')) || [];
    buyerRegistrations = JSON.parse(localStorage.getItem('buyerRegistrations')) || [];
    serviceRequests = JSON.parse(localStorage.getItem('serviceRequests')) || [];
    contractingClients = JSON.parse(localStorage.getItem('contractingClients')) || [];
    inquiries = JSON.parse(localStorage.getItem('inquiries')) || [];
}

function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Rest of your existing JavaScript functions remain the same...
// [Include all the existing JavaScript functions from your original code here]

// Example of updated functions with Supabase integration
async function submitSellerForm(event) {
    event.preventDefault();
    
    const whatsappNumber = document.getElementById('seller-whatsapp').value;
    if (!validateWhatsApp(whatsappNumber)) {
        showCustomAlert('خطأ', 'رقم الواتساب غير صحيح. يجب أن يبدأ بـ 010, 011, 012, أو 015 ويتكون من 11 رقم');
        return;
    }
    
    if (!currentPropertyType) {
        showCustomAlert('خطأ', 'يرجى اختيار نوع العقار');
        return;
    }
    
    // Collect form data
    const formData = {
        id: Date.now(),
        type: 'seller',
        propertyType: currentPropertyType,
        location: document.getElementById('seller-location').value,
        mapLocation: document.getElementById('map-location').value,
        name: document.getElementById('seller-name').value,
        whatsapp: whatsappNumber,
        timestamp: new Date().toLocaleString('ar-EG'),
        // Add other form fields as needed
    };
    
    // Add property-specific data
    const propertyData = collectPropertyData(currentPropertyType);
    Object.assign(formData, propertyData);
    
    // Save to Supabase
    await saveSellerRegistration(formData);
}

async function submitBuyerForm(event) {
    event.preventDefault();
    
    const whatsappNumber = document.getElementById('buyer-whatsapp').value;
    if (!validateWhatsApp(whatsappNumber)) {
        showCustomAlert('خطأ', 'رقم الواتساب غير صحيح. يجب أن يبدأ بـ 010, 011, 012, أو 015 ويتكون من 11 رقم');
        return;
    }
    
    if (!currentBuyerPropertyType) {
        showCustomAlert('خطأ', 'يرجى اختيار نوع العقار المطلوب');
        return;
    }
    
    // Collect form data
    const formData = {
        id: Date.now(),
        type: 'buyer',
        propertyType: currentBuyerPropertyType,
        location: document.getElementById('buyer-location').value,
        name: document.getElementById('buyer-name').value,
        whatsapp: whatsappNumber,
        timestamp: new Date().toLocaleString('ar-EG')
    };
    
    // Save to Supabase
    await saveBuyerRegistration(formData);
}

// Helper functions
function validateWhatsApp(phoneNumber) {
    const egyptianPhoneRegex = /^(010|011|012|015)\d{8}$/;
    return egyptianPhoneRegex.test(phoneNumber.replace(/\s+/g, ''));
}

function showCustomAlert(title, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    alertDiv.innerHTML = `
        <div class="bg-white rounded-2xl p-8 max-w-md mx-4 text-center">
            <h3 class="text-xl font-bold text-gray-800 mb-4">${title}</h3>
            <p class="text-gray-600 mb-6">${message}</p>
            <button onclick="this.closest('.fixed').remove()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">موافق</button>
        </div>
    `;
    document.body.appendChild(alertDiv);
}

// [Include all other existing functions...]

// Initialize when page loads
showSection('home');
