const PptxGenJS = require('pptxgenjs');
const path = require('path');
const fs = require('fs').promises;

class PowerPointService {
    constructor(azureDevOpsService) {
        this.azureService = azureDevOpsService;
    }

    async generateEpicPresentation(epicId, fileName) {
        try {
            // Crear nueva presentación
            const pptx = new PptxGenJS();
            
            // Configurar propiedades de la presentación
            pptx.author = 'Azure DevOps Exporter';
            pptx.company = 'Tu Empresa';
            pptx.subject = `Epic ${epicId} Status Report`;
            pptx.title = `Epic ${epicId} - Status Report`;
            
            // Configurar tema corporativo
            pptx.layout = 'LAYOUT_16x9';
            
            // Definir colores corporativos
            this.colors = {
                primary: '2F4F8F',      // Azul corporativo
                secondary: '4A90E2',    // Azul claro
                accent: 'F39C12',       // Naranja para acentos
                success: '27AE60',      // Verde
                warning: 'E67E22',      // Naranja oscuro
                danger: 'E74C3C',       // Rojo
                text: '2C3E50',         // Gris oscuro
                lightGray: 'ECF0F1',    // Gris claro
                white: 'FFFFFF'
            };

            // Obtener datos del Epic y elementos relacionados
            const epicData = await this.getEpicCompleteData(epicId);

            // Debug: Log available fields for troubleshooting
            console.log('Epic ID:', epicId);
            console.log('Available Epic fields:');
            if (epicData.epic && epicData.epic.fields) {
                console.log(Object.keys(epicData.epic.fields).sort());
            } else {
                console.log('No fields found in epic data');
                console.log('Epic data structure:', epicData.epic);
            }

            // Crear diapositivas
            this.createTitleSlide(pptx, epicData.epic);
            this.createOverviewSlide(pptx, epicData.epic);
            this.createProgressSlide(pptx, epicData.epic, epicData.userStories, epicData.tasks);
            this.createBudgetSlide(pptx, epicData.epic);
            this.createClientInfoSlide(pptx, epicData.epic);
            this.createDatesSlide(pptx, epicData.epic);
            this.createOdooIntegrationSlide(pptx, epicData.epic);
            
            // Agregar slide con campos disponibles para debugging (opcional - remover en producción)
            // this.createFieldsDebugSlide(pptx, epicData.epic);
            
            if (epicData.risks.length > 0) {
                this.createRisksSlide(pptx, epicData.risks);
            }
            
            if (epicData.impediments.length > 0) {
                this.createImpedimentsSlide(pptx, epicData.impediments);
            }

            // Guardar archivo
            const outputDir = path.join(__dirname, '../../downloads');
            await fs.mkdir(outputDir, { recursive: true });
            
            const filePath = path.join(outputDir, fileName);
            await pptx.writeFile({ fileName: filePath });

            return {
                fileName: fileName,
                filePath: filePath,
                epicId: epicId,
                slidesCount: pptx.slides.length
            };

        } catch (error) {
            throw new Error(`Error generando presentación: ${error.message}`);
        }
    }

    createFieldsDebugSlide(pptx, epic) {
        const slide = pptx.addSlide();
        
        slide.addText('Available Fields (Debug)', {
            x: 0.5, y: 0.5, w: 9, h: 0.7,
            fontSize: 28, bold: true, color: '2f4f8f'
        });

        if (epic && epic.fields) {
            const fields = Object.keys(epic.fields).sort();
            const fieldsText = fields.slice(0, 20).join('\n'); // First 20 fields
            
            slide.addText(fieldsText, {
                x: 0.5, y: 1.5, w: 9, h: 5,
                fontSize: 10, color: '333333',
                valign: 'top'
            });

            if (fields.length > 20) {
                slide.addText(`... and ${fields.length - 20} more fields`, {
                    x: 0.5, y: 6.5, w: 9, h: 0.5,
                    fontSize: 12, color: '666666',
                    italic: true
                });
            }
        } else {
            slide.addText('No fields available in epic data', {
                x: 0.5, y: 2, w: 9, h: 1,
                fontSize: 16, color: 'ff0000'
            });
        }
    }

