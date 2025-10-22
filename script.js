// =========================================================================================================
// SUPABASE CONFIGURATION
// = 🚨 تم وضع مفاتيح مشروعك الحقيقية هنا بناءً على ما أرسلته 🚨
// =========================================================================================================
const SUPABASE_URL = 'https://vnofexhxfcsyiobkjsew.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZub2ZleGh4ZmNzeWlvYmtqc2V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMDgzOTIsImV4cCI6MjA3NjY4NDM5Mn0.FwX-ncnC2R0Yegndv0Ucpv8CN8BkCZTcMk4dhfENHHc'; 

// 🚀 هذا هو سطر الاتصال الفعلي الذي يجب تفعيله 🚀
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// =========================================================================================================


// =========================================================================================================
// UI LOGIC & NAVIGATION
// =========================================================================================================
let currentSellerPropertyType = '';
let currentBuyerPropertyType = '';

document.addEventListener('DOMContentLoaded', () => {
    // Navigate to home section initially
    showSection('home');
    
    // Add event listeners for navigation buttons
    document.getElementById('main-header').addEventListener('click', () => showSection('home'));
    
    // Add event listeners for form submissions
    document.getElementById('seller-form').addEventListener('submit', submitSellerForm);
    document.getElementById('buyer-form').addEventListener('submit', submitBuyerForm);
    document.getElementById('service-form').addEventListener('submit', submitServiceRequest);
    
    // Add event listeners for property type selection
    document.querySelectorAll('.property-type-btn').forEach(button => {
        button.addEventListener('click', (e) => selectPropertyType(e.currentTarget.dataset.type, 'seller'));
    });
    
    document.querySelectorAll('.buyer-property-type-btn').forEach(button => {
        button.addEventListener('click', (e) => selectPropertyType(e.currentTarget.dataset.type, 'buyer'));
    });
});

/**
 * Shows the specified main section (home, seller, buyer, listings, service-request).
 * @param {string} sectionId - The ID prefix of the section to show.
 */
function showSection(sectionId) {
    document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
    
    const targetSection = document.getElementById(sectionId + '-section') || document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        // Handle home section visibility explicitly
        if (sectionId === 'home') {
            document.getElementById('home-section').classList.add('active');
        } else if (document.getElementById('home-section')) {
            document.getElementById('home-section').classList.remove('active');
        }
    }
}

/**
 * Handles the selection of property type and updates the active state.
 * @param {string} type - The selected property type.
 * @param {'seller' | 'buyer'} formType - The type of form.
 */
