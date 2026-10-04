// 1. Supabase Credentials
const SUPABASE_URL = 'https://iyexkzavejuwyppcehkd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5ZXhremF2ZWp1d3lwcGNlaGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMzkzMjEsImV4cCI6MjEwNjYxNTMyMX0.affv1C2--Y6B6L_ou-REn20uNEPPU-WX1LOCQlDfou4';

let supabaseClient;
let allStudentRecords = []; // Global in-memory cache for fast search filtering and CGPA computation

// 2. Initialize Client
if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error('Supabase CDN failed to load.');
}

// ----------------------------------------------------
// THEME TOGGLE & PERSISTENCE LOGIC
// ----------------------------------------------------
function initTheme() {
    const savedTheme = localStorage.getItem('app-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcons('☀️');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeIcons('🌙');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('app-theme', 'light');
        updateThemeIcons('🌙');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('app-theme', 'dark');
        updateThemeIcons('☀️');
    }
}

function updateThemeIcons(icon) {
    document.querySelectorAll('.theme-icon').forEach(el => el.innerText = icon);
}

// Attach event listeners safely after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    // Theme Toggle Listeners
    document.getElementById('theme-toggle-auth')?.addEventListener('click', toggleTheme);
    document.getElementById('theme-toggle-dash')?.addEventListener('click', toggleTheme);

    // Google Sign-In Event
    document.getElementById('google-login-btn')?.addEventListener('click', async () => {
        if (!supabaseClient) {
            alert('Supabase client is not initialized. Please refresh the page.');
            return;
        }

        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) alert('OAuth Error: ' + error.message);
    });

    // Log Out Event
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
            window.location.reload();
        }
    });

    // Insert Student Record Event
    document.getElementById('student-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabaseClient.auth.getUser();

        if (!user) {
            alert('Session expired. Please log in again.');
            return;
        }

        const { error } = await supabaseClient.from('students').insert([{
            user_id: user.id,
            full_name: document.getElementById('full_name').value,
            student_id: document.getElementById('student_id').value,
            course: document.getElementById('course').value,
            sgpa: parseFloat(document.getElementById('sgpa').value) || 0,
            credits: parseInt(document.getElementById('credits').value, 10) || 0
        }]);

        if (error) {
            alert(error.message);
        } else {
            alert('Record saved successfully!');
            document.getElementById('student-form').reset();
            loadStudentData(user.id);
        }
    });

    // Search Filter Event
    document.getElementById('search-input')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        const filtered = allStudentRecords.filter(s => 
            (s.full_name || '').toLowerCase().includes(query) || 
            (s.student_id || '').toLowerCase().includes(query)
        );

        renderStudentCards(filtered);
    });

    // Edit Modal Close
    document.getElementById('close-modal-btn')?.addEventListener('click', () => {
        document.getElementById('edit-modal')?.classList.add('hidden');
    });

    // Edit Student Form Submit
    document.getElementById('edit-student-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabaseClient.auth.getUser();
        const recordId = document.getElementById('edit_record_id').value;

        const { error } = await supabaseClient
            .from('students')
            .update({
                full_name: document.getElementById('edit_full_name').value,
                student_id: document.getElementById('edit_student_id').value,
                course: document.getElementById('edit_course').value,
                sgpa: parseFloat(document.getElementById('edit_sgpa').value) || 0,
                credits: parseInt(document.getElementById('edit_credits').value, 10) || 0
            })
            .eq('id', recordId);

        if (error) {
            alert('Update failed: ' + error.message);
        } else {
            alert('Record updated successfully!');
            document.getElementById('edit-modal')?.classList.add('hidden');
            loadStudentData(user.id);
        }
    });

    // CSV Export Event
    document.getElementById('export-csv-btn')?.addEventListener('click', () => {
        if (!allStudentRecords || allStudentRecords.length === 0) {
            alert('No student records available to export.');
            return;
        }

        const headers = ['Full Name', 'Student ID / USN', 'Course', 'SGPA', 'Earned Credits'];

        const rows = allStudentRecords.map(s => [
            `"${(s.full_name || '').replace(/"/g, '""')}"`,
            `"${(s.student_id || '').replace(/"/g, '""')}"`,
            `"${(s.course || '').replace(/"/g, '""')}"`,
            `"${s.sgpa || 0}"`,
            `"${s.credits || 0}"`
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const today = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `student_records_${today}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
});

// ----------------------------------------------------
// GLOBAL DATA & COMPUTATION FUNCTIONS
// ----------------------------------------------------

async function loadStudentData(userId) {
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient.from('students').select('*');
    
    if (error) {
        console.error('Error fetching records:', error.message);
        return;
    }

    allStudentRecords = data || [];
    renderStudentCards(allStudentRecords);
}

function updateAcademicSummary(records) {
    const totalStudentsEl = document.getElementById('total-students-count');
    const totalCreditsEl = document.getElementById('total-credits-count');
    const overallCgpaEl = document.getElementById('overall-cgpa-value');

    if (!totalStudentsEl || !totalCreditsEl || !overallCgpaEl) return;

    if (!records || records.length === 0) {
        totalStudentsEl.innerText = '0';
        totalCreditsEl.innerText = '0';
        overallCgpaEl.innerText = '0.00';
        return;
    }

    let totalPoints = 0;
    let totalCredits = 0;

    records.forEach(r => {
        const sgpa = parseFloat(r.sgpa) || 0;
        const credits = parseInt(r.credits, 10) || 0;

        totalPoints += sgpa * credits;
        totalCredits += credits;
    });

    const cgpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0;

    totalStudentsEl.innerText = records.length;
    totalCreditsEl.innerText = totalCredits;
    overallCgpaEl.innerText = cgpa.toFixed(2);
}

function renderStudentCards(records) {
    updateAcademicSummary(records);

    const listDiv = document.getElementById('student-list');
    if (!listDiv) return;
    
    if (records && records.length > 0) {
        listDiv.innerHTML = records.map(s => `
            <div class="record-card">
                <div class="record-header">
                    <div class="record-name">${s.full_name}</div>
                    <div class="record-actions">
                        <button class="btn-edit" onclick="openEditModal('${s.id}', '${escapeQuotes(s.full_name)}', '${escapeQuotes(s.student_id)}', '${escapeQuotes(s.course)}', ${s.sgpa || 0}, ${s.credits || 0})">
                            Edit
                        </button>
                        <button class="btn-delete" onclick="deleteStudentRecord('${s.id}', '${s.user_id}')" title="Delete record">
                            &times;
                        </button>
                    </div>
                </div>
                <div class="record-meta">
                    <span>ID: <b>${s.student_id}</b></span>
                    <span class="badge">${s.course}</span>
                </div>
                <div class="record-academic-meta">
                    <span class="sgpa-pill">SGPA: <b>${s.sgpa ? Number(s.sgpa).toFixed(2) : 'N/A'}</b></span>
                    <span class="credits-tag">Credits: <b>${s.credits || 0}</b></span>
                </div>
            </div>
        `).join('');
    } else {
        listDiv.innerHTML = '<div class="empty-state">No matching student records found.</div>';
    }
}

function escapeQuotes(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function openEditModal(id, fullName, studentId, course, sgpa, credits) {
    document.getElementById('edit_record_id').value = id;
    document.getElementById('edit_full_name').value = fullName;
    document.getElementById('edit_student_id').value = studentId;
    document.getElementById('edit_course').value = course;
    document.getElementById('edit_sgpa').value = sgpa;
    document.getElementById('edit_credits').value = credits;

    document.getElementById('edit-modal')?.classList.remove('hidden');
}

async function deleteStudentRecord(recordId, userId) {
    const confirmDelete = confirm('Are you sure you want to delete this student record?');
    if (!confirmDelete) return;

    const { error } = await supabaseClient
        .from('students')
        .delete()
        .eq('id', recordId);

    if (error) {
        alert('Delete failed: ' + error.message);
    } else {
        loadStudentData(userId);
    }
}

// Real-Time Auth State Sync
if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        const authSection = document.getElementById('auth-section');
        const dashboard = document.getElementById('dashboard');
        const userEmail = document.getElementById('user-email');

        if (session) {
            authSection?.classList.add('hidden');
            dashboard?.classList.remove('hidden');
            if (userEmail) userEmail.innerText = session.user.email;
            loadStudentData(session.user.id);
        } else {
            authSection?.classList.remove('hidden');
            dashboard?.classList.add('hidden');
        }
    });
}