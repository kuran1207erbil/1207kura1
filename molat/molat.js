// molat/molat.js
// تکایە ئەو لینکەی Web Appـەت لە Google Apps Script کۆپی کرد، لێرە دایبنێ
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby7nm9h0G_5EhmzdoeAsI5h26Ey6_lP8i0VhDTvZ4rf5tDx6yx0s5bPgORGgMRiK2VG/exec';


// ئەم فایلە لۆجیکی تایبەت بە لاپەڕەی مۆڵەتەکانی تێدایە

// Helper function to get translation
function getTrans(key) {
    const lang = localStorage.getItem('language') || 'ku';
    return translations[lang][key] || key;
}

// دڵنیابوونەوە لەوەی کە DOM بە تەواوی بارکراوە
document.addEventListener('DOMContentLoaded', async () => {
    // پشکنینی دۆخی چوونەژوورەوەی بەکارهێنەر
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        // ئەگەر بەکارهێنەر لۆگین نەبووبوو، ڕەوانەی لاپەڕەی چوونەژوورەوەی بکە
        window.location.href = '../index.html'; 
        return; // ڕاگرتنی جێبەجێکردنی کۆدەکانی تر
    }

    // ناساندنی توخمە سەرەکییەکانی UI
    const addLeaveBtn = document.getElementById('add-leave-btn');
    const modal = document.getElementById('leave-modal');
    const closeModalBtn = modal.querySelector('.close-modal');
    const cancelModalBtn = modal.querySelector('.cancel-btn');
    const leaveForm = document.getElementById('leave-form');
    const fileInput = document.getElementById('leave-document');
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileNameDisplay = document.getElementById('file-name-display');
    const searchInput = document.getElementById('search-leaves-input');
    const openFilterBtn = document.getElementById('open-filter-modal-btn');
    const filterModal = document.getElementById('filter-modal');
    const closeFilterModalBtn = document.getElementById('close-filter-modal');
    const filterForm = document.getElementById('filter-form');
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteActionBtn = document.getElementById('confirm-delete-action-btn');

    // کردنەوەی مۆداڵ بۆ زیادکردنی مۆڵەت
    addLeaveBtn.addEventListener('click', () => {
        openModalForAdd();
    });

    // داخستنی مۆداڵ بە کلیلی X
    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // داخستنی مۆداڵ بە دوگمەی پاشگەزبوونەوە
    cancelModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // داخستنی مۆداڵ ئەگەر لە دەرەوەی کلیک کرا
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
        if (event.target === filterModal) {
            filterModal.style.display = 'none';
        }
        if (event.target === confirmDeleteModal) {
            confirmDeleteModal.style.display = 'none';
        }
    });

    // فەنکشنی سەرەکی بۆ تۆمارکردن یان دەستکاریکردنی مۆڵەت
    leaveForm.addEventListener('submit', handleFormSubmit);

    // ڕووداوەکان بۆ بەشی بارکردنی فایل (Drag and Drop)
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.classList.add('dragover');
    });

    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.classList.remove('dragover');
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            updateFileName();
        }
    });

    // نوێکردنەوەی ناوی فایل کاتێک فایلێک هەڵدەبژێردرێت
    fileInput.addEventListener('change', updateFileName);

    // گەڕان لەناو مۆڵەتەکان
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.leave-card');
        cards.forEach(card => {
            const employeeName = card.querySelector('h3').textContent.toLowerCase();
            if (employeeName.includes(searchTerm)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });

    // بارکردنی داتا سەرەتاییەکان
    fetchEmployees();
    fetchLeaves();
    
    // گوێگرتن لە گۆڕانکارییەکانی فەرمانبەران و مۆڵەتەکان
    setupRealtimeSubscription();

    // Event Listeners for Filter Modal
    openFilterBtn.addEventListener('click', () => {
        filterModal.style.display = 'flex';
    });

    closeFilterModalBtn.addEventListener('click', () => {
        filterModal.style.display = 'none';
    });

    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        fetchLeaves(); // Re-fetch with new filters
        filterModal.style.display = 'none';
    });

    resetFilterBtn.addEventListener('click', () => {
        filterForm.reset();
        fetchLeaves(); // Re-fetch with no filters
    });

    // داخستنی مۆداڵی سڕینەوە
    cancelDeleteBtn.addEventListener('click', () => {
        confirmDeleteModal.style.display = 'none';
    });
});

