const express = require('express');
const PowerPointController = require('../controllers/powerPointController');

const router = express.Router();
const controller = new PowerPointController();

router.post('/generate-epic/:epicId', (req, res) => controller.generateEpicPresentation(req, res));
router.get('/download/:fileName', (req, res) => controller.downloadPresentation(req, res));

module.exports = router;