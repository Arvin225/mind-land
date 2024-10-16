import axios, { InternalAxiosRequestConfig } from 'axios'

// 配置基础request
const request = axios.create({
    baseURL: 'http://localhost:3300', // 需包含协议前缀
    timeout: 5000,
})


/* const CancelToken = axios.CancelToken
interface RequestItem {
    url?: string
    method?: string
    data?: string
    params?: string,
}
let requestQueue: RequestItem[] = [] */
// 请求拦截调用：重复请求时取消当前请求
/* function handleRequest(config: InternalAxiosRequestConfig<any>) {
    // 提取四个参数用于区分相同的请求
    // const { url, method, data = {}, params = {} } = config;
    // const jData = JSON.stringify(data), jParams = JSON.stringify(params)
    const { url, method } = config;

    // 得到和当前请求重复的请求
    const duplicatedRequestList = requestQueue.filter(item => {
        // return item.url === url && item.method === method && item.data === jData && item.params === jParams
        return item.url === url && item.method === method
    })
    // 判断是否有重复，有重复则取消当前请求
    if (duplicatedRequestList.length) {
        // 这里是重点，实例化CancelToken时，对参数 c 进行立即调用，即可立即取消当前请求
        config.cancelToken = new CancelToken(c => c(`重复的请求被拦截了: [${method} -> ${url}]`))
    } else {
        // 如果不重复，将当前请求添加到队列，以供后续的重复判定
        requestQueue.push({
            url,
            // data: jData,
            // params: jParams,
            method,
        })
    }
} */

// 响应拦截调用：得到响应，将当前请求从请求队列中移除
/* function handleResponse(config: InternalAxiosRequestConfig<any>) {
    // const { url, method, data = JSON.stringify({}), params = JSON.stringify({}) } = config
    const { url, method } = config
    const reqQueue = requestQueue.filter(item => {
        // return item.url !== url && item.data !== data && item.params !== params
        return item.url !== url && item.method !== method
    })
    requestQueue = reqQueue
} */

// 请求拦截器
request.interceptors.request.use(
    (config) => {
        // handleRequest(config) // 取消请求后，会向控制台报错，下面的代码便不执行，也就不会发送请求了
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 响应拦截器
request.interceptors.response.use(
    (response) => {
        // 2xx 范围内的状态码都会触发该函数。
        // 对响应数据做点什么
        // handleResponse(response.config)
        return response
    },
    (error) => {
        // 超出 2xx 范围的状态码都会触发该函数。
        // 对响应错误做点什么
        return Promise.reject(error)
    }
)

export default request