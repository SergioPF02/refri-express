export interface User {
    id: number;
    name: string;
    email: string;
    role: 'client' | 'worker' | 'admin';
    token?: string;
    phone?: string;
    bio?: string;
    photo_url?: string;
    default_address?: string;
    default_lat?: number;
    default_lng?: number;
}

export interface BookingItem {
    name: string;
    price: number;
}

export interface Booking {
    id: number;
    service: string;
    date: string;
    time: string;
    address: string;
    status: 'Pending' | 'Accepted' | 'In Progress' | 'Completed' | 'Cancelled';
    price: number;
    description?: string;
    technician_name?: string;
    lat?: number;
    lng?: number;
    rating?: number;
    review?: string;
    items?: BookingItem[];
    user_email?: string;
    tonnage?: number;
    contact_method?: string;
    phone?: string;
    technician_id?: number;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface AuthContextType {
    user: User | null;
    login: (userData: any) => Promise<boolean>;
    logout: () => Promise<void>;
    register: (userData: any) => Promise<boolean>;
    updateUser: (userData: User) => Promise<void>;
    loading: boolean;
}
