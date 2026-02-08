import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_should_be_changed';
if (!process.env.JWT_SECRET) {
    console.warn("WARNING: JWT_SECRET not set, using default.");
}

// Extend user property on Request
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

export const verifyAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador." });
    }
};

export const authorizeRole = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
    if (req.user && roles.includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: `Acceso denegado. Se requiere uno de los siguientes roles: ${roles.join(', ')}` });
    }
};

// No default export, using named exports
export { JWT_SECRET };
