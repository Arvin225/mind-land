package slipbox

import (
	"encoding/json"
	"regexp"
	"strings"
	"time"

	"gorm.io/gorm"
	"golang.org/x/net/html"
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// ---- Card queries ----

func (s *Service) GetAllCards(del bool) ([]Card, error) {
	var cards []Card
	err := s.db.Where("del = ?", del).Find(&cards).Error
	return cards, err
}

func (s *Service) GetCardsByTagID(tagID uint) ([]Card, error) {
	cardIDs, err := s.collectCardIDsByTagAndOffspring(tagID)
	if err != nil {
		return nil, err
	}
	if len(cardIDs) == 0 {
		return []Card{}, nil
	}
	var cards []Card
	err = s.db.Find(&cards, cardIDs).Error
	return cards, err
}

func (s *Service) GetCard(id uint) (*Card, error) {
	var card Card
	err := s.db.First(&card, id).Error
	if err != nil {
		return nil, err
	}
	return &card, nil
}

// ---- Tag queries ----

func (s *Service) GetAllTags() ([]Tag, error) {
	var tags []Tag
	err := s.db.Find(&tags).Error
	return tags, err
}

func (s *Service) GetTag(id uint) (*Tag, error) {
	var tag Tag
	err := s.db.First(&tag, id).Error
	if err != nil {
		return nil, err
	}
	return &tag, nil
}

// ---- Create card ----

type CreateCardReq struct {
	ContentWithText string `json:"contentWithText"`
	ContentWithHtml string `json:"contentWithHtml"`
}

type CreateCardResp struct {
	Card Card   `json:"card"`
	Tags []Tag  `json:"tags"`
}

// ---- Update card ----

type UpdateCardReq struct {
	ID      uint   `json:"id"`
	Content string `json:"content"`
}

type UpdateCardResp struct {
	Card Card `json:"card"`
}

func (s *Service) UpdateCard(req UpdateCardReq) (*UpdateCardResp, error) {
	var card Card
	if err := s.db.First(&card, req.ID).Error; err != nil {
		return nil, err
	}

	var stats CardStatistics
	if err := json.Unmarshal([]byte(card.Statistics), &stats); err != nil {
		stats = CardStatistics{}
	}
	stats.UpdateTime = time.Now().Format("2006-01-02 15:04")
	statsJSON, err := json.Marshal(stats)
	if err != nil {
		return nil, err
	}

	// Update card
	card.Content = req.Content
	card.Statistics = string(statsJSON)

	if err := s.db.Save(&card).Error; err != nil {
		return nil, err
	}

	return &UpdateCardResp{Card: card}, nil
}

func (s *Service) CreateCard(req CreateCardReq) (*CreateCardResp, error) {
	// 1. Parse #tags from HTML content
	tagNames := s.parseTagNames(req.ContentWithHtml)

	var resp *CreateCardResp
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 2. Save tags (build hierarchy)
		leafTags, allLevelTags, err := s.saveTags(tx, tagNames)
		if err != nil {
			return err
		}

		// 3. Save card
		words := len(req.ContentWithText)
		stats := NewCardStatistics(words)
		statsJSON, err := json.Marshal(stats)
		if err != nil {
			return err
		}
		tagIDs := make([]uint, len(leafTags))
		for i, t := range leafTags {
			tagIDs[i] = t.ID
		}
		tagIDsJSON, err := json.Marshal(tagIDs)
		if err != nil {
			return err
		}

		card := Card{
			Content:       req.ContentWithHtml,
			BuiltOrDelTime: "创建于 " + time.Now().Format("2006-01-02 15:04"),
			Statistics:    string(statsJSON),
			Tags:          string(tagIDsJSON),
			Del:           false,
		}
		if err := tx.Create(&card).Error; err != nil {
			return err
		}

		// 4. Add card ID to leaf tags' cards array
		for _, t := range leafTags {
			var cards []uint
			if t.Cards != "" {
				if err := json.Unmarshal([]byte(t.Cards), &cards); err != nil {
					return err
				}
			}
			cards = append(cards, card.ID)
			cardsJSON, err := json.Marshal(cards)
			if err != nil {
				return err
			}
			if err := tx.Model(&Tag{}).Where("id = ?", t.ID).Update("cards", string(cardsJSON)).Error; err != nil {
				return err
			}
		}

		// 5. Increment cardCount for all level tags (ancestors + leaf)
		for _, t := range allLevelTags {
			if err := tx.Model(&Tag{}).Where("id = ?", t.ID).Update("card_count", gorm.Expr("card_count + 1")).Error; err != nil {
				return err
			}
		}

		resp = &CreateCardResp{Card: card, Tags: leafTags}
		return nil
	})

	return resp, err
}

