const express = require('express');
const AzureDevOpsController = require('../controllers/azureDevOpsController');

const router = express.Router();
const controller = new AzureDevOpsController();

// Rutas de la API
router.get('/health', (req, res) => controller.healthCheck(req, res));
router.get('/work-item-types', (req, res) => controller.getWorkItemTypes(req, res));
router.get('/work-items/:workItemType', (req, res) => controller.getWorkItems(req, res));
router.get('/fields/:workItemType', (req, res) => controller.getAvailableFields(req, res));
router.post('/export', (req, res) => controller.exportToCSV(req, res));
router.get('/download/:fileName', (req, res) => controller.downloadFile(req, res));

module.exports = router;