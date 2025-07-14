const axios = require('axios');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs').promises;

class AzureDevOpsService {
  constructor() {
    this.organization = process.env.AZURE_DEVOPS_ORGANIZATION;
    this.project = process.env.AZURE_DEVOPS_PROJECT;
    this.personalAccessToken = process.env.AZURE_DEVOPS_PAT;
    
    if (!this.organization || !this.project || !this.personalAccessToken) {
      throw new Error('Variables de entorno de Azure DevOps no configuradas correctamente');
    }

    this.baseUrl = `https://dev.azure.com/${this.organization}/${this.project}/_apis`;
    this.headers = {
      'Authorization': `Basic ${Buffer.from(`:${this.personalAccessToken}`).toString('base64')}`,
      'Content-Type': 'application/json'
    };
  }

  async testConnection() {
    try {
      const response = await axios.get(
        `https://dev.azure.com/${this.organization}/_apis/projects/${this.project}?api-version=6.0`,
        { headers: this.headers }
      );
      return {
        success: true,
        project: response.data.name,
        organization: this.organization
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getWorkItemsByType(workItemType) {
    try {
      const wiqlQuery = {
        query: `SELECT [System.Id] 
               FROM WorkItems 
               WHERE [System.WorkItemType] = '${workItemType}' 
               AND [System.TeamProject] = '${this.project}'`
      };

      const wiqlResponse = await axios.post(
        `${this.baseUrl}/wit/wiql?api-version=6.0`,
        wiqlQuery,
        { headers: this.headers }
      );

      const workItemIds = wiqlResponse.data.workItems.map(wi => wi.id);
      
      if (workItemIds.length === 0) {
        return [];
      }

      const workItemsResponse = await axios.get(
        `${this.baseUrl}/wit/workitems?ids=${workItemIds.join(',')}&$expand=relations&api-version=6.0`,
        { headers: this.headers }
      );

      return workItemsResponse.data.value;
    } catch (error) {
      throw new Error(`Error obteniendo work items: ${error.response?.data?.message || error.message}`);
    }
  }

  async getWorkItemTypes() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/wit/workitemtypes?api-version=6.0`,
        { headers: this.headers }
      );
      
      return response.data.value.map(type => ({
        name: type.name,
        description: type.description,
        icon: type.icon
      }));
    } catch (error) {
      throw new Error(`Error obteniendo tipos de work items: ${error.response?.data?.message || error.message}`);
    }
  }
  async getWorkItemById(workItemId) {
    try {
        const response = await axios.get(
            `${this.baseUrl}/wit/workitems/${workItemId}?$expand=relations&api-version=6.0`,
            { headers: this.headers }
        );
        return response.data;
    } catch (error) {
        throw new Error(`Error obteniendo work item ${workItemId}: ${error.response?.data?.message || error.message}`);
    }
}

async getChildWorkItems(parentId, workItemType) {
    try {
        const wiqlQuery = {
            query: `SELECT [System.Id] 
                   FROM WorkItemLinks 
                   WHERE [Source].[System.Id] = ${parentId} 
                   AND [Target].[System.WorkItemType] = '${workItemType}' 
                   AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'`
        };

        const wiqlResponse = await axios.post(
            `${this.baseUrl}/wit/wiql?api-version=6.0`,
            wiqlQuery,
            { headers: this.headers }
        );

        if (!wiqlResponse.data.workItemRelations || wiqlResponse.data.workItemRelations.length === 0) {
            return [];
        }

        const workItemIds = wiqlResponse.data.workItemRelations
            .filter(rel => rel.target)
            .map(rel => rel.target.id);

        if (workItemIds.length === 0) {
            return [];
        }

        const workItemsResponse = await axios.get(
            `${this.baseUrl}/wit/workitems?ids=${workItemIds.join(',')}&$expand=relations&api-version=6.0`,
            { headers: this.headers }
        );

        return workItemsResponse.data.value;
    } catch (error) {
        throw new Error(`Error obteniendo work items hijo: ${error.response?.data?.message || error.message}`);
    }
}

  getParentId(workItem) {
    if (!workItem.relations) {
      return null;
    }

    const parentRelation = workItem.relations.find(
      relation => relation.rel === 'System.LinkTypes.Hierarchy-Reverse'
    );

    if (!parentRelation) {
      return null;
    }

    return parentRelation.url.split('/').pop();
  }

  getFieldValue(workItem, fieldName, defaultValue = '') {
    return workItem.fields && workItem.fields[fieldName] ? workItem.fields[fieldName] : defaultValue;
  }

  formatDate(dateString) {
    if (!dateString) return '';
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch {
      return dateString;
    }
  }

