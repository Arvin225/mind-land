package draft

import (
	"errors"
	"net/http"
	"strconv"

	"mind-land-server/common"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// POST /api/drafts
func (h *Handler) Create(c *gin.Context) {
	var req CreateReq
	// 允许空 body
	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&req); err != nil {
			common.Error(c, http.StatusBadRequest, err.Error())
			return
		}
	}
	d, err := h.svc.Create(req)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, d)
}

// GET /api/drafts
func (h *Handler) List(c *gin.Context) {
	items, err := h.svc.List()
	if err != nil {
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, items)
}

// GET /api/drafts/:id
func (h *Handler) Get(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	d, err := h.svc.Get(id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			common.Error(c, http.StatusNotFound, "draft not found")
			return
		}
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, d)
}

// PUT /api/drafts/:id
func (h *Handler) Update(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	var req UpdateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	d, conflict, err := h.svc.Update(id, req)
	if err != nil {
		if errors.Is(err, ErrVersionConflict) {
			c.JSON(http.StatusConflict, gin.H{
				"code":    -1,
				"message": "version_conflict",
				"result":  conflict,
			})
			return
		}
		if errors.Is(err, ErrNotFound) {
			common.Error(c, http.StatusNotFound, "draft not found")
			return
		}
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, d)
}

// DELETE /api/drafts/:id  (soft delete)
func (h *Handler) Delete(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	if err := h.svc.SoftDelete(id); err != nil {
		if errors.Is(err, ErrNotFound) {
			common.Error(c, http.StatusNotFound, "draft not found")
			return
		}
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, nil)
}

// PATCH /api/drafts/:id/restore
func (h *Handler) Restore(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	if err := h.svc.Restore(id); err != nil {
		if errors.Is(err, ErrNotFound) {
			common.Error(c, http.StatusNotFound, "draft not found")
			return
		}
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, nil)
}

// DELETE /api/drafts/:id/permanent
func (h *Handler) PermanentDelete(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}
	if err := h.svc.PermanentDelete(id); err != nil {
		if errors.Is(err, ErrNotFound) {
			common.Error(c, http.StatusNotFound, "draft not found")
			return
		}
		if errors.Is(err, ErrConflictNotDeleted) {
			common.Error(c, http.StatusConflict, "draft not in trash")
			return
		}
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, nil)
}

// DELETE /api/drafts/trash
func (h *Handler) EmptyTrash(c *gin.Context) {
	if err := h.svc.EmptyTrash(); err != nil {
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, nil)
}

func parseID(c *gin.Context) (uint, error) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "invalid id")
		return 0, err
	}
	return uint(id), nil
}
