import axios from 'axios';
import API from './api';
import { validateApi, buildApiResponse, buildExampleFormSchema, getDomain } from '../util';

// 允许跨域请求带上cookie
axios.defaults.withCredentials = true;
axios.interceptors.response.use((response) => response, (err) => {
    if (err.response && err.response.status === 401) {
        window.location.href = '#/login';
    }
    throw err;
});

const domain = getDomain();

const actions = {
    getGroups({ commit }) {
        return axios.get(API.GROUPS).then(res => {
            commit('FETCH_GROUPS_SUCCESS', res.data.resources);
            return res;
        });
    },
    getGroupList({ commit }, query) {
        return axios.get(API.GROUPS, {
            params: query
        }).then(res => {
            commit('FETCH_GROUPS_SUCCESS', res.data.resources);
            return res;
        }).catch(err => {
            throw err;
        });
    },
    createGroup({commit}, payload) {
        return axios.post(API.GROUPS, payload).then(response => {
            commit('CREATE_GROUP_SUCCESS', response.data.resources);
        });
    },
    getApiList: (() => {
        let searchLastTime = null;
        return ({ commit }, payload) => {
            commit('FETCH_BEGIN');
            const { groupId, query } = payload;
            const url = groupId ? API.GROUP_APIS.replace(':groupId', groupId) : API.APIS;
            const mytime = searchLastTime = Date.now();
            return axios.get(url, {
                params: query
            }).then(res => {
                if (searchLastTime === mytime) {
                    commit('FETCH_SUCCESS', res.data);
                    return res;
                }
            }).catch(err => {
                commit('FETCH_FAILED');
                throw err;
            });
        };
    })(),
    getGroupApi({ commit }, payload) {
        const { groupId } = payload;
        commit('FETCH_BEGIN');
        return axios.get(API.GROUP_APIS.replace(':groupId', groupId)).then((response) => {
            commit('FETCH_SUCCESS', response.data);
        }).catch(e => {
            commit('FETCH_FAILED');
            throw e;
        });
    },
    getApi({ commit }, payload) {
        const {groupId, apiId} = payload;
        return axios.get(API.API.replace(':groupId', groupId).replace(':apiId', apiId)).then(res => {
            const api = buildApiResponse(res.data.resources);
            window.console.log(api);
            commit('UPDATE_API', api);
            commit('SAVE_API');
        });
    },
    getManageApi() {
        return axios.get(`${API.APIS}/manage`);
    },
    getManageGroup() {
        return axios.get(`${API.GROUPS}/manage`);
    },
    getUnmanagedGroup() {
        return axios.get(`${API.GROUPS}/unmanaged`);
    },
    claimGroup({state}, groupId) {
        return axios.put(`${API.GROUP.replace(':groupId', groupId)}/claim`);
    },
    getApiHistory({ commit, state }) {
        // 此接口暂时无用
        return axios.get(API.API_HISTORY.replace(':apiId', state.api._id)).then(res => {
            // commit('UPDATE_API_HISTORY', res.data);
            commit('SAVE_API');
            window.console.log(res);
            return res.data.history;
        });
    },
    deleteApi({ state, commit }, payload) {
        const { group, _id} = payload.api;
        return axios.delete(API.API.replace(':groupId', group).replace(':apiId', _id));
    },
    deleteGroup({ state, commit }, groupId) {
        return axios.delete(API.GROUP.replace(':groupId', groupId));
    },
    validateApi({ state }) {
        return validateApi(state);
    },
    saveApi({ dispatch, state }) {
        return validateApi(state).then(() => {
            if (state.api._id) {
                return dispatch('updateApi');
            } else {
                return dispatch('createApi');
            }
        }).catch(err => {
            throw err;
        });
    },
    createApis({ state }, payload) {
        const { apis, groupId } = payload;
        return axios.post(API.API.replace(':groupId', groupId).replace(':apiId', 'batch'), apis);
    },
    updateApi({ state, commit }) {
        const api = state.api;
        const { group, _id} = api;
        return axios.put(API.API.replace(':groupId', group).replace(':apiId', _id), state.api).then(res => {
            commit('UPDATE_API', res.data.resources);
            commit('SAVE_API');
            return res;
        });
    },
    createApi({ state, commit }) {
        return axios.post(API.GROUP_APIS.replace(':groupId', state.api.group), state.api).then(res => {
            commit('UPDATE_API', res.data.resources);
            commit('SAVE_API');
            return res;
        });
    },
    testApi({ state, commit }, url) {
        const api = state.api;
        let config = {
            method: api.options.method,
            url: `${domain}/client/${api._id}`,
            params: {},
            data: {}
        };
        if (url !== config.url) {
            config = {
                method: 'post',
                url: `${domain}/client/real`,
                params: {},
                data: {
                    _apiRealUrl: url,
                    _apiMethod: api.options.method
                }
            };
        }
        config.params = api.options.examples.query || buildExampleFormSchema({
            example: null,
            params: api.options.params.query
        });
        config.data = Object.assign(config.data, api.options.examples.body || buildExampleFormSchema({
            example: null,
            params: api.options.params.body
        }));
        config.headers = buildExampleFormSchema(api.options.headers);
        // config.params = state.reqParams.query.value;
        // config.data = state.reqParams.body.value;
        return axios(config).then(res => {
            commit('UPDATE_RESPONSE', res);
        }, err => {
            window.console.log('error');
            window.console.log(err);
            if (err.response) {
                commit('UPDATE_RESPONSE', err.response);
            }
        }).catch(err => {
            window.console.log(err);
        });
    },
    getUser({ state, commit }) {
        return state.user || axios.get(API.USER).then(res => {
            commit('SET_USER', res.data.data);
            return res.data.data;
        });
    },
    register({ commit }, user) {
        return axios.post(`${API.USER}/register`, user).then(res => {
            if (res.data.success) {
                commit('SET_USER', res.data.data);
            }
            return res;
        });
    },
    login({ commit }, user) {
        return axios.post(`${API.USER}/login`, user).then(res => {
            if (res.data.success) {
                commit('SET_USER', res.data.data);
            }
            return res;
        });
    },
    logout({ commit }) {
        return axios.get(`${API.USER}/logout`).then(res => {
            if (res.data.success) {
                commit('SET_USER', null);
            }
            return res;
        });
    },
    updateProfile({ state, commit }, user) {
        return axios.put(`${API.PROFILE}`, user).then(res => {
            if (res.data.success) {
                commit('SET_USER', res.data.data);
            }
            return res;
        });
    }
};

export default actions;