  async exportWorkItemsToCSV(workItemType, outputFileName) {
    const workItems = await this.getWorkItemsByType(workItemType);
    const csvData = [];

    for (const workItem of workItems) {
      const parentId = this.getParentId(workItem);
      
      const csvRow = {
        'Work Item Type': this.getFieldValue(workItem, 'System.WorkItemType'),
        'ID': workItem.id,
        'Tags': this.getFieldValue(workItem, 'System.Tags'),
        'Area Path': this.getFieldValue(workItem, 'System.AreaPath'),
        'Title': this.getFieldValue(workItem, 'System.Title'),
        'State': this.getFieldValue(workItem, 'System.State'),
        'Assigned To': this.getFieldValue(workItem, 'System.AssignedTo') ? 
          this.getFieldValue(workItem, 'System.AssignedTo').displayName || 
          this.getFieldValue(workItem, 'System.AssignedTo') : '',
        'Parent ID': parentId || '',
        'Hito certificable': this.getFieldValue(workItem, 'Custom.HitoCertificable'),
        'Currency': this.getFieldValue(workItem, 'Custom.Currency'),
        'Amount': this.getFieldValue(workItem, 'Custom.Amount'),
        'Committed Date': this.formatDate(this.getFieldValue(workItem, 'Custom.CommittedDate')),
        'Done Date': this.formatDate(this.getFieldValue(workItem, 'Custom.DoneDate')),
        'Fecha replanificación 1': this.formatDate(this.getFieldValue(workItem, 'Custom.FechaReplanificacion1')),
        'Motivo replanificación 1': this.getFieldValue(workItem, 'Custom.MotivoReplanificacion1'),
        'Fecha replanificación 2': this.formatDate(this.getFieldValue(workItem, 'Custom.FechaReplanificacion2')),
        'Motivo replanificación 2': this.getFieldValue(workItem, 'Custom.MotivoReplanificacion2'),
        'Fecha replanificación 3': this.formatDate(this.getFieldValue(workItem, 'Custom.FechaReplanificacion3')),
        'Motivo replanificación 3': this.getFieldValue(workItem, 'Custom.MotivoReplanificacion3'),
        'Fecha replanificación 4': this.formatDate(this.getFieldValue(workItem, 'Custom.FechaReplanificacion4')),
        'Motivo replanificación 4': this.getFieldValue(workItem, 'Custom.MotivoReplanificacion4')
      };

      csvData.push(csvRow);
    }

    // Crear directorio de descargas si no existe
    const downloadsDir = path.join(__dirname, '../../downloads');
    try {
      await fs.access(downloadsDir);
    } catch {
      await fs.mkdir(downloadsDir, { recursive: true });
    }

    const filePath = path.join(downloadsDir, outputFileName);

    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        {id: 'Work Item Type', title: 'Work Item Type'},
        {id: 'ID', title: 'ID'},
        {id: 'Tags', title: 'Tags'},
        {id: 'Area Path', title: 'Area Path'},
        {id: 'Title', title: 'Title'},
        {id: 'State', title: 'State'},
        {id: 'Assigned To', title: 'Assigned To'},
        {id: 'Parent ID', title: 'Parent ID'},
        {id: 'Hito certificable', title: 'Hito certificable'},
        {id: 'Currency', title: 'Currency'},
        {id: 'Amount', title: 'Amount'},
        {id: 'Committed Date', title: 'Committed Date'},
        {id: 'Done Date', title: 'Done Date'},
        {id: 'Fecha replanificación 1', title: 'Fecha replanificación 1'},
        {id: 'Motivo replanificación 1', title: 'Motivo replanificación 1'},
        {id: 'Fecha replanificación 2', title: 'Fecha replanificación 2'},
        {id: 'Motivo replanificación 2', title: 'Motivo replanificación 2'},
        {id: 'Fecha replanificación 3', title: 'Fecha replanificación 3'},
        {id: 'Motivo replanificación 3', title: 'Motivo replanificación 3'},
        {id: 'Fecha replanificación 4', title: 'Fecha replanificación 4'},
        {id: 'Motivo replanificación 4', title: 'Motivo replanificación 4'}
      ]
    });

    await csvWriter.writeRecords(csvData);
    
    return {
      fileName: outputFileName,
      filePath: filePath,
      recordCount: csvData.length,
      data: csvData
    };
  }

  async getAvailableFields(workItemType) {
    const workItems = await this.getWorkItemsByType(workItemType);
    if (workItems.length > 0) {
      return Object.keys(workItems[0].fields).sort();
    }
    return [];
  }
}

module.exports = AzureDevOpsService;