    async getEpicCompleteData(epicId) {
        // Obtener Epic principal
        const epic = await this.azureService.getWorkItemById(epicId);
        
        // Obtener User Stories del Epic
        const userStories = await this.azureService.getChildWorkItems(epicId, 'User Story');
        
        // Obtener Tasks de las User Stories
        let tasks = [];
        for (const userStory of userStories) {
            const userStoryTasks = await this.azureService.getChildWorkItems(userStory.id, 'Task');
            tasks = tasks.concat(userStoryTasks);
        }

        // Obtener Risks del Epic
        const risks = await this.azureService.getChildWorkItems(epicId, 'Risk');
        
        // Obtener Impediments del Epic
        const impediments = await this.azureService.getChildWorkItems(epicId, 'Impediment');

        return {
            epic,
            userStories,
            tasks,
            risks,
            impediments
        };
    }

    createTitleSlide(pptx, epic) {
        const slide = pptx.addSlide();
        
        try {
            // Título principal del Epic
            slide.addText(`EPIC ${epic.id}`, {
                x: 1, y: 1.5, w: 8, h: 1,
                fontSize: 36, bold: true, color: this.colors.primary
            });

            // Título del Epic
            const title = this.azureService.getFieldValue(epic, 'System.Title') || 'No Title';
            slide.addText(title, {
                x: 1, y: 2.8, w: 8, h: 1,
                fontSize: 20, color: this.colors.text
            });

            // Estado del Epic
            const state = this.azureService.getFieldValue(epic, 'System.State') || 'Unknown';
            slide.addText(`Status: ${state}`, {
                x: 1, y: 3.8, w: 4, h: 0.6,
                fontSize: 16, bold: true, color: this.colors.secondary
            });

            // Cliente
            const client = this.azureService.getFieldValue(epic, 'Custom.Client') || 'N/A';
            slide.addText(`Client: ${client}`, {
                x: 1, y: 4.4, w: 4, h: 0.6,
                fontSize: 16, color: this.colors.text
            });

            // Asignado a
            const assignedTo = this.azureService.getFieldValue(epic, 'System.AssignedTo');
            const assignedToName = assignedTo?.displayName || assignedTo?.uniqueName || assignedTo || 'Not assigned';
            slide.addText(`Assigned to: ${assignedToName}`, {
                x: 1, y: 5.0, w: 4, h: 0.6,
                fontSize: 16, color: this.colors.text
            });

            // Línea decorativa
            slide.addShape('rect', {
                x: 1, y: 6, w: 8, h: 0.1,
                fill: this.colors.accent
            });

        } catch (error) {
            console.error('Error in createTitleSlide:', error);
            console.error('Epic data:', epic);
            // Fallback simple
            slide.addText('EPIC PRESENTATION - Error loading data', {
                x: 1, y: 3, w: 8, h: 1,
                fontSize: 24, color: this.colors.danger
            });
        }
    }


