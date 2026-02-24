// molat/nwsraw.js
// هەمان لینکی Web App بۆ بەڕێوەبردنی فایلەکان لە گوگڵ درایڤ
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwPwWdNC1lNYZ9HIe6RcIvwRLqRtbRAoxO_TErK-Ly6PniTjJmPCienCn7TxQy-Mvz8_Q/exec';

// ئەم فایلە لۆجیکی تایبەت بە لاپەڕەی نوسراوەکان (Nwsraw)ی تێدایە

// Helper function to get translation
function getTrans(key) {
    const lang = localStorage.getItem('language') || 'ku';
    return translations[lang][key] || key;
}

document.addEventListener('DOMContentLoaded', async () => {
    // پشکنینی دۆخی چوونەژوورەوەی بەکارهێنەر
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        // ئەگەر بەکارهێنەر لۆگین نەبووبوو، ڕەوانەی لاپەڕەی چوونەژوورەوەی بکە
        window.location.href = '../index.html'; 
        return; // ڕاگرتنی جێبەجێکردنی کۆدەکانی تر
    }

    // ناساندنی توخمە سەرەکییەکانی UI
    const addLetterBtn = document.getElementById('add-letter-btn');
    const modal = document.getElementById('letter-dialog');
    const closeDialogBtn = document.getElementById('close-dialog-btn');
    const cancelDialogBtn = document.getElementById('cancel-dialog-btn');
    const letterForm = document.getElementById('letter-dialog-form');
    const fileInput = document.getElementById('letter-document');
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileNameDisplay = document.getElementById('file-name-display');
    const searchInput = document.getElementById('search-letters-input');
    
    // فلتەر و سڕینەوە
    const openFilterBtn = document.getElementById('open-filter-modal-btn');
    const filterModal = document.getElementById('filter-modal');
    const closeFilterModalBtn = document.getElementById('close-filter-modal');
    const filterForm = document.getElementById('filter-form');
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteActionBtn = document.getElementById('confirm-delete-action-btn');
    
    // View Modal Elements
    const viewModal = document.getElementById('view-letter-modal');
    const closeViewModalBtn = document.getElementById('close-view-modal');

    // کردنەوەی مۆداڵ بۆ زیادکردن
    addLetterBtn.addEventListener('click', () => {
        openModalForAdd();
    });

    // داخستنی مۆداڵەکان
    closeDialogBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    cancelDialogBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    if(closeViewModalBtn) {
        closeViewModalBtn.addEventListener('click', () => { viewModal.style.display = 'none'; });
    }
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) modal.style.display = 'none';
        if (event.target === filterModal) filterModal.style.display = 'none';
        if (event.target === confirmDeleteModal) confirmDeleteModal.style.display = 'none';
        if (event.target === viewModal) viewModal.style.display = 'none';
    });

    // تۆمارکردنی فۆڕم
    letterForm.addEventListener('submit', handleFormSubmit);

    // Drag and Drop بۆ فایل
    fileUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); fileUploadArea.classList.add('dragover'); });
    fileUploadArea.addEventListener('dragleave', () => { fileUploadArea.classList.remove('dragover'); });
    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            updateFileName();
        }
    });

    fileInput.addEventListener('change', updateFileName);

    // گەڕان
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.letter-card');
        cards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const number = card.querySelector('.letter-number').textContent.toLowerCase();
            if (title.includes(searchTerm) || number.includes(searchTerm)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });

    // بارکردنی داتا
    fetchLetters();
    setupRealtimeSubscription();

    // فلتەرکردن
    openFilterBtn.addEventListener('click', () => { filterModal.style.display = 'flex'; });
    closeFilterModalBtn.addEventListener('click', () => { filterModal.style.display = 'none'; });
    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        fetchLetters();
        filterModal.style.display = 'none';
    });
    resetFilterBtn.addEventListener('click', () => {
        filterForm.reset();
        fetchLetters();
    });

    cancelDeleteBtn.addEventListener('click', () => { confirmDeleteModal.style.display = 'none'; });
});

// -- فەنکشنەکان --

function setupRealtimeSubscription() {
    const lettersSubscription = supabaseClient
        .channel('letters_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'letters' }, (payload) => {
            console.log('Letter change detected:', payload);
            fetchLetters();
        })
        .subscribe();
        
    window.addEventListener('beforeunload', () => {
        supabaseClient.removeChannel(lettersSubscription);
    });
}

function openModalForAdd() {
    const modal = document.getElementById('letter-dialog');
    document.getElementById('letter-dialog-form').reset();
    document.getElementById('dialog-title').innerText = getTrans('add_letter_title');
    document.getElementById('letter-id').value = '';
    document.getElementById('dialog-header-icon').className = 'fas fa-plus';
    document.getElementById('file-name-display').textContent = '';
    document.getElementById('current-file-link').style.display = 'none';
    document.getElementById('save-dialog-btn').innerHTML = getTrans('save_btn');
    modal.style.display = 'flex';
}

