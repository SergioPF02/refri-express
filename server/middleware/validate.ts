import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';

const validate = (schema: Schema) => (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
        const errorMessage = error.details.map((detail: any) => detail.message).join(', ');
        return res.status(400).json({ error: errorMessage });
    }

    next();
};

export default validate;
