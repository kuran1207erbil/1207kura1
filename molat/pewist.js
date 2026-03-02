// molat/pewist.js
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxlSS8uoA-d8J8KjSDmRhHrqi-rYYecgcJT69-GNjbT5ZkRnhNLGrdoPu2ERCxdeONRlQ/exec';

// Helper function to get translation
function getTrans(key) {
    const lang = localStorage.getItem('language') || 'ku';
    return translations[lang][key] || key;
}

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = '../index.html'; 
        return;
    }

    // UI Elements
    const addFileBtn = document.getElementById('add-file-btn');
    const modal = document.getElementById('file-dialog');
    const closeDialogBtn = document.getElementById('close-dialog-btn');
    const cancelDialogBtn = document.getElementById('cancel-dialog-btn');
    const fileForm = document.getElementById('file-dialog-form');
    const fileInput = document.getElementById('file-document');
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileNameDisplay = document.getElementById('file-name-display');
    const searchInput = document.getElementById('search-files-input');
    
    // Filter & Delete
    const openFilterBtn = document.getElementById('open-filter-modal-btn');
    const filterModal = document.getElementById('filter-modal');
    const closeFilterModalBtn = document.getElementById('close-filter-modal');
    const filterForm = document.getElementById('filter-form');
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteActionBtn = document.getElementById('confirm-delete-action-btn');

    // Event Listeners
    addFileBtn.addEventListener('click', openModalForAdd);
    closeDialogBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    cancelDialogBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) modal.style.display = 'none';
        if (event.target === filterModal) filterModal.style.display = 'none';
        if (event.target === confirmDeleteModal) confirmDeleteModal.style.display = 'none';
    });

    fileForm.addEventListener('submit', handleFormSubmit);

    // Drag and Drop
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

    // Search
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.letter-card');
        cards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            if (title.includes(searchTerm)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });

    // Initial Load
    fetchFiles();
    setupRealtimeSubscription();

    // Filter
    openFilterBtn.addEventListener('click', () => { filterModal.style.display = 'flex'; });
    closeFilterModalBtn.addEventListener('click', () => { filterModal.style.display = 'none'; });
    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        fetchFiles();
        filterModal.style.display = 'none';
    });
    resetFilterBtn.addEventListener('click', () => {
        filterForm.reset();
        // Reset Dropdown UI
        const filterTypeDisplay = document.getElementById('filter-file-type-display');
        filterTypeDisplay.setAttribute('data-lang-key', 'filter_all_types');
        filterTypeDisplay.textContent = getTrans('filter_all_types');
        fetchFiles();
    });

    cancelDeleteBtn.addEventListener('click', () => { confirmDeleteModal.style.display = 'none'; });
});

function setupRealtimeSubscription() {
    const filesSubscription = supabaseClient
        .channel('files_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'files' }, (payload) => {
            fetchFiles();
        })
        .subscribe();
        
    window.addEventListener('beforeunload', () => {
        supabaseClient.removeChannel(filesSubscription);
    });
}

function openModalForAdd() {
    const modal = document.getElementById('file-dialog');
    document.getElementById('file-dialog-form').reset();
    document.getElementById('dialog-title').innerText = getTrans('add_file_title');
    document.getElementById('file-id').value = '';

    // Reset Dropdown
    document.getElementById('file-type').value = 'excel';
    const typeDisplay = document.getElementById('file-type-display');
    typeDisplay.setAttribute('data-lang-key', 'file_type_excel');
    typeDisplay.textContent = getTrans('file_type_excel');

    document.getElementById('dialog-header-icon').className = 'fas fa-plus';
    document.getElementById('file-name-display').textContent = '';
    document.getElementById('current-file-link').style.display = 'none';
    document.getElementById('save-dialog-btn').innerHTML = getTrans('save_btn');
    modal.style.display = 'flex';
}

function openModalForEdit(file) {
    const modal = document.getElementById('file-dialog');
    document.getElementById('file-dialog-form').reset();
    
    document.getElementById('dialog-title').innerText = getTrans('edit_file_title');
    document.getElementById('dialog-header-icon').className = 'fas fa-pen';
    
    document.getElementById('file-id').value = file.id;
    document.getElementById('file-title').value = file.title;
    
    // Set Dropdown Value
    const typeLangKey = `file_type_${file.file_type}`;
    selectCustomOption('file-type', file.file_type, typeLangKey, 'file-type-dropdown');
    
    const currentFileLink = document.getElementById('current-file-link');
    if (file.document_gdrive_id) {
        currentFileLink.href = `https://drive.google.com/file/d/${file.document_gdrive_id}/view`;
        currentFileLink.style.display = 'inline-block';
    } else {
        currentFileLink.style.display = 'none';
    }

    document.getElementById('file-name-display').textContent = '';
    document.getElementById('save-dialog-btn').innerHTML = getTrans('update_btn');
    modal.style.display = 'flex';
}

