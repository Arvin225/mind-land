package outline

import "time"

// OutlineFolder 文件夹
type OutlineFolder struct {
	ID         uint      `gorm:"primarykey" json:"id"`
	Name       string    `json:"name"`
	ParentID   uint      `gorm:"default:0" json:"parentId"`
	SortOrder  int       `gorm:"default:0" json:"sortOrder"`
	IsExpanded bool      `gorm:"default:true" json:"isExpanded"`
	Del        bool      `gorm:"default:false" json:"del"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// OutlineDocument 文档
type OutlineDocument struct {
	ID         uint      `gorm:"primarykey" json:"id"`
	Title      string    `json:"title"`
	FolderID   uint      `gorm:"default:0" json:"folderId"`
	SortOrder  int       `gorm:"default:0" json:"sortOrder"`
	IsFavorite bool      `gorm:"default:false" json:"isFavorite"`
	Del        bool      `gorm:"default:false" json:"del"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// OutlineNode 大纲节点
type OutlineNode struct {
	ID          uint      `gorm:"primarykey" json:"id"`
	DocumentID  uint      `gorm:"index" json:"documentId"`
	Content     string    `gorm:"type:text" json:"content"`
	ParentID    uint      `gorm:"default:0;index" json:"parentId"`
	SortOrder   int       `gorm:"default:0" json:"sortOrder"`
	IsCollapsed bool      `gorm:"default:false" json:"isCollapsed"`
	Note        string    `gorm:"type:text" json:"note"`
	Del         bool      `gorm:"default:false" json:"del"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// OutlineDocumentVersion 版本快照
type OutlineDocumentVersion struct {
	ID         uint      `gorm:"primarykey" json:"id"`
	DocumentID uint      `gorm:"index" json:"documentId"`
	Snapshot   string    `gorm:"type:text" json:"snapshot"`
	NodeCount  int       `json:"nodeCount"`
	Source     string    `gorm:"default:manual" json:"source"`
	Summary    string    `json:"summary"`
	CreatedAt  time.Time `json:"createdAt"`
}
