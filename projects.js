document.addEventListener('DOMContentLoaded', () => {
    const filterBtns = document.querySelectorAll('.filter-btn');

    // Filtering logic for constellation view
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            filterBtns.forEach(b => {
                b.style.background = 'var(--glass-bg)';
                b.style.color = 'var(--text-muted)';
                b.style.border = '1px solid var(--glass-border)';
                b.classList.remove('active');
            });
            
            btn.style.background = 'var(--primary)';
            btn.style.color = 'white';
            btn.style.border = 'none';
            btn.classList.add('active');

            // Update constellation filter
            window.constellationFilter = btn.getAttribute('data-filter');
        });
    });
});