// ---- Delete card ----

type DeleteCardReq struct {
	ID        uint   `json:"id"`
	TagIDs    []uint `json:"tagIds"`
	Permanent *bool  `json:"permanent,omitempty"`
}

func (s *Service) RemoveCard(req DeleteCardReq) (*DeleteCardResp, error) {
	resp := &DeleteCardResp{DeletedTagIDs: []uint{}}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Soft delete card
		if err := tx.Model(&Card{}).Where("id = ?", req.ID).Updates(map[string]interface{}{
			"del":            true,
			"built_or_del_time": "删除于 " + time.Now().Format("2006-01-02 15:04"),
		}).Error; err != nil {
			return err
		}

		decreasedIDs := map[uint]bool{}
		for _, tid := range req.TagIDs {
			if err := s.decreaseCardCount(tx, tid, 1, decreasedIDs, &resp.DeletedTagIDs); err != nil {
				return err
			}
			// Remove card ID from tag's cards array (if tag not deleted)
			if !containsID(resp.DeletedTagIDs, tid) {
				var tag Tag
				if err := tx.First(&tag, tid).Error; err != nil {
					if err == gorm.ErrRecordNotFound {
						continue
					}
					return err
				}
				var cards []uint
				if err := json.Unmarshal([]byte(tag.Cards), &cards); err != nil {
					return err
				}
				cards = removeFromSlice(cards, req.ID)
				cardsJSON, err := json.Marshal(cards)
				if err != nil {
					return err
				}
				if err := tx.Model(&Tag{}).Where("id = ?", tid).Update("cards", string(cardsJSON)).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})

	return resp, err
}

type DeleteCardResp struct {
	DeletedTagIDs []uint `json:"deletedTagIds"`
}

func (s *Service) DeleteCard(req DeleteCardReq) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		return tx.Delete(&Card{}, req.ID).Error
	})
}

// ---- Delete tag ----

type DeleteTagReq struct {
	ID        uint   `json:"id"`
	TagName   string `json:"tagName"`
	OverCards *bool  `json:"overCards,omitempty"`
}

func (s *Service) DeleteTag(req DeleteTagReq) error {
	overCards := req.OverCards != nil && *req.OverCards
	if overCards {
		return s.deleteTagOverCards(req)
	}
	return s.deleteTagOnly(req)
}

