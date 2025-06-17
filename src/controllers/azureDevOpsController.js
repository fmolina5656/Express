const AzureDevOpsService = require('../services/azureDevOpsService');
const path = require('path');

class AzureDevOpsController {
  constructor() {
    try {
      this.azureService = new AzureDevOpsService();
    } catch (error) {
      console.error('Error inicializando Azure DevOps Service:', error.message);
      this.azureService = null;
    }
  }

  async healthCheck(req, res) {
    try {
      if (!this.azureService) {
        return res.status(500).json({
          success: false,
          error: 'Servicio de Azure DevOps no configurado'
        });
      }

      const result = await this.azureService.testConnection();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getWorkItemTypes(req, res) {
    try {
      if (!this.azureService) {
        return res.status(500).json({
          success: false,
          error: 'Servicio de Azure DevOps no configurado'
        });
      }

      const types = await this.azureService.getWorkItemTypes();
      res.json({
        success: true,
        data: types
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getWorkItems(req, res) {
    try {
      if (!this.azureService) {
        return res.status(500).json({
          success: false,
          error: 'Servicio de Azure DevOps no configurado'
        });
      }

      const { workItemType } = req.params;
      
      if (!workItemType) {
        return res.status(400).json({
          success: false,
          error: 'Tipo de work item requerido'
        });
      }

      const workItems = await this.azureService.getWorkItemsByType(workItemType);
      
      const workItemsWithParents = workItems.map(workItem => {
        const parentId = this.azureService.getParentId(workItem);
        return {
          id: workItem.id,
          title: this.azureService.getFieldValue(workItem, 'System.Title'),
          type: this.azureService.getFieldValue(workItem, 'System.WorkItemType'),
          state: this.azureService.getFieldValue(workItem, 'System.State'),
          assignedTo: this.azureService.getFieldValue(workItem, 'System.AssignedTo')?.displayName || '',
          parentId: parentId || null
        };
      });

      res.json({
        success: true,
        data: workItemsWithParents,
        count: workItemsWithParents.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async exportToCSV(req, res) {
    try {
      if (!this.azureService) {
        return res.status(500).json({
          success: false,
          error: 'Servicio de Azure DevOps no configurado'
        });
      }

      const { workItemType, fileName } = req.body;
      
      if (!workItemType) {
        return res.status(400).json({
          success: false,
          error: 'Tipo de work item requerido'
        });
      }

      const outputFileName = fileName || `workitems_${workItemType}_${Date.now()}.csv`;
      const result = await this.azureService.exportWorkItemsToCSV(workItemType, outputFileName);

      res.json({
        success: true,
        message: 'CSV exportado exitosamente',
        data: {
          fileName: result.fileName,
          recordCount: result.recordCount,
          downloadUrl: `/api/azure-devops/download/${result.fileName}`
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async downloadFile(req, res) {
    try {
      const { fileName } = req.params;
      const filePath = path.join(__dirname, '../../downloads', fileName);
      
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

  async getAvailableFields(req, res) {
    try {
      if (!this.azureService) {
        return res.status(500).json({
          success: false,
          error: 'Servicio de Azure DevOps no configurado'
        });
      }

      const { workItemType } = req.params;
      
      if (!workItemType) {
        return res.status(400).json({
          success: false,
          error: 'Tipo de work item requerido'
        });
      }

      const fields = await this.azureService.getAvailableFields(workItemType);
      
      res.json({
        success: true,
        data: fields,
        count: fields.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = AzureDevOpsController;