async function fetchFiles() {
    const grid = document.getElementById('files-grid');
    const noDataMsg = document.getElementById('no-files-message');
    grid.innerHTML = `<div class="content-loader"><div class="spinner"></div><p>...Loading</p></div>`;

    try {
        let query = supabaseClient
            .from('files')
            .select('*')
            .order('created_at', { ascending: false });

        const type = document.getElementById('filter-file-type').value;

        if (type) query = query.eq('file_type', type);

        const { data: files, error } = await query;

        if (error) throw error;

        grid.innerHTML = '';
        if (files.length === 0) {
            noDataMsg.style.display = 'block';
        } else {
            noDataMsg.style.display = 'none';
            files.forEach((file, index) => {
                const card = createFileCard(file);
                card.style.animationDelay = `${index * 50}ms`;
                grid.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error fetching files:', error);
        grid.innerHTML = `<p style="color:red; text-align:center;">هەڵە لە هێنانی داتا</p>`;
        showToast('هەڵەیەک ڕوویدا', 'error');
    }
}

function createFileCard(file) {
    const card = document.createElement('div');
    card.className = 'letter-card'; // Reusing letter-card style
    card.dataset.id = file.id;

    const typeConfig = {
        'excel': { text: getTrans('file_type_excel'), icon: 'fa-file-excel', class: 'excel' },
        'powerpoint': { text: getTrans('file_type_powerpoint'), icon: 'fa-file-powerpoint', class: 'powerpoint' },
        'pdf': { text: getTrans('file_type_pdf'), icon: 'fa-file-pdf', class: 'pdf' },
        'word': { text: getTrans('file_type_word'), icon: 'fa-file-word', class: 'word' }
    };
    const config = typeConfig[file.file_type] || { text: 'نادیار', icon: 'fa-file', class: '' };

    card.innerHTML = `
        <div class="letter-status-line ${config.class}"></div>
        <div class="letter-content">
            <div class="letter-icon file-icon ${config.class}">
                <i class="fas ${config.icon}"></i>
            </div>
            <div class="letter-details">
                <h3 title="${file.title}">${file.title}</h3>
                <div class="letter-meta">
                    <span class="meta-type status-badge ${config.class}">${config.text}</span>
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
        viewDocument(file.document_gdrive_id);
    });

    card.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openModalForEdit(file);
    });
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFile(file.id, file.document_gdrive_id);
    });

    return card;
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-dialog-btn');
    const originalBtnText = saveBtn.innerText;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const fileId = document.getElementById('file-id').value;
    const isEditing = !!fileId;

    try {
        const fileData = {
            title: document.getElementById('file-title').value,
            file_type: document.getElementById('file-type').value,
        };

        const fileInput = document.getElementById('file-document');
        const file = fileInput.files[0];

        if (file) {
            if (isEditing) {
                const { data: oldFile } = await supabaseClient.from('files').select('document_gdrive_id').eq('id', fileId).single();
                if (oldFile && oldFile.document_gdrive_id) {
                    await fetch(GOOGLE_SCRIPT_URL, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'delete', fileId: oldFile.document_gdrive_id })
                    });
                }
            }
            
            const reader = new FileReader();
            const fileDataContent = await new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ fileName: file.name, mimeType: file.type, fileData: fileDataContent })
            });
            const result = await response.json();

            if (result.status === 'success') {
                fileData.document_gdrive_id = result.id;
            } else {
                throw new Error(`Google Script Error: ${result.message}`);
            }
        }

        if (isEditing) {
            const { error } = await supabaseClient.from('files').update(fileData).eq('id', fileId);
            if (error) throw error;
            showToast(getTrans('file_updated_success'), 'success');
        } else {
            const { error } = await supabaseClient.from('files').insert([fileData]);
            if (error) throw error;
            showToast(getTrans('file_added_success'), 'success');
        }

        document.getElementById('file-dialog').style.display = 'none';
        fetchFiles();

    } catch (error) {
        console.error('Error:', error);
        showToast(`هەڵە: ${error.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
    }
}

async function deleteFile(id, fileId) {
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

            const { error } = await supabaseClient.from('files').delete().eq('id', id);
            if (error) throw error;

            showToast(getTrans('file_deleted_success'), 'success');
            const cardToRemove = document.querySelector(`.letter-card[data-id='${id}']`);
            if (cardToRemove) {
                cardToRemove.classList.add('fading-out');
                cardToRemove.addEventListener('animationend', () => {
                    cardToRemove.remove();
                    if (document.getElementById('files-grid').children.length === 0) {
                        document.getElementById('no-files-message').style.display = 'block';
                    }
                }, { once: true });
            } else {
                fetchFiles();
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
    const fileInput = document.getElementById('file-document');
    const display = document.getElementById('file-name-display');
    display.textContent = fileInput.files.length > 0 ? fileInput.files[0].name : '';
}