func (s *Service) deleteTagOnly(req DeleteTagReq) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Recursively process children tags
		tagsToProcess, err := s.collectTagAndDescendants(req.ID)
		if err != nil {
			return err
		}

		for i := len(tagsToProcess) - 1; i >= 0; i-- {
			tag := tagsToProcess[i]

			var cards []uint
			if err := json.Unmarshal([]byte(tag.Cards), &cards); err != nil {
				return err
			}

			for _, cid := range cards {
				var card Card
				if err := tx.First(&card, cid).Error; err != nil {
					if err == gorm.ErrRecordNotFound {
						continue
					}
					return err
				}
				re := regexp.MustCompile(`\b#` + regexp.QuoteMeta(req.TagName) + `\b`)
				newContent := re.ReplaceAllString(card.Content, "")

				var tagIDs []uint
				if err := json.Unmarshal([]byte(card.Tags), &tagIDs); err != nil {
					return err
				}
				tagIDs = removeFromSlice(tagIDs, tag.ID)

				tagIDsJSON, err := json.Marshal(tagIDs)
				if err != nil {
					return err
				}
				if err := tx.Model(&Card{}).Where("id = ?", cid).Updates(map[string]interface{}{
					"content": newContent,
					"tags":    string(tagIDsJSON),
				}).Error; err != nil {
					return err
				}
			}

			if err := tx.Delete(&Tag{}, tag.ID).Error; err != nil {
				return err
			}
		}

		// Remove from parent's children
		rootTag := tagsToProcess[0]
		if rootTag.Parent != 0 {
			var parent Tag
			if err := tx.First(&parent, rootTag.Parent).Error; err == nil {
				var children []uint
				if err := json.Unmarshal([]byte(parent.Children), &children); err != nil {
					return err
				}
				children = removeFromSlice(children, rootTag.ID)
				childrenJSON, err := json.Marshal(children)
				if err != nil {
					return err
				}
				if err := tx.Model(&Tag{}).Where("id = ?", parent.ID).Update("children", string(childrenJSON)).Error; err != nil {
					return err
				}
			}
		}

		// Recursively fix parent tag card counts
		if rootTag.Parent != 0 {
			// Recalculate from the parent down
			if err := s.recalcCardCountUpward(tx, rootTag.Parent); err != nil {
				return err
			}
		}

		return nil
	})
}

func (s *Service) deleteTagOverCards(req DeleteTagReq) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		tagsToProcess, err := s.collectTagAndDescendants(req.ID)
		if err != nil {
			return err
		}

		type cardLeftover struct {
			id   uint
			tags []uint
		}
		leftoverMap := map[uint][]uint{} // cardID -> remaining tag IDs
		var directlyDecreased int

		// Process from children to root
		for i := len(tagsToProcess) - 1; i >= 0; i-- {
			tag := tagsToProcess[i]

			var cards []uint
			if err := json.Unmarshal([]byte(tag.Cards), &cards); err != nil {
				return err
			}

			for _, cid := range cards {
				var card Card
				if err := tx.First(&card, cid).Error; err != nil {
					if err == gorm.ErrRecordNotFound {
						continue
					}
					return err
				}

				// Track leftover tags for this card
				if _, ok := leftoverMap[cid]; !ok {
					var curTagIDs []uint
					if err := json.Unmarshal([]byte(card.Tags), &curTagIDs); err != nil {
						return err
					}
					leftoverMap[cid] = curTagIDs
				}
				leftoverMap[cid] = removeFromSlice(leftoverMap[cid], tag.ID)

				// Soft delete card
				if !card.Del {
					if err := tx.Model(&Card{}).Where("id = ?", cid).Updates(map[string]interface{}{
						"del":              true,
						"built_or_del_time": "删除于 " + time.Now().Format("2006-01-02 15:04"),
					}).Error; err != nil {
						return err
					}
				}
			}

			// Delete tag
			if err := tx.Delete(&Tag{}, tag.ID).Error; err != nil {
				return err
			}
		}

		// Remove root from parent
		rootTag := tagsToProcess[0]
		if rootTag.Parent != 0 {
			var parent Tag
			if err := tx.First(&parent, rootTag.Parent).Error; err == nil {
				var children []uint
				if err := json.Unmarshal([]byte(parent.Children), &children); err != nil {
					return err
				}
				children = removeFromSlice(children, rootTag.ID)
				childrenJSON, err := json.Marshal(children)
				if err != nil {
					return err
				}
				if err := tx.Model(&Tag{}).Where("id = ?", parent.ID).Update("children", string(childrenJSON)).Error; err != nil {
					return err
				}
			}
		}

		// Handle cards that still have remaining tags (present in other tag trees)
		for cid, remainingTags := range leftoverMap {
			if len(remainingTags) == 0 {
				directlyDecreased++
				continue
			}
			for _, tid := range remainingTags {
				var tag Tag
				if err := tx.First(&tag, tid).Error; err != nil {
					if err == gorm.ErrRecordNotFound {
						continue
					}
					return err
				}
				var cards []uint
				if err := json.Unmarshal([]byte(tag.Cards), &cards); err != nil {
					return err
				}
				cards = removeFromSlice(cards, cid)
				cardsJSON, err := json.Marshal(cards)
				if err != nil {
					return err
				}
				if err := tx.Model(&Tag{}).Where("id = ?", tid).Update("cards", string(cardsJSON)).Error; err != nil {
					return err
				}

				// Decrease card count for this tag chain (stop at parent of root)
				parentName := ""
				if rootTag.Parent != 0 {
					var p Tag
					if err := tx.First(&p, rootTag.Parent).Error; err == nil {
						parentName = p.TagName
					} else if err != gorm.ErrRecordNotFound {
						return err
					}
				}
				if parentName != "" && strings.HasPrefix(tag.TagName, parentName) {
					decreasedIDs := map[uint]bool{}
					if err := s.decreaseCardCount(tx, tid, 1, decreasedIDs, nil); err != nil {
						return err
					}
				} else {
					decreasedIDs := map[uint]bool{}
					var stopTag *Tag
					if rootTag.Parent != 0 {
						var p Tag
						if err := tx.First(&p, rootTag.Parent).Error; err != nil {
							if err != gorm.ErrRecordNotFound {
								return err
							}
						} else {
							stopTag = &p
						}
					}
					if err := s.decreaseCardCountWithStop(tx, tid, 1, stopTag, decreasedIDs, nil); err != nil {
						return err
					}
				}
			}
			directlyDecreased++
		}

		// Fix parent card count chain
		if rootTag.Parent != 0 {
			if err := s.decreaseCardCount(tx, rootTag.Parent, directlyDecreased, map[uint]bool{}, nil); err != nil {
				return err
			}
		}

		return nil
	})
}

