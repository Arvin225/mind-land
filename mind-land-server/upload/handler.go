package upload

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"mind-land-server/common"
)

const (
	maxUploadSize = 10 << 20 // 10MB
	uploadDir     = "./uploads"
)

var allowedMIMETypes = map[string]string{
	"image/png":  ".png",
	"image/jpeg": ".jpg",
	"image/gif":  ".gif",
	"image/webp": ".webp",
}

func HandleUpload(c *gin.Context) {
	// Limit request body size
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxUploadSize)

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		if strings.Contains(err.Error(), "http: request body too large") {
			common.Error(c, http.StatusRequestEntityTooLarge, "文件大小不能超过 10MB")
			return
		}
		common.Error(c, http.StatusBadRequest, "请选择要上传的文件")
		return
	}
	defer file.Close()

	// Read first 512 bytes to detect MIME type
	buf := make([]byte, 512)
	if _, err := file.Read(buf); err != nil {
		common.Error(c, http.StatusInternalServerError, "读取文件失败")
		return
	}
	mimeType := http.DetectContentType(buf)

	ext, ok := allowedMIMETypes[mimeType]
	if !ok {
		common.Error(c, http.StatusBadRequest, fmt.Sprintf("不支持的文件格式: %s，仅支持 PNG/JPEG/GIF/WebP", mimeType))
		return
	}

	// Ensure upload directory exists
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		common.Error(c, http.StatusInternalServerError, "创建上传目录失败")
		return
	}

	// Generate UUID filename
	filename := uuid.New().String() + ext
	destPath := filepath.Join(uploadDir, filename)

	// Write file (reset to beginning since we read 512 bytes for MIME detection)
	file.Seek(0, io.SeekStart)
	dst, err := os.Create(destPath)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, "保存文件失败")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		common.Error(c, http.StatusInternalServerError, "写入文件失败")
		return
	}

	common.Success(c, gin.H{
		"url": "/uploads/" + filename,
	})
}
