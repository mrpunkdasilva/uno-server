import { z } from 'zod';

const validateDto = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Validation error",
      errors: result.error.format()
    });
  }

  req.body = result.data;
  next();
};

export default validateDto;