// ---- Internal helpers ----

func (s *Service) parseTagNames(htmlContent string) []string {
	// Split by <p> and <li>
	parts := splitByTags(htmlContent, []string{"<p>", "<li>", "<P>", "<LI>"})

	// Convert to plain text
	var textParts []string
	for _, p := range parts {
		textParts = append(textParts, stripHTML(p))
	}

	// Collect unique #tag names
	seen := map[string]bool{}
	var result []string
	for _, t := range textParts {
		words := strings.Fields(t)
		for _, w := range words {
			if strings.HasPrefix(w, "#") && len(w) > 1 && !seen[w] {
				seen[w] = true
				result = append(result, w)
			}
		}
	}
	return result
}

func splitByTags(s string, tags []string) []string {
	result := []string{s}
	for _, tag := range tags {
		var next []string
		for _, part := range result {
			next = append(next, strings.Split(part, tag)...)
		}
		result = next
	}
	return result
}

func stripHTML(s string) string {
	z := html.NewTokenizer(strings.NewReader(s))
	var b strings.Builder
	for {
		tt := z.Next()
		if tt == html.ErrorToken {
			break
		}
		if tt == html.TextToken {
			b.WriteString(strings.TrimSpace(string(z.Text())))
			b.WriteByte(' ')
		}
	}
	return strings.TrimSpace(b.String())
}


