export const setToken = (userData)=>{
    localStorage.setItem('token', userData.token);
    localStorage.setItem('vip_token', userData.vip_token);
    localStorage.setItem('userid', userData.userid);
    localStorage.setItem('vip_type', userData.vip_type);
}

export const removeToken = ()=>{
    localStorage.removeItem('token');
    localStorage.removeItem('vip_token');
    localStorage.removeItem('userid');
    localStorage.removeItem('vip_type');
}

export const getToken = ()=>{
    return {
        token: localStorage.getItem('token'),
        vip_token: localStorage.getItem('vip_token'),
        userid: localStorage.getItem('userid'),
        vip_type: localStorage.getItem('vip_type'),
    }
}
