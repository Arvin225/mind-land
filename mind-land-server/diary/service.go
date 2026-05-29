package diary

import (
	"gorm.io/gorm"
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

type PaginatedResult struct {
	Entries []DiaryEntry `json:"entries"`
	Total   int64        `json:"total"`
	Page    int          `json:"page"`
	Size    int          `json:"size"`
}

const DefaultPageSize = 20

func (s *Service) GetEntries(page, size int) (*PaginatedResult, error) {
	if page < 1 {
		page = 1
	}
	if size <= 0 {
		size = DefaultPageSize
	}

	var total int64
	if err := s.db.Model(&DiaryEntry{}).Where("del = ?", false).Count(&total).Error; err != nil {
		return nil, err
	}

	var entries []DiaryEntry
	offset := (page - 1) * size
	if err := s.db.Where("del = ?", false).
		Order("created_at DESC").
		Offset(offset).
		Limit(size).
		Find(&entries).Error; err != nil {
		return nil, err
	}

	return &PaginatedResult{
		Entries: entries,
		Total:   total,
		Page:    page,
		Size:    size,
	}, nil
}

func (s *Service) GetEntry(id uint) (*DiaryEntry, error) {
	var entry DiaryEntry
	if err := s.db.First(&entry, id).Error; err != nil {
		return nil, err
	}
	return &entry, nil
}

func (s *Service) CreateEntry(content string) (*DiaryEntry, error) {
	entry := DiaryEntry{Content: content}
	if err := s.db.Create(&entry).Error; err != nil {
		return nil, err
	}
	return &entry, nil
}

func (s *Service) UpdateEntry(id uint, content string) (*DiaryEntry, error) {
	var entry DiaryEntry
	if err := s.db.First(&entry, id).Error; err != nil {
		return nil, err
	}
	entry.Content = content
	if err := s.db.Save(&entry).Error; err != nil {
		return nil, err
	}
	return &entry, nil
}

func (s *Service) DeleteEntry(id uint) error {
	return s.db.Model(&DiaryEntry{}).Where("id = ?", id).Update("del", true).Error
}

func (s *Service) GetTrashEntries(page, size int) (*PaginatedResult, error) {
	if page < 1 {
		page = 1
	}
	if size <= 0 {
		size = DefaultPageSize
	}

	var total int64
	if err := s.db.Model(&DiaryEntry{}).Where("del = ?", true).Count(&total).Error; err != nil {
		return nil, err
	}

	var entries []DiaryEntry
	offset := (page - 1) * size
	if err := s.db.Where("del = ?", true).
		Order("created_at DESC").
		Offset(offset).
		Limit(size).
		Find(&entries).Error; err != nil {
		return nil, err
	}

	return &PaginatedResult{
		Entries: entries,
		Total:   total,
		Page:    page,
		Size:    size,
	}, nil
}

func (s *Service) RestoreEntry(id uint) error {
	return s.db.Model(&DiaryEntry{}).Where("id = ?", id).Update("del", false).Error
}

func (s *Service) PermanentDelete(id uint) error {
	return s.db.Delete(&DiaryEntry{}, id).Error
}

func (s *Service) EmptyTrash() error {
	return s.db.Where("del = ?", true).Delete(&DiaryEntry{}).Error
}
