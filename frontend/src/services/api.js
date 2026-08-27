import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response error interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response || error.message);
    const customError = {
      message: error.response?.data?.detail || error.response?.data?.message || 'Connection failed to intelligence backend',
      status: error.response?.status
    };
    return Promise.reject(customError);
  }
);

export const getDashboardSummary = () => api.get('/dashboard/summary');

export const getCases = () => api.get('/cases');
export const getCaseDetails = (id) => api.get(`/cases/${id}`);

export const getPersons = () => api.get('/persons');
export const getPersonDetails = (id) => api.get(`/persons/${id}`);

export const getFullGraph = () => api.get('/graph/full');
export const getPersonGraph = (id, hops = 2) => api.get(`/graph/person/${id}?hops=${hops}`);
export const getCaseGraph = (id, hops = 2) => api.get(`/graph/case/${id}?hops=${hops}`);
export const exploreNode = (id, hops = 1, relType = null) => {
  const url = relType ? `/graph/explore?node_id=${id}&hops=${hops}&rel_type=${relType}` : `/graph/explore?node_id=${id}&hops=${hops}`;
  return api.get(url);
};
export const findGraphPath = (source_id, target_id, max_hops = 4) => 
  api.post('/graph/path', { source_id, target_id, max_hops });

export const getCentralityMetrics = () => api.get('/analytics/centrality');
export const getCommunities = () => api.get('/analytics/communities');
export const getBridges = () => api.get('/analytics/bridges');
export const getNetworkMetrics = () => api.get('/analytics/metrics');

export const getAlerts = (params = {}) => api.get('/alerts', { params });
export const getAlertDetails = (id) => api.get(`/alerts/${id}`);
export const resolveAlert = (id, action = 'REVIEWED') => api.post(`/alerts/${id}/resolve?action=${action}`);

export const getTimeline = (caseId = null) => {
  const url = caseId ? `/timeline/${caseId}` : '/timeline/all';
  return api.get(url);
};

export const getDocuments = (caseId = null) => {
  const url = caseId ? `/documents?case_id=${caseId}` : '/documents';
  return api.get(url);
};
export const getDocumentDetails = (id) => api.get(`/documents/${id}`);
export const uploadDocument = (formData) => api.post('/documents/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const analyzeDocument = (id) => api.post(`/documents/${id}/analyze`);

export const getEvidenceList = (caseId = null) => {
  const url = caseId ? `/evidence?case_id=${caseId}` : '/evidence';
  return api.get(url);
};
export const getEvidenceDetails = (id) => api.get(`/evidence/${id}`);
export const getEntityEvidenceChain = (entityId) => api.get(`/evidence/chain/${entityId}`);

export const queryAssistant = (query, case_id = null, focused_entity_id = null) => 
  api.post('/investigation/query', { query, case_id, focused_entity_id });

export const globalSearch = (q) => api.get(`/search?q=${encodeURIComponent(q)}`);

export default api;


