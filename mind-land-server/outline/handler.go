package outline

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

func (h *Handler) GetFolders(c *gin.Context) {
	trash := c.DefaultQuery("trash", "false") == "true"
	folders, err := h.svc.GetFolders(trash)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, "获取文件夹列表失败")
		return
	}
	common.Success(c, folders)
}

type createFolderReq struct {
	Name     string `json:"name" binding:"required"`
	ParentID uint   `json:"parentId"`
}

func (h *Handler) CreateFolder(c *gin.Context) {
	var req createFolderReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, "文件夹名称不能为空")
		return
	}
	folder, err := h.svc.CreateFolder(req.Name, req.ParentID)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, "创建文件夹失败")
		return
	}
	common.Success(c, folder)
}

type updateFolderReq struct {
	Name       *string `json:"name"`
	ParentID   *uint   `json:"parentId"`
	SortOrder  *int    `json:"sortOrder"`
	IsExpanded *bool   `json:"isExpanded"`
}

func (h *Handler) UpdateFolder(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}
	var req updateFolderReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, "请求体无效")
		return
	}
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["Name"] = *req.Name
	}
	if req.ParentID != nil {
		updates["ParentID"] = *req.ParentID
	}
	if req.SortOrder != nil {
		updates["SortOrder"] = *req.SortOrder
	}
	if req.IsExpanded != nil {
		updates["IsExpanded"] = *req.IsExpanded
	}
	folder, err := h.svc.UpdateFolder(uint(id), updates)
	if err != nil {
		common.Error(c, http.StatusNotFound, "文件夹不存在")
		return
	}
	common.Success(c, folder)
}

func (h *Handler) DeleteFolder(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}
	if err := h.svc.DeleteFolder(uint(id)); err != nil {
		common.Error(c, http.StatusInternalServerError, "删除文件夹失败")
		return
	}
	common.Success(c, nil)
}

func (h *Handler) GetDocuments(c *gin.Context) {
	folderIdStr := c.DefaultQuery("folderId", "0")
	folderId, _ := strconv.ParseUint(folderIdStr, 10, 64)
	favorite := c.DefaultQuery("favorite", "false") == "true"
	recent := c.DefaultQuery("recent", "false") == "true"
	trash := c.DefaultQuery("trash", "false") == "true"
	pageStr := c.DefaultQuery("page", "1")
	page, _ := strconv.Atoi(pageStr)
	sizeStr := c.DefaultQuery("size", "20")
	size, _ := strconv.Atoi(sizeStr)

	docs, total, err := h.svc.GetDocuments(uint(folderId), favorite, recent, trash, page, size)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, "获取文档列表失败")
		return
	}
	common.Success(c, gin.H{"items": docs, "total": total})
}

func (h *Handler) GetDocument(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}
	withNodes := c.DefaultQuery("withNodes", "false") == "true"
	doc, nodes, err := h.svc.GetDocument(uint(id), withNodes)
	if err != nil {
		common.Error(c, http.StatusNotFound, "文档不存在")
		return
	}
	if withNodes {
		common.Success(c, gin.H{"document": doc, "nodes": nodes})
	} else {
		common.Success(c, doc)
	}
}

type createDocumentReq struct {
	Title    string `json:"title"`
	FolderID uint   `json:"folderId"`
}

func (h *Handler) CreateDocument(c *gin.Context) {
	var req createDocumentReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, "请求体无效")
		return
	}
	doc, err := h.svc.CreateDocument(req.Title, req.FolderID)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, "创建文档失败")
		return
	}
	common.Success(c, doc)
}

type updateDocumentReq struct {
	Title      *string `json:"title"`
	FolderID   *uint   `json:"folderId"`
	SortOrder  *int    `json:"sortOrder"`
	IsFavorite *bool   `json:"isFavorite"`
}

func (h *Handler) UpdateDocument(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}
	var req updateDocumentReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, "请求体无效")
		return
	}
	updates := make(map[string]interface{})
	if req.Title != nil {
		updates["Title"] = *req.Title
	}
	if req.FolderID != nil {
		updates["FolderID"] = *req.FolderID
	}
	if req.SortOrder != nil {
		updates["SortOrder"] = *req.SortOrder
	}
	if req.IsFavorite != nil {
		updates["IsFavorite"] = *req.IsFavorite
	}
	doc, err := h.svc.UpdateDocument(uint(id), updates)
	if err != nil {
		common.Error(c, http.StatusNotFound, "文档不存在")
		return
	}
	common.Success(c, doc)
}

func (h *Handler) DeleteDocument(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}
	if err := h.svc.DeleteDocument(uint(id)); err != nil {
		common.Error(c, http.StatusInternalServerError, "删除文档失败")
		return
	}
	common.Success(c, nil)
}

func (h *Handler) DuplicateDocument(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}
	doc, err := h.svc.DuplicateDocument(uint(id))
	if err != nil {
		common.Error(c, http.StatusNotFound, "文档不存在")
		return
	}
	common.Success(c, doc)
}

