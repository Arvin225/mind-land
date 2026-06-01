package outline

import (
	"encoding/json"
	"fmt"

	"gorm.io/gorm"
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

func (s *Service) GetFolders(trash bool) ([]OutlineFolder, error) {
	var folders []OutlineFolder
	if err := s.db.Where("del = ?", trash).
		Order("sort_order ASC").
		Find(&folders).Error; err != nil {
		return nil, err
	}
	return folders, nil
}

func (s *Service) CreateFolder(name string, parentId uint) (*OutlineFolder, error) {
	folder := OutlineFolder{Name: name, ParentID: parentId}
	if err := s.db.Create(&folder).Error; err != nil {
		return nil, err
	}
	return &folder, nil
}

func (s *Service) UpdateFolder(id uint, updates map[string]interface{}) (*OutlineFolder, error) {
	var folder OutlineFolder
	if err := s.db.First(&folder, id).Error; err != nil {
		return nil, err
	}
	if err := s.db.Model(&folder).Updates(updates).Error; err != nil {
		return nil, err
	}
	s.db.First(&folder, id)
	return &folder, nil
}

func (s *Service) DeleteFolder(id uint) error {
	return s.db.Model(&OutlineFolder{}).Where("id = ?", id).Update("del", true).Error
}

func (s *Service) GetDocuments(folderId uint, favorite bool, recent bool, trash bool, page int, size int) ([]OutlineDocument, int64, error) {
	baseQuery := s.db.Model(&OutlineDocument{})
	if folderId > 0 {
		baseQuery = baseQuery.Where("folder_id = ?", folderId)
	}
	if favorite {
		baseQuery = baseQuery.Where("is_favorite = ?", true)
	}
	baseQuery = baseQuery.Where("del = ?", trash)

	var total int64
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	fetchQuery := s.db.Model(&OutlineDocument{})
	if folderId > 0 {
		fetchQuery = fetchQuery.Where("folder_id = ?", folderId)
	}
	if favorite {
		fetchQuery = fetchQuery.Where("is_favorite = ?", true)
	}
	fetchQuery = fetchQuery.Where("del = ?", trash)

	if recent {
		fetchQuery = fetchQuery.Order("updated_at DESC")
	} else {
		fetchQuery = fetchQuery.Order("sort_order ASC, created_at ASC")
	}

	if page < 1 {
		page = 1
	}
	if size < 1 {
		size = 20
	}
	offset := (page - 1) * size

	var docs []OutlineDocument
	if err := fetchQuery.Offset(offset).Limit(size).Find(&docs).Error; err != nil {
		return nil, 0, err
	}
	return docs, total, nil
}

func (s *Service) GetDocument(id uint, withNodes bool) (*OutlineDocument, []OutlineNode, error) {
	var doc OutlineDocument
	if err := s.db.First(&doc, id).Error; err != nil {
		return nil, nil, err
	}
	if !withNodes {
		return &doc, nil, nil
	}
	var nodes []OutlineNode
	if err := s.db.Where("document_id = ? AND del = ?", id, false).
		Order("sort_order ASC, id ASC").
		Find(&nodes).Error; err != nil {
		return nil, nil, err
	}
	return &doc, nodes, nil
}

func (s *Service) CreateDocument(title string, folderId uint) (*OutlineDocument, error) {
	if title == "" {
		title = "未命名大纲"
	}
	doc := OutlineDocument{Title: title, FolderID: folderId}
	if err := s.db.Create(&doc).Error; err != nil {
		return nil, err
	}
	return &doc, nil
}

func (s *Service) UpdateDocument(id uint, updates map[string]interface{}) (*OutlineDocument, error) {
	var doc OutlineDocument
	if err := s.db.First(&doc, id).Error; err != nil {
		return nil, err
	}
	if err := s.db.Model(&doc).Updates(updates).Error; err != nil {
		return nil, err
	}
	s.db.First(&doc, id)
	return &doc, nil
}

func (s *Service) DeleteDocument(id uint) error {
	if err := s.db.Model(&OutlineDocument{}).Where("id = ?", id).Update("del", true).Error; err != nil {
		return err
	}
	return s.db.Model(&OutlineNode{}).Where("document_id = ?", id).Update("del", true).Error
}

func (s *Service) DuplicateDocument(id uint) (*OutlineDocument, error) {
	var original OutlineDocument
	if err := s.db.First(&original, id).Error; err != nil {
		return nil, err
	}
	dup := OutlineDocument{
		Title:     original.Title + " (副本)",
		FolderID:  original.FolderID,
		SortOrder: original.SortOrder,
	}
	if err := s.db.Create(&dup).Error; err != nil {
		return nil, err
	}
	var nodes []OutlineNode
	if err := s.db.Where("document_id = ? AND del = ?", id, false).
		Order("id ASC").
		Find(&nodes).Error; err != nil {
		return nil, err
	}
	idMap := make(map[uint]uint)
	for _, node := range nodes {
		oldID := node.ID
		newNode := OutlineNode{
			DocumentID:  dup.ID,
			Content:     node.Content,
			SortOrder:   node.SortOrder,
			IsCollapsed: node.IsCollapsed,
			Note:        node.Note,
		}
		if node.ParentID != 0 {
			if newParentID, ok := idMap[node.ParentID]; ok {
				newNode.ParentID = newParentID
			}
		}
		if err := s.db.Create(&newNode).Error; err != nil {
			return nil, err
		}
		idMap[oldID] = newNode.ID
	}
	return &dup, nil
}

func (s *Service) MoveDocument(id uint, folderId uint) error {
	result := s.db.Model(&OutlineDocument{}).Where("id = ?", id).Update("folder_id", folderId)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

type NodeOrder struct {
	ID        uint `json:"id"`
	SortOrder int  `json:"sortOrder"`
	ParentID  uint `json:"parentId"`
}

func (s *Service) SaveNodes(documentID uint, nodes []OutlineNode) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		for _, n := range nodes {
			if n.ID > 0 {
				var count int64
				tx.Model(&OutlineNode{}).Where("id = ? AND document_id = ?", n.ID, documentID).Count(&count)
				if count == 0 {
					return fmt.Errorf("node %d not found for document %d", n.ID, documentID)
				}
			}
		}

		var keepIDs []uint
		for _, n := range nodes {
			if n.ID > 0 {
				keepIDs = append(keepIDs, n.ID)
			}
		}

		query := tx.Where("document_id = ? AND del = ?", documentID, false)
		if len(keepIDs) > 0 {
			query = query.Where("id NOT IN ?", keepIDs)
		}
		if err := query.Delete(&OutlineNode{}).Error; err != nil {
			return err
		}

		for i := range nodes {
			nodes[i].DocumentID = documentID
			nodes[i].Del = false
			if nodes[i].ID > 0 {
				updates := map[string]interface{}{
					"Content":     nodes[i].Content,
					"ParentID":    nodes[i].ParentID,
					"SortOrder":   nodes[i].SortOrder,
					"IsCollapsed": nodes[i].IsCollapsed,
					"Note":        nodes[i].Note,
				}
				if err := tx.Model(&OutlineNode{}).Where("id = ?", nodes[i].ID).Updates(updates).Error; err != nil {
					return err
				}
			} else {
				if err := tx.Create(&nodes[i]).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func (s *Service) GetTrashFolders() ([]OutlineFolder, error) {
	return s.GetFolders(true)
}

func (s *Service) GetTrashDocuments() ([]OutlineDocument, error) {
	docs, _, err := s.GetDocuments(0, false, false, true, 1, 1000000)
	return docs, err
}

func (s *Service) RestoreDocument(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var doc OutlineDocument
		if err := tx.First(&doc, id).Error; err != nil {
			return err
		}

		updates := map[string]interface{}{"del": false}
		if doc.FolderID > 0 {
			var count int64
			tx.Model(&OutlineFolder{}).Where("id = ? AND del = ?", doc.FolderID, false).Count(&count)
			if count == 0 {
				updates["folder_id"] = 0
			}
		}

		if err := tx.Model(&OutlineDocument{}).Where("id = ?", id).Updates(updates).Error; err != nil {
			return err
		}
		return tx.Model(&OutlineNode{}).Where("document_id = ?", id).Update("del", false).Error
	})
}

func (s *Service) RestoreFolder(id uint) error {
	return s.db.Model(&OutlineFolder{}).Where("id = ?", id).Update("del", false).Error
}

func (s *Service) PermanentDeleteDocument(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("document_id = ?", id).Delete(&OutlineDocumentVersion{}).Error; err != nil {
			return err
		}
		if err := tx.Where("document_id = ?", id).Delete(&OutlineNode{}).Error; err != nil {
			return err
		}
		return tx.Delete(&OutlineDocument{}, id).Error
	})
}

