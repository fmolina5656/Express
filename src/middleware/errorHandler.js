const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Error de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Error de validación',
      details: err.message
    });
  }

  // Error de Azure DevOps
  if (err.message.includes('Azure DevOps')) {
    return res.status(502).json({
      success: false,
      error: 'Error de conexión con Azure DevOps',
      details: err.message
    });
  }

  // Error genérico
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
  });
};

module.exports = errorHandler;