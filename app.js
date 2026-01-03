import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig, SCHOOL_CONTACT } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get phone number from URL
const urlParams = new URLSearchParams(window.location.search);
const phoneNumber = urlParams.get('phone');

let allReports = [];
let studentReports = [];

// DOM Elements
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('errorMessage');
const selectorCard = document.getElementById('selectorCard');
const studentSelector = document.getElementById('studentSelector');
const reportCard = document.getElementById('reportCard');

// Google Analytics Event Tracking
function trackEvent(eventName, params = {}) {
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, params);
    }
}

// Initialize
async function init() {
    if (!phoneNumber) {
        showError('No phone number provided. Please use the link sent by the school.');
        return;
    }

    loader.style.display = 'block';
    
    try {
        await loadReports();
        
        if (studentReports.length === 0) {
            showError('No reports found for this phone number.');
            return;
        }

        populateSelector();
        loader.style.display = 'none';
        selectorCard.style.display = 'block';
        
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
    studentSelector.innerHTML = '<option value="">-- Select Student --</option>';
    
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

function displayReport(report) {
    const student = report.student;
    
    // Performance Badge
    let badgeClass = 'badge-average';
    if (student.performanceBand.includes('Outstanding')) badgeClass = 'badge-outstanding';
    else if (student.performanceBand.includes('Above Average')) badgeClass = 'badge-above-average';
    else if (student.performanceBand.includes('Needs Support')) badgeClass = 'badge-needs-support';

    // Eligibility Message
    let eligibilityMessage = '';
    if (student.percentile >= 90) {
        eligibilityMessage = '🎉 Congratulations! Your child is eligible for <strong>Merit Scholarship</strong> and priority admission.';
    } else if (student.percentile >= 65) {
        eligibilityMessage = '✅ Your child is eligible for admission with <strong>scholarship consideration</strong>.';
    } else {
        eligibilityMessage = '✅ Your child is eligible for admission. We offer personalized support programs.';
    }

    // Scholarship Info
    let scholarshipInfo = '';
    if (student.percentile >= 90) {
        scholarshipInfo = `
            <div class="scholarship-box">
                <h3>🏆 Scholarship Benefits</h3>
                <ul>
                    <li>Up to 50% tuition fee waiver</li>
                    <li>Registration fee waived</li>
                    <li>Priority seat allotment</li>
                    <li>Free study materials for first term</li>
                </ul>
            </div>
        `;
    } else if (student.percentile >= 65) {
        scholarshipInfo = `
            <div class="scholarship-box">
                <h3>💰 Fee Benefits</h3>
                <ul>
                    <li>Registration fee waived</li>
                    <li>Priority seat allotment</li>
                    <li>10% discount on first term fees</li>
                </ul>
            </div>
        `;
    }

    reportCard.innerHTML = `
        <h2>${student.name}</h2>
        <p style="color: #7f8c8d; margin-bottom: 25px;"><strong>Class:</strong> ${report.className} | <strong>Test Date:</strong> ${report.testDate.toLocaleDateString()}</p>
        
        <div style="margin: 25px 0;">
            <h3>Performance Summary</h3>
            <div class="performance-badge ${badgeClass}">
                ${student.performanceBand}
            </div>
            <p style="margin-top: 15px; font-size: 16px;"><strong>Percentile:</strong> ${student.percentile}th | <strong>Score:</strong> ${student.grandTotal}/${student.maxTotal || 100} | <strong>Percentage:</strong> ${student.percentage}${student.percentage && !student.percentage.toString().includes('%') ? '%' : ''}</p>
        </div>

        <div class="diagnostic-box">
            <h3>📊 Diagnostic Insight</h3>
            <p>${student.diagnostic.message}</p>
        </div>

        <div class="score-section">
            <h3>Subject-wise Performance: Round 1 (Open Book) vs Round 2 (Closed Book)</h3>
            <div class="score-grid">
                ${generateSubjectComparison('English', student.round1.english, student.round2.english)}
                ${generateSubjectComparison('Math', student.round1.math, student.round2.math)}
                ${generateSubjectComparison('Science', student.round1.science, student.round2.science)}
                ${generateSubjectComparison('General Knowledge', student.round1.general, student.round2.general)}
            </div>
        </div>

        <div class="eligibility-box">
            <h3>🎓 Admission Eligibility</h3>
            <p>${eligibilityMessage}</p>
        </div>

        ${scholarshipInfo}

        <div class="cta-box">
            <h3>📞 Next Steps - Secure Your Child's Admission</h3>
            <ul>
                <li><strong>Counselling Date:</strong> Within 7 days of this report</li>
                <li><strong>Admission Window:</strong> Limited seats available</li>
                <li><strong>Required Documents:</strong> Birth certificate, previous report cards, 2 photos</li>
                <li><strong>Contact:</strong> ${SCHOOL_CONTACT.phone} (Admissions Office)</li>
            </ul>
            <button class="btn" onclick="window.trackAndCall()">📞 Schedule Counselling Call</button>
            <button class="btn btn-download" onclick="window.downloadCertificate('${student.name}', '${student.performanceBand}', ${student.percentile})">
                📄 Download Certificate
            </button>
            <a href="${report.answerKeyUrl}" target="_blank" class="btn" onclick="window.trackAnswerKey()">
                📋 View Answer Key
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
                    <small>Open Book</small>
                </div>
                <div class="round-bar">
                    <div class="bar" style="height: ${r2Height}px;">
                        R2: ${r2Score}
                    </div>
                    <small>Closed Book</small>
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
    alert('Thank you! Our admissions team will contact you within 24 hours.');
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
init();
