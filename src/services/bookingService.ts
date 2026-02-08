import { api } from '../api/client';
import { Booking } from '../types';

export const bookingService = {
    // Get all bookings (filtered by role in backend)
    getAll: async (): Promise<Booking[]> => {
        return await api.get('/api/bookings');
    },

    // Get specific booking
    getById: async (id: number): Promise<Booking> => {
        // Implement if needed, currently not used in ClientOrders but maybe elsewhere
        return await api.get(`/api/bookings/${id}`);
    },

    // Submit a review for a completed job
    submitReview: async (id: number, rating: number, review: string): Promise<Booking> => {
        return await api.put(`/api/bookings/${id}/review`, { rating, review });
    },

    // Create a new booking
    create: async (bookingData: Partial<Booking>): Promise<Booking> => {
        return await api.post('/api/bookings', bookingData);
    },

    // Check availability for a date
    checkAvailability: async (date: string): Promise<any> => {
        return await api.get(`/api/bookings/availability?date=${date}`);
    },

    // Get monthly statistics (for calendar heatmaps)
    getMonthlyStats: async (year: number, month: number): Promise<any> => {
        return await api.get(`/api/bookings/stats?year=${year}&month=${month}`);
    },

    // Worker: Accept a job
    acceptJob: async (id: number, technicianName: string): Promise<Booking> => {
        return await api.put(`/api/bookings/${id}/accept`, { technician_name: technicianName });
    },

    // Worker: Release (cancel) a job
    releaseJob: async (id: number): Promise<Booking> => {
        return await api.put(`/api/bookings/${id}/release`, {});
    },

    // Worker: Update job status
    updateStatus: async (id: number, status: string): Promise<Booking> => {
        return await api.put(`/api/bookings/${id}/status`, { status });
    },

    // Worker: Update job details
    updateDetails: async (id: number, details: Partial<Booking>): Promise<Booking> => {
        return await api.put(`/api/bookings/${id}/details`, details);
    }
};