type moveDocumentReq struct {
	FolderID uint `json:"folderId" binding:"required"`
}

type saveNodesReq struct {
	Nodes []OutlineNode `json:"nodes" binding:"required"`
}

func (h *Handler) SaveNodes(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}
	var req saveNodesReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, "请求体无效")
		return
	}
	if err := h.svc.SaveNodes(uint(id), req.Nodes); err != nil {
		common.Error(c, http.StatusInternalServerError, "保存节点失败")
		return
	}
	common.Success(c, nil)
}

type reorderNodesReq struct {
	Orders []NodeOrder `json:"orders" binding:"required"`
}

func (h *Handler) ReorderNodes(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}
	var req reorderNodesReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, "请求体无效")
		return
	}
	if err := h.svc.ReorderNodes(uint(id), req.Orders); err != nil {
		common.Error(c, http.StatusInternalServerError, "排序节点失败")
		return
	}
	common.Success(c, nil)
}

func (h *Handler) RestoreFolder(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}
	if err := h.svc.RestoreFolder(uint(id)); err != nil {
		common.Error(c, http.StatusNotFound, "文件夹不存在")
		return
	}
	common.Success(c, nil)
}

func (h *Handler) PermanentDeleteFolder(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}
	if err := h.svc.PermanentDeleteFolder(uint(id)); err != nil {
		common.Error(c, http.StatusInternalServerError, "永久删除文件夹失败")
		return
	}
	common.Success(c, nil)
}

func (h *Handler) RestoreDocument(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}
	if err := h.svc.RestoreDocument(uint(id)); err != nil {
		common.Error(c, http.StatusNotFound, "文档不存在")
		return
	}
	common.Success(c, nil)
}

func (h *Handler) PermanentDeleteDocument(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}
	if err := h.svc.PermanentDeleteDocument(uint(id)); err != nil {
		common.Error(c, http.StatusInternalServerError, "永久删除文档失败")
		return
	}
	common.Success(c, nil)
}

func (h *Handler) EmptyTrash(c *gin.Context) {
	if err := h.svc.EmptyTrash(); err != nil {
		common.Error(c, http.StatusInternalServerError, "清空回收站失败")
		return
	}
	common.Success(c, nil)
}

func (h *Handler) MoveDocument(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}
	var req moveDocumentReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, http.StatusBadRequest, "folderId 不能为空")
		return
	}
	if err := h.svc.MoveDocument(uint(id), req.FolderID); err != nil {
		common.Error(c, http.StatusNotFound, "文档不存在")
		return
	}
	common.Success(c, nil)
}

func (h *Handler) Search(c *gin.Context) {
	q := c.Query("q")
	scope := c.DefaultQuery("scope", "all")
	pageStr := c.DefaultQuery("page", "1")
	page, _ := strconv.Atoi(pageStr)
	sizeStr := c.DefaultQuery("size", "20")
	size, _ := strconv.Atoi(sizeStr)

	results, total, err := h.svc.Search(q, scope, page, size)
	if err != nil {
		common.Error(c, http.StatusInternalServerError, "搜索失败")
		return
	}
	common.Success(c, gin.H{"items": results, "total": total})
}

func (h *Handler) GetVersions(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}
	versions, err := h.svc.GetVersions(uint(id))
	if err != nil {
		common.Error(c, http.StatusInternalServerError, "获取版本列表失败")
		return
	}
	common.Success(c, versions)
}

func (h *Handler) GetVersion(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("vId"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的版本ID")
		return
	}
	version, err := h.svc.GetVersion(uint(id))
	if err != nil {
		common.Error(c, http.StatusNotFound, "版本不存在")
		return
	}
	common.Success(c, version)
}

func (h *Handler) CreateVersion(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的ID")
		return
	}
	version, err := h.svc.CreateVersion(uint(id), "manual")
	if err != nil {
		common.Error(c, http.StatusInternalServerError, "创建版本失败")
		return
	}
	common.Success(c, version)
}

func (h *Handler) RestoreVersion(c *gin.Context) {
	vId, err := strconv.ParseUint(c.Param("vId"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的版本ID")
		return
	}
	if err := h.svc.RestoreVersion(uint(vId)); err != nil {
		common.Error(c, http.StatusInternalServerError, "恢复版本失败")
		return
	}
	common.Success(c, nil)
}

func (h *Handler) DeleteVersion(c *gin.Context) {
	vId, err := strconv.ParseUint(c.Param("vId"), 10, 64)
	if err != nil {
		common.Error(c, http.StatusBadRequest, "无效的版本ID")
		return
	}
	if err := h.svc.DeleteVersion(uint(vId)); err != nil {
		common.Error(c, http.StatusInternalServerError, "删除版本失败")
		return
	}
	common.Success(c, nil)
}
