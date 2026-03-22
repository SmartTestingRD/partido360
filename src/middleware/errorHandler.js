const errorHandler = (err, req, res, next) => {
    console.error('[Error No Controlado]:', err);
    res.status(500).json({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: 'Ocurrió un error interno en el servidor.',
        details: err.message
    });
};

module.exports = errorHandler;