    createOverviewSlide(pptx, epic) {
        const slide = pptx.addSlide();
        
        try {
            // Header de la slide
            this.addSlideHeader(slide, 'Project Overview', 'Epic details and project information');

            // Epic Name
            const epicName = this.azureService.getFieldValue(epic, 'Custom.EpicName') || 'N/A';
            slide.addText(`Epic Name: ${epicName}`, {
                x: 1, y: 2, w: 8, h: 0.6,
                fontSize: 16, bold: true, color: this.colors.text
            });

            // Cliente
            const client = this.azureService.getFieldValue(epic, 'Custom.Client') || 'N/A';
            slide.addText(`Client: ${client}`, {
                x: 1, y: 2.7, w: 8, h: 0.6,
                fontSize: 14, color: this.colors.text
            });

            // Asignado a
            const assignedTo = this.azureService.getFieldValue(epic, 'System.AssignedTo');
            const assignedToName = assignedTo?.displayName || assignedTo?.uniqueName || assignedTo || 'Not assigned';
            slide.addText(`Assigned to: ${assignedToName}`, {
                x: 1, y: 3.4, w: 8, h: 0.6,
                fontSize: 14, color: this.colors.text
            });

            // Descripción (limpiando HTML)
            const description = this.azureService.getFieldValue(epic, 'System.Description') || 'No description available';
            const cleanDescription = this.cleanHtmlText(description);
            slide.addText(`Description: ${this.truncateText(cleanDescription, 200)}`, {
                x: 1, y: 4.1, w: 8, h: 1.2,
                fontSize: 12, color: this.colors.text
            });

            // Iteration Path
            const iterationPath = this.azureService.getFieldValue(epic, 'System.IterationPath') || 'N/A';
            slide.addText(`Iteration: ${iterationPath}`, {
                x: 1, y: 5.5, w: 8, h: 0.6,
                fontSize: 12, color: this.colors.secondary
            });

        } catch (error) {
            console.error('Error in createOverviewSlide:', error);
            slide.addText('Project Overview - Error loading data', {
                x: 1, y: 3, w: 8, h: 1,
                fontSize: 18, color: this.colors.danger
            });
        }
    }

    createProgressSlide(pptx, epic, userStories, tasks) {
        const slide = pptx.addSlide();
        
        try {
            // Header de la slide
            this.addSlideHeader(slide, 'Progress Summary', 'User Stories and Tasks progress tracking');

            // Estadísticas generales
            const stats = this.calculateProgressStats(userStories, tasks);
            
            // Métricas principales
            slide.addText(`User Stories: ${stats.userStories.total}`, {
                x: 1, y: 2, w: 4, h: 0.6,
                fontSize: 16, bold: true, color: this.colors.text
            });

            slide.addText(`Tasks: ${stats.tasks.total}`, {
                x: 5, y: 2, w: 4, h: 0.6,
                fontSize: 16, bold: true, color: this.colors.text
            });

            // Progress bars visuales
            this.createProgressChart(slide, stats, pptx);

            // Tabla de resumen de estados
            const tableData = [
                ['Type', 'New', 'Active/In Progress', 'Done', 'Total']
            ];

            tableData.push([
                'User Stories',
                stats.userStories.new.toString(),
                stats.userStories.active.toString(),
                stats.userStories.done.toString(),
                stats.userStories.total.toString()
            ]);

            tableData.push([
                'Tasks',
                stats.tasks.toDo.toString(),
                stats.tasks.inProgress.toString(),
                stats.tasks.done.toString(),
                stats.tasks.total.toString()
            ]);

            slide.addTable(tableData, {
                x: 1, y: 4.2, w: 8, h: 1.8,
                fontSize: 11,
                color: this.colors.text,
                fill: { color: this.colors.lightGray },
                border: { type: 'solid', color: this.colors.primary }
            });

        } catch (error) {
            console.error('Error in createProgressSlide:', error);
            slide.addText('Progress Summary - Error loading data', {
                x: 1, y: 3, w: 8, h: 1,
                fontSize: 18, color: this.colors.danger
            });
        }
    }