func (s *Service) saveTags(tx *gorm.DB, tagNames []string) (leafTags []Tag, allLevelTags []Tag, err error) {
	allSeen := map[string]bool{}

	for _, tagName := range tagNames {
		// Remove leading #
		name := tagName[1:]
		parts := strings.Split(name, "/")

		var cid uint
		collectAncestors := false

		for i := len(parts); i > 0; i-- {
			currentName := strings.Join(parts[:i], "/")

			// If collecting ancestors, just add to allLevelTags
			if collectAncestors {
				var t Tag
				if err := tx.Where("tag_name = ?", currentName).First(&t).Error; err == nil {
					if !allSeen[currentName] {
						allLevelTags = append(allLevelTags, t)
						allSeen[currentName] = true
					}
				}
				continue
			}

			var tag Tag
			err := tx.Where("tag_name = ?", currentName).First(&tag).Error

			if err == nil {
				// Tag exists
				if !allSeen[currentName] {
					allLevelTags = append(allLevelTags, tag)
					allSeen[currentName] = true
				}

				if cid == 0 {
					// This is a leaf tag
					leafTags = append(leafTags, tag)
					collectAncestors = true
					continue
				}

				// Not leaf: add cid to children, set cid's parent
				var children []uint
				if err := json.Unmarshal([]byte(tag.Children), &children); err != nil {
					return nil, nil, err
				}
				if !containsID(children, cid) {
					children = append(children, cid)
					childrenJSON, err := json.Marshal(children)
					if err != nil {
						return nil, nil, err
					}
					if err := tx.Model(&Tag{}).Where("id = ?", tag.ID).Update("children", string(childrenJSON)).Error; err != nil {
						return nil, nil, err
					}
				}
				if err := tx.Model(&Tag{}).Where("id = ?", cid).Update("parent", tag.ID).Error; err != nil {
					return nil, nil, err
				}

				collectAncestors = true

			} else {
				// Tag doesn't exist, create it
				newTag := Tag{
					TagName:   currentName,
					Parent:    0,
					Children:  "[]",
					CardCount: 0,
					Cards:     "[]",
				}
				if cid != 0 {
					newTag.Children = mustJSON([]uint{cid})
				}
				if err := tx.Create(&newTag).Error; err != nil {
					return nil, nil, err
				}

				if !allSeen[currentName] {
					allLevelTags = append(allLevelTags, newTag)
					allSeen[currentName] = true
				}

				if cid != 0 {
					if err := tx.Model(&Tag{}).Where("id = ?", cid).Update("parent", newTag.ID).Error; err != nil {
						return nil, nil, err
					}
				}
				if cid == 0 {
					leafTags = append(leafTags, newTag)
				}
				cid = newTag.ID
			}
		}
	}

	return leafTags, allLevelTags, nil
}

func (s *Service) collectCardIDsByTagAndOffspring(tagID uint) ([]uint, error) {
	var tag Tag
	if err := s.db.First(&tag, tagID).Error; err != nil {
		return nil, err
	}

	var cardIDs []uint
	if err := json.Unmarshal([]byte(tag.Cards), &cardIDs); err != nil {
		return nil, err
	}

	var children []uint
	if err := json.Unmarshal([]byte(tag.Children), &children); err != nil {
		return nil, err
	}

	for _, cid := range children {
		childIDs, err := s.collectCardIDsByTagAndOffspring(cid)
		if err != nil {
			return nil, err
		}
		cardIDs = append(cardIDs, childIDs...)
	}

	return cardIDs, nil
}

func (s *Service) collectTagAndDescendants(tagID uint) ([]Tag, error) {
	var tag Tag
	if err := s.db.First(&tag, tagID).Error; err != nil {
		return nil, err
	}

	result := []Tag{tag}

	var children []uint
	if err := json.Unmarshal([]byte(tag.Children), &children); err != nil {
		return nil, err
	}

	for _, cid := range children {
		childTags, err := s.collectTagAndDescendants(cid)
		if err != nil {
			return nil, err
		}
		result = append(result, childTags...)
	}

	return result, nil
}

func (s *Service) decreaseCardCount(tx *gorm.DB, tagID uint, count int, decreasedIDs map[uint]bool, deletedIDs *[]uint) error {
	return s.decreaseCardCountWithStop(tx, tagID, count, nil, decreasedIDs, deletedIDs)
}

