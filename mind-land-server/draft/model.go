package draft

import "time"

// Draft 稿纸 = 一篇长文 Markdown 文档
type Draft struct {
	ID        uint       `gorm:"primarykey" json:"id"`
	Title     string     `gorm:"type:text;not null;default:''" json:"title"`
	ContentMD string     `gorm:"type:text;not null;default:''" json:"contentMd"`
	Version   int        `gorm:"not null;default:1" json:"version"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
	DeletedAt *time.Time `gorm:"index" json:"deletedAt,omitempty"`
}
