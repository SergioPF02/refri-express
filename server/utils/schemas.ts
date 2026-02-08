import Joi from 'joi';

export const createBookingSchema = Joi.object({
    user_email: Joi.string().email().required(),
    service: Joi.string().min(3).required(),
    tonnage: Joi.number().min(0).max(50).required(), // Reasonable limits for AC tonnage
    price: Joi.number().min(0).required(),
    date: Joi.string().isoDate().required(), // Expect YYYY-MM-DD
    time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(), // HH:MM format
    address: Joi.string().min(5).required(),
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    name: Joi.string().min(2).required(),
    phone: Joi.string().min(10).required(),
    description: Joi.string().allow('', null).optional(),
    contact_method: Joi.string().valid('phone', 'whatsapp', 'email', 'WhatsApp', 'Correo Electrónico', 'App').required(),
    quantity: Joi.number().integer().min(1).default(1),
    items: Joi.array().items(Joi.object({
        name: Joi.string().required(),
        price: Joi.number().required(),
        // Add other item fields if necessary
    })).optional()
});

export const updateBookingStatusSchema = Joi.object({
    status: Joi.string().valid('Pending', 'Accepted', 'In Progress', 'Completed', 'Cancelled').required()
});

export const updateBookingDetailsSchema = Joi.object({
    date: Joi.string().isoDate().optional(),
    time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    price: Joi.number().min(0).optional(),
    description: Joi.string().allow('', null).optional(),
    status: Joi.string().valid('Pending', 'Accepted', 'In Progress', 'Completed', 'Cancelled').optional(),
    items: Joi.array().optional()
});

export const submitReviewSchema = Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    review: Joi.string().allow('', null).optional()
});

export const acceptBookingSchema = Joi.object({
    technician_name: Joi.string().required()
});

export const registerSchema = Joi.object({
    name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('client', 'worker', 'technician', 'admin').default('client')
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

export const updateUserProfileSchema = Joi.object({
    name: Joi.string().min(2).optional(),
    phone: Joi.string().optional(),
    address: Joi.string().min(5).optional(),
    service_type: Joi.string().optional(),
    bio: Joi.string().optional(),
    default_lat: Joi.number().optional(),
    default_lng: Joi.number().optional(),
    default_address: Joi.string().optional()
}).unknown(true);

export const updateDeviceTokenSchema = Joi.object({
    token: Joi.string().required()
});
