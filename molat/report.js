// molat/report.js

// Helper function to get translation
function getTrans(key) {
    const lang = localStorage.getItem('language') || 'ku';
    return translations[lang][key] || key;
}

// گۆڕاوی گشتی بۆ هەڵگرتنی داتای مۆڵەتەکان بۆ خشتەی پوختە
let currentLeavesData = [];

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = '../index.html'; 
        return;
    }

    // New event listeners for date filter
    const openFilterBtn = document.getElementById('open-filter-modal-btn');
    const filterModal = document.getElementById('filter-modal');
    const closeFilterModalBtn = document.getElementById('close-filter-modal');
    const filterForm = document.getElementById('filter-form');
    const resetFilterBtn = document.getElementById('reset-report-filter');
    // Summary Modal Elements
    const openSummaryBtn = document.getElementById('open-summary-btn');
    const summaryModal = document.getElementById('summary-modal');
    const closeSummaryModalBtn = document.getElementById('close-summary-modal');

    openFilterBtn.addEventListener('click', () => { filterModal.style.display = 'flex'; });
    closeFilterModalBtn.addEventListener('click', () => { filterModal.style.display = 'none'; });
    window.addEventListener('click', (e) => { if (e.target === filterModal) filterModal.style.display = 'none'; });

    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const startDate = document.getElementById('report-start-date').value;
        const endDate = document.getElementById('report-end-date').value;
        fetchReportData(startDate, endDate);
        filterModal.style.display = 'none';
    });

    resetFilterBtn.addEventListener('click', () => {
        filterForm.reset();
        fetchReportData(); // Fetch all data
        filterModal.style.display = 'none';
    });

    // Summary Modal Events
    openSummaryBtn.addEventListener('click', () => {
        renderSummaryTable();
        summaryModal.style.display = 'flex';
    });
    closeSummaryModalBtn.addEventListener('click', () => {
        summaryModal.style.display = 'none';
    });

    fetchReportData(); // Initial load
});

async function fetchReportData(startDate, endDate) {
    // Clear existing charts to prevent them from stacking on re-render
    const leavesChartCanvas = document.getElementById('leavesChart');
    const assetsChartCanvas = document.getElementById('assetsChart');
    
    // Destroy existing charts if they exist
    const existingLeavesChart = Chart.getChart(leavesChartCanvas);
    if (existingLeavesChart) {
        existingLeavesChart.destroy();
    }
    const existingAssetsChart = Chart.getChart(assetsChartCanvas);
    if (existingAssetsChart) {
        existingAssetsChart.destroy();
    }

    try {
        // Build queries
        let leavesQuery = supabaseClient.from('leaves').select('leave_type, leave_date, employees(full_name)');
        let lettersQuery = supabaseClient.from('letters').select('id', { count: 'exact', head: true });
        
        // Employees and Assets are not date-dependent in this context, so their queries remain the same.
        const employeesQuery = supabaseClient.from('employees').select('id', { count: 'exact', head: true });
        const assetsQuery = supabaseClient.from('assets').select('active_count, inactive_count');

        // Apply date filters if they exist
        if (startDate) {
            leavesQuery = leavesQuery.gte('leave_date', startDate);
            lettersQuery = lettersQuery.gte('letter_date', startDate);
        }
        if (endDate) {
            leavesQuery = leavesQuery.lte('leave_date', endDate);
            lettersQuery = lettersQuery.lte('letter_date', endDate);
        }

        const [employees, leaves, letters, assets] = await Promise.all([
            employeesQuery, leavesQuery, lettersQuery, assetsQuery
        ]);

        // Store leaves data for summary table
        currentLeavesData = leaves.data;

        // Update Summary Cards
        animateValue('count-employees', 0, employees.count || 0, 1000);
        animateValue('count-leaves', 0, leaves.data.length || 0, 1000);
        animateValue('count-letters', 0, letters.count || 0, 1000);
        animateValue('count-assets', 0, assets.data.reduce((acc, curr) => acc + curr.active_count + curr.inactive_count, 0), 1000);

        // Prepare Data for Charts
        renderLeavesChart(leaves.data);
        renderAssetsChart(assets.data);

    } catch (error) {
        console.error('Error fetching report data:', error);
    }
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function renderLeavesChart(leavesData) {
    const ctx = document.getElementById('leavesChart').getContext('2d');
    
    // Count occurrences of each leave type
    const counts = {};
    leavesData.forEach(l => {
        counts[l.leave_type] = (counts[l.leave_type] || 0) + 1;
    });

    const labels = Object.keys(counts).map(key => {
        // Map keys to translated labels
        const mapping = {
            'daily': getTrans('leave_type_daily'),
            'hourly': getTrans('leave_type_hourly'),
            'disease': getTrans('leave_type_disease'),
            'motherhood': getTrans('leave_type_motherhood'),
            'long-term': getTrans('leave_type_long_term'),
            'travel': getTrans('leave_type_travel')
        };
        return mapping[key] || key;
    });

    const data = Object.values(counts);

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#f39c12', // Daily - Orange
                    '#3498db', // Hourly - Blue
                    '#e74c3c', // Disease - Red
                    '#9b59b6', // Motherhood - Purple
                    '#34495e', // Long-term - Dark Blue
                    '#1abc9c'  // Travel - Teal
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'left', // Move legend to side for compactness
                    labels: {
                        font: { family: 'Noto Kufi Arabic' },
                        color: getComputedStyle(document.body).getPropertyValue('--text-color'),
                        boxWidth: 12, // Smaller color box
                        padding: 10
                    }
                }
            }
        }
    });
}