function openModalForEdit(letter) {
    const modal = document.getElementById('letter-dialog');
    document.getElementById('letter-dialog-form').reset();
    
    // نوێکردنەوەی سەردێڕ و ئایکۆن
    document.getElementById('dialog-title').innerText = getTrans('edit_letter_title');
    document.getElementById('dialog-header-icon').className = 'fas fa-pen';
    
    document.getElementById('letter-id').value = letter.id;
    document.getElementById('letter-title').value = letter.title;
    document.getElementById('letter-number').value = letter.letter_number;
    document.getElementById('letter-type').value = letter.letter_type;
    document.getElementById('letter-date').value = letter.letter_date;
    document.getElementById('letter-notes').value = letter.notes || '';
    
    const currentFileLink = document.getElementById('current-file-link');
    if (letter.document_gdrive_id) {
        currentFileLink.href = `https://drive.google.com/file/d/${letter.document_gdrive_id}/view`;
        currentFileLink.style.display = 'inline-block';
    } else {
        currentFileLink.style.display = 'none';
    }

    document.getElementById('file-name-display').textContent = '';
    document.getElementById('save-dialog-btn').innerHTML = getTrans('update_btn');
    modal.style.display = 'flex';
}

async function fetchLetters() {
    const grid = document.getElementById('letters-grid');
    const noDataMsg = document.getElementById('no-letters-message');
    grid.innerHTML = `<div class="content-loader"><div class="spinner"></div><p>...Loading</p></div>`;

    try {
        let query = supabaseClient
            .from('letters')
            .select('*')
            .order('letter_date', { ascending: false });

        const type = document.getElementById('filter-letter-type').value;
        const startDate = document.getElementById('filter-start-date').value;
        const endDate = document.getElementById('filter-end-date').value;

        if (type) query = query.eq('letter_type', type);
        if (startDate) query = query.gte('letter_date', startDate);
        if (endDate) query = query.lte('letter_date', endDate);

        const { data: letters, error } = await query;

        if (error) throw error;

        grid.innerHTML = '';
        if (letters.length === 0) {
            noDataMsg.style.display = 'block';
        } else {
            noDataMsg.style.display = 'none';
            letters.forEach((letter, index) => {
                const card = createLetterCard(letter);
                card.style.animationDelay = `${index * 50}ms`;
                grid.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error fetching letters:', error);
        grid.innerHTML = `<p style="color:red; text-align:center;">هەڵە لە هێنانی داتا</p>`;
        showToast('هەڵەیەک ڕوویدا', 'error');
    }
}

function createLetterCard(letter) {
    const card = document.createElement('div');
    card.className = 'letter-card'; // بەکارهێنانی کلاسێکی هاوشێوەی leave-card
    card.dataset.id = letter.id;

    const typeConfig = {
        'incoming': { text: getTrans('letter_type_incoming'), icon: 'fa-arrow-down', class: 'incoming' },
        'outgoing': { text: getTrans('letter_type_outgoing'), icon: 'fa-arrow-up', class: 'outgoing' }
    };
    const config = typeConfig[letter.letter_type] || { text: 'نادیار', icon: 'fa-question', class: '' };

    card.innerHTML = `
        <div class="letter-status-line ${config.class}"></div>
        <div class="letter-content">
            <div class="letter-icon ${config.class}">
                <i class="fas ${config.icon}"></i>
            </div>
            <div class="letter-details">
                <h3 title="${letter.title}">${letter.title}</h3>
                <div class="letter-meta">
                    <span class="meta-date"><i class="far fa-calendar-alt"></i> ${letter.letter_date}</span>
                    <span class="meta-type ${config.class}">${config.text}</span>
                </div>
            </div>
        </div>
        <div class="letter-actions">
            <button class="action-btn edit-btn" title="دەستکاری"><i class="fas fa-pen"></i></button>
            <button class="action-btn delete-btn" title="سڕینەوە"><i class="fas fa-trash"></i></button>
        </div>
    `;

    card.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn')) return;
        openViewModal(letter);
    });

    card.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openModalForEdit(letter);
    });
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteLetter(letter.id, letter.document_gdrive_id);
    });

    return card;
}

