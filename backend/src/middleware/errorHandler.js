const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'Record already exists' });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }

  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ success: false, message });
};

const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
};

module.exports = { errorHandler, notFound };
