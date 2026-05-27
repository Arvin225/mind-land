package diary

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"mind-land-server/common"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetEntries(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))

	result, err := h.svc.GetEntries(page, size)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, "获取日记列表失败")
		return
	}
	common.Success(c, result)
}

func (h *Handler) GetEntry(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}

	entry, err := h.svc.GetEntry(uint(id))
	if err != nil {
		common.Error(c, http.StatusNotFound, "日记不存在")
		return
	}
	common.Success(c, entry)
}

type createEntryReq struct {
	Content string `json:"content" binding:"required"`
}

func (h *Handler) CreateEntry(c *gin.Context) {
	var req createEntryReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, "内容不能为空")
		return
	}

	entry, err := h.svc.CreateEntry(req.Content)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, "创建日记失败")
		return
	}
	common.Success(c, entry)
}

type updateEntryReq struct {
	Content string `json:"content" binding:"required"`
}

func (h *Handler) UpdateEntry(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}

	var req updateEntryReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, "内容不能为空")
		return
	}

	entry, err := h.svc.UpdateEntry(uint(id), req.Content)
	if err != nil {
		common.Error(c, http.StatusNotFound, "日记不存在")
		return
	}
	common.Success(c, entry)
}

func (h *Handler) DeleteEntry(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}

	if err := h.svc.DeleteEntry(uint(id)); err != nil {
		common.Error(c, http.StatusInternalServerError, "删除日记失败")
		return
	}
	common.Success(c, nil)
}