    createBudgetSlide(pptx, epic) {
        const slide = pptx.addSlide();
        
        try {
            this.addSlideHeader(slide, 'Work Tracking & Change Requests', 'Effort analysis and change request management');

            // Usar campos específicos de tu organización
            const completedTotal = this.azureService.getFieldValue(epic, 'Custom.CompletedTotal', '0');
            const remainingTotal = this.azureService.getFieldValue(epic, 'Custom.RemainingTotal', '0');
            const effortTotal = this.azureService.getFieldValue(epic, 'Custom.EffortTotal', '0');
            const effortRealTotal = this.azureService.getFieldValue(epic, 'Custom.EffortRealTotal', '0');
            const rework = this.azureService.getFieldValue(epic, 'Custom.Rework', '0');

            // Panel de Effort Tracking
            this.createDataPanel(slide, 'Effort Tracking', [
                { label: 'Effort Total', value: `${effortTotal} hours` },
                { label: 'Real Effort Total', value: `${effortRealTotal} hours`, highlight: true },
                { label: 'Completed Total', value: `${completedTotal} hours` },
                { label: 'Remaining Total', value: `${remainingTotal} hours` },
                { label: 'Rework', value: `${rework} hours` }
            ], 0.5, 1.8, 4.5, this.colors.primary);

            // Panel de Change Requests
            this.createDataPanel(slide, 'Change Requests', [
                { label: 'Total Requests', value: this.azureService.getFieldValue(epic, 'Custom.TotalChangeRequest', '0') },
                { label: 'Completed', value: this.azureService.getFieldValue(epic, 'Custom.CompletedChangeRequest', '0'), highlight: true },
                { label: 'Remaining', value: this.azureService.getFieldValue(epic, 'Custom.RemainingChangeRequest', '0') }
            ], 5.2, 1.8, 4.3, this.colors.warning);

            // Métricas visuales en la parte inferior
            const totalEffort = parseFloat(effortTotal) || 0;
            const realEffort = parseFloat(effortRealTotal) || 0;
            const variance = totalEffort > 0 ? ((realEffort - totalEffort) / totalEffort * 100).toFixed(1) : '0';
            
            this.createMetricCard(slide, 'Effort Variance', `${variance}%`, variance > 0 ? 'over' : 'under', 2, 5.2, variance > 0 ? this.colors.danger : this.colors.success);
            this.createMetricCard(slide, 'Completion Rate', completedTotal && effortTotal ? `${((parseFloat(completedTotal) / parseFloat(effortTotal)) * 100).toFixed(1)}%` : '0%', '', 6, 5.2, this.colors.success);

        } catch (error) {
            console.error('Error in createBudgetSlide:', error);
            slide.addText('Budget & Tracking - Error loading data', {
                x: 1, y: 3, w: 8, h: 1,
                fontSize: 18, color: this.colors.danger
            });
        }
    }

    createClientInfoSlide(pptx, epic) {
        const slide = pptx.addSlide();
        
        try {
            this.addSlideHeader(slide, 'Epic Information', 'Detailed epic information and metadata');

            // Usar campos reales y disponibles del Epic
            const createdBy = this.azureService.getFieldValue(epic, 'System.CreatedBy');
            const changedBy = this.azureService.getFieldValue(epic, 'System.ChangedBy');

            // Limpiar HTML en la descripción
            const rawDescription = this.azureService.getFieldValue(epic, 'System.Description', 'No description available');
            const cleanDescription = this.cleanHtmlText(rawDescription);
            
            const epicInfo = [
                `Epic Title: ${this.azureService.getFieldValue(epic, 'System.Title', 'N/A')}`,
                `Description: ${this.truncateText(cleanDescription, 100)}`,
                `Created By: ${createdBy?.displayName || createdBy?.uniqueName || createdBy || 'Unknown'}`,
                `Changed By: ${changedBy?.displayName || changedBy?.uniqueName || changedBy || 'Unknown'}`,
                `Iteration Path: ${this.azureService.getFieldValue(epic, 'System.IterationPath', 'N/A')}`,
                `Reason: ${this.azureService.getFieldValue(epic, 'System.Reason', 'N/A')}`
            ];

            epicInfo.forEach((text, index) => {
                slide.addText(text, {
                    x: 1, y: 2 + (index * 0.5), w: 8, h: 0.4,
                    fontSize: 12, color: this.colors.text
                });
            });

        } catch (error) {
            console.error('Error in createClientInfoSlide:', error);
            slide.addText('Epic Information - Error loading data', {
                x: 1, y: 3, w: 8, h: 1,
                fontSize: 18, color: this.colors.danger
            });
        }
    }

