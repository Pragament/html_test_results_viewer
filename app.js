import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig, SCHOOL_CONTACT, translations } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Language and phone number management
let currentLanguage = null; // Don't use localStorage - ask every time
let phoneNumber = null;

let allReports = [];
let studentReports = [];

// DOM Elements
const languageModal = document.getElementById('languageModal');
const phoneInputSection = document.getElementById('phoneInputSection');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('errorMessage');
const selectorCard = document.getElementById('selectorCard');
const studentSelector = document.getElementById('studentSelector');
const reportCard = document.getElementById('reportCard');
const phoneForm = document.getElementById('phoneForm');
const phoneInput = document.getElementById('phoneInput');
const phoneError = document.getElementById('phoneError');

// Google Analytics Event Tracking
function trackEvent(eventName, params = {}) {
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, params);
    }
}

// Get translation
function t(key) {
    return translations[currentLanguage]?.[key] || translations.en[key] || key;
}

// Update UI text based on language
function updateLanguage() {
    document.getElementById('pageTitle').textContent = t('title');
    document.getElementById('pageSubtitle').textContent = t('subtitle');
    document.getElementById('enterPhoneLabel').textContent = t('enterPhone');
    phoneInput.placeholder = t('phonePlaceholder');
    document.getElementById('viewReportBtn').textContent = t('viewReport');
    document.getElementById('selectorLabel').textContent = t('selectStudent');
}

// Language selection
function selectLanguage(lang) {
    currentLanguage = lang;
    // Don't save to localStorage - ask every time
    languageModal.style.display = 'none';
    updateLanguage();
    checkPhoneNumber();
}

// Make selectLanguage global
window.selectLanguage = selectLanguage;

// Check for phone number
function checkPhoneNumber() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlPhone = urlParams.get('phone');
    
    if (urlPhone && /^\d{10}$/.test(urlPhone)) {
        phoneNumber = urlPhone;
        phoneInputSection.style.display = 'none';
        init();
    } else {
        phoneInputSection.style.display = 'block';
        loader.style.display = 'none';
    }
}

// Phone form submission
phoneForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = phoneInput.value.trim();
    
    // Validate 10 digits only
    if (!/^\d{10}$/.test(phone)) {
        phoneError.textContent = t('invalidPhone');
        phoneError.style.display = 'block';
        return;
    }
    
    phoneError.style.display = 'none';
    phoneNumber = phone;
    phoneInputSection.style.display = 'none';
    
    // Update URL without reload
    const newUrl = `${window.location.pathname}?phone=${phone}`;
    window.history.pushState({}, '', newUrl);
    
    init();
});

// Initialize
async function init() {
    // Show language modal if not selected
    if (!currentLanguage) {
        languageModal.style.display = 'flex';
        return;
    }
    
    updateLanguage();
    
    if (!phoneNumber) {
        checkPhoneNumber();
        return;
    }

    loader.style.display = 'block';
    loader.textContent = t('loading');
    
    try {
        await loadReports();
        
        if (studentReports.length === 0) {
            showError(t('noReports'));
            return;
        }

        populateSelector();
        loader.style.display = 'none';
        selectorCard.style.display = 'block';
        
        // Auto-select if only one student, otherwise select first
        if (studentReports.length === 1) {
            studentSelector.value = '0';
            displayReport(studentReports[0]);
        } else if (studentReports.length > 1) {
            studentSelector.value = '0';
            displayReport(studentReports[0]);
        }
        
        trackEvent('page_view', { phone: phoneNumber });
    } catch (error) {
        showError('Error loading reports: ' + error.message);
    }
}

async function loadReports() {
    const snapshot = await getDocs(collection(db, 'reports'));
    
    snapshot.forEach(doc => {
        const data = doc.data();
        data.students.forEach(student => {
            if (student.contact === phoneNumber) {
                studentReports.push({
                    reportId: doc.id,
                    className: data.className,
                    testDate: data.testDate.toDate(),
                    answerKeyUrl: data.answerKeyUrl,
                    student: student
                });
            }
        });
    });
}

