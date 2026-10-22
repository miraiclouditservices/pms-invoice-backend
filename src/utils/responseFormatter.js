const sendSuccess = (res, message = 'Success', data = {}, meta = null, statusCode = 200) => {
  let finalMessage = message;
  let finalData = data;
  let finalMeta = meta;
  let finalStatusCode = statusCode;

  // Handle case where message and data are inverted: sendSuccess(res, data, 'Message')
  if (typeof message === 'object' && typeof data === 'string') {
    finalMessage = data;
    finalData = message;
  } else if (typeof message === 'object' && (data === undefined || (typeof data === 'object' && Object.keys(data).length === 0)) && !meta) {
    // Handle case: sendSuccess(res, data)
    finalMessage = 'Success';
    finalData = message;
  }

  const response = {
    success: true,
    message: finalMessage,
    data: finalData
  };
  if (finalMeta) {
    response.meta = finalMeta;
  }
  return res.status(finalStatusCode).json(response);
};

const sendError = (res, message = 'An error occurred', statusCode = 500, code = 'INTERNAL_ERROR', errors = []) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    errors
  });
};

module.exports = { sendSuccess, sendError };
