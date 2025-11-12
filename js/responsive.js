// Responsive handling for the dashboard
class ResponsiveDashboard {
    constructor() {
        this.minWidth = 1024;
        this.minHeight = 600;
        this.resizeTimeout = null;
        this.lastWidth = window.innerWidth;
        this.lastHeight = window.innerHeight;
        this.wasViewportTooSmall = false;

        this.init();
    }

    init() {
        // Initial check
        this.checkViewport();

        // Debounced resize handler
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 150); // 150ms debounce
        });

        // Check viewport on orientation change (mobile)
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.checkViewport(), 200);
        });
    }

    checkViewport() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isTooSmall = width < this.minWidth || height < this.minHeight;

        const warning = document.getElementById('viewport-warning');
        const sizeEl = document.getElementById('current-viewport-size');

        if (isTooSmall) {
            document.body.classList.add('viewport-too-small');
            if (warning) {
                warning.hidden = false;
                if (sizeEl) {
                    sizeEl.textContent = `${width} × ${height}px (min: ${this.minWidth} × ${this.minHeight}px)`;
                }
            }
        } else {
            document.body.classList.remove('viewport-too-small');
            if (warning) warning.hidden = true;
        }

        return !isTooSmall;
    }

    handleResize() {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        const isViewportAcceptable = this.checkViewport();

        // If viewport is too small, mark it and skip redraw
        if (!isViewportAcceptable) {
            this.wasViewportTooSmall = true;
            return;
        }

        // If viewport was too small but now acceptable, force redraw
        if (this.wasViewportTooSmall) {
            console.log('Responsive: Viewport restored to acceptable size, forcing redraw');
            this.wasViewportTooSmall = false;
            this.redrawAllVisualizations();
            this.lastWidth = newWidth;
            this.lastHeight = newHeight;
            return;
        }

        // Only redraw if size actually changed significantly
        const widthDiff = Math.abs(newWidth - this.lastWidth);
        const heightDiff = Math.abs(newHeight - this.lastHeight);

        if (widthDiff < 30 && heightDiff < 30) {
            return;
        }

        console.log('Responsive: Redrawing visualizations due to resize');

        // Redraw all visualizations without animation
        this.redrawAllVisualizations();

        this.lastWidth = newWidth;
        this.lastHeight = newHeight;
    }

    redrawAllVisualizations() {
        // Temporarily disable transitions
        const style = document.createElement('style');
        style.textContent = `
            * {
                transition: none !important;
                animation: none !important;
            }
        `;
        document.head.appendChild(style);

        try {
            // Map
            if (typeof makeMap === 'function') {
                makeMap();
            }

            // Network graph
            if (typeof createNetworkGraph === 'function' && window.globalData) {
                createNetworkGraph('#network-graph .network-wrapper', globalData);
                if (typeof wireGenderButtons === 'function') {
                    wireGenderButtons();
                }

                // Restore network filter state
                if (window.selectedNodes && window.selectedNodes.size > 0) {
                    const allowedSet = new Set(
                        (typeof applyGlobalFilters === 'function' ? applyGlobalFilters(globalData) : globalData)
                            .map(r => r.Proprietario_Nome.trim())
                    );
                    if (typeof updateNetworkStyles === 'function') {
                        updateNetworkStyles(allowedSet);
                    }
                }
            }

            // Treemap
            if (typeof createTreemap === 'function' && window.globalData && window.currentTreemapMode) {
                const filteredData = typeof applyGlobalFilters === 'function'
                    ? applyGlobalFilters(globalData)
                    : globalData;
                createTreemap('#treemap-area', filteredData, currentTreemapMode, null);
            }

            // Catalog
            if (typeof createBooksCatalog === 'function' && window.globalData) {
                const filteredData = typeof applyGlobalFilters === 'function'
                    ? applyGlobalFilters(globalData)
                    : globalData;
                createBooksCatalog(filteredData);
            }

            // Reapply search focus if any
            if (typeof window.reapplySearchFocusIfAny === 'function') {
                window.reapplySearchFocusIfAny();
            }

        } catch (error) {
            console.warn('Responsive: Error during redraw:', error);
        }

        // Re-enable transitions after a short delay
        setTimeout(() => {
            document.head.removeChild(style);
        }, 50);
    }

    // Public method to trigger a manual redraw
    forceRedraw() {
        this.redrawAllVisualizations();
    }
}

// Initialize responsive handling
window.responsiveDashboard = null;

function initResponsiveDashboard() {
    if (!window.responsiveDashboard) {
        window.responsiveDashboard = new ResponsiveDashboard();
    }
}

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResponsiveDashboard);
} else {
    initResponsiveDashboard();
}