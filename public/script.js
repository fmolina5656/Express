class AzureDevOpsApp {
    constructor() {
        this.baseUrl = '/api/azure-devops';
        this.cache = new Map();
        this.stats = {
            totalWorkItems: 0,
            activeProjects: 1,
            completedToday: 0,
            totalExports: 0
        };
        this.init();
    }

    async init() {
        this.showToast('Iniciando aplicación...', 'info');
        await this.checkHealth();
        await this.loadWorkItemTypes();
        await this.loadStats();
        this.setupEventListeners();
        this.setupSearchDebounce();
    }

    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            const result = await response.json();

            if (result.success) {
                this.showStatus(`✅ Conectado a ${result.organization}/${result.project}`, 'success');
                this.showToast(`Conectado exitosamente a ${result.organization}`, 'success');
            } else {
                this.showStatus(`❌ Error de conexión: ${result.error}`, 'error');
                this.showToast('Error de conexión con Azure DevOps', 'error');
            }
        } catch (error) {
            this.showStatus(`❌ Error de conexión: ${error.message}`, 'error');
            this.showToast('Error de conexión con el servidor', 'error');
        }
    }

    async loadStats() {
        try {
            // Simulate loading stats - in real app you'd fetch from API
            this.updateStatCard('totalWorkItems', this.stats.totalWorkItems);
            this.updateStatCard('activeProjects', this.stats.activeProjects);
            this.updateStatCard('completedToday', this.stats.completedToday);
            this.updateStatCard('totalExports', this.stats.totalExports);
            
            // Update progress bar
            const progressBar = document.getElementById('overallProgress');
            if (progressBar) {
                progressBar.style.width = '75%';
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            element.style.animation = 'none';
            element.offsetHeight; // Trigger reflow
            element.style.animation = 'countUp 0.8s ease-out';
        }
    }

    async loadWorkItemTypes() {
        try {
            const cacheKey = 'workItemTypes';
            let result;

            // Check cache first
            if (this.cache.has(cacheKey)) {
                result = this.cache.get(cacheKey);
            } else {
                const response = await fetch(`${this.baseUrl}/work-item-types`);
                result = await response.json();
                
                if (result.success) {
                    this.cache.set(cacheKey, result);
                }
            }

            if (result.success) {
                this.populateWorkItemTypeSelects(result.data);
                this.showToast('Tipos de work items cargados', 'success');
            } else {
                console.error('Error cargando tipos de work items:', result.error);
                this.showToast('Error cargando tipos de work items', 'error');
            }
        } catch (error) {
            console.error('Error cargando tipos de work items:', error);
            this.showToast('Error de conexión', 'error');
        }
    }

    setupSearchDebounce() {
        const searchInput = document.getElementById('searchTerm');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.filterWorkItems();
                }, 300);
            });
        }
    }

    filterWorkItems() {
        const searchTerm = document.getElementById('searchTerm')?.value.toLowerCase() || '';
        const stateFilter = document.getElementById('stateFilter')?.value || '';
        const assignedFilter = document.getElementById('assignedFilter')?.value || '';
        
        // This would filter the displayed work items
        console.log('Filtering with:', { searchTerm, stateFilter, assignedFilter });
    }
    async generatePresentation() {
        const epicId = document.getElementById('epicId').value;
        const pptFileName = document.getElementById('pptFileName').value;

        if (!epicId) {
            this.showStatus('❌ Epic ID requerido', 'error');
            return;
        }

        this.showStatus('⏳ Generando presentación...', 'loading');
        this.setButtonState('pptForm', true);

        try {
            const response = await fetch(`/api/powerpoint/generate-epic/${epicId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileName: pptFileName || undefined
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showStatus(
                    `✅ Presentación generada: ${result.data.slidesCount} diapositivas`,
                    'success'
                );

                // Crear enlace de descarga
                const downloadLink = document.createElement('a');
                downloadLink.href = result.data.downloadUrl;
                downloadLink.download = result.data.fileName;
                downloadLink.textContent = `📥 Descargar ${result.data.fileName}`;
                downloadLink.className = 'btn btn-primary';
                downloadLink.style.marginLeft = '1rem';

                const statusDiv = document.getElementById('status');
                statusDiv.appendChild(downloadLink);

                document.getElementById('pptResult').innerHTML = `
                <h4>Epic ${result.data.epicId} - Presentación Generada</h4>
                <p>Archivo: ${result.data.fileName}</p>
                <p>Diapositivas: ${result.data.slidesCount}</p>
            `;
            } else {
                this.showStatus(`❌ Error: ${result.error}`, 'error');
                document.getElementById('pptResult').innerHTML = '';
            }
        } catch (error) {
            this.showStatus(`❌ Error: ${error.message}`, 'error');
            document.getElementById('pptResult').innerHTML = '';
        } finally {
            this.setButtonState('pptForm', false);
        }
    }
    populateWorkItemTypeSelects(types) {
        const selects = [
            document.getElementById('workItemType'),
            document.getElementById('viewWorkItemType'),
            document.getElementById('fieldsWorkItemType')
        ];

        selects.forEach(select => {
            if (!select) return;
            
            // Limpiar opciones existentes (excepto la primera)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }

            // Agregar nuevas opciones
            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type.name;
                option.textContent = type.name;
                option.title = type.description || '';
                select.appendChild(option);
            });
        });

        // Also populate assigned filter with unique assignees
        this.populateAssignedFilter();
    }

    async populateAssignedFilter() {
        try {
            // This would typically fetch assignees from your API
            const assignedSelect = document.getElementById('assignedFilter');
            if (assignedSelect) {
                const mockAssignees = ['John Doe', 'Jane Smith', 'Bob Johnson']; // Mock data
                
                mockAssignees.forEach(assignee => {
                    const option = document.createElement('option');
                    option.value = assignee;
                    option.textContent = assignee;
                    assignedSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error populating assignees:', error);
        }
    }

    setupEventListeners() {
        // Formulario de exportación
        document.getElementById('exportForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.exportToCSV();
        });

        // Formulario de visualización
        document.getElementById('viewForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.viewWorkItems();
        });

        // Formulario de campos
        document.getElementById('fieldsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.viewFields();
        });
        document.getElementById('pptForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generatePresentation();
        });

    }

    async exportToCSV() {
        const workItemType = document.getElementById('workItemType').value;
        const fileName = document.getElementById('fileName').value;
        const exportFormat = document.getElementById('exportFormat').value;

        if (!workItemType) {
            this.showStatus('❌ Selecciona un tipo de work item', 'error');
            this.showToast('Por favor selecciona un tipo de work item', 'error');
            return;
        }

        this.showStatus(`<span class="spinner"></span> Exportando a ${exportFormat.toUpperCase()}...`, 'loading');
        this.setButtonState('exportForm', true);

        try {
            const endpoint = exportFormat === 'csv' ? '/export' : `/export-${exportFormat}`;
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    workItemType,
                    fileName: fileName || undefined,
                    format: exportFormat
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showStatus(
                    `✅ Exportación completada: ${result.data.recordCount} registros`,
                    'success'
                );

                this.showToast(
                    `Archivo ${exportFormat.toUpperCase()} generado exitosamente`,
                    'success'
                );

                // Update stats
                this.stats.totalExports++;
                this.updateStatCard('totalExports', this.stats.totalExports);

                // Crear enlace de descarga
                const downloadLink = document.createElement('a');
                downloadLink.href = result.data.downloadUrl;
                downloadLink.download = result.data.fileName;
                downloadLink.textContent = `📥 Descargar ${result.data.fileName}`;
                downloadLink.className = 'btn btn-success';
                downloadLink.style.marginLeft = '1rem';

                const statusDiv = document.getElementById('status');
                statusDiv.appendChild(downloadLink);

                // Auto-remove download link after 30 seconds
                setTimeout(() => {
                    if (downloadLink.parentNode) {
                        downloadLink.parentNode.removeChild(downloadLink);
                    }
                }, 30000);

            } else {
                this.showStatus(`❌ Error: ${result.error}`, 'error');
                this.showToast('Error durante la exportación', 'error');
            }
        } catch (error) {
            this.showStatus(`❌ Error: ${error.message}`, 'error');
            this.showToast('Error de conexión durante la exportación', 'error');
        } finally {
            this.setButtonState('exportForm', false);
        }
    }

    async viewWorkItems() {
        const workItemType = document.getElementById('viewWorkItemType').value;

        if (!workItemType) {
            this.showStatus('❌ Selecciona un tipo de work item', 'error');
            return;
        }

        this.showStatus('⏳ Obteniendo work items...', 'loading');
        this.setButtonState('viewForm', true);

        try {
            const response = await fetch(`${this.baseUrl}/work-items/${encodeURIComponent(workItemType)}`);
            const result = await response.json();

            if (result.success) {
                this.showStatus(`✅ ${result.count} work items encontrados`, 'success');
                this.displayWorkItems(result.data);
            } else {
                this.showStatus(`❌ Error: ${result.error}`, 'error');
                document.getElementById('workItemsResult').innerHTML = '';
            }
        } catch (error) {
            this.showStatus(`❌ Error: ${error.message}`, 'error');
            document.getElementById('workItemsResult').innerHTML = '';
        } finally {
            this.setButtonState('viewForm', false);
        }
    }

    async viewFields() {
        const workItemType = document.getElementById('fieldsWorkItemType').value;

        if (!workItemType) {
            this.showStatus('❌ Selecciona un tipo de work item', 'error');
            return;
        }

        this.showStatus('⏳ Obteniendo campos...', 'loading');
        this.setButtonState('fieldsForm', true);

        try {
            const response = await fetch(`${this.baseUrl}/fields/${encodeURIComponent(workItemType)}`);
            const result = await response.json();

            if (result.success) {
                this.showStatus(`✅ ${result.count} campos encontrados`, 'success');
                this.displayFields(result.data);
            } else {
                this.showStatus(`❌ Error: ${result.error}`, 'error');
                document.getElementById('fieldsResult').innerHTML = '';
            }
        } catch (error) {
            this.showStatus(`❌ Error: ${error.message}`, 'error');
            document.getElementById('fieldsResult').innerHTML = '';
        } finally {
            this.setButtonState('fieldsForm', false);
        }
    }

    displayWorkItems(workItems) {
        const container = document.getElementById('workItemsResult');
        container.classList.remove('hidden');

        if (workItems.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No se encontraron work items.</p>';
            return;
        }

        // Update stats
        this.stats.totalWorkItems = workItems.length;
        this.updateStatCard('totalWorkItems', this.stats.totalWorkItems);

        let html = '<div class="work-items-table">';
        html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">`;
        html += `<h3>Work Items encontrados (${workItems.length})</h3>`;
        html += `<button class="btn btn-primary" onclick="app.exportCurrentView()">📥 Exportar Vista</button>`;
        html += `</div>`;
        html += '<table class="data-table">';
        html += `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Título</th>
                    <th>Estado</th>
                    <th>Asignado</th>
                    <th>Parent ID</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
        `;

        workItems.forEach(item => {
            html += `
                <tr data-id="${item.id}">
                    <td><strong>#${item.id}</strong></td>
                    <td>
                        <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
                            ${this.escapeHtml(item.title)}
                        </div>
                    </td>
                    <td>
                        <span class="badge badge-${this.getStateBadgeClass(item.state)}">${item.state}</span>
                    </td>
                    <td>${this.escapeHtml(item.assignedTo || 'No asignado')}</td>
                    <td>${item.parentId ? `<span class="badge badge-info">#${item.parentId}</span>` : '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="app.viewWorkItemDetails(${item.id})" title="Ver detalles">
                            👁️
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        
        // Add pagination if needed
        if (workItems.length > 10) {
            html += this.createPagination(workItems.length);
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    createPagination(totalItems, itemsPerPage = 10) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) return '';

        let paginationHtml = '<div class="pagination" style="margin-top: 1rem; text-align: center;">';
        
        for (let i = 1; i <= totalPages; i++) {
            paginationHtml += `<button class="btn btn-sm ${i === 1 ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="app.changePage(${i})">${i}</button> `;
        }
        
        paginationHtml += '</div>';
        return paginationHtml;
    }

    async viewWorkItemDetails(workItemId) {
        this.showToast(`Cargando detalles del work item #${workItemId}...`, 'info');
        // This would open a modal with work item details
        console.log('View details for work item:', workItemId);
    }

    changePage(pageNumber) {
        console.log('Change to page:', pageNumber);
        // Implement pagination logic here
    }

    async exportCurrentView() {
        this.showToast('Exportando vista actual...', 'info');
        // This would export the currently filtered/viewed items
    }

    displayFields(fields) {
        const container = document.getElementById('fieldsResult');

        if (fields.length === 0) {
            container.innerHTML = '<p>No se encontraron campos.</p>';
            return;
        }

        let html = '<div class="fields-list">';
        html += '<h3>Campos disponibles:</h3>';
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 0.5rem; margin-top: 1rem;">';

        fields.forEach(field => {
            html += `<div style="padding: 0.5rem; background: #f8f9fa; border-radius: 4px; font-family: monospace; font-size: 0.9rem;">${this.escapeHtml(field)}</div>`;
        });

        html += '</div></div>';
        container.innerHTML = html;
    }

    getStateBadgeClass(state) {
        const stateClasses = {
            'New': 'primary',
            'Active': 'warning',
            'Resolved': 'info',
            'Closed': 'success',
            'Done': 'success',
            'To Do': 'secondary',
            'In Progress': 'warning',
            'Committed': 'info'
        };
        return stateClasses[state] || 'secondary';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('status');
        statusDiv.innerHTML = message;
        statusDiv.className = `status ${type}`;
        statusDiv.classList.remove('hidden');
        
        // Auto-hide status after 10 seconds unless it's an error
        if (type !== 'error') {
            setTimeout(() => {
                statusDiv.classList.add('hidden');
            }, 10000);
        }
    }

    showToast(message, type = 'info', duration = 4000) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span>${this.getToastIcon(type)}</span>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; font-size: 1.2rem; cursor: pointer; margin-left: auto;">×</button>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto-remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    setButtonState(formId, disabled) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const button = form.querySelector('button[type="submit"]');
        if (button) {
            button.disabled = disabled;
            
            // Add loading state
            if (disabled) {
                button.dataset.originalText = button.innerHTML;
                button.innerHTML = '<span class="spinner"></span> Procesando...';
            } else {
                if (button.dataset.originalText) {
                    button.innerHTML = button.dataset.originalText;
                }
            }
        }
    }
}

// Global app instance for onclick handlers
let app;

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    app = new AzureDevOpsApp();
    
    // Add some demo functionality for better UX
    setTimeout(() => {
        if (app.stats.totalWorkItems === 0) {
            // Simulate some stats for demo
            app.stats.totalWorkItems = 143;
            app.stats.completedToday = 8;
            app.stats.totalExports = 12;
            
            app.updateStatCard('totalWorkItems', app.stats.totalWorkItems);
            app.updateStatCard('completedToday', app.stats.completedToday);
            app.updateStatCard('totalExports', app.stats.totalExports);
            
            // Update analytics
            document.getElementById('avgCompletionTime').textContent = '4.2';
            document.getElementById('burndownRate').textContent = '85%';
            document.getElementById('teamVelocity').textContent = '32';
            document.getElementById('defectRate').textContent = '2.1';
        }
    }, 2000);
});