    createDatesSlide(pptx, epic) {
        const slide = pptx.addSlide();
        
        try {
            this.addSlideHeader(slide, 'Timeline & Milestones', 'Project timeline and key milestone tracking');

            // Timeline visual
            this.createTimeline(slide, epic);

            // Panel de fechas importantes
            this.createDataPanel(slide, 'Key Dates', [
                { label: 'Created', value: this.azureService.formatDate(this.azureService.getFieldValue(epic, 'System.CreatedDate')) },
                { label: 'Request Date', value: this.azureService.formatDate(this.azureService.getFieldValue(epic, 'Custom.RequestDate')) },
                { label: 'Pre-Kick Off', value: this.azureService.formatDate(this.azureService.getFieldValue(epic, 'Custom.PreKickOffDate')) },
                { label: 'Kick Off', value: this.azureService.formatDate(this.azureService.getFieldValue(epic, 'Custom.KickOffDate')), highlight: true }
            ], 5.5, 1.8, 4, this.colors.primary);

            // Panel de fechas target
            this.createDataPanel(slide, 'Target Dates', [
                { label: 'Start Date', value: this.azureService.formatDate(this.azureService.getFieldValue(epic, 'Microsoft.VSTS.Scheduling.StartDate')) },
                { label: 'Target Date', value: this.azureService.formatDate(this.azureService.getFieldValue(epic, 'Microsoft.VSTS.Scheduling.TargetDate')), highlight: true },
                { label: 'Original Target', value: this.azureService.formatDate(this.azureService.getFieldValue(epic, 'Custom.OriginalTargetDate')) },
                { label: 'State Change', value: this.azureService.formatDate(this.azureService.getFieldValue(epic, 'Microsoft.VSTS.Common.StateChangeDate')) }
            ], 5.5, 4.5, 4, this.colors.accent);

        } catch (error) {
            console.error('Error in createDatesSlide:', error);
            slide.addText('Timeline & Milestones - Error loading data', {
                x: 1, y: 3, w: 8, h: 1,
                fontSize: 18, color: this.colors.danger
            });
        }
    }

    createTimeline(slide, epic) {
        // Línea de tiempo horizontal simplificada
        slide.addShape('rect', {
            x: 0.5, y: 3.5, w: 4.5, h: 0.1,
            fill: this.colors.primary
        });

        // Puntos en la timeline
        const timelineEvents = [
            { name: 'Created', date: this.azureService.getFieldValue(epic, 'System.CreatedDate'), x: 0.8 },
            { name: 'Request', date: this.azureService.getFieldValue(epic, 'Custom.RequestDate'), x: 2 },
            { name: 'Kick Off', date: this.azureService.getFieldValue(epic, 'Custom.KickOffDate'), x: 3.2 },
            { name: 'Target', date: this.azureService.getFieldValue(epic, 'Microsoft.VSTS.Scheduling.TargetDate'), x: 4.4 }
        ];

        timelineEvents.forEach(event => {
            if (event.date) {
                // Punto en la timeline
                slide.addShape('ellipse', {
                    x: event.x - 0.1, y: 3.4, w: 0.2, h: 0.2,
                    fill: this.colors.accent
                });

                // Etiqueta del evento
                slide.addText(event.name, {
                    x: event.x - 0.3, y: 2.9, w: 0.6, h: 0.3,
                    fontSize: 10, bold: true, color: this.colors.text,
                    align: 'center'
                });

                // Fecha
                slide.addText(this.azureService.formatDate(event.date), {
                    x: event.x - 0.4, y: 3.8, w: 0.8, h: 0.3,
                    fontSize: 9, color: this.colors.text,
                    align: 'center'
                });
            }
        });
    }

