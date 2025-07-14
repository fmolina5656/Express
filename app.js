const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const azureDevOpsRoutes = require('./src/routes/azureDevOps');
const errorHandler = require('./src/middleware/errorHandler');
const powerPointRoutes = require('./src/routes/powerPoint');


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Middleware general
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'text/javascript');
    }
    if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check para Azure
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: {
      hasOrganization: !!process.env.AZURE_DEVOPS_ORGANIZATION,
      hasProject: !!process.env.AZURE_DEVOPS_PROJECT,
      hasToken: !!process.env.AZURE_DEVOPS_PAT
    }
  });
});

// Rutas de la API
app.use('/api/azure-devops', azureDevOpsRoutes);
app.use('/api/powerpoint', powerPointRoutes);

// Middleware de manejo de errores
app.use(errorHandler);

// Manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`📊 Azure DevOps Web App iniciada`);
  
  if (process.env.AZURE_DEVOPS_ORGANIZATION) {
    console.log(`✅ Conectado a: ${process.env.AZURE_DEVOPS_ORGANIZATION}/${process.env.AZURE_DEVOPS_PROJECT}`);
  } else {
    console.log('⚠️  Variables de entorno de Azure DevOps no configuradas');
  }
});

module.exports = app;