function populateSelector() {
    studentSelector.innerHTML = `<option value="">${t('selectOption')}</option>`;
    
    studentReports.forEach((report, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${report.student.name} - ${report.className}`;
        studentSelector.appendChild(option);
    });
}

studentSelector.addEventListener('change', (e) => {
    const index = e.target.value;
    if (index !== '') {
        displayReport(studentReports[index]);
        trackEvent('student_selected', {
            student_name: studentReports[index].student.name,
            class: studentReports[index].className
        });
    } else {
        reportCard.style.display = 'none';
    }
});

function getFeeConcession(percentage) {
    // Remove any existing percentage symbol and convert to number
    const cleanPercentage = parseFloat(percentage.toString().replace('%', ''));
    console.log('Calculating fee concession for percentage:', percentage);
    if (cleanPercentage >= 95) return '50%';
    if (cleanPercentage >= 70) return '20%';
    if (cleanPercentage >= 60) return '15%';
    if (cleanPercentage >= 50) return '10%';
    return '5%';
}

function displayReport(report) {
    const student = report.student;
    
    // Performance Badge
    let badgeClass = 'badge-average';
    if (student.performanceBand.includes('Outstanding')) badgeClass = 'badge-outstanding';
    else if (student.performanceBand.includes('Above Average')) badgeClass = 'badge-above-average';
    else if (student.performanceBand.includes('Needs Support')) badgeClass = 'badge-needs-support';

    // Scholarship Info (simplified - just shows the fee concession)
    const concession = getFeeConcession(student.percentage);
    let scholarshipInfo = `
        <div class="scholarship-box">
            <h3>${currentLanguage === 'te' 
                ? 'ఫీజు రాయితీ వివరాలు' 
                : currentLanguage === 'hi'
                ? 'फीस छूट विवरण'
                : 'Fee Concession Details'}</h3>
            <ul>
                <li><strong>${currentLanguage === 'te' 
                    ? `${concession} అకాడెమిక్ ఫీజు రాయితీ`
                    : currentLanguage === 'hi'
                    ? `${concession} शैक्षणिक फीस छूट`
                    : `${concession} academic fee concession`}</strong></li>
            </ul>
        </div>
    `;

    reportCard.innerHTML = `
        <h2>${student.name}</h2>
        <p style="color: #7f8c8d; margin-bottom: 25px;"><strong>${t('class')}:</strong> ${report.className} | <strong>${t('testDate')}:</strong> ${report.testDate.toLocaleDateString()}</p>
        
        <div style="margin: 25px 0;">
            <h3>${t('performanceSummary')}</h3>
            <div class="performance-badge ${badgeClass}">
                ${student.performanceBand}
            </div>
            <p style="margin-top: 15px; font-size: 16px;"><strong>${t('percentile')}:</strong> ${student.percentile}th | <strong>${t('score')}:</strong> ${student.grandTotal}/${student.maxTotal || 100} | <strong>${t('percentage')}:</strong> ${student.percentage}${student.percentage && !student.percentage.toString().includes('%') ? '%' : ''}</p>
        </div>

        <div class="diagnostic-box">
            <h3>📊 ${t('diagnosticInsight')}</h3>
            <p>${student.diagnostic.message}</p>
        </div>

        <div class="score-section">
            <h3>${t('subjectPerformance')}</h3>
            <div class="score-grid">
                ${generateSubjectComparison(currentLanguage === 'te' ? 'ఇంగ్లీష్' : 'English', student.round1.english, student.round2.english)}
                ${generateSubjectComparison(currentLanguage === 'te' ? 'గణితం' : 'Math', student.round1.math, student.round2.math)}
                ${generateSubjectComparison(currentLanguage === 'te' ? 'సైన్స్' : 'Science', student.round1.science, student.round2.science)}
                ${generateSubjectComparison(currentLanguage === 'te' ? 'సాధారణ జ్ఞానం' : 'General Knowledge', student.round1.general, student.round2.general)}
            </div>
        </div>

        <div class="eligibility-box hidden">
            <h3>🎓 ${t('admissionEligibility')}</h3>
            <p>$eligibilityMessage</p>
        </div>

        ${scholarshipInfo}

        <div class="cta-box">
            <h3>📞 ${t('nextSteps')}</h3>
            <ul>
                <li><strong>${currentLanguage === 'te' ? 'కౌన్సెలింగ్ తేదీ' : 'Counselling Date'}:</strong> ${currentLanguage === 'te' ? 'ఈ రిపోర్ట్ తర్వాత 7 రోజుల్లో' : 'Within 7 days of this report'}</li>
                <li><strong>${currentLanguage === 'te' ? 'ప్రవేశ విండో' : 'Admission Window'}:</strong> ${currentLanguage === 'te' ? 'పరిమిత సీట్లు అందుబాటులో ఉన్నాయి' : 'Limited seats available'}</li>
                <li class="hidden"><strong>${currentLanguage === 'te' ? 'అవసరమైన పత్రాలు' : 'Required Documents'}:</strong> ${currentLanguage === 'te' ? 'జనన ధృవీకరణ పత్రం, మునుపటి రిపోర్ట్ కార్డులు, 2 ఫోటోలు' : 'Birth certificate, previous report cards, 2 photos'}</li>
                <li><strong>${currentLanguage === 'te' ? 'సంప్రదించండి' : 'Contact'}:</strong> ${SCHOOL_CONTACT.phone} (${currentLanguage === 'te' ? 'ప్రవేశాల కార్యాలయం' : 'Admissions Office'})</li>
            </ul>
            <button class="btn btn-download" onclick="window.open('https://wa.me/919347374670?text=Hi', '_blank')">${t('scheduleCounselling')}</button>
            <button class="btn btn-download hidden" onclick="window.downloadCertificate('${student.name}', '${student.performanceBand}', ${student.percentile})">
                ${t('downloadCertificate')}
            </button>
            <a href="${report.answerKeyUrl}" target="_blank" class="btn" onclick="window.trackAnswerKey()">
                ${t('viewAnswerKey')}
            </a>
        </div>
    `;

    reportCard.style.display = 'block';
    
    trackEvent('report_viewed', {
        student_name: student.name,
        percentile: student.percentile,
        performance_band: student.performanceBand
    });
}

function generateSubjectComparison(subject, r1Score, r2Score) {
    const maxScore = 10;
    const maxHeight = 100; // Maximum bar height in pixels
    
    // Calculate proportional heights
    const r1Height = Math.max((r1Score / maxScore) * maxHeight, 35);
    const r2Height = Math.max((r2Score / maxScore) * maxHeight, 35);
    
    return `
        <div class="score-item">
            <h4>${subject}</h4>
            <div class="comparison-chart">
                <div class="round-bar">
                    <div class="bar" style="height: ${r1Height}px;">
                        R1: ${r1Score}
                    </div>
                    <small>${t('openBook')}</small>
                </div>
                <div class="round-bar">
                    <div class="bar" style="height: ${r2Height}px;">
                        R2: ${r2Score}
                    </div>
                    <small>${t('closedBook')}</small>
                </div>
            </div>
        </div>
    `;
}

function showError(message) {
    loader.style.display = 'none';
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Global functions for button clicks
window.trackAndCall = function() {
    trackEvent('schedule_call_clicked', { phone: phoneNumber });
    const message = currentLanguage === 'te' 
        ? 'ధన్యవాదాలు! మా ప్రవేశాల బృందం 24 గంటల్లో మిమ్మల్ని సంప్రదిస్తుంది.'
        : 'Thank you! Our admissions team will contact you within 24 hours.';
    alert(message);
};

window.trackAnswerKey = function() {
    trackEvent('answer_key_viewed', { phone: phoneNumber });
};

window.downloadCertificate = function(name, band, percentile) {
    trackEvent('certificate_downloaded', {
        student_name: name,
        performance_band: band
    });
    
    // Generate simple certificate (in production, use proper PDF generation)
    const certificateWindow = window.open('', '_blank');
    certificateWindow.document.write(`
        <html>
        <head>
            <title>Talent Test Certificate</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    text-align: center;
                    padding: 40px;
                    background: #f5f7fa;
                }
                .certificate {
                    background: white;
                    padding: 70px 60px;
                    border: 12px solid #1e3c72;
                    max-width: 850px;
                    margin: 0 auto;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                    position: relative;
                }
                .certificate::before {
                    content: '';
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    right: 20px;
                    bottom: 20px;
                    border: 2px solid #2a5298;
                }
                h1 { 
                    color: #1e3c72; 
                    font-size: 44px; 
                    margin-bottom: 25px;
                    font-weight: 700;
                    letter-spacing: 1px;
                }
                h2 { 
                    font-size: 36px; 
                    margin: 35px 0;
                    color: #2c3e50;
                    font-weight: 600;
                    border-bottom: 3px solid #1e3c72;
                    display: inline-block;
                    padding-bottom: 10px;
                }
                .badge { 
                    font-size: 22px; 
                    color: #27ae60; 
                    font-weight: 700;
                    background: #e8f8f5;
                    padding: 12px 30px;
                    border-radius: 8px;
                    display: inline-block;
                    margin: 20px 0;
                }
                .seal {
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                    border-radius: 50%;
                    margin: 30px auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 36px;
                }
            </style>
        </head>
        <body>
            <div class="certificate">
                <h1>🏆 CERTIFICATE OF ACHIEVEMENT</h1>
                <p style="font-size: 18px; color: #7f8c8d; margin-top: 20px;">This is to certify that</p>
                <h2>${name}</h2>
                <p style="font-size: 17px; color: #34495e; margin: 25px 0;">has successfully participated in the Talent Test and demonstrated exceptional abilities</p>
                <p class="badge">${band}</p>
                <p style="font-size: 19px; margin-top: 30px; color: #2c3e50; font-weight: 600;">Percentile: ${percentile}th</p>
                <div class="seal">✓</div>
                <p style="margin-top: 40px; font-size: 15px; color: #7f8c8d;">Issue Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <script>
                setTimeout(() => window.print(), 500);
            </script>
        </body>
        </html>
    `);
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Always show language modal on page load
    languageModal.style.display = 'flex';
    
    // Log page view
    trackEvent('page_view', {
        page_title: 'Parent Portal',
        phone_number: phoneNumber || 'not_provided'
    });
});