    createOdooIntegrationSlide(pptx, epic) {
        const slide = pptx.addSlide();
        
        try {
            this.addSlideHeader(slide, 'Integration & Business Details', 'Odoo integration and business requirements');

            // Panel de Odoo Integration (limpiando HTML en comentarios)
            const rawComments = this.azureService.getFieldValue(epic, 'Custom.Calendarcomments', 'None');
            const cleanComments = this.cleanHtmlText(rawComments);
            
            this.createDataPanel(slide, 'Odoo Integration', [
                { label: 'Odoo ID', value: this.azureService.getFieldValue(epic, 'Custom.IDOdoo', 'N/A'), highlight: true },
                { label: 'Odoo Link', value: this.truncateText(this.azureService.getFieldValue(epic, 'Custom.LinkOdoo', 'N/A'), 25) },
                { label: 'Calendar Comments', value: this.truncateText(cleanComments, 25) }
            ], 0.5, 1.8, 4.5, this.colors.info);

            // Panel de Business Value
            this.createDataPanel(slide, 'Business Value', [
                { label: 'Value Area', value: this.azureService.getFieldValue(epic, 'Microsoft.VSTS.Common.ValueArea', 'Business') },
                { label: 'Activity', value: this.azureService.getFieldValue(epic, 'Microsoft.VSTS.Common.Activity', 'N/A') },
                { label: 'Backlog Priority', value: this.azureService.getFieldValue(epic, 'Microsoft.VSTS.Common.BacklogPriority', 'N/A'), highlight: true }
            ], 5.2, 1.8, 4.3, this.colors.accent);

            // Panel de Acceptance Criteria y Milestones (limpiando HTML)
            const rawCriteria = this.azureService.getFieldValue(epic, 'Microsoft.VSTS.Common.AcceptanceCriteria', 'None');
            const cleanCriteria = this.cleanHtmlText(rawCriteria);
            const rawMilestones = this.azureService.getFieldValue(epic, 'Custom.Hitos', 'None');
            const cleanMilestones = this.cleanHtmlText(rawMilestones);
            
            this.createDataPanel(slide, 'Requirements & Milestones', [
                { label: 'Milestones', value: this.truncateText(cleanMilestones, 40) },
                { label: 'Acceptance Criteria', value: this.truncateText(cleanCriteria, 60) }
            ], 2.8, 4.2, 4.4, this.colors.secondary);

        } catch (error) {
            console.error('Error in createOdooIntegrationSlide:', error);
            slide.addText('Integration & Business Details - Error loading data', {
                x: 1, y: 3, w: 8, h: 1,
                fontSize: 18, color: this.colors.danger
            });
        }
    }

    createRisksSlide(pptx, risks) {
        const slide = pptx.addSlide();
        
        try {
            this.addSlideHeader(slide, 'Risks', 'Risk management and mitigation tracking');

            if (risks.length === 0) {
                slide.addText('No risks identified for this Epic', {
                    x: 1, y: 3, w: 8, h: 1,
                    fontSize: 16, color: this.colors.success,
                    align: 'center'
                });
                return;
            }

            // Crear tabla de riesgos
            const tableData = [
                ['ID', 'Title', 'State', 'Priority', 'Assigned To', 'Impact']
            ];

            risks.forEach(risk => {
                tableData.push([
                    risk.id.toString(),
                    this.truncateText(this.azureService.getFieldValue(risk, 'System.Title'), 30),
                    this.azureService.getFieldValue(risk, 'System.State'),
                    this.azureService.getFieldValue(risk, 'Custom.Priority', ''),
                    this.azureService.getFieldValue(risk, 'System.AssignedTo')?.displayName || '',
                    this.azureService.getFieldValue(risk, 'Custom.Impact', '')
                ]);
            });

            slide.addTable(tableData, {
                x: 0.5, y: 1.8, w: 9, h: 3.8,
                fontSize: 10,
                color: this.colors.text,
                fill: { color: this.colors.lightGray },
                border: { type: 'solid', color: this.colors.danger }
            });

        } catch (error) {
            console.error('Error in createRisksSlide:', error);
            slide.addText('Risks - Error loading data', {
                x: 1, y: 3, w: 8, h: 1,
                fontSize: 18, color: this.colors.danger
            });
        }
    }

