import path from "path";

export default {
    webpack: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    typescript: {
        enableTypeChecking: true /* (default value) */,
    }
}