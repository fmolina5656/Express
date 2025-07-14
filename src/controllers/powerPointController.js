const PowerPointService = require('../services/powerPointService');
const AzureDevOpsService = require('../services/azureDevOpsService');
const path = require('path'); // AGREGAR ESTA LÍNEA


class PowerPointController {
    constructor() {
        try {
            this.azureService = new AzureDevOpsService();
            this.pptService = new PowerPointService(this.azureService);
        } catch (error) {
            console.error('Error inicializando PowerPoint Controller:', error.message);
            this.azureService = null;
            this.pptService = null;
        }
    }

    async generateEpicPresentation(req, res) {
        try {
            if (!this.pptService) {
                return res.status(500).json({
                    success: false,
                    error: 'Servicio de PowerPoint no configurado'
                });
            }

            const { epicId } = req.params;
            const { fileName } = req.body;
            
            if (!epicId) {
                return res.status(400).json({
                    success: false,
                    error: 'Epic ID requerido'
                });
            }

            const outputFileName = fileName || `Epic_${epicId}_${Date.now()}.pptx`;
            const result = await this.pptService.generateEpicPresentation(parseInt(epicId), outputFileName);

            res.json({
                success: true,
                message: 'Presentación generada exitosamente',
                data: {
                    fileName: result.fileName,
                    epicId: result.epicId,
                    slidesCount: result.slidesCount,
                    downloadUrl: `/api/powerpoint/download/${result.fileName}`
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async downloadPresentation(req, res) {
        try {
            const { fileName } = req.params;
            const filePath = path.join(__dirname, '../../downloads', fileName);
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            
            res.download(filePath, fileName, (err) => {
                if (err) {
                    res.status(404).json({
                        success: false,
                        error: 'Archivo no encontrado'
                    });
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = PowerPointController;