    createImpedimentsSlide(pptx, impediments) {
        const slide = pptx.addSlide();
        
        try {
            this.addSlideHeader(slide, 'Impediments', 'Impediment tracking and resolution status');

            if (impediments.length === 0) {
                slide.addText('No impediments identified for this Epic', {
                    x: 1, y: 3, w: 8, h: 1,
                    fontSize: 16, color: this.colors.success,
                    align: 'center'
                });
                return;
            }

            // Crear tabla de impedimentos
            const tableData = [
                ['ID', 'Title', 'State', 'Priority', 'Assigned To', 'Resolution']
            ];

            impediments.forEach(impediment => {
                tableData.push([
                    impediment.id.toString(),
                    this.truncateText(this.azureService.getFieldValue(impediment, 'System.Title'), 30),
                    this.azureService.getFieldValue(impediment, 'System.State'),
                    this.azureService.getFieldValue(impediment, 'Custom.Priority', ''),
                    this.azureService.getFieldValue(impediment, 'System.AssignedTo')?.displayName || '',
                    this.truncateText(this.azureService.getFieldValue(impediment, 'Custom.Resolution', ''), 20)
                ]);
            });

            slide.addTable(tableData, {
                x: 0.5, y: 1.8, w: 9, h: 3.8,
                fontSize: 10,
                color: this.colors.text,
                fill: { color: this.colors.lightGray },
                border: { type: 'solid', color: this.colors.warning }
            });

        } catch (error) {
            console.error('Error in createImpedimentsSlide:', error);
            slide.addText('Impediments - Error loading data', {
                x: 1, y: 3, w: 8, h: 1,
                fontSize: 18, color: this.colors.danger
            });
        }
    }

    // CORREGIDO: Pasar slide como parámetro, no usar pptx
    addStatusIndicators(slide, epic) {
        // Círculos de estado basados en las imágenes
        const indicators = [
            { color: 'D13438', x: 7.5 }, // Rojo para risks
            { color: 'B146C2', x: 8.2 }, // Morado para impediments  
            { color: '107C10', x: 8.9 }  // Verde para ok/done
        ];

        indicators.forEach(indicator => {
            slide.addShape('ellipse', {
                x: indicator.x, y: 0.3, w: 0.3, h: 0.3,
                fill: { color: indicator.color }
            });
        });
    }

    calculateProgressStats(userStories, tasks) {
        const userStoryStats = {
            total: userStories.length,
            new: userStories.filter(us => this.azureService.getFieldValue(us, 'System.State') === 'New').length,
            active: userStories.filter(us => this.azureService.getFieldValue(us, 'System.State') === 'Active').length,
            done: userStories.filter(us => this.azureService.getFieldValue(us, 'System.State') === 'Done').length
        };

        const taskStats = {
            total: tasks.length,
            toDo: tasks.filter(t => this.azureService.getFieldValue(t, 'System.State') === 'To Do').length,
            inProgress: tasks.filter(t => this.azureService.getFieldValue(t, 'System.State') === 'In Progress').length,
            done: tasks.filter(t => this.azureService.getFieldValue(t, 'System.State') === 'Done').length
        };

        return {
            userStories: userStoryStats,
            tasks: taskStats
        };
    }

    // CORREGIDO: Pasar pptx como parámetro
    createProgressChart(slide, stats, pptx) {
        // Crear un gráfico de barras simple usando formas
        const chartY = 3;
        const barHeight = 0.4;
        const barSpacing = 0.6;

        // User Stories
        slide.addText('User Stories Progress:', {
            x: 0.5, y: chartY - 0.5, w: 4, h: 0.3,
            fontSize: 14, bold: true, color: '333333'
        });

        const usTotal = stats.userStories.total || 1;
        const usProgress = [
            { label: 'New', value: stats.userStories.new, color: 'FF6B6B' },
            { label: 'Active', value: stats.userStories.active, color: 'FFE66D' },
            { label: 'Done', value: stats.userStories.done, color: '4ECDC4' }
        ];

        usProgress.forEach((item, index) => {
            const percentage = (item.value / usTotal) * 100;
            const barWidth = (percentage / 100) * 3;
            
            slide.addShape('rect', {
                x: 0.5, y: chartY + (index * barSpacing), w: barWidth, h: barHeight,
                fill: { color: item.color }
            });

            slide.addText(`${item.label}: ${item.value} (${percentage.toFixed(1)}%)`, {
                x: 4, y: chartY + (index * barSpacing), w: 2, h: barHeight,
                fontSize: 10, color: '333333'
            });
        });
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // Nueva función para limpiar HTML
    cleanHtmlText(htmlText) {
        if (!htmlText) return '';
        
        // Convertir HTML a texto plano
        let cleanText = htmlText
            // Reemplazar saltos de línea HTML con espacios
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<\/p>/gi, ' ')
            .replace(/<\/div>/gi, ' ')
            .replace(/<\/h[1-6]>/gi, '. ')
            // Remover todas las etiquetas HTML
            .replace(/<[^>]*>/g, '')
            // Decodificar entidades HTML comunes
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            // Limpiar espacios múltiples
            .replace(/\s+/g, ' ')
            .trim();
            
        return cleanText;
    }

