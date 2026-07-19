import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  
  getMe: () => api.get('/auth/me'),
};

// Party API
export const partyAPI = {
  create: (data: any) => api.post('/parties', data),
  
  getAll: (params?: any) => api.get('/parties', { params }),
  
  getById: (id: string) => api.get(`/parties/${id}`),
  
  getMyParty: () => api.get('/parties/my-party'),
  
  update: (id: string, data: any) => api.put(`/parties/${id}`, data),
  
  delete: (id: string) => api.delete(`/parties/${id}`),
};

// Party Contact API
export const partyContactAPI = {
  getContacts: (partyId: string) => api.get(`/party/${partyId}/contacts`),
  
  createContact: (partyId: string, data: any) => api.post(`/party/${partyId}/contacts`, data),
  
  updateContact: (partyId: string, contactId: string, data: any) => 
    api.put(`/party/${partyId}/contacts/${contactId}`, data),
  
  deleteContact: (partyId: string, contactId: string) => 
    api.delete(`/party/${partyId}/contacts/${contactId}`),
};

// Party Document API
export const partyDocumentAPI = {
  uploadDocument: (partyId: string, file: File, documentType: string) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', documentType);
    
    return api.post(`/upload/party/${partyId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  getDocuments: (partyId: string) => api.get(`/upload/party/${partyId}/documents`),
  
  downloadDocument: (documentId: string) => api.get(`/upload/party-document/${documentId}`),
  
  deleteDocument: (documentId: string) => api.delete(`/upload/party-document/${documentId}`),
};

// Service API - DEPRECATED: Use umrahVisaAPI instead
// All service-related functionality has been moved to booking routes
export const serviceAPI = {
  // Deprecated: Use umrahVisaAPI.getBookings() instead
  getAll: (params?: any) => umrahVisaAPI.getBookings(params),
  
  // Deprecated: Use umrahVisaAPI.getBookingById() instead
  getById: (id: string) => umrahVisaAPI.getBookingById(id),
  
  // Deprecated: Use umrahVisaAPI.updateBookingStatus() instead
  updateStatus: (id: string, status: string) =>
    umrahVisaAPI.updateBookingStatus(id, status),
  
  // Deprecated: Use umrahVisaAPI.getBookings() instead
  getUmrahVisas: (params?: any) => umrahVisaAPI.getBookings(params),
  
  // Deprecated: Use umrahVisaAPI.updateBookingStatus() instead
  updateUmrahVisaStatus: (id: string, status: string) =>
    umrahVisaAPI.updateBookingStatus(id, status),
  
  // Deprecated: Use umrahVisaAPI.getBookings() instead (party role filters automatically)
  getPartyServices: (params?: any) => umrahVisaAPI.getBookings(params),
};

// Upload API
export const uploadAPI = {
  uploadDocument: (bookingId: string, file: File, documentType: string, passengerId?: string) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', documentType);
    if (passengerId) {
      formData.append('passenger_id', passengerId);
    }
    
    return api.post(`/upload/booking/${bookingId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  uploadPassengerDocuments: (bookingId: string, passengerId: string, files: File[], documentTypes: string[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('documents', file));
    formData.append('document_types', JSON.stringify(documentTypes));
    
    return api.post(`/upload/booking/${bookingId}/passenger/${passengerId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  deleteDocument: (documentId: string) => api.delete(`/upload/${documentId}`),
  
  getDocument: (documentId: string) => api.get(`/upload/${documentId}`),
  
  // Party document methods - use partyDocumentAPI instead
  uploadPartyDocument: (partyId: string, file: File, documentType: string) =>
    partyDocumentAPI.uploadDocument(partyId, file, documentType),
};

// Umrah Visa Booking API
export const umrahVisaAPI = {
  createBooking: (data: any) => api.post('/umrah-visa/booking', data),
  
  getBookings: (params?: any) => api.get('/umrah-visa/bookings', { params }),
  
  getPartyBookings: (params?: any) => api.get('/umrah-visa/bookings', { params }),
  
  // Backend route: GET /api/umrah-visa/:bookingId
  getBookingById: (id: string) => api.get(`/umrah-visa/${id}`),
  
  updateBookingStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/umrah-visa/booking/${id}/status`, { status, notes }),
  
  updateGroupNumber: (id: string, groupNumber: string, groupName: string, brn?: string, umrahVisaProviderId?: string, transportCompanyId?: string, passengerCount?: number, partyId?: string) =>
    api.patch(`/umrah-visa/booking/${id}/group-number`, { groupNumber, groupName, brn, umrahVisaProviderId, transportCompanyId, passengerCount, partyId }),
  
  deleteBooking: (id: string) => api.delete(`/umrah-visa/booking/${id}`),
  restoreBooking: (id: string) => api.patch(`/umrah-visa/booking/${id}/restore`),
  
  getTransportPricing: (params: any) => 
    api.get('/umrah-visa/transport-pricing', { params }),
  
  getStats: (params?: any) => api.get('/umrah-visa/stats', { params }),

  // Workflow endpoints
  downloadDocuments: (bookingId: string) =>
    api.post(`/umrah-visa/${bookingId}/download-documents`),

  downloadAllDocuments: (bookingId: string) =>
    api.get(`/umrah-visa/${bookingId}/download-all-documents`, { responseType: 'blob' }),

  downloadBookingZip: (bookingId: string) =>
    api.get(`/umrah-visa/${bookingId}/download-zip`, { responseType: 'blob' }),

  addGroupData: (bookingId: string, data: any) =>
    api.post(`/umrah-visa/${bookingId}/add-group-data`, data),

  uploadConfirmation: (bookingId: string, confirmationImagePath: string) =>
    api.post(`/umrah-visa/${bookingId}/upload-confirmation`, { confirmationImagePath }),

  downloadConfirmation: (bookingId: string) =>
    api.get(`/umrah-visa/${bookingId}/download-confirmation`),

  markReadyForVoucher: (bookingId: string) =>
    api.post(`/umrah-visa/${bookingId}/mark-ready-for-voucher`),

  getVoucherData: (bookingId: string) =>
    api.get(`/umrah-visa/${bookingId}/voucher-data`),

  generateVoucher: (bookingId: string, voucherData: any) =>
    api.post(`/umrah-visa/${bookingId}/generate-voucher`, voucherData),

  recreateBooking: (bookingId: string, data: any) =>
    api.post(`/umrah-visa/${bookingId}/recreate`, data),

  getMissingBrnBookings: (params?: any) => 
    api.get('/umrah-visa/missing-brn', { params }),

  getMissingReturnTicketsBookings: (params?: any) => 
    api.get('/umrah-visa/bookings', { params: { ...params, missingReturnTicket: 'true' } }),

  updateHotelBrn: (hotelBookingId: string, brn: string | string[]) =>
    api.patch(`/umrah-visa/hotels/${hotelBookingId}/brn`, { brn }),

  getBrnUpdateHistory: (params?: any) =>
    api.get('/umrah-visa/brn-update-history', { params }),

  notifyMissingBrn: (bookingId: string) =>
    api.post(`/umrah-visa/${bookingId}/notify-missing-brn`),

  notifyMissingReturnTicket: (bookingId: string) =>
    api.post(`/umrah-visa/${bookingId}/notify-missing-return-ticket`),

  getDailyOverview: (params: any) =>
    api.get('/umrah-visa/operational/daily-bookings', { params }),

  getAvailableActions: (bookingId: string) =>
    api.get(`/umrah-visa/${bookingId}/available-actions`),

  getPendingBrnLoad: (accommodationType: 'hotel' | 'iqama', basedOn?: 'arrival' | 'departure') =>
    api.get('/umrah-visa/stats/pending-brn-load', { params: { accommodationType, basedOn } }),

  updateTravelDetails: (id: string, data: any) => api.patch(`/umrah-visa/${id}/travel-details`, data),

  updateTripStatus: (id: string, tripStatus: string) => api.patch(`/umrah-visa/${id}/trip-status`, { tripStatus }),

  updateAccommodation: (id: string, data: any) => api.patch(`/umrah-visa/${id}/accommodation`, data),

  updateTransportBookings: (id: string, transportBookings: any[]) =>
    api.patch(`/umrah-visa/${id}/transport-bookings`, { transportBookings }),

  updatePassengers: (id: string, passengers: any[]) =>
    api.patch(`/umrah-visa/${id}/passengers`, { passengers }),

  createTransportBooking: (id: string, data: any) => api.post(`/umrah-visa/${id}/transport-bookings`, data),
  deleteTransportBooking: (rowId: string) => api.delete(`/umrah-visa/transport-bookings/${rowId}`),

  createHotelBooking: (id: string, data: any) => api.post(`/umrah-visa/${id}/hotel-bookings`, data),
  deleteHotelBooking: (rowId: string) => api.delete(`/umrah-visa/hotel-bookings/${rowId}`),

  // Movement Details CRUD
  updateMovementDetails: (id: string, movementDetails: any[]) =>
    api.patch(`/umrah-visa/${id}/movement-details`, { movementDetails }),
  createMovementDetail: (id: string, data: any) => api.post(`/umrah-visa/${id}/movement-details`, data),
  deleteMovementDetail: (rowId: string) => api.delete(`/umrah-visa/movement-details/${rowId}`),
  
  // Ziyarath counts
  getZiyarathCounts: (dates: string[], excludeBookingId?: string) => {
    const params: any = { dates: dates.join(',') };
    if (excludeBookingId) {
      params.excludeBookingId = excludeBookingId;
    }
    return api.get('/umrah-visa/ziyarath-counts', { params });
  },

  fetchFromSheet: () => api.post('/umrah-visa/invoice/fetch-from-sheet'),
  
  generateBills: (bookingIds: string[]) => api.post('/umrah-visa/invoice/generate-bills', { bookingIds }),
  
  generateBill: (bookingId: string) => api.post(`/umrah-visa/${bookingId}/generate-bill`, {}, { responseType: 'blob' }),

  generateBookingPDF: (bookingId: string) => api.get(`/umrah-visa/${bookingId}/generate-booking-pdf`, { responseType: 'blob' }),

  updateAlternateInfo: (bookingId: string, data: any) => api.patch(`/umrah-visa/${bookingId}/alternate-info`, data),

  addToExistingBooking: (data: FormData) => 
    api.post('/umrah-visa/group/add-to-existing-booking', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};

// User Management API
export const userAPI = {
  create: (data: any) => api.post('/users', data),
  
  getAll: (params?: any) => api.get('/users', { params }),
  
  getById: (id: string) => api.get(`/users/${id}`),
  
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const countryMasterAPI = {
  create: (data: any) => api.post('/country-masters', data),
  getAll: (params?: any) => api.get('/country-masters', { params }),
  getActive: () => api.get('/country-masters/active'),
  getById: (id: string) => api.get(`/country-masters/${id}`),
  update: (id: string, data: any) => api.put(`/country-masters/${id}`, data),
  delete: (id: string) => api.delete(`/country-masters/${id}`),
  toggleStatus: (id: string) => api.patch(`/country-masters/${id}/toggle-status`),
};

// Notifications API
export const notificationAPI = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  markAsRead: (notificationIds: string[]) => api.post('/notifications/mark-read', { notificationIds }),
  getStats: () => api.get('/notifications/stats'),
};

export const currencyMasterAPI = {
  create: (data: any) => api.post('/currency-masters', data),
  getAll: (params?: any) => api.get('/currency-masters', { params }),
  getActive: () => api.get('/currency-masters/active'),
  getById: (id: string) => api.get(`/currency-masters/${id}`),
  update: (id: string, data: any) => api.put(`/currency-masters/${id}`, data),
  delete: (id: string) => api.delete(`/currency-masters/${id}`),
  toggleStatus: (id: string) => api.patch(`/currency-masters/${id}/toggle-status`),
};

export const cityMasterAPI = {
  create: (data: any) => api.post('/city-masters', data),
  getAll: (params?: any) => api.get('/city-masters', { params }),
  getActive: (params?: { countryId?: string }) => api.get('/city-masters/active', { params }),
  getById: (id: string) => api.get(`/city-masters/${id}`),
  update: (id: string, data: any) => api.put(`/city-masters/${id}`, data),
  delete: (id: string) => api.delete(`/city-masters/${id}`),
  toggleStatus: (id: string) => api.patch(`/city-masters/${id}/toggle-status`),
};


export const userRoleMasterAPI = {
  create: (data: any) => api.post('/user-role-masters', data),
  getAll: (params?: any) => api.get('/user-role-masters', { params }),
  getActive: () => api.get('/user-role-masters/active'),
  getById: (id: string) => api.get(`/user-role-masters/${id}`),
  update: (id: string, data: any) => api.put(`/user-role-masters/${id}`, data),
  delete: (id: string) => api.delete(`/user-role-masters/${id}`),
  toggleStatus: (id: string) => api.patch(`/user-role-masters/${id}/toggle-status`),
};

export const hotelInventoryAPI = {
  create: (data: { hotelId: string; brnNumber: string; totalBeds: number }) => api.post('/hotel-inventories', data),
  getAll: (params?: { cityId?: string; hotelId?: string }) => api.get('/hotel-inventories', { params }),
  getAvailable: (hotelId: string) => api.get('/hotel-inventories/available', { params: { hotelId } }),
  update: (id: string, data: { totalBeds?: number; availableBeds?: number; brnNumber?: string }) => api.put(`/hotel-inventories/${id}`, data),
  delete: (id: string) => api.delete(`/hotel-inventories/${id}`),
};

export const locationMasterAPI = {
  create: (data: any) => api.post('/location-masters', data),
  getAll: (params?: any) => api.get('/location-masters', { params }),
  getActive: (params?: { locationType?: string }) => api.get('/location-masters/active', { params }),
  getById: (id: string) => api.get(`/location-masters/${id}`),
  update: (id: string, data: any) => api.put(`/location-masters/${id}`, data),
  delete: (id: string) => api.delete(`/location-masters/${id}`),
  toggleStatus: (id: string) => api.patch(`/location-masters/${id}/toggle-status`),
};

export const vehicleTypeMasterAPI = {
  create: (data: any) => api.post('/vehicle-type-masters', data),
  getAll: (params?: any) => api.get('/vehicle-type-masters', { params }),
  getActive: () => api.get('/vehicle-type-masters/active'),
  getById: (id: string) => api.get(`/vehicle-type-masters/${id}`),
  update: (id: string, data: any) => api.put(`/vehicle-type-masters/${id}`, data),
  delete: (id: string) => api.delete(`/vehicle-type-masters/${id}`),
  toggleStatus: (id: string) => api.patch(`/vehicle-type-masters/${id}/toggle-status`),
};

export const transportRouteMasterAPI = {
  create: (data: any) => api.post('/transport-route-masters', data),
  getAll: (params?: any) => api.get('/transport-route-masters', { params }),
  getActive: () => api.get('/transport-route-masters/active'),
  getById: (id: string) => api.get(`/transport-route-masters/${id}`),
  update: (id: string, data: any) => api.put(`/transport-route-masters/${id}`, data),
  delete: (id: string) => api.delete(`/transport-route-masters/${id}`),
  toggleStatus: (id: string) => api.patch(`/transport-route-masters/${id}/toggle-status`),
  matchByCities: (cityIds: string[]) => api.get('/transport-route-masters/match-by-cities', { 
    params: { cityIds: cityIds.join(',') } 
  }),
};

export const transportMasterAPI = {
  create: (data: any) => api.post('/transport-masters', data),
  getAll: (params?: any) => api.get('/transport-masters', { params }),
  getActive: () => api.get('/transport-masters/active'),
  getById: (id: string) => api.get(`/transport-masters/${id}`),
  getByRoute: (routeId: string) => api.get(`/transport-masters/by-route/${routeId}`),
  update: (id: string, data: any) => api.put(`/transport-masters/${id}`, data),
  delete: (id: string) => api.delete(`/transport-masters/${id}`),
  toggleStatus: (id: string) => api.patch(`/transport-masters/${id}/toggle-status`),
};

// Pricing Master API
export const pricingMasterAPI = {
  getAll: (params?: any) => api.get('/pricing-masters', { params }),
  getById: (id: string) => api.get(`/pricing-masters/${id}`),
  create: (data: any) => api.post('/pricing-masters', data),
  update: (id: string, data: any) => api.put(`/pricing-masters/${id}`, data),
  delete: (id: string) => api.delete(`/pricing-masters/${id}`),
};

// Masters
export const umrahVisaMasterAPI = {
  getDestinations: (params?: any) => api.get('/umrah-visa/masters/destinations', { params }),
  getHotels: (params?: any) => api.get('/umrah-visa/masters/hotels', { params }),
  getAirports: (params?: any) => api.get('/umrah-visa/masters/airports', { params }),
  getDates: () => api.get('/umrah-visa/masters/dates'),
  updateDates: (data: { lastArrivalDate: string; lastDepartureDate: string }) => 
    api.post('/umrah-visa/masters/dates', data),
};

// Voucher API
export const voucherAPI = {
  getAllVouchers: (params?: any) => api.get('/vouchers', { params }),
  getVoucherStats: (clientDate?: string) => api.get('/vouchers/stats', { params: { clientDate } }),
  getTodayMovements: (from?: string, to?: string, clientDate?: string) => {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (clientDate) params.clientDate = clientDate;
    return api.get('/vouchers/movements/today', { params });
  },
  getTomorrowMovements: (from?: string, to?: string, clientDate?: string) => {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (clientDate) params.clientDate = clientDate;
    return api.get('/vouchers/movements/tomorrow', { params });
  },
  getAfterTomorrowMovements: (from?: string, to?: string, clientDate?: string) => {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (clientDate) params.clientDate = clientDate;
    return api.get('/vouchers/movements/after-tomorrow', { params });
  },
  getMovementsByDate: (date: string, from?: string, to?: string) => {
    const params: any = { date };
    if (from) params.from = from;
    if (to) params.to = to;
    return api.get('/vouchers/movements/by-date', { params });
  },
  getMovementFilterOptions: () => api.get('/vouchers/movements/filter-options'),
  getTodayMovementStats: (clientDate?: string) => api.get('/vouchers/movements/stats/today', { params: { clientDate } }),
  getTomorrowMovementStats: (clientDate?: string) => api.get('/vouchers/movements/stats/tomorrow', { params: { clientDate } }),
  getAfterTomorrowMovementStats: (clientDate?: string) => api.get('/vouchers/movements/stats/after-tomorrow', { params: { clientDate } }),
  getMovementStatsByDate: (date: string) => api.get('/vouchers/movements/stats/by-date', { params: { date } }),

  createQuickVoucher: (data: any) => api.post('/vouchers/quick', data),
  getVoucherById: (id: string) => api.get(`/vouchers/${id}`),
  updateVoucher: (id: string, data: any) => api.put(`/vouchers/${id}`, data),
  updateMovementDetails: (voucherId: string, movementIndex: number, data: any) =>
    api.put(`/vouchers/${voucherId}/movement/${movementIndex}`, data),
  notifyMovementUpdate: (voucherId: string, movementIndex: number) =>
    api.post(`/vouchers/${voucherId}/movement/${movementIndex}/notify`),
};

// Nusuk Integration API
export const nusukAPI = {
  getSettings: () => api.get('/nusuk/settings'),
  saveSettings: (data: {
    token: string;
    activeEntityId?: string;
    activeEntityTypeId?: string;
    entityId?: string;
    selectedUmrahCompanyIds?: string;
    checkByPassport?: boolean;
    externalAgentCodes?: string;
    syncSchedule?: string;
    syncType?: string;
    allowOneWayTicket?: boolean;
  }) => api.post('/nusuk/settings', data),
  triggerSync: (partyId?: string) => api.post('/nusuk/sync', { partyId }),
  getMismatches: (params?: { 
    resolved?: boolean; 
    page?: number; 
    limit?: number; 
    mismatchType?: string; 
    partyId?: string; 
    search?: string;
  }) => api.get('/nusuk/mismatches', { params }),
  resolveMismatch: (id: string) => api.post(`/nusuk/mismatches/${id}/resolve`),
  getComplianceSummary: () => api.get('/nusuk/compliance/summary'),
  getComplianceAgents: () => api.get('/nusuk/compliance/agents'),
  getComplianceAgentLogs: (partyId: string) => api.get(`/nusuk/compliance/agents/${partyId}/logs`),
  getComplianceDashboard: () => api.get('/nusuk/compliance/dashboard'),
  searchPassengers: (query: string) => api.get('/nusuk/passengers/search', { params: { q: query } }),
  overrideComplianceStatus: (partyId: string, data: { status: 'GREEN' | 'YELLOW' | 'RED'; reason: string }) => 
    api.post(`/nusuk/compliance/agents/${partyId}/override`, data),
  recalculateCompliance: () => api.post('/nusuk/compliance/recalculate'),
  syncExcel: (file: File, partyId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/nusuk/sync-excel', formData, {
      params: partyId ? { partyId } : undefined,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getConsulateReview: (params?: {
    page?: number;
    limit?: number;
    partyId?: string;
    search?: string;
  }) => api.get('/nusuk/consulate-review', { params }),
};

// WhatsApp Channel Settings API
export const whatsappChannelAPI = {
  getAll: () => api.get('/whatsapp-channels'),
  create: (data: any) => api.post('/whatsapp-channels', data),
  update: (id: string, data: any) => api.put(`/whatsapp-channels/${id}`, data),
  delete: (id: string) => api.delete(`/whatsapp-channels/${id}`),
  getMappings: () => api.get('/whatsapp-channels/mappings'),
  saveMapping: (useCase: string, channelId: string, isActive?: boolean) => api.post('/whatsapp-channels/mappings', { useCase, channelId, isActive }),
  toggleMapping: (id: string, isActive: boolean) => api.patch(`/whatsapp-channels/mappings/${id}`, { isActive }),
  testConfig: (data: { baseUrl: string; apiKey: string; apiSecret: string; channelId: string; to: string; message: string }) =>
    api.post('/whatsapp-channels/test-config', data),
};