// -- فەنکشنەکانی پەیوەست بە Supabase و UI --

/**
 * ڕێکخستنی Realtime Subscription بۆ نوێکردنەوەی داتا بە شێوەی زیندوو
 */
function setupRealtimeSubscription() {
    // گوێگرتن لە گۆڕانکارییەکانی خشتەی employees
    const employeeSubscription = supabaseClient
        .channel('employees_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, (payload) => {
            console.log('Employee change detected:', payload);
            fetchEmployees(); // نوێکردنەوەی لیستی فەرمانبەران لە درۆپداون
        })
        .subscribe();

    // گوێگرتن لە گۆڕانکارییەکانی خشتەی leaves (بۆ نموونە ئەگەر کەسێکی تر مۆڵەتێکی زیاد کرد)
    const leavesSubscription = supabaseClient
        .channel('leaves_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, (payload) => {
            console.log('Leave change detected:', payload);
            fetchLeaves(); // نوێکردنەوەی لیستی مۆڵەتەکان
        })
        .subscribe();
        
    // پاککردنەوەی سەبسکرایبەکان کاتێک لاپەڕەکە دادەخرێت (Optional but good practice)
    window.addEventListener('beforeunload', () => {
        supabaseClient.removeChannel(employeeSubscription);
        supabaseClient.removeChannel(leavesSubscription);
    });
}


/**
 * کردنەوەی مۆداڵ بۆ زیادکردنی مۆڵەتێکی نوێ
 */
function openModalForAdd() {
    const modal = document.getElementById('leave-modal');
    document.getElementById('leave-form').reset(); // پاککردنەوەی فۆڕمەکە
    document.getElementById('modal-title').innerText = getTrans('add_leave_title');
    document.getElementById('leave-id').value = ''; // دڵنیابوونەوە لەوەی ID بەتاڵە
    document.getElementById('file-name-display').textContent = '';
    document.getElementById('current-file-link').style.display = 'none';
    document.getElementById('save-leave-btn').innerText = getTrans('save_btn');
    modal.style.display = 'flex';
}

/**
 * کردنەوەی مۆداڵ بۆ دەستکاریکردنی مۆڵەتێکی هەبوو
 * @param {object} leave - ئۆبجێکتی مۆڵەتەکە کە داتاکانی تێدایە
 */
async function openModalForEdit(leave) {
    const modal = document.getElementById('leave-modal');
    document.getElementById('leave-form').reset();
    document.getElementById('modal-title').innerText = getTrans('edit_leave_title');
    
    // پڕکردنەوەی فۆڕمەکە بە داتای مۆڵەتەکە
    document.getElementById('leave-id').value = leave.id;
    document.getElementById('employee-select').value = leave.employee_id;
    document.getElementById('leave-type-select').value = leave.leave_type;
    document.getElementById('leave-date').value = leave.leave_date;
    
    // پیشاندانی لینکی فایلی ئێستا
    const currentFileLink = document.getElementById('current-file-link');
    if (leave.document_gdrive_id) {
        // دروستکردنی لینکی بینینی فایل لە گوگڵ درایڤ
        currentFileLink.href = `https://drive.google.com/file/d/${leave.document_gdrive_id}/view`;
        currentFileLink.style.display = 'inline-block';
        // دڵنیابوونەوە لەوەی لە تابێکی نوێدا دەکرێتەوە
        currentFileLink.target = '_blank';
    } else {
        currentFileLink.style.display = 'none';
    }

    document.getElementById('file-name-display').textContent = '';
    document.getElementById('save-leave-btn').innerText = getTrans('update_btn');
    modal.style.display = 'flex';
}


/**
 * هێنانی لیستی فەرمانبەران لە Supabase بۆ پڕکردنەوەی dropdown
 */