    // Funciones auxiliares para diseño corporativo
    addSlideHeader(slide, title, subtitle = '') {
        // Fondo del header
        slide.addShape('rect', {
            x: 0, y: 0, w: 10, h: 1.2,
            fill: this.colors.primary
        });

        // Línea de acento
        slide.addShape('rect', {
            x: 0, y: 1.2, w: 10, h: 0.1,
            fill: this.colors.accent
        });

        // Título
        slide.addText(title, {
            x: 0.5, y: 0.2, w: 9, h: 0.6,
            fontSize: 28, bold: true, color: this.colors.white
        });

        // Subtítulo
        if (subtitle) {
            slide.addText(subtitle, {
                x: 0.5, y: 0.7, w: 9, h: 0.3,
                fontSize: 14, color: this.colors.lightGray
            });
        }
    }

    createDataPanel(slide, title, data, x, y, width, color) {
        const height = (data.length * 0.4) + 1;

        // Fondo del panel
        slide.addShape('rect', {
            x: x, y: y, w: width, h: height,
            fill: this.colors.white,
            line: { color: color, width: 2 }
        });

        // Header del panel
        slide.addShape('rect', {
            x: x, y: y, w: width, h: 0.6,
            fill: color
        });

        // Título del panel
        slide.addText(title, {
            x: x + 0.2, y: y + 0.1, w: width - 0.4, h: 0.4,
            fontSize: 16, bold: true, color: this.colors.white
        });

        // Datos
        data.forEach((item, index) => {
            const itemY = y + 0.8 + (index * 0.4);
            
            // Label
            slide.addText(`${item.label}:`, {
                x: x + 0.2, y: itemY, w: width * 0.4, h: 0.3,
                fontSize: 12, bold: true, color: this.colors.text
            });

            // Value
            slide.addText(item.value, {
                x: x + 0.2 + (width * 0.4), y: itemY, w: width * 0.55, h: 0.3,
                fontSize: 12, 
                color: item.highlight ? color : this.colors.text,
                bold: item.highlight
            });
        });
    }

    createMetricCard(slide, title, value, unit, x, y, color) {
        // Fondo de la métrica
        slide.addShape('rect', {
            x: x, y: y, w: 2.2, h: 1.5,
            fill: this.colors.white,
            line: { color: color, width: 2 }
        });

        // Icono/indicador de color
        slide.addShape('ellipse', {
            x: x + 0.2, y: y + 0.2, w: 0.4, h: 0.4,
            fill: color
        });

        // Título
        slide.addText(title, {
            x: x + 0.8, y: y + 0.2, w: 1.2, h: 0.4,
            fontSize: 11, bold: true, color: this.colors.text
        });

        // Valor
        slide.addText(value, {
            x: x + 0.1, y: y + 0.7, w: 1.5, h: 0.5,
            fontSize: 24, bold: true, color: color,
            align: 'center'
        });

        // Unidad
        if (unit) {
            slide.addText(unit, {
                x: x + 1.6, y: y + 0.9, w: 0.5, h: 0.3,
                fontSize: 10, color: this.colors.text
            });
        }
    }
}

module.exports = PowerPointService;