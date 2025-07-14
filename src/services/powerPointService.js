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

            // Obtener datos del Epic y elementos relacionados
            const epicData = await this.getEpicCompleteData(epicId);

            // Crear diapositivas
            this.createTitleSlide(pptx, epicData.epic);
            this.createOverviewSlide(pptx, epicData.epic);
            this.createProgressSlide(pptx, epicData.epic, epicData.userStories, epicData.tasks);
            this.createBudgetSlide(pptx, epicData.epic);
            this.createClientInfoSlide(pptx, epicData.epic);
            this.createDatesSlide(pptx, epicData.epic);
            
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
        
        // Título principal
        slide.addText(`EPIC ${epic.id}`, {
            x: 0.5, y: 1.5, w: 9, h: 1,
            fontSize: 44, bold: true, color: '363636',
            align: 'center'
        });

        // Nombre del contrato/proyecto
        slide.addText(this.azureService.getFieldValue(epic, 'System.Title'), {
            x: 0.5, y: 2.5, w: 9, h: 0.8,
            fontSize: 28, color: '0078D4',
            align: 'center'
        });

        // Estado
        slide.addText(`State: ${this.azureService.getFieldValue(epic, 'System.State')}`, {
            x: 0.5, y: 3.5, w: 9, h: 0.5,
            fontSize: 18, color: '666666',
            align: 'center'
        });

        // Fecha de actualización
        slide.addText(`Updated: ${new Date().toLocaleDateString()}`, {
            x: 7, y: 6.5, w: 2.5, h: 0.3,
            fontSize: 12, color: '999999',
            align: 'right'
        });

        // Indicadores de estado (círculos de colores) - CORREGIDO
        this.addStatusIndicators(slide, epic);
    }

    createOverviewSlide(pptx, epic) {
        const slide = pptx.addSlide();
        
        slide.addText('Project Overview', {
            x: 0.5, y: 0.5, w: 9, h: 0.7,
            fontSize: 32, bold: true, color: '0078D4'
        });

        // Información básica en dos columnas
        const leftColumn = [
            `Priority: ${this.azureService.getFieldValue(epic, 'Custom.Priority', '1')}`,
            `Assign to: ${this.azureService.getFieldValue(epic, 'System.AssignedTo')?.displayName || 'Not assigned'}`,
            `BU: ${this.azureService.getFieldValue(epic, 'Custom.BU', 'Empowering Humans')}`,
            `Service Type: ${this.azureService.getFieldValue(epic, 'Custom.ServiceType', 'Contrato')}`
        ];

        const rightColumn = [
            `Epic Name: ${this.azureService.getFieldValue(epic, 'Custom.EpicName', '')}`,
            `Client: ${this.azureService.getFieldValue(epic, 'Custom.Client', '')}`,
            `Contract Type: ${this.azureService.getFieldValue(epic, 'Custom.ContractType', 'NBD')}`,
            `Country: ${this.azureService.getFieldValue(epic, 'Custom.Country', '')}`
        ];

        // Columna izquierda
        leftColumn.forEach((text, index) => {
            slide.addText(text, {
                x: 0.5, y: 1.5 + (index * 0.5), w: 4, h: 0.4,
                fontSize: 14, color: '333333'
            });
        });

        // Columna derecha
        rightColumn.forEach((text, index) => {
            slide.addText(text, {
                x: 5, y: 1.5 + (index * 0.5), w: 4, h: 0.4,
                fontSize: 14, color: '333333'
            });
        });

        // Progress section
        slide.addText('Progress', {
            x: 0.5, y: 4, w: 9, h: 0.5,
            fontSize: 18, bold: true, color: '0078D4'
        });

        const plannedProgress = this.azureService.getFieldValue(epic, 'Custom.PlannedProgress', '0%');
        const realProgress = this.azureService.getFieldValue(epic, 'Custom.RealProgress', '100%');

        slide.addText(`Avance Planeado: ${plannedProgress}`, {
            x: 0.5, y: 4.5, w: 4, h: 0.4,
            fontSize: 14, color: '333333'
        });

        slide.addText(`Avance Real: ${realProgress}`, {
            x: 5, y: 4.5, w: 4, h: 0.4,
            fontSize: 14, color: '333333'
        });
    }

    createProgressSlide(pptx, epic, userStories, tasks) {
        const slide = pptx.addSlide();
        
        slide.addText('Progress Summary', {
            x: 0.5, y: 0.5, w: 9, h: 0.7,
            fontSize: 32, bold: true, color: '0078D4'
        });

        // Estadísticas generales
        const stats = this.calculateProgressStats(userStories, tasks);
        
        slide.addText(`User Stories: ${stats.userStories.total}`, {
            x: 0.5, y: 1.5, w: 2, h: 0.4,
            fontSize: 16, bold: true, color: '333333'
        });

        slide.addText(`Tasks: ${stats.tasks.total}`, {
            x: 3, y: 1.5, w: 2, h: 0.4,
            fontSize: 16, bold: true, color: '333333'
        });

        // Crear gráfico de barras simple para estados
        this.createProgressChart(slide, stats, pptx);
    }

    createBudgetSlide(pptx, epic) {
        const slide = pptx.addSlide();
        
        slide.addText('Budget', {
            x: 0.5, y: 0.5, w: 9, h: 0.7,
            fontSize: 32, bold: true, color: '0078D4'
        });

        const budgetInfo = [
            `Hs contratadas: ${this.azureService.getFieldValue(epic, 'Custom.ContractedHours', '210hs (effort Total)')}`,
            `Hs ejecutadas: ${this.azureService.getFieldValue(epic, 'Custom.ExecutedHours', '77 (completed work)')}`,
            `HH restantes contratadas: ${this.azureService.getFieldValue(epic, 'Custom.RemainingHours', '103 (contratadas - completed)')}`,
            `HH en backlog: ${this.azureService.getFieldValue(epic, 'Custom.BacklogHours', '117 (remaining total)')}`
        ];

        budgetInfo.forEach((text, index) => {
            slide.addText(text, {
                x: 0.5, y: 1.5 + (index * 0.6), w: 8, h: 0.5,
                fontSize: 16, color: '333333'
            });
        });
    }

    createClientInfoSlide(pptx, epic) {
        const slide = pptx.addSlide();
        
        slide.addText('Client Information', {
            x: 0.5, y: 0.5, w: 9, h: 0.7,
            fontSize: 32, bold: true, color: '0078D4'
        });

        const clientInfo = [
            `Client: ${this.azureService.getFieldValue(epic, 'Custom.Client', 'CGC')}`,
            `Epic Name: ${this.azureService.getFieldValue(epic, 'Custom.EpicName', 'CGC – Bot')}`,
            `Country: ${this.azureService.getFieldValue(epic, 'Custom.Country', 'Argentina')}`,
            `Focal Point Client: ${this.azureService.getFieldValue(epic, 'Custom.FocalPointClient', 'Pablo Lagler')}`,
            `Phone: ${this.azureService.getFieldValue(epic, 'Custom.Phone', '+5491144339955')}`,
            `Address: ${this.azureService.getFieldValue(epic, 'Custom.Address', 'Honduras 2233')}`
        ];

        clientInfo.forEach((text, index) => {
            slide.addText(text, {
                x: 0.5, y: 1.5 + (index * 0.5), w: 8, h: 0.4,
                fontSize: 16, color: '333333'
            });
        });
    }

    createDatesSlide(pptx, epic) {
        const slide = pptx.addSlide();
        
        slide.addText('Dates', {
            x: 0.5, y: 0.5, w: 9, h: 0.7,
            fontSize: 32, bold: true, color: '0078D4'
        });

        const dates = [
            `Requested: ${this.azureService.formatDate(this.azureService.getFieldValue(epic, 'Custom.RequestedDate'))}`,
            `Kick off: ${this.azureService.formatDate(this.azureService.getFieldValue(epic, 'Custom.KickOffDate'))}`,
            `Start Date: ${this.azureService.formatDate(this.azureService.getFieldValue(epic, 'Custom.StartDate'))}`,
            `Target Date Real: ${this.azureService.formatDate(this.azureService.getFieldValue(epic, 'Custom.TargetDateReal'))}`,
            `Expiration Date: ${this.azureService.formatDate(this.azureService.getFieldValue(epic, 'Custom.ExpirationDate'))}`,
            `Done Date: ${this.azureService.formatDate(this.azureService.getFieldValue(epic, 'Custom.DoneDate'))}`
        ];

        dates.forEach((text, index) => {
            slide.addText(text, {
                x: 0.5, y: 1.5 + (index * 0.5), w: 8, h: 0.4,
                fontSize: 16, color: '333333'
            });
        });
    }

    createRisksSlide(pptx, risks) {
        const slide = pptx.addSlide();
        
        slide.addText('Risks', {
            x: 0.5, y: 0.5, w: 9, h: 0.7,
            fontSize: 32, bold: true, color: 'D13438'
        });

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
            x: 0.5, y: 1.5, w: 9, h: 4,
            fontSize: 10,
            color: '333333',
            fill: { color: 'F8F9FA' },
            border: { type: 'solid', color: 'CCCCCC' }
        });
    }

    createImpedimentsSlide(pptx, impediments) {
        const slide = pptx.addSlide();
        
        slide.addText('Impediments', {
            x: 0.5, y: 0.5, w: 9, h: 0.7,
            fontSize: 32, bold: true, color: 'B146C2'
        });

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
            x: 0.5, y: 1.5, w: 9, h: 4,
            fontSize: 10,
            color: '333333',
            fill: { color: 'F8F9FA' },
            border: { type: 'solid', color: 'CCCCCC' }
        });
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
}

module.exports = PowerPointService;