func (s *Service) decreaseCardCountWithStop(tx *gorm.DB, tagID uint, count int, stopTag *Tag, decreasedIDs map[uint]bool, deletedIDs *[]uint) error {
	if tagID == 0 {
		return nil
	}
	if decreasedIDs[tagID] {
		return nil
	}

	var tag Tag
	if err := tx.First(&tag, tagID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil
		}
		return err
	}

	if tag.CardCount == count {
		// Delete tag
		if err := tx.Delete(&Tag{}, tagID).Error; err != nil {
			return err
		}
		if deletedIDs != nil {
			*deletedIDs = append(*deletedIDs, tagID)
		}

		if stopTag != nil && tag.Parent == stopTag.ID {
			var children []uint
			if err := json.Unmarshal([]byte(stopTag.Children), &children); err != nil {
				return err
			}
			children = removeFromSlice(children, tagID)
			childrenJSON, err := json.Marshal(children)
			if err != nil {
				return err
			}
			if err := tx.Model(&Tag{}).Where("id = ?", stopTag.ID).Update("children", string(childrenJSON)).Error; err != nil {
				return err
			}
			return nil
		}

		return s.decreaseCardCountWithStop(tx, tag.Parent, count, stopTag, decreasedIDs, deletedIDs)
	}

	// cardCount > count: just decrement
	var children []uint
	if err := json.Unmarshal([]byte(tag.Children), &children); err != nil {
		return err
	}
	if tag.Parent != 0 && !containsID(children, tagID) {
		children = removeFromSlice(children, tagID)
	}
	childrenJSON, err := json.Marshal(children)
	if err != nil {
		return err
	}
	if err := tx.Model(&Tag{}).Where("id = ?", tagID).Updates(map[string]interface{}{
		"card_count": tag.CardCount - count,
		"children":   string(childrenJSON),
	}).Error; err != nil {
		return err
	}
	decreasedIDs[tagID] = true

	return s.decreaseCardCountWithStop(tx, tag.Parent, count, stopTag, decreasedIDs, deletedIDs)
}

func (s *Service) recalcCardCountUpward(tx *gorm.DB, tagID uint) error {
	if tagID == 0 {
		return nil
	}

	var tag Tag
	if err := tx.First(&tag, tagID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil
		}
		return err
	}

	// Calculate card count from all children
	var children []uint
	if err := json.Unmarshal([]byte(tag.Children), &children); err != nil {
		return err
	}
	totalCount := 0
	for _, cid := range children {
		var child Tag
		if err := tx.First(&child, cid).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				continue
			}
			return err
		}
		totalCount += child.CardCount
	}

	if totalCount == 0 {
		pid := tag.Parent
		if err := tx.Delete(&Tag{}, tagID).Error; err != nil {
			return err
		}
		if pid != 0 {
			var parent Tag
			if err := tx.First(&parent, pid).Error; err == nil {
				var pchildren []uint
				if err := json.Unmarshal([]byte(parent.Children), &pchildren); err != nil {
					return err
				}
				pchildren = removeFromSlice(pchildren, tagID)
				pchildrenJSON, err := json.Marshal(pchildren)
				if err != nil {
					return err
				}
				if err := tx.Model(&Tag{}).Where("id = ?", pid).Update("children", string(pchildrenJSON)).Error; err != nil {
					return err
				}
			}
			return s.recalcCardCountUpward(tx, pid)
		}
	} else {
		if err := tx.Model(&Tag{}).Where("id = ?", tagID).Update("card_count", totalCount).Error; err != nil {
			return err
		}
		return s.recalcCardCountUpward(tx, tag.Parent)
	}

	return nil
}

// ---- Utility helpers ----

func containsID(slice []uint, id uint) bool {
	for _, v := range slice {
		if v == id {
			return true
		}
	}
	return false
}

func removeFromSlice(slice []uint, id uint) []uint {
	var result []uint
	for _, v := range slice {
		if v != id {
			result = append(result, v)
		}
	}
	return result
}

func mustJSON(v interface{}) string {
	b, err := json.Marshal(v)
	if err != nil {
		panic("mustJSON: " + err.Error())
	}
	return string(b)
}