/**
 * دروستکردن و پیشاندانی خشتەی پوختەی مۆڵەتەکان
 */
function renderSummaryTable() {
    const tbody = document.getElementById('summary-table-body');
    tbody.innerHTML = '';
    
    const summary = {};
    
    // کۆکردنەوەی داتا بەپێی فەرمانبەر
    currentLeavesData.forEach(leave => {
        const name = leave.employees?.full_name || getTrans('employee_name_not_found');
        if (!summary[name]) {
            summary[name] = { total: 0, daily: 0, hourly: 0, disease: 0, motherhood: 0, 'long-term': 0, travel: 0 };
        }
        summary[name].total++;
        if (summary[name][leave.leave_type] !== undefined) {
            summary[name][leave.leave_type]++;
        }
    });

    // دروستکردنی ڕیزەکان
    Object.keys(summary).forEach(name => {
        const data = summary[name];
        const row = `<tr>
            <td><strong>${name}</strong></td>
            <td class="text-center"><span class="count-badge total">${data.total}</span></td>
            <td class="text-center">${data.daily || '-'}</td>
            <td class="text-center">${data.hourly || '-'}</td>
            <td class="text-center">${data.disease || '-'}</td>
            <td class="text-center">${data.motherhood || '-'}</td>
            <td class="text-center">${data['long-term'] || '-'}</td>
            <td class="text-center">${data.travel || '-'}</td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

function renderAssetsChart(assetsData) {
    const ctx = document.getElementById('assetsChart').getContext('2d');
    
    let active = 0;
    let inactive = 0;

    assetsData.forEach(a => {
        active += a.active_count;
        inactive += a.inactive_count;
    });

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [getTrans('asset_active'), getTrans('asset_inactive')],
            datasets: [{
                data: [active, inactive],
                backgroundColor: [
                    '#2ecc71', // Active - Green
                    '#e74c3c'  // Inactive - Red
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'left', // Move legend to side
                    labels: {
                        font: { family: 'Noto Kufi Arabic' },
                        color: getComputedStyle(document.body).getPropertyValue('--text-color'),
                        boxWidth: 12,
                        padding: 10
                    }
                }
            }
        }
    });
}