async function fetchEmployees() {
    const employeeSelect = document.getElementById('employee-select');
    const filterEmployeeSelect = document.getElementById('filter-employee-select');
    try {
        // وا دادەنێین کە خشتەیەک هەیە بە ناوی 'employees' و ستوونی 'full_name' و 'id'ی تێدایە 
        const { data: employees, error } = await supabaseClient
            .from('employees')
            .select('id, full_name'); 

        if (error) throw error;

        // پاککردنەوەی لیستەکە پێش پڕکردنەوە
        employeeSelect.innerHTML = `<option value="" disabled selected>${getTrans('select_employee_placeholder')}</option>`;
        filterEmployeeSelect.innerHTML = `<option value="">${getTrans('filter_all_employees')}</option>`;
        
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = emp.full_name;
            // زیادکردنی بۆ هەردوو درۆپداونەکە
            employeeSelect.appendChild(option.cloneNode(true));
            filterEmployeeSelect.appendChild(option.cloneNode(true));
        });

    } catch (error) {
        console.error(getTrans('error_fetching_employees'), error);
        showToast(getTrans('error_fetching_employees'), 'error');
    }
}

/**
 * هێنانی هەموو مۆڵەتەکان لە Supabase و پیشاندانیان
 */
async function fetchLeaves() {
    const leavesGrid = document.getElementById('leaves-grid');
    const noLeavesMessage = document.getElementById('no-leaves-message');
    leavesGrid.innerHTML = `
        <div class="content-loader">
            <div class="spinner"></div>
            <p>...Loading</p>
        </div>
    `;

    try {
        let query = supabaseClient
            .from('leaves')
            .select(`
                id,
                leave_type,
                leave_date,
                document_gdrive_id,
                employee_id,
                employees (full_name)
            `)
            .order('leave_date', { ascending: false });

        // وەرگرتنی نرخەکانی فلتەر
        const employeeId = document.getElementById('filter-employee-select').value;
        const leaveType = document.getElementById('filter-leave-type-select').value;
        const startDate = document.getElementById('filter-start-date').value;
        const endDate = document.getElementById('filter-end-date').value;

        // جێبەجێکردنی فلتەرەکان لەسەر کوێرییەکە
        if (employeeId) {
            query = query.eq('employee_id', employeeId);
        }
        if (leaveType) {
            query = query.eq('leave_type', leaveType);
        }
        if (startDate) {
            query = query.gte('leave_date', startDate);
        }
        if (endDate) {
            query = query.lte('leave_date', endDate);
        }

        // جێبەجێکردنی کوێرییەکە
        const { data: leaves, error } = await query;

        if (error) throw error;

        leavesGrid.innerHTML = ''; // پاککردنەوەی لۆدینگ
        if (leaves.length === 0) {
            noLeavesMessage.style.display = 'block';
        } else {
            noLeavesMessage.style.display = 'none';
            leaves.forEach((leave, index) => {
                const card = createLeaveCard(leave);
                card.style.animationDelay = `${index * 50}ms`; // زیادکراوە بۆ ئەنیمەیشنی یەک لەدوای یەک
                leavesGrid.appendChild(card);
            });
        }

    } catch (error) {
        console.error('هەڵە لە هێنانی مۆڵەتەکان:', error);
        leavesGrid.innerHTML = `
            <div class="content-loader">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 15px; color: var(--danger-color);"></i>
                <p>${getTrans('error_fetching_leaves')}</p>
            </div>
        `;
        showToast(getTrans('error_fetching_leaves'), 'error');
    }
}

/**
 * دروستکردنی کارتی HTML بۆ هەر مۆڵەتێک
 * @param {object} leave - ئۆبجێکتی مۆڵەت
 * @returns {HTMLElement} - توخمی HTMLی کارتەکە
 */
