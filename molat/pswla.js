// molat/pswla.js
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyRRKI_LIvFM3N31UUHLaaPsrQVhWGETTW6BZU1NfT6CMMXk7MaekNkhPnuHR1IZ546/exec';

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
    const addReceiptBtn = document.getElementById('add-receipt-btn');
    const modal = document.getElementById('receipt-dialog');
    const closeDialogBtn = document.getElementById('close-dialog-btn');
    const cancelDialogBtn = document.getElementById('cancel-dialog-btn');
    const receiptForm = document.getElementById('receipt-dialog-form');
    const fileInput = document.getElementById('receipt-document');
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileNameDisplay = document.getElementById('file-name-display');
    const searchInput = document.getElementById('search-receipts-input');
    
    // Filter & Delete
    const openFilterBtn = document.getElementById('open-filter-modal-btn');
    const filterModal = document.getElementById('filter-modal');
    const closeFilterModalBtn = document.getElementById('close-filter-modal');
    const filterForm = document.getElementById('filter-form');
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteActionBtn = document.getElementById('confirm-delete-action-btn');

    // View Modal Elements
    const viewModal = document.getElementById('view-receipt-modal');
    const closeViewModalBtn = document.getElementById('close-receipt-view-modal');

    // Event Listeners
    addReceiptBtn.addEventListener('click', openModalForAdd);
    closeDialogBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    cancelDialogBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) modal.style.display = 'none';
        if (event.target === filterModal) filterModal.style.display = 'none';
        if (event.target === confirmDeleteModal) confirmDeleteModal.style.display = 'none';
        if (event.target === viewModal) viewModal.style.display = 'none';
    });
    if (closeViewModalBtn) {
        closeViewModalBtn.addEventListener('click', () => { viewModal.style.display = 'none'; });
    }

    receiptForm.addEventListener('submit', handleFormSubmit);

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
        const cards = document.querySelectorAll('.letter-card'); // Reusing letter-card class for style
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
    fetchReceipts();
    setupRealtimeSubscription();

    // Filter
    openFilterBtn.addEventListener('click', () => { filterModal.style.display = 'flex'; });
    closeFilterModalBtn.addEventListener('click', () => { filterModal.style.display = 'none'; });
    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        fetchReceipts();
        filterModal.style.display = 'none';
    });
    resetFilterBtn.addEventListener('click', () => {
        filterForm.reset();
        fetchReceipts();
    });

    cancelDeleteBtn.addEventListener('click', () => { confirmDeleteModal.style.display = 'none'; });
});

function setupRealtimeSubscription() {
    const receiptsSubscription = supabaseClient
        .channel('receipts_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' }, (payload) => {
            fetchReceipts();
        })
        .subscribe();
        
    window.addEventListener('beforeunload', () => {
        supabaseClient.removeChannel(receiptsSubscription);
    });
}

function openModalForAdd() {
    const modal = document.getElementById('receipt-dialog');
    document.getElementById('receipt-dialog-form').reset();
    document.getElementById('dialog-title').innerText = getTrans('add_receipt_title');
    document.getElementById('receipt-id').value = '';
    document.getElementById('dialog-header-icon').className = 'fas fa-plus';
    document.getElementById('file-name-display').textContent = '';
    document.getElementById('current-file-link').style.display = 'none';
    document.getElementById('save-dialog-btn').innerHTML = getTrans('save_btn');
    modal.style.display = 'flex';
}

function openModalForEdit(receipt) {
    const modal = document.getElementById('receipt-dialog');
    document.getElementById('receipt-dialog-form').reset();
    
    document.getElementById('dialog-title').innerText = getTrans('edit_receipt_title');
    document.getElementById('dialog-header-icon').className = 'fas fa-pen';
    
    document.getElementById('receipt-id').value = receipt.id;
    document.getElementById('receipt-type').value = receipt.receipt_type;
    document.getElementById('receipt-date').value = receipt.receipt_date;
    document.getElementById('receiver-name').value = receipt.receiver_name;
    document.getElementById('related-to').value = receipt.related_to;
    document.getElementById('receipt-notes').value = receipt.notes || '';
    
    const currentFileLink = document.getElementById('current-file-link');
    if (receipt.document_gdrive_id) {
        currentFileLink.href = `https://drive.google.com/file/d/${receipt.document_gdrive_id}/view`;
        currentFileLink.style.display = 'inline-block';
    } else {
        currentFileLink.style.display = 'none';
    }

    document.getElementById('file-name-display').textContent = '';
    document.getElementById('save-dialog-btn').innerHTML = getTrans('update_btn');
    modal.style.display = 'flex';
}