function openViewModal(letter) {
    const modal = document.getElementById('view-letter-modal');
    
    // Set styles based on type
    const isIncoming = letter.letter_type === 'incoming';
    const typeClass = isIncoming ? 'incoming' : 'outgoing';
    const typeText = isIncoming ? getTrans('letter_type_incoming') : getTrans('letter_type_outgoing');
    const iconClass = isIncoming ? 'fa-arrow-down' : 'fa-arrow-up';

    // Header
    const iconWrapper = document.getElementById('view-header-icon-wrapper');
    iconWrapper.className = `header-icon-wrapper ${typeClass}`;
    document.getElementById('view-header-icon').className = `fas ${iconClass}`;
    
    document.getElementById('view-letter-title').textContent = letter.title;
    
    const badge = document.getElementById('view-letter-type-badge');
    badge.textContent = typeText;
    badge.className = `status-badge ${typeClass}`;

    // پڕکردنەوەی زانیارییەکان
    document.getElementById('view-letter-number').textContent = letter.letter_number;
    document.getElementById('view-letter-date').textContent = letter.letter_date;
    
    const notesElement = document.getElementById('view-letter-notes');
    if (letter.notes) {
        notesElement.textContent = letter.notes;
        notesElement.style.color = 'var(--text-color)';
    } else {
        notesElement.textContent = getTrans('no_notes');
        notesElement.style.color = 'var(--text-color-light)';
    }

    // ڕێکخستنی دوگمەی PDF
    const pdfBtn = document.getElementById('view-pdf-btn');
    pdfBtn.onclick = () => {
        viewDocument(letter.document_gdrive_id);
    };

    modal.style.display = 'flex';
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-dialog-btn');
    const originalBtnText = saveBtn.innerText;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const letterId = document.getElementById('letter-id').value;
    const isEditing = !!letterId;

    try {
        const letterData = {
            title: document.getElementById('letter-title').value,
            letter_number: document.getElementById('letter-number').value,
            letter_type: document.getElementById('letter-type').value,
            letter_date: document.getElementById('letter-date').value,
            notes: document.getElementById('letter-notes').value
        };

        const fileInput = document.getElementById('letter-document');
        const file = fileInput.files[0];

        if (file) {
            if (isEditing) {
                const { data: oldLetter } = await supabaseClient.from('letters').select('document_gdrive_id').eq('id', letterId).single();
                if (oldLetter && oldLetter.document_gdrive_id) {
                    await fetch(GOOGLE_SCRIPT_URL, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'delete', fileId: oldLetter.document_gdrive_id })
                    });
                }
            }
            
            const reader = new FileReader();
            const fileData = await new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ fileName: file.name, mimeType: file.type, fileData: fileData })
            });
            const result = await response.json();

            if (result.status === 'success') {
                letterData.document_gdrive_id = result.id;
            } else {
                throw new Error(`Google Script Error: ${result.message}`);
            }
        }

        if (isEditing) {
            const { error } = await supabaseClient.from('letters').update(letterData).eq('id', letterId);
            if (error) throw error;
            showToast(getTrans('letter_updated_success'), 'success');
        } else {
            const { error } = await supabaseClient.from('letters').insert([letterData]);
            if (error) throw error;
            showToast(getTrans('letter_added_success'), 'success');
        }

        document.getElementById('letter-dialog').style.display = 'none';
        fetchLetters();

    } catch (error) {
        console.error('Error:', error);
        showToast(`هەڵە: ${error.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
    }
}

async function deleteLetter(id, fileId) {
    const confirmModal = document.getElementById('confirm-delete-modal');
    const confirmBtn = document.getElementById('confirm-delete-action-btn');
    confirmModal.style.display = 'flex';

    confirmBtn.onclick = async () => {
        confirmModal.style.display = 'none';
        try {
            if (fileId) {
                try {
                    await fetch(GOOGLE_SCRIPT_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'delete', fileId: fileId })
                    });
                } catch (e) { console.warn('Google Script Error', e); }
            }

            const { error } = await supabaseClient.from('letters').delete().eq('id', id);
            if (error) throw error;

            showToast(getTrans('letter_deleted_success'), 'success');
            const cardToRemove = document.querySelector(`.letter-card[data-id='${id}']`);
            if (cardToRemove) {
                cardToRemove.classList.add('fading-out');
                cardToRemove.addEventListener('animationend', () => {
                    cardToRemove.remove();
                    if (document.getElementById('letters-grid').children.length === 0) {
                        document.getElementById('no-letters-message').style.display = 'block';
                    }
                }, { once: true });
            } else {
                fetchLetters();
            }

        } catch (error) {
            showToast(`هەڵە: ${error.message}`, 'error');
        }
    };
}

function viewDocument(fileId) {
    if (!fileId) {
        showToast(getTrans('no_file_attached'), 'info');
        return;
    }
    window.open(`https://drive.google.com/file/d/${fileId}/view`, '_blank');
}

function updateFileName() {
    const fileInput = document.getElementById('letter-document');
    const display = document.getElementById('file-name-display');
    display.textContent = fileInput.files.length > 0 ? fileInput.files[0].name : '';
}