function createLeaveCard(leave) {
    const card = document.createElement('div');
    card.className = 'leave-card';
    card.dataset.id = leave.id;

    // پێناسەکردنی ئایکۆن و دەق بۆ هەر جۆرە مۆڵەتێک
    const leaveConfig = {
        'daily': { text: getTrans('leave_type_daily'), icon: 'fa-sun' },
        'hourly': { text: getTrans('leave_type_hourly'), icon: 'fa-clock' },
        'disease': { text: getTrans('leave_type_disease'), icon: 'fa-procedures' },
        'motherhood': { text: getTrans('leave_type_motherhood'), icon: 'fa-baby' },
        'long-term': { text: getTrans('leave_type_long_term'), icon: 'fa-calendar-week' },
        'travel': { text: getTrans('leave_type_travel'), icon: 'fa-plane' }
    };

    const config = leaveConfig[leave.leave_type] || { text: 'نادیار', icon: 'fa-question-circle' };

    card.innerHTML = `
        <div class="card-header">
            <h3>${leave.employees.full_name || getTrans('employee_name_not_found')}</h3>
        </div>
        <span class="leave-type ${leave.leave_type}"><i class="fas ${config.icon}"></i> ${config.text}</span>
        <div class="card-body">
            <p><i class="fas fa-calendar-alt"></i> ${leave.leave_date}</p>
        </div>
        <div class="card-actions">
            <button class="action-btn edit-btn" title="دەستکاری"><i class="fas fa-edit"></i></button>
            <button class="action-btn delete-btn" title="سڕینەوە"><i class="fas fa-trash"></i></button>
        </div>
    `;

    // کردنی خودی کاردەکە بە دوگمەی کردنەوەی فایل
    card.addEventListener('click', (e) => {
        // ئەگەر کلیک لەسەر دوگمەکانی دەستکاری یان سڕینەوە کرا، فایلەکە مەکەرەوە
        if (e.target.closest('.action-btn')) return;
        viewDocument(leave.document_gdrive_id);
    });

    // زیادکردنی event listener بۆ دوگمەکان
    card.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // ڕێگری لە کردنەوەی فایلەکە کاتێک دەستکاری دەکرێت
        openModalForEdit(leave);
    });
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // ڕێگری لە کردنەوەی فایلەکە کاتێک دەسڕدرێتەوە
        deleteLeave(leave.id, leave.document_gdrive_id);
    });

    return card;
}

/**
 * فەنکشنی سەرەکی بۆ مامەڵەکردن لەگەڵ فۆڕمەکە (زیادکردن یان نوێکردنەوە)
 * @param {Event} e - ڕووداوی submit
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-leave-btn');
    const originalBtnText = saveBtn.innerText;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const leaveId = document.getElementById('leave-id').value;
    const isEditing = !!leaveId;

    try {
        // کۆکردنەوەی داتاکان لە فۆڕمەکە
        const leaveData = {
            employee_id: document.getElementById('employee-select').value,
            leave_type: document.getElementById('leave-type-select').value,
            leave_date: document.getElementById('leave-date').value,
        };

        const fileInput = document.getElementById('leave-document');
        const file = fileInput.files[0];

        // ئەگەر فایل هەبوو، باریکە بۆ Google Drive لە ڕێگەی Apps Script
        if (file) {
            // ئەگەر لە دۆخی دەستکاریکردندا بووین و فایلێکی کۆن هەبوو، لە گوگڵ درایڤ بیسڕەوە
            if (isEditing) {
                const { data: oldLeave } = await supabaseClient.from('leaves').select('document_gdrive_id').eq('id', leaveId).single();
                if (oldLeave && oldLeave.document_gdrive_id) {
                    // ناردنی داواکاری سڕینەوە بۆ Apps Script
                    await fetch(GOOGLE_SCRIPT_URL, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'delete', fileId: oldLeave.document_gdrive_id })
                    });
                }
            }
            
            // گۆڕینی فایل بۆ base64 بۆ ناردن
            const reader = new FileReader();
            const fileData = await new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // ناردنی فایل بۆ Apps Script
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ fileName: file.name, mimeType: file.type, fileData: fileData })
            });
            const result = await response.json();

            if (result.status === 'success') {
                leaveData.document_gdrive_id = result.id; // هەڵگرتنی IDی فایلەکە
            } else {
                throw new Error(`Google Script Error: ${result.message}`);
            }
        }
        if (isEditing) {
            // نوێکردنەوەی داتای مۆڵەت
            const { error } = await supabaseClient
                .from('leaves')
                .update(leaveData)
                .eq('id', leaveId);
            if (error) throw error;
            showToast(getTrans('leave_updated_success'), 'success');
        } else {
            // زیادکردنی مۆڵەتێکی نوێ
            const { error } = await supabaseClient
                .from('leaves')
                .insert([leaveData]);
            if (error) throw error;
            showToast(getTrans('leave_added_success'), 'success');
        }

        document.getElementById('leave-modal').style.display = 'none';
        fetchLeaves(); // دووبارە بارکردنەوەی لیستەکە

    } catch (error) {
        console.error(getTrans('error_label') + error.message, error);
        showToast(`هەڵەیەک ڕوویدا: ${error.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
    }
}

/**
 * سڕینەوەی مۆڵەتێک
 * @param {string} id - IDی مۆڵەتەکە
 * @param {string} fileId - IDی فایلەکە لە گوگڵ درایڤ
 */