async function fetchReceipts() {
    const grid = document.getElementById('receipts-grid');
    const noDataMsg = document.getElementById('no-receipts-message');
    grid.innerHTML = `<div class="content-loader"><div class="spinner"></div><p>...Loading</p></div>`;

    try {
        let query = supabaseClient
            .from('receipts')
            .select('*')
            .order('receipt_date', { ascending: false });

        const type = document.getElementById('filter-receipt-type').value;
        const startDate = document.getElementById('filter-start-date').value;
        const endDate = document.getElementById('filter-end-date').value;

        if (type) query = query.eq('receipt_type', type);
        if (startDate) query = query.gte('receipt_date', startDate);
        if (endDate) query = query.lte('receipt_date', endDate);

        const { data: receipts, error } = await query;

        if (error) throw error;

        grid.innerHTML = '';
        if (receipts.length === 0) {
            noDataMsg.style.display = 'block';
        } else {
            noDataMsg.style.display = 'none';
            receipts.forEach((receipt, index) => {
                const card = createReceiptCard(receipt);
                card.style.animationDelay = `${index * 50}ms`;
                grid.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error fetching receipts:', error);
        grid.innerHTML = `<p style="color:red; text-align:center;">هەڵە لە هێنانی داتا</p>`;
        showToast('هەڵەیەک ڕوویدا', 'error');
    }
}

function createReceiptCard(receipt) {
    const card = document.createElement('div');
    card.className = 'letter-card'; // Reusing letter-card style
    card.dataset.id = receipt.id;

    const typeConfig = {
        'receiving': { text: getTrans('receipt_type_receiving'), icon: 'fa-receipt', class: 'incoming' },
        'handover': { text: getTrans('receipt_type_handover'), icon: 'fa-file-invoice', class: 'outgoing' }
    };
    const config = typeConfig[receipt.receipt_type] || { text: 'نادیار', icon: 'fa-question', class: '' };
    const relatedText = getTrans(`related_to_${receipt.related_to}`) || receipt.related_to;

    card.innerHTML = `
        <div class="letter-status-line ${config.class}"></div>
        <div class="letter-content">
            <div class="letter-icon ${config.class}">
                <i class="fas ${config.icon}"></i>
            </div>
            <div class="letter-details">
                <h3 title="${receipt.receiver_name}">${relatedText}</h3>
                <div class="letter-meta">
                    <span class="meta-date"><i class="far fa-calendar-alt"></i> ${receipt.receipt_date}</span>
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
        openReceiptViewModal(receipt);
    });

    card.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openModalForEdit(receipt);
    });
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteReceipt(receipt.id, receipt.document_gdrive_id);
    });

    return card;
}

function openReceiptViewModal(receipt) {
    const modal = document.getElementById('view-receipt-modal');
    
    // Set styles based on type
    const isReceiving = receipt.receipt_type === 'receiving';
    const typeClass = isReceiving ? 'incoming' : 'outgoing';
    const typeText = isReceiving ? getTrans('receipt_type_receiving') : getTrans('receipt_type_handover');
    const iconClass = isReceiving ? 'fa-receipt' : 'fa-file-invoice';

    // Header
    const iconWrapper = document.getElementById('view-receipt-icon-wrapper');
    iconWrapper.className = `header-icon-wrapper ${typeClass}`;
    document.getElementById('view-receipt-icon').className = `fas ${iconClass}`;
    
    document.getElementById('view-receipt-title').textContent = receipt.receiver_name;
    
    const badge = document.getElementById('view-receipt-type-badge');
    badge.textContent = typeText;
    badge.className = `status-badge ${typeClass}`;

    // Body
    document.getElementById('view-receipt-date').textContent = receipt.receipt_date;
    document.getElementById('view-receipt-related-to').textContent = getTrans(`related_to_${receipt.related_to}`) || receipt.related_to;
    
    const notesElement = document.getElementById('view-receipt-notes');
    if (receipt.notes) {
        notesElement.textContent = receipt.notes;
        notesElement.style.color = 'var(--text-color)';
    } else {
        notesElement.textContent = getTrans('no_notes');
        notesElement.style.color = 'var(--text-color-light)';
    }

    // Footer button
    const pdfBtn = document.getElementById('view-receipt-pdf-btn');
    pdfBtn.onclick = () => {
        viewDocument(receipt.document_gdrive_id);
    };

    modal.style.display = 'flex';
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-dialog-btn');
    const originalBtnText = saveBtn.innerText;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const receiptId = document.getElementById('receipt-id').value;
    const isEditing = !!receiptId;

    try {
        const receiptData = {
            receipt_type: document.getElementById('receipt-type').value,
            receipt_date: document.getElementById('receipt-date').value,
            receiver_name: document.getElementById('receiver-name').value,
            related_to: document.getElementById('related-to').value,
            notes: document.getElementById('receipt-notes').value
        };

        const fileInput = document.getElementById('receipt-document');
        const file = fileInput.files[0];

        if (file) {
            if (isEditing) {
                const { data: oldReceipt } = await supabaseClient.from('receipts').select('document_gdrive_id').eq('id', receiptId).single();
                if (oldReceipt && oldReceipt.document_gdrive_id) {
                    await fetch(GOOGLE_SCRIPT_URL, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'delete', fileId: oldReceipt.document_gdrive_id })
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
                receiptData.document_gdrive_id = result.id;
            } else {
                throw new Error(`Google Script Error: ${result.message}`);
            }
        }

        if (isEditing) {
            const { error } = await supabaseClient.from('receipts').update(receiptData).eq('id', receiptId);
            if (error) throw error;
            showToast(getTrans('receipt_updated_success'), 'success');
        } else {
            const { error } = await supabaseClient.from('receipts').insert([receiptData]);
            if (error) throw error;
            showToast(getTrans('receipt_added_success'), 'success');
        }

        document.getElementById('receipt-dialog').style.display = 'none';
        fetchReceipts();

    } catch (error) {
        console.error('Error:', error);
        showToast(`هەڵە: ${error.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
    }
}

async function deleteReceipt(id, fileId) {
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

            const { error } = await supabaseClient.from('receipts').delete().eq('id', id);
            if (error) throw error;

            showToast(getTrans('receipt_deleted_success'), 'success');
            const cardToRemove = document.querySelector(`.letter-card[data-id='${id}']`);
            if (cardToRemove) {
                cardToRemove.classList.add('fading-out');
                cardToRemove.addEventListener('animationend', () => {
                    cardToRemove.remove();
                    if (document.getElementById('receipts-grid').children.length === 0) {
                        document.getElementById('no-receipts-message').style.display = 'block';
                    }
                }, { once: true });
            } else {
                fetchReceipts();
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
    const fileInput = document.getElementById('receipt-document');
    const display = document.getElementById('file-name-display');
    display.textContent = fileInput.files.length > 0 ? fileInput.files[0].name : '';
}