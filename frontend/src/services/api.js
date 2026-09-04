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
export const getPersonGraph = (id, { hops = 2, maxNodes = 25, smartRanking = true, suspiciousOnly = false, categories = null } = {}) => {
  const q = new URLSearchParams({ hops, max_nodes: maxNodes, smart_ranking: smartRanking, suspicious_only: suspiciousOnly });
  if (categories && categories.length > 0) q.set('categories', Array.isArray(categories) ? categories.join(',') : categories);
  return api.get(`/graph/person/${id}?${q}`);
};

export const getCaseGraph = (id, { hops = 2, maxNodes = 25, smartRanking = true, suspiciousOnly = false, categories = null } = {}) => {
  const q = new URLSearchParams({ hops, max_nodes: maxNodes, smart_ranking: smartRanking, suspicious_only: suspiciousOnly });
  if (categories && categories.length > 0) q.set('categories', Array.isArray(categories) ? categories.join(',') : categories);
  return api.get(`/graph/case/${id}?${q}`);
};

export const getGraphEntities = () => api.get('/graph/entities');

export const exploreNode = (paramsOrId, hops = 1, relType = null) => {
  if (typeof paramsOrId === 'object' && paramsOrId !== null) {
    const queryParams = new URLSearchParams();
    if (paramsOrId.nodeId || paramsOrId.id) queryParams.set('node_id', paramsOrId.nodeId || paramsOrId.id);
    if (paramsOrId.hops !== undefined) queryParams.set('hops', paramsOrId.hops);
    if (paramsOrId.maxNodes !== undefined) queryParams.set('max_nodes', paramsOrId.maxNodes);
    if (paramsOrId.smartRanking !== undefined) queryParams.set('smart_ranking', paramsOrId.smartRanking);
    if (paramsOrId.suspiciousOnly !== undefined) queryParams.set('suspicious_only', paramsOrId.suspiciousOnly);
    if (paramsOrId.categories && paramsOrId.categories.length > 0) {
      queryParams.set('categories', Array.isArray(paramsOrId.categories) ? paramsOrId.categories.join(',') : paramsOrId.categories);
    }
    if (paramsOrId.relType) queryParams.set('rel_type', paramsOrId.relType);
    return api.get(`/graph/explore?${queryParams.toString()}`);
  }
  const url = relType ? `/graph/explore?node_id=${paramsOrId}&hops=${hops}&rel_type=${relType}` : `/graph/explore?node_id=${paramsOrId}&hops=${hops}`;
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
  headers: { 'Content-Type': undefined }
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


