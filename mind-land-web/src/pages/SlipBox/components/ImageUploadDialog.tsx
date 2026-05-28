import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Upload, Link, X, FileImage, Loader2 } from 'lucide-react'
import { uploadImage } from '@/apis/upload'
import { toastError } from '@/components/ToastProvider'

interface ImageUploadDialogProps {
    open: boolean
    onClose: () => void
    onConfirm: (url: string) => void
}

type Tab = 'upload' | 'url'

function ImageUploadDialog({ open, onClose, onConfirm }: ImageUploadDialogProps) {
    const [activeTab, setActiveTab] = useState<Tab>('upload')
    const [dragOver, setDragOver] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [urlInput, setUrlInput] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const resetState = useCallback(() => {
        setActiveTab('upload')
        setDragOver(false)
        setSelectedFile(null)
        setPreviewUrl(null)
        setUploading(false)
        setUrlInput('')
    }, [])

    const handleClose = () => {
        resetState()
        onClose()
    }

    const checkFileType = (file: File): boolean => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            toastError('仅支持 PNG/JPEG/GIF/WebP 格式的图片')
            return false
        }
        if (file.size > 10 * 1024 * 1024) {
            toastError('文件大小不能超过 10MB')
            return false
        }
        return true
    }

    const handleFileSelect = (file: File) => {
        if (!checkFileType(file)) return
        setSelectedFile(file)
        const reader = new FileReader()
        reader.onload = (e) => setPreviewUrl(e.target?.result as string)
        reader.readAsDataURL(file)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFileSelect(file)
    }

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFileSelect(file)
    }

    const handleUpload = async () => {
        if (!selectedFile) return
        setUploading(true)
        try {
            const res = await uploadImage(selectedFile)
            if (res.code === 0 && res.result?.url) {
                onConfirm(res.result.url)
                handleClose()
            } else {
                toastError(res.message || '上传失败')
            }
        } catch (err) {
            toastError('上传失败，请检查网络连接')
        } finally {
            setUploading(false)
        }
    }

    const handleUrlInsert = () => {
        const trimmed = urlInput.trim()
        if (!trimmed) return
        if (!/^https?:\/\//.test(trimmed)) {
            toastError('仅支持 http/https 协议的图片 URL')
            return
        }
        onConfirm(trimmed)
        handleClose()
    }

    if (!open) return null

    const tabs: { key: Tab; label: string; icon: typeof Upload }[] = [
        { key: 'upload', label: '上传图片', icon: Upload },
        { key: 'url', label: '图片链接', icon: Link },
    ]

    return createPortal(
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                className="elevated-card rounded-2xl w-[480px] max-w-[90vw] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* 头部 */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <h3 className="text-[--foreground] font-medium">插入图片</h3>
                    <button
                        onClick={handleClose}
                        className="p-1 rounded-lg hover:bg-hover text-[--foreground]/40 hover:text-foreground/70 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 标签切换 */}
                <div className="flex gap-1 px-5 mb-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                activeTab === tab.key
                                    ? 'bg-[#D4A574]/15 text-[#D4A574]'
                                    : 'text-[--foreground]/50 hover:text-foreground/70 hover:bg-hover'
                            }`}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* 内容区 */}
                <div className="px-5 pb-5">
                    {activeTab === 'upload' ? (
                        <div className="space-y-4">
                            {/* 拖拽区域 */}
                            {!previewUrl ? (
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl py-12 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                                        dragOver
                                            ? 'border-[#D4A574] bg-[#D4A574]/5'
                                            : 'border-[--border] hover:border-foreground/20'
                                    }`}
                                >
                                    <FileImage className="w-10 h-10 text-[--foreground]/20" />
                                    <div className="text-sm text-[--foreground]/50">
                                        <span className="text-[#D4A574]">点击选择</span> 或将图片拖拽到此处
                                    </div>
                                    <div className="text-xs text-[--foreground]/30">
                                        支持 PNG / JPEG / GIF / WebP，最大 10MB
                                    </div>
                                </div>
                            ) : (
                                /* 预览区域 */
                                <div className="space-y-3">
                                    <div className="relative rounded-xl overflow-hidden bg-black/20 flex items-center justify-center min-h-[160px] max-h-[300px]">
                                        <img
                                            src={previewUrl}
                                            alt="预览"
                                            className="max-w-full max-h-[300px] object-contain"
                                        />
                                        <button
                                            onClick={() => {
                                                setSelectedFile(null)
                                                setPreviewUrl(null)
                                            }}
                                            className="absolute top-2 right-2 p-1 rounded-lg bg-black/50 text-white/70 hover:text-white transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="text-xs text-[--foreground]/40 truncate">
                                        {selectedFile?.name}
                                    </div>
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/gif,image/webp"
                                className="hidden"
                                onChange={handleFileInputChange}
                            />

                            {/* 上传按钮 */}
                            {previewUrl && (
                                <button
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    className="w-full py-2 rounded-xl bg-[#D4A574]/15 text-[#D4A574] text-sm hover:bg-[#D4A574]/25 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {uploading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4" />
                                    )}
                                    {uploading ? '上传中...' : '上传图片'}
                                </button>
                            )}
                        </div>
                    ) : (
                        /* URL 标签页 */
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={urlInput}
                                onChange={e => setUrlInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleUrlInsert()}
                                placeholder="输入图片 URL..."
                                className="w-full px-3 py-2 rounded-xl bg-black/20 border border-[--border] text-sm text-[--foreground] placeholder-[--foreground]/30 focus:outline-none focus:border-[#D4A574]/50 transition-colors"
                            />
                            <button
                                onClick={handleUrlInsert}
                                disabled={!urlInput.trim()}
                                className="w-full py-2 rounded-xl bg-[#D4A574]/15 text-[#D4A574] text-sm hover:bg-[#D4A574]/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                插入图片
                            </button>
                        </div>
                    )}
                </div>

                {/* 底部提示 */}
                <div className="px-5 pb-4 text-xs text-[--foreground]/30">
                    Tip: 上传的图片保存在服务端，URL 图片需要保持链接可访问
                </div>
            </div>
        </div>,
        document.body
    )
}

export default ImageUploadDialog