async function deleteLeave(id, fileId) {
    const confirmModal = document.getElementById('confirm-delete-modal');
    const confirmBtn = document.getElementById('confirm-delete-action-btn');

    // مۆداڵەکە پیشان بدە
    confirmModal.style.display = 'flex';

    // کاتێک دوگمەی "بەڵێ، بیسڕەوە" کرتەی لێکرا، فەنکشنی سڕینەوەکە جێبەجێ بکە
    confirmBtn.onclick = () => {
        confirmModal.style.display = 'none'; // یەکسەر مۆداڵەکە دابخە
        executeDelete(id, fileId); // فەنکشنی سڕینەوەی ڕاستەقینە بانگ بکە
    };
}

async function executeDelete(id, fileId) {
    try {
        // سڕینەوەی فایلەکە لە گوگڵ درایڤ ئەگەر هەبوو
        if (fileId) {
            try {
                // بەکارهێنانی no-cors بۆ ڕێگریکردن لە کێشەی CORS، هەرچەندە وەڵامەکەمان دەست ناکەوێت بەڵام داواکارییەکە دەچێت
                const response = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors', // زیادکراوە بۆ چارەسەری کێشەی CORS
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ action: 'delete', fileId: fileId })
                });
                // تێبینی: لە دۆخی no-cors ناتوانین وەڵامی JSON بخوێنینەوە، بۆیە گریمانە دەکەین سەرکەوتوو بووە
            } catch (fetchError) {
                console.warn('هەڵە لە پەیوەندی کردن بە گوگڵ سکریپت:', fetchError);
                // بەردەوام دەبین چونکە دەمانەوێت داتاکە لە داتابەیس بسڕینەوە
            }
        }

        // سڕینەوەی تۆمارەکە لە خشتەی 'leaves'
        const { error: dbError } = await supabaseClient
            .from('leaves')
            .delete()
            .eq('id', id);

        if (dbError) throw dbError;

        showToast(getTrans('leave_deleted_success'), 'success');

        // ئەنیمەیشنی سڕینەوە لەجیاتی بارکردنەوەی هەموو لاپەڕەکە
        const cardToRemove = document.querySelector(`.leave-card[data-id='${id}']`);
        if (cardToRemove) {
            cardToRemove.classList.add('fading-out');
            // دوای تەواوبوونی ئەنیمەیشنەکە، کاردەکە لە DOM لادەبەین
            cardToRemove.addEventListener('animationend', () => {
                cardToRemove.remove();
                // پشکنین ئەگەر هیچ کاردێک نەما
                if (document.getElementById('leaves-grid').children.length === 0) {
                    document.getElementById('no-leaves-message').style.display = 'block';
                }
            }, { once: true }); // دڵنیابوونەوە لەوەی event listener تەنها یەکجار کاردەکات
        } else {
            fetchLeaves(); // وەک چارەسەرێکی یەدەگ ئەگەر کاردەکە نەدۆزرایەوە
        }

    } catch (error) {
        console.error(getTrans('error_label') + error.message, error);
        showToast(`${getTrans('error_label')}: ${error.message}`, 'error');
    }
}

/**
 * کردنەوەی بەڵگەنامەی مۆڵەت لە تابێکی نوێدا
 * @param {string} fileId - IDی فایلەکە لە گوگڵ درایڤ
 */
function viewDocument(fileId) {
    if (!fileId) {
        showToast(getTrans('no_leave_document'), 'info');
        return;
    }
    // دروستکردنی لینکی بینینی فایل و کردنەوەی لە تابێکی نوێ
    const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
    window.open(fileUrl, '_blank');
}

/**
 * نوێکردنەوەی ناوی فایل لە UI
 */
function updateFileName() {
    const fileInput = document.getElementById('leave-document');
    const fileNameDisplay = document.getElementById('file-name-display');
    if (fileInput.files.length > 0) {
        fileNameDisplay.textContent = fileInput.files[0].name;
    } else {
        fileNameDisplay.textContent = '';
    }
}