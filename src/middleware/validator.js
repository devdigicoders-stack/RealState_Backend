// Clean, fast and lightweight validation middleware (Zero external dependency hang)
export const validate = (rules) => {
  return (req, res, next) => {
    const errors = [];

    for (const rule of rules) {
      const { field, required, type, minLength, isEmail, isPhone, custom, message } = rule;
      const value = req.body[field] !== undefined ? req.body[field] : req.query[field];

      if (required && (value === undefined || value === null || (typeof value === 'string' && value.trim() === ''))) {
        errors.push({ field, message: message || `${field} is required` });
        continue;
      }

      if (value !== undefined && value !== null && value !== '') {
        if (type && typeof value !== type) {
          errors.push({ field, message: message || `${field} must be a ${type}` });
          continue;
        }

        if (minLength && typeof value === 'string' && value.length < minLength) {
          errors.push({ field, message: message || `${field} must be at least ${minLength} characters` });
          continue;
        }

        if (isEmail && typeof value === 'string') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value.trim())) {
            errors.push({ field, message: message || 'Invalid email format' });
            continue;
          }
        }

        if (isPhone && typeof value === 'string') {
          const raw = value.replace(/[\s\-\+\(\)]/g, '');
          if (raw.length < 10 || raw.length > 14) {
            errors.push({ field, message: message || 'Mobile number must be 10-14 digits' });
            continue;
          }
        }

        if (custom && typeof custom === 'function') {
          const customErr = custom(value, req.body);
          if (customErr) {
            errors.push({ field, message: customErr });
            continue;
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0].message,
        errors
      });
    }

    next();
  };
};

