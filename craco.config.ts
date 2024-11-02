import path from "path";

export default {
    webpack: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    typescript: {
        enableTypeChecking: true /* (default value) */,
    },
    devServer: {
        proxy: {
            '/api': {
                target: 'http://localhost:3100',
                changeOrigin: true,
                pathRewrite: {
                    '^/api': ''
                }
            }
        }
    }
}