function selectPropertyType(type, formType) {
    const selector = formType === 'seller' ? '.property-type-btn' : '.buyer-property-type-btn';
    const hiddenInputId = formType === 'seller' ? 'seller-property-type' : 'buyer-property-type';
    const formClass = formType === 'seller' ? 'border-green-500 bg-green-100' : 'border-blue-500 bg-blue-100';

    document.querySelectorAll(selector).forEach(btn => {
        btn.classList.remove('active', 'border-green-500', 'bg-green-100', 'border-blue-500', 'bg-blue-100');
    });

    const selectedButton = document.querySelector(`${selector}[data-type="${type}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
        selectedButton.classList.add(...formClass.split(' '));
    }
    
    document.getElementById(hiddenInputId).value = type;
    
    if (formType === 'seller') {
        currentSellerPropertyType = type;
    } else {
        currentBuyerPropertyType = type;
    }
}

/**
 * Handles the user request for a contracting service by showing the specialized form.
 * @param {string} serviceName - The name of the requested service.
 */
function requestService(serviceName) {
    document.getElementById('service-name').value = serviceName;
    document.getElementById('display-service-name').value = serviceName;
    showSection('service-request');
}

/**
 * Custom Alert function to display messages to the user.
 * @param {string} title 
 * @param {string} message 
 */
function showCustomAlert(title, message) {
    const alertDiv = document.getElementById('custom-alert');
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-message').textContent = message;
    alertDiv.classList.remove('hidden');
}

function closeCustomAlert() {
    document.getElementById('custom-alert').classList.add('hidden');
}

/**
 * Basic WhatsApp validation for Egyptian numbers.
 * @param {string} phoneNumber 
 * @returns {boolean}
 */
function validateWhatsApp(phoneNumber) {
    const egyptianPhoneRegex = /^(010|011|012|015)\d{8}$/;
    return egyptianPhoneRegex.test(phoneNumber.replace(/\s+/g, ''));
}


// =========================================================================================================
// SUPABASE DATA INTERACTION (CRUD Operations)
// =========================================================================================================

/**
 * Submits the seller registration form data to Supabase.
 * @param {Event} event 
 */
async function submitSellerForm(event) {
    event.preventDefault();

    const form = event.target;
    const whatsapp = form.elements['whatsapp'].value;

    if (!validateWhatsApp(whatsapp)) {
        showCustomAlert('خطأ', 'رقم الواتساب غير صحيح. يجب أن يبدأ بـ 010, 011, 012, أو 015 ويتكون من 11 رقم');
        return;
    }

    // --- Collect Checkbox Data ---
    const selectedUtilities = Array.from(form.elements['utilities'])
                                   .filter(checkbox => checkbox.checked)
                                   .map(checkbox => checkbox.value)
                                   .join(', '); 

    const selectedExtras = Array.from(form.elements['extras'])
                                .filter(checkbox => checkbox.checked)
                                .map(checkbox => checkbox.value);

    // Prepare JSON data for extra details
    const extraDetails = {
        utilities: selectedUtilities || 'لا يوجد',
        extras_list: selectedExtras,
        notes: form.elements['notes'].value || 'لا يوجد ملاحظات إضافية'
    };
    
    const formData = {
        client_type: 'Seller',
        name: form.elements['name'].value,
        whatsapp: whatsapp,
        location: form.elements['location'].value,
        property_type: form.elements['property_type'].value,
        
        // Expanded Fields (Matches Supabase table structure)
        area: parseFloat(form.elements['area'].value),
        price: parseFloat(form.elements['price'].value),
        meters_price: parseFloat(form.elements['meters_price'].value) || null,
        negotiable: form.elements['negotiable'].checked,
        
        rooms: form.elements['rooms'].value,
        bathrooms: form.elements['bathrooms'].value,
        finishing: form.elements['finishing'].value,
        floor: form.elements['floor'].value,
        building_year: parseInt(form.elements['building_year'].value) || null,
        
        // Use details_json for flexible/extra fields
        details_json: extraDetails, 
        
        requirements: 'N/A', // Not applicable for sellers
        status: 'جديد - بانتظار المراجعة'
    };

    try {
        const { error } = await supabase
            .from('registrations') // الجدول الذي أنشأته للبيانات العقارية
            .insert([formData]);

        if (error) throw error;

        showCustomAlert('تم بنجاح! 🎉', 'تم تسجيل عقارك للبيع بنجاح مع كامل التفاصيل. سيتم التواصل معك قريباً عبر واتساب.');
        form.reset();
        document.getElementById('seller-property-type').value = '';
        document.querySelectorAll('.property-type-btn').forEach(btn => btn.classList.remove('active', 'border-green-500', 'bg-green-100'));
        showSection('home');
    } catch (error) {
        console.error('Error submitting seller data:', error.message);
        showCustomAlert('خطأ في الإرسال', `حدث خطأ أثناء تسجيل البيانات. يرجى مراجعة إعدادات Supabase RLS وتأكيد جميع الأعمدة. رسالة الخطأ: ${error.message}`);
    }
}

/**
 * Submits the buyer registration form data to Supabase.
 * @param {Event} event 
 */
async function submitBuyerForm(event) {
    event.preventDefault();

    const form = event.target;
    const whatsapp = form.elements['whatsapp'].value;

    if (!validateWhatsApp(whatsapp)) {
        showCustomAlert('خطأ', 'رقم الواتساب غير صحيح. يجب أن يبدأ بـ 010, 011, 012, أو 015 ويتكون من 11 رقم');
        return;
    }
    
    const formData = {
        client_type: 'Buyer',
        name: form.elements['name'].value,
        whatsapp: whatsapp,
        location: form.elements['location'].value,
        property_type: form.elements['property_type'].value,
        min_budget: parseFloat(form.elements['min_budget'].value),
        max_budget: parseFloat(form.elements['max_budget'].value),
        requirements: form.elements['requirements'].value,
        
        // Set seller fields to null/N/A for consistency (as required by DB schema)
        area: null,
        price: null,
        meters_price: null,
        negotiable: false,
        rooms: 'N/A',
        bathrooms: 'N/A',
        finishing: 'N/A',
        floor: 'N/A',
        building_year: null,
        details_json: { type: 'BuyerRequest' },
        
        status: 'جديد - طلب شراء'
    };

    try {
        const { error } = await supabase
            .from('registrations') // الجدول الذي أنشأته للبيانات العقارية
            .insert([formData]);

        if (error) throw error;

        showCustomAlert('تم بنجاح! 🔍', 'تم تسجيل طلبك. سنتواصل معك عند توفر عقار مطابق للمواصفات.');
        form.reset();
        document.getElementById('buyer-property-type').value = '';
        document.querySelectorAll('.buyer-property-type-btn').forEach(btn => btn.classList.remove('active', 'border-blue-500', 'bg-blue-100'));
        showSection('home');
    } catch (error) {
        console.error('Error submitting buyer data:', error.message);
        showCustomAlert('خطأ في الإرسال', `حدث خطأ أثناء تسجيل البيانات. رسالة الخطأ: ${error.message}`);
    }
}

/**
 * Submits the contracting service request form data to Supabase.
 * @param {Event} event 
 */
async function submitServiceRequest(event) {
    event.preventDefault();

    const form = event.target;
    const whatsapp = form.elements['whatsapp'].value;
    const serviceName = form.elements['service_name'].value;

    if (!validateWhatsApp(whatsapp)) {
        showCustomAlert('خطأ', 'رقم الواتساب غير صحيح. يجب أن يبدأ بـ 010, 011, 012, أو 015 ويتكون من 11 رقم');
        return;
    }
    
    const formData = {
        client_type: 'Contracting',
        name: form.elements['name'].value,
        whatsapp: whatsapp,
        service_requested: serviceName,
        details: form.elements['details'].value,
        status: 'جديد - طلب خدمة'
    };

    try {
        const { error } = await supabase
            .from('contracting_requests') // الجدول الذي أنشأته لطلبات المقاولات
            .insert([formData]);

        if (error) throw error;

        showCustomAlert('تم بنجاح! 🛠️', `تم إرسال طلبك لخدمة ${serviceName}. سنتواصل بك لتحديد التفاصيل.`);
        form.reset();
        showSection('home');
    } catch (error) {
        console.error('Error submitting service request:', error.message);
        showCustomAlert('خطأ في الإرسال', `حدث خطأ أثناء تسجيل طلب الخدمة: ${error.message}`);
    }
}