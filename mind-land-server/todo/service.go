package todo

import (
	"gorm.io/gorm"
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

func (s *Service) CreateList(name string) (*List, error) {
	list := List{Name: name}
	err := s.db.Create(&list).Error
	return &list, err
}

func (s *Service) GetAllLists() ([]List, error) {
	var lists []List
	err := s.db.Find(&lists).Error
	return lists, err
}

func (s *Service) ModifyListName(id uint, name string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&Item{}).Where("list_id = ? AND del = ?", id, false).Update("list_name", name).Error; err != nil {
			return err
		}
		return tx.Model(&List{}).Where("id = ?", id).Update("name", name).Error
	})
}

func (s *Service) DeleteList(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&Item{}).Where("list_id = ? AND del = ?", id, false).Updates(map[string]interface{}{
			"del":       true,
			"list_id":   0,
			"list_name": "",
		}).Error; err != nil {
			return err
		}
		return tx.Delete(&List{}, id).Error
	})
}

func (s *Service) CreateItem(item Item) (*Item, error) {
	err := s.db.Create(&item).Error
	return &item, err
}

func (s *Service) GetItems(conds map[string]interface{}) ([]Item, error) {
	var items []Item
	err := s.db.Where(conds).Order("sort_order ASC, id ASC").Find(&items).Error
	return items, err
}

func (s *Service) PatchItem(id uint, raw map[string]interface{}) error {
	updates := map[string]interface{}{}
	if v, ok := raw["content"]; ok {
		updates["content"] = v
	}
	if v, ok := raw["done"]; ok {
		updates["done"] = v
	}
	if v, ok := raw["star"]; ok {
		updates["star"] = v
	}
	if v, ok := raw["list_id"]; ok {
		updates["list_id"] = v
	}
	if v, ok := raw["list_name"]; ok {
		updates["list_name"] = v
	}
	if v, ok := raw["sortOrder"]; ok {
		updates["sort_order"] = v
	}
	if len(updates) == 0 {
		return nil
	}
	return s.db.Model(&Item{}).Where("id = ?", id).Updates(updates).Error
}

func (s *Service) DeleteItem(id uint, permanent bool) error {
	if permanent {
		return s.db.Delete(&Item{}, id).Error
	}
	return s.db.Model(&Item{}).Where("id = ?", id).Updates(map[string]interface{}{
		"del":      true,
		"list_id":  0,
		"list_name": "",
	}).Error
}
