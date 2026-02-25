// molat/karasta.js

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
    const addAssetBtn = document.getElementById('add-asset-btn');
    const modal = document.getElementById('asset-dialog');
    const closeDialogBtn = document.getElementById('close-dialog-btn');
    const cancelDialogBtn = document.getElementById('cancel-dialog-btn');
    const assetForm = document.getElementById('asset-dialog-form');
    const searchInput = document.getElementById('search-assets-input');
    
    // Delete Modal
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteActionBtn = document.getElementById('confirm-delete-action-btn');

    // Event Listeners
    addAssetBtn.addEventListener('click', openModalForAdd);
    closeDialogBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    cancelDialogBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) modal.style.display = 'none';
        if (event.target === confirmDeleteModal) confirmDeleteModal.style.display = 'none';
    });

    assetForm.addEventListener('submit', handleFormSubmit);

    // Search
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#assets-table-body tr');
        rows.forEach(row => {
            const name = row.querySelector('td:nth-child(1)').textContent.toLowerCase();
            const spec = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            if (name.includes(searchTerm) || spec.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });

    // Initial Load
    fetchAssets();
    setupRealtimeSubscription();

    cancelDeleteBtn.addEventListener('click', () => { confirmDeleteModal.style.display = 'none'; });
});

function setupRealtimeSubscription() {
    const assetsSubscription = supabaseClient
        .channel('assets_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, (payload) => {
            fetchAssets();
        })
        .subscribe();
        
    window.addEventListener('beforeunload', () => {
        supabaseClient.removeChannel(assetsSubscription);
    });
}

function openModalForAdd() {
    const modal = document.getElementById('asset-dialog');
    document.getElementById('asset-dialog-form').reset();
    document.getElementById('dialog-title').innerText = getTrans('add_asset_title');
    document.getElementById('asset-id').value = '';
    document.getElementById('dialog-header-icon').className = 'fas fa-box-open';
    document.getElementById('save-dialog-btn').innerHTML = getTrans('save_btn');
    modal.style.display = 'flex';
}

function openModalForEdit(asset) {
    const modal = document.getElementById('asset-dialog');
    document.getElementById('asset-dialog-form').reset();
    
    document.getElementById('dialog-title').innerText = getTrans('edit_asset_title');
    document.getElementById('dialog-header-icon').className = 'fas fa-pen';
    
    document.getElementById('asset-id').value = asset.id;
    document.getElementById('asset-name').value = asset.name;
    document.getElementById('asset-spec').value = asset.specification || '';
    document.getElementById('asset-total').value = asset.total_count;
    document.getElementById('asset-active').value = asset.active_count;
    document.getElementById('asset-inactive').value = asset.inactive_count;
    document.getElementById('asset-notes').value = asset.notes || '';
    
    document.getElementById('save-dialog-btn').innerHTML = getTrans('update_btn');
    modal.style.display = 'flex';
}

async function fetchAssets() {
    const tbody = document.getElementById('assets-table-body');
    const noDataMsg = document.getElementById('no-assets-message');
    
    // Simple loading state if needed, or just clear
    tbody.innerHTML = '';

    try {
        let { data: assets, error } = await supabaseClient
            .from('assets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (assets.length === 0) {
            noDataMsg.style.display = 'block';
        } else {
            noDataMsg.style.display = 'none';
            assets.forEach((asset) => {
                const row = createAssetRow(asset);
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error fetching assets:', error);
        showToast('هەڵەیەک ڕوویدا', 'error');
    }
}

function createAssetRow(asset) {
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
        <td><strong>${asset.name}</strong></td>
        <td>${asset.specification || '-'}</td>
        <td class="text-center"><span class="count-badge total">${asset.total_count}</span></td>
        <td class="text-center"><span class="count-badge active">${asset.active_count}</span></td>
        <td class="text-center"><span class="count-badge inactive">${asset.inactive_count}</span></td>
        <td>${asset.notes || '-'}</td>
        <td class="text-center">
            <div class="action-buttons">
                <button class="action-btn edit-btn" title="دەستکاری"><i class="fas fa-pen"></i></button>
                <button class="action-btn delete-btn" title="سڕینەوە"><i class="fas fa-trash"></i></button>
            </div>
        </td>
    `;

    tr.querySelector('.edit-btn').addEventListener('click', () => openModalForEdit(asset));
    tr.querySelector('.delete-btn').addEventListener('click', () => deleteAsset(asset.id));

    return tr;
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-dialog-btn');
    const originalBtnText = saveBtn.innerText;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const assetId = document.getElementById('asset-id').value;
    const isEditing = !!assetId;

    try {
        const assetData = {
            name: document.getElementById('asset-name').value,
            specification: document.getElementById('asset-spec').value,
            total_count: parseInt(document.getElementById('asset-total').value) || 0,
            active_count: parseInt(document.getElementById('asset-active').value) || 0,
            inactive_count: parseInt(document.getElementById('asset-inactive').value) || 0,
            notes: document.getElementById('asset-notes').value
        };

        if (isEditing) {
            const { error } = await supabaseClient.from('assets').update(assetData).eq('id', assetId);
            if (error) throw error;
            showToast(getTrans('asset_updated_success'), 'success');
        } else {
            const { error } = await supabaseClient.from('assets').insert([assetData]);
            if (error) throw error;
            showToast(getTrans('asset_added_success'), 'success');
        }

        document.getElementById('asset-dialog').style.display = 'none';
        fetchAssets();

    } catch (error) {
        console.error('Error:', error);
        showToast(`هەڵە: ${error.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
    }
}

async function deleteAsset(id) {
    const confirmModal = document.getElementById('confirm-delete-modal');
    const confirmBtn = document.getElementById('confirm-delete-action-btn');
    confirmModal.style.display = 'flex';

    confirmBtn.onclick = async () => {
        confirmModal.style.display = 'none';
        try {
            const { error } = await supabaseClient.from('assets').delete().eq('id', id);
            if (error) throw error;

            showToast(getTrans('asset_deleted_success'), 'success');
            fetchAssets();

        } catch (error) {
            showToast(`هەڵە: ${error.message}`, 'error');
        }
    };
}