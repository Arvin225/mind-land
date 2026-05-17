package todo

import (
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

func (h *Handler) CreateList(c *gin.Context) {
	var req struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.Name == "" {
		common.Error(c, http.StatusBadRequest, "name is required")
		return
	}
	list, err := h.svc.CreateList(req.Name)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, list)
}

func (h *Handler) GetLists(c *gin.Context) {
	lists, err := h.svc.GetAllLists()
	if err != nil {
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, lists)
}

func (h *Handler) PatchList(c *gin.Context) {
	var req struct {
		ID   uint   `json:"id"`
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.ID == 0 {
		common.Error(c, http.StatusBadRequest, "id is required")
		return
	}
	if req.Name == "" {
		common.Error(c, http.StatusBadRequest, "name is required")
		return
	}
	if err := h.svc.ModifyListName(req.ID, req.Name); err != nil {
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, nil)
}

func (h *Handler) DeleteList(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.svc.DeleteList(uint(id)); err != nil {
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, nil)
}

func (h *Handler) CreateItem(c *gin.Context) {
	var item Item
	if err := c.ShouldBindJSON(&item); err != nil {
		common.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if item.Content == "" {
		common.Error(c, http.StatusBadRequest, "content is required")
		return
	}
	if item.ListID == 0 {
		common.Error(c, http.StatusBadRequest, "listId is required")
		return
	}
	created, err := h.svc.CreateItem(item)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, created)
}

func (h *Handler) GetItems(c *gin.Context) {
	var query struct {
		ListID *uint `form:"listId"`
		Star   *bool `form:"star"`
		Done   *bool `form:"done"`
		Del    *bool `form:"del"`
	}
	if err := c.ShouldBindQuery(&query); err != nil {
		common.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	conds := map[string]interface{}{}
	if query.ListID != nil {
		conds["list_id"] = *query.ListID
	}
	if query.Star != nil {
		conds["star"] = *query.Star
	}
	if query.Done != nil {
		conds["done"] = *query.Done
	}
	if query.Del != nil {
		conds["del"] = *query.Del
	}

	items, err := h.svc.GetItems(conds)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, items)
}

func (h *Handler) PatchItem(c *gin.Context) {
	var raw map[string]interface{}
	if err := c.ShouldBindJSON(&raw); err != nil {
		common.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	idFloat, ok := raw["id"].(float64)
	if !ok || idFloat == 0 {
		common.Error(c, http.StatusBadRequest, "id is required")
		return
	}
	if err := h.svc.PatchItem(uint(idFloat), raw); err != nil {
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, nil)
}

func (h *Handler) DeleteItem(c *gin.Context) {
	var req struct {
		ID        uint `json:"id"`
		Permanent *bool `json:"permanent,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.ID == 0 {
		common.Error(c, http.StatusBadRequest, "id is required")
		return
	}
	isPermanent := req.Permanent != nil && *req.Permanent
	if err := h.svc.DeleteItem(req.ID, isPermanent); err != nil {
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, nil)
}
