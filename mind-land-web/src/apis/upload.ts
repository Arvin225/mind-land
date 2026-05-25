import request from '@/utils/request'
import type { Response } from '@/apis/interfaces/Response'

export function uploadImage(file: File): Promise<Response<{ url: string }>> {
    const formData = new FormData()
    formData.append('file', file)
    return request.post<any, Response<{ url: string }>>('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
}
