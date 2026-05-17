package slipbox

import (
	"net/http"
	"strconv"

	"errors"
	"mind-land-server/common"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetCards(c *gin.Context) {
	delStr := c.Query("del")
	tagIDStr := c.Query("tagId")

	if tagIDStr != "" {
		tagID, err := strconv.ParseUint(tagIDStr, 10, 64)
		if err != nil {
			common.Error(c, http.StatusBadRequest, "invalid tagId")
			return
		}
		cards, err := h.svc.GetCardsByTagID(uint(tagID))
		if err != nil {
			common.Error(c, http.StatusInternalServerError, err.Error())
			return
		}
		common.Success(c, cards)
		return
	}

	del := delStr == "true"
	cards, err := h.svc.GetAllCards(del)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, cards)
}

func (h *Handler) GetCard(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "invalid id")
		return
	}
	card, err := h.svc.GetCard(uint(id))
	if err != nil {
		common.Error(c, http.StatusNotFound, "card not found")
		return
	}
	common.Success(c, card)
}

func (h *Handler) GetAllTags(c *gin.Context) {
	tags, err := h.svc.GetAllTags()
	if err != nil {
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, tags)
}

func (h *Handler) GetTag(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "invalid id")
		return
	}
	tag, err := h.svc.GetTag(uint(id))
	if err != nil {
		common.Error(c, http.StatusNotFound, "tag not found")
		return
	}
	common.Success(c, tag)
}

func (h *Handler) CreateCard(c *gin.Context) {
	var req CreateCardReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.ContentWithText == "" || req.ContentWithHtml == "" {
		common.Error(c, http.StatusBadRequest, "content is required")
		return
	}
	resp, err := h.svc.CreateCard(req)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, resp)
}

func (h *Handler) UpdateCard(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "invalid id")
		return
	}
	var req UpdateCardReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.Content == "" {
		common.Error(c, http.StatusBadRequest, "content is required")
		return
	}
	req.ID = uint(id)
	resp, err := h.svc.UpdateCard(req)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.Error(c, http.StatusNotFound, "card not found")
			return
		}
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, resp)
}

func (h *Handler) DeleteCard(c *gin.Context) {
	var req DeleteCardReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.ID == 0 {
		common.Error(c, http.StatusBadRequest, "id is required")
		return
	}
	if req.Permanent != nil && *req.Permanent {
		if err := h.svc.DeleteCard(req); err != nil {
			common.Error(c, http.StatusInternalServerError, err.Error())
			return
		}
		common.Success(c, nil)
		return
	}
	resp, err := h.svc.RemoveCard(req)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, resp)
}

func (h *Handler) DeleteTag(c *gin.Context) {
	var req DeleteTagReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.ID == 0 && req.TagName == "" {
		common.Error(c, http.StatusBadRequest, "id or tagName is required")
		return
	}
	if err := h.svc.DeleteTag(req); err != nil {
		common.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	common.Success(c, nil)
}
