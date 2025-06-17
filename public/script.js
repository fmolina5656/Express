class AzureDevOpsApp {
    constructor() {
        this.baseUrl = '/api/azure-devops';
        this.init();
    }

    async init() {
        await this.checkHealth();
        await this.loadWorkItemTypes();
        this.setupEventListeners();
    }

    async checkHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            const result = await response.json();
            
            if (result.success) {
                this.showStatus(`✅ Conectado a ${result.organization}/${result.project}`, 'success');
            } else {
                this.showStatus(`❌ Error de conexión: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showStatus(`❌ Error de conexión: ${error.message}`, 'error');
        }
    }

    async loadWorkItemTypes() {
        try {
            const response = await fetch(`${this.baseUrl}/work-item-types`);
            const result = await response.json();
            
            if (result.success) {
                this.populateWorkItemTypeSelects(result.data);
            } else {
                console.error('Error cargando tipos de work items:', result.error);
            }
        } catch (error) {
            console.error('Error cargando tipos de work items:', error);
            }
    }

    populateWorkItemTypeSelects(types) {
        const selects = [
            document.getElementById('workItemType'),
            document.getElementById('viewWorkItemType'),
            document.getElementById('fieldsWorkItemType')
        ];

        selects.forEach(select => {
            // Limpiar opciones existentes (excepto la primera)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }

            // Agregar nuevas opciones
            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type.name;
                option.textContent = type.name;
                select.appendChild(option);
            });
        });
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
    }

    async exportToCSV() {
        const workItemType = document.getElementById('workItemType').value;
        const fileName = document.getElementById('fileName').value;

        if (!workItemType) {
            this.showStatus('❌ Selecciona un tipo de work item', 'error');
            return;
        }

        this.showStatus('⏳ Exportando...', 'loading');
        this.setButtonState('exportForm', true);

        try {
            const response = await fetch(`${this.baseUrl}/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    workItemType,
                    fileName: fileName || undefined
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showStatus(
                    `✅ Exportación completada: ${result.data.recordCount} registros`, 
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
            } else {
                this.showStatus(`❌ Error: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showStatus(`❌ Error: ${error.message}`, 'error');
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
        
        if (workItems.length === 0) {
            container.innerHTML = '<p>No se encontraron work items.</p>';
            return;
        }

        let html = '<div class="work-items-table">';
        html += '<h3>Work Items encontrados:</h3>';
        html += '<table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">';
        html += `
            <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                    <th style="padding: 0.75rem; text-align: left; border: 1px solid #dee2e6;">ID</th>
                    <th style="padding: 0.75rem; text-align: left; border: 1px solid #dee2e6;">Título</th>
                    <th style="padding: 0.75rem; text-align: left; border: 1px solid #dee2e6;">Estado</th>
                    <th style="padding: 0.75rem; text-align: left; border: 1px solid #dee2e6;">Asignado</th>
                    <th style="padding: 0.75rem; text-align: left; border: 1px solid #dee2e6;">Parent ID</th>
                </tr>
            </thead>
            <tbody>
        `;

        workItems.forEach(item => {
            html += `
                <tr style="border-bottom: 1px solid #dee2e6;">
                    <td style="padding: 0.75rem; border: 1px solid #dee2e6;">${item.id}</td>
                    <td style="padding: 0.75rem; border: 1px solid #dee2e6;">${this.escapeHtml(item.title)}</td>
                    <td style="padding: 0.75rem; border: 1px solid #dee2e6;">
                        <span class="badge badge-${this.getStateBadgeClass(item.state)}">${item.state}</span>
                    </td>
                    <td style="padding: 0.75rem; border: 1px solid #dee2e6;">${this.escapeHtml(item.assignedTo || 'No asignado')}</td>
                    <td style="padding: 0.75rem; border: 1px solid #dee2e6;">${item.parentId || 'Sin padre'}</td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
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
    }

    setButtonState(formId, disabled) {
        const form = document.getElementById(formId);
        const button = form.querySelector('button[type="submit"]');
        button.disabled = disabled;
    }
}

// Agregar estilos para badges
const badgeStyles = `
    .badge {
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
    }
    .badge-primary { background: #007bff; color: white; }
    .badge-secondary { background: #6c757d; color: white; }
    .badge-success { background: #28a745; color: white; }
    .badge-warning { background: #ffc107; color: #212529; }
    .badge-info { background: #17a2b8; color: white; }
`;

// Agregar estilos al head
const styleSheet = document.createElement('style');
styleSheet.textContent = badgeStyles;
document.head.appendChild(styleSheet);

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new AzureDevOpsApp();
});