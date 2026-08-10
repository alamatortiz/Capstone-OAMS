// `dev_error` is only attached outside production so route handlers stay
// debuggable locally without ever leaking internal error text (DB column
// names, file paths, etc.) to a real client. Requires NODE_ENV=production
// to actually be set on the deployed server for the gate to take effect --
// it defaults open (dev_error included) whenever NODE_ENV is unset.
function sendServerError(res, error, label) {
  console.error(label, error);
  res.status(500).json({
    message: "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { dev_error: error.message }),
  });
}

module.exports = { sendServerError };