func (s *Service) PermanentDeleteFolder(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var docIDs []uint
		tx.Model(&OutlineDocument{}).Where("folder_id = ? AND del = ?", id, false).Pluck("id", &docIDs)

		if len(docIDs) > 0 {
			if err := tx.Where("document_id IN ?", docIDs).Delete(&OutlineDocumentVersion{}).Error; err != nil {
				return err
			}
			if err := tx.Where("document_id IN ?", docIDs).Delete(&OutlineNode{}).Error; err != nil {
				return err
			}
			if err := tx.Where("id IN ?", docIDs).Delete(&OutlineDocument{}).Error; err != nil {
				return err
			}
		}

		return tx.Delete(&OutlineFolder{}, id).Error
	})
}

func (s *Service) EmptyTrash() error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var trashDocIDs []uint
		tx.Model(&OutlineDocument{}).Where("del = ?", true).Pluck("id", &trashDocIDs)
		if len(trashDocIDs) > 0 {
			if err := tx.Where("document_id IN ?", trashDocIDs).Delete(&OutlineDocumentVersion{}).Error; err != nil {
				return err
			}
			if err := tx.Where("document_id IN ?", trashDocIDs).Delete(&OutlineNode{}).Error; err != nil {
				return err
			}
			if err := tx.Where("id IN ?", trashDocIDs).Delete(&OutlineDocument{}).Error; err != nil {
				return err
			}
		}

		var trashFolderIDs []uint
		tx.Model(&OutlineFolder{}).Where("del = ?", true).Pluck("id", &trashFolderIDs)
		if len(trashFolderIDs) > 0 {
			var folderDocIDs []uint
			tx.Model(&OutlineDocument{}).Where("folder_id IN ?", trashFolderIDs).Pluck("id", &folderDocIDs)
			if len(folderDocIDs) > 0 {
				if err := tx.Where("document_id IN ?", folderDocIDs).Delete(&OutlineDocumentVersion{}).Error; err != nil {
					return err
				}
				if err := tx.Where("document_id IN ?", folderDocIDs).Delete(&OutlineNode{}).Error; err != nil {
					return err
				}
				if err := tx.Where("id IN ?", folderDocIDs).Delete(&OutlineDocument{}).Error; err != nil {
					return err
				}
			}
			if err := tx.Where("id IN ?", trashFolderIDs).Delete(&OutlineFolder{}).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (s *Service) ReorderNodes(documentID uint, orders []NodeOrder) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		for _, o := range orders {
			if err := tx.Model(&OutlineNode{}).
				Where("id = ? AND document_id = ?", o.ID, documentID).
				Updates(map[string]interface{}{
					"SortOrder": o.SortOrder,
					"ParentID":  o.ParentID,
				}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *Service) Search(query string, scope string, page int, size int) ([]map[string]interface{}, int64, error) {
	if query == "" {
		return []map[string]interface{}{}, 0, nil
	}
	if page < 1 {
		page = 1
	}
	if size < 1 {
		size = 20
	}
	offset := (page - 1) * size
	pattern := "%" + query + "%"

	type searchResult struct {
		Type      string
		ID        uint
		Title     string
		Name      string
		Content   string
		DocID     uint
		DocTitle  string
		SortOrder int
	}

	var results []searchResult

	if scope == "all" || scope == "documents" {
		var docs []OutlineDocument
		s.db.Where("title LIKE ? AND del = ?", pattern, false).Find(&docs)
		for _, d := range docs {
			results = append(results, searchResult{
				Type:  "document",
				ID:    d.ID,
				Title: d.Title,
			})
		}
	}

	if scope == "all" || scope == "folders" {
		var folders []OutlineFolder
		s.db.Where("name LIKE ? AND del = ?", pattern, false).Find(&folders)
		for _, f := range folders {
			results = append(results, searchResult{
				Type: "folder",
				ID:   f.ID,
				Name: f.Name,
			})
		}
	}

	if scope == "all" || scope == "nodes" {
		var nodes []OutlineNode
		s.db.Where("content LIKE ? AND del = ?", pattern, false).
			Order("sort_order ASC, id ASC").
			Find(&nodes)
		docCache := make(map[uint]string)
		for _, n := range nodes {
			docTitle, ok := docCache[n.DocumentID]
			if !ok {
				var doc OutlineDocument
				s.db.First(&doc, n.DocumentID)
				docTitle = doc.Title
				docCache[n.DocumentID] = doc.Title
			}
			results = append(results, searchResult{
				Type:    "node",
				ID:      n.ID,
				Content: n.Content,
				DocID:   n.DocumentID,
				DocTitle: docTitle,
			})
		}
	}

	total := int64(len(results))
	start := offset
	if start > len(results) {
		start = len(results)
	}
	end := start + size
	if end > len(results) {
		end = len(results)
	}
	pageResults := results[start:end]

	output := make([]map[string]interface{}, len(pageResults))
	for i, r := range pageResults {
		item := map[string]interface{}{
			"type":      r.Type,
			"id":        r.ID,
			"sortOrder": r.SortOrder,
		}
		switch r.Type {
		case "document":
			item["title"] = r.Title
		case "folder":
			item["name"] = r.Name
		case "node":
			item["content"] = r.Content
			item["documentId"] = r.DocID
			item["documentTitle"] = r.DocTitle
		}
		output[i] = item
	}

	return output, total, nil
}

func (s *Service) GetVersions(docID uint) ([]OutlineDocumentVersion, error) {
	var versions []OutlineDocumentVersion
	if err := s.db.Where("document_id = ?", docID).
		Order("created_at DESC").
		Find(&versions).Error; err != nil {
		return nil, err
	}
	return versions, nil
}

func (s *Service) GetVersion(versionID uint) (*OutlineDocumentVersion, error) {
	var version OutlineDocumentVersion
	if err := s.db.First(&version, versionID).Error; err != nil {
		return nil, err
	}
	return &version, nil
}

func (s *Service) CreateVersion(docID uint, source string) (*OutlineDocumentVersion, error) {
	var nodes []OutlineNode
	if err := s.db.Where("document_id = ? AND del = ?", docID, false).
		Order("sort_order ASC, id ASC").
		Find(&nodes).Error; err != nil {
		return nil, err
	}

	snapshotBytes, err := json.Marshal(nodes)
	if err != nil {
		return nil, err
	}

	version := OutlineDocumentVersion{
		DocumentID: docID,
		Snapshot:   string(snapshotBytes),
		NodeCount:  len(nodes),
		Source:     source,
	}
	if err := s.db.Create(&version).Error; err != nil {
		return nil, err
	}
	return &version, nil
}

func (s *Service) RestoreVersion(versionID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var version OutlineDocumentVersion
		if err := tx.First(&version, versionID).Error; err != nil {
			return err
		}

		var currentNodes []OutlineNode
		tx.Where("document_id = ? AND del = ?", version.DocumentID, false).
			Order("sort_order ASC, id ASC").
			Find(&currentNodes)
		if len(currentNodes) > 0 {
			currentBytes, _ := json.Marshal(currentNodes)
			backup := OutlineDocumentVersion{
				DocumentID: version.DocumentID,
				Snapshot:   string(currentBytes),
				NodeCount:  len(currentNodes),
				Source:     "pre-restore",
			}
			if err := tx.Create(&backup).Error; err != nil {
				return err
			}
		}

		var snapshotNodes []OutlineNode
		if err := json.Unmarshal([]byte(version.Snapshot), &snapshotNodes); err != nil {
			return err
		}

		tx.Where("document_id = ? AND del = ?", version.DocumentID, false).
			Delete(&OutlineNode{})

		for i := range snapshotNodes {
			snapshotNodes[i].ID = 0
			snapshotNodes[i].DocumentID = version.DocumentID
			snapshotNodes[i].Del = false
			if err := tx.Create(&snapshotNodes[i]).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (s *Service) DeleteVersion(versionID uint) error {
	return s.db.Delete(&OutlineDocumentVersion{}